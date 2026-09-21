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

test("the evidence is complete and every recorded gate passes", () => {
  const report = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  assert.equal(report.schema_version, 2);
  assert.equal(report.evidence?.status, "complete");
  assert.equal(report.evidence?.partial, false);
  assert.equal(report.evidence?.completed_sessions, report.evidence?.required_sessions);
  assert.ok(report.evidence?.required_sessions > 0);
  assert.equal(report.gate?.passed, true);
});
