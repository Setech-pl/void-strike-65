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
const director = {
  address: 0x9d75,
  phase: 0x80f6,
  intensity: 0x80f8,
  reaction: 0x80f9,
  recovery: 0x80fa,
  rng: 0x80fb,
  pending: 0x80fc,
  flags: 0x80fe,
  admissionFrame: 0x80ff,
};
const activeGameplayFrame = { lo: 0x4ff8, hi: 0x4ff9 };

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
  memory.set(fs.readFileSync(path.join(root, "build", "encounter-director.bin")),
    director.address);
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
  cpu.pc = typeof name === "number" ? name : required(labels, name);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
}

function setActiveGameplayFrame(memory, frame) {
  memory[activeGameplayFrame.lo] = frame & 0xff;
  memory[activeGameplayFrame.hi] = frame >> 8;
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

test("capital due drains the final legal Hunter pulse before admission", () => {
  const { memory, labels } = assembleCurrentRuntime();
  const active = required(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const yAddress = required(labels, "FIGHTER_PROJECTILE_Y");
  const sector = required(labels, "CAPITAL_SECTOR_STATE");
  const enemyState = required(labels, "ENEMY_ACTIVE");
  const burstState = required(labels, "INTERCEPTOR_BURST_STATE");

  memory[required(labels, "PLAYER_LIFECYCLE")] = 0;
  memory[required(labels, "player_x")] = 48;
  memory[required(labels, "player_y")] = 225;
  memory[required(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[required(labels, "enemy_x")] = 100;
  memory[required(labels, "enemy_y")] = 16;
  memory[enemyState] = 1;
  memory[sector] = 7;
  memory[director.flags] = 0;
  setActiveGameplayFrame(memory, 599);

  run(memory, labels, "integration_update_first_capital");
  run(memory, labels, "integration_update_enemy_weapon");
  assert.deepEqual([memory[active + interceptorSlotBase], memory[yAddress + interceptorSlotBase]],
    [projectileKind, 29], "the final pre-due update must retain ordinary fire");

  memory[enemyState] = 0;
  setActiveGameplayFrame(memory, 600);
  run(memory, labels, "integration_update_first_capital");
  assert.deepEqual([memory[sector], memory[director.flags]], [7, 0x80]);
  run(memory, labels, "integration_update_enemy_weapon");
  assert.deepEqual([memory[active + interceptorSlotBase], memory[burstState]],
    [projectileKind, 0], "the gate must reset the parent without suppressing its pulse");

  for (let update = 1; update <= 42; update += 1) {
    setActiveGameplayFrame(memory, 599 + update);
    run(memory, labels, "integration_update_first_capital");
    assert.equal(memory[sector], 7, `hull entered before projectile update ${update}`);
    run(memory, labels, "update_fighter_projectiles");
    assert.equal(memory[active + interceptorSlotBase], update === 42 ? 0 : projectileKind);
  }

  setActiveGameplayFrame(memory, 642);
  run(memory, labels, "integration_update_first_capital");
  assert.deepEqual([memory[sector], memory[director.flags]], [0, 0x40],
    "admission must follow the natural release by one active update");
});

test("a live Hunter leaves naturally and gives capital admission a finite bound", () => {
  const { memory, labels } = assembleCurrentRuntime();
  const sector = required(labels, "CAPITAL_SECTOR_STATE");
  const enemyState = required(labels, "ENEMY_ACTIVE");

  memory[required(labels, "DIFFICULTY_SETTING")] = 2;
  memory[required(labels, "PLAYER_LIFECYCLE")] = 0;
  memory[required(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[required(labels, "enemy_y")] = 16 - 14;
  memory[enemyState] = 1;
  memory[sector] = 7;
  memory[director.flags] = 0;
  memory[director.intensity] = 1;

  for (let update = 0; update < 238; update += 1) {
    setActiveGameplayFrame(memory, 600 + update);
    run(memory, labels, "integration_update_first_capital");
    assert.equal(memory[sector], 7);
    run(memory, labels, "integration_update_enemy");
  }
  assert.equal(memory[enemyState], 0, "the Hunter must recycle at the lower boundary");
  assert.equal(memory[director.intensity], 0, "natural recycle must release Director pressure");

  setActiveGameplayFrame(memory, 838);
  run(memory, labels, "integration_update_first_capital");
  assert.deepEqual([memory[sector], memory[director.flags]], [0, 0x40],
    "the worst-positioned live Hunter must add at most 238 active frames");
});

test("ordinary waves stay closed through reconstruction and resume without catch-up", () => {
  for (const difficulty of [0, 1, 2]) {
    const { memory, labels } = assembleCurrentRuntime();
    const active = required(labels, "FIGHTER_PROJECTILE_ACTIVE");
    const sector = required(labels, "CAPITAL_SECTOR_STATE");
    const enemyState = required(labels, "ENEMY_ACTIVE");
    const burstState = required(labels, "INTERCEPTOR_BURST_STATE");
    const burstRemaining = required(labels, "INTERCEPTOR_BURST_REMAINING");
    const retryTimer = required(labels, "INTERCEPTOR_BURST_TIMER");
    const reconstructionRows = required(labels, "ENTITY_SPAWN_TIMER_HI");

    memory[required(labels, "DIFFICULTY_SETTING")] = difficulty;
    memory[required(labels, "PLAYER_LIFECYCLE")] = 0;
    memory[required(labels, "ENEMY_ARCHETYPE")] = 0;
    memory[required(labels, "enemy_x")] = 100;
    memory[required(labels, "enemy_y")] = 16;
    memory[required(labels, "player_x")] = 48;
    memory[required(labels, "player_y")] = 225;
    memory[required(labels, "frame_counter")] = 1;
    memory[director.phase] = 3;
    memory[director.rng] = 0x6d;
    memory[director.pending] = 0xff;
    memory[director.admissionFrame] = 0;

    for (const [capitalState, flags] of [[7, 0x80], [0, 0x40], [1, 0x40],
      [2, 0x40], [3, 0x40], [4, 0x40], [5, 0x40], [6, 0x40]]) {
      memory[sector] = capitalState;
      memory[director.flags] = flags;
      memory[enemyState] = 1;
      memory[burstState] = 1;
      memory[burstRemaining] = 6;
      memory[retryTimer] = 0;
      run(memory, labels, "integration_update_enemy_weapon");
      assert.equal(memory[active + interceptorSlotBase], 0,
        `difficulty ${difficulty}, state ${capitalState} emitted during the sector`);
      assert.deepEqual([memory[enemyState], memory[burstState], memory[burstRemaining]],
        [1, 0, 0], "the live Hunter must keep maneuvering while its parent weapon stops");

      memory[enemyState] = 0;
      memory[retryTimer] = 7;
      run(memory, labels, "interceptor_admission_update");
      assert.deepEqual([memory[enemyState], memory[retryTimer]], [0, 7],
        "blocked admission must freeze the existing retry without catch-up");
    }

    memory[sector] = 6;
    memory[director.flags] = 0x40;
    memory[reconstructionRows] = 27;
    memory[retryTimer] = 7;
    for (let row = 1; row <= 27; row += 1) {
      run(memory, labels, "interceptor_admission_update");
      assert.equal(memory[retryTimer], 7);
      run(memory, labels, "entity_complete_scroll_tick");
      assert.equal(memory[sector], row === 27 ? 7 : 6);
    }

    run(memory, labels, "interceptor_admission_update");
    assert.equal(memory[retryTimer], 6,
      "post-sector OPEN must resume the frozen ordinary retry one step at a time");
    memory[retryTimer] = 0;
    run(memory, labels, "interceptor_admission_update");
    assert.equal(memory[enemyState], 1, "post-sector OPEN must admit a normal Hunter");
    memory[required(labels, "enemy_y")] = 16;
    run(memory, labels, "integration_update_enemy_weapon");
    assert.equal(memory[active + interceptorSlotBase], projectileKind,
      "the returned Hunter must use the normal immediate burst start");

    memory[director.flags] = 0x80;
    memory[sector] = 1;
    setActiveGameplayFrame(memory, 900);
    run(memory, labels, "init_state");
    run(memory, labels, director.address, { a: 0x6d });
    assert.deepEqual([memory[director.flags], memory[sector], memory[activeGameplayFrame.lo],
      memory[activeGameplayFrame.hi]], [0, 7, 0, 0], "new game must reopen ordinary waves");
  }

  const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  assert.match(source,
    /update_sector_completion:[\s\S]+CAPITAL_SECTOR_DRAIN_ROWS[\s\S]+BROAD_STATE[\s\S]+BROAD_FLASH_TIMER[\s\S]+CAPITAL_EXPLOSION_TIMER[\s\S]+FIGHTER_EXPLOSION_TIMER[\s\S]+jsr entity_begin_sector_complete/,
    "COMPLETE must remain downstream of physical drain and effect lifecycles");
});
