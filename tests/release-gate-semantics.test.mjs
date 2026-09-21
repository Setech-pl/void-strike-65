import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  evaluateReleaseGate,
  loadRecordedGateFailures,
  recordedGateFailureClasses,
  recordedGateFailuresPath,
  releaseGateFailureMessage,
} from "../scripts/runtime-evidence.mjs";

// Owner decision 2026-09-21 — release gate semantics.
//
// scripts/build.mjs refused any final build unless gate.passed === true, while
// the same owner rule requires a recorded behavioural clause failure to be
// carried in the evidence WITH gate.passed === false. The two were mutually
// exclusive, so `npm test` — which builds the default target first — could not
// run at all (docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md
// §14.15).
//
// The gate is now: no UNRECORDED gate failure, and gate.timing_and_dli_passed.
// evaluateReleaseGate is the WHOLE of that decision and build.mjs calls nothing
// else, so the cases injected here are the cases the build takes. The four the
// owner required are proven end to end through the real default build in
// §15.3 of that diagnostic; these are the cheap standing regression tests.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, "docs/runtime-wall-trace.json");
const realReport = () => JSON.parse(fs.readFileSync(reportPath, "utf8"));

test("the recorded-failure list is one data file, and every entry carries a class and a measurement", () => {
  const recorded = loadRecordedGateFailures(root);
  assert.ok(recorded.length > 0);
  for (const entry of recorded) {
    assert.ok(recordedGateFailureClasses.includes(entry.class),
      `${entry.session} carries class ${entry.class}`);
    assert.match(entry.measurement, /\.md §\d+(\.\d+)?$/,
      `${entry.session} carries no measurement reference`);
  }
  // The list is the build's and the tripwire's shared source of truth, so it
  // lives in the repository as data, not duplicated in either consumer.
  assert.equal(recordedGateFailuresPath, "docs/recorded-gate-failures.json");
  assert.ok(fs.existsSync(path.join(root, recordedGateFailuresPath)));
  const buildSource = fs.readFileSync(path.join(root, "scripts/build.mjs"), "utf8");
  assert.match(buildSource, /evaluateReleaseGate\(wallTrace, loadRecordedGateFailures\(rootDirectory\)\)/);
  assert.doesNotMatch(buildSource, /gate\?\.passed !== true/);
});

test("the loader refuses a list entry without a class or a measurement", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-strike-gate-"));
  const write = (failures) => {
    fs.mkdirSync(path.join(temporaryRoot, "docs"), { recursive: true });
    fs.writeFileSync(path.join(temporaryRoot, recordedGateFailuresPath),
      JSON.stringify({ schema_version: 1, failures }));
  };
  const entry = {
    session: "example-session",
    message: "example clause failed",
    class: "c-real-failure",
    measurement: "docs/diagnostics/example.md §1",
  };
  write([entry]);
  assert.deepEqual(loadRecordedGateFailures(temporaryRoot), [entry]);
  write([{ ...entry, measurement: "" }]);
  assert.throws(() => loadRecordedGateFailures(temporaryRoot), /no measurement reference/);
  write([{ ...entry, class: "it-is-fine-honestly" }]);
  assert.throws(() => loadRecordedGateFailures(temporaryRoot), /no known class/);
  write([entry, entry]);
  assert.throws(() => loadRecordedGateFailures(temporaryRoot), /is recorded twice/);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

test("the release gate passes on the real report, recorded failures and all", () => {
  const result = evaluateReleaseGate(realReport(), loadRecordedGateFailures(root));
  assert.equal(result.passed, true, releaseGateFailureMessage(result));
  assert.equal(result.timingAndDliPassed, true);
  // The point of the decision: it passes WHILE failures are recorded, and
  // gate.passed is false in the report exactly as the rule requires.
  assert.ok(result.recordedCount > 0);
  assert.equal(realReport().gate.passed, false);
});

test("the release gate fails on an UNRECORDED gate failure", () => {
  const report = realReport();
  report.gate.behavioural_clause_failures.push({
    session: "raider-remnant-rapid-xex-hard",
    message: "invented clause failure",
  });
  report.gate.behavioural_clause_failure_count += 1;
  const result = evaluateReleaseGate(report, loadRecordedGateFailures(root));
  assert.equal(result.passed, false);
  assert.deepEqual(result.unrecorded,
    ["raider-remnant-rapid-xex-hard: invented clause failure"]);
  assert.match(releaseGateFailureMessage(result), /UNRECORDED gate failure/);
});

test("the release gate fails when a recorded failure silently disappears", () => {
  const report = realReport();
  const [dropped] = report.gate.behavioural_clause_failures.splice(0, 1);
  report.gate.behavioural_clause_failure_count =
    report.gate.behavioural_clause_failures.length;
  const result = evaluateReleaseGate(report, loadRecordedGateFailures(root));
  assert.equal(result.passed, false);
  assert.deepEqual(result.clearedRecorded, [`${dropped.session}: ${dropped.message}`]);
  assert.match(releaseGateFailureMessage(result), /over-states what this build fails/);
});

test("the release gate fails when timing_and_dli_passed is false", () => {
  const report = realReport();
  report.gate.timing_and_dli_passed = false;
  const result = evaluateReleaseGate(report, loadRecordedGateFailures(root));
  assert.equal(result.passed, false);
  assert.equal(result.timingAndDliPassed, false);
  assert.deepEqual([result.unrecorded, result.clearedRecorded], [[], []]);
  assert.match(releaseGateFailureMessage(result), /timing or the DLI sequence regressed/);
});

test("the release gate fails when the report's own count or gate.passed disagrees with its list", () => {
  const miscounted = realReport();
  miscounted.gate.behavioural_clause_failure_count += 1;
  assert.equal(evaluateReleaseGate(miscounted, loadRecordedGateFailures(root)).passed, false);
  const misreported = realReport();
  misreported.gate.passed = true;
  const result = evaluateReleaseGate(misreported, loadRecordedGateFailures(root));
  assert.equal(result.passed, false);
  assert.equal(result.passedFieldConsistent, false);
});
