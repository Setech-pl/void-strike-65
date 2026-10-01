import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { parseViceLabels } from "../scripts/runtime-cycles.mjs";

const root = new URL("../", import.meta.url).pathname;
const labels = parseViceLabels(fs.readFileSync(`${root}build/void-strike-65.lbl`, "utf8"));
const addr = (name) => { assert.ok(labels.has(name), name); return labels.get(name); };
const state = addr("ENTITY_STATE") + 1;
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

// RETIRED 2026-10-01 (recorded failures review, action B4; owner-approved):
//   * "executed wait moves a late fence earlier without skipping a PAL update";
//   * the todo test "PENDING fence keeps an active projectile published through
//     the erase/redraw window" (it waited for "erase exposes a blank active
//     projectile").
// Both tested the frame fence that moved with a PENDING or ACTIVE character
// capsule (pickup_pending_fence). f6eee5c made the capsule a PMG object and
// removed that fence: wait_gameplay_frame is wait_frame with one fixed line.
// The todo test could never turn green - the mechanism it waited on is gone.

test("pause/frontend and inactive waits do not mutate pickup lifecycle state", () => {
  const memory = new Uint8Array(65536);
  installRuntimeSegments(memory, root);
  memory[state] = 1; memory[timer] = 8;
  wait(memory, 0, "wait_frame");
  assert.equal(memory[timer], 8);
  memory[state] = 0; wait(memory, 0);
  assert.equal(memory[timer], 8);
});
