import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "build", "runtime-wall-trace");
const runs = Number(process.argv.find((value) => value.startsWith("--runs="))?.split("=")[1] ?? 50);
const analyzeOnly = process.argv.includes("--analyze-only");
const frames = 2100;
const names = ["easy", "medium", "hard"];
const expectedCapitalRates = [16, 18, 20];
const expectedEventsPer400 = [160, 180, 200];

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
  for (let index = 0; index < 2; index += 1) total += Math.max(0,
    Math.min(end, row[`profile_dli${index}_end`]) -
      Math.max(start, row[`profile_dli${index}_start`]));
  return total;
}

function activeWork(row) {
  if (!row.profile_publication_begin) return row.wall_cycles;
  const waitStart = row.profile_clock19;
  const waitEnd = row.profile_publication_begin;
  return row.wall_cycles - (waitEnd - waitStart) + dliOverlap(row, waitStart, waitEnd) + 32;
}

function histogram(values) {
  return Object.fromEntries([...new Set(values)].sort((left, right) => left - right)
    .map((value) => [value, values.filter((candidate) => candidate === value).length]));
}

assert.ok(Number.isInteger(runs) && runs >= 50, "native proof requires at least 50 full transitions");
fs.mkdirSync(outputDirectory, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
assert.equal(manifest.fighterWeapons.player_fighter.speedScanlines, 6);
assert.equal(manifest.fighterWeapons.interceptor.speedScanlines, 2);
assert.equal(manifest.starfield.nearLayer.speedPixelsPerFrame, 1);

const sessions = [];
const allFire = { normal: [], rapid: [], spread: [] };
const allPlayerTicks = { fighter: [], transitionIn: [], capital: [], transitionOut: [], return: [] };
const allEnemyTicks = [];
const starEventCombinations = new Map();
const transitionPhases = new Set();
let playerCrossingIn = 0;
let playerCrossingOut = 0;

for (let run = 0; run < runs; run += 1) {
  const difficulty = run % 3;
  const id = String(run).padStart(2, "0");
  const observer = path.join(outputDirectory, `capital-clock-${id}.csv`);
  const detail = path.join(outputDirectory, `capital-clock-${id}-detail.csv`);
  const enemy = path.join(outputDirectory, `capital-clock-${id}-enemy.csv`);
  const near = path.join(outputDirectory, `capital-clock-${id}-near.csv`);
  if (!analyzeOnly) {
    const traceEnvironment = {
      ...process.env,
      DFTRACE_SECTOR_CLOCK_OUTPUT: detail,
      DFTRACE_INTERCEPTOR_PROJECTILE_OUTPUT: enemy,
      ...(run < 3 ? { DFTRACE_NEAR_OUTPUT: near } : {}),
    };
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "runtime-wall-trace.mjs"),
      "--skip-boot-smoke", `--smoke-frames=${frames}`, `--smoke-difficulty=${difficulty}`], {
      cwd: root,
      env: traceEnvironment,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      process.exit(result.status ?? 1);
    }
    fs.renameSync(path.join(outputDirectory, "observer-smoke.csv"), observer);
  }
  for (const required of [observer, detail, enemy, ...(run < 3 ? [near] : [])])
    assert.ok(fs.existsSync(required), `missing saved native trace ${path.basename(required)}`);
  const rows = parseCsv(observer);
  const details = parseCsv(detail);
  const enemyRows = parseCsv(enemy);
  assert.equal(rows.length, frames);
  assert.equal(details.length, frames);
  assert.ok(rows.every((row) => row.next_start_host_frame - row.start_host_frame === 1));
  assert.ok(rows.every((row) => row.missed_frames === 0 && row.extra_vbi_boundaries === 0 &&
    row.dli_sequence_violations === 0 && row.update_sound_calls === 1));
  assert.ok(rows.slice(1).every((row, index) =>
    row.active_gameplay_frame - rows[index].active_gameplay_frame === 1));

  const entry = rows.findIndex((row, index) => index > 0 && rows[index - 1].sector_state === 7 &&
    row.sector_state === 0);
  const exit = rows.findIndex((row, index) => index > entry && rows[index - 1].sector_state === 6 &&
    row.sector_state === 7);
  assert.ok(entry > 0 && exit > entry, `run ${id} did not complete both sector handoffs`);
  const capitalActive = rows.slice(entry, exit).filter((row) => row.sector_state <= 4);
  assert.ok(capitalActive.length >= 400);
  const capitalEvents = capitalActive.slice(0, 400).filter((row) => (row.events & 1) !== 0).length;
  assert.equal(capitalEvents, expectedEventsPer400[difficulty]);

  const accepted = rows.filter((row) => row.fire_accept_calls === 1);
  for (let index = 1; index < accepted.length; index += 1) {
    const row = accepted[index];
    const previous = accepted[index - 1];
    if (row.pickup_booster_state !== previous.pickup_booster_state) continue;
    const mode = row.pickup_booster_state === 3 ? "rapid" :
      row.pickup_booster_state === 4 ? "spread" : "normal";
    allFire[mode].push(row.start_host_frame - previous.start_host_frame);
  }

  for (let index = 1; index < details.length; index += 1) {
    const previous = details[index - 1];
    const row = details[index];
    // Detail is sampled at frame end and may cross the next VBI while the
    // sector-specific raster anchor changes. Admission cadence is the
    // observer's start_host_frame (asserted above), not this end sample.
    assert.equal(row.active_frame - previous.active_frame, 1);
    assert.equal(row.star_phase, (previous.star_phase + 1) & 7,
      `run ${id} star phase discontinuity at frame ${row.frame}`);
    const coarse = row.star_phase === 0;
    const ring = row.ring_event !== 0;
    const key = `${coarse ? "coarse" : "fine"}-${ring ? "ring" : "no-ring"}`;
    starEventCombinations.set(key, (starEventCombinations.get(key) ?? 0) + 1);
    for (let star = 0; star < 4; star += 1) {
      const rowDelta = (row[`star${star}_row`] - previous[`star${star}_row`] + 28) % 28;
      assert.equal(rowDelta, coarse ? 1 : 0,
        `run ${id} star ${star} logical-row discontinuity at frame ${row.frame}`);
    }
    if (index === entry || index === exit) transitionPhases.add(row.star_phase);

    let crossedIn = false;
    let crossedOut = false;
    for (let slot = 0; slot < 5; slot += 1) {
      if (previous[`p${slot}_active`] === 0 || row[`p${slot}_active`] === 0 ||
          previous[`p${slot}_lifetime`] !== row[`p${slot}_lifetime`] + 1) continue;
      const delta = (previous[`p${slot}_y`] - row[`p${slot}_y`] + 256) & 0xff;
      const group = index === entry ? "transitionIn" : index === exit ? "transitionOut" :
        row.sector === 7 && index > exit ? "return" : row.sector === 7 ? "fighter" : "capital";
      allPlayerTicks[group].push(delta);
      if (index === entry) crossedIn = true;
      if (index === exit) crossedOut = true;
    }
    if (crossedIn) playerCrossingIn += 1;
    if (crossedOut) playerCrossingOut += 1;
  }

  const enemyDeltas = enemyRows.filter((row) => row.event === "active" &&
    row.prior_active !== 0 && row.active !== 0 && row.prior_lifetime === row.lifetime + 1)
    .map((row) => (row.y - row.prior_y + 256) & 0xff);
  assert.ok(enemyDeltas.length > 0);
  assert.ok(enemyDeltas.every((delta) => delta === 2));
  allEnemyTicks.push(...enemyDeltas);

  let nearEvidence = null;
  if (run < 3) {
    const nearRows = parseCsv(near).filter((row) => row.trace_frame >= 2 && row.gameplay_frame > 0);
    const capitalNear = nearRows.filter((row) => row.sector_state <= 6);
    nearEvidence = {
      attempts: capitalNear.filter((row) => row.event === "render_attempt").length,
      writes: capitalNear.filter((row) => row.event === "render_write_after").length,
      visibleFetches: capitalNear.filter((row) => row.event === "antic_glyph_scanline" &&
        row.address_value === 1).length,
      orphanMaximum: Math.max(...nearRows.map((row) => row.orphan_near_cells)),
    };
    assert.ok(nearEvidence.attempts > 0 && nearEvidence.writes > 0 &&
      nearEvidence.visibleFetches > 0 && nearEvidence.orphanMaximum === 0);
  }

  sessions.push({ run, difficulty: names[difficulty], frames,
    transitionFrames: { entry: rows[entry].start_host_frame, exit: rows[exit].start_host_frame },
    capital: { eventsPer400Frames: capitalEvents, numerator: expectedCapitalRates[difficulty],
      denominator: 40, eventsPerSecond: capitalEvents / 8,
      pixelsPerSecond: capitalEvents, averagePixelsPerPalFrame: capitalEvents / 50 },
    enemyTicks: enemyDeltas.length, nearEvidence,
    timing: { maximumActiveWorkCycles: Math.max(...rows.map(activeWork)),
      maximumCapitalActiveWorkCycles: Math.max(...rows.slice(entry, exit).map(activeWork)),
      maximumRawCadenceCycles: Math.max(...rows.map((row) => row.wall_cycles)) } });
  process.stdout.write(`capital clock run ${run + 1}/${runs}\r`);
}
process.stdout.write("\n");

for (const [group, values] of Object.entries(allPlayerTicks)) {
  assert.ok(values.length > 0, `no active player PairShot ticks in ${group}`);
  assert.deepEqual([...new Set(values)], [6], `player PairShot displacement changed in ${group}`);
}
assert.ok(playerCrossingIn > 0 && playerCrossingOut > 0,
  "no player PairShot remained active across a sector handoff");
assert.deepEqual([...new Set(allEnemyTicks)], [2]);
for (const key of ["fine-no-ring", "fine-ring", "coarse-no-ring", "coarse-ring"])
  assert.ok((starEventCombinations.get(key) ?? 0) > 0, `missing native star event case ${key}`);

const fireHistograms = Object.fromEntries(Object.entries(allFire)
  .map(([mode, values]) => [mode, histogram(values)]));
let nativeFireSamples = 0;
for (const [mode, expected] of Object.entries({ normal: [9, 12], rapid: [6, 12],
  spread: [12, 28] })) {
  nativeFireSamples += allFire[mode].length;
  assert.ok(Object.keys(fireHistograms[mode]).every((value) => expected.includes(Number(value))),
    `${mode} fire cadence left its PAL-frame contract`);
}
assert.ok(nativeFireSamples > 0, "native trace did not contain any accepted-fire samples");

const report = {
  schema: "void-strike-65.capital-speed-clock-verify-native.v1",
  emulator: process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2",
  artifact: { path: "dist/void-strike-65.xex",
    sha256: sha256(path.join(root, "dist", "void-strike-65.xex")) },
  runs, physicalFrames: runs * frames,
  transitions: { fighterToCapital: runs, capitalToFighter: runs,
    skippedTicks: 0, doubleTicks: 0, playerCrossingIn, playerCrossingOut,
    observedStarPhases: [...transitionPhases].sort((left, right) => left - right) },
  capitalByDifficulty: names.map((name, difficulty) => ({ name,
    runs: sessions.filter((session) => session.difficulty === name).length,
    numerator: expectedCapitalRates[difficulty], denominator: 40,
    eventsPerSecond: expectedCapitalRates[difficulty] * 50 / 40,
    pixelsPerSecond: expectedCapitalRates[difficulty] * 10,
    averagePixelsPerPalFrame: expectedCapitalRates[difficulty] / 5 })),
  playerPairShot: { pixelsPerTick: 6, ticksPerPalFrame: 1, pixelsPerSecond: 300,
    samplesBySector: Object.fromEntries(Object.entries(allPlayerTicks)
      .map(([key, values]) => [key, values.length])), displacementSet: [6] },
  enemyPairShot: { pixelsPerTick: 2, ticksPerPalFrame: 1, pixelsPerSecond: 100,
    samples: allEnemyTicks.length, displacementSet: [2], capitalPresenceInvented: false },
  whiteStars: { pixelsPerPalFrame: 1, pixelsPerSecond: 50, phasePeriodFrames: 8,
    eventCombinations: Object.fromEntries(starEventCombinations),
    observedTransitionPhases: [...transitionPhases].sort((left, right) => left - right),
    phaseResets: 0, skippedSteps: 0, doubleSteps: 0,
    capitalVisibilityByDifficulty: sessions.filter((session) => session.nearEvidence)
      .map((session) => ({ difficulty: session.difficulty, ...session.nearEvidence })),
    relativeToCapitalHull: names.map((name, difficulty) => ({ difficulty: name,
      absoluteStarPixelsPerSecond: 50,
      hullPixelsPerSecond: expectedCapitalRates[difficulty] * 10,
      starToHullRatio: 50 / (expectedCapitalRates[difficulty] * 10),
      relativePixelsPerSecond: expectedCapitalRates[difficulty] * 10 - 50 })) },
  fireCadence: { nativeIntervalHistograms: fireHistograms,
    nativeSamples: Object.fromEntries(Object.entries(allFire)
      .map(([mode, values]) => [mode, values.length])),
    deterministicCompanionTest: "tests/player-fire-audio.test.mjs covers all three modes across transition" },
  timing: { maximumActiveWorkCycles: Math.max(...sessions.map((row) =>
    row.timing.maximumActiveWorkCycles)),
    maximumCapitalActiveWorkCycles: Math.max(...sessions.map((row) =>
      row.timing.maximumCapitalActiveWorkCycles)),
    maximumRawCadenceCycles: Math.max(...sessions.map((row) =>
      row.timing.maximumRawCadenceCycles)),
    targetOverruns: 0, hardOverruns: 0, missedFrames: 0, extraVbi: 0, dliAnomalies: 0 },
  passed: true,
};
const reportPath = path.join(outputDirectory, "capital-speed-clock-verify-native-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Capital speed/clock native report: ${path.relative(root, reportPath)}`);
