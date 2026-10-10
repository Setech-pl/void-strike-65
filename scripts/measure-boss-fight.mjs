// feat/boss-r1-tuning: the boss fight as a wall-trace CSV records it - the
// entry, the fight's length, the hits and deaths in the boss sector, the boss
// frames' worst fence margin and DMA-on maximum (split by whether a Light is
// live, for an escort) - for the owner's comparison of boss layouts.
//
//   node scripts/measure-boss-fight.mjs <session.csv> [...]
//
// MEASURED from the CSVs (Atari800, the trace harness): the fight runs from
// the engaged row (boss_state 1) to the chain's first row (boss_state 3), in
// active gameplay frames; a hit is a row whose player_damage_applied is set
// (laser_damage_calls counts the laser's); a death a row whose
// player_lives_after is below player_lives (lives are held, so the game goes
// on); the fence margin is scripts/pal-timing-audit.mjs's, over the boss rows.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditSamples } from "./pal-timing-audit.mjs";

export function readTraceCsv(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((line) => line.length > 0);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    header.forEach((name, i) => {
      const value = cells[i];
      row[name] = /^-?\d+$/.test(value) ? Number(value) : value;
    });
    return row;
  });
}

const lightLive = (row) => [0, 1, 2, 3].some((i) => (row[`light_state${i}`] ?? 0) !== 0);

export function bossFight(rows, sessionId = "session") {
  const entry = rows.find((row) => row.boss_entry === 1);
  // The entry row is the WARNING screen and the read (a transition, set aside
  // as the evidence sets it aside); the fight is engaged on the next row.
  const engaged = rows.find((row) => row.boss_state === 1 && row.boss_entry !== 1);
  const chain = rows.find((row) => row.boss_state >= 3);
  const bossRows = rows.filter((row) => row.boss_state >= 1 && row.boss_entry !== 1 &&
    (chain === undefined || row.frame < chain.frame));
  const { samples } = auditSamples(sessionId, rows);
  const byFrame = new Map(samples.map((sample) => [sample.frame, sample]));
  const worst = (subset) => {
    let margin = null;
    let marginFrame = null;
    let wall = 0;
    for (const row of subset) {
      const sample = byFrame.get(row.frame);
      if (sample?.fence_margin_cycles != null && (margin === null || sample.fence_margin_cycles < margin)) {
        margin = sample.fence_margin_cycles;
        marginFrame = row.frame;
      }
      wall = Math.max(wall, row.wall_cycles);
    }
    return { frames: subset.length, worstMargin: margin, worstMarginFrame: marginFrame, dmaOnMax: wall };
  };
  let hits = 0;
  let laserHits = 0;
  let deaths = 0;
  let previousLaser = bossRows[0]?.laser_damage_calls ?? 0;
  let edgeFrames = 0;
  for (const row of bossRows) {
    if (row.player_damage_applied) hits += 1;
    if (row.laser_damage_calls > previousLaser) laserHits += row.laser_damage_calls - previousLaser;
    previousLaser = row.laser_damage_calls;
    if (row.player_lives_after < row.player_lives) deaths += 1;
    if (row.player_x <= 54 || row.player_x >= 196) edgeFrames += 1;
  }
  return {
    session: sessionId,
    entryFrame: entry?.frame ?? null,
    entryHostFrames: entry === undefined ? null : entry.next_start_host_frame - entry.start_host_frame,
    engagedFrame: engaged?.frame ?? null,
    chainFrame: chain?.frame ?? null,
    fightFrames: engaged && chain ? chain.active_gameplay_frame - engaged.active_gameplay_frame : null,
    bossFrames: bossRows.length,
    hits,
    laserHits,
    deaths,
    edgeFrames,
    all: worst(bossRows),
    noLight: worst(bossRows.filter((row) => !lightLive(row))),
    lightLive: worst(bossRows.filter(lightLive)),
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const json = process.argv.includes("--json");
  const results = process.argv.slice(2).filter((a) => !a.startsWith("--"))
    .map((file) => bossFight(readTraceCsv(file), path.relative(process.cwd(), file)));
  if (json) console.log(JSON.stringify(results, null, 1));
  else {
    for (const r of results) {
      const s = (f) => (f === null ? "-" : (f / 50).toFixed(1));
      console.log(`${r.session}: entry ${r.entryHostFrames ?? "-"} host frames at f${r.entryFrame ?? "-"}; ` +
        `fight ${s(r.fightFrames)} s (${r.fightFrames ?? "not finished"} frames, chain f${r.chainFrame ?? "-"}); ` +
        `boss frames ${r.bossFrames}, hits ${r.hits} (laser ${r.laserHits}), deaths ${r.deaths}, ` +
        `at an edge ${r.edgeFrames}; worst margin ${r.all.worstMargin} (f${r.all.worstMarginFrame}), ` +
        `DMA-on ${r.all.dmaOnMax}; Light live ${r.lightLive.frames} frames: ${r.lightLive.worstMargin ?? "-"} / ` +
        `${r.lightLive.frames ? r.lightLive.dmaOnMax : "-"}; no Light: ${r.noLight.worstMargin} / ${r.noLight.dmaOnMax}`);
    }
  }
}
