// S5-5 (feat/boss-region-2, docs/plans/s5-boss-regions.md §6.5): region 2's
// fight, the Bastion's order puzzle, as a wall-trace CSV records it - on top
// of scripts/measure-boss-fight.mjs (the entry, the fight's length, the hits,
// the deaths, the boss frames' gates):
//
//   node scripts/measure-boss-r2-fight.mjs <build/<route>/runtime-wall-trace/<session>.csv> [...] [--json]
//
// MEASURED from the CSVs (Atari800, the trace harness):
//   seconds     the fight-length proxy (the owner's rule since 2026-10-10,
//               journal §AH): the aiming bot's fight frames x main's plain
//               sweep / main's aiming bot, per difficulty - 3,834 / 4,612 /
//               5,964 over 1,847 / 2,231 / 2,663 frames (region 1's, the
//               plan's §6.5.4) - / 50;
//   slides, covers  per side: the rails' slides (rail_k) and the slides that
//               reached the last position with the cannon standing;
//   phases      the doors phase - from the frame every cannon is destroyed or
//               covered and both rails' last guns are destroyed (the doors'
//               cover, src/hybrid/boss.s rail_lock) to the doors' fall - and
//               the core phase - from the doors' fall to the chain; in each,
//               the beams fired (a laser entering its beam), the hits on the
//               bot and how many of them were the lasers';
//   escorts     Light slots going live in the fight.
// The module indices are the manifest's (boss.regions[1].rails / .hangar).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bossFight, readTraceCsv } from "./measure-boss-fight.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLAIN_MAIN = [3834, 4612, 5964];
const AIM_MAIN = [1847, 2231, 2663];
export const proxySeconds = (frames, difficulty) => frames * PLAIN_MAIN[difficulty] / AIM_MAIN[difficulty] / 50;

// The route's manifest: the CSV's build directory's.
function manifestFor(file) {
  let directory = path.dirname(path.resolve(file));
  while (directory !== rootDirectory && !fs.existsSync(path.join(directory, "manifest.json"))) directory = path.dirname(directory);
  return JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
}

export function regionTwoFight(rows, { manifest, sessionId = "session", difficulty = null } = {}) {
  const base = bossFight(rows, sessionId);
  const { rails, hangar } = manifest.boss.regions[1];
  const alive = (row, index) => ((row.boss_alive >> index) & 1) === 1;
  const nibble = (value, side) => (value >> (4 * side)) & 15;
  const engaged = rows.find((row) => row.boss_state === 1 && row.boss_entry !== 1);
  const chain = rows.find((row) => row.boss_state >= 3);
  const fight = rows.filter((row) => row.boss_state === 1 && row.boss_entry !== 1);
  const covered = [false, false];
  const covers = [];
  let unlocked = null, doorsFell = null;
  for (let i = 1; i < fight.length; i += 1) {
    const before = fight[i - 1], row = fight[i];
    rails.sides.forEach((side, s) => {
      if (nibble(row.rail_k, s) === rails.positions && nibble(before.rail_k, s) < rails.positions &&
        alive(row, side.cannonIndex)) {
        covered[s] = true;
        covers.push({ side: side.name, frame: row.frame });
      }
    });
    const ready = rails.sides.every((side, s) => (!alive(row, side.cannonIndex) || covered[s]) &&
      !alive(row, side.gunIndices.at(-1)));
    if (unlocked === null && ready) unlocked = row;
    if (doorsFell === null && alive(before, hangar.doorsIndex) && !alive(row, hangar.doorsIndex)) doorsFell = row;
  }
  const phase = (from, to) => {
    if (from === null) return null;
    const span = rows.filter((row) => row.frame >= from.frame && (to === null || to === undefined || row.frame < to.frame));
    let beams = 0, hits = 0, laserHits = 0;
    let previousLaser = span[0]?.laser_damage_calls ?? 0;
    for (let i = 1; i < span.length; i += 1) {
      for (let laser = 0; laser < 4; laser += 1) {
        const was = (span[i - 1].laser_states >> (2 * laser)) & 3, now = (span[i].laser_states >> (2 * laser)) & 3;
        if (now === 2 && was !== 2) beams += 1;
      }
      if (span[i].player_damage_applied) hits += 1;
      if (span[i].laser_damage_calls > previousLaser) laserHits += span[i].laser_damage_calls - previousLaser;
      previousLaser = span[i].laser_damage_calls;
    }
    return { frames: span.length, beams, hits, laserHits };
  };
  let escorts = 0;
  for (let i = 1; i < fight.length; i += 1) {
    for (let k = 0; k < 4; k += 1) {
      if (fight[i - 1][`light_state${k}`] === 0 && [1, 2].includes(fight[i][`light_state${k}`])) escorts += 1;
    }
  }
  const last = fight.at(-1) ?? {};
  return {
    ...base,
    seconds: base.fightFrames === null || difficulty === null ? null : proxySeconds(base.fightFrames, difficulty),
    slides: rails.sides.map((side, s) => nibble(last.rail_k ?? 0, s)),
    covers,
    unlockedFrame: unlocked?.frame ?? null,
    doorsFellFrame: doorsFell?.frame ?? null,
    doorsPhase: phase(unlocked, doorsFell ?? chain),
    corePhase: phase(doorsFell, chain),
    escorts,
    engagedFrame: engaged?.frame ?? null,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const json = process.argv.includes("--json");
  const results = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((file) => {
    const id = path.basename(file, ".csv");
    const difficulty = /-(\d)$/.exec(id) === null ? null : Number(/-(\d)$/.exec(id)[1]);
    return regionTwoFight(readTraceCsv(file), { manifest: manifestFor(file), sessionId: path.relative(process.cwd(), file), difficulty });
  });
  if (json) console.log(JSON.stringify(results, null, 1));
  else {
    const p = (ph) => (ph === null ? "-" : `${ph.frames} f, ${ph.beams} beams, ${ph.hits} hits (laser ${ph.laserHits})`);
    for (const r of results) {
      console.log(`${r.session}: fight ${r.fightFrames ?? "not finished"} frames = ${r.seconds === null ? "-" : r.seconds.toFixed(1)} s; ` +
        `hits ${r.hits} (laser ${r.laserHits}), deaths ${r.deaths}; slides ${r.slides.join("/")}, covers ` +
        `${r.covers.map((c) => `${c.side}@${c.frame}`).join(" ") || "none"}; doors phase ${p(r.doorsPhase)}; ` +
        `core phase ${p(r.corePhase)}; escorts ${r.escorts}; entry ${r.entryHostFrames}; worst margin ${r.all.worstMargin}, ` +
        `DMA-on ${r.all.dmaOnMax}`);
    }
  }
}
