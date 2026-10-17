// MEASUREMENT ONLY. Not part of the build or the test suite.
// feat/boss-order-scale (docs/plans/boss-order-scale.md): who hits the player,
// how long the player is in danger, how long the fight lasts - per boss, per
// difficulty, per bot - from a diagnostic wall-trace run with --hit-trace:
//
//   node scripts/runtime-wall-trace.mjs --artifacts=build/<route> --only-session=<id> \
//     --hit-trace --atari800-source=build/atari800-trace
//   node scripts/measure-boss-danger.mjs [--json] <build/<route>/runtime-wall-trace/<id>.csv> [...]
//
// MEASURED from the files the run writes beside each other:
//   <id>.csv                    a hit is the row whose player_health_after drops
//                               (player_damage_applied flags the row after), a
//                               death the row whose player_lives_after drops
//                               (lives are held); laser_damage_calls counts the
//                               boss beams' damage; laser_states 2 bits a laser
//                               (1 warning, 2 beam); gravity_on, boss_finale;
//   <id>-light.csv              each Light slot's x / y per tick;
//   <id>-enemy-projectiles.csv  each hostile shot per tick: a release with
//                               player_collision_terminal set met the fighter;
//                               ACTIVE = (weapon_class << 3) | owner.
// A hit is attributed, in this order, to: an Interceptor that met the fighter
// that row (contact, the kernel's test - scripts/measure-interceptor-hits.mjs);
// a boss beam (laser_damage_calls moved); a hostile shot released within one
// row over the drawn ship (or flagged player_collision_terminal), by its ACTIVE byte - $16 a Light's laser, class 3 a Bomber's
// shell, $0E a pulse with the Light owner (in the boss sector the boss's pulse,
// on the road a Wingman's), any other class-1 pulse a Raider's; else "other"
// (debris, a hull, a Heavy's contact).
// The fight's seconds follow the owner's rule (journal §AH): the aiming bot's
// fight frames x main's plain sweep / main's aiming bot, per difficulty (region
// 1 at dcc331a: 3,834 / 4,612 / 5,964 over 1,847 / 2,231 / 2,663), / 50 - as
// scripts/measure-boss-r2-fight.mjs reads them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readTraceCsv } from "./measure-boss-fight.mjs";

const PLAIN_MAIN = [3834, 4612, 5964];
const AIM_MAIN = [1847, 2231, 2663];
const INTERCEPTOR = 24;
const LIGHT_WIDTH = 8;
const LIGHT_HEIGHT = 8;
const PLAYER_VISIBLE_WIDTH = 16;
const PLAYER_COLLISION_LAST_ROW = 14;
const SOURCES = ["beam", "bossPulse", "lightLaser", "interceptorContact", "raiderPulse", "wingmanPulse",
  "bomberShell", "other"];

const live = (state) => state === 1 || state === 2;
function overlapsPlayer(lightX, lightY, playerX, playerY) {
  const dy = (playerY - (lightY & 0xf8)) & 0xff;
  const dx = (playerX - lightX) & 0xff;
  return (dy < LIGHT_HEIGHT || dy >= 256 - PLAYER_COLLISION_LAST_ROW) &&
    (dx < LIGHT_WIDTH || dx >= 256 - (PLAYER_VISIBLE_WIDTH - 1));
}
function shotSource(active, inBoss) {
  if (active === 0x16) return "lightLaser";
  if ((active >> 3) === 3) return "bomberShell";
  if (active === 0x0e) return inBoss ? "bossPulse" : "wingmanPulse";
  if ((active >> 3) === 1) return "raiderPulse";
  return "other";
}
const tally = () => ({ hits: 0, deaths: 0, ...Object.fromEntries(SOURCES.map((s) => [s, 0])) });

export function bossDanger(csvFile) {
  const rows = readTraceCsv(csvFile);
  const base = csvFile.replace(/\.csv$/, "");
  const lightFile = `${base}-light.csv`;
  const shotFile = `${base}-enemy-projectiles.csv`;
  if (!fs.existsSync(lightFile) || !fs.existsSync(shotFile)) {
    throw new Error(`${path.basename(csvFile)}: run it with --hit-trace`);
  }
  const difficulty = Number(/-(\d)$/.exec(path.basename(base))?.[1] ?? 1);
  const lightByFrame = new Map(readTraceCsv(lightFile).map((row) => [row.frame, row]));
  // A shot's release on the hit's row or next to it. player_collision_terminal
  // marks only some of them (MEASURED: hits whose shot left at the ship's row,
  // overlapping it, with the flag clear), so the release is matched by where
  // it was: overlapping the drawn ship (x - player_x in -1..15) at the ship's
  // rows (y within 16 lines above player_y .. its bottom row).
  const releases = new Map();
  for (const shot of readTraceCsv(shotFile)) {
    if (shot.event !== "release" || shot.prior_active === 0) continue;
    const list = releases.get(shot.frame) ?? [];
    list.push(shot);
    releases.set(shot.frame, list);
  }
  const shotAt = (row) => {
    for (const frame of [row.frame, row.frame - 1, row.frame + 1]) {
      for (const shot of releases.get(frame) ?? []) {
        const x = shot.prior_x || shot.x;
        const y = shot.prior_y || shot.y;
        // The ship moves up to 2 HPOS in the frame: its x before or after it,
        // 2 HPOS either side.
        const overlaps = [row.player_x, row.player_x_after ?? row.player_x].some((px) => {
          const dx = x - px;
          return dx >= -3 && dx <= PLAYER_VISIBLE_WIDTH + 1;
        });
        const dy = (y - row.player_y + 16) & 0xff;
        if (shot.player_collision_terminal === 1 ||
          (overlaps && dy < 16 + PLAYER_COLLISION_LAST_ROW + 1)) return shot.prior_active;
      }
    }
    return undefined;
  };
  const entry = rows.find((row) => row.boss_entry === 1);
  const engaged = rows.find((row) => row.boss_state === 1 && row.boss_entry !== 1);
  const chain = rows.find((row) => row.boss_state >= 3);
  const road = tally();
  const boss = tally();
  const danger = { warnOrBeam: 0, beam: 0, gravity: 0, finale: 0, escortLive: 0 };
  let escorts = 0;
  let fightFrames = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const previous = rows[i - 1];
    const inFight = engaged !== undefined && row.frame >= engaged.frame &&
      (chain === undefined || row.frame < chain.frame);
    const inBoss = row.boss_state >= 1;
    if (inFight) {
      fightFrames += 1;
      const lanes = [0, 1, 2, 3].map((lane) => (row.laser_states >> (2 * lane)) & 3);
      if (lanes.some((s) => s === 1 || s === 2)) danger.warnOrBeam += 1;
      if (lanes.some((s) => s === 2)) danger.beam += 1;
      if (row.gravity_on) danger.gravity += 1;
      if (row.boss_finale) danger.finale += 1;
      if ([0, 1, 2, 3].some((s) => live(row[`light_state${s}`]) && row[`light_archetype${s}`] === INTERCEPTOR)) {
        danger.escortLive += 1;
      }
    }
    let ram = false;
    const light = lightByFrame.get(row.frame);
    for (let slot = 0; slot < 4; slot += 1) {
      const was = live(previous[`light_state${slot}`]) && previous[`light_archetype${slot}`] === INTERCEPTOR;
      const is = live(row[`light_state${slot}`]) && row[`light_archetype${slot}`] === INTERCEPTOR;
      if (is && !was && inFight) escorts += 1;
      if (was && !is && light !== undefined &&
        overlapsPlayer(light[`x${slot}`], light[`y${slot}`], row.player_x, row.player_y)) ram = true;
    }
    if (!(row.player_health_after < row.player_health)) continue;
    const bucket = inBoss ? boss : road;
    bucket.hits += 1;
    if (row.player_lives_after < row.player_lives) bucket.deaths += 1;
    const shot = shotAt(row);
    let source;
    if (ram) source = "interceptorContact";
    else if ((row.laser_damage_calls ?? 0) !== (previous.laser_damage_calls ?? 0)) source = "beam";
    else if (shot !== undefined) source = shotSource(shot, inBoss);
    else source = "other";
    bucket[source] += 1;
  }
  const seconds = (frames) => Math.round(frames * PLAIN_MAIN[difficulty] / AIM_MAIN[difficulty] / 5) / 10;
  return {
    session: path.basename(base), difficulty,
    entryFrame: entry?.frame ?? null, entryHostFrames: entry === undefined ? null
      : entry.next_start_host_frame - entry.start_host_frame,
    finished: chain !== undefined, fightFrames, fightSeconds: chain === undefined ? null : seconds(fightFrames),
    rawSeconds: Math.round(fightFrames / 5) / 10,
    escorts, road, boss,
    danger: Object.fromEntries(Object.entries(danger).map(([k, v]) => [k, { frames: v,
      share: fightFrames ? Math.round(1000 * v / fightFrames) / 10 : 0 }])),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const json = process.argv.includes("--json");
  const results = process.argv.slice(2).filter((a) => !a.startsWith("--")).map(bossDanger);
  if (json) console.log(JSON.stringify(results, null, 1));
  else {
    const src = (b) => SOURCES.filter((s) => b[s]).map((s) => `${s} ${b[s]}`).join(", ") || "-";
    for (const r of results) {
      console.log(`${r.session}: fight ${r.fightSeconds ?? "unfinished"} s (${r.fightFrames} f), ` +
        `escorts ${r.escorts}; boss hits ${r.boss.hits} (${src(r.boss)}), deaths ${r.boss.deaths}; ` +
        `road hits ${r.road.hits} (${src(r.road)}); danger: warn/beam ${r.danger.warnOrBeam.share}%, ` +
        `beam ${r.danger.beam.share}%, gravity ${r.danger.gravity.share}%, finale ${r.danger.finale.share}%, ` +
        `escort ${r.danger.escortLive.share}%`);
    }
  }
}
