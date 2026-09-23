import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compileCapitalHulls,
  decodePackedHullMap,
  loadCapitalHullsDefinition,
  renderCapitalHullsCa65Include,
} from "../scripts/capital-hulls.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import {
  installRuntimeSegments,
  readRuntimeBytes,
} from "../scripts/runtime-image.mjs";
import { loadLoaderBitmapDefinition } from "../scripts/loader-assets.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";
import {
  createCapitalHullsStripPreview,
  createEnemyHullColourOptionsPreview,
  createGameplayPreview,
  createLoaderPreview,
  createStartMenuPreview,
  inspectPng,
  readGameGraphicsSource,
  readCapitalHullsStripRuntimeState,
  readEnemyFighterLimitsRuntimeState,
  readGameplayRuntimeState,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(rootDirectory, "assets", "graphics", "capital-hulls.json");
const loaderDefinitionPath = path.join(rootDirectory, "assets", "graphics", "loader-bitmap.json");
const includePath = path.join(rootDirectory, "build", "capital-hulls.inc");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const definition = loadCapitalHullsDefinition(definitionPath);
const asset = compileCapitalHulls(definition);
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const map = fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.map"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function readXexBytes(address, length) {
  return readRuntimeBytes(rootDirectory, address, length);
}

function runResidentRoutine(memory, name) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing linked routine ${name}`);
  for (let steps = 0; steps < 500_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

function colorCounts(side) {
  const glyphByCode = new Map(asset.glyphs.map((glyph) => [glyph.screenCode, glyph]));
  const counts = [0, 0, 0, 0];
  for (const row of asset.decodedMaps.get(side)) {
    for (const screenCode of row) {
      const glyph = glyphByCode.get(screenCode);
      if (!glyph) continue;
      for (const pixels of glyph.pixels) {
        for (const value of pixels) counts[value] += 1;
      }
    }
  }
  return counts;
}

function occupiedContour(row) {
  return row.map((screenCode) => Number(screenCode !== 0));
}

function transitionRows(depths) {
  return depths.flatMap((depth, index) =>
    depth === depths[(index + 1) % depths.length] ? [] : [index]);
}

test("capital-hull source compiles deterministically and rejects corrupt definitions", () => {
  const second = compileCapitalHulls(loadCapitalHullsDefinition(definitionPath));
  assert.deepEqual(second.glyphBytes, asset.glyphBytes);
  assert.deepEqual(second.packedMaps.get("allied"), asset.packedMaps.get("allied"));
  assert.deepEqual(second.packedMaps.get("enemy"), asset.packedMaps.get("enemy"));
  assert.deepEqual(second.turretBytes, asset.turretBytes);
  assert.deepEqual(second.hullStyleBlocks, asset.hullStyleBlocks);

  const badVersion = structuredClone(definition);
  badVersion.formatVersion = 1;
  assert.throws(() => compileCapitalHulls(badVersion), /Unsupported capital-hulls formatVersion/);
  const badPixel = structuredClone(definition);
  badPixel.allied.glyphs[0].pixels[0] = "4222";
  assert.throws(() => compileCapitalHulls(badPixel), /invalid pixel/);
  const wrongFactionBank = structuredClone(definition);
  wrongFactionBank.enemyStyles[0].glyphs[0].screenBank = "pf2";
  assert.throws(() => compileCapitalHulls(wrongFactionBank), /faction's ANTIC 4 colour bank/);
  const unknownGlyph = structuredClone(definition);
  unknownGlyph.allied.map[0] = unknownGlyph.allied.map[0]
    .replace("allied_hull_groove", "unknown_hull_glyph");
  assert.throws(() => compileCapitalHulls(unknownGlyph), /unknown glyph/);
  const crossFaction = structuredClone(definition);
  crossFaction.allied.map[0] = crossFaction.allied.map[0]
    .replace("allied_hull_groove", "enemy_hull_wall");
  assert.throws(() => compileCapitalHulls(crossFaction), /from the other faction/);
  const orphanMuzzle = structuredClone(definition);
  orphanMuzzle.allied.map[0] = orphanMuzzle.allied.map[0]
    .replace(/space$/, "allied_turret_muzzle");
  assert.throws(() => compileCapitalHulls(orphanMuzzle), /projection and muzzle metadata disagree/);
  const shallowHull = structuredClone(definition);
  shallowHull.allied.map[0] =
    "allied_hull_mass allied_hull_mass allied_hull_mass allied_hull_mass " +
    "space space space space space";
  assert.throws(() => compileCapitalHulls(shallowHull), /unsupported base depth/);
  const missingStyle = structuredClone(definition);
  missingStyle.enemyStyles.pop();
  assert.throws(() => compileCapitalHulls(missingStyle), /four enemy styles/);
});

// The one v2 rule that lets a glyph cross the faction line. A shared glyph is
// referenced by both maps and therefore rendered in both ANTIC 4 colour banks,
// so only an all-zero cell can carry the same meaning on both sides; its screen
// code keeps bit 7 clear and both runtime hull-code scans mask bit 7.
//
// Re-pinned for the v2 art (owner, 2026-09-22): the hull is now full mass out
// to the screen edge, so the blank `deck` cell the two factions used to share
// no longer exists and the shipped set declares no shared glyph at all. The
// rule still has to hold for anything that declares one, so the two negative
// cases below synthesise the shared glyph the art no longer carries.
test("a shared glyph must be all-zero and is the only glyph both factions may reference", () => {
  assert.deepEqual(asset.glyphs.filter(({ faction }) => faction === "shared"), [],
    "full-mass v2 art shares no cell between the factions");
  for (const glyph of asset.glyphs.filter(({ index }) => index >= 59 && index <= 76)) {
    assert.ok(glyph.pixels.flat().some((value) => value !== 0) ||
      (glyph.index >= 70 && glyph.index <= 76),
    `${glyph.name} is blank: only an unused per-level enemy slot may be`);
  }

  const opaqueShared = structuredClone(definition);
  opaqueShared.allied.glyphs[0].faction = "shared";
  assert.throws(() => compileCapitalHulls(opaqueShared),
    /Shared glyph allied_hull_mass must be all-zero/);
  const twoShared = structuredClone(definition);
  twoShared.allied.glyphs[0].faction = "shared";
  twoShared.allied.glyphs[0].pixels = Array.from({ length: 8 }, () => "0000");
  twoShared.allied.glyphs[1].faction = "shared";
  twoShared.allied.glyphs[1].pixels = Array.from({ length: 8 }, () => "0000");
  assert.throws(() => compileCapitalHulls(twoShared),
    /At most one shared glyph/);
});

test("31 generated ANTIC 4 glyphs fit the 1024-byte assembled gameplay charset", () => {
  assert.equal(asset.glyphs.length, 31);
  assert.equal(asset.glyphBytes.length, 248);
  for (const glyph of asset.glyphs) {
    assert.ok(glyph.index >= 59 && glyph.index < 128);
    assert.equal(glyph.bytes.length, 8);
    for (const row of glyph.pixels) {
      assert.ok(row.every((pixel) => pixel >= 0 && pixel <= 3));
    }
  }
  const graphics = readGameGraphicsSource(source, definition);
  assert.equal(graphics.charset.length, 1024);
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, rootDirectory);
  runResidentRoutine(memory, "copy_charset");
  runResidentRoutine(memory, "init_fighter_projectiles");
  const runtimeCharset = memory.subarray(0x4400, 0x4800);
  assert.deepEqual(Buffer.from(runtimeCharset.subarray(0, 47 * 8)),
    Buffer.from(graphics.charset.subarray(0, 47 * 8)));
  assert.deepEqual(Buffer.from(runtimeCharset.subarray(59 * 8, 90 * 8)),
    Buffer.from(graphics.charset.subarray(59 * 8, 90 * 8)));
});

test("assembled gameplay display list and DLI switch a dedicated ANTIC 2 HUD", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const builder = source.slice(
    source.indexOf("build_playfield_display_list:"),
    source.indexOf("rotate_playfield_rows:"),
  );
  assert.match(builder,
    /lda #\$C2[\s\S]+lda #<GAMEPLAY_DIVIDER_SCREEN[\s\S]+cpy #\(6\+\(PLAYFIELD_RING_ROWS-1\)\*3\)[\s\S]+lda #\$C4[\s\S]+lda PLAYFIELD_ROW_LO,x[\s\S]+lda PLAYFIELD_ROW_HI,x[\s\S]+lda #\$41/);
  assert.match(source,
    /lda PLAYFIELD_ACTIVE_DLIST_LO\s+sta DLISTL\s+lda #>PLAYFIELD_DLIST_A\s+sta DLISTH/);
  assert.deepEqual(
    graphics.gameplayLayout.rows.map(({ mode }) => mode),
    [2, ...Array(23).fill(4)],
  );
  assert.deepEqual(
    graphics.gameplayLayout.rows.map(({ screenOffset }) => screenOffset),
    Array.from({ length: 24 }, (_, index) => index * 40),
  );

  assert.equal(graphics.hudCharset.length, 1024);
  assert.notDeepEqual(graphics.hudCharset, graphics.charset);
  const hudCodes = [...graphics.hud]
    .filter((value) => value >= 0x20 && value <= 0x5a)
    .map((value) => value - 0x20);
  for (const code of new Set(hudCodes)) {
    if (code === 0) continue;
    assert.ok(
      graphics.hudCharset.subarray(code * 8, code * 8 + 8).some((value) => value !== 0),
      `HUD glyph ${code} must be present in the dedicated charset`,
    );
  }
  for (const [name, expected] of [
    ["CH_HUD_HULL_FULL", [0, 0, 0, 0x3c, 0x7e, 0xff, 0x7e, 0xff]],
    ["CH_HUD_HULL_DAMAGED", [0, 0, 0, 0x3c, 0x42, 0x5a, 0x24, 0xff]],
    ["CH_HUD_BOOSTER_FULL", [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff]],
  ]) {
    const code = graphics.constants.get(name);
    assert.deepEqual(
      graphics.hudCharset.subarray(code * 8, code * 8 + 8),
      Uint8Array.from(expected),
      `${name} must use its shape-distinct dedicated HUD glyph`,
    );
  }

  const state = readGameplayRuntimeState(source, definition);
  const hudRegisters = new Set(state.registerPixels.subarray(0, 8 * 320));
  assert.deepEqual(hudRegisters, new Set([0x00, 0x0e]));
  const separatorRegisters = new Set(state.registerPixels.subarray(7 * 320, 8 * 320));
  assert.deepEqual(separatorRegisters, new Set([0x0e]));
  const gameplayRegisters = new Set(state.registerPixels.subarray(8 * 320));
  assert.ok(gameplayRegisters.has(0x84));
  assert.ok(gameplayRegisters.has(0x46));

  const dliAddress = labels.get("gameplay_dli");
  const dliBytes = readXexBytes(
    dliAddress,
    labels.get("allied_hull_packed_map") - dliAddress,
  );
  assert.notEqual(
    dliBytes.indexOf(Buffer.from([0xa9, 0x44, 0x8d, 0x09, 0xd4])),
    -1,
    "HUD-end DLI must restore gameplay CHBASE=$44",
  );
  assert.notEqual(
    dliBytes.indexOf(Buffer.from([0xa9, 0x50, 0x8d, 0x09, 0xd4])),
    -1,
    "gameplay-end DLI must restore HUD CHBASE=$50",
  );
});

test("assembled ANTIC 2 HUD keeps independent live score, life, and hull fields", () => {
  const absoluteStore = (address) => Buffer.from([0x8d, address & 0xff, address >>> 8]);
  const scoreAddress = labels.get("update_score_display");
  const scoreBytes = readXexBytes(
    scoreAddress,
    labels.get("update_starfield") - scoreAddress,
  );
  for (let offset = 6; offset <= 10; offset += 1) {
    assert.notEqual(
      scoreBytes.indexOf(absoluteStore(0x4000 + offset)),
      -1,
      `score digit at screen offset ${offset} must remain live`,
    );
  }

  const statusAddress = labels.get("update_hud_status");
  const statusBytes = readXexBytes(
    statusAddress,
    labels.get("begin_broadside_impact") - statusAddress,
  );
  assert.notEqual(statusBytes.indexOf(absoluteStore(0x4000 + 18)), -1,
    "HUD LIFE digit at screen offset 18 must remain live");
  assert.notEqual(statusBytes.indexOf(Buffer.from([0x9d, 0x19, 0x40])), -1,
    "HUD HULL plates must update only the indexed 25-28 field");
  assert.match(source, /hud_ascii:\s*\.byte "SCORE 00000  LIFE 3 HULL "/);
  assert.doesNotMatch(source, /hud_ascii:[\s\S]*?\.byte [^\n]*\b(?:FUEL|ARM)\b/);
  assert.match(source,
    /update_hud_status:[\s\S]+lda PLAYER_LIVES[\s\S]+HUD_LIFE_DIGIT_OFFSET[\s\S]+lda BROAD_PLAYER_HEALTH/);

  const startGameplay = readXexBytes(
    labels.get("start_gameplay"),
    labels.get("start_gameplay_end") - labels.get("start_gameplay"),
  );
  const jsr = (address) => Buffer.from([0x20, address & 0xff, address >>> 8]);
  assert.notEqual(startGameplay.indexOf(jsr(labels.get("update_score_display"))), -1);
  assert.notEqual(startGameplay.indexOf(jsr(labels.get("update_hud_status"))), -1);
});

test("generated include, packed maps, codebooks, and turret records match assembled bytes", () => {
  assert.equal(
    fs.readFileSync(includePath, "utf8"),
    renderCapitalHullsCa65Include(asset),
  );
  assert.deepEqual(
    readXexBytes(labels.get("capital_hull_glyphs"), asset.glyphBytes.length),
    Buffer.from(asset.glyphBytes),
  );
  assert.deepEqual(
    readXexBytes(labels.get("allied_hull_codebook"), 16),
    Buffer.from(asset.codebooks.get("allied")),
  );
  // Re-pinned for hull set v1 step 2: the enemy codebook and packed map are
  // LEVEL data now — they travel in the level image's hull block, and their
  // resident ranges are held as reserves so no address moved. The level block
  // is checked against the compiler in tests/level-hull-block.test.mjs.
  assert.equal(labels.get("enemy_hull_codebook"), undefined,
    "a resident enemy codebook is back in the link");
  assert.equal(labels.get("enemy_hull_packed_map"), undefined,
    "a resident enemy packed map is back in the link");
  assert.deepEqual(
    Buffer.from(fs.readFileSync(path.join(rootDirectory, "build",
      manifest.capitalHulls.levelBlock.file)).subarray(
      manifest.capitalHulls.levelBlock.offsets.codebook,
      manifest.capitalHulls.levelBlock.offsets.glyphs)),
    Buffer.from(asset.codebooks.get("enemy")),
  );
  assert.deepEqual(
    readXexBytes(labels.get("allied_hull_packed_map"), 160),
    Buffer.from(asset.packedMaps.get("allied")),
  );
  assert.deepEqual(
    Buffer.from(fs.readFileSync(path.join(rootDirectory, "build",
      manifest.capitalHulls.levelBlock.file)).subarray(
      manifest.capitalHulls.levelBlock.offsets.packedMap,
      manifest.capitalHulls.levelBlock.offsets.codebook)),
    Buffer.from(asset.packedMaps.get("enemy")),
  );
  assert.deepEqual(
    readXexBytes(labels.get("capital_hull_turrets"), asset.turretBytes.length),
    Buffer.from(asset.turretBytes),
  );
  assert.deepEqual(
    readXexBytes(labels.get("broadside_schedule"), asset.scheduleBytes.length),
    Buffer.from([1, 210, 1, 210, 1, 210, 0, 254]),
    "assembled opportunities retain their further-reduced PAL delays and faction side",
  );
  assert.deepEqual(
    readXexBytes(labels.get("turret_warning_last_safe_rows"), 3),
    Buffer.from(asset.warningLastSafeRowBytes),
    "assembled firing bounds reserve the complete 25-frame warning plus one hull row",
  );
  for (const side of ["allied", "enemy"]) {
    assert.deepEqual(
      decodePackedHullMap(asset.packedMaps.get(side), asset.codebooks.get(side), 32),
      asset.decodedMaps.get(side),
    );
  }
});

test("every segment row is a bounded 8+24+8 composition with coherent contours", () => {
  assert.equal(asset.segmentRows, 32);
  assert.equal(asset.mapColumns, 9);
  const contourDifferences = [];
  for (let rowIndex = 0; rowIndex < asset.segmentRows; rowIndex += 1) {
    const allied = asset.decodedMaps.get("allied")[rowIndex];
    const enemy = asset.decodedMaps.get("enemy")[rowIndex];
    const screenRow = new Uint8Array(40);
    screenRow.set(allied, 0);
    screenRow.set(enemy, 31);
    assert.equal(screenRow.length, 40);
    const projections = Number(allied[8] !== 0) + Number(enemy[0] !== 0);
    assert.ok(24 - projections >= 22);
    contourDifferences.push(
      occupiedContour(allied.slice(0, 8)).join("") !==
      occupiedContour(enemy.slice(1).reverse()).join(""),
    );
  }
  // Re-pinned for hull set v1: allied B and R1 are two separate drafts that
  // happen to share more flat wall than the H4.2 pair did, so 12 of the 32
  // rows differ rather than 16. The property that matters is unchanged — the
  // two sides are not each other's mirror.
  assert.equal(contourDifferences.filter(Boolean).length, 12);
  assert.ok(contourDifferences.some(Boolean));

  // The depth band is the one hard contour rule (owner decision 6, 2026-09-22):
  // the v1 transition count, the two-to-eight run window and the "use all four
  // depths" rule were generator-only statistics and are relaxed, because the
  // approved drafts draw one-row 45-degree chamfers and long flat runs. The
  // runtime reads per-row boundary tables and never inspects those statistics.
  for (const side of ["allied", "enemy"]) {
    assert.ok(asset.depthsBySide.get(side).every((depth) => depth >= 5 && depth <= 8),
      `${side} contour leaves the 5..8 band the corridor fast path assumes`);
  }
  assert.deepEqual([...new Set(asset.depthsBySide.get("allied"))].sort(), [5, 6, 7, 8]);
  assert.deepEqual([...new Set(asset.depthsBySide.get("enemy"))].sort(), [5, 6, 7, 8]);
  assert.deepEqual(Object.fromEntries(asset.contourTransitionCounts), { allied: 8, enemy: 8 });
  assert.deepEqual(asset.depthRunLengthsBySide.get("allied"), [1, 7, 1, 3, 5, 1, 6, 8]);
  assert.deepEqual(asset.depthRunLengthsBySide.get("enemy"), [5, 1, 6, 1, 2, 13, 1, 3]);
  assert.notDeepEqual(
    transitionRows(asset.depthsBySide.get("allied")),
    transitionRows(asset.depthsBySide.get("enemy")),
  );
  // Every style must stay inside the band, not just the resident one.
  for (const levelSet of asset.levelHullSets) {
    for (const side of ["allied", "enemy"]) {
      assert.ok(levelSet.depthsBySide.get(side).every((depth) => depth >= 5 && depth <= 8),
        `${levelSet.styleName} ${side} contour leaves the 5..8 band`);
    }
  }
});

test("turret metadata points to complete multi-cell emplacements and real muzzle tips", () => {
  // Re-pinned for hull set v1. Normalisation puts every style's firing turret
  // on segment row 9 — local row 1 of the fixed turret module — so the two
  // sides now carry the same segment row and the existing sidePhaseRows = 8
  // is what staggers them on screen. One turret module per side (owner
  // decision 5, 2026-09-22), so one turret record per side.
  assert.deepEqual(
    asset.turrets.map(({ id, segmentRow, muzzleColumn }) => [id, segmentRow, muzzleColumn]),
    [
      ["allied_turret_a", 9, 8],
      ["enemy_turret_a", 9, 31],
    ],
  );
  assert.equal(asset.turrets.filter(({ side }) => side === "allied").length, 1);
  assert.equal(asset.turrets.filter(({ side }) => side === "enemy").length, 1);
  assert.equal(asset.sector.sidePhaseRows, 8,
    "the two sides fire from the same segment row and are staggered by the side phase");
  for (const side of ["allied", "enemy"]) {
    assert.equal(asset.sector.turretModuleIds.get(side),
      asset.sector.moduleNamesBySide.get(side).indexOf("combat_1"));
  }
  assert.notDeepEqual(
    asset.sector.cannonRowsBySide.get("allied"),
    asset.sector.cannonRowsBySide.get("enemy"),
    "the seeded per-owner layouts still place the two sides' stations independently",
  );
  assert.deepEqual(asset.schedule.map(({ side, delayAfterFrames }) =>
    [side, delayAfterFrames]), [
    ["enemy", 210],
    ["enemy", 210],
    ["enemy", 210],
    ["allied", 254],
  ]);
  for (const levelSet of asset.levelHullSets) {
    for (const turret of levelSet.turrets) {
      const relative = turret.side === "allied" ? turret.muzzleColumn : turret.muzzleColumn - 31;
      const screenCode = levelSet.decodedMaps.get(turret.side)[turret.segmentRow][relative];
      const glyph = levelSet.glyphs.find((candidate) => candidate.screenCode === screenCode);
      assert.ok(glyph.tags.includes("muzzle"),
        `${levelSet.styleName} ${turret.side} muzzle cell is not a muzzle glyph`);
      assert.ok(turret.footprint.base.length >= 4);
      assert.ok(turret.footprint.housing.length >= 1);
      assert.ok(turret.footprint.barrel.length >= 2);
    }
    for (const side of ["allied", "enemy"]) {
      const projectionRows = levelSet.decodedMaps.get(side)
        .flatMap((row, index) => row[side === "allied" ? 8 : 0] === 0 ? [] : [index]);
      assert.deepEqual(projectionRows, [9],
        `${levelSet.styleName} ${side} must project exactly one muzzle, on segment row 9`);
      for (let phase = 0; phase < asset.segmentRows; phase += 1) {
        const visible = Array.from({ length: 22 }, (unused, offset) =>
          (phase + offset) & (asset.segmentRows - 1));
        assert.ok(projectionRows.filter((row) => visible.includes(row)).length <= 2,
          `${levelSet.styleName} ${side} phase ${phase} exceeds the visible cannon limit`);
      }
    }
  }
});

// Supersedes the accepted H4.2 C INDUSTRIAL ratio test: decision AA replaced
// the single allied/enemy pair with one allied hull and four enemy styles, so
// the pin is now the surface-glyph pixel census of the approved sheet.
// Value 1 is cold-white COLPF0, 2 is steel COLPF1, 3 is the faction colour
// (allied amber COLPF2 / enemy burgundy COLPF3).
//
// Re-pinned from set-B-sheet.png to set-MASS-sheet.png (owner, 2026-09-22):
// the step-1 hardware smoke rejected the v1 look, so v2 fills the hull with
// mass out to the screen edge and cuts the texture into it. The census moves
// the way that change implies — the black share collapses (allied 80 -> 18
// zero pixels of 224) and the body colour takes it (allied steel 98 -> 168,
// R1 burgundy 90 -> 140) — while the roles stay: allied steel-led with a
// cold-white edge, every enemy style faction-led with only a steel accent.
test("the full-mass set keeps the allied hull steel-led and every enemy style faction-led",
  () => {
  const census = (glyphs) => {
    const counts = [0, 0, 0, 0];
    for (const glyph of glyphs) {
      for (const row of glyph.pixels) for (const value of row) counts[value] += 1;
    }
    return counts;
  };
  const alliedSurface = asset.glyphs.filter(({ index }) => index >= 59 && index <= 65);
  assert.deepEqual(census(alliedSurface), [18, 36, 168, 2],
    "allied surfaces are steel-led with a cold-white edge and sparse amber service detail");
  assert.ok(census(alliedSurface)[0] * 4 < census(alliedSurface)[2],
    "the hull must read as mass, not as a ribbon: black is only the cut grooves");

  const expectedFactionPixels = new Map([["R1", 140], ["R2", 156], ["R3", 140], ["R4", 168]]);
  for (const levelSet of asset.levelHullSets) {
    const enemySurface = levelSet.glyphs.filter(({ index }) => index >= 70 && index <= 76);
    const counts = census(enemySurface);
    assert.equal(counts[3], expectedFactionPixels.get(levelSet.styleName),
      `${levelSet.styleName} must keep the approved burgundy share of the sheet`);
    assert.ok(counts[3] > counts[2],
      `${levelSet.styleName} must stay faction-led rather than steel-led`);
    assert.equal(counts[1], 36,
      `${levelSet.styleName} cold-white edge pixels must match the draft`);
    assert.ok(counts[2] <= 18,
      `${levelSet.styleName} may carry only a steel accent, never a steel body`);
  }
  assert.ok(census(alliedSurface)[2] > census(
    asset.levelHullSets[0].glyphs.filter(({ index }) => index >= 70 && index <= 76))[2] * 10,
  "steel reads as allied and burgundy as hostile at a glance");
});

test("assembled ANTIC 4 screen codes route allied steel and enemy burgundy effectively", () => {
  const state = readCapitalHullsStripRuntimeState(source, definition);
  const glyphs = new Map(asset.glyphs.map((glyph) => [glyph.name, glyph]));
  const alliedMass = glyphs.get("allied_hull_mass");
  const enemyMass = glyphs.get("enemy_hull_mass");
  assert.equal(alliedMass.screenCode & 0x80, 0);
  assert.equal(enemyMass.screenCode & 0x80, 0x80);
  assert.ok(alliedMass.pixels.flat().includes(2));
  assert.ok(enemyMass.pixels.flat().includes(3));
  assert.ok(asset.glyphs.filter(({ faction, tags }) =>
    faction === "enemy" && !tags.includes("energy"))
    .every(({ screenCode }) => (screenCode & 0x80) !== 0));
  assert.ok(asset.glyphs.filter(({ faction, tags }) =>
    faction === "enemy" && tags.includes("engine"))
    .every(({ screenCode }) => (screenCode & 0x80) !== 0),
  "enemy engine energy remains burgundy/red when PF2 is dedicated to yellow fire");

  const locate = (screenCode, pixelValue) => {
    const screenIndex = state.screen.findIndex((value) => value === screenCode);
    assert.notEqual(screenIndex, -1);
    const glyph = asset.glyphs.find((candidate) => candidate.screenCode === screenCode);
    const glyphPixelIndex = glyph.pixels.flat().findIndex((value) => value === pixelValue);
    assert.notEqual(glyphPixelIndex, -1);
    const characterRow = Math.floor(screenIndex / 40);
    const column = screenIndex % 40;
    const glyphLine = Math.floor(glyphPixelIndex / 4);
    const pixel = glyphPixelIndex % 4;
    return (characterRow * 8 + glyphLine) * 320 + column * 8 + pixel * 2;
  };
  // Re-pinned by owner decision 2 of 2026-09-23: the step-1 smoke chose the
  // brighter steel, so the release default is $88 and the level's own colour
  // byte rides on top of it (tests/level-hull-block.test.mjs).
  assert.equal(state.registerPixels[locate(alliedMass.screenCode, 2)], 0x88);
  assert.equal(state.registerPixels[locate(enemyMass.screenCode, 3)], 0x46);

  const bright = readCapitalHullsStripRuntimeState(source, definition, 0x46);
  assert.deepEqual(bright.screen, state.screen);
  assert.equal(bright.registerPixels[locate(enemyMass.screenCode, 3)], 0x46);
});

test("default gameplay phase exposes both factions' first turret without star overwrite", () => {
  const state = readGameplayRuntimeState(source, definition);
  const visibleTurrets = asset.turrets;
  assert.deepEqual(visibleTurrets.map(({ id }) => id), ["allied_turret_a", "enemy_turret_a"]);
  for (const turret of visibleTurrets) {
    const cannonRow = asset.sector.cannonRowsBySide.get(turret.side)
      .find((row) => row < asset.sector.previewSectorRow &&
        row >= asset.sector.previewSectorRow - asset.sector.visibleRows);
    const leftRow = turret.side === "enemy"
      ? cannonRow + asset.sector.sidePhaseRows
      : cannonRow;
    const screenRow = 1 + asset.sector.previewSectorRow - 1 - leftRow;
    const relative = turret.side === "allied" ? turret.muzzleColumn : turret.muzzleColumn - 31;
    assert.equal(
      state.screen[screenRow * 40 + turret.muzzleColumn],
      asset.sector.sectorScreenRowsBySide.get(turret.side)[cannonRow][relative],
    );
  }
  const playerLeft = (state.graphics.initialState.get("player_x") - 48) * 2;
  const playerRight = playerLeft + 32;
  assert.ok(playerLeft >= 9 * 8 && playerRight <= 31 * 8);
});

test("assembled enemy spawn, steering, and renderer use each archetype corridor envelope", () => {
  const state = readEnemyFighterLimitsRuntimeState(source, definition);
  assert.deepEqual(
    [state.minimum, state.maximum, state.visibleWidth, state.corridorLeft, state.corridorRight],
    [80, 160, 16, 80, 176],
  );
  assert.equal(state.graphics.enemyShape.some((row) => row === 0xff), true,
    "the double-width P1 body establishes the full sixteen-HPOS visible envelope");

  const roster = compileEnemyRoster(
    loadEnemyRosterDefinition(path.join(rootDirectory, "assets", "graphics", "enemy-roster.json")),
    rootDirectory,
  );
  for (const [label, values] of [
    ["enemy_visible_left_insets", roster.implemented.map((entry) => entry.visibleLeftInset)],
    ["enemy_visible_widths", roster.implemented.map((entry) => entry.visibleWidth)],
    ["enemy_logical_x_maxs", roster.implemented.map((entry) => entry.logicalBounds[1])],
  ]) {
    assert.deepEqual([...readXexBytes(labels.get(label), values.length)], values);
  }
  assert.match(source,
    /clamp_enemy_x:[\s\S]+cmp #CORRIDOR_LEFT_HPOS[\s\S]+cmp enemy_logical_x_maxs,x/,
    "the shared left corridor edge and per-archetype right edge remain authoritative");

  for (const archetype of roster.implemented) {
    const [minimum, maximum] = archetype.logicalBounds;
    const spawns = Array.from({ length: 256 }, (_, random) => {
      const range = maximum - minimum + 1;
      let offset = random & 0x7f;
      if (offset >= range) offset ^= 0x7f;
      return offset + minimum;
    });
    assert.equal(Math.min(...spawns), minimum);
    assert.equal(Math.max(...spawns), maximum);
    assert.equal(spawns.every((x) =>
      x >= state.corridorLeft && x + archetype.visibleWidth <= state.corridorRight), true);

    for (const initial of [0, minimum - 1, minimum, maximum, maximum + 1, 255]) {
      let x = Math.min(maximum, Math.max(minimum, initial));
      let direction = initial <= minimum ? 1 : 0;
      let changed = false;
      for (let step = 0; step < 1024; step += 1) {
        const before = x;
        if (direction === 1) {
          if (x >= maximum) direction = 0;
          else x += 1;
        } else if (x <= minimum) direction = 1;
        else x -= 1;
        changed ||= x !== before;
        assert.ok(x >= minimum && x + archetype.visibleWidth <= state.corridorRight);
      }
      assert.equal(changed, true, `${archetype.id} retains active horizontal steering`);
    }
  }
});

test("runtime map reservation and payload remain bounded and do not consume PMG or DLI", () => {
  const rodata = /RODATA\s+([0-9A-F]+)\s+([0-9A-F]+)\s+([0-9A-F]+)/i.exec(map);
  assert.ok(rodata);
  assert.ok(Number.parseInt(rodata[2], 16) < 0x4000);
  const graphics = readGameGraphicsSource(source, definition);
  assert.deepEqual(
    [
      graphics.constants.get("CAPITAL_HULL_RUNTIME_ALLIED"),
      graphics.constants.get("CAPITAL_HULL_RUNTIME_ENEMY"),
      graphics.constants.get("CAPITAL_HULL_RUNTIME_END"),
    ],
    [0x4c00, 0x4d20, 0x4e40],
  );
  assert.equal(asset.runtimeMapBytes, 576);
  assert.equal(asset.packedDataBytes, 1005);
  assert.deepEqual(
    Uint8Array.from(readXexBytes(labels.get("allied_collision_boundaries"), asset.segmentRows)),
    asset.collisionBoundaries.get("allied"),
  );
  assert.deepEqual(
    Uint8Array.from(readXexBytes(labels.get("enemy_collision_boundaries"), asset.segmentRows)),
    asset.collisionBoundaries.get("enemy"),
  );
  const generator = source.slice(source.indexOf("generate_near_star_row:"),
    source.indexOf("choose_star_column:"));
  assert.match(generator, /lda \(dst_ptr\),y\s+bne @done/);
  assert.doesNotMatch(generator, /PMG|GRACTL|NMIEN|VDSLST|WSYNC/);
  assert.match(source, /lda #GAMEPLAY_SCREEN_ROWS\s+sta row_counter[\s\S]+jsr generate_starfield_row/);
  assert.match(source, /scroll_world_columns:[\s\S]+generate_starfield_row/);
  assert.match(source, /scroll_hull_columns:[\s\S]+jsr draw_hull_row/);
});

test("loader remains unchanged and the accepted H3.1 menu preview is source-derived", () => {
  const loader = createLoaderPreview(loadLoaderBitmapDefinition(loaderDefinitionPath));
  const menu = createStartMenuPreview(source);
  assert.equal(sha256(loader), "83a8b4f7fff4791206b220e773272b2bb014b517049aedd83e070cecc3edd494");
  assert.equal(sha256(menu), "90c24ccbf0c00122896b959059f76f4748e55fbf304f58672d0cc4f867e7ae2c");

  const gameplay = createGameplayPreview(source, definition);
  const strip = createCapitalHullsStripPreview(source, definition);
  const colourOptions = createEnemyHullColourOptionsPreview(source, definition);
  assert.deepEqual([inspectPng(gameplay).width, inspectPng(gameplay).height], [640, 384]);
  assert.deepEqual([inspectPng(strip).width, inspectPng(strip).height], [640, 512]);
  assert.deepEqual(
    [inspectPng(colourOptions).width, inspectPng(colourOptions).height],
    [1280, 544],
  );
  const changed = structuredClone(definition);
  changed.maps.allied.rows[0] = changed.maps.allied.rows[0].replace(
    "allied_plate_lip",
    "allied_plate_mass",
  );
  assert.notDeepEqual(createGameplayPreview(source, changed), gameplay);
  assert.notDeepEqual(createCapitalHullsStripPreview(source, changed), strip);
});

test("joystick, FIRE, projectile, enemy, and scoring routines remain connected", () => {
  assert.match(source, /main_loop:[\s\S]+jsr read_input[\s\S]+jsr integration_update_enemy[\s\S]+jsr handle_collisions[\s\S]+jsr update_player_fighter_weapon[\s\S]+jsr integration_update_enemy_weapon[\s\S]+jsr update_starfield[\s\S]+jsr update_sound/);
  assert.match(source, /read_input:[\s\S]+lda STICK0[\s\S]+lda TRIG0/);
  assert.match(source,
    /update_fighter_projectiles:\s+ldx #\$00[\s\S]+cpx #PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT[\s\S]+ldx #INTERCEPTOR_PROJECTILE_SLOT_BASE[\s\S]+cpx #FIGHTER_PROJECTILE_SLOT_COUNT/);
  assert.doesNotMatch(source, /\b(?:bullet_x|bullet_y|bullet_active|refresh_bullet_active)\b/);
  assert.match(source,
    /add_archetype_score:[\s\S]+adc enemy_scores,x[\s\S]+cld[\s\S]+jmp update_score_display/);
  assert.match(source,
    /update_player_death:[\s\S]+@game_over:[\s\S]+jsr insert_top_score/);
  assert.match(source,
    /update_enemy:[\s\S]+jsr update_interceptor_soft_pursuit[\s\S]+update_enemy_animation/);
  assert.match(source,
    /update_interceptor_soft_pursuit:[\s\S]+enemy_velocity_x[\s\S]+jmp clamp_enemy_x/);
});
