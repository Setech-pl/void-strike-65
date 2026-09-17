import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";
import { canonicalPlayfield } from "../scripts/playfield.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/integration-glue.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}

const GAMEPLAY_TOP = canonicalPlayfield.gameplayTop;
const ENTITY_GAMEPLAY_TOP = GAMEPLAY_TOP + 8;
const HEAVY_HEIGHT = 14;
const BOMBER_HEIGHT = 16;
const DEBRIS_HEIGHT = 8;
const PLAYER1 = 0x3d00;
const PLAYER2 = 0x3e00;
const PLAYER_HEALTH = 0x4e5d;

function address(name) {
  const value = labels.get(name);
  assert.ok(Number.isInteger(value), `missing linked label ${name}`);
  return value;
}

function memory() {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  return image;
}

function run(image, name, { x = 0, hooks = {} } = {}) {
  const cpu = new Nmos6502(image, hooks);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address(name);
  cpu.x = x;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return {
    cycles: cpu.cycles,
    carry: (cpu.p & nmos6502Flags.carry) !== 0,
    a: cpu.a,
  };
}

function initialiseRows(image) {
  const rowLo = address("PLAYFIELD_ROW_LO");
  const rowHi = address("PLAYFIELD_ROW_HI");
  for (let row = 0; row < canonicalPlayfield.ringRows; row += 1) {
    const physical = canonicalPlayfield.ringBufferAddress + row * 40;
    image[rowLo + row] = physical & 0xff;
    image[rowHi + row] = physical >> 8;
  }
}

function visiblePmgWrites(writes, page) {
  return writes.filter(({ target }) =>
    target >= page + GAMEPLAY_TOP && target < page + canonicalPlayfield.gameplayBottom);
}

test("Heavy activation, respawn and both PMG slots begin wholly above gameplay", () => {
  const image = memory();
  image[address("ENEMY_ARCHETYPE")] = 0;
  image[address("player_x")] = 124;
  for (let generation = 0; generation < 3; generation += 1) {
    image.fill(0, PLAYER1, PLAYER2 + 0x100);
    const writes = [];
    run(image, "reset_enemy", {
      hooks: {
        write(target) {
          if (target >= PLAYER1 && target < PLAYER2 + 0x100) writes.push({ target });
          return undefined;
        },
      },
    });
    // 4.5c: the temporary Heavy smoke scheduler alternates Raider and Bomber
    // formations; the Bomber lane sweep starts its 16-line QUAD hull at Y 0
    // (also wholly above gameplay) with its per-slot turn timers.
    const bomber = generation % 2 === 1;
    const [startY, maneuver] = bomber
      ? [GAMEPLAY_TOP - BOMBER_HEIGHT, [60, 52]] : [GAMEPLAY_TOP - HEAVY_HEIGHT, [0, 0]];
    assert.deepEqual([...image.subarray(address("ENEMY_Y"), address("ENEMY_Y") + 2)],
      [startY, startY]);
    assert.deepEqual([...image.subarray(address("ENEMY_MANEUVER_STATE"),
      address("ENEMY_MANEUVER_STATE") + 2)], maneuver);
    assert.equal(visiblePmgWrites(writes, PLAYER1).length, 0);
    assert.equal(visiblePmgWrites(writes, PLAYER2).length, 0);
    assert.equal(image.subarray(PLAYER1 + GAMEPLAY_TOP,
      PLAYER1 + canonicalPlayfield.gameplayBottom).some(Boolean), false);
    assert.equal(image.subarray(PLAYER2 + GAMEPLAY_TOP,
      PLAYER2 + canonicalPlayfield.gameplayBottom).some(Boolean), false);
    image[address("ENEMY_ACTIVE")] = 0;
  }
});

test("Heavy top clipping publishes only the geometrically entered scanlines", () => {
  const image = memory();
  image[address("ENEMY_ARCHETYPE")] = 0;
  image[address("ENEMY_ACTIVE")] = 1;
  image[address("ENEMY_LIVE_COUNT")] = 2;
  image[address("player_x")] = 124;
  image[address("ENEMY_MEMBER_STATE")] = 1;
  image[address("ENEMY_MEMBER_STATE") + 1] = 1;
  image[address("ENEMY_X")] = 88;
  image[address("ENEMY_X") + 1] = 152;
  for (const [y, expectedVisibleRows] of [[2, 0], [3, 1], [15, 13], [16, 14]]) {
    for (let slot = 0; slot < 2; slot += 1) {
      image[address("ENEMY_Y") + slot] = y;
      image.fill(0, PLAYER1 + slot * 0x100, PLAYER1 + (slot + 1) * 0x100);
      const writes = [];
      run(image, "draw_enemy_member", {
        x: slot,
        hooks: {
          write(target) {
            if (target >= PLAYER1 && target < PLAYER2 + 0x100) writes.push({ target });
            return undefined;
          },
        },
      });
      assert.equal(visiblePmgWrites(writes, PLAYER1 + slot * 0x100).length,
        expectedVisibleRows, `slot ${slot}, Y=${y}`);
      assert.ok(writes.every(({ target }) =>
        target >= PLAYER1 + slot * 0x100 && target < PLAYER1 + (slot + 1) * 0x100),
      `slot ${slot}, Y=${y} crossed its PMG page`);
    }
  }
});

test("Heavy entry reaches the old per-slot anchors before unchanged crossing motion", () => {
  const image = memory();
  image[address("ENEMY_ARCHETYPE")] = 0;
  image[address("player_x")] = 124;
  run(image, "reset_enemy");
  const y = address("ENEMY_Y");
  const state = address("ENEMY_MANEUVER_STATE");
  const timer = address("ENEMY_MANEUVER_TIMER");
  for (let frame = 1; frame <= 142; frame += 1) {
    run(image, "update_enemy");
    if (frame === 1) assert.deepEqual([image[y], image[y + 1]], [3, 3]);
    if (frame === 14) assert.deepEqual([image[y], image[y + 1]], [16, 16]);
    if (frame === 46) {
      assert.deepEqual([image[y], image[y + 1]], [48, 48]);
      assert.equal(image[state], 0);
      assert.equal(image[timer], 48);
    }
    if (frame === 94) {
      assert.deepEqual([image[y], image[y + 1]], [48, 96],
        "P1 must wait at its old anchor until P2 completes admission");
      assert.deepEqual([image[state], image[state + 1]], [0, 0]);
    }
  }
  assert.deepEqual([image[y], image[y + 1]], [96, 48]);
  assert.deepEqual([image[state], image[state + 1]], [1, 1]);
  assert.deepEqual([image[timer], image[timer + 1]], [0, 0]);
});

test("a fully hidden Heavy cannot fire and the first fully visible frame can", () => {
  const image = memory();
  image[address("ENEMY_ARCHETYPE")] = 0;
  image[address("ENEMY_ACTIVE")] = 1;
  image[address("ENEMY_LIVE_COUNT")] = 2;
  image[address("ENEMY_MEMBER_STATE")] = 1;
  image[address("ENEMY_MEMBER_STATE") + 1] = 1;
  image[address("ENEMY_WEAPON_CURSOR")] = 0;
  image[address("ENEMY_Y")] = GAMEPLAY_TOP - HEAVY_HEIGHT;
  image[address("ENEMY_Y") + 1] = GAMEPLAY_TOP - HEAVY_HEIGHT;
  assert.equal(run(image, "select_enemy_weapon_member").carry, false);
  image[address("player_x")] = 88;
  image[address("player_y")] = 32;
  assert.equal(run(image, "player_contacts_enemy").a, 0,
    "legal player coordinates collided with a wholly hidden Heavy");
  image[address("FIGHTER_PROJECTILE_X")] = 88;
  image[address("FIGHTER_PROJECTILE_Y")] = GAMEPLAY_TOP;
  assert.equal(run(image, "player_fighter_projectile_hits_enemy", { x: 0 }).carry, false,
    "the highest legal PairShot collided before the Heavy entered");
  image[address("ENEMY_Y")] = GAMEPLAY_TOP;
  assert.equal(run(image, "select_enemy_weapon_member").carry, true);
});

test("debris activation and respawn remain write-free and non-colliding above the ring", () => {
  const image = memory();
  initialiseRows(image);
  const active = address("ENTITY_ACTIVE_MASK");
  const y = address("ENTITY_Y");
  const hp = address("ENTITY_HP");
  const events = address("ENTITY_FRAME_EVENTS");
  const screenHi = address("ENTITY_SCREEN_HI");
  const projectileActive = address("FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = address("FIGHTER_PROJECTILE_X");
  const projectileY = address("FIGHTER_PROJECTILE_Y");
  const playerX = address("player_x");
  const playerY = address("player_y");
  image[playerX] = 196;
  image[playerY] = 220;
  for (let generation = 0; generation < 3; generation += 1) {
    image[active] = 0;
    run(image, "entity_spawn_debris");
    assert.equal(image[y], ENTITY_GAMEPLAY_TOP - DEBRIS_HEIGHT);
    assert.equal(image[hp], 3);
    const ringBefore = image.slice(canonicalPlayfield.ringBufferAddress,
      canonicalPlayfield.ringBufferAddress + canonicalPlayfield.ringRows * 40);
    run(image, "render_interactive_entity_overlays");
    assert.equal(image[screenHi], 0);
    assert.deepEqual(image.slice(canonicalPlayfield.ringBufferAddress,
      canonicalPlayfield.ringBufferAddress + canonicalPlayfield.ringRows * 40), ringBefore);

    image[projectileActive] = 1;
    image[projectileX] = image[address("ENTITY_X")];
    image[projectileY] = image[y];
    run(image, "entity_player_fighter_projectile_target", { x: 0 });
    assert.equal(image[hp], 3, "fully hidden debris accepted a PairShot hit");
    image[playerX] = image[address("ENTITY_X")];
    image[playerY] = image[y];
    image[PLAYER_HEALTH] = 10;
    run(image, "entity_collide_player");
    assert.equal(image[active] & 1, 1,
      "fully hidden debris was released by direct player collision");
    assert.equal(image[PLAYER_HEALTH], 10,
      "fully hidden debris damaged the player");
    image[playerX] = 196;
    image[playerY] = 220;

    image[events] = 0;
    run(image, "entity_effects_update");
    assert.equal(image[y], ENTITY_GAMEPLAY_TOP - DEBRIS_HEIGHT);
    assert.equal(image[active] & 1, 1);
    image[active] = 0;
  }
});

test("debris enters only by its existing +8 world carry and first publishes fully at Y=24", () => {
  const image = memory();
  initialiseRows(image);
  image[address("player_x")] = 196;
  image[address("player_y")] = 220;
  run(image, "entity_spawn_debris");
  const y = address("ENTITY_Y");
  const events = address("ENTITY_FRAME_EVENTS");
  image[events] = 1;
  run(image, "entity_effects_update");
  assert.equal(image[y], 16);
  image[events] = 1;
  run(image, "entity_effects_update");
  assert.equal(image[y], ENTITY_GAMEPLAY_TOP);
  const writes = [];
  run(image, "render_interactive_entity_overlays", {
    hooks: {
      write(target) {
        if (target >= canonicalPlayfield.ringBufferAddress &&
          target < canonicalPlayfield.ringBufferAddress + canonicalPlayfield.ringRows * 40) {
          writes.push(target);
        }
        return undefined;
      },
    },
  });
  assert.equal(writes.length, 2, "2x1 debris must appear atomically on first legal row");
});

test("source keeps both off-screen contracts and no wrapped-Y convention", () => {
  assert.match(source,
    /RAIDER_PMG_SPAWN_Y = GAMEPLAY_TOP-ENEMY_RELEASE_FRAME_HEIGHT/);
  assert.match(source,
    /lda #\(ENTITY_GAMEPLAY_TOP-ENTITY_DEBRIS_HEIGHT_SCANLINES\)\s+sta ENTITY_Y/);
  assert.match(source,
    /@body_loop:\s+cpy #GAMEPLAY_TOP\s+bcc @body_next/);
  assert.match(source,
    /@active:\s+jsr entity_player_fighter_projectile_hits_visible_debris/);
  assert.match(source,
    /entity_player_fighter_projectile_hits_visible_debris:\s+lda ENTITY_Y\s+cmp #ENTITY_GAMEPLAY_TOP\s+bcc @miss/);
});
