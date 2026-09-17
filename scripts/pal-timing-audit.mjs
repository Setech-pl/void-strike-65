// PAL timing audit. Promoted from the uncommitted scripts/measure-timing-audit.mjs.
//
// Why this exists: `missed_frames` and `extra_vbi_boundaries` are derived from
// Atari800_nframes crossings inside one traced main-loop iteration. A frame that
// overruns its fence simply parks in `wait_frame_at_line` until the SAME VCOUNT
// comes round on the next physical frame, so the counters see one boundary and
// report 0. They cannot detect an overrun; this audit can.
//
// The gameplay fence: in fighter OPEN the main loop reaches
// `profile_after_sector` and then calls `publish_fighter_projectile_overlays`,
// which waits for VCOUNT $77 (PAL scanlines 238-239). All work between the row
// start and that call must fit before scanline 238 of the row's own physical
// frame. Miss it and the wait costs one whole PAL frame, after which the loop
// keeps starting one phase later (row start moves from ~18 to ~250-273) until a
// new gameplay generation resyncs it. Raw counts of rows over the hard gate
// therefore conflate one real miss with its phase-shift aftermath and must not
// be used to compare builds; DISTINCT MISS EVENTS must.
//
// usage: node scripts/pal-timing-audit.mjs [--json <path>] <csv-or-dir>...
import fs from "node:fs";
import path from "node:path";

export const PAL_FRAME_CYCLES = 35_568;
export const LINE_CYCLES = 114;
export const HARD_GATE_CYCLES = 32_568;
export const TARGET_CYCLES = 31_200;
// wait_frame_at_line waits for VCOUNT == $77 and then for VCOUNT != $77, so
// arriving anywhere inside PAL scanlines 238-239 still catches the fence. The
// deadline is therefore the end of that window: the start of scanline 240.
// Arrive at or after it and the wait costs one whole physical PAL frame.
export const FENCE_SCANLINE = 238;
export const FENCE_DEADLINE_SCANLINE = 240;
// `profile_clock19` is `profile_after_sector`, the last main-loop checkpoint
// before `jsr publish_fighter_projectile_overlays`. Keep in step with
// traceProfileLabels in scripts/runtime-wall-trace.mjs.
export const FENCE_ENTRY_FIELD = "profile_clock19";
// A row is in the loop's normal phase when its start scanline sits within this
// many scanlines of the session's modal start for its publication path.
export const PHASE_TOLERANCE_SCANLINES = 8;

const REQUIRED_FIELDS = ["frame", "start_clock", "start_scanline", "start_cycle",
  "start_host_frame", "wall_cycles", FENCE_ENTRY_FIELD, "profile_publication_begin"];

function modeOf(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = null;
  let bestCount = -1;
  for (const [value, count] of counts) if (count > bestCount) { best = value; bestCount = count; }
  return best;
}

// One traced main-loop iteration. `fighter` rows are fence-bound; `capital`
// rows publish without the $77 wait and are bounded by the physical frame.
function classify(row) {
  if (!(row[FENCE_ENTRY_FIELD] > 0)) return "partial";
  return row.profile_publication_begin > 0 ? "fighter" : "capital";
}

/**
 * Audit one replay's parsed wall-trace rows.
 * Rows must be numeric objects in emission order (parseCsv output shape).
 */
export function auditSession(sessionId, rows) {
  if (rows.length > 0) {
    for (const field of REQUIRED_FIELDS) {
      if (!Number.isInteger(rows[0][field])) {
        throw new Error(`${sessionId}: wall-trace row is missing numeric "${field}"; ` +
          "the CSV schema changed and scripts/pal-timing-audit.mjs must be updated");
      }
    }
  }
  const paths = rows.map(classify);
  const normalStart = new Map();
  for (const name of ["fighter", "capital", "partial"]) {
    const starts = rows.filter((unused, index) => paths[index] === name)
      .map((row) => row.start_scanline);
    if (starts.length > 0) normalStart.set(name, modeOf(starts));
  }
  const inNormalPhase = (index) => {
    const reference = normalStart.get(paths[index]);
    return reference !== undefined &&
      Math.abs(rows[index].start_scanline - reference) <= PHASE_TOLERANCE_SCANLINES;
  };

  const samples = rows.map((row, index) => {
    const frameBase = row.start_clock - (row.start_scanline * LINE_CYCLES + row.start_cycle);
    // The fence the row is actually aiming at: the next VCOUNT $77 window whose
    // end still lies ahead of its own start, so a phase-shifted row is measured
    // against a reachable fence rather than one already in the past.
    let deadline = frameBase + FENCE_DEADLINE_SCANLINE * LINE_CYCLES;
    while (deadline <= row.start_clock) deadline += PAL_FRAME_CYCLES;
    const fenceBound = paths[index] === "fighter";
    const preWait = row[FENCE_ENTRY_FIELD] > 0
      ? row[FENCE_ENTRY_FIELD] - row.start_clock : null;
    const margin = fenceBound ? deadline - row[FENCE_ENTRY_FIELD] : null;
    // Measured, not inferred: a caught fence releases at the window end, a
    // missed one a whole physical frame later. This is independent of the few
    // cycles between profile_after_sector and the wait itself.
    const fenceOverrun = fenceBound &&
      row.profile_publication_begin - deadline > PAL_FRAME_CYCLES / 2;
    return {
      index,
      frame: row.frame,
      host_frame: row.start_host_frame,
      generation: row.gameplay_generation ?? 0,
      path: paths[index],
      start_scanline: row.start_scanline,
      wall_cycles: row.wall_cycles,
      pre_wait_cycles: preWait,
      fence_margin_cycles: margin,
      // A fence-bound row overruns when its pre-wait work crosses scanline 238.
      // A capital row has no fence: it overruns when the whole iteration no
      // longer fits inside one physical PAL frame.
      overran: fenceBound ? fenceOverrun : row.wall_cycles > PAL_FRAME_CYCLES,
      // Non-zero only if the arithmetic deadline and the measured release
      // disagree, which would mean this audit's fence model has drifted.
      fence_model_disagreement: fenceBound && fenceOverrun !== (margin < 0) ? 1 : 0,
      normal_phase: inNormalPhase(index),
    };
  });

  const missEvents = [];
  for (const sample of samples) {
    if (!sample.overran) continue;
    const previous = samples[sample.index - 1];
    const continuation = previous !== undefined &&
      previous.generation === sample.generation && !previous.normal_phase;
    // Rows still in the shifted phase left behind by an earlier overrun belong
    // to that event, not to a new one.
    if (continuation) continue;
    let shifted = 0;
    for (let index = sample.index + 1; index < samples.length; index += 1) {
      if (samples[index].generation !== sample.generation) break;
      if (samples[index].normal_phase) break;
      shifted += 1;
    }
    missEvents.push({
      frame: sample.frame,
      row_index: sample.index,
      host_frame: sample.host_frame,
      generation: sample.generation,
      path: sample.path,
      wall_cycles: sample.wall_cycles,
      pre_wait_cycles: sample.pre_wait_cycles,
      fence_margin_cycles: sample.fence_margin_cycles,
      shifted_phase_rows_until_resync: shifted,
    });
  }

  const fenceSamples = samples.filter((sample) => sample.fence_margin_cycles !== null);
  const worstPreWait = fenceSamples.reduce((worst, sample) =>
    worst === null || sample.pre_wait_cycles > worst.pre_wait_cycles ? sample : worst, null);
  const worstMargin = fenceSamples.reduce((worst, sample) =>
    worst === null || sample.fence_margin_cycles < worst.fence_margin_cycles ? sample : worst, null);
  const sum = (field) => rows.reduce((total, row) => total + (row[field] ?? 0), 0);
  const maximum = (field) => rows.length === 0 ? 0 : Math.max(...rows.map((row) => row[field] ?? 0));

  return {
    session: sessionId,
    frames: rows.length,
    fence_bound_frames: fenceSamples.length,
    normal_start_scanline: Object.fromEntries(normalStart),
    distinct_miss_events: missEvents.length,
    miss_events: missEvents,
    overrun_rows: samples.filter((sample) => sample.overran).length,
    fence_model_disagreements:
      samples.reduce((total, sample) => total + (sample.fence_model_disagreement ?? 0), 0),
    shifted_phase_rows: samples.filter((sample) => !sample.normal_phase).length,
    worst_pre_wait_cycles: worstPreWait?.pre_wait_cycles ?? null,
    worst_pre_wait_frame: worstPreWait?.frame ?? null,
    worst_fence_margin_cycles: worstMargin?.fence_margin_cycles ?? null,
    worst_fence_margin_frame: worstMargin?.frame ?? null,
    maximum_wall_cycles: maximum("wall_cycles"),
    rows_over_target: rows.filter((row) => row.wall_cycles > TARGET_CYCLES).length,
    rows_over_hard_gate: rows.filter((row) => row.wall_cycles > HARD_GATE_CYCLES).length,
    // Kept for continuity only. Derived from Atari800_nframes crossings, so an
    // overrun that parks in wait_frame_at_line reports 0 here: unreliable for
    // overrun detection.
    unreliable_counters: {
      missed_frames: sum("missed_frames"),
      extra_vbi_boundaries: sum("extra_vbi_boundaries"),
      dli_sequence_violations: maximum("dli_sequence_violations"),
    },
    passed: missEvents.length === 0,
  };
}

export function auditAllRows(allRows) {
  const bySession = new Map();
  for (const row of allRows) {
    const id = row.session ?? "unknown";
    if (!bySession.has(id)) bySession.set(id, []);
    bySession.get(id).push(row);
  }
  return [...bySession].map(([id, rows]) => auditSession(id, rows));
}

export function formatAudit(audit) {
  const cycles = (value) => value === null ? "n/a" : String(value);
  return [
    audit.session.padEnd(44),
    `frames ${String(audit.frames).padStart(4)}`,
    `misses ${String(audit.distinct_miss_events).padStart(3)}`,
    `preWait ${cycles(audit.worst_pre_wait_cycles).padStart(6)}`,
    `margin ${cycles(audit.worst_fence_margin_cycles).padStart(6)}`,
    `maxWall ${String(audit.maximum_wall_cycles).padStart(6)}`,
    `>target ${String(audit.rows_over_target).padStart(4)}`,
    `>hard ${String(audit.rows_over_hard_gate).padStart(4)}`,
    `shifted ${String(audit.shifted_phase_rows).padStart(4)}`,
    `[unreliable: missed ${audit.unreliable_counters.missed_frames}` +
      ` extraVBI ${audit.unreliable_counters.extra_vbi_boundaries}` +
      ` DLIerr ${audit.unreliable_counters.dli_sequence_violations}]`,
    audit.passed ? "PASS" : "FAIL",
  ].join("  ");
}

export function reportAudit(audit) {
  console.log(`  PAL timing audit  ${formatAudit(audit)}`);
  for (const event of audit.miss_events) {
    console.log(`    MISS row ${event.row_index} (frame ${event.frame}, host frame ` +
      `${event.host_frame}, ${event.path}): wall ${event.wall_cycles} cycles, pre-wait ` +
      `${event.pre_wait_cycles}, margin ${event.fence_margin_cycles}, ` +
      `${event.shifted_phase_rows_until_resync} shifted-phase rows until resync`);
  }
}

export function reportAudits(audits, { label = "PAL timing audit", perAudit = true } = {}) {
  console.log(`${label}: line-238 fence, distinct miss events ` +
    "(missed_frames / extra_vbi_boundaries cannot see an overrun: they are " +
    "derived from Atari800_nframes, and an overrunning frame simply waits for " +
    "the same VCOUNT one frame later).");
  if (perAudit) for (const audit of audits) reportAudit(audit);
  const total = audits.reduce((sum, audit) => sum + audit.distinct_miss_events, 0);
  console.log(`PAL timing audit: ${total} distinct miss events across ` +
    `${audits.length} replays (${total === 0 ? "PASS" : "FAIL"})`);
  return total;
}

const NUMERIC = /^-?\d+$/;

export function auditCsvFile(file) {
  const text = fs.readFileSync(file, "utf8").trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",");
  const rows = lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    const row = {};
    for (let index = 0; index < headers.length; index += 1) {
      const value = values[index];
      row[headers[index]] = NUMERIC.test(value) ? Number(value) : value;
    }
    return row;
  });
  return auditSession(path.basename(file, ".csv"), rows);
}

// The build directory also holds auxiliary per-subsystem CSVs and traces from
// older schemas. A directory scan audits only files carrying the full
// main-loop schema; a file named explicitly still reports why it cannot.
function isSessionCsv(file) {
  if (!file.endsWith(".csv")) return false;
  const header = fs.readFileSync(file, "utf8").split(/\r?\n/, 1)[0].split(",");
  return REQUIRED_FIELDS.every((field) => header.includes(field));
}

function main(argv) {
  const jsonIndex = argv.indexOf("--json");
  const jsonPath = jsonIndex === -1 ? undefined : argv[jsonIndex + 1];
  const targets = argv.filter((value, index) =>
    jsonIndex === -1 ? true : index !== jsonIndex && index !== jsonIndex + 1);
  if (targets.length === 0) {
    console.error("usage: node scripts/pal-timing-audit.mjs [--json <path>] <csv-or-dir>...");
    process.exitCode = 2;
    return;
  }
  const files = [];
  for (const target of targets) {
    if (fs.statSync(target).isDirectory()) {
      for (const name of fs.readdirSync(target).sort()) {
        const file = path.join(target, name);
        if (fs.statSync(file).isFile() && isSessionCsv(file)) files.push(file);
      }
    } else files.push(target);
  }
  const audits = [];
  for (const file of files) {
    try {
      audits.push(auditCsvFile(file));
    } catch (error) {
      console.log(`  ${path.basename(file, ".csv").padEnd(44)}  skipped: ${error.message}`);
    }
  }
  const total = reportAudits(audits);
  if (jsonPath !== undefined)
    fs.writeFileSync(jsonPath, `${JSON.stringify({ audits, distinct_miss_events: total }, null, 2)}\n`);
  if (total !== 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
