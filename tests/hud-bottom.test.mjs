// M6 stage 1b after the owner's smoke (journal §BL 1-3; docs/plans/m6-gauges.md
// §7.1): the HUD's line at the bottom (scanlines 240-247) - its first line
// blank (no separator: the 7-row glyphs leave no room for a separator and a
// blank line, and a separator touching the glyph tops is what the smoke saw
// notched), the text on 241-247; the cells LIFE . HULL . BOOST on the left,
// SCORE at the right end; the VOID LANCE's meter as four HUD cells in the boss
// sector (hollow -> full by the meter's quarters, all four full while a lance
// is ready), a cell written only when the meter's quarter changes.
import assert from "node:assert/strict";
import test from "node:test";

import { bossGateMemory, bossLevel, call, label, manifest, placeBand, regionOf, runBossEntry } from "./boss-harness.mjs";

const main = (name) => label("main", name);
const lbl = (name) => label("boss", name);
const SCREEN = 0x4000, HUD_CHARSET = 0x5000;
const TRIG0 = 0xd010, STICK0 = 0xd300, UP = 0x01;
const CH_A = 33, CH_ZERO = 16, CH_HULL = 5, CH_BOOST = 7;
const letter = (c) => CH_A + c.charCodeAt(0) - 65;
const METER_CELLS = [16, 17, 18, 19];
const meter = manifest.boss.lance.hudMeter;
const METER = manifest.boss.lance.meterFrames;
const thresholds = (full) => [1, 2, 3, 4].map((k) => Math.ceil(k * full / 4));
const quartersOf = (value, full) => thresholds(full).filter((t) => value >= t).length;

function setMeter(memory, frames) {
  memory[lbl("_lance_meter_lo")] = frames & 0xff;
  memory[lbl("_lance_meter_hi")] = frames >> 8;
}
const meterOf = (memory) => memory[lbl("_lance_meter_lo")] | (memory[lbl("_lance_meter_hi")] << 8);
function hold(memory, held) {
  memory[TRIG0] = held ? 0 : 1;
  memory[STICK0] = held ? 0x0f & ~UP : 0x0f;
}
function fight(directory = 1) {
  const { memory, end } = runBossEntry({ prepare: (m) => { m[0xa603] = bossLevel(directory); } });
  assert.equal(end, "main_loop");
  placeBand(memory, manifest.boss.regions[regionOf(directory) - 1].stillAt ?? 32);
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("player_y")] = 200;
  hold(memory, false);
  return memory;
}
function tick(memory) {
  const writes = new Map();
  call(memory, lbl("lance_tick"), { hooks: { write: (address, value) => {
    if (address >= SCREEN && address < SCREEN + 40) writes.set(address, value);
  } } });
  return writes;
}
// The meter's cells: the count of full cells, the rest hollow.
function meterShown(memory) {
  const cells = METER_CELLS.map((c) => memory[SCREEN + c]);
  const full = cells.filter((v) => v === meter.full).length;
  assert.deepEqual(cells, METER_CELLS.map((_, k) => (k < full ? meter.full : meter.hollow)), `the meter's cells ${cells}`);
  return full;
}

test("§BL 1: the HUD's first line is blank - no HUD glyph has a pixel on its first row - and the text is on 241-247", () => {
  const memory = bossGateMemory();
  call(memory, main("copy_hud_charset"));
  const codes = [0, CH_HULL, CH_BOOST, 8, ...Array.from({ length: 10 }, (_, k) => CH_ZERO + k),
    ...Array.from({ length: 26 }, (_, k) => CH_A + k)];
  for (const code of codes) assert.equal(memory[HUD_CHARSET + code * 8], 0, `HUD code ${code}: its first row`);
  for (const code of [CH_ZERO + 8, letter("S"), letter("L")]) {
    assert.ok(memory.subarray(HUD_CHARSET + code * 8 + 1, HUD_CHARSET + code * 8 + 8).some((v) => v !== 0),
      `HUD code ${code}: its rows 1-7 hold the glyph`);
  }
  // The HUD's line follows the ring: scanline 240 (the list's ANTIC 2 line,
  // tests/boss-runtime.test.mjs), its first scanline the blank row.
  assert.equal(manifest.boss.lance.hudMeter.cells.join(), METER_CELLS.join());
  assert.equal(manifest.boss.lance.hudMeter.label, 15);
});

test("§BL 2: the cells - L lives, H hull, the booster field, the meter's four, SCORE at the right end", () => {
  const memory = fight();
  const row = [...memory.subarray(SCREEN, SCREEN + 40)];
  assert.equal(row[0], letter("L"));
  assert.ok(row[1] >= CH_ZERO && row[1] < CH_ZERO + 10, "the lives digit");
  assert.equal(row[2], 0);
  assert.equal(row[3], letter("H"));
  assert.ok(row.slice(4, 8).every((v) => v === CH_HULL || v === 0), `the hull's quarters (${row.slice(4, 8)})`);
  assert.equal(row[8], 0);
  assert.deepEqual(row.slice(9, 14), [0, 0, 0, 0, 0], "no booster: the field blank");
  // The owner's smoke of e76ddee: the meter's label T (cell 15, the boss sector's), its cells 16-19.
  assert.equal(row[14], 0);
  assert.equal(row[15], letter("T"), "the lance meter's T");
  assert.deepEqual(row.slice(20, 29), Array(9).fill(0), "cells 20-28 free");
  assert.deepEqual(row.slice(29, 34), [..."SCORE"].map(letter));
  assert.equal(row[34], 0);
  assert.ok(row.slice(35, 40).every((v) => v >= CH_ZERO && v < CH_ZERO + 10), "the score's five digits");
  // A booster: B and its four cells.
  call(memory, main("show_weapon_booster_hud"));
  const boosted = [...memory.subarray(SCREEN + 9, SCREEN + 14)];
  assert.equal(boosted[0], letter("B"));
  assert.ok(boosted.slice(1).every((v) => v === CH_BOOST || v === 8), `the booster's cells ${boosted}`);
});

for (const difficulty of [0, 1, 2]) {
  test(`§BL 3: the meter's cells fill by quarters (${["EASY", "MEDIUM", "HARD"][difficulty]}) - the cells written only on a quarter's change`, () => {
    const memory = fight();
    memory[main("DIFFICULTY_SETTING")] = difficulty;
    const full = METER[difficulty];
    const first = tick(memory);                           // the fight's first frame: the glyphs
    assert.ok(METER_CELLS.every((c) => !first.has(SCREEN + c)), "the first frame writes the glyphs only");
    const second = tick(memory);                          // the second: the hollow cells
    assert.equal(meterShown(memory), 0);
    assert.ok(METER_CELLS.every((c) => second.has(SCREEN + c)), "the second frame draws the four cells");
    for (const meterGlyph of [meter.hollow, meter.full]) {
      assert.equal(memory[HUD_CHARSET + meterGlyph * 8], 0, "the meter's glyphs: the first row blank");
      assert.ok(memory.subarray(HUD_CHARSET + meterGlyph * 8, HUD_CHARSET + meterGlyph * 8 + 8).some((v) => v !== 0));
    }
    for (const [k, t] of thresholds(full).entries()) {
      for (let f = 0; f < 6; f += 1) { setMeter(memory, t - 2); tick(memory); }
      setMeter(memory, t - 2);
      assert.equal(tick(memory).size, 0, `quarter ${k + 1}: a HUD write with no change`);
      assert.equal(meterShown(memory), k);
      const writes = tick(memory);                        // the meter reaches t
      assert.equal(meterOf(memory), t);
      assert.deepEqual([...writes.keys()].sort(), METER_CELLS.map((c) => SCREEN + c), `quarter ${k + 1}: the four cells, nothing else`);
      assert.equal(meterShown(memory), quartersOf(t, full));
    }
  });
}

test("§BL 3: a lance ready keeps the four cells full - through the charge, a miss and the torpedo's flight - and a kill empties them", () => {
  const memory = fight();
  tick(memory);
  for (const t of thresholds(METER[1])) {                 // the meter fills a frame at a time: the cells keep up
    setMeter(memory, t - 1);
    for (let f = 0; f < 3; f += 1) tick(memory);
  }
  for (let f = 0; f < 3; f += 1) tick(memory);
  assert.equal(memory[lbl("lance_ready")], 0xff);
  assert.equal(meterShown(memory), 4);
  hold(memory, true);
  let fired = false;
  for (let f = 0; f < 400 && !(fired && memory[lbl("lance_beam")] === 0); f += 1) {
    const writes = tick(memory);
    fired ||= memory[lbl("lance_beam")] !== 0;
    if (memory[lbl("lance_ready")] === 0xff) {
      assert.equal(meterShown(memory), 4, `frame ${f}: ready, the cells full`);
      assert.ok(METER_CELLS.every((c) => !writes.has(SCREEN + c)), `frame ${f}: a meter cell written while ready`);
    }
  }
  assert.ok(fired, "the torpedo fired");
  hold(memory, false);
  if (memory[lbl("lance_ready")] === 0) {
    for (let f = 0; f < 6; f += 1) tick(memory);
    assert.equal(meterShown(memory), quartersOf(meterOf(memory), METER[1]), "the lance spent: the cells by the meter again");
  }
});
