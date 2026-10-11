// feat/interceptor-standoff (owner answers Q1/Q2 of 2026-10-11,
// docs/plans/interceptor-standoff.md): no kamikaze runs. Every Interceptor -
// the level waves' and the boss escort - descends as before until it is 7
// rows above the player (each Light slot 2 rows higher), holds there, backs
// off upward when the player closes to under 6 rows, tracks the player's
// column, fires its laser only when it is in that column, and climbs out
// after 100 frames - its whole life under the escort clock's 128-frame floor
// (scripts/boss-assets.mjs), which is what keeps an escort from pending past
// the boss's defeat.
//
// The machine is the 6502 harness on the built runtime, the Light C tick
// called per slot as the kernel's light_update does. RED on main ef1924d
// (the chase descends through the standoff to the bottom edge, fires out of
// the player's column, never climbs and stacks a swarm in one row), GREEN
// after.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labels = new Map();
for (const file of ["build/void-strike-65.lbl", "build/encounter-director.lbl",
  "build/integration-glue.lbl", "build/light-kernel.lbl"]) {
  for (const line of fs.readFileSync(path.join(root, file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
}
const L = (name) => {
  const address = labels.get(name);
  assert.ok(Number.isInteger(address), `missing label ${name}`);
  return address;
};

const OFFSET_INTERCEPTOR = 24;
const LASER = 2;
const LIGHT_RETURN_INSTALL = 0x40;
// The owner's values (Q2), in lines: one row is 8.
const STANDOFF_FAR = 56;      // descends while the player is 7 rows or more below
const STANDOFF_NEAR = 48;     // backs off while the player is under 6 rows below
const SLOT_ROWS = 16;         // each Light slot holds two rows higher
const LIFE_FRAMES = 100;      // then climbs out
const ESCORT_FLOOR = 128;     // scripts/boss-assets.mjs: baseFrames >= 128

function run(image, target, { a = 0, x = 0 } = {}) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(target);
  cpu.a = a;
  cpu.x = x;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a };
}

function game(difficulty = 1) {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  image[L("DIFFICULTY_SETTING")] = difficulty;
  run(image, "director_init", { a: 0x6d });
  return image;
}

// One Interceptor admitted into slot 0 the way a wave admits it; `slots`
// more copy it into slots 1.. (a swarm arriving together).
function admit(image, slots = 1) {
  image[L("_heavy_escort_offset")] = OFFSET_INTERCEPTOR;
  image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  run(image, "enemy_spawn_raiders");
  assert.equal(image[L("light_state")], 2, "the Interceptor is born free-flying");
  for (let slot = 1; slot < slots; slot += 1) {
    for (const array of ["light_state", "light_hp", "light_x", "light_y", "light_fire_timer",
      "_light_burst_left", "light_archetype_offset"]) {
      image[L(array) + slot] = image[L(array)];
    }
  }
  image[L("_light_slot_limit")] = Math.max(image[L("_light_slot_limit")], slots);
}

const slotOf = (image, slot = 0) => ({
  live: image[L("light_state") + slot] !== 0,
  x: image[L("light_x") + slot],
  y: image[L("light_y") + slot],
});

// One runtime frame for the Light C: the frame counter, then each live slot's
// tick, as light_update calls it. Returns the slots' tick results.
function frame(image) {
  image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  const results = [];
  for (let slot = 0; slot < 4; slot += 1) {
    if (image[L("light_state") + slot] === 0) { results.push(0); continue; }
    image[L("_light_slot")] = slot;
    results.push(run(image, "enemy_light_tick").a);
  }
  return results;
}

const column = (playerX) => Math.min(playerX & 0xfc, 200);

// The player's scripted path: a function of the frame index.
const PATHS = {
  "parked low": () => ({ x: 124, y: 190 }),
  "parked mid-screen": () => ({ x: 124, y: 120 }),
  "climbing at full speed": (f) => ({ x: 124, y: Math.max(72, 200 - f) }),
  "weaving low": (f) => ({ x: 48 + ((f * 2) % 304 < 152 ? (f * 2) % 152 : 304 - (f * 2) % 304), y: 180 }),
  // Not a fighter's path - the worst case for the column gate.
  "jumping between the ends": (f) => ({ x: f & 1 ? 48 : 200, y: 190 }),
};

// Flies one Interceptor (slot 0) to retirement along `pathName`; returns the
// per-frame record.
function fly(difficulty, pathName) {
  const image = game(difficulty);
  const path = PATHS[pathName];
  image[L("player_x")] = path(0).x;
  image[L("player_y")] = path(0).y;
  admit(image);
  const record = [];
  for (let f = 0; f < 300; f += 1) {
    const { x: px, y: py } = path(f);
    image[L("player_x")] = px;
    image[L("player_y")] = py;
    const before = slotOf(image);
    const [result] = frame(image);
    const after = slotOf(image);
    record.push({ f, px, py, before, after, result });
    if (!after.live) break;
  }
  return record;
}

test("inside the standoff the Interceptor never closes on the player, and backs off when the player closes", () => {
  for (const difficulty of [0, 1, 2]) {
    for (const pathName of Object.keys(PATHS)) {
      const record = fly(difficulty, pathName);
      let inside = 0;
      let backedOff = 0;
      for (const { f, py, before, after } of record) {
        if (!after.live || before.y >= py) continue;
        const gap = py - before.y;
        if (gap >= STANDOFF_FAR) continue;
        inside += 1;
        assert.ok(after.y <= before.y,
          `${pathName}, difficulty ${difficulty}, frame ${f}: ${gap} lines above the player it moved ` +
          `${before.y} -> ${after.y}, toward the player`);
        if (gap < STANDOFF_NEAR && after.y < before.y) backedOff += 1;
      }
      assert.ok(inside >= 20, `${pathName}, difficulty ${difficulty}: it reached the standoff on ${inside} frames`);
      if (pathName === "climbing at full speed") {
        assert.ok(backedOff >= 10, `difficulty ${difficulty}: it backed off on ${backedOff} frames as the player climbed`);
      }
    }
  }
});

test("it fires only when it is in the player's column, and does fire there (1 / 2 / 3 a visit)", () => {
  for (const [difficulty, shots] of [[0, 1], [1, 2], [2, 3]]) {
    // Aligned: the player parked in a column the Interceptor reaches.
    const aligned = fly(difficulty, "parked low").filter(({ result }) => result === LASER);
    assert.equal(aligned.length, shots, `difficulty ${difficulty}: ${aligned.length} shots parked`);
    // Never out of the column, on any path.
    for (const pathName of Object.keys(PATHS)) {
      for (const { f, px, after, result } of fly(difficulty, pathName)) {
        if (result !== LASER) continue;
        assert.equal(after.x, column(px),
          `${pathName}, difficulty ${difficulty}, frame ${f}: fired at x ${after.x}, the player's column ${column(px)}`);
      }
    }
  }
});

test("it climbs out after its 100 frames and retires inside the escort clock's 128-frame floor", () => {
  let worst = 0;
  for (const difficulty of [0, 1, 2]) {
    for (const pathName of Object.keys(PATHS)) {
      const record = fly(difficulty, pathName);
      const life = record.length;
      worst = Math.max(worst, life);
      assert.ok(!record.at(-1).after.live, `${pathName}: still live after 300 frames`);
      assert.ok(life > LIFE_FRAMES, `${pathName}, difficulty ${difficulty}: retired at ${life}, before its time`);
      assert.ok(life < ESCORT_FLOOR, `${pathName}, difficulty ${difficulty}: a life of ${life} frames`);
      for (const { f, before, after } of record.slice(LIFE_FRAMES)) {
        if (!after.live) continue;
        assert.ok(after.y < before.y, `${pathName}, frame ${f}: ${before.y} -> ${after.y}, not climbing out`);
      }
    }
  }
  assert.ok(worst < ESCORT_FLOOR, `worst life ${worst}`);
});

test("a swarm holds apart: each Light slot two rows above the one before, never one cell", () => {
  const image = game(1);
  image[L("player_x")] = 124;
  image[L("player_y")] = 190;
  admit(image, 3);
  for (let f = 0; f < 80; f += 1) frame(image);
  const ys = [0, 1, 2].map((slot) => slotOf(image, slot));
  assert.ok(ys.every(({ live }) => live), "the swarm retired early");
  for (const slot of [1, 2]) {
    assert.equal(ys[slot - 1].y - ys[slot].y, SLOT_ROWS,
      `slots ${slot - 1} and ${slot} hold at y ${ys[slot - 1].y} and ${ys[slot].y}`);
  }
  assert.ok(190 - ys[0].y < STANDOFF_FAR && 190 - ys[0].y >= STANDOFF_NEAR,
    `slot 0 holds ${190 - ys[0].y} lines above the player`);
});
