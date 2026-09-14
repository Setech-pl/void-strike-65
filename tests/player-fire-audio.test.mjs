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

test("shot SFX owns its phase in RAM and never reads write-only AUDF1", () => {
  const sound = source.slice(source.indexOf("\nupdate_sound:") + 1,
    source.indexOf("\nsilence_audio:") + 1);
  assert.doesNotMatch(sound, /inc AUDF1|dec AUDF1|asl AUDF1|lsr AUDF1/);
  assert.match(sound,
    /inc fire_timer\s+lda fire_timer\s+sta AUDF1[^\n]*\n\s*cmp #\$39[\s\S]+sta fire_timer\s+sta AUDC1/);
  assert.match(source,
    /play_player_fighter_projectile_sound:[\s\S]+lda #\$32[\s\S]+sta fire_timer/);
  assert.match(source,
    /resume_gameplay_audio:[\s\S]+lda fire_timer\s+beq @hit\s+sta AUDF1/);
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
