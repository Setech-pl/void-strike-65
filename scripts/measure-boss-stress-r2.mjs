// S5-5 (feat/boss-region-2, plan docs/plans/s5-boss-regions.md §6.5): the
// boss-sector stress composition (tests/boss-stress.test.mjs's accounting -
// the band DLI's three phases, UPDATE, SECTOR_COMPLETION and MOTION, native
// cycles) on region 2, the Bastion, entered through the real boss entry at
// level 4 (tier 1: the twin cannons, one beam) or level 5 (tier 2: the
// cannons independent, two beams) from a build's disk, so region 2's block -
// its rails' code - is read into slot F as the game reads it.
//
//   node scripts/measure-boss-stress-r2.mjs [--level=4|5]     (on the default build;
//   tests/boss-region-2.test.mjs gates it)
//
// The cases: the rails at every pair of positions (each reached through the
// game: its front guns shot down at HP 1, its slides run to the end), with
// both cannons standing or both destroyed; then
//   kill frames - one to three front modules met (a kill or a stage change),
//     each armed weapon's firing due on the meeting frame;
//   step frames - a slide under way on one side with its column step due on
//     the frame (the step runs on a frame with no kill and no exposure check):
//     none to two front modules met without a kill (a stage change, or a
//     shot the hull or a covered cannon's rail absorbs), each armed weapon's
//     firing due;
// the lasers held in a warning's heat frame or their beams (two on when the
// tier has two, the others ready). A case's figure is its worst frame;
// "reachable" is at most two meetings a frame (AUD-04's cap). MEASURED,
// native. The escort's own Light tick runs outside these routines (the
// catch harness measures it: 532 native worst, plan interceptor-speed).
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bandDliSwitches, call, label, manifest, nmi, placeBand, runBossEntry, shootAt, visibleCells } from "../tests/boss-harness.mjs";

export function regionTwoStress({ level = 4, maxMeetings = 3 } = {}) {
  const lbl = (name) => label("boss", name);
  const main = (name) => label("main", name);
  const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
  if (entry.end !== "main_loop") throw new Error(`the boss entry ended at ${entry.end}`);
  if (entry.memory[0x526e] !== 0x4c) throw new Error("region 2's block carries no rail code on this disk");
  // feat/boss-order-scale: the Bastion wherever the order put it (its rails).
  const region = manifest.boss.regions.find((candidate) => candidate.rails) ?? manifest.boss.regions[1];
  const rails = region.rails;
  const entered = () => Uint8Array.from(entry.memory);
  const hp = (memory, i) => memory[lbl("_boss_hp") + i];
  const count = entered()[lbl("_boss_count")];
  const LIFECYCLE = main("PLAYER_LIFECYCLE");
  const COOLDOWN = main("BROAD_DAMAGE_COOLDOWN");
  const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE"), SHOT_Y = main("FIGHTER_PROJECTILE_Y");
  const SPEED = 6;
  const advance = (m) => { for (let s = 0; s < 5; s += 1) if (m[ACTIVE + s] !== 0) m[SHOT_Y + s] -= SPEED; };
  const live = (m) => [0, 1, 2, 3, 4].filter((s) => m[ACTIVE + s] !== 0);
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
      }
    }
  }
  function frame(m, laserMode) {
    hold(m, laserMode);
    m[main("loader_dli_phase")] = 0;
    let cycles = nmi(m, lbl("boss_dli"));
    // feat/boss-art: the row palette's switch DLIs (tests/boss-art.test.mjs).
    cycles += bandDliSwitches(m).cycles;
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
      if (column >= Math.max(left, 14) && column <= right && module < count && hp(m, module) > 0 &&
        ((exposed >> module) & 1) !== 0 && !out.has(module)) out.set(module, column);
    });
    return out;
  }
  // A column whose shot the hull absorbs: a rail's girder or socket, a
  // covered cannon's rail (the map's ARMOUR in reach).
  function hullColumn(m) {
    const { left, right } = visibleCells(m[lbl("boss_shown_pos")]);
    for (let c = Math.max(left, 14); c <= right; c += 1) if (map(m)[c] === 0xfe && m[lbl("boss_stop_y") + c] > 0) return c;
    return null;
  }
  const settle = (m, frames = 60) => { for (let f = 0; f < frames; f += 1) frame(m, null); };
  // Destroy a module through the game's own path: a shot at HP 1.
  function destroy(m, module) {
    let column = fronts(m).get(module);
    for (let wait = 0; column === undefined && wait < 120; wait += 1) { frame(m, null); column = fronts(m).get(module); }
    if (column === undefined) return false;
    m[lbl("_boss_hp") + module] = 1;
    shootAt(m, column, 0);
    frame(m, null);
    return true;
  }
  // The modules' names: each rail's guns front first (l1.., r1..), the
  // cannons, the doors and the core by kind.
  const nameOf = new Map();
  const tableKind = (i) => entered()[lbl("_boss_module_table") + 12 * i + 7] & 0x0f;
  const kinds = [...Array(count).keys()].map(tableKind);
  const gunsOf = (s) => {
    // The side's lowest gun module: rail_guns + 2 + side (boss-rail.inc).
    const first = entered()[lbl("rail_guns") + 2 + (s.name === "left" ? 0 : 1)];
    const ids = [...Array(s.guns.length).keys()].map((i) => first + i);
    return s.dir > 0 ? ids.reverse() : ids;   // front first: the left rail's front gun has the highest index
  };
  const cannons = [...Array(count).keys()].filter((i) => kinds[i] === KIND_EMITTER);
  for (const s of rails.sides) gunsOf(s).forEach((i, k) => nameOf.set(i, `${s.name[0]}${k + 1}`));
  cannons.forEach((i, k) => nameOf.set(i, k === 0 ? "cannon-l" : "cannon-r"));
  const describeModule = (i) => nameOf.get(i) ?? (kinds[i] === 0 ? "doors" : kinds[i] === 3 ? "core" : `#${i}`);
  const cases = [];
  const states = [];
  for (const cannonsDead of [false, true]) {
    for (let kl = 0; kl <= rails.positions; kl += 1) {
      for (let kr = 0; kr <= rails.positions; kr += 1) states.push({ cannonsDead, k: [kl, kr] });
    }
  }
  for (const laserMode of ["warn", "beam"]) {
    for (const state of states) {
      const base = entered();
      placeBand(base, region.stillAt ?? 32);
      settle(base, 2);
      let ok = true;
      if (state.cannonsDead) for (const c of cannons) ok &&= destroy(base, c);
      rails.sides.forEach((s, si) => {
        const guns = gunsOf(s);
        for (let k = 0; k < state.k[si] && ok; k += 1) { ok &&= destroy(base, guns[k]); settle(base, 60); }
      });
      settle(base, 40);
      if (!ok || base[lbl("_boss_phase")] !== 0) continue;
      // Kill frames: one to three front modules met.
      const front = fronts(base);
      const modules = [...front.keys()];
      const meetings = (m, hit, mode) => {
        let valid = true;
        hit.forEach((module, slot) => {
          if (mode === "kill") m[lbl("_boss_hp") + module] = 1;
          else if (mode === "stage") {
            const stage = m[lbl("_boss_stage") + module];
            const next = stage === 0 ? m[lbl("_boss_crack") + module] + 1
              : stage === 1 ? m[lbl("_boss_break") + module] + 1 : 0;
            if (next < 2) valid = false; else m[lbl("_boss_hp") + module] = next;
          }
          shootAt(m, module === "hull" ? hullColumn(m) : front.get(module), slot);
        });
        return valid;
      };
      const runCase = (m, family, extra) => {
        const runs = [];
        for (const gun of [...weapons(m), null]) {
          if (gun === null && runs.length > 0) break;
          const run = Uint8Array.from(m);
          if (gun !== null) arm(run, gun);
          let cycles = 0, worstFrame = 0, spawned = false, clashes = 0, stepped = false;
          for (let f = 0; f < 4; f += 1) {
            const pending = gun !== null && !spawned && run[lbl("_boss_countdown")] === 1;
            if (f > 0 && live(run).length === 0 && !pending) break;
            if (f > 0) advance(run);
            const shots = bossShots(run), down = fallen(run);
            const steps = run[lbl("rail_step")] + run[lbl("rail_step") + 1];
            const c = frame(run, laserMode);
            const spawn = bossShots(run) > shots;
            if (spawn && fallen(run) > down) clashes += 1;
            const stepNow = run[lbl("rail_step")] + run[lbl("rail_step") + 1] < steps ||
              (steps > 0 && run[lbl("rail_step")] + run[lbl("rail_step") + 1] === 0);
            spawned ||= spawn;
            if (c > cycles) { cycles = c; worstFrame = f + 1; stepped = stepNow; }
          }
          runs.push({ cycles, worstFrame, gun, spawned, clashes, stepped });
        }
        const worst = runs.reduce((w, r) => (r.cycles > w.cycles ? r : w));
        cases.push({ family, laserMode, state, ...extra, ...worst,
          clashes: runs.reduce((s, r) => s + r.clashes, 0), reach: (extra.k ?? 0) <= 2 ? "reachable" : "unproven" });
      };
      function* subsets(list, k, from = 0, chosen = []) {
        if (chosen.length === k) { yield chosen; return; }
        for (let i = from; i < list.length; i += 1) yield* subsets(list, k, i + 1, [...chosen, list[i]]);
      }
      for (let k = 1; k <= Math.min(maxMeetings, modules.length); k += 1) {
        for (const hit of subsets(modules, k)) {
          for (const mode of ["kill", "stage"]) {
            const m = Uint8Array.from(base);
            if (!meetings(m, hit, mode)) continue;
            runCase(m, "kill frame", { hit, mode, k });
          }
        }
      }
      // Step frames: a slide under way on one side, its column step due now.
      rails.sides.forEach((s, si) => {
        if (state.k[si] >= rails.positions) return;
        const guns = gunsOf(s);
        const slide = Uint8Array.from(base);
        if (!destroy(slide, guns[state.k[si]])) return;
        // Run to a frame whose column step is due (rail_timer 0, a column
        // left), on a quiet frame; every column of the slide is a case.
        for (let column = 0; column < rails.pitch; column += 1) {
          let guard = 0;
          while (!(slide[lbl("rail_step") + si] > 0 && slide[lbl("rail_timer") + si] <= 1) && guard < 80) {
            frame(slide, null); guard += 1;
          }
          if (slide[lbl("rail_step") + si] === 0) break;
          slide[lbl("rail_timer") + si] = 0;
          const stepFront = fronts(slide);
          const stepModules = [...stepFront.keys()];
          const hits = [[], ...stepModules.map((x) => [x]), ...[...subsets(stepModules, 2)],
            ["hull"], ...stepModules.map((x) => [x, "hull"])];
          for (const hit of hits) {
            for (const mode of ["stage", "absorb"]) {
              if (mode === "absorb" && hit.some((x) => x !== "hull")) continue;
              if (mode === "stage" && hit.length > 0 && hit.every((x) => x === "hull")) continue;
              const m = Uint8Array.from(slide);
              if (hit.includes("hull") && hullColumn(m) === null) continue;
              const real = hit.filter((x) => x !== "hull");
              let valid = true;
              real.forEach((module, slot) => {
                const stage = m[lbl("_boss_stage") + module];
                const next = stage === 0 ? m[lbl("_boss_crack") + module] + 1
                  : stage === 1 ? m[lbl("_boss_break") + module] + 1 : 0;
                if (next < 2) valid = false; else m[lbl("_boss_hp") + module] = next;
                shootAt(m, stepFront.get(module), slot);
              });
              if (!valid) continue;
              if (hit.includes("hull")) shootAt(m, hullColumn(m), real.length);
              runCase(m, "step frame", { hit, mode, k: hit.length, side: s.name, column });
            }
          }
          frame(slide, null);
        }
      });
    }
  }
  const describe = (c) => c === null ? "none" : `${c.cycles} (f${c.worstFrame}) ${c.family}${c.stepped ? " (the step ran)" : ""}, ` +
    `lasers ${c.laserMode}, rails ${c.state.k.join("/")}${c.state.cannonsDead ? ", cannons destroyed" : ""}` +
    `${c.side ? `, ${c.side} sliding (column ${c.column + 1})` : ""}, ${c.k} ${c.mode}(s) [${c.hit.map((h) => (h === "hull" ? "hull" : describeModule(h)))}]` +
    `${c.spawned ? `, ${describeModule(c.gun)} spawning` : ""} (${c.reach})`;
  const worstOf = (list) => list.reduce((w, c) => (w === null || c.cycles > w.cycles ? c : w), null);
  return { cases, describe, worstOf, level };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const level = Number(process.argv.find((a) => a.startsWith("--level="))?.slice(8) ?? 4);
  const { cases, describe, worstOf } = regionTwoStress({ level });
  console.log(`# region 2, level ${level}: ${cases.length} cases`);
  for (const laserMode of ["warn", "beam"]) {
    const subset = cases.filter((c) => c.laserMode === laserMode);
    for (const family of ["kill frame", "step frame"]) {
      const f = subset.filter((c) => c.family === family);
      console.log(`# lasers ${laserMode}, ${family}s: worst reachable ${describe(worstOf(f.filter((c) => c.reach === "reachable")))}`);
      console.log(`#   worst any: ${describe(worstOf(f))}`);
      if (family === "step frame") {
        console.log(`#   worst with the step on the frame: ${describe(worstOf(f.filter((c) => c.stepped)))}`);
      }
    }
  }
  console.log(`# frames with a kill and a spawn: ${cases.reduce((s, c) => s + c.clashes, 0)}`);
  console.log(`# step frames where the step ran on the worst frame: ${cases.filter((c) => c.family === "step frame" && c.stepped).length} of ${cases.filter((c) => c.family === "step frame").length}`);
}
