import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeInterceptorBreakupTrace } from
  "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function breakupFrames(options) {
  return executeInterceptorBreakupTrace({ root, artifact: "xex", frames: 32,
    ...options }).records.filter(({ phase }) => phase === "BREAKUP");
}

function effect(frame, slot) {
  return frame.effects.find((candidate) => candidate.slot === slot);
}

test("both Heavy slots materialise only the centred destruction core", () => {
  for (const raiderSlot of [0, 1]) {
    for (const [enemyX, enemyY] of [[80, 24], [124, 88], [160, 160], [124, 220]]) {
      const frames = breakupFrames({ raiderSlot, enemyX, enemyY });
      const killed = frames[0];
      const materialised = frames[1];
      assert.deepEqual([killed.enemyExplosionX, killed.enemyExplosionY],
        [enemyX, enemyY + 3], `Heavy ${raiderSlot} kill snapshot`);
      assert.deepEqual(materialised.effects.map(({ slot, x, y, ttl, drawn }) =>
        [slot, x, y, ttl, drawn]), [[0, enemyX + 6, enemyY + 3, 5, 1]]);
      assert.deepEqual([materialised.effectActiveMask, materialised.effectActiveCount],
        [0x01, 1]);
      assert.notEqual(materialised.effects[0].screenCode, 0,
        "the compact destruction core must remain visible");
    }
  }
});

test("Raider kills never materialise flying fragment slots", () => {
  let fragments = 0;
  for (const raiderSlot of [0, 1]) {
    for (const enemyX of [80, 124, 160]) {
      for (const enemyY of [24, 88, 160, 220]) {
        const frames = breakupFrames({ raiderSlot, enemyX, enemyY });
        for (const frame of frames) {
          fragments += frame.effects.filter(({ slot }) => slot > 0).length;
          assert.equal(frame.effectActiveMask & 0x1e, 0,
            `Heavy ${raiderSlot} activated a fragment bit at frame ${frame.frame}`);
          assert.ok(frame.effectActiveCount <= 1);
        }
      }
    }
  }
  assert.equal(fragments, 0);
});

test("effect-slot reuse follows the surviving Heavy snapshot, not reset Raider state", () => {
  for (const raiderSlot of [0, 1]) {
    const frames = breakupFrames({ raiderSlot, enemyX: 124, enemyY: 220,
      secondRaider: true, secondKillFrame: 5 });
    const secondKill = frames.find(({ frame }) => frame === 5);
    const replacement = frames.find(({ frame }) => frame === 6);
    assert.equal(secondKill.effectPending, 1);
    assert.equal(secondKill.effects.length, 0,
      "the retained generation must clear before effect-slot reuse");
    assert.deepEqual([effect(replacement, 0).x, effect(replacement, 0).y],
      [secondKill.enemyExplosionX + 6, secondKill.enemyExplosionY]);
    assert.deepEqual(replacement.effects.map(({ slot }) => slot), [0]);
    assert.deepEqual([replacement.effectActiveMask, replacement.effectActiveCount], [1, 1]);
    assert.equal(replacement.scoreLo, 0x62,
      "both Heavy kills retain one 10-point award each");
  }
});

test("P1/P2 lethal hits keep release, score, explosion timing and later recycle", () => {
  for (const raiderSlot of [0, 1]) {
    const frames = breakupFrames({ raiderSlot, enemyX: 124, enemyY: 88 });
    assert.deepEqual(frames[0].enemyMemberStates, [0, 0]);
    assert.deepEqual([frames[0].scoreHi, frames[0].scoreLo], [0x07, 0x52]);
    assert.equal(frames[0].enemyExplosionTimer, 24);
    assert.equal(frames[24].enemyExplosionTimer, 0);
    assert.equal(frames[24].enemyActive, 0,
      "the unchanged recycle path leaves the formation ready for later admission");
    assert.equal(frames.every((frame) => (frame.effectActiveMask & 0x1e) === 0), true);
  }
});
