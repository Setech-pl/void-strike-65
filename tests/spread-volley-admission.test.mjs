import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { executeSpreadShotFireHeldTrace } from "../scripts/weapon-pickup-runtime.mjs";

// Owner decision 2026-09-30 (docs/plans/spread-volley-fix.md): a Spread volley
// is admitted only when three slots are free within the active limit, and then
// left, centre and right are all placed in the same frame with the shot sound.
// Otherwise nothing is placed and the one pending fire event is retried next
// frame. The defect it fixes: the side shots were placed first and kept, so a
// volley that began with fewer than three free slots held the pool full with
// lone side shots, never placed its centre, never advanced the burst and never
// started the sound (docs/diagnostics/spread-debug-route-2026-09-30.md).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const weapons = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"))
  .fighterWeapons.player_fighter;
const VOLLEY = "centre,left,right";

function emissions(trace) {
  return trace.records.filter(({ allocatedSlots }) => allocatedSlots.length > 0)
    .map((record) => ({ frame: record.frame, kinds: record.kinds.join(), sound: record.soundStarted }));
}

test("fire held into a crowded pool emits whole Spread volleys with the shot sound", () => {
  const trace = executeSpreadShotFireHeldTrace({
    root, artifact: "atr", frames: 200, liveShotYs: [190, 150, 110, 70],
  });
  const emitted = emissions(trace);
  assert.equal(emitted.every(({ kinds }) => kinds === VOLLEY || kinds === "centre"), true,
    `every emission must be a whole volley or the centre follow-up: ${JSON.stringify(emitted)}`);
  const volleys = emitted.filter(({ kinds }) => kinds === VOLLEY).length;
  const followUps = emitted.filter(({ kinds }) => kinds === "centre").length;
  assert.ok(volleys > 0, "the crowded start must not starve the volley for the whole window");
  assert.deepEqual([trace.left, trace.right], [volleys, volleys],
    "no side shot may exist without its volley");
  assert.equal(trace.centre, volleys + followUps);
  assert.equal(emitted.every(({ sound }) => sound), true, "every emission starts the shot sound");
  assert.equal(trace.fireSounds, emitted.length);
  // MEASURED 2026-09-30: 9 centre / 5 left / 5 right, 9 sounds; `main` 1c3da14
  // gave 0 / 29 / 0 and no sound, the pool full on all 200 frames.
  assert.deepEqual([trace.centre, trace.left, trace.right, trace.fireSounds], [9, 5, 5, 9]);
});

test("fire held from an empty pool keeps the accepted Spread cadence", () => {
  const trace = executeSpreadShotFireHeldTrace({ root, artifact: "atr", frames: 200 });
  assert.deepEqual([trace.centre, trace.left, trace.right, trace.fireSounds, trace.framesPoolFull],
    [10, 5, 5, 10, 0]);
  assert.deepEqual(emissions(trace).map(({ frame, kinds }) => `${frame}:${kinds}`), [
    "0:centre,left,right", "28:centre", "40:centre,left,right", "68:centre",
    "80:centre,left,right", "108:centre", "120:centre,left,right", "148:centre",
    "160:centre,left,right", "188:centre",
  ]);
});

test("a blocked Spread volley is one pending emission, never catch-up fire", () => {
  const trace = executeSpreadShotFireHeldTrace({
    root, artifact: "atr", frames: 200, liveShotYs: [200, 170, 140, 110, 80],
  });
  const emitted = emissions(trace);
  const blocked = trace.records.filter(({ frame, allocationDue, allocatedSlots }) =>
    frame < emitted[0].frame && allocationDue && allocatedSlots.length === 0);
  assert.ok(blocked.length > 0, "the scenario must start with the volley blocked");
  assert.equal(trace.records.every(({ allocatedSlots }) =>
    allocatedSlots.length <= trace.geometry.volleySize), true,
  "no frame may place more than one volley");
  assert.equal(emitted.every(({ kinds }) => kinds === VOLLEY || kinds === "centre"), true,
    `every emission must be a whole volley or the centre follow-up: ${JSON.stringify(emitted)}`);
  assert.equal(emitted[0].kinds, VOLLEY, "the first emission after the block is one volley");
  for (let index = 1; index < emitted.length; index += 1) {
    const [previous, current] = [emitted[index - 1], emitted[index]];
    assert.notEqual(previous.kinds, current.kinds,
      `emissions must alternate volley and follow-up: ${JSON.stringify(emitted)}`);
    const minimumGap = previous.kinds === VOLLEY
      ? weapons.spreadShotCooldownFrames : weapons.postBurstFrames;
    assert.ok(current.frame - previous.frame >= minimumGap,
      `f${current.frame} ${current.kinds} came ${current.frame - previous.frame} frames after ` +
      `f${previous.frame} ${previous.kinds}; the cadence allows no less than ${minimumGap}`);
  }
});
