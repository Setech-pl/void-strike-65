// M5b-S4b.4 final (owner answers of 2026-10-07): the shipped emitter and the
// first shot on exposure (docs/plans/boss-lasers.md §17).
//
// Decision 1: region 1's emitter (and the fixtures') is design 1, the
// projector tower, from assets/graphics/boss-regions/region-1/emitter.png:
// three cells by three at columns 31-33, rows 1-3, the lens in the bottom
// row's centre cell. Only the lens has damage stages - its own cracked and
// dark looks; the rest of the tower keeps its look until destroyed (decision
// L). Its warning heats the lens with its own two glyphs (E2).
// Decision 4: when an emitter's shield is destroyed, its laser starts its
// warning on the next frame instead of waiting for its reload, at the front of
// the two-laser queue (both places busy: the first that frees); then the
// normal reload. Decision 5: the emitter's durability x 2 on every difficulty.
//
// The 6502 harness on the default build's linked images.
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import { call, installRegion, label, nmi, placeBand, root, runBossEntry } from "./boss-harness.mjs";

const { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const draftOf = () => loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draftOf());
const LASERS = 4, OFF = 0, WARN = 1, BEAM = 2;
const RELOAD = [300, 225, 150];
const WARNING = [40, 32, 25];
const emitterOf = (region) => region.modules.findIndex((m) => m.kind === "emitter" && m.name === "emitter");
const indexOf = (region, name) => region.modules.findIndex((m) => m.name === name);

let entry = null;
function entered() {
  if (entry === null) entry = runBossEntry();
  return Uint8Array.from(entry.memory);
}
function install(region, { level = 1, difficulty = 1, p = 32 } = {}) {
  const memory = entered();
  installRegion(memory, region, { level, difficulty });
  placeBand(memory, p);
  return memory;
}
const state = (memory, i) => memory[lbl("boss_laser_state") + i];
const laserOf = (memory, module) => [0, 1, 2, 3].find((i) => memory[lbl("boss_laser_module") + i] === module);
// One boss frame, the player alive and away from every beam.
function frame(memory) {
  memory[main("PLAYER_LIFECYCLE")] = 0;
  memory[main("PLAYER_LIFECYCLE") + 1] = 3;
  memory[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  memory[main("player_x")] = 0;
  memory[main("loader_dli_phase")] = 0;
  nmi(memory, lbl("boss_dli"));
  call(memory, lbl("boss_update"));
  call(memory, lbl("boss_motion"));
  nmi(memory, lbl("boss_dli"));
  nmi(memory, lbl("boss_dli"));
}
// A player shot into a band column, as the D1 test aims one.
function shoot(memory, column) {
  memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 1;
  memory[main("FIGHTER_PROJECTILE_X")] = column * 4 + 32 - memory[lbl("boss_shown_pos")] + 1;
  memory[main("FIGHTER_PROJECTILE_Y")] = 80;
}
// The module's last hit point, then a shot into its column: the frame (from
// now) on which its hit points reach 0.
function destroy(memory, region, name, { limit = 60 } = {}) {
  const n = indexOf(region, name);
  memory[lbl("_boss_hp") + n] = 1;
  shoot(memory, region.modules[n].x + 1);
  for (let f = 1; f <= limit; f += 1) {
    frame(memory);
    if (memory[lbl("_boss_hp") + n] === 0) return f;
  }
  throw new Error(`${name} was not destroyed within ${limit} frames`);
}
const cellAddress = (c, r) => (r < 6 ? 0xa880 + r * 64 + c : 0xac80 + (r - 6) * 64 + c);
const cells = (memory, m) => {
  const out = [];
  for (let r = m.row; r < m.row + m.height; r += 1) {
    for (let c = m.x; c < m.x + m.width; c += 1) out.push(memory[cellAddress(c, r)]);
  }
  return out;
};

for (const difficulty of [0, 1, 2]) {
  const name = ["EASY", "MEDIUM", "HARD"][difficulty];
  test(`decision 4 (${name}): the emitter warns on the frame after its shield falls, then reloads normally`, () => {
    const memory = install(region1, { difficulty });
    const emitter = emitterOf(region1);
    const laser = laserOf(memory, emitter);
    assert.notEqual(laser, undefined, "region 1's emitter has a laser");
    const killed = destroy(memory, region1, "plate-d");
    assert.equal(state(memory, laser), OFF, "not on the frame the shield falls");
    frame(memory);
    assert.equal(state(memory, laser), WARN, `the warning starts on the next frame (shield down on ${killed})`);
    assert.equal(memory[lbl("boss_laser_timer") + laser], WARNING[difficulty] - 1, "the difficulty's warning length");
    // The warning, the beam, then the normal reload before the next warning.
    let f = 0;
    while (state(memory, laser) !== OFF) { frame(memory); f += 1; assert.ok(f < 400, "the laser ends"); }
    let wait = 0;
    while (state(memory, laser) === OFF) { frame(memory); wait += 1; assert.ok(wait < 1000, "it fires again"); }
    assert.ok(Math.abs(wait - RELOAD[difficulty]) <= 2, `the next warning after the reload: ${wait} frames`);
  });
}

// The tier-4 fixture with slot 1's emitter shielded again: plate-d, narrowed
// to columns 30-33, stands in front of it and no other emitter, so slots 2-4
// fire on their cadence while slot 1 waits for its shield to fall.
function shieldedFixture() {
  const base = draftOf();
  const draft = assets.bossLaserFixtureDraft(base, 4);
  const plateD = base.layout.modules.find((m) => m.name === "plate-d");
  const shield = { ...plateD, width: 4 };
  delete shield._;
  const images = {};
  for (const [name, image] of Object.entries(draft.images)) {
    const indices = Uint8Array.from(image.indices);
    if (name !== "extras") {
      const from = base.images[name];
      for (let y = shield.row * 8; y < (shield.row + shield.height) * 8; y += 1) {
        const at = y * image.width + shield.x * 4;
        indices.set(from.indices.subarray(at, at + shield.width * 4), at);
      }
    }
    images[name] = { ...image, indices };
  }
  return compileBossRegion({ ...draft, images,
    layout: { ...draft.layout, modules: [...draft.layout.modules, shield] } });
}

test("decision 4: with both places busy, the exposed emitter takes the first that frees, ahead of a waiting one", () => {
  const region = shieldedFixture();
  const memory = install(region, { level: 9, difficulty: 1 });
  const slot1 = laserOf(memory, emitterOf(region));
  assert.equal(memory[lbl("_boss_exposed_lo") + (emitterOf(region) >> 3)] >> (emitterOf(region) & 7) & 1, 0,
    "slot 1's emitter starts shielded");
  // Run until two lasers are on and a third (not slot 1) waits, ready.
  let f = 0;
  const on = () => [0, 1, 2, 3].filter((i) => [WARN, BEAM].includes(state(memory, i)));
  const waiting = () => [0, 1, 2, 3].filter((i) => i !== slot1 && state(memory, i) === OFF &&
    memory[lbl("boss_laser_ready") + i] !== 0);
  while (!(on().length === 2 && waiting().length >= 1)) {
    frame(memory);
    f += 1;
    assert.ok(f < 3000, "two lasers on and a third waiting");
  }
  destroy(memory, region, "plate-d");
  assert.equal(on().length, 2, "both places still busy when the shield falls");
  const rival = waiting()[0];
  // The first start after a place frees is slot 1's.
  let started = null;
  for (let k = 0; k < 600 && started === null; k += 1) {
    const before = [0, 1, 2, 3].map((i) => state(memory, i));
    frame(memory);
    started = [0, 1, 2, 3].find((i) => before[i] === OFF && state(memory, i) === WARN) ?? null;
  }
  assert.equal(started, slot1, `the exposed emitter goes first (laser ${slot1}), not the waiting laser ${rival}`);
});

test("decision 5: the emitter's durability is twice S4b's on every difficulty", () => {
  const emitter = emitterOf(region1);
  assert.equal(region1.modules[emitter].hp, 20, "10 x 2 in region 1's data");
  // boss_def's per-difficulty scale (x 3/4, x 1, x 5/4 in quarters of the
  // base): S4b's 10 gave 8 / 10 / 12; 20 gives 15 / 20 / 25.
  const scaled = [15, 20, 25];
  for (const difficulty of [0, 1, 2]) {
    const memory = install(region1, { difficulty });
    assert.equal(memory[lbl("_boss_hp") + emitter], scaled[difficulty], ["EASY", "MEDIUM", "HARD"][difficulty]);
  }
});

test("decision 1: the projector tower - three by three at columns 31-33, rows 1-3, the beam centred on the lens", () => {
  const emitter = region1.modules[emitterOf(region1)];
  assert.deepEqual([emitter.x, emitter.row, emitter.width, emitter.height, emitter.cavityRows], [31, 1, 3, 3, 3]);
  const memory = install(region1, { difficulty: 1 });
  const laser = laserOf(memory, emitterOf(region1));
  const lens = emitter.x + (emitter.width >> 1);
  assert.equal(memory[lbl("boss_laser_centre") + laser], lens * 4 + 2, "the beam's centre colour clock is the lens cell's centre");
});

test("decision 1: only the lens has damage stages - its own cracked and dark looks; the tower keeps its look", () => {
  const n = emitterOf(region1);
  const m = region1.modules[n];
  const lensIndex = (m.height - 1) * m.width + (m.width >> 1);
  const memory = install(region1, { difficulty: 1 });
  destroy(memory, region1, "plate-d");
  const intact = cells(memory, m);
  const K = region1.stageStep;
  // Two hits that cross the crack, then the break threshold, in a tower
  // column beside the lens (the beam absorbs shots in the lens's column).
  for (const [threshold, stage] of [[lbl("_boss_crack"), 1], [lbl("_boss_break"), 2]]) {
    memory[lbl("_boss_hp") + n] = memory[threshold + n] + 1;
    shoot(memory, m.x);
    for (let f = 0; f < 12; f += 1) frame(memory);
    const now = cells(memory, m);
    now.forEach((code, i) => {
      if (i === lensIndex) assert.equal(code, intact[i] + stage * K, `the lens at stage ${stage}`);
      else assert.equal(code, intact[i], `tower cell ${i} unchanged at stage ${stage}`);
    });
  }
  // The lens's stage glyphs are the emitter's own, none of the plates' looks.
  const glyph = (code) => [...region1.glyphs.subarray((code & 0x7f) * 8, (code & 0x7f) * 8 + 8)].join();
  const plateLooks = new Set();
  for (const plate of region1.modules.filter((x) => x.kind === "armour")) {
    for (let r = plate.row; r < plate.row + plate.height; r += 1) {
      for (let c = plate.x; c < plate.x + plate.width; c += 1) {
        for (const stage of [1, 2]) plateLooks.add(glyph(region1.bandRows[r][c] + stage * K));
      }
    }
  }
  const lensCode = region1.bandRows[m.row + m.height - 1][m.x + (m.width >> 1)];
  for (const stage of [1, 2]) {
    assert.ok(!plateLooks.has(glyph(lensCode + stage * K)), `the lens's stage ${stage} is its own`);
    assert.notEqual(glyph(lensCode + stage * K), glyph(lensCode), `stage ${stage} differs from intact`);
  }
});

test("E2: the warning heats the lens with the emitter's own glyphs, never the spark or the muzzle flash", () => {
  assert.notEqual(region1.heat[0], region1.spark);
  assert.notEqual(region1.heat[1], region1.muzzle);
  const memory = install(region1, { difficulty: 1 });
  const m = region1.modules[emitterOf(region1)];
  const laser = laserOf(memory, emitterOf(region1));
  destroy(memory, region1, "plate-d");
  const lens = cellAddress(m.x + (m.width >> 1), m.row + m.height - 1);
  const seen = new Set();
  for (let f = 0; f < 60; f += 1) {
    frame(memory);
    if (state(memory, laser) === WARN) seen.add(memory[lens]);
  }
  assert.ok(seen.size >= 2, "the lens changes during the warning");
  for (const code of seen) {
    assert.ok(![region1.spark, region1.muzzle, region1.deflect].includes(code), `heat code ${code} is a hit's glyph`);
  }
  assert.ok([...seen].some((code) => code === region1.heat[0] || code === region1.heat[1]),
    "the heat glyphs show");
  assert.equal(region1.tables[BOSS_TABLE.laserHeatA], region1.heat[0]);
});
