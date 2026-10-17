// feat/boss-order-scale (the owner's decision of 2026-10-16, after the
// Interceptor dead zone exposed it): every hostile shot meets the ship as the
// player sees it. The ship is P0 at double width (SIZEP0 = 1) from player_x,
// and its hull's widest rows (5-8 of player_shape) set all eight bits, so the
// drawn ship spans player_x .. player_x + 15 - the box the capital's shells
// already used (capital_shell_hits_player). The pool's shots (Raider and
// Bomber pulses, boss pulses, Light lasers: interceptor_projectile_hits_player)
// and the boss's beams (laser_collide) used the legacy 8 HPOS, the ship's left
// half: a shot through its right half did nothing.
//
// RED on main 4767691 (a shot or a beam over x + 8 .. x + 15 misses), GREEN
// after. The real routines on the built runtime: the pool's test called
// directly, the beam's through boss_update on the laser fixture.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import * as assets from "../scripts/boss-assets.mjs";
import { call, installRegion, label, placeBand, root, runBossEntry } from "./boss-harness.mjs";

const lbl = (name) => label("boss", name);
const main = (name) => label("main", name);
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const constant = (name) => Number(new RegExp(`^${name}\\s*=\\s*(\\d+)`, "m").exec(source)[1]);
const SHIP_WIDTH = constant("PLAYER_VISIBLE_WIDTH_HPOS");
const LAST_ROW = constant("PLAYER_COLLISION_LAST_ROW");
const SHOT_WIDTH = 2;            // INTERCEPTOR_PROJECTILE_WIDTH_HPOS
const BEAM_WIDTH = 4;            // boss.s LASER_BEAM_CLOCKS
const HOSTILE_FIRST = 5;

// The ship's bitmap: the drawn columns at double width.
test("the drawn ship spans player_x .. player_x + 15: the hull's widest rows set all eight bits", () => {
  const shape = /player_shape:\n((?:\s+\.byte %[01]{8}\n)+)/.exec(source)[1]
    .trim().split("\n").map((line) => Number.parseInt(/%([01]{8})/.exec(line)[1], 2));
  const rows = shape.slice(0, LAST_ROW + 1);
  const union = rows.reduce((a, b) => a | b, 0);
  assert.equal(union, 0xff, "the hull's columns");
  assert.equal(SHIP_WIDTH, 16, "double width: 8 bits, 2 HPOS each");
  assert.ok(shape.slice(LAST_ROW + 1).every((row) => row === 0), "no drawn row below the collision rows");
  assert.match(source, /lda #\$01\s+; undo the menu-only wide PMG craft\s+sta SIZEP0/);
});

const entry = runBossEntry();

function poolHit(shotX, shipX) {
  const memory = Uint8Array.from(entry.memory);
  const slot = HOSTILE_FIRST;
  memory[main("player_x")] = shipX;
  memory[main("player_y")] = 200;
  memory[main("FIGHTER_PROJECTILE_X") + slot] = shotX;
  memory[main("FIGHTER_PROJECTILE_PREV_Y") + slot] = 204;
  const cpu = call(memory, main("interceptor_projectile_hits_player"), { x: slot });
  return (cpu.p & 1) === 1;
}

test("a pool shot (pulse, boss pulse, Light laser) hits wherever it overlaps the drawn ship", () => {
  for (const shipX of [48, 124, 126, 200]) {
    for (let dx = -6; dx <= 20; dx += 1) {
      const overlaps = dx > -SHOT_WIDTH && dx < SHIP_WIDTH;
      assert.equal(poolHit(shipX + dx, shipX), overlaps,
        `ship x ${shipX}, a shot at +${dx}: ${overlaps ? "missed" : "hit"}`);
    }
  }
});

const region1 = assets.compileBossRegion(assets.loadBossRegionDraft(assets.bossRegionDirectory(root, 1)));
const fixture = assets.compileBossRegion(
  assets.bossLaserFixtureDraft(assets.loadBossRegionDraft(assets.bossRegionDirectory(root, 1))));
const emitter = fixture.modules.findIndex((module) => module.name === "emitter");

test("a boss beam damages wherever it overlaps the drawn ship, once a firing", () => {
  assert.ok(region1.modules.length > 0 && emitter >= 0);
  for (let dx = -6; dx <= 20; dx += 2) {
    const memory = Uint8Array.from(entry.memory);
    installRegion(memory, fixture, { level: 1, difficulty: 1 });
    placeBand(memory, 32);
    const lifecycle = main("PLAYER_LIFECYCLE");
    const cooldown = main("BROAD_DAMAGE_COOLDOWN");
    memory[lifecycle] = 0;
    memory[lifecycle + 1] = 3;
    memory[cooldown - 1] = 10;
    memory[cooldown] = 0;
    // A beam on screen at a known HPOS, nothing else.
    const i = 0;
    memory[lbl("boss_laser_state") + i] = 2;
    memory[lbl("boss_laser_hpos") + i] = 120;
    memory[lbl("boss_laser_fired") + i] = 0;
    for (let other = 1; other < 4; other += 1) memory[lbl("boss_laser_state") + other] = 0;
    memory[main("player_x")] = 120 - dx;
    let calls = 0;
    const site = lbl("boss_laser_damage");
    call(memory, lbl("laser_collide"), { watch: (pc) => { if (pc === site) calls += 1; } });
    const overlaps = dx > -BEAM_WIDTH && dx < SHIP_WIDTH;
    assert.equal(calls, overlaps ? 1 : 0, `a beam at ship x + ${dx}: ${calls} damage calls`);
  }
});
