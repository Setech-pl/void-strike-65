import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "./nmos6502.mjs";
import { initialiseRuntime, requiredLabel } from "./weapon-pickup-runtime.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");
const projectileSlotBase = 5;
const projectileSlotCount = 5;
const ringBase = 0x8140;
const ringEnd = ringBase + 27 * 40;
const dividerBase = 0x4028;
const dividerEnd = dividerBase + 40;
const pmgBase = 0x3d00;
const pmgEnd = 0x3f00;

function runLogged(memory, labels, name, writes) {
  const cpu = new Nmos6502(memory, {
    write(address, value, executingCpu) {
      const character = (address >= dividerBase && address < dividerEnd) ||
        (address >= ringBase && address < ringEnd);
      const pmg = address >= pmgBase && address < pmgEnd;
      if (character || pmg) writes.push({
        routine: name,
        pc: executingCpu.pc,
        x: executingCpu.x,
        y: executingCpu.y,
        address,
        before: memory[address],
        after: value,
        character,
        pmg,
      });
    },
  });
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  if (cpu.pc !== stop) throw new Error(`${name} did not return`);
  return cpu.cycles;
}

function armFormation(memory, labels, emitter, caseIndex) {
  const memberState = requiredLabel(labels, "ENEMY_MEMBER_STATE");
  const hp = requiredLabel(labels, "ENEMY_HP");
  const x = requiredLabel(labels, "ENEMY_X");
  const y = requiredLabel(labels, "ENEMY_Y");
  memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
  memory[memberState] = 1;
  memory[memberState + 1] = 1;
  memory[hp] = 1;
  memory[hp + 1] = 1;
  memory[x] = 72 + (caseIndex % 5) * 12;
  memory[x + 1] = 144 - (caseIndex % 5) * 8;
  memory[y] = 32 + (caseIndex % 4) * 16;
  memory[y + 1] = 48 + (caseIndex % 4) * 16;
  memory[requiredLabel(labels, "ENEMY_TARGET_SLOT")] = emitter;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 2;
}

function screenCoordinates(memory, labels, slot) {
  const x = memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X") + slot];
  const y = memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y") + slot];
  return {
    x,
    y,
    cell_x: 48 + (((x - 48) >>> 2) * 4),
    cell_y: y & 0xf8,
    phase_x: x & 0x03,
    phase_y: y & 0x07,
  };
}

function executeCase({ root, artifact, caseIndex, withShot, legacyEmitterPersistence }) {
  const { memory, labels } = initialiseRuntime(root, artifact);
  if (legacyEmitterPersistence) {
    const cleanup = requiredLabel(labels,
      "begin_enemy_fighter_explosion_with_projectile_cleanup");
    const explosion = requiredLabel(labels, "begin_enemy_fighter_explosion_tail");
    memory[cleanup] = 0x4c;
    memory[cleanup + 1] = explosion & 0xff;
    memory[cleanup + 2] = explosion >> 8;
  }
  const emitter = caseIndex & 1;
  armFormation(memory, labels, emitter, caseIndex);
  const writes = [];
  let allocatedSlot = null;
  if (withShot) {
    runLogged(memory, labels, "allocate_interceptor_projectile", writes);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    allocatedSlot = Array.from({ length: projectileSlotCount }, (_, index) =>
      projectileSlotBase + index).find((slot) => memory[active + slot] !== 0);
    runLogged(memory, labels, "render_fighter_projectile_overlays", writes);
  }

  const preKillWriteCount = writes.length;
  runLogged(memory, labels, "update_fighter_projectiles", writes);
  const pendingDamage = requiredLabel(labels, "ENEMY_PENDING_DAMAGE");
  const pendingSource = requiredLabel(labels, "ENEMY_PENDING_SOURCE");
  memory[pendingDamage + emitter] = 1;
  memory[pendingSource + emitter] = 0;
  runLogged(memory, labels, "resolve_enemy_damage", writes);
  // Production publication order: retire every OLD PairShot after simulation,
  // then publish only records which remain active.
  runLogged(memory, labels, "erase_fighter_projectile_overlays", writes);
  runLogged(memory, labels, "render_fighter_projectile_overlays", writes);

  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const screenLo = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHi = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const postKillProjectiles = Array.from({ length: projectileSlotCount }, (_, index) =>
    projectileSlotBase + index).flatMap((slot) => {
    if (memory[active + slot] === 0 || memory[rendered + slot] === 0) return [];
    const address = memory[screenLo + slot] | memory[screenHi + slot] << 8;
    const renderWrite = writes.findLast((write) => write.routine ===
      "render_fighter_projectile_overlays" && write.address === address && write.x === slot);
    return [{
      emitter,
      slot,
      active: memory[active + slot],
      ...screenCoordinates(memory, labels, slot),
      lifetime: memory[lifetime + slot],
      rendered: memory[rendered + slot],
      screen_address: address,
      screen_code: memory[address],
      glyph: memory[address] & 0x7f,
      writer_pc: renderWrite?.pc ?? null,
      writer_x: renderWrite?.x ?? null,
      exact_coordinate_correlation: renderWrite?.x === slot,
    }];
  });
  const postKillWrites = writes.slice(preKillWriteCount);
  return {
    case: caseIndex,
    emitter,
    with_shot: withShot,
    allocated_slot: allocatedSlot,
    post_kill_projectiles: postKillProjectiles,
    writes: {
      pairshot_character: postKillWrites.filter((write) => write.character &&
        ["erase_fighter_projectile_overlays", "render_fighter_projectile_overlays"]
          .includes(write.routine)).length,
      pmg: postKillWrites.filter((write) => write.pmg).length,
      character_effect: postKillWrites.filter((write) => write.character &&
        write.routine.includes("effect")).length,
      gameplay_debris: postKillWrites.filter((write) => write.character &&
        write.routine.includes("entity")).length,
    },
  };
}

export function executeRaiderProjectilePersistenceAttribution({
  root = defaultRoot, artifact = "xex", casesPerScenario = 20,
  legacyEmitterPersistence = false,
} = {}) {
  const withShot = Array.from({ length: casesPerScenario }, (_, caseIndex) =>
    executeCase({ root, artifact, caseIndex, withShot: true, legacyEmitterPersistence }));
  const withoutShot = Array.from({ length: casesPerScenario }, (_, caseIndex) =>
    executeCase({ root, artifact, caseIndex, withShot: false, legacyEmitterPersistence }));
  return {
    schema_version: 1,
    artifact,
    legacy_emitter_persistence: legacyEmitterPersistence,
    cases_per_scenario: casesPerScenario,
    post_kill_falling_objects_after_active_shot: withShot.reduce((sum, item) =>
      sum + item.post_kill_projectiles.length, 0),
    post_kill_falling_objects_without_active_shot: withoutShot.reduce((sum, item) =>
      sum + item.post_kill_projectiles.length, 0),
    all_visible_objects_are_active_enemy_pairshots: withShot.every((item) =>
      item.post_kill_projectiles.length === 1 &&
      item.post_kill_projectiles.every((projectile) =>
        projectile.exact_coordinate_correlation && projectile.slot === item.allocated_slot)),
    with_shot: withShot,
    without_shot: withoutShot,
  };
}

export function executeRaiderProjectileOwnershipIsolation({
  root = defaultRoot, artifact = "xex", killEmitter = 0,
  renderedAtKill = true, projectileY = 96,
} = {}) {
  const { memory, labels } = initialiseRuntime(root, artifact);
  armFormation(memory, labels, killEmitter, 0);
  const writes = [];
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const x = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const y = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const screenLo = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHi = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const target = requiredLabel(labels, "ENEMY_TARGET_SLOT");
  const allocationCycles = [];
  for (const emitter of [0, 1]) {
    memory[target] = emitter;
    allocationCycles.push(runLogged(memory, labels,
      "allocate_interceptor_projectile", writes));
  }
  const slots = [projectileSlotBase, projectileSlotBase + 1];
  for (const [emitter, slot] of slots.entries()) {
    memory[x + slot] = emitter === 0 ? 88 : 140;
    memory[y + slot] = projectileY + emitter * 8;
    memory[previousY + slot] = memory[y + slot];
    memory[lifetime + slot] = 41 + emitter * 16;
  }
  const backgrounds = new Map();
  const ownershipValuesAfterAllocation = slots.map((slot) => memory[active + slot]);
  if (renderedAtKill) {
    runLogged(memory, labels, "render_fighter_projectile_overlays", writes);
    for (const slot of slots) {
      const address = memory[screenLo + slot] | memory[screenHi + slot] << 8;
      backgrounds.set(slot, memory[requiredLabel(labels,
        "FIGHTER_PROJECTILE_BACKUP_TOP") + slot]);
      if (memory[address] === backgrounds.get(slot))
        throw new Error(`slot ${slot} did not publish before kill`);
    }
  }
  memory[target] = killEmitter;
  memory[requiredLabel(labels, "sound_enabled")] = 1;
  memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE") + killEmitter] = 1;
  memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE") + killEmitter] = 0;
  const destructionCycles = runLogged(memory, labels, "resolve_enemy_damage", writes);
  const destructionFeedback = {
    enemy_explosion_timer: memory[requiredLabel(labels, "FIGHTER_EXPLOSION_TIMER") + 1],
    hit_sound_timer: memory[requiredLabel(labels, "hit_timer")],
    score_bcd_lo: memory[requiredLabel(labels, "score_bcd_lo")],
    score_bcd_hi: memory[requiredLabel(labels, "score_bcd_hi")],
    destroyed_member_state: memory[requiredLabel(labels, "ENEMY_MEMBER_STATE") + killEmitter],
    foreign_member_state: memory[requiredLabel(labels, "ENEMY_MEMBER_STATE") + (killEmitter ^ 1)],
    enemy_live_count: memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")],
  };
  const afterResolve = slots.map((slot) => ({
    slot,
    active: memory[active + slot],
    rendered: memory[rendered + slot],
  }));
  const publicationWriteStart = writes.length;
  runLogged(memory, labels, "erase_fighter_projectile_overlays", writes);
  runLogged(memory, labels, "render_fighter_projectile_overlays", writes);
  const afterPublication = slots.map((slot, emitter) => {
    const address = memory[screenLo + slot] | memory[screenHi + slot] << 8;
    return {
      emitter,
      slot,
      active: memory[active + slot],
      rendered: memory[rendered + slot],
      x: memory[x + slot],
      y: memory[y + slot],
      lifetime: memory[lifetime + slot],
      screen_address: address,
      screen_code: memory[address],
      backing: backgrounds.get(slot) ?? 0,
      killed_cell_restored: emitter !== killEmitter || !renderedAtKill ||
        memory[address] === backgrounds.get(slot),
    };
  });
  const publicationWrites = writes.slice(publicationWriteStart);
  runLogged(memory, labels, "erase_fighter_projectile_overlays", writes);
  runLogged(memory, labels, "update_fighter_projectiles", writes);
  runLogged(memory, labels, "render_fighter_projectile_overlays", writes);
  const nextFrame = slots.map((slot, emitter) => ({
    emitter,
    slot,
    active: memory[active + slot],
    rendered: memory[rendered + slot],
    x: memory[x + slot],
    y: memory[y + slot],
    lifetime: memory[lifetime + slot],
  }));
  return {
    artifact,
    kill_emitter: killEmitter,
    rendered_at_kill: renderedAtKill,
    projectile_y: projectileY,
    ownership_values_after_allocation: ownershipValuesAfterAllocation,
    allocation_cycles: allocationCycles,
    destruction_cycles: destructionCycles,
    destruction_feedback: destructionFeedback,
    after_resolve: afterResolve,
    after_publication: afterPublication,
    next_frame: nextFrame,
    killed_projectiles_removed: afterPublication.filter((record) =>
      record.emitter === killEmitter).every((record) => record.active === 0 &&
        record.rendered === 0 && record.killed_cell_restored),
    foreign_projectiles_preserved: afterPublication.filter((record) =>
      record.emitter !== killEmitter).every((record) => record.active !== 0 &&
        record.rendered !== 0),
    publication_character_writes: publicationWrites.filter((write) => write.character).length,
    effect_character_writes: writes.filter((write) => write.character &&
      write.routine.includes("effect")).length,
    debris_character_writes: writes.filter((write) => write.character &&
      write.routine.includes("entity")).length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(executeRaiderProjectilePersistenceAttribution(), null, 2)}\n`);
}
