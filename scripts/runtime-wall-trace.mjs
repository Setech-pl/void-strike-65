import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { parseViceLabels } from "./runtime-cycles.mjs";
import { LOADER_DISPLAY_LIST_ADDRESS } from "./loader-assets.mjs";
import { runtimeArtifactSet, runtimeArtifactNames } from "./runtime-evidence.mjs";
import { canonicalPlayfield } from "./playfield.mjs";
import { readStartMenuRuntimeState } from "./preview.mjs";
import { atari800ArtifactLaunches, validateAtari800Launch } from "./artifact-launch.mjs";
import { focusedPalAcceptance } from "./focused-pal-acceptance.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build", "runtime-wall-trace");
const reportPath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
const headerPath = path.join(scriptDirectory, "atari800-wall-trace.h");
const PAL_FRAME_CYCLES = 35_568;
const RING_SCREEN = canonicalPlayfield.ringBufferAddress;
const RING_END = canonicalPlayfield.ringBufferEnd;
const HISTORICAL_PHYSICAL_GATE_CYCLES = 31_568;
const ENTITY_EFFECTS_BASELINE_WALL_CYCLES = 31_440;
const ENTITY_EFFECTS_BASELINE_HEADROOM_CYCLES = 4_128;
const ENTITY_EFFECTS_APPROVED_DELTA_CYCLES = 600;
const ENTITY_EFFECTS_FEATURE_GATE_CYCLES = 32_040;
const DEBRIS_VISUAL_POLISH_BASELINE_WALL_CYCLES = 32_025;
const DEBRIS_VISUAL_POLISH_BASELINE_HEADROOM_CYCLES = 3_543;
const DEBRIS_VISUAL_POLISH_APPROVED_DELTA_CYCLES = 256;
const DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES = 32_281;
const DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES = 32_081;
const DEBRIS_VISUAL_POLISH_ACCEPTED_HEADROOM_CYCLES = 3_487;
const EXPLOSION_FLASH_BASELINE_WALL_CYCLES = 32_081;
const EXPLOSION_FLASH_BASELINE_HEADROOM_CYCLES = 3_487;
const EXPLOSION_FLASH_APPROVED_DELTA_CYCLES = 64;
const EXPLOSION_FLASH_FEATURE_GATE_CYCLES = 32_145;
const EXPLOSION_FLASH_ABSOLUTE_MINIMUM_HEADROOM_CYCLES = 3_200;
const EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES = 32_122;
const EXPLOSION_FLASH_ACCEPTED_HEADROOM_CYCLES = 3_446;
const DESTRUCTIBLE_DEBRIS_BASELINE_WALL_CYCLES = 32_122;
const DESTRUCTIBLE_DEBRIS_BASELINE_HEADROOM_CYCLES = 3_446;
const DESTRUCTIBLE_DEBRIS_TARGET_DELTA_CYCLES = 640;
const DESTRUCTIBLE_DEBRIS_HARD_DELTA_CYCLES = 768;
const DESTRUCTIBLE_DEBRIS_TARGET_GATE_CYCLES = 32_762;
const DESTRUCTIBLE_DEBRIS_HARD_GATE_CYCLES = 32_890;
const DESTRUCTIBLE_DEBRIS_MINIMUM_HEADROOM_CYCLES = 2_800;
const ENEMY_BREAKUP_BASELINE_WALL_CYCLES = 32_719;
const ENEMY_BREAKUP_BASELINE_HEADROOM_CYCLES = 2_849;
const ENEMY_BREAKUP_TARGET_DELTA_CYCLES = 128;
const ENEMY_BREAKUP_HARD_DELTA_CYCLES = 224;
const ENEMY_BREAKUP_TARGET_GATE_CYCLES = 32_847;
const ENEMY_BREAKUP_HARD_GATE_CYCLES = 32_943;
const ENEMY_BREAKUP_MINIMUM_HEADROOM_CYCLES = 2_600;
const WEAPON_PICKUP_BASELINE_WALL_CYCLES = 32_869;
const WEAPON_PICKUP_BASELINE_HEADROOM_CYCLES = 2_699;
const WEAPON_PICKUP_TARGET_DELTA_CYCLES = 128;
const WEAPON_PICKUP_HARD_DELTA_CYCLES = 256;
const WEAPON_PICKUP_TARGET_GATE_CYCLES = 32_997;
const WEAPON_PICKUP_HARD_GATE_CYCLES = 33_125;
const WEAPON_PICKUP_MINIMUM_HEADROOM_CYCLES = 2_400;
const RAPID_ONLY_ACCEPTED_WALL_CYCLES = 32_956;
const RAPID_ONLY_ACCEPTED_HEADROOM_CYCLES = 2_612;
const SPREAD_SHOT_BASELINE_WALL_CYCLES = 32_040;
const SPREAD_SHOT_BASELINE_HEADROOM_CYCLES = 3_528;
const SPREAD_SHOT_TARGET_DELTA_CYCLES = 200;
const SPREAD_SHOT_HARD_DELTA_CYCLES = 500;
const SPREAD_SHOT_TARGET_GATE_CYCLES = 32_240;
const SPREAD_SHOT_HARD_GATE_CYCLES = 32_540;
const SPREAD_SHOT_MINIMUM_HEADROOM_CYCLES = 3_028;
const SHIELD_BASELINE_WALL_CYCLES = 33_020;
const SHIELD_READY_MAXIMUM_WALL_CYCLES = 32_068;
const SHIELD_READY_MINIMUM_HEADROOM_CYCLES = 3_500;
const SHIELD_READY_REQUIRED_RECOVERY_CYCLES = 952;
const SHIELD_BOOSTER_BASELINE_WALL_CYCLES = 32_072;
const SHIELD_BOOSTER_BASELINE_HEADROOM_CYCLES = 3_496;
const SHIELD_BOOSTER_TARGET_DELTA_CYCLES = 350;
const SHIELD_BOOSTER_HARD_DELTA_CYCLES = 496;
const SHIELD_BOOSTER_TARGET_GATE_CYCLES = 32_422;
const SHIELD_BOOSTER_HARD_GATE_CYCLES = 32_568;
const SHIELD_BOOSTER_MINIMUM_HEADROOM_CYCLES = 3_000;
const EXPECTED_ATARI800_VERSION = "7.1.2";
const OFFICIAL_SOURCE_ARCHIVE_SHA256 =
  "9602badfd7c45551cb5c4cc77f862af377c43a07caaa0bfc77ac87f9179673e3";

const baselineSessions = [
  { difficulty: 2, policy: "neutral", fireDelay: 0, frames: 760 },
  ...Array.from({ length: 8 }, (_, fireDelay) => ({
    difficulty: 2,
    policy: (fireDelay & 1) !== 0 && fireDelay !== 5 ? "evasive" : "sweep",
    fireDelay,
    frames: 920,
  })),
  { difficulty: 1, policy: "evasive", fireDelay: 3, frames: 920 },
].map((session) => ({
  ...session,
  id: `${session.difficulty}-${session.policy}-fire${session.fireDelay}`,
  kind: "baseline-9040",
}));

const targetedSessions = [{
  id: "targeted-2-sweep-fire4",
  difficulty: 2,
  policy: "sweep",
  fireDelay: 4,
  frames: 920,
  kind: "targeted-heavy-coincidence",
}];

const cadenceSessions = [0, 1, 2].map((difficulty) => ({
  id: `cadence-${difficulty}-sweep-nofire`,
  difficulty,
  policy: "sweep",
  fireDelay: 4_000,
  frames: 400,
  kind: "parallax-cadence",
}));

const fighterFlashSessions = [{
  id: "flash-2-neutral-nofire",
  difficulty: 2,
  policy: "neutral",
  fireDelay: 4_000,
  frames: 1_600,
  kind: "fighter-flash-coverage",
}];

const debrisEffectsSessions = [{
  id: "debris-effects-2-sweep-fire4",
  difficulty: 2,
  policy: "sweep",
  fireDelay: 4,
  frames: 5_000,
  kind: "debris-effects-coverage",
}];

const weaponPickupSessions = [{
  id: "weapon-pickup-2-hunt-fire4",
  difficulty: 2,
  policy: "hunt",
  fireDelay: 4,
  frames: 4_000,
  kind: "weapon-pickup-coverage",
}];

const weaponPickupTraversalSessions = [{
  id: "weapon-pickup-traversal-2-observe-fire4",
  difficulty: 2,
  policy: "pickup-observe",
  fireDelay: 4,
  frames: 1_800,
  kind: "weapon-pickup-traversal",
}];

const weaponPickupContactSessions = [{
  id: "weapon-pickup-contact-2-hunt-fire4",
  difficulty: 2,
  policy: "pickup-contact",
  fireDelay: 4,
  frames: 1_300,
  kind: "weapon-pickup-contact",
}, {
  id: "weapon-pickup-overlap-2-hunt-fire4",
  difficulty: 2,
  policy: "pickup-overlap",
  fireDelay: 4,
  frames: 1_300,
  kind: "weapon-pickup-overlap",
}];

const capitalMuzzleSessions = [{
  id: "capital-muzzle-ring-2-sweep-fire4",
  difficulty: 2,
  policy: "broadside-proof",
  fireDelay: 4,
  frames: 6_000,
  kind: "capital-muzzle-lifecycle",
}];

const broadsideTransientSessions = [
  ["XEX", 1, "neutral"],
  ["XEX", 2, "broadside-proof"],
  ["ATR", 1, "broadside-sides"],
  ["ATR", 2, "broadside-proof"],
].map(([medium, difficulty, policy]) => ({
  id: `broadside-transient-${medium.toLowerCase()}-${difficulty}-${policy}`,
  medium,
  difficulty,
  policy,
  fireDelay: 40_000,
  frames: 13_000,
  kind: "broadside-transient-lifecycle",
}));

const provisionalCapitalSessions = ["XEX", "ATR"].flatMap((medium) =>
  [0, 1, 2].map((difficulty) => ({
    id: `provisional-capital-${medium.toLowerCase()}-${difficulty}-cold-sweep-fire4`,
    medium,
    difficulty,
    policy: "sweep",
    fireDelay: 4,
    frames: 1_600,
    kind: "provisional-capital-cold",
  })));

const capitalContactSessions = [0, 1].map((owner) => ({
  id: `capital-contact-${owner === 0 ? "allied" : "hostile"}-medium`,
  difficulty: 1,
  policy: owner === 0 ? "capital-contact-allied" : "capital-contact-hostile",
  fireDelay: 4_000,
  frames: owner === 0 ? 560 : 360,
  kind: "capital-projectile-contact",
  contactOwner: owner,
}));

const capitalPlayerGeometrySessions = [["XEX", 1], ["ATR", 2]].flatMap(([medium, difficulty]) =>
  [0, 1].flatMap((owner) => [
    ["top", 0, true], ["middle", 1, true], ["bottom", 2, true],
    ["near", 3, false],
  ].map(([contactMode, contactModeId, expectedHit]) => ({
    id: `capital-player-${medium.toLowerCase()}-${difficulty}-${owner === 0 ? "allied" : "hostile"}-${contactMode}`,
    medium,
    difficulty,
    policy: owner === 0 ? "capital-contact-allied" : "capital-contact-hostile",
    fireDelay: 4_000,
    frames: owner === 0 ? 600 : 450,
    kind: "capital-player-geometry",
    contactOwner: owner,
    contactMode,
    contactModeId,
    expectedHit,
  }))));

const directorCompletionSessions = [0, 1, 2].map((difficulty) => ({
  id: `director-complete-${difficulty}-natural-sweep-fire0`,
  difficulty,
  policy: "sweep",
  fireDelay: 0,
  frames: 10_500,
  kind: "director-level-complete",
}));

const memoryIntegritySessions = ["XEX", "ATR"].flatMap((medium) =>
  ["evasive", "hunt"].map((policy) => ({
    id: `memory-integrity-${medium.toLowerCase()}-2-${policy}-fire4`,
    medium,
    difficulty: 2,
    policy,
    fireDelay: 4,
    frames: 4_000,
    kind: "memory-integrity-160s",
    pauseTest: policy === "hunt",
  })));

const pickupFenceSessions = [["XEX", 2], ["ATR", 2], ["XEX", 1]].map(([medium, difficulty]) => ({
  id: `pickup-fence-${medium.toLowerCase()}-${difficulty}-hunt`,
  medium, difficulty, policy: "hunt", fireDelay: 4, frames: 8_000,
  kind: "pickup-fence-cadence", pauseTest: true,
}));

const engineDiagnosticSessions = ["XEX", "ATR"].flatMap((medium) =>
  [0xa5, 0x5a].flatMap((coldFill) => [0, 1, 2].flatMap((difficulty) =>
    [["immediate", 0], ["delayed", 800]].map(([startMode, frontendDelay]) => ({
      id: `engine-${medium.toLowerCase()}-${coldFill.toString(16)}-${difficulty}-${startMode}`,
      medium,
      coldFill,
      difficulty,
      policy: "neutral",
      fireDelay: 4_000,
      frames: 150,
      kind: "engine-first-150",
      frontendDelay,
    })))));

const engineRestartSessions = ["XEX", "ATR"].map((medium) => ({
  id: `engine-restart-${medium.toLowerCase()}-a5`,
  medium,
  coldFill: 0xa5,
  difficulty: 2,
  policy: "restart",
  fireDelay: 4_000,
  frames: 3_200,
  kind: "engine-restart-after-game-over",
  engineScreenshotGeneration: 2,
}));

const lowerPlayfieldSessions = [{
  id: "lower-playfield-xex-hard",
  medium: "XEX",
  difficulty: 2,
  policy: "vertical-boundary",
  fireDelay: 4_000,
  frames: 420,
  kind: "lower-playfield-boundary",
}, {
  id: "lower-playfield-hostile-contact-xex-hard",
  medium: "XEX",
  difficulty: 2,
  policy: "lower-contact-hostile",
  fireDelay: 4_000,
  frames: 1_200,
  kind: "lower-playfield-contact",
  contactOwner: 1,
}];

const traceLabels = {
  DFTRACE_PC_ACTIVE: "main_loop_option_poll",
  DFTRACE_PC_END: "main_loop",
  DFTRACE_PC_FRONTEND_POLL: "frontend_input_poll",
  DFTRACE_PC_DLI: "gameplay_dli",
  DFTRACE_PC_WORLD: "advance_starfield_layers",
  DFTRACE_PC_NEAR: "scroll_world_columns",
  DFTRACE_PC_FAR_ERASE: "erase_far_star_overlays",
  DFTRACE_PC_FAR_STEP: "advance_far_stars",
  DFTRACE_PC_HULL: "scroll_hull_columns",
  DFTRACE_PC_BROADSIDE: "update_broadside",
  DFTRACE_PC_FIGHTER_EXPLOSION: "render_shared_fighter_explosions",
  DFTRACE_PC_CAPITAL_EXPLOSION: "render_capital_explosions",
  DFTRACE_PC_MUSIC_TICK: "music_tick_gameplay",
  DFTRACE_PC_ENTITY_SPAWN: "entity_spawn_debris",
  DFTRACE_PC_ENTITY_CONTACT: "entity_damage_applied",
  DFTRACE_PC_ENTITY_DESPAWN: "entity_despawn_debris",
  DFTRACE_PC_ENTITY_SHOT: "entity_debris_shot",
  DFTRACE_PC_EFFECT_SPAWN: "spawn_debris_destruction_effects",
  DFTRACE_PC_EFFECT_ERASE: "erase_transient_effect_overlays",
  DFTRACE_PC_EFFECT_UPDATE: "update_transient_effects",
  DFTRACE_PC_EFFECT_RENDER: "render_transient_effect_overlays",
  DFTRACE_PC_INTERCEPTOR_BREAKUP_SPAWN: "materialize_interceptor_breakup_effects",
  DFTRACE_PC_PICKUP_QUALIFIED_KILL: "weapon_pickup_record_qualified_kill",
  DFTRACE_PC_PICKUP_COLLECT: "weapon_pickup_collect",
  DFTRACE_PC_ENTITY_ERASE: "erase_weapon_pickup_overlay_restore",
  DFTRACE_PC_AFTER_ENTITY_ERASE: "weapon_pickup_erase_done",
  DFTRACE_PC_ENTITY_DRAW: "render_weapon_pickup_overlay",
  DFTRACE_PC_PLAYER_ERASE: "erase_player",
  DFTRACE_PC_PLAYER_DRAW: "draw_player",
  DFTRACE_PC_ENGINE_UPDATE: "update_engine_animation",
  DFTRACE_PC_ENGINE_COPY: "copy_engine_animation_phase",
  DFTRACE_PC_CAPITAL_COLLISION: "capital_shell_collision_flags",
  DFTRACE_PC_CAPITAL_PLAYER_DAMAGE: "apply_broadside_player_damage",
  DFTRACE_PC_BROAD_ERASE_BEGIN: "broadside_erase_begin",
  DFTRACE_PC_BROAD_ERASE_RESTORED: "broadside_erase_cells_restored",
  DFTRACE_PC_BROAD_ERASE_END: "broadside_erase_end",
  DFTRACE_PC_BROAD_DRAW_BEGIN: "capital_shell_draw_begin",
  DFTRACE_PC_BROAD_BACKING_CAPTURED: "capital_shell_backing_captured",
  DFTRACE_PC_BROAD_DRAW_END: "capital_shell_draw_end",
  DFTRACE_PC_BROAD_IMPACT: "begin_broadside_impact",
  DFTRACE_PC_GAMEPLAY_INIT: "start_gameplay",
  DFTRACE_PC_ROTATE_START: "rotate_playfield_rows",
  DFTRACE_PC_ROTATE_END: "rotate_playfield_table_shift",
  DFTRACE_DLI_PHASE: "loader_dli_phase",
  DFTRACE_PLAYER_X: "player_x",
  DFTRACE_PLAYER_Y: "player_y",
  DFTRACE_PROJECTILE_ACTIVE: "FIGHTER_PROJECTILE_ACTIVE",
  DFTRACE_PROJECTILE_RENDERED: "FIGHTER_PROJECTILE_RENDERED",
  DFTRACE_PROJECTILE_SCREEN_LO: "FIGHTER_PROJECTILE_SCREEN_LO",
  DFTRACE_PROJECTILE_SCREEN_HI: "FIGHTER_PROJECTILE_SCREEN_HI",
  DFTRACE_PROJECTILE_BACKING_TOP: "FIGHTER_PROJECTILE_BACKUP_TOP",
  DFTRACE_BROAD_STATE: "BROAD_STATE",
  DFTRACE_FAR_ACTIVE: "STAR_FAR_ACTIVE",
  DFTRACE_ENEMY_ACTIVE: "ENEMY_ACTIVE",
  DFTRACE_ENEMY_X: "enemy_x",
  DFTRACE_FIGHTER_EXPLOSION_TIMER: "FIGHTER_EXPLOSION_TIMER",
  DFTRACE_CAPITAL_EXPLOSION_TIMER: "CAPITAL_EXPLOSION_TIMER",
  DFTRACE_MUSIC_ACTIVE: "MUSIC_ACTIVE",
  DFTRACE_FIRE_TIMER: "fire_timer",
  DFTRACE_HIT_TIMER: "hit_timer",
  DFTRACE_CAPITAL_SOUND_TIMER: "CAPITAL_EXPLOSION_SOUND_TIMER",
  DFTRACE_SOUND_ENABLED: "sound_enabled",
  DFTRACE_PLAYER_LIFECYCLE: "PLAYER_LIFECYCLE",
  DFTRACE_SECTOR_STATE: "CAPITAL_SECTOR_STATE",
  DFTRACE_GAME_STATE: "game_state",
  DFTRACE_FRONTEND_SELECTION: "frontend_selection",
  DFTRACE_FRONTEND_INPUT_ARMED: "frontend_input_armed",
  DFTRACE_DIFFICULTY_SETTING: "DIFFICULTY_SETTING",
  DFTRACE_GAMEPLAY_FRAME: "frame_counter",
  DFTRACE_MUZZLE_SCREEN_HI: "MUZZLE_SCREEN_HI",
  DFTRACE_MUZZLE_SCREEN_LO: "MUZZLE_SCREEN_LO",
  DFTRACE_MUZZLE_ROW_DOMAIN: "MUZZLE_ROW_DOMAIN",
  DFTRACE_MUZZLE_VISIBLE_ROW: "MUZZLE_VISIBLE_ROW",
  DFTRACE_BROAD_TURRET: "BROAD_TURRET",
  DFTRACE_BROAD_ROW_LO: "BROAD_ROW_LO",
  DFTRACE_BROAD_ROW_HI: "BROAD_ROW_HI",
  DFTRACE_BROAD_FLASH_TIMER: "BROAD_FLASH_TIMER",
  DFTRACE_PLAYFIELD_BROAD_ROW: "PLAYFIELD_BROAD_ROW",
  DFTRACE_BROAD_RASTER_TOP: "BROAD_RASTER_TOP",
  DFTRACE_BROAD_TURRET_FIRED: "BROAD_TURRET_FIRED",
  DFTRACE_CORRIDOR_PHASE: "corridor_phase",
  DFTRACE_ENTITY_ACTIVE_COUNT: "ENTITY_ACTIVE_COUNT",
  DFTRACE_ENTITY_X: "ENTITY_X",
  DFTRACE_ENTITY_Y: "ENTITY_Y",
  DFTRACE_ENTITY_VX: "ENTITY_VX",
  DFTRACE_ENTITY_VY: "ENTITY_VY",
  DFTRACE_ENTITY_MOVE_ACCUMULATOR: "ENTITY_MOVE_ACCUMULATOR",
  DFTRACE_ENTITY_VERTICAL_ACCUMULATOR: "ENTITY_TIMER",
  DFTRACE_ENTITY_RENDER_ID: "ENTITY_RENDER_ID",
  DFTRACE_ENTITY_ACTIVE_MASK: "ENTITY_ACTIVE_MASK",
  DFTRACE_ENTITY_STATE: "ENTITY_STATE",
  DFTRACE_ENTITY_HP: "ENTITY_HP",
  DFTRACE_ENTITY_TIMER: "ENTITY_TIMER",
  DFTRACE_ENTITY_OWNER: "ENTITY_OWNER",
  DFTRACE_ENTITY_DRAWN_MASK: "ENTITY_DRAWN_MASK",
  DFTRACE_ENTITY_SCREEN_LO: "ENTITY_SCREEN_LO",
  DFTRACE_ENTITY_SCREEN_HI: "ENTITY_SCREEN_HI",
  DFTRACE_ENTITY_BACKING0: "ENTITY_BACKING0",
  DFTRACE_ENTITY_BACKING1: "ENTITY_BACKING1",
  DFTRACE_ENTITY_BACKING2: "ENTITY_BACKING2",
  DFTRACE_ENTITY_BACKING3: "ENTITY_BACKING3",
  DFTRACE_PLAYFIELD_ROW_LO: "PLAYFIELD_ROW_LO",
  DFTRACE_PLAYFIELD_ROW_HI: "PLAYFIELD_ROW_HI",
  DFTRACE_SCORE_LO: "score_bcd_lo",
  DFTRACE_SCORE_HI: "score_bcd_hi",
  DFTRACE_EFFECT_ACTIVE_MASK: "EFFECT_ACTIVE_MASK",
  DFTRACE_EFFECT_ACTIVE_COUNT: "EFFECT_ACTIVE_COUNT",
  DFTRACE_EFFECT_RENDERED_MASK: "EFFECT_RENDERED_MASK",
  DFTRACE_CORRIDOR_PHASE: "corridor_phase",
  DFTRACE_RING_FLAGS: "PLAYFIELD_RING_FLAGS",
  DFTRACE_ACTIVE_DLIST_LO: "PLAYFIELD_ACTIVE_DLIST_LO",
  DFTRACE_NEXT_DLIST_LO: "PLAYFIELD_NEXT_DLIST_LO",
  DFTRACE_PC_DLI_END: "profile_gameplay_dli_end",
  DFTRACE_PC_DLI_HUD_END: "profile_gameplay_dli_hud_end",
  DFTRACE_PC_COMPOSE_START: "compose_player_fighter_projectile_glyph",
  DFTRACE_PC_COMPOSE_END: "profile_projectile_compose_end",
  DFTRACE_PC_POINTER_START: "initialize_projectile_screen_pointer",
  DFTRACE_PC_POINTER_END: "profile_projectile_pointer_end",
  DFTRACE_PC_ERASE_SLOT: "erase_fighter_projectile_slot",
  DFTRACE_PC_INTERCEPTOR_UPDATE_START: "profile_interceptor_projectile_update_begin",
  DFTRACE_PC_RENDER_SLOT: "render_fighter_projectile_slot",
  DFTRACE_PC_ENTITY_ERASE_START: "profile_entity_erase_begin",
  DFTRACE_PC_EFFECT_UPDATE_END: "profile_after_transient_effect_update",
  DFTRACE_PC_PICKUP_UPDATE_END: "profile_after_pickup_booster_update",
};

const traceProfileLabels = [
  "profile_after_entity_erase",
  "profile_after_projectile_erase",
  "profile_after_capsule",
  "profile_after_frame_visuals",
  "profile_after_player",
  "profile_after_enemy",
  "profile_after_fighter_projectile_update",
  "profile_after_player_enemy_collision",
  "profile_after_broadside_update",
  "profile_after_enemy_damage_resolution",
  "profile_after_collisions",
  "profile_after_player_fighter_weapon",
  "profile_after_interceptor_weapon",
  "profile_after_world",
  "profile_after_hull_contact",
  "profile_after_entity_update",
  "profile_after_effect_visuals",
  "profile_after_broadside_render",
  "profile_after_projectile_render",
  "profile_after_entity_render",
  "profile_after_sector",
  "profile_after_audio",
];
for (let index = 0; index < traceProfileLabels.length; index += 1) {
  traceLabels[`DFTRACE_PC_PROFILE${index}`] = traceProfileLabels[index];
}

const bootTraceLabels = {
  DFBOOT_PC_START: "start",
  DFBOOT_PC_LOADER: "show_loader",
  DFBOOT_PC_MENU: "enter_main_menu",
  DFBOOT_PC_FRONTEND: "frontend_input_poll",
  DFBOOT_PC_GAMEPLAY: "start_gameplay",
  DFBOOT_PC_MAIN: "main_loop",
  DFBOOT_LOADER_TIMER: "loader_frame_count",
  DFBOOT_GAME_STATE: "game_state",
  DFBOOT_MAIN_MENU_DLIST: "main_menu_display_list",
  DFBOOT_FRONTEND_DLIST_END: "frontend_display_lists_end",
};

const numericCsvFields = new Set([
  "frame", "start_clock", "end_clock", "next_start_clock", "wall_cycles",
  "start_host_frame", "end_host_frame", "next_start_host_frame", "start_scanline",
  "start_cycle", "end_scanline", "end_cycle", "host_vbi_boundaries",
  "extra_vbi_boundaries", "missed_frames", "dli_nmis", "dma_ctl", "nmi_en",
  "projectiles", "broadside", "far_rendered", "live_interceptor", "fighter_explosion",
  "capital_explosion", "music_active", "fire_sfx", "hit_sfx", "capital_sfx",
  "sound_enabled", "player_lifecycle", "sector_state", "gameplay_frame",
  "difficulty", "active_muzzles", "entity_active", "entity_x", "entity_y",
  "entity_vx", "entity_move_accumulator", "entity_vertical_accumulator",
  "entity_render_id", "events",
  "colbk", "colpm0", "colpm1", "colpm2", "colpm3", "colpf0", "colpf1",
  "colpf2", "colpf3", "player_fighter_explosion_timer", "enemy_explosion_timer",
  "effect_active_mask", "effect_active_count", "effect_rendered_mask",
  "entity_active_mask", "pickup_state", "pickup_booster_state", "pickup_counter", "pickup_x", "pickup_y",
  "pickup_timer_lo", "pickup_timer_hi", "pickup_animation", "pickup_render_id",
  "pickup_drawn_mask", "score_lo", "score_hi", "rapid_projectiles",
  "player_fighter_projectiles",
  "player_x", "player_y", "prior", "player_erase_calls", "player_draw_calls",
  "player_erase_scanline", "player_draw_scanline",
  "rapid_projectile_slot", "rapid_projectile_address", "rapid_projectile_screen_code",
  "rapid_projectile_backing", "dli_sequence_violations",
  "maximum_dlis_per_host_frame", "pause_test_completed", "pause_timer_before",
  "pause_timer_after", "pause_engine_timer_before", "pause_engine_timer_after",
  "pause_engine_phase_before", "pause_engine_phase_after", "pause_host_frames",
]);
for (const slot of [0, 1]) for (const field of ["domain", "row", "pointer", "cell"])
  numericCsvFields.add(`muzzle${slot}_${field}`);
for (const field of ["muzzle_code_cells", "muzzle_illegal_cells", "muzzle_pointer_errors",
  "muzzle_divider_allied", "muzzle_divider_enemy", "broad_pointer_errors",
  "broad_screen_orphan_cells", "broad_screen_first_address", "broad_screen_first_code",
  "broad_screen_missing_cells",
  "broad_pmg_orphan_rows0", "broad_pmg_orphan_rows1", "broad_pmg_orphan_rows2",
  "broad_pmg_missing_rows0", "broad_pmg_missing_rows1", "broad_pmg_missing_rows2",
  "broad_pmg_first_slot", "broad_pmg_first_row", "broad_pmg_first_value",
  "broad_pmg_first_writer_pc", "broad_pre_rotate_screen_transients"])
  numericCsvFields.add(field);
for (const slot of [0, 1, 2]) {
  for (const field of ["state", "flash", "turret", "row", "pointer", "owner", "x", "y",
    "collision", "raster_x", "raster_row"])
    numericCsvFields.add(`broad${slot}_${field}`);
}
for (const field of ["player_health", "player_lives", "player_invulnerability",
  "player_damage_cooldown", "player_damage_applied", "capital_collision_calls",
  "capital_player_damage_calls", "player_lifecycle_after", "player_x_after",
  "player_y_after", "player_health_after", "player_lives_after",
  "player_invulnerability_after", "player_damage_cooldown_after"])
  numericCsvFields.add(field);
for (const name of [
  "pickup_prev_x", "pickup_prev_y", "pickup_prev_render_row",
  "pickup_prev_render_phase", "pickup_render_row", "pickup_render_phase",
  "pickup_vscroll", "pickup_a2_head", "pickup_erase_calls", "pickup_draw_calls",
  "pickup_erase_scanline", "pickup_erase_cycle", "pickup_draw_scanline",
  "pickup_draw_cycle",
  "pickup_glyph_cells_before", "pickup_glyph_cells_after",
  "pickup_footprints_before", "pickup_footprints_after",
  "pickup_first_overwrite_pc", "pickup_first_overwrite_address",
  "pickup_first_overwrite_value", "pickup_first_overwrite_scanline",
  "engine_timer", "engine_phase", "corridor_phase", "ring_flags",
  "engine_vscroll", "engine_a2_head", "engine_allied_cells",
  "engine_enemy_cells", "capital_visible_allied_cells", "capital_visible_enemy_cells",
  "engine_copy_calls", "engine_copy_scanline",
  "engine_copy_cycle", "engine_first_write_pc", "engine_first_write_address",
  "engine_first_write_old", "engine_first_write_new",
  "engine_first_write_scanline", "engine_first_write_cycle",
  "engine_charset_hash",
  "engine_displayed_dlist_lo", "engine_published_dlist_lo",
  "engine_active_dlist_lo", "engine_next_dlist_lo", "engine_row0_address",
  "engine_displayed_row0_address", "engine_active_row0_address",
  "engine_first_dlist_write_pc", "engine_first_dlist_write_address",
  "engine_first_dlist_write_old", "engine_first_dlist_write_new",
  "engine_first_dlist_write_scanline", "engine_first_dlist_write_cycle",
  "engine_first_recycled_write_pc", "engine_first_recycled_write_address",
  "engine_first_recycled_write_old", "engine_first_recycled_write_new",
  "engine_first_recycled_write_scanline", "engine_first_recycled_write_cycle",
  "engine_playfield_select_calls", "engine_playfield_select_scanline",
  "engine_playfield_select_cycle", "engine_playfield_select_dlist",
  "engine_playfield_select_active_lo", "gameplay_generation",
]) numericCsvFields.add(name);
for (const prefix of ["engine_divider", "engine_recycled"]) {
  for (let index = 0; index < 8; ++index) numericCsvFields.add(`${prefix}${index}`);
}
for (let index = 0; index < traceProfileLabels.length; index += 1) {
  numericCsvFields.add(`profile_clock${index}`);
}
for (let index = 0; index < 2; index += 1) {
  numericCsvFields.add(`profile_dli${index}_start`);
  numericCsvFields.add(`profile_dli${index}_end`);
  numericCsvFields.add(`profile_dli${index}_segment`);
}
for (const name of ["profile_compose_calls", "profile_compose_cycles",
  "profile_pointer_calls", "profile_pointer_cycles", "profile_erase_player_fighter_start",
  "profile_interceptor_update_start", "profile_interceptor_render_start",
  "profile_entity_erase_start", "profile_effect_update_end",
  "profile_pickup_update_end", "profile_pickup_render_start",
  "profile_effect_render_start"]) numericCsvFields.add(name);

function nativeCapitalPlayerAabb(row, slot, physicalEvent) {
  invariant(physicalEvent?.player_physical?.valid === 1,
    "Native collision oracle is missing visible P0/P3 bytes");
  const physicalSlot = physicalEvent.slots.find((item) => item.slot === slot)?.physical;
  invariant(physicalSlot?.valid === 1,
    "Native collision oracle is missing the physical 126/127 screen footprint");
  invariant(physicalSlot.glyph_rows[0] === 1 && physicalSlot.glyph_rows[1] === 6,
    "Native collision oracle found unexpected occupied bolt glyph rows");
  invariant(physicalSlot.cache_top === physicalSlot.raster[2],
    "Production bolt raster cache disagrees with physical LMS/screen/glyph bounds");
  const [playerLeft, playerRight, playerTop, playerBottom] =
    physicalEvent.player_physical.raster;
  const [previous, previousRight, boltTop, boltBottom] = physicalSlot.raster;
  const current = row[`broad${slot}_raster_x`];
  const currentRight = current + 7;
  const player = { left: playerLeft, right: playerRight, top: playerTop, bottom: playerBottom };
  const bolt = {
    previous_left: previous,
    previous_right: previousRight,
    current_left: current,
    current_right: currentRight,
    sweep_left: Math.min(previous, current),
    sweep_right: Math.max(previousRight, currentRight),
    top: boltTop,
    bottom: boltBottom,
  };
  const overlapLeft = Math.max(player.left, bolt.sweep_left);
  const overlapRight = Math.min(player.right, bolt.sweep_right);
  const overlapTop = Math.max(player.top, bolt.top);
  const overlapBottom = Math.min(player.bottom, bolt.bottom);
  const hit = overlapLeft <= overlapRight && overlapTop <= overlapBottom;
  return {
    rule: "inclusive swept-AABB",
    oracle: {
      player: "P0/P3 bytes + HPOSP0/HPOSP3 + SIZEP0/SIZEP3 + capture DMA origin",
      bolt: "cached physical row pointer + displayed LMS + screen codes + glyph rows",
    },
    player,
    bolt,
    overlap: hit ? {
      left: overlapLeft, right: overlapRight, top: overlapTop, bottom: overlapBottom,
    } : null,
    hit,
  };
}
for (const prefix of [
  "pickup_old_address", "pickup_old_backing", "pickup_old_before_erase",
  "pickup_old_after_erase", "pickup_new_address", "pickup_new_backing",
  "pickup_new_after_draw",
]) {
  for (let index = 0; index < 6; ++index) numericCsvFields.add(`${prefix}${index}`);
}
let cpuReferenceByFrame = new Map();

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC32_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = CRC32_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return chunk;
}

function decodeAtari800Screenshot(bytes) {
  invariant(bytes.subarray(0, 8).equals(PNG_SIGNATURE), "Atari800 screenshot is not PNG");
  let offset = 8;
  let header;
  let palette;
  const data = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") header = chunk;
    else if (type === "PLTE") palette = chunk;
    else if (type === "IDAT") data.push(chunk);
    offset += length + 12;
    if (type === "IEND") break;
  }
  invariant(header?.[8] === 8 && header?.[9] === 3 && header?.[12] === 0 && palette,
    "Atari800 screenshot must be non-interlaced eight-bit indexed PNG");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const raw = zlib.inflateSync(Buffer.concat(data));
  invariant(raw.length === (width + 1) * height, "Atari800 screenshot has invalid rows");
  const indices = Buffer.alloc(width * height);
  const paeth = (left, above, upperLeft) => {
    const prediction = left + above - upperLeft;
    const dl = Math.abs(prediction - left);
    const da = Math.abs(prediction - above);
    const du = Math.abs(prediction - upperLeft);
    return dl <= da && dl <= du ? left : da <= du ? above : upperLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (width + 1)];
    for (let x = 0; x < width; x += 1) {
      const encoded = raw[y * (width + 1) + x + 1];
      const left = x > 0 ? indices[y * width + x - 1] : 0;
      const above = y > 0 ? indices[(y - 1) * width + x] : 0;
      const upperLeft = x > 0 && y > 0 ? indices[(y - 1) * width + x - 1] : 0;
      const predictor = [0, left, above, Math.floor((left + above) / 2),
        paeth(left, above, upperLeft)][filter];
      invariant(predictor !== undefined, `Unsupported Atari800 PNG filter ${filter}`);
      indices[y * width + x] = (encoded + predictor) & 0xff;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let index = 0; index < indices.length; index += 1) {
    const paletteOffset = indices[index] * 3;
    rgb[index * 3] = palette[paletteOffset];
    rgb[index * 3 + 1] = palette[paletteOffset + 1];
    rgb[index * 3 + 2] = palette[paletteOffset + 2];
  }
  return { width, height, rgb };
}

function encodeRgbPng(rgb, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const stride = width * 3;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    rgb.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeScreenshotContact(paths, outputPath, columns) {
  const frames = paths.map((framePath) =>
    decodeAtari800Screenshot(fs.readFileSync(framePath)));
  invariant(frames.length > 0 && frames.every(({ width, height }) =>
    width === frames[0].width && height === frames[0].height),
  "Contact sheet screenshots must share exact dimensions");
  const rows = Math.ceil(frames.length / columns);
  const width = frames[0].width * columns;
  const height = frames[0].height * rows;
  const rgb = Buffer.alloc(width * height * 3);
  frames.forEach((frame, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    for (let y = 0; y < frame.height; y += 1) {
      frame.rgb.copy(rgb,
        ((row * frame.height + y) * width + column * frame.width) * 3,
        y * frame.width * 3, (y + 1) * frame.width * 3);
    }
  });
  const png = encodeRgbPng(rgb, width, height);
  fs.writeFileSync(outputPath, png);
  return {
    path: path.relative(rootDirectory, outputPath),
    frames: frames.length,
    columns,
    width,
    height,
    bytes: png.length,
    sha256: sha256(png),
  };
}

function drawHposAabb(frame, bounds, colour) {
  const left = 8 + (bounds.left - 48) * 2;
  const right = 8 + (bounds.right - 48 + 1) * 2 - 1;
  const top = bounds.top;
  const bottom = bounds.bottom;
  const setPixel = (x, y) => {
    if (x < 0 || x >= frame.width || y < 0 || y >= frame.height) return;
    const offset = (y * frame.width + x) * 3;
    frame.rgb.set(colour, offset);
  };
  for (let x = left; x <= right; x += 1) {
    setPixel(x, top);
    setPixel(x, bottom);
  }
  for (let y = top; y <= bottom; y += 1) {
    setPixel(left, y);
    setPixel(right, y);
  }
}

function writeHitboxContact(paths, geometries, outputPath) {
  invariant(paths.length === geometries.length && paths.length === 3,
    "Hitbox evidence must contain before/contact/after frames");
  const frames = paths.map((framePath) =>
    decodeAtari800Screenshot(fs.readFileSync(framePath)));
  for (let index = 0; index < frames.length; index += 1) {
    if (geometries[index] === null) continue;
    const { player, bolt } = geometries[index];
    drawHposAabb(frames[index], player, [0x00, 0xff, 0xff]);
    drawHposAabb(frames[index], {
      left: bolt.current_left, right: bolt.current_right,
      top: bolt.top, bottom: bolt.bottom,
    }, [0xff, 0xff, 0x00]);
    drawHposAabb(frames[index], {
      left: bolt.sweep_left, right: bolt.sweep_right,
      top: bolt.top, bottom: bolt.bottom,
    }, [0xff, 0x20, 0x20]);
  }
  const width = frames[0].width * frames.length;
  const height = frames[0].height;
  const rgb = Buffer.alloc(width * height * 3);
  frames.forEach((frame, index) => {
    for (let y = 0; y < height; y += 1) frame.rgb.copy(rgb,
      (y * width + index * frame.width) * 3,
      y * frame.width * 3, (y + 1) * frame.width * 3);
  });
  const png = encodeRgbPng(rgb, width, height);
  fs.writeFileSync(outputPath, png);
  return {
    path: path.relative(rootDirectory, outputPath),
    frames: ["before", "contact", "after"],
    legend: { player_16x15: "cyan", bolt_current_8x6: "yellow", bolt_sweep: "red" },
    overlay_asserted_against_physical_oracle: true,
    width, height, bytes: png.length, sha256: sha256(png),
  };
}

function rgbTemplate(image, left, top, width, height) {
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    image.rgb.copy(rgb, y * width * 3,
      ((top + y) * image.width + left) * 3,
      ((top + y) * image.width + left + width) * 3);
  }
  return { width, height, rgb };
}

function countRgb(image, [red, green, blue], { left, top, right, bottom }) {
  let count = 0;
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const offset = (y * image.width + x) * 3;
    if (image.rgb[offset] === red && image.rgb[offset + 1] === green &&
      image.rgb[offset + 2] === blue) count += 1;
  }
  return count;
}

function findRgbTemplate(image, template) {
  let anchor = 0;
  while (anchor < template.width * template.height &&
    template.rgb[anchor * 3] === 4 && template.rgb[anchor * 3 + 1] === 4 &&
    template.rgb[anchor * 3 + 2] === 4) anchor += 1;
  invariant(anchor < template.width * template.height, "Raster template is blank");
  const anchorX = anchor % template.width;
  const anchorY = Math.floor(anchor / template.width);
  const matches = [];
  for (let y = 0; y <= image.height - template.height; y += 1) {
    for (let x = 0; x <= image.width - template.width; x += 1) {
      const imageAnchor = ((y + anchorY) * image.width + x + anchorX) * 3;
      if (image.rgb[imageAnchor] !== template.rgb[anchor * 3] ||
        image.rgb[imageAnchor + 1] !== template.rgb[anchor * 3 + 1] ||
        image.rgb[imageAnchor + 2] !== template.rgb[anchor * 3 + 2]) continue;
      let equal = true;
      for (let row = 0; row < template.height && equal; row += 1) {
        const imageOffset = ((y + row) * image.width + x) * 3;
        const templateOffset = row * template.width * 3;
        equal = image.rgb.subarray(imageOffset, imageOffset + template.width * 3)
          .equals(template.rgb.subarray(templateOffset, templateOffset + template.width * 3));
      }
      if (equal) matches.push({ x, y });
    }
  }
  return matches;
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDirectory,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with status ${result.status}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
  return result;
}

function prepareAtari800(sourceDirectory) {
  const configurePath = path.join(sourceDirectory, "configure");
  const cpuPath = path.join(sourceDirectory, "src", "cpu.c");
  const destinationHeader = path.join(sourceDirectory, "src", "voidstrike65_trace.h");
  invariant(fs.existsSync(configurePath), `Atari800 configure is missing: ${configurePath}`);
  invariant(fs.existsSync(cpuPath), `Atari800 cpu.c is missing: ${cpuPath}`);
  const configureText = fs.readFileSync(path.join(sourceDirectory, "configure.ac"), "utf8");
  invariant(configureText.includes(`AC_INIT(Atari800, ${EXPECTED_ATARI800_VERSION},`),
    `Expected Atari800 ${EXPECTED_ATARI800_VERSION} source`);

  fs.copyFileSync(headerPath, destinationHeader);
  let cpuText = fs.readFileSync(cpuPath, "utf8");
  if (!cpuText.includes('#include "voidstrike65_trace.h"')) {
    const includeAnchor = "#endif /* ASAP */\n";
    invariant(cpuText.includes(includeAnchor), "Atari800 cpu.c include anchor changed");
    cpuText = cpuText.replace(includeAnchor,
      `${includeAnchor}\n#include "voidstrike65_trace.h"\n`);
  }
  if (cpuText.includes("DFTrace_Observe(GET_PC());"))
    cpuText = cpuText.replace("DFTrace_Observe(GET_PC());",
      "DFTrace_Observe(GET_PC(), X, Y);");
  if (cpuText.includes("DFTrace_Observe(GET_PC(), X);"))
    cpuText = cpuText.replace("DFTrace_Observe(GET_PC(), X);",
      "DFTrace_Observe(GET_PC(), X, Y);");
  if (!cpuText.includes("DFTrace_Observe(GET_PC(), X, Y);")) {
    const executeAnchor = "\t\tCPU_delayed_nmi = 0;\n";
    invariant(cpuText.includes(executeAnchor), "Atari800 CPU execution anchor changed");
    cpuText = cpuText.replace(executeAnchor,
      `${executeAnchor}\t\tDFTrace_Observe(GET_PC(), X, Y);\n`);
  }
  fs.writeFileSync(cpuPath, cpuText);

  if (!fs.existsSync(path.join(sourceDirectory, "Makefile"))) {
    run(configurePath, ["--disable-sdltest", "--disable-riodevice"], { cwd: sourceDirectory });
  }
  run("make", ["-j4"], { cwd: sourceDirectory });
}

function parseCsv(csvText, sessionDefinition) {
  const lines = csvText.trim().split(/\r?\n/);
  invariant(lines.length === sessionDefinition.frames + 1,
    `${sessionDefinition.id} emitted ${lines.length - 1}/${sessionDefinition.frames} frames`);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    invariant(values.length === headers.length,
      `${sessionDefinition.id} emitted a malformed CSV row`);
    const row = { trace_kind: sessionDefinition.kind };
    for (let index = 0; index < headers.length; index += 1) {
      const name = headers[index];
      row[name] = numericCsvFields.has(name) ? Number(values[index]) : values[index];
    }
    return row;
  });
}

function decodeEvents(bits) {
  return [
    [1 << 0, "world-copy"],
    [1 << 1, "far-erase"],
    [1 << 2, "hull-copy"],
    [1 << 3, "broadside-update"],
    [1 << 4, "fighter-explosion-render"],
    [1 << 5, "capital-explosion-render"],
    [1 << 6, "music-tick"],
    [1 << 7, "debris-spawn"],
    [1 << 8, "debris-contact"],
    [1 << 9, "debris-despawn"],
    [1 << 10, "near-copy"],
    [1 << 11, "far-step"],
    [1 << 12, "debris-shot"],
    [1 << 13, "debris-destruction-spawn"],
    [1 << 14, "effect-erase"],
    [1 << 15, "effect-update"],
    [1 << 16, "effect-render"],
    [1 << 17, "interceptor-breakup-spawn"],
    [1 << 18, "pickup-qualified-kill"],
    [1 << 19, "pickup-collect"],
    [1 << 20, "director-world-row"],
    [1 << 21, "director-request"],
    [1 << 22, "director-event"],
  ].filter(([mask]) => (bits & mask) !== 0).map(([, name]) => name);
}

function frameState(row, includeCpuReference = false) {
  const cpuSession = row.session.replace(/^targeted-/, "");
  const cpuReference = cpuReferenceByFrame.get(`${cpuSession}:${row.frame}`);
  return {
    trace_kind: row.trace_kind,
    session: row.session,
    frame: row.frame,
    gameplay_frame: row.gameplay_frame,
    difficulty: row.difficulty,
    wall_cycles: row.wall_cycles,
    physical_headroom: PAL_FRAME_CYCLES - row.wall_cycles,
    start: {
      clock: row.start_clock,
      host_frame: row.start_host_frame,
      scanline: row.start_scanline,
      cycle: row.start_cycle,
    },
    end: {
      clock: row.end_clock,
      host_frame: row.end_host_frame,
      scanline: row.end_scanline,
      cycle: row.end_cycle,
    },
    next_start: {
      clock: row.next_start_clock,
      host_frame: row.next_start_host_frame,
    },
    host_vbi_boundaries: row.host_vbi_boundaries,
    extra_vbi_boundaries: row.extra_vbi_boundaries,
    missed_frames: row.missed_frames,
    dli_nmis: row.dli_nmis,
    dma_ctl: row.dma_ctl,
    nmi_en: row.nmi_en,
    state: {
      projectiles: row.projectiles,
      broadside: row.broadside,
      far_rendered: row.far_rendered,
      active_muzzles: row.active_muzzles,
      entity_active: row.entity_active,
      entity_x: row.entity_x,
      entity_y: row.entity_y,
      entity_vx_signed: row.entity_vx < 0x80 ? row.entity_vx : row.entity_vx - 0x100,
      entity_move_accumulator: row.entity_move_accumulator,
      entity_vertical_accumulator: row.entity_vertical_accumulator,
      entity_render_id: row.entity_render_id,
      entity_active_mask: row.entity_active_mask,
      weapon_pickup: {
        state: row.pickup_state,
        booster_state: row.pickup_booster_state,
        qualified_kill_counter: row.pickup_counter,
        x: row.pickup_x,
        y: row.pickup_y,
        timer: row.pickup_timer_lo | row.pickup_timer_hi << 8,
        timer_low: row.pickup_timer_lo,
        timer_high: row.pickup_timer_hi,
        animation_frame: row.pickup_animation,
        render_id: row.pickup_render_id,
        drawn_mask: row.pickup_drawn_mask,
      },
      player_fighter_projectiles: row.player_fighter_projectiles,
      rapid_player_fighter_projectiles: row.rapid_projectiles,
      score_bcd: [row.score_hi, row.score_lo],
      effect_active_mask: row.effect_active_mask,
      effect_active_count: row.effect_active_count,
      effect_rendered_mask: row.effect_rendered_mask,
      live_interceptor: Boolean(row.live_interceptor),
      fighter_explosion: Boolean(row.fighter_explosion),
      capital_explosion: Boolean(row.capital_explosion),
      music_active: Boolean(row.music_active),
      fire_sfx: Boolean(row.fire_sfx),
      hit_sfx: Boolean(row.hit_sfx),
      capital_sfx: Boolean(row.capital_sfx),
      sound_enabled: Boolean(row.sound_enabled),
      player_lifecycle: row.player_lifecycle,
      sector_state: row.sector_state,
    },
    events: decodeEvents(row.events),
    cpu_dma_off_reference: includeCpuReference && cpuReference ? {
      main_loop_cycles: cpuReference.mainLoopCpuCycles,
      active_cycles: cpuReference.activeCpuCycles,
      inclusive_procedure_cycles: cpuReference.procedureCycles,
      note: "Procedure values are inclusive and may be nested; they must not be summed.",
    } : null,
  };
}

function maximumRow(rows, selector) {
  return rows.reduce((maximum, row) =>
    maximum === undefined || selector(row) > selector(maximum) ? row : maximum, undefined);
}

const profileSegmentNames = [
  "entity_effect_erase", "projectile_erase_backing", "capsule_resident_render",
  "frame_visual_ticks", "player_input_lifecycle", "enemy_update",
  "fighter_projectile_update_collision", "player_enemy_collision",
  "broadside_update", "enemy_damage_resolution", "collision_return",
  "player_fighter_weapon_control", "interceptor_weapon_control", "world_ring_playfield",
  "player_hull_contact", "entity_effect_update", "explosion_effect_visuals",
  "broadside_render", "projectile_render_backing", "entity_effect_render",
  "sector_completion", "music_sound", "main_loop_tail",
];

function profileCostBreakdown(row) {
  const boundaries = [row.start_clock,
    ...traceProfileLabels.map((unused, index) => row[`profile_clock${index}`]),
    row.end_clock];
  invariant(boundaries.length === profileSegmentNames.length + 1 &&
    boundaries.every((clock, index) => Number.isInteger(clock) &&
      (index === 0 || clock >= boundaries[index - 1])),
  `Profile boundaries are incomplete for ${row.session}:${row.frame}`);
  const dlis = Array.from({ length: 2 }, (unused, index) => ({
    start: row[`profile_dli${index}_start`],
    end: row[`profile_dli${index}_end`],
    segment: row[`profile_dli${index}_segment`],
  })).filter(({ start, end }) => end > start);
  const overlap = (start, end) => dlis.reduce((sum, dli) =>
    sum + Math.max(0, Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
  const cpu = (start, end) => end > start ? end - start - overlap(start, end) : 0;
  const segments = profileSegmentNames.map((name, index) => {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    return {
      name,
      wall_cycles: end - start,
      dli_cycles: overlap(start, end),
      mainline_cycles: cpu(start, end),
    };
  });
  const segmentCpu = (index) => segments[index].mainline_cycles;
  const nested = (start, end, fallbackStart, fallbackEnd) => {
    const validStart = start >= fallbackStart && start <= fallbackEnd ? start : fallbackStart;
    const validEnd = end >= validStart && end <= fallbackEnd ? end : fallbackEnd;
    return cpu(validStart, validEnd);
  };

  const eraseStart = boundaries[0];
  const eraseEnd = boundaries[1];
  const entityEraseStart = row.profile_entity_erase_start;
  const projectileEraseStart = boundaries[1];
  const projectileEraseEnd = boundaries[2];
  const player_fighterEraseStart = row.profile_erase_player_fighter_start;
  const projectileUpdateStart = boundaries[6];
  const projectileUpdateEnd = boundaries[7];
  const interceptorUpdateStart = row.profile_interceptor_update_start;
  const projectileRenderStart = boundaries[18];
  const projectileRenderEnd = boundaries[19];
  const interceptorRenderStart = row.profile_interceptor_render_start;
  const entityUpdateStart = boundaries[15];
  const entityUpdateEnd = boundaries[16];
  const effectUpdateEnd = row.profile_effect_update_end;
  const pickupUpdateEnd = row.profile_pickup_update_end;
  const entityRenderStart = boundaries[19];
  const entityRenderEnd = boundaries[20];
  const pickupRenderStart = row.profile_pickup_render_start;
  const effectRenderStart = row.profile_effect_render_start;

  const effectErase = nested(eraseStart, entityEraseStart, eraseStart, eraseEnd);
  const entityErase = nested(entityEraseStart, eraseEnd, eraseStart, eraseEnd);
  const interceptorErase = nested(projectileEraseStart, player_fighterEraseStart,
    projectileEraseStart, projectileEraseEnd);
  const player_fighterErase = nested(player_fighterEraseStart, projectileEraseEnd,
    projectileEraseStart, projectileEraseEnd);
  const player_fighterUpdate = nested(projectileUpdateStart, interceptorUpdateStart,
    projectileUpdateStart, projectileUpdateEnd);
  const interceptorUpdate = nested(interceptorUpdateStart, projectileUpdateEnd,
    projectileUpdateStart, projectileUpdateEnd);
  const player_fighterRender = nested(projectileRenderStart, interceptorRenderStart,
    projectileRenderStart, projectileRenderEnd);
  const interceptorRender = nested(interceptorRenderStart, projectileRenderEnd,
    projectileRenderStart, projectileRenderEnd);
  const effectUpdate = nested(entityUpdateStart, effectUpdateEnd,
    entityUpdateStart, entityUpdateEnd);
  const pickupUpdate = nested(effectUpdateEnd, pickupUpdateEnd,
    entityUpdateStart, entityUpdateEnd);
  const debrisUpdate = nested(pickupUpdateEnd, entityUpdateEnd,
    entityUpdateStart, entityUpdateEnd);
  const debrisRenderEnd = pickupRenderStart || effectRenderStart || entityRenderEnd;
  const pickupRenderEnd = effectRenderStart || entityRenderEnd;
  const debrisRender = nested(entityRenderStart, debrisRenderEnd,
    entityRenderStart, entityRenderEnd);
  const pickupRender = pickupRenderStart === 0 ? 0 :
    nested(pickupRenderStart, pickupRenderEnd, entityRenderStart, entityRenderEnd);
  const effectRender = effectRenderStart === 0 ? 0 :
    nested(effectRenderStart, entityRenderEnd, entityRenderStart, entityRenderEnd);

  const dliCycles = dlis.reduce((sum, { start, end }) => sum + end - start, 0);
  const subsystemCycles = {
    vbi_and_synchronization: dliCycles,
    world_ring_playfield: segmentCpu(13),
    broadside: segmentCpu(8) + segmentCpu(17),
    player_fighter_projectiles: player_fighterErase + player_fighterUpdate + segmentCpu(11) + player_fighterRender,
    interceptor_projectiles: interceptorErase + interceptorUpdate + segmentCpu(12) + interceptorRender,
    enemy_update_collision: segmentCpu(5) + segmentCpu(7) + segmentCpu(9),
    entity_debris: entityErase + debrisUpdate + debrisRender,
    effects: effectErase + effectUpdate + segmentCpu(16) + effectRender,
    capsule_interactive_entity: segmentCpu(2) + pickupUpdate + pickupRender,
    music_sound: segmentCpu(21),
    remaining_runtime: segmentCpu(3) + segmentCpu(4) + segmentCpu(10) +
      segmentCpu(14) + segmentCpu(20) + segmentCpu(22),
  };
  invariant(Object.values(subsystemCycles).reduce((sum, cycles) => sum + cycles, 0) ===
    row.wall_cycles, `Profile subsystem split does not sum to wall for ${row.session}:${row.frame}`);
  return {
    session: row.session,
    frame: row.frame,
    wall_cycles: row.wall_cycles,
    subsystem_cycles: subsystemCycles,
    synchronization_wait_cycles: 0,
    synchronization_note: "Measurement begins after wait_frame; gameplay DLI service is included in vbi_and_synchronization.",
    cross_cutting_cycles: {
      render_mainline: segmentCpu(16) + segmentCpu(17) + segmentCpu(18) + segmentCpu(19),
      erase_backing_mainline: segmentCpu(0) + segmentCpu(1),
      address_mapping_calls: row.profile_pointer_calls,
      address_mapping_cycles: row.profile_pointer_cycles,
      projectile_composition_calls: row.profile_compose_calls,
      projectile_composition_cycles: row.profile_compose_cycles,
    },
    projectile_detail: {
      player_fighter: { erase: player_fighterErase, update_collision: player_fighterUpdate,
        weapon_control: segmentCpu(11), render_backing: player_fighterRender },
      interceptor: { erase: interceptorErase, update_collision: interceptorUpdate,
        weapon_control: segmentCpu(12), render_backing: interceptorRender },
    },
    entity_effect_detail: {
      effect_erase: effectErase, entity_erase: entityErase,
      effect_update: effectUpdate, pickup_booster_update: pickupUpdate,
      debris_update: debrisUpdate, debris_render: debrisRender,
      pickup_render: pickupRender, effect_render: effectRender,
    },
    sequential_segments: segments,
  };
}

function coverageRecord(rows, predicate) {
  const matching = rows.filter(predicate);
  const maximum = matching.length === 0 ? undefined : maximumRow(matching, (row) => row.wall_cycles);
  return {
    observed: matching.length > 0,
    matching_frames: matching.length,
    heaviest: maximum ? frameState(maximum) : null,
  };
}

function sessionSummary(session, rows) {
  const maximum = maximumRow(rows, (row) => row.wall_cycles);
  return {
    id: session.id,
    kind: session.kind,
    medium: session.medium ?? "XEX",
    difficulty: session.difficulty,
    policy: session.policy,
    fire_delay: session.fireDelay,
    measured_frames: rows.length,
    maximum_wall_cycles: maximum.wall_cycles,
    deadline_overrun_frames: rows.filter((row) => row.missed_frames > 0).length,
    missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
  };
}

function runBootSmoke({ emulatorPath, labels, xexPath, atrPath }) {
  const outputDirectory = path.join(buildDirectory, "boot-smoke");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const addressEnvironment = {};
  for (const [environmentName, labelName] of Object.entries(bootTraceLabels)) {
    const address = labels.get(labelName);
    invariant(Number.isInteger(address), `Boot-smoke label ${labelName} is missing`);
    addressEnvironment[environmentName] = `0x${address.toString(16)}`;
  }
  const expected = {
    start: labels.get("start"),
    xex_entry: labels.get("boot_stage2_xex_entry"),
    loader_dlist: LOADER_DISPLAY_LIST_ADDRESS,
    main_menu_dlist: labels.get("main_menu_display_list"),
    playfield_dlist_a: labels.get("PLAYFIELD_DLIST_A"),
    playfield_dlist_b: labels.get("PLAYFIELD_DLIST_B"),
    playfield_dlist_bytes: 75,
    loader_dli: labels.get("loader_dli"),
    frontend_dli: labels.get("frontend_hint_dli"),
    gameplay_dli: labels.get("gameplay_dli"),
  };
  invariant(Object.values(expected).every(Number.isInteger),
    "Boot-smoke expected-address labels are incomplete");

  const publicLaunches = atari800ArtifactLaunches(rootDirectory);
  invariant(publicLaunches.xex.artifact.path === xexPath &&
    publicLaunches.atr.artifact.path === atrPath,
  "Boot smoke must use the manifest-bound public artifact paths");
  const definitions = [];
  for (const artifact of [publicLaunches.xex, publicLaunches.atr]) {
    validateAtari800Launch(artifact);
    for (const fill of [0xa5, 0x5a]) {
      definitions.push({
        ...artifact,
        path: artifact.artifact.path,
        arguments: artifact.mediaArguments,
        fill,
        id: `${artifact.id}-${fill.toString(16)}`,
      });
    }
  }

  const sessions = definitions.map((definition) => {
    const outputPath = path.join(outputDirectory, `${definition.id}.json`);
    const screenshotPrefix = path.join(outputDirectory, definition.id);
    run(emulatorPath, [
      "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
      ...definition.arguments,
    ], {
      env: {
        ...process.env,
        SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
        ...addressEnvironment,
        DFBOOT_OUTPUT: outputPath,
        DFBOOT_ARTIFACT: definition.id,
        DFBOOT_RAM_FILL: String(definition.fill),
        DFBOOT_SCREENSHOT_PREFIX: screenshotPrefix,
      },
    });
    const result = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    invariant(result.artifact === definition.id && result.cold_ram_fill === definition.fill,
      `${definition.id} boot-smoke identity differs from its invocation`);
    invariant(result.snapshots.map(({ frame }) => frame).join(",") === "1,250,300,500,750",
      `${definition.id} did not capture all five required PAL frames`);
    const byFrame = new Map(result.snapshots.map((snapshot) => [snapshot.frame, snapshot]));
    const loader250 = byFrame.get(250);
    const loader300 = byFrame.get(300);
    const menu = byFrame.get(500);
    const gameplay = byFrame.get(750);
    const completeLoaderSnapshots = [loader250, loader300];
    for (const snapshot of completeLoaderSnapshots) {
      invariant(snapshot.game_state === 0 && snapshot.dlist === expected.loader_dlist &&
        snapshot.charset_address === 0xe000 && snapshot.dma_ctl === 0x22 &&
        snapshot.nmi_en === 0x80 && snapshot.vdslst === expected.loader_dli,
      `${definition.id} loader display/VBI state is invalid at frame ${snapshot.frame}`);
    }
    invariant(loader250.loader_timer > loader300.loader_timer && loader300.loader_timer > 0,
      `${definition.id} loader countdown did not advance between frames 250 and 300`);
    const milestones = result.milestones;
    const menuDeadline = definition.id.startsWith("atr") ? 503 : 502;
    invariant(milestones.menu <= menuDeadline && milestones.frontend_poll <= menuDeadline + 1,
      `${definition.id} did not reach the production main-menu input path by frame ${menuDeadline + 1}`);
    invariant(gameplay.game_state === 6 && gameplay.charset_address === 0x5000 &&
      gameplay.pm_base === 0x3800 && gameplay.dma_ctl === 0x3e &&
      gameplay.nmi_en === 0x80 && gameplay.vdslst === expected.gameplay_dli &&
      gameplay.dlist >= expected.playfield_dlist_a &&
      gameplay.dlist < expected.playfield_dlist_b + expected.playfield_dlist_bytes,
    `${definition.id} did not reach the legal gameplay display/VBI path by frame 750`);
    invariant(Object.values(milestones).every((frame) => frame !== 0xffffffff) &&
      milestones.start < milestones.loader && milestones.loader < milestones.menu &&
      milestones.menu <= milestones.frontend_poll &&
      milestones.frontend_poll < milestones.gameplay_init &&
      milestones.gameplay_init <= milestones.main_loop && milestones.main_loop < 750,
    `${definition.id} did not execute the complete loader-to-gameplay handoff`);
    if (definition.id.startsWith("xex")) {
      invariant(menu.runad === expected.xex_entry,
        `${definition.id} XEX RUNAD does not point at the stage-2 parity entry`);
    } else {
      invariant(menu.dosvec === expected.start,
        `${definition.id} ATR DOSVEC does not point at the game entry`);
    }
    const screenshots = [1, 250, 300, 500, 750].map((frame) => {
      const screenshotPath = `${screenshotPrefix}-frame${String(frame).padStart(3, "0")}.png`;
      invariant(fs.existsSync(screenshotPath),
        `${definition.id} screenshot is missing for frame ${frame}`);
      const bytes = fs.readFileSync(screenshotPath);
      return {
        frame,
        path: path.relative(rootDirectory, screenshotPath),
        bytes: bytes.length,
        sha256: sha256(bytes),
      };
    });
    return {
      id: definition.id,
      medium: definition.id.startsWith("xex") ? "XEX" : "ATR",
      cold_ram_fill: definition.fill,
      artifact: {
        path: path.relative(rootDirectory, definition.path),
        absolute_path: definition.path,
        bytes: definition.artifact.bytes,
        sha256: definition.artifact.sha256,
      },
      launch: {
        emulator_path: path.resolve(emulatorPath),
        arguments: [
          "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
          ...definition.arguments,
        ],
        mode: definition.mode,
      },
      snapshots: result.snapshots,
      milestones,
      screenshots,
      passed: true,
    };
  });

  const gameplayScreenshots = sessions.map((session) => ({
    artifact: session.artifact,
    sha256: session.screenshots.find(({ frame }) => frame === 750).sha256,
  }));

  const evidence = {
    emulator: "Atari800 7.1.2 PAL/XL",
    frames_observed: 750,
    duration_seconds_pal: 15,
    guest_instrumentation_bytes: 0,
    cold_ram_range: "$8000-$9FFF",
    input: "production joystick path; FIRE pressed on host frames 501-506",
    expected_addresses: expected,
    sessions,
    frame_750_gameplay_sha256: gameplayScreenshots,
    passed: sessions.every(({ passed }) => passed),
  };
  fs.writeFileSync(path.join(outputDirectory, "report.json"),
    `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

function longestBrightStripe(image) {
  const bright = (offset) => {
    const red = image.rgb[offset];
    const green = image.rgb[offset + 1];
    const blue = image.rgb[offset + 2];
    return Math.min(red, green, blue) >= 160 &&
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 48;
  };
  let horizontal = 0;
  let vertical = 0;
  for (let y = 0; y < image.height; y += 1) {
    let run = 0;
    for (let x = 0; x < image.width; x += 1) {
      run = bright((y * image.width + x) * 3) ? run + 1 : 0;
      horizontal = Math.max(horizontal, run);
    }
  }
  for (let x = 0; x < image.width; x += 1) {
    let run = 0;
    for (let y = 0; y < image.height; y += 1) {
      run = bright((y * image.width + x) * 3) ? run + 1 : 0;
      vertical = Math.max(vertical, run);
    }
  }
  return { horizontal, vertical };
}

function firstByteDifference(actual, expected) {
  const length = Math.max(actual.length, expected.length);
  for (let index = 0; index < length; index += 1) {
    if (actual[index] !== expected[index]) return index;
  }
  return -1;
}

function runMenuRasterAudit({ emulatorPath, labels, manifest, xexPath, atrPath }) {
  const outputDirectory = path.join(buildDirectory, "menu-raster");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const source = fs.readFileSync(path.join(rootDirectory, "src", "main.s"), "utf8");
  const expected = readStartMenuRuntimeState(source, 0);
  const expectedScreen = Buffer.from(expected.screen);
  const expectedCharset = Buffer.from(expected.graphics.frontendCharset);
  const expectedDisplayList = Buffer.from(expected.graphics.mainMenuDisplayList);
  const canonicalRasterSha256 =
    "ba90172fad6c1c799a14b74dfddc55946e0ed49308dbf24c5bb5fc4afcc4bb04";
  const residentRuntime = fs.readFileSync(path.join(
    rootDirectory, "build", "resident-runtime.bin"));
  const stageTableOffset = labels.get("boot_stage_streams") -
    manifest.residentRuntime.runAddress;
  invariant(stageTableOffset >= 0 && stageTableOffset + 5 * 6 <= residentRuntime.length,
    "boot_stage_streams does not lie inside the resident runtime image");
  const bootStageStreams = Array.from({ length: 5 }, (_, index) => {
    const offset = stageTableOffset + index * 6;
    return {
      source: residentRuntime.readUInt16LE(offset),
      destination: residentRuntime.readUInt16LE(offset + 2),
      bytes: residentRuntime.readUInt16LE(offset + 4),
    };
  });
  const expectedBootStageStreams = [
    { source: manifest.a2Kernel.sourceAddress, destination: 0x7f16,
      bytes: manifest.a2Kernel.bytes },
    { source: manifest.entityEffects.packedSourceAddress,
      destination: manifest.entityEffects.stagedSourceAddress,
      bytes: manifest.entityEffects.packedBytes },
    { source: manifest.entityEffects.pickupPhaseExternalChunk.stagingAddress,
      destination: 0x4801, bytes: manifest.entityEffects.pickupPhasePackedBytes },
    { source: manifest.residentRuntime.packedSourceAddress,
      destination: manifest.residentRuntime.stagingAddress,
      bytes: manifest.residentRuntime.suffixPackedBytes },
    { source: manifest.starfieldRuntime.packedSourceAddress,
      destination: manifest.starfieldRuntime.stagingAddress,
      bytes: manifest.starfieldRuntime.packedBytes },
  ];
  invariant(JSON.stringify(bootStageStreams) === JSON.stringify(expectedBootStageStreams),
    "assembled boot_stage_streams differs from the manifest-owned lifecycle");
  const stagedSources = [
    { name: "A2 initial source", start: bootStageStreams[0].source,
      end_exclusive: bootStageStreams[0].source + bootStageStreams[0].bytes, last_read: 1 },
    { name: "packed ENTITY_CODE", start: bootStageStreams[1].source,
      end_exclusive: bootStageStreams[1].source + bootStageStreams[1].bytes, last_read: 2 },
    { name: "packed pickup", start: bootStageStreams[2].source,
      end_exclusive: bootStageStreams[2].source + bootStageStreams[2].bytes, last_read: 3 },
    { name: "packed resident suffix", start: bootStageStreams[3].source,
      end_exclusive: bootStageStreams[3].source + bootStageStreams[3].bytes, last_read: 4 },
    { name: "packed starfield", start: bootStageStreams[4].source,
      end_exclusive: bootStageStreams[4].source + bootStageStreams[4].bytes, last_read: 5 },
  ];
  const liveSourceOverwrites = [];
  for (const [index, write] of bootStageStreams.entries()) {
    const sequence = index + 1;
    const writeEnd = write.destination + write.bytes;
    for (const sourceRange of stagedSources) {
      if (sequence <= sourceRange.last_read &&
          write.destination < sourceRange.end_exclusive && writeEnd > sourceRange.start) {
        liveSourceOverwrites.push({ sequence, source: sourceRange.name });
      }
    }
  }
  invariant(liveSourceOverwrites.length === 0,
    "boot staging overwrites a packed source before its final read");
  const dfmcRecords = manifest.transportCapacity.manifest.parsed.records.map((record) => ({
    start_sector: record.startSector,
    sectors: record.sectorCount,
    packed_bytes: record.packedLength,
    raw_bytes: record.rawLength,
    destination: record.finalDestination,
    staging_id: record.stagingId,
  }));
  invariant(JSON.stringify(dfmcRecords) === JSON.stringify([
    { start_sector: 102, sectors: 45, packed_bytes: 5639, raw_bytes: 6643,
      destination: 0x5e10, staging_id: 1 },
    { start_sector: 147, sectors: 8, packed_bytes: 888, raw_bytes: 888,
      destination: 0x8c80, staging_id: 2 },
    { start_sector: 155, sectors: 2, packed_bytes: 229, raw_bytes: 234,
      destination: 0x5259, staging_id: 2 },
    { start_sector: 157, sectors: 5, packed_bytes: 585, raw_bytes: 645,
      destination: 0x9d75, staging_id: 2 },
  ]), "DFMC record order or extent changed during the menu-lifecycle repair");
  const addressEnvironment = {
    DFMENU_GAME_STATE: `0x${labels.get("game_state").toString(16)}`,
    DFMENU_FRONTEND_SELECTION: `0x${labels.get("frontend_selection").toString(16)}`,
    DFMENU_FRONTEND_INPUT_ARMED:
      `0x${labels.get("frontend_input_armed").toString(16)}`,
    DFMENU_PC_FRONTEND_POLL: `0x${labels.get("frontend_input_poll").toString(16)}`,
    DFMENU_PC_PAUSE_LOOP:
      `0x${labels.get("pause_frontend_input_poll").toString(16)}`,
    DFMENU_MAIN_MENU_DLIST: `0x${labels.get("main_menu_display_list").toString(16)}`,
    DFMENU_FRONTEND_DLIST_END:
      `0x${labels.get("frontend_display_lists_end").toString(16)}`,
  };
  invariant(Object.values(addressEnvironment).every((value) => !value.includes("undefined")),
    "Menu-raster labels are incomplete");

  const sessions = [];
  for (const artifact of [
    { medium: "XEX", path: xexPath, args: ["-run", xexPath] },
    { medium: "ATR", path: atrPath, args: [atrPath] },
  ]) {
    for (const fill of [0x00, 0xa5, 0x5a, 0xff]) {
      const id = `${artifact.medium.toLowerCase()}-${fill.toString(16).padStart(2, "0")}`;
      const rawPath = path.join(outputDirectory, `${id}.json`);
      const screenshotPrefix = path.join(outputDirectory, id);
      run(emulatorPath, [
        "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel",
        "-no-vsync", ...artifact.args,
      ], {
        env: {
          ...process.env,
          SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
          ...addressEnvironment,
          DFMENU_OUTPUT: rawPath,
          DFMENU_ARTIFACT: id,
          DFMENU_RAM_FILL: String(fill),
          DFMENU_CYCLES: "3",
          DFMENU_SCREENSHOT_PREFIX: screenshotPrefix,
        },
      });
      const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
      invariant(raw.artifact === id && raw.cold_ram_fill === fill &&
        raw.completed_cycles === 3, `${id} did not complete three production transitions`);
      invariant(raw.pause_entries === 3 && raw.pause_latch_failures === 0,
        `${id} did not clear PMG graphics latches on every pause-menu entry`);
      const requiredKeys = [
        "0:3", "0:20", "0:500", "1:3", "1:20", "2:3", "2:20",
        "3:3", "3:20", "3:500",
      ];
      const snapshots = new Map(raw.snapshots.map((snapshot) =>
        [`${snapshot.generation}:${snapshot.menu_age}`, snapshot]));
      invariant(requiredKeys.every((key) => snapshots.has(key)),
        `${id} is missing complete-menu raster checkpoints`);
      const checks = requiredKeys.map((key) => {
        const snapshot = snapshots.get(key);
        const screen = Buffer.from(snapshot.screen_hex, "hex");
        const charset = Buffer.from(snapshot.charset_hex, "hex");
        const displayLists = Buffer.from(snapshot.dlist_hex, "hex");
        const screenDifference = firstByteDifference(screen, expectedScreen);
        const charsetDifference = firstByteDifference(charset, expectedCharset);
        const displayListDifference = firstByteDifference(
          displayLists.subarray(0, expectedDisplayList.length), expectedDisplayList);
        const screenshotPath = path.resolve(rootDirectory, snapshot.screenshot);
        invariant(fs.existsSync(screenshotPath), `${id} screenshot ${key} is missing`);
        const screenshotBytes = fs.readFileSync(screenshotPath);
        const screenshotSha256 = sha256(screenshotBytes);
        const stripe = longestBrightStripe(decodeAtari800Screenshot(screenshotBytes));
        invariant(screenDifference === -1 && charsetDifference === -1 &&
          displayListDifference === -1,
        `${id} ${key} differs from the generated frontend asset`);
        invariant(snapshot.game_state === 1 &&
          snapshot.dlist === labels.get("main_menu_display_list") &&
          snapshot.charset_address === 0x4800 && snapshot.dma_ctl === 0x22 &&
          snapshot.nmi_en === 0x80 &&
          snapshot.vdslst === labels.get("frontend_hint_dli") &&
          snapshot.gractl === 0 && snapshot.prior === 0,
        `${id} ${key} has invalid ANTIC/GTIA frontend state`);
        invariant([snapshot.grafp0, snapshot.grafp1, snapshot.grafp2,
          snapshot.grafp3, snapshot.grafm].every((value) => value === 0),
        `${id} ${key} retained a PMG graphics latch`);
        invariant(snapshot.pmg_nonzero === 0,
          `${id} ${key} retained nonzero frontend PMG backing`);
        invariant(screenshotSha256 === canonicalRasterSha256,
          `${id} ${key} native raster differs from the accepted complete menu`);
        invariant(stripe.horizontal < 32 && stripe.vertical < 32,
          `${id} ${key} contains a uniform bright stripe`);
        return {
          generation: snapshot.generation,
          menu_age: snapshot.menu_age,
          host_frame: snapshot.frame,
          screen_difference: screenDifference,
          charset_difference: charsetDifference,
          display_list_difference: displayListDifference,
          registers: {
            sdlst: snapshot.dlist,
            chbase: snapshot.charset_address,
            dmactl: snapshot.dma_ctl,
            gractl: snapshot.gractl,
            prior: snapshot.prior,
            vscroll: snapshot.vscroll,
            hscroll: snapshot.hscroll,
            nmien: snapshot.nmi_en,
            vdslst: snapshot.vdslst,
            colpf: [snapshot.colpf0, snapshot.colpf1,
              snapshot.colpf2, snapshot.colpf3],
            colbk: snapshot.colbk,
            grafp: [snapshot.grafp0, snapshot.grafp1,
              snapshot.grafp2, snapshot.grafp3],
            grafm: snapshot.grafm,
          },
          pmg_nonzero: snapshot.pmg_nonzero,
          brightest_run: stripe,
          screenshot: path.relative(rootDirectory, screenshotPath),
          screenshot_sha256: screenshotSha256,
        };
      });
      sessions.push({
        id,
        medium: artifact.medium,
        cold_ram_fill: fill,
        artifact: {
          path: path.relative(rootDirectory, artifact.path),
          bytes: fs.statSync(artifact.path).size,
          sha256: sha256(fs.readFileSync(artifact.path)),
        },
        raw_trace: path.relative(rootDirectory, rawPath),
        first_complete_menu_frame: checks[0].host_frame,
        transitions_completed: raw.completed_cycles,
        pause_entries: raw.pause_entries,
        pause_latch_failures: raw.pause_latch_failures,
        checks,
        passed: true,
      });
    }
  }
  const report = {
    emulator: "Atari800 7.1.2 PAL/XL",
    guest_instrumentation_bytes: 0,
    cold_ram_range: "$8000-$9FFF",
    cold_ram_fills: [0x00, 0xa5, 0x5a, 0xff],
    input: "production FIRE and OPTION/joystick pause-quit path",
    menu_generations_per_session: 4,
    gameplay_to_menu_transitions_per_session: 3,
    minimum_stable_menu_frames: 500,
    expected: {
      screen: "$4000-$43FF generated main-menu state",
      charset: "$4800-$4BFF generated frontend charset",
      display_list: `$${labels.get("main_menu_display_list").toString(16)}`,
      canonical_raster_sha256: canonicalRasterSha256,
      screen_sha256: sha256(expectedScreen),
      charset_sha256: sha256(expectedCharset),
      display_list_sha256: sha256(expectedDisplayList),
    },
    memory_audit: {
      boot_stage_streams: bootStageStreams,
      dfmc_records: dfmcRecords,
      ranges: {
        frontend_screen: { start: 0x4000, end_exclusive: 0x4400 },
        gameplay_charset: { start: 0x4400, end_exclusive: 0x4800 },
        frontend_charset: { start: 0x4800, end_exclusive: 0x4c00 },
        glue_transport: { start: manifest.integrationGlue.transportAddress,
          end_exclusive: manifest.integrationGlue.transportAddress +
            manifest.integrationGlue.bytes },
        glue_final: { start: manifest.integrationGlue.finalAddress,
          end_exclusive: manifest.integrationGlue.finalAddress +
            manifest.integrationGlue.bytes },
        broadside: { start: manifest.broadsideRuntime.runAddress,
          end_exclusive: manifest.broadsideRuntime.runAddress +
            manifest.broadsideRuntime.bytes },
        post_loader_workspace: { start: 0x7810, end_exclusive: 0x8000 },
        glue_holding: { start: manifest.integrationGlue.holdingAddress,
          end_exclusive: manifest.integrationGlue.holdingAddress +
            manifest.integrationGlue.bytes },
        entity_state_bss: { start: manifest.entityEffects.stateAddress,
          end_exclusive: manifest.entityEffects.stateAddress +
            manifest.entityEffects.stateBytes },
        pickup_phase_bank: { start: manifest.entityEffects.pickupPhaseBankAddress,
          end_exclusive: manifest.entityEffects.pickupPhaseBankAddress +
            manifest.entityEffects.pickupPhaseBankBytes },
        pickup_code: { start: manifest.entityEffects.pickupCodeAddress,
          end_exclusive: manifest.entityEffects.pickupCodeAddress +
            manifest.entityEffects.pickupCodeBytes },
        a2_runtime: { start: manifest.a2Kernel.runAddress,
          end_exclusive: manifest.a2Kernel.runAddress + manifest.a2Kernel.bytes },
        entity_code: { start: manifest.entityEffects.codeRunAddress,
          end_exclusive: manifest.entityEffects.codeRunAddress +
            manifest.entityEffects.codeBytes },
        main_menu_display_list: { start: labels.get("main_menu_display_list"),
          end_exclusive: labels.get("main_menu_display_list_end") },
        director: { start: manifest.directorRuntime.runAddress,
          end_exclusive: manifest.directorRuntime.endExclusive },
      },
      entity_packed_source: {
        start: manifest.entityEffects.packedSourceAddress,
        end_exclusive: manifest.entityEffects.initialPackedSourcesEndExclusive,
        staged_start: manifest.entityEffects.stagedSourceAddress,
        staged_end_exclusive: manifest.entityEffects.stagedEndExclusive,
        source_to_staging_margin_bytes:
          manifest.entityEffects.sourceToStagingMarginBytes,
        staging_to_broadside_margin_bytes:
          manifest.entityEffects.stagingToBroadsideMarginBytes,
        released_before_starfield_expansion:
          manifest.entityEffects.stagingLifecycle.stagingReleasedBeforeStarfieldExpansion,
      },
      staged_source_lifetimes: stagedSources,
      glyph_126_127: {
        gameplay_charset_addresses: [0x47f0, 0x47ff],
        frontend_charset_addresses: [0x4bf0, 0x4bff],
        frontend_max_used_glyph: 63,
        separate_charsets: true,
        frontend_full_charset_restored: true,
      },
      live_source_overwrites: liveSourceOverwrites,
      no_live_source_overwrite: liveSourceOverwrites.length === 0,
      passed: true,
    },
    sessions,
    passed: sessions.every(({ passed }) => passed),
  };
  const buildReportPath = path.join(outputDirectory, "report.json");
  const durableReportPath = path.join(rootDirectory, "docs", "menu-raster-trace.json");
  const reportBytes = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(buildReportPath, reportBytes);
  fs.writeFileSync(durableReportPath, reportBytes);
  return { report, buildReportPath, durableReportPath };
}

function main() {
  const sourceDirectory = path.resolve(argumentValue("atari800-source") ??
    process.env.ATARI800_TRACE_SOURCE ?? "/tmp/atari800-7.1.2");
  const shouldPrepare = process.argv.includes("--prepare");
  const bootSmokeOnly = process.argv.includes("--boot-smoke-only");
  const menuRasterOnly = process.argv.includes("--menu-raster-only");
  const capitalPlayerCollisionOnly = process.argv.includes("--capital-player-collision-only");
  const broadsideTransientOnly = process.argv.includes("--broadside-transient-only");
  const reuseExistingTraces = process.argv.includes("--reuse-existing-traces");
  const smokeFramesArgument = argumentValue("smoke-frames");
  const smokeFrames = smokeFramesArgument === undefined ? null : Number(smokeFramesArgument);
  const onlySession = argumentValue("only-session");
  const pickupFenceTrace = process.argv.includes("--pickup-fence-trace");
  invariant(smokeFrames === null || Number.isInteger(smokeFrames) && smokeFrames > 0,
    "--smoke-frames must be a positive integer");
  if (shouldPrepare) prepareAtari800(sourceDirectory);

  const emulatorPath = path.join(sourceDirectory, "src", "atari800");
  invariant(fs.existsSync(emulatorPath),
    `Instrumented Atari800 is missing: ${emulatorPath}; rerun with --prepare`);
  const labelPath = path.join(rootDirectory, "build", "void-strike-65.lbl");
  const manifestPath = path.join(rootDirectory, "dist", "void-strike-65-manifest.json");
  const bootPath = path.join(rootDirectory, "dist", "void-strike-65-boot.bin");
  const xexPath = path.join(rootDirectory, "dist", "void-strike-65.xex");
  const atrPath = path.join(rootDirectory, "dist", "void-strike-65.atr");
  for (const requiredPath of [labelPath, manifestPath, bootPath, xexPath, atrPath]) {
    invariant(fs.existsSync(requiredPath), `Build input is missing: ${requiredPath}`);
  }
  const labels = parseViceLabels(fs.readFileSync(labelPath, "utf8"));
  const glueLabelPath = path.join(rootDirectory, "build", "integration-glue.lbl");
  invariant(fs.existsSync(glueLabelPath),
    "Integration-glue labels are missing");
  const glueLabels = parseViceLabels(fs.readFileSync(glueLabelPath, "utf8"));
  const directorLabelPath = path.join(rootDirectory, "build", "encounter-director.lbl");
  invariant(fs.existsSync(directorLabelPath),
    `Director labels are missing: ${directorLabelPath}`);
  const directorLabels = parseViceLabels(fs.readFileSync(directorLabelPath, "utf8"));
  const collisionLabelPath = path.join(rootDirectory, "build", "capital-player-collision.lbl");
  invariant(fs.existsSync(collisionLabelPath), "Capital/player collision labels are missing");
  const collisionLabels = parseViceLabels(fs.readFileSync(collisionLabelPath, "utf8"));
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  invariant(["candidate", "release"].includes(manifest.buildVariant),
    "Runtime trace requires candidate or final release artifacts");
  const runtimeArtifacts = runtimeArtifactSet({
    boot: fs.readFileSync(bootPath),
    xex: fs.readFileSync(xexPath),
    atr: fs.readFileSync(atrPath),
  });
  runtimeArtifacts["void-strike-65-manifest.json"] = {
    path: "dist/void-strike-65-manifest.json",
    bytes: manifestBytes.length,
    sha256: sha256(manifestBytes),
  };
  for (const name of runtimeArtifactNames) {
    invariant(manifest.artifacts?.[name]?.bytes === runtimeArtifacts[name].bytes &&
      manifest.artifacts?.[name]?.sha256 === runtimeArtifacts[name].sha256,
    `Candidate manifest does not match ${name}`);
  }
  const addressEnvironment = {};
  for (const [environmentName, labelName] of Object.entries(traceLabels)) {
    const address = labels.get(labelName) ?? glueLabels.get(labelName);
    invariant(Number.isInteger(address), `Trace label ${labelName} is missing`);
    addressEnvironment[environmentName] = `0x${address.toString(16)}`;
  }
  for (const [environmentName, labelName] of Object.entries({
    DFTRACE_PC_DIRECTOR_WORLD: "director_world_row_tick",
    DFTRACE_PC_DIRECTOR_REQUEST: "director_request",
    DFTRACE_PC_DIRECTOR_EVENT: "director_try_event",
  })) {
    const address = directorLabels.get(labelName);
    invariant(Number.isInteger(address), `Director trace label ${labelName} is missing`);
    addressEnvironment[environmentName] = `0x${address.toString(16)}`;
  }
  for (const [environmentName, labelName] of Object.entries({
    DFTRACE_PC_CAPITAL_PLAYER_AABB_HIT: "capital_player_collision_hit",
    DFTRACE_PC_CAPITAL_PLAYER_AABB_MISS: "capital_player_collision_miss",
  })) {
    const address = collisionLabels.get(labelName);
    invariant(Number.isInteger(address), `Collision trace label ${labelName} is missing`);
    addressEnvironment[environmentName] = `0x${address.toString(16)}`;
  }
  const capitalSoundTimer = labels.get("CAPITAL_EXPLOSION_SOUND_TIMER");
  invariant(Number.isInteger(capitalSoundTimer),
    "Trace label CAPITAL_EXPLOSION_SOUND_TIMER is missing");
  addressEnvironment.DFTRACE_ENGINE_TIMER = `0x${(capitalSoundTimer + 1).toString(16)}`;
  addressEnvironment.DFTRACE_ENGINE_PHASE = `0x${(capitalSoundTimer + 2).toString(16)}`;
  const broadState = labels.get("BROAD_STATE");
  invariant(Number.isInteger(broadState), "Trace label BROAD_STATE is missing");
  addressEnvironment.DFTRACE_BROAD_SCHEDULE_TIMER =
    `0x${(broadState + 27).toString(16)}`;
  addressEnvironment.DFTRACE_BROAD_SCHEDULE_INDEX =
    `0x${(broadState + 28).toString(16)}`;
  addressEnvironment.DFTRACE_BROAD_VISIBLE_SCROLLS =
    `0x${(broadState + 47).toString(16)}`;
  const sectorState = labels.get("CAPITAL_SECTOR_STATE");
  invariant(Number.isInteger(sectorState), "Trace label CAPITAL_SECTOR_STATE is missing");
  addressEnvironment.DFTRACE_CAPITAL_DRAIN_ROWS =
    `0x${(sectorState + 1).toString(16)}`;

  fs.mkdirSync(buildDirectory, { recursive: true });
  if (menuRasterOnly) {
    const menuRaster = runMenuRasterAudit({
      emulatorPath, labels, manifest, xexPath, atrPath,
    });
    console.log(`Menu raster: ${menuRaster.report.sessions.length} ` +
      "XEX/ATR cold-start and return sessions passed");
    console.log(`Report: ${path.relative(rootDirectory, menuRaster.durableReportPath)}`);
    console.log(`Raw report: ${path.relative(rootDirectory, menuRaster.buildReportPath)}`);
    return;
  }
  const bootSmoke = runBootSmoke({ emulatorPath, labels, xexPath, atrPath });
  console.log(`Boot smoke: ${bootSmoke.sessions.length} XEX/ATR cold-start sessions passed`);
  if (bootSmokeOnly) {
    console.log(`Report: ${path.relative(rootDirectory,
      path.join(buildDirectory, "boot-smoke", "report.json"))}`);
    return;
  }
  const allRows = [];
  const summaries = [];
  const pickupScreenshotPath = path.join(buildDirectory, "weapon-pickup-static-atari800.png");
  const rapidScreenshotPath = path.join(buildDirectory,
    "weapon-pickup-rapid-projectiles-atari800.png");
  const spreadScreenshotPath = path.join(buildDirectory,
    "weapon-pickup-spread-projectiles-atari800.png");
  const pickupSequencePrefix = path.join(buildDirectory, "weapon-pickup-frame");
  const pickupSequenceContactPath = path.join(buildDirectory,
    "weapon-pickup-smooth-contact.png");
  const pickupTraversalPrefix = path.join(buildDirectory, "weapon-pickup-traversal");
  const pickupTraversalContactPath = path.join(buildDirectory,
    "weapon-pickup-traversal-contact.png");
  if (!reuseExistingTraces && onlySession === undefined) {
    if (fs.existsSync(pickupScreenshotPath)) fs.unlinkSync(pickupScreenshotPath);
    if (fs.existsSync(rapidScreenshotPath)) fs.unlinkSync(rapidScreenshotPath);
    if (fs.existsSync(spreadScreenshotPath)) fs.unlinkSync(spreadScreenshotPath);
    for (let index = 0; index < 16; ++index) {
      const framePath = `${pickupSequencePrefix}-${index.toString().padStart(2, "0")}.png`;
      if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
    }
  }
  let sessionsToRun = broadsideTransientOnly
    ? broadsideTransientSessions
    : capitalPlayerCollisionOnly
    ? capitalPlayerGeometrySessions
    : smokeFrames === null
    ? [...baselineSessions, ...targetedSessions, ...cadenceSessions, ...fighterFlashSessions,
      ...debrisEffectsSessions, ...weaponPickupSessions, ...directorCompletionSessions,
      ...weaponPickupTraversalSessions, ...weaponPickupContactSessions,
      ...capitalMuzzleSessions, ...provisionalCapitalSessions, ...capitalContactSessions,
      ...memoryIntegritySessions, ...lowerPlayfieldSessions]
      .concat(engineDiagnosticSessions, engineRestartSessions,
        onlySession?.startsWith("pickup-fence-") ? pickupFenceSessions : [])
    : [{ ...baselineSessions[0], id: "observer-smoke", kind: "observer-smoke", frames: smokeFrames }];
  if (onlySession !== undefined) {
    sessionsToRun = sessionsToRun.filter(({ id }) => id === onlySession);
    invariant(sessionsToRun.length === 1, `Unknown trace session: ${onlySession}`);
  }
  for (const session of sessionsToRun) {
    const outputPath = path.join(buildDirectory, `${session.id}.csv`);
    const pickupContactPrefix = session.kind === "weapon-pickup-contact"
      ? path.join(buildDirectory, "weapon-pickup-contact-nose")
      : session.kind === "weapon-pickup-overlap"
        ? path.join(buildDirectory, "weapon-pickup-contact-edge") : undefined;
    const muzzleScreenshotPrefix = session.kind === "capital-muzzle-lifecycle"
      ? path.join(buildDirectory, "capital-muzzle-clean")
      : session.kind === "broadside-transient-lifecycle"
        ? path.join(buildDirectory, `${session.id}-frame`)
      : session.kind === "provisional-capital-cold"
        ? path.join(buildDirectory, `${session.id}-muzzle`) : undefined;
    const provisionalEntryPrefix = session.kind === "provisional-capital-cold"
      ? path.join(buildDirectory, `${session.id}-entry`) : undefined;
    const broadsideCompositorOutput = session.kind === "provisional-capital-cold" ||
      session.kind === "capital-player-geometry" || session.kind === "capital-muzzle-lifecycle" ||
      session.kind === "broadside-transient-lifecycle"
      ? path.join(buildDirectory, `${session.id}-broadside-compositor.jsonl`) : undefined;
    const capitalContactPrefix = session.kind === "capital-projectile-contact" ||
      session.kind === "lower-playfield-contact"
      ? path.join(buildDirectory, `${session.id}-frame`) : undefined;
    const capitalGeometryPrefix = session.kind === "capital-player-geometry"
      ? path.join(buildDirectory, `${session.id}-frame`) : undefined;
    const capitalScreenshotPrefix = capitalGeometryPrefix ?? capitalContactPrefix;
    if (pickupContactPrefix !== undefined && !reuseExistingTraces) {
      const basename = path.basename(pickupContactPrefix);
      for (const name of fs.readdirSync(buildDirectory)) {
        if (name.startsWith(`${basename}-`) && name.endsWith(".png"))
          fs.unlinkSync(path.join(buildDirectory, name));
      }
    }
    if (muzzleScreenshotPrefix !== undefined && !reuseExistingTraces) {
      const basename = path.basename(muzzleScreenshotPrefix);
      for (const name of fs.readdirSync(buildDirectory)) {
        if (name.startsWith(`${basename}-`) && name.endsWith(".png"))
          fs.unlinkSync(path.join(buildDirectory, name));
      }
    }
    if (session.kind === "weapon-pickup-traversal" && !reuseExistingTraces) {
      const basename = path.basename(pickupTraversalPrefix);
      for (const name of fs.readdirSync(buildDirectory)) {
        if (name.startsWith(`${basename}-`) && name.endsWith(".png"))
          fs.unlinkSync(path.join(buildDirectory, name));
      }
    }
    if (provisionalEntryPrefix !== undefined && !reuseExistingTraces) {
      const basename = path.basename(provisionalEntryPrefix);
      for (const name of fs.readdirSync(buildDirectory)) {
        if (name.startsWith(`${basename}-`) && name.endsWith(".png"))
          fs.unlinkSync(path.join(buildDirectory, name));
      }
    }
    if (capitalScreenshotPrefix !== undefined && !reuseExistingTraces) {
      const basename = path.basename(capitalScreenshotPrefix);
      for (const name of fs.readdirSync(buildDirectory)) {
        if (name.startsWith(`${basename}-`) && name.endsWith(".png"))
          fs.unlinkSync(path.join(buildDirectory, name));
      }
    }
    const environment = {
      ...process.env,
      SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
      ...addressEnvironment,
      DFTRACE_FRAMES: String(session.frames),
      DFTRACE_FIRE_DELAY: String(session.fireDelay),
      DFTRACE_DIFFICULTY: String(session.difficulty),
      DFTRACE_POLICY: session.policy,
      DFTRACE_SESSION: session.id,
      DFTRACE_OUTPUT: outputPath,
      ...(pickupFenceTrace ? {
        DFTRACE_FENCE_OUTPUT: path.join(buildDirectory, `${session.id}-fence.jsonl`),
        DFTRACE_FENCE_WAIT: String(labels.get("wait_gameplay_frame")),
        DFTRACE_FENCE_LOOP: String(labels.get("wait_frame_at_line")),
        DFTRACE_FENCE_SCREENSHOTS: "1",
      } : {}),
	  ...(session.coldFill === undefined ? {} : { DFTRACE_RAM_FILL: String(session.coldFill) }),
	  ...(session.frontendDelay === undefined ? {} : {
	    DFTRACE_FRONTEND_DELAY: String(session.frontendDelay),
	  }),
      ...(session.pauseTest ? { DFTRACE_PAUSE_TEST: "1" } : {}),
      ...(session.kind === "weapon-pickup-coverage" ? {
        DFTRACE_PICKUP_SCREENSHOT: pickupScreenshotPath,
        DFTRACE_PICKUP_SEQUENCE_PREFIX: pickupSequencePrefix,
        DFTRACE_RAPID_SCREENSHOT: rapidScreenshotPath,
        DFTRACE_SPREAD_SCREENSHOT: spreadScreenshotPath,
      } : {}),
      ...(session.kind === "weapon-pickup-traversal" ? {
        DFTRACE_PICKUP_TRAVERSAL_PREFIX: pickupTraversalPrefix,
      } : {}),
	  ...(pickupContactPrefix === undefined ? {} : {
	    DFTRACE_PICKUP_CONTACT_PREFIX: pickupContactPrefix,
	  }),
      ...(muzzleScreenshotPrefix === undefined ? {} : {
        DFTRACE_MUZZLE_SCREENSHOT_PREFIX: muzzleScreenshotPrefix,
      }),
	  ...(session.kind === "engine-first-150" ? {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: path.join(buildDirectory, session.id),
	  } : {}),
	  ...(session.kind === "lower-playfield-boundary" ? {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: path.join(buildDirectory, session.id),
	    DFTRACE_ENGINE_SCREENSHOT_LIMIT: String(session.frames),
	  } : {}),
	  ...(provisionalEntryPrefix === undefined ? {} : {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: provisionalEntryPrefix,
	  }),
	  ...(broadsideCompositorOutput === undefined ? {} : {
	    DFTRACE_BROAD_COMPOSITOR_OUTPUT: broadsideCompositorOutput,
	  }),
	  ...(capitalScreenshotPrefix === undefined ? {} : {
	    DFTRACE_CAPITAL_CONTACT_PREFIX: capitalScreenshotPrefix,
	    DFTRACE_CAPITAL_CONTACT_OWNER: String(session.contactOwner),
	    DFTRACE_CAPITAL_CONTACT_MODE: String(session.contactModeId),
	  }),
	  ...(session.kind === "engine-restart-after-game-over" ? {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: path.join(buildDirectory, session.id),
	    DFTRACE_ENGINE_SCREENSHOT_GENERATION: String(session.engineScreenshotGeneration),
	  } : {}),
    };
    if (!reuseExistingTraces || !fs.existsSync(outputPath)) {
      const artifactArguments = session.medium === "ATR" ? [atrPath] : ["-run", xexPath];
      run(emulatorPath, [
        "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
        ...artifactArguments,
      ], { env: environment });
    }
    const rows = parseCsv(fs.readFileSync(outputPath, "utf8"), session);
    if (muzzleScreenshotPrefix !== undefined &&
        session.kind !== "broadside-transient-lifecycle") {
      const basename = path.basename(muzzleScreenshotPrefix);
      const paths = fs.readdirSync(buildDirectory)
        .filter((name) => name.startsWith(`${basename}-`) && name.endsWith(".png"))
        .filter((name) => name !== `${basename}-sequence.png`)
        .sort()
        .map((name) => path.join(buildDirectory, name));
      invariant(paths.length === 64,
        `${session.id} did not capture 64 consecutive capital-muzzle rasters`);
      const activeRows = rows.filter((row) => row.active_muzzles !== 0);
      const transientCodes = new Set([0x45, 0xd0, 0x51, 0xd2]);
      const broadsideOccludesMuzzle = (row, muzzleSlot) => [0, 1, 2].some((slot) => {
        const turret = row[`broad${slot}_turret`];
        const column = turret === 0 ? 8 : turret === 1 ? 31 : -1;
        return row[`broad${slot}_state`] !== 0 && column >= 0 &&
          row[`broad${slot}_pointer`] + column === row[`muzzle${muzzleSlot}_pointer`];
      });
      const occludedRows = rows.filter((row) => [0, 1].some((slot) =>
        row[`muzzle${slot}_pointer`] !== 0 &&
        !transientCodes.has(row[`muzzle${slot}_cell`]) &&
        broadsideOccludesMuzzle(row, slot)));
      invariant(activeRows.length > 0 && [0, 1].every((slot) =>
        activeRows.some((row) => row[`muzzle${slot}_domain`] === 0) &&
        activeRows.some((row) => row[`muzzle${slot}_domain`] === 1)),
      `${session.id} did not cover fixed-divider and ring domains for both hulls`);
      invariant(rows.every((row) => {
        const legalMuzzleCodes = [0, 1].filter((slot) =>
          row[`muzzle${slot}_pointer`] !== 0 &&
          transientCodes.has(row[`muzzle${slot}_cell`])).length;
        const legalBroadsideOcclusions = [0, 1].filter((slot) =>
          row[`muzzle${slot}_pointer`] !== 0 &&
          !transientCodes.has(row[`muzzle${slot}_cell`]) &&
          broadsideOccludesMuzzle(row, slot)).length;
        return row.muzzle_illegal_cells === 0 && row.muzzle_pointer_errors === 0 &&
          row.broad_pointer_errors === 0 && row.muzzle_code_cells === legalMuzzleCodes &&
          legalMuzzleCodes + legalBroadsideOcclusions === row.active_muzzles;
      }),
      `${session.id} observed a stale muzzle/flash code or invalid derived pointer`);
      invariant(activeRows.every((row) =>
        (row.muzzle0_domain !== 1 || ![0x45, 0x51].includes(row.muzzle_divider_allied)) &&
        (row.muzzle1_domain !== 1 || ![0xd0, 0xd2].includes(row.muzzle_divider_enemy))),
      `${session.id} retained a transient on the fixed divider after ring transition`);
      const warningRows = rows.filter((row) => [0, 1, 2].some((slot) =>
        row[`broad${slot}_state`] === 1));
      const flyingRows = rows.filter((row) => [0, 1, 2].some((slot) =>
        row[`broad${slot}_state`] === 2));
      const flashRows = rows.filter((row) => [0, 1, 2].some((slot) =>
        row[`broad${slot}_flash`] !== 0));
      invariant(warningRows.length > 0 && flyingRows.length > 0 && flashRows.length > 0,
        `${session.id} did not cover warning, launch flash and flying BROADSIDE`);
      const wraps = rows.slice(1).filter((row, index) =>
        row.engine_a2_head > rows[index].engine_a2_head).length;
      invariant(wraps >= 3, `${session.id} covered only ${wraps} A2 ring wraps`);
      const sheetPath = path.join(buildDirectory, session.kind === "provisional-capital-cold" ||
        session.kind === "broadside-transient-lifecycle"
        ? `${session.id}-muzzle-sequence.png` : "capital-muzzle-clean-sequence.png");
      writeScreenshotContact(paths, sheetPath, 8);
      const transitionRows = activeRows.filter((row, index) => index === 0 ||
        row.muzzle0_domain !== activeRows[index - 1].muzzle0_domain ||
        row.muzzle1_domain !== activeRows[index - 1].muzzle1_domain);
      const evidence = {
        session: session.id,
        emulator: "Atari800 7.1.2 PAL/XL",
        production_artifact: path.relative(rootDirectory,
          session.medium === "ATR" ? atrPath : xexPath),
        frames: rows.length,
        maximum_wall_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
        ring_wraps: wraps,
        active_muzzle_frames: activeRows.length,
        warning_frames: warningRows.length,
        flash_frames: flashRows.length,
        flying_frames: flyingRows.length,
        legal_broadside_muzzle_occlusion_frames: occludedRows.length,
        maximum_muzzle_codes: Math.max(...rows.map((row) => row.muzzle_code_cells)),
        maximum_illegal_codes: Math.max(...rows.map((row) => row.muzzle_illegal_cells)),
        pointer_errors: rows.reduce((sum, row) => sum + row.muzzle_pointer_errors +
          row.broad_pointer_errors, 0),
        transitions: transitionRows.map((row) => ({
          frame: row.frame,
          ring_head: row.engine_a2_head,
          allied: {
            domain: row.muzzle0_domain, row: row.muzzle0_row,
            pointer: row.muzzle0_pointer, cell: row.muzzle0_cell,
          },
          enemy: {
            domain: row.muzzle1_domain, row: row.muzzle1_row,
            pointer: row.muzzle1_pointer, cell: row.muzzle1_cell,
          },
          divider: [row.muzzle_divider_allied, row.muzzle_divider_enemy],
        })),
        screenshot_sequence: path.relative(rootDirectory, sheetPath),
        raw_trace: path.relative(rootDirectory, outputPath),
        passed: true,
      };
      fs.writeFileSync(path.join(buildDirectory, `${session.id}-evidence.json`),
        `${JSON.stringify(evidence, null, 2)}\n`);
    }
    if (session.kind === "broadside-transient-lifecycle") {
      const launches = [0, 1].map(() => [0, 0, 0]);
      const releases = [0, 1].map(() => [0, 0, 0]);
      for (let index = 1; index < rows.length; ++index) for (let slot = 0; slot < 3; ++slot) {
        const row = rows[index];
        const previous = rows[index - 1];
        if (row[`broad${slot}_state`] === 2 && previous[`broad${slot}_state`] === 1)
          launches[row[`broad${slot}_owner`]][slot] += 1;
        if (row[`broad${slot}_state`] === 0 && previous[`broad${slot}_state`] !== 0)
          releases[previous[`broad${slot}_owner`]][slot] += 1;
      }
      const maximum = Math.max(...rows.map((row) => row.wall_cycles));
      const missed = rows.reduce((sum, row) => sum + row.missed_frames, 0);
      const extraVbi = rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0);
      const overruns = rows.filter((row) => row.wall_cycles > SHIELD_BOOSTER_HARD_GATE_CYCLES);
      const transientViolations = rows.filter((row) =>
        row.broad_screen_orphan_cells !== 0 || row.broad_screen_missing_cells !== 0 ||
        [0, 1, 2].some((slot) => row[`broad_pmg_orphan_rows${slot}`] !== 0 ||
          row[`broad_pmg_missing_rows${slot}`] !== 0) ||
        row.broad_pre_rotate_screen_transients !== 0);
      const wraps = rows.slice(1).filter((row, index) =>
        row.engine_a2_head > rows[index].engine_a2_head).length;
      invariant(launches.every((owner) => owner.reduce((sum, value) => sum + value, 0) >= 20),
        `${session.id} did not observe 20 natural launches from both owners`);
      invariant(wraps >= 100, `${session.id} covered only ${wraps} A2 ring wraps`);
      invariant(transientViolations.length === 0,
        `${session.id} violated the full-playfield transient invariant`);
      invariant(missed === 0 && extraVbi === 0 && overruns.length === 0,
        `${session.id} missed PAL timing: missed=${missed}, extra=${extraVbi}, overruns=${overruns.length}`);
      const evidencePath = path.join(buildDirectory, `${session.id}-transient-evidence.json`);
      const framePaths = fs.readdirSync(buildDirectory)
        .filter((name) => name.startsWith(`${session.id}-frame-`) && name.endsWith(".png"))
        .sort().map((name) => path.join(buildDirectory, name));
      invariant(framePaths.length === 64,
        `${session.id} did not capture its 64-frame raster sequence`);
      const sheetPath = path.join(buildDirectory, `${session.id}-muzzle-sequence.png`);
      writeScreenshotContact(framePaths, sheetPath, 8);
      fs.writeFileSync(evidencePath, `${JSON.stringify({
        schema_version: 1,
        artifact_sha256: runtimeArtifacts,
        artifact: session.medium,
        difficulty: session.difficulty === 1 ? "MEDIUM" : "HARD",
        input_replay: session.policy,
        frames: rows.length,
        launches: { allied: launches[0], hostile: launches[1] },
        releases: { allied: releases[0], hostile: releases[1] },
        ring_wraps: wraps,
        invariant: {
          actual_minus_expected_transient_cells: 0,
          expected_minus_actual_transient_cells: 0,
          pre_rotate_screen_transients: 0,
          backing_contamination: 0,
        },
        timing: {
          maximum_wall_cycles: maximum,
          gate_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES,
          gate_headroom: SHIELD_BOOSTER_HARD_GATE_CYCLES - maximum,
          missed_frames: missed,
          extra_vbi_boundaries: extraVbi,
          physical_overruns: overruns.length,
        },
        csv: path.relative(rootDirectory, outputPath),
        compositor: path.relative(rootDirectory, broadsideCompositorOutput),
        png: path.relative(rootDirectory, sheetPath),
        passed: true,
      }, null, 2)}\n`);
    }
    if (session.kind === "provisional-capital-cold") {
      const previous = (index, field) => index === 0 ? 0 : rows[index - 1][field];
      const warningStarts = [];
      const flashStarts = [];
      const launches = [];
      const shownByOwner = [0, 0];
      const warningsByOwner = [0, 0];
      const flashesByOwner = [0, 0];
      const launchesByOwner = [0, 0];
      const releasesByOwner = [0, 0];
      for (let index = 0; index < rows.length; ++index) {
        const row = rows[index];
        for (let owner = 0; owner < 2; ++owner) {
          const atNewStation = row[`muzzle${owner}_pointer`] !== 0 &&
            row[`muzzle${owner}_domain`] === 0 && row[`muzzle${owner}_row`] === 0;
          const wasAtNewStation = index !== 0 &&
            rows[index - 1][`muzzle${owner}_pointer`] !== 0 &&
            rows[index - 1][`muzzle${owner}_domain`] === 0 &&
            rows[index - 1][`muzzle${owner}_row`] === 0;
          if (atNewStation && !wasAtNewStation) shownByOwner[owner] += 1;
        }
        for (let slot = 0; slot < 3; ++slot) {
          const state = row[`broad${slot}_state`];
          const turret = row[`broad${slot}_turret`];
          if (turret !== 255 && state === 1 && previous(index, `broad${slot}_state`) !== 1) {
            warningStarts.push(row);
            warningsByOwner[turret] += 1;
          }
          if (turret !== 255 && row[`broad${slot}_flash`] > 0 &&
              previous(index, `broad${slot}_flash`) === 0) {
            flashStarts.push(row);
            flashesByOwner[turret] += 1;
          }
          if (turret !== 255 && state === 2 && previous(index, `broad${slot}_state`) === 1) {
            launches.push(row);
            launchesByOwner[turret] += 1;
          }
          const previousState = previous(index, `broad${slot}_state`);
          const previousTurret = index === 0 ? 255 : rows[index - 1][`broad${slot}_turret`];
          if (state === 0 && previousState !== 0 && previousTurret < 2)
            releasesByOwner[previousTurret] += 1;
        }
      }
      const admission = rows.find((row) => row.sector_state !== 7);
      const admissionTraceFrame = admission?.frame ?? Number.POSITIVE_INFINITY;
      const firstAllied = rows.find((row) => row.frame >= admissionTraceFrame &&
        row.capital_visible_allied_cells > 0);
      const firstEnemy = rows.find((row) => row.frame >= admissionTraceFrame &&
        row.capital_visible_enemy_cells > 0);
      const firstBoth = rows.find((row) => row.frame >= admissionTraceFrame &&
        row.capital_visible_allied_cells > 0 && row.capital_visible_enemy_cells > 0);
      const complete = admission === undefined ? undefined : rows.find((row) =>
        row.frame > admission.frame && row.sector_state === 7);
      const maximumWall = Math.max(...rows.map((row) => row.wall_cycles));
      const missed = rows.reduce((sum, row) => sum + row.missed_frames, 0);
      const extraVbi = rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0);
      const overruns = rows.filter((row) =>
        row.wall_cycles > SHIELD_BOOSTER_HARD_GATE_CYCLES).length;
      invariant(admission?.gameplay_frame === 50,
        `${session.id} first capital admission was gameplay frame ${admission?.gameplay_frame}`);
      invariant(firstAllied !== undefined && firstEnemy !== undefined && firstBoth !== undefined,
        `${session.id} did not show both capital hulls in the final displayed rows`);
      invariant(complete !== undefined,
        `${session.id} did not complete the full capital traversal`);
      invariant(warningStarts.length > 0 && flashStarts.length > 0 && launches.length > 0,
        `${session.id} observed ${warningStarts.length}/${flashStarts.length}/${launches.length} ` +
        "enemy warning/flash/launch starts");
      invariant(rows.every((row) => row.muzzle_illegal_cells === 0 &&
        row.muzzle_pointer_errors === 0 && row.broad_pointer_errors === 0),
      `${session.id} regressed tracked-muzzle legality`);
      invariant(missed === 0 && extraVbi === 0 && overruns === 0,
        `${session.id} missed PAL timing: missed=${missed}, extra=${extraVbi}, overruns=${overruns}`);
      const entryPaths = Array.from({ length: 150 }, (_, frame) =>
        `${provisionalEntryPrefix}-${String(frame).padStart(3, "0")}.png`);
      invariant(entryPaths.every((entryPath) => fs.existsSync(entryPath)),
        `${session.id} did not capture 150 cold-start entry rasters`);
      const selectedEntryPaths = [...new Set([
        48, 49, 50, 51, 52,
        Math.max(0, firstBoth.frame - 2), firstBoth.frame - 1, firstBoth.frame,
        firstBoth.frame + 1, firstBoth.frame + 2,
      ])].filter((frame) => frame >= 0 && frame < entryPaths.length)
        .map((frame) => entryPaths[frame]);
      const entrySheet = path.join(buildDirectory, `${session.id}-entry-sequence.png`);
      writeScreenshotContact(selectedEntryPaths, entrySheet, 5);
      const evidencePath = path.join(buildDirectory, `${session.id}-evidence.json`);
      const priorEvidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      const compositorEvents = fs.readFileSync(broadsideCompositorOutput, "utf8").trim()
        .split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
      const compositorFrames = compositorEvents.filter(({ event }) => event === "frame_end");
      const overlapEpisodes = [];
      const openOverlaps = new Map();
      const overlappingPairs = (frame) => {
        const result = [];
        for (const [left, right] of [[0, 1], [0, 2], [1, 2]]) {
          const first = frame.slots[left];
          const second = frame.slots[right];
          if (first.state !== 2 || second.state !== 2 || first.owner === second.owner)
            continue;
          if (first.footprint_address.some((address) => address !== 0 &&
              second.footprint_address.includes(address))) result.push([left, right]);
        }
        return result;
      };
      for (const [index, frame] of compositorFrames.entries()) {
        const currentKeys = new Set();
        for (const pair of overlappingPairs(frame)) {
          const key = pair.join("-");
          currentKeys.add(key);
          if (!openOverlaps.has(key)) openOverlaps.set(key, { pair, start: index, end: index });
          else openOverlaps.get(key).end = index;
        }
        for (const [key, episode] of openOverlaps) if (!currentKeys.has(key)) {
          overlapEpisodes.push(episode);
          openOverlaps.delete(key);
        }
      }
      overlapEpisodes.push(...openOverlaps.values());
      const passThroughEpisodes = overlapEpisodes.flatMap(({ pair, start, end }) => {
        const before = compositorFrames[start - 1];
        const overlap = compositorFrames[start];
        const after = compositorFrames[end + 1];
        if (before === undefined || after === undefined ||
            !pair.every((slot) => before.slots[slot].state === 2 &&
              overlap.slots[slot].state === 2 && after.slots[slot].state === 2)) return [];
        const continued = pair.every((slot) => {
          const owner = overlap.slots[slot].owner;
          const delta = after.slots[slot].x - overlap.slots[slot].x;
          return owner === 0 ? delta > 0 : delta < 0;
        });
        if (!continued) return [];
        const compactFrame = (frame) => ({
          frame: frame.frame,
          orphan_codes: frame.orphan_codes,
          slots: pair.map((slot) => ({
            slot,
            owner: frame.slots[slot].owner,
            state: frame.slots[slot].state,
            x: frame.slots[slot].x,
            y: frame.slots[slot].y,
            raster_x: frame.slots[slot].raster_x,
            raster_y: frame.slots[slot].raster_y,
            footprint_address: frame.slots[slot].footprint_address,
            footprint_cell: frame.slots[slot].footprint_cell,
            backing: frame.slots[slot].backing,
          })),
        });
        return [{ pair, overlap_frames: end - start + 1,
          before: compactFrame(before), overlap: compactFrame(overlap),
          after: compactFrame(after) }];
      });
      invariant(session.difficulty === 0 || passThroughEpisodes.length >= 3,
        `${session.id} observed only ${passThroughEpisodes.length} natural shell pass-throughs`);
      invariant(compositorEvents.every(({ orphan_codes }) => orphan_codes === 0),
        `${session.id} retained an orphan capital-shell glyph`);
      fs.writeFileSync(evidencePath, `${JSON.stringify({
        ...priorEvidence,
        cold_start: true,
        admission: { trace_frame: admission.frame, gameplay_frame: admission.gameplay_frame },
        first_visible: {
          allied: { trace_frame: firstAllied.frame, gameplay_frame: firstAllied.gameplay_frame },
          enemy: { trace_frame: firstEnemy.frame, gameplay_frame: firstEnemy.gameplay_frame },
          both: { trace_frame: firstBoth.frame, gameplay_frame: firstBoth.gameplay_frame },
        },
        traversal_complete: {
          trace_frame: complete.frame, gameplay_frame: complete.gameplay_frame,
        },
        observed_cycles: {
          warnings: warningStarts.map(({ frame, gameplay_frame }) => ({ frame, gameplay_frame })),
          flashes: flashStarts.map(({ frame, gameplay_frame }) => ({ frame, gameplay_frame })),
          launches: launches.map(({ frame, gameplay_frame }) => ({ frame, gameplay_frame })),
        },
        station_counts: {
          generated: [8, 12, 16][session.difficulty],
          accepted: [8, 12, 16][session.difficulty],
          shown: { allied: shownByOwner[0], enemy: shownByOwner[1] },
          warnings: { allied: warningsByOwner[0], enemy: warningsByOwner[1] },
          flashes: { allied: flashesByOwner[0], enemy: flashesByOwner[1] },
          launches: { allied: launchesByOwner[0], enemy: launchesByOwner[1] },
          releases: { allied: releasesByOwner[0], enemy: releasesByOwner[1] },
        },
        shell_pass_through: {
          episodes: passThroughEpisodes.length,
          orphan_codes: 0,
          sequences: passThroughEpisodes,
          raw_compositor_trace: path.relative(rootDirectory, broadsideCompositorOutput),
        },
        timing: {
          maximum_wall_cycles: maximumWall,
          hard_gate_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES,
          hard_gate_headroom: SHIELD_BOOSTER_HARD_GATE_CYCLES - maximumWall,
          pal_headroom: PAL_FRAME_CYCLES - maximumWall,
          missed_frames: missed, deadline_overruns: overruns, extra_vbi_boundaries: extraVbi,
        },
        entry_screenshot_sequence: path.relative(rootDirectory, entrySheet),
      }, null, 2)}\n`);
    }
    if (capitalContactPrefix !== undefined) {
      const basename = path.basename(capitalContactPrefix);
      const paths = fs.readdirSync(buildDirectory)
        .filter((name) => name.startsWith(`${basename}-`) && name.endsWith(".png"))
        .sort()
        .map((name) => path.join(buildDirectory, name));
      invariant(paths.length === 16,
        `${session.id} did not capture 16 consecutive contact rasters`);
      const damageRows = rows.filter((row) => row.capital_player_damage_calls !== 0);
      invariant(damageRows.length === 1 && damageRows[0].capital_player_damage_calls === 1,
        `${session.id} did not enter the capital damage pipeline exactly once`);
      const contactIndex = rows.indexOf(damageRows[0]);
      const before = rows[contactIndex - 1];
      const contact = rows[contactIndex];
      const after = rows[contactIndex + 1];
      invariant(before !== undefined && after !== undefined,
        `${session.id} contact is missing an adjacent trace frame`);
      const slot = [0, 1, 2].find((index) =>
        contact[`broad${index}_owner`] === session.contactOwner &&
        contact[`broad${index}_state`] === 3 &&
        (contact[`broad${index}_collision`] & 1) !== 0);
      invariant(slot !== undefined && before[`broad${slot}_state`] === 2 &&
        contact.capital_collision_calls === 1,
      `${session.id} did not transition one matching FLYING shell to IMPACT`);
      invariant(contact.player_health === 10 && contact.player_health_after === 8 &&
        contact.player_lives_after === 3 && contact.player_lifecycle_after === 0 &&
        contact.player_invulnerability_after === 0 &&
        contact.player_damage_cooldown_after === 25,
      `${session.id} did not apply exactly two HULL units through the canonical gate`);
      invariant(after.player_health === 8 && after.player_health_after === 8 &&
        after.player_damage_cooldown_after === 24 &&
        rows.slice(contactIndex + 1).every((row) => row.capital_player_damage_calls === 0),
      `${session.id} repeated damage after the projectile entered IMPACT`);
      const shellBox = {
        left: contact[`broad${slot}_raster_x`],
        right: contact[`broad${slot}_raster_x`] + 7,
        top: contact[`broad${slot}_y`] - 3,
        bottom: contact[`broad${slot}_y`] + 2,
      };
      const playerBox = {
        left: contact.player_x_after,
        right: contact.player_x_after + 15,
        top: contact.player_y_after,
        bottom: contact.player_y_after + 14,
      };
      invariant(shellBox.left <= playerBox.right && shellBox.right >= playerBox.left &&
        shellBox.top <= playerBox.bottom && shellBox.bottom >= playerBox.top,
      `${session.id} damage occurred without final-raster hitbox intersection`);
      const maximumWall = Math.max(...rows.map((row) => row.wall_cycles));
      const missed = rows.reduce((sum, row) => sum + row.missed_frames, 0);
      const extraVbi = rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0);
      const overruns = rows.filter((row) => row.wall_cycles > 32_584).length;
      invariant(missed === 0 && extraVbi === 0 && overruns === 0,
        `${session.id} missed PAL timing around projectile contact`);
      const sheetPath = path.join(buildDirectory, `${session.id}-contact-sequence.png`);
      const sheet = writeScreenshotContact(paths, sheetPath, 4);
      const frameEvidence = (row) => ({
        frame: row.frame,
        player: {
          x_before_update: row.player_x, y_before_update: row.player_y,
          x_final: row.player_x_after, y_final: row.player_y_after,
          hull_before_update: row.player_health, hull_final: row.player_health_after,
          life_final: row.player_lives_after,
          respawn_invulnerability_final: row.player_invulnerability_after,
          damage_cooldown_final: row.player_damage_cooldown_after,
        },
        projectile: {
          slot, owner: row[`broad${slot}_owner`], state: row[`broad${slot}_state`],
          logical_x: row[`broad${slot}_x`], logical_y: row[`broad${slot}_y`],
          raster_x: row[`broad${slot}_raster_x`], raster_row: row[`broad${slot}_raster_row`],
          collision_or_backing: row[`broad${slot}_collision`],
        },
        calls: {
          collision: row.capital_collision_calls,
          player_damage: row.capital_player_damage_calls,
        },
      });
      fs.writeFileSync(path.join(buildDirectory, `${session.id}-evidence.json`),
        `${JSON.stringify({
          session: session.id,
          owner: session.contactOwner === 0 ? "Allied" : "Hostile",
          emulator: "Atari800 7.1.2 PAL/XL",
          production_artifact: path.relative(rootDirectory, xexPath),
          order: "update shell -> common collision -> canonical player damage -> late render",
          damage_hull_units: 2,
          post_hit_cooldown_frames: 25,
          hitboxes: { shell: shellBox, player: playerBox },
          frames: {
            before: frameEvidence(before),
            contact: frameEvidence(contact),
            after: frameEvidence(after),
          },
          timing: {
            maximum_wall_cycles: maximumWall,
            pal_headroom: 35_568 - maximumWall,
            missed_frames: missed,
            deadline_overruns: overruns,
            extra_vbi_boundaries: extraVbi,
          },
          screenshot_sequence: sheet,
          raw_trace: path.relative(rootDirectory, outputPath),
          passed: true,
        }, null, 2)}\n`);
    }
    if (pickupContactPrefix !== undefined) {
      const basename = path.basename(pickupContactPrefix);
      const paths = fs.readdirSync(buildDirectory)
        .filter((name) => name.startsWith(`${basename}-`) && name.endsWith(".png"))
        .sort()
        .map((name) => path.join(buildDirectory, name));
      invariant(paths.length >= 8,
        `${session.id} did not capture the complete pickup/player contact window`);
      const contactRows = rows.filter((row) => row.pickup_state === 2 &&
        row.player_y >= row.pickup_y && row.player_y - row.pickup_y <= 40);
      invariant(JSON.stringify([...new Set(contactRows.map((row) =>
        row.pickup_render_phase))].sort()) === JSON.stringify([0, 2, 4, 6]),
      `${session.id} did not cover all four Hard pickup phases at player contact`);
      invariant(contactRows.every((row) => row.prior === 0 &&
        row.pickup_erase_calls === 1 && row.pickup_draw_calls === 1 &&
        row.pickup_erase_scanline > row.pickup_prev_y &&
        row.pickup_draw_scanline !== 0),
      `${session.id} changed GTIA priority or the single erase/draw lifecycle`);
      const collectionRows = rows.filter((row) => (row.events & (1 << 19)) !== 0);
      invariant(collectionRows.length === 1 && collectionRows[0].pickup_booster_state === 3 &&
        collectionRows[0].entity_active_mask === 0 && collectionRows[0].pickup_draw_calls === 0,
      `${session.id} did not collect and activate exactly once`);
      const images = paths.map((framePath) =>
        decodeAtari800Screenshot(fs.readFileSync(framePath)));
      const steelCounts = images.map((image) => countRgb(image, [13, 58, 115], {
        left: 140, top: 8, right: 164, bottom: 216,
      }));
      invariant(steelCounts.slice(0, -3).every((count) => count >= 40) &&
        steelCounts.slice(-3).every((count) => count < 40),
      `${session.id} final raster contains a cut capsule or stale post-collection footprint`);
      const sheetPath = path.join(buildDirectory,
        session.kind === "weapon-pickup-contact"
          ? "weapon-pickup-player-nose-contact.png"
          : "weapon-pickup-player-phase-overlap.png");
      const sheet = writeScreenshotContact(paths, sheetPath, Math.min(5, paths.length));
      const evidence = {
        session: session.id,
        emulator: "Atari800 7.1.2 PAL/XL",
        production_artifact: path.relative(rootDirectory, xexPath),
        frames: rows.length,
        maximum_wall_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        contact_phases: [...new Set(contactRows.map((row) => row.pickup_render_phase))].sort(),
        gtia_prior_values: [...new Set(contactRows.map((row) => row.prior))],
        collection_events: collectionRows.length,
        effect_state_after_collection: collectionRows[0].pickup_booster_state,
        missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
        contact_frames: contactRows.map((row) => ({
          frame: row.frame,
          player: { x: row.player_x, y: row.player_y },
          pickup: { x: row.pickup_x, y: row.pickup_y, phase: row.pickup_render_phase },
          order: {
            pickup_erase_scanline: row.pickup_erase_scanline,
            player_erase_scanline: row.player_erase_scanline,
            player_draw_scanline: row.player_draw_scanline,
            pickup_draw_scanline: row.pickup_draw_scanline,
          },
          addresses: Array.from({ length: 6 }, (_, index) =>
            row[`pickup_new_address${index}`]),
          glyph_codes: Array.from({ length: 6 }, (_, index) =>
            row[`pickup_new_after_draw${index}`]),
        })),
        raster_steel_pixels: steelCounts,
        screenshot_contact: sheet,
        passed: true,
      };
      fs.writeFileSync(path.join(buildDirectory, `${session.id}-evidence.json`),
        `${JSON.stringify(evidence, null, 2)}\n`);
    }
    allRows.push(...rows);
    summaries.push(sessionSummary(session, rows));
    console.log(`${session.id}: ${rows.length} frames, max ` +
      `${maximumRow(rows, (row) => row.wall_cycles).wall_cycles} wall cycles`);
  }
  if (onlySession !== undefined) {
    const focusedReportPath = path.join(buildDirectory, `${onlySession}-focused-run.json`);
    const acceptance = focusedPalAcceptance(allRows);
    fs.writeFileSync(focusedReportPath, `${JSON.stringify({
      emulator: "Atari800 7.1.2 PAL/XL",
      guest_instrumentation_bytes: 0,
      artifact_sha256: runtimeArtifacts,
      sessions: summaries,
      acceptance,
      passed: acceptance.passed,
    }, null, 2)}\n`);
    console.log(`Focused report: ${path.relative(rootDirectory, focusedReportPath)}`);
    invariant(acceptance.passed, `Focused PAL acceptance failed: ${JSON.stringify(acceptance)}`);
    return;
  }
  if (broadsideTransientOnly) {
    const reportPath = path.join(buildDirectory, "broadside-transient-report.json");
    const evidence = broadsideTransientSessions.map((session) => JSON.parse(fs.readFileSync(
      path.join(buildDirectory, `${session.id}-transient-evidence.json`), "utf8")));
    const nativeSlotCoverage = [0, 1, 2].map((slot) => ({
      slot,
      allied: evidence.some((session) => session.launches.allied[slot] !== 0),
      hostile: evidence.some((session) => session.launches.hostile[slot] !== 0),
    }));
    fs.writeFileSync(reportPath, `${JSON.stringify({
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --broadside-transient-only",
      artifact_sha256: runtimeArtifacts,
      native_slot_coverage: nativeSlotCoverage,
      slot_2_note: "The unchanged Director budget admits at most two simultaneous BROADSIDE lifecycles; executed-binary compositor tests cover slot 2 and every pair.",
      sessions: evidence,
      passed: true,
    }, null, 2)}\n`);
    console.log(`BROADSIDE transient report: ${path.relative(rootDirectory, reportPath)}`);
    return;
  }
  if (smokeFrames === null && sessionsToRun.some(({ kind }) => kind === "weapon-pickup-coverage")) {
    invariant(fs.existsSync(pickupScreenshotPath),
      "Atari800 did not render a visible Rapid Fire capsule during the pickup replay");
    invariant(fs.existsSync(rapidScreenshotPath),
      "Atari800 did not render a yellow Rapid Fire PlayerFighter projectile during the pickup replay");
    invariant(fs.existsSync(spreadScreenshotPath),
      "Atari800 did not render a three-projectile Spread Shot fan during the pickup replay");
    const sequencePaths = Array.from({ length: 16 }, (_, index) =>
      `${pickupSequencePrefix}-${index.toString().padStart(2, "0")}.png`);
    invariant(sequencePaths.every((framePath) => fs.existsSync(framePath)),
      "Atari800 did not capture all 16 consecutive pickup raster frames");
    const sequenceImages = sequencePaths.map((framePath) =>
      decodeAtari800Screenshot(fs.readFileSync(framePath)));
    const smoothCandidates = [];
    for (let initialY = 8; initialY <= sequenceImages[0].height - 46; initialY += 1) {
      const capsule = rgbTemplate(sequenceImages[0], 144, initialY, 16, 16);
      try {
        if (sequenceImages.every((frame, index) =>
          JSON.stringify(findRgbTemplate(frame, capsule)) ===
            JSON.stringify([{ x: 144, y: initialY + index * 2 }]))) {
          let colouredPixels = 0;
          for (let pixel = 0; pixel < capsule.width * capsule.height; pixel += 1) {
            if (capsule.rgb[pixel * 3] !== 4 || capsule.rgb[pixel * 3 + 1] !== 4 ||
              capsule.rgb[pixel * 3 + 2] !== 4) colouredPixels += 1;
          }
          smoothCandidates.push({ initialY, capsule, colouredPixels });
        }
      } catch (error) {
        if (error.message !== "Raster template is blank") throw error;
      }
    }
    const maximumColouredPixels = Math.max(...smoothCandidates.map(({ colouredPixels }) =>
      colouredPixels));
    const completeCandidates = smoothCandidates.filter(({ colouredPixels }) =>
      colouredPixels === maximumColouredPixels && colouredPixels >= 16);
    invariant(completeCandidates.length === 1,
      `Expected one complete smooth final-raster capsule sequence, found ` +
        `${completeCandidates.length}/${smoothCandidates.length}`);
    writeScreenshotContact(sequencePaths, pickupSequenceContactPath, 8);
  }
  if (smokeFrames === null && sessionsToRun.some(({ kind }) => kind === "weapon-pickup-traversal")) {
    const traversalPaths = [];
    for (let index = 0; index < canonicalPlayfield.ringRows; ++index) {
      const framePath = `${pickupTraversalPrefix}-${index.toString().padStart(2, "0")}.png`;
      invariant(fs.existsSync(framePath),
        `Atari800 did not capture pickup traversal position ${index}`);
      traversalPaths.push(framePath);
    }
    const traversalRows = allRows.filter(({ trace_kind: kind }) =>
      kind === "weapon-pickup-traversal");
    const firstActiveIndex = traversalRows.findIndex(({ pickup_state: state }) => state === 2);
    invariant(firstActiveIndex > 0, "Native pickup never entered ACTIVE");
    const pendingRows = traversalRows.slice(0, firstActiveIndex)
      .filter(({ pickup_state: state }) => state === 1);
    const activeRows = traversalRows.slice(firstActiveIndex)
      .slice(0, traversalRows.slice(firstActiveIndex)
        .findIndex(({ pickup_state: state }) => state !== 2));
    const expectedY = Array.from({ length: 108 }, (_, index) => 24 + index * 2);
    invariant(pendingRows.length > 0 && pendingRows.every(({ pickup_y: y }) => y === 8),
      "Native PENDING moved through visible playfield before activation");
    invariant(activeRows.length === expectedY.length &&
      JSON.stringify([...new Set(activeRows.map(({ pickup_y: y }) => y))]) ===
        JSON.stringify(expectedY),
    "Native pickup did not traverse every Hard-mode raster position at +2 scanlines/frame");
    invariant(activeRows.every((row) => row.entity_active_mask === 2 &&
      row.pickup_drawn_mask === (row.pickup_render_row === 26 ? 3 : 15) &&
      row.pickup_footprints_after === 1 &&
      row.pickup_glyph_cells_after ===
        (row.pickup_render_row === 26 ? 2 :
          row.pickup_render_phase === 0 || row.pickup_render_row >= 25 ? 4 : 6) &&
      row.pickup_draw_calls === 1),
    "Native pickup did not remain one logical slot and one phased 2x2/2x3 footprint");
    invariant(activeRows.slice(1).every((row) => Array.from({ length: 6 }, (_, index) => {
      const address = row[`pickup_old_address${index}`];
      return address < RING_SCREEN || address >= RING_END ||
        row[`pickup_old_after_erase${index}`] === row[`pickup_old_backing${index}`];
    }).every(Boolean)),
    "Native reverse erase did not restore every exact saved physical cell");
    const releaseRow = traversalRows.find(({ frame }) => frame === activeRows.at(-1).frame + 1);
    invariant(releaseRow?.pickup_state === 0 && releaseRow.pickup_y === 240 &&
      releaseRow.entity_active_mask === 0 && releaseRow.pickup_drawn_mask === 0 &&
      releaseRow.pickup_footprints_after === 0,
    "Native pickup slot was not released cleanly at the lower boundary");
    // The exact one-footprint and position assertions above come from the
    // production screen codes. These 27 native PNGs retain the complete final
    // raster, including legitimate stars/effects that can cross the 16x16 box.
    writeScreenshotContact(traversalPaths, pickupTraversalContactPath, 7);
    const evidencePath = path.join(buildDirectory, "weapon-pickup-traversal-evidence.json");
    const maximumWall = Math.max(...traversalRows.map((row) => row.wall_cycles));
    fs.writeFileSync(evidencePath, `${JSON.stringify({
      session: "weapon-pickup-traversal-2-observe-fire4",
      emulator: "Atari800 7.1.2 PAL/XL",
      production_artifact: path.relative(rootDirectory, xexPath),
      first_complete_traversal: {
        active_frames: activeRows.length,
        first_y: activeRows[0].pickup_y,
        last_y: activeRows.at(-1).pickup_y,
        release_y: releaseRow.pickup_y,
        maximum_logical_slots: Math.max(...activeRows.map((row) => row.entity_active)),
        maximum_final_footprints: Math.max(...activeRows.map((row) =>
          row.pickup_footprints_after)),
        final_draws_per_frame: [...new Set(activeRows.map((row) => row.pickup_draw_calls))],
      },
      complete_traversals_observed: traversalRows.filter((row, index) =>
        index !== 0 && row.pickup_state === 0 && traversalRows[index - 1].pickup_state === 2 &&
        row.pickup_y === canonicalPlayfield.gameplayBottom).length,
      timing: {
        maximum_wall_cycles: maximumWall,
        pal_headroom: PAL_FRAME_CYCLES - maximumWall,
        missed_frames: traversalRows.reduce((sum, row) => sum + row.missed_frames, 0),
        deadline_overruns: traversalRows.filter((row) =>
          row.wall_cycles > PAL_FRAME_CYCLES).length,
        extra_vbi_boundaries: traversalRows.reduce((sum, row) =>
          sum + row.extra_vbi_boundaries, 0),
      },
      screenshot_sequence: path.relative(rootDirectory, pickupTraversalContactPath),
      raw_trace: path.relative(rootDirectory,
        path.join(buildDirectory, "weapon-pickup-traversal-2-observe-fire4.csv")),
      passed: true,
    }, null, 2)}\n`);
  }
  if (smokeFrames === null && sessionsToRun.some(({ kind }) =>
    kind === "lower-playfield-boundary")) {
    const rows = allRows.filter(({ trace_kind: kind }) => kind === "lower-playfield-boundary");
    const top = rows.reduce((selected, row) => row.player_y < selected.player_y ? row : selected);
    const returnedBottom = rows.find((row) => row.frame > top.frame &&
      row.player_y === canonicalPlayfield.gameplayBottom - 15);
    invariant(top.player_y === 32 && returnedBottom !== undefined &&
      rows.every((row) => row.player_y >= 32 &&
        row.player_y <= canonicalPlayfield.gameplayBottom - 15),
    "Native joystick replay did not reach both opaque-PlayerFighter-safe PAL clamps");
    invariant(rows.every((row) => row.far_rendered > 0 && row.missed_frames === 0 &&
      row.extra_vbi_boundaries === 0 && row.dli_sequence_violations === 0) &&
      rows.some((row) => row.active_muzzles > 0) && rows.some((row) => row.broadside > 0),
    "Lower-playfield replay lost stars, timing, or the capital encounter");
    const selectedFrames = [0, top.frame, returnedBottom.frame, 407, rows.at(-1).frame];
    const selectedPaths = selectedFrames.map((frame) => path.join(buildDirectory,
      `lower-playfield-xex-hard-${String(frame).padStart(3, "0")}.png`));
    invariant(selectedPaths.every((screenshotPath) => fs.existsSync(screenshotPath)),
      "Lower-playfield replay is missing a selected native raster");
    const sheetPath = path.join(buildDirectory, "lower-playfield-boundary-sequence.png");
    writeScreenshotContact(selectedPaths, sheetPath, 5);
    const evidencePath = path.join(buildDirectory, "lower-playfield-boundary-evidence.json");
    fs.writeFileSync(evidencePath, `${JSON.stringify({
      session: "lower-playfield-xex-hard",
      emulator: "Atari800 7.1.2 PAL/XL",
      production_artifact: path.relative(rootDirectory, xexPath),
      canonical_raster: {
        hud: [canonicalPlayfield.hudTop, canonicalPlayfield.hudBottom - 1],
        divider: [canonicalPlayfield.gameplayTop, canonicalPlayfield.entityTop - 1],
        ring: [canonicalPlayfield.entityTop, canonicalPlayfield.gameplayBottom - 1],
        bottom_exclusive: canonicalPlayfield.gameplayBottom,
      },
      player_fighter: {
        minimum_pmg_y: top.player_y,
        minimum_frame: top.frame,
        maximum_pmg_y: returnedBottom.player_y,
        returned_maximum_frame: returnedBottom.frame,
        lowest_opaque_scanline: returnedBottom.player_y + 14,
      },
      stars: {
        minimum_visible_records: Math.min(...rows.map((row) => row.far_rendered)),
        maximum_visible_records: Math.max(...rows.map((row) => row.far_rendered)),
      },
      capital: {
        maximum_active_muzzles: Math.max(...rows.map((row) => row.active_muzzles)),
        maximum_active_broadside: Math.max(...rows.map((row) => row.broadside)),
      },
      timing: {
        maximum_wall_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        pal_headroom: PAL_FRAME_CYCLES - Math.max(...rows.map((row) => row.wall_cycles)),
        missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
        extra_vbi_boundaries: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      },
      screenshot_sequence: path.relative(rootDirectory, sheetPath),
      selected_frames: selectedFrames,
      raw_trace: path.relative(rootDirectory,
        path.join(buildDirectory, "lower-playfield-xex-hard.csv")),
      passed: true,
    }, null, 2)}\n`);
  }
  if (smokeFrames !== null) {
    console.log(`Observer smoke completed: ${smokeFrames} gameplay frames`);
    return;
  }
  if (capitalPlayerCollisionOnly) {
    const geometryEvidence = [];
    for (const session of sessionsToRun) {
      const rows = allRows.filter((row) => row.session === session.id);
      invariant(rows.length === session.frames,
        `${session.id} returned ${rows.length}/${session.frames} gameplay frames`);
      const compositorPath = path.join(buildDirectory,
        `${session.id}-broadside-compositor.jsonl`);
      const compositor = fs.readFileSync(compositorPath, "utf8").trim().split(/\n/)
        .filter(Boolean).map((line) => JSON.parse(line));
      const decisionName = session.expectedHit ? "player_aabb_hit" : "player_aabb_miss";
      let selected;
      let slot;
      let physicalEvent;
      let decision;
      for (const row of rows) {
        for (const index of [0, 1, 2]) {
          if (row[`broad${index}_owner`] !== session.contactOwner) continue;
          const candidateDecision = compositor.find((event) => event.frame === row.frame &&
            event.slot === index && event.event === decisionName);
          const candidatePhysical = compositor.find((event) => event.frame === row.frame &&
            event.slot === index && event.event === "erase_begin" &&
            event.player_physical?.valid === 1 &&
            event.slots.find((item) => item.slot === index)?.physical?.valid === 1);
          if (!candidateDecision || !candidatePhysical) continue;
          const candidateGeometry = nativeCapitalPlayerAabb(row, index, candidatePhysical);
          const horizontalGap = candidateGeometry.hit ? 0 :
            Math.max(candidateGeometry.player.left - candidateGeometry.bolt.sweep_right,
              candidateGeometry.bolt.sweep_left - candidateGeometry.player.right, 0);
          const verticalGap = candidateGeometry.hit ? 0 :
            Math.max(candidateGeometry.player.top - candidateGeometry.bolt.bottom,
              candidateGeometry.bolt.top - candidateGeometry.player.bottom, 0);
          const requestedPhysicalGeometry = session.contactMode === "top"
            ? candidateGeometry.bolt.bottom === candidateGeometry.player.top
            : session.contactMode === "middle"
              ? candidateGeometry.bolt.top === candidateGeometry.player.top + 4
              : session.contactMode === "bottom"
                ? candidateGeometry.bolt.top === candidateGeometry.player.bottom
                : candidateGeometry.bolt.bottom + 1 === candidateGeometry.player.top;
          if (candidateGeometry.hit !== session.expectedHit ||
              !requestedPhysicalGeometry ||
              (!session.expectedHit && (horizontalGap !== 0 || verticalGap !== 1))) continue;
          if (session.expectedHit && (row.capital_player_damage_calls === 0 ||
              row.player_health < 2 ||
              row.player_health_after !== row.player_health - 2 ||
              row.player_damage_cooldown_after !== 25 ||
              row[`broad${index}_state`] !== 3 ||
              (row[`broad${index}_collision`] & 1) === 0)) continue;
          if (!session.expectedHit && row.capital_player_damage_calls !== 0) continue;
          selected = row;
          slot = index;
          physicalEvent = candidatePhysical;
          decision = candidateDecision;
          break;
        }
        if (selected) break;
      }
      invariant(selected !== undefined,
        `${session.id} did not produce the requested physical ${session.contactMode} ` +
        `${session.expectedHit ? "hit" : "one-scanline miss"}`);
      const selectedIndex = rows.indexOf(selected);
      const before = rows[Math.max(0, selectedIndex - 1)];
      const after = rows[Math.min(rows.length - 1, selectedIndex + 1)];
      const geometry = nativeCapitalPlayerAabb(selected, slot, physicalEvent);
      invariant(geometry.hit === session.expectedHit,
        `${session.id} disagrees with the independent gameplay AABBs`);
      if (session.expectedHit) {
        invariant(selected.player_health >= 2 &&
          selected.player_health_after === selected.player_health - 2 &&
          selected.player_lives_after === selected.player_lives &&
          selected.player_damage_cooldown_after === 25 &&
          after.player_health_after === selected.player_health_after &&
          after.player_damage_cooldown_after === 24,
        `${session.id} bypassed the canonical HULL/cooldown lifecycle`);
      }
      const maximumWall = Math.max(...rows.map((row) => row.wall_cycles));
      const missed = rows.reduce((sum, row) => sum + row.missed_frames, 0);
      const extraVbi = rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0);
      const overruns = rows.filter((row) => row.wall_cycles > SHIELD_BOOSTER_HARD_GATE_CYCLES);
      const rasterTransientViolations = rows.filter((row) =>
        row.broad_screen_orphan_cells !== 0 || row.broad_screen_missing_cells !== 0 ||
        [0, 1, 2].some((index) => row[`broad_pmg_orphan_rows${index}`] !== 0 ||
          row[`broad_pmg_missing_rows${index}`] !== 0));
      invariant(missed === 0 && extraVbi === 0 && overruns.length === 0,
        `${session.id} exceeded the physical PAL gate`);
      invariant(rasterTransientViolations.length === 0,
        `${session.id} produced an orphan/missing ANTIC or PMG transient`);
      invariant(compositor.every((event) => event.orphan_codes === 0),
        `${session.id} left an orphan BROADSIDE glyph`);
      const invalidTransientBacking = compositor.filter((event) => event.slots.some((item) =>
        item.backing.some((byte, index) => {
          if ((byte & 0x7f) !== 126 && (byte & 0x7f) !== 127) return false;
          const address = item.footprint_address[index];
          return !event.slots.some((lower) => lower.slot < item.slot &&
            lower.state === 2 && lower.footprint_address.includes(address));
        })));
      invariant(invalidTransientBacking.length === 0,
        `${session.id} retained a bolt glyph outside a valid overlapping-slot stack`);
      invariant(decision !== undefined,
        `${session.id} is missing its executed swept-AABB decision event`);
      const basename = `${session.id}-frame`;
      const screenshots = fs.readdirSync(buildDirectory)
        .filter((name) => name.startsWith(`${basename}-`) && name.endsWith(".png"))
        .sort().map((name) => path.join(buildDirectory, name));
      invariant(screenshots.length === 32,
        `${session.id} did not retain its 32-frame native raster window`);
      const sheetPath = path.join(buildDirectory, `${session.id}-sequence.png`);
      writeScreenshotContact(screenshots, sheetPath, 8);
      const captureStartEvent = compositor.find((event) =>
        event.event === "screenshot_capture_begin");
      /* A screenshot taken on entry to gameplay frame F is the completed
       * raster produced by frame F-1.  Therefore a collision decision in S
       * belongs to the screenshot captured on entry to S+1. */
      const selectedScreenshotIndices = [before, selected, after]
        .map((row) => row.frame + 1 - captureStartEvent?.frame);
      invariant(captureStartEvent !== undefined && selectedScreenshotIndices.every((index) =>
        index >= 0 && index < screenshots.length),
      `${session.id} cannot map before/contact/after rows to native screenshots`);
      const hitboxSheetPath = path.join(buildDirectory, `${session.id}-hitboxes.png`);
      const physicalGeometryForRow = (row) => {
        const event = compositor.find((candidate) => candidate.frame === row.frame &&
          candidate.slot === slot && candidate.event === "erase_begin" &&
          candidate.player_physical?.valid === 1 &&
          candidate.slots.find((item) => item.slot === slot)?.physical?.valid === 1);
        return event ? nativeCapitalPlayerAabb(row, slot, event) : null;
      };
      const overlayGeometries = [before, selected, after].map(physicalGeometryForRow);
      invariant(overlayGeometries[1] !== null &&
        JSON.stringify(overlayGeometries[1].player) === JSON.stringify(geometry.player) &&
        JSON.stringify(overlayGeometries[1].bolt) === JSON.stringify(geometry.bolt),
      `${session.id} overlay differs from PMG/LMS/screen/glyph oracle bounds`);
      const hitboxScreenshot = writeHitboxContact(
        selectedScreenshotIndices.map((index) => screenshots[index]),
        overlayGeometries,
        hitboxSheetPath,
      );
      const compactFrame = (row) => ({
        frame: row.frame,
        player: {
          x: row.player_x_after, y: row.player_y_after,
          hull_before: row.player_health, hull_after: row.player_health_after,
          life: row.player_lives_after, cooldown: row.player_damage_cooldown_after,
        },
        projectile: {
          slot, owner: row[`broad${slot}_owner`], state: row[`broad${slot}_state`],
          logical_x: row[`broad${slot}_x`], logical_y: row[`broad${slot}_y`],
          raster_x: row[`broad${slot}_raster_x`],
          physical_row_pointer: row[`broad${slot}_pointer`],
          collision_or_backing: row[`broad${slot}_collision`],
        },
      });
      geometryEvidence.push({
        session: session.id,
        artifact: session.medium,
        difficulty: session.difficulty === 1 ? "MEDIUM" : "HARD",
        owner: session.contactOwner === 0 ? "Allied" : "Hostile",
        contact: session.contactMode,
        expected_hit: session.expectedHit,
        collision_decision: {
          branch: decisionName,
          pc: session.expectedHit ? collisionLabels.get("capital_player_collision_hit") :
            collisionLabels.get("capital_player_collision_miss"),
          clock: decision.clock,
        },
        raster_geometry: geometry,
        physical_oracle: {
          player: physicalEvent.player_physical,
          bolt: physicalEvent.slots.find((item) => item.slot === slot).physical,
        },
        frames: { before: compactFrame(before), contact: compactFrame(selected), after: compactFrame(after) },
        timing: {
          maximum_wall_cycles: maximumWall,
          gate_headroom: SHIELD_BOOSTER_HARD_GATE_CYCLES - maximumWall,
          missed_frames: missed,
          extra_vbi_boundaries: extraVbi,
          physical_overruns: overruns.length,
        },
        orphan_glyphs: 0,
        orphan_pmg_scanlines: 0,
        missing_pmg_scanlines: 0,
        transient_backing_glyphs: 0,
        screenshot_sequence: path.relative(rootDirectory, sheetPath),
        hitbox_screenshot_sequence: hitboxScreenshot,
        raw_trace: path.relative(rootDirectory,
          path.join(buildDirectory, `${session.id}.csv`)),
        compositor_trace: path.relative(rootDirectory, compositorPath),
      });
    }
    const report = {
      schema_version: 2,
      generated_by: "scripts/runtime-wall-trace.mjs --capital-player-collision-only",
      artifacts: runtimeArtifacts,
      geometry: {
        player: { width_hpos: 16, height_scanlines: 15, inclusive: true,
          source: "P0/P3 bytes + HPOSP0/HPOSP3 + SIZEP0/SIZEP3 + DMA-to-capture mapping",
          transparent_sprite_pixels_are_solid_for_gameplay: true },
        bolt: { width_hpos: 8, height_scanlines: 6, inclusive: true,
          source: "cached physical row pointer + displayed LMS + screen RAM + glyph rows 1..6",
          raster_x_alignment: "two adjacent ANTIC 4 cells" },
      },
      checkpoint_counterexample: {
        artifact: "build/runtime-wall-trace/capital-player-xex-1-allied-top-hitboxes.png",
        player_logical_y: 110,
        player_pmg_dma_rows: [110, 124],
        player_final_raster: [102, 116],
        bolt_logical_y: 108,
        bolt_physical_pointer: 0x8410,
        bolt_glyph_rows: [1, 6],
        bolt_final_raster: [113, 118],
        actual_overlap: [113, 116],
        conclusion: "the former top label was a four-scanline lower-PlayerFighter contact",
      },
      sessions: geometryEvidence,
      passed: true,
    };
    const reportBytes = `${JSON.stringify(report, null, 2)}\n`;
    fs.writeFileSync(path.join(buildDirectory, "capital-player-collision-report.json"), reportBytes);
    const durableReport = {
      ...report,
      durable_evidence: true,
      source_report_sha256: sha256(reportBytes),
      provenance: "independent physical oracle; not a byte copy of the build report",
    };
    fs.writeFileSync(path.join(rootDirectory, "docs", "capital-player-collision-trace.json"),
      `${JSON.stringify(durableReport, null, 2)}\n`);
    console.log(`Capital/player geometry: ${geometryEvidence.length} native sessions passed`);
    return;
  }
  if (onlySession !== undefined) {
    console.log(`Focused trace completed: ${onlySession}`);
    return;
  }

  const baselineRows = allRows.filter((row) => row.trace_kind === "baseline-9040");
  const targetedRows = allRows.filter((row) => row.trace_kind === "targeted-heavy-coincidence");
  const cadenceRows = allRows.filter((row) => row.trace_kind === "parallax-cadence");
  const fighterFlashRows = allRows.filter((row) => row.trace_kind === "fighter-flash-coverage");
  const debrisEffectsRows = allRows.filter((row) => row.trace_kind === "debris-effects-coverage");
  const weaponPickupRows = allRows.filter((row) => row.trace_kind === "weapon-pickup-coverage");
  const directorCompletionRows = allRows.filter((row) =>
    row.trace_kind === "director-level-complete");
  const memoryIntegrityRows = allRows.filter((row) => row.trace_kind === "memory-integrity-160s");
  const engineRows = allRows.filter((row) => row.trace_kind === "engine-first-150");
  const engineRestartRows = allRows.filter((row) =>
    row.trace_kind === "engine-restart-after-game-over");
  invariant(baselineRows.length === 9_040,
    `Baseline trace measured ${baselineRows.length}/9040 frames`);
  invariant(targetedRows.length === 920,
    `Targeted trace measured ${targetedRows.length}/920 frames`);
  const expectedCadenceFrames = cadenceSessions.reduce((sum, session) => sum + session.frames, 0);
  invariant(cadenceRows.length === expectedCadenceFrames,
    `Parallax trace measured ${cadenceRows.length}/${expectedCadenceFrames} frames`);
  invariant(fighterFlashRows.length === 1_600,
    `Fighter-flash trace measured ${fighterFlashRows.length}/1600 frames`);
  const expectedDebrisEffectsFrames = debrisEffectsSessions
    .reduce((sum, session) => sum + session.frames, 0);
  invariant(debrisEffectsRows.length === expectedDebrisEffectsFrames,
    `Debris-effects trace measured ${debrisEffectsRows.length}/${expectedDebrisEffectsFrames} frames`);
  const expectedWeaponPickupFrames = weaponPickupSessions
    .reduce((sum, session) => sum + session.frames, 0);
  invariant(weaponPickupRows.length === expectedWeaponPickupFrames,
    `Weapon-pickup trace measured ${weaponPickupRows.length}/${expectedWeaponPickupFrames} frames`);
  const expectedDirectorCompletionFrames = directorCompletionSessions
    .reduce((sum, session) => sum + session.frames, 0);
  invariant(directorCompletionRows.length === expectedDirectorCompletionFrames,
    `Director completion trace measured ${directorCompletionRows.length}/${expectedDirectorCompletionFrames} frames`);
  const directorCompletionEvidence = directorCompletionSessions.map((session) => {
    const rows = directorCompletionRows.filter((row) => row.session === session.id);
    const finalDirectorEvent = rows.findLast((row) => (row.events & (1 << 22)) !== 0);
    const finalDrain = rows.find((row) =>
      row.frame > (finalDirectorEvent?.frame ?? Number.MAX_SAFE_INTEGER) && row.sector_state === 5);
    const finalComplete = rows.find((row) =>
      row.frame > (finalDrain?.frame ?? Number.MAX_SAFE_INTEGER) && row.sector_state === 6);
    invariant(finalDirectorEvent !== undefined && finalDrain !== undefined &&
      finalComplete !== undefined && finalDrain.frame === finalDirectorEvent.frame + 1 &&
      finalComplete.frame > finalDrain.frame,
    `${session.id} did not execute BOSS_HANDOFF -> DRAIN -> COMPLETE`);
    invariant(rows.filter((row) => row.frame >= finalComplete.frame)
      .every((row) => row.sector_state === 6),
    `${session.id} re-opened the capital sector after LEVEL COMPLETE`);
    const broadsideRows = rows.filter((row) => row.broadside > 0);
    invariant(broadsideRows.length > 0,
      `${session.id} did not observe a natural BROADSIDE projectile`);
    return {
      session: session.id,
      difficulty: session.difficulty,
      boss_handoff_frame: finalDirectorEvent.frame,
      drain_frame: finalDrain.frame,
      level_complete_frame: finalComplete.frame,
      drain_frames: finalComplete.frame - finalDrain.frame,
      natural_broadside_first_frame: broadsideRows[0].frame,
      natural_broadside_last_frame: broadsideRows.at(-1).frame,
      natural_broadside_frames: broadsideRows.length,
      maximum_broadside_projectiles: Math.max(...broadsideRows.map((row) => row.broadside)),
    };
  });
  const hardDirectorCompletion = directorCompletionEvidence.find(({ difficulty }) =>
    difficulty === 2);
  const finalDirectorEvent = directorCompletionRows.find((row) =>
    row.session === hardDirectorCompletion.session &&
    row.frame === hardDirectorCompletion.boss_handoff_frame);
  const finalDrain = directorCompletionRows.find((row) =>
    row.session === hardDirectorCompletion.session && row.frame === hardDirectorCompletion.drain_frame);
  const finalComplete = directorCompletionRows.find((row) =>
    row.session === hardDirectorCompletion.session &&
    row.frame === hardDirectorCompletion.level_complete_frame);
  invariant(memoryIntegrityRows.length === 16_000,
    `XEX/ATR memory-integrity traces measured ${memoryIntegrityRows.length}/16000 frames`);
  invariant(engineRows.length === engineDiagnosticSessions.length * 150,
    `Engine startup traces measured ${engineRows.length}/${engineDiagnosticSessions.length * 150} frames`);
  invariant(engineRestartRows.length === engineRestartSessions.length * 3_200,
    `Engine restart traces measured ${engineRestartRows.length}/6400 frames`);
  for (const session of memoryIntegritySessions) {
    invariant(memoryIntegrityRows.filter((row) => row.session === session.id).length === 4_000,
      `${session.medium}/${session.policy} integrity segment did not execute 80 seconds`);
  }
  const engineSessionEvidence = engineDiagnosticSessions.map((session) => {
    const rows = engineRows.filter((row) => row.session === session.id);
    const screenshotPaths = Array.from({ length: 150 }, (_, frame) =>
      path.join(buildDirectory, `${session.id}-${String(frame).padStart(3, "0")}.png`));
    invariant(screenshotPaths.every((screenshotPath) => fs.existsSync(screenshotPath)),
      `${session.id} did not save all 150 consecutive Atari800 screenshots`);
    invariant(rows.length === 150, `${session.id} did not execute 150 gameplay frames`);
    invariant(rows[0].engine_phase === 0 && rows[0].engine_timer === 7,
      `${session.id} did not start from deterministic engine phase 0/timer 8`);
    invariant(rows.every((row) => row.engine_phase === 0 || row.engine_phase === 1),
      `${session.id} observed an engine phase outside 0..1`);
    const transitions = [];
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const row = rows[index];
      if (row.engine_phase !== previous.engine_phase) {
        invariant(previous.engine_timer === 1 && row.engine_timer === 8 &&
          row.engine_phase === (previous.engine_phase ^ 1) && row.engine_copy_calls === 1,
        `${session.id} phase transition at frame ${row.frame} was not one atomic 8-frame toggle`);
        transitions.push(row.frame);
      } else {
        invariant(row.engine_copy_calls === 0,
          `${session.id} copied engine glyphs without a phase transition at frame ${row.frame}`);
      }
    }
    invariant(transitions.length >= 18 && transitions.every((frame, index) =>
      index === 0 || frame - transitions[index - 1] === 8),
    `${session.id} did not preserve the exact 8+8 PAL engine cadence`);
    const selectedRows = rows.filter((row) => row.engine_playfield_select_calls > 0);
    invariant(selectedRows.length > 0 && selectedRows.every((row) =>
      row.engine_playfield_select_calls === 1 &&
      row.engine_playfield_select_dlist === 0x7f00 + row.engine_playfield_select_active_lo + 3),
    `${session.id} first DLI did not select byte three of the active A2 list`);
    return {
      id: session.id,
      medium: session.medium,
      cold_ram_fill: session.coldFill,
      difficulty: session.difficulty,
      start_mode: session.frontendDelay === 0 ? "immediate" : "delayed-menu",
      measured_frames: rows.length,
      first_transition_frame: transitions[0],
      transition_frames: transitions,
      phase_values: [...new Set(rows.map((row) => row.engine_phase))].sort(),
      charset_hashes: [...new Set(rows.map((row) => row.engine_charset_hash))],
      a2_heads: [...new Set(rows.map((row) => row.engine_a2_head))].sort((a, b) => a - b),
      first_recycled_base_write: rows.find((row) =>
        row.engine_first_recycled_write_pc !== 0) ? {
          frame: rows.find((row) => row.engine_first_recycled_write_pc !== 0).frame,
          pc: rows.find((row) => row.engine_first_recycled_write_pc !== 0)
            .engine_first_recycled_write_pc,
          address: rows.find((row) => row.engine_first_recycled_write_pc !== 0)
            .engine_first_recycled_write_address,
        } : null,
      screenshots: 150,
      screenshot_sequence_sha256: sha256(Buffer.concat(screenshotPaths.map((screenshotPath) =>
        fs.readFileSync(screenshotPath)))),
    };
  });
  for (const session of engineSessionEvidence.filter(({ medium }) => medium === "XEX")) {
    const peer = engineSessionEvidence.find((candidate) => candidate.medium === "ATR" &&
      candidate.cold_ram_fill === session.cold_ram_fill &&
      candidate.difficulty === session.difficulty && candidate.start_mode === session.start_mode);
    invariant(peer?.screenshot_sequence_sha256 === session.screenshot_sequence_sha256,
      `${session.id} screenshot sequence differs between XEX and ATR`);
  }
  const engineRestartEvidence = engineRestartSessions.map((session) => {
    const rows = engineRestartRows.filter((row) => row.session === session.id);
    const restartedRows = rows.filter((row) => row.gameplay_generation === 2).slice(0, 150);
    const screenshotPaths = Array.from({ length: 150 }, (_, frame) =>
      path.join(buildDirectory, `${session.id}-${String(frame).padStart(3, "0")}.png`));
    invariant(new Set(rows.map((row) => row.gameplay_generation)).has(2),
      `${session.id} did not reach a second game after GAME OVER`);
    invariant(restartedRows.length === 150,
      `${session.id} did not execute 150 frames of the restarted game`);
    invariant(restartedRows[0].engine_phase === 0 && restartedRows[0].engine_timer === 7,
      `${session.id} restarted game did not initialise engine phase 0/timer 8`);
    invariant(screenshotPaths.every((screenshotPath) => fs.existsSync(screenshotPath)),
      `${session.id} did not save 150 restarted-game screenshots`);
    const transitions = [];
    for (let index = 1; index < restartedRows.length; ++index) {
      const previous = restartedRows[index - 1];
      const row = restartedRows[index];
      if (row.engine_phase !== previous.engine_phase) {
        invariant(previous.engine_timer === 1 && row.engine_timer === 8 &&
          row.engine_phase === (previous.engine_phase ^ 1) && row.engine_copy_calls === 1,
        `${session.id} restarted cadence was not an atomic 8-frame toggle`);
        transitions.push(index);
      }
    }
    invariant(transitions.length >= 18 && transitions.every((frame, index) =>
      index === 0 || frame - transitions[index - 1] === 8),
    `${session.id} restarted game did not preserve 8+8 cadence`);
    return {
      id: session.id,
      medium: session.medium,
      cold_ram_fill: session.coldFill,
      gameplay_generations: [...new Set(rows.map((row) => row.gameplay_generation))],
      first_restarted_row: rows.findIndex((row) => row.gameplay_generation === 2),
      restarted_frames_checked: restartedRows.length,
      restarted_first_phase: restartedRows[0].engine_phase,
      restarted_first_timer: restartedRows[0].engine_timer,
      transition_frames: transitions,
      screenshots: screenshotPaths.length,
      screenshot_sequence_sha256: sha256(Buffer.concat(screenshotPaths.map((screenshotPath) =>
        fs.readFileSync(screenshotPath)))),
    };
  });
  invariant(engineRestartEvidence[0].screenshot_sequence_sha256 ===
    engineRestartEvidence[1].screenshot_sequence_sha256,
  "Restarted-game screenshot sequence differs between XEX and ATR");
  const engineContactSession = "engine-xex-a5-0-immediate";
  const engineScreenshotPath = (frame) => path.join(buildDirectory,
    `${engineContactSession}-${String(frame).padStart(3, "0")}.png`);
  const engineFirstContact = writeScreenshotContact(
    Array.from({ length: 32 }, (_, frame) => engineScreenshotPath(frame)),
    path.join(buildDirectory, "capital-engines-first-32-contact.png"), 8);
  const engineCycleContact = writeScreenshotContact(
    Array.from({ length: 32 }, (_, index) => engineScreenshotPath(23 + index)),
    path.join(buildDirectory, "capital-engines-two-cycles-contact.png"), 8);
  const engineCompactTracePath = path.join(buildDirectory, "capital-engines-first-150.csv");
  const engineCompactRows = engineRows.filter((row) => row.session === engineContactSession);
  fs.writeFileSync(engineCompactTracePath, [
    "frame,gameState,sectorPhase,worldRowAdvanced,vscroll,a2Head,logicalHullRow,enginePhase,phaseCounter,screenRow0,displayedRow0,activeRow0,alliedCells,enemyCells,firstWritePC,firstWriteAddress,firstWriteOld,firstWriteNew",
    ...engineCompactRows.map((row) => [
      row.frame, 6, row.sector_state, (row.events & 1) !== 0 ? 1 : 0,
      row.engine_vscroll, row.engine_a2_head, row.corridor_phase,
      row.engine_phase, row.engine_timer, row.engine_row0_address,
      row.engine_displayed_row0_address, row.engine_active_row0_address,
      row.engine_allied_cells, row.engine_enemy_cells, row.engine_first_write_pc,
      row.engine_first_write_address, row.engine_first_write_old, row.engine_first_write_new,
    ].join(",")),
  ].join("\n") + "\n");
  const engineRuntimeEvidence = {
    source_session: engineContactSession,
    first_32_contact: engineFirstContact,
    two_cycles_contact: engineCycleContact,
    compact_trace: {
      path: path.relative(rootDirectory, engineCompactTracePath),
      rows: engineCompactRows.length,
      bytes: fs.statSync(engineCompactTracePath).size,
      sha256: sha256(fs.readFileSync(engineCompactTracePath)),
    },
    xex_atr_screenshot_parity: true,
  };
  invariant(allRows.every((row) => row.dma_ctl === 0x3e),
    "Trace observed gameplay DMACTL other than $3E");
  invariant(allRows.every((row) => row.nmi_en === 0x80),
    "Trace observed gameplay NMIEN other than DLI-on $80");
  invariant(allRows.every((row) => row.sound_enabled === 1 && row.music_active === 1),
    "Trace observed gameplay sound or music disabled");
  invariant(allRows.some((row) => row.dli_nmis > 0), "Trace observed no DLI NMI");

  const heaviest = maximumRow(allRows, (row) => row.wall_cycles);
  const directorWorldRows = allRows.filter((row) => (row.events & (1 << 20)) !== 0);
  const directorRequestRows = allRows.filter((row) => (row.events & (1 << 21)) !== 0);
  const directorEventRows = allRows.filter((row) => (row.events & (1 << 22)) !== 0);
  invariant(directorWorldRows.length > 0 && directorRequestRows.length > 0 &&
    directorEventRows.length > 0, "Trace did not execute all observed Director paths");
  invariant((heaviest.events & ((1 << 20) | (1 << 21) | (1 << 22))) !== 0,
    "Heaviest measured frame did not include actual Director work");
  const baselineHeaviest = maximumRow(baselineRows, (row) => row.wall_cycles);
  const targetedHeaviest = maximumRow(targetedRows, (row) => row.wall_cycles);
  const targetedReferenceHeaviest = maximumRow(baselineRows.filter((row) =>
    row.session === "2-sweep-fire4"), (row) => row.wall_cycles);
  const cpuCycles = manifest.runtimeTiming.cpu_cycles_dma_off ??
    manifest.runtimeTiming.cpuDmaOff.heaviestMainLoopCycles;
  const estimatedAdditive = manifest.runtimeTiming.estimated_additive_cycles ??
    manifest.runtimeTiming.fullPalFrame.conservativeCycles;
  cpuReferenceByFrame = new Map((manifest.runtimeTiming.cpuReferenceFrames ?? []).map((frame) => [
    `${frame.session}:${frame.frame}`,
    frame,
  ]));
  const topTenBaseline = [...baselineRows]
    .sort((left, right) => right.wall_cycles - left.wall_cycles)
    .slice(0, 10)
    .map((row) => frameState(row, true));
  const topFiveAll = [...allRows]
    .sort((left, right) => right.wall_cycles - left.wall_cycles)
    .slice(0, 5)
    .map((row) => frameState(row));
  const deadlineOverruns = allRows.filter((row) => row.missed_frames > 0);
  const baselineDeadlineOverruns = baselineRows.filter((row) => row.missed_frames > 0);
  const targetedDeadlineOverruns = targetedRows.filter((row) => row.missed_frames > 0);
  const dliSequenceViolations = Math.max(...allRows.map((row) =>
    row.dli_sequence_violations));
  const maximumDlisPerHostFrame = Math.max(...allRows.map((row) =>
    row.maximum_dlis_per_host_frame));
  invariant(dliSequenceViolations === 0,
    `DLI phase/order violations observed: ${dliSequenceViolations}`);
  invariant(maximumDlisPerHostFrame <= 2,
    `More than two gameplay DLIs occurred in one host frame: ${maximumDlisPerHostFrame}`);
  const integrityByMedium = Object.fromEntries(["XEX", "ATR"].map((medium) => [
    medium,
    memoryIntegrityRows.filter((row) => row.session.includes(`-${medium.toLowerCase()}-`)),
  ]));
  const integrityState = (row) => [
    row.gameplay_frame, row.events, row.projectiles, row.broadside, row.live_interceptor,
    row.entity_active_mask, row.entity_x, row.entity_y, row.entity_render_id,
    row.effect_active_mask, row.pickup_state, row.pickup_booster_state,
    row.pickup_counter, row.pickup_x,
    row.pickup_y, row.pickup_timer_lo, row.pickup_timer_hi, row.score_lo, row.score_hi,
    row.rapid_projectiles, row.player_fighter_projectiles,
  ];
  invariant(integrityByMedium.XEX.every((row, index) =>
    JSON.stringify(integrityState(row)) === JSON.stringify(integrityState(integrityByMedium.ATR[index]))),
  "XEX and ATR 160-second memory-integrity state traces diverged");
  const integrityCollections = memoryIntegrityRows.filter((row) =>
    (row.events & (1 << 19)) !== 0);
  invariant(integrityCollections.length >= 10,
    `Long XEX/ATR traces completed only ${integrityCollections.length}/10 weapon-booster cycles`);
  const integrityPauseRows = memoryIntegrityRows.filter((row) => row.pause_test_completed !== 0);
  invariant(["XEX", "ATR"].every((medium) => integrityPauseRows.some((row) =>
    row.session.includes(`-${medium.toLowerCase()}-`) &&
      row.pause_timer_before === row.pause_timer_after &&
      row.pause_engine_timer_before === row.pause_engine_timer_after &&
      row.pause_engine_phase_before === row.pause_engine_phase_after &&
      row.pause_host_frames >= 25)),
  "XEX/ATR integrity replay did not freeze Spread Shot and engine cadence across OPTION pause");
  const maximumBroadside = Math.max(...allRows.map((row) => row.broadside));
  const emptyEntityRows = allRows.filter((row) => row.entity_active === 0 &&
    row.pickup_state === 0 &&
    row.effect_active_count === 0 &&
    (row.events & ((1 << 7) | (1 << 13) | (1 << 17))) === 0);
  const activeEntityRows = allRows.filter((row) => (row.entity_active_mask & 1) !== 0 &&
    (row.events & (1 << 8)) === 0);
  const spawnRows = allRows.filter((row) => (row.events & (1 << 7)) !== 0);
  const contactRows = allRows.filter((row) => (row.events & (1 << 8)) !== 0);
  const despawnRows = allRows.filter((row) => (row.events & (1 << 9)) !== 0);
  const shotRows = allRows.filter((row) => (row.events & (1 << 12)) !== 0);
  const effectSpawnRows = allRows.filter((row) => (row.events & (1 << 13)) !== 0);
  const interceptorBreakupRows = allRows.filter((row) => (row.events & (1 << 17)) !== 0);
  const pickupQualifiedKillRows = weaponPickupRows.filter((row) =>
    (row.events & (1 << 18)) !== 0);
  // The deterministic pickup showcase proves capsule/render semantics, while
  // the longer XEX/ATR integrity replays prove every booster mode and at least
  // three distinct collections. Admission ownership can legitimately move a
  // later collection beyond the showcase window, so lifecycle coverage is the
  // union of both real production traces.
  const pickupModeRows = [...weaponPickupRows, ...memoryIntegrityRows];
  const pickupCollectRows = pickupModeRows.filter((row) =>
    (row.events & (1 << 19)) !== 0);
  const pickupPendingRows = weaponPickupRows.filter((row) => row.pickup_state === 1);
  const pickupActiveRows = weaponPickupRows.filter((row) => row.pickup_state === 2);
  const pickupHasEffectOverlay = (row) => {
    const addresses = Array.from({ length: 6 }, (_, index) =>
      row[`pickup_new_address${index}`]);
    if (row.effect_rendered_mask === 0) return false;
    if (addresses.includes(row.pickup_first_overwrite_address)) return true;
    // On the first visible pickup frame the watcher still owns the pending
    // frame's empty address set, so a later effect overlay cannot populate
    // pickup_first_overwrite_address. Accept only the exact one-cell overlay:
    // the other three cells must contain their expected pickup glyphs and the
    // replacement must be an effect-bank screen code.
    const validIndexes = addresses.flatMap((address, index) =>
      address >= RING_SCREEN && address < RING_END ? [index] : []);
    const mismatches = validIndexes.flatMap((index) => {
      const value = row[`pickup_new_after_draw${index}`];
      const expected = (row.pickup_render_id + index) & 0xff;
      return value === expected ? [] : [{ value, index }];
    });
    return mismatches.length > 0 && mismatches.every(({ value }) => value >= 0x80);
  };
  const pickupRapidRows = pickupModeRows.filter((row) => row.pickup_booster_state === 3);
  const pickupSpreadRows = pickupModeRows.filter((row) => row.pickup_booster_state === 4);
  const pickupShieldRows = pickupModeRows.filter((row) => row.pickup_booster_state === 5);
  const pickupActiveTransitions = pickupActiveRows.flatMap((row) => {
    const previous = weaponPickupRows.find((candidate) => candidate.session === row.session &&
      candidate.frame === row.frame - 1 && candidate.pickup_state === 2);
    return previous === undefined ? [] : [{ previous, row }];
  });
  let pickupMaximumStationaryRun = 0;
  let pickupStationaryRun = 0;
  let pickupPreviousTransition = null;
  for (const { previous, row } of pickupActiveTransitions) {
    if (pickupPreviousTransition === null ||
      previous.session !== pickupPreviousTransition.session ||
      previous.frame !== pickupPreviousTransition.frame) pickupStationaryRun = 0;
    if (row.pickup_y === previous.pickup_y) pickupStationaryRun += 1;
    else pickupStationaryRun = 0;
    pickupMaximumStationaryRun = Math.max(pickupMaximumStationaryRun,
      pickupStationaryRun);
    pickupPreviousTransition = row;
  }
  const rapidProjectileRows = weaponPickupRows.filter((row) => row.rapid_projectiles > 0);
  const spreadVolleyRows = weaponPickupRows.filter((row) =>
    row.pickup_booster_state === 4 && row.player_fighter_projectiles >= 3);
  const activeCapsuleThreeProjectileRows = weaponPickupRows.filter((row) =>
    row.pickup_state === 2 && row.player_fighter_projectiles >= 3);
  const activeCapsuleDuringBoosterRows = pickupModeRows.filter((row) =>
    row.pickup_state === 2 && row.pickup_booster_state >= 3);
  // The projectile's screen code follows its 0..7 vertical phase and one of
  // four HPOS sub-cell variants. Every PlayerFighter code keeps D7 clear so selector 3
  // stays on the yellow COLPF2 bank; $0f is only one valid phase.
  const rapidProjectileVisibleRows = rapidProjectileRows.filter((row) =>
    (row.rapid_projectile_screen_code & 0x80) === 0 &&
      row.rapid_projectile_screen_code >= 11 &&
      row.rapid_projectile_screen_code < 47 &&
      row.rapid_projectile_address >= RING_SCREEN && row.rapid_projectile_address < RING_END);
  const rapidScreenshotRow = rapidProjectileVisibleRows.find((row) =>
    row.rapid_projectiles >= 3 && row.effect_active_count === 0);
  const spreadScreenshotRow = spreadVolleyRows.find((row) => row.effect_active_count === 0);
  const pickupScreenshotCandidates = pickupActiveRows.filter((row) =>
    row.entity_active_mask === 2 && (row.pickup_drawn_mask & 15) === 15 &&
      row.effect_active_count === 0);
  const pickupScreenshotRow = pickupScreenshotCandidates.find((row, index, rows) =>
    index > 0 && rows[index - 1].frame + 1 === row.frame);
  const capsuleTripleHeaviest = maximumRow(activeCapsuleThreeProjectileRows,
    (row) => row.wall_cycles);
  const pickupPendingRuns = [];
  let pickupPendingRun = [];
  for (const row of weaponPickupRows) {
    if (row.pickup_state === 1) pickupPendingRun.push(row);
    else if (pickupPendingRun.length > 0) {
      pickupPendingRuns.push(pickupPendingRun);
      pickupPendingRun = [];
    }
  }
  if (pickupPendingRun.length > 0) pickupPendingRuns.push(pickupPendingRun);
  const pickupPendingTransitions = pickupPendingRuns.map((run) => ({
    run,
    next: weaponPickupRows.find((row) => row.session === run.at(-1).session &&
      row.frame === run.at(-1).frame + 1),
  }));
  const pickupCompletedPendingRuns = pickupPendingTransitions.filter(({ next }) =>
    next?.pickup_state === 2);
  const pickupCreatedRenderIds = pickupPendingRuns.map((run) => run[0].pickup_render_id);
  const rowsBySessionFrame = new Map(allRows.map((row) => [
    `${row.session}:${row.frame}`, row,
  ]));
  const pickupReleaseRows = weaponPickupRows.filter((row) => row.pickup_state !== 2 &&
    rowsBySessionFrame.get(`${row.session}:${row.frame - 1}`)?.pickup_state === 2);
  const pickupPhysicalAddressChanges = pickupActiveTransitions.filter(({ previous, row }) =>
    Array.from({ length: 6 }, (_, index) => row[`pickup_new_address${index}`] !==
      previous[`pickup_new_address${index}`]).some(Boolean)).length;
  const interceptorFlashPairs = interceptorBreakupRows.filter((row) => {
    const deathFrame = rowsBySessionFrame.get(`${row.session}:${row.frame - 1}`);
    return deathFrame?.colbk === 0x1e && row.colbk === 0x3c;
  });
  const fullEffectRows = allRows.filter((row) =>
    row.effect_active_mask === 0x1f && row.effect_active_count === 5);
  const bottomDespawnRows = despawnRows.filter((row) =>
    (row.events & ((1 << 8) | (1 << 12))) === 0);
  invariant(emptyEntityRows.length > 0, "Trace did not observe the empty entity/effects path");
  invariant(activeEntityRows.length > 0, "Trace did not observe one active debris");
  invariant(spawnRows.length > 0, "Trace did not observe debris spawn");
  invariant(contactRows.length > 0, "Trace did not observe successful debris contact");
  invariant(bottomDespawnRows.length > 0,
    "Trace did not observe debris leaving the bottom after ring/world advancement");
  invariant(shotRows.length > 0,
    "Trace did not observe a PlayerFighter projectile destroying active debris");
  invariant(shotRows.some((row) => row.sector_state === 7),
    "Trace did not observe a PlayerFighter projectile destroying post-capital debris");
  invariant(effectSpawnRows.length > 0,
    "Trace did not execute the debris destruction effect spawner");
  invariant(fullEffectRows.length > 0,
    "Trace did not observe one core plus four active fragments");
  invariant(effectSpawnRows.every((row) =>
    row.effect_active_mask === 0x1f && row.effect_active_count === 5 &&
    (row.events & (1 << 15)) !== 0 && (row.events & (1 << 16)) !== 0),
  "Final-hit frame did not update and render all five spawned effects");
  invariant(fullEffectRows.some((row) => (row.events & (1 << 14)) !== 0),
    "Active debris fragments were never erased on the following frame");
  invariant(effectSpawnRows.some((row) => row.sector_state === 7),
    "Trace did not spawn the five-slot destruction effect after the capital sector");
  invariant(interceptorBreakupRows.length > 0,
    "Trace did not execute the Interceptor breakup spawner");
  invariant(interceptorBreakupRows.every((row) =>
    row.effect_active_mask === 0x1f && row.effect_active_count === 5 &&
    (row.events & ((1 << 15) | (1 << 16))) === ((1 << 15) | (1 << 16))),
  "Interceptor death did not update and render all five local effects in its spawn frame");
  invariant(interceptorFlashPairs.length > 0,
    "Trace did not preserve the accepted yellow-to-red full-screen flash across deferred breakup");
  invariant(pickupQualifiedKillRows.length >= 3,
    "Atari800 replay did not execute three qualifying Interceptor projectile deaths");
  invariant(pickupCompletedPendingRuns.length > 0 &&
    pickupCompletedPendingRuns.every(({ run }) => {
      const pendingFrames = run.length - 1;
      return pendingFrames >= 30 && (pendingFrames - 30) % 8 === 0;
    }) &&
    pickupPendingTransitions.every(({ run, next }) => next === undefined ||
      next.pickup_state === 2 ||
      next.pickup_state === next.pickup_booster_state),
  `Atari800 pending spans/transitions were ${pickupPendingTransitions.map(({ run, next }) =>
    `${run.length - 1}->${next?.pickup_state ?? "end"}`).join(",")}; completed spans must be ` +
    "the 30-frame base delay plus bounded eight-frame director retries");
  invariant(pickupPendingRows.every((row) =>
    (row.entity_active_mask & 2) === 0 && (row.pickup_drawn_mask & 15) === 0),
  "Pending weapon pickup became visible or interactive");
  invariant(pickupActiveRows.length > 0 && pickupActiveRows.every((row) =>
      (row.entity_active_mask & 2) !== 0 && (row.pickup_drawn_mask & 15) === 15 &&
      (row.pickup_render_id === 120 || row.pickup_render_id === 248)),
  "Atari800 replay did not continuously draw one phased Rapid/Spread/Shield render ID");
  invariant(pickupActiveRows.every((row) =>
    row.pickup_footprints_before <= 1 && row.pickup_footprints_after === 1 &&
      row.pickup_glyph_cells_before <= 6 && row.pickup_glyph_cells_after <= 6 &&
      row.pickup_glyph_cells_after >= 0 && row.pickup_draw_calls === 1 &&
      (row.pickup_glyph_cells_after ===
        (row.pickup_render_phase === 0 || row.pickup_render_row >= 20 ? 4 : 6) ||
        pickupHasEffectOverlay(row))),
  "Atari800 replay observed a duplicate/partial phased footprint or missed the final draw");
  invariant(pickupActiveTransitions.every(({ previous, row }) =>
    row.pickup_x === previous.pickup_x &&
      row.pickup_y === previous.pickup_y + 2),
  "Hard booster raster motion changed X or deviated from +2 scanlines/frame");
  invariant(pickupMaximumStationaryRun === 0,
    `Booster native-ring motion held for ${pickupMaximumStationaryRun} active frames`);
  invariant(pickupReleaseRows.length > 0 && pickupReleaseRows.every((row) =>
    row.pickup_erase_calls === 1 && row.pickup_footprints_after === 0 &&
      row.pickup_glyph_cells_after === 0),
  "Booster release did not restore its exact single resident footprint in the release frame");
  invariant(pickupScreenshotRow,
    "Atari800 replay did not reach the isolated static pickup screenshot state");
  invariant(pickupCollectRows.length >= 3 && pickupRapidRows.length > 0 &&
    pickupSpreadRows.length > 0 && pickupShieldRows.length > 0 &&
    pickupCollectRows.every((row, index, rows) =>
      index === 0 || row.session !== rows[index - 1].session ||
        row.frame > rows[index - 1].frame + 1),
  "Atari800 replay did not collect each visible pickup once and enter all booster modes");
  invariant(pickupCreatedRenderIds.length >= 3 &&
    pickupCreatedRenderIds.every((renderId, index) => renderId === [120, 248, 120][index % 3]),
  `Atari800 created capsule cycle was ${pickupCreatedRenderIds.join("→")}, expected 120→248→120 rotation`);
  invariant(pickupRapidRows[0].pickup_timer_lo === 0xf4 &&
    pickupRapidRows[0].pickup_timer_hi === 1,
  "Atari800 replay did not load the exact 500-frame Rapid Fire timer");
  invariant(pickupSpreadRows[0].pickup_timer_lo === 0xf4 &&
    pickupSpreadRows[0].pickup_timer_hi === 1,
  "Atari800 replay did not load the exact 500-frame Spread Shot timer");
  invariant(pickupShieldRows[0].pickup_timer_lo === 0xfa &&
    pickupShieldRows[0].pickup_timer_hi === 0,
  "Atari800 replay did not load the exact 250-frame Shield timer");
  invariant(rapidProjectileRows.length > 0 && rapidProjectileRows.every((row) =>
    row.rapid_projectile_slot < 10 && row.pickup_booster_state === 3) &&
    rapidProjectileVisibleRows.length > 0,
  "Atari800 replay did not preserve yellow Rapid Fire projectile screen codes");
  invariant(rapidScreenshotRow,
    "Atari800 replay did not isolate three visible yellow Rapid Fire projectiles without transient effects");
  invariant(spreadVolleyRows.length > 0,
    "Atari800 replay did not execute a logical three-projectile Spread volley");
  invariant(spreadScreenshotRow,
    "Atari800 replay did not isolate a visible three-projectile Spread fan");
  invariant(activeCapsuleThreeProjectileRows.length > 0,
    "Atari800 replay did not observe three PlayerFighter projectiles with one active capsule");
  invariant(activeCapsuleDuringBoosterRows.length > 0,
    "Atari800 replay did not create a collectible capsule during an active booster");
  const emptyEntityMaximum = maximumRow(emptyEntityRows, (row) => row.wall_cycles);
  const activeEntityMaximum = maximumRow(activeEntityRows, (row) => row.wall_cycles);
  const spawnMaximum = maximumRow(spawnRows, (row) => row.wall_cycles);
  const contactMaximum = maximumRow(contactRows, (row) => row.wall_cycles);
  const shotMaximum = maximumRow(shotRows, (row) => row.wall_cycles);
  const enemyBreakupTargetOverruns = allRows.filter((row) =>
    row.wall_cycles > ENEMY_BREAKUP_TARGET_GATE_CYCLES);
  const enemyBreakupHardOverruns = allRows.filter((row) =>
    row.wall_cycles > ENEMY_BREAKUP_HARD_GATE_CYCLES);
  const spreadShotTargetOverruns = allRows.filter((row) =>
    row.wall_cycles > SPREAD_SHOT_TARGET_GATE_CYCLES);
  const spreadShotHardOverruns = allRows.filter((row) =>
    row.wall_cycles > SPREAD_SHOT_HARD_GATE_CYCLES);
  const shieldBoosterTargetOverruns = allRows.filter((row) =>
    row.wall_cycles > SHIELD_BOOSTER_TARGET_GATE_CYCLES);
  const shieldBoosterHardOverruns = allRows.filter((row) =>
    row.wall_cycles > SHIELD_BOOSTER_HARD_GATE_CYCLES);
  const noActiveDebrisPathDelta =
    manifest.runtimeTiming.destructibleDebris.noActiveDebrisPathDeltaCpuCycles;
  const noActivePlayerFighterPathDelta =
    manifest.runtimeTiming.destructibleDebris.noActivePlayerFighterProjectilePathDeltaCpuCycles;
  invariant(noActiveDebrisPathDelta <= 32,
    "Linked no-active-debris path exceeded its +32-cycle limit");
  invariant(noActivePlayerFighterPathDelta <= 48,
    "Linked no-active-PlayerFighter-projectile path exceeded its +48-cycle limit");
  const activeDebrisRows = activeEntityRows.filter((row) =>
    row.entity_render_id >= manifest.entityEffects.glyphIndex &&
      row.entity_render_id < manifest.entityEffects.glyphIndex +
        manifest.entityEffects.debrisGlyphCount);
  const activeGlyphOffsets = activeDebrisRows
    .map((row) => row.entity_render_id - manifest.entityEffects.glyphIndex);
  const observedVariants = [...new Set(activeGlyphOffsets.map((offset) => offset >> 2))].sort();
  const observedPhases = [...new Set(activeGlyphOffsets.map((offset) => offset >> 1 & 1))].sort();
  const observedTrajectories = [...new Set(activeDebrisRows.map((row) =>
    row.entity_vx < 0x80 ? row.entity_vx : row.entity_vx - 0x100))].sort((a, b) => a - b);
  invariant(observedVariants.join(",") === "0,1", "Trace did not observe both debris variants");
  invariant(observedPhases.join(",") === "0,1", "Trace did not observe both tumbling phases");
  invariant(observedTrajectories.join(",") === "-4,0,4",
    "Release replay did not observe all three deterministic debris trajectories");
  invariant(activeDebrisRows.every((row) => row.entity_x >= 84 && row.entity_x + 8 <= 172),
    "Trace observed debris outside the source-derived inner corridor");
  const postCapitalActiveRows = allRows.filter((row) =>
    row.sector_state === 7 && (row.entity_active_mask & 1) !== 0);
  invariant(allRows.some((row) => row.sector_state === 6),
    "Trace did not observe capital-sector COMPLETE reconstruction");
  invariant(postCapitalActiveRows.length > 0,
    "Trace did not observe active debris after the capital sector");
  let postCapitalTransition = null;
  for (const session of new Set(allRows.map((row) => row.session))) {
    const rows = allRows.filter((row) => row.session === session);
    const drainIndex = rows.findIndex((row) => row.sector_state === 5);
    const completeIndex = rows.findIndex((row, index) =>
      index > drainIndex && row.sector_state === 6);
    const openIndex = rows.findIndex((row, index) =>
      index > completeIndex && row.sector_state === 7);
    const spawnIndex = rows.findIndex((row, index) =>
      index >= openIndex && row.sector_state === 7 && (row.events & (1 << 7)) !== 0);
    const activeIndex = rows.findIndex((row, index) =>
      index > spawnIndex && row.sector_state === 7 && row.entity_active === 1);
    if (drainIndex > 0 && completeIndex > drainIndex && openIndex > completeIndex &&
        spawnIndex >= openIndex && activeIndex > spawnIndex &&
        rows.slice(0, drainIndex).some((row) => row.sector_state < 5)) {
      postCapitalTransition = {
        session,
        open_gameplay_frame: rows.slice(0, drainIndex).find((row) => row.sector_state < 5).frame,
        drain_frame: rows[drainIndex].frame,
        complete_frame: rows[completeIndex].frame,
        next_open_frame: rows[openIndex].frame,
        post_capital_spawn_frame: rows[spawnIndex].frame,
        post_capital_spawn_active_frame: rows[activeIndex].frame,
        configured_spawn_delay_scheduler_ticks: 32,
        observable_open_to_spawn_frame_delta:
          rows[spawnIndex].frame - rows[openIndex].frame,
      };
      break;
    }
  }
  invariant(postCapitalTransition !== null,
    "Trace did not observe open gameplay -> DRAIN -> COMPLETE -> next OPEN -> active debris");
  const verticalCadence = {
    active_transitions: 0,
    world_events: 0,
    vertical_steps: 0,
    held_events: 0,
    invalid_transitions: 0,
  };
  const isCompletedDebrisRow = (row) => (row.entity_active_mask & 1) !== 0 &&
    row.entity_render_id >= manifest.entityEffects.glyphIndex &&
    row.entity_render_id < manifest.entityEffects.glyphIndex +
      manifest.entityEffects.debrisGlyphCount;
  for (let index = 1; index < allRows.length; index += 1) {
    const previous = allRows[index - 1];
    const current = allRows[index];
    if (previous.session !== current.session || !isCompletedDebrisRow(previous) ||
        !isCompletedDebrisRow(current)) continue;
    verticalCadence.active_transitions += 1;
    // End-of-frame snapshots attribute each state transition to current.events.
    const worldAdvanced = (current.events & (1 << 0)) !== 0;
    if (!worldAdvanced) {
      if (previous.entity_vertical_accumulator !== current.entity_vertical_accumulator ||
          previous.entity_y !== current.entity_y || previous.entity_x !== current.entity_x ||
          previous.entity_render_id !== current.entity_render_id) {
        verticalCadence.invalid_transitions += 1;
      }
      continue;
    }
    verticalCadence.world_events += 1;
    let expectedAccumulator = previous.entity_vertical_accumulator + 3;
    const moved = expectedAccumulator >= 5;
    if (moved) expectedAccumulator -= 5;
    const expectedY = previous.entity_y + (moved ? 8 : 0);
    const offset = previous.entity_render_id - manifest.entityEffects.glyphIndex;
    const expectedGlyph = manifest.entityEffects.glyphIndex +
      (offset & 2 ? offset - 2 : offset + 2);
    let expectedMoveAccumulator = previous.entity_move_accumulator;
    let expectedX = previous.entity_x;
    const vx = previous.entity_vx < 0x80 ? previous.entity_vx : previous.entity_vx - 0x100;
    if (vx !== 0) {
      expectedMoveAccumulator += 1;
      if (expectedMoveAccumulator === 4) {
        expectedMoveAccumulator = 0;
        expectedX += vx;
      }
    }
    if (current.entity_vertical_accumulator !== expectedAccumulator ||
        current.entity_y !== expectedY || current.entity_render_id !== expectedGlyph ||
        current.entity_move_accumulator !== expectedMoveAccumulator ||
        current.entity_x !== expectedX) {
      verticalCadence.invalid_transitions += 1;
    }
    if (moved) verticalCadence.vertical_steps += 1;
    else verticalCadence.held_events += 1;
  }
  invariant(verticalCadence.world_events > 0 && verticalCadence.vertical_steps > 0 &&
    verticalCadence.held_events > 0 && verticalCadence.invalid_transitions === 0,
  "Trace did not preserve the exact debris 3/5 vertical cadence");

  const expectedLayerSpeeds = [
    { difficulty: 0, world: 20, near: 20, far: 5, debris: 12 },
    { difficulty: 1, world: 22.5, near: 22.5, far: 5.625, debris: 13.5 },
    { difficulty: 2, world: 25, near: 25, far: 6.25, debris: 15 },
  ];
  const parallaxCadence = expectedLayerSpeeds.map((expected) => {
    const rows = cadenceRows.filter((row) => row.difficulty === expected.difficulty);
    const seconds = rows.length / 50;
    const worldSteps = rows.filter((row) => (row.events & (1 << 0)) !== 0).length;
    const nearSteps = rows.filter((row) => (row.events & (1 << 10)) !== 0).length;
    const farSteps = rows.filter((row) => (row.events & (1 << 11)) !== 0).length;
    const measured = {
      world: worldSteps / seconds,
      near: nearSteps / seconds,
      far: farSteps / seconds,
      debris: worldSteps / seconds * 3 / 5,
    };
    invariant(measured.world === expected.world && measured.near === expected.near &&
      measured.far === expected.far && measured.debris === expected.debris,
    `Difficulty ${expected.difficulty} parallax cadence diverged from its exact trace rate`);

    let spawnFrame = null;
    const flightFrames = [];
    for (const row of rows) {
      if ((row.events & (1 << 7)) !== 0) spawnFrame = row.frame;
      if (spawnFrame !== null && (row.events & ((1 << 8) | (1 << 12))) !== 0) {
        spawnFrame = null;
      }
      if (spawnFrame !== null && (row.events & (1 << 9)) !== 0 &&
          (row.events & ((1 << 8) | (1 << 12))) === 0) {
        flightFrames.push(row.frame - spawnFrame);
        spawnFrame = null;
      }
    }
    return {
      difficulty: expected.difficulty,
      measured_frames: rows.length,
      measured_seconds: seconds,
      world_steps: worldSteps,
      near_steps: nearSteps,
      far_steps: farSteps,
      measured_rows_per_second: measured,
      full_debris_flight_frames: flightFrames,
      full_debris_flight_seconds: flightFrames.map((frames) => frames / 50),
    };
  });

  const enemyFlashSequence = [0x1e, 0x3c, 0x1c, 0x34];
  const playerFlashSequence = [0x1e, 0x3c, 0x1c, 0x3c, 0x38, 0x34];
  const enemyFlashRows = fighterFlashRows.filter((row) =>
    row.player_lifecycle === 0 && row.player_fighter_explosion_timer < 19 &&
      row.enemy_explosion_timer >= 21);
  const playerFlashRows = fighterFlashRows.filter((row) => row.player_fighter_explosion_timer >= 19);
  invariant([...new Set(enemyFlashRows.map((row) => row.enemy_explosion_timer))]
    .sort((left, right) => right - left).join(",") === "24,23,22,21",
  "PAL trace did not observe every enemy fighter flash timer value");
  invariant([...new Set(playerFlashRows.map((row) => row.player_fighter_explosion_timer))]
    .sort((left, right) => right - left).join(",") === "24,23,22,21,20,19",
  "PAL trace did not observe every PlayerFighter death flash timer value");
  invariant(enemyFlashRows.every((row) =>
    row.colbk === enemyFlashSequence[24 - row.enemy_explosion_timer]),
  "PAL trace observed an incorrect enemy fighter COLBK sequence");
  invariant(playerFlashRows.every((row) =>
    row.colbk === playerFlashSequence[24 - row.player_fighter_explosion_timer]),
  "PAL trace observed an incorrect PlayerFighter death COLBK sequence");
  invariant(fighterFlashRows.filter((row) =>
    row.player_fighter_explosion_timer > 0 && row.player_fighter_explosion_timer < 19)
    .every((row) => row.colbk === 0),
  "PAL trace observed a background flash after the PlayerFighter death profile restored base");
  invariant([...enemyFlashSequence, ...playerFlashSequence].every((color) => color !== 0x84),
    "Fighter flash reused the accepted $84 local explosion colour");

  const flashRegisterCoverage = {
    enemy_fighter: {
      observed: true,
      active_frames: enemyFlashSequence.length,
      timer_values: [24, 23, 22, 21],
      colbk_values: enemyFlashSequence,
      observations: enemyFlashRows.length,
    },
    player_death: {
      observed: true,
      active_frames: playerFlashSequence.length,
      timer_values: [24, 23, 22, 21, 20, 19],
      colbk_values: playerFlashSequence,
      observations: playerFlashRows.length,
    },
    colpm_values: Object.fromEntries(["colpm0", "colpm1", "colpm2", "colpm3"].map((name) => [
      name,
      [...new Set(fighterFlashRows.map((row) => row[name]))].sort((left, right) => left - right),
    ])),
    colpf_values: Object.fromEntries(["colpf0", "colpf1", "colpf2", "colpf3"].map((name) => [
      name,
      [...new Set(fighterFlashRows.map((row) => row[name]))].sort((left, right) => left - right),
    ])),
  };

  const report = {
    schema_version: 2,
    method: "Atari800 ANTIC master-clock observation at guest-PC boundaries; no guest logging or instrumentation instructions",
    evidence: {
      status: "complete",
      partial: false,
      required_sessions: sessionsToRun.length,
      completed_sessions: summaries.length,
      artifact_binding: "boot BIN, XEX and ATR SHA-256",
    },
    determinism: {
      replay_fingerprint_sha256: sha256(Buffer.from(JSON.stringify(allRows))),
      ordered_frames: allRows.length,
      basis: "ordered decoded CSV rows from every required legal replay",
    },
    artifacts: runtimeArtifacts,
    artifact: runtimeArtifacts["void-strike-65.xex"],
    emulator: {
      name: "Atari800",
      version: EXPECTED_ATARI800_VERSION,
      official_source_archive_sha256: OFFICIAL_SOURCE_ARCHIVE_SHA256,
      source_patch: "scripts/atari800-wall-trace.h plus one observer call before each emulated opcode",
      model_arguments: [
        "-xe", "-pal", "-nobasic", "-nosound", "-turbo", "-no-video-accel", "-no-vsync",
      ],
      audio_note: "-nosound disables host playback only; guest sound/music state and POKEY register writes remain active",
    },
    boot_smoke: bootSmoke,
    semantics: {
      cpu_cycles_dma_off: cpuCycles,
      cpu_comparison_headroom: PAL_FRAME_CYCLES - cpuCycles,
      measured_wall_cycles_dma_on: heaviest.wall_cycles,
      measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
      estimated_additive_cycles: estimatedAdditive,
    },
    heaviest_frame_cost_breakdown: profileCostBreakdown(heaviest),
    gate: {
      pal_frame_cycles: PAL_FRAME_CYCLES,
      maximum_wall_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES,
      historical_runtime_headroom_gate: {
        maximum_wall_cycles: HISTORICAL_PHYSICAL_GATE_CYCLES,
        preserved_for_history: true,
        replaced: false,
        note: "The feature gate is additional; this historical checkpoint remains explicit.",
      },
      entity_effects_foundation: {
        baseline_wall_cycles: ENTITY_EFFECTS_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: ENTITY_EFFECTS_BASELINE_HEADROOM_CYCLES,
        approved_delta_cycles: ENTITY_EFFECTS_APPROVED_DELTA_CYCLES,
        maximum_wall_cycles: ENTITY_EFFECTS_FEATURE_GATE_CYCLES,
        minimum_physical_headroom: PAL_FRAME_CYCLES - ENTITY_EFFECTS_FEATURE_GATE_CYCLES,
        measured_wall_cycles: 32_025,
        measured_physical_headroom: 3_543,
        actual_delta_cycles: 585,
        remaining_approved_cycles: 15,
        budget_overrun_frames: 0,
        passed: true,
      },
      debris_visual_polish: {
        baseline_wall_cycles: DEBRIS_VISUAL_POLISH_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: DEBRIS_VISUAL_POLISH_BASELINE_HEADROOM_CYCLES,
        approved_delta_cycles: DEBRIS_VISUAL_POLISH_APPROVED_DELTA_CYCLES,
        maximum_wall_cycles: DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES,
        minimum_physical_headroom:
          PAL_FRAME_CYCLES - DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES,
        measured_wall_cycles: DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES,
        measured_physical_headroom: DEBRIS_VISUAL_POLISH_ACCEPTED_HEADROOM_CYCLES,
        actual_delta_cycles:
          DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES -
            DEBRIS_VISUAL_POLISH_BASELINE_WALL_CYCLES,
        remaining_approved_cycles:
          DEBRIS_VISUAL_POLISH_FEATURE_GATE_CYCLES -
            DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES,
        budget_overrun_frames: 0,
        empty_path: {
          maximum_wall_cycles: 31_108,
          delta_from_baseline: -917,
        },
        one_active_debris: {
          maximum_wall_cycles: DEBRIS_VISUAL_POLISH_ACCEPTED_WALL_CYCLES,
          delta_from_baseline: 56,
        },
        spawn_path: {
          maximum_wall_cycles: 28_212,
          delta_from_baseline: -3_813,
        },
        contact_path: {
          maximum_wall_cycles: 26_129,
          delta_from_baseline: -5_896,
        },
      },
      explosion_colour_flash: {
        baseline_wall_cycles: EXPLOSION_FLASH_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: EXPLOSION_FLASH_BASELINE_HEADROOM_CYCLES,
        approved_delta_cycles: EXPLOSION_FLASH_APPROVED_DELTA_CYCLES,
        maximum_wall_cycles: EXPLOSION_FLASH_FEATURE_GATE_CYCLES,
        delta_limited_minimum_physical_headroom:
          EXPLOSION_FLASH_BASELINE_HEADROOM_CYCLES -
            EXPLOSION_FLASH_APPROVED_DELTA_CYCLES,
        absolute_minimum_physical_headroom:
          EXPLOSION_FLASH_ABSOLUTE_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES,
        measured_physical_headroom: EXPLOSION_FLASH_ACCEPTED_HEADROOM_CYCLES,
        actual_delta_cycles:
          EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES - EXPLOSION_FLASH_BASELINE_WALL_CYCLES,
        remaining_approved_cycles:
          EXPLOSION_FLASH_FEATURE_GATE_CYCLES - EXPLOSION_FLASH_ACCEPTED_WALL_CYCLES,
        budget_overrun_frames: 0,
        passed: true,
      },
      destructible_debris: {
        baseline_wall_cycles: DESTRUCTIBLE_DEBRIS_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: DESTRUCTIBLE_DEBRIS_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: DESTRUCTIBLE_DEBRIS_TARGET_DELTA_CYCLES,
        hard_delta_cycles: DESTRUCTIBLE_DEBRIS_HARD_DELTA_CYCLES,
        target_wall_cycles: DESTRUCTIBLE_DEBRIS_TARGET_GATE_CYCLES,
        maximum_wall_cycles: DESTRUCTIBLE_DEBRIS_HARD_GATE_CYCLES,
        minimum_physical_headroom: DESTRUCTIBLE_DEBRIS_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        measured_physical_headroom: ENEMY_BREAKUP_BASELINE_HEADROOM_CYCLES,
        actual_delta_cycles:
          ENEMY_BREAKUP_BASELINE_WALL_CYCLES - DESTRUCTIBLE_DEBRIS_BASELINE_WALL_CYCLES,
        remaining_target_cycles:
          DESTRUCTIBLE_DEBRIS_TARGET_GATE_CYCLES - ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        remaining_hard_cycles:
          DESTRUCTIBLE_DEBRIS_HARD_GATE_CYCLES - ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        target_overrun_frames: 0,
        hard_overrun_frames: 0,
        no_active_debris_path_delta_cpu_cycles: noActiveDebrisPathDelta,
        no_active_debris_path_limit_cpu_cycles: 32,
        no_active_player_fighter_projectile_path_delta_cpu_cycles: noActivePlayerFighterPathDelta,
        no_active_player_fighter_projectile_path_limit_cpu_cycles: 48,
        debris_shot_path: frameState(shotMaximum),
        passed: true,
      },
      enemy_breakup_effects: {
        baseline_wall_cycles: ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: ENEMY_BREAKUP_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: ENEMY_BREAKUP_TARGET_DELTA_CYCLES,
        hard_delta_cycles: ENEMY_BREAKUP_HARD_DELTA_CYCLES,
        target_wall_cycles: ENEMY_BREAKUP_TARGET_GATE_CYCLES,
        maximum_wall_cycles: ENEMY_BREAKUP_HARD_GATE_CYCLES,
        minimum_physical_headroom: ENEMY_BREAKUP_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        measured_physical_headroom: WEAPON_PICKUP_BASELINE_HEADROOM_CYCLES,
        actual_delta_cycles:
          WEAPON_PICKUP_BASELINE_WALL_CYCLES - ENEMY_BREAKUP_BASELINE_WALL_CYCLES,
        remaining_target_cycles:
          ENEMY_BREAKUP_TARGET_GATE_CYCLES - WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        remaining_hard_cycles:
          ENEMY_BREAKUP_HARD_GATE_CYCLES - WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        target_overrun_frames: 4,
        hard_overrun_frames: 0,
        interceptor_spawn_frames: 216,
        passed: true,
      },
      weapon_pickup_rapid_fire: {
        baseline_wall_cycles: WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: WEAPON_PICKUP_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: WEAPON_PICKUP_TARGET_DELTA_CYCLES,
        hard_delta_cycles: WEAPON_PICKUP_HARD_DELTA_CYCLES,
        target_wall_cycles: WEAPON_PICKUP_TARGET_GATE_CYCLES,
        maximum_wall_cycles: WEAPON_PICKUP_HARD_GATE_CYCLES,
        minimum_physical_headroom: WEAPON_PICKUP_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: RAPID_ONLY_ACCEPTED_WALL_CYCLES,
        measured_physical_headroom: RAPID_ONLY_ACCEPTED_HEADROOM_CYCLES,
        actual_delta_cycles: RAPID_ONLY_ACCEPTED_WALL_CYCLES -
          WEAPON_PICKUP_BASELINE_WALL_CYCLES,
        remaining_target_cycles: WEAPON_PICKUP_TARGET_GATE_CYCLES -
          RAPID_ONLY_ACCEPTED_WALL_CYCLES,
        remaining_hard_cycles: WEAPON_PICKUP_HARD_GATE_CYCLES -
          RAPID_ONLY_ACCEPTED_WALL_CYCLES,
        target_overrun_frames: 0,
        hard_overrun_frames: 0,
        qualified_kill_events: pickupQualifiedKillRows.length,
        pending_frames: pickupPendingRows.length,
        pending_partial_kill_frame_included: true,
        pending_complete_frame_runs: pickupCompletedPendingRuns.map(({ run }) => run.length - 1),
        pending_lifecycle_interrupted_frame_runs: pickupPendingTransitions
          .filter(({ run, next }) => next !== undefined && next.pickup_state !== 2 &&
            next.pickup_state === next.pickup_booster_state && run.length - 1 <= 30)
          .map(({ run }) => run.length - 1),
        active_frames: pickupActiveRows.length,
        maximum_simultaneous_footprints: Math.max(...pickupActiveRows.map((row) =>
          Math.max(row.pickup_footprints_before, row.pickup_footprints_after))),
        maximum_pickup_glyph_cells: Math.max(...pickupActiveRows.map((row) =>
          Math.max(row.pickup_glyph_cells_before, row.pickup_glyph_cells_after))),
        layer_fences_per_active_frame: 1,
        maximum_stationary_active_frames: pickupMaximumStationaryRun,
        logical_step_scanlines: 2,
        physical_address_changes_during_native_motion: pickupPhysicalAddressChanges,
        release_frames: pickupReleaseRows.length,
        rapid_frames: pickupRapidRows.length,
        pickup_events: pickupCollectRows.length,
        passed: RAPID_ONLY_ACCEPTED_WALL_CYCLES <= WEAPON_PICKUP_HARD_GATE_CYCLES &&
          RAPID_ONLY_ACCEPTED_HEADROOM_CYCLES >= WEAPON_PICKUP_MINIMUM_HEADROOM_CYCLES,
      },
      weapon_pickup_spread_shot: {
        baseline_wall_cycles: SPREAD_SHOT_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: SPREAD_SHOT_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: SPREAD_SHOT_TARGET_DELTA_CYCLES,
        hard_delta_cycles: SPREAD_SHOT_HARD_DELTA_CYCLES,
        target_wall_cycles: SPREAD_SHOT_TARGET_GATE_CYCLES,
        maximum_wall_cycles: SPREAD_SHOT_HARD_GATE_CYCLES,
        minimum_physical_headroom: SPREAD_SHOT_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: SHIELD_BOOSTER_BASELINE_WALL_CYCLES,
        measured_physical_headroom: SHIELD_BOOSTER_BASELINE_HEADROOM_CYCLES,
        actual_delta_cycles: SHIELD_BOOSTER_BASELINE_WALL_CYCLES - SPREAD_SHOT_BASELINE_WALL_CYCLES,
        remaining_target_cycles: SPREAD_SHOT_TARGET_GATE_CYCLES - SHIELD_BOOSTER_BASELINE_WALL_CYCLES,
        remaining_hard_cycles: SPREAD_SHOT_HARD_GATE_CYCLES - SHIELD_BOOSTER_BASELINE_WALL_CYCLES,
        target_overrun_frames: 0,
        hard_overrun_frames: 0,
        rapid_frames: pickupRapidRows.length,
        spread_frames: pickupSpreadRows.length,
        pickup_events: pickupCollectRows.length,
        created_capsule_render_ids: pickupCreatedRenderIds,
        collected_states: pickupCollectRows.map((row) => row.pickup_state),
        spread_volley_frames: spreadVolleyRows.length,
        active_capsule_three_projectile_frames: activeCapsuleThreeProjectileRows.length,
        active_capsule_during_booster_frames: activeCapsuleDuringBoosterRows.length,
        worst_legal_capsule_three_projectiles: frameState(capsuleTripleHeaviest),
        passed: true,
      },
      weapon_pickup_shield: {
        baseline_wall_cycles: SHIELD_BOOSTER_BASELINE_WALL_CYCLES,
        baseline_physical_headroom: SHIELD_BOOSTER_BASELINE_HEADROOM_CYCLES,
        target_delta_cycles: SHIELD_BOOSTER_TARGET_DELTA_CYCLES,
        hard_delta_cycles: SHIELD_BOOSTER_HARD_DELTA_CYCLES,
        target_wall_cycles: SHIELD_BOOSTER_TARGET_GATE_CYCLES,
        maximum_wall_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES,
        minimum_physical_headroom: SHIELD_BOOSTER_MINIMUM_HEADROOM_CYCLES,
        measured_wall_cycles: heaviest.wall_cycles,
        measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
        actual_delta_cycles: heaviest.wall_cycles - SHIELD_BOOSTER_BASELINE_WALL_CYCLES,
        remaining_target_cycles: SHIELD_BOOSTER_TARGET_GATE_CYCLES - heaviest.wall_cycles,
        remaining_hard_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES - heaviest.wall_cycles,
        target_overrun_frames: shieldBoosterTargetOverruns.length,
        hard_overrun_frames: shieldBoosterHardOverruns.length,
        shield_frames: pickupShieldRows.length,
        pickup_events: pickupCollectRows.length,
        passed: heaviest.wall_cycles <= SHIELD_BOOSTER_HARD_GATE_CYCLES &&
          PAL_FRAME_CYCLES - heaviest.wall_cycles >= SHIELD_BOOSTER_MINIMUM_HEADROOM_CYCLES &&
          shieldBoosterHardOverruns.length === 0 && deadlineOverruns.length === 0 &&
          allRows.every((row) => row.extra_vbi_boundaries === 0),
      },
      shield_preimplementation_baseline: {
        baseline_wall_cycles: SHIELD_BASELINE_WALL_CYCLES,
        maximum_wall_cycles: SHIELD_READY_MAXIMUM_WALL_CYCLES,
        minimum_physical_headroom: SHIELD_READY_MINIMUM_HEADROOM_CYCLES,
        required_recovery_cycles: SHIELD_READY_REQUIRED_RECOVERY_CYCLES,
        measured_wall_cycles: SPREAD_SHOT_BASELINE_WALL_CYCLES,
        measured_physical_headroom: SPREAD_SHOT_BASELINE_HEADROOM_CYCLES,
        recovered_cycles: SHIELD_BASELINE_WALL_CYCLES - SPREAD_SHOT_BASELINE_WALL_CYCLES,
        preserved_as_accepted_baseline: true,
        passed: true,
      },
      memory_integrity: {
        xex_frames: integrityByMedium.XEX.length,
        atr_frames: integrityByMedium.ATR.length,
        duration_seconds_pal_per_artifact: integrityByMedium.XEX.length / 50,
        pickup_rf_cycles: integrityCollections.length,
        dli_sequence_violations: dliSequenceViolations,
        maximum_dlis_per_host_frame: maximumDlisPerHostFrame,
        pause_sessions: [...new Set(integrityPauseRows.map((row) => row.session))].map((session) => {
          const row = integrityPauseRows.find((candidate) => candidate.session === session);
          return {
            session,
            timer_before: row.pause_timer_before,
            timer_after: row.pause_timer_after,
            engine_timer_before: row.pause_engine_timer_before,
            engine_timer_after: row.pause_engine_timer_after,
            engine_phase_before: row.pause_engine_phase_before,
            engine_phase_after: row.pause_engine_phase_after,
            paused_host_frames: row.pause_host_frames,
          };
        }),
        xex_atr_state_parity: true,
        passed: dliSequenceViolations === 0 && maximumDlisPerHostFrame === 2,
      },
      capital_engine_regression: {
        sessions: engineSessionEvidence,
        restart_sessions: engineRestartEvidence,
        evidence: engineRuntimeEvidence,
        measured_frames: engineRows.length,
        restart_measured_frames: engineRestartRows.length,
        active_frames_per_phase: 8,
        full_cycle_frames: 16,
        full_cycle_hz_pal: 3.125,
        startup_phase: 0,
        phase_count: 2,
        first_dli_selects_active_list_offset: 3,
        screenshots_per_session: 150,
        passed: true,
      },
      measured_wall_cycles_dma_on: heaviest.wall_cycles,
      measured_physical_headroom: PAL_FRAME_CYCLES - heaviest.wall_cycles,
      deadline_overrun_frames: deadlineOverruns.length,
      missed_frames: deadlineOverruns.reduce((sum, row) => sum + row.missed_frames, 0),
      baseline_9040_deadline_overrun_frames: baselineDeadlineOverruns.length,
      baseline_9040_missed_frames:
        baselineDeadlineOverruns.reduce((sum, row) => sum + row.missed_frames, 0),
      targeted_deadline_overrun_frames: targetedDeadlineOverruns.length,
      targeted_missed_frames:
        targetedDeadlineOverruns.reduce((sum, row) => sum + row.missed_frames, 0),
      baseline_9040_active_frames_crossing_host_vbi:
        baselineRows.filter((row) => row.host_vbi_boundaries > 0).length,
      baseline_9040_host_vbi_boundary_crossings:
        baselineRows.reduce((sum, row) => sum + row.host_vbi_boundaries, 0),
      targeted_active_frames_crossing_host_vbi:
        targetedRows.filter((row) => row.host_vbi_boundaries > 0).length,
      targeted_host_vbi_boundary_crossings:
        targetedRows.reduce((sum, row) => sum + row.host_vbi_boundaries, 0),
      active_frames_crossing_host_vbi: allRows.filter((row) => row.host_vbi_boundaries > 0).length,
      host_vbi_boundary_crossings:
        allRows.reduce((sum, row) => sum + row.host_vbi_boundaries, 0),
      extra_vbi_boundaries: allRows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      passed: heaviest.wall_cycles <= SHIELD_BOOSTER_HARD_GATE_CYCLES &&
        PAL_FRAME_CYCLES - heaviest.wall_cycles >=
          SHIELD_BOOSTER_MINIMUM_HEADROOM_CYCLES &&
        shieldBoosterHardOverruns.length === 0 && deadlineOverruns.length === 0 &&
        allRows.every((row) => row.extra_vbi_boundaries === 0) &&
        (heaviest.events & ((1 << 20) | (1 << 21) | (1 << 22))) !== 0 &&
        dliSequenceViolations === 0 && maximumDlisPerHostFrame === 2,
    },
    instrumentation: {
      start_label: "main_loop_option_poll",
      start_semantics: "first instruction after wait_frame returns, before the released OPTION poll",
      end_label: "main_loop",
      end_semantics: "first instruction of the next wait_frame call",
      guest_instructions_added: 0,
      guest_cycles_added: 0,
      logging_during_measured_path: false,
      production_dma_ctl: 0x3e,
      production_nmi_en: 0x80,
      nmi_note: "The release deliberately enables both gameplay DLIs and leaves OS VBI NMI disabled; Atari800_nframes supplies the host/VBI boundary identifier.",
      raw_trace_directory: "build/runtime-wall-trace",
    },
    replay: {
      baseline_measured_frames: baselineRows.length,
      targeted_measured_frames: targetedRows.length,
      parallax_cadence_measured_frames: cadenceRows.length,
      fighter_flash_measured_frames: fighterFlashRows.length,
      debris_effects_measured_frames: debrisEffectsRows.length,
      weapon_pickup_measured_frames: weaponPickupRows.length,
      director_completion_measured_frames: directorCompletionRows.length,
      memory_integrity_measured_frames: memoryIntegrityRows.length,
      engine_startup_measured_frames: engineRows.length,
      engine_restart_measured_frames: engineRestartRows.length,
      input: "production frontend/options handlers followed by deterministic held-FIRE neutral/sweep/evasive/hunt joystick policies",
      sessions: summaries,
      baseline_heaviest: frameState(baselineHeaviest),
      targeted_reference_heaviest: frameState(targetedReferenceHeaviest),
      targeted_heaviest: frameState(targetedHeaviest),
    },
    coverage: {
      world_near_with_far_erase: coverageRecord(allRows,
        (row) => (row.events & (1 << 0)) !== 0 && (row.events & (1 << 1)) !== 0 &&
          (row.events & (1 << 10)) !== 0 && (row.events & (1 << 11)) !== 0),
      hull_event: coverageRecord(allRows, (row) => (row.events & (1 << 2)) !== 0),
      director_world_row: coverageRecord(directorWorldRows, () => true),
      director_request: coverageRecord(directorRequestRows, () => true),
      director_sparse_event: coverageRecord(directorEventRows, () => true),
      director_level_complete: {
        observed: true,
        session: hardDirectorCompletion.session,
        boss_handoff_frame: finalDirectorEvent.frame,
        drain_frame: finalDrain.frame,
        level_complete_frame: finalComplete.frame,
        drain_frames: finalComplete.frame - finalDrain.frame,
        terminal_complete_through_frame: directorCompletionRows
          .filter((row) => row.session === hardDirectorCompletion.session).at(-1).frame,
        natural_difficulty_sessions: directorCompletionEvidence,
      },
      heaviest_frame_includes_director_work: {
        observed: (heaviest.events & ((1 << 20) | (1 << 21) | (1 << 22))) !== 0,
        frame: frameState(heaviest),
      },
      active_muzzles: coverageRecord(allRows, (row) => row.active_muzzles > 0),
      maximum_projectile_pool: {
        scope: "combined active PlayerFighter and Interceptor fighter-projectile slots in legal Atari800 replays",
        combined_physical_capacity: 19,
        maximum_combined_active_observed:
          Math.max(...allRows.map((row) => row.projectiles)),
        full_combined_capacity_observed:
          allRows.some((row) => row.projectiles === 19),
        full_combined_capacity_matching_frames:
          allRows.filter((row) => row.projectiles === 19).length,
        heaviest_at_full_combined_capacity:
          allRows.some((row) => row.projectiles === 19)
            ? frameState(maximumRow(allRows.filter((row) => row.projectiles === 19),
              (row) => row.wall_cycles))
            : null,
        component_physical_capacities: {
          player_fighter: 10,
          interceptor: 9,
        },
        evidence_note: allRows.some((row) => row.projectiles === 19)
          ? "The physical 19-slot allocation was reached by a legal replay; 19/19 is observed rather than inferred or artificially seeded."
          : "The combined capacity is physical; the report does not claim a full state unless a legal replay actually observes it.",
      },
      broadside_projectiles: {
        ...coverageRecord(allRows, (row) => maximumBroadside > 0 &&
          row.broadside === maximumBroadside),
        maximum_observed: maximumBroadside,
        pool_capacity: 3,
        release_source_turrets: 2,
        three_slot_legal_coincidence_observed: maximumBroadside === 3,
        classification: maximumBroadside > 0
          ? "observed through the production scheduler during the natural first capital-section pass on EASY, MEDIUM, and HARD; no phase, world row, muzzle, projectile, object, or intensity state was seeded"
          : "not observed",
      },
      live_interceptor: coverageRecord(allRows, (row) => row.live_interceptor !== 0),
      fighter_explosion: coverageRecord(allRows, (row) => row.fighter_explosion !== 0),
      capital_explosion: coverageRecord(allRows, (row) => row.capital_explosion !== 0),
      music_with_sfx_preemption: coverageRecord(allRows, (row) => row.music_active !== 0 &&
        (row.fire_sfx !== 0 || row.hit_sfx !== 0 || row.capital_sfx !== 0)),
      debris_empty_path: coverageRecord(allRows, (row) => row.entity_active === 0 &&
        (row.events & (1 << 7)) === 0),
      debris_one_active: coverageRecord(allRows, (row) =>
        (row.entity_active_mask & 1) !== 0),
      debris_spawn: coverageRecord(allRows, (row) => (row.events & (1 << 7)) !== 0),
      debris_contact: coverageRecord(allRows, (row) => (row.events & (1 << 8)) !== 0),
      debris_despawn: coverageRecord(allRows, (row) => (row.events & (1 << 9)) !== 0),
      debris_shot: coverageRecord(allRows, (row) => (row.events & (1 << 12)) !== 0),
      debris_destruction_effects: {
        ...coverageRecord(fullEffectRows, () => true),
        spawner_frames: effectSpawnRows.length,
        active_frames: fullEffectRows.length,
        active_mask: 0x1f,
        active_count: 5,
        spawn_updated_and_rendered: effectSpawnRows.every((row) =>
          (row.events & ((1 << 15) | (1 << 16))) === ((1 << 15) | (1 << 16))),
        following_frame_erase_observed: fullEffectRows.some((row) =>
          (row.events & (1 << 14)) !== 0),
        post_capital_spawn_observed: effectSpawnRows.some((row) => row.sector_state === 7),
      },
      interceptor_breakup_effects: {
        ...coverageRecord(interceptorBreakupRows, () => true),
        spawner_frames: interceptorBreakupRows.length,
        active_mask: 0x1f,
        active_count: 5,
        spawn_updated_and_rendered: interceptorBreakupRows.every((row) =>
          (row.events & ((1 << 15) | (1 << 16))) === ((1 << 15) | (1 << 16))),
        full_screen_flash_preserved: interceptorFlashPairs.length > 0,
        yellow_death_then_red_materialisation_frames: interceptorFlashPairs.length,
      },
      weapon_pickup_rapid_fire: {
        qualified_kills: pickupQualifiedKillRows.map((row) => frameState(row)),
        pending: coverageRecord(pickupPendingRows, () => true),
        active: coverageRecord(pickupActiveRows, () => true),
        collected: pickupCollectRows.map((row) => frameState(row)),
        rapid: coverageRecord(pickupRapidRows, () => true),
        screenshot: {
          path: path.relative(rootDirectory, pickupScreenshotPath),
          bytes: fs.statSync(pickupScreenshotPath).size,
          sha256: sha256(fs.readFileSync(pickupScreenshotPath)),
          capture_frame: pickupScreenshotRow.frame,
          capture_host_frame: pickupScreenshotRow.end_host_frame,
          capture_state: frameState(pickupScreenshotRow),
          first_visible_frame: pickupActiveRows.find((row) =>
            (row.pickup_drawn_mask & 15) === 15 && row.effect_active_count === 0)?.frame,
        },
        yellow_projectiles: {
          ...coverageRecord(rapidProjectileRows, () => true),
          player_fighter_screen_code_frames: rapidProjectileVisibleRows.length,
          other_code_or_occluded_frames:
            rapidProjectileRows.length - rapidProjectileVisibleRows.length,
          player_fighter_screen_code_percent:
            Math.round(rapidProjectileVisibleRows.length * 10_000 /
              rapidProjectileRows.length) / 100,
          screen_code_minimum: Math.min(...rapidProjectileVisibleRows.map((row) =>
            row.rapid_projectile_screen_code)),
          screen_code_maximum: Math.max(...rapidProjectileVisibleRows.map((row) =>
            row.rapid_projectile_screen_code)),
          all_screen_codes_select_colpf2: rapidProjectileVisibleRows.every((row) =>
            (row.rapid_projectile_screen_code & 0x80) === 0),
          colour_register: "COLPF2",
          colour_value: 0x1e,
          screenshot: {
            path: path.relative(rootDirectory, rapidScreenshotPath),
            bytes: fs.statSync(rapidScreenshotPath).size,
            sha256: sha256(fs.readFileSync(rapidScreenshotPath)),
            capture_frame: rapidScreenshotRow.frame,
            capture_host_frame: rapidScreenshotRow.end_host_frame,
            capture_state: frameState(rapidScreenshotRow),
          },
        },
      },
      weapon_pickup_spread_shot: {
        collected_states: pickupCollectRows.map((row) => row.pickup_state),
        spread: coverageRecord(pickupSpreadRows, () => true),
        logical_three_projectile_volley: coverageRecord(spreadVolleyRows, () => true),
        screenshot: {
          path: path.relative(rootDirectory, spreadScreenshotPath),
          bytes: fs.statSync(spreadScreenshotPath).size,
          sha256: sha256(fs.readFileSync(spreadScreenshotPath)),
          capture_frame: spreadScreenshotRow.frame,
          capture_host_frame: spreadScreenshotRow.end_host_frame,
          capture_state: frameState(spreadScreenshotRow),
        },
        active_capsule_with_three_player_fighter_projectiles:
          coverageRecord(activeCapsuleThreeProjectileRows, () => true),
        active_capsule_during_booster:
          coverageRecord(activeCapsuleDuringBoosterRows, () => true),
        worst_legal_capsule_three_projectiles: frameState(capsuleTripleHeaviest),
      },
      weapon_pickup_shield: {
        shield: coverageRecord(pickupShieldRows, () => true),
        exact_initial_timer_observed: pickupShieldRows.some((row) =>
          row.pickup_timer_lo === 0xfa && row.pickup_timer_hi === 0),
        player_fighter_colour_phase_source: "authoritative 250-frame booster timer bit 3",
      },
      debris_shot_post_capital: coverageRecord(allRows, (row) =>
        row.sector_state === 7 && (row.events & (1 << 12)) !== 0),
      debris_bottom_despawn: coverageRecord(allRows, (row) =>
        (row.events & (1 << 9)) !== 0 &&
          (row.events & ((1 << 8) | (1 << 12))) === 0),
      debris_post_capital_sector: coverageRecord(allRows, (row) =>
        row.sector_state === 7 && (row.entity_active_mask & 1) !== 0),
      post_capital_transition: postCapitalTransition,
      parallax_cadence: parallaxCadence,
      debris_vertical_cadence: {
        observed: verticalCadence.invalid_transitions === 0,
        ...verticalCadence,
      },
      debris_visual_variants: {
        observed: observedVariants.length === 2,
        values: observedVariants,
      },
      debris_tumbling_phases: {
        observed: observedPhases.length === 2,
        values: observedPhases,
      },
      debris_trajectories: {
        observed: observedTrajectories.length === 3,
        vx_signed_hpos: observedTrajectories,
      },
      fighter_colour_flash: flashRegisterCoverage,
    },
    ten_heaviest_frames_in_9040_replay: topTenBaseline,
    five_heaviest_frames_scope: "all measured legal runtime replays",
    five_heaviest_frames: topFiveAll.map((frame) => ({
      session: frame.session,
      frame: frame.frame,
      wall_cycles: frame.wall_cycles,
      physical_headroom: frame.physical_headroom,
    })),
    limitations: [
      "This is exact emulated ANTIC master-clock timing for Atari800 7.1.2, not an electrical measurement from a physical 65XE.",
      "The bounded deterministic replay is reproducible coverage, not a proof over every possible joystick history.",
      "Atari800 host-frame boundaries occur at the PAL frame wrap; the gameplay scheduler synchronises at VCOUNT $70, so missed_frames is derived from the exact next start host-frame ID.",
      "The release enables DLI NMI ($80), not OS VBI NMI ($40); enabling OS VBI would change the accepted production runtime.",
    ],
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Measured DMA-on maximum: ${report.semantics.measured_wall_cycles_dma_on} cycles`);
  console.log(`Measured physical headroom: ${report.semantics.measured_physical_headroom} cycles`);
  console.log(`Deadline overruns: ${report.gate.deadline_overrun_frames}; ` +
    `missed frames: ${report.gate.missed_frames}`);
  console.log(`Report: ${path.relative(rootDirectory, reportPath)}`);
  if (!report.gate.passed) process.exitCode = 1;
}

main();
