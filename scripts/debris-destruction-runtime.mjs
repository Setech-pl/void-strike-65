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

function runRoutine(memory, labels, name) {
  const cpu = new Nmos6502(memory);
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

function armShot(memory, labels) {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  memory[active] = 1;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X")] = 126;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y")] = 106;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y")] = 106;
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
  memory[requiredLabel(labels, "ENEMY_FORMATION_Y_HI")] = 0;
  memory[requiredLabel(labels, "ENEMY_TARGET_SLOT")] = 0;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENEMY_HP")] = 1;
  memory[requiredLabel(labels, "enemy_x")] = 124;
  memory[requiredLabel(labels, "enemy_y")] = 88;
  memory[requiredLabel(labels, "scanner_phase")] = 0;
  memory[requiredLabel(labels, "score_bcd_lo")] = 0x42;
  memory[requiredLabel(labels, "score_bcd_hi")] = 0x07;
  memory[0xd013] = manifest.enemyRoster.palette.releaseBodyValue;
  memory[0xd014] = manifest.enemyRoster.palette.scannerValue;
  runRoutine(memory, labels, "draw_enemy");

  const records = [];
  records.push(snapshot(memory, labels,
    { phase: "PRE_HIT", frame: 0, eraseCycles: 0, updateCycles: 0, renderCycles: 0 }));
  let worldAccumulator = 0;
  for (let frame = 0; frame < 32; frame += 1) {
    memory[requiredLabel(labels, "frame_counter")] += 1;
    const effectEraseProbe = Uint8Array.from(memory);
    const effectEraseCycles = memory[requiredLabel(labels, "EFFECT_RENDERED_MASK")] === 0 ? 0 :
      runRoutine(effectEraseProbe, labels, "erase_transient_effect_overlays");
    const eraseCycles = runRoutine(memory, labels, "entity_effects_erase");
    runRoutine(memory, labels, "tick_shared_fighter_explosions");
    if (frame === 0) {
      memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 1;
      memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = 0;
      runRoutine(memory, labels, "resolve_enemy_damage");
    } else {
      runRoutine(memory, labels, "update_enemy");
    }
    worldAccumulator += 9;
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = worldAccumulator >= 20 ? 1 : 0;
    if (worldAccumulator >= 20) worldAccumulator -= 20;
    const effectUpdateProbe = Uint8Array.from(memory);
    const effectUpdateCycles = runRoutine(effectUpdateProbe, labels, "update_transient_effects");
    const updateCycles = runRoutine(memory, labels, "entity_effects_update");
    runRoutine(memory, labels, "render_shared_fighter_explosions");
    const effectRenderProbe = Uint8Array.from(memory);
    const effectRenderCycles = memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")] === 0 ? 0 :
      runRoutine(effectRenderProbe, labels, "render_transient_effect_overlays");
    const renderCycles = runRoutine(memory, labels, "entity_effects_render");
    runRoutine(memory, labels, "update_sound");
    records.push(snapshot(memory, labels,
      { phase: "BREAKUP", frame, eraseCycles, updateCycles, renderCycles,
        effectEraseCycles, effectUpdateCycles, effectRenderCycles }));
  }

  return {
    artifact,
    records,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
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
