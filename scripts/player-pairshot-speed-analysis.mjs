import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const traceDirectory = path.join(root, "build", "runtime-wall-trace");
const phaseArgument = process.argv.find((argument) => argument.startsWith("--phase="));
const phase = phaseArgument?.slice("--phase=".length) ?? "before";
if (!new Set(["before", "after"]).has(phase))
  throw new Error("--phase must be before or after");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const fields = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(fields.map((field, index) => [field,
      field === "session" ? values[index] : Number(values[index])]));
  });
}

function histogram(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

const modes = ["normal", "rapid", "spread"];
const sessions = modes.map((mode) => {
  const id = `player-pairshot-speed-${mode}-xex-hard`;
  const preservedBeforePath = path.join(traceDirectory,
    `${id}-player-pairshots-before.csv`);
  const tracePath = phase === "before" && fs.existsSync(preservedBeforePath) ?
    preservedBeforePath : path.join(traceDirectory, `${id}-player-pairshots.csv`);
  const framePath = path.join(traceDirectory, `${id}.csv`);
  const rows = parseCsv(fs.readFileSync(tracePath, "utf8"));
  const frames = parseCsv(fs.readFileSync(framePath, "utf8"));
  const legal = rows.filter((row) => row.active_before !== 0 && row.active_after !== 0 &&
    row.allocation_count === 0 && row.release_count === 0);
  const phaseVisible = legal.filter((row) => row.screen_code >= 11 && row.screen_code < 52);
  const allocations = rows.filter((row) => row.allocation_count !== 0);
  const allocationPairs = allocations.slice(1).map((row, index) =>
    ({ row, prior: allocations[index] }));
  const allocationIntervals = allocationPairs.map(({ row, prior }) =>
    row.frame - prior.frame);
  const allocationFrames = allocations.map((row) => row.frame);
  const intervalFor = (start, end) => histogram(allocationPairs
    .filter(({ row, prior }) => row.frame >= start && row.frame < end &&
      prior.frame >= start)
    .map(({ row, prior }) => row.frame - prior.frame));
  const visibleDeltas = [];
  const priorBySlot = new Map();
  for (const row of rows) {
    const prior = priorBySlot.get(row.slot);
    if (prior && prior.active_after !== 0 && row.active_before !== 0 &&
      row.active_after !== 0 && row.allocation_count === 0 && row.release_count === 0 &&
      prior.visible_y !== 0xffff_ffff && row.visible_y !== 0xffff_ffff)
      visibleDeltas.push((prior.visible_y - row.visible_y) & 0xff);
    priorBySlot.set(row.slot, row);
  }
  return {
    id,
    mode,
    frames: frames.length,
    maximum_active_work_cycles: Math.max(...frames.map((row) => row.wall_cycles)),
    missed_frames: frames.reduce((sum, row) => sum + row.missed_frames, 0),
    target_overruns: frames.filter((row) => row.wall_cycles > 31_200).length,
    hard_overruns: frames.filter((row) => row.wall_cycles > 32_568).length,
    pairshot_orphan_cells: frames.reduce((sum, row) =>
      sum + row.player_projectile_orphan_cells, 0),
    pairshot_stale_cells: frames.reduce((sum, row) =>
      sum + row.player_projectile_stale_cells, 0),
    allocations: allocations.reduce((sum, row) => sum + row.allocation_count, 0),
    releases: rows.reduce((sum, row) => sum + row.release_count, 0),
    allocations_by_slot: Object.fromEntries(Array.from({ length: 5 }, (unused, slot) =>
      [slot, allocations.filter((row) => row.slot === slot)
        .reduce((sum, row) => sum + row.allocation_count, 0)])),
    allocation_interval_histogram: histogram(allocationIntervals),
    allocation_interval_histogram_short_taps: intervalFor(0, 104),
    allocation_interval_histogram_sustained: intervalFor(104, 1704),
    allocation_interval_histogram_resumed: intervalFor(1854, 4200),
    allocations_during_pause: allocationFrames.filter((frame) => frame >= 1704 && frame < 1854).length,
    active_frame_samples: legal.length,
    delta_6_samples: legal.filter((row) => row.delta_y === 6).length,
    illegal_delta_0_samples: legal.filter((row) => row.delta_y === 0).length,
    illegal_delta_other_samples: legal.filter((row) => row.delta_y !== 6).length,
    skipped_update_samples: legal.filter((row) => row.update_count === 0).length,
    double_update_samples: legal.filter((row) => row.update_count > 1).length,
    lifetime_delta_1_samples: legal.filter((row) =>
      row.lifetime_before - row.lifetime_after === 1).length,
    render_count_not_1: legal.filter((row) => row.render_count !== 1).length,
    character_write_count_not_1: legal.filter((row) =>
      row.character_write_count !== 1).length,
    phase_visible_samples: phaseVisible.length,
    publication_occluded_samples: legal.length - phaseVisible.length,
    vertical_phase_mismatch_samples: phaseVisible.filter((row) =>
      row.phase_match === 0).length,
    visible_delta_histogram: histogram(visibleDeltas),
    rows,
  };
});

const allRows = sessions.flatMap((session) => session.rows);
const legal = allRows.filter((row) => row.active_before !== 0 && row.active_after !== 0 &&
  row.allocation_count === 0 && row.release_count === 0);
const phaseVisible = legal.filter((row) => row.screen_code >= 11 && row.screen_code < 52);
const allocations = allRows.filter((row) => row.allocation_count !== 0);
const representative = sessions[0].rows.filter((row) => row.slot === 0 &&
  row.frame >= 9 && row.frame <= 16).map((row) => ({
  frame: row.frame,
  slot: row.slot,
  y_before: row.y_before,
  y_after: row.y_after,
  delta: row.delta_y,
  update_count: row.update_count,
  render_count: row.render_count,
  character_write_count: row.character_write_count,
  render_phase: row.render_phase,
  expected_phase: row.expected_phase,
  phase_match: row.phase_match,
  visible_y: row.visible_y,
}));
const report = {
  schema_version: 1,
  phase,
  classification: phaseVisible.some((row) => row.phase_match === 0) ?
    ["VISUAL_PUBLICATION_FREQUENCY"] : [],
  frames: sessions.reduce((sum, session) => sum + session.frames, 0),
  allocations: allocations.reduce((sum, row) => sum + row.allocation_count, 0),
  releases: allRows.reduce((sum, row) => sum + row.release_count, 0),
  slot_reuse_cycles: allRows.reduce((sum, row) => sum + row.release_count, 0),
  active_frame_samples: legal.length,
  delta_6_samples: legal.filter((row) => row.delta_y === 6).length,
  illegal_delta_0_samples: legal.filter((row) => row.delta_y === 0).length,
  illegal_delta_other_samples: legal.filter((row) => row.delta_y !== 6).length,
  skipped_update_samples: legal.filter((row) => row.update_count === 0).length,
  double_update_samples: legal.filter((row) => row.update_count > 1).length,
  render_count_not_1: legal.filter((row) => row.render_count !== 1).length,
  character_write_count_not_1: legal.filter((row) =>
    row.character_write_count !== 1).length,
  phase_visible_samples: phaseVisible.length,
  publication_occluded_samples: legal.length - phaseVisible.length,
  vertical_phase_mismatch_samples: phaseVisible.filter((row) =>
    row.phase_match === 0).length,
  pairshot_orphan_cells: sessions.reduce((sum, session) =>
    sum + session.pairshot_orphan_cells, 0),
  pairshot_stale_cells: sessions.reduce((sum, session) =>
    sum + session.pairshot_stale_cells, 0),
  representative_timeline: representative,
  sessions: sessions.map(({ rows, ...session }) => session),
};
const reportPath = path.join(traceDirectory, `player-pairshot-speed-${phase}-report.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  phase: report.phase,
  classification: report.classification,
  frames: report.frames,
  allocations: report.allocations,
  active_frame_samples: report.active_frame_samples,
  delta_6_samples: report.delta_6_samples,
  illegal_logical_samples: report.illegal_delta_other_samples,
  vertical_phase_mismatches: report.vertical_phase_mismatch_samples,
  report: path.relative(root, reportPath),
}, null, 2));
