import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  runtimeArtifactNames,
  runtimeArtifactSet,
  validateRuntimeEvidenceBinding,
} from "../scripts/runtime-evidence.mjs";

// The default build already refuses to link against stale evidence
// (build.mjs, validateRuntimeEvidenceBinding). That gate went unseen for 175
// commits — d72dd6a..4d12d6e — because sessions built with --candidate, which
// defers the binding, and then ran focused test files directly. This test is
// the cheap standalone tripwire for exactly that working pattern: it answers
// "is the committed evidence still bound to what this tree builds?" in
// milliseconds, instead of waiting for a full default build or a ~70-minute
// trace run to say so.
//
// When it fails after a deliberate runtime change, the evidence is stale and
// owes a regeneration pass (build:candidate -> runtime:wall-trace -> build);
// it is not a licence to edit the SHAs in docs/runtime-wall-trace.json by hand.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tracePath = path.join(root, "docs/runtime-wall-trace.json");

test("the committed runtime evidence binds to the artifacts in dist/", () => {
  const report = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  const missing = runtimeArtifactNames.filter((name) =>
    !fs.existsSync(path.join(root, "dist", name)));
  assert.deepEqual(missing, [],
    `dist/ is missing ${missing.join(", ")}; build before running this test`);
  const artifacts = runtimeArtifactSet({
    boot: fs.readFileSync(path.join(root, "dist/void-strike-65-boot.bin")),
    xex: fs.readFileSync(path.join(root, "dist/void-strike-65.xex")),
    atr: fs.readFileSync(path.join(root, "dist/void-strike-65.atr")),
  });
  for (const name of runtimeArtifactNames) {
    const observed = report.artifacts?.[name];
    const expected = artifacts[name];
    assert.equal(observed?.sha256, expected.sha256,
      `docs/runtime-wall-trace.json binds ${name} to ${observed?.sha256?.slice(0, 8)}… ` +
      `(${observed?.bytes} B) but this tree builds ${expected.sha256.slice(0, 8)}… ` +
      `(${expected.bytes} B). The runtime evidence is stale: regenerate it with ` +
      `npm run build:candidate && npm run runtime:wall-trace && npm run build.`);
  }
  assert.equal(validateRuntimeEvidenceBinding(report, artifacts), true);
});

// Owner decision 2026-09-21. The gate is NOT "nothing fails": the evidence is a
// truthful description of the current build, recorded failures included, and a
// run that fails a clause still writes its report with gate.passed === false.
// The gate this test enforces is "nothing fails that is not on this list".
//
// Every entry is a behavioural clause the owner has accepted as open, and every
// entry carries the measurement that classified it. A NEW failure turns this
// test red because it is not on the list; CLEARING a recorded one also turns it
// red, because the list then over-states what the build fails — either way the
// list and the report have to be brought back into agreement deliberately.
//
// `message` is matched verbatim against gate.behavioural_clause_failures, so an
// entry cannot be a vague placeholder for whatever happens to fail.
//
// The 24 `engine-first-150` entries are one measurement, not 24: see §14.6.
const engineFirst150Sessions = ["xex", "atr"].flatMap((medium) =>
  ["a5", "5a"].flatMap((coldFill) => [0, 1, 2].flatMap((difficulty) =>
    ["immediate", "delayed"].map((startMode) =>
      `engine-${medium}-${coldFill}-${difficulty}-${startMode}`))));

const engineXexSessions = engineFirst150Sessions.filter((id) => id.startsWith("engine-xex-"));

const recordedGateFailures = [
  ...engineXexSessions.map((session) => ({
    session,
    message: `${session} screenshot sequence differs between XEX and ATR`,
    measurement: "docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md §14.7",
  })),
  ...engineFirst150Sessions.map((session) => ({
    session,
    message: `${session} first DLI did not select byte three of the active A2 list`,
    measurement: "docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md §14.6",
  })),
  {
    session: "weapon-pickup-2-hunt-fire4",
    message: "Booster release did not clear the capsule from the missile plane in the release frame",
    measurement: "docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md §14.8",
  },
  {
    session: "capital-contact-allied-medium",
    message: "capital-contact-allied-medium did not capture 16 consecutive contact rasters",
    measurement: "docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md §14.3",
  },
  {
    session: "capital-contact-hostile-medium",
    message: "capital-contact-hostile-medium did not capture 16 consecutive contact rasters",
    measurement: "docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md §14.3",
  },
  {
    session: "lower-playfield-hostile-contact-xex-hard",
    message: "lower-playfield-hostile-contact-xex-hard did not capture 16 consecutive contact rasters",
    measurement: "docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md §14.3",
  },
];

const failureKey = ({ session, message }) => `${session}: ${message}`;

test("the evidence is complete and has no UNRECORDED gate failure", () => {
  const report = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  assert.equal(report.schema_version, 2);
  assert.equal(report.evidence?.status, "complete");
  assert.equal(report.evidence?.partial, false);
  assert.equal(report.evidence?.completed_sessions, report.evidence?.required_sessions);
  assert.ok(report.evidence?.required_sessions > 0);

  // An entry without a measurement reference is not a recorded failure, it is
  // an excuse; refuse the list itself before comparing it to the report.
  for (const entry of recordedGateFailures)
    assert.ok(typeof entry.measurement === "string" && entry.measurement.length > 0,
      `recorded failure ${entry.session} carries no measurement reference`);

  const observed = (report.gate?.behavioural_clause_failures ?? []).map(failureKey).sort();
  const recorded = recordedGateFailures.map(failureKey).sort();
  assert.deepEqual(observed, recorded,
    "the set of failing behavioural clauses is not the recorded-failure list. " +
    `Unrecorded: ${observed.filter((key) => !recorded.includes(key)).join("; ") || "none"}. ` +
    `Recorded but no longer failing: ${recorded.filter((key) => !observed.includes(key)).join("; ") || "none"}. ` +
    "Update recordedGateFailures in this file, with the measurement, or fix the build.");
  assert.equal(report.gate?.behavioural_clause_failure_count, observed.length);

  // Everything the gate measures APART from those clauses must still pass, so a
  // timing or DLI regression cannot hide behind the recorded list.
  assert.equal(report.gate?.timing_and_dli_passed, true);
  assert.equal(report.gate?.passed, recordedGateFailures.length === 0);
});
