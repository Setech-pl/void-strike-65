import { canonicalPlayfield } from "./playfield.mjs";

export const BROADSIDE_STATES = Object.freeze({ FREE: 0, WARNING: 1, FLYING: 2, IMPACT: 3 });
export const BROADSIDE_OWNERS = Object.freeze({ allied: 0, enemy: 1 });
export const MISSILE_MASKS = Object.freeze([0x03, 0x0c, 0x30, 0xc0]);
export const MISSILE_CLEAR_MASKS = Object.freeze([0xfc, 0xf3, 0xcf, 0x3f]);
export const MISSILE_COLORS = Object.freeze([0x0e, 0x84, 0x46, 0x28]);
export const BROADSIDE_SLOT_COUNT = 3;
export const HULL_SCROLL_DIFFICULTIES = Object.freeze({
  easy: 0,
  medium: 1,
  hard: 2,
});
export const PMG_LEFT_EDGE = 48;
export const PMG_SCREEN_TOP = 8;
export const GAMEPLAY_FIRST_HULL_ROW = 1;
export const GAMEPLAY_HULL_ROWS = canonicalPlayfield.gameplayRows;
export const BROADSIDE_WARNING_Y_MAX = canonicalPlayfield.gameplayBottom - 9;
export const CAPITAL_SECTOR_STATES = Object.freeze({
  ENGINES: 0,
  AFT: 1,
  COMBAT: 2,
  FORWARD: 3,
  PROW: 4,
  DRAIN: 5,
  COMPLETE: 6,
  OPEN: 7,
});
export const PLAYER_LIFECYCLE_STATES = Object.freeze({
  ALIVE: 0,
  DYING: 1,
  RESPAWN_INVULNERABLE: 2,
  GAME_OVER: 3,
});
export const PLAYER_RESPAWN_X = 124;
export const PLAYER_RESPAWN_Y = canonicalPlayfield.gameplayBottom - 15;
export const SHARED_FIGHTER_EXPLOSION_TOTAL = 24;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function updateMissileByte(current, missile, visible) {
  invariant(Number.isInteger(missile) && missile >= 0 && missile <= 3,
    "Missile index must be M0 through M3");
  const cleared = current & MISSILE_CLEAR_MASKS[missile];
  return visible ? cleared | MISSILE_MASKS[missile] : cleared;
}

export function updateMissileSize(current, missile, size) {
  invariant(Number.isInteger(missile) && missile >= 0 && missile <= 3,
    "Missile size index must be M0 through M3");
  invariant([0, 1, 3].includes(size), "GTIA missile size must be normal, double, or quadruple");
  const shift = missile * 2;
  return (current & ~(3 << shift)) | (size << shift);
}

export function missileWidth(size) {
  invariant([0, 1, 3].includes(size), "GTIA missile size must be normal, double, or quadruple");
  return size === 0 ? 1 : size === 1 ? 2 : 4;
}

export function warningVisual(slot, asset) {
  invariant(slot.state === BROADSIDE_STATES.WARNING, "Warning visual requires a WARNING slot");
  invariant(slot.timer >= 1 && slot.timer <= asset.broadside.warningFrames,
    "Warning timer lies outside its visible 25-frame sequence");
  const elapsed = asset.broadside.warningFrames - slot.timer;
  let phase;
  let height;
  let size;
  if (elapsed < asset.broadside.warningEarlyFrames) {
    phase = "early";
    height = asset.broadside.warningEarlyHeight;
    size = 0;
  } else if (elapsed < asset.broadside.warningEarlyFrames + asset.broadside.warningMediumFrames) {
    phase = "medium";
    height = asset.broadside.warningMediumHeight;
    size = 1;
  } else {
    phase = "hot";
    height = asset.broadside.warningHeight;
    const remainingHotTimer = slot.timer;
    const pulseGroup = Math.floor((remainingHotTimer - 1) /
      asset.broadside.warningPulsePeriodFrames);
    size = pulseGroup & 1 ? 3 : 1;
  }
  const width = missileWidth(size);
  return {
    phase,
    height,
    size,
    width,
    x: slot.x + (slot.owner === "enemy" ? 2 - width : 0),
    y: slot.y,
    top: slot.y - Math.floor(height / 2),
    area: width * height,
    visible: true,
  };
}

export function centeredSpanTop(centerY, height) {
  invariant(Number.isInteger(height) && height > 0,
    "Broadside spans require a positive height");
  return centerY - Math.floor(height / 2);
}

export function muzzlePosition(turret, visibleScreenRow = 1 + turret.segmentRow) {
  invariant(visibleScreenRow >= GAMEPLAY_FIRST_HULL_ROW &&
    visibleScreenRow < GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS,
  "Turret is outside gameplay rows");
  return {
    x: PMG_LEFT_EDGE + turret.muzzleColumn * 4 + (turret.side === "allied" ? 4 : 0),
    y: PMG_SCREEN_TOP + visibleScreenRow * 8 + turret.muzzleScanlineOffset,
    direction: turret.side === "allied" ? 1 : -1,
  };
}

export function hullBoundary(asset, side, segmentRow) {
  const row = asset.decodedMaps.get(side)[segmentRow & (asset.segmentRows - 1)];
  if (side === "enemy") {
    const relative = row.findIndex((screenCode) => screenCode !== 0);
    invariant(relative >= 0, "Enemy hull row has no solid cell");
    return PMG_LEFT_EDGE + (31 + relative) * 4;
  }
  let relative = row.length - 1;
  while (relative >= 0 && row[relative] === 0) relative -= 1;
  invariant(relative >= 0, "Allied hull row has no solid cell");
  return PMG_LEFT_EDGE + (relative + 1) * 4;
}

export function sectorRowForSide(asset, side, leftSectorRow) {
  if (!Number.isInteger(leftSectorRow)) return null;
  const row = leftSectorRow - (side === "enemy" ? asset.sector.sidePhaseRows : 0);
  return row >= 0 && row < asset.sector.totalRows ? row : null;
}

export function sectorHullBoundary(asset, side, leftSectorRow) {
  const sideRow = sectorRowForSide(asset, side, leftSectorRow);
  if (sideRow === null) return side === "allied" ? PMG_LEFT_EDGE : 208;
  const row = asset.sector.sectorScreenRowsBySide.get(side)[sideRow];
  if (side === "enemy") {
    const relative = row.findIndex((screenCode) => screenCode !== 0);
    invariant(relative >= 0, "Enemy sector row has no solid cell");
    return PMG_LEFT_EDGE + (31 + relative) * 4;
  }
  let relative = row.length - 1;
  while (relative >= 0 && row[relative] === 0) relative -= 1;
  invariant(relative >= 0, "Allied sector row has no solid cell");
  return PMG_LEFT_EDGE + (relative + 1) * 4;
}

export function createBroadsideState(asset) {
  return {
    slots: Array.from({ length: BROADSIDE_SLOT_COUNT }, (_, index) => ({
      slot: index,
      missile: index + 1,
      state: BROADSIDE_STATES.FREE,
      owner: undefined,
      turretId: undefined,
      x: 0,
      y: 0,
      timer: 0,
    })),
    health: 100,
    lives: asset.broadside.playerStartingLives,
    playerLifecycle: PLAYER_LIFECYCLE_STATES.ALIVE,
    deathTimer: 0,
    respawnInvulnerabilityTimer: 0,
    respawnBlinkFrame: 0,
    playerVisible: true,
    playerX: PLAYER_RESPAWN_X,
    playerY: PLAYER_RESPAWN_Y,
    latchedPlayerCollision: false,
    damageCooldown: 0,
    damageFrame: -1,
    alliedHullHits: 0,
    enemyHullHits: 0,
    score: 0,
    scheduleIndex: 0,
    scheduleTimer: asset.broadside.initialDelayFrames,
    firedTurrets: new Set(),
    launchFlashes: Array.from({ length: BROADSIDE_SLOT_COUNT }, () => ({
      timer: 0,
      turretId: undefined,
      lifecycleId: undefined,
      y: 0,
    })),
    capitalExplosions: ["allied", "enemy"].map((side) => ({
      side,
      timer: 0,
      screenRow: 0,
      column: side === "allied" ? 5 : 32,
      triggerCount: 0,
    })),
    capitalExplosionSound: {
      timer: 0,
      triggerCount: 0,
      frequency: 0,
      control: 0,
      audctl: 0,
    },
  };
}

export function hullScrollRate(asset, difficulty = "hard") {
  invariant(Object.hasOwn(HULL_SCROLL_DIFFICULTIES, difficulty),
    `Unknown hull-scroll difficulty ${difficulty}`);
  return asset.broadside.hullScrollRates[difficulty];
}

export function worldScrollRate(asset, difficulty = "hard") {
  invariant(Object.hasOwn(HULL_SCROLL_DIFFICULTIES, difficulty),
    `Unknown world-scroll difficulty ${difficulty}`);
  return asset.broadside.worldScrollRates[difficulty];
}

export function createWorldScrollState(
  asset,
  { difficulty = "hard", initialSectorPhase = 0 } = {},
) {
  invariant(Number.isInteger(initialSectorPhase) && initialSectorPhase >= 0 &&
    initialSectorPhase <= asset.sector.streamRows,
  "Initial sector phase lies outside the finite flagship");
  const visibleScrolls = Math.min(GAMEPLAY_HULL_ROWS, initialSectorPhase);
  const visibleRows = Array.from({ length: GAMEPLAY_HULL_ROWS }, (_, offset) =>
    offset < visibleScrolls ? initialSectorPhase - 1 - offset : null);
  const initialSection = asset.sector.sections.find(({ start, end }) =>
    initialSectorPhase >= start && initialSectorPhase < end);
  return {
    difficulty,
    accumulator: 0,
    advances: 0,
    hullAccumulator: 0,
    hullAdvances: 0,
    corridorPhase: initialSectorPhase,
    visibleScrolls,
    visibleRows,
    drainRows: 0,
    sectorState: initialSection?.state ?? (initialSectorPhase < asset.sector.streamRows
      ? CAPITAL_SECTOR_STATES.ENGINES
      : CAPITAL_SECTOR_STATES.DRAIN),
    hullDrained: false,
  };
}

export function advanceWorldScroll(state, asset) {
  state.accumulator += worldScrollRate(asset, state.difficulty);
  if (state.accumulator < asset.broadside.worldScrollRateDenominator) return false;
  state.accumulator -= asset.broadside.worldScrollRateDenominator;
  state.advances += 1;
  return true;
}

export function advanceHullScroll(state, asset) {
  state.hullAccumulator += hullScrollRate(asset, state.difficulty);
  if (state.hullAccumulator < asset.broadside.hullScrollRateDenominator) return false;
  state.hullAccumulator -= asset.broadside.hullScrollRateDenominator;
  state.hullAdvances += 1;
  state.visibleRows.pop();
  if (state.corridorPhase < asset.sector.streamRows) {
    state.visibleRows.unshift(state.corridorPhase);
    state.corridorPhase += 1;
    state.visibleScrolls = Math.min(GAMEPLAY_HULL_ROWS, state.visibleScrolls + 1);
    const section = asset.sector.sections.find(({ start, end }) =>
      state.corridorPhase >= start && state.corridorPhase < end);
    state.sectorState = section?.state ?? CAPITAL_SECTOR_STATES.PROW;
  } else {
    state.visibleRows.unshift(null);
    state.sectorState = CAPITAL_SECTOR_STATES.DRAIN;
    state.drainRows = Math.min(GAMEPLAY_HULL_ROWS, state.drainRows + 1);
    state.hullDrained = state.drainRows === GAMEPLAY_HULL_ROWS;
  }
  return true;
}

export function resetExitedTurretLifecycles(state, asset, world) {
  const visible = new Set();
  for (const leftRow of world.visibleRows) {
    if (leftRow === null) continue;
    for (const turret of asset.turrets) {
      const sideRow = sectorRowForSide(asset, turret.side, leftRow);
      const cannonRows = asset.sector.cannonRowsByDifficulty
        .get(turret.side).get(world.difficulty);
      if (sideRow !== null && cannonRows.includes(sideRow)) {
        visible.add(`${turret.id}:${sideRow}`);
      }
    }
  }
  for (const lifecycleId of state.firedTurrets) {
    if (!visible.has(lifecycleId)) state.firedTurrets.delete(lifecycleId);
  }
}

export function warningHullAdvanceAllowance(asset, difficulty = "hard") {
  return Math.ceil(
    asset.broadside.warningFrames * hullScrollRate(asset, difficulty) /
      asset.broadside.hullScrollRateDenominator,
  );
}

export function selectOldestEligibleTurret(state, asset, world, side) {
  const warningAdvances = warningHullAdvanceAllowance(asset, world.difficulty);
  const safetyRows = 1;
  const candidates = [];
  asset.turrets.forEach((turret, turretIndex) => {
    if (turret.side !== side) return;
    world.visibleRows.forEach((leftRow, visibleOffset) => {
      if (leftRow === null) return;
      const sideRow = sectorRowForSide(asset, side, leftRow);
      const cannonRows = asset.sector.cannonRowsByDifficulty.get(side).get(world.difficulty);
      if (sideRow === null || !cannonRows.includes(sideRow)) return;
      const lifecycleId = `${turret.id}:${sideRow}`;
      if (state.firedTurrets.has(lifecycleId)) return;
    const visibleScreenRow = GAMEPLAY_FIRST_HULL_ROW + visibleOffset;
    const footprintRows = Object.values(turret.footprint).flat().map(([row]) => row);
    const minimumRelativeRow = Math.min(...footprintRows) - turret.segmentRow;
    const maximumRelativeRow = Math.max(...footprintRows) - turret.segmentRow;
    if (visibleScreenRow + minimumRelativeRow < GAMEPLAY_FIRST_HULL_ROW) return;
    if (visibleScreenRow + maximumRelativeRow + warningAdvances + safetyRows >=
        GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS) return;
    const muzzle = muzzlePosition(turret, visibleScreenRow);
    if (!state.slots.every((slot) => slot.state === BROADSIDE_STATES.FREE ||
      Math.abs(slot.y - muzzle.y) >= asset.broadside.minimumVerticalSeparation)) return;
      candidates.push({ turret, turretIndex, visibleScreenRow, muzzle, lifecycleId, sectorRow: sideRow });
    });
  });
  candidates.sort((left, right) =>
    right.visibleScreenRow - left.visibleScreenRow || left.turretIndex - right.turretIndex);
  return candidates[0];
}

export function simulateBroadsideSpeedSequence(asset, { frames = 4, difficulty = "hard" } = {}) {
  invariant(Number.isInteger(frames) && frames >= 2, "Speed sequence needs consecutive PAL frames");
  const state = createBroadsideState(asset);
  const world = createWorldScrollState(asset, {
    difficulty,
    initialSectorPhase: asset.sector.previewSectorRow,
  });
  const alliedIndex = asset.turrets.findIndex(({ side }) => side === "allied");
  const enemyTurret = asset.turrets.find(({ side }) => side === "enemy");
  const warning = beginWarning(state, asset, alliedIndex, 0, 10);
  const enemyMuzzle = muzzlePosition(enemyTurret, 14);
  const flying = state.slots[1];
  Object.assign(flying, {
    state: BROADSIDE_STATES.FLYING,
    owner: enemyTurret.side,
    turretId: enemyTurret.id,
    x: enemyMuzzle.x - asset.broadside.projectileSpeed * 5,
    y: enemyMuzzle.y,
    timer: 0,
  });
  const snapshots = [];
  const capture = (frame, { worldScrolled = false, hullScrolled = false } = {}) => {
    snapshots.push({
      frame,
      scrolled: worldScrolled,
      worldScrolled,
      hullScrolled,
      world: {
        difficulty: world.difficulty,
        accumulator: world.accumulator,
        advances: world.advances,
        hullAccumulator: world.hullAccumulator,
        hullAdvances: world.hullAdvances,
        corridorPhase: world.corridorPhase,
        visibleScrolls: world.visibleScrolls,
        visibleRows: [...world.visibleRows],
      },
      warning: {
        ...warning,
        visual: warningVisual(warning, asset),
      },
      projectile: { ...flying },
    });
  };

  capture(0);
  for (let frame = 1; frame <= frames; frame += 1) {
    advanceProjectile(warning, asset, { launchAllowed: false });
    advanceProjectile(flying, asset);
    const worldScrolled = advanceWorldScroll(world, asset);
    const hullScrolled = advanceHullScroll(world, asset);
    if (hullScrolled) warning.y += 8;
    capture(frame, { worldScrolled, hullScrolled });
  }
  return snapshots;
}

export function visibleSegmentRow(corridorPhase, visibleScrolls, screenRow, segmentRows = 32) {
  invariant(screenRow >= GAMEPLAY_FIRST_HULL_ROW &&
    screenRow < GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS,
  "Player envelope row lies outside the gameplay hull area");
  const offset = screenRow - GAMEPLAY_FIRST_HULL_ROW;
  return offset < visibleScrolls
    ? (corridorPhase - 1 - offset) & (segmentRows - 1)
    : (offset - visibleScrolls) & (segmentRows - 1);
}

export function combinedPlayerEnvelope(playerShape, engineShape) {
  invariant(playerShape.length === engineShape.length, "P0/P3 player layers must have equal heights");
  let top = playerShape.length;
  let bottom = -1;
  let left = 8;
  let right = -1;
  for (let row = 0; row < playerShape.length; row += 1) {
    const bits = playerShape[row] | engineShape[row];
    if (bits === 0) continue;
    top = Math.min(top, row);
    bottom = Math.max(bottom, row);
    for (let bit = 0; bit < 8; bit += 1) {
      if (bits & (0x80 >>> bit)) {
        left = Math.min(left, bit);
        right = Math.max(right, bit);
      }
    }
  }
  invariant(bottom >= top && right >= left, "Combined player PMG envelope is empty");
  return { top, bottom, left, right, width: right - left + 1 };
}

export function playerHullContact(asset, {
  playerX,
  playerY,
  corridorPhase,
  visibleScrolls,
  visibleRows,
  envelope,
}) {
  const firstScreenRow = Math.floor((playerY + envelope.top - PMG_SCREEN_TOP) / 8);
  const lastScreenRow = Math.floor((playerY + envelope.bottom - PMG_SCREEN_TOP) / 8);
  let alliedBoundary = PMG_LEFT_EDGE;
  let enemyBoundary = 208;
  const segmentRows = [];
  for (let screenRow = firstScreenRow; screenRow <= lastScreenRow; screenRow += 1) {
    const segmentRow = visibleRows
      ? visibleRows[screenRow - GAMEPLAY_FIRST_HULL_ROW]
      : visibleSegmentRow(corridorPhase, visibleScrolls, screenRow, asset.segmentRows);
    segmentRows.push(segmentRow);
    if (visibleRows) {
      alliedBoundary = Math.max(alliedBoundary, sectorHullBoundary(asset, "allied", segmentRow));
      enemyBoundary = Math.min(enemyBoundary, sectorHullBoundary(asset, "enemy", segmentRow));
    } else {
      alliedBoundary = Math.max(
        alliedBoundary,
        asset.collisionBoundaries.get("allied")[segmentRow],
      );
      enemyBoundary = Math.min(
        enemyBoundary,
        asset.collisionBoundaries.get("enemy")[segmentRow],
      );
    }
  }
  const left = playerX + envelope.left;
  const right = playerX + envelope.right;
  if (left < alliedBoundary) {
    return {
      collided: true,
      side: "allied",
      clampedX: alliedBoundary - envelope.left,
      alliedBoundary,
      enemyBoundary,
      segmentRows,
    };
  }
  if (right >= enemyBoundary) {
    return {
      collided: true,
      side: "enemy",
      clampedX: enemyBoundary - envelope.right - 1,
      alliedBoundary,
      enemyBoundary,
      segmentRows,
    };
  }
  return { collided: false, clampedX: playerX, alliedBoundary, enemyBoundary, segmentRows };
}

export function beginWarning(
  state,
  asset,
  turretIndex,
  slotIndex,
  visibleScreenRow,
  lifecycleId = asset.turrets[turretIndex]?.id,
) {
  const turret = asset.turrets[turretIndex];
  invariant(turret, `Unknown source turret index ${turretIndex}`);
  invariant(state.slots[slotIndex].state === BROADSIDE_STATES.FREE, "Broadside slot is occupied");
  const footprintRows = Object.values(turret?.footprint ?? {}).flat().map(([row]) => row);
  const minimumRelativeRow = Math.min(...footprintRows) - turret.segmentRow;
  const maximumRelativeRow = Math.max(...footprintRows) - turret.segmentRow;
  invariant(visibleScreenRow + minimumRelativeRow >= GAMEPLAY_FIRST_HULL_ROW &&
    visibleScreenRow + maximumRelativeRow < GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS,
  "Offscreen or unsafe turret may not warn");
  const muzzle = muzzlePosition(turret, visibleScreenRow);
  for (const active of state.slots) {
    if (active.state !== BROADSIDE_STATES.FREE) {
      invariant(Math.abs(active.y - muzzle.y) >= asset.broadside.minimumVerticalSeparation,
        "Broadside warnings violate vertical safety separation");
    }
  }
  Object.assign(state.slots[slotIndex], {
    state: BROADSIDE_STATES.WARNING,
    owner: turret.side,
    turretId: turret.id,
    lifecycleId,
    x: muzzle.x,
    y: muzzle.y,
    timer: asset.broadside.warningFrames,
  });
  state.firedTurrets.add(lifecycleId);
  return state.slots[slotIndex];
}

export function advanceProjectile(slot, asset, { launchAllowed = true, frame = 0 } = {}) {
  if (slot.state === BROADSIDE_STATES.WARNING) {
    if (slot.timer > 0) slot.timer -= 1;
    if (slot.timer === 0 && launchAllowed) {
      slot.state = BROADSIDE_STATES.FLYING;
      slot.launchFrame = frame;
    }
  } else if (slot.state === BROADSIDE_STATES.FLYING) {
    slot.x += (slot.owner === "allied" ? 1 : -1) * asset.broadside.projectileSpeed;
  } else if (slot.state === BROADSIDE_STATES.IMPACT) {
    slot.timer -= 1;
    if (slot.timer <= 0) {
      slot.state = BROADSIDE_STATES.FREE;
      slot.x = 0;
      slot.timer = 0;
    }
  }
  return slot;
}

export function heavyShellVisual(slot, asset, frame) {
  invariant(slot.state === BROADSIDE_STATES.FLYING,
    "Heavy-shell visual requires a FLYING slot");
  const visual = asset.broadside.projectileVisuals.capital;
  const faction = slot.owner === "allied" ? "allied" : "hostile";
  return {
    x: slot.x,
    y: slot.y,
    top: centeredSpanTop(slot.y, visual.height),
    height: visual.height,
    width: visual.widthHpos,
    occupiedPixels: visual.widthHpos * visual.height - 8,
    phase: 0,
    connectedObjects: 1,
    glyphs: [126, 127],
    renderer: "ANTIC4_PLAYFIELD_OVERLAY",
    color: faction === "allied" ? visual.alliedValue : visual.hostileValue,
    attribute: faction === "allied" ? visual.alliedAttribute : visual.hostileAttribute,
  };
}

export function beginLaunchFlash(state, asset, slotIndex) {
  const slot = state.slots[slotIndex];
  invariant(slot?.state === BROADSIDE_STATES.FLYING,
    "Launch flash requires a newly flying heavy-shell slot");
  Object.assign(state.launchFlashes[slotIndex], {
    timer: asset.sector.launchFlashFrames,
    turretId: slot.turretId,
    lifecycleId: slot.lifecycleId,
    y: slot.y,
  });
  return state.launchFlashes[slotIndex];
}

export function tickLaunchFlashes(state) {
  for (const flash of state.launchFlashes) {
    if (flash.timer > 0) flash.timer -= 1;
  }
  return state.launchFlashes;
}

export function capitalExplosionVisual(asset, timer) {
  const effect = asset.broadside.capitalExplosion;
  invariant(Number.isInteger(timer) && timer >= 1 && timer <= effect.durationFrames,
    "Capital explosion timer lies outside its visible duration");
  const elapsed = effect.durationFrames - timer;
  const phase = Math.floor(elapsed / effect.phaseFrames);
  const start = phase * effect.width * effect.height;
  const cells = [...effect.phaseBytes.subarray(start, start + effect.width * effect.height)];
  return {
    phase,
    cells,
    occupiedCells: cells.filter(Boolean).length,
    redCells: cells.filter((screenCode) => screenCode & 0x80).length,
    width: effect.width,
    height: effect.height,
  };
}

export function beginCapitalHullExplosion(
  state,
  asset,
  { targetSide, screenRow, boundaryColumn },
) {
  invariant(targetSide === "allied" || targetSide === "enemy",
    "Capital explosion requires a target hull side");
  invariant(Number.isInteger(screenRow) && screenRow >= GAMEPLAY_FIRST_HULL_ROW &&
    screenRow < GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS,
  "Capital explosion requires a visible target row");
  const effect = state.capitalExplosions[targetSide === "allied" ? 0 : 1];
  effect.timer = asset.broadside.capitalExplosion.durationFrames;
  effect.screenRow = Math.max(GAMEPLAY_FIRST_HULL_ROW, screenRow - 1);
  effect.column = targetSide === "allied"
    ? Math.max(0, Math.floor((boundaryColumn - PMG_LEFT_EDGE) / 4) - 3)
    : Math.min(37, Math.floor((boundaryColumn - PMG_LEFT_EDGE) / 4));
  effect.triggerCount += 1;
  return effect;
}

export function tickCapitalHullExplosions(state) {
  for (const effect of state.capitalExplosions) {
    if (effect.timer > 0) effect.timer -= 1;
  }
  return state.capitalExplosions;
}

export function beginCapitalExplosionSound(state, asset, soundEnabled = true) {
  const sound = state.capitalExplosionSound;
  if (!soundEnabled) {
    Object.assign(sound, { timer: 0, frequency: 0, control: 0, audctl: 0 });
    return false;
  }
  sound.timer = asset.broadside.capitalExplosion.durationFrames;
  sound.triggerCount += 1;
  sound.audctl = asset.broadside.capitalExplosion.soundAudctl;
  return true;
}

export function tickCapitalExplosionSound(state, asset, soundEnabled = true) {
  const sound = state.capitalExplosionSound;
  if (!soundEnabled || sound.timer === 0) {
    Object.assign(sound, { timer: 0, frequency: 0, control: 0, audctl: 0 });
    return sound;
  }
  const elapsed = asset.broadside.capitalExplosion.durationFrames - sound.timer;
  sound.frequency = asset.broadside.capitalExplosion.soundFrequencyBytes[elapsed];
  sound.control = asset.broadside.capitalExplosion.soundControlBytes[elapsed];
  sound.timer -= 1;
  return sound;
}

export function advanceHullMountedEffects(state) {
  for (const slot of state.slots) {
    if (slot.state === BROADSIDE_STATES.WARNING) slot.y += 8;
  }
  for (const flash of state.launchFlashes) {
    if (flash.timer > 0) flash.y += 8;
  }
  for (const effect of state.capitalExplosions) {
    if (effect.timer === 0) continue;
    effect.screenRow += 1;
    if (effect.screenRow >= GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS) effect.timer = 0;
  }
}

export function updateSectorCompletion(world, state) {
  if (world.hullDrained && activeProjectileCount(state) === 0 &&
      state.launchFlashes.every(({ timer }) => timer === 0) &&
      state.capitalExplosions.every(({ timer }) => timer === 0)) {
    world.sectorState = CAPITAL_SECTOR_STATES.COMPLETE;
  }
  return world.sectorState;
}

export function beginImpact(slot, asset) {
  slot.state = BROADSIDE_STATES.IMPACT;
  slot.timer = asset.broadside.impactFrames;
  return slot;
}

export function tickDamageCooldown(state) {
  if (state.damageCooldown > 0) state.damageCooldown -= 1;
}

export function hitPlayer(state, slot, asset, frame) {
  beginImpact(slot, asset);
  return applyPlayerDamage(
    state,
    asset,
    asset.broadside.playerDamage,
    asset.broadside.damageCooldownFrames,
    frame,
  );
}

export function applyPlayerDamage(state, asset, damage, cooldownFrames, frame) {
  if (state.playerLifecycle !== PLAYER_LIFECYCLE_STATES.ALIVE) return false;
  if (state.damageCooldown !== 0 || state.damageFrame === frame) return false;
  state.health = Math.max(0, state.health - damage);
  state.damageCooldown = cooldownFrames;
  state.damageFrame = frame;
  if (state.health === 0) {
    state.playerLifecycle = PLAYER_LIFECYCLE_STATES.DYING;
    // DYING lasts one frame longer than the explosion: the runtime begins the
    // PMG explosion on the first DYING tick, not on the death frame.
    state.deathTimer = SHARED_FIGHTER_EXPLOSION_TOTAL + 1;
    state.playerVisible = false;
    state.lives = Math.max(0, state.lives - 1);
  }
  return true;
}

export function contactPlayerHull(state, contact, asset, frame) {
  if (!contact.collided) return false;
  return applyPlayerDamage(
    state,
    asset,
    asset.broadside.capitalHullContactDamage,
    asset.broadside.capitalHullContactCooldownFrames,
    frame,
  );
}

export function advancePlayerLifecycle(state, asset) {
  if (state.playerLifecycle === PLAYER_LIFECYCLE_STATES.DYING) {
    if (state.deathTimer > 0) state.deathTimer -= 1;
    if (state.deathTimer > 0) {
      return "dying";
    }
    if (state.lives === 0) {
      state.playerLifecycle = PLAYER_LIFECYCLE_STATES.GAME_OVER;
      state.playerVisible = false;
      state.latchedPlayerCollision = false;
      return "game-over";
    }
    state.playerX = PLAYER_RESPAWN_X;
    state.playerY = PLAYER_RESPAWN_Y;
    state.health = 100;
    state.damageCooldown = 0;
    state.damageFrame = -1;
    state.respawnInvulnerabilityTimer = asset.broadside.respawnInvulnerableFrames;
    state.respawnBlinkFrame = 0;
    state.playerVisible = true;
    state.latchedPlayerCollision = false;
    state.playerLifecycle = PLAYER_LIFECYCLE_STATES.RESPAWN_INVULNERABLE;
    return "respawn";
  }
  if (state.playerLifecycle !== PLAYER_LIFECYCLE_STATES.RESPAWN_INVULNERABLE) {
    return "unchanged";
  }
  const halfPeriod = asset.broadside.respawnBlinkHalfPeriodFrames;
  state.playerVisible = (state.respawnBlinkFrame & halfPeriod) === 0;
  state.respawnBlinkFrame = (state.respawnBlinkFrame + 1) & 0xff;
  state.respawnInvulnerabilityTimer -= 1;
  if (state.respawnInvulnerabilityTimer > 0) return "invulnerable";
  state.latchedPlayerCollision = false;
  state.playerVisible = true;
  state.playerLifecycle = PLAYER_LIFECYCLE_STATES.ALIVE;
  return "alive";
}

export function hitHostileFighter(state, slot, asset) {
  if (slot.owner !== "allied" && slot.owner !== "enemy") return false;
  beginImpact(slot, asset);
  return true;
}

export function hitOppositeHull(state, slot, asset, context = {}) {
  beginImpact(slot, asset);
  const key = slot.owner === "allied" ? "enemyHullHits" : "alliedHullHits";
  state[key] = Math.min(255, state[key] + 1);
  const targetSide = slot.owner === "allied" ? "enemy" : "allied";
  const screenRow = context.screenRow ?? Math.floor((slot.y - PMG_SCREEN_TOP) / 8);
  const boundaryColumn = context.boundaryColumn ?? hullBoundary(
    asset,
    targetSide,
    context.segmentRow ?? 0,
  );
  beginCapitalHullExplosion(state, asset, { targetSide, screenRow, boundaryColumn });
  beginCapitalExplosionSound(state, asset, context.soundEnabled ?? true);
}

export function projectileLeadingEdgeHitsHull(slot, asset, segmentRow) {
  const target = slot.owner === "allied" ? "enemy" : "allied";
  const boundary = hullBoundary(asset, target, segmentRow);
  return slot.owner === "allied"
    ? slot.x + asset.broadside.projectileVisuals.capital.widthHpos >= boundary
    : slot.x <= boundary;
}

export function activeProjectileCount(state) {
  return state.slots.filter(({ state: slotState }) => slotState !== BROADSIDE_STATES.FREE).length;
}

export function expireProjectile(slot, minimum = 48, maximum = 208) {
  if (slot.x >= minimum && slot.x < maximum) return false;
  slot.state = BROADSIDE_STATES.FREE;
  slot.x = 0;
  slot.timer = 0;
  return true;
}

function cadenceEventStats(events) {
  const gaps = events.slice(1).map((event, index) => event.frame - events[index].frame);
  return {
    count: events.length,
    allied: events.filter(({ owner }) => owner === "allied").length,
    enemy: events.filter(({ owner }) => owner === "enemy").length,
    minimumGap: gaps.length === 0 ? undefined : Math.min(...gaps),
    averageGap: gaps.length === 0
      ? undefined
      : gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
  };
}

function clearCadenceSlot(slot) {
  slot.state = BROADSIDE_STATES.FREE;
  slot.owner = undefined;
  slot.turretId = undefined;
  slot.x = 0;
  slot.y = 0;
  slot.timer = 0;
}

export function simulateBroadsideCadence(asset, { frames = 1000, difficulty = "hard" } = {}) {
  invariant(Number.isInteger(frames) && frames >= 1, "Cadence simulation needs PAL frames");
  const state = createBroadsideState(asset);
  const world = createWorldScrollState(asset, { difficulty });
  const warningStarts = [];
  const launches = [];
  const warningScrolls = [];
  const scrollEvents = [];
  const deferred = { busy: 0, invisible: 0, separation: 0 };
  let scheduleAttempts = 0;
  let cancelledWarnings = 0;
  let maximumStartsPerFrame = 0;
  let maximumActiveSlots = 0;
  let activeSlotFrames = 0;
  const slotFrameCounts = { warning: 0, flying: 0, impact: 0 };

  for (let frame = 1; frame <= frames; frame += 1) {
    tickLaunchFlashes(state);
    let launchUsed = false;
    for (const [slotIndex, slot] of state.slots.entries()) {
      if (slot.state === BROADSIDE_STATES.WARNING) {
        if (slot.timer > 0) slot.timer -= 1;
        if (slot.timer === 0 && !launchUsed) {
          slot.state = BROADSIDE_STATES.FLYING;
          launchUsed = true;
          beginLaunchFlash(state, asset, slotIndex);
          launches.push({
            frame,
            owner: slot.owner,
            turretId: slot.turretId,
            missile: slot.missile,
            x: slot.x,
            y: slot.y,
          });
        }
      } else if (slot.state === BROADSIDE_STATES.FLYING) {
        slot.x += (slot.owner === "allied" ? 1 : -1) * asset.broadside.projectileSpeed;
        const screenRow = Math.floor((slot.y - PMG_SCREEN_TOP) / 8);
        if (screenRow < GAMEPLAY_FIRST_HULL_ROW ||
            screenRow >= GAMEPLAY_FIRST_HULL_ROW + GAMEPLAY_HULL_ROWS) {
          clearCadenceSlot(slot);
          continue;
        }
        const leftSectorRow = world.visibleRows[screenRow - GAMEPLAY_FIRST_HULL_ROW];
        const boundary = sectorHullBoundary(
          asset,
          slot.owner === "allied" ? "enemy" : "allied",
          leftSectorRow,
        );
        const hit = slot.owner === "allied" ? slot.x + 2 >= boundary : slot.x <= boundary;
        if (hit || slot.x < PMG_LEFT_EDGE || slot.x >= 208) {
          slot.state = BROADSIDE_STATES.IMPACT;
          slot.timer = asset.broadside.impactFrames;
        }
      } else if (slot.state === BROADSIDE_STATES.IMPACT) {
        slot.timer -= 1;
        if (slot.timer === 0) clearCadenceSlot(slot);
      }
    }

    let startsThisFrame = 0;
    if (world.sectorState < CAPITAL_SECTOR_STATES.DRAIN) state.scheduleTimer -= 1;
    if (world.sectorState < CAPITAL_SECTOR_STATES.DRAIN && state.scheduleTimer === 0) {
      scheduleAttempts += 1;
      const slotIndex = state.slots.findIndex(({ state: slotState }, index) =>
        index < asset.broadside.activeLimit && slotState === BROADSIDE_STATES.FREE);
      if (slotIndex < 0) {
        deferred.busy += 1;
        state.scheduleTimer = asset.broadside.retryDelayFrames;
      } else {
        const schedule = asset.schedule[state.scheduleIndex];
        const selected = ["allied", "enemy"]
          .map((side) => selectOldestEligibleTurret(state, asset, world, side))
          .filter(Boolean)
          .sort((left, right) => right.visibleScreenRow - left.visibleScreenRow ||
            left.turretIndex - right.turretIndex)[0];
        if (!selected) {
          deferred.invisible += 1;
          state.scheduleTimer = asset.broadside.retryDelayFrames;
        } else {
          const slot = beginWarning(
            state,
            asset,
            selected.turretIndex,
            slotIndex,
            selected.visibleScreenRow,
            selected.lifecycleId,
          );
            warningStarts.push({
              frame,
              owner: slot.owner,
              turretId: slot.turretId,
              missile: slot.missile,
              x: slot.x,
              y: slot.y,
            });
            startsThisFrame = 1;
            state.scheduleTimer = schedule.delayAfterFrames;
            state.scheduleIndex = (state.scheduleIndex + 1) % asset.schedule.length;
        }
      }
    }
    maximumStartsPerFrame = Math.max(maximumStartsPerFrame, startsThisFrame);

    advanceWorldScroll(world, asset);
    if (advanceHullScroll(world, asset)) {
      resetExitedTurretLifecycles(state, asset, world);
      const newTopRow = world.visibleRows[0];
      const newStation = newTopRow !== null && ["allied", "enemy"].some((side) => {
        const sideRow = sectorRowForSide(asset, side, newTopRow);
        return sideRow !== null &&
          asset.sector.cannonRowsByDifficulty.get(side).get(difficulty).includes(sideRow);
      });
      if (newStation) state.scheduleTimer = 1;
      scrollEvents.push(frame);
      for (const slot of state.slots) {
        if (slot.state !== BROADSIDE_STATES.WARNING) continue;
        const beforeY = slot.y;
        slot.y += 8;
        warningScrolls.push({
          frame,
          turretId: slot.turretId,
          missile: slot.missile,
          beforeY,
          afterY: slot.y,
        });
        if (slot.y > BROADSIDE_WARNING_Y_MAX) {
          clearCadenceSlot(slot);
          cancelledWarnings += 1;
        }
      }
      for (const flash of state.launchFlashes) {
        if (flash.timer > 0) flash.y += 8;
      }
    }
    for (const slot of state.slots) {
      if (slot.state === BROADSIDE_STATES.FREE) continue;
      activeSlotFrames += 1;
      if (slot.state === BROADSIDE_STATES.WARNING) slotFrameCounts.warning += 1;
      if (slot.state === BROADSIDE_STATES.FLYING) slotFrameCounts.flying += 1;
      if (slot.state === BROADSIDE_STATES.IMPACT) slotFrameCounts.impact += 1;
    }
    maximumActiveSlots = Math.max(maximumActiveSlots, activeProjectileCount(state));
    updateSectorCompletion(world, state);
  }

  return {
    frames,
    warningStarts,
    launches,
    warningScrolls,
    scrollEvents,
    warningStats: cadenceEventStats(warningStarts),
    launchStats: cadenceEventStats(launches),
    scheduleAttempts,
    deferred,
    cancelledWarnings,
    maximumStartsPerFrame,
    maximumActiveSlots,
    activeSlotsAtEnd: activeProjectileCount(state),
    activeSlotFrames,
    slotFrameCounts,
    scrollFrames: world.hullAdvances,
    worldScrollFrames: world.advances,
    finalSectorState: world.sectorState,
    finalCorridorPhase: world.corridorPhase,
    drainRows: world.drainRows,
  };
}
