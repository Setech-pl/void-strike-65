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

// ---------------------------------------------------------------------------
// Owner decision 8 (plan §11 item 8, 2026-09-28, after hardware smoke): level
// 1's Raider and Bomber waves ALTERNATE across the whole level. The owner
// smoked the first step-2 authoring and found the opposite - Raiders after the
// capital and then consecutive Bomber waves to the end.
//
// The order is pinned three ways, because each says something the others do
// not: the AUTHORED order (what the page holds), the PLAYED order (what the
// Director's one-wave-at-a-time cursor, the sector cut and the ceilings
// actually admit) and the DENSITY (that alternating did not cost the level its
// pacing). The played order is read from `archetype`, which the probe takes
// from ENEMY_ARCHETYPE - the byte the formation was built with. The Director's
// published `archetypeOffset` is one wave ahead on the last formation of a
// wave whenever the next wave is armed in the same frame, which is a sampling
// artefact of the probe and not what the player sees.
// ---------------------------------------------------------------------------

// MEASURED on the build this test runs against, 9,000 frames, one fixed kill
// policy. Run-length encoded: "R6" is six consecutive Raider formations.
const PLAYED_ORDER = {
  0: "R4 B4 R6 B6 R6 B6 R4 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B4",
  1: "R4 B4 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R5",
  2: "R4 B4 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6 R6 B6",
};
// Heavy formations in 9,000 frames, against the pre-step-2 baseline at
// `28bd1e7` (the diagnostics file this test already reads).
const HEAVY_FORMATIONS = { 0: 100, 1: 109, 2: 116 };
// One WaveDef names one archetype and the core page holds twenty of them, so
// six is the floor a level of this density can reach: 116 formations over 20
// waves. Per-FORMATION alternation needs the "mixed wave" bit, which owner
// decision 8 puts in the backlog.
const LONGEST_RUN = 6;

function playedBlocks(run) {
  const blocks = [];
  for (const spawn of run.heavySpawns) {
    const last = blocks[blocks.length - 1];
    if (last !== undefined && last.archetype === spawn.archetype) last.length += 1;
    else blocks.push({ archetype: spawn.archetype, length: 1 });
  }
  return blocks;
}

const encode = (blocks) => blocks
  .map((block) => `${block.archetype === "raider" ? "R" : "B"}${block.length}`).join(" ");

test("owner decision 8: the twenty authored waves alternate Raider and Bomber, with no repeat",
  () => {
    const compiled = compileLevelFile(levelSourcePath(1));
    const heavy = compiled.waves.filter((wave) => wave.class === "heavy");
    assert.equal(heavy.length, compiled.waves.length, "level 1 authors Heavy waves only");
    assert.equal(heavy[0].archetype, "raider", "the level still opens on the Raider formation");
    assert.equal(heavy[0].escort, "wingman", "and it still has its Wingman escort");
    for (let index = 1; index < heavy.length; index += 1) {
      assert.notEqual(heavy[index].archetype, heavy[index - 1].archetype,
        `wave ${index} (${heavy[index].archetype}) repeats wave ${index - 1}; the ` +
        "alternation must hold across the sector boundary too");
    }
  });

for (const difficulty of [0, 1, 2]) {
  const name = ["EASY", "MEDIUM", "HARD"][difficulty];
  test(`owner decision 8: ${name} plays the alternating order, at the density it had`, () => {
    const run = captureTimeline({ buildDirectory, difficulty, frames: 9000 });
    const blocks = playedBlocks(run);
    for (let index = 1; index < blocks.length; index += 1) {
      assert.notEqual(blocks[index].archetype, blocks[index - 1].archetype,
        "run-length encoding cannot produce two adjacent blocks of one archetype");
    }
    const longest = blocks.reduce((worst, block) => Math.max(worst, block.length), 0);
    assert.ok(longest <= LONGEST_RUN,
      `longest run of one archetype is ${longest} formations, over the ${LONGEST_RUN} ` +
      "the twenty-wave page allows at this density");
    assert.equal(encode(blocks), PLAYED_ORDER[difficulty]);
    assert.equal(run.heavySpawns.length, HEAVY_FORMATIONS[difficulty]);
    // Against the pre-step-2 level, not against a target: EASY +1, MEDIUM
    // exact, HARD -6. HARD is the difficulty the twenty-wave page cannot fill.
    // Its row clock leaves room for about 122 formations and the page authors
    // 116, because a wave count is also the longest run of one archetype the
    // player sees: raising the counts to 7 would buy HARD its six formations
    // and cost every difficulty a run of seven. Owner decision 8 asks for the
    // alternation first.
    const before = baseline.runs.find((candidate) => candidate.difficulty === difficulty);
    assert.ok(Math.abs(run.heavySpawns.length - before.heavySpawns.length) <= 6,
      `${run.heavySpawns.length} Heavy formations against the pre-change ` +
      `${before.heavySpawns.length}`);
  });
}

test("owner decision 8: re-authoring the waves moved neither the capital nor the level's end",
  () => {
    // The sectors behind the capital were re-sized (1,448 + 1,448 -> 856 +
    // 2,040) so that the first of them is always exhausted before its row
    // clock cuts it. Their total is unchanged, and these are the four figures
    // that proves it on.
    // RE-POINTED 2026-10-04 (M5b-S3, plan §5.2): level 1's last sector is now
    // its boss, so the row clock no longer completes the level at row 3,712:
    // it ENTERS the boss sector there, on the very frame it used to complete,
    // and the entry follows once the playfield drains. Same frames, same row.
    for (const [difficulty, complete] of [[1, 8249], [2, 7424]]) {
      const run = captureTimeline({ buildDirectory, difficulty, frames: 9000 });
      assert.equal(run.completeFrame, null, "the level must not complete before its boss");
      assert.equal(run.bossSectorFrame?.frame, complete);
      assert.equal(run.bossSectorFrame?.row, 3712);
      assert.ok(run.bossEntryFrame?.frame >= complete, "the entry waits for the drain");
    }
    const medium = captureTimeline({ buildDirectory, difficulty: 1, frames: 700 });
    const entry = medium.sectorTransitions.find((transition) => transition.to === 0);
    assert.equal(entry.frame, 606);
    assert.equal(entry.row, AUTHORED_CAPITAL_ROW);
  });
