import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(testDirectory, "..");
const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDirectory, "build", "manifest.json")));

function routine(label, nextLabel) {
  const start = source.indexOf(`${label}:`);
  const end = source.indexOf(`${nextLabel}:`, start + label.length + 1);
  assert.notEqual(start, -1, `missing routine ${label}`);
  assert.notEqual(end, -1, `missing routine boundary ${nextLabel}`);
  return source.slice(start, end);
}

function optionEdge(state, pressed) {
  if (!pressed) {
    state.optionLatched = false;
    return false;
  }
  if (state.optionLatched) return false;
  state.optionLatched = true;
  return true;
}

function pauseInput(state, { stick = 0x0f, fire = false } = {}) {
  if (stick === 0x0f && !fire) {
    state.inputArmed = true;
    return false;
  }
  if (!state.inputArmed) return false;
  state.inputArmed = false;
  return true;
}

test("physical OPTION enters PAUSED before any gameplay frame mutation", () => {
  assert.match(source, /CONSOL\s*=\s*\$D01F/);
  assert.match(source, /CONSOL_OPTION_MASK\s*=\s*\$04/);
  assert.match(source, /STATE_PAUSED\s*=\s*8/);
  const loop = routine("main_loop", "enter_pause");
  assert.match(loop,
    /jsr wait_gameplay_frame\s+lda #CONSOL_OPTION_MASK\s+bit CONSOL\s+beq main_loop_option_pressed/);
  assert.ok(loop.indexOf("bit CONSOL") < loop.indexOf("integration_active_gameplay_tick"));
  assert.match(loop, /inc pause_option_latched\s+jmp enter_pause/);
});

test("PAUSED runs no world, combat, animation, score, death, or respawn tick", () => {
  const paused = routine("pause_loop", "poll_pause_option_edge");
  for (const forbidden of [
    "frame_counter", "ACTIVE_GAMEPLAY_FRAME", "integration_active_gameplay_tick",
    "read_input", "update_enemy", "update_starfield",
    "update_player_fighter_weapon", "update_enemy_weapon", "handle_collisions",
    "tick_shared_fighter_explosions", "tick_capital_explosions",
    "update_engine_animation", "update_player_death", "tick_respawn_invulnerability",
    "update_score", "music_tick_gameplay", "update_sound",
  ]) {
    assert.doesNotMatch(paused, new RegExp(forbidden));
  }

  const world = {
    frame: 17,
    playerX: 124,
    scroll: 9,
    enemyY: 40,
    projectileY: 72,
    deathTimer: 13,
    respawnTimer: 211,
    invulnerabilityTimer: 199,
    score: 0x1234,
    musicRow: 7,
  };
  const before = structuredClone(world);
  const input = { optionLatched: true, inputArmed: false };
  for (let frame = 0; frame < 500; frame += 1) {
    optionEdge(input, true);
    pauseInput(input, { fire: true });
  }
  assert.deepEqual(world, before);
});

test("held OPTION and FIRE are release-gated to one action", () => {
  const option = { optionLatched: false };
  assert.equal(optionEdge(option, true), true);
  assert.equal(optionEdge(option, true), false);
  assert.equal(optionEdge(option, true), false);
  assert.equal(optionEdge(option, false), false);
  assert.equal(optionEdge(option, true), true);

  const fire = { inputArmed: false };
  assert.equal(pauseInput(fire, { fire: true }), false);
  assert.equal(pauseInput(fire, { fire: true }), false);
  assert.equal(pauseInput(fire), false);
  assert.equal(pauseInput(fire, { fire: true }), true);
  assert.equal(pauseInput(fire, { fire: true }), false);

  assert.match(routine("poll_pause_option_edge", "handle_pause_menu_input"),
    /and #CONSOL_OPTION_MASK[\s\S]+sta pause_option_latched[\s\S]+lda pause_option_latched[\s\S]+inc pause_option_latched/);
  assert.match(routine("show_pause_menu", "show_pause_quit_confirmation"),
    /sta frontend_selection\s+sta frontend_input_armed/);
  assert.match(routine("pause_loop", "poll_pause_option_edge"),
    /cmp #STATE_PAUSE_QUIT_CONFIRM\s+beq handle_pause_quit_input\s+jmp handle_pause_menu_input/,
    "pause action handlers must be tail-dispatched so state transitions do not leak stack frames");
});

test("pause preserves music transport and resume continues only when enabled", () => {
  const enter = routine("enter_pause", "show_pause_menu");
  assert.match(enter, /jsr pause_silence_audio\s+jsr backup_gameplay_screen/);
  assert.doesNotMatch(enter, /music_stop|music_tick|MUSIC_SEQUENCE_INDEX|MUSIC_PATTERN_ROW/);

  const resumeAudio = routine("resume_gameplay_audio", "music_stop_gameplay");
  assert.match(resumeAudio,
    /lda GAME_MUSIC_ENABLED\s+beq @done\s+lda MUSIC_ACTIVE\s+bne @restore_music\s+jsr music_start_gameplay/);
  assert.match(resumeAudio, /jsr music_restore_gameplay_channels/);
  assert.doesNotMatch(routine("pause_loop", "poll_pause_option_edge"), /music_tick/);
});

test("pause GAME MUSIC toggles shared state immediately without modifying SFX", () => {
  assert.match(routine("toggle_pause_game_music", "resume_gameplay"),
    /jsr toggle_game_music_setting[\s\S]+lda GAME_MUSIC_ENABLED\s+bne @draw\s+jsr music_stop_gameplay/);
  assert.match(routine("toggle_game_music_setting", "select_previous_difficulty"),
    /lda GAME_MUSIC_ENABLED\s+eor #\$01\s+sta GAME_MUSIC_ENABLED\s+rts/);
  const stop = routine("music_stop_gameplay", "quit_gameplay_to_menu");
  assert.match(stop, /MUSIC_TRANSIENT_STATE_END-MUSIC_ACTIVE/);
  assert.match(stop, /lda fire_timer\s+bne @channel_2/);
  assert.match(stop, /lda hit_timer\s+bne @done/);
  assert.doesNotMatch(stop,
    /sta fire_timer|sta hit_timer|sta damage_timer|AUDF3|AUDC3|AUDF4|AUDC4|AUDCTL|silence_audio/);
});

test("QUIT TO MENU requires confirmation and defaults to NO", () => {
  assert.match(source,
    /pause_screen_data:[\s\S]+"RESUME"[\s\S]+"GAME MUSIC: OFF"[\s\S]+"QUIT TO MENU"/);
  assert.match(source,
    /pause_quit_screen_data:[\s\S]+"QUIT TO MENU\?"[\s\S]+"NO"[\s\S]+"YES"/);
  assert.match(routine("show_pause_quit_confirmation", "render_pause_and_loop"),
    /lda #STATE_PAUSE_QUIT_CONFIRM[\s\S]+lda #\$00[\s\S]+sta frontend_selection\s+sta frontend_input_armed/);
  assert.match(routine("handle_pause_menu_input", "handle_pause_quit_input"),
    /cmp #\$01\s+beq toggle_pause_game_music\s+jmp show_pause_quit_confirmation/);
});

test("NO returns to pause while YES clears gameplay and starts menu music", () => {
  const confirm = routine("handle_pause_quit_input", "toggle_pause_game_music");
  assert.match(confirm,
    /lda frontend_selection\s+bne [^\n]+\s+jmp show_pause_menu[\s\S]+jmp quit_gameplay_to_menu/);

  const quit = routine("quit_gameplay_to_menu", "backup_gameplay_screen");
  for (const cleanup of [
    "music_stop_gameplay", "init_fighter_projectiles", "clear_pmg", "clear_screen",
  ]) {
    assert.match(quit, new RegExp(`jsr ${cleanup}`));
  }
  assert.match(quit,
    /BROAD_STATE_END-BROAD_STATE_BASE[\s\S]+GAMEPLAY_RESIDENT_END-HULL_SCROLL_ACCUMULATOR[\s\S]+STAR_FAR_STATE_END-STAR_FAR_ACTIVE[\s\S]+STARFIELD_STATE_END-STAR_RNG_STATE/);
  assert.match(quit, /jsr enter_main_menu\s+jmp frontend_loop/);
  assert.match(routine("enter_frontend_state", "enter_exited_state"),
    /@start_menu_music:\s+jsr music_start_menu/);
});

test("pause overlay reuses the frontend renderer and released staging RAM", () => {
  assert.match(source, /PAUSE_SCREEN_BACKUP\s*=\s*STARFIELD_STAGING/);
  assert.match(source, /PAUSE_SCREEN_BYTES\s*=\s*\$03C0/);
  assert.equal(manifest.starfieldRuntime.stagingAddress, 0x7810);
  assert.deepEqual(
    [manifest.pause.screenBackupAddress, manifest.pause.screenBackupBytes,
      manifest.pause.zeroPageStateBytes, manifest.pause.activeFramePollCycles,
      manifest.pause.simulationTicksWhilePaused],
    [0x7810, 0x03c0, 1, 13, 0],
  );
  assert.ok(0x3c0 <= manifest.starfieldRuntime.stagingBytes);
  assert.match(routine("render_pause_and_loop", "pause_loop"),
    /jsr select_frontend_display\s+jsr render_frontend_state/);
  assert.match(routine("copy_pause_screen", "wait_frame"),
    /ldx #\$03[\s\S]+ldx #\$C0/);
  assert.doesNotMatch(source, /pause_bitmap|PAUSE_BITMAP/);
});

test("quit preserves TOP and a new game remains the sole SCORE reset path", () => {
  const quit = routine("quit_gameplay_to_menu", "backup_gameplay_screen");
  assert.doesNotMatch(quit, /TOP_SCORE_TABLE|insert_top_score|score_bcd_lo|score_bcd_hi/);
  const init = routine("init_state", "clear_pmg");
  assert.match(init, /sta score_bcd_lo\s+sta score_bcd_hi/);
  assert.doesNotMatch(init, /TOP_SCORE_TABLE|insert_top_score/);
});
