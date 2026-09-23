// Capital hull set v1, step 2 — the per-level hull style.
//
// Step 1 compiled four enemy styles and emitted four 280-byte blocks as build
// artifacts; the resident image still carried R1. Step 2 makes the style and
// the allied steel LEVEL DATA: the region's block travels in the level image
// (sectors 6-8), and one routine publishes it into the gameplay charset, the
// enemy collision boundaries and the gameplay DLI's own immediate operand at
// gameplay start, on the loader screen, outside every visible-frame budget.
//
// Owner decisions of 2026-09-22/23 are docs/plans/hull-set-v1.md §13.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "../scripts/capital-hulls.mjs";
import { initialiseRuntime, requiredLabel, runRoutine } from "../scripts/weapon-pickup-runtime.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const buildSource = fs.readFileSync(path.join(rootDirectory, "scripts", "build.mjs"), "utf8");
const mainSource = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const readerSource = fs.readFileSync(
  path.join(rootDirectory, "src", "hybrid", "sector-reader.s"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(
  path.join(rootDirectory, "package.json"), "utf8"));
const draft = JSON.parse(fs.readFileSync(path.join(
  rootDirectory, "assets", "graphics", "hull-drafts", "hull-set-v2.json"), "utf8"));
const definition = loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"));
const asset = compileCapitalHulls(definition);

const levelOne = manifest.sectorReader.levels.find((level) => level.id === 1);
const levelImage = fs.readFileSync(path.join(rootDirectory, "build", levelOne.file));
const block = manifest.capitalHulls.levelBlock;

const LEVEL_BUFFER = 0xa600;
const CHARSET = 0x4400;
const ENEMY_SURFACE_BASE = 70;
const ENEMY_SURFACE_CODES = 7;
const SEGMENT_ROWS = 32;
const SURFACE_CODE_BUDGET = 14;
const BLOCK_BYTES = 280;
// The two halves of decision 2. $84 is provisional: the owner picks the final
// darker step ($84 or $86) at this step's smoke.
const FIRST_HALF_COLPF1 = 0x88;
const SECOND_HALF_COLPF1 = 0x84;

// The campaign length is not a constant of this test: it is read from the two
// places the repository defines it, which must agree (decision 1).
function campaignLength() {
  const fromBuild = /const LEVEL_MAX_ID = (\d+);/.exec(buildSource);
  const fromReader = /^LEVEL_MAX_ID\s+= (\d+)$/m.exec(readerSource);
  assert.ok(fromBuild && fromReader, "LEVEL_MAX_ID is missing from build.mjs or sector-reader.s");
  assert.equal(fromBuild[1], fromReader[1],
    "the build and the reader disagree about the campaign length");
  return Number(fromBuild[1]);
}

function expectedStyleId(level, levels) {
  return Math.min(4, 1 + Math.floor(((level - 1) * 4) / levels));
}

function blockOf(styleName) {
  return fs.readFileSync(path.join(rootDirectory, "build", `hull-style-${styleName}.bin`));
}

test("the level-1 image carries its region's hull block behind the music, and byte 7 says 9", () => {
  assert.equal(block.blockBytes, BLOCK_BYTES);
  assert.equal(block.blockAddress, LEVEL_BUFFER + block.imageOffset);
  assert.equal(block.blockSectors, 3);
  assert.equal(block.imageOffset,
    manifest.gameplayMusic.placement.blockSectors * 128,
    "the hull block does not start at sector 6 of the image");
  // Header byte 4 is the sector count, byte 7 the first LevelDef sector: music
  // (5) + hull (3) + 1.
  assert.equal(levelImage[4], levelOne.sectors);
  assert.equal(levelImage[7], manifest.gameplayMusic.placement.blockSectors +
    block.blockSectors + 1);
  assert.equal(levelImage[7], 9);
  const inImage = levelImage.subarray(block.imageOffset, block.imageOffset + BLOCK_BYTES);
  assert.equal(inImage[0], 1, "level 1 lies in region one, so its block is style R1");
  assert.equal(inImage[1], 1, "hull block format version");
  assert.deepEqual(Buffer.from(inImage.subarray(3, 16)), Buffer.alloc(13),
    "the block's reserved bytes stay zero");
});

test("the region mapping divides the campaign into four equal quarters", () => {
  const levels = campaignLength();
  assert.equal(manifest.capitalHulls.levelStyles.length, levels);
  for (const entry of manifest.capitalHulls.levelStyles) {
    assert.equal(entry.styleId, expectedStyleId(entry.level, levels),
      `level ${entry.level} is in the wrong region`);
    assert.equal(entry.styleName, `R${entry.styleId}`);
  }
  // At LEVEL_MAX_ID = 16 that is the owner's 1-4 / 5-8 / 9-12 / 13-16.
  if (levels === 16) {
    assert.deepEqual(manifest.capitalHulls.levelStyles.map(({ styleId }) => styleId),
      [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4]);
  }
  // Nothing in the runtime selects a style: the build stamps the block.
  assert.ok(!mainSource.includes("hull_style_for_level"),
    "the style selector is build-time data, not a runtime table");
});

test("the allied steel is one level byte: $88 in the first half, $84 in the second", () => {
  const levels = campaignLength();
  for (const entry of manifest.capitalHulls.levelStyles) {
    const expected = entry.level * 2 <= levels ? FIRST_HALF_COLPF1 : SECOND_HALF_COLPF1;
    assert.equal(entry.alliedColpf1, expected,
      `level ${entry.level} carries the wrong allied steel`);
  }
  // The release default is the brighter steel the owner chose at the step-1
  // smoke; the assembled constant is only the pre-publication value now.
  assert.match(mainSource, /GAMEPLAY_COLPF1 = \$88/);
  const inImage = levelImage[block.imageOffset + 2];
  assert.equal(inImage, FIRST_HALF_COLPF1, "level 1 is in the first half");
});

// A draft glyph is four pixels of two bits per row; the enemy side is the
// horizontal mirror of the authored row. This is the whole encoding, so the
// test compares the shipped block against the reviewed art itself.
function draftGlyphBytes(rows) {
  return rows.map((row) => {
    const values = [...row].map(Number).reverse();
    return values.reduce((byte, value, index) => byte | (value << (6 - index * 2)), 0);
  });
}

const DRAFT_REGIONS = new Map([
  ["R1", "R1-slab"], ["R2", "R2-rib-launchers"],
  ["R3", "R3-heavy-plates"], ["R4", "R4-armour"],
]);

test("each region's block carries exactly the seven enemy glyphs of hull-set-v2.json", () => {
  for (const levelSet of asset.levelHullSets) {
    const bytes = blockOf(levelSet.styleName);
    assert.equal(bytes.length, BLOCK_BYTES);
    assert.equal(bytes[0], levelSet.styleId);
    const compiled = levelSet.glyphs.filter((glyph) =>
      glyph.index >= ENEMY_SURFACE_BASE &&
      glyph.index < ENEMY_SURFACE_BASE + ENEMY_SURFACE_CODES);
    assert.equal(compiled.length, ENEMY_SURFACE_CODES);
    assert.deepEqual(
      Buffer.from(bytes.subarray(192, 192 + ENEMY_SURFACE_CODES * 8)),
      Buffer.from(compiled.flatMap((glyph) => Object.values(glyph.bytes))),
      `${levelSet.styleName}: the block's glyph bytes are not the compiled style`);

    // …and the compiled style is the reviewed draft, mirrored.
    const region = draft.enemyRegions[DRAFT_REGIONS.get(levelSet.styleName)];
    assert.ok(region, `hull-set-v2.json has no region ${levelSet.styleName}`);
    const drafted = Object.values(region.glyphs).map(draftGlyphBytes);
    assert.equal(drafted.length, region.surfaceCodes,
      `${levelSet.styleName}: the draft declares a different surface count`);
    assert.ok(drafted.length <= ENEMY_SURFACE_CODES);
    const asHex = (glyph) => Buffer.from(glyph).toString("hex");
    const shipped = Array.from({ length: ENEMY_SURFACE_CODES }, (unused, slot) =>
      asHex(bytes.subarray(192 + slot * 8, 192 + slot * 8 + 8)));
    // A style that draws fewer than seven surfaces leaves its spare per-level
    // slots blank (R1 and R3 draw six).
    const blank = "0".repeat(16);
    assert.deepEqual(shipped.slice().sort(),
      [...drafted.map(asHex),
        ...Array(ENEMY_SURFACE_CODES - drafted.length).fill(blank)].sort(),
      `${levelSet.styleName}: the block's glyphs are not the draft's, mirrored`);

    assert.deepEqual(
      Buffer.from(bytes.subarray(248, 248 + SEGMENT_ROWS)),
      Buffer.from(levelSet.collisionBoundaries.get("enemy")),
      `${levelSet.styleName}: the block's collision boundaries are not the compiled ones`);
  }
});

test("every region still fits the 14 surface codes of one level hull set", () => {
  for (const levelSet of asset.levelHullSets) {
    const surfaces = levelSet.glyphs.filter((glyph) =>
      (glyph.index >= 59 && glyph.index <= 65) ||
      (glyph.index >= ENEMY_SURFACE_BASE && glyph.index <= 76));
    assert.ok(surfaces.length <= SURFACE_CODE_BUDGET,
      `${levelSet.styleName} uses ${surfaces.length} surface codes of ${SURFACE_CODE_BUDGET}`);
    for (const glyph of levelSet.glyphs) {
      assert.ok(glyph.index >= 59 && glyph.index <= 89,
        `${levelSet.styleName}: ${glyph.name} left the 59-89 hull window`);
    }
  }
  // The budget is not only a compile-time count: after publication the charset
  // holds exactly those fourteen surface cells — seven resident allied codes
  // (59-65) and the seven the level block supplied (70-76) — and the level
  // block touches nothing else in the 59-89 window.
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  const before = Buffer.from(memory.subarray(CHARSET + 59 * 8, CHARSET + 90 * 8));
  runRoutine(memory, labels, "publish_level_hull_style");
  const after = Buffer.from(memory.subarray(CHARSET + 59 * 8, CHARSET + 90 * 8));
  const changed = new Set();
  for (let index = 0; index < after.length; index += 1) {
    if (after[index] !== before[index]) changed.add(59 + Math.floor(index / 8));
  }
  for (const code of changed) {
    assert.ok(code >= ENEMY_SURFACE_BASE && code <= 76,
      `publication wrote charset code ${code}, outside the per-level window 70-76`);
  }
});

test("start_gameplay publishes the level's style into the charset, the boundaries and the DLI", () => {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  const blockAddress = block.blockAddress;
  const imageBlock = levelImage.subarray(block.imageOffset, block.imageOffset + BLOCK_BYTES);
  assert.deepEqual(Buffer.from(memory.subarray(blockAddress, blockAddress + BLOCK_BYTES)),
    Buffer.from(imageBlock), "the XEX did not publish the hull block into the level buffer");

  runRoutine(memory, labels, "publish_level_hull_style");

  const glyphBase = CHARSET + ENEMY_SURFACE_BASE * 8;
  assert.deepEqual(
    Buffer.from(memory.subarray(glyphBase, glyphBase + ENEMY_SURFACE_CODES * 8)),
    Buffer.from(imageBlock.subarray(192, 192 + ENEMY_SURFACE_CODES * 8)),
    "the level's enemy surface glyphs did not reach $4630-$4667");
  const boundaries = requiredLabel(labels, "enemy_collision_boundaries");
  assert.deepEqual(Buffer.from(memory.subarray(boundaries, boundaries + SEGMENT_ROWS)),
    Buffer.from(imageBlock.subarray(248, 248 + SEGMENT_ROWS)),
    "the level's enemy collision boundaries did not reach BROADSIDE");
  const operand = requiredLabel(labels, "gameplay_dli_allied_colpf1_load") + 1;
  assert.equal(memory[operand], imageBlock[2], "the DLI still writes the assembled steel");
  // Zero in-frame cost: the DLI keeps its immediate operand, patched once per
  // level start. LDA #imm is $A9, and the operand is the byte after it.
  assert.equal(memory[operand - 1], 0xa9,
    "the DLI's allied steel is no longer an immediate load");
  // The enemy runtime map comes from the block too.
  const runtimeEnemy = 0x4d20;
  assert.notDeepEqual(Buffer.from(memory.subarray(runtimeEnemy, runtimeEnemy + SEGMENT_ROWS * 9)),
    Buffer.alloc(SEGMENT_ROWS * 9, 0xa5), "the enemy hull map was not unpacked");
});

test("a different region publishes different glyphs, boundaries and steel", () => {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  const blockAddress = block.blockAddress;
  const r3 = blockOf("R3");
  memory.set(r3, blockAddress);
  memory[blockAddress + 2] = SECOND_HALF_COLPF1;

  runRoutine(memory, labels, "publish_level_hull_style");

  const glyphBase = CHARSET + ENEMY_SURFACE_BASE * 8;
  assert.deepEqual(
    Buffer.from(memory.subarray(glyphBase, glyphBase + ENEMY_SURFACE_CODES * 8)),
    Buffer.from(r3.subarray(192, 192 + ENEMY_SURFACE_CODES * 8)),
    "R3's glyphs did not reach the charset");
  const boundaries = requiredLabel(labels, "enemy_collision_boundaries");
  assert.deepEqual(Buffer.from(memory.subarray(boundaries, boundaries + SEGMENT_ROWS)),
    Buffer.from(r3.subarray(248, 248 + SEGMENT_ROWS)),
    "R3's collision boundaries did not reach BROADSIDE");
  assert.equal(memory[requiredLabel(labels, "gameplay_dli_allied_colpf1_load") + 1],
    SECOND_HALF_COLPF1);
  // Nothing resident supplies the enemy map any more: the routine reads the
  // level buffer, so a second region genuinely changes the runtime map.
  assert.ok(!/^\s+EMIT_ENEMY_HULL_PACKED_MAP\s*$/m.test(mainSource),
    "main.s still assembles a resident enemy packed map");
  assert.ok(!/^\s+EMIT_ENEMY_HULL_CODEBOOK\s*$/m.test(mainSource),
    "main.s still assembles a resident enemy codebook");
  assert.ok(mainSource.includes("jsr publish_level_hull_style"),
    "start_gameplay does not publish the level's hull style");
});

test("the ATR reads thirteen sectors at START GAME, and the reader still fits", () => {
  // Re-pinned for roadmap 4.6 step 1 (plan §2.1): the three LevelDef pages
  // take sectors 9-13. The hull block's own three sectors and its frozen
  // addresses are untouched - every other clause in this file still holds.
  assert.equal(levelOne.sectors, 13);
  assert.equal(levelOne.bytes, 13 * 128);
  assert.ok(levelOne.sectors <= manifest.sectorReader.levelBuffer.sectors);
});

test("--hull-style=Rn is a review variant that bakes one region and never writes dist/", () => {
  assert.match(buildSource, /--hull-style=/);
  assert.match(buildSource, /hullStyleSlug/);
  assert.match(buildSource, /isReviewVariant = [^;]*hullStyleValue !== null/,
    "a --hull-style build must be a review variant: no dist/, no runtime measurement");
  for (const style of ["R1", "R2", "R3", "R4"]) {
    assert.equal(packageJson.scripts[`hull:style:${style}`],
      `node scripts/build.mjs --hull-style=${style}`);
  }
});
