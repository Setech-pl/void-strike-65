// M5b fortress session (feat/boss-fortress-r1) — region 1 as the layered
// fortress Blockade Breaker, and the fight's feedback and fire, on the 6502
// harness (docs/plans/m5-loading-boss.md §5.15; owner decisions H-K and the
// answers of §5.15.6; §5.13.2 items 5, 6, 9).
//
// Everything runs on the default build's linked images: the window's boss
// entry against a drive answering from the built ATR, then the overlay's own
// UPDATE and DLI called the way the main loop and ANTIC reach them. The band
// is held still (placeBand) so a shot's band column is exact; the fixture
// region with a salvo launcher is installed over the entry the way the head
// and the install would install it (tests/boss-fixtures.mjs).
import assert from "node:assert/strict";
import test from "node:test";

import {
  BOSS_BAND_COLUMNS, BOSS_COLUMN_ARMOUR, BOSS_COLUMN_OPEN, BOSS_KIND, BOSS_TABLE, BossDraftError,
  bossBandRowAddress, bossRegionDirectory, compileBossRegion, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import {
  call, cpuOver, Drive, installRegion, label, nmi, placeBand, root, runBossEntry, runUntil,
  shootAt, visibleCells,
} from "./boss-harness.mjs";
import { fixtureDraft, fixtureLayout, layeredDraft } from "./boss-fixtures.mjs";

const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const byName = new Map(region1.modules.map((module, index) => [module.name, index]));
const STATS_HITS = 0xae;
const AUDF2 = 0xd202, AUDC2 = 0xd203, AUDF3 = 0xd204, AUDC3 = 0xd205;
const COLPF = [0xd016, 0xd017, 0xd018, 0xd019];
const BED = [0x68, 0x22];
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const hp = (memory, index) => memory[lbl("_boss_hp") + index];
const mask16 = (memory, name) => memory[lbl(`${name}_lo`)] | (memory[lbl(`${name}_hi`)] << 8);
const columnMap = (memory) => [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)];
const cell = (memory, column, row) => memory[bossBandRowAddress(row) + column];
const centre = (module) => module.x + (module.width >> 1);
const HOSTILE_FIRST = 5, HOSTILE_COUNT = 5;

let entry = null;
function bossEntered() {
  if (entry === null) entry = runBossEntry();
  return Uint8Array.from(entry.memory);
}

// Region 1 as entered (level 1, MEDIUM), the band held at position p.
function fortress(p = 32, options = {}) {
  const memory = bossEntered();
  if (options.level !== undefined || options.difficulty !== undefined) installRegion(memory, region1, options);
  placeBand(memory, p);
  return memory;
}

// One frame of the overlay's own work: UPDATE, with every write recorded.
function update(memory) {
  const writes = [];
  const hooks = { write: (address, value) => { writes.push([address, value]); return undefined; } };
  const cpu = call(memory, lbl("boss_update"), { hooks });
  return { writes, cycles: cpu.cycles };
}
const writesTo = (writes, address) => writes.filter(([a]) => a === address).map(([, v]) => v);

// The band DLI's three phases: the COLPF values phase 0 writes under the HUD.
function bandPalette(memory) {
  memory[main("loader_dli_phase")] = 0;
  const writes = [];
  const hooks = { write: (address, value) => { writes.push([address, value]); return undefined; } };
  nmi(memory, lbl("boss_dli"), { hooks });
  nmi(memory, lbl("boss_dli"));
  nmi(memory, lbl("boss_dli"));
  return COLPF.map((register) => writesTo(writes, register)[0]);
}

// Drain the draw queue: frames with no shots until the band stops changing.
function settle(memory, frames = 8) {
  for (let frame = 0; frame < frames; frame += 1) update(memory);
}

// One shot at band column `column` and the frame it lands on.
function shoot(memory, column) {
  shootAt(memory, column);
  const hits = memory[STATS_HITS];
  const result = update(memory);
  return { ...result, counted: memory[STATS_HITS] - hits };
}

// Kills module `name` through a visible column where it is the front module,
// then lets the draw queue and the deferred exposure finish.
function kill(memory, region, name, index = region.modules.findIndex((m) => m.name === name)) {
  const module = region.modules[index];
  for (let guard = 0; guard < 400 && hp(memory, index) > 0; guard += 1) {
    const p = memory[lbl("boss_shown_pos")];
    const { left, right } = visibleCells(p);
    const map = columnMap(memory);
    let column = [...Array(module.width).keys()].map((i) => module.x + i)
      .find((c) => map[c] === index && c >= left && c <= right);
    if (column === undefined) {
      placeBand(memory, Math.max(0, Math.min(63, (module.x - 20) * 4)));
      continue;
    }
    shoot(memory, column);
  }
  assert.equal(hp(memory, index), 0, `${module.name} did not die`);
  settle(memory);
}

// The lowest non-blank cell of a band column (where a hull hit sparks).
function lowestHullRow(memory, column) {
  for (let row = 7; row >= 0; row -= 1) if (cell(memory, column, row) !== 0) return row;
  return 7;
}

const clearHostile = (memory) => memory.fill(0, main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST,
  main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST + HOSTILE_COUNT);
// New hostile shots this frame: { slot, active, x, y, lifetime, column }.
function newShots(memory, before) {
  const shots = [];
  for (let slot = HOSTILE_FIRST; slot < HOSTILE_FIRST + HOSTILE_COUNT; slot += 1) {
    const active = memory[main("FIGHTER_PROJECTILE_ACTIVE") + slot];
    if (active !== 0 && before[slot - HOSTILE_FIRST] === 0) {
      const x = memory[main("FIGHTER_PROJECTILE_X") + slot];
      const p = memory[lbl("boss_shown_pos")];
      shots.push({ slot, active, x, y: memory[main("FIGHTER_PROJECTILE_Y") + slot],
        lifetime: memory[main("FIGHTER_PROJECTILE_LIFETIME") + slot], column: (x - 32 + p) >> 2 });
    }
  }
  return shots;
}
const hostileActive = (memory) => [...memory.subarray(main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST,
  main("FIGHTER_PROJECTILE_ACTIVE") + HOSTILE_FIRST + HOSTILE_COUNT)];

// Runs `frames` frames of UPDATE with no player shot, collecting the boss's
// shots (the pool emptied after each frame so it never fills).
function fireFrames(memory, frames, { onFrame = null } = {}) {
  const shots = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const before = hostileActive(memory);
    const { writes } = update(memory);
    const fresh = newShots(memory, before);
    for (const shot of fresh) shots.push({ ...shot, frame, writes });
    onFrame?.(frame, fresh);
    clearHostile(memory);
  }
  return shots;
}

// ---------------------------------------------------------------------------
// The layout (decision H, §5.15.1) and the converter's limits (§5.15.6 item 2)
// ---------------------------------------------------------------------------

test("region 1 is the fortress: plates are the hull's face, cannons recessed behind them, one in an open bay", () => {
  assert.equal(region1.style, 1);
  assert.ok(region1.modules.length <= 16 && region1.modules.length >= 12);
  const kinds = region1.modules.map((module) => module.kind);
  assert.equal(kinds.filter((kind) => kind === "pulse").length, 4);
  assert.equal(kinds.filter((kind) => kind === "emitter").length, 1);
  assert.ok(kinds.filter((kind) => kind === "armour").length >= 8);
  // The front armour covers the hull's columns: at least 45 of the hull's
  // columns have a module (S4a-i: 15 of 43).
  const hullColumns = [...Array(BOSS_BAND_COLUMNS).keys()].filter((c) =>
    region1.bandRows.some((row) => row[c] !== 0));
  const moduleColumns = hullColumns.filter((c) => region1.modules.some((m) => c >= m.x && c < m.x + m.width));
  assert.ok(moduleColumns.length >= 45, `${moduleColumns.length} of ${hullColumns.length} hull columns`);
  // Plates up to 6 x 4 (the owner's option A).
  assert.ok(region1.modules.some((m) => m.width * m.height > 8), "no plate is larger than the old 4 x 2");
  for (const m of region1.modules) assert.ok(m.width <= 6 && m.height <= 4 && m.width * m.height <= 24);
  // Every cannon but the open bay's is covered by armour in front of it.
  for (const m of region1.modules.filter((module) => module.kind === "pulse")) {
    const cover = region1.modules.filter((_, j) => m.cover & (1 << j));
    if (m.name === "gun-2") {
      assert.equal(m.cover, 0, "gun-2 sits in the open bay");
    } else {
      assert.ok(cover.length > 0 && cover.every((c) => c.kind === "armour"), `${m.name} is behind armour`);
    }
  }
  assert.equal(region1.modules[byName.get("gun-3")].cover,
    (1 << byName.get("plate-e")) | (1 << byName.get("plate-f")), "gun-3 is shielded by two plates");
  // Every weapon inside the director-complete bot's reach (§5.15.6 item 5).
  for (const m of region1.modules.filter((module) => module.kind !== "armour")) {
    assert.ok(m.x >= 20 && m.x + m.width <= 47, `${m.name} at ${m.x}`);
  }
});

test("the converter takes plates up to 6 x 4 and refuses larger; the band flash must stay inside each hue", () => {
  const gun = { name: "gun", kind: "pulse", x: 30, row: 6, width: 3, height: 2, hp: 4, score: 1, reload: 20 };
  const plate = (width, height) => ({ name: "plate", kind: "armour", x: 20, row: 8 - height, width, height, hp: 4, score: 1 });
  const ok = compileBossRegion(fixtureDraft(fixtureLayout([plate(6, 4), gun])));
  assert.equal(ok.modules.find((m) => m.name === "plate").width * ok.modules.find((m) => m.name === "plate").height, 24);
  const refused = (layout, pattern) => assert.throws(() => compileBossRegion(fixtureDraft(layout)),
    (error) => error instanceof BossDraftError && pattern.test(error.message));
  refused(fixtureLayout([plate(7, 2), gun]), /width/);
  refused(fixtureLayout([plate(4, 5), gun]), /height/);
  refused(fixtureLayout([plate(2, 2), gun], {
    palette: { colpf0: 12, colpf1: 6, colpf2: 42, colpf3: 50, flashLuma: 4 } }), /flash/);
});

// RE-POINTED (owner decision L, 2026-10-05): the hole frame's five rim glyphs
// are gone; a destroyed module leaves background below the hull and the
// cavity code inside it.
test("the extras carry the spark, the deflection, the muzzle flash and the cavity; no rim glyph", () => {
  assert.equal(region1.hole, undefined, "the hole frame's rim glyphs are gone (decision L)");
  assert.equal(BOSS_TABLE.hole, undefined);
  assert.equal(BOSS_TABLE.bay, undefined);
  assert.ok(Number.isInteger(region1.cavity), "the region names its cavity code");
  assert.equal(region1.tables[BOSS_TABLE.cavity], region1.cavity);
  for (const code of [region1.spark, region1.deflect, region1.muzzle]) {
    assert.ok((code & 0x7f) >= region1.plainBase && (code & 0x7f) < region1.nozzleBase, `code ${code} is a plain glyph`);
  }
  assert.ok(region1.cavity === 0 || ((region1.cavity & 0x7f) >= region1.plainBase &&
    (region1.cavity & 0x7f) < region1.nozzleBase), "the cavity is the blank code or a plain glyph");
  assert.equal(new Set([region1.spark, region1.deflect, region1.muzzle]).size, 3);
  assert.equal(region1.tables[BOSS_TABLE.spark], region1.spark);
  assert.equal(region1.tables[BOSS_TABLE.deflect], region1.deflect);
  assert.equal(region1.tables[BOSS_TABLE.muzzle], region1.muzzle);
  assert.ok(region1.codeCount <= 128);
});

// ---------------------------------------------------------------------------
// The emitter capped until S4b; covers; the defeat (decisions A, H; §5.15.6 item 6)
// ---------------------------------------------------------------------------

test("the emitter slot is capped armour on every level until the lasers exist (S4b)", () => {
  for (const level of [1, 4, 5, 9]) {
    const memory = fortress(32, { level });
    const index = byName.get("emitter");
    assert.equal(memory[lbl("_boss_kind") + index], BOSS_KIND.armour, `level ${level}`);
    assert.equal(hp(memory, index), region1.capped.hp);
    assert.equal(memory[lbl("_boss_weapons_left")], 4, `level ${level}: the four cannons`);
  }
});

test("a covered cannon cannot fire and absorbs without damage; it opens fire once its cover falls", () => {
  const memory = fortress(32);
  const g3 = byName.get("gun-3");
  const gun3 = region1.modules[g3];
  kill(memory, region1, "plate-f");
  // gun-3's right column is its front now, but plate-e still covers it.
  const column = columnMap(memory).findIndex((value) => value === g3);
  assert.ok(column >= 0, "gun-3 is the front module of the column plate-f left");
  const before = hp(memory, g3);
  const { counted, writes } = shoot(memory, column);
  assert.equal(hp(memory, g3), before, "a covered cannon took damage");
  assert.equal(counted, 0, "an absorbed hit is not a hit for accuracy (Q-B7)");
  assert.equal(cell(memory, column, gun3.row + gun3.height - 1), region1.deflect, "the absorb shows the deflection");
  assert.ok(writesTo(writes, AUDC3).length > 0, "the absorb ticks on channel 3");
  assert.equal(mask16(memory, "_boss_armed") & (1 << g3), 0);
  const silent = fireFrames(memory, 600);
  assert.ok(silent.length > 0, "the boss never fired");
  assert.ok(silent.every((shot) => shot.column !== centre(gun3)), "a covered cannon fired");
  kill(memory, region1, "plate-e");
  assert.ok(mask16(memory, "_boss_armed") & (1 << g3), "gun-3 is not armed once its cover fell");
  const open = fireFrames(memory, 600);
  assert.ok(open.some((shot) => shot.column === centre(gun3)), "gun-3 never opened fire");
});

test("the exposure check runs one frame after the kill (§5.15.6 item 2)", () => {
  const memory = fortress(32);
  const g1 = byName.get("gun-1");
  const plate = byName.get("plate-c");
  for (let guard = 0; guard < 200 && hp(memory, plate) > 1; guard += 1) {
    shoot(memory, columnMap(memory).indexOf(plate));
  }
  shoot(memory, columnMap(memory).indexOf(plate));
  assert.equal(hp(memory, plate), 0);
  assert.equal(mask16(memory, "_boss_exposed") & (1 << g1), 0, "exposed on the kill frame itself");
  update(memory);
  assert.ok(mask16(memory, "_boss_exposed") & (1 << g1), "not exposed on the frame after the kill");
  assert.ok(mask16(memory, "_boss_armed") & (1 << g1));
  settle(memory, 4);
  const gun1 = region1.modules[g1];
  const look = region1.openLooks.get(g1);
  assert.deepEqual([...Array(gun1.width * gun1.height).keys()].map((i) =>
    cell(memory, gun1.x + (i % gun1.width), gun1.row + Math.floor(i / gun1.width))), look, "gun-1's open look");
});

test("the defeat: the last cannon's death starts the chain with armour still standing (decision A)", () => {
  const memory = fortress(32);
  for (const name of ["plate-g", "gun-4", "plate-f", "plate-e", "gun-3", "plate-c", "gun-1"]) {
    kill(memory, region1, name);
    assert.equal(memory[lbl("_boss_phase")], 0, `still the fight after ${name}`);
  }
  kill(memory, region1, "gun-2");
  assert.equal(memory[lbl("_boss_phase")], 2, "the chain");
  for (const name of ["cowl-left", "plate-a", "plate-b", "plate-d", "plate-h", "cowl-right", "emitter"]) {
    assert.ok(hp(memory, byName.get(name)) > 0, `${name} stands: armour is not required`);
  }
});

// Owner decision L (supersedes decision J's lit edge): a destroyed module
// disappears - its rows below the hull's silhouette become band background
// (code 0), its rows inside the hull the plain cavity; no rim, no outline.
test("decision L: every plate hangs below the hull, every cannon and the emitter sit inside it", () => {
  for (const m of region1.modules) {
    const expected = m.kind === "armour" ? 0 : m.height;
    assert.equal(m.cavityRows, expected, `${m.name}'s rows inside the hull`);
  }
});

test("decision L: a destroyed module leaves background below the hull and the cavity inside it, nothing else", () => {
  const memory = fortress(32);
  for (const name of ["plate-d", "plate-g", "gun-4"]) {
    kill(memory, region1, name);
    const m = region1.modules[byName.get(name)];
    for (let dy = 0; dy < m.height; dy += 1) {
      for (let dx = 0; dx < m.width; dx += 1) {
        const expected = dy < m.cavityRows ? region1.cavity : 0;
        assert.equal(cell(memory, m.x + dx, m.row + dy), expected, `${name} cell ${dx},${dy}`);
      }
    }
  }
});

// The codes a fight may leave in the band: the drafts' own, every staged
// stage of them, the open looks and their stages, background and the cavity,
// the ring's glyphs, the nozzles - and nothing else (no rim, no frame).
function allowedCodes(region) {
  const allowed = new Set([0, region.cavity, region.spark, region.deflect, region.muzzle,
    region.tables[BOSS_TABLE.nozzleLeftCode], region.tables[BOSS_TABLE.nozzleRightCode]]);
  const stage = (code) => {
    allowed.add(code);
    const glyph = code & 0x7f;
    if (glyph >= 7 && glyph < 7 + region.stageStep) {
      allowed.add(code + region.stageStep);
      allowed.add(code + 2 * region.stageStep);
    }
  };
  region.bandRows.forEach((row) => row.forEach(stage));
  for (const look of region.openLooks.values()) look.forEach(stage);
  stage(region.capped.code);
  return allowed;
}

test("decision L: a fallen plate leaves no rim anywhere, and the cannon it exposed shows whole", () => {
  const memory = fortress(32);
  const g1 = byName.get("gun-1");
  const gun1 = region1.modules[g1];
  const plate = region1.modules[byName.get("plate-c")];
  kill(memory, region1, "plate-c");
  settle(memory);
  const cellsOf = (m) => [...Array(m.width * m.height).keys()].map((i) =>
    cell(memory, m.x + (i % m.width), m.row + Math.floor(i / m.width)));
  assert.deepEqual(cellsOf(gun1), region1.openLooks.get(g1), "gun-1 is not shown whole in its open look");
  assert.ok(cellsOf(plate).every((code) => code === 0 || code === region1.cavity),
    "plate-c left something other than background and the cavity");
  // The whole fight, the band scanned after every kill.
  const allowed = allowedCodes(region1);
  for (const name of ["plate-d", "emitter", "plate-g", "gun-4", "plate-f", "plate-e", "gun-3", "gun-1"]) {
    kill(memory, region1, name);
    settle(memory);
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 64; c += 1) {
        assert.ok(allowed.has(cell(memory, c, r)), `after ${name}: band cell (${c}, ${r}) holds a rim or frame code`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Hit feedback (decision J; §5.13.2 item 5)
// ---------------------------------------------------------------------------

test("a spark in the struck cell under every band position, restored after 2 frames", () => {
  for (const p of [0, 5, 17, 31, 48, 63]) {
    const memory = fortress(p);
    const { left, right } = visibleCells(p);
    const map = columnMap(memory);
    const modules = [];
    let armour = null;
    for (let c = left; c <= right; c += 1) {
      if (map[c] < 16 && (mask16(memory, "_boss_exposed") & (1 << map[c])) &&
        hp(memory, map[c]) > region1.modules[map[c]].thresholds[0] + 1 && !modules.some((x) => x.index === map[c])) {
        modules.push({ index: map[c], column: c });
      }
      if (map[c] === BOSS_COLUMN_ARMOUR && armour === null) armour = c;
    }
    assert.ok(modules.length > 0, `p ${p}: no exposed module on screen`);
    for (const { index, column } of modules) {
      const m = region1.modules[index];
      const row = m.row + m.height - 1;
      const code = cell(memory, column, row);
      shoot(memory, column);
      assert.equal(cell(memory, column, row), region1.spark, `p ${p}: ${m.name} column ${column}`);
      update(memory);
      assert.equal(cell(memory, column, row), region1.spark, `p ${p}: the spark lasts two frames`);
      update(memory);
      assert.equal(cell(memory, column, row), code, `p ${p}: ${m.name} restored`);
    }
    if (armour !== null) {
      const row = lowestHullRow(memory, armour);
      const code = cell(memory, armour, row);
      shoot(memory, armour);
      assert.equal(cell(memory, armour, row), region1.deflect, `p ${p}: the hull hit at column ${armour}`);
      update(memory);
      update(memory);
      assert.equal(cell(memory, armour, row), code, `p ${p}: hull restored`);
    }
  }
});

test("damaging, absorbed and hull hits each read differently; only damaging hits count (Q-B7)", () => {
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const plateColumn = columnMap(memory).indexOf(plate);
  const hullColumn = columnMap(memory).findIndex((value, c) => value === BOSS_COLUMN_ARMOUR &&
    c >= visibleCells(32).left && c <= visibleCells(32).right);
  assert.ok(hullColumn >= 0, "a girder on screen");
  const base = bandPalette(memory);
  // Damaging: spark, the band flash, the damage tick, one hit counted.
  const damaging = shoot(memory, plateColumn);
  assert.equal(damaging.counted, 1);
  const flashed = bandPalette(memory);
  const luma = region1.tables[BOSS_TABLE.flashLuma];
  assert.deepEqual(flashed, base.map((value) => value + luma), "the band flash");
  const damageTone = [writesTo(damaging.writes, AUDF3).at(-1), writesTo(damaging.writes, AUDC3).at(-1)];
  settle(memory, 3);
  // Hull: the deflection, no flash, its own tick, no hit.
  const hull = shoot(memory, hullColumn);
  assert.equal(hull.counted, 0);
  assert.deepEqual(bandPalette(memory), base, "a hull hit flashed the band");
  const hullTone = [writesTo(hull.writes, AUDF3).at(-1), writesTo(hull.writes, AUDC3).at(-1)];
  settle(memory, 3);
  // Absorbed by a covered module: the deflection, no flash, its own tick, no hit.
  kill(memory, region1, "plate-f");
  const g3Column = columnMap(memory).indexOf(byName.get("gun-3"));
  const absorbed = shoot(memory, g3Column);
  assert.equal(absorbed.counted, 0);
  assert.deepEqual(bandPalette(memory), base, "an absorbed hit flashed the band");
  const absorbTone = [writesTo(absorbed.writes, AUDF3).at(-1), writesTo(absorbed.writes, AUDC3).at(-1)];
  for (const tone of [damageTone, hullTone, absorbTone]) {
    assert.ok(tone.every((value) => value !== undefined), "a hit without a tick");
    assert.notDeepEqual(tone, BED);
  }
  assert.equal(new Set([damageTone, hullTone, absorbTone].map((t) => t.join())).size, 3, "three distinct ticks");
});

test("the band flash lasts one frame", () => {
  const memory = fortress(32);
  const base = bandPalette(memory);
  shoot(memory, columnMap(memory).indexOf(byName.get("plate-d")));
  assert.notDeepEqual(bandPalette(memory), base);
  update(memory);
  assert.deepEqual(bandPalette(memory), base, "the flash outlived its frame");
});

test("the hit tick: channel 3 for 2 frames, the engine bed back; the kill on channel 2, the destruction on channel 4", () => {
  const memory = fortress(32);
  const plate = byName.get("plate-d");
  const column = columnMap(memory).indexOf(plate);
  const first = shoot(memory, column);
  assert.ok(writesTo(first.writes, AUDC3).length > 0, "no tick on the hit frame");
  assert.equal(writesTo(first.writes, AUDC2).length, 0, "a plain hit used the kill's channel");
  assert.equal(memory[main("CAPITAL_EXPLOSION_SOUND_TIMER")], 0, "a plain hit used the destruction's channel");
  const second = update(memory);
  assert.ok(!writesTo(second.writes, AUDC3).includes(BED[1]), "the bed came back after one frame");
  const third = update(memory);
  assert.deepEqual([writesTo(third.writes, AUDF3).at(-1), writesTo(third.writes, AUDC3).at(-1)], BED,
    "the engine bed is not back after two frames");
  // Sound off: no write to channel 3 at all.
  memory[main("sound_enabled")] = 0;
  const silent = shoot(memory, column);
  update(memory); update(memory);
  assert.equal(writesTo(silent.writes, AUDC3).length, 0);
  memory[main("sound_enabled")] = 1;
  // The kill: channel 2 (play_hit_sound).
  let killWrites = [];
  for (let guard = 0; guard < 100 && hp(memory, plate) > 0; guard += 1) killWrites = shoot(memory, column).writes;
  assert.equal(hp(memory, plate), 0);
  assert.ok(writesTo(killWrites, AUDC2).length > 0 && memory[main("hit_timer")] > 0, "the kill sound");
});

// ---------------------------------------------------------------------------
// Fire (decision I; §5.13.2 item 6)
// ---------------------------------------------------------------------------

test("pulse fire: from alive, exposed cannons only, at the module's centre column, the band's bottom edge, straight down, with a muzzle flash", () => {
  const memory = fortress(32);
  const cooldown = region1.tables[BOSS_TABLE.fireCooldown];
  let lastFrame = -1000;
  let perFrame = 0;
  const shots = fireFrames(memory, 900, {
    onFrame: (frame, fresh) => {
      perFrame = Math.max(perFrame, fresh.length);
      for (const shot of fresh) {
        const index = region1.modules.findIndex((m) => m.kind === "pulse" && centre(m) === shot.column);
        assert.ok(index >= 0, `frame ${frame}: a shot from column ${shot.column}, no cannon's centre`);
        assert.ok(hp(memory, index) > 0 && (mask16(memory, "_boss_exposed") & (1 << index)),
          `frame ${frame}: ${region1.modules[index].name} fired dead or covered`);
        assert.equal(shot.active, (1 << 3) | 6, "a PULSE shot of the hostile pool (class 1)");
        assert.equal(shot.y, 88, "spawned at the band's bottom edge");
        assert.equal(shot.lifetime, 96);
        assert.equal(shot.x & 1, 0, "the two-pixel core stays inside one cell");
        const m = region1.modules[index];
        assert.equal(cell(memory, centre(m), m.row + m.height - 1), region1.muzzle, "the muzzle flash");
        assert.ok(frame - lastFrame >= cooldown, "two shots closer than the cooldown");
        lastFrame = frame;
      }
    },
  });
  assert.ok(shots.length >= 5, `${shots.length} shots in 900 frames`);
  assert.equal(perFrame, 1, "more than one spawn in a frame");
  assert.equal(shots[0].column, centre(region1.modules[byName.get("gun-2")]), "the open bay's cannon opens fire");
  assert.ok(shots[0].frame < 200, "the boss's first shot is late");
});

// The boss's shots must be able to hurt: the post-hit damage cooldown that
// capital UPDATE (update_broadside, slot A) counts down every frame is counted
// down by the boss's UPDATE in the boss sector. MEASURED in the first trace of
// this session: without it the cooldown froze (MEDIUM entered the boss at 9 and
// the player took no damage for the whole fight).
test("the player's damage cooldown counts down in the boss sector, so boss shots can hurt", () => {
  const memory = fortress(32);
  const cooldown = main("BROAD_DAMAGE_COOLDOWN");
  memory[cooldown] = 9;
  for (let frame = 0; frame < 9; frame += 1) update(memory);
  assert.equal(memory[cooldown], 0, "the cooldown froze in the boss sector");
  update(memory);
  assert.equal(memory[cooldown], 0, "the cooldown went below zero");
});

test("the hostile pool is shared: a full pool drops the boss's shot", () => {
  const memory = fortress(32);
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  memory.fill(0x0e, active + HOSTILE_FIRST, active + HOSTILE_FIRST + HOSTILE_COUNT);
  let spawned = 0;
  let fired = 0;
  for (let frame = 0; frame < 400; frame += 1) {
    const before = [...memory.subarray(main("FIGHTER_PROJECTILE_X") + HOSTILE_FIRST,
      main("FIGHTER_PROJECTILE_X") + HOSTILE_FIRST + HOSTILE_COUNT)];
    update(memory);
    if (memory[lbl("_boss_fire_module")] !== 0xff) fired += 1;
    const after = [...memory.subarray(main("FIGHTER_PROJECTILE_X") + HOSTILE_FIRST,
      main("FIGHTER_PROJECTILE_X") + HOSTILE_FIRST + HOSTILE_COUNT)];
    if (before.some((x, i) => x !== after[i])) spawned += 1;
  }
  assert.ok(fired > 0, "the countdown stopped while the pool was full");
  assert.equal(spawned, 0, "a shot was written into a busy slot");
  // One slot frees (an escort's or an old shot's): the next firing takes it.
  memory[active + HOSTILE_FIRST + 2] = 0;
  let taken = false;
  for (let frame = 0; frame < 400 && !taken; frame += 1) {
    update(memory);
    taken = memory[active + HOSTILE_FIRST + 2] !== 0;
  }
  assert.ok(taken, "the boss never fired into the freed slot");
  assert.deepEqual(hostileActive(memory).filter((value, i) => i !== 2), [0x0e, 0x0e, 0x0e, 0x0e]);
});

test("salvo fire from a fixture: three shots on three frames from columns x-1, x, x+1", () => {
  const layered = compileBossRegion(layeredDraft());
  const memory = bossEntered();
  installRegion(memory, layered, { level: 9 });
  placeBand(memory, 16);
  kill(memory, layered, "gun-a");
  kill(memory, layered, "plate");
  const salvo = layered.modules.findIndex((m) => m.kind === "salvo");
  assert.ok(mask16(memory, "_boss_armed") & (1 << salvo), "the salvo is not armed");
  const c = centre(layered.modules[salvo]);
  const shots = fireFrames(memory, 900);
  const bursts = [];
  shots.forEach((shot, i) => {
    if (shot.column === c - 1 && shots[i + 1]?.column === c && shots[i + 2]?.column === c + 1 &&
      shots[i + 1].frame === shot.frame + 1 && shots[i + 2].frame === shot.frame + 2) bursts.push(shot.frame);
  });
  assert.ok(bursts.length >= 1, "no salvo of three on consecutive frames");
});

// ---------------------------------------------------------------------------
// The nozzles (decision K; §5.13.2 item 9)
// ---------------------------------------------------------------------------

test("the nozzles at both ends animate through their phases and go dark first in the win", () => {
  const memory = fortress(32);
  const codes = [BOSS_TABLE.nozzleLeftCode, BOSS_TABLE.nozzleRightCode].map((o) => region1.tables[o] & 0x7f);
  const glyph = (side) => [...memory.subarray(0x0c00 + codes[side] * 8, 0x0c00 + codes[side] * 8 + 8)].join();
  const phases = region1.nozzle.phases.map((side) => side.map((bytes) => [...bytes].join()));
  const seen = [new Set(), new Set()];
  for (let frame = 0; frame < 60; frame += 1) {
    update(memory);
    for (const side of [0, 1]) {
      assert.ok(phases[side].includes(glyph(side)), `frame ${frame}: side ${side} shows no phase`);
      seen[side].add(glyph(side));
    }
  }
  assert.equal(seen[0].size, 3, "the left nozzle did not cycle its three phases");
  assert.equal(seen[1].size, 3, "the right nozzle did not cycle its three phases");
  for (const name of ["plate-g", "gun-4", "plate-f", "plate-e", "gun-3", "plate-c", "gun-1"]) kill(memory, region1, name);
  const g2 = byName.get("gun-2");
  for (let guard = 0; guard < 200 && hp(memory, g2) > 0; guard += 1) {
    shoot(memory, columnMap(memory).indexOf(g2));
  }
  assert.equal(memory[lbl("_boss_phase")], 2);
  const dark = "0,0,0,0,0,0,0,0";
  assert.equal(glyph(0), dark, "the left nozzle is still lit on the defeat frame");
  assert.equal(glyph(1), dark, "the right nozzle is still lit on the defeat frame");
  for (let frame = 0; frame < 60; frame += 1) {
    update(memory);
    assert.equal(glyph(0) + glyph(1), dark + dark, `frame ${frame}: a nozzle relit`);
  }
});

// ---------------------------------------------------------------------------
// The draw queue (§5.15.6 item 2): one module drawn a frame
// ---------------------------------------------------------------------------

test("the draw queue: at most one module's cells redrawn a frame, every look drawn in the end", () => {
  const memory = fortress(32);
  const owner = new Map();
  region1.modules.forEach((m, index) => {
    for (let r = m.row; r < m.row + m.height; r += 1) {
      for (let c = m.x; c < m.x + m.width; c += 1) owner.set(bossBandRowAddress(r) + c, index);
    }
  });
  const band = () => region1.bandRows.flatMap((_, r) => [...memory.subarray(bossBandRowAddress(r), bossBandRowAddress(r) + 64)]);
  const addresses = region1.bandRows.flatMap((_, r) => [...Array(64).keys()].map((c) => bossBandRowAddress(r) + c));
  const ringGlyphs = new Set([region1.spark, region1.deflect, region1.muzzle]);
  let worst = 0;
  for (const name of ["plate-d", "plate-c", "plate-g"]) {
    const index = byName.get(name);
    for (let guard = 0; guard < 100 && hp(memory, index) > 0; guard += 1) {
      const column = columnMap(memory).indexOf(index);
      const before = band();
      for (let slot = 0; slot < 5; slot += 1) shootAt(memory, column, slot);
      update(memory);
      const after = band();
      const touched = new Set();
      before.forEach((code, i) => {
        if (code !== after[i] && !ringGlyphs.has(after[i]) && !ringGlyphs.has(code) && owner.has(addresses[i])) {
          touched.add(owner.get(addresses[i]));
        }
      });
      worst = Math.max(worst, touched.size);
    }
  }
  assert.ok(worst <= 1, `${worst} modules redrawn in one frame`);
  settle(memory);
  const m = region1.modules[byName.get("plate-g")];
  assert.equal(cell(memory, m.x, m.row), region1.hole[0], "plate-g's hole was never drawn");
});

// ---------------------------------------------------------------------------
// Q-S4: nothing of the new settings survives a game that ends in the boss sector
// ---------------------------------------------------------------------------

test("Q-S4: START GAME after a game ended mid-fight clears the boss's shots and puts the engine bed back", () => {
  const memory = fortress(32);
  fireFrames(memory, 120);
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  memory.fill((1 << 3) | 6, active + HOSTILE_FIRST, active + HOSTILE_FIRST + HOSTILE_COUNT);
  shoot(memory, columnMap(memory).indexOf(byName.get("plate-d")));   // a tick on channel 3, a flash
  const writes = [];
  const drive = new Drive({ trig: (frame) => Math.floor(frame / 4) % 8 < 4 });
  const cpu = cpuOver(drive, memory);
  const inner = cpu.hooks.write;
  cpu.hooks.write = (address, value) => { writes.push([address, value]); return inner(address, value); };
  cpu.sp = 0xff;
  cpu.pc = 0xa000;
  memory[main("game_state")] = 1;
  assert.equal(runUntil(cpu, { start: main("start_gameplay"), failure: label("reader", "sector_reader_failure_screen") },
    { maxSteps: 200_000_000 }), "start");
  const game = cpuOver(new Drive(), memory);
  const gameInner = game.hooks.write;
  game.hooks.write = (address, value) => { writes.push([address, value]); return gameInner(address, value); };
  game.sp = 0xff;
  game.pc = main("start_gameplay");
  assert.equal(runUntil(game, { loop: main("main_loop") }, { maxSteps: 50_000_000 }), "loop");
  assert.deepEqual(hostileActive(memory), [0, 0, 0, 0, 0], "a boss shot survived START GAME");
  assert.deepEqual([writesTo(writes, AUDF3).at(-1), writesTo(writes, AUDC3).at(-1)], BED, "channel 3 is not the bed");
  assert.ok(!writesTo(writes, 0xd409).includes(0x0c), "CHBASE pointed at the boss's charset");
});

// ---------------------------------------------------------------------------
// Q-B6: the per-frame work on the fortress, every module through five shots a frame
// ---------------------------------------------------------------------------

test("Q-B6 on the fortress: five shots a frame through every reachable module stays under 7,000 native cycles", () => {
  const memory = fortress(32);
  let worst = 0;
  const frame = () => {
    let cycles = update(memory).cycles;
    cycles += call(memory, lbl("boss_motion")).cycles;
    memory[main("loader_dli_phase")] = 0;
    cycles += nmi(memory, lbl("boss_dli")) + nmi(memory, lbl("boss_dli")) + nmi(memory, lbl("boss_dli"));
    worst = Math.max(worst, cycles);
  };
  const order = ["plate-d", "emitter", "plate-g", "gun-4", "plate-f", "plate-e", "gun-3", "plate-c", "gun-1", "gun-2"];
  for (const name of order) {
    const index = byName.get(name);
    for (let guard = 0; guard < 400 && hp(memory, index) > 0 && memory[lbl("_boss_phase")] === 0; guard += 1) {
      const p = memory[lbl("boss_shown_pos")];
      const { left, right } = visibleCells(p);
      const column = columnMap(memory).findIndex((v, c) => v === index && c >= left && c <= right);
      if (column >= 0) for (let slot = 0; slot < 5; slot += 1) shootAt(memory, column, slot);
      frame();
    }
  }
  assert.equal(memory[lbl("_boss_phase")], 2, "the fight did not end");
  for (let rest = 0; rest < 200 && memory[lbl("_boss_handoff")] === 0; rest += 1) frame();
  assert.ok(worst <= 7000, `the worst boss frame's own work is ${worst} native cycles`);
  console.log(`# fortress per-frame work, worst: ${worst} native cycles (Q-B6 limit 7,000)`);
});
