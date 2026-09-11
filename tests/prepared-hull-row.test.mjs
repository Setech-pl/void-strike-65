import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { parseViceLabels } from "../scripts/runtime-cycles.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "vs-prepared-row-"));
execFileSync("ca65", ["--cpu", "6502", "-g", "-I", "build", "-o",
  `${temporary}/main.o`, "src/main.s"], { cwd: root });
execFileSync("ld65", ["--large-alignment", "-C", "cfg/atari-boot.cfg", "-o", `${temporary}/main.bin`,
  "-Ln", `${temporary}/main.lbl`, `${temporary}/main.o`], { cwd: root });
const labels = parseViceLabels(fs.readFileSync(`${temporary}/main.lbl`, "utf8"));
const linked = fs.readFileSync(`${temporary}/main.bin`);
const at = (name) => {
  assert.ok(labels.has(name), `missing ${name}`);
  return labels.get(name);
};
function run(memory, name, a = 0) {
  const cpu = new Nmos6502(memory);
  cpu.a = a;
  cpu.push(0x7f); cpu.push(0xfe); cpu.pc = at(name);
  const visited = new Set();
  for (let steps = 0; cpu.pc !== 0x7fff; steps++) {
    assert.ok(steps < 200000, name);
    visited.add(cpu.pc); cpu.step();
  }
  return { cycles: cpu.cycles, visited };
}
function fixture(difficulty, fill = 0) {
  const memory = new Uint8Array(65536).fill(fill);
  installRuntimeSegments(memory, root);
  memory.set(linked.subarray(0, 8192), 0x2000);
  for (const name of ["STARFIELD", "BROADSIDE", "A2_KERNEL", "ENTITY_CODE", "PICKUP_CODE"]) {
    const offset = name === "PICKUP_CODE" ? at("__PICKUPFILE_FILEOFFS__") :
      at(`__${name}_LOAD__`) - 0x2000;
    memory.set(linked.subarray(offset, offset + at(`__${name}_SIZE__`)), at(`__${name}_RUN__`));
  }
  memory[at("DIFFICULTY_SETTING")] = difficulty;
  for (const name of ["init_playfield_row_table", "init_state", "init_entity_effects",
    "unpack_capital_hull_maps", "init_broadside", "init_screen"])
    run(memory, name);
  memory[at("CAPITAL_SECTOR_STATE")] = 2;
  memory[at("corridor_phase")] = 123;
  memory[at("CORRIDOR_PHASE_HI")] = 0;
  return memory;
}
function row(memory) { return memory.slice(0x4028, 0x4050); }
function commit(memory) {
  run(memory, "rotate_playfield_rows");
  memory[at("PLAYFIELD_RING_FLAGS")] = 1;
  run(memory, "set_gameplay_row_ptr", 0);
  return run(memory, "commit_prepared_hull_row");
}

test("prepared static rows match raw hull generation through every COMBAT row and physical wrap", () => {
  for (const difficulty of [0, 1, 2]) {
    const memory = fixture(difficulty);
    const seen = new Set();
    for (let logical = 112; logical < 368; logical++) {
      memory[at("corridor_phase")] = logical & 255;
      memory[at("CORRIDOR_PHASE_HI")] = logical >> 8;
      const screenBefore = memory.slice(0x4000, 0x4800);
      const ringBefore = memory.slice(0x8140, 0x85ba);
      const rng = [memory[at("rng_state")], memory[at("STAR_RNG_STATE")], memory[0x80fb]];
      run(memory, "prepare_next_hull_row");
      assert.deepEqual(memory.slice(0x4000, 0x4800), screenBefore, "preparation touched live graphics");
      assert.deepEqual(memory.slice(0x8140, 0x85ba), ringBefore, "preparation touched ring/backing");
      assert.deepEqual([memory[at("rng_state")], memory[at("STAR_RNG_STATE")], memory[0x80fb]], rng);
      const reference = memory.slice();
      reference[at("PREPARED_HULL_SECTOR")] = 255;
      const fast = commit(memory);
      const raw = commit(reference);
      assert.ok(!fast.visited.has(at("draw_hull_row")), "cache missed a valid COMBAT row");
      assert.ok(raw.visited.has(at("draw_hull_row")));
      assert.deepEqual(row(memory), row(reference), `${difficulty}/${logical}`);
      assert.deepEqual(memory.slice(0x8140, 0x85b7), reference.slice(0x8140, 0x85b7));
      assert.ok(fast.cycles < raw.cycles, "CPU-only commit saving (not a DMA wall prediction)");
      seen.add(memory[at("PLAYFIELD_ROW_LO")]);
    }
    assert.equal(seen.size, 27, "all physical rows and complete wrap exercised");
  }
});

test("row, section, ring, init and hull-only changes invalidate preparation", () => {
  for (const fill of [0xa5, 0x5a]) for (const change of ["row", "high", "section", "ring", "init", "hull-only"]) {
    const memory = fixture(2, fill);
    run(memory, "prepare_next_hull_row");
    if (change !== "hull-only") run(memory, "rotate_playfield_rows");
    memory[at("PLAYFIELD_RING_FLAGS")] = 1;
    if (change === "row") memory[at("corridor_phase")]++;
    if (change === "high") memory[at("CORRIDOR_PHASE_HI")]++;
    if (change === "section") memory[at("CAPITAL_SECTOR_STATE")] = 3;
    if (change === "ring") run(memory, "rotate_playfield_rows");
    if (change === "init") run(memory, "init_screen");
    if (change === "hull-only") memory[at("PLAYFIELD_RING_FLAGS")] = 0;
    run(memory, "set_gameplay_row_ptr", 0);
    const reference = memory.slice();
    run(reference, "draw_hull_row");
    const result = run(memory, "commit_prepared_hull_row");
    assert.ok(result.visited.has(at("draw_hull_row")), change);
    assert.deepEqual(row(memory), row(reference), change);
  }
});

test("muzzle warning/flash and transient glyphs cannot enter prepared backing", () => {
  for (const difficulty of [0, 1, 2]) for (const transient of [0x45, 0x50, 0x7e, 0x7f]) {
    const memory = fixture(difficulty);
    const clean = memory.slice();
    memory.fill(transient, 0x4028, 0x4050);
    memory.fill(transient, 0x8140, 0x8578);
    run(memory, "prepare_next_hull_row");
    run(clean, "prepare_next_hull_row");
    for (const [start, end] of [[0, 9], [31, 40]])
      assert.deepEqual(memory.slice(at("PREPARED_HULL_ROW") + start, at("PREPARED_HULL_ROW") + end),
        clean.slice(at("PREPARED_HULL_ROW") + start, at("PREPARED_HULL_ROW") + end));
    assert.deepEqual(memory.slice(0x4028, 0x4050), new Uint8Array(40).fill(transient));
  }
});
