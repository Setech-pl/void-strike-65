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
  executePlayerFighterBurstBalanceTrace,
  executeWeaponBoosterReplacementTrace,
  executeWeaponPickupBackingTrace,
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
  assert.match(source.slice(source.indexOf("render_weapon_pickup_overlay:"),
    source.indexOf("; Effects render after")), /compose_weapon_pickup_phase/);
});

test("release XEX and ATR execute the deterministic Rapid Spread Shield drop cycle", () => {
  const xex = executeSpreadShotTrace({ root, artifact: "xex" });
  const atr = executeSpreadShotTrace({ root, artifact: "atr" });
  const cycle = (trace) => trace.drops.map((drop) => [
    drop.pickupType, drop.nextPickupType, drop.renderId, drop.state,
  ]);
  assert.deepEqual(cycle(xex), [[0, 1, 120, 1], [1, 2, 248, 1], [2, 0, 120, 1]]);
  assert.deepEqual(cycle(atr), cycle(xex));
  assert.equal(xex.drops[1].boosterState, 3,
    "Spread capsule must be earned naturally while Rapid Fire is still active");
  assert.equal(xex.spreadCapsuleFrames.every(({ capsuleState, boosterState }) =>
    capsuleState === 2 && boosterState === 3), true,
  "visible Spread capsule must coexist with the non-rendered Rapid controller");
  assert.deepEqual([
    xex.spreadPickup.capsuleState, xex.spreadPickup.boosterState, xex.spreadPickup.timer,
  ], [0, 4, 500], "collecting Spread must naturally replace Rapid at full duration");
  assert.equal(xex.killRecords.length, 9);
  assert.equal(xex.killRecords.every(({ damageSource, projectileConsumed }) =>
    damageSource === 0 && projectileConsumed), true);
  assert.deepEqual(xex.killRecords.map(({ scoreLo }) => scoreLo),
    [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90]);
  assert.deepEqual(atr.killRecords.map(({ scoreLo }) => scoreLo),
    xex.killRecords.map(({ scoreLo }) => scoreLo));
});

test("both capsule types spawn and Spread moves through every A2 step without ghosts", () => {
  const trace = executeSpreadShotTrace({ root, artifact: "xex" });
  assert.deepEqual([
    trace.rapidCapsule.state, trace.rapidCapsule.drawnMask,
    trace.rapidCapsule.leftCode, trace.rapidCapsule.rightCode,
    trace.rapidCapsule.bottomLeftCode, trace.rapidCapsule.bottomRightCode,
  ], [2, 15, 120, 121, 122, 123]);
  assert.deepEqual(trace.spreadCapsuleFrames.map((frame) => [
    frame.state, frame.drawnMask, frame.leftCode, frame.rightCode,
    frame.bottomLeftCode, frame.bottomRightCode,
  ]), Array.from({ length: 8 }, () => [2, 15, 248, 249, 250, 251]));
  assert.deepEqual(trace.spreadCapsuleFrames.map(({ y }) => y),
    [26, 28, 30, 32, 34, 36, 38, 40]);
  assert.deepEqual(trace.spreadCapsuleFrames.map(({ a2Head }) => a2Head),
    [0, 26, 26, 25, 25, 24, 24, 23]);
  for (const frame of trace.spreadCapsuleFrames) {
    const capsuleCells = [...frame.screen].filter((code) =>
      (code & 0x7f) >= 120 && (code & 0x7f) <= 125);
    assert.equal(capsuleCells.length, frame.rasterPhase === 0 ? 4 : 6,
      `frame ${frame.frame} retained a second capsule position`);
    assert.deepEqual(frame.backing, [0, 0, 0, 0]);
    if (frame.rasterPhase !== 0) assert.deepEqual(frame.thirdBacking, [0, 0]);
  }
});

test("Spread four-cell reverse erase restores byte-exact backing at every A2 head", () => {
  for (let head = 0; head < 22; head += 1) {
    const xex = executeWeaponPickupBackingTrace({
      root, artifact: "xex", head, pickupType: "spread",
    });
    const atr = executeWeaponPickupBackingTrace({
      root, artifact: "atr", head, pickupType: "spread",
    });
    assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
    assert.deepEqual([
      xex.rendered.leftCode, xex.rendered.rightCode,
      xex.rendered.bottomLeftCode, xex.rendered.bottomRightCode,
      xex.rendered.drawnMask,
    ], [248, 249, 250, 251, 15]);
    assert.deepEqual(xex.rendered.backing, xex.original);
    assert.deepEqual(xex.restored, xex.original);
    assert.deepEqual([
      xex.drawnMaskAfterErase, xex.renderedMaskAfterErase, xex.topLatchAfterErase,
    ], [0, 0, 0]);
    assert.notEqual(xex.top, xex.bottom);
  }
});

test("Spread collection lasts exactly 500 active PAL frames and pause freezes it", () => {
  const trace = executeSpreadShotTrace({ root, artifact: "xex" });
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
  const trace = executeWeaponBoosterReplacementTrace({ root, artifact: "xex" });
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
  const frames = executeSpreadShotTrace({ root, artifact: "xex" }).trajectoryFrames;
  assert.deepEqual(frames[0].slots.slice(0, 3).map(({ active, x, y }) => [active, x, y]), [
    [0x11, 132, 223], [0x41, 128, 223], [0x21, 136, 223],
  ]);
  for (let frame = 1; frame < frames.length; frame += 1) {
    assert.deepEqual(frames[frame].slots.slice(0, 3).map(({ active, x, y }) =>
      [active, x, y]), [
      [0x11, 132, 223 - frame * 6],
      [0x41, 128 - Math.ceil(frame / 2), 223 - frame * 6],
      [0x21, 136 + Math.ceil(frame / 2), 223 - frame * 6],
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
        const xex = executeSpreadShotHullArtifactTrace({
          root, artifact: "xex", faction, topPhase, head: 21, selectedSlot, frames: 12,
        });
        const atr = executeSpreadShotHullArtifactTrace({
          root, artifact: "atr", faction, topPhase, head: 21, selectedSlot, frames: 12,
        });
        assert.deepEqual(atr.records, xex.records,
          `${faction} phase ${topPhase} slot ${selectedSlot} differs in ATR`);
        assert.equal(xex.records.some(({ backingCode }) => backingCode !== 0), true,
          `${faction} phase ${topPhase} slot ${selectedSlot} missed the hull`);
        for (const record of xex.records) {
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
          root, artifact: "xex", faction, topPhase: 128, head, selectedSlot, frames: 4,
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
        root, artifact: "xex", faction, topPhase, head: 21, selectedSlot, frames: 12,
      });
      assert.equal(trace.records.every(({ restoreMismatches, backingPixelsPreserved }) =>
        restoreMismatches === 0 && backingPixelsPreserved), true,
      `${faction} boundary phase ${topPhase} corrupted a module edge`);
    }
  }
});

test("overlapping Spread shots compose without erasing the remaining shot or Hostile hull", () => {
  const xex = executeSpreadShotOverlapTrace({ root, artifact: "xex", head: 21 });
  const atr = executeSpreadShotOverlapTrace({ root, artifact: "atr", head: 21 });
  assert.deepEqual({ ...atr, artifact: "release" }, { ...xex, artifact: "release" });
  assert.ok(xex.reference[xex.displayOffset] & 0x80, "fixture must use a red Hostile hull cell");
  assert.deepEqual([xex.bothCode, xex.oneCode], [48, 48]);
  assert.notDeepEqual(xex.bothGlyph, xex.oneGlyph,
    "two shots in one cell must retain both masks until one leaves");
  assert.deepEqual(xex.afterBothErase, xex.reference);
  assert.deepEqual(xex.afterFinalErase, xex.reference);
  for (const glyph of [xex.bothGlyph, xex.oneGlyph]) {
    assert.equal(glyph.every((byte, row) => [6, 4, 2, 0].every((shift) =>
      ((xex.initialCharset[(xex.reference[xex.displayOffset] & 0x7f) * 8 + row] >> shift) & 3) === 0 ||
      ((byte >> shift) & 3) !== 0)), true, "overlap punched an empty vertical line");
  }
});

test("all three projectiles leave the screen cleanly without HUD or charset corruption", () => {
  const trace = executeSpreadShotTrace({ root, artifact: "xex" });
  assert.equal(trace.projectilesAfterCleanup.slots.every(({ active, rendered }) =>
    active === 0 && rendered === 0), true);
  assert.equal([...trace.projectilesAfterCleanup.screen].every((code) => {
    const glyph = code & 0x7f;
    return glyph < 11 || glyph >= 47;
  }), true, "reverse erase must remove every final projectile glyph");
  const dynamicStart = 120 * 8;
  const dynamicEnd = 126 * 8;
  assert.deepEqual(trace.charset.subarray(0, dynamicStart),
    trace.initialCharset.subarray(0, dynamicStart));
  assert.deepEqual(trace.charset.subarray(dynamicEnd),
    trace.initialCharset.subarray(dynamicEnd));
  assert.deepEqual(Array.from(trace.charset.subarray(dynamicStart, dynamicEnd)),
    Array.from(assets().entities.pickupPhaseBank.subarray(0x180, 0x1b0)),
  "the only charset mutation must be the last rendered Spread phase");
  const hudBefore = trace.spreadPickup.display.subarray(0, 40);
  for (const frame of trace.spreadTimerFrames.slice(0, 51)) {
    const changed = Array.from({ length: 40 }, (_, offset) => offset)
      .filter((offset) => frame.display[offset] !== hudBefore[offset]);
    assert.equal(changed.every((offset) => offset >= 32 && offset <= 35), true,
      `PAL frame ${frame.frame} changed a protected HUD cell`);
  }
});

test("Spread respects the six-projectile active budget and admits centre before an atomic side pair", () => {
  const trace = executeSpreadShotPoolTrace({ root, artifact: "xex" });
  assert.deepEqual([
    manifest.fighterWeapons.player_fighter.poolSlots,
    manifest.fighterWeapons.player_fighter.activeLimit,
    trace.empty.activeCount,
    trace.threeOccupied.activeCount,
  ], [10, 6, 3, 6]);
  assert.deepEqual(trace.empty.after.slice(0, 3), [0x11, 0x41, 0x21]);
  assert.deepEqual(trace.threeOccupied.after.slice(3, 6), [0x11, 0x41, 0x21]);
  assert.deepEqual(trace.fourOccupied.after.slice(4, 6), [0x11, 0],
    "two free slots must admit the centre but never one unpaired side");
  assert.deepEqual(trace.fiveOccupied.after.slice(5, 6), [0x11],
    "one free slot must remain sufficient for the priority centre");
  assert.deepEqual(trace.activeFull.after, trace.activeFull.before);
  assert.deepEqual(trace.physicalFull.after, trace.physicalFull.before);
  const controller = executePlayerFighterBurstBalanceTrace({
    root, artifact: "xex", windowFrames: 500,
  })
    .traces.find(({ mode }) => mode === "SPREAD");
  assert.equal(controller.firstBurstSalvos, 4);
  assert.equal(controller.firstBurstProjectiles, 12);
  assert.equal(controller.records.every(({ allocatedProjectiles }) =>
    allocatedProjectiles === 0 || allocatedProjectiles === 3), true,
  "a Spread controller update must never allocate a partial fan");
  const rejected = controller.records.filter(({ allocationDue, allocatedProjectiles }) =>
    allocationDue && allocatedProjectiles === 0);
  assert.equal(rejected.length, 0,
    "a blocked Spread salvo must remain one deferred salvo, not accumulated catch-up");
  assert.equal(controller.maximumPoolOccupancy, 6);
  assert.equal(controller.emittedSalvos, 21);
  assert.equal(controller.emittedProjectiles, 63);
  assert.equal(manifest.fighterWeapons.player_fighter.poolSlots, 10);
  assert.equal(manifest.entityEffects.effectActiveLimit, 5);
});

test("the configured 28-frame Spread cooldown avoids catch-up at the active limit", () => {
  const trace = executeSpreadShotCooldownSafetyTrace({ root, artifact: "xex" });
  assert.equal(trace.tooFast.cooldown, 17);
  assert.ok(trace.tooFast.rejectedFullSalvos > 0,
    "a deliberately faster schedule must demonstrate saturation");
  assert.equal(trace.tooFast.maximumPoolOccupancy, 6);
  assert.deepEqual(trace.configured, {
    cooldown: 28,
    allocationSizes: Array(18).fill(3),
    salvos: 18,
    fullSalvos: 18,
    rejectedFullSalvos: 0,
    maximumPoolOccupancy: 6,
  });
});

test("Spread fixed phase is symmetric after 100 updates and both side bounds despawn", () => {
  const trace = executeSpreadShotMotionTrace({ root, artifact: "xex" });
  assert.deepEqual(trace.initial, [132, 128, 136]);
  assert.deepEqual(trace.after100, [132, 78, 186]);
  assert.deepEqual(trace.activeAfter100, [0x11, 0x41, 0x21]);
  assert.equal(trace.initial[0], trace.after100[0], "centre projectile drifted");
  assert.equal(trace.initial[1] - trace.after100[1],
    trace.after100[2] - trace.initial[2]);
  assert.equal(trace.leftBoundary.active, 0);
  assert.equal(trace.rightBoundary.active, 0);
});

test("all three directions collide with debris and Interceptor scoring resolves only once", () => {
  const trace = executeSpreadShotCollisionTrace({ root, artifact: "xex" });
  assert.deepEqual(trace.debris.map(({ direction, projectileConsumed, debrisHp, score }) =>
    [direction, projectileConsumed, debrisHp, score]), [
    [0, true, 2, 0], [0x40, true, 2, 0], [0x20, true, 2, 0],
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
  const lifecycle = executeWeaponPickupLifecycleTrace({ root, artifact: "xex" });
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
