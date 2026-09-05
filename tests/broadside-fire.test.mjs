import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  activeProjectileCount,
  advancePlayerLifecycle,
  advanceHullScroll,
  advanceProjectile,
  advanceWorldScroll,
  combinedPlayerEnvelope,
  contactPlayerHull,
  beginImpact,
  beginWarning,
  BROADSIDE_STATES,
  CAPITAL_SECTOR_STATES,
  applyPlayerDamage,
  createBroadsideState,
  createWorldScrollState,
  centeredSpanTop,
  expireProjectile,
  hitHostileFighter,
  hitOppositeHull,
  hitPlayer,
  hullBoundary,
  hullScrollRate,
  HULL_SCROLL_DIFFICULTIES,
  MISSILE_CLEAR_MASKS,
  MISSILE_COLORS,
  MISSILE_MASKS,
  missileWidth,
  muzzlePosition,
  playerHullContact,
  PLAYER_LIFECYCLE_STATES,
  PLAYER_RESPAWN_X,
  PLAYER_RESPAWN_Y,
  SHARED_FIGHTER_EXPLOSION_TOTAL,
  projectileLeadingEdgeHitsHull,
  resetExitedTurretLifecycles,
  selectOldestEligibleTurret,
  simulateBroadsideCadence,
  simulateBroadsideSpeedSequence,
  tickDamageCooldown,
  updateMissileByte,
  updateMissileSize,
  visibleSegmentRow,
  warningVisual,
  warningHullAdvanceAllowance,
  worldScrollRate,
} from "../scripts/broadside.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
  renderCapitalHullsCa65Include,
} from "../scripts/capital-hulls.mjs";
import { packBroadsideLzss, unpackBroadsideLzss } from "../scripts/broadside-lzss.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments, readRuntimeBytes } from "../scripts/runtime-image.mjs";
import { canonicalPlayfield } from "../scripts/playfield.mjs";
import {
  createBroadsideAcceptanceSequencePreview,
  createBroadsideCadenceSequencePreview,
  createBroadsideFireSequencePreview,
  createPlayerRespawnSequencePreview,
  createBroadsideSpeedSequencePreview,
  createDifficultySpeedComparisonPreview,
  inspectPng,
  readBroadsideAcceptanceSequenceRuntimeState,
  readBroadsideCadenceSequenceRuntimeState,
  readBroadsideFireSequenceRuntimeState,
  readPlayerRespawnSequenceRuntimeState,
  readBroadsideSpeedSequenceRuntimeState,
  readDifficultySpeedComparisonRuntimeState,
  readGameGraphicsSource,
} from "../scripts/preview.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const glueSource = fs.readFileSync(path.join(rootDirectory, "src", "integration-glue.s"), "utf8");
const capitalPlayerCollisionSource = fs.readFileSync(
  path.join(rootDirectory, "src", "capital-player-collision.s"), "utf8",
);
const definitionPath = path.join(rootDirectory, "assets", "graphics", "capital-hulls.json");
const definition = loadCapitalHullsDefinition(definitionPath);
const asset = compileCapitalHulls(definition);
const alliedTurretIndex = asset.turrets.findIndex(({ side }) => side === "allied");
const enemyTurretIndex = asset.turrets.findIndex(({ side }) => side === "enemy");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json")));
const broadsideRuntime = fs.readFileSync(
  path.join(rootDirectory, "build", "broadside-runtime.bin"),
);
const labels = new Map(
  fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const capitalPlayerCollisionLabels = new Map(
  fs.readFileSync(path.join(rootDirectory, "build", "capital-player-collision.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function routine(name, next) {
  const start = source.indexOf(`${name}:`);
  const end = next ? source.indexOf(`${next}:`, start + name.length + 1) : source.length;
  assert.notEqual(start, -1, `Missing routine ${name}`);
  assert.notEqual(end, -1, `Missing boundary ${next}`);
  return source.slice(start, end);
}

function glueRoutine(name, next) {
  const start = glueSource.indexOf(`${name}:`);
  const end = next ? glueSource.indexOf(`${next}:`, start + name.length + 1) : glueSource.length;
  assert.notEqual(start, -1, `Missing glue routine ${name}`);
  assert.notEqual(end, -1, `Missing glue boundary ${next}`);
  return glueSource.slice(start, end);
}

function xexBytesAt(address, length) {
  return readRuntimeBytes(rootDirectory, address, length);
}

function createLinkedRuntimeMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, rootDirectory);
  const rowLo = labels.get("PLAYFIELD_ROW_LO");
  const rowHi = labels.get("PLAYFIELD_ROW_HI");
  for (let row = 0; row < canonicalPlayfield.ringRows; row += 1) {
    const address = canonicalPlayfield.ringBufferAddress + row * 40;
    memory[rowLo + row] = address & 0xff;
    memory[rowHi + row] = address >> 8;
  }
  memory[labels.get("PLAYFIELD_ACTIVE_DLIST_LO")] = labels.get("PLAYFIELD_DLIST_A") & 0xff;
  memory[labels.get("PLAYFIELD_NEXT_DLIST_LO")] = labels.get("PLAYFIELD_DLIST_B") & 0xff;
  memory[labels.get("PLAYFIELD_RING_FLAGS")] = 0;
  return memory;
}

function runAssembledRoutine(memory, name, { x = 0, y = 0, a = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.x = x;
  cpu.y = y;
  cpu.a = a;
  cpu.pc = labels.get(name);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu.cycles;
}

function runVisibleHullSectorRow(memory, screenRow) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.a = screenRow;
  cpu.pc = labels.get("visible_hull_sector_row");
  for (let steps = 0; steps < 100 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, "visible_hull_sector_row did not return");
  return { carry: cpu.getFlag(0x01), sectorRow: (cpu.x << 8) | cpu.y, cycles: cpu.cycles };
}

function containsBytes(haystack, needle) {
  return haystack.indexOf(Buffer.from(needle)) !== -1;
}

function broadsideRuntimeBytesAt(address, length) {
  const offset = address - manifest.broadsideRuntime.runAddress;
  assert.ok(offset >= 0 && offset + length <= broadsideRuntime.length,
    `Broadside runtime address $${address.toString(16)} is outside the resident image`);
  return broadsideRuntime.subarray(offset, offset + length);
}

function connectedShellObjects(memory, screenCodes) {
  const pixels = Array.from({ length: 8 }, () => Array(8).fill(false));
  for (const [cell, screenCode] of screenCodes.entries()) {
    const glyph = screenCode & 0x7f;
    for (let row = 0; row < 8; row += 1) {
      const byte = memory[0x4400 + glyph * 8 + row];
      for (let pixel = 0; pixel < 4; pixel += 1)
        pixels[row][cell * 4 + pixel] = ((byte >> (6 - pixel * 2)) & 3) !== 0;
    }
  }
  let objects = 0;
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    if (!pixels[row][column]) continue;
    objects += 1;
    const pending = [[row, column]];
    pixels[row][column] = false;
    while (pending.length > 0) {
      const [currentRow, currentColumn] = pending.pop();
      for (const [nextRow, nextColumn] of [[currentRow - 1, currentColumn],
        [currentRow + 1, currentColumn], [currentRow, currentColumn - 1],
        [currentRow, currentColumn + 1]]) {
        if (nextRow >= 0 && nextRow < 8 && nextColumn >= 0 && nextColumn < 8 &&
            pixels[nextRow][nextColumn]) {
          pixels[nextRow][nextColumn] = false;
          pending.push([nextRow, nextColumn]);
        }
      }
    }
  }
  return objects;
}

function prepareAssembledCapitalPlayerContact({
  owner,
  slot = 0,
  shellX,
  shellY = 107,
  playerX = 124,
  playerY = 100,
  boltRasterTop = playerY - ATARI800_CAPTURE_FIRST_DMA_SCANLINE + 4,
  playerLifecycle = PLAYER_LIFECYCLE_STATES.ALIVE,
  damageCooldown = 0,
} = {}) {
  const memory = createLinkedRuntimeMemory();
  const broadState = labels.get("BROAD_STATE");
  const constants = readGameGraphicsSource(source, definition).constants;
  memory[broadState + slot] = BROADSIDE_STATES.FLYING;
  memory[broadState + 3 + slot] = owner;
  memory[broadState + 9 + slot] = shellX;
  memory[broadState + 12 + slot] = shellY;
  const rowAddress = canonicalPlayfield.ringBufferAddress + 8 * 40;
  memory[labels.get("BROAD_ROW_LO") + slot] = rowAddress & 0xff;
  memory[labels.get("BROAD_ROW_HI") + slot] = rowAddress >> 8;
  memory[labels.get("BROAD_RASTER_TOP") + slot] = boltRasterTop;
  memory[labels.get("player_x")] = playerX;
  memory[labels.get("player_y")] = playerY;
  memory[labels.get("PLAYER_LIFECYCLE")] = playerLifecycle;
  memory[constants.get("PLAYER_LIVES")] = 3;
  memory[constants.get("BROAD_PLAYER_HEALTH")] = 10;
  memory[constants.get("BROAD_DAMAGE_COOLDOWN")] = damageCooldown;
  memory[constants.get("BROAD_DAMAGE_APPLIED")] = 0;
  memory[labels.get("CAPITAL_SECTOR_STATE")] = CAPITAL_SECTOR_STATES.DRAIN;
  return { memory, broadState, slotState: broadState + slot, constants };
}

function shellInitialX(owner, currentRasterLeft, swept) {
  if (owner === 0) return currentRasterLeft - (swept ? 2 : 0);
  return currentRasterLeft + (swept ? 4 : 2);
}

function capitalShellSweptAabb(owner, initialX, boltRasterTop) {
  const previousLeft = initialX & 0xfc;
  const currentLogical = owner === 0 ? initialX + 2 : initialX - 2;
  const currentLeft = currentLogical & 0xfc;
  return {
    previousLeft,
    previousRight: previousLeft + 7,
    currentLeft,
    currentRight: currentLeft + 7,
    left: Math.min(previousLeft, currentLeft),
    right: Math.max(previousLeft + 7, currentLeft + 7),
    top: boltRasterTop,
    bottom: boltRasterTop + 5,
  };
}

function playerGameplayAabb(playerX, playerY) {
  const top = playerY - ATARI800_CAPTURE_FIRST_DMA_SCANLINE;
  return { left: playerX, right: playerX + 15, top, bottom: top + 14 };
}

function capitalShellScreenTransients(memory) {
  const cells = [];
  const start = canonicalPlayfield.ringBufferAddress;
  const end = start + canonicalPlayfield.ringRows * 40;
  for (let address = start; address < end; address += 1) {
    const glyph = memory[address] & 0x7f;
    if (glyph === 126 || glyph === 127) cells.push({ address, value: memory[address] });
  }
  return cells;
}

function capitalImpactMissileRows(memory) {
  const rows = [];
  for (let row = 0; row < 256; row += 1) {
    const value = memory[0x3b00 + row] & 0xfc; // M1-M3; M0 remains player-owned.
    if (value !== 0) rows.push({ row, value });
  }
  return rows;
}

function inclusiveAabbsOverlap(first, second) {
  return first.left <= second.right && first.right >= second.left &&
    first.top <= second.bottom && first.bottom >= second.top;
}

const ATARI800_CAPTURE_FIRST_DMA_SCANLINE = 8;

function runAssembledRoutineWithCpu(memory, name, { x = 0, y = 0, a = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.x = x;
  cpu.y = y;
  cpu.a = a;
  cpu.pc = labels.get(name);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu;
}

function playerBoundsFromPmg(memory) {
  const playerBases = [0x3c00, 0x3f00];
  const occupiedDmaRows = [];
  for (let row = 0; row < 256; row += 1) {
    if (playerBases.some((base) => memory[base + row] !== 0)) occupiedDmaRows.push(row);
  }
  assert.ok(occupiedDmaRows.length > 0, "PMG oracle requires a visible P0/P3 PlayerFighter");
  const sizeCode = memory[0xd008] & 3;
  const widthScale = [1, 2, 1, 4][sizeCode];
  assert.equal(memory[0xd00b] & 3, sizeCode, "P0/P3 must share one width");
  assert.equal(memory[0xd003], memory[0xd000], "P0/P3 must share one HPOS origin");
  return {
    left: memory[0xd000],
    right: memory[0xd000] + 8 * widthScale - 1,
    top: occupiedDmaRows[0] - ATARI800_CAPTURE_FIRST_DMA_SCANLINE,
    bottom: occupiedDmaRows.at(-1) - ATARI800_CAPTURE_FIRST_DMA_SCANLINE,
    dma_top: occupiedDmaRows[0],
    dma_bottom: occupiedDmaRows.at(-1),
    size_code: sizeCode,
  };
}

function displayListModeHeight(opcode) {
  const mode = opcode & 0x0f;
  if (mode === 2 || mode === 3 || mode === 4 || mode === 5 || mode === 6 || mode === 7)
    return 8;
  assert.fail(`Unsupported oracle display-list mode $${opcode.toString(16)}`);
}

function displayRowForPhysicalPointer(memory, displayList, targetPointer) {
  let address = displayList;
  let rasterTop = 0;
  for (let instructions = 0; instructions < 64; instructions += 1) {
    const opcode = memory[address];
    if ((opcode & 0x0f) === 1) break;
    const hasLms = (opcode & 0x40) !== 0;
    if (hasLms) {
      const pointer = memory[address + 1] | (memory[address + 2] << 8);
      if (pointer === targetPointer) return { rasterTop, opcode, instructionAddress: address };
    }
    rasterTop += displayListModeHeight(opcode);
    address += hasLms ? 3 : 1;
  }
  assert.fail(`Physical row $${targetPointer.toString(16)} is absent from active display list`);
}

function boltBoundsFromDisplay(memory, slot) {
  const broadRowLo = labels.get("BROAD_ROW_LO");
  const broadRowHi = labels.get("BROAD_ROW_HI");
  const pointer = memory[broadRowLo + slot] | (memory[broadRowHi + slot] << 8);
  const activeDlist = 0x7f00 | memory[labels.get("PLAYFIELD_ACTIVE_DLIST_LO")];
  const display = displayRowForPhysicalPointer(memory, activeDlist, pointer);
  let column = -1;
  for (let candidate = 0; candidate < 39; candidate += 1) {
    if ((memory[pointer + candidate] & 0x7f) === 126 &&
        (memory[pointer + candidate + 1] & 0x7f) === 127) {
      column = candidate;
      break;
    }
  }
  assert.notEqual(column, -1, "screen-RAM oracle requires the rendered 126/127 pair");
  const charset = memory[0xd409] << 8;
  const occupiedGlyphRows = [];
  for (let row = 0; row < 8; row += 1) {
    const left = memory[charset + 126 * 8 + row];
    const right = memory[charset + 127 * 8 + row];
    if (left !== 0 || right !== 0) occupiedGlyphRows.push(row);
  }
  assert.deepEqual(occupiedGlyphRows, [1, 2, 3, 4, 5, 6]);
  return {
    left: 48 + column * 4,
    right: 48 + (column + 2) * 4 - 1,
    top: display.rasterTop + occupiedGlyphRows[0],
    bottom: display.rasterTop + occupiedGlyphRows.at(-1),
    physical_pointer: pointer,
    display_list: activeDlist,
    display_instruction: display.instructionAddress,
    screen_column: column,
    glyph_rows: occupiedGlyphRows,
  };
}

function prepareIndependentRasterScene({ owner, slot, ringRotations, playerDmaTop }) {
  const memory = createLinkedRuntimeMemory();
  runAssembledRoutine(memory, "copy_charset");
  runAssembledRoutine(memory, "init_broadside");
  runAssembledRoutine(memory, "init_playfield_display_lists");
  for (let rotation = 0; rotation < ringRotations; rotation += 1) {
    runAssembledRoutine(memory, "rotate_playfield_rows");
    runAssembledRoutine(memory, "prebuild_next_playfield_display_list");
  }
  const broadState = labels.get("BROAD_STATE");
  memory[broadState + slot] = BROADSIDE_STATES.FLYING;
  memory[broadState + 3 + slot] = owner;
  memory[broadState + 9 + slot] = 120;
  memory[broadState + 12 + slot] = 108;
  memory[labels.get("PLAYFIELD_BROAD_ROW") + slot] = 13;
  runAssembledRoutine(memory, "set_broadside_row_ptr", { x: slot });
  runAssembledRoutine(memory, "render_capital_shell_overlays");

  memory[labels.get("player_x")] = 124;
  memory[labels.get("player_y")] = playerDmaTop;
  memory[0xd000] = 124;
  memory[0xd003] = 124;
  memory[0xd008] = 1;
  memory[0xd00b] = 1;
  memory[0xd409] = 0x44;
  runAssembledRoutine(memory, "clear_pmg");
  runAssembledRoutine(memory, "draw_player");
  return memory;
}

test("capital/player collision agrees with independently reconstructed final raster Y", () => {
  const positions = [
    { name: "top edge", playerDmaTop: 126, expectedHit: true },
    { name: "upper third", playerDmaTop: 123, expectedHit: true },
    { name: "middle", playerDmaTop: 114, expectedHit: true },
    { name: "lower third", playerDmaTop: 108, expectedHit: true },
    { name: "bottom edge", playerDmaTop: 107, expectedHit: true },
    { name: "one scanline above", playerDmaTop: 127, expectedHit: false },
    { name: "one scanline below", playerDmaTop: 106, expectedHit: false },
  ];
  for (const owner of [0, 1]) for (const slot of [0, 1, 2]) {
    for (const ringRotations of [0, 1, 13, 26, 27]) for (const position of positions) {
      const memory = prepareIndependentRasterScene({
        owner, slot, ringRotations, playerDmaTop: position.playerDmaTop,
      });
      const player = playerBoundsFromPmg(memory);
      const bolt = boltBoundsFromDisplay(memory, slot);
      const oracleHit = inclusiveAabbsOverlap(player, bolt);
      assert.equal(oracleHit, position.expectedHit,
        `${position.name}: independent raster premise; ` +
        `PMG ${player.top}..${player.bottom}, screen $${bolt.physical_pointer.toString(16)} ` +
        `glyph ${bolt.top}..${bolt.bottom}`);
      memory[labels.get("src_ptr")] = bolt.left;
      memory[labels.get("src_ptr") + 1] = bolt.right;
      const cpu = runAssembledRoutineWithCpu(memory, "capital_shell_hits_player", { x: slot });
      assert.equal(cpu.getFlag(0x01), position.expectedHit,
        `owner ${owner}, slot ${slot}, ring ${ringRotations}: ${position.name}; ` +
        `PMG ${player.top}..${player.bottom}, screen $${bolt.physical_pointer.toString(16)} ` +
        `glyph ${bolt.top}..${bolt.bottom}, cache ` +
        `${memory[labels.get("BROAD_RASTER_TOP") + slot]}`);
    }
  }
});

test("broadside source timing and schedule are deterministic and generated with turret metadata", () => {
  const second = compileCapitalHulls(loadCapitalHullsDefinition(definitionPath));
  assert.deepEqual(second.scheduleBytes, asset.scheduleBytes);
  assert.equal(renderCapitalHullsCa65Include(second), renderCapitalHullsCa65Include(asset));
  const { capitalExplosion, ...timing } = asset.broadside;
  assert.deepEqual(timing, {
    provisionalFirstCapitalGameplayFrame: 600,
    initialDelayFrames: 2,
    retryDelayFrames: 7,
    scheduleDelayScale: 2,
    scheduleCalmFrames: 64,
    warningFrames: 25,
    warningEarlyFrames: 8,
    warningMediumFrames: 9,
    warningPulsePeriodFrames: 2,
    warningEarlyHeight: 2,
    warningMediumHeight: 4,
    worldScrollRateDenominator: 20,
    hullScrollRateDenominator: 20,
    projectileSpeed: 2,
    warningHeight: 6,
    flyingHeight: 4,
    projectileVisuals: {
      player: { widthHpos: 1, height: 2, coreRegister: "COLPF2", coreValue: 0x1e },
      interceptor: { widthHpos: 2, height: 3, register: "COLPF3", value: 0x46 },
      capital: {
        widthHpos: 8,
        height: 6,
        coreRegister: "COLPF0",
        coreValue: 0x0e,
        alliedRegister: "COLPF2",
        alliedValue: 0x1e,
        alliedAttribute: 0,
        hostileRegister: "COLPF3",
        hostileValue: 0x46,
        hostileAttribute: 0x80,
      },
    },
    impactHeight: 8,
    impactFrames: 5,
    playerDamage: 20,
    damageCooldownFrames: 25,
    capitalHullContactDamage: 20,
    capitalHullContactCooldownFrames: 25,
    minimumVerticalSeparation: 24,
    returnToMenuFrames: 100,
    playerStartingLives: 3,
    respawnInvulnerableFrames: 250,
    respawnBlinkHalfPeriodFrames: 8,
    worldScrollRates: { easy: 8, medium: 9, hard: 10 },
    hullScrollRates: { easy: 8, medium: 9, hard: 10 },
  });
  assert.deepEqual(
    [capitalExplosion.durationFrames, capitalExplosion.phaseFrames,
      capitalExplosion.width, capitalExplosion.height, capitalExplosion.phaseCount,
      capitalExplosion.soundChannel, capitalExplosion.soundAudctl],
    [24, 4, 3, 3, 6, 4, 0],
  );
  assert.deepEqual([...asset.worldScrollRateBytes], [8, 9, 10]);
  assert.deepEqual([...asset.hullScrollRateBytes], [8, 9, 10]);
  assert.deepEqual(asset.schedule.map(({ side }) => side), [
    "enemy", "enemy", "enemy", "allied",
  ]);
  assert.deepEqual(asset.schedule.map(({ baseDelayAfterFrames }) => baseDelayAfterFrames),
    [2, 2, 2, 37]);
  assert.deepEqual(asset.schedule.map(({ delayAfterFrames }) => delayAfterFrames),
    [68, 68, 68, 138]);
  assert.equal(asset.scheduleBytes.length, 8);
  assert.equal(asset.turretBytes.length, 14);
});

test("packed resident broadside image round-trips before the loader and stays within the correction gate", () => {
  const runtime = fs.readFileSync(path.join(rootDirectory, "build", "broadside-runtime.bin"));
  const packed = fs.readFileSync(path.join(rootDirectory, "build", "broadside-runtime-packed.bin"));
  assert.equal(runtime.length, manifest.broadsideRuntime.bytes);
  assert.equal(packed.length, manifest.broadsideRuntime.packedBytes);
  assert.deepEqual(unpackBroadsideLzss(packed), runtime);
  assert.deepEqual(packBroadsideLzss(runtime), packed);
  assert.equal(manifest.broadsideRuntime.runAddress, 0x5e10);
  assert.deepEqual(manifest.payloadBudget.historicalRuntimeHeadroom, {
    baselineBytes: 14314,
    approvedDeltaBytes: 1536,
    limitBytes: 15850,
    finalBytes: 15759,
    preservedForHistory: true,
  });
  assert.ok(manifest.payloadBudget.entityEffectsFoundation.actualDeltaBytes <=
    manifest.payloadBudget.entityEffectsFoundation.approvedDeltaBytes);
  const starRuntime = fs.readFileSync(path.join(rootDirectory, "build", "starfield-runtime.bin"));
  const starPacked = fs.readFileSync(path.join(rootDirectory, "build", "starfield-runtime-packed.bin"));
  assert.deepEqual(unpackBroadsideLzss(starPacked), starRuntime);
  assert.equal(starPacked.length, manifest.starfieldRuntime.packedBytes);
  assert.ok(starPacked.length <= 0x706);
  assert.match(routine("start", "broadside_unpack_command"),
    /jsr stage_boot_streams[\s\S]+boot_chunk_ready[\s\S]+jsr unpack_resident_runtime[\s\S]+jsr unpack_entity_runtime[\s\S]+jsr stage_a2_kernel[\s\S]+jsr init_entity_effects[\s\S]+jsr unpack_loader_bitmap[\s\S]+jsr show_loader[\s\S]+jsr unpack_starfield_runtime/);
  assert.match(routine("boot_stage2_atr_entry", "boot_stage2_xex_entry"),
    /jsr boot_stage2_validate_manifest[\s\S]+jsr SIOV[\s\S]+jsr boot_stage2_crc16[\s\S]+jsr broadside_unpack_command/);
});

test("M0 remains isolated while M1-M3 masked writes and SIZEM updates preserve every other pair", () => {
  assert.deepEqual(MISSILE_MASKS, [0x03, 0x0c, 0x30, 0xc0]);
  assert.deepEqual(MISSILE_CLEAR_MASKS, [0xfc, 0xf3, 0xcf, 0x3f]);
  assert.deepEqual(MISSILE_COLORS, [0x0e, 0x84, 0x46, 0x28]);
  for (let byte = 0; byte <= 0xff; byte += 1) {
    for (let missile = 0; missile < 4; missile += 1) {
      const unrelated = MISSILE_CLEAR_MASKS[missile];
      assert.equal(updateMissileByte(byte, missile, true) & unrelated, byte & unrelated);
      assert.equal(updateMissileByte(byte, missile, false) & unrelated, byte & unrelated);
      assert.equal(updateMissileSize(byte, missile, 1) & unrelated, byte & unrelated);
    }
  }
  for (const [name, end] of [["allocate_player_fighter_projectile", "update_enemy_weapon_runtime"],
    ["update_fighter_projectiles", "player_fighter_projectile_hits_enemy"],
    ["erase_bullet", "init_fighter_projectiles"]]) {
    const text = routine(name, end);
    assert.doesNotMatch(text, /MISSILES|HPOSM0|SIZEM/,
      "fighter burst rendering must not consume or mutate M0");
  }
  assert.doesNotMatch(routine("allocate_player_fighter_projectile", "update_enemy_weapon_runtime"),
    /initialize_projectile_screen_pointer/,
    "unrendered allocations must defer their redundant screen-pointer calculation");
  assert.match(routine("render_fighter_projectile_overlays", "build_interceptor_projectile_glyphs"),
    /initialize_projectile_screen_pointer/,
    "the real overlay renderer remains the authoritative pointer owner");
  assert.match(routine("init_broadside", "update_broadside"),
    /lda SIZEM[\s\S]+and #\$03[\s\S]+ora #BROADSIDE_DOUBLE_SIZES/);
});

test("warnings start at source-declared visible muzzles and enforce the vertical safety gap", () => {
  const state = createBroadsideState(asset);
  const enemy = beginWarning(state, asset, enemyTurretIndex, 0, 14);
  const allied = beginWarning(state, asset, alliedTurretIndex, 1, 10);
  assert.deepEqual(
    [enemy.x, enemy.y],
    Object.values(muzzlePosition(asset.turrets[enemyTurretIndex], 14)).slice(0, 2),
  );
  assert.equal(Math.abs(enemy.y - allied.y), 32);
  assert.equal(enemy.timer, 25);
  assert.throws(() => beginWarning(
    createBroadsideState(asset), asset, alliedTurretIndex, 0, 1), /unsafe turret/);
  assert.throws(() => beginWarning(
    state, asset, enemyTurretIndex, 2, 11), /vertical safety separation/);
  for (let frame = 0; frame < 24; frame += 1) advanceProjectile(enemy, asset);
  assert.equal(enemy.state, BROADSIDE_STATES.WARNING);
  advanceProjectile(enemy, asset);
  assert.equal(enemy.state, BROADSIDE_STATES.FLYING);
});

test("firing opportunities choose the oldest safe visible cannon once per lifecycle", () => {
  const state = createBroadsideState(asset);
  const world = createWorldScrollState(asset, {
    difficulty: "hard",
    initialSectorPhase: 124,
  });
  assert.deepEqual(
    ["easy", "medium", "hard"].map((difficulty) =>
      warningHullAdvanceAllowance(asset, difficulty)),
    [10, 12, 13],
  );
  const selected = selectOldestEligibleTurret(state, asset, world, "allied");
  assert.equal(selected.turret.id, "allied_turret_a");
  assert.equal(selected.sectorRow, 113);
  assert.equal(selected.visibleScreenRow, 11);
  beginWarning(
    state,
    asset,
    selected.turretIndex,
    0,
    selected.visibleScreenRow,
    selected.lifecycleId,
  );
  assert.equal(selectOldestEligibleTurret(state, asset, world, "allied"), undefined,
    "a reserved finite cannon lifecycle cannot be selected twice");
  world.visibleRows.fill(null);
  resetExitedTurretLifecycles(state, asset, world);
  assert.equal(state.firedTurrets.has(selected.lifecycleId), false);
});

test("all 25 warning frames visibly grow compact-medium-hot and launch without a path jump", () => {
  const state = createBroadsideState(asset);
  const allied = beginWarning(state, asset, alliedTurretIndex, 0, 10);
  const enemy = beginWarning(state, asset, enemyTurretIndex, 1, 14);
  const alliedFrames = [];
  const enemyFrames = [];
  for (let timer = asset.broadside.warningFrames; timer >= 1; timer -= 1) {
    allied.timer = timer;
    enemy.timer = timer;
    alliedFrames.push(warningVisual(allied, asset));
    enemyFrames.push(warningVisual(enemy, asset));
  }
  assert.equal(alliedFrames.length, 25);
  assert.equal(alliedFrames.every(({ visible }) => visible), true);
  assert.deepEqual(
    ["early", "medium", "hot"].map((phase) =>
      alliedFrames.filter((frame) => frame.phase === phase).length),
    [8, 9, 8],
  );
  assert.deepEqual(
    [alliedFrames[0].area, alliedFrames[8].area, alliedFrames[17].area],
    [2, 8, 24],
  );
  assert.deepEqual(alliedFrames.slice(17).map(({ size }) => size), [3, 3, 1, 1, 3, 3, 1, 1]);
  assert.equal(alliedFrames[24].size, 1, "final warning uses the flying double width");
  assert.equal(alliedFrames[24].x, allied.x, "allied launch keeps the final warning HPOS");
  assert.equal(enemyFrames[24].x, enemy.x, "enemy launch keeps the final warning HPOS");
  assert.ok(alliedFrames[17].x >= allied.x, "allied charge grows right into the corridor");
  assert.ok(enemyFrames[17].x < enemy.x, "enemy charge grows left into the corridor");
  assert.equal(centeredSpanTop(allied.y, alliedFrames[24].height), allied.y - 3);
  assert.equal(missileWidth(alliedFrames[24].size), 2);
  assert.match(routine("render_broadside_warning", "scroll_broadside_scene"),
    /set_broadside_slot_normal[\s\S]+set_broadside_slot_double[\s\S]+set_broadside_slot_quad/);
  assert.doesNotMatch(routine("render_broadside_warning", "scroll_broadside_scene"), /@hidden/);
});

test("three fixed slots move in faction directions and never allocate a fourth projectile", () => {
  const state = createBroadsideState(asset);
  beginWarning(state, asset, enemyTurretIndex, 0, 14);
  beginWarning(state, asset, alliedTurretIndex, 1, 10);
  beginWarning(state, asset, enemyTurretIndex, 2, 5);
  assert.equal(activeProjectileCount(state), 3);
  assert.equal(state.slots.every(({ missile }, index) => missile === index + 1), true);
  const [enemy, allied] = state.slots;
  enemy.state = allied.state = BROADSIDE_STATES.FLYING;
  const [enemyX, alliedX] = [enemy.x, allied.x];
  advanceProjectile(enemy, asset);
  advanceProjectile(allied, asset);
  assert.equal(enemy.x, enemyX - 2);
  assert.equal(allied.x, alliedX + 2);
});

test("assembled isolated BROADSIDE slot is one connected object across a 100-frame lifecycle observation", () => {
  const constants = readGameGraphicsSource(source, definition).constants;
  const addresses = Object.fromEntries([
    "BROAD_STATE", "BROAD_OWNER", "BROAD_X", "BROAD_Y", "BROAD_PREV_Y",
    "BROAD_PREV_H", "BROAD_COLLISION", "BROAD_ROW_LO", "BROAD_ROW_HI",
  ].map((name) => [name, labels.get(name) ?? constants.get(name)]));
  const lastRingRow = canonicalPlayfield.ringBufferAddress +
    (canonicalPlayfield.ringRows - 1) * canonicalPlayfield.screenColumns;
  const base = Uint8Array.from({ length: 40 }, (_, index) => 1 + (index & 7));
  const glyphBytes = [0x00, 0x3e, 0x3e, 0x7f, 0x7f, 0x3e, 0x3e, 0x00,
    0x00, 0x7c, 0x7c, 0xfe, 0xfe, 0x7c, 0x7c, 0x00];

  for (const owner of [0, 1]) {
    const memory = createLinkedRuntimeMemory();
    runAssembledRoutine(memory, "init_broadside");
    assert.deepEqual(Array.from(memory.subarray(0x4400 + 126 * 8, 0x4400 + 128 * 8)),
      glyphBytes, "runtime must install the connected left/right bolt halves");
    memory.set(base, lastRingRow);
    memory[labels.get("CAPITAL_SECTOR_STATE")] = CAPITAL_SECTOR_STATES.DRAIN;
    memory[labels.get("PLAYER_LIFECYCLE")] = PLAYER_LIFECYCLE_STATES.ALIVE;
    memory[labels.get("player_x")] = 48;
    memory[labels.get("player_y")] = 24;
    memory[addresses.BROAD_STATE] = BROADSIDE_STATES.FLYING;
    memory[addresses.BROAD_OWNER] = owner;
    memory[addresses.BROAD_X] = owner === 0 ? 84 : 172;
    memory[addresses.BROAD_Y] = 120;
    memory[addresses.BROAD_ROW_LO] = lastRingRow & 0xff;
    memory[addresses.BROAD_ROW_HI] = lastRingRow >> 8;

    let flyingFrames = 0;
    let drawCalls = 0;
    let eraseCalls = 0;
    for (let frame = 0; frame < 100; frame += 1) {
      if (memory[addresses.BROAD_STATE] === BROADSIDE_STATES.FLYING) {
        const rasterX = memory[addresses.BROAD_X] & 0xfc;
        const column = (rasterX - 48) >> 2;
        runAssembledRoutine(memory, "render_capital_shell_overlays");
        drawCalls += 1;
        flyingFrames += 1;
        const expectedCodes = owner === 0 ? [126, 127] : [254, 255];
        assert.deepEqual(Array.from(memory.subarray(lastRingRow + column,
          lastRingRow + column + 2)), expectedCodes, `owner ${owner} frame ${frame}`);
        assert.equal(connectedShellObjects(memory, expectedCodes), 1,
          `owner ${owner} frame ${frame} split into multiple visible objects`);
        runAssembledRoutine(memory, "update_broadside");
        eraseCalls += 1;
        assert.deepEqual(Array.from(memory.subarray(lastRingRow, lastRingRow + 40)),
          Array.from(base), `owner ${owner} frame ${frame} left a stale footprint`);
        assert.deepEqual([memory[addresses.BROAD_PREV_H], memory[addresses.BROAD_PREV_Y],
          memory[addresses.BROAD_COLLISION]], [0, 0, 0]);
      } else {
        runAssembledRoutine(memory, "update_broadside");
        assert.deepEqual(Array.from(memory.subarray(lastRingRow, lastRingRow + 40)),
          Array.from(base));
      }
    }
    assert.ok(flyingFrames >= 62 && flyingFrames <= 63,
      "fixed speed and the 48..207 playfield bound determine the legal flight length");
    assert.equal(drawCalls, flyingFrames);
    assert.equal(eraseCalls, flyingFrames);
    assert.equal(memory[addresses.BROAD_STATE], BROADSIDE_STATES.FREE);
  }
  assert.match(routine("update_broadside", "schedule_broadside"),
    /ldx #\(BROADSIDE_SLOT_COUNT-1\)[\s\S]+jsr erase_broadside_slot[\s\S]+dex[\s\S]+bpl @erase_slot/);
  assert.match(routine("render_capital_shell_overlays", "draw_broadside_span"),
    /ldx #\$00[\s\S]+jsr render_capital_shell_overlay[\s\S]+inx/);
});

test("assembled BROADSIDE overlap unwinds 0->2 draw with 2->0 erase for every slot pair", () => {
  const pairs = [[0, 1], [0, 2], [1, 2]];
  const ownerOrders = [[0, 1], [1, 0]];
  const overlapKinds = ["full", "partial"];
  const constants = readGameGraphicsSource(source, definition).constants;
  const addresses = Object.fromEntries([
    "BROAD_STATE", "BROAD_OWNER", "BROAD_X", "BROAD_Y", "BROAD_TIMER",
    "BROAD_PREV_Y", "BROAD_PREV_H", "BROAD_COLLISION", "BROAD_ROW_LO",
    "BROAD_ROW_HI",
  ].map((name) => [name, labels.get(name) ?? constants.get(name)]));
  const lastRingRow = canonicalPlayfield.ringBufferAddress +
    (canonicalPlayfield.ringRows - 1) * canonicalPlayfield.screenColumns;
  const otherRingRow = canonicalPlayfield.ringBufferAddress + 5 *
    canonicalPlayfield.screenColumns;
  const base = Uint8Array.from({ length: 40 }, (_, index) => 1 + (index & 0x07));

  for (const pair of pairs) {
    for (const owners of ownerOrders) for (const overlapKind of overlapKinds) {
      const memory = createLinkedRuntimeMemory();
      memory.set(base, lastRingRow);
      memory.set(base, otherRingRow);
      memory[labels.get("CAPITAL_SECTOR_STATE")] = CAPITAL_SECTOR_STATES.DRAIN;
      memory[constants.get("BROAD_DAMAGE_APPLIED")] = 0;
      memory[constants.get("BROAD_DAMAGE_COOLDOWN")] = 0;
      memory[constants.get("BROAD_PLAYER_HEALTH")] = 10;
      memory[labels.get("PLAYER_LIFECYCLE")] = PLAYER_LIFECYCLE_STATES.ALIVE;
      memory[labels.get("player_x")] = 48;
      memory[labels.get("player_y")] = 24;

      const third = [0, 1, 2].find((slot) => !pair.includes(slot));
      for (let slot = 0; slot < 3; slot += 1) {
        const participant = pair.includes(slot);
        const owner = participant ? owners[pair.indexOf(slot)] : owners[0];
        const targetX = overlapKind === "full" ? 120 : owner === 0 ? 116 : 120;
        memory[addresses.BROAD_STATE + slot] = BROADSIDE_STATES.FLYING;
        memory[addresses.BROAD_OWNER + slot] = owner;
        memory[addresses.BROAD_X + slot] = participant
          ? targetX + (owner === 0 ? -asset.broadside.projectileSpeed
            : asset.broadside.projectileSpeed) : 80;
        memory[addresses.BROAD_Y + slot] = participant ? 120 : 80;
        const rowAddress = participant ? lastRingRow : otherRingRow;
        memory[addresses.BROAD_ROW_LO + slot] = rowAddress & 0xff;
        memory[addresses.BROAD_ROW_HI + slot] = rowAddress >> 8;
      }

      const thirdBefore = {
        owner: memory[addresses.BROAD_OWNER + third],
        state: memory[addresses.BROAD_STATE + third],
        x: memory[addresses.BROAD_X + third],
        y: memory[addresses.BROAD_Y + third],
        rowLo: memory[addresses.BROAD_ROW_LO + third],
        rowHi: memory[addresses.BROAD_ROW_HI + third],
      };
      runAssembledRoutine(memory, "render_capital_shell_overlays");
      runAssembledRoutine(memory, "update_broadside");
      assert.deepEqual(pair.map((slot) => memory[addresses.BROAD_STATE + slot]),
        [BROADSIDE_STATES.FLYING, BROADSIDE_STATES.FLYING],
        `${overlapKind} overlap must not create IMPACT`);
      assert.deepEqual(pair.map((slot) => memory[addresses.BROAD_OWNER + slot]), owners,
        "pass-through must not copy either participant owner/glyph selection");
      assert.deepEqual(Array.from(memory.subarray(lastRingRow, lastRingRow + 40)),
        Array.from(base), "reverse erase must restore the last physical ring row byte-exactly");

      const overlapColumns = pair.map((slot) =>
        ((memory[addresses.BROAD_X + slot] & 0xfc) - 48) >> 2);
      assert.equal(overlapKind === "full" ? overlapColumns[0] === overlapColumns[1]
        : Math.abs(overlapColumns[0] - overlapColumns[1]) === 1, true);
      runAssembledRoutine(memory, "render_capital_shell_overlays");
      const upper = Math.max(...pair);
      const lower = Math.min(...pair);
      if (overlapKind === "full") {
        assert.notEqual(memory[addresses.BROAD_PREV_Y + upper],
          base[overlapColumns[0]], "later slot must cache the earlier slot's transient");
        assert.notEqual(memory[addresses.BROAD_COLLISION + upper],
          base[overlapColumns[0] + 1], "full overlap must stack both cached cells");
      } else {
        const sharedColumn = Math.max(...overlapColumns);
        assert.notEqual(memory[lastRingRow + sharedColumn], base[sharedColumn],
          "partial overlap must have one deterministic top-layer cell");
      }

      runAssembledRoutine(memory, "update_broadside");
      assert.deepEqual(pair.map((slot) => memory[addresses.BROAD_STATE + slot]),
        [BROADSIDE_STATES.FLYING, BROADSIDE_STATES.FLYING]);
      assert.deepEqual(Array.from(memory.subarray(lastRingRow, lastRingRow + 40)),
        Array.from(base), "reverse erase must unwind the painter stack before separation");
      runAssembledRoutine(memory, "render_capital_shell_overlays");
      runAssembledRoutine(memory, "update_broadside");
      assert.deepEqual(pair.map((slot) => memory[addresses.BROAD_STATE + slot]),
        [BROADSIDE_STATES.FLYING, BROADSIDE_STATES.FLYING]);
      assert.deepEqual(Array.from(memory.subarray(lastRingRow, lastRingRow + 40)),
        Array.from(base), "separated shells must leave no shared or orphan glyph");

      assert.equal(memory[addresses.BROAD_OWNER + third], thirdBefore.owner);
      assert.equal(memory[addresses.BROAD_STATE + third], thirdBefore.state);
      assert.equal(memory[addresses.BROAD_Y + third], thirdBefore.y);
      assert.equal(memory[addresses.BROAD_ROW_LO + third], thirdBefore.rowLo);
      assert.equal(memory[addresses.BROAD_ROW_HI + third], thirdBefore.rowHi);
      assert.equal(memory[addresses.BROAD_X + third], thirdBefore.x +
        3 * (thirdBefore.owner === 0 ? asset.broadside.projectileSpeed :
          -asset.broadside.projectileSpeed));
      assert.deepEqual(Array.from(memory.subarray(addresses.BROAD_COLLISION,
        addresses.BROAD_COLLISION + 3)), [0, 0, 0], "screen backings stay transient-free");
      for (const slot of pair) {
        assert.equal(memory[addresses.BROAD_PREV_H + slot], 0);
        assert.equal(memory[addresses.BROAD_PREV_Y + slot], 0);
        assert.equal(memory[addresses.BROAD_COLLISION + slot], 0);
      }
      assert.deepEqual(Array.from(memory.subarray(lastRingRow, lastRingRow + 40)),
        Array.from(base), "no projectile code may return at the physical ring boundary");
    }
  }

  const update = routine("update_broadside", "schedule_broadside");
  assert.doesNotMatch(update, /integration_capital_shell_overlap/);
  assert.match(update, /@targets:[\s\S]+jmp @world_targets[\s\S]+@world_targets:\s+jsr capital_shell_collision_flags/);
  assert.match(update,
    /ldx #\(BROADSIDE_SLOT_COUNT-1\)[\s\S]+jsr erase_broadside_slot[\s\S]+dex[\s\S]+bpl @erase_slot[\s\S]+ldx #\$00/);
  assert.match(routine("render_capital_shell_overlays", "draw_broadside_span"),
    /ldx #\$00[\s\S]+jsr render_capital_shell_overlay[\s\S]+inx/);
  assert.match(glueRoutine("render_capital_shell_overlay", "integration_broadside_release"),
    /sta BROAD_PREV_H,x[\s\S]+sta BROAD_PREV_Y,x[\s\S]+sta BROAD_COLLISION,x[\s\S]+CAPITAL_SHELL_LEFT_GLYPH[\s\S]+adc #\$01/);
});

test("assembled fractional cadence makes hull movement 100% of the legacy world rate", () => {
  assert.deepEqual(HULL_SCROLL_DIFFICULTIES, { easy: 0, medium: 1, hard: 2 });
  assert.equal(asset.broadside.worldScrollRateDenominator, 20);
  assert.equal(asset.broadside.hullScrollRateDenominator, 20);
  const expected = {
    easy: { rate: 8, world: [8, 40, 400], hull: [8, 40, 400], scanlines: [160, 160] },
    medium: { rate: 9, world: [9, 45, 450], hull: [9, 45, 450], scanlines: [180, 180] },
    hard: { rate: 10, world: [10, 50, 500], hull: [10, 50, 500], scanlines: [200, 200] },
  };
  for (const [difficulty, contract] of Object.entries(expected)) {
    assert.equal(worldScrollRate(asset, difficulty), contract.rate);
    assert.equal(hullScrollRate(asset, difficulty), contract.rate);
    for (const [index, frames] of [20, 100, 1000].entries()) {
      const world = createWorldScrollState(asset, { difficulty });
      let worldAdvances = 0;
      let hullAdvances = 0;
      for (let frame = 0; frame < frames; frame += 1) {
        worldAdvances += Number(advanceWorldScroll(world, asset));
        hullAdvances += Number(advanceHullScroll(world, asset));
        assert.ok(world.accumulator >= 0 &&
          world.accumulator < asset.broadside.worldScrollRateDenominator);
        assert.ok(world.hullAccumulator >= 0 &&
          world.hullAccumulator < asset.broadside.hullScrollRateDenominator);
      }
      assert.equal(worldAdvances, contract.world[index]);
      assert.equal(hullAdvances, contract.hull[index]);
      assert.equal(world.accumulator, 0, "complete rate windows have no temporal drift");
      assert.equal(world.hullAccumulator,
        frames * contract.rate % asset.broadside.hullScrollRateDenominator,
        "hull accumulator keeps its exact fractional remainder without drift");
    }
    assert.equal(worldScrollRate(asset, difficulty) * 50 * 8 /
      asset.broadside.worldScrollRateDenominator, contract.scanlines[0]);
    assert.equal(hullScrollRate(asset, difficulty) * 50 * 8 /
      asset.broadside.hullScrollRateDenominator, contract.scanlines[1]);
  }

  const hard = createWorldScrollState(asset, { difficulty: "hard" });
  assert.equal(advanceWorldScroll(hard, asset), false);
  assert.equal(hard.accumulator, 10);
  assert.equal(advanceWorldScroll(hard, asset), true);
  assert.equal(hard.accumulator, 0);
  assert.equal(hard.advances, 1);
  assert.equal(hard.visibleScrolls, 0);
  assert.equal(advanceHullScroll(hard, asset), false);
  assert.equal(advanceHullScroll(hard, asset), true);
  assert.equal(hard.visibleScrolls, 1);
  assert.equal(hard.visibleRows[0], 0);
  assert.equal(hard.corridorPhase, 1);
  hard.accumulator = 19;
  assert.equal(advanceWorldScroll(hard, asset), true);
  assert.equal(hard.accumulator, 9, "threshold subtraction handles the maximum sum safely");

  const slot = beginWarning(
    createBroadsideState(asset), asset, alliedTurretIndex, 0, 10);
  slot.state = BROADSIDE_STATES.FLYING;
  const x = slot.x;
  advanceProjectile(slot, asset);
  assert.equal(slot.x - x, 2, "shell movement remains two HPOS units per PAL frame");
  assert.match(routine("init_state", "clear_pmg"), /lda #\$00[\s\S]+sta scroll_accumulator/);
  assert.match(routine("update_starfield", "generate_corridor_row"),
    /ldx DIFFICULTY_SETTING[\s\S]+adc hull_scroll_rates,x[\s\S]+cmp #HULL_SCROLL_RATE_DENOMINATOR[\s\S]+sbc #HULL_SCROLL_RATE_DENOMINATOR/);
  assert.match(routine("main_loop", "wait_frame"),
    /jsr wait_gameplay_frame[\s\S]+jsr update_starfield[\s\S]+jmp main_loop/);
  const rateTableAddress = labels.get("hull_scroll_rates");
  const difficultyAddress = readGameGraphicsSource(source, definition).constants.get(
    "DIFFICULTY_SETTING",
  );
  assert.deepEqual([...broadsideRuntimeBytesAt(rateTableAddress, 3)], [8, 9, 10]);
  const update = xexBytesAt(labels.get("update_starfield"), 56);
  assert.notEqual(update.indexOf(Buffer.from([
    0xae, difficultyAddress & 0xff,
    difficultyAddress >> 8,
    0xa5, labels.get("scroll_accumulator"), 0x18, 0x7d,
    labels.get("world_scroll_rates") & 0xff,
    labels.get("world_scroll_rates") >> 8, 0xc9, 20,
  ])), -1);
  assert.notEqual(update.indexOf(Buffer.from([0xe9, 20, 0x85,
    labels.get("scroll_accumulator")])), -1);
  const init = xexBytesAt(
    labels.get("init_state"),
    labels.get("clear_pmg") - labels.get("init_state"),
  );
  assert.notEqual(init.indexOf(Buffer.from([0xa9, 0x00, 0x85,
    labels.get("scroll_accumulator")])), -1);
  assert.notEqual(init.indexOf(Buffer.from([0x8d,
    difficultyAddress + 1 & 0xff, difficultyAddress + 1 >> 8])), -1);
});

test("tracked muzzle records replace the full-row redraw scan without changing scroll cadence", () => {
  const update = routine("update_starfield", "generate_corridor_row");
  const worldRing = routine("scroll_world_columns", "init_playfield_display_lists");
  const hullCopy = routine("scroll_hull_columns", "update_sector_state");
  assert.match(update,
    /jsr scroll_hull_columns[\s\S]+lsr PLAYFIELD_RING_FLAGS[\s\S]+rts/);
  assert.match(worldRing,
    /jsr restore_active_muzzles\s+lda #\$01\s+sta PLAYFIELD_RING_FLAGS\s+jsr rotate_playfield_rows[\s\S]+sta CORRIDOR_BOUNDARY_LEFT[\s\S]+sta CORRIDOR_BOUNDARY_RIGHT/,
    "a world step must restore divider transients before rotating LMS rows");
  assert.match(hullCopy,
    /jsr restore_active_muzzles[\s\S]+jsr advance_tracked_muzzles[\s\S]+jsr track_top_muzzles[\s\S]+jsr redraw_tracked_muzzles/,
    "a hull step must restore, advance, claim and redraw at most two tracked records");
  assert.doesNotMatch(source, /restore_boundary_stars:/,
    "the ring must retain existing boundary cells rather than rewrite 46 cells");
  assert.doesNotMatch(source, /redraw_visible_muzzles:/,
    "the removed full visible-row scan must not return");
  assert.match(routine("reset_exited_turret_lifecycles", "generate_corridor_row"),
    /lda MUZZLE_SCREEN_HI,x[\s\S]+sta BROAD_TURRET_FIRED,x/,
    "turret lifecycle release must use the same tracked visibility record");
});

test("capital exit preserves one full-scene recycle per production world event", () => {
  const update = routine("update_starfield", "generate_corridor_row");
  const hullCopy = routine("scroll_hull_columns", "update_sector_state");

  assert.match(update,
    /@hull_scroll:[\s\S]+jsr scroll_hull_columns[\s\S]+lsr PLAYFIELD_RING_FLAGS[\s\S]+rts/,
    "the production dispatcher must consume the row-rotation latch after every hull-rate event");
  assert.match(hullCopy,
    /cmp #CAPITAL_HULL_STATE_COMPLETE[\s\S]+bcc scroll_hull_active[\s\S]+lsr PLAYFIELD_RING_FLAGS[\s\S]+bcc scroll_hull_complete_scroll[\s\S]+rts[\s\S]+scroll_hull_complete_scroll:[\s\S]+jmp scroll_world_columns/,
    "COMPLETE must recycle an ordinary full-width row unless the same world event already did so");
});

test("assembled muzzle records preserve backing and complete the full visible lifecycle", () => {
  const memory = createLinkedRuntimeMemory();
  const muzzleDomain = labels.get("MUZZLE_ROW_DOMAIN");
  const muzzleRow = labels.get("MUZZLE_VISIBLE_ROW");
  const muzzleLo = labels.get("MUZZLE_SCREEN_LO");
  const muzzleHi = labels.get("MUZZLE_SCREEN_HI");
  const leftBacking = labels.get("CORRIDOR_BOUNDARY_LEFT");
  const rightBacking = labels.get("CORRIDOR_BOUNDARY_RIGHT");
  const turretFired = labels.get("BROAD_TURRET_FIRED");
  const destination = labels.get("dst_ptr");
  const gameplayScreen = 0x4028;
  const logicalAddress = (row) => row === 0 ? gameplayScreen :
    memory[labels.get("PLAYFIELD_ROW_LO") + row - 1] |
      memory[labels.get("PLAYFIELD_ROW_HI") + row - 1] << 8;
  const alliedColumn = 8;
  const enemyColumn = 31;

  for (let row = 0; row < canonicalPlayfield.gameplayRows; row += 1) {
    memory[leftBacking + row] = 0x10 + row;
    memory[rightBacking + row] = 0x30 + row;
  }
  memory[destination] = gameplayScreen & 0xff;
  memory[destination + 1] = gameplayScreen >> 8;
  memory[gameplayScreen + alliedColumn] = 0x45;
  memory[gameplayScreen + enemyColumn] = 0xd0;
  memory[muzzleDomain] = 1;
  memory[muzzleDomain + 1] = 1;
  memory[muzzleRow] = 24;
  memory[muzzleRow + 1] = 24;
  memory[turretFired] = 1;
  memory[turretFired + 1] = 1;
  runAssembledRoutine(memory, "track_top_muzzles");

  assert.deepEqual(
    [memory[muzzleDomain], memory[muzzleDomain + 1],
      memory[muzzleRow], memory[muzzleRow + 1]],
    [0, 0, 0, 0],
  );
  assert.deepEqual(Array.from(memory.subarray(turretFired, turretFired + 2)), [0, 0],
    "a denser station handoff must start a fresh lifecycle for each owner");
  assert.equal(memory[muzzleLo] | memory[muzzleHi] << 8, gameplayScreen + alliedColumn);
  assert.equal(memory[muzzleLo + 1] | memory[muzzleHi + 1] << 8,
    gameplayScreen + enemyColumn);

  runAssembledRoutine(memory, "restore_active_muzzles");
  assert.equal(memory[gameplayScreen + alliedColumn], 0x10);
  assert.equal(memory[gameplayScreen + enemyColumn], 0x30);
  runAssembledRoutine(memory, "redraw_tracked_muzzles");
  assert.equal(memory[gameplayScreen + alliedColumn], 0x45);
  assert.equal(memory[gameplayScreen + enemyColumn], 0xd0);

  memory[turretFired] = 1;
  memory[turretFired + 1] = 1;
  for (let row = 1; row < canonicalPlayfield.gameplayRows; row += 1) {
    runAssembledRoutine(memory, "restore_active_muzzles");
    runAssembledRoutine(memory, "advance_tracked_muzzles");
    assert.deepEqual([memory[muzzleRow], memory[muzzleRow + 1]], [row, row]);
    assert.deepEqual([memory[muzzleDomain], memory[muzzleDomain + 1]], [1, 1]);
    assert.equal(memory[muzzleLo] | memory[muzzleHi] << 8,
      logicalAddress(row) + alliedColumn);
    assert.equal(memory[muzzleLo + 1] | memory[muzzleHi + 1] << 8,
      logicalAddress(row) + enemyColumn);
  }
  runAssembledRoutine(memory, "reset_exited_turret_lifecycles");
  assert.deepEqual([memory[turretFired], memory[turretFired + 1]], [1, 1]);

  runAssembledRoutine(memory, "restore_active_muzzles");
  runAssembledRoutine(memory, "advance_tracked_muzzles");
  assert.deepEqual(
    [memory[muzzleDomain], memory[muzzleDomain + 1], memory[muzzleRow],
      memory[muzzleRow + 1], memory[muzzleHi], memory[muzzleHi + 1]],
    [0, 0, 0, 0, 0, 0],
  );
  runAssembledRoutine(memory, "reset_exited_turret_lifecycles");
  assert.deepEqual([memory[turretFired], memory[turretFired + 1]], [0, 0]);

  memory[muzzleRow] = 9;
  memory[muzzleHi] = 0x42;
  memory[muzzleDomain] = 1;
  memory[muzzleDomain + 1] = 1;
  runAssembledRoutine(memory, "init_broadside");
  assert.deepEqual(
    Array.from(memory.subarray(muzzleRow, muzzleHi + 2)),
    [0, 0, 0, 0, 0, 0],
    "a new sector/game lifecycle cannot inherit stale muzzle records",
  );
  assert.deepEqual(Array.from(memory.subarray(muzzleDomain, muzzleDomain + 2)), [0, 0]);
});

test("fixed divider muzzles and launch flashes remap without trails through repeated ring wraps", () => {
  const memory = createLinkedRuntimeMemory();
  const muzzleDomain = labels.get("MUZZLE_ROW_DOMAIN");
  const muzzleRow = labels.get("MUZZLE_VISIBLE_ROW");
  const muzzleLo = labels.get("MUZZLE_SCREEN_LO");
  const muzzleHi = labels.get("MUZZLE_SCREEN_HI");
  const rowLo = labels.get("PLAYFIELD_ROW_LO");
  const rowHi = labels.get("PLAYFIELD_ROW_HI");
  const broadRow = labels.get("PLAYFIELD_BROAD_ROW");
  const broadRowLo = labels.get("BROAD_ROW_LO");
  const broadRowHi = labels.get("BROAD_ROW_HI");
  const broadTurret = labels.get("BROAD_TURRET");
  const flashTimer = labels.get("BROAD_FLASH_TIMER");
  const destination = labels.get("dst_ptr");
  const leftBacking = labels.get("CORRIDOR_BOUNDARY_LEFT");
  const rightBacking = labels.get("CORRIDOR_BOUNDARY_RIGHT");
  const divider = 0x4028;
  const columns = [8, 31];
  const muzzleCodes = [asset.turrets[alliedTurretIndex].muzzleScreenCode,
    asset.turrets[enemyTurretIndex].muzzleScreenCode];
  const flashCodes = ["allied", "enemy"].map((side) =>
    asset.glyphs.find(({ name }) => name === `${side}_launch_flash`).screenCode);
  const logicalAddress = (row) => row === 0 ? divider :
    memory[rowLo + row - 1] | memory[rowHi + row - 1] << 8;
  const trackedAddress = (slot) => memory[muzzleLo + slot] |
    memory[muzzleHi + slot] << 8;
  const broadAddress = (slot) => memory[broadRowLo + slot] |
    memory[broadRowHi + slot] << 8;
  const transientCounts = () => {
    const counts = new Map([...muzzleCodes, ...flashCodes].map((code) => [code, 0]));
    for (const [start, end] of [
      [divider, divider + canonicalPlayfield.screenColumns],
      [canonicalPlayfield.ringBufferAddress, canonicalPlayfield.ringBufferEnd],
    ]) for (let address = start; address < end; address += 1) {
        if (counts.has(memory[address])) counts.set(memory[address], counts.get(memory[address]) + 1);
      }
    return counts;
  };

  memory.fill(0, divider, divider + canonicalPlayfield.screenColumns);
  memory.fill(0, canonicalPlayfield.ringBufferAddress, canonicalPlayfield.ringBufferEnd);
  for (let row = 0; row < canonicalPlayfield.gameplayRows; row += 1) {
    memory[leftBacking + row] = 0x11;
    memory[rightBacking + row] = 0x22;
  }
  memory[labels.get("CAPITAL_SECTOR_STATE")] = 0;
  memory[labels.get("corridor_phase")] = 1;

  for (let lifecycle = 0; lifecycle < 3; lifecycle += 1) {
    memory[destination] = divider & 0xff;
    memory[destination + 1] = divider >> 8;
    for (let slot = 0; slot < 2; slot += 1)
      memory[divider + columns[slot]] = muzzleCodes[slot];
    runAssembledRoutine(memory, "track_top_muzzles");
    assert.deepEqual(Array.from(memory.subarray(muzzleDomain, muzzleDomain + 2)), [0, 0]);
    assert.deepEqual([trackedAddress(0), trackedAddress(1)],
      [divider + columns[0], divider + columns[1]]);

    for (let slot = 0; slot < 2; slot += 1) {
      memory[broadRow + slot] = 0;
      memory[broadRowLo + slot] = divider & 0xff;
      memory[broadRowHi + slot] = divider >> 8;
      memory[broadTurret + slot] = slot;
      memory[flashTimer + slot] = lifecycle === 0 ? 4 : 0;
    }
    if (lifecycle === 0) runAssembledRoutine(memory, "render_launch_flashes");

    for (let row = 1; row <= canonicalPlayfield.gameplayRows; row += 1) {
      const oldPointers = [trackedAddress(0), trackedAddress(1)];
      runAssembledRoutine(memory, "scroll_world_columns");
      for (const [slot, pointer] of oldPointers.entries()) {
        assert.notEqual(memory[pointer], muzzleCodes[slot],
          `lifecycle ${lifecycle} row ${row}: old muzzle cell was not restored`);
        assert.notEqual(memory[pointer], flashCodes[slot],
          `lifecycle ${lifecycle} row ${row}: old flash cell was copied`);
      }
      for (let slot = 0; slot < 2; slot += 1) {
        assert.equal([...muzzleCodes, ...flashCodes].includes(
          memory[divider + columns[slot]]), false,
        `lifecycle ${lifecycle} row ${row}: divider retained a transient`);
      }

      runAssembledRoutine(memory, "advance_tracked_muzzles");
      if (row <= 4 && lifecycle === 0) {
        for (let slot = 0; slot < 2; slot += 1)
          runAssembledRoutine(memory, "advance_broadside_row", { x: slot });
      }
      if (row < canonicalPlayfield.gameplayRows) {
        assert.deepEqual(Array.from(memory.subarray(muzzleDomain, muzzleDomain + 2)), [1, 1]);
        assert.deepEqual([trackedAddress(0), trackedAddress(1)],
          columns.map((column) => logicalAddress(row) + column));
        runAssembledRoutine(memory, "redraw_tracked_muzzles");
        if (row <= 4 && lifecycle === 0) {
          assert.deepEqual([broadAddress(0), broadAddress(1)],
            [logicalAddress(row), logicalAddress(row)]);
          runAssembledRoutine(memory, "render_launch_flashes");
        }
        const counts = transientCounts();
        const expectedCodes = row <= 4 && lifecycle === 0 ? flashCodes : muzzleCodes;
        for (const code of [...muzzleCodes, ...flashCodes]) {
          assert.equal(counts.get(code), expectedCodes.filter((value) => value === code).length,
            `lifecycle ${lifecycle} row ${row}: illegal transient code $${code.toString(16)}`);
        }
      } else {
        assert.deepEqual(Array.from(memory.subarray(muzzleDomain, muzzleDomain + 2)), [0, 0]);
        assert.deepEqual([memory[muzzleHi], memory[muzzleHi + 1]], [0, 0]);
        assert.equal([...transientCounts().values()].reduce((sum, count) => sum + count, 0), 0);
      }
      if (row === 4) {
        memory[flashTimer] = 0;
        memory[flashTimer + 1] = 0;
      }
    }
  }
});

test("muzzle remapping leaves the single late booster compositor unchanged", () => {
  const main = routine("main_loop", "wait_frame");
  const muzzle = routine("restore_active_muzzles", "generate_corridor_row");
  assert.equal((source.match(/jmp render_weapon_pickup_overlay/g) ?? []).length, 1);
  assert.match(main, /jsr entity_effects_erase[\s\S]+jsr entity_effects_render/);
  assert.doesNotMatch(muzzle, /WEAPON_PICKUP|ENTITY_(?:BACKING|DRAWN_MASK)/);
});

test("hybrid world ring and hull-only copy preserve every logical row and both hull bands", () => {
  const gameplayScreen = 0x4028;
  const rowLo = labels.get("PLAYFIELD_ROW_LO");
  const rowHi = labels.get("PLAYFIELD_ROW_HI");
  const leftBacking = labels.get("CORRIDOR_BOUNDARY_LEFT");
  const rightBacking = labels.get("CORRIDOR_BOUNDARY_RIGHT");
  const logicalAddress = (memory, row) => row === 0
    ? gameplayScreen
    : memory[rowLo + row - 1] | memory[rowHi + row - 1] << 8;
  const fillScreen = (memory) => {
    const snapshot = new Uint8Array(canonicalPlayfield.gameplayRows * 40);
    for (let row = 0; row < canonicalPlayfield.gameplayRows; row += 1) {
      const address = logicalAddress(memory, row);
      for (let column = 0; column < 40; column += 1) {
        const value = (row * 41 + column * 7 + 3) & 0xff;
        memory[address + column] = value;
        snapshot[row * 40 + column] = value;
      }
      memory[leftBacking + row] = 0x20 + row;
      memory[rightBacking + row] = 0x60 + row;
    }
    return snapshot;
  };
  const snapshotScreen = (memory) => Uint8Array.from(
    { length: canonicalPlayfield.gameplayRows * 40 }, (_, index) => {
      const row = Math.floor(index / 40);
      return memory[logicalAddress(memory, row) + index % 40];
    },
  );

  const corridorMemory = createLinkedRuntimeMemory();
  const corridorBefore = fillScreen(corridorMemory);
  corridorMemory[0x4ea5] = 0;
  runAssembledRoutine(corridorMemory, "scroll_world_columns");
  for (let row = 1; row < canonicalPlayfield.gameplayRows; row += 1) {
    const address = logicalAddress(corridorMemory, row);
    for (let column = 8; column <= 31; column += 1) {
      assert.equal(corridorMemory[address + column],
        corridorBefore[(row - 1) * 40 + column], `corridor ${row},${column}`);
    }
    assert.equal(corridorMemory[leftBacking + row], 0x20 + row - 1);
    assert.equal(corridorMemory[rightBacking + row], 0x60 + row - 1);
  }

  const completeMemory = createLinkedRuntimeMemory();
  const completeBefore = fillScreen(completeMemory);
  completeMemory[0x4ea5] = 6;
  runAssembledRoutine(completeMemory, "scroll_world_columns");
  for (let row = 1; row < canonicalPlayfield.gameplayRows; row += 1) {
    const address = logicalAddress(completeMemory, row);
    for (let column = 0; column < 40; column += 1) {
      assert.equal(completeMemory[address + column],
        completeBefore[(row - 1) * 40 + column], `complete ${row},${column}`);
    }
  }

  const completeDispatchMemory = createLinkedRuntimeMemory();
  const completeDispatchBefore = fillScreen(completeDispatchMemory);
  completeDispatchMemory[labels.get("CAPITAL_SECTOR_STATE")] = 6;
  completeDispatchMemory[labels.get("PLAYFIELD_RING_FLAGS")] = 0;
  runAssembledRoutine(completeDispatchMemory, "scroll_hull_columns");
  for (let row = 1; row < canonicalPlayfield.gameplayRows; row += 1) {
    const address = logicalAddress(completeDispatchMemory, row);
    for (let column = 0; column < 40; column += 1) {
      assert.equal(completeDispatchMemory[address + column],
        completeDispatchBefore[(row - 1) * 40 + column],
        `complete dispatch ${row},${column}`);
    }
  }
  assert.equal(completeDispatchMemory[labels.get("PLAYFIELD_RING_FLAGS")], 1,
    "the direct complete-state dispatch must report its single row rotation");

  const alreadyRotatedMemory = createLinkedRuntimeMemory();
  const alreadyRotatedBefore = fillScreen(alreadyRotatedMemory);
  alreadyRotatedMemory[labels.get("CAPITAL_SECTOR_STATE")] = 6;
  alreadyRotatedMemory[labels.get("PLAYFIELD_RING_FLAGS")] = 1;
  runAssembledRoutine(alreadyRotatedMemory, "scroll_hull_columns");
  assert.deepEqual(
    snapshotScreen(alreadyRotatedMemory),
    alreadyRotatedBefore,
    "a near-layer world step must not rotate the complete-state ring twice",
  );
  assert.equal(alreadyRotatedMemory[labels.get("PLAYFIELD_RING_FLAGS")], 0);

  const hullMemory = createLinkedRuntimeMemory();
  const hullBefore = fillScreen(hullMemory);
  hullMemory[0x4ea5] = 0;
  hullMemory[labels.get("corridor_phase")] = 32;
  runAssembledRoutine(hullMemory, "scroll_hull_columns");
  for (let row = 1; row < canonicalPlayfield.gameplayRows; row += 1) {
    for (const column of [0, 1, 6, 7, 32, 33, 38, 39]) {
      assert.equal(hullMemory[logicalAddress(hullMemory, row) + column],
        hullBefore[(row - 1) * 40 + column], `hull ${row},${column}`);
    }
  }
});

test("HUD and divider LMS remain fixed for every canonical ring head", () => {
  const memory = createLinkedRuntimeMemory();
  const rowLo = labels.get("PLAYFIELD_ROW_LO");
  const rowHi = labels.get("PLAYFIELD_ROW_HI");
  const activeListLo = labels.get("PLAYFIELD_ACTIVE_DLIST_LO");
  const dlistl = 0xd402;
  runAssembledRoutine(memory, "init_playfield_row_table");
  runAssembledRoutine(memory, "init_playfield_display_lists");

  for (let head = 0; head < canonicalPlayfield.ringRows; head += 1) {
    const list = 0x7f00 | memory[activeListLo];
    assert.deepEqual(Array.from(memory.subarray(list, list + 6)), [
      0xc2, 0x00, 0x40,
      0x44, 0x28, 0x40,
    ], `head ${head} must keep HUD=$4000 and divider=$4028`);

    const addresses = [];
    for (let row = 0; row < canonicalPlayfield.ringRows; row += 1) {
      const offset = list + 6 + row * 3;
      assert.equal(memory[offset], row === canonicalPlayfield.ringRows - 1 ? 0xc4 : 0x44,
        `head ${head}, row ${row} mode`);
      const address = memory[offset + 1] | memory[offset + 2] << 8;
      addresses.push(address);
      assert.equal(address, memory[rowLo + row] | memory[rowHi + row] << 8,
        `head ${head}, row ${row} mapper/list mismatch`);
    }
    assert.equal(new Set(addresses).size, canonicalPlayfield.ringRows,
      `head ${head} duplicates a ring row`);
    assert.deepEqual(addresses, Array.from({ length: canonicalPlayfield.ringRows }, (_, row) =>
      canonicalPlayfield.ringBufferAddress +
        ((row - head + canonicalPlayfield.ringRows) % canonicalPlayfield.ringRows) * 40));
    const jumpOffset = list + 6 + canonicalPlayfield.ringRows * 3;
    assert.deepEqual(Array.from(memory.subarray(jumpOffset, jumpOffset + 3)),
      [0x41, list & 0xff, 0x7f]);

    const oldDlistl = memory[dlistl];
    const oldActive = memory[activeListLo];
    runAssembledRoutine(memory, "rotate_playfield_rows");
    assert.notEqual(memory[activeListLo], oldActive,
      "rotation must select the prepared list");
    assert.equal(memory[dlistl], oldDlistl,
      "rotation must defer DLISTL selection to the bounded first gameplay DLI");
    runAssembledRoutine(memory, "prebuild_next_playfield_display_list");
  }
});

test("assembled capital-engine animation is an atomic deterministic 8+8 PAL pulse", () => {
  const memory = createLinkedRuntimeMemory();
  const timer = labels.get("CAPITAL_EXPLOSION_SOUND_TIMER") + 1;
  const phase = timer + 1;
  const alliedGlyph = asset.sector.engineGlyphs.get("allied");
  const enemyGlyph = asset.sector.engineGlyphs.get("enemy");
  memory[timer] = 8;
  memory[phase] = 0;
  memory.set(alliedGlyph.animationBytes[0], 0x4400 + alliedGlyph.index * 8);
  memory.set(enemyGlyph.animationBytes[0], 0x4400 + enemyGlyph.index * 8);

  const observed = [];
  for (let frame = 0; frame < 32; frame += 1) {
    runAssembledRoutine(memory, "update_engine_animation");
    observed.push([memory[timer], memory[phase]]);
    const expectedPhase = memory[phase];
    assert.deepEqual(
      Array.from(memory.subarray(0x4400 + alliedGlyph.index * 8,
        0x4400 + alliedGlyph.index * 8 + 8)),
      Array.from(alliedGlyph.animationBytes[expectedPhase]),
      `allied engine phase at frame ${frame}`,
    );
    assert.deepEqual(
      Array.from(memory.subarray(0x4400 + enemyGlyph.index * 8,
        0x4400 + enemyGlyph.index * 8 + 8)),
      Array.from(enemyGlyph.animationBytes[expectedPhase]),
      `enemy engine phase at frame ${frame}`,
    );
  }
  assert.deepEqual(observed.map(([, value]) => value), [
    ...Array(7).fill(0), ...Array(8).fill(1), ...Array(8).fill(0),
    ...Array(8).fill(1), 0,
  ]);
  assert.deepEqual(observed.filter(([value]) => value === 8).map(([, value]) => value),
    [1, 0, 1, 0]);
});

test("optimized PlayerFighter PMG keeps horizontal pixels and clears only the departed vertical row", () => {
  const player0 = 0x3c00;
  const player3 = 0x3f00;
  const stick0 = 0xd300;
  const trig0 = 0xd010;
  const hposp0 = 0xd000;
  const hposp3 = 0xd003;
  const lifecycle = 0x4eaa;
  const blinkFrame = 0x4ead;
  const playerX = labels.get("player_x");
  const playerY = labels.get("player_y");
  const fireGate = labels.get("gameplay_fire_gate");
  const shape = xexBytesAt(labels.get("player_shape"), 16);
  const engine = xexBytesAt(labels.get("player_engine_shape"), 16);

  const prepared = () => {
    const memory = createLinkedRuntimeMemory();
    memory[playerX] = 124;
    memory[playerY] = 100;
    memory[fireGate] = 1;
    memory[trig0] = 1;
    memory[lifecycle] = 0;
    memory.set(shape, player0 + 100);
    memory.set(engine, player3 + 100);
    return memory;
  };

  const horizontal = prepared();
  const beforeP0 = Uint8Array.from(horizontal.subarray(player0, player0 + 256));
  const beforeP3 = Uint8Array.from(horizontal.subarray(player3, player3 + 256));
  horizontal[stick0] = 0x0b;
  runAssembledRoutine(horizontal, "read_input");
  assert.equal(horizontal[playerX], 122);
  assert.deepEqual(horizontal.subarray(player0, player0 + 256), beforeP0);
  assert.deepEqual(horizontal.subarray(player3, player3 + 256), beforeP3);
  assert.deepEqual([horizontal[hposp0], horizontal[hposp3]], [122, 122]);

  const upward = prepared();
  upward[stick0] = 0x0e;
  runAssembledRoutine(upward, "read_input");
  assert.equal(upward[playerY], 99);
  assert.deepEqual([...upward.subarray(player0 + 99, player0 + 115)], [...shape]);
  assert.deepEqual([...upward.subarray(player3 + 99, player3 + 115)], [...engine]);
  assert.equal(upward[player0 + 115], 0);
  assert.equal(upward[player3 + 115], 0);

  const downward = prepared();
  downward[stick0] = 0x0d;
  runAssembledRoutine(downward, "read_input");
  assert.equal(downward[playerY], 101);
  assert.equal(downward[player0 + 100], 0);
  assert.equal(downward[player3 + 100], 0);
  assert.deepEqual([...downward.subarray(player0 + 101, player0 + 117)], [...shape]);
  assert.deepEqual([...downward.subarray(player3 + 101, player3 + 117)], [...engine]);

  const hiddenBlink = prepared();
  hiddenBlink[lifecycle] = 2;
  hiddenBlink[blinkFrame] = 8;
  hiddenBlink[stick0] = 0x0f;
  runAssembledRoutine(hiddenBlink, "read_input");
  assert.deepEqual([...hiddenBlink.subarray(player0 + 100, player0 + 116)],
    Array(16).fill(0));
  assert.deepEqual([...hiddenBlink.subarray(player3 + 100, player3 + 116)],
    Array(16).fill(0));
});

test("muzzle tracking resets with a new sector/game but survives a same-sector life loss", () => {
  const respawn = routine("respawn_player", "tick_respawn_invulnerability");
  const init = routine("init_broadside", "update_player_death");
  assert.doesNotMatch(respawn, /MUZZLE_(?:VISIBLE_ROW|SCREEN_LO|SCREEN_HI)/,
    "respawn must not remove a still-visible hull muzzle from the unchanged sector");
  assert.match(init,
    /MUZZLE_VISIBLE_ROW,x[\s\S]+MUZZLE_SCREEN_LO,x[\s\S]+MUZZLE_SCREEN_HI,x/,
    "a new game/sector must clear both tracked records");
});

test("provisional PAL scheduler remains deterministic over denser 8/12/16 layouts", () => {
  for (const [difficulty, count] of [["easy", 8], ["medium", 12], ["hard", 16]]) {
    const corrected = simulateBroadsideCadence(asset, { frames: 1800, difficulty });
    assert.equal(asset.sector.cannonRowsByDifficulty.get("allied").get(difficulty).length, count);
    assert.equal(asset.sector.cannonRowsByDifficulty.get("enemy").get(difficulty).length, count);
    assert.ok(corrected.warningStats.allied <= count);
    assert.ok(corrected.warningStats.enemy <= count);
    assert.deepEqual(corrected.launchStats, corrected.warningStats);
    assert.equal(corrected.maximumStartsPerFrame, 1);
    assert.equal(corrected.cancelledWarnings, 0);
    assert.deepEqual(
      simulateBroadsideCadence(asset, { frames: 1800, difficulty }),
      corrected,
      `${difficulty} gameplay reset must reproduce the round-robin pass`,
    );
  }
});

test("every difficulty keeps warnings and source-derived contact on its shifted world phase", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  for (const difficulty of Object.keys(HULL_SCROLL_DIFFICULTIES)) {
    const cadence = simulateBroadsideCadence(asset, { frames: 1000, difficulty });
    assert.ok(cadence.warningScrolls.length > 0, `${difficulty} produces attached warning evidence`);
    assert.equal(cadence.warningScrolls.every(({ afterY, beforeY }) => afterY - beforeY === 8), true);

    const world = createWorldScrollState(asset, {
      difficulty,
      initialSectorPhase: asset.sector.previewSectorRow,
    });
    for (let frame = 0; frame < 20; frame += 1) {
      advanceWorldScroll(world, asset);
      advanceHullScroll(world, asset);
    }
    const safe = playerHullContact(asset, {
      playerX: 128,
      playerY: 112,
      visibleRows: world.visibleRows,
      envelope,
    });
    const allied = playerHullContact(asset, {
      playerX: 48,
      playerY: 112,
      visibleRows: world.visibleRows,
      envelope,
    });
    const enemy = playerHullContact(asset, {
      playerX: 200,
      playerY: 112,
      visibleRows: world.visibleRows,
      envelope,
    });
    assert.equal(safe.collided, false, `${difficulty} keeps the central lane clear`);
    assert.equal(allied.side, "allied", `${difficulty} uses the shifted allied boundary`);
    assert.equal(enemy.side, "enemy", `${difficulty} uses the shifted enemy boundary`);
    assert.deepEqual(safe.segmentRows, world.visibleRows.slice(12, 14));
  }
  assert.equal(asset.broadside.projectileSpeed, 2);
});

test("speed sequence couples hulls to the legacy world clock", () => {
  const snapshots = simulateBroadsideSpeedSequence(asset);
  assert.deepEqual(snapshots.map(({ frame, scrolled }) => [frame, scrolled]), [
    [0, false], [1, false], [2, true], [3, false], [4, true],
  ]);
  assert.deepEqual(snapshots.map(({ world }) => world.advances), [0, 0, 1, 1, 2]);
  assert.deepEqual(snapshots.map(({ world }) => world.accumulator), [0, 10, 0, 10, 0]);
  assert.deepEqual(snapshots.map(({ world }) => world.hullAdvances), [0, 0, 1, 1, 2]);
  assert.deepEqual(snapshots.map(({ warning }) => warning.y), [92, 92, 100, 100, 108]);
  assert.deepEqual(snapshots.map(({ projectile }) => projectile.x), [162, 160, 158, 156, 154]);
  assert.deepEqual(snapshots[0].world.visibleRows, snapshots[1].world.visibleRows);
  assert.notDeepEqual(snapshots[1].world.visibleRows, snapshots[2].world.visibleRows);
  assert.deepEqual(snapshots[2].world.visibleRows, snapshots[3].world.visibleRows);
  assert.notDeepEqual(snapshots[3].world.visibleRows, snapshots[4].world.visibleRows);
});

test("player damage is one event per frame and the 25-frame cooldown blocks repeat subtraction", () => {
  const state = createBroadsideState(asset);
  const first = beginWarning(state, asset, enemyTurretIndex, 0, 14);
  const second = beginWarning(state, asset, alliedTurretIndex, 1, 10);
  first.state = second.state = BROADSIDE_STATES.FLYING;
  assert.equal(hitPlayer(state, first, asset, 100), true);
  assert.equal(state.health, 80);
  assert.equal(hitPlayer(state, second, asset, 100), false);
  assert.equal(state.health, 80);
  for (let frame = 0; frame < 25; frame += 1) tickDamageCooldown(state);
  const third = { ...second, state: BROADSIDE_STATES.FLYING };
  assert.equal(hitPlayer(state, third, asset, 126), true);
  assert.equal(state.health, 60);
});

test("assembled Allied and Hostile shells share raster-aligned player collision and canonical damage", () => {
  const cases = [
    { name: "Allied right-moving", owner: 0, shellX: 122, movedX: 124 },
    { name: "Hostile left-moving", owner: 1, shellX: 132, movedX: 130 },
  ];
  for (const { name, owner, shellX, movedX } of cases) {
    const { memory, broadState, constants } = prepareAssembledCapitalPlayerContact({
      owner, shellX,
    });
    const cycles = runAssembledRoutine(memory, "update_broadside");
    assert.equal(memory[broadState + 9], movedX, `${name} direction`);
    assert.equal(memory[broadState + 24], 1, `${name} player collision flag`);
    assert.equal(memory[broadState], BROADSIDE_STATES.IMPACT, `${name} consumes projectile`);
    assert.equal(memory[broadState + 15], asset.broadside.impactFrames - 1,
      `${name} enters the existing same-update impact lifecycle`);
    assert.equal(memory[constants.get("BROAD_PLAYER_HEALTH")], 8,
      `${name} subtracts the documented two HULL units`);
    assert.equal(memory[constants.get("PLAYER_LIVES")], 3, `${name} is nonlethal`);
    assert.equal(memory[constants.get("BROAD_DAMAGE_COOLDOWN")], 25,
      `${name} starts canonical post-hit invulnerability`);
    assert.equal(memory[constants.get("BROAD_DAMAGE_APPLIED")], 1,
      `${name} claims exactly one damage event`);
    assert.ok(cycles < 2_000, `${name} collision update remains bounded`);

    memory[constants.get("BROAD_DAMAGE_APPLIED")] = 0;
    runAssembledRoutine(memory, "update_broadside");
    assert.equal(memory[constants.get("BROAD_PLAYER_HEALTH")], 8,
      `${name} impact cannot damage again on a later frame`);
    assert.equal(memory[constants.get("BROAD_DAMAGE_COOLDOWN")], 24);
  }
  const shared = routine("capital_shell_collision_flags_shared", "capital_shell_overlaps_enemy_obsolete");
  assert.match(shared,
    /jsr capital_shell_hits_player[\s\S]+jsr capital_shell_hits_enemy/);
  assert.doesNotMatch(shared, /\b(?:COLPF|COLPM|MUZZLE)[A-Z0-9_]*\b/,
    "owner-independent contact cannot be inferred from colour or renderer addresses");
});

test("assembled Allied and Hostile shells damage the PlayerFighter at the recovered lower boundary", () => {
  for (const owner of [0, 1]) {
    const contact = prepareAssembledCapitalPlayerContact({
      owner,
      shellX: owner === 0 ? 122 : 132,
      shellY: 230,
      playerY: 225,
    });
    runAssembledRoutine(contact.memory, "update_broadside");
    assert.equal(contact.memory[contact.broadState], BROADSIDE_STATES.IMPACT);
    assert.equal(contact.memory[contact.constants.get("BROAD_PLAYER_HEALTH")], 8);
  }
});

test("assembled capital shells use the 16x15 player and swept 8x6 bolt AABBs at every edge", () => {
  const playerPositions = [32, 112, 225];
  const cases = [
    { name: "first top scanline", playerX: 124, currentLeft: 128, rasterDelta: -5, hit: true },
    { name: "top-left corner", playerX: 123, currentLeft: 116, rasterDelta: -5, hit: true },
    { name: "top-right corner", playerX: 125, currentLeft: 140, rasterDelta: -5, hit: true },
    { name: "middle left side", playerX: 123, currentLeft: 116, rasterDelta: 7, hit: true },
    { name: "middle right side", playerX: 125, currentLeft: 140, rasterDelta: 7, hit: true },
    { name: "center", playerX: 124, currentLeft: 128, rasterDelta: 7, hit: true },
    { name: "bottom-left corner", playerX: 123, currentLeft: 116, rasterDelta: 14, hit: true },
    { name: "bottom-right corner", playerX: 125, currentLeft: 140, rasterDelta: 14, hit: true },
    { name: "last bottom scanline", playerX: 124, currentLeft: 128, rasterDelta: 14, hit: true },
    { name: "one HPOS before left", playerX: 124, currentLeft: 116, rasterDelta: 7, hit: false },
    { name: "one HPOS after right", playerX: 124, currentLeft: 140, rasterDelta: 7, hit: false },
    { name: "one scanline above", playerX: 124, currentLeft: 128, rasterDelta: -6, hit: false },
    { name: "one scanline below", playerX: 124, currentLeft: 128, rasterDelta: 15, hit: false },
  ];

  for (const owner of [0, 1]) {
    for (const slot of [0, 1, 2]) {
      for (const playerY of playerPositions) {
        for (const item of cases) {
          const shellX = shellInitialX(owner, item.currentLeft, false);
          const boltRasterTop = playerY - ATARI800_CAPTURE_FIRST_DMA_SCANLINE + item.rasterDelta;
          const shellAabb = capitalShellSweptAabb(owner, shellX, boltRasterTop);
          const playerAabb = playerGameplayAabb(item.playerX, playerY);
          assert.equal(shellAabb.currentLeft, item.currentLeft,
            `${item.name}: final raster X premise`);
          assert.equal(inclusiveAabbsOverlap(shellAabb, playerAabb), item.hit,
            `${item.name}: swept-AABB premise`);
          const contact = prepareAssembledCapitalPlayerContact({
            owner, slot, shellX, playerX: item.playerX, playerY, boltRasterTop,
          });
          const third = (slot + 1) % 3;
          contact.memory[contact.broadState + third] = BROADSIDE_STATES.WARNING;
          contact.memory[contact.broadState + 3 + third] = owner ^ 1;
          contact.memory[contact.broadState + 9 + third] = 88;
          contact.memory[contact.broadState + 12 + third] = 70;
          runAssembledRoutine(contact.memory, "update_broadside");
          assert.equal(contact.memory[contact.broadState + 24 + slot] & 1, Number(item.hit),
            `owner ${owner}, slot ${slot}, Y ${playerY}: ${item.name}`);
          assert.equal(contact.memory[contact.constants.get("BROAD_PLAYER_HEALTH")],
            item.hit ? 8 : 10, item.name);
          assert.equal(contact.memory[contact.slotState],
            item.hit ? BROADSIDE_STATES.IMPACT : BROADSIDE_STATES.FLYING, item.name);
          assert.equal(contact.memory[contact.broadState + 3 + third], owner ^ 1,
            `${item.name}: third-slot owner`);
          assert.equal(contact.memory[contact.broadState + 12 + third], 70,
            `${item.name}: third-slot position`);
        }
      }
    }
  }

  for (const owner of [0, 1]) {
    for (const slot of [0, 1, 2]) {
      for (const playerY of playerPositions) {
        const playerX = 124;
        const currentRasterLeft = owner === 0 ? playerX : playerX + 12;
        for (const [vertical, rasterDelta, hit] of [
          ["through player", 7, true],
          ["above player", -6, false],
          ["below player", 15, false],
        ]) {
          const shellX = shellInitialX(owner, currentRasterLeft, true);
          const boltRasterTop = playerY - ATARI800_CAPTURE_FIRST_DMA_SCANLINE + rasterDelta;
          const shellAabb = capitalShellSweptAabb(owner, shellX, boltRasterTop);
          assert.notEqual(shellAabb.previousLeft, shellAabb.currentLeft,
            `${vertical}: sweep must span two final raster positions`);
          assert.equal(inclusiveAabbsOverlap(shellAabb,
            playerGameplayAabb(playerX, playerY)), hit, `${vertical}: AABB premise`);
          const contact = prepareAssembledCapitalPlayerContact({
            owner, slot, shellX, playerX, playerY, boltRasterTop,
          });
          runAssembledRoutine(contact.memory, "update_broadside");
          assert.equal(contact.memory[contact.slotState],
            hit ? BROADSIDE_STATES.IMPACT : BROADSIDE_STATES.FLYING,
            `owner ${owner}, slot ${slot}, Y ${playerY}: sweep ${vertical}`);
          assert.equal(contact.memory[contact.constants.get("BROAD_PLAYER_HEALTH")], hit ? 8 : 10);
        }
      }
    }
  }

  assert.match(capitalPlayerCollisionSource, /swept-AABB contact/);
  assert.doesNotMatch(capitalPlayerCollisionSource,
    /capital_player_collision_bounds|\.byte|mask|nibble/i,
    "the gameplay hitbox must not retain pixel-mask narrow-phase data");
  assert.ok(capitalPlayerCollisionLabels.has("capital_player_collision"));
});

test("player hits retain only the PlayerFighter and damage flash, never a world-space IMPACT square", () => {
  const playerX = 124;
  const playerY = 112;
  const playerTop = playerY - ATARI800_CAPTURE_FIRST_DMA_SCANLINE;
  const contacts = [
    { name: "top", boltTop: playerTop - 5 },
    { name: "middle", boltTop: playerTop + 4 },
    { name: "bottom", boltTop: playerTop + 14 },
  ];
  const naturalOwnerSlots = [
    { owner: 0, slot: 0, currentLeft: 120, colour: 0x44 },
    { owner: 1, slot: 1, currentLeft: 136, colour: 0x46 },
  ];

  for (const scenario of naturalOwnerSlots) for (const contactGeometry of contacts) {
    const shellX = shellInitialX(scenario.owner, scenario.currentLeft, false);
    const contact = prepareAssembledCapitalPlayerContact({
      owner: scenario.owner,
      slot: scenario.slot,
      shellX,
      playerX,
      playerY,
      boltRasterTop: contactGeometry.boltTop,
    });
    const { memory, broadState, slotState, constants } = contact;
    memory[0xd000] = playerX;
    memory[0xd003] = playerX;
    memory[0xd008] = 1;
    memory[0xd00b] = 1;
    memory[0xd013 + scenario.slot] = scenario.colour;
    runAssembledRoutine(memory, "clear_pmg");
    runAssembledRoutine(memory, "draw_player");
    const player_fighterBefore = playerBoundsFromPmg(memory);
    assert.deepEqual(player_fighterBefore, {
      left: playerX, right: playerX + 15, top: playerTop, bottom: playerTop + 14,
      dma_top: playerY, dma_bottom: playerY + 14, size_code: 1,
    });

    runAssembledRoutine(memory, "render_capital_shell_overlays");
    assert.equal(capitalShellScreenTransients(memory).length, 2,
      `${scenario.owner}/${contactGeometry.name}: one legal two-cell bolt before contact`);
    runAssembledRoutine(memory, "update_broadside");

    assert.equal(memory[slotState], BROADSIDE_STATES.IMPACT);
    assert.equal(memory[broadState + 3 + scenario.slot], scenario.owner,
      "FLYING->IMPACT must retain the owner");
    assert.equal(memory[constants.get("BROAD_PLAYER_HEALTH")], 8);
    assert.equal(memory[constants.get("BROAD_DAMAGE_COOLDOWN")], 25);
    assert.equal(memory[constants.get("PLAYER_LIVES")], 3);
    assert.equal(memory[labels.get("damage_timer")], 0x12,
      "the existing full-frame damage flash is the only player-hit feedback");
    assert.deepEqual(playerBoundsFromPmg(memory), player_fighterBefore,
      "damage must not add to or distort the P0/P3 PlayerFighter footprint");
    assert.deepEqual(capitalShellScreenTransients(memory), [],
      "the FLYING ANTIC bolt must be erased in the collision frame");
    assert.deepEqual(capitalImpactMissileRows(memory), [],
      `${scenario.owner}/${contactGeometry.name}: no M1-M3 IMPACT component is legal`);

    runAssembledRoutine(memory, "update_broadside");
    assert.equal(memory[constants.get("BROAD_PLAYER_HEALTH")], 8);
    assert.equal(memory[constants.get("BROAD_DAMAGE_COOLDOWN")], 24);
    assert.deepEqual(capitalImpactMissileRows(memory), []);
    for (let frame = 1; frame < asset.broadside.impactFrames; frame += 1) {
      runAssembledRoutine(memory, "update_broadside");
      assert.deepEqual(capitalImpactMissileRows(memory), [],
        `player IMPACT frame ${frame + 1} must remain visually empty`);
      assert.deepEqual(capitalShellScreenTransients(memory), []);
    }
    assert.equal(memory[slotState], BROADSIDE_STATES.FREE,
      "the original IMPACT timer must still release the correct slot");

    for (let rotation = 0; rotation < canonicalPlayfield.ringRows; rotation += 1) {
      runAssembledRoutine(memory, "rotate_playfield_rows");
      runAssembledRoutine(memory, "prebuild_next_playfield_display_list");
    }
    assert.deepEqual(capitalImpactMissileRows(memory), [],
      "a later ring wrap must not revive the PMG square");
    assert.deepEqual(capitalShellScreenTransients(memory), [],
      "a later ring wrap must not revive the ANTIC bolt");
  }
});

test("capital-shell impact obeys cooldown, respawn invulnerability, release, and simultaneous latch", () => {
  for (const owner of [0, 1]) {
    const blocked = prepareAssembledCapitalPlayerContact({
      owner,
      shellX: owner === 0 ? 122 : 132,
      damageCooldown: 7,
    });
    runAssembledRoutine(blocked.memory, "update_broadside");
    assert.equal(blocked.memory[blocked.constants.get("BROAD_PLAYER_HEALTH")], 10);
    assert.equal(blocked.memory[blocked.constants.get("BROAD_DAMAGE_COOLDOWN")], 6);
    assert.equal(blocked.memory[blocked.broadState], BROADSIDE_STATES.IMPACT,
      `owner ${owner} shell is consumed while damage cooldown protects the player`);

    const invulnerable = prepareAssembledCapitalPlayerContact({
      owner,
      shellX: owner === 0 ? 122 : 132,
      playerLifecycle: PLAYER_LIFECYCLE_STATES.RESPAWN_INVULNERABLE,
    });
    invulnerable.memory[invulnerable.constants.get("RESPAWN_INVULNERABLE_TIMER")] = 1;
    runAssembledRoutine(invulnerable.memory, "update_broadside");
    assert.equal(invulnerable.memory[invulnerable.constants.get("BROAD_PLAYER_HEALTH")], 10);
    assert.equal(invulnerable.memory[invulnerable.broadState], BROADSIDE_STATES.IMPACT);
  }

  const simultaneous = prepareAssembledCapitalPlayerContact({ owner: 0, shellX: 122 });
  simultaneous.memory[simultaneous.broadState + 1] = BROADSIDE_STATES.FLYING;
  simultaneous.memory[simultaneous.broadState + 4] = 1;
  simultaneous.memory[simultaneous.broadState + 10] = 132;
  simultaneous.memory[simultaneous.broadState + 13] = 107;
  simultaneous.memory[labels.get("BROAD_RASTER_TOP") + 1] =
    simultaneous.memory[labels.get("BROAD_RASTER_TOP")];
  runAssembledRoutine(simultaneous.memory, "update_broadside");
  assert.deepEqual(Array.from(simultaneous.memory.subarray(
    simultaneous.broadState, simultaneous.broadState + 2)),
  [BROADSIDE_STATES.IMPACT, BROADSIDE_STATES.IMPACT]);
  assert.deepEqual(Array.from(simultaneous.memory.subarray(
    simultaneous.broadState + 24, simultaneous.broadState + 26)), [1, 1]);
  assert.equal(simultaneous.memory[simultaneous.constants.get("BROAD_PLAYER_HEALTH")], 8,
    "same-frame owner pair may consume both shells but applies one damage event");

  const released = prepareAssembledCapitalPlayerContact({ owner: 1, shellX: 132 });
  runAssembledRoutine(released.memory, "update_broadside");
  for (let frame = 0; frame < asset.broadside.impactFrames; frame += 1) {
    released.memory[released.constants.get("BROAD_DAMAGE_APPLIED")] = 0;
    runAssembledRoutine(released.memory, "update_broadside");
  }
  assert.equal(released.memory[released.broadState], BROADSIDE_STATES.FREE);
  assert.equal(released.memory[released.broadState + 21], 0,
    "release leaves no rendered projectile footprint token");

  const postExpiry = prepareAssembledCapitalPlayerContact({ owner: 0, shellX: 122 });
  runAssembledRoutine(postExpiry.memory, "update_broadside");
  postExpiry.memory[postExpiry.broadState] = BROADSIDE_STATES.FLYING;
  postExpiry.memory[postExpiry.broadState + 9] = 122;
  postExpiry.memory[postExpiry.constants.get("BROAD_DAMAGE_COOLDOWN")] = 0;
  postExpiry.memory[postExpiry.constants.get("BROAD_DAMAGE_APPLIED")] = 0;
  runAssembledRoutine(postExpiry.memory, "update_broadside");
  assert.equal(postExpiry.memory[postExpiry.constants.get("BROAD_PLAYER_HEALTH")], 6,
    "a later shell damages again after invulnerability expires");
});

test("source-derived hull contact clamps P0/P3 and shares one deterministic damage gate", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  assert.deepEqual(envelope, { top: 0, bottom: 14, left: 0, right: 7, width: 8 });
  const initial = { corridorPhase: 22, visibleScrolls: 0, envelope };
  const safe = playerHullContact(asset, { ...initial, playerX: 128, playerY: 112 });
  assert.equal(safe.collided, false);

  const allied = playerHullContact(asset, { ...initial, playerX: 82, playerY: 80 });
  assert.deepEqual(allied.segmentRows, [8, 9]);
  assert.equal(allied.side, "allied");
  assert.equal(allied.alliedBoundary, 84, "allied turret projection is solid");
  assert.equal(allied.clampedX, 84);

  const enemy = playerHullContact(asset, { ...initial, playerX: 166, playerY: 112 });
  assert.deepEqual(enemy.segmentRows, [12, 13]);
  assert.equal(enemy.side, "enemy");
  assert.equal(enemy.enemyBoundary, 172, "enemy turret projection is solid");
  assert.equal(enemy.clampedX, 164);

  const irregular = playerHullContact(asset, { ...initial, playerX: 78, playerY: 56 });
  assert.deepEqual(irregular.segmentRows, [5, 6]);
  assert.equal(irregular.alliedBoundary, 80, "adjacent source rows use their deepest edge");
  assert.equal(irregular.clampedX, 80);

  const state = createBroadsideState(asset);
  assert.equal(contactPlayerHull(state, allied, asset, 50), true);
  assert.equal(state.health, 80);
  assert.equal(contactPlayerHull(state, allied, asset, 50), false);
  assert.equal(state.health, 80);
  assert.equal(state.score, 0);
  assert.equal(state.alliedHullHits, 0);
  assert.equal(state.enemyHullHits, 0);
  for (let frame = 0; frame < 25; frame += 1) tickDamageCooldown(state);
  assert.equal(contactPlayerHull(state, allied, asset, 76), true);
  assert.equal(state.health, 60);
});

test("centered player survives every finite hull row while runtime contact state stays resolver-safe", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  for (const difficulty of ["easy", "medium", "hard"]) {
    const world = createWorldScrollState(asset, { difficulty });
    let frame = 0;
    const seenStates = new Set();
    let sawEmptyDrainRow = false;
    while (!world.hullDrained) {
      advanceHullScroll(world, asset);
      seenStates.add(world.sectorState);
      const contact = playerHullContact(asset, {
        playerX: 128,
        playerY: 184,
        visibleRows: world.visibleRows,
        envelope,
      });
      assert.equal(contact.collided, false,
        `${difficulty} centered contact at frame ${frame}, phase ${world.corridorPhase}`);
      sawEmptyDrainRow ||= contact.segmentRows.includes(null);
      frame += 1;
      assert.ok(frame < 2000, `${difficulty} finite hull stream did not drain`);
    }
    assert.deepEqual([...seenStates].sort(), [
      CAPITAL_SECTOR_STATES.ENGINES,
      CAPITAL_SECTOR_STATES.AFT,
      CAPITAL_SECTOR_STATES.COMBAT,
      CAPITAL_SECTOR_STATES.FORWARD,
      CAPITAL_SECTOR_STATES.PROW,
      CAPITAL_SECTOR_STATES.DRAIN,
    ]);
    assert.equal(sawEmptyDrainRow, true, `${difficulty} drain never crossed the player band`);
  }

  assert.match(source,
    /PLAYER_CONTACT_ROWS\s*=.+\nPLAYER_CONTACT_LEFT\s*=.+\nPLAYER_CONTACT_RIGHT\s*=/);
  const contactRoutine = routine("handle_player_hull_contact", "free_broadside_slot");
  assert.match(contactRoutine,
    /sta PLAYER_CONTACT_ROWS[\s\S]+sta PLAYER_CONTACT_LEFT[\s\S]+sta PLAYER_CONTACT_RIGHT/);
  assert.doesNotMatch(contactRoutine, /sta BROAD_WORK_COUNT\s*;.*rows|dec BROAD_WORK_COUNT/);
});

test("assembled 16-bit hull visibility maps states 0-5 and rejects terminal COMPLETE/OPEN", () => {
  const constants = readGameGraphicsSource(source, definition).constants;
  const expectedSectorRows = [269, 269, 269, 269, 269, 479, null, null];

  for (let state = 0; state < 8; state += 1) {
    const memory = createLinkedRuntimeMemory();
    memory[labels.get("CAPITAL_SECTOR_STATE")] = state;
    memory[labels.get("corridor_phase")] = 22;
    memory[labels.get("CORRIDOR_PHASE_HI")] = 1;
    memory[constants.get("BROAD_VISIBLE_SCROLLS")] = 23;
    memory[constants.get("CAPITAL_SECTOR_DRAIN_ROWS")] = 0;
    const result = runVisibleHullSectorRow(memory, 9);
    assert.equal(result.carry, expectedSectorRows[state] === null,
      `capital state ${state} visibility`);
    assert.ok(result.cycles <= 80, `capital state ${state} bounded cycles`);
    if (expectedSectorRows[state] !== null) {
      assert.equal(result.sectorRow, expectedSectorRows[state],
        `capital state ${state} collision sector row`);
    }
  }
});

test("terminal COMPLETE and early OPEN cannot apply invisible capital contact damage", () => {
  const constants = readGameGraphicsSource(source, definition).constants;

  for (const state of [CAPITAL_SECTOR_STATES.COMPLETE, CAPITAL_SECTOR_STATES.OPEN]) {
    const memory = createLinkedRuntimeMemory();
    memory[labels.get("CAPITAL_SECTOR_STATE")] = state;
    memory[constants.get("CAPITAL_SECTOR_DRAIN_ROWS")] = 0;
    memory[labels.get("player_x")] = 48;
    memory[labels.get("player_y")] = 80;
    memory[labels.get("PLAYER_LIFECYCLE")] = PLAYER_LIFECYCLE_STATES.ALIVE;
    memory[constants.get("PLAYER_LIVES")] = 3;
    memory[constants.get("BROAD_PLAYER_HEALTH")] = 10;
    memory[constants.get("BROAD_DAMAGE_COOLDOWN")] = 0;
    memory[constants.get("BROAD_DAMAGE_APPLIED")] = 0;

    runAssembledRoutine(memory, "handle_player_hull_contact");

    assert.equal(memory[labels.get("player_x")], 48,
      `capital state ${state} must not clamp against an invisible hull`);
    assert.equal(memory[constants.get("BROAD_PLAYER_HEALTH")], 10,
      `capital state ${state} must not apply invisible hull damage`);
    assert.equal(memory[constants.get("BROAD_DAMAGE_APPLIED")], 0,
      `capital state ${state} must not claim the frame damage gate`);
  }
});

test("assembled hull contact uses dedicated boundaries instead of resolver scratch", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const constants = graphics.constants;
  const start = labels.get("handle_player_hull_contact");
  const end = labels.get("free_broadside_slot");
  const bytes = xexBytesAt(start, end - start);
  const residentAddresses = {
    PLAYER_CONTACT_ROWS: 0x4ea7,
    PLAYER_CONTACT_LEFT: 0x4ea8,
    PLAYER_CONTACT_RIGHT: 0x4ea9,
    BROAD_WORK_COUNT: constants.get("BROAD_WORK_COUNT"),
    BROAD_WORK_VALUE: constants.get("BROAD_WORK_VALUE"),
  };
  const absolute = (opcode, name) => {
    const address = residentAddresses[name];
    return [opcode, address & 0xff, address >>> 8];
  };
  assert.ok(containsBytes(bytes, absolute(0x8d, "PLAYER_CONTACT_ROWS")));
  assert.ok(containsBytes(bytes, absolute(0x8d, "PLAYER_CONTACT_LEFT")));
  assert.ok(containsBytes(bytes, absolute(0x8d, "PLAYER_CONTACT_RIGHT")));
  assert.ok(containsBytes(bytes, absolute(0xce, "PLAYER_CONTACT_ROWS")));
  assert.equal(containsBytes(bytes, absolute(0xce, "BROAD_WORK_COUNT")), false,
    "resolver-owned module-row scratch cannot control the contact loop");
  assert.equal(containsBytes(bytes, absolute(0xcd, "BROAD_WORK_VALUE")), false,
    "resolver-owned module-id scratch cannot become the enemy boundary");
});

test("heavy impact wins simultaneous damage precedence while hull contact still clamps", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const contact = playerHullContact(asset, {
    playerX: 48,
    playerY: 112,
    corridorPhase: 22,
    visibleScrolls: 0,
    envelope,
  });
  const state = createBroadsideState(asset);
  const shell = beginWarning(state, asset, enemyTurretIndex, 0, 14);
  shell.state = BROADSIDE_STATES.FLYING;
  assert.equal(hitPlayer(state, shell, asset, 100), true);
  assert.equal(shell.state, BROADSIDE_STATES.IMPACT);
  assert.equal(contactPlayerHull(state, contact, asset, 100), false);
  assert.equal(state.health, 80, "one PAL frame subtracts damage only once");
  assert.match(routine("main_loop", "wait_frame"),
    /jsr handle_collisions[\s\S]+jsr update_starfield[\s\S]+jsr handle_player_hull_contact/);
  assert.match(routine("handle_player_hull_contact", "free_broadside_slot"),
    /sta player_x[\s\S]+sta HPOSP0[\s\S]+sta HPOSP3[\s\S]+jmp apply_broadside_player_damage/);
  assert.doesNotMatch(routine("handle_player_hull_contact", "free_broadside_slot"),
    /jsr erase_player|jsr draw_player/);
  assert.doesNotMatch(routine("handle_player_hull_contact", "free_broadside_slot"), /P0PF|P3PF/);
});

test("five hull contacts enter one guarded death lifecycle and leave source stars irrelevant", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const contact = playerHullContact(asset, {
    playerX: 82,
    playerY: 80,
    corridorPhase: 22,
    visibleScrolls: 0,
    envelope,
  });
  const state = createBroadsideState(asset);
  for (let hit = 0; hit < 5; hit += 1) {
    state.damageCooldown = 0;
    assert.equal(contactPlayerHull(state, contact, asset, hit), true);
  }
  assert.equal(state.health, 0);
  assert.equal(state.lives, 2);
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  assert.ok(asset.definition.charsetBaseIndex > 14, "star screen codes cannot enter boundary tables");
  assert.equal(asset.collisionBoundaries.get("allied").length, 32);
  assert.equal(asset.collisionBoundaries.get("enemy").length, 32);
  assert.match(routine("update_player_death", "respawn_player"),
    /BROAD_DEATH_TIMER[\s\S]+PLAYER_LIVES[\s\S]+jsr respawn_player/);
  assert.match(source,
    /apply_player_damage:[\s\S]+jsr begin_player_fighter_explosion/);
});

test("both capital factions can hit a fighter while scoring remains source-owned", () => {
  const state = createBroadsideState(asset);
  const allied = beginWarning(state, asset, alliedTurretIndex, 0, 10);
  const enemy = beginWarning(state, asset, enemyTurretIndex, 1, 14);
  allied.state = enemy.state = BROADSIDE_STATES.FLYING;
  assert.equal(hitHostileFighter(state, allied, asset), true);
  assert.equal(state.score, 0);
  assert.equal(hitHostileFighter(state, enemy, asset), true);
  assert.equal(state.score, 0);
  assert.match(routine("handle_collisions", "update_score_display"),
    /jsr update_fighter_projectiles[\s\S]+jsr update_broadside[\s\S]+jsr resolve_enemy_damage/);
  assert.match(routine("update_fighter_projectiles", "player_fighter_projectile_hits_enemy"),
    /DAMAGE_PLAYER_PROJECTILE[\s\S]+jsr queue_enemy_damage/);
  assert.match(routine("update_broadside", "schedule_broadside"),
    /@flying:[\s\S]+jmp @targets[\s\S]+@targets:[\s\S]+jsr capital_shell_collision_flags/);
});

test("opposite-hull impacts use source row geometry, ignore stars, and saturate counters", () => {
  const state = createBroadsideState(asset);
  const allied = beginWarning(state, asset, alliedTurretIndex, 0, 10);
  allied.state = BROADSIDE_STATES.FLYING;
  allied.x = hullBoundary(asset, "enemy", 8) -
    asset.broadside.projectileVisuals.capital.widthHpos - 1;
  assert.equal(projectileLeadingEdgeHitsHull(allied, asset, 8), false);
  allied.x += 1;
  assert.equal(projectileLeadingEdgeHitsHull(allied, asset, 8), true);
  state.enemyHullHits = 254;
  hitOppositeHull(state, allied, asset);
  hitOppositeHull(state, allied, asset);
  assert.equal(state.enemyHullHits, 255);
  assert.match(routine("broadside_hits_opposite_hull", "free_broadside_slot"),
    /and #\$7F[\s\S]+cmp #CAPITAL_HULL_GLYPH_BASE/);
  assert.ok(asset.definition.charsetBaseIndex > 14, "star glyphs remain below hull glyph range");
});

test("impact and offscreen paths erase a slot, while zero health enters guarded death", () => {
  const state = createBroadsideState(asset);
  const slot = beginWarning(state, asset, enemyTurretIndex, 0, 14);
  beginImpact(slot, asset);
  for (let frame = 0; frame < asset.broadside.impactFrames; frame += 1) {
    advanceProjectile(slot, asset);
  }
  assert.equal(slot.state, BROADSIDE_STATES.FREE);
  slot.state = BROADSIDE_STATES.FLYING;
  slot.x = 208;
  assert.equal(expireProjectile(slot), true);
  assert.equal(slot.x, 0);

  const lethal = createBroadsideState(asset);
  for (let hit = 0; hit < 5; hit += 1) {
    const shell = { ...lethal.slots[0], state: BROADSIDE_STATES.FLYING, owner: "enemy" };
    lethal.damageCooldown = 0;
    hitPlayer(lethal, shell, asset, hit);
  }
  assert.equal(lethal.health, 0);
  assert.equal(lethal.lives, 2);
  assert.equal(lethal.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  assert.match(routine("apply_broadside_player_damage", "update_hud_status"),
    /PLAYER_DYING[\s\S]+dec PLAYER_LIVES[\s\S]+SHARED_FIGHTER_EXPLOSION_TOTAL[\s\S]+jsr erase_bullet/);
  assert.match(routine("main_loop", "wait_frame"),
    /jsr integration_update_player_death[\s\S]+jsr clear_pmg[\s\S]+jsr silence_audio[\s\S]+jsr enter_game_over[\s\S]+jmp frontend_loop/);
});

test("death decrements one life and respawns atomically at canonical corridor center", () => {
  const state = createBroadsideState(asset);
  state.health = 20;
  state.playerX = 82;
  state.playerY = 112;
  assert.equal(applyPlayerDamage(state, asset, 20, 25, 50), true);
  assert.equal(state.lives, 2);
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  assert.equal(applyPlayerDamage(state, asset, 20, 25, 50), false);
  assert.equal(state.lives, 2, "same-frame and dead-state damage cannot consume another life");

  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL - 1; frame += 1) {
    assert.equal(advancePlayerLifecycle(state, asset), "dying");
    assert.notEqual(state.playerX, 0, "death presentation never exposes an uninitialized X");
  }
  assert.equal(advancePlayerLifecycle(state, asset), "respawn");
  assert.deepEqual([state.playerX, state.playerY], [PLAYER_RESPAWN_X, PLAYER_RESPAWN_Y]);
  assert.deepEqual([PLAYER_RESPAWN_X, PLAYER_RESPAWN_Y], [124, 225]);
  assert.equal(state.health, 100);
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.RESPAWN_INVULNERABLE);
  assert.equal(state.respawnInvulnerabilityTimer, 250);

  const spawnRoutine = routine("respawn_player", "tick_respawn_invulnerability");
  assert.match(spawnRoutine,
    /PLAYER_RESPAWN_X[\s\S]+sta player_x[\s\S]+sta HPOSP0[\s\S]+sta HPOSP3[\s\S]+PLAYER_RESPAWN_Y[\s\S]+sta player_y/);
  assert.doesNotMatch(spawnRoutine, /lda #\$00\s+sta (?:player_x|HPOSP0|HPOSP3)/);
});

test("respawn is invulnerable for exactly 250 controlled blinking PAL frames", () => {
  const state = createBroadsideState(asset);
  state.health = 20;
  applyPlayerDamage(state, asset, 20, 25, 0);
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL; frame += 1) {
    advancePlayerLifecycle(state, asset);
  }
  const positions = [];
  const visibility = [];
  for (let frame = 0; frame < 250; frame += 1) {
    state.damageCooldown = 0;
    assert.equal(applyPlayerDamage(state, asset, 20, 25, 1000 + frame), false,
      `damage leaked through invulnerability frame ${frame}`);
    positions.push([state.playerX, state.playerY]);
    const result = advancePlayerLifecycle(state, asset);
    visibility.push(state.playerVisible);
    if (frame < 249) {
      assert.equal(result, "invulnerable");
      assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.RESPAWN_INVULNERABLE);
    } else {
      assert.equal(result, "alive");
    }
  }
  assert.ok(positions.every(([x, y]) => x === 124 && y === PLAYER_RESPAWN_Y));
  assert.deepEqual(visibility.slice(0, 16), [
    true, true, true, true, true, true, true, true,
    false, false, false, false, false, false, false, false,
  ]);
  assert.equal(state.playerVisible, true);
  assert.equal(state.latchedPlayerCollision, false);
  assert.equal(applyPlayerDamage(state, asset, 20, 25, 1250), true,
    "first genuine post-expiry collision must damage normally");
  assert.equal(state.health, 80);

  assert.match(routine("main_loop", "wait_frame"),
    /cmp #PLAYER_DYING[\s\S]+jsr read_input[\s\S]+jsr update_player_fighter_weapon/);
  assert.match(routine("draw_player_for_lifecycle", "begin_player_fighter_explosion"),
    /RESPAWN_BLINK_FRAME[\s\S]+RESPAWN_BLINK_HALF_PERIOD_FRAMES[\s\S]+jmp draw_player/);
  assert.doesNotMatch(routine("draw_player_for_lifecycle", "begin_player_fighter_explosion"),
    /HPOSP|GRACTL|COLPM|NMIEN|DLI/);
});

test("heavy, hull, and fighter damage share the lifecycle gate without pausing the sector", () => {
  const graphics = readGameGraphicsSource(source, definition);
  const envelope = combinedPlayerEnvelope(graphics.playerShape, graphics.playerEngineShape);
  const contact = playerHullContact(asset, {
    playerX: 82,
    playerY: 112,
    corridorPhase: 22,
    visibleScrolls: 0,
    envelope,
  });
  const state = createBroadsideState(asset);
  state.playerLifecycle = PLAYER_LIFECYCLE_STATES.RESPAWN_INVULNERABLE;
  state.respawnInvulnerabilityTimer = 250;
  const shell = beginWarning(state, asset, enemyTurretIndex, 0, 14);
  shell.state = BROADSIDE_STATES.FLYING;
  assert.equal(hitPlayer(state, shell, asset, 1), false);
  assert.equal(shell.state, BROADSIDE_STATES.IMPACT,
    "invulnerable player still consumes a colliding heavy shell");
  assert.equal(contactPlayerHull(state, contact, asset, 1), false);
  assert.equal(state.health, 100);

  const collisions = routine("handle_collisions", "update_score_display");
  assert.match(collisions,
    /jsr player_contacts_enemy[\s\S]+lda #PLAYER_HEALTH_UNITS\s+jsr apply_player_damage[\s\S]+jsr update_broadside/);
  const gate = routine("apply_broadside_player_damage", "update_hud_status");
  assert.match(gate, /PLAYER_LIFECYCLE[\s\S]+cmp #PLAYER_ALIVE[\s\S]+bne @done/);
  assert.doesNotMatch(routine("update_broadside", "schedule_broadside"),
    /BROAD_DEATH_TIMER|PLAYER_DYING|PLAYER_RESPAWN_INVULNERABLE/);
});

test("expiry clears captured and hardware collision latches before restoring ALIVE", () => {
  const expiry = routine("tick_respawn_invulnerability", "clear_player_collision_latches");
  assert.match(expiry,
    /jsr clear_player_collision_latches[\s\S]+jsr erase_player[\s\S]+jsr draw_player[\s\S]+lda #PLAYER_ALIVE[\s\S]+sta PLAYER_LIFECYCLE/);
  const clear = routine("clear_player_collision_latches", "update_broadside");
  assert.match(clear,
    /sta BROAD_M0_COLLISION[\s\S]+sta BROAD_P0_COLLISION[\s\S]+sta BROAD_DAMAGE_APPLIED[\s\S]+sta HITCLR/);
  assert.doesNotMatch(clear, /sta BROAD_COLLISION/,
    "lifecycle latch clearing cannot erase a flying shell's second backing cell");
  const start = labels.get("respawn_player");
  const end = labels.get("tick_respawn_invulnerability");
  const bytes = xexBytesAt(start, end - start);
  assert.ok(containsBytes(bytes, [0xa9, 124, 0x85, labels.get("player_x")]));
  assert.ok(containsBytes(bytes, [0x8d, 0x00, 0xd0]));
  assert.ok(containsBytes(bytes, [0x8d, 0x03, 0xd0]));
  assert.ok(containsBytes(bytes, [0xa9, PLAYER_RESPAWN_Y, 0x85, labels.get("player_y")]));
  assert.ok(containsBytes(bytes, [0xa9, 250, 0x8d,
    0xac, 0x4e]));
});

test("last life reaches GAME OVER after the full death animation without respawning", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 20;
  assert.equal(applyPlayerDamage(state, asset, 20, 25, 0), true);
  assert.equal(state.lives, 0);
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL - 1; frame += 1) {
    advancePlayerLifecycle(state, asset);
  }
  assert.equal(advancePlayerLifecycle(state, asset), "game-over");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.GAME_OVER);
  assert.equal(state.playerVisible, false);
});

test("sequence preview uses runtime PMG colours, source muzzles, and deterministic integer geometry", () => {
  const state = readBroadsideFireSequenceRuntimeState(source, definition);
  assert.deepEqual(state.panelDefinitions.map(({ label }) => label), [
    "ALLIED MUZZLE WARNING", "ENEMY MUZZLE WARNING", "THREE SHELL CROSSING",
    "ALLIED HIT ON FIGHTER", "OPPOSITE HULL IMPACT", "PLAYER DAMAGE IMPACT",
  ]);
  const png = createBroadsideFireSequencePreview(source, definition);
  const second = createBroadsideFireSequencePreview(source, loadCapitalHullsDefinition(definitionPath));
  assert.deepEqual(png, second);
  assert.deepEqual([inspectPng(png).width, inspectPng(png).height], [1280, 1248]);
  assert.equal(sha256(png).length, 64);
  const graphics = readGameGraphicsSource(source, definition);
  assert.deepEqual([1, 2, 3].map((slot) => graphics.hardwareState.get(`COLPM${slot}`)), [0x44, 0x46, 0x28]);
});

test("acceptance sequence is source-derived across warning, contact, damage, and lethal states", () => {
  const state = readBroadsideAcceptanceSequenceRuntimeState(source, definition);
  assert.deepEqual(state.panelDefinitions.map(({ label }) => label), [
    "ALLIED EARLY WARNING", "ALLIED MEDIUM WARNING", "ALLIED HOT WARNING",
    "ALLIED LAUNCH SAME PATH", "ENEMY EARLY WARNING", "ENEMY HOT WARNING",
    "ALLIED HULL CONTACT", "ENEMY HULL CONTACT", "PLAYER DAMAGE FEEDBACK",
    "ZERO HEALTH TRANSITION",
  ]);
  assert.deepEqual(
    state.panelDefinitions.slice(0, 3).map(({ spans }) => [spans[0].height, spans[0].size]),
    [[2, 0], [4, 1], [6, 3]],
  );
  const alliedContact = state.panelDefinitions[6];
  const enemyContact = state.panelDefinitions[7];
  assert.equal(alliedContact.contact.side, "allied");
  assert.equal(alliedContact.player.x, alliedContact.contact.clampedX);
  assert.equal(enemyContact.contact.side, "enemy");
  assert.equal(enemyContact.player.x, enemyContact.contact.clampedX);
  assert.equal(state.panelDefinitions[8].backgroundColor, 0x42);
  assert.equal(state.panelDefinitions[9].player.visible, false);

  const png = createBroadsideAcceptanceSequencePreview(source, definition);
  const second = createBroadsideAcceptanceSequencePreview(
    source,
    loadCapitalHullsDefinition(definitionPath),
  );
  assert.deepEqual(png, second);
  assert.deepEqual([inspectPng(png).width, inspectPng(png).height], [1280, 2080]);
});

test("respawn evidence is source-derived across centered passes, real contacts, and 250 frames", () => {
  const state = readPlayerRespawnSequenceRuntimeState(source, definition);
  assert.deepEqual(state.panelDefinitions.map(({ label }) => label), [
    "CENTER LEFT ROW PASS  NO HIT",
    "CENTER RIGHT ROW PASS  NO HIT",
    "REAL LEFT CONTACT  ONE LIFE EVENT",
    "REAL RIGHT CONTACT  ONE LIFE EVENT",
    "DEATH FRAME 006  PLAYER HIDDEN",
    "RESPAWN FRAME 000  X124 Y225",
    "INVULN FRAME 007  VISIBLE M0 ACTIVE",
    "INVULN FRAME 008  HIDDEN M0 ACTIVE",
    "INVULN FRAME 249  LAST PROTECTED",
    "FRAME 250  VISIBLE ALIVE NEXT HIT",
  ]);
  assert.equal(state.panelDefinitions[0].contact.collided, false);
  assert.equal(state.panelDefinitions[1].contact.collided, false);
  assert.equal(state.panelDefinitions[2].contact.side, "allied");
  assert.equal(state.panelDefinitions[3].contact.side, "enemy");
  assert.equal(state.panelDefinitions[6].bullet.x, 132);
  assert.equal(state.panelDefinitions[7].player.visible, false);
  const first = createPlayerRespawnSequencePreview(source, definition);
  const second = createPlayerRespawnSequencePreview(
    source,
    loadCapitalHullsDefinition(definitionPath),
  );
  assert.deepEqual(first, second);
  assert.deepEqual([inspectPng(first).width, inspectPng(first).height], [1280, 2120]);
});

test("speed preview renders consecutive PAL states from the runtime scroll simulation", () => {
  const state = readBroadsideSpeedSequenceRuntimeState(source, definition);
  assert.equal(state.panelDefinitions.length, 5);
  assert.deepEqual(state.panelDefinitions.map(({ frame, scrolled }) => [frame, scrolled]), [
    [0, false], [1, false], [2, true], [3, false], [4, true],
  ]);
  assert.deepEqual(state.panelDefinitions.map(({ world }) => world.advances), [0, 0, 1, 1, 2]);
  assert.deepEqual(state.panelDefinitions.map(({ world }) => world.hullAdvances), [0, 0, 1, 1, 2]);
  assert.deepEqual(state.panelDefinitions[0].screen, state.panelDefinitions[1].screen);
  assert.notDeepEqual(state.panelDefinitions[1].screen, state.panelDefinitions[2].screen);
  assert.deepEqual(state.panelDefinitions[2].screen, state.panelDefinitions[3].screen);
  assert.notDeepEqual(state.panelDefinitions[3].screen, state.panelDefinitions[4].screen);
  assert.deepEqual(state.panelDefinitions.map(({ warning }) => warning.y),
    [92, 92, 100, 100, 108]);
  assert.deepEqual(
    state.panelDefinitions.map(({ projectile }) => projectile.x),
    [162, 160, 158, 156, 154],
  );

  const png = createBroadsideSpeedSequencePreview(source, definition);
  const second = createBroadsideSpeedSequencePreview(
    source,
    loadCapitalHullsDefinition(definitionPath),
  );
  assert.deepEqual(png, second);
  assert.deepEqual([inspectPng(png).width, inspectPng(png).height], [1920, 864]);
});

test("difficulty preview derives exact 8/9/10 displacement from one PAL-frame simulation", () => {
  const state = readDifficultySpeedComparisonRuntimeState(source, definition);
  assert.deepEqual(state.panelDefinitions.map(({ difficulty, rate }) => [difficulty, rate]), [
    ["easy", 8], ["medium", 9], ["hard", 10],
  ]);
  assert.deepEqual(state.panelDefinitions.map(({ eventFrames }) => eventFrames), [
    [3, 5, 8, 10, 13, 15, 18, 20],
    [3, 5, 7, 9, 12, 14, 16, 18, 20],
    [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
  ]);
  assert.deepEqual(state.panelDefinitions.map(({ displacement }) => displacement), [64, 72, 80]);
  assert.deepEqual(state.panelDefinitions.map(({ projectileDisplacement }) =>
    projectileDisplacement), [40, 40, 40]);
  for (const panel of state.panelDefinitions) {
    assert.equal(panel.initial.world.corridorPhase, asset.sector.previewSectorRow);
    assert.equal(panel.initial.world.advances, 0);
    assert.equal(panel.final.warning.timer, 5, "warning timing remains PAL-based");
    assert.equal(panel.final.warning.y - panel.initial.warning.y,
      panel.final.world.hullAdvances * 8,
      "warning follows hull events rather than the faster world stream");
  }

  const png = createDifficultySpeedComparisonPreview(source, definition);
  const second = createDifficultySpeedComparisonPreview(
    source,
    loadCapitalHullsDefinition(definitionPath),
  );
  assert.deepEqual(png, second);
  assert.deepEqual([inspectPng(png).width, inspectPng(png).height], [1920, 464]);
});

test("cadence preview plots source-derived warning, launch, and world-scroll timing", () => {
  const state = readBroadsideCadenceSequenceRuntimeState(source, definition);
  assert.deepEqual(
    [state.baseline.warningStats.count, state.baseline.launchStats.count],
    [7, 7],
  );
  assert.deepEqual([state.final.warningStats.count, state.final.launchStats.count], [24, 24]);
  assert.equal(state.final.warningStats.minimumGap, 16);
  assert.equal(state.final.warningStats.averageGap, 832 / 23);
  assert.ok(state.final.warningScrolls.some(({ frame }) => frame % 4 === 0));

  const png = createBroadsideCadenceSequencePreview(source, definition);
  const second = createBroadsideCadenceSequencePreview(
    source,
    loadCapitalHullsDefinition(definitionPath),
  );
  assert.deepEqual(png, second);
  assert.deepEqual([inspectPng(png).width, inspectPng(png).height], [1280, 256]);
});

test("broadside state, charset, software collision, and fixed loops remain bounded", () => {
  const graphics = readGameGraphicsSource(source, definition);
  assert.equal(graphics.charset.length, 1024);
  assert.ok(graphics.constants.get("BROAD_STATE_END") - graphics.constants.get("BROAD_STATE_BASE") <= 64);
  assert.equal(labels.get("__BROADSIDE_RUN__"), 0x5e10);
  assert.ok(labels.get("__BROADSIDE_SIZE__") <= 0x1a00);
  const collisions = routine("handle_collisions", "update_score_display");
  assert.doesNotMatch(collisions, /lda M0PL|lda P0PL|lda M1PL/,
    "software envelopes, not star-contaminated GTIA latches, own collisions");
  assert.match(collisions, /jsr update_broadside[\s\S]+jsr resolve_enemy_damage[\s\S]+sta HITCLR/);
  assert.match(routine("update_broadside", "schedule_broadside"),
    /ldx #\$00[\s\S]+cpx #BROADSIDE_SLOT_COUNT/);
  assert.doesNotMatch(routine("update_broadside", "schedule_broadside"), /VDSLST|WSYNC|NMIEN/);
});
