import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "./nmos6502.mjs";
import { installBootArtifact } from "./runtime-image.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");

function labelsFromFile(sourcePath) {
  return new Map(fs.readFileSync(sourcePath, "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]));
}

function requiredLabel(labels, name) {
  const address = labels.get(name);
  if (!Number.isInteger(address)) throw new Error(`Missing linked label ${name}`);
  return address;
}

function runRoutine(memory, labels, name, { writeLog = null, frame = null } = {}) {
  const cpu = new Nmos6502(memory, writeLog === null ? {} : {
    write(address, value, executingCpu) {
      if ((address >= 0x4028 && address < 0x43c0)) {
        writeLog.push({ frame, routine: name, pc: executingCpu.pc,
          address, before: memory[address], after: value });
      }
    },
  });
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) cpu.step();
  if (cpu.pc !== stop) {
    throw new Error(`${name} did not return (pc=$${cpu.pc.toString(16).padStart(4, "0")}, ` +
      `opcode=$${memory[cpu.pc].toString(16).padStart(2, "0")})`);
  }
  return cpu.cycles;
}

function logicalScreen(memory, labels) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const cells = new Uint8Array(22 * 40);
  for (let row = 0; row < 22; row += 1) {
    const address = memory[lo + row] | memory[hi + row] << 8;
    cells.set(memory.subarray(address, address + 40), row * 40);
  }
  return cells;
}

function initialiseRows(memory, labels, head = 0) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  for (let logical = 0; logical < 22; logical += 1) {
    const physical = (head + logical) % 22;
    const address = 0x4050 + physical * 40;
    memory[lo + logical] = address & 0xff;
    memory[hi + logical] = address >> 8;
  }
}

function isTransientEffectGlyph(value) {
  const code = value & 0x7f;
  return (code >= 110 && code < 120) || code === 90 || code === 91;
}

function transientEffectRemnants(memory, labels) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const logicalByPhysical = new Map();
  for (let logical = 0; logical < 22; logical += 1) {
    logicalByPhysical.set(memory[lo + logical] | memory[hi + logical] << 8, logical);
  }
  const remnants = [];
  for (let address = 0x4028; address < 0x43c0; address += 1) {
    const glyph = memory[address];
    if (!isTransientEffectGlyph(glyph)) continue;
    const rowBase = address < 0x4050 ? 0x4028 : 0x4050 +
      Math.floor((address - 0x4050) / 40) * 40;
    remnants.push({
      address,
      glyph,
      logicalRow: address < 0x4050 ? 0 : (logicalByPhysical.get(rowBase) ?? -1) + 1,
      physicalRow: address < 0x4050 ? -1 : Math.floor((address - 0x4050) / 40),
      column: address - rowBase,
    });
  }
  return remnants;
}

function armShot(memory, labels, { x = 126, y = 106, kind = 1 } = {}) {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  memory[active] = kind;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X")] = x;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y")] = y;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y")] = y;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME")] = 10;
}

function snapshot(memory, labels, {
  phase, frame, eraseCycles, updateCycles, renderCycles,
  effectEraseCycles = 0, effectUpdateCycles = 0, effectRenderCycles = 0,
}) {
  const effectState = requiredLabel(labels, "EFFECT_STATE");
  const effectType = requiredLabel(labels, "EFFECT_TYPE");
  const effectX = requiredLabel(labels, "EFFECT_X");
  const effectY = requiredLabel(labels, "EFFECT_Y");
  const effectTimer = requiredLabel(labels, "EFFECT_TIMER");
  const effectRenderId = requiredLabel(labels, "EFFECT_RENDER_ID");
  const effectScreenLo = requiredLabel(labels, "EFFECT_SCREEN_LO");
  const effectScreenHi = requiredLabel(labels, "EFFECT_SCREEN_HI");
  const effectDrawn = requiredLabel(labels, "EFFECT_DRAWN_MASK");
  const effects = [];
  for (let slot = 0; slot < 5; slot += 1) {
    if (memory[effectState + slot] === 0) continue;
    const screenAddress = memory[effectScreenLo + slot] | memory[effectScreenHi + slot] << 8;
    effects.push({
      slot,
      type: memory[effectType + slot],
      x: memory[effectX + slot],
      y: memory[effectY + slot],
      ttl: memory[effectTimer + slot],
      renderId: memory[effectRenderId + slot],
      drawn: memory[effectDrawn + slot],
      screenAddress,
      screenCode: screenAddress === 0 ? 0 : memory[screenAddress],
    });
  }
  return {
    phase,
    frame,
    debrisHp: memory[requiredLabel(labels, "ENTITY_HP")],
    debrisActive: memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")],
    debrisState: memory[requiredLabel(labels, "ENTITY_STATE")],
    debrisHitFlashTimer: memory[requiredLabel(labels, "ENTITY_OWNER")],
    projectileActive: memory[requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE")],
    effectActiveMask: memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")],
    effectRenderedMask: memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")],
    effectActiveCount: memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")],
    effectPending: memory[requiredLabel(labels, "EFFECT_ALLOCATION_RESULT")],
    effects,
    erased: eraseCycles > 0,
    updated: updateCycles > 0,
    rendered: renderCycles > 0,
    eraseCycles,
    updateCycles,
    renderCycles,
    effectEraseCycles,
    effectUpdateCycles,
    effectRenderCycles,
    scoreLo: memory[requiredLabel(labels, "score_bcd_lo")],
    scoreHi: memory[requiredLabel(labels, "score_bcd_hi")],
    enemyHp: memory[requiredLabel(labels, "ENEMY_HP")],
    enemyActive: memory[requiredLabel(labels, "ENEMY_ACTIVE")],
    enemyExplosionTimer:
      memory[requiredLabel(labels, "FIGHTER_EXPLOSION_TIMER") + 1],
    colbk: memory[0xd01a],
    colpm1: memory[0xd013],
    colpm2: memory[0xd014],
    hposp1: memory[0xd001],
    hposp2: memory[0xd002],
    sizep1: memory[0xd009],
    sizep2: memory[0xd00a],
    player1: Uint8Array.from(memory.subarray(0x3d00, 0x3e00)),
    player2: Uint8Array.from(memory.subarray(0x3e00, 0x3f00)),
    screen: logicalScreen(memory, labels),
  };
}

export function executeDebrisDestructionTrace({
  root = defaultRoot, artifact = "xex", ringHead = 0,
} = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "dist", "void-strike-65-manifest.json")));
  const labels = labelsFromFile(path.join(root, "build", "void-strike-65.lbl"));
  const memory = new Uint8Array(0x10000);
  const { requiresBroadsideUnpack } = installBootArtifact(memory, root, artifact);
  if (requiresBroadsideUnpack) runRoutine(memory, labels, "unpack_boot_broadside_runtime");
  runRoutine(memory, labels, "stage_boot_streams");
  runRoutine(memory, labels, "unpack_resident_runtime");
  runRoutine(memory, labels, "unpack_entity_runtime");
  runRoutine(memory, labels, "stage_a2_kernel");
  runRoutine(memory, labels, "init_entity_effects");
  runRoutine(memory, labels, "unpack_weapon_pickup_phase_runtime");
  runRoutine(memory, labels, "unpack_starfield_runtime");
  memory.set(fs.readFileSync(path.join(root, "build", "integration-glue.bin")), 0x4efe);
  memory.fill(0, 0x80f4, 0x8100);
  memory[0x80fb] = 0x6d;
  memory[0x80fc] = 0xff;
  memory[0x80f6] = 3;
  memory[0x80f9] = 0;
  memory[0x80fa] = 0;
  memory[0x80ff] = 0xff;
  runRoutine(memory, labels, "copy_charset");
  runRoutine(memory, labels, "install_entity_effects_glyph");
  initialiseRows(memory, labels, ringHead);
  // The payload occupies screen RAM only during boot. The deterministic
  // fixture starts from the same blank lower layer that gameplay owns after
  // initialization, so every visible byte in the review comes from the linked
  // entity/effect renderers rather than stale compressed boot source.
  memory.fill(0, 0x4000, 0x4400);

  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 1;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENTITY_TYPE")] = 1;
  memory[requiredLabel(labels, "ENTITY_STATE")] = 1;
  memory[requiredLabel(labels, "ENTITY_FLAGS")] = 0x3f;
  memory[requiredLabel(labels, "ENTITY_X")] = 124;
  memory[requiredLabel(labels, "ENTITY_Y")] = 100;
  memory[requiredLabel(labels, "ENTITY_RENDER_ID")] = manifest.entityEffects.glyphIndex;
  memory[requiredLabel(labels, "ENTITY_HP")] = 3;
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = 184;
  memory[requiredLabel(labels, "score_bcd_lo")] = 0x42;
  memory[requiredLabel(labels, "score_bcd_hi")] = 0x07;
  armShot(memory, labels);

  const records = [];
  let worldAccumulator = 0;
  const frameEvent = () => {
    worldAccumulator += 9;
    if (worldAccumulator < 20) return 0;
    worldAccumulator -= 20;
    return 1;
  };
  const runFrame = (phase, frame, shot = false) => {
    memory[requiredLabel(labels, "frame_counter")] += 1;
    const effectEraseProbe = Uint8Array.from(memory);
    const effectEraseCycles = memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")] === 0 ? 0 :
      runRoutine(effectEraseProbe, labels, "erase_transient_effect_overlays");
    const eraseCycles = runRoutine(memory, labels, "entity_effects_erase");
    if (shot) {
      armShot(memory, labels);
      runRoutine(memory, labels, "update_fighter_projectiles");
    }
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = frameEvent();
    const effectUpdateProbe = Uint8Array.from(memory);
    const effectUpdateCycles = runRoutine(effectUpdateProbe, labels, "update_transient_effects");
    const updateCycles = runRoutine(memory, labels, "entity_effects_update");
    const effectRenderProbe = Uint8Array.from(memory);
    const effectRenderCycles = memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")] === 0 ? 0 :
      runRoutine(effectRenderProbe, labels, "render_transient_effect_overlays");
    const renderCycles = runRoutine(memory, labels, "entity_effects_render");
    records.push(snapshot(memory, labels,
      { phase, frame, eraseCycles, updateCycles, renderCycles,
        effectEraseCycles, effectUpdateCycles, effectRenderCycles }));
  };

  runRoutine(memory, labels, "entity_effects_render");
  records.push(snapshot(memory, labels,
    { phase: "PRE_HIT", frame: 0, eraseCycles: 0, updateCycles: 0, renderCycles: 1 }));
  runFrame("HIT_1", 0, true);
  runFrame("HIT_1", 1);
  runFrame("HIT_2", 0, true);
  runFrame("HIT_2", 1);
  for (let frame = 0; frame < 32; frame += 1) runFrame("FINAL", frame, frame === 0);

  return {
    artifact,
    records,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
  };
}

export function executeInterceptorBreakupTrace({
  root = defaultRoot, artifact = "xex", ringHead = 0, frames = 32,
  enemyX = 124, enemyY = 88, playerX = 124, weaponMode = "NORMAL",
  actualPairShotKill = false, rotateRing = false,
  legacyEffectOverlapResolver = false, legacyEnemyProjectileEffectBacking = false,
  enemyProjectileEffectOverlap = false, projectileEffectOverlapSlot = 7,
  clearEffectOwnershipBeforeProjectile = false,
  captureWrites = false,
} = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "dist", "void-strike-65-manifest.json")));
  const labels = labelsFromFile(path.join(root, "build", "void-strike-65.lbl"));
  const memory = new Uint8Array(0x10000);
  const { requiresBroadsideUnpack } = installBootArtifact(memory, root, artifact);
  if (requiresBroadsideUnpack) runRoutine(memory, labels, "unpack_boot_broadside_runtime");
  runRoutine(memory, labels, "stage_boot_streams");
  runRoutine(memory, labels, "unpack_resident_runtime");
  runRoutine(memory, labels, "unpack_entity_runtime");
  runRoutine(memory, labels, "stage_a2_kernel");
  runRoutine(memory, labels, "init_entity_effects");
  runRoutine(memory, labels, "unpack_weapon_pickup_phase_runtime");
  runRoutine(memory, labels, "unpack_starfield_runtime");
  if (legacyEffectOverlapResolver) {
    memory[requiredLabel(labels,
      "resolve_effect_backing_below_transient_effect_regular")] = 0x60;
  }
  if (legacyEnemyProjectileEffectBacking) {
    const patch = requiredLabel(labels, "enemy_projectile_effect_backing_resolve");
    const backing = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
    memory[patch] = 0x9d;
    memory[patch + 1] = backing & 0xff;
    memory[patch + 2] = backing >> 8;
  }
  memory.set(fs.readFileSync(path.join(root, "build", "integration-glue.bin")), 0x4efe);
  memory.fill(0, 0x80f4, 0x8100);
  memory[0x80fb] = 0x6d;
  memory[0x80fc] = 0xff;
  memory[0x80f6] = 3;
  memory[0x80f9] = 0;
  memory[0x80fa] = 0;
  memory[0x80ff] = 0xff;
  runRoutine(memory, labels, "copy_charset");
  runRoutine(memory, labels, "init_fighter_projectiles");
  runRoutine(memory, labels, "install_entity_effects_glyph");
  initialiseRows(memory, labels, ringHead);
  memory.fill(0, 0x3800, 0x4000);
  memory.fill(0, 0x4000, 0x4400);
  // Keep this Interceptor-only visual trace independent from the normal neutral
  // entity scheduler, whose first legal spawn occurs after the same 32-frame
  // window used to prove complete effect expiry.
  memory[requiredLabel(labels, "ENTITY_SPAWN_TIMER_LO")] = 0xff;
  memory[requiredLabel(labels, "ENTITY_SPAWN_TIMER_HI")] = 0xff;

  memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
  memory[requiredLabel(labels, "ENEMY_MEMBER_STATE")] = 1;
  memory[requiredLabel(labels, "ENEMY_TARGET_SLOT")] = 0;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENEMY_HP")] = 1;
  memory[requiredLabel(labels, "ENEMY_X")] = enemyX;
  memory[requiredLabel(labels, "ENEMY_Y")] = enemyY;
  memory[requiredLabel(labels, "player_x")] = playerX;
  memory[requiredLabel(labels, "scanner_phase")] = 0;
  memory[requiredLabel(labels, "score_bcd_lo")] = 0x42;
  memory[requiredLabel(labels, "score_bcd_hi")] = 0x07;
  memory[0xd013] = manifest.enemyRoster.palette.releaseBodyValue;
  memory[0xd014] = manifest.enemyRoster.palette.scannerValue;
  runRoutine(memory, labels, "draw_enemy");

  const records = [];
  const writeLog = captureWrites ? [] : null;
  let enemyProjectileBackingOverlap = null;
  records.push(snapshot(memory, labels,
    { phase: "PRE_HIT", frame: 0, eraseCycles: 0, updateCycles: 0, renderCycles: 0 }));
  let worldAccumulator = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    memory[requiredLabel(labels, "frame_counter")] += 1;
    const effectEraseProbe = Uint8Array.from(memory);
    const effectEraseCycles = memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")] === 0 ? 0 :
      runRoutine(effectEraseProbe, labels, "erase_transient_effect_overlays");
    const eraseCycles = runRoutine(memory, labels, "entity_effects_erase",
      { writeLog, frame });
    runRoutine(memory, labels, "tick_shared_fighter_explosions");
    if (frame === 0) {
      if (actualPairShotKill) {
        const kind = weaponMode === "SPREAD" ? 0x41 : 1;
        armShot(memory, labels, { x: enemyX + 2, y: enemyY + 14, kind });
        runRoutine(memory, labels, "update_fighter_projectiles");
      } else {
        memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 1;
        memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = 0;
      }
      runRoutine(memory, labels, "resolve_enemy_damage");
    } else {
      runRoutine(memory, labels, "update_enemy");
    }
    worldAccumulator += 9;
    const worldAdvanced = worldAccumulator >= 20;
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = worldAdvanced ? 1 : 0;
    if (worldAccumulator >= 20) worldAccumulator -= 20;
    if (rotateRing && worldAdvanced) {
      runRoutine(memory, labels, "rotate_playfield_rows", { writeLog, frame });
    }
    const effectUpdateProbe = Uint8Array.from(memory);
    const effectUpdateCycles = runRoutine(effectUpdateProbe, labels, "update_transient_effects");
    const updateCycles = runRoutine(memory, labels, "entity_effects_update");
    runRoutine(memory, labels, "render_shared_fighter_explosions");
    const effectRenderProbe = Uint8Array.from(memory);
    const effectRenderCycles = memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")] === 0 ? 0 :
      runRoutine(effectRenderProbe, labels, "render_transient_effect_overlays");
    const renderCycles = runRoutine(memory, labels, "entity_effects_render",
      { writeLog, frame });
    if (enemyProjectileEffectOverlap && enemyProjectileBackingOverlap === null &&
        (memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")] & 0x08) !== 0) {
      const effectSlot = 3;
      const projectileSlot = projectileEffectOverlapSlot;
      const projectileActive = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
      const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
      const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
      const projectilePrevY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
      const projectileLifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
      const projectileScreenLo = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
      const projectileScreenHi = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
      const projectileBacking = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
      const effectX = requiredLabel(labels, "EFFECT_X");
      const effectY = requiredLabel(labels, "EFFECT_Y");
      const effectBacking = requiredLabel(labels, "EFFECT_BACKING0");
      const lowerBacking = memory[effectBacking + effectSlot];
      memory[projectileActive + projectileSlot] = 2;
      memory[projectileX + projectileSlot] = memory[effectX + effectSlot] & 0xfe;
      memory[projectileY + projectileSlot] = memory[effectY + effectSlot];
      memory[projectilePrevY + projectileSlot] = memory[effectY + effectSlot];
      memory[projectileLifetime + projectileSlot] = 8;
      if (clearEffectOwnershipBeforeProjectile) {
        memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")] = 0;
        memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")] = 0;
        memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")] = 0;
      }
      const projectileRenderCycles =
        runRoutine(memory, labels, "render_fighter_projectile_overlays");
      const address = memory[projectileScreenLo + projectileSlot] |
        memory[projectileScreenHi + projectileSlot] << 8;
      const savedBacking = memory[projectileBacking + projectileSlot];
      memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")] = 0;
      memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")] = 0;
      memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")] = 0;
      memory[projectileActive + projectileSlot] = 0;
      const projectileEraseCycles =
        runRoutine(memory, labels, "erase_fighter_projectile_overlays");
      enemyProjectileBackingOverlap = {
        frame, effectSlot, projectileSlot, address,
        savedBacking, lowerBacking, restored: memory[address],
        projectileRenderCycles, projectileEraseCycles,
      };
    }
    runRoutine(memory, labels, "update_sound");
    records.push(snapshot(memory, labels,
      { phase: "BREAKUP", frame, eraseCycles, updateCycles, renderCycles,
        effectEraseCycles, effectUpdateCycles, effectRenderCycles }));
  }

  return {
    artifact,
    scenario: { ringHead, enemyX, enemyY, playerX, weaponMode, actualPairShotKill,
      rotateRing, legacyEffectOverlapResolver, legacyEnemyProjectileEffectBacking,
      enemyProjectileEffectOverlap, projectileEffectOverlapSlot,
      clearEffectOwnershipBeforeProjectile },
    records,
    remnants: transientEffectRemnants(memory, labels),
    enemyProjectileBackingOverlap,
    writeLog,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
  };
}

export function executeRaiderRemnantMatrix({
  root = defaultRoot, artifact = "xex", kills = 2000,
  legacyEffectOverlapResolver = false,
} = {}) {
  const modes = ["NORMAL", "RAPID", "SPREAD"];
  const movements = ["STATIONARY", "LEFT", "RIGHT", "REVERSAL"];
  const yBands = [32, 96, 160];
  const failures = [];
  let maximumEffectRenderCycles = 0;
  let pairShotKills = 0;
  let ringStepKills = 0;
  let ringWrapKills = 0;
  for (let kill = 0; kill < kills; kill += 1) {
    const ringHead = kill % 22;
    const band = kill % yBands.length;
    const enemyY = yBands[band] + ((kill * 5) & 0x3f);
    const enemyX = 52 + ((kill * 7) % 35) * 4;
    const movement = movements[kill % movements.length];
    const playerX = movement === "LEFT" ? 72 : movement === "RIGHT" ? 176 :
      movement === "REVERSAL" ? (kill & 1 ? 72 : 176) : 124;
    const trace = executeInterceptorBreakupTrace({
      root, artifact, ringHead, frames: 36, enemyX, enemyY, playerX,
      weaponMode: modes[kill % modes.length], actualPairShotKill: true,
      rotateRing: true, legacyEffectOverlapResolver,
    });
    pairShotKills += trace.records[1].enemyHp === 0 ? 1 : 0;
    ringStepKills += 1;
    ringWrapKills += ringHead >= 8 ? 1 : 0;
    maximumEffectRenderCycles = Math.max(maximumEffectRenderCycles,
      ...trace.records.map((record) => record.effectRenderCycles));
    if (trace.remnants.length !== 0) {
      failures.push({ kill, movement, ...trace.scenario, remnants: trace.remnants });
    }
  }
  let firstFailure = failures[0] ?? null;
  if (firstFailure !== null) {
    const traced = executeInterceptorBreakupTrace({
      root, artifact, frames: 36, captureWrites: true,
      ...firstFailure,
    });
    const addresses = new Set(traced.remnants.map(({ address }) => address));
    firstFailure = { ...firstFailure,
      writerHistory: traced.writeLog.filter(({ address }) => addresses.has(address)),
    };
  }
  return {
    artifact, kills, modes, movements,
    yBands: ["HIGH", "MID", "LOW"],
    pairShotKills, ringStepKills, ringWrapKills,
    singleKillEvents: kills, fiveSlotEffectEvents: kills,
    maximumEffectRenderCycles,
    remnantCount: failures.reduce((sum, failure) => sum + failure.remnants.length, 0),
    failures, firstFailure,
  };
}

export function debrisDestructionTraceCsv(trace) {
  const header = [
    "artifact", "phase", "frame", "debris_hp", "debris_active", "debris_state",
    "hit_flash_timer", "projectile_active", "effects_active_mask",
    "effects_active_count", "slot", "type", "x", "y", "ttl", "render_id",
    "screen_address", "screen_code", "erase", "update", "render", "score",
  ].join(",");
  const rows = [header];
  for (const record of trace.records) {
    const effects = record.effects.length === 0 ? [null] : record.effects;
    for (const effect of effects) {
      rows.push([
        trace.artifact,
        record.phase,
        record.frame,
        record.debrisHp,
        record.debrisActive,
        record.debrisState,
        record.debrisHitFlashTimer,
        record.projectileActive,
        `$${record.effectActiveMask.toString(16).padStart(2, "0").toUpperCase()}`,
        record.effectActiveCount,
        effect?.slot ?? "",
        effect?.type ?? "",
        effect?.x ?? "",
        effect?.y ?? "",
        effect?.ttl ?? "",
        effect?.renderId ?? "",
        effect ? `$${effect.screenAddress.toString(16).padStart(4, "0").toUpperCase()}` : "",
        effect ? `$${effect.screenCode.toString(16).padStart(2, "0").toUpperCase()}` : "",
        Number(record.erased),
        Number(record.updated),
        Number(record.rendered),
        `${record.scoreHi.toString(16).padStart(2, "0")}${record.scoreLo.toString(16).padStart(2, "0")}`,
      ].join(","));
    }
  }
  return `${rows.join("\n")}\n`;
}

export function interceptorBreakupTraceCsv(trace) {
  const header = [
    "artifact", "phase", "frame", "interceptor_hp", "interceptor_active",
    "fighter_explosion_timer", "colbk", "effects_active_mask", "effects_active_count",
    "effect_pending", "slot", "type", "x", "y", "ttl", "render_id", "screen_address", "screen_code",
    "erase", "update", "render", "score",
  ].join(",");
  const rows = [header];
  for (const record of trace.records) {
    const effects = record.effects.length === 0 ? [null] : record.effects;
    for (const effect of effects) {
      rows.push([
        trace.artifact,
        record.phase,
        record.frame,
        record.enemyHp,
        record.enemyActive,
        record.enemyExplosionTimer,
        `$${record.colbk.toString(16).padStart(2, "0").toUpperCase()}`,
        `$${record.effectActiveMask.toString(16).padStart(2, "0").toUpperCase()}`,
        record.effectActiveCount,
        record.effectPending,
        effect?.slot ?? "",
        effect?.type ?? "",
        effect?.x ?? "",
        effect?.y ?? "",
        effect?.ttl ?? "",
        effect?.renderId ?? "",
        effect ? `$${effect.screenAddress.toString(16).padStart(4, "0").toUpperCase()}` : "",
        effect ? `$${effect.screenCode.toString(16).padStart(2, "0").toUpperCase()}` : "",
        Number(record.erased),
        Number(record.updated),
        Number(record.rendered),
        `${record.scoreHi.toString(16).padStart(2, "0")}${record.scoreLo.toString(16).padStart(2, "0")}`,
      ].join(","));
    }
  }
  return `${rows.join("\n")}\n`;
}

export function assertDebrisDestructionTraceParity(left, right) {
  const normalizeRecord = (record) => ({
    ...record,
    screen: Array.from(record.screen),
  });
  const leftState = JSON.stringify(left.records.map(normalizeRecord));
  const rightState = JSON.stringify(right.records.map(normalizeRecord));
  if (leftState !== rightState ||
      Buffer.compare(Buffer.from(left.charset), Buffer.from(right.charset)) !== 0) {
    throw new Error(`Debris destruction runtime differs between ${left.artifact} and ${right.artifact}`);
  }
  return true;
}

export function assertInterceptorBreakupTraceParity(left, right) {
  return assertDebrisDestructionTraceParity(left, right);
}
