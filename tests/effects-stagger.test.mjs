import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  executeDebrisDestructionTrace,
} from "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");

function finalFrames(artifact) {
  return executeDebrisDestructionTrace({ root, artifact }).records
    .filter((record) => record.phase === "FINAL");
}

test("character effects use bounded 3/2 slot groups without changing the PMG explosion", () => {
  assert.match(source, /effect_stagger_masks:\s*\n[\s\S]*?\.byte \$07,\$18/);
  assert.match(source,
    /SHARED_FIGHTER_EXPLOSION_FRAME_COUNT = 6[\s\S]*?SHARED_FIGHTER_EXPLOSION_FRAME_DURATION = 4/);
  assert.match(source, /update_transient_effects:[\s\S]*?dec EFFECT_TIMER,x/,
    "logical TTL must continue at 50 Hz");
  assert.match(source,
    /lda effect_stagger_masks,y[\s\S]*?and EFFECT_SCRATCH1[\s\S]*?eor #\$01/,
    "fragment glyph selection must advance only on the slot publication tick");
});

test("spawn reaches every visual slot within one PAL frame and preserves five slots", () => {
  const frames = finalFrames("atr");
  assert.equal(frames[0].effectActiveMask, 0x1f);
  assert.equal(frames[0].effectActiveCount, 5);
  assert.equal(frames[0].effectRenderedMask, 0x18);
  assert.equal(frames[1].effectRenderedMask, 0x1f);
  assert.equal(frames[1].effectActiveCount, 5);
  for (let slot = 1; slot < 5; slot += 1) {
    const ttl = frames.slice(0, 30).map((frame) =>
      frame.effects.find((effect) => effect.slot === slot)?.ttl).filter(Number.isInteger);
    assert.ok(ttl.every((value, index) => index === 0 || value === ttl[index - 1] - 1),
      `slot ${slot} logical TTL stopped advancing at 50 Hz`);
  }
});

test("staggered expiry clears both parity groups without stale backing or ghosts", () => {
  const frames = finalFrames("atr");
  assert.equal(frames[30].effectActiveCount, 0);
  assert.notEqual(frames[30].effectRenderedMask, 0,
    "the opposite parity may remain visible for its one accepted latency frame");
  assert.equal(frames[31].effectRenderedMask, 0);
  assert.equal(frames[31].screen.every((value) => value === 0), true);
});

test("PairShot and generic-effect backing resolvers stay below the local fix ceiling", () => {
  const peak = Math.max(...Array.from({ length: 22 }, (unused, ringHead) =>
    executeDebrisDestructionTrace({ root, artifact: "atr", ringHead }).records
      .filter((record) => record.phase === "FINAL")
      .reduce((maximum, record) => Math.max(maximum,
        record.effectEraseCycles + record.effectRenderCycles), 0)));
  // RE-PINNED 2026-10-01 (recorded failures review, A10): the measured peak is 1,071 cycles
  // (was 1,032; delta over the 822-cycle baseline 249, was 210). The ceiling
  // below, 300 over the baseline, is the gate and is unchanged.
  assert.equal(peak, 1071);
  assert.equal(peak - 822, 249);
  assert.ok(peak - 822 < 300);
});
