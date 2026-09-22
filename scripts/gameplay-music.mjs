import fs from "node:fs";

const CHANNEL_COUNT = 2;
const TOKEN_HOLD = 0x00;
const TOKEN_REST = 0x01;
const TOKEN_NOTE_BASE = 0x02;
const MAX_NOTE_COUNT = 14;
const EVENTS_PER_TICK_LIMIT = 1;

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

// The v1 menu theme's frequency table, frozen here.
//
// Until 2026-09-22 the gameplay score indexed `music_frequency_table` inside
// the menu music data, which is what `frequencySource: "menu-theme"` in
// gameplay-theme.json records. The menu moved to format 2 (plan-music-v2.md
// §10.1) and its table is now 43 v2 dividers, so the v1 gameplay player keeps
// its own copy of the sixteen dividers it was composed against and its POKEY
// stream stays byte-identical. Both this table and this module are deleted by
// plan §10 step 2b, which compiles the gameplay theme through scripts/music.mjs.
const V1_MENU_FREQUENCY_TABLE = Object.freeze([
  { id: "C3", divider: 244 }, { id: "D3", divider: 218 }, { id: "EB3", divider: 205 },
  { id: "F3", divider: 182 }, { id: "G3", divider: 162 }, { id: "A3", divider: 144 },
  { id: "BB3", divider: 136 }, { id: "C4", divider: 121 }, { id: "D4", divider: 108 },
  { id: "EB4", divider: 102 }, { id: "F4", divider: 91 }, { id: "G4", divider: 81 },
  { id: "A4", divider: 72 }, { id: "BB4", divider: 68 }, { id: "C5", divider: 61 },
  { id: "D5", divider: 54 },
]);

export function loadGameplayMusicDefinition(sourcePath) {
  return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
}

export function compileGameplayMusic(definition) {
  invariant(definition?.formatVersion === 1, "Unsupported gameplay-music formatVersion");
  invariant(definition.originalComposition === true,
    "Gameplay music must be identified as an original composition");
  invariant(definition.targetFrameHz === 50, "Gameplay music must target PAL 50 Hz");
  invariant(definition.audctlProfile === 0,
    "Gameplay music must use the SFX-safe default AUDCTL profile");
  invariant(definition.frequencySource === "menu-theme",
    "Gameplay music must reuse the frozen v1 menu-theme frequency table");
  const framesPerRow = integer(definition.framesPerRow, "framesPerRow", 1, 255);
  const rowsPerPattern = integer(definition.rowsPerPattern, "rowsPerPattern", 1, 255);

  invariant(Array.isArray(definition.channelAllocation) &&
    definition.channelAllocation.length === CHANNEL_COUNT,
  "Gameplay music must document exactly two POKEY music channels");
  assertChannel(definition.channelAllocation[0], 1, "Player Fighter shot");
  assertChannel(definition.channelAllocation[1], 2, "hit effect");
  invariant(Array.isArray(definition.reservedSfxChannels) &&
    definition.reservedSfxChannels.length === 2,
  "Gameplay music must document the two SFX-only channels");
  assertReservedChannel(definition.reservedSfxChannels[0], 3, "engine bed");
  assertReservedChannel(definition.reservedSfxChannels[1], 4, "capital-hull explosion");

  const channelControls = Uint8Array.from(definition.channelAllocation.map((entry, index) =>
    integer(entry.control, `channelAllocation[${index}].control`, 1, 255)));
  invariant(channelControls.every((control) => (control & 0x0f) <= 3),
    "Gameplay music volume must remain at or below 3 for SFX priority");

  invariant(Array.isArray(definition.pitchTable) && definition.pitchTable.length > 0 &&
    definition.pitchTable.length <= MAX_NOTE_COUNT,
  "Gameplay music pitchTable needs one through fourteen entries");
  const menuPitchIndex = new Map(V1_MENU_FREQUENCY_TABLE.map(({ id }, index) => [id, index]));
  const pitchToken = new Map();
  definition.pitchTable.forEach((pitch, index) => {
    invariant(typeof pitch === "string" && menuPitchIndex.has(pitch),
      `pitchTable[${index}] has unknown v1 menu frequency ${pitch}`);
    const menuIndex = menuPitchIndex.get(pitch);
    invariant(menuIndex === index,
      "Gameplay pitchTable must be the leading ordered subset of the v1 menu frequencies");
    invariant(!pitchToken.has(pitch), `Duplicate gameplay pitch ${pitch}`);
    pitchToken.set(pitch, TOKEN_NOTE_BASE + index);
  });

  function compileToken(token, tokenPath) {
    invariant(typeof token === "string", `${tokenPath} must be a string token`);
    if (token === "HOLD") return TOKEN_HOLD;
    if (token === "REST") return TOKEN_REST;
    invariant(pitchToken.has(token), `${tokenPath} has unknown pitch ${token}`);
    return pitchToken.get(token);
  }

  invariant(definition.patterns && typeof definition.patterns === "object" &&
    !Array.isArray(definition.patterns), "Gameplay music patterns must be an object");
  const patternNames = Object.keys(definition.patterns);
  invariant(patternNames.length > 0 && patternNames.length <= 255,
    "Gameplay music needs one through 255 patterns");
  const patternIndex = new Map(patternNames.map((name, index) => [name, index]));
  const patternBytes = patternNames.map((name) => {
    const rows = definition.patterns[name];
    invariant(Array.isArray(rows) && rows.length === rowsPerPattern,
      `Pattern ${name} must contain ${rowsPerPattern} rows`);
    return Uint8Array.from(rows.map((row, rowIndex) => {
      invariant(Array.isArray(row) && row.length === CHANNEL_COUNT,
        `Pattern ${name} row ${rowIndex} must contain two channels`);
      const channel1 = compileToken(row[0], `patterns.${name}[${rowIndex}][0]`);
      const channel2 = compileToken(row[1], `patterns.${name}[${rowIndex}][1]`);
      return channel1 << 4 | channel2;
    }));
  });

  invariant(Array.isArray(definition.sequence) && definition.sequence.length > 0 &&
    definition.sequence.length <= 255,
  "Gameplay music sequence needs one through 255 entries");
  const sequenceBytes = Uint8Array.from(definition.sequence.map((name, index) => {
    invariant(patternIndex.has(name), `sequence[${index}] references unknown pattern ${name}`);
    return patternIndex.get(name);
  }));

  invariant(Array.isArray(definition.form) && definition.form.length === 4,
    "Gameplay music form must document intro, development, climax, and return");
  const expectedSections = ["INTRO", "DEVELOPMENT", "CLIMAX", "RETURN"];
  let formCursor = 0;
  definition.form.forEach((section, index) => {
    invariant(section?.id === expectedSections[index],
      `Gameplay music form section ${index} must be ${expectedSections[index]}`);
    invariant(section.sequenceStart === formCursor,
      `Gameplay music form section ${section.id} must start at ${formCursor}`);
    integer(section.sequenceEnd, `form.${section.id}.sequenceEnd`,
      section.sequenceStart + 1, sequenceBytes.length);
    formCursor = section.sequenceEnd;
  });
  invariant(formCursor === sequenceBytes.length,
    "Gameplay music form must cover the full sequence");

  const loopFrames = framesPerRow * rowsPerPattern * sequenceBytes.length;
  invariant(loopFrames >= 30 * definition.targetFrameHz &&
    loopFrames <= 45 * definition.targetFrameHz,
  "Gameplay music loop must last between 30 and 45 seconds");
  const frequencyBytes = Uint8Array.from(
    V1_MENU_FREQUENCY_TABLE.slice(0, definition.pitchTable.length).map(({ divider }) => divider));
  const dataBytes = frequencyBytes.length + patternNames.length * 2 + sequenceBytes.length +
    patternBytes.reduce((sum, bytes) => sum + bytes.length, 0);

  return Object.freeze({
    ...definition,
    framesPerRow,
    rowsPerPattern,
    patternNames: Object.freeze(patternNames),
    patternBytes: Object.freeze(patternBytes),
    sequenceBytes,
    frequencyBytes,
    channelControls,
    loopFrames,
    loopSeconds: loopFrames / definition.targetFrameHz,
    dataBytes,
    stateBytes: 5,
    eventsPerTickLimit: EVENTS_PER_TICK_LIMIT,
  });
}

function assertChannel(entry, channel, preemptedBy) {
  invariant(entry?.channel === channel,
    `Gameplay music channel allocation entry must own POKEY channel ${channel}`);
  invariant(entry.preemptedBy === preemptedBy,
    `POKEY channel ${channel} must be preempted by ${preemptedBy}`);
}

function assertReservedChannel(entry, channel, role) {
  invariant(entry?.channel === channel && entry.role === role,
    `POKEY channel ${channel} must remain reserved for ${role}`);
}

export function renderGameplayMusicCa65Include(asset) {
  const lines = [
    "; Generated from assets/music/gameplay-theme.json by scripts/gameplay-music.mjs.",
    "; Do not edit this file by hand.",
    `GAME_MUSIC_PAL_HZ = ${asset.targetFrameHz}`,
    `GAME_MUSIC_FRAMES_PER_ROW = ${asset.framesPerRow}`,
    `GAME_MUSIC_PATTERN_ROWS = ${asset.rowsPerPattern}`,
    `GAME_MUSIC_PATTERN_COUNT = ${asset.patternNames.length}`,
    `GAME_MUSIC_SEQUENCE_LENGTH = ${asset.sequenceBytes.length}`,
    `GAME_MUSIC_EVENTS_PER_TICK_LIMIT = ${asset.eventsPerTickLimit}`,
    "GAME_MUSIC_CHANNEL_MASK = $03",
    `GAME_MUSIC_CH1_AUDC = ${byte(asset.channelControls[0])}`,
    `GAME_MUSIC_CH2_AUDC = ${byte(asset.channelControls[1])}`,
    `GAME_MUSIC_TOKEN_HOLD = ${byte(TOKEN_HOLD)}`,
    `GAME_MUSIC_TOKEN_REST = ${byte(TOKEN_REST)}`,
    `GAME_MUSIC_TOKEN_NOTE_BASE = ${byte(TOKEN_NOTE_BASE)}`,
    ".macro EMIT_GAMEPLAY_MUSIC_DATA",
    "game_music_data_start:",
    "game_music_frequency_table:",
    `    .byte ${[...asset.frequencyBytes].map(byte).join(",")}`,
    "game_music_pattern_lo:",
    `    .byte ${asset.patternNames.map((name) => `<game_music_pattern_${name}`).join(",")}`,
    "game_music_pattern_hi:",
    `    .byte ${asset.patternNames.map((name) => `>game_music_pattern_${name}`).join(",")}`,
    "game_music_sequence:",
    `    .byte ${[...asset.sequenceBytes].map(byte).join(",")}`,
  ];
  asset.patternNames.forEach((name, index) => {
    lines.push(`game_music_pattern_${name}:`);
    const bytes = asset.patternBytes[index];
    for (let offset = 0; offset < bytes.length; offset += 8) {
      lines.push(`    .byte ${[...bytes.subarray(offset, offset + 8)].map(byte).join(",")}`);
    }
  });
  lines.push(
    "game_music_data_end:",
    `.assert game_music_data_end-game_music_data_start = ${asset.dataBytes}, error, \"gameplay music data size changed\"`,
    ".endmacro",
    "",
  );
  return lines.join("\n");
}

export function createGameplayMusicState() {
  return {
    enabled: true,
    active: false,
    rowTimer: 0,
    sequenceIndex: 0,
    patternRow: 0,
    channels: [
      { frequency: 0, control: 0 },
      { frequency: 0, control: 0 },
    ],
  };
}

export function startGameplayMusic(state, asset, { soundEnabled = true } = {}) {
  state.active = state.enabled && soundEnabled;
  state.rowTimer = state.active ? 1 : 0;
  state.sequenceIndex = 0;
  state.patternRow = 0;
  for (const channel of state.channels) Object.assign(channel, { frequency: 0, control: 0 });
  return state;
}

export function stopGameplayMusic(state) {
  state.active = false;
  state.rowTimer = 0;
  state.sequenceIndex = 0;
  state.patternRow = 0;
  for (const channel of state.channels) Object.assign(channel, { frequency: 0, control: 0 });
  return state;
}

export function tickGameplayMusic(state, asset, {
  playerDying = false,
  sfxBusy = [false, false],
} = {}) {
  const result = { rowAdvanced: false, writes: [] };
  if (!state.active) return result;

  state.rowTimer -= 1;
  if (state.rowTimer === 0) {
    state.rowTimer = asset.framesPerRow;
    const patternIndex = asset.sequenceBytes[state.sequenceIndex];
    const packed = asset.patternBytes[patternIndex][state.patternRow];
    const tokens = [packed >>> 4, packed & 0x0f];
    tokens.forEach((token, channelIndex) => {
      const channel = state.channels[channelIndex];
      if (token === TOKEN_REST) {
        channel.control = 0;
      } else if (token !== TOKEN_HOLD) {
        channel.frequency = asset.frequencyBytes[token - TOKEN_NOTE_BASE];
        channel.control = asset.channelControls[channelIndex];
      }
    });
    state.patternRow += 1;
    if (state.patternRow === asset.rowsPerPattern) {
      state.patternRow = 0;
      state.sequenceIndex += 1;
      if (state.sequenceIndex === asset.sequenceBytes.length) state.sequenceIndex = 0;
    }
    result.rowAdvanced = true;
  }

  state.channels.forEach((channel, channelIndex) => {
    if (sfxBusy[channelIndex]) return;
    result.writes.push({
      channel: channelIndex + 1,
      frequency: channel.frequency,
      control: playerDying ? 0 : channel.control,
    });
  });
  return result;
}
