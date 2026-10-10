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

// RE-POINTED (feat/sector-flow; owner decision 3 amended 2026-10-08,
// director-4.6.md §11 item 3): the authored capital row is a MAXIMUM now. A
// space sector ends as soon as its waves are spent and the field is clear, so
// under the probe's kill policy (every Heavy killed as it clears the top edge)
// sector 0 spends its eight formations and the capital comes early: MEASURED
// row 214 on MEDIUM, against 272. What the test still states: never later than
// the authored row, never before all eight pre-capital formations have been
// admitted, and the pre-change row it replaced stays the no-kill cut.
test("T4: the capital admits no later than the authored row, and early only once sector 0 is spent",
  () => {
    const run = captureTimeline({ buildDirectory, difficulty: 1, frames: 700 });
    const entry = run.sectorTransitions.find((transition) => transition.to === 0);
    assert.ok(entry, "the MEDIUM replay reaches the capital inside 700 frames");
    assert.ok(entry.row <= AUTHORED_CAPITAL_ROW,
      `the capital admits on row ${entry.row}, after the authored maximum ${AUTHORED_CAPITAL_ROW}`);
    assert.equal(run.heavySpawns.filter((spawn) => spawn.frame <= entry.frame).length, 8,
      "the capital came before sector 0's eight formations were spent");
    assert.equal(entry.row, 214, "the MEASURED early capital row");
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
// RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision W1): after the capital
// level 1 plays one Raider + Wingman wave and one Bomber wave, then the boss,
// so the 9,000 frames hold four blocks - still alternating - and the boss
// sector's frames add no Heavy formation.
// RE-PINNED (fix/smoke-2026-10-07 P2, owner decision of 2026-10-08): after
// the capital one Raider wave of ONE formation and one Bomber pair, each
// reading as one wave (the two Light waves before them are not Heavy
// formations), so the post-capital blocks are R1 B1 on every difficulty -
// still alternating; the four blocks before the capital are unchanged.
// RE-PINNED (data/w2-lights, owner answers of 2026-10-08, docs/plans/
// w2-lights.md §8.1): after the capital variant (a)'s Raider pair, P2's Bomber
// pair and variant (b)'s Raider pair, one formation each - R1 B1 R1, still
// alternating (the Bomber sits between the Raider variants for exactly that);
// the swarm before them is Light only; the four blocks before the capital are
// unchanged. MEASURED as above.
const PLAYED_ORDER = {
  0: "R4 B4 R1 B1 R1",
  1: "R4 B4 R1 B1 R1",
  2: "R4 B4 R1 B1 R1",
};
// Heavy formations in 9,000 frames (W2, measured as above).
const HEAVY_FORMATIONS = { 0: 11, 1: 11, 2: 11 };
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

test("owner decision 8: the authored waves alternate Raider and Bomber, with no repeat",
  () => {
    const compiled = compileLevelFile(levelSourcePath(1));
    const heavy = compiled.waves.filter((wave) => wave.class === "heavy");
    // RE-POINTED (fix/smoke-2026-10-07 P2): level 1 now authors two Light
    // waves after the capital (one Interceptor, one Wingman); the alternation
    // is a rule of its Heavy waves, which it still checks on all of them.
    // RE-POINTED (data/w2-lights): the two Light waves are the swarm's, the
    // Wingman column then the Interceptors (docs/plans/w2-lights.md §4.1).
    assert.deepEqual(compiled.waves.filter((wave) => wave.class === "light").map((wave) => wave.archetype),
      // RE-POINTED (feat/sector-flow, owner answer of 2026-10-08): the swarm
      // chains a plain Wingman column after the Interceptors.
      // RE-POINTED (feat/boss-r1-tuning, owner decision 2026-10-10, variant B):
      // the boss sector's Interceptor escort follows them.
      ["wingman", "interceptor", "wingman", "interceptor"],
      "level 1's Light waves are the swarm's three and the boss sector's escort");
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
    // RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision W1): the density
    // against the pre-step-2 level (within 6 of 100 / 109 / 116 formations)
    // is retired. W1 removes the post-capital waves on purpose; the density up
    // to the capital is still pinned against that baseline, frame for frame,
    // by the T4 Heavy-stream test above.
  });
}

test("owner decision 8 / W1: re-authoring the waves left the capital where it was; W1 moved the level's end",
  () => {
    // The sectors behind the capital were re-sized (1,448 + 1,448 -> 856 +
    // 2,040) so that the first of them is always exhausted before its row
    // clock cuts it. Their total is unchanged, and these are the four figures
    // that proves it on.
    // RE-POINTED 2026-10-04 (M5b-S3, plan §5.2): level 1's last sector is now
    // its boss, so the row clock no longer completes the level at row 3,712:
    // it ENTERS the boss sector there, on the very frame it used to complete,
    // and the entry follows once the playfield drains. Same frames, same row.
    // RE-POINTED 2026-10-07 (M5b-S4b.4, owner decision W1): W1 moves the
    // level's end on purpose - the post-capital sectors are 144 + 312 rows -
    // so the boss sector is entered at row 1,272, on the frames MEASURED here;
    // the capital (below) is unchanged.
    // RE-POINTED (data/w2-lights, owner answer Q4 and the reorder of
    // 2026-10-08): the post-capital sectors are 280 + 120 + 224 + 240 rows, so
    // the boss sector is entered at row 1,680 (408 rows later), on the frames
    // MEASURED here; the capital (below) is unchanged.
    // RE-POINTED (feat/sector-flow, docs/plans/sector-flow.md; owner Q10 and
    // decision 3 amended, 2026-10-08): every space sector ends as soon as its
    // waves are spent and the field is clear, so under the probe's kill policy
    // the boss sector is entered far earlier and on a row that depends on the
    // difficulty - MEASURED here (main: frames 3,734 / 3,360, row 1,680) - and
    // the capital comes early too (MEDIUM frame 477, row 214; main 606, 272).
    for (const [difficulty, complete, row] of [[1, 2283, 1027], [2, 2034, 1017]]) {
      const run = captureTimeline({ buildDirectory, difficulty, frames: 9000 });
      assert.equal(run.completeFrame, null, "the level must not complete before its boss");
      assert.equal(run.bossSectorFrame?.frame, complete);
      assert.equal(run.bossSectorFrame?.row, row);
      assert.ok(run.bossEntryFrame?.frame >= complete, "the entry waits for the drain");
    }
    const medium = captureTimeline({ buildDirectory, difficulty: 1, frames: 700 });
    const entry = medium.sectorTransitions.find((transition) => transition.to === 0);
    assert.equal(entry.frame, 477);
    assert.ok(entry.row <= AUTHORED_CAPITAL_ROW, "the authored row is the capital's maximum");
  });
