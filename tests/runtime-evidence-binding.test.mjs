import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadRecordedGateFailures,
  resolveRuntimeEvidence,
  runtimeArtifactSet,
  runtimeEvidenceStaleFiles,
  validateRuntimeEvidenceBinding,
} from "../scripts/runtime-evidence.mjs";

// §BR: stale evidence is visible and pending in a normal build. Release must
// reject it. Never repair the report's hashes by hand to make either test pass.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportBytes = fs.readFileSync(path.join(root, "docs/runtime-wall-trace.json"));
const report = JSON.parse(reportBytes);
const artifacts = runtimeArtifactSet({
  boot: fs.readFileSync(path.join(root, "dist/void-strike-65-boot.bin")),
  atr: fs.readFileSync(path.join(root, "dist/void-strike-65.atr")),
});

test("built manifest marks pending evidence and never borrows stale trace measurements", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "dist/void-strike-65-manifest.json")));
  const meta = manifest.runtimeEvidence;
  assert.ok(["normal", "candidate", "release"].includes(meta.phase));
  const result = resolveRuntimeEvidence({ phase: meta.phase, report, artifacts,
    evidenceCommit: meta.evidenceCommit, recordedFailures: loadRecordedGateFailures(root) });
  assert.deepEqual(meta.artifacts, artifacts);
  assert.deepEqual(meta.staleFiles, result.staleFiles);
  assert.equal(meta.warning, result.warning);
  if (result.status === "pending") {
    assert.equal(meta.status, `${meta.phase}-awaiting-trace`);
    assert.equal(meta.reportPath, null);
    assert.equal(meta.reportSha256, null);
    assert.equal(manifest.runtimeTiming.wallTrace, null);
    assert.equal(manifest.runtimeTiming.measured_wall_cycles_dma_on, null);
    assert.equal(manifest.runtimeTiming.measured_physical_headroom, null);
    if (meta.phase === "normal") {
      assert.ok(meta.evidenceCommit.length > 0);
      assert.match(meta.warning, /WARNING:.*release build will fail/);
      for (const name of runtimeEvidenceStaleFiles(report, artifacts)) {
        assert.ok(meta.warning.includes(name));
      }
    }
  } else {
    assert.equal(meta.status, meta.phase === "release" ? "final-bound" : "normal-bound");
    assert.equal(meta.reportPath, "docs/runtime-wall-trace.json");
    assert.equal(validateRuntimeEvidenceBinding(report, artifacts), true);
  }
});

test("release refuses the real stale artifacts before accepting any external gate", () => {
  const release = () => resolveRuntimeEvidence({ phase: "release", report, artifacts,
    recordedFailures: loadRecordedGateFailures(root) });
  if (runtimeEvidenceStaleFiles(report, artifacts).length > 0) {
    assert.throws(release, /Runtime wall trace (binding mismatch|compatibility ATR binding)/);
  } else {
    assert.equal(validateRuntimeEvidenceBinding(report, artifacts), true);
    assert.equal(release().status, "bound");
  }
});
