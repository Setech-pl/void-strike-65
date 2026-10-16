// S5-4 (feat/boss-region-4, plan docs/plans/s5-boss-regions.md §6.4): the
// boss-sector stress composition (tests/boss-stress.test.mjs's accounting -
// the band DLI's three phases, UPDATE, SECTOR_COMPLETION and MOTION, native
// cycles) on region 4, the Void Citadel, entered through the real boss entry
// at level 10 (tier 4: four lasers, at most two on) from a build's disk, so
// region 4's block - and its gravity well's code, when the build has it - is
// read into slot F as the game reads it.
//
//   node scripts/measure-boss-stress-r4.mjs    (the default build; VS65_HARNESS_BUILD=<build/ dir> for another)
//
// The cases: every band position of five; the plates destroyed in every
// combination, against the spires standing (the well on), either fallen, or
// both fallen (the well off; the core open once the shutter falls); one to
// three front modules met (kill or a stage change); the lasers held in a
// warning's heat frame or their beams (two on, the others ready); each armed
// weapon's firing due on the meeting frame - and, in the finale (every plate
// destroyed), its volley's second and third shot (held to the next frame on a
// kill frame by rule (B)); while a spire stands, the well's step and the
// core's pulse request on the meeting frame (the ship off the target). A
// case's figure is its worst frame; "reachable" is at most two meetings a
// frame (AUD-04's cap). MEASURED, native.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BOSS_TABLE, bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";
import { bandDliSwitches, call, label, manifest, nmi, placeBand, root, runBossEntry, shootAt, visibleCells } from "../tests/boss-harness.mjs";

export function regionFourStress({ level = 10, maxMeetings = 3 } = {}) {
  const lbl = (name) => label("boss", name);
  const has = (name) => { try { lbl(name); return true; } catch { return false; } };
  const main = (name) => label("main", name);
  const entry = runBossEntry({ prepare: (memory) => { memory[0xa603] = level; } });
  if (entry.end !== "main_loop") throw new Error(`the boss entry ended at ${entry.end}`);
  const entered = () => Uint8Array.from(entry.memory);
  const gravity = has("gravity_on") && entry.memory[0x526e] === 0x4c;
  const hp = (memory, i) => memory[lbl("_boss_hp") + i];
  const count = entered()[lbl("_boss_count")];
  const LIFECYCLE = main("PLAYER_LIFECYCLE");
  const COOLDOWN = main("BROAD_DAMAGE_COOLDOWN");
  const PLAYER_X = main("player_x");
  const ACTIVE = main("FIGHTER_PROJECTILE_ACTIVE"), SHOT_Y = main("FIGHTER_PROJECTILE_Y");
  const SPEED = 6;
  const advance = (m) => { for (let s = 0; s < 5; s += 1) if (m[ACTIVE + s] !== 0) m[SHOT_Y + s] -= SPEED; };
  const live = (m) => [0, 1, 2, 3, 4].filter((s) => m[ACTIVE + s] !== 0);
  const KIND_EMITTER = 2;
  const BOSS_SHOT_ACTIVE = 0x0e;
  const HOSTILE_BASE = 5, HOSTILE_LIMIT = 5;
  const HOSTILE_ARRAYS = ["FIGHTER_PROJECTILE_ACTIVE", "FIGHTER_PROJECTILE_X", "FIGHTER_PROJECTILE_Y",
    "FIGHTER_PROJECTILE_PREV_Y", "FIGHTER_PROJECTILE_LIFETIME"];
  const entryPool = (m) => {
    for (const name of HOSTILE_ARRAYS) {
      const base = main(name) + HOSTILE_BASE;
      m.set(entry.memory.subarray(base, base + HOSTILE_LIMIT), base);
    }
  };
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
  const burstLeft = (m) => m[lbl("_boss_burst_left")];
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
  // The well's worst frame: its step due and the core's pulse asked, the
  // ship at the screen's left limit (far from the target, so it steps).
  // R4_STRESS_NO_WELL=1: the well's step and pulse not forced on the meeting
  // frame (the well's own share of the worst frame, for the M6 reclaim list).
  const forceWell = process.env.R4_STRESS_NO_WELL !== "1";
  function well(m) {
    if (!gravity || !forceWell) return;
    m[lbl("gravity_timer")] = 1;
    m[lbl("gravity_pulse")] = 1;
    m[PLAYER_X] = 48;
  }
  function frame(m, laserMode, wellDue = false) {
    hold(m, laserMode);
    if (wellDue) well(m);
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
      if (column >= left && column <= right && module < count && hp(m, module) > 0 &&
        ((exposed >> module) & 1) !== 0 && !out.has(module)) out.set(module, column);
    });
    return out;
  }
  // Destroy modules through the game's own path: a shot at HP 1 (the band
  // drifts until each is in reach).
  function destroy(m, dead) {
    for (let f = 0; f < 2; f += 1) frame(m, null);
    for (const module of dead) {
      let column = fronts(m).get(module);
      for (let wait = 0; column === undefined && wait < 140; wait += 1) { frame(m, null); column = fronts(m).get(module); }
      if (column === undefined) return false;
      m[lbl("_boss_hp") + module] = 1;
      shootAt(m, column, 0);
      frame(m, null);
    }
    for (let rest = 0; rest < 40; rest += 1) frame(m, null);
    return m[lbl("_boss_phase")] === 0;
  }
  function* subsets(list, k, from = 0, chosen = []) {
    if (chosen.length === k) { yield chosen; return; }
    for (let i = from; i < list.length; i += 1) yield* subsets(list, k, i + 1, [...chosen, list[i]]);
  }
  // The module names in the controller's (front-first) order, from the draft.
  const names = compileBossRegion(loadBossRegionDraft(bossRegionDirectory(root, 4))).modules
    .map((module) => module.name);
  const tableKind = (i) => entered()[lbl("_boss_module_table") + 12 * i + 7] & 0x0f;
  const kinds = [...Array(count).keys()].map(tableKind);
  const plates = [...Array(count).keys()].filter((i) => kinds[i] === 0);
  const spires = [...Array(count).keys()].filter((i) => kinds[i] === 3);
  const name = (i) => (names?.[i] ?? `#${i}`);
  const deadSets = [];
  for (const s of [[], [spires[0]], [spires[1]], spires]) {
    for (let mask = 0; mask < (1 << plates.length); mask += 1) deadSets.push([...s, ...plates.filter((_, b) => (mask >> b) & 1)]);
  }
  // fix/r4-immobile: the band positions the region's motion can show - five
  // across the travel for a drifting band, the start alone for a still one
  // (BOSS_TABLE framesPerStep 0; the tables at $AD00 after the entry).
  const table = (offset) => entry.memory[0xad00 + offset];
  const positions = table(BOSS_TABLE.framesPerStep) === 0
    ? [table(BOSS_TABLE.start)] : [0, 16, 32, 48, 63];
  const cases = [];
  for (const laserMode of ["warn", "beam"]) {
    for (const p of positions) {
      for (const dead of deadSets) {
        const base = entered();
        placeBand(base, p);
        if (!destroy(base, dead)) continue;
        const finale = plates.every((i) => dead.includes(i));
        if (finale) entryPool(base);
        const front = fronts(base);
        const modules = [...front.keys()];
        const wellOn = gravity && spires.some((i) => hp(base, i) > 0);
        for (let k = 1; k <= Math.min(maxMeetings, modules.length); k += 1) {
          for (const hit of subsets(modules, k)) {
            for (const mode of ["kill", "stage"]) {
              const m = Uint8Array.from(base);
              let valid = true;
              hit.forEach((module, slot) => {
                if (mode === "kill") m[lbl("_boss_hp") + module] = 1;
                else {
                  const stage = m[lbl("_boss_stage") + module];
                  const next = stage === 0 ? m[lbl("_boss_crack") + module] + 1
                    : stage === 1 ? m[lbl("_boss_break") + module] + 1 : 0;
                  if (next < 2) valid = false; else m[lbl("_boss_hp") + module] = next;
                }
                shootAt(m, front.get(module), slot);
              });
              if (!valid) continue;
              const runs = [];
              const steps = finale ? ["countdown", "burst 2", "burst 3"] : ["countdown"];
              for (const [gun, step] of [...weapons(m).flatMap((g) => steps.map((st) => [g, st])), [null, null]]) {
                if (gun === null && runs.length > 0) break;
                const run = Uint8Array.from(m);
                if (gun !== null) arm(run, gun);
                if (step === "burst 2" || step === "burst 3") {
                  const kept = [0, 1, 2, 3, 4].map((slot) => run[ACTIVE + slot]);
                  kept.forEach((_, slot) => { run[ACTIVE + slot] = 0; });
                  for (let f = 0; f < (step === "burst 2" ? 1 : 2); f += 1) { hold(run, laserMode); call(run, lbl("boss_update")); }
                  kept.forEach((value, slot) => { run[ACTIVE + slot] = value; });
                  if (burstLeft(run) === 0 || run[lbl("_boss_phase")] !== 0) continue;
                }
                let cycles = 0, worstFrame = 0, spawned = false, clashes = 0, stepped = false;
                for (let f = 0; f < 4; f += 1) {
                  const pending = gun !== null && !spawned && (run[lbl("_boss_countdown")] === 1 || burstLeft(run) > 0);
                  if (f > 0 && live(run).length === 0 && !pending) break;
                  if (f > 0) advance(run);
                  const shots = bossShots(run), down = fallen(run);
                  const before = run[PLAYER_X];
                  const c = frame(run, laserMode, wellOn);
                  if (run[PLAYER_X] !== before && run[PLAYER_X] !== 48) stepped = true;
                  const spawn = bossShots(run) > shots;
                  if (spawn && fallen(run) > down) clashes += 1;
                  spawned ||= spawn;
                  if (c > cycles) { cycles = c; worstFrame = f + 1; }
                }
                runs.push({ cycles, worstFrame, gun, step, spawned, clashes, stepped });
              }
              const worst = runs.reduce((w, r) => (r.cycles > w.cycles ? r : w));
              cases.push({ laserMode, p, dead, hit, mode, k, finale, wellOn, ...worst,
                clashes: runs.reduce((s, r) => s + r.clashes, 0), reach: k <= 2 ? "reachable" : "unproven" });
            }
          }
        }
      }
    }
  }
  const describe = (c) => `${c.cycles} (f${c.worstFrame}) lasers ${c.laserMode}, p ${c.p}, ${c.k} ${c.mode}(s) ` +
    `[${c.hit.map(name)}], destroyed [${c.dead.map(name)}]${c.finale ? ", finale" : ""}` +
    `${c.wellOn ? ", well on (step + pulse due)" : ""}` +
    `${c.spawned ? `, ${name(c.gun)} spawning${c.step && c.step !== "countdown" ? ` (${c.step})` : ""}` : ""} (${c.reach})`;
  const worstOf = (list) => list.reduce((w, c) => (w === null || c.cycles > w.cycles ? c : w), null);
  return { cases, describe, worstOf, level, gravity };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // feat/boss-order-scale: --level=N enters the Citadel where the order put it.
  const levelArgument = process.argv.find((a) => a.startsWith("--level="));
  const { cases, describe, worstOf, level, gravity } = regionFourStress(
    levelArgument === undefined ? {} : { level: Number(levelArgument.slice("--level=".length)) });
  console.log(`# region 4, level ${level}, gravity code ${gravity ? "on the disk" : "absent"}: ${cases.length} cases`);
  for (const laserMode of ["warn", "beam"]) {
    const subset = cases.filter((c) => c.laserMode === laserMode);
    console.log(`# lasers ${laserMode}: worst reachable ${describe(worstOf(subset.filter((c) => c.reach === "reachable")))}`);
    console.log(`#   worst any (<= 3 meetings): ${describe(worstOf(subset))}`);
    console.log(`#   worst reachable, finale: ${describe(worstOf(subset.filter((c) => c.finale && c.reach === "reachable")))}`);
    const wellCases = subset.filter((c) => c.wellOn && c.reach === "reachable");
    if (wellCases.length) console.log(`#   worst reachable, well on: ${describe(worstOf(wellCases))}`);
  }
  console.log(`# frames with a kill and a spawn: ${cases.reduce((s, c) => s + c.clashes, 0)}`);
}
