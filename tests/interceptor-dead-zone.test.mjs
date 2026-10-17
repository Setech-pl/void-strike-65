// feat/boss-order-scale, step 1 (the owner's decision of 2026-10-16 on the
// gfx-regression audit, docs/diagnostics/gfx-regression-2026-10-16.md): the
// hovering Interceptor followed the player's column every 2nd frame (decision
// AS), so it jittered sideways. Now it does not move sideways while the
// player's ship centre is within 4 HPOS of its own column - exactly while the
// ship's shot (player_x + 8) crosses its [x, x + 8), so the side where a shot
// would pass beside it is left out (the catch rule, plan interceptor-speed
// §2.2). There it holds and fires; outside it the tracking is unchanged.
//
//   - inside the zone: no sideways move, on either frame parity;
//   - outside it: the tracking of decision AS, one 4-HPOS cell every 2nd frame
//     toward (player_x + 6) & $FC (at most 200), frame by frame on every path;
//   - it fires only inside the zone or in the column, and from anywhere in
//     the zone still fires 1 / 2 / 3 lasers a visit (E / M / H), each on the
//     ship's visible body.
//
// The Light C tick on the built runtime, called per slot as light_update does
// (tests/interceptor-standoff.test.mjs's harness). The standoff, back-off,
// loops, exit, armour and flash have their own tests, unchanged; the catch
// rule is tests/interceptor-speed.test.mjs's. RED on main 4767691 (it steps
// inside the zone), GREEN after.
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
const LIFE_FRAMES = 64;            // src/c/lifecycle.c INTERCEPTOR_LIFE_FRAMES
const PLAYER_VISIBLE_WIDTH = 16;   // src/main.s PLAYER_VISIBLE_WIDTH_HPOS
const LASER_OFFSET = 2;            // the laser leaves at light_x | 2 (src/hybrid/light-kernel.s)

function run(image, target, a = 0) {
  const cpu = new Nmos6502(image);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = L(target);
  cpu.a = a;
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    assert.notEqual(image[cpu.pc], 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${target} did not return`);
  return { a: cpu.a };
}

function game(difficulty) {
  const image = new Uint8Array(0x10000);
  installRuntimeSegments(image, root);
  for (let row = 0; row < 27; row += 1) {
    const address = 0x8140 + row * 40;
    image[L("PLAYFIELD_ROW_LO") + row] = address & 0xff;
    image[L("PLAYFIELD_ROW_HI") + row] = address >> 8;
  }
  image[L("DIFFICULTY_SETTING")] = difficulty;
  run(image, "director_init", 0x6d);
  return image;
}

function admit(image) {
  image[L("_heavy_escort_offset")] = OFFSET_INTERCEPTOR;
  image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  run(image, "enemy_spawn_raiders");
  assert.equal(image[L("light_state")], 2, "the Interceptor is born free-flying");
}

// One runtime frame for slot 0: the frame counter, then its tick.
function frame(image) {
  image[L("frame_counter")] = (image[L("frame_counter")] + 1) & 0xff;
  if (image[L("light_state")] === 0) return 0;
  image[L("_light_slot")] = 0;
  return run(image, "enemy_light_tick").a;
}

const slot = (image) => ({
  live: image[L("light_state")] !== 0,
  x: image[L("light_x")],
  y: image[L("light_y")],
  age: image[L("_light_burst_left")],
});

// The rule: the ship's shot, player_x + 8, crosses [x, x + 8).
const inZone = (playerX, lightX) => ((lightX - playerX - 1) & 0xff) < 8;
// Decision AS's column and step, unchanged outside the zone.
const column = (playerX) => Math.min((playerX + 6) & 0xfc, 200);
const step = (lightX, target) => lightX < target ? lightX + 4 : lightX > target ? lightX - 4 : lightX;

// An Interceptor in its standoff over a ship parked at (124, 190), `frames`
// frames after admission: hovering in the column 128.
function hovering(difficulty, frames = 40) {
  const image = game(difficulty);
  image[L("player_x")] = 124;
  image[L("player_y")] = 190;
  admit(image);
  for (let f = 0; f < frames; f += 1) frame(image);
  const now = slot(image);
  assert.ok(now.live && now.age < LIFE_FRAMES, `difficulty ${difficulty}: not hovering at frame ${frames}`);
  assert.equal(now.x, column(124), `difficulty ${difficulty}: not in the column at frame ${frames}`);
  return image;
}

test("inside the dead zone it does not move sideways, on either frame parity", () => {
  for (const difficulty of [0, 1, 2]) {
    const base = hovering(difficulty);
    const lightX = slot(base).x;
    // Every ship x whose shot crosses it: the ship's centre 4 HPOS left of
    // its centre (player_x = x - 8) to 3 HPOS right (player_x = x - 1).
    for (let playerX = lightX - 8; playerX <= lightX - 1; playerX += 1) {
      assert.ok(inZone(playerX, lightX));
      const image = base.slice();
      image[L("player_x")] = playerX;
      for (let f = 0; f < 6; f += 1) {
        frame(image);
        assert.equal(slot(image).x, lightX,
          `difficulty ${difficulty}, ship x ${playerX} (centre ${playerX + 8 - (lightX + 4)} HPOS off its centre), ` +
          `frame ${f}: it moved ${lightX} -> ${slot(image).x}`);
      }
    }
  }
});

test("just outside the zone it steps one cell toward the ship's column, as before", () => {
  const base = hovering(1);
  const lightX = slot(base).x;
  // The ship's shot passes just right of it (player_x = x) or 2 HPOS left.
  for (const [playerX, expected] of [[lightX, lightX + 4], [lightX - 10, lightX - 4]]) {
    assert.ok(!inZone(playerX, lightX));
    const image = base.slice();
    image[L("player_x")] = playerX;
    frame(image);
    frame(image);
    assert.equal(slot(image).x, expected, `ship x ${playerX}: it is at ${slot(image).x}`);
  }
});

// The player's scripted paths: a function of the frame index.
const PATHS = {
  "parked": () => 124,
  "weaving": (f) => 48 + ((f * 2) % 304 < 152 ? (f * 2) % 152 : 304 - (f * 2) % 304),
  "a slow wobble": (f) => 120 + 2 * (Math.floor(f / 3) % 5),
  "nudging left and right": (f) => 124 + [0, -2, -4, -6, -4, -2, 0, 2, 4, 6, 4, 2][f % 12],
  "sliding right, stopping": (f) => Math.min(48 + 2 * f, 160),
  // Not a fighter's path - the worst case for the gates.
  "jumping between the ends": (f) => (f & 1 ? 48 : 200),
};

function fly(difficulty, pathOf) {
  const image = game(difficulty);
  image[L("player_x")] = pathOf(0);
  image[L("player_y")] = 190;
  admit(image);
  const record = [];
  for (let f = 0; f < 300; f += 1) {
    const playerX = pathOf(f);
    image[L("player_x")] = playerX;
    const before = slot(image);
    const result = frame(image);
    const after = slot(image);
    record.push({ f, playerX, before, after, result, even: (image[L("frame_counter")] & 1) === 0 });
    if (!after.live) break;
  }
  return record;
}

test("outside the zone the tracking is decision AS's, frame by frame; it never moves while climbing", () => {
  for (const difficulty of [0, 1, 2]) {
    for (const [name, pathOf] of Object.entries(PATHS)) {
      let tracked = 0;
      let held = 0;
      for (const { f, playerX, before, after, even } of fly(difficulty, pathOf)) {
        if (!after.live) continue;
        const where = `${name}, difficulty ${difficulty}, frame ${f}, ship x ${playerX}`;
        if (before.age >= LIFE_FRAMES) {
          assert.equal(after.x, before.x, `${where}: it moved sideways while climbing`);
          continue;
        }
        let expected = before.x;
        if (inZone(playerX, before.x)) {
          held += 1;
        } else if (even) {
          expected = step(before.x, column(playerX));
          tracked += 1;
        }
        assert.equal(after.x, expected, `${where}: ${before.x} -> ${after.x}, the rule says ${expected}`);
      }
      if (name !== "jumping between the ends") {
        assert.ok(held > 0, `${name}, difficulty ${difficulty}: never inside the zone`);
      }
      if (name !== "parked") assert.ok(tracked > 0, `${name}, difficulty ${difficulty}: never tracked`);
    }
  }
});

test("it fires only in the zone or the column, and its laser falls on the ship's visible body", () => {
  for (const difficulty of [0, 1, 2]) {
    for (const [name, pathOf] of Object.entries(PATHS)) {
      for (const { f, playerX, after, result } of fly(difficulty, pathOf)) {
        if (result !== LASER) continue;
        const where = `${name}, difficulty ${difficulty}, frame ${f}`;
        assert.ok(inZone(playerX, after.x) || after.x === column(playerX),
          `${where}: fired at x ${after.x}, ship x ${playerX}`);
        if (name === "jumping between the ends") continue;
        const laserX = after.x + LASER_OFFSET;
        assert.ok(laserX >= playerX && laserX < playerX + PLAYER_VISIBLE_WIDTH,
          `${where}: the laser at x ${laserX} misses the ship ${playerX}..${playerX + PLAYER_VISIBLE_WIDTH - 1}`);
      }
    }
  }
});

test("held at either edge of the zone it still fires 1 / 2 / 3 lasers a visit", () => {
  for (const [difficulty, lasers] of [[0, 1], [1, 2], [2, 3]]) {
    for (const edge of [-8, -1]) {
      const image = hovering(difficulty, 4);
      const lightX = slot(image).x;
      image[L("player_x")] = lightX + edge;
      let fired = 0;
      for (let f = 0; f < 300 && slot(image).live; f += 1) {
        if (frame(image) === LASER) fired += 1;
        if (slot(image).live && slot(image).age < LIFE_FRAMES) {
          assert.equal(slot(image).x, lightX, `difficulty ${difficulty}, edge ${edge}: it left its column`);
        }
      }
      assert.equal(fired, lasers, `difficulty ${difficulty}, the ship at x ${lightX + edge}: ${fired} lasers`);
    }
  }
});
