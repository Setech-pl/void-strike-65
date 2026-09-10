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

function projectileGlyphs(width, horizontalPhases, height) {
  const glyphs = [];
  for (const horizontalPhase of horizontalPhases) {
    for (let verticalPhase = 0; verticalPhase < 8; verticalPhase += 1) {
      const rows = Array(8).fill(0);
      for (let line = 0; line < height && verticalPhase + line < 8; line += 1) {
        for (let pixel = 0; pixel < width; pixel += 1) {
          rows[verticalPhase + line] |= 3 << ((3 - horizontalPhase - pixel) * 2);
        }
      }
      glyphs.push(rows);
    }
    for (let overflowPhase = 8 - height + 1; overflowPhase < 8; overflowPhase += 1) {
      const rows = Array(8).fill(0);
      for (let line = 8 - overflowPhase; line < height; line += 1) {
        for (let pixel = 0; pixel < width; pixel += 1) {
          rows[overflowPhase + line - 8] |= 3 << ((3 - horizontalPhase - pixel) * 2);
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
    invariant(weapon.burstCount === 4, `${id} reduced normal burst must contain exactly four shots`);
    integer(weapon.burstIntervalFrames, `${id}.burstIntervalFrames`, 1, 16);
    integer(weapon.speedScanlines, `${id}.speedScanlines`, 1, 16);
    integer(weapon.widthHpos, `${id}.widthHpos`, 1, 2);
    integer(weapon.heightScanlines, `${id}.heightScanlines`, 1, 3);
    integer(weapon.colourValue, `${id}.colourValue`, 0, 255);
  }
  invariant(definition.player_fighter.postBurstFrames === 12,
    "PlayerFighter post-burst pause must be 12 PAL frames");
  invariant(definition.player_fighter.rapidFireBurstCount === 6 &&
    definition.player_fighter.rapidFireBurstCount <= definition.player_fighter.poolSlots &&
    definition.player_fighter.rapidFireIntervalFrames === 6 &&
    definition.player_fighter.rapidFireDurationFrames === 500,
  "Rapid Fire must use six shots, a six-frame interval and exactly 500 active PAL frames");
  invariant(definition.player_fighter.spreadShotBurstCount === definition.player_fighter.burstCount &&
    definition.player_fighter.spreadShotDurationFrames === 500,
  "Spread Shot must use the eight-salvo normal burst for exactly 500 active PAL frames");
  invariant(definition.player_fighter.shieldDurationFrames === 250,
    "Shield must last exactly 250 active PAL frames");
  invariant(definition.player_fighter.spreadShotProjectileCount === 3,
    "Spread Shot must allocate exactly three logical projectiles");
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
  const player_fighterGlyphs = projectileGlyphs(player_fighter.widthHpos, [0, 1, 2, 3], player_fighter.heightScanlines);
  const interceptorGlyphs = projectileGlyphs(interceptor.widthHpos, [0, 2], interceptor.heightScanlines);
  invariant(player_fighterGlyphs.length === 36 && interceptorGlyphs.length === 20,
    "Fighter projectile phase glyph count changed");
  invariant(definition.glyphLayout.player_fighterBase + player_fighterGlyphs.length <= 59,
    "PlayerFighter projectile glyphs must remain below the capital-hull charset allocation");
  invariant(definition.glyphLayout.interceptorBase >= 90 &&
    definition.glyphLayout.interceptorBase + interceptorGlyphs.length <= 128,
  "Interceptor projectile glyphs must stay in the post-capital charset tail");
  return Object.freeze({
    ...definition,
    interceptor,
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
    "INTERCEPTOR_PROJECTILE_GLYPH_STRIDE = 10",
    `PLAYER_FIGHTER_PROJECTILE_GLYPH_COUNT = ${asset.glyphs.player_fighter.length}`,
    `INTERCEPTOR_PROJECTILE_GLYPH_COUNT = ${asset.glyphs.interceptor.length}`,
    `PLAYER_FIGHTER_PROJECTILE_SLOT_COUNT = ${player_fighter.poolSlots}`,
    `PLAYER_FIGHTER_PROJECTILE_ACTIVE_LIMIT = ${player_fighter.activeLimit}`,
    `INTERCEPTOR_PROJECTILE_SLOT_COUNT = ${interceptor.poolSlots}`,
    `INTERCEPTOR_PROJECTILE_ACTIVE_LIMIT = ${interceptor.activeLimit}`,
    `FIGHTER_PROJECTILE_SLOT_COUNT = ${asset.totalSlots}`,
    `INTERCEPTOR_PROJECTILE_SLOT_BASE = ${player_fighter.poolSlots}`,
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

export function buildInterceptorProjectileGlyphBank(asset, initialBytes) {
  const expectedLength = asset.glyphs.interceptor.length * 8;
  invariant(initialBytes.length === expectedLength,
    `Interceptor projectile glyph bank must contain ${expectedLength} bytes`);
  const bytes = Uint8Array.from(initialBytes);
  bytes.fill(0);
  for (let group = 0; group < 2; group += 1) {
    const mask = group === 0 ? 0xf0 : 0x0f;
    for (let glyph = 0; glyph < 10; glyph += 1) {
      const rows = asset.glyphs.interceptor[group * 10 + glyph];
      for (let row = 0; row < 8; row += 1) {
        if (rows[row] !== 0) bytes[(group * 10 + glyph) * 8 + row] = mask;
      }
    }
  }
  return bytes;
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
