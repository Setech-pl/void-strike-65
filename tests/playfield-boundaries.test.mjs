import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";
import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
} from "../scripts/entity-effects.mjs";
import {
  compileFighterWeapons,
  loadFighterWeaponsDefinition,
} from "../scripts/fighter-weapons.mjs";
import { canonicalPlayfield } from "../scripts/playfield.mjs";
import {
  compileStarfield,
  composeStarfield,
  createStarfieldState,
  loadStarfieldDefinition,
  starfieldGeometry,
  stepStarfieldFrame,
} from "../scripts/starfield.mjs";
import {
  executeWeaponPickupRingWrapTrace,
  executeWeaponPickupTraversalTrace,
} from "../scripts/weapon-pickup-runtime.mjs";
import {
  BROADSIDE_WARNING_Y_MAX,
  GAMEPLAY_HULL_ROWS,
  PLAYER_RESPAWN_Y,
} from "../scripts/broadside.mjs";
import { ENEMY_VISIBLE_BOTTOM_EXCLUSIVE } from "../scripts/enemy-combat.mjs";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const labels = new Map(fs.readFileSync(path.join(root, "build/void-strike-65.lbl"), "utf8")
  .split(/\r?\n/)
  .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
  .filter(Boolean)
  .map((match) => [match[2], Number.parseInt(match[1], 16)]));

const roster = compileEnemyRoster(loadEnemyRosterDefinition(
  path.join(root, "assets/graphics/enemy-roster.json")), root);
const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(
  path.join(root, "assets/graphics/fighter-weapons.json")), roster);
const entities = compileEntityEffects(loadEntityEffectsDefinition(
  path.join(root, "assets/graphics/entity-effects.json")));
const stars = compileStarfield(loadStarfieldDefinition(
  path.join(root, "assets/graphics/starfield.json")));
const hulls = loadCapitalHullsDefinition(path.join(root, "assets/graphics/capital-hulls.json"));

function runRoutine(memory, name) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(name);
  for (let steps = 0; steps < 100_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

test("one canonical PAL boundary model feeds every gameplay asset compiler", () => {
  assert.deepEqual({
    hud: [canonicalPlayfield.hudTop, canonicalPlayfield.hudBottom - 1],
    gameplay: [canonicalPlayfield.gameplayTop, canonicalPlayfield.gameplayBottom - 1],
    entities: [canonicalPlayfield.entityTop, canonicalPlayfield.gameplayBottom - 1],
    rows: [canonicalPlayfield.gameplayRows, canonicalPlayfield.ringRows],
    ring: [canonicalPlayfield.ringBufferAddress, canonicalPlayfield.ringBufferEnd - 1],
  }, {
    hud: [8, 15], gameplay: [16, 239], entities: [24, 239], rows: [28, 27],
    ring: [0x8140, 0x8577],
  });
  assert.deepEqual(weapons.viewport, canonicalPlayfield);
  assert.deepEqual(starfieldGeometry, { screenColumns: 40, gameplayRows: 28 });
  assert.deepEqual([
    entities.coordinateSystem.gameplayTopScanline,
    entities.coordinateSystem.gameplayBottomExclusive,
    entities.coordinateSystem.logicalRows,
    entities.weaponPickupRapidFire.releaseTopScanline,
    roster.runtime.movementPolicy.interceptorSoftPursuit.attackActiveBottomExclusive,
    hulls.sector.visibleRows,
    ENEMY_VISIBLE_BOTTOM_EXCLUSIVE,
    GAMEPLAY_HULL_ROWS,
    BROADSIDE_WARNING_Y_MAX,
  ], [24, 240, 27, 240, 240, 28, 240, 28, 231]);
});

test("PlayerFighter lower clamp derives from its real 15-scanline opaque union", () => {
  const body = [0x18, 0x18, 0x18, 0x3c, 0x7e, 0xdb, 0xff, 0xdb,
    0xff, 0x7e, 0x3c, 0x24, 0x66, 0x42, 0x42, 0x00];
  const engine = [0, 0, 0, 0, 0x18, 0x18, 0x24, 0x18,
    0x18, 0x18, 0x24, 0x24, 0x24, 0x42, 0x42, 0];
  const occupied = body.map((value, row) => value | engine[row]);
  assert.deepEqual([occupied.findIndex(Boolean), occupied.findLastIndex(Boolean)], [0, 14]);
  assert.equal(PLAYER_RESPAWN_Y, 225);
  assert.equal(PLAYER_RESPAWN_Y + occupied.findLastIndex(Boolean), 239);
  assert.match(source, /PLAYER_OPAQUE_HEIGHT = PLAYER_COLLISION_LAST_ROW\+1/);
  assert.match(source, /PLAYER_Y_MAX = GAMEPLAY_BOTTOM-PLAYER_OPAQUE_HEIGHT/);
  assert.match(source, /PLAYER_COLLISION_LAST_ROW = 14/);
});

test("assembled joystick path reaches both canonical vertical clamps without clipping", () => {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  const playerY = labels.get("player_y");
  memory[playerY] = 32;
  memory[labels.get("PLAYER_LIFECYCLE")] = 0;
  for (let frame = 0; frame < 250; frame += 1) {
    memory[0xd300] = 0x0d;
    runRoutine(memory, "read_input");
  }
  assert.equal(memory[playerY], 225);
  for (let frame = 0; frame < 250; frame += 1) {
    memory[0xd300] = 0x0e;
    runRoutine(memory, "read_input");
  }
  assert.equal(memory[playerY], 32);
});

test("white stars reach every gameplay row, including all five recovered lower rows", () => {
  let state = createStarfieldState(stars);
  const seen = Array(canonicalPlayfield.gameplayRows).fill(false);
  for (let frame = 0; frame < canonicalPlayfield.gameplayRows * 8; frame += 1) {
    const screen = composeStarfield(stars, state);
    for (let row = 0; row < canonicalPlayfield.gameplayRows; row += 1) {
      if (screen.subarray(row * 40, row * 40 + 40).some(Boolean)) seen[row] = true;
    }
    state = stepStarfieldFrame(stars, state);
  }
  assert.equal(seen.every(Boolean), true);
  assert.deepEqual(seen.slice(23), [true, true, true, true, true]);
  assert.equal(stars.farLayer.population, 0, "blue far stars are permanently disabled");
  assert.equal(stars.nearLayer.population, 4, "the final decorative layer has four white stars");
});

test("projectiles, debris, pickups and ordinary enemies share the exclusive bottom fence", () => {
  assert.equal(manifest.fighterWeapons.viewport.gameplayBottom, 240);
  assert.equal(manifest.entityEffects.gameplayBottomExclusive, 240);
  assert.equal(manifest.enemyRoster.movementPolicy.interceptorSoftPursuit
    .attackActiveBottomExclusive, 240);
  assert.match(source, /ENEMY_VISIBLE_BOTTOM_EXCLUSIVE = GAMEPLAY_BOTTOM/);
  assert.match(source, /cmp #\(GAMEPLAY_BOTTOM\+1\)/);
  assert.match(source, /cmp #ENTITY_GAMEPLAY_BOTTOM[\s\S]+integration_debris_release/);
  assert.match(source, /cmp #WEAPON_PICKUP_RELEASE_TOP[\s\S]+weapon_pickup_release/);
  assert.match(source, /cmp #ENTITY_GAMEPLAY_BOTTOM[\s\S]+render_interactive_entity_overlays/);
  assert.match(source, /BROADSIDE_WARNING_Y_MAX = GAMEPLAY_BOTTOM-9/);
});

test("all booster types traverse the lower playfield on EASY, MEDIUM and HARD", () => {
  for (const difficulty of [0, 1, 2]) {
    const { traces } = executeWeaponPickupTraversalTrace({ difficulty });
    for (const trace of traces) {
      assert.equal(trace.visible[0].y, 24);
      assert.equal(trace.released.y, 240);
      assert.ok(trace.visible.some(({ y }) => y >= 225),
        `${trace.name}/${difficulty} never entered the recovered lower area`);
      assert.ok(trace.visible.every(({ y }) => y >= 24 && y < 240));
      assert.ok(trace.visible.every(({ screenAddress, bottomScreenAddress, thirdScreenAddress }) =>
        [screenAddress, bottomScreenAddress, thirdScreenAddress]
          .filter(Boolean)
          .every((address) => address >= 0x8140 && address < 0x8578)));
      const deltas = trace.visible.slice(1).map(({ y }, index) => y - trace.visible[index].y);
      assert.ok(deltas.every((delta) => delta >= 1 && delta <= 2));
    }
  }
});

test("bottom clipping and repeated ring wraps never write the HUD or revive a pickup", () => {
  const trace = executeWeaponPickupRingWrapTrace({ wrapFramesAfterRelease: 81 });
  assert.equal(trace.releasedY, 240);
  assert.equal(trace.cellsAtRelease, 0);
  assert.equal(trace.cellsAfterAdditionalWraps, 0);
  assert.ok(trace.wrapCount >= 3);
  assert.ok(trace.records.every(({ screenAddress, bottomScreenAddress, thirdScreenAddress }) =>
    [screenAddress, bottomScreenAddress, thirdScreenAddress]
      .filter(Boolean)
      .every((address) => address >= 0x8140 && address < 0x8578)));
  assert.match(source, /cmp #\(ENTITY_LOGICAL_ROWS-1\)[\s\S]+@one_row/);
  assert.match(source, /cmp #\(ENTITY_LOGICAL_ROWS-2\)[\s\S]+@two_rows/);
  assert.ok(labels.get("PLAYFIELD_ROW_LO") >= 0x8578);
  assert.ok(labels.get("CORRIDOR_BOUNDARY_RIGHT") + 28 <= 0x8800);
});
