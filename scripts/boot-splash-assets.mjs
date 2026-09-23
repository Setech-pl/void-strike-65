import fs from "node:fs";

// The boot splash's cassette sound is a data table, not code: the segment
// script, the tone constants and the fade are all owner-tunable JSON that this
// generator validates and emits as build/boot-splash.inc. Nothing in src/main.s
// needs to change when the owner retunes the sound by ear.
export const SPLASH_HOLD_FRAMES = 250;
// DATA_LOW is a DATA block one octave down: the same pure tone with the
// divider doubled, so it reads as a different kind of record rather than as a
// glitch (owner preference, 2026-09-23). Its number must stay ABOVE DATA: the
// blob's segment loader admits both with one `cmp #DATA / bcc`, at no cost.
export const SPLASH_SEGMENT_TYPES = new Map([
  ["SILENCE", 0],
  ["LEADER", 1],
  ["DATA", 2],
  ["DATA_LOW", 3],
]);
export const SPLASH_DATA_TYPES = new Set(["DATA", "DATA_LOW"]);
// One octave down is the divider doubled: (N + 1) -> 2 * (N + 1), so N -> 2N+1.
// The blob computes it as `asl a / ora #$01`, which is why it must be this and
// not a second AUDF table.
export const octaveDownAudf = (audf) => (audf << 1) | 1;
// Two sync bytes are 20 bit cells; a DATA segment shorter than that would end
// before the imitated record header had been heard at all.
const MINIMUM_DATA_FRAMES = 17;
const CELL_RANGE = [1, 155];

function assertInteger(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}

function parseByte(value, name) {
  if (typeof value !== "string" || !/^\$[0-9A-Fa-f]{2}$/.test(value)) {
    throw new Error(`${name} must use ca65 byte notation such as $A0`);
  }
  return Number.parseInt(value.slice(1), 16);
}

export function validateBootSplashDefinition(definition) {
  if (definition?.formatVersion !== 1) {
    throw new Error("boot-splash.json must declare formatVersion 1");
  }
  const tone = definition.tone ?? {};
  assertInteger(tone.markAudf, "tone.markAudf", 0, 255);
  assertInteger(tone.spaceAudf, "tone.spaceAudf", 0, 255);
  assertInteger(tone.startVolume, "tone.startVolume", 0, 15);
  assertInteger(tone.endVolume, "tone.endVolume", 0, 15);
  if (tone.endVolume > tone.startVolume) {
    throw new Error("tone.endVolume must not exceed tone.startVolume: the splash fades out");
  }
  const audcBase = parseByte(tone.audcBase, "tone.audcBase");
  if ((audcBase & 0x0f) !== 0) {
    throw new Error("tone.audcBase must leave the volume nibble clear");
  }
  const framing = definition.framing ?? {};
  const syncByte = parseByte(framing.syncByte, "framing.syncByte");
  assertInteger(framing.syncBytes, "framing.syncBytes", 1, 8);
  assertInteger(framing.cellsPerFrame, "framing.cellsPerFrame", 1, 24);
  assertInteger(framing.cellVcountStep, "framing.cellVcountStep", 1, 155);
  const lastCellVcount = (framing.cellsPerFrame - 1) * framing.cellVcountStep;
  if (lastCellVcount < CELL_RANGE[0] - 1 || lastCellVcount > CELL_RANGE[1]) {
    throw new Error(
      `framing: cell ${framing.cellsPerFrame - 1} starts at VCOUNT ${lastCellVcount}, ` +
      "outside the PAL frame",
    );
  }
  assertInteger(definition.fade?.startFrame, "fade.startFrame", 1, SPLASH_HOLD_FRAMES);

  const segments = definition.segments;
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > 32) {
    throw new Error("segments must be a list of 1 to 32 entries");
  }
  let total = 0;
  for (const [index, segment] of segments.entries()) {
    const name = `segments[${index}]`;
    if (!SPLASH_SEGMENT_TYPES.has(segment?.type)) {
      throw new Error(`${name}.type must be one of ${[...SPLASH_SEGMENT_TYPES.keys()].join(", ")}`);
    }
    assertInteger(segment.frames, `${name}.frames`, 1, 255);
    if (SPLASH_DATA_TYPES.has(segment.type) && segment.frames < MINIMUM_DATA_FRAMES) {
      throw new Error(
        `${name}: a DATA segment needs at least ${MINIMUM_DATA_FRAMES} frames ` +
        "so that its two sync bytes are heard",
      );
    }
    total += segment.frames;
  }
  if (total !== SPLASH_HOLD_FRAMES) {
    throw new Error(
      `segment frames sum to ${total}; the ADR-003 hold is ${SPLASH_HOLD_FRAMES} frames`,
    );
  }
  return { tone: { ...tone, audcBase }, framing: { ...framing, syncByte }, segments };
}

export function compileBootSplash(definition) {
  const { tone, framing, segments } = validateBootSplashDefinition(definition);
  // The fade runs from fade.startFrame to the last hold frame inclusive.
  const fadeFrames = SPLASH_HOLD_FRAMES + 1 - definition.fade.startFrame;
  // q16 starts at $FFFF and one step is subtracted per fade frame, clamped at
  // zero, so q = q16 >> 8 is guaranteed to reach 0 on the final hold frame.
  const fadeStep = Math.ceil(0xffff / fadeFrames);
  return {
    ...tone,
    ...framing,
    volumeSpan: tone.startVolume - tone.endVolume,
    fadeStartFrame: definition.fade.startFrame,
    fadeFrames,
    fadeStep,
    holdFrames: SPLASH_HOLD_FRAMES,
    segments: segments.map(({ type, frames }) => ({
      type, frames, typeNumber: SPLASH_SEGMENT_TYPES.get(type),
    })),
  };
}

export function loadBootSplashDefinition(sourcePath) {
  return compileBootSplash(JSON.parse(fs.readFileSync(sourcePath, "utf8")));
}

function byteList(values) {
  return values.map((value) => `$${value.toString(16).padStart(2, "0").toUpperCase()}`).join(", ");
}

export function renderBootSplashCa65Include(compiled) {
  const lines = [
    "; Generated from assets/audio/boot-splash.json by scripts/boot-splash-assets.mjs.",
    "; Do not edit this file by hand.",
    `SPLASH_MARK_AUDF = ${compiled.markAudf}`,
    `SPLASH_SPACE_AUDF = ${compiled.spaceAudf}`,
    `SPLASH_AUDC_BASE = $${compiled.audcBase.toString(16).padStart(2, "0").toUpperCase()}`,
    `SPLASH_START_VOLUME = ${compiled.startVolume}`,
    `SPLASH_END_VOLUME = ${compiled.endVolume}`,
    `SPLASH_VOLUME_SPAN = ${compiled.volumeSpan}`,
    `SPLASH_SYNC_BYTE = $${compiled.syncByte.toString(16).padStart(2, "0").toUpperCase()}`,
    `SPLASH_SYNC_BYTES = ${compiled.syncBytes}`,
    `SPLASH_CELLS_PER_FRAME = ${compiled.cellsPerFrame}`,
    `SPLASH_CELL_VCOUNT_STEP = ${compiled.cellVcountStep}`,
    `SPLASH_FADE_START_FRAME = ${compiled.fadeStartFrame}`,
    `SPLASH_FADE_FRAMES = ${compiled.fadeFrames}`,
    `SPLASH_FADE_STEP = ${compiled.fadeStep}`,
    `SPLASH_SEGMENT_COUNT = ${compiled.segments.length}`,
    "SPLASH_SEGMENT_SILENCE = 0",
    "SPLASH_SEGMENT_LEADER = 1",
    "SPLASH_SEGMENT_DATA = 2",
    "SPLASH_SEGMENT_DATA_LOW = 3",
    "",
    ".macro EMIT_SPLASH_SEGMENT_TYPES",
    `    .byte ${byteList(compiled.segments.map(({ typeNumber }) => typeNumber))}`,
    ".endmacro",
    "",
    ".macro EMIT_SPLASH_SEGMENT_FRAMES",
    `    .byte ${byteList(compiled.segments.map(({ frames }) => frames))}`,
    ".endmacro",
    "",
    `.assert SPLASH_FADE_START_FRAME + SPLASH_FADE_FRAMES = ${compiled.holdFrames + 1}, error, ` +
      '"boot splash fade does not end on the last hold frame"',
    '.assert SPLASH_END_VOLUME > 0, error, "the boot splash fade must not reach silence"',
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export const bootSplashConstants = { holdFrames: SPLASH_HOLD_FRAMES };
