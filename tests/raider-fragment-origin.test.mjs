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

test("both Heavy slots snapshot the kill origin before deferred breakup materialisation", () => {
  for (const raiderSlot of [0, 1]) {
    for (const [enemyX, enemyY] of [[80, 24], [124, 88], [160, 160], [124, 220]]) {
      const frames = breakupFrames({ raiderSlot, enemyX, enemyY });
      const killed = frames[0];
      const materialised = frames[1];
      assert.deepEqual([killed.enemyExplosionX, killed.enemyExplosionY],
        [enemyX, enemyY + 3], `Heavy ${raiderSlot} kill snapshot`);
      assert.deepEqual(materialised.effects.map(({ slot, x, y }) => [slot, x, y]), [
        [0, enemyX + 6, enemyY + 3],
        [1, enemyX + 8, enemyY + 5],
        [2, enemyX + 12, enemyY + 5],
        [3, enemyX + 8, enemyY + 9],
        [4, enemyX + 12, enemyY + 9],
      ]);
    }
  }
});

test("active breakup fragments cannot wrap to an unrelated visible origin", () => {
  let fragments = 0;
  for (const raiderSlot of [0, 1]) {
    for (const enemyX of [80, 124, 160]) {
      for (const enemyY of [24, 88, 160, 220]) {
        const frames = breakupFrames({ raiderSlot, enemyX, enemyY });
        for (const slot of [1, 2, 3, 4]) {
          fragments += 1;
          for (let index = 2; index < frames.length; index += 1) {
            const previous = effect(frames[index - 1], slot);
            const current = effect(frames[index], slot);
            if (previous === undefined || current === undefined) continue;
            assert.ok(Math.abs(current.x - previous.x) <= 2,
              `Heavy ${raiderSlot} fragment ${slot} wrapped X ${previous.x}->${current.x}`);
            assert.ok(Math.abs(current.y - previous.y) <= 3,
              `Heavy ${raiderSlot} fragment ${slot} wrapped ${previous.y}->${current.y}`);
          }
        }
      }
    }
  }
  assert.equal(fragments, 96);
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
    assert.deepEqual(replacement.effects.slice(1).map(({ x, y }) =>
      [x - secondKill.enemyExplosionX, y - secondKill.enemyExplosionY]),
    [[8, 3], [12, 3], [8, 7], [12, 7]]);
  }
});
