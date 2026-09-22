import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compileGameplayMusic,
  createGameplayMusicState,
  loadGameplayMusicDefinition,
  renderGameplayMusicCa65Include,
  startGameplayMusic,
  stopGameplayMusic,
  tickGameplayMusic,
} from "../scripts/gameplay-music.mjs";
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
const gameplayDefinitionPath = path.join(
  rootDirectory, "assets", "music", "gameplay-theme.json",
);
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
// Music v2 §1.4 placement G1: the gameplay player is its own link inside the
// per-level image. Main keeps the option, the state and the call sites; the
// player's own body is read from its own source.
const playerSource = fs.readFileSync(
  path.join(rootDirectory, "src", "hybrid", "gameplay-music.s"), "utf8",
);
const gameplayInclude = fs.readFileSync(
  path.join(rootDirectory, "build", "gameplay-music.inc"), "utf8",
);
// The menu moved to format 2 (plan §10.1); the v1 gameplay compiler now owns
// a frozen copy of the sixteen dividers this score was composed against, so
// its POKEY stream is unchanged. Both go in plan §10 step 2b.
const asset = compileGameplayMusic(loadGameplayMusicDefinition(gameplayDefinitionPath));
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

function routine(label, nextLabel) {
  return routineIn(source, label, nextLabel);
}

function playerRoutine(label, nextLabel) {
  return routineIn(playerSource, label, nextLabel);
}

test("gameplay composition compiles to a deterministic packed 30.72-second PAL loop", () => {
  const second = compileGameplayMusic(loadGameplayMusicDefinition(gameplayDefinitionPath));
  assert.equal(renderGameplayMusicCa65Include(second), renderGameplayMusicCa65Include(asset));
  assert.deepEqual(
    [asset.targetFrameHz, asset.framesPerRow, asset.rowsPerPattern,
      asset.patternNames.length, asset.sequenceBytes.length, asset.loopFrames, asset.loopSeconds],
    [50, 6, 16, 6, 16, 1536, 30.72],
  );
  // 124 B of score plus the 14-entry divider table this player now carries
  // itself: the menu's table went to format 2 in plan §10.1, so the v1 score
  // keeps a frozen copy of the dividers it was composed against and its POKEY
  // stream is unchanged (tests/gameplay-music-placement.test.mjs proves it).
  assert.equal(asset.frequencyBytes.length, 14);
  assert.equal(asset.dataBytes, 138);
  assert.deepEqual(asset.form.map(({ id }) => id),
    ["INTRO", "DEVELOPMENT", "CLIMAX", "RETURN"]);
  assert.ok(asset.patternBytes.every((pattern) => pattern.length === 16));
  assert.deepEqual(
    [manifest.gameplayMusic.runtimeDataBytes, manifest.gameplayMusic.runtimeStateBytes,
      manifest.gameplayMusic.channelMask, manifest.gameplayMusic.audctlProfile,
      manifest.gameplayMusic.eventsPerTickLimit],
    [138, 5, 0x03, 0, 1],
  );
});

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
  assert.deepEqual(first.writes, [
    { channel: 1, frequency: 244, control: 0xa2 },
    { channel: 2, frequency: 0, control: 0 },
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
  assert.equal(eventFrames.length, asset.rowsPerPattern * asset.sequenceBytes.length);
  assert.deepEqual(eventFrames.slice(0, 5), [0, 6, 12, 18, 24]);
  assert.equal(eventFrames.at(-1), asset.loopFrames - asset.framesPerRow);
  assert.deepEqual(
    [state.sequenceIndex, state.patternRow, state.rowTimer],
    [0, 0, 1],
  );
  assert.equal(tickGameplayMusic(state, asset).rowAdvanced, true,
    "the gameplay loop must restart without a silent timing gap");
});

test("death does not restart transport and respawn restores the current voices", () => {
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  for (let frame = 0; frame < 31; frame += 1) tickGameplayMusic(state, asset);
  const positionBeforeDeath = [state.sequenceIndex, state.patternRow];
  const mutedControls = [];
  for (let frame = 0; frame < 24; frame += 1) {
    const result = tickGameplayMusic(state, asset, { playerDying: true });
    mutedControls.push(...result.writes.map(({ control }) => control));
  }
  assert.ok(mutedControls.every((control) => control === 0));
  assert.notDeepEqual([state.sequenceIndex, state.patternRow], positionBeforeDeath,
    "the song transport must continue through the death animation");

  const positionBeforeRespawnTick = [state.sequenceIndex, state.patternRow, state.rowTimer];
  const resumed = tickGameplayMusic(state, asset);
  assert.deepEqual(resumed.writes.map(({ channel }) => channel), [1, 2]);
  assert.notDeepEqual([state.sequenceIndex, state.patternRow, state.rowTimer], [0, 0, 1]);
  assert.notDeepEqual(positionBeforeRespawnTick, [0, 0, 1]);
});

test("shot and hit SFX preempt music absolutely, then music resumes in place", () => {
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  tickGameplayMusic(state, asset);
  const position = [state.sequenceIndex, state.patternRow];
  const preempted = tickGameplayMusic(state, asset, { sfxBusy: [true, true] });
  assert.deepEqual(preempted.writes, []);
  assert.deepEqual([state.sequenceIndex, state.patternRow], position);

  const channel1Only = tickGameplayMusic(state, asset, { sfxBusy: [false, true] });
  assert.deepEqual(channel1Only.writes.map(({ channel }) => channel), [1]);
  const resumed = tickGameplayMusic(state, asset);
  assert.deepEqual(resumed.writes.map(({ channel }) => channel), [1, 2]);
  assert.deepEqual([state.sequenceIndex, state.patternRow], position,
    "SFX release must not restart the score");
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

  const tick = playerRoutine("music_tick_gameplay", "game_music_load_pattern");
  assert.match(tick,
    /lda fire_timer\s+bne [^\n]+[\s\S]+sta AUDF1[\s\S]+sta AUDC1/);
  assert.match(tick,
    /lda hit_timer\s+bne @done[\s\S]+sta AUDF2[\s\S]+sta AUDC2/);
  assert.doesNotMatch(tick, /AUDF3|AUDC3|AUDF4|AUDC4|AUDCTL/);
  assert.match(tick, /cmp #PLAYER_DYING\s+beq @mute/);
  assert.equal((tick.match(/jsr game_music_read_token/g) ?? []).length, 1,
    "fixed-width format permits exactly one bounded event read per tick");
  assert.doesNotMatch(tick, /jmp game_music_read_token|b(?:cc|cs|eq|ne|mi|pl|vc|vs) game_music_read_token/);
  assert.match(tick,
    /\.assert GAME_MUSIC_EVENTS_PER_TICK_LIMIT = 1/);
  assert.match(gameplayInclude, /GAME_MUSIC_EVENTS_PER_TICK_LIMIT = 1/);

  assert.match(routine("allocate_player_fighter_projectile", "update_enemy_weapon_runtime"),
    /lda #\$A8\s+sta AUDC1/);
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
  assert.match(gameplayInclude, /GAME_MUSIC_CH1_AUDC = \$A2/);
  assert.match(gameplayInclude, /GAME_MUSIC_CH2_AUDC = \$A3/);
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

test("stop clears cached gameplay voices without changing the persistent option", () => {
  const state = startGameplayMusic(createGameplayMusicState(), asset);
  tickGameplayMusic(state, asset);
  state.enabled = false;
  stopGameplayMusic(state);
  assert.equal(state.enabled, false);
  assert.equal(state.active, false);
  assert.ok(state.channels.every(({ frequency, control }) => frequency === 0 && control === 0));
});
