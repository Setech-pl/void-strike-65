// The gameplay theme "GRA-2", format 2 (plan-music-v2.md §10 step 2b).
//
// The encoding and the register stream are proved elsewhere:
// tests/music-v2-stream.test.mjs is plan test (a), the compiled bytes against
// the reference renderer, and tests/music-v2-runtime.test.mjs is (b) and (c),
// the shipped binary against the same oracle with and without SFX. What is
// here is everything else the gameplay theme has to get right: the transport,
// the GAME MUSIC option, the death path, the call sites, and the SFX
// ownership the owner decided in Q-S1.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileGameplayMusic,
  createGameplayMusicState,
  loadMusicDefinition,
  startGameplayMusic,
  stopGameplayMusic,
  tickGameplayMusic,
} from "../scripts/music.mjs";
import {
  compileCapitalHulls,
  loadCapitalHullsDefinition,
} from "../scripts/capital-hulls.mjs";
import { simulateBroadsideCadence } from "../scripts/broadside.mjs";
import { readRuntimeBytes } from "../scripts/runtime-image.mjs";
import {
  compileStarfield,
  createStarfieldState,
  loadStarfieldDefinition,
  stepStarfieldFrame,
  stepStarfieldWorld,
} from "../scripts/starfield.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
// Music v2 §1.4 placement G1: the gameplay player is its own link inside the
// per-level image. Main keeps the option, the state and the call sites; the
// player's own body is read from its own source.
const playerSource = fs.readFileSync(
  path.join(rootDirectory, "src", "hybrid", "gameplay-music.s"), "utf8",
);
const menuDefinition = loadMusicDefinition(
  path.join(rootDirectory, "assets", "music", "menu-theme.json"));
const asset = compileGameplayMusic(
  loadMusicDefinition(path.join(rootDirectory, "assets", "music", "gameplay-theme.json")),
  { pitches: menuDefinition.pitches },
);
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json")));
const labels = new Map(
  fs.readFileSync(path.join(rootDirectory, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function readXexBytes(address, length) {
  return readRuntimeBytes(rootDirectory, address, length);
}

function routineIn(text, label, nextLabel) {
  const start = text.indexOf(`${label}:`);
  const end = text.indexOf(`${nextLabel}:`, start + label.length + 1);
  assert.notEqual(start, -1, `missing routine ${label}`);
  assert.notEqual(end, -1, `missing routine boundary ${nextLabel}`);
  return text.slice(start, end);
}

// Comments in this file talk about the channels it does NOT own, so the
// ownership assertions read the instructions, not the prose.
const playerCode = playerSource.replace(/;[^\n]*/g, "");
const routine = (label, nextLabel) => routineIn(source, label, nextLabel);
const playerRoutine = (label, nextLabel) => routineIn(playerSource, label, nextLabel);

test("assembled gameplay entry always transfers into the relocated main loop", () => {
  const end = labels.get("start_gameplay_end");
  const target = labels.get("main_loop");
  assert.ok(Number.isInteger(end) && Number.isInteger(target));
  assert.deepEqual(
    [...readXexBytes(end - 3, 3)],
    [0x4c, target & 0xff, target >>> 8],
    "start_gameplay must end with JMP main_loop instead of falling into resident CODE",
  );
});

test("600-frame ON/OFF watchdog advances frame, world, stars, and spawn scheduling", () => {
  const hullAsset = compileCapitalHulls(loadCapitalHullsDefinition(
    path.join(rootDirectory, "assets", "graphics", "capital-hulls.json"),
  ));
  const starAsset = compileStarfield(loadStarfieldDefinition(
    path.join(rootDirectory, "assets", "graphics", "starfield.json"),
  ));
  const snapshots = [];

  for (const enabled of [false, true]) {
    const music = createGameplayMusicState();
    music.enabled = enabled;
    startGameplayMusic(music, asset);
    let stars = createStarfieldState(starAsset);
    let frameCounter = 0;
    let musicWrites = 0;
    for (let frame = 0; frame < 600; frame += 1) {
      frameCounter = (frameCounter + 1) & 0xff;
      stars = stepStarfieldFrame(starAsset, stepStarfieldWorld(starAsset, stars));
      musicWrites += tickGameplayMusic(music, asset).writes.length;
    }
    const cadence = simulateBroadsideCadence(hullAsset, {
      frames: 600,
      difficulty: "medium",
    });
    const snapshot = {
      frameCounter,
      worldSteps: stars.worldSteps,
      nearSteps: stars.nearSteps,
      farSteps: stars.farSteps,
      scrollFrames: cadence.worldScrollFrames,
      scheduleAttempts: cadence.scheduleAttempts,
      spawns: cadence.warningStarts.length,
    };
    assert.deepEqual(snapshot, {
      frameCounter: 88,
      worldSteps: 600,
      nearSteps: 300,
      farSteps: 150,
      scrollFrames: 270,
      scheduleAttempts: 54,
      spawns: 2,
    });
    assert.equal(musicWrites === 0, !enabled,
      "GAME MUSIC OFF alone may suppress audio writes, never simulation progress");
    snapshots.push(snapshot);
  }
  assert.deepEqual(snapshots[0], snapshots[1],
    "gameplay scheduling must be independent of the GAME MUSIC option");
});

test("GAME MUSIC ON starts from row zero while OFF performs no tick or POKEY write", () => {
  const on = startGameplayMusic(createGameplayMusicState(), asset);
  assert.deepEqual(
    [on.active, on.sequenceIndex, on.patternRow, on.rowTimer],
    [true, 0, 0, 1],
  );
  const first = tickGameplayMusic(on, asset);
  assert.equal(first.rowAdvanced, true);
  // Row zero of bar01: BASS_G:A3 and LEAD_G:E5, both at envelope entry 0
  // (volume 7, pure tone -> $A7).
  assert.deepEqual(first.writes, [
    { channel: 1, frequency: 143, control: 0xa7 },
    { channel: 2, frequency: 47, control: 0xa7 },
  ]);

  const off = createGameplayMusicState();
  off.enabled = false;
  startGameplayMusic(off, asset);
  const before = structuredClone(off);
  assert.deepEqual(tickGameplayMusic(off, asset),
    { rowAdvanced: false, writes: [] });
  assert.deepEqual(off, before);
});

test("gameplay tempo advances on exact six-frame PAL boundaries without drift", () => {
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  const eventFrames = [];
  for (let frame = 0; frame < asset.loopFrames; frame += 1) {
    if (tickGameplayMusic(state, asset).rowAdvanced) eventFrames.push(frame);
  }
  assert.equal(eventFrames.length, asset.rowsPerPattern * asset.sequence.length);
  assert.deepEqual(eventFrames.slice(0, 5), [0, 6, 12, 18, 24]);
  assert.equal(eventFrames.at(-1), asset.loopFrames - asset.framesPerRow);
  assert.deepEqual(
    [state.sequenceIndex, state.patternRow, state.rowTimer],
    [0, 0, 1],
  );
  assert.equal(tickGameplayMusic(state, asset).rowAdvanced, true,
    "the gameplay loop must restart without a silent timing gap");
});

test("death mutes both voices without stopping the score or the envelopes", () => {
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  for (let frame = 0; frame < 31; frame += 1) tickGameplayMusic(state, asset);
  const positionBeforeDeath = [state.sequenceIndex, state.patternRow];
  const mutedControls = [];
  for (let frame = 0; frame < 24; frame += 1) {
    const result = tickGameplayMusic(state, asset, { dying: true });
    mutedControls.push(...result.writes.map(({ control }) => control));
  }
  assert.ok(mutedControls.every((control) => control === 0));
  assert.notDeepEqual([state.sequenceIndex, state.patternRow], positionBeforeDeath,
    "the song transport must continue through the death animation");

  const resumed = tickGameplayMusic(state, asset);
  assert.deepEqual(resumed.writes.map(({ channel }) => channel), [1, 2]);
  assert.ok(resumed.writes.some(({ control }) => control !== 0),
    "respawn must find the score where the death animation left it, still sounding");
  assert.notDeepEqual([state.sequenceIndex, state.patternRow, state.rowTimer], [0, 0, 1]);
});

test("only the hit SFX preempts, it takes channel 2 alone, and the lead resumes", () => {
  // Owner answer Q-S1: the shot moved to channel 4, so nothing preempts the
  // bass and the lead stops only for a hit. The register-level proof against
  // the running binary is tests/music-v2-runtime.test.mjs; this is the model.
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  tickGameplayMusic(state, asset);
  const position = [state.sequenceIndex, state.patternRow];

  const preempted = tickGameplayMusic(state, asset, { hitTimer: 7 });
  assert.deepEqual(preempted.writes.map(({ channel }) => channel), [1],
    "a live hit SFX must leave channel 2 alone and channel 1 untouched");
  assert.deepEqual([state.sequenceIndex, state.patternRow], position);

  const resumed = tickGameplayMusic(state, asset);
  assert.deepEqual(resumed.writes.map(({ channel }) => channel), [1, 2]);
  assert.deepEqual([state.sequenceIndex, state.patternRow], position,
    "SFX release must not restart the score");

  // The envelope kept advancing under the SFX, so the lead comes back where
  // the score is, not where it stopped.
  const quiet = startGameplayMusic(createGameplayMusicState(), asset);
  const silent = startGameplayMusic(createGameplayMusicState(), asset);
  for (let frame = 0; frame < 4; frame += 1) {
    tickGameplayMusic(quiet, asset);
    tickGameplayMusic(silent, asset, { hitTimer: frame < 2 ? 3 : 0 });
  }
  assert.deepEqual(silent.channels[1], quiet.channels[1],
    "the lead must resume at the envelope position the score reached");
});

test("stop clears the voices without changing the persistent GAME MUSIC option", () => {
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  tickGameplayMusic(state, asset);
  state.enabled = false;
  stopGameplayMusic(state);
  assert.equal(state.enabled, false);
  assert.equal(state.active, false);
  assert.ok(state.channels.every(({ audf, audc }) => audf === 0 && audc === 0));
  assert.ok(state.age.every((age) => age === 0xff));
});

test("assembly preserves SFX ownership, lifecycle, and GAME MUSIC persistence", () => {
  assert.match(routine("finish_startup_after_loader", "entity_slot_bit_masks"),
    /sta sound_enabled[\s\S]+sta GAME_MUSIC_ENABLED[\s\S]+jsr music_init/);
  assert.match(playerRoutine("music_start_gameplay", "music_tick_gameplay"),
    /lda GAME_MUSIC_ENABLED\s+beq @done[\s\S]+lda sound_enabled\s+beq @done/);
  assert.match(routine("music_stop", "music_tick"),
    /MUSIC_TRANSIENT_STATE_END-MUSIC_ACTIVE/);
  assert.match(routine("toggle_game_music", "select_previous_difficulty"),
    /jsr toggle_game_music_setting\s+jmp draw_game_music_value[\s\S]+lda GAME_MUSIC_ENABLED\s+eor #\$01\s+sta GAME_MUSIC_ENABLED\s+rts/);
  assert.doesNotMatch(routine("init_state", "init_screen"), /GAME_MUSIC_ENABLED/);
  assert.doesNotMatch(routine("enter_frontend_state", "enter_exited_state"),
    /sta GAME_MUSIC_ENABLED/);

  const gameplaySetup = routine("start_gameplay", "main_loop");
  assert.match(gameplaySetup,
    /jsr music_stop[\s\S]+sta AUDF3[\s\S]+sta AUDC3[\s\S]+jsr GAMEPLAY_MUSIC_START[\s\S]+jmp main_loop/);
  const mainLoop = routine("main_loop", "wait_frame");
  assert.match(mainLoop,
    /jsr update_sound\s+lda MUSIC_ACTIVE\s+beq [^\n]+\s+jsr GAMEPLAY_MUSIC_TICK/);
  assert.equal((gameplaySetup.match(/GAMEPLAY_MUSIC_START/g) ?? []).length, 1);
  assert.doesNotMatch(routine("main_loop", "enter_pause"), /GAMEPLAY_MUSIC_START/,
    "life loss and respawn must never restart gameplay music");

  // The v2 tick. Channel 1 is published unconditionally -- owner answer Q-S1
  // took the shot SFX off it -- and channel 2 yields to the hit alone.
  const tick = playerRoutine("music_tick_gameplay", "gm_row_channel");
  assert.doesNotMatch(tick, /fire_timer/,
    "nothing may preempt the bass: the shot SFX lives on channel 4 now");
  assert.match(tick, /jsr gm_frame\s+ldy PLAYER_LIFECYCLE[\s\S]+sta AUDC1\s+lda GAME_MUSIC_DIVIDER\s+sta AUDF1/);
  assert.match(tick, /ldy hit_timer\s+bne @done[\s\S]+sta AUDC2\s+lda GAME_MUSIC_DIVIDER\+1\s+sta AUDF2/);
  assert.match(tick, /cpy #PLAYER_DYING/);
  assert.doesNotMatch(playerCode, /AUDF3|AUDC3|AUDF4|AUDC4|AUDCTL/,
    "the gameplay player owns channels 1 and 2 and nothing else");
  // One column byte per channel per row: the generalised form of v1's
  // GAME_MUSIC_EVENTS_PER_TICK_LIMIT (plan §2). Reading it is the only
  // score access in the whole tick, and it is not in a loop.
  assert.equal((playerCode.match(/lda gm_columns,y/g) ?? []).length, 2);
  assert.equal((tick.match(/jsr gm_row_channel/g) ?? []).length, 2);
  assert.doesNotMatch(playerRoutine("gm_row_channel", "gm_apply"), /b(cc|cs|eq|ne|mi|pl)\s+gm_row_channel/);
  assert.equal(manifest.gameplayMusic.columnReadsPerRow, 1);
  // Nothing in the block may modify itself: the boot smoke checksums the
  // level buffer during gameplay.
  assert.doesNotMatch(playerCode, /sta\s+(gm_|game_music_|gameplay_music_)/,
    "nothing in the level-image block may store into the block itself");
  assert.doesNotMatch(source, /game_music_read_token_tail/,
    "the v1 self-modified read tail is gone with the v1 player");

  // The shot SFX is on channel 4 with the capital-hull explosion; the hit
  // keeps channel 2; the engine bed keeps channel 3.
  assert.match(routine("allocate_player_fighter_projectile", "update_enemy_weapon_runtime"),
    /lda #PLAYER_FIGHTER_SHOT_AUDC\s+sta AUDC4/);
  assert.match(routine("play_hit_sound", "update_sound"), /lda #\$88\s+sta AUDC2/);
  for (const sfxRoutine of [
    routine("allocate_player_fighter_projectile", "update_enemy_weapon_runtime"),
    routine("play_hit_sound", "update_sound"),
    routine("update_sound", "silence_audio"),
    routine("play_capital_explosion_sound", "tick_capital_explosions"),
  ]) {
    assert.doesNotMatch(sfxRoutine, /GAME_MUSIC_ENABLED/,
      "the gameplay-music option must not gate or modify SFX");
  }
  // music_stop_gameplay may always silence channel 1 now, and still must not
  // cut a live hit SFX off channel 2.
  const stopGameplay = routine("music_stop_gameplay", "quit_gameplay_to_menu");
  assert.doesNotMatch(stopGameplay, /fire_timer/);
  assert.match(stopGameplay, /sta AUDF1\s+sta AUDC1\s+ldx hit_timer\s+bne @done/);

  assert.match(mainLoop,
    /jsr silence_audio\s+jsr enter_game_over\s+jmp frontend_loop/);
  assert.match(routine("handle_game_over_input", "handle_exit_input"),
    /jmp enter_main_menu/);
  assert.match(routine("enter_frontend_state", "enter_exited_state"),
    /cmp #STATE_MAIN_MENU[\s\S]+jsr music_stop[\s\S]+jsr music_start_menu/);
});

test("gameplay timing values come from the executable runtime report", () => {
  const timing = manifest.runtimeTiming;
  assert.equal(manifest.gameplayMusic.normalFrameCycles,
    timing.cpuDmaOff.gameplayMusicTickMinimumCycles);
  assert.equal(manifest.gameplayMusic.worstRowFrameCycles,
    timing.cpuDmaOff.gameplayMusicTickMaximumCycles);
  assert.equal(manifest.gameplayMusic.pauseOptionPollCycles,
    timing.cpuDmaOff.optionPollCycles);
  assert.equal(manifest.gameplayMusic.cpuWorstFrameCyclesDmaOff,
    timing.cpu_cycles_dma_off);
  assert.equal(manifest.gameplayMusic.cpuComparisonHeadroomCycles,
    timing.cpu_comparison_headroom);
  assert.equal(manifest.gameplayMusic.measuredWallCyclesDmaOn,
    timing.measured_wall_cycles_dma_on);
  assert.equal(manifest.gameplayMusic.measuredPhysicalHeadroomCycles,
    timing.measured_physical_headroom);
  assert.ok(manifest.starfieldRuntime.bytes <= manifest.starfieldRuntime.reservedBytes);
  assert.ok(manifest.starfieldRuntime.packedBytes <= manifest.starfieldRuntime.stagingBytes);
});
