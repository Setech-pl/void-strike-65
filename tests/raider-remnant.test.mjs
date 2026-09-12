import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeInterceptorBreakupTrace, executeRaiderRemnantMatrix } from
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

test("2000 Raider kills leave no character remnant in XEX or ATR", () => {
  const traces = ["xex", "atr"].map((artifact) => executeRaiderRemnantMatrix({
    root, artifact, kills: 1000,
  }));
  for (const trace of traces) {
    assert.equal(trace.pairShotKills, 1000);
    assert.equal(trace.remnantCount, 0);
    assert.equal(trace.failures.length, 0);
    assert.deepEqual(trace.modes, ["NORMAL", "RAPID", "SPREAD"]);
    assert.deepEqual(trace.movements, ["STATIONARY", "LEFT", "RIGHT", "REVERSAL"]);
    assert.deepEqual(trace.yBands, ["HIGH", "MID", "LOW"]);
    assert.ok(trace.ringStepKills > 0);
    assert.ok(trace.ringWrapKills > 0);
    assert.equal(trace.fiveSlotEffectEvents, 1000);
  }
});
