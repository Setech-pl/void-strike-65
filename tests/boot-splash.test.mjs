import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { installRuntimeSegments } from "../scripts/runtime-image.mjs";
import {
  compileBootSplash,
  loadBootSplashDefinition,
  octaveDownAudf,
  validateBootSplashDefinition,
  SPLASH_DATA_TYPES,
} from "../scripts/boot-splash-assets.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);
const splash = loadBootSplashDefinition(path.join(root, "assets", "audio", "boot-splash.json"));

const AUDF1 = 0xd200;
const AUDC1 = 0xd201;
const KBCODE = 0xd209;
const RANDOM = 0xd20a;
const SKSTAT = 0xd20f;
const TRIG0 = 0xd010;
const COLPF1 = 0xd017;
const COLPF2 = 0xd018;
const COLBK = 0xd01a;
const WSYNC = 0xd40a;
const VCOUNT = 0xd40b;
const DMACTL = 0xd400;
const NMIEN = 0xd40e;
const SPACE_KEY = 0x21;

// PAL: 312 scanlines of 114 cycles; VCOUNT counts scanline pairs.
const CYCLES_PER_LINE = 114;
const LINES_PER_FRAME = 312;
const CYCLES_PER_FRAME = CYCLES_PER_LINE * LINES_PER_FRAME;
// The two display-list DLIs, expressed as the scanline on which ANTIC takes the
// interrupt: the title/ship boundary at bitmap line 40 and the ship/studio
// boundary at bitmap line 157, with the display starting on scanline 32.
const DLI_LINES = [32 + 40, 32 + 157];
const RETURN_SENTINEL = 0xfff0;

// Runs the hold from splash_hold with the blob installed at $0500, a VCOUNT
// derived from the cycle counter, both DLIs fired per frame, and every POKEY
// and playfield write logged with the frame and VCOUNT it happened on.
function runHold({ firePressed = () => false, spacePressed = () => false, frameLimit = 320 } = {}) {
  const memory = new Uint8Array(0x10000);
  installRuntimeSegments(memory, root);
  const writes = [];
  let randomState = 0x2f;
  let exited = false;
  let inDli = 0;
  // show_loader has already armed the DLI and playfield DMA by the time it
  // jumps into the hold; the hook refuses hardware stores, so the gate below
  // follows this shadow instead of memory.
  let nmienShadow = 0x80;
  // Inputs are scripted against wall frames, so a scripted release still
  // happens after the hold's own counter has stopped moving.
  let wallFrame = 1;

  const cpu = new Nmos6502(memory, {
    read(address, self) {
      switch (address) {
        case VCOUNT: return (Math.floor((self.cycles % CYCLES_PER_FRAME) / CYCLES_PER_LINE)) >> 1;
        case TRIG0: return firePressed(wallFrame) ? 0x00 : 0x01;
        // SKSTAT bit 2 is low while any key is down; KBCODE holds that key.
        case SKSTAT: return spacePressed(wallFrame) ? 0xfb : 0xff;
        case KBCODE: return spacePressed(wallFrame) ? SPACE_KEY : 0x3f;
        case RANDOM: {
          randomState = ((randomState * 181) + 83) & 0xff;
          return randomState;
        }
        default: return undefined;
      }
    },
    write(address, value, self) {
      if (address === WSYNC) {
        // Stall to the start of the next scanline, as the hardware does.
        self.cycles += CYCLES_PER_LINE - (self.cycles % CYCLES_PER_LINE);
        return false;
      }
      if (address === NMIEN) nmienShadow = value;
      if (address === AUDF1 || address === AUDC1 || address === COLPF1 ||
        address === COLPF2 || address === COLBK || address === NMIEN || address === DMACTL) {
        writes.push({
          address,
          value,
          frame: frameNumber(),
          vcount: (Math.floor((self.cycles % CYCLES_PER_FRAME) / CYCLES_PER_LINE)) >> 1,
          dli: inDli > 0,
          exit: exited,
        });
      }
      return address >= 0xd000 && address <= 0xd4ff ? false : undefined;
    },
  });

  const loaderFrameCount = labels.get("loader_frame_count");
  const frameNumber = () => {
    const remaining = memory[loaderFrameCount];
    return remaining === 0 ? splash.holdFrames : splash.holdFrames + 1 - remaining;
  };

  memory[loaderFrameCount] = splash.holdFrames;
  memory[labels.get("loader_dli_phase")] = 0;
  cpu.pc = labels.get("splash_hold");
  cpu.sp = 0xfd;
  // A sentinel return address, so the exit path's rts is observable.
  cpu.memory[0x01fd] = (RETURN_SENTINEL - 1) >> 8;
  cpu.memory[0x01fc] = (RETURN_SENTINEL - 1) & 0xff;
  cpu.sp = 0xfb;

  const splashExit = labels.get("splash_exit");
  const loaderDli = labels.get("loader_dli");
  let nextDli = 0;
  let frameOfCycle = 0;
  const cycleLimit = frameLimit * CYCLES_PER_FRAME;
  let exitFrame = null;

  while (cpu.pc !== RETURN_SENTINEL && cpu.cycles < cycleLimit) {
    const frameIndex = Math.floor(cpu.cycles / CYCLES_PER_FRAME);
    if (frameIndex !== frameOfCycle) {
      frameOfCycle = frameIndex;
      wallFrame = frameIndex + 1;
      nextDli = 0;
    }
    const line = Math.floor((cpu.cycles % CYCLES_PER_FRAME) / CYCLES_PER_LINE);
    if (inDli === 0 && nextDli < DLI_LINES.length && line >= DLI_LINES[nextDli] &&
      nmienShadow !== 0) {
      nextDli += 1;
      // NMI entry: the DLI is entered exactly as the hardware enters it.
      cpu.memory[0x0100 + cpu.sp] = (cpu.pc >> 8) & 0xff;
      cpu.sp = (cpu.sp - 1) & 0xff;
      cpu.memory[0x0100 + cpu.sp] = cpu.pc & 0xff;
      cpu.sp = (cpu.sp - 1) & 0xff;
      cpu.memory[0x0100 + cpu.sp] = cpu.p;
      cpu.sp = (cpu.sp - 1) & 0xff;
      cpu.pc = loaderDli;
      inDli = cpu.sp;
      cpu.cycles += 7;
      continue;
    }
    if (inDli !== 0 && cpu.sp > inDli) inDli = 0;
    if (!exited && cpu.pc >= splashExit && cpu.pc < labels.get("splash_emit_cell")) {
      exited = true;
      exitFrame = frameNumber();
    }
    cpu.step();
  }
  assert.equal(cpu.pc, RETURN_SENTINEL, "the hold never returned to its caller");
  return { writes, memory, exitFrame, cycles: cpu.cycles };
}

// NMIEN is written through the hook, which refuses the store, so the DLI gate
// above reads the shadow this helper keeps instead.
const holdCache = new Map();
function hold(key, options) {
  if (!holdCache.has(key)) holdCache.set(key, runHold(options));
  return holdCache.get(key);
}

function segmentTypeByFrame() {
  const byFrame = new Map();
  let frame = 1;
  for (const segment of splash.segments) {
    for (let index = 0; index < segment.frames; index += 1, frame += 1) {
      byFrame.set(frame, segment.type);
    }
  }
  return byFrame;
}

const SEGMENT_TYPE = segmentTypeByFrame();
const toneFrame = (frame) => SEGMENT_TYPE.get(frame) !== "SILENCE";
// DATA_LOW is the same pure tone an octave down, so its two divisors are the
// doubled dividers and nothing else. Re-pinned 2026-09-23: the DATA filters
// below used to name the literal "DATA" and would have quietly stopped
// covering the second record the moment it changed type.
const divisorsFor = (type) => (type === "DATA_LOW"
  ? [octaveDownAudf(splash.markAudf), octaveDownAudf(splash.spaceAudf)]
  : [splash.markAudf, splash.spaceAudf]);

test("the tone switches per bit, not per frame, at full volume through frame 175", () => {
  const { writes } = hold("plain", {});
  const audc = writes.filter((entry) => entry.address === AUDC1 && !entry.exit);
  assert.ok(audc.length > 0, "no POKEY writes were made");
  for (const entry of audc) {
    if (entry.frame > splash.fadeStartFrame - 1) continue;
    const expected = toneFrame(entry.frame)
      ? (splash.audcBase | splash.startVolume) : splash.audcBase;
    assert.equal(entry.value, expected,
      `AUDC1 $${entry.value.toString(16)} on frame ${entry.frame}`);
  }
  // Every cell of a DATA frame emits its own AUDF1, and a framed byte contains
  // both mark and space bits, so both divisors must appear inside one frame.
  const dataFrames = [...SEGMENT_TYPE.entries()]
    .filter(([frame, type]) => SPLASH_DATA_TYPES.has(type) && frame < splash.fadeStartFrame)
    .map(([frame]) => frame);
  assert.ok(dataFrames.length > 0);
  let framesWithBoth = 0;
  for (const frame of dataFrames) {
    const divisors = new Set(writes
      .filter((entry) => entry.address === AUDF1 && entry.frame === frame)
      .map((entry) => entry.value));
    assert.equal(writes.filter((entry) => entry.address === AUDF1 && entry.frame === frame).length,
      splash.cellsPerFrame, `frame ${frame} did not emit ${splash.cellsPerFrame} cells`);
    const allowed = divisorsFor(SEGMENT_TYPE.get(frame));
    for (const divisor of divisors) {
      assert.ok(allowed.includes(divisor),
        `unexpected AUDF1 $${divisor.toString(16)} on frame ${frame} ` +
        `(${SEGMENT_TYPE.get(frame)} may emit ${allowed.join(" or ")})`);
    }
    if (divisors.size === 2) framesWithBoth += 1;
  }
  assert.ok(framesWithBoth > dataFrames.length * 0.8,
    `only ${framesWithBoth} of ${dataFrames.length} DATA frames switched within the frame`);
  // The cells are spread across the frame by VCOUNT, not bunched at its top.
  const spread = writes.filter((entry) => entry.address === AUDF1 && entry.frame === dataFrames[0]);
  assert.ok(spread.at(-1).vcount - spread[0].vcount >
    (splash.cellsPerFrame - 2) * splash.cellVcountStep,
  "the bit cells are not spread across the frame by VCOUNT");
});

test("sound and every splash colour fade without ever brightening, and land on frame 250", () => {
  const { writes } = hold("plain", {});
  const volumes = writes
    .filter((entry) => entry.address === AUDC1 && !entry.exit && toneFrame(entry.frame))
    .map((entry) => ({ frame: entry.frame, volume: entry.value & 0x0f }));
  for (let index = 1; index < volumes.length; index += 1) {
    assert.ok(volumes[index].volume <= volumes[index - 1].volume,
      `volume rose to ${volumes[index].volume} on frame ${volumes[index].frame}`);
  }
  const finalVolumes = volumes.filter(({ frame }) => frame === splash.holdFrames);
  assert.ok(finalVolumes.length > 0, "the last hold frame emitted no tone");
  for (const { volume } of finalVolumes) assert.equal(volume, splash.endVolume);
  // The deck is still clocking bits while it fades out.
  const finalDivisors = new Set(writes
    .filter((entry) => entry.address === AUDF1 && entry.frame === splash.holdFrames)
    .map((entry) => entry.value));
  assert.equal(finalDivisors.size, 2, "the tone stopped switching before the hold ended");

  for (const register of [COLPF1, COLPF2]) {
    for (const fromDli of [false, true]) {
      const series = writes.filter((entry) => entry.address === register &&
        entry.dli === fromDli && !entry.exit);
      assert.ok(series.length > 0, `no ${fromDli ? "DLI" : "main-loop"} writes to ${register}`);
      // Each zone keeps its hue and never brightens.
      const byHue = new Map();
      for (const entry of series) {
        const hue = entry.value & 0xf0;
        const previous = byHue.get(hue);
        if (previous !== undefined) {
          assert.ok((entry.value & 0x0f) <= previous,
            `luminance rose to ${entry.value & 0x0f} on frame ${entry.frame}`);
        }
        byHue.set(hue, entry.value & 0x0f);
      }
      for (const entry of series.filter(({ frame }) => frame === splash.holdFrames)) {
        assert.equal(entry.value & 0x0f, 0,
          `frame 250 still shows luminance ${entry.value & 0x0f}`);
      }
    }
  }
  for (const entry of writes.filter((write) => write.address === COLBK)) {
    assert.equal(entry.value, 0, "COLBK is not black during the splash");
  }
});

test("the deck is cut before the display is blanked, on both exits", () => {
  for (const [key, options] of [
    ["plain", {}],
    ["fire", { firePressed: (frame) => frame >= 60 && frame < 66 }],
  ]) {
    const { writes } = hold(key, options);
    const exit = writes.filter((entry) => entry.exit);
    const audc = exit.findIndex((entry) => entry.address === AUDC1);
    const nmien = exit.findIndex((entry) => entry.address === NMIEN);
    const dmactl = exit.findIndex((entry) => entry.address === DMACTL);
    assert.ok(audc >= 0 && nmien > audc && dmactl > audc,
      `${key}: AUDC1 is not cleared before NMIEN/DMACTL`);
    assert.equal(exit[audc].value, 0, `${key}: the exit left AUDC1 non-zero`);
    assert.equal(exit[nmien].value, 0);
    assert.equal(exit[dmactl].value, 0);
    assert.equal(writes.at(-1).exit, true, `${key}: something wrote after the teardown`);
  }
});

test("SPACE or FIRE ends the hold, and a button held from frame 1 does not", () => {
  for (const [key, options] of [
    ["fire", { firePressed: (frame) => frame >= 60 && frame < 66 }],
    ["space", { spacePressed: (frame) => frame >= 60 && frame < 66 }],
  ]) {
    const { exitFrame, writes } = hold(key, options);
    assert.ok(exitFrame >= 60 && exitFrame <= 61,
      `${key}: the hold ended on frame ${exitFrame}, not within 1-2 frames of the press`);
    assert.equal(writes.filter((entry) => entry.exit && entry.address === AUDC1)[0].value, 0);
  }
  // Edge, not level: an input that is never released never arms.
  const held = hold("held-fire", { firePressed: () => true });
  assert.equal(held.exitFrame, splash.holdFrames,
    "a FIRE held from frame 1 skipped the hold");
  const heldSpace = hold("held-space", { spacePressed: () => true });
  assert.equal(heldSpace.exitFrame, splash.holdFrames,
    "a SPACE held from frame 1 skipped the hold");
});

test("a skip cannot leak into the menu as a START GAME press", () => {
  // 1. The exit waits for both inputs to be released before it returns.
  const blob = fs.readFileSync(path.join(root, "src", "boot-splash.s"), "utf8");
  const exitBody = blob.slice(blob.indexOf("splash_exit:"), blob.indexOf("splash_emit_cell:"));
  assert.match(exitBody, /lda TRIG0[\s\S]*?and #\$01[\s\S]*?beq @release/);
  assert.match(exitBody, /lda SKSTAT[\s\S]*?and #\$04[\s\S]*?beq @release/);
  // 2. The frontend arms only on a frame with the stick centred and FIRE up, and
  //    enter_frontend_state clears that latch, so a still-held press is ignored.
  const enter = source.slice(source.indexOf("enter_frontend_state:"));
  assert.match(enter.slice(0, 400), /sta frontend_input_armed/);
  const poll = source.slice(source.indexOf("frontend_input_poll:"));
  assert.match(poll.slice(0, 900), /frontend_input_armed/);
  // 3. The frontend reads STICK0 and TRIG0 only, so SPACE cannot reach the menu
  //    even as a latched key code; the sector reader's SKSTAT use is serial-bit
  //    polling with gameplay torn down, not input.
  for (const routine of ["frontend_input_poll:", "handle_main_menu_input:"]) {
    const body = source.slice(source.indexOf(routine));
    const end = body.slice(4).search(/^\w[\w_]*:/m);
    assert.equal(/\b(KBCODE|CH)\b/.test(body.slice(0, end)), false,
      `${routine} reads the keyboard`);
  }
});

test("the splash ship zone is allied blue for the whole bright part of the hold", () => {
  const { writes } = hold("plain", {});
  // The first DLI of each frame publishes the ship zone.
  const byFrame = new Map();
  for (const entry of writes.filter((write) => write.dli && !write.exit)) {
    if (!byFrame.has(entry.frame)) byFrame.set(entry.frame, []);
    byFrame.get(entry.frame).push(entry);
  }
  let checked = 0;
  for (let frame = 1; frame < splash.fadeStartFrame; frame += 1) {
    const entries = byFrame.get(frame);
    assert.ok(entries && entries.length >= 4, `frame ${frame} did not take two DLIs`);
    assert.equal(entries[0].address, COLPF1);
    assert.equal(entries[0].value, 0x8a, `ship COLPF1 on frame ${frame}`);
    assert.equal(entries[1].address, COLPF2);
    assert.equal(entries[1].value, 0x80, `ship COLPF2 on frame ${frame}`);
    checked += 1;
  }
  assert.equal(checked, splash.fadeStartFrame - 1);
});

test("the segment script is data the generator validates, and it fills the hold", () => {
  assert.equal(splash.segments.reduce((sum, { frames }) => sum + frames, 0), splash.holdFrames);
  assert.equal(splash.fadeStartFrame + splash.fadeFrames, splash.holdFrames + 1);
  assert.ok(splash.endVolume > 0 && splash.endVolume < splash.startVolume);
  const base = JSON.parse(fs.readFileSync(
    path.join(root, "assets", "audio", "boot-splash.json"), "utf8"));
  assert.throws(() => compileBootSplash({
    ...base, segments: [...base.segments, { type: "LEADER", frames: 1 }],
  }), /segment frames sum to 251/);
  assert.throws(() => validateBootSplashDefinition({
    ...base, segments: [{ type: "DATA", frames: 5 }, { type: "SILENCE", frames: 245 }],
  }), /at least 17 frames/);
  assert.throws(() => compileBootSplash({ ...base, fade: { startFrame: 0 } }),
    /fade.startFrame/);
});

// ---------------------------------------------------------------------------
// The three imitated records must not sound identical (owner, 2026-09-23). The
// leader tone and records one and three are unchanged; the middle record is the
// same pure tone an octave down. The owner's stated reason for preferring the
// octave over a second waveform is that it reads as a different KIND of block
// rather than as a glitch, so what this pins is the exact doubling of the
// divider, not merely "something differs".

test("the second data record is one octave below the first and the third", () => {
  const dataSegments = splash.segments.filter(({ type }) => SPLASH_DATA_TYPES.has(type));
  assert.equal(dataSegments.length, 3, "the splash still imitates three data records");
  assert.deepEqual(dataSegments.map(({ type }) => type), ["DATA", "DATA_LOW", "DATA"],
    "only the MIDDLE record differs; blocks one and three are unchanged");
  // An octave down is the divider doubled, exactly: (N + 1) -> 2 * (N + 1).
  for (const audf of [splash.markAudf, splash.spaceAudf]) {
    assert.equal(octaveDownAudf(audf) + 1, 2 * (audf + 1),
      `AUDF ${audf} does not halve in frequency under the blob's asl/ora`);
  }
  // The waveform is untouched: one octave down, not a different distortion.
  // (The poly-4 "(N + 1) not divisible by 3 or 5" rule governs BUZZ dividers;
  // this channel is AUDC $A0, a pure tone, so that rule does not bind here.)
  assert.equal(splash.audcBase, 0xa0, "the splash channel is still a pure tone");

  const { writes } = hold("plain", {});
  const byType = new Map();
  for (const entry of writes) {
    if (entry.address !== AUDF1 || entry.exit) continue;
    const type = SEGMENT_TYPE.get(entry.frame);
    if (!byType.has(type)) byType.set(type, new Set());
    byType.get(type).add(entry.value);
  }
  const low = [...(byType.get("DATA_LOW") ?? [])].sort((a, b) => a - b);
  const high = [...(byType.get("DATA") ?? [])].sort((a, b) => a - b);
  const leader = [...(byType.get("LEADER") ?? [])];
  assert.deepEqual(high, [splash.markAudf, splash.spaceAudf].sort((a, b) => a - b),
    "records one and three no longer emit the unchanged divisors");
  assert.deepEqual(low,
    [octaveDownAudf(splash.markAudf), octaveDownAudf(splash.spaceAudf)].sort((a, b) => a - b),
    "the second record is not an octave below the other two");
  assert.deepEqual(leader, [splash.markAudf], "the leader tone is not unchanged");
  // Both records are really heard: the octave block is not silently skipped.
  assert.ok(low.length === 2 && high.length === 2,
    "a record stopped switching between mark and space");
});

test("the segment table admits DATA_LOW everywhere it admits DATA", () => {
  // The blob separates the two with one `cmp #SPLASH_SEGMENT_DATA / bcc`, so
  // DATA_LOW MUST number above DATA or the sync bytes and bit index are never
  // initialised for it and the record clocks out garbage.
  const source = fs.readFileSync(path.join(root, "src", "boot-splash.s"), "utf8");
  const loader = source.slice(source.indexOf("splash_segment_load:"));
  assert.ok(/cmp #SPLASH_SEGMENT_DATA\s*\n\s*bcc @done/.test(loader),
    "splash_segment_load no longer admits both DATA types with one `cmp / bcc`");
  const compiled = compileBootSplash({
    ...JSON.parse(fs.readFileSync(path.join(root, "assets", "audio", "boot-splash.json"), "utf8")),
  });
  const numbers = new Map(compiled.segments.map(({ type, typeNumber }) => [type, typeNumber]));
  assert.ok(numbers.get("DATA_LOW") > numbers.get("DATA"),
    "DATA_LOW must number above DATA for the `bcc` to admit it");
  // A DATA_LOW record is still long enough for its two sync bytes to be heard.
  assert.throws(() => compileBootSplash({
    ...JSON.parse(fs.readFileSync(path.join(root, "assets", "audio", "boot-splash.json"), "utf8")),
    segments: [{ type: "DATA_LOW", frames: 5 }, { type: "SILENCE", frames: 245 }],
  }), /at least 17 frames/);
});
