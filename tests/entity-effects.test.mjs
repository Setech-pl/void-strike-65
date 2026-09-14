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
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installBootArtifact, installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { canonicalPlayfield } from "../scripts/playfield.mjs";
import {
  assertDebrisDestructionTraceParity,
  assertInterceptorBreakupTraceParity,
  executeDebrisDestructionTrace,
  executeInterceptorBreakupTrace,
} from "../scripts/debris-destruction-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definitionPath = path.join(root, "assets", "graphics", "entity-effects.json");
const capitalHullsDefinition = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "capital-hulls.json"), "utf8"));
const starfieldDefinition = JSON.parse(fs.readFileSync(
  path.join(root, "assets", "graphics", "starfield.json"), "utf8"));
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build", "manifest.json"), "utf8"));
const broadsideRuntime = fs.readFileSync(path.join(root, "build", "broadside-runtime.bin"));
const residentRuntime = fs.readFileSync(path.join(root, "build", "resident-runtime.bin"));
const starfieldRuntime = fs.readFileSync(path.join(root, "build", "starfield-runtime.bin"));
const a2KernelRuntime = fs.readFileSync(path.join(root, "build", "a2-kernel-runtime.bin"));
const entityCodeRuntime = fs.readFileSync(path.join(root, "build", "entity-code-runtime.bin"));
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const integrationGlueLabels = new Map(
  fs.readFileSync(path.join(root, "build", "integration-glue.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
labels.set("integration_debris_spawn", integrationGlueLabels.get("integration_debris_spawn"));
const directorLabels = new Map(
  fs.readFileSync(path.join(root, "build", "encounter-director.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
labels.set("director_request", directorLabels.get("director_request"));

const addresses = {
  state: 0x8000,
  stateEnd: 0x8100,
  activeMask: labels.get("ENTITY_ACTIVE_MASK"),
  renderedMask: labels.get("ENTITY_RENDERED_MASK"),
  activeCount: labels.get("ENTITY_ACTIVE_COUNT"),
  spawnTimer: labels.get("ENTITY_SPAWN_TIMER_LO"),
  spawnTimerHi: labels.get("ENTITY_SPAWN_TIMER_HI"),
  spawnPhase: labels.get("ENTITY_SPAWN_PHASE"),
  rng: labels.get("ENTITY_RNG_STATE"),
  events: labels.get("ENTITY_FRAME_EVENTS"),
  type: labels.get("ENTITY_TYPE"),
  entityState: labels.get("ENTITY_STATE"),
  flags: labels.get("ENTITY_FLAGS"),
  x: labels.get("ENTITY_X"),
  y: labels.get("ENTITY_Y"),
  vx: labels.get("ENTITY_VX"),
  vy: labels.get("ENTITY_VY"),
  moveAccumulator: labels.get("ENTITY_MOVE_ACCUMULATOR"),
  verticalAccumulator: labels.get("ENTITY_TIMER"),
  renderId: labels.get("ENTITY_RENDER_ID"),
  screenLo: labels.get("ENTITY_SCREEN_LO"),
  screenHi: labels.get("ENTITY_SCREEN_HI"),
  backing: labels.get("ENTITY_BACKING0"),
  backing1: labels.get("ENTITY_BACKING1"),
  drawnMask: labels.get("ENTITY_DRAWN_MASK"),
  hp: labels.get("ENTITY_HP"),
  owner: labels.get("ENTITY_OWNER"),
  effectActiveMask: labels.get("EFFECT_ACTIVE_MASK"),
  effectActiveCount: labels.get("EFFECT_ACTIVE_COUNT"),
  effectPending: labels.get("EFFECT_ALLOCATION_RESULT"),
  effectState: labels.get("EFFECT_STATE"),
  effectType: labels.get("EFFECT_TYPE"),
  effectX: labels.get("EFFECT_X"),
  effectY: labels.get("EFFECT_Y"),
  effectTimer: labels.get("EFFECT_TIMER"),
  effectRenderId: labels.get("EFFECT_RENDER_ID"),
  effectRendered: labels.get("EFFECT_RENDERED_MASK"),
  effectScreenLo: labels.get("EFFECT_SCREEN_LO"),
  effectScreenHi: labels.get("EFFECT_SCREEN_HI"),
  effectBacking: labels.get("EFFECT_BACKING0"),
  effectDrawnMask: labels.get("EFFECT_DRAWN_MASK"),
  rowLo: labels.get("PLAYFIELD_ROW_LO"),
  rowHi: labels.get("PLAYFIELD_ROW_HI"),
  playerX: labels.get("player_x"),
  playerY: labels.get("player_y"),
  playerLifecycle: labels.get("PLAYER_LIFECYCLE") ?? 0x4eaa,
  playerLives: (labels.get("PLAYER_LIFECYCLE") ?? 0x4eaa) + 1,
  playerHealth: 0x4e5d,
  damageCooldown: 0x4e5e,
  deathTimer: 0x4e5f,
  damageApplied: 0x4e65,
  difficulty: labels.get("DIFFICULTY_SETTING"),
  boosterState: labels.get("ENTITY_STATE") + 2,
  sectorState: labels.get("CAPITAL_SECTOR_STATE") ?? 0x4ea5,
  sectorDrainRows: (labels.get("CAPITAL_SECTOR_STATE") ?? 0x4ea5) + 1,
  ringFlags: labels.get("PLAYFIELD_RING_FLAGS"),
  interceptorRng: labels.get("rng_state"),
  starfieldRng: labels.get("STAR_RNG_STATE") ?? 0x4ed1,
  frameCounter: labels.get("frame_counter"),
  worldAccumulator: labels.get("scroll_accumulator"),
  hullAccumulator: labels.get("HULL_SCROLL_ACCUMULATOR") ?? 0x4e71,
  broadsideTimer: labels.get("BROAD_SCHEDULE_TIMER") ?? 0x4e5b,
  broadsideState: labels.get("BROAD_STATE") ?? 0x4e40,
  broadsideFlashTimer: (labels.get("CAPITAL_SECTOR_STATE") ?? 0x4ea5) - 3,
  capitalExplosionTimer: labels.get("CAPITAL_EXPLOSION_TIMER") ?? 0x4eae,
  fighterExplosionTimer: labels.get("FIGHTER_EXPLOSION_TIMER") ?? 0x54c4,
  fighterExplosionX: labels.get("FIGHTER_EXPLOSION_X"),
  fighterExplosionY: labels.get("FIGHTER_EXPLOSION_Y"),
  projectileActive: labels.get("FIGHTER_PROJECTILE_ACTIVE"),
  projectileX: labels.get("FIGHTER_PROJECTILE_X"),
  projectileY: labels.get("FIGHTER_PROJECTILE_Y"),
  projectilePreviousY: labels.get("FIGHTER_PROJECTILE_PREV_Y"),
  projectileLifetime: labels.get("FIGHTER_PROJECTILE_LIFETIME"),
  enemyActive: labels.get("ENEMY_ACTIVE"),
  enemyArchetype: labels.get("ENEMY_ARCHETYPE"),
  enemyHp: labels.get("ENEMY_HP"),
  enemyPendingDamage: labels.get("ENEMY_PENDING_DAMAGE"),
  enemyPendingSource: labels.get("ENEMY_PENDING_SOURCE"),
  enemyMemberState: labels.get("ENEMY_MEMBER_STATE"),
  enemyFormationYHi: labels.get("ENEMY_FORMATION_Y_HI"),
  enemyTargetSlot: labels.get("ENEMY_TARGET_SLOT"),
  enemyLiveCount: labels.get("ENEMY_LIVE_COUNT"),
  enemyX: labels.get("ENEMY_X"),
  enemyY: labels.get("ENEMY_Y"),
  scoreLo: labels.get("score_bcd_lo"),
  scoreHi: labels.get("score_bcd_hi"),
  player_fighterBurstTimer: labels.get("PLAYER_FIGHTER_BURST_TIMER"),
  interceptorBurstTimer: labels.get("INTERCEPTOR_BURST_TIMER"),
};

function loadRuntime(memory) {
  installRuntimeSegments(memory, root);
}

function createRuntimeMemory(fill = 0) {
  const memory = new Uint8Array(0x10000).fill(fill);
  loadRuntime(memory);
  return memory;
}

function createBootedArtifactRuntimeMemory(artifact, fill = 0) {
  const memory = new Uint8Array(0x10000).fill(fill);
  const { requiresBroadsideUnpack } = installBootArtifact(memory, root, artifact);
  if (requiresBroadsideUnpack) runRoutine(memory, "unpack_boot_broadside_runtime");
  for (const name of [
    "stage_boot_streams",
    "unpack_resident_runtime",
    "unpack_entity_runtime",
    "stage_a2_kernel",
    "init_entity_effects", "unpack_weapon_pickup_phase_runtime",
    "unpack_starfield_runtime",
    "init_fighter_projectiles",
    "init_broadside",
  ]) runRoutine(memory, name);
  initialiseRows(memory);
  return memory;
}

// Direct entity harnesses bypass start_gameplay. Put the admission policy in
// the same live mixed-pressure state that production reaches before exercising
// the debris scheduler; init_entity_effects deliberately clears this page.
function armDirectorDebrisAdmission(memory) {
  memory.fill(0, 0x80f4, 0x8100);
  memory[0x80f6] = 3;
  memory[0x80fb] = 0x6d;
  memory[0x80fc] = 0xff;
  memory[0x80ff] = (memory[addresses.frameCounter] - 1) & 0xff;
}

function snapshotDebrisSlotZero(memory) {
  return [
    addresses.activeMask, addresses.activeCount, addresses.type, addresses.entityState,
    addresses.flags, addresses.x, addresses.y, addresses.vx, addresses.vy,
    addresses.moveAccumulator, addresses.verticalAccumulator, addresses.renderId,
    addresses.hp, addresses.owner, addresses.rng,
  ].map((address) => memory[address]);
}

function runRoutine(memory, name, { accumulator = 0, beforeExecute } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.a = accumulator;
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing linked routine ${name}`);
  beforeExecute?.(cpu);
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return cpu.cycles;
}

function runRoutineTrace(memory, name, watchedNames) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  const watched = new Map(watchedNames.map((label) => {
    const address = labels.get(label);
    assert.ok(Number.isInteger(address), `missing linked trace label ${label}`);
    return [address, label];
  }));
  const visited = new Set();
  const callCounts = new Map(watchedNames.map((label) => [label, 0]));
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get(name);
  assert.ok(Number.isInteger(cpu.pc), `missing linked routine ${name}`);
  for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) {
    const label = watched.get(cpu.pc);
    if (label) {
      visited.add(label);
      callCounts.set(label, callCounts.get(label) + 1);
    }
    cpu.step();
  }
  assert.equal(cpu.pc, stop, `${name} did not return`);
  return { cycles: cpu.cycles, visited, callCounts };
}

function initialiseRows(memory, head = 0) {
  for (let logical = 0; logical < canonicalPlayfield.ringRows; logical += 1) {
    const physical = (head + logical) % canonicalPlayfield.ringRows;
    const address = canonicalPlayfield.ringBufferAddress + physical * 40;
    memory[addresses.rowLo + logical] = address & 0xff;
    memory[addresses.rowHi + logical] = address >> 8;
  }
}

function initialiseEntity(memory, { x = 124, y = 24 } = {}) {
  runRoutine(memory, "init_entity_effects");
  memory[addresses.activeMask] = 1;
  memory[addresses.activeCount] = 1;
  memory[addresses.x] = x;
  memory[addresses.y] = y;
  memory[addresses.vy] = 8;
  memory[addresses.renderId] = manifest.entityEffects.glyphIndex ?? 110;
  memory[addresses.playerX] = 196;
  memory[addresses.playerY] = canonicalPlayfield.gameplayBottom - 15;
  memory[addresses.playerLifecycle] = 0;
  memory[addresses.sectorState] = 0;
}

function exercisePlayerDebrisCollision({
  renderId = 110,
  playerX = 100,
  playerY = 100,
  entityX = 100,
  entityY = 100,
  shield = false,
  cooldown = 0,
  lifecycle = 0,
  priorLatch = 0,
  difficulty = 0,
  playerHealth = 10,
  playerLives = 3,
  routine = "entity_collide_player",
  vx = 0,
  verticalAccumulator = 0,
  moveAccumulator = 0,
  events = 0,
} = {}) {
  const memory = createRuntimeMemory();
  initialiseEntity(memory, { x: entityX, y: entityY });
  memory[addresses.renderId] = renderId;
  memory[addresses.playerX] = playerX;
  memory[addresses.playerY] = playerY;
  memory[addresses.playerHealth] = playerHealth;
  memory[addresses.playerLives] = playerLives;
  memory[addresses.damageCooldown] = cooldown;
  memory[addresses.damageApplied] = priorLatch;
  memory[addresses.playerLifecycle] = lifecycle;
  memory[addresses.boosterState] = shield ? 5 : 0;
  memory[addresses.difficulty] = difficulty;
  memory[addresses.vx] = vx;
  memory[addresses.verticalAccumulator] = verticalAccumulator;
  memory[addresses.moveAccumulator] = moveAccumulator;
  memory[addresses.events] = events;
  const trace = runRoutineTrace(memory, routine, [
    "entity_player_debris_overlap",
    "apply_player_damage",
    "entity_damage_applied",
  ]);
  const detected = trace.visited.has("entity_player_debris_overlap");
  const attempted = trace.visited.has("apply_player_damage");
  const applied = memory[addresses.playerHealth] !== playerHealth;
  let suppressed = null;
  if (detected && !applied) {
    if (priorLatch !== 0) suppressed = "prior-damage-latch";
    else if (lifecycle !== 0) suppressed = "player-lifecycle";
    else if (shield) suppressed = "shield";
    else if (cooldown !== 0) suppressed = "damage-cooldown";
    else suppressed = "unknown";
  }
  return {
    memory,
    trace,
    detected,
    attempted,
    damageCallCount: trace.callCounts.get("apply_player_damage"),
    applied,
    suppressed,
    eventAccepted: trace.visited.has("entity_damage_applied"),
    consumed: memory[addresses.activeMask] === 0,
  };
}

function exercisePlayerInterceptorContact({
  playerX = 124,
  playerY = 100,
  enemyX = 124,
  enemyY = 100,
  shield = false,
  cooldown = 0,
  lifecycle = 0,
  priorLatch = 0,
  difficulty = 0,
  playerHealth = 10,
  playerLives = 3,
  baseMemory = null,
} = {}) {
  const memory = baseMemory ? Uint8Array.from(baseMemory) : createRuntimeMemory();
  if (!baseMemory) {
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
  }
  memory[addresses.playerX] = playerX;
  memory[addresses.playerY] = playerY;
  memory[addresses.playerHealth] = playerHealth;
  memory[addresses.playerLives] = playerLives;
  memory[addresses.damageCooldown] = cooldown;
  memory[addresses.damageApplied] = priorLatch;
  memory[addresses.playerLifecycle] = lifecycle;
  memory[addresses.boosterState] = shield ? 5 : 0;
  memory[addresses.difficulty] = difficulty;
  memory[addresses.enemyActive] = 1;
  memory[addresses.enemyArchetype] = 0;
  memory[addresses.enemyMemberState] = 1;
  memory[addresses.enemyFormationYHi] = 0;
  memory[addresses.enemyTargetSlot] = 0;
  memory[addresses.enemyLiveCount] = 1;
  memory[addresses.enemyHp] = 1;
  memory[addresses.enemyPendingDamage] = 0;
  memory[addresses.enemyPendingSource] = 5;
  memory[addresses.enemyX] = enemyX;
  memory[addresses.enemyY] = enemyY;
  memory[addresses.broadsideTimer] = 0xff;
  memory[addresses.scoreLo] = 0;
  memory[addresses.scoreHi] = 0;
  const trace = runRoutineTrace(memory, "handle_collisions", [
    "apply_broadside_player_damage",
    "apply_player_damage",
    "begin_player_fighter_explosion",
    "resolve_enemy_damage",
    "spawn_interceptor_breakup_effects",
    "play_hit_sound",
    "update_hud_status",
  ]);
  return { memory, trace };
}

function initialiseShootableDebris(memory, { hp = 3, ...options } = {}) {
  initialiseEntity(memory, options);
  memory[addresses.flags] = 0x3f;
  memory[addresses.type] = 1;
  memory[addresses.entityState] = 1;
  memory[addresses.hp] = hp;
}

function armPlayerFighterProjectile(memory, slot, { x, y, lifetime = 10 }) {
  memory[addresses.projectileActive + slot] = 1;
  memory[addresses.projectileX + slot] = x;
  memory[addresses.projectileY + slot] = y;
  memory[addresses.projectilePreviousY + slot] = y;
  memory[addresses.projectileLifetime + slot] = lifetime;
}

test("entity descriptor and glyph generation are deterministic and bounded", () => {
  const first = compileEntityEffects(loadEntityEffectsDefinition(definitionPath));
  const second = compileEntityEffects(loadEntityEffectsDefinition(definitionPath));
  assert.deepEqual(first.descriptor, second.descriptor);
  assert.deepEqual(first.glyphs, second.glyphs);
  assert.deepEqual(first.trajectoryVx, second.trajectoryVx);
  assert.equal(renderEntityEffectsCa65Include(first), renderEntityEffectsCa65Include(second));
  assert.equal(first.descriptor.length, 16);
  assert.equal(first.glyphs.length, 64);
  assert.deepEqual([...first.trajectoryVx], [0, 0xfc, 4, 0]);
  assert.deepEqual(first.debrisVisuals.variants.map(({ id }) => id),
    ["armour-shard", "truss-fragment"]);
  assert.ok(first.debrisVisuals.variants.every(({ phases }) => phases.length === 2));
  assert.equal("interceptorBreakup" in first, false,
    "Raider destruction must have no character-effect asset contract");
  assert.deepEqual([...first.descriptor.slice(5, 10)], [8, 8, 1, 0, 8]);
  assert.equal(first.descriptor[12], 0,
    "ENTITY_TIMER must start at zero for the deterministic 3/5 accumulator");
  const debrisOccupancies = [];
  for (const [variantIndex, { phases }] of first.debrisVisuals.variants.entries()) {
    for (const [phaseIndex, glyphs] of phases.entries()) {
      const activePixels = [];
      const selectors = [];
      glyphs.forEach((rows, glyphIndex) => {
        rows.forEach((row, y) => {
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const selector = row >> (6 - pixel * 2) & 3;
            if (selector !== 0) {
              selectors.push(selector);
              const x = glyphIndex * 8 + pixel * 2;
              activePixels.push([x, y], [x + 1, y]);
            }
          }
        });
      });
      const ys = activePixels.map(([, y]) => y);
      assert.ok(Math.max(...ys) - Math.min(...ys) + 1 >= 6);
      assert.ok(glyphs.every((rows) => rows.some((row) => row !== 0)));
      assert.ok(selectors.every((selector) => selector === 1 || selector === 2),
        `variant ${variantIndex} phase ${phaseIndex} used a non-white/non-steel selector`);
      assert.ok(selectors.filter((selector) => selector === 1).length >= 8);
      assert.ok(selectors.filter((selector) => selector === 2).length >= 8);
      assert.ok(selectors.length >= 36 && selectors.length <= 44);
      debrisOccupancies.push(selectors.length);
    }
    assert.notDeepEqual(phases[0], phases[1]);
  }
  assert.deepEqual(debrisOccupancies, [42, 41, 37, 40]);
  assert.ok(Math.max(...debrisOccupancies) - Math.min(...debrisOccupancies) <= 6);
});

test("entity memory and code reservations are exact and do not use BASIC ROM", () => {
  assert.deepEqual([
    manifest.entityEffects.stateAddress,
    manifest.entityEffects.stateBytes,
    manifest.entityEffects.initializedBytes,
    manifest.entityEffects.codeRunAddress,
    manifest.entityEffects.codeReservedBytes,
  ], [0x8000, 0x100, 0x100, 0x9100, 0x0f00]);
  assert.ok(manifest.entityEffects.codeBytes <= manifest.entityEffects.codeReservedBytes);
  assert.equal(manifest.entityEffects.interactiveSlots, 4);
  assert.equal(manifest.entityEffects.interactiveActiveLimit, 2);
  assert.equal(manifest.entityEffects.effectSlots, 6);
  assert.equal(manifest.entityEffects.effectActiveLimit, 5);
  assert.equal(manifest.entityEffects.glyphCount, 16);
  assert.equal(manifest.entityEffects.glyphBytes, 128);
  assert.equal(manifest.entityEffects.newGlyphsFromFoundation, 7);
  assert.equal(manifest.entityEffects.glyphIndex + manifest.entityEffects.glyphCount, 126);
  assert.equal(128 - manifest.entityEffects.glyphIndex - manifest.entityEffects.glyphCount, 2);
  assert.equal(manifest.entityEffects.codeBudget.baselineBytes, 564);
  assert.equal(manifest.entityEffects.codeBudget.approvedDeltaBytes, 512);
  assert.ok(manifest.entityEffects.codeBudget.weaponPickupSpreadShot.actualDeltaBytes <= 448);
  assert.equal(manifest.entityEffects.codeBudget.weaponPickupRapidFire.actualBytes,
    manifest.entityEffects.featureCodeBytes);
  assert.equal(manifest.entityEffects.featureCodeBytes + manifest.entityEffects.sharedRuntimeBytes,
    manifest.entityEffects.codeBytes);
  assert.ok(manifest.entityEffects.sharedRuntimeBytes > 0,
    "pixel-exact hull-scroll optimisation must be reported separately from entity feature code");
  assert.match(source, /ENTITY_EFFECT_STATE_END = ENTITY_STATE_ADDRESS\+ENTITY_STATE_BYTES/);
  assert.doesNotMatch(source.slice(source.indexOf('.segment "ENTITY_CODE"')), /\$A000|\$BFFF/);
});

test("$A5 and $5A cold RAM are fully and identically initialised for XEX and ATR", () => {
  for (const fill of [0xa5, 0x5a]) {
    const results = [];
    for (const artifact of ["xex", "atr"]) {
      const memory = new Uint8Array(0x10000).fill(fill);
      const { requiresBroadsideUnpack } = installBootArtifact(memory, root, artifact);
      if (requiresBroadsideUnpack) runRoutine(memory, "unpack_boot_broadside_runtime");
      runRoutine(memory, "stage_boot_streams");
      runRoutine(memory, "unpack_resident_runtime");
      const residentSuffixOffset = manifest.residentRuntime.suffixAddress -
        manifest.residentRuntime.runAddress;
      assert.deepEqual(
        [...memory.slice(manifest.residentRuntime.suffixAddress,
          manifest.residentRuntime.runAddress + residentRuntime.length)],
        [...residentRuntime.subarray(residentSuffixOffset)],
      );
      runRoutine(memory, "unpack_entity_runtime");
      assert.deepEqual(
        [...memory.slice(manifest.entityEffects.codeRunAddress,
          manifest.entityEffects.codeRunAddress + manifest.entityEffects.codeBytes)],
        [...entityCodeRuntime],
      );
      assert.deepEqual(
        [...memory.slice(manifest.broadsideRuntime.runAddress,
          manifest.broadsideRuntime.runAddress + broadsideRuntime.length)],
        [...broadsideRuntime],
        "ENTITY_CODE bootstrap must re-arm the shared LZSS decoder for broadside",
      );
      runRoutine(memory, "stage_a2_kernel");
      assert.deepEqual(
        [...memory.slice(manifest.a2Kernel.runAddress,
          manifest.a2Kernel.runAddress + a2KernelRuntime.length)],
        [...a2KernelRuntime],
      );
      runRoutine(memory, "unpack_weapon_pickup_phase_runtime");
      runRoutine(memory, "unpack_starfield_runtime");
      assert.deepEqual(
        [...memory.slice(manifest.starfieldRuntime.runAddress,
          manifest.starfieldRuntime.runAddress + starfieldRuntime.length)],
        [...starfieldRuntime],
      );
      const lowerSentinel = memory[0x7fff];
      const upperSentinel = memory[0x8100];
      runRoutine(memory, "init_entity_effects");
      assert.equal(memory[0x7fff], lowerSentinel);
      assert.equal(memory[0x8100], upperSentinel);
      const state = memory.slice(addresses.state, addresses.stateEnd);
      assert.equal(state.every((byte, index) =>
        byte === (index === 3 ? 32 : index === 6 ? 0x65 : 0)), true);
      results.push(state);
    }
    assert.deepEqual(results[0], results[1]);
  }
});

test("all four 2x1 debris phases map both cells through every logical row and A2 ring head", () => {
  for (let head = 0; head < canonicalPlayfield.ringRows; head += 1) {
    for (let logical = 0; logical < canonicalPlayfield.ringRows; logical += 1) {
      for (const glyphOffset of [0, 2, 4, 6]) {
        const memory = createRuntimeMemory();
        initialiseRows(memory, head);
        initialiseEntity(memory, { y: 24 + logical * 8 });
        memory[addresses.flags] = 0x37;
        memory[addresses.renderId] = manifest.entityEffects.glyphIndex + glyphOffset;
        runRoutine(memory, "entity_effects_render");
        const pointer = memory[addresses.screenLo] | memory[addresses.screenHi] << 8;
        const expectedRow = canonicalPlayfield.ringBufferAddress +
          ((head + logical) % canonicalPlayfield.ringRows) * 40;
        assert.equal(pointer, expectedRow + 19,
          `glyph ${glyphOffset}, head ${head}, logical ${logical} mapped outside its ring row`);
        assert.equal(memory[pointer], manifest.entityEffects.glyphIndex + glyphOffset);
        assert.equal(memory[pointer + 1], manifest.entityEffects.glyphIndex + glyphOffset + 1);
        assert.equal(memory[addresses.drawnMask], 3);
        assert.ok(pointer + 1 <= expectedRow + 39,
          "both cells crossed a physical row boundary");
        assert.ok(pointer >= canonicalPlayfield.ringBufferAddress &&
          pointer < canonicalPlayfield.ringBufferEnd);
      }
    }
  }
});

test("divider and HUD coordinates cannot render or collide", () => {
  for (const y of [8, 15, 16, 23, 240, 255]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseEntity(memory, { x: 124, y });
    memory[addresses.playerX] = 124;
    memory[addresses.playerY] = 16;
    memory[addresses.playerHealth] = 10;
    runRoutine(memory, "entity_effects_render");
    assert.equal(memory[addresses.renderedMask], 0, `Y=${y} rendered outside gameplay`);
    runRoutine(memory, "entity_collide_player");
    assert.equal(memory[addresses.playerHealth], 10, `Y=${y} collided outside gameplay`);
    assert.equal(memory[addresses.activeMask], 1);
  }
});

function nextEntityRng(value) {
  const shifted = value << 1 & 0xff;
  return (value & 0x80) === 0 ? shifted : shifted ^ 0x1d;
}

test("spawn deterministically selects two variants, two phases and three trajectories", () => {
  const observedVariants = new Set();
  const observedPhases = new Set();
  const observedTrajectories = new Set();
  for (let seed = 1; seed <= 255; seed += 1) {
    const first = createRuntimeMemory();
    const second = createRuntimeMemory();
    for (const memory of [first, second]) {
      initialiseRows(memory);
      runRoutine(memory, "init_entity_effects");
      armDirectorDebrisAdmission(memory);
      memory[addresses.rng] = seed;
      memory[addresses.spawnTimer] = 1;
      memory[addresses.sectorState] = 0;
      memory[addresses.playerX] = 196;
      memory[addresses.playerY] = 184;
      runRoutine(memory, "entity_effects_update");
    }
    const selection = nextEntityRng(seed);
    const positionRandom = nextEntityRng(selection);
    const glyphOffset = (selection & 3) * 2;
    const expectedVx = [0, 0xfc, 4, 0][selection >> 2 & 3];
    let columnOffset = positionRandom & 0x03;
    if (columnOffset === 3) columnOffset = 1;
    assert.deepEqual([
      first[addresses.renderId], first[addresses.vx], first[addresses.x], first[addresses.rng],
      first[addresses.hp],
    ], [manifest.entityEffects.glyphIndex + glyphOffset, expectedVx,
      120 + columnOffset * 4, positionRandom, 3]);
    assert.deepEqual(
      [...first.slice(addresses.state, addresses.stateEnd)],
      [...second.slice(addresses.state, addresses.stateEnd)],
    );
    observedVariants.add(glyphOffset >> 2);
    observedPhases.add(glyphOffset >> 1 & 1);
    observedTrajectories.add(expectedVx);
  }
  assert.deepEqual([...observedVariants].sort(), [0, 1]);
  assert.deepEqual([...observedPhases].sort(), [0, 1]);
  assert.deepEqual([...observedTrajectories].sort((a, b) => a - b), [0, 4, 0xfc]);
});

test("integration debris ABI is derived from and jumps to the linked spawn symbol", () => {
  const generatedAbi = fs.readFileSync(
    path.join(root, "build", "integration-abi.inc"), "utf8");
  const linkedSpawn = labels.get("entity_spawn_debris");
  assert.equal(generatedAbi.trim(),
    `entity_spawn_debris = $${linkedSpawn.toString(16).toUpperCase()}`);

  const glue = fs.readFileSync(path.join(root, "build", "integration-glue.bin"));
  const glueBase = manifest.integrationGlue.finalAddress;
  const entryOffset = integrationGlueLabels.get("integration_debris_spawn") - glueBase;
  const jumpOffset = glue.indexOf(0x4c, entryOffset);
  assert.ok(jumpOffset >= entryOffset && jumpOffset < entryOffset + 16,
    "integration debris entry must contain its tail JMP");
  assert.equal(glue[jumpOffset + 1] | glue[jumpOffset + 2] << 8, linkedSpawn,
    "integration debris tail JMP drifted from the linked production entry");
});

test("integration debris admission is equivalent to Director request plus direct spawn", () => {
  const direct = createRuntimeMemory();
  const integrated = createRuntimeMemory();
  const composed = createRuntimeMemory();
  for (const memory of [direct, integrated, composed]) {
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
    armDirectorDebrisAdmission(memory);
    memory[addresses.rng] = 0x51;
    memory[addresses.spawnTimer] = 1;
    memory[addresses.sectorState] = 0;
    memory[addresses.playerX] = 196;
    memory[addresses.playerY] = 184;
  }

  runRoutine(direct, "entity_spawn_debris");
  runRoutine(integrated, "integration_debris_spawn");
  runRoutine(composed, "director_request", { beforeExecute(cpu) { cpu.x = 1; } });
  runRoutine(composed, "entity_spawn_debris");

  assert.deepEqual(snapshotDebrisSlotZero(integrated), snapshotDebrisSlotZero(direct),
    "public admission must initialize the same slot-zero debris state as direct spawn");
  assert.deepEqual(
    [...integrated.slice(0x80f4, 0x8100)],
    [...composed.slice(0x80f4, 0x8100)],
    "public admission must preserve Director request semantics");
  assert.deepEqual(snapshotDebrisSlotZero(integrated), snapshotDebrisSlotZero(composed),
    "public entry must equal the canonical Director-request plus direct-spawn composition");
});

test("capital debris retries rejected admissions without overwriting its occupied slot", () => {
  const rejectedCapital = createRuntimeMemory();
  initialiseRows(rejectedCapital);
  runRoutine(rejectedCapital, "init_entity_effects");
  armDirectorDebrisAdmission(rejectedCapital);
  rejectedCapital[0x80f9] = 1;
  rejectedCapital[addresses.spawnTimer] = 1;
  rejectedCapital[addresses.sectorState] = 0;
  const capitalTrace = runRoutineTrace(rejectedCapital, "entity_effects_update",
    ["entity_spawn_debris"]);
  assert.deepEqual([
    capitalTrace.callCounts.get("entity_spawn_debris"),
    rejectedCapital[addresses.activeMask], rejectedCapital[addresses.spawnTimer],
    rejectedCapital[0x80ff],
  ], [0, 0, 8, rejectedCapital[addresses.frameCounter]]);

  const rejectedOpen = createRuntimeMemory();
  initialiseRows(rejectedOpen);
  runRoutine(rejectedOpen, "init_entity_effects");
  armDirectorDebrisAdmission(rejectedOpen);
  rejectedOpen[0x80f9] = 1;
  rejectedOpen[addresses.spawnTimer] = 1;
  rejectedOpen[addresses.sectorState] = 7;
  runRoutine(rejectedOpen, "entity_effects_update");
  assert.equal(rejectedOpen[addresses.spawnTimer], 64,
    "ordinary OPEN rejection must retain the established repeat delay");

  const occupied = createRuntimeMemory();
  initialiseRows(occupied);
  initialiseEntity(occupied);
  occupied[addresses.spawnTimer] = 1;
  const admissionFrameBefore = occupied[0x80ff];
  const occupiedTrace = runRoutineTrace(occupied, "entity_effects_update",
    ["entity_spawn_debris"]);
  assert.deepEqual([
    occupiedTrace.callCounts.get("entity_spawn_debris"),
    occupied[addresses.activeMask], occupied[addresses.activeCount],
    occupied[addresses.spawnTimer], occupied[0x80ff],
  ], [0, 1, 1, 1, admissionFrameBefore],
  "an occupied debris slot must neither request, queue nor restart its timer");
});

test("capital debris uses existing 3/4/5 pressure ceilings on EASY, MEDIUM and HARD", () => {
  for (const [difficulty, pressure, ceiling] of [[0, 2, 3], [1, 3, 4], [2, 4, 5]]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
    armDirectorDebrisAdmission(memory);
    memory[0x80f6] = 1;
    memory[0x80f8] = pressure;
    memory[addresses.difficulty] = difficulty;
    memory[addresses.spawnTimer] = 1;
    memory[addresses.sectorState] = 0;
    memory[addresses.playerX] = 196;
    memory[addresses.playerY] = 184;
    runRoutine(memory, "entity_effects_update");
    assert.deepEqual([memory[addresses.activeMask], memory[addresses.activeCount], memory[0x80f8]],
      [1, 1, ceiling], `difficulty ${difficulty} did not admit one debris beside capital pressure`);
    runRoutine(memory, "integration_debris_release");
    assert.deepEqual([memory[addresses.activeMask], memory[addresses.activeCount], memory[0x80f8]],
      [0, 0, pressure], `difficulty ${difficulty} release did not restore Director pressure`);
  }
});

test("X, Y and tumbling phase change only on WORLD_ROW_ADVANCED", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  runRoutine(memory, "init_entity_effects");
  armDirectorDebrisAdmission(memory);
  memory[addresses.spawnTimer] = 1;
  memory[addresses.sectorState] = 0;
  memory[addresses.playerX] = 196;
  memory[addresses.playerY] = 184;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.activeCount],
    memory[addresses.x], memory[addresses.y], memory[addresses.rng],
    memory[addresses.renderId], memory[addresses.vx],
  ], [1, 1, 124, 16, 0x89, manifest.entityEffects.glyphIndex + 4, 4]);
  const initialGlyph = memory[addresses.renderId];
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.x], memory[addresses.y], memory[addresses.renderId],
    memory[addresses.moveAccumulator],
  ], [124, 16, initialGlyph, 0], "ordinary frame must not move or tumble world debris");
  const expectedY = [16, 24, 24, 32];
  const expectedVerticalAccumulator = [3, 1, 4, 2];
  for (let event = 1; event <= 4; event += 1) {
    memory[addresses.events] = 1;
    runRoutine(memory, "entity_effects_update");
    assert.equal(memory[addresses.y], expectedY[event - 1]);
    assert.equal(memory[addresses.verticalAccumulator], expectedVerticalAccumulator[event - 1]);
    assert.equal(memory[addresses.renderId], initialGlyph + (event & 1 ? 2 : 0));
    assert.equal(memory[addresses.x], event < 4 ? 124 : 128);
    assert.equal(memory[addresses.moveAccumulator], event < 4 ? event : 0);
  }
  memory[addresses.y] = canonicalPlayfield.gameplayBottom - 8;
  memory[addresses.verticalAccumulator] = 2;
  const xBeforeDespawn = memory[addresses.x];
  const phaseBeforeDespawn = memory[addresses.renderId];
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.activeCount], memory[addresses.spawnTimer],
  ], [0, 0, 64]);
  assert.equal(memory[addresses.x], xBeforeDespawn);
  assert.equal(memory[addresses.renderId], phaseBeforeDespawn);
});

test("all deterministic trajectories remain inside the inner corridor through despawn", () => {
  for (let seed = 1; seed <= 255; seed += 1) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
    memory[addresses.rng] = seed;
    memory[addresses.spawnTimer] = 1;
    memory[addresses.sectorState] = 0;
    memory[addresses.playerX] = 196;
    memory[addresses.playerY] = 184;
    runRoutine(memory, "entity_effects_update");
    while (memory[addresses.activeMask] !== 0) {
      assert.ok(memory[addresses.x] >= 84 && memory[addresses.x] + 8 <= 172,
        `seed ${seed} escaped the inner corridor at X=${memory[addresses.x]}`);
      memory[addresses.events] = 1;
      runRoutine(memory, "entity_effects_update");
    }
  }
});

test("debris advances exactly three vertical rows in five world events", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  initialiseEntity(memory, { x: 124, y: 24 });
  memory[addresses.verticalAccumulator] = 0;
  const rows = [];
  for (let event = 0; event < 12; event += 1) {
    memory[addresses.events] = 1;
    runRoutine(memory, "entity_effects_update");
    rows.push(memory[addresses.y]);
  }
  assert.deepEqual(rows, [24, 32, 32, 40, 48, 48, 56, 56, 64, 72, 72, 80]);
});

test("EASY, MEDIUM and HARD keep world/debris rates while white stars drift at 50 Hz", () => {
  const denominator = capitalHullsDefinition.broadside.worldScrollRateDenominator;
  assert.equal(denominator, 20);
  assert.deepEqual(capitalHullsDefinition.broadside.worldScrollRates,
    { easy: 8, medium: 9, hard: 10 });
  assert.equal(capitalHullsDefinition.broadside.hullScrollRateDenominator, 40);
  assert.deepEqual(capitalHullsDefinition.broadside.hullScrollRates,
    { easy: 16, medium: 18, hard: 20 });
  assert.deepEqual([
    starfieldDefinition.nearLayer.representation,
    starfieldDefinition.nearLayer.speedPixelsPerFrame,
    starfieldDefinition.farLayer.population,
    starfieldDefinition.farLayer.rateNumerator,
    starfieldDefinition.farLayer.rateDenominator,
  ], ["sparse-dynamic", 1, 0, 0, 1]);

  const measured = {};
  for (const [difficulty, numerator] of
    Object.entries(capitalHullsDefinition.broadside.worldScrollRates)) {
    const worldRowsPerSecond = 50 * numerator / denominator;
    const nearRowsPerSecond = 50;
    const farRowsPerSecond = worldRowsPerSecond;
    const debrisRowsPerSecond = worldRowsPerSecond * 3 / 5;
    assert.ok(debrisRowsPerSecond < farRowsPerSecond &&
      farRowsPerSecond < nearRowsPerSecond);

    let worldAccumulator = 0;
    const stepFrame = () => {
      let worldAdvanced = false;
      worldAccumulator += numerator;
      if (worldAccumulator >= denominator) {
        worldAccumulator -= denominator;
        worldAdvanced = true;
      }
      return { worldAdvanced };
    };
    for (let frame = 1; frame <= 32; frame += 1) {
      stepFrame();
    }
    const spawnWorldAccumulator = worldAccumulator;
    const framesFor = (numerator, denominator) => {
      worldAccumulator = spawnWorldAccumulator;
      let phase = 0;
      let frames = 0;
      let steps = 0;
      while (steps < 22) {
        frames += 1;
        const { worldAdvanced } = stepFrame();
        if (worldAdvanced) {
          phase += numerator;
          if (phase >= denominator) {
            phase -= denominator;
            steps += 1;
          }
        }
      }
      return frames;
    };
    measured[difficulty] = {
      worldRowsPerSecond,
      nearRowsPerSecond,
      farRowsPerSecond,
      debrisRowsPerSecond,
      rejectedCandidateDebrisRowsPerSecond: worldRowsPerSecond * 3 / 4,
      rejectedCandidateFrames: framesFor(3, 4),
      finalFrames: framesFor(3, 5),
    };
  }
  assert.deepEqual(measured, {
    easy: {
      worldRowsPerSecond: 20, nearRowsPerSecond: 50, farRowsPerSecond: 20,
      debrisRowsPerSecond: 12, rejectedCandidateDebrisRowsPerSecond: 15,
      rejectedCandidateFrames: 73, finalFrames: 91,
    },
    medium: {
      worldRowsPerSecond: 22.5, nearRowsPerSecond: 50, farRowsPerSecond: 22.5,
      debrisRowsPerSecond: 13.5, rejectedCandidateDebrisRowsPerSecond: 16.875,
      rejectedCandidateFrames: 66, finalFrames: 82,
    },
    hard: {
      worldRowsPerSecond: 25, nearRowsPerSecond: 50, farRowsPerSecond: 25,
      debrisRowsPerSecond: 15, rejectedCandidateDebrisRowsPerSecond: 18.75,
      rejectedCandidateFrames: 60, finalFrames: 74,
    },
  });
  assert.match(source,
    /advance_starfield_layers:\s+lda #ENTITY_EVENT_WORLD_ROW_ADVANCED\s+sta ENTITY_FRAME_EVENTS/);
  assert.doesNotMatch(source.slice(source.indexOf("rotate_playfield_rows:"),
    source.indexOf("init_starfield_state:")), /sta ENTITY_FRAME_EVENTS/,
  "WORLD_ROW_ADVANCED must follow legacy world, not the slower near/ring step");
  assert.match(source,
    /scroll_world_columns:[\s\S]+jsr rotate_playfield_rows[\s\S]+cmp #CAPITAL_HULL_STATE_COMPLETE[\s\S]+jsr entity_complete_scroll_tick/,
  "COMPLETE must count 22 actual ring rotations independently of the debris world event");
});

test("entity selection and movement do not mutate other RNG or gameplay cadence state", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  runRoutine(memory, "init_entity_effects");
  const protectedState = new Map([
    [addresses.interceptorRng, 0x37],
    [addresses.starfieldRng, 0xa7],
    [addresses.frameCounter, 0x5c],
    [addresses.worldAccumulator, 0x09],
    [addresses.hullAccumulator, 0x0b],
    [addresses.broadsideTimer, 0x31],
    [addresses.player_fighterBurstTimer, 0x07],
    [addresses.interceptorBurstTimer, 0x13],
  ]);
  for (const [address, value] of protectedState) memory[address] = value;
  memory[addresses.spawnTimer] = 1;
  memory[addresses.sectorState] = 0;
  memory[addresses.playerX] = 196;
  memory[addresses.playerY] = 184;
  runRoutine(memory, "entity_effects_update");
  runRoutine(memory, "entity_effects_render");
  runRoutine(memory, "entity_effects_erase");
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  for (const [address, value] of protectedState) {
    assert.equal(memory[address], value, `entity engine changed cadence/RNG byte $${address.toString(16)}`);
  }
});

test("pause, new game, life loss, full sector transition and Game Over preserve entity semantics", () => {
  const startGameplay = source.slice(source.indexOf("start_gameplay:"),
    source.indexOf("start_gameplay_end:"));
  assert.match(startGameplay, /jsr init_state[\s\S]+jsr init_entity_effects/,
    "a fresh START GAME must reset entity state through the existing reset path");

  const pause = source.slice(source.indexOf("enter_pause:"), source.indexOf("resume_gameplay:"));
  assert.doesNotMatch(pause, /entity_effects_(?:erase|update|render)|init_entity_effects/,
    "pause must not mutate or reset entity state");

  const respawn = source.slice(source.indexOf("respawn_player:"),
    source.indexOf("tick_respawn_invulnerability:"));
  assert.doesNotMatch(respawn, /init_entity_effects|entity_despawn_debris/,
    "same-sector life loss must not reset or remove debris");

  const mainLoop = source.slice(source.indexOf("main_loop:"),
    source.indexOf("main_loop_option_poll"));
  assert.match(mainLoop,
    /jsr integration_update_player_death[\s\S]+bcc main_loop_lifecycle_ready[\s\S]+jsr enter_game_over[\s\S]+jmp frontend_loop[\s\S]+main_loop_lifecycle_ready\s*=\s*\*[\s\S]+jsr entity_effects_update/,
    "terminal Game Over must leave gameplay before the entity update");

  const emptyDuringDrain = createRuntimeMemory();
  initialiseRows(emptyDuringDrain);
  runRoutine(emptyDuringDrain, "init_entity_effects");
  armDirectorDebrisAdmission(emptyDuringDrain);
  emptyDuringDrain[addresses.spawnTimer] = 1;
  emptyDuringDrain[addresses.sectorState] = 5;
  runRoutine(emptyDuringDrain, "entity_effects_update");
  assert.deepEqual([
    emptyDuringDrain[addresses.activeMask], emptyDuringDrain[addresses.spawnTimer],
    emptyDuringDrain[addresses.rng],
  ], [0, 64, 101], "DRAIN must defer a new spawn without consuming entity RNG");

  const transition = createRuntimeMemory();
  initialiseRows(transition);
  runRoutine(transition, "init_entity_effects");
  armDirectorDebrisAdmission(transition);
  const protectedState = new Map([
    [addresses.interceptorRng, 0x37],
    [addresses.player_fighterBurstTimer, 0x07],
    [addresses.interceptorBurstTimer, 0x13],
  ]);
  transition[addresses.starfieldRng] = 0xa7;
  for (const [address, value] of protectedState) transition[address] = value;
  transition[addresses.sectorState] = 5;
  transition[addresses.spawnTimer] = 1;
  runRoutine(transition, "entity_effects_update");
  assert.deepEqual([
    transition[addresses.activeMask], transition[addresses.spawnTimer],
    transition[addresses.rng], transition[addresses.spawnPhase],
  ], [0, 64, 101, 0]);

  transition[addresses.sectorDrainRows] = canonicalPlayfield.gameplayRows;
  transition.fill(0, addresses.broadsideState, addresses.broadsideState + 3);
  transition.fill(0, addresses.broadsideFlashTimer, addresses.broadsideFlashTimer + 3);
  transition.fill(0, addresses.capitalExplosionTimer, addresses.capitalExplosionTimer + 2);
  transition.fill(0, addresses.fighterExplosionTimer, addresses.fighterExplosionTimer + 2);
  runRoutine(transition, "update_sector_completion");
  assert.deepEqual([
    transition[addresses.sectorState], transition[addresses.spawnTimerHi],
  ], [6, canonicalPlayfield.ringRows]);
  transition[addresses.spawnTimer] = 1;
  runRoutine(transition, "entity_effects_update");
  assert.deepEqual([
    transition[addresses.activeMask], transition[addresses.spawnTimer],
    transition[addresses.rng],
  ], [0, 64, 101], "COMPLETE must defer without consuming entity RNG");

  for (let row = 1; row < canonicalPlayfield.ringRows; row += 1) {
    runRoutine(transition, "scroll_world_columns");
    assert.equal(transition[addresses.sectorState], 6,
      `COMPLETE ended before reconstruction row ${row + 1}`);
  }
  runRoutine(transition, "scroll_world_columns");
  assert.deepEqual([
    transition[addresses.sectorState], transition[addresses.spawnTimerHi],
    transition[addresses.spawnTimer], transition[addresses.activeMask],
    transition[addresses.rng],
  ], [7, 0, 32, 0, 101],
  "OPEN must re-arm normal delay without clearing the pool or consuming RNG");
  const postReconstructionStarRng = transition[addresses.starfieldRng];
  assert.equal(postReconstructionStarRng, 0xa7,
    "row-baked reconstruction must not revive the retired starfield RNG writer");
  for (let frame = 1; frame <= 31; frame += 1) {
    runRoutine(transition, "entity_effects_update");
    assert.equal(transition[addresses.activeMask], 0,
      `post-sector debris spawned early on delay frame ${frame}`);
  }
  runRoutine(transition, "entity_effects_update");
  assert.equal(transition[addresses.activeMask], 1,
    "the next legal open-space sector did not resume deterministic debris spawning");
  assert.equal(transition[addresses.rng], nextEntityRng(nextEntityRng(101)));
  assert.equal(transition[addresses.starfieldRng], postReconstructionStarRng,
    "the post-sector entity delay must not reset or advance starfield RNG");
  for (const [address, value] of protectedState) {
    assert.equal(transition[address], value,
      `capital-sector re-arm changed unrelated state at $${address.toString(16)}`);
  }

  const activeDuringDrain = createRuntimeMemory();
  initialiseRows(activeDuringDrain);
  initialiseEntity(activeDuringDrain, { x: 124, y: 24 });
  activeDuringDrain[addresses.sectorState] = 5;
  activeDuringDrain[addresses.vx] = 4;
  activeDuringDrain[addresses.moveAccumulator] = 3;
  activeDuringDrain[addresses.verticalAccumulator] = 0;
  activeDuringDrain[addresses.events] = 1;
  runRoutine(activeDuringDrain, "entity_effects_update");
  assert.deepEqual([
    activeDuringDrain[addresses.activeMask], activeDuringDrain[addresses.x],
    activeDuringDrain[addresses.y], activeDuringDrain[addresses.renderId],
  ], [1, 128, 24, manifest.entityEffects.glyphIndex + 2],
  "an already-active debris must retain its existing sector-transition lifecycle");
});

test("phase and position changes preserve backing across A2 ring wrap without ghosts", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory, canonicalPlayfield.ringRows - 1);
  initialiseEntity(memory, { x: 140, y: 24 });
  memory[addresses.vx] = 4;
  memory[addresses.moveAccumulator] = 3;
  memory[addresses.renderId] = manifest.entityEffects.glyphIndex;
  const oldCell = canonicalPlayfield.ringBufferAddress +
    (canonicalPlayfield.ringRows - 1) * 40 + 23;
  memory[oldCell] = 0x91;
  memory[oldCell + 1] = 0x92;
  runRoutine(memory, "entity_effects_render");
  assert.equal(memory[oldCell], manifest.entityEffects.glyphIndex);
  assert.equal(memory[oldCell + 1], manifest.entityEffects.glyphIndex + 1);
  assert.deepEqual([
    memory[addresses.backing], memory[addresses.backing1], memory[addresses.drawnMask],
  ], [0x91, 0x92, 3]);

  runRoutine(memory, "entity_effects_erase");
  assert.equal(memory[oldCell], 0x91, "old ring cell must restore its exact lower overlay");
  assert.equal(memory[oldCell + 1], 0x92,
    "right old ring cell must restore before the left cell");
  initialiseRows(memory, 0);
  memory[addresses.verticalAccumulator] = 2;
  memory[addresses.events] = 1;
  runRoutine(memory, "entity_effects_update");
  assert.deepEqual([
    memory[addresses.x], memory[addresses.y], memory[addresses.renderId],
    memory[addresses.moveAccumulator],
  ], [144, 32, manifest.entityEffects.glyphIndex + 2, 0]);
  const newCell = canonicalPlayfield.ringBufferAddress + 40 + 24;
  memory[newCell] = 0x66;
  memory[newCell + 1] = 0x67;
  runRoutine(memory, "entity_effects_render");
  assert.equal(memory[newCell], manifest.entityEffects.glyphIndex + 2);
  assert.equal(memory[newCell + 1], manifest.entityEffects.glyphIndex + 3);
  assert.equal(memory[addresses.backing], 0x66);
  assert.equal(memory[addresses.backing1], 0x67);
  assert.equal(memory[oldCell], 0x91, "phase/position change left a ghost glyph");
  assert.equal(memory[oldCell + 1], 0x92, "right phase cell left a ghost glyph");
  runRoutine(memory, "entity_effects_erase");
  assert.equal(memory[newCell], 0x66, "new ring cell must restore exact backing");
  assert.equal(memory[newCell + 1], 0x67, "new right cell must restore exact backing");
});

test("player-debris collision uses one explicit 16-HPOS visible-width operand", () => {
  assert.match(source, /PLAYER_VISIBLE_WIDTH_HPOS = 16/);
  assert.match(source,
    /entity_collide_player_active:[\s\S]*cmp #\(256-\(PLAYER_VISIBLE_WIDTH_HPOS-1\)\)[\s\S]*entity_player_debris_overlap = \*/);
  assert.equal((source.match(/cmp #\(256-\(PLAYER_VISIBLE_WIDTH_HPOS-1\)\)/g) ?? []).length, 1,
    "the visible-width contract must be confined to player/debris collision");
});

test("player-debris damage uses fixed EASY/MEDIUM/HARD HULL units atomically", () => {
  const contracts = [
    { difficulty: 0, damage: 2, examples: [[10, 8], [2, 0], [1, 0]] },
    { difficulty: 1, damage: 5, examples: [[10, 5], [5, 0], [4, 0]] },
    { difficulty: 2, damage: 7, examples: [[10, 3], [7, 0], [6, 0]] },
  ];
  assert.match(source,
    /debris_contact_damage_by_difficulty:\s*\n\s*\.byte DEBRIS_DAMAGE_EASY,DEBRIS_DAMAGE_MEDIUM,DEBRIS_DAMAGE_HARD/);
  assert.match(source,
    /entity_player_debris_overlap = \*[\s\S]+ldx DIFFICULTY_SETTING\s+lda debris_contact_damage_by_difficulty,x\s+jsr apply_player_damage/);

  for (const { difficulty, damage, examples } of contracts) {
    for (let health = 1; health <= 10; health += 1) {
      const result = exercisePlayerDebrisCollision({ difficulty, playerHealth: health });
      assert.equal(result.memory[addresses.playerHealth], Math.max(0, health - damage),
        `difficulty ${difficulty}, HULL ${health} underflowed or used the wrong fixed damage`);
      assert.equal(result.damageCallCount, 1,
        `difficulty ${difficulty}, HULL ${health} must call apply_player_damage exactly once`);
      assert.equal(result.memory[addresses.damageApplied], 1);
      assert.equal(result.memory[addresses.damageCooldown], 25);
      assert.equal(result.consumed, true);
    }
    for (const [health, expected] of examples) {
      const result = exercisePlayerDebrisCollision({ difficulty, playerHealth: health });
      assert.equal(result.memory[addresses.playerHealth], expected,
        `difficulty ${difficulty} matrix mismatch for ${health}->${expected}`);
    }
  }
});

test("debris damage updates HULL plates in the contact frame and enters canonical death flow", () => {
  const live = exercisePlayerDebrisCollision({ difficulty: 1, playerHealth: 10 });
  assert.deepEqual([...live.memory.subarray(0x4019, 0x401d)], [5, 5, 12, 12],
    "MEDIUM 10->5 must be visible in the HUD before the collision routine returns");

  const lethal = exercisePlayerDebrisCollision({
    difficulty: 2,
    playerHealth: 6,
    playerLives: 1,
  });
  assert.deepEqual({
    health: lethal.memory[addresses.playerHealth],
    lives: lethal.memory[addresses.playerLives],
    lifecycle: lethal.memory[addresses.playerLifecycle],
    deathTimer: lethal.memory[addresses.deathTimer],
    damageCalls: lethal.damageCallCount,
  }, { health: 0, lives: 0, lifecycle: 1, deathTimer: 24, damageCalls: 1 });
  assert.deepEqual([...lethal.memory.subarray(0x4019, 0x401d)], [12, 12, 12, 12]);

  for (let frame = 0; frame < 24; frame += 1) runRoutine(lethal.memory, "update_player_death");
  assert.equal(lethal.memory[addresses.playerLifecycle], 3,
    "final-life debris death must reach the existing GAME OVER lifecycle");
});

test("Interceptor pulse and capital damage retain their one- and two-unit contracts", () => {
  assert.match(source, /ENEMY_PULSE_DAMAGE_UNITS = 1/);
  assert.match(source, /CAPITAL_DAMAGE_UNITS = 2/);
  assert.match(source,
    /jsr interceptor_projectile_hits_player\s+bcc @interceptor_next[\s\S]+lda #ENEMY_PULSE_DAMAGE_UNITS\s+stx BROAD_WORK_SLOT\s+jsr apply_player_damage/);
  assert.match(source,
    /apply_broadside_player_damage:\s*\n\s*lda #CAPITAL_DAMAGE_UNITS/);

  for (const difficulty of [0, 1, 2]) {
    const memory = createRuntimeMemory();
    memory[addresses.playerLifecycle] = 0;
    memory[addresses.playerLives] = 3;
    memory[addresses.playerHealth] = 10;
    memory[addresses.damageCooldown] = 0;
    memory[addresses.damageApplied] = 0;
    memory[addresses.boosterState] = 0;
    memory[addresses.difficulty] = difficulty;
    runRoutine(memory, "apply_player_damage", { accumulator: 1 });
    assert.equal(memory[addresses.playerHealth], 9,
      `ordinary one-unit damage changed at difficulty ${difficulty}`);

    const capital = createRuntimeMemory();
    capital[addresses.playerLifecycle] = 0;
    capital[addresses.playerLives] = 3;
    capital[addresses.playerHealth] = 10;
    capital[addresses.damageCooldown] = 0;
    capital[addresses.damageApplied] = 0;
    capital[addresses.boosterState] = 0;
    capital[addresses.difficulty] = difficulty;
    runRoutine(capital, "apply_broadside_player_damage");
    assert.equal(capital[addresses.playerHealth], 8,
      `capital two-unit damage changed at difficulty ${difficulty}`);
  }
});

test("accepted direct Interceptor contact is lethal at every HULL and difficulty", () => {
  for (const difficulty of [0, 1, 2]) {
    for (let health = 1; health <= 10; health += 1) {
      const { memory, trace } = exercisePlayerInterceptorContact({ difficulty, playerHealth: health });
      assert.deepEqual({
        health: memory[addresses.playerHealth],
        lifecycle: memory[addresses.playerLifecycle],
        lives: memory[addresses.playerLives],
        damageCalls: trace.callCounts.get("apply_player_damage"),
        deathCalls: trace.callCounts.get("begin_player_fighter_explosion"),
      }, {
        health: 0,
        lifecycle: 1,
        lives: 2,
        damageCalls: 1,
        deathCalls: 1,
      }, `difficulty ${difficulty}, HULL ${health} did not enter one lethal contact flow`);
    }
  }
});

test("Interceptor contact geometry covers centre, edges, corners, and exact outside misses", () => {
  const enemyX = 124;
  const enemyY = 100;
  const hits = [
    [0, 0], [-7, 0], [15, 0], [0, -14], [0, 13],
    [-7, -14], [15, -14], [-7, 13], [15, 13],
  ];
  for (const [dx, dy] of hits) {
    const { memory, trace } = exercisePlayerInterceptorContact({
      playerX: enemyX + dx,
      playerY: enemyY + dy,
      enemyX,
      enemyY,
    });
    assert.deepEqual([
      memory[addresses.playerHealth], memory[addresses.enemyActive],
      trace.callCounts.get("apply_player_damage"),
      trace.callCounts.get("begin_player_fighter_explosion"),
    ], [0, 2, 1, 1], `legal contact offset ${dx},${dy} was missed`);
  }

  for (const [dx, dy] of [[-8, 0], [16, 0], [0, -15], [0, 14]]) {
    const { memory, trace } = exercisePlayerInterceptorContact({
      playerX: enemyX + dx,
      playerY: enemyY + dy,
      enemyX,
      enemyY,
    });
    assert.deepEqual([
      memory[addresses.playerHealth], memory[addresses.enemyActive],
      trace.callCounts.get("apply_player_damage"),
      trace.callCounts.get("begin_player_fighter_explosion"),
    ], [10, 1, 0, 0], `one-unit-outside offset ${dx},${dy} collided`);
  }
});

test("Interceptor contact preserves Shield, cooldown, respawn, and prior-latch gates", () => {
  const accepted = exercisePlayerInterceptorContact({ cooldown: 0 });
  assert.deepEqual([
    accepted.memory[addresses.playerHealth], accepted.memory[addresses.damageApplied],
    accepted.memory[addresses.damageCooldown],
  ], [0, 1, 24]);

  for (const cooldown of [1, 2, 25]) {
    const { memory, trace } = exercisePlayerInterceptorContact({ cooldown });
    assert.deepEqual([
      memory[addresses.playerHealth], memory[addresses.playerLifecycle],
      memory[addresses.playerLives], memory[addresses.damageApplied],
      memory[addresses.damageCooldown], memory[addresses.enemyActive],
      trace.callCounts.get("apply_player_damage"),
      trace.callCounts.get("begin_player_fighter_explosion"),
    ], [10, 0, 3, 0, cooldown - 1, 2, 1, 0],
    `cooldown ${cooldown} changed the established contact gate`);
  }

  const shield = exercisePlayerInterceptorContact({ shield: true });
  assert.deepEqual([
    shield.memory[addresses.playerHealth], shield.memory[addresses.playerLifecycle],
    shield.memory[addresses.playerLives], shield.memory[addresses.damageApplied],
    shield.memory[addresses.damageCooldown], shield.memory[addresses.enemyActive],
    shield.trace.callCounts.get("begin_player_fighter_explosion"),
  ], [10, 0, 3, 1, 0, 2, 0]);

  const respawn = exercisePlayerInterceptorContact({ lifecycle: 2 });
  assert.deepEqual([
    respawn.memory[addresses.playerHealth], respawn.memory[addresses.playerLifecycle],
    respawn.memory[addresses.damageApplied], respawn.memory[addresses.enemyActive],
    respawn.trace.callCounts.get("begin_player_fighter_explosion"),
  ], [10, 2, 0, 2, 0]);

  const latched = exercisePlayerInterceptorContact({ priorLatch: 1 });
  assert.deepEqual([
    latched.memory[addresses.playerHealth], latched.memory[addresses.playerLifecycle],
    latched.memory[addresses.damageApplied], latched.memory[addresses.enemyActive],
    latched.trace.callCounts.get("begin_player_fighter_explosion"),
  ], [10, 0, 1, 2, 0]);
});

test("lethal Interceptor contact updates HUD, uses one death event, and reaches Game Over", () => {
  const { memory, trace } = exercisePlayerInterceptorContact({
    playerHealth: 10,
    playerLives: 1,
  });
  assert.deepEqual({
    health: memory[addresses.playerHealth],
    lives: memory[addresses.playerLives],
    lifecycle: memory[addresses.playerLifecycle],
    deathTimer: memory[addresses.deathTimer],
    damageCalls: trace.callCounts.get("apply_player_damage"),
    deathCalls: trace.callCounts.get("begin_player_fighter_explosion"),
    hudCalls: trace.callCounts.get("update_hud_status"),
    hullHud: [...memory.subarray(0x4019, 0x401d)],
  }, {
    health: 0,
    lives: 0,
    lifecycle: 1,
    deathTimer: 24,
    damageCalls: 1,
    deathCalls: 1,
    hudCalls: 1,
    hullHud: [12, 12, 12, 12],
  });
  for (let frame = 0; frame < 24; frame += 1) runRoutine(memory, "update_player_death");
  assert.equal(memory[addresses.playerLifecycle], 3);
});

test("Raider lifecycle and score remain canonical without scheduling a character effect", () => {
  const { memory, trace } = exercisePlayerInterceptorContact();
  assert.deepEqual({
    state: memory[addresses.enemyActive],
    hp: memory[addresses.enemyHp],
    explosionTimer: memory[addresses.fighterExplosionTimer + 1],
    effectPending: memory[addresses.effectPending],
    score: memory[addresses.scoreHi] << 8 | memory[addresses.scoreLo],
    resolves: trace.callCounts.get("resolve_enemy_damage"),
    breakups: trace.callCounts.get("spawn_interceptor_breakup_effects"),
    hitSoundCalls: trace.callCounts.get("play_hit_sound"),
  }, {
    state: 2,
    hp: 0,
    explosionTimer: 24,
    effectPending: 0,
    score: 0x10,
    resolves: 1,
    breakups: 1,
    hitSoundCalls: 2,
  });
});

test("Interceptor contact result is byte-identical after XEX and ATR cold boot", () => {
  const snapshot = (memory, trace) => ({
    health: memory[addresses.playerHealth],
    lives: memory[addresses.playerLives],
    lifecycle: memory[addresses.playerLifecycle],
    cooldown: memory[addresses.damageCooldown],
    latch: memory[addresses.damageApplied],
    enemyState: memory[addresses.enemyActive],
    enemyExplosionTimer: memory[addresses.fighterExplosionTimer + 1],
    effectPending: memory[addresses.effectPending],
    scoreLo: memory[addresses.scoreLo],
    scoreHi: memory[addresses.scoreHi],
    hullHud: [...memory.subarray(0x4019, 0x401d)],
    damageCalls: trace.callCounts.get("apply_player_damage"),
    deathCalls: trace.callCounts.get("begin_player_fighter_explosion"),
    breakups: trace.callCounts.get("spawn_interceptor_breakup_effects"),
    hitSoundCalls: trace.callCounts.get("play_hit_sound"),
  });
  for (const fill of [0xa5, 0x5a]) {
    const traces = ["xex", "atr"].map((artifact) => {
      const baseMemory = createBootedArtifactRuntimeMemory(artifact, fill);
      const result = exercisePlayerInterceptorContact({ baseMemory });
      return snapshot(result.memory, result.trace);
    });
    assert.deepEqual(traces[0], traces[1],
      `Interceptor contact diverged between XEX and ATR with cold fill $${fill.toString(16)}`);
    assert.deepEqual(traces[0], {
      health: 0,
      lives: 2,
      lifecycle: 1,
      cooldown: 24,
      latch: 1,
      enemyState: 2,
      enemyExplosionTimer: 24,
      effectPending: 0,
      scoreLo: 0x10,
      scoreHi: 0,
      hullHud: [12, 12, 12, 12],
      damageCalls: 1,
      deathCalls: 1,
      breakups: 1,
      hitSoundCalls: 2,
    });
  }
});

test("all four debris forms detect every visible PlayerFighter HPOS from 0 through 15", () => {
  for (const renderId of [110, 112, 114, 116]) {
    for (let offset = 0; offset < 16; offset += 1) {
      const result = exercisePlayerDebrisCollision({
        renderId,
        playerX: 100,
        playerY: 100,
        entityX: 100 + offset,
        entityY: 100,
      });
      assert.deepEqual({
        detected: result.detected,
        attempted: result.attempted,
        applied: result.applied,
        suppressed: result.suppressed,
        consumed: result.consumed,
      }, {
        detected: true,
        attempted: true,
        applied: true,
        suppressed: null,
        consumed: true,
      }, `debris glyph ${renderId} missed visible PlayerFighter HPOS ${offset}`);
    }
  }
});

test("player-debris half-open boundaries cover every edge and corner", () => {
  const contacts = [
    [93, 100, "left edge"], [115, 100, "right edge"],
    [100, 93, "top edge"], [100, 114, "bottom edge"],
    [93, 93, "top-left corner"], [115, 93, "top-right corner"],
    [93, 114, "bottom-left corner"], [115, 114, "bottom-right corner"],
  ];
  for (const [entityX, entityY, description] of contacts) {
    const result = exercisePlayerDebrisCollision({ entityX, entityY });
    assert.deepEqual([result.detected, result.attempted, result.applied], [true, true, true],
      `${description} must collide`);
  }

  const misses = [
    [92, 100, "one HPOS beyond left"], [116, 100, "one HPOS beyond right"],
    [100, 92, "one scanline beyond top"], [100, 115, "one scanline beyond bottom"],
    [92, 92, "one unit beyond top-left"], [116, 92, "one unit beyond top-right"],
    [92, 115, "one unit beyond bottom-left"], [116, 115, "one unit beyond bottom-right"],
  ];
  for (const [entityX, entityY, description] of misses) {
    const result = exercisePlayerDebrisCollision({ entityX, entityY });
    assert.deepEqual({
      detected: result.detected,
      attempted: result.attempted,
      applied: result.applied,
      suppressed: result.suppressed,
      consumed: result.consumed,
    }, {
      detected: false,
      attempted: false,
      applied: false,
      suppressed: null,
      consumed: false,
    }, `${description} must remain outside`);
  }
});

test("nose, wings and engines use the same full visible PlayerFighter envelope", () => {
  const anatomyContacts = [
    { entityX: 107, entityY: 93, part: "nose" },
    { entityX: 100, entityY: 106, part: "left wing" },
    { entityX: 115, entityY: 106, part: "right wing" },
    { entityX: 102, entityY: 114, part: "left engine" },
    { entityX: 113, entityY: 114, part: "right engine" },
  ];
  for (const renderId of [110, 112, 114, 116]) {
    for (const { entityX, entityY, part } of anatomyContacts) {
      const result = exercisePlayerDebrisCollision({ renderId, entityX, entityY });
      assert.deepEqual([result.detected, result.applied, result.consumed], [true, true, true],
        `${part} missed debris glyph ${renderId}`);
    }
  }
});

test("debris movement samples collision after horizontal +/-4 HPOS and vertical +8 scanlines", () => {
  for (const renderId of [110, 112, 114, 116]) {
    const right = exercisePlayerDebrisCollision({
      renderId,
      playerX: 112,
      playerY: 100,
      entityX: 108,
      entityY: 100,
      vx: 4,
      moveAccumulator: 3,
      events: 1,
      routine: "entity_effects_update",
    });
    assert.equal(right.memory[addresses.x], 112);
    assert.deepEqual([right.detected, right.applied, right.consumed], [true, true, true]);

    const left = exercisePlayerDebrisCollision({
      renderId,
      playerX: 100,
      playerY: 100,
      entityX: 104,
      entityY: 100,
      vx: 0xfc,
      moveAccumulator: 3,
      events: 1,
      routine: "entity_effects_update",
    });
    assert.equal(left.memory[addresses.x], 100);
    assert.deepEqual([left.detected, left.applied, left.consumed], [true, true, true]);

    const down = exercisePlayerDebrisCollision({
      renderId,
      playerX: 100,
      playerY: 108,
      entityX: 100,
      entityY: 93,
      verticalAccumulator: 4,
      events: 1,
      routine: "entity_effects_update",
    });
    assert.equal(down.memory[addresses.y], 101);
    assert.deepEqual([down.detected, down.applied, down.consumed], [true, true, true]);
  }
});

test("debris contact reports damage gates without changing their semantics", () => {
  for (const cooldown of [0, 1, 2, 25]) {
    const result = exercisePlayerDebrisCollision({ cooldown });
    assert.deepEqual({
      detected: result.detected,
      attempted: result.attempted,
      applied: result.applied,
      suppressed: result.suppressed,
      eventAccepted: result.eventAccepted,
      consumed: result.consumed,
    }, cooldown === 0 ? {
      detected: true,
      attempted: true,
      applied: true,
      suppressed: null,
      eventAccepted: true,
      consumed: true,
    } : {
      detected: true,
      attempted: true,
      applied: false,
      suppressed: "damage-cooldown",
      eventAccepted: false,
      consumed: false,
    }, `unexpected result at damage cooldown ${cooldown}`);
  }

  const shield = exercisePlayerDebrisCollision({ shield: true, cooldown: 25 });
  assert.deepEqual({
    detected: shield.detected,
    attempted: shield.attempted,
    applied: shield.applied,
    suppressed: shield.suppressed,
    eventAccepted: shield.eventAccepted,
    consumed: shield.consumed,
    health: shield.memory[addresses.playerHealth],
    cooldown: shield.memory[addresses.damageCooldown],
    latch: shield.memory[addresses.damageApplied],
  }, {
    detected: true,
    attempted: true,
    applied: false,
    suppressed: "shield",
    eventAccepted: true,
    consumed: true,
    health: 10,
    cooldown: 25,
    latch: 1,
  });

  const respawn = exercisePlayerDebrisCollision({ lifecycle: 2 });
  assert.deepEqual({
    detected: respawn.detected,
    attempted: respawn.attempted,
    applied: respawn.applied,
    suppressed: respawn.suppressed,
    eventAccepted: respawn.eventAccepted,
    consumed: respawn.consumed,
  }, {
    detected: true,
    attempted: true,
    applied: false,
    suppressed: "player-lifecycle",
    eventAccepted: false,
    consumed: false,
  });

  const latched = exercisePlayerDebrisCollision({ priorLatch: 1 });
  assert.deepEqual({
    detected: latched.detected,
    attempted: latched.attempted,
    applied: latched.applied,
    suppressed: latched.suppressed,
    eventAccepted: latched.eventAccepted,
    consumed: latched.consumed,
  }, {
    detected: true,
    attempted: false,
    applied: false,
    suppressed: "prior-damage-latch",
    eventAccepted: false,
    consumed: false,
  });
});

test("three PlayerFighter hits destroy every debris form while score and enemy paths remain unchanged", () => {
  for (const renderId of [110, 112, 114, 116]) {
    for (const vx of [0, 0xfc, 4]) {
      const memory = createRuntimeMemory();
      initialiseRows(memory);
      initialiseShootableDebris(memory, { x: 124, y: 100 });
      memory[addresses.renderId] = renderId;
      memory[addresses.vx] = vx;
      memory[addresses.scoreLo] = 0x42;
      memory[addresses.scoreHi] = 0x07;
      memory[addresses.enemyPendingDamage] = 0;
      memory[addresses.fighterExplosionTimer] = 0;
      for (let hit = 1; hit <= 3; hit += 1) {
        armPlayerFighterProjectile(memory, 0, { x: 127, y: 106 });
        runRoutine(memory, "update_fighter_projectiles");
        assert.equal(memory[addresses.projectileActive], 0,
          `hit ${hit} did not consume its projectile`);
        assert.deepEqual([memory[addresses.scoreLo], memory[addresses.scoreHi]], [0x42, 0x07]);
        assert.deepEqual([
          memory[addresses.enemyPendingDamage], memory[addresses.fighterExplosionTimer],
        ], [0, 0], `hit ${hit} entered an enemy/full-screen explosion path`);
        if (hit < 3) {
          assert.deepEqual([
            memory[addresses.hp], memory[addresses.activeMask], memory[addresses.activeCount],
            memory[addresses.owner], memory[addresses.effectActiveCount],
          ], [3 - hit, 1, 1, 3, 0]);
          runRoutine(memory, "entity_effects_update");
        }
      }
      assert.deepEqual([
        memory[addresses.hp], memory[addresses.activeMask], memory[addresses.activeCount],
        memory[addresses.spawnTimer], memory[addresses.effectActiveMask],
        memory[addresses.effectActiveCount],
      ], [0, 0, 0, 65, 0x1f, 5],
      `render ${renderId}, vx ${vx} did not spawn one core plus four fragments`);
      runRoutine(memory, "entity_effects_update");
      assert.equal(memory[addresses.spawnTimer], 64,
        "shot destruction must enter the ordinary full repeat delay");
    }
  }
});

test("PlayerFighter collision covers the half-open 2x1 footprint and swept upper boundary", () => {
  const hit = ({ x, y }) => {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseShootableDebris(memory, { x: 124, y: 100, hp: 1 });
    armPlayerFighterProjectile(memory, 0, { x, y });
    runRoutine(memory, "update_fighter_projectiles");
    return [memory[addresses.activeMask], memory[addresses.projectileActive]];
  };
  for (let x = 124; x < 132; x += 1) assert.deepEqual(hit({ x, y: 106 }), [0, 0]);
  assert.deepEqual(hit({ x: 123, y: 106 }), [1, 1], "left edge must be half-open");
  assert.deepEqual(hit({ x: 132, y: 106 }), [1, 1], "right edge must be half-open");
  for (let row = 0; row < 8; row += 1) {
    assert.deepEqual(hit({ x: 124, y: 106 + row }), [0, 0],
      `visible debris row ${row} was not shootable`);
  }
  assert.deepEqual(hit({ x: 124, y: 99 }), [0, 0],
    "a six-scanline step plus the two-line projectile must catch the exact swept boundary");
  assert.deepEqual(hit({ x: 124, y: 98 }), [1, 1],
    "the scanline above the swept boundary must miss");
});

test("lowest matching PlayerFighter slot is consumed once and every higher slot remains active", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  initialiseShootableDebris(memory, { x: 124, y: 100 });
  armPlayerFighterProjectile(memory, 0, { x: 112, y: 106 });
  armPlayerFighterProjectile(memory, 2, { x: 124, y: 106 });
  armPlayerFighterProjectile(memory, 5, { x: 124, y: 106 });
  runRoutine(memory, "update_fighter_projectiles");
  assert.deepEqual([
    memory[addresses.projectileActive + 0],
    memory[addresses.projectileActive + 2],
    memory[addresses.projectileActive + 5],
    memory[addresses.activeMask], memory[addresses.hp],
  ], [1, 0, 1, 1, 2]);
  assert.equal(memory[addresses.projectileLifetime + 5], 9,
    "the preserved higher slot must advance exactly once without being consumed");
});

test("debris and Interceptor arbitration follows upward first-contact order with debris ties", () => {
  const collide = (enemyY) => {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseShootableDebris(memory, { x: 124, y: 100, hp: 1 });
    memory[addresses.enemyActive] = 1;
    memory[addresses.enemyArchetype] = 0;
    memory[addresses.enemyMemberState] = 1;
    memory[addresses.enemyFormationYHi] = 0;
    memory[addresses.enemyTargetSlot] = 0;
    memory[addresses.enemyLiveCount] = 1;
    memory[addresses.enemyHp] = 1;
    memory[addresses.enemyPendingDamage] = 0;
    memory[addresses.enemyX] = 124;
    memory[addresses.enemyY] = enemyY;
    armPlayerFighterProjectile(memory, 0, { x: 127, y: 109 });
    runRoutine(memory, "update_fighter_projectiles");
    return {
      debris: memory[addresses.activeMask],
      projectile: memory[addresses.projectileActive],
      enemyDamage: memory[addresses.enemyPendingDamage],
    };
  };
  assert.deepEqual(collide(93), { debris: 0, projectile: 0, enemyDamage: 0 },
    "debris with the greater bottom edge must be met first");
  assert.deepEqual(collide(94), { debris: 0, projectile: 0, enemyDamage: 0 },
    "an exact bottom-edge tie must resolve to debris");
  assert.deepEqual(collide(95), { debris: 1, projectile: 0, enemyDamage: 1 },
    "the lower Interceptor must receive the one consumed projectile first");
});

test("shot resolution precedes player contact while unshot debris uses difficulty damage", () => {
  const shot = createRuntimeMemory();
  initialiseRows(shot);
  initialiseShootableDebris(shot, { x: 124, y: 100, hp: 1 });
  shot[addresses.playerX] = 124;
  shot[addresses.playerY] = 100;
  shot[addresses.playerHealth] = 10;
  shot[addresses.damageCooldown] = 0;
  shot[addresses.damageApplied] = 0;
  armPlayerFighterProjectile(shot, 0, { x: 124, y: 106 });
  runRoutine(shot, "update_fighter_projectiles");
  runRoutine(shot, "entity_effects_update");
  assert.deepEqual([
    shot[addresses.activeMask], shot[addresses.projectileActive],
    shot[addresses.playerHealth], shot[addresses.damageCooldown],
  ], [0, 0, 10, 0], "the shot must remove debris before its player-contact update");

  const contact = createRuntimeMemory();
  initialiseRows(contact);
  initialiseShootableDebris(contact, { x: 124, y: 100 });
  contact[addresses.playerX] = 124;
  contact[addresses.playerY] = 100;
  contact[addresses.playerHealth] = 10;
  contact[addresses.damageCooldown] = 0;
  contact[addresses.damageApplied] = 0;
  contact[addresses.difficulty] = 1;
  runRoutine(contact, "entity_effects_update");
  assert.deepEqual([contact[addresses.activeMask], contact[addresses.playerHealth]], [0, 5],
    "unshot debris must use MEDIUM's fixed five-unit contact damage");
});

test("Interceptor and broadside projectiles cannot enter the debris target path", () => {
  const memory = createRuntimeMemory();
  initialiseRows(memory);
  initialiseShootableDebris(memory, { x: 124, y: 100 });
  const interceptorSlot = 10;
  memory[addresses.projectileActive + interceptorSlot] = 2;
  memory[addresses.projectileX + interceptorSlot] = 124;
  memory[addresses.projectileY + interceptorSlot] = 94;
  memory[addresses.projectilePreviousY + interceptorSlot] = 94;
  memory[addresses.projectileLifetime + interceptorSlot] = 10;
  runRoutine(memory, "update_fighter_projectiles");
  assert.deepEqual([
    memory[addresses.activeMask], memory[addresses.projectileActive + interceptorSlot],
  ], [1, 2]);
  const projectileUpdate = source.slice(source.indexOf("update_fighter_projectiles:"),
    source.indexOf("update_player_fighter_weapon:"));
  assert.match(projectileUpdate,
    /@player_fighter_slot:[\s\S]+jsr entity_player_fighter_projectile_target[\s\S]+@interceptor_slot:/);
  assert.doesNotMatch(projectileUpdate.slice(projectileUpdate.indexOf("@interceptor_slot:")),
    /entity_player_fighter_projectile_target/);
  assert.doesNotMatch(source.slice(source.indexOf("update_broadside:"),
    source.indexOf("schedule_broadside:")), /entity_player_fighter_projectile_target/);
});

test("shot destruction after reverse erase leaves no glyph at any A2 ring head", () => {
  for (let head = 0; head < 22; head += 1) {
    for (const renderId of [110, 112, 114, 116]) {
      const memory = createRuntimeMemory();
      initialiseRows(memory, head);
      initialiseShootableDebris(memory, { x: 124, y: 104, hp: 1 });
      memory[addresses.renderId] = renderId;
      const logical = (104 - 24) >> 3;
      const cell = 0x4050 + ((head + logical) % 22) * 40 + 19;
      memory[cell] = 0x31;
      memory[cell + 1] = 0x32;
      runRoutine(memory, "entity_effects_render");
      runRoutine(memory, "entity_effects_erase");
      armPlayerFighterProjectile(memory, 0, { x: 124, y: 110 });
      runRoutine(memory, "update_fighter_projectiles");
      memory[addresses.events] = 0;
      runRoutine(memory, "entity_effects_update");
      runRoutine(memory, "entity_effects_render");
      assert.equal(memory[addresses.effectActiveCount], 5);
      for (let frame = 1; frame <= 30; frame += 1) {
        runRoutine(memory, "entity_effects_erase");
        memory[addresses.events] = 0;
        runRoutine(memory, "entity_effects_update");
        runRoutine(memory, "entity_effects_render");
      }
      assert.deepEqual([memory[cell], memory[cell + 1]], [0x31, 0x32],
        `head ${head}, glyph ${renderId} left a backed ghost after effect expiry`);
      assert.deepEqual([
        memory[addresses.renderedMask], memory[addresses.drawnMask],
        memory[addresses.effectRendered], memory[addresses.effectActiveCount],
      ], [0, 0, 0, 0]);
    }
  }
});

test("executed XEX and ATR traces preserve the five-slot generic debris split", () => {
  const xexTrace = executeDebrisDestructionTrace({ root, artifact: "xex" });
  const atrTrace = executeDebrisDestructionTrace({ root, artifact: "atr" });
  assert.equal(assertDebrisDestructionTraceParity(xexTrace, atrTrace), true);
  const find = (phase, frame) => xexTrace.records.find((record) =>
    record.phase === phase && record.frame === frame);
  assert.deepEqual([
    find("PRE_HIT", 0).debrisHp,
    find("HIT_1", 0).debrisHp,
    find("HIT_2", 0).debrisHp,
    find("FINAL", 0).debrisHp,
  ], [3, 2, 1, 0]);
  assert.deepEqual([
    find("HIT_1", 0).debrisHitFlashTimer,
    find("HIT_1", 1).debrisHitFlashTimer,
    find("HIT_2", 0).debrisHitFlashTimer,
    find("HIT_2", 1).debrisHitFlashTimer,
  ], [2, 1, 2, 1], "each nonlethal flash must render for exactly two PAL frames");
  assert.equal(find("HIT_1", 0).projectileActive, 0);
  assert.equal(find("HIT_2", 0).projectileActive, 0);

  const first = find("FINAL", 0);
  assert.deepEqual([
    first.debrisActive, first.debrisState, first.projectileActive,
    first.effectActiveMask, first.effectActiveCount,
  ], [0, 0, 0, 0x1f, 5]);
  assert.deepEqual(first.effects.map(({ slot, type, ttl }) => [slot, type, ttl]),
    [[0, 1, 5], [1, 2, 30], [2, 2, 30], [3, 2, 30], [4, 2, 30]]);
  const firstFragments = first.effects.slice(1);
  assert.ok(new Set(firstFragments.map(({ screenAddress }) => screenAddress)).size >= 3,
    "the unchanged debris split must occupy at least three rendered cells immediately");
  const initiallyDrawnFragments = firstFragments.filter(({ drawn }) => drawn === 1);
  assert.equal(initiallyDrawnFragments.length, 2,
    "the first stagger parity must publish the unchanged two fragment slots");
  assert.ok(initiallyDrawnFragments.every(({ screenCode }) => screenCode !== 0));

  const positions = (frame) => new Map(find("FINAL", frame).effects
    .filter(({ slot }) => slot > 0).map(({ slot, x, y }) => [slot, { x, y }]));
  const p0 = positions(0);
  const p4 = positions(4);
  const p12 = positions(12);
  for (const slot of [1, 2, 3, 4]) {
    const horizontalSign = slot & 1 ? -1 : 1;
    const verticalSign = slot < 3 ? -1 : 1;
    assert.ok((p4.get(slot).x - p0.get(slot).x) * horizontalSign > 0);
    assert.ok((p12.get(slot).x - p4.get(slot).x) * horizontalSign > 0);
    assert.ok((p4.get(slot).y - p0.get(slot).y) * verticalSign > 0);
    assert.ok((p12.get(slot).y - p4.get(slot).y) * verticalSign > 0);
  }
  assert.ok(Math.max(...[...p12.values()].map(({ x }) => x)) -
    Math.min(...[...p12.values()].map(({ x }) => x)) >= 16,
  "frame 12 must span at least four character columns");
  assert.ok(Math.max(...[...p12.values()].map(({ y }) => y)) -
    Math.min(...[...p12.values()].map(({ y }) => y)) >= 16,
  "frame 12 must span at least two character rows");

  for (let frame = 0; frame < 30; frame += 1) {
    const fragments = find("FINAL", frame).effects.filter(({ slot }) => slot > 0);
    assert.equal(fragments.length, 4, `frame ${frame} lost a fragment early`);
    assert.ok(find("FINAL", frame).rendered, `frame ${frame} skipped effect render`);
  }
  assert.equal(find("FINAL", 4).effects.length, 5);
  assert.equal(find("FINAL", 5).effects.length, 4, "core must expire after five frames");
  assert.deepEqual([
    find("FINAL", 30).effectActiveMask, find("FINAL", 30).effectActiveCount,
    find("FINAL", 31).effectActiveMask, find("FINAL", 31).effectActiveCount,
  ], [0, 0, 0, 0]);
  assert.ok(find("FINAL", 31).screen.every((code) => code === 0),
    "the final reverse erase must leave no ghost screen code");
  for (let glyph = 118; glyph < 120; glyph += 1) {
    const lit = [...xexTrace.charset.slice(glyph * 8, glyph * 8 + 8)]
      .reduce((count, row) => count + [6, 4, 2, 0]
        .filter((shift) => (row >> shift & 3) !== 0).length, 0);
    assert.ok(lit >= 4 && lit <= 7, `fragment glyph ${glyph} has ${lit} lit pixels`);
  }
});

test("every canonical Raider death avoids character effects without changing score policy", () => {
  for (const [sourceId, scoreLo] of [[0, 0x52], [1, 0x52], [2, 0x52], [3, 0x42], [5, 0x42]]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    runRoutine(memory, "init_entity_effects");
    memory[addresses.enemyArchetype] = 0;
    memory[addresses.enemyActive] = 1;
    memory[addresses.enemyMemberState] = 1;
    memory[addresses.enemyFormationYHi] = 0;
    memory[addresses.enemyTargetSlot] = 0;
    memory[addresses.enemyLiveCount] = 1;
    memory[addresses.enemyHp] = 1;
    memory[addresses.enemyPendingDamage] = 1;
    memory[addresses.enemyPendingSource] = sourceId;
    memory[addresses.enemyX] = 124;
    memory[addresses.enemyY] = 88;
    memory[addresses.scoreLo] = 0x42;
    memory[addresses.scoreHi] = 0x07;
    memory.fill(0xff, 0x3d00 + 88, 0x3d00 + 102);
    memory.fill(0xff, 0x3e00 + 88, 0x3e00 + 102);
    runRoutine(memory, "resolve_enemy_damage");
    assert.deepEqual([
      memory[addresses.enemyActive], memory[addresses.fighterExplosionTimer + 1],
      memory[addresses.effectActiveMask], memory[addresses.effectActiveCount],
      memory[addresses.effectPending], memory[addresses.scoreLo], memory[addresses.scoreHi],
    ], [2, 24, 0, 0, 0, scoreLo, 0x07], `damage source ${sourceId}`);
    assert.ok(memory.subarray(0x3d00 + 88, 0x3d00 + 102).every((value) => value === 0));
    assert.ok(memory.subarray(0x3e00 + 88, 0x3e00 + 102).every((value) => value === 0xff),
      "killing P1 must not erase the live P2 PMG page");
    assert.deepEqual([
      memory[addresses.fighterExplosionX + 1], memory[addresses.fighterExplosionY + 1],
    ], [124, 91], "the unchanged 24-frame lifecycle must retain its kill snapshot");
    runRoutine(memory, "entity_effects_update");
    assert.deepEqual([
      memory[addresses.effectPending], memory[addresses.effectActiveMask],
      memory[addresses.effectActiveCount],
    ], [0, 0, 0], "the death frame must not schedule a character effect");
    runRoutine(memory, "entity_effects_update");
    assert.deepEqual([
      memory[addresses.effectPending], memory[addresses.effectActiveMask],
      memory[addresses.effectActiveCount],
    ], [0, 0, 0], "later PAL frames must not materialise a Raider effect");
  }
});

test("executed Raider destruction is character-free and XEX/ATR exact", () => {
  const xexTrace = executeInterceptorBreakupTrace({ root, artifact: "xex" });
  const atrTrace = executeInterceptorBreakupTrace({ root, artifact: "atr" });
  assert.equal(assertInterceptorBreakupTraceParity(xexTrace, atrTrace), true);
  const frame = (index) => xexTrace.records.find((record) =>
    record.phase === "BREAKUP" && record.frame === index);
  assert.deepEqual([
    xexTrace.records[0].enemyActive, frame(0).enemyActive,
    frame(0).effectPending, frame(0).effectActiveMask, frame(0).effectActiveCount,
    frame(1).effectPending, frame(1).effectActiveMask, frame(1).effectActiveCount,
  ], [1, 2, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([frame(0).colbk, frame(1).colbk, frame(2).colbk, frame(3).colbk, frame(4).colbk],
    [0x1e, 0x3c, 0x1c, 0x34, 0x00], "accepted full-screen profile changed");
  for (let index = 0; index <= 31; index += 1) {
    assert.deepEqual([
      frame(index).effectPending, frame(index).effectActiveMask,
      frame(index).effectActiveCount, frame(index).effects.length,
    ], [0, 0, 0, 0], `frame ${index} published a Raider character effect`);
  }
  assert.ok(frame(31).screen.every((code) => code === 0));
  assert.deepEqual([xexTrace.records[0].scoreLo, frame(31).scoreLo], [0x42, 0x52]);
});

test("Raider death preserves an unrelated generic debris effect", () => {
  const spawnInterceptor = (memory) => {
    memory[addresses.enemyArchetype] = 0;
    memory[addresses.enemyX] = 124;
    memory[addresses.enemyY] = 88;
    runRoutine(memory, "spawn_interceptor_breakup_effects");
  };
  const spawnDebris = (memory) => {
    memory[addresses.x] = 124;
    memory[addresses.y] = 104;
    memory[addresses.renderId] = 116;
    runRoutine(memory, "spawn_debris_destruction_effects");
  };
  for (let head = 0; head < 22; head += 1) {
    for (const [first, second, expectedMask, expectedCount, expectedCore] of [
      [spawnInterceptor, spawnDebris, 0x1f, 5, 116],
      [spawnDebris, spawnInterceptor, 0x1f, 5, 116],
    ]) {
      const memory = createRuntimeMemory();
      initialiseRows(memory, head);
      runRoutine(memory, "init_entity_effects");
      memory.fill(0x2a, 0x4050, 0x43c0);
      first(memory);
      if (first === spawnDebris) runRoutine(memory, "entity_effects_update");
      runRoutine(memory, "entity_effects_render");
      runRoutine(memory, "entity_effects_erase");
      assert.equal(memory[addresses.effectRendered], 0);
      second(memory);
      assert.deepEqual([
        memory[addresses.effectActiveMask], memory[addresses.effectActiveCount],
        memory[addresses.effectRenderId],
      ], [expectedMask, expectedCount, expectedCore]);
      if (second === spawnDebris) runRoutine(memory, "entity_effects_update");
      runRoutine(memory, "entity_effects_render");
      runRoutine(memory, "entity_effects_erase");
      assert.ok(memory.subarray(0x4050, 0x43c0).every((value) => value === 0x2a),
        `ring head ${head} retained a replacement ghost`);
    }
  }

  const sameFrame = createRuntimeMemory();
  initialiseRows(sameFrame);
  runRoutine(sameFrame, "init_entity_effects");
  spawnDebris(sameFrame);
  spawnInterceptor(sameFrame);
  assert.deepEqual([
    sameFrame[addresses.effectActiveMask], sameFrame[addresses.effectActiveCount],
    sameFrame[addresses.effectPending],
  ], [0x1f, 5, 0]);
});

test("backed overlay stack restores base, shell/projectile, entity and effect in reverse", () => {
  for (const lowerOverlay of [0x66, 0x91]) {
    const memory = createRuntimeMemory();
    initialiseRows(memory);
    initialiseEntity(memory, { x: 124, y: 24 });
    const cell = canonicalPlayfield.ringBufferAddress + 19;
    const base = 0x0a;
    const baseRight = 0x0b;
    memory[cell] = base;
    memory[cell + 1] = baseRight;
    const lowerBacking = memory[cell];
    const lowerBackingRight = memory[cell + 1];
    memory[cell] = lowerOverlay;
    memory[cell + 1] = lowerOverlay + 1;
    runRoutine(memory, "entity_effects_render");
    const entityGlyph = memory[cell];
    const entityGlyphRight = memory[cell + 1];
    assert.equal(memory[addresses.backing], lowerOverlay);
    assert.equal(memory[addresses.backing1], lowerOverlay + 1);

    memory[addresses.effectRendered] = 1;
    memory[addresses.effectScreenLo] = (cell + 1) & 0xff;
    memory[addresses.effectScreenHi] = (cell + 1) >> 8;
    memory[addresses.effectBacking] = entityGlyphRight;
    memory[addresses.effectDrawnMask] = 1;
    memory[cell + 1] = 0xfe;

    runRoutine(memory, "erase_transient_effect_overlays");
    assert.equal(memory[cell], entityGlyph, "effect erase must leave the adjacent entity cell");
    assert.equal(memory[cell + 1], entityGlyphRight, "effect erase must restore entity");
    runRoutine(memory, "erase_interactive_entity_overlays");
    assert.equal(memory[cell], lowerOverlay, "entity erase must restore shell/projectile");
    assert.equal(memory[cell + 1], lowerOverlay + 1,
      "right entity cell must restore its own shell/projectile backing");
    memory[cell] = lowerBacking;
    memory[cell + 1] = lowerBackingRight;
    assert.equal(memory[cell], base, "lower overlay erase must restore base");
    assert.equal(memory[cell + 1], baseRight, "right lower overlay must restore base");
  }
});

test("linked character-free Raider trace stays below the former five-slot path", () => {
  const trace = executeInterceptorBreakupTrace({ root, artifact: "xex" });
  const materialised = trace.records.find((record) =>
    record.phase === "BREAKUP" && record.frame === 1);
  assert.ok(materialised.effectUpdateCycles < 806);
  assert.ok(materialised.effectRenderCycles < 887);
});
