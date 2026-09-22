// Format-2 music: validation, compilation to the 6502 runtime form, the ca65
// include, and a JS model of the player that reads the compiled bytes.
//
// The JSON in assets/music is the owner's format and stays exactly as the
// composition tool writes it (plan-music-v2.md §1.1). This module turns it
// into the bytes the player indexes, and nothing here may change what the
// music sounds like: scripts/music-oracle.mjs holds the renderer's rules
// independently, and tests/music-v2-stream.test.mjs asserts that the model
// below reproduces the oracle's stream frame for frame.
//
// Session scope: the menu theme. The v1 gameplay theme keeps
// scripts/gameplay-music.mjs until plan §10 step 2b compiles it here too.

import fs from "node:fs";

const CHANNEL_COUNT = 4;
const TOKEN_HOLD = 0x00;
const TOKEN_REST = 0x01;
const TOKEN_PITCH_BIAS = 2;
const MAX_INSTRUMENTS_PER_CHANNEL = 4;
const MACRO_PAGE_LIMIT = 255;
const MACRO_LAST_ENTRY = 0x80;
const VOICE_OFF = 0x01;

const DISTORTION_BASE = Object.freeze({ pure: 0xa0, buzz: 0xc0, noise: 0x80 });
const SEMITONES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function byte(value) {
  return `$${value.toString(16).padStart(2, "0").toUpperCase()}`;
}

function integer(value, name, minimum, maximum) {
  invariant(Number.isInteger(value) && value >= minimum && value <= maximum,
    `${name} must be an integer from ${minimum} through ${maximum}`);
  return value;
}

function midi(id) {
  const match = /^([A-G]#?)(-?\d+)$/.exec(id);
  if (!match) return null;
  return (Number.parseInt(match[2], 10) + 1) * 12 + SEMITONES.indexOf(match[1]);
}

export function loadMusicDefinition(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
}

// The poly-4 rule (plan §5). Distortion $C runs the 4-bit polynomial, whose
// period is 15 clocks, so a divider whose (N+1) is a multiple of 3 or 5
// aliases into a lower-order pattern and stops sounding like a pitch. Every
// buzz divider in the pitch table and in every drum macro has to pass, so a
// later retune cannot silently turn the bass into noise.
export function buzzDividerIsTonal(divider) {
  const period = divider + 1;
  return period % 3 !== 0 && period % 5 !== 0;
}

function validatePitches(pitches) {
  invariant(Array.isArray(pitches) && pitches.length > 0 && pitches.length <= 62,
    "a format-2 theme needs one through 62 pitches (six token bits, minus HOLD and REST)");
  const seen = new Set();
  let pureRun = [];
  pitches.forEach((pitch, index) => {
    invariant(typeof pitch?.id === "string" && pitch.id.length > 0, `pitches[${index}] needs an id`);
    invariant(!seen.has(pitch.id), `duplicate pitch id ${pitch.id}`);
    seen.add(pitch.id);
    invariant(pitch.kind === "pure" || pitch.kind === "buzz" || pitch.kind === "noise",
      `pitches[${index}].kind must be pure, buzz or noise`);
    integer(pitch.divider, `pitches[${index}].divider`, 0, 255);
    if (pitch.kind === "buzz") {
      invariant(buzzDividerIsTonal(pitch.divider),
        `pitch ${pitch.id} has buzz divider ${pitch.divider}: (N+1) is divisible by 3 or 5, ` +
        "so distortion $C aliases into noise (plan-music-v2.md §5)");
    }
    if (pitch.kind === "pure") pureRun.push(pitch);
  });
  // The pure block must be chromatic and contiguous: an arpeggio offset of k
  // semitones is then simply "table index + k", which is what the player does.
  invariant(pureRun.length > 0, "a format-2 theme needs a pure-tone block");
  const notes = pureRun.map(({ id }) => midi(id));
  notes.forEach((note, index) => {
    invariant(note !== null, `pure pitch ${pureRun[index].id} is not a note name`);
    invariant(index === 0 || note === notes[index - 1] + 1,
      `the pure pitch block must be chromatic and contiguous: ${pureRun[index].id} does not ` +
      `follow ${pureRun[index - 1]?.id}`);
  });
  invariant(pitches.slice(0, pureRun.length).every(({ kind }) => kind === "pure"),
    "the pure pitch block must come first, so arpeggio offsets never cross into the buzz block");
  return pureRun.length;
}

function encodeEnvelope(volumes, name) {
  invariant(Array.isArray(volumes) && volumes.length > 0 && volumes.length <= 64,
    `instrument ${name} needs a volume envelope of one through 64 entries`);
  volumes.forEach((volume, index) => {
    integer(volume, `instrument ${name} volume[${index}]`, 0, 15);
    // Silence is terminal by construction: the player stops advancing the
    // envelope at the held last entry and skips the arpeggio step while a
    // voice is silent, which is only equivalent to the renderer's
    // "age keeps counting" if a zero can never be followed by a note.
    invariant(volume !== 0 || index === volumes.length - 1,
      `instrument ${name} has a zero volume at entry ${index}: a zero may only be the last ` +
      "entry, where it holds as silence until the next token");
  });
  return volumes.map((volume, index) =>
    (index === volumes.length - 1 ? volume | MACRO_LAST_ENTRY : volume));
}

function encodeArp(offsets, name) {
  invariant(Array.isArray(offsets) && offsets.length > 0 && offsets.length <= 64,
    `instrument ${name} arp must have one through 64 entries`);
  offsets.forEach((offset, index) =>
    integer(offset, `instrument ${name} arp[${index}]`, 0, 0x7f));
  return offsets.map((offset, index) =>
    (index === offsets.length - 1 ? offset | MACRO_LAST_ENTRY : offset));
}

function encodeDrum(macro, name) {
  invariant(Array.isArray(macro) && macro.length > 0, `drum ${name} needs at least one frame`);
  const bytes = [];
  macro.forEach((frame, index) => {
    invariant(Array.isArray(frame) && frame.length === 3,
      `drum ${name}[${index}] must be [distortion, divider, volume]`);
    const [distortion, divider, volume] = frame;
    invariant(DISTORTION_BASE[distortion] !== undefined,
      `drum ${name}[${index}] has unknown distortion ${distortion}`);
    integer(divider, `drum ${name}[${index}] divider`, 0, 255);
    // Volume 0 would encode as $A0/$C0/$80, which the player cannot tell from
    // a real frame; the renderer treats it as silence. Forbid it instead of
    // inventing an encoding for a frame no drum in the score uses.
    integer(volume, `drum ${name}[${index}] volume`, 1, 15);
    if (distortion === "buzz") {
      invariant(buzzDividerIsTonal(divider),
        `drum ${name}[${index}] has buzz divider ${divider}: (N+1) is divisible by 3 or 5 ` +
        "(plan-music-v2.md §5)");
    }
    bytes.push(DISTORTION_BASE[distortion] | volume, divider);
  });
  bytes.push(0x00); // the terminator; a real pair's AUDC byte is never $00
  return bytes;
}

export function compileMusic(definition) {
  invariant(definition?.formatVersion === 2, "Unsupported music formatVersion (expected 2)");
  invariant(definition.originalComposition === true,
    "the theme must be identified as an original composition");
  invariant(definition.targetFrameHz === 50, "music must target PAL 50 Hz");
  invariant(definition.audctl === 0,
    "music must leave AUDCTL at 0: channels 3 and 4 are SFX-owned and the clock is shared");
  const framesPerRow = integer(definition.framesPerRow, "framesPerRow", 1, 255);
  const rowsPerPattern = integer(definition.rowsPerPattern, "rowsPerPattern", 1, 255);
  invariant(Array.isArray(definition.channels) && definition.channels.length === CHANNEL_COUNT,
    "the menu theme must document all four POKEY channels");

  const pureCount = validatePitches(definition.pitches);
  const pitchIndex = new Map(definition.pitches.map(({ id }, index) => [id, index]));
  const pitchBytes = definition.pitches.map(({ divider }) => divider);

  // ---- the macro page: envelopes, arps and drum macros, each stored once ----
  const macroPage = [];
  const macroOffsets = new Map();
  function intern(bytes) {
    const key = bytes.join(",");
    if (!macroOffsets.has(key)) {
      macroOffsets.set(key, macroPage.length);
      macroPage.push(...bytes);
    }
    return macroOffsets.get(key);
  }

  const drums = definition.drums ?? {};
  const instruments = definition.instruments ?? {};
  const record = new Map();
  for (const [name, instrument] of Object.entries(instruments)) {
    invariant(DISTORTION_BASE[instrument?.distortion] !== undefined,
      `instrument ${name} has unknown distortion ${instrument?.distortion}`);
    record.set(name, {
      audc: DISTORTION_BASE[instrument.distortion],
      macro: intern(encodeEnvelope(instrument.volume, name)),
      arp: intern(encodeArp(instrument.arp ?? [0], name)),
      arpLength: (instrument.arp ?? [0]).length,
      maximumArpOffset: Math.max(...(instrument.arp ?? [0])),
    });
  }
  for (const [name, macro] of Object.entries(drums)) {
    invariant(!record.has(name), `${name} is both an instrument and a drum`);
    record.set(name, { audc: 0x00, macro: intern(encodeDrum(macro, name)), arp: 0, arpLength: 1 });
  }
  invariant(macroPage.length <= MACRO_PAGE_LIMIT,
    `the macro page is ${macroPage.length} B; it is addressed by one byte and must fit ` +
    `${MACRO_PAGE_LIMIT} B`);

  // ---- patterns -> per-channel 16-row columns ----
  const bars = definition.sequence;
  invariant(Array.isArray(bars) && bars.length > 0 && bars.length <= 63,
    "the sequence needs one through 63 bars");
  bars.forEach((bar) => invariant(definition.patterns[bar],
    `sequence references unknown pattern ${bar}`));

  const channelInstruments = Array.from({ length: CHANNEL_COUNT }, () => []);
  function selectOf(channel, name) {
    const list = channelInstruments[channel];
    if (!list.includes(name)) {
      invariant(record.has(name), `unknown instrument or drum ${name}`);
      list.push(name);
      invariant(list.length <= MAX_INSTRUMENTS_PER_CHANNEL,
        `channel ${channel + 1} uses ${list.length} instruments; a token carries two select ` +
        `bits, so a channel may use at most ${MAX_INSTRUMENTS_PER_CHANNEL}`);
    }
    return list.indexOf(name);
  }

  function compileToken(token, channel, where) {
    invariant(typeof token === "string", `${where} must be a string token`);
    if (token === "HOLD") return TOKEN_HOLD;
    if (token === "REST") return TOKEN_REST;
    const separator = token.indexOf(":");
    if (separator < 0) {
      invariant(drums[token], `${where} has unknown drum ${token}`);
      // A drum carries no pitch, but the pitch field may not be zero or the
      // whole token byte would read as HOLD when its select is 0.
      return selectOf(channel, token) << 6 | TOKEN_PITCH_BIAS;
    }
    const name = token.slice(0, separator);
    const pitch = token.slice(separator + 1);
    invariant(instruments[name], `${where} has unknown instrument ${name}`);
    invariant(pitchIndex.has(pitch), `${where} has unknown pitch ${pitch}`);
    const base = pitchIndex.get(pitch);
    const reach = base + record.get(name).maximumArpOffset;
    invariant(reach < definition.pitches.length,
      `${where}: ${name}'s arpeggio reaches pitch index ${reach}, past the table`);
    invariant(record.get(name).arpLength === 1 || reach < pureCount,
      `${where}: ${name} is arpeggiated, so ${pitch} plus its widest offset must stay inside ` +
      "the chromatic pure block");
    return selectOf(channel, name) << 6 | (base + TOKEN_PITCH_BIAS);
  }

  const columnBytes = [];
  const columnIds = new Map();
  const sequenceBytes = [];
  bars.forEach((bar) => {
    const rows = definition.patterns[bar];
    invariant(Array.isArray(rows) && rows.length === rowsPerPattern,
      `pattern ${bar} must contain ${rowsPerPattern} rows`);
    for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
      const column = rows.map((row, rowIndex) => {
        invariant(Array.isArray(row) && row.length === CHANNEL_COUNT,
          `pattern ${bar} row ${rowIndex} must contain four channels`);
        return compileToken(row[channel], channel, `patterns.${bar}[${rowIndex}][${channel}]`);
      });
      const key = `${channel}:${column.join(",")}`;
      if (!columnIds.has(key)) {
        columnIds.set(key, columnBytes.length);
        columnBytes.push(Uint8Array.from(column));
      }
      sequenceBytes.push(columnIds.get(key));
    }
  });
  invariant(columnBytes.length <= 256, "a theme may use at most 256 distinct columns");

  const channelBase = [];
  let cursor = 0;
  for (const list of channelInstruments) {
    channelBase.push(cursor);
    cursor += list.length;
  }
  const instrumentOrder = channelInstruments.flat();
  const instrumentAudc = instrumentOrder.map((name) => record.get(name).audc);
  const instrumentMacro = instrumentOrder.map((name) => record.get(name).macro);
  const instrumentArp = instrumentOrder.map((name) => record.get(name).arp);

  const loopRows = rowsPerPattern * bars.length;
  const dataBytes = pitchBytes.length + macroPage.length + instrumentOrder.length * 3 +
    CHANNEL_COUNT + sequenceBytes.length + columnBytes.length * 2 +
    columnBytes.length * rowsPerPattern;

  return Object.freeze({
    ...definition,
    framesPerRow,
    rowsPerPattern,
    pitchBytes: Uint8Array.from(pitchBytes),
    pureCount,
    macroPage: Uint8Array.from(macroPage),
    instrumentOrder: Object.freeze(instrumentOrder),
    instrumentAudc: Uint8Array.from(instrumentAudc),
    instrumentMacro: Uint8Array.from(instrumentMacro),
    instrumentArp: Uint8Array.from(instrumentArp),
    channelBase: Uint8Array.from(channelBase),
    channelInstruments: Object.freeze(channelInstruments.map((list) => Object.freeze([...list]))),
    columnBytes: Object.freeze(columnBytes),
    sequenceBytes: Uint8Array.from(sequenceBytes),
    loopRows,
    loopFrames: loopRows * framesPerRow,
    loopSeconds: (loopRows * framesPerRow) / definition.targetFrameHz,
    dataBytes,
    // 4 transport counters in the $4ED9 block, 20 B of voice state in the
    // linked BSS tail, 10 B of zero page for the four column pointers and a
    // scratch pair.
    stateBytes: 20,
    zeroPageBytes: 10,
  });
}

export function renderMusicCa65Include(asset) {
  const rows = (values, perLine) => {
    const lines = [];
    for (let offset = 0; offset < values.length; offset += perLine) {
      lines.push(`    .byte ${[...values.slice(offset, offset + perLine)].map(byte).join(",")}`);
    }
    return lines;
  };
  const lines = [
    "; Generated from assets/music/menu-theme.json by scripts/music.mjs.",
    "; Do not edit this file by hand.",
    `MUSIC_PAL_HZ = ${asset.targetFrameHz}`,
    `MUSIC_CHANNELS = ${CHANNEL_COUNT}`,
    `MUSIC_FRAMES_PER_ROW = ${asset.framesPerRow}`,
    `MUSIC_PATTERN_ROWS = ${asset.rowsPerPattern}`,
    `MUSIC_SEQUENCE_LENGTH = ${asset.sequence.length}`,
    `MUSIC_COLUMN_COUNT = ${asset.columnBytes.length}`,
    `MUSIC_TOKEN_HOLD = ${byte(TOKEN_HOLD)}`,
    `MUSIC_TOKEN_REST = ${byte(TOKEN_REST)}`,
    `MUSIC_TOKEN_PITCH_BIAS = ${byte(TOKEN_PITCH_BIAS)}`,
    `MUSIC_MACRO_LAST_ENTRY = ${byte(MACRO_LAST_ENTRY)}`,
    `MUSIC_VOICE_OFF = ${byte(VOICE_OFF)}`,
    ".macro EMIT_MENU_MUSIC_DATA",
    "music_data_start:",
    "music_pitches:",
    ...rows(asset.pitchBytes, 16),
    "music_macro_page:",
    ...rows(asset.macroPage, 16),
    "music_instrument_audc:",
    ...rows(asset.instrumentAudc, 16),
    "music_instrument_macro:",
    ...rows(asset.instrumentMacro, 16),
    "music_instrument_arp:",
    ...rows(asset.instrumentArp, 16),
    "music_channel_base:",
    ...rows(asset.channelBase, 16),
    "music_sequence:",
    ...rows(asset.sequenceBytes, 16),
    "music_column_lo:",
    `    .byte ${asset.columnBytes.map((_, id) => `<music_column_${id}`).join(",")}`,
    "music_column_hi:",
    `    .byte ${asset.columnBytes.map((_, id) => `>music_column_${id}`).join(",")}`,
  ];
  asset.columnBytes.forEach((column, id) => {
    lines.push(`music_column_${id}:`, ...rows(column, 16));
  });
  lines.push(
    "music_data_end:",
    `.assert music_data_end-music_data_start = ${asset.dataBytes}, error, ` +
      "\"menu music data size changed\"",
    ".endmacro",
    "",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// A JS model of the 6502 player, reading the COMPILED bytes. It exists so the
// stream test can compare the encoding against the oracle without an emulator;
// tests/music-v2-runtime.test.mjs then proves the binary agrees with this.
// Every step below has a one-to-one counterpart in music_tick in src/main.s.
// ---------------------------------------------------------------------------

export function createMusicState() {
  return {
    active: false,
    rowTimer: 0,
    sequenceIndex: 0,
    patternRow: 0,
    column: new Array(CHANNEL_COUNT).fill(0),
    base: new Array(CHANNEL_COUNT).fill(VOICE_OFF),
    pitch: new Array(CHANNEL_COUNT).fill(0),
    env: new Array(CHANNEL_COUNT).fill(0),
    arp: new Array(CHANNEL_COUNT).fill(0),
    arpStart: new Array(CHANNEL_COUNT).fill(0),
    channels: Array.from({ length: CHANNEL_COUNT }, () => ({ audf: null, audc: 0 })),
  };
}

function loadBar(state, asset) {
  for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
    state.column[channel] = asset.sequenceBytes[state.sequenceIndex * CHANNEL_COUNT + channel];
  }
}

export function startMusic(state, asset, { soundEnabled = true } = {}) {
  stopMusic(state);
  if (!soundEnabled) return state;
  state.base.fill(VOICE_OFF);
  state.active = true;
  state.rowTimer = 1;
  loadBar(state, asset);
  return state;
}

export function stopMusic(state) {
  state.active = false;
  state.rowTimer = 0;
  state.sequenceIndex = 0;
  state.patternRow = 0;
  state.column.fill(0);
  state.base.fill(VOICE_OFF);
  for (const channel of state.channels) Object.assign(channel, { audf: null, audc: 0 });
  return state;
}

function applyToken(state, asset, channel, token) {
  if (token === TOKEN_HOLD) return;
  if (token === TOKEN_REST) {
    state.base[channel] = VOICE_OFF;
    return;
  }
  state.pitch[channel] = (token & 0x3f) - TOKEN_PITCH_BIAS;
  const instrument = asset.channelBase[channel] + (token >>> 6);
  state.base[channel] = asset.instrumentAudc[instrument];
  state.env[channel] = asset.instrumentMacro[instrument];
  state.arp[channel] = asset.instrumentArp[instrument];
  state.arpStart[channel] = asset.instrumentArp[instrument];
}

function voiceFrame(state, asset, channel) {
  const out = state.channels[channel];
  const base = state.base[channel];
  if (base === VOICE_OFF) {
    out.audc = 0;
    return;
  }
  if (base === 0x00) { // a drum: the macro publishes raw (AUDC, AUDF) pairs
    const control = asset.macroPage[state.env[channel]];
    if (control === 0) {
      out.audc = 0;
      return;
    }
    out.audf = asset.macroPage[state.env[channel] + 1];
    out.audc = control;
    state.env[channel] += 2;
    return;
  }
  const entry = asset.macroPage[state.env[channel]];
  if ((entry & MACRO_LAST_ENTRY) === 0) state.env[channel] += 1;
  const volume = entry & 0x0f;
  if (volume === 0) {
    out.audc = 0;
    return;
  }
  const step = asset.macroPage[state.arp[channel]];
  if ((step & MACRO_LAST_ENTRY) !== 0) state.arp[channel] = state.arpStart[channel];
  else state.arp[channel] += 1;
  out.audf = asset.pitchBytes[state.pitch[channel] + (step & 0x7f)];
  out.audc = base | volume;
}

/** One PAL frame of the menu player. Returns true when a row was applied. */
export function tickMusic(state, asset) {
  if (!state.active) return false;
  state.rowTimer -= 1;
  let rowApplied = false;
  if (state.rowTimer === 0) {
    rowApplied = true;
    state.rowTimer = asset.framesPerRow;
    for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) {
      applyToken(state, asset, channel,
        asset.columnBytes[state.column[channel]][state.patternRow]);
    }
    state.patternRow += 1;
    if (state.patternRow === asset.rowsPerPattern) {
      state.patternRow = 0;
      state.sequenceIndex += 1;
      if (state.sequenceIndex === asset.sequence.length) state.sequenceIndex = 0;
      loadBar(state, asset);
    }
  }
  for (let channel = 0; channel < CHANNEL_COUNT; channel += 1) voiceFrame(state, asset, channel);
  return rowApplied;
}

/** The model's own per-frame register stream, in the oracle's shape. */
export function simulateStream(asset, frames) {
  const state = startMusic(createMusicState(), asset);
  const stream = [];
  for (let frame = 0; frame < frames; frame += 1) {
    tickMusic(state, asset);
    stream.push(state.channels.map(({ audf, audc }) => ({ audf: audc === 0 ? null : audf, audc })));
  }
  return stream;
}
