// Roadmap 4.6 step 2 — the level-1 event timeline probe.
//
// The reproduction gate of step 2 asks a question the existing tooling could
// not answer on its own: does level 1 still produce the SAME spawns, in the
// same frames, at the same positions, once the Director reads its schedule
// from the level image instead of from LEVEL1_DATA? The native wall trace
// answers it for one scripted replay in minutes of emulator time;
// scripts/hybrid-director-ab.mjs answers a narrower question (do two Director
// implementations agree call for call) and records only Heavy admissions.
//
// This probe is the cheap deterministic middle: it drives the REAL runtime
// image in scripts/nmos6502.mjs through a reduced main loop - the same five
// steps the A/B harness's lifecycle replay uses - with one fixed kill policy,
// and records every spawn the default build can produce:
//
//   * Heavy formation admissions (ENEMY_ACTIVE 0 -> 1): frame, world row,
//     archetype offset, roster shape and the archetype NAME that follows from
//     it, movement id (the "path"), member X/Y. Read `archetype`, not
//     `archetypeOffset`: the offset is the Director's published byte and a
//     wave arm in the same frame can leave it one wave ahead of the formation
//     (the record below says why);
//   * Light admissions (light_state[slot] 0 -> nonzero): frame, world row,
//     slot, archetype offset, movement id, X/Y;
//   * capital sector-state transitions, so the capital arrival frame is read
//     from the same run;
//   * the level-complete flag ($80FE bit 0).
//
// It takes no build flag and pokes no gameplay state beyond the kill policy,
// which is applied identically on both sides of a comparison. Run it against
// two build directories and diff the JSON.
//
//   node scripts/level-timeline.mjs --build=build --frames=9000 > timeline.json
//   node scripts/level-timeline.mjs --build=build --difficulty=1

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502, nmos6502Flags } from "./nmos6502.mjs";
import { installRuntimeSegments } from "./runtime-image.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found === undefined ? fallback : found.slice(prefix.length);
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

// The world row advances at world_scroll_rates[difficulty] * 2 over
// HULL_SCROLL_RATE_DENOMINATOR (40) in update_starfield, i.e. rate/20 rows per
// active gameplay frame, and the capital branch uses hull_scroll_rates, which
// build/capital-hulls.inc pins to exactly the same fraction. The probe does
// not model it: it calls update_starfield and reads the row the Director
// itself keeps.
const STATE = {
  rowLo: 0x80f4, rowHi: 0x80f5, phase: 0x80f6, event: 0x80f7,
  intensity: 0x80f8, reaction: 0x80f9, recovery: 0x80fa, rng: 0x80fb,
  pending: 0x80fc, defer: 0x80fd, flags: 0x80fe, admissionFrame: 0x80ff,
};
const FLAG_COMPLETE = 0x01;
const LIGHT_SLOT_COUNT = 4;
// How long the probe lets an admitted Light live before it retires it (below).
const LIGHT_LIFETIME_FRAMES = 64;

function loadLabels(buildDirectory) {
  const labels = new Map();
  for (const file of ["void-strike-65.lbl", "encounter-director.lbl",
    "integration-glue.lbl", "capital-player-collision.lbl", "light-kernel.lbl"]) {
    const full = path.join(buildDirectory, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
      if (match) labels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  return labels;
}

function makeRunner(memory, labels) {
  return function run(target, { a = 0, x = 0, y = 0 } = {}) {
    const address = typeof target === "string" ? labels.get(target) : target;
    invariant(Number.isInteger(address), `missing routine ${target}`);
    const cpu = new Nmos6502(memory);
    const stop = 0x7fff;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = address;
    cpu.a = a; cpu.x = x; cpu.y = y;
    for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) {
      invariant(memory[cpu.pc] !== 0, `${target} reached BRK at $${cpu.pc.toString(16)}`);
      cpu.step();
    }
    invariant(cpu.pc === stop, `${target} did not return`);
    return { a: cpu.a, x: cpu.x, y: cpu.y,
      carry: (cpu.p & nmos6502Flags.carry) !== 0, cycles: cpu.cycles };
  };
}

// The archetype record's movement_id is the closest thing the shipped build
// has to a "path": it is the byte the renderer dispatches a member's motion
// on. For a Heavy the published profile carries it; for a Light it is read out
// of the record the slot's archetype offset names.
function movementIdOf(memory, labels, archetypeOffset) {
  const table = labels.get("enemy_archetype_table") ?? labels.get("_enemy_archetypes");
  if (!Number.isInteger(table)) return null;
  return memory[table + archetypeOffset + 1];
}

export function captureTimeline({ buildDirectory, difficulty = 1, frames = 9000,
  killPolicy = true } = {}) {
  const memory = new Uint8Array(0x10000);
  const runtime = installRuntimeSegments(memory, path.resolve(buildDirectory, ".."));
  const labels = loadLabels(buildDirectory);
  const run = makeRunner(memory, labels);

  const frameCounter = labels.get("frame_counter");
  const enemyActive = labels.get("ENEMY_ACTIVE");
  const enemyArchetype = labels.get("ENEMY_ARCHETYPE");
  const enemyMemberState = labels.get("ENEMY_MEMBER_STATE");
  const enemyX = labels.get("ENEMY_X");
  const enemyY = labels.get("ENEMY_Y");
  const enemyHp = labels.get("ENEMY_HP");
  const enemyTargetSlot = labels.get("ENEMY_TARGET_SLOT");
  const sectorState = labels.get("CAPITAL_SECTOR_STATE");
  const heavyArchetypeOffset = labels.get("heavy_archetype_offset") ??
    labels.get("_heavy_archetype_offset");
  const movementId = labels.get("enemy_profile_movement_id") ??
    labels.get("_enemy_profile_movement_id");
  const lightState = labels.get("light_state") ?? labels.get("_light_state");
  const lightArchetype = labels.get("light_archetype_offset") ?? labels.get("_light_archetype");
  const lightX = labels.get("light_x") ?? labels.get("_light_x");
  const lightY = labels.get("light_y") ?? labels.get("_light_y");
  const lightScreenHi = labels.get("light_screen_hi") ?? labels.get("_light_screen_hi");

  memory[labels.get("DIFFICULTY_SETTING")] = difficulty;
  memory[labels.get("PLAYER_LIFECYCLE")] = 0;
  run("init_playfield_row_table");
  run("init_playfield_display_lists");
  run("init_state");
  run("init_entity_effects");
  run("unpack_capital_hull_maps");
  run("director_init", { a: 0x6d ^ difficulty });
  run("init_broadside");

  // The main loop's order (src/main.s main_loop), reduced to the steps that
  // decide a spawn: the active-gameplay clock, the explosion tick that lets a
  // dead formation recycle, the capital entry, the Heavy admission, the world
  // row (update_starfield calls integration_director_world_row), the Light
  // tick and wave, and the sector completion. Rendering, input and collision
  // are left out - they change nothing the Director reads.
  const lightUpdate = labels.get("LIGHT_KERNEL_UPDATE") ??
    labels.get("entity_effects_update");
  const steps = ["integration_active_gameplay_tick", "tick_shared_fighter_explosions",
    "tick_capital_explosions", "integration_update_first_capital",
    "integration_update_enemy", "update_starfield", lightUpdate,
    "integration_update_sector_completion"];

  const heavySpawns = [];
  const lightSpawns = [];
  const sectorTransitions = [];
  const kills = [];
  let completeFrame = null;
  let priorActive = memory[enemyActive];
  let priorSector = memory[sectorState];
  const priorLight = Array.from({ length: LIGHT_SLOT_COUNT },
    (_, slot) => memory[lightState + slot]);
  const lightSpawnFrame = new Array(LIGHT_SLOT_COUNT).fill(null);

  const worldRow = () => memory[STATE.rowLo] | (memory[STATE.rowHi] << 8);

  for (let frame = 1; frame <= frames; frame += 1) {
    memory[frameCounter] = (memory[frameCounter] + 1) & 0xff;
    for (const step of steps) run(step);

    const active = memory[enemyActive];
    if (priorActive !== 1 && active === 1) {
      heavySpawns.push({
        frame, row: worldRow(),
        // The Director's PUBLISHED byte, and it can be one wave AHEAD of the
        // formation this record describes. director_c_try_event publishes
        // heavy_archetype_offset when a wave is ARMED, and the row tick may
        // arm the next wave in the same frame in which the previous wave's
        // last formation was spawned - enemy_c_spawn_raiders has already read
        // the byte by then, but this sample has not. Kept because it is what
        // the Director decided; never used as the formation's identity.
        archetypeOffset: memory[heavyArchetypeOffset],
        // The identity the formation was actually BUILT with: ENEMY_ARCHETYPE
        // is written by enemy_c_spawn_raiders from heavy_roster_shape[], and
        // it is the byte every renderer path indexes. 0 is the Raider body,
        // 2 the Bomber body (lifecycle.c ROSTER_SHAPE_*). This, not the
        // published offset, is what the player sees.
        rosterShape: memory[enemyArchetype],
        archetype: memory[enemyArchetype] === 2 ? "bomber" : "raider",
        movementId: memory[movementId],
        members: [0, 1].map((slot) => ({
          state: memory[enemyMemberState + slot],
          x: memory[enemyX + slot], y: memory[enemyY + slot],
          hp: memory[enemyHp + slot],
        })),
      });
    }
    priorActive = active;

    for (let slot = 0; slot < LIGHT_SLOT_COUNT; slot += 1) {
      const value = memory[lightState + slot];
      if (priorLight[slot] === 0 && value !== 0) {
        const offset = memory[lightArchetype + slot];
        lightSpawns.push({
          frame, row: worldRow(), slot, archetypeOffset: offset,
          lightState: value,
          movementId: movementIdOf(memory, labels, offset),
          x: memory[lightX + slot], y: memory[lightY + slot],
        });
      }
      if (priorLight[slot] === 0 && value !== 0) lightSpawnFrame[slot] = frame;
      priorLight[slot] = value;
    }

    const sector = memory[sectorState];
    if (sector !== priorSector) {
      sectorTransitions.push({ frame, row: worldRow(), from: priorSector, to: sector });
      priorSector = sector;
    }

    if (completeFrame === null && (memory[STATE.flags] & FLAG_COMPLETE) !== 0) {
      completeFrame = { frame, row: worldRow() };
    }

    // One fixed kill policy, applied identically to every build under test:
    // the first live member that has cleared the gameplay top edge takes
    // lethal damage. Without it ENEMY_ACTIVE never returns to 0 and the
    // admission cadence - the thing this probe exists to compare - is never
    // exercised a second time.
    if (killPolicy && active === 1) {
      const target = [0, 1].find((slot) =>
        memory[enemyMemberState + slot] === 1 && memory[enemyY + slot] + 14 > 16);
      if (target !== undefined) {
        memory[enemyTargetSlot] = target;
        memory[labels.get("ENEMY_PENDING_DAMAGE") + target] = 0;
        memory[labels.get("ENEMY_PENDING_SOURCE") + target] = 5;
        run("queue_enemy_damage", { a: memory[enemyHp + target], y: 0 });
        run("resolve_enemy_damage");
        kills.push({ frame, slot: target });
      }
    }
    // The Light half of the same policy. A Light is retired directly rather
    // than through enemy_c_light_hit because the probe does not run the late
    // publication window, which is where the real kill's erase clears
    // light_screen_hi - and sector_c_drain_clear reads BOTH. Without this the
    // capital entry can never be reached in the probe: CAPITAL_DUE is raised
    // and the drain never clears. It is a probe poke, applied identically to
    // every build compared, never a build flag.
    if (killPolicy && lightState !== undefined) {
      for (let slot = 0; slot < LIGHT_SLOT_COUNT; slot += 1) {
        if (memory[lightState + slot] !== 0 &&
          frame - (lightSpawnFrame[slot] ?? frame) >= LIGHT_LIFETIME_FRAMES) {
          memory[lightState + slot] = 0;
          memory[lightScreenHi + slot] = 0;
          kills.push({ frame, light: slot });
        }
      }
    }
  }

  return {
    format: "void-strike-65-level-timeline-v1",
    buildDirectory: path.relative(rootDirectory, path.resolve(buildDirectory)) || "build",
    director: runtime.manifest.encounterDirector?.implementation ?? null,
    difficulty, frames, killPolicy,
    finalRow: worldRow(),
    finalSectorState: memory[sectorState],
    finalFlags: memory[STATE.flags],
    completeFrame,
    heavySpawns, lightSpawns, sectorTransitions,
    killCount: kills.length,
  };
}

function main() {
  const buildDirectory = path.resolve(argument("build", path.join(rootDirectory, "build")));
  const frames = Number.parseInt(argument("frames", "9000"), 10);
  const difficulties = argument("difficulty") === null
    ? [0, 1, 2]
    : [Number.parseInt(argument("difficulty"), 10)];
  const report = {
    format: "void-strike-65-level-timeline-v1",
    buildDirectory: path.relative(rootDirectory, buildDirectory) || "build",
    frames,
    runs: difficulties.map((difficulty) =>
      captureTimeline({ buildDirectory, difficulty, frames })),
  };
  const bytes = `${JSON.stringify(report, null, 2)}\n`;
  const output = argument("output");
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(path.resolve(output), bytes);
  } else {
    process.stdout.write(bytes);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
