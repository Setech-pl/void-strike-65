import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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
const integrationGlue = fs.readFileSync(path.join(root, "src", "integration-glue.s"), "utf8");
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

function assembleCurrentStarRuntime() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-strike-far-star-"));
  const object = path.join(temporary, "main.o");
  const binary = path.join(temporary, "void-strike-65.bin");
  const labelsPath = path.join(temporary, "void-strike-65.lbl");
  execFileSync("ca65", ["--cpu", "6502", "-g", "-I", path.join(root, "build"),
    "-o", object, path.join(root, "src", "main.s")], { stdio: "pipe" });
  execFileSync("ld65", ["-C", path.join(root, "cfg", "atari-boot.cfg"), "-o", binary,
    "-Ln", labelsPath, object], { stdio: "pipe" });
  const linked = fs.readFileSync(binary);
  const currentLabels = new Map(fs.readFileSync(labelsPath, "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]));
  const segment = (prefix) => {
    const load = currentLabels.get(`__${prefix}_LOAD__`);
    const run = currentLabels.get(`__${prefix}_RUN__`);
    const size = currentLabels.get(`__${prefix}_SIZE__`);
    assert.ok([load, run, size].every(Number.isInteger), `${prefix} labels missing`);
    return { bytes: linked.subarray(load - 0x2000, load - 0x2000 + size), run };
  };
  return {
    labels: currentLabels,
    star: segment("STARFIELD"),
    a2: segment("A2_KERNEL"),
    entity: segment("ENTITY_CODE"),
  };
}

// Executes the assembled rate dispatcher itself. Calls into the bounded screen
// movers are counted as external effects so this focused runner needs only the
// documented NMOS 6502 instructions present in advance_starfield_layers.
function executeRateDispatcher(memory, startAddress, externalCalls) {
  let accumulator = 0;
  let carry = false;
  let zero = false;
  let pc = startAddress;
  let instructions = 0;
  const readByte = () => memory[pc++];
  const readWord = () => {
    const low = readByte();
    return low | readByte() << 8;
  };
  const setZero = (value) => {
    zero = (value & 0xff) === 0;
    return value & 0xff;
  };
  const branch = (condition) => {
    const encodedOffset = readByte();
    if (!condition) return;
    const offset = encodedOffset < 0x80 ? encodedOffset : encodedOffset - 0x100;
    pc = pc + offset & 0xffff;
  };

  while (instructions++ < 128) {
    const opcodeAddress = pc;
    const opcode = readByte();
    switch (opcode) {
      case 0x09: // ORA #imm
        accumulator = setZero(accumulator | readByte());
        break;
      case 0x18: // CLC
        carry = false;
        break;
      case 0x20: { // JSR abs
        const target = readWord();
        assert.ok(externalCalls.has(target),
          `unexpected nested JSR $${target.toString(16)} at $${opcodeAddress.toString(16)}`);
        externalCalls.set(target, externalCalls.get(target) + 1);
        break;
      }
      case 0x29: // AND #imm
        accumulator = setZero(accumulator & readByte());
        break;
      case 0x4c: // JMP abs
        pc = readWord();
        break;
      case 0x60: // RTS
        return instructions;
      case 0x69: { // ADC #imm
        const sum = accumulator + readByte() + Number(carry);
        carry = sum > 0xff;
        accumulator = setZero(sum);
        break;
      }
      case 0x8d: // STA abs
        memory[readWord()] = accumulator;
        break;
      case 0xa9: // LDA #imm
        accumulator = setZero(readByte());
        break;
      case 0xad: // LDA abs
        accumulator = setZero(memory[readWord()]);
        break;
      case 0xb0: // BCS rel
        branch(carry);
        break;
      case 0xc9: { // CMP #imm
        const value = readByte();
        carry = accumulator >= value;
        zero = accumulator === value;
        break;
      }
      case 0xe9: { // SBC #imm
        const difference = accumulator - readByte() - Number(!carry);
        carry = difference >= 0;
        accumulator = setZero(difference);
        break;
      }
      case 0xd0: // BNE rel
        branch(!zero);
        break;
      case 0xf0: // BEQ rel
        branch(zero);
        break;
      default:
        assert.fail(
          `unsupported opcode $${opcode.toString(16)} at $${opcodeAddress.toString(16)}`,
        );
    }
  }
  assert.fail("advance_starfield_layers exceeded its bounded instruction budget");
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

test("starfield source is compact, table-driven, and assembled byte-for-byte", () => {
  assert.deepEqual({
    seed: asset.generationSeed,
    farPopulation: asset.farLayer.population,
    farRate: [asset.farLayer.rateNumerator, asset.farLayer.rateDenominator],
    nearRate: [asset.nearLayer.rateNumerator, asset.nearLayer.rateDenominator],
    nearDensity: [asset.nearLayer.densityNumerator, asset.nearLayer.densityDenominator],
    twinkle: asset.twinkle.intervalFrames,
    glyphBytes: asset.glyphBytes.length,
    stateBytes: asset.stateBytes,
  }, {
    seed: 0xa7,
    farPopulation: 29,
    farRate: [1, 4],
    nearRate: [1, 2],
    nearDensity: [3, 8],
    twinkle: 16,
    glyphBytes: 48,
    stateBytes: 122,
  });
  assert.equal(generated, renderStarfieldCa65Include(asset));
  assert.deepEqual([...runtimeBytes("star_glyph_bytes", asset.glyphBytes.length)],
    [...asset.glyphBytes]);
  assert.equal(manifest.starfield.source, "assets/graphics/starfield.json");
});

test("ANTIC 4 star screen codes select six isolated glyphs and two safe colour banks", () => {
  assert.deepEqual(asset.glyphs.map(({ screenCode }) => screenCode), [1, 2, 3, 4, 5, 6]);
  const pixelValues = (glyph) => glyph.bytes.flatMap((byte) =>
    [6, 4, 2, 0].map((shift) => (byte >>> shift) & 3)).filter(Boolean);
  assert.ok(asset.farLayer.glyphs.every((glyph) =>
    pixelValues(glyph).every((value) => value === 2)), "far glyphs select COLPF1");
  assert.ok(asset.nearLayer.glyphs.every((glyph) =>
    pixelValues(glyph).every((value) => value === 1)), "near glyphs select COLPF0");
  assert.ok(asset.glyphs.every(({ screenCode }) => screenCode < 11));
  assert.equal(manifest.fighterWeapons.player_fighter.colourValue, 0x1e);
  assert.equal(manifest.fighterWeapons.interceptor.colourValue, 0x46);
  assert.deepEqual([manifest.starfield.farLayer.colourRegister,
    manifest.starfield.nearLayer.colourRegister], ["COLPF1", "COLPF0"]);
});

test("deterministic seed reproduces layouts while a different seed changes them", () => {
  const first = composeStarfield(asset, createStarfieldState(asset));
  const repeat = composeStarfield(asset, createStarfieldState(asset));
  const different = composeStarfield(asset, createStarfieldState(asset, { seed: 0x53 }));
  assert.equal(screenHash(first), screenHash(repeat));
  assert.notEqual(screenHash(first), screenHash(different));
  assert.deepEqual(counts(first), { far: 19, near: 8 });
});

test("hulls keep the legacy world rate while stars hold exact 50% and 25% ratios", () => {
  for (const [difficulty, rate] of [["easy", 8], ["medium", 9], ["hard", 10]]) {
    let state = createStarfieldState(asset);
    let accumulator = 0;
    let worldSteps = 0;
    for (let frame = 0; frame < 400; frame += 1) {
      accumulator += rate;
      if (accumulator < 20) continue;
      accumulator -= 20;
      state = stepStarfieldWorld(asset, state);
      worldSteps += 1;
    }
    assert.equal(state.worldSteps, worldSteps, `${difficulty} hull follows legacy world events`);
    assert.equal(state.nearSteps, Math.floor(worldSteps / 2),
      `${difficulty} near layer remains exactly 50% of hull speed`);
    assert.equal(state.farSteps, Math.floor(worldSteps / 4),
      `${difficulty} far layer remains exactly 25% of hull speed`);
    assert.equal(state.nearPhase, worldSteps % 2);
    assert.equal(state.farPhase, worldSteps % 4);
    assert.equal(state.nearSteps * 2, state.farSteps * 4,
      `${difficulty} complete rate windows preserve the 2:1 parallax split`);
  }
  assert.deepEqual([
    manifest.starfield.nearLayer.rateNumerator,
    manifest.starfield.nearLayer.rateDenominator,
    manifest.starfield.farLayer.rateNumerator,
    manifest.starfield.farLayer.rateDenominator,
  ], [1, 2, 1, 4]);
});

test("assembled 6502 keeps physical scene recycle at 100% and far stars at 25%", () => {
  const memory = new Uint8Array(0x10000);
  memory.set(starRuntime, manifest.starfieldRuntime.runAddress);
  const addresses = {
    nearPhase: 0x4ed2,
    farPhase: 0x4ed3,
    flags: 0x4ed6,
    advance: labels.get("advance_starfield_layers"),
    erase: labels.get("erase_far_star_overlays"),
    nearStep: labels.get("scroll_world_columns"),
    farStep: labels.get("advance_far_stars"),
  };
  assert.ok(Object.values(addresses).every(Number.isInteger));
  assert.match(source,
    /STAR_RNG_STATE\s*=\s*GAMEPLAY_RESIDENT_END[\s\S]+STAR_NEAR_PHASE\s*=\s*STAR_RNG_STATE\+\$01[\s\S]+STAR_FAR_PHASE\s*=\s*STAR_NEAR_PHASE\+\$01/);

  const calls = new Map([
    [addresses.erase, 0],
    [addresses.nearStep, 0],
    [addresses.farStep, 0],
    [0x4efe, 0],
  ]);
  const gcd = (left, right) => right === 0 ? left : gcd(right, left % right);
  const period = asset.nearLayer.rateDenominator * asset.farLayer.rateDenominator /
    gcd(asset.nearLayer.rateDenominator, asset.farLayer.rateDenominator);
  const phaseTrace = [];
  for (let hullEvent = 0; hullEvent < period; hullEvent += 1) {
    executeRateDispatcher(memory, addresses.advance, calls);
    phaseTrace.push([memory[addresses.nearPhase], memory[addresses.farPhase]]);
  }

  const hullSteps = period;
  const nearSteps = calls.get(addresses.nearStep);
  const farSteps = calls.get(addresses.farStep);
  assert.deepEqual([hullSteps, nearSteps, farSteps], [4, 4, 1]);
  assert.deepEqual([hullSteps * 100 / hullSteps, nearSteps * 100 / hullSteps,
    farSteps * 100 / hullSteps], [100, 100, 25]);
  assert.deepEqual(phaseTrace.at(-1), [0, 0],
    "both assembled accumulators close exactly over the common period");
  assert.ok(phaseTrace.every(([near, far]) =>
    near < asset.nearLayer.rateDenominator && far < asset.farLayer.rateDenominator));
});

test("far overlays remain visible when the ring rotates between quarter-rate steps", () => {
  const current = assembleCurrentStarRuntime();
  const memory = new Uint8Array(0x10000);
  memory.set(current.star.bytes, current.star.run);
  memory.set(current.a2.bytes, current.a2.run);
  memory.set(current.entity.bytes, current.entity.run);

  const capacity = asset.farLayer.population;
  const active = current.labels.get("STAR_FAR_ACTIVE");
  const row = active + capacity;
  const column = row + capacity;
  const code = column + capacity;
  const screenLo = 0x8100;
  const screenHi = screenLo + capacity;
  const rowLo = current.labels.get("PLAYFIELD_ROW_LO");
  const rowHi = current.labels.get("PLAYFIELD_ROW_HI");
  const generationFlags = 0x4ed6;
  const ring = 0x8140;
  const ringRows = starfieldGeometry.gameplayRows - 1;

  for (let index = 0; index < ringRows; index += 1) {
    const address = ring + index * 40;
    memory[rowLo + index] = address & 0xff;
    memory[rowHi + index] = address >> 8;
  }
  for (let slot = 0; slot < capacity; slot += 1) {
    memory[active + slot] = 1;
    memory[row + slot] = slot % starfieldGeometry.gameplayRows;
    memory[column + slot] = 9 + slot % 22;
    memory[code + slot] = 1 + slot % 3;
  }

  const runCurrent = (label) => {
    const cpu = new Nmos6502(memory);
    const stop = 0x7fff;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = current.labels.get(label);
    for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.equal(cpu.pc, stop, `${label} did not return`);
  };

  runCurrent("render_far_star_overlays");
  assert.equal(Array.from(memory.subarray(active, active + capacity))
    .filter((value) => value === 0x81).length, capacity);

  const slot = 4;
  const oldAddress = memory[screenLo + slot] | memory[screenHi + slot] << 8;
  runCurrent("erase_far_star_overlays");
  runCurrent("rotate_playfield_rows");
  const logicalRow = memory[row + slot];
  const tableIndex = logicalRow - 1;
  const newAddress = (memory[rowLo + tableIndex] | memory[rowHi + tableIndex] << 8) +
    memory[column + slot];
  assert.notEqual(newAddress, oldAddress, "non-moving far star must follow the rotated LMS row");

  memory[generationFlags] = 0x80; // dirty publication without a 25%-rate far step
  runCurrent("render_far_star_overlays");
  assert.equal(memory[active + slot], 0x81,
    "an erased far star disappeared until the next quarter-rate step");
  assert.equal(memory[oldAddress], 0);
  assert.equal(memory[newAddress], memory[code + slot]);
});

test("stars enter at the top, leave at the bottom, and remain sparse over time", () => {
  let state = createStarfieldState(asset);
  let nearSum = 0;
  let farMin = Infinity;
  let farMax = 0;
  for (let step = 0; step < 600; step += 1) {
    const before = composeStarfield(asset, state);
    const next = stepStarfieldWorld(asset, state);
    const after = composeStarfield(asset, next);
    if (next.nearSteps > state.nearSteps) {
      for (let row = 2; row < starfieldGeometry.gameplayRows; row += 1) {
        for (let column = 9; column < 31; column += 1) {
          const oldCode = before[(row - 1) * 40 + column];
          const newCode = after[row * 40 + column];
          if (oldCode >= 4 && oldCode <= 6) assert.equal(newCode, oldCode,
            "near stars move only from the immediately preceding row");
        }
      }
    }
    state = next;
    const visible = counts(after);
    nearSum += visible.near;
    farMin = Math.min(farMin, visible.far);
    farMax = Math.max(farMax, visible.far);
  }
  assert.ok(nearSum / 600 >= 6 && nearSum / 600 <= 12);
  assert.ok(farMin >= 17 && farMax <= asset.farLayer.population);
  assert.ok(state.far.every(({ row }) => row >= 0 && row < starfieldGeometry.gameplayRows));
});

test("twinkle changes one covered-safe far phase every sixteen PAL frames", () => {
  let state = createStarfieldState(asset);
  const original = state.far.map(({ code }) => code);
  for (let frame = 1; frame < asset.twinkle.intervalFrames; frame += 1) {
    state = stepStarfieldFrame(asset, state);
    assert.deepEqual(state.far.map(({ code }) => code), original);
  }
  state = stepStarfieldFrame(asset, state);
  const changed = state.far.filter(({ code }, index) => code !== original[index]);
  assert.equal(changed.length, 1);
});

test("broadside stars stay inside the corridor and never touch hull ownership", () => {
  let state = createStarfieldState(asset);
  for (let step = 0; step < 120; step += 1) {
    const screen = composeStarfield(asset, state);
    for (let row = 0; row < starfieldGeometry.gameplayRows; row += 1) {
      assert.ok(screen.subarray(row * 40, row * 40 + 8).every((code) => code === 0));
      assert.ok(screen.subarray(row * 40 + 32, row * 40 + 40).every((code) => code === 0));
    }
    assert.ok(state.far.every(({ column }) => column >= 9 && column <= 30));
    state = stepStarfieldWorld(asset, state);
  }
  assert.match(source, /STAR_FAR_SCREEN_LO\s*=\s*\$8100[\s\S]+STAR_FAR_SCREEN_HI\s*=\s*STAR_FAR_SCREEN_LO\+STAR_FAR_CAPACITY/);
  assert.match(source, /render_far_star_overlays:[\s\S]+RESOLVE_FAR_STAR_PTR[\s\S]+ldy #\$00[\s\S]+lda \(dst_ptr\),y\s+bne render_far_star_next[\s\S]+sta STAR_FAR_SCREEN_LO,x[\s\S]+sta STAR_FAR_SCREEN_HI,x/);
  assert.match(source, /erase_far_star_overlays:[\s\S]+lda STAR_FAR_SCREEN_LO,x\s+sta dst_ptr[\s\S]+lda STAR_FAR_SCREEN_HI,x\s+sta dst_ptr\+1[\s\S]+sta \(dst_ptr\),y/);
  assert.doesNotMatch(source.slice(source.indexOf("handle_collisions:"),
    source.indexOf("update_score_display:")), /STAR_FAR|STAR_NEAR|star_glyph/);
});

test("ordinary-space reconstruction expands deterministically after COMPLETE", () => {
  let state = setStarfieldFullWidth(createStarfieldState(asset), true);
  const outsideCounts = [];
  for (let step = 0; step < 23; step += 1) {
    state = stepStarfieldWorld(asset, state);
    const screen = composeStarfield(asset, state);
    let outside = 0;
    for (let row = 0; row < 23; row += 1) {
      for (const column of [0, 1, 2, 3, 4, 5, 6, 7, 32, 33, 34, 35, 36, 37, 38, 39]) {
        if (screen[row * 40 + column] !== 0) outside += 1;
      }
    }
    outsideCounts.push(outside);
  }
  assert.ok(outsideCounts.some((count) => count > 0));
  assert.match(source,
    /scroll_world_columns:[\s\S]+jsr rotate_playfield_rows[\s\S]+jsr generate_starfield_row/,
    "COMPLETE must use the same bounded row recycle as the corridor");
  assert.match(source,
    /generate_starfield_row:[\s\S]+ldx CAPITAL_SECTOR_STATE[\s\S]+cpx #CAPITAL_HULL_STATE_COMPLETE[\s\S]+ldy #CORRIDOR_CENTRAL_FIRST[\s\S]+@full_limit:[\s\S]+cpy #40/,
    "COMPLETE must regenerate all 40 cells of the recycled row");
});

test("overlay ownership restores the current background and respects overlap order", () => {
  let state = createStarfieldState(asset);
  let ownership = createBackgroundOwnership(asset, state);
  const target = composeStarfield(asset, state).findIndex((code) => code !== 0);
  assert.ok(target >= 0);
  const initial = ownership.background[target];
  ownership = setBackgroundOverlay(ownership, "explosion", [{ index: target, code: 0x6d }]);
  ownership = setBackgroundOverlay(ownership, "projectile", [{ index: target, code: 0x7e }]);
  assert.equal(renderBackgroundOwnership(ownership)[target], 0x7e);
  state = stepStarfieldWorld(asset, state);
  ownership = updateBackgroundOwnership(ownership, asset, state);
  ownership = clearBackgroundOverlay(ownership, "projectile");
  assert.equal(renderBackgroundOwnership(ownership)[target], 0x6d,
    "clearing the upper projectile must reveal the covered effect");
  ownership = clearBackgroundOverlay(ownership, "explosion");
  assert.equal(renderBackgroundOwnership(ownership)[target], ownership.background[target]);
  assert.notEqual(initial, undefined);
});

test("assembly erases overlays before scroll and renders them in stacking order", () => {
  const mainLoop = source.slice(source.indexOf("main_loop:"), source.indexOf("; -----------------------------------------------------------------------------\n; Frame"));
  const order = [
    "erase_fighter_projectile_overlays",
    "entity_effects_erase",
    "update_starfield",
    "render_far_star_overlays_if_needed",
    "render_capital_explosions",
    "render_shared_fighter_explosions",
    "render_capital_shell_overlays",
    "entity_effects_render",
    "render_fighter_projectile_overlays",
  ].map((label) => mainLoop.indexOf(label));
  assert.ok(order.every((offset) => offset >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(source, /erase_fighter_projectile_overlays:[\s\S]+FIGHTER_PROJECTILE_BACKUP_TOP[\s\S]+FIGHTER_PROJECTILE_BACKUP_BOTTOM/);
  assert.match(`${source}\n${integrationGlue}`,
    /render_capital_shell_overlay:[\s\S]+BROAD_PREV_Y[\s\S]+BROAD_COLLISION/);
  assert.match(source, /update_starfield:[\s\S]+jsr erase_far_star_overlays[\s\S]+jsr scroll_world_columns/);
  assert.match(source,
    /advance_starfield_layers:[\s\S]+STAR_NEAR_RATE_NUMERATOR[\s\S]+STAR_NEAR_RATE_DENOMINATOR[\s\S]+STAR_FAR_RATE_NUMERATOR[\s\S]+STAR_FAR_RATE_DENOMINATOR/);
});

test("starfield relocation preserves broadside and protected finale memory", () => {
  assert.equal(manifest.starfieldRuntime.runAddress, 0x552a);
  assert.ok(manifest.starfieldRuntime.bytes <= manifest.starfieldRuntime.reservedBytes);
  assert.ok(manifest.starfieldRuntime.packedBytes <= 0x706);
  assert.equal(manifest.broadsideRuntime.runAddress, 0x5e10);
  assert.ok(manifest.broadsideRuntime.bytes <= manifest.broadsideRuntime.reservedBytes);
  assert.ok(manifest.broadsideRuntime.runAddress + manifest.broadsideRuntime.bytes <= 0x7810);
  assert.equal(manifest.starfield.pmgBytes, 0);
  assert.equal(labels.get("STAR_FAR_STATE_END"), undefined,
    "absolute star state constants are not exported linker symbols");
});

test("starfield staging is disjoint from the packed loader and loader bitmap", () => {
  const stagingStart = manifest.starfieldRuntime.stagingAddress;
  const stagingEnd = stagingStart + manifest.starfieldRuntime.packedBytes - 1;
  const loaderStart = labels.get("loader_bitmap_lzss");
  const loaderEnd = loaderStart + manifest.loaderScreen.packedBitmapBytes - 1;
  const bitmapStart = manifest.loaderScreen.bitmapAddress;
  const bitmapEnd = bitmapStart + manifest.loaderScreen.unpackedBitmapBytes - 1;
  const overlaps = (firstStart, firstEnd, secondStart, secondEnd) =>
    firstStart <= secondEnd && secondStart <= firstEnd;
  const stagingConstant = /STARFIELD_STAGING\s*=\s*\$([0-9A-F]+)/i.exec(source);

  assert.ok(stagingConstant);
  assert.equal(Number.parseInt(stagingConstant[1], 16), stagingStart);
  assert.equal(loaderEnd - loaderStart + 1, manifest.loaderScreen.packedBitmapBytes);
  assert.ok(loaderStart >= manifest.loadAddress);
  assert.ok(loaderEnd < manifest.broadsideRuntime.loadAddress);
  assert.equal(stagingStart, 0x7810);
  assert.ok(stagingEnd < stagingStart + manifest.starfieldRuntime.stagingBytes);
  assert.equal(stagingStart + manifest.starfieldRuntime.stagingBytes - 1, 0x7f15);
  assert.equal(overlaps(stagingStart, stagingEnd, loaderStart, loaderEnd), false);
  assert.equal(overlaps(stagingStart, stagingEnd, bitmapStart, bitmapEnd), false);
  assert.ok(stagingStart >= manifest.broadsideRuntime.runAddress +
    manifest.broadsideRuntime.reservedBytes);
  assert.ok(stagingStart + manifest.starfieldRuntime.stagingBytes <= 0xc000);
  assert.match(source,
    /unpack_starfield_runtime:[\s\S]+#<STARFIELD_STAGING[\s\S]+starfield_packed_source:[\s\S]+\.word STARFIELD_STAGING/);
});
