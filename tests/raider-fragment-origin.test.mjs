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

test("both Heavy slots materialise no character destruction effect", () => {
  for (const raiderSlot of [0, 1]) {
    for (const [enemyX, enemyY] of [[80, 24], [124, 88], [160, 160], [124, 220]]) {
      const trace = executeInterceptorBreakupTrace({
        root, artifact: "xex", frames: 32, raiderSlot, enemyX, enemyY,
        captureWrites: true, captureProvenance: true,
      });
      const frames = trace.records.filter(({ phase }) => phase === "BREAKUP");
      const killed = frames[0];
      assert.deepEqual([killed.enemyExplosionX, killed.enemyExplosionY],
        [enemyX, enemyY + 3], `Heavy ${raiderSlot} kill snapshot`);
      for (const frame of frames) assert.deepEqual([
        frame.effectPending, frame.effectActiveMask, frame.effectActiveCount,
        frame.effectRenderedMask, frame.effects.length,
      ], [0, 0, 0, 0, 0], `Heavy ${raiderSlot} frame ${frame.frame}`);
      const raiderCharacterWrites = trace.provenance.history.filter(({ frame, writerClass }) =>
        frame >= 0 && writerClass === "EFFECT");
      assert.equal(raiderCharacterWrites.length, 0,
        `Heavy ${raiderSlot} wrote a destruction glyph into the character ring`);
    }
  }
});

test("Raider kills never activate any transient-effect slot", () => {
  let characterEffects = 0;
  for (const raiderSlot of [0, 1]) {
    for (const enemyX of [80, 124, 160]) {
      for (const enemyY of [24, 88, 160, 220]) {
        const frames = breakupFrames({ raiderSlot, enemyX, enemyY });
        for (const frame of frames) {
          characterEffects += frame.effects.length;
          assert.deepEqual([
            frame.effectPending, frame.effectActiveMask, frame.effectActiveCount,
          ], [0, 0, 0],
          `Heavy ${raiderSlot} activated a character effect at frame ${frame.frame}`);
        }
      }
    }
  }
  assert.equal(characterEffects, 0);
});

test("alternating Heavy kills retain score and never schedule delayed materialisation", () => {
  for (const raiderSlot of [0, 1]) {
    const frames = breakupFrames({ raiderSlot, enemyX: 124, enemyY: 220,
      secondRaider: true, secondKillFrame: 5 });
    const secondKill = frames.find(({ frame }) => frame === 5);
    assert.deepEqual([
      secondKill.effectPending, secondKill.effectActiveMask,
      secondKill.effectActiveCount, secondKill.effects.length,
    ], [0, 0, 0, 0]);
    assert.equal(frames.every((frame) => frame.effectPending === 0 &&
      frame.effectActiveMask === 0 && frame.effectActiveCount === 0), true);
    assert.equal(secondKill.scoreLo, 0x62,
      "both Heavy kills retain one 10-point award each");
  }
});

test("Raider death preserves an active generic debris breakup", () => {
  for (const raiderSlot of [0, 1]) {
    const frames = breakupFrames({ raiderSlot, secondRaider: true,
      preexistingEffectCount: 5 });
    assert.deepEqual([
      frames[0].effectPending, frames[0].effectActiveMask,
      frames[0].effectActiveCount, frames[0].effects.length,
    ], [0, 0x1f, 5, 5]);
    assert.ok(frames.slice(0, 5).every((frame) => frame.effects.length >= 4),
      "Raider kill cleared an unrelated generic breakup");
  }
});

test("Raider death preserves existing gameplay debris without allocating an effect", () => {
  for (const raiderSlot of [0, 1]) {
    const frames = breakupFrames({ raiderSlot, secondRaider: true,
      preexistingGameplayDebris: true });
    assert.ok(frames[0].debrisActive & 1);
    assert.notEqual(frames[0].debrisState, 0);
    assert.ok(frames[0].debrisHp > 0);
    assert.deepEqual([
      frames[0].effectPending, frames[0].effectActiveMask,
      frames[0].effectActiveCount, frames[0].effects.length,
    ], [0, 0, 0, 0]);
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
    assert.equal(frames.every((frame) => frame.effectPending === 0 &&
      frame.effectActiveMask === 0 && frame.effectActiveCount === 0), true);
  }
});
