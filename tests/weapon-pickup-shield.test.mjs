import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileEntityEffects,
  loadEntityEffectsDefinition,
  renderEntityEffectsCa65Include,
} from "../scripts/entity-effects.mjs";
import {
  executeHudPresentationTrace,
  executeShieldBoosterTrace,
  executeSpreadShotTrace,
  executePlayerFighterBurstBalanceTrace,
  executeWeaponPickupLifecycleTrace,
} from "../scripts/weapon-pickup-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const entityPath = path.join(root, "assets", "graphics", "entity-effects.json");
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "dist", "void-strike-65-manifest.json"), "utf8"));
const shield = executeShieldBoosterTrace({ root, artifact: "atr", coldFill: 0xa5 });

function boundary(timer) {
  return shield.boundaries.find((sample) => sample.timer === timer);
}

test("Shield is generated as controller state 5, pickup type 2 and a 250-frame booster", () => {
  const entities = compileEntityEffects(loadEntityEffectsDefinition(entityPath));
  const include = renderEntityEffectsCa65Include(entities);
  assert.match(include, /WEAPON_PICKUP_STATE_SHIELD = 5/);
  assert.match(include, /WEAPON_PICKUP_TYPE_SHIELD = 2/);
  assert.match(include, /WEAPON_PICKUP_TYPE_COUNT = 3/);
  assert.equal(manifest.fighterWeapons.player_fighter.shieldDurationFrames, 250);
  assert.deepEqual([shield.activation.state, shield.activation.timer], [5, 250]);
});

test("Shield capsule uses only steel $84, white $0E and black selectors", () => {
  const entities = compileEntityEffects(loadEntityEffectsDefinition(entityPath));
  assert.deepEqual(entities.weaponPickupShield.palette, {
    outlineRegister: "COLPF1", outlineValue: 0x84,
    fillRegister: "COLPF0", fillValue: 0x0e,
    symbolRegister: "COLBK", symbolValue: 0,
  });
  const selectors = [...entities.shieldPickupGlyphs].flatMap((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3));
  assert.deepEqual([...new Set(selectors)].sort(), [0, 1, 2]);
});

// RETIRED 2026-10-01 (recorded failures review, action B1; owner-approved): "dynamic glyph
// ownership is explicit and all capsule transitions restore backing". It
// checked the shared dynamic glyph bank the three capsule types composed into
// the charset, and the backing each transition restored. The capsule is a
// PLAYER3 image since f6eee5c (docs/plans/pickup-colour.md): no glyph bank is
// shared at runtime (manifest dynamicPickupGlyphBankShared is false) and no
// backing exists.

test("pickup rotation is exactly Rapid Spread Shield Rapid without RNG", () => {
  const trace = executeSpreadShotTrace({ root, artifact: "atr" });
  assert.deepEqual(trace.drops.map(({ pickupType, nextPickupType, renderId }) =>
    [pickupType, nextPickupType, renderId]), [
    // RE-PINNED 2026-10-01 (recorded failures review, D1): the render id column is 0 - a PMG
    // capsule has no glyph base (it was 120 / 248 / 120). The rotation is the
    // subject and is unchanged.
    [0, 1, 0], [1, 2, 0], [2, 0, 0],
  ]);
  const rotation = source.slice(source.indexOf("weapon_pickup_record_qualified_kill:"),
    source.indexOf('.segment "STARFIELD"', source.indexOf("weapon_pickup_record_qualified_kill:")));
  assert.doesNotMatch(rotation, /rng|RNG|random/);
});

test("Shield lasts exactly 250 active ticks and restores HUD and PlayerFighter colours on expiry", () => {
  assert.equal(boundary(1).tick, 249);
  assert.deepEqual([boundary(1).state, boundary(0).tick, boundary(0).state], [5, 250, 0]);
  assert.deepEqual(shield.expiry.hudRegion, shield.backing);
  assert.deepEqual([shield.expiry.colpm0, shield.expiry.colpm3], [0x0e, 0x28]);
});

test("pause freezes timer, HUD and Shield pulse phase", () => {
  assert.equal(shield.paused.length, 16);
  assert.equal(shield.paused.every((sample) => sample.timer === 250), true);
  assert.equal(shield.paused.every((sample) =>
    sample.colpm0 === shield.activation.colpm0 && sample.colpm3 === shield.activation.colpm3), true);
  assert.equal(shield.paused.every((sample) =>
    JSON.stringify(sample.hudRegion) === JSON.stringify(shield.activation.hudRegion)), true);
});

test("sector transition preserves Shield while lifecycle teardown clears it", () => {
  assert.deepEqual([shield.sector.state, shield.sector.timer], [5, 250]);
  const lifecycle = executeWeaponPickupLifecycleTrace({ root, artifact: "atr" });
  assert.deepEqual([lifecycle.newGameShield.state, lifecycle.lifeLossShield.state,
    lifecycle.gameOverShield.state], [0, 0, 0]);
  assert.deepEqual([lifecycle.sectorShield.state, lifecycle.sectorShield.timer], [5, 250]);
});

test("replacement and reload use the correct duration and restore colours", () => {
  assert.deepEqual(shield.replacements.map(({ state, timer }) => [state, timer]), [
    [3, 500], [5, 250], [5, 250], [4, 500], [5, 250], [3, 500],
  ]);
  const { cycles: _cycles, ...lastReplacement } = shield.replacements.at(-1);
  assert.deepEqual(lastReplacement, {
    name: "rapid-replaces-shield", state: 3, timer: 500, colpm0: 0x0e, colpm3: 0x28,
  });
});

test("Shield damage gate preserves HULL LIFE SCORE cooldown flash and SFX path", () => {
  for (const sample of [shield.damage.ordinary, shield.damage.heavy,
    shield.damage.duringCooldown]) {
    assert.deepEqual([sample.health, sample.lives, sample.score, sample.applied,
      sample.damageTimer], [10, 3, 0x0145, 1, 0]);
  }
  assert.equal(shield.damage.ordinary.cooldown, 0);
  assert.equal(shield.damage.duringCooldown.cooldown, 17);
});

test("only one Shield absorption is accepted per frame", () => {
  assert.deepEqual([shield.damage.secondEvent.health, shield.damage.secondEvent.applied,
    shield.damage.secondEvent.cooldown], [10, 1, 0]);
});

test("respawn invulnerability remains a separate lifecycle gate", () => {
  assert.deepEqual([shield.damage.respawn.health, shield.damage.respawn.applied,
    shield.damage.respawn.cooldown], [10, 0, 0]);
  assert.match(source, /cmp #PLAYER_ALIVE\s+bne @done[\s\S]+cmp #WEAPON_PICKUP_STATE_SHIELD[\s\S]+@ordinary_damage:\s+lda BROAD_DAMAGE_COOLDOWN/);
});

test("same-frame Shield collection protects later debris and consumes it", () => {
  assert.deepEqual(shield.sameFrame, {
    state: 5, timer: 250, health: 10, debrisActive: 0, damageApplied: 1,
  });
});

test("frame ordering keeps earlier collisions before pickup activation", () => {
  assert.match(source, /jsr handle_collisions[\s\S]+jsr entity_effects_update/);
  // RE-PINNED 2026-10-01 (recorded failures review, A29): the order is unchanged - booster,
  // then pickup, then the debris/player collision - but the pickup step is
  // update_fighter_pickup_pmg and the debris update ends in
  // `jmp entity_collide_player` (src/main.s entity_effects_update).
  assert.match(source, /jsr update_weapon_booster_active\s+@pickup:\s+jsr update_fighter_pickup_pmg[\s\S]+jmp entity_collide_player\b/);
});

test("collision callers retain their consume and impact contracts", () => {
  assert.deepEqual(shield.damage.interceptorProjectile, { active: 0, health: 10, applied: 1 });
  assert.deepEqual(shield.damage.broadsideImpact, { state: 3, health: 10, applied: 1 });
  assert.match(source, /interceptor_projectile_hits_player[\s\S]+lda #FIGHTER_PROJECTILE_FREE[\s\S]+jsr apply_player_damage/);
  assert.match(source, /begin_broadside_impact[\s\S]+apply_broadside_player_damage/);
  assert.match(source, /jsr apply_player_damage\s+lda BROAD_DAMAGE_APPLIED\s+beq entity_collision_miss[\s\S]+jmp debris_contact_destroyed/);
  // (RE-PINNED 2026-10-01 (recorded failures review, D7: the contact path ends in
  // debris_contact_destroyed since the debris contact score, 2026-09-18; it was
  // integration_debris_release.)
  assert.match(source,
    /jsr player_contacts_enemy[\s\S]+jsr queue_enemy_damage\s+lda #PLAYER_HEALTH_UNITS\s+jsr apply_player_damage/);
  assert.match(source, /@clamp:[\s\S]+sta player_x[\s\S]+jmp apply_broadside_player_damage/);
});

test("Shield HUD uses exact 188 126 63 thresholds and a continuous distinct glyph", () => {
  assert.deepEqual(boundary(188).hudSegments, [8, 8, 8, 8]);
  assert.deepEqual(boundary(187).hudSegments, [8, 8, 8, 0]);
  assert.deepEqual(boundary(126).hudSegments, [8, 8, 8, 0]);
  assert.deepEqual(boundary(125).hudSegments, [8, 8, 0, 0]);
  assert.deepEqual(boundary(63).hudSegments, [8, 8, 0, 0]);
  assert.deepEqual(boundary(62).hudSegments, [8, 0, 0, 0]);
  assert.deepEqual(shield.shieldGlyph, [0xc3, 0xdb, 0xff, 0xdb, 0xdb, 0xff, 0xc3, 0xff]);
});

test("critical Shield segment has both 8-frame blink phases", () => {
  assert.deepEqual(boundary(55).hudSegments, [0, 0, 0, 0]);
  assert.deepEqual(boundary(47).hudSegments, [8, 0, 0, 0]);
  assert.deepEqual(boundary(39).hudSegments, [0, 0, 0, 0]);
});

test("HUD code 8 is formally isolated from generated screens and other HUD symbols", () => {
  assert.match(source, /CH_HUD_BOOSTER_SHIELD = 8/);
  assert.match(source, /CH_HUD_BOOSTER_SHIELD\+1 = CH_SEPARATOR/);
  const staticScreenSources = [
    "assets/graphics/loader-bitmap.json", "assets/graphics/capital-hulls.json",
  ].map((name) => fs.readFileSync(path.join(root, name), "utf8"));
  assert.equal(staticScreenSources.some((text) => /CH_HUD_BOOSTER_SHIELD/.test(text)), false);
  const ordinaryHud = executeHudPresentationTrace({ root, artifact: "atr" });
  assert.equal(ordinaryHud.frames.every(({ display }) =>
    !display.slice(0, 40).includes(8)), true);
  const references = source.split("\n").filter((line) => line.includes("CH_HUD_BOOSTER_SHIELD"));
  assert.equal(references.every((line) =>
    /^(CH_HUD_BOOSTER_SHIELD|\.assert|\s*(lda|sta)|\s*\.export)/.test(line)), true);
});

test("Shield keeps the normal burst cadence while Rapid and Spread remain unchanged", () => {
  const balance = executePlayerFighterBurstBalanceTrace({ root, artifact: "atr", windowFrames: 64 });
  const byMode = Object.fromEntries(balance.traces.map((trace) => [trace.mode, trace]));
  assert.deepEqual([byMode.NORMAL.firstBurstProjectiles, byMode.SHIELD.firstBurstProjectiles,
    // RE-PINNED 2026-10-01 (recorded failures review, A30): bursts are 4 / 4 / 5 PairShots
    // (assets/graphics/fighter-weapons.json); they were 8 / 8 / 10 shots.
    byMode.RAPID.firstBurstProjectiles], [4, 4, 5]);
  assert.deepEqual([manifest.fighterWeapons.player_fighter.spreadShotProjectileCount,
    manifest.fighterWeapons.player_fighter.spreadShotCooldownFrames], [3, 28]);
  assert.deepEqual(byMode.SHIELD.records.filter(({ allocatedProjectiles }) =>
    allocatedProjectiles > 0).map(({ frame }) => frame),
  byMode.NORMAL.records.filter(({ allocatedProjectiles }) =>
    allocatedProjectiles > 0).map(({ frame }) => frame));
});

// RE-POINTED 2026-09-28 (owner decision, docs/plans/pickup-colour.md §7 item
// 8): the pulse writes COLPM0 only. Its COLPM3 flip reached no pixel of the
// ship -- every P3 plume bit lay under a P0 hull bit (§1.4) -- and COLPM3 is
// the pickup capsule's register now, so keeping the flip would have blinked a
// booster mark in time with the shield. The two COLPM3 halves below are
// therefore replaced by the stronger statement that the shield does not touch
// that register at all, in either direction. The HPOSP0/HPOSP3 pair went with
// the ship's P3 image for the same reason; the ship is one PLAYER0 object, and
// tests/pickup-boost-colour.test.mjs owns that fact.
test("Shield pulse is solid at all positions and never aliases respawn disappearance", () => {
  assert.equal(shield.activation.colpm0, 0x84);
  assert.equal(boundary(55).colpm0, 0x0e);
  const shieldColourRoutines = source.slice(
    source.indexOf("restore_player_fighter_normal_colors:"),
    source.indexOf("entity_debris_glyph:"));
  assert.doesNotMatch(shieldColourRoutines, /COLPM3/,
    "the capsule owns COLPM3; a shield write there would pulse the booster mark");
  // Unchanged: whatever the pulse does, it cannot be the register that holds
  // the capsule, and it stays out of the ship's image and lifecycle entirely.
  assert.equal(shield.activation.colpm3, boundary(55).colpm3,
    "COLPM3 must read the same at both pulse phases, because neither writes it");
  assert.doesNotMatch(source.slice(source.indexOf("update_shield_player_fighter_colors:"),
    source.indexOf("entity_debris_glyph:")), /GRAFP|HPOSP|PLAYER_LIFECYCLE/);
});

