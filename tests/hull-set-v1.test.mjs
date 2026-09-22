import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "../scripts/capital-hulls.mjs";
import { convertHullSet } from "../scripts/hull-set-import.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(rootDirectory, "assets", "graphics", "capital-hulls.json");
const draftPath = path.join(
  rootDirectory, "assets", "graphics", "hull-drafts", "hull-set-v2.json");
const definition = loadCapitalHullsDefinition(definitionPath);
const asset = compileCapitalHulls(definition);
const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));

const SEGMENT_ROWS = 32;
const MAP_COLUMNS = 9;
const TURRET_MUZZLE_ROW = 9;
const SURFACE_CODES = [59, 60, 61, 62, 63, 64, 65, 70, 71, 72, 73, 74, 75, 76];

// Re-pinned to the v2 draft (owner, 2026-09-22): the step-1 smoke on hardware
// rejected the v1 look — a black deck interior made the hull read as a thin
// ribbon floating in space, and the frame line and rib read as display
// artefacts. v2 is full mass out to the screen edge with the texture cut into
// it, so the blank `deck` glyph is gone and with it the one shared code; the
// allied hull now owns all seven of 59-65 and each style all seven of 70-76.
// Profile, turret positions, colour registers and the collision convention are
// unchanged, so the core pin below still holds.

// Measured from assets/graphics/capital-hulls.json at ded0687 (format 1), the
// build this hull set replaces. The seventeen core glyphs are the part of the
// charset the level blocks never touch, so their indices and bytes are a pin,
// not a value this generator may re-derive.
const CORE_INDICES = [66, 67, 68, 69, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89];
const CORE_BYTES_SHA256 =
  "bb3333bde6d826e160fb0a9cd875c7a71981fff3fbb4d89741d4200d947712ee";

const DRAFT_REGIONS = new Map([
  ["R1", "R1-slab"],
  ["R2", "R2-rib-launchers"],
  ["R3", "R3-heavy-plates"],
  ["R4", "R4-armour"],
]);
// The draft row whose muzzle the generator keeps as the style's firing turret.
const DRAFT_MUZZLE_ROWS = new Map([["R1", 19], ["R2", 2], ["R3", 13], ["R4", 13]]);

const splitRow = (row) => row.trim().split(/\s+/);
const isTurretCell = (cell) => cell.startsWith("T:");

function rotatedDraftMap(rows, muzzleDraftRow) {
  const shift = TURRET_MUZZLE_ROW - muzzleDraftRow;
  return Array.from({ length: SEGMENT_ROWS }, (unused, row) =>
    rows[((row - shift) % SEGMENT_ROWS + SEGMENT_ROWS) % SEGMENT_ROWS]);
}

function mirrorCells(cells) {
  return [cells[MAP_COLUMNS - 1], ...cells.slice(0, MAP_COLUMNS - 1).reverse()];
}

function glyphByCode(levelSet) {
  return new Map(levelSet.glyphs.map((glyph) => [glyph.screenCode, glyph]));
}

function surfaceCodesOf(levelSet) {
  const used = new Set();
  for (const side of ["allied", "enemy"]) {
    for (const row of levelSet.decodedMaps.get(side)) {
      for (const screenCode of row) {
        if (screenCode === 0) continue;
        used.add(screenCode & 0x7f);
      }
    }
  }
  return [...used].filter((index) => SURFACE_CODES.includes(index))
    .sort((left, right) => left - right);
}

// The one turret the generator places occupies columns 4..8 of segment rows
// 8/9/10; everything else on those rows, and every other row, still belongs to
// the draft.
const isStampedCell = (row, column) =>
  row >= TURRET_MUZZLE_ROW - 1 && row <= TURRET_MUZZLE_ROW + 1 && column >= 4;

/**
 * Draft glyph name -> compiled slot name, derived from the pixels alone so the
 * test does not simply repeat the converter's slot table. Every draft glyph
 * must land in exactly one slot.
 */
function slotNamesFor(draftGlyphs, authoredGlyphs) {
  const names = new Map();
  for (const [draftName, pixels] of Object.entries(draftGlyphs)) {
    // v2 declares no blank glyph, so every draft glyph must carry pixels; an
    // all-zero compiled slot is only an unused per-level slot.
    assert.ok(!pixels.every((row) => row === "0000"),
      `draft glyph ${draftName} is blank; v2 carries no blank surface glyph`);
    const matches = authoredGlyphs.filter((glyph) =>
      glyph.pixels.join("|") === pixels.join("|"));
    assert.equal(matches.length, 1,
      `draft glyph ${draftName} must occupy exactly one compiled slot`);
    names.set(draftName, matches[0].name);
  }
  return names;
}

function assertStandardTurretProfile(label, rows, prefix) {
  for (const ringRow of [TURRET_MUZZLE_ROW - 1, TURRET_MUZZLE_ROW + 1]) {
    assert.deepEqual(rows[ringRow].slice(4), [
      `${prefix}_base`, `${prefix}_base`, `${prefix}_base`,
      rows[ringRow][7], "space",
    ], `${label} ring row ${ringRow} is not the standard emplacement`);
    assert.ok(rows[ringRow][7].endsWith("_hull_wall"),
      `${label} ring row ${ringRow} must close on the style's own wall glyph`);
  }
  assert.deepEqual(rows[TURRET_MUZZLE_ROW].slice(4), [
    `${prefix}_base`, `${prefix}_housing`, `${prefix}_barrel`,
    `${prefix}_barrel`, `${prefix}_muzzle`,
  ], `${label} does not put its muzzle on the projection column`);
}

test("the committed capital-hulls asset is exactly what the draft converter produces", () => {
  assert.equal(
    fs.readFileSync(definitionPath, "utf8"),
    `${JSON.stringify(convertHullSet(), null, 2)}\n`,
    "run node scripts/hull-set-import.mjs; the art is owned by the draft, not by hand edits",
  );
  assert.equal(definition.formatVersion, 2);
  assert.deepEqual(asset.levelHullSets.map(({ styleName, levels }) => [styleName, levels]), [
    ["R1", [1, 4]], ["R2", [5, 8]], ["R3", [9, 12]], ["R4", [13, 16]],
  ]);
});

test("every compiled style reproduces the draft's glyph pixels and map cells, enemy mirrored",
  () => {
    const alliedSlots = [
      ["allied_hull_mass", "solid"], ["allied_hull_wall", "wall"],
      ["allied_hull_accent", "wacc"], ["allied_hull_chamfer_in", "ch_in"],
      ["allied_hull_chamfer_out", "ch_out"], ["allied_hull_groove", "groove"],
      ["allied_hull_seam", "seam"],
    ];
    const alliedGlyphs = new Map(asset.glyphs.map((glyph) => [glyph.name, glyph]));
    for (const [name, draftName] of alliedSlots) {
      assert.deepEqual(
        alliedGlyphs.get(name).pixels.map((row) => row.join("")),
        draft.allied.glyphs[draftName],
        `allied ${name} must be the draft's ${draftName}, pixel for pixel`,
      );
    }

    for (const levelSet of asset.levelHullSets) {
      const region = draft.enemyRegions.get?.(levelSet.styleName) ??
        draft.enemyRegions[DRAFT_REGIONS.get(levelSet.styleName)];
      const styleDefinition = definition.enemyStyles
        .find(({ id }) => id === levelSet.styleName);
      const compiled = new Map(levelSet.glyphs.map((glyph) => [glyph.name, glyph]));
      for (const [slot, authored] of styleDefinition.glyphs.entries()) {
        const drafted = Object.entries(region.glyphs)
          .find(([, pixels]) => pixels.join("|") === authored.pixels.join("|"));
        const compiledPixels = compiled.get(authored.name).pixels
          .map((row) => row.join(""));
        // The asset stores the enemy art in allied orientation; the compiler
        // mirrors it, so the compiled glyph is the reverse of the draft's.
        assert.deepEqual(
          compiledPixels.map((row) => [...row].reverse().join("")),
          authored.pixels,
          `${levelSet.styleName} slot ${slot} must compile as the mirror of its authored glyph`,
        );
        if (authored.pixels.every((row) => row === "0000")) continue;
        assert.ok(drafted,
          `${levelSet.styleName} slot ${slot} carries pixels the draft never declared`);
      }

      // Map cells: identical to the rotated draft everywhere the draft did not
      // draw a turret. Turret cells are the generator's (owner decisions 3-5,
      // 2026-09-22): one standard profile at segment rows 8/9/10.
      const draftRows = rotatedDraftMap(
        region.map.map(splitRow), DRAFT_MUZZLE_ROWS.get(levelSet.styleName));
      const names = glyphByCode(levelSet);
      const authoredRows = styleDefinition.map.map(splitRow);
      const slotNames = slotNamesFor(region.glyphs, styleDefinition.glyphs);
      for (let row = 0; row < SEGMENT_ROWS; row += 1) {
        for (let column = 0; column < MAP_COLUMNS; column += 1) {
          if (isTurretCell(draftRows[row][column])) continue;
          if (isStampedCell(row, column)) continue;
          assert.equal(
            draftRows[row][column] === "space",
            authoredRows[row][column] === "space",
            `${levelSet.styleName} row ${row} column ${column} changed occupancy`,
          );
          if (draftRows[row][column] === "space") continue;
          assert.equal(authoredRows[row][column], slotNames.get(draftRows[row][column]),
            `${levelSet.styleName} row ${row} column ${column} left the draft`);
        }
      }
      assertStandardTurretProfile(levelSet.styleName, authoredRows, "enemy_turret");
      // And the compiled enemy map really is the mirror of the authored rows.
      for (let row = 0; row < SEGMENT_ROWS; row += 1) {
        const mirrored = mirrorCells(authoredRows[row]);
        const compiledRow = levelSet.decodedMaps.get("enemy")[row];
        for (let column = 0; column < MAP_COLUMNS; column += 1) {
          const screenCode = compiledRow[column];
          const name = screenCode === 0 ? "space" : names.get(screenCode).name;
          assert.equal(name, mirrored[column],
            `${levelSet.styleName} enemy row ${row} column ${column} is not the mirror`);
        }
      }
    }

    const alliedRows = definition.allied.map.map(splitRow);
    const alliedDraft = draft.allied.map.map(splitRow);
    const alliedSlotNames = slotNamesFor(draft.allied.glyphs, definition.allied.glyphs);
    for (let row = 0; row < SEGMENT_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        if (isTurretCell(alliedDraft[row][column])) continue;
        if (isStampedCell(row, column)) continue;
        if (alliedDraft[row][column] === "space") {
          assert.equal(alliedRows[row][column], "space",
            `allied row ${row} column ${column} changed occupancy`);
          continue;
        }
        assert.equal(alliedRows[row][column], alliedSlotNames.get(alliedDraft[row][column]),
          `allied row ${row} column ${column} left the draft`);
      }
    }
    assertStandardTurretProfile("allied B", alliedRows, "allied_turret");
  });

// v1 spent 12/14/13/14 because the two factions shared one blank `deck` code.
// v2 has no blank glyph at all, so R1 and R3 spend 13 (7 allied + 6 enemy) and
// R2 and R4 spend the full 14; the numbers are the draft's own
// `totalWithAllied` counts and the ceiling decision AA set is still 14.
test("each level hull set uses at most 14 surface codes, none of them shared", () => {
  const counts = asset.levelHullSets.map((levelSet) => surfaceCodesOf(levelSet).length);
  assert.deepEqual(counts, [13, 14, 13, 14],
    "allied plus R1/R2/R3/R4 must cost exactly the budget the v2 draft counted");
  assert.deepEqual(
    counts,
    [...DRAFT_REGIONS.keys()].map((id) => draft.enemyRegions[DRAFT_REGIONS.get(id)].totalWithAllied),
    "the compiled budget must equal the draft's own count",
  );
  for (const levelSet of asset.levelHullSets) {
    assert.ok(surfaceCodesOf(levelSet).length <= 14,
      `${levelSet.styleName} exceeds the 14-surface-code per-level budget`);
  }
  assert.deepEqual(asset.glyphs.filter(({ faction }) => faction === "shared"), [],
    "v2 draws full mass on both sides, so no glyph crosses the faction line");
  const alliedSurface = asset.glyphs.filter(({ index }) => index >= 59 && index <= 65);
  assert.equal(alliedSurface.length, 7);
  for (const glyph of alliedSurface) {
    assert.equal(glyph.faction, "allied");
    assert.ok(glyph.pixels.flat().some((value) => value !== 0),
      `${glyph.name} must carry mass: v2 declares no blank surface glyph`);
  }
});

test("every hull screen code of every style lies in 59..89 and the core codes are unmoved", () => {
  for (const levelSet of asset.levelHullSets) {
    assert.equal(levelSet.glyphs.length, 31);
    for (const glyph of levelSet.glyphs) {
      assert.ok(glyph.index >= 59 && glyph.index <= 89,
        `${levelSet.styleName} ${glyph.name} left the 59..89 hull-code window`);
    }
    for (const side of ["allied", "enemy"]) {
      for (const row of levelSet.decodedMaps.get(side)) {
        for (const screenCode of row) {
          if (screenCode === 0) continue;
          const index = screenCode & 0x7f;
          assert.ok(index >= 59 && index <= 89,
            `${levelSet.styleName} ${side} map uses code ${index} outside the hull scans`);
        }
      }
    }
    const core = levelSet.glyphs.filter(({ index }) => CORE_INDICES.includes(index));
    assert.deepEqual(core.map(({ index }) => index), CORE_INDICES);
    assert.equal(
      crypto.createHash("sha256")
        .update(Buffer.from(core.flatMap((glyph) => [...glyph.bytes])))
        .digest("hex"),
      CORE_BYTES_SHA256,
      `${levelSet.styleName} changed a core glyph; core bytes are identical in every style`,
    );
  }
});

test("the allied hull is identical across all four level hull sets", () => {
  const [resident] = asset.levelHullSets;
  for (const levelSet of asset.levelHullSets) {
    assert.deepEqual(levelSet.packedMaps.get("allied"), resident.packedMaps.get("allied"));
    assert.deepEqual(levelSet.codebooks.get("allied"), resident.codebooks.get("allied"));
    assert.deepEqual(levelSet.decodedMaps.get("allied"), resident.decodedMaps.get("allied"));
    assert.deepEqual(
      levelSet.collisionBoundaries.get("allied"),
      resident.collisionBoundaries.get("allied"),
    );
    assert.deepEqual(
      levelSet.sector.prowCollisionBoundaries.get("allied"),
      resident.sector.prowCollisionBoundaries.get("allied"),
    );
    assert.deepEqual(levelSet.turretBytes, resident.turretBytes,
      "the turret record is normalised, so it is the same bytes for every style");
    for (const side of ["allied", "enemy"]) {
      assert.deepEqual(
        levelSet.sector.moduleSourceRowsBySide.get(side),
        resident.sector.moduleSourceRowsBySide.get(side),
        `${side} module sources must stay style-independent and resident`,
      );
      assert.deepEqual(
        levelSet.sector.moduleSequences.get(side),
        resident.sector.moduleSequences.get(side),
      );
    }
  }
});

test("each style compiles a 280-byte hull block the level image can carry", () => {
  assert.equal(asset.hullStyleBlockBytes, 280);
  assert.equal(asset.hullStyleBlocks.length, 4);
  const offsets = asset.hullStyleBlockOffsets;
  for (const [index, levelSet] of asset.levelHullSets.entries()) {
    const block = asset.hullStyleBlocks[index];
    assert.equal(block.length, 280);
    assert.equal(block[offsets.styleId], index + 1);
    assert.equal(block[offsets.formatVersion], 1);
    assert.deepEqual(
      [...block.subarray(offsets.reserved, offsets.packedMap)],
      Array(14).fill(0),
      "the reserved header field must stay zero until hull_params arrives",
    );
    assert.deepEqual(
      Buffer.from(block.subarray(offsets.packedMap, offsets.codebook)),
      Buffer.from(levelSet.packedMaps.get("enemy")),
    );
    assert.deepEqual(
      Buffer.from(block.subarray(offsets.codebook, offsets.glyphs)),
      Buffer.from(levelSet.codebooks.get("enemy")),
    );
    assert.deepEqual(
      Buffer.from(block.subarray(offsets.glyphs, offsets.collisionBoundaries)),
      Buffer.from(levelSet.glyphs
        .filter((glyph) => glyph.index >= 70 && glyph.index <= 76)
        .flatMap((glyph) => [...glyph.bytes])),
    );
    assert.deepEqual(
      Buffer.from(block.subarray(offsets.collisionBoundaries)),
      Buffer.from(levelSet.collisionBoundaries.get("enemy")),
    );
    assert.deepEqual(
      Buffer.from(fs.readFileSync(
        path.join(rootDirectory, "build", `hull-style-${levelSet.styleName}.bin`))),
      Buffer.from(block),
    );
  }
});

// Owner decision 1 of 2026-09-22: the allied steel stays $84 in the default
// build and a non-default build carries $88 for side-by-side smoke. The
// override must never reach the release artifact or a gate, so it is a review
// variant and the default constant is pinned here.
test("the allied steel stays $84 by default and $88 only as a review variant", () => {
  const main = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
  assert.match(
    main,
    /\.ifndef GAMEPLAY_COLPF1_OVERRIDE\s*\nGAMEPLAY_COLPF1 = \$84\s*\n\.else\s*\nGAMEPLAY_COLPF1 = GAMEPLAY_COLPF1_OVERRIDE\s*\n\.endif/,
    "the default build must keep the accepted steel and only honour an explicit override",
  );
  const build = fs.readFileSync(path.join(rootDirectory, "scripts", "build.mjs"), "utf8");
  assert.match(build, /alliedSteelValues = new Map\(\[\["88", 0x88\], \["8A", 0x8a\]\]\)/);
  assert.match(build, /isReviewVariant = [^;]*alliedSteelValue !== null/,
    "an --allied-steel build must be a review variant: no dist/, no runtime measurement");
  assert.match(build, /GAMEPLAY_COLPF1_OVERRIDE=\$\{alliedSteelValue\}/);
});
