import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
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
  const farCodes = new Set(asset.farLayer.glyphs.map(({ screenCode }) => screenCode));
  const nearCodes = new Set(asset.nearLayer.glyphs.map(({ screenCode }) => screenCode));
  return [...screen].reduce((result, code) => {
    if (farCodes.has(code)) result.far += 1;
    if (nearCodes.has(code)) result.near += 1;
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

function runRoutine(memory, name, { accumulator = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >>> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.a = accumulator;
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing linked routine ${name}`);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu.cycles;
}

function runRange(memory, startName, endName) {
  const cpu = new Nmos6502(memory);
  cpu.pc = labels.get(startName);
  const stop = labels.get(endName);
  assert.ok(Number.isInteger(cpu.pc) && Number.isInteger(stop),
    `missing linked range ${startName}..${endName}`);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${startName} did not reach ${endName}`);
  return cpu.cycles;
}

function createTwoLayerRuntime() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  runRoutine(memory, "init_playfield_row_table");
  runRoutine(memory, "init_starfield_state");
  memory[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  return memory;
}

function countRenderedNear(memory) {
  const divider = memory.subarray(0x4028, 0x4028 + 40);
  const ring = memory.subarray(0x8140, 0x8140 + 27 * 40);
  return [...divider, ...ring].filter((code) => code === asset.nearLayer.glyphs[0].screenCode).length;
}

test("row-baked asset is deterministic, compact, and assembled byte-for-byte", () => {
  assert.deepEqual({
    seed: asset.generationSeed,
    representation: asset.farLayer.representation,
    farPopulation: asset.farLayer.population,
    farRate: [asset.farLayer.rateNumerator, asset.farLayer.rateDenominator],
    patternRows: asset.farLayer.pattern.rows,
    patternBytes: asset.farLayer.pattern.bytes.length,
    nearRepresentation: asset.nearLayer.representation,
    nearPopulation: asset.nearLayer.population,
    nearSpeed: asset.nearLayer.speedPixelsPerFrame,
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
    nearRepresentation: "sparse-dynamic",
    nearPopulation: 4,
    nearSpeed: 8,
    twinkle: false,
    glyphBytes: 16,
    mutableStateBytes: 18,
  });
  assert.equal(generated, renderStarfieldCa65Include(asset));
  assert.deepEqual([...runtimeBytes("far_baked_pattern", 29)],
    [...asset.farLayer.pattern.bytes]);
  assert.deepEqual([...runtimeBytes("star_glyph_bytes", asset.glyphBytes.length)],
    [...asset.glyphBytes]);
});

test("far glyphs remain dim COLPF1 variants and near glyphs retain bright COLPF0", () => {
  assert.deepEqual(asset.glyphs.map(({ screenCode }) => screenCode), [1, 2]);
  const pixelValues = (glyph) => glyph.bytes.flatMap((byte) =>
    [6, 4, 2, 0].map((shift) => (byte >>> shift) & 3)).filter(Boolean);
  assert.ok(asset.farLayer.glyphs.every((glyph) =>
    pixelValues(glyph).every((value) => value === 2)), "far glyphs select COLPF1");
  assert.ok(asset.nearLayer.glyphs.every((glyph) =>
    pixelValues(glyph).every((value) => value === 1)), "near glyphs select COLPF0");
  assert.ok(asset.nearLayer.glyphs.every((glyph) =>
    glyph.bytes.filter(Boolean).length === 1), "near glyphs stay single-scanline points");
  assert.ok(asset.farLayer.pattern.glyphs.every((id) => id === "DIM"),
    "one shared fine-phase glyph prevents vertically paired phase variants");
  assert.deepEqual([manifest.starfield.farLayer.colourRegister,
    manifest.starfield.nearLayer.colourRegister], ["COLPF1", "COLPF0"]);
});

test("one 28-row period always contains exactly 29 far stars", () => {
  const first = createStarfieldState(asset);
  const repeat = createStarfieldState(asset);
  assert.equal(screenHash(composeStarfield(asset, first)),
    screenHash(composeStarfield(asset, repeat)));
  assert.equal(counts(first.near).far, 29);
  assert.equal(first.dynamicNear.length, 4);

  let state = first;
  for (let step = 0; step < 600; step += 1) {
    state = stepStarfieldWorld(asset, state);
    assert.equal(counts(state.near).far, 29,
      `far density changed at ring step ${step + 1}`);
  }
  assert.equal(state.nearSteps, 600);
  assert.equal(state.farSteps, 600);
});

test("the four sparse near lanes never collide with the baked far pattern", () => {
  const nearColumns = new Set(asset.nearLayer.initialColumns);
  const bakedColumns = [...asset.farLayer.pattern.bytes].map((packed) =>
    9 + (packed & 0x3f) % 22);
  assert.ok(bakedColumns.every((column) => !nearColumns.has(column)));
  let state = createStarfieldState(asset);
  let accumulator = 0;
  for (let frame = 0; frame < 600; frame += 1) {
    state = stepStarfieldFrame(asset, state);
    accumulator += 9;
    if (accumulator >= 20) {
      accumulator -= 20;
      state = stepStarfieldWorld(asset, state);
    }
    assert.equal(counts(composeStarfield(asset, state)).near, 4);
  }
});

test("row recycle moves baked stars with the ring and wraps without duplication", () => {
  let state = createStarfieldState(asset);
  for (let step = 0; step < 84; step += 1) {
    const before = state.near;
    state = stepStarfieldWorld(asset, state);
    const after = state.near;
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

test("shared far fine phase stays locked to every authoritative scroll rate", () => {
  for (const rate of [8, 9, 10]) {
    let accumulator = 0;
    let coarseRows = 0;
    let previousPosition = 0;
    let maximumStep = 0;
    for (let frame = 0; frame < 200; frame += 1) {
      accumulator += rate;
      if (accumulator >= 20) {
        accumulator -= 20;
        coarseRows += 1;
      }
      const phase = accumulator >>> 2;
      assert.ok(phase >= 0 && phase <= 4);
      const position = coarseRows * 8 + phase;
      maximumStep = Math.max(maximumStep, position - previousPosition);
      previousPosition = position;
    }
    assert.ok(maximumStep <= 6, `difficulty rate ${rate} produced an ${maximumStep}-line jump`);
    assert.equal(previousPosition / 200, rate * 8 / 20,
      `difficulty rate ${rate} drifted from the authoritative ring clock`);
  }
});

test("sparse near layer moves independently, wraps, and has bounded 6502 cost", () => {
  const memory = createTwoLayerRuntime();
  const initialRows = [...memory.subarray(labels.get("STAR_NEAR_ROW"),
    labels.get("STAR_NEAR_ROW") + asset.nearLayer.population)];
  const renderCycles = runRoutine(memory, "render_dynamic_near_star_overlays");
  const eraseCycles = runRoutine(memory, "erase_dynamic_near_star_overlays");
  memory[labels.get("scroll_accumulator")] = 19;
  const farOnly = createTwoLayerRuntime();
  farOnly[labels.get("scroll_accumulator")] = 19;
  const farCycles = runRange(farOnly, "update_far_star_fine_phase",
    "update_far_star_fine_phase_end");
  const updateCycles = runRoutine(memory, "update_two_layer_starfield_phases");
  const movedRows = [...memory.subarray(labels.get("STAR_NEAR_ROW"),
    labels.get("STAR_NEAR_ROW") + asset.nearLayer.population)];
  assert.deepEqual(movedRows, initialRows.map((row) => (row + 1) % 28));
  assert.equal(memory[labels.get("STAR_FAR_FINE_PHASE")], 1);
  const rerenderCycles = runRoutine(memory, "render_dynamic_near_star_overlays");
  const ringMemory = createTwoLayerRuntime();
  runRoutine(ringMemory, "render_dynamic_near_star_overlays");
  runRoutine(ringMemory, "erase_dynamic_near_star_overlays");
  runRoutine(ringMemory, "update_two_layer_starfield_phases");
  ringMemory[labels.get("STAR_NEAR_RING_ADVANCED")] = 1;
  const ringRenderCycles = runRoutine(ringMemory, "render_dynamic_near_star_overlays");
  const recycleMemory = createTwoLayerRuntime();
  recycleMemory[labels.get("dst_ptr")] = 0x00;
  recycleMemory[labels.get("dst_ptr") + 1] = 0x60;
  const recycleCycles = runRoutine(recycleMemory, "restore_recycled_row_near_underlay");
  assert.deepEqual([eraseCycles, farCycles, updateCycles, renderCycles, rerenderCycles],
    [155, 47, 122, 415, 407]);
  assert.equal(ringRenderCycles, 263);
  assert.equal(recycleCycles, 90);
  const nearAdvanceCycles = updateCycles - farCycles;
  const nearNoRingPeak = eraseCycles + nearAdvanceCycles + rerenderCycles;
  const nearRingPeak = eraseCycles + nearAdvanceCycles + ringRenderCycles;
  const nearAdditionalOverRowBaked = nearNoRingPeak - 151;
  const totalStarfieldPeak = Math.max(nearNoRingPeak + farCycles,
    nearRingPeak + farCycles + 136 + recycleCycles);
  assert.equal(nearNoRingPeak, 637);
  assert.equal(nearRingPeak, 493);
  assert.equal(nearAdditionalOverRowBaked, 486);
  assert.equal(totalStarfieldPeak, 766);
  assert.ok(nearAdditionalOverRowBaked <= 500,
    "sparse dynamic near layer exceeds net-additional PASS gate");
  assert.ok(4221 - totalStarfieldPeak >= 3400,
    "visibility fix failed to retain the large majority of the row-baked saving");
  assert.ok(totalStarfieldPeak <= 900, "two-layer starfield exceeds hard total gate");
});

test("published near survives ANTIC and OLD/NEW addresses survive 1000 fighter frames", () => {
  const memory = createTwoLayerRuntime();
  runRoutine(memory, "render_dynamic_near_star_overlays");
  for (let frame = 0; frame < 1000; frame += 1) {
    // This observation point models the next ANTIC pass: OLD must still be
    // present until the following post-playfield publication window.
    assert.equal(countRenderedNear(memory), 4, `near was invisible to ANTIC at frame ${frame}; rows=${[
      ...memory.subarray(labels.get("STAR_NEAR_ROW"), labels.get("STAR_NEAR_ROW") + 4),
    ]}; lo=${[...memory.subarray(labels.get("STAR_NEAR_SCREEN_LO"),
      labels.get("STAR_NEAR_SCREEN_LO") + 4)]}; hi=${[
      ...memory.subarray(labels.get("STAR_NEAR_SCREEN_HI"), labels.get("STAR_NEAR_SCREEN_HI") + 4),
    ]}`);
    runRoutine(memory, "update_two_layer_starfield_phases");
    const rotated = frame % 3 === 2;
    memory[labels.get("STAR_NEAR_RING_ADVANCED")] = rotated ? 1 : 0;
    if (rotated) runRoutine(memory, "rotate_playfield_rows");
    runRoutine(memory, "erase_dynamic_near_star_overlays");
    assert.equal(countRenderedNear(memory), 0, `stale/cloned near cell at frame ${frame}`);
    runRoutine(memory, "render_dynamic_near_star_overlays");
  }
});

test("near erase and render share the post-playfield projectile publication window", () => {
  const publication = source.slice(source.indexOf("publish_fighter_projectile_overlays:"),
    source.indexOf("fighter_projectile_publication_end = *"));
  assert.match(publication,
    /fighter_projectile_publication_begin = \*[\s\S]+jsr erase_dynamic_near_star_overlays[\s\S]+jsr erase_fighter_projectile_overlays[\s\S]+jmp render_dynamic_near_star_overlays/);
  const frameStart = source.slice(source.indexOf("entity_effects_erase_with_two_layer_starfield:"),
    source.indexOf("update_two_layer_starfield_phases:"));
  assert.doesNotMatch(frameStart, /erase_dynamic_near_star_overlays/);
});

test("capital freezes near motion and invalidates cached cells before fighter reconstruction", () => {
  const memory = createTwoLayerRuntime();
  runRoutine(memory, "render_dynamic_near_star_overlays");
  runRoutine(memory, "erase_dynamic_near_star_overlays");
  const rows = [...memory.subarray(labels.get("STAR_NEAR_ROW"),
    labels.get("STAR_NEAR_ROW") + 4)];
  memory[labels.get("CAPITAL_SECTOR_STATE")] = 1;
  runRoutine(memory, "update_two_layer_starfield_phases");
  assert.deepEqual([...memory.subarray(labels.get("STAR_NEAR_ROW"),
    labels.get("STAR_NEAR_ROW") + 4)], rows);
  assert.deepEqual([...memory.subarray(labels.get("STAR_NEAR_SCREEN_HI"),
    labels.get("STAR_NEAR_SCREEN_HI") + 4)], [0, 0, 0, 0]);
  assert.equal(runRoutine(memory, "render_dynamic_near_star_overlays"), 14);

  memory[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  runRoutine(memory, "update_two_layer_starfield_phases");
  runRoutine(memory, "render_dynamic_near_star_overlays");
  assert.equal(countRenderedNear(memory), 4);
});

test("pause preserves the rendered playfield and cannot advance either star clock", () => {
  const pausePath = source.slice(source.indexOf("enter_pause:"),
    source.indexOf("pause_silence_audio:"));
  assert.match(pausePath, /jsr backup_gameplay_screen/);
  assert.match(pausePath, /resume_gameplay:[\s\S]+jsr restore_gameplay_screen/);
  assert.doesNotMatch(pausePath,
    /scroll_accumulator|STAR_NEAR_ROW|STAR_FAR_FINE_PHASE|update_two_layer_starfield_phases/);
});

test("assembled baked generator is bounded without a dynamic occupancy pass", () => {
  const ordinary = runBakedFarRow({ phase: 1 });
  const double = runBakedFarRow({ phase: 0 });
  const fullWidth = runBakedFarRow({ phase: 0, fullWidth: true });

  assert.deepEqual([ordinary.cycles, double.cycles, fullWidth.cycles], [83, 136, 119]);
  assert.equal(counts(ordinary.row).far, 1);
  assert.equal(counts(double.row).far, 2);
  assert.equal(counts(fullWidth.row).far, 2);
  assert.deepEqual([ordinary.phase, double.phase], [2, 1]);
  assert.doesNotMatch(source.slice(source.indexOf("draw_baked_far_star:"),
    source.indexOf("far_baked_pattern:")), /cmp \(dst_ptr\),y|STAR_NEAR/);
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
  assert.doesNotMatch(source, /generate_near_star_row:/);
  assert.match(source,
    /generate_baked_far_star_row:[\s\S]+far_baked_pattern:[\s\S]+EMIT_FAR_STAR_PATTERN/);
  assert.match(source, /update_far_star_fine_phase:[\s\S]+CHARSET\+STAR_FAR_DIM\*8/);
  assert.match(source, /render_dynamic_near_star_overlays:/);
  assert.doesNotMatch(source,
    /STAR_FAR_ACTIVE|STAR_FAR_SCREEN_LO|STAR_FAR_SCREEN_HI|advance_far_stars:|tick_star_twinkle:/);
  assert.equal(labels.has("erase_far_star_overlays"), false);
  assert.equal(labels.has("render_far_star_overlays"), false);
  assert.equal(labels.has("advance_far_stars"), false);
});

test("relocated runtime and constrained placement gates remain inside bounds", () => {
  assert.equal(manifest.starfieldRuntime.runAddress, 0x54e4);
  assert.equal(manifest.starfieldRuntime.bytes, 2205);
  assert.ok(manifest.starfieldRuntime.bytes <= manifest.starfieldRuntime.reservedBytes);
  assert.equal(manifest.starfieldRuntime.packedBytes, 1792);
  assert.ok(manifest.starfieldRuntime.packedBytes <= 1819);
  assert.equal(manifest.a2Kernel.bytes, 190);
  assert.ok(manifest.a2Kernel.bytes <= manifest.a2Kernel.reservedBytes);
  assert.equal(manifest.broadsideRuntime.runAddress, 0x5e10);
  assert.equal(manifest.broadsideRuntime.bytes, 6647);
  assert.ok(manifest.broadsideRuntime.bytes <= manifest.broadsideRuntime.reservedBytes);
  assert.equal(manifest.transportCapacity.initialBootContentBytes, 13137);
  assert.equal(manifest.transportCapacity.initialBootSectors, 103);
  assert.ok(manifest.transportCapacity.initialBootEnvelopeBytes >= 0);
  assert.equal(manifest.transportCapacity.manifest.parsed.records[1].packedLength, 865);
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
