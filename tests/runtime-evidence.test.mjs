import assert from "node:assert/strict";
import test from "node:test";

import {
  runtimeArtifactSet,
  runtimeEvidencePhase,
  validateRuntimeEvidenceBinding,
} from "../scripts/runtime-evidence.mjs";

const artifacts = runtimeArtifactSet({
  boot: Buffer.from("boot"),
  atr: Buffer.from("atr"),
});

function completeReport() {
  return {
    schema_version: 2,
    evidence: { status: "complete", partial: false,
      required_sessions: 3, completed_sessions: 3 },
    artifacts: structuredClone(artifacts),
    artifact: structuredClone(artifacts["void-strike-65.atr"]),
  };
}

test("candidate build is an explicit non-final evidence phase", () => {
  assert.equal(runtimeEvidencePhase(["node", "build.mjs", "--candidate"]), "candidate");
  assert.equal(runtimeEvidencePhase(["node", "build.mjs"]), "final");
  assert.throws(() => runtimeEvidencePhase(["node", "build.mjs", "--force"]),
    /Unsupported evidence bypass/);
  assert.throws(() => runtimeEvidencePhase(
    ["node", "build.mjs", "--refresh-wall-trace-candidate"]),
  /Unsupported evidence bypass/);
});

test("final evidence binds boot BIN and ATR exactly", () => {
  assert.equal(validateRuntimeEvidenceBinding(completeReport(), artifacts), true);
  for (const name of Object.keys(artifacts)) {
    const report = completeReport();
    report.artifacts[name].sha256 = "0".repeat(64);
    assert.throws(() => validateRuntimeEvidenceBinding(report, artifacts),
      new RegExp(name.replaceAll(".", "\\.")));
  }
});

test("final evidence rejects partial traces and a stale compatibility ATR hash", () => {
  const partial = completeReport();
  partial.evidence.status = "partial";
  partial.evidence.partial = true;
  assert.throws(() => validateRuntimeEvidenceBinding(partial, artifacts), /partial or incomplete/);

  const stale = completeReport();
  stale.artifact.sha256 = "f".repeat(64);
  assert.throws(() => validateRuntimeEvidenceBinding(stale, artifacts),
    /compatibility ATR binding/);

  const incomplete = completeReport();
  incomplete.evidence.completed_sessions = 2;
  assert.throws(() => validateRuntimeEvidenceBinding(incomplete, artifacts),
    /partial or incomplete/);
});
