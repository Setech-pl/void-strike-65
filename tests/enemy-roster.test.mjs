import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compileEnemyRoster,
  ENEMY_IMPLEMENTED_IDS,
  ENEMY_ROSTER_IDS,
  loadEnemyRosterDefinition,
  renderEnemyRosterCa65Include,
} from "../scripts/enemy-roster.mjs";
import { readRuntimeBytes as readAssembledRuntimeBytes } from "../scripts/runtime-image.mjs";
import {
  createEnemyAnchorComparisonPreview,
  createEnemyNativeSpritesPreview,
  createEnemyInterceptorBeforeAfterPreview,
  createEnemyReferenceInventoryPreview,
  createEnemyReviewHarnessPreview,
  createEnemyScannerComparisonPreview,
  inspectPng,
  readEnemyReviewHarnessRuntimeState,
} from "../scripts/preview.mjs";
import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const rosterPath = path.join(rootDirectory, "assets", "graphics", "enemy-roster.json");
const hullsPath = path.join(rootDirectory, "assets", "graphics", "capital-hulls.json");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const lifecycleSource = fs.readFileSync(
  path.join(rootDirectory, "src", "c", "lifecycle.c"), "utf8");
const definition = loadEnemyRosterDefinition(rosterPath);
const asset = compileEnemyRoster(definition, rootDirectory);
const hulls = loadCapitalHullsDefinition(hullsPath);
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json"), "utf8"));
const labels = new Map(
  ["build/void-strike-65.lbl", "build/encounter-director.lbl"]
    .flatMap((file) => fs.readFileSync(path.join(rootDirectory, file), "utf8").split(/\r?\n/))
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function readRuntimeBytes(address, length) {
  return readAssembledRuntimeBytes(rootDirectory, address, length);
}

function hammingDistance(left, right) {
  let bits = 0;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    let value = (left[index] ?? 0) ^ (right[index] ?? 0);
    while (value !== 0) {
      bits += value & 1;
      value >>>= 1;
    }
  }
  return bits;
}

function occupiedPixels(archetype, phase = 0) {
  const points = new Set();
  const accent = archetype.accentFrameBytes.subarray(
    phase * asset.runtime.frameStride,
    (phase + 1) * asset.runtime.frameStride,
  );
  for (let row = 0; row < archetype.height; row += 1) {
    for (let bit = 0; bit < 8; bit += 1) {
      if ((archetype.bodyRows[row] | accent[row]) & (0x80 >>> bit)) {
        points.add(`${row},${bit}`);
      }
    }
  }
  return points;
}

test("ten stable reference identities are inventoried with Unicode-safe existing paths", () => {
  assert.deepEqual(asset.inventory.map(({ id }) => id), ENEMY_ROSTER_IDS);
  assert.equal(asset.inventory.length, 10);
  for (const entry of asset.inventory) {
    assert.equal(entry.reference, entry.reference.normalize("NFC"));
    const bytes = fs.readFileSync(path.join(rootDirectory, entry.reference));
    assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  assert.deepEqual(asset.implemented.map(({ id }) => id), ENEMY_IMPLEMENTED_IDS);
});

test("roster conversion is deterministic and runtime never contains PNG data or chroma green", () => {
  const second = compileEnemyRoster(loadEnemyRosterDefinition(rosterPath), rootDirectory);
  assert.deepEqual(asset.bodyBytes, second.bodyBytes);
  assert.deepEqual(asset.accentBytes, second.accentBytes);
  assert.equal(renderEnemyRosterCa65Include(asset), renderEnemyRosterCa65Include(second));
  assert.deepEqual([...asset.bodyBytes].every((value) => value >= 0 && value <= 0xff), true);
  assert.deepEqual([...asset.accentBytes].every((value) => value >= 0 && value <= 0xff), true);
  assert.doesNotMatch(source, /\.png|PNG_SIGNATURE|readFileSync/);
  assert.deepEqual(
    [asset.runtime.colourPolicy.bodyValue, asset.runtime.colourPolicy.accentValue],
    [0x44, 0x46],
  );
});

test("only three anchors are renderable and unimplemented identities cannot alias Interceptor", () => {
  assert.equal(asset.implemented.length, 3);
  assert.deepEqual(asset.implemented.map(({ releaseEnabled }) => releaseEnabled), [true, false, false]);
  for (const entry of asset.inventory.slice(3)) {
    assert.equal(entry.implemented, false);
    assert.equal(entry.releaseEnabled, false);
    assert.equal(entry.body, undefined);
    assert.equal(entry.accent, undefined);
  }
  const corrupt = structuredClone(definition);
  corrupt.archetypes[3].body = Array(16).fill("11111111");
  assert.throws(() => compileEnemyRoster(corrupt, rootDirectory), /cannot contain runtime field body/);
  assert.match(source, /cmp #ENEMY_IMPLEMENTED_COUNT\s+bcs @invalid/);
});

test("anchor masks are non-empty, structurally distinct, and preserve player-facing orientation", () => {
  const [interceptor, talon, bomber] = asset.implemented;
  assert.equal(interceptor.visibleWidth, 16);
  assert.equal(talon.visibleWidth, 6);
  // 4.5c: SCYTHE_BOMBER is a QUAD (32-HPOS) hull.
  assert.equal(bomber.visibleWidth, 32);
  assert.ok(talon.visibleWidth < interceptor.visibleWidth);
  assert.ok(bomber.occupiedArea > talon.occupiedArea * 1.5);
  assert.ok(interceptor.occupiedArea > talon.occupiedArea);
  assert.ok(hammingDistance(interceptor.bodyRows, talon.bodyRows) >= 30);
  assert.ok(hammingDistance(interceptor.bodyRows, bomber.bodyRows) >= 20);
  assert.ok(hammingDistance(talon.bodyRows, bomber.bodyRows) >= 35);
  for (const archetype of asset.implemented) {
    assert.ok(archetype.occupiedArea > 0);
    assert.ok(archetype.connectedComponents <= 2);
    assert.equal(archetype.bodyRows.at(-1), 0, "a cleared tail byte guarantees cleanup");
    const upperWidth = [...archetype.bodyRows.subarray(0, 10)]
      .reduce((max, value) => Math.max(max, value.toString(2).replaceAll("0", "").length), 0);
    const noseWidth = [...archetype.bodyRows.subarray(archetype.height - 4)]
      .reduce((max, value) => Math.max(max, value.toString(2).replaceAll("0", "").length), 0);
    assert.ok(upperWidth >= noseWidth, `${archetype.id} narrows toward its player-facing lower nose`);
  }
});

test("three scanner phases stay centred inside each native hull envelope", () => {
  for (const archetype of asset.implemented) {
    assert.equal(archetype.frames, 3);
    const centers = [];
    for (let phase = 0; phase < archetype.frames; phase += 1) {
      const accent = archetype.accentFrames[phase];
      const points = [];
      for (let row = 0; row < archetype.height; row += 1) {
        for (let bit = 0; bit < 8; bit += 1) {
          if (accent[row] & (0x80 >>> bit)) points.push([row, bit]);
        }
      }
      assert.ok(points.length > 0);
      assert.ok(points.every(([row, bit]) =>
        archetype.bodyRows[row] !== 0 && bit >= archetype.visibleBits[0] && bit <= archetype.visibleBits[1]));
      centers.push(points.reduce((sum, [, bit]) => sum + bit, 0) / points.length);
    }
    assert.ok(centers.every((center) => center >= 3 && center <= 4));
  }
});

test("assembled descriptor tables and PMG frame bytes exactly match the editable roster", () => {
  const tableCases = [
    ["enemy_frame_heights", asset.implemented.map(({ height }) => height)],
    ["enemy_size_modes", asset.implemented.map(({ sizeCode }) => sizeCode)],
    ["enemy_visible_left_insets", asset.implemented.map(({ visibleLeftInset }) => visibleLeftInset)],
    ["enemy_visible_widths", asset.implemented.map(({ visibleWidth }) => visibleWidth)],
    ["enemy_logical_x_maxs", asset.implemented.map(({ logicalBounds }) => logicalBounds[1])],
    ["enemy_accent_rows", asset.implemented.map(({ accentRow }) => accentRow)],
    ["enemy_projectile_spawn_y_offsets",
      asset.implemented.map(({ projectileSpawnYOffset }) => projectileSpawnYOffset)],
  ];
  for (const [label, expected] of tableCases) {
    assert.deepEqual([...readRuntimeBytes(labels.get(label), expected.length)], expected, label);
  }
  assert.deepEqual([...readRuntimeBytes(labels.get("enemy_body_data"), asset.bodyBytes.length)],
    [...asset.bodyBytes]);
  assert.deepEqual([...readRuntimeBytes(labels.get("enemy_accent_data"), asset.accentBytes.length)],
    [...asset.accentBytes]);
  assert.equal(labels.get("enemy_runtime_data_end") - labels.get("enemy_frame_heights"), 84);
  assert.deepEqual([...readRuntimeBytes(labels.get("_enemy_archetypes"), 12)],
    [1, 0, 1, 5, 15, 60, 50, 40, 1, 1, 0x10, 1],
  "the C Raider record owns gameplay configuration formerly held by ASM tables");
  assert.match(source, /clamp_enemy_x:[\s\S]+cmp #CORRIDOR_LEFT_HPOS/);
  assert.match(source, /draw_enemy:[\s\S]+asl[\s\S]+asl[\s\S]+asl[\s\S]+asl/,
    "fixed sixteen-byte body frames derive their offsets without a resident table");
});

test("per-archetype logical and hardware bounds keep every visible frame in the corridor", () => {
  for (const archetype of asset.implemented) {
    const [logicalMin, logicalMax] = archetype.logicalBounds;
    const [hposMin, hposMax] = archetype.hposBounds;
    assert.equal(logicalMin, asset.runtime.corridor.leftHpos);
    assert.equal(logicalMax + archetype.visibleWidth, asset.runtime.corridor.rightHposExclusive);
    assert.equal(hposMin + archetype.visibleLeftInset, logicalMin);
    assert.equal(hposMax + archetype.visibleLeftInset, logicalMax);
    for (const logicalX of [logicalMin, Math.floor((logicalMin + logicalMax) / 2), logicalMax]) {
      const hpos = logicalX - archetype.visibleLeftInset;
      assert.ok(hpos >= hposMin && hpos <= hposMax);
      for (let phase = 0; phase < archetype.frames; phase += 1) {
        assert.ok(occupiedPixels(archetype, phase).size > 0);
        assert.ok(logicalX >= 80 && logicalX + archetype.visibleWidth <= 176);
      }
    }
  }
});

test("generic erase and rapid type changes leave no stale P1/P2 bytes", () => {
  const p1 = new Uint8Array(256);
  const p2 = new Uint8Array(256);
  let y = 96;
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const current = asset.implemented[iteration % asset.implemented.length];
    const accentOffset = (iteration % current.frames) * asset.runtime.frameStride;
    p1.set(current.bodyRows, y);
    p2.set(current.accentFrameBytes.subarray(accentOffset, accentOffset + current.height), y);
    assert.ok(p1.subarray(y, y + current.height).some(Boolean));
    p1.fill(0, y, y + current.height);
    p2.fill(0, y, y + current.height);
    assert.equal(p1.some(Boolean), false);
    assert.equal(p2.some(Boolean), false);
    y = 80 + (iteration % 8);
  }
});

test("release gameplay remains one Interceptor with the accepted behaviour and score contract", () => {
  assert.equal(asset.runtime.releaseArchetype, "INTERCEPTOR");
  assert.equal(asset.implemented[0].movementProfile, "CURRENT_INTERCEPTOR");
  assert.equal(asset.implemented[0].weaponProfile, "SINGLE_PULSE");
  assert.deepEqual(asset.implemented.slice(1).map(({ weaponProfile }) => weaponProfile),
    ["NONE", "NONE"]);
  assert.deepEqual([asset.implemented[0].hitPoints, asset.implemented[0].score], [1, 10]);
  assert.match(source, /reset_enemy:[\s\S]+jsr HYBRID_ENEMY_SPAWN_RAIDERS/);
  // 4.5c: the roster shape comes from the selected Heavy formation; a fresh
  // game starts on the Raider shape.
  assert.match(lifecycleSource, /ENEMY_ARCHETYPE = ROSTER_SHAPE_RAIDER/);
  assert.match(lifecycleSource,
    /ENEMY_ARCHETYPE = encounter_heavy_roster_shape\[encounter_heavy_index\]/);
  assert.match(source,
    /update_fighter_projectiles:[\s\S]+DAMAGE_PLAYER_PROJECTILE[\s\S]+jsr queue_enemy_damage/);
  assert.match(source, /handle_collisions:[\s\S]+jsr resolve_enemy_damage/);
  assert.match(source, /add_archetype_score_tail:[\s\S]+adc ENEMY_PROFILE_SCORE_BCD/);
  assert.doesNotMatch(source, /ENEMY_ARCHETYPE_TALON\s+sta ENEMY_ARCHETYPE/);
  assert.doesNotMatch(source, /ENEMY_ARCHETYPE_SCYTHE_BOMBER\s+sta ENEMY_ARCHETYPE/);
});

test("PMG ownership preserves one P1/P2 enemy while fighter bursts use playfield glyphs", () => {
  assert.match(source, /sta SIZEP1\s+sta SIZEP2/);
  assert.match(source, /sta HPOSP1\s+sta HPOSP2/);
  assert.match(source, /sta PLAYER1,y[\s\S]+sta PLAYER2,y/);
  assert.match(source, /MISSILE_M0_MASK = \$03/);
  assert.match(source, /missile_masks:\s+\.byte \$0C,\$30,\$C0/);
  assert.doesNotMatch(source.slice(source.indexOf("render_fighter_projectile_overlays:"),
    source.indexOf("; -----------------------------------------------------------------------------\n; Enemy")),
  /MISSILES|HPOSM|SIZEM|COLPM/);
  assert.deepEqual(
    [asset.runtime.colourPolicy.bodyRegister, asset.runtime.colourPolicy.accentRegister],
    ["COLPM1", "COLPM2"],
  );
  assert.equal((asset.implemented[0].flagsByte & 0x01) !== 0, true);
  assert.equal(asset.implemented.slice(1).every(({ flagsByte }) => (flagsByte & 0x02) !== 0), true);
});

test("compile-time review harness cycles anchors but is excluded from the release artifact", () => {
  assert.equal(manifest.buildVariant, "release");
  assert.match(source, /\.if ENEMY_REVIEW_HARNESS[\s\S]+update_enemy_review_harness:/);
  assert.match(source, /\.if ENEMY_REVIEW_HARNESS\s+jmp start_gameplay/);
  assert.match(fs.readFileSync(path.join(rootDirectory, "scripts", "build.mjs"), "utf8"),
    /enemyReviewHarness[\s\S]+ENEMY_REVIEW_HARNESS=1/);
  assert.equal(labels.has("update_enemy_review_harness"), false,
    "normal release labels prove that debug review code was assembled out");
});

test("review sheets are deterministic and consume the same compiled runtime masks", () => {
  const creators = [
    () => createEnemyReferenceInventoryPreview(source),
    () => createEnemyAnchorComparisonPreview(source),
    () => createEnemyNativeSpritesPreview(source),
    () => createEnemyReviewHarnessPreview(source, hulls),
    () => createEnemyScannerComparisonPreview(source),
    () => createEnemyInterceptorBeforeAfterPreview(source),
  ];
  for (const create of creators) {
    const first = create();
    const second = create();
    assert.deepEqual(first, second);
    const details = inspectPng(first);
    assert.ok(details.width > 0 && details.height > 0);
  }
  const harness = readEnemyReviewHarnessRuntimeState(source, hulls);
  assert.equal(harness.panelDefinitions.length, 9);
  for (const panel of harness.panelDefinitions) {
    assert.ok(panel.enemyX >= panel.archetype.logicalBounds[0]);
    assert.ok(panel.enemyX <= panel.archetype.logicalBounds[1]);
  }
});

test("enemy foundation stays inside the accepted payload and relocated-memory gates", () => {
  assert.deepEqual(
    [manifest.enemyRoster.inventoryCount, manifest.enemyRoster.implementedCount,
      manifest.enemyRoster.releaseArchetype],
    [10, 3, "INTERCEPTOR"],
  );
  assert.deepEqual(
    [manifest.enemyRoster.runtimeArtBytes, manifest.enemyRoster.descriptorBytes],
    [57, 33],
  );
  assert.equal(manifest.payloadBudget.historicalRuntimeHeadroom.preservedForHistory, true);
  assert.ok(manifest.payloadBudget.entityEffectsFoundation.actualDeltaBytes <=
    manifest.payloadBudget.entityEffectsFoundation.approvedDeltaBytes);
  assert.ok(manifest.broadsideRuntime.bytes <= manifest.broadsideRuntime.reservedBytes);
  assert.equal(manifest.broadsideRuntime.reservedBytes, 0x1a00);
  assert.equal(crypto.createHash("sha256").update(asset.bodyBytes).digest("hex").length, 64);
});
