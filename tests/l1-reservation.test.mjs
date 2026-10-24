import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { nativeRoutineHarness } from "../scripts/debris-destruction-runtime.mjs";
import { runBossEntry } from "./boss-harness.mjs";

function watchedCall(h, name, start, end, writes) {
  const cpu = new Nmos6502(h.memory, {
    write(address, value, executingCpu) {
      if (address >= start && address < end) {
        writes.push({ name, address, value, pc: executingCpu.pc });
      }
    },
  });
  cpu.push(0x7f);
  cpu.push(0xfe);
  cpu.pc = h.label(name);
  for (let steps = 0; steps < 300_000 && cpu.pc !== 0x7fff; steps += 1) cpu.step();
  assert.equal(cpu.pc, 0x7fff, `${name} returns`);
}

// L1 reserves this tail for M3-H; no current owner may write it. The main
// lifecycle clear is the closest declared writer, so watch its actual stores.
test("the PROJECTILES damaged-body reservation survives lifecycle clears", () => {
  const h = nativeRoutineHarness();
  const start = h.label("M3H_DAMAGED_BODY_BUFFER");
  const end = h.label("M3H_DAMAGED_BODY_BUFFER_END");
  assert.deepEqual([start, end], [0x549e, 0x54be]);
  h.memory.fill(0xa5, start, end);
  const writes = [];
  for (const name of ["init_fighter_projectiles", "clear_fighter_projectiles"]) {
    watchedCall(h, name, start, end, writes);
  }
  assert.deepEqual(writes, []);
  assert.deepEqual([...h.memory.subarray(start, end)], Array(32).fill(0xa5));
});

test("menu music initializes and ticks without writing the damaged-body tail", () => {
  const h = nativeRoutineHarness();
  const root = path.resolve(new URL("..", import.meta.url).pathname);
  h.memory.set(fs.readFileSync(path.join(root, "build", "menu-overlay.bin")), 0x0c00);
  h.memory[h.label("sound_enabled")] = 1;
  h.memory.fill(0xa5, 0x549e, 0x54be);
  const writes = [];
  watchedCall(h, "music_start_menu", 0x549e, 0x54be, writes);
  for (let frame = 0; frame < 16; frame += 1) {
    watchedCall(h, "music_tick", 0x549e, 0x54be, writes);
  }
  assert.deepEqual(writes, []);
  assert.deepEqual([...h.memory.subarray(0x549e, 0x54be)], Array(32).fill(0xa5));
});

test("all four boss entries leave the gameplay reservation untouched", () => {
  for (const level of [1, 4, 7, 10]) {
    const writes = [];
    const entry = runBossEntry({
      prepare(memory) { memory[0xa603] = level; },
      onWrite(address, value, cpu) {
        if (address >= 0x549e && address < 0x54be) {
          writes.push({ address, value, pc: cpu.pc });
        }
      },
    });
    assert.equal(entry.end, "main_loop", `level ${level} boss entry`);
    assert.deepEqual(writes, [], `level ${level} writer watch`);
  }
});
