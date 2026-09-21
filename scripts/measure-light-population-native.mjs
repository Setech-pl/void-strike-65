// MEASUREMENT ONLY (plan-light-multiplicity.md §4.3, with [C2] and [C3]).
// Joins a session's general observer CSV with its --light-trace CSV on the
// frame number and reports, per live-Light count:
//   * the standing pre-fence cost of a frame,
//   * the ADMISSION frame's cost, separated out ([C3]),
//   * the KILL frame's cost, un-serialised - the negative control the GO/NO-GO
//     rests on, which is why the token is not in the build yet,
//   * the vector-table overhead, 3 cycles per kernel entry ([C2]).
// Needs a --force-light-population build and a --light-trace run.
//
//   node scripts/measure-light-population-native.mjs <session-id> [...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const traceDir = path.join(root, "build", "runtime-wall-trace");
const FENCE_ENTRY = "profile_clock19";
const LINE_CYCLES = 114;
const FENCE_DEADLINE_SCANLINE = 240;
const PAL_FRAME_CYCLES = 35_568;
const VECTOR_COST = 3;              // one `jmp abs` per kernel entry
const VECTORS = ["v_publish", "v_update", "v_shot", "v_backing", "v_resolve"];

function readCsv(file) {
  const [header, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(keys.map((key, index) => {
      const raw = cells[index];
      const value = Number(raw);
      return [key, raw !== "" && Number.isFinite(value) ? value : raw];
    }));
  });
}

// The fence margin of a row, exactly as pal-timing-audit derives it: the next
// reachable VCOUNT $77 deadline minus the moment the frame reached the fence.
// This is the number the GO/NO-GO is stated against, not the pre-wait itself.
function fenceMargin(row) {
  const frameBase = row.start_clock - (row.start_scanline * LINE_CYCLES + row.start_cycle);
  let deadline = frameBase + FENCE_DEADLINE_SCANLINE * LINE_CYCLES;
  while (deadline <= row.start_clock) deadline += PAL_FRAME_CYCLES;
  return deadline - row[FENCE_ENTRY];
}

const all = { buckets: new Map(), admissions: new Map(), kills: new Map(),
  vectors: new Map(), margins: new Map(), killMargins: new Map() };
function aggregate(buckets, admissions, kills, vectors) {
  for (const [name, map] of [["buckets", buckets], ["admissions", admissions],
    ["kills", kills], ["vectors", vectors], ["margins", arguments[4]],
    ["killMargins", arguments[5]]]) {
    for (const [live, values] of map) {
      if (!all[name].has(live)) all[name].set(live, []);
      all[name].get(live).push(...values);
    }
  }
}

const stats = (values) => values.length
  ? { n: values.length, min: Math.min(...values),
    mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    max: Math.max(...values) }
  : { n: 0 };

for (const session of process.argv.slice(2)) {
  const wall = readCsv(path.join(traceDir, `${session}.csv`));
  const light = readCsv(path.join(traceDir, `${session}-light.csv`));
  const byFrame = new Map(wall.map((row) => [row.frame, row]));
  const buckets = new Map();
  const admissions = new Map();
  const kills = new Map();
  const vectors = new Map();
  const margins = new Map();
  const killMargins = new Map();
  let previous = null;
  for (const row of light) {
    const wallRow = byFrame.get(row.frame);
    if (wallRow === undefined || !(wallRow[FENCE_ENTRY] > 0)) { previous = row; continue; }
    const pre = wallRow[FENCE_ENTRY] - wallRow.start_clock;
    const entries = VECTORS.reduce((sum, key) => sum + row[key], 0);
    const live = row.live;
    const push = (map, key, value) => {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(value);
    };
    if (previous !== null && row.live > previous.live) {
      push(admissions, live, pre);           // a slot was filled this frame
    } else if (previous !== null && row.live < previous.live) {
      push(kills, previous.live, pre);       // a slot emptied: kill or retire
      push(killMargins, previous.live, fenceMargin(wallRow));
    } else {
      push(buckets, live, pre);              // standing
    }
    push(margins, live, fenceMargin(wallRow));
    push(vectors, live, entries * VECTOR_COST);
    previous = row;
  }
  aggregate(buckets, admissions, kills, vectors, margins, killMargins);
  console.log(`\n== ${session} ==`);
  const counts = [...new Set([...buckets.keys(), ...admissions.keys(), ...kills.keys()])]
    .sort((a, b) => a - b);
  for (const live of counts) {
    console.log(` ${live} live Light(s)`);
    console.log(`   standing  ${JSON.stringify(stats(buckets.get(live) ?? []))}`);
    console.log(`   admission ${JSON.stringify(stats(admissions.get(live) ?? []))}`);
    console.log(`   kill/exit ${JSON.stringify(stats(kills.get(live) ?? []))}`);
    console.log(`   vectors   ${JSON.stringify(stats(vectors.get(live) ?? []))}`);
  }
}

console.log("\n== ALL SESSIONS ==");
for (const live of [...all.buckets.keys()].sort((a, b) => a - b)) {
  console.log(` ${live} live Light(s)`);
  console.log(`   standing  ${JSON.stringify(stats(all.buckets.get(live) ?? []))}`);
  console.log(`   admission ${JSON.stringify(stats(all.admissions.get(live) ?? []))}`);
  console.log(`   kill/exit ${JSON.stringify(stats(all.kills.get(live) ?? []))}`);
  console.log(`   vectors   ${JSON.stringify(stats(all.vectors.get(live) ?? []))}`);
  const margins = all.margins.get(live) ?? [];
  const killMargins = all.killMargins.get(live) ?? [];
  console.log(`   MARGIN    worst ${margins.length ? Math.min(...margins) : "-"}` +
    `, worst on a kill/exit frame ${killMargins.length ? Math.min(...killMargins) : "-"}`);
}
