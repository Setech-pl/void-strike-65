// The boss's fire coverage (feat/boss-r1-tuning, owner smoke 2026-10-09: the
// player could hide at a screen edge and survive there indefinitely): for every
// player x the fighter can reach, which of the boss's weapons can put fire on
// it, over the whole band drift. `npm run boss:coverage [-- --region=N]`
// prints the map for a region's draft; tests/boss-coverage.test.mjs pins it.
//
// MODEL, from the code it mirrors (no emulator run):
//   * the drift - src/hybrid/boss.s boss_motion: the band position p steps one
//     colour clock every framesPerColourClock frames from startColourClock
//     across 0..travelColourClocks and back; the shown position lags it by
//     the DLI's one frame, which only shifts the phase;
//   * a pulse shot - boss.s boss_fire: born under the gun's bottom row at
//     column x + floor(width / 2) (+ a salvo's or a volley's -1 / +1), at
//     HPOS (4c - p + 33) & $FE, dropped unless 4c - p + 33 lies in
//     48..206; inside the band it rides the drift (laser_hostile_shots: HPOS
//     follows the band position's change), below it it falls straight down at
//     INTERCEPTOR_PROJECTILE_SPEED (2) lines a frame (the PULSE class steps
//     every frame);
//   * a laser - boss.s LASER_PUBLISH: the beam's left edge is the emitter's
//     centre clock (x * 4 + width * 2) less 2, its HPOS edge - p + 32, shown
//     while edge - p lies in 16..171, 4 clocks wide, for beamFrames frames;
//   * the hit tests - main.s interceptor_projectile_hits_player: a shot at
//     HPOS s hits the player at x when s - x is in -1..7
//     (PLAYER_COLLISION_WIDTH 8, INTERCEPTOR_PROJECTILE_WIDTH_HPOS 2);
//     boss.s laser_collide: a beam at HPOS h when h - x is in -3..7;
//   * the player - main.s read_input: x moves 2 at a time from
//     PLAYER_RESPAWN_X 124 inside PLAYER_X_MIN 48 .. PLAYER_X_MAX 200, so
//     every even x in 48..200 is reachable and no odd one is.
//
// A position is SAFE in a state when no weapon of that state can hit it at any
// band position. The states: "opening" - the weapons exposed at the install
// (no cover); "full" - every weapon exposed and alive (every plate down). The
// map does not depend on the difficulty (the geometry is the same); the
// pressure - the expected hits a minute on a player who stands still at x -
// does, through the reloads (EASY +1/2, HARD -1/4, boss.c boss_fire_next) and
// the laser's per-difficulty reload and warning (bossDef).
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bossRegionDirectory, compileBossRegion, loadBossRegionDraft } from "./boss-assets.mjs";

export const PLAYER_X_MIN = 48;
export const PLAYER_X_MAX = 200;
export const PLAYER_POSITIONS = Object.freeze(
  Array.from({ length: (PLAYER_X_MAX - PLAYER_X_MIN) / 2 + 1 }, (_, i) => PLAYER_X_MIN + 2 * i));
const BAND_ORIGIN_HPOS = 32;
const SHOT_HPOS_MIN = 48;                 // GAMEPLAY_LEFT_HPOS
const SHOT_HPOS_LIMIT = 48 + 40 * 4 - 1;  // the spawn's cmp: raw < 207
const SHOT_SPEED = 2;                     // INTERCEPTOR_PROJECTILE_SPEED
const BAND_ROWS = 8;
const SHOT_HIT = Object.freeze({ low: -1, high: 7 });   // s - x
const BEAM_HIT = Object.freeze({ low: -3, high: 7 });   // h - x
const BEAM_EDGE_MIN = 48 - BAND_ORIGIN_HPOS;
const BEAM_EDGE_LIMIT = 48 + 40 * 4 - BAND_ORIGIN_HPOS - 4;
export const DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);
const LASER_DEFAULTS = Object.freeze({ warning: { easy: 40, medium: 32, hard: 25 },
  reload: { easy: 300, medium: 225, hard: 150 } });

// The band position, frame by frame, over one drift cycle (boss_motion).
export function driftCycle(motion) {
  const framesPerStep = motion.framesPerColourClock;
  const travel = motion.travelColourClocks;
  let p = motion.startColourClock;
  let dir = 1;
  let timer = 1;
  const cycle = [];
  const frames = 2 * travel * framesPerStep;
  for (let frame = 0; frame < frames; frame += 1) {
    timer -= 1;
    if (timer === 0) {
      timer = framesPerStep;
      p += dir;
      if (p === 0 || p === travel) dir = -dir;
    }
    cycle.push(p);
  }
  return cycle;
}

// Every HPOS one weapon's fire takes below the band, with how many drift
// phases (spawn frames of the cycle) put it there: Map(hpos -> phases).
function pulseLanding(module, offsets, cycle) {
  const landing = new Map();
  const bottomRow = module.row + module.height - 1;
  const transit = Math.ceil((BAND_ROWS - 1 - bottomRow) * 8 / SHOT_SPEED);
  const n = cycle.length;
  for (const offset of offsets) {
    const column = module.x + (module.width >> 1) + offset;
    for (let t = 0; t < n; t += 1) {
      const p = cycle[t];
      const raw = 4 * column - p + 1 + BAND_ORIGIN_HPOS;
      if (4 * column - p < 0 || raw > 255 || raw < SHOT_HPOS_MIN || raw > SHOT_HPOS_LIMIT) continue;
      const exit = (raw & 0xfe) - (cycle[(t + transit) % n] - p);
      landing.set(exit, (landing.get(exit) ?? 0) + 1);
    }
  }
  return landing;
}

function beamLanding(module, beamFrames, cycle) {
  const landing = new Map();
  const edge = module.x * 4 + module.width * 2 - 2;
  for (const p of cycle) {
    const at = edge - p;
    if (at < BEAM_EDGE_MIN || at >= BEAM_EDGE_LIMIT) continue;
    const hpos = at + BAND_ORIGIN_HPOS;
    landing.set(hpos, (landing.get(hpos) ?? 0) + 1);
  }
  return { landing, beamFrames };
}

// The share of drift phases in which a weapon's fire lands on player x.
function duty(landing, x, hit, phases) {
  let count = 0;
  for (const [hpos, n] of landing) {
    const d = hpos - x;
    if (d >= hit.low && d <= hit.high) count += n;
  }
  return count / phases;
}

// The region's weapons, each with its fire's landing map. `finale`: the
// region has one (a volley: offsets -1, 0, +1); a salvo always does.
export function bossWeapons(region, motion, { finale = false } = {}) {
  const cycle = driftCycle(motion);
  return region.modules.filter((module) => module.kind !== "armour").map((module) => {
    const isEmitter = module.kind === "emitter";
    const offsets = module.kind === "salvo" || finale ? [-1, 0, 1] : [0];
    return {
      name: module.name,
      kind: module.kind,
      column: module.x + (module.width >> 1),
      reload: module.reload,
      opening: module.cover === 0,
      slot: module.slot,
      landing: isEmitter ? beamLanding(module, region.laser.beamFrames, cycle).landing
        : pulseLanding(module, offsets, cycle),
      hit: isEmitter ? BEAM_HIT : SHOT_HIT,
      phases: cycle.length * offsets.length,
      shotsPerFiring: offsets.length,
    };
  });
}

// boss.c boss_fire_next: the reload after the difficulty's adjustment, never
// under the region's cooldown.
export function adjustedReload(reload, difficulty, cooldown) {
  let value = reload;
  if (difficulty === "easy") value += value >> 1;
  else if (difficulty === "hard") value -= value >> 2;
  return Math.max(value, cooldown);
}

// The coverage map of one state: per player x, the weapons whose fire can
// reach it (and each one's duty), and the expected hits a minute on a player
// standing at x per difficulty. `lasers`: the emitter slots the level's tier
// enables (1 on levels 1-4).
export function coverageMap(region, motion, { state = "full", lasers = 1, finale = false, bossDef = {},
  enabled = null } = {}) {
  const weapons = bossWeapons(region, motion, { finale })
    .filter((weapon) => weapon.kind !== "emitter" || weapon.slot <= lasers)
    .filter((weapon) => state === "full" || weapon.opening)
    .filter((weapon) => enabled === null || enabled.includes(weapon.name));
  const guns = weapons.filter((weapon) => weapon.kind !== "emitter");
  const cooldown = region.fire.cooldown;
  const laserWarning = { ...LASER_DEFAULTS.warning, ...(bossDef.laserWarning ?? {}) };
  const laserReload = { ...LASER_DEFAULTS.reload, ...(bossDef.laserReload ?? {}) };
  // One countdown serves the armed guns in turn: each fires once a rotation.
  const rotation = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty,
    guns.reduce((sum, gun) => sum + adjustedReload(gun.reload, difficulty, cooldown), 0)]));
  const positions = PLAYER_POSITIONS.map((x) => {
    const reach = weapons.map((weapon) => ({ name: weapon.name, duty: duty(weapon.landing, x, weapon.hit,
      weapon.phases) })).filter((entry) => entry.duty > 0);
    const pressure = Object.fromEntries(DIFFICULTIES.map((difficulty) => {
      let perFrame = 0;
      for (const entry of reach) {
        const weapon = weapons.find((w) => w.name === entry.name);
        if (weapon.kind === "emitter") {
          // A beam lasts beamFrames once every warning + beam + reload frames;
          // the drift moves it, so its duty is the share of the cycle's band
          // positions under it - an ESTIMATE of one hit a firing at most.
          const period = laserWarning[difficulty] + region.laser.beamFrames + laserReload[difficulty];
          perFrame += Math.min(1, entry.duty * region.laser.beamFrames) / period;
        } else {
          perFrame += entry.duty * weapon.shotsPerFiring / rotation[difficulty];
        }
      }
      return [difficulty, perFrame * 50 * 60];
    }));
    return { x, reach, pressure };
  });
  return {
    state,
    weapons: weapons.map(({ name, kind, column, opening }) => ({ name, kind, column, opening })),
    positions,
    safe: positions.filter((position) => position.reach.length === 0).map((position) => position.x),
  };
}

// Contiguous x ranges, for the report: [[from, to], ...].
export function ranges(xs) {
  const out = [];
  for (const x of xs) {
    const last = out[out.length - 1];
    if (last && x === last[1] + 2) last[1] = x;
    else out.push([x, x]);
  }
  return out;
}

export function regionCoverage(draft, options = {}) {
  const region = compileBossRegion(draft);
  return {
    name: draft.layout.name,
    opening: coverageMap(region, draft.layout.motion, { ...options, state: "opening" }),
    full: coverageMap(region, draft.layout.motion, { ...options, state: "full" }),
  };
}

// A one-line strip of the map: one character per 4 HPOS (two positions), '.'
// safe, a digit the number of weapons that reach it.
export function strip(map) {
  let line = "";
  for (let i = 0; i < map.positions.length; i += 2) {
    const n = Math.min(map.positions[i].reach.length, (map.positions[i + 1] ?? map.positions[i]).reach.length);
    line += n === 0 ? "." : String(Math.min(n, 9));
  }
  return line;
}

function report(name, coverage) {
  const lines = [`Boss coverage: ${name}`];
  for (const map of [coverage.opening, coverage.full]) {
    lines.push(`  ${map.state.padEnd(7)} weapons: ${map.weapons.map((w) => `${w.name}(c${w.column})`).join(" ")}`);
    lines.push(`  ${"".padEnd(7)} x 48..200 |${strip(map)}|`);
    const safe = ranges(map.safe);
    lines.push(`  ${"".padEnd(7)} safe: ${safe.length === 0 ? "none" : safe.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ")}`);
    const edges = [48, 50, 52, 54, 196, 198, 200].map((x) => map.positions.find((p) => p.x === x));
    lines.push(`  ${"".padEnd(7)} hits/min standing still (E/M/H): ` + edges.map((p) =>
      `x${p.x} ${DIFFICULTIES.map((d) => p.pressure[d].toFixed(1)).join("/")}`).join("  "));
    const centre = map.positions.reduce((best, p) => (p.pressure.medium > best.pressure.medium ? p : best));
    const lowest = map.positions.reduce((best, p) => (p.pressure.medium < best.pressure.medium ? p : best));
    lines.push(`  ${"".padEnd(7)} MEDIUM: most ${centre.pressure.medium.toFixed(1)} at x${centre.x}, ` +
      `least ${lowest.pressure.medium.toFixed(1)} at x${lowest.x}`);
  }
  return lines.join("\n");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const regionArgument = process.argv.find((a) => a.startsWith("--region="));
  const draftArgument = process.argv.find((a) => a.startsWith("--draft="));
  const directory = draftArgument ? path.resolve(draftArgument.slice(8))
    : bossRegionDirectory(rootDirectory, Number(regionArgument?.slice(9) ?? 1));
  const draft = loadBossRegionDraft(directory);
  const json = process.argv.includes("--json");
  const coverage = regionCoverage(draft);
  if (json) console.log(JSON.stringify(coverage, null, 1));
  else console.log(report(path.relative(rootDirectory, directory) || directory, coverage));
}
