import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeInterceptorBreakupTrace, executeRaiderRemnantMatrix,
  executeRemainingRaiderRemnantMatrix } from
  "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("previous 745-remnant reproducer remains clean", () => {
  const trace = executeRaiderRemnantMatrix({ root, artifact: "xex", kills: 745 });
  assert.equal(trace.pairShotKills, 745);
  assert.equal(trace.remnantCount, 0);
  assert.equal(trace.failures.length, 0);
});

test("effect backing resolves an OLD enemy PairShot cell", () => {
  const options = {
    root, artifact: "xex", actualPairShotKill: true, frames: 40,
    activeEnemyProjectileOverlap: true, captureProvenance: true,
  };
  const legacy = executeInterceptorBreakupTrace({
    ...options, legacyEffectEnemyPairshotBacking: true,
  });
  const fixed = executeInterceptorBreakupTrace(options);
  assert.ok(legacy.provenance.staleRestores.length > 0);
  assert.equal(legacy.provenance.orphanCells.length, 1);
  assert.equal(legacy.provenance.orphanCells[0].writerClass, "ENEMY PAIRSHOT");
  assert.equal(fixed.provenance.staleRestores.length, 0);
  assert.equal(fixed.provenance.orphanCells.length, 0);
});

test("more than 5000 Raider kills leave no dead-generation character cells", () => {
  const traces = ["xex", "atr"].map((artifact) =>
    executeRemainingRaiderRemnantMatrix({ root, artifact, kills: 2500 }));
  assert.ok(traces.reduce((sum, trace) => sum + trace.killEvents, 0) >= 5000);
  for (const trace of traces) {
    assert.equal(trace.requestedPrimaryKills, 2500);
    assert.equal(trace.staleBackingRestores, 0);
    assert.equal(trace.deadGenerationCells, 0);
    assert.equal(trace.orphanVisualCells, 0);
    assert.equal(trace.lostErase, 0);
    assert.equal(trace.failures.length, 0);
    assert.ok(trace.coverage.raiderSlotA > 0);
    assert.ok(trace.coverage.raiderSlotB > 0);
    assert.ok(trace.coverage.singleRaider > 0);
    assert.ok(trace.coverage.twoRaiders > 0);
    assert.ok(trace.coverage.nearSimultaneousKills > 0);
    assert.ok(trace.coverage.activeDebris > 0);
    assert.ok(trace.coverage.enemyFire > 0);
    assert.ok(trace.coverage.ringWraps > 0);
    assert.ok(trace.legitimateDebrisRecords > 0);
    for (const count of [0, 1, 3, 5]) {
      assert.ok(trace.coverage.preexistingEffects[count] > 0);
    }
    assert.equal(trace.remnantCount, 0);
    assert.deepEqual(trace.modes, ["NORMAL", "RAPID", "SPREAD"]);
    assert.deepEqual(trace.movements, ["STATIONARY", "LEFT", "RIGHT", "REVERSAL"]);
    assert.deepEqual(trace.yBands, ["HIGH", "MID", "LOW"]);
  }
});
