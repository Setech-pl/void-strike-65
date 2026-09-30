// Roadmap 4.6 step 3 (docs/plans/director-4.6.md §8): the authored level 2,
// reached through the debug route of plan §7.
//
// Level 2 is NOT in the default build or the default replays - the default
// artifacts carry level 1 only (plan §8 step 3, owner decision 2026-09-30,
// plan §11 item 16). The only way onto it before the campaign exists is
// `node scripts/build.mjs --level=2[:sector=M]`, so this file pins exactly that
// route:
//
//   * the build succeeds. Before step 3 it threw
//       TypeError: Cannot read properties of undefined (reading 'subarray')
//     because scripts/build.mjs keyed the level images by the run's id but
//     read them back with a hard-coded 1 (owner decision 2026-09-30, plan §11
//     item 17: each run uses its own id);
//   * what it bakes is level 2's image, and it fits the 16-sector buffer;
//   * the Director reads that image: six sectors, the capital on the authored
//     row, three Lights in a swarm sector, the level completing after sector 6;
//   * the route enters each of level 2's six sectors;
//   * dist/ and the default build's own build/ files are not touched.
//
// Every build here is a review variant into its own build/level-2-sM/, so the
// file cannot race tests/build-variants.test.mjs, which builds level-1-s2.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parseAtr } from "../scripts/formats.mjs";
import {
  CORE_DEBUG_START_SECTOR_OFFSET, LEVEL_CORE_BYTES,
  LEVEL_CORE_MAGIC, LEVEL_CORE_OFFSET, LEVEL_IMAGE_SECTORS, compileLevelFile,
  levelSourcePath,
} from "../scripts/level-compiler.mjs";
import { captureTimeline } from "../scripts/level-timeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const ARTIFACTS = ["void-strike-65.atr", "void-strike-65-boot.bin"];
const SHARED_BUILD_FILES = [
  "level-1.bin", "level-core.bin", "void-strike-65.map", "void-strike-65.lbl",
  "manifest.json", "sector-reader.bin",
];
const SECTOR_FIGHTER = 7;
const LEVEL_TWO_SECTORS = 6;
const CAPITAL_SECTOR = 2;
const SWARM_SECTORS = [0, 3];
// World rows per active gameplay frame: WORLD_SCROLL_RATE_{EASY,MEDIUM,HARD}
// 8/9/10 over 20 (build/capital-hulls.inc).
const FRAMES_TO_COMPLETE = 13_000;

const variantDirectory = (sector) => path.join(root, "build", `level-2-s${sector}`);

function buildVariant(sector) {
  const directory = variantDirectory(sector);
  fs.rmSync(directory, { recursive: true, force: true });
  execFileSync(process.execPath,
    ["scripts/build.mjs", sector === 0 ? "--level=2" : `--level=2:sector=${sector}`, "--quiet"],
    { cwd: root, stdio: "pipe" });
  return directory;
}

const compiled = compileLevelFile(levelSourcePath(2));

test("step 3: --level=2 builds level 2 into build/level-2-s0/ and never touches dist/", () => {
  const distBefore = Object.fromEntries(ARTIFACTS.map((name) =>
    [name, sha256(fs.readFileSync(path.join(root, "dist", name)))]));
  const sharedBefore = Object.fromEntries(SHARED_BUILD_FILES.map((name) =>
    [name, sha256(fs.readFileSync(path.join(root, "build", name)))]));

  // RED before step 3: the build threw here.
  const directory = buildVariant(0);

  for (const name of ARTIFACTS) {
    assert.equal(sha256(fs.readFileSync(path.join(root, "dist", name))), distBefore[name],
      `the review variant must not touch dist/${name}`);
    assert.ok(fs.existsSync(path.join(directory, name)), `the variant writes ${name}`);
  }
  for (const name of SHARED_BUILD_FILES) {
    assert.equal(sha256(fs.readFileSync(path.join(root, "build", name))), sharedBefore[name],
      `the review variant must not overwrite build/${name}`);
  }

  const manifest = JSON.parse(fs.readFileSync(
    path.join(directory, "void-strike-65-manifest.json"), "utf8"));
  assert.equal(manifest.buildVariant, "level-2-s0");
  assert.equal(manifest.runtimeEvidence, null, "no gate consults a review variant");
  const [run, ...others] = manifest.sectorReader.levels;
  assert.equal(others.length, 0, "the route bakes one level, where level 1's would go");
  assert.equal(run.id, 2);
  assert.equal(run.file, "level-2.bin");

  // The image is level 2's, and it fits the level buffer (plan §3.1: 16).
  const image = fs.readFileSync(path.join(directory, "level-2.bin"));
  assert.equal(image.length, LEVEL_IMAGE_SECTORS * 128);
  assert.ok(LEVEL_IMAGE_SECTORS <= manifest.sectorReader.levelBuffer.sectors,
    `${LEVEL_IMAGE_SECTORS} sectors of a ${manifest.sectorReader.levelBuffer.sectors}-sector buffer`);
  assert.equal(image[3], 2, "the image header's level id");
  const core = image.subarray(LEVEL_CORE_OFFSET, LEVEL_CORE_OFFSET + LEVEL_CORE_BYTES);
  assert.equal(core[0], LEVEL_CORE_MAGIC);
  assert.equal(core[1], 2, "level_number");
  assert.equal(core[2], LEVEL_TWO_SECTORS, "sector_count");
  assert.deepEqual([...core], [...compiled.pages.core],
    "the core page is the compiled level-02.json, debug byte 0 and all");
  // The harnesses install the core page from the variant's own directory.
  assert.deepEqual([...fs.readFileSync(path.join(directory, "level-core.bin"))], [...core]);

  // Region R1 by level number: enemy hull style R1, allied steel $88.
  assert.equal(manifest.capitalHulls.levelBlock.styleId, 1);
  assert.equal(manifest.capitalHulls.levelBlock.alliedColpf1, 0x88);

  // The ATR carries it as its level run, which the sector reader reads at
  // START GAME.
  const { body } = parseAtr(fs.readFileSync(path.join(directory, "void-strike-65.atr")));
  const offset = (run.startSector - 1) * 128;
  assert.deepEqual(body.subarray(offset, offset + image.length), image);
});

test("step 3: the Director reads level 2 - six sectors, the capital on row 1,120, " +
  "three Lights in a swarm sector, complete after sector 6", () => {
  const directory = variantDirectory(0);
  assert.ok(fs.existsSync(path.join(directory, "manifest.json")),
    "the --level=2 build of the test above");
  const rows = compiled.sectors.map((sector) => sector.rows);
  for (const difficulty of [0, 1, 2]) {
    const run = captureTimeline({ buildDirectory: directory, difficulty,
      frames: FRAMES_TO_COMPLETE });
    const label = ["EASY", "MEDIUM", "HARD"][difficulty];
    assert.deepEqual(run.directorSectors.map((entry) => entry.sector), [0, 1, 2, 3, 4, 5],
      `${label}: every sector entered once, in order`);
    // The capital sector opens on the authored row, whatever the difficulty:
    // the row is the clock, so the FRAME is what moves.
    const capital = run.directorSectors[CAPITAL_SECTOR];
    assert.equal(capital.row, rows[0] + rows[1], `${label}: the capital's authored row`);
    assert.equal(capital.row, 1120);
    assert.ok(run.completeFrame !== null, `${label}: the level completes`);
    assert.equal(run.directorSectors.at(-1).sector, LEVEL_TWO_SECTORS - 1);
    assert.ok(run.completeFrame.row > run.directorSectors.at(-1).row);

    // Sector of an event = the last sector entered at or before its frame.
    const sectorAt = (frame) => run.directorSectors.filter((entry) =>
      entry.frame <= frame).at(-1).sector;
    for (const spawn of run.heavySpawns) {
      assert.ok(!SWARM_SECTORS.includes(sectorAt(spawn.frame)),
        `${label}: a Heavy formation in swarm sector ${sectorAt(spawn.frame) + 1}`);
    }
    // Live Lights, counted by the probe every frame from light_state: a swarm
    // sector reaches its ceiling of three and never passes it, and an elite
    // sector never passes its one.
    for (const index of SWARM_SECTORS) {
      assert.equal(run.peakLiveLights[index], 3,
        `${label}: sector ${index + 1} reaches its Light ceiling of 3`);
    }
    for (const index of [1, 4, 5]) {
      assert.ok(run.peakLiveLights[index] <= 1,
        `${label}: elite sector ${index + 1} holds ${run.peakLiveLights[index]} Lights`);
    }
    // Sector 2 is the bomber line: every formation it admits is a Bomber.
    const sectorTwo = run.heavySpawns.filter((spawn) => sectorAt(spawn.frame) === 1);
    assert.ok(sectorTwo.length > 0);
    assert.deepEqual([...new Set(sectorTwo.map((spawn) => spawn.archetype))], ["bomber"],
      `${label}: sector 2 admits Bombers only`);
  }
});

test("step 3: --level=2:sector=M enters each of level 2's six sectors", () => {
  for (let sector = 0; sector < LEVEL_TWO_SECTORS; sector += 1) {
    const directory = sector === 0 ? variantDirectory(0) : buildVariant(sector);
    const image = fs.readFileSync(path.join(directory, "level-2.bin"));
    assert.equal(image[LEVEL_CORE_OFFSET + CORE_DEBUG_START_SECTOR_OFFSET], sector,
      `build/level-2-s${sector}/ stamps debug_start_sector = ${sector}`);
    const run = captureTimeline({ buildDirectory: directory, difficulty: 1, frames: 400 });
    assert.equal(run.directorSectors[0].sector, sector,
      `the Director enters sector ${sector + 1} at level start`);
    assert.equal(run.directorSectors[0].row, 0, "with the row clock at the sector's own start");
    if (sector === CAPITAL_SECTOR) {
      assert.ok(run.sectorTransitions.some((transition) => transition.from === SECTOR_FIGHTER),
        "entered at the capital, the capital begins");
    }
  }
  assert.throws(() => execFileSync(process.execPath,
    ["scripts/build.mjs", `--level=2:sector=${LEVEL_TWO_SECTORS}`, "--quiet"],
    { cwd: root, stdio: "pipe" }),
  (error) => /outside the level's 6 sectors/.test(String(error.stderr ?? "")),
  "a sector past level 2's sixth is refused");
});

test("step 3: plan §7's npm script level:play is the debug route", () => {
  // `npm run level:play -- --level=2:sector=3` - the arguments after `--` are
  // the route's own. Without them it is the default build, byte for byte.
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["level:play"], "node scripts/build.mjs");
});
