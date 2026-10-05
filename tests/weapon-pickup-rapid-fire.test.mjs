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
import { canonicalPlayfield } from "../scripts/playfield.mjs";
import {
  executeHudPresentationTrace,
  executeWeaponBoosterHudTrace,
  executeWeaponPickupCauseTrace,
  executeWeaponPickupCollisionTrace,
  executeWeaponPickupLifecycleTrace,
  executeWeaponPickupRingWrapTrace,
  executeWeaponPickupTrace,
  executeWeaponPickupTraversalTrace,
  executePlayerFighterBurstBalanceTrace,
  executePlayerFighterEmissionVisibilityTrace,
  executePlayerFighterProjectileColourTrace,
  executePlayerFighterProjectileColourLifecycleTrace,
  executePlayerFighterSectorClearVisibilityTrace,
  weaponPickupTraceCsv,
} from "../scripts/weapon-pickup-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entityPath = path.join(root, "assets", "graphics", "entity-effects.json");
const weaponPath = path.join(root, "assets", "graphics", "fighter-weapons.json");
const rosterPath = path.join(root, "assets", "graphics", "enemy-roster.json");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));

function assets() {
  const entities = compileEntityEffects(loadEntityEffectsDefinition(entityPath));
  const roster = compileEnemyRoster(loadEnemyRosterDefinition(rosterPath));
  return {
    entities,
    weapons: compileFighterWeapons(loadFighterWeaponsDefinition(weaponPath), roster),
  };
}

function sourceBytes(startLabel, endLabel) {
  const start = source.indexOf(`${startLabel}:`);
  const end = endLabel.startsWith(".") ? source.indexOf(endLabel, start) :
    source.indexOf(`${endLabel}:`, start);
  return source.slice(start, end)
    .split(/\r?\n/)
    .flatMap((line) => line.match(/^\s*\.byte\s+(.+)$/)?.[1].split(",") ?? [])
    .map((token) => token.trim())
    .map((token) => token.startsWith("%") ? Number.parseInt(token.slice(1), 2) :
      token.startsWith("$") ? Number.parseInt(token.slice(1), 16) : Number(token));
}

function pickupPhasePixels(bank, phase) {
  const pixels = Array.from({ length: 24 }, () => Array(16).fill(0));
  for (let glyph = 0; glyph < 6; glyph += 1) for (let row = 0; row < 8; row += 1) {
    const value = bank[phase * 48 + glyph * 8 + row];
    const cellRow = Math.floor(glyph / 2);
    const cellColumn = glyph & 1;
    for (let pixel = 0; pixel < 4; pixel += 1) {
      const selector = value >> (6 - pixel * 2) & 3;
      pixels[cellRow * 8 + row][cellColumn * 8 + pixel * 2] = selector;
      pixels[cellRow * 8 + row][cellColumn * 8 + pixel * 2 + 1] = selector;
    }
  }
  return pixels;
}

test("Rapid Fire owns fixed slot one without extending BSS or physical pools", () => {
  const { entities } = assets();
  assert.deepEqual([
    entities.pools.interactiveSlots, entities.pools.interactiveActiveLimit,
    entities.pools.effectSlots, entities.pools.effectActiveLimit,
    entities.pools.stateAddress, entities.pools.stateBytes,
  ], [4, 2, 6, 5, 0x8000, 0x100]);
  assert.deepEqual(entities.weaponPickupRapidFire, {
    slot: 1,
    qualifiedKillsPerDrop: 3,
    pendingFrames: 30,
    movementNumerator: 1,
    movementDenominator: 2,
    fineMotionDenominator: 5,
    verticalPhaseCount: 8,
    maximumFootprintRows: 3,
    spawnTopScanline: 8,
    activationTopScanline: 24,
    releaseTopScanline: 240,
    widthHpos: 8,
    heightScanlines: 16,
    glyphs: [
      [42, 191, 191, 190, 188, 188, 188, 188],
      [168, 254, 254, 190, 62, 62, 62, 62],
      [188, 188, 188, 188, 190, 191, 191, 42],
      [62, 62, 62, 62, 190, 254, 254, 168],
    ],
    palette: {
      outlineRegister: "COLPF1", outlineValue: 0x84,
      fillRegister: "COLPF2", fillValue: 0x1e,
      letterRegister: "COLBK", letterValue: 0x00,
    },
  });
  assert.equal(manifest.entityEffects.stateBytes, 256);
  assert.equal(manifest.entityEffects.interactiveSlots, 4);
  assert.equal(manifest.entityEffects.effectSlots, 6);
  assert.equal(manifest.entityEffects.weaponPickupGlyphIndex, 120);
  assert.equal(manifest.entityEffects.weaponPickupGlyphCount, 4);
  assert.equal(manifest.entityEffects.glyphCount, 16);
  assert.equal(128 - manifest.entityEffects.glyphIndex - manifest.entityEffects.glyphCount, 2);
});

test("three eight-phase source banks hold one tapered 8x16 capsule and the runtime draws a PMG silhouette", () => {
  const { entities } = assets();
  assert.equal(entities.pickupGlyphs.length, 32);
  const glyphRows = [...entities.pickupGlyphs].map((row) =>
    [6, 4, 2, 0].map((shift) => row >> shift & 3));
  const selectors = glyphRows.flat();
  assert.ok(selectors.filter(Boolean).length >= 80);
  assert.deepEqual([...new Set(selectors)].sort(), [0, 2, 3]);
  assert.equal(selectors.includes(1), false, "pickup must contain no white COLPF0 pixels");
  const symbols = glyphRows.map((row) => row.map((selector) => "#?sy"[selector]).join(""));
  assert.deepEqual(symbols.slice(0, 8), [
    "#sss", "syyy", "syyy", "syys", "syy#", "syy#", "syy#", "syy#",
  ]);
  assert.deepEqual(symbols.slice(8, 16), [
    "sss#", "yyys", "yyys", "syys", "#yys", "#yys", "#yys", "#yys",
  ]);
  assert.deepEqual(symbols.slice(16, 24), [
    "syy#", "syy#", "syy#", "syy#", "syys", "syyy", "syyy", "#sss",
  ]);
  assert.deepEqual(symbols.slice(24), [
    "#yys", "#yys", "#yys", "#yys", "syys", "yyys", "yyys", "sss#",
  ]);
  const include = renderEntityEffectsCa65Include(entities);
  assert.match(include, /WEAPON_PICKUP_GLYPH_COUNT = 4/);
  assert.match(include, /WEAPON_PICKUP_VERTICAL_PHASE_COUNT = 8/);
  assert.match(include, /WEAPON_PICKUP_PHASE_GLYPH_COUNT = 6/);
  assert.equal(entities.pickupPhaseBank.length, 3 * 8 * 6 * 8);
  assert.deepEqual(Array.from(entities.pickupPhaseBank.subarray(0, 32)),
    Array.from(entities.pickupGlyphs));
  assert.deepEqual(Array.from(entities.pickupPhaseBank.subarray(32, 48)),
    Array(16).fill(0));
  assert.deepEqual(fs.readFileSync(path.join(root, "build", "weapon-pickup-phases.bin")),
    Buffer.from(entities.pickupPhaseBank));
  assert.match(source, /WEAPON_PICKUP_GLYPH_BASE = EFFECT_FRAGMENT_GLYPH_BASE\+EFFECT_FRAGMENT_GLYPH_COUNT/);
  // REWRITTEN 2026-10-01 (recorded failures review, B1; owner-approved): the rest of this test
  // read the character compositor - compose_weapon_pickup_phase and
  // render_weapon_pickup_overlay. f6eee5c retired both: the bank above is
  // source-only art, and the runtime draws one sixteen-row PLAYER3 silhouette
  // per type (docs/plans/pickup-colour.md;
  // tests/pickup-pmg-raster-visibility.test.mjs holds the PMG contract).
  assert.doesNotMatch(source, /compose_weapon_pickup_phase|render_weapon_pickup_overlay/);
  assert.match(source,
    /fighter_pickup_pmg_shape:[\s\S]+\.assert \* - fighter_pickup_pmg_shape = WEAPON_PICKUP_TYPE_COUNT\*WEAPON_PICKUP_HEIGHT_SCANLINES/);
  assert.deepEqual(entities.weaponPickupRapidFire.palette, {
    outlineRegister: "COLPF1", outlineValue: 0x84,
    fillRegister: "COLPF2", fillValue: 0x1e,
    letterRegister: "COLBK", letterValue: 0x00,
  });
  const renderer = /^render_fighter_pickup_pmg:[\s\S]*?\n {4}rts\n/m.exec(source)?.[0] ?? "";
  assert.match(renderer, /lda ENTITY_TYPE\+WEAPON_PICKUP_SLOT[\s\S]+lda fighter_pickup_pmg_shape,x\s+sta PLAYER3,y/);
  assert.doesNotMatch(renderer, /ENTITY_OWNER\+WEAPON_PICKUP_SLOT|ENTITY_RENDER_ID|CHARSET/);
});

// RETIRED 2026-10-01 (recorded failures review, action B1; owner-approved): "runtime compositor
// publishes the exact capsule pixels for all types and phases". It compared 48
// charset bytes with the phase bank after a character composition. There is no
// charset composition since f6eee5c - the capsule is a PLAYER3 image - and
// tests/pickup-pmg-raster-visibility.test.mjs checks the pixels it draws.

test("the release ATR executes 0→1→2→pending only for consumed PlayerFighter kills", () => {
  const atr = executeWeaponPickupTrace({ root, artifact: "atr" });
  const kills = atr.records.filter(({ phase }) => phase.startsWith("KILL_"));
  assert.deepEqual(kills.map((record) => [
    record.damageSource, record.projectileConsumed, record.qualifiedKillCounter,
    record.state, record.timer, record.scoreHi, record.scoreLo,
  ]), [
    [0, true, 1, 0, 0, 0, 0x10],
    [0, true, 2, 0, 0, 0, 0x20],
    [0, true, 0, 1, 32, 0, 0x30],
  ]);
  assert.equal(kills.every(({ activeMask, activeCount }) =>
    activeMask === 0 && activeCount === 0), true);
});

test("non-projectile causes and repeated resolution never advance the drop counter", () => {
  const causes = executeWeaponPickupCauseTrace({ root, artifact: "atr" });
  assert.deepEqual(causes.map(({ source, first, second }) => [
    source, first.qualifiedKillCounter, second.qualifiedKillCounter,
    first.state, second.state,
  ]), [
    [1, 1, 1, 0, 0], [2, 1, 1, 0, 0], [3, 1, 1, 0, 0],
    [4, 1, 1, 0, 0], [5, 1, 1, 0, 0],
  ]);
  assert.deepEqual(causes.map(({ first }) => first.scoreLo), [0x10, 0x10, 0, 0, 0]);
});

test("pickup pending remains hidden and non-colliding for thirty full frames", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "atr" });
  const pending = trace.records.filter(({ phase }) => phase === "PENDING");
  assert.equal(pending.length, 30);
  assert.equal(pending.every((record) => record.state === 1 &&
    record.y === 8 &&
    (record.activeMask & 2) === 0 && record.drawnMask === 0 &&
    record.screenAddress === 0 && record.leftCode === 0 && record.rightCode === 0), true);
  assert.deepEqual([pending[0].timer, pending.at(-1).timer], [30, 1]);
  const firstActive = trace.records.find(({ phase }) => phase === "ACTIVE");
  // RE-POINTED 2026-10-05, plasma FX (docs/plans/plasma-fx.md): the break-up
  // lives 45 frames (decision 3) and its core 24 (decision 6), so when the
  // capsule enters, 32 frames after the kill, the core is out and the four
  // fragments - collisionless effects in their own pool - are still burning
  // out. Was: no effect cell live at all (a 30-frame break-up).
  assert.deepEqual([
    firstActive.state, firstActive.activeMask, firstActive.activeCount,
    firstActive.effectActiveMask & 1, firstActive.y,
  ], [2, 2, 1, 0, 24], "Raider core must be inactive before the capsule enters at the top");
  assert.ok(firstActive.effectActiveMask === 0x1e || firstActive.effectActiveMask === 0,
    "at most the four fragments are still live");
});

test("every booster type enters at the top, crosses the full playfield once and releases below it", () => {
  const expectedPositions = Array.from({ length: 108 }, (_, index) => 24 + index * 2);
  const summarize = ({ traces }) => traces.map((trace) => ({
    name: trace.name,
    created: [trace.created.state, trace.created.y, trace.created.activeMask,
      trace.created.activeCount, trace.created.drawnMask],
    pendingY: [...new Set(trace.pending.map(({ y }) => y))],
    visibleY: [...new Set(trace.visible.map(({ y }) => y))],
    visibleStates: [...new Set(trace.visible.map(({ state, activeMask, activeCount }) =>
      `${state}:${activeMask}:${activeCount}`))],
    visibleFrames: trace.visible.length,
    maximumLogicalSlots: trace.maximumLogicalSlots,
    maximumVisualFootprints: trace.maximumVisualFootprints,
    released: [trace.released.state, trace.released.y, trace.released.activeMask,
      trace.released.activeCount, trace.released.drawnMask],
  }));
  const atr = summarize(executeWeaponPickupTraversalTrace({ root, artifact: "atr" }));
  for (const trace of atr) {
    assert.deepEqual(trace.created, [1, 8, 0, 0, 0], `${trace.name} must spawn fully above`);
    assert.deepEqual(trace.pendingY, [8], `${trace.name} PENDING must not consume visible travel`);
    assert.deepEqual(trace.visibleY, expectedPositions,
      `${trace.name} must visit every complete 8-scanline position`);
    assert.deepEqual(trace.visibleStates, ["2:2:1"]);
    assert.equal(trace.maximumLogicalSlots, 1);
    // The accepted capsule is a PMG fifth player (M0-M3), so it must add no
    // character footprint to the ring at any point of its traversal.
    assert.equal(trace.maximumVisualFootprints, 0);
    assert.deepEqual(trace.released, [0, 240, 0, 0, 0],
      `${trace.name} must release immediately below its last fully visible position`);
  }
  assert.equal(new Set(atr.map(({ visibleFrames }) => visibleFrames)).size, 1,
    "all three booster types must retain the same movement cadence");
});

// REWRITTEN 2026-10-01 (recorded failures review, B1; owner-approved). This was "active capsule
// renders one phased 2x2/2x3 footprint continuously and cannot be shot" and
// read character codes 120-125, a drawn mask of 15 and the cells' backing. The
// capsule is a PLAYER3 image (f6eee5c; docs/plans/pickup-colour.md): it stays
// one logical object for the whole ACTIVE phase, writes no character cell,
// keeps no backing, and a shot passes through it.
test("active capsule is one logical PMG object, writes no character cell and cannot be shot", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "atr" });
  const active = trace.records.filter(({ phase }) => phase === "ACTIVE");
  assert.equal(active.length, 40);
  assert.equal(active.every(({ state, activeMask, activeCount }) =>
    state === 2 && (activeMask & 2) !== 0 && activeCount === 1), true);
  assert.equal(active.every(({
    leftCode, rightCode, bottomLeftCode, bottomRightCode, thirdLeftCode, thirdRightCode,
    drawnMask, backing, thirdBacking,
  }) => [leftCode, rightCode, bottomLeftCode, bottomRightCode, thirdLeftCode, thirdRightCode,
    drawnMask, ...backing, ...thirdBacking].every((value) => value === 0)), true,
  "a PMG capsule owns no character cell and no backing");
  // RE-POINTED 2026-10-05, plasma FX decision 3: the kill's break-up now burns
  // out over the capsule's first frames (it lives 45 frames, the capsule enters
  // 32 after the kill), and those effect cells are the only ones that change.
  // From the frame after the pool has unwound, the playfield must be unchanged
  // under the moving capsule, as before.
  const settled = active.findIndex(({ effectActiveMask }) => effectActiveMask === 0) + 2;
  assert.ok(settled >= 2 && active.length - settled >= 20, `settled at ACTIVE frame ${settled}`);
  assert.equal(active.slice(settled).every(({ screen }) =>
    Buffer.from(screen).equals(Buffer.from(active[settled].screen))), true,
  "the playfield under a moving capsule is never rewritten");
  assert.deepEqual(active.map(({ y }) => y),
    Array.from({ length: 40 }, (_, index) => 24 + index * 2));
  const ignored = trace.records.find(({ phase }) => phase === "PROJECTILE_IGNORED");
  assert.deepEqual([
    ignored.state, ignored.activeMask, ignored.projectileActiveCount,
  ], [2, 2, 1]);
});

test("pickup movement resolves half world speed into smooth scanline phases", () => {
  const { entities } = assets();
  assert.deepEqual([
    entities.weaponPickupRapidFire.movementNumerator,
    entities.weaponPickupRapidFire.movementDenominator,
    entities.debrisMotion.verticalStepNumerator,
    entities.debrisMotion.verticalStepDenominator,
  ], [1, 2, 3, 5]);
  assert.match(source,
    /update_weapon_pickup_active:[\s\S]+@motion:[\s\S]+adc world_scroll_rates,x[\s\S]+cmp #WEAPON_PICKUP_FINE_RATE_DENOMINATOR/);
  const active = executeWeaponPickupTrace({ root, artifact: "atr" }).records
    .filter(({ phase }) => phase === "ACTIVE");
  assert.deepEqual(active.slice(1).map((record, index) => record.y - active[index].y),
    Array(active.length - 1).fill(2));
});

// REWRITTEN 2026-10-01 (recorded failures review, B1; owner-approved): the tail located the
// capsule's four character cells in the ring and read their glyph codes. The
// allocator rule it protects is unchanged and still asserted: debris in slot 0
// and the capsule in slot 1 are both active, for every ring head. The capsule
// is a PMG object, so it owns no ring cell at all.
test("debris and the reserved pickup coexist without allocator overwrite for every A2 head", () => {
  for (let head = 0; head < canonicalPlayfield.ringRows; head += 1) {
    const trace = executeWeaponPickupTrace({ root, artifact: "atr", head, coexistDebris: true });
    const firstActive = trace.records.find(({ phase }) => phase === "ACTIVE");
    assert.deepEqual([firstActive.activeMask, firstActive.activeCount], [3, 2]);
    assert.deepEqual([firstActive.state, firstActive.y, firstActive.a2Head], [2, 24, head]);
    assert.deepEqual([
      firstActive.leftCode, firstActive.rightCode,
      firstActive.bottomLeftCode, firstActive.bottomRightCode, firstActive.drawnMask,
    ], [0, 0, 0, 0, 0], `head ${head}: the capsule owns no ring cell`);
  }
});

// RETIRED 2026-10-01 (recorded failures review, action B1; owner-approved):
//   * "four-cell backing restores byte-exact data in reverse layer order at
//     every A2 head";
//   * "reverse erase restores every 2x2/2x3 phase across the A2 wrap".
// Both tested the save and restore of the character cells under the capsule.
// A PLAYER3 capsule (f6eee5c) overwrites no cell, so there is no backing to
// restore; its erase is clear_fighter_pickup_pmg, covered by
// tests/pickup-pmg-raster-visibility.test.mjs and
// tests/booster-admission-diagnostic.test.mjs.

// REWRITTEN 2026-10-01 (recorded failures review, B1; owner-approved): the
// patterns read the character overlay (render_weapon_pickup_overlay, its drawn-mask guard and
// restore) and the frame fence that moved with the capsule
// (pickup_pending_fence). f6eee5c retired all of them. The rule is the same -
// one guarded publication per frame, late - on the PMG publisher.
test("the main frame has one guarded late pickup publication", () => {
  assert.equal((source.match(/jsr entity_effects_render/g) ?? []).length, 1);
  assert.equal((source.match(/render_weapon_pickup_overlay|pickup_pending_fence/g) ?? []).length, 0);
  assert.equal((source.match(/jsr publish_fighter_pickup_pmg/g) ?? []).length, 1);
  assert.match(source,
    /jsr erase_fighter_projectile_overlays_with_light[\s\S]*jsr publish_fighter_pickup_pmg\s+fighter_projectile_publication_capital_render:/,
    "the capsule is published in the post-playfield window");
  assert.match(source,
    /publish_fighter_pickup_pmg:\s+jsr clear_fighter_pickup_pmg\s+lda ENTITY_STATE\+WEAPON_PICKUP_SLOT\s+cmp #WEAPON_PICKUP_STATE_ACTIVE\s+beq render_fighter_pickup_pmg\s+rts/,
    "it is drawn only while ACTIVE and cleared otherwise");
  assert.match(source, /\nwait_gameplay_frame:\nwait_frame:\n/,
    "the frame wait no longer depends on the capsule");
});

test("player PMG transparency preserves every pickup phase at nose side and rear overlap", () => {
  const { entities } = assets();
  const body = sourceBytes("player_shape", "player_engine_shape");
  const engine = sourceBytes("player_engine_shape", ".segment \"ENTITY_CODE\"");
  assert.deepEqual([body.length, engine.length], [16, 16]);
  assert.match(source, /finish_startup_after_loader:[\s\S]+lda #\$00[\s\S]{0,160}sta PRIOR/);
  const contacts = new Map([["nose", 14], ["side", 4], ["rear", -6]]);
  for (const phase of [0, 2, 4, 6]) {
    const capsule = pickupPhasePixels(entities.pickupPhaseBank, phase);
    for (const [contact, playerTop] of contacts) {
      let transparentCapsulePixels = 0;
      let opaquePlayerPixels = 0;
      for (let capsuleY = 0; capsuleY < 24; capsuleY += 1) {
        const playerRow = capsuleY - playerTop;
        for (let x = 0; x < 16; x += 1) {
          const capsulePixel = capsule[capsuleY][x];
          const bit = 7 - Math.floor(x / 2);
          const bodyPixel = playerRow >= 0 && playerRow < 16 && (body[playerRow] >> bit & 1);
          const enginePixel = playerRow >= 0 && playerRow < 16 && (engine[playerRow] >> bit & 1);
          const composed = bodyPixel ? "body" : enginePixel ? "engine" : capsulePixel;
          if (capsulePixel !== 0 && !bodyPixel && !enginePixel) {
            transparentCapsulePixels += 1;
            assert.equal(composed, capsulePixel,
              `${contact} phase ${phase}: transparent PMG background obscured capsule`);
          }
          if (capsulePixel !== 0 && (bodyPixel || enginePixel)) {
            opaquePlayerPixels += 1;
            assert.equal(typeof composed, "string",
              `${contact} phase ${phase}: opaque PlayerFighter pixel lost foreground priority`);
          }
        }
      }
      assert.ok(transparentCapsulePixels > 0 && opaquePlayerPixels > 0,
        `${contact} phase ${phase} must exercise both transparent and opaque overlap`);
    }
  }
});

// RETIRED 2026-10-01 (recorded failures review, action B1; owner-approved): "one logical
// footprint survives repeated ring wraps and cannot return after release". It
// counted the capsule's character cells (2, 4 or 6) and their exact reverse
// erase on every frame. A PLAYER3 capsule (f6eee5c) has no cells. The part
// that still applies - released at Y 240, nothing left after further ring
// wraps - is asserted by tests/playfield-boundaries.test.mjs ("bottom clipping
// and repeated ring wraps never write the HUD or revive a pickup").

test("EASY MEDIUM and HARD preserve their rates without full-row raster jumps", () => {
  for (const [difficulty, rate] of [[0, 8], [1, 9], [2, 10]]) {
    const trace = executeWeaponPickupRingWrapTrace({
      root, artifact: "atr", difficulty, wrapFramesAfterRelease: 0,
    });
    const deltas = trace.records.slice(1).map((record, index) =>
      record.y - trace.records[index].y);
    assert.equal(deltas.every((delta) => delta === 1 || delta === 2), true);
    for (let index = 0; index + 5 <= deltas.length; index += 5) {
      assert.equal(deltas.slice(index, index + 5).reduce((sum, value) => sum + value, 0),
        rate, `difficulty ${difficulty} changed its five-frame travel`);
    }
    assert.deepEqual([trace.records[0].y, trace.releasedY], [24, 240]);
  }
});

test("release collision covers the complete half-open 8-HPOS by 16-scanline capsule", () => {
  const atr = executeWeaponPickupCollisionTrace({ root, artifact: "atr" });
  assert.equal(atr.every(({ expectedHit, collected }) => expectedHit === collected), true);
  for (const phase of Array.from({ length: 8 }, (_, index) => index)) {
    for (const contact of ["nose", "side", "rear"]) {
      const sample = atr.find(({ name }) => name === `phase_${phase}_${contact}`);
      assert.equal(sample?.collected, true, `${contact} contact failed at phase ${phase}`);
    }
  }
  assert.match(source,
    /cmp #WEAPON_PICKUP_RELEASE_TOP/);
});

test("pickup collection is single-shot and changes neither score, HULL nor LIFE", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "atr" });
  const before = trace.records.filter(({ phase }) => phase === "ACTIVE").at(-1);
  const pickup = trace.records.find(({ phase }) => phase === "PICKUP");
  assert.deepEqual([
    pickup.state, pickup.activeMask, pickup.activeCount, pickup.timer,
  ], [3, 0, 0, 500]);
  assert.deepEqual([
    pickup.scoreHi, pickup.scoreLo, pickup.playerHealth, pickup.playerLives,
  ], [before.scoreHi, before.scoreLo, before.playerHealth, before.playerLives]);
  const changedHudCells = Array.from({ length: 40 }, (_, offset) => offset)
    .filter((offset) => pickup.display[offset] !== before.display[offset]);
  assert.deepEqual(changedHudCells, [30, 31, 32, 33, 34, 36, 37, 38, 39]);
  assert.equal(pickup.display[35], 0, "BOOST separator must remain a blank cell");
  assert.deepEqual(Array.from(pickup.display.subarray(0, 30)),
    Array.from(before.display.subarray(0, 30)), "SCORE/LIFE/HULL and separator cells must remain byte-exact");
});

test("weapon boosters use four proportional ANTIC 2 segments with a timer-derived warning blink", () => {
  const atr = executeWeaponBoosterHudTrace({ root, artifact: "atr" });
  assert.deepEqual([
    atr.hudOffset, atr.hudCells, atr.hudSegmentsOffset, atr.hudSegments,
    atr.fullCode, atr.fullGlyph,
  ], [30, 10, 36, 4, 7, [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff]]);
  assert.deepEqual(Object.fromEntries(atr.samples.map(({ name, hudCodes }) =>
    [name, hudCodes])), {
    "100%": [7, 7, 7, 7],
    "76%": [7, 7, 7, 7],
    "75%": [7, 7, 7, 0],
    "51%": [7, 7, 7, 0],
    "50%": [7, 7, 0, 0],
    "26%": [7, 7, 0, 0],
    "25%": [7, 7, 0, 0],
    "below-25-visible": [7, 0, 0, 0],
    "blink-visible": [7, 0, 0, 0],
    "blink-hidden-boundary": [0, 0, 0, 0],
    "blink-hidden": [0, 0, 0, 0],
    "blink-visible-resumed": [7, 0, 0, 0],
  });
  assert.deepEqual(atr.paused.map(({ timer, hudCodes }) => [timer, hudCodes]),
    Array.from({ length: 16 }, () => [112, [0, 0, 0, 0]]),
    "pause must freeze both the timer and its current hidden blink phase");
  assert.deepEqual([
    atr.activation.state, atr.activation.timer, atr.activation.hudCodes,
    atr.refreshed.state, atr.refreshed.timer, atr.refreshed.hudCodes,
  ], [3, 500, [7, 7, 7, 7], 4, 500, [7, 7, 7, 7]]);
  assert.deepEqual([
    atr.backingBeforeRefresh, atr.backingAfterRefresh,
    atr.expired.state, atr.expired.timer, atr.expired.hudRegionCodes,
  ], [atr.originalHud, atr.originalHud, 0, 0, atr.originalHud]);
  assert.deepEqual(atr.changedScreenOffsets,
    [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    "activation must not write outside the ten-cell BOOST field");
  assert.equal(atr.samples.every(({ hudRegionCodes }) =>
    hudRegionCodes.slice(0, 6).join() === "34,47,47,51,52,0"), true,
  "the full BOOST label and separator must remain stable while active");
  assert.equal(atr.samples.every(({ hudCodes }) => hudCodes.every((code) =>
    code === 0 || code === atr.fullCode)), true,
  "energy cells may contain only blank or the BOOST segment glyph");
});

test("HULL plates and the ten-cell BOOST field remain distinct at native screen codes", () => {
  const atr = executeHudPresentationTrace({ root, artifact: "atr" });
  assert.deepEqual([
    atr.hullOffset, atr.hullSegments, atr.boosterOffset, atr.boosterCells,
    atr.boosterSegmentsOffset, atr.boosterSegments,
  ], [25, 4, 30, 10, 36, 4]);
  assert.deepEqual([atr.hullOffset - 1, atr.hullOffset + atr.hullSegments,
    atr.boosterSegmentsOffset - 1], [24, 29, 35],
  "the three HULL/BOOST separators must each occupy exactly one cell");
  assert.equal(atr.frames.every(({ display }) =>
    [24, 29, 35].every((column) => display[column] === 0)), true,
  "all three separator cells must stay blank in every rendered state");
  assert.equal(atr.lifecycleDisplays.every(({ display }) =>
    [24, 29, 35].every((column) => display[column] === 0)), true,
  "expiration, new game and respawn must preserve all separator cells");
  assert.equal(atr.frames.every(({ display }) => display.length === 40), true,
  "HUD snapshots must remain exactly inside $4000-$4027");
  assert.equal(atr.frames.every(({ display, hullCodes, boosterCodes }) =>
    display.slice(25, 29).join() === hullCodes.join() &&
    display.slice(30, 40).join() === boosterCodes.join()), true,
  "HULL and BOOST writers must stay inside their disjoint fields");
  assert.deepEqual([
    atr.hullFullGlyph, atr.hullDamagedGlyph, atr.boosterFullGlyph,
  ], [
    [0, 0, 0, 0x3c, 0x7e, 0xff, 0x7e, 0xff],
    [0, 0, 0, 0x3c, 0x42, 0x5a, 0x24, 0xff],
    [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff],
  ]);
  assert.deepEqual(atr.frames.map(({ name, health, timer, boosterState,
    hullCodes, boosterCodes }) =>
    [name, health, timer, boosterState, hullCodes, boosterCodes]), [
    ["full-hull-no-booster", 10, 0, 0, [5, 5, 5, 5], Array(10).fill(0)],
    ["full-hull-full-boost", 10, 500, 3, [5, 5, 5, 5],
      [34, 47, 47, 51, 52, 0, 7, 7, 7, 7]],
    ["partial-hull-half-boost", 7, 250, 3, [5, 5, 12, 12],
      [34, 47, 47, 51, 52, 0, 7, 7, 0, 0]],
    ["critical-hull-blinking-boost", 1, 111, 3, [12, 12, 12, 12],
      [34, 47, 47, 51, 52, 0, 7, 0, 0, 0]],
  ]);
});

test("Rapid Fire lasts 500 active frames and keeps its accepted accelerated burst", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "atr" });
  // RE-PINNED 2026-10-01 (recorded failures review, D1): a burst is 4 PairShots, a Rapid burst 5
  // and a Spread burst 2 fire events, in a pool of 5
  // (assets/graphics/fighter-weapons.json, since 66b90c5 and db64ca8). The
  // pins were for 8, 10 and 8 single shots in a pool of 10.
  assert.deepEqual(trace.normalBurstFrames, [0, 9, 18, 27]);
  assert.deepEqual(trace.rapidBurstFrames, [0, 6, 12, 18, 24]);
  assert.equal(trace.activeRapidFrames, 500);
  assert.equal(trace.rapidTimerFrames.length, 500);
  assert.deepEqual(trace.rapidTimerFrames.map(({ timer }) => timer),
    Array.from({ length: 500 }, (_, index) => 499 - index));
  assert.deepEqual(trace.rapidTimerFrames[0].hudCodes, [7, 7, 7, 7]);
  assert.deepEqual(trace.rapidTimerFrames[123].hudCodes, [7, 7, 7, 7]);
  assert.deepEqual(trace.rapidTimerFrames[124].hudCodes, [7, 7, 7, 0]);
  assert.deepEqual(trace.rapidTimerFrames[249].hudCodes, [7, 7, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[374].hudCodes, [7, 7, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[375].hudCodes, [7, 0, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[380].hudCodes, [0, 0, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[388].hudCodes, [7, 0, 0, 0]);
  assert.deepEqual(trace.rapidTimerFrames[499].hudCodes, [0, 0, 0, 0]);
  const hudChangeFrames = trace.rapidTimerFrames.filter((record, index, frames) =>
    index === 0 || record.hudCodes.join() !== frames[index - 1].hudCodes.join())
    .map(({ frame }) => frame);
  assert.deepEqual(hudChangeFrames,
    [0, 124, 249, 375, 380, 388, 396, 404, 412, 420, 428, 436, 444, 452,
      460, 468, 476, 484, 492]);
  assert.equal(trace.pauseFrames.length, 10);
  assert.equal(trace.pauseFrames.every(({ timer, hudCodes }) =>
    timer === trace.frozenTimer && hudCodes.join() === "7,7,7,7"), true);
  const rapid = trace.records.find(({ phase }) => phase === "RAPID_BURST");
  const paused = trace.records.find(({ phase }) => phase === "PAUSE");
  const expired = trace.records.find(({ phase }) => phase === "EXPIRED");
  assert.equal(paused.timer, rapid.timer);
  assert.deepEqual([expired.state, expired.timer], [0, 0]);
  const { weapons } = assets();
  assert.deepEqual([
    weapons.player_fighter.burstCount, weapons.player_fighter.rapidFireBurstCount,
    weapons.player_fighter.spreadShotBurstCount, weapons.player_fighter.burstIntervalFrames,
    weapons.player_fighter.rapidFireIntervalFrames, weapons.player_fighter.rapidFireDurationFrames,
    weapons.player_fighter.poolSlots, weapons.player_fighter.speedScanlines,
    weapons.player_fighter.widthHpos, weapons.player_fighter.heightScanlines,
  ], [4, 5, 2, 9, 6, 500, 5, 6, 1, 2]);
});

test("packed runtime distinguishes accepted Normal, Rapid and Spread cadence", () => {
  const atr = executePlayerFighterBurstBalanceTrace({ root, artifact: "atr" });
  const summary = atr.traces.map((mode) => [
    mode.mode, mode.expectedBurst, mode.intervalFrames, mode.postBurstFrames,
    mode.firstBurstSalvos, mode.firstBurstProjectiles, mode.emittedProjectiles,
    mode.maximumPoolOccupancy,
  ]);
  // RE-PINNED 2026-10-01 (recorded failures review, A25): the 4 / 5 / 2 burst counts, and for
  // Spread the volley of three followed by one centre shot: 2 fire events and 4
  // shots in the first burst, 8 shots in 80 frames, 4 in the pool at most.
  assert.deepEqual(summary, [
    ["NORMAL", 4, 9, 12, 4, 4, 9, 4],
    ["RAPID", 5, 6, 12, 5, 5, 12, 5],
    ["SPREAD", 2, 28, 12, 2, 4, 8, 4],
    ["SHIELD", 4, 9, 12, 4, 4, 9, 4],
  ]);
  const firstBurstFrames = (mode) => mode.records
    .filter(({ allocatedProjectiles }) => allocatedProjectiles > 0)
    .slice(0, mode.expectedBurst)
    .map(({ frame }) => frame);
  assert.deepEqual(firstBurstFrames(atr.traces[0]), [0, 9, 18, 27]);
  assert.deepEqual(firstBurstFrames(atr.traces[1]),
    [0, 6, 12, 18, 24]);
  assert.deepEqual(firstBurstFrames(atr.traces[2]), [0, 28]);
});

test("released FIRE emits a visible centred first frame across X, Y and ring phases", () => {
  const trace = executePlayerFighterEmissionVisibilityTrace({ root, artifact: "atr" });
  assert.equal(trace.cases.length, 216);
  assert.equal(trace.cases.every(({ slots }) =>
    slots.length > 0 && slots.every(({ visible }) => visible)), true);
  // Playfield geometry: ANTIC 4 cells are four one-HPOS pixels wide and the
  // normal playfield spans HPOS 48..207; the double-width fighter is 16 HPOS.
  const leftHpos = 48;
  const lastHpos = leftHpos + 40 * 4 - 1;
  const silhouetteHalf = 16 / 2;
  const pixelMasks = [0xc0, 0x30, 0x0c, 0x03];
  for (const record of trace.cases) {
    // RE-PINNED 2026-10-01 (recorded failures review, A26): a Spread volley allocates its two
    // side shots first and the centre last (player_fighter_spread_volley_sides),
    // so the slots read left, right, centre; they were centre, left, right.
    const offsets = record.mode === "SPREAD" ? [4, 12, 8] : [8];
    assert.deepEqual(record.slots.map(({ x }) => x),
      offsets.map((offset) => Math.min(record.playerX + offset, lastHpos)));
    if (record.mode === "SPREAD") continue; // Spread composes with backing
    const [{ screenAddress, glyphBytes }] = record.slots;
    const rowOffset = (screenAddress - canonicalPlayfield.ringBufferAddress) % 40;
    const pixel = pixelMasks.findIndex((mask) => glyphBytes.some((byte) => byte & mask));
    const pixelCentre = leftHpos + rowOffset * 4 + pixel + 0.5;
    const silhouetteCentre = record.playerX + silhouetteHalf;
    // At PLAYER_X_MAX the silhouette centre (208) lies beyond the last
    // playfield HPOS; the two-phase renderer's nearest pixel is 206.
    const tolerance = silhouetteCentre > lastHpos ? 1.5 : 0.5;
    assert.ok(Math.abs(pixelCentre - silhouetteCentre) <= tolerance,
      `${record.mode} x=${record.playerX}: pixel ${pixelCentre} vs ${silhouetteCentre}`);
  }
  assert.match(source,
    /allocate_player_fighter_projectile_at_slot:[\s\S]+adc #\(PLAYER_VISIBLE_WIDTH_HPOS\/2\)/);
});

test("sector pickup clear republishes still-live PlayerFighter projectiles in the same frame", () => {
  const trace = executePlayerFighterSectorClearVisibilityTrace({ root, artifact: "atr" });
  // RE-PINNED 2026-10-01 (recorded failures review, A27): the rendered latch is $FF
  // (claim_fighter_projectile_visual), not 1.
  assert.deepEqual([trace.before.active, trace.before.rendered], [1, 0xff]);
  assert.deepEqual([trace.after.active, trace.after.rendered], [1, 0xff]);
  assert.notEqual(trace.after.screenCode, 0);
  assert.match(source,
    /profile_after_entity_render[\s\S]+jsr integration_update_sector_completion[\s\S]+jsr render_fighter_projectile_overlays/);
});

test("both Raider shots leave the centred first frame visible across ring rotation", () => {
  const trace = executePlayerFighterEmissionVisibilityTrace({
    root,
    artifact: "atr",
    playerXs: [48, 124, 200],
    playerYs: [184, 191],
    ringHeads: [0, 1, 26],
    raiderFire: true,
  });
  assert.equal(trace.cases.length, 54);
  assert.equal(trace.cases.every(({ slots, raiderProjectiles }) =>
    raiderProjectiles >= 2 && slots.length > 0 && slots.every(({ visible }) => visible)), true);
});

test("Normal and Rapid projectiles render through the PlayerFighter yellow bank", () => {
  const atr = executePlayerFighterProjectileColourTrace({ root, artifact: "atr" });
  assert.deepEqual([
    atr.normalAtSpawn, atr.normalAfterPickup, atr.rapidAtSpawn,
    atr.rapidAfterExpiry, atr.normalAfterExpiry,
  ], [0x01, 0x01, 0x01, 0x01, 0x01]);
  assert.equal(atr.rapidTimerAtSpawn, 500);
  assert.deepEqual(atr.rendered.map(({ activeRenderId, code, screenCodeAfter }) =>
    [activeRenderId, code, screenCodeAfter]), [[1, 15, 15], [1, 15, 15], [1, 15, 15]]);
  assert.deepEqual(atr.rendered.map(({ inverse }) => inverse), [0, 0, 0]);
  assert.equal(new Set(atr.rendered.map(({ glyphCode }) => glyphCode)).size, 1,
    "Normal and Rapid projectiles must use byte-identical glyph geometry");
  assert.deepEqual([atr.normalColour, atr.rapidColour], [0x1e, 0x1e]);
  assert.equal(atr.rendered.every(({ colourRegister, colourValue }) =>
    colourRegister === "COLPF2" && colourValue === 0x1e), true);
  assert.deepEqual([
    atr.interceptorRendered.activeRenderId, atr.interceptorRendered.inverse,
    atr.interceptorRendered.colourRegister, atr.interceptorRendered.colourValue,
  ], [2, 1, "COLPF3", 0x46]);
  const { weapons } = assets();
  assert.deepEqual([
    weapons.player_fighter.widthHpos, weapons.player_fighter.heightScanlines,
    weapons.player_fighter.speedScanlines, weapons.player_fighter.poolSlots,
  // RE-PINNED 2026-10-01 (recorded failures review, A28): poolSlots 10 -> 5.
  ], [1, 2, 6, 5]);
  const collisionPath = source.slice(source.indexOf("update_fighter_projectiles:"),
    source.indexOf("allocate_player_fighter_projectile:"));
  assert.match(collisionPath, /lda FIGHTER_PROJECTILE_ACTIVE,x\s+beq @player_fighter_next/);
  assert.doesNotMatch(collisionPath, /FIGHTER_PROJECTILE_RAPID_COLOR|and #\$7F/);
});

test("the packed ATR keeps every implemented PlayerFighter lifecycle path yellow under cold RAM", () => {
  for (const coldFill of [0xa5, 0x5a]) {
    const atr = executePlayerFighterProjectileColourLifecycleTrace({
      root, artifact: "atr", coldFill,
    });
    assert.deepEqual(atr.palette, { COLPF2: 0x1e, COLPF3: 0x46 });
    assert.deepEqual(atr.captures.map(({ phase, boosterState, projectiles }) => [
      phase,
      boosterState,
      projectiles.length,
      projectiles.every(({ inverse, colourRegister, colourValue }) =>
        inverse === 0 && colourRegister === "COLPF2" && colourValue === 0x1e),
    ]), [
      ["NORMAL", 0, 1, true],
      ["RAPID", 3, 1, true],
      ["SPREAD", 4, 3, true],
      ["PAUSE_BEFORE", 3, 1, true],
      ["PAUSE_RESUME", 3, 1, true],
      ["SECTOR_TRANSITION", 4, 3, true],
      ["RAPID_EXPIRED", 0, 1, true],
      ["SPREAD_EXPIRED", 0, 1, true],
      ["LIFE_LOSS", 0, 1, true],
      ["NEW_GAME", 0, 1, true],
    ]);
    assert.deepEqual([
      atr.interceptor.activeRenderId, atr.interceptor.inverse,
      atr.interceptor.colourRegister, atr.interceptor.colourValue,
    ], [2, 1, "COLPF3", 0x46]);
  }
});

test("new game, life loss and Game Over clear RF while a live sector transition preserves it", () => {
  const lifecycle = executeWeaponPickupLifecycleTrace({ root, artifact: "atr" });
  for (const record of [lifecycle.newGame, lifecycle.lifeLoss, lifecycle.gameOver,
    lifecycle.sectorActive]) {
    assert.deepEqual([record.state, record.activeMask, record.activeCount], [0, 0, 0]);
    assert.deepEqual(record.hudCodes, [0, 0, 0, 0]);
  }
  // REWRITTEN 2026-10-01 (recorded failures review, B2; owner-approved): the test expected a
  // PENDING capsule to be cleared at a sector boundary. The rule is
  // docs/game-design.md "Weapon pickups": an ACTIVE capsule is removed, a
  // PENDING one is frozen and resumes afterwards (since f6eee5c).
  assert.deepEqual([lifecycle.sectorPending.state, lifecycle.sectorPending.activeMask,
    lifecycle.sectorPending.activeCount], [1, 0, 0]);
  assert.deepEqual(lifecycle.sectorPending.hudCodes, [0, 0, 0, 0]);
  assert.deepEqual([
    lifecycle.newGame.qualifiedKillCounter,
    lifecycle.sectorRapid.state, lifecycle.sectorRapid.timer,
  ], [0, 3, 500]);
  assert.deepEqual(lifecycle.sectorRapid.hudCodes, [7, 7, 7, 7]);
});

test("release trace CSV exposes the authoritative counter, state, timing and score", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "atr" });
  const csv = weaponPickupTraceCsv(trace);
  assert.match(csv, /^artifact,phase,frame,kill,damage_source,projectile_consumed,/);
  assert.match(csv, /atr,KILL_3,0,3,0,1,0,0,0,1,/);
  assert.match(csv, /atr,PICKUP,0,,,0,0,0,0,3,/);
  assert.match(csv, /atr,RAPID_TIMER,499,,,0,0,0,0,0,/);
});
