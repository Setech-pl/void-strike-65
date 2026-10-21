// S5-3 (feat/boss-region-3, docs/plans/s5-boss-regions.md §4.4, §6.3; the
// owner's answers of 2026-10-13): region 3's boss, Siege Spine, with the force
// field. The data (assets/graphics/boss-regions/region-3/), the built disk's
// region 3, and the field on the 6502 harness through the real boss entry (the
// field's code is read from the built disk into slot F):
//   1. the layout, the hit points, the escort, the finale and the name are
//      region 3's own data, and the built disk carries them;
//   2. the art rule (plan boss-polish §10.3) holds for every module stage;
//   3. the palette reads as the enemy's on levels 7-9, where the ally steel
//      is $84: no hull, trim or field colour within 45 degrees of its hue;
//   4. a powered field half stops every player shot in its columns (no
//      damage, the deflection on the field cell), a half falls with its own
//      generator - column by column, the field cells cleared - and the other
//      half stays powered until its generator falls;
//   5. a hit a generator lives through flashes it (b3), a kill shows the spark;
//   6. the stress composition with the field (scripts/measure-boss-stress-field.mjs):
//      level 7 (tier 2) and level 9 (tier 4) under the reachable limit 8,500,
//      tier 4 under its own pin 8,750 (owner answer Q4), rule (B) on every frame.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BOSS_TABLE, bossBandRowAddress, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { atariPalRegisterToRgb } from "../scripts/preview.mjs";
import { call, label, manifest, placeBand, root, runBossEntry, shootAt } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const draftDirectory = bossRegionDirectory(root, 3);
const hasDraft = fs.existsSync(path.join(draftDirectory, "modules.json"));
const region3 = hasDraft ? compileBossRegion(loadBossRegionDraft(draftDirectory)) : null;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const index = (name) => region3.modules.findIndex((module) => module.name === name);

test("region 3 is Siege Spine from its own draft: the layout, the hit points, the field, on the built disk", () => {
  assert.ok(hasDraft, "assets/graphics/boss-regions/region-3/ has no draft");
  assert.equal(region3.name, "Siege Spine");
  const hp = Object.fromEntries(region3.modules.map((module) => [module.name, module.hp]));
  // Owner answer 5 of 2026-10-13 (generators 20 -> 16, plates and guns 12 -> 10,
  // the siege cannon 24 -> 20, aiming for about 105 s on MEDIUM), then one more
  // step toward that aim (plan s5-boss-regions §6.3.7): generators 14, plates
  // 8, the siege cannon 18, emitters 2-3 16; guns 10.
  // RE-PINNED feat/boss-order-scale (the owner's decision AX 2-4: the curve,
  // MEDIUM about 112 s for region 3): every module x 0.90, rounded -
  // generators 14 -> 13, guns 10 -> 9, emitters 18 / 16 -> 16 / 14, plates
  // 8 -> 7 (docs/boss-curve.json).
  assert.deepEqual(hp, {
    "gen-l": 13, "gen-r": 13, "gun-1": 9, "gun-2": 9, "gun-3": 9, "gun-4": 9,
    "emitter-1": 16, "emitter-2": 14, "emitter-3": 14,
    "plate-a": 7, "plate-b": 7, "plate-c": 7, "plate-d": 7,
  });
  assert.equal(region3.modules.find((m) => m.name === "emitter-1").slot, 1, "the siege cannon is emitter slot 1");
  assert.ok(region3.field !== null, "the region carries a field");
  assert.deepEqual(region3.field.halves.map(({ from, to, generators }) =>
    [from, to, generators.map((g) => region3.modules[g].name)]), [[14, 31, ["gen-l"]], [32, 48, ["gen-r"]]],
  "each half falls with its own generator (owner answer 4)");
  const built = manifest.boss.regions[2];
  assert.equal(built.name, "Siege Spine");
  assert.equal(built.modules, region3.modules.length, "the built disk's region 3 is the draft's");
  assert.deepEqual(built.field?.halves?.map((h) => h.generators), [["gen-l"], ["gen-r"]]);
  const charset = manifest.boss.runs.find((run) => run.name === "boss-region-3-charset");
  assert.equal(charset.sectors, region3.runs.charset.sectors);
  const block = manifest.boss.slotF.blocks[2];
  assert.ok(block.codeBytes > 0, "region 3's block carries the field's code");
  assert.ok(block.bytes <= manifest.boss.slotF.capacityBytes, `region 3's block is ${block.bytes} B`);
  assert.ok(region3.lookTail.length <= 110, "the look tail fits slot F's rule");
  // Regions 1 and 2 carry no code: their hook byte ($526E, the block's padding) is 0.
  // RE-POINTED feat/boss-region-4 (S5-4): region 4's block carries its gravity
  // well's code (tests/boss-region-4.test.mjs).
  // RE-POINTED feat/boss-region-2 (S5-5): region 2's block carries its rails'
  // code (tests/boss-region-2.test.mjs); region 1's alone carries none.
  for (const r of [0]) assert.equal(manifest.boss.slotF.blocks[r].codeBytes, 0, `region ${r + 1} has code`);
});

test("region 3's escort and finale: region 1's escort cadence, the finale on", () => {
  assert.ok(hasDraft);
  for (const byte of ["escortAfter", "escortBase", "escortJitter"]) {
    assert.equal(region3.tables[BOSS_TABLE[byte]], region1.tables[BOSS_TABLE[byte]], `${byte} differs from region 1's`);
  }
  assert.ok(region3.fire.finaleCooldown > 0, "the final salvos are on in region 3");
  assert.equal(manifest.boss.regions[2].finaleCooldown, region3.fire.finaleCooldown);
});

test("the art rule: every damage stage of every region 3 module has colour-3 pixels", () => {
  assert.ok(hasDraft);
  const colour3 = (code) => {
    let n = 0;
    for (let y = 0; y < 8; y += 1) {
      const byte = region3.runs.charset.data[(code & 0x7f) * 8 + y] ?? 0;
      for (let px = 0; px < 4; px += 1) if (((byte >> (6 - 2 * px)) & 3) === 3) n += 1;
    }
    return n;
  };
  const K = region3.stageStep;
  const staged = (code) => (code & 0x7f) >= region3.stagedBase && (code & 0x7f) < region3.plainBase;
  region3.modules.forEach((module, i) => {
    const look = region3.openLooks.get(i) ?? [...Array(module.width * module.height).keys()].map((k) =>
      region3.bandRows[module.row + Math.floor(k / module.width)][module.x + (k % module.width)]);
    [0, 1, 2].forEach((stage) => {
      const count = look.filter((code) => code & 0x7f).reduce((sum, code) => sum + colour3(staged(code) ? code + stage * K : code), 0);
      assert.ok(count >= 4, `${module.name} stage ${stage}: ${count} colour-3 pixels`);
    });
  });
});

test("the palette reads as the enemy on levels 7-9: no hull, trim or field colour near the ally steel's hue", () => {
  assert.ok(hasDraft);
  const hue = (value) => {
    const [r, g, b] = atariPalRegisterToRgb(value).map((c) => c / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.1) return null;                       // grey: no hue
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const ally = hue(0x84);                           // levels 7-9's allied steel (assets/levels)
  const palette = [0, 1, 2, 3].map((i) => region3.tables[BOSS_TABLE.palette + i]);
  for (const [i, value] of palette.entries()) {
    const h = hue(value);
    if (h === null) continue;
    const distance = Math.min(Math.abs(h - ally), 360 - Math.abs(h - ally));
    assert.ok(distance >= 45, `COLPF${i} $${value.toString(16)} is ${distance.toFixed(0)} degrees from the ally steel $84`);
  }
});

// ---------------------------------------------------------------------------
// The field on the 6502 harness, through the real boss entry at level 7.
// ---------------------------------------------------------------------------
let entry = null;
function siegeSpine(p = 32) {
  if (entry === null) entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = 7; } });
  assert.equal(entry.end, "main_loop");
  const memory = Uint8Array.from(entry.memory);
  placeBand(memory, p);
  return memory;
}
function frame(memory) {
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  call(memory, lbl("boss_update"));
  call(memory, manifest.overlays.capitalVectors.address + 8 * 3);     // SECTOR_COMPLETION
}
const hp = (memory, name) => memory[lbl("_boss_hp") + index(name)];
const mapOf = (memory, column) => memory[lbl("boss_column_map") + column];
const FIELD_STOP_Y = 24 + 8 * 8;                   // the line under band row 7 (BAND_TOP_Y 24)
const fieldCell = (memory, column) => memory[bossBandRowAddress(7) + column];
const shoot = (memory, column) => { shootAt(memory, column); frame(memory); };
const kill = (memory, name, column) => { memory[lbl("_boss_hp") + index(name)] = 1; shoot(memory, column); };

test("the field: a powered half stops every shot, a half falls with its own generator, the other stays", () => {
  assert.ok(hasDraft);
  const memory = siegeSpine(32);
  frame(memory);
  frame(memory);
  const fieldCode = fieldCell(memory, 20);
  assert.notEqual(fieldCode & 0x7f, 0, "the field glyph is drawn in row 7");
  for (const column of [14, 20, 31, 32, 38, 48]) {
    assert.equal(mapOf(memory, column), 0xfe, `column ${column} is the field's while powered`);
  }
  // A shot into plate-a's columns (left half): no damage, the deflection on the field cell.
  const plateA = hp(memory, "plate-a");
  shoot(memory, 20);
  assert.equal(hp(memory, "plate-a"), plateA, "plate-a took damage through a powered half");
  assert.equal(fieldCell(memory, 20), region3.deflect, "the deflection shows on the field cell");
  for (let f = 0; f < 4; f += 1) frame(memory);
  assert.equal(fieldCell(memory, 20), fieldCode, "the field cell is given back after the deflection");
  // The left generator falls: its half collapses, the right half stays powered.
  kill(memory, "gen-l", 12);
  assert.equal(hp(memory, "gen-l"), 0);
  for (let f = 0; f < 60; f += 1) frame(memory);
  for (let column = 14; column <= 31; column += 1) {
    assert.equal(fieldCell(memory, column), 0, `left field cell ${column} still drawn`);
    assert.notEqual(memory[lbl("boss_stop_y") + column], FIELD_STOP_Y, `left column ${column} still stops at the field`);
  }
  assert.equal(mapOf(memory, 20), index("plate-a"), "plate-a is its columns' front again");
  shoot(memory, 20);
  assert.equal(hp(memory, "plate-a"), plateA - 1, "plate-a takes damage once its half is down");
  const plateC = hp(memory, "plate-c");
  shoot(memory, 38);
  assert.equal(hp(memory, "plate-c"), plateC, "plate-c took damage through the right half, still powered");
  assert.equal(fieldCell(memory, 38), region3.deflect, "the right half's deflection");
  for (let f = 0; f < 4; f += 1) frame(memory);
  for (let column = 32; column <= 48; column += 1) assert.equal(fieldCell(memory, column), fieldCode);
  // The right generator falls: both halves down, no field cell left.
  kill(memory, "gen-r", 50);
  for (let f = 0; f < 60; f += 1) frame(memory);
  for (let column = 14; column <= 48; column += 1) assert.equal(fieldCell(memory, column), 0, `field cell ${column}`);
  shoot(memory, 38);
  assert.equal(hp(memory, "plate-c"), plateC - 1, "plate-c takes damage once both halves are down");
});

test("a hit a generator lives through flashes it (b3); a kill shows the spark", () => {
  assert.ok(hasDraft);
  const memory = siegeSpine(32);
  frame(memory);
  const gen = region3.modules[index("gen-l")];
  const cells = () => [...Array(gen.width * gen.height).keys()].map((i) =>
    memory[bossBandRowAddress(gen.row + Math.floor(i / gen.width)) + gen.x + (i % gen.width)]);
  const before = cells();
  const life = hp(memory, "gen-l");
  shoot(memory, 12);
  assert.equal(hp(memory, "gen-l"), life - 1, "the generator took the hit");
  const seen = [];
  for (let f = 0; f < 4; f += 1) { seen.push(cells()); frame(memory); }
  assert.ok(seen.some((now) => now.every((code, i) => code === ((before[i] & 0x7f) === 0 ? before[i] : before[i] ^ 0x80))),
    "the generator's cells flashed (bit 7 toggled)");
  assert.deepEqual(cells().map((c) => c & 0x7f), before.map((c) => c & 0x7f), "the flash gives the cells back");
  const killed = siegeSpine(32);
  frame(killed);
  killed[lbl("_boss_hp") + index("gen-l")] = 1;
  shootAt(killed, 12);
  call(killed, lbl("boss_update"));
  const sparks = [...Array(8).keys()].map((r) => killed[bossBandRowAddress(r) + 12]);
  assert.ok(sparks.includes(region3.spark), "a generator's kill shows the spark");
});

test("the stress composition with the field: level 7 and level 9 under 8,500 reachable, tier 4 under its pin 8,750, rule (B)",
  async () => {
    assert.ok(hasDraft);
    const { fieldStress } = await import("../scripts/measure-boss-stress-field.mjs");
    for (const [level, pin] of [[7, 8500], [9, 8750]]) {
      const { cases, describe, worstOf } = fieldStress({ level });
      const reachable = worstOf(cases.filter((c) => c.reach === "reachable"));
      console.log(`# region 3, level ${level}: ${cases.length} cases; worst reachable ${describe(reachable)}`);
      assert.ok(cases.some((c) => c.absorb.length > 0), "no case met the field");
      assert.ok(cases.some((c) => c.collapse !== null), "no case had a half collapsing");
      assert.ok(reachable.cycles <= 8500, `level ${level}: ${describe(reachable)} (the reachable limit 8,500)`);
      assert.ok(reachable.cycles <= pin, `level ${level}: ${describe(reachable)} (pin ${pin})`);
      assert.equal(cases.reduce((sum, c) => sum + c.clashes, 0), 0, "a frame with a module kill and a gun's spawn (rule B)");
    }
  });

// M6 stage 1 (docs/plans/m6-void-lance.md §7): the VOID LANCE in each of its
// states (tests/lance-states.mjs) on the Spine's compositions.
test("M6: the Spine with the VOID LANCE - every state under 8,500 reachable on levels 7 and 9, rule (B)", { timeout: 900_000 },
  async () => {
    assert.ok(hasDraft);
    const { fieldStress } = await import("../scripts/measure-boss-stress-field.mjs");
    const { lanceStress } = await import("./lance-states.mjs");
    for (const level of [7, 9]) {
      const table = lanceStress((lance) => fieldStress({ level, lance }));
      console.log(`# region 3, level ${level}, the lance: ${Object.entries(table).map(([mode, { worst }]) => `${mode} ${worst.cycles}`).join(", ")}`);
      for (const [mode, { worst, clashes }] of Object.entries(table)) {
        assert.ok(worst.cycles <= 8500, `level ${level}, lance ${mode}: ${worst.cycles}`);
        assert.equal(clashes, 0, `lance ${mode}: rule (B)`);
      }
    }
  });
