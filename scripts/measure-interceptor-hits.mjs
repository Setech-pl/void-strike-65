// feat/interceptor-standoff (docs/plans/interceptor-standoff.md): who hit the
// player - an Interceptor flying into the fighter (contact), an Interceptor's
// laser, or anything else - over a diagnostic wall-trace run.
//
//   node scripts/runtime-wall-trace.mjs --artifacts=build/<route> --only-session=<id> \
//     --hit-trace --atari800-source=build/atari800-trace
//   node scripts/measure-interceptor-hits.mjs [--json] build/<route>/runtime-wall-trace/<id>.csv [...]
//
// MEASURED from three files the run writes beside each other:
//   <id>.csv                    a hit is a row whose player_damage_applied is set,
//                               a death a row whose player_lives_after is below
//                               player_lives (lives are held); light_archetypeN
//                               names each Light slot's record (24 = Interceptor);
//   <id>-light.csv              each slot's state, x and y per tick (--hit-trace);
//   <id>-enemy-projectiles.csv  each hostile shot per tick (--hit-trace):
//                               ACTIVE is (weapon_class << 3) | owner, so a Light's
//                               LASER is $16; a release with player_collision_terminal
//                               set is a shot that met the fighter.
// A hit is the row whose player_health_after drops (player_damage_applied flags
// the row after it), a death the same row's player_lives_after drop. An
// Interceptor MET THE FIGHTER on a row where its slot, live (state 1 or 2) on
// the row before, is no longer, at a position that overlaps the fighter by the
// kernel's contact test (src/hybrid/light-kernel.s @contact); the hit is then a
// CONTACT (the damage cooldown can absorb a contact: it is still counted as
// met). A LASER hit is a hit within one row of a $16 release that met the
// fighter.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readTraceCsv } from "./measure-boss-fight.mjs";

const INTERCEPTOR = 24;
const LASER_ACTIVE = (2 << 3) | 2 | 4;
const LIGHT_HEIGHT = 8;
const LIGHT_WIDTH = 8;
const PLAYER_COLLISION_LAST_ROW = 14;
const PLAYER_VISIBLE_WIDTH = 16;

const live = (state) => state === 1 || state === 2;

function overlapsPlayer(lightX, lightY, playerX, playerY) {
  const dy = (playerY - (lightY & 0xf8)) & 0xff;
  const dx = (playerX - lightX) & 0xff;
  return (dy < LIGHT_HEIGHT || dy >= 256 - PLAYER_COLLISION_LAST_ROW) &&
    (dx < LIGHT_WIDTH || dx >= 256 - (PLAYER_VISIBLE_WIDTH - 1));
}

export function interceptorHits(csvFile) {
  const rows = readTraceCsv(csvFile);
  const base = csvFile.replace(/\.csv$/, "");
  const lightFile = `${base}-light.csv`;
  const shotFile = `${base}-enemy-projectiles.csv`;
  if (!fs.existsSync(lightFile) || !fs.existsSync(shotFile)) {
    throw new Error(`${path.basename(csvFile)}: run it with --hit-trace`);
  }
  const lightByFrame = new Map(readTraceCsv(lightFile).map((row) => [row.frame, row]));
  const shots = readTraceCsv(shotFile);
  const laserHitFrames = new Set();
  let laserShots = 0;
  for (const shot of shots) {
    if (shot.event === "spawn" && shot.active === LASER_ACTIVE) laserShots += 1;
    if (shot.event === "release" && shot.prior_active === LASER_ACTIVE && shot.player_collision_terminal === 1) {
      laserHitFrames.add(shot.frame);
    }
  }
  const tally = () => ({ interceptors: 0, rams: 0, shotDown: 0, leftScreen: 0, lifeFrames: [],
    hits: 0, contact: 0, laser: 0, other: 0, deaths: 0, contactDeaths: 0, laserDeaths: 0 });
  const level = tally();
  const boss = tally();
  const born = new Map();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const previous = rows[i - 1];
    const bucket = row.boss_state >= 1 ? boss : level;
    const light = lightByFrame.get(row.frame);
    // Damage lands on the row whose health drops (player_damage_applied flags
    // the row after); a death on the same row (lives are held, so it recovers).
    const damaged = row.player_health_after < row.player_health;
    const death = row.player_lives_after < row.player_lives;
    let ram = false;
    for (let slot = 0; slot < 4; slot += 1) {
      const was = live(previous[`light_state${slot}`]) && previous[`light_archetype${slot}`] === INTERCEPTOR;
      const is = live(row[`light_state${slot}`]) && row[`light_archetype${slot}`] === INTERCEPTOR;
      if (is && !was) {
        bucket.interceptors += 1;
        born.set(slot, row.frame);
      } else if (was && !is) {
        if (born.has(slot)) bucket.lifeFrames.push(row.frame - born.get(slot));
        born.delete(slot);
        // A slot that dies overlapping the fighter met it: the kernel's
        // contact test, on the position the tick left (the light row keeps it).
        if (light !== undefined &&
          overlapsPlayer(light[`x${slot}`], light[`y${slot}`], row.player_x, row.player_y)) {
          ram = true;
          bucket.rams += 1;
        } else if (light !== undefined && light[`y${slot}`] >= 232) {
          bucket.leftScreen += 1;
        } else {
          bucket.shotDown += 1;
        }
      }
    }
    if (!damaged) continue;
    bucket.hits += 1;
    if (death) bucket.deaths += 1;
    if (ram) {
      bucket.contact += 1;
      if (death) bucket.contactDeaths += 1;
    } else if (laserHitFrames.has(row.frame) || laserHitFrames.has(row.frame - 1) ||
      laserHitFrames.has(row.frame + 1)) {
      bucket.laser += 1;
      if (death) bucket.laserDeaths += 1;
    } else {
      bucket.other += 1;
    }
  }
  const summarise = (bucket) => {
    const lives = bucket.lifeFrames;
    return {
      ...bucket,
      lifeFrames: undefined,
      lifeMax: lives.length ? Math.max(...lives) : null,
      lifeMean: lives.length ? Math.round(lives.reduce((a, b) => a + b, 0) / lives.length) : null,
    };
  };
  return { session: path.basename(base), frames: rows.length, laserShots,
    level: summarise(level), boss: summarise(boss) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const json = process.argv.includes("--json");
  const results = process.argv.slice(2).filter((a) => !a.startsWith("--")).map(interceptorHits);
  if (json) console.log(JSON.stringify(results, null, 1));
  else {
    const line = (name, b) => `${name}: ${b.interceptors} Interceptors (life mean ${b.lifeMean ?? "-"}, max ` +
      `${b.lifeMax ?? "-"}; ${b.rams} met the fighter, ${b.shotDown} shot down, ${b.leftScreen} left); ` +
      `hits ${b.hits} = contact ${b.contact} + laser ${b.laser} + other ${b.other}; ` +
      `deaths ${b.deaths} (contact ${b.contactDeaths}, laser ${b.laserDeaths})`;
    for (const r of results) {
      console.log(`${r.session} (${r.frames} frames, ${r.laserShots} Interceptor lasers fired)`);
      console.log(`  ${line("level", r.level)}`);
      console.log(`  ${line("boss ", r.boss)}`);
    }
  }
}
