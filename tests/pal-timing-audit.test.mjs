import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditSession, LINE_CYCLES, PAL_FRAME_CYCLES, FENCE_DEADLINE_SCANLINE,
  FENCE_ENTRY_FIELD } from "../scripts/pal-timing-audit.mjs";

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
