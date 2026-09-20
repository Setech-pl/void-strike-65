import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readRuntimeBytes } from "../scripts/runtime-image.mjs";
import {
  createExplosionFlashComparisonPreview,
  createExplosionFlashNativePreview,
  createExplosionFlashTrace,
  explosionFlashColorForTimers,
  inspectPng,
  readExplosionFlashRuntimeState,
} from "../scripts/preview.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "src", "main.s"), "utf8");
const runtime = readExplosionFlashRuntimeState(source);
const labels = new Map(
  fs.readFileSync(path.join(root, "build", "void-strike-65.lbl"), "utf8")
    .split(/\r?\n/)
    .map((line) => /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim()))
    .filter(Boolean)
    .map((match) => [match[2], Number.parseInt(match[1], 16)]),
);

function routine(start, end) {
  const startIndex = source.search(new RegExp(`^${start}:`, "m"));
  const endIndex = source.search(new RegExp(`^${end}:`, "m"));
  assert.ok(startIndex >= 0 && endIndex > startIndex, `invalid routine bounds ${start}..${end}`);
  return source.slice(startIndex, endIndex);
}

function linkedBytes(label, length) {
  const address = labels.get(label);
  return [...readRuntimeBytes(root, address, length)];
}

test("named PAL colours and linked tables define the exact two fighter profiles", () => {
  assert.deepEqual(runtime.colors, {
    FLASH_YELLOW_BRIGHT: 0x1e,
    FLASH_YELLOW_MID: 0x1c,
    FLASH_RED_BRIGHT: 0x3c,
    FLASH_RED_MID: 0x38,
    FLASH_RED_DARK: 0x34,
  });
  assert.equal(runtime.baseColor, 0x00);
  assert.equal(runtime.playerDamageColor, 0x42);
  assert.deepEqual(runtime.enemySequence, [0x1e, 0x3c, 0x1c, 0x34]);
  assert.deepEqual(runtime.playerSequence, [0x1e, 0x3c, 0x1c, 0x3c, 0x38, 0x34]);
  assert.deepEqual(linkedBytes("enemy_fighter_flash_colors", 4), [...runtime.enemySequence].reverse());
  assert.deepEqual(linkedBytes("player_death_flash_colors", 6), [...runtime.playerSequence].reverse());
  assert.equal([...runtime.enemySequence, ...runtime.playerSequence].includes(0x84), false);
});

test("enemy and PlayerFighter COLBK sequences restore base on the exact next PAL frame", () => {
  const enemy = Array.from({ length: 5 }, (_, frame) => explosionFlashColorForTimers(runtime, {
    enemyTimer: runtime.totalExplosionFrames - frame,
  }));
  const player = Array.from({ length: 7 }, (_, frame) => explosionFlashColorForTimers(runtime, {
    playerTimer: runtime.totalExplosionFrames - frame,
  }));
  assert.deepEqual(enemy, [...runtime.enemySequence, runtime.baseColor]);
  assert.deepEqual(player, [...runtime.playerSequence, runtime.baseColor]);
  assert.equal(runtime.enemySequence.length * 20, 80);
  assert.equal(runtime.playerSequence.length * 20, 120);
});

test("PlayerFighter death wins same-frame arbitration and enemy flashes cannot restart forever", () => {
  for (let playerTimer = 19; playerTimer <= 24; playerTimer += 1) {
    for (let enemyTimer = 21; enemyTimer <= 24; enemyTimer += 1) {
      assert.equal(
        explosionFlashColorForTimers(runtime, { playerTimer, enemyTimer }),
        runtime.playerSequence[24 - playerTimer],
      );
    }
  }
  for (let playerTimer = 1; playerTimer < 19; playerTimer += 1) {
    assert.equal(explosionFlashColorForTimers(runtime, { playerTimer, enemyTimer: 24 }),
      runtime.baseColor, "enemy flash cannot replace the restored PlayerFighter profile");
  }
  const resolution = routine("resolve_enemy_damage", "add_archetype_score_obsolete");
  assert.match(resolution,
    /cmp #ENEMY_ACTIVE_STATE[\s\S]+bne @next[\s\S]+dec ENEMY_LIVE_COUNT[\s\S]+bne @damage_feedback[\s\S]+sta ENEMY_ACTIVE[\s\S]+@damage_feedback:[\s\S]+spawn_interceptor_breakup_effects/);
  assert.match(source,
    /spawn_interceptor_breakup_effects:[\s\S]+begin_enemy_fighter_explosion/);
  assert.match(routine("update_enemy", "draw_enemy"),
    /cmp #ENEMY_EXPLODING_STATE[\s\S]+FIGHTER_EXPLOSION_TIMER\+FIGHTER_EXPLOSION_ENEMY_SLOT[\s\S]+beq @reset\s+rts/);
});

test("the flash has one COLBK owner while gameplay DLI preserves the gameplay-region colour", () => {
  const sound = routine("update_sound", "silence_audio");
  assert.match(sound,
    /FIGHTER_EXPLOSION_TIMER\+FIGHTER_EXPLOSION_PLAYER_FIGHTER_SLOT[\s\S]+player_death_flash_colors,x[\s\S]+sta COLBK/);
  assert.match(sound,
    /FIGHTER_EXPLOSION_TIMER\+FIGHTER_EXPLOSION_ENEMY_SLOT[\s\S]+enemy_fighter_flash_colors,x[\s\S]+sta COLBK/);
  assert.doesNotMatch(sound, /sta COLP(?:F|M)[0-3]/);
  assert.doesNotMatch(sound, /lda #\$42/);
  assert.doesNotMatch(routine("gameplay_dli", "init_screen"), /COLBK/);
  assert.match(routine("start_gameplay", "start_gameplay_end"), /sta COLBK/);
  assert.match(routine("resume_gameplay", "pause_silence_audio"), /sta COLBK/);
});

test("legacy nonlethal damage remains bounded while fighter flashes own their restore", () => {
  assert.equal(explosionFlashColorForTimers(runtime, { damageTimer: 18 }), 0x42);
  assert.equal(explosionFlashColorForTimers(runtime, { enemyTimer: 24, damageTimer: 18 }), 0x1e);
  assert.equal(explosionFlashColorForTimers(runtime, { enemyTimer: 20, damageTimer: 0 }), 0x00);
  assert.match(routine("update_sound", "silence_audio"),
    /@enemy_fighter_flash:[\s\S]+sta damage_timer[\s\S]+enemy_fighter_flash_colors,x/);
  assert.match(routine("update_sound", "silence_audio"),
    /player_death_flash_colors,x[\s\S]+@enemy_fighter_flash:[\s\S]+@player_damage_flash:[\s\S]+PLAYER_DAMAGE_FLASH_COLOR/);
});

test("pause freezes every phase and frontend/resume paths cannot leak a flash colour", () => {
  for (const [profile, sequence] of [
    ["playerTimer", runtime.playerSequence],
    ["enemyTimer", runtime.enemySequence],
  ]) {
    sequence.forEach((color, index) => {
      const timer = runtime.totalExplosionFrames - index;
      assert.equal(explosionFlashColorForTimers(runtime, { [profile]: timer }), color);
      assert.equal(explosionFlashColorForTimers(runtime, {
        [profile]: timer,
        gameplayActive: false,
      }), runtime.baseColor);
    });
  }
  const pause = routine("enter_pause", "pause_silence_audio");
  assert.doesNotMatch(pause, /tick_shared_fighter_explosions|update_sound/);
  assert.match(pause, /select_frontend_display[\s\S]+render_frontend_state/);
  assert.match(routine("resume_gameplay", "pause_silence_audio"), /lda #\$00\s+sta COLBK/);
});

test("respawn, Game Over, new game and sector transitions retain their lifecycle contracts", () => {
  assert.match(routine("respawn_player", "tick_respawn_invulnerability"), /sta damage_timer/);
  assert.match(routine("init_fighter_projectiles", "clear_fighter_projectiles"),
    /ldx #\$00[\s\S]+sta FIGHTER_PROJECTILE_ACTIVE,x[\s\S]+cpx #\(FIGHTER_PROJECTILE_STATE_END-FIGHTER_PROJECTILE_ACTIVE\)/);
  assert.match(routine("main_loop", "wait_frame"),
    /update_player_death[\s\S]+clear_pmg[\s\S]+silence_audio[\s\S]+enter_game_over/);
  assert.match(routine("start_gameplay", "start_gameplay_end"),
    /init_state[\s\S]+lda #\$00\s+sta COLBK/);
  assert.match(routine("init_state", "clear_pmg"), /jsr init_fighter_projectiles/);
  const sector = routine("update_sector_completion", "apply_broadside_player_damage");
  assert.match(sector, /lda FIGHTER_EXPLOSION_TIMER\s+ora FIGHTER_EXPLOSION_TIMER\+1/);
  assert.doesNotMatch(sector, /sta FIGHTER_EXPLOSION_TIMER|damage_timer|COLBK/);
});

test("enemy death during broadside uses the same bounded profile without changing capital effects", () => {
  assert.match(routine("handle_collisions", "queue_enemy_damage"),
    /jsr update_broadside\s+profile_after_broadside_update\s*=\s*\*\s+jsr resolve_enemy_damage/);
  assert.match(routine("update_broadside", "schedule_broadside"),
    /jsr schedule_broadside[\s\S]+@done:\s+rts/);
  assert.doesNotMatch(routine("tick_capital_explosions", "render_capital_explosions"), /COLBK|damage_timer/);
  assert.doesNotMatch(routine("tick_launch_flashes", "render_launch_flashes"), /COLBK|damage_timer/);
  assert.equal(explosionFlashColorForTimers(runtime, { enemyTimer: 24 }), 0x1e);
});

test("flash selection does not touch RNG, cadence, glyphs, or entity/effects limits", () => {
  const sound = routine("update_sound", "silence_audio");
  assert.doesNotMatch(sound,
    /rng|WORLD_ROW_ADVANCED|STAR_|scroll_accumulator|DIFFICULTY|ENTITY_ACTIVE_LIMIT|EFFECT_ACTIVE_LIMIT/);
  const entityInclude = fs.readFileSync(path.join(root, "build", "entity-effects.inc"), "utf8");
  assert.match(entityInclude, /ENTITY_ACTIVE_LIMIT\s*=\s*2/);
  assert.match(entityInclude, /EFFECT_ACTIVE_LIMIT\s*=\s*5/);
  assert.match(source, /ENTITY_DEBRIS_GLYPH_COUNT\s*=\s*8/);
  assert.match(entityInclude, /WEAPON_PICKUP_GLYPH_COUNT\s*=\s*4/);
});

test("owner previews and frame trace are deterministic source-derived evidence", () => {
  const nativeA = createExplosionFlashNativePreview(source);
  const nativeB = createExplosionFlashNativePreview(source);
  const comparisonA = createExplosionFlashComparisonPreview(source);
  const comparisonB = createExplosionFlashComparisonPreview(source);
  assert.deepEqual(nativeA, nativeB);
  assert.deepEqual(comparisonA, comparisonB);
  assert.deepEqual(inspectPng(nativeA), {
    width: 960,
    height: 1248,
    colorType: 2,
    bitDepth: 8,
    chunkTypes: ["IHDR", "IDAT", "IEND"],
  });
  assert.deepEqual(inspectPng(comparisonA), {
    width: 1280,
    height: 496,
    colorType: 2,
    bitDepth: 8,
    chunkTypes: ["IHDR", "IDAT", "IEND"],
  });
  const trace = createExplosionFlashTrace(source).trimEnd().split("\n");
  assert.equal(trace.length, 13);
  assert.deepEqual(trace.slice(1, 6).map((line) => line.split(",")[3]),
    ["$1E", "$3C", "$1C", "$34", "$00"]);
  assert.deepEqual(trace.slice(6).map((line) => line.split(",")[3]),
    ["$1E", "$3C", "$1C", "$3C", "$38", "$34", "$00"]);
});
