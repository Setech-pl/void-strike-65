// Steps 4.3 and 4.5a native write-watch proof for reusable resident capacity.
//
// Builds a private Atari800 7.1.2 copy with scripts/atari800-capacity-watch.h
// and runs the current dist XEX and ATR through cold start, OPTIONS, BACK,
// START, gameplay, pause/resume, game over, menu, START, pause/quit and menu.
// Every emulated instruction compares the GLUE holding range (from the end of
// the hold copy until GLUE publication) and the capacity window (from GLUE
// publication to the end of the lifecycle) against their last observed bytes.
//
//   node scripts/capacity-window-watch.mjs [--atari800-source=DIR]
//     [--hold=0x8300] [--hold-bytes=250] [--window=0x8602] [--window-bytes=248]
//     [--expect-hold-is-glue] [--expect-window-is-hold] [--expect-window-bin=FILE]
//     [--inject=0xSTART:BYTES] [--output=FILE]
//
// 4.5a Heavy window: --hold=0x8400 --hold-bytes=243 --window=0x7e12
// --window-bytes=243 --expect-window-is-hold --inject=0x7e38:243 writes a
// deterministic non-zero pattern over the staged image when publish_director_abi
// starts, so the full capacity must cross both boot copies byte-exactly.
// Every session must also enter and complete at least one capital sector.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDirectory = path.join(rootDirectory, "build", "capacity-watch");
const headerPath = path.join(rootDirectory, "scripts", "atari800-capacity-watch.h");
const GLUE_FINAL = 0x4efe;
const GLUE_BYTES = 250;
const PLAYER_LIVES = 0x4eab;
const CAPITAL_SECTOR_STATE = 0x4ea5;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDirectory,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return result;
}

function prepareEmulator(sourceDirectory) {
  const workDirectory = path.join(buildDirectory, "atari800");
  if (!fs.existsSync(path.join(workDirectory, "src", "cpu.c"))) {
    invariant(fs.existsSync(path.join(sourceDirectory, "src", "cpu.c")),
      `Atari800 source is missing: ${sourceDirectory}`);
    fs.mkdirSync(buildDirectory, { recursive: true });
    fs.cpSync(sourceDirectory, workDirectory, { recursive: true });
  }
  const cpuText = fs.readFileSync(path.join(workDirectory, "src", "cpu.c"), "utf8");
  invariant(cpuText.includes('#include "voidstrike65_trace.h"') &&
    cpuText.includes("DFTrace_Observe(GET_PC(), A, X, Y, S);"),
  "Atari800 copy lacks the prepared trace hook; prepare it with runtime-wall-trace --prepare first");
  const destination = path.join(workDirectory, "src", "voidstrike65_trace.h");
  const header = fs.readFileSync(headerPath);
  if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(header)) {
    fs.writeFileSync(destination, header);
    fs.rmSync(path.join(workDirectory, "src", "atari800-cpu.o"), { force: true });
  }
  const make = run("make", ["-j4"], { cwd: workDirectory });
  invariant(make.status === 0, `Atari800 build failed:\n${make.stdout}\n${make.stderr}`);
  return path.join(workDirectory, "src", "atari800");
}

function readLabels() {
  const labels = new Map();
  for (const line of fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"),
    "utf8").split(/\r?\n/)) {
    const match = /^al ([0-9A-F]+) \.(\S+)$/.exec(line);
    if (match && !labels.has(match[2])) labels.set(match[2], parseInt(match[1], 16));
  }
  return labels;
}

function hex(value) {
  return `0x${value.toString(16)}`;
}

function main() {
  const sourceDirectory = path.resolve(argumentValue("atari800-source") ??
    process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2");
  const holdStart = Number(argumentValue("hold") ?? 0x8300);
  const windowStart = Number(argumentValue("window") ?? 0x8602);
  const windowBytes = Number(argumentValue("window-bytes") ?? 248);
  const holdBytes = Number(argumentValue("hold-bytes") ?? GLUE_BYTES);
  const expectHoldIsGlue = process.argv.includes("--expect-hold-is-glue");
  const expectWindowIsHold = process.argv.includes("--expect-window-is-hold");
  const injectArgument = argumentValue("inject");
  const injection = injectArgument === undefined ? null : (() => {
    const [start, bytes] = injectArgument.split(":").map(Number);
    invariant(Number.isInteger(start) && Number.isInteger(bytes) && bytes > 0 && bytes <= 256,
      `invalid --inject=${injectArgument}`);
    return { start, bytes,
      pattern: Buffer.from(Array.from({ length: bytes }, (_, index) => (index * 37 + 0x5b) & 0xff)) };
  })();
  const expectWindowPath = argumentValue("expect-window-bin");
  const outputPath = path.resolve(argumentValue("output") ??
    path.join(buildDirectory, "capacity-window-watch.json"));
  const expectedWindow = expectWindowPath === undefined ? null :
    fs.readFileSync(path.resolve(expectWindowPath));

  const emulatorPath = prepareEmulator(sourceDirectory);
  const labels = readLabels();
  const label = (name) => {
    invariant(Number.isInteger(labels.get(name)), `label ${name} is missing`);
    return hex(labels.get(name));
  };
  const environment = {
    DFCAP_GAME_STATE: label("game_state"),
    DFCAP_FRONTEND_SELECTION: label("frontend_selection"),
    DFCAP_FRONTEND_INPUT_ARMED: label("frontend_input_armed"),
    DFCAP_PLAYER_LIVES: hex(PLAYER_LIVES),
    DFCAP_PC_FRONTEND_POLL: label("frontend_input_poll"),
    DFCAP_PC_PAUSE_POLL: label("pause_frontend_input_poll"),
    DFCAP_PC_HOLD_DONE: label("stage_starfield_stream"),
    DFCAP_PC_PUBLISH_DONE: label("layout_d_glue_publish_complete"),
    DFCAP_PC_START: label("start"),
    DFCAP_PC_ABI_PUBLISH: label("publish_director_abi"),
    DFCAP_PC_ENTITY_UNPACK_DONE: label("layout_d_entity_unpack_complete"),
    DFCAP_PC_PICKUP_UNPACK: label("unpack_weapon_pickup_phase_runtime"),
    DFCAP_PC_GLUE_HOLDING_DONE: label("layout_d_glue_holding_complete"),
    DFCAP_PC_SHOW_LOADER: label("show_loader"),
    DFCAP_PC_STARFIELD_UNPACK: label("unpack_starfield_runtime"),
    DFCAP_HOLD_START: hex(holdStart),
    DFCAP_HOLD_BYTES: String(holdBytes),
    DFCAP_CAPITAL_STATE: hex(CAPITAL_SECTOR_STATE),
    ...(injection === null ? {} : {
      DFCAP_INJECT_PC: label("publish_director_abi"),
      DFCAP_INJECT_START: hex(injection.start),
      DFCAP_INJECT_BYTES: String(injection.bytes),
    }),
    DFCAP_GLUE_FINAL: hex(GLUE_FINAL),
    DFCAP_WINDOW_START: hex(windowStart),
    DFCAP_WINDOW_BYTES: String(windowBytes),
  };
  const clockNames = ["start", "publish_director_abi", "layout_d_entity_unpack_complete",
    "unpack_weapon_pickup_phase_runtime", "layout_d_glue_holding_complete", "show_loader",
    "unpack_starfield_runtime", "layout_d_glue_publish_complete"];

  const xexPath = path.join(rootDirectory, "dist", "void-strike-65.xex");
  const atrPath = path.join(rootDirectory, "dist", "void-strike-65.atr");
  const sessions = [];
  for (const artifact of [
    { medium: "XEX", args: ["-run", xexPath] },
    { medium: "ATR", args: [atrPath] },
  ]) {
    for (const fill of [0x00, 0xa5]) {
      const id = `${artifact.medium.toLowerCase()}-${fill.toString(16).padStart(2, "0")}`;
      const rawPath = path.join(buildDirectory, `${id}.json`);
      fs.rmSync(rawPath, { force: true });
      const result = run(emulatorPath, [
        "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
        ...artifact.args,
      ], {
        env: {
          ...process.env,
          SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
          ...environment,
          DFCAP_OUTPUT: rawPath,
          DFCAP_ARTIFACT: id,
          DFCAP_RAM_FILL: String(fill),
        },
      });
      invariant(fs.existsSync(rawPath),
        `${id} produced no report (status ${result.status}):\n${result.stderr}`);
      const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
      const clock = Object.fromEntries(raw.startup_clock.map((point, index) =>
        [clockNames[index], point.seen ? point.clock : null]));
      const holdWrites = raw.writes.filter((write) => write.range === "hold");
      const windowWrites = raw.writes.filter((write) => write.range === "window");
      const windowInitial = Buffer.from(raw.window.initial_hex, "hex");
      const windowFinal = Buffer.from(raw.window.final_hex, "hex");
      const holdInitial = Buffer.from(raw.hold.initial_hex, "hex");
      const checks = {
        lifecycle_completed: raw.status === 0,
        hold_observed: raw.hold.seen === 1,
        hold_untouched_until_publish: holdWrites.length === 0 && raw.hold.intact_at_publish === 1,
        glue_final_matches_hold: expectHoldIsGlue ? raw.hold.glue_final_matches_hold === 1 : null,
        window_published_from_hold: expectWindowIsHold ?
          raw.hold.window_matches_hold === 1 && windowInitial.subarray(0, holdBytes)
            .equals(holdInitial) : null,
        injection_applied: injection === null ? null : raw.injection.done === 1,
        hold_carries_injected_pattern: injection === null ? null :
          holdInitial.subarray(0, injection.bytes).equals(injection.pattern),
        window_carries_injected_pattern: injection === null ? null :
          windowInitial.subarray(0, injection.bytes).equals(injection.pattern),
        capital_sector_completed: raw.capital.entries >= 1 && raw.capital.completions >= 1,
        window_observed: raw.window.seen === 1,
        window_untouched_after_publish: windowWrites.length === 0 &&
          windowInitial.equals(windowFinal) && raw.writes_dropped === 0,
        window_matches_linked_image: expectedWindow === null ? null :
          windowInitial.subarray(0, expectedWindow.length).equals(expectedWindow),
        options_entered: raw.lifecycle.options_entries >= 1,
        gameplay_entered_twice: raw.lifecycle.gameplay_entries >= 2,
        paused_twice: raw.lifecycle.pause_entries >= 2,
        game_over_reached: raw.lifecycle.game_over_entries >= 1,
      };
      sessions.push({
        id,
        medium: artifact.medium,
        cold_ram_fill: fill,
        emulator_status: result.status,
        final_frame: raw.final_frame,
        final_step: raw.final_step,
        lifecycle: raw.lifecycle,
        capital: raw.capital,
        states: raw.states,
        startup_cycles: {
          start_to_show_loader: clock.start !== null && clock.show_loader !== null ?
            clock.show_loader - clock.start : null,
          start_to_entity_unpack_complete:
            clock.start !== null && clock.layout_d_entity_unpack_complete !== null ?
              clock.layout_d_entity_unpack_complete - clock.start : null,
          entity_unpack_complete_to_glue_holding_complete:
            clock.layout_d_entity_unpack_complete !== null &&
            clock.layout_d_glue_holding_complete !== null ?
              clock.layout_d_glue_holding_complete - clock.layout_d_entity_unpack_complete : null,
          pickup_unpack_to_glue_holding_complete:
            clock.unpack_weapon_pickup_phase_runtime !== null &&
            clock.layout_d_glue_holding_complete !== null ?
              clock.layout_d_glue_holding_complete - clock.unpack_weapon_pickup_phase_runtime :
              null,
        },
        hold_writes: holdWrites,
        window_writes: windowWrites,
        checks,
      });
    }
  }
  const passed = sessions.every(({ checks }) =>
    Object.values(checks).every((value) => value === null || value === true));
  const report = {
    id: "capacity-window-watch",
    method: "value-change comparison of each watched byte before every emulated instruction " +
      "(a write storing the byte's current value is not observable)",
    hold: { start: hex(holdStart), bytes: holdBytes, expect_hold_is_glue: expectHoldIsGlue },
    expect_window_is_hold: expectWindowIsHold,
    injection: injection === null ? null : { start: hex(injection.start), bytes: injection.bytes },
    window: { start: hex(windowStart), bytes: windowBytes },
    passed,
    sessions,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  for (const session of sessions) {
    const failed = Object.entries(session.checks)
      .filter(([, value]) => value === false).map(([name]) => name);
    console.log(`${session.id}: frames ${session.final_frame}, step ${session.final_step}, ` +
      `hold writes ${session.hold_writes.length}, window writes ${session.window_writes.length}, ` +
      `startup ${session.startup_cycles.start_to_show_loader} cycles` +
      (failed.length === 0 ? " PASS" : ` FAIL ${failed.join(",")}`));
  }
  console.log(`Capacity window watch ${passed ? "PASS" : "FAIL"}: ${outputPath}`);
  process.exitCode = passed ? 0 : 1;
}

main();
