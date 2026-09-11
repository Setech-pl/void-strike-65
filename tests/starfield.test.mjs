import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import {
  clearBackgroundOverlay,
  compileStarfield,
  composeStarfield,
  createBackgroundOwnership,
  createStarfieldState,
  loadStarfieldDefinition,
  renderBackgroundOwnership,
  renderStarfieldCa65Include,
  setBackgroundOverlay,
  setStarfieldFullWidth,
  starfieldGeometry,
  stepStarfieldFrame,
  stepStarfieldWorld,
  updateBackgroundOwnership,
} from "../scripts/starfield.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const definitionPath = path.join(root, "assets", "graphics", "starfield.json");
const asset = compileStarfield(loadStarfieldDefinition(definitionPath));
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const generated = fs.readFileSync(path.join(root, "build", "starfield.inc"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const starRuntime = fs.readFileSync(path.join(root, "build", "starfield-runtime.bin"));
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function runtimeBytes(label, length) {
  const offset = labels.get(label) - manifest.starfieldRuntime.runAddress;
  assert.ok(offset >= 0 && offset + length <= starRuntime.length,
    `${label} lies outside relocated starfield runtime`);
  return starRuntime.subarray(offset, offset + length);
}

function counts(screen) {
  return [...screen].reduce((result, code) => {
    if (code >= 1 && code <= 3) result.far += 1;
    if (code >= 4 && code <= 6) result.near += 1;
    return result;
  }, { far: 0, near: 0 });
}

function screenHash(screen) {
  return crypto.createHash("sha256").update(screen).digest("hex");
}

function runBakedFarRow({ phase, fullWidth = false, occupied = [] }) {
  const memory = new Uint8Array(0x10000);
  memory.set(starRuntime, manifest.starfieldRuntime.runAddress);
  const row = 0x6000;
  memory[labels.get("dst_ptr")] = row & 0xff;
  memory[labels.get("dst_ptr") + 1] = row >>> 8;
  memory[labels.get("STAR_FAR_PATTERN_ROW")] = phase;
  memory[labels.get("CAPITAL_SECTOR_STATE")] = fullWidth ? 6 : 0;
  for (const column of occupied) memory[row + column] = 4;

  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >>> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get("generate_baked_far_star_row");
  for (let steps = 0; steps < 10_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, "generate_baked_far_star_row did not return");
  return {
    cycles: cpu.cycles,
    phase: memory[labels.get("STAR_FAR_PATTERN_ROW")],
    row: memory.slice(row, row + starfieldGeometry.screenColumns),
  };
}

test("row-baked asset is deterministic, compact, and assembled byte-for-byte", () => {
  assert.deepEqual({
    seed: asset.generationSeed,
    representation: asset.farLayer.representation,
    farPopulation: asset.farLayer.population,
    farRate: [asset.farLayer.rateNumerator, asset.farLayer.rateDenominator],
    patternRows: asset.farLayer.pattern.rows,
    patternBytes: asset.farLayer.pattern.bytes.length,
    nearRate: [asset.nearLayer.rateNumerator, asset.nearLayer.rateDenominator],
    twinkle: asset.twinkle.enabled,
    glyphBytes: asset.glyphBytes.length,
    mutableStateBytes: asset.stateBytes,
  }, {
    seed: 0xa7,
    representation: "row-baked",
    farPopulation: 29,
    farRate: [1, 1],
    patternRows: 28,
    patternBytes: 29,
    nearRate: [1, 2],
    twinkle: false,
    glyphBytes: 48,
    mutableStateBytes: 2,
  });
  assert.equal(generated, renderStarfieldCa65Include(asset));
  assert.deepEqual([...runtimeBytes("far_baked_pattern", 29)],
    [...asset.farLayer.pattern.bytes]);
  assert.deepEqual([...runtimeBytes("star_glyph_bytes", asset.glyphBytes.length)],
    [...asset.glyphBytes]);
});

test("far glyphs remain dim COLPF1 variants and near glyphs retain bright COLPF0", () => {
  assert.deepEqual(asset.glyphs.map(({ screenCode }) => screenCode), [1, 2, 3, 4, 5, 6]);
  const pixelValues = (glyph) => glyph.bytes.flatMap((byte) =>
    [6, 4, 2, 0].map((shift) => (byte >>> shift) & 3)).filter(Boolean);
  assert.ok(asset.farLayer.glyphs.every((glyph) =>
    pixelValues(glyph).every((value) => value === 2)), "far glyphs select COLPF1");
  assert.ok(asset.nearLayer.glyphs.every((glyph) =>
    pixelValues(glyph).every((value) => value === 1)), "near glyphs select COLPF0");
  assert.deepEqual([manifest.starfield.farLayer.colourRegister,
    manifest.starfield.nearLayer.colourRegister], ["COLPF1", "COLPF0"]);
});

test("one 28-row period always contains exactly 29 far stars", () => {
  const first = createStarfieldState(asset);
  const repeat = createStarfieldState(asset);
  const different = createStarfieldState(asset, { seed: 0x53 });
  assert.equal(screenHash(composeStarfield(asset, first)),
    screenHash(composeStarfield(asset, repeat)));
  assert.notEqual(screenHash(composeStarfield(asset, first)),
    screenHash(composeStarfield(asset, different)), "near generation remains seed-driven");
  assert.equal(counts(composeStarfield(asset, first)).far, 29);

  let state = first;
  for (let step = 0; step < 600; step += 1) {
    state = stepStarfieldWorld(asset, state);
    assert.equal(counts(composeStarfield(asset, state)).far, 29,
      `far density changed at ring step ${step + 1}`);
  }
  assert.equal(state.nearSteps, 600);
  assert.equal(state.farSteps, 600);
});

test("row recycle moves baked stars with the ring and wraps without duplication", () => {
  let state = createStarfieldState(asset);
  for (let step = 0; step < 84; step += 1) {
    const before = composeStarfield(asset, state);
    state = stepStarfieldWorld(asset, state);
    const after = composeStarfield(asset, state);
    for (let row = 1; row < starfieldGeometry.gameplayRows; row += 1) {
      const oldStart = (row - 1) * starfieldGeometry.screenColumns + 9;
      const newStart = row * starfieldGeometry.screenColumns + 9;
      assert.deepEqual([...after.subarray(newStart, newStart + 22)],
        [...before.subarray(oldStart, oldStart + 22)],
        `physical row mapping broke at step ${step + 1}, row ${row}`);
    }
    assert.equal(counts(after).far, 29);
  }
  assert.equal(state.farPatternRow, 0, "three complete pattern periods close exactly");
});

test("capital reconstruction fills full width and post-capital OPEN keeps 29 stars", () => {
  let state = setStarfieldFullWidth(createStarfieldState(asset), true);
  const outsideTrace = [];
  for (let step = 0; step < starfieldGeometry.gameplayRows; step += 1) {
    state = stepStarfieldWorld(asset, state);
    const screen = composeStarfield(asset, state);
    let outside = 0;
    for (let row = 0; row < starfieldGeometry.gameplayRows; row += 1) {
      for (const column of [0, 1, 2, 3, 4, 5, 6, 7, 32, 33, 34, 35, 36, 37, 38, 39]) {
        const code = screen[row * 40 + column];
        if (code >= 1 && code <= 3) outside += 1;
      }
    }
    outsideTrace.push(outside);
    assert.equal(counts(screen).far, 29);
  }
  assert.ok(outsideTrace.some((value) => value > 0),
    "COMPLETE never reconstructed full-width far background");
  for (let step = 0; step < 56; step += 1) {
    state = stepStarfieldWorld(asset, state);
    assert.equal(counts(composeStarfield(asset, state)).far, 29);
  }
});

test("twinkle is inert and cannot restore an independent far writer", () => {
  const state = createStarfieldState(asset);
  assert.equal(stepStarfieldFrame(asset, state).near, state.near);
  assert.equal(asset.twinkle.enabled, false);
  assert.doesNotMatch(source, /tick_star_twinkle:|render_far_star_overlays:|erase_far_star_overlays:/);
});

test("assembled generator is bounded and keeps near-star foreground on collision", () => {
  const ordinary = runBakedFarRow({ phase: 1 });
  const double = runBakedFarRow({ phase: 0 });
  const legalCollision = runBakedFarRow({ phase: 0, occupied: [21] });
  const collision = runBakedFarRow({ phase: 0, occupied: [11, 21] });
  const fullCollision = runBakedFarRow({ phase: 0, fullWidth: true, occupied: [2, 34] });

  assert.deepEqual([ordinary.cycles, double.cycles, legalCollision.cycles,
    collision.cycles, fullCollision.cycles], [105, 175, 206, 233, 215]);
  assert.equal(counts(ordinary.row).far, 1);
  assert.equal(counts(double.row).far, 2);
  assert.equal(counts(legalCollision.row).far, 2);
  assert.equal(counts(legalCollision.row).near, 1);
  assert.equal(counts(collision.row).far, 2);
  assert.equal(counts(collision.row).near, 2);
  assert.equal(counts(fullCollision.row).far, 2);
  assert.equal(counts(fullCollision.row).near, 2);
  assert.deepEqual([ordinary.phase, double.phase], [2, 1]);
  assert.ok(collision.row[11] >= 4 && collision.row[21] >= 4,
    "fallback overwrote the higher-priority near layer");
});

test("fighter corridor keeps baked stars away from hull ownership", () => {
  let state = createStarfieldState(asset);
  for (let step = 0; step < 120; step += 1) {
    const screen = composeStarfield(asset, state);
    for (let row = 0; row < starfieldGeometry.gameplayRows; row += 1) {
      assert.ok(screen.subarray(row * 40, row * 40 + 9).every((code) => code === 0));
      assert.ok(screen.subarray(row * 40 + 31, row * 40 + 40).every((code) => code === 0));
    }
    state = stepStarfieldWorld(asset, state);
  }
  assert.doesNotMatch(source.slice(source.indexOf("handle_collisions:"),
    source.indexOf("update_score_display:")), /STAR_FAR|STAR_NEAR|star_glyph/);
});

test("overlay model restores the current baked background and overlap order", () => {
  let state = createStarfieldState(asset);
  let ownership = createBackgroundOwnership(asset, state);
  const target = composeStarfield(asset, state).findIndex((code) => code !== 0);
  assert.ok(target >= 0);
  ownership = setBackgroundOverlay(ownership, "effect", [{ index: target, code: 0x6d }]);
  ownership = setBackgroundOverlay(ownership, "projectile", [{ index: target, code: 0x7e }]);
  assert.equal(renderBackgroundOwnership(ownership)[target], 0x7e);
  state = stepStarfieldWorld(asset, state);
  ownership = updateBackgroundOwnership(ownership, asset, state);
  ownership = clearBackgroundOverlay(ownership, "projectile");
  assert.equal(renderBackgroundOwnership(ownership)[target], 0x6d);
  ownership = clearBackgroundOverlay(ownership, "effect");
  assert.equal(renderBackgroundOwnership(ownership)[target], ownership.background[target]);
});

test("assembly has no independent far simulation, cache, erase, render, or twinkle path", () => {
  assert.match(source,
    /advance_starfield_layers:[\s\S]+jsr integration_director_world_row[\s\S]+jmp scroll_world_columns/);
  assert.match(source,
    /generate_near_star_row:[\s\S]+@done:\s+jmp generate_baked_far_star_row/);
  assert.match(source,
    /generate_baked_far_star_row:[\s\S]+far_baked_pattern:[\s\S]+EMIT_FAR_STAR_PATTERN/);
  assert.doesNotMatch(source,
    /STAR_FAR_ACTIVE|STAR_FAR_SCREEN_LO|STAR_FAR_SCREEN_HI|advance_far_stars:|tick_star_twinkle:/);
  assert.equal(labels.has("erase_far_star_overlays"), false);
  assert.equal(labels.has("render_far_star_overlays"), false);
  assert.equal(labels.has("advance_far_stars"), false);
});

test("relocated runtime and constrained placement gates remain inside bounds", () => {
  assert.equal(manifest.starfieldRuntime.runAddress, 0x54e4);
  assert.equal(manifest.starfieldRuntime.bytes, 2067);
  assert.ok(manifest.starfieldRuntime.bytes <= manifest.starfieldRuntime.reservedBytes);
  assert.equal(manifest.starfieldRuntime.packedBytes, 1676);
  assert.ok(manifest.starfieldRuntime.packedBytes <= 1819);
  assert.equal(manifest.a2Kernel.bytes, 122);
  assert.ok(manifest.a2Kernel.bytes <= manifest.a2Kernel.reservedBytes);
  assert.equal(manifest.broadsideRuntime.runAddress, 0x5e10);
  assert.equal(manifest.broadsideRuntime.bytes, 6647);
  assert.ok(manifest.broadsideRuntime.bytes <= manifest.broadsideRuntime.reservedBytes);
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 12829);
  assert.ok(manifest.transportCapacity.initialBootEnvelopeBytes >= 0);
  assert.equal(manifest.transportCapacity.manifest.parsed.records[1].packedLength, 852);
  assert.equal(labels.get("ENTITY_CODE_START") & 0xff, 0);
});

test("STARFIELD staging remains disjoint from loader content", () => {
  const stagingStart = manifest.starfieldRuntime.stagingAddress;
  const stagingEnd = stagingStart + manifest.starfieldRuntime.packedBytes - 1;
  const loaderStart = labels.get("loader_bitmap_lzss");
  const loaderEnd = loaderStart + manifest.loaderScreen.packedBitmapBytes - 1;
  const bitmapStart = manifest.loaderScreen.bitmapAddress;
  const bitmapEnd = bitmapStart + manifest.loaderScreen.unpackedBitmapBytes - 1;
  const overlaps = (a0, a1, b0, b1) => a0 <= b1 && b0 <= a1;
  assert.equal(stagingStart, 0x7810);
  assert.ok(stagingEnd < stagingStart + manifest.starfieldRuntime.stagingBytes);
  assert.equal(overlaps(stagingStart, stagingEnd, loaderStart, loaderEnd), false);
  assert.equal(overlaps(stagingStart, stagingEnd, bitmapStart, bitmapEnd), false);
  assert.ok(stagingStart >= manifest.broadsideRuntime.runAddress +
    manifest.broadsideRuntime.reservedBytes);
});
