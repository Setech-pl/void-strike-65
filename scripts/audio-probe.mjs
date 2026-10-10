// fix/hardware-audio, Phase A (docs/diagnostics/hardware-audio.md): probe
// builds for the owner's real-hardware audio test. On a real 65XE the menu's
// melody (channels 3 and 4) and every gameplay sound effect on channels 3 and 4
// are silent; Atari800 plays them all. The suspect is SKCTL = $13: bit 4 is
// POKEY's asynchronous receive mode, which holds timers 3 and 4 in reset while
// no start bit arrives (Altirra Hardware Reference Manual, ch. 5,
// "Asynchronous receive mode"), and Atari800 does not model the hold.
//
// Each probe is the default build plus source edits applied IN MEMORY while
// scripts/build.mjs reads its inputs: nothing under src/ or assets/ changes on
// disk, and the variant owns build/audio-probe-<id>/ like every review
// variant. Every probe renames the menu title so the owner can see which one
// is running; the title keeps its 14 characters, so no layout moves.

import fs from "node:fs";
import path from "node:path";

const TITLE_SOURCE = '.define MAIN_MENU_TITLE_TEXT "VOID STRIKE 65"';

// SKCTL $03: keyboard scan and debounce on (bits 0-1, never initialisation
// mode), serial mode %000 (bits 4-6), two-tone off (bit 3) - the OS's own
// power-on value ($E96D in the XL OS). Written once in the frontend's
// initialisation, before the menu's first frame and after the OS's last SIOV
// (stage 2 ends before start; no OS call follows). The takeover prefix at
// start has 2 spare bytes, so the write sits here instead; the splash between
// the two uses channel 1 alone.
const TAKEOVER_EDIT = {
  file: "src/main.s",
  from: "    jsr silence_audio\n    lda #$01\n    sta sound_enabled",
  to: "    lda #$03                    ; AUDIO PROBE: SKCTL normal, async receive off\n" +
    "    sta $D20F\n    jsr silence_audio\n    lda #$01\n    sta sound_enabled",
};

// The sector reader's rest value $13 -> $03 (0 bytes): every exit of the
// reader goes through sector_reader_quiesce, and every reader operation
// writes its own SKCTL ($00 / $23 / $33) before it uses the port.
const READER_EDIT = {
  file: "src/hybrid/sector-reader.s",
  from: "SKCTL_REST      = $13",
  to: "SKCTL_REST      = $03",
};

// The channel test: the menu theme's eight bars become one plain pure tone
// per channel in turn - channel 1, 2, 3, 4, twice per loop - with the menu's
// own AUDCTL (0) and whatever SKCTL the probe leaves. The pitches rise (C4, E4,
// G4, C5), so a silent channel is a missing step in the climb.
const CHANNEL_TEST_PITCHES = ["C4", "E4", "G4", "C5"];
const CHANNEL_TEST_INSTRUMENT = "LEAD";

function channelTestTheme(text) {
  const theme = JSON.parse(text);
  const rows = theme.rowsPerPattern;
  const sequence = theme.sequence;
  const patterns = {};
  sequence.forEach((barId, index) => {
    const channel = index % 4;
    const bar = [];
    for (let row = 0; row < rows; row += 1) {
      const cells = ["REST", "REST", "REST", "REST"];
      if (row === 0) cells[channel] = `${CHANNEL_TEST_INSTRUMENT}:${CHANNEL_TEST_PITCHES[channel]}`;
      else if (row < rows - 2) cells[channel] = "HOLD";
      bar.push(cells);
    }
    patterns[barId] = bar;
  });
  theme.title = `${theme.title} - AUDIO PROBE channel test`;
  theme.patterns = patterns;
  return JSON.stringify(theme);
}

const CHANNEL_TEST_EDIT = {
  file: "assets/music/menu-theme.json",
  transform: channelTestTheme,
};

export const AUDIO_PROBES = Object.freeze({
  P0: { summary: "reference: today's game, title label only", edits: [] },
  P1: { summary: "SKCTL $03 at the takeover and as the sector reader's rest value",
    edits: [TAKEOVER_EDIT, READER_EDIT] },
  P2: { summary: "SKCTL $03 at the takeover only (the menu after boot)", edits: [TAKEOVER_EDIT] },
  P3: { summary: "SKCTL $03 as the sector reader's rest value only (after every load)",
    edits: [READER_EDIT] },
  P4: { summary: "menu channel test (one tone per channel in turn), SKCTL unchanged",
    edits: [CHANNEL_TEST_EDIT] },
  P5: { summary: "menu channel test with P1's SKCTL $03", edits: [CHANNEL_TEST_EDIT, TAKEOVER_EDIT, READER_EDIT] },
});

export function parseAudioProbe(argv) {
  const argument = argv.find((value) => value.startsWith("--audio-probe="));
  if (argument === undefined) return null;
  const id = argument.slice("--audio-probe=".length).toUpperCase();
  if (!Object.hasOwn(AUDIO_PROBES, id)) {
    throw new Error(`Unknown audio probe ${id}; expected one of ${Object.keys(AUDIO_PROBES).join(", ")}`);
  }
  return id;
}

function replaceOnce(text, from, to, file) {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + 1) >= 0) {
    throw new Error(`audio probe: ${file} must contain ${JSON.stringify(from)} exactly once`);
  }
  return text.slice(0, first) + to + text.slice(first + from.length);
}

// Wraps fs.readFileSync so the probe's files read back edited. Every edit must
// be consumed by the build, or the probe is not what its name says.
export function installAudioProbe(rootDirectory, id) {
  const probe = AUDIO_PROBES[id];
  const titleEdit = {
    file: "src/main.s",
    from: TITLE_SOURCE,
    to: `.define MAIN_MENU_TITLE_TEXT "AUDIO PROBE ${id}"`,
  };
  const byFile = new Map();
  for (const edit of [titleEdit, ...probe.edits]) {
    const absolute = path.resolve(rootDirectory, edit.file);
    if (!byFile.has(absolute)) byFile.set(absolute, []);
    byFile.get(absolute).push(edit);
  }
  const consumed = new Set();
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSyncWithAudioProbe(file, options) {
    const result = original.call(fs, file, options);
    if (typeof file !== "string" && !(file instanceof URL)) return result;
    const absolute = path.resolve(file instanceof URL ? file.pathname : file);
    const edits = byFile.get(absolute);
    if (edits === undefined) return result;
    let text = Buffer.isBuffer(result) ? result.toString("utf8") : result;
    for (const edit of edits) {
      text = edit.transform ? edit.transform(text) : replaceOnce(text, edit.from, edit.to, edit.file);
    }
    consumed.add(absolute);
    return Buffer.isBuffer(result) ? Buffer.from(text, "utf8") : text;
  };
  return {
    summary: probe.summary,
    assertConsumed() {
      for (const absolute of byFile.keys()) {
        if (!consumed.has(absolute)) {
          throw new Error(`audio probe ${id}: the build never read ${path.relative(rootDirectory, absolute)}`);
        }
      }
    },
  };
}
