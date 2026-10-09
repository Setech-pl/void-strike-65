// fix/hardware-boot (2026-10-09), Phase A: the real-SIO boot reproduction.
//
// The owner's 65XE PAL with an SIO2SD stops during the disk load with a full
// red screen; Atari800 reproduces it with its SIO patch off (-nopatch), which
// makes the OS disk routine SIOV talk to the drive model through POKEY and the
// PIA command line at register level, as on the real machine. Every committed
// launch ran with the patch on, which short-circuits SIOV.
//
// This script prepares a separate copy of the in-repo Atari800 source
// (build/atari800-sio-diag, from --atari800-source, default
// build/atari800-trace) with scripts/atari800-sio-diag.h in place of the wall
// trace header and three one-line hooks in sio.c, boots an ATR on the target
// machine with the patch on and off, BASIC on and off, and reports the SIO
// traffic and where each boot ends. It exits non-zero when a -nopatch boot does
// not reach the main menu, so it fails on the ATR main builds today.
//
//   node scripts/sio-boot-repro.mjs [--atr=dist/void-strike-65.atr]
//     [--atari800-source=build/atari800-trace] [--frames=N] [--only=nopatch]
//     [--labels=build] [--json=build/sio-boot-repro.json] [--start-game]
//
// --labels=build resolves the milestone PCs from build/void-strike-65.lbl and
// build/sector-reader.lbl (they must belong to the ATR); --labels=none uses only
// the label-free stops (the red halt, the frame budget) for older ATRs.
// --start-game presses FIRE from the main menu on and stops at main_loop, so the
// run covers START GAME, the game's own direct-SIO reader and the summary.
// --probe=dstats boots a probe copy of the ATR instead (never written to dist/):
// the proposed fix as a byte-neutral move of stage 2's `lda #$40 / sta DSTATS`
// from stage2_load_chunk to the head of the per-sector loop, located through
// build/void-strike-65.lbl and refused unless the bytes are exactly as expected.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseViceLabels } from "./runtime-cycles.mjs";
import { TARGET_MACHINE, atari800SioArguments } from "./atari800-machine.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const headerPath = path.join(rootDirectory, "scripts", "atari800-sio-diag.h");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
  invariant(result.status === 0, `${command} ${args.join(" ")} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  return result;
}

// The diagnostic emulator: a copy, so the wall-trace build is never touched.
export function prepareSioDiagEmulator(sourceDirectory, diagDirectory) {
  const binary = path.join(diagDirectory, "src", "atari800");
  const header = fs.readFileSync(headerPath);
  const stamp = path.join(diagDirectory, ".sio-diag-header.sha256");
  const digest = crypto.createHash("sha256").update(header).digest("hex");
  if (fs.existsSync(binary) && fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8") === digest) return binary;
  if (!fs.existsSync(diagDirectory)) {
    invariant(fs.existsSync(path.join(sourceDirectory, "src", "sio.c")),
      `Atari800 source is missing: ${sourceDirectory} (pass --atari800-source=build/atari800-trace)`);
    fs.cpSync(sourceDirectory, diagDirectory, { recursive: true });
  }
  fs.writeFileSync(path.join(diagDirectory, "src", "voidstrike65_trace.h"), header);
  const cpuText = fs.readFileSync(path.join(diagDirectory, "src", "cpu.c"), "utf8");
  invariant(cpuText.includes('#include "voidstrike65_trace.h"') &&
    cpuText.includes("DFTrace_Observe(GET_PC(), A, X, Y, S);"),
  "The Atari800 copy is not prepared (run the wall trace's --prepare on its source first)");
  const sioPath = path.join(diagDirectory, "src", "sio.c");
  let sio = fs.readFileSync(sioPath, "utf8");
  if (!sio.includes("voidstrike65_sio_event")) {
    const anchors = [
      ["void SIO_SwitchCommandFrame(int onoff)\n{\n",
        "extern void voidstrike65_sio_event(int kind, int value);\nvoid SIO_SwitchCommandFrame(int onoff)\n{\n\tvoidstrike65_sio_event('L', onoff);\n"],
      ["void SIO_PutByte(int byte)\n{\n", "void SIO_PutByte(int byte)\n{\n\tvoidstrike65_sio_event('O', byte);\n"],
    ];
    for (const [anchor, replacement] of anchors) {
      invariant(sio.includes(anchor), `sio.c anchor changed: ${anchor.split("\n")[0]}`);
      sio = sio.replace(anchor, replacement);
    }
    const getByte = sio.indexOf("int SIO_GetByte(void)\n{");
    const getByteReturn = sio.indexOf("\treturn byte;\n}", getByte);
    invariant(getByte >= 0 && getByteReturn > getByte, "sio.c SIO_GetByte anchor changed");
    sio = `${sio.slice(0, getByteReturn)}\tvoidstrike65_sio_event('I', byte);\n${sio.slice(getByteReturn)}`;
    fs.writeFileSync(sioPath, sio);
  }
  run("make", ["-j8"], { cwd: diagDirectory });
  fs.writeFileSync(stamp, digest);
  return binary;
}

function hex(value) {
  return value.toString(16).toUpperCase();
}

// One SIO transaction per command-line assertion: the five frame bytes, then
// everything the drive model handed to SERIN until the next assertion.
export function parseSioLog(text) {
  const transactions = [];
  const siov = [];
  const marks = [];
  let stop = null;
  let dcb = null;
  let current = null;
  for (const line of text.split("\n")) {
    const fields = Object.fromEntries([...line.matchAll(/(\w+)=([0-9a-f]+)/g)].map((m) => [m[1], m[2]]));
    if (line.startsWith("L 01")) {
      current = { frame: Number(fields.f), line: Number(fields.y), out: [], in: [] };
      transactions.push(current);
    } else if (line.startsWith("O ") && current) {
      current.out.push(Number.parseInt(line.slice(2, 4), 16));
    } else if (line.startsWith("I ") && current) {
      current.in.push(Number.parseInt(line.slice(2, 4), 16));
      current.lastFrame = Number(fields.f);
    } else if (line.startsWith("SIOV ")) {
      siov.push({ frame: Number(fields.f), dstats: Number.parseInt(fields.dstats, 16),
        daux: Number.parseInt(fields.daux, 16), dcomnd: Number.parseInt(fields.dcomnd, 16),
        dbuf: Number.parseInt(fields.dbuf, 16) });
    } else if (line.startsWith("MARK ")) {
      marks.push({ pc: Number.parseInt(fields.pc, 16), frame: Number(fields.f) });
    } else if (line.startsWith("STOP ")) {
      stop = { reason: line.split(" ")[1], pc: Number.parseInt(fields.pc, 16), frame: Number(fields.f),
        colbk: Number.parseInt(fields.colbk, 16) };
    } else if (line.startsWith("DCB ")) {
      dcb = fields;
    }
  }
  for (const transaction of transactions) {
    const [device, command, aux1, aux2] = transaction.out;
    transaction.device = device;
    transaction.command = command;
    transaction.sector = (aux1 ?? 0) | ((aux2 ?? 0) << 8);
    // A byte read before the drive answered is stale SERIN (the emulator hands
    // over its idle value when nothing is queued); the reply is the first
    // A/N byte, the result the next byte.
    const replyIndex = transaction.in.findIndex((value) => value === 0x41 || value === 0x4e);
    transaction.reply = replyIndex >= 0 ? transaction.in[replyIndex] : null;
    transaction.result = replyIndex >= 0 ? transaction.in[replyIndex + 1] ?? null : null;
    transaction.dataBytes = replyIndex >= 0 ? Math.max(0, transaction.in.length - replyIndex - 2) : 0;
  }
  return { transactions, siov, marks, stop, dcb };
}

export function summariseRun(parsed, labels) {
  const reads = parsed.transactions.filter(({ command }) => command === 0x52);
  const bySector = new Map();
  for (const read of reads) bySector.set(read.sector, (bySector.get(read.sector) ?? 0) + 1);
  const retried = [...bySector].filter(([, count]) => count > 1).map(([sector]) => sector);
  const withoutData = reads.filter(({ reply, result, dataBytes }) =>
    reply === 0x41 && result === 0x43 && dataBytes < 129);
  const siovReads = parsed.siov.filter(({ dcomnd }) => dcomnd === 0x52);
  const name = new Map([...labels].map(([label, address]) => [address, label]));
  const firstMark = {};
  for (const mark of parsed.marks) {
    const label = name.get(mark.pc) ?? `$${hex(mark.pc)}`;
    if (!(label in firstMark)) firstMark[label] = mark.frame;
  }
  return {
    stop: parsed.stop ? { reason: parsed.stop.reason, pc: `$${hex(parsed.stop.pc)}`,
      label: name.get(parsed.stop.pc) ?? null, frame: parsed.stop.frame } : null,
    command_frames: parsed.transactions.length,
    read_commands: reads.length,
    sectors_read: bySector.size,
    highest_sector: Math.max(0, ...bySector.keys()),
    sectors_retried: retried.length,
    naks: reads.filter(({ reply }) => reply === 0x4e).length,
    errors: reads.filter(({ result }) => result === 0x45).length,
    no_reply: reads.filter(({ reply }) => reply === null).length,
    complete_without_data_frame: withoutData.length,
    first_sector_without_data_frame: withoutData[0]?.sector ?? null,
    siov_calls: parsed.siov.length,
    siov_read_calls_dstats_not_40: siovReads.filter(({ dstats }) => (dstats & 0xc0) !== 0x40).length,
    first_siov_dstats_not_40: (() => {
      const found = siovReads.find(({ dstats }) => (dstats & 0xc0) !== 0x40);
      return found ? { sector: found.daux, dstats: `$${hex(found.dstats)}`, frame: found.frame } : null;
    })(),
    milestones: firstMark,
  };
}

function loadLabels(mode) {
  if (mode === "none") return new Map();
  const labels = new Map();
  for (const file of ["void-strike-65.lbl", "sector-reader.lbl"]) {
    const labelPath = path.join(rootDirectory, "build", file);
    invariant(fs.existsSync(labelPath), `${labelPath} is missing (build first, or pass --labels=none)`);
    for (const [label, address] of parseViceLabels(fs.readFileSync(labelPath, "utf8"))) labels.set(label, address);
  }
  return labels;
}

// The DSTATS probe (docs/diagnostics/hardware-boot.md): OS SIOV writes its
// result into DSTATS, so a DSTATS set once per chunk is $01 - no data
// direction - from the chunk's second sector on.
export function buildDstatsProbe(atrBytes, labels) {
  const bytes = Buffer.from(atrBytes);
  const chunk = labels.get("stage2_load_chunk");
  const loop = labels.get("stage2_read_sector");
  invariant(Number.isInteger(chunk) && Number.isInteger(loop) && loop > chunk, "stage-2 labels are missing");
  const loadAddress = bytes[16 + 2] | (bytes[16 + 3] << 8);
  const offset = (address) => 16 + address - loadAddress;
  const store = Buffer.from([0xa9, 0x40, 0x8d, 0x03, 0x03]);
  const at = bytes.subarray(offset(chunk), offset(loop)).indexOf(store);
  invariant(at >= 0, "stage2_load_chunk does not hold lda #$40 / sta DSTATS");
  invariant(bytes.subarray(offset(loop), offset(loop) + 3).equals(Buffer.from([0x20, 0x59, 0xe4])),
    "stage2_read_sector does not begin with jsr SIOV");
  const storeAddress = chunk + at;
  // The loop's closing BNE: the first branch after the label that targets it.
  let branch = -1;
  for (let address = loop + 3; address < loop + 64; address += 1) {
    const value = bytes[offset(address) + 1];
    if (bytes[offset(address)] === 0xd0 && address + 2 + (value > 127 ? value - 256 : value) === loop) {
      branch = address;
      break;
    }
  }
  invariant(branch > 0, "the per-sector loop's BNE was not found");
  const between = Buffer.from(bytes.subarray(offset(storeAddress + 5), offset(loop)));
  between.copy(bytes, offset(storeAddress));
  store.copy(bytes, offset(loop) - 5);
  bytes[offset(branch) + 1] = (bytes[offset(branch) + 1] - 5) & 0xff;
  return { bytes, store_from: `$${hex(storeAddress)}`, loop_from: `$${hex(loop)}`, loop_to: `$${hex(loop - 5)}` };
}

const MILESTONES = ["start", "show_loader", "enter_main_menu", "start_gameplay",
  "sector_reader_load", "sector_reader_settle", "sector_reader_failure_screen", "main_loop"];

export function runScenario({ emulator, atr, patch, basic, frames, labels, startGame, outputDirectory, id }) {
  const media = path.join(outputDirectory, `${id}.atr`);
  fs.copyFileSync(atr, media);
  const logPath = path.join(outputDirectory, `${id}.log`);
  const pc = (name) => labels.has(name) ? hex(labels.get(name)) : null;
  // boot_stage2_error is not a stop: its address is resident code after the
  // overlay is replaced. The header's red-halt detector catches its halt.
  const stops = [startGame ? pc("main_loop") : pc("enter_main_menu"),
    pc("sector_reader_failure_screen")].filter(Boolean);
  const marks = MILESTONES.map(pc).filter(Boolean);
  const env = {
    ...process.env,
    SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
    DFSIO_OUTPUT: logPath,
    DFSIO_FRAMES: String(frames),
    DFSIO_STOP_PCS: stops.join(","),
    DFSIO_MARK_PCS: marks.join(","),
    DFSIO_SCREENSHOT: path.join(outputDirectory, `${id}.png`),
  };
  if (pc("start")) env.DFSIO_ARM_PC = pc("start");
  if (startGame && pc("enter_main_menu")) env.DFSIO_FIRE_PC = pc("enter_main_menu");
  const args = [TARGET_MACHINE, "-pal", ...atari800SioArguments(rootDirectory, { realSio: !patch }),
    basic ? "-basic" : "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync", media];
  const began = process.hrtime.bigint();
  run(emulator, args, { env });
  const seconds = Number(process.hrtime.bigint() - began) / 1e9;
  const summary = summariseRun(parseSioLog(fs.readFileSync(logPath, "utf8")), labels);
  return { id, patch, basic, args, host_seconds: Number(seconds.toFixed(2)), ...summary };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let atr = path.resolve(rootDirectory, option("atr", "dist/void-strike-65.atr"));
  const source = path.resolve(rootDirectory, option("atari800-source", "build/atari800-trace"));
  const diag = path.resolve(rootDirectory, "build", "atari800-sio-diag");
  const frames = Number(option("frames", "6000"));
  const only = option("only", "");
  const startGame = process.argv.includes("--start-game");
  const labels = loadLabels(option("labels", "build"));
  const outputDirectory = path.resolve(rootDirectory, option("out", "build/sio-boot-repro"));
  fs.mkdirSync(outputDirectory, { recursive: true });
  const emulator = prepareSioDiagEmulator(source, diag);
  let probe = null;
  if (option("probe", "") === "dstats") {
    const built = buildDstatsProbe(fs.readFileSync(atr), labels);
    atr = path.join(outputDirectory, "probe-dstats.atr");
    fs.writeFileSync(atr, built.bytes);
    probe = { kind: "dstats", store_from: built.store_from, loop_from: built.loop_from, loop_to: built.loop_to };
  }
  const atrSha = crypto.createHash("sha256").update(fs.readFileSync(atr)).digest("hex");
  const results = [];
  for (const patch of [true, false]) {
    if (only === "nopatch" && patch) continue;
    if (only === "patch" && !patch) continue;
    for (const basic of [false, true]) {
      const id = `${patch ? "patch" : "nopatch"}-${basic ? "basic" : "nobasic"}`;
      const result = runScenario({ emulator, atr, patch, basic, frames, labels, startGame, outputDirectory, id });
      results.push(result);
      const m = result.milestones;
      console.log(`${id.padEnd(16)} stop=${result.stop?.reason}@${result.stop?.label ?? result.stop?.pc} f${result.stop?.frame}` +
        ` reads=${result.read_commands} sectors=${result.sectors_read} (max ${result.highest_sector})` +
        ` retried=${result.sectors_retried} NAK=${result.naks} ERR=${result.errors} noreply=${result.no_reply}` +
        ` C-without-data=${result.complete_without_data_frame} SIOV-dstats!=40=${result.siov_read_calls_dstats_not_40}` +
        ` loader=${m.show_loader ?? "-"} menu=${m.enter_main_menu ?? "-"} level-read=${m.sector_reader_load ?? "-"}` +
        ` gameplay=${m.main_loop ?? "-"} host=${result.host_seconds}s`);
    }
  }
  const report = { atr: path.relative(rootDirectory, atr), atr_sha256: atrSha, probe, frames, start_game: startGame,
    machine: TARGET_MACHINE, results };
  const jsonPath = option("json", path.join(outputDirectory, "report.json"));
  fs.writeFileSync(path.resolve(rootDirectory, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  const target = startGame ? "main_loop" : "enter_main_menu";
  const failed = results.filter(({ patch, stop }) => !patch && stop?.label !== target);
  if (failed.length > 0) {
    console.error(`FAIL: ${failed.map(({ id, stop }) => `${id} ended at ${stop?.reason} ${stop?.label ?? stop?.pc}`).join("; ")}`);
    process.exit(1);
  }
  console.log(`PASS: every -nopatch boot reached ${target}`);
}
