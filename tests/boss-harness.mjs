// M5b-S3: the 6502-harness pieces the boss tests share (tests/boss-*.test.mjs).
// Not a test file itself (the runner takes tests/*.test.mjs only).
//
// The drive answers from the built ATR, as tests/level-summary.test.mjs's does;
// the runtime image is the default build's, with the reader, the summary
// module and the level image in place, as they are once a game has started.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const buildPath = (name) => path.join(root, "build", name);
export const readBuild = (name) => fs.readFileSync(buildPath(name));
export const exists = (name) => fs.existsSync(buildPath(name));

export function readLabels(file) {
  const labels = new Map();
  if (!exists(file)) return labels;
  for (const line of fs.readFileSync(buildPath(file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}

export function includeConstants(file) {
  if (!exists(file)) return new Map();
  return new Map(fs.readFileSync(buildPath(file), "utf8").split(/\r?\n/)
    .map((line) => /^(\w+)\s*=\s*\$([0-9A-Fa-f]+)/.exec(line))
    .filter(Boolean).map((match) => [match[1], Number.parseInt(match[2], 16)]));
}

export const labelsOf = {
  main: readLabels("void-strike-65.lbl"),
  reader: readLabels("sector-reader.lbl"),
  director: readLabels("encounter-director.lbl"),
  summary: readLabels("level-summary.lbl"),
  music: readLabels("gameplay-music.lbl"),
  boss: readLabels("boss.lbl"),
};

export function label(link, name) {
  const address = labelsOf[link].get(name);
  assert.ok(Number.isInteger(address), `the ${link} link has no ${name}`);
  return address;
}

export const manifest = JSON.parse(readBuild("manifest.json").toString("utf8"));
export const builtAtr = fs.readFileSync(path.join(root, "dist", "void-strike-65.atr"));

export const SECTOR_BYTES = 128;
export const ATR_HEADER_BYTES = 16;
export const atrSector = (sector) => builtAtr.subarray(
  ATR_HEADER_BYTES + (sector - 1) * SECTOR_BYTES, ATR_HEADER_BYTES + sector * SECTOR_BYTES);
export const atrRun = (first, count) => Buffer.concat(
  Array.from({ length: count }, (_, index) => atrSector(first + index)));

export const reg = {
  TRIG0: 0xd010, HPOSM0: 0xd004, SIZEM: 0xd00c, PRIOR: 0xd01b, COLBK: 0xd01a,
  SKRES: 0xd20a, SERIN: 0xd20d, SEROUT: 0xd20d, IRQEN: 0xd20e, IRQST: 0xd20e,
  SKCTL: 0xd20f, SKSTAT: 0xd20f, PBCTL: 0xd303, DMACTL: 0xd400, DLISTL: 0xd402,
  DLISTH: 0xd403, HSCROL: 0xd404, CHBASE: 0xd409, WSYNC: 0xd40a, VCOUNT: 0xd40b,
  NMIEN: 0xd40e,
};
const IRQ_SERIN = 0x20;
const IRQ_SEROUT_RDY = 0x10;
const IRQ_XMTDONE = 0x08;

function carryWrapChecksum(bytes) {
  let sum = 0;
  for (const byte of bytes) {
    sum += byte;
    if (sum > 0xff) sum = (sum & 0xff) + 1;
  }
  return sum & 0xff;
}

// The SIO drive and the few registers the transition writes, recorded in
// order. `onCommand(sector, cpu)` sees every read command as it is sent.
export class Drive {
  constructor({ trig = () => 1, onCommand = null } = {}) {
    this.trig = trig;
    this.onCommand = onCommand;
    this.vcountReads = 0;
    this.frames = 0;
    this.irqen = 0;
    this.latched = 0;
    this.commandLine = false;
    this.frameBytes = [];
    this.readSectors = [];
    this.txPending = false;
    this.txOutstanding = 0;
    this.rxQueue = [];
    this.serin = 0;
    this.writes = [];               // { register, value } for the display registers
    this.cpu = null;
  }

  read(address) {
    switch (address) {
      case reg.VCOUNT: {
        const phase = this.vcountReads % 23;
        this.vcountReads += 1;
        if (phase === 0) this.frames += 1;
        return phase * 7;
      }
      case reg.IRQST:
        this.advance();
        return 0xff & ~this.latched;
      case reg.SKSTAT:
        return 0xff;
      case reg.TRIG0:
        return this.trig(this.frames) ? 1 : 0;
      default:
        return undefined;
    }
  }

  write(address, value) {
    switch (address) {
      case reg.IRQEN: {
        const cleared = (~value) & 0xff;
        this.latched &= ~(cleared & (IRQ_SERIN | IRQ_SEROUT_RDY));
        this.irqen = value;
        return false;
      }
      case reg.SKCTL:
        if (value === 0x00) {
          this.latched = 0;
          this.txPending = false;
          this.txOutstanding = 0;
          this.rxQueue = [];
        }
        return false;
      case reg.SKRES:
        return false;
      case reg.SEROUT:
        if (this.commandLine) this.frameBytes.push(value);
        this.txPending = true;
        this.txOutstanding += 1;
        this.latched &= ~IRQ_XMTDONE;
        return false;
      case reg.PBCTL:
        if (value === 0x34) {
          this.commandLine = true;
          this.frameBytes = [];
        } else if (value === 0x3c && this.commandLine) {
          this.commandLine = false;
          if (this.frameBytes.length === 5 && this.frameBytes[1] === 0x52) {
            const sector = this.frameBytes[2] | (this.frameBytes[3] << 8);
            this.readSectors.push(sector);
            this.onCommand?.(sector, this.cpu);
            const slice = atrSector(sector);
            this.rxQueue = [0x41, 0x43, ...slice, carryWrapChecksum(slice)];
          }
        }
        return false;
      case reg.WSYNC:
        return false;
      case reg.DMACTL: case reg.DLISTL: case reg.DLISTH: case reg.NMIEN:
      case reg.HSCROL: case reg.CHBASE:
        this.writes.push({ register: address, value });
        return undefined;
      default:
        return undefined;
    }
  }

  advance() {
    if (this.txPending) {
      this.latched |= IRQ_SEROUT_RDY;
      this.txPending = false;
      this.txOutstanding -= 1;
      if (this.txOutstanding <= 0) {
        this.txOutstanding = 0;
        this.latched |= IRQ_XMTDONE;
      }
      return;
    }
    if (this.txOutstanding === 0) this.latched |= IRQ_XMTDONE;
    if (this.rxQueue.length > 0 && (this.irqen & IRQ_SERIN) !== 0 &&
      (this.latched & IRQ_SERIN) === 0) {
      this.serin = this.rxQueue.shift() & 0xff;
      this.latched |= IRQ_SERIN;
    }
  }
}

export function cpuOver(drive, memory) {
  const cpu = new Nmos6502(memory, {
    read: (address) => {
      if (address === reg.SERIN) { drive.advance(); return drive.serin; }
      return drive.read(address);
    },
    write: (address, value) => drive.write(address, value),
  });
  drive.cpu = cpu;
  return cpu;
}

export function runUntil(cpu, ends, { maxSteps = 80_000_000, watch = null } = {}) {
  const endSet = new Map(Object.entries(ends).map(([name, address]) => [address, name]));
  let steps = 0;
  while (steps < maxSteps && !endSet.has(cpu.pc)) {
    watch?.(cpu.pc, cpu);
    cpu.step();
    steps += 1;
  }
  assert.notEqual(steps, maxSteps, "the run never reached an end point");
  return endSet.get(cpu.pc);
}

// Call a routine to its RTS; returns the CPU (cycles counted from 0).
export function call(memory, address, { a = 0, x = 0, y = 0, hooks = {}, watch = null } = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const stop = 0x0000;
  cpu.push((stop - 1) >> 8 & 0xff);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  let steps = 0;
  while (steps < 4_000_000 && cpu.pc !== stop) { watch?.(cpu.pc, cpu); cpu.step(); steps += 1; }
  assert.notEqual(steps, 4_000_000, `routine $${address.toString(16)} did not return`);
  return cpu;
}

// One NMI into `address`, run to its RTI. Returns the cycles it took.
export function nmi(memory, address, { hooks = {} } = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const back = 0x0002;
  cpu.push(back >> 8);
  cpu.push(back & 0xff);
  cpu.push(cpu.p);
  cpu.pc = address;
  let steps = 0;
  while (steps < 100_000 && cpu.pc !== back) { cpu.step(); steps += 1; }
  assert.notEqual(steps, 100_000, "the DLI never returned");
  return cpu.cycles;
}

// The machine a game leaves behind at the boss gate: the whole runtime, the
// reader, the summary module resident (it was read at START GAME), level 1's
// image in the buffer, gameplay state, the playfield drained.
export function bossGateMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  memory.set(readBuild("sector-reader.bin"), 0xa000);
  memory.set(readBuild("level-summary.bin"), 0x0500);
  memory.set(readBuild("level-1.bin"), 0xa600);
  memory[label("reader", "sr_summary_resident")] = 1;
  memory[label("main", "game_state")] = 6;
  memory[label("main", "sound_enabled")] = 1;
  memory[label("main", "GAME_MUSIC_ENABLED")] = 1;
  memory[label("main", "player_y")] = 60;   // inside the band's rows: the floor moves it
  memory[label("main", "DIFFICULTY_SETTING")] = 1;   // MEDIUM, the game's default (M5b-S4a-i: the HP scale)
  memory[label("main", "CAPITAL_SECTOR_STATE")] = 7;   // CAPITAL_HULL_STATE_OPEN: a fighter sector
  // The ring's row tables and the two gameplay lists, as start_gameplay left them.
  call(memory, label("main", "init_playfield_row_table"));
  call(memory, label("main", "init_playfield_display_lists"));
  return memory;
}

// Run the boss entry from the window's resident half to the main loop.
export function runBossEntry({ onCommand = null, watch = null } = {}) {
  const memory = bossGateMemory();
  const drive = new Drive({ onCommand });
  const cpu = cpuOver(drive, memory);
  cpu.sp = 0xf0;
  cpu.pc = label("director", "_asm_boss_enter");
  const end = runUntil(cpu, {
    main_loop: label("main", "main_loop"),
    failure: label("reader", "sector_reader_failure_screen"),
  }, { watch });
  return { memory, drive, cpu, end };
}

export const word = (memory, address) => memory[address] | (memory[address + 1] << 8);

// M5b-S4a-i: a compiled region (scripts/boss-assets.mjs) put into a machine
// the boss entry already reached: its band, tables and charset where the head
// reads them, the divider's codes as the install copies them, the level id
// (its laser tier) and the difficulty; then the install's order - the
// controller's init, then boss_prepare (the capped plates, the column map).
export function installRegion(memory, region, { level = 1, difficulty = 1 } = {}) {
  memory.set(region.runs.bandA.data, region.runs.bandA.address);
  memory.set(region.runs.bandB.data, region.runs.bandB.address);
  memory.set(region.runs.charset.data, region.runs.charset.address);
  const charset = label("main", "CHARSET");
  memory.copyWithin(region.runs.charset.address, charset, charset + 7 * 8);
  memory[0xa603] = level;
  memory[label("main", "DIFFICULTY_SETTING")] = difficulty;
  // M5b-S4b: the install's order around the controller - the laser tier
  // before its init (the init reads it), the lasers' column after the map.
  // Builds before S4b have neither routine.
  if (labelsOf.boss.has("laser_tier")) call(memory, label("boss", "laser_tier"));
  call(memory, label("boss", "_boss_c_init"));
  call(memory, label("boss", "boss_prepare"));
  if (labelsOf.boss.has("laser_prepare")) call(memory, label("boss", "laser_prepare"));
  return memory;
}

// The band placed at position p (colour clocks) and published, as the DLI
// would publish it: a shot's band column is then (x - 32 + p) / 4.
export function placeBand(memory, p) {
  memory[label("boss", "boss_pos")] = p;
  memory[label("boss", "boss_dli_pos")] = p;
  call(memory, label("boss", "boss_apply_pos"));
}

export const BAND_BOTTOM_Y = 88;
export const BAND_ORIGIN_HPOS = 32;

// The screen columns a band position shows: cells whose colour clocks fall
// inside the normal window (HPOS 48-207).
export function visibleCells(p) {
  return { left: Math.ceil((16 + p) / 4), right: Math.floor((175 + p) / 4) };
}

// A PairShot in `slot` at the band's bottom edge whose band column is `cell`:
// its HPOS inside the cell's colour clocks and inside the screen's window (a
// cell at the window's edge shows one colour clock; the fortress session's
// layouts put modules there, S4a-i's never did).
export function shootAt(memory, cell, slot = 0) {
  const p = memory[label("boss", "boss_shown_pos")];
  const first = cell * 4 + BAND_ORIGIN_HPOS - p;
  const x = Math.min(207, Math.max(48, first + 1));
  assert.ok(x >= first && x <= first + 3, `column ${cell} is off screen at position ${p}`);
  memory[label("main", "FIGHTER_PROJECTILE_ACTIVE") + slot] = 1;
  memory[label("main", "FIGHTER_PROJECTILE_X") + slot] = x;
  memory[label("main", "FIGHTER_PROJECTILE_Y") + slot] = BAND_BOTTOM_Y - 4;
  // fix/boss-readability (decision M, plan §5.16): a shot meets the cell
  // that stops it, no longer the band's bottom edge, and flies there over
  // several frames. A test shot starts inside that cell, so it meets its
  // target on this UPDATE as it met the edge before; an open column keeps the
  // edge (the shot flies on). Builds before the change have no stop lines.
  const stops = labelsOf.boss.get("boss_stop_y");
  if (stops !== undefined) {
    const line = memory[stops + cell];
    if (line > 0) memory[label("main", "FIGHTER_PROJECTILE_Y") + slot] = Math.min(BAND_BOTTOM_Y - 4, line - 4);
  }
}
