import crypto from "node:crypto";
import fs from "node:fs";

export const runtimeArtifactNames = [
  "void-strike-65-boot.bin",
  "void-strike-65.xex",
  "void-strike-65.atr",
];

export function runtimeEvidencePhase(argumentsList) {
  if (argumentsList.includes("--refresh-wall-trace-candidate") ||
      argumentsList.includes("--force")) {
    throw new Error("Unsupported evidence bypass; use the explicit --candidate phase");
  }
  return argumentsList.includes("--candidate") ? "candidate" : "final";
}

export function runtimeArtifactDescriptor(path, bytes) {
  return {
    path,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

export function runtimeArtifactSet({ boot, xex, atr }) {
  return {
    "void-strike-65-boot.bin": runtimeArtifactDescriptor("dist/void-strike-65-boot.bin", boot),
    "void-strike-65.xex": runtimeArtifactDescriptor("dist/void-strike-65.xex", xex),
    "void-strike-65.atr": runtimeArtifactDescriptor("dist/void-strike-65.atr", atr),
  };
}

export function validateRuntimeEvidenceBinding(report, artifacts, options = {}) {
  const requireComplete = options.requireComplete ?? true;
  if (report?.schema_version !== 2) throw new Error("Runtime wall trace schema v2 is required");
  if (requireComplete && (report.evidence?.status !== "complete" ||
      report.evidence?.partial !== false ||
      !Number.isInteger(report.evidence?.required_sessions) ||
      report.evidence.required_sessions <= 0 ||
      report.evidence.completed_sessions !== report.evidence.required_sessions)) {
    throw new Error("Runtime wall trace is partial or incomplete");
  }
  for (const name of runtimeArtifactNames) {
    const expected = artifacts[name];
    const observed = report.artifacts?.[name];
    if (expected === undefined || observed === undefined ||
        observed.path !== expected.path || observed.bytes !== expected.bytes ||
        observed.sha256 !== expected.sha256) {
      throw new Error(`Runtime wall trace binding mismatch for ${name}`);
    }
  }
  const xex = artifacts["void-strike-65.xex"];
  if (report.artifact?.path !== xex.path || report.artifact?.bytes !== xex.bytes ||
      report.artifact?.sha256 !== xex.sha256) {
    throw new Error("Runtime wall trace compatibility XEX binding is inconsistent");
  }
  return true;
}

// Owner decision 2026-09-21 — release gate semantics.
//
// The evidence is a truthful description of the current build, recorded
// failures included: a run that fails a behavioural clause still writes its
// report with `gate.passed === false`. So `gate.passed === true` cannot be the
// release gate, or the default build is deadlocked the moment one failure is
// recorded (which is exactly what happened; see §14.15 of
// docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md).
//
// The gate is: no UNRECORDED gate failure, and `gate.timing_and_dli_passed`.
// The recorded list lives in ONE data file, docs/recorded-gate-failures.json,
// read both by scripts/build.mjs and by the tripwire test, so the build and the
// tripwire cannot disagree about what is recorded. A new failure, or a recorded
// failure that silently disappears, fails both.
export const recordedGateFailuresPath = "docs/recorded-gate-failures.json";

export const recordedGateFailureClasses = Object.freeze([
  "a-stale-scenario",
  "b-wrong-selection",
  "c-real-failure",
  "pre-existing-unclassified",
]);

export function recordedGateFailureKey({ session, message }) {
  return `${session}: ${message}`;
}

const nonEmptyString = (value) => typeof value === "string" && value.length > 0;

export function loadRecordedGateFailures(rootDirectory) {
  const file = `${rootDirectory}/${recordedGateFailuresPath}`;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (data?.schema_version !== 1) {
    throw new Error(`${recordedGateFailuresPath} schema v1 is required`);
  }
  if (!Array.isArray(data.failures)) {
    throw new Error(`${recordedGateFailuresPath} carries no failures array`);
  }
  const seen = new Set();
  for (const entry of data.failures) {
    if (!nonEmptyString(entry?.session) || !nonEmptyString(entry?.message)) {
      throw new Error(`${recordedGateFailuresPath} has an entry without a session and message`);
    }
    // An entry without a class and a measurement reference is not a recorded
    // failure, it is an excuse. Refuse the list itself before comparing it.
    if (!recordedGateFailureClasses.includes(entry.class)) {
      throw new Error(`${recordedGateFailuresPath}: ${entry.session} carries no known class`);
    }
    if (!nonEmptyString(entry.measurement)) {
      throw new Error(`${recordedGateFailuresPath}: ${entry.session} carries no measurement reference`);
    }
    const key = recordedGateFailureKey(entry);
    if (seen.has(key)) {
      throw new Error(`${recordedGateFailuresPath}: ${key} is recorded twice`);
    }
    seen.add(key);
  }
  return data.failures;
}

// The single decision the release gate makes. scripts/build.mjs calls this and
// nothing else, so every case the tests inject here is the case the build takes.
export function evaluateReleaseGate(report, recordedFailures) {
  const observedFailures = report?.gate?.behavioural_clause_failures ?? [];
  const observed = observedFailures.map(recordedGateFailureKey).sort();
  const recorded = recordedFailures.map(recordedGateFailureKey).sort();
  const unrecorded = observed.filter((key) => !recorded.includes(key));
  const clearedRecorded = recorded.filter((key) => !observed.includes(key));
  const countConsistent =
    report?.gate?.behavioural_clause_failure_count === observedFailures.length;
  const timingAndDliPassed = report?.gate?.timing_and_dli_passed === true;
  // `gate.passed` keeps its meaning — false while any failure is recorded — and
  // must still agree with the list the report itself publishes.
  const passedFieldConsistent =
    report?.gate?.passed === (observedFailures.length === 0 && timingAndDliPassed);
  return {
    passed: unrecorded.length === 0 && clearedRecorded.length === 0 &&
      countConsistent && timingAndDliPassed && passedFieldConsistent,
    unrecorded,
    clearedRecorded,
    countConsistent,
    timingAndDliPassed,
    passedFieldConsistent,
    observedCount: observedFailures.length,
    recordedCount: recorded.length,
  };
}

export function releaseGateFailureMessage(result) {
  const reasons = [];
  if (result.unrecorded.length > 0) {
    reasons.push(`UNRECORDED gate failure(s): ${result.unrecorded.join("; ")}`);
  }
  if (result.clearedRecorded.length > 0) {
    reasons.push("recorded failure(s) no longer failing, so " +
      `${recordedGateFailuresPath} over-states what this build fails: ` +
      result.clearedRecorded.join("; "));
  }
  if (!result.countConsistent) {
    reasons.push("gate.behavioural_clause_failure_count disagrees with " +
      `gate.behavioural_clause_failures (${result.observedCount} entries)`);
  }
  if (!result.timingAndDliPassed) {
    reasons.push("gate.timing_and_dli_passed is not true: timing or the DLI sequence regressed");
  }
  if (!result.passedFieldConsistent) {
    reasons.push("gate.passed disagrees with the failure list the report publishes");
  }
  return `Final build refused by the release gate — ${reasons.join(". ")}. ` +
    `Fix the build, or record the failure in ${recordedGateFailuresPath} with its class ` +
    "and the measurement that classified it.";
}
