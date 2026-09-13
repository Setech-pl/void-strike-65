import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "./nmos6502.mjs";
import {
  initialiseRuntime,
  requiredLabel,
} from "./weapon-pickup-runtime.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");
const AUDF1 = 0xd200;
const AUDC1 = 0xd201;
const TRIG0 = 0xd010;
const CAPITAL_OPEN = 7;

function runTracedRoutine(memory, labels, name, { x = 0 } = {}) {
  const writes = [];
  const cpu = new Nmos6502(memory, {
    write(address, value, executingCpu) {
      if ([AUDF1, AUDC1, requiredLabel(labels, "fire_timer")].includes(address)) {
        writes.push({
          pc: (executingCpu.pc - 1) & 0xffff,
          address,
          before: memory[address],
          after: value,
        });
      }
    },
  });
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  cpu.x = x;
  for (let steps = 0; steps < 400_000 && cpu.pc !== stop; steps += 1) cpu.step();
  if (cpu.pc !== stop) throw new Error(`${name} did not return`);
  return { cycles: cpu.cycles, writes };
}

function countActive(memory, base, count) {
  let active = 0;
  for (let slot = 0; slot < count; slot += 1) active += memory[base + slot] !== 0;
  return active;
}

function histogram(values) {
  return Object.fromEntries([...new Set(values)].sort((a, b) => a - b)
    .map((value) => [value, values.filter((candidate) => candidate === value).length]));
}

export function executeTransitionCatchupProof({
  root = defaultRoot,
  artifact = "xex",
} = {}) {
  const run = ({ sector, burstState, burstRemaining, burstTimer }) => {
    const { memory, labels, manifest } = initialiseRuntime(root, artifact, 0xa5);
    const activeAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
    const stateAddress = requiredLabel(labels, "PLAYER_FIGHTER_BURST_STATE");
    const remainingAddress = requiredLabel(labels, "PLAYER_FIGHTER_BURST_REMAINING");
    const timerAddress = requiredLabel(labels, "PLAYER_FIGHTER_BURST_TIMER");
    memory[requiredLabel(labels, "CAPITAL_SECTOR_STATE")] = sector;
    memory[stateAddress] = burstState;
    memory[remainingAddress] = burstRemaining;
    memory[timerAddress] = burstTimer;
    memory[requiredLabel(labels, "sound_enabled")] = 1;
    const beforeActive = countActive(memory, activeAddress,
      manifest.fighterWeapons.player_fighter.poolSlots);
    const result = runTracedRoutine(memory, labels, "player_fire_transition_tick");
    return {
      sector,
      state_before: burstState,
      state_after: memory[stateAddress],
      remaining_before: burstRemaining,
      remaining_after: memory[remainingAddress],
      timer_before: burstTimer,
      timer_after: memory[timerAddress],
      allocated: countActive(memory, activeAddress,
        manifest.fighterWeapons.player_fighter.poolSlots) - beforeActive,
      shot_sfx_triggered: result.writes.some(({ address, after }) =>
        address === requiredLabel(labels, "fire_timer") && after === 0x32),
      cycles: result.cycles,
    };
  };
  return {
    open_noop: run({ sector: CAPITAL_OPEN, burstState: 1, burstRemaining: 2,
      burstTimer: 2 }),
    released_noop: run({ sector: 0, burstState: 0, burstRemaining: 0,
      burstTimer: 0 }),
    active_advance: run({ sector: 0, burstState: 1, burstRemaining: 2,
      burstTimer: 2 }),
    active_emit: run({ sector: 0, burstState: 1, burstRemaining: 2,
      burstTimer: 1 }),
  };
}

function executeMode({
  root, artifact, mode, boosterState, frames, transitionFrame,
  movement = "STATIONARY", boosterExpiryFrame = null,
}) {
  const { memory, labels, manifest } = initialiseRuntime(root, artifact, 0xa5);
  const activeAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const burstStateAddress = requiredLabel(labels, "PLAYER_FIGHTER_BURST_STATE");
  const burstRemainingAddress = requiredLabel(labels, "PLAYER_FIGHTER_BURST_REMAINING");
  const burstTimerAddress = requiredLabel(labels, "PLAYER_FIGHTER_BURST_TIMER");
  const fireTimerAddress = requiredLabel(labels, "fire_timer");
  const sectorAddress = requiredLabel(labels, "CAPITAL_SECTOR_STATE");
  const ringFlagsAddress = requiredLabel(labels, "PLAYFIELD_RING_FLAGS");
  const frameCounterAddress = requiredLabel(labels, "frame_counter");
  const boosterAddress = requiredLabel(labels, "ENTITY_STATE") + 2;
  const boosterTimerLo = requiredLabel(labels, "ENTITY_TIMER") + 2;
  const boosterTimerHi = requiredLabel(labels, "ENTITY_MOVE_ACCUMULATOR") + 2;
  const playerSlots = manifest.fighterWeapons.player_fighter.poolSlots;
  memory[requiredLabel(labels, "sound_enabled")] = 1;
  memory[fireTimerAddress] = 0;
  memory[AUDF1] = 0;
  memory[AUDC1] = 0;
  memory[boosterAddress] = boosterState;
  if (boosterState !== 0) {
    const lifetime = boosterExpiryFrame === null ? frames + 2 : boosterExpiryFrame + 1;
    memory[boosterTimerLo] = lifetime & 0xff;
    memory[boosterTimerHi] = lifetime >> 8;
  }
  memory[sectorAddress] = CAPITAL_OPEN;
  memory[TRIG0] = 0;

  const records = [];
  const acceptedFrames = [];
  const audibleTriggerFrames = [];
  const toneCompletions = [];
  let sequenceId = 0;
  let activeSequence = null;
  let denied = 0;
  let maximumPool = 0;
  const slotBirthFrames = Array(playerSlots).fill(null);
  const slotLifetimes = [];

  for (let frame = 0; frame < frames; frame += 1) {
    const direction = movement === "LEFT" ? -2 : movement === "RIGHT" ? 2 :
      movement === "REVERSAL" ? (Math.floor(frame / 23) & 1 ? -2 : 2) : 0;
    memory[requiredLabel(labels, "player_x")] = Math.max(48,
      Math.min(200, memory[requiredLabel(labels, "player_x")] + direction));
    if (frame === transitionFrame) memory[sectorAddress] = 1;
    const sector = memory[sectorAddress];
    const stateBefore = memory[burstStateAddress];
    const remainingBefore = memory[burstRemainingAddress];
    const cooldownBefore = memory[burstTimerAddress];
    const fireTimerBefore = memory[fireTimerAddress];
    const activeBefore = countActive(memory, activeAddress, playerSlots);
    const activeSlotsBefore = Array.from(memory.subarray(activeAddress,
      activeAddress + playerSlots));
    const requestedSpawn = stateBefore === 0 || stateBefore === 1 && cooldownBefore <= 1 ||
      stateBefore === 2 && cooldownBefore <= 1;

    const erase = runTracedRoutine(memory, labels, "erase_fighter_projectile_overlays");
    const update = runTracedRoutine(memory, labels, "update_fighter_projectiles");
    const activeSlotsAfterUpdate = Array.from(memory.subarray(activeAddress,
      activeAddress + playerSlots));
    const freedSlots = activeSlotsAfterUpdate.flatMap((value, slot) =>
      activeSlotsBefore[slot] !== 0 && value === 0 ? [slot] : []);
    for (const slot of freedSlots) {
      if (slotBirthFrames[slot] !== null) slotLifetimes.push(frame - slotBirthFrames[slot]);
      slotBirthFrames[slot] = null;
    }
    const weapon = runTracedRoutine(memory, labels, "update_player_fighter_weapon");
    const activeSlotsAfter = Array.from(memory.subarray(activeAddress,
      activeAddress + playerSlots));
    const allocatedSlots = activeSlotsAfter.flatMap((value, slot) =>
      activeSlotsAfterUpdate[slot] === 0 && value !== 0 ? [slot] : []);
    for (const slot of allocatedSlots) slotBirthFrames[slot] = frame;
    const accepted = allocatedSlots.length > 0;
    const soundTriggered = weapon.writes.some(({ address, after }) =>
      address === fireTimerAddress && after === 0x32);
    if (accepted) acceptedFrames.push(frame);
    if (soundTriggered) {
      audibleTriggerFrames.push(frame);
      if (activeSequence !== null) {
        activeSequence.restartFrame = frame;
        activeSequence.completed = fireTimerBefore === 0x38;
        activeSequence.endFrame = frame - 1;
        toneCompletions.push(activeSequence);
      }
      activeSequence = { id: ++sequenceId, startFrame: frame, tones: [] };
    }
    if (requestedSpawn && !accepted) denied += 1;

    const audio = runTracedRoutine(memory, labels, "update_sound");
    const audible = memory[AUDC1] !== 0;
    if (activeSequence !== null && audible) {
      const tone = memory[AUDF1];
      if (activeSequence.tones.at(-1) !== tone) activeSequence.tones.push(tone);
    }
    if (activeSequence !== null && memory[fireTimerAddress] === 0) {
      activeSequence.endFrame = frame;
      activeSequence.completed = memory[AUDC1] === 0;
      toneCompletions.push(activeSequence);
      activeSequence = null;
    }

    const activeAfter = countActive(memory, activeAddress, playerSlots);
    maximumPool = Math.max(maximumPool, activeAfter);
    const worldStep = ((frame * 9) % 20) >= 11;
    records.push({
      frame,
      absolute_frame: frame,
      sector,
      transition_state: frame === transitionFrame ? "FIGHTER_TO_CAPITAL" : "",
      fire_raw: 0,
      fire_accepted: accepted,
      weapon_mode: mode,
      live_weapon_state: memory[boosterAddress],
      player_x: memory[requiredLabel(labels, "player_x")],
      fire_cooldown_before: cooldownBefore,
      fire_cooldown_after: memory[burstTimerAddress],
      active_pairshots_before: activeBefore,
      active_pairshots_after: activeAfter,
      free_pairshot_slots: playerSlots - activeBefore,
      requested_spawn: requestedSpawn,
      successful_spawn: accepted,
      denied_reason: requestedSpawn && !accepted ?
        (activeBefore === playerSlots ? "POOL_FULL" : "NO_ALLOCATION") : "",
      allocated_slots: allocatedSlots,
      freed_slots: freedSlots,
      world_step: worldStep,
      ring_step: worldStep,
      publication_wait_begin: sector === CAPITAL_OPEN ? "$77/end" : "$70/start",
      publication_wait_end: sector === CAPITAL_OPEN ? "$77/end" : "$70/start",
      active_work_cycles: erase.cycles + update.cycles + weapon.cycles + audio.cycles,
      shot_sfx_trigger: soundTriggered,
      sfx_sequence_id: activeSequence?.id ?? sequenceId,
      sfx_phase_before: fireTimerBefore === 0 ? -1 : fireTimerBefore - 0x32,
      sfx_phase_after: memory[fireTimerAddress] === 0 ? -1 :
        memory[fireTimerAddress] - 0x32,
      sfx_expected_tones: 6,
      audf1: memory[AUDF1],
      audc1: memory[AUDC1],
      audf_audc_writes: [...weapon.writes, ...audio.writes],
      sfx_restart: soundTriggered && fireTimerBefore !== 0 && fireTimerBefore !== 0x38,
      sfx_cancel_reason: soundTriggered && fireTimerBefore !== 0 && fireTimerBefore !== 0x38 ?
        "NEW_ACCEPTED_SHOT" :
        (!audible && fireTimerBefore !== 0 ? "SEQUENCE_END" : ""),
      frame_counter: memory[frameCounterAddress],
      ring_flags: memory[ringFlagsAddress],
      burst_state_before: stateBefore,
      burst_state_after: memory[burstStateAddress],
      burst_remaining_before: remainingBefore,
      burst_remaining_after: memory[burstRemainingAddress],
    });
    if (memory[boosterAddress] !== 0) {
      runTracedRoutine(memory, labels, "update_weapon_booster_active",
        { x: memory[boosterAddress] });
    }
    memory[frameCounterAddress] = (memory[frameCounterAddress] + 1) & 0xff;
  }
  if (activeSequence !== null) toneCompletions.push({ ...activeSequence, truncatedByTrace: true });
  const deltas = acceptedFrames.slice(1).map((frame, index) => frame - acceptedFrames[index]);
  const audibleDeltas = audibleTriggerFrames.slice(1)
    .map((frame, index) => frame - audibleTriggerFrames[index]);
  return {
    mode,
    movement,
    boosterExpiryFrame,
    frames,
    transitionFrame,
    requested_interval_frames: boosterState === 3 ? 6 : boosterState === 4 ? 28 : 9,
    post_burst_frames: 12,
    accepted_shots: acceptedFrames.length,
    accepted_frames: acceptedFrames,
    successful_interval_histogram: histogram(deltas),
    audible_trigger_interval_histogram: histogram(audibleDeltas),
    denied_admissions: denied,
    maximum_pool_occupancy: maximumPool,
    completed_projectile_lifetimes: slotLifetimes.length,
    projectile_lifetime_frames: {
      minimum: Math.min(...slotLifetimes),
      maximum: Math.max(...slotLifetimes),
      average: slotLifetimes.reduce((sum, value) => sum + value, 0) / slotLifetimes.length,
    },
    complete_sfx_sequences: toneCompletions.filter(({ completed }) => completed).length,
    restarted_sfx_sequences: records.filter(({ sfx_restart }) => sfx_restart).length,
    sfx_sequences: toneCompletions,
    transition_window: records.filter(({ frame }) =>
      frame >= transitionFrame - 30 && frame < transitionFrame + 60),
    records,
  };
}

export function executePlayerFireAudioTrace({
  root = defaultRoot,
  artifact = "xex",
  frames = 500,
  transitionFrame = 260,
} = {}) {
  return {
    artifact,
    frames,
    transitionFrame,
    modes: ["STATIONARY", "LEFT", "RIGHT", "REVERSAL"].flatMap((movement) => [
      executeMode({ root, artifact, mode: "NORMAL", boosterState: 0, frames,
        transitionFrame, movement }),
      executeMode({ root, artifact, mode: "RAPID", boosterState: 3, frames,
        transitionFrame, movement }),
      executeMode({ root, artifact, mode: "SPREAD", boosterState: 4, frames,
        transitionFrame, movement }),
    ]),
    expiry_at_transition: [
      executeMode({ root, artifact, mode: "RAPID_TO_NORMAL", boosterState: 3, frames,
        transitionFrame, boosterExpiryFrame: transitionFrame, movement: "REVERSAL" }),
      executeMode({ root, artifact, mode: "SPREAD_TO_NORMAL", boosterState: 4, frames,
        transitionFrame, boosterExpiryFrame: transitionFrame, movement: "REVERSAL" }),
    ],
  };
}

export function playerFireAudioTraceCsv(trace) {
  const fields = [
    "frame", "absolute_frame", "sector", "transition_state", "fire_raw", "fire_accepted",
    "weapon_mode", "fire_cooldown_before", "fire_cooldown_after", "active_pairshots_before",
    "active_pairshots_after", "free_pairshot_slots", "requested_spawn", "successful_spawn",
    "denied_reason", "allocated_slots", "world_step", "ring_step", "publication_wait_begin",
    "publication_wait_end", "active_work_cycles", "shot_sfx_trigger", "sfx_sequence_id",
    "sfx_phase_before", "sfx_phase_after", "sfx_expected_tones", "audf1", "audc1",
    "sfx_restart", "sfx_cancel_reason", "burst_state_before", "burst_state_after",
    "burst_remaining_before", "burst_remaining_after",
  ];
  const rows = [fields.join(",")];
  for (const mode of [...trace.modes, ...trace.expiry_at_transition]) for (const record of mode.records) {
    rows.push(fields.map((field) => {
      const value = record[field];
      return Array.isArray(value) ? value.join("|") : value;
    }).join(","));
  }
  return `${rows.join("\n")}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputDirectory = path.join(defaultRoot, "build", "player-fire-audio-trace");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const trace = executePlayerFireAudioTrace();
  fs.writeFileSync(path.join(outputDirectory, "trace.json"), `${JSON.stringify(trace, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDirectory, "trace.csv"), playerFireAudioTraceCsv(trace));
  const summary = [...trace.modes, ...trace.expiry_at_transition].map((mode) => ({
    mode: mode.mode,
    movement: mode.movement,
    accepted_shots: mode.accepted_shots,
    successful_intervals: mode.successful_interval_histogram,
    denied: mode.denied_admissions,
    maximum_pool: mode.maximum_pool_occupancy,
    complete_sfx: mode.complete_sfx_sequences,
    restarted_sfx: mode.restarted_sfx_sequences,
  }));
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}
