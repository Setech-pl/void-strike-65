// fix/interceptor-speed (docs/plans/interceptor-speed.md): how the player's
// fire fares against the Interceptors over a diagnostic wall-trace run - for
// main and the speed variants side by side.
//
//   node scripts/runtime-wall-trace.mjs --artifacts=build/<route> --only-session=<id> \
//     --hit-trace --atari800-source=build/atari800-trace
//   node scripts/measure-interceptor-play.mjs [--json] build/<route>/runtime-wall-trace/<id>.csv [...]
//
// MEASURED from the files a --hit-trace run writes (<id>.csv, <id>-light.csv),
// split into the level (boss_state 0) and the boss sector:
//   shotsSeen    player shots spawned (fire_accept_calls) while an Interceptor
//                is on screen above the ship (24 <= y < player_y); the bots do
//                not aim at Interceptors, so this is the coarse denominator;
//   hits         Interceptor hit points lost (the slot's hp drops, or it dies
//                anywhere but off the bottom/top of the screen);
//   ratio        hits / shotsSeen;
//   killed / escaped  Interceptors shot down / that left the screen alive;
//   timeToKill   frames from a killed Interceptor's first visible row (y >= 24)
//                to its death: mean and max.
// The player's side (rams, laser hits, deaths) is scripts/measure-interceptor-hits.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readTraceCsv } from "./measure-boss-fight.mjs";
import { interceptorHits } from "./measure-interceptor-hits.mjs";

const INTERCEPTOR = 24;
const LIGHT_TOP = 24;
const RETIRE_Y = 232;
const live = (state) => state === 1 || state === 2;

export function interceptorPlay(csvFile) {
  const rows = readTraceCsv(csvFile);
  const base = csvFile.replace(/\.csv$/, "");
  const lightRows = readTraceCsv(`${base}-light.csv`);
  const lightByFrame = new Map(lightRows.map((row) => [row.frame, row]));
  const tally = () => ({ shots: 0, shotsSeen: 0, hits: 0, killed: 0, escaped: 0, ttk: [] });
  const level = tally();
  const boss = tally();
  const firstVisible = new Map();
  let previousLight = null;
  let previous = null;
  for (const row of rows) {
    const light = lightByFrame.get(row.frame);
    if (light === undefined) continue;
    const bucket = row.boss_state >= 1 ? boss : level;
    const isInterceptor = (slot) => row[`light_archetype${slot}`] === INTERCEPTOR;
    if (row.fire_accept_calls > 0) {
      bucket.shots += row.fire_accept_calls;
      for (let slot = 0; slot < 4; slot += 1) {
        if (!isInterceptor(slot) || !live(light[`state${slot}`])) continue;
        const y = light[`y${slot}`];
        if (y >= LIGHT_TOP && y < row.player_y) {
          bucket.shotsSeen += row.fire_accept_calls;
          break;
        }
      }
    }
    for (let slot = 0; slot < 4; slot += 1) {
      if (!isInterceptor(slot) && !(previous !== null && previous[`light_archetype${slot}`] === INTERCEPTOR)) continue;
      const state = light[`state${slot}`];
      if (live(state) && light[`y${slot}`] >= LIGHT_TOP && light[`y${slot}`] < RETIRE_Y &&
          !firstVisible.has(slot)) firstVisible.set(slot, row.frame);
      if (previousLight === null) continue;
      const was = previousLight[`state${slot}`];
      if (!live(was)) continue;
      const hpBefore = previousLight[`hp${slot}`];
      if (live(state) && light[`hp${slot}`] < hpBefore) bucket.hits += hpBefore - light[`hp${slot}`];
      if (!live(state)) {
        const y = previousLight[`y${slot}`];
        // It left: the climb wrapped past the top into the retire test, or it
        // dropped past the bottom. Otherwise the last hit point went.
        const left = light[`y${slot}`] >= RETIRE_Y || y >= RETIRE_Y || y < LIGHT_TOP;
        if (left) bucket.escaped += 1;
        else {
          bucket.killed += 1;
          bucket.hits += 1;
          if (firstVisible.has(slot)) bucket.ttk.push(row.frame - firstVisible.get(slot));
        }
        firstVisible.delete(slot);
      }
    }
    previousLight = light;
    previous = row;
  }
  const summarise = (b) => ({
    shots: b.shots, shotsSeen: b.shotsSeen, hits: b.hits,
    ratio: b.shotsSeen ? Number((b.hits / b.shotsSeen).toFixed(3)) : null,
    killed: b.killed, escaped: b.escaped,
    ttkMean: b.ttk.length ? Math.round(b.ttk.reduce((a, c) => a + c, 0) / b.ttk.length) : null,
    ttkMax: b.ttk.length ? Math.max(...b.ttk) : null,
  });
  const player = interceptorHits(csvFile);
  return { session: path.basename(base), frames: rows.length,
    level: { ...summarise(level), player: player.level },
    boss: { ...summarise(boss), player: player.boss } };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const json = process.argv.includes("--json");
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const results = files.filter((file) => fs.existsSync(file.replace(/\.csv$/, "-light.csv"))).map(interceptorPlay);
  if (json) console.log(JSON.stringify(results, null, 1));
  else {
    for (const r of results) {
      for (const where of ["level", "boss"]) {
        const b = r[where];
        if (b.shotsSeen === 0 && b.killed === 0 && b.escaped === 0) continue;
        console.log(`${r.session} ${where}: ${b.shotsSeen} of ${b.shots} shots with an Interceptor up, Interceptor hits ${b.hits} ` +
          `(ratio ${b.ratio ?? "-"}), killed ${b.killed}, escaped ${b.escaped}, ttk mean ${b.ttkMean ?? "-"} ` +
          `max ${b.ttkMax ?? "-"}; laser hits on the ship ${b.player.laser}, rams ${b.player.rams}, deaths ${b.player.deaths}`);
      }
    }
  }
}
