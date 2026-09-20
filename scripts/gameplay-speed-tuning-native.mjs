import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "build", "runtime-wall-trace");
const frames = 3000;
const names = ["easy", "medium", "hard"];

function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const fields = lines[0].split(",");
  return lines.slice(1).map((line) => Object.fromEntries(fields.map((field, index) => {
    const value = line.split(",")[index];
    return [field, /^-?\d+$/.test(value) ? Number(value) : value];
  })));
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function dliOverlap(row, start, end) {
  let total = 0;
  for (let index = 0; index < 2; index += 1) {
    total += Math.max(0, Math.min(end, row[`profile_dli${index}_end`]) -
      Math.max(start, row[`profile_dli${index}_start`]));
  }
  return total;
}

function activeWork(row) {
  if (!row.profile_publication_begin) return row.wall_cycles;
  const waitStart = row.profile_clock19;
  const waitEnd = row.profile_publication_begin;
  return row.wall_cycles - (waitEnd - waitStart) + dliOverlap(row, waitStart, waitEnd) + 32;
}

fs.mkdirSync(outputDirectory, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const expectedCapitalRates = [16, 18, 20];
const expectedCapitalEvents = [160, 180, 200];
const sessions = [];

for (let difficulty = 0; difficulty < 3; difficulty += 1) {
  const observer = path.join(outputDirectory, `gameplay-speed-${names[difficulty]}.csv`);
  const near = path.join(outputDirectory, `gameplay-speed-${names[difficulty]}-near.csv`);
  const enemy = path.join(outputDirectory, `gameplay-speed-${names[difficulty]}-enemy.csv`);
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "runtime-wall-trace.mjs"),
    "--skip-boot-smoke", `--smoke-frames=${frames}`, `--smoke-difficulty=${difficulty}`], {
    cwd: root,
    env: { ...process.env, DFTRACE_NEAR_OUTPUT: near,
      DFTRACE_INTERCEPTOR_PROJECTILE_OUTPUT: enemy },
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
  fs.renameSync(path.join(outputDirectory, "observer-smoke.csv"), observer);
  const rows = parseCsv(observer);
  const nearRows = parseCsv(near);
  const enemyRows = parseCsv(enemy);
  assert.equal(rows.length, frames);
  assert.ok(rows.every((row) => row.difficulty === difficulty));
  assert.ok(rows.every((row) => row.next_start_host_frame - row.start_host_frame === 1));
  assert.ok(rows.every((row) => row.missed_frames === 0 && row.extra_vbi_boundaries === 0 &&
    row.dli_sequence_violations === 0));
  assert.ok(rows.every((row) => row.update_sound_calls === 1));

  const capitalStart = rows.findIndex((row) => row.sector_state !== 7);
  const fighterReturn = rows.findIndex((row, index) => index > capitalStart && row.sector_state === 7);
  assert.ok(capitalStart >= 0 && fighterReturn > capitalStart,
    `${names[difficulty]} did not complete a capital traversal`);
  const capitalActive = rows.slice(capitalStart, fighterReturn)
    .filter((row) => row.sector_state >= 0 && row.sector_state <= 4);
  assert.ok(capitalActive.length >= 400);
  const rateWindow = capitalActive.slice(0, 400);
  const capitalEvents = rateWindow.filter((row) => (row.events & 1) !== 0).length;
  assert.equal(capitalEvents, expectedCapitalEvents[difficulty]);

  const enemyDeltas = enemyRows.filter((row) => row.event === "active" &&
    row.prior_active !== 0 && row.active !== 0 && row.prior_lifetime === row.lifetime + 1)
    .map((row) => (row.y - row.prior_y + 256) & 0xff);
  assert.ok(enemyDeltas.length > 0);
  assert.deepEqual([...new Set(enemyDeltas)], [2]);

  // Atari RAM is intentionally not assumed to be zero before gameplay init.
  // Restrict provenance assertions to initialized gameplay sectors so random
  // power-on bytes cannot masquerade as white-star orphans.
  const validNearRows = nearRows.filter((row) => row.trace_frame >= 2 && row.gameplay_frame > 0 &&
    row.sector_state >= 0 && row.sector_state <= 7);
  const capitalNear = validNearRows.filter((row) => row.sector_state <= 6);
  const attempts = capitalNear.filter((row) => row.event === "render_attempt").length;
  const writes = capitalNear.filter((row) => row.event === "render_write_after").length;
  const anticVisible = capitalNear.filter((row) => row.event === "antic_glyph_scanline" &&
    row.address_value === 1).length;
  assert.ok(attempts > 0 && writes > 0 && anticVisible > 0,
    `${names[difficulty]} did not publish ANTIC-visible stars during capital`);
  assert.ok(validNearRows.every((row) => row.orphan_near_cells === 0),
    `${names[difficulty]} observed an orphan white-star cell`);
  const firstReturnHost = rows[fighterReturn].start_host_frame;
  const firstReturnPublish = nearRows.find((row) => row.host_frame >= firstReturnHost &&
    row.sector_state === 7 && row.event === "render_write_after");
  assert.ok(firstReturnPublish && firstReturnPublish.host_frame - firstReturnHost <= 1,
    `${names[difficulty]} delayed white-star publication after capital`);

  const capitalRows = rows.slice(capitalStart, fighterReturn);
  const peak = rows.reduce((selected, row) => activeWork(row) > activeWork(selected) ? row : selected);
  const capitalPeak = capitalRows.reduce((selected, row) =>
    activeWork(row) > activeWork(selected) ? row : selected);
  sessions.push({
    difficulty: names[difficulty],
    frames: rows.length,
    capital: {
      first_frame: rows[capitalStart].frame,
      return_frame: rows[fighterReturn].frame,
      traversal_frames: fighterReturn - capitalStart,
      rate_numerator: expectedCapitalRates[difficulty],
      rate_denominator: 40,
      measured_events_per_400_frames: capitalEvents,
      events_per_second: capitalEvents / 8,
      pixels_per_second: capitalEvents,
      average_pixels_per_pal_frame: capitalEvents / 50,
    },
    enemy_pairshot: {
      traced_rows: enemyRows.length,
      consecutive_active_ticks: enemyDeltas.length,
      displacement_set: [...new Set(enemyDeltas)],
      pixels_per_second: 100,
    },
    white_stars: {
      capital_render_attempts: attempts,
      capital_successful_writes: writes,
      capital_occupancy_skips: attempts - writes,
      capital_antic_visible_fetches: anticVisible,
      orphan_cells: 0,
      first_return_publish_host_delta: firstReturnPublish.host_frame - firstReturnHost,
    },
    timing: {
      maximum_active_work_cycles: activeWork(peak),
      maximum_capital_active_work_cycles: activeWork(capitalPeak),
      maximum_raw_cadence_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
      target_overruns: rows.filter((row) => activeWork(row) > 31_200).length,
      hard_overruns: rows.filter((row) => activeWork(row) > 32_568).length,
      missed_frames: 0,
      extra_vbi: 0,
      dli_anomalies: 0,
    },
  });
}

const report = {
  schema: "void-strike-65.gameplay-speed-tuning-native.v1",
  emulator: process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2",
  artifact: { path: "dist/void-strike-65.xex",
    sha256: sha256(path.join(root, "dist", "void-strike-65.xex")) },
  contract: {
    player_projectile_speed_unchanged: manifest.fighterWeapons.player_fighter.speedScanlines,
    enemy_projectile_speed: manifest.fighterWeapons.interceptor.speedScanlines,
    white_star_speed_unchanged: manifest.starfield.nearLayer.speedPixelsPerFrame,
  },
  sessions,
  totals: {
    physical_frames: sessions.reduce((sum, session) => sum + session.frames, 0),
    target_overruns: sessions.reduce((sum, session) => sum + session.timing.target_overruns, 0),
    hard_overruns: sessions.reduce((sum, session) => sum + session.timing.hard_overruns, 0),
    missed_frames: 0,
    extra_vbi: 0,
    dli_anomalies: 0,
  },
  passed: true,
};
const reportPath = path.join(outputDirectory, "gameplay-speed-tuning-native-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Gameplay speed tuning native report: ${path.relative(root, reportPath)}`);
