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
import assert from "node:assert/strict";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import {
  call, installRegion, label, labelsOf, nmi, placeBand, root, runBossEntry, shootAt, visibleCells,
} from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const lasers = labelsOf.boss.has("laser_frame");
const LIMIT = lasers ? 8500 : 7000;
const { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } = assets;
const region1 = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 1)));
const fixture = lasers
  ? compileBossRegion(assets.bossLaserFixtureDraft(loadBossRegionDraft(bossRegionDirectory(root, 1)))) : null;

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

function hold(memory, laserMode) {
  memory[LIFECYCLE] = 0;
  memory[LIFECYCLE + 1] = 3;
  memory[COOLDOWN] = 25;
  if (laserMode === null) return;
  for (let i = 0; i < 4; i += 1) {
    const module = memory[lbl("boss_laser_module") + i];
    if (module === 0xff || hp(memory, module) === 0) continue;
    memory[lbl("boss_laser_state") + i] = laserMode === "beam" ? 2 : 1;
    memory[lbl("boss_laser_timer") + i] = laserMode === "beam" ? 50 : 21;
    memory[lbl("boss_laser_fired") + i] = 0;
  }
}
function frame(memory, laserMode) {
  hold(memory, laserMode);
  memory[main("loader_dli_phase")] = 0;
  let cycles = nmi(memory, lbl("boss_dli"));
  cycles += call(memory, lbl("boss_update")).cycles;
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
function sweep(region, { setup, deadSets, laserMode }) {
  const cases = [];
  for (const p of [0, 16, 32, 48, 63]) {
    for (const dead of deadSets) {
      const base = setup(p);
      if (!destroy(base, region, dead)) continue;
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
            let cycles = frame(memory, laserMode);
            for (let next = 0; next < 2 && live(memory).length > 0; next += 1) {
              advance(memory);
              cycles = Math.max(cycles, frame(memory, laserMode));
            }
            cases.push({
              cycles, p, k, mode, reach: reach(k),
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
const describe = (c) => `${c.cycles} native cycles: ${c.k} ${c.mode}${c.k > 1 ? "s" : ""} ` +
  `[${c.hit}] at columns [${c.columns}], p ${c.p}, destroyed [${c.dead}] (${c.reach})`;
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

test("AUD-04: region 1 - every distinct-module kill and stage-change combination stays under the boss limit", () => {
  const plates = region1.modules.map((m, i) => [m, i]).filter(([m]) => m.kind === "armour").map(([, i]) => i);
  const cases = sweep(region1, {
    setup: (p) => { const memory = entered(); placeBand(memory, p); return memory; },
    deadSets: [[], ...plates.map((i) => [i]), plates],
    laserMode: null,
  });
  assert.ok(cases.length > 3000, `only ${cases.length} cases`);
  const covered = new Set(cases.flatMap((c) => c.hit));
  for (const name of ["plate-a", "plate-b", "plate-h"]) assert.ok(covered.has(name), `${name} never met`);
  const { reachable, all } = report("region 1", cases);
  console.log(`# region 1: ${cases.length} cases; worst reachable ${reachable.cycles}, worst ${all.cycles} (limit ${LIMIT})`);
  assert.ok(all.cycles <= LIMIT, `the worst case is ${describe(all)}`);
});

test("AUD-04: the tier-4 fixture with four lasers - every combination stays under the boss limit", { skip: !lasers }, () => {
  const plates = fixture.modules.map((m, i) => [m, i]).filter(([m]) => m.kind === "armour").map(([, i]) => i);
  const deadSets = [...Array(1 << plates.length).keys()].map((mask) => plates.filter((_, b) => (mask >> b) & 1));
  const covered = new Set();
  const worst = [];
  for (const laserMode of ["warn", "beam"]) {
    const cases = sweep(fixture, {
      setup: (p) => { const memory = entered(); installRegion(memory, fixture, { level: 9 }); placeBand(memory, p); return memory; },
      deadSets,
      laserMode,
    });
    cases.forEach((c) => c.hit.forEach((name) => covered.add(name)));
    const { reachable, all } = report(`fixture, lasers ${laserMode}`, cases);
    console.log(`# fixture, lasers ${laserMode}: ${cases.length} cases; worst reachable ${reachable.cycles}, ` +
      `worst ${all.cycles} (limit ${LIMIT})`);
    worst.push(all);
  }
  assert.deepEqual([...covered].sort(), fixture.modules.map((m) => m.name).sort(), "a module never met");
  const over = worst.filter((c) => c.cycles > LIMIT);
  assert.deepEqual(over.map(describe), [], `over the ${LIMIT}-cycle limit`);
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
  // A module's score is one packed-BCD byte, added once when it is destroyed.
  const worth = ids.reduce((sum, id) => sum + bcd(region1.modules[id].score), 0);
  assert.equal(bcd(score(memory)) - bcd(before), worth, "the score gained is not the three modules' scores once");
  assert.equal(memory[STATS_HITS] - hits0, 3, "accuracy counts three hits");
  advance(memory);
  assert.deepEqual(counted(memory), { kills: 0, hits: 0 }, "no hit or kill counted twice");
});

test("AUD-04 cap: a kept shot whose target died meanwhile meets what its column then holds, as a fresh shot would", () => {
  // The loop takes the slots from 4 down: slot 2 kills plate-d, slot 1 hits
  // plate-g, slot 0 - in plate-d's column too - waits a frame.
  const d = byName1.get("plate-d"), g = byName1.get("plate-g");
  const start = () => {
    const memory = entered();
    placeBand(memory, 32);
    const front = fronts(memory, region1);
    memory[lbl("_boss_hp") + d] = 1;
    memory[lbl("_boss_hp") + g] = 5;
    shootAt(memory, front.get(d), 2);
    shootAt(memory, front.get(g), 1);
    return { memory, column: front.get(d) };
  };
  const waiting = start();
  shootAt(waiting.memory, waiting.column, 0);
  const shotX = waiting.memory[main("FIGHTER_PROJECTILE_X")];
  const shotY = waiting.memory[SHOT_Y];
  counted(waiting.memory);
  assert.equal(hp(waiting.memory, d), 0, "plate-d fell on the first frame");
  assert.deepEqual(live(waiting.memory), [0], "the third shot waits");
  advance(waiting.memory);
  assert.equal(waiting.memory[SHOT_Y], shotY, "it waited where it was");
  const afterWait = counted(waiting.memory);
  // The same frame with a fresh shot at the waiting shot's place.
  const fresh = start();
  counted(fresh.memory);
  advance(fresh.memory);
  fresh.memory[ACTIVE] = 1;
  fresh.memory[main("FIGHTER_PROJECTILE_X")] = shotX;
  fresh.memory[SHOT_Y] = shotY;
  fresh.memory[main("FIGHTER_PROJECTILE_LIFETIME")] = waiting.memory[main("FIGHTER_PROJECTILE_LIFETIME")];
  const afterFresh = counted(fresh.memory);
  assert.deepEqual(afterWait, afterFresh, "the kept shot's meeting differs from a fresh shot's");
  const state = (memory) => ({
    hp: [...memory.subarray(lbl("_boss_hp"), lbl("_boss_hp") + region1.modules.length)],
    hits: memory[STATS_HITS], score: score(memory), live: live(memory),
    map: [...memory.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64)],
  });
  assert.deepEqual(state(waiting.memory), state(fresh.memory));
});
