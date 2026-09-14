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
  const ringRows = requiredLabel(labels, "PLAYFIELD_RING_ROWS");
  const ringEnd = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const ringBase = ringEnd - ringRows * 40;
  const cpu = new Nmos6502(memory, writeLog === null ? {} : {
    write(address, value, executingCpu) {
      if ((address >= 0x4028 && address < 0x4050) ||
          (address >= ringBase && address < ringEnd)) {
        const effectBacking = labels.get("EFFECT_BACKING0");
        const entityBacking0 = labels.get("ENTITY_BACKING0");
        const entityBacking1 = labels.get("ENTITY_BACKING1");
        const entityScreenLo = labels.get("ENTITY_SCREEN_LO");
        const entityScreenHi = labels.get("ENTITY_SCREEN_HI");
        const projectileBacking = labels.get("FIGHTER_PROJECTILE_BACKUP_TOP");
        writeLog.push({ frame, routine: name, pc: executingCpu.pc,
          x: executingCpu.x, y: executingCpu.y,
          address, before: memory[address], after: value,
          effectBacking: Number.isInteger(effectBacking) && executingCpu.x < 5 ?
            memory[effectBacking + executingCpu.x] : null,
          entityBacking0: Number.isInteger(entityBacking0) ? memory[entityBacking0] : null,
          entityBacking1: Number.isInteger(entityBacking1) ? memory[entityBacking1] : null,
          entityScreenAddress: Number.isInteger(entityScreenLo) && Number.isInteger(entityScreenHi) ?
            memory[entityScreenLo] | memory[entityScreenHi] << 8 : null,
          projectileBacking: Number.isInteger(projectileBacking) && executingCpu.x < 10 ?
            memory[projectileBacking + executingCpu.x] : null,
          provenanceContext: { ...(writeLog.provenanceContext ?? {}) },
        });
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
  const rows = requiredLabel(labels, "PLAYFIELD_RING_ROWS");
  const cells = new Uint8Array(rows * 40);
  for (let row = 0; row < rows; row += 1) {
    const address = memory[lo + row] | memory[hi + row] << 8;
    cells.set(memory.subarray(address, address + 40), row * 40);
  }
  return cells;
}

function initialiseRows(memory, labels, head = 0) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const rows = requiredLabel(labels, "PLAYFIELD_RING_ROWS");
  const ringBase = lo - rows * 40;
  for (let logical = 0; logical < rows; logical += 1) {
    const physical = (head + logical) % rows;
    const address = ringBase + physical * 40;
    memory.fill(0, address, address + 40);
    memory[lo + logical] = address & 0xff;
    memory[hi + logical] = address >> 8;
  }
}

function isTransientEffectGlyph(value) {
  const code = value & 0x7f;
  return (code >= 110 && code < 120) || code === 90 || code === 91;
}

export const CHARACTER_WRITER_CLASSES = Object.freeze([
  "BASE/RING", "WORLD CLEAR", "NEAR STAR", "ROW-BAKED FAR STAR",
  "DEBRIS", "EFFECT", "PLAYER PAIRSHOT", "ENEMY PAIRSHOT", "IMPACT",
  "RAIDER BREAKUP/DEATH", "OTHER",
]);

function baseProvenance(value = 0) {
  return { writerClass: "BASE/RING", writerSlot: null, generation: 0,
    frame: -1, value, backingSource: null };
}

function analyseCharacterProvenance(writeLog, labels, finalSnapshot) {
  const cells = new Map();
  const ownerFootprints = new Map();
  const backing = new Map();
  const history = [];
  const restoreCandidates = [];
  const effectEraseStart = requiredLabel(labels, "erase_transient_effect_overlays");
  const effectEraseEnd = requiredLabel(labels, "erase_interactive_entity_overlays");

  const cell = (address, value = 0) => cells.get(address) ?? baseProvenance(value);
  const ownerKey = (writerClass, generation, slot) =>
    `${writerClass}:${generation}:${slot}`;
  const setOwned = (key, address) => {
    const addresses = ownerFootprints.get(key) ?? new Set();
    addresses.add(address);
    ownerFootprints.set(key, addresses);
  };
  const releaseOwned = (key, address) => ownerFootprints.get(key)?.delete(address);
  const captured = (visible, savedValue) => {
    if (visible.value === savedValue) return { ...visible };
    const source = visible.backingSource;
    if (source && source.value === savedValue) return { ...source };
    return baseProvenance(savedValue);
  };

  for (const write of writeLog) {
    const context = write.provenanceContext ?? {};
    let writerClass = "OTHER";
    let writerSlot = write.x;
    let generation = 0;
    let action = "write";
    let next = { writerClass, writerSlot, generation, frame: write.frame,
      value: write.after, backingSource: null };
    if (write.routine === "rotate_playfield_rows") {
      writerClass = "BASE/RING";
      writerSlot = null;
      const source = 0x4028 + (write.x & 0xff);
      next = { ...cell(source, write.after), frame: write.frame,
        value: write.after, backingSource: cell(source, write.after) };
      action = "transport";
    } else if (write.routine === "entity_effects_render" && write.pc < 0x9000) {
      writerClass = "EFFECT";
      generation = context.effectGeneration ?? 1;
      const key = ownerKey(writerClass, generation, writerSlot);
      const visible = cell(write.address, write.before);
      const saved = captured(visible, write.effectBacking);
      backing.set(key, saved);
      setOwned(key, write.address);
      next = { writerClass, writerSlot, generation, frame: write.frame,
        value: write.after, backingSource: saved };
      action = "claim";
    } else if (write.pc >= effectEraseStart && write.pc < effectEraseEnd) {
      writerClass = "EFFECT";
      generation = context.effectGeneration ?? 1;
      const key = ownerKey(writerClass, generation, writerSlot);
      releaseOwned(key, write.address);
      next = { ...(backing.get(key) ?? baseProvenance(write.after)),
        frame: write.frame, value: write.after };
      action = "restore";
    } else if (write.routine === "entity_effects_render") {
      writerClass = "DEBRIS";
      writerSlot = write.after & 1;
      generation = context.debrisGeneration ?? 1;
      const key = ownerKey(writerClass, generation, writerSlot);
      const savedValue = writerSlot === 0 ? write.entityBacking0 : write.entityBacking1;
      const saved = captured(cell(write.address, write.before), savedValue);
      backing.set(key, saved);
      setOwned(key, write.address);
      next = { writerClass, writerSlot, generation, frame: write.frame,
        value: write.after, backingSource: saved };
      action = "claim";
    } else if (write.routine === "entity_effects_erase") {
      writerClass = "DEBRIS";
      writerSlot = write.address === write.entityScreenAddress ? 0 : 1;
      generation = context.debrisGeneration ?? 1;
      const key = ownerKey(writerClass, generation, writerSlot);
      releaseOwned(key, write.address);
      next = { ...(backing.get(key) ?? baseProvenance(write.after)),
        frame: write.frame, value: write.after };
      action = "restore";
    } else if (write.routine === "render_fighter_projectile_overlays") {
      writerClass = write.x < 5 ? "PLAYER PAIRSHOT" : "ENEMY PAIRSHOT";
      generation = context.projectileGeneration ?? 1;
      const key = ownerKey(writerClass, generation, write.x);
      const saved = captured(cell(write.address, write.before), write.projectileBacking);
      backing.set(key, saved);
      setOwned(key, write.address);
      next = { writerClass, writerSlot: write.x, generation, frame: write.frame,
        value: write.after, backingSource: saved };
      action = "claim";
    } else if (write.routine === "erase_fighter_projectile_overlays") {
      writerClass = write.x < 5 ? "PLAYER PAIRSHOT" : "ENEMY PAIRSHOT";
      generation = context.projectileGeneration ?? 1;
      const key = ownerKey(writerClass, generation, write.x);
      releaseOwned(key, write.address);
      next = { ...(backing.get(key) ?? baseProvenance(write.after)),
        frame: write.frame, value: write.after };
      action = "restore";
    }
    if (action === "restore" && next.generation !== 0) {
      const restoredKey = ownerKey(next.writerClass, next.generation, next.writerSlot);
      if (!ownerFootprints.get(restoredKey)?.has(write.address)) {
        restoreCandidates.push({ ...write, restoredProvenance: next });
      }
    }
    cells.set(write.address, next);
    history.push({ ...write, writerClass, writerSlot, generation, action,
      resultingProvenance: next });
  }

  const activeAddresses = new Set(finalSnapshot.activeVisualAddresses ?? []);
  const orphanCells = [...cells].filter(([address, metadata]) =>
    metadata.generation !== 0 && !activeAddresses.has(address))
    .map(([address, metadata]) => ({ address, ...metadata }));
  const staleRestores = restoreCandidates.filter((restore) => orphanCells.some((orphan) =>
    orphan.address === restore.address &&
    orphan.writerClass === restore.restoredProvenance.writerClass &&
    orphan.writerSlot === restore.restoredProvenance.writerSlot &&
    orphan.generation === restore.restoredProvenance.generation));
  return {
    writerClasses: CHARACTER_WRITER_CLASSES,
    history,
    staleRestores,
    transientRestoreCandidates: restoreCandidates,
    orphanCells,
    deadGenerationCells: orphanCells,
  };
}

function transientEffectRemnants(memory, labels) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const rows = requiredLabel(labels, "PLAYFIELD_RING_ROWS");
  const ringBase = lo - rows * 40;
  const logicalByPhysical = new Map();
  for (let logical = 0; logical < rows; logical += 1) {
    logicalByPhysical.set(memory[lo + logical] | memory[hi + logical] << 8, logical);
  }
  const remnants = [];
  const addresses = [
    ...Array.from({ length: 40 }, (_, column) => 0x4028 + column),
    ...Array.from({ length: rows * 40 }, (_, offset) => ringBase + offset),
  ];
  for (const address of addresses) {
    const glyph = memory[address];
    if (!isTransientEffectGlyph(glyph)) continue;
    const rowBase = address < ringBase ? 0x4028 : ringBase +
      Math.floor((address - ringBase) / 40) * 40;
    remnants.push({
      address,
      glyph,
      logicalRow: address < ringBase ? 0 : (logicalByPhysical.get(rowBase) ?? -1) + 1,
      physicalRow: address < ringBase ? -1 : Math.floor((address - ringBase) / 40),
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

function armGameplayDebris(memory, labels, { x, y }) {
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] |= 1;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENTITY_TYPE")] = 1;
  memory[requiredLabel(labels, "ENTITY_STATE")] = 1;
  memory[requiredLabel(labels, "ENTITY_FLAGS")] = 0x3f;
  memory[requiredLabel(labels, "ENTITY_X")] = x;
  memory[requiredLabel(labels, "ENTITY_Y")] = y;
  memory[requiredLabel(labels, "ENTITY_VX")] = 0;
  memory[requiredLabel(labels, "ENTITY_VY")] = 8;
  memory[requiredLabel(labels, "ENTITY_TIMER")] = 0;
  memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR")] = 0;
  memory[requiredLabel(labels, "ENTITY_RENDER_ID")] = 110;
  memory[requiredLabel(labels, "ENTITY_COLLISION_CATEGORY")] = 1;
  memory[requiredLabel(labels, "ENTITY_HP")] = 3;
  memory[requiredLabel(labels, "ENTITY_OWNER")] = 0;
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
  const activeVisualAddresses = [];
  const effectRenderedMask = memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")];
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
    if ((effectRenderedMask & (1 << slot)) !== 0 && screenAddress !== 0) {
      activeVisualAddresses.push(screenAddress);
    }
  }
  const entityScreenAddress = memory[requiredLabel(labels, "ENTITY_SCREEN_LO")] |
    memory[requiredLabel(labels, "ENTITY_SCREEN_HI")] << 8;
  if (entityScreenAddress !== 0 && memory[requiredLabel(labels, "ENTITY_DRAWN_MASK")] !== 0) {
    activeVisualAddresses.push(entityScreenAddress, (entityScreenAddress + 1) & 0xffff);
  }
  const projectileRendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const projectileScreenLo = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const projectileScreenHi = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  for (let slot = 0; slot < 10; slot += 1) {
    if (memory[projectileRendered + slot] === 0) continue;
    activeVisualAddresses.push(memory[projectileScreenLo + slot] |
      memory[projectileScreenHi + slot] << 8);
  }
  return {
    phase,
    frame,
    debrisHp: memory[requiredLabel(labels, "ENTITY_HP")],
    debrisActive: memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")],
    debrisState: memory[requiredLabel(labels, "ENTITY_STATE")],
    debrisCollisionCategory:
      memory[requiredLabel(labels, "ENTITY_COLLISION_CATEGORY")],
    debrisScreenAddress: entityScreenAddress,
    debrisDrawnMask: memory[requiredLabel(labels, "ENTITY_DRAWN_MASK")],
    debrisHitFlashTimer: memory[requiredLabel(labels, "ENTITY_OWNER")],
    projectileActive: memory[requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE")],
    effectActiveMask: memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")],
    effectRenderedMask: memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")],
    effectActiveCount: memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")],
    effectPending: memory[requiredLabel(labels, "EFFECT_ALLOCATION_RESULT")],
    effects,
    activeVisualAddresses,
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
    enemyHpSlots: [0, 1].map((slot) =>
      memory[requiredLabel(labels, "ENEMY_HP") + slot]),
    enemyActive: memory[requiredLabel(labels, "ENEMY_ACTIVE")],
    enemyMemberStates: [0, 1].map((slot) =>
      memory[requiredLabel(labels, "ENEMY_MEMBER_STATE") + slot]),
    enemyExplosionTimer:
      memory[requiredLabel(labels, "FIGHTER_EXPLOSION_TIMER") + 1],
    enemyExplosionX:
      memory[requiredLabel(labels, "FIGHTER_EXPLOSION_X") + 1],
    enemyExplosionY:
      memory[requiredLabel(labels, "FIGHTER_EXPLOSION_Y") + 1],
    enemyTargetSlot: memory[requiredLabel(labels, "ENEMY_TARGET_SLOT")],
    enemyXSlots: [0, 1].map((slot) =>
      memory[requiredLabel(labels, "ENEMY_X") + slot]),
    enemyYSlots: [0, 1].map((slot) =>
      memory[requiredLabel(labels, "ENEMY_Y") + slot]),
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
  raiderSlot = 0, secondRaider = false, secondKillFrame = null,
  preexistingEffectCount = 0,
  actualPairShotKill = false, rotateRing = false,
  legacyEffectOverlapResolver = false, legacyEnemyProjectileEffectBacking = false,
  enemyProjectileEffectOverlap = false, projectileEffectOverlapSlot = 7,
  clearEffectOwnershipBeforeProjectile = false,
  activeDebrisOverlap = false,
  activeEnemyProjectileOverlap = false,
  legacyInteractiveDebrisEffectBacking = false,
  legacyEffectEnemyPairshotBacking = false,
  captureWrites = false, captureProvenance = false,
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
  if (legacyInteractiveDebrisEffectBacking) {
    memory[requiredLabel(labels,
      "resolve_effect_backing_below_interactive_debris")] = 0x60;
  }
  if (legacyEffectEnemyPairshotBacking) {
    memory[requiredLabel(labels,
      "resolve_effect_backing_below_enemy_pairshot")] = 0x60;
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

  const otherRaiderSlot = raiderSlot ^ 1;
  memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
  memory[requiredLabel(labels, "ENEMY_MEMBER_STATE") + raiderSlot] = 1;
  memory[requiredLabel(labels, "ENEMY_TARGET_SLOT")] = raiderSlot;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = secondRaider ? 2 : 1;
  memory[requiredLabel(labels, "ENEMY_HP") + raiderSlot] = 1;
  memory[requiredLabel(labels, "ENEMY_X") + raiderSlot] = enemyX;
  memory[requiredLabel(labels, "ENEMY_Y") + raiderSlot] = enemyY;
  if (secondRaider) {
    memory[requiredLabel(labels, "ENEMY_MEMBER_STATE") + otherRaiderSlot] = 1;
    memory[requiredLabel(labels, "ENEMY_HP") + otherRaiderSlot] = 3;
    memory[requiredLabel(labels, "ENEMY_X") + otherRaiderSlot] =
      enemyX < 120 ? enemyX + 32 : enemyX - 32;
    memory[requiredLabel(labels, "ENEMY_Y") + otherRaiderSlot] = enemyY;
  }
  memory[requiredLabel(labels, "player_x")] = playerX;
  memory[requiredLabel(labels, "scanner_phase")] = 0;
  memory[requiredLabel(labels, "score_bcd_lo")] = 0x42;
  memory[requiredLabel(labels, "score_bcd_hi")] = 0x07;
  memory[0xd013] = manifest.enemyRoster.palette.releaseBodyValue;
  memory[0xd014] = manifest.enemyRoster.palette.scannerValue;
  const writeLog = captureWrites || captureProvenance ? [] : null;
  runRoutine(memory, labels, "draw_enemy");
  if (![0, 1, 3, 5].includes(preexistingEffectCount)) {
    throw new Error(`Unsupported preexisting effect count ${preexistingEffectCount}`);
  }
  if (preexistingEffectCount > 0) {
    if (writeLog !== null) writeLog.provenanceContext = { effectGeneration: 1 };
    const activeMask = (1 << preexistingEffectCount) - 1;
    memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")] = activeMask;
    memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")] = preexistingEffectCount;
    for (let slot = 0; slot < preexistingEffectCount; slot += 1) {
      memory[requiredLabel(labels, "EFFECT_STATE") + slot] = 1;
      memory[requiredLabel(labels, "EFFECT_TYPE") + slot] = slot === 0 ? 0 : 1;
      memory[requiredLabel(labels, "EFFECT_X") + slot] = enemyX + (slot - 2) * 4;
      memory[requiredLabel(labels, "EFFECT_Y") + slot] = enemyY + (slot & 1) * 8;
      memory[requiredLabel(labels, "EFFECT_TIMER") + slot] = 12;
      memory[requiredLabel(labels, "EFFECT_RENDER_ID") + slot] = slot === 0 ? 110 : 118;
    }
    memory[requiredLabel(labels, "frame_counter")] = 0;
    runRoutine(memory, labels, "entity_effects_render", { writeLog, frame: -2 });
    memory[requiredLabel(labels, "frame_counter")] = 1;
    runRoutine(memory, labels, "entity_effects_render", { writeLog, frame: -1 });
    memory[requiredLabel(labels, "frame_counter")] = 0;
  }

  const records = [];
  let enemyProjectileBackingOverlap = null;
  records.push(snapshot(memory, labels,
    { phase: "PRE_HIT", frame: 0, eraseCycles: 0, updateCycles: 0, renderCycles: 0 }));
  let worldAccumulator = 0;
  const deathEffectGeneration = preexistingEffectCount > 0 ? 2 : 1;
  let currentEffectGeneration = preexistingEffectCount > 0 ? 1 : deathEffectGeneration;
  for (let frame = 0; frame < frames; frame += 1) {
    if (writeLog !== null) {
      writeLog.provenanceContext = {
        effectGeneration: currentEffectGeneration,
        debrisGeneration: activeDebrisOverlap ? 1 : 0,
        projectileGeneration: activeEnemyProjectileOverlap ? 1 : 0,
      };
    }
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
        runRoutine(memory, labels, "update_fighter_projectiles", { writeLog, frame });
      } else {
        memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE") + raiderSlot] = 1;
        memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE") + raiderSlot] = 0;
      }
      runRoutine(memory, labels, "resolve_enemy_damage", { writeLog, frame });
      currentEffectGeneration = deathEffectGeneration;
      if (writeLog !== null) {
        writeLog.provenanceContext.effectGeneration = currentEffectGeneration;
      }
      if (activeDebrisOverlap) {
        armGameplayDebris(memory, labels, {
          x: memory[requiredLabel(labels, "FIGHTER_EXPLOSION_X") + 1] + 6,
          y: memory[requiredLabel(labels, "FIGHTER_EXPLOSION_Y") + 1],
        });
      }
    } else {
      runRoutine(memory, labels, "update_enemy");
      if (secondRaider && frame === secondKillFrame) {
        const pendingDamage = requiredLabel(labels, "ENEMY_PENDING_DAMAGE");
        const pendingSource = requiredLabel(labels, "ENEMY_PENDING_SOURCE");
        memory[pendingDamage + otherRaiderSlot] = 3;
        memory[pendingSource + otherRaiderSlot] = 0;
        runRoutine(memory, labels, "resolve_enemy_damage", { writeLog, frame });
        currentEffectGeneration += 1;
        if (writeLog !== null) {
          writeLog.provenanceContext.effectGeneration = currentEffectGeneration;
        }
      }
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
    if (activeEnemyProjectileOverlap && frame === 0) {
      const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
      const slot = 5;
      memory[active + slot] = 2;
      memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X") + slot] =
        memory[requiredLabel(labels, "FIGHTER_EXPLOSION_X") + 1] + 6;
      memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y") + slot] =
        memory[requiredLabel(labels, "FIGHTER_EXPLOSION_Y") + 1];
      memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y") + slot] =
        memory[requiredLabel(labels, "FIGHTER_EXPLOSION_Y") + 1];
      memory[requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME") + slot] = 8;
      runRoutine(memory, labels, "render_fighter_projectile_overlays",
        { writeLog, frame });
    } else if (activeEnemyProjectileOverlap && frame > 0) {
      runRoutine(memory, labels, "erase_fighter_projectile_overlays",
        { writeLog, frame });
      if (frame === 1) {
        memory[requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE") + 5] = 0;
      }
      runRoutine(memory, labels, "render_fighter_projectile_overlays",
        { writeLog, frame });
    }
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
    scenario: { ringHead, enemyX, enemyY, playerX, weaponMode, raiderSlot,
      secondRaider, secondKillFrame, preexistingEffectCount, actualPairShotKill,
      rotateRing, legacyEffectOverlapResolver, legacyEnemyProjectileEffectBacking,
      enemyProjectileEffectOverlap, projectileEffectOverlapSlot,
      clearEffectOwnershipBeforeProjectile, activeDebrisOverlap,
      activeEnemyProjectileOverlap, legacyInteractiveDebrisEffectBacking,
      legacyEffectEnemyPairshotBacking, captureProvenance },
    records,
    remnants: transientEffectRemnants(memory, labels),
    enemyProjectileBackingOverlap,
    writeLog,
    provenance: captureProvenance ?
      analyseCharacterProvenance(writeLog, labels, records.at(-1)) : null,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
  };
}

export function executeProjectileDebrisBackingTrace({
  root = defaultRoot, artifact = "xex", legacyProjectileDebrisBacking = false,
  projectileSlot = 1, debrisX = 124, debrisY = 136, debrisCellOffset = 4,
} = {}) {
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
  runRoutine(memory, labels, "copy_charset");
  runRoutine(memory, labels, "init_fighter_projectiles");
  runRoutine(memory, labels, "install_entity_effects_glyph");
  initialiseRows(memory, labels, 0);
  memory.fill(0, 0x4000, 0x4400);

  if (legacyProjectileDebrisBacking) {
    const call = requiredLabel(labels, "projectile_debris_backing_resolve");
    memory.fill(0xea, call, call + 3);
  }

  armGameplayDebris(memory, labels, { x: debrisX, y: debrisY });
  memory[requiredLabel(labels, "ENTITY_RENDER_ID")] = 116;
  memory[requiredLabel(labels, "ENTITY_TIMER")] = 4;
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = 184;

  const writeLog = [];
  writeLog.provenanceContext = { debrisGeneration: 1, projectileGeneration: 1 };
  const debrisRenderCycles = runRoutine(memory, labels, "entity_effects_render",
    { writeLog, frame: 0 });
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const projectilePrevY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const projectileLifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  memory[active + projectileSlot] = 1;
  memory[projectileX + projectileSlot] = debrisX + debrisCellOffset;
  memory[projectileY + projectileSlot] = debrisY;
  memory[projectilePrevY + projectileSlot] = debrisY;
  memory[projectileLifetime + projectileSlot] = 10;
  const projectileRenderCycles = runRoutine(memory, labels,
    "render_fighter_projectile_overlays", { writeLog, frame: 0 });
  const screenLo = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHi = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const backing = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
  const address = memory[screenLo + projectileSlot] |
    memory[screenHi + projectileSlot] << 8;
  const savedBacking = memory[backing + projectileSlot];

  const entityEraseCycles = runRoutine(memory, labels, "entity_effects_erase",
    { writeLog, frame: 1 });
  const afterEntityErase = memory[address];
  memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 1;
  const entityUpdateCycles = runRoutine(memory, labels, "entity_effects_update",
    { writeLog, frame: 1 });
  const movedY = memory[requiredLabel(labels, "ENTITY_Y")];
  const movedX = memory[requiredLabel(labels, "ENTITY_X")];
  const movedRenderCycles = runRoutine(memory, labels, "entity_effects_render",
    { writeLog, frame: 1 });
  const projectileEraseCycles = runRoutine(memory, labels,
    "erase_fighter_projectile_overlays", { writeLog, frame: 1 });
  const restored = memory[address];

  return {
    artifact,
    projectileSlot,
    debrisCellOffset,
    debris: { type: memory[requiredLabel(labels, "ENTITY_TYPE")], slot: 0,
      renderId: 116, initialX: debrisX, initialY: debrisY, movedX, movedY },
    address,
    visibleGlyph: 116 + (debrisCellOffset >> 2),
    savedBacking,
    afterEntityErase,
    restored,
    staleRestore: restored === 116 + (debrisCellOffset >> 2),
    cycles: { debrisRenderCycles, projectileRenderCycles, entityEraseCycles,
      entityUpdateCycles, movedRenderCycles, projectileEraseCycles },
    writes: writeLog.filter((write) => write.address === address).map((write) => ({
      frame: write.frame, routine: write.routine, pc: write.pc,
      x: write.x, before: write.before, after: write.after,
      projectileBacking: write.projectileBacking,
    })),
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

export function executeRemainingRaiderRemnantMatrix({
  root = defaultRoot, artifact = "xex", kills = 5000,
} = {}) {
  const modes = ["NORMAL", "RAPID", "SPREAD"];
  const movements = ["STATIONARY", "LEFT", "RIGHT", "REVERSAL"];
  const effectCounts = [0, 1, 3, 5];
  const overlaps = ["NONE", "DEBRIS", "ENEMY_PAIRSHOT"];
  const yBands = [40, 96, 152];
  const failures = [];
  const coverage = {
    raiderSlotA: 0, raiderSlotB: 0, singleRaider: 0, twoRaiders: 0,
    nearSimultaneousKills: 0, ringSteps: 0, ringWraps: 0,
    activeDebris: 0, noDebris: 0, enemyFire: 0, noEnemyFire: 0,
    preexistingEffects: { 0: 0, 1: 0, 3: 0, 5: 0 },
  };
  let killEvents = 0;
  let staleBackingRestores = 0;
  let deadGenerationCells = 0;
  let orphanVisualCells = 0;
  let legitimateDebrisRecords = 0;
  let maximumEffectRenderCycles = 0;

  for (let kill = 0; kill < kills; kill += 1) {
    const raiderSlot = kill & 1;
    const secondRaider = (kill & 3) !== 0;
    const overlap = overlaps[kill % overlaps.length];
    const secondKillFrame = secondRaider && overlap === "NONE" && kill % 10 === 0 ? 2 : null;
    const ringHead = kill % 27;
    const band = kill % yBands.length;
    const enemyY = yBands[band] + ((kill * 5) % 25);
    const enemyX = 84 + ((kill * 7) % 18) * 4;
    const movement = movements[kill % movements.length];
    const playerX = movement === "LEFT" ? 72 : movement === "RIGHT" ? 176 :
      movement === "REVERSAL" ? (kill & 1 ? 72 : 176) : 124;
    const preexistingEffectCount = overlap === "DEBRIS" ? 0 :
      effectCounts[kill % effectCounts.length];
    const trace = executeInterceptorBreakupTrace({
      root, artifact, ringHead, frames: 40, enemyX, enemyY, playerX,
      weaponMode: modes[kill % modes.length], raiderSlot, secondRaider,
      secondKillFrame, preexistingEffectCount, actualPairShotKill: true,
      rotateRing: true, activeDebrisOverlap: overlap === "DEBRIS",
      activeEnemyProjectileOverlap: overlap === "ENEMY_PAIRSHOT",
      captureProvenance: true,
    });
    const primaryKilled = trace.records[1].enemyHpSlots[raiderSlot] === 0;
    const secondaryKilled = secondKillFrame === null ||
      trace.records.at(-1).enemyHpSlots[raiderSlot ^ 1] === 0;
    killEvents += Number(primaryKilled) + Number(secondKillFrame !== null && secondaryKilled);
    coverage.raiderSlotA += Number(raiderSlot === 0);
    coverage.raiderSlotB += Number(raiderSlot === 1);
    coverage.singleRaider += Number(!secondRaider);
    coverage.twoRaiders += Number(secondRaider);
    coverage.nearSimultaneousKills += Number(secondKillFrame !== null);
    coverage.ringSteps += 1;
    coverage.ringWraps += Number(ringHead + Math.floor(40 * 9 / 20) >= 27);
    coverage.activeDebris += Number(overlap === "DEBRIS");
    coverage.noDebris += Number(overlap !== "DEBRIS");
    coverage.enemyFire += Number(overlap === "ENEMY_PAIRSHOT");
    coverage.noEnemyFire += Number(overlap !== "ENEMY_PAIRSHOT");
    coverage.preexistingEffects[preexistingEffectCount] += 1;
    const final = trace.records.at(-1);
    if (overlap === "DEBRIS" && final.debrisActive !== 0 &&
        final.debrisState !== 0 && final.debrisCollisionCategory !== 0 &&
        final.debrisHp > 0) {
      legitimateDebrisRecords += 1;
    }
    const stale = trace.provenance.staleRestores.length;
    const dead = trace.provenance.deadGenerationCells.length;
    const orphan = trace.provenance.orphanCells.length;
    staleBackingRestores += stale;
    deadGenerationCells += dead;
    orphanVisualCells += orphan;
    maximumEffectRenderCycles = Math.max(maximumEffectRenderCycles,
      ...trace.records.map((record) => record.effectRenderCycles));
    if (!primaryKilled || !secondaryKilled || stale !== 0 || dead !== 0 || orphan !== 0) {
      failures.push({ kill, movement, overlap, primaryKilled, secondaryKilled,
        staleBackingRestores: stale, deadGenerationCells: dead,
        orphanVisualCells: orphan, ...trace.scenario,
        firstStaleRestore: trace.provenance.staleRestores[0] ?? null,
        firstOrphan: trace.provenance.orphanCells[0] ?? null });
    }
  }

  return {
    artifact, requestedPrimaryKills: kills, killEvents, modes, movements,
    yBands: ["HIGH", "MID", "LOW"], effectCounts, overlaps, coverage,
    legitimateDebrisRecords, staleBackingRestores, deadGenerationCells,
    orphanVisualCells, remnantCount: orphanVisualCells,
    lostErase: staleBackingRestores,
    maximumEffectRenderCycles, failures, firstFailure: failures[0] ?? null,
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
