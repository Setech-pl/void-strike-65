// T4 (docs/plans/director-4.6.md §9): roadmap 4.6 step 2's reproduction gate,
// as a test rather than as a session note.
//
// The plan's wording is "the compiled level 1 makes the same Director
// decisions row for row as LEVEL1_DATA". LEVEL1_DATA is what step 2 retires,
// so there is nothing left to compare against inside the build; what the
// comparison runs against instead is the MEASUREMENT taken from the build at
// `28bd1e7` before anything changed, recorded in
// docs/diagnostics/level-1-baseline-timeline-probe.json and its native
// counterpart. That file is the pre-change level 1, and this test is the
// statement that the authored one still plays it.
//
// The probe (scripts/level-timeline.mjs) drives the real runtime image through
// a reduced main loop with one fixed kill policy. It is bounded here to the
// frames the gate actually turns on - the run to the capital - because the
// full three-difficulty sweep is minutes of simulated 6502 and belongs in a
// session's own evidence, not in every suite run.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { captureTimeline } from "../scripts/level-timeline.mjs";
import { compileLevelFile, levelSourcePath } from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = JSON.parse(fs.readFileSync(
  path.join(root, "docs/diagnostics/level-1-baseline-timeline-probe.json"), "utf8"));
const buildDirectory = path.join(root, "build");

// Owner decision 3 (plan §11 item 3): level 1's capital starts on an authored
// ROW instead of active gameplay frame 600. The row is the MEDIUM row reached
// at that frame - 600 * 9/20 = 270 - rounded up to the 8-row module grid the
// format counts in.
const AUTHORED_CAPITAL_ROW = 272;
// The tolerance the plan's departure allows the row measurement: one module.
const CAPITAL_ROW_TOLERANCE = 8;

test("T4: level 1's capital arrives on the authored row, and the row is the one step 2 measured",
  () => {
    const compiled = compileLevelFile(levelSourcePath(1));
    assert.equal(compiled.sectors[0].kindName, "space");
    assert.equal(compiled.sectors[1].kindName, "capital");
    assert.equal(compiled.sectors[0].rows, AUTHORED_CAPITAL_ROW,
      "the first sector ends where the capital used to become due");
    const measuredRow = Math.floor(600 * 9 / 20);
    assert.ok(Math.abs(compiled.sectors[0].rows - measuredRow) <= CAPITAL_ROW_TOLERANCE,
      `the authored row ${compiled.sectors[0].rows} is within one module of the measured ` +
      `${measuredRow}`);
  });

test("T4: the capital admits on the authored row and within one module of where it used to",
  () => {
    const run = captureTimeline({ buildDirectory, difficulty: 1, frames: 700 });
    const entry = run.sectorTransitions.find((transition) => transition.to === 0);
    assert.ok(entry, "the MEDIUM replay reaches the capital inside 700 frames");
    assert.equal(entry.row, AUTHORED_CAPITAL_ROW,
      "the capital admits on the authored row, not on a frame count");
    const before = baseline.runs.find((candidate) => candidate.difficulty === 1)
      .sectorTransitions.find((transition) => transition.to === 0);
    assert.ok(Math.abs(entry.row - before.row) <= CAPITAL_ROW_TOLERANCE,
      `capital row ${entry.row} against the pre-change ${before.row}`);
    assert.ok(Math.abs(entry.frame - before.frame) <= 16,
      `capital frame ${entry.frame} against the pre-change ${before.frame}`);
  });

test("T4: the Heavy stream keeps the cadence and the density it had before the level was data",
  () => {
    const run = captureTimeline({ buildDirectory, difficulty: 1, frames: 700 });
    const before = baseline.runs.find((candidate) => candidate.difficulty === 1);
    const cutoff = (list) => list.filter((spawn) => spawn.frame <= 700);
    const now = run.heavySpawns;
    const then = cutoff(before.heavySpawns);
    assert.ok(Math.abs(now.length - then.length) <= 2,
      `${now.length} Heavy formations in 700 frames against the pre-change ${then.length}`);
    // Frame for frame, not merely in total: the kernel's retry cadence is what
    // paces the stream, and the authored spacing is at the class floor so that
    // it still is.
    for (let index = 0; index < Math.min(now.length, then.length); index += 1) {
      assert.ok(Math.abs(now[index].frame - then[index].frame) <= 8,
        `formation ${index} at frame ${now[index].frame}, was ${then[index].frame}`);
    }
    // Every formation is one of the two Heavy records, admitted at the
    // formation start position the renderer owns.
    for (const spawn of now) {
      assert.ok([0, 36].includes(spawn.archetypeOffset), "Raider or Bomber, nothing else");
      assert.deepEqual(spawn.members.map((member) => member.state), [1, 1]);
      assert.deepEqual(spawn.members.map((member) => member.x),
        spawn.archetypeOffset === 0 ? [88, 152] : [48, 176]);
    }
  });
