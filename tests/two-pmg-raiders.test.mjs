import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  simulateTwoPmgRaiderPrototype,
} from "../scripts/enemy-combat.mjs";
import {
  compileEnemyRoster,
  loadEnemyRosterDefinition,
} from "../scripts/enemy-roster.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const asset = compileEnemyRoster(loadEnemyRosterDefinition(
  path.join(root, "assets/graphics/enemy-roster.json")), root);
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "dist/void-strike-65-manifest.json"), "utf8"));

test("two PMG Raiders keep independent movement state and cross vertically", () => {
  const replay = simulateTwoPmgRaiderPrototype(asset, {
    frameCount: 240,
    playerXForFrame: (frame) => frame < 80 ? 92 : frame < 160 ? 156 : 112,
  });
  const first = replay.trace[0].slots;
  const sameHeight = replay.trace.find(({ slots }) =>
    slots[0].y === slots[1].y && slots[0].x !== slots[1].x);
  const swapped = replay.trace.find(({ slots }) => slots[0].y > slots[1].y);
  assert.ok(first[0].y < first[1].y, "P1 must start above P2");
  assert.ok(sameHeight, "Raiders must share one height while retaining different X");
  assert.ok(swapped, "Raiders must reverse their vertical ordering");
  assert.notDeepEqual(replay.trace.map(({ slots }) => slots[0].x),
    replay.trace.map(({ slots }) => slots[1].x),
  "independent phases and initial state must not collapse into a fixed offset");
  assert.ok(replay.trace.some(({ slots }) => slots[0].velocityX < 0));
  assert.ok(replay.trace.some(({ slots }) => slots[1].velocityX > 0));
  for (const { slots } of replay.trace) {
    assert.equal(slots.length, 2);
    assert.notStrictEqual(slots[0], slots[1]);
  }
});

test("runtime assigns one monochrome body to P1 and P2 and leaves player PMG intact", () => {
  assert.match(source, /sta COLPM1\s+sta COLPM2/);
  assert.match(source, /sta PLAYER1,y[\s\S]+@body_p2_loop:[\s\S]+sta PLAYER2,y/);
  assert.match(source,
    /draw_player:[\s\S]+sta PLAYER0,y[\s\S]+sta PLAYER3,y[\s\S]+cpx #PLAYER_H/);
  assert.match(source, /RAIDER_PMG_SLOT_COUNT = 2/);
  assert.match(source, /ENEMY_X:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_Y:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_VELOCITY_X:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_MANEUVER_STATE:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /ENEMY_BEHAVIOUR_PHASE:\s+\.res RAIDER_PMG_SLOT_COUNT/);
  assert.match(source, /player_fighter_projectile_hits_enemy:[\s\S]{0,120}\bclc\s+rts/);
  assert.match(source, /update_enemy_weapon_runtime:[\s\S]{0,120}\brts/);
});

test("packed transports have positive measured boundaries", () => {
  const star = manifest.starfieldRuntime;
  assert.equal(star.packedSourceEndExclusive,
    star.packedSourceAddress + star.packedBytes);
  assert.ok(star.packedSourceEndExclusive <= star.pickupColdStagingAddress);
  assert.equal(star.packedSourceToPickupMarginBytes,
    star.pickupColdStagingAddress - star.packedSourceEndExclusive);
  assert.ok(star.packedSourceToPickupMarginBytes > 0);
  assert.ok(manifest.entityEffects.stagedEndExclusive <=
    manifest.broadsideRuntime.runAddress);
});
