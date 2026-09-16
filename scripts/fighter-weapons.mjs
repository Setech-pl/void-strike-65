import fs from "node:fs";
import { canonicalPlayfield } from "./playfield.mjs";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function integer(value, name, minimum, maximum) {
  invariant(Number.isInteger(value) && value >= minimum && value <= maximum,
    `${name} must be an integer from ${minimum} through ${maximum}`);
  return value;
}

function byte(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function pairShotGlyphs(width, horizontalPhases, pairRows, phaseStride,
  verticalPhases = 0) {
  const glyphs = [];
  for (const horizontalPhase of horizontalPhases) {
    const activeVerticalPhases = (horizontalPhase & 1) === 0 ? verticalPhases : 0;
    for (let phase = 0; phase < phaseStride; phase += 1) {
      const rows = Array(8).fill(0);
      const verticalPhase = phase < activeVerticalPhases ? phase : 0;
      for (const sourceRow of pairRows) {
        const row = activeVerticalPhases === 0 ? sourceRow :
          (sourceRow + verticalPhase - pairRows[0] + 8) & 7;
        for (let pixel = 0; pixel < width; pixel += 1) {
          rows[row] |= 3 << ((3 - horizontalPhase - pixel) * 2);
        }
      }
      glyphs.push(rows);
    }
  }
  return glyphs;
}

function emitGlyphMacro(name, glyphs) {
  return [
    `.macro ${name}`,
    ...glyphs.map((rows) => `    .byte ${rows.map(byte).join(",")}`),
    ".endmacro",
  ];
}

function binaryMask(value, name) {
  invariant(typeof value === "string" && /^[01]{8}$/.test(value),
    `${name} must be an eight-bit binary mask`);
  return Number.parseInt(value, 2);
}

// Hostile projectile visuals are indexed by EnemyArchetype weapon_class (1..N)
// and published as glyphs 89+c (left phase) and 99+c (right phase), so at most
// nine classes fit the ten-glyph phase stride. Each authored glyph occupies
// only the high nibble (ANTIC 4 pixels 0-1) so a two-pixel shift yields the
// right phase, and never uses pixel value %11: that value is the player's
// yellow COLPF2 or, under the hostile bit 7, the red COLPF3 shared with hulls.
export const HOSTILE_WEAPON_VISUAL_IDS = Object.freeze(["PULSE", "LASER"]);
export const HOSTILE_WEAPON_VISUAL_MAX_CLASSES = 9;

function hostileWeaponVisualRows(visuals) {
  const classes = visuals?.classes;
  invariant(Array.isArray(classes) && classes.length >= 1 &&
    classes.length <= HOSTILE_WEAPON_VISUAL_MAX_CLASSES,
  `hostileWeaponVisuals.classes must contain 1-${HOSTILE_WEAPON_VISUAL_MAX_CLASSES} weapon classes`);
  return classes.map((entry, index) => {
    const name = `hostileWeaponVisuals.classes[${index}]`;
    invariant(entry?.weaponClass === index + 1,
      `${name}.weaponClass must be ${index + 1}: classes are authored in id order from 1`);
    invariant(index >= HOSTILE_WEAPON_VISUAL_IDS.length || entry.id === HOSTILE_WEAPON_VISUAL_IDS[index],
      `${name}.id must be ${HOSTILE_WEAPON_VISUAL_IDS[index]} (ENEMY_WEAPON_* in src/c/enemy-archetype.h)`);
    invariant(Array.isArray(entry.leftPhaseRows) && entry.leftPhaseRows.length === 8,
      `${name}.leftPhaseRows must contain 8 rows`);
    const rows = entry.leftPhaseRows.map((mask, row) => binaryMask(mask, `${name}.leftPhaseRows[${row}]`));
    rows.forEach((value, row) => {
      invariant((value & 0x0f) === 0,
        `${name}.leftPhaseRows[${row}] must stay in the high nibble (two colour clocks)`);
      invariant((value & 0xc0) !== 0xc0 && (value & 0x30) !== 0x30,
        `${name}.leftPhaseRows[${row}] must not use pixel value %11`);
    });
    invariant(rows.some((value) => value !== 0), `${name} must draw at least one pixel`);
    return rows;
  });
}

export function loadFighterWeaponsDefinition(sourcePath) {
  const definition = {
    ...JSON.parse(fs.readFileSync(sourcePath, "utf8")),
    viewport: canonicalPlayfield,
  };
  invariant(definition.formatVersion === 1, "Unsupported fighter-weapons formatVersion");
  const viewport = definition.viewport;
  integer(viewport?.activeImageTop, "viewport.activeImageTop", 0, 32);
  integer(viewport?.hudRows, "viewport.hudRows", 1, 4);
  integer(viewport?.gameplayRows, "viewport.gameplayRows", 1, 32);
  invariant(viewport.screenColumns === 40, "Gameplay viewport must remain 40 columns");
  invariant(viewport.leftHpos === 48, "Gameplay HPOS origin must remain 48");

  for (const [id, weapon] of [["player_fighter", definition.player_fighter]]) {
    integer(weapon?.poolSlots, `${id}.poolSlots`, 1, 16);
    integer(weapon.activeLimit, `${id}.activeLimit`, 1, weapon.poolSlots);
    invariant(weapon.visiblePulsesPerObject === 2,
      `${id} PairShot must depict exactly two visible pulses`);
    invariant(Array.isArray(weapon.pairGlyphRows) &&
      weapon.pairGlyphRows.join(",") === "1,2,5,6",
    `${id} PairShot base phase must contain two two-row impulses`);
    invariant(weapon.verticalPhases === 8,
      `${id} PairShot must encode every logical scanline phase`);
    invariant(weapon.burstCount === 4 && weapon.visibleBurstPulses === 8,
      `${id} normal burst must contain four PairShots / eight visible pulses`);
    integer(weapon.burstIntervalFrames, `${id}.burstIntervalFrames`, 1, 16);
    integer(weapon.speedScanlines, `${id}.speedScanlines`, 1, 16);
    integer(weapon.widthHpos, `${id}.widthHpos`, 1, 2);
    integer(weapon.heightScanlines, `${id}.heightScanlines`, 1, 3);
    integer(weapon.colourValue, `${id}.colourValue`, 0, 255);
  }
  invariant(definition.player_fighter.postBurstFrames === 12,
    "PlayerFighter post-burst pause must be 12 PAL frames");
  invariant(definition.player_fighter.rapidFireBurstCount === 5 &&
    definition.player_fighter.rapidFireVisiblePulses === 10 &&
    definition.player_fighter.rapidFireBurstCount <= definition.player_fighter.poolSlots &&
    definition.player_fighter.rapidFireIntervalFrames === 6 &&
    definition.player_fighter.rapidFireDurationFrames === 500,
  "Rapid Fire must use five PairShots / ten pulses, a six-frame interval and exactly 500 active PAL frames");
  // Spread opens with a simultaneous left/centre/right volley and then fires a
  // single centre follow-up, so the burst is two fire events rather than four.
  // The owner-accepted accounting is unchanged: the volley plus the follow-up
  // are still four logical PairShots and eight visible pulses.
  const spreadPairShots = definition.player_fighter.spreadShotProjectileCount +
    (definition.player_fighter.spreadShotBurstCount - 1);
  invariant(spreadPairShots === definition.player_fighter.burstCount &&
    definition.player_fighter.spreadShotVisiblePulses === 8 &&
    definition.player_fighter.spreadShotDurationFrames === 500,
  "Spread Shot must still total four PairShots / eight pulses for exactly 500 active PAL frames");
  invariant(definition.player_fighter.spreadShotProjectileCount <=
    definition.player_fighter.poolSlots - 1,
  "A Spread volley must leave a pool slot for the centre follow-up");
  invariant(definition.player_fighter.shieldDurationFrames === 250,
    "Shield must last exactly 250 active PAL frames");
  invariant(definition.player_fighter.spreadShotProjectileCount === 3,
    "A Spread volley must allocate left, centre and right together");
  invariant(definition.player_fighter.spreadShotCooldownFrames === 28,
    "Spread Shot cooldown must preserve the reduced player-fire cadence");
  invariant(definition.player_fighter.spreadShotInitialOffsetHpos === 4,
    "Spread Shot side projectiles must start one character from the centre shot");
  invariant(definition.player_fighter.spreadShotLateralStepHpos === 1 &&
    definition.player_fighter.spreadShotLateralPeriodFrames === 2,
  "Spread Shot side projectiles must move one HPOS unit every two active frames");
  invariant(definition.player_fighter.colourRegister === "COLPF2" &&
    definition.player_fighter.colourValue === 0x1e,
  "PlayerFighter projectiles must use genuine Atari yellow through COLPF2=$1E");
  invariant(definition.player_fighter.rapidFireColourRegister === definition.player_fighter.colourRegister &&
    definition.player_fighter.rapidFireColourValue === definition.player_fighter.colourValue,
  "Rapid Fire projectiles must remain in the PlayerFighter's yellow COLPF2 bank");
  integer(definition.glyphLayout?.player_fighterBase, "glyphLayout.player_fighterBase", 0, 127);
  integer(definition.glyphLayout?.interceptorBase, "glyphLayout.interceptorBase", 0, 127);
  hostileWeaponVisualRows(definition.hostileWeaponVisuals);
  const explosion = definition.sharedFighterExplosion;
  invariant(explosion?.frameDurationFrames === 4,
    "Shared fighter explosion frames must last four PAL frames");
  invariant(explosion.heightScanlines === 8 && explosion.widthBits === 8,
    "Shared fighter explosion must remain an 8x8 native PMG mask");
  invariant(Array.isArray(explosion.outerMasks) && explosion.outerMasks.length === 6,
    "Shared fighter explosion must contain six visual phases");
  for (const [frameIndex, frame] of explosion.outerMasks.entries()) {
    invariant(Array.isArray(frame) && frame.length === explosion.heightScanlines,
      `sharedFighterExplosion.outerMasks[${frameIndex}] must contain 8 rows`);
    frame.forEach((mask, row) => binaryMask(mask,
      `sharedFighterExplosion.outerMasks[${frameIndex}][${row}]`));
  }
  invariant(Array.isArray(explosion.coreMasks) && explosion.coreMasks.length === 6,
    "Shared fighter explosion needs one core mask per phase");
  explosion.coreMasks.forEach((mask, index) =>
    integer(mask, `sharedFighterExplosion.coreMasks[${index}]`, 0, 255));
  return definition;
}

export function compileFighterWeapons(definition, enemyRoster) {
  const pulse = enemyRoster?.runtime?.weaponPolicy?.singlePulse;
  invariant(pulse?.renderer === "ANTIC4_GLYPH_POOL",
    "Fighter weapons require the Interceptor ANTIC 4 glyph-pool policy");
  invariant(pulse.visiblePulsesPerObject === 2 &&
    pulse.pairGlyphRows?.join(",") === "1,2,5,6",
  "Interceptor fire must use the shared one-cell two-pulse PairShot form");
  const interceptor = Object.freeze({
    poolSlots: pulse.poolSlots,
    activeLimit: pulse.activeLimit,
    burstCount: pulse.burstCount,
    burstIntervalFrames: pulse.burstIntervalFrames,
    postBurstFrames: pulse.postBurstFrames,
    speedScanlines: pulse.speed,
    widthHpos: pulse.widthHpos,
    heightScanlines: pulse.height,
    damage: pulse.damage,
    lifetimeFrames: pulse.lifetimeFrames,
    colourRegister: pulse.colourRegister,
    colourValue: pulse.colourValue,
    visiblePulsesPerObject: pulse.visiblePulsesPerObject,
    pairGlyphRows: pulse.pairGlyphRows,
  });
  const player_fighter = definition.player_fighter;
  const activeImageTop = definition.viewport.activeImageTop;
  const hudTop = activeImageTop;
  const hudBottom = hudTop + definition.viewport.hudRows * 8;
  const gameplayTop = hudBottom;
  const gameplayBottom = gameplayTop + definition.viewport.gameplayRows * 8;
  const totalSlots = definition.player_fighter.poolSlots + interceptor.poolSlots;
  const explosion = Object.freeze({
    frameCount: definition.sharedFighterExplosion.outerMasks.length,
    frameDurationFrames: definition.sharedFighterExplosion.frameDurationFrames,
    totalFrames: definition.sharedFighterExplosion.outerMasks.length *
      definition.sharedFighterExplosion.frameDurationFrames,
    heightScanlines: definition.sharedFighterExplosion.heightScanlines,
    widthBits: definition.sharedFighterExplosion.widthBits,
    outerBytes: Uint8Array.from(definition.sharedFighterExplosion.outerMasks.flatMap(
      (frame) => frame.map((mask) => binaryMask(mask, "sharedFighterExplosion mask")))),
    coreMasks: Uint8Array.from(definition.sharedFighterExplosion.coreMasks),
    slots: 2,
  });
  const player_fighterGlyphs = pairShotGlyphs(player_fighter.widthHpos, [0, 1, 2, 3],
    player_fighter.pairGlyphRows, 9, player_fighter.verticalPhases);
  const interceptorGlyphs = pairShotGlyphs(interceptor.widthHpos, [0, 2],
    interceptor.pairGlyphRows, 10);
  invariant(player_fighterGlyphs.length === 36 && interceptorGlyphs.length === 20,
    "Fighter projectile phase glyph count changed");
  invariant(definition.glyphLayout.player_fighterBase + player_fighterGlyphs.length <= 59,
    "PlayerFighter projectile glyphs must remain below the capital-hull charset allocation");
  invariant(definition.glyphLayout.interceptorBase >= 90 &&
    definition.glyphLayout.interceptorBase + interceptorGlyphs.length <= 128,
  "Interceptor projectile glyphs must stay in the post-capital charset tail");
  const hostileWeaponVisuals = hostileWeaponVisualRows(definition.hostileWeaponVisuals);
  invariant(definition.glyphLayout.interceptorBase === 90 &&
    hostileWeaponVisuals.length < interceptorGlyphs.length / 2,
  "Hostile weapon visuals must publish inside glyphs 90-109 at base 89 + weapon_class");
  return Object.freeze({
    ...definition,
    interceptor,
    hostileWeaponVisuals: Object.freeze(hostileWeaponVisuals),
    viewport: Object.freeze({
      ...definition.viewport,
      hudTop,
      hudBottom,
      gameplayTop,
      gameplayBottom,
    }),
    totalSlots,
    stateBytes: totalSlots * 10 + 6 + explosion.slots * 3,
    sharedFighterExplosion: explosion,
    glyphs: Object.freeze({ player_fighter: player_fighterGlyphs, interceptor: interceptorGlyphs }),
  });
}

export function renderFighterWeaponsCa65Include(asset) {
  const { viewport, player_fighter, interceptor, sharedFighterExplosion: explosion } = asset;
  return [
    "; Generated from assets/graphics/fighter-weapons.json by scripts/fighter-weapons.mjs.",
    "; Do not edit this file by hand.",
    `HUD_TOP = ${viewport.hudTop}`,
    `HUD_BOTTOM = ${viewport.hudBottom}`,
    `GAMEPLAY_TOP = ${viewport.gameplayTop}`,
    `GAMEPLAY_BOTTOM = ${viewport.gameplayBottom}`,
    `GAMEPLAY_SCREEN_ROWS = ${viewport.gameplayRows}`,
    `GAMEPLAY_SCREEN_COLUMNS = ${viewport.screenColumns}`,
    `GAMEPLAY_LEFT_HPOS = ${viewport.leftHpos}`,
    `PLAYER_FIGHTER_PROJECTILE_GLYPH_BASE = ${asset.glyphLayout.player_fighterBase}`,
    `INTERCEPTOR_PROJECTILE_GLYPH_BASE = ${asset.glyphLayout.interceptorBase}`,
    "PLAYER_FIGHTER_PROJECTILE_GLYPH_STRIDE = 9",
    `PLAYER_FIGHTER_PROJECTILE_VERTICAL_PHASE_COUNT = ${player_fighter.verticalPhases}`,
    "INTERCEPTOR_PROJECTILE_GLYPH_STRIDE = 10",
    `PLAYER_FIGHTER_PROJECTILE_GLYPH_COUNT = ${asset.glyphs.player_fighter.length}`,
    `INTERCEPTOR_PROJECTILE_GLYPH_COUNT = ${asset.glyphs.interceptor.length}`,
    `HOSTILE_WEAPON_VISUAL_COUNT = ${asset.hostileWeaponVisuals.length}`,
    `PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT = ${player_fighter.poolSlots}`,
    `PLAYER_FIGHTER_PROJECTILE_ACTIVE_LIMIT = ${player_fighter.activeLimit}`,
    `INTERCEPTOR_PROJECTILE_SLOT_COUNT = ${interceptor.poolSlots}`,
    `INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT = ${interceptor.activeLimit}`,
    `FIGHTER_PROJECTILE_SLOT_COUNT = ${asset.totalSlots}`,
    `INTERCEPTOR_PROJECTILE_SLOT_BASE = ${player_fighter.poolSlots}`,
    `PAIRSHOT_VISIBLE_PULSES_PER_OBJECT = ${player_fighter.visiblePulsesPerObject}`,
    `PLAYER_FIGHTER_NORMAL_VISIBLE_PULSES = ${player_fighter.visibleBurstPulses}`,
    `PLAYER_FIGHTER_RAPID_VISIBLE_PULSES = ${player_fighter.rapidFireVisiblePulses}`,
    `PLAYER_FIGHTER_SPREAD_VISIBLE_PULSES = ${player_fighter.spreadShotVisiblePulses}`,
    "WEAPON_BURST_WAITING = 0",
    "WEAPON_BURST_FIRING = 1",
    "WEAPON_BURST_POST = 2",
    `PLAYER_FIGHTER_NORMAL_BURST_COUNT = ${player_fighter.burstCount}`,
    `PLAYER_FIGHTER_RAPID_FIRE_BURST_COUNT = ${player_fighter.rapidFireBurstCount}`,
    `PLAYER_FIGHTER_SPREAD_BURST_COUNT = ${player_fighter.spreadShotBurstCount}`,
    `PLAYER_FIGHTER_SPREAD_COOLDOWN = ${player_fighter.spreadShotCooldownFrames}`,
    `PLAYER_FIGHTER_BURST_INTERVAL = ${player_fighter.burstIntervalFrames}`,
    `PLAYER_FIGHTER_RAPID_FIRE_INTERVAL = ${player_fighter.rapidFireIntervalFrames}`,
    `PLAYER_FIGHTER_RAPID_FIRE_DURATION = ${player_fighter.rapidFireDurationFrames}`,
    `PLAYER_FIGHTER_SPREAD_SHOT_DURATION = ${player_fighter.spreadShotDurationFrames}`,
    `PLAYER_FIGHTER_SHIELD_DURATION = ${player_fighter.shieldDurationFrames}`,
    `PLAYER_FIGHTER_SPREAD_PROJECTILE_COUNT = ${player_fighter.spreadShotProjectileCount}`,
    `PLAYER_FIGHTER_SPREAD_INITIAL_OFFSET = ${player_fighter.spreadShotInitialOffsetHpos}`,
    `PLAYER_FIGHTER_SPREAD_LATERAL_STEP = ${player_fighter.spreadShotLateralStepHpos}`,
    `PLAYER_FIGHTER_SPREAD_LATERAL_PERIOD = ${player_fighter.spreadShotLateralPeriodFrames}`,
    `PLAYER_FIGHTER_POST_BURST_PAUSE = ${player_fighter.postBurstFrames}`,
    `PLAYER_FIGHTER_PROJECTILE_SPEED = ${player_fighter.speedScanlines}`,
    `PLAYER_FIGHTER_PROJECTILE_WIDTH_HPOS = ${player_fighter.widthHpos}`,
    `PLAYER_FIGHTER_PROJECTILE_HEIGHT = ${player_fighter.heightScanlines}`,
    `PLAYER_FIGHTER_PROJECTILE_COLOR = ${byte(player_fighter.colourValue)}`,
    `PLAYER_FIGHTER_RAPID_FIRE_PROJECTILE_COLOR = ${byte(player_fighter.rapidFireColourValue)}`,
    `INTERCEPTOR_BURST_COUNT = ${interceptor.burstCount}`,
    `INTERCEPTOR_BURST_INTERVAL = ${interceptor.burstIntervalFrames}`,
    `INTERCEPTOR_POST_BURST_EASY = ${interceptor.postBurstFrames[0]}`,
    `INTERCEPTOR_POST_BURST_MEDIUM = ${interceptor.postBurstFrames[1]}`,
    `INTERCEPTOR_POST_BURST_HARD = ${interceptor.postBurstFrames[2]}`,
    `INTERCEPTOR_PROJECTILE_SPEED = ${interceptor.speedScanlines}`,
    `INTERCEPTOR_PROJECTILE_WIDTH_HPOS = ${interceptor.widthHpos}`,
    `INTERCEPTOR_PROJECTILE_HEIGHT = ${interceptor.heightScanlines}`,
    `INTERCEPTOR_PROJECTILE_DAMAGE = ${interceptor.damage}`,
    `INTERCEPTOR_PROJECTILE_LIFETIME = ${interceptor.lifetimeFrames}`,
    `INTERCEPTOR_PROJECTILE_COLOR = ${byte(interceptor.colourValue)}`,
    `SHARED_FIGHTER_EXPLOSION_FRAME_COUNT = ${explosion.frameCount}`,
    `SHARED_FIGHTER_EXPLOSION_FRAME_DURATION = ${explosion.frameDurationFrames}`,
    `SHARED_FIGHTER_EXPLOSION_TOTAL = ${explosion.totalFrames}`,
    `SHARED_FIGHTER_EXPLOSION_HEIGHT = ${explosion.heightScanlines}`,
    `SHARED_FIGHTER_EXPLOSION_WIDTH_BITS = ${explosion.widthBits}`,
    `SHARED_FIGHTER_EXPLOSION_SLOT_COUNT = ${explosion.slots}`,
    "",
    ...emitGlyphMacro("EMIT_PLAYER_FIGHTER_PROJECTILE_GLYPHS", asset.glyphs.player_fighter),
    "",
    ...emitGlyphMacro("EMIT_PLAYER_FIGHTER_PROJECTILE_GLYPHS_HEAD", asset.glyphs.player_fighter.slice(0, 5)),
    "",
    ...emitGlyphMacro("EMIT_PLAYER_FIGHTER_PROJECTILE_GLYPHS_TAIL", asset.glyphs.player_fighter.slice(5)),
    "",
    ...emitGlyphMacro("EMIT_INTERCEPTOR_PROJECTILE_GLYPHS", asset.glyphs.interceptor),
    "",
    ...emitGlyphMacro("EMIT_HOSTILE_WEAPON_VISUAL_GLYPHS", asset.hostileWeaponVisuals),
    "",
    `.macro EMIT_SHARED_FIGHTER_EXPLOSION_MASKS\n    .byte ${[...explosion.outerBytes].map(byte).join(",")}\n.endmacro`,
    `.macro EMIT_SHARED_FIGHTER_EXPLOSION_CORE_MASKS\n    .byte ${[...explosion.coreMasks].map(byte).join(",")}\n.endmacro`,
    "",
  ].join("\n");
}

export function createSharedFighterExplosion(asset, { x, y, owner = "INTERCEPTOR" }) {
  const explosion = asset.sharedFighterExplosion;
  invariant(Number.isInteger(x) && Number.isInteger(y),
    "Shared fighter explosion requires a stable integer centre");
  return { active: true, owner, x, y, timer: explosion.totalFrames, frame: 0 };
}

export function stepSharedFighterExplosion(asset, state) {
  if (!state.active) return { ...state };
  const timer = state.timer - 1;
  if (timer <= 0) return { ...state, active: false, timer: 0,
    frame: asset.sharedFighterExplosion.frameCount };
  const elapsed = asset.sharedFighterExplosion.totalFrames - timer;
  return { ...state, timer,
    frame: Math.floor(elapsed / asset.sharedFighterExplosion.frameDurationFrames) };
}

export function renderSharedFighterExplosionPmg(asset, state, {
  outer = new Uint8Array(256),
  core = new Uint8Array(256),
} = {}) {
  invariant(outer.length === 256 && core.length === 256,
    "Shared fighter explosion PMG buffers must contain 256 scanlines");
  const nextOuter = Uint8Array.from(outer);
  const nextCore = Uint8Array.from(core);
  const explosion = asset.sharedFighterExplosion;
  for (let row = 0; row < explosion.heightScanlines; row += 1) {
    const y = state.y + row;
    if (y < asset.viewport.gameplayTop || y >= asset.viewport.gameplayBottom) continue;
    nextOuter[y] = 0;
    nextCore[y] = 0;
  }
  if (!state.active || state.frame >= explosion.frameCount) {
    return { outer: nextOuter, core: nextCore };
  }
  const frameOffset = state.frame * explosion.heightScanlines;
  const coreMask = explosion.coreMasks[state.frame];
  for (let row = 0; row < explosion.heightScanlines; row += 1) {
    const y = state.y + row;
    if (y < asset.viewport.gameplayTop || y >= asset.viewport.gameplayBottom) continue;
    const mask = explosion.outerBytes[frameOffset + row];
    nextOuter[y] = mask;
    nextCore[y] = mask & coreMask;
  }
  return { outer: nextOuter, core: nextCore };
}

// Model of build_interceptor_projectile_glyphs: the twenty-glyph bank 90-109
// as the runtime leaves it. Class c (1..N) is written at glyph 89+c from the
// authored left phase and at 99+c shifted right by two ANTIC 4 pixels; every
// other glyph keeps its initial bytes and is never published.
export function buildInterceptorProjectileGlyphBank(asset, initialBytes) {
  const expectedLength = asset.glyphs.interceptor.length * 8;
  invariant(initialBytes.length === expectedLength,
    `Interceptor projectile glyph bank must contain ${expectedLength} bytes`);
  const bytes = Uint8Array.from(initialBytes);
  asset.hostileWeaponVisuals.forEach((rows, index) => {
    for (let row = 0; row < 8; row += 1) {
      bytes[index * 8 + row] = rows[row];
      bytes[(10 + index) * 8 + row] = rows[row] >> 4;
    }
  });
  return bytes;
}

// Screen code the renderer publishes for a hostile slot:
// (89 + (ACTIVE >> 3) + (X & 2 ? 10 : 0)) | $80.
export function hostileProjectileScreenCode(active, x) {
  return (89 + (active >> 3) + ((x & 2) !== 0 ? 10 : 0)) | 0x80;
}

export function createPlayerFighterBurstState(asset) {
  return {
    frame: 0,
    burstState: "WAITING",
    burstRemaining: 0,
    timer: 0,
    shotsEmitted: 0,
    pool: Array(asset.player_fighter.poolSlots).fill(null),
  };
}

export function stepPlayerFighterBurst(asset, state, {
  fireHeld = true,
  weaponMode = "NORMAL",
  playerX = 124,
  playerY = 184,
  gameplayActive = true,
  drain = false,
  sectorComplete = false,
  playerVisibleWidthHpos = 16,
} = {}) {
  invariant(["NORMAL", "RAPID"].includes(weaponMode),
    "PlayerFighter burst simulation supports NORMAL or RAPID mode");
  const burstCount = weaponMode === "RAPID"
    ? asset.player_fighter.rapidFireBurstCount : asset.player_fighter.burstCount;
  const burstInterval = weaponMode === "RAPID"
    ? asset.player_fighter.rapidFireIntervalFrames : asset.player_fighter.burstIntervalFrames;
  const next = {
    ...state,
    frame: state.frame + 1,
    pool: state.pool.map((shot) => shot && { ...shot }),
  };
  for (let index = 0; index < next.pool.length; index += 1) {
    const shot = next.pool[index];
    if (!shot) continue;
    shot.previousY = shot.y;
    shot.y -= asset.player_fighter.speedScanlines;
    if (shot.y < asset.viewport.gameplayTop) next.pool[index] = null;
  }
  if (!gameplayActive) {
    next.pool.fill(null);
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.timer = 0;
    return next;
  }
  // DRAIN and COMPLETE remain ordinary playable PAL frames for the PlayerFighter
  // weapon. They stop hull/cannon generation, not fighter fire. Keeping both
  // options explicit makes the natural transition test cover the release path.
  void drain;
  void sectorComplete;
  if (!fireHeld) {
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.timer = 0;
    return next;
  }
  if (next.burstState === "WAITING") {
    next.burstState = "FIRING_BURST";
    next.burstRemaining = burstCount;
    next.timer = 0;
  } else if (next.burstState === "POST_BURST_COOLDOWN") {
    if (next.timer > 0) next.timer -= 1;
    if (next.timer > 0) return next;
    next.burstState = "FIRING_BURST";
    next.burstRemaining = burstCount;
  }
  if (next.timer > 0) next.timer -= 1;
  if (next.timer > 0) return next;
  const slot = next.pool.findIndex((shot, index) =>
    index < asset.player_fighter.activeLimit && shot === null);
  if (slot < 0) return next;
  next.pool[slot] = {
    owner: "PLAYER_FIGHTER",
    x: playerX + playerVisibleWidthHpos / 2,
    y: playerY - asset.player_fighter.heightScanlines,
    previousY: playerY - asset.player_fighter.heightScanlines,
    width: asset.player_fighter.widthHpos,
    height: asset.player_fighter.heightScanlines,
    colour: asset.player_fighter.colourValue,
  };
  next.shotsEmitted += 1;
  next.burstRemaining -= 1;
  if (next.burstRemaining === 0) {
    next.burstState = "POST_BURST_COOLDOWN";
    next.timer = asset.player_fighter.postBurstFrames;
  } else {
    next.timer = burstInterval;
  }
  return next;
}

export function simulatePlayerFighterBurst(asset, frameCount, options = {}) {
  let state = createPlayerFighterBurstState(asset);
  const trace = [];
  for (let frame = 1; frame <= frameCount; frame += 1) {
    const before = state.shotsEmitted;
    state = stepPlayerFighterBurst(asset, state, options);
    trace.push({
      frame,
      burstState: state.burstState,
      burstRemaining: state.burstRemaining,
      timer: state.timer,
      allocationResult: state.shotsEmitted > before ? "ALLOCATED" : "NONE",
      shotsEmitted: state.shotsEmitted,
      active: state.pool.filter(Boolean).map((shot) => ({ ...shot })),
    });
  }
  return { state, trace };
}
