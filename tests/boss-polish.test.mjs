// fix/boss-polish (owner requests and answers of 2026-10-12,
// docs/plans/boss-polish.md): the HULL gauge and the boss loading screen's
// title, and the art rule the hit flash needs. The flash itself is
// tests/boss-hit-flash.test.mjs.
//
// 1. HULL: a spent quarter vanishes - the HUD's blank (CH_SPACE), as a spent
//    BOOST cell does - in the normal HUD and in the boss sector's HUD, at any
//    hull, through a death and the respawn's full hull.
// 2. The title, variant A (decision AL 1): WARNING on row 5, the region's boss
//    name on row 7, INCOMING on row 8 of the reader's text screen, for regions
//    1-4, from the region's own theme run (never the initial block or slot F).
// 3. The art rule (plan §10.3): every damage stage of every destructible module
//    - intact, cracked, broken; in the look it is hit in; a capped emitter
//    plate's three - has colour-3 pixels, the pixels the flash's bit-7 toggle
//    recolours, in every region on the disk.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_TITLE_ADDRESS, bossPlaceholderDraft, bossRegionDirectory, compileBossRegion, loadBossPlaceholders,
  loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import {
  Drive, bossGateMemory, call, cpuOver, label, mainAddress, root, runUntil,
} from "./boss-harness.mjs";

const main = (name) => label("main", name);
const HUD = 0x4000;
const HULL_CELLS = [25, 26, 27, 28];
const HULL_THRESHOLDS = [3, 5, 8, 10];      // src/main.s hud_hull_segment_thresholds
const CH_SPACE = 0, CH_HULL_FULL = 5;
const hull = (memory) => HULL_CELLS.map((cell) => memory[HUD + cell]);
const expectedHull = (units) => HULL_THRESHOLDS.map((threshold) => (units >= threshold ? CH_HULL_FULL : CH_SPACE));
const HEALTH = mainAddress("BROAD_PLAYER_HEALTH");

test("HULL: a spent quarter is the HUD's blank, as a spent BOOST cell - full, partial and empty hull", () => {
  const memory = bossGateMemory();
  for (let units = 0; units <= 10; units += 1) {
    memory[HEALTH] = units;
    call(memory, main("update_hud_status"));
    assert.deepEqual(hull(memory), expectedHull(units), `hull ${units} of 10`);
  }
});

test("HULL: the respawn's full hull shows four plates again", () => {
  const memory = bossGateMemory();
  memory[HEALTH] = 2;
  call(memory, main("update_hud_status"));
  assert.deepEqual(hull(memory), [CH_SPACE, CH_SPACE, CH_SPACE, CH_SPACE]);
  call(memory, main("respawn_player"));
  assert.deepEqual(hull(memory), expectedHull(10), "the respawn's HUD");
});

test("HULL: the boss sector's HUD, rebuilt by the install, blanks the spent quarters too", () => {
  for (const units of [10, 7, 4, 2, 0]) {
    const memory = bossGateMemory();
    memory[HEALTH] = units;
    const cpu = cpuOver(new Drive(), memory);
    cpu.sp = 0xf0;
    cpu.pc = label("director", "_asm_boss_enter");
    assert.equal(runUntil(cpu, { main_loop: main("main_loop") }), "main_loop");
    assert.deepEqual(hull(memory), expectedHull(units), `boss HUD at hull ${units}`);
  }
});

// The reader's text screen at the moment the boss code takes over: the title
// is drawn, nothing has cleared it yet.
function loadingScreen(level) {
  const memory = bossGateMemory();
  memory[0xa603] = level;
  const cpu = cpuOver(new Drive(), memory);
  cpu.sp = 0xf0;
  cpu.pc = label("director", "_asm_boss_enter");
  assert.equal(runUntil(cpu, { slotA: main("capital_slot_a"),
    failure: label("reader", "sector_reader_failure_screen") }), "slotA", `level ${level}: the entry failed`);
  return memory;
}
// A text row as the frontend encoder draws `text` centred on 40 columns.
function encodedRow(memory, text) {
  const row = new Array(40).fill(0);
  const first = Math.floor((40 - text.length) / 2);
  [...text].forEach((char, i) => { row[first + i] = call(memory, main("encode_frontend_character"), { a: char.charCodeAt(0) }).a; });
  return row;
}
const screenRow = (memory, row) => [...memory.subarray(HUD + row * 40, HUD + row * 40 + 40)];

for (const [region, level, name] of [[1, 1, "BLOCKADE BREAKER"], [2, 4, "BASTION"], [3, 7, "SIEGE SPINE"],
  [4, 10, "VOID CITADEL"]]) {
  test(`the boss loading screen, region ${region}: WARNING / ${name} / INCOMING`, () => {
    const memory = loadingScreen(level);
    assert.deepEqual(screenRow(memory, 5), encodedRow(memory, "WARNING"), "row 5");
    assert.deepEqual(screenRow(memory, 6), new Array(40).fill(0), "row 6 is blank");
    assert.deepEqual(screenRow(memory, 7), encodedRow(memory, name), "row 7: the region's name");
    assert.deepEqual(screenRow(memory, 8), encodedRow(memory, "INCOMING"), "row 8");
  });
}

test("the title's text lives in the regions' theme runs, not in the initial block or slot F", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
  const theme = manifest.boss.runs.find((run) => run.name === "boss-region-1-theme");
  assert.ok(BOSS_TITLE_ADDRESS >= theme.destination && BOSS_TITLE_ADDRESS < theme.destination + theme.bytes,
    "the records sit inside the theme run");
  const kernel = fs.readFileSync(path.join(root, "src", "hybrid", "light-kernel.s"), "utf8");
  for (const name of ["BLOCKADE", "BASTION", "SIEGE", "CITADEL", "INCOMING", "APPROACHING"]) {
    assert.doesNotMatch(kernel, new RegExp(`\\.byte "[^"]*${name}`), `${name} is resident text`);
  }
  const block = fs.readFileSync(path.join(root, "build", "boss-region-1-block.bin"));
  assert.equal(block.indexOf(Buffer.from("BLOCKADE")), -1, "the name is in slot F's block");
});

// The art rule: colour-3 pixels per stage, in the look the module is hit in.
const COLOUR3_FLOOR = 4;
function colour3(region, code) {
  let n = 0;
  for (let y = 0; y < 8; y += 1) {
    const byte = region.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
    for (let x = 0; x < 4; x += 1) if (((byte >> (6 - 2 * x)) & 3) === 3) n += 1;
  }
  return n;
}
function stageCounts(region) {
  const K = region.stageStep;
  const staged = (code) => (code & 0x7f) >= region.stagedBase && (code & 0x7f) < region.plainBase;
  const counts = region.modules.map((module, index) => {
    const look = region.openLooks.get(index) ?? [...Array(module.width * module.height).keys()].map((k) =>
      region.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
    return { name: module.name, stages: [0, 1, 2].map((stage) => look.filter((code) => code & 0x7f)
      .reduce((sum, code) => sum + colour3(region, staged(code) ? code + stage * K : code), 0)) };
  });
  counts.push({ name: "capped plate", stages: [0, 1, 2].map((stage) => colour3(region, region.capped.code + stage * K)) });
  return counts;
}

test("the art rule: every damage stage of every destructible module has colour-3 pixels, regions 1-4", () => {
  const draft = loadBossRegionDraft(bossRegionDirectory(root, 1));
  const placeholders = loadBossPlaceholders(root);
  const regions = [compileBossRegion(draft),
    ...[2, 3, 4].map((n) => compileBossRegion(bossPlaceholderDraft(draft, placeholders[String(n)])))];
  regions.forEach((region, r) => {
    for (const { name, stages } of stageCounts(region)) {
      stages.forEach((count, stage) => assert.ok(count >= COLOUR3_FLOOR,
        `region ${r + 1}: ${name}'s ${["intact", "cracked", "broken"][stage]} stage has ${count} colour-3 pixels`));
    }
  });
});
