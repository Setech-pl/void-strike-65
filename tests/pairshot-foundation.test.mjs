import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { measurePairShotProof } from "../scripts/pairshot-proof.mjs";
import { executePlayerFighterBurstBalanceTrace } from
  "../scripts/weapon-pickup-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("PairShot uses one logical record and one character cell for two pulses", () => {
  const proof = measurePairShotProof(root);
  assert.deepEqual(proof.fighterWeapons.poolSlots, {
    player_fighter: 5, interceptor: 5, total: 10,
  });
  assert.deepEqual(proof.fighterWeapons.activeLimits, {
    player_fighter: 5, interceptor: 5, total: 10,
  });
  assert.equal(proof.fighterWeapons.player_fighter.visiblePulsesPerObject, 2);
  assert.equal(proof.fighterWeapons.interceptor.visiblePulsesPerObject, 2);
  assert.deepEqual(proof.fighterWeapons.player_fighter.pairGlyphRows, [1, 2, 5, 6]);
  for (const scenario of Object.values(proof.scenarios)) {
    const count = scenario.counts.player + scenario.counts.enemy;
    assert.equal(scenario.dynamicCells, count);
    assert.equal(scenario.renderScreenWrites, count);
    assert.equal(scenario.eraseScreenWrites, count);
    assert.equal(scenario.restoredCellMismatches, 0);
  }
});

test("Normal, Rapid and Spread retain 8/10/8 visible pulses as 4/5/4 PairShots", () => {
  const trace = executePlayerFighterBurstBalanceTrace({
    root, artifact: "xex", windowFrames: 160,
  });
  const modes = Object.fromEntries(trace.traces.map((entry) => [entry.mode, entry]));
  assert.deepEqual([
    modes.NORMAL.firstBurstProjectiles,
    modes.RAPID.firstBurstProjectiles,
    modes.SPREAD.firstBurstProjectiles,
  ], [4, 5, 4]);
  assert.deepEqual([
    trace.manifest.fighterWeapons.player_fighter.visibleBurstPulses,
    trace.manifest.fighterWeapons.player_fighter.rapidFireVisiblePulses,
    trace.manifest.fighterWeapons.player_fighter.spreadShotVisiblePulses,
  ], [8, 10, 8]);
  assert.deepEqual([
    modes.NORMAL.maximumPoolOccupancy,
    modes.RAPID.maximumPoolOccupancy,
    modes.SPREAD.maximumPoolOccupancy,
  ], [4, 5, 2]);
  const spreadKinds = modes.SPREAD.records.filter(({ allocatedProjectiles }) =>
    allocatedProjectiles > 0).slice(0, 4).map((record) =>
    record.slots[record.allocatedSlots[0]].active & 0xf0);
  assert.deepEqual(spreadKinds, [0x10, 0x40, 0x20, 0x10]);
});

test("PairShot keeps one collision event per logical player or enemy record", () => {
  const proof = measurePairShotProof(root);
  assert.equal(proof.scenarios.playerRapid.playerCollisionMissCyclesPerObject, 44);
  assert.equal(proof.scenarios.enemyMaximum.enemyCollisionMissCyclesPerObject, 32);
  assert.equal(proof.fighterWeapons.interceptor.damage, 10);
  assert.equal(proof.fighterWeapons.player_fighter.damage, undefined,
    "PairShot does not introduce an implicit doubled damage field");
});
