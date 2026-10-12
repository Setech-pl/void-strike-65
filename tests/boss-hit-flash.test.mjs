// fix/boss-polish (owner request 2026-10-12, docs/plans/boss-polish.md §9-§10):
// a damaging hit that a boss module lives through no longer shows the spark,
// which read as a small explosion. The owner's choice b3 (2026-10-12): bit 7 of
// the module's non-blank cells toggled for BOSS_MFLASH_FRAMES (3) frames - its
// colour-3 pixels show COLPF3's colour instead of COLPF2's - then toggled back;
// no colour register is written. A kill keeps the spark (the destruction's
// look is unchanged).
//
// The flash is presentation only. The proof (A/B): the same entered machine
// runs the same fight twice, once as built and once with the flash patched out
// (its frame step is the plain queue draw); every gameplay byte - hit points,
// stages, the column map and stop lines, exposure, score, hits, the
// controller's phase - is equal after every frame, and the band is equal once
// both have settled: through stage changes and kills of a flashing module, the
// band's drift, the defeat's chain and the player's death.
//
// Runs on the 6502 harness over the default build's images (or a review
// variant's: VS65_HARNESS_BUILD, tests/boss-harness.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { bossBandRowAddress, bossRegionDirectory, compileBossRegion, loadBossRegionDraft }
  from "../scripts/boss-assets.mjs";
import {
  call, label, mainAddress, placeBand, root, runBossEntry, shootAt, visibleCells,
} from "./boss-harness.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const byName = new Map(region1.modules.map((module, index) => [module.name, index]));
const lbl = (name) => label("boss", name);
const main = (name) => mainAddress(name);
const FLASH_FRAMES = Number(/^BOSS_MFLASH_FRAMES\s*=\s*(\d+)/m.exec(
  fs.readFileSync(path.join(root, "src", "hybrid", "boss.s"), "utf8"))?.[1]);
const STATS_HITS = 0xae;
const cell = (memory, column, row) => memory[bossBandRowAddress(row) + column];
const band = (memory) => Array.from({ length: 8 }, (_, row) =>
  [...memory.subarray(bossBandRowAddress(row), bossBandRowAddress(row) + 64)]);
const cellsOf = (memory, module) => [...Array(module.width * module.height).keys()].map((i) =>
  cell(memory, module.x + (i % module.width), module.row + Math.floor(i / module.width)));
const hp = (memory, index) => memory[lbl("_boss_hp") + index];
const columnMap = (memory) => [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
const toggled = (code) => ((code & 0x7f) === 0 ? code : code ^ 0x80);

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
// A visible column whose front module is `index`.
function frontColumn(memory, index) {
  const { left, right } = visibleCells(memory[lbl("boss_shown_pos")]);
  const map = columnMap(memory);
  for (let c = left; c <= right; c += 1) if (map[c] === index) return c;
  return null;
}
// What a hit the module lives through shows, frame by frame, until the module
// is as it was: the hit's frame first.
function feedback(memory, name) {
  const index = byName.get(name);
  const module = region1.modules[index];
  const before = cellsOf(memory, module);
  const column = frontColumn(memory, index);
  assert.notEqual(column, null, `${name} is not the front of a visible column`);
  const life = hp(memory, index);
  shoot(memory, column);
  assert.equal(hp(memory, index), life - 1, `the hit damaged ${name}`);
  const frames = [cellsOf(memory, module)];
  for (let frame = 0; frame < 10; frame += 1) { update(memory); frames.push(cellsOf(memory, module)); }
  const struck = (module.height - 1) * module.width + (column - module.x);
  return { before, frames, struck };
}
const shown = (frames, before) => frames.findIndex((cells) => cells.join() === before.join());

for (const name of ["plate-d", "gun-2"]) {
  test(`a hit ${name} lives through: no spark, the whole module flashes 3 frames, then every cell exactly as before`, () => {
    const memory = fortress(32);
    const { before, frames, struck } = feedback(memory, name);
    assert.ok(!frames.flat().includes(region1.spark), "a damaging hit the module lives through showed the spark");
    assert.equal(FLASH_FRAMES, 3, "the owner's b3: three frames");
    assert.deepEqual(frames[0], before.map(toggled), "the module's non-blank cells are not all toggled");
    const back = shown(frames, before);
    assert.equal(back, FLASH_FRAMES, `the flash shows ${back} frames`);
    assert.ok(frames.slice(back).every((cells) => cells.join() === before.join()), "the module changed again");
  });
}

test("a module whose cells already have bit 7 set comes back exactly after the flash's two toggles", () => {
  const memory = fortress(32);
  const gun = region1.modules.findIndex((m) => m.kind === "pulse" &&
    cellsOf(memory, m).some((code) => code & 0x80) && cellsOf(memory, m).some((code) => code && !(code & 0x80)));
  assert.ok(gun >= 0, "no module has cells both with and without bit 7");
  const module = region1.modules[gun];
  const before = cellsOf(memory, module);
  memory[lbl("boss_mflash_m")] = gun;
  call(memory, lbl("boss_mflash_toggle"));
  assert.deepEqual(cellsOf(memory, module), before.map(toggled), `${module.name} not toggled`);
  call(memory, lbl("boss_mflash_toggle"));
  assert.deepEqual(cellsOf(memory, module), before, `${module.name} did not come back exactly`);
});

test("a kill keeps the spark and toggles nothing", () => {
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const module = region1.modules[plate];
  const before = cellsOf(memory, module);
  memory[lbl("_boss_hp") + plate] = 1;
  const column = frontColumn(memory, plate);
  shoot(memory, column);
  assert.equal(hp(memory, plate), 0);
  assert.equal(cell(memory, column, module.row + module.height - 1), region1.spark, "the kill's spark");
  const cells = cellsOf(memory, module);
  cells.forEach((code, i) => {
    if (code !== region1.spark) assert.equal(code, before[i], "the kill toggled a cell of the plate");
  });
});

test("a stage change ends showing the new stage's look", () => {
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const module = region1.modules[plate];
  memory[lbl("_boss_hp") + plate] = memory[lbl("_boss_crack") + plate] + 1;
  const intact = cellsOf(memory, module);
  shoot(memory, frontColumn(memory, plate));
  for (let frame = 0; frame < 10; frame += 1) update(memory);
  const cracked = intact.map((code) => (code === 0 ? 0 : code + region1.stageStep));
  assert.deepEqual(cellsOf(memory, module), cracked, "the plate is not shown cracked after the feedback");
});

// The A/B proof: the build as it is, and the same machine with its flash
// patched out (the flash's frame step is the plain queue draw).
function withoutFeedback(memory) {
  const to = lbl("boss_queue_draw");
  memory.set([0x4c, to & 0xff, to >> 8], lbl("boss_mflash_frame"));
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
  const b = withoutFeedback(fortress(32));
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
    if (bandA.join() !== bandB.join()) flashed += 1;
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
