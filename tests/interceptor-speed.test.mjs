// fix/interceptor-speed (docs/plans/interceptor-speed.md; the owner's answers
// Q1-Q6 of 2026-10-14): every Interceptor - the swarm, elite (a)'s companion
// and the boss escort - can be caught by a player shot in every phase of its
// flight, and still flies its standoff.
//
//   - a shot fired from directly below at the worst moment of each phase hits
//     it while it is on screen; a ship holding fire under it kills it;
//   - the speeds are the shared behaviour's (decision AD): the on-screen
//     climbs 3 lines a frame (the shot climbs 6), the dive 4, the hover 64
//     frames, the top phase 64; the column it tracks is the ship's centre;
//     the reload 40 / 31 / 20 (E / M / H) is the record's;
//   - the longest life stays under the escort clock's 128-frame floor, the
//     lasers stay 1 / 2 / 3 a visit, the top-holds on screen, and it never
//     comes within contact range of the ship;
//   - region 4's boss is about a fifth lighter (the fight's data lever).
//
// Driven through the real main loop on the linked build in build/
// (scripts/measure-interceptor-catch.mjs on scripts/measure-population-harness.mjs).
// RED on main 2394f63 (the climbs at 8 lines a frame outrun the shot, the
// standoff holds the Interceptor one HPOS beside the shot's line), GREEN after.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { configure, flight, measure, scenarios, timeToKill } from "../scripts/measure-interceptor-catch.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lifecycle = fs.readFileSync(path.join(root, "src", "c", "lifecycle.c"), "utf8");
const define = (name) => Number(new RegExp(`#define ${name}\\s+(\\d+)u`).exec(lifecycle)[1]);
const weapons = JSON.parse(fs.readFileSync(path.join(root, "assets", "graphics", "fighter-weapons.json"), "utf8"));
const SHOT_SPEED = weapons.player_fighter.speedScanlines;
const ESCORT_FLOOR = 128;      // scripts/boss-assets.mjs: escort.baseFrames >= 128
const LIGHT_TOP = 24;          // ENTITY_GAMEPLAY_TOP: the first drawn line
const PLAYER_Y_MAX = 225;      // the bottom row: the standoff's lowest, the longest life

test("every phase of every Interceptor is caught by a shot fired from directly below", () => {
  configure({ difficulty: 1, playerY: PLAYER_Y_MAX });
  for (const [count, slots] of [[1, [0]], [3, [1, 2]]]) {
    for (const slot of slots) {
      for (const scenario of scenarios.filter(({ aim, move }) => aim === undefined && move === undefined)) {
        const where = `slot ${slot} of ${count}, ${scenario.name}`;
        const result = measure({ count, slot, loops: scenario.loops ?? 0, phase: scenario.phase,
          delay: scenario.delay ?? 0, aim: "below", backoff: scenario.backoff ?? false });
        assert.equal(result.result, "HIT", `${where}: ${result.result}` +
          (result.lightY === undefined ? "" : `, the Interceptor at y ${result.lightY} when the shot was spent`));
        assert.ok(result.hitY >= LIGHT_TOP, `${where}: hit off screen at y ${result.hitY}`);
      }
    }
  }
});

test("a ship holding fire under an Interceptor kills it, at every difficulty", () => {
  for (const difficulty of [0, 1, 2]) {
    configure({ difficulty, playerY: PLAYER_Y_MAX });
    for (const loops of [0, 2]) {
      const result = timeToKill({ loops, aim: "parked" });
      assert.equal(result.result, "killed", `difficulty ${difficulty}, loops ${loops}: it ${result.result}`);
    }
  }
});

test("the speeds are the shared behaviour's: climbs 3, dive 4, hover 64, top phase 64, the ship's centre", () => {
  const climb = define("INTERCEPTOR_CLIMB");
  assert.equal(climb, 3);
  assert.ok(SHOT_SPEED - climb >= 3, `the shot closes ${SHOT_SPEED - climb} lines a frame on a climbing Interceptor`);
  assert.equal(define("INTERCEPTOR_DIVE"), 4);
  assert.equal(define("INTERCEPTOR_LIFE_FRAMES"), 64);
  assert.equal(define("INTERCEPTOR_TOP_STEP"), 3);
  assert.equal((256 - define("INTERCEPTOR_LIFE_FRAMES")) % define("INTERCEPTOR_TOP_STEP"), 0,
    "the top phase's age must wrap to 0 exactly");
  assert.match(lifecycle, /light_target_x = \(uint8_t\)\(\(uint8_t\)\(PLAYER_X \+ \(uint8_t\)\(LIGHT_CENTRE_OFFSET \+ LIGHT_ROUND\)\) & 0xFCu\);/,
    "the standoff tracks the ship's centre column");
  assert.match(lifecycle, /ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT,\s*ENEMY_FIRE_LIGHT_DOUBLE_TAP,\s*1u, 0u,\s*40u, 31u, 20u,/,
    "the Interceptor record's reload is 40 / 31 / 20 (E / M / H)");
});

test("the longest life stays under the escort floor; 1 / 2 / 3 lasers a visit; top-holds on screen; no contact", () => {
  for (const difficulty of [0, 1, 2]) {
    configure({ difficulty, playerY: PLAYER_Y_MAX });
    const [escort] = flight({ count: 1, loops: 0 });
    assert.ok(escort.life < ESCORT_FLOOR, `difficulty ${difficulty}: the escort lived ${escort.life} frames`);
    assert.equal(escort.lasers, difficulty + 1, `difficulty ${difficulty}: ${escort.lasers} lasers in a visit`);
    assert.ok(escort.holdStandoff >= 16, `difficulty ${difficulty}: it hovered ${escort.holdStandoff} frames`);
    const swarm = flight({ count: 3, loops: 2 });
    swarm.forEach((slot, index) => {
      assert.equal(slot.topHolds.length, 2, `slot ${index}: ${slot.topHolds.length} top-holds`);
      for (const hold of slot.topHolds) assert.ok(hold >= 12, `slot ${index}: a top-hold of ${hold} frames`);
      assert.ok(slot.lowestY + 8 <= PLAYER_Y_MAX, `slot ${index}: it came down to y ${slot.lowestY}`);
    });
  }
});

// RE-PINNED feat/boss-order-scale (decision AX 2-4): the Void Citadel's hit
// points are the curve's now - it ends region 2 (tests/boss-region-4.test.mjs
// pins them, docs/boss-curve.json measures them); Q4's fifth lighter stays the
// step they were taken from (9 / 23 / 21 / 14 / 10 / 8).
test("region 4's boss is about a fifth lighter (the fight's data lever, owner answer Q4)", () => {
  const layout = JSON.parse(fs.readFileSync(path.join(root, "assets", "graphics", "boss-regions", "region-4",
    "modules.json"), "utf8"));
  const hp = Object.fromEntries(layout.modules.map(({ name, hp: points }) => [name, points]));
  assert.deepEqual(hp, { "spire-l": 11, "spire-r": 11, core: 27, "core-lens": 25, "cannon-l": 16, "cannon-r": 16,
    "gun-1": 11, "gun-5": 11, "gun-2": 11, "gun-3": 11, "gun-6": 11, "gun-4": 11,
    "plate-a": 10, "plate-b": 10, "plate-d": 10, "plate-e": 10 });
});
