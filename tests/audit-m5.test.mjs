// fix/audit-m5 (the m5 audit, docs/audits/2026-10-19-m5.md; owner triage in
// docs/owner-decisions-2026-09-11.md §BA): the three game findings, on the
// 6502 harness against the built images.
//
//   * M5-01: the hit sound's divider is derived from hit_timer in RAM, never
//     read back from AUDF2 - a read of $D202 is POT2 on a real POKEY. The
//     envelope 32, 34, ..., 60 is the same whatever the paddle reads, and a
//     pause/resume at any phase continues it.
//   * M5-02: an Interceptor re-entering its standoff above a stationary player
//     nearer than its slot's rows backs off; it does not wrap the negative
//     distance into a dive and ram the fighter. Asserted on the geometry -
//     the drawn boxes and a signed distance in JavaScript - not by repeating
//     the tick's byte arithmetic.
//   * M5-03: the boss entry relinquishes the hit SFX's hold on channel 2, so a
//     hit one frame before the entry cannot mute the boss theme's lead through
//     the banner and the load.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { boot, frame as productionFrame, FRAME_ACTIVE, L as mainLabel } from "../scripts/measure-population-harness.mjs";
import { Drive, cpuOver, label, mainAddress, readBuild, root } from "./boss-harness.mjs";

const AUDF2 = 0xd202, AUDC2 = 0xd203, AUDC1 = 0xd201;
const L = mainLabel;

// A routine to its RTS on `memory`, the CPU's reads and writes through `hooks`.
function call(memory, name, hooks = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(name);
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

function soundMachine() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  memory[L("sound_enabled")] = 1;
  memory[L("GAME_MUSIC_ENABLED")] = 0;   // the hit alone on channel 2
  return memory;
}

// POKEY as the hardware reads it: $D202 is POT2, whatever was written there.
// `pot` undefined is the CPU harness's RAM-backed I/O, the model the audit
// says hid the defect.
function pokeyHooks(pot, writes) {
  return {
    read: (address) => (address === AUDF2 && pot !== undefined ? pot : undefined),
    write: (address, value) => { if (address === AUDF2 || address === AUDC2) writes.push([address, value]); },
  };
}
const dividers = (writes) => writes.filter(([address]) => address === AUDF2).map(([, value]) => value);

// $20 at the hit, then two steps a frame for the 14 frames hit_timer runs
// (src/main.s resume_gameplay_audio's reconstruction: $3C - 2 * hit_timer).
const ENVELOPE = Array.from({ length: 15 }, (_, step) => 0x20 + 2 * step);
const POTS = [undefined, 0, 64, 228];

test("M5-01: the hit sound's divider sequence is 32, 34, ..., 60 whatever POT2 reads", () => {
  for (const pot of POTS) {
    const memory = soundMachine();
    const writes = [];
    const hooks = pokeyHooks(pot, writes);
    call(memory, "play_hit_sound", hooks);
    assert.equal(memory[L("hit_timer")], 14);
    for (let frame = 0; frame < 14; frame += 1) call(memory, "update_sound", hooks);
    assert.equal(memory[L("hit_timer")], 0, "the hit outlived its 14 frames");
    assert.deepEqual(dividers(writes), ENVELOPE, `POT2 = ${pot ?? "RAM"}: the emitted dividers`);
    const controls = writes.filter(([address]) => address === AUDC2).map(([, value]) => value);
    assert.equal(controls[0], 0x88, "the hit's control byte");
    assert.equal(controls.at(-1), 0x00, "the hit does not end silent");
  }
});

test("M5-01: a pause at every phase of the hit resumes on its envelope and plays it out", () => {
  for (const pot of POTS) {
    for (let phase = 1; phase <= 14; phase += 1) {
      const memory = soundMachine();
      const writes = [];
      const hooks = pokeyHooks(pot, writes);
      call(memory, "play_hit_sound", hooks);
      for (let frame = 0; frame < 14 - phase; frame += 1) call(memory, "update_sound", hooks);
      assert.equal(memory[L("hit_timer")], phase);
      call(memory, "pause_silence_audio", hooks);
      const resumedAt = writes.length;
      call(memory, "resume_gameplay_audio", hooks);
      const resumed = writes.slice(resumedAt);
      assert.deepEqual(resumed.filter(([address]) => address === AUDF2).map(([, value]) => value),
        [ENVELOPE[14 - phase]], `POT2 = ${pot ?? "RAM"}, ${phase} frames left: the resumed divider`);
      assert.ok(resumed.some(([address, value]) => address === AUDC2 && value === 0x88),
        `${phase} frames left: the resume did not give the hit its control byte`);
      while (memory[L("hit_timer")] !== 0) call(memory, "update_sound", hooks);
      assert.deepEqual(dividers(writes.slice(resumedAt)), ENVELOPE.slice(14 - phase),
        `POT2 = ${pot ?? "RAM"}, ${phase} frames left: the rest of the envelope after the resume`);
    }
  }
});
