// S5-3 (feat/boss-region-3, plan docs/plans/s5-boss-regions.md §6.3): the
// boss-sector stress composition (tests/boss-stress.test.mjs's accounting -
// the band DLI's three phases, UPDATE, SECTOR_COMPLETION and MOTION, native
// cycles) on a region with the force field, entered through the real boss
// entry (the window's resident half, the head's reads from the built disk), so
// the field's code is read into slot F as the game reads it.
//
//   node scripts/measure-boss-stress-field.mjs [--level=9]      (default level 7)
//   VS65_HARNESS_BUILD=<dir under build/> node scripts/... (another build)
//
// The cases: every band position of five, the generators and the plates
// destroyed in every combination (each half collapsed), one to five front
// modules met (kill or a stage change), the lasers held in a warning's heat
// frame or their beams (two on, the others ready), each armed weapon's firing
// due on the meeting frame (held to the next by rule (B)); and the field's own
// frames - a shot absorbed by a powered half (alone or beside a module met)
// and a half collapsing on the meeting frame. The figure of a case is its
// worst frame; "reachable" is at most two meetings a frame (AUD-04's cap).
// tests/boss-region-3.test.mjs gates the figures. MEASURED, native.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { call, label, manifest, nmi, placeBand, root, runBossEntry, shootAt, visibleCells } from "../tests/boss-harness.mjs";

export function fieldStress({ level = 7 } = {}) {
const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const LIMIT = 8500;
const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
if (entry.end !== "main_loop") throw new Error(`the boss entry ended at ${entry.end}`);
const entered = () => Uint8Array.from(entry.memory);
const hp = (memory, i) => memory[lbl("_boss_hp") + i];
const count = entered()[lbl("_boss_count")];
const LIFECYCLE = main("PLAYER_LIFECYCLE");
const COOLDOWN = main("BROAD_DAMAGE_COOLDOWN");
const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE"), SHOT_Y = main("FIGHTER_PROJECTILE_Y");
const SPEED = 6;
const advance = (memory) => { for (let s = 0; s < 5; s += 1) if (memory[ACTIVE + s] !== 0) memory[SHOT_Y + s] -= SPEED; };
const live = (memory) => [0, 1, 2, 3, 4].filter((s) => memory[ACTIVE + s] !== 0);
const KIND_EMITTER = 2;
const BOSS_SHOT_ACTIVE = 0x0e;
const HOSTILE_BASE = 5, HOSTILE_LIMIT = 5;
const armedMask = (m) => m[lbl("_boss_armed_lo")] | (m[lbl("_boss_armed_hi")] << 8);
const weapons = (m) => [...Array(count).keys()]
  .filter((i) => ((armedMask(m) >> i) & 1) !== 0 && m[lbl("_boss_kind") + i] !== KIND_EMITTER);
function arm(m, module) {
  const armed = armedMask(m);
  let previous = module;
  do previous = (previous + count - 1) % count; while (((armed >> previous) & 1) === 0);
  m[lbl("_boss_cursor")] = previous;
  m[lbl("_boss_countdown")] = 1;
}
const bossShots = (m) => [...Array(HOSTILE_LIMIT).keys()].filter((i) => m[ACTIVE + HOSTILE_BASE + i] === BOSS_SHOT_ACTIVE).length;
const fallen = (m) => [...Array(count).keys()].filter((i) => hp(m, i) === 0).length;
function hold(m, laserMode) {
  m[LIFECYCLE] = 0;
  m[LIFECYCLE + 1] = 3;
  m[COOLDOWN] = 25;
  if (laserMode === null) return;
  let on = 0;
  for (let i = 0; i < 4; i += 1) {
    const module = m[lbl("boss_laser_module") + i];
    if (module === 0xff || hp(m, module) === 0) continue;
    if (on < 2) {
      m[lbl("boss_laser_state") + i] = laserMode === "beam" ? 2 : 1;
      m[lbl("boss_laser_timer") + i] = laserMode === "beam" ? 50 : 21;
      m[lbl("boss_laser_phase") + i] = 0;
      m[lbl("boss_laser_fired") + i] = 0;
      on += 1;
    } else {
      m[lbl("boss_laser_state") + i] = 0;
      m[lbl("boss_laser_ready") + i] = 1;
      m[lbl("boss_laser_reload_lo") + i] = 0;
      m[lbl("boss_laser_reload_hi") + i] = 0;
    }
  }
}
function frame(m, laserMode) {
  hold(m, laserMode);
  m[main("loader_dli_phase")] = 0;
  let cycles = nmi(m, lbl("boss_dli"));
  cycles += call(m, lbl("boss_update")).cycles;
  cycles += call(m, manifest.overlays.capitalVectors.address + 8 * 3).cycles;
  cycles += call(m, lbl("boss_motion")).cycles;
  return cycles + nmi(m, lbl("boss_dli")) + nmi(m, lbl("boss_dli"));
}
const map = (m) => m.subarray(lbl("boss_column_map"), lbl("boss_column_map") + 64);
function fronts(m) {
  const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
  const exposed = m[lbl("_boss_exposed_lo")] | (m[lbl("_boss_exposed_hi")] << 8);
  const out = new Map();
  map(m).forEach((module, column) => {
    if (column >= left && column <= right && module < count && hp(m, module) > 0 &&
      ((exposed >> module) & 1) !== 0 && !out.has(module)) out.set(module, column);
  });
  return out;
}
// The visible field columns of a powered half (the column map's ARMOUR with
// the field's stop line), one per half.
const FIELD_STOP_Y = 24 + 8 * 8;
function fieldColumns(m) {
  const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
  const stop = m.subarray(lbl("boss_stop_y"), lbl("boss_stop_y") + 64);
  const out = [];
  map(m).forEach((value, column) => {
    if (column >= left && column <= right && value === 0xfe && stop[column] === FIELD_STOP_Y &&
      !out.some((c) => Math.abs(c - column) < 8)) out.push(column);
  });
  return out;
}
function destroy(m, dead) {
  for (let f = 0; f < 2; f += 1) frame(m, null);           // the field's init on the first frame
  for (const module of dead) {
    let column = fronts(m).get(module);
    for (let wait = 0; column === undefined && wait < 64; wait += 1) { frame(m, null); column = fronts(m).get(module); }
    if (column === undefined) return false;
    m[lbl("_boss_hp") + module] = 1;
    shootAt(m, column, 0);
    frame(m, null);
  }
  for (let rest = 0; rest < 60; rest += 1) frame(m, null); // the halves collapse, the queue drains
  return m[lbl("_boss_phase")] === 0;
}
function* subsets(list, k, from = 0, chosen = []) {
  if (chosen.length === k) { yield chosen; return; }
  for (let i = from; i < list.length; i += 1) yield* subsets(list, k, i + 1, [...chosen, list[i]]);
}
const fieldHalf = lbl("field_half"), fieldCursor = lbl("field_cursor");
// A half collapsing on the meeting frame: its generator already destroyed,
// the cursor at the half's middle column, that column still the field's.
function collapsing(m, half, column) {
  m[fieldHalf + half] = 1;
  m[fieldCursor + half] = column;
  m[lbl("boss_column_map") + column] = 0xfe;
  m[lbl("boss_stop_y") + column] = FIELD_STOP_Y;
}
const field = manifest.boss.regions[2].field;
const fieldRow = field.rowCells;
const fieldCode = entry.memory[fieldRow + field.halves[0].from];   // the field glyph, as the entry drew it
const kinds = [...Array(count).keys()].map((i) => entered()[lbl("_boss_kind") + i]);
const tableKind = (i) => entered()[label("boss", "_boss_module_table") + 12 * i + 7] & 0x0f;
const plates = [...Array(count).keys()].filter((i) => tableKind(i) === 0 && kinds[i] === 0);
const gens = [0, 1].map((h) => entered()[lbl("field_gen_a") + h]);
const armour = plates.filter((i) => !gens.includes(i));
const deadSets = [];
for (const g of [[], [gens[0]], [gens[1]], gens]) {
  for (let mask = 0; mask < (1 << armour.length); mask += 1) deadSets.push([...g, ...armour.filter((_, b) => (mask >> b) & 1)]);
}

const cases = [];
for (const laserMode of ["warn", "beam"]) {
  for (const p of [0, 16, 32, 48, 63]) {
    for (const dead of deadSets) {
      const base = entered();
      placeBand(base, p);
      if (!destroy(base, dead)) continue;
      const front = fronts(base);
      const modules = [...front.keys()];
      const field = fieldColumns(base);
      const halvesDown = [0, 1].filter((h) => base[fieldHalf + h] === 2);
      const variants = [{ collapse: null }, ...halvesDown.map((h) => ({ collapse: h }))];
      for (const { collapse } of variants) {
        // Meetings: up to five modules, and the field's absorb (one shot into
        // a powered half's column) beside up to one module.
        const plans = [];
        for (let k = 1; k <= Math.min(5, modules.length); k += 1) {
          for (const hit of subsets(modules, k)) for (const mode of ["kill", "stage"]) plans.push({ hit, mode, absorb: [] });
        }
        for (const column of field) {
          plans.push({ hit: [], mode: "kill", absorb: [column] });
          for (const module of modules) for (const mode of ["kill", "stage"]) plans.push({ hit: [module], mode, absorb: [column] });
        }
        for (const { hit, mode, absorb } of plans) {
          const m = Uint8Array.from(base);
          if (collapse !== null) {
            const half = collapse;
            const from = m[lbl("field_from") + half], last = m[lbl("field_end") + half] - 1;
            const middle = (from + last) >> 1;
            collapsing(m, half, middle);
            m[fieldRow + middle] = fieldCode;
          }
          let valid = true;
          hit.forEach((module, slot) => {
            if (mode === "kill") m[lbl("_boss_hp") + module] = 1;
            else {
              const stage = m[lbl("_boss_stage") + module];
              const next = stage === 0 ? m[lbl("_boss_crack") + module] + 1 : stage === 1 ? m[lbl("_boss_break") + module] + 1 : 0;
              if (next < 2) valid = false; else m[lbl("_boss_hp") + module] = next;
            }
            shootAt(m, front.get(module), slot);
          });
          if (!valid) continue;
          absorb.forEach((column, i) => shootAt(m, column, hit.length + i));
          const meetings = hit.length + absorb.length;
          const runs = [];
          for (const gun of [...weapons(m), null]) {
            if (gun === null && runs.length > 0) break;
            const run = Uint8Array.from(m);
            if (gun !== null) arm(run, gun);
            let cycles = 0, worstFrame = 0, spawned = false, clashes = 0;
            for (let f = 0; f < 4; f += 1) {
              const pending = gun !== null && !spawned && run[lbl("_boss_countdown")] === 1;
              if (f > 0 && live(run).length === 0 && !pending) break;
              if (f > 0) advance(run);
              const shots = bossShots(run), down = fallen(run);
              const c = frame(run, laserMode);
              const spawn = bossShots(run) > shots;
              if (spawn && fallen(run) > down) clashes += 1;
              spawned ||= spawn;
              if (c > cycles) { cycles = c; worstFrame = f + 1; }
            }
            runs.push({ cycles, worstFrame, gun, spawned, clashes });
          }
          const worst = runs.reduce((w, r) => (r.cycles > w.cycles ? r : w));
          cases.push({ laserMode, p, dead, collapse, hit, mode, absorb, meetings, ...worst,
            clashes: runs.reduce((s, r) => s + r.clashes, 0), reach: meetings <= 2 ? "reachable" : "unproven" });
        }
      }
    }
  }
}
const describe = (c) => `${c.cycles} (f${c.worstFrame}) lasers ${c.laserMode}, p ${c.p}, ${c.meetings} meeting(s): ` +
  `${c.hit.length} ${c.mode}${c.absorb.length ? ` + ${c.absorb.length} absorbed at ${c.absorb}` : ""}, ` +
  `destroyed [${c.dead}]${c.collapse === null ? "" : `, half ${c.collapse} collapsing`}` +
  `${c.spawned ? `, module ${c.gun} spawning` : ""} (${c.reach})`;
const worstOf = (list) => list.reduce((w, c) => (w === null || c.cycles > w.cycles ? c : w), null);
return { cases, describe, worstOf, level };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const levelArgument = process.argv.find((a) => a.startsWith("--level="));
  const { cases, describe, worstOf, level } = fieldStress({
    level: levelArgument === undefined ? 7 : Number(levelArgument.slice("--level=".length)) });
  console.log(`# region 3, level ${level}: ${cases.length} cases`);
  for (const laserMode of ["warn", "beam"]) {
    const subset = cases.filter((c) => c.laserMode === laserMode);
    console.log(`# lasers ${laserMode}: worst reachable ${describe(worstOf(subset.filter((c) => c.reach === "reachable")))}`);
    console.log(`#   worst any: ${describe(worstOf(subset))}`);
    console.log(`#   worst absorb: ${describe(worstOf(subset.filter((c) => c.absorb.length > 0 && c.reach === "reachable")))}`);
    console.log(`#   worst collapse: ${describe(worstOf(subset.filter((c) => c.collapse !== null && c.reach === "reachable")))}`);
  }
  console.log(`# frames with a kill and a spawn: ${cases.reduce((s, c) => s + c.clashes, 0)}`);
}
