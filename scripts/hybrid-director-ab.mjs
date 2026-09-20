import fs from "node:fs";
import path from "node:path";

import { Nmos6502, nmos6502Flags } from "./nmos6502.mjs";

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseLabels(file) {
  const result = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match) result.set(match[2], Number.parseInt(match[1], 16));
  }
  return result;
}

function loadBuild(buildDirectory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(buildDirectory, "manifest.json"), "utf8"));
  const labels = new Map();
  for (const file of ["void-strike-65.lbl", "encounter-director.lbl",
    "integration-glue.lbl", "capital-player-collision.lbl"]) {
    for (const [name, address] of parseLabels(path.join(buildDirectory, file))) {
      labels.set(name, address);
    }
  }
  const memory = new Uint8Array(0x10000);
  const segments = [
    ["resident-runtime.bin", manifest.residentRuntime.runAddress],
    ["starfield-runtime.bin", manifest.starfieldRuntime.runAddress],
    ["broadside-runtime.bin", manifest.broadsideRuntime.runAddress],
    ["a2-kernel-runtime.bin", manifest.a2Kernel.runAddress],
    ["entity-code-runtime.bin", manifest.entityEffects.codeRunAddress],
    ["weapon-pickup-phase-runtime.bin", manifest.entityEffects.pickupPhaseBankAddress],
    ["integration-glue.bin", manifest.integrationGlue.finalAddress],
    ...(manifest.directorCodeRuntimes ?? (manifest.directorCodeRuntime == null ? [] : [{
      file: "encounter-director-code.bin",
      runAddress: manifest.directorCodeRuntime.runAddress,
    }])).map((runtime) => [runtime.file, runtime.runAddress]),
    ["encounter-director.bin", manifest.directorRuntime.runAddress],
    ["capital-player-collision.bin", manifest.capitalPlayerCollisionRuntime.runAddress],
  ];
  for (const [file, address] of segments) {
    memory.set(fs.readFileSync(path.join(buildDirectory, file)), address);
  }
  return { buildDirectory, manifest, labels, memory };
}

function run(build, target, { a = 0, x = 0, y = 0 } = {}) {
  const address = typeof target === "string" ? build.labels.get(target) : target;
  invariant(Number.isInteger(address), `Missing ${target} in ${build.buildDirectory}`);
  const cpu = new Nmos6502(build.memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  for (let steps = 0; steps < 300_000 && cpu.pc !== stop; steps += 1) {
    invariant(build.memory[cpu.pc] !== 0,
      `${target} reached BRK at $${cpu.pc.toString(16)}`);
    cpu.step();
  }
  invariant(cpu.pc === stop, `${target} did not return`);
  return { a: cpu.a, x: cpu.x, y: cpu.y,
    carry: (cpu.p & nmos6502Flags.carry) !== 0, cycles: cpu.cycles };
}

const semanticRanges = [
  [0x4e40, 0x4eda, "shared-sector"],
  [0x4ff8, 0x4ffa, "active-frame"],
  [0x5400, 0x548a, "fighter-pools"],
  [0x8000, 0x80f4, "entity-effects"],
  [0x80f4, 0x8100, "director-state"],
  [0x85ae, 0x85e6, "ring-publication"],
];

function compareSemantic(left, right) {
  const differences = [];
  for (const [start, end, owner] of semanticRanges) {
    for (let address = start; address < end; address += 1) {
      if (left.memory[address] !== right.memory[address]) {
        differences.push({ address, owner, asm: left.memory[address], c: right.memory[address] });
      }
    }
  }
  return differences;
}

function callBoth(left, right, target, registers) {
  const asmResult = run(left, target, registers);
  const cResult = run(right, target, registers);
  return { asmResult, cResult, differences: compareSemantic(left, right) };
}

function recordCycles(report, step, result) {
  const timing = report.replay.cycles.byStep[step] ??= {
    asmMax: 0, cMax: 0, maximumDelta: Number.NEGATIVE_INFINITY,
  };
  timing.asmMax = Math.max(timing.asmMax, result.asmResult.cycles);
  timing.cMax = Math.max(timing.cMax, result.cResult.cycles);
  timing.maximumDelta = Math.max(timing.maximumDelta,
    result.cResult.cycles - result.asmResult.cycles);
}

function initialize(build, difficulty) {
  build.memory[build.labels.get("DIFFICULTY_SETTING")] = difficulty;
  build.memory[build.labels.get("PLAYER_LIFECYCLE")] = 0;
  run(build, "init_playfield_row_table");
  run(build, "init_playfield_display_lists");
  run(build, "init_state");
  run(build, "unpack_capital_hull_maps");
  run(build, "director_init", { a: 0x6d ^ difficulty });
  run(build, "init_broadside");
}

function main() {
  const asmDirectory = path.resolve(argument("asm-build") ?? "");
  const cDirectory = path.resolve(argument("c-build") ?? "build");
  invariant(argument("asm-build"), "Pass --asm-build=<saved ASM build directory>");
  const report = {
    format: "void-strike-65-hybrid-director-ab-v1",
    asm: { role: "pre-change", implementation: null, buildDirectory: asmDirectory },
    c: { role: "candidate", implementation: null, buildDirectory: cDirectory },
    replay: { difficulties: [], directorReplay: [], divergenceCount: 0, firstDivergence: null,
      lifecycleReplay: [], cycles: { byStep: {}, maximumDelta: null } },
  };
  report.asm.implementation = loadBuild(asmDirectory).manifest.encounterDirector.implementation;
  report.c.implementation = loadBuild(cDirectory).manifest.encounterDirector.implementation;
  const steps = ["integration_active_gameplay_tick", "integration_update_first_capital",
    "tick_launch_flashes", "update_broadside", "update_starfield", "entity_effects_update",
    "render_launch_flashes", "integration_update_sector_completion"];
  for (const difficulty of [0, 1, 2]) {
    const asm = loadBuild(asmDirectory);
    const c = loadBuild(cDirectory);
    initialize(asm, difficulty);
    initialize(c, difficulty);
    let comparedFrames = 0;
    let comparedCalls = 0;
    for (let frame = 1; frame <= 10_000; frame += 1) {
      const frameCounter = asm.labels.get("frame_counter");
      asm.memory[frameCounter] = (asm.memory[frameCounter] + 1) & 0xff;
      c.memory[frameCounter] = (c.memory[frameCounter] + 1) & 0xff;
      for (const step of steps) {
        const result = callBoth(asm, c, step);
        recordCycles(report, step, result);
        comparedCalls += 1;
        if (result.differences.length !== 0) {
          report.replay.divergenceCount += result.differences.length;
          report.replay.firstDivergence ??= {
            difficulty, frame, step, differences: result.differences.slice(0, 16),
            asmRegisters: result.asmResult, cRegisters: result.cResult,
          };
          break;
        }
      }
      comparedFrames += 1;
      if (report.replay.firstDivergence !== null) break;
      const sector = asm.memory[asm.labels.get("CAPITAL_SECTOR_STATE")];
      const intensity = asm.memory[0x80f8];
      if (sector >= 6 && intensity === 0 && frame > 600) break;
    }
    report.replay.difficulties.push({ difficulty, comparedFrames, comparedCalls });
    if (report.replay.firstDivergence !== null) break;
  }
  if (report.replay.firstDivergence === null) for (const difficulty of [0, 1, 2]) {
    const asm = loadBuild(asmDirectory);
    const c = loadBuild(cDirectory);
    initialize(asm, difficulty);
    initialize(c, difficulty);
    const initial = compareSemantic(asm, c);
    invariant(initial.length === 0, "Director replay initialization diverged");
    let eventTransitions = 0;
    let admissions = 0;
    let releases = 0;
    let previousEvent = asm.memory[0x80f7];
    const rngSequence = [];
    for (let row = 1; row <= 3712; row += 1) {
      const frameCounter = asm.labels.get("frame_counter");
      asm.memory[frameCounter] = row & 0xff;
      c.memory[frameCounter] = row & 0xff;
      const tick = callBoth(asm, c, "director_world_row_tick");
      recordCycles(report, "director_world_row_tick", tick);
      if (tick.differences.length !== 0) {
        report.replay.divergenceCount += tick.differences.length;
        report.replay.firstDivergence = { difficulty, row,
          step: "director_world_row_tick", differences: tick.differences.slice(0, 16) };
        break;
      }
      if (asm.memory[0x80f7] !== previousEvent) {
        eventTransitions += 1;
        previousEvent = asm.memory[0x80f7];
      }
      if (row % 17 === 0) {
        const hazard = (row / 17) & 3;
        const request = callBoth(asm, c, "director_request", { x: hazard });
        recordCycles(report, "director_request", request);
        if (request.differences.length !== 0 || request.asmResult.carry !== request.cResult.carry) {
          report.replay.divergenceCount += Math.max(1, request.differences.length);
          report.replay.firstDivergence = { difficulty, row, step: "director_request",
            differences: request.differences.slice(0, 16), asm: request.asmResult,
            c: request.cResult };
          break;
        }
        if (request.asmResult.carry) {
          admissions += 1;
          rngSequence.push(asm.memory[0x80fb]);
          const release = callBoth(asm, c, "director_release", { x: hazard });
          recordCycles(report, "director_release", release);
          releases += 1;
          if (release.differences.length !== 0) {
            report.replay.divergenceCount += release.differences.length;
            report.replay.firstDivergence = { difficulty, row, step: "director_release",
              differences: release.differences.slice(0, 16) };
            break;
          }
        }
      }
    }
    report.replay.directorReplay.push({ difficulty, worldRows: 3712,
      eventTransitions, admissions, releases, finalPhase: asm.memory[0x80f6],
      finalEventIndex: asm.memory[0x80f7], finalFlags: asm.memory[0x80fe],
      finalRng: asm.memory[0x80fb], rngSequence });
    if (report.replay.firstDivergence !== null) break;
  }
  if (report.replay.firstDivergence === null) for (const difficulty of [0, 1, 2]) {
    const asm = loadBuild(asmDirectory);
    const c = loadBuild(cDirectory);
    initialize(asm, difficulty);
    initialize(c, difficulty);
    const sectorAddress = asm.labels.get("CAPITAL_SECTOR_STATE");
    const activeAddress = asm.labels.get("ENEMY_ACTIVE");
    const memberAddress = asm.labels.get("ENEMY_MEMBER_STATE");
    let priorSector = asm.memory[sectorAddress];
    let priorActive = asm.memory[activeAddress];
    const sectorTransitions = [];
    const raiderAdmissions = [];
    const raiderRecycles = [];
    const lifecycleSteps = ["integration_active_gameplay_tick",
      "integration_update_first_capital", "integration_update_enemy", "update_starfield",
      "integration_update_sector_completion"];
    let comparedFrames = 0;
    let comparedCalls = 0;
    for (let frame = 1; frame <= 2_400; frame += 1) {
      const frameCounter = asm.labels.get("frame_counter");
      asm.memory[frameCounter] = (asm.memory[frameCounter] + 1) & 0xff;
      c.memory[frameCounter] = (c.memory[frameCounter] + 1) & 0xff;
      for (const step of lifecycleSteps) {
        const result = callBoth(asm, c, step);
        recordCycles(report, `lifecycle:${step}`, result);
        comparedCalls += 1;
        if (result.differences.length !== 0) {
          report.replay.divergenceCount += result.differences.length;
          report.replay.firstDivergence = { difficulty, frame, step,
            differences: result.differences.slice(0, 16) };
          break;
        }
      }
      comparedFrames += 1;
      if (report.replay.firstDivergence !== null) break;
      const sector = asm.memory[sectorAddress];
      const active = asm.memory[activeAddress];
      if (sector !== priorSector) {
        sectorTransitions.push({ frame, from: priorSector, to: sector });
        priorSector = sector;
      }
      if (priorActive !== 1 && active === 1) {
        raiderAdmissions.push({ frame,
          memberState: [...asm.memory.subarray(memberAddress, memberAddress + 2)] });
      } else if (priorActive !== 0 && active === 0) {
        raiderRecycles.push(frame);
      }
      priorActive = active;
    }
    report.replay.lifecycleReplay.push({ difficulty, comparedFrames, comparedCalls,
      sectorTransitions, raiderAdmissions, raiderRecycles,
      finalSector: asm.memory[sectorAddress], finalEnemyActive: asm.memory[activeAddress],
      finalMemberState: [...asm.memory.subarray(memberAddress, memberAddress + 2)],
      finalRng: asm.memory[0x80fb] });
    if (report.replay.firstDivergence !== null) break;
  }
  report.replay.cycles.maximumDelta = Object.entries(report.replay.cycles.byStep)
    .map(([step, timing]) => ({ step, cycles: timing.maximumDelta }))
    .sort((left, right) => right.cycles - left.cycles)[0] ?? null;
  const reportBytes = `${JSON.stringify(report, null, 2)}\n`;
  const output = argument("output");
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(path.resolve(output), reportBytes);
  }
  process.stdout.write(reportBytes);
  if (report.replay.divergenceCount !== 0) process.exitCode = 1;
}

main();
