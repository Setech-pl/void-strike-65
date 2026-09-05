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
  assertWeaponPickupTraceParity,
  executeHudPresentationTrace,
  executeWeaponBoosterHudTrace,
  executeWeaponPickupCauseTrace,
  executeWeaponPickupBackingTrace,
  executeWeaponPickupCollisionTrace,
  executeWeaponPickupLifecycleTrace,
  executeWeaponPickupRingWrapTrace,
  executeWeaponPickupTrace,
  executeWeaponPickupTraversalTrace,
  executePlayerFighterBurstBalanceTrace,
  executePlayerFighterProjectileColourTrace,
  executePlayerFighterProjectileColourLifecycleTrace,
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

test("three eight-phase banks preserve one tapered 8x16 capsule through 2x2/2x3 footprints", () => {
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
  assert.match(source,
    /compose_weapon_pickup_phase:[\s\S]+ldy #\(WEAPON_PICKUP_PHASE_GLYPH_COUNT\*8-1\)[\s\S]+sta CHARSET\+WEAPON_PICKUP_GLYPH_BASE\*8,y/);
  assert.deepEqual(entities.weaponPickupRapidFire.palette, {
    outlineRegister: "COLPF1", outlineValue: 0x84,
    fillRegister: "COLPF2", fillValue: 0x1e,
    letterRegister: "COLBK", letterValue: 0x00,
  });
  const renderer = source.slice(source.indexOf("render_weapon_pickup_overlay:"),
    source.indexOf("; Effects render after"));
  assert.doesNotMatch(renderer, /ENTITY_OWNER\+WEAPON_PICKUP_SLOT/);
  assert.match(renderer, /jsr compose_weapon_pickup_phase/);
  assert.match(renderer,
    /lda ENTITY_RENDER_ID\+WEAPON_PICKUP_SLOT[\s\S]+adc #\$01/);
  assert.match(renderer,
    /jsr advance_dst_to_next_ring_row[\s\S]+lda ENTITY_RENDER_ID\+WEAPON_PICKUP_SLOT[\s\S]+adc #\$02/);
  assert.doesNotMatch(renderer, /@render_pickup_pair/);
});

test("release XEX and ATR execute 0→1→2→pending only for consumed PlayerFighter kills", () => {
  const xex = executeWeaponPickupTrace({ root, artifact: "xex" });
  const atr = executeWeaponPickupTrace({ root, artifact: "atr" });
  assert.equal(assertWeaponPickupTraceParity(xex, atr), true);
  const kills = xex.records.filter(({ phase }) => phase.startsWith("KILL_"));
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
  const causes = executeWeaponPickupCauseTrace({ root, artifact: "xex" });
  assert.deepEqual(causes.map(({ source, first, second }) => [
    source, first.qualifiedKillCounter, second.qualifiedKillCounter,
    first.state, second.state,
  ]), [
    [1, 1, 1, 0, 0], [2, 1, 1, 0, 0], [3, 1, 1, 0, 0],
    [4, 1, 1, 0, 0], [5, 1, 1, 0, 0],
  ]);
  assert.deepEqual(causes.map(({ first }) => first.scoreLo), [0x10, 0x10, 0, 0, 0]);
});

test("pending is hidden and non-colliding for thirty full frames after Interceptor breakup", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const pending = trace.records.filter(({ phase }) => phase === "PENDING");
  assert.equal(pending.length, 30);
  assert.equal(pending.every((record) => record.state === 1 &&
    record.y === 8 &&
    (record.activeMask & 2) === 0 && record.drawnMask === 0 &&
    record.screenAddress === 0 && record.leftCode === 0 && record.rightCode === 0), true);
  assert.deepEqual([pending[0].timer, pending.at(-1).timer], [30, 1]);
  const firstActive = trace.records.find(({ phase }) => phase === "ACTIVE");
  assert.deepEqual([
    firstActive.state, firstActive.activeMask, firstActive.activeCount,
    firstActive.effectActiveMask, firstActive.effectActiveCount, firstActive.y,
  ], [2, 2, 1, 0, 0, 24], "Interceptor fragments must expire before the capsule enters at the top");
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
  const xex = summarize(executeWeaponPickupTraversalTrace({ root, artifact: "xex" }));
  const atr = summarize(executeWeaponPickupTraversalTrace({ root, artifact: "atr" }));
  assert.deepEqual(atr, xex, "XEX and ATR must execute the same complete traversal");
  for (const trace of xex) {
    assert.deepEqual(trace.created, [1, 8, 0, 0, 0], `${trace.name} must spawn fully above`);
    assert.deepEqual(trace.pendingY, [8], `${trace.name} PENDING must not consume visible travel`);
    assert.deepEqual(trace.visibleY, expectedPositions,
      `${trace.name} must visit every complete 8-scanline position`);
    assert.deepEqual(trace.visibleStates, ["2:2:1"]);
    assert.equal(trace.maximumLogicalSlots, 1);
    assert.equal(trace.maximumVisualFootprints, 1);
    assert.deepEqual(trace.released, [0, 240, 0, 0, 0],
      `${trace.name} must release immediately below its last fully visible position`);
  }
  assert.equal(new Set(xex.map(({ visibleFrames }) => visibleFrames)).size, 1,
    "all three booster types must retain the same movement cadence");
});

test("active capsule renders one phased 2x2/2x3 footprint continuously and cannot be shot", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const active = trace.records.filter(({ phase }) => phase === "ACTIVE");
  assert.equal(active.length, 40);
  assert.equal(active.every(({
    leftCode, rightCode, bottomLeftCode, bottomRightCode, renderId, drawnMask,
  }) => leftCode === 120 && rightCode === 121 && bottomLeftCode === 122 &&
    bottomRightCode === 123 && renderId === 120 && drawnMask === 15), true);
  assert.equal(active.every(({ rasterPhase, thirdLeftCode, thirdRightCode }) =>
    rasterPhase === 0 ? thirdLeftCode === 0 && thirdRightCode === 0 :
      thirdLeftCode === 124 && thirdRightCode === 125), true);
  assert.deepEqual([...new Set(active.map(({ rasterPhase }) => rasterPhase))], [0, 2, 4, 6]);
  assert.equal(active.every(({ backing, thirdBacking, rasterPhase }) =>
    [...backing, ...(rasterPhase === 0 ? [] : thirdBacking)].every((code) =>
      (code & 0x7f) < 120 || (code & 0x7f) > 125)), true);
  assert.ok(new Set(active.map(({ y }) => y)).size >= 6,
    "static RF codes must remain continuously drawn while the capsule moves");
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
  const active = executeWeaponPickupTrace({ root, artifact: "xex" }).records
    .filter(({ phase }) => phase === "ACTIVE");
  assert.deepEqual(active.slice(1).map((record, index) => record.y - active[index].y),
    Array(active.length - 1).fill(2));
});

test("debris and the reserved pickup coexist without allocator overwrite for every A2 head", () => {
  for (let head = 0; head < canonicalPlayfield.ringRows; head += 1) {
    const trace = executeWeaponPickupTrace({ root, artifact: "xex", head, coexistDebris: true });
    const firstActive = trace.records.find(({ phase }) => phase === "ACTIVE");
    assert.deepEqual([firstActive.activeMask, firstActive.activeCount], [3, 2]);
    const logicalRow = Math.floor((firstActive.y - 24) / 8);
    const expectedRow = canonicalPlayfield.ringBufferAddress +
      ((head + logicalRow) % canonicalPlayfield.ringRows) * 40;
    const expectedBottomRow = canonicalPlayfield.ringBufferAddress +
      ((head + logicalRow + 1) % canonicalPlayfield.ringRows) * 40;
    assert.ok(firstActive.screenAddress >= expectedRow && firstActive.screenAddress + 1 < expectedRow + 40);
    assert.ok(firstActive.bottomScreenAddress >= expectedBottomRow &&
      firstActive.bottomScreenAddress + 1 < expectedBottomRow + 40);
    assert.deepEqual([
      firstActive.leftCode, firstActive.rightCode,
      firstActive.bottomLeftCode, firstActive.bottomRightCode,
    ], [120, 121, 122, 123]);
  }
});

test("four-cell backing restores byte-exact data in reverse layer order at every A2 head", () => {
  for (let head = 0; head < canonicalPlayfield.ringRows; head += 1) {
    const xex = executeWeaponPickupBackingTrace({ root, artifact: "xex", head });
    const atr = executeWeaponPickupBackingTrace({ root, artifact: "atr", head });
    assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
    assert.deepEqual([
      xex.rendered.leftCode, xex.rendered.rightCode,
      xex.rendered.bottomLeftCode, xex.rendered.bottomRightCode,
      xex.rendered.drawnMask,
    ], [120, 121, 122, 123, 15]);
    assert.deepEqual(xex.rendered.backing, xex.original);
    assert.deepEqual(xex.restored, xex.original);
    assert.deepEqual([
      xex.drawnMaskAfterErase, xex.renderedMaskAfterErase, xex.topLatchAfterErase,
    ], [0, 0, 0]);
    assert.notEqual(xex.top, xex.bottom);
  }
});

test("reverse erase restores every 2x2/2x3 phase across the A2 wrap", () => {
  for (const head of [0, canonicalPlayfield.ringRows - 1]) {
    for (let phase = 0; phase < 8; phase += 1) {
      const trace = executeWeaponPickupBackingTrace({
        root, artifact: "xex", head, y: 104 + phase,
      });
      assert.equal(trace.rendered.rasterPhase, phase);
      assert.equal(trace.hasThirdRow, phase !== 0);
      assert.deepEqual(trace.restored, trace.original,
        `phase ${phase}, head ${head} must restore all physical cells`);
      assert.deepEqual([
        trace.rendered.leftCode, trace.rendered.rightCode,
        trace.rendered.bottomLeftCode, trace.rendered.bottomRightCode,
      ], [120, 121, 122, 123]);
      assert.deepEqual([
        trace.rendered.thirdLeftCode, trace.rendered.thirdRightCode,
      ], phase === 0 ? [0, 0] : [124, 125]);
      const savedBacking = [...trace.rendered.backing,
        ...(phase === 0 ? [] : trace.rendered.thirdBacking)];
      assert.equal(savedBacking.some((code) => (code & 0x7f) >= 120 &&
        (code & 0x7f) <= 125), false, "capsule codes cannot enter backing");
      assert.deepEqual([
        trace.drawnMaskAfterErase, trace.renderedMaskAfterErase,
        trace.topLatchAfterErase,
      ], [0, 0, 0]);
    }
  }
});

test("the main frame has one guarded late pickup publication", () => {
  assert.equal((source.match(/jsr entity_effects_render/g) ?? []).length, 1);
  assert.equal((source.match(/jsr render_weapon_pickup_overlay/g) ?? []).length, 0);
  assert.equal((source.match(/jmp render_weapon_pickup_overlay/g) ?? []).length, 1);
  assert.match(source,
    /main_loop:\n\s+jsr wait_gameplay_frame[\s\S]+wait_gameplay_frame:\n\s+lda ENTITY_STATE\+WEAPON_PICKUP_SLOT\n\s+beq wait_frame\n\s+cmp #WEAPON_PICKUP_STATE_ACTIVE\n\s+beq @visible\n\s+jsr pickup_pending_fence\n\s+bne wait_frame_at_line[\s\S]+@visible:\n\s+lda ENTITY_Y\+WEAPON_PICKUP_SLOT\n\s+lsr[\s\S]+adc #\(WEAPON_PICKUP_HEIGHT_SCANLINES\/2\)[\s\S]+wait_frame:\n\s+ldx #\$70[\s\S]+cpx VCOUNT/);
  assert.match(source,
    /render_weapon_pickup_overlay:[\s\S]+lda ENTITY_DRAWN_MASK\+WEAPON_PICKUP_SLOT[\s\S]+beq :\+[\s\S]+rts/);
  assert.match(source,
    /erase_weapon_pickup_overlay_restore:[\s\S]+ENTITY_SCREEN_HI\+3[\s\S]+ENTITY_VY\+WEAPON_PICKUP_SLOT[\s\S]+ENTITY_SCREEN_LO\+WEAPON_PICKUP_SLOT/);
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

test("one logical footprint survives repeated ring wraps and cannot return after release", () => {
  const xex = executeWeaponPickupRingWrapTrace({ root, artifact: "xex" });
  const atr = executeWeaponPickupRingWrapTrace({ root, artifact: "atr" });
  const summarize = (trace) => ({
    releasedState: trace.releasedState,
    releasedY: trace.releasedY,
    activeMask: trace.activeMask,
    activeCount: trace.activeCount,
    cellsAtRelease: trace.cellsAtRelease,
    cellsAfterAdditionalWraps: trace.cellsAfterAdditionalWraps,
    wrapCount: trace.wrapCount,
    frames: trace.records.map((record) => [
      record.y, record.rasterPhase, record.exactReverseErase,
      record.capsuleCells, record.capsuleFootprints,
      record.logicalSlots, record.finalDrawCalls,
    ]),
  });
  assert.deepEqual(summarize(atr), summarize(xex));
  assert.ok(xex.wrapCount >= 6);
  assert.equal(xex.records.length, 108);
  assert.equal(xex.records.every((record) => record.exactReverseErase &&
    record.capsuleCells === (record.bottomScreenAddress === 0 ? 2 :
      record.thirdScreenAddress === 0 ? 4 : 6) &&
    record.capsuleFootprints === record.logicalSlots &&
    record.logicalSlots === 1 && record.finalDrawCalls === 1), true);
  assert.deepEqual([
    xex.releasedState, xex.releasedY, xex.activeMask, xex.activeCount,
    xex.cellsAtRelease, xex.cellsAfterAdditionalWraps,
  ], [0, 240, 0, 0, 0, 0]);
});

test("EASY MEDIUM and HARD preserve their rates without full-row raster jumps", () => {
  for (const [difficulty, rate] of [[0, 8], [1, 9], [2, 10]]) {
    const trace = executeWeaponPickupRingWrapTrace({
      root, artifact: "xex", difficulty, wrapFramesAfterRelease: 0,
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
  const xex = executeWeaponPickupCollisionTrace({ root, artifact: "xex" });
  const atr = executeWeaponPickupCollisionTrace({ root, artifact: "atr" });
  assert.deepEqual({ artifact: "release", cases: xex }, { artifact: "release", cases: atr });
  assert.equal(xex.every(({ expectedHit, collected }) => expectedHit === collected), true);
  for (const phase of Array.from({ length: 8 }, (_, index) => index)) {
    for (const contact of ["nose", "side", "rear"]) {
      const sample = xex.find(({ name }) => name === `phase_${phase}_${contact}`);
      assert.equal(sample?.collected, true, `${contact} contact failed at phase ${phase}`);
    }
  }
  assert.match(source,
    /cmp #WEAPON_PICKUP_RELEASE_TOP/);
});

test("pickup collection is single-shot and changes neither score, HULL nor LIFE", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
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
  const xex = executeWeaponBoosterHudTrace({ root, artifact: "xex" });
  const atr = executeWeaponBoosterHudTrace({ root, artifact: "atr" });
  const summary = (trace) => ({
    hudOffset: trace.hudOffset,
    hudCells: trace.hudCells,
    hudSegmentsOffset: trace.hudSegmentsOffset,
    fullCode: trace.fullCode,
    fullGlyph: trace.fullGlyph,
    samples: trace.samples,
    paused: trace.paused,
    refreshed: trace.refreshed,
    expired: trace.expired,
    backingBeforeRefresh: trace.backingBeforeRefresh,
    backingAfterRefresh: trace.backingAfterRefresh,
    changedScreenOffsets: trace.changedScreenOffsets,
  });
  assert.deepEqual(summary(xex), summary(atr), "XEX and ATR HUD execution must match");
  assert.deepEqual([
    xex.hudOffset, xex.hudCells, xex.hudSegmentsOffset, xex.hudSegments,
    xex.fullCode, xex.fullGlyph,
  ], [30, 10, 36, 4, 7, [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff]]);
  assert.deepEqual(Object.fromEntries(xex.samples.map(({ name, hudCodes }) =>
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
  assert.deepEqual(xex.paused.map(({ timer, hudCodes }) => [timer, hudCodes]),
    Array.from({ length: 16 }, () => [112, [0, 0, 0, 0]]),
    "pause must freeze both the timer and its current hidden blink phase");
  assert.deepEqual([
    xex.activation.state, xex.activation.timer, xex.activation.hudCodes,
    xex.refreshed.state, xex.refreshed.timer, xex.refreshed.hudCodes,
  ], [3, 500, [7, 7, 7, 7], 4, 500, [7, 7, 7, 7]]);
  assert.deepEqual([
    xex.backingBeforeRefresh, xex.backingAfterRefresh,
    xex.expired.state, xex.expired.timer, xex.expired.hudRegionCodes,
  ], [xex.originalHud, xex.originalHud, 0, 0, xex.originalHud]);
  assert.deepEqual(xex.changedScreenOffsets,
    [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    "activation must not write outside the ten-cell BOOST field");
  assert.equal(xex.samples.every(({ hudRegionCodes }) =>
    hudRegionCodes.slice(0, 6).join() === "34,47,47,51,52,0"), true,
  "the full BOOST label and separator must remain stable while active");
  assert.equal(xex.samples.every(({ hudCodes }) => hudCodes.every((code) =>
    code === 0 || code === xex.fullCode)), true,
  "energy cells may contain only blank or the BOOST segment glyph");
});

test("HULL plates and the ten-cell BOOST field remain distinct at native screen codes", () => {
  const xex = executeHudPresentationTrace({ root, artifact: "xex" });
  const atr = executeHudPresentationTrace({ root, artifact: "atr" });
  const comparable = ({ artifact: _artifact, manifest: _manifest, ...trace }) => trace;
  assert.deepEqual(comparable(xex), comparable(atr));
  assert.deepEqual([
    xex.hullOffset, xex.hullSegments, xex.boosterOffset, xex.boosterCells,
    xex.boosterSegmentsOffset, xex.boosterSegments,
  ], [25, 4, 30, 10, 36, 4]);
  assert.deepEqual([xex.hullOffset - 1, xex.hullOffset + xex.hullSegments,
    xex.boosterSegmentsOffset - 1], [24, 29, 35],
  "the three HULL/BOOST separators must each occupy exactly one cell");
  assert.equal(xex.frames.every(({ display }) =>
    [24, 29, 35].every((column) => display[column] === 0)), true,
  "all three separator cells must stay blank in every rendered state");
  assert.equal(xex.lifecycleDisplays.every(({ display }) =>
    [24, 29, 35].every((column) => display[column] === 0)), true,
  "expiration, new game and respawn must preserve all separator cells");
  assert.equal(xex.frames.every(({ display }) => display.length === 40), true,
  "HUD snapshots must remain exactly inside $4000-$4027");
  assert.equal(xex.frames.every(({ display, hullCodes, boosterCodes }) =>
    display.slice(25, 29).join() === hullCodes.join() &&
    display.slice(30, 40).join() === boosterCodes.join()), true,
  "HULL and BOOST writers must stay inside their disjoint fields");
  assert.deepEqual([
    xex.hullFullGlyph, xex.hullDamagedGlyph, xex.boosterFullGlyph,
  ], [
    [0, 0, 0, 0x3c, 0x7e, 0xff, 0x7e, 0xff],
    [0, 0, 0, 0x3c, 0x42, 0x5a, 0x24, 0xff],
    [0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0xff],
  ]);
  assert.deepEqual(xex.frames.map(({ name, health, timer, boosterState,
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

test("Rapid Fire lasts 500 active frames and keeps its ten-shot accelerated burst", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  assert.deepEqual(trace.normalBurstFrames, [0, 3, 6, 9, 12, 15, 18, 21]);
  assert.deepEqual(trace.rapidBurstFrames, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
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
  ], [8, 10, 8, 3, 2, 500, 10, 6, 1, 2]);
});

test("packed runtime distinguishes 8-shot normal, 10-shot Rapid and 8-salvo Spread", () => {
  const xex = executePlayerFighterBurstBalanceTrace({ root, artifact: "xex" });
  const atr = executePlayerFighterBurstBalanceTrace({ root, artifact: "atr" });
  assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
  const summary = xex.traces.map((mode) => [
    mode.mode, mode.expectedBurst, mode.intervalFrames, mode.postBurstFrames,
    mode.firstBurstSalvos, mode.firstBurstProjectiles, mode.emittedProjectiles,
    mode.maximumPoolOccupancy,
  ]);
  assert.deepEqual(summary, [
    ["NORMAL", 8, 3, 12, 8, 8, 21, 9],
    ["RAPID", 10, 2, 12, 10, 10, 25, 10],
    ["SPREAD", 8, 10, 12, 8, 20, 20, 10],
    ["SHIELD", 8, 3, 12, 8, 8, 21, 9],
  ]);
  const firstBurstFrames = (mode) => mode.records
    .filter(({ allocatedProjectiles }) => allocatedProjectiles > 0)
    .slice(0, mode.expectedBurst)
    .map(({ frame }) => frame);
  assert.deepEqual(firstBurstFrames(xex.traces[0]), [0, 3, 6, 9, 12, 15, 18, 21]);
  assert.deepEqual(firstBurstFrames(xex.traces[1]),
    [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  assert.deepEqual(firstBurstFrames(xex.traces[2]), [0, 10, 20, 30, 40, 50, 60, 70]);
});

test("Normal and Rapid projectiles render through the PlayerFighter yellow bank", () => {
  const xex = executePlayerFighterProjectileColourTrace({ root, artifact: "xex" });
  const atr = executePlayerFighterProjectileColourTrace({ root, artifact: "atr" });
  assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
  assert.deepEqual([
    xex.normalAtSpawn, xex.normalAfterPickup, xex.rapidAtSpawn,
    xex.rapidAfterExpiry, xex.normalAfterExpiry,
  ], [0x01, 0x01, 0x01, 0x01, 0x01]);
  assert.equal(xex.rapidTimerAtSpawn, 500);
  assert.deepEqual(xex.rendered.map(({ activeRenderId, code, screenCodeAfter }) =>
    [activeRenderId, code, screenCodeAfter]), [[1, 15, 15], [1, 15, 15], [1, 15, 15]]);
  assert.deepEqual(xex.rendered.map(({ inverse }) => inverse), [0, 0, 0]);
  assert.equal(new Set(xex.rendered.map(({ glyphCode }) => glyphCode)).size, 1,
    "Normal and Rapid projectiles must use byte-identical glyph geometry");
  assert.deepEqual([xex.normalColour, xex.rapidColour], [0x1e, 0x1e]);
  assert.equal(xex.rendered.every(({ colourRegister, colourValue }) =>
    colourRegister === "COLPF2" && colourValue === 0x1e), true);
  assert.deepEqual([
    xex.interceptorRendered.activeRenderId, xex.interceptorRendered.inverse,
    xex.interceptorRendered.colourRegister, xex.interceptorRendered.colourValue,
  ], [2, 1, "COLPF3", 0x46]);
  const { weapons } = assets();
  assert.deepEqual([
    weapons.player_fighter.widthHpos, weapons.player_fighter.heightScanlines,
    weapons.player_fighter.speedScanlines, weapons.player_fighter.poolSlots,
  ], [1, 2, 6, 10]);
  const collisionPath = source.slice(source.indexOf("update_fighter_projectiles:"),
    source.indexOf("allocate_player_fighter_projectile:"));
  assert.match(collisionPath, /lda FIGHTER_PROJECTILE_ACTIVE,x\s+beq @player_fighter_next/);
  assert.doesNotMatch(collisionPath, /FIGHTER_PROJECTILE_RAPID_COLOR|and #\$7F/);
});

test("packed XEX and ATR keep every implemented PlayerFighter lifecycle path yellow under cold RAM", () => {
  for (const coldFill of [0xa5, 0x5a]) {
    const xex = executePlayerFighterProjectileColourLifecycleTrace({
      root, artifact: "xex", coldFill,
    });
    const atr = executePlayerFighterProjectileColourLifecycleTrace({
      root, artifact: "atr", coldFill,
    });
    assert.deepEqual({ ...xex, artifact: "release" }, { ...atr, artifact: "release" });
    assert.deepEqual(xex.palette, { COLPF2: 0x1e, COLPF3: 0x46 });
    assert.deepEqual(xex.captures.map(({ phase, boosterState, projectiles }) => [
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
      xex.interceptor.activeRenderId, xex.interceptor.inverse,
      xex.interceptor.colourRegister, xex.interceptor.colourValue,
    ], [2, 1, "COLPF3", 0x46]);
  }
});

test("new game, life loss and Game Over clear RF while a live sector transition preserves it", () => {
  const lifecycle = executeWeaponPickupLifecycleTrace({ root, artifact: "xex" });
  for (const record of [lifecycle.newGame, lifecycle.lifeLoss, lifecycle.gameOver,
    lifecycle.sectorPending, lifecycle.sectorActive]) {
    assert.deepEqual([record.state, record.activeMask, record.activeCount], [0, 0, 0]);
    assert.deepEqual(record.hudCodes, [0, 0, 0, 0]);
  }
  assert.deepEqual([
    lifecycle.newGame.qualifiedKillCounter,
    lifecycle.sectorRapid.state, lifecycle.sectorRapid.timer,
  ], [0, 3, 500]);
  assert.deepEqual(lifecycle.sectorRapid.hudCodes, [7, 7, 7, 7]);
});

test("release trace CSV exposes the authoritative counter, state, timing and score", () => {
  const trace = executeWeaponPickupTrace({ root, artifact: "xex" });
  const csv = weaponPickupTraceCsv(trace);
  assert.match(csv, /^artifact,phase,frame,kill,damage_source,projectile_consumed,/);
  assert.match(csv, /xex,KILL_3,0,3,0,1,0,0,0,1,/);
  assert.match(csv, /xex,PICKUP,0,,,0,0,0,0,3,/);
  assert.match(csv, /xex,RAPID_TIMER,499,,,0,0,0,0,0,/);
});
