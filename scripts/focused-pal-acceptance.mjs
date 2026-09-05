// Completion of a focused replay is not PAL acceptance. Keep the same cadence
// definition as the native observer: more than one host frame between updates
// misses an update, including a transition to an earlier raster fence.
export function focusedPalAcceptance(rows) {
  const sum = (key) => rows.reduce((total, row) => total + Number(row[key]), 0);
  const maximum = (key) => Math.max(...rows.map((row) => Number(row[key])));
  const result = {
    measured_frames: rows.length,
    maximum_wall_cycles: maximum("wall_cycles"),
    wall_ceiling: 32_568,
    physical_headroom: 35_568 - maximum("wall_cycles"),
    missed_frames: sum("missed_frames"),
    extra_vbi_boundaries: sum("extra_vbi_boundaries"),
    physical_overruns: rows.filter((row) => row.wall_cycles > 35_568).length,
    deadline_overruns: rows.filter((row) => row.wall_cycles > 32_568 || row.missed_frames > 0).length,
    dli_ordering_errors: maximum("dli_sequence_violations"),
  };
  result.passed = rows.length > 0 && result.maximum_wall_cycles <= result.wall_ceiling &&
    result.missed_frames === 0 && result.extra_vbi_boundaries === 0 &&
    result.physical_overruns === 0 && result.deadline_overruns === 0 &&
    result.dli_ordering_errors === 0;
  return result;
}
