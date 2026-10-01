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
  compileFighterWeapons,
  loadFighterWeaponsDefinition,
} from "../scripts/fighter-weapons.mjs";
import { compileEnemyRoster, loadEnemyRosterDefinition } from "../scripts/enemy-roster.mjs";
import {
  executeSpreadShotCollisionTrace,
  executeSpreadShotCooldownSafetyTrace,
  executeSpreadShotHullArtifactTrace,
  executeSpreadShotMotionTrace,
  executeSpreadShotOverlapTrace,
  executeSpreadShotPoolTrace,
  executeSpreadShotTrace,
  executeSpreadShotVolleyTrace,
  executePlayerFighterBurstBalanceTrace,
  executeWeaponBoosterReplacementTrace,
  executeWeaponPickupLifecycleTrace,
} from "../scripts/weapon-pickup-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const entityPath = path.join(root, "assets", "graphics", "entity-effects.json");
const weaponPath = path.join(root, "assets", "graphics", "fighter-weapons.json");
const rosterPath = path.join(root, "assets", "graphics", "enemy-roster.json");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));

function assets() {
  const entities = compileEntityEffects(loadEntityEffectsDefinition(entityPath));
  const roster = compileEnemyRoster(loadEnemyRosterDefinition(rosterPath));
  return {
    entities,
    weapons: compileFighterWeapons(loadFighterWeaponsDefinition(weaponPath), roster),
  };
}

test("Spread Shot owns one phased red fan in the shared six-glyph bank", () => {
  const { entities } = assets();
  assert.deepEqual(entities.weaponPickupSpreadShot, {
    glyphs: [
      [191, 255, 204, 204, 240, 243, 252, 252],
      [254, 255, 51, 51, 15, 207, 63, 63],
      [252, 252, 252, 252, 252, 255, 255, 191],
      [63, 63, 63, 63, 63, 255, 255, 254],
    ],
    palette: {
      outlineRegister: "COLPF1", outlineValue: 0x84,
      casingRegister: "COLPF3", casingValue: 0x46,
      symbolRegister: "COLBK", symbolValue: 0,
    },
  });
  assert.deepEqual([
    manifest.entityEffects.spreadPickupGlyphIndex,
    manifest.entityEffects.spreadPickupGlyphCount,
    manifest.entityEffects.glyphIndex + manifest.entityEffects.glyphCount,
  ], [120, 4, 126]);
  const selectors = [...entities.spreadPickupGlyphs].flatMap((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3));
  assert.deepEqual([...new Set(selectors)].sort(), [0, 2, 3]);
  assert.equal(selectors.includes(1), false, "capsule must not use a white text selector");
  assert.ok(selectors.filter((selector) => selector === 0).length >= 16,
    "the fan must be cut through the casing as black/transparent space");
  assert.ok(selectors.filter((selector) => selector === 3).length >= 80,
    "the capsule must remain a large dense red silhouette");
  const include = renderEntityEffectsCa65Include(entities);
  assert.match(include, /WEAPON_PICKUP_SPREAD_GLYPH_COUNT = 4/);
  assert.match(include, /WEAPON_PICKUP_TYPE_SPREAD = 1/);
  // REWRITTEN 2026-10-01 (recorded failures review, B1; owner-approved): the last assertion
  // read the character compositor (render_weapon_pickup_overlay calling
  // compose_weapon_pickup_phase), retired at f6eee5c. The glyphs above are the
  // source art; at runtime the Spread capsule is the second sixteen-row
  // silhouette of the PLAYER3 shape table.
  assert.doesNotMatch(source, /compose_weapon_pickup_phase|render_weapon_pickup_overlay/);
  assert.match(source,
    /fighter_pickup_pmg_shape:[\s\S]+; SPREAD[\s\S]+\.byte \$FF,\$FF,\$A5,\$A5,\$C3,\$DB,\$E7,\$E7/);
});

test("the release ATR executes the deterministic Rapid Spread Shield drop cycle", () => {
  const atr = executeSpreadShotTrace({ root, artifact: "atr" });
  const cycle = (trace) => trace.drops.map((drop) => [
    drop.pickupType, drop.nextPickupType, drop.renderId, drop.state,
  ]);
  // RE-PINNED 2026-10-01 (recorded failures review, D1): the render id column is 0 for a PMG
  // capsule; it was 120 / 248 / 120.
  assert.deepEqual(cycle(atr), [[0, 1, 0, 1], [1, 2, 0, 1], [2, 0, 0, 1]]);
  assert.equal(atr.drops[1].boosterState, 3,
    "Spread capsule must be earned naturally while Rapid Fire is still active");
  assert.equal(atr.spreadCapsuleFrames.every(({ capsuleState, boosterState }) =>
    capsuleState === 2 && boosterState === 3), true,
  "visible Spread capsule must coexist with the non-rendered Rapid controller");
  assert.deepEqual([
    atr.spreadPickup.capsuleState, atr.spreadPickup.boosterState, atr.spreadPickup.timer,
  ], [0, 4, 500], "collecting Spread must naturally replace Rapid at full duration");
  assert.equal(atr.killRecords.length, 9);
  assert.equal(atr.killRecords.every(({ damageSource, projectileConsumed }) =>
    damageSource === 0 && projectileConsumed), true);
  assert.deepEqual(atr.killRecords.map(({ scoreLo }) => scoreLo),
    [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90]);
});

// RETIRED 2026-10-01 (recorded failures review, action B4 and B1; owner-approved):
//   * the todo test "both capsule types spawn and Spread moves through every A2
//     step without ghosts" (it waited for "Spread leaves a second capsule
//     trail");
//   * "Spread four-cell reverse erase restores byte-exact backing at every A2
//     head".
// Both tested the character capsule: its glyph codes, its second-position
// trail and the backing of its four cells. The capsule is one PLAYER3 image
// since f6eee5c, so the trail the todo waited on cannot occur and there is no
// backing. tests/pickup-pmg-raster-visibility.test.mjs covers the PMG capsule.

test("Spread collection lasts exactly 500 active PAL frames and pause freezes it", () => {
  const trace = executeSpreadShotTrace({ root, artifact: "atr" });
  assert.deepEqual([
    trace.spreadPickup.state, trace.spreadPickup.timer, trace.spreadPickup.hudCodes,
  ], [4, 500, [7, 7, 7, 7]]);
  assert.equal(trace.spreadTimerFrames.length, 500);
  assert.deepEqual(trace.spreadTimerFrames.map(({ timer }) => timer),
    Array.from({ length: 500 }, (_, index) => 499 - index));
  assert.equal(trace.frozenTimer, 449);
  assert.equal(trace.pauseFrames.length, 10);
  assert.equal(trace.pauseFrames.every(({ timer, hudCodes }) =>
    timer === 449 && hudCodes.join() === "7,7,7,7"), true);
  assert.deepEqual(trace.spreadTimerFrames[449].hudCodes, [0, 0, 0, 0]);
  assert.deepEqual([
    trace.spreadExpired.state, trace.spreadExpired.timer, trace.spreadExpired.hudCodes,
  ], [0, 0, [0, 0, 0, 0]]);
});

test("Rapid and Spread replace or refresh one another without combining cadence", () => {
  const trace = executeWeaponBoosterReplacementTrace({ root, artifact: "atr" });
  assert.deepEqual([
    trace.rapid.state, trace.rapid.timer, trace.rapid.hudCodes,
  ], [3, 500, [7, 7, 7, 7]]);
  assert.deepEqual([
    trace.spreadReplacesRapid.state, trace.spreadReplacesRapid.timer,
    trace.spreadReplacesRapid.hudCodes,
  ], [4, 500, [7, 7, 7, 7]]);
  assert.deepEqual([
    trace.spreadRefresh.state, trace.spreadRefresh.timer,
    trace.rapidReplacesSpread.state, trace.rapidReplacesSpread.timer,
  ], [4, 500, 3, 500]);
  assert.match(source,
    /player_fighter_fire_intervals:[\s\S]+PLAYER_FIGHTER_RAPID_FIRE_INTERVAL,PLAYER_FIGHTER_SPREAD_COOLDOWN/);
  const cadence = source.slice(source.indexOf("update_player_fighter_weapon:"),
    source.indexOf("allocate_player_fighter_projectile:"));
  assert.match(cadence,
    /ldy ENTITY_STATE\+WEAPON_BOOSTER_SLOT[\s\S]+lda player_fighter_fire_intervals,y/);
});

test("one Spread emission is an unambiguous three-projectile fan", () => {
  const { weapons } = assets();
  assert.deepEqual([
    weapons.player_fighter.spreadShotDurationFrames,
    weapons.player_fighter.spreadShotProjectileCount,
    weapons.player_fighter.spreadShotInitialOffsetHpos,
    weapons.player_fighter.spreadShotLateralStepHpos,
    weapons.player_fighter.spreadShotLateralPeriodFrames,
    weapons.player_fighter.spreadShotCooldownFrames,
  ], [500, 3, 4, 1, 2, 28]);
  // Re-pinned 2026-09-30 (docs/plans/spread-volley-fix.md §5). The volley used
  // to be read off executeSpreadShotTrace's drop cycle, which no longer reaches
  // Spread because Interceptor kills stopped counting toward the capsule (the
  // recorded failures at :82 and :149): a stale scenario, so it moves to a
  // focused volley. The slot order is the build's since db64ca8 - left, right,
  // centre, lowest free slot first (src/main.s player_fighter_spread_volley_sides
  // and allocate_player_fighter_spread_projectiles); it was centre, left, right.
  const frames = executeSpreadShotVolleyTrace({ root, artifact: "atr" }).trajectoryFrames;
  assert.deepEqual(frames[0].slots.slice(0, 3).map(({ active, x, y }) => [active, x, y]), [
    [0x41, 128, 223], [0x21, 136, 223], [0x11, 132, 223],
  ]);
  for (let frame = 1; frame < frames.length; frame += 1) {
    assert.deepEqual(frames[frame].slots.slice(0, 3).map(({ active, x, y }) =>
      [active, x, y]), [
      [0x41, 128 - Math.ceil(frame / 2), 223 - frame * 6],
      [0x21, 136 + Math.ceil(frame / 2), 223 - frame * 6],
      [0x11, 132, 223 - frame * 6],
    ]);
    assert.equal(new Set(frames[frame].slots.slice(0, 3)
      .map(({ screenAddress }) => screenAddress)).size, 3,
    `frame ${frame} must publish exactly three distinct projectile positions`);
    assert.equal(frames[frame].slots.slice(0, 3)
      .every(({ active, rendered }) => rendered === active || rendered === 0xff), true);
    assert.equal(frames[frame].slots.slice(0, 3).every(({ active }) => active < 0x80), true,
      "every Spread projectile must select the PlayerFighter's yellow COLPF2 bank");
  }
});

test("all three yellow projectiles preserve both capital hulls at sections, A2 heads and wrap", () => {
  const sectionPhases = [32, 128, 224]; // engines, combat midship, broad prow
  for (const faction of ["allied", "hostile"]) {
    for (const topPhase of sectionPhases) {
      for (const selectedSlot of [0, 1, 2]) {
        const atr = executeSpreadShotHullArtifactTrace({
          root, artifact: "atr", faction, topPhase, head: 21, selectedSlot, frames: 12,
        });
        assert.equal(atr.records.some(({ backingCode }) => backingCode !== 0), true,
          `${faction} phase ${topPhase} slot ${selectedSlot} missed the hull`);
        for (const record of atr.records) {
          assert.equal(record.restoreMismatches, 0,
            `${faction} phase ${topPhase} slot ${selectedSlot} left a screen scar`);
          assert.equal(record.backingPixelsPreserved, true,
            `${faction} phase ${topPhase} slot ${selectedSlot} punched a hull hole`);
          assert.equal(record.inverse, 0, "a Spread projectile selected the Hostile colour bank");
          assert.equal(record.changedOffsets.every((offset) => offset >= 80), true,
            "projectile overlay changed the protected HUD/divider rows");
        }
      }
    }
  }

  for (let head = 0; head < 22; head += 1) {
    for (const faction of ["allied", "hostile"]) {
      for (const selectedSlot of [0, 1, 2]) {
        const trace = executeSpreadShotHullArtifactTrace({
          root, artifact: "atr", faction, topPhase: 128, head, selectedSlot, frames: 4,
        });
        assert.equal(trace.records.every(({ restoreMismatches, backingPixelsPreserved }) =>
          restoreMismatches === 0 && backingPixelsPreserved), true,
        `${faction} slot ${selectedSlot} failed at A2 head ${head}`);
        const changedCharsetOffsets = trace.finalCharset
          .map((byte, offset) => byte === trace.initialCharset[offset] ? -1 : offset)
          .filter((offset) => offset >= 0);
        assert.equal(changedCharsetOffsets.every((offset) =>
          offset >= 47 * 8 && offset < 57 * 8), true,
        `A2 head ${head} changed charset bytes outside slot-owned scratch glyphs`);
      }
    }
  }

  for (const [faction, selectedSlot] of [["allied", 0], ["hostile", 1]]) {
    for (const topPhase of [31, 32, 55, 56, 183, 184, 207, 208, 239, 240]) {
      const trace = executeSpreadShotHullArtifactTrace({
        root, artifact: "atr", faction, topPhase, head: 21, selectedSlot, frames: 12,
      });
      assert.equal(trace.records.every(({ restoreMismatches, backingPixelsPreserved }) =>
        restoreMismatches === 0 && backingPixelsPreserved), true,
      `${faction} boundary phase ${topPhase} corrupted a module edge`);
    }
  }
});

test("overlapping Spread shots compose without erasing the remaining shot or Hostile hull", () => {
  const atr = executeSpreadShotOverlapTrace({ root, artifact: "atr", head: 21 });
  assert.ok(atr.reference[atr.displayOffset] & 0x80, "fixture must use a red Hostile hull cell");
  assert.deepEqual([atr.bothCode, atr.oneCode], [48, 48]);
  assert.notDeepEqual(atr.bothGlyph, atr.oneGlyph,
    "two shots in one cell must retain both masks until one leaves");
  assert.deepEqual(atr.afterBothErase, atr.reference);
  assert.deepEqual(atr.afterFinalErase, atr.reference);
  for (const glyph of [atr.bothGlyph, atr.oneGlyph]) {
    assert.equal(glyph.every((byte, row) => [6, 4, 2, 0].every((shift) =>
      ((atr.initialCharset[(atr.reference[atr.displayOffset] & 0x7f) * 8 + row] >> shift) & 3) === 0 ||
      ((byte >> shift) & 3) !== 0)), true, "overlap punched an empty vertical line");
  }
});

// REWRITTEN 2026-10-01 (recorded failures review, B4 and D2; owner-approved). This was a todo
// test waiting for "final Spread projectile glyph remains". That defect does
// not reproduce: the fixture never clears the ring, so the screen held
// boot-staging bytes in the shot-glyph range before the volley fired, and the
// test read them as leftover shots. It also expected the charset to hold a
// capsule phase, which the PMG capsule (f6eee5c) never writes. The test now
// compares the screen with the screen just before the volley: three shots
// fly, all three leave, and nothing they drew remains.
test("all three projectiles leave the screen cleanly without HUD or charset corruption", () => {
  const trace = executeSpreadShotTrace({ root, artifact: "atr" });
  const volley = trace.trajectoryFrames[0].slots.filter(({ active }) => active !== 0);
  assert.deepEqual(volley.map(({ active }) => active & 0x70).sort(), [0x10, 0x20, 0x40],
    "the volley is the full left/centre/right fan");
  assert.equal(trace.trajectoryFrames.slice(1).some((frame) =>
    Buffer.compare(Buffer.from(frame.screen), Buffer.from(trace.spreadPickup.screen)) !== 0),
  true, "the shots are drawn on the playfield while they fly");
  assert.equal(trace.projectilesAfterCleanup.slots.every(({ active, rendered }) =>
    active === 0 && rendered === 0), true);
  // Every cell is back to what it held before the volley. The one documented
  // exception is the dynamic near-star point (screen code 1, STAR_NEAR_POINT):
  // a shot that captured one restores space, on purpose, because the star is
  // republished by its own overlay (src/main.s, the PairShot backing
  // resolvers). The fixture's uncleared ring happens to hold that code.
  const STAR_NEAR_POINT = 1;
  const before = trace.spreadPickup.screen;
  const unrestored = Array.from(trace.projectilesAfterCleanup.screen)
    .map((code, index) => [index, before[index], code])
    .filter(([, was, is]) => was !== is && !(was === STAR_NEAR_POINT && is === 0));
  assert.deepEqual(unrestored, [],
    "reverse erase must remove every projectile glyph and restore every cell");
  // The shots may redraw only their slot-owned composite glyphs
  // (PLAYER_FIGHTER_COMPOSITE_GLYPH_BASE = 11 + 36, one per player slot); the
  // PMG capsule draws nothing into the charset.
  const compositeStart = (11 + 36) * 8;
  const compositeEnd = compositeStart + trace.manifest.fighterWeapons.player_fighter.poolSlots * 8;
  assert.deepEqual(trace.charset.subarray(0, compositeStart),
    trace.initialCharset.subarray(0, compositeStart));
  assert.deepEqual(trace.charset.subarray(compositeEnd),
    trace.initialCharset.subarray(compositeEnd),
    "the only charset mutation is the shots' own composite glyphs");
  const hudBefore = trace.spreadPickup.display.subarray(0, 40);
  for (const frame of trace.spreadTimerFrames.slice(0, 51)) {
    const changed = Array.from({ length: 40 }, (_, offset) => offset)
      .filter((offset) => frame.display[offset] !== hudBefore[offset]);
    assert.equal(changed.every((offset) => offset >= 32 && offset <= 35), true,
      `PAL frame ${frame.frame} changed a protected HUD cell`);
  }
});

// Renamed and re-pinned 2026-09-30 (docs/plans/spread-volley-fix.md §5); it was
// "Spread respects the six-projectile active budget and admits centre before an
// atomic side pair". The harness called the allocator with BURST_REMAINING = 0,
// so since db64ca8 it exercised only the centre follow-up and never the volley.
// The pool and active limit are the build's 5 and 5
// (assets/graphics/fighter-weapons.json -> PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT
// and _ACTIVE_LIMIT), where 10 and 6 were pinned. "Centre before an atomic side
// pair" is replaced by the owner decision of 2026-09-30: the volley is admitted
// whole or not at all, and one free slot still suffices for the centre follow-up.
test("Spread respects the five-projectile active budget and admits its volley whole or not at all", () => {
  const trace = executeSpreadShotPoolTrace({ root, artifact: "atr" });
  assert.deepEqual([
    manifest.fighterWeapons.player_fighter.poolSlots,
    manifest.fighterWeapons.player_fighter.activeLimit,
    trace.empty.activeCount,
    trace.volleyFitsExactly.activeCount,
  ], [5, 5, 3, 5]);
  assert.deepEqual(trace.empty.after.slice(0, 3), [0x41, 0x21, 0x11]);
  assert.deepEqual(trace.volleyFitsExactly.after.slice(2, 5), [0x41, 0x21, 0x11]);
  assert.deepEqual(trace.twoFree.after, trace.twoFree.before,
    "two free slots must admit no part of the volley, not one unpaired side");
  assert.deepEqual(trace.oneFree.after, trace.oneFree.before,
    "one free slot must not admit a partial volley");
  assert.deepEqual(trace.followUpOneFree.after.slice(4, 5), [0x11],
    "one free slot must remain sufficient for the centre follow-up");
  assert.deepEqual(trace.followUpActiveFull.after, trace.followUpActiveFull.before);
  assert.deepEqual(trace.activeFull.after, trace.activeFull.before);
  assert.deepEqual(trace.physicalFull.after, trace.physicalFull.before);
  const controller = executePlayerFighterBurstBalanceTrace({
    root, artifact: "atr", windowFrames: 500,
  })
    .traces.find(({ mode }) => mode === "SPREAD");
  // A burst is the volley and the centre follow-up (spreadShotBurstCount 2):
  // two fire events, four logical PairShots. 8 salvos / 24 were the retired
  // eight-fan burst.
  assert.equal(controller.firstBurstSalvos, 2);
  assert.equal(controller.firstBurstProjectiles, 4);
  const kinds = (record) => record.allocatedSlots
    .map((slot) => record.slots[slot].active & 0x70).sort().join();
  assert.equal(controller.records.every((record) => record.allocatedProjectiles === 0 ||
    kinds(record) === "16,32,64" || kinds(record) === "16"), true,
  "a Spread controller update must never allocate a partial fan");
  const rejected = controller.records.filter(({ allocationDue, allocatedProjectiles }) =>
    allocationDue && allocatedProjectiles === 0);
  assert.equal(rejected.length, 0,
    "a blocked Spread salvo must remain one deferred salvo, not accumulated catch-up");
  // Volley 3 + follow-up 1; 13 volleys and 12 follow-ups fit in 500 frames at
  // one burst per 28 + 12 frames. 6 / 19 / 57 were the retired three-per-event
  // schedule on a six-slot limit.
  assert.equal(controller.maximumPoolOccupancy, 4);
  assert.equal(controller.emittedSalvos, 25);
  assert.equal(controller.emittedProjectiles, 51);
  assert.equal(manifest.fighterWeapons.player_fighter.poolSlots, 5);
  assert.equal(manifest.entityEffects.effectActiveLimit, 5);
});

// Re-pinned 2026-09-30 (docs/plans/spread-volley-fix.md §5). The harness fired
// one three-shot fan every `cooldown` frames, the contract before db64ca8; it
// now holds fire through the real controller (volley, 28 frames, centre
// follow-up, 12-frame pause) with the Spread interval overridden for the fast
// case. The configured cadence peaks at the volley plus its follow-up, 4 of the
// 5 active slots; 6 was the retired six-slot limit and 18 salvos of 3 the
// retired schedule.
test("the configured 28-frame Spread cooldown avoids catch-up at the active limit", () => {
  const trace = executeSpreadShotCooldownSafetyTrace({ root, artifact: "atr" });
  assert.equal(trace.tooFast.cooldown, 17);
  assert.ok(trace.tooFast.rejectedFullSalvos > 0,
    "a deliberately faster schedule must demonstrate saturation");
  assert.equal(trace.tooFast.fullSalvos, trace.tooFast.salvos,
    "a saturated schedule must defer its volley whole, never emit part of it");
  assert.equal(trace.tooFast.maximumPoolOccupancy, 4);
  assert.deepEqual(trace.configured, {
    cooldown: 28,
    allocationSizes: [...Array(12).fill([3, 1]).flat(), 3],
    salvos: 25,
    fullSalvos: 25,
    rejectedFullSalvos: 0,
    maximumPoolOccupancy: 4,
  });
});

test("Spread fixed phase is symmetric after 100 updates and both side bounds despawn", () => {
  const trace = executeSpreadShotMotionTrace({ root, artifact: "atr" });
  // RE-PINNED 2026-10-01 (recorded failures review, D2): the harness now fires the volley, and
  // the volley allocates its side shots first: the slots are left, right,
  // centre. They were pinned centre, left, right. The symmetry and drift
  // assertions are the same ones, re-indexed.
  assert.deepEqual(trace.initial, [128, 136, 132]);
  assert.deepEqual(trace.after100, [78, 186, 132]);
  assert.deepEqual(trace.activeAfter100, [0x41, 0x21, 0x11]);
  assert.equal(trace.initial[2], trace.after100[2], "centre projectile drifted");
  assert.equal(trace.initial[0] - trace.after100[0],
    trace.after100[1] - trace.initial[1]);
  assert.equal(trace.leftBoundary.active, 0);
  assert.equal(trace.rightBoundary.active, 0);
});

test("all three directions collide with debris and Interceptor scoring resolves only once", () => {
  const trace = executeSpreadShotCollisionTrace({ root, artifact: "atr" });
  assert.deepEqual(trace.debris.map(({ direction, projectileConsumed, debrisHp, score }) =>
    [direction, projectileConsumed, debrisHp, score]), [
    // RE-PINNED 2026-10-01 (recorded failures review, D2): slot order left, right, centre.
    [0x40, true, 2, 0], [0x20, true, 2, 0], [0, true, 2, 0],
  ]);
  assert.deepEqual(trace.interceptor, {
    pendingDamage: 3,
    consumed: [0, 0, 0],
    enemyState: 2,
    scoreAfterFirstResolve: 0x10,
    scoreAfterSecondResolve: 0x10,
  });
});

test("Spread follows Rapid lifecycle semantics for life, New Game, Game Over and sector", () => {
  const lifecycle = executeWeaponPickupLifecycleTrace({ root, artifact: "atr" });
  for (const record of [
    lifecycle.newGameSpread, lifecycle.lifeLossSpread, lifecycle.gameOverSpread,
  ]) {
    assert.equal(record.state, 0);
    assert.deepEqual(record.hudCodes, [0, 0, 0, 0]);
  }
  assert.deepEqual([
    lifecycle.sectorSpread.state,
    lifecycle.sectorSpread.timer,
    lifecycle.sectorSpread.hudCodes,
  ], [4, 500, [7, 7, 7, 7]]);
  assert.equal(lifecycle.newGameSpread.nextPickupType, 0,
    "New Game must restore Rapid as the first drop");
});

test("Spread stays inside the fixed BSS, payload, glyph and runtime-code budgets", () => {
  assert.deepEqual([
    manifest.entityEffects.stateAddress,
    manifest.entityEffects.stateBytes,
    manifest.entityEffects.interactiveSlots,
    manifest.entityEffects.interactiveActiveLimit,
    manifest.entityEffects.effectSlots,
    manifest.entityEffects.effectActiveLimit,
  ], [0x8000, 0x100, 4, 2, 6, 5]);
  assert.ok(manifest.runtimeCodeBudget.weaponPickupSpreadShot.actualDeltaBytes <= 448);
  assert.ok(manifest.entityEffects.codeBudget.weaponPickupSpreadShot.actualDeltaBytes <= 448);
  assert.ok(manifest.runtimeCodeBudget.weaponPickupShield.actualDeltaBytes <= 512);
  assert.ok(manifest.entityEffects.codeBudget.weaponPickupShield.actualDeltaBytes <= 512);
  assert.ok(manifest.payloadBudget.weaponPickupSpreadShot.remainingReserveBytes >= 64);
  assert.equal(manifest.payloadBytes, manifest.transportCapacity.totalTransportBytes);
  assert.equal(manifest.bootSectors, manifest.transportCapacity.initialBootSectors);
  assert.ok(manifest.transportCapacity.remainingAtrTransportBytes >= 8192);
  assert.equal(manifest.entityEffects.glyphIndex + manifest.entityEffects.glyphCount, 126);
  assert.doesNotMatch(source.slice(source.indexOf('.segment "ENTITY_CODE"')), /\$A000|\$BFFF/);
});
