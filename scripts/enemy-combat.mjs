import { ENEMY_WEAPON_PROFILES } from "./enemy-roster.mjs";
import { canonicalPlayfield } from "./playfield.mjs";

export const ENEMY_COMBAT_SECTOR_STATES = Object.freeze({
  ACTIVE: 0,
  DRAIN: 5,
  COMPLETE: 6,
});

// These are logical PMG scanlines, matching BROADSIDE_PLAYFIELD_TOP and the
// runtime's exclusive bottom test. Keeping the simulator in the same units is
// essential: a source-space row is not a visible enemy Y coordinate.
export const ENEMY_FULLY_VISIBLE_TOP = 24;
export const ENEMY_VISIBLE_BOTTOM_EXCLUSIVE = canonicalPlayfield.gameplayBottom;

// Lower numeric values are the deterministic same-frame credit priority.
// Allegiance and colour remain separate from this destruction policy.
export const ENEMY_DAMAGE_SOURCES = Object.freeze({
  PLAYER_PROJECTILE: 0,
  PLAYER_CONTACT: 1,
  CAPITAL_HOSTILE: 2,
  CAPITAL_ALLIED: 3,
  ENEMY_PROJECTILE: 4,
  CLEANUP: 5,
});

const SCORE_AWARDING_SOURCES = new Set([
  ENEMY_DAMAGE_SOURCES.PLAYER_PROJECTILE,
  ENEMY_DAMAGE_SOURCES.PLAYER_CONTACT,
  ENEMY_DAMAGE_SOURCES.CAPITAL_HOSTILE,
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function enemyPulseSpawnPosition(archetype, logicalX, logicalY, pulsePolicy) {
  invariant(archetype?.weaponProfileId === ENEMY_WEAPON_PROFILES.SINGLE_PULSE,
    `${archetype?.id ?? "enemy"} cannot spawn a single pulse`);
  invariant(Number.isInteger(logicalX) && Number.isInteger(logicalY),
    "Enemy pulse origin requires integer logical coordinates");
  return {
    x: logicalX + Math.floor(archetype.visibleWidth / 2) -
      Math.floor(pulsePolicy.widthHpos / 2),
    y: logicalY + archetype.projectileSpawnYOffset,
  };
}

export function sweptEnemyPulseHitsPlayer(pulse, player, pulsePolicy) {
  const pulseRight = pulse.x + pulsePolicy.widthHpos;
  const playerRight = player.x + player.width;
  if (pulseRight <= player.x || playerRight <= pulse.x) return false;
  const sweptBottom = pulse.y + pulsePolicy.height - 1;
  const playerBottom = player.y + player.height - 1;
  return sweptBottom >= player.y && playerBottom >= pulse.previousY;
}

export function enemyFireCooldown(asset, difficulty, slotIndex = 0) {
  const pulse = asset.runtime.weaponPolicy.singlePulse;
  invariant(Number.isInteger(difficulty) && difficulty >= 0 &&
    difficulty < pulse.postBurstFrames.length, "Invalid enemy-fire difficulty");
  invariant(Number.isInteger(slotIndex) && slotIndex >= 0, "Invalid enemy slot index");
  return pulse.postBurstFrames[difficulty];
}

export function createEnemyDamageState(archetype) {
  invariant(archetype?.implemented, "Enemy damage state requires an implemented archetype");
  return {
    archetype,
    hp: archetype.hitPoints,
    alive: true,
    exploding: false,
    pendingDamage: 0,
    pendingSource: ENEMY_DAMAGE_SOURCES.CLEANUP,
    destructionCount: 0,
    scoreAwarded: 0,
  };
}

export function beginEnemyDamageFrame(enemy) {
  enemy.pendingDamage = 0;
  enemy.pendingSource = ENEMY_DAMAGE_SOURCES.CLEANUP;
  return enemy;
}

export function queueEnemyDamage(enemy, amount, source) {
  invariant(Number.isInteger(amount) && amount >= 0, "Enemy damage must be a non-negative integer");
  invariant(Object.values(ENEMY_DAMAGE_SOURCES).includes(source), "Unknown enemy damage source");
  if (!enemy.alive || amount === 0) return false;
  enemy.pendingDamage = Math.min(255, enemy.pendingDamage + amount);
  enemy.pendingSource = Math.min(enemy.pendingSource, source);
  return true;
}

export function resolveEnemyDamage(enemy) {
  if (!enemy.alive || enemy.pendingDamage === 0) {
    return { destroyed: false, score: 0, source: enemy.pendingSource };
  }
  const source = enemy.pendingSource;
  enemy.hp = Math.max(0, enemy.hp - enemy.pendingDamage);
  beginEnemyDamageFrame(enemy);
  if (enemy.hp !== 0) return { destroyed: false, score: 0, source };
  enemy.alive = false;
  enemy.exploding = true;
  enemy.destructionCount += 1;
  const score = SCORE_AWARDING_SOURCES.has(source) ? enemy.archetype.score : 0;
  enemy.scoreAwarded += score;
  return { destroyed: true, score, source };
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.height && b.y < a.y + a.height;
}

export function sweptHorizontalProjectileTargets(projectile, targets) {
  invariant(projectile.velocityX !== 0, "Swept capital projectile needs horizontal velocity");
  const left = Math.min(projectile.previousX, projectile.x);
  const right = Math.max(projectile.previousX, projectile.x) + projectile.width;
  const swept = { x: left, y: projectile.y, width: right - left, height: projectile.height };
  const eligible = targets.filter((target) => target.active !== false && rectanglesOverlap(swept, target));
  eligible.sort(projectile.velocityX > 0
    ? (a, b) => (a.x - b.x) || (a.priority - b.priority)
    : (a, b) => ((b.x + b.width) - (a.x + a.width)) || (a.priority - b.priority));
  return eligible[0] ?? null;
}

export function projectileVisualMetrics(asset) {
  const { player, interceptor, capital } = asset.broadside.projectileVisuals;
  const capitalOccupiedPixels = capital.height * capital.widthHpos - 8;
  return {
    player: {
      width: player.widthHpos,
      height: player.height,
      occupiedPixels: player.height,
      renderer: "ANTIC4_GLYPH_POOL",
      register: player.coreRegister,
      color: player.coreValue,
    },
    interceptor: {
      width: interceptor.widthHpos,
      height: interceptor.height,
      occupiedPixels: interceptor.widthHpos * interceptor.height,
      renderer: "ANTIC4_GLYPH_POOL",
      register: interceptor.register,
      color: interceptor.value,
    },
    allied: {
      width: capital.widthHpos,
      height: capital.height,
      occupiedPixels: capitalOccupiedPixels,
      renderer: "ANTIC4_PLAYFIELD_OVERLAY",
      attribute: capital.alliedAttribute,
      color: capital.alliedValue,
    },
    hostile: {
      width: capital.widthHpos,
      height: capital.height,
      occupiedPixels: capitalOccupiedPixels,
      renderer: "ANTIC4_PLAYFIELD_OVERLAY",
      attribute: capital.hostileAttribute,
      color: capital.hostileValue,
    },
  };
}

export function createInterceptorPursuitState(asset, {
  x = asset.implemented[0].logicalBounds[0],
  y = ENEMY_FULLY_VISIBLE_TOP,
  velocityX = 0,
  moveAccumulator = 0,
} = {}) {
  const interceptor = asset.implemented[0];
  invariant(interceptor?.id === "INTERCEPTOR", "Soft pursuit requires the release Interceptor");
  invariant(Number.isInteger(x) && x >= interceptor.logicalBounds[0] &&
    x <= interceptor.logicalBounds[1], "Interceptor pursuit X is outside its legal corridor");
  invariant(Number.isInteger(y), "Interceptor pursuit Y must be an integer scanline");
  invariant([-1, 0, 1].includes(velocityX), "Interceptor pursuit velocity must be -1, 0, or 1");
  const denominator = asset.runtime.movementPolicy.interceptorSoftPursuit.maximumSpeedRatioDenominator;
  invariant(Number.isInteger(moveAccumulator) && moveAccumulator >= 0 &&
    moveAccumulator < denominator, "Interceptor movement accumulator is outside its rate window");
  return { x, y, velocityX, moveAccumulator };
}

// Mirrors update_interceptor_soft_pursuit in the assembled runtime. The player and
// Interceptor positions are their established left edges, so the four-HPOS centre
// correction is part of the signed target delta rather than an unexplained
// steering offset. Direction changes pass through zero for one sample period.
export function stepInterceptorSoftPursuit(asset, state, {
  frame,
  playerX,
} = {}) {
  const interceptor = asset.implemented[0];
  const policy = asset.runtime.movementPolicy.interceptorSoftPursuit;
  invariant(Number.isInteger(frame) && frame >= 0, "Interceptor pursuit frame must be non-negative");
  invariant(Number.isInteger(playerX), "Interceptor pursuit target must use an integer player X");
  const next = { ...state };
  const sampled = frame % policy.targetSamplingIntervalFrames === 0;
  let targetDelta = null;
  let requestedVelocity = next.velocityX;
  if (sampled && next.y >= policy.attackActiveTop &&
    next.y < policy.attackActiveBottomExclusive) {
    const weave = (frame % policy.weavePeriodFrames) < policy.weavePeriodFrames / 2
      ? -policy.weaveAmplitudeHpos
      : policy.weaveAmplitudeHpos;
    const centreCorrection = (interceptor.visibleWidth - 8) / 2;
    targetDelta = playerX + weave - next.x - centreCorrection;
    if (targetDelta > policy.deadZoneHpos) {
      requestedVelocity = next.velocityX < 0 ? 0 : policy.horizontalAccelerationHpos;
    } else if (targetDelta < -policy.deadZoneHpos) {
      requestedVelocity = next.velocityX > 0 ? 0 : -policy.horizontalAccelerationHpos;
    } else {
      requestedVelocity = 0;
    }
    next.velocityX = Math.max(-policy.maximumHorizontalVelocityHpos,
      Math.min(policy.maximumHorizontalVelocityHpos, requestedVelocity));
  }
  let movedHpos = 0;
  if (next.velocityX === 0) {
    next.moveAccumulator = 0;
  } else {
    next.moveAccumulator += policy.maximumSpeedRatioNumerator;
    if (next.moveAccumulator >= policy.maximumSpeedRatioDenominator) {
      next.moveAccumulator -= policy.maximumSpeedRatioDenominator;
      movedHpos = next.velocityX * policy.movementStepHpos;
      next.x += movedHpos;
    }
  }
  if (next.x < interceptor.logicalBounds[0]) {
    next.x = interceptor.logicalBounds[0];
    next.velocityX = 0;
    next.moveAccumulator = 0;
  } else if (next.x > interceptor.logicalBounds[1]) {
    next.x = interceptor.logicalBounds[1];
    next.velocityX = 0;
    next.moveAccumulator = 0;
  }
  return { ...next, sampled, targetDelta, requestedVelocity, movedHpos };
}

export function simulateInterceptorSoftPursuit(asset, {
  frameCount = 96,
  initialState,
  playerXForFrame = () => 124,
} = {}) {
  let state = initialState ?? createInterceptorPursuitState(asset, { x: 120, y: 56 });
  const trace = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    state = stepInterceptorSoftPursuit(asset, state, {
      frame,
      playerX: playerXForFrame(frame),
    });
    trace.push({ frame, playerX: playerXForFrame(frame), ...state });
  }
  return { state, trace };
}

export function createTwoPmgRaiderPrototypeState(asset) {
  return {
    slots: [
      { ...createInterceptorPursuitState(asset,
        { x: 88, y: 48, velocityX: 1, moveAccumulator: 0 }),
      direction: 1, maneuverState: 0, maneuverTimer: 48, behaviorPhase: 0 },
      { ...createInterceptorPursuitState(asset,
        { x: 152, y: 96, velocityX: -1, moveAccumulator: 2 }),
      direction: -1, maneuverState: 0, maneuverTimer: 48, behaviorPhase: 12 },
    ],
  };
}

// Mirrors the bounded two-slot wrapper around update_interceptor_soft_pursuit.
// Each slot owns its complete mutable movement state; the only shared input is
// the current PlayerFighter X coordinate.
export function stepTwoPmgRaiderPrototype(asset, state, { frame, playerX }) {
  return {
    slots: state.slots.map((slot, index) => {
      const moved = stepInterceptorSoftPursuit(asset, slot, {
        frame: frame + slot.behaviorPhase,
        playerX,
      });
      const next = { ...slot, ...moved };
      if (next.maneuverState === 0) {
        next.y += index === 0 ? 1 : -1;
        next.maneuverTimer -= 1;
        if (next.maneuverTimer === 0) next.maneuverState = 1;
      } else {
        next.y += 1;
      }
      next.direction = Math.sign(next.velocityX);
      return next;
    }),
  };
}

export function simulateTwoPmgRaiderPrototype(asset, {
  frameCount = 240,
  playerXForFrame = () => 124,
} = {}) {
  let state = createTwoPmgRaiderPrototypeState(asset);
  const trace = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    const playerX = playerXForFrame(frame);
    state = stepTwoPmgRaiderPrototype(asset, state, { frame, playerX });
    trace.push({ frame, playerX, slots: state.slots.map((slot) => ({ ...slot })) });
  }
  return { state, trace };
}

export function createEnemyCombatState(asset, {
  difficulty = 1,
  slotIndex = 0,
  playerHealth = 100,
} = {}) {
  return {
    difficulty,
    slotIndex,
    burstState: "WAITING",
    burstRemaining: 0,
    fireTimer: 0,
    pool: Array(asset.runtime.weaponPolicy.singlePulse.poolSlots).fill(null),
    shotsFired: 0,
    playerHits: 0,
    playerDamage: 0,
    playerHealth,
    score: 0,
  };
}

export function stepEnemyCombatFrame(asset, state, {
  archetype = asset.implemented[0],
  enemyX = archetype.logicalBounds[0],
  enemyY = 56,
  enemyActive = true,
  enemyExploding = false,
  playerActive = true,
  playerInvulnerable = false,
  player = { x: 124, y: 184, width: 8, height: 15 },
  sectorState = ENEMY_COMBAT_SECTOR_STATES.ACTIVE,
} = {}) {
  const pulsePolicy = asset.runtime.weaponPolicy.singlePulse;
  const next = {
    ...state,
    pool: state.pool.map((entry) => entry && { ...entry }),
  };
  let damageApplied = false;
  for (let pulseSlot = 0; pulseSlot < next.pool.length; pulseSlot += 1) {
    const pulse = next.pool[pulseSlot];
    if (pulse?.owner !== "INTERCEPTOR") continue;
    pulse.previousY = pulse.y;
    pulse.y += pulsePolicy.speed;
    pulse.lifetime -= 1;
    if (sweptEnemyPulseHitsPlayer(pulse, player, pulsePolicy)) {
      next.pool[pulseSlot] = null;
      next.playerHits += 1;
      if (!damageApplied && !playerInvulnerable && playerActive) {
        next.playerDamage += pulsePolicy.damage;
        next.playerHealth = Math.max(0, next.playerHealth - pulsePolicy.damage);
        damageApplied = true;
      }
    } else if (pulse.lifetime <= 0 || pulse.y >= ENEMY_VISIBLE_BOTTOM_EXCLUSIVE) {
      next.pool[pulseSlot] = null;
    }
  }

  if (!playerActive) {
    next.pool.fill(null);
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.fireTimer = 0;
    return next;
  }
  if (sectorState === ENEMY_COMBAT_SECTOR_STATES.DRAIN) {
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.fireTimer = 0;
    return next;
  }
  if (!enemyActive || enemyExploding ||
    archetype.weaponProfileId !== ENEMY_WEAPON_PROFILES.SINGLE_PULSE) {
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.fireTimer = 0;
    return next;
  }

  const fullyVisible = enemyY >= ENEMY_FULLY_VISIBLE_TOP &&
    enemyY + archetype.height <= ENEMY_VISIBLE_BOTTOM_EXCLUSIVE;
  if (!fullyVisible) {
    next.burstState = "WAITING";
    next.burstRemaining = 0;
    next.fireTimer = 0;
    return next;
  }

  if (next.burstState === "WAITING") {
    next.burstState = "FIRING_BURST";
    next.burstRemaining = pulsePolicy.burstCount;
    next.fireTimer = 0;
  } else if (next.burstState === "POST_BURST_COOLDOWN") {
    if (next.fireTimer > 0) next.fireTimer -= 1;
    if (next.fireTimer > 0) return next;
    next.burstState = "FIRING_BURST";
    next.burstRemaining = pulsePolicy.burstCount;
  }

  if (next.fireTimer > 0) next.fireTimer -= 1;
  if (next.fireTimer > 0) return next;
  const pulseSlot = next.pool.findIndex((entry, index) =>
    index < pulsePolicy.activeLimit && entry === null);
  if (pulseSlot < 0) return next;

  const origin = enemyPulseSpawnPosition(archetype, enemyX, enemyY, pulsePolicy);
  next.pool[pulseSlot] = {
    active: true,
    owner: "INTERCEPTOR",
    source: "ENEMY_SINGLE_PULSE",
    damage: pulsePolicy.damage,
    visualProfile: "SHORT_RED_ANTIC4",
    renderSlot: pulseSlot,
    x: origin.x,
    y: origin.y,
    previousY: origin.y,
    speed: pulsePolicy.speed,
    lifetime: pulsePolicy.lifetimeFrames,
  };
  next.shotsFired += 1;
  next.burstRemaining -= 1;
  if (next.burstRemaining === 0) {
    next.burstState = "POST_BURST_COOLDOWN";
    next.fireTimer = enemyFireCooldown(asset, next.difficulty, next.slotIndex);
  } else {
    next.fireTimer = pulsePolicy.burstIntervalFrames;
  }
  return next;
}

export function simulateEnemyCombatFrames(asset, frameCount, options = {}) {
  let state = createEnemyCombatState(asset, options);
  const trace = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    state = stepEnemyCombatFrame(asset, state, options);
    trace.push({
      frame,
      fireTimer: state.fireTimer,
      pulses: state.pool.filter(Boolean).map((pulse) => ({ ...pulse })),
      shotsFired: state.shotsFired,
      playerHealth: state.playerHealth,
    });
  }
  return { state, trace };
}

// Advance a naturally spawned release Interceptor through the same cooldown,
// visibility, fixed-pool allocation, movement and swept-collision path used by
// stepEnemyCombatFrame. This deliberately starts before the cooldown elapses;
// callers cannot pre-create a pulse and still claim a firing trace.
export function simulateNaturalInterceptorFire(asset, {
  difficulty = 1,
  slotIndex = 0,
  frameCount = 220,
  enemyX = 120,
  initialEnemyY = ENEMY_FULLY_VISIBLE_TOP,
  initialPool,
  initialSizeM = 0x54,
  player = { x: 80, y: 184, width: 8, height: 15 },
  sectorState = ENEMY_COMBAT_SECTOR_STATES.ACTIVE,
} = {}) {
  const archetype = asset.implemented[0];
  const policy = asset.runtime.weaponPolicy.singlePulse;
  let state = createEnemyCombatState(asset, { difficulty, slotIndex });
  if (initialPool) state.pool = initialPool.map((entry) => entry && { ...entry });
  let enemyY = initialEnemyY;
  let sizeM = initialSizeM;
  const trace = [];

  for (let frame = 1; frame <= frameCount; frame += 1) {
    enemyY = Math.min(enemyY + 1, ENEMY_VISIBLE_BOTTOM_EXCLUSIVE - archetype.height);
    const fireTimerBefore = state.fireTimer;
    const shotsBefore = state.shotsFired;
    const playerHealthBefore = state.playerHealth;
    const occupancyBefore = state.pool.map((entry) => entry?.owner ?? "FREE");
    state = stepEnemyCombatFrame(asset, state, {
      archetype,
      enemyX,
      enemyY,
      player,
      sectorState,
    });
    const allocated = state.shotsFired !== shotsBefore;
    const active = state.pool.filter((pulse) => pulse?.owner === "INTERCEPTOR");
    const pulse = active.at(-1);
    const activePmgBytes = [];
    trace.push({
      frame,
      enemySlot: slotIndex,
      archetype: archetype.id,
      visibility: enemyY >= ENEMY_FULLY_VISIBLE_TOP &&
        enemyY + archetype.height <= ENEMY_VISIBLE_BOTTOM_EXCLUSIVE,
      enemyY,
      burstState: state.burstState,
      shotIndex: policy.burstCount - state.burstRemaining,
      cooldownBefore: fireTimerBefore,
      cooldown: state.fireTimer,
      poolOccupancyBefore: occupancyBefore,
      poolOccupancy: state.pool.map((entry) => entry?.owner ?? "FREE"),
      allocationResult: allocated ? "ALLOCATED" : "NONE",
      projectileOwner: pulse?.owner ?? "NONE",
      renderSlot: pulse?.owner === "INTERCEPTOR" ? `PF${pulse.renderSlot}` : "NONE",
      hpos: pulse?.x ?? null,
      y: pulse?.y ?? null,
      sizeM,
      activePmgBytes,
      activePlayfieldProjectiles: active.map(({ renderSlot, x, previousY, y }) =>
        ({ renderSlot, x, previousY, y, width: policy.widthHpos, height: policy.height })),
      collisionResult: state.playerHealth < playerHealthBefore ? "PLAYER_FIGHTER_HIT" : "NONE",
      playerHealthBefore,
      playerHealth: state.playerHealth,
    });
  }
  return { state, trace, enemyY };
}
