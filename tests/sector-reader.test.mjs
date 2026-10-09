// Roadmap 4.3 — the resident direct-SIO sector reader, driven against a
// scripted POKEY/PIA stub on the 6502 harness.
//
// The emulator only ever samples the protocol: it models no drive latency, no
// jitter, no bit errors and no command-line hold. This is where the error
// taxonomy of plan §3 and its retry counts are proven exhaustively, and where
// the three measured corrections to plan §1.1 are locked in so a later edit
// cannot quietly put them back (see the "corrections" tests at the end, and
// docs/diagnostics/sio-register-probe-2026-09-20.json).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadLoaderAiLines } from "../scripts/loader-ai-lines.mjs";
import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const labels = new Map();
for (const line of fs.readFileSync(path.join(root, "build/sector-reader.lbl"), "utf8")
  .split(/\r?\n/)) {
  const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
  if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
}
const readerImage = fs.readFileSync(path.join(root, "build/sector-reader.bin"));
// audit-hardening: the reader folds every sector it accepts into the disk
// guard's sum, and its run read checks the run there - the guard rides the
// Light kernel's record, resident from the boot on - so a machine that holds
// only the reader holds that record too.
const lightKernelImage = fs.readFileSync(path.join(root, "build/light-kernel.bin"));

// Music v2 §1.4 put the gameplay music player inside the level image, so the
// build's level-1 run is no longer two sectors. The fixtures follow the
// build's own directory rather than a literal, which is what the reader
// validates the header against.
const manifest = JSON.parse(fs.readFileSync(path.join(root, "build/manifest.json"), "utf8"));
const LEVEL_ONE_SECTORS = manifest.sectorReader.levels
  .find((level) => level.id === 1).sectors;
const READER_BASE = 0xa000;
const LEVEL_BUFFER = 0xa600;
const SECTOR_BYTES = 128;

const reg = {
  AUDF3: 0xd204, AUDC3: 0xd205, AUDF4: 0xd206, AUDC4: 0xd207, AUDCTL: 0xd208,
  SKRES: 0xd20a, SERIN: 0xd20d, SEROUT: 0xd20d, IRQEN: 0xd20e, IRQST: 0xd20e,
  SKCTL: 0xd20f, SKSTAT: 0xd20f, PBCTL: 0xd303, WSYNC: 0xd40a, VCOUNT: 0xd40b,
};

const status = {
  OK: 0, NO_DEVICE: 1, WIRE_EXHAUSTED: 2, DEVICE_ERROR: 3, BAD_IMAGE: 4,
};

const IRQ_SERIN = 0x20;
const IRQ_SEROUT_RDY = 0x10;
const IRQ_XMTDONE = 0x08;

// SKSTAT with no error: bit 7 framing OK, bit 5 serial overrun OK. Bit 6 is
// the KEYBOARD overrun and must never be read as a wire error.
const SKSTAT_CLEAN = 0xff;
const SKSTAT_FRAMING_ERROR = 0xff & ~0x80;
const SKSTAT_SERIAL_OVERRUN = 0xff & ~0x20;
const SKSTAT_KEYBOARD_OVERRUN = 0xff & ~0x40;

function carryWrapChecksum(bytes) {
  let sum = 0;
  for (const byte of bytes) {
    sum += byte;
    if (sum > 0xff) sum = (sum & 0xff) + 1;
  }
  return sum & 0xff;
}

// A level image: header per plan §1.4 plus a pattern payload.
function levelImage({ id = 1, sectors = LEVEL_ONE_SECTORS, version = 1, magic = "VS" } = {}) {
  const bytes = Buffer.alloc(sectors * SECTOR_BYTES);
  bytes[0] = magic.charCodeAt(0);
  bytes[1] = magic.charCodeAt(1);
  bytes[2] = version;
  bytes[3] = id;
  bytes[4] = sectors;
  const payload = sectors * SECTOR_BYTES - 8;
  bytes[5] = payload & 0xff;
  bytes[6] = payload >> 8;
  bytes[7] = 0;
  for (let i = 8; i < bytes.length; i += 1) bytes[i] = (i * 7 + 0x5a) & 0xff;
  return bytes;
}

/**
 * Scripted POKEY/PIA stub.
 *
 * The reader polls; the stub answers. Transmission completes a byte at a time
 * on the next IRQST read. Reception delivers a queued byte only while the
 * serial-input latch is armed, which is what makes the reader's per-byte
 * IRQEN re-arm load-bearing rather than decorative.
 *
 * `respond` is called once per command frame with the five frame bytes and
 * returns the wire response: a list of {byte, skstat} entries, or fewer bytes
 * than the reader expects to model silence at that point.
 */
class PokeyStub {
  constructor({ respond, vcountPeriod = 3 } = {}) {
    this.respond = respond;
    this.vcountPeriod = vcountPeriod;   // VCOUNT reads per simulated PAL frame
    this.vcountReads = 0;
    this.vcount = 0;

    this.skctl = 0;
    this.irqen = 0;
    this.latched = 0;                   // bits currently asserted (active-low in IRQST)
    this.commandLine = false;
    this.frameBytes = [];
    this.commandFrames = [];            // every frame the reader put on the wire
    this.skctlDuringTransmit = new Set();
    this.skctlDuringReceive = new Set();
    this.txPending = false;
    this.txOutstanding = 0;
    this.rxQueue = [];
    this.serin = 0;
    this.skstat = SKSTAT_CLEAN;
    this.skresWrites = 0;
    this.wsyncBeforeFirstByte = 0;
    this.wsyncAfterLastByte = 0;
    this.countingPreHold = false;
    this.countingPostHold = false;
  }

  read(address) {
    switch (address) {
      case reg.VCOUNT: {
        this.vcountReads += 1;
        if (this.vcountReads % this.vcountPeriod === 0) {
          this.vcount = 0;              // the wrap past line 312: a frame edge
        } else {
          this.vcount = (this.vcount + 1) & 0x7f;
          if (this.vcount === 0) this.vcount = 1;
        }
        return this.vcount;
      }
      case reg.IRQST: {
        this.advance();
        return 0xff & ~this.latched;    // an asserted bit reads 0
      }
      case reg.SKSTAT:
        return this.skstat;
      default:
        return undefined;
    }
  }

  write(address, value) {
    switch (address) {
      case reg.IRQEN: {
        // Writing a bit low resets that latch; bit 3 is not latched at all.
        const cleared = (~value) & 0xff;
        this.latched &= ~(cleared & (IRQ_SERIN | IRQ_SEROUT_RDY));
        this.irqen = value;
        return false;
      }
      case reg.SKCTL:
        this.skctl = value;
        if (value === 0x00) {           // full serial reset
          this.latched = 0;
          this.txPending = false;
          this.txOutstanding = 0;
          this.rxQueue = [];
        }
        return false;
      case reg.SKRES:
        this.skresWrites += 1;
        this.skstat = SKSTAT_CLEAN;
        return false;
      case reg.SEROUT:
        if (this.commandLine) {
          if (this.frameBytes.length === 0) this.countingPreHold = false;
          this.frameBytes.push(value);
          this.skctlDuringTransmit.add(this.skctl);
        }
        this.txPending = true;
        this.txOutstanding += 1;
        this.latched &= ~IRQ_XMTDONE;
        return false;
      case reg.PBCTL:
        if (value === 0x34) {
          this.commandLine = true;
          this.frameBytes = [];
          this.countingPreHold = true;
          this.wsyncBeforeFirstByte = 0;
        } else if (value === 0x3c && this.commandLine) {
          this.commandLine = false;
          this.countingPostHold = false;
          if (this.frameBytes.length === 5) {
            this.commandFrames.push([...this.frameBytes]);
            this.rxQueue = this.respond([...this.frameBytes], this.commandFrames.length);
          }
        }
        return false;
      case reg.WSYNC:
        if (this.countingPreHold) this.wsyncBeforeFirstByte += 1;
        if (this.countingPostHold) this.wsyncAfterLastByte += 1;
        return false;
      default:
        return undefined;        // not a register: let the store reach RAM
    }
  }

  advance() {
    if (!this.commandLine && this.skctl !== 0x00) this.skctlDuringReceive.add(this.skctl);
    // Transmission: the queued byte moves into the shift register, freeing
    // SEROUT (bit 4). When nothing is outstanding the register is idle (bit 3).
    if (this.txPending) {
      this.latched |= IRQ_SEROUT_RDY;
      this.txPending = false;
      this.txOutstanding -= 1;
      if (this.txOutstanding <= 0) {
        this.txOutstanding = 0;
        this.latched |= IRQ_XMTDONE;
        if (this.frameBytes.length === 5) {
          this.countingPostHold = true;
          this.wsyncAfterLastByte = 0;
        }
      }
      return;
    }
    if (this.txOutstanding === 0) this.latched |= IRQ_XMTDONE;
    // Reception: only while the input latch is armed and not already asserted.
    if (this.rxQueue.length > 0 && (this.irqen & IRQ_SERIN) !== 0 &&
      (this.latched & IRQ_SERIN) === 0) {
      const next = this.rxQueue.shift();
      this.serin = next.byte & 0xff;
      this.skstat = next.skstat ?? SKSTAT_CLEAN;
      this.latched |= IRQ_SERIN;
    }
  }
}

function runLoad(stub,
  { levelId = 1, buffer = null, maxSteps = 8_000_000, directorySectors = null } = {}) {
  const memory = new Uint8Array(0x10000);
  memory.set(readerImage, READER_BASE);
  memory.set(lightKernelImage, manifest.lightKernel.address);
  if (buffer) memory.set(buffer, LEVEL_BUFFER);
  // Owner decision X: the directory's sector count is what the MAX_LEVEL_SECTORS
  // bound is checked against, so a test of that bound patches the count rather
  // than the header the reader has not read yet.
  if (directorySectors !== null) {
    memory[labels.get("sector_reader_directory") + (levelId - 1) * 3 + 2] = directorySectors;
  }

  const cpu = new Nmos6502(memory, {
    read: (address) => {
      if (address === reg.SERIN) { stub.advance(); return stub.serin; }
      return stub.read(address);
    },
    write: (address, value) => stub.write(address, value),
  });

  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get("sector_reader_load");
  cpu.a = levelId;

  let steps = 0;
  while (steps < maxSteps && cpu.pc !== stop) { cpu.step(); steps += 1; }
  assert.notEqual(steps, maxSteps, "sector_reader_load did not return");

  return {
    status: cpu.a,
    failed: (cpu.p & nmos6502Flags.carry) !== 0,
    memory,
    steps,
  };
}

// A device that answers one whole sector correctly.
function sectorResponse(image, sectorIndex, { skstat = SKSTAT_CLEAN } = {}) {
  const slice = image.subarray(sectorIndex * SECTOR_BYTES, (sectorIndex + 1) * SECTOR_BYTES);
  const out = [{ byte: 0x41 }, { byte: 0x43 }];
  for (const byte of slice) out.push({ byte, skstat });
  out.push({ byte: carryWrapChecksum(slice) });
  return out;
}

function healthyDevice(image, base = 320) {
  return (frame) => {
    const sector = frame[2] | (frame[3] << 8);
    return sectorResponse(image, sector - base, {});
  };
}

test("a healthy drive delivers the level image byte-exactly", () => {
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  const result = runLoad(stub);

  assert.equal(result.failed, false);
  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS, "one command frame per sector");
  assert.deepEqual(
    Buffer.from(result.memory.subarray(LEVEL_BUFFER, LEVEL_BUFFER + image.length)),
    image,
    "the buffer does not hold the image the drive sent");
});

test("the command frame is D1:, read sector, with a carry wrap-around checksum", () => {
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  runLoad(stub);

  // RE-POINTED 2026-10-03 (M5a-S2, §4.8.1): the level is read tail first, so
  // the first frame names the image's sixth sector, 320 + 5; the frame format,
  // its checksum and the advancing sector number are what this test pins.
  const [first, second] = stub.commandFrames;
  assert.deepEqual(first.slice(0, 4), [0x31, 0x52, 325 & 0xff, 325 >> 8]);
  assert.equal(first[4], carryWrapChecksum(first.slice(0, 4)));
  assert.deepEqual(second.slice(0, 4), [0x31, 0x52, 326 & 0xff, 326 >> 8],
    "the sector number must advance");
  assert.equal(second[4], carryWrapChecksum(second.slice(0, 4)));
});

test("a buffer that already holds the image sends no command frame at all", () => {
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: () => { throw new Error("SIO was touched"); } });
  const result = runLoad(stub, { buffer: image });

  assert.equal(result.failed, false);
  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, 0,
    "the resident skip must not reach the wire (owner decision 1)");
});

test("a buffer holding a DIFFERENT level is not mistaken for a hit", () => {
  const resident = levelImage({ id: 3 });
  const wanted = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(wanted) });
  const result = runLoad(stub, { buffer: resident, levelId: 1 });

  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS, "the stale image must be re-read");
});

// --- plan §3 error taxonomy -------------------------------------------------

test("wire: ACK then silence exhausts at exactly 3 attempts", () => {
  const stub = new PokeyStub({ respond: () => [{ byte: 0x41 }] });   // ACK, then nothing
  const result = runLoad(stub);

  assert.equal(result.failed, true);
  assert.equal(result.status, status.WIRE_EXHAUSTED);
  assert.equal(stub.commandFrames.length, 3, "3 wire attempts per sector");
});

test("wire: NAK three times is WIRE_EXHAUSTED, not NO_DEVICE", () => {
  const stub = new PokeyStub({ respond: () => [{ byte: 0x4e }] });
  const result = runLoad(stub);

  assert.equal(result.status, status.WIRE_EXHAUSTED);
  assert.equal(stub.commandFrames.length, 3);
});

test("wire: a framing error on a data byte retries, and the retry succeeds", () => {
  const image = levelImage({ id: 1 });
  let frames = 0;
  const stub = new PokeyStub({
    respond: (frame) => {
      frames += 1;
      const sector = frame[2] | (frame[3] << 8);
      const response = sectorResponse(image, sector - 320);
      if (frames === 1) response[10].skstat = SKSTAT_FRAMING_ERROR;
      return response;
    },
  });
  const result = runLoad(stub);

  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS + 1,
    "one retry on sector 0, then the remaining sectors");
});

test("wire: a serial overrun on a data byte retries", () => {
  const image = levelImage({ id: 1 });
  let frames = 0;
  const stub = new PokeyStub({
    respond: (frame) => {
      frames += 1;
      const sector = frame[2] | (frame[3] << 8);
      const response = sectorResponse(image, sector - 320);
      if (frames === 1) response[40].skstat = SKSTAT_SERIAL_OVERRUN;
      return response;
    },
  });
  const result = runLoad(stub);

  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS + 1);
});

test("wire: a bad data checksum retries, and the retry succeeds", () => {
  const image = levelImage({ id: 1 });
  let frames = 0;
  const stub = new PokeyStub({
    respond: (frame) => {
      frames += 1;
      const sector = frame[2] | (frame[3] << 8);
      const response = sectorResponse(image, sector - 320);
      if (frames === 1) response[response.length - 1].byte ^= 0xff;
      return response;
    },
  });
  const result = runLoad(stub);

  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS + 1);
});

test("device: $45 ERROR fails immediately with no retry (owner decision 3)", () => {
  const stub = new PokeyStub({ respond: () => [{ byte: 0x41 }, { byte: 0x45 }] });
  const result = runLoad(stub);

  assert.equal(result.failed, true);
  assert.equal(result.status, status.DEVICE_ERROR);
  assert.equal(stub.commandFrames.length, 1,
    "a drive has already retried internally before it answers $45");
});

test("no device: silence ends in NO_DEVICE after exactly 2 probes", () => {
  const stub = new PokeyStub({ respond: () => [] });
  const result = runLoad(stub);

  assert.equal(result.failed, true);
  assert.equal(result.status, status.NO_DEVICE);
  assert.equal(stub.commandFrames.length, 2,
    "2 probes, and a probe must not consume one of the sector's wire attempts");
});

test("image: a clean read of the wrong level id is BAD_IMAGE", () => {
  const image = levelImage({ id: 7 });    // the disk holds level 7
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  const result = runLoad(stub, { levelId: 1 });       // the game asked for 1

  assert.equal(result.failed, true);
  assert.equal(result.status, status.BAD_IMAGE);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS, "no retry: the disk is simply wrong");
});

test("image: a clean read with the wrong magic is BAD_IMAGE", () => {
  const image = levelImage({ id: 1, magic: "XX" });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  const result = runLoad(stub);

  assert.equal(result.status, status.BAD_IMAGE);
});

test("image: a clean read with the wrong format version is BAD_IMAGE", () => {
  const image = levelImage({ id: 1, version: 2 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  const result = runLoad(stub);

  assert.equal(result.status, status.BAD_IMAGE);
});

test("image: a header sector count disagreeing with the directory is BAD_IMAGE", () => {
  const image = levelImage({ id: 1 });
  image[4] = LEVEL_ONE_SECTORS + 1;                    // header claims one sector too many
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  const result = runLoad(stub);

  assert.equal(result.status, status.BAD_IMAGE);
});

test("directory: a level the build never placed is rejected without touching SIO", () => {
  const stub = new PokeyStub({ respond: () => { throw new Error("SIO was touched"); } });
  const result = runLoad(stub, { levelId: 5 });

  assert.equal(result.failed, true);
  assert.equal(result.status, status.BAD_IMAGE);
  assert.equal(stub.commandFrames.length, 0);
});

// Owner decision X (2026-09-21) made the level buffer 32 sectors, not 44; Q-1
// (owner, 2026-09-23) makes it **16** sectors (2,048 B), and $AE00-$BBFF now
// belongs to HYBRID_C_WINDOW. The bound is what stops a directory entry from
// writing the reader's own neighbours, so gate it rather than infer it from
// the constant.
test("directory: a level claiming more than 16 sectors is rejected before SIO", () => {
  for (const sectors of [17, 32, 33, 44, 45, 255]) {
    const stub = new PokeyStub({ respond: () => { throw new Error("SIO was touched"); } });
    const result = runLoad(stub, { directorySectors: sectors });
    assert.equal(result.status, status.BAD_IMAGE, `${sectors} sectors`);
    assert.equal(result.failed, true, `${sectors} sectors`);
    assert.equal(stub.commandFrames.length, 0, `${sectors} sectors`);
  }
});

test("directory: a level of exactly 16 sectors still reaches the wire", () => {
  const stub = new PokeyStub({ respond: () => [] });
  const result = runLoad(stub, { directorySectors: 16 });
  // The stub answers nothing, so the read fails on the wire - but it is a WIRE
  // failure, which proves the sector count passed the bound instead of being
  // refused as BAD_IMAGE before a single command frame was sent.
  assert.notEqual(result.status, status.BAD_IMAGE);
  assert.ok(stub.commandFrames.length > 0, "16 sectors must not be refused before SIO");
});

test("directory: level id 0 and 17 are rejected", () => {
  for (const levelId of [0, 17]) {
    const stub = new PokeyStub({ respond: () => { throw new Error("SIO was touched"); } });
    const result = runLoad(stub, { levelId });
    assert.equal(result.status, status.BAD_IMAGE, `level id ${levelId}`);
    assert.equal(stub.commandFrames.length, 0);
  }
});

// --- the timing primitive ---------------------------------------------------

test("wait_serial counts frames on the VCOUNT wrap, not on VCOUNT falling", () => {
  // A realistic descent 155,154,...,0 inside one frame must NOT be counted as
  // 155 frame edges: only the wrap back up is an edge. The stub's own VCOUNT
  // model is replaced here by an explicit scripted sequence.
  const sequence = [];
  for (let frame = 0; frame < 4; frame += 1) {
    for (let line = 0; line <= 155; line += 1) sequence.push(line);
  }
  let index = 0;

  const memory = new Uint8Array(0x10000);
  memory.set(readerImage, READER_BASE);
  memory.set(lightKernelImage, manifest.lightKernel.address);
  const cpu = new Nmos6502(memory, {
    read: (address) => {
      if (address === reg.VCOUNT) return sequence[Math.min(index++, sequence.length - 1)];
      if (address === reg.IRQST) return 0xff;      // nothing ever asserts
      return undefined;
    },
    write: () => undefined,
  });
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = labels.get("sector_reader_wait_serial");
  cpu.x = IRQ_SERIN;
  cpu.a = 3;                                        // a 3-frame budget

  let steps = 0;
  while (steps < 2_000_000 && cpu.pc !== stop) { cpu.step(); steps += 1; }
  assert.notEqual(steps, 2_000_000, "wait_serial did not return");
  assert.equal((cpu.p & nmos6502Flags.carry) !== 0, true, "must report a timeout");
  assert.ok(index > 2 * 156,
    `a 3-frame budget must span about three 156-line frames, saw ${index} VCOUNT reads`);
});

// --- the three measured corrections to plan §1.1 ----------------------------
//
// Each of these fails on a reader built to the plan as approved. They are the
// negative controls for docs/diagnostics/sio-register-probe-2026-09-20.json.

test("[C1] SKCTL is $23 while transmitting and $33 while receiving, never $13", () => {
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  runLoad(stub);

  assert.deepEqual([...stub.skctlDuringTransmit], [0x23],
    "the command frame must be clocked in transmit mode %010; $13 clocks the " +
    "output from the external clock and never reaches the wire");
  assert.ok(stub.skctlDuringReceive.has(0x33),
    "the reply must be received in asynchronous mode %011");
  assert.ok(!stub.skctlDuringTransmit.has(0x13), "$13 must never be a transmit mode");
});

test("[C2] a keyboard overrun is not a wire error", () => {
  // SKSTAT bit 6 is the KEYBOARD overrun. The plan's $C0 mask would have read
  // this as a corrupt byte and burned all three attempts on a clean sector.
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({
    respond: (frame) => {
      const sector = frame[2] | (frame[3] << 8);
      return sectorResponse(image, sector - 320, { skstat: SKSTAT_KEYBOARD_OVERRUN });
    },
  });
  const result = runLoad(stub);

  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS, "no retry may be spent on the keyboard");
});

test("[C3] both command-line hold windows are spent in WSYNC", () => {
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  runLoad(stub);

  // HRM ch.9 step 1: 750-1600 us before the first byte, 650-950 us after the
  // last. A PAL line is ~64.3 us.
  assert.equal(stub.wsyncBeforeFirstByte, 16,
    "the pre-frame delay the plan omitted: 16 lines ~ 1028 us");
  assert.equal(stub.wsyncAfterLastByte, 12,
    "the post-frame hold: 12 stores = 11-12 lines = 707-771 us");
});

test("every received byte re-arms the serial input latch", () => {
  // Overruns are not detected at all while the interrupt is unarmed, so the
  // re-arm is the acknowledgement, not housekeeping. The stub refuses to
  // deliver a byte while the latch is still asserted, so a reader that
  // stopped re-arming would stall and fail this as a timeout.
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  const result = runLoad(stub);

  assert.equal(result.status, status.OK);
  assert.ok(stub.skresWrites >= LEVEL_ONE_SECTORS * (SECTOR_BYTES + 3),
    `SKRES clears the sticky overrun bit after every byte, saw ${stub.skresWrites}`);
});

test("the reader hands POKEY back quiesced", () => {
  const image = levelImage({ id: 1 });
  const stub = new PokeyStub({ respond: healthyDevice(image) });
  runLoad(stub);

  assert.equal(stub.irqen, 0x00, "IRQEN must be left clear");
  assert.equal(stub.skctl, 0x13, "SKCTL must be left at rest");
  assert.equal(stub.commandLine, false, "the command line must be released");
});

// --- the step 4 boundary ----------------------------------------------------

test("the entry vectors sit at $A000 in a frozen order", () => {
  // main.s reaches the reader through these addresses alone, so their order
  // is an ABI. Each is a JMP ($4C) to a routine inside the reader. M5a-S1
  // (owner Q11): $A006 became the overlay run read and the 4.9 drain
  // predicate, never bound, was appended at $A009.
  const vectors = ["sector_reader_start_gameplay", "sector_reader_load",
    "sector_reader_read_run", "sector_reader_drain_ready"];
  vectors.forEach((name, index) => {
    const offset = index * 3;
    assert.equal(readerImage[offset], 0x4c, `vector ${index} is not a JMP`);
    const target = readerImage[offset + 1] | (readerImage[offset + 2] << 8);
    assert.equal(target, labels.get(name), `vector ${index} does not reach ${name}`);
    assert.ok(target >= READER_BASE && target < READER_BASE + readerImage.length,
      `vector ${index} leaves the reader`);
  });
});

test("main.s enters the reader by constant, and START GAME costs MAIN nothing", () => {
  const source = fs.readFileSync(path.join(root, "src/main.s"), "utf8");
  assert.match(source, /^SECTOR_READER_ENTRY = \$A000/m);
  assert.match(source, /^SECTOR_READER_LOAD {2}= \$A003/m);
  assert.match(source, /^SECTOR_READER_READ_RUN = \$A006/m);
  assert.match(source, /^SECTOR_READER_DRAIN = \$A009/m);
  // Operand-only: `jmp start_gameplay` and `jmp SECTOR_READER_ENTRY` are both
  // three bytes, which is why the hook needs no room in MAIN.
  assert.match(source, /jmp SECTOR_READER_ENTRY/);
  // The review-harness variants keep the direct jump (plan §4).
  const directJumps = source.split(/\r?\n/)
    .filter((line) => /^\s+jmp start_gameplay\s*(;.*)?$/.test(line));
  assert.equal(directJumps.length, 2,
    "only the two review-harness sites may still jump straight into gameplay");
});

// RE-POINTED 2026-10-03 (M5a-S2, Q3: "S2 moves every text to disk"): the pool
// left the reader with the loader screen; the four 38-character lines travel
// in each region's summary art run (tests/overlay-slot.test.mjs checks them
// against the asset). What stays pinned here: the format, and that the reader
// carries no copy.
// RE-POINTED (fix/smoke-2026-10-07 P3): the lines left the art runs (the
// summary no longer draws them); the format is the asset's, read through its
// converter, which pads each line to 38 characters.
test("the AI text pool is four lines of 38 characters", () => {
  const source = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  assert.doesNotMatch(source, /AI_LINE_COUNT|ai_line_pool/);
  const lines = loadLoaderAiLines(path.join(root, "assets", "text", "loader-ai-lines.json"));
  assert.equal(lines.length, 4);
  for (const line of lines) {
    assert.equal(line.length, 38, `"${line}" is not 38 characters`);
    assert.match(line, /^[A-Z0-9 \-./:?]*$/,
      "the frontend charset has no glyph for this line");
  }
});

test("the failure screen names every status and offers a way out", () => {
  const source = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  // One ten-character reason per status code 1..4, in status order.
  // The AI pool that used to follow is an include since M5a-S1.
  const reasons = source.slice(source.indexOf("failure_reasons:"),
    source.indexOf('.include "loader-ai-lines.inc"'));
  const words = [...reasons.matchAll(/\.byte "([^"]*)"/g)].map((match) => match[1]);
  assert.deepEqual(words, ["NO DRIVE  ", "READ ERROR", "BAD DISK  ", "WRONG DISK"]);
  assert.match(source, /"DISK READ FAILED"/);
  assert.match(source, /"PRESS FIRE"/);
  // The way out: wait for a clean press, then hand back to the menu. A reader
  // that exhausts its retries must never leave the player on a frozen screen.
  assert.match(source, /sector_reader_wait_for_fire:[\s\S]*?jsr wait_frame_start[\s\S]*?lda TRIG0/);
  assert.match(source, /jsr sector_reader_wait_for_fire\s+jmp quit_gameplay_to_menu/);
});

// RE-POINTED 2026-10-03 (M5a-S2, decision 26: "the reader's loading screen
// becomes the summary screen"). The loader screen and its ENGAGING ENEMY SECTOR
// line (owner, 2026-09-23) are gone; the summary's title and prompt take their
// place. What this test pinned is kept for them: centred on the 40-column
// line, every character in the frontend charset, and the reader still fits.
test("the level loading screen reads ENGAGING ENEMY SECTOR, centred and in charset", () => {
  // RE-POINTED 2026-10-03 (owner review of M5a-S2): START GAME keeps the old
  // loader's identity again. The line is one record in the reader, row 0
  // column 9 (centred for 21 characters as the loader had it), drawn by the
  // interim screen and by the summary's START GAME screen; the old loader's
  // record list and its AI pool stay gone.
  const reader = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  assert.doesNotMatch(reader, /loader_records|ai_line_pool/,
    "the replaced loader screen is still shipped");
  assert.match(reader,
    /sr_engaging_record:\s+\.byte <\(SCREEN \+ 9\), >\(SCREEN \+ 9\)\s+\.byte "ENGAGING ENEMY SECTOR", \$00\s+\.byte \$FF/);
  const summary = fs.readFileSync(path.join(root, "src/hybrid/level-summary.s"), "utf8");
  const SCREEN_COLUMNS = 40;
  for (const [text, column, width] of [["ENGAGING ENEMY SECTOR", 9, 21]]) {
    assert.ok(Math.abs(column - Math.floor((SCREEN_COLUMNS - width) / 2)) <= 1);
    assert.match(text, /^[A-Z0-9 \-./:?]*$/);
  }
  for (const [text, column, width] of [["LEVEL", 16, 8], ["LOADING", 16, 7],
    ["PRESS FIRE", 15, 10]]) {
    assert.ok(summary.includes(`.byte "${text}", $00`), `the summary does not draw ${text}`);
    assert.ok(column + width <= SCREEN_COLUMNS);
    assert.ok(Math.abs(column - Math.floor((SCREEN_COLUMNS - width) / 2)) <= 1,
      `"${text}" sits at column ${column}, not centred`);
    assert.match(text, /^[A-Z0-9 \-./:?]*$/);
  }
  const trace = JSON.parse(fs.readFileSync(path.join(root, "docs/runtime-wall-trace.json"), "utf8"));
  assert.ok(trace.boot_smoke.sector_reader.free_bytes >= 0,
    "the sector reader overflows its window");
  assert.ok(manifest.sectorReader.freeBytes >= 0);
});

// --- M5a-S1: the overlay run read, the capital restore, its failure path -----
//
// docs/plans/m5-loading-boss.md §4.1-4.2, §4.7. The device below answers from
// the built ATR itself, so these read the real restore run and the real level
// image at their real sector numbers.

const ATR_HEADER_BYTES = 16;
const builtAtr = fs.readFileSync(path.join(root, "dist/void-strike-65.atr"));
const atrSector = (sector) => builtAtr.subarray(ATR_HEADER_BYTES + (sector - 1) * SECTOR_BYTES,
  ATR_HEADER_BYTES + sector * SECTOR_BYTES);
const overlays = manifest.overlays ?? {};
const slotA = overlays.slotA ?? { address: 0, endExclusive: 0, bytes: 0 };
const capitalVectors = overlays.capitalVectors ?? { address: 0, bytes: 0 };
const broadsideResident = fs.readFileSync(path.join(root, "build/broadside-runtime.bin"));
const residentSlotA = broadsideResident.subarray(
  slotA.address - manifest.broadsideRuntime.runAddress,
  slotA.endExclusive - manifest.broadsideRuntime.runAddress);
const residentVectorTable = lightKernelImage.subarray(
  capitalVectors.address - manifest.lightKernel.address,
  capitalVectors.address - manifest.lightKernel.address + capitalVectors.bytes);
const mainAbi = new Map(fs.readFileSync(path.join(root, "build/main-abi.inc"), "utf8")
  .split(/\r?\n/).map((line) => /^(\w+)\s+= \$([0-9A-F]+)/.exec(line))
  .filter(Boolean).map((match) => [match[1], Number.parseInt(match[2], 16)]));

// Answers every command frame with the ATR's own sector; `fail` may replace
// the answer for one absolute sector number.
function atrDevice({ fail = null } = {}) {
  return (frame) => {
    const sector = frame[2] | (frame[3] << 8);
    if (fail && fail.sector === sector) return fail.response;
    const slice = atrSector(sector);
    const out = [{ byte: 0x41 }, { byte: 0x43 }];
    for (const byte of slice) out.push({ byte });
    out.push({ byte: carryWrapChecksum(slice) });
    return out;
  };
}

function cpuOver(stub, memory) {
  return new Nmos6502(memory, {
    read: (address) => {
      if (address === reg.SERIN) { stub.advance(); return stub.serin; }
      return stub.read(address);
    },
    write: (address, value) => stub.write(address, value),
  });
}

function runReadRun(stub, index, { emptyEntry = null } = {}) {
  const memory = new Uint8Array(0x10000);
  memory.set(readerImage, READER_BASE);
  memory.set(lightKernelImage, manifest.lightKernel.address);
  // S5-1: every entry is on the disk now; a test empties one in memory.
  if (emptyEntry !== null) memory[labels.get("overlay_directory") + emptyEntry * 5 + 2] = 0;
  const cpu = cpuOver(stub, memory);
  const stop = 0x7fff;
  cpu.push((stop - 1) >> 8);
  cpu.push((stop - 1) & 0xff);
  cpu.pc = READER_BASE + 6;                       // the $A006 vector itself
  cpu.x = index;
  let steps = 0;
  while (steps < 8_000_000 && cpu.pc !== stop) { cpu.step(); steps += 1; }
  assert.notEqual(steps, 8_000_000, "sector_reader_read_run did not return");
  return { memory, status: cpu.a, failed: (cpu.p & nmos6502Flags.carry) !== 0 };
}

// START GAME from the reader's $A000 entry. RE-POINTED 2026-10-03 (M5a-S2):
// START GAME now passes the level-summary screen, which calls main's music,
// screen and frame routines and reads its module from the disk, so the real
// resident runtime is installed instead of `rts` stubs, and FIRE is pressed
// every few frames for the summary to accept once its minimum and the reads
// are done. It ends at start_gameplay (success) or at the failure screen.
function runStartGame(stub, { overlaid }) {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  memory.set(readerImage, READER_BASE);
  // What a boss overlay would leave behind: other bytes in the slot and the table.
  memory.fill(0x00, slotA.address, slotA.endExclusive);
  memory.fill(0x00, capitalVectors.address, capitalVectors.address + capitalVectors.bytes);
  memory[labels.get("sr_slot_a_overlaid")] = overlaid ? 1 : 0;
  const cpu = new Nmos6502(memory, {
    read: (address) => {
      if (address === reg.SERIN) { stub.advance(); return stub.serin; }
      if (address === 0xd010) {
        return Math.floor(stub.vcountReads / stub.vcountPeriod) % 8 < 4 ? 1 : 0;
      }
      return stub.read(address);
    },
    write: (address, value) => stub.write(address, value),
  });
  cpu.pc = READER_BASE;
  const ends = new Map([[mainAbi.get("start_gameplay"), "start_gameplay"],
    [labels.get("sector_reader_failure_screen"), "failure_screen"]]);
  let steps = 0;
  while (steps < 120_000_000 && !ends.has(cpu.pc)) { cpu.step(); steps += 1; }
  assert.notEqual(steps, 120_000_000, "START GAME neither started gameplay nor failed");
  return { memory, end: ends.get(cpu.pc), status: cpu.a };
}

// RE-POINTED 2026-10-03 (M5a-S2): sectors from 512 also hold the summary's
// module and art now; the capital restore run is 512-527.
const overlaySectors = (stub) => stub.commandFrames.map((frame) => frame[2] | (frame[3] << 8))
  .filter((sector) => sector >= 512 && sector < 528);
const summarySectorCount = manifest.levelSummary.code.sectors +
  manifest.levelSummary.art.sectorsPerRegion + 1;

test("the run read at $A006 lands the capital restore run in slot A byte for byte", () => {
  assert.equal(slotA.bytes, 2048, "the manifest declares no 16-sector slot A");
  const stub = new PokeyStub({ respond: atrDevice() });
  const result = runReadRun(stub, 0);
  assert.equal(result.failed, false);
  assert.equal(result.status, status.OK);
  assert.equal(stub.commandFrames.length, slotA.bytes / SECTOR_BYTES, "one frame per sector");
  assert.ok(Buffer.from(result.memory.subarray(slotA.address, slotA.endExclusive))
    .equals(residentSlotA), "slot A does not hold the resident capital image");
});

test("a directory entry the build left empty is rejected without touching SIO", () => {
  // RE-POINTED 2026-10-03 (M5a-S2): entries 6-8 are the summary's now; 1-5
  // (M5b) are still empty, and 9 is past the directory's end.
  // RE-POINTED 2026-10-04 (M5b-S3): entry 1 is the boss code and 2 region 1's
  // staging run now; regions 2-4 (entries 3-5) stay empty until S5, so the
  // empty-entry path is exercised on 3 and 5. The assertions are unchanged.
  // RE-POINTED 2026-10-07 (audit-hardening, owner decision 1): entry 9 is the
  // disk's identity sector, so the first index past the end is 10.
  // RE-POINTED S5-1 (owner decision Q10): regions 2-4 are on the disk, so no
  // entry the build makes is empty; entries 3 and 5 are emptied in memory (a
  // count of 0, the build's "not on this disk") to keep the path exercised.
  for (const index of [3, 5, 10, 0xff]) {
    const stub = new PokeyStub({ respond: atrDevice() });
    const result = runReadRun(stub, index, { emptyEntry: index <= 9 ? index : null });
    assert.equal(result.failed, true, `entry ${index}`);
    assert.equal(result.status, status.BAD_IMAGE, `entry ${index}`);
    assert.equal(stub.commandFrames.length, 0, `entry ${index} reached the wire`);
  }
});

test("START GAME after an overlay restores slot A and the vector table before the level", () => {
  const stub = new PokeyStub({ respond: atrDevice() });
  const result = runStartGame(stub, { overlaid: true });
  assert.equal(result.end, "start_gameplay");
  // RE-POINTED 2026-10-03 (M5a-S2, §4.8.1 read order): the summary module and
  // the region's art come first now; the restore run is still read whole, in
  // order, and before any sector of the level.
  const sectors = stub.commandFrames.map((frame) => frame[2] | (frame[3] << 8));
  assert.equal(sectors.length,
    slotA.bytes / SECTOR_BYTES + LEVEL_ONE_SECTORS + summarySectorCount);
  const restoreAt = sectors.indexOf(512);
  assert.deepEqual(sectors.slice(restoreAt, restoreAt + 16),
    Array.from({ length: 16 }, (_, i) => 512 + i), "the restore run must be read in order");
  assert.ok(sectors.findIndex((sector) => sector >= 320 && sector < 512) > restoreAt + 15,
    "the restore run must land before the level");
  assert.ok(Buffer.from(result.memory.subarray(slotA.address, slotA.endExclusive))
    .equals(residentSlotA), "slot A is not byte-identical to the shipped image");
  assert.ok(Buffer.from(result.memory.subarray(capitalVectors.address,
    capitalVectors.address + capitalVectors.bytes)).equals(residentVectorTable),
  "the window's capital vector table was not put back");
  assert.equal(result.memory[labels.get("sr_slot_a_overlaid")], 0, "the flag was not cleared");
});

test("START GAME without an overlay sends no restore frame", () => {
  const stub = new PokeyStub({ respond: atrDevice() });
  const result = runStartGame(stub, { overlaid: false });
  assert.equal(result.end, "start_gameplay");
  assert.deepEqual(overlaySectors(stub), []);
  assert.equal(stub.commandFrames.length, LEVEL_ONE_SECTORS + summarySectorCount);
});

test("a failed restore read reports through the status path and never starts gameplay", () => {
  // The drive answers ERROR on the run's fifth sector: four sectors of the
  // slot are new, the rest is still the overlay's. Gameplay must not run it.
  const stub = new PokeyStub({ respond: atrDevice({
    fail: { sector: 516, response: [{ byte: 0x41 }, { byte: 0x45 }] },
  }) });
  const result = runStartGame(stub, { overlaid: true });
  assert.equal(result.end, "failure_screen");
  assert.equal(result.status, status.DEVICE_ERROR);
  assert.deepEqual(overlaySectors(stub), [512, 513, 514, 515, 516],
    "no retry after $45 and no level read after a failed restore");
  assert.ok(stub.commandFrames.every((frame) => {
    const sector = frame[2] | (frame[3] << 8);
    return sector < 320 || sector >= 512;
  }), "a level sector was read after the failed restore");
  assert.equal(result.memory[labels.get("sr_slot_a_overlaid")], 1,
    "the flag must stay set so the next START GAME reads the run again");
  assert.ok(result.memory.subarray(capitalVectors.address,
    capitalVectors.address + capitalVectors.bytes).every((byte) => byte === 0),
  "the table must not point into a partial slot");
});
