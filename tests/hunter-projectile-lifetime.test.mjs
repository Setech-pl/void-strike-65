import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ringBase = 0x8140;
const ringRows = 27;
const columns = 40;
const divider = 0x4028;
const interceptorSlotBase = 10;
const interceptorSlots = 9;
const projectileKind = 2;
const capitalStates = [0, 1, 2, 3, 4, 5, 6];

function parseLabels(text) {
  return new Map(text.split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]));
}

function assembleCurrentRuntime() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-strike-hunter-shot-"));
  const object = path.join(temporary, "main.o");
  const binary = path.join(temporary, "main.bin");
  const labelPath = path.join(temporary, "main.lbl");
  execFileSync("ca65", ["--cpu", "6502", "-g", "-I", path.join(root, "build"),
    "-o", object, path.join(root, "src", "main.s")]);
  execFileSync("ld65", ["-C", path.join(root, "cfg", "atari-boot.cfg"), "-o", binary,
    "-Ln", labelPath, object]);
  const linked = fs.readFileSync(binary);
  const labels = parseLabels(fs.readFileSync(labelPath, "utf8"));
  const memory = new Uint8Array(0x10000);
  memory.set(linked.subarray(0, 0x2000), 0x2000);
  for (const prefix of ["STARFIELD", "BROADSIDE", "A2_KERNEL", "ENTITY_CODE", "PICKUP_CODE"]) {
    const load = labels.get(`__${prefix}_LOAD__`);
    const run = labels.get(`__${prefix}_RUN__`);
    const size = labels.get(`__${prefix}_SIZE__`);
    const offset = prefix === "PICKUP_CODE" ? labels.get("__PICKUPFILE_FILEOFFS__") : load - 0x2000;
    assert.ok([load, run, size, offset].every(Number.isInteger), `${prefix} fixture labels missing`);
    memory.set(linked.subarray(offset, offset + size), run);
  }
  return { memory, labels };
}

function required(labels, name) {
  const value = labels.get(name);
  assert.ok(Number.isInteger(value), `missing label ${name}`);
  return value;
}

function run(memory, labels, name, { a = 0, x = 0, y = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = required(labels, name);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

function initialiseRows(memory, labels, head = 0) {
  const rowLo = required(labels, "PLAYFIELD_ROW_LO");
  const rowHi = required(labels, "PLAYFIELD_ROW_HI");
  for (let logical = 0; logical < ringRows; logical += 1) {
    const physical = (head + logical) % ringRows;
    const address = ringBase + physical * columns;
    memory[rowLo + logical] = address & 0xff;
    memory[rowHi + logical] = address >> 8;
  }
}

function logicalAddress(memory, labels, y, x) {
  const logicalRow = (y >> 3) - 2;
  const column = (x - 48) >> 2;
  if (logicalRow === 0) return divider + column;
  const rowLo = required(labels, "PLAYFIELD_ROW_LO");
  const rowHi = required(labels, "PLAYFIELD_ROW_HI");
  return (memory[rowLo + logicalRow - 1] |
    memory[rowHi + logicalRow - 1] << 8) + column;
}

function setShot(memory, labels, slot, { x, y, lifetime = 96 }) {
  memory[required(labels, "FIGHTER_PROJECTILE_ACTIVE") + slot] = projectileKind;
  memory[required(labels, "FIGHTER_PROJECTILE_X") + slot] = x;
  memory[required(labels, "FIGHTER_PROJECTILE_Y") + slot] = y;
  memory[required(labels, "FIGHTER_PROJECTILE_PREV_Y") + slot] = y;
  memory[required(labels, "FIGHTER_PROJECTILE_LIFETIME") + slot] = lifetime;
  memory[required(labels, "FIGHTER_PROJECTILE_RENDERED") + slot] = 0;
}

function pulseCode(value) {
  return value >= 0xda && value <= 0xed;
}

function activeShots(memory, labels) {
  const active = required(labels, "FIGHTER_PROJECTILE_ACTIVE");
  return Array.from({ length: interceptorSlots }, (_, index) =>
    memory[active + interceptorSlotBase + index]);
}

test("assembled Hunter shots remain independent through capital traversal and ring wrap", () => {
  const { memory, labels } = assembleCurrentRuntime();
  const active = required(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const xAddress = required(labels, "FIGHTER_PROJECTILE_X");
  const yAddress = required(labels, "FIGHTER_PROJECTILE_Y");
  const lifetime = required(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const rendered = required(labels, "FIGHTER_PROJECTILE_RENDERED");
  const screenLo = required(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHi = required(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const backupTop = required(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
  const sector = required(labels, "CAPITAL_SECTOR_STATE");
  const enemyState = required(labels, "ENEMY_ACTIVE");
  const enemyY = required(labels, "enemy_y");
  const playerX = required(labels, "player_x");
  const playerY = required(labels, "player_y");
  const playerLifecycle = required(labels, "PLAYER_LIFECYCLE");
  const health = labels.get("BROAD_PLAYER_HEALTH") ?? 0x4e5d;

  initialiseRows(memory, labels);
  memory.fill(1, divider, divider + columns);
  memory.fill(1, ringBase, ringBase + ringRows * columns);
  memory[playerX] = 48;
  memory[playerY] = 225;
  memory[playerLifecycle] = 0;
  memory[health] = 10;
  for (let index = 0; index < interceptorSlots; index += 1) {
    setShot(memory, labels, interceptorSlotBase + index, { x: 64 + index * 12, y: 40 });
  }

  // A paused main loop performs neither erase nor update: raster and logical state persist.
  run(memory, labels, "render_fighter_projectile_overlays");
  const paused = {
    state: Array.from(memory.subarray(active, backupTop + 19)),
    ring: Array.from(memory.subarray(ringBase, ringBase + ringRows * columns)),
  };
  for (let pausedFrame = 0; pausedFrame < 3; pausedFrame += 1) {
    assert.deepEqual(Array.from(memory.subarray(active, backupTop + 19)), paused.state);
    assert.deepEqual(Array.from(memory.subarray(ringBase, ringBase + ringRows * columns)),
      paused.ring);
  }
  run(memory, labels, "erase_fighter_projectile_overlays");

  // Parent death, exit, release and slot reuse only stop/reset the burst controller.
  for (const [parentState, parentY] of [[2, 80], [1, 241], [0, 80], [1, 241]]) {
    memory[enemyState] = parentState;
    memory[enemyY] = parentY;
    run(memory, labels, "update_enemy_weapon_runtime");
    assert.deepEqual(activeShots(memory, labels), Array(interceptorSlots).fill(projectileKind));
  }

  // Every authored capital section, including DRAIN and COMPLETE, preserves released shots.
  for (const state of capitalStates) {
    memory[sector] = state;
    run(memory, labels, "update_enemy_weapon_runtime");
    assert.deepEqual(activeShots(memory, labels), Array(interceptorSlots).fill(projectileKind),
      `capital state ${state} released an independent shot`);
  }

  const initialHead = memory[required(labels, "PLAYFIELD_ROW_LO")] |
    memory[required(labels, "PLAYFIELD_ROW_HI")] << 8;
  for (let frame = 0; frame < ringRows; frame += 1) {
    run(memory, labels, "update_fighter_projectiles");
    assert.deepEqual(activeShots(memory, labels), Array(interceptorSlots).fill(projectileKind));
    run(memory, labels, "rotate_playfield_rows");
    const reference = memory.slice();
    run(memory, labels, "render_fighter_projectile_overlays");
    const addresses = [];
    for (let index = 0; index < interceptorSlots; index += 1) {
      const slot = interceptorSlotBase + index;
      const address = memory[screenLo + slot] | memory[screenHi + slot] << 8;
      addresses.push(address);
      assert.equal(address, logicalAddress(memory, labels,
        memory[yAddress + slot], memory[xAddress + slot]));
      assert.equal(memory[rendered + slot], projectileKind);
      assert.equal(pulseCode(memory[address]), true, `slot ${slot} has no final raster footprint`);
      assert.equal(pulseCode(memory[backupTop + slot]), false,
        `slot ${slot} captured a projectile in persistent backing`);
    }
    assert.equal(new Set(addresses).size, interceptorSlots, "one top footprint per active slot");
    run(memory, labels, "erase_fighter_projectile_overlays");
    assert.deepEqual(memory.subarray(divider, divider + columns),
      reference.subarray(divider, divider + columns));
    assert.deepEqual(memory.subarray(ringBase, ringBase + ringRows * columns),
      reference.subarray(ringBase, ringBase + ringRows * columns),
      "reverse erase left a trail or contaminated ring backing");
  }
  const wrappedHead = memory[required(labels, "PLAYFIELD_ROW_LO")] |
    memory[required(labels, "PLAYFIELD_ROW_HI")] << 8;
  assert.equal(wrappedHead, initialHead, "27 rotations must complete one physical ring wrap");

  // Hull, muzzle-warning/flash and BROADSIDE screen codes remain exact backing.
  memory.fill(0, active, active + 19);
  const overlayCodes = [0xbb, 0xd0, 0xd2, 0xf0];
  for (const code of overlayCodes) {
    setShot(memory, labels, 10, { x: 100, y: 96 });
    const address = logicalAddress(memory, labels, 96, 100);
    memory[address] = code;
    run(memory, labels, "render_fighter_projectile_overlays");
    assert.equal(pulseCode(memory[address]), true);
    assert.equal(memory[backupTop + 10], code);
    run(memory, labels, "erase_fighter_projectile_overlays");
    assert.equal(memory[address], code);
    memory[active + 10] = 0;
  }

  // Two shots may share a cell; reverse-order erase restores the sole underlying owner.
  setShot(memory, labels, 10, { x: 112, y: 104 });
  setShot(memory, labels, 11, { x: 112, y: 104 });
  const shared = logicalAddress(memory, labels, 104, 112);
  memory[shared] = 0x3b;
  run(memory, labels, "render_fighter_projectile_overlays");
  assert.equal(pulseCode(memory[shared]), true);
  assert.deepEqual([memory[active + 10], memory[active + 11]], [projectileKind, projectileKind]);
  run(memory, labels, "erase_fighter_projectile_overlays");
  assert.equal(memory[shared], 0x3b);

  // Exact native failure geometry: vertical sweep alone is not a player collision.
  memory.fill(0, active, active + 19);
  memory[playerX] = 82;
  memory[playerY] = 225;
  setShot(memory, labels, 11, { x: 106, y: 228, lifetime: 57 });
  run(memory, labels, "update_fighter_projectiles");
  assert.deepEqual([memory[active + 11], memory[xAddress + 11], memory[yAddress + 11],
    memory[lifetime + 11]], [projectileKind, 106, 233, 56]);

  // A real swept hit, lower boundary and documented TTL each release exactly once.
  memory.fill(0, active, active + 19);
  memory[health] = 10;
  setShot(memory, labels, 10, { x: 82, y: 220, lifetime: 20 });
  run(memory, labels, "update_fighter_projectiles");
  assert.deepEqual([memory[active + 10], memory[health]], [0, 9]);
  run(memory, labels, "update_fighter_projectiles");
  assert.equal(memory[health], 9, "consumed player-hit projectile released twice");

  setShot(memory, labels, 10, { x: 106, y: 233, lifetime: 20 });
  run(memory, labels, "update_fighter_projectiles");
  assert.equal(memory[active + 10], 0, "lower-boundary projectile did not release");
  run(memory, labels, "update_fighter_projectiles");
  assert.equal(memory[active + 10], 0);

  setShot(memory, labels, 10, { x: 106, y: 48, lifetime: 1 });
  run(memory, labels, "update_fighter_projectiles");
  assert.deepEqual([memory[active + 10], memory[yAddress + 10], memory[lifetime + 10]],
    [0, 48, 0], "documented TTL must release before movement exactly once");

  assert.match(fs.readFileSync(path.join(root, "src/main.s"), "utf8"),
    /interceptor_projectile_hits_player:[\s\S]+cmp #\(PLAYER_COLLISION_LAST_ROW\+1\)\s+bcc @vertical_overlap/);
});
