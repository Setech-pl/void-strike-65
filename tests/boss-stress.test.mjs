// AUD-04 (owner addendum, 2026-10-06): the boss's per-frame work when the
// player's shots meet several distinct modules in one frame - kills (each one
// rebuilds its module's columns) and damage-stage changes, every module the
// layouts expose (plate-a, plate-b and plate-h included), the plates already
// destroyed in between, at five band positions.
//
// Accounting (the audit's): the band DLI's three phases, UPDATE and MOTION,
// the shots placed inside their meeting cells, the targets one hit from the
// kill (HP 1) or from the next damage stage. Layouts: region 1 as entered
// (level 1, MEDIUM; no laser forced, as the audit measured), and - on builds
// with the lasers - the tier-4 laser fixture (level 9) with its four lasers
// held in a warning's heat frame (the lasers' costliest frame, timer 21) and,
// separately, in their beams.
//
// The owner's decision (AUD-04, 2026-10-06): at most two player shots meet
// the boss a frame; a later one stays where it is and is tested again on the
// next frame. The harness does not run the game's projectile update, so each
// case runs two more frames with the shots still in flight moved as that
// update moves them (6 lines up), and the case's figure is its worst frame.
//
// Reachability is labelled per case (docs/plans/boss-lasers.md §13): one
// meeting a frame is reachable; two (rapid fire, rows 4-5 apart) are
// reachable; three or more are unproven (a SPREAD volley's three shots meet
// together only at one meeting line; more needs shots of another weapon in
// flight) and the limit applies to them as to reachable ones. The limit is
// Q8's 8,500 in the boss sector on builds with the lasers, Q-B6's 7,000 on
// builds without them.
//
// S5-1 (owner decision Q4, docs/plans/s5-boss-regions.md §7.1): a weapon also
// fires on the meeting frame. Before, no countdown expired on the synthetic
// frames, so a kill frame on which a gun spawns its shot (420-495 native,
// reachable in region 1 as shipped) was outside the figure. Each case now runs
// once per armed weapon with the controller's countdown expiring on that frame
// and its walk ending at that weapon (the cursor on the armed module before
// it: boss_fire_next's longest walk to it), and the case's figure is the worst
// of those runs. The hostile pool is as the entry and the setup frames leave
// it (gun-2's earlier shot live in one slot).
//
// S5-2 (plan docs/plans/s5-boss-regions.md §4.2, §6): the finale's volleys. On
// a layout with a finale (the region 2-4 placeholders: region 1's data with
// fire.finaleCooldown, and the tier-4 fixture with the same) the sweep runs in
// the finale - every plate destroyed - and one plate short of it (the meeting
// may kill the last), and each case runs once more per armed weapon with a
// volley's second and third shot (the burst step) due on the meeting frame:
// the volley started by the controller one or two frames earlier, its earlier
// shots in the pool. Under the owner's rule (B) a step due on a kill frame is
// held to the next, so the case runs on while it is pending. Region 1 and the
// fixture as shipped have no volley (no finale, no salvo launcher): their
// figures are unchanged.
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import {
  call, installRegion, label, labelsOf, manifest, nmi, placeBand, root, runBossEntry, shootAt, visibleCells,
} from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const lasers = labelsOf.boss.has("laser_frame");
const LIMIT = lasers ? 8500 : 7000;
const { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const fixture = lasers
  ? compileBossRegion(assets.bossLaserFixtureDraft(loadBossRegionDraft(bossRegionDirectory(root, 1)))) : null;
// S5-2: the region 2-4 placeholders (assets/graphics/boss-regions/placeholders.json)
// - region 1's data with the finale on - and the tier-4 fixture with the same
// entry (a laser-fixture route's regions 2-4). One layout while every entry is
// the same; the test refuses entries that differ (a later session splits them).
const finaleBuilt = labelsOf.boss.has("_boss_burst_left");
const placeholderEntries = assets.loadBossPlaceholders(root);
const placeholderEntry = placeholderEntries["2"];
const placeholders = compileBossRegion(assets.bossPlaceholderDraft(
  loadBossRegionDraft(bossRegionDirectory(root, 1)), placeholderEntry));
const fixtureFinale = lasers ? compileBossRegion(assets.bossPlaceholderDraft(
  assets.bossLaserFixtureDraft(loadBossRegionDraft(bossRegionDirectory(root, 1))), placeholderEntry)) : null;

let entry = null;
function entered() {
  if (entry === null) entry = runBossEntry();
  return Uint8Array.from(entry.memory);
}
const LIFECYCLE = main("PLAYER_LIFECYCLE");
const COOLDOWN = main("BROAD_DAMAGE_COOLDOWN");
const hp = (memory, i) => memory[lbl("_boss_hp") + i];
const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE"), SHOT_Y = main("FIGHTER_PROJECTILE_Y");
const SPEED = 6;                                   // PLAYER_FIGHTER_PROJECTILE_SPEED (build/fighter-weapons.inc)
// The game's projectile update for the player's five slots, as far as the band sees it.
function advance(memory) {
  for (let slot = 0; slot < 5; slot += 1) if (memory[ACTIVE + slot] !== 0) memory[SHOT_Y + slot] -= SPEED;
}
const live = (memory) => [0, 1, 2, 3, 4].filter((slot) => memory[ACTIVE + slot] !== 0);

// S5-1 (Q4): the weapons that can fire on the meeting frame, and the arming.
const KIND_EMITTER = 2;                            // BOSS_KIND_EMITTER (build/boss-layout.inc)
const BOSS_SHOT_ACTIVE = 0x0e;                     // src/hybrid/boss.s
const HOSTILE_BASE = 5, HOSTILE_LIMIT = 5;         // INTERCEPTOR_PROJECTILE_SLOT_BASE / _ACTIVE_LIMIT
const armedMask = (memory) => memory[lbl("_boss_armed_lo")] | (memory[lbl("_boss_armed_hi")] << 8);
function weapons(memory) {
  const armed = armedMask(memory);
  return [...Array(memory[lbl("_boss_count")]).keys()]
    .filter((i) => ((armed >> i) & 1) !== 0 && memory[lbl("_boss_kind") + i] !== KIND_EMITTER);
}
// The countdown expires on this frame and boss_fire_next's walk ends at `module`.
function arm(memory, module) {
  const count = memory[lbl("_boss_count")], armed = armedMask(memory);
  let previous = module;
  do previous = (previous + count - 1) % count; while (((armed >> previous) & 1) === 0);
  memory[lbl("_boss_cursor")] = previous;
  memory[lbl("_boss_countdown")] = 1;
}
const bossShots = (memory) => [...Array(HOSTILE_LIMIT).keys()]
  .filter((i) => memory[ACTIVE + HOSTILE_BASE + i] === BOSS_SHOT_ACTIVE).length;
const fallen = (memory) => [...Array(memory[lbl("_boss_count")]).keys()]
  .filter((i) => memory[lbl("_boss_hp") + i] === 0).length;

function hold(memory, laserMode) {
  memory[LIFECYCLE] = 0;
  memory[LIFECYCLE + 1] = 3;
  memory[COOLDOWN] = 25;
  if (laserMode === null) return;
  // RE-POINTED S4b.1 (owner decision D3): at most two lasers warn or fire at
  // once; the worst reachable frame holds two on (in a heat frame, or their
  // beams) and the other live emitters ready and waiting. (Four held on, the
  // state the cap removed, measured 8,474 native at worst on this build.)
  const has = (name) => labelsOf.boss.has(name);
  let on = 0;
  for (let i = 0; i < 4; i += 1) {
    const module = memory[lbl("boss_laser_module") + i];
    if (module === 0xff || hp(memory, module) === 0) continue;
    if (on < 2 || !has("boss_laser_ready")) {
      memory[lbl("boss_laser_state") + i] = laserMode === "beam" ? 2 : 1;
      memory[lbl("boss_laser_timer") + i] = laserMode === "beam" ? 50 : 21;
      if (has("boss_laser_phase")) memory[lbl("boss_laser_phase") + i] = 0;
      memory[lbl("boss_laser_fired") + i] = 0;
      on += 1;
    } else {
      memory[lbl("boss_laser_state") + i] = 0;
      memory[lbl("boss_laser_ready") + i] = 1;
      memory[lbl("boss_laser_reload_lo") + i] = 0;
      memory[lbl("boss_laser_reload_hi") + i] = 0;
    }
  }
}
// S5-2: a volley's lead frames before the meeting - the controller's UPDATE
// only (no motion: the case's shots keep their columns), the player's shots
// put aside meanwhile.
function lead(memory, laserMode, frames) {
  const kept = [0, 1, 2, 3, 4].map((slot) => memory[ACTIVE + slot]);
  kept.forEach((_, slot) => { memory[ACTIVE + slot] = 0; });
  for (let f = 0; f < frames; f += 1) { hold(memory, laserMode); call(memory, lbl("boss_update")); }
  kept.forEach((value, slot) => { memory[ACTIVE + slot] = value; });
}
const burstLeft = (memory) => (finaleBuilt ? memory[lbl("_boss_burst_left")] : 0);
// S5-2: the hostile pool as the entry left it (a finale layout's setup frames
// fire volleys into a pool the harness never moves, which would drop every
// later spawn).
const HOSTILE_ARRAYS = ["FIGHTER_PROJECTILE_ACTIVE", "FIGHTER_PROJECTILE_X", "FIGHTER_PROJECTILE_Y",
  "FIGHTER_PROJECTILE_PREV_Y", "FIGHTER_PROJECTILE_LIFETIME"];
function entryPool(memory) {
  const fresh = entered();
  for (const name of HOSTILE_ARRAYS) {
    const base = main(name) + HOSTILE_BASE;
    memory.set(fresh.subarray(base, base + HOSTILE_LIMIT), base);
  }
}
function frame(memory, laserMode) {
  hold(memory, laserMode);
  memory[main("loader_dli_phase")] = 0;
  let cycles = nmi(memory, lbl("boss_dli"));
  cycles += call(memory, lbl("boss_update")).cycles;
  // RE-POINTED (fix/smoke-2026-10-07 P1): the band's shot cells are written at
  // SECTOR_COMPLETION now (boss_shots_late); counted with the boss's work (the
  // harness's VCOUNT reads 0, so the raster wait, which is idle, is not).
  cycles += call(memory, manifest.overlays.capitalVectors.address + 8 * 3).cycles;
  cycles += call(memory, lbl("boss_motion")).cycles;
  return cycles + nmi(memory, lbl("boss_dli")) + nmi(memory, lbl("boss_dli"));
}
// The front, exposed, live module of each visible column: module -> its first such column.
function fronts(memory, region) {
  const { left, right } = visibleCells(memory[lbl("boss_shown_pos")]);
  const exposed = memory[lbl("_boss_exposed_lo")] | (memory[lbl("_boss_exposed_hi")] << 8);
  const out = new Map();
  const map = memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
  map.forEach((module, column) => {
    if (column >= left && column <= right && module < region.modules.length && hp(memory, module) > 0 &&
      ((exposed >> module) & 1) !== 0 && !out.has(module)) out.set(module, column);
  });
  return out;
}
// The plates in `dead` destroyed one shot at a time, the queue then drained.
function destroy(memory, region, dead) {
  for (const module of dead) {
    const column = fronts(memory, region).get(module);
    if (column === undefined) return false;
    memory[lbl("_boss_hp") + module] = 1;
    shootAt(memory, column, 0);
    frame(memory, null);
  }
  for (let rest = 0; rest < 40; rest += 1) frame(memory, null);
  return memory[lbl("_boss_phase")] === 0;
}
function* subsets(list, k, from = 0, chosen = []) {
  if (chosen.length === k) { yield chosen; return; }
  for (let i = from; i < list.length; i += 1) yield* subsets(list, k, i + 1, [...chosen, list[i]]);
}
const reach = (k) => (k <= 2 ? "reachable" : "unproven");

// Every case of a layout: band positions x destroyed-plate sets x subsets of
// up to five front modules x kill / stage; each case's frame and the worst.
function sweep(region, { setup, deadSets, laserMode, volleys = false }) {
  const cases = [];
  for (const p of [0, 16, 32, 48, 63]) {
    for (const dead of deadSets) {
      const base = setup(p);
      if (!destroy(base, region, dead)) continue;
      if (volleys) entryPool(base);
      const front = fronts(base, region);
      const modules = [...front.keys()];
      for (let k = 1; k <= Math.min(5, modules.length); k += 1) {
        for (const hit of subsets(modules, k)) {
          for (const mode of ["kill", "stage"]) {
            const memory = Uint8Array.from(base);
            let valid = true;
            hit.forEach((module, slot) => {
              if (mode === "kill") memory[lbl("_boss_hp") + module] = 1;
              else {
                const stage = memory[lbl("_boss_stage") + module];
                const next = stage === 0 ? memory[lbl("_boss_crack") + module] + 1
                  : stage === 1 ? memory[lbl("_boss_break") + module] + 1 : 0;
                if (next < 2) valid = false; else memory[lbl("_boss_hp") + module] = next;
              }
              shootAt(memory, front.get(module), slot);
            });
            if (!valid) continue;
            // S5-1 (Q4): the case once per weapon firing on the meeting frame.
            // Since the owner's rule (B) a firing that falls on a kill frame is
            // held to the next frame, so the case runs on while it is pending.
            const runs = [];
            // S5-2: on a layout with volleys, each weapon also with its
            // volley's second and third shot due on the meeting frame.
            const steps = volleys ? ["countdown", "burst 2", "burst 3"] : ["countdown"];
            for (const [gun, step] of [...weapons(memory).flatMap((g) => steps.map((st) => [g, st])), [null, null]]) {
              if (gun === null && runs.length > 0) break;
              const run = Uint8Array.from(memory);
              if (gun !== null) arm(run, gun);
              if (step === "burst 2" || step === "burst 3") {
                lead(run, laserMode, step === "burst 2" ? 1 : 2);
                if (burstLeft(run) === 0 || run[lbl("_boss_phase")] !== 0) continue;   // no volley
              }
              let cycles = 0, worstFrame = 0, spawned = false, clashes = 0;
              // Up to four frames: the kept shots meet by f3 (two a frame),
              // and a firing held on f3's kill lands on f4.
              for (let f = 0; f < 4; f += 1) {
                const pending = gun !== null && !spawned &&
                  (run[lbl("_boss_countdown")] === 1 || burstLeft(run) > 0);
                if (f > 0 && live(run).length === 0 && !pending) break;
                if (f > 0) advance(run);
                const shots = bossShots(run), down = fallen(run);
                const c = frame(run, laserMode);
                const spawn = bossShots(run) > shots;
                if (spawn && fallen(run) > down) clashes += 1;
                spawned ||= spawn;
                if (c > cycles) { cycles = c; worstFrame = f + 1; }
              }
              runs.push({ cycles, worstFrame, gun: gun === null ? null : region.modules[gun].name, step, spawned, clashes });
            }
            const { cycles, worstFrame, gun, step, spawned } = runs.reduce((w, r) => (r.cycles > w.cycles ? r : w));
            const burstSpawns = runs.filter((r) => r.spawned && r.step !== null && r.step.startsWith("burst")).length;
            const clashes = runs.reduce((sum, r) => sum + r.clashes, 0);
            cases.push({
              cycles, worstFrame, p, k, mode, reach: reach(k), gun, step, spawned, clashes, burstSpawns,
              dead: dead.map((i) => region.modules[i].name), hit: hit.map((i) => region.modules[i].name),
              columns: hit.map((i) => front.get(i)),
            });
          }
        }
      }
    }
  }
  return cases;
}
const describe = (c) => `${c.cycles} native cycles (f${c.worstFrame}): ${c.k} ${c.mode}${c.k > 1 ? "s" : ""} ` +
  `[${c.hit}] at columns [${c.columns}], p ${c.p}, destroyed [${c.dead}]` +
  `${c.spawned ? `, ${c.gun} spawning` : c.gun === null ? ", no weapon armed" : `, ${c.gun} due, no spawn`}` +
  `${c.step === "burst 2" ? " (its volley's second shot)" : c.step === "burst 3" ? " (its volley's third shot)" : ""} (${c.reach})`;
function report(name, cases) {
  const worst = (filter) => cases.filter(filter).reduce((w, c) => (w === null || c.cycles > w.cycles ? c : w), null);
  for (const k of [1, 2, 3, 4, 5]) {
    const w = worst((c) => c.k === k);
    if (w !== null) console.log(`# ${name}, ${k} meeting${k > 1 ? "s" : ""}: ${describe(w)}`);
  }
  return { reachable: worst((c) => c.reach === "reachable"), all: worst(() => true) };
}

test("AUD-04: the audit's three cases on region 1 - distinct modules killed in one frame, the boss limit", () => {
  // Region 1 as entered, band at 32, one shot per column, the targets at HP 1.
  const results = [[30, 43, 50], [12, 30, 43], [12, 17, 21, 26, 30]].map((columns) => {
    const memory = entered();
    placeBand(memory, 32);
    const map = memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
    columns.forEach((column, slot) => {
      memory[lbl("_boss_hp") + map[column]] = 1;
      shootAt(memory, column, slot);
    });
    return { columns, cycles: frame(memory, null) };
  });
  for (const { columns, cycles } of results) console.log(`# audit columns ${columns.join("/")}: ${cycles} native cycles`);
  assert.deepEqual(results.filter(({ cycles }) => cycles > LIMIT).map(({ columns, cycles }) => `${columns.join("/")}: ${cycles}`),
    [], `over the ${LIMIT}-cycle limit`);
});

// The sweeps, run once and shared by the tests below.
const memo = (fn) => { let value = null; return () => (value ??= fn()); };
const region1Cases = memo(() => {
  const plates = region1.modules.map((m, i) => [m, i]).filter(([m]) => m.kind === "armour").map(([, i]) => i);
  return sweep(region1, {
    setup: (p) => { const memory = entered(); placeBand(memory, p); return memory; },
    deadSets: [[], ...plates.map((i) => [i]), plates],
    laserMode: null,
  });
});
const fixtureCases = memo(() => {
  const plates = fixture.modules.map((m, i) => [m, i]).filter(([m]) => m.kind === "armour").map(([, i]) => i);
  const deadSets = [...Array(1 << plates.length).keys()].map((mask) => plates.filter((_, b) => (mask >> b) & 1));
  return ["warn", "beam"].map((laserMode) => ({
    laserMode,
    cases: sweep(fixture, {
      setup: (p) => { const memory = entered(); installRegion(memory, fixture, { level: 9 }); placeBand(memory, p); return memory; },
      deadSets,
      laserMode,
    }),
  }));
});

// S5-2: the finale's layouts - in the finale (every plate destroyed) and one
// plate short of it - with the volleys' burst steps composed.
const finaleSets = (region) => {
  const plates = region.modules.map((m, i) => [m, i]).filter(([m]) => m.kind === "armour").map(([, i]) => i);
  return [plates, ...plates.map((last) => plates.filter((i) => i !== last))];
};
const placeholderCases = memo(() => sweep(placeholders, {
  setup: (p) => { const memory = entered(); installRegion(memory, placeholders, { level: 4 }); placeBand(memory, p); return memory; },
  deadSets: finaleSets(placeholders),
  laserMode: null,
  volleys: true,
}));
const fixtureFinaleCases = memo(() => ["warn", "beam"].map((laserMode) => ({
  laserMode,
  cases: sweep(fixtureFinale, {
    setup: (p) => { const memory = entered(); installRegion(memory, fixtureFinale, { level: 10 }); placeBand(memory, p); return memory; },
    deadSets: finaleSets(fixtureFinale),
    laserMode,
    volleys: true,
  }),
})));
const finaleLayouts = () => (!finaleBuilt ? [] : [["regions 2-4 (the finale)", placeholderCases()],
  ...(lasers ? fixtureFinaleCases().map(({ laserMode, cases }) => [`fixture with the finale, lasers ${laserMode}`, cases]) : [])]);

test("AUD-04: region 1 - every distinct-module kill and stage-change combination stays under the boss limit", () => {
  const cases = region1Cases();
  assert.ok(cases.length > 3000, `only ${cases.length} cases`);
  const covered = new Set(cases.flatMap((c) => c.hit));
  for (const name of ["plate-a", "plate-b", "plate-h"]) assert.ok(covered.has(name), `${name} never met`);
  const { reachable, all } = report("region 1", cases);
  console.log(`# region 1: ${cases.length} cases; worst reachable ${reachable.cycles}, worst ${all.cycles} (limit ${LIMIT})`);
  // RE-POINTED S5-1 (owner decision 2026-10-09 on BLOCKED_BOSS_STRESS_SPAWN):
  // the limit gates the reachable cases - at most two boss hits a frame, the
  // AUD-04 cap; the three-to-five-meeting figures are printed as information
  // (docs/diagnostics/s5-1-stress-spawn-blocked.md), no longer a gate.
  assert.ok(reachable.cycles <= LIMIT, `the worst reachable case is ${describe(reachable)}`);
});

test("AUD-04: the tier-4 fixture with four lasers - every combination stays under the boss limit", { skip: !lasers }, () => {
  const covered = new Set();
  const worst = [];
  for (const { laserMode, cases } of fixtureCases()) {
    cases.forEach((c) => c.hit.forEach((name) => covered.add(name)));
    const { reachable, all } = report(`fixture, lasers ${laserMode}`, cases);
    console.log(`# fixture, lasers ${laserMode}: ${cases.length} cases; worst reachable ${reachable.cycles}, ` +
      `worst ${all.cycles} (limit ${LIMIT})`);
    worst.push(reachable);
  }
  assert.deepEqual([...covered].sort(), fixture.modules.map((m) => m.name).sort(), "a module never met");
  // RE-POINTED S5-1 (owner decision 2026-10-09): the reachable cases are the gate (see region 1's test).
  const over = worst.filter((c) => c.cycles > LIMIT);
  assert.deepEqual(over.map(describe), [], `over the ${LIMIT}-cycle limit`);
});

// S5-1 (owner decision Q4): the composition must actually reach a kill frame
// on which a weapon's firing falls, and the worst case of every layout must
// include the spawn - otherwise the figure above is still the frame without
// it. Since the owner's rule (B) that firing is held to the next frame, so the
// subject is the kill cases whose spawn landed in the case's frames.
const layouts = () => [["region 1", region1Cases()],
  ...(lasers ? fixtureCases().map(({ laserMode, cases }) => [`fixture, lasers ${laserMode}`, cases]) : []),
  ...finaleLayouts()];
test("S5-1 (Q4): every layout's sweep reaches kill frames with a weapon's firing due, and its worst case includes the spawn", () => {
  for (const [name, cases] of layouts()) {
    const subject = cases.filter((c) => c.mode === "kill" && c.spawned);
    console.log(`# ${name}: ${subject.length} kill cases with a spawn of ${cases.length} cases`);
    assert.ok(subject.length > 0, `${name}: no kill case with a spawn (subject empty)`);
    for (const [label, worst] of [["reachable", cases.filter((c) => c.reach === "reachable")], ["all", cases]]
      .map(([l, list]) => [l, list.reduce((w, c) => (c.cycles > w.cycles ? c : w))])) {
      assert.ok(worst.spawned, `${name}: the worst ${label} case has no spawn: ${describe(worst)}`);
    }
  }
});

// The owner's rule (B), 2026-10-09: no frame has both a module kill and a gun's spawn.
test("S5-1 (B): no stress frame has both a module kill and a gun's spawn", () => {
  for (const [name, cases] of layouts()) {
    const subject = cases.filter((c) => c.mode === "kill" && c.gun !== null).length;
    const clashes = cases.reduce((sum, c) => sum + c.clashes, 0);
    console.log(`# ${name}: ${clashes} frames with a kill and a spawn over ${subject} kill cases with a gun due`);
    assert.ok(subject > 0, `${name}: no kill case with a gun due (subject empty)`);
    assert.equal(clashes, 0, `${name}: ${clashes} frames with a kill and a spawn`);
  }
});

// S5-2 (plan s5-boss-regions §6, owner answer Q4): the finale's layouts under
// the limit in force for regions 2 and 4 - 8,500 on the reachable cases.
test("S5-2: the finale's layouts - every combination, volleys' burst steps composed, stays under the boss limit", () => {
  assert.equal(new Set(Object.values(placeholderEntries).map((e) => JSON.stringify(e))).size, 1,
    "the region 2-4 placeholders differ: sweep each one");
  assert.ok(finaleBuilt, "the controller has no finale (no volley state to compose)");
  assert.ok(placeholders.fire.finaleCooldown > 0, "the placeholders carry no finale");
  const over = [];
  for (const [name, cases] of finaleLayouts()) {
    const { reachable, all } = report(name, cases);
    console.log(`# ${name}: ${cases.length} cases; worst reachable ${reachable.cycles}, worst ${all.cycles} (limit ${LIMIT})`);
    if (reachable.cycles > LIMIT) over.push(`${name}: ${describe(reachable)}`);
  }
  assert.deepEqual(over, [], `over the ${LIMIT}-cycle limit`);
});

test("S5-2: the burst step reaches the worst frames - kill cases with a volley's later shot, and each finale layout's worst reachable case spawns", () => {
  assert.ok(finaleBuilt, "the controller has no finale");
  for (const [name, cases] of finaleLayouts()) {
    const subject = cases.filter((c) => c.mode === "kill" && c.burstSpawns > 0);
    const burstWorst = cases.filter((c) => c.step !== null && c.step.startsWith("burst") && c.spawned).length;
    console.log(`# ${name}: ${subject.length} kill cases with a burst step's spawn; ${burstWorst} cases whose worst run is a burst step`);
    assert.ok(subject.length > 0, `${name}: no kill case with a burst step's spawn (subject empty)`);
    const worst = cases.filter((c) => c.reach === "reachable").reduce((w, c) => (c.cycles > w.cycles ? c : w));
    assert.ok(worst.spawned, `${name}: the worst reachable case has no spawn: ${describe(worst)}`);
  }
});

// ---------------------------------------------------------------------------
// The cap's behaviour (owner decision AUD-04, 2026-10-06)
// ---------------------------------------------------------------------------

const byName1 = new Map(region1.modules.map((m, i) => [m.name, i]));
const STATS_HITS = 0xae;                           // src/hybrid/level-summary-abi.inc
const score = (memory) => memory[main("score_bcd_lo")] | (memory[main("score_bcd_hi")] << 8);
const bcd = (value) => Number(value.toString(16));
// One frame with the kills and the controller's hits counted.
function counted(memory, laserMode = null) {
  let kills = 0, hits = 0;
  const scored = lbl("boss_module_scored"), hit = lbl("_boss_c_hit");
  hold(memory, laserMode);
  memory[main("loader_dli_phase")] = 0;
  nmi(memory, lbl("boss_dli"));
  call(memory, lbl("boss_update"), { watch: (pc) => { if (pc === scored) kills += 1; if (pc === hit) hits += 1; } });
  nmi(memory, lbl("boss_dli"));
  nmi(memory, lbl("boss_dli"));
  return { kills, hits };
}
function plates(names, hpOf, p = 32) {
  const memory = entered();
  placeBand(memory, p);
  const front = fronts(memory, region1);
  const ids = names.map((name) => byName1.get(name));
  ids.forEach((id, slot) => {
    memory[lbl("_boss_hp") + id] = hpOf;
    shootAt(memory, front.get(id), slot);
  });
  return { memory, ids };
}

test("AUD-04 cap: a SPREAD volley meeting three distinct modules lands over two frames, each hit counted once", () => {
  // plate-f, plate-g and plate-h share one meeting line (their bottoms on row
  // 8): a SPREAD volley's three shots, on one Y, meet them in the same frame.
  const { memory, ids } = plates(["plate-f", "plate-g", "plate-h"], 5);
  const hits0 = memory[STATS_HITS];
  const first = counted(memory);
  const hpAfter1 = ids.map((id) => hp(memory, id));
  assert.equal(first.hits, 2, "two shots meet the boss on the first frame");
  assert.deepEqual(hpAfter1.filter((v) => v === 4).length, 2, `hit points after the first frame: ${hpAfter1}`);
  assert.deepEqual(live(memory), [0], "the third shot is kept in flight");
  advance(memory);
  const second = counted(memory);
  assert.equal(second.hits, 1, "the kept shot meets on the next frame");
  assert.deepEqual(ids.map((id) => hp(memory, id)), [4, 4, 4], "every module lost exactly one hit point");
  assert.deepEqual(live(memory), [], "no shot left over");
  assert.equal(memory[STATS_HITS] - hits0, 3, "accuracy counts three hits");
  advance(memory);
  assert.equal(counted(memory).hits, 0, "nothing meets a third time");
});

test("AUD-04 cap: three kills in one volley - score and kills counted once each, over two frames", () => {
  const { memory, ids } = plates(["plate-f", "plate-g", "plate-h"], 1);
  const before = score(memory);
  const hits0 = memory[STATS_HITS];
  const first = counted(memory);
  advance(memory);
  const second = counted(memory);
  assert.deepEqual([first.kills, second.kills], [2, 1], "two kills, then the third");
  assert.deepEqual(ids.map((id) => hp(memory, id)), [0, 0, 0]);
  // Each module's score, measured alone: one kill, one shot, a fresh boss.
  const worth = ["plate-f", "plate-g", "plate-h"].reduce((sum, name) => {
    const alone = plates([name], 1).memory;
    const from = score(alone);
    counted(alone);
    return sum + bcd(score(alone)) - bcd(from);
  }, 0);
  assert.ok(worth > 0, "the modules score nothing");
  assert.equal(bcd(score(memory)) - bcd(before), worth, "the score gained is not the three modules' scores once");
  assert.equal(memory[STATS_HITS] - hits0, 3, "accuracy counts three hits");
  advance(memory);
  assert.deepEqual(counted(memory), { kills: 0, hits: 0 }, "no hit or kill counted twice");
});

test("AUD-04 cap: a kept shot whose target died meanwhile meets what its column then holds, as a fresh shot would", () => {
  // The loop takes the slots from 4 down. Frame 1: slots 4 and 3 hit plate-g
  // and plate-h, slot 2 - in plate-d's column - is kept. Frame 2: a fresh shot
  // in slot 4 kills plate-d before slot 2 is tested again, against the
  // columns plate-d's kill rebuilt.
  const d = byName1.get("plate-d"), g = byName1.get("plate-g"), h = byName1.get("plate-h");
  const memory = entered();
  placeBand(memory, 32);
  const front = fronts(memory, region1);
  memory[lbl("_boss_hp") + d] = 1;
  memory[lbl("_boss_hp") + g] = 5;
  memory[lbl("_boss_hp") + h] = 5;
  shootAt(memory, front.get(g), 4);
  shootAt(memory, front.get(h), 3);
  shootAt(memory, front.get(d), 2);
  const keptX = memory[main("FIGHTER_PROJECTILE_X") + 2], keptY = memory[SHOT_Y + 2];
  assert.equal(counted(memory).hits, 2);
  assert.deepEqual(live(memory), [2], "the third shot is kept");
  assert.equal(hp(memory, d), 1, "plate-d is untouched while its shot waits");
  advance(memory);
  assert.equal(memory[SHOT_Y + 2], keptY, "the kept shot waited where it was");
  shootAt(memory, front.get(d), 4);              // plate-d's killer, tested first
  // The control: the same frame with the kept shot replaced by a fresh one at its place.
  const control = Uint8Array.from(memory);
  control[ACTIVE + 2] = 1;
  control[main("FIGHTER_PROJECTILE_X") + 2] = keptX;
  control[SHOT_Y + 2] = keptY;
  const kept = counted(memory), fresh = counted(control);
  assert.equal(hp(memory, d), 0, "plate-d fell to the fresh shot");
  assert.deepEqual(kept, fresh, "the kept shot met otherwise than a fresh shot");
  const state = (m) => ({
    hp: [...m.subarray(lbl("_boss_hp"), lbl("_boss_hp") + region1.modules.length)],
    hits: m[STATS_HITS], score: score(m), live: live(m),
    y: live(m).map((slot) => m[SHOT_Y + slot]),
    map: [...m.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)],
  });
  assert.deepEqual(state(memory), state(control));
});

test("AUD-04 cap: a beam that covers a kept shot's column while it waits absorbs it (Q6)", { skip: !lasers }, () => {
  // The tier-4 fixture: emitter-2's laser one warning frame from its beam
  // (RE-POINTED S4b.1, owner decision D1: gun-3 is a pulse gun again; the
  // fixture's slot-2 emitter is the dedicated emitter-2). Frame 1: slots 4
  // and 3 meet plate-a and plate-b; slot 2, in emitter-2's column under the
  // warning, is kept. Frame 2: the beam is on and absorbs it.
  const names = new Map(fixture.modules.map((m, i) => [m.name, i]));
  const memory = entered();
  installRegion(memory, fixture, { level: 9 });
  placeBand(memory, 32);
  const front = fronts(memory, fixture);
  const gun3 = names.get("emitter-2");
  const laser = [0, 1, 2, 3].find((i) => memory[lbl("boss_laser_module") + i] === gun3);
  memory[lbl("boss_laser_state") + laser] = 1;
  memory[lbl("boss_laser_timer") + laser] = 1;
  memory[lbl("boss_laser_fired") + laser] = 0;
  memory[main("player_x")] = 60;                   // the player away from the beam
  shootAt(memory, front.get(names.get("plate-a")), 4);
  shootAt(memory, front.get(names.get("plate-b")), 3);
  const centre = fixture.modules[gun3].x + (fixture.modules[gun3].width >> 1);   // the beam's column
  assert.equal(memory[lbl("boss_column_map") + centre], gun3);
  shootAt(memory, centre, 2);
  const gun3Hp = hp(memory, gun3);
  const hits0 = memory[STATS_HITS];
  assert.equal(counted(memory).hits, 2);
  assert.deepEqual(live(memory), [2], "the shot under the warning is kept");
  assert.equal(memory[lbl("boss_laser_state") + laser], 2, "the beam is on for the next frame");
  advance(memory);
  assert.equal(counted(memory).hits, 0, "the kept shot met gun-3 through the beam");
  assert.deepEqual(live(memory), [], "the beam did not absorb the kept shot");
  assert.equal(hp(memory, gun3), gun3Hp, "gun-3 took the absorbed shot's damage");
  assert.equal(memory[STATS_HITS] - hits0, 2, "the absorbed shot counted as a hit");
});
