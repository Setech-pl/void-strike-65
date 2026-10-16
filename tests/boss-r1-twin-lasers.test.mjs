// feat/boss-r1-twin-lasers (owner answers of 2026-10-13, docs/plans/boss-r1-twin-lasers.md):
// region 1's Blockade Breaker carries two laser cannons, left and right of the
// centre (layout L2), fired in turn - never two beams at once on levels 1-3,
// the survivor fires alone; every weapon hangs from a continuous hull spine
// that no shot breaks; the plates are a one-row armour belt that still covers
// each weapon's columns; and the display list ends the band under its last
// row, so a shot under the boss has the playfield's charset and colours (the
// owner's smoke finding of 2026-10-13: grey shots under the belt). RED on
// b7ccf87 (region 1 still main's, the band always 8 rows), GREEN after; the
// rule (B) test pins the recorded rule (owner answer 2 (a)) and was green on
// both. The stages' colour-3 pixels and the b3 flash are tests/boss-polish
// and tests/boss-hit-flash, which read these assets.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  bossBandShownRows, bossPlaceholderDraft, bossRegionDirectory, compileBossRegion, loadBossPlaceholders,
  loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import {
  call, installRegion, label, manifest, nmi, placeBand, root, runBossEntry, shootAt, visibleCells,
} from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const dir = (name) => label("director", name);
const draft = loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft);
const index = (name) => region1.modules.findIndex((module) => module.name === name);
const columns = (module) => Array.from({ length: module.width }, (_, k) => module.x + k);
const P = 32;

// ---------------------------------------------------------------------------
// The data
// ---------------------------------------------------------------------------

test("data: two laser cannons in slot 1, left and right of the centre, each behind its own plate", () => {
  const emitters = region1.modules.filter((module) => module.kind === "emitter");
  assert.deepEqual(emitters.map(({ name, x, row, slot }) => ({ name, x, row, slot })),
    [{ name: "emitter-l", x: 21, row: 1, slot: 1 }, { name: "emitter-r", x: 41, row: 1, slot: 1 }]);
  assert.deepEqual(region1.twin, ["emitter-l", "emitter-r"]);
  assert.deepEqual(manifest.boss.regions[0].twin, ["emitter-l", "emitter-r"], "the build carries the twin");
  const plates = (module) => region1.modules.filter((_, k) => (module.cover >> k) & 1).map(({ name }) => name);
  assert.deepEqual(emitters.map(plates), [["plate-c"], ["plate-f"]]);
  assert.equal(region1.modules[index("gun-1")].x, 31, "gun-1 takes the central slot");
});

test("data: the spine - band row 0 is hull from column 7 to 56, and no module owns a cell of it", () => {
  const row = region1.bandRows[0];
  const holes = [];
  for (let c = 7; c <= 56; c += 1) if (row[c] === 0) holes.push(c);
  assert.deepEqual(holes, [], "the spine has holes");
  assert.deepEqual(region1.modules.filter((module) => module.row === 0).map(({ name }) => name), [],
    "a module in the spine's row would make it destructible");
  for (let c = 7; c <= 56; c += 1) {
    assert.ok(!region1.seeThrough.some(([x, y]) => x === c && y === 0), `spine cell ${c} is see-through`);
  }
});

test("data: the plates are a one-row armour belt at row 4 that covers every covered weapon's columns", () => {
  const plates = region1.modules.filter((module) => module.kind === "armour");
  assert.equal(plates.length, 8);
  assert.deepEqual(plates.filter(({ row, height }) => row !== 4 || height !== 1).map(({ name }) => name), []);
  for (const weapon of region1.modules.filter((module) => module.kind !== "armour")) {
    const covers = region1.modules.filter((_, k) => (weapon.cover >> k) & 1);
    if (weapon.name === "gun-2") { assert.deepEqual(covers, [], "gun-2 stays in the open bay"); continue; }
    assert.ok(covers.length > 0, `${weapon.name} has no plate`);
    const covered = new Set(covers.flatMap(columns));
    assert.deepEqual(columns(weapon).filter((c) => !covered.has(c)), [], `${weapon.name}'s columns left uncovered`);
  }
});

// ---------------------------------------------------------------------------
// The lasers (slot D): one laser fired from the two cannons in turn
// ---------------------------------------------------------------------------

let entry = null;
const entered = () => Uint8Array.from((entry ??= runBossEntry()).memory);

// A killing hit through the controller, as boss_hit calls it.
function killNow(m, name) {
  m[lbl("_boss_hp") + index(name)] = 1;
  m[lbl("_boss_hit_module")] = index(name);
  call(m, lbl("_boss_c_hit"));
}
// Frames of the boss sector with the player held alive: the band DLI's phase 0
// (it publishes the lasers), then UPDATE. Each laser's state per frame.
function laserFrames(m, count, events = {}) {
  const lasers = [0, 1].map((k) => region1.modules[m[lbl("boss_laser_module") + k]]?.name);
  const starts = [];
  let both = 0;
  let before = [0, 0];
  for (let f = 0; f < count; f += 1) {
    m[main("PLAYER_LIFECYCLE")] = 0;
    m[main("PLAYER_LIFECYCLE") + 1] = 3;
    m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
    events[f]?.(m);
    m[main("loader_dli_phase")] = 0;
    nmi(m, lbl("boss_dli"));
    call(m, lbl("boss_update"));
    const now = [0, 1].map((k) => m[lbl("boss_laser_state") + k]);
    if (now[0] !== 0 && now[1] !== 0) both += 1;
    for (const k of [0, 1]) if (before[k] === 0 && now[k] !== 0) starts.push({ frame: f, name: lasers[k] });
    before = now;
  }
  return { lasers, starts, both };
}
const gaps = (starts) => starts.slice(1).map((s, k) => s.frame - starts[k].frame);

for (const level of [1, 2, 3]) {
  test(`level ${level}: the twins never fire together, take strict turns, and the survivor fires alone`, () => {
    const m = installRegion(entered(), region1, { level, difficulty: 1 });
    placeBand(m, P);
    const { lasers, starts, both } = laserFrames(m, 4400, {
      50: (x) => killNow(x, "plate-f"),        // emitter-r exposed: its first shot, then alone
      1300: (x) => killNow(x, "plate-c"),      // emitter-l exposed: the turns begin
      3000: (x) => killNow(x, "emitter-r"),    // emitter-l the survivor
    });
    assert.deepEqual(lasers, ["emitter-l", "emitter-r"], "slot 1's twins hold lasers 0 and 1");
    assert.equal(both, 0, "two boss beams (or warnings) at once");
    const alone = starts.filter(({ frame }) => frame < 1300);
    assert.ok(alone.length >= 3 && alone.every(({ name }) => name === "emitter-r"), JSON.stringify(alone));
    const cadence = gaps(alone)[1];
    const turns = starts.filter(({ frame }) => frame >= 1300 && frame < 3000);
    assert.ok(turns.length >= 4, `${turns.length} shots while both stood`);
    turns.slice(1).forEach((shot, k) => assert.notEqual(shot.name, turns[k].name,
      `two shots from ${shot.name} in a row at frames ${turns[k].frame} and ${shot.frame}`));
    // One cannon's cadence, within a frame: laser_twin_off restarts the other's
    // reload on the frame a firing ends, and laser 0 has already counted that
    // frame when laser 1's firing ends there (MEASURED: 307 frames after a
    // left shot, 306 after a right one, on MEDIUM).
    gaps(turns).slice(1).forEach((gap) => assert.ok(Math.abs(gap - cadence) <= 1,
      `the turns keep one cannon's cadence (${cadence}): ${JSON.stringify(starts)}`));
    const after = starts.filter(({ frame }) => frame > 3000);
    assert.ok(after.length >= 3 && after.every(({ name }) => name === "emitter-l"), JSON.stringify(after));
    gaps(after).slice(1).forEach((gap) => assert.equal(gap, cadence, "the survivor keeps the cadence"));
  });
}

// ---------------------------------------------------------------------------
// The spine stops every shot; the plates still cover their columns
// ---------------------------------------------------------------------------

test("runtime: with every plate and every weapon but gun-2 down, every spine column absorbs a shot and the spine stands", () => {
  const m = installRegion(entered(), region1, { level: 1, difficulty: 1 });
  placeBand(m, P);
  const rowZero = 0xa880;   // band row 0 (scripts/boss-assets.mjs bossBandRowAddress)
  const before = [...m.subarray(rowZero, rowZero + 64)];
  for (const module of region1.modules) if (module.name !== "gun-2") killNow(m, module.name);
  for (let f = 0; f < 4; f += 1) call(m, lbl("boss_update"));
  const map = m.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
  const gun2 = columns(region1.modules[index("gun-2")]);
  const open = [];
  for (let c = 7; c <= 56; c += 1) if (!gun2.includes(c) && map[c] === 0xff) open.push(c);
  assert.deepEqual(open, [], "spine columns a shot would fly through");
  const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
  const hp = () => [...m.subarray(lbl("_boss_hp"), lbl("_boss_hp") + region1.modules.length)];
  const hpBefore = hp();
  for (let c = Math.max(7, left); c <= Math.min(56, right); c += 1) {
    if (gun2.includes(c)) continue;
    shootAt(m, c, 0);
    for (let f = 0; f < 12 && m[main("FIGHTER_PROJECTILE_ACTIVE")] !== 0; f += 1) {
      m[main("FIGHTER_PROJECTILE_Y")] -= 4;
      call(m, lbl("boss_update"));
    }
    assert.equal(m[main("FIGHTER_PROJECTILE_ACTIVE")], 0, `the shot at column ${c} was not stopped`);
  }
  assert.deepEqual(hp(), hpBefore, "a spine hit damaged a module");
  assert.deepEqual([...m.subarray(rowZero, rowZero + 64)], before, "the spine's row changed");
});

// ---------------------------------------------------------------------------
// Rule (B), as recorded (owner answer 2 (a)): only gun shots wait on a module-
// kill frame; a laser warning may start on it.
// ---------------------------------------------------------------------------

test("rule (B) (a): a laser warning due on a module-kill frame starts on that frame", () => {
  const start = installRegion(entered(), region1, { level: 1, difficulty: 1 });
  placeBand(start, P);
  const dry = laserFrames(Uint8Array.from(start), 900, { 50: (x) => killNow(x, "plate-f") });
  const due = dry.starts.find(({ frame }) => frame > 400);
  assert.ok(due !== undefined, "no laser shot to test");
  const run = laserFrames(Uint8Array.from(start), due.frame + 1, {
    50: (x) => killNow(x, "plate-f"),
    [due.frame]: (x) => { x[lbl("_boss_hp") + index("plate-a")] = 1; x[lbl("_boss_hit_module")] = index("plate-a");
      call(x, lbl("_boss_c_hit")); },
  });
  assert.equal(run.starts.at(-1)?.frame, due.frame, "the warning waited for the kill frame to pass");
});

// ---------------------------------------------------------------------------
// The escort: a cannon kill is a weapon kill (feat/boss-escort-flow)
// ---------------------------------------------------------------------------

test("runtime: killing a twin cannon starts the escort, two frames on", () => {
  const level = JSON.parse(fs.readFileSync(path.join(root, "assets", "levels", "level-01.json"), "utf8"));
  const sector = level.sectors.findIndex((s) => s.kind === "boss");
  const m = Uint8Array.from(runBossEntry({ prepare: (x) => {
    call(x, dir("_lifecycle_c_init"));
    x[0x80f6] = sector;
    x[0x80f7] = x[dir("_sector_wave_first") + sector];
    x[0x80fc] = 0;
    x[0x80fd] = 0;
    x[dir("_light_wave_lock")] = 0;
    x[dir("_light_wave_remaining")] = 0;
    for (let k = 0; k < 4; k += 1) x[dir("_light_state") + k] = 0;
  } }).memory);
  placeBand(m, P);
  const step = () => {
    m[main("PLAYER_LIFECYCLE")] = 0;
    m[main("PLAYER_LIFECYCLE") + 1] = 3;
    m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
    for (let i = 0; i < 5; i += 1) m[main("FIGHTER_PROJECTILE_ACTIVE") + 5 + i] = 0;
    call(m, lbl("boss_update"));
    call(m, dir("_enemy_c_light_wave"));
    return [0, 1, 2, 3].some((k) => m[dir("_light_state") + k] !== 0);
  };
  const shootDown = (name) => {
    const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
    const map = m.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
    const column = [...map.keys()].find((c) => c >= left && c <= right && map[c] === index(name));
    assert.notEqual(column, undefined, `${name} has no front column in view`);
    m[lbl("_boss_hp") + index(name)] = 1;
    shootAt(m, column, 0);
    step();
    assert.equal(m[lbl("_boss_hp") + index(name)], 0, `${name} did not fall`);
  };
  shootDown("plate-c");
  for (let f = 0; f < 30; f += 1) assert.equal(step(), false, "an armour kill started the escort");
  shootDown("emitter-l");
  const live = [step(), step()];
  assert.deepEqual(live, [false, true], "the escort did not come two frames after the cannon fell");
});

// ---------------------------------------------------------------------------
// The owner's smoke finding of 2026-10-13: the rows under the boss are the
// playfield's, on every region's route
// ---------------------------------------------------------------------------

const placeholders = loadBossPlaceholders(root);
// RE-POINTED feat/boss-region-2 (S5-5): every region is its own draft now (a
// region without a directory would still be region 1's copy).
const regions = [region1, ...[2, 3, 4].map((n) => compileBossRegion(
  fs.existsSync(path.join(bossRegionDirectory(root, n), "modules.json"))
    ? loadBossRegionDraft(bossRegionDirectory(root, n)) : bossPlaceholderDraft(draft, placeholders[String(n)])))];

test("data: the list shows each region's band down to its last row with a cell - 5 rows for regions 1, 2 and 4, 8 for region 3", () => {
  assert.deepEqual(regions.map((region) => bossBandShownRows(region.bandRows)), [5, 5, 8, 5]);
  assert.deepEqual(manifest.boss.regions.map(({ bandShownRows }) => bandShownRows), [5, 5, 8, 5]);
});

for (const [region, level] of [[1, 1], [2, 4], [3, 7], [4, 10]]) {
  test(`region ${region}'s route: a shot under the boss is drawn in a ring row, in the playfield's charset and colours`, () => {
    const entryRun = runBossEntry({ prepare: (m) => { m[0xa603] = level; } });
    assert.equal(entryRun.end, "main_loop");
    const m = Uint8Array.from(entryRun.memory);
    const shown = bossBandShownRows(regions[region - 1].bandRows);
    const list = main("PLAYFIELD_DLIST_A");
    // The band rows: HSCROL and LMS, the band's DLI on its last shown row.
    // RE-POINTED feat/boss-art (variant B, decision AV): and a DLI on the row
    // before each row-palette switch (tests/boss-art.test.mjs).
    const switches = regions[region - 1].rowPalette.switches;
    for (let row = 0; row < shown; row += 1) {
      assert.equal(m[list + 6 + row * 3], row === shown - 1 || switches.includes(row + 1) ? 0xd4 : 0x54, `band row ${row}`);
    }
    // Every row under it is a ring row (no HSCROL): its LMS the ring's own row.
    for (let row = shown; row < 27; row += 1) {
      const at = list + 6 + row * 3;
      assert.equal(m[at] & 0x7f, 0x44, `display row ${row} under the band is not a ring row`);
      assert.equal(m[at + 1] | (m[at + 2] << 8),
        m[main("PLAYFIELD_ROW_LO") + row] | (m[main("PLAYFIELD_ROW_HI") + row] << 8), `ring row ${row}`);
    }
    assert.equal(m[list + 6 + 27 * 3], 0x41, "the list's jump");
    // The band DLI at its last line hands the ring the gameplay charset and
    // the playfield's four colours.
    const writes = [];
    m[main("loader_dli_phase")] = 1;
    nmi(m, lbl("boss_dli"), { hooks: { write: (address, value) => { writes.push([address, value]); m[address] = value; } } });
    const last = (register) => writes.filter(([address]) => address === register).at(-1)?.[1];
    assert.equal(last(0xd409), main("CHARSET") >> 8, "CHBASE");
    assert.deepEqual([0xd016, 0xd017, 0xd018, 0xd019].map(last), [main("GAMEPLAY_COLPF0"),
      m[main("gameplay_dli_allied_colpf1_load") + 1], main("GAMEPLAY_COLPF2"), main("GAMEPLAY_COLPF3")]);
    if (shown === 8) return;   // region 3: the field's row 7 ends the band; nothing lies under it
    // A PairShot and a boss shot on the ring's first row under the band: no
    // band cell is drawn for either, and the boss shot does not ride the
    // band's drift (it falls straight, as the ring's shots do).
    const y = 24 + shown * 8 + 4;
    const band = () => [...m.subarray(0xa880, 0xa880 + 6 * 64), ...m.subarray(0xac80, 0xac80 + 2 * 64)];
    const bandBefore = band();
    m[main("FIGHTER_PROJECTILE_ACTIVE")] = 1;
    m[main("FIGHTER_PROJECTILE_X")] = 120;
    m[main("FIGHTER_PROJECTILE_Y")] = y;
    m[main("FIGHTER_PROJECTILE_ACTIVE") + 5] = 1;
    m[main("FIGHTER_PROJECTILE_X") + 5] = 100;
    m[main("FIGHTER_PROJECTILE_Y") + 5] = y;
    placeBand(m, m[lbl("boss_shown_pos")] + 3);
    call(m, lbl("laser_hostile_shots"));
    call(m, lbl("boss_shots_late"));
    assert.equal(m[main("FIGHTER_PROJECTILE_X") + 5], 100, "the boss shot under the band rode its drift");
    assert.deepEqual(band(), bandBefore, "a shot under the band was drawn in the band");
    assert.equal(m[lbl("boss_capsule_y_operand")], 24 + shown * 8, "a capsule appears at the shown band's edge");
  });
}
