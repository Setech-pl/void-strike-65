import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { parseViceLabels } from "../scripts/runtime-cycles.mjs";

const root = new URL("../", import.meta.url).pathname;
const source = fs.readFileSync(`${root}src/main.s`, "utf8");
const labels = parseViceLabels(fs.readFileSync(`${root}build/void-strike-65.lbl`, "utf8"));
const addr = (name) => { assert.ok(labels.has(name), name); return labels.get(name); };
const state = addr("ENTITY_STATE") + 1;
const y = addr("ENTITY_Y") + 1;
const timer = addr("ENTITY_TIMER") + 1;

function wait(memory, clock, routine = "wait_gameplay_frame") {
  const writes = [];
  const cpu = new Nmos6502(memory, {
    read(address, machine) {
      if (address === 0xd40b) return Math.floor(((clock + machine.cycles) % 35568) / 228);
    },
    write(address) { writes.push(address); },
  });
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8); cpu.push((stop - 1) & 255);
  cpu.pc = addr(routine);
  for (let n = 0; n < 30000 && cpu.pc !== stop; n++) cpu.step();
  assert.equal(cpu.pc, stop, "bounded wait returns");
  assert.ok(writes.every((a) => a >= 0x100 && a < 0x200),
    "wait is read-only outside its stack frame");
  return { clock: clock + cpu.cycles, host: Math.floor((clock + cpu.cycles) / 35568), fence: cpu.x };
}

function runRoutine(memory, routine) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8); cpu.push((stop - 1) & 255);
  cpu.pc = addr(routine);
  for (let n = 0; n < 30000 && cpu.pc !== stop; n++) cpu.step();
  assert.equal(cpu.pc, stop, `${routine} returns`);
  return cpu.cycles;
}

test("executed wait moves a late fence earlier without skipping a PAL update", () => {
  for (const fill of [0xa5, 0x5a]) {
    const memory = new Uint8Array(65536).fill(fill);
    installRuntimeSegments(memory, root);
    memory[state] = 0;
    let previous = wait(memory, 0);
    memory[state] = 1; memory[y] = 8;
    const fences = [];
    // The existing initial PENDING timer advances the fence to its ACTIVE
    // position before admission can succeed. Director retries use 8..1 and
    // therefore stay at the settled fence without adding another state byte.
    const pendingTimers = [
      ...Array.from({ length: 31 }, (_, n) => 31 - n),
      ...Array.from({ length: 8 }, (_, n) => 8 - n),
      ...Array.from({ length: 8 }, (_, n) => 8 - n),
    ];
    for (const pendingTimer of pendingTimers) {
      memory[timer] = pendingTimer;
      const next = wait(memory, previous.clock + 32568);
      assert.equal(next.host - previous.host, 1, `PENDING timer ${pendingTimer}`);
      assert.ok(previous.fence - next.fence <= 8);
      fences.push(next.fence); previous = next;
    }
    assert.deepEqual(fences.slice(0, 11), [108,100,92,84,76,68,60,52,44,36,28]);
    assert.ok(fences.slice(11).every((v) => v === 20));
    memory[state] = 2; memory[y] = 24;
    for (let n = 0; n < 80; n++) {
      const next = wait(memory, previous.clock + 32568);
      assert.equal(next.host - previous.host, 1, `ACTIVE ${n}`);
      assert.equal(next.fence, (memory[y] + 16) >> 1);
      assert.ok((next.clock % 35568) >= (memory[y] + 16) * 114,
        "erase cannot start before the previous capsule bottom");
      memory[y] += 2; previous = next;
    }
  }
});

test("pause/frontend and inactive waits do not mutate pickup lifecycle state", () => {
  const memory = new Uint8Array(65536);
  installRuntimeSegments(memory, root);
  memory[state] = 1; memory[timer] = 8;
  wait(memory, 0, "wait_frame");
  assert.equal(memory[timer], 8);
  memory[state] = 0; wait(memory, 0);
  assert.equal(memory[timer], 8);
});

test("PENDING fence keeps an active projectile published through the erase/redraw window", {
  todo: "CONFIRMED CURRENT ARCHITECTURE FAILURE: erase exposes a blank active projectile",
}, () => {
  const memory = new Uint8Array(65536);
  installRuntimeSegments(memory, root);

  const slot = 0;
  const active = addr("FIGHTER_PROJECTILE_ACTIVE") + slot;
  const rendered = addr("FIGHTER_PROJECTILE_RENDERED") + slot;
  const projectileY = addr("FIGHTER_PROJECTILE_Y") + slot;
  const screenLo = addr("FIGHTER_PROJECTILE_SCREEN_LO") + slot;
  const screenHi = addr("FIGHTER_PROJECTILE_SCREEN_HI") + slot;
  const backupTop = addr("FIGHTER_PROJECTILE_BACKUP_TOP") + slot;
  const screenAddress = 0x8140;
  const projectileCode = 11;

  memory[state] = 1; // pickup PENDING
  memory[timer] = 8; // settled moving fence
  memory[active] = 1;
  memory[rendered] = 1;
  memory[projectileY] = 54; // below the PENDING fence, one physical row
  memory[screenLo] = screenAddress & 255;
  memory[screenHi] = screenAddress >> 8;
  memory[backupTop] = 0;
  memory[screenAddress] = projectileCode;

  const fence = wait(memory, 0);
  assert.equal(fence.fence, 20);
  const eraseCycles = runRoutine(memory, "erase_fighter_projectile_overlays");
  const scanlineAfterErase = Math.floor(((fence.clock + eraseCycles) % 35568) / 114);
  assert.ok(scanlineAfterErase < memory[projectileY],
    "erase completes before ANTIC reaches the projectile's scanline");

  // This harness does not emulate ANTIC DMA. Sampling the published screen byte
  // proves the memory contract that DMA can observe before the late redraw.
  const publishedByteBeforeRedraw = memory[screenAddress];
  assert.deepEqual({
    logicallyActive: memory[active],
    renderedLatch: memory[rendered],
  }, { logicallyActive: 1, renderedLatch: 0 });

  const mainLoop = source.slice(source.indexOf("main_loop:"),
    source.indexOf("main_loop_option_pressed:"));
  assert.ok(mainLoop.indexOf("jsr erase_fighter_projectile_overlays") <
    mainLoop.indexOf("jsr render_fighter_projectile_overlays"),
  "the shared loop redraws the active projectile only after the exposed erase window");
  assert.equal(publishedByteBeforeRedraw, projectileCode,
    "a logically active projectile must remain present in the published image");
});
