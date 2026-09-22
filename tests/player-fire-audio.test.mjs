import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  executePlayerFireAudioTrace,
} from "../scripts/player-fire-audio-trace.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");

// Owner answer Q-S1 (owner-decisions-2026-09-11.md §AB.2), 2026-09-22: the
// shot SFX moved from POKEY channel 1 to channel 4, shared with the
// capital-hull explosion, so the gameplay music's bass on channel 1 is never
// preempted. Every assertion below is the one it always was, re-targeted:
// the phase still lives in RAM, the register is still never read back, the
// $33..$38 sequence is still complete and unrestarted. What is new is the
// shared-channel priority, which is asserted here and measured against the
// running binary in tests/music-v2-runtime.test.mjs.
test("shot SFX owns its phase in RAM and never reads write-only AUDF4", () => {
  const sound = source.slice(source.indexOf("\nupdate_sound:") + 1,
    source.indexOf("\nsilence_audio:") + 1);
  assert.doesNotMatch(sound, /inc AUDF4|dec AUDF4|asl AUDF4|lsr AUDF4/);
  assert.match(sound,
    /inc fire_timer\s+lda fire_timer\s+sta AUDF4[\s\S]*?cmp #\$39[\s\S]+sta fire_timer\s+sta AUDC4/);
  assert.match(source,
    /play_player_fighter_projectile_sound:[\s\S]+lda #\$32[\s\S]+sta fire_timer/);
  assert.match(source,
    /resume_gameplay_audio:[\s\S]+lda fire_timer\s+beq @hit\s+sta AUDF4/);
  // The shot no longer touches channel 1 anywhere.
  for (const routine of [
    source.slice(source.indexOf("play_player_fighter_projectile_sound:"),
      source.indexOf("update_enemy_weapon_runtime:")),
    sound,
  ]) {
    assert.doesNotMatch(routine, /sta AUDF1|sta AUDC1/,
      "the shot SFX must leave channel 1 to the music's bass");
  }
  // Channel 4 is shared with the capital-hull explosion, which outranks the
  // shot: update_sound writes the shot first and the explosion second, and
  // the explosion's silent branch must not cut a live shot.
  assert.match(sound, /@capital_silent:\s+lda fire_timer\s+bne @damage/);
  assert.match(sound, /ldy #PLAYER_FIGHTER_SHOT_AUDC\s+sty AUDC4/);
});

test("master PAL gate makes transition-only fire/audio catch-up obsolete", () => {
  const loop = source.slice(source.indexOf("main_loop:"), source.indexOf("enter_pause:"));
  assert.match(loop,
    /main_loop:\s+jsr wait_for_master_pal_frame\s+jsr begin_fighter_projectile_frame/);
  const publication = source.slice(source.indexOf("publish_fighter_projectile_overlays:"),
    source.indexOf("fighter_projectile_option_debounce_wait:"));
  assert.match(publication,
    /lda FIGHTER_PROJECTILE_PUBLICATION_FRAME\s+beq @fighter_window[\s\S]+jsr erase_dynamic_near_star_overlays\s+jsr publish_dynamic_near_star_phase\s+jmp fighter_projectile_publication_capital_render\s+@fighter_window:\s+ldx #\$77\s+jsr wait_frame_at_line\s+fighter_projectile_publication_begin/);
  assert.doesNotMatch(publication, /jsr update_sound|player_fire_transition_tick/);
  assert.doesNotMatch(source, /player_fire_transition_tick:/);
  assert.match(source,
    /lda TRIG0\s+bne update_player_fighter_weapon_released\s+update_player_fighter_weapon_controller:\s+lda PLAYER_FIGHTER_BURST_STATE/);
});

test("accepted cadence is movement-independent, pool-safe and every complete SFX is $33..$38", () => {
  const trace = executePlayerFireAudioTrace({ root, artifact: "xex", frames: 6_000,
    transitionFrame: 3_100 });
  assert.ok(trace.modes.reduce((sum, mode) => sum + mode.accepted_shots, 0) >= 1_000);
  const expected = {
    NORMAL: { "9": 462, "12": 153 },
    RAPID: { "6": 667, "12": 166 },
    SPREAD: { "12": 62, "28": 187 },
  };
  for (const mode of trace.modes) {
    assert.deepEqual(mode.successful_interval_histogram, expected[mode.mode]);
    assert.equal(mode.denied_admissions, 0);
    assert.ok(mode.maximum_pool_occupancy <= 5);
    assert.equal(mode.restarted_sfx_sequences, 0);
    assert.equal(mode.sfx_sequences.every(({ tones, completed, truncatedByTrace }) =>
      truncatedByTrace || completed && tones.join() === "51,52,53,54,55,56"), true);
  }
  for (const movement of ["LEFT", "RIGHT", "REVERSAL"]) {
    for (const mode of ["NORMAL", "RAPID", "SPREAD"]) {
      const stationary = trace.modes.find((record) =>
        record.mode === mode && record.movement === "STATIONARY");
      const moving = trace.modes.find((record) =>
        record.mode === mode && record.movement === movement);
      assert.deepEqual(moving.successful_interval_histogram,
        stationary.successful_interval_histogram);
    }
  }
});
