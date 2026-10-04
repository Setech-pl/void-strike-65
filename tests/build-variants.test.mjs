// T8 (docs/plans/director-4.6.md §9): the debug route of plan §7.
//
// `node scripts/build.mjs --level=N[:sector=M]` builds the campaign's level N,
// entered at its sector M, so the owner can reach a level or a sector the
// campaign does not offer yet. It is a REVIEW VARIANT in the exact shape of
// --hull-style, and the four properties that make it safe are what this test
// pins: EVERYTHING it generates goes to build/level-N-sM/, the default build's
// own build/ files are left byte-identical, dist/ is not touched, and the
// DEFAULT build is byte-identical with the flag machinery present.
//
// The second of those is new (owner decision, 2026-09-28). A variant used to
// write its artifacts into build/level-N-sM/ but its intermediates - the level
// images, the .inc files, the maps, build/manifest.json - straight into
// build/, on top of the default build's. This test's own variant build left
// build/level-1.bin carrying debug_start_sector = 2, and
// tests/level-compiler.test.mjs T2 ("the image carries the compiled core")
// then failed against it whenever the suite ran them in that order.
//
// The last of those is the one that matters most. The sector reader's level id
// is behind `.ifdef LEVEL_DEBUG_ID` and the Director's debug_start_sector read
// is behind `#ifdef LEVEL_DEBUG_START`, so the default build has no such code
// path at all - not a disabled one.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  compileLevelFile, levelSourcePath, CORE_DEBUG_START_SECTOR_OFFSET,
  LEVEL_CORE_OFFSET,
} from "../scripts/level-compiler.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readDist = (name) => fs.readFileSync(path.join(root, "dist", name));
const ARTIFACTS = ["void-strike-65.atr", "void-strike-65-boot.bin"];

// The default build's own files in build/, sampled where a variant would once
// have overwritten them: the level image the variant stamps, the linker map and
// label file every placement test reads, and the build manifest.
const SHARED_BUILD_FILES = [
  "level-1.bin", "void-strike-65.map", "void-strike-65.lbl", "manifest.json",
  "capital-hulls.inc", "level-def.inc", "entity-effects.inc",
];

test("T8: --level=1:sector=2 writes build/level-1-s2/ and never touches dist/", () => {
  const before = Object.fromEntries(ARTIFACTS.map((name) => [name, sha256(readDist(name))]));
  const sharedBefore = Object.fromEntries(SHARED_BUILD_FILES.map((name) =>
    [name, sha256(fs.readFileSync(path.join(root, "build", name)))]));
  const variantDirectory = path.join(root, "build", "level-1-s2");
  fs.rmSync(variantDirectory, { recursive: true, force: true });

  execFileSync(process.execPath, ["scripts/build.mjs", "--level=1:sector=2", "--quiet"],
    { cwd: root, stdio: "pipe" });

  for (const name of [...ARTIFACTS, "void-strike-65-manifest.json"]) {
    assert.ok(fs.existsSync(path.join(variantDirectory, name)),
      `the variant writes ${name} into build/level-1-s2/`);
  }
  for (const name of ARTIFACTS) {
    assert.equal(sha256(readDist(name)), before[name],
      `the review variant must not touch dist/${name}`);
  }
  // Owner decision 2026-09-28: not one byte of the default build's build/.
  for (const name of SHARED_BUILD_FILES) {
    assert.equal(sha256(fs.readFileSync(path.join(root, "build", name))), sharedBefore[name],
      `the review variant must not overwrite build/${name}`);
  }
  const manifest = JSON.parse(fs.readFileSync(
    path.join(variantDirectory, "void-strike-65-manifest.json"), "utf8"));
  assert.equal(manifest.buildVariant, "level-1-s2");
  assert.equal(manifest.runtimeEvidence, null, "no gate consults a review variant");

  // The sector to enter is stamped into the core page's own byte, in the
  // image the variant bakes - not into code. That image is the VARIANT's, in
  // the directory it owns; build/level-1.bin stays the shipped one.
  const image = fs.readFileSync(path.join(variantDirectory, "level-1.bin"));
  assert.equal(image[LEVEL_CORE_OFFSET + CORE_DEBUG_START_SECTOR_OFFSET], 2,
    "debug_start_sector is level data, stamped by the build");
  const shipped = fs.readFileSync(path.join(root, "build", "level-1.bin"));
  assert.equal(shipped[LEVEL_CORE_OFFSET + CORE_DEBUG_START_SECTOR_OFFSET], 0,
    "the default build's image never carries a debug entry sector");
  // ... and the authored file itself still says 0, so the shipped image does.
  assert.equal(compileLevelFile(levelSourcePath(1))
    .pages.core[CORE_DEBUG_START_SECTOR_OFFSET], 0);
});

test("T8: the default build has no debug code path, only an absent one", () => {
  const reader = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  assert.match(reader, /\.ifdef LEVEL_DEBUG_ID[\s\S]+lda #LEVEL_DEBUG_ID[\s\S]+\.else[\s\S]+lda #\$01[\s\S]+\.endif/,
    "the reader's level id is assembled one way or the other, never branched at runtime");
  const director = fs.readFileSync(path.join(root, "src/c/director.c"), "utf8");
  assert.match(director, /#ifdef LEVEL_DEBUG_START[\s\S]+CORE_DEBUG_START_SECTOR[\s\S]+#endif/,
    "the Director reads debug_start_sector only in a build made with the flag");
  const build = fs.readFileSync(path.join(root, "scripts/build.mjs"), "utf8");
  assert.match(build, /levelDebugId !== null/, "the flag makes it a review variant");
  assert.match(build, /LEVEL_DEBUG_ID=\$\{levelDebugId\}/);
  assert.match(build, /"-D", "LEVEL_DEBUG_START=1"/);
});

test("T8: a debug level or sector outside the campaign is refused by the build", () => {
  for (const [argument, message] of [
    ["--level=0", /outside 1\.\.16/],
    ["--level=17", /outside 1\.\.16/],
    // RE-PINNED 2026-10-04 (M5b-S3): level 1 has five sectors, the fifth its boss.
    ["--level=1:sector=9", /outside the level's 5 sectors/],
    ["--level=one", /the form is --level=N/],
  ]) {
    assert.throws(() => execFileSync(process.execPath,
      ["scripts/build.mjs", argument, "--quiet"], { cwd: root, stdio: "pipe" }),
    (error) => message.test(String(error.stderr ?? "") + String(error.stdout ?? "")),
    `${argument} must be refused`);
  }
});
