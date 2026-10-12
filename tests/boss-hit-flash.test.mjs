// fix/boss-polish (owner request 2026-10-12, docs/plans/boss-polish.md): a
// damaging hit that a boss module lives through flashes the module - its
// non-blank cells show the region's flash glyph (code 127) for the flash's
// frames, then get their codes back - instead of the spark, which read as a
// small explosion. A kill keeps the spark (the destruction's look is
// unchanged).
//
// The flash is presentation only. The proof (A/B): the same entered machine
// runs the same fight twice, once as built and once with the flash's frame
// step patched to the plain queue draw (no flash at all); every gameplay byte
// - hit points, stages, the column map and stop lines, exposure, score, hits,
// the controller's phase - is equal after every frame, and the band is equal
// once both have settled: through stage changes and kills of a flashing
// module, the band's drift, the defeat's chain and the player's death.
//
// Runs on the 6502 harness over the default build's images (or a review
// variant's: VS65_HARNESS_BUILD, tests/boss-harness.mjs).
import assert from "node:assert/strict";
import test from "node:test";

import { BOSS_FLASH_CODE, bossBandRowAddress, bossRegionDirectory, compileBossRegion, loadBossRegionDraft }
  from "../scripts/boss-assets.mjs";
import {
  call, label, labelsOf, mainAddress, placeBand, root, runBossEntry, shootAt, visibleCells,
} from "./boss-harness.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const byName = new Map(region1.modules.map((module, index) => [module.name, index]));
const lbl = (name) => label("boss", name);
const main = (name) => mainAddress(name);
const flashBuilt = labelsOf.boss.has("boss_flash_frame");
const STATS_HITS = 0xae;
const cell = (memory, column, row) => memory[bossBandRowAddress(row) + column];
const band = (memory) => Array.from({ length: 8 }, (_, row) =>
  [...memory.subarray(bossBandRowAddress(row), bossBandRowAddress(row) + 64)]);
const cellsOf = (memory, module) => [...Array(module.width * module.height).keys()].map((i) =>
  cell(memory, module.x + (i % module.width), module.row + Math.floor(i / module.width)));
const hp = (memory, index) => memory[lbl("_boss_hp") + index];
const columnMap = (memory) => [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];

let entry = null;
function fortress(p = 32) {
  if (entry === null) entry = runBossEntry();
  const memory = Uint8Array.from(entry.memory);
  placeBand(memory, p);
  return memory;
}
const update = (memory) => call(memory, lbl("boss_update"));
function shoot(memory, column) {
  shootAt(memory, column);
  update(memory);
}
// The frames a flash shows: as built, read off the band (the first test pins it).
function flashFrames(memory, module) {
  let frames = 0;
  while (cellsOf(memory, module).some((code) => code === BOSS_FLASH_CODE)) { update(memory); frames += 1; }
  return frames;
}
// A visible column whose front module is `index`.
function frontColumn(memory, index) {
  const { left, right } = visibleCells(memory[lbl("boss_shown_pos")]);
  const map = columnMap(memory);
  for (let c = left; c <= right; c += 1) if (map[c] === index) return c;
  return null;
}

test("a hit the module lives through flashes the whole module, no spark; the flash then gives every cell back", () => {
  assert.ok(flashBuilt, "the build has no hit flash");
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const module = region1.modules[plate];
  const before = cellsOf(memory, module);
  const column = frontColumn(memory, plate);
  assert.notEqual(column, null, "plate-d is not the front of a visible column");
  const life = hp(memory, plate);
  shoot(memory, column);
  assert.equal(hp(memory, plate), life - 1, "the hit damaged the plate");
  assert.ok(!band(memory).flat().includes(region1.spark), "a damaging hit the plate lives through showed the spark");
  assert.deepEqual(cellsOf(memory, module), before.map((code) => (code === 0 ? 0 : BOSS_FLASH_CODE)),
    "the plate's non-blank cells do not all show the flash glyph");
  const frames = 1 + flashFrames(memory, module);
  assert.ok(frames >= 2 && frames <= 4, `the flash shows ${frames} frames`);
  assert.deepEqual(cellsOf(memory, module), before, "the flash left a wrong glyph in the plate");
});

test("a kill keeps the spark and shows no flash", () => {
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const module = region1.modules[plate];
  memory[lbl("_boss_hp") + plate] = 1;
  const column = frontColumn(memory, plate);
  shoot(memory, column);
  assert.equal(hp(memory, plate), 0);
  assert.equal(cell(memory, column, module.row + module.height - 1), region1.spark, "the kill's spark");
  assert.ok(!cellsOf(memory, module).includes(BOSS_FLASH_CODE), "the kill flashed the plate");
});

test("a stage change flashes the new stage's look and gives it back", () => {
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const module = region1.modules[plate];
  memory[lbl("_boss_hp") + plate] = memory[lbl("_boss_crack") + plate] + 1;
  const intact = cellsOf(memory, module);
  shoot(memory, frontColumn(memory, plate));
  for (let frame = 0; frame < 8; frame += 1) update(memory);
  const cracked = intact.map((code) => (code === 0 ? 0 : code + region1.stageStep));
  assert.deepEqual(cellsOf(memory, module), cracked, "the plate is not shown cracked after the flash");
});

// The A/B proof: the build as it is, and the same machine with its flash step
// patched to the plain queue draw.
function withoutFlash(memory) {
  const at = lbl("boss_flash_frame");
  const to = lbl("boss_queue_draw");
  memory.set([0x4c, to & 0xff, to >> 8], at);
  return memory;
}
const GAMEPLAY = ["_boss_hp", "_boss_stage", "_boss_exposed_lo", "_boss_exposed_hi", "_boss_armed_lo",
  "_boss_armed_hi", "_boss_phase", "boss_column_map", "boss_stop_y"];
function gameplay(memory) {
  const bytes = {};
  for (const name of GAMEPLAY) {
    const length = name === "boss_column_map" || name === "boss_stop_y" ? 64 : name === "_boss_hp" ||
      name === "_boss_stage" ? 16 : 1;
    bytes[name] = [...memory.subarray(lbl(name), lbl(name) + length)];
  }
  bytes.score = [memory[main("score_bcd_lo")], memory[main("score_bcd_hi")]];
  bytes.hits = memory[STATS_HITS];
  bytes.health = memory[main("BROAD_PLAYER_HEALTH")];
  bytes.lives = memory[main("PLAYER_LIVES")];
  return bytes;
}

test("the flash changes no gameplay and leaves no glyph: hits, stage changes and kills of a flashing module, " +
  "the drift, the player's death and the defeat, against the same fight with no flash", () => {
  const a = fortress(32);
  const b = withoutFlash(fortress(32));
  const both = (step) => { step(a); step(b); };
  // Every frame the gameplay bytes are equal, and a band cell may differ only
  // inside a module's cells (the flash, or a queued look a frame later: the
  // flash's draw takes the frame's one module draw); hull, sky and shots never.
  const footprint = new Set(region1.modules.flatMap((m) => [...Array(m.width * m.height).keys()].map((i) =>
    (m.row + Math.floor(i / m.width)) * 64 + m.x + (i % m.width))));
  let flashed = 0;
  const compare = (what) => {
    assert.deepEqual(gameplay(a), gameplay(b), `${what}: the flash changed a gameplay byte`);
    const bandA = band(a).flat(), bandB = band(b).flat();
    if (bandA.includes(BOSS_FLASH_CODE)) flashed += 1;
    bandA.forEach((code, i) => {
      if (code !== bandB[i]) {
        assert.ok(footprint.has(i), `${what}: band cell (${i % 64}, ${i >> 6}) is ${code}, not ${bandB[i]}, ` +
          "outside every module");
      }
    });
  };
  const settle = (what) => {
    for (let frame = 0; frame < 10; frame += 1) { both(update); compare(what); }
    assert.deepEqual(band(a), band(b), `${what}: the band differs once both settled (a glyph left behind)`);
  };
  const fire = (index, frames = 1) => {
    for (let n = 0; n < frames; n += 1) {
      let column = frontColumn(a, index);
      if (column === null) {
        const module = region1.modules[index];
        both((m) => placeBand(m, Math.max(0, Math.min(63, (module.x - 20) * 4))));
        column = frontColumn(a, index);
      }
      if (column === null || hp(a, index) === 0) return;
      both((m) => shoot(m, column));
      compare(`a hit on ${region1.modules[index].name}`);
    }
  };
  // Rapid hits on one plate, through its stage changes, while it flashes.
  fire(byName.get("plate-d"), 12);
  // Alternating plates: a flash asked while another shows.
  for (let n = 0; n < 6; n += 1) { fire(byName.get("plate-e")); fire(byName.get("plate-g")); }
  settle("alternating plates");
  // A kill on a flashing module.
  const plateE = byName.get("plate-e");
  both((m) => { m[lbl("_boss_hp") + plateE] = 2; });
  fire(plateE);
  fire(plateE);
  assert.equal(hp(a, plateE), 0, "plate-e did not die");
  settle("a kill on a flashing plate");
  // The band's drift while a module flashes.
  const plateG = byName.get("plate-g");
  fire(plateG);
  for (let frame = 0; frame < 6; frame += 1) {
    both((m) => { call(m, lbl("boss_motion")); update(m); });
    compare("the drift");
  }
  settle("the drift");
  // The player's death while a module flashes.
  fire(plateG);
  both((m) => { m[main("BROAD_DAMAGE_COOLDOWN")] = 0; call(m, main("apply_player_damage"), { a: 10 }); });
  compare("the player's death");
  settle("the player's death");
  // The defeat: every weapon down; the chain blasts every module, armour
  // included, whatever flashed last.
  for (const [name, index] of byName) {
    if (region1.modules[index].kind === "armour" || hp(a, index) === 0) continue;
    for (let guard = 0; guard < 60 && hp(a, index) > 0; guard += 1) {
      const covered = columnMap(a).indexOf(index) < 0;
      if (covered) {
        const front = region1.modules.findIndex((m, i) => hp(a, i) > 0 && i !== index &&
          m.x <= region1.modules[index].x + 1 && m.x + m.width > region1.modules[index].x + 1);
        if (front >= 0) fire(front); else break;
      } else fire(index);
    }
    assert.equal(hp(a, index), 0, `${name} did not die`);
  }
  assert.notEqual(a[lbl("_boss_phase")], 0, "the boss was not defeated");
  for (let frame = 0; frame < 120; frame += 1) { both(update); compare("the chain"); }
  assert.deepEqual(band(a), band(b), "the chain: the band differs (a glyph left behind)");
  assert.ok(flashed >= 20, `the fight as built showed the flash on ${flashed} frames only`);
});
