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
import { executeDebrisDestructionTrace } from "./debris-destruction-runtime.mjs";
import { analyseDebrisGate } from "./debris-visibility-gate.mjs";
import { auditSession as auditPalTiming, reportAudits as reportPalTimingAudits,
  reportAudit as reportPalTimingAudit } from "./pal-timing-audit.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const buildDirectory = path.join(rootDirectory, "build", "runtime-wall-trace");
const reportPath = path.join(rootDirectory, "docs", "runtime-wall-trace.json");
const headerPath = path.join(scriptDirectory, "atari800-wall-trace.h");
const PAL_FRAME_CYCLES = 35_568;
// Roadmap 4.3 plan §10.3: a two-sector load that takes far longer than this
// means the wait primitive is wrong rather than the budget being tight. The
// emulator's wire is lossless and its byte spacing is 8 scanlines, so the
// MEASURED figure is a regression signal for the reader's own overhead only -
// never a hardware number.
const BOOT_LEVEL_LOAD_CEILING_FRAMES = 120;
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
const CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES = 31_200;
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

const debrisSlot0BaselineSessions = [0, 1, 2].map((difficulty) => ({
  id: `debris-slot0-${difficulty}-sweep-fire4`,
  difficulty,
  policy: "sweep",
  fireDelay: 4,
  frames: 5_000,
  kind: "debris-slot0-baseline",
}));

// Debris visibility gate: natural replays only (no sector-poking policies).
// The two 9,000-frame difficulty-0 replays reach the first capital, return to
// the fighter sector and play out post-capital debris lives; the capital
// muzzle replay covers debris lives inside the capital sector.
const debrisVisibilityGateSessions = [
  { id: "debris-gate-0-evasive-fire3", difficulty: 0, policy: "evasive", fireDelay: 3,
    frames: 9_000 },
  { id: "debris-gate-0-neutral-fire0", difficulty: 0, policy: "neutral", fireDelay: 0,
    frames: 9_000 },
  { id: "debris-gate-capital-muzzle-ring-2-sweep-fire4", difficulty: 2,
    policy: "broadside-proof", fireDelay: 4, frames: 6_000 },
].map((session) => ({ ...session, kind: "debris-visibility-gate" }));

const weaponPickupSessions = [{
  id: "weapon-pickup-2-hunt-fire4",
  difficulty: 2,
  policy: "hunt",
  fireDelay: 4,
  frames: 4_000,
  kind: "weapon-pickup-coverage",
}];

const pairShotSessions = [
  ["normal", "pairshot-normal"],
  ["rapid", "pairshot-rapid"],
  ["spread", "pairshot-spread"],
].map(([mode, policy]) => ({
  id: `pairshot-${mode}-xex-hard`,
  medium: "XEX",
  difficulty: 2,
  policy,
  fireDelay: 4,
  frames: 480,
  kind: "pairshot-native",
}));

const pairShotStaleSessions = [
  ["normal", "pairshot-normal"],
  ["rapid", "pairshot-rapid"],
  ["spread", "pairshot-spread"],
].map(([mode, policy]) => ({
  id: `pairshot-stale-${mode}-xex-hard`,
  medium: "XEX",
  difficulty: 2,
  policy,
  fireDelay: 4,
  frames: 3_000,
  kind: "pairshot-stale-native",
}));

const raiderRemnantSessions = pairShotStaleSessions.map((session) => ({
  ...session,
  id: session.id.replace("pairshot-stale", "raider-remnant"),
  kind: "raider-remnant-native",
}));

const raiderFirstWriterSessions = [
  ["normal", "pairshot-normal", 0],
  ["rapid", "pairshot-rapid", 2],
  ["spread", "pairshot-spread", 4],
].map(([mode, policy, fireDelay]) => ({
  id: `raider-first-writer-${mode}-xex-hard`,
  medium: "XEX",
  difficulty: 2,
  policy,
  fireDelay,
  frames: 5_400,
  kind: "raider-first-writer-native",
}));

const playerPairShotSpeedSessions = ["normal", "rapid", "spread"].map((mode) => ({
  id: `player-pairshot-speed-${mode}-xex-hard`,
  medium: "XEX",
  difficulty: 2,
  policy: `pairshot-speed-${mode}`,
  fireDelay: 0,
  frames: 4_200,
  kind: "player-pairshot-speed-native",
}));

const playerPairShotReentrySessions = ["normal", "rapid", "spread"].map((mode) => ({
  id: `player-pairshot-reentry-${mode}-xex-hard`,
  medium: "XEX",
  difficulty: 2,
  policy: `pairshot-reentry-${mode}`,
  fireDelay: 0,
  frames: 7_000,
  kind: "player-pairshot-reentry-native",
}));

const boosterAdmissionReentrySessions = Array.from({ length: 5 }, (_, run) => ({
  id: `booster-admission-reentry-${run + 1}-xex-hard`,
  medium: "XEX",
  difficulty: 2,
  policy: "booster-reentry",
  fireDelay: 0,
  // One full capital traversal plus an OPEN re-entry, still with production
  // gameplay/admission/pickup code; only the diagnostic sector cadence is held.
  frames: 3_600,
  kind: "booster-admission-native",
}));

const pmgLabSessions = [
  ["pmg-lab-fifth-player", "pmg-lab-fifth-player"],
  ["pmg-lab-ordinary-missiles", "pmg-lab-ordinary-missiles"],
  ["pmg-lab-single-missile", "pmg-lab-single-missile"],
].map(([id, policy]) => ({
  id,
  medium: "XEX",
  difficulty: 2,
  policy,
  fireDelay: 0,
  frames: 90,
  kind: "pmg-visibility-lab",
}));

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
    id: `early-enemy-${medium.toLowerCase()}-${difficulty}-cold-hunt-fire4`,
    medium,
    difficulty,
    policy: "early-hunt",
    fireDelay: 4,
    frames: 1_500,
    kind: "early-enemy-cold",
  })));

const raiderFormationSessions = [{
  id: "two-pmg-raiders-xex-hard",
  medium: "XEX",
  difficulty: 2,
  policy: "raider-proof",
  fireDelay: 200,
  frames: 1_000,
  kind: "two-pmg-raiders-native",
}];

const raiderSectorSessions = [{
  id: "raider-sector-xex-hard",
  medium: "XEX",
  difficulty: 2,
  policy: "early-hunt",
  fireDelay: 4,
  frames: 1_800,
  kind: "raider-sector-lifecycle",
}];

const capitalContactSessions = [0, 1].map((owner) => ({
  id: `capital-contact-${owner === 0 ? "allied" : "hostile"}-medium`,
  difficulty: 1,
  policy: owner === 0 ? "capital-contact-allied" : "capital-contact-hostile",
  fireDelay: 4_000,
  frames: owner === 0 ? 560 : 360,
  kind: "capital-projectile-contact",
  contactOwner: owner,
  /* Mid-body overlap: the geometry these sessions have always steered to
   * (`target_y = shell_y - 7`, bolt top four rows below the player top),
   * expressed as the named mode that replaced the legacy contact delta. */
  contactModeId: 1,
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
  /* `lower-contact-hostile` steers to the same `shell_y - 7` mid-body overlap. */
  contactModeId: 1,
}];

/* Kinds whose runs set DFTRACE_CAPITAL_CONTACT_PREFIX, and therefore also send
 * DFTRACE_CAPITAL_CONTACT_OWNER and DFTRACE_CAPITAL_CONTACT_MODE. */
const capitalContactPrefixKinds = new Set([
  "capital-projectile-contact",
  "lower-playfield-contact",
  "capital-player-geometry",
]);

function assertCapitalContactEnvironment(session) {
  if (!capitalContactPrefixKinds.has(session.kind)) return;
  invariant(Number.isInteger(session.contactModeId) &&
    session.contactModeId >= 0 && session.contactModeId <= 3,
  `${session.id} (${session.kind}) sets DFTRACE_CAPITAL_CONTACT_PREFIX but carries ` +
  `contactModeId=${session.contactModeId}; the emulator requires an integer 0-3`);
  invariant(session.contactOwner === 0 || session.contactOwner === 1,
    `${session.id} (${session.kind}) carries contactOwner=${session.contactOwner}; ` +
    "the emulator requires 0 (Allied) or 1 (Hostile)");
}

for (const session of [...capitalContactSessions, ...capitalPlayerGeometrySessions,
  ...lowerPlayfieldSessions]) assertCapitalContactEnvironment(session);

const traceLabels = {
  DFTRACE_PC_PLAYER_SHOT_SOUND: "play_player_fighter_projectile_sound",
  DFTRACE_PC_UPDATE_SOUND: "update_sound",
  DFTRACE_PC_ACTIVE: "main_loop_option_poll",
  DFTRACE_PC_END: "main_loop",
  DFTRACE_PC_FRONTEND_POLL: "frontend_input_poll",
  DFTRACE_PC_DLI: "gameplay_dli",
  DFTRACE_PC_WORLD: "advance_starfield_layers",
  DFTRACE_PC_NEAR: "scroll_world_columns",
  // Preserve the established CSV schema while rebinding the retired far-star
  // fields to the white-only layer. The names are compatibility-only: these
  // PCs now delimit logical white motion and its shared glyph publication.
  DFTRACE_PC_FAR_ERASE: "update_white_starfield_phase",
  DFTRACE_PC_FAR_STEP: "publish_dynamic_near_star_phase",
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
  DFTRACE_PC_INTERCEPTOR_BREAKUP_REQUEST: "spawn_interceptor_breakup_effects",
  DFTRACE_PC_INTERCEPTOR_BREAKUP_SPAWN: "materialize_interceptor_breakup_effects",
  // Emitter-independent hostile PairShots: the kill boundary is the explosion
  // entry; its first instruction touches no projectile, so the end hook proves
  // every emitter-owned shot continues.
  DFTRACE_PC_EMITTER_CLEANUP: "begin_enemy_fighter_explosion_tail",
  DFTRACE_PC_EMITTER_CLEANUP_END: "begin_enemy_fighter_explosion_body",
  DFTRACE_PC_PICKUP_QUALIFIED_KILL: "weapon_pickup_record_qualified_kill",
  DFTRACE_PC_PICKUP_COLLECT: "weapon_pickup_collect",
  DFTRACE_PC_ENTITY_ERASE: "clear_fighter_pickup_pmg",
  DFTRACE_PC_AFTER_ENTITY_ERASE: "release_fighter_pickup_pmg_hardware",
  DFTRACE_PC_ENTITY_DRAW: "update_fighter_pickup_pmg",
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
  DFTRACE_PC_NEAR_ERASE: "erase_dynamic_near_star_overlays",
  DFTRACE_PC_NEAR_RENDER: "render_dynamic_near_star_overlays",
  DFTRACE_DLI_PHASE: "loader_dli_phase",
  DFTRACE_PLAYER_X: "player_x",
  DFTRACE_PLAYER_Y: "player_y",
  DFTRACE_PROJECTILE_ACTIVE: "FIGHTER_PROJECTILE_ACTIVE",
  DFTRACE_PROJECTILE_X: "FIGHTER_PROJECTILE_X",
  DFTRACE_PROJECTILE_Y: "FIGHTER_PROJECTILE_Y",
  DFTRACE_PROJECTILE_LIFETIME: "FIGHTER_PROJECTILE_LIFETIME",
  DFTRACE_PROJECTILE_RENDERED: "FIGHTER_PROJECTILE_RENDERED",
  DFTRACE_PROJECTILE_SCREEN_LO: "FIGHTER_PROJECTILE_SCREEN_LO",
  DFTRACE_PROJECTILE_SCREEN_HI: "FIGHTER_PROJECTILE_SCREEN_HI",
  DFTRACE_PROJECTILE_BACKING_TOP: "FIGHTER_PROJECTILE_BACKUP_TOP",
  DFTRACE_BROAD_STATE: "BROAD_STATE",
  DFTRACE_FAR_ACTIVE: "STAR_NEAR_FINE_PHASE",
  DFTRACE_ENEMY_ACTIVE: "ENEMY_ACTIVE",
  DFTRACE_ENEMY_X: "ENEMY_X",
  DFTRACE_ENEMY_MEMBER_STATE: "ENEMY_MEMBER_STATE",
  DFTRACE_ENEMY_HP: "ENEMY_HP",
  DFTRACE_ENEMY_LIVE_COUNT: "ENEMY_LIVE_COUNT",
  DFTRACE_ENEMY_ARCHETYPE: "ENEMY_ARCHETYPE",
  DFTRACE_ENEMY_BODY_DATA: "enemy_body_data",
  DFTRACE_ENEMY_FRAME_HEIGHTS: "enemy_frame_heights",
  DFTRACE_FIGHTER_EXPLOSION_TIMER: "FIGHTER_EXPLOSION_TIMER",
  DFTRACE_CAPITAL_EXPLOSION_TIMER: "CAPITAL_EXPLOSION_TIMER",
  DFTRACE_MUSIC_ACTIVE: "MUSIC_ACTIVE",
  DFTRACE_FIRE_TIMER: "fire_timer",
  DFTRACE_PLAYER_BURST_STATE: "PLAYER_FIGHTER_BURST_STATE",
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
  DFTRACE_ENTITY_TYPE: "ENTITY_TYPE",
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
  DFTRACE_PLAYFIELD_PREBUILD_PENDING: "PLAYFIELD_PREBUILD_PENDING",
  DFTRACE_PLAYFIELD_ROW_LO: "PLAYFIELD_ROW_LO",
  DFTRACE_PLAYFIELD_ROW_HI: "PLAYFIELD_ROW_HI",
  DFTRACE_SCORE_LO: "score_bcd_lo",
  DFTRACE_SCORE_HI: "score_bcd_hi",
  DFTRACE_EFFECT_ACTIVE_MASK: "EFFECT_ACTIVE_MASK",
  DFTRACE_EFFECT_ACTIVE_COUNT: "EFFECT_ACTIVE_COUNT",
  DFTRACE_EFFECT_RENDERED_MASK: "EFFECT_RENDERED_MASK",
  DFTRACE_EFFECT_Y: "EFFECT_Y",
  DFTRACE_EFFECT_SCREEN_LO: "EFFECT_SCREEN_LO",
  DFTRACE_EFFECT_SCREEN_HI: "EFFECT_SCREEN_HI",
  DFTRACE_ENEMY_TARGET_SLOT: "ENEMY_TARGET_SLOT",
  DFTRACE_CORRIDOR_PHASE: "corridor_phase",
  DFTRACE_RING_FLAGS: "PLAYFIELD_RING_FLAGS",
  DFTRACE_ACTIVE_DLIST_LO: "PLAYFIELD_ACTIVE_DLIST_LO",
  DFTRACE_NEXT_DLIST_LO: "PLAYFIELD_NEXT_DLIST_LO",
  DFTRACE_NEAR_ROW: "STAR_NEAR_ROW",
  DFTRACE_NEAR_COLUMN: "STAR_NEAR_COLUMN",
  DFTRACE_NEAR_SCREEN_LO: "STAR_NEAR_SCREEN_LO",
  DFTRACE_NEAR_SCREEN_HI: "STAR_NEAR_SCREEN_HI",
  DFTRACE_DST_PTR: "dst_ptr",
  DFTRACE_PC_DLI_END: "profile_gameplay_dli_end",
  DFTRACE_PC_DLI_HUD_END: "profile_gameplay_dli_hud_end",
  DFTRACE_PC_COMPOSE_START: "compose_player_fighter_projectile_glyph",
  DFTRACE_PC_COMPOSE_END: "profile_projectile_compose_end",
  DFTRACE_PC_POINTER_START: "initialize_projectile_screen_pointer",
  DFTRACE_PC_POINTER_END: "profile_projectile_pointer_end",
  DFTRACE_PC_PUBLICATION_BEGIN: "fighter_projectile_publication_begin",
  DFTRACE_PC_ERASE_SLOT: "erase_fighter_projectile_slot",
  DFTRACE_PC_PROJECTILE_RESTORE: "erase_fighter_projectile_restore",
  DFTRACE_PC_PROJECTILE_UPDATE_START: "update_fighter_projectiles",
  DFTRACE_PC_INTERCEPTOR_UPDATE_START: "profile_interceptor_projectile_update_begin",
  DFTRACE_PC_RENDER_SLOT: "render_fighter_projectile_slot",
  DFTRACE_PC_RENDER_END: "render_fighter_projectile_overlays_end",
  DFTRACE_PC_CLAIM_PROJECTILE: "claim_fighter_projectile_visual",
  DFTRACE_PC_ENTITY_ERASE_START: "profile_entity_erase_begin",
  DFTRACE_PC_EFFECT_UPDATE_END: "profile_after_transient_effect_update",
  DFTRACE_PC_PICKUP_UPDATE_END: "profile_after_pickup_booster_update",
};

const traceProfileLabels = [
  "profile_after_projectile_erase",
  "profile_after_entity_erase",
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
  "profile_after_entity_render",
  "profile_after_sector",
  "profile_after_projectile_render",
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
  "fire_timer_value", "player_burst_state", "player_burst_remaining",
  "player_burst_timer", "audf1", "audc1", "fire_accept_calls", "update_sound_calls",
  "fire_accept_clock", "update_sound_clock", "fire_accept_scanline", "fire_accept_cycle",
  "update_sound_scanline", "update_sound_cycle",
  "sound_enabled", "player_lifecycle", "sector_state", "gameplay_frame",
  "active_gameplay_frame", "enemy_state", "enemy_y", "enemy_member0_state",
  "enemy_member1_state", "enemy_member2_state", "enemy_member0_hp", "enemy_member1_hp",
  "enemy_member2_hp", "enemy_live_count", "enemy_projectiles", "director_phase", "director_rng",
  "enemy_x0", "enemy_x1", "enemy_y0", "enemy_y1", "enemy_hpos1", "enemy_hpos2",
  "enemy_pmg_rows1", "enemy_pmg_rows2",
  "enemy_pmg_mismatch1", "enemy_pmg_mismatch2",
  "enemy_pmg_mismatch_row1", "enemy_pmg_mismatch_row2",
  "enemy_pmg_mismatch_writer1", "enemy_pmg_mismatch_writer2",
  "player_projectile_recycled_checks", "player_projectile_stale_cells",
  "player_projectile_orphan_cells",
  "director_intensity", "director_reaction", "director_recovery",
  "difficulty", "active_muzzles", "entity_active", "entity_x", "entity_y",
  "entity_vx", "entity_move_accumulator", "entity_vertical_accumulator",
  "entity_render_id", "events",
  "colbk", "colpm0", "colpm1", "colpm2", "colpm3", "colpf0", "colpf1",
  "colpf2", "colpf3", "player_fighter_explosion_timer", "enemy_explosion_timer",
  "effect_active_mask", "effect_active_count", "effect_rendered_mask",
  "transient_effect_orphan_cells", "transient_effect_first_address",
  "transient_effect_first_code", "transient_effect_first_writer_pc",
  "transient_effect_first_writer_x", "stale_debris_projectile_restores",
  "transient_effect_coordinate_wraps",
  "interceptor_breakup_request_slot0", "interceptor_breakup_request_slot1",
  "raider_character_writes", "raider_transient_allocations", "raider_slot0_activations",
  "raider_kills_with_emitter_projectile_active", "emitter_owned_projectiles_at_kill",
  "emitter_owned_projectiles_removed", "foreign_projectiles_preserved",
  "foreign_projectiles_incorrectly_removed", "post_kill_emitter_projectile_continuations",
  "emitter_owned_physical_slot0_at_kill", "enemy_projectile_stale_cells",
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
for (const slot of [0, 1])
  for (const field of ["domain", "row", "pointer", "cell", "writer_pc", "projectile"])
    numericCsvFields.add(`muzzle${slot}_${field}`);
for (const field of ["muzzle_code_cells", "muzzle_illegal_cells", "muzzle_pointer_errors",
  "muzzle_illegal_address", "muzzle_illegal_code",
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
  // The missile-plane row count. Read by the pickup contact/collection
  // invariants below, which need it as a number, not as CSV text.
  "pickup_pmg_rows",
  // The missile plane measured over the whole M0-M3 quartet (pickup_pmg_rows
  // tests `& 0xf0` and sees only M2/M3), plus the number of contiguous runs of
  // non-empty rows. Owner decision 2026-09-21: the traversal invariants read
  // these instead of the dead character-renderer fields.
  "pickup_missile_rows", "pickup_missile_union", "pickup_missile_blocks",
  // The capsule's missile-plane column. Read by the pickup contact raster
  // invariant below, which derives its sample window from it.
  "pickup_hposm0",
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
  "profile_pointer_calls", "profile_pointer_cycles", "profile_publication_begin",
  "profile_erase_player_fighter_start",
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
  // `palette` is returned so callers can resolve an Atari colour register
  // value to RGB through the screenshot's own PLTE instead of hard-coding one.
  return { width, height, rgb, indices, palette };
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

function tracePcSymbols(binary) {
  return new Set(binary.toString("latin1").match(/DFTRACE_PC_[A-Z0-9_]+/g) ?? []);
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
  invariant(fs.existsSync(cpuPath), `Atari800 cpu.c is missing: ${cpuPath}`);
  const configureText = fs.readFileSync(path.join(sourceDirectory, "configure.ac"), "utf8");
  invariant(configureText.includes(`AC_INIT(Atari800, ${EXPECTED_ATARI800_VERSION},`),
    `Expected Atari800 ${EXPECTED_ATARI800_VERSION} source`);

  fs.copyFileSync(headerPath, destinationHeader);
  let cpuText = fs.readFileSync(cpuPath, "utf8");
  cpuText = cpuText.replace(/^#include "darkfighter_trace\.h"\r?\n/gm, "");
  if (!cpuText.includes('#include "voidstrike65_trace.h"')) {
    const includeAnchor = "#endif /* ASAP */\n";
    invariant(cpuText.includes(includeAnchor), "Atari800 cpu.c include anchor changed");
    cpuText = cpuText.replace(includeAnchor,
      `${includeAnchor}\n#include "voidstrike65_trace.h"\n`);
  }
  if (cpuText.includes("DFTrace_Observe(GET_PC());"))
    cpuText = cpuText.replace("DFTrace_Observe(GET_PC());",
      "DFTrace_Observe(GET_PC(), A, X, Y, S);");
  if (cpuText.includes("DFTrace_Observe(GET_PC(), X);"))
    cpuText = cpuText.replace("DFTrace_Observe(GET_PC(), X);",
      "DFTrace_Observe(GET_PC(), A, X, Y, S);");
  if (cpuText.includes("DFTrace_Observe(GET_PC(), X, Y);"))
    cpuText = cpuText.replace("DFTrace_Observe(GET_PC(), X, Y);",
      "DFTrace_Observe(GET_PC(), A, X, Y, S);");
  if (!cpuText.includes("DFTrace_Observe(GET_PC(), A, X, Y, S);")) {
    const executeAnchor = "\t\tCPU_delayed_nmi = 0;\n";
    invariant(cpuText.includes(executeAnchor), "Atari800 CPU execution anchor changed");
    cpuText = cpuText.replace(executeAnchor,
      `${executeAnchor}\t\tDFTrace_Observe(GET_PC(), A, X, Y, S);\n`);
  }
  fs.writeFileSync(cpuPath, cpuText);

  if (!fs.existsSync(path.join(sourceDirectory, "Makefile"))) {
    invariant(fs.existsSync(configurePath), `Atari800 configure is missing: ${configurePath}`);
    run(configurePath, ["--disable-sdltest", "--disable-riodevice"], { cwd: sourceDirectory });
  }
  run("make", ["-j4"], { cwd: sourceDirectory });
}

function parseCsv(csvText, sessionDefinition) {
  const lines = csvText.trim().split(/\r?\n/);
  invariant(sessionDefinition.activeFrames > 0
    ? lines.length > 1 && lines.length <= sessionDefinition.activeFrames + 257 &&
      Number(lines.at(-1).split(",")[lines[0].split(",").indexOf("active_gameplay_frame")]) ===
        sessionDefinition.activeFrames
    : lines.length === sessionDefinition.frames + 1,
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

// ---------------------------------------------------------------------------
// Hull-transient ownership model
//
// FOUR writers own a tracked muzzle's cell, or put a muzzle or launch-flash code
// into the divider row or the playfield ring:
//
//   1. the tracked-muzzle overlay, at MUZZLE_SCREEN_LO/HI[0..1] - claimed by
//      track_top_muzzles, moved by advance_tracked_muzzles, republished by
//      redraw_tracked_muzzles and backed out by restore_active_muzzles;
//   2. a broadside occluding one of those same cells - the broadsideOccludesMuzzle
//      term at the capital-muzzle assertion site;
//   3. the BROADSIDE launch flash, at BROAD_ROW_LO/HI[slot] plus that slot's turret
//      muzzle column - written by render_launch_flashes and backed out by
//      restore_launch_flash_cell (src/main.s), for exactly the frames on which
//      that slot's BROAD_FLASH_TIMER is non-zero;
//   4. a live fighter projectile standing on one of the tracked muzzle cells -
//      render_fighter_projectile_overlays @draw_top ($92D6, src/main.s:4396-4397)
//      is the last writer of any cell its PairShot occupies, the tracked muzzle's
//      included. The slot saves the covered cell into FIGHTER_PROJECTILE_BACKUP_TOP
//      (src/main.s:4376-4381) before it draws and erase_fighter_projectile_restore
//      ($2B48, src/main.s:3798-3799) returns it when the shot leaves, so the muzzle
//      glyph is occluded for those frames, not lost. Exactly the shape of writer 2,
//      which the model already credits for a broadside hull covering the same cell.
//      See 9.6 in the diagnostics note.
//
// Writer 3 was invisible to the model until now. dftrace_snapshot_muzzles
// (scripts/atari800-wall-trace.h) attributes every hull-transient code it finds to
// MUZZLE_SCREEN_LO/HI alone, but the flash addresses its cell through
// BROAD_ROW_LO/HI - an independent pointer that coincides with the tracked record
// only at broadside admission and diverges afterwards. So a correct, live flash
// counted as an orphan. See BLOCKED_MUZZLE_ORPHAN_TRANSIENT in
// docs/diagnostics/runtime-wall-trace-report-regeneration-blocked.md 8.6.
//
// The term below NARROWS the model. It exonerates ONE cell, at ONE address,
// carrying ONE code, on a frame with exactly one orphan. All of these remain
// errors:
//   - a flash code at any address no slot's live flash owns (no slot matches);
//   - a flash code at an owned address once that slot's timer has expired
//     (broad{N}_flash === 0, so that slot owns nothing at all);
//   - a muzzle code anywhere but the tracked pointers - the emulator only ever
//     reports $45/$D0 there, which never equals the side's flash code. That is the
//     52-frame defect fixed in restore_launch_flash_cell, and this term cannot
//     forgive it.
// The emulator reports only the FIRST orphan cell of a frame, so a frame carrying
// more than one orphan is never exonerated - the model cannot see the others.
const MUZZLE_COLUMN_BY_TURRET = new Map([[0, 8], [1, 31]]);
const LAUNCH_FLASH_CODE_BY_TURRET = new Map([[0, 0x51], [1, 0xd2]]);

function liveLaunchFlashOwnsIllegalCell(row) {
  if (row.muzzle_illegal_cells !== 1) return false;
  return [0, 1, 2].some((slot) => {
    if (row[`broad${slot}_flash`] === 0) return false;
    const turret = row[`broad${slot}_turret`];
    const column = MUZZLE_COLUMN_BY_TURRET.get(turret);
    return column !== undefined &&
      row[`broad${slot}_pointer`] + column === row.muzzle_illegal_address &&
      row.muzzle_illegal_code === LAUNCH_FLASH_CODE_BY_TURRET.get(turret);
  });
}

// Orphan cells that no writer in the model owns.
const unownedHullTransientCells = (row) =>
  liveLaunchFlashOwnsIllegalCell(row) ? 0 : row.muzzle_illegal_cells;

// muzzle_code_cells counts every hull-transient cell on screen, the live flash
// included, so the legality sum has to account for writer 3 as well.
const legalLaunchFlashCells = (row) => liveLaunchFlashOwnsIllegalCell(row) ? 1 : 0;

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
  const raiderSlotCount = row.trace_kind === "two-pmg-raiders-native" ? 2 : 3;
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
      raider_formation: {
        guide_y: row.enemy_y,
        member_state: [row.enemy_member0_state, row.enemy_member1_state,
          row.enemy_member2_state].slice(0, raiderSlotCount),
        member_hp: [row.enemy_member0_hp, row.enemy_member1_hp,
          row.enemy_member2_hp].slice(0, raiderSlotCount),
        live_count: row.enemy_live_count,
        active_projectiles: row.enemy_projectiles,
      },
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

function twoPmgFrameState(row) {
  return {
    ...frameState(row),
    two_pmg_raiders: [0, 1].map((slot) => ({
      slot,
      player: slot + 1,
      x: row[`enemy_x${slot}`],
      y: row[`enemy_y${slot}`],
      hpos: row[`enemy_hpos${slot + 1}`],
      nonzero_pmg_rows: row[`enemy_pmg_rows${slot + 1}`],
    })),
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
  "broadside_render", "entity_effect_render", "sector_completion",
  "projectile_render_backing", "music_sound", "main_loop_tail",
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

  const eraseStart = boundaries[1];
  const eraseEnd = boundaries[2];
  const entityEraseStart = row.profile_entity_erase_start;
  const projectileUpdateStart = boundaries[6];
  const projectileUpdateEnd = boundaries[7];
  const interceptorUpdateStart = row.profile_interceptor_update_start;
  const projectileRenderStart = boundaries[20];
  const projectileRenderEnd = boundaries[21];
  const interceptorRenderStart = row.profile_interceptor_render_start;
  const entityUpdateStart = boundaries[15];
  const entityUpdateEnd = boundaries[16];
  const effectUpdateEnd = row.profile_effect_update_end;
  const pickupUpdateEnd = row.profile_pickup_update_end;
  const entityRenderStart = boundaries[18];
  const entityRenderEnd = boundaries[19];
  const pickupRenderStart = row.profile_pickup_render_start;
  const effectRenderStart = row.profile_effect_render_start;

  const effectErase = nested(eraseStart, entityEraseStart, eraseStart, eraseEnd);
  const entityErase = nested(entityEraseStart, eraseEnd, eraseStart, eraseEnd);
  const interceptorErase = 0;
  const player_fighterErase = 0;
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
    remaining_runtime: segmentCpu(0) + segmentCpu(3) + segmentCpu(4) + segmentCpu(10) +
      segmentCpu(14) + segmentCpu(19) + segmentCpu(22),
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
      render_mainline: segmentCpu(16) + segmentCpu(17) + segmentCpu(18) + segmentCpu(20),
      erase_backing_mainline: segmentCpu(1) + segmentCpu(20),
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

// Boot-smoke observation horizon, mirrored from scripts/atari800-wall-trace.h
// (DFBOOT_MENU_FRAME / DFBOOT_GAMEPLAY_FRAME). The menu proof snapshot sits
// above the 3,000-frame owner ceiling so that a slow-but-legal boot is
// observable at all; the gameplay proof snapshot keeps the 250-frame handoff
// window the old frame-500/750 pair provided.
const BOOT_MENU_FRAME = 3050;
const BOOT_GAMEPLAY_FRAME = 3300;
// Loader-raster observation, mirrored from scripts/atari800-wall-trace.h
// (DFBOOT_LOADER_OBSERVE_OFFSET / DFBOOT_LOADER_OBSERVE_SPAN). The two loader
// snapshots are taken relative to the measured `loader` milestone instead of
// at the old fixed frames 250 and 300, which were a second constant tracking
// the transport's growth. The mirror is not a comment-only claim: every
// session asserts that the emulator captured exactly these frames.
const BOOT_LOADER_OBSERVE_OFFSET = 3;
const BOOT_LOADER_OBSERVE_SPAN = 50;
const LOADER_HOLD_FRAMES = 250;
const bootSnapshotFrames = (loaderFrame) => [
  1,
  loaderFrame + BOOT_LOADER_OBSERVE_OFFSET,
  loaderFrame + BOOT_LOADER_OBSERVE_OFFSET + BOOT_LOADER_OBSERVE_SPAN,
  BOOT_MENU_FRAME,
  BOOT_GAMEPLAY_FRAME,
];
const bootDeadlineRelativePath = "docs/boot-deadline-baseline.json";

function readBootDeadline() {
  const deadline = JSON.parse(fs.readFileSync(
    path.join(rootDirectory, bootDeadlineRelativePath), "utf8"));
  invariant(Number.isInteger(deadline.absolute_ceiling_frames) &&
    Number.isInteger(deadline.delta_fail_frames) &&
    Number.isInteger(deadline.delta_warn_frames) &&
    deadline.delta_warn_frames <= deadline.delta_fail_frames &&
    deadline.baseline && typeof deadline.baseline === "object",
  `${bootDeadlineRelativePath} is not a well-formed boot deadline baseline`);
  invariant(deadline.absolute_ceiling_frames < BOOT_MENU_FRAME,
    `${bootDeadlineRelativePath} ceiling ${deadline.absolute_ceiling_frames} is at or ` +
    `above the boot-smoke menu snapshot frame ${BOOT_MENU_FRAME}; a boot at the ceiling ` +
    "would not be observable, so raise the harness horizon with it");
  // The loader state proof is observed inside the LOADER_DURATION_FRAMES = 250
  // hold. The far observation point is OFFSET + SPAN frames past the milestone,
  // so it can only stay inside the hold while that sum is below it. This keeps
  // the harness from being re-tuned into a window that does not exist.
  invariant(BOOT_LOADER_OBSERVE_OFFSET + BOOT_LOADER_OBSERVE_SPAN < LOADER_HOLD_FRAMES,
    `The loader observation span ${BOOT_LOADER_OBSERVE_OFFSET + BOOT_LOADER_OBSERVE_SPAN} ` +
    `reaches past the ${LOADER_HOLD_FRAMES}-frame loader hold`);
  return deadline;
}

function runBootSmoke({ emulatorPath, labels, xexPath, atrPath, manifest }) {
  const bootDeadline = readBootDeadline();
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

  // Owner decision B (2026-09-20): the RAM under the BASIC ROM. Every cold
  // session reads the first 16 bytes of the window back and they must match
  // the linked image byte-exact. Under `-basic` a mismatch would mean the ROM
  // is still mapped, which is precisely what decision B stands on.
  //
  // Owner decision X (2026-09-21): the window carries the Light kernel now,
  // not the retired 16-byte inert probe, so the image is hundreds of bytes and
  // the read-back compares its HEAD. The proof is unchanged - those 16 bytes
  // are real code at $B600, and they are only there if the record landed in
  // RAM - and it now also fails if the record's first bytes are wrong.
  const basicWindow = manifest.residentCapacity?.basicWindow ?? null;
  invariant(basicWindow !== null && Number.isInteger(basicWindow.address),
    "Boot smoke needs the manifest's window accounting");
  const windowImagePath = path.join(rootDirectory, "build",
    "encounter-director-code-hybrid-window.bin");
  const windowProbe = basicWindow.usedBytes === 0 ? null : fs.readFileSync(windowImagePath);
  invariant(windowProbe === null || windowProbe.length >= 16,
    `code window content is ${windowProbe?.length} B; the boot smoke reads back 16`);
  const windowProbeHex =
    windowProbe === null ? null : windowProbe.subarray(0, 16).toString("hex");
  addressEnvironment.DFBOOT_WINDOW_ADDRESS = `0x${basicWindow.address.toString(16)}`;

  // Roadmap 4.3. The reader's own PCs are the SIO counters: a hit at
  // begin_receive is a command frame that reached the wire, a hit at settle is
  // a wire-class retry, and the level load window runs from the reader's entry
  // to the frame gameplay starts. The image at LEVEL_BUFFER is read back and
  // compared against build/level-1.bin byte for byte, which is what turns
  // "the ATR took seven frames longer" into something a gate can hold.
  const sectorReader = manifest.sectorReader ?? null;
  invariant(sectorReader !== null && Number.isInteger(sectorReader.levelBuffer?.address),
    "Boot smoke needs the manifest's sector-reader accounting");
  const levelOne = sectorReader.levels.find((level) => level.id === 1);
  invariant(levelOne !== undefined, "the manifest declares no level 1 run");
  const levelImage = fs.readFileSync(path.join(rootDirectory, "build", levelOne.file));
  invariant(levelImage.length === levelOne.bytes, "level image size differs from the manifest");
  const levelImageHex = levelImage.subarray(0, 8).toString("hex");
  // The same djb2-style rolling checksum dfboot_checksum uses, in 32-bit
  // unsigned arithmetic so the two agree bit for bit.
  const levelImageChecksum = levelImage.reduce(
    (value, byte) => ((Math.imul(value, 33) + byte) >>> 0), 0);
  const readerLabels = new Map();
  for (const line of fs.readFileSync(path.join(rootDirectory, "build", "sector-reader.lbl"),
    "utf8").split(/\r?\n/)) {
    const match = /^al\s+([0-9a-f]+)\s+\.?([^\s]+)$/i.exec(line.trim());
    if (match && !readerLabels.has(match[2])) {
      readerLabels.set(match[2], Number.parseInt(match[1], 16));
    }
  }
  const readerPc = (name) => {
    const address = readerLabels.get(name);
    invariant(Number.isInteger(address), `sector reader label ${name} is missing`);
    return `0x${address.toString(16)}`;
  };
  addressEnvironment.DFBOOT_LEVEL_ADDRESS = `0x${sectorReader.levelBuffer.address.toString(16)}`;
  addressEnvironment.DFBOOT_LEVEL_BYTES = `${levelImage.length}`;
  addressEnvironment.DFBOOT_PC_SIO_FRAME = readerPc("sector_reader_begin_receive");
  addressEnvironment.DFBOOT_PC_SIO_RETRY = readerPc("sector_reader_settle");
  addressEnvironment.DFBOOT_PC_LEVEL_LOAD = readerPc("sector_reader_load");

  const publicLaunches = atari800ArtifactLaunches(rootDirectory);
  invariant(publicLaunches.xex.artifact.path === xexPath &&
    publicLaunches.atr.artifact.path === atrPath,
  "Boot smoke must use the manifest-bound public artifact paths");
  // Owner decision A (2026-09-20): the ATR must boot without the player
  // holding OPTION. Until that fix the boot code ended in `rts` and relied on
  // OS coldstart jumping through DOSVEC, which it only does when no cartridge
  // is enabled; with BASIC enabled the OS started BASIC instead. Every cold
  // session here ran `-nobasic`, so the defect was invisible to this gate.
  // Both BASIC states are now covered on both media, at both cold RAM fills.
  // The four `-nobasic` sessions keep their identity and their position, so
  // the committed baseline and the historical session order are unchanged.
  const definitions = [];
  for (const basic of [false, true]) {
    for (const artifact of [publicLaunches.xex, publicLaunches.atr]) {
      validateAtari800Launch(artifact);
      for (const fill of [0xa5, 0x5a]) {
        definitions.push({
          ...artifact,
          path: artifact.artifact.path,
          arguments: [
            "-xe", "-pal", basic ? "-basic" : "-nobasic", "-nosound", "-turbo",
            "-no-video-accel", "-no-vsync",
            ...artifact.mediaArguments,
          ],
          fill,
          basic,
          id: `${artifact.id}-${fill.toString(16)}${basic ? "-basic" : ""}`,
        });
      }
    }
  }

  const sessions = definitions.map((definition) => {
    const outputPath = path.join(outputDirectory, `${definition.id}.json`);
    const screenshotPrefix = path.join(outputDirectory, definition.id);
    run(emulatorPath, definition.arguments, {
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
    const milestones = result.milestones;
    invariant(Number.isInteger(milestones.loader) && milestones.loader !== 0xffffffff,
      `${definition.id} never reached the loader entry point`);
    // The loader raster is a STATE proof, observed relative to the measured
    // `loader` milestone. The frames it lands on are therefore the harness's
    // own prediction, and the equality below is what keeps the mirrored
    // OFFSET/SPAN in scripts/atari800-wall-trace.h honest.
    const snapshotFrames = bootSnapshotFrames(milestones.loader);
    invariant(result.snapshots.map(({ frame }) => frame).join(",") ===
      snapshotFrames.join(","),
    `${definition.id} did not capture all five required PAL frames ` +
      `(${snapshotFrames.join(", ")}) for loader milestone ${milestones.loader}`);
    const byFrame = new Map(result.snapshots.map((snapshot) => [snapshot.frame, snapshot]));
    const [, loaderNearFrame, loaderFarFrame] = snapshotFrames;
    const loaderNear = byFrame.get(loaderNearFrame);
    const loaderFar = byFrame.get(loaderFarFrame);
    const menu = byFrame.get(BOOT_MENU_FRAME);
    const gameplay = byFrame.get(BOOT_GAMEPLAY_FRAME);
    // Both observation points now sit inside the loader hold by construction,
    // so both must be complete. Under the old fixed pair the earlier snapshot
    // fell before the ATR loader raster and was waved through, which meant the
    // countdown-advance proof quietly did not run on the ATR at all.
    for (const snapshot of [loaderNear, loaderFar]) {
      invariant(snapshot.game_state === 0 && snapshot.dlist === expected.loader_dlist &&
        snapshot.charset_address === 0xe000 && snapshot.dma_ctl === 0x22 &&
        snapshot.nmi_en === 0x80 && snapshot.vdslst === expected.loader_dli,
      `${definition.id} loader display/VBI state is invalid at frame ${snapshot.frame} ` +
        `(loader milestone ${milestones.loader})`);
    }
    invariant(loaderFar.loader_timer > 0 &&
      loaderNear.loader_timer - loaderFar.loader_timer === BOOT_LOADER_OBSERVE_SPAN,
    `${definition.id} loader countdown did not advance one frame per PAL frame between ` +
      `frames ${loaderNearFrame} and ${loaderFarFrame}: ` +
      `${loaderNear.loader_timer} -> ${loaderFar.loader_timer}`);
    // Owner decision 22 (2026-09-18) re-bases this deadline. The old
    // `190 + 2 x transport sectors` formula was an identity tracking its own
    // growth: every new sector raised both the cost and the limit, so the
    // margin stayed zero by construction and a load-time budget nobody chose
    // shaped engineering decisions. Two independent numbers replace it:
    //   * an absolute ceiling — the owner's real budget, the main menu within
    //     60 s = 3,000 PAL frames;
    //   * a delta against a committed baseline, which does not move on its
    //     own, so an unexplained loader/decode regression with no sector
    //     change is still caught.
    // The gate is NOT deleted: a build that suddenly boots twice as slowly is
    // still a bug. Growth is visible and deliberate instead of forbidden —
    // when the transport grows on purpose, re-record
    // `docs/boot-deadline-baseline.json` in the same commit and state the
    // reason in the commit message.
    const medium = definition.id.startsWith("atr") ? "atr" : "xex";
    const baselineMenu = bootDeadline.baseline[`${medium}_menu_frames`];
    invariant(Number.isInteger(baselineMenu),
      `${bootDeadlineRelativePath} has no ${medium}_menu_frames baseline`);
    const ceiling = bootDeadline.absolute_ceiling_frames;
    // The loader milestone gets the same two independent numbers, re-based
    // 2026-09-20 in the shape of decision 22. It used to be gated only by
    // accident, through the hard-coded frame-300 observation point: the loader
    // raster arrives at `start + stage-2 decode`, so each added transport
    // sector pushed it later, and at the measured ATR milestone 297 the
    // checkpoint had 3 frames of slack left. That constant tracked the
    // transport exactly as the old `190 + 2 x sectors` menu formula did, and
    // the first real record landed in the BASIC window would have tripped it —
    // reported as "the loader raster never came up", which is not what would
    // have happened. The observation point now follows the measurement and the
    // budget is stated here instead.
    const baselineLoader = bootDeadline.baseline[`${medium}_loader_frames`];
    invariant(Number.isInteger(baselineLoader),
      `${bootDeadlineRelativePath} has no ${medium}_loader_frames baseline`);
    invariant(milestones.menu <= ceiling && milestones.frontend_poll <= ceiling,
      `${definition.id} did not reach the production main-menu input path within the ` +
      `${ceiling}-frame (${(ceiling / 50).toFixed(0)} s PAL) owner budget: menu ` +
      `${milestones.menu}, frontend_poll ${milestones.frontend_poll}`);
    const menuDelta = milestones.menu - baselineMenu;
    invariant(menuDelta <= bootDeadline.delta_fail_frames &&
      milestones.frontend_poll <= baselineMenu + bootDeadline.delta_fail_frames + 1,
    `${definition.id} reached the main menu at frame ${milestones.menu}, ` +
      `${menuDelta} frames over the committed baseline ${baselineMenu} (fail band ` +
      `+${bootDeadline.delta_fail_frames}). If the transport grew on purpose, ` +
      `re-record ${bootDeadlineRelativePath} in the same commit and say why.`);
    invariant(milestones.loader <= ceiling,
      `${definition.id} did not raise the loader raster within the ${ceiling}-frame ` +
      `(${(ceiling / 50).toFixed(0)} s PAL) owner budget: loader ${milestones.loader}`);
    const loaderDelta = milestones.loader - baselineLoader;
    invariant(loaderDelta <= bootDeadline.delta_fail_frames,
      `${definition.id} raised the loader raster at frame ${milestones.loader}, ` +
      `${loaderDelta} frames over the committed baseline ${baselineLoader} (fail band ` +
      `+${bootDeadline.delta_fail_frames}). If the transport grew on purpose, ` +
      `re-record ${bootDeadlineRelativePath} in the same commit and say why.`);
    const loaderDeadlineWarned = loaderDelta > bootDeadline.delta_warn_frames;
    if (loaderDeadlineWarned) {
      process.stderr.write(`warning: ${definition.id} raised the loader raster at frame ` +
        `${milestones.loader}, ${loaderDelta} frames over the committed baseline ` +
        `${baselineLoader} (warn band +${bootDeadline.delta_warn_frames}, fail band ` +
        `+${bootDeadline.delta_fail_frames})\n`);
    }
    const menuDeadlineWarned = menuDelta > bootDeadline.delta_warn_frames;
    if (menuDeadlineWarned) {
      process.stderr.write(`warning: ${definition.id} reached the main menu at frame ` +
        `${milestones.menu}, ${menuDelta} frames over the committed baseline ` +
        `${baselineMenu} (warn band +${bootDeadline.delta_warn_frames}, fail band ` +
        `+${bootDeadline.delta_fail_frames})\n`);
    }
    const sectorReaderResult = {
      medium: medium.toUpperCase(),
      command_frames: result.sio.command_frames,
      expected_command_frames: definition.id.startsWith("xex") ? 0 : levelOne.sectors,
      wire_retries: result.sio.wire_retries,
      level_load_frames: result.sio.level_load_end - result.sio.level_load_begin,
      level_image_verified: true,
      path: definition.id.startsWith("xex")
        ? "resident skip: the XEX carries the image as a block and never reaches SIO"
        : "direct SIO: one command frame per sector at START GAME",
    };
    const bootDeadlineResult = {
      medium: medium.toUpperCase(),
      menu_frame: milestones.menu,
      frontend_poll_frame: milestones.frontend_poll,
      baseline_frames: baselineMenu,
      delta_frames: menuDelta,
      absolute_ceiling_frames: ceiling,
      warn_at_frames: baselineMenu + bootDeadline.delta_warn_frames,
      fail_at_frames: baselineMenu + bootDeadline.delta_fail_frames,
      warned: menuDeadlineWarned,
      loader_frame: milestones.loader,
      loader_baseline_frames: baselineLoader,
      loader_delta_frames: loaderDelta,
      loader_warn_at_frames: baselineLoader + bootDeadline.delta_warn_frames,
      loader_fail_at_frames: baselineLoader + bootDeadline.delta_fail_frames,
      loader_warned: loaderDeadlineWarned,
      loader_observation_frames: [loaderNearFrame, loaderFarFrame],
    };
    invariant(gameplay.game_state === 6 && gameplay.charset_address === 0x5000 &&
      gameplay.pm_base === 0x3800 && gameplay.dma_ctl === 0x3e &&
      gameplay.nmi_en === 0x80 && gameplay.vdslst === expected.gameplay_dli &&
      gameplay.dlist >= expected.playfield_dlist_a &&
      gameplay.dlist < expected.playfield_dlist_b + expected.playfield_dlist_bytes,
    `${definition.id} did not reach the legal gameplay display/VBI path by frame ` +
      `${BOOT_GAMEPLAY_FRAME}`);
    invariant(Object.values(milestones).every((frame) => frame !== 0xffffffff) &&
      milestones.start < milestones.loader && milestones.loader < milestones.menu &&
      milestones.menu <= milestones.frontend_poll &&
      milestones.frontend_poll < milestones.gameplay_init &&
      milestones.gameplay_init <= milestones.main_loop &&
      milestones.main_loop < BOOT_GAMEPLAY_FRAME,
    `${definition.id} did not execute the complete loader-to-gameplay handoff`);
    for (const snapshot of [menu, gameplay]) {
      invariant(windowProbeHex === null || snapshot.window === windowProbeHex,
        `${definition.id} code window read-back at $${basicWindow.address.toString(16)} reads ` +
        `${snapshot.window} at frame ${snapshot.frame}, expected ${windowProbeHex}` +
        `${definition.basic ? " (BASIC enabled: the ROM may still be mapped)" : ""}`);
      invariant((snapshot.portb & 0x02) === 0x02,
        `${definition.id} PORTB bit 1 is clear at frame ${snapshot.frame}: the BASIC ROM is ` +
        "mapped over the window");
    }
    if (definition.id.startsWith("xex")) {
      invariant(menu.runad === expected.xex_entry,
        `${definition.id} XEX RUNAD does not point at the stage-2 parity entry`);
    } else {
      invariant(menu.dosvec === expected.start,
        `${definition.id} ATR DOSVEC does not point at the game entry`);
    }

    // --- roadmap 4.3: the level image, and how it got there -----------------
    //
    // The gameplay snapshot is taken after START GAME, so by then the reader
    // has run on both media. What differs is the route: the XEX carries the
    // image as a block and must take the resident skip without touching SIO,
    // the ATR must read it over the wire. Both must end with the same bytes
    // in the same place.
    invariant(gameplay.level_header === levelImageHex &&
      gameplay.level_checksum === levelImageChecksum,
    `${definition.id} has the wrong level image at ` +
    `$${sectorReader.levelBuffer.address.toString(16)}: header ${gameplay.level_header} ` +
    `checksum ${gameplay.level_checksum}, expected ${levelImageHex} / ${levelImageChecksum}`);
    const sio = result.sio;
    invariant(sio !== undefined, `${definition.id} recorded no SIO counters`);
    invariant(sio.wire_retries === 0,
      `${definition.id} needed ${sio.wire_retries} wire retries; the emulator's ` +
      "wire is lossless, so any retry is a reader defect");
    if (definition.id.startsWith("xex")) {
      invariant(sio.command_frames === 0,
        `${definition.id} put ${sio.command_frames} command frames on the wire; the XEX ` +
        "carries the level image as a block and must take the resident-skip path");
    } else {
      invariant(sio.command_frames === levelOne.sectors,
        `${definition.id} put ${sio.command_frames} command frames on the wire, ` +
        `expected exactly ${levelOne.sectors} - one per sector, no retries`);
    }
    invariant(sio.level_load_begin >= 0 && sio.level_load_end >= sio.level_load_begin,
      `${definition.id} did not record a level load window`);
    const loadFrames = sio.level_load_end - sio.level_load_begin;
    invariant(loadFrames <= BOOT_LEVEL_LOAD_CEILING_FRAMES,
      `${definition.id} spent ${loadFrames} frames in the level load, ceiling ` +
      `${BOOT_LEVEL_LOAD_CEILING_FRAMES}; if this is far over, the wait primitive is ` +
      "wrong, not the budget (plan §10.3)");
    const screenshots = snapshotFrames.map((frame) => {
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
      basic_enabled: definition.basic,
      artifact: {
        path: path.relative(rootDirectory, definition.path),
        absolute_path: definition.path,
        bytes: definition.artifact.bytes,
        sha256: definition.artifact.sha256,
      },
      launch: {
        emulator_path: path.resolve(emulatorPath),
        arguments: definition.arguments,
        mode: definition.mode,
      },
      snapshots: result.snapshots,
      milestones,
      boot_deadline: bootDeadlineResult,
      sector_reader: sectorReaderResult,
      screenshots,
      passed: true,
    };
  });

  const gameplayScreenshots = sessions.map((session) => ({
    artifact: session.artifact,
    sha256: session.screenshots.find(({ frame }) => frame === BOOT_GAMEPLAY_FRAME).sha256,
  }));

  const evidence = {
    emulator: "Atari800 7.1.2 PAL/XL",
    frames_observed: BOOT_GAMEPLAY_FRAME,
    duration_seconds_pal: BOOT_GAMEPLAY_FRAME / 50,
    guest_instrumentation_bytes: 0,
    cold_ram_range: "$8000-$9FFF",
    // Roadmap 4.3: what the reader actually did on each medium, so the read is
    // evidence rather than an inference from a frame delta.
    sector_reader: {
      address: sectorReader.address,
      bytes: sectorReader.bytes,
      free_bytes: sectorReader.freeBytes,
      level_buffer_address: sectorReader.levelBuffer.address,
      level_image_file: levelOne.file,
      level_image_bytes: levelImage.length,
      level_image_checksum: levelImageChecksum,
      level_image_header_hex: levelImageHex,
      verified_at_frames: [BOOT_GAMEPLAY_FRAME],
      per_session: sessions.map((session) => ({
        id: session.id, ...session.sector_reader,
      })),
      note: "XEX sessions must put 0 command frames on the wire (resident skip, owner " +
        "decision 1); ATR sessions exactly one per sector with 0 retries. The image at " +
        "LEVEL_BUFFER is compared byte for byte against the build's own level image.",
    },
    basic_window: {
      address: basicWindow.address,
      guard_address: basicWindow.guardAddress,
      end_exclusive: basicWindow.endExclusive,
      capacity_bytes: basicWindow.capacityBytes,
      used_bytes: basicWindow.usedBytes,
      free_bytes: basicWindow.freeBytes,
      probe_bytes: windowProbe === null ? 0 : windowProbe.length,
      probe_hex: windowProbeHex,
      window_read_back_at_frames: [BOOT_MENU_FRAME, BOOT_GAMEPLAY_FRAME],
      portb_bit1_asserted_at_frames: [BOOT_MENU_FRAME, BOOT_GAMEPLAY_FRAME],
    },
    basic_states_covered: ["-nobasic", "-basic"],
    input: `production joystick path; FIRE pressed on host frames ` +
      `${BOOT_MENU_FRAME + 1}-${BOOT_MENU_FRAME + 6}`,
    expected_addresses: expected,
    menu_snapshot_frame: BOOT_MENU_FRAME,
    gameplay_snapshot_frame: BOOT_GAMEPLAY_FRAME,
    loader_observation: {
      offset_frames: BOOT_LOADER_OBSERVE_OFFSET,
      span_frames: BOOT_LOADER_OBSERVE_SPAN,
      loader_hold_frames: LOADER_HOLD_FRAMES,
      relative_to: "milestones.loader",
    },
    deadline: {
      absolute_ceiling_frames: bootDeadline.absolute_ceiling_frames,
      delta_fail_frames: bootDeadline.delta_fail_frames,
      delta_warn_frames: bootDeadline.delta_warn_frames,
      baseline: bootDeadline.baseline,
      baseline_path: bootDeadlineRelativePath,
    },
    sessions,
    gameplay_frame_sha256: gameplayScreenshots,
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
  // The owner-accepted main-menu image, pinned deliberately: this is a description of
  // a player-visible artifact, not a transport or build figure that should be derived.
  // Nothing in the repository can regenerate it, and a raster that moves without an
  // owner smoke is exactly what this clause exists to catch. Re-accepted 2026-09-20
  // after 9d22ee2: style_main_menu_title hard-coded `ldx #11` against a fourteen-
  // character title, so the highlight run was two cells short and "65" stayed plain.
  // Both runs now derive from MAIN_MENU_TITLE_TEXT in src/main.s, the image changed
  // for that known reason, and all ten required checkpoints agree on the new raster.
  const canonicalRasterSha256 =
    "ee08628457a1c489a7ee780c7e2739410c31284c53e9b021f4d2ff8efad8999a";
  const residentRuntime = fs.readFileSync(path.join(
    rootDirectory, "build", "resident-runtime.bin"));
  const stageTableOffset = labels.get("boot_stage_streams") -
    manifest.residentRuntime.runAddress;
  // The table's length is the assembled table's own, not a count the gate carries:
  // 4.5M-M1 split the starfield into two streams and a fixed 5 stopped describing it.
  const stageTableBytes =
    labels.get("boot_stage_streams_end") - labels.get("boot_stage_streams");
  invariant(Number.isInteger(stageTableBytes / 6) && stageTableBytes > 0,
    `boot_stage_streams spans ${stageTableBytes} B, not a whole number of six-byte entries`);
  const stageStreamCount = stageTableBytes / 6;
  invariant(stageTableOffset >= 0 &&
    stageTableOffset + stageTableBytes <= residentRuntime.length,
    "boot_stage_streams does not lie inside the resident runtime image");
  const bootStageStreams = Array.from({ length: stageStreamCount }, (_, index) => {
    const offset = stageTableOffset + index * 6;
    return {
      source: residentRuntime.readUInt16LE(offset),
      destination: residentRuntime.readUInt16LE(offset + 2),
      bytes: residentRuntime.readUInt16LE(offset + 4),
    };
  });
  // Every figure below is manifest-owned. $4801 is the one exception: the frontend
  // charset scratch window is a fixed architectural address, not a build-derived one.
  const expectedStagedSources = [
    { name: "A2 initial source", source: manifest.a2Kernel.sourceAddress,
      destination: manifest.a2Kernel.stagingAddress, bytes: manifest.a2Kernel.bytes },
    { name: "packed ENTITY_CODE",
      source: manifest.entityEffects.packedSourceAddress,
      destination: manifest.entityEffects.stagedSourceAddress,
      bytes: manifest.entityEffects.packedBytes },
    { name: "packed pickup",
      source: manifest.entityEffects.pickupPhaseExternalChunk.stagingAddress,
      destination: 0x4801, bytes: manifest.entityEffects.pickupPhasePackedBytes },
    { name: "packed resident suffix",
      source: manifest.residentRuntime.packedSourceAddress,
      destination: manifest.residentRuntime.stagingAddress,
      bytes: manifest.residentRuntime.suffixPackedBytes },
    ...manifest.starfieldRuntime.streams.map((stream) => ({
      name: `packed starfield ${stream.id}`,
      source: stream.packedSourceAddress,
      destination: stream.stagingAddress,
      bytes: stream.packedBytes,
    })),
  ];
  const expectedBootStageStreams = expectedStagedSources.map(
    ({ source, destination, bytes }) => ({ source, destination, bytes }));
  invariant(bootStageStreams.length === expectedBootStageStreams.length,
    `boot_stage_streams assembles ${bootStageStreams.length} streams, but the manifest ` +
    `describes ${expectedBootStageStreams.length}`);
  for (const [index, assembled] of bootStageStreams.entries()) {
    const wanted = expectedBootStageStreams[index];
    invariant(JSON.stringify(assembled) === JSON.stringify(wanted),
      `boot stage stream ${index + 1} (${expectedStagedSources[index].name}) assembles ` +
      `${JSON.stringify(assembled)} but the manifest describes ${JSON.stringify(wanted)}`);
  }
  const stagedSources = bootStageStreams.map((stream, index) => ({
    name: expectedStagedSources[index].name,
    start: stream.source,
    end_exclusive: stream.source + stream.bytes,
    last_read: index + 1,
  }));
  // `copy_boot_stream = copy_boot_stream_backward` (src/main.s:1271-1275): every
  // boot preservation copy runs from the last byte down, so a record whose
  // destination sits at or above its OWN source has memmove semantics and is
  // safe however far the two intervals overlap -- packed ENTITY_CODE relies on
  // exactly that. A destination below its own source, or any intersection with
  // ANOTHER record's still-unread source, destroys bytes either way.
  const liveSourceOverwrites = [];
  for (const [index, write] of bootStageStreams.entries()) {
    const sequence = index + 1;
    const writeEnd = write.destination + write.bytes;
    for (const sourceRange of stagedSources) {
      if (sequence > sourceRange.last_read) continue;
      if (write.destination >= sourceRange.end_exclusive || writeEnd <= sourceRange.start) {
        continue;
      }
      const ownSource = sourceRange.last_read === sequence;
      if (ownSource && write.destination >= sourceRange.start) continue;
      liveSourceOverwrites.push({ sequence, source: sourceRange.name,
        reason: ownSource ? "backward copy cannot move a record down into its own source"
          : "destination covers another record's still-unread source" });
    }
  }
  invariant(liveSourceOverwrites.length === 0,
    `boot staging destroys a packed source before its final read: ${
      liveSourceOverwrites.map(({ sequence, source, reason }) =>
        `stream ${sequence} vs ${source} (${reason})`).join("; ")}`);
  const dfmcRecords = manifest.transportCapacity.manifest.parsed.records.map((record) => ({
    start_sector: record.startSector,
    sectors: record.sectorCount,
    packed_bytes: record.packedLength,
    raw_bytes: record.rawLength,
    destination: record.finalDestination,
    staging_id: record.stagingId,
  }));
  // This audit proves the main menu raster is byte-exact across four generations,
  // two media and four cold RAM fills. What it needs from the DFMC records is not
  // their layout -- which tracks the transport and so changes on every content
  // commit -- but that the transport is self-consistent and that nothing it lands
  // sits in the memory the menu owns and regenerates. Asserting the layout instead
  // made this a snapshot that had to be re-recorded by hand in four unrelated
  // commits (11c48e2, cd0db3e, 2b7f299, 10f1be2) before going stale entirely.
  const menuOwnedRanges = [
    { name: "frontend screen", start: 0x4000, end_exclusive: 0x4400 },
    { name: "frontend charset", start: 0x4800, end_exclusive: 0x4c00 },
    { name: "frontend display lists", start: labels.get("main_menu_display_list"),
      end_exclusive: labels.get("frontend_display_lists_end") },
  ];
  const initialBootSectors = manifest.transportCapacity.initialBootSectors;
  let nextFreeSector = initialBootSectors + 1;
  for (const [index, record] of dfmcRecords.entries()) {
    const position = `DFMC record ${index + 1} of ${dfmcRecords.length}`;
    invariant(record.start_sector === nextFreeSector,
      `${position} starts at sector ${record.start_sector}, leaving a hole or an ` +
      `overlap: the previous record and the ${initialBootSectors}-sector boot block ` +
      `end at sector ${nextFreeSector - 1}, and DFMC records must be contiguous ` +
      "and ascending");
    invariant(record.sectors * 128 >= record.packed_bytes,
      `${position} claims ${record.sectors} sectors (${record.sectors * 128} B) for ` +
      `${record.packed_bytes} packed bytes, which does not fit`);
    for (const range of menuOwnedRanges) {
      const landingEnd = record.destination + record.raw_bytes;
      invariant(record.destination >= range.end_exclusive || landingEnd <= range.start,
        `${position} lands at $${record.destination.toString(16)}-` +
        `$${(landingEnd - 1).toString(16)}, inside the ${range.name} ` +
        `($${range.start.toString(16)}-$${(range.end_exclusive - 1).toString(16)}), ` +
        "which the menu owns and regenerates");
    }
    nextFreeSector = record.start_sector + record.sectors;
  }
  const occupiedSectors = manifest.transportCapacity.manifest.parsed.totalOccupiedSectors;
  invariant(nextFreeSector - 1 === occupiedSectors,
    `the DFMC records end at sector ${nextFreeSector - 1}, but the transport manifest ` +
    `declares ${occupiedSectors} occupied sectors`);
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
  const earlyEnemyOnly = process.argv.includes("--early-enemy-only");
  const raiderFormationOnly = process.argv.includes("--raider-formation-only");
  const raiderSectorOnly = process.argv.includes("--raider-sector-only");
  const pairShotOnly = process.argv.includes("--pairshot-only");
  const pairShotStaleOnly = process.argv.includes("--pairshot-stale-only");
  const raiderRemnantOnly = process.argv.includes("--raider-remnant-only");
  const raiderFirstWriterOnly = process.argv.includes("--raider-first-writer-only");
  const playerPairShotSpeedOnly = process.argv.includes("--player-pairshot-speed-only");
  const playerPairShotReentryOnly = process.argv.includes("--player-pairshot-reentry-only");
  const boosterAdmissionOnly = process.argv.includes("--booster-admission-only");
  const effectsStaggerOnly = process.argv.includes("--effects-stagger-only");
  const debrisSlot0BaselineOnly = process.argv.includes("--debris-slot0-baseline-only");
  const debrisGateOnly = process.argv.includes("--debris-gate-only");
  const skipBootSmoke = process.argv.includes("--skip-boot-smoke");
  const tracePreflightOnly = process.argv.includes("--trace-preflight-only");
  const reuseExistingTraces = process.argv.includes("--reuse-existing-traces");
  // Light multiplicity plan §4.3.
  const lightTrace = process.argv.includes("--light-trace");
  const lightCeiling = argumentValue("light-ceiling");
  const smokeFramesArgument = argumentValue("smoke-frames");
  const smokeFrames = smokeFramesArgument === undefined ? null : Number(smokeFramesArgument);
  const smokeDifficulty = Number(argumentValue("smoke-difficulty") ?? 2);
  const onlySession = argumentValue("only-session");
  const activeFrames = Number(argumentValue("active-frames") ?? 0);
  invariant(Number.isInteger(activeFrames) && activeFrames >= 0 && activeFrames <= 1800,
    "--active-frames must be an integer from 0 to 1800");
  const pickupFenceTrace = process.argv.includes("--pickup-fence-trace");
  invariant(smokeFrames === null || Number.isInteger(smokeFrames) && smokeFrames > 0,
    "--smoke-frames must be a positive integer");
  invariant(Number.isInteger(smokeDifficulty) && smokeDifficulty >= 0 && smokeDifficulty <= 2,
    "--smoke-difficulty must be 0, 1, or 2");
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
  // Light multiplicity step 1b: the Light ASM kernel is its own link.
  const kernelLabelPath = path.join(rootDirectory, "build", "light-kernel.lbl");
  const kernelLabels = fs.existsSync(kernelLabelPath)
    ? parseViceLabels(fs.readFileSync(kernelLabelPath, "utf8")) : new Map();
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
  addressEnvironment.DFTRACE_CORRIDOR_PHASE_HI =
    `0x${labels.get("CORRIDOR_PHASE_HI").toString(16)}`;
  addressEnvironment.DFTRACE_LOADER_REPEAT_VALUE =
    `0x${labels.get("loader_repeat_value").toString(16)}`;
  addressEnvironment.DFTRACE_ACTIVE_GAMEPLAY_FRAME_LO = "0x4ff8";
  addressEnvironment.DFTRACE_ENEMY_Y = `0x${labels.get("ENEMY_Y").toString(16)}`;
  addressEnvironment.DFTRACE_DIRECTOR_STATE = "0x80f6";

  if (tracePreflightOnly) {
    const observerSymbols = tracePcSymbols(fs.readFileSync(emulatorPath));
    const generatedSymbols = new Set(Object.keys(addressEnvironment)
      .filter((name) => name.startsWith("DFTRACE_PC_")));
    const observerHasDynamicProfiles = observerSymbols.delete("DFTRACE_PC_PROFILE");
    const generatedProfiles = [...generatedSymbols]
      .filter((name) => /^DFTRACE_PC_PROFILE\d+$/.test(name));
    for (const name of generatedProfiles) generatedSymbols.delete(name);
    invariant(observerHasDynamicProfiles &&
      generatedProfiles.length === traceProfileLabels.length,
    "Trace profile binding family is incomplete");
    const missingFromGenerator = [...observerSymbols]
      .filter((name) => !generatedSymbols.has(name)).sort();
    const missingFromObserver = [...generatedSymbols]
      .filter((name) => !observerSymbols.has(name)).sort();
    invariant(missingFromGenerator.length === 0 && missingFromObserver.length === 0,
      `Trace PC binding mismatch: observer-only=${missingFromGenerator.join(",") || "none"}; ` +
      `generator-only=${missingFromObserver.join(",") || "none"}`);
    console.log(`Trace preflight: ${observerSymbols.size} observer PC symbols match generated labels`);
    return;
  }

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
  const bootSmoke = skipBootSmoke ? null :
    runBootSmoke({ emulatorPath, labels, xexPath, atrPath, manifest });
  if (bootSmoke !== null)
    console.log(`Boot smoke: ${bootSmoke.sessions.length} XEX/ATR cold-start sessions passed`);
  if (bootSmokeOnly) {
    invariant(bootSmoke !== null, "--boot-smoke-only cannot be combined with --skip-boot-smoke");
    console.log(`Report: ${path.relative(rootDirectory,
      path.join(buildDirectory, "boot-smoke", "report.json"))}`);
    return;
  }
  const allRows = [];
  const summaries = [];
  // Behavioural-clause failures accumulated across the session loop instead of
  // aborting the run at the first one (owner decision 2026-09-19, stage 1).
  // This list is ANDed into report.gate.passed and published in the report:
  // the file's existence is no longer the pass signal, so a report written on a
  // run that had a clause failure can never authorise a final build.
  const sessionFailures = [];
  // Every traced replay is audited against the VCOUNT $77 fence, not only the
  // four PAL replays: the native counters cannot see an overrun at all.
  const palTimingAudits = [];
  const pickupScreenshotPath = path.join(buildDirectory, "weapon-pickup-static-atari800.png");
  const boosterAdmissionScreenshotPath = path.join(buildDirectory,
    "booster-admission-reentry-atari800.png");
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
  if (!reuseExistingTraces && boosterAdmissionOnly &&
    fs.existsSync(boosterAdmissionScreenshotPath))
    fs.unlinkSync(boosterAdmissionScreenshotPath);
  let sessionsToRun = boosterAdmissionOnly
    ? boosterAdmissionReentrySessions
    : debrisGateOnly
    ? debrisVisibilityGateSessions
    : playerPairShotReentryOnly
    ? playerPairShotReentrySessions
    : debrisSlot0BaselineOnly
    ? debrisSlot0BaselineSessions
    : playerPairShotSpeedOnly
    ? playerPairShotSpeedSessions
    : raiderFirstWriterOnly
    ? raiderFirstWriterSessions
    : raiderRemnantOnly
    ? raiderRemnantSessions
    : pairShotStaleOnly
    ? pairShotStaleSessions
    : effectsStaggerOnly
    ? [...pairShotSessions, ...debrisEffectsSessions]
    : pairShotOnly
    ? pairShotSessions
    : raiderFormationOnly
    ? raiderFormationSessions
    : raiderSectorOnly
    ? raiderSectorSessions
    : earlyEnemyOnly
    ? provisionalCapitalSessions
    : broadsideTransientOnly
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
    : [{ ...baselineSessions[0], difficulty: smokeDifficulty,
      id: "observer-smoke", kind: "observer-smoke", frames: smokeFrames }];
  if (onlySession?.startsWith("pmg-lab-"))
    sessionsToRun = pmgLabSessions;
  if (onlySession !== undefined) {
    sessionsToRun = sessionsToRun.filter(({ id }) => id === onlySession);
    invariant(sessionsToRun.length === 1, `Unknown trace session: ${onlySession}`);
  }
  for (const session of sessionsToRun) {
    session.activeFrames = activeFrames;
    const outputPath = path.join(buildDirectory, `${session.id}.csv`);
    const pmgLabScreenshotPath = session.kind === "pmg-visibility-lab"
      ? path.join(buildDirectory, `${session.id}-atari800.png`) : undefined;
    const firstWriterOutput = session.kind === "raider-first-writer-native"
      ? path.join(buildDirectory, `${session.id}-first-writer.csv`) : undefined;
    const interceptorProjectileOutput = session.kind === "raider-first-writer-native"
      ? path.join(buildDirectory, `${session.id}-enemy-projectiles.csv`) : undefined;
    const playerPairShotOutput = session.kind === "player-pairshot-speed-native" ||
      session.kind === "player-pairshot-reentry-native"
      ? path.join(buildDirectory, `${session.id}-player-pairshots.csv`) : undefined;
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
    invariant(capitalScreenshotPrefix === undefined ||
      capitalContactPrefixKinds.has(session.kind),
    `${session.id} sets DFTRACE_CAPITAL_CONTACT_PREFIX under kind ${session.kind}, ` +
    "which capitalContactPrefixKinds does not cover");
    assertCapitalContactEnvironment(session);
    const raiderScreenshotPrefix = session.kind === "two-pmg-raiders-native"
      ? path.join(buildDirectory, session.id) : undefined;
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
    if (raiderScreenshotPrefix !== undefined && !reuseExistingTraces) {
      const basename = path.basename(raiderScreenshotPrefix);
      for (const name of fs.readdirSync(buildDirectory)) {
        if (name.startsWith(`${basename}-`) && name.endsWith(".png"))
          fs.unlinkSync(path.join(buildDirectory, name));
      }
    }
    const environment = {
      ...process.env,
      SDL_VIDEODRIVER: process.env.SDL_VIDEODRIVER ?? "dummy",
      ...addressEnvironment,
      DFTRACE_FRAMES: String(activeFrames === 0 ? session.frames : activeFrames + 256),
      DFTRACE_ACTIVE_FRAMES: String(activeFrames),
      DFTRACE_FIRE_DELAY: String(session.fireDelay),
      DFTRACE_DIFFICULTY: String(session.difficulty),
      DFTRACE_POLICY: session.policy,
      DFTRACE_SESSION: session.id,
      DFTRACE_OUTPUT: outputPath,
      ...(firstWriterOutput === undefined ? {} : {
        DFTRACE_FIRST_WRITER_OUTPUT: firstWriterOutput,
      }),
      ...(interceptorProjectileOutput === undefined ? {} : {
        DFTRACE_INTERCEPTOR_PROJECTILE_OUTPUT: interceptorProjectileOutput,
      }),
      ...(playerPairShotOutput === undefined ? {} : {
        DFTRACE_PLAYER_PAIRSHOT_OUTPUT: playerPairShotOutput,
      }),
      ...(pickupFenceTrace ? {
        DFTRACE_FENCE_OUTPUT: path.join(buildDirectory, `${session.id}-fence.jsonl`),
        DFTRACE_FENCE_WAIT: String(labels.get("wait_gameplay_frame")),
        DFTRACE_FENCE_LOOP: String(labels.get("wait_frame_at_line")),
        DFTRACE_FENCE_SCREENSHOTS: "1",
      } : {}),
      // Light multiplicity plan §4.3: one row per tick with all four slot
      // states and the frame's five kernel vector-entry counts, so the
      // analysis can bucket frames by live count and separate the admission
      // and kill frames from the standing ones. Opt-in with --light-trace.
      ...(lightTrace ? {
        DFTRACE_LIGHT_OUTPUT: path.join(buildDirectory, `${session.id}-light.csv`),
        DFTRACE_LIGHT_BASE: String(directorLabels.get("light_state")),
        DFTRACE_LIGHT_VECTOR_BASE: String(kernelLabels.get("light_kernel_vectors")),
        ...(lightCeiling === undefined ? {} : {
          DFTRACE_LIGHT_CEILING: String(directorLabels.get("_light_ceiling_swarm")),
          DFTRACE_LIGHT_CEILING_VALUE: String(lightCeiling),
        }),
      } : {}),
	  ...(session.coldFill === undefined ? {} : { DFTRACE_RAM_FILL: String(session.coldFill) }),
	  ...(session.frontendDelay === undefined ? {} : {
	    DFTRACE_FRONTEND_DELAY: String(session.frontendDelay),
	  }),
      ...(session.pauseTest ? { DFTRACE_PAUSE_TEST: "1" } : {}),
      ...(session.kind === "debris-visibility-gate" ? {
        DFDEBRIS_GATE_OUTPUT: path.join(buildDirectory, `${session.id}-debris-gate.csv`),
        DFDEBRIS_ROW_OUTPUT: path.join(buildDirectory, `${session.id}-debris-row.json`),
        DFDEBRIS_PC_ERASE: String(labels.get("erase_interactive_entity_overlays")),
        DFDEBRIS_PC_RENDER: String(labels.get("render_interactive_entity_overlays")),
      } : {}),
      ...(session.kind === "weapon-pickup-coverage" && !pairShotOnly ? {
        DFTRACE_PICKUP_SCREENSHOT: pickupScreenshotPath,
        DFTRACE_PICKUP_SEQUENCE_PREFIX: pickupSequencePrefix,
        DFTRACE_RAPID_SCREENSHOT: rapidScreenshotPath,
        DFTRACE_SPREAD_SCREENSHOT: spreadScreenshotPath,
      } : {}),
      ...(session.kind === "booster-admission-native" ? {
        DFTRACE_PICKUP_SCREENSHOT: boosterAdmissionScreenshotPath,
      } : {}),
      ...(pmgLabScreenshotPath === undefined ? {} : {
        DFTRACE_PMG_LAB_SCREENSHOT: pmgLabScreenshotPath,
      }),
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
	  ...(raiderScreenshotPrefix === undefined ? {} : {
	    DFTRACE_ENGINE_SCREENSHOT_PREFIX: raiderScreenshotPrefix,
	    DFTRACE_ENGINE_SCREENSHOT_LIMIT: String(session.frames),
	  }),
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
    // Stage 1 of the session-failure accumulation (owner decision 2026-09-19).
    // A failing behavioural clause records {session, message} and the loop
    // continues to the next replay, so the sessions that sat behind the first
    // failure are no longer dark. The precedent is the PAL timing audit below,
    // which reports per replay and sets process.exitCode instead of throwing.
    // parseCsv stays OUTSIDE the try: a malformed or short CSV leaves no rows
    // to carry forward and remains fatal. So does run() above. Owner decision
    // 2026-09-19: a session that produces no CSV at all is a HARD failure, not
    // an accumulated clause failure — the same boundary drawn here at parseCsv.
    // Corrupt or absent data stops the run; a failing clause does not. Stage 2
    // must not blur the two.
    // The body is deliberately left at its original indentation — reindenting
    // ~670 lines would bury the change in whitespace.
    try {
    // draw_enemy_member publishes a member's 16-row P1/P2 body only on frames
    // where its Y moved. The licence for that skip is "the plane already holds
    // the body at the member's current Y", so hold every traced frame to it:
    // the emulator rebuilds the expected plane from ENEMY_MEMBER_STATE,
    // ENEMY_Y, ENEMY_ARCHETYPE and the archetype body table and counts the
    // visible rows that differ. Any nonzero count is a stale or torn sprite.
    const staleBodyRows = rows.filter((row) =>
      (row.enemy_pmg_mismatch1 ?? 0) !== 0 || (row.enemy_pmg_mismatch2 ?? 0) !== 0);
    invariant(staleBodyRows.length === 0, [
      `${session.id} published a stale or torn enemy PMG body on ` +
        `${staleBodyRows.length} frame(s)`,
      ...staleBodyRows.slice(0, 8).flatMap((row) => [0, 1]
        .filter((slot) => (row[`enemy_pmg_mismatch${slot + 1}`] ?? 0) !== 0)
        .map((slot) => `  frame ${row.frame} P${slot + 1}: ` +
          `${row[`enemy_pmg_mismatch${slot + 1}`]} visible row(s) differ, ` +
          `member_state=${row[`enemy_member${slot}_state`]} ` +
          `y=${row[`enemy_y${slot}`]} ` +
          `first_row=${row[`enemy_pmg_mismatch_row${slot + 1}`]} ` +
          `last_writer=$${(row[`enemy_pmg_mismatch_writer${slot + 1}`] ?? 0)
            .toString(16).padStart(4, "0")}`)),
    ].join("\n"));
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
      // Writer 4: a live, rendered fighter projectile standing on the tracked
      // muzzle's own cell. muzzle{N}_projectile is emitted by
      // dftrace_projectile_occludes and is 1 only while some projectile slot's
      // OWN screen pointer still equals that muzzle pointer AND the cell still
      // holds that slot's glyph family — presence, never history. It cannot
      // forgive a muzzle or launch-flash code, whose values are disjoint from
      // both projectile glyph families.
      const projectileOccludesMuzzle = (row, muzzleSlot) =>
        row[`muzzle${muzzleSlot}_projectile`] === 1;
      const occludedRows = rows.filter((row) => [0, 1].some((slot) =>
        row[`muzzle${slot}_pointer`] !== 0 &&
        !transientCodes.has(row[`muzzle${slot}_cell`]) &&
        broadsideOccludesMuzzle(row, slot)));
      const projectileOccludedRows = rows.filter((row) => [0, 1].some((slot) =>
        row[`muzzle${slot}_pointer`] !== 0 &&
        !transientCodes.has(row[`muzzle${slot}_cell`]) &&
        projectileOccludesMuzzle(row, slot)));
      invariant(activeRows.length > 0 && [0, 1].every((slot) =>
        activeRows.some((row) => row[`muzzle${slot}_domain`] === 0) &&
        activeRows.some((row) => row[`muzzle${slot}_domain`] === 1)),
      `${session.id} did not cover fixed-divider and ring domains for both hulls`);
      invariant(rows.every((row) => {
        const legalMuzzleCodes = [0, 1].filter((slot) =>
          row[`muzzle${slot}_pointer`] !== 0 &&
          transientCodes.has(row[`muzzle${slot}_cell`])).length;
        // Every active muzzle must be accounted for: it either shows its own
        // transient glyph, or writer 2 (a broadside hull) or writer 4 (a live
        // rendered projectile) is standing on that exact cell this frame. The
        // three are per-slot alternatives, not a sum: a slot explained twice is
        // still one slot, and a slot explained by nothing at all still fails.
        // An active muzzle whose cell is empty, with no broadside and no
        // projectile on it, remains an error — including the frame after a
        // projectile leaves without erase_fighter_projectile_restore returning
        // the covered cell.
        const explainedMuzzles = [0, 1].filter((slot) =>
          row[`muzzle${slot}_pointer`] !== 0 &&
          (transientCodes.has(row[`muzzle${slot}_cell`]) ||
            broadsideOccludesMuzzle(row, slot) ||
            projectileOccludesMuzzle(row, slot))).length;
        // Writer 3 of the ownership model above: a live launch flash owns its own
        // cell. Expired flashes, unowned addresses and stray muzzle codes still fail.
        return unownedHullTransientCells(row) === 0 && row.muzzle_pointer_errors === 0 &&
          row.broad_pointer_errors === 0 &&
          row.muzzle_code_cells === legalMuzzleCodes + legalLaunchFlashCells(row) &&
          explainedMuzzles === row.active_muzzles;
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
        legal_projectile_muzzle_occlusion_frames: projectileOccludedRows.length,
        maximum_muzzle_codes: Math.max(...rows.map((row) => row.muzzle_code_cells)),
        // Unowned by any of the three writers; a live launch flash is not an orphan.
        maximum_illegal_codes: Math.max(...rows.map(unownedHullTransientCells)),
        live_launch_flash_cells: rows.filter((row) => legalLaunchFlashCells(row) === 1).length,
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
      invariant(rows.every((row) => unownedHullTransientCells(row) === 0 &&
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
          generated: [10, 15, 20][session.difficulty],
          accepted: [10, 15, 20][session.difficulty],
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
      // PRIOR is $00 or $10 here, and both are correct. The pickup is drawn as
      // the GTIA fifth player, so its PMG setup programs PRIOR = $10
      // (src/main.s:10486) and release_fighter_pickup_pmg_hardware restores $00
      // (src/main.s:9820-9823). On the boundary frames the sampled value is the
      // other one: the first pickup_state 2 frame is still $00 because the
      // sample precedes that frame's PMG setup, and the release frame still
      // reads $10. No trace column separates those cases -- pickup_pmg_rows is
      // 16 on the $00 boundary row as well -- so the gate accepts both values.
      //
      // pickup_draw_calls no longer counts draws. Commit 04ae0a6 repointed
      // DFTRACE_PC_ENTITY_DRAW from render_weapon_pickup_overlay to
      // update_fighter_pickup_pmg (:485), which is the movement/collection/
      // booster policy wrapper (src/main.s:10415) and writes no pixels; the
      // real renderer is render_fighter_pickup_pmg and is not traced. The
      // wrapper is entered once on every gameplay frame, so `=== 1` held on
      // all 500 post-collection frames of this trace with no capsule on
      // screen: it asserted nothing. No column counts renderer entries, so
      // "exactly one draw" is not assertable here. The clause is repointed to
      // pickup_pmg_rows, which measures the published result directly -- the
      // capsule's 16 missile rows must be on the plane for every contact
      // frame (post-collection frames of the same trace read 0/2/4/6).
      // pickup_erase_calls is unaffected: DFTRACE_PC_ENTITY_ERASE is
      // clear_fighter_pickup_pmg, which does zero the missile rows.
      invariant(contactRows.every((row) => (row.prior === 0x00 || row.prior === 0x10) &&
        row.pickup_erase_calls === 1 && row.pickup_pmg_rows === 16 &&
        row.pickup_erase_scanline > row.pickup_prev_y &&
        row.pickup_draw_scanline !== 0),
      `${session.id} changed GTIA priority, the single erase, or the published `
      + `16-row missile capsule at player contact`);
      const collectionRows = rows.filter((row) => (row.events & (1 << 19)) !== 0);
      // The fourth sub-clause was `pickup_draw_calls === 0`, and it has been
      // unsatisfiable by construction since 04ae0a6 (see the contact clause
      // above). While DFTRACE_PC_ENTITY_DRAW was bound to
      // render_weapon_pickup_overlay -- a character-overlay renderer reachable
      // only when ENTITY_ACTIVE_MASK != 0 -- the three sub-clauses formed one
      // coherent statement: collection cleared the mask, so the capsule glyph
      // was not redrawn on the collection frame. After the rebinding the
      // counter names the policy wrapper, through which the collection itself
      // passes, so it reads 1 on the collection frame and can never read 0.
      // pickup_pmg_rows restores the original intent against the plane the
      // capsule is actually drawn on: it goes 16 -> 0 on the collection frame
      // and stays 0.
      invariant(collectionRows.length === 1 && collectionRows[0].pickup_booster_state === 3 &&
        collectionRows[0].entity_active_mask === 0 && collectionRows[0].pickup_pmg_rows === 0,
      `${session.id} did not collect and activate exactly once, or left the `
      + `capsule on the missile plane after collection`);
      const images = paths.map((framePath) =>
        decodeAtari800Screenshot(fs.readFileSync(framePath)));
      // This clause measures the capsule in the framebuffer, which is why it
      // stays a raster check and is not repointed at pickup_pmg_rows: the
      // memory counters and the beam can diverge (see
      // docs/diagnostics/stage-2b2d-pickup-raster-invisibility.json, where
      // 16/16 missile rows were set at frame end, 0/16 at the beam crossing,
      // and the framebuffer was pure background). It is the only gate that
      // would catch that case.
      //
      // Window and colour are DERIVED from the same contact rows the clauses
      // above measure, not pinned as literals. Both halves of the old pin --
      // `rgb(13,58,115)` inside `x 140-164` -- went stale at f6eee5c, which
      // retired the character compositor: the capsule moved from character
      // cells to the missile plane, so its colour became COLPF3 ($46 here, not
      // $84 steel) and its column moved with it. The pin therefore counted
      // zero on every captured frame and failed the `>= 40` head clause on
      // frame 00, not only at the tail. The intent -- capsule present through
      // contact, gone three frames after collection -- and the >= 40 / < 40
      // thresholds are unchanged.
      //
      // Horizontal mapping. The capsule is one missile at HPOSM0 with
      // SIZEM = $00 (src/main.s:10484), so it spans 16 pixels at this capture
      // scale. NOTE, discrepancy:
      // docs/diagnostics/stage-2b2e-pickup-capsule-silhouettes.json records
      // the mapping as `2*HPOSM0 - 64 + 2*cc`, which assumes a wider crop
      // origin than these captures have. This build's own Atari800
      // screenshots are 256x192 and measure `2*(HPOSM0 - 64) + 2*cc`, 64
      // pixels further left; the captures are the authority and the doc
      // carries the annotation.
      //
      // Vertical extent is the full image. The old `y 8-216` was scanline
      // space (8 = activeImageTop, 216 = gameplayBottom 240 - entityTop 24)
      // while the capture crop starts at scanline 24, so it had always
      // clipped -- harmlessly, but it described nothing real.
      const capsuleHpos = contactRows[0].pickup_hposm0;
      const capsuleColour = contactRows[0].colpf3;
      invariant(contactRows.every((row) => row.pickup_hposm0 === capsuleHpos &&
        row.colpf3 === capsuleColour),
      `${session.id} moved the capsule column or changed COLPF3 during contact, `
      + `so one derived raster window cannot describe the contact frames`);
      const capsuleLeft = 2 * (capsuleHpos - 64);
      const capsuleRight = capsuleLeft + 16;
      invariant(images.every((image) => capsuleLeft >= 0 && capsuleRight <= image.width),
        `${session.id} derived capsule window x ${capsuleLeft}-${capsuleRight} falls `
        + `outside the captured raster`);
      // The colour is resolved through each screenshot's own PLTE, so the
      // count follows COLPF3 to whatever RGB Atari800's palette gives it.
      const steelCounts = images.map((image) => countRgb(image, [
        image.palette[capsuleColour * 3],
        image.palette[capsuleColour * 3 + 1],
        image.palette[capsuleColour * 3 + 2],
      ], { left: capsuleLeft, top: 0, right: capsuleRight, bottom: image.height }));
      invariant(steelCounts.slice(0, -3).every((count) => count >= 40) &&
        steelCounts.slice(-3).every((count) => count < 40),
      `${session.id} final raster contains a cut capsule or stale post-collection `
      + `footprint (COLPF3 $${capsuleColour.toString(16)} in x ${capsuleLeft}-`
      + `${capsuleRight}: ${steelCounts.join(", ")})`);
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
    } catch (error) {
      sessionFailures.push({ session: session.id, message: error.message });
      console.error(`CLAUSE FAILURE ${session.id}: ${error.message}`);
      process.exitCode = 1;
    }
    // Outside the catch on purpose. A failed session still contributes its rows
    // and its summary, so the post-loop aggregates keep measuring this replay's
    // coverage and cannot fail for absence instead of for a real defect.
    allRows.push(...rows);
    summaries.push(sessionSummary(session, rows));
    console.log(`${session.id}: ${rows.length} frames, max ` +
      `${maximumRow(rows, (row) => row.wall_cycles).wall_cycles} wall cycles`);
    // Reported per replay, before any later gate invariant can abort the run.
    const palTimingAudit = auditPalTiming(session.id, rows);
    palTimingAudits.push(palTimingAudit);
    reportPalTimingAudit(palTimingAudit);
    if (!palTimingAudit.passed) process.exitCode = 1;
  }
  {
    const missEvents = reportPalTimingAudits(palTimingAudits, { perAudit: false });
    fs.writeFileSync(path.join(buildDirectory, "pal-timing-audit.json"),
      `${JSON.stringify({ distinct_miss_events: missEvents, audits: palTimingAudits },
        null, 2)}\n`);
    // A distinct miss event is a real dropped PAL frame, so it fails the gate
    // whatever else the run was measuring.
    if (missEvents !== 0) process.exitCode = 1;
  }
  if (sessionFailures.length === 0) {
    console.log(`Behavioural clauses: ${sessionsToRun.length} session(s) ran to completion`);
  } else {
    console.error(`Behavioural clauses: ${sessionFailures.length} of ` +
      `${sessionsToRun.length} session(s) accumulated a failure`);
    for (const failure of sessionFailures)
      console.error(`  ${failure.session}: ${failure.message.split("\n")[0]}`);
  }
  if (raiderFirstWriterOnly) {
    console.log(`Raider first-writer raw traces: ${sessionsToRun.length} sessions, ` +
      `${allRows.length} frames`);
    return;
  }
  if (playerPairShotSpeedOnly) {
    console.log(`Player PairShot speed raw traces: ${sessionsToRun.length} sessions, ` +
      `${allRows.length} frames`);
    return;
  }
  if (playerPairShotReentryOnly) {
    console.log(`Player PairShot re-entry raw traces: ${sessionsToRun.length} sessions, ` +
      `${allRows.length} frames`);
    return;
  }
  if (boosterAdmissionOnly) {
    console.log(`Booster admission raw traces: ${sessionsToRun.length} sessions, ` +
      `${allRows.length} frames`);
    return;
  }
  if (debrisGateOnly) {
    const sessions = sessionsToRun.map((session) => {
      const gatePath = path.join(buildDirectory, `${session.id}-debris-gate.csv`);
      const rowPath = path.join(buildDirectory, `${session.id}-debris-row.json`);
      const rows = allRows.filter((row) => row.session === session.id);
      const analysis = analyseDebrisGate(gatePath);
      return {
        session: session.id,
        difficulty: session.difficulty,
        policy: session.policy,
        fire_delay: session.fireDelay,
        gameplay_frames: rows.length,
        maximum_wall_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        missed_frames: rows.reduce((sum, row) => sum + row.missed_frames, 0),
        extra_vbi_boundaries: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
        dli_sequence_violations: Math.max(...rows.map((row) => row.dli_sequence_violations)),
        host_frames: analysis.host_frames,
        first_capital: analysis.first_capital,
        return_to_fighter: analysis.return_to_fighter,
        publication_inside_playfield: analysis.publication_inside_playfield,
        summary: analysis.summary,
        bottom_row_probe: fs.existsSync(rowPath) ? JSON.parse(fs.readFileSync(rowPath, "utf8")) : null,
        lives: analysis.lives,
        raw_gate_csv: path.relative(rootDirectory, gatePath),
      };
    });
    const report = {
      generated: new Date().toISOString(),
      artifact: path.relative(rootDirectory, xexPath),
      artifact_sha256: crypto.createHash("sha256").update(fs.readFileSync(xexPath)).digest("hex"),
      method: "per completed host frame, Screen_atari compared with the two debris glyphs at 2*HPOS-64, expected top scanline 24+8*((Y-24)>>3), against the record sampled at the previous boundary",
      criteria: "per life entering the playfield: first visible Y 24, 0 blank frames in view, 0 disappear/reappear transitions, ring cells hold the codes whenever RENDERED; bottom row (Y>=232) reported separately",
      sessions,
      passed: sessions.every(({ summary }) => summary.passed),
    };
    const reportPath = path.join(buildDirectory, "debris-visibility-gate-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    for (const entry of sessions) {
      const phases = entry.summary.by_phase;
      console.log(`${entry.session}: ${entry.host_frames} host frames, max ${entry.maximum_wall_cycles} wall cycles, ` +
        `missed ${entry.missed_frames}; capital ${phases.capital.lives_in_view} lives ` +
        `(${phases.capital.blank} blank / ${phases.capital.frames_in_view} in view, ` +
        `${phases.capital.disappearances} disappearances, first Y ${phases.capital.first_visible_y_values.join("/")}); ` +
        `post-capital ${phases["post-capital-fighter"].lives_in_view} lives ` +
        `(${phases["post-capital-fighter"].blank} blank / ${phases["post-capital-fighter"].frames_in_view} in view, ` +
        `${phases["post-capital-fighter"].disappearances} disappearances, first Y ` +
        `${phases["post-capital-fighter"].first_visible_y_values.join("/")}); ` +
        `bottom row ${phases.capital.bottom_row_frames + phases["post-capital-fighter"].bottom_row_frames} frames, ` +
        `${phases.capital.bottom_row_blank + phases["post-capital-fighter"].bottom_row_blank} blank ` +
        `(${phases.capital.bottom_row_blank_ring_step + phases["post-capital-fighter"].bottom_row_blank_ring_step} on ring-step frames); ` +
        `${entry.summary.passed ? "PASS" : "FAIL"}`);
    }
    console.log(`Debris visibility gate report: ${path.relative(rootDirectory, reportPath)} ` +
      `(${report.passed ? "PASS" : "FAIL"})`);
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (debrisSlot0BaselineOnly) {
    const rows = allRows;
    const profileComplete = (row) => {
      const clocks = [row.start_clock,
        ...traceProfileLabels.map((unused, index) => row[`profile_clock${index}`]),
        row.end_clock];
      return clocks.every((clock, index) => Number.isInteger(clock) &&
        (index === 0 || clock >= clocks[index - 1])) &&
        row.profile_publication_begin >= row.profile_clock19 && row.profile_clock19 > 0;
    };
    const dliOverlap = (row, start, end) => Array.from({ length: 2 }, (unused, index) => ({
      start: row[`profile_dli${index}_start`], end: row[`profile_dli${index}_end`],
    })).reduce((sum, dli) => sum + Math.max(0,
      Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
    const activeWorkCycles = (row) => row.wall_cycles -
      (row.profile_publication_begin - row.profile_clock19) +
      dliOverlap(row, row.profile_clock19, row.profile_publication_begin) + 32;
    const completed = rows.filter(profileComplete);
    const event = (row, bit) => (row.events & (1 << bit)) !== 0;
    const maximum = (selected, metric) => selected.length === 0 ? null :
      Math.max(...selected.map(metric));
    const scenario = (selected) => ({
      sample_count: selected.length,
      maximum_full_frame_cycles: maximum(selected, (row) => row.wall_cycles),
      maximum_active_work_cycles: maximum(selected.filter(profileComplete), activeWorkCycles),
    });
    const debrisActive = rows.filter((row) => (row.entity_active_mask & 1) !== 0);
    const spawnRows = rows.filter((row) => event(row, 7));
    const hiddenSpawnRows = spawnRows.filter((row) => row.entity_y + 8 <= 24);
    const visibleSpawnRows = spawnRows.filter((row) => row.entity_y + 8 > 24);
    const contactRows = rows.filter((row) => event(row, 8));
    const despawnRows = rows.filter((row) => event(row, 9));
    const shotRows = rows.filter((row) => event(row, 12));
    const destructionRows = rows.filter((row) => event(row, 13));
    const worldEventRows = debrisActive.filter((row) => event(row, 0));
    const pairshotMissRows = debrisActive.filter((row) =>
      row.player_fighter_projectiles > 0 && !event(row, 12));
    let horizontalSteps = 0;
    let verticalCarries = 0;
    let respawnsAfterRelease = 0;
    let sectorTransitions = 0;
    const seenRelease = new Set();
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const current = rows[index];
      if (previous.session !== current.session) continue;
      if (previous.sector_state !== current.sector_state) sectorTransitions += 1;
      if (event(previous, 9)) seenRelease.add(previous.session);
      if (event(current, 7) && seenRelease.has(current.session)) respawnsAfterRelease += 1;
      if ((previous.entity_active_mask & 1) !== 0 && (current.entity_active_mask & 1) !== 0) {
        if (previous.entity_x !== current.entity_x) horizontalSteps += 1;
        if (previous.entity_y !== current.entity_y) verticalCarries += 1;
      }
    }
    const byDifficulty = debrisSlot0BaselineSessions.map((session) => {
      const selected = rows.filter((row) => row.difficulty === session.difficulty);
      return {
        difficulty: session.difficulty,
        completed_frames: selected.length,
        spawns: selected.filter((row) => event(row, 7)).length,
        active_debris_frames: selected.filter((row) =>
          (row.entity_active_mask & 1) !== 0).length,
        active_world_events: selected.filter((row) =>
          (row.entity_active_mask & 1) !== 0 && event(row, 0)).length,
        pairshot_hits: selected.filter((row) => event(row, 12)).length,
        destructions: selected.filter((row) => event(row, 13)).length,
        player_collisions: selected.filter((row) => event(row, 8)).length,
        despawns: selected.filter((row) => event(row, 9)).length,
      };
    });
    const missedFrames = rows.reduce((sum, row) => sum + row.missed_frames, 0);
    const extraVbi = rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0);
    const dliAnomalies = rows.reduce((sum, row) => sum + row.dli_sequence_violations, 0);
    const activeValues = completed.map(activeWorkCycles).sort((left, right) => left - right);
    const percentile = (fraction) => activeValues[Math.ceil(activeValues.length * fraction) - 1];
    invariant(rows.length === 15_000 && byDifficulty.every(({ completed_frames }) =>
      completed_frames === 5_000), "Slot-zero debris baseline did not complete all PAL frames");
    invariant(byDifficulty.every(({ spawns, active_debris_frames, active_world_events }) =>
      spawns > 0 && active_debris_frames > 0 && active_world_events > 0),
    "Slot-zero debris baseline did not exercise every difficulty");
    invariant(contactRows.length > 0 && shotRows.length > 0 && destructionRows.length > 0 &&
      despawnRows.length > 0, "Slot-zero debris baseline missed a required lifecycle path");
    invariant(spawnRows.length > 0 && hiddenSpawnRows.length === spawnRows.length &&
      visibleSpawnRows.length === 0,
    "Slot-zero debris baseline admitted visible debris");
    invariant(missedFrames === 0 && extraVbi === 0 && dliAnomalies === 0,
      "Slot-zero debris baseline observed a PAL timing/raster anomaly");
    invariant(completed.every((row) => activeWorkCycles(row) <= 32_568),
      "Slot-zero debris baseline exceeded the hard active-work gate");
    const report = {
      status: "PASS",
      emulator: "Atari800 7.1.2 PAL/XL",
      production_artifacts: runtimeArtifacts,
      sessions: summaries,
      coverage: {
        completed_frames: rows.length,
        by_difficulty: byDifficulty,
        spawns: spawnRows.length,
        active_debris_frames: debrisActive.length,
        active_world_events: worldEventRows.length,
        horizontal_steps: horizontalSteps,
        vertical_carries: verticalCarries,
        pairshot_miss_frames: pairshotMissRows.length,
        pairshot_hits: shotRows.length,
        nonlethal_pairshot_hits: shotRows.length - destructionRows.length,
        destructions: destructionRows.length,
        player_collisions: contactRows.length,
        despawns: despawnRows.length,
        bottom_despawns: despawnRows.filter((row) =>
          !event(row, 8) && !event(row, 12)).length,
        respawns_after_release: respawnsAfterRelease,
        sector_state_transitions: sectorTransitions,
        sector_states_observed: [...new Set(rows.map((row) => row.sector_state))].sort(),
      },
      spawn_contract: {
        visible_top_y: 24,
        height_scanlines: 8,
        spawn_y_values: [...new Set(spawnRows.map((row) => row.entity_y))].sort(),
        fully_hidden_at_activation: hiddenSpawnRows.length,
        visible_at_activation_defects: visibleSpawnRows.length,
        respawns_after_release: respawnsAfterRelease,
      },
      cpu: {
        overall: scenario(rows),
        fighter_open: scenario(rows.filter((row) => row.sector_state === 7)),
        debris_active: scenario(debrisActive),
        debris_ordinary: scenario(debrisActive.filter((row) => !event(row, 0))),
        debris_world_event: scenario(worldEventRows),
        debris_spawn: scenario(spawnRows),
        debris_pairshot_hit: scenario(shotRows),
        debris_pairshot_miss: scenario(pairshotMissRows),
        debris_destruction: scenario(destructionRows),
        debris_player_collision: scenario(contactRows),
        debris_despawn: scenario(despawnRows),
        average_active_work_cycles: activeValues.reduce((sum, value) => sum + value, 0) /
          activeValues.length,
        p95_active_work_cycles: percentile(0.95),
        p99_active_work_cycles: percentile(0.99),
      },
      timing_raster: {
        missed_frames: missedFrames,
        extra_vbi_boundaries: extraVbi,
        dli_sequence_anomalies: dliAnomalies,
        target_overruns: completed.filter((row) => activeWorkCycles(row) > 31_200).length,
        hard_gate_overruns: completed.filter((row) => activeWorkCycles(row) > 32_568).length,
        player_projectile_stale_maximum:
          maximum(rows, (row) => row.player_projectile_stale_cells),
        player_projectile_orphan_maximum:
          maximum(rows, (row) => row.player_projectile_orphan_cells),
      },
      passed: true,
    };
    const reportPath = path.join(buildDirectory, "debris-slot0-native-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Debris slot-zero native report: ${path.relative(rootDirectory, reportPath)}`);
    return;
  }
  if (pairShotStaleOnly) {
    const rows = allRows;
    const fighterRows = rows.filter((row) => row.sector_state === 7 &&
      row.player_lifecycle === 0 && row.player_fighter_explosion_timer === 0);
    const profileComplete = (row) => {
      const clocks = [row.start_clock,
        ...traceProfileLabels.map((unused, index) => row[`profile_clock${index}`]),
        row.end_clock];
      return clocks.every((clock, index) => Number.isInteger(clock) &&
        (index === 0 || clock >= clocks[index - 1]));
    };
    const dliOverlap = (row, start, end) => Array.from({ length: 2 }, (unused, index) => ({
      start: row[`profile_dli${index}_start`], end: row[`profile_dli${index}_end`],
    })).reduce((sum, dli) => sum + Math.max(0,
      Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
    const activeWorkCycles = (row) => {
      const waitStart = row.profile_clock19;
      const waitEnd = row.profile_publication_begin;
      invariant(waitEnd >= waitStart && waitStart > 0,
        `PairShot stale publication interval missing at ${row.session}:${row.frame}`);
      return row.wall_cycles - (waitEnd - waitStart) +
        dliOverlap(row, waitStart, waitEnd) + 32;
    };
    const completeRows = fighterRows.filter(profileComplete);
    invariant(completeRows.length > 0, "PairShot stale native mode has no profiled OPEN frames");
    const heaviest = maximumRow(completeRows, activeWorkCycles);
    let leftFrames = 0;
    let rightFrames = 0;
    let directionChanges = 0;
    let previousDelta = 0;
    for (let index = 1; index < rows.length; index += 1) {
      if (rows[index].session !== rows[index - 1].session) {
        previousDelta = 0;
        continue;
      }
      const delta = rows[index].player_x - rows[index - 1].player_x;
      if (delta < 0) leftFrames += 1;
      if (delta > 0) rightFrames += 1;
      if (delta !== 0 && previousDelta !== 0 && Math.sign(delta) !== Math.sign(previousDelta))
        directionChanges += 1;
      if (delta !== 0) previousDelta = delta;
    }
    const anomalies = {
      recycled_checks: rows.reduce((sum, row) =>
        sum + row.player_projectile_recycled_checks, 0),
      stale_cells: rows.reduce((sum, row) => sum + row.player_projectile_stale_cells, 0),
      maximum_stale_cells: Math.max(...rows.map((row) => row.player_projectile_stale_cells)),
      orphan_cells: rows.reduce((sum, row) => sum + row.player_projectile_orphan_cells, 0),
      maximum_orphan_cells: Math.max(...rows.map((row) => row.player_projectile_orphan_cells)),
      missed: rows.reduce((sum, row) => sum + row.missed_frames, 0),
      target_overruns: completeRows.filter((row) => activeWorkCycles(row) > 31_200).length,
      hard_overruns: completeRows.filter((row) => activeWorkCycles(row) > 32_568).length,
      extra_vbi: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      dli: rows.reduce((sum, row) => sum + row.dli_sequence_violations, 0),
    };
    const report = {
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --pairshot-stale-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      sessions: sessionsToRun.map(({ id, policy, frames }) => ({ id, policy, frames })),
      frames: rows.length,
      fighter_open_frames: fighterRows.length,
      movement: { left_frames: leftFrames, right_frames: rightFrames, direction_changes: directionChanges },
      stale_cells: { recycled_checks: anomalies.recycled_checks, sum: anomalies.stale_cells,
        maximum_per_frame: anomalies.maximum_stale_cells,
        orphan_sum: anomalies.orphan_cells,
        maximum_orphans_per_frame: anomalies.maximum_orphan_cells },
      timing: {
        maximum_active_work_cycles: activeWorkCycles(heaviest),
        maximum_raw_cadence_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        target_headroom_cycles: 31_200 - activeWorkCycles(heaviest),
        hard_gate_headroom_cycles: 32_568 - activeWorkCycles(heaviest),
        ...anomalies,
      },
      csv: sessionsToRun.map(({ id }) => path.relative(rootDirectory,
        path.join(buildDirectory, `${id}.csv`))),
      passed: anomalies.recycled_checks > 0 && anomalies.stale_cells === 0 &&
        anomalies.orphan_cells === 0 &&
        activeWorkCycles(heaviest) <= 32_568 &&
        anomalies.hard_overruns === 0 && anomalies.extra_vbi === 0 &&
        anomalies.dli === 0 && leftFrames > 0 && rightFrames > 0 && directionChanges > 0,
    };
    const reportPath = path.join(buildDirectory, "pairshot-stale-native-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`PairShot stale native report: ${path.relative(rootDirectory, reportPath)}`);
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (raiderRemnantOnly) {
    const rows = allRows;
    const fighterRows = rows.filter((row) => row.sector_state === 7 &&
      row.player_lifecycle === 0 && row.player_fighter_explosion_timer === 0);
    const profileComplete = (row) => {
      const clocks = [row.start_clock,
        ...traceProfileLabels.map((unused, index) => row[`profile_clock${index}`]),
        row.end_clock];
      return clocks.every((clock, index) => Number.isInteger(clock) &&
        (index === 0 || clock >= clocks[index - 1]));
    };
    const dliOverlap = (row, start, end) => Array.from({ length: 2 }, (unused, index) => ({
      start: row[`profile_dli${index}_start`], end: row[`profile_dli${index}_end`],
    })).reduce((sum, dli) => sum + Math.max(0,
      Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
    const activeWorkCycles = (row) => {
      const waitStart = row.profile_clock19;
      const waitEnd = row.profile_publication_begin;
      invariant(waitEnd >= waitStart && waitStart > 0,
        `Raider remnant publication interval missing at ${row.session}:${row.frame}`);
      return row.wall_cycles - (waitEnd - waitStart) +
        dliOverlap(row, waitStart, waitEnd) + 32;
    };
    const completeRows = fighterRows.filter(profileComplete);
    invariant(completeRows.length > 0,
      "Raider remnant native mode has no profiled OPEN frames");
    const heaviest = maximumRow(completeRows, activeWorkCycles);
    const killRows = rows.filter((row) =>
      row.interceptor_breakup_request_slot0 + row.interceptor_breakup_request_slot1 > 0);
    const requestedKills = [0, 1].map((slot) => rows.reduce((sum, row) =>
      sum + row[`interceptor_breakup_request_slot${slot}`], 0));
    const kills = requestedKills[0] + requestedKills[1];
    const mainExplosionsGenerated = killRows.filter((row) =>
      row.enemy_explosion_timer === 24 && row.colbk === 0x1e).length;
    const raiderCharacterWrites = rows.reduce((sum, row) =>
      sum + row.raider_character_writes, 0);
    const raiderTransientAllocations = rows.reduce((sum, row) =>
      sum + row.raider_transient_allocations, 0);
    const raiderSlot0Activations = rows.reduce((sum, row) =>
      sum + row.raider_slot0_activations, 0);
    const emitterOwnership = {
      kills_with_emitter_projectile_active: rows.reduce((sum, row) =>
        sum + row.raider_kills_with_emitter_projectile_active, 0),
      emitter_owned_projectiles_at_kill: rows.reduce((sum, row) =>
        sum + row.emitter_owned_projectiles_at_kill, 0),
      emitter_owned_projectiles_removed: rows.reduce((sum, row) =>
        sum + row.emitter_owned_projectiles_removed, 0),
      foreign_projectiles_preserved: rows.reduce((sum, row) =>
        sum + row.foreign_projectiles_preserved, 0),
      foreign_projectiles_incorrectly_removed: rows.reduce((sum, row) =>
        sum + row.foreign_projectiles_incorrectly_removed, 0),
      post_kill_emitter_projectile_continuations: rows.reduce((sum, row) =>
        sum + row.post_kill_emitter_projectile_continuations, 0),
      emitter_owned_physical_slot0_at_kill: rows.reduce((sum, row) =>
        sum + row.emitter_owned_physical_slot0_at_kill, 0),
    };
    const debrisSpawns = rows.filter((row) => (row.events & (1 << 7)) !== 0).length;
    const genericEffectSpawnRows = rows.filter((row) => (row.events & (1 << 13)) !== 0);
    const validGenericEffectSpawns = genericEffectSpawnRows.filter((row) =>
      row.effect_active_mask === 0x1f && row.effect_active_count === 5).length;
    let debrisLifecycle = null;
    let debrisSession = null;
    let debrisFirstVisible = 0;
    let debrisFirstVisibleInvalid = 0;
    for (const row of rows) {
      if (row.session !== debrisSession) {
        debrisSession = row.session;
        debrisLifecycle = null;
      }
      if ((row.events & (1 << 7)) !== 0) {
        debrisLifecycle = { sawOffscreen: row.entity_y < 24, visible: false };
        if (row.entity_y >= 24) debrisFirstVisibleInvalid += 1;
      }
      if (debrisLifecycle !== null && (row.entity_active_mask & 1) !== 0) {
        if (row.entity_y < 24) debrisLifecycle.sawOffscreen = true;
        if (!debrisLifecycle.visible && row.entity_y >= 24) {
          debrisFirstVisible += 1;
          if (!debrisLifecycle.sawOffscreen || row.entity_y !== 24)
            debrisFirstVisibleInvalid += 1;
          debrisLifecycle.visible = true;
        }
      } else if ((row.entity_active_mask & 1) === 0) {
        debrisLifecycle = null;
      }
    }
    // The prior 45898e8 candidate produced 24 frames of orphan $75 restored
    // by PairShot erase plus 29 broad PairShot-range matches. The former is
    // this task's positively attributed gameplay-debris remnant and must now
    // be zero; retain both old counts as an explicit before/after signature.
    const priorCandidate = { effect_orphan_sum: 24, pairshot_orphan_sum: 29 };
    const raiderEffectCodes = new Set([110, 111, 112, 113, 118, 119, 218, 219]);
    const anomalies = {
      effect_orphan_sum: rows.reduce((sum, row) =>
        sum + row.transient_effect_orphan_cells, 0),
      maximum_effect_orphans: Math.max(...rows.map((row) =>
        row.transient_effect_orphan_cells)),
      pairshot_orphan_sum: rows.reduce((sum, row) =>
        sum + row.player_projectile_orphan_cells, 0),
      maximum_pairshot_orphans: Math.max(...rows.map((row) =>
        row.player_projectile_orphan_cells)),
      transient_effect_coordinate_wraps: rows.reduce((sum, row) =>
        sum + row.transient_effect_coordinate_wraps, 0),
      stale_debris_projectile_restores: rows.reduce((sum, row) =>
        sum + row.stale_debris_projectile_restores, 0),
      enemy_projectile_stale_cells: rows.reduce((sum, row) =>
        sum + row.enemy_projectile_stale_cells, 0),
      maximum_enemy_projectile_stale_cells: Math.max(...rows.map((row) =>
        row.enemy_projectile_stale_cells)),
      raider_breakup_orphan_sum: rows.reduce((sum, row) => sum +
        (raiderEffectCodes.has(row.transient_effect_first_code)
          ? row.transient_effect_orphan_cells : 0), 0),
      missed: rows.reduce((sum, row) => sum + row.missed_frames, 0),
      target_overruns: completeRows.filter((row) => activeWorkCycles(row) > 31_200).length,
      hard_overruns: completeRows.filter((row) => activeWorkCycles(row) > 32_568).length,
      extra_vbi: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      dli: rows.reduce((sum, row) => sum + row.dli_sequence_violations, 0),
    };
    const report = {
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --raider-remnant-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      sessions: sessionsToRun.map(({ id, policy, frames }) => ({ id, policy, frames })),
      frames: rows.length,
      fighter_open_frames: fighterRows.length,
      raider_breakup_events: kills,
      raider_kill_requests: {
        slot_0: requestedKills[0],
        slot_1: requestedKills[1],
        total: requestedKills[0] + requestedKills[1],
      },
      main_explosions_generated: mainExplosionsGenerated,
      raider_generated_character_writes: raiderCharacterWrites,
      raider_generated_transient_effect_allocations: raiderTransientAllocations,
      raider_slot0_effect_activations: raiderSlot0Activations,
      emitter_projectile_cleanup: emitterOwnership,
      post_kill_owner_symptom_objects:
        emitterOwnership.post_kill_emitter_projectile_continuations,
      enemy_projectile_stale_cells: {
        sum: anomalies.enemy_projectile_stale_cells,
        maximum_per_frame: anomalies.maximum_enemy_projectile_stale_cells,
      },
      breakup_fragments_generated: 0,
      wrong_origin_fragments: anomalies.transient_effect_coordinate_wraps,
      gameplay_debris_spawns: debrisSpawns,
      generic_debris_destruction_effect_spawns: genericEffectSpawnRows.length,
      valid_generic_debris_destruction_effect_spawns: validGenericEffectSpawns,
      gameplay_debris_first_visible_publications: debrisFirstVisible,
      gameplay_debris_invalid_first_visible_publications: debrisFirstVisibleInvalid,
      breakup_cores: 0,
      suspicious_first_visible_publications:
        debrisFirstVisibleInvalid + anomalies.transient_effect_coordinate_wraps +
        anomalies.raider_breakup_orphan_sum,
      post_expiry_publications: anomalies.raider_breakup_orphan_sum,
      stale_backing_object_glyph_restores:
        anomalies.stale_debris_projectile_restores,
      owner_symptom_equivalent_events:
        anomalies.stale_debris_projectile_restores,
      previous_candidate_signature: {
        head: "45898e82d7d82e3d8334170cd9cfd1ce67bfc4c6",
        ...priorCandidate,
        effect_orphan_delta: anomalies.effect_orphan_sum - priorCandidate.effect_orphan_sum,
        pairshot_orphan_delta:
          anomalies.pairshot_orphan_sum - priorCandidate.pairshot_orphan_sum,
        classification: "The 24-frame $75 trail was a real stale gameplay-debris restore " +
          "by PairShot erase. The unchanged 29 count is a broad glyph-range detector " +
          "signature, not a live PairShot ownership failure.",
      },
      remnants: {
        sum: anomalies.effect_orphan_sum,
        maximum_per_frame: anomalies.maximum_effect_orphans,
      },
      pairshot_regression: {
        orphan_sum: anomalies.pairshot_orphan_sum,
        maximum_per_frame: anomalies.maximum_pairshot_orphans,
      },
      timing: {
        maximum_active_work_cycles: activeWorkCycles(heaviest),
        maximum_raw_cadence_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        target_headroom_cycles: 31_200 - activeWorkCycles(heaviest),
        hard_gate_headroom_cycles: 32_568 - activeWorkCycles(heaviest),
        ...anomalies,
      },
      csv: sessionsToRun.map(({ id }) => path.relative(rootDirectory,
        path.join(buildDirectory, `${id}.csv`))),
      passed: kills >= 100 && killRows.length === kills && mainExplosionsGenerated === kills &&
        raiderCharacterWrites === 0 && raiderTransientAllocations === 0 &&
        raiderSlot0Activations === 0 &&
        emitterOwnership.kills_with_emitter_projectile_active > 0 &&
        emitterOwnership.emitter_owned_projectiles_at_kill ===
          emitterOwnership.post_kill_emitter_projectile_continuations &&
        emitterOwnership.emitter_owned_projectiles_removed === 0 &&
        emitterOwnership.foreign_projectiles_preserved > 0 &&
        emitterOwnership.foreign_projectiles_incorrectly_removed === 0 &&
        anomalies.enemy_projectile_stale_cells === 0 &&
        genericEffectSpawnRows.length > 0 &&
        validGenericEffectSpawns === genericEffectSpawnRows.length &&
        requestedKills[0] > 0 && requestedKills[1] > 0 &&
        anomalies.transient_effect_coordinate_wraps === 0 &&
        anomalies.raider_breakup_orphan_sum === 0 &&
        debrisFirstVisibleInvalid === 0 &&
        anomalies.effect_orphan_sum === 0 &&
        anomalies.stale_debris_projectile_restores === 0 &&
        anomalies.pairshot_orphan_sum <= priorCandidate.pairshot_orphan_sum &&
        activeWorkCycles(heaviest) <= 32_568 &&
        anomalies.hard_overruns === 0 && anomalies.extra_vbi === 0 &&
        anomalies.dli === 0,
    };
    const reportPath = path.join(buildDirectory, "raider-remnant-native-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Raider remnant native report: ${path.relative(rootDirectory, reportPath)}`);
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (effectsStaggerOnly) {
    const rows = allRows.filter((row) => row.sector_state === 7 &&
      row.player_lifecycle === 0 && row.player_fighter_explosion_timer === 0);
    const profileComplete = (row) => {
      const clocks = [row.start_clock,
        ...traceProfileLabels.map((unused, index) => row[`profile_clock${index}`]),
        row.end_clock];
      return clocks.every((clock, index) => Number.isInteger(clock) &&
        (index === 0 || clock >= clocks[index - 1]));
    };
    const dliOverlap = (row, start, end) => Array.from({ length: 2 }, (unused, index) => ({
      start: row[`profile_dli${index}_start`], end: row[`profile_dli${index}_end`],
    })).reduce((sum, dli) => sum + Math.max(0,
      Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
    const activeWorkCycles = (row) => {
      const waitStart = row.profile_clock19;
      const waitEnd = row.profile_publication_begin;
      invariant(waitEnd >= waitStart && waitStart > 0,
        `Effects publication interval missing at ${row.session}:${row.frame}`);
      return row.wall_cycles - (waitEnd - waitStart) +
        dliOverlap(row, waitStart, waitEnd) + 32;
    };
    const completeRows = rows.filter(profileComplete);
    const stableFighterRows = completeRows.filter((row, index) => {
      const next = completeRows[index + 1];
      return next === undefined || next.session !== row.session || next.frame === row.frame + 1;
    });
    const effectRows = completeRows.filter((row) => row.effect_active_count === 5);
    invariant(effectRows.length > 0, "Effects trace did not cover all five active slots");
    const effectMetrics = (row) => {
      const detail = profileCostBreakdown(row).entity_effect_detail;
      return {
        erase: detail.effect_erase,
        update: detail.effect_update,
        render: detail.effect_render,
        visual: detail.effect_erase + detail.effect_render,
        total: detail.effect_erase + detail.effect_update + detail.effect_render,
      };
    };
    const effectPeak = maximumRow(effectRows, (row) => effectMetrics(row).visual);
    const linkedEffectFrames = Array.from({ length: 22 }, (unused, ringHead) =>
      executeDebrisDestructionTrace({ root: rootDirectory, artifact: "xex", ringHead })
        .records.filter((row) => row.phase === "FINAL")).flat();
    const linkedEffectPeak = maximumRow(linkedEffectFrames, (row) =>
      row.effectEraseCycles + row.effectRenderCycles);
    const fullPeak = maximumRow(completeRows, activeWorkCycles);
    const combinedRows = completeRows.filter((row) => row.player_fighter_projectiles > 0 &&
      row.enemy_projectiles > 0);
    const twoHeavyRows = completeRows.filter((row) => row.enemy_member0_state === 1 &&
      row.enemy_member1_state === 1 && row.enemy_pmg_rows1 > 0 && row.enemy_pmg_rows2 > 0);
    invariant(combinedRows.length > 0, "Effects trace did not cover player + enemy PairShots");
    invariant(twoHeavyRows.length > 0, "Effects trace did not cover two Heavy fighters");
    const scenario = (selected) => {
      const peak = maximumRow(selected, activeWorkCycles);
      return { frames: selected.length, maximum_active_work_cycles: activeWorkCycles(peak),
        maximum_raw_cadence_cycles: Math.max(...selected.map((row) => row.wall_cycles)),
        frame: frameState(peak) };
    };
    const spawnLatencies = [];
    let expiryErrors = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const next = rows[index + 1]?.session === row.session ? rows[index + 1] : null;
      const previous = rows[index - 1]?.session === row.session ? rows[index - 1] : null;
      if (row.effect_active_count === 5 &&
          (previous === null || previous.effect_active_count !== 5)) {
        for (let slot = 0; slot < 5; slot += 1) {
          const bit = 1 << slot;
          spawnLatencies.push((row.effect_rendered_mask & bit) !== 0 ? 0 :
            next !== null && (next.effect_rendered_mask & bit) !== 0 ? 1 : 2);
        }
      }
      if (row.effect_active_count === 0 && row.effect_rendered_mask !== 0 &&
          (next === null || next.effect_active_count === 0 &&
            next.effect_rendered_mask !== 0)) expiryErrors += 1;
    }
    invariant(spawnLatencies.length > 0, "Effects trace did not observe a five-slot effect spawn");
    const anomalies = {
      missed: rows.reduce((sum, row) => sum + row.missed_frames, 0),
      missed_with_effects_active:
        effectRows.reduce((sum, row) => sum + row.missed_frames, 0),
      missed_stable_fighter_open:
        stableFighterRows.reduce((sum, row) => sum + row.missed_frames, 0),
      missed_at_fighter_to_capital_boundary:
        rows.reduce((sum, row, index) => {
          const next = rows[index + 1];
          return sum + (row.missed_frames > 0 && next?.session === row.session &&
            next.frame !== row.frame + 1 ? row.missed_frames : 0);
        }, 0),
      target_overruns: completeRows.filter((row) => activeWorkCycles(row) > 31_200).length,
      hard_overruns: completeRows.filter((row) => activeWorkCycles(row) > 32_568).length,
      extra_vbi: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      dli: rows.reduce((sum, row) => sum + row.dli_sequence_violations, 0),
    };
    const report = {
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --effects-stagger-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      sessions: sessionsToRun.map(({ id, policy, frames }) => ({ id, policy, frames })),
      measured_frames: rows.length,
      five_slot_effect_frames: effectRows.length,
      effects_peak: {
        instruction_exact_post_playfield: {
          erase: linkedEffectPeak.effectEraseCycles,
          render: linkedEffectPeak.effectRenderCycles,
          visual: linkedEffectPeak.effectEraseCycles + linkedEffectPeak.effectRenderCycles,
        },
        native_in_place_dma_on_interval: {
          ...effectMetrics(effectPeak),
          note: "Includes ANTIC DMA stalls at the current pre-scheduler raster position; it is not the post-playfield commit gate.",
        },
        frame: frameState(effectPeak),
        maximum_active_work_cycles: activeWorkCycles(effectPeak),
        raw_cadence_cycles: effectPeak.wall_cycles,
      },
      visual_spawn_latency_frames: { maximum: Math.max(...spawnLatencies),
        observations: spawnLatencies.length },
      expiry_rendered_mask_errors: expiryErrors,
      fighter_open: scenario(completeRows),
      player_and_enemy: scenario(combinedRows),
      two_heavy: scenario(twoHeavyRows),
      timing: {
        maximum_active_work_cycles: activeWorkCycles(fullPeak),
        maximum_raw_cadence_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        target_headroom_cycles: 31_200 - activeWorkCycles(fullPeak),
        hard_gate_headroom_cycles: 32_568 - activeWorkCycles(fullPeak),
        ...anomalies,
      },
      csv: sessionsToRun.map(({ id }) => path.relative(rootDirectory,
        path.join(buildDirectory, `${id}.csv`))),
      passed: linkedEffectPeak.effectEraseCycles + linkedEffectPeak.effectRenderCycles <= 750 &&
        Math.max(...spawnLatencies) <= 1 && expiryErrors === 0 &&
        activeWorkCycles(fullPeak) <= 32_568 && anomalies.missed_with_effects_active === 0 &&
        anomalies.missed_stable_fighter_open === 0 && anomalies.hard_overruns === 0 &&
        anomalies.extra_vbi === 0 && anomalies.dli === 0,
    };
    const focusedReportPath = path.join(buildDirectory, "effects-stagger-native-report.json");
    fs.writeFileSync(focusedReportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Effects stagger native report: ${path.relative(rootDirectory, focusedReportPath)}`);
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (pairShotOnly) {
    const rows = allRows.filter((row) => row.sector_state === 7 &&
      row.player_lifecycle === 0 && row.player_fighter_explosion_timer === 0);
    const modeRows = (mode) => rows.filter((row) => row.session ===
      `pairshot-${mode}-xex-hard` && row.player_fighter_projectiles > 0);
    const normalRows = modeRows("normal");
    const rapidRows = modeRows("rapid");
    const spreadRows = modeRows("spread");
    const combinedRows = rows.filter((row) => row.player_fighter_projectiles > 0 &&
      row.enemy_projectiles > 0);
    const twoHeavyRows = rows.filter((row) => row.enemy_member0_state === 1 &&
      row.enemy_member1_state === 1 && row.enemy_pmg_rows1 > 0 && row.enemy_pmg_rows2 > 0);
    for (const [name, selected] of [["NORMAL", normalRows], ["RAPID", rapidRows],
      ["SPREAD", spreadRows], ["PLAYER_ENEMY", combinedRows], ["TWO_HEAVY", twoHeavyRows]]) {
      invariant(selected.length > 0, `PairShot native trace did not cover ${name}`);
    }
    const profileComplete = (row) => {
      const clocks = [row.start_clock,
        ...traceProfileLabels.map((unused, index) => row[`profile_clock${index}`]),
        row.end_clock];
      return clocks.every((clock, index) => Number.isInteger(clock) &&
        (index === 0 || clock >= clocks[index - 1]));
    };
    const dliOverlap = (row, start, end) => Array.from({ length: 2 }, (unused, index) => ({
      start: row[`profile_dli${index}_start`], end: row[`profile_dli${index}_end`],
    })).reduce((sum, dli) => sum + Math.max(0,
      Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
    const cpuInterval = (row, start, end) => end - start - dliOverlap(row, start, end);
    const activeWorkCycles = (row) => {
      const waitStart = row.profile_clock19;
      const waitEnd = row.profile_publication_begin;
      invariant(waitEnd >= waitStart && waitStart > 0,
        `PairShot publication interval missing at ${row.session}:${row.frame}`);
      const dliInWait = dliOverlap(row, waitStart, waitEnd);
      return row.wall_cycles - (waitEnd - waitStart) + dliInWait + 32;
    };
    const modeEvidence = (selected) => {
      const profiledRows = selected.filter(profileComplete);
      invariant(profiledRows.length > 0, "PairShot native mode has no complete profile frame");
      const heaviest = maximumRow(profiledRows, activeWorkCycles);
      const projectileDetail = {
        update_collision: cpuInterval(heaviest, heaviest.profile_clock5,
          heaviest.profile_clock6),
        player_weapon_control: cpuInterval(heaviest, heaviest.profile_clock10,
          heaviest.profile_clock11),
        enemy_weapon_control: cpuInterval(heaviest, heaviest.profile_clock11,
          heaviest.profile_clock12),
        publication_erase_render: cpuInterval(heaviest,
          heaviest.profile_publication_begin, heaviest.profile_clock20),
        address_mapping_calls: heaviest.profile_pointer_calls,
        address_mapping_cycles: heaviest.profile_pointer_cycles,
        composition_calls: heaviest.profile_compose_calls,
        composition_cycles: heaviest.profile_compose_cycles,
      };
      const projectileCycles = Object.entries(projectileDetail)
        .filter(([name]) => !name.endsWith("_calls") && name !== "address_mapping_cycles" &&
          name !== "composition_cycles")
        .reduce((sum, [, cycles]) => sum + cycles, 0);
      return {
        frames: selected.length,
        maximum_active_player_pairshots: Math.max(...selected.map((row) =>
          row.player_fighter_projectiles)),
        maximum_active_enemy_pairshots: Math.max(...selected.map((row) =>
          row.enemy_projectiles)),
        maximum_raw_cadence_cycles: Math.max(...selected.map((row) => row.wall_cycles)),
        maximum_active_work_cycles: activeWorkCycles(heaviest),
        frame: frameState(heaviest),
        projectile_cycles_at_heaviest: projectileCycles,
        projectile_detail: projectileDetail,
      };
    };
    const completeRows = rows.filter(profileComplete);
    const heaviest = maximumRow(completeRows, activeWorkCycles);
    const anomalies = {
      missed: rows.reduce((sum, row) => sum + row.missed_frames, 0),
      target_overruns: completeRows.filter((row) => activeWorkCycles(row) > 31_200).length,
      hard_overruns: completeRows.filter((row) => activeWorkCycles(row) > 32_568).length,
      extra_vbi: rows.reduce((sum, row) => sum + row.extra_vbi_boundaries, 0),
      dli: rows.reduce((sum, row) => sum + row.dli_sequence_violations, 0),
    };
    const report = {
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --pairshot-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      sessions: sessionsToRun.map(({ id, policy }) => ({ id, policy,
        state_injection: policy !== "pairshot-normal" })),
      frames: rows.length,
      fighter_open: modeEvidence(rows),
      normal: modeEvidence(normalRows),
      rapid: modeEvidence(rapidRows),
      spread: modeEvidence(spreadRows),
      player_and_enemy: modeEvidence(combinedRows),
      two_heavy: modeEvidence(twoHeavyRows),
      timing: {
        maximum_active_work_cycles: activeWorkCycles(heaviest),
        maximum_raw_cadence_cycles: Math.max(...rows.map((row) => row.wall_cycles)),
        target_headroom_cycles: 31_200 - activeWorkCycles(heaviest),
        hard_gate_headroom_cycles: 32_568 - activeWorkCycles(heaviest),
        ...anomalies,
      },
      csv: sessionsToRun.map(({ id }) => path.relative(rootDirectory,
        path.join(buildDirectory, `${id}.csv`))),
      passed: activeWorkCycles(heaviest) <= 32_568 && anomalies.missed === 0 &&
        anomalies.hard_overruns === 0 && anomalies.extra_vbi === 0 && anomalies.dli === 0,
    };
    const focusedReportPath = path.join(buildDirectory, "pairshot-native-report.json");
    fs.writeFileSync(focusedReportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`PairShot native report: ${path.relative(rootDirectory, focusedReportPath)}`);
    return;
  }
  if (raiderFormationOnly) {
    const session = sessionsToRun[0];
    const rows = allRows.filter((row) => row.session === session.id);
    const activationRows = rows.filter((row, index) => row.enemy_state === 1 &&
      (index === 0 || rows[index - 1].enemy_state !== 1));
    const hiddenActivations = activationRows.filter((row) => [0, 1].every((slot) =>
      row[`enemy_member${slot}_state`] !== 1 || row[`enemy_y${slot}`] + 14 <= 16));
    const twoActive = rows.filter((row) => row.enemy_state === 1 &&
      row.enemy_member0_state === 1 && row.enemy_member1_state === 1 &&
      row.enemy_pmg_rows1 > 0 && row.enemy_pmg_rows2 > 0);
    const bothVisible = twoActive.filter((row) =>
      // The first accepted anchor row still intersects the fixed top-edge
      // clipping boundary in the screenshot oracle. Begin overlap comparison
      // one scanline below it; spawn/top clipping is proved independently.
      row.enemy_y0 > 48 && row.enemy_y1 > 48 &&
      row.enemy_pmg_rows1 > 0 && row.enemy_pmg_rows2 > 0);
    invariant(activationRows.length > 0 && hiddenActivations.length === activationRows.length,
      `${session.id} admitted a Raider inside the visible playfield`);
    invariant(bothVisible.length > 48,
      `${session.id} did not show both PMG Raider slots long enough`);
    const sameHeight = bothVisible.find((row) => row.enemy_y0 === row.enemy_y1);
    const swapped = bothVisible.find((row) => row.enemy_y0 > row.enemy_y1);
    invariant(sameHeight !== undefined,
      `${session.id} never showed both Raiders at one height`);
    invariant(swapped !== undefined,
      `${session.id} did not reverse the initial vertical ordering`);
    const xDeltas = new Set(twoActive.map((row) => row.enemy_x1 - row.enemy_x0));
    invariant(xDeltas.size > 4,
      `${session.id} retained a fixed horizontal formation offset`);
    const signedSteps = (slot) => twoActive.slice(1).map((row, index) =>
      Math.sign(row[`enemy_x${slot}`] - twoActive[index][`enemy_x${slot}`]));
    invariant([0, 1].every((slot) => {
      const steps = signedSteps(slot);
      return steps.includes(-1) && steps.includes(1);
    }), `${session.id} did not show an independent turn in both slots`);
    invariant(bothVisible.every((row) =>
      row.enemy_hpos2 - row.enemy_hpos1 === row.enemy_x1 - row.enemy_x0),
    `${session.id} HPOSP1/HPOSP2 ownership diverged from the two slot X values`);
    invariant(Math.max(...rows.map((row) => row.player_fighter_projectiles)) > 0,
      `${session.id} did not exercise active PlayerFighter fire`);
    invariant(new Set(rows.map((row) => row.engine_active_dlist_lo)).size > 1 &&
      new Set(rows.map((row) => row.engine_a2_head)).size > 1,
      `${session.id} did not exercise playfield-ring rotation`);
    const dliOverlap = (row, start, end) => Array.from({ length: 2 }, (unused, index) => ({
      start: row[`profile_dli${index}_start`], end: row[`profile_dli${index}_end`],
    })).reduce((sum, dli) => sum + Math.max(0,
      Math.min(end, dli.end) - Math.max(start, dli.start)), 0);
    const activeWorkCycles = (row) => {
      const waitStart = row.profile_clock19;
      const waitEnd = row.profile_publication_begin;
      invariant(waitEnd >= waitStart && waitStart > 0,
        `Two-Heavy publication interval missing at ${row.session}:${row.frame}`);
      return row.wall_cycles - (waitEnd - waitStart) +
        dliOverlap(row, waitStart, waitEnd) + 32;
    };
    const completeRows = rows.filter((row) => row.profile_clock19 > 0 &&
      row.profile_publication_begin >= row.profile_clock19);
    const maximumWall = Math.max(...rows.map((row) => row.wall_cycles));
    const maximumActive = Math.max(...completeRows.map(activeWorkCycles));
    const movementPmgCosts = bothVisible.map((row) =>
      row.profile_clock5 - row.profile_clock4);
    const timingErrors = rows.reduce((counts, row) => ({
      missed: counts.missed + row.missed_frames,
      extra_vbi: counts.extra_vbi + row.extra_vbi_boundaries,
      dli: counts.dli + row.dli_sequence_violations,
    }), { missed: 0, extra_vbi: 0, dli: 0 });
    invariant(maximumWall <= CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES &&
      maximumWall <= SHIELD_BOOSTER_HARD_GATE_CYCLES &&
      timingErrors.missed === 0 && timingErrors.extra_vbi === 0 && timingErrors.dli === 0,
    `${session.id} failed PAL timing: max=${maximumWall}, ${JSON.stringify(timingErrors)}`);
    const firstVisible = bothVisible[0];
    const heaviestCaptured = maximumRow(
      bothVisible.filter((row) => row.frame < 149), (row) => row.wall_cycles);
    const selectedRows = [firstVisible, sameHeight, swapped, heaviestCaptured];
    /* The screenshot taken on entry to frame F+1 is the completed Atari raster
     * produced by trace row F, after its member-state transition. */
    const screenshots = selectedRows.map((row) => path.join(buildDirectory,
      `${session.id}-${String(row.frame + 1).padStart(3, "0")}.png`));
    invariant(screenshots.every((screenshot) => fs.existsSync(screenshot)),
      `${session.id} is missing a selected native Raider raster`);
    const sheetPath = path.join(buildDirectory, `${session.id}-proof.png`);
    writeScreenshotContact(screenshots, sheetPath, 4);
    const raiderBody = JSON.parse(fs.readFileSync(path.join(rootDirectory,
      "assets", "graphics", "enemy-roster.json"), "utf8"))
      .archetypes.find(({ id }) => id === "INTERCEPTOR").body
      .map((bits) => Number.parseInt(bits, 2));
    let overlapEvents = 0;
    let blackMaskEvents = 0;
    let blackMaskPixels = 0;
    let maximumBlackMaskPixels = 0;
    const corruptedFrames = [];
    for (const row of bothVisible) {
      const framePath = path.join(buildDirectory,
        `${session.id}-${String(row.frame + 1).padStart(3, "0")}.png`);
      invariant(fs.existsSync(framePath), `${session.id} is missing raster ${row.frame + 1}`);
      const screenshot = decodeAtari800Screenshot(fs.readFileSync(framePath));
      const bounds = [0, 1].map((slot) => ({
        left: 2 * (row[`enemy_hpos${slot + 1}`] - 64),
        top: row[`enemy_y${slot}`] - 32,
        right: 2 * (row[`enemy_hpos${slot + 1}`] - 64) + 32,
        bottom: row[`enemy_y${slot}`] - 32 + raiderBody.length,
      }));
      if (bounds[0].left < bounds[1].right && bounds[1].left < bounds[0].right &&
        bounds[0].top < bounds[1].bottom && bounds[1].top < bounds[0].bottom) {
        overlapEvents += 1;
      }
      const expected = new Set();
      for (const bound of bounds) for (let bodyY = 0; bodyY < raiderBody.length; bodyY += 1) {
        for (let bit = 0; bit < 8; bit += 1) {
          if ((raiderBody[bodyY] & (0x80 >> bit)) === 0) continue;
          for (let pixel = 0; pixel < 4; pixel += 1) {
            const x = bound.left + bit * 4 + pixel;
            const y = bound.top + bodyY;
            if (x >= 0 && x < screenshot.width && y >= 0 && y < screenshot.height)
              expected.add(y * screenshot.width + x);
          }
        }
      }
      const missing = [...expected].filter((offset) => screenshot.indices[offset] === 0).length;
      if (missing > 0) {
        blackMaskEvents += 1;
        blackMaskPixels += missing;
        maximumBlackMaskPixels = Math.max(maximumBlackMaskPixels, missing);
        if (corruptedFrames.length < 16) corruptedFrames.push({ frame: row.frame, missing });
      }
    }
    const staleHeavyPageFrames = rows.reduce((count, row) => count +
      [0, 1].filter((slot) => row[`enemy_member${slot}_state`] === 0 &&
        row[`enemy_pmg_rows${slot + 1}`] > 0).length, 0);
    const report = {
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --raider-formation-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      session: session.id,
      difficulty: "HARD",
      frames: rows.length,
      input: { policy: session.policy, state_injection: false },
      spawn_contract: {
        visible_top_y: 16,
        height_scanlines: 14,
        spawn_y_values: activationRows.map((row) => [row.enemy_y0, row.enemy_y1]),
        spawns: activationRows.length,
        respawns: Math.max(0, activationRows.length - 1),
        fully_hidden_at_activation: hiddenActivations.length,
        visible_at_activation_defects: activationRows.length - hiddenActivations.length,
      },
      first_visible: twoPmgFrameState(firstVisible),
      same_height_different_x: twoPmgFrameState(sameHeight),
      vertical_order_swapped: twoPmgFrameState(swapped),
      maximum_live_members: Math.max(...rows.map((row) => row.enemy_live_count)),
      independence: {
        horizontal_offset_values: xDeltas.size,
        p1_and_p2_both_turned: true,
        hpos_tracks_slot_x: true,
        maximum_p1_nonzero_rows: Math.max(...rows.map((row) => row.enemy_pmg_rows1)),
        maximum_p2_nonzero_rows: Math.max(...rows.map((row) => row.enemy_pmg_rows2)),
      },
      workload: {
        player_fighter_fire_active: true,
        maximum_player_fighter_projectiles:
          Math.max(...rows.map((row) => row.player_fighter_projectiles)),
        playfield_ring_rotation_active: true,
        maximum_raider_projectiles: Math.max(...rows.map((row) => row.enemy_projectiles), 0),
        raider_combat_cost_included: true,
        maximum_enemy_movement_pmg_wall_cycles:
          Math.max(...movementPmgCosts),
      },
      overlap_raster: {
        two_heavy_active_frames: bothVisible.length,
        overlap_events: overlapEvents,
        black_mask_events: blackMaskEvents,
        black_mask_pixels: blackMaskPixels,
        maximum_black_mask_pixels: maximumBlackMaskPixels,
        first_corrupted_frames: corruptedFrames,
        inactive_slot_stale_page_frames: staleHeavyPageFrames,
      },
      timing: {
        maximum_active_work_cycles: maximumActive,
        maximum_raw_cadence_cycles: maximumWall,
        target_headroom_cycles: CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES - maximumActive,
        hard_gate_headroom_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES - maximumActive,
        ...timingErrors,
      },
      screenshot_sequence: path.relative(rootDirectory, sheetPath),
      csv: path.relative(rootDirectory, path.join(buildDirectory, `${session.id}.csv`)),
      passed: blackMaskEvents === 0 && staleHeavyPageFrames === 0 &&
        maximumActive <= SHIELD_BOOSTER_HARD_GATE_CYCLES &&
        timingErrors.missed === 0 && timingErrors.extra_vbi === 0 && timingErrors.dli === 0,
    };
    const focusedReportPath = path.join(buildDirectory, "two-pmg-raiders-native-report.json");
    fs.writeFileSync(focusedReportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Two-PMG Raider report: ${path.relative(rootDirectory, focusedReportPath)}`);
    invariant(report.passed,
      `${session.id} retained ${blackMaskEvents} black-mask frames or failed PAL timing`);
    return;
  }
  if (raiderSectorOnly) {
    const session = sessionsToRun[0];
    const rows = allRows.filter((row) => row.session === session.id);
    const capitalStartIndex = rows.findIndex((row, index) => index !== 0 &&
      row.sector_state !== 7 && rows[index - 1].sector_state === 7);
    invariant(capitalStartIndex > 0, `${session.id} did not enter the capital sector`);
    const postOpenIndex = rows.findIndex((row, index) => index > capitalStartIndex &&
      row.sector_state === 7 && rows[index - 1].sector_state !== 7);
    invariant(postOpenIndex > capitalStartIndex,
      `${session.id} did not return to post-sector OPEN`);
    const preSector = rows.slice(0, capitalStartIndex);
    const initialFormation = preSector.find((row) => row.enemy_state === 1 &&
      row.enemy_live_count === 3);
    invariant(initialFormation !== undefined,
      `${session.id} did not run a three-Raider formation before the sector`);
    const releasedShots = preSector.findLast((row) => row.enemy_state === 0 &&
      row.enemy_projectiles > 0);
    invariant(releasedShots !== undefined,
      `${session.id} did not preserve released Raider shots after formation release`);
    const capitalStart = rows[capitalStartIndex];
    invariant(capitalStart.enemy_state === 0 && capitalStart.enemy_live_count === 0 &&
      capitalStart.enemy_projectiles === 0,
    `${session.id} entered the capital sector before ordinary pressure drained`);
    const capitalRows = rows.slice(capitalStartIndex, postOpenIndex + 1);
    invariant(capitalRows.every((row) => row.enemy_state === 0 &&
      row.enemy_live_count === 0),
    `${session.id} admitted ordinary machines during the capital lifecycle`);
    const readmission = rows.slice(postOpenIndex + 1).find((row) =>
      row.enemy_state === 1 && row.enemy_live_count === 3);
    invariant(readmission !== undefined,
      `${session.id} did not readmit a formation after post-sector OPEN`);
    const maximumWall = Math.max(...rows.map((row) => row.wall_cycles));
    const timingErrors = rows.reduce((counts, row) => ({
      missed: counts.missed + row.missed_frames,
      extra_vbi: counts.extra_vbi + row.extra_vbi_boundaries,
      dli: counts.dli + row.dli_sequence_violations,
    }), { missed: 0, extra_vbi: 0, dli: 0 });
    invariant(maximumWall <= CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES &&
      maximumWall <= SHIELD_BOOSTER_HARD_GATE_CYCLES &&
      timingErrors.missed === 0 && timingErrors.extra_vbi === 0 && timingErrors.dli === 0,
    `${session.id} failed PAL timing: max=${maximumWall}, ${JSON.stringify(timingErrors)}`);
    const report = {
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --raider-sector-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      session: session.id,
      difficulty: "HARD",
      frames: rows.length,
      input: { policy: session.policy, state_injection: false },
      initial_formation: frameState(initialFormation),
      released_shots_finish_independently: frameState(releasedShots),
      capital_start_empty: frameState(capitalStart),
      post_sector_open: frameState(rows[postOpenIndex]),
      formation_readmitted: frameState(readmission),
      blocked_capital_frames: capitalRows.length,
      timing: {
        maximum_wall_cycles: maximumWall,
        target_headroom_cycles: CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES - maximumWall,
        hard_gate_headroom_cycles: SHIELD_BOOSTER_HARD_GATE_CYCLES - maximumWall,
        ...timingErrors,
      },
      csv: path.relative(rootDirectory, path.join(buildDirectory, `${session.id}.csv`)),
      passed: true,
    };
    const focusedReportPath = path.join(buildDirectory, "raider-sector-native-report.json");
    fs.writeFileSync(focusedReportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Raider sector report: ${path.relative(rootDirectory, focusedReportPath)}`);
    return;
  }
  if (earlyEnemyOnly) {
    const limits = [60, 45, 30];
    const evidence = sessionsToRun.map((session) => {
      const rows = allRows.filter((row) => row.session === session.id);
      const admissions = [];
      const releases = [];
      for (let index = 0; index < rows.length; ++index) {
        const row = rows[index];
        const previous = index === 0 ? undefined : rows[index - 1];
        if (row.enemy_state === 1 && (previous === undefined || previous.enemy_state === 0))
          admissions.push(row);
        if (row.enemy_state === 0 && previous?.enemy_state === 2) releases.push(row);
      }
      const visible = admissions.map((admission, admissionIndex) => rows.find((row) =>
        row.frame >= admission.frame &&
        (admissionIndex + 1 === admissions.length || row.frame < admissions[admissionIndex + 1].frame) &&
        row.enemy_state === 1 && row.enemy_y + 14 > 16)).filter(Boolean);
      const kills = rows.filter((row) => (row.events & (1 << 18)) !== 0);
      const pending = rows.find((row) => row.pickup_state === 1);
      const active = rows.find((row) => row.pickup_state === 2);
      const pickupEpisodes = rows.filter((row, index) => row.pickup_state === 1 &&
        (index === 0 || rows[index - 1].pickup_state === 0));
      const pickupCollections = rows.filter((row) => (row.events & (1 << 19)) !== 0);
      const capital = rows.find((row, index) => row.sector_state !== 7 &&
        (index === 0 || rows[index - 1].sector_state === 7));
      const capitalVisible = capital === undefined ? undefined : rows.find((row) =>
        row.frame >= capital.frame &&
        (row.capital_visible_allied_cells !== 0 || row.capital_visible_enemy_cells !== 0));
      const capitalEnd = capital === undefined ? undefined : rows.find((row) =>
        row.frame > capital.frame && row.sector_state >= 5);
      const simultaneous = capital === undefined ? undefined : rows.find((row) =>
        row.frame >= capital.frame && row.frame < (capitalEnd?.frame ?? Number.POSITIVE_INFINITY) &&
        row.enemy_state === 1 && row.enemy_y + 14 > 16 &&
        (row.capital_visible_allied_cells !== 0 || row.capital_visible_enemy_cells !== 0));
      const simultaneousAdmission = simultaneous === undefined ? undefined :
        admissions.findLast((row) => row.frame <= simultaneous.frame);
      const capitalRelease = simultaneous === undefined ? undefined : releases.find((row) =>
        row.frame > simultaneous.frame && row.frame <
          (capitalEnd?.frame ?? Number.POSITIVE_INFINITY));
      const capitalReadmission = capitalRelease === undefined ? undefined : admissions.find((row) =>
        row.frame > capitalRelease.frame && row.frame <
          (capitalEnd?.frame ?? Number.POSITIVE_INFINITY));
      const broadsideDuringCapital = capital === undefined ? undefined : rows.find((row) =>
        row.frame >= capital.frame && row.frame < (capitalEnd?.frame ?? Number.POSITIVE_INFINITY) &&
        row.broadside > 0);
      const rejectedCapitalRequests = rows.filter((row, index) => {
        const previous = index === 0 ? undefined : rows[index - 1];
        return previous !== undefined && capital !== undefined &&
          row.frame >= capital.frame && row.frame <
            (capitalEnd?.frame ?? Number.POSITIVE_INFINITY) &&
          (row.events & (1 << 21)) !== 0 && previous.enemy_state === 0 &&
          row.enemy_state === 0;
      });
      const visibilityGaps = releases.slice(0, Math.max(0, visible.length - 1))
        .map((release, index) => visible[index + 1].active_gameplay_frame -
          release.active_gameplay_frame);
      const maximumWall = Math.max(...rows.map((row) => row.wall_cycles));
      const gateOverruns = rows.filter((row) =>
        row.wall_cycles > CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES).length;
      const physicalOverruns = rows.filter((row) => row.wall_cycles >= PAL_FRAME_CYCLES).length;
      const timingErrors = rows.reduce((counts, row) => ({
        missed: counts.missed + row.missed_frames,
        extra_vbi: counts.extra_vbi + row.extra_vbi_boundaries,
        dli: counts.dli + row.dli_sequence_violations,
      }), { missed: 0, extra_vbi: 0, dli: 0 });
      invariant(admissions.length >= 3,
        `${session.id} observed ${admissions.length} admissions`);
      const activeReservationAtEnd = rows.at(-1).enemy_state === 0 ? 0 : 1;
      invariant(releases.length + activeReservationAtEnd === admissions.length,
        `${session.id} charged ${admissions.length} ordinary admissions but accounted for ` +
        `${releases.length} releases and ${activeReservationAtEnd} active reservation`);
      invariant(visible.length >= 3 && visible[0].active_gameplay_frame <= 60,
        `${session.id} first visible frame was ${visible[0]?.active_gameplay_frame}`);
      invariant(visibilityGaps.every((gap) => gap <= limits[session.difficulty]),
        `${session.id} visibility gaps ${visibilityGaps} exceed ${limits[session.difficulty]}`);
      invariant(kills.filter((row) => row.active_gameplay_frame < 600).length >= 3,
        `${session.id} observed fewer than three qualified kills before frame 600`);
      invariant(pending !== undefined && active !== undefined &&
        pending.active_gameplay_frame <= active.active_gameplay_frame &&
        active.active_gameplay_frame < (capital?.active_gameplay_frame ?? 600),
      `${session.id} did not naturally expose PENDING then ACTIVE before capital admission`);
      invariant(pickupEpisodes.length >= 1,
        `${session.id} created no pickup episodes`);
      invariant(pickupCollections.length >= 1 &&
        pickupCollections.length <= pickupEpisodes.length,
      `${session.id} observed ${pickupEpisodes.length} pickup episodes but ` +
        `${pickupCollections.length} natural collections`);
      invariant(capital?.active_gameplay_frame >= 600 && capitalVisible !== undefined,
        `${session.id} capital admission/visibility was ${capital?.active_gameplay_frame}/` +
        `${capitalVisible?.active_gameplay_frame}`);
      invariant(simultaneous !== undefined && simultaneousAdmission !== undefined,
        `${session.id} did not show a visible Hunter with the capital hull`);
      invariant(capitalRelease !== undefined && capitalReadmission !== undefined,
        `${session.id} did not release and readmit a Hunter during the capital traversal`);
      invariant(broadsideDuringCapital !== undefined,
        `${session.id} did not retain natural BROADSIDE fire during coexistence`);
      invariant(rejectedCapitalRequests.length > 0 && rejectedCapitalRequests.every((row) => {
        const previous = rows[row.frame - 1];
        return previous !== undefined && row.director_rng === previous.director_rng;
      }), `${session.id} rejected ordinary admission advanced Director RNG`);
      invariant(maximumWall <= CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES &&
        timingErrors.missed === 0 &&
        timingErrors.extra_vbi === 0 && timingErrors.dli === 0,
      `${session.id} failed PAL timing: max=${maximumWall}, ${JSON.stringify(timingErrors)}`);
      invariant(rows.every((row) => unownedHullTransientCells(row) === 0 &&
        row.muzzle_pointer_errors === 0 && row.broad_pointer_errors === 0 &&
        row.broad_screen_orphan_cells === 0 &&
        [0, 1, 2].every((slot) => row[`broad_pmg_orphan_rows${slot}`] === 0)),
      `${session.id} observed backing, pointer, or orphan-glyph contamination`);
      const compact = (row) => row === undefined ? null : ({
        trace_frame: row.frame,
        active_gameplay_frame: row.active_gameplay_frame,
        enemy_y: row.enemy_y,
        intensity: row.director_intensity,
        rng: row.director_rng,
      });
      return {
        session: session.id,
        artifact: session.medium,
        difficulty: ["BEGINNER", "MEDIUM", "HARD"][session.difficulty],
        frames: rows.length,
        input: { policy: session.policy, fire_delay: session.fireDelay, state_injection: false },
        first_attempt_active_gameplay_frame: admissions[0].active_gameplay_frame,
        admissions: admissions.map(compact),
        visible: visible.map(compact),
        releases: releases.map(compact),
        maximum_release_to_visibility_gap: Math.max(0, ...visibilityGaps),
        qualified_kills_before_frame_600: kills.filter((row) =>
          row.active_gameplay_frame < 600).map(compact),
        third_qualified_kill: compact(kills[2]),
        pickup: { pending: compact(pending), active: compact(active),
          collected: compact(pickupCollections[0]), episodes: pickupEpisodes.length },
        capital: { configured_due_active_gameplay_frame: 600,
          admission: compact(capital), first_visible: compact(capitalVisible),
          traversal_end: compact(capitalEnd), broadside: compact(broadsideDuringCapital) },
        coexistence: { simultaneous: compact(simultaneous),
          first_admission: compact(simultaneousAdmission),
          release: compact(capitalRelease), readmission: compact(capitalReadmission) },
        director: {
          ordinary_charges: admissions.length,
          ordinary_releases: releases.length,
          active_ordinary_reservations_at_end: activeReservationAtEnd,
          charge_release_balanced:
            releases.length + activeReservationAtEnd === admissions.length,
          maximum_intensity: Math.max(...rows.map((row) => row.director_intensity)),
          rng_sequence_at_admission: admissions.map((row) => row.director_rng),
          rejected_capital_requests_without_rng_advance: rejectedCapitalRequests.length,
          rng_sequence_checksum_sha256: sha256(Buffer.from(
            admissions.map((row) => row.director_rng))),
        },
        timing: { maximum_wall_cycles: maximumWall,
          physical_headroom_cycles: PAL_FRAME_CYCLES - maximumWall,
          focused_gate_headroom_cycles:
            CAPITAL_HUNTER_ACCEPTED_CEILING_CYCLES - maximumWall,
          deadline_overruns: timingErrors.missed,
          physical_pal_overruns: physicalOverruns,
          focused_gate_overruns: gateOverruns,
          ...timingErrors },
        integrity: { backing_contamination: 0, orphan_glyphs: 0,
          extra_pmg_scanlines: 0,
          maximum_active_ordinary_enemies: Math.max(...rows.map((row) =>
            row.enemy_state === 0 ? 0 : 1)) },
        csv: path.relative(rootDirectory,
          path.join(buildDirectory, `${session.id}.csv`)),
        passed: true,
      };
    });
    const focusedReportPath = path.join(buildDirectory, "early-enemy-native-report.json");
    fs.writeFileSync(focusedReportPath, `${JSON.stringify({
      schema_version: 1,
      generated_by: "scripts/runtime-wall-trace.mjs --early-enemy-only",
      emulator: "Atari800 7.1.2 PAL/XL",
      artifact_sha256: runtimeArtifacts,
      cold_boot: bootSmoke,
      sessions: evidence,
      passed: evidence.every((entry) => entry.passed),
    }, null, 2)}\n`);
    console.log(`Early enemy report: ${path.relative(rootDirectory, focusedReportPath)}`);
    return;
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
    // Owner decision 2026-09-21, option (b) extended to the traversal
    // invariants. `f6eee5c` moved the capsule to the missile plane, so the three
    // character-renderer clauses that stood here were dead: pickup_drawn_mask
    // is 0 on all 1,800 frames and pickup_footprints_after / glyph_cells_after
    // read four-digit counts of unrelated cells.
    //   - drawn_mask 15/3 -> the quartet coverage the static-capsule gate uses:
    //     sixteen non-empty missile rows whose union is $FF. The character
    //     renderer's clipped bottom row (render_row 26 -> 3) has no
    //     missile-plane equivalent; a missile mark is not cut by a character
    //     cell, and all 27 raster positions measure 16 / $FF.
    //   - footprints_after === 1 -> one contiguous run of non-empty missile
    //     rows, counted around the 256-row page wrap, which proves one capsule
    //     rather than a trail left by a failed erase.
    //   - glyph_cells_after in {2,4,6} -> DELETED, not repointed. It counted the
    //     capsule's character cells under the phased 2x2/2x3 footprint; the
    //     capsule writes no character cell at all now, so there is nothing on
    //     the missile plane for it to measure. Singularity is carried by
    //     pickup_missile_blocks above and the phase itself by pickup_draw_calls.
    invariant(activeRows.every((row) => row.entity_active_mask === 2 &&
      row.pickup_missile_rows === 16 &&
      row.pickup_missile_union === 255 &&
      row.pickup_missile_blocks === 1 &&
      row.pickup_draw_calls === 1),
    "Native pickup did not remain one logical slot and one whole 16-row missile capsule");
    invariant(activeRows.slice(1).every((row) => Array.from({ length: 6 }, (_, index) => {
      const address = row[`pickup_old_address${index}`];
      return address < RING_SCREEN || address >= RING_END ||
        row[`pickup_old_after_erase${index}`] === row[`pickup_old_backing${index}`];
    }).every(Boolean)),
    "Native reverse erase did not restore every exact saved physical cell");
    const releaseRow = traversalRows.find(({ frame }) => frame === activeRows.at(-1).frame + 1);
    // Same decision: the two dead fields in the release clause read the missile
    // plane instead. An emptiness clause cannot be proved by the suppressed
    // fixture the way the active clauses above are -- suppressing the capsule
    // empties the plane and satisfies it -- so it is held by the active clauses.
    invariant(releaseRow?.pickup_state === 0 && releaseRow.pickup_y === 240 &&
      releaseRow.entity_active_mask === 0 && releaseRow.pickup_missile_rows === 0 &&
      releaseRow.pickup_missile_blocks === 0,
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
  const interceptorKillRows = allRows.filter((row) =>
    row.interceptor_breakup_request_slot0 + row.interceptor_breakup_request_slot1 > 0);
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
  const interceptorFlashPairs = interceptorKillRows.filter((row) => {
    const nextFrame = rowsBySessionFrame.get(`${row.session}:${row.frame + 1}`);
    return row.colbk === 0x1e && nextFrame?.colbk === 0x3c;
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
  invariant(interceptorKillRows.length > 0,
    "Trace did not execute the Interceptor destruction path");
  invariant(interceptorBreakupRows.length === 0 && interceptorKillRows.every((row) =>
    row.raider_character_writes === 0 && row.raider_transient_allocations === 0 &&
    row.raider_slot0_activations === 0),
  "Interceptor death entered the deleted character-effect materialization path");
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
    row.rapid_projectile_slot < 5 && row.pickup_booster_state === 3) &&
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
    // The legacy `far` event bit is now the shared white-glyph publication;
    // it runs every PAL frame. The `near` bit remains the world/ring event.
    { difficulty: 0, world: 20, near: 20, far: 50, debris: 12 },
    { difficulty: 1, world: 22.5, near: 22.5, far: 50, debris: 13.5 },
    { difficulty: 2, world: 25, near: 25, far: 50, debris: 15 },
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
      // The 286 behavioural clauses are not otherwise represented in this gate.
      // Before stage 1 a clause could only fail by throwing, which prevented the
      // report existing at all, so scripts/build.mjs treated the file's presence
      // as the pass signal. Now that a report is written on a run that had a
      // clause failure, gate.passed MUST carry those failures or that check
      // becomes unsound.
      behavioural_clause_failure_count: sessionFailures.length,
      behavioural_clause_failures: sessionFailures,
      passed: sessionFailures.length === 0 &&
        heaviest.wall_cycles <= SHIELD_BOOSTER_HARD_GATE_CYCLES &&
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
        combined_physical_capacity: 10,
        maximum_combined_active_observed:
          Math.max(...allRows.map((row) => row.projectiles)),
        full_combined_capacity_observed:
          allRows.some((row) => row.projectiles === 10),
        full_combined_capacity_matching_frames:
          allRows.filter((row) => row.projectiles === 10).length,
        heaviest_at_full_combined_capacity:
          allRows.some((row) => row.projectiles === 10)
            ? frameState(maximumRow(allRows.filter((row) => row.projectiles === 10),
              (row) => row.wall_cycles))
            : null,
        component_physical_capacities: {
          player_fighter: 5,
          interceptor: 5,
        },
        evidence_note: allRows.some((row) => row.projectiles === 10)
          ? "The physical 10-slot PairShot allocation was reached by a legal replay; 10/10 is observed rather than inferred or artificially seeded."
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
        ...coverageRecord(interceptorKillRows, () => true),
        kill_frames: interceptorKillRows.length,
        character_materializer_frames: interceptorBreakupRows.length,
        character_writes: allRows.reduce((sum, row) => sum + row.raider_character_writes, 0),
        transient_allocations: allRows.reduce((sum, row) =>
          sum + row.raider_transient_allocations, 0),
        slot0_activations: allRows.reduce((sum, row) =>
          sum + row.raider_slot0_activations, 0),
        active_mask: 0,
        active_count: 0,
        flying_fragment_count: 0,
        full_screen_flash_preserved: interceptorFlashPairs.length > 0,
        yellow_death_then_red_flash_pairs: interceptorFlashPairs.length,
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
