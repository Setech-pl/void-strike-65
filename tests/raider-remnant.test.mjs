import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeInterceptorBreakupTrace, executeRaiderRemnantMatrix,
  executeRemainingRaiderRemnantMatrix } from
  "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("legacy staggered overlap deterministically restores a Raider fragment glyph", () => {
  const trace = executeRaiderRemnantMatrix({
    root, artifact: "xex", kills: 128, legacyEffectOverlapResolver: true,
  });
  assert.equal(trace.pairShotKills, 128);
  assert.ok(trace.remnantCount > 0);
  assert.ok(trace.firstFailure.remnants.length > 0);
  const addresses = new Set(trace.firstFailure.remnants.map(({ address }) => address));
  const writes = trace.firstFailure.writerHistory.filter(({ address }) => addresses.has(address));
  assert.ok(writes.some(({ routine, before, after }) =>
    routine === "entity_effects_render" && before >= 110 && after >= 118));
  assert.ok(writes.some(({ routine, before, after }) =>
    routine === "entity_effects_erase" && before === 0 && after >= 110));
});

test("enemy PairShot stores the lower backing instead of a moving Raider effect glyph", () => {
  const options = {
    root, artifact: "xex", actualPairShotKill: true,
    enemyProjectileEffectOverlap: true, frames: 8,
  };
  const legacy = executeInterceptorBreakupTrace({
    ...options, legacyEnemyProjectileEffectBacking: true,
  }).enemyProjectileBackingOverlap;
  const fixed = executeInterceptorBreakupTrace(options).enemyProjectileBackingOverlap;
  assert.ok(legacy);
  assert.ok(fixed);
  assert.notEqual(legacy.savedBacking, legacy.lowerBacking);
  assert.equal(legacy.restored, legacy.savedBacking);
  assert.equal(fixed.savedBacking, fixed.lowerBacking);
  assert.equal(fixed.restored, fixed.lowerBacking);
});

test("player PairShot uses the same lower backing without regressing its ghost fix", () => {
  const fixed = executeInterceptorBreakupTrace({
    root, artifact: "xex", actualPairShotKill: true,
    enemyProjectileEffectOverlap: true, projectileEffectOverlapSlot: 2, frames: 8,
  }).enemyProjectileBackingOverlap;
  assert.ok(fixed);
  assert.equal(fixed.projectileSlot, 2);
  assert.equal(fixed.savedBacking, fixed.lowerBacking);
  assert.equal(fixed.restored, fixed.lowerBacking);
});

test("PairShot scans the effect slot whose independent index matches its own", () => {
  const options = {
    root, artifact: "xex", actualPairShotKill: true,
    enemyProjectileEffectOverlap: true, projectileEffectOverlapSlot: 3, frames: 8,
  };
  const legacy = executeInterceptorBreakupTrace({
    ...options, legacyEnemyProjectileEffectBacking: true,
  }).enemyProjectileBackingOverlap;
  const fixed = executeInterceptorBreakupTrace(options).enemyProjectileBackingOverlap;
  assert.equal(legacy.projectileSlot, legacy.effectSlot);
  assert.notEqual(legacy.savedBacking, legacy.lowerBacking);
  assert.equal(legacy.restored, legacy.savedBacking);
  assert.equal(fixed.projectileSlot, fixed.effectSlot);
  assert.equal(fixed.savedBacking, fixed.lowerBacking);
  assert.equal(fixed.restored, fixed.lowerBacking);
});

test("previous 745-remnant reproducer remains clean", () => {
  const trace = executeRaiderRemnantMatrix({ root, artifact: "xex", kills: 745 });
  assert.equal(trace.pairShotKills, 745);
  assert.equal(trace.remnantCount, 0);
  assert.equal(trace.failures.length, 0);
});

test("effect backing follows moving gameplay debris instead of preserving its glyph", () => {
  const options = {
    root, artifact: "xex", actualPairShotKill: true, frames: 40,
    activeDebrisOverlap: true, rotateRing: true, captureProvenance: true,
  };
  const legacy = executeInterceptorBreakupTrace({
    ...options, legacyInteractiveDebrisEffectBacking: true,
  });
  const fixed = executeInterceptorBreakupTrace(options);
  assert.equal(legacy.provenance.staleRestores.length, 1);
  assert.equal(legacy.provenance.orphanCells.length, 1);
  assert.equal(legacy.provenance.orphanCells[0].writerClass, "DEBRIS");
  assert.ok(legacy.provenance.history.some(({ writerClass, action, before, after }) =>
    writerClass === "EFFECT" && action === "claim" && before === 110 && after !== 110));
  assert.equal(fixed.provenance.staleRestores.length, 0);
  assert.equal(fixed.provenance.orphanCells.length, 0);
  const final = fixed.records.at(-1);
  assert.notEqual(final.debrisActive, 0);
  assert.notEqual(final.debrisState, 0);
  assert.notEqual(final.debrisCollisionCategory, 0);
  assert.ok(final.debrisHp > 0);
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
