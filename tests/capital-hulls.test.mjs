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

  const badPixel = structuredClone(definition);
  badPixel.glyphs[0].pixels[0] = "4222";
  assert.throws(() => compileCapitalHulls(badPixel), /invalid pixel/);
  const wrongFactionBank = structuredClone(definition);
  wrongFactionBank.glyphs.find(({ name }) => name === "enemy_slab_mass").screenBank = "pf2";
  assert.throws(() => compileCapitalHulls(wrongFactionBank), /faction's ANTIC 4 colour bank/);
  const unknownGlyph = structuredClone(definition);
  unknownGlyph.maps.allied.rows[0] = unknownGlyph.maps.allied.rows[0].replace(
    "allied_plate_lip",
    "unknown_hull_glyph",
  );
  assert.throws(() => compileCapitalHulls(unknownGlyph), /unknown glyph/);
  const missingMuzzle = structuredClone(definition);
  missingMuzzle.turrets.pop();
  assert.throws(() => compileCapitalHulls(missingMuzzle), /at least one complete turret/);
  const orphanMuzzle = structuredClone(definition);
  orphanMuzzle.maps.allied.rows[0] = orphanMuzzle.maps.allied.rows[0].replace(
    /space$/,
    "allied_turret_muzzle",
  );
  assert.throws(() => compileCapitalHulls(orphanMuzzle), /projection and muzzle metadata disagree/);
  const noisyContour = structuredClone(definition);
  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    const sourceRow = rowIndex & 1 ? 11 : 1;
    noisyContour.maps.allied.rows[rowIndex] = definition.maps.allied.rows[sourceRow];
    noisyContour.maps.allied.innerDepth[rowIndex] = definition.maps.allied.innerDepth[sourceRow];
  }
  assert.throws(() => compileCapitalHulls(noisyContour), /principal depth transitions/);
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
  assert.deepEqual(
    readXexBytes(labels.get("enemy_hull_codebook"), 16),
    Buffer.from(asset.codebooks.get("enemy")),
  );
  assert.deepEqual(
    readXexBytes(labels.get("allied_hull_packed_map"), 160),
    Buffer.from(asset.packedMaps.get("allied")),
  );
  assert.deepEqual(
    readXexBytes(labels.get("enemy_hull_packed_map"), 160),
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
  assert.ok(contourDifferences.filter(Boolean).length >= 16);
  assert.deepEqual([...new Set(asset.depthsBySide.get("allied"))].sort(), [5, 6, 7, 8]);
  assert.deepEqual([...new Set(asset.depthsBySide.get("enemy"))].sort(), [5, 6, 7, 8]);
  assert.deepEqual(Object.fromEntries(asset.contourTransitionCounts), { allied: 7, enemy: 7 });
  for (const lengths of asset.depthRunLengthsBySide.values()) {
    assert.ok(lengths.every((length) => length >= 2 && length <= 8));
  }
  assert.notDeepEqual(
    transitionRows(asset.depthsBySide.get("allied")),
    transitionRows(asset.depthsBySide.get("enemy")),
  );
});

test("turret metadata points to complete multi-cell emplacements and real muzzle tips", () => {
  assert.deepEqual(
    asset.turrets.map(({ id, segmentRow, muzzleColumn }) => [id, segmentRow, muzzleColumn]),
    [
      ["allied_turret_a", 8, 8],
      ["enemy_turret_a", 12, 31],
    ],
  );
  assert.equal(asset.turrets.filter(({ side }) => side === "allied").length, 1);
  assert.equal(asset.turrets.filter(({ side }) => side === "enemy").length, 1);
  assert.equal((4 - asset.turrets.length) / 4, 0.5,
    "functional source turret density is reduced exactly 50 percent");
  assert.deepEqual(asset.turrets.map(({ side, segmentRow }) => [side, segmentRow]), [
    ["allied", 8],
    ["enemy", 12],
  ], "the two sides are deliberately staggered rather than mirrored");
  assert.deepEqual(asset.schedule.map(({ side, delayAfterFrames }) =>
    [side, delayAfterFrames]), [
    ["enemy", 210],
    ["enemy", 210],
    ["enemy", 210],
    ["allied", 254],
  ]);
  for (const turret of asset.turrets) {
    const relative = turret.side === "allied" ? turret.muzzleColumn : turret.muzzleColumn - 31;
    const screenCode = asset.decodedMaps.get(turret.side)[turret.segmentRow][relative];
    const glyph = asset.glyphs.find((candidate) => candidate.screenCode === screenCode);
    assert.ok(glyph.tags.includes("muzzle"));
    assert.ok(turret.footprint.base.length >= 4);
    assert.ok(turret.footprint.housing.length >= 1);
    assert.ok(turret.footprint.barrel.length >= 2);
  }
  for (const side of ["allied", "enemy"]) {
    const projectionRows = asset.decodedMaps.get(side)
      .flatMap((row, index) => row[side === "allied" ? 8 : 0] === 0 ? [] : [index]);
    assert.deepEqual(projectionRows,
      asset.turrets.filter((turret) => turret.side === side).map((turret) => turret.segmentRow),
      `${side} removed cannon sites contain structure, not misleading muzzle projections`);
    assert.ok(projectionRows.length <= 2,
      `${side} exposes at most two functional cannon projections per 32-row segment`);
    for (let phase = 0; phase < asset.segmentRows; phase += 1) {
      const visible = Array.from({ length: 22 }, (_, offset) =>
        (phase + offset) & (asset.segmentRows - 1));
      assert.ok(projectionRows.filter((row) => visible.includes(row)).length <= 2,
        `${side} phase ${phase} exceeds the visible functional-cannon limit`);
    }
  }
});

test("accepted H4.2 C INDUSTRIAL armour remains steel-led allied and dark-red enemy", () => {
  const allied = colorCounts("allied");
  const enemy = colorCounts("enemy");
  const alliedTotal = allied.reduce((sum, count) => sum + count, 0);
  const enemyTotal = enemy.reduce((sum, count) => sum + count, 0);
  assert.ok(allied[2] / alliedTotal >= 0.65 && allied[2] / alliedTotal <= 0.83);
  assert.ok(enemy[3] / enemyTotal >= 0.70 && enemy[3] / enemyTotal <= 0.75);
  assert.ok(enemy[2] / enemyTotal >= 0.08 && enemy[2] / enemyTotal <= 0.12);
  assert.ok(enemy[1] / enemyTotal <= 0.05);
  assert.ok(enemy[0] > allied[0] * 1.25);
  assert.ok(allied[1] > enemy[1] * 10);
  assert.ok(enemy[0] / enemyTotal >= 0.15);
  assert.ok(allied[3] / alliedTotal < 0.01);
});

test("assembled ANTIC 4 screen codes route allied steel and enemy burgundy effectively", () => {
  const state = readCapitalHullsStripRuntimeState(source, definition);
  const glyphs = new Map(asset.glyphs.map((glyph) => [glyph.name, glyph]));
  const alliedMass = glyphs.get("allied_plate_mass");
  const enemyMass = glyphs.get("enemy_slab_mass");
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
  assert.equal(state.registerPixels[locate(alliedMass.screenCode, 2)], 0x84);
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
