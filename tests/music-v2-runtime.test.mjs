// plan-music-v2.md §6 test (b) — the binary plays the renderer's stream.
//
// Test (a) proves the compiled bytes imply the right stream. This one proves
// the 6502 player in the shipped XEX actually emits it: the runtime image is
// loaded into the NMOS harness, music_start_menu and music_tick are called the
// way the frontend loop calls them, every POKEY write is trapped, and each
// frame's final register state is compared with the oracle.
//
// The gameplay half of this test belongs to plan §10 step 2b, which replaces
// the gameplay player; tests/gameplay-music-placement.test.mjs still holds the
// v1 gameplay stream until then.
//
// Red on a build that still carries the v1 menu player.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Nmos6502 } from "../scripts/nmos6502.mjs";
import { initialiseRuntime, requiredLabel } from "../scripts/weapon-pickup-runtime.mjs";
import { compileMusic, loadMusicDefinition } from "../scripts/music.mjs";
import { renderOracleStream } from "../scripts/music-oracle.mjs";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definition = loadMusicDefinition(
  path.join(rootDirectory, "assets", "music", "menu-theme.json"));
const asset = compileMusic(definition);
const mainSource = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");

function routine(label, nextLabel) {
  const start = mainSource.indexOf(`${label}:`);
  const end = mainSource.indexOf(`${nextLabel}:`, start + label.length + 1);
  assert.notEqual(start, -1, `missing routine ${label}`);
  assert.notEqual(end, -1, `missing routine boundary ${nextLabel}`);
  return mainSource.slice(start, end);
}

const AUDF1 = 0xd200;
const AUDCTL = 0xd208;
const POKEY_FIRST = 0xd200;
const POKEY_LAST = 0xd20f;

function menuTrace() {
  const { memory, labels } = initialiseRuntime(rootDirectory, "xex", 0xa5);
  memory[requiredLabel(labels, "sound_enabled")] = 1;

  let trap = null;
  const cpu = new Nmos6502(memory, {
    write(address) {
      if (trap && address >= POKEY_FIRST && address <= POKEY_LAST) trap.push(address);
    },
  });
  const stop = 0x7fff;
  const call = (address) => {
    const before = cpu.cycles;
    cpu.push((stop - 1) >> 8);
    cpu.push((stop - 1) & 0xff);
    cpu.pc = address;
    for (let steps = 0; steps < 200_000 && cpu.pc !== stop; steps += 1) cpu.step();
    assert.equal(cpu.pc, stop, `the call at $${address.toString(16)} did not return`);
    return cpu.cycles - before;
  };

  // enter_frontend_state stops the transport and starts the menu theme; the
  // harness does exactly that rather than starting on the cold fill.
  call(requiredLabel(labels, "music_stop"));
  call(requiredLabel(labels, "music_start_menu"));
  assert.equal(memory[requiredLabel(labels, "MUSIC_ACTIVE")], 1,
    "music_start_menu must arm the transport");

  // One full loop plus one row, so the sequence wrap is covered.
  const frames = asset.loopFrames + asset.framesPerRow;
  const stream = [];
  const touched = [];
  const cycles = [];
  for (let frame = 0; frame < frames; frame += 1) {
    trap = touched;
    cycles.push(call(requiredLabel(labels, "music_tick")));
    trap = null;
    stream.push([0, 1, 2, 3].map((channel) => ({
      audf: memory[AUDF1 + channel * 2],
      audc: memory[AUDF1 + channel * 2 + 1],
    })));
  }
  return { stream, touched, cycles, memory, labels, call };
}

const run = menuTrace();

test("the shipped menu player emits the reference renderer's register stream", () => {
  const expected = renderOracleStream(definition,
    { frames: asset.loopFrames + asset.framesPerRow });
  assert.equal(run.stream.length, expected.length);
  for (let frame = 0; frame < expected.length; frame += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      const want = expected[frame][channel];
      const got = run.stream[frame][channel];
      assert.equal(got.audc, want.audc,
        `frame ${frame} channel ${channel + 1} AUDC: the binary disagrees with the renderer`);
      // AUDF is don't-care while the channel is silent.
      if (want.audc !== 0) {
        assert.equal(got.audf, want.audf,
          `frame ${frame} channel ${channel + 1} AUDF: the binary disagrees with the renderer`);
      }
    }
  }
});

test("the menu tick writes only AUDF1-4 and AUDC1-4", () => {
  const stray = [...new Set(run.touched)].filter((address) => address > 0xd207);
  assert.deepEqual(stray, [],
    "the menu tick must not touch AUDCTL, STIMER or any other POKEY register");
  // AUDCTL is left where silence_audio put it: the drafts declare audctl 0 and
  // channels 3 and 4 are SFX-owned in gameplay, where the clock is shared.
  assert.equal(run.memory[AUDCTL], 0);
});

test("a silent channel keeps its divider: the player writes AUDC only", () => {
  // The renderer's REST and zero-volume frames are AUDC $00 with no defined
  // divider. The player must not write AUDF there -- that is what lets the
  // stream comparison above ignore AUDF on silent frames instead of inventing
  // a value for it.
  const source = run;
  let silentFrames = 0;
  for (let frame = 1; frame < source.stream.length; frame += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      if (source.stream[frame][channel].audc !== 0) continue;
      silentFrames += 1;
      assert.equal(source.stream[frame][channel].audf, source.stream[frame - 1][channel].audf,
        `frame ${frame} channel ${channel + 1}: AUDF moved while the channel was silent`);
    }
  }
  assert.ok(silentFrames > 0, "the score has silent frames to check");
});

test("the menu tick's per-frame cost stays a frontend cost, not a raster one", () => {
  // There is no fence in the frontend: music_tick runs right after wait_frame,
  // about ten scanlines of CPU before the input poll and far above the footer
  // DLI. The bound is documented, not gated -- it exists so a later edit that
  // made the tick an order of magnitude more expensive would be noticed.
  const minimum = Math.min(...run.cycles);
  const maximum = Math.max(...run.cycles);
  assert.ok(maximum <= 1400,
    `the menu tick's worst frame costs ${maximum} cycles (min ${minimum})`);
  assert.ok(minimum >= 100, `the menu tick's cheapest frame costs ${minimum} cycles`);
});

test("music_stop silences every channel and disarms the transport", () => {
  run.call(requiredLabel(run.labels, "music_stop"));
  assert.equal(run.memory[requiredLabel(run.labels, "MUSIC_ACTIVE")], 0);
  for (let channel = 0; channel < 4; channel += 1) {
    assert.equal(run.memory[AUDF1 + channel * 2 + 1], 0,
      `AUDC${channel + 1} was left sounding after music_stop`);
  }
  assert.equal(run.memory[AUDCTL], 0);
});

test("the menu theme starts only in the main menu and stops before gameplay", () => {
  // Carried over from the retired v1 menu test: the call sites are a property
  // of the frontend, not of the score format, and they still have to hold.
  assert.match(mainSource,
    /jsr show_loader[\s\S]+jsr unpack_starfield_runtime[\s\S]+jmp finish_startup_after_loader[\s\S]+finish_startup_after_loader:[\s\S]+sta sound_enabled[\s\S]+jsr music_init[\s\S]+jsr enter_main_menu/);
  assert.match(routine("frontend_loop", "dispatch_frontend_input"),
    /cmp #STATE_MAIN_MENU\s+beq @restore_palette[\s\S]+@restore_palette:[\s\S]+jsr music_tick[\s\S]+lda STICK0[\s\S]+lda TRIG0/);
  assert.match(routine("enter_frontend_state", "enter_exited_state"),
    /cmp #STATE_MAIN_MENU[\s\S]+jsr music_stop[\s\S]+jsr music_start_menu/);
  const gameplay = routine("start_gameplay", "main_loop");
  assert.match(gameplay,
    /sta gameplay_fire_gate\s+sta pause_option_latched\s+jsr music_stop[\s\S]+lda sound_enabled/);
  assert.doesNotMatch(gameplay, /music_tick|music_start_menu/);
  assert.match(routine("handle_game_over_input", "handle_exit_input"), /jmp enter_main_menu/);
  // music_stop still reaches the hardware through silence_audio, which is the
  // one place AUDCTL and all eight channel registers are cleared.
  assert.match(routine("music_stop", "music_tick"), /jmp silence_audio/);
  const silence = routine("silence_audio", "hud_ascii");
  for (const register of [
    "AUDF1", "AUDC1", "AUDF2", "AUDC2", "AUDF3", "AUDC3", "AUDF4", "AUDC4", "AUDCTL",
  ]) {
    assert.match(silence, new RegExp(`sta ${register}`));
  }
});
