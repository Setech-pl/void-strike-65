import assert from "node:assert/strict";
import test from "node:test";
import { focusedPalAcceptance } from "../scripts/focused-pal-acceptance.mjs";

const frame = { wall_cycles: 24_515, missed_frames: 0,
  extra_vbi_boundaries: 0, dli_sequence_violations: 0 };

test("focused PAL acceptance rejects the late-to-early pickup fence missed update", () => {
  // Measured baseline: activation starts on host 2685, next update on 2687.
  // Work itself is below the wall ceiling; the missed synchronization fails.
  const missed = 2687 - 2685 - 1;
  const result = focusedPalAcceptance([{ ...frame, missed_frames: missed }]);
  assert.equal(result.maximum_wall_cycles, 24_515);
  assert.equal(result.missed_frames, 1);
  assert.equal(result.deadline_overruns, 1);
  assert.equal(result.passed, false);
  assert.equal(focusedPalAcceptance([frame]).passed, true);
});

test("focused PASS requires complete finite zero-error timing data", () => {
  for (const mutation of [{ wall_cycles: 32_569 }, { wall_cycles: 35_569 },
    { extra_vbi_boundaries: 1 }, { dli_sequence_violations: 1 },
    { missed_frames: undefined }, { wall_cycles: NaN }]) {
    assert.equal(focusedPalAcceptance([{ ...frame, ...mutation }]).passed, false);
  }
  assert.equal(focusedPalAcceptance([]).passed, false);
});
