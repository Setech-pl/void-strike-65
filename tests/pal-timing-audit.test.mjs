import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as palTimingAudit from "../scripts/pal-timing-audit.mjs";

const { auditSession, LINE_CYCLES, PAL_FRAME_CYCLES, FENCE_DEADLINE_SCANLINE,
  FENCE_ENTRY_FIELD, HARD_GATE_CYCLES } = palTimingAudit;
// Read off the namespace so the RED run on main reports the failing
// assertions instead of a missing-export link error.
const GO_FENCE_MARGIN_CYCLES = palTimingAudit.GO_FENCE_MARGIN_CYCLES ?? 500;

// The PAL timing gate: a main-loop iteration that misses the VCOUNT $77 fence
// (PAL scanlines 238-239) parks in wait_frame_at_line for one whole physical
// frame. Atari800_nframes still sees exactly one boundary, so missed_frames and
// extra_vbi_boundaries report 0. This audit detects the overrun from the
// pre-wait work against the line-238 deadline and attributes the shifted-phase
// rows the overrun leaves behind to the one event that caused them.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const wallTraceSource = fs.readFileSync(path.join(root, "scripts/runtime-wall-trace.mjs"), "utf8");

const NORMAL_START_SCANLINE = 18;
const SHIFTED_START_SCANLINE = 262;

// Build one synthetic fighter-OPEN row at a chosen start scanline with a chosen
// amount of pre-wait work, in the schema the native trace emits.
function fighterRow(frame, clockBase, startScanline, preWaitCycles) {
  const startClock = clockBase + startScanline * LINE_CYCLES;
  const fenceEntry = startClock + preWaitCycles;
  const deadline = clockBase + FENCE_DEADLINE_SCANLINE * LINE_CYCLES;
  const publication = fenceEntry < deadline ? deadline : deadline + PAL_FRAME_CYCLES;
  return {
    session: "synthetic",
    frame,
    start_clock: startClock,
    start_scanline: startScanline,
    start_cycle: 0,
    start_host_frame: Math.floor(clockBase / PAL_FRAME_CYCLES),
    gameplay_generation: 1,
    [FENCE_ENTRY_FIELD]: fenceEntry,
    profile_publication_begin: publication,
    wall_cycles: publication - startClock + 2_000,
    missed_frames: 0,
    extra_vbi_boundaries: 0,
    dli_sequence_violations: 0,
  };
}

function cleanSession(frames) {
  return Array.from({ length: frames }, (unused, index) =>
    fighterRow(index, index * PAL_FRAME_CYCLES, NORMAL_START_SCANLINE, 20_000));
}

test("a clean replay reports no miss event and a positive fence margin", () => {
  const audit = auditSession("clean", cleanSession(50));
  assert.equal(audit.distinct_miss_events, 0);
  assert.equal(audit.passed, true);
  assert.equal(audit.shifted_phase_rows, 0);
  assert.equal(audit.worst_pre_wait_cycles, 20_000);
  assert.equal(audit.worst_fence_margin_cycles,
    (FENCE_DEADLINE_SCANLINE - NORMAL_START_SCANLINE) * LINE_CYCLES - 20_000);
  assert.equal(audit.fence_model_disagreements, 0);
});

test("one overrun is one miss event and its shifted rows are attributed to it", () => {
  const rows = cleanSession(10);
  const overrunWork = (FENCE_DEADLINE_SCANLINE - NORMAL_START_SCANLINE) * LINE_CYCLES + 600;
  rows[4] = fighterRow(4, 4 * PAL_FRAME_CYCLES, NORMAL_START_SCANLINE, overrunWork);
  // The loop keeps starting one phase later until a resync; those rows overrun
  // their own (already passed) fence too, but they are not new miss events.
  for (let index = 5; index < 9; index += 1) {
    rows[index] = fighterRow(index, index * PAL_FRAME_CYCLES, SHIFTED_START_SCANLINE, 20_000);
  }
  const audit = auditSession("one-miss", rows);
  assert.equal(audit.distinct_miss_events, 1);
  assert.equal(audit.passed, false);
  const [event] = audit.miss_events;
  assert.equal(event.frame, 4);
  assert.equal(event.row_index, 4);
  assert.equal(event.fence_margin_cycles, -600);
  assert.equal(audit.fence_model_disagreements, 0);
  assert.equal(event.pre_wait_cycles, overrunWork);
  assert.equal(event.shifted_phase_rows_until_resync, 4);
  assert.equal(audit.shifted_phase_rows, 4);
  // The raw over-gate row count conflates the one real miss with its aftermath.
  assert.ok(audit.rows_over_hard_gate > audit.distinct_miss_events);
});

test("arriving inside VCOUNT $77 still catches the fence", () => {
  // The wait accepts PAL scanlines 238-239; only scanline 240 is too late.
  const lastGoodWork = (FENCE_DEADLINE_SCANLINE - NORMAL_START_SCANLINE) * LINE_CYCLES - 1;
  const audit = auditSession("edge",
    [fighterRow(0, 0, NORMAL_START_SCANLINE, lastGoodWork)]);
  assert.equal(audit.distinct_miss_events, 0);
  assert.equal(audit.worst_fence_margin_cycles, 1);
});

test("the native counters stay in the report and stay zero across an overrun", () => {
  const rows = cleanSession(6);
  rows[3] = fighterRow(3, 3 * PAL_FRAME_CYCLES, NORMAL_START_SCANLINE,
    (FENCE_DEADLINE_SCANLINE - NORMAL_START_SCANLINE) * LINE_CYCLES + 1);
  const audit = auditSession("counters", rows);
  assert.equal(audit.distinct_miss_events, 1);
  assert.deepEqual(audit.unreliable_counters,
    { missed_frames: 0, extra_vbi_boundaries: 0, dli_sequence_violations: 0 });
});

test("a schema change is reported instead of being silently mis-audited", () => {
  const [row] = cleanSession(1);
  delete row[FENCE_ENTRY_FIELD];
  assert.throws(() => auditSession("stale", [row]), /schema changed/);
});

test("the fence entry checkpoint is the label before the publication wait", () => {
  // profile_clock19 is profile_after_sector; the publication call that owns the
  // VCOUNT $77 wait must still immediately follow it.
  assert.match(mainSource,
    /profile_after_sector = \*\s*\n\s*jsr publish_fighter_projectile_overlays/);
  const labels = wallTraceSource
    .slice(wallTraceSource.indexOf("const traceProfileLabels"),
      wallTraceSource.indexOf("for (let index = 0; index < traceProfileLabels.length"))
    .match(/"profile_[a-z_]+"/g)
    .map((value) => value.slice(1, -1));
  assert.equal(labels[Number(FENCE_ENTRY_FIELD.replace("profile_clock", ""))],
    "profile_after_sector");
});

test("every traced replay is audited and a miss fails the gate", () => {
  assert.match(wallTraceSource,
    /const palTimingAudit = auditPalTiming\(session\.id, rows\);[\s\S]{0,200}?reportPalTimingAudit\(palTimingAudit\);[\s\S]{0,160}?process\.exitCode = 1;/);
  assert.match(wallTraceSource,
    /const missEvents = reportPalTimingAudits\(palTimingAudits, \{ perAudit: false \}\);[\s\S]{0,500}?if \(missEvents !== 0\) process\.exitCode = 1;/);
});

// AUD-06 (docs/audits/2026-10-06-pre-m5.md; chore/evidence-integrity): a PASS
// is the documented gates, not only "the fence was caught". GO is a worst
// fence margin of at least 500 cycles and a DMA-on maximum of at most 32,568
// (docs/STATUS.md, "GO >= 500", the hard gate); fence detection stays its own
// field, so the one-cycle fixture above is still a caught fence.
const scriptPath = path.join(root, "scripts/pal-timing-audit.mjs");
const lastFenceCycle = (FENCE_DEADLINE_SCANLINE - NORMAL_START_SCANLINE) * LINE_CYCLES;

test("AUD-06: a caught fence below the 500-cycle GO margin fails the audit", () => {
  const audit = auditSession("margin-499",
    [fighterRow(0, 0, NORMAL_START_SCANLINE, lastFenceCycle - 499)]);
  assert.equal(audit.worst_fence_margin_cycles, 499);
  assert.equal(audit.distinct_miss_events, 0);
  assert.equal(audit.fence_caught, true);
  assert.equal(audit.passed, false);
  assert.match(audit.gate_failures.join("; "), /fence margin 499 < 500/);
});

test("AUD-06: a fence margin of exactly 500 passes", () => {
  const audit = auditSession("margin-500",
    [fighterRow(0, 0, NORMAL_START_SCANLINE, lastFenceCycle - 500)]);
  assert.equal(audit.worst_fence_margin_cycles, 500);
  assert.equal(audit.passed, true);
  assert.deepEqual(audit.gate_failures, []);
});

test("AUD-06: the one-cycle margin is a caught fence, not a PASS", () => {
  const audit = auditSession("edge",
    [fighterRow(0, 0, NORMAL_START_SCANLINE, lastFenceCycle - 1)]);
  assert.equal(audit.fence_caught, true);
  assert.equal(audit.passed, false);
});

test("AUD-06: a DMA-on frame over the 32,568 hard gate fails the audit", () => {
  const rows = cleanSession(3);
  rows[1].wall_cycles = HARD_GATE_CYCLES + 1;
  const audit = auditSession("over-hard-gate", rows);
  assert.equal(audit.distinct_miss_events, 0);
  assert.ok(audit.worst_fence_margin_cycles >= GO_FENCE_MARGIN_CYCLES);
  assert.equal(audit.passed, false);
  assert.match(audit.gate_failures.join("; "), /DMA-on maximum 32569 > 32568/);
  rows[1].wall_cycles = HARD_GATE_CYCLES;
  assert.equal(auditSession("at-hard-gate", rows).passed, true);
});

test("AUD-06: a replay with no rows fails the audit", () => {
  const audit = auditSession("empty", []);
  assert.equal(audit.passed, false);
  assert.match(audit.gate_failures.join("; "), /no rows/);
});

function runCli(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], { encoding: "utf8" });
}

function csvOf(rows) {
  const headers = Object.keys(rows[0]);
  return `${headers.join(",")}\n${rows.map((row) =>
    headers.map((name) => row[name]).join(",")).join("\n")}\n`;
}

test("AUD-06: the CLI fails on a directory with no replay CSV", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pal-audit-empty-"));
  try {
    fs.writeFileSync(path.join(directory, "notes.txt"), "not a trace\n");
    const result = runCli([directory]);
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stdout + result.stderr, /0 replays/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("AUD-06: the CLI fails when a named input is malformed or missing", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pal-audit-bad-"));
  try {
    const good = path.join(directory, "good.csv");
    fs.writeFileSync(good, csvOf(cleanSession(5)));
    assert.equal(runCli([good]).status, 0);
    const [row] = cleanSession(1);
    delete row[FENCE_ENTRY_FIELD];
    const bad = path.join(directory, "bad.csv");
    fs.writeFileSync(bad, csvOf([row]));
    assert.notEqual(runCli([good, bad]).status, 0);
    assert.notEqual(runCli([good, path.join(directory, "missing.csv")]).status, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("AUD-06: the CLI fails on a margin below GO although no fence was missed", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pal-audit-499-"));
  try {
    const file = path.join(directory, "margin-499.csv");
    fs.writeFileSync(file, csvOf([fighterRow(0, 0, NORMAL_START_SCANLINE, lastFenceCycle - 499)]));
    const result = runCli([file]);
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stdout, /0 distinct miss events/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("AUD-06: the CLI sets the boss-entry transition row aside, as the harness does", () => {
  // scripts/runtime-wall-trace.mjs parseCsv: the boss-entry frame is a disk
  // transition with the display off, recorded but never gated.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pal-audit-entry-"));
  try {
    const rows = cleanSession(6).map((row) => ({ ...row, boss_entry: 0 }));
    rows[3] = { ...fighterRow(3, 3 * PAL_FRAME_CYCLES, NORMAL_START_SCANLINE, lastFenceCycle + 9_000),
      boss_entry: 1 };
    const file = path.join(directory, "entry.csv");
    fs.writeFileSync(file, csvOf(rows));
    assert.equal(runCli([file]).status, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("AUD-06: the harness fails the run on an audit that does not pass", () => {
  assert.match(wallTraceSource,
    /if \(!palTimingAudit\.passed\) process\.exitCode = 1;/);
});
