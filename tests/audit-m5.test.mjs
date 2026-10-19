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

// --- M5-02 -----------------------------------------------------------------

const OFFSET_INTERCEPTOR = 24;
const ENTITY_GAMEPLAY_TOP = 24;    // a Light below it is the only one that can touch
const LIGHT_HEIGHT = 8;            // src/hybrid/light-kernel.s LIGHT_HEIGHT_SCANLINES, drawn from y & $F8
const PLAYER_ROWS = 15;            // PLAYER_COLLISION_LAST_ROW + 1
const SLOT_ROWS = 16;
const STANDOFF_FAR = 56;
const LIFE_FRAMES = 64;

// The drawn boxes, independently of the tick: does a Light at `y` share a
// scanline with the fighter at `playerY`?
function overlaps(y, playerY) {
  const top = y & 0xf8;
  if (top < ENTITY_GAMEPLAY_TOP) return false;
  return top < playerY + PLAYER_ROWS && playerY < top + LIGHT_HEIGHT;
}

test("M5-02: the audit's fixture - slot 2 re-enters from its hold at y 64 over a stationary player at y 80 - backs off and never touches", () => {
  const m = boot({ difficulty: 1 });
  const memory = m.memory;
  const slot = 2;
  memory[L("light_state") + slot] = 2;                 // free flight
  memory[L("light_archetype_offset") + slot] = OFFSET_INTERCEPTOR;
  memory[L("light_hp") + slot] = 3;
  memory[L("light_x") + slot] = 128;
  memory[L("light_y") + slot] = 64;                    // its hold row, 32 + 2 x 16
  memory[L("_light_burst_left") + slot] = 0;           // the standoff's first frame again
  memory[L("_light_loops") + slot] = 1 << 6;           // one loop left
  memory[L("_light_slot_limit")] = Math.max(3, memory[L("_light_slot_limit")]);
  const health = mainAddress("BROAD_PLAYER_HEALTH");
  memory[health] = 10;
  let hull = 10;
  const ys = [];
  for (let frame = 0; frame < 48 && memory[L("light_state") + slot] !== 0; frame += 1) {
    memory[L("player_x")] = 124;
    memory[L("player_y")] = 80;
    const before = memory[L("light_y") + slot];
    productionFrame(m);
    const after = memory[L("light_y") + slot];
    ys.push(after);
    // 80 - 64 - 32 = -16: nearer than the slot's standoff, so never down.
    if (80 - before - slot * SLOT_ROWS < STANDOFF_FAR) {
      assert.ok(after <= before, `frame ${frame}: ${before} -> ${after}, toward the player (ys ${ys.join(" ")})`);
    }
    assert.ok(!overlaps(after, 80), `frame ${frame}: the Interceptor at y ${after} touches the fighter at y 80`);
    // A contact is the hull's 10 units and one off the Interceptor's HP
    // (light-kernel.s @touch); its laser in the player's column (1 unit) is
    // its fire, not a ram.
    assert.equal(memory[L("light_hp") + slot], 3, `frame ${frame}: the Interceptor took contact damage`);
    assert.ok(hull - memory[health] < 10 && memory[health] > 0,
      `frame ${frame}: the fighter's hull ${hull} -> ${memory[health]} (ys ${ys.join(" ")})`);
    assert.equal(memory[mainAddress("PLAYER_LIFECYCLE")], 0, `frame ${frame}: the fighter is not alive`);
    hull = memory[health];
  }
  assert.ok(ys.length >= 20, "the Interceptor left too early to be a test");
});

// --- the C tick alone, as tests/interceptor-loops.test.mjs flies it ---------

const labelsOf = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/light-kernel.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labelsOf.has(match[2])) labelsOf.set(match[2], Number.parseInt(match[1], 16));
  }
}
function tickGame() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    memory[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    memory[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  memory[L("DIFFICULTY_SETTING")] = 1;
  const cpu = new Nmos6502(memory);
  cpu.a = 0x6d;
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L("director_init");
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  return memory;
}

// Three looping Interceptors admitted together under the wave's flags, as
// tests/interceptor-loops.test.mjs admits them; the player on `path`.
function flyLoops(path) {
  const memory = tickGame();
  memory[L("_heavy_wave_flags")] = 2 << 6;
  memory[L("_heavy_escort_offset")] = OFFSET_INTERCEPTOR;
  memory[L("frame_counter")] = (memory[L("frame_counter")] + 1) & 0xff;
  call(memory, "enemy_spawn_raiders");
  assert.equal(memory[L("light_state")], 2);
  for (let slot = 1; slot < 3; slot += 1) {
    for (const array of ["light_state", "light_hp", "light_x", "light_y", "light_fire_timer",
      "_light_burst_left", "light_archetype_offset", "_light_loops"]) {
      memory[L(array) + slot] = memory[L(array)];
    }
  }
  memory[L("_light_slot_limit")] = Math.max(memory[L("_light_slot_limit")], 3);
  const lives = [[], [], []];
  for (let frame = 0; frame < 900; frame += 1) {
    const { x: playerX, y: playerY } = path(frame);
    memory[L("player_x")] = playerX;
    memory[L("player_y")] = playerY;
    memory[L("frame_counter")] = (memory[L("frame_counter")] + 1) & 0xff;
    let live = 0;
    for (let slot = 0; slot < 3; slot += 1) {
      if (memory[L("light_state") + slot] === 0) continue;
      const before = memory[L("light_y") + slot];
      const age = memory[L("_light_burst_left") + slot];
      memory[L("_light_slot")] = slot;
      call(memory, "enemy_light_tick");
      if (memory[L("light_state") + slot] === 0) continue;
      live += 1;
      lives[slot].push({ frame, playerY, before, after: memory[L("light_y") + slot], standoff: age < LIFE_FRAMES });
    }
    if (live === 0) return lives;
  }
  assert.fail("an Interceptor was still live after 900 frames");
}

const PATHS = {
  "parked high (y 80)": () => ({ x: 124, y: 80 }),
  "parked mid-screen (y 128)": () => ({ x: 124, y: 128 }),
  "parked low (y 190)": () => ({ x: 124, y: 190 }),
  // Up to y 80 at 2 lines a frame while the swarm climbs to its holds.
  "climbing during the hold": (frame) => ({ x: 124, y: Math.max(80, 190 - 2 * Math.max(0, frame - LIFE_FRAMES)) }),
};

test("M5-02: every admitted slot through both loops - the standoff never closes on the player and no slot ever touches it", () => {
  for (const [name, path] of Object.entries(PATHS)) {
    const lives = flyLoops(path);
    lives.forEach((life, slot) => {
      assert.ok(life.length > LIFE_FRAMES * 2, `${name}, slot ${slot}: a life of ${life.length} frames`);
      for (const { frame, playerY, before, after, standoff } of life) {
        // Signed, in JavaScript: the rows between the Light's top and the
        // fighter's, less the slot's own rows. Negative is nearer than that.
        const separation = playerY - before - slot * SLOT_ROWS;
        if (standoff && before < playerY && separation < STANDOFF_FAR) {
          assert.ok(after <= before,
            `${name}, slot ${slot}, frame ${frame}: ${separation} lines from its standoff it moved ${before} -> ${after}, toward the player`);
        }
        assert.ok(!overlaps(after, playerY),
          `${name}, slot ${slot}, frame ${frame}: the Interceptor at y ${after} touches the fighter at y ${playerY}`);
      }
    });
  }
});
