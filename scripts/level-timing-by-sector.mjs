// Per-sector PAL timing of wall-trace replays: the worst line-238 fence margin
// and the DMA-on maximum, with frames, for each Director sector a replay
// crossed. Diagnostic only - it reads CSVs a focused run wrote (for a
// debug-route build: build/level-N-sM/runtime-wall-trace/) and is never
// release evidence. The fence model is scripts/pal-timing-audit.mjs's, applied
// to the whole replay; this only groups its per-frame samples.
//
// The sector is the `director_phase` column, which samples STATE_SECTOR
// ($80F6), 0-based; it is printed 1-based as the level file numbers sectors.
//
// usage: node scripts/level-timing-by-sector.mjs [--json <path>] <csv>...
import fs from "node:fs";
import path from "node:path";

import { auditSamples, auditSession, HARD_GATE_CYCLES } from "./pal-timing-audit.mjs";

const NUMERIC = /^-?\d+$/;

function readRows(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) =>
      [header, NUMERIC.test(values[index]) ? Number(values[index]) : values[index]]));
  });
}

export function timingBySector(sessionId, rows) {
  const audit = auditSession(sessionId, rows);
  const { samples } = auditSamples(sessionId, rows);
  const sectors = new Map();
  rows.forEach((row, index) => {
    const sector = row.director_phase + 1;
    if (!sectors.has(sector)) {
      sectors.set(sector, { sector, frames: 0, first_frame: row.frame, last_frame: row.frame,
        non_fighter_frames: 0, fence_bound_frames: 0, worst_fence_margin_cycles: null,
        worst_fence_margin_frame: null, maximum_wall_cycles: 0, maximum_wall_frame: null,
        rows_over_hard_gate: 0 });
    }
    const entry = sectors.get(sector);
    entry.frames += 1;
    entry.last_frame = row.frame;
    if (row.sector_state !== 7) entry.non_fighter_frames += 1;
    if (row.wall_cycles > HARD_GATE_CYCLES) entry.rows_over_hard_gate += 1;
    if (row.wall_cycles > entry.maximum_wall_cycles) {
      entry.maximum_wall_cycles = row.wall_cycles;
      entry.maximum_wall_frame = row.frame;
    }
    const margin = samples[index].fence_margin_cycles;
    if (margin === null) return;
    entry.fence_bound_frames += 1;
    if (entry.worst_fence_margin_cycles === null || margin < entry.worst_fence_margin_cycles) {
      entry.worst_fence_margin_cycles = margin;
      entry.worst_fence_margin_frame = row.frame;
    }
  });
  return {
    session: sessionId,
    frames: rows.length,
    distinct_miss_events: audit.distinct_miss_events,
    worst_fence_margin_cycles: audit.worst_fence_margin_cycles,
    worst_fence_margin_frame: audit.worst_fence_margin_frame,
    maximum_wall_cycles: audit.maximum_wall_cycles,
    sectors: [...sectors.values()].sort((a, b) => a.sector - b.sector),
  };
}

function main(argv) {
  const jsonIndex = argv.indexOf("--json");
  const jsonPath = jsonIndex === -1 ? undefined : argv[jsonIndex + 1];
  const files = argv.filter((unused, index) =>
    jsonIndex === -1 || (index !== jsonIndex && index !== jsonIndex + 1));
  const reports = files.map((file) => timingBySector(path.basename(file, ".csv"), readRows(file)));
  for (const report of reports) {
    console.log(`${report.session}: ${report.frames} frames, ` +
      `${report.distinct_miss_events} miss events, worst margin ` +
      `${report.worst_fence_margin_cycles} @${report.worst_fence_margin_frame}, ` +
      `max ${report.maximum_wall_cycles}`);
    for (const entry of report.sectors) {
      console.log(`  sector ${entry.sector}: frames ${entry.first_frame}-${entry.last_frame} ` +
        `(${entry.non_fighter_frames} not SECTOR_FIGHTER), margin ${entry.worst_fence_margin_cycles} ` +
        `@${entry.worst_fence_margin_frame}, max ${entry.maximum_wall_cycles} ` +
        `@${entry.maximum_wall_frame}, over ${HARD_GATE_CYCLES}: ${entry.rows_over_hard_gate}`);
    }
  }
  if (jsonPath !== undefined) fs.writeFileSync(jsonPath, `${JSON.stringify(reports, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
