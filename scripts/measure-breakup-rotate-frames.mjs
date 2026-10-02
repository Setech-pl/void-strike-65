// MEASUREMENT ONLY. Not part of the build, the trace or the test suite.
// Heavy kill frames of a runtime-wall-trace run, split the way
// docs/plans/m3-waves-heavy.md §9 classifies them: by whether the frame
// rotates the ring (its world_ring segment is over 4,500 cycles) and by
// whether the break-up's five effect cells appear on the kill frame. Also the
// break-ups that land on a later frame, and the Heavy spawn frames.
//
// With --compare=<dir> it also compares every session of the run with the
// same session of another run (normally `main`'s CSVs, copied aside before a
// regeneration): the final score, the score events, the Heavy kills, the
// capsule sequence and, frame by frame, the gameplay columns a visual-timing
// change must not move.
//
//   node scripts/measure-breakup-rotate-frames.mjs [--dir=build/runtime-wall-trace] [--compare=<dir>]
import fs from "node:fs";
import path from "node:path";
import { auditSamples } from "./pal-timing-audit.mjs";

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=")[1];
const directory = path.resolve(argument("dir") ?? "build/runtime-wall-trace");
const compareDirectory = argument("compare") && path.resolve(argument("compare"));

const SEGMENTS = ["projectile_erase", "entity_erase", "capsule", "frame_visuals", "player",
  "enemy_update", "fighter_projectile_update", "player_enemy_collision", "broadside_update",
  "enemy_damage_resolution", "collisions_return", "player_weapon", "hostile_weapon", "world_ring",
  "hull_contact", "entity_update", "effect_visuals", "broadside_render", "entity_render", "sector"];
const ROTATE_RING_CYCLES = 4500;
const BREAKUP_CELLS = 5;
// What a visual-timing change must leave alone, frame by frame.
const GAMEPLAY = ["score_lo", "score_hi", "enemy_member0_state", "enemy_member1_state",
  "enemy_live_count", "player_lives", "player_health", "pickup_state", "pickup_counter",
  "pickup_booster_state"];

function splitLine(line) {
  const out = [];
  let current = "";
  let quoted = false;
  for (const character of line) {
    if (character === "\"") quoted = !quoted;
    else if (character === "," && !quoted) { out.push(current); current = ""; } else current += character;
  }
  out.push(current);
  return out;
}

function readSession(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  const head = splitLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    const row = {};
    head.forEach((name, index) => {
      const number = Number(values[index]);
      row[name] = values[index] !== "" && Number.isFinite(number) ? number : values[index];
    });
    return row;
  });
}

function segments(row) {
  const out = {};
  let previous = row.start_clock;
  SEGMENTS.forEach((name, index) => {
    const clock = row[`profile_clock${index}`];
    out[name] = clock > 0 ? clock - previous : 0;
    if (clock > 0) previous = clock;
  });
  return out;
}

const live = (row) => (row.enemy_member0_state === 1 ? 1 : 0) + (row.enemy_member1_state === 1 ? 1 : 0);
const score = (row) => row.score_hi * 256 + row.score_lo;

// The facts the comparison needs, from every row of a session.
function gameplaySummary(rows) {
  const capsules = [];
  let kills = 0;
  let scoreEvents = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const [previous, row] = [rows[index - 1], rows[index]];
    if (live(row) < live(previous) && score(row) > score(previous)) kills += 1;
    if (score(row) > score(previous)) scoreEvents += 1;
    if (row.pickup_state !== previous.pickup_state || row.pickup_booster_state !== previous.pickup_booster_state) {
      capsules.push(`${row.frame}:${row.pickup_state}/${row.pickup_booster_state}`);
    }
  }
  return { frames: rows.length, finalScore: score(rows.at(-1)), scoreEvents, kills, capsules };
}

const statistics = (values) => values.length === 0 ? "n=   0"
  : `n=${String(values.length).padStart(4)} min=${String(Math.min(...values)).padStart(5)} ` +
    `mean=${String(Math.round(values.reduce((a, b) => a + b, 0) / values.length)).padStart(5)} ` +
    `max=${String(Math.max(...values)).padStart(5)}`;

const classes = new Map();
const add = (key, sample, row) => {
  const bucket = classes.get(key) ?? { margins: [], rows: [] };
  bucket.margins.push(sample.fence_margin_cycles);
  bucket.rows.push(row);
  classes.set(key, bucket);
};

const comparison = [];
for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".csv")).sort()) {
  const rows = readSession(path.join(directory, file));
  if (rows.length === 0 || !("profile_clock19" in rows[0]) || !("enemy_member0_state" in rows[0])) continue;
  if (compareDirectory && fs.existsSync(path.join(compareDirectory, file))) {
    const other = readSession(path.join(compareDirectory, file));
    const mine = gameplaySummary(rows);
    const theirs = gameplaySummary(other);
    let frameDifferences = 0;
    const length = Math.min(rows.length, other.length);
    for (let index = 0; index < length; index += 1) {
      if (GAMEPLAY.some((name) => rows[index][name] !== other[index][name])) frameDifferences += 1;
    }
    comparison.push({ file, mine, theirs, frameDifferences });
  }
  let samples;
  try { ({ samples } = auditSamples(file, rows)); } catch { continue; }
  let previous = null;
  for (const sample of samples) {
    const row = rows[sample.index];
    if (sample.fence_margin_cycles !== null && previous && row.frame === previous.frame + 1) {
      const rotate = segments(row).world_ring > ROTATE_RING_CYCLES ? "rotate" : "no rotate";
      const bomber = (previous.colpm1 & 0xf0) === 0xc0 || (previous.colpm2 & 0xf0) === 0xc0;
      if (live(row) < live(previous)) {
        const spawned = row.effect_active_count === BREAKUP_CELLS && previous.effect_active_count !== BREAKUP_CELLS;
        add(`${bomber ? "Bomber" : "Raider"} kill, ${rotate}, break-up ${spawned ? "on the kill frame" : "not on it"}`,
          sample, `${file}:${row.frame}`);
      } else if (live(row) === 2 && live(previous) === 0) {
        add(`Heavy spawn, ${rotate}`, sample, `${file}:${row.frame}`);
      } else if (row.effect_active_count === BREAKUP_CELLS && previous.effect_active_count === 0 &&
        live(row) === live(previous)) {
        add(`break-up on a later frame, ${rotate}`, sample, `${file}:${row.frame}`);
      }
    }
    previous = row;
  }
}

console.log(`== frame classes, ${path.relative(process.cwd(), directory)}`);
for (const key of [...classes.keys()].sort()) {
  const bucket = classes.get(key);
  const worst = bucket.rows[bucket.margins.indexOf(Math.min(...bucket.margins))];
  console.log(`${key.padEnd(52)} margin ${statistics(bucket.margins)}  worst ${worst}`);
}
const kills = [...classes].filter(([key]) => key.includes(" kill, "));
const total = kills.reduce((sum, [, bucket]) => sum + bucket.margins.length, 0);
const onRotate = kills.filter(([key]) => key.includes(", rotate, break-up on the kill frame"))
  .reduce((sum, [, bucket]) => sum + bucket.margins.length, 0);
console.log(`Heavy kills ${total}; break-up on a rotate kill frame ${onRotate}`);

if (compareDirectory) {
  console.log(`\n== replays against ${path.relative(process.cwd(), compareDirectory)}`);
  let differing = 0;
  for (const { file, mine, theirs, frameDifferences } of comparison) {
    const same = mine.frames === theirs.frames && mine.finalScore === theirs.finalScore &&
      mine.scoreEvents === theirs.scoreEvents && mine.kills === theirs.kills &&
      mine.capsules.join() === theirs.capsules.join() && frameDifferences === 0;
    if (!same) differing += 1;
    console.log(`${same ? "SAME" : "DIFF"} ${file.padEnd(44)} score ${theirs.finalScore} -> ${mine.finalScore}` +
      `  score events ${theirs.scoreEvents} -> ${mine.scoreEvents}  Heavy kills ${theirs.kills} -> ${mine.kills}` +
      `  capsule events ${theirs.capsules.length} -> ${mine.capsules.length}` +
      `  frames ${theirs.frames} -> ${mine.frames}  gameplay-column frame differences ${frameDifferences}`);
  }
  console.log(`${comparison.length} sessions compared, ${differing} differ`);
}
