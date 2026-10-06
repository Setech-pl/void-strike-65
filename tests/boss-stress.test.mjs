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
            cases.push({
              cycles: frame(memory, laserMode), p, k, mode, reach: reach(k),
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
