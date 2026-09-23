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

import { Nmos6502, nmos6502Flags } from "../scripts/nmos6502.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const labels = new Map();
for (const line of fs.readFileSync(path.join(root, "build/sector-reader.lbl"), "utf8")
  .split(/\r?\n/)) {
  const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
  if (match && !labels.has(match[2])) labels.set(match[2], Number.parseInt(match[1], 16));
}
const readerImage = fs.readFileSync(path.join(root, "build/sector-reader.bin"));

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

  const [first, second] = stub.commandFrames;
  assert.deepEqual(first.slice(0, 4), [0x31, 0x52, 320 & 0xff, 320 >> 8]);
  assert.equal(first[4], carryWrapChecksum(first.slice(0, 4)));
  assert.deepEqual(second.slice(0, 4), [0x31, 0x52, 321 & 0xff, 321 >> 8],
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
  // main.s reaches the reader through these three addresses alone, so their
  // order is an ABI. Each is a JMP ($4C) to a routine inside the reader.
  const vectors = ["sector_reader_start_gameplay", "sector_reader_load",
    "sector_reader_drain_ready"];
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
  assert.match(source, /^SECTOR_READER_DRAIN = \$A006/m);
  // Operand-only: `jmp start_gameplay` and `jmp SECTOR_READER_ENTRY` are both
  // three bytes, which is why the hook needs no room in MAIN.
  assert.match(source, /jmp SECTOR_READER_ENTRY/);
  // The review-harness variants keep the direct jump (plan §4).
  const directJumps = source.split(/\r?\n/)
    .filter((line) => /^\s+jmp start_gameplay\s*(;.*)?$/.test(line));
  assert.equal(directJumps.length, 2,
    "only the two review-harness sites may still jump straight into gameplay");
});

test("the AI text pool is eight lines of 38 characters", () => {
  // Owner decision O's v1 shape. Sixteen lines do not fit alongside the
  // driver and the failure screen; see plan §1.5 [C4].
  const source = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  assert.match(source, /^AI_LINE_BYTES {2}= 38$/m);
  assert.match(source, /^AI_LINE_COUNT {2}= 8$/m);
  const pool = source.slice(source.indexOf("ai_line_pool:"), source.indexOf("ai_line_pool_end:"));
  const lines = [...pool.matchAll(/\.byte "([^"]*)"/g)].map((match) => match[1]);
  assert.equal(lines.length, 8);
  for (const line of lines) {
    assert.equal(line.length, 38, `"${line}" is not 38 characters`);
    assert.match(line, /^[A-Z0-9 \-./:?]*$/,
      "the frontend charset has no glyph for this line");
  }
});

test("the failure screen names every status and offers a way out", () => {
  const source = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  // One ten-character reason per status code 1..4, in status order.
  const reasons = source.slice(source.indexOf("failure_reasons:"),
    source.indexOf("ai_line_pool:"));
  const words = [...reasons.matchAll(/\.byte "([^"]*)"/g)].map((match) => match[1]);
  assert.deepEqual(words, ["NO DRIVE  ", "READ ERROR", "BAD DISK  ", "WRONG DISK"]);
  assert.match(source, /"DISK READ FAILED"/);
  assert.match(source, /"PRESS FIRE"/);
  // The way out: wait for a clean press, then hand back to the menu. A reader
  // that exhausts its retries must never leave the player on a frozen screen.
  assert.match(source, /sector_reader_wait_for_fire:[\s\S]*?jsr wait_frame_start[\s\S]*?lda TRIG0/);
  assert.match(source, /jsr sector_reader_wait_for_fire\s+jmp quit_gameplay_to_menu/);
});

test("the level loading screen reads ENGAGING ENEMY SECTOR, centred and in charset", () => {
  // Owner, 2026-09-23: "LOADING SECTOR" becomes "ENGAGING ENEMY SECTOR". The
  // three things that had to be true before the string could change are pinned
  // here rather than eyeballed: it fits the 40-column ANTIC 2 line at the
  // column it is written to, every character has a frontend glyph, and it fits
  // the sector reader's remaining bytes.
  const source = fs.readFileSync(path.join(root, "src/hybrid/sector-reader.s"), "utf8");
  const SCREEN_COLUMNS = 40;
  const STATUS_LINE = 5;

  const records = source.slice(source.indexOf("loader_records:"),
    source.indexOf("failure_records:"));
  assert.match(records, /"ENGAGING ENEMY SECTOR"/,
    "the level loading screen no longer reads ENGAGING ENEMY SECTOR");
  assert.doesNotMatch(records, /"LOADING SECTOR"/, "the old string is still shipped");

  // The row constant the string is written to, and the column it lands on.
  const rowName = /\.byte <(LOADER_\w+_ROW), >\1\s*\n\s*\.byte "ENGAGING ENEMY SECTOR"/
    .exec(records)?.[1];
  assert.ok(rowName, "the string is not written through a named row constant");
  const rowDefinition = new RegExp(`^${rowName}\\s*=\\s*SCREEN \\+ (\\d+) \\* 40 \\+ (\\d+)`, "m")
    .exec(source);
  assert.ok(rowDefinition, `${rowName} has no SCREEN + line * 40 + column definition`);
  const [line, column] = [Number(rowDefinition[1]), Number(rowDefinition[2])];
  assert.equal(line, STATUS_LINE, "the status line moved off row 5");

  const text = "ENGAGING ENEMY SECTOR";
  assert.ok(column + text.length <= SCREEN_COLUMNS,
    `"${text}" at column ${column} runs ${column + text.length - SCREEN_COLUMNS} ` +
    "characters past the 40-column line");
  // Centred: one column either way of exact centre, so it does not read as a
  // string that merely happened to fit.
  assert.ok(Math.abs(column - Math.floor((SCREEN_COLUMNS - text.length) / 2)) <= 1,
    `"${text}" sits at column ${column}, not centred on a ${SCREEN_COLUMNS}-column line`);
  // render_frontend_data maps only these; anything else becomes a question mark.
  assert.match(text, /^[A-Z0-9 \-./:?]*$/,
    "the frontend charset has no glyph for this string");

  // The byte budget: the reader has to still fit its window after the growth.
  const trace = JSON.parse(fs.readFileSync(path.join(root, "docs/runtime-wall-trace.json"), "utf8"));
  assert.ok(trace.boot_smoke.sector_reader.free_bytes >= 0,
    "the longer string pushed the sector reader past its window");
});
