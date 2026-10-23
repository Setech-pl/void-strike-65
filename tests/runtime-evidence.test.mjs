import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  runtimeArtifactSet,
  runtimeEvidencePhase,
  runtimeEvidenceStaleFiles,
  resolveRuntimeEvidence,
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
    gate: { passed: true, timing_and_dli_passed: true,
      behavioural_clause_failure_count: 0, behavioural_clause_failures: [] },
  };
}

test("normal is the default; release is explicit and cannot defer computed gates", () => {
  assert.equal(runtimeEvidencePhase(["node", "build.mjs", "--candidate"]), "candidate");
  assert.equal(runtimeEvidencePhase(["node", "build.mjs"]), "normal");
  assert.equal(runtimeEvidencePhase(["node", "build.mjs", "--release"]), "release");
  for (const flag of ["--candidate", "--skip-runtime-measurement"]) {
    assert.throws(() => runtimeEvidencePhase(["--release", flag]),
      /cannot defer evidence or skip computed runtime gates/);
  }
  assert.throws(() => runtimeEvidencePhase(["node", "build.mjs", "--force"]),
    /Unsupported evidence bypass/);
  assert.throws(() => runtimeEvidencePhase(
    ["node", "build.mjs", "--refresh-wall-trace-candidate"]),
  /Unsupported evidence bypass/);
});

const resolve = (phase, report, extra = {}) => resolveRuntimeEvidence({
  phase, report, artifacts, evidenceCommit: "b3b8e466", ...extra,
});

test("normal warns about every stale file and exposes no stale report as current", () => {
  const report = completeReport();
  report.artifacts["void-strike-65-boot.bin"].bytes += 1;
  report.artifacts["void-strike-65.atr"].sha256 = "stale";
  const result = resolve("normal", report);
  assert.equal(result.status, "pending");
  assert.equal(result.report, null);
  assert.deepEqual(result.staleFiles, ["void-strike-65-boot.bin", "void-strike-65.atr"]);
  assert.equal(result.warning, "WARNING: Runtime wall-trace evidence pending: stale binding for " +
    "void-strike-65-boot.bin, void-strike-65.atr (evidence commit b3b8e466); release build will fail.");
  assert.throws(() => resolve("release", report),
    { message: "Runtime wall trace binding mismatch for void-strike-65-boot.bin" });
});

test("path, length, SHA and compatibility ATR mismatches all stay strict in release", () => {
  for (const name of Object.keys(artifacts)) {
    for (const [field, value] of [["path", "wrong"], ["bytes", 99], ["sha256", "wrong"]]) {
      const report = completeReport();
      report.artifacts[name][field] = value;
      assert.deepEqual(runtimeEvidenceStaleFiles(report, artifacts), [name]);
      assert.equal(resolve("normal", report).status, "pending");
      assert.throws(() => resolve("release", report), /binding mismatch/);
    }
  }
  const report = completeReport();
  report.artifact.sha256 = "wrong";
  assert.deepEqual(runtimeEvidenceStaleFiles(report, artifacts), ["void-strike-65.atr"]);
  assert.match(resolve("normal", report).warning, /void-strike-65\.atr/);
  assert.throws(() => resolve("release", report), /compatibility ATR binding/);
});

test("missing, partial and unsupported evidence stays pending normally and fatal for release", () => {
  const partial = completeReport();
  partial.evidence.partial = true;
  const unsupported = completeReport();
  unsupported.schema_version = 1;
  for (const report of [null, partial, unsupported]) {
    assert.equal(resolve("normal", report).report, null);
    assert.match(resolve("normal", report).warning, /WARNING:.*release build will fail/);
    assert.throws(() => resolve("release", report));
  }
  assert.equal(resolve("candidate", null).warning, null);
});

test("bound evidence is retained; only release applies the external release gate", () => {
  const report = completeReport();
  assert.equal(resolve("normal", report).report, report);
  assert.equal(resolve("release", report).status, "bound");
  report.gate.timing_and_dli_passed = false;
  report.gate.passed = false;
  assert.equal(resolve("normal", report).status, "bound");
  assert.throws(() => resolve("release", report), /timing or the DLI sequence regressed/);
  report.gate.timing_and_dli_passed = true;
  report.gate.behavioural_clause_failure_count = 1;
  report.gate.behavioural_clause_failures = [{ session: "fixture", message: "broken" }];
  assert.throws(() => resolve("release", report), /UNRECORDED gate failure/);
});

test("direct packager invokes --release and stops before creating an archive on failure", () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "vs65-release-policy-"));
  try {
    fs.mkdirSync(path.join(scratch, "scripts"));
    fs.writeFileSync(path.join(scratch, "package.json"), JSON.stringify({ version: "fixture" }));
    const scripts = path.dirname(fileURLToPath(new URL("../scripts/package-release.mjs", import.meta.url)));
    fs.copyFileSync(path.join(scripts, "package-release.mjs"), path.join(scratch, "scripts/package-release.mjs"));
    fs.writeFileSync(path.join(scratch, "scripts/build.mjs"),
      'import fs from "node:fs"; fs.writeFileSync("args.json", JSON.stringify(process.argv.slice(2))); process.exit(17);');
    const output = path.join(scratch, "release.zip");
    const result = spawnSync(process.execPath, [path.join(scratch, "scripts/package-release.mjs"), `--output=${output}`],
      { encoding: "utf8" });
    assert.equal(result.status, 17, result.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(scratch, "args.json"), "utf8")), ["--release"]);
    assert.equal(fs.existsSync(output), false);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
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
