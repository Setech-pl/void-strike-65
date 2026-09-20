import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  advancePlayerLifecycle,
  applyPlayerDamage,
  createBroadsideState,
  PLAYER_LIFECYCLE_STATES,
  SHARED_FIGHTER_EXPLOSION_TOTAL,
} from "../scripts/broadside.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "../scripts/capital-hulls.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const asset = compileCapitalHulls(loadCapitalHullsDefinition(
  path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
));

const CH_ZERO = 16;
const LIFE_OFFSET = 18;
const HULL_SEGMENTS_OFFSET = 25;
const CH_HULL_FULL = 5;
const CH_HULL_DAMAGED = 12;
const HULL_THRESHOLDS = [3, 5, 8, 10];

function hudStatusBytes(state) {
  assert.ok(Number.isInteger(state.lives) && state.lives >= 0 && state.lives <= 9);
  assert.ok(Number.isInteger(state.health) && state.health >= 0 && state.health <= 100);
  assert.equal(state.health % 10, 0, "runtime health units must convert exactly to percent");
  const bytes = new Map([[LIFE_OFFSET, CH_ZERO + state.lives]]);
  const healthUnits = state.health / 10;
  for (let segment = 0; segment < HULL_THRESHOLDS.length; segment += 1) {
    bytes.set(HULL_SEGMENTS_OFFSET + segment,
      healthUnits >= HULL_THRESHOLDS[segment] ? CH_HULL_FULL : CH_HULL_DAMAGED);
  }
  return bytes;
}

function statusText(state) {
  return `LIFE ${state.lives} HULL ${state.health}%`;
}

test("HUD template keeps full LIFE/HULL labels and four fixed hull plates", () => {
  assert.match(source, /hud_ascii:\s*\.byte "SCORE 00000  LIFE 3 HULL "/);
  assert.doesNotMatch(source, /hud_ascii:[\s\S]*?\.byte [^\n]*\b(?:ARM|FUEL)\b/);
  assert.match(source,
    /update_hud_status:[\s\S]+lda PLAYER_LIVES[\s\S]+sta SCREEN\+HUD_LIFE_DIGIT_OFFSET[\s\S]+lda BROAD_PLAYER_HEALTH/);
  assert.match(source,
    /apply_player_damage:[\s\S]+sta BROAD_PLAYER_HEALTH[\s\S]+dec PLAYER_LIVES[\s\S]+jmp update_hud_status/);
  assert.match(source,
    /respawn_player:[\s\S]+PLAYER_HEALTH_UNITS[\s\S]+sta BROAD_PLAYER_HEALTH[\s\S]+jsr update_hud_status/);
  assert.ok([LIFE_OFFSET, 25, 26, 27, 28]
    .every((offset) => offset >= 0 && offset < 40), "status bytes must remain in HUD row zero");
});

test("canonical damage and lifecycle drive LIFE 3→2 and HULL 100→0→100", () => {
  const state = createBroadsideState(asset);
  assert.equal(statusText(state), "LIFE 3 HULL 100%");
  assert.deepEqual([...hudStatusBytes(state)],
    [[18, 19], [25, 5], [26, 5], [27, 5], [28, 5]]);

  assert.equal(applyPlayerDamage(state, asset, 10, 25, 1), true,
    "ordinary enemy projectile damage must use the canonical gate");
  assert.equal(statusText(state), "LIFE 3 HULL 90%");
  assert.deepEqual([...hudStatusBytes(state)].slice(1).map(([, code]) => code), [5, 5, 5, 12]);
  state.damageCooldown = 0;
  assert.equal(applyPlayerDamage(state, asset, 20, 25, 2), true,
    "capital-shell/contact damage must use the same canonical gate");
  assert.equal(statusText(state), "LIFE 3 HULL 70%");
  assert.deepEqual([...hudStatusBytes(state)].slice(1).map(([, code]) => code), [5, 5, 12, 12]);

  state.health = 10;
  state.damageCooldown = 0;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 3), true);
  assert.equal(statusText(state), "LIFE 2 HULL 0%");
  assert.deepEqual([...hudStatusBytes(state)].slice(1).map(([, code]) => code), [12, 12, 12, 12]);
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);

  // Rebaselined 2026-09-17 (death-frame deferral): DYING lasts one frame longer
  // than the explosion, which begins on the first DYING tick.
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL; frame += 1) {
    assert.equal(advancePlayerLifecycle(state, asset), "dying");
    assert.equal(statusText(state), "LIFE 2 HULL 0%",
      "explosion frames cannot decrement life or restore hull");
  }
  assert.equal(advancePlayerLifecycle(state, asset), "respawn");
  assert.equal(statusText(state), "LIFE 2 HULL 100%");
  assert.equal(state.respawnInvulnerabilityTimer, 250);
});

test("final playable life reaches LIFE 0 / HULL 0 and the existing Game Over path", () => {
  const state = createBroadsideState(asset);
  state.lives = 1;
  state.health = 10;
  assert.equal(applyPlayerDamage(state, asset, 10, 25, 500), true);
  assert.equal(statusText(state), "LIFE 0 HULL 0%");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.DYING);
  // Rebaselined 2026-09-17 (death-frame deferral): DYING lasts one frame longer
  // than the explosion, which begins on the first DYING tick.
  for (let frame = 0; frame < SHARED_FIGHTER_EXPLOSION_TOTAL; frame += 1) {
    advancePlayerLifecycle(state, asset);
    assert.equal(state.lives, 0);
  }
  assert.equal(advancePlayerLifecycle(state, asset), "game-over");
  assert.equal(state.playerLifecycle, PLAYER_LIFECYCLE_STATES.GAME_OVER);
  assert.equal(state.lives, 0);
  assert.equal(state.health, 0);
});
