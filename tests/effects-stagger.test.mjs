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

// Plasma FX (docs/plans/plasma-fx.md): the trace runs 48 frames, room for any
// class's break-up (a debris's lives 30 since B1.1, a Heavy's 45).
function finalFrames(artifact) {
  return executeDebrisDestructionTrace({ root, artifact, finalFrames: 48 }).records
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

// RE-POINTED 2026-10-05, plasma FX (docs/plans/plasma-fx.md, owner decisions 2
// and 3): the break-up grows from one cell, so its core publishes on its first
// publication tick and the four fragments are held back until frame 5 (they
// start in the core's cell). The contract is unchanged in kind: every visual
// slot reaches the screen within one PAL frame of becoming visible, all five
// slots are allocated on the spawn frame.
test("spawn reaches every visual slot within one PAL frame and preserves five slots", () => {
  const frames = finalFrames("atr");
  assert.equal(frames[0].effectActiveMask, 0x1f);
  assert.equal(frames[0].effectActiveCount, 5);
  assert.equal(frames[0].effectRenderedMask, 0x00, "the fragments' parity group: all held back");
  assert.equal(frames[1].effectRenderedMask, 0x01, "the core, on its first tick");
  assert.equal(frames[5].effectRenderedMask & 0x06, 0x06, "fragments 1-2 on frame 5");
  assert.equal(frames[6].effectRenderedMask, 0x1f, "every slot by frame 6");
  assert.equal(frames[1].effectActiveCount, 5);
  for (let slot = 1; slot < 5; slot += 1) {
    const ttl = frames.slice(0, 30).map((frame) =>
      frame.effects.find((effect) => effect.slot === slot)?.ttl).filter(Number.isInteger);
    assert.ok(ttl.every((value, index) => index === 0 || value === ttl[index - 1] - 1),
      `slot ${slot} logical TTL stopped advancing at 50 Hz`);
  }
});

// A debris's break-up expires on frame 30: B1 had moved it to 45, B1.1 item d
// (a Light's or a debris's lives 30) puts it back.
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
    executeDebrisDestructionTrace({ root, artifact: "atr", ringHead, finalFrames: 48 }).records
      .filter((record) => record.phase === "FINAL")
      .reduce((maximum, record) => Math.max(maximum,
        record.effectEraseCycles + record.effectRenderCycles), 0)));
  // RE-PINNED 2026-10-01 (recorded failures review, A10): the measured peak is 1,071 cycles
  // (was 1,032; delta over the 822-cycle baseline 249, was 210). The ceiling
  // below, 300 over the baseline, is the gate and is unchanged.
  // RE-PINNED 2026-10-01, roadmap 4.6 step 5 (docs/plans/director-4.6.md
  // §8.3): 1,071 -> 1,068. light_cell_resolve's below-range exit now returns
  // in place instead of branching to a far rts - one cycle less per captured
  // cell, three captures on the peak frame. Delta over the baseline 246.
  // RE-PINNED 2026-10-05, plasma FX (docs/plans/plasma-fx.md): 1,068 -> 890
  // over the whole life. The renderer now decides a cell's look first and
  // skips the three backing resolvers when the cell it covers is blank (code
  // 0, which none of them can resolve to anything else); B1.1's asymmetric
  // spread separates the cells sooner. The delta over the baseline is 68. The
  // gate below is unchanged.
  assert.equal(peak, 890);
  assert.equal(peak - 822, 68);
  assert.ok(peak - 822 < 300);
});
