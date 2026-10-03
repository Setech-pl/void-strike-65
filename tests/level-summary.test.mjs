// M5a-S2 — the level-summary screen (docs/plans/m5-loading-boss.md §4.8,
// owner decisions 26-28, answers Q13-Q17), driven on the 6502 harness.
//
// Three groups, each against the linked images in build/:
//
//   * the stat hooks in the sector reader: the per-frame shot scan (Q13),
//     the Heavy hits it reads back from the damage mailboxes, the kill and
//     hit hooks, the debris rule (Q14) and the level-end trigger;
//   * the summary arithmetic in the $0500 module: accuracy, time and the
//     S/A/B/C grade at every threshold edge (decision 28);
//   * the transition itself, from the reader's own entries with the real
//     resident runtime installed and a scripted drive that also takes writes:
//     the stats on the first frame, the 3-second minimum and FIRE only after
//     the data (Q15), START GAME's best and empty panel (Q17), the save
//     record under Q16's rules, and the music through the standard-speed read.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import { loadLoaderAiLines } from "../scripts/loader-ai-lines.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = (name) => path.join(root, "build", name);

function readLabels(file) {
  const labels = new Map();
  for (const line of fs.readFileSync(build(file), "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
  }
  return labels;
}
function includeConstants(file) {
  return new Map(fs.readFileSync(build(file), "utf8").split(/\r?\n/)
    .map((line) => /^(\w+)\s*=\s*\$([0-9A-Fa-f]+)/.exec(line))
    .filter(Boolean).map((match) => [match[1], Number.parseInt(match[2], 16)]));
}

const readerLabels = readLabels("sector-reader.lbl");
const summaryLabels = readLabels("level-summary.lbl");
const mainLabels = readLabels("void-strike-65.lbl");
const kernelLabels = readLabels("light-kernel.lbl");
const readerImage = fs.readFileSync(build("sector-reader.bin"));
const summaryImage = fs.readFileSync(build("level-summary.bin"));
const levelOneImage = fs.readFileSync(build("level-1.bin"));
const directorAbi = includeConstants("director-abi.inc");
const manifest = JSON.parse(fs.readFileSync(build("manifest.json"), "utf8"));
const builtAtr = fs.readFileSync(path.join(root, "dist", "void-strike-65.atr"));

const reader = (name) => {
  const address = readerLabels.get(name);
  assert.ok(Number.isInteger(address), `the sector reader has no ${name}`);
  return address;
};
const summary = (name) => {
  const address = summaryLabels.get(name);
  assert.ok(Number.isInteger(address), `the summary module has no ${name}`);
  return address;
};
const main = (name) => {
  const address = mainLabels.get(name);
  assert.ok(Number.isInteger(address), `main has no ${name}`);
  return address;
};

const READER_BASE = 0xa000;
const SUMMARY_BASE = 0x0500;
const LEVEL_BUFFER = 0xa600;
const SECTOR_BYTES = 128;
const ATR_HEADER_BYTES = 16;
// The stat block in zero page (src/hybrid/level-summary-abi.inc).
const ZP = { shots: 0xac, hits: 0xae, kills: 0xb0, endHold: 0xb2, frames: 0xb3, bonus: 0xb4 };
const SAVE_SECTOR = 599;
const PAYLOAD_SUMMARY = LEVEL_BUFFER + 0x500 + 184;

const reg = {
  TRIG0: 0xd010, AUDF1: 0xd200, AUDC1: 0xd201, AUDF3: 0xd204, AUDC3: 0xd205,
  AUDF4: 0xd206, AUDC4: 0xd207, AUDCTL: 0xd208, SKRES: 0xd20a, SERIN: 0xd20d,
  SEROUT: 0xd20d, IRQEN: 0xd20e, IRQST: 0xd20e, SKCTL: 0xd20f, SKSTAT: 0xd20f,
  PBCTL: 0xd303, DMACTL: 0xd400, DLISTL: 0xd402, DLISTH: 0xd403, WSYNC: 0xd40a,
  VCOUNT: 0xd40b, NMIEN: 0xd40e,
};
const IRQ_SERIN = 0x20;
const IRQ_SEROUT_RDY = 0x10;
const IRQ_XMTDONE = 0x08;

const word = (memory, address) => memory[address] | (memory[address + 1] << 8);
const setWord = (memory, address, value) => {
  memory[address] = value & 0xff;
  memory[address + 1] = (value >> 8) & 0xff;
};

function carryWrapChecksum(bytes) {
  let sum = 0;
  for (const byte of bytes) {
    sum += byte;
    if (sum > 0xff) sum = (sum & 0xff) + 1;
  }
  return sum & 0xff;
}

// The frontend screen codes the summary writes: 0 space, 1-10 digits, 11-36
// letters, then the punctuation main.s maps; the per-cent sign is the art run's
// glyph after the picture's.
const PERCENT_CODE = 95;
function decode(memory, address, length) {
  let text = "";
  for (let index = 0; index < length; index += 1) {
    const code = memory[address + index] & 0x7f;
    if (code === 0) text += " ";
    else if (code >= 1 && code <= 10) text += String.fromCharCode(48 + code - 1);
    else if (code >= 11 && code <= 36) text += String.fromCharCode(65 + code - 11);
    else if (code === 37) text += "-";
    else if (code === 38) text += ".";
    else if (code === 39) text += "/";
    else if (code === 40) text += ":";
    else if (code === PERCENT_CODE) text += "%";
    else text += "#";
  }
  return text;
}

// --------------------------------------------------------------------------
// A drive on the wire: answers reads from the built ATR (or a patched copy),
// takes 'P'/'W' data frames, and can be write-protected the two ways real
// drives refuse: NAK the command, or take the data and answer ERROR (what
// Atari800 does for a read-only image, src/sio.c SIO_WriteSector).
// --------------------------------------------------------------------------
class Drive {
  constructor({ atr = builtAtr, protect = "none", trig = () => 1 } = {}) {
    this.sectors = new Map();
    this.atr = atr;
    this.protect = protect;
    this.trig = trig;
    this.vcountReads = 0;
    this.vcount = 1;
    this.frames = 0;
    this.skctl = 0;
    this.irqen = 0;
    this.latched = 0;
    this.commandLine = false;
    this.frameBytes = [];
    this.commandFrames = [];
    this.writes = [];
    this.dataExpected = 0;
    this.dataBytes = [];
    this.pendingAfterData = null;
    this.txPending = false;
    this.txOutstanding = 0;
    this.rxQueue = [];
    this.serin = 0;
    this.dmactl = [];
    this.dlist = 0;
    // Every DLISTL/H write with how many VCOUNT reads have passed since the
    // last read of 0, the frame edge: 1 is "straight after wait_frame_start".
    this.dlistWrites = [];
    this.zeroRead = 0;
  }

  sector(number) {
    if (this.sectors.has(number)) return this.sectors.get(number);
    const offset = ATR_HEADER_BYTES + (number - 1) * SECTOR_BYTES;
    return Buffer.from(this.atr.subarray(offset, offset + SECTOR_BYTES));
  }

  respond(frame) {
    const sector = frame[2] | (frame[3] << 8);
    const command = frame[1];
    if (command === 0x50 || command === 0x57) {
      if (this.protect === "nak") return [{ byte: 0x4e }];
      this.dataExpected = SECTOR_BYTES + 1;
      this.dataBytes = [];
      this.writeSector = sector;
      this.writeCommand = command;
      return [{ byte: 0x41 }];
    }
    if (command !== 0x52) return [{ byte: 0x4e }];
    const slice = this.sector(sector);
    const out = [{ byte: 0x41 }, { byte: 0x43 }];
    for (const byte of slice) out.push({ byte });
    out.push({ byte: carryWrapChecksum(slice) });
    return out;
  }

  read(address) {
    switch (address) {
      case reg.VCOUNT: {
        // 23 reads per frame, VCOUNT stepping by 7 so that every line main's
        // waits name ($70, $77) is reached; the wrap to 0 is the frame edge.
        const phase = this.vcountReads % 23;
        this.vcountReads += 1;
        if (phase === 0) { this.frames += 1; this.zeroRead = this.vcountReads; }
        this.vcount = phase * 7;
        return this.vcount;
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
        this.skctl = value;
        if (value === 0x00) {
          this.latched = 0;
          this.txPending = false;
          this.txOutstanding = 0;
          this.rxQueue = [];
        }
        if (value === 0x33 && this.pendingAfterData) {
          this.rxQueue = this.pendingAfterData;
          this.pendingAfterData = null;
        }
        return false;
      case reg.SKRES:
        return false;
      case reg.SEROUT:
        if (this.commandLine) {
          this.frameBytes.push(value);
        } else if (this.dataExpected > 0) {
          this.dataBytes.push(value);
          if (this.dataBytes.length === this.dataExpected) {
            this.dataExpected = 0;
            const data = Buffer.from(this.dataBytes.slice(0, SECTOR_BYTES));
            const sumOk = carryWrapChecksum(data) === this.dataBytes[SECTOR_BYTES];
            this.writes.push({ sector: this.writeSector, command: this.writeCommand,
              data, checksumOk: sumOk, applied: false });
            if (!sumOk) {
              this.pendingAfterData = [{ byte: 0x45 }];
            } else if (this.protect === "error") {
              this.pendingAfterData = [{ byte: 0x41 }, { byte: 0x45 }];
            } else {
              this.sectors.set(this.writeSector, data);
              this.writes.at(-1).applied = true;
              this.pendingAfterData = [{ byte: 0x41 }, { byte: 0x43 }];
            }
          }
        }
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
          if (this.frameBytes.length === 5) {
            this.commandFrames.push([...this.frameBytes]);
            this.rxQueue = this.respond([...this.frameBytes]);
          }
        }
        return false;
      case reg.DMACTL:
        this.dmactl.push({ frame: this.frames, value, dlist: this.dlist });
        return undefined;
      case reg.DLISTL:
        this.dlist = (this.dlist & 0xff00) | value;
        this.dlistWrites.push({ register: "L", readsSinceEdge: this.vcountReads - this.zeroRead });
        return undefined;
      case reg.DLISTH:
        this.dlist = (this.dlist & 0x00ff) | (value << 8);
        this.dlistWrites.push({ register: "H", dlist: this.dlist,
          readsSinceEdge: this.vcountReads - this.zeroRead });
        return undefined;
      case reg.WSYNC:
        return false;
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
      this.serin = this.rxQueue.shift().byte & 0xff;
      this.latched |= IRQ_SERIN;
    }
  }

  get readSectors() {
    return this.commandFrames.filter((frame) => frame[1] === 0x52)
      .map((frame) => frame[2] | (frame[3] << 8));
  }
}

// The whole runtime, the reader and (unless a test loads it over SIO) nothing
// at $0500 but the boot splash the runtime image installs there.
function runtimeMemory() {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  memory.set(readerImage, READER_BASE);
  return memory;
}

function cpuOver(drive, memory) {
  return new Nmos6502(memory, {
    read: (address) => {
      if (address === reg.SERIN) { drive.advance(); return drive.serin; }
      return drive.read(address);
    },
    write: (address, value) => drive.write(address, value),
  });
}

// Run from `entry` until the PC reaches one of `ends`; `watch` sees every PC.
function runUntil(cpu, ends, { maxSteps = 60_000_000, watch = null } = {}) {
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

function callRoutine(memory, address, { a = 0, x = 0, y = 0, hooks = {} } = {}) {
  const cpu = new Nmos6502(memory, hooks);
  const stop = 0x7ffe;
  memory[stop] = 0x00;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = address;
  cpu.a = a;
  cpu.x = x;
  cpu.y = y;
  let steps = 0;
  while (steps < 2_000_000 && cpu.pc !== stop) { cpu.step(); steps += 1; }
  assert.notEqual(steps, 2_000_000, `routine $${address.toString(16)} did not return`);
  return cpu;
}

// ==========================================================================
// 1. The stat hooks (Q13, Q14) — resident in the reader, reached by vectors
// ==========================================================================

test("the reader's stat vectors sit at $A00C-$A01B behind the frozen four", () => {
  const vectors = ["sector_reader_start_gameplay", "sector_reader_load",
    "sector_reader_read_run", "sector_reader_drain_ready",
    "stats_fighter_frame", "stats_capital_frame", "stats_kill",
    "stats_debris_shot", "stats_debris_contact", "stats_light_hit"];
  vectors.forEach((name, index) => {
    assert.equal(readerImage[index * 3], 0x4c, `vector ${index} is not a JMP`);
    assert.equal(word(readerImage, index * 3 + 1), reader(name),
      `vector $${(READER_BASE + index * 3).toString(16)} does not reach ${name}`);
  });
});

function statMemory() {
  const memory = new Uint8Array(0x10000);
  memory.set(readerImage, READER_BASE);
  // Continuations the hooks jump on to: plain `rts` here.
  for (const address of [kernelLabels.get("light_publish"), main("entity_debris_publish"),
    main("update_score_display"), main("add_debris_score"), directorAbi.get("ENEMY_LIGHT_HIT")]) {
    assert.ok(Number.isInteger(address), "a hook continuation is not linked");
    memory[address] = 0x60;
  }
  return memory;
}

test("the shot scan counts every PlayerFighter slot allocated this frame, Spread as three", () => {
  const memory = statMemory();
  const lifetime = main("FIGHTER_PROJECTILE_LIFETIME");
  const active = main("FIGHTER_PROJECTILE_ACTIVE");
  // Slots 0, 2 and 4 were allocated this frame (lifetime $FF, the allocation's
  // own value); 1 is a shot one frame old, 3 is free. Slots 5..9 are hostile.
  [0xff, 0xfe, 0xff, 0x00, 0xff].forEach((value, slot) => {
    memory[lifetime + slot] = value;
    memory[active + slot] = value === 0 ? 0 : 1;
  });
  for (let slot = 5; slot < 10; slot += 1) memory[lifetime + slot] = 0xff;
  setWord(memory, ZP.shots, 0x00ff);
  callRoutine(memory, READER_BASE + 0x0c);
  assert.equal(word(memory, ZP.shots), 0x0102, "three new shots, carried into the high byte");
});

test("a slot freed and refilled in the same frame still counts as a new shot", () => {
  // The FREE -> ACTIVE edge the plan described misses this case: the shot that
  // hit its target is freed in handle_collisions and the next one is allocated
  // in the same slot by update_player_fighter_weapon, before any per-frame scan
  // can see the slot empty. The allocation's lifetime ($FF, decremented by the
  // next frame's projectile update) marks it regardless.
  const memory = statMemory();
  const lifetime = main("FIGHTER_PROJECTILE_LIFETIME");
  memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 1;
  memory[lifetime] = 0xff;
  callRoutine(memory, READER_BASE + 0x0c);
  callRoutine(memory, READER_BASE + 0x0f);
  assert.equal(word(memory, ZP.shots), 2,
    "the capital-frame entry runs the same scan (one call per frame either way)");
});

test("a slot the player's death cleared keeps lifetime $FF but is never counted again", () => {
  // clear_player_fighter_projectiles zeroes ACTIVE and leaves the lifetime: a
  // shot wiped on its own allocation frame leaves $FF frozen in an empty slot.
  const memory = statMemory();
  memory[main("FIGHTER_PROJECTILE_LIFETIME")] = 0xff;
  memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 0;
  for (let frame = 0; frame < 5; frame += 1) callRoutine(memory, READER_BASE + 0x0c);
  assert.equal(word(memory, ZP.shots), 0);
  // The slot's next shot is a new allocation and counts once.
  memory[main("FIGHTER_PROJECTILE_ACTIVE")] = 1;
  callRoutine(memory, READER_BASE + 0x0c);
  assert.equal(word(memory, ZP.shots), 1);
});

test("a Heavy hit by a PlayerFighter shot counts its damage units; contact and cleanup do not", () => {
  const memory = statMemory();
  const damage = main("ENEMY_PENDING_DAMAGE");
  const source = main("ENEMY_PENDING_SOURCE");
  // Slot 0: two PairShots this frame (source 0). Slot 1: player contact (1).
  memory[damage] = 2; memory[source] = 0;
  memory[damage + 1] = 1; memory[source + 1] = 1;
  callRoutine(memory, READER_BASE + 0x0c);
  assert.equal(word(memory, ZP.hits), 2);
  // handle_collisions leaves the cleanup source (5) and zero damage behind.
  memory[damage] = 0; memory[source] = 5;
  memory[damage + 1] = 0; memory[source + 1] = 5;
  callRoutine(memory, READER_BASE + 0x0c);
  assert.equal(word(memory, ZP.hits), 2, "an idle frame adds nothing");
});

test("kills: the shared score path counts one kill and returns through the HUD refresh", () => {
  const memory = statMemory();
  setWord(memory, ZP.kills, 0x01ff);
  callRoutine(memory, READER_BASE + 0x12);
  assert.equal(word(memory, ZP.kills), 0x0200);
  // The continuation is update_score_display: proven by the vector's jump target.
  const body = reader("stats_kill");
  const image = readerImage.subarray(body - READER_BASE, body - READER_BASE + 16);
  const jmp = [...image].findIndex((byte, index) => byte === 0x4c &&
    word(image, index + 1) === main("update_score_display"));
  assert.ok(jmp >= 0, "stats_kill does not continue into update_score_display");
});

test("a destroyed debris counts one kill and three hits by a shot (Q14), one kill by contact", () => {
  const memory = statMemory();
  callRoutine(memory, READER_BASE + 0x15);
  assert.equal(word(memory, ZP.kills), 1);
  assert.equal(word(memory, ZP.hits), 3, "Q14: a destroyed debris is three hits");
  callRoutine(memory, READER_BASE + 0x18);
  assert.equal(word(memory, ZP.kills), 2);
  assert.equal(word(memory, ZP.hits), 3, "contact is not a hit");
});

test("a Light hit by a PairShot counts one hit and hands back the C result untouched", () => {
  const memory = statMemory();
  const hit = directorAbi.get("ENEMY_LIGHT_HIT");
  memory.set([0xa9, 0x02, 0x60], hit);      // lda #2 / rts: lethal, deferred
  const cpu = callRoutine(memory, READER_BASE + 0x1b);
  assert.equal(word(memory, ZP.hits), 1);
  assert.equal(cpu.a, 2, "the hit result the kernel branches on was changed");
});

test("the level ends 50 capital frames after the terminal COMPLETE, and only while the player lives", () => {
  const memory = statMemory();
  const flags = 0x80fe;
  const sectorState = main("CAPITAL_SECTOR_STATE");
  const lifecycle = main("PLAYER_LIFECYCLE");
  const levelEnd = reader("sector_reader_level_end");
  memory[levelEnd] = 0x00;                  // a BRK we never want to execute here
  const tick = () => {
    const cpu = new Nmos6502(memory);
    const stop = 0x7ffe;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = READER_BASE + 0x0f;
    let steps = 0;
    while (cpu.pc !== stop && cpu.pc !== levelEnd && steps < 100_000) { cpu.step(); steps += 1; }
    return cpu.pc === levelEnd;
  };
  // A capital COMPLETE that is not the level's end (no Director flag) never ends it.
  memory[sectorState] = 6;
  memory[flags] = 0x00;
  for (let frame = 0; frame < 80; frame += 1) assert.equal(tick(), false);
  // The level's end: the Director's FLAG_COMPLETE and the terminal COMPLETE.
  memory[flags] = 0x01;
  memory[lifecycle] = 1;                    // DYING: the hold does not advance
  for (let frame = 0; frame < 80; frame += 1) assert.equal(tick(), false);
  memory[lifecycle] = 0;
  for (let frame = 1; frame < 50; frame += 1) {
    assert.equal(tick(), false, `the summary arrived after ${frame} frames`);
  }
  assert.equal(tick(), true, "the 50th alive frame of the terminal COMPLETE ends the level");
});

// ==========================================================================
// 2. The summary arithmetic (decision 28) — the $0500 module
// ==========================================================================

function summaryMemory() {
  const memory = new Uint8Array(0x10000);
  memory.set(summaryImage, SUMMARY_BASE);
  memory.set(levelOneImage, LEVEL_BUFFER);
  return memory;
}

test("accuracy is hits per shot as a whole per cent, clamped to 100, 0 without a shot", () => {
  const cases = [
    [0, 0, 0], [0, 7, 0], [1, 3, 33], [2, 3, 66], [3, 3, 100], [5, 3, 100],
    [299, 300, 99], [150, 300, 50], [1000, 1000, 100], [1, 1000, 0], [10, 1000, 1],
    [65535, 65535, 100], [32767, 65535, 49],
  ];
  for (const [hits, shots, percent] of cases) {
    const memory = summaryMemory();
    setWord(memory, ZP.hits, hits);
    setWord(memory, ZP.shots, shots);
    const cpu = callRoutine(memory, summary("summary_accuracy"));
    assert.equal(cpu.a, percent, `${hits}/${shots}`);
  }
});

test("time is active gameplay frames as minutes and seconds", () => {
  const cases = [[0, 0, 0], [49, 0, 0], [50, 0, 1], [2999, 0, 59], [3000, 1, 0],
    [8249, 2, 44], [65535, 21, 50]];
  for (const [frames, minutes, seconds] of cases) {
    const memory = summaryMemory();
    setWord(memory, main("ACTIVE_GAMEPLAY_FRAME_LO"), frames);
    callRoutine(memory, summary("summary_time"));
    assert.equal(memory[summary("summary_minutes")], minutes, `${frames} frames`);
    assert.equal(memory[summary("summary_seconds_part")], seconds, `${frames} frames`);
    assert.equal(word(memory, summary("summary_seconds")), Math.floor(frames / 50));
  }
});

// Grade = accuracy tier + time tier + lives tier, each 0-2 from two
// thresholds in the level's payload page; 6 is S, 4-5 A, 2-3 B, 0-1 C.
const GRADE = { 4: "S", 3: "A", 2: "B", 1: "C" };
function grade({ percent, seconds, lost, thresholds }) {
  const memory = summaryMemory();
  memory.set(thresholds, PAYLOAD_SUMMARY);
  memory[summary("summary_percent")] = percent;
  setWord(memory, summary("summary_seconds"), seconds);
  memory[summary("summary_lives_lost")] = lost;
  const cpu = callRoutine(memory, summary("summary_grade"));
  return { letter: GRADE[cpu.a], tiers: cpu.x };
}

test("the grade's three tiers flip exactly at each threshold edge", () => {
  // accuracy 50 / 75 %, time <= 200 / <= 170 s, lives lost <= 1 / <= 0.
  const thresholds = [50, 75, 200, 0, 170, 0, 1, 0, 0x00, 0x00];
  const best = { percent: 100, seconds: 100, lost: 0, thresholds };
  assert.deepEqual(grade(best), { letter: "S", tiers: 6 });
  const tierOf = (overrides) => grade({ ...best, ...overrides }).tiers;
  // accuracy: 74 -> tier 1, 75 -> tier 2; 49 -> 0, 50 -> 1.
  assert.equal(tierOf({ percent: 75 }), 6);
  assert.equal(tierOf({ percent: 74 }), 5);
  assert.equal(tierOf({ percent: 50 }), 5);
  assert.equal(tierOf({ percent: 49 }), 4);
  // time: 170 -> 2, 171 -> 1, 200 -> 1, 201 -> 0.
  assert.equal(tierOf({ seconds: 170 }), 6);
  assert.equal(tierOf({ seconds: 171 }), 5);
  assert.equal(tierOf({ seconds: 200 }), 5);
  assert.equal(tierOf({ seconds: 201 }), 4);
  // lives: 0 -> 2, 1 -> 1, 2 -> 0.
  assert.equal(tierOf({ lost: 1 }), 5);
  assert.equal(tierOf({ lost: 2 }), 4);
  // A 16-bit time threshold is compared as 16 bits.
  const long = [50, 75, 0x2c, 0x01, 0x0e, 0x01, 1, 0, 0, 0];   // 300 / 270 s
  assert.equal(grade({ ...best, thresholds: long, seconds: 270 }).tiers, 6);
  assert.equal(grade({ ...best, thresholds: long, seconds: 271 }).tiers, 5);
  assert.equal(grade({ ...best, thresholds: long, seconds: 301 }).tiers, 4);
});

test("tier sums map to S / A / B / C at their edges", () => {
  const thresholds = [50, 75, 200, 0, 170, 0, 1, 0, 0, 0];
  const at = (percent, seconds, lost) => grade({ percent, seconds, lost, thresholds });
  assert.deepEqual(at(100, 100, 0), { letter: "S", tiers: 6 });
  assert.deepEqual(at(60, 100, 0), { letter: "A", tiers: 5 });
  assert.deepEqual(at(60, 180, 0), { letter: "A", tiers: 4 });
  assert.deepEqual(at(60, 180, 1), { letter: "B", tiers: 3 });
  assert.deepEqual(at(10, 180, 1), { letter: "B", tiers: 2 });
  assert.deepEqual(at(10, 250, 1), { letter: "C", tiers: 1 });
  assert.deepEqual(at(10, 250, 3), { letter: "C", tiers: 0 });
  // "A perfect aim with slow play and a death can still reach A" (§4.8.3):
  // slow = time tier 1 reaches A; slower than the first limit (tier 0) is B.
  assert.equal(at(100, 190, 1).letter, "A");
  assert.equal(at(100, 250, 1).letter, "B");
});

// ==========================================================================
// 3. The transition — the reader's entries, the real runtime, a real drive
// ==========================================================================

const SCREEN = 0x4000;
const rowText = (memory, row) => decode(memory, SCREEN + row * 40, 40);
const ROWS = { title: 0, ai: 1, score: 2, kills: 3, accuracy: 4, time: 5, lives: 6,
  bonus: 7, grade: 8, best: 9, animation: 10, prompt: 11 };

// A save record as §4.8.4 defines it. A score is the game's packed BCD (the
// HUD prints it as a fixed leading 0 and these four digits), stored in three
// bytes so the format outlives M4's campaign totals: top, high, low.
function saveRecord({ levels = {}, corrupt = null } = {}) {
  const record = Buffer.alloc(SECTOR_BYTES);
  record[0] = 0x56; record[1] = 0x52;      // "VR"
  record[2] = 1;
  for (const [id, { grade: letter, bcd }] of Object.entries(levels)) {
    const offset = 64 + (Number(id) - 1) * 4;
    record[offset] = { C: 1, B: 2, A: 3, S: 4 }[letter];
    record.set(bcd, offset + 1);
  }
  record[3] = carryWrapChecksum(record.subarray(4));
  if (corrupt === "checksum") record[3] ^= 0x55;
  if (corrupt === "magic") record[0] = 0x00;
  return record;
}

// The START GAME summary has its own display list since the owner's review
// (2026-10-03); a build without one shows the level-end list at START GAME.
const startDisplayList = () => summaryLabels.get("summary_start_display_list") ??
  summary("summary_display_list");

function startGame(drive, { memory = runtimeMemory(), maxSteps = 120_000_000, watch = null } = {}) {
  const cpu = cpuOver(drive, memory);
  cpu.pc = READER_BASE;
  let firstSummaryFrame = null;
  let snapshot = null;
  let ticks = 0;
  const tick = 0xa60b;
  const startList = startDisplayList();
  const end = runUntil(cpu, {
    start_gameplay: main("start_gameplay"),
    failure: reader("sector_reader_failure_screen"),
  }, {
    maxSteps,
    watch: (pc, cpuNow) => {
      watch?.(pc, cpuNow);
      if (pc === tick) ticks += 1;
      if (snapshot === null) {
        const on = drive.dmactl.find((entry) => entry.value !== 0 &&
          entry.dlist === startList);
        if (on) {
          firstSummaryFrame = on.frame;
          snapshot = Uint8Array.from(memory);
        }
      }
    },
  });
  return { end, memory, cpu, firstSummaryFrame, snapshot, ticks, frames: drive.frames };
}

test("START GAME shows the level's best and an empty panel, and loads the level behind it (Q17)", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  drive.sectors.set(SAVE_SECTOR, saveRecord({ levels: { 1: { grade: "A", bcd: [0x00, 0x12, 0x34] } } }));
  const run = startGame(drive);
  assert.equal(run.end, "start_gameplay");
  assert.ok(run.snapshot, "the summary's display list was never shown");
  // Frame 1: the title and the empty panel - no value is drawn at START GAME.
  // RE-POINTED 2026-10-03 (owner review of M5a-S2): START GAME keeps the old
  // loader's identity, ENGAGING ENEMY SECTOR on top; the level number joins
  // it in M4. The level-end summary keeps LEVEL nn.
  assert.equal(decode(run.snapshot, SCREEN, 40).trim(), "ENGAGING ENEMY SECTOR");
  for (const row of ["score", "kills", "accuracy", "time", "lives", "bonus", "grade"]) {
    assert.match(rowText(run.snapshot, ROWS[row]).slice(20), /^\s*$/,
      `START GAME drew a value on the ${row} row`);
  }
  // After the data: the best for level 1 from the record.
  assert.match(rowText(run.memory, ROWS.best), /A\s+01234\b/);
  assert.ok(Buffer.from(run.memory.subarray(LEVEL_BUFFER, LEVEL_BUFFER + levelOneImage.length))
    .equals(levelOneImage), "the level image did not land");
});

test("START GAME with no record on the disk reads BEST as --", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  const run = startGame(drive);
  assert.equal(run.end, "start_gameplay");
  assert.match(rowText(run.memory, ROWS.best), /--/);
});

test("a corrupt record reads as empty: no error screen, BEST --", () => {
  for (const corrupt of ["checksum", "magic"]) {
    const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
    drive.sectors.set(SAVE_SECTOR, saveRecord({
      levels: { 1: { grade: "S", bcd: [0x00, 0x99, 0x99] } }, corrupt }));
    const run = startGame(drive);
    assert.equal(run.end, "start_gameplay", `${corrupt}: a corrupt record is not an error`);
    assert.match(rowText(run.memory, ROWS.best), /--/, `${corrupt}: the record was believed`);
  }
});

test("the summary stays up at least 3 s and FIRE continues only after the level has arrived (Q15)", () => {
  // FIRE is held from the menu and pressed again throughout: neither may end
  // the screen early. Only a press after both the minimum and the load counts.
  const drive = new Drive({ trig: (frame) => (frame % 6 < 3 ? 0 : 1) });
  const run = startGame(drive);
  assert.equal(run.end, "start_gameplay");
  const shown = run.firstSummaryFrame;
  assert.ok(Number.isInteger(shown));
  assert.ok(run.frames - shown >= 150, `the summary was up ${run.frames - shown} frames`);
  const lastRead = drive.readSectors.at(-1);
  assert.ok(lastRead >= 320 && lastRead < 512, "the level was not the last read");
});

test("the art and the restore precede the level, the level is read tail first, the record last of the reads", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  const memory = runtimeMemory();
  memory[reader("sr_slot_a_overlaid")] = 1;
  const run = startGame(drive, { memory });
  assert.equal(run.end, "start_gameplay");
  const sectors = drive.readSectors;
  const code = manifest.levelSummary.code;
  const art = manifest.levelSummary.art.runs[0];
  const level = manifest.sectorReader.levels.find((entry) => entry.id === 1);
  const expected = [
    ...Array.from({ length: code.sectors }, (_, i) => code.startSector + i),
    ...Array.from({ length: art.sectors }, (_, i) => art.startSector + i),
    ...Array.from({ length: 16 }, (_, i) => 512 + i),
    SAVE_SECTOR,
    ...Array.from({ length: level.sectors - 5 }, (_, i) => level.startSector + 5 + i),
    ...Array.from({ length: 5 }, (_, i) => level.startSector + i),
  ];
  assert.deepEqual(sectors, expected);
});

test("the second START GAME of a session reads no code and no level", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  const first = startGame(drive);
  assert.equal(first.end, "start_gameplay");
  const before = drive.readSectors.length;
  const again = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  const cpu = cpuOver(again, first.memory);
  cpu.pc = READER_BASE;
  runUntil(cpu, { start_gameplay: main("start_gameplay") });
  const art = manifest.levelSummary.art.runs[0];
  assert.deepEqual(again.readSectors,
    [...Array.from({ length: art.sectors }, (_, i) => art.startSector + i), SAVE_SECTOR],
    "the summary code and the resident level must not be read again");
  assert.ok(before > again.readSectors.length);
});

// --------------------------------------------------------------------------
// The START GAME identity (owner review of M5a-S2, 2026-10-03): the old
// loader's top line and one of its four AI lines, under the empty panel; the
// session's first START GAME shows that top line alone until the module is in.
// --------------------------------------------------------------------------

// The lines an ANTIC display list shows, from scanline 8: mode, first byte,
// scanline. Mode 2 and mode 4 lines are eight scanlines of 40 bytes each.
function displayLines(memory, start) {
  const lines = [];
  let pc = start;
  let scanline = 8;
  let address = 0;
  for (let guard = 0; guard < 256; guard += 1) {
    const op = memory[pc];
    const mode = op & 0x0f;
    if (mode === 0) { scanline += ((op >> 4) & 7) + 1; pc += 1; continue; }
    if (mode === 1) break;                       // JVB / JMP: the frame ends here
    if (op & 0x40) { address = memory[pc + 1] | (memory[pc + 2] << 8); pc += 3; } else pc += 1;
    lines.push({ mode, address, scanline });
    scanline += 8;
    address += 40;
  }
  return lines;
}

const AI_LINES = loadLoaderAiLines(path.join(root, "assets", "text", "loader-ai-lines.json"));
const ENGAGING = " ".repeat(9) + "ENGAGING ENEMY SECTOR" + " ".repeat(10);
const COLPF1 = 0xd017;
const COLPF2 = 0xd018;
const COLBK = 0xd01a;
const CHBASE = 0xd409;
const PICTURE = SCREEN + 480;

function assertSummaryBody(lines, firstPictureLine, where) {
  for (let row = 0; row < 10; row += 1) {
    assert.deepEqual([lines[firstPictureLine + row].mode, lines[firstPictureLine + row].address],
      [4, PICTURE + row * 40], `${where}: picture row ${row}`);
  }
}

test("the START GAME summary: ENGAGING ENEMY SECTOR on top, an AI line under the empty panel", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  const run = startGame(drive);
  assert.equal(run.end, "start_gameplay");
  const list = summary("summary_start_display_list");
  const first = displayLines(run.snapshot, list);
  // The top line: the old loader's line at the place the session's first
  // START GAME already shows it (scanline 32, column 9), no level number.
  assert.deepEqual([first[0].mode, first[0].address, first[0].scanline], [2, SCREEN, 32]);
  assert.equal(decode(run.snapshot, first[0].address, 40), ENGAGING);
  // The picture and the panel sit where the level-end summary has them.
  const levelEnd = displayLines(run.snapshot, summary("summary_display_list"));
  assertSummaryBody(first, 1, "START GAME");
  assert.equal(first[1].scanline, levelEnd[2].scanline, "the picture moved");
  for (let row = 2; row <= 9; row += 1) {
    const line = first[1 + 10 + row - 2];
    assert.deepEqual([line.mode, line.address], [2, SCREEN + row * 40], `panel row ${row}`);
    assert.equal(line.scanline, levelEnd[12 + row - 2].scanline, `panel row ${row} moved`);
  }
  // Under the panel (after BEST): one of the four AI lines, picked from
  // assets/text/loader-ai-lines.json; then the dotted row and the prompt.
  const ai = first[19];
  assert.equal(ai.mode, 2);
  const shown = decode(run.memory, ai.address, 40);
  assert.ok(AI_LINES.some((line) => shown === ` ${line} `), `not an AI line: "${shown}"`);
  assert.deepEqual(first.slice(20).map((line) => [line.mode, line.address]),
    [[2, SCREEN + 10 * 40], [2, SCREEN + 11 * 40]]);
  assert.equal(first.length, 22);
  assert.ok(!first.some((line) => /LEVEL/.test(decode(run.memory, line.address, 40))),
    "START GAME shows no LEVEL line until M4");
});

test("the level-end summary keeps its layout: LEVEL nn on top, the AI line under it", () => {
  const drive = new Drive({ trig: fireLate });
  const run = levelEnd(drive);
  assert.equal(run.end, "menu");
  const lines = displayLines(run.snapshot, summary("summary_display_list"));
  assert.deepEqual([lines[0].mode, lines[0].address, lines[0].scanline], [2, SCREEN, 24]);
  assert.match(decode(run.snapshot, SCREEN, 40), /LEVEL 01/);
  assert.deepEqual([lines[1].mode, lines[1].address], [2, SCREEN + 40]);
  assertSummaryBody(lines, 2, "level end");
  assert.deepEqual(lines.slice(12).map((line) => line.address),
    Array.from({ length: 10 }, (_, index) => SCREEN + (2 + index) * 40));
  const shown = decode(run.memory, SCREEN + 40, 40);
  assert.ok(AI_LINES.some((line) => shown === ` ${line} `), `not an AI line: "${shown}"`);
});

test("before the summary module arrives the screen shows only the summary's top line, in its place and colours", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  let interim = null;
  let summaryOn = null;
  const memory = runtimeMemory();
  const run = startGame(drive, {
    memory,
    watch: (pc) => {
      // $0500 is entered once the module's last sector has landed: the
      // interim screen has been up for the whole read and still is.
      if (pc === SUMMARY_BASE && interim === null) {
        interim = { memory: Uint8Array.from(memory), dlist: drive.dlist,
          dma: drive.dmactl.at(-1)?.value };
      }
      if (summaryOn === null && drive.dmactl.some((entry) => entry.value !== 0 &&
        entry.dlist === startDisplayList())) {
        summaryOn = Uint8Array.from(memory);
      }
    },
  });
  assert.equal(run.end, "start_gameplay");
  assert.ok(interim, "the module was never entered");
  assert.equal(interim.dma, 0x22, "the interim screen is not on");
  const lines = displayLines(interim.memory, interim.dlist);
  const text = lines.filter((line) => line.mode === 2)
    .map((line) => ({ ...line, text: decode(interim.memory, line.address, 40) }));
  const shown = text.filter((line) => line.text.trim() !== "");
  assert.equal(shown.length, 1, `the interim screen shows ${shown.map((l) => `"${l.text.trim()}"`).join(", ")}`);
  assert.equal(shown[0].text, ENGAGING);
  assert.equal(shown[0].scanline, 32, "not at the summary's top-line scanline");
  assert.ok(lines.every((line) => line.mode === 2), "the interim screen draws only text");
  // The summary's colours: ANTIC 2 text takes COLPF2's hue and COLPF1's
  // luminance; the summary's top line is luminance $A on black throughout.
  assert.equal(interim.memory[CHBASE], 0x48);
  assert.equal(interim.memory[COLPF2], 0x00);
  assert.equal(interim.memory[COLBK], 0x00);
  assert.equal(interim.memory[COLPF1] & 0x0f, 0x0a);
  assert.ok(summaryOn, "the START GAME summary never came on");
  assert.equal(summaryOn[COLPF1] & 0x0f, interim.memory[COLPF1] & 0x0f);
  assert.equal(summaryOn[COLPF2], 0x00);
  assert.equal(summaryOn[COLBK], 0x00);
  assert.equal(run.memory[COLPF1] & 0x0f, 0x0a, "the region palette changed the text luminance");
});

test("the summary changes display lists on a frame's edge, before ANTIC fetches the first line", () => {
  const drive = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  const run = startGame(drive);
  assert.equal(run.end, "start_gameplay");
  const switches = drive.dlistWrites.filter((entry) => entry.register === "H" &&
    entry.dlist === startDisplayList());
  assert.ok(switches.length > 0);
  for (const entry of switches) {
    // wait_frame_start returns on the first read after the 0: one read.
    assert.equal(entry.readsSinceEdge, 1, "the list changed mid-frame");
  }
});

// The level's end, from the reader's exit with the stats of a played level.
function levelEnd(drive, { setup = () => {} } = {}) {
  const memory = runtimeMemory();
  memory.set(levelOneImage, LEVEL_BUFFER);
  memory.set([50, 75, 200, 0, 170, 0, 1, 0, 0x00, 0x00], PAYLOAD_SUMMARY);
  setWord(memory, ZP.shots, 300);
  setWord(memory, ZP.hits, 228);            // 76 %
  setWord(memory, ZP.kills, 45);
  setWord(memory, ZP.bonus, 0);
  setWord(memory, main("ACTIVE_GAMEPLAY_FRAME_LO"), 8249);   // 2:44, 164 s
  memory[main("score_bcd_hi")] = 0x12;
  memory[main("score_bcd_lo")] = 0x34;
  memory[main("PLAYER_LIFECYCLE") + 1] = 2;   // one life lost
  setup(memory);
  const cpu = cpuOver(drive, memory);
  cpu.sp = 0xf0;
  cpu.pc = reader("sector_reader_level_end");
  let snapshot = null;
  let firstSummaryFrame = null;
  const ticks = [];
  const end = runUntil(cpu, {
    menu: main("quit_gameplay_to_menu"),
    failure: reader("sector_reader_failure_screen"),
  }, {
    watch: (pc) => {
      if (pc === 0xa60b) ticks.push(drive.frames);
      if (snapshot === null) {
        const on = drive.dmactl.find((entry) => entry.value !== 0 &&
          entry.dlist === summary("summary_display_list"));
        if (on) {
          firstSummaryFrame = on.frame;
          snapshot = Uint8Array.from(memory);
        }
      }
    },
  });
  return { end, memory, snapshot, firstSummaryFrame, ticks, frames: drive.frames };
}

const fireLate = (frame) => (frame > 220 && frame % 8 < 4 ? 0 : 1);

test("at the level's end every stat is on the summary's first frame", () => {
  const drive = new Drive({ trig: fireLate });
  const run = levelEnd(drive);
  assert.equal(run.end, "menu", "FIRE after the summary returns to the menu until M4");
  assert.ok(run.snapshot, "the summary's display list was never shown");
  const row = (name) => rowText(run.snapshot, ROWS[name]);
  assert.match(row("score"), /\b01234\b/);
  assert.match(row("kills"), /\b45\b/);
  assert.match(row("accuracy"), /\b76%/);
  assert.match(row("time"), /\b2:44\b/);
  assert.match(row("lives"), /\b1\b/);
  assert.match(row("bonus"), /00000/);
  // 76 % -> 2, 164 s -> 2, one life -> 1: tiers 5, grade A.
  assert.match(row("grade"), /\bA\b/);
  assert.ok(run.frames - run.firstSummaryFrame >= 150);
});

test("the save record round-trips: written at the level's end, read back at the next START GAME", () => {
  const drive = new Drive({ trig: fireLate });
  const run = levelEnd(drive);
  assert.equal(run.end, "menu");
  const writes = drive.writes.filter((entry) => entry.applied);
  assert.equal(writes.length, 1, "exactly one record write");
  const record = writes[0].data;
  assert.equal(record[0], 0x56);
  assert.equal(record[1], 0x52);
  assert.equal(record[2], 1);
  assert.equal(record[3], carryWrapChecksum(record.subarray(4)), "the record's checksum");
  assert.deepEqual([...record.subarray(64, 68)], [3, 0x00, 0x12, 0x34],
    "level 1: grade A and the score 01234");
  // The write is verified by reading the sector back.
  const reads = drive.readSectors;
  assert.equal(reads.at(-1), SAVE_SECTOR, "no read-back after the write");
  // The next session's START GAME shows it.
  const next = new Drive({ trig: (frame) => (frame > 200 && frame % 8 < 4 ? 0 : 1) });
  next.sectors.set(SAVE_SECTOR, record);
  const start = startGame(next);
  assert.match(rowText(start.memory, ROWS.best), /A\s+01234\b/);
});

test("a better result replaces the best and a worse one leaves it", () => {
  const worse = new Drive({ trig: fireLate });
  worse.sectors.set(SAVE_SECTOR, saveRecord({ levels: { 1: { grade: "S", bcd: [0x00, 0x99, 0x99] } } }));
  levelEnd(worse);
  assert.equal(worse.writes.length, 0, "nothing to save: the disk is not written");
  const better = new Drive({ trig: fireLate });
  better.sectors.set(SAVE_SECTOR, saveRecord({ levels: { 1: { grade: "B", bcd: [0x00, 0x05, 0x00] } } }));
  levelEnd(better);
  assert.equal(better.writes.length, 1);
  assert.deepEqual([...better.writes[0].data.subarray(64, 68)], [3, 0x00, 0x12, 0x34]);
});

test("a write-protected disk is skipped silently, either way a drive refuses", () => {
  for (const protect of ["error", "nak"]) {
    const drive = new Drive({ trig: fireLate, protect });
    const run = levelEnd(drive);
    assert.equal(run.end, "menu", `${protect}: the refusal must not reach an error screen`);
    assert.equal(drive.writes.filter((entry) => entry.applied).length, 0);
    // The comparison still shows for this session, from the RAM copy.
    assert.match(rowText(run.memory, ROWS.best), /A\s+01234\b/, protect);
  }
});

test("a write never targets any sector but the save record's", () => {
  const drive = new Drive({ trig: fireLate });
  levelEnd(drive);
  const writeFrames = drive.commandFrames.filter((frame) => frame[1] !== 0x52);
  assert.ok(writeFrames.length > 0);
  for (const frame of writeFrames) {
    assert.equal(frame[0], 0x31, "D1: only");
    assert.equal(frame[1], 0x50, "the put command, verified by our own read-back");
    assert.equal(frame[2] | (frame[3] << 8), SAVE_SECTOR);
  }
  // A directory that names any other sector for the record refuses the write.
  const entry = reader("overlay_directory") + 7 * 5;
  for (const sector of [598, 600, 1, 720]) {
    const guarded = new Drive({ trig: fireLate });
    levelEnd(guarded, { setup: (memory) => setWord(memory, entry, sector) });
    assert.equal(guarded.commandFrames.filter((frame) => frame[1] !== 0x52).length, 0,
      `a directory naming sector ${sector} still reached the write`);
  }
});

test("the finished level's music keeps ticking through the standard-speed reads", () => {
  const drive = new Drive({ trig: fireLate });
  const run = levelEnd(drive, {
    setup: (memory) => {
      memory[main("GAME_MUSIC_ENABLED")] = 1;
      memory[main("sound_enabled")] = 1;
      callRoutine(memory, 0xa608);          // GAMEPLAY_MUSIC_START, as gameplay left it
    },
  });
  assert.equal(run.end, "menu");
  // One tick per frame edge from the summary's first frame on, reads included.
  const during = run.ticks.filter((frame) => frame >= run.firstSummaryFrame);
  const span = run.frames - run.firstSummaryFrame;
  assert.ok(during.length >= span - 4,
    `${during.length} ticks over ${span} frames: the music stalled`);
  const frames = new Set(during);
  assert.ok(frames.size >= span - 4, "a tick per frame, not a burst");
});

test("sector_reader_load reads the level tail first: sectors 6..N, then 1..5", () => {
  const drive = new Drive();
  const memory = new Uint8Array(0x10000);
  memory.set(readerImage, READER_BASE);
  const cpu = cpuOver(drive, memory);
  const stop = 0x7ffe;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = READER_BASE + 3;
  cpu.a = 1;
  runUntil(cpu, { done: stop });
  const level = manifest.sectorReader.levels.find((entry) => entry.id === 1);
  assert.deepEqual(drive.readSectors, [
    ...Array.from({ length: level.sectors - 5 }, (_, i) => level.startSector + 5 + i),
    ...Array.from({ length: 5 }, (_, i) => level.startSector + i)]);
  assert.equal(cpu.p & nmos6502Flags.carry, 0);
  assert.ok(Buffer.from(memory.subarray(LEVEL_BUFFER, LEVEL_BUFFER + levelOneImage.length))
    .equals(levelOneImage));
});
