import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { compileCapitalHulls, loadCapitalHullsDefinition } from "../scripts/capital-hulls.mjs";
import { compileEnemyRoster, loadEnemyRosterDefinition } from "../scripts/enemy-roster.mjs";
import { compileEntityEffects, loadEntityEffectsDefinition } from "../scripts/entity-effects.mjs";
import { compileFighterWeapons, loadFighterWeaponsDefinition } from "../scripts/fighter-weapons.mjs";
import { readGameGraphicsSource } from "../scripts/preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
const graphics = readGameGraphicsSource(source);
const capital = compileCapitalHulls(loadCapitalHullsDefinition(
  path.join(root, "assets/graphics/capital-hulls.json"),
));
const enemies = compileEnemyRoster(loadEnemyRosterDefinition(
  path.join(root, "assets/graphics/enemy-roster.json"),
), root);
const entities = compileEntityEffects(loadEntityEffectsDefinition(
  path.join(root, "assets/graphics/entity-effects.json"),
));
const weapons = compileFighterWeapons(loadFighterWeaponsDefinition(
  path.join(root, "assets/graphics/fighter-weapons.json"),
), enemies);
const interceptor = enemies.implemented.find(({ id }) => id === "INTERCEPTOR");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const streams = Object.freeze({
  debris: [entities.glyphs, "353e2250550066b1297067b9f31bdc4e40a9da247a7efca929c7aade932c9355"],
  player_fighterBody: [graphics.playerShape, "37c71b5a9665c6903a340bcb4ad6311ccb67816042f6adb17301c7815d5a56cd"],
  player_fighterEngine: [graphics.playerEngineShape, "26a5d7d4ba9160cf990bb447624e967ffbc25d0886033975f7d8ee1f32b8ad2b"],
  interceptorBody: [interceptor.bodyRows, "4e279527cc4ced23b1448dfb113f519d104face22c32ceebc02065b13eb027b7"],
  interceptorAccent: [interceptor.accentFrameBytes, "caa106f0badbe2daf954f467bf00ca4c293fb3a31da8a0b52dc80fba7be6d713"],
  // Re-pinned for hull set v1 (owner decision AA): H4.2's single allied/enemy
  // pair is replaced by allied B plus the level's enemy style, R1 resident.
  // The stream is still 248 bytes of data only.
  // Re-pinned again for hull set v2 (owner, 2026-09-22): the step-1 hardware
  // smoke rejected the v1 look, so every hull surface glyph is redrawn as full
  // mass with the texture cut into it. Same 248 bytes, same codes, new pixels.
  capitalGlyphs: [capital.glyphBytes, "73e03c0f2b4928780f1f412bd500584ac88d19debfb83900f95a84f007e14f6a"],
  fighterExplosionOuter: [weapons.sharedFighterExplosion.outerBytes, "92d51c739606133505205a5f43f984a6d81f6af59c8eb37d48727ec413e18dc9"],
  fighterExplosionCore: [weapons.sharedFighterExplosion.coreMasks, "61d520aa9d14c10342ec0c64c1066ea9f723ff07c3787130df59f3ccc7ecc888"],
});

test("production H4/H4.1/H4.2 graphic streams match the owner-approved raw bytes", () => {
  for (const [name, [bytes, expected]] of Object.entries(streams)) {
    assert.equal(sha256(bytes), expected, `${name} raw SHA-256 changed`);
  }
});

test("H4/H4.1/H4.2 remains a 460-byte data-only replacement with fixed ownership", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(streams).map(([name, [bytes]]) =>
    [name, bytes.length])), {
    debris: 64,
    player_fighterBody: 16,
    player_fighterEngine: 16,
    interceptorBody: 14,
    interceptorAccent: 48,
    capitalGlyphs: 248,
    fighterExplosionOuter: 48,
    fighterExplosionCore: 6,
  });
  assert.equal(Object.values(streams).reduce((sum, [bytes]) => sum + bytes.length, 0), 460);
  assert.equal(capital.definition.charsetBaseIndex, 59);
  assert.equal(capital.glyphs.length, 31);
  assert.equal(entities.glyphs.length, 8 * 8);
  assert.equal(weapons.sharedFighterExplosion.frameCount, 6);
  assert.equal(weapons.sharedFighterExplosion.frameDurationFrames, 4);
  assert.equal(interceptor.accentFrames.length, 3);
});
