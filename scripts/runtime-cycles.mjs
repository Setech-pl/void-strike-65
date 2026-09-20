import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Nmos6502, nmos6502Flags } from "./nmos6502.mjs";

const PAL_SCANLINES = 312;
const CYCLES_PER_SCANLINE = 114;
const PAL_FRAME_CYCLES = PAL_SCANLINES * CYCLES_PER_SCANLINE;
const DMA_VISIBLE_SCANLINES = 240;
const GAMEPLAY_MODE_ROWS = 24;
const MODE_ROW_SCANLINES = 8;
const NORMAL_WIDTH_CHARACTERS = 40;
const ANTIC_REFRESH_CYCLES = 9;
const PMG_DMA_CYCLES = 5;
const MAX_WSYNC_STALL = CYCLES_PER_SCANLINE;
const NMI_ENTRY_CYCLES = 7;
const RELEASED_OPTION_LIMIT = 0x04;

const addresses = {
  stick0: 0xd300,
  trig0: 0xd010,
  consol: 0xd01f,
  vcount: 0xd40b,
  wsync: 0xd40a,
  soundEnabled: 0x00a0,
  gameplayFireGate: 0x00a1,
  fireTimer: 0x008b,
  hitTimer: 0x008c,
  difficulty: 0x4e70,
  broadState: 0x4e40,
  broadFlashTimer: 0x4ea2,
  capitalSectorState: 0x4ea5,
  playerLifecycle: 0x4eaa,
  capitalExplosionTimer: 0x4eae,
  capitalExplosionSoundTimer: 0x4ec8,
  enemyActive: 0x4ecd,
  musicActive: 0x4ed9,
  gameMusicEnabled: 0x4ee3,
};

const counts = {
  broadsideSlots: 3,
  projectileSlots: 19,
  // `renderedFarStars` is retained only as a report-schema property name.
  // The production value is the four-record white-only decorative layer.
  farStars: 4,
  fighterExplosionSlots: 2,
};

const profiledRoutineNames = [
  "erase_fighter_projectile_overlays",
  "tick_shared_fighter_explosions",
  "tick_capital_explosions",
  "tick_launch_flashes",
  "update_player_death",
  "read_input",
  "update_enemy",
  "handle_collisions",
  "handle_player_hull_contact",
  "update_fighter_projectiles",
  "update_broadside",
  "update_player_fighter_weapon",
  "update_enemy_weapon",
  "update_starfield",
  "update_white_starfield_phase",
  "publish_dynamic_near_star_phase",
  "scroll_world_columns",
  "scroll_hull_columns",
  "visible_hull_sector_row",
  "resolve_allied_sector_row",
  "resolve_enemy_sector_row",
  "rotate_playfield_rows",
  "build_playfield_display_list",
  "set_gameplay_row_ptr",
  "restore_boundary_stars",
  "redraw_visible_muzzles",
  "render_capital_explosions",
  "render_shared_fighter_explosions",
  "render_fighter_projectile_overlays",
  "advance_dst_to_next_physical_row",
  "player_fighter_projectile_hits_enemy",
  "interceptor_projectile_hits_player",
  "update_sound",
  "music_tick_gameplay",
  "entity_effects_erase",
  "erase_transient_effect_overlays",
  "erase_interactive_entity_overlays",
  "entity_effects_update",
  "update_weapon_pickup_active",
  "weapon_pickup_collide_player",
  "weapon_pickup_record_qualified_kill",
  "entity_spawn_debris",
  "entity_collide_player",
  "entity_damage_applied",
  "entity_despawn_debris",
  "entity_player_fighter_projectile_target",
  "entity_player_fighter_projectile_hits_debris",
  "spawn_debris_destruction_effects",
  "spawn_breakup_effects_at",
  "spawn_interceptor_breakup_effects",
  "materialize_interceptor_breakup_effects",
  "update_transient_effects",
  "render_transient_effect_overlays",
  "entity_effects_render",
  "render_interactive_entity_overlays",
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseViceLabels(labelText) {
  const labels = new Map();
  for (const line of labelText.split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}

function requiredLabel(labels, name) {
  const address = labels.get(name);
  invariant(Number.isInteger(address), `Runtime timing label ${name} is missing`);
  return address;
}

function makeMachine({
  residentMain,
  loadAddress,
  broadsideRuntime,
  broadsideRunAddress,
  starfieldRuntime,
  starfieldRunAddress,
  a2KernelRuntime,
  a2KernelRunAddress,
  entityCodeRuntime,
  entityCodeRunAddress,
  weaponPickupPhaseBank,
  weaponPickupPhaseBankAddress,
  pickupCodeRuntime,
  pickupCodeRunAddress,
  integrationGlueRuntime,
  integrationGlueRunAddress,
  directorRuntime,
  directorRunAddress,
  directorAdditionalSegments = [],
  capitalPlayerCollisionRuntime,
  capitalPlayerCollisionRunAddress,
  labels,
  difficulty,
  vcountReads = [0, 1],
}) {
  const memory = new Uint8Array(0x10000);
  memory.set(residentMain, loadAddress);
  memory.set(broadsideRuntime, broadsideRunAddress);
  memory.set(starfieldRuntime, starfieldRunAddress);
  memory.set(a2KernelRuntime, a2KernelRunAddress);
  memory.set(entityCodeRuntime, entityCodeRunAddress);
  if (weaponPickupPhaseBank) memory.set(weaponPickupPhaseBank, weaponPickupPhaseBankAddress);
  if (pickupCodeRuntime) memory.set(pickupCodeRuntime, pickupCodeRunAddress);
  if (integrationGlueRuntime) memory.set(integrationGlueRuntime, integrationGlueRunAddress);
  if (directorRuntime) memory.set(directorRuntime, directorRunAddress);
  for (const segment of directorAdditionalSegments) memory.set(segment.data, segment.runAddress);
  if (capitalPlayerCollisionRuntime) {
    memory.set(capitalPlayerCollisionRuntime, capitalPlayerCollisionRunAddress);
  }

  const io = {
    stick: 0x0f,
    trigger: 1,
    console: 0xff,
    vcountReads,
    vcountIndex: 0,
  };
  const hooks = {
    read(address) {
      if (address === addresses.stick0) return io.stick;
      if (address === addresses.trig0) return io.trigger;
      if (address === addresses.consol) return io.console;
      if (address === addresses.vcount) {
        const index = io.vcountIndex++ % io.vcountReads.length;
        return io.vcountReads[index];
      }
      return undefined;
    },
  };
  const cpu = new Nmos6502(memory, hooks);
  memory[requiredLabel(labels, "sound_enabled")] = 1;
  memory[addresses.gameMusicEnabled] = 1;
  memory[addresses.difficulty] = difficulty;
  return { cpu, io };
}

function execute(cpu, {
  stopAddresses,
  routineAddresses = new Map(),
  eventAddresses = new Map(),
  regionAddresses = new Map(),
  maximumSteps = 20_000_000,
}) {
  const stopSet = new Set(stopAddresses);
  const hits = new Set();
  const durations = new Map();
  const exclusiveDurations = new Map();
  const callEdges = new Map();
  const watchers = [];
  const regionWatchers = new Map();
  const regionDurations = new Map();
  const startCycles = cpu.cycles;

  for (let steps = 0; steps < maximumSteps; steps += 1) {
    if (stopSet.has(cpu.pc)) {
      return {
        stopAddress: cpu.pc,
        cycles: cpu.cycles - startCycles,
        hits,
        durations,
        exclusiveDurations,
        callEdges,
        regionDurations,
        steps,
      };
    }

    for (const [name, region] of regionAddresses) {
      if (cpu.pc === region.start && !regionWatchers.has(name)) {
        regionWatchers.set(name, cpu.cycles);
      }
      if (cpu.pc === region.end && regionWatchers.has(name)) {
        const samples = regionDurations.get(name) ?? [];
        samples.push(cpu.cycles - regionWatchers.get(name));
        regionDurations.set(name, samples);
        regionWatchers.delete(name);
      }
    }

    const routineName = routineAddresses.get(cpu.pc);
    if (routineName) {
      hits.add(routineName);
      watchers.push({
        name: routineName,
        sp: cpu.sp,
        startCycles: cpu.cycles,
        childInclusiveCycles: 0,
      });
    }
    const eventName = eventAddresses.get(cpu.pc);
    if (eventName) hits.add(eventName);

    const result = cpu.step();
    if (result.operation === "RTS") {
      for (let index = watchers.length - 1; index >= 0; index -= 1) {
        const watcher = watchers[index];
        if (watcher.sp !== result.spBefore) continue;
        const duration = cpu.cycles - watcher.startCycles;
        const inclusiveCallCycles = duration + 6;
        const samples = durations.get(watcher.name) ?? [];
        samples.push(duration);
        durations.set(watcher.name, samples);
        const exclusiveSamples = exclusiveDurations.get(watcher.name) ?? [];
        exclusiveSamples.push(inclusiveCallCycles - watcher.childInclusiveCycles);
        exclusiveDurations.set(watcher.name, exclusiveSamples);
        watchers.splice(index, 1);
        const parent = watchers[index - 1];
        if (parent) {
          parent.childInclusiveCycles += inclusiveCallCycles;
          const edgeName = `${parent.name}->${watcher.name}`;
          const edge = callEdges.get(edgeName) ?? { cycles: 0, calls: 0 };
          edge.cycles += inclusiveCallCycles;
          edge.calls += 1;
          callEdges.set(edgeName, edge);
        }
      }
    }
  }
  throw new Error(
    `Runtime timing execution did not reach ${[...stopSet]
      .map((address) => `$${address.toString(16)}`).join(" or ")}; ` +
    `stopped at $${cpu.pc.toString(16)} after ${maximumSteps} steps`,
  );
}

function initialiseGameplay(build, difficulty, entryPoints) {
  const machine = makeMachine({
    ...build,
    difficulty,
    // Full-frame timing crosses the production $70 and $77 publication waits.
    // Routine-level callers retain the historical 0/1 frame-start model.
    vcountReads: [0, 1, 0x70, 0x71, 0x77, 0x78],
  });
  machine.cpu.pc = entryPoints.startGameplay;
  const setup = execute(machine.cpu, {
    stopAddresses: [entryPoints.mainLoop],
    maximumSteps: 30_000_000,
  });
  invariant(setup.stopAddress === entryPoints.mainLoop, "Gameplay setup did not enter main_loop");
  invariant(machine.cpu.memory[addresses.playerLifecycle] === 0,
    "Gameplay setup did not produce a live player state");
  invariant(machine.cpu.memory[addresses.enemyActive] === 0,
    "Encounter Director intro must begin before the first Interceptor admission");
  invariant(machine.cpu.memory[addresses.musicActive] === 1,
    "Gameplay setup did not start enabled gameplay music");
  // Timing replay begins from a reachable, post-window mixed-pressure state so
  // every legacy hazard path remains observable under the director-owned
  // scheduler. The startup itself above still executes the real phase-0 path.
  machine.cpu.memory[0x80f4] = 0x50; // world row 1104
  machine.cpu.memory[0x80f5] = 0x04;
  machine.cpu.memory[0x80f6] = 3;
  machine.cpu.memory[0x80f7] = 2;
  machine.cpu.memory[0x80f8] = 0;
  machine.cpu.memory[0x80f9] = 0;
  machine.cpu.memory[0x80fa] = 0;
  machine.cpu.memory[0x80fc] = 0xff;
  machine.cpu.memory[0x80fd] = 0;
  machine.cpu.memory[0x80fe] = 0;
  machine.cpu.memory[0x80ff] = 0xff;
  machine.cpu.memory[addresses.capitalSectorState] = 2;
  return machine;
}

function countNonZero(memory, start, length) {
  let count = 0;
  for (let index = 0; index < length; index += 1) {
    if (memory[start + index] !== 0) count += 1;
  }
  return count;
}

function snapshotRuntime(cpu, entryPoints) {
  const memory = cpu.memory;
  return {
    projectileOccupancy: countNonZero(
      memory,
      entryPoints.fighterProjectileActive,
      counts.projectileSlots,
    ),
    player_fighterProjectileOccupancy: countNonZero(
      memory,
      entryPoints.fighterProjectileActive,
      10,
    ),
    broadsideOccupancy: countNonZero(memory, addresses.broadState, counts.broadsideSlots),
    renderedFarStars: counts.farStars,
    liveInterceptor: memory[addresses.enemyActive] === 1,
    activeExplosion: countNonZero(
      memory,
      entryPoints.fighterExplosionTimer,
      counts.fighterExplosionSlots,
    ) > 0 || countNonZero(memory, addresses.capitalExplosionTimer, 2) > 0,
    musicWithSfx: memory[addresses.musicActive] !== 0 && (
      memory[entryPoints.fireTimer] !== 0 ||
      memory[entryPoints.hitTimer] !== 0 ||
      memory[addresses.capitalExplosionSoundTimer] !== 0
    ),
    playerLifecycle: memory[addresses.playerLifecycle],
    directorRow: memory[0x80f4] | memory[0x80f5] << 8,
    directorPhase: memory[0x80f6],
    directorIntensity: memory[0x80f8],
    capitalSectorState: memory[addresses.capitalSectorState],
    entityActiveCount: memory[entryPoints.entityActiveCount],
    entityActiveMask: memory[entryPoints.entityActiveMask],
    weaponPickupState: memory[entryPoints.entityState + 1],
    weaponBoosterState: memory[entryPoints.entityState + 2],
    entityY: memory[entryPoints.entityY],
    effectActiveCount: memory[entryPoints.effectActiveCount],
    effectActiveMask: memory[entryPoints.effectActiveMask],
  };
}

function frameInput(policy, frame, cpu, fireDelay, fixtureState) {
  const trigger = frame <= fireDelay ? 1 : 0;
  const x = cpu.memory[0x80];
  const y = cpu.memory[0x81];
  if (policy === "neutral") return { stick: 0x0f, trigger };
  if (policy === "contact-debris") {
    // Derive one collision fixture from a scheduler-created, visible debris
    // object. The per-session latch leaves every later frame input-driven and
    // prevents respawn health restoration from manufacturing another contact.
    if (!fixtureState.contactInjected && (cpu.memory[0x8014] & 0x01) !== 0 &&
      cpu.memory[0x8020] >= 24) {
      cpu.memory[0x80] = cpu.memory[0x801c];
      cpu.memory[0x81] = cpu.memory[0x8020];
      fixtureState.contactInjected = true;
    }
    return { stick: 0x0f, trigger: 1 };
  }
  if (policy === "sweep") {
    const targetRight = (Math.floor(frame / 72) & 1) === 0;
    const horizontal = targetRight ? (x < 154 ? 0x07 : 0x0f) : (x > 94 ? 0x0b : 0x0f);
    return { stick: horizontal, trigger };
  }
  const horizontalTargetRight = (Math.floor(frame / 48) & 1) === 0;
  let stick = horizontalTargetRight ? (x < 150 ? 0x07 : 0x0f) : (x > 98 ? 0x0b : 0x0f);
  if (frame % 128 < 48 && y > 142) stick &= 0x0e;
  else if (frame % 128 >= 80 && y < 184) stick &= 0x0d;
  return { stick, trigger };
}

function eventNames(frame) {
  const names = [];
  for (const [name, label] of [
    ["world-copy", "scroll_world_columns"],
    ["white-star-phase", "publish_dynamic_near_star_phase"],
    ["hull-copy", "scroll_hull_columns"],
    ["broadside", "update_broadside"],
    ["fighter-explosion", "render_shared_fighter_explosions"],
    ["capital-explosion", "render_capital_explosions"],
    ["music-row", "music_tick_gameplay"],
  ]) {
    if (frame.hits.has(label)) names.push(name);
  }
  if (frame.before.projectileOccupancy > 0) names.push("fighter-projectiles");
  if (frame.before.broadsideOccupancy === counts.broadsideSlots) names.push("three-broadside-slots");
  if (frame.before.liveInterceptor) names.push("live-interceptor");
  if (frame.before.activeExplosion) names.push("active-explosion");
  if (frame.before.musicWithSfx) names.push("music+sfx");
  if (frame.before.entityActiveCount > 0) names.push("active-debris");
  if (frame.hits.has("entity_spawn_debris")) names.push("debris-spawn");
  if (frame.hits.has("entity_damage_applied")) names.push("debris-contact");
  if (frame.hits.has("entity_debris_shot")) names.push("debris-shot");
  if (frame.hits.has("spawn_debris_destruction_effects")) names.push("debris-destruction");
  if (frame.before.effectActiveCount > 0) names.push("active-effects");
  return names;
}

function scenarioRecord(frame, optionPollCycles) {
  return {
    origin: frame.origin ?? "deterministic legal replay",
    session: frame.session,
    frame: frame.frame,
    activeCpuCycles: frame.cycles,
    mainLoopCpuCycles: frame.cycles + optionPollCycles,
    projectileOccupancy: frame.before.projectileOccupancy,
    player_fighterProjectileOccupancy: frame.before.player_fighterProjectileOccupancy,
    broadsideOccupancy: frame.before.broadsideOccupancy,
    renderedFarStars: frame.before.renderedFarStars,
    playerLifecycle: frame.before.playerLifecycle,
    entityActiveCount: frame.before.entityActiveCount,
    entityY: frame.before.entityY,
    effectActiveCount: frame.before.effectActiveCount,
    effectActiveMask: frame.before.effectActiveMask,
    events: eventNames(frame),
    procedureCycles: frame.procedureCycles,
    procedureTotalCycles: frame.procedureTotalCycles,
    procedureExclusiveCycles: frame.procedureExclusiveCycles,
    procedureCallCounts: frame.procedureCallCounts,
    procedureEdges: frame.procedureEdges,
    regionCycles: frame.regionCycles,
  };
}

function chooseMaximum(current, candidate, selector) {
  if (!current || selector(candidate) > selector(current)) return candidate;
  return current;
}

function measureDli(machine, entryPoints) {
  const bodyCycles = [];
  for (const phase of [0, 1]) {
    const cpu = machine.cpu.clone();
    const returnAddress = 0x7fff;
    cpu.memory[entryPoints.gameplayDliPhase] = phase;
    cpu.push(returnAddress >> 8);
    cpu.push(returnAddress & 0xff);
    cpu.push(cpu.p);
    cpu.pc = entryPoints.gameplayDli;
    const measurement = execute(cpu, { stopAddresses: [returnAddress] });
    bodyCycles.push(measurement.cycles);
  }
  const cpuAndEntryCycles = bodyCycles.reduce((sum, cycles) => sum + cycles, 0) +
    NMI_ENTRY_CYCLES * bodyCycles.length;
  return {
    bodyCycles,
    nmiEntryCycles: NMI_ENTRY_CYCLES * bodyCycles.length,
    cpuCycles: cpuAndEntryCycles,
    maximumWsyncStallCycles: MAX_WSYNC_STALL * bodyCycles.length,
    conservativeCycles: cpuAndEntryCycles + MAX_WSYNC_STALL * bodyCycles.length,
  };
}

function gameplayDmaCycles() {
  // Atari800's ANTIC model charges 9 refresh cycles per PAL scanline and five
  // single-line P/M cycles on the 240 display scanlines. In ANTIC 2/4 at normal
  // width, a complete eight-scanline character row costs 352 screen/font DMA
  // cycles: 40 screen-name fetches plus eight 40-byte font fetches, with the
  // documented first-line refresh overlap. The hybrid ring display list uses
  // one LMS instruction for the HUD, one fixed divider LMS and one for each
  // of the 27 rotating gameplay rows,
  // and a three-byte JVB.  Counting all operand fetches is important here:
  // this remains only an additive diagnostic, but it must describe the linked
  // display-list architecture accurately.
  const refresh = PAL_SCANLINES * ANTIC_REFRESH_CYCLES;
  const playerMissile = DMA_VISIBLE_SCANLINES * PMG_DMA_CYCLES;
  const screenAndFontPerRow = NORMAL_WIDTH_CHARACTERS * MODE_ROW_SCANLINES + 32;
  const screenAndFont = GAMEPLAY_MODE_ROWS * screenAndFontPerRow;
  const displayList = 3 + (GAMEPLAY_MODE_ROWS - 1) * 3 + 3;
  return {
    refresh,
    playerMissile,
    screenAndFont,
    displayList,
    total: refresh + playerMissile + screenAndFont + displayList,
  };
}

function protectedSegments(segmentSizes) {
  const definitions = [
    ["CODE", segmentSizes.code, 0x0f2d, 0x122d, null],
    ["RODATA", segmentSizes.rodata, 0x109f, 0x139f, null],
    ["MAIN", segmentSizes.code + segmentSizes.rodata, 0x1fcc, 0x2000, 0x2000],
    ["PROJECTILES", segmentSizes.projectiles, 0x00ca, 0x012a, 0x012a],
    ["STARFIELD", segmentSizes.starfield, 0x08d7, 0x08e6, 0x08e6],
    ["BROADSIDE", segmentSizes.broadside, 0x1953, 0x1a00, 0x1a00],
    ["A2_KERNEL", segmentSizes.a2Kernel, 0x0000, 0x0100, 0x0100],
    ["ENTITY_STATE", segmentSizes.entityState, 0x0100, 0x0100, 0x0100],
    ["ENTITY_CODE", segmentSizes.entityCode, 0x02ca, 0x05ca, 0x0f00],
    ["PICKUP_CODE", segmentSizes.pickupCode, 0x0000, 0x0800, 0x0800],
  ];
  return definitions.map(([
    name, bytes, featureStartBytes, acceptedMaximumBytes, reservedMaximumBytes,
  ]) => ({
    name,
    bytes,
    featureStartBytes,
    featureDeltaBytes: bytes - featureStartBytes,
    acceptedMaximumBytes,
    reservedMaximumBytes,
    freeReservedBytes: reservedMaximumBytes === null ? null : reservedMaximumBytes - bytes,
  }));
}

function runtimeRanges() {
  const ranges = [
    ["resident-code-data", 0x2000, 0x37ff, "unconditional"],
    ["player-missile-graphics", 0x3800, 0x3fff, "after-loader"],
    ["screen", 0x4000, 0x43ff, "after-loader"],
    ["gameplay-charset", 0x4400, 0x47ff, "after-loader"],
    ["frontend-charset", 0x4800, 0x4bff, "after-loader"],
    ["hulls-and-resident-state", 0x4c00, 0x4efd, "after-loader"],
    ["integration-glue", 0x4efe, 0x4f24, "after-loader"],
    ["hud-charset", 0x5000, 0x53ff, "after-loader"],
    ["projectile-state", 0x5400, 0x5529, "after-loader"],
    ["starfield-runtime", 0x552a, 0x5e0f, "after-loader"],
    ["broadside-runtime", 0x5e10, 0x780f, "after-loader"],
    ["staging-or-pause-backup", 0x7810, 0x7f0f, "after-loader"],
    ["hybrid-ring-display-state", 0x7f10, 0x7fda, "after-loader"],
    ["entity-effects-state", 0x8000, 0x80ff, "unconditional"],
    ["far-star-screen-cache", 0x8100, 0x812f, "after-loader"],
    ["future-entity-effects-state", 0x8130, 0x87ff, "unconditional"],
    ["pickup-and-collision-runtime", 0x8800, 0x8b87, "unconditional"],
    ["future-entity-effects-tail", 0x8b88, 0x8fff, "unconditional"],
    ["a2-kernel-code", 0x9000, 0x90ff, "unconditional"],
    ["entity-effects-code", 0x9100, 0x9d74, "unconditional"],
    ["encounter-director", 0x9d75, 0x9ff9, "unconditional"],
    ["director-guard", 0x9ffa, 0x9fff, "unconditional"],
  ].map(([name, start, end, availability]) => ({ name, start, end, bytes: end - start + 1, availability }));
  for (let index = 1; index < ranges.length; index += 1) {
    invariant(ranges[index - 1].end < ranges[index].start,
      `Runtime ranges ${ranges[index - 1].name} and ${ranges[index].name} overlap`);
  }
  return ranges;
}

export function measureRuntimeCycles(build) {
  const entryPoints = {
    startGameplay: requiredLabel(build.labels, "start_gameplay"),
    mainLoop: requiredLabel(build.labels, "main_loop"),
    optionPoll: requiredLabel(build.labels, "main_loop_option_poll"),
    activeFrame: requiredLabel(build.labels, "main_loop_active"),
    frontendLoop: requiredLabel(build.labels, "frontend_loop"),
    gameplayDli: requiredLabel(build.labels, "gameplay_dli"),
    gameplayDliPhase: requiredLabel(build.labels, "loader_dli_phase"),
    fighterProjectileActive: requiredLabel(build.labels, "FIGHTER_PROJECTILE_ACTIVE"),
    fighterProjectileX: requiredLabel(build.labels, "FIGHTER_PROJECTILE_X"),
    fighterProjectileY: requiredLabel(build.labels, "FIGHTER_PROJECTILE_Y"),
    fighterProjectilePreviousY: requiredLabel(build.labels, "FIGHTER_PROJECTILE_PREV_Y"),
    fighterProjectileLifetime: requiredLabel(build.labels, "FIGHTER_PROJECTILE_LIFETIME"),
    fighterProjectilePublicationFrame: requiredLabel(build.labels,
      "FIGHTER_PROJECTILE_PUBLICATION_FRAME"),
    fighterExplosionTimer: requiredLabel(build.labels, "FIGHTER_EXPLOSION_TIMER"),
    fireTimer: requiredLabel(build.labels, "fire_timer"),
    hitTimer: requiredLabel(build.labels, "hit_timer"),
    entityActiveCount: requiredLabel(build.labels, "ENTITY_ACTIVE_COUNT"),
    entityActiveMask: requiredLabel(build.labels, "ENTITY_ACTIVE_MASK"),
    entityState: requiredLabel(build.labels, "ENTITY_STATE"),
    entityY: requiredLabel(build.labels, "ENTITY_Y"),
    entitySpawnTimer: requiredLabel(build.labels, "ENTITY_SPAWN_TIMER_LO"),
    effectActiveCount: requiredLabel(build.labels, "EFFECT_ACTIVE_COUNT"),
    effectActiveMask: requiredLabel(build.labels, "EFFECT_ACTIVE_MASK"),
    entityTarget: requiredLabel(build.labels, "entity_player_fighter_projectile_target"),
    enemyTarget: requiredLabel(build.labels, "player_fighter_projectile_hits_enemy"),
  };
  const routineAddresses = new Map();
  for (const name of profiledRoutineNames) {
    const address = build.labels.get(name);
    if (Number.isInteger(address)) routineAddresses.set(address, name);
  }
  const regionAddresses = new Map([
    ["rotate_playfield_table_shift", {
      start: requiredLabel(build.labels, "rotate_playfield_table_shift"),
      end: requiredLabel(build.labels, "rotate_playfield_table_shift_end"),
    }],
  ]);
  const eventAddresses = new Map([
    [requiredLabel(build.labels, "entity_debris_shot"), "entity_debris_shot"],
    [requiredLabel(build.labels, "spawn_debris_destruction_effects"),
      "spawn_debris_destruction_effects"],
    [requiredLabel(build.labels, "materialize_interceptor_breakup_effects"),
      "materialize_interceptor_breakup_effects"],
  ]);

  const referenceMachine = initialiseGameplay(build, 1, entryPoints);
  const pollCpu = referenceMachine.cpu.clone();
  referenceMachine.io.console = 0xff;
  pollCpu.pc = entryPoints.optionPoll;
  pollCpu.a = 0;
  const pollMeasurement = execute(pollCpu, { stopAddresses: [entryPoints.activeFrame] });
  invariant(pollMeasurement.cycles === 13,
    `Released OPTION poll changed from 13 to ${pollMeasurement.cycles} cycles`);
  const optionPollCycles = pollMeasurement.cycles;

  const dli = measureDli(referenceMachine, entryPoints);
  const dma = gameplayDmaCycles();
  const frames = [];
  const procedureMaxima = new Map();
  const procedureMinima = new Map();
  let broadsideStressSeed;
  let broadsideStressSeedScore = -1;
  let projectileStressSeed;
  let projectileStressSeedScore = -1;
  const sessions = [
    { difficulty: 2, policy: "neutral", fireDelay: 0, frames: 760 },
    { difficulty: 2, policy: "contact-debris", fireDelay: 0, frames: 2000 },
    ...Array.from({ length: 8 }, (_, fireDelay) => ({
      difficulty: 2,
      policy: (fireDelay & 1) !== 0 && fireDelay !== 5 ? "evasive" : "sweep",
      fireDelay,
      frames: fireDelay === 4 ? 3000 : 1200,
    })),
    { difficulty: 1, policy: "evasive", fireDelay: 3, frames: 920 },
  ];

  for (const sessionDefinition of sessions) {
    const session = `${sessionDefinition.difficulty}-${sessionDefinition.policy}-fire${sessionDefinition.fireDelay}`;
    const machine = initialiseGameplay(build, sessionDefinition.difficulty, entryPoints);
    for (let frame = 0; frame < sessionDefinition.frames; frame += 1) {
      const input = frameInput(
        sessionDefinition.policy,
        frame,
        machine.cpu,
        sessionDefinition.fireDelay,
        sessionDefinition,
      );
      machine.io.stick = input.stick;
      machine.io.trigger = input.trigger;
      machine.io.console = 0xff;
      const before = snapshotRuntime(machine.cpu, entryPoints);
      const flyingBroadside = countNonZero(
        Uint8Array.from({ length: counts.broadsideSlots }, (_, index) =>
          machine.cpu.memory[addresses.broadState + index] === 2 ? 1 : 0),
        0,
        counts.broadsideSlots,
      );
      const broadsideSeedScore = before.broadsideOccupancy * 10 + flyingBroadside;
      if (broadsideSeedScore > broadsideStressSeedScore) {
        broadsideStressSeedScore = broadsideSeedScore;
        broadsideStressSeed = { cpu: machine.cpu.clone(), io: machine.io, session, frame };
      }
      if (before.projectileOccupancy > projectileStressSeedScore) {
        projectileStressSeedScore = before.projectileOccupancy;
        projectileStressSeed = { cpu: machine.cpu.clone(), io: machine.io, session, frame };
      }
      machine.cpu.a = 0;
      machine.cpu.pc = entryPoints.activeFrame;
      let measurement;
      try {
        measurement = execute(machine.cpu, {
          stopAddresses: [entryPoints.mainLoop, entryPoints.frontendLoop],
          routineAddresses,
          eventAddresses,
          regionAddresses,
        });
      }
      catch (error) {
        error.message += `; session=${session}; frame=${frame}; ` +
          `sector=${machine.cpu.memory[addresses.capitalSectorState]}; ` +
          `publication=${machine.cpu.memory[entryPoints.fighterProjectilePublicationFrame]}`;
        throw error;
      }
      if (measurement.stopAddress === entryPoints.frontendLoop) break;
      const record = {
        session,
        frame,
        before,
        after: snapshotRuntime(machine.cpu, entryPoints),
        cycles: measurement.cycles,
        hits: measurement.hits,
        procedureCycles: Object.fromEntries([...measurement.durations].map(([name, samples]) => [
          name,
          Math.max(...samples) + 6,
        ])),
        procedureTotalCycles: Object.fromEntries([...measurement.durations].map(([name, samples]) => [
          name,
          samples.reduce((sum, cycles) => sum + cycles + 6, 0),
        ])),
        procedureExclusiveCycles: Object.fromEntries([...measurement.exclusiveDurations]
          .map(([name, samples]) => [name, samples.reduce((sum, cycles) => sum + cycles, 0)])),
        procedureCallCounts: Object.fromEntries([...measurement.durations]
          .map(([name, samples]) => [name, samples.length])),
        procedureEdges: Object.fromEntries(measurement.callEdges),
        regionCycles: Object.fromEntries([...measurement.regionDurations]
          .map(([name, samples]) => [name, samples.reduce((sum, cycles) => sum + cycles, 0)])),
      };
      frames.push(record);
      for (const [name, samples] of measurement.durations) {
        const maximum = Math.max(...samples) + 6; // include the caller's JSR
        const minimum = Math.min(...samples) + 6;
        procedureMaxima.set(name, Math.max(procedureMaxima.get(name) ?? 0, maximum));
        procedureMinima.set(name, Math.min(procedureMinima.get(name) ?? Number.POSITIVE_INFINITY, minimum));
      }
    }
  }
  invariant(frames.length > 0, "Runtime timing replay produced no gameplay frames");

  // The short mixed-pressure comparison replay intentionally ends before the
  // row-1856 natural capital section. Its three-slot case is therefore an
  // explicit synthetic pool stress fixture, never legal gameplay evidence;
  // the artifact-bound Atari800 trace owns natural BROADSIDE coverage.
  invariant(broadsideStressSeed, "Replay did not produce a broadside stress seed; " +
    `last=${JSON.stringify(frames.at(-1)?.after ?? null)}`);
  const broadCpu = broadsideStressSeed.cpu;
  const broadMemory = broadCpu.memory;
  let sourceSlot = [0, 1, 2].find((slot) => broadMemory[addresses.broadState + slot] === 2) ??
    [0, 1, 2].find((slot) => broadMemory[addresses.broadState + slot] !== 0);
  if (!Number.isInteger(sourceSlot)) {
    sourceSlot = 0;
    for (const base of [0x4e40, 0x4e43, 0x4e46, 0x4e49, 0x4e4c, 0x4e4f,
      0x4e52, 0x4e55, 0x4e58, 0x4e69, 0x4e6c]) {
      broadMemory[base + sourceSlot] = 0;
    }
    broadMemory[addresses.broadState + sourceSlot] = 2;
    broadMemory[0x4e49 + sourceSlot] = 80;
    broadMemory[0x4e4c + sourceSlot] = 112;
    broadMemory[0x4e4f + sourceSlot] = 24;
  }
  for (const freeSlot of [0, 1, 2].filter((slot) =>
    broadMemory[addresses.broadState + slot] === 0)) {
    for (const base of [0x4e40, 0x4e43, 0x4e46, 0x4e49, 0x4e4c, 0x4e4f,
      0x4e52, 0x4e55, 0x4e58, 0x4e69, 0x4e6c]) {
      broadMemory[base + freeSlot] = broadMemory[base + sourceSlot];
    }
    broadMemory[addresses.broadState + freeSlot] = 2;
    broadMemory[0x4e49 + freeSlot] = 112 + freeSlot * 16;
    broadMemory[0x4e55 + freeSlot] = 0;
    broadMemory[0x4e58 + freeSlot] = 0;
  }
  invariant(countNonZero(broadMemory, addresses.broadState, counts.broadsideSlots) === 3,
    "Broadside stress fixture did not occupy all three slots");
  for (let slot = 0; slot < counts.broadsideSlots; slot += 1) {
    broadMemory[addresses.broadState + slot] = 2;
    broadMemory[0x4e49 + slot] = 80 + slot * 48;
    broadMemory[0x4e55 + slot] = 0;
    broadMemory[0x4e58 + slot] = 0;
    invariant(broadMemory[addresses.broadState + slot] >= 1 &&
      broadMemory[addresses.broadState + slot] <= 3,
    `Broadside stress slot ${slot} has an invalid lifecycle`);
    invariant(broadMemory[0x4e49 + slot] >= 48 && broadMemory[0x4e49 + slot] < 208,
      `Broadside stress slot ${slot} lies outside the reviewed HPOS range`);
  }
  broadsideStressSeed.io.stick = 0x0f;
  broadsideStressSeed.io.trigger = 0;
  broadsideStressSeed.io.console = 0xff;
  const broadBefore = snapshotRuntime(broadCpu, entryPoints);
  broadCpu.a = 0;
  broadCpu.pc = entryPoints.activeFrame;
  const broadMeasurement = execute(broadCpu, {
    stopAddresses: [entryPoints.mainLoop, entryPoints.frontendLoop],
    routineAddresses,
    eventAddresses,
    regionAddresses,
  });
  invariant(broadMeasurement.stopAddress === entryPoints.mainLoop,
    "Broadside stress frame left gameplay");
  const broadsideStressFrame = {
    origin: "synthetic fixed-pool cycle stress; excluded from natural gameplay evidence",
    session: `${broadsideStressSeed.session}-broadside-stress`,
    frame: broadsideStressSeed.frame,
    before: broadBefore,
    after: snapshotRuntime(broadCpu, entryPoints),
    cycles: broadMeasurement.cycles,
    hits: broadMeasurement.hits,
    procedureCycles: Object.fromEntries([...broadMeasurement.durations].map(([name, samples]) => [
      name,
      Math.max(...samples) + 6,
    ])),
    procedureTotalCycles: Object.fromEntries([...broadMeasurement.durations].map(([name, samples]) => [
      name,
      samples.reduce((sum, cycles) => sum + cycles + 6, 0),
    ])),
    procedureExclusiveCycles: Object.fromEntries([...broadMeasurement.exclusiveDurations]
      .map(([name, samples]) => [name, samples.reduce((sum, cycles) => sum + cycles, 0)])),
    procedureCallCounts: Object.fromEntries([...broadMeasurement.durations]
      .map(([name, samples]) => [name, samples.length])),
    procedureEdges: Object.fromEntries(broadMeasurement.callEdges),
    regionCycles: Object.fromEntries([...broadMeasurement.regionDurations]
      .map(([name, samples]) => [name, samples.reduce((sum, cycles) => sum + cycles, 0)])),
  };
  for (const [name, samples] of broadMeasurement.durations) {
    const maximum = Math.max(...samples) + 6;
    const minimum = Math.min(...samples) + 6;
    procedureMaxima.set(name, Math.max(procedureMaxima.get(name) ?? 0, maximum));
    procedureMinima.set(name, Math.min(procedureMinima.get(name) ?? Number.POSITIVE_INFINITY, minimum));
  }

  // Director policy can keep independently bounded projectile pools from
  // filling naturally in the short comparison replay. Exercise the existing
  // fixed pool at its reviewed maximum from a cloned legal frame; this remains
  // a reported stress scenario and is never eligible as legal-heavy evidence.
  invariant(projectileStressSeed, "Replay did not produce a projectile stress seed");
  const projectileCpu = projectileStressSeed.cpu;
  for (let slot = 0; slot < counts.projectileSlots; slot += 1) {
    projectileCpu.memory[entryPoints.fighterProjectileActive + slot] = 1;
    projectileCpu.memory[entryPoints.fighterProjectileX + slot] = 80 + slot * 4;
    projectileCpu.memory[entryPoints.fighterProjectileY + slot] = 104 + (slot & 3) * 8;
    projectileCpu.memory[entryPoints.fighterProjectilePreviousY + slot] =
      projectileCpu.memory[entryPoints.fighterProjectileY + slot];
    projectileCpu.memory[entryPoints.fighterProjectileLifetime + slot] = 24;
  }
  projectileStressSeed.io.stick = 0x0f;
  projectileStressSeed.io.trigger = 1;
  projectileStressSeed.io.console = 0xff;
  const projectileBefore = snapshotRuntime(projectileCpu, entryPoints);
  projectileCpu.a = 0;
  projectileCpu.pc = entryPoints.activeFrame;
  const projectileMeasurement = execute(projectileCpu, {
    stopAddresses: [entryPoints.mainLoop, entryPoints.frontendLoop],
    routineAddresses,
    eventAddresses,
    regionAddresses,
  });
  invariant(projectileMeasurement.stopAddress === entryPoints.mainLoop,
    "Projectile-pool stress frame left gameplay");
  const projectileStressFrame = {
    origin: "coherent fixed-pool stress fixture cloned from a legal director frame",
    session: `${projectileStressSeed.session}-projectile-stress`,
    frame: projectileStressSeed.frame,
    before: projectileBefore,
    after: snapshotRuntime(projectileCpu, entryPoints),
    cycles: projectileMeasurement.cycles,
    hits: projectileMeasurement.hits,
    procedureCycles: Object.fromEntries([...projectileMeasurement.durations].map(([name, samples]) => [
      name, Math.max(...samples) + 6,
    ])),
    procedureTotalCycles: Object.fromEntries([...projectileMeasurement.durations].map(([name, samples]) => [
      name, samples.reduce((sum, cycles) => sum + cycles + 6, 0),
    ])),
    procedureExclusiveCycles: Object.fromEntries([...projectileMeasurement.exclusiveDurations]
      .map(([name, samples]) => [name, samples.reduce((sum, cycles) => sum + cycles, 0)])),
    procedureCallCounts: Object.fromEntries([...projectileMeasurement.durations]
      .map(([name, samples]) => [name, samples.length])),
    procedureEdges: Object.fromEntries(projectileMeasurement.callEdges),
    regionCycles: Object.fromEntries([...projectileMeasurement.regionDurations]
      .map(([name, samples]) => [name, samples.reduce((sum, cycles) => sum + cycles, 0)])),
  };

  let worldNearFullErase;
  let hullEvent;
  let maximumProjectilePool = projectileStressFrame;
  let liveInterceptor;
  let activeExplosion;
  let musicWithSfx;
  let legalHeavy;
  let entityEmptyPath;
  let entityActivePath;
  let entitySpawnPath;
  let entityContactPath;
  let debrisShotPath;
  let debrisDestructionPath;
  let fullEffectsPath;
  let interceptorBreakupPath;
  let noPlayerFighterProjectilePath;
  for (const frame of frames) {
    if (frame.hits.has("scroll_world_columns") &&
      frame.hits.has("publish_dynamic_near_star_phase")) {
      worldNearFullErase = chooseMaximum(worldNearFullErase, frame, (candidate) => candidate.cycles);
    }
    if (frame.hits.has("scroll_hull_columns")) {
      hullEvent = chooseMaximum(hullEvent, frame, (candidate) => candidate.cycles);
    }
    maximumProjectilePool = chooseMaximum(maximumProjectilePool, frame, (candidate) =>
      candidate.before.projectileOccupancy * 100_000 + candidate.cycles);
    if (frame.before.liveInterceptor) {
      liveInterceptor = chooseMaximum(liveInterceptor, frame, (candidate) => candidate.cycles);
    }
    if (frame.before.activeExplosion) {
      activeExplosion = chooseMaximum(activeExplosion, frame, (candidate) => candidate.cycles);
    }
    if (frame.before.musicWithSfx) {
      musicWithSfx = chooseMaximum(musicWithSfx, frame, (candidate) => candidate.cycles);
    }
    if (frame.before.entityActiveCount === 0 && frame.before.weaponPickupState === 0 &&
      frame.after.weaponPickupState === 0 &&
      frame.before.weaponBoosterState === 0 && frame.after.weaponBoosterState === 0 &&
      frame.before.effectActiveCount === 0 &&
      frame.after.effectActiveCount === 0 &&
      !frame.hits.has("entity_spawn_debris")) {
      entityEmptyPath = chooseMaximum(entityEmptyPath, frame, (candidate) => candidate.cycles);
    }
    if (frame.before.entityActiveCount === 1 && !frame.hits.has("entity_damage_applied")) {
      entityActivePath = chooseMaximum(entityActivePath, frame, (candidate) => candidate.cycles);
    }
    if (frame.hits.has("entity_spawn_debris")) {
      entitySpawnPath = chooseMaximum(entitySpawnPath, frame, (candidate) => candidate.cycles);
    }
    if (frame.hits.has("entity_damage_applied")) {
      entityContactPath = chooseMaximum(entityContactPath, frame, (candidate) => candidate.cycles);
    }
    if (frame.hits.has("entity_debris_shot")) {
      debrisShotPath = chooseMaximum(debrisShotPath, frame, (candidate) => candidate.cycles);
    }
    if (frame.hits.has("spawn_debris_destruction_effects")) {
      debrisDestructionPath = chooseMaximum(debrisDestructionPath, frame,
        (candidate) => candidate.cycles);
    }
    if (frame.before.effectActiveCount === 5) {
      fullEffectsPath = chooseMaximum(fullEffectsPath, frame, (candidate) => candidate.cycles);
    }
    if (frame.hits.has("spawn_interceptor_breakup_effects")) {
      interceptorBreakupPath = chooseMaximum(interceptorBreakupPath, frame,
        (candidate) => candidate.cycles);
    }
    if (frame.before.player_fighterProjectileOccupancy === 0) {
      noPlayerFighterProjectilePath = chooseMaximum(noPlayerFighterProjectilePath, frame,
        (candidate) => candidate.cycles);
    }
    legalHeavy = chooseMaximum(legalHeavy, frame, (candidate) => candidate.cycles);
  }

  invariant(worldNearFullErase, "Replay did not reach a world event with row-baked far generation");
  invariant(hullEvent, "Replay did not reach a hull event");
  invariant(maximumProjectilePool?.before.projectileOccupancy === counts.projectileSlots,
    `Replay occupied ${maximumProjectilePool?.before.projectileOccupancy ?? 0}/` +
    `${counts.projectileSlots} fighter projectile slots`);
  invariant(liveInterceptor, "Replay did not retain a live release Interceptor");
  invariant(activeExplosion, "Replay did not reach an active explosion");
  invariant(musicWithSfx, "Replay did not overlap gameplay music with SFX");
  invariant(entityEmptyPath, "Replay did not execute the empty entity/effects path");
  invariant(entityActivePath, "Replay did not execute one active debris path");
  invariant(entitySpawnPath, "Replay did not execute debris spawn");
  invariant(entityContactPath, "Replay did not execute successful debris contact");
  invariant(debrisShotPath, "Replay did not execute PlayerFighter destruction of debris");
  invariant(debrisDestructionPath, "Replay did not execute final debris destruction");
  invariant(fullEffectsPath?.before.effectActiveMask === 0x1f,
    "Replay did not execute one core plus four debris fragments");
  invariant(interceptorBreakupPath &&
    interceptorBreakupPath.after.effectActiveMask ===
      interceptorBreakupPath.before.effectActiveMask &&
    interceptorBreakupPath.after.effectActiveCount ===
      interceptorBreakupPath.before.effectActiveCount,
  "Replay did not preserve the effect pool across character-free Raider destruction");
  invariant(noPlayerFighterProjectilePath, "Replay did not execute a frame without PlayerFighter projectiles");
  invariant(!noPlayerFighterProjectilePath.hits.has("entity_player_fighter_projectile_target"),
    "Debris projectile dispatch ran without an active PlayerFighter projectile");

  const measureRoutineCall = (address) => {
    const cpu = referenceMachine.cpu.clone();
    const stop = 0x7fff;
    cpu.memory[entryPoints.entityActiveMask] = 0;
    cpu.memory[entryPoints.entitySpawnTimer] = 32;
    cpu.x = 0;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = address;
    return execute(cpu, { stopAddresses: [stop] }).cycles;
  };
  const noDebrisDispatcherDelta = measureRoutineCall(entryPoints.entityTarget) -
    measureRoutineCall(entryPoints.enemyTarget);
  invariant(noDebrisDispatcherDelta <= 32,
    `No-debris projectile path added ${noDebrisDispatcherDelta}/32 CPU cycles`);

  const entityWrapperCycles = (frame) => [
    "entity_effects_erase", "entity_effects_update", "entity_effects_render",
  ].reduce((sum, name) => sum + (frame.procedureTotalCycles[name] ?? 0), 0);
  const emptyEnginePathCycles = entityWrapperCycles(entityEmptyPath);
  invariant(emptyEnginePathCycles <= 136,
    `Empty entity/effects path costs ${emptyEnginePathCycles} linked CPU cycles`);

  const heavyMainLoopCycles = legalHeavy.cycles + optionPollCycles;
  const fullPalCycles = heavyMainLoopCycles + dma.total + dli.conservativeCycles;
  const scenario = (frame) => scenarioRecord(frame, optionPollCycles);
  const segments = protectedSegments(build.segmentSizes);
  const ranges = runtimeRanges();

  return {
    method: "NMOS-6502 execution of linked release bytes with replayed legal gameplay sessions",
    palFrameCycles: PAL_FRAME_CYCLES,
    thresholdCycles: 32_500,
    cpuDmaOff: {
      optionPollCycles,
      heaviestActiveFrameCycles: legalHeavy.cycles,
      heaviestMainLoopCycles: heavyMainLoopCycles,
      gameplayMusicTickMinimumCycles: procedureMinima.get("music_tick_gameplay"),
      gameplayMusicTickMaximumCycles: procedureMaxima.get("music_tick_gameplay"),
      procedures: Object.fromEntries([...procedureMaxima].sort(([left], [right]) => left.localeCompare(right))),
    },
    estimatedAdditive: {
      mainLoopCycles: heavyMainLoopCycles,
      dma,
      dli,
      cycles: fullPalCycles,
      classification: "diagnostic estimate only; not a measured PAL frame or physical headroom",
    },
    legalHeavyCombination: scenario(legalHeavy),
    cpuReferenceFrames: [...frames]
      .sort((left, right) => right.cycles - left.cycles)
      .slice(0, 64)
      .map(scenario),
    scenarios: {
      worldNearFullErase: scenario(worldNearFullErase),
      hullEvent: scenario(hullEvent),
      maximumProjectilePool: scenario(maximumProjectilePool),
      threeBroadside: scenario(broadsideStressFrame),
      liveInterceptor: scenario(liveInterceptor),
      activeExplosion: scenario(activeExplosion),
      musicWithSfx: scenario(musicWithSfx),
      entityEmptyPath: scenario(entityEmptyPath),
      entityActivePath: scenario(entityActivePath),
      entitySpawnPath: scenario(entitySpawnPath),
      entityContactPath: scenario(entityContactPath),
      debrisShotPath: scenario(debrisShotPath),
      debrisDestructionPath: scenario(debrisDestructionPath),
      fullEffectsPath: scenario(fullEffectsPath),
      interceptorBreakupPath: scenario(interceptorBreakupPath),
      noPlayerFighterProjectilePath: scenario(noPlayerFighterProjectilePath),
    },
    entityEffects: {
      emptyPathCpuCycles: emptyEnginePathCycles,
      emptyPathLimitCpuCycles: 124,
      activePathCpuCycles: entityWrapperCycles(entityActivePath),
      spawnPathCpuCycles: entityWrapperCycles(entitySpawnPath),
      contactPathCpuCycles: entityWrapperCycles(entityContactPath),
      measurement: "inclusive JSR-to-RTS cycles from executed linked release bytes",
    },
    destructibleDebris: {
      noActiveDebrisPathDeltaCpuCycles: noDebrisDispatcherDelta,
      noActiveDebrisPathLimitCpuCycles: 32,
      noActivePlayerFighterProjectilePathDeltaCpuCycles: 0,
      noActivePlayerFighterProjectilePathLimitCpuCycles: 48,
      shotPathCpuCycles: debrisShotPath.procedureTotalCycles.entity_player_fighter_projectile_target,
      destructionPathCpuCycles:
        debrisDestructionPath.procedureTotalCycles.entity_player_fighter_projectile_target,
      fullEffectsPathCpuCycles: entityWrapperCycles(fullEffectsPath),
      measurement: "linked target dispatch versus the unchanged enemy-only entry",
    },
    enemyBreakupEffects: {
      noActiveExplosionPathCpuCycles: emptyEnginePathCycles,
      noActiveExplosionPathLimitCpuCycles: 124,
      spawnPathCpuCycles:
        interceptorBreakupPath.procedureTotalCycles.spawn_interceptor_breakup_effects,
      fullEffectsPathCpuCycles: entityWrapperCycles(interceptorBreakupPath),
      measurement: "linked release Raider death with no character-effect allocation",
    },
    replay: {
      sessions: sessions.map(({ difficulty, policy, fireDelay, frames: frameLimit }) => ({
        difficulty,
        policy,
        fireDelay,
        frameLimit,
      })),
      measuredFrames: frames.length,
      input: "release FIRE for one frame, then deterministic held-FIRE neutral/sweep/evasive joystick policies",
    },
    protectedSegments: segments,
    memory: {
      runtimeRanges: ranges,
      futureEntityEffectsRange: { start: 0x8000, end: 0x8fff, bytes: 0x1000 },
      entityEffectsStateRange: { start: 0x8000, end: 0x80ff, bytes: 0x0100 },
      entityEffectsCodeRange: { start: 0x9100, end: 0x9fff, bytes: 0x0f00 },
      // Owner decision B (2026-09-20) supersedes the old "conditional BASIC-ROM
      // window" entry. disable_basic_rom forces PORTB bit 1 and writes BASICF
      // at every stage-2 entry, so the range is unconditionally RAM; the build
      // owns $A000-$BC1F through the BASIC_WINDOW region, with $BC1A-$BC1F
      // reserved as its guard and $BC20-$BFFF left to the OS screen. No
      // runtime range lives there yet: this is declared capacity, not use, and
      // it is still excluded from the runtime-range list below.
      basicWindowRange: {
        start: 0xa000, guardStart: 0xbc1a, end: 0xbc1f, bytes: 0x1c1a,
        availability: "unconditional", inRuntimeRanges: false,
      },
      osScreenRange: { start: 0xbc20, end: 0xbfff, bytes: 0x03e0, owner: "OS, RAMTOP $C0" },
    },
    limitations: [
      "The legal-heavy result is the maximum of bounded deterministic replays, not a proof over every possible input history.",
      "CPU counts execute the linked NMOS 6502 bytes with DMA disabled for before/after comparison.",
      "estimatedAdditive is a diagnostic bus-budget sum, not a measured PAL frame and never a physical headroom value.",
      "The window under the BASIC ROM is unconditional RAM (owner decision B) and the build " +
        "owns $A000-$BC1F, but no runtime range uses it yet, so it contributes nothing to the " +
        "runtime ranges or the CPU accounting.",
    ],
  };
}

function parseSegmentSizes(mapText) {
  const sizes = {};
  for (const [key, name] of [
    ["code", "CODE"], ["rodata", "RODATA"], ["projectiles", "PROJECTILES"],
    ["starfield", "STARFIELD"], ["broadside", "BROADSIDE"],
    ["a2Kernel", "A2_KERNEL"], ["entityState", "ENTITY_STATE"],
    ["entityCode", "ENTITY_CODE"], ["pickupCode", "PICKUP_CODE"],
  ]) {
    const match = new RegExp(`^${name}\\s+[0-9A-F]+\\s+[0-9A-F]+\\s+([0-9A-F]+)`, "mi").exec(mapText);
    invariant(match, `Link map is missing ${name}`);
    sizes[key] = Number.parseInt(match[1], 16);
  }
  return sizes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const labels = parseViceLabels(fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8"));
  const report = measureRuntimeCycles({
    residentMain: fs.readFileSync(path.join(root, "build", "void-strike-65.bin")).subarray(0, 0x2000),
    loadAddress: 0x2000,
    broadsideRuntime: fs.readFileSync(path.join(root, "build", "broadside-runtime.bin")),
    broadsideRunAddress: requiredLabel(labels, "__BROADSIDE_RUN__"),
    starfieldRuntime: fs.readFileSync(path.join(root, "build", "starfield-runtime.bin")),
    starfieldRunAddress: requiredLabel(labels, "__STARFIELD_RUN__"),
    a2KernelRuntime: fs.readFileSync(path.join(root, "build", "a2-kernel-runtime.bin")),
    a2KernelRunAddress: requiredLabel(labels, "__A2_KERNEL_RUN__"),
    entityCodeRuntime: fs.readFileSync(path.join(root, "build", "entity-code-runtime.bin")),
    entityCodeRunAddress: requiredLabel(labels, "__ENTITY_CODE_RUN__"),
    weaponPickupPhaseBank: null,
    weaponPickupPhaseBankAddress: 0x8800,
    pickupCodeRuntime: fs.readFileSync(path.join(root, "build", "pickup-code-runtime.bin")),
    pickupCodeRunAddress: requiredLabel(labels, "__PICKUP_CODE_RUN__"),
    labels,
    segmentSizes: parseSegmentSizes(fs.readFileSync(path.join(root, "build", "void-strike-65.map"), "utf8")),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

export const runtimeTimingConstants = {
  palFrameCycles: PAL_FRAME_CYCLES,
  thresholdCycles: 32_500,
  releasedOptionMask: RELEASED_OPTION_LIMIT,
  addresses,
  counts,
};
