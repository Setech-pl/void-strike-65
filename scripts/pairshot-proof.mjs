import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Nmos6502 } from "./nmos6502.mjs";
import {
  initialiseRuntime,
  requiredLabel,
  runRoutine,
} from "./weapon-pickup-runtime.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");
const SCREEN_RANGES = [[0x4028, 0x4050], [0x8140, 0x8578]];

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function isScreenAddress(address) {
  return SCREEN_RANGES.some(([start, end]) => address >= start && address < end);
}

function countChanged(before, after) {
  let changed = 0;
  for (const [start, end] of SCREEN_RANGES) {
    for (let address = start; address < end; address += 1) {
      if (before[address] !== after[address]) changed += 1;
    }
  }
  return changed;
}

function runProfiledRoutine(memory, labels, name) {
  const writes = [];
  const pointerBegin = labels.get("initialize_projectile_screen_pointer");
  const pointerEnd = labels.get("profile_projectile_pointer_end");
  const pointerSamples = [];
  let pointerStartCycles = null;
  const cpu = new Nmos6502(memory, {
    write(address, value, machine) {
      if (isScreenAddress(address)) writes.push({ address, value, pc: machine.pc });
    },
  });
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = requiredLabel(labels, name);
  for (let steps = 0; steps < 500_000 && cpu.pc !== stop; steps += 1) {
    if (cpu.pc === pointerBegin) pointerStartCycles = cpu.cycles;
    if (cpu.pc === pointerEnd && pointerStartCycles !== null) {
      pointerSamples.push(cpu.cycles - pointerStartCycles);
      pointerStartCycles = null;
    }
    cpu.step();
  }
  if (cpu.pc !== stop) throw new Error(`${name} did not return`);
  return { cycles: cpu.cycles, screenWrites: writes.length, pointerSamples };
}

function seedProjectiles(runtime, { player, enemy, spillPhase = true }) {
  const { memory, labels, manifest } = runtime;
  const active = requiredLabel(labels, "FIGHTER_PROJECTILE_ACTIVE");
  const xAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_X");
  const yAddress = requiredLabel(labels, "FIGHTER_PROJECTILE_Y");
  const previousY = requiredLabel(labels, "FIGHTER_PROJECTILE_PREV_Y");
  const lifetime = requiredLabel(labels, "FIGHTER_PROJECTILE_LIFETIME");
  const totalSlots = manifest.fighterWeapons.poolSlots.total;
  const playerSlots = manifest.fighterWeapons.poolSlots.player_fighter;
  memory.fill(0, active, active + totalSlots);
  memory[requiredLabel(labels, "ENEMY_ACTIVE")] = 0;
  memory[requiredLabel(labels, "ENTITY_ACTIVE_MASK")] = 0;
  memory[requiredLabel(labels, "player_x")] = 200;
  memory[requiredLabel(labels, "player_y")] = 200;
  const seed = (slot, owner, index, isEnemy) => {
    const phase = isEnemy ? 6 : 7;
    const y = 40 + index * 16 + (spillPhase ? phase : 0);
    memory[active + slot] = owner;
    memory[xAddress + slot] = isEnemy ? 48 + index * 4 : 120 + index * 4;
    memory[yAddress + slot] = y;
    memory[previousY + slot] = y;
    memory[lifetime + slot] = 96;
  };
  for (let index = 0; index < player; index += 1) seed(index, 1, index, false);
  for (let index = 0; index < enemy; index += 1) {
    seed(playerSlots + index, 2, index, true);
  }
}

function measureScenario(root, counts) {
  const runtime = initialiseRuntime(root, "xex");
  seedProjectiles(runtime, counts);
  const before = Uint8Array.from(runtime.memory);
  const render = runProfiledRoutine(runtime.memory, runtime.labels,
    "render_fighter_projectile_overlays");
  const afterRender = Uint8Array.from(runtime.memory);
  const erase = runProfiledRoutine(runtime.memory, runtime.labels,
    "erase_fighter_projectile_overlays");
  const afterErase = Uint8Array.from(runtime.memory);

  const updateRuntime = initialiseRuntime(root, "xex");
  seedProjectiles(updateRuntime, counts);
  const playerCollision = runRoutine(updateRuntime.memory, updateRuntime.labels,
    "entity_player_fighter_projectile_target", { x: 0 });
  const enemySlot = updateRuntime.manifest.fighterWeapons.poolSlots.player_fighter;
  const enemyCollision = runRoutine(updateRuntime.memory, updateRuntime.labels,
    "interceptor_projectile_hits_player", { x: enemySlot });
  const update = runRoutine(updateRuntime.memory, updateRuntime.labels,
    "update_fighter_projectiles");
  const collision = counts.player * (playerCollision + 6) + counts.enemy * (enemyCollision + 6);
  return {
    counts,
    renderCycles: render.cycles,
    eraseCycles: erase.cycles,
    publicationCycles: render.cycles + erase.cycles,
    updateCycles: update,
    collisionCycles: collision,
    simulationAndBookkeepingCycles: update - collision,
    playerCollisionMissCyclesPerObject: playerCollision + 6,
    enemyCollisionMissCyclesPerObject: enemyCollision + 6,
    renderScreenWrites: render.screenWrites,
    eraseScreenWrites: erase.screenWrites,
    dynamicCells: countChanged(before, afterRender),
    restoredCellMismatches: countChanged(before, afterErase),
    addressResolveCycles: render.pointerSamples,
  };
}

export function measurePairShotProof(root = defaultRoot) {
  root = path.resolve(root);
  const manifest = JSON.parse(fs.readFileSync(
    path.join(root, "dist", "void-strike-65-manifest.json"), "utf8"));
  const playerLimit = manifest.fighterWeapons.activeLimits.player_fighter;
  const enemyLimit = manifest.fighterWeapons.activeLimits.interceptor;
  const scenarios = {
    empty: measureScenario(root, { player: 0, enemy: 0 }),
    playerNormal: measureScenario(root, {
      player: manifest.fighterWeapons.player_fighter.burstCount,
      enemy: 0,
    }),
    playerRapid: measureScenario(root, {
      player: Math.min(playerLimit,
        manifest.fighterWeapons.player_fighter.rapidFireBurstCount),
      enemy: 0,
    }),
    playerSpread: measureScenario(root, {
      player: Math.min(playerLimit,
        manifest.fighterWeapons.player_fighter.spreadShotBurstCount),
      enemy: 0,
    }),
    enemyMaximum: measureScenario(root, { player: 0, enemy: enemyLimit }),
    combinedMaximum: measureScenario(root, { player: playerLimit, enemy: enemyLimit }),
  };
  return {
    schema: "void-strike-65.pairshot-proof-measurement.v1",
    root,
    artifact: manifest.artifacts["void-strike-65.xex"],
    fighterWeapons: manifest.fighterWeapons,
    scenarios,
  };
}

function main() {
  process.stdout.write(`${JSON.stringify(measurePairShotProof(
    argumentValue("root") ?? defaultRoot), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
