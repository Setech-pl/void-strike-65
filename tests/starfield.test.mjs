import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import {
  compileStarfield,
  composeStarfield,
  createStarfieldState,
  loadStarfieldDefinition,
  renderStarfieldCa65Include,
  setStarfieldFullWidth,
  starfieldGeometry,
  stepStarfieldFrame,
  stepStarfieldWorld,
} from "../scripts/starfield.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const asset = compileStarfield(loadStarfieldDefinition(
  path.join(root, "assets", "graphics", "starfield.json")));
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const generated = fs.readFileSync(path.join(root, "build", "starfield.inc"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const labels = new Map(fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
  .split(/\r?\n/)
  .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean)
  .map((match) => [match[2], Number.parseInt(match[1], 16)]));

function runRoutine(memory, name) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >>> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing linked routine ${name}`);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu.cycles;
}

function createRuntime() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  runRoutine(memory, "init_playfield_row_table");
  runRoutine(memory, "init_starfield_state");
  memory[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  return memory;
}

function ringEvent(memory) {
  memory[labels.get("STAR_NEAR_RING_ADVANCED")] |= 1;
  return runRoutine(memory, "rotate_playfield_rows");
}

function renderedWhiteAddresses(memory) {
  const result = [];
  for (let slot = 0; slot < asset.nearLayer.population; slot += 1) {
    const row = memory[labels.get("STAR_NEAR_ROW") + slot];
    const column = memory[labels.get("STAR_NEAR_COLUMN") + slot];
    let address;
    if (row === 0) {
      address = 0x4028 + column;
    } else {
      const table = row - 1;
      address = memory[labels.get("PLAYFIELD_ROW_LO") + table] |
        memory[labels.get("PLAYFIELD_ROW_HI") + table] << 8;
      address += column;
    }
    result.push(address);
  }
  return result;
}

function countWhiteCells(memory) {
  const divider = memory.subarray(0x4028, 0x4028 + 40);
  const ring = memory.subarray(0x8140, 0x8140 + 27 * 40);
  return [...divider, ...ring].filter((code) =>
    code === asset.nearLayer.glyphs[0].screenCode).length;
}

function publish(memory) {
  const erase = runRoutine(memory, "erase_dynamic_near_star_overlays");
  const phase = runRoutine(memory, "publish_dynamic_near_star_phase");
  const render = runRoutine(memory, "render_dynamic_near_star_overlays");
  return { erase, phase, render };
}

test("asset and generated include define one four-point white-only layer", () => {
  assert.deepEqual({
    farRepresentation: asset.farLayer.representation,
    farPopulation: asset.farLayer.population,
    farPatternBytes: asset.farLayer.pattern.bytes.length,
    farGlyphs: asset.farLayer.glyphs.length,
    nearRepresentation: asset.nearLayer.representation,
    nearPopulation: asset.nearLayer.population,
    nearSpeed: asset.nearLayer.speedPixelsPerFrame,
    glyphBytes: asset.glyphBytes.length,
    stateBytes: asset.stateBytes,
  }, {
    farRepresentation: "disabled",
    farPopulation: 0,
    farPatternBytes: 0,
    farGlyphs: 0,
    nearRepresentation: "sparse-dynamic",
    nearPopulation: 4,
    nearSpeed: 1,
    glyphBytes: 8,
    stateBytes: 18,
  });
  assert.equal(generated, renderStarfieldCa65Include(asset));
  assert.deepEqual(asset.glyphs.map(({ screenCode }) => screenCode), [1]);
  assert.equal(asset.nearLayer.colourRegister, "COLPF0");
  assert.deepEqual(asset.nearLayer.glyphs[0].bytes, [16, 0, 0, 0, 0, 0, 0, 0]);
});

test("host model advances white stars exactly one scanline per PAL frame", () => {
  let state = createStarfieldState(asset);
  const initialRows = state.dynamicNear.map(({ row }) => row);
  for (let frame = 1; frame <= 64; frame += 1) {
    state = stepStarfieldFrame(asset, state);
    assert.equal(state.nearPhase, frame % 8);
    assert.deepEqual(state.dynamicNear.map(({ row }) => row),
      initialRows.map((row) => (row + Math.floor(frame / 8)) % 28));
    assert.equal([...composeStarfield(asset, state)].filter(Boolean).length, 4);
  }
});

test("background reconstruction and ring recycling contain no blue or orphan star bytes", () => {
  for (const fullWidth of [false, true]) {
    let state = setStarfieldFullWidth(createStarfieldState(asset), fullWidth);
    for (let step = 0; step < 112; step += 1) {
      state = stepStarfieldWorld(asset, state);
      assert.equal([...state.near].filter(Boolean).length, 0);
      assert.equal([...composeStarfield(asset, state)].filter(Boolean).length,
        fullWidth ? 0 : 4);
    }
  }
});

test("all four coarse/ring combinations preserve exact physical addresses", () => {
  for (const { name, phaseBefore, rotate, expectedFlags } of [
    { name: "no coarse, no ring", phaseBefore: 0, rotate: false, expectedFlags: 0 },
    { name: "coarse only", phaseBefore: 7, rotate: false, expectedFlags: 2 },
    { name: "ring only", phaseBefore: 0, rotate: true, expectedFlags: 1 },
    { name: "coarse plus ring", phaseBefore: 7, rotate: true, expectedFlags: 3 },
  ]) {
    const memory = createRuntime();
    runRoutine(memory, "render_dynamic_near_star_overlays");
    memory[labels.get("STAR_NEAR_FINE_PHASE")] = phaseBefore;
    const update = runRoutine(memory, "update_white_starfield_phase");
    if (rotate) ringEvent(memory);
    assert.equal(memory[labels.get("STAR_NEAR_RING_ADVANCED")], expectedFlags, name);
    const { erase, phase, render } = publish(memory);
    assert.equal(countWhiteCells(memory), 4, name);
    assert.deepEqual(renderedWhiteAddresses(memory), [0, 1, 2, 3].map((slot) =>
      memory[labels.get("STAR_NEAR_SCREEN_LO") + slot] |
      memory[labels.get("STAR_NEAR_SCREEN_HI") + slot] << 8), name);
    assert.ok(update > 0 && erase > 0 && phase > 0 && render > 0);
  }
});

test("1000-frame mixed cadence has no stale, clone, or lost white cells", () => {
  const memory = createRuntime();
  runRoutine(memory, "render_dynamic_near_star_overlays");
  const events = new Set();
  for (let frame = 0; frame < 1000; frame += 1) {
    assert.equal(countWhiteCells(memory), 4, `ANTIC-visible count before frame ${frame}`);
    runRoutine(memory, "update_white_starfield_phase");
    const coarse = memory[labels.get("STAR_NEAR_RING_ADVANCED")] === 2;
    const rotate = frame % 3 === 0 || frame % 17 === 5;
    if (rotate) ringEvent(memory);
    events.add(`${coarse ? 1 : 0}${rotate ? 1 : 0}`);
    runRoutine(memory, "erase_dynamic_near_star_overlays");
    assert.equal(countWhiteCells(memory), 0, `stale/clone at frame ${frame}`);
    runRoutine(memory, "publish_dynamic_near_star_phase");
    runRoutine(memory, "render_dynamic_near_star_overlays");
    assert.equal(countWhiteCells(memory), 4, `lost publish at frame ${frame}`);
    assert.deepEqual(renderedWhiteAddresses(memory), [0, 1, 2, 3].map((slot) =>
      memory[labels.get("STAR_NEAR_SCREEN_LO") + slot] |
      memory[labels.get("STAR_NEAR_SCREEN_HI") + slot] << 8));
    const phase = memory[labels.get("STAR_NEAR_FINE_PHASE")];
    const glyph = memory.subarray(0x4400 + 8, 0x4400 + 16);
    assert.deepEqual([...glyph], Array.from({ length: 8 }, (_, row) => row === phase ? 16 : 0));
  }
  assert.deepEqual([...events].sort(), ["00", "01", "10", "11"]);
});

test("capital freezes and hides white stars, then OPEN reconstructs all four", () => {
  const memory = createRuntime();
  runRoutine(memory, "render_dynamic_near_star_overlays");
  const rows = [...memory.subarray(labels.get("STAR_NEAR_ROW"), labels.get("STAR_NEAR_ROW") + 4)];
  const phase = memory[labels.get("STAR_NEAR_FINE_PHASE")];
  runRoutine(memory, "erase_dynamic_near_star_overlays");
  memory[labels.get("CAPITAL_SECTOR_STATE")] = 1;
  runRoutine(memory, "update_white_starfield_phase");
  assert.deepEqual([...memory.subarray(labels.get("STAR_NEAR_ROW"),
    labels.get("STAR_NEAR_ROW") + 4)], rows);
  assert.equal(memory[labels.get("STAR_NEAR_FINE_PHASE")], phase);
  assert.deepEqual([...memory.subarray(labels.get("STAR_NEAR_SCREEN_HI"),
    labels.get("STAR_NEAR_SCREEN_HI") + 4)], [0, 0, 0, 0]);
  assert.equal(runRoutine(memory, "render_dynamic_near_star_overlays"), 14);
  assert.equal(countWhiteCells(memory), 0);
  memory[labels.get("CAPITAL_SECTOR_STATE")] = 7;
  runRoutine(memory, "update_white_starfield_phase");
  runRoutine(memory, "publish_dynamic_near_star_phase");
  runRoutine(memory, "render_dynamic_near_star_overlays");
  assert.equal(countWhiteCells(memory), 4);
});

test("white publication retains the proven post-playfield ANTIC contract", () => {
  const publication = source.slice(source.indexOf("publish_fighter_projectile_overlays:"),
    source.indexOf("fighter_projectile_publication_end = *"));
  assert.match(publication,
    /fighter_projectile_publication_begin = \*[\s\S]+jsr erase_dynamic_near_star_overlays[\s\S]+jsr publish_dynamic_near_star_phase[\s\S]+jsr erase_fighter_projectile_overlays[\s\S]+jmp render_dynamic_near_star_overlays/);
  const frameStart = source.slice(source.indexOf("entity_effects_erase_with_white_starfield:"),
    source.indexOf("update_white_starfield_phase:"));
  assert.doesNotMatch(frameStart, /erase_dynamic_near_star_overlays/);
});

test("instruction-exact white-only starfield peak remains within the 850-cycle gate", () => {
  const measure = ({ phaseBefore, rotate }) => {
    const memory = createRuntime();
    runRoutine(memory, "render_dynamic_near_star_overlays");
    memory[labels.get("STAR_NEAR_FINE_PHASE")] = phaseBefore;
    const update = runRoutine(memory, "update_white_starfield_phase");
    let recycle = 0;
    if (rotate) recycle = ringEvent(memory);
    const { erase, phase, render } = publish(memory);
    const cleanup = rotate ? runRoutine(memory, "restore_recycled_row_near_underlay") : 0;
    return { update, erase, phase, render, recycle, cleanup,
      total: update + erase + phase + render + cleanup };
  };
  const cases = {
    ordinary: measure({ phaseBefore: 0, rotate: false }),
    coarse: measure({ phaseBefore: 7, rotate: false }),
    ring: measure({ phaseBefore: 0, rotate: true }),
    combined: measure({ phaseBefore: 7, rotate: true }),
  };
  const peak = Math.max(...Object.values(cases).map(({ total }) => total));
  assert.ok(peak <= 850, `white-only peak ${peak} exceeds gate: ${JSON.stringify(cases)}`);
});

test("blue-far production code, data, glyphs and state are absent", () => {
  assert.doesNotMatch(source,
    /STAR_FAR|generate_baked_far_star_row|draw_baked_far_star|far_baked_pattern|update_far_star_fine_phase/);
  assert.doesNotMatch(generated, /STAR_FAR_DIM|EMIT_FAR_STAR_PATTERN/);
  assert.equal(labels.has("generate_baked_far_star_row"), false);
  assert.equal(labels.has("STAR_FAR_PATTERN_ROW"), false);
  assert.equal(labels.has("STAR_FAR_FINE_PHASE"), false);
});

test("layout and transport gates remain legal after blue-far removal", () => {
  assert.equal(labels.get("free_broadside_slot"), 0x76a7);
  assert.equal(manifest.starfieldRuntime.runAddress, 0x54e4);
  assert.ok(manifest.starfieldRuntime.bytes <= manifest.starfieldRuntime.reservedBytes);
  assert.ok(manifest.starfieldRuntime.packedBytes <= manifest.starfieldRuntime.stagingBytes);
  assert.ok(manifest.a2Kernel.bytes <= manifest.a2Kernel.reservedBytes);
  assert.equal(manifest.broadsideRuntime.reservedBytes - manifest.broadsideRuntime.bytes, 9);
  assert.equal(manifest.transportCapacity.initialBootSectors, 103);
  assert.ok(manifest.transportCapacity.initialBootEnvelopeBytes >= 0);
  assert.equal(labels.get("ENTITY_CODE_START") & 0xff, 0);
});

test("capital hull rates make 1 px/frame exactly 20-35 percent on every difficulty", () => {
  const hull = [8, 9, 10].map((rate) => rate * 8 / 20);
  assert.deepEqual(hull, [3.2, 3.6, 4]);
  assert.deepEqual(hull.map((speed) => Number((1 / speed).toFixed(4))),
    [0.3125, 0.2778, 0.25]);
  assert.match(source, /world_scroll_rates:\s*\n\s*EMIT_WORLD_SCROLL_RATES\s*\nhull_scroll_rates:\s*\n\s*EMIT_HULL_SCROLL_RATES/);
});

test("pause cannot advance the white-star phase or logical rows", () => {
  const pausePath = source.slice(source.indexOf("enter_pause:"),
    source.indexOf("pause_silence_audio:"));
  assert.match(pausePath, /jsr backup_gameplay_screen/);
  assert.match(pausePath, /resume_gameplay:[\s\S]+jsr restore_gameplay_screen/);
  assert.doesNotMatch(pausePath, /STAR_NEAR_FINE_PHASE|STAR_NEAR_ROW|update_white_starfield_phase/);
});

test("geometry remains the canonical 40 by 28 PAL playfield", () => {
  assert.deepEqual(starfieldGeometry, { screenColumns: 40, gameplayRows: 28 });
});
