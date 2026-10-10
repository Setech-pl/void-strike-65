// feat/boss-r1-tuning (owner smoke findings 2026-10-09, decisions 2026-10-10;
// docs/plans/boss-r1-tuning.md): region 1's boss has guns at its far ends so
// no reachable player position is out of every weapon's reach, its guns at
// half their durability (the emitter unchanged), a fight within the owner's
// rule by the aiming bot, and regions 2-4's loading screens show the hull's
// gun rows. RED on main dcc331a, GREEN after.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  bossPlaceholderDraft, bossRegionDirectory, compileBossRegion, loadBossPlaceholders, loadBossRegionDraft,
} from "../scripts/boss-assets.mjs";
import { coverageMap, PLAYER_POSITIONS, ranges } from "../scripts/boss-coverage.mjs";
import { SUMMARY_PICTURE_ROWS } from "../scripts/level-summary-assets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draft = loadBossRegionDraft(bossRegionDirectory(root, 1));
const region1 = compileBossRegion(draft);
const show = (xs) => ranges(xs).map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");

// Owner finding 1: on main the left edge (x 48-54) was out of every gun's
// reach once every weapon was exposed (MEASURED: a fighter parked at HPOS 48
// took 0 hits in 80 s of fight on every difficulty).
test("region 1: every reachable player x is under some weapon's fire with every weapon exposed", () => {
  const map = coverageMap(region1, draft.layout.motion, { state: "full" });
  assert.equal(map.positions.length, PLAYER_POSITIONS.length);
  assert.deepEqual(map.safe, [], `safe positions: ${show(map.safe)}`);
  // Both edges by a gun, not only by the laser.
  for (const x of [48, 200]) {
    const at = map.positions.find((position) => position.x === x);
    assert.ok(at.reach.some(({ name }) => !name.startsWith("emitter")), `x ${x} reached by no gun`);
  }
});

test("regions 2-4 (copies of region 1 with the finale): no safe position either", () => {
  const placeholders = loadBossPlaceholders(root);
  for (const region of ["2", "3", "4"]) {
    const copy = bossPlaceholderDraft(draft, placeholders[region]);
    const compiled = compileBossRegion(copy);
    const finale = (compiled.fire.finaleCooldown ?? 0) !== 0;
    for (const options of [{ finale: false }, { finale }]) {
      const map = coverageMap(compiled, copy.layout.motion, { state: "full", ...options });
      assert.deepEqual(map.safe, [], `region ${region}${options.finale ? " (finale)" : ""}: safe ${show(map.safe)}`);
    }
  }
});

// Owner finding 2: halve the guns' durability; the laser emitter keeps its own.
// main's values: every pulse gun 28, the emitter 20.
test("region 1: every gun at half main's durability (28 -> 14), the emitter unchanged at 20", () => {
  const guns = draft.layout.modules.filter((module) => module.kind === "pulse" || module.kind === "salvo");
  assert.ok(guns.length >= 6, `${guns.length} guns; the far-end pair is missing`);
  assert.deepEqual(guns.filter((gun) => gun.hp !== 14).map((gun) => `${gun.name}: ${gun.hp}`), []);
  const emitter = draft.layout.modules.find((module) => module.kind === "emitter");
  assert.equal(emitter.hp, 20);
});

test("region 1: a gun stands at each far end of the boss (left of column 16, right of column 48)", () => {
  const columns = region1.modules.filter((module) => module.kind === "pulse" || module.kind === "salvo")
    .map((module) => module.x + (module.width >> 1));
  assert.ok(Math.min(...columns) < 16, `the left-most gun is at column ${Math.min(...columns)}`);
  assert.ok(Math.max(...columns) > 48, `the right-most gun is at column ${Math.max(...columns)}`);
});

// Owner decision 2026-10-10: the fight's length is measured with the aiming bot
// in the boss sector, read as a ratio against main's plain-sweep replay. The
// anchors (MEASURED at main dcc331a, docs/plans/boss-r1-tuning.md §4.2): the
// plain sweep's fights 3,834 / 4,612 / 5,964 frames, the aiming bot's on the
// same layout 1,847 / 2,231 / 2,663 frames (EASY / MEDIUM / HARD). The rule:
// MEDIUM 90-120 s, EASY shorter, HARD not shorter.
const PLAIN_SWEEP_FRAMES = [3834, 4612, 5964];
const AIM_FRAMES_ON_MAIN = [1847, 2231, 2663];
test("the fight's length by the aiming bot keeps the owner's rule (MEDIUM 90-120 s, EASY shorter, HARD not shorter)", () => {
  const report = JSON.parse(fs.readFileSync(path.join(root, "docs", "runtime-wall-trace.json"), "utf8"));
  const sessions = report.coverage.director_level_complete.natural_difficulty_sessions;
  assert.deepEqual(sessions.map(({ boss_policy: policy }) => policy), ["boss-aim", "boss-aim", "boss-aim"],
    "the director-complete replays play the boss sector with the aiming bot");
  const seconds = sessions.map(({ difficulty, boss_fight_frames: frames }) =>
    (PLAIN_SWEEP_FRAMES[difficulty] * frames / AIM_FRAMES_ON_MAIN[difficulty]) / 50);
  const [easy, medium, hard] = seconds;
  const where = seconds.map((s) => s.toFixed(1)).join(" / ");
  assert.ok(medium >= 90 && medium <= 120, `MEDIUM ${medium.toFixed(1)} s (E / M / H ${where})`);
  assert.ok(easy < medium, `EASY ${easy.toFixed(1)} s is not shorter than MEDIUM (${where})`);
  assert.ok(hard >= medium, `HARD ${hard.toFixed(1)} s is shorter than MEDIUM (${where})`);
});

// STATUS backlog (S5-1 review): regions 2-4's loading screens showed hull rows
// without the gun emplacement (rows 8-10 of the 32-row hull maps).
test("the loading screen of every region shows the hull's gun rows 8-10", () => {
  const asset = JSON.parse(fs.readFileSync(path.join(root, "assets", "graphics", "level-summary.json"), "utf8"));
  for (const region of asset.regions) {
    const shown = Array.from({ length: SUMMARY_PICTURE_ROWS }, (_, i) => (region.segmentRow + i) % 32);
    for (const row of [8, 9, 10]) {
      assert.ok(shown.includes(row), `region ${region.region}: segmentRow ${region.segmentRow} hides row ${row}`);
    }
  }
});
