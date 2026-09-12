import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executePairShotStaleTrace } from "../scripts/pairshot-stale-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("1200 PairShots leave no stale, ghost, restore-mismatch or lost-erase cells", () => {
  const trace = executePairShotStaleTrace({ root, artifact: "xex", shots: 1200 });
  assert.equal(trace.shots, 1200);
  assert.deepEqual(trace.summary.staleCells, 0);
  assert.deepEqual(trace.summary.ghostGlyphs, 0);
  assert.deepEqual(trace.summary.restoreMismatches, 0);
  assert.deepEqual(trace.summary.lostErases, 0);
  assert.equal(trace.firstFailure, null);
  assert.deepEqual(Object.values(trace.summary.byMovement).map(({ shots }) => shots),
    [300, 300, 300, 300]);
  assert.deepEqual(Object.values(trace.summary.byMode).map(({ shots }) => shots),
    [400, 400, 400]);
  assert.deepEqual(Object.values(trace.summary.byRelease).map(({ shots }) => shots),
    [300, 300, 300, 300]);

  const topBound = trace.records.filter(({ releaseReason }) => releaseReason === "top-bound");
  const expiry = trace.records.filter(({ releaseReason }) => releaseReason === "expiry");
  const collision = trace.records.filter(({ releaseReason }) => releaseReason === "collision");
  const retained = trace.records.filter(({ releaseReason }) => releaseReason === "test-release");
  assert.ok(topBound.every(({ activeAfterUpdate, oldLogicalRow, copiedAddress }) =>
    activeAfterUpdate === 0 && oldLogicalRow === 0 && copiedAddress !== null));
  assert.ok(expiry.every(({ activeAfterUpdate }) => activeAfterUpdate === 0));
  assert.ok(collision.every(({ activeAfterUpdate }) => activeAfterUpdate === 0));
  assert.ok(retained.every(({ activeAfterUpdate, newAddress }) =>
    activeAfterUpdate !== 0 && newAddress !== null));
  assert.equal(new Set(trace.records.map(({ ringHeadBefore }) => ringHeadBefore)).size, 27);
});

test("XEX and ATR agree on the bounded stale-cell matrix", () => {
  const xex = executePairShotStaleTrace({ root, artifact: "xex", shots: 108 });
  const atr = executePairShotStaleTrace({ root, artifact: "atr", shots: 108 });
  assert.deepEqual({ ...xex, artifact: "release", manifestArtifact: undefined },
    { ...atr, artifact: "release", manifestArtifact: undefined });
});
