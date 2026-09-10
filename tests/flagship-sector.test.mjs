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
import {
  BROADSIDE_STATES,
  CAPITAL_SECTOR_STATES,
  MISSILE_CLEAR_MASKS,
  advanceHullMountedEffects,
  advanceHullScroll,
  advanceProjectile,
  beginLaunchFlash,
  beginCapitalExplosionSound,
  beginCapitalHullExplosion,
  beginWarning,
  capitalExplosionVisual,
  createBroadsideState,
  createWorldScrollState,
  heavyShellVisual,
  hitOppositeHull,
  missileWidth,
  sectorRowForSide,
  simulateBroadsideCadence,
  tickLaunchFlashes,
  tickCapitalExplosionSound,
  tickCapitalHullExplosions,
  updateMissileByte,
  updateMissileSize,
  updateSectorCompletion,
} from "../scripts/broadside.mjs";
import {
  createFlagshipSectorSequencePreview,
  createHeavyShellDetailSequencePreview,
  createCapitalExplosionPokeyTrace,
  createCapitalHullExplosionSequencePreview,
  createEngineBankSequencePreview,
  createEnemyFighterLimitsPreview,
  inspectPng,
  createProwSequencePreview,
  readEngineBankSequenceRuntimeState,
  readEnemyFighterLimitsRuntimeState,
  readFlagshipSectorSequenceRuntimeState,
  readHeavyShellDetailSequenceRuntimeState,
  readCapitalHullExplosionSequenceRuntimeState,
  readProwSequenceRuntimeState,
} from "../scripts/preview.mjs";
import { readRuntimeBytes } from "../scripts/runtime-image.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const definitionPath = path.join(rootDirectory, "assets", "graphics", "capital-hulls.json");
const sourcePath = path.join(rootDirectory, "src", "main.s");
const source = fs.readFileSync(sourcePath, "utf8");
const glueSource = fs.readFileSync(path.join(rootDirectory, "src", "integration-glue.s"), "utf8");
const definition = loadCapitalHullsDefinition(definitionPath);
const asset = compileCapitalHulls(definition);
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function decodeAntic4Byte(byte) {
  return [6, 4, 2, 0].map((shift) => (byte >>> shift) & 0x03);
}

function connectedAreas(pixels, width, height) {
  const visited = new Uint8Array(pixels.length);
  const areas = [];
  for (let start = 0; start < pixels.length; start += 1) {
    if (visited[start] || pixels[start] === 0) continue;
    let area = 0;
    const pending = [start];
    visited[start] = 1;
    while (pending.length > 0) {
      const index = pending.pop();
      area += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (const next of [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1,
      ]) {
        if (next >= 0 && !visited[next] && pixels[next] !== 0) {
          visited[next] = 1;
          pending.push(next);
        }
      }
    }
    areas.push(area);
  }
  return areas.sort((left, right) => right - left);
}

function engineEnergyPixels(side, frameIndex) {
  const width = 8 * 4;
  const height = asset.sector.moduleRows * 8;
  const pixels = new Uint8Array(width * height);
  const masks = asset.sector.engineOverlayMasks.get(side);
  const frame = asset.sector.engineGlyphs.get(side).animationBytes[frameIndex];
  for (let characterRow = 0; characterRow < masks.length; characterRow += 1) {
    for (let characterColumn = 0; characterColumn < 8; characterColumn += 1) {
      if ((masks[characterRow] & (1 << characterColumn)) === 0) continue;
      for (let glyphRow = 0; glyphRow < 8; glyphRow += 1) {
        const values = decodeAntic4Byte(frame[glyphRow]);
        const rowStart = (characterRow * 8 + glyphRow) * width + characterColumn * 4;
        pixels.set(values, rowStart);
      }
    }
  }
  return { pixels, width, height };
}

function popcount(byte) {
  let count = 0;
  for (let value = byte; value !== 0; value >>>= 1) count += value & 1;
  return count;
}

function readLabels() {
  const labels = new Map();
  for (const line of fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)) {
    const match = /^al ([0-9A-Fa-f]{6}) \.([A-Za-z_][A-Za-z0-9_]*)$/.exec(line);
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}

test("finite flagship descriptors traverse one stern and bow through exactly 480 compact rows", () => {
  assert.deepEqual(
    asset.sector.sections.map(({ id, rows, start, end, weaponEligible }) =>
      [id, rows, start, end, weaponEligible]),
    [
      ["engines", 32, 0, 32, false],
      ["aft", 80, 32, 112, true],
      ["combat", 256, 112, 368, true],
      ["forward", 80, 368, 448, true],
      ["prow", 32, 448, 480, false],
    ],
  );
  assert.equal(asset.sector.totalRows, 480);
  assert.equal(asset.sector.moduleRows, 8);
  assert.deepEqual([...asset.sector.moduleSequences.values()].map(({ length }) => length), [60, 60]);
  assert.deepEqual([...asset.sector.moduleSourceRowsBySide.values()].map(({ length }) => length),
    [96, 96]);
  assert.ok(120 + 192 < 480 * 16,
    "module sequences and source-row dictionaries stay far below a raw 480x16 map");
  assert.equal(asset.sector.sections[2].weaponShutdownRows, 0);
});

test("both ships share one finite progression and retain an immutable eight-row phase", () => {
  assert.equal(asset.sector.sidePhaseRows, 8);
  assert.equal(asset.sector.streamRows, 488);
  const seen = { allied: [], enemy: [] };
  for (let streamRow = 0; streamRow < asset.sector.streamRows; streamRow += 1) {
    for (const side of ["allied", "enemy"]) {
      const sideRow = sectorRowForSide(asset, side, streamRow);
      if (sideRow !== null) seen[side].push(sideRow);
    }
    const alliedRow = sectorRowForSide(asset, "allied", streamRow);
    const enemyRow = sectorRowForSide(asset, "enemy", streamRow);
    if (alliedRow !== null && enemyRow !== null) assert.equal(alliedRow - enemyRow, 8);
  }
  assert.deepEqual(seen.allied, Array.from({ length: 480 }, (_, row) => row));
  assert.deepEqual(seen.enemy, Array.from({ length: 480 }, (_, row) => row));
  const world = createWorldScrollState(asset, { difficulty: "hard" });
  let frame = 0;
  while (!world.hullDrained && frame < 2000) {
    frame += 1;
    advanceHullScroll(world, asset);
  }
  assert.equal(world.corridorPhase, 488);
  assert.equal(world.drainRows, 28);
  assert.equal(world.hullAdvances, 516);
  assert.equal(frame, 1032);
});

test("assembled sector dictionaries, sequences, and overlays match the source asset", () => {
  const labels = readLabels();
  const read = (label, length) => readRuntimeBytes(rootDirectory, labels.get(label), length);
  for (const side of ["allied", "enemy"]) {
    assert.deepEqual(
      read(`${side}_sector_module_sources`, asset.sector.moduleSourceRowsBySide.get(side).length),
      Buffer.from(asset.sector.moduleSourceRowsBySide.get(side)),
    );
    assert.deepEqual(
      read(`${side}_sector_sequence`, asset.sector.moduleSequences.get(side).length),
      Buffer.from(asset.sector.moduleSequences.get(side)),
    );
    assert.deepEqual(
      read(`${side}_engine_overlay_masks`, asset.sector.engineOverlayMasks.get(side).length),
      Buffer.from(asset.sector.engineOverlayMasks.get(side)),
    );
    assert.deepEqual(
      read(`${side}_prow_occupancy_masks`, asset.sector.prowOccupancyMasks.get(side).length),
      Buffer.from(asset.sector.prowOccupancyMasks.get(side)),
    );
    assert.deepEqual(
      read(`${side}_prow_collision_boundaries`,
        asset.sector.prowCollisionBoundaries.get(side).length),
      Buffer.from(asset.sector.prowCollisionBoundaries.get(side)),
    );
  }
});

test("seeded layouts expose exact 10/15/20 independent functional cannons", () => {
  const allied = asset.sector.cannonRowsBySide.get("allied");
  const enemy = asset.sector.cannonRowsBySide.get("enemy");
  assert.deepEqual(allied, [33, 65, 81, 97, 113, 137, 169, 185, 209, 225,
    241, 273, 297, 321, 337, 361, 385, 401, 417, 441]);
  assert.deepEqual(enemy, [33, 65, 81, 97, 121, 145, 161, 177, 201, 233,
    249, 273, 289, 305, 337, 361, 385, 409, 425, 441]);
  assert.equal(allied.filter((row) => enemy.includes(row)).length, 9);
  for (const rows of [allied, enemy]) {
    assert.equal(rows.length, 20);
    assert.equal(rows.every((row) => row >= 32 && row < 448), true);
    assert.equal(rows.every((row, index) => index === 0 || row - rows[index - 1] >= 16), true);
  }
  for (const side of ["allied", "enemy"]) {
    assert.deepEqual(["easy", "medium", "hard"].map((difficulty) =>
      asset.sector.cannonRowsByDifficulty.get(side).get(difficulty).length), [10, 15, 20]);
  }
  for (let phase = 0; phase <= asset.sector.totalRows; phase += 1) {
    for (const side of ["allied", "enemy"]) {
      const visible = Array.from({ length: 22 }, (_, offset) => phase - 1 - offset)
        .filter((leftRow) => leftRow >= 0)
        .map((leftRow) => sectorRowForSide(asset, side, leftRow))
        .filter((row) => asset.sector.cannonRowsBySide.get(side).includes(row));
      assert.ok(visible.length <= 2, `${side} phase ${phase} exceeds the two-cannon limit`);
    }
  }
});

test("flagship keeps the further-reduced cadence, warning, speed, damage, and M0 ownership", () => {
  assert.deepEqual([...asset.scheduleBytes], [1, 210, 1, 210, 1, 210, 0, 254]);
  assert.equal(asset.broadside.warningFrames, 25);
  assert.equal(asset.broadside.projectileSpeed, 2);
  assert.equal(asset.broadside.playerDamage, 20);
  assert.deepEqual(asset.broadside.worldScrollRates, { easy: 8, medium: 9, hard: 10 });
  assert.deepEqual(asset.broadside.hullScrollRates, { easy: 8, medium: 9, hard: 10 });
  assert.equal(asset.broadside.hullScrollRateDenominator, 20);
  assert.equal(updateMissileByte(0xff, 1, false), 0xf3);
  assert.equal(updateMissileSize(0x01, 1, 1) & 0x03, 0x01,
    "changing M1 size preserves M0's pair");
});

test("heavy slugs use one connected two-cell six-line playfield lozenge", () => {
  const slot = {
    state: BROADSIDE_STATES.FLYING,
    missile: 2,
    owner: "allied",
    x: 100,
    y: 120,
  };
  assert.deepEqual([0, 1, 2, 3].map((frame) => heavyShellVisual(slot, asset, frame).height),
    [6, 6, 6, 6]);
  assert.deepEqual([0, 1, 2, 3].map((frame) => heavyShellVisual(slot, asset, frame).phase),
    [0, 0, 0, 0]);
  const visual = heavyShellVisual(slot, asset, 0);
  assert.deepEqual([visual.width, visual.height, visual.occupiedPixels,
    visual.connectedObjects, visual.glyphs, visual.renderer],
  [8, 6, 40, 1, [126, 127], "ANTIC4_PLAYFIELD_OVERLAY"]);
  assert.equal(visual.width >= asset.broadside.projectileVisuals.interceptor.widthHpos * 2, true);

  const overlayRoutine = source.slice(
    source.indexOf("render_capital_shell_overlays:"),
    source.indexOf("draw_broadside_span:"),
  ) + glueSource.slice(glueSource.indexOf("render_capital_shell_overlay:"),
    glueSource.indexOf("integration_broadside_release:"));
  assert.match(overlayRoutine,
    /BROAD_PREV_H,x[\s\S]+sta BROAD_PREV_Y,x[\s\S]+iny[\s\S]+sta BROAD_COLLISION,x[\s\S]+CAPITAL_SHELL_LEFT_GLYPH[\s\S]+sta \(dst_ptr\),y[\s\S]+adc #\$01[\s\S]+sta \(dst_ptr\),y/);
  assert.doesNotMatch(overlayRoutine, /COLPM|COLPF|PRIOR|MISSILES/,
    "playfield overlay cannot flicker shared PMG colours or consume M0-M3");
});

test("four-frame launch flash stays hull-attached while the launched shell is independent", () => {
  const state = createBroadsideState(asset);
  const alliedIndex = asset.turrets.findIndex(({ side }) => side === "allied");
  const slot = beginWarning(state, asset, alliedIndex, 0, 5, "allied_turret_a:64");
  for (let frame = 0; frame < 25; frame += 1) advanceProjectile(slot, asset, { frame });
  assert.equal(slot.state, BROADSIDE_STATES.FLYING);
  const flash = beginLaunchFlash(state, asset, 0);
  assert.equal(flash.timer, 4);
  const shellY = slot.y;
  const flashY = flash.y;
  advanceHullMountedEffects(state);
  assert.equal(slot.y, shellY, "a launched shell no longer inherits hull scrolling");
  assert.equal(flash.y, flashY + 8, "launch flash remains attached to its cannon row");
  assert.deepEqual(Array.from({ length: 4 }, () => {
    tickLaunchFlashes(state);
    return flash.timer;
  }), [3, 2, 1, 0]);
  assert.equal(asset.sector.launchFlashFrames, 4);
});

test("engine banks are character-animated, non-weapon modules with no PMG allocation", () => {
  for (const side of ["allied", "enemy"]) {
    const engineGlyph = asset.sector.engineGlyphs.get(side);
    assert.equal(engineGlyph.tags.includes("engine"), true);
    assert.equal(engineGlyph.animationBytes.length, 2);
    assert.equal(new Set(engineGlyph.animationBytes.map((frame) =>
      Buffer.from(frame).toString("hex"))).size, 2);
    assert.equal(engineGlyph.animationBytes.every((frame) =>
      [...frame].flatMap(decodeAntic4Byte).every((pixel) => pixel !== 0)), true,
    `${side} core glyph contains no checkerboard holes`);
    assert.equal(asset.sector.cannonRowsBySide.get(side).some((row) => row >= 448), false);
    assert.ok(asset.sector.engineOverlayMasks.get(side).some((mask) => mask !== 0));
  }
  for (const [side, expectedApertures] of [["allied", 2], ["enemy", 2]]) {
    for (let phase = 0; phase < 2; phase += 1) {
      const grid = engineEnergyPixels(side, phase);
      const areas = connectedAreas(grid.pixels, grid.width, grid.height);
      assert.equal(areas.length, expectedApertures,
        `${side} phase ${phase} must retain ${expectedApertures} separate contiguous cores`);
      assert.equal(areas.every((area) => area >= 12 * 4 * 8), true,
        `${side} phase ${phase} apertures must be capital-ship scale`);
    }
  }
  assert.notDeepEqual(
    asset.sector.engineOverlayMasks.get("allied"),
    asset.sector.engineOverlayMasks.get("enemy"),
    "the two engine banks use different macro layouts",
  );
  const routine = source.slice(
    source.indexOf("update_engine_animation:"),
    source.indexOf("update_sector_completion:"),
  );
  assert.match(routine, /sta CHARSET\+CAPITAL_HULL_ALLIED_ENGINE_GLYPH\*8,x/);
  assert.match(routine, /sta CHARSET\+CAPITAL_HULL_ENEMY_ENGINE_GLYPH\*8,x/);
  assert.doesNotMatch(routine, /PMG|PLAYER[0-3]|MISSILES|HPOS|COLPM|DLI|WSYNC/);
  assert.equal(asset.sector.engineAnimationFrames, 8);
});

test("H4.2 C INDUSTRIAL preserves its structural and immutable data contracts", () => {
  const structuralGlyphNames = [
    "allied_plate_mass", "allied_plate_edge", "allied_plate_lip", "allied_vertical_rib",
    "allied_vent", "allied_service", "allied_inner_edge", "allied_turret_base",
    "allied_turret_housing", "enemy_slab_mass", "enemy_slab_void", "enemy_vertical_rib",
    "enemy_slab_cap", "enemy_seam", "enemy_sensor", "enemy_inner_edge",
    "enemy_turret_base", "enemy_turret_housing",
  ];
  assert.equal(sha256(Buffer.concat(structuralGlyphNames.map((name) =>
    Buffer.from(asset.glyphs.find((glyph) => glyph.name === name).bytes)))),
  "e5dd63f4a702e47000d30f946086b5f5694527338a00a2d854ebaecc19862b36",
  "approved C INDUSTRIAL structural panels changed");

  const changedGlyphNames = new Set([
    "allied_plate_lip", "allied_vertical_rib", "allied_vent", "allied_service",
    "allied_turret_base", "allied_turret_housing", "enemy_slab_void",
    "enemy_vertical_rib", "enemy_slab_cap", "enemy_seam", "enemy_sensor",
    "enemy_turret_base", "enemy_turret_housing",
  ]);
  let checkerboards = 0;
  for (const glyph of asset.glyphs.filter(({ index }) => index <= 80 || index === 85 || index === 86)) {
    const pixels = glyph.pixels.flat();
    const base = glyph.faction === "allied" ? 2 : 3;
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        const [a, b, c, d] = [
          pixels[y * 4 + x], pixels[y * 4 + x + 1],
          pixels[(y + 1) * 4 + x], pixels[(y + 1) * 4 + x + 1],
        ];
        if (a === d && b === c && a !== b) checkerboards += 1;
      }
    }
    if (changedGlyphNames.has(glyph.name)) {
      const detailMask = Uint8Array.from(pixels, (pixel) => pixel === base ? 0 : 1);
      assert.equal(connectedAreas(detailMask, 4, 8).includes(1), false,
        `${glyph.name} must not contain singleton structural detail`);
    }
  }
  assert.equal(checkerboards, 0, "C INDUSTRIAL must remain checkerboard-free");

  let crossGlyphDetailPairs = 0;
  let connectedCrossGlyphDetailPairs = 0;
  const sourceGlyphs = new Map(definition.glyphs.map((glyph) => [glyph.name, glyph]));
  for (const side of ["allied", "enemy"]) {
    const base = side === "allied" ? 2 : 3;
    for (const sourceRow of definition.maps[side].rows) {
      const cells = typeof sourceRow === "string" ? sourceRow.trim().split(/\s+/) : sourceRow;
      for (let column = 0; column < cells.length - 1; column += 1) {
        const left = sourceGlyphs.get(cells[column]);
        const right = sourceGlyphs.get(cells[column + 1]);
        if (!left || !right) continue;
        for (let y = 0; y < 8; y += 1) {
          const a = Number(left.pixels[y][3]);
          const b = Number(right.pixels[y][0]);
          if (a !== base && b !== base) {
            crossGlyphDetailPairs += 1;
            if (a === b) connectedCrossGlyphDetailPairs += 1;
          }
        }
      }
    }
  }
  assert.deepEqual(
    [crossGlyphDetailPairs, connectedCrossGlyphDetailPairs],
    [157, 110],
    "C INDUSTRIAL cross-glyph seams and ribs changed",
  );

  assert.equal(sha256(Buffer.concat([83, 84].flatMap((index) =>
    asset.glyphs.find((glyph) => glyph.index === index).animationBytes.map(Buffer.from)))),
  "19bcf1aadda6a0483653c2c21963d0c658c176760141f91c14154a85267dce70",
  "engine glyphs 83/84 or their phase tables changed");
  assert.equal(sha256(Buffer.concat([87, 88, 89].map((index) =>
    Buffer.from(asset.glyphs.find((glyph) => glyph.index === index).bytes)))),
  "67c5cb64a1d182665ffffbe3764bd7b1fd039fa3e70fed143da9d0e3cd3a15d5",
  "explosion glyphs 87-89 changed");

  const immutableDataHashes = {
    allied: {
      packedMap: "1a2023caff1990326716d34e908fee39d370f7578fe8822d2da660906853d57e",
      codebook: "6a28f6c21aec3df87a49dc11bcd83ddbf7dfe8faaa454744bb41c9bffaa24bbd",
      moduleSequence: "0e4e7aeadf4ad9e00c694478b5b38a192c01424553cf9cfe57d18a0ea1116eff",
      engineMask: "3ca8b33addc3c2b7e5d0433933d35df72418834372d2936bf0c92a6d1fa90540",
    },
    enemy: {
      packedMap: "34880d6f2f22235d6ab415fe52c061623d0d101401efe8041d464a639b7ef732",
      codebook: "acdffb56b2be74db1c8368131226eaa0354de965f192b645e5bfb1f35604b006",
      moduleSequence: "7699903ada6f5d3a1c973ed00fde7d4995de8a328ded8e54b0e8e4a70eba6707",
      engineMask: "61d785f12bfc2cabf806d5bffa974c6bf641363c86b48ecaddc365bb48d9fd4c",
    },
  };
  for (const side of ["allied", "enemy"]) {
    assert.deepEqual({
      packedMap: sha256(asset.packedMaps.get(side)),
      codebook: sha256(asset.codebooks.get(side)),
      moduleSequence: sha256(asset.sector.moduleSequences.get(side)),
      engineMask: sha256(asset.sector.engineOverlayMasks.get(side)),
    }, immutableDataHashes[side], `${side} maps/codebooks/module sequence/engine mask changed`);
  }
});

test("capital-engine phases preserve H4.2 hull glyphs outside declared engine cells", () => {

  for (const side of ["allied", "enemy"]) {
    const engineGlyph = asset.sector.engineGlyphs.get(side);
    const screenRows = asset.sector.sectorScreenRowsBySide.get(side);
    const legalCells = new Set();
    const observedCells = new Set();

    for (let sectorRow = 0; sectorRow < asset.sector.totalRows; sectorRow += 1) {
      const moduleId = asset.sector.moduleIdFor(side, sectorRow);
      if (moduleId === asset.sector.engineModuleIds.get(side)) {
        const mask = asset.sector.engineOverlayMasks.get(side)[sectorRow % asset.sector.moduleRows];
        for (let baseColumn = 0; baseColumn < 8; baseColumn += 1) {
          if (mask & (1 << baseColumn)) {
            const mapColumn = side === "allied" ? baseColumn : baseColumn + 1;
            legalCells.add(`${sectorRow}:${mapColumn}`);
          }
        }
      }
      for (let mapColumn = 0; mapColumn < screenRows[sectorRow].length; mapColumn += 1) {
        if (screenRows[sectorRow][mapColumn] === engineGlyph.screenCode) {
          observedCells.add(`${sectorRow}:${mapColumn}`);
        }
      }
    }

    assert.deepEqual(observedCells, legalCells,
      `${side} engine glyph may occur only in declared engine-overlay cells`);
    assert.equal(asset.decodedMaps.get(side).flat().includes(engineGlyph.screenCode), false,
      `${side} reusable hull map must not share the animated engine glyph`);
    assert.deepEqual(engineGlyph.animationBytes[0], engineGlyph.bytes,
      `${side} phase zero must preserve the accepted c897cf0 engine/nozzle artwork`);

    const stableGlyphs = asset.glyphs.filter(({ screenCode }) =>
      screenCode !== engineGlyph.screenCode).map(({ bytes }) => Buffer.from(bytes));
    for (const phase of [0, 1, 0]) {
      assert.equal(engineGlyph.animationBytes[phase].length, 8,
        `${side} phase ${phase} writes one complete glyph only`);
      assert.deepEqual(
        asset.glyphs.filter(({ screenCode }) => screenCode !== engineGlyph.screenCode)
          .map(({ bytes }) => Buffer.from(bytes)),
        stableGlyphs,
        `${side} phase ${phase} must leave every non-engine hull glyph stable`,
      );
    }
  }
});

test("stern-first modules expand from exhaust into nozzles and finish in tapered bow tips", () => {
  for (const side of ["allied", "enemy"]) {
    const masks = [...asset.sector.engineOverlayMasks.get(side)];
    assert.equal(popcount(masks.at(-1)), 0,
      `${side} energy ends inside its housing before the AFT transition`);
    assert.ok(popcount(masks[0]) < Math.max(...masks.map(popcount)),
      `${side} plume expands into its nozzle mouths`);
    const prowMasks = [...asset.sector.prowOccupancyMasks.get(side)];
    const widths = prowMasks.map(popcount);
    assert.deepEqual([widths[0], widths.at(-1)], [8, 1]);
    assert.equal(widths.every((width, row) => row === 0 || width <= widths[row - 1]), true,
      `${side} bow cannot widen toward its tip`);
    assert.ok(new Set(widths).size >= 7, `${side} prow has a multi-tier taper`);
    assert.ok(new Set(widths.slice(-12)).size >= 3,
      `${side} has its strongest taper in the final twelve rows`);
    assert.equal(asset.sector.cannonRowsBySide.get(side)
      .every((row) => row >= 32 && row < 448), true);
    const edge = asset.sector.prowEdgeGlyphs.get(side);
    const edgeWidths = edge.pixels.map((row) => row.filter((pixel) => pixel !== 0).length);
    assert.ok(Math.min(...edgeWidths) < 4 && Math.max(...edgeWidths) === 4,
      `${side} terminal contour must use real partial ANTIC 4 pixels`);
  }
  assert.notDeepEqual(
    asset.sector.prowOccupancyMasks.get("allied"),
    asset.sector.prowOccupancyMasks.get("enemy"),
    "left armoured wedge and right hostile spear remain structurally distinct",
  );
  assert.deepEqual(
    [...asset.sector.prowCollisionBoundaries.get("allied")].slice(-2),
    [56, 56],
  );
  assert.deepEqual(
    [...asset.sector.prowCollisionBoundaries.get("enemy")].slice(-2),
    [200, 200],
  );
});

test("capital-hull hits create two independent attached red explosions and one sound trigger", () => {
  const explosion = asset.broadside.capitalExplosion;
  assert.deepEqual(
    [explosion.durationFrames, explosion.phaseFrames, explosion.width,
      explosion.height, explosion.phaseCount],
    [24, 4, 3, 3, 6],
  );
  const visuals = [24, 20, 16, 12, 8, 4].map((timer) =>
    capitalExplosionVisual(asset, timer));
  assert.deepEqual(visuals.map(({ occupiedCells }) => occupiedCells), [1, 5, 8, 7, 4, 2]);
  assert.equal(visuals.slice(2, 4).every(({ redCells, occupiedCells }) =>
    redCells > occupiedCells / 2), true);

  const state = createBroadsideState(asset);
  const alliedShell = state.slots[0];
  Object.assign(alliedShell, {
    state: BROADSIDE_STATES.FLYING,
    owner: "allied",
    x: 176,
    y: 112,
  });
  hitOppositeHull(state, alliedShell, asset, {
    targetSide: "enemy",
    screenRow: 10,
    boundaryColumn: 176,
    soundEnabled: true,
  });
  assert.equal(state.capitalExplosions[1].timer, 24);
  assert.equal(state.capitalExplosions[1].triggerCount, 1);
  assert.equal(state.capitalExplosionSound.triggerCount, 1);
  assert.equal(state.capitalExplosionSound.timer, 24);

  const enemyShell = state.slots[1];
  Object.assign(enemyShell, {
    state: BROADSIDE_STATES.FLYING,
    owner: "enemy",
    x: 80,
    y: 136,
  });
  hitOppositeHull(state, enemyShell, asset, {
    targetSide: "allied",
    screenRow: 13,
    boundaryColumn: 80,
    soundEnabled: true,
  });
  assert.deepEqual(state.capitalExplosions.map(({ timer }) => timer), [24, 24]);
  const beforeRows = state.capitalExplosions.map(({ screenRow }) => screenRow);
  advanceHullMountedEffects(state);
  assert.deepEqual(state.capitalExplosions.map(({ screenRow }) => screenRow),
    beforeRows.map((row) => row + 1));
  assert.equal(alliedShell.y, 112, "launched/impact PMG state never inherits hull movement");

  for (let frame = 0; frame < 24; frame += 1) tickCapitalHullExplosions(state);
  assert.deepEqual(state.capitalExplosions.map(({ timer }) => timer), [0, 0]);
});

test("POKEY channel-four crack and rumble is deterministic, decays, and obeys SOUND OFF", () => {
  const state = createBroadsideState(asset);
  assert.equal(beginCapitalExplosionSound(state, asset, true), true);
  const frames = [];
  for (let frame = 0; frame < 24; frame += 1) {
    const sound = tickCapitalExplosionSound(state, asset, true);
    frames.push([sound.frequency, sound.control, sound.control & 0x0f]);
  }
  assert.deepEqual(frames[0], [6, 0x8f, 15]);
  assert.deepEqual(frames.at(-1), [255, 0x81, 1]);
  assert.equal(state.capitalExplosionSound.timer, 0);
  tickCapitalExplosionSound(state, asset, true);
  assert.deepEqual(
    [state.capitalExplosionSound.frequency, state.capitalExplosionSound.control,
      state.capitalExplosionSound.audctl],
    [0, 0, 0],
  );
  beginCapitalExplosionSound(state, asset, true);
  assert.equal(beginCapitalExplosionSound(state, asset, false), false);
  assert.deepEqual(
    [state.capitalExplosionSound.timer, state.capitalExplosionSound.control],
    [0, 0],
  );
  const trace = createCapitalExplosionPokeyTrace(definition).trim().split("\n");
  assert.equal(trace.length, 26);
  assert.equal(trace[1], "0,6,143,0,15");
  assert.equal(trace.at(-1), "24,0,0,0,0");
});

test("assembled explosion tables, restoration, collision isolation, and sound ownership match source", () => {
  const runtime = fs.readFileSync(path.join(rootDirectory, "build", "broadside-runtime.bin"));
  const labels = readLabels();
  const runAddress = labels.get("__BROADSIDE_RUN__");
  const read = (label, length) => runtime.subarray(labels.get(label) - runAddress,
    labels.get(label) - runAddress + length);
  const explosion = asset.broadside.capitalExplosion;
  assert.deepEqual(read("capital_explosion_phases", explosion.phaseBytes.length),
    Buffer.from(explosion.phaseBytes));
  assert.deepEqual(read("capital_explosion_sound_frequency", explosion.durationFrames),
    Buffer.from(explosion.runtimeFrequencyBytes));
  assert.deepEqual(read("capital_explosion_sound_control", explosion.durationFrames),
    Buffer.from(explosion.runtimeControlBytes));
  const effectRoutine = source.slice(
    source.indexOf("begin_capital_hull_explosion:"),
    source.indexOf("capital_shell_collision_flags:"),
  );
  assert.match(effectRoutine, /CAPITAL_EXPLOSION_BACKUP/);
  assert.match(effectRoutine, /cmp #CAPITAL_HULL_GLYPH_BASE/);
  assert.doesNotMatch(effectRoutine, /CORRIDOR_BOUNDARY|collision_boundaries|HITCLR|PMG|COLPM/);
  const soundRoutine = source.slice(source.indexOf("play_capital_explosion_sound:"),
    source.indexOf("tick_capital_explosions:"));
  assert.match(soundRoutine, /sound_enabled[\s\S]+AUDCTL[\s\S]+CAPITAL_EXPLOSION_SOUND_TIMER/);
  assert.doesNotMatch(soundRoutine, /COLPM|COLPF|SIZEM|PRIOR/);
  assert.match(source, /@hit:\s+lda hit_timer\s+beq @capital[\s\S]+@capital:\s+lda CAPITAL_EXPLOSION_SOUND_TIMER/,
    "an idle hit channel must still advance and release the capital SFX channel");
  assert.match(source, /AUDF4\s*= \$D206[\s\S]+AUDC4\s*= \$D207/);
});

test("drain blocks new warnings and reaches COMPLETE only after every attached effect", () => {
  const cadenceAtEnd = simulateBroadsideCadence(asset, { frames: 2000, difficulty: "hard" });
  const cadenceMuchLater = simulateBroadsideCadence(asset, { frames: 10000, difficulty: "hard" });
  assert.equal(cadenceAtEnd.finalSectorState, CAPITAL_SECTOR_STATES.COMPLETE);
  assert.equal(cadenceAtEnd.finalCorridorPhase, 488);
  assert.equal(cadenceAtEnd.drainRows, 28);
  assert.deepEqual(cadenceMuchLater.warningStarts, cadenceAtEnd.warningStarts,
    "no cannon event is created after the engine section");

  const world = createWorldScrollState(asset, {
    difficulty: "hard",
    initialSectorPhase: asset.sector.streamRows,
  });
  world.hullDrained = true;
  world.drainRows = 28;
  world.sectorState = CAPITAL_SECTOR_STATES.DRAIN;
  const state = createBroadsideState(asset);
  state.slots[0].state = BROADSIDE_STATES.FLYING;
  state.launchFlashes[0].timer = 1;
  assert.equal(updateSectorCompletion(world, state), CAPITAL_SECTOR_STATES.DRAIN);
  state.slots[0].state = BROADSIDE_STATES.FREE;
  assert.equal(updateSectorCompletion(world, state), CAPITAL_SECTOR_STATES.DRAIN);
  state.launchFlashes[0].timer = 0;
  state.capitalExplosions[0].timer = 1;
  assert.equal(updateSectorCompletion(world, state), CAPITAL_SECTOR_STATES.DRAIN);
  state.capitalExplosions[0].timer = 0;
  assert.equal(updateSectorCompletion(world, state), CAPITAL_SECTOR_STATES.COMPLETE);

  for (const [difficulty, completeFrame] of [
    ["easy", 1290],
    ["medium", 1147],
    ["hard", 1032],
  ]) {
    assert.notEqual(
      simulateBroadsideCadence(asset, { frames: completeFrame - 1, difficulty }).finalSectorState,
      CAPITAL_SECTOR_STATES.COMPLETE,
    );
    assert.equal(
      simulateBroadsideCadence(asset, { frames: completeFrame, difficulty }).finalSectorState,
      CAPITAL_SECTOR_STATES.COMPLETE,
    );
  }
});

test("section and heavy-shell previews are deterministic source-derived evidence", () => {
  const sectorState = readFlagshipSectorSequenceRuntimeState(source, definition);
  assert.deepEqual(sectorState.panelDefinitions.map(({ state }) => state),
    ["ENGINES", "AFT", "COMBAT", "FORWARD", "PROW", "PROW", "DRAIN", "COMPLETE"]);
  const complete = sectorState.panelDefinitions.at(-1).screen;
  for (let row = 2; row < 24; row += 1) {
    assert.equal(complete.slice(row * 40, row * 40 + 8).every((code) => code === 0), true);
    assert.equal(complete.slice(row * 40 + 32, row * 40 + 40).every((code) => code === 0), true);
  }
  const shellState = readHeavyShellDetailSequenceRuntimeState(source, definition);
  assert.deepEqual(shellState.panelDefinitions.map(({ label }) => label), [
    "ALLIED HOT WARNING  FRAME 24",
    "ALLIED LAUNCH FLASH  FRAME 25",
    "ALLIED SLUG COMPACT  FRAME 27",
    "ALLIED SLUG FULL  FRAME 29",
    "ENEMY LAUNCH FLASH  FRAME 25",
    "HEAVY IMPACT  FIVE FRAME STATE",
  ]);
  const sectorPng = createFlagshipSectorSequencePreview(source, definition);
  const shellPng = createHeavyShellDetailSequencePreview(source, definition);
  const explosionState = readCapitalHullExplosionSequenceRuntimeState(source, definition);
  const explosionPng = createCapitalHullExplosionSequencePreview(source, definition);
  assert.deepEqual([inspectPng(sectorPng).width, inspectPng(sectorPng).height], [1920, 1272]);
  assert.deepEqual([inspectPng(shellPng).width, inspectPng(shellPng).height], [1920, 848]);
  assert.deepEqual(explosionState.panelDefinitions.map(({ explosion }) => explosion.phase),
    [0, 1, 2, 3, 4, 5]);
  assert.deepEqual([inspectPng(explosionPng).width, inspectPng(explosionPng).height], [1920, 848]);
  assert.equal(sha256(sectorPng), sha256(createFlagshipSectorSequencePreview(source, definition)));
  assert.equal(sha256(shellPng), sha256(createHeavyShellDetailSequencePreview(source, definition)));
  assert.equal(sha256(explosionPng),
    sha256(createCapitalHullExplosionSequencePreview(source, definition)));
});

test("engine, prow, and fighter-limit review sheets render the actual final runtime data", () => {
  const engineState = readEngineBankSequenceRuntimeState(source, definition);
  assert.deepEqual(engineState.panelDefinitions.map(({ phase }) => phase),
    [0, 1, 0, 1, 1, 1]);
  const enginePng = createEngineBankSequencePreview(source, definition);
  assert.deepEqual([inspectPng(enginePng).width, inspectPng(enginePng).height], [1920, 848]);
  assert.equal(sha256(enginePng), sha256(createEngineBankSequencePreview(source, definition)));

  const prowState = readProwSequenceRuntimeState(source, definition);
  assert.deepEqual(prowState.panelDefinitions.map(({ sectorPhase }) => sectorPhase),
    [214, 222, 230, 240, 248, 249]);
  assert.equal(prowState.panelDefinitions.at(-1).label, "BOTH TIPS THEN EMPTY");
  const prowPng = createProwSequencePreview(source, definition);
  assert.deepEqual([inspectPng(prowPng).width, inspectPng(prowPng).height], [1920, 848]);

  const fighterState = readEnemyFighterLimitsRuntimeState(source, definition);
  assert.deepEqual(
    [fighterState.corridorLeft, fighterState.corridorRight, fighterState.visibleWidth],
    [80, 176, 16],
  );
  assert.deepEqual(fighterState.envelopes, [
    { origin: 80, left: 80, rightExclusive: 96 },
    { origin: 160, left: 160, rightExclusive: 176 },
  ]);
  const fighterPng = createEnemyFighterLimitsPreview(source, definition);
  assert.deepEqual([inspectPng(fighterPng).width, inspectPng(fighterPng).height], [1280, 424]);
  assert.equal(sha256(fighterPng),
    sha256(createEnemyFighterLimitsPreview(source, definition)));
});
