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
    // RE-PINNED (data/w2-lights): seven, the swarm and elite (a)/(b) added.
    ["--level=1:sector=9", /outside the level's 7 sectors/],
    ["--level=one", /the form is --level=N/],
  ]) {
    assert.throws(() => execFileSync(process.execPath,
      ["scripts/build.mjs", argument, "--quiet"], { cwd: root, stdio: "pipe" }),
    (error) => message.test(String(error.stderr ?? "") + String(error.stdout ?? "")),
    `${argument} must be refused`);
  }
});

// M5b-S4b (owner decision Q10, 2026-10-06): the laser fixture's debug-only
// tier override. --laser-fixture=N installs the fixture region and assembles
// slot D's laser_tier with BOSS_LASER_TIER_OVERRIDE; the default build has no
// such path (an .ifdef, not a disabled branch), so the default ATR's bytes are
// those of a build that never heard of the flag: dist/ and the default build's
// own files are left byte-identical by the variant build, and the default
// slot D's tier follows the level id while the variant's is fixed.
// RE-POINTED (data/w2-lights): level 1's boss sector is sector 6 now (a swarm
// and elite (a)/(b) joined after the capital), so the fixture's boss route is
// --level=1:sector=6.
test("S4b: --laser-fixture=4 --level=1:sector=6 writes its own directory, never touches dist/ or the default build", async () => {
  const before = Object.fromEntries(ARTIFACTS.map((name) => [name, sha256(readDist(name))]));
  const shared = [...SHARED_BUILD_FILES, "boss.bin", "boss.lbl", "overlay-boss-slot-d.bin"];
  const sharedBefore = Object.fromEntries(shared.map((name) =>
    [name, sha256(fs.readFileSync(path.join(root, "build", name)))]));
  const variant = "laser-fixture-4-level-1-s6";
  const variantDirectory = path.join(root, "build", variant);
  fs.rmSync(variantDirectory, { recursive: true, force: true });
  execFileSync(process.execPath, ["scripts/build.mjs", "--laser-fixture=4", "--level=1:sector=6", "--quiet"],
    { cwd: root, stdio: "pipe" });
  for (const name of ARTIFACTS) {
    assert.equal(sha256(readDist(name)), before[name], `the fixture build must not touch dist/${name}`);
  }
  for (const name of shared) {
    assert.equal(sha256(fs.readFileSync(path.join(root, "build", name))), sharedBefore[name],
      `the fixture build must not overwrite build/${name}`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(variantDirectory, "void-strike-65-manifest.json"), "utf8"));
  assert.equal(manifest.buildVariant, variant);
  assert.equal(manifest.runtimeEvidence, null, "no gate consults a review variant");
  const defaultManifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
  assert.equal(defaultManifest.boss.laserFixtureTier, null, "the default build carries no fixture");
  const { Nmos6502 } = await import("../scripts/nmos6502.mjs");
  const tierOf = (directory, level) => {
    const labels = new Map(fs.readFileSync(path.join(directory, "boss.lbl"), "utf8").split("\n")
      .map((line) => /^al\s+([0-9a-f]+)\s+\.?(\S+)$/i.exec(line.trim())).filter(Boolean)
      .map((m) => [m[2], Number.parseInt(m[1], 16)]));
    const memory = new Uint8Array(0x10000);
    memory.set(fs.readFileSync(path.join(directory, "overlay-boss-slot-d.bin")), 0x1900);
    memory[0xa603] = level;
    const cpu = new Nmos6502(memory);
    cpu.push(0xff); cpu.push(0xfe);
    cpu.pc = labels.get("laser_tier");
    for (let steps = 0; cpu.pc !== 0xffff && steps < 1000; steps += 1) cpu.step();
    return memory[labels.get("boss_laser_slots")];
  };
  for (const [level, slots] of [[1, 1], [5, 2], [9, 4]]) {
    assert.equal(tierOf(path.join(root, "build"), level), slots, `default build, level ${level}`);
    assert.equal(tierOf(variantDirectory, level), 4, `fixture build, level ${level}`);
  }
  const source = fs.readFileSync(path.join(root, "src/hybrid/boss.s"), "utf8");
  assert.match(source, /\.ifdef BOSS_LASER_TIER_OVERRIDE[\s\S]+lda #BOSS_LASER_TIER_OVERRIDE[\s\S]+\.else[\s\S]+lda LEVEL_ID[\s\S]+\.endif/,
    "the tier is assembled one way or the other, never branched at runtime");
  assert.throws(() => execFileSync(process.execPath, ["scripts/build.mjs", "--laser-fixture=3", "--quiet"],
    { cwd: root, stdio: "pipe" }), (error) => /the tiers are 2 and 4/.test(String(error.stderr ?? "")));
});
