// feat/boss-escort-flow (owner smoke 2026-10-10, owner answers of the same day;
// docs/plans/boss-escort-flow.md): the boss sector's Interceptor escort starts
// once the boss is losing - at the region's count of weapon kills (region 1:
// the first) - and then comes one at a time, every baseFrames + (RNG &
// jitterMask) frames (150 + 0..63), only on a frame with no module kill and no
// exposure check, until the boss falls; never two Lights live, none after the
// defeat. Before it, the install armed the level's whole stream at once (six
// escorts 100 frames apart from the fight's first frame, then none).
//
// The machine is the 6502 harness's boss gate with the real entry run on the
// built ATR (tests/boss-harness.mjs), then frame by frame in the main loop's
// order: the boss's UPDATE (the hits, the controller's tick), then the window's
// Light wave stepper. A Light's own life is the harness's: a live escort is
// cleared after ESCORT_LIFE frames, as a shot or the bottom edge would.
// RED on main 0ed69e1, GREEN after.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  bossEscortPairingProblem, bossPlaceholderDraft, bossRegionDirectory, compileBossRegion, loadBossPlaceholders,
  loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { compileLevelFile, levelSourcePath } from "../scripts/level-compiler.mjs";
import { call, installRegion, label, placeBand, root, runBossEntry, shootAt, visibleCells } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const dir = (name) => label("director", name);
const INTERCEPTOR = 24;
const HOSTILE_BASE = 5, HOSTILE_LIMIT = 5;
const ESCORT_LIFE = 60;
const BASE = 150, JITTER = 63;
const T_ESCORT_AFTER = 17, T_ESCORT_BASE = 18, T_ESCORT_JITTER = 19;
const P = 32;

const draft = () => loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft());

// The gate as the Director leaves it on entering the boss sector
// (src/c/director.c enter_sector): the sector index, the cursor on its first
// wave, the wave bytes $80FC / $80FD and the Light wave state cleared. The
// harness's gate machine has never run the Director, so it is set here.
const levelSource = JSON.parse(fs.readFileSync(path.join(root, "assets", "levels", "level-01.json"), "utf8"));
const BOSS_SECTOR = levelSource.sectors.findIndex((sector) => sector.kind === "boss");
function enterBossSector(m) {
  call(m, dir("_lifecycle_c_init"));      // start_gameplay's: the Light slots, the token budget
  m[0x80f6] = BOSS_SECTOR;
  m[0x80f7] = m[dir("_sector_wave_first") + BOSS_SECTOR];
  m[0x80fc] = 0;
  m[0x80fd] = 0;
  m[dir("_light_wave_lock")] = 0;
  m[dir("_light_wave_remaining")] = 0;
  for (let k = 0; k < 4; k += 1) m[dir("_light_state") + k] = 0;
}
let entry = null;
const entered = () => Uint8Array.from((entry ??= runBossEntry({ prepare: enterBossSector })).memory);
const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE");
const fallen = (m) => [...Array(m[lbl("_boss_count")]).keys()].filter((i) => m[lbl("_boss_hp") + i] === 0).length;

// One frame of the boss sector: the frame counter, the boss's UPDATE with the
// player held and the hostile pool emptied (the harness moves no shot), then
// the Light wave stepper. Returns what happened.
function frame(m, run) {
  m[0x86] = (m[0x86] + 1) & 0xff;
  m[main("PLAYER_LIFECYCLE")] = 0;
  m[main("PLAYER_LIFECYCLE") + 1] = 3;
  m[main("BROAD_DAMAGE_COOLDOWN")] = 25;
  for (let i = 0; i < HOSTILE_LIMIT; i += 1) m[ACTIVE + HOSTILE_BASE + i] = 0;
  const down = fallen(m);
  const before = [0, 1, 2, 3].map((k) => m[dir("_light_state") + k]);
  call(m, lbl("boss_update"));
  call(m, dir("_enemy_c_light_wave"));
  const after = [0, 1, 2, 3].map((k) => m[dir("_light_state") + k]);
  const admitted = [0, 1, 2, 3].filter((k) => before[k] === 0 && after[k] !== 0);
  for (const k of admitted) {
    run.admissions.push({ frame: run.frame, archetype: m[dir("_light_archetype") + k],
      killFrame: run.lastKill === run.frame, exposureFrame: run.lastKill === run.frame - 1 });
    run.age[k] = 0;
  }
  for (const k of [0, 1, 2, 3]) {
    if (m[dir("_light_state") + k] === 0) continue;
    run.age[k] += 1;
    if (run.age[k] >= ESCORT_LIFE) m[dir("_light_state") + k] = 0;
  }
  const live = [0, 1, 2, 3].filter((k) => m[dir("_light_state") + k] !== 0).length;
  run.maxLive = Math.max(run.maxLive, live);
  if (fallen(m) > down) run.lastKill = run.frame;
  run.frame += 1;
  return { killed: fallen(m) > down };
}
const newRun = () => ({ frame: 0, admissions: [], age: [0, 0, 0, 0], maxLive: 0, lastKill: -10 });
const frames = (m, run, count) => { for (let i = 0; i < count; i += 1) frame(m, run); };

// A shot into one of `module`'s front columns, the module at its last hit point.
function aimKill(m, module) {
  const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
  const map = m.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
  const column = [...map.keys()].find((c) => c >= left && c <= right && map[c] === module);
  assert.notEqual(column, undefined, `module ${module} has no front column in view`);
  m[lbl("_boss_hp") + module] = 1;
  shootAt(m, column, 0);
}
function kill(m, run, module) {
  aimKill(m, module);
  const at = run.frame;
  frame(m, run);
  assert.equal(m[lbl("_boss_hp") + module], 0, `module ${module} did not fall`);
  return at;
}
const index = (name) => region1.modules.findIndex((x) => x.name === name);
// The machine after the real entry, the band held at P.
function fight() {
  const m = entered();
  placeBand(m, P);
  return { m, run: newRun() };
}

// ---------------------------------------------------------------------------
// The data
// ---------------------------------------------------------------------------

test("data: region 1's escort - after 1 weapon kill, every 150 + (RNG & 63) frames - in the tables' bytes 17-19", () => {
  const { _: note, ...escort } = draft().layout.escort;
  assert.deepEqual(escort, { afterWeapons: 1, baseFrames: BASE, jitterMask: JITTER });
  assert.deepEqual([...region1.tables.subarray(T_ESCORT_AFTER, T_ESCORT_JITTER + 1)], [1, BASE, JITTER]);
});

test("data: regions 2-4 (copies of region 1) carry region 1's escort", () => {
  const placeholders = loadBossPlaceholders(root);
  for (const region of ["2", "3", "4"]) {
    const compiled = compileBossRegion(bossPlaceholderDraft(draft(), placeholders[region]));
    assert.deepEqual([...compiled.tables.subarray(T_ESCORT_AFTER, T_ESCORT_JITTER + 1)], [1, BASE, JITTER],
      `region ${region}`);
  }
});

test("data: level 1's boss sector authors one Interceptor per arming (count 1) under lights 1", () => {
  const level = JSON.parse(fs.readFileSync(path.join(root, "assets", "levels", "level-01.json"), "utf8"));
  const boss = level.sectors.find((sector) => sector.kind === "boss");
  assert.equal(boss.lights, 1);
  assert.deepEqual(boss.waves.map(({ archetype, count, row }) => ({ archetype, count, row })),
    [{ archetype: "interceptor", count: 1, row: 0 }]);
  const compiled = compileLevelFile(levelSourcePath(1));
  assert.equal(compiled.waves.at(-1).count, 1);
});

test("data: the converter refuses a clock shorter than a pass, a jitter that is not 2^k - 1, and a byte overflow", () => {
  const withEscort = (escort) => compileBossRegion({ ...draft(), layout: { ...draft().layout, escort } });
  assert.throws(() => withEscort({ afterWeapons: 1, baseFrames: 100, jitterMask: 63 }), /escort\.baseFrames/);
  assert.throws(() => withEscort({ afterWeapons: 1, baseFrames: 150, jitterMask: 50 }), /escort\.jitterMask/);
  assert.throws(() => withEscort({ afterWeapons: 1, baseFrames: 200, jitterMask: 63 }), /exceeds 255/);
  assert.throws(() => withEscort({ afterWeapons: 0, baseFrames: 150, jitterMask: 63 }), /escort\.afterWeapons/);
  const none = compileBossRegion({ ...draft(), layout: { ...draft().layout, escort: undefined } });
  assert.deepEqual([...none.tables.subarray(T_ESCORT_AFTER, T_ESCORT_JITTER + 1)], [0, 0, 0]);
});

test("data: the build refuses a level and a boss region that disagree on the escort", () => {
  const level = compileLevelFile(levelSourcePath(1));
  assert.equal(bossEscortPairingProblem(level, region1), null, "level 1 and region 1 disagree");
  const none = compileBossRegion({ ...draft(), layout: { ...draft().layout, escort: undefined } });
  assert.match(bossEscortPairingProblem(level, none) ?? "", /never arm/);
  const bossIndex = level.sectors.find((sector) => sector.kindName === "boss").index;
  const noWave = { ...level, waves: level.waves.filter((wave) => wave.sector !== bossIndex + 1) };
  assert.match(bossEscortPairingProblem(noWave, region1) ?? "", /must author one/);
  const six = { ...level, waves: level.waves.map((wave) => (wave.sector === bossIndex + 1 ? { ...wave, count: 6 } : wave)) };
  assert.match(bossEscortPairingProblem(six, region1) ?? "", /count 6/);
});

// ---------------------------------------------------------------------------
// The runtime (the real entry, then the boss's frames)
// ---------------------------------------------------------------------------

test("runtime: the install arms nothing - no escort in 400 frames without a weapon kill", () => {
  const { m, run } = fight();
  assert.equal(m[dir("_light_wave_remaining")], 0, "the install left escorts pending");
  frames(m, run, 400);
  assert.deepEqual(run.admissions, [], `escorts before any kill: ${JSON.stringify(run.admissions)}`);
});

test("runtime: armour kills start nothing; the first weapon kill does, two frames on (after its exposure check)", () => {
  const { m, run } = fight();
  // Plates first: armour is not a weapon (plate-c, -d, -e guard gun-1, the emitter, gun-3).
  for (const plate of ["plate-c", "plate-e"]) { kill(m, run, index(plate)); frames(m, run, 30); }
  assert.deepEqual(run.admissions, [], "an armour kill started the escort");
  const k = kill(m, run, index("gun-2"));
  frames(m, run, 10);
  assert.equal(run.admissions.length, 1, `escorts after the first weapon kill: ${JSON.stringify(run.admissions)}`);
  const [first] = run.admissions;
  assert.equal(first.frame, k + 2, `the first escort came at frame ${first.frame}, the kill at ${k}`);
  assert.equal(first.archetype, INTERCEPTOR, "the escort is not the Interceptor");
});

test("runtime: escorts keep coming every 150 + 0..63 frames, never two live, never on a kill or exposure frame", () => {
  const { m, run } = fight();
  kill(m, run, index("gun-2"));
  // More kills along the way: they must neither re-trigger nor bring one early.
  frames(m, run, 300);
  kill(m, run, index("plate-c"));
  frames(m, run, 200);
  kill(m, run, index("gun-1"));
  frames(m, run, 1500);
  const at = run.admissions.map((a) => a.frame);
  assert.ok(at.length >= 9, `${at.length} escorts in ${run.frame} frames`);
  assert.deepEqual(run.admissions.filter((a) => a.archetype !== INTERCEPTOR), [], "a non-Interceptor escort");
  assert.deepEqual(run.admissions.filter((a) => a.killFrame || a.exposureFrame), [],
    "an escort entered on a kill or exposure frame");
  assert.equal(run.maxLive, 1, `${run.maxLive} Lights live at once`);
  const gaps = at.slice(1).map((f, i) => f - at[i]);
  // The clock pauses on a kill and on its exposure frame: two frames a kill.
  const out = gaps.filter((g) => g < BASE || g > BASE + JITTER + 2);
  assert.deepEqual(out, [], `gaps outside ${BASE}..${BASE + JITTER} (+2): ${gaps.join(" ")}`);
  assert.ok(new Set(gaps).size >= 3, `the interval does not vary: ${gaps.join(" ")}`);
});

test("runtime: none after the defeat", () => {
  const { m, run } = fight();
  // The last weapon standing is gun-2: its kill is the defeat (decision A).
  m[lbl("_boss_weapons_left")] = 1;
  const k = kill(m, run, index("gun-2"));
  assert.notEqual(m[lbl("_boss_phase")], 0, "the kill was not the defeat");
  frames(m, run, 600);
  assert.deepEqual(run.admissions.filter((a) => a.frame >= k), [], "an escort after the defeat");
});

test("runtime: a region with no escort never starts one, whatever is killed", () => {
  const { m, run } = fight();
  const none = compileBossRegion({ ...draft(), layout: { ...draft().layout, escort: undefined } });
  installRegion(m, none, { level: 1 });
  placeBand(m, P);
  kill(m, run, index("gun-2"));
  frames(m, run, 50);
  kill(m, run, index("plate-c"));
  frames(m, run, 50);
  kill(m, run, index("gun-1"));
  frames(m, run, 600);
  assert.deepEqual(run.admissions, []);
});
