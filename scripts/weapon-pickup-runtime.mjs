import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "./nmos6502.mjs";
import { canonicalPlayfield } from "./playfield.mjs";
import { installBootArtifact } from "./runtime-image.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");
const ringRows = canonicalPlayfield.ringRows;
const ringBase = canonicalPlayfield.ringBufferAddress;
const ringEnd = canonicalPlayfield.ringBufferEnd;
const playerMaximumY = canonicalPlayfield.gameplayBottom - 15;

function labelsFromFile(sourcePath) {
  return new Map(fs.readFileSync(sourcePath, "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]));
}

export function requiredLabel(labels, name) {
  const address = labels.get(name);
  if (!Number.isInteger(address)) throw new Error(`Missing linked label ${name}`);
  return address;
}

function fixedStateAddress(labels, name) {
  const linked = labels.get(name);
  if (Number.isInteger(linked)) return linked;
  if (name === "BROAD_PLAYER_HEALTH") return 0x4e5d;
  if (name === "PLAYER_LIVES") return 0x4eab;
  throw new Error(`Missing linked state address ${name}`);
}

// entity_effects_erase/render are effects-only in the runtime (the debris is
// published by entity_debris_publish); keep the composite order for the harness.
const compositeRoutines = {
  entity_effects_render: ["render_interactive_entity_overlays", "entity_effects_render"],
  entity_effects_erase: ["entity_effects_erase", "erase_interactive_entity_overlays"],
};

export function runRoutine(memory, labels, name, options = {}) {
  if (compositeRoutines[name]) {
    return compositeRoutines[name].reduce((sum, part) =>
      sum + runRoutineRaw(memory, labels, part, options), 0);
  }
  return runRoutineRaw(memory, labels, name, options);
}

function runRoutineRaw(memory, labels, name, { a = 0, x = 0, y = 0 } = {}) {
  const cpu = new Nmos6502(memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  if (cpu.pc !== stop) {
    throw new Error(`${name} did not return (pc=$${cpu.pc.toString(16).padStart(4, "0")}, ` +
      `opcode=$${memory[cpu.pc].toString(16).padStart(2, "0")})`);
  }
  return cpu.cycles;
}

function physicalGameplayAddress(memory, labels, row, column) {
  if (row === 0) return 0x4028 + column;
  const index = row - 1;
  return (memory[requiredLabel(labels, "PLAYFIELD_ROW_LO") + index] |
    memory[requiredLabel(labels, "PLAYFIELD_ROW_HI") + index] << 8) + column;
}

function drawRuntimeHullScene(memory, labels, { head, topPhase }) {
  initialiseRows(memory, labels, head);
  memory.fill(0, 0x4028, 0x4400);
  const dst = requiredLabel(labels, "dst_ptr");
  const phase = requiredLabel(labels, "corridor_phase");
  for (let row = 0; row < canonicalPlayfield.gameplayRows; row += 1) {
    const address = physicalGameplayAddress(memory, labels, row, 0);
    memory[dst] = address & 0xff;
    memory[dst + 1] = address >> 8;
    memory[phase] = (topPhase - row) & 0xff;
    runRoutine(memory, labels, "draw_hull_row");
  }
}

export function initialiseRows(memory, labels, head = 0) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  for (let logical = 0; logical < ringRows; logical += 1) {
    const physical = (head + logical) % ringRows;
    const address = ringBase + physical * canonicalPlayfield.screenColumns;
    memory[lo + logical] = address & 0xff;
    memory[hi + logical] = address >> 8;
  }
}

function renderEntityEffects(memory, labels) {
  runRoutine(memory, labels, "entity_effects_render");
}

function logicalScreen(memory, labels) {
  const lo = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const hi = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const screen = new Uint8Array(ringRows * canonicalPlayfield.screenColumns);
  for (let row = 0; row < ringRows; row += 1) {
    const address = memory[lo + row] | memory[hi + row] << 8;
    screen.set(memory.subarray(address, address + canonicalPlayfield.screenColumns),
      row * canonicalPlayfield.screenColumns);
  }
  return screen;
}

function logicalDisplay(memory, labels) {
  const display = new Uint8Array((canonicalPlayfield.gameplayRows + 1) *
    canonicalPlayfield.screenColumns);
  display.set(memory.subarray(0x4000, 0x4050));
  display.set(logicalScreen(memory, labels), 80);
  return display;
}

export function initialiseRuntime(root, artifact, coldFill = 0) {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(root, "dist", "void-strike-65-manifest.json"), "utf8"));
  const labels = labelsFromFile(path.join(root, "build", "void-strike-65.lbl"));
  const memory = new Uint8Array(0x10000);
  memory.fill(coldFill);
  const { requiresBroadsideUnpack } = installBootArtifact(memory, root, artifact);
  if (requiresBroadsideUnpack) runRoutine(memory, labels, "unpack_boot_broadside_runtime");
  const pickupRuntime = fs.readFileSync(path.join(root, "build", "pickup-code-runtime.bin"));
  const completePickupRuntime = fs.readFileSync(path.join(root, "build", "weapon-pickup-phase-runtime.bin"));
  const packedPickupRuntime = fs.readFileSync(
    path.join(root, "build", "weapon-pickup-phase-runtime-packed.bin"));
  const pickupRunAddress = requiredLabel(labels, "__PICKUP_CODE_RUN__");
  for (const routine of [
    "stage_boot_streams", "unpack_resident_runtime",
    "unpack_entity_runtime", "stage_a2_kernel", "init_entity_effects",
    "unpack_weapon_pickup_phase_runtime", "unpack_starfield_runtime",
    "copy_charset", "copy_hud_charset", "init_fighter_projectiles",
    "install_entity_effects_glyph",
  ]) {
    try {
      runRoutine(memory, labels, routine);
      if (routine === "unpack_entity_runtime" && labels.has("publish_director_abi")) {
        runRoutine(memory, labels, "publish_director_abi");
      }
    } catch (error) {
      throw new Error(`${routine}: ${error.message}`);
    }
    if (routine === "stage_boot_streams") {
      const mismatch = memory.subarray(0x4801, 0x4801 + packedPickupRuntime.length)
        .findIndex((value, index) => value !== packedPickupRuntime[index]);
      if (mismatch !== -1) {
        throw new Error(`stage_boot_streams did not preserve pickup runtime at +$${mismatch.toString(16)}`);
      }
    }
    if (routine === "unpack_weapon_pickup_phase_runtime") {
      const completeMismatch = memory.subarray(manifest.entityEffects.pickupPhaseBankAddress,
        manifest.entityEffects.pickupPhaseBankAddress + completePickupRuntime.length)
        .findIndex((value, index) => value !== completePickupRuntime[index]);
      if (completeMismatch !== -1) {
        throw new Error(`pickup phase runtime unpack mismatch at +$${completeMismatch.toString(16)}`);
      }
    }
  }
  const pickupMismatch = memory.subarray(pickupRunAddress, pickupRunAddress + pickupRuntime.length)
    .findIndex((value, index) => value !== pickupRuntime[index]);
  if (pickupMismatch !== -1) {
    throw new Error(`cold startup changed pickup compositor at +$${pickupMismatch.toString(16)}`);
  }
  // The level image is in LEVEL_BUFFER from START GAME onwards on BOTH media:
  // the XEX carries it as a block, the ATR reads it over SIO before
  // start_gameplay runs (the boot smoke proves the bytes arrive byte-exact).
  // The harness starts after that read, so it must place the image the same
  // way for both artifacts, or the ATR path runs gameplay against cold RAM
  // where the gameplay music player and the level's hull block live.
  const levelOne = manifest.sectorReader?.levels?.find((level) => level.id === 1);
  if (levelOne) {
    memory.set(fs.readFileSync(path.join(root, "build", levelOne.file)),
      manifest.sectorReader.levelBuffer.address);
  }
  const glue = fs.readFileSync(path.join(root, "build", "integration-glue.bin"));
  memory.set(glue, manifest.integrationGlue.finalAddress);
  memory.fill(0, 0x80f4, 0x8100);
  memory[0x80fb] = 0x6d;
  memory[0x80fc] = 0xff;
  memory[0x80f6] = 3; // mixed-pressure policy admits all existing hazard types
  memory[0x80f9] = 0;
  memory[0x80fa] = 0;
  memory[0x80ff] = 0xff;
  initialiseRows(memory, labels);
  memory.fill(0, 0x3800, 0x4400);
  memory[requiredLabel(labels, "ENTITY_SPAWN_TIMER_LO")] = 0xff;
  memory[requiredLabel(labels, "DIFFICULTY_SETTING")] = 2;
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = playerMaximumY;
  memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = 0;
  memory[fixedStateAddress(labels, "BROAD_PLAYER_HEALTH")] = 10;
  memory[fixedStateAddress(labels, "PLAYER_LIVES")] = 3;
  memory[requiredLabel(labels, "gameplay_fire_gate")] = 1;
  memory[0xd010] = 1;
  return { memory, labels, manifest };
}

function countActive(memory, address, slots) {
  let count = 0;
  for (let slot = 0; slot < slots; slot += 1) if (memory[address + slot] !== 0) count += 1;
  return count;
}

function pickupSnapshot(memory, labels, manifest, fields = {}) {
  const slot = 1;
  const stateAddress = requiredLabel(labels, "ENTITY_STATE") + slot;
  const capsuleState = memory[stateAddress];
  const boosterState = memory[stateAddress + 1];
  const state = capsuleState === 0 ? boosterState : capsuleState;
  const screenAddress = memory[requiredLabel(labels, "ENTITY_SCREEN_LO") + slot] |
    memory[requiredLabel(labels, "ENTITY_SCREEN_HI") + slot] << 8;
  // The resident pickup follows the A2 ring without remapping its physical
  // cells. VX/VY are the authoritative saved bottom-row pointer; deriving it
  // from the advanced logical Y would inspect a different physical row.
  const bottomHigh = memory[requiredLabel(labels, "ENTITY_VY") + slot];
  const bottomScreenAddress = screenAddress === 0 || bottomHigh === 0 ? 0 :
    memory[requiredLabel(labels, "ENTITY_VX") + slot] | bottomHigh << 8;
  const thirdHigh = memory[requiredLabel(labels, "ENTITY_SCREEN_HI") + 3];
  const thirdScreenAddress = thirdHigh === 0 ? 0 :
    memory[requiredLabel(labels, "ENTITY_SCREEN_LO") + 3] | thirdHigh << 8;
  const timerLow = memory[requiredLabel(labels, "ENTITY_TIMER") +
    (boosterState === 0 ? slot : 2)];
  const timerHigh = memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2];
  const timer = boosterState >= 3 ? timerLow | timerHigh << 8 : timerLow;
  const pickupSlotValue = memory[requiredLabel(labels, "ENTITY_HP") + slot];
  const boosterSlotValue = memory[requiredLabel(labels, "ENTITY_HP") + 2];
  const slotValue = boosterState === 0 ? pickupSlotValue : boosterSlotValue;
  const pickupType = memory[requiredLabel(labels, "ENTITY_TYPE") + slot];
  const nextPickupType = memory[requiredLabel(labels, "ENTITY_TYPE") + 2];
  const subsecond = memory[requiredLabel(labels, "ENTITY_OWNER") +
    (boosterState === 0 ? slot : 2)];
  const hudOffset = labels.get("HUD_BOOSTER_OFFSET") ?? 30;
  const hudCells = labels.get("HUD_BOOSTER_CELLS") ?? 10;
  const hudSegmentsOffset = labels.get("HUD_BOOSTER_SEGMENTS_OFFSET") ?? 36;
  const hudSegments = labels.get("HUD_BOOSTER_SEGMENTS") ?? 4;
  const screenBase = labels.get("SCREEN") ?? 0x4000;
  const hudCodes = Array.from(memory.subarray(
    screenBase + hudSegmentsOffset, screenBase + hudSegmentsOffset + hudSegments,
  ));
  return {
    phase: fields.phase ?? "",
    frame: fields.frame ?? 0,
    kill: fields.kill ?? "",
    damageSource: fields.damageSource ?? "",
    projectileConsumed: fields.projectileConsumed ?? false,
    slotValue,
    qualifiedKillCounter: capsuleState === 0 ? pickupSlotValue : 0,
    rapidSeconds: 0,
    spreadSeconds: 0,
    capsuleState,
    boosterState,
    pickupType,
    nextPickupType,
    state,
    activeMask: memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")],
    activeCount: memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")],
    x: memory[requiredLabel(labels, "ENTITY_X") + slot],
    y: memory[requiredLabel(labels, "ENTITY_Y") + slot],
    timer,
    timerLow,
    timerHigh,
    subsecond,
    animationFrame: subsecond,
    hudCodes,
    hudRegionCodes: Array.from(memory.subarray(
      screenBase + hudOffset, screenBase + hudOffset + hudCells,
    )),
    renderId: memory[requiredLabel(labels, "ENTITY_RENDER_ID") + slot],
    a2Head: ((memory[requiredLabel(labels, "PLAYFIELD_ROW_LO")] |
      memory[requiredLabel(labels, "PLAYFIELD_ROW_HI")] << 8) - ringBase) /
      canonicalPlayfield.screenColumns,
    screenAddress,
    bottomScreenAddress,
    thirdScreenAddress,
    rasterPhase: (memory[requiredLabel(labels, "ENTITY_Y") + slot] - 24) & 7,
    leftCode: screenAddress === 0 ? 0 : memory[screenAddress],
    rightCode: screenAddress === 0 ? 0 : memory[screenAddress + 1],
    bottomLeftCode: bottomScreenAddress === 0 ? 0 : memory[bottomScreenAddress],
    bottomRightCode: bottomScreenAddress === 0 ? 0 : memory[bottomScreenAddress + 1],
    thirdLeftCode: thirdScreenAddress === 0 ? 0 : memory[thirdScreenAddress],
    thirdRightCode: thirdScreenAddress === 0 ? 0 : memory[thirdScreenAddress + 1],
    backing: [0, 1, 2, 3].map((index) =>
      memory[requiredLabel(labels, `ENTITY_BACKING${index}`) + slot]),
    thirdBacking: [
      memory[requiredLabel(labels, "ENTITY_BACKING0") + 3],
      memory[requiredLabel(labels, "ENTITY_BACKING1") + 3],
    ],
    drawnMask: memory[requiredLabel(labels, "ENTITY_DRAWN_MASK") + slot],
    effectActiveMask: memory[requiredLabel(labels, "EFFECT_ACTIVE_MASK")],
    effectActiveCount: memory[requiredLabel(labels, "EFFECT_ACTIVE_COUNT")],
    projectileActiveCount: countActive(memory,
      requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE"), 10),
    burstState: memory[requiredLabel(labels, "PLAYER_FIGHTER_BURST_STATE")],
    burstRemaining: memory[requiredLabel(labels, "PLAYER_FIGHTER_BURST_REMAINING")],
    burstTimer: memory[requiredLabel(labels, "PLAYER_FIGHTER_BURST_TIMER")],
    scoreLo: memory[requiredLabel(labels, "score_bcd_lo")],
    scoreHi: memory[requiredLabel(labels, "score_bcd_hi")],
    playerHealth: memory[fixedStateAddress(labels, "BROAD_PLAYER_HEALTH")],
    playerLives: memory[fixedStateAddress(labels, "PLAYER_LIVES")],
    glyphBase: manifest.entityEffects.weaponPickupGlyphIndex,
    screen: logicalScreen(memory, labels),
    display: logicalDisplay(memory, labels),
  };
}

function armLethalPlayerFighterShot(memory, labels, y = 109) {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  memory[active] = 1;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X")] = 127;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y")] = y;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y")] = y;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME")] = 10;
}

function killInterceptorWithPlayerFighter(memory, labels) {
  memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
  const memberState = requiredLabel(labels, "ENEMY_MEMBER_STATE");
  const hp = requiredLabel(labels, "ENEMY_HP");
  const pendingDamage = requiredLabel(labels, "ENEMY_PENDING_DAMAGE");
  const pendingSource = requiredLabel(labels, "ENEMY_PENDING_SOURCE");
  memory.fill(0, memberState, memberState + 2);
  memory.fill(0, hp, hp + 2);
  memory.fill(0, pendingDamage, pendingDamage + 2);
  memory.fill(5, pendingSource, pendingSource + 2);
  memory[memberState] = 1;
  memory[hp] = 1;
  memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENEMY_X")] = 124;
  memory[requiredLabel(labels, "ENEMY_Y")] = 40;
  armLethalPlayerFighterShot(memory, labels, 54);
  runRoutine(memory, labels, "update_fighter_projectiles");
  const damageSource = memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")];
  const projectileConsumed = memory[requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE")] === 0;
  runRoutine(memory, labels, "resolve_enemy_damage");
  return { damageSource, projectileConsumed };
}

function runBurst(memory, labels, { rapid, expectedCount, onFrame = () => {} }) {
  runRoutine(memory, labels, "clear_player_fighter_projectiles");
  const boosterState = memory[requiredLabel(labels, "ENTITY_STATE") + 2];
  if (rapid && boosterState !== 3) {
    throw new Error(`Rapid burst requires collected runtime state (state=${boosterState}, ` +
      `pickup=${memory[requiredLabel(labels, "ENTITY_STATE") + 1]}, ` +
      `pickupY=${memory[requiredLabel(labels, "ENTITY_Y") + 1]}, ` +
      `playerY=${memory[requiredLabel(labels, "player_y")]})`);
  }
  if (!rapid) memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 0;
  memory[0xd010] = 0;
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const emissions = [];
  for (let frame = 0; frame < 160 && emissions.length < expectedCount; frame += 1) {
    runRoutine(memory, labels, "update_player_fighter_weapon");
    const currentCount = countActive(memory, active, 10);
    if (currentCount > 0) {
      emissions.push(frame);
      // Isolate controller cadence from the independently tested active-pool
      // limit. The harness consumes only the accepted slot; it must not call
      // the production teardown that also resets the burst controller.
      memory.fill(0, active, active + 10);
    }
    if (rapid) runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
    onFrame({ frame, emitted: emissions.at(-1) === frame });
  }
  memory[0xd010] = 1;
  return emissions;
}

export function executeWeaponPickupTrace({
  root = defaultRoot, artifact = "xex", head = 0, coexistDebris = false,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  memory[requiredLabel(labels, "score_bcd_lo")] = 0;
  memory[requiredLabel(labels, "score_bcd_hi")] = 0;
  const records = [];

  for (let kill = 1; kill <= 3; kill += 1) {
    const result = killInterceptorWithPlayerFighter(memory, labels);
    records.push(pickupSnapshot(memory, labels, manifest, {
      phase: `KILL_${kill}`, frame: 0, kill,
      damageSource: result.damageSource, projectileConsumed: result.projectileConsumed,
    }));
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
    runRoutine(memory, labels, "entity_effects_update");
    if (kill === 3 && coexistDebris) runRoutine(memory, labels, "entity_spawn_debris");
  }

  let worldAccumulator = 0;
  // STAR_NEAR_PHASE is the second byte after exported ENEMY_PENDING_SOURCE:
  // GAMEPLAY_RESIDENT_END/STAR_RNG_STATE occupies the first byte.
  const nearPhaseAddress = requiredLabel(labels, "ENEMY_PENDING_SOURCE") + 2;
  let nearPhase = memory[nearPhaseAddress];
  const stepWorld = () => {
    worldAccumulator += 9;
    if (worldAccumulator < 20) return 0;
    worldAccumulator -= 20;
    return 1;
  };
  const publishWorldStep = (event) => {
    if (event !== 0) nearPhase = (nearPhase + 1) & 1;
    memory[nearPhaseAddress] = nearPhase;
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = event;
  };
  for (let frame = 0; frame < 30; frame += 1) {
    runRoutine(memory, labels, "entity_effects_erase");
    publishWorldStep(stepWorld());
    runRoutine(memory, labels, "entity_effects_update");
    renderEntityEffects(memory, labels);
    records.push(pickupSnapshot(memory, labels, manifest, { phase: "PENDING", frame }));
  }

  // Forty consecutive ACTIVE frames retain the original review duration. The
  // deterministic Interceptor is destroyed near the safe top, so native A2 motion
  // remains visible without reaching the despawn boundary before collection.
  for (let frame = 0; frame < 40; frame += 1) {
    runRoutine(memory, labels, "entity_effects_erase");
    publishWorldStep(stepWorld());
    runRoutine(memory, labels, "entity_effects_update");
    renderEntityEffects(memory, labels);
    records.push(pickupSnapshot(memory, labels, manifest, { phase: "ACTIVE", frame }));
  }

  const pickupX = memory[requiredLabel(labels, "ENTITY_X") + 1];
  const pickupY = memory[requiredLabel(labels, "ENTITY_Y") + 1];
  armLethalPlayerFighterShot(memory, labels);
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_X")] = pickupX;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_Y")] = pickupY + 6;
  memory[requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y")] = pickupY + 6;
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 0;
  runRoutine(memory, labels, "update_fighter_projectiles");
  records.push(pickupSnapshot(memory, labels, manifest,
    { phase: "PROJECTILE_IGNORED", frame: 0 }));
  runRoutine(memory, labels, "clear_player_fighter_projectiles");
  runRoutine(memory, labels, "entity_effects_erase");
  memory[requiredLabel(labels, "player_x")] = pickupX;
  memory[requiredLabel(labels, "player_y")] = pickupY;
  memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
  runRoutine(memory, labels, "entity_effects_update");
  renderEntityEffects(memory, labels);
  records.push(pickupSnapshot(memory, labels, manifest, { phase: "PICKUP", frame: 0 }));

  const rapidTimerFrames = [];
  const rapidBurstFrames = runBurst(memory, labels, {
    rapid: true,
    expectedCount: manifest.fighterWeapons.player_fighter.rapidFireBurstCount,
    onFrame: ({ frame, emitted }) => rapidTimerFrames.push(pickupSnapshot(
      memory, labels, manifest, { phase: "RAPID_TIMER", frame, projectileConsumed: emitted })),
  });
  const rapidAfterBurst = pickupSnapshot(memory, labels, manifest,
    { phase: "RAPID_BURST", frame: rapidBurstFrames.at(-1) });
  records.push(rapidAfterBurst);
  const frozenTimer = rapidAfterBurst.timer;
  const pauseFrames = [];
  for (let frame = 0; frame < 10; frame += 1) {
    pauseFrames.push(pickupSnapshot(memory, labels, manifest, { phase: "PAUSE", frame }));
  }
  records.push(pauseFrames.at(-1));
  let activeRapidFrames = rapidBurstFrames.at(-1) + 1;
  while (memory[requiredLabel(labels, "ENTITY_STATE") + 2] === 3) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
    rapidTimerFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "RAPID_TIMER", frame: activeRapidFrames }));
    activeRapidFrames += 1;
  }
  records.push(pickupSnapshot(memory, labels, manifest,
    { phase: "EXPIRED", frame: activeRapidFrames }));

  const normal = initialiseRuntime(root, artifact);
  const normalBurstFrames = runBurst(normal.memory, normal.labels, {
    rapid: false,
    expectedCount: normal.manifest.fighterWeapons.player_fighter.burstCount,
  });

  return {
    artifact,
    head,
    records,
    normalBurstFrames,
    rapidBurstFrames,
    rapidTimerFrames,
    pauseFrames,
    frozenTimer,
    activeRapidFrames,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    hudCharset: Uint8Array.from(memory.subarray(0x5000, 0x5400)),
    manifest,
  };
}

export function executeWeaponPickupTraversalTrace({
  root = defaultRoot, artifact = "xex", difficulty = 2,
} = {}) {
  const types = [
    ["rapid", 0, 120],
    ["spread", 1, 0xfc],
    ["shield", 2, 120],
  ];
  const traces = types.map(([name, pickupType, renderId]) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    memory[requiredLabel(labels, "DIFFICULTY_SETTING")] = difficulty;
    const slot = 1;
    const state = requiredLabel(labels, "ENTITY_STATE") + slot;
    const activeMask = requiredLabel(labels, "ENTITY_ACTIVE_MASK");
    const activeCount = requiredLabel(labels, "ENTITY_ACTIVE_COUNT");
    const frameEvents = requiredLabel(labels, "ENTITY_FRAME_EVENTS");
    const nearPhaseAddress = requiredLabel(labels, "ENEMY_PENDING_SOURCE") + 2;
    memory[requiredLabel(labels, "ENTITY_HP") + slot] = 2;
    memory[requiredLabel(labels, "ENTITY_TYPE") + 2] = pickupType;
    memory[requiredLabel(labels, "FIGHTER_EXPLOSION_X") + 1] = 124;
    memory[requiredLabel(labels, "FIGHTER_EXPLOSION_Y") + 1] = 136;
    runRoutine(memory, labels, "weapon_pickup_record_qualified_kill");
    const created = pickupSnapshot(memory, labels, manifest, { phase: "CREATED", frame: 0 });

    const pending = [];
    memory[nearPhaseAddress] = 0;
    for (let frame = 0; frame < 64 && memory[state] === 1; frame += 1) {
      memory[frameEvents] = 1;
      runRoutine(memory, labels, "update_weapon_pickup_active", { x: 1 });
      if (memory[state] === 1) {
        pending.push(pickupSnapshot(memory, labels, manifest, { phase: "PENDING", frame }));
      }
    }
    if (memory[state] !== 2) throw new Error(`${name} pickup did not activate`);
    runRoutine(memory, labels, "render_interactive_entity_overlays");

    const visible = [pickupSnapshot(memory, labels, manifest, { phase: "ACTIVE", frame: 0 })];
    let worldAccumulator = 0;
    let nearPhase = memory[nearPhaseAddress];
    for (let frame = 1; frame < 256 && memory[state] === 2; frame += 1) {
      runRoutine(memory, labels, "entity_effects_erase");
      worldAccumulator += 9;
      let event = 0;
      if (worldAccumulator >= 20) {
        worldAccumulator -= 20;
        event = 1;
        nearPhase = (nearPhase + 1) & 1;
      }
      memory[nearPhaseAddress] = nearPhase;
      memory[frameEvents] = event;
      runRoutine(memory, labels, "update_weapon_pickup_active", { x: 2 });
      if (memory[state] === 2) {
        renderEntityEffects(memory, labels);
        visible.push(pickupSnapshot(memory, labels, manifest, { phase: "ACTIVE", frame }));
      }
    }
    const released = pickupSnapshot(memory, labels, manifest, {
      phase: "RELEASED", frame: visible.length,
    });
    // This harness does not initialise the ring, so cells that already held
    // the render id before the capsule existed are boot-staging residue, not
    // footprints. Count only cells that gained the id after creation.
    const footprintCount = (snapshot) => [...snapshot.screen]
      .filter((code, index) => code === renderId && created.screen[index] !== renderId).length;
    return {
      name,
      pickupType,
      renderId,
      created,
      pending,
      visible,
      released,
      maximumLogicalSlots: Math.max(created.activeCount,
        ...pending.map(({ activeCount: count }) => count),
        ...visible.map(({ activeCount: count }) => count)),
      maximumVisualFootprints: Math.max(...visible.map(footprintCount)),
    };
  });
  return { artifact, difficulty, traces };
}

export function executeWeaponPickupRingWrapTrace({
  root = defaultRoot, artifact = "xex", difficulty = 2, wrapFramesAfterRelease = 66,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, 0);
  for (let address = 0x4028; address < 0x4050; address += 1) memory[address] = 1 + address % 100;
  for (let address = ringBase; address < ringEnd; address += 1) memory[address] = 1 + address % 100;
  const slot = 1;
  const state = requiredLabel(labels, "ENTITY_STATE") + slot;
  memory[state] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENTITY_TYPE") + slot] = 0;
  memory[requiredLabel(labels, "ENTITY_X") + slot] = 112;
  memory[requiredLabel(labels, "ENTITY_Y") + slot] = 24;
  memory[requiredLabel(labels, "ENTITY_RENDER_ID") + slot] = 120;
  memory[requiredLabel(labels, "DIFFICULTY_SETTING")] = difficulty;
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = playerMaximumY;

  const gameplayCells = () => [
    ...memory.subarray(0x4028, 0x4050),
    ...memory.subarray(ringBase, ringEnd),
  ];
  const capsuleCells = () => gameplayCells()
    .filter((code) => (code & 0x7f) >= 120 && (code & 0x7f) <= 125).length;
  const capsuleFootprints = () => gameplayCells()
    .filter((code) => code === 120).length;
  const records = [];
  let previous = null;
  for (let frame = 0; frame < 160 && memory[state] === 2; frame += 1) {
    let exactReverseErase = true;
    if (frame !== 0) {
      runRoutine(memory, labels, "entity_effects_erase");
      exactReverseErase = memory[previous.screenAddress] === previous.backing[0] &&
        memory[previous.screenAddress + 1] === previous.backing[1] &&
        (previous.bottomScreenAddress === 0 ||
          (memory[previous.bottomScreenAddress] === previous.backing[2] &&
            memory[previous.bottomScreenAddress + 1] === previous.backing[3])) &&
        (previous.thirdScreenAddress === 0 ||
          (memory[previous.thirdScreenAddress] === previous.thirdBacking[0] &&
            memory[previous.thirdScreenAddress + 1] === previous.thirdBacking[1]));
      if (capsuleCells() !== 0) exactReverseErase = false;
      runRoutine(memory, labels, "rotate_playfield_rows");
      runRoutine(memory, labels, "update_weapon_pickup_active", { x: 2 });
    }
    if (memory[state] === 2) {
      renderEntityEffects(memory, labels);
      previous = pickupSnapshot(memory, labels, manifest,
        { phase: "WRAP_ACTIVE", frame });
      records.push({
        ...previous,
        exactReverseErase,
        capsuleCells: capsuleCells(),
        capsuleFootprints: capsuleFootprints(),
        logicalSlots: memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")],
        finalDrawCalls: 1,
      });
    }
  }
  const releasedY = memory[requiredLabel(labels, "ENTITY_Y") + slot];
  const cellsAtRelease = capsuleCells();
  for (let frame = 0; frame < wrapFramesAfterRelease; frame += 1) {
    runRoutine(memory, labels, "rotate_playfield_rows");
  }
  return {
    artifact,
    records,
    releasedState: memory[state],
    releasedY,
    activeMask: memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")],
    activeCount: memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")],
    cellsAtRelease,
    cellsAfterAdditionalWraps: capsuleCells(),
    wrapCount: Math.floor((records.length - 1 + wrapFramesAfterRelease) / ringRows),
  };
}

export function executePlayerFighterBurstBalanceTrace({
  root = defaultRoot, artifact = "xex", coldFill = 0xa5, windowFrames = 80,
} = {}) {
  const modes = [
    ["NORMAL", 0],
    ["RAPID", 3],
    ["SPREAD", 4],
    ["SHIELD", 5],
  ];
  const traces = modes.map(([mode, boosterState]) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact, coldFill);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    const burstState = requiredLabel(labels, "PLAYER_FIGHTER_BURST_STATE");
    const burstRemaining = requiredLabel(labels, "PLAYER_FIGHTER_BURST_REMAINING");
    const burstTimer = requiredLabel(labels, "PLAYER_FIGHTER_BURST_TIMER");
    const booster = requiredLabel(labels, "ENTITY_STATE") + 2;
    memory[requiredLabel(labels, "player_x")] = 124;
    memory[requiredLabel(labels, "player_y")] = playerMaximumY;
    memory[booster] = boosterState;
    if (boosterState !== 0) {
      memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 0xf4;
      memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] = 1;
    }
    memory[0xd010] = 0;
    const records = [];
    let emittedProjectiles = 0;
    let emittedSalvos = 0;
    let maximumPoolOccupancy = 0;
    let firstBurstComplete = false;
    let firstBurstProjectiles = 0;
    let firstBurstSalvos = 0;
    let maximumWeaponPipelineCycles = 0;
    for (let frame = 0; frame < windowFrames; frame += 1) {
      const eraseCycles = runRoutine(memory, labels, "erase_fighter_projectile_overlays");
      const updateCycles = runRoutine(memory, labels, "update_fighter_projectiles");
      const before = Array.from(memory.subarray(active, active + 10));
      const stateBefore = memory[burstState];
      const remainingBefore = memory[burstRemaining];
      const timerBefore = memory[burstTimer];
      const controlCycles = runRoutine(memory, labels, "update_player_fighter_weapon");
      const after = Array.from(memory.subarray(active, active + 10));
      const allocatedSlots = after.flatMap((value, slot) =>
        before[slot] === 0 && value !== 0 ? [slot] : []);
      const allocatedProjectiles = allocatedSlots.length;
      const allocationDue = stateBefore === 0 ||
        (stateBefore === 1 && timerBefore <= 1) ||
        (stateBefore === 2 && timerBefore <= 1);
      if (allocatedProjectiles > 0) {
        emittedProjectiles += allocatedProjectiles;
        emittedSalvos += 1;
        if (!firstBurstComplete) {
          firstBurstProjectiles += allocatedProjectiles;
          firstBurstSalvos += 1;
        }
      }
      if (!firstBurstComplete && memory[burstState] === 2) firstBurstComplete = true;
      const activeCount = countActive(memory, active, 10);
      maximumPoolOccupancy = Math.max(maximumPoolOccupancy, activeCount);
      const renderCycles = runRoutine(memory, labels, "render_fighter_projectile_overlays");
      let boosterCycles = 0;
      if (boosterState !== 0) {
        boosterCycles = runRoutine(memory, labels, "update_weapon_booster_active",
          { x: boosterState });
      }
      const weaponPipelineCycles = eraseCycles + updateCycles + controlCycles +
        renderCycles + boosterCycles;
      maximumWeaponPipelineCycles = Math.max(maximumWeaponPipelineCycles,
        weaponPipelineCycles);
      records.push(player_fighterProjectileSnapshot(memory, labels, {
        mode,
        frame,
        stateBefore,
        stateAfter: memory[burstState],
        remainingBefore,
        remainingAfter: memory[burstRemaining],
        timerBefore,
        timerAfter: memory[burstTimer],
        allocationDue,
        allocatedSlots,
        allocatedProjectiles,
        activeCount,
        eraseCycles,
        updateCycles,
        controlCycles,
        renderCycles,
        boosterCycles,
        weaponPipelineCycles,
      }));
    }
    memory[0xd010] = 1;
    const expectedBurst = mode === "RAPID" ? manifest.fighterWeapons.player_fighter.rapidFireBurstCount :
      mode === "SPREAD" ? manifest.fighterWeapons.player_fighter.spreadShotBurstCount :
        manifest.fighterWeapons.player_fighter.burstCount;
    const intervalFrames = mode === "RAPID" ?
      manifest.fighterWeapons.player_fighter.rapidFireIntervalFrames : mode === "SPREAD" ?
        manifest.fighterWeapons.player_fighter.spreadShotCooldownFrames :
        manifest.fighterWeapons.player_fighter.burstIntervalFrames;
    return {
      mode,
      expectedBurst,
      intervalFrames,
      postBurstFrames: manifest.fighterWeapons.player_fighter.postBurstFrames,
      emittedProjectiles,
      emittedSalvos,
      maximumPoolOccupancy,
      firstBurstProjectiles,
      firstBurstSalvos,
      maximumWeaponPipelineCycles,
      records,
      charset: Array.from(memory.subarray(0x4400, 0x4800)),
    };
  });
  return {
    artifact,
    coldFill,
    windowFrames,
    traces,
    manifest: initialiseRuntime(root, artifact, coldFill).manifest,
  };
}

export function player_fighterBurstBalanceTraceCsv(trace) {
  const rows = [[
    "artifact", "mode", "frame", "state_before", "state_after",
    "remaining_before", "remaining_after", "timer_before", "timer_after",
    "allocation_due", "allocated_projectiles", "allocated_slots", "active_count",
  ].join(",")];
  for (const mode of trace.traces) {
    for (const record of mode.records) {
      rows.push([
        trace.artifact, mode.mode, record.frame, record.stateBefore, record.stateAfter,
        record.remainingBefore, record.remainingAfter, record.timerBefore, record.timerAfter,
        Number(record.allocationDue), record.allocatedProjectiles,
        record.allocatedSlots.join("|"), record.activeCount,
      ].join(","));
    }
  }
  return `${rows.join("\n")}\n`;
}

export function executePlayerFighterEmissionVisibilityTrace({
  root = defaultRoot, artifact = "xex", coldFill = 0,
  playerXs = [48, 50, 124, 126, 198, 200],
  playerYs = [184, 185, 190, 191], ringHeads = [0, 1, 26],
  modes = [["NORMAL", 0], ["RAPID", 3], ["SPREAD", 4]],
  raiderFire = false,
} = {}) {
  const cases = [];
  for (const [mode, boosterState] of modes) {
    for (const playerX of playerXs) {
      for (const playerY of playerYs) {
        for (const ringHead of ringHeads) {
          const { memory, labels } = initialiseRuntime(root, artifact, coldFill);
          initialiseRows(memory, labels, ringHead);
          memory.fill(0, 0x3800, 0x4400);
          memory[requiredLabel(labels, "player_x")] = playerX;
          memory[requiredLabel(labels, "player_y")] = playerY;
          memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = 0;
          memory[requiredLabel(labels, "gameplay_fire_gate")] = 1;
          memory[requiredLabel(labels, "ENTITY_STATE") + 2] = boosterState;
          if (raiderFire) {
            runRoutine(memory, labels, "reset_enemy");
            for (let slot = 0; slot < 2; slot += 1) {
              memory[requiredLabel(labels, "ENEMY_TARGET_SLOT")] = slot;
              runRoutine(memory, labels, "allocate_interceptor_projectile");
            }
          }
          memory[0xd010] = 1;
          runRoutine(memory, labels, "update_player_fighter_weapon");
          memory[0xd010] = 0;
          runRoutine(memory, labels, "erase_fighter_projectile_overlays");
          runRoutine(memory, labels, "update_fighter_projectiles");
          runRoutine(memory, labels, "update_player_fighter_weapon");
          runRoutine(memory, labels, "render_fighter_projectile_overlays");

          const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
          const xAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
          const yAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
          const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
          const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
          const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
          const slots = [];
          for (let slot = 0; slot < 10; slot += 1) {
            if (memory[active + slot] === 0) continue;
            const screenAddress = memory[screenLow + slot] |
              memory[screenHigh + slot] << 8;
            const screenCode = memory[screenAddress];
            const glyphAddress = 0x4400 + (screenCode & 0x7f) * 8;
            const glyphBytes = Array.from(memory.subarray(glyphAddress, glyphAddress + 8));
            slots.push({
              slot,
              renderId: memory[active + slot],
              x: memory[xAddress + slot],
              y: memory[yAddress + slot],
              rendered: memory[rendered + slot],
              screenAddress,
              screenCode,
              glyphBytes,
              visible: memory[rendered + slot] !== 0 && glyphBytes.some(Boolean),
            });
          }
          cases.push({
            mode, playerX, playerY, ringHead, slots,
            raiderProjectiles: countActive(memory, active + 10, 9),
          });
        }
      }
    }
  }
  return { artifact, coldFill, cases };
}

export function executePlayerFighterSectorClearVisibilityTrace({
  root = defaultRoot, artifact = "xex", coldFill = 0,
} = {}) {
  const { memory, labels } = initialiseRuntime(root, artifact, coldFill);
  memory.fill(0, ringBase, ringEnd);
  memory[requiredLabel(labels, "player_x")] = 124;
  memory[requiredLabel(labels, "player_y")] = 191;
  runRoutine(memory, labels, "allocate_player_fighter_projectile");
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const screenAddress = memory[screenLow] | memory[screenHigh] << 8;
  const capture = () => ({
    active: memory[active],
    rendered: memory[rendered],
    screenAddress,
    screenCode: memory[screenAddress],
  });
  const before = capture();
  memory[requiredLabel(labels, "ENTITY_STATE") + 1] = 1;
  runRoutine(memory, labels, "weapon_pickup_clear_sector");
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const after = capture();
  return { artifact, before, after };
}

export function executePlayerFighterProjectileColourTrace({
  root = defaultRoot, artifact = "xex", coldFill = 0,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact, coldFill);
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const xAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const yAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousYAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetimeAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  memory[0xd018] = manifest.fighterWeapons.player_fighter.colourValue;
  memory[0xd019] = manifest.fighterWeapons.interceptor.colourValue;
  const setProjectile = (slot, x) => {
    memory[xAddress + slot] = x;
    memory[yAddress + slot] = 100;
    memory[previousYAddress + slot] = 100;
    memory[lifetimeAddress + slot] = 10;
  };

  runRoutine(memory, labels, "allocate_player_fighter_projectile");
  const normalAtSpawn = memory[active];
  setProjectile(0, 100);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const normalDisplay = logicalDisplay(memory, labels);
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  runRoutine(memory, labels, "weapon_pickup_collect");
  const rapidTimerAtSpawn = memory[requiredLabel(labels, "ENTITY_TIMER") + 2] |
    memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] << 8;
  const normalAfterPickup = memory[active];
  const hudDuringRapid = Array.from(memory.subarray(0x4000 + 32, 0x4000 + 36));
  runRoutine(memory, labels, "allocate_player_fighter_projectile");
  const rapidAtSpawn = memory[active + 1];
  setProjectile(0, 100);
  setProjectile(1, 112);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const rapidDisplay = logicalDisplay(memory, labels);
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");

  memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 1;
  memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] = 0;
  memory[requiredLabel(labels, "ENTITY_OWNER") + 2] = 1;
  memory[requiredLabel(labels, "ENTITY_HP") + 2] = 17;
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  const rapidAfterExpiry = memory[active + 1];
  runRoutine(memory, labels, "allocate_player_fighter_projectile");
  const normalAfterExpiry = memory[active + 2];

  for (let slot = 0; slot < 3; slot += 1) setProjectile(slot, 100 + slot * 12);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const rendered = Array.from({ length: 3 }, (_, slot) => {
    const address = memory[screenLow + slot] | memory[screenHigh + slot] << 8;
    const code = memory[address];
    const glyphCode = code & 0x7f;
    const glyphBytes = Array.from(memory.subarray(0x4400 + glyphCode * 8,
      0x4400 + glyphCode * 8 + 8));
    return {
      slot,
      address,
      activeRenderId: memory[active + slot],
      screenCodeBefore: memory[requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP") + slot],
      code,
      screenCodeAfter: memory[address],
      glyphCode,
      inverse: code >> 7,
      colourRegister: code & 0x80 ? "COLPF3" : "COLPF2",
      colourValue: memory[code & 0x80 ? 0xd019 : 0xd018],
      glyphBytes,
      pixelPairs: glyphBytes.map((byte) =>
        [6, 4, 2, 0].map((shift) => byte >> shift & 3)),
    };
  });
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  memory.fill(0, active, active + 19);
  const interceptorSlot = 10;
  memory[active + interceptorSlot] = 2;
  setProjectile(interceptorSlot, 100);
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const interceptorAddress = memory[screenLow + interceptorSlot] | memory[screenHigh + interceptorSlot] << 8;
  const interceptorCode = memory[interceptorAddress];
  const interceptorRendered = {
    activeRenderId: memory[active + interceptorSlot],
    code: interceptorCode,
    glyphCode: interceptorCode & 0x7f,
    inverse: interceptorCode >> 7,
    colourRegister: interceptorCode & 0x80 ? "COLPF3" : "COLPF2",
    colourValue: memory[interceptorCode & 0x80 ? 0xd019 : 0xd018],
  };
  return {
    artifact,
    coldFill,
    normalAtSpawn,
    normalAfterPickup,
    rapidAtSpawn,
    rapidAfterExpiry,
    normalAfterExpiry,
    rapidTimerAtSpawn,
    a2Head: ((memory[requiredLabel(labels, "PLAYFIELD_ROW_LO")] |
      memory[requiredLabel(labels, "PLAYFIELD_ROW_HI")] << 8) - ringBase) /
      canonicalPlayfield.screenColumns,
    rendered,
    interceptorRendered,
    normalDisplay: Array.from(normalDisplay),
    rapidDisplay: Array.from(rapidDisplay),
    screen: logicalScreen(memory, labels),
    display: logicalDisplay(memory, labels),
    charset: Array.from(memory.subarray(0x4400, 0x4800)),
    hudCharset: Array.from(memory.subarray(0x5000, 0x5400)),
    hudDuringRapid,
    normalColour: manifest.fighterWeapons.player_fighter.colourValue,
    rapidColour: manifest.fighterWeapons.player_fighter.rapidFireColourValue,
    interceptorColour: manifest.fighterWeapons.interceptor.colourValue,
  };
}

export function executePlayerFighterProjectileColourLifecycleTrace({
  root = defaultRoot, artifact = "xex", coldFill = 0,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact, coldFill);
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const xAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const yAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousYAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetimeAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const boosterState = requiredLabel(labels, "ENTITY_STATE") + 2;
  const boosterTimerLow = requiredLabel(labels, "ENTITY_TIMER") + 2;
  const boosterTimerHigh = requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2;
  memory[0xd018] = manifest.fighterWeapons.player_fighter.colourValue;
  memory[0xd019] = manifest.fighterWeapons.interceptor.colourValue;

  const capturePlayerFighter = (phase) => {
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    runRoutine(memory, labels, "clear_player_fighter_projectiles");
    runRoutine(memory, labels, "allocate_player_fighter_projectile");
    const slots = [];
    for (let slot = 0; slot < 10; slot += 1) {
      if (memory[active + slot] === 0) continue;
      memory[xAddress + slot] = 88 + slot * 12;
      memory[yAddress + slot] = 100;
      memory[previousYAddress + slot] = 100;
      memory[lifetimeAddress + slot] = 10;
      slots.push(slot);
    }
    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    const projectiles = slots.map((slot) => {
      const address = memory[screenLow + slot] | memory[screenHigh + slot] << 8;
      const screenCode = memory[address];
      const registerAddress = screenCode & 0x80 ? 0xd019 : 0xd018;
      return {
        slot,
        activeRenderId: memory[active + slot],
        address,
        screenCode,
        glyphCode: screenCode & 0x7f,
        inverse: screenCode >> 7,
        colourRegister: registerAddress === 0xd018 ? "COLPF2" : "COLPF3",
        colourValue: memory[registerAddress],
      };
    });
    const result = {
      phase,
      boosterState: memory[boosterState],
      projectiles,
      display: Array.from(logicalDisplay(memory, labels)),
    };
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    return result;
  };

  const captures = [];
  memory[boosterState] = 0;
  captures.push(capturePlayerFighter("NORMAL"));
  memory[boosterState] = 3;
  captures.push(capturePlayerFighter("RAPID"));
  memory[boosterState] = 4;
  captures.push(capturePlayerFighter("SPREAD"));

  memory[boosterState] = 3;
  captures.push(capturePlayerFighter("PAUSE_BEFORE"));
  captures.push(capturePlayerFighter("PAUSE_RESUME"));

  memory[boosterState] = 4;
  runRoutine(memory, labels, "weapon_pickup_clear_sector");
  captures.push(capturePlayerFighter("SECTOR_TRANSITION"));

  memory[boosterState] = 3;
  memory[boosterTimerLow] = 1;
  memory[boosterTimerHigh] = 0;
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  captures.push(capturePlayerFighter("RAPID_EXPIRED"));

  memory[boosterState] = 4;
  memory[boosterTimerLow] = 1;
  memory[boosterTimerHigh] = 0;
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 4 });
  captures.push(capturePlayerFighter("SPREAD_EXPIRED"));

  memory[boosterState] = 3;
  runRoutine(memory, labels, "weapon_pickup_clear_lifecycle");
  captures.push(capturePlayerFighter("LIFE_LOSS"));

  memory[boosterState] = 4;
  runRoutine(memory, labels, "init_entity_effects");
  captures.push(capturePlayerFighter("NEW_GAME"));

  runRoutine(memory, labels, "clear_player_fighter_projectiles");
  const interceptorSlot = 10;
  memory[active + interceptorSlot] = 2;
  memory[xAddress + interceptorSlot] = 124;
  memory[yAddress + interceptorSlot] = 100;
  memory[previousYAddress + interceptorSlot] = 100;
  memory[lifetimeAddress + interceptorSlot] = 10;
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const interceptorAddress = memory[screenLow + interceptorSlot] |
    memory[screenHigh + interceptorSlot] << 8;
  const interceptorScreenCode = memory[interceptorAddress];
  const interceptorDisplay = Array.from(logicalDisplay(memory, labels));

  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  memory.fill(0, active, active + 19);
  memory[active] = 1;
  memory[xAddress] = 96;
  memory[yAddress] = 100;
  memory[previousYAddress] = 100;
  memory[lifetimeAddress] = 10;
  memory[active + interceptorSlot] = 2;
  memory[xAddress + interceptorSlot] = 132;
  memory[yAddress + interceptorSlot] = 100;
  memory[previousYAddress + interceptorSlot] = 100;
  memory[lifetimeAddress + interceptorSlot] = 10;
  runRoutine(memory, labels, "render_fighter_projectile_overlays");

  return {
    artifact,
    coldFill,
    captures,
    interceptor: {
      activeRenderId: memory[active + interceptorSlot],
      address: interceptorAddress,
      screenCode: interceptorScreenCode,
      glyphCode: interceptorScreenCode & 0x7f,
      inverse: interceptorScreenCode >> 7,
      colourRegister: interceptorScreenCode & 0x80 ? "COLPF3" : "COLPF2",
      colourValue: memory[interceptorScreenCode & 0x80 ? 0xd019 : 0xd018],
      display: interceptorDisplay,
    },
    mixedDisplay: Array.from(logicalDisplay(memory, labels)),
    charset: Array.from(memory.subarray(0x4400, 0x4800)),
    manifest,
    palette: {
      COLPF2: memory[0xd018],
      COLPF3: memory[0xd019],
    },
  };
}

export function executeWeaponPickupBackingTrace({
  root = defaultRoot, artifact = "xex", head = 0, pickupType = "rapid", y = 104,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  const slot = 1;
  if (!new Set(["rapid", "spread", "shield"]).has(pickupType)) {
    throw new Error(`Unknown weapon pickup type ${pickupType}`);
  }
  const pickupTypeId = { rapid: 0, spread: 1, shield: 2 }[pickupType];
  const renderId = pickupType === "rapid" ?
    manifest.entityEffects.weaponPickupGlyphIndex :
    manifest.entityEffects.spreadPickupGlyphIndex |
      (pickupType === "spread" ? 0x80 : 0);
  memory[requiredLabel(labels, "ENTITY_STATE") + slot] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
  memory[requiredLabel(labels, "ENTITY_X") + slot] = 112;
  memory[requiredLabel(labels, "ENTITY_Y") + slot] = y;
  memory[requiredLabel(labels, "ENTITY_TYPE") + slot] = pickupTypeId;
  memory[requiredLabel(labels, "ENTITY_RENDER_ID") + slot] = renderId;

  const rowLow = requiredLabel(labels, "PLAYFIELD_ROW_LO");
  const rowHigh = requiredLabel(labels, "PLAYFIELD_ROW_HI");
  const logicalTopRow = Math.floor((y - 24) / 8);
  const column = Math.floor((112 - 48 + 2) / 4);
  const addressForRow = (logicalRow) =>
    (memory[rowLow + logicalRow] | memory[rowHigh + logicalRow] << 8) + column;
  const top = addressForRow(logicalTopRow);
  const bottom = addressForRow(logicalTopRow + 1);
  const hasThirdRow = ((y - 24) & 7) !== 0 && logicalTopRow < 20;
  const third = hasThirdRow ? addressForRow(logicalTopRow + 2) : 0;
  const original = hasThirdRow ? [0x0a, 0x1b, 0x2c, 0x3d, 0x4e, 0x5f] :
    [0x0a, 0x1b, 0x2c, 0x3d];
  memory[top] = original[0];
  memory[top + 1] = original[1];
  memory[bottom] = original[2];
  memory[bottom + 1] = original[3];
  if (hasThirdRow) {
    memory[third] = original[4];
    memory[third + 1] = original[5];
  }

  renderEntityEffects(memory, labels);
  const rendered = pickupSnapshot(memory, labels, manifest, { phase: "BACKED", frame: 0 });
  runRoutine(memory, labels, "weapon_pickup_release_active_mask");
  return {
    artifact,
    head,
    top,
    bottom,
    third,
    hasThirdRow,
    original,
    rendered,
    restored: [memory[top], memory[top + 1], memory[bottom], memory[bottom + 1],
      ...(hasThirdRow ? [memory[third], memory[third + 1]] : [])],
    drawnMaskAfterErase: memory[requiredLabel(labels, "ENTITY_DRAWN_MASK") + slot],
    renderedMaskAfterErase: memory[requiredLabel(labels, "ENTITY_RENDERED_MASK")],
    topLatchAfterErase: memory[requiredLabel(labels, "ENTITY_SCREEN_HI") + slot],
    charset: Array.from(memory.subarray(0x4400, 0x4800)),
    hudCharset: Array.from(memory.subarray(0x5000, 0x5400)),
  };
}

export function executeWeaponPickupCollisionTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const cases = Array.from({ length: 8 }, (_, phase) => {
    const pickupY = 104 + phase;
    return [
      [`phase_${phase}_side`, 112, pickupY, true, pickupY],
      [`phase_${phase}_nose`, 119, pickupY + 15, true, pickupY],
      [`phase_${phase}_rear`, 105, pickupY - 14, true, pickupY],
      [`phase_${phase}_left_outside`, 104, pickupY, false, pickupY],
      [`phase_${phase}_right_outside`, 120, pickupY, false, pickupY],
      [`phase_${phase}_above_overlap`, 112, pickupY - 14, true, pickupY],
      [`phase_${phase}_above_outside`, 112, pickupY - 15, false, pickupY],
      [`phase_${phase}_below_outside`, 112, pickupY + 16, false, pickupY],
    ];
  }).flat();
  return cases.map(([name, playerX, playerY, hit, pickupY]) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    const slot = 1;
    memory[requiredLabel(labels, "ENTITY_STATE") + slot] = 2;
    memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
    memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
    memory[requiredLabel(labels, "ENTITY_X") + slot] = 112;
    memory[requiredLabel(labels, "ENTITY_Y") + slot] = pickupY;
    memory[requiredLabel(labels, "player_x")] = playerX;
    memory[requiredLabel(labels, "player_y")] = playerY;
    runRoutine(memory, labels, "weapon_pickup_collide_player");
    const snapshot = pickupSnapshot(memory, labels, manifest, { phase: name, frame: 0 });
    return { name, playerX, playerY, pickupY, expectedHit: hit,
      collected: snapshot.state >= 3, snapshot };
  });
}

export function executeWeaponPickupCauseTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const results = [];
  for (const source of [1, 2, 3, 4, 5]) {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    memory[requiredLabel(labels, "ENTITY_HP") + 1] = 1;
    memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
    memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
    memory[requiredLabel(labels, "ENEMY_MEMBER_STATE")] = 1;
    memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 1;
    memory[requiredLabel(labels, "ENEMY_HP")] = 1;
    memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 1;
    memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = source;
    memory[requiredLabel(labels, "ENEMY_X")] = 124;
    memory[requiredLabel(labels, "ENEMY_Y")] = 95;
    runRoutine(memory, labels, "resolve_enemy_damage");
    const first = pickupSnapshot(memory, labels, manifest,
      { phase: "CAUSE", frame: 0, damageSource: source });
    runRoutine(memory, labels, "resolve_enemy_damage");
    const second = pickupSnapshot(memory, labels, manifest,
      { phase: "CAUSE_REPEAT", frame: 1, damageSource: source });
    results.push({ source, first, second });
  }
  return results;
}

export function executeWeaponPickupLifecycleTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const runCase = (name, state, routines, { active = false, counter = 0, lifecycle = 0 } = {}) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact);
    const controllerSlot = state >= 3 ? 2 : 1;
    memory[requiredLabel(labels, "ENTITY_STATE") + controllerSlot] = state;
    memory[requiredLabel(labels, "ENTITY_HP") + controllerSlot] = state >= 3 ? 26 : counter;
    memory[requiredLabel(labels, "ENTITY_TIMER") + controllerSlot] = state === 5 ? 0xfa : 0xf4;
    memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + controllerSlot] = state === 5 ? 0 : 1;
    memory[requiredLabel(labels, "ENTITY_OWNER") + controllerSlot] = 50;
    memory[requiredLabel(labels, "PLAYER_LIFECYCLE")] = lifecycle;
    if (state >= 3) {
      runRoutine(memory, labels, "backup_weapon_booster_hud");
      runRoutine(memory, labels, "show_weapon_booster_hud");
    }
    if (active) {
      memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 2;
      memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
    }
    for (const routine of Array.isArray(routines) ? routines : [routines]) {
      runRoutine(memory, labels, routine);
    }
    return pickupSnapshot(memory, labels, manifest, { phase: name, frame: 0 });
  };
  return {
    newGame: runCase("NEW_GAME", 3, ["clear_screen", "init_entity_effects"], { counter: 2 }),
    lifeLoss: runCase("LIFE_LOSS", 3, "clear_transient_effects", { lifecycle: 1 }),
    gameOver: runCase("GAME_OVER", 2, "clear_transient_effects",
      { active: true, lifecycle: 1 }),
    sectorPending: runCase("SECTOR_PENDING", 1, "entity_begin_sector_complete"),
    sectorActive: runCase("SECTOR_ACTIVE", 2, "entity_begin_sector_complete", { active: true }),
    sectorRapid: runCase("SECTOR_RAPID", 3, "entity_begin_sector_complete"),
    newGameSpread: runCase("NEW_GAME_SPREAD", 4, ["clear_screen", "init_entity_effects"]),
    lifeLossSpread: runCase("LIFE_LOSS_SPREAD", 4, "clear_transient_effects", { lifecycle: 1 }),
    gameOverSpread: runCase("GAME_OVER_SPREAD", 4, "clear_transient_effects", { lifecycle: 1 }),
    sectorSpread: runCase("SECTOR_SPREAD", 4, "entity_begin_sector_complete"),
    newGameShield: runCase("NEW_GAME_SHIELD", 5, ["clear_screen", "init_entity_effects"]),
    lifeLossShield: runCase("LIFE_LOSS_SHIELD", 5, "clear_transient_effects", { lifecycle: 1 }),
    gameOverShield: runCase("GAME_OVER_SHIELD", 5, "clear_transient_effects", { lifecycle: 1 }),
    sectorShield: runCase("SECTOR_SHIELD", 5, "entity_begin_sector_complete"),
  };
}

export function executeWeaponBoosterHudTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  const screen = labels.get("SCREEN") ?? 0x4000;
  const hudOffset = labels.get("HUD_BOOSTER_OFFSET") ?? 30;
  const hudCells = requiredLabel(labels, "HUD_BOOSTER_CELLS");
  const hudSegmentsOffset = requiredLabel(labels, "HUD_BOOSTER_SEGMENTS_OFFSET");
  const hudSegments = requiredLabel(labels, "HUD_BOOSTER_SEGMENTS");
  const timerLow = requiredLabel(labels, "ENTITY_TIMER") + 2;
  const timerHigh = requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2;
  const boosterState = requiredLabel(labels, "ENTITY_STATE") + 2;
  const pickupState = requiredLabel(labels, "ENTITY_STATE") + 1;
  const pickupType = requiredLabel(labels, "ENTITY_TYPE") + 1;
  const fullCode = requiredLabel(labels, "CH_HUD_BOOSTER_FULL");
  const originalHud = Array.from({ length: hudCells }, (_, index) => 0x2a + index);
  memory.set(originalHud, screen + hudOffset);
  const screenBefore = Uint8Array.from(memory.subarray(screen, screen + 0x400));
  memory[pickupState] = 2;
  memory[pickupType] = 0;
  runRoutine(memory, labels, "weapon_pickup_collect");
  const screenAfterActivation = Uint8Array.from(memory.subarray(screen, screen + 0x400));
  const snapshot = (name) => ({
    name,
    state: memory[boosterState],
    timer: memory[timerLow] | memory[timerHigh] << 8,
    hudCodes: Array.from(memory.subarray(
      screen + hudSegmentsOffset, screen + hudSegmentsOffset + hudSegments,
    )),
    hudRegionCodes: Array.from(memory.subarray(
      screen + hudOffset, screen + hudOffset + hudCells,
    )),
  });
  const samples = [snapshot("100%")];
  const wanted = new Map([
    [380, "76%"], [375, "75%"], [255, "51%"], [250, "50%"],
    [130, "26%"], [125, "25%"], [124, "below-25-visible"],
    [120, "blink-visible"], [119, "blink-hidden-boundary"], [112, "blink-hidden"],
  ]);
  while ((memory[timerLow] | memory[timerHigh] << 8) > 112) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
    const timer = memory[timerLow] | memory[timerHigh] << 8;
    if (wanted.has(timer)) samples.push(snapshot(wanted.get(timer)));
  }
  const paused = Array.from({ length: 16 }, (_, frame) => ({ frame, ...snapshot("pause") }));
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  samples.push(snapshot("blink-visible-resumed"));

  const backingBeforeRefresh = Array.from(memory.subarray(
    requiredLabel(labels, "hud_booster_backing"),
    requiredLabel(labels, "hud_booster_backing") + hudCells,
  ));
  memory[pickupState] = 2;
  memory[pickupType] = 1;
  runRoutine(memory, labels, "weapon_pickup_collect");
  const refreshed = snapshot("refreshed-as-spread");
  const backingAfterRefresh = Array.from(memory.subarray(
    requiredLabel(labels, "hud_booster_backing"),
    requiredLabel(labels, "hud_booster_backing") + hudCells,
  ));
  memory[timerLow] = 1;
  memory[timerHigh] = 0;
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 4 });
  const expired = snapshot("expired");
  const changedScreenOffsets = Array.from({ length: 0x400 }, (_, offset) => offset)
    .filter((offset) => screenBefore[offset] !== screenAfterActivation[offset]);
  return {
    artifact,
    manifest,
    hudOffset,
    hudCells,
    hudSegmentsOffset,
    hudSegments,
    fullCode,
    fullGlyph: Array.from(memory.subarray(
      0x5000 + (fullCode & 0x7f) * 8,
      0x5000 + (fullCode & 0x7f) * 8 + 8,
    )),
    originalHud,
    activation: samples[0],
    samples,
    paused,
    resumed: samples.at(-1),
    refreshed,
    expired,
    backingBeforeRefresh,
    backingAfterRefresh,
    changedScreenOffsets,
  };
}

export function executeHudPresentationTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  const screen = labels.get("SCREEN") ?? 0x4000;
  const health = fixedStateAddress(labels, "BROAD_PLAYER_HEALTH");
  const timerLow = requiredLabel(labels, "ENTITY_TIMER") + 2;
  const timerHigh = requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2;
  const boosterState = requiredLabel(labels, "ENTITY_STATE") + 2;
  const hullOffset = requiredLabel(labels, "HUD_HULL_SEGMENTS_OFFSET");
  const hullSegments = requiredLabel(labels, "HUD_HULL_SEGMENTS");
  const boosterOffset = requiredLabel(labels, "HUD_BOOSTER_OFFSET");
  const boosterCells = requiredLabel(labels, "HUD_BOOSTER_CELLS");
  const boosterSegmentsOffset = requiredLabel(labels, "HUD_BOOSTER_SEGMENTS_OFFSET");
  const boosterSegments = requiredLabel(labels, "HUD_BOOSTER_SEGMENTS");
  const hullFullCode = requiredLabel(labels, "CH_HUD_HULL_FULL");
  const hullDamagedCode = requiredLabel(labels, "CH_HUD_HULL_DAMAGED");
  const boosterFullCode = requiredLabel(labels, "CH_HUD_BOOSTER_FULL");

  runRoutine(memory, labels, "init_screen");
  runRoutine(memory, labels, "update_score_display");
  runRoutine(memory, labels, "update_hud_status");
  const snapshot = (name) => ({
    name,
    timer: memory[timerLow] | memory[timerHigh] << 8,
    boosterState: memory[boosterState],
    health: memory[health],
    display: Array.from(memory.subarray(screen, screen + 40)),
    hullCodes: Array.from(memory.subarray(
      screen + hullOffset, screen + hullOffset + hullSegments,
    )),
    boosterCodes: Array.from(memory.subarray(
      screen + boosterOffset, screen + boosterOffset + boosterCells,
    )),
    boosterSegmentCodes: Array.from(memory.subarray(
      screen + boosterSegmentsOffset, screen + boosterSegmentsOffset + boosterSegments,
    )),
  });

  const frames = [snapshot("full-hull-no-booster")];
  runRoutine(memory, labels, "backup_weapon_booster_hud");
  memory[boosterState] = 3;
  memory[timerLow] = 0xf4;
  memory[timerHigh] = 1;
  runRoutine(memory, labels, "show_weapon_booster_hud");
  frames.push(snapshot("full-hull-full-boost"));

  memory[health] = 7;
  runRoutine(memory, labels, "update_hud_status");
  while ((memory[timerLow] | memory[timerHigh] << 8) > 250) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  }
  frames.push(snapshot("partial-hull-half-boost"));

  memory[health] = 1;
  runRoutine(memory, labels, "update_hud_status");
  while ((memory[timerLow] | memory[timerHigh] << 8) > 111) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  }
  frames.push(snapshot("critical-hull-blinking-boost"));

  memory[timerLow] = 1;
  memory[timerHigh] = 0;
  runRoutine(memory, labels, "update_weapon_booster_active", { x: 3 });
  const lifecycleDisplays = [{
    name: "booster-expired",
    display: Array.from(memory.subarray(screen, screen + 40)),
  }];
  runRoutine(memory, labels, "init_screen");
  runRoutine(memory, labels, "update_score_display");
  runRoutine(memory, labels, "update_hud_status");
  lifecycleDisplays.push({
    name: "new-game-layout",
    display: Array.from(memory.subarray(screen, screen + 40)),
  });
  memory[health] = 10;
  runRoutine(memory, labels, "update_hud_status");
  lifecycleDisplays.push({
    name: "respawn-full-hull",
    display: Array.from(memory.subarray(screen, screen + 40)),
  });

  const glyph = (code) => Array.from(memory.subarray(
    0x5000 + code * 8, 0x5000 + code * 8 + 8,
  ));
  return {
    artifact,
    manifest,
    frames,
    lifecycleDisplays,
    hudCharset: Array.from(memory.subarray(0x5000, 0x5400)),
    hullOffset,
    hullSegments,
    boosterOffset,
    boosterCells,
    boosterSegmentsOffset,
    boosterSegments,
    hullFullCode,
    hullDamagedCode,
    boosterFullCode,
    hullFullGlyph: glyph(hullFullCode),
    hullDamagedGlyph: glyph(hullDamagedCode),
    boosterFullGlyph: glyph(boosterFullCode),
  };
}

function player_fighterProjectileSnapshot(memory, labels, fields = {}) {
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const x = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const y = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  return {
    ...fields,
    slots: Array.from({ length: 10 }, (_, slot) => ({
      slot,
      active: memory[active + slot],
      x: memory[x + slot],
      y: memory[y + slot],
      rendered: memory[rendered + slot],
      screenAddress: memory[screenLow + slot] | memory[screenHigh + slot] << 8,
    })),
    screen: logicalScreen(memory, labels),
    display: logicalDisplay(memory, labels),
  };
}

function advanceWeaponPickupToActive(memory, labels, frames = []) {
  // This focused pickup harness begins at a scheduler-approved reveal window.
  // The production director owns these gates; leaving the reaction window from
  // the preceding admission live would test policy cadence instead of the
  // capsule lifecycle asserted by the legacy trace.
  memory[0x80f9] = 0;
  memory[0x80fa] = 0;
  memory[0x80ff] = (memory[requiredLabel(labels, "frame_counter")] - 1) & 0xff;
  for (let frame = 0; frame <= 30; frame += 1) {
    memory[requiredLabel(labels, "frame_counter")] += 1;
    runRoutine(memory, labels, "entity_effects_erase");
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
    runRoutine(memory, labels, "entity_effects_update");
    renderEntityEffects(memory, labels);
    frames.push(frame);
  }
}

function collectVisibleWeaponPickup(memory, labels) {
  const slot = 1;
  memory[requiredLabel(labels, "player_x")] =
    memory[requiredLabel(labels, "ENTITY_X") + slot];
  memory[requiredLabel(labels, "player_y")] =
    memory[requiredLabel(labels, "ENTITY_Y") + slot];
  memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
  memory[requiredLabel(labels, "frame_counter")] += 1;
  runRoutine(memory, labels, "entity_effects_update");
  memory[requiredLabel(labels, "player_x")] = 196;
  memory[requiredLabel(labels, "player_y")] = playerMaximumY;
}

export function executeSpreadShotTrace({
  root = defaultRoot, artifact = "xex", head = 0,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  initialiseRows(memory, labels, head);
  const initialCharset = Uint8Array.from(memory.subarray(0x4400, 0x4800));
  const drops = [];
  const killRecords = [];
  const triggerDrop = (cycle) => {
    for (let kill = 1; kill <= 3; kill += 1) {
      const result = killInterceptorWithPlayerFighter(memory, labels);
      memory[requiredLabel(labels, "frame_counter")] += 1;
      memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = 0;
      runRoutine(memory, labels, "entity_effects_update");
      killRecords.push(pickupSnapshot(memory, labels, manifest, {
        phase: `CYCLE_${cycle}_KILL_${kill}`, frame: 0, kill,
        damageSource: result.damageSource, projectileConsumed: result.projectileConsumed,
      }));
    }
    const drop = pickupSnapshot(memory, labels, manifest,
      { phase: `DROP_${cycle}`, frame: 0 });
    drops.push(drop);
    return drop;
  };

  triggerDrop(1);
  advanceWeaponPickupToActive(memory, labels);
  renderEntityEffects(memory, labels);
  const rapidCapsule = pickupSnapshot(memory, labels, manifest,
    { phase: "RAPID_CAPSULE", frame: 0 });
  collectVisibleWeaponPickup(memory, labels);
  const rapidPickup = pickupSnapshot(memory, labels, manifest,
    { phase: "RAPID_PICKUP", frame: 0 });
  runRoutine(memory, labels, "weapon_pickup_release");

  triggerDrop(2);
  advanceWeaponPickupToActive(memory, labels);
  const spreadCapsuleFrames = [];
  let capsuleHead = head;
  for (let frame = 0; frame < 8; frame += 1) {
    memory[requiredLabel(labels, "frame_counter")] += 1;
    runRoutine(memory, labels, "entity_effects_erase");
    const nearRowAdvanced = frame % 2;
    if (nearRowAdvanced) {
      capsuleHead = (capsuleHead + ringRows - 1) % ringRows;
      initialiseRows(memory, labels, capsuleHead);
    }
    memory[requiredLabel(labels, "ENTITY_FRAME_EVENTS")] = nearRowAdvanced;
    memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE") + 2] = nearRowAdvanced ? 0 : 1;
    runRoutine(memory, labels, "entity_effects_update");
    renderEntityEffects(memory, labels);
    spreadCapsuleFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "SPREAD_CAPSULE", frame }));
  }
  collectVisibleWeaponPickup(memory, labels);
  const spreadPickup = pickupSnapshot(memory, labels, manifest,
    { phase: "SPREAD_PICKUP", frame: 0 });

  memory[requiredLabel(labels, "player_x")] = 124;
  memory[requiredLabel(labels, "player_y")] = playerMaximumY;
  runRoutine(memory, labels, "clear_player_fighter_projectiles");
  runRoutine(memory, labels, "allocate_player_fighter_projectile");
  const trajectoryFrames = [player_fighterProjectileSnapshot(memory, labels,
    { phase: "SPREAD_VOLLEY", frame: 0 })];
  const spreadTimerFrames = [];
  for (let frame = 0; frame < 51; frame += 1) {
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    runRoutine(memory, labels, "update_fighter_projectiles");
    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 4 });
    if (frame < 8) trajectoryFrames.push(player_fighterProjectileSnapshot(memory, labels,
      { phase: "SPREAD_VOLLEY", frame: frame + 1 }));
    spreadTimerFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "SPREAD_TIMER", frame }));
  }
  const projectilesAfterCleanup = player_fighterProjectileSnapshot(memory, labels,
    { phase: "SPREAD_CLEAN", frame: 51 });
  const frozenTimer = spreadTimerFrames.at(-1).timer;
  const pauseFrames = Array.from({ length: 10 }, (_, frame) =>
    pickupSnapshot(memory, labels, manifest, { phase: "SPREAD_PAUSE", frame }));
  for (let frame = 51; frame < 500; frame += 1) {
    runRoutine(memory, labels, "update_weapon_booster_active", { x: 4 });
    spreadTimerFrames.push(pickupSnapshot(memory, labels, manifest,
      { phase: "SPREAD_TIMER", frame }));
  }
  const spreadExpired = pickupSnapshot(memory, labels, manifest,
    { phase: "SPREAD_EXPIRED", frame: 500 });
  triggerDrop(3);

  return {
    artifact,
    head,
    drops,
    killRecords,
    rapidCapsule,
    rapidPickup,
    spreadCapsuleFrames,
    spreadPickup,
    trajectoryFrames,
    spreadTimerFrames,
    pauseFrames,
    frozenTimer,
    spreadExpired,
    projectilesAfterCleanup,
    initialCharset,
    charset: Uint8Array.from(memory.subarray(0x4400, 0x4800)),
    hudCharset: Uint8Array.from(memory.subarray(0x5000, 0x5400)),
    manifest,
  };
}

export function executeSpreadShotPoolTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const runCase = (occupied) => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    for (let slot = 0; slot < occupied; slot += 1) memory[active + slot] = 1;
    const before = Array.from(memory.subarray(active, active + 10));
    runRoutine(memory, labels, "allocate_player_fighter_projectile");
    const after = Array.from(memory.subarray(active, active + 10));
    return {
      occupied,
      before,
      after,
      activeCount: after.filter(Boolean).length,
      projectiles: player_fighterProjectileSnapshot(memory, labels).slots,
    };
  };
  return {
    artifact,
    empty: runCase(0),
    threeOccupied: runCase(3),
    fourOccupied: runCase(4),
    fiveOccupied: runCase(5),
    activeFull: runCase(6),
    physicalFull: runCase(10),
  };
}

export function executeSpreadShotCooldownSafetyTrace({
  root = defaultRoot, artifact = "xex", frames = 500,
} = {}) {
  const runCandidate = (cooldown) => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    memory[requiredLabel(labels, "player_x")] = 124;
    memory[requiredLabel(labels, "player_y")] = playerMaximumY;
    let maximumPoolOccupancy = 0;
    const allocationSizes = [];
    for (let frame = 0; frame < frames; frame += 1) {
      runRoutine(memory, labels, "update_fighter_projectiles");
      if (frame % cooldown === 0) {
        const before = countActive(memory, active, 10);
        runRoutine(memory, labels, "allocate_player_fighter_projectile");
        const after = countActive(memory, active, 10);
        allocationSizes.push(after - before);
      }
      maximumPoolOccupancy = Math.max(maximumPoolOccupancy,
        countActive(memory, active, 10));
    }
    return {
      cooldown,
      allocationSizes,
      salvos: allocationSizes.length,
      fullSalvos: allocationSizes.filter((count) => count === 3).length,
      rejectedFullSalvos: allocationSizes.filter((count) => count !== 3).length,
      maximumPoolOccupancy,
    };
  };
  return {
    artifact,
    frames,
    tooFast: runCandidate(17),
    configured: runCandidate(28),
  };
}

export function executeSpreadShotMotionTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const { memory, labels } = initialiseRuntime(root, artifact);
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const xAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const yAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
  memory[requiredLabel(labels, "player_x")] = 124;
  memory[requiredLabel(labels, "player_y")] = playerMaximumY;
  runRoutine(memory, labels, "allocate_player_fighter_projectile");
  const initial = Array.from(memory.subarray(xAddress, xAddress + 3));
  for (let frame = 0; frame < 100; frame += 1) {
    memory.fill(100, yAddress, yAddress + 3);
    runRoutine(memory, labels, "update_fighter_projectiles");
  }
  const after100 = Array.from(memory.subarray(xAddress, xAddress + 3));
  const activeAfter100 = Array.from(memory.subarray(active, active + 3));

  const boundaryCase = (direction, x) => {
    const runtime = initialiseRuntime(root, artifact);
    const projectileActive = requiredLabel(runtime.labels, "FIGHTER_PROJECTILE_ACTIVE");
    const projectileX = requiredLabel(runtime.labels, "FIGHTER_PROJECTILE_X");
    const projectileY = requiredLabel(runtime.labels, "FIGHTER_PROJECTILE_Y");
    const projectilePreviousY = requiredLabel(runtime.labels, "FIGHTER_PROJECTILE_PREV_Y");
    const projectileLifetime = requiredLabel(runtime.labels, "FIGHTER_PROJECTILE_LIFETIME");
    runtime.memory[projectileActive] = 1 | direction;
    runtime.memory[projectileX] = x;
    runtime.memory[projectileY] = 100;
    runtime.memory[projectilePreviousY] = 100;
    runtime.memory[projectileLifetime] = 0xff;
    runRoutine(runtime.memory, runtime.labels, "update_fighter_projectiles");
    return {
      direction,
      startX: x,
      active: runtime.memory[projectileActive],
      x: runtime.memory[projectileX],
    };
  };
  return {
    artifact,
    initial,
    after100,
    activeAfter100,
    leftBoundary: boundaryCase(0x40, 48),
    rightBoundary: boundaryCase(0x20, 207),
  };
}

export function executeSpreadShotCollisionTrace({ root = defaultRoot, artifact = "xex" } = {}) {
  const interceptor = (() => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    memory[requiredLabel(labels, "player_x")] = 124;
    memory[requiredLabel(labels, "player_y")] = 184;
    runRoutine(memory, labels, "allocate_player_fighter_projectile");
    memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 1;
    memory[requiredLabel(labels, "ENEMY_ARCHETYPE")] = 0;
    memory[requiredLabel(labels, "ENEMY_MEMBER_STATE")] = 1;
    memory[requiredLabel(labels, "ENEMY_LIVE_COUNT")] = 1;
    memory[requiredLabel(labels, "ENEMY_HP")] = 3;
    memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")] = 0;
    memory[requiredLabel(labels, "ENEMY_PENDING_SOURCE")] = 5;
    memory[requiredLabel(labels, "ENEMY_X")] = 124;
    memory[requiredLabel(labels, "ENEMY_Y")] = 170;
    memory[requiredLabel(labels, "score_bcd_lo")] = 0;
    memory[requiredLabel(labels, "score_bcd_hi")] = 0;
    runRoutine(memory, labels, "update_fighter_projectiles");
    const pendingDamage = memory[requiredLabel(labels, "ENEMY_PENDING_DAMAGE")];
    const consumed = Array.from(memory.subarray(active, active + 3));
    runRoutine(memory, labels, "resolve_enemy_damage");
    const scoreAfterFirstResolve = memory[requiredLabel(labels, "score_bcd_lo")];
    runRoutine(memory, labels, "resolve_enemy_damage");
    return {
      pendingDamage,
      consumed,
      enemyState: memory[requiredLabel(labels, "ENEMY_ACTIVE")],
      scoreAfterFirstResolve,
      scoreAfterSecondResolve: memory[requiredLabel(labels, "score_bcd_lo")],
    };
  })();

  const debris = Array.from({ length: 3 }, (_, selectedSlot) => {
    const { memory, labels } = initialiseRuntime(root, artifact);
    const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
    memory[requiredLabel(labels, "ENTITY_STATE") + 2] = 4;
    memory[requiredLabel(labels, "player_x")] = 124;
    memory[requiredLabel(labels, "player_y")] = 184;
    runRoutine(memory, labels, "allocate_player_fighter_projectile");
    for (let slot = 0; slot < 3; slot += 1) {
      if (slot !== selectedSlot) memory[active + slot] = 0;
    }
    const direction = memory[active + selectedSlot] & 0x60;
    const nextX = memory[projectileX + selectedSlot] + (direction === 0x40 ? -1 :
      direction === 0x20 ? 1 : 0);
    memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 1;
    memory[requiredLabel(labels, "ENTITY_ACTIVE_COUNT")] = 1;
    memory[requiredLabel(labels, "ENTITY_STATE")] = 1;
    memory[requiredLabel(labels, "ENTITY_FLAGS")] = 0x3f;
    memory[requiredLabel(labels, "ENTITY_X")] = nextX;
    memory[requiredLabel(labels, "ENTITY_Y")] = 176;
    memory[requiredLabel(labels, "ENTITY_HP")] = 3;
    runRoutine(memory, labels, "update_fighter_projectiles");
    return {
      selectedSlot,
      direction,
      projectileConsumed: memory[active + selectedSlot] === 0,
      debrisHp: memory[requiredLabel(labels, "ENTITY_HP")],
      score: memory[requiredLabel(labels, "score_bcd_lo")],
    };
  });
  return { artifact, interceptor, debris };
}

export function executeSpreadShotHullArtifactTrace({
  root = defaultRoot, artifact = "xex", head = 0, topPhase = 128,
  faction = "allied", selectedSlot = 0, frames = 12,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  runRoutine(memory, labels, "unpack_capital_hull_maps");
  runRoutine(memory, labels, "init_broadside");
  drawRuntimeHullScene(memory, labels, { head, topPhase });

  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const backupTop = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const directionIds = [0x41, 0x11, 0x21];
  const startColumns = faction === "allied" ? [7, 6, 5] : [36, 35, 34];
  const startX = 48 + startColumns[selectedSlot] * 4 + 2;
  memory[active + selectedSlot] = directionIds[selectedSlot];
  memory[projectileX + selectedSlot] = startX;
  memory[projectileY + selectedSlot] = 151;
  memory[previousY + selectedSlot] = 151;
  memory[lifetime + selectedSlot] = 64;
  memory[rendered + selectedSlot] = 0;

  const initialCharset = Array.from(memory.subarray(0x4400, 0x4800));
  const records = [];
  for (let frame = 0; frame < frames && memory[active + selectedSlot] !== 0; frame += 1) {
    const reference = logicalDisplay(memory, labels);
    runRoutine(memory, labels, "render_fighter_projectile_overlays");
    const address = memory[screenLow + selectedSlot] |
      memory[screenHigh + selectedSlot] << 8;
    const backingCode = memory[backupTop + selectedSlot];
    const code = memory[address];
    const backingGlyph = Array.from(memory.subarray(
      0x4400 + (backingCode & 0x7f) * 8,
      0x4400 + (backingCode & 0x7f) * 8 + 8,
    ));
    const projectileGlyph = Array.from(memory.subarray(
      0x4400 + (code & 0x7f) * 8,
      0x4400 + (code & 0x7f) * 8 + 8,
    ));
    const during = logicalDisplay(memory, labels);
    const charsetDuring = Array.from(memory.subarray(0x4400, 0x4800));
    const changedOffsets = [];
    for (let index = 0; index < during.length; index += 1) {
      if (during[index] !== reference[index]) changedOffsets.push(index);
    }
    runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    const afterErase = logicalDisplay(memory, labels);
    let restoreMismatches = 0;
    for (let index = 0; index < afterErase.length; index += 1) {
      if (afterErase[index] !== reference[index]) restoreMismatches += 1;
    }
    records.push({
      frame,
      x: memory[projectileX + selectedSlot],
      y: memory[projectileY + selectedSlot],
      address,
      backingCode,
      projectileCode: code,
      inverse: code >> 7,
      backingGlyph,
      projectileGlyph,
      backingPixelsPreserved: projectileGlyph.every((byte, index) =>
        [6, 4, 2, 0].every((shift) =>
          ((backingGlyph[index] >> shift) & 3) === 0 ||
          ((byte >> shift) & 3) !== 0)),
      changedOffsets,
      restoreMismatches,
      reference: Array.from(reference),
      during: Array.from(during),
      charsetDuring,
      afterErase: Array.from(afterErase),
    });
    runRoutine(memory, labels, "update_fighter_projectiles");
  }
  return {
    artifact,
    head,
    topPhase,
    faction,
    selectedSlot,
    manifestArtifact: manifest.artifacts[`void-strike-65.${artifact}`],
    initialCharset,
    finalCharset: Array.from(memory.subarray(0x4400, 0x4800)),
    records,
  };
}

export function executeSpreadShotHullVolleyTrace({
  root = defaultRoot, artifact = "xex", head = 21, topPhase = 128,
  faction = "allied", frames = 12,
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  runRoutine(memory, labels, "unpack_capital_hull_maps");
  runRoutine(memory, labels, "init_broadside");
  drawRuntimeHullScene(memory, labels, { head, topPhase });

  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const rendered = requiredLabel(labels, "FIGHTER_PROJECTILE_RENDERED");
  const backupTop = requiredLabel(labels, "FIGHTER_PROJECTILE_BACKUP_TOP");
  const screenLow = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_LO");
  const screenHigh = requiredLabel(labels, "FIGHTER_PROJECTILE_SCREEN_HI");
  const directionIds = [0x41, 0x11, 0x21];
  const startColumns = faction === "allied" ? [7, 6, 5] : [36, 35, 34];
  for (let slot = 0; slot < 3; slot += 1) {
    memory[active + slot] = directionIds[slot];
    memory[projectileX + slot] = 48 + startColumns[slot] * 4 + 2;
    memory[projectileY + slot] = 151;
    memory[previousY + slot] = 151;
    memory[lifetime + slot] = 64;
    memory[rendered + slot] = 0;
  }

  const records = [];
  for (let frame = 0; frame < frames; frame += 1) {
    const reference = logicalDisplay(memory, labels);
    const renderCycles = runRoutine(memory, labels, "render_fighter_projectile_overlays");
    const during = logicalDisplay(memory, labels);
    const charsetDuring = Array.from(memory.subarray(0x4400, 0x4800));
    const projectiles = Array.from({ length: 3 }, (_, slot) => {
      const address = memory[screenLow + slot] | memory[screenHigh + slot] << 8;
      return {
        slot,
        active: memory[active + slot],
        x: memory[projectileX + slot],
        y: memory[projectileY + slot],
        address,
        backingCode: memory[backupTop + slot],
        projectileCode: memory[address],
        inverse: memory[address] >> 7,
      };
    });
    const eraseCycles = runRoutine(memory, labels, "erase_fighter_projectile_overlays");
    const afterErase = logicalDisplay(memory, labels);
    let restoreMismatches = 0;
    for (let offset = 0; offset < reference.length; offset += 1) {
      if (afterErase[offset] !== reference[offset]) restoreMismatches += 1;
    }
    records.push({
      frame,
      projectiles,
      renderCycles,
      eraseCycles,
      restoreMismatches,
      reference: Array.from(reference),
      during: Array.from(during),
      charsetDuring,
      afterErase: Array.from(afterErase),
    });
    runRoutine(memory, labels, "update_fighter_projectiles");
  }
  return {
    artifact,
    head,
    topPhase,
    faction,
    manifest,
    manifestArtifact: manifest.artifacts[`void-strike-65.${artifact}`],
    records,
  };
}

export function executeSpreadShotOverlapTrace({
  root = defaultRoot, artifact = "xex", head = 21,
} = {}) {
  const { memory, labels } = initialiseRuntime(root, artifact);
  runRoutine(memory, labels, "unpack_capital_hull_maps");
  runRoutine(memory, labels, "init_broadside");
  drawRuntimeHullScene(memory, labels, { head, topPhase: 136 });
  const reference = logicalDisplay(memory, labels);
  const initialCharset = Array.from(memory.subarray(0x4400, 0x4800));
  let displayOffset = -1;
  for (let row = 2; row < 24 && displayOffset < 0; row += 1) {
    for (let column = 32; column < 40; column += 1) {
      const code = reference[row * 40 + column] & 0x7f;
      if (code >= 59 && code < 90) {
        displayOffset = row * 40 + column;
        break;
      }
    }
  }
  if (displayOffset < 0) throw new Error("Overlap trace could not find a Hostile hull cell");
  const row = Math.floor(displayOffset / 40);
  const column = displayOffset % 40;
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const projectileX = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const projectileY = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const xPositions = [48 + column * 4, 48 + column * 4 + 2];
  for (let slot = 0; slot < 2; slot += 1) {
    memory[active + slot] = slot === 0 ? 0x41 : 0x21;
    memory[projectileX + slot] = xPositions[slot];
    const y = 16 + (row - 1) * 8 + 3;
    memory[projectileY + slot] = y;
    memory[previousY + slot] = y;
    memory[lifetime + slot] = 32;
  }
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const both = logicalDisplay(memory, labels);
  const bothCode = both[displayOffset];
  const bothGlyph = Array.from(memory.subarray(
    0x4400 + (bothCode & 0x7f) * 8,
    0x4400 + (bothCode & 0x7f) * 8 + 8,
  ));
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  const afterBothErase = logicalDisplay(memory, labels);
  memory[active] = 0;
  runRoutine(memory, labels, "render_fighter_projectile_overlays");
  const oneRemaining = logicalDisplay(memory, labels);
  const oneCode = oneRemaining[displayOffset];
  const oneGlyph = Array.from(memory.subarray(
    0x4400 + (oneCode & 0x7f) * 8,
    0x4400 + (oneCode & 0x7f) * 8 + 8,
  ));
  runRoutine(memory, labels, "erase_fighter_projectile_overlays");
  return {
    artifact,
    head,
    row,
    column,
    displayOffset,
    reference: Array.from(reference),
    both: Array.from(both),
    bothCode,
    bothGlyph,
    afterBothErase: Array.from(afterBothErase),
    oneRemaining: Array.from(oneRemaining),
    oneCode,
    oneGlyph,
    afterFinalErase: Array.from(logicalDisplay(memory, labels)),
    initialCharset,
    finalCharset: Array.from(memory.subarray(0x4400, 0x4800)),
  };
}

export function executeWeaponBoosterReplacementTrace({
  root = defaultRoot, artifact = "xex",
} = {}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact);
  const type = requiredLabel(labels, "ENTITY_TYPE") + 1;
  const state = requiredLabel(labels, "ENTITY_STATE") + 2;
  const collect = (pickupType, phase) => {
    memory[type] = pickupType;
    runRoutine(memory, labels, "weapon_pickup_collect");
    return pickupSnapshot(memory, labels, manifest, { phase, frame: 0 });
  };
  const rapid = collect(0, "RAPID");
  memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 123;
  memory[requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2] = 0;
  const spreadReplacesRapid = collect(1, "SPREAD_REPLACES_RAPID");
  memory[requiredLabel(labels, "ENTITY_TIMER") + 2] = 77;
  const spreadRefresh = collect(1, "SPREAD_REFRESH");
  memory[state] = 4;
  const rapidReplacesSpread = collect(0, "RAPID_REPLACES_SPREAD");
  return { artifact, rapid, spreadReplacesRapid, spreadRefresh, rapidReplacesSpread };
}

export function executeShieldBoosterTrace({
  root = defaultRoot, artifact = "xex", coldFill = 0,
} = {}) {
  const runtime = initialiseRuntime(root, artifact, coldFill);
  const { memory, labels, manifest } = runtime;
  const stateBase = requiredLabel(labels, "ENTITY_STATE");
  const typeBase = requiredLabel(labels, "ENTITY_TYPE");
  const timerLow = requiredLabel(labels, "ENTITY_TIMER") + 2;
  const timerHigh = requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2;
  const boosterState = stateBase + 2;
  const pickupState = stateBase + 1;
  const pickupType = typeBase + 1;
  const damageApplied = requiredLabel(labels, "BROAD_DAMAGE_APPLIED");
  const damageCooldown = requiredLabel(labels, "BROAD_DAMAGE_COOLDOWN");
  const health = fixedStateAddress(labels, "BROAD_PLAYER_HEALTH");
  const lives = fixedStateAddress(labels, "PLAYER_LIVES");
  const scoreLo = requiredLabel(labels, "score_bcd_lo");
  const scoreHi = requiredLabel(labels, "score_bcd_hi");
  const screen = labels.get("SCREEN") ?? 0x4000;
  const hudOffset = requiredLabel(labels, "HUD_BOOSTER_OFFSET");
  const hudCells = requiredLabel(labels, "HUD_BOOSTER_CELLS");
  const hudSegmentsOffset = requiredLabel(labels, "HUD_BOOSTER_SEGMENTS_OFFSET");
  const hudSegments = requiredLabel(labels, "HUD_BOOSTER_SEGMENTS");
  const backing = Array.from({ length: hudCells }, (_value, index) => 0x31 + index);
  memory.set(backing, screen + hudOffset);
  const snapshot = (name, extra = {}) => ({
    name,
    state: memory[boosterState],
    timer: memory[timerLow] | memory[timerHigh] << 8,
    health: memory[health],
    lives: memory[lives],
    score: memory[scoreLo] | memory[scoreHi] << 8,
    damageApplied: memory[damageApplied],
    damageCooldown: memory[damageCooldown],
    colpm0: memory[0xd012],
    colpm3: memory[0xd015],
    hudRegion: Array.from(memory.subarray(screen + hudOffset, screen + hudOffset + hudCells)),
    hudSegments: Array.from(memory.subarray(
      screen + hudSegmentsOffset, screen + hudSegmentsOffset + hudSegments)),
    ...extra,
  });
  let lastCollectCycles = 0;
  const collect = (type, name) => {
    memory[pickupState] = 2;
    memory[pickupType] = type;
    lastCollectCycles = runRoutine(memory, labels, "weapon_pickup_collect");
    return snapshot(name);
  };

  memory[health] = 10;
  memory[lives] = 3;
  memory[scoreLo] = 0x45;
  memory[scoreHi] = 0x01;
  memory[damageApplied] = 0;
  memory[damageCooldown] = 0;
  memory[0xd012] = 0x0e;
  memory[0xd015] = 0x28;
  const activation = collect(2, "activation");
  const paused = Array.from({ length: 16 }, (_value, frame) => snapshot("pause", { frame }));
  runRoutine(memory, labels, "entity_begin_sector_complete");
  const sector = snapshot("sector");
  const boundaries = [];
  const activeUpdateCycles = [];
  const wanted = new Set([249, 188, 187, 126, 125, 63, 62, 56, 55, 48, 47, 40, 39, 1, 0]);
  for (let tick = 1; tick <= 250; tick += 1) {
    const cycles = runRoutine(memory, labels, "update_weapon_booster_active", { x: 5 });
    activeUpdateCycles.push(cycles);
    const timer = memory[timerLow] | memory[timerHigh] << 8;
    if (wanted.has(timer)) boundaries.push(snapshot(`timer-${timer}`, { tick, cycles }));
  }
  const expiry = snapshot("expiry");

  const damageCase = (name, setup = () => {}, damage = 1) => {
    const current = initialiseRuntime(root, artifact, coldFill);
    const m = current.memory;
    const l = current.labels;
    m[requiredLabel(l, "ENTITY_STATE") + 2] = 5;
    m[requiredLabel(l, "ENTITY_TIMER") + 2] = 250;
    m[fixedStateAddress(l, "BROAD_PLAYER_HEALTH")] = 10;
    m[fixedStateAddress(l, "PLAYER_LIVES")] = 3;
    m[requiredLabel(l, "score_bcd_lo")] = 0x45;
    m[requiredLabel(l, "score_bcd_hi")] = 0x01;
    m[requiredLabel(l, "BROAD_DAMAGE_APPLIED")] = 0;
    m[requiredLabel(l, "BROAD_DAMAGE_COOLDOWN")] = 0;
    m[requiredLabel(l, "damage_timer")] = 0;
    setup(m, l);
    const cycles = runRoutine(m, l, "apply_player_damage", { a: damage });
    return {
      name,
      cycles,
      health: m[fixedStateAddress(l, "BROAD_PLAYER_HEALTH")],
      lives: m[fixedStateAddress(l, "PLAYER_LIVES")],
      score: m[requiredLabel(l, "score_bcd_lo")] |
        m[requiredLabel(l, "score_bcd_hi")] << 8,
      applied: m[requiredLabel(l, "BROAD_DAMAGE_APPLIED")],
      cooldown: m[requiredLabel(l, "BROAD_DAMAGE_COOLDOWN")],
      damageTimer: m[requiredLabel(l, "damage_timer")],
    };
  };
  const damage = {
    ordinary: damageCase("ordinary"),
    heavy: damageCase("heavy", () => {}, 2),
    duringCooldown: damageCase("during-cooldown", (m, l) => {
      m[requiredLabel(l, "BROAD_DAMAGE_COOLDOWN")] = 17;
    }),
    secondEvent: damageCase("second-event", (m, l) => {
      m[requiredLabel(l, "BROAD_DAMAGE_APPLIED")] = 1;
    }),
    respawn: damageCase("respawn", (m, l) => {
      m[requiredLabel(l, "PLAYER_LIFECYCLE")] = 2;
    }),
  };

  const interceptorProjectile = initialiseRuntime(root, artifact, coldFill);
  let interceptorProjectileCycles = 0;
  {
    const m = interceptorProjectile.memory;
    const l = interceptorProjectile.labels;
    const slot = 10;
    m[requiredLabel(l, "ENTITY_STATE") + 2] = 5;
    m[requiredLabel(l, "BROAD_DAMAGE_APPLIED")] = 0;
    m[requiredLabel(l, "BROAD_DAMAGE_COOLDOWN")] = 0;
    m[fixedStateAddress(l, "BROAD_PLAYER_HEALTH")] = 10;
    m[requiredLabel(l, "player_x")] = 124;
    m[requiredLabel(l, "player_y")] = playerMaximumY;
    m[requiredLabel(l, "FIGHTER_PROJECTILE_ACTIVE") + slot] = 2;
    m[requiredLabel(l, "FIGHTER_PROJECTILE_X") + slot] = 124;
    // Collision uses PREV_Y as the start of the swept projectile envelope.
    // Keep the fixture aligned with the player now clamped at the playfield bottom.
    m[requiredLabel(l, "FIGHTER_PROJECTILE_Y") + slot] = playerMaximumY;
    m[requiredLabel(l, "FIGHTER_PROJECTILE_PREV_Y") + slot] = playerMaximumY;
    m[requiredLabel(l, "FIGHTER_PROJECTILE_LIFETIME") + slot] = 10;
    interceptorProjectileCycles = runRoutine(m, l, "update_fighter_projectiles");
  }
  damage.interceptorProjectile = {
    active: interceptorProjectile.memory[requiredLabel(interceptorProjectile.labels,
      "FIGHTER_PROJECTILE_ACTIVE") + 10],
    health: interceptorProjectile.memory[fixedStateAddress(interceptorProjectile.labels,
      "BROAD_PLAYER_HEALTH")],
    applied: interceptorProjectile.memory[requiredLabel(interceptorProjectile.labels,
      "BROAD_DAMAGE_APPLIED")],
  };

  const broadsideImpact = initialiseRuntime(root, artifact, coldFill);
  let broadsideImpactCycles = 0;
  {
    const m = broadsideImpact.memory;
    const l = broadsideImpact.labels;
    m[requiredLabel(l, "ENTITY_STATE") + 2] = 5;
    m[requiredLabel(l, "BROAD_DAMAGE_APPLIED")] = 0;
    m[requiredLabel(l, "BROAD_DAMAGE_COOLDOWN")] = 0;
    m[fixedStateAddress(l, "BROAD_PLAYER_HEALTH")] = 10;
    broadsideImpactCycles += runRoutine(m, l, "begin_broadside_impact", { x: 0 });
    broadsideImpactCycles += runRoutine(m, l, "apply_broadside_player_damage", { x: 0 });
  }
  damage.broadsideImpact = {
    state: broadsideImpact.memory[requiredLabel(broadsideImpact.labels, "BROAD_STATE")],
    health: broadsideImpact.memory[fixedStateAddress(broadsideImpact.labels,
      "BROAD_PLAYER_HEALTH")],
    applied: broadsideImpact.memory[requiredLabel(broadsideImpact.labels,
      "BROAD_DAMAGE_APPLIED")],
  };

  const debrisSameFrame = initialiseRuntime(root, artifact, coldFill);
  let debrisSameFrameCycles = 0;
  {
    const m = debrisSameFrame.memory;
    const l = debrisSameFrame.labels;
    m[requiredLabel(l, "player_x")] = 124;
    m[requiredLabel(l, "player_y")] = 104;
    m[fixedStateAddress(l, "BROAD_PLAYER_HEALTH")] = 10;
    m[requiredLabel(l, "BROAD_DAMAGE_APPLIED")] = 0;
    m[requiredLabel(l, "BROAD_DAMAGE_COOLDOWN")] = 0;
    m[requiredLabel(l, "ENTITY_X")] = 124;
    m[requiredLabel(l, "ENTITY_Y")] = 104;
    m[requiredLabel(l, "ENTITY_STATE")] = 1;
    m[requiredLabel(l, "ENTITY_FLAGS")] = 0x3f;
    m[requiredLabel(l, "ENTITY_STATE") + 1] = 2;
    m[requiredLabel(l, "ENTITY_TYPE") + 1] = 2;
    m[requiredLabel(l, "ENTITY_X") + 1] = 124;
    m[requiredLabel(l, "ENTITY_Y") + 1] = 104;
    m[requiredLabel(l, "ENTITY_ACTIVE_MASK")] = 3;
    m[requiredLabel(l, "ENTITY_ACTIVE_COUNT")] = 2;
    debrisSameFrameCycles = runRoutine(m, l, "entity_effects_update");
  }
  const sameFrame = {
    state: debrisSameFrame.memory[requiredLabel(debrisSameFrame.labels, "ENTITY_STATE") + 2],
    timer: debrisSameFrame.memory[requiredLabel(debrisSameFrame.labels, "ENTITY_TIMER") + 2],
    health: debrisSameFrame.memory[fixedStateAddress(debrisSameFrame.labels,
      "BROAD_PLAYER_HEALTH")],
    debrisActive: debrisSameFrame.memory[requiredLabel(debrisSameFrame.labels,
      "ENTITY_ACTIVE_MASK")] & 1,
    damageApplied: debrisSameFrame.memory[requiredLabel(debrisSameFrame.labels,
      "BROAD_DAMAGE_APPLIED")],
  };

  const replacement = initialiseRuntime(root, artifact, coldFill);
  replacement.memory[0xd012] = 0x0e;
  replacement.memory[0xd015] = 0x28;
  const replace = (type, name) => {
    const m = replacement.memory;
    const l = replacement.labels;
    m[requiredLabel(l, "ENTITY_STATE") + 1] = 2;
    m[requiredLabel(l, "ENTITY_TYPE") + 1] = type;
    const cycles = runRoutine(m, l, "weapon_pickup_collect");
    return {
      name,
      state: m[requiredLabel(l, "ENTITY_STATE") + 2],
      timer: m[requiredLabel(l, "ENTITY_TIMER") + 2] |
        m[requiredLabel(l, "ENTITY_MOVE_ACCUMULATOR") + 2] << 8,
      colpm0: m[0xd012], colpm3: m[0xd015],
      cycles,
    };
  };
  const replacements = [
    replace(0, "rapid"), replace(2, "shield-replaces-rapid"),
    replace(2, "shield-refresh"), replace(1, "spread-replaces-shield"),
    replace(2, "shield-replaces-spread"), replace(0, "rapid-replaces-shield"),
  ];

  const inactive = initialiseRuntime(root, artifact, coldFill);
  runRoutine(inactive.memory, inactive.labels, "init_entity_effects");
  const inactiveCycles = runRoutine(inactive.memory, inactive.labels, "entity_effects_update");

  return {
    artifact,
    coldFill,
    manifest,
    backing,
    activation,
    paused,
    sector,
    boundaries,
    expiry,
    damage,
    sameFrame,
    replacements,
    costs: {
      inactiveEntityUpdate: inactiveCycles,
      activation: lastCollectCycles,
      activeNoContactMin: Math.min(...activeUpdateCycles.slice(0, -1)),
      activeNoContactMax: Math.max(...activeUpdateCycles.slice(0, -1)),
      expiry: activeUpdateCycles.at(-1),
      directAbsorption: damage.ordinary.cycles,
      interceptorProjectileAbsorption: interceptorProjectileCycles,
      broadsideImpactAbsorption: broadsideImpactCycles,
      pickupThenDebrisAbsorption: debrisSameFrameCycles,
      replacements: replacements.map(({ name, cycles }) => ({ name, cycles })),
    },
    shieldGlyph: Array.from(memory.subarray(
      0x5000 + requiredLabel(labels, "CH_HUD_BOOSTER_SHIELD") * 8,
      0x5000 + requiredLabel(labels, "CH_HUD_BOOSTER_SHIELD") * 8 + 8)),
  };
}

export function assertSpreadShotTraceParity(left, right) {
  const normalize = ({ artifact, ...trace }) => JSON.stringify(trace, (_key, value) =>
    value instanceof Uint8Array ? Array.from(value) : value);
  if (normalize(left) !== normalize(right)) {
    throw new Error(`Spread Shot runtime differs between ${left.artifact} and ${right.artifact}`);
  }
  return true;
}

export function spreadShotTraceCsv(trace) {
  const header = [
    "artifact", "phase", "frame", "state", "pickup_type", "next_pickup_type",
    "render_id", "x", "y", "timer", "hud", "projectile_count",
    "slot0_id", "slot0_x", "slot0_y", "slot1_id", "slot1_x", "slot1_y",
    "slot2_id", "slot2_x", "slot2_y",
  ];
  const rows = [];
  const addPickup = (record) => rows.push([
    trace.artifact, record.phase, record.frame, record.state, record.pickupType,
    record.nextPickupType, record.renderId, record.x, record.y, record.timer,
    record.hudCodes.join("/"), record.projectileActiveCount,
    "", "", "", "", "", "", "", "", "",
  ]);
  const addProjectile = (record) => {
    const slots = record.slots.slice(0, 3);
    rows.push([
      trace.artifact, record.phase, record.frame, 4, 1, 0, "", "", "", "", "",
      slots.filter(({ active }) => active !== 0).length,
      ...slots.flatMap(({ active, x, y }) => [active, x, y]),
    ]);
  };
  trace.drops.forEach(addPickup);
  trace.spreadCapsuleFrames.forEach(addPickup);
  addPickup(trace.spreadPickup);
  trace.trajectoryFrames.forEach(addProjectile);
  addProjectile(trace.projectilesAfterCleanup);
  for (const index of [0, 49, 449, 499]) addPickup(trace.spreadTimerFrames[index]);
  addPickup(trace.spreadExpired);
  return `${header.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}\n`;
}

export function weaponPickupTraceCsv(trace) {
  const fields = [
    "artifact", "phase", "frame", "kill", "damage_source", "projectile_consumed",
    "qualified_kill_counter", "slot_value", "rapid_seconds", "state", "active_mask",
    "active_count", "x", "y", "timer", "subsecond", "render_id", "left_code",
    "right_code", "bottom_left_code", "bottom_right_code", "top_screen_address",
    "bottom_screen_address", "backing_0", "backing_1", "backing_2", "backing_3",
    "hud_0", "hud_1", "hud_2", "hud_3", "drawn_mask",
    "effects_active_mask", "effects_active_count", "projectiles", "burst_state",
    "burst_remaining", "burst_timer", "score",
  ];
  const rows = [fields.join(",")];
  for (const record of [...trace.records, ...trace.rapidTimerFrames, ...trace.pauseFrames]) {
    rows.push([
      trace.artifact, record.phase, record.frame, record.kill, record.damageSource,
      Number(record.projectileConsumed), record.qualifiedKillCounter, record.slotValue,
      record.rapidSeconds, record.state,
      record.activeMask, record.activeCount, record.x, record.y, record.timer,
      record.subsecond, record.renderId, record.leftCode, record.rightCode,
      record.bottomLeftCode, record.bottomRightCode, record.screenAddress,
      record.bottomScreenAddress, ...record.backing,
      ...record.hudCodes, record.drawnMask, record.effectActiveMask, record.effectActiveCount,
      record.projectileActiveCount, record.burstState, record.burstRemaining,
      record.burstTimer,
      `${record.scoreHi.toString(16).padStart(2, "0")}${record.scoreLo.toString(16).padStart(2, "0")}`,
    ].join(","));
  }
  return `${rows.join("\n")}\n`;
}

export function assertWeaponPickupTraceParity(left, right) {
  const normalize = ({ artifact, ...trace }) => ({
    ...trace,
    records: trace.records.map((record) => ({
      ...record, screen: Array.from(record.screen), display: Array.from(record.display),
    })),
    rapidTimerFrames: trace.rapidTimerFrames.map((record) => ({
      ...record, screen: Array.from(record.screen), display: Array.from(record.display),
    })),
    pauseFrames: trace.pauseFrames.map((record) => ({
      ...record, screen: Array.from(record.screen), display: Array.from(record.display),
    })),
    charset: Array.from(trace.charset),
    hudCharset: Array.from(trace.hudCharset),
  });
  if (JSON.stringify(normalize(left)) !== JSON.stringify(normalize(right))) {
    throw new Error(`Weapon pickup runtime differs between ${left.artifact} and ${right.artifact}`);
  }
  return true;
}
