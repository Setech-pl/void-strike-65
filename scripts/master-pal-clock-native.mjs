import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const traceDirectory = path.join(root, "build", "runtime-wall-trace");
const enemyTracePath = path.join(traceDirectory, "master-pal-clock-enemy.csv");
const runs = Number(process.argv.find((argument) => argument.startsWith("--runs="))?.split("=")[1] ?? 50);
const analyzeOnly = process.argv.includes("--analyze-only");
assert.ok(Number.isInteger(runs) && runs > 0, "--runs must be a positive integer");

function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const fields = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(fields.map((field, index) => {
      const value = values[index];
      return [field, /^-?\d+$/.test(value) ? Number(value) : value];
    }));
  });
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function dliOverlap(row, start, end) {
  let total = 0;
  for (let index = 0; index < 2; index += 1) {
    const dliStart = row[`profile_dli${index}_start`];
    const dliEnd = row[`profile_dli${index}_end`];
    total += Math.max(0, Math.min(end, dliEnd) - Math.max(start, dliStart));
  }
  return total;
}

function activeWork(row) {
  if (!row.profile_publication_begin) return row.wall_cycles;
  const waitStart = row.profile_clock19;
  const waitEnd = row.profile_publication_begin;
  return row.wall_cycles - (waitEnd - waitStart) + dliOverlap(row, waitStart, waitEnd) + 32;
}

fs.mkdirSync(traceDirectory, { recursive: true });
const summaries = [];
let allRows = [];
for (let run = 0; run < runs; run += 1) {
  const id = String(run).padStart(2, "0");
  const destination = path.join(traceDirectory, `master-pal-clock-${id}.csv`);
  if (!analyzeOnly) {
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "runtime-wall-trace.mjs"),
      "--skip-boot-smoke", "--smoke-frames=1750"], {
      cwd: root,
      env: run === 0 ? { ...process.env,
        DFTRACE_INTERCEPTOR_PROJECTILE_OUTPUT: enemyTracePath } : process.env,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      process.exit(result.status ?? 1);
    }
    const source = path.join(traceDirectory, "observer-smoke.csv");
    fs.renameSync(source, destination);
  }
  const rows = parseCsv(destination);
  const transitions = rows.slice(1).flatMap((row, index) =>
    row.sector_state === rows[index].sector_state ? [] : [{
      from: rows[index].sector_state,
      to: row.sector_state,
      host_delta: row.start_host_frame - rows[index].start_host_frame,
      active_delta: row.active_gameplay_frame - rows[index].active_gameplay_frame,
    }]);
  const openToCapital = transitions.filter(({ from, to }) => from === 7 && to === 0);
  const capitalToOpen = transitions.filter(({ from, to }) => from === 6 && to === 7);
  assert.equal(openToCapital.length, 1, `run ${id}: OPEN->capital count`);
  assert.equal(capitalToOpen.length, 1, `run ${id}: capital->OPEN count`);
  const hostDeltas = rows.map((row) => row.next_start_host_frame - row.start_host_frame);
  const activeDeltas = rows.slice(1).map((row, index) =>
    row.active_gameplay_frame - rows[index].active_gameplay_frame);
  assert.ok(hostDeltas.every((delta) => delta === 1), `run ${id}: skipped/double host cadence`);
  assert.ok(activeDeltas.every((delta) => delta === 1), `run ${id}: active clock discontinuity`);
  assert.ok(rows.every((row) => row.update_sound_calls === 1), `run ${id}: audio call count`);
  assert.ok(rows.every((row) => Array.from({ length: 22 }, (unused, index) =>
    row[`profile_clock${index}`]).every((clock) => clock > 0)), `run ${id}: missing logical path`);
  assert.ok(rows.every((row) => row.missed_frames === 0 && row.extra_vbi_boundaries === 0 &&
    row.dli_sequence_violations === 0), `run ${id}: PAL/DLI anomaly`);
  summaries.push({ run, frames: rows.length, transitions,
    maximum_wall_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
    minimum_raw_cadence_cycles: Math.min(...rows.map((row) =>
      row.next_start_clock - row.start_clock)),
    maximum_raw_cadence_cycles: Math.max(...rows.map((row) =>
      row.next_start_clock - row.start_clock)),
    maximum_active_work_cycles: Math.max(...rows.map(activeWork)),
    player_shot_active_frames: rows.filter((row) => row.player_fighter_projectiles > 0).length,
    enemy_shot_active_frames: rows.filter((row) => row.enemy_projectiles > 0).length });
  allRows = allRows.concat(rows);
  process.stdout.write(`${analyzeOnly ? "analyze" : "master PAL run"} ${run + 1}/${runs}\r`);
}
process.stdout.write("\n");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const enemyStep = manifest.fighterWeapons.interceptor.speedScanlines;
assert.equal(enemyStep, 2, "owner-candidate enemy PairShot displacement per logical tick");
assert.ok(fs.existsSync(enemyTracePath), "native enemy PairShot detail trace is missing");
const enemyRows = parseCsv(enemyTracePath);
const enemyActiveDeltas = enemyRows.filter((row) => row.prior_active !== 0 && row.active !== 0)
  .map((row) => (row.y - row.prior_y + 256) & 0xff);
assert.ok(enemyActiveDeltas.length > 0, "native enemy PairShot detail trace has no active ticks");
assert.ok(enemyActiveDeltas.every((delta) => delta === enemyStep),
  "enemy PairShot displacement changed or skipped/doubled a physical tick");
const fireIntervalsByMode = { normal: [], rapid: [], spread: [] };
for (const summary of summaries) {
  const rows = allRows.slice(summary.run * 1750, (summary.run + 1) * 1750);
  const accepted = rows.filter((row) => row.fire_accept_calls === 1);
  for (let index = 1; index < accepted.length; index += 1) {
    const row = accepted[index];
    const previous = accepted[index - 1];
    if (row.pickup_booster_state !== previous.pickup_booster_state) continue;
    const mode = row.pickup_booster_state === 3 ? "rapid" :
      row.pickup_booster_state === 4 ? "spread" : "normal";
    fireIntervalsByMode[mode].push(row.start_host_frame - previous.start_host_frame);
  }
}
const fireHistograms = Object.fromEntries(Object.entries(fireIntervalsByMode).map(([mode, values]) =>
  [mode, Object.fromEntries([...new Set(values)].sort((left, right) => left - right)
    .map((value) => [value, values.filter((candidate) => candidate === value).length]))]));
for (const [mode, expected] of Object.entries({ normal: [9, 12], rapid: [6, 12],
  spread: [12, 28] })) {
  assert.ok(Object.keys(fireHistograms[mode]).every((value) => expected.includes(Number(value))),
    `${mode} fire cadence left its physical PAL-frame contract`);
}

const openToCapital = summaries.flatMap(({ transitions }) => transitions)
  .filter(({ from, to }) => from === 7 && to === 0);
const capitalToOpen = summaries.flatMap(({ transitions }) => transitions)
  .filter(({ from, to }) => from === 6 && to === 7);
const report = {
  schema: "void-strike-65.master-pal-clock-native.v1",
  emulator: process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2",
  artifact: { path: "dist/void-strike-65.xex", sha256: sha256(path.join(root, "dist", "void-strike-65.xex")) },
  runs,
  physical_frames: allRows.length,
  simulation_ticks: allRows.length,
  transitions: {
    fighter_to_capital: openToCapital.length,
    capital_to_fighter: capitalToOpen.length,
    skipped_ticks: 0,
    double_ticks: 0,
    host_frame_delta_set: [...new Set([...openToCapital, ...capitalToOpen]
      .map(({ host_delta }) => host_delta))].sort(),
    active_frame_delta_set: [...new Set([...openToCapital, ...capitalToOpen]
      .map(({ active_delta }) => active_delta))].sort(),
  },
  systems: {
    common_profile_paths_present_every_tick: true,
    audio_calls_per_tick: { min: 1, max: 1 },
    player_projectile_active_frames: allRows.filter((row) => row.player_fighter_projectiles > 0).length,
    enemy_projectile_active_frames: allRows.filter((row) => row.enemy_projectiles > 0).length,
    enemy_projectile_detail: {
      traced_rows: enemyRows.length,
      consecutive_active_ticks: enemyActiveDeltas.length,
      displacement_set: [...new Set(enemyActiveDeltas)].sort(),
      spawns: enemyRows.filter((row) => row.event === "spawn").length,
      releases: enemyRows.filter((row) => row.event === "release").length,
    },
    fire_interval_histograms_physical_frames_by_weapon_state: fireHistograms,
    enemy_projectile_displacement_per_tick: enemyStep,
    enemy_projectile_effective_pixels_per_second_pal: enemyStep * 50,
  },
  timing: {
    maximum_active_work_cycles: Math.max(...summaries.map((row) => row.maximum_active_work_cycles)),
    maximum_frame_body_wall_cycles: Math.max(...summaries.map((row) => row.maximum_wall_cycles)),
    minimum_raw_cadence_cycles: Math.min(...summaries.map((row) => row.minimum_raw_cadence_cycles)),
    maximum_raw_cadence_cycles: Math.max(...summaries.map((row) => row.maximum_raw_cadence_cycles)),
    target_overruns: allRows.filter((row) => activeWork(row) > 31_200).length,
    hard_overruns: allRows.filter((row) => activeWork(row) > 32_568).length,
    missed_frames: 0,
    extra_vbi_boundaries: 0,
    dli_sequence_violations: 0,
  },
  passed: true,
};
const reportPath = path.join(traceDirectory, "master-pal-clock-native-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Master PAL clock native report: ${path.relative(root, reportPath)}`);
