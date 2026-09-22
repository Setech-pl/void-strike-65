#ifndef VOIDSTRIKE65_TRACE_H
#define VOIDSTRIKE65_TRACE_H

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "gtia.h"
#include "input.h"
#include "pia.h"
#include "pokey.h"
#include "screen.h"

#define DFTRACE_PAL_FRAME_CYCLES 35568u
#define DFTRACE_GAMEPLAY_TOP 24u
#define DFTRACE_GAMEPLAY_BOTTOM 240u
#define DFTRACE_PLAYER_MIN_Y 32u
#define DFTRACE_PLAYER_MAX_Y 225u
#define DFTRACE_RING_ROWS 27u
#define DFTRACE_RING_SCREEN 0x8140u
#define DFTRACE_RING_END 0x8578u
#define DFTRACE_PICKUP_GLYPH_BASE 120u
#define DFTRACE_ENGINE_ALLIED_GLYPH 83u
#define DFTRACE_ENGINE_ENEMY_GLYPH 84u
#define DFTRACE_ENGINE_ALLIED_CODE 0x53u
#define DFTRACE_ENGINE_ENEMY_CODE 0xd4u
#define DFTRACE_CAPITAL_GLYPH_FIRST 59u
#define DFTRACE_CAPITAL_GLYPH_LAST 89u
#define DFTRACE_ALLIED_MUZZLE_CODE 0x45u
/* Visible PMG window for the enemy stale-body gate; GAMEPLAY_TOP/BOTTOM. */
#define DFTRACE_ENEMY_PMG_TOP 16u
#define DFTRACE_ENEMY_PMG_BOTTOM 240u
#define DFTRACE_ENEMY_PMG_NO_ROW 256u
#define DFTRACE_ENEMY_MUZZLE_CODE 0xd0u
#define DFTRACE_ALLIED_FLASH_CODE 0x51u
#define DFTRACE_ENEMY_FLASH_CODE 0xd2u
#define DFTRACE_DIVIDER_SCREEN 0x4028u
#define DFTRACE_CHARSET 0x4400u
#define DFTRACE_PROFILE_COUNT 22u
#define DFTRACE_PROFILE_DLI_COUNT 2u
#define DFTRACE_CAPTURE_DMA_Y_OFFSET 8u
#define DFTRACE_NEAR_COUNT 4u
#define DFTRACE_NEAR_CODE 1u

typedef struct {
	uint64_t start_clock;
	uint64_t end_clock;
	uint64_t next_start_clock;
	unsigned start_host_frame;
	unsigned end_host_frame;
	unsigned next_start_host_frame;
	int start_y;
	int start_x;
	int end_y;
	int end_x;
	unsigned dli_nmis;
	unsigned events;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned projectiles;
	unsigned broadside;
	unsigned far_rendered;
	unsigned live_interceptor;
	unsigned fighter_explosion;
	unsigned capital_explosion;
	unsigned music_active;
	unsigned fire_sfx;
	unsigned fire_timer_value;
	unsigned player_burst_state;
	unsigned player_burst_remaining;
	unsigned player_burst_timer;
	unsigned audf1;
	unsigned audc1;
	unsigned fire_accept_calls;
	unsigned update_sound_calls;
	uint64_t fire_accept_clock;
	uint64_t update_sound_clock;
	unsigned fire_accept_scanline;
	unsigned fire_accept_cycle;
	unsigned update_sound_scanline;
	unsigned update_sound_cycle;
	unsigned hit_sfx;
	unsigned capital_sfx;
	unsigned sound_enabled;
	unsigned player_lifecycle;
	unsigned player_x;
	unsigned player_y;
	unsigned player_health;
	unsigned player_lives;
	unsigned player_invulnerability;
	unsigned player_damage_cooldown;
	unsigned player_damage_applied;
	unsigned player_lifecycle_after;
	unsigned player_x_after;
	unsigned player_y_after;
	unsigned player_health_after;
	unsigned player_lives_after;
	unsigned player_invulnerability_after;
	unsigned player_damage_cooldown_after;
	unsigned prior;
	unsigned player_erase_calls;
	unsigned player_draw_calls;
	unsigned player_erase_scanline;
	unsigned player_draw_scanline;
	unsigned sector_state;
	unsigned gameplay_frame;
	unsigned active_gameplay_frame;
	unsigned enemy_state;
	unsigned enemy_y;
	unsigned enemy_slot_x[2];
	unsigned enemy_slot_y[2];
	unsigned enemy_hpos[2];
	unsigned enemy_pmg_rows[2];
	unsigned enemy_pmg_mismatch[2];
	unsigned enemy_pmg_mismatch_row[2];
	unsigned enemy_pmg_mismatch_writer[2];
	unsigned enemy_member_state[3];
	unsigned enemy_member_hp[3];
	unsigned enemy_live_count;
	unsigned enemy_projectiles;
	unsigned director_phase;
	unsigned director_rng;
	unsigned director_intensity;
	unsigned director_reaction;
	unsigned director_recovery;
	unsigned difficulty;
	unsigned active_muzzles;
	unsigned muzzle_domain[2];
	unsigned muzzle_row[2];
	unsigned muzzle_pointer[2];
	unsigned muzzle_cell[2];
	/* Diagnostic-only: the PC that last wrote the tracked muzzle's own cell,
	 * read straight out of dftrace_character_last_writer[] at snapshot time.
	 * 0 when the slot is inactive or nothing has ever written that cell.
	 * This names the writer that left the cell in the state muzzle_cell[]
	 * reports — in particular the one that erased a tracked muzzle glyph
	 * after redraw_tracked_muzzles published it. */
	unsigned muzzle_cell_writer_pc[2];
	/* Writer 4 of the hull-transient ownership model: 1 while a live, rendered
	 * fighter projectile stands on this tracked muzzle's own cell, 0 otherwise.
	 * Presence, never history — see dftrace_projectile_occludes. */
	unsigned muzzle_projectile_occlusion[2];
	unsigned muzzle_code_cells;
	unsigned muzzle_illegal_cells;
	/* Diagnostic-only: address and character code of the FIRST orphan cell
	 * counted into muzzle_illegal_cells this frame, 0 when there is none.
	 * The counter alone cannot say which writer put the code there. */
	unsigned muzzle_illegal_address;
	unsigned muzzle_illegal_code;
	unsigned muzzle_pointer_errors;
	unsigned muzzle_divider_allied;
	unsigned muzzle_divider_enemy;
	unsigned broad_state[3];
	unsigned broad_owner[3];
	unsigned broad_x[3];
	unsigned broad_y[3];
	unsigned broad_collision[3];
	unsigned broad_raster_x[3];
	unsigned broad_raster_row[3];
	unsigned broad_flash[3];
	unsigned broad_turret[3];
	unsigned broad_row[3];
	unsigned broad_pointer[3];
	unsigned broad_pointer_errors;
	unsigned broad_screen_orphan_cells;
	unsigned broad_screen_first_address;
	unsigned broad_screen_first_code;
	unsigned broad_screen_missing_cells;
	unsigned broad_pmg_orphan_rows[3];
	unsigned broad_pmg_missing_rows[3];
	unsigned broad_pmg_first_slot;
	unsigned broad_pmg_first_row;
	unsigned broad_pmg_first_value;
	unsigned broad_pmg_first_writer_pc;
	unsigned broad_pre_rotate_screen_transients;
	unsigned capital_collision_calls;
	unsigned capital_player_damage_calls;
	unsigned entity_active;
	unsigned entity_x;
	unsigned entity_y;
	unsigned entity_vx;
	unsigned entity_move_accumulator;
	unsigned entity_vertical_accumulator;
	unsigned entity_render_id;
	unsigned entity_active_mask;
	unsigned pickup_state;
	unsigned pickup_booster_state;
	unsigned pickup_counter;
	unsigned pickup_x;
	unsigned pickup_y;
	unsigned pickup_timer_lo;
	unsigned pickup_timer_hi;
	unsigned pickup_animation;
	unsigned pickup_render_id;
	unsigned pickup_drawn_mask;
	unsigned pickup_admission_requests;
	unsigned pickup_attempt_sector;
	unsigned pickup_attempt_active_mask;
	unsigned pickup_attempt_active_count;
	unsigned pickup_attempt_x;
	unsigned pickup_attempt_y;
	unsigned pickup_attempt_timer;
	unsigned pickup_attempt_type[4];
	unsigned pickup_attempt_state[4];
	unsigned pickup_attempt_director_phase;
	unsigned pickup_attempt_director_intensity;
	unsigned pickup_attempt_director_reaction;
	unsigned pickup_attempt_director_recovery;
	unsigned pickup_attempt_director_rng;
	unsigned pickup_attempt_director_flags;
	unsigned pickup_attempt_admission_frame;
	unsigned pickup_attempt_gameplay_frame;
	unsigned pickup_attempt_player_lifecycle;
	unsigned pickup_pmg_rows;
	/* The whole M0-M3 quartet, unlike pickup_pmg_rows, which tests `& 0xf0`
	 * and therefore sees only M2 and M3. Owner decision 2026-09-21: the
	 * traversal invariants measure the capsule where it lives. */
	unsigned pickup_missile_rows;
	unsigned pickup_missile_union;
	unsigned pickup_missile_blocks;
	unsigned pickup_hposm[4];
	unsigned pickup_sizem;
	unsigned pickup_screen_lo;
	unsigned pickup_screen_hi;
	unsigned pickup_pmg_byte_top;
	unsigned pickup_pmg_byte_middle;
	unsigned pickup_pmg_byte_bottom;
	unsigned pickup_gractl;
	unsigned entity_type[4];
	unsigned entity_state[4];
	unsigned score_lo;
	unsigned score_hi;
	unsigned colbk;
	unsigned colpm0;
	unsigned colpm1;
	unsigned colpm2;
	unsigned colpm3;
	unsigned colpf0;
	unsigned colpf1;
	unsigned colpf2;
	unsigned colpf3;
	unsigned player_fighter_explosion_timer;
	unsigned enemy_explosion_timer;
	unsigned effect_active_mask;
	unsigned effect_active_count;
	unsigned effect_rendered_mask;
	unsigned transient_effect_orphan_cells;
	unsigned transient_effect_first_address;
	unsigned transient_effect_first_code;
	unsigned transient_effect_first_writer_pc;
	unsigned transient_effect_first_writer_x;
	unsigned stale_debris_projectile_restores;
	unsigned transient_effect_coordinate_wraps;
	unsigned interceptor_breakup_request_slot0;
	unsigned interceptor_breakup_request_slot1;
	unsigned raider_character_writes;
	unsigned raider_transient_allocations;
	unsigned raider_slot0_activations;
	unsigned raider_kills_with_emitter_projectile_active;
	unsigned emitter_owned_projectiles_at_kill;
	unsigned emitter_owned_projectiles_removed;
	unsigned foreign_projectiles_preserved;
	unsigned foreign_projectiles_incorrectly_removed;
	unsigned post_kill_emitter_projectile_continuations;
	unsigned emitter_owned_physical_slot0_at_kill;
	unsigned enemy_projectile_stale_cells;
	unsigned rapid_projectiles;
	unsigned player_fighter_projectiles;
	unsigned player_projectile_recycled_checks;
	unsigned player_projectile_stale_cells;
	unsigned player_projectile_orphan_cells;
	unsigned rapid_projectile_slot;
	unsigned rapid_projectile_address;
	unsigned rapid_projectile_screen_code;
	unsigned rapid_projectile_backing;
	unsigned dli_sequence_violations;
	unsigned maximum_dlis_per_host_frame;
	unsigned pause_test_completed;
	unsigned pause_timer_before;
	unsigned pause_timer_after;
	unsigned pause_engine_timer_before;
	unsigned pause_engine_timer_after;
	unsigned pause_engine_phase_before;
	unsigned pause_engine_phase_after;
	unsigned pause_host_frames;
	unsigned pickup_prev_x;
	unsigned pickup_prev_y;
	unsigned pickup_prev_render_row;
	unsigned pickup_prev_render_phase;
	unsigned pickup_render_row;
	unsigned pickup_render_phase;
	unsigned pickup_vscroll;
	unsigned pickup_a2_head;
	unsigned pickup_erase_calls;
	unsigned pickup_draw_calls;
	unsigned pickup_erase_scanline;
	unsigned pickup_erase_cycle;
	unsigned pickup_draw_scanline;
	unsigned pickup_draw_cycle;
	unsigned pickup_old_address[6];
	unsigned pickup_old_backing[6];
	unsigned pickup_old_before_erase[6];
	unsigned pickup_old_after_erase[6];
	unsigned pickup_new_address[6];
	unsigned pickup_new_backing[6];
	unsigned pickup_new_after_draw[6];
	unsigned pickup_glyph_cells_before;
	unsigned pickup_glyph_cells_after;
	unsigned pickup_footprints_before;
	unsigned pickup_footprints_after;
	unsigned pickup_first_overwrite_pc;
	unsigned pickup_first_overwrite_address;
	unsigned pickup_first_overwrite_value;
	unsigned pickup_first_overwrite_scanline;
	unsigned engine_timer;
	unsigned engine_phase;
	unsigned corridor_phase;
	unsigned ring_flags;
	unsigned engine_vscroll;
	unsigned engine_a2_head;
	unsigned engine_allied_cells;
	unsigned engine_enemy_cells;
	unsigned capital_visible_allied_cells;
	unsigned capital_visible_enemy_cells;
	unsigned engine_copy_calls;
	unsigned engine_copy_scanline;
	unsigned engine_copy_cycle;
	unsigned engine_first_write_pc;
	unsigned engine_first_write_address;
	unsigned engine_first_write_old;
	unsigned engine_first_write_new;
	unsigned engine_first_write_scanline;
	unsigned engine_first_write_cycle;
	unsigned engine_charset_hash;
	unsigned engine_displayed_dlist_lo;
	unsigned engine_published_dlist_lo;
	unsigned engine_active_dlist_lo;
	unsigned engine_next_dlist_lo;
	unsigned engine_row0_address;
	unsigned engine_displayed_row0_address;
	unsigned engine_active_row0_address;
	unsigned engine_divider[8];
	unsigned engine_recycled[8];
	unsigned engine_first_dlist_write_pc;
	unsigned engine_first_dlist_write_address;
	unsigned engine_first_dlist_write_old;
	unsigned engine_first_dlist_write_new;
	unsigned engine_first_dlist_write_scanline;
	unsigned engine_first_dlist_write_cycle;
	unsigned engine_first_recycled_write_pc;
	unsigned engine_first_recycled_write_address;
	unsigned engine_first_recycled_write_old;
	unsigned engine_first_recycled_write_new;
	unsigned engine_first_recycled_write_scanline;
	unsigned engine_first_recycled_write_cycle;
	unsigned engine_playfield_select_calls;
	unsigned engine_playfield_select_scanline;
	unsigned engine_playfield_select_cycle;
	unsigned engine_playfield_select_dlist;
	unsigned engine_playfield_select_active_lo;
	unsigned gameplay_generation;
	uint64_t profile_clock[DFTRACE_PROFILE_COUNT];
	uint64_t profile_dli_start[DFTRACE_PROFILE_DLI_COUNT];
	uint64_t profile_dli_end[DFTRACE_PROFILE_DLI_COUNT];
	unsigned profile_dli_segment[DFTRACE_PROFILE_DLI_COUNT];
	unsigned profile_next;
	unsigned profile_dli_count;
	unsigned profile_compose_calls;
	unsigned profile_compose_cycles;
	unsigned profile_pointer_calls;
	unsigned profile_pointer_cycles;
	uint64_t profile_publication_begin;
	uint64_t profile_erase_player_fighter_start;
	uint64_t profile_interceptor_update_start;
	uint64_t profile_interceptor_render_start;
	uint64_t profile_entity_erase_start;
	uint64_t profile_effect_update_end;
	uint64_t profile_pickup_update_end;
	uint64_t profile_pickup_render_start;
	uint64_t profile_effect_render_start;
} DFTraceFrame;

enum {
	DFTRACE_EVENT_WORLD = 1u << 0,
	DFTRACE_EVENT_FAR_ERASE = 1u << 1,
	DFTRACE_EVENT_HULL = 1u << 2,
	DFTRACE_EVENT_BROADSIDE = 1u << 3,
	DFTRACE_EVENT_FIGHTER_EXPLOSION = 1u << 4,
	DFTRACE_EVENT_CAPITAL_EXPLOSION = 1u << 5,
	DFTRACE_EVENT_MUSIC_TICK = 1u << 6,
	DFTRACE_EVENT_ENTITY_SPAWN = 1u << 7,
	DFTRACE_EVENT_ENTITY_CONTACT = 1u << 8,
	DFTRACE_EVENT_ENTITY_DESPAWN = 1u << 9,
	DFTRACE_EVENT_NEAR_STEP = 1u << 10,
	DFTRACE_EVENT_FAR_STEP = 1u << 11,
	DFTRACE_EVENT_ENTITY_SHOT = 1u << 12,
	DFTRACE_EVENT_EFFECT_SPAWN = 1u << 13,
	DFTRACE_EVENT_EFFECT_ERASE = 1u << 14,
	DFTRACE_EVENT_EFFECT_UPDATE = 1u << 15,
	DFTRACE_EVENT_EFFECT_RENDER = 1u << 16,
	DFTRACE_EVENT_INTERCEPTOR_BREAKUP_SPAWN = 1u << 17,
	DFTRACE_EVENT_PICKUP_QUALIFIED_KILL = 1u << 18,
	DFTRACE_EVENT_PICKUP_COLLECT = 1u << 19,
	DFTRACE_EVENT_DIRECTOR_WORLD = 1u << 20,
	DFTRACE_EVENT_DIRECTOR_REQUEST = 1u << 21,
	DFTRACE_EVENT_DIRECTOR_EVENT = 1u << 22
};

static int dftrace_initialised;
static int dftrace_active;
static unsigned dftrace_count;
static unsigned dftrace_limit;
static unsigned dftrace_active_limit;
static unsigned dftrace_fire_delay;
/* Owner decision 2026-09-21, step 1: the discriminator for the
 * director-complete clause. When set, the observer holds PLAYER_LIVES at this
 * value every gameplay frame, so the fighter still dies and respawns but the
 * run never reaches GAME OVER and never restarts the Director. Trace-only and
 * env-gated: zero means off, and no release byte is patched. The precedent is
 * the "restart" policy below, which pokes the same byte in the other
 * direction. */
static unsigned dftrace_hold_player_lives;
static unsigned dftrace_difficulty;
static const char *dftrace_policy;
static const char *dftrace_pmg_lab_screenshot;
static unsigned dftrace_pmg_lab_presentations;
static unsigned dftrace_pmg_lab_screenshot_frame = 0xffffffffu;
static const char *dftrace_session;
static const char *dftrace_output;
static const char *dftrace_interceptor_projectile_output;
static const char *dftrace_sector_clock_output;
static const char *dftrace_player_pairshot_output;
static const char *dftrace_light_output;
static unsigned dftrace_light_base;
/* Light multiplicity step 3 (plan §4.3 [C2]/[C3]). The kernel's five entry
 * vectors, and one counter each for the frame: main.s reaches the kernel only
 * through them, so the vector overhead of a frame is exactly 3 cycles times
 * the sum of these - a `jmp abs` per entry. Counting the entries is what lets
 * the overhead be reported separately at 1, 3 and 4 live Lights instead of
 * folded into the standing cost. */
#define DFTRACE_LIGHT_VECTORS 5u
static unsigned dftrace_light_vector[DFTRACE_LIGHT_VECTORS];
static unsigned dftrace_light_vector_hits[DFTRACE_LIGHT_VECTORS];
/* Diagnostic-only ceiling override (plan §4.3 [C3]): the shipped SWARM ceiling
 * is 3, so a four-Light frame cannot occur naturally and the owner asked for
 * the cost at four. DFTRACE_LIGHT_CEILING names the policy byte's address and
 * DFTRACE_LIGHT_CEILING_VALUE the value to hold it at. It is a POLICY byte,
 * written every tick rather than injected once, and it changes no lifecycle
 * rule - the wave, the pairs and the slots behave exactly as they do at 3. */
static unsigned dftrace_light_ceiling;
static unsigned dftrace_light_ceiling_value;
static unsigned dftrace_light_output_initialised;
static DFTraceFrame *dftrace_frames;
static DFTraceFrame dftrace_current;

#define DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT 5u
#define DFTRACE_PLAYER_GLYPH_FIRST 11u
#define DFTRACE_PLAYER_GLYPH_COUNT 36u
#define DFTRACE_INTERCEPTOR_SLOT_BASE 5u
#define DFTRACE_INTERCEPTOR_SLOT_COUNT 5u
#define DFTRACE_PROJECTILE_SLOT_COUNT 10u
#define DFTRACE_PROJECTILE_ARRAY_STRIDE 10u
#define DFTRACE_INTERCEPTOR_GLYPH_FIRST 0xdau
#define DFTRACE_INTERCEPTOR_GLYPH_LAST 0xe7u /* last published hostile weapon code: BOMBER animation phase, right */

static unsigned dftrace_interceptor_observed_active[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_previous_active[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_previous_x[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_previous_y[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_previous_lifetime[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_last_active_writer[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_watched_address[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_watched_value[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_last_screen_writer[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_interceptor_output_initialised;
static unsigned dftrace_interceptor_first_anomaly;
static unsigned dftrace_sector_clock_output_initialised;
static unsigned dftrace_player_pairshot_output_initialised;
static unsigned dftrace_player_pairshot_before_active[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_before_y[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_before_lifetime[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_active_shadow[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_update_count[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_render_count[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_write_count[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_allocations[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_releases[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_allocation_frame[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_release_frame[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_glyph_writes;
static unsigned dftrace_player_pairshot_glyph_last_writer;
static unsigned dftrace_player_pairshot_selected_code[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_published_code[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_publication_writer[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_player_pairshot_gameplay_chbase_writes;
static unsigned dftrace_player_pairshot_gameplay_chbase_writer;
static unsigned dftrace_player_pairshot_gameplay_chbase_host;
static unsigned dftrace_player_pairshot_hud_chbase_writes;
static unsigned dftrace_player_pairshot_hud_chbase_writer;
static unsigned dftrace_player_pairshot_hud_chbase_host;
static unsigned dftrace_pairshot_recycled_count;
static unsigned dftrace_pairshot_recycled_address[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
static unsigned dftrace_pairshot_recycled_expected[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];

static unsigned dftrace_pc_active;
static unsigned dftrace_pc_end;
static unsigned dftrace_pc_player_shot_sound;
static unsigned dftrace_pc_update_sound;
static unsigned dftrace_pc_profile[DFTRACE_PROFILE_COUNT];
static unsigned dftrace_pc_dli_end;
static unsigned dftrace_pc_dli_hud_end;
static unsigned dftrace_pc_compose_start;
static unsigned dftrace_pc_compose_end;
static unsigned dftrace_pc_pointer_start;
static unsigned dftrace_pc_pointer_end;
static unsigned dftrace_pc_publication_begin;
static unsigned dftrace_pc_erase_slot;
static unsigned dftrace_pc_projectile_restore;
static unsigned dftrace_pc_projectile_update_start;
static unsigned dftrace_pc_interceptor_update_start;
static unsigned dftrace_pc_render_slot;
static unsigned dftrace_pc_render_end;
static unsigned dftrace_pc_claim_projectile;
static unsigned dftrace_pc_entity_erase_start;
static unsigned dftrace_pc_effect_update_end;
static unsigned dftrace_pc_pickup_update_end;
static uint64_t dftrace_compose_start_clock;
static uint64_t dftrace_pointer_start_clock;
static unsigned dftrace_pc_frontend_poll;
static unsigned dftrace_pc_dli;
static unsigned dftrace_pc_world;
static unsigned dftrace_pc_near;
static unsigned dftrace_pc_far_erase;
static unsigned dftrace_pc_far_step;
static unsigned dftrace_pc_hull;
static unsigned dftrace_pc_broadside;
static unsigned dftrace_pc_fighter_explosion;
static unsigned dftrace_pc_capital_explosion;
static unsigned dftrace_pc_music_tick;
static unsigned dftrace_pc_entity_spawn;
static unsigned dftrace_pc_entity_contact;
static unsigned dftrace_pc_entity_despawn;
static unsigned dftrace_pc_entity_shot;
static unsigned dftrace_pc_effect_spawn;
static unsigned dftrace_pc_effect_erase;
static unsigned dftrace_pc_effect_update;
static unsigned dftrace_pc_effect_render;
static unsigned dftrace_pc_interceptor_breakup_request;
static unsigned dftrace_pc_interceptor_breakup_spawn;
static unsigned dftrace_pc_emitter_cleanup;
static unsigned dftrace_pc_emitter_cleanup_end;
static unsigned dftrace_pc_pickup_qualified_kill;
static unsigned dftrace_pc_pickup_collect;
static unsigned dftrace_pc_director_world;
static unsigned dftrace_pc_director_request;
static unsigned dftrace_pc_director_event;
static unsigned dftrace_pc_entity_erase;
static unsigned dftrace_pc_after_entity_erase;
static unsigned dftrace_pc_entity_draw;
static unsigned dftrace_pc_player_erase;
static unsigned dftrace_pc_player_draw;
static unsigned dftrace_pc_engine_update;
static unsigned dftrace_pc_engine_copy;
static unsigned dftrace_pc_capital_collision;
static unsigned dftrace_pc_capital_player_damage;
static unsigned dftrace_pc_capital_player_aabb_hit;
static unsigned dftrace_pc_capital_player_aabb_miss;
static unsigned dftrace_pc_broad_erase_begin;
static unsigned dftrace_pc_broad_erase_restored;
static unsigned dftrace_pc_broad_erase_end;
static unsigned dftrace_pc_broad_draw_begin;
static unsigned dftrace_pc_broad_backing_captured;
static unsigned dftrace_pc_broad_draw_end;
static unsigned dftrace_pc_broad_impact;
static unsigned dftrace_pc_gameplay_init;
static unsigned dftrace_pc_dlist_publish;
static unsigned dftrace_pc_rotate_start;
static unsigned dftrace_pc_rotate_end;
static unsigned dftrace_pc_near_erase;
static unsigned dftrace_pc_near_render;
static unsigned dftrace_dli_phase;

static unsigned dftrace_player_x;
static unsigned dftrace_player_y;
static unsigned dftrace_projectile_active;
static unsigned dftrace_projectile_x;
static unsigned dftrace_projectile_y;
static unsigned dftrace_projectile_lifetime;
static unsigned dftrace_projectile_rendered;
static unsigned dftrace_projectile_screen_lo;
static unsigned dftrace_projectile_screen_hi;
static unsigned dftrace_projectile_backing_top;
static unsigned dftrace_broad_state;
static unsigned dftrace_broad_schedule_timer;
static unsigned dftrace_broad_schedule_index;
static unsigned dftrace_broad_visible_scrolls;
static unsigned dftrace_broad_turret_fired;
static unsigned dftrace_corridor_phase;
static unsigned dftrace_corridor_phase_hi;
static unsigned dftrace_loader_repeat_value;
static unsigned dftrace_capital_drain_rows;
static int dftrace_broadside_proof_admitted;
static int dftrace_broadside_proof_sector_started;
static unsigned dftrace_far_active;
static unsigned dftrace_enemy_active;
static unsigned dftrace_enemy_x;
static unsigned dftrace_enemy_member_state;
static unsigned dftrace_enemy_hp;
static unsigned dftrace_enemy_live_count;
static unsigned dftrace_fighter_explosion_timer;
static unsigned dftrace_capital_explosion_timer;
static unsigned dftrace_music_active;
static unsigned dftrace_fire_timer;
static unsigned dftrace_player_burst_state;
static unsigned dftrace_hit_timer;
static unsigned dftrace_capital_sound_timer;
static unsigned dftrace_sound_enabled;
static unsigned dftrace_player_lifecycle;
static unsigned dftrace_sector_state;
static unsigned dftrace_game_state;
static unsigned dftrace_frontend_selection;
static unsigned dftrace_frontend_input_armed;
static unsigned dftrace_difficulty_setting;
static unsigned dftrace_gameplay_frame;
static unsigned dftrace_active_gameplay_frame_lo;
static unsigned dftrace_enemy_y;
static unsigned dftrace_director_state;
static unsigned dftrace_muzzle_screen_hi;
static unsigned dftrace_muzzle_screen_lo;
static unsigned dftrace_muzzle_row_domain;
static unsigned dftrace_muzzle_visible_row;
static unsigned dftrace_broad_turret;
static unsigned dftrace_broad_row_lo;
static unsigned dftrace_broad_row_hi;
static unsigned dftrace_broad_flash_timer;
static unsigned dftrace_playfield_broad_row;
static unsigned dftrace_broad_raster_top;
static FILE *dftrace_broad_compositor_file;
static unsigned dftrace_entity_active_count;
static unsigned dftrace_entity_x;
static unsigned dftrace_entity_y;
static unsigned dftrace_entity_vx;
static unsigned dftrace_entity_vy;
static unsigned dftrace_entity_move_accumulator;
static unsigned dftrace_entity_vertical_accumulator;
static unsigned dftrace_entity_render_id;
static unsigned dftrace_entity_active_mask;
static unsigned dftrace_entity_type;
static unsigned dftrace_entity_state;
static unsigned dftrace_entity_hp;
static unsigned dftrace_entity_timer;
static unsigned dftrace_entity_owner;
static unsigned dftrace_entity_drawn_mask;
static unsigned dftrace_entity_screen_lo;
static unsigned dftrace_entity_screen_hi;
static unsigned dftrace_entity_backing0;
static unsigned dftrace_entity_backing1;
static unsigned dftrace_entity_backing2;
static unsigned dftrace_entity_backing3;
static unsigned dftrace_playfield_row_lo;
static unsigned dftrace_playfield_row_hi;
static unsigned dftrace_score_lo;
static unsigned dftrace_score_hi;
static unsigned dftrace_effect_active_mask;
static unsigned dftrace_effect_active_count;
static unsigned dftrace_effect_rendered_mask;
static unsigned dftrace_effect_y;
static unsigned dftrace_effect_screen_lo;
static unsigned dftrace_effect_screen_hi;
static unsigned dftrace_enemy_target_slot;
static unsigned dftrace_previous_effect_active_mask;
static unsigned dftrace_previous_effect_y[5];
static unsigned dftrace_raider_effect_generation_active;
static unsigned dftrace_raider_slot0_seen;
static unsigned dftrace_emitter_cleanup_same[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_emitter_cleanup_foreign[DFTRACE_INTERCEPTOR_SLOT_COUNT];
static unsigned dftrace_engine_timer;
static unsigned dftrace_engine_phase;
static unsigned dftrace_corridor_phase;
static unsigned dftrace_ring_flags;
static unsigned dftrace_active_dlist_lo;
static unsigned dftrace_next_dlist_lo;
static unsigned dftrace_near_row;
static unsigned dftrace_near_column;
static unsigned dftrace_near_screen_lo;
static unsigned dftrace_near_screen_hi;
static unsigned dftrace_dst_ptr;
static FILE *dftrace_near_file;
static unsigned dftrace_near_host_frame = 0xffffffffu;
static unsigned dftrace_near_fetch_logged[DFTRACE_NEAR_COUNT];
static unsigned dftrace_near_force_address;
static unsigned dftrace_near_mode;
static const char *dftrace_engine_screenshot_prefix;
static unsigned dftrace_engine_screenshot_count;
static unsigned dftrace_engine_screenshot_generation;
static unsigned dftrace_engine_screenshot_limit;
static unsigned dftrace_gameplay_generation;
static unsigned dftrace_pairshot_reentry_cycles;
static unsigned dftrace_pairshot_reentry_open_frame;
static unsigned dftrace_pairshot_reentry_prior_sector;
static int dftrace_pairshot_reentry_initialised;
static int dftrace_restart_game_over_seeded;
static unsigned dftrace_previous_pc;
static unsigned dftrace_pmg_last_writer[256];
/* Last producer of every P1/P2 body byte, so a stale-body gate failure names
 * the instruction that left the row behind instead of only the row. */
static unsigned dftrace_enemy_pmg_last_writer[2][256];
static unsigned dftrace_enemy_archetype;
static unsigned dftrace_enemy_body_data;
static unsigned dftrace_enemy_frame_heights;
static unsigned dftrace_character_last_writer[65536];
static unsigned dftrace_character_last_writer_x[65536];
static const char *dftrace_first_writer_output;
static FILE *dftrace_first_writer_file;
static unsigned char dftrace_first_writer_shadow[65536];
static unsigned dftrace_first_writer_old[65536];
static unsigned dftrace_first_writer_new[65536];
static unsigned dftrace_first_writer_pc[65536];
static unsigned dftrace_first_writer_frame[65536];
static uint64_t dftrace_first_writer_clock[65536];
static unsigned dftrace_first_writer_scanline[65536];
static unsigned dftrace_first_writer_cycle[65536];
static uint64_t dftrace_clock(void);
static unsigned dftrace_engine_previous[16];
static int dftrace_engine_previous_valid;
static unsigned dftrace_frontend_delay;
static unsigned dftrace_published_dlist_lo;
static unsigned dftrace_displayed_dlist_lo;
static unsigned dftrace_display_host_frame = 0xffffffffu;
static unsigned dftrace_display_list_previous[75];
static int dftrace_display_list_previous_valid;
static unsigned dftrace_recycled_previous[40];
static int dftrace_recycled_previous_valid;
static const char *dftrace_pickup_screenshot;
static unsigned dftrace_pickup_screenshot_frame = 0xffffffffu;
static unsigned dftrace_pickup_visible_passes;
/* The live drawn state of the capsule: sixteen non-empty missile rows whose
 * union covers the whole M0-M3 quartet, measured on the completed raster. */
static int dftrace_pickup_missile_complete;
static const char *dftrace_pickup_sequence_prefix;
static unsigned dftrace_pickup_sequence_count;
static unsigned dftrace_pickup_sequence_primed;
static const char *dftrace_pickup_traversal_prefix;
static unsigned dftrace_pickup_traversal_count;
static unsigned dftrace_pickup_traversal_last_y = 0xffffffffu;
static unsigned dftrace_pickup_hunt_active_frames;
static unsigned dftrace_raider_observed_live_count;
static unsigned dftrace_raider_resume_fire_frame;
static unsigned dftrace_raider_fired_live_count;
static const char *dftrace_pickup_contact_prefix;
static unsigned dftrace_pickup_contact_count;
static unsigned dftrace_pickup_contact_after_collect;
static const char *dftrace_muzzle_screenshot_prefix;
static unsigned dftrace_muzzle_screenshot_count;
static int dftrace_muzzle_screenshot_primed;
static const char *dftrace_capital_contact_prefix;
static unsigned dftrace_capital_contact_owner;
static unsigned dftrace_capital_contact_mode;
static unsigned dftrace_capital_contact_count;
static int dftrace_capital_contact_primed;
static const char *dftrace_rapid_screenshot;
static unsigned dftrace_rapid_screenshot_frame = 0xffffffffu;
static const char *dftrace_spread_screenshot;
static unsigned dftrace_spread_screenshot_frame = 0xffffffffu;
static int dftrace_dli_integrity_enabled;
static unsigned dftrace_dli_integrity_host_frame = 0xffffffffu;
static unsigned dftrace_dli_integrity_count;
static int dftrace_dli_integrity_complete_frame_seen;
static unsigned dftrace_dli_sequence_violations;
static unsigned dftrace_maximum_dlis_per_host_frame;
static int dftrace_pause_test_enabled;
static unsigned dftrace_pause_stage;
static unsigned dftrace_pause_press_host;
static unsigned dftrace_pause_enter_host = 0xffffffffu;
static unsigned dftrace_pause_timer_before;
static unsigned dftrace_pause_timer_after;
static unsigned dftrace_pause_engine_timer_before;
static unsigned dftrace_pause_engine_timer_after;
static unsigned dftrace_pause_engine_phase_before;
static unsigned dftrace_pause_engine_phase_after;
static unsigned dftrace_pause_host_frames;
static unsigned dftrace_pause_test_completed;

typedef struct {
	unsigned valid;
	unsigned left;
	unsigned right;
	unsigned top;
	unsigned bottom;
	unsigned dma_top;
	unsigned dma_bottom;
	unsigned physical_pointer;
	unsigned display_list;
	unsigned display_instruction;
	unsigned screen_column;
	unsigned code_left;
	unsigned code_right;
	unsigned glyph_first_row;
	unsigned glyph_last_row;
	unsigned cache_top;
} DFTracePhysicalBounds;

static DFTracePhysicalBounds dftrace_last_player_physical;
static DFTracePhysicalBounds dftrace_last_bolt_physical[3];
static unsigned dftrace_last_physical_frame[3];

typedef struct {
	unsigned frame;
	unsigned pc;
	int scanline;
	int cycle;
	unsigned loader_timer;
	unsigned game_state;
	unsigned dlist;
	unsigned charset_address;
	unsigned pm_base;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned vdslst;
	/* OS-owned top-of-window state. The game takes the display over
	 * completely, so these have never mattered to the gate; they are captured
	 * because the $A000-$BFFF window is about to carry level data and the OS
	 * VBI restores the display-list pointer from SDLSTL/SDLSTH during SIO.
	 * SDLSTL/SDLSTH ($0230) say where the OS display list is, MEMTOP ($02E5)
	 * the OS's last free RAM byte below its screen, RAMTOP ($6A) the page
	 * above which the OS considers memory its own. Together they bound the
	 * usable top of the window. */
	unsigned sdlst;
	unsigned memtop;
	unsigned ramtop;
	unsigned runad;
	unsigned initad;
	unsigned dosvec;
	unsigned screen_checksum;
	unsigned frontend_dlist_checksum;
	unsigned loader_dli_count;
	/* Owner decision B (2026-09-20): the first sixteen bytes of the RAM under
	 * the BASIC ROM, where the inert BASIC_WINDOW probe record lands. Captured
	 * raw rather than checksummed so that a wrong value is readable: if the ROM
	 * were still mapped these would be the BASIC cartridge's own bytes. */
	UBYTE window[16];
	/* Roadmap 4.3: the level image the reader is supposed to have put at
	 * LEVEL_BUFFER. The header is captured raw so a wrong value is readable,
	 * and the checksum covers the whole image so the gate can compare it
	 * against build/level-1.bin byte for byte rather than inferring the read
	 * happened from a frame delta. */
	UBYTE level_header[8];
	unsigned level_checksum;
	unsigned portb;
	/* ADR-003 boot splash (2026-09-22). The blob is copied to $0500-$06FF by
	 * both stage-2 entries, before the first SIO read on the ATR and before
	 * `jmp start` on the XEX, and nothing may write there until the hold ends.
	 * Checksumming the range at `start` and at both loader milestones is the
	 * intactness proof: the chunk load and the resident unpack sit between
	 * them. */
	unsigned splash_checksum;
} DFBootSnapshot;

static int dfboot_initialised;
static FILE *dfboot_file;
static const char *dfboot_artifact;
static const char *dfboot_screenshot_prefix;
static unsigned dfboot_fill;
static unsigned dfboot_last_frame = 0xffffffffu;
static unsigned dfboot_seen_start = 0xffffffffu;
static unsigned dfboot_seen_loader = 0xffffffffu;
static unsigned dfboot_seen_menu = 0xffffffffu;
static unsigned dfboot_seen_frontend = 0xffffffffu;
static unsigned dfboot_seen_gameplay = 0xffffffffu;
static unsigned dfboot_seen_main = 0xffffffffu;
static unsigned dfboot_pc_start;
static unsigned dfboot_pc_loader;
static unsigned dfboot_pc_menu;
static unsigned dfboot_pc_frontend;
static unsigned dfboot_pc_gameplay;
static unsigned dfboot_pc_main;
static unsigned dfboot_loader_timer;
static unsigned dfboot_game_state;
static unsigned dfboot_main_menu_dlist;
static unsigned dfboot_frontend_dlist_end;
static unsigned dfboot_window_address;
/* Roadmap 4.3 SIO observation. The counters are driven off the reader's own
 * PCs rather than off bus traffic: the observer sees one instruction at a
 * time, and a PC hit at a known label is exactly as good a signal while
 * costing nothing. */
static unsigned dfboot_level_address;
static unsigned dfboot_level_bytes;
static unsigned dfboot_pc_sio_frame;
static unsigned dfboot_pc_sio_retry;
static unsigned dfboot_pc_level_load;
static unsigned dfboot_sio_command_frames;
static unsigned dfboot_sio_wire_retries;
static unsigned dfboot_level_load_begin = 0xffffffffu;
static unsigned dfboot_level_load_end = 0xffffffffu;
/* Boot-smoke observation horizon. Owner decision 22 re-bases the ATR menu
 * deadline on a 60-second budget (3,000 PAL frames), so the session must stay
 * alive past that ceiling for a slow-but-legal boot to be observable at all.
 * The menu proof snapshot therefore sits just above the ceiling, FIRE is
 * pressed after it, and the gameplay proof snapshot keeps the same 250-frame
 * handoff window the frame-500/750 pair used to provide. */
#define DFBOOT_MENU_FRAME 3050u
#define DFBOOT_GAMEPLAY_FRAME 3300u
/* Loader-raster observation, re-based 2026-09-20 in the shape of owner
 * decision 22. The old fixed pair (frames 250 and 300) was a second constant
 * that silently tracked the transport: the loader raster comes up at
 * `start + stage-2 decode`, so every added sector moves it later, and the
 * frame-300 checkpoint sat 3 frames above the measured ATR loader milestone
 * (297) with no margin left. The two observation points are now taken
 * relative to the measured `loader` milestone, so they are inside the
 * LOADER_DURATION_FRAMES = 250 hold window by construction and never need
 * re-pinning. This is a STATE proof, not a deadline — the load-time budget it
 * used to carry by accident now lives in the explicit loader ceiling/baseline
 * gate in scripts/runtime-wall-trace.mjs.
 * OFFSET is 3 because the loader countdown is armed 2 frames after the
 * `show_loader` milestone on both media (measured: XEX loader 135, timer 250
 * at frame 137; ATR loader 297, timer 249 at frame 300). SPAN keeps the
 * 50-frame countdown-advance gap the frame-250/300 pair provided; both stay
 * far below the 250-frame hold. */
#define DFBOOT_LOADER_OBSERVE_OFFSET 3u
#define DFBOOT_LOADER_OBSERVE_SPAN 50u

/* ADR-003 boot splash observations. The DLI-entry log samples POKEY and the
 * playfield twice per hold frame, at the two scanlines the display list marks:
 * the first entry of a frame still holds the title zone, the second the ship
 * zone the first DLI wrote. Two entries per frame also land in two different
 * bit cells, which is what makes per-bit switching observable natively. */
#define DFBOOT_SPLASH_DLI_LOG 520u
typedef struct {
	unsigned frame;
	int scanline;
	UBYTE audf1;
	UBYTE audc1;
	UBYTE colpf1;
	UBYTE colpf2;
	UBYTE colbk;
} DFBootSplashDli;
static unsigned dfboot_splash_address;
static unsigned dfboot_splash_bytes;
/* The blob's tables and code. The variables below them are the hold's own
 * state and change every frame, so only this part can be compared across the
 * chunk load and the resident unpack. */
static unsigned dfboot_splash_code_address;
static unsigned dfboot_splash_code_bytes;
static unsigned dfboot_splash_checksum_start = 0xffffffffu;
/* AUDC1 at the instant the splash teardown has blanked the display and the
 * frontend has not yet run. The plan's original observation point was the first
 * frontend frame, but music v2 gives the menu theme POKEY channel 1 within that
 * same frame, so the teardown itself is where "the deck is cut" is observable.
 * The frontend value is still reported, as an observation rather than a gate. */
static unsigned dfboot_teardown_audc1 = 0xffffffffu;
static unsigned dfboot_first_frontend_audc1 = 0xffffffffu;
static unsigned dfboot_splash_dli_count;
static DFBootSplashDli dfboot_splash_dli[DFBOOT_SPLASH_DLI_LOG];

static unsigned dfboot_snapshots_count;
static unsigned dfboot_loader_dli_count;
static uint64_t dfboot_same_frame_instructions;
static unsigned dfboot_instruction_frame = 0xffffffffu;
static DFBootSnapshot dfboot_snapshots[5];
static unsigned dfboot_trace_pc[64];
static unsigned dfboot_trace_a[64];
static unsigned dfboot_trace_x[64];
static unsigned dfboot_trace_y[64];
static unsigned dfboot_trace_s[64];
static unsigned dfboot_trace_head;

static unsigned dfboot_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "voidstrike65 boot smoke: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "voidstrike65 boot smoke: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static unsigned dfboot_word(unsigned address)
{
	return MEMORY_mem[address] | ((unsigned) MEMORY_mem[address + 1u] << 8);
}

static unsigned dfboot_checksum(unsigned address, unsigned length)
{
	unsigned index;
	unsigned value = 0;
	for (index = 0; index < length; ++index)
		value = value * 33u + MEMORY_mem[(address + index) & 0xffffu];
	return value;
}

static int dfboot_target_frame(unsigned frame)
{
	if (dfboot_seen_loader != 0xffffffffu &&
		(frame == dfboot_seen_loader + DFBOOT_LOADER_OBSERVE_OFFSET ||
		frame == dfboot_seen_loader + DFBOOT_LOADER_OBSERVE_OFFSET +
			DFBOOT_LOADER_OBSERVE_SPAN))
		return 1;
	return frame == 1u ||
		frame == DFBOOT_MENU_FRAME || frame == DFBOOT_GAMEPLAY_FRAME;
}

static void dfboot_capture(unsigned frame, unsigned pc)
{
	DFBootSnapshot *snapshot;
	unsigned index_window;
	char screenshot[FILENAME_MAX];
	if (dfboot_snapshots_count >= 5u) {
		fprintf(stderr, "voidstrike65 boot smoke: too many target frames\n");
		exit(2);
	}
	snapshot = &dfboot_snapshots[dfboot_snapshots_count++];
	memset(snapshot, 0, sizeof(*snapshot));
	snapshot->frame = frame;
	snapshot->pc = pc;
	snapshot->scanline = ANTIC_ypos;
	snapshot->cycle = ANTIC_XPOS;
	snapshot->loader_timer = MEMORY_mem[dfboot_loader_timer];
	snapshot->game_state = MEMORY_mem[dfboot_game_state];
	snapshot->dlist = ANTIC_dlist;
	snapshot->charset_address = (unsigned) ANTIC_CHBASE << 8;
	snapshot->pm_base = (unsigned) ANTIC_PMBASE << 8;
	snapshot->dma_ctl = ANTIC_DMACTL;
	snapshot->nmi_en = ANTIC_NMIEN;
	snapshot->vdslst = dfboot_word(0x0200u);
	snapshot->sdlst = dfboot_word(0x0230u);
	snapshot->memtop = dfboot_word(0x02e5u);
	snapshot->ramtop = MEMORY_mem[0x006au];
	snapshot->runad = dfboot_word(0x02e0u);
	snapshot->initad = dfboot_word(0x02e2u);
	snapshot->dosvec = dfboot_word(0x000au);
	snapshot->screen_checksum = dfboot_checksum(0x4000u, 0x0400u);
	snapshot->frontend_dlist_checksum = dfboot_checksum(dfboot_main_menu_dlist,
		dfboot_frontend_dlist_end - dfboot_main_menu_dlist);
	snapshot->loader_dli_count = dfboot_loader_dli_count;
	for (index_window = 0; index_window < 16u; ++index_window)
		snapshot->window[index_window] =
			MEMORY_mem[(dfboot_window_address + index_window) & 0xffffu];
	for (index_window = 0; index_window < 8u; ++index_window)
		snapshot->level_header[index_window] =
			MEMORY_mem[(dfboot_level_address + index_window) & 0xffffu];
	snapshot->level_checksum = dfboot_checksum(dfboot_level_address, dfboot_level_bytes);
	snapshot->splash_checksum =
		dfboot_checksum(dfboot_splash_code_address, dfboot_splash_code_bytes);
	snapshot->portb = PIA_PORTB;
	if (dfboot_screenshot_prefix != NULL && *dfboot_screenshot_prefix != '\0') {
		snprintf(screenshot, sizeof(screenshot), "%s-frame%03u.png",
			dfboot_screenshot_prefix, frame);
		if (!Screen_SaveScreenshot(screenshot, 0)) {
			fprintf(stderr, "voidstrike65 boot smoke: screenshot failed: %s\n", screenshot);
			exit(2);
		}
	}
}

static void dfboot_write(void)
{
	unsigned index;
	fprintf(dfboot_file,
		"{\n  \"artifact\": \"%s\",\n  \"cold_ram_fill\": %u,\n  \"snapshots\": [\n",
		dfboot_artifact, dfboot_fill);
	for (index = 0; index < dfboot_snapshots_count; ++index) {
		DFBootSnapshot *snapshot = &dfboot_snapshots[index];
		fprintf(dfboot_file,
			"    {\"frame\":%u,\"pc\":%u,\"scanline\":%d,\"cycle\":%d,"
			"\"loader_timer\":%u,\"game_state\":%u,\"dlist\":%u,"
			"\"charset_address\":%u,\"pm_base\":%u,\"dma_ctl\":%u,"
			"\"nmi_en\":%u,\"vdslst\":%u,\"sdlst\":%u,\"memtop\":%u,"
			"\"ramtop\":%u,\"runad\":%u,\"initad\":%u,"
			"\"dosvec\":%u,\"screen_checksum\":%u,"
			"\"frontend_dlist_checksum\":%u,\"loader_dli_count\":%u,"
			"\"portb\":%u,\"window\":\"%02x%02x%02x%02x%02x%02x%02x%02x"
			"%02x%02x%02x%02x%02x%02x%02x%02x\","
			"\"level_header\":\"%02x%02x%02x%02x%02x%02x%02x%02x\","
			"\"level_checksum\":%u,\"splash_checksum\":%u}%s\n",
			snapshot->frame, snapshot->pc, snapshot->scanline, snapshot->cycle,
			snapshot->loader_timer, snapshot->game_state, snapshot->dlist,
			snapshot->charset_address, snapshot->pm_base, snapshot->dma_ctl,
			snapshot->nmi_en, snapshot->vdslst, snapshot->sdlst, snapshot->memtop,
			snapshot->ramtop, snapshot->runad, snapshot->initad,
			snapshot->dosvec, snapshot->screen_checksum,
			snapshot->frontend_dlist_checksum, snapshot->loader_dli_count,
			snapshot->portb,
			snapshot->window[0], snapshot->window[1], snapshot->window[2],
			snapshot->window[3], snapshot->window[4], snapshot->window[5],
			snapshot->window[6], snapshot->window[7], snapshot->window[8],
			snapshot->window[9], snapshot->window[10], snapshot->window[11],
			snapshot->window[12], snapshot->window[13], snapshot->window[14],
			snapshot->window[15],
			snapshot->level_header[0], snapshot->level_header[1],
			snapshot->level_header[2], snapshot->level_header[3],
			snapshot->level_header[4], snapshot->level_header[5],
			snapshot->level_header[6], snapshot->level_header[7],
			snapshot->level_checksum, snapshot->splash_checksum,
			index + 1u == dfboot_snapshots_count ? "" : ",");
	}
	fprintf(dfboot_file,
		"  ],\n  \"sio\": {\"command_frames\":%u,\"wire_retries\":%u,"
		"\"level_load_begin\":%d,\"level_load_end\":%d},\n",
		dfboot_sio_command_frames, dfboot_sio_wire_retries,
		dfboot_level_load_begin == 0xffffffffu ? -1 : (int) dfboot_level_load_begin,
		dfboot_level_load_end == 0xffffffffu ? -1 : (int) dfboot_level_load_end);
	fprintf(dfboot_file, "  \"splash\": {\"address\":%u,\"bytes\":%u,"
		"\"code_address\":%u,\"code_bytes\":%u,"
		"\"checksum_at_start\":%u,\"teardown_audc1\":%d,"
		"\"first_frontend_audc1\":%d,\"dli\": [",
		dfboot_splash_address, dfboot_splash_bytes,
		dfboot_splash_code_address, dfboot_splash_code_bytes,
		dfboot_splash_checksum_start,
		dfboot_teardown_audc1 == 0xffffffffu ? -1 : (int) dfboot_teardown_audc1,
		dfboot_first_frontend_audc1 == 0xffffffffu ? -1 :
			(int) dfboot_first_frontend_audc1);
	for (index = 0; index < dfboot_splash_dli_count; ++index) {
		DFBootSplashDli *entry = &dfboot_splash_dli[index];
		fprintf(dfboot_file, "%s[%u,%d,%u,%u,%u,%u,%u]", index == 0u ? "" : ",",
			entry->frame, entry->scanline, entry->audf1, entry->audc1,
			entry->colpf1, entry->colpf2, entry->colbk);
	}
	fprintf(dfboot_file, "]},\n");
	fprintf(dfboot_file,
		"  \"milestones\": {\"start\":%u,\"loader\":%u,\"menu\":%u,"
		"\"frontend_poll\":%u,\"gameplay_init\":%u,\"main_loop\":%u}\n}\n",
		dfboot_seen_start, dfboot_seen_loader, dfboot_seen_menu,
		dfboot_seen_frontend, dfboot_seen_gameplay, dfboot_seen_main);
	if (fclose(dfboot_file) != 0) {
		perror("voidstrike65 boot smoke close");
		exit(2);
	}
}

static void dfboot_init(void)
{
	unsigned address;
	dfboot_artifact = getenv("DFBOOT_ARTIFACT");
	dfboot_screenshot_prefix = getenv("DFBOOT_SCREENSHOT_PREFIX");
	if (dfboot_artifact == NULL || *dfboot_artifact == '\0') {
		fprintf(stderr, "voidstrike65 boot smoke: missing DFBOOT_ARTIFACT\n");
		exit(2);
	}
	dfboot_file = fopen(getenv("DFBOOT_OUTPUT"), "w");
	if (dfboot_file == NULL) {
		perror("voidstrike65 boot smoke output");
		exit(2);
	}
	dfboot_fill = dfboot_env_u("DFBOOT_RAM_FILL");
	if (dfboot_fill > 0xffu) {
		fprintf(stderr, "voidstrike65 boot smoke: RAM fill exceeds one byte\n");
		exit(2);
	}
	for (address = 0x8000u; address < 0xa000u; ++address)
		MEMORY_mem[address] = (UBYTE) dfboot_fill;
	dfboot_pc_start = dfboot_env_u("DFBOOT_PC_START");
	dfboot_pc_loader = dfboot_env_u("DFBOOT_PC_LOADER");
	dfboot_pc_menu = dfboot_env_u("DFBOOT_PC_MENU");
	dfboot_pc_frontend = dfboot_env_u("DFBOOT_PC_FRONTEND");
	dfboot_pc_gameplay = dfboot_env_u("DFBOOT_PC_GAMEPLAY");
	dfboot_pc_main = dfboot_env_u("DFBOOT_PC_MAIN");
	dfboot_loader_timer = dfboot_env_u("DFBOOT_LOADER_TIMER");
	dfboot_splash_address = dfboot_env_u("DFBOOT_SPLASH_ADDRESS");
	dfboot_splash_bytes = dfboot_env_u("DFBOOT_SPLASH_BYTES");
	dfboot_splash_code_address = dfboot_env_u("DFBOOT_SPLASH_CODE_ADDRESS");
	dfboot_splash_code_bytes = dfboot_env_u("DFBOOT_SPLASH_CODE_BYTES");
	dfboot_game_state = dfboot_env_u("DFBOOT_GAME_STATE");
	dfboot_main_menu_dlist = dfboot_env_u("DFBOOT_MAIN_MENU_DLIST");
	dfboot_frontend_dlist_end = dfboot_env_u("DFBOOT_FRONTEND_DLIST_END");
	dfboot_window_address = dfboot_env_u("DFBOOT_WINDOW_ADDRESS");
	dfboot_level_address = dfboot_env_u("DFBOOT_LEVEL_ADDRESS");
	dfboot_level_bytes = dfboot_env_u("DFBOOT_LEVEL_BYTES");
	dfboot_pc_sio_frame = dfboot_env_u("DFBOOT_PC_SIO_FRAME");
	dfboot_pc_sio_retry = dfboot_env_u("DFBOOT_PC_SIO_RETRY");
	dfboot_pc_level_load = dfboot_env_u("DFBOOT_PC_LEVEL_LOAD");
	dfboot_initialised = 1;
}

static void dfboot_observe(unsigned pc, unsigned a_register, unsigned x_register,
	unsigned y_register, unsigned s_register)
{
	unsigned frame;
	unsigned fire_start;
	unsigned trace_index;
	if (!dfboot_initialised)
		dfboot_init();
	frame = (unsigned) Atari800_nframes;
	dfboot_trace_pc[dfboot_trace_head & 63u] = pc;
	dfboot_trace_a[dfboot_trace_head & 63u] = a_register;
	dfboot_trace_x[dfboot_trace_head & 63u] = x_register;
	dfboot_trace_y[dfboot_trace_head & 63u] = y_register;
	dfboot_trace_s[dfboot_trace_head & 63u] = s_register;
	++dfboot_trace_head;
	/* Roadmap 4.3 SIO counters. One hit at begin_receive is one command frame
	 * that reached the wire; one hit at settle is one wire-class retry. The
	 * load window is the reader's own entry to the frame gameplay starts. */
	if (pc == dfboot_pc_sio_frame)
		++dfboot_sio_command_frames;
	if (pc == dfboot_pc_sio_retry)
		++dfboot_sio_wire_retries;
	if (pc == dfboot_pc_level_load && dfboot_level_load_begin == 0xffffffffu)
		dfboot_level_load_begin = frame;
	if (frame > 500u && MEMORY_mem[pc] == 0x00u) {
		fprintf(stderr, "voidstrike65 boot smoke: unexpected BRK frame=%u pc=$%04x "
			"state=%u glue=%02x,%02x,%02x,%02x,%02x,%02x,%02x,%02x\n", frame, pc,
			MEMORY_mem[dfboot_game_state], MEMORY_mem[0x4fe8u], MEMORY_mem[0x4febu],
			MEMORY_mem[0x4feeu], MEMORY_mem[0x4ff1u], MEMORY_mem[0x4ff3u],
			MEMORY_mem[0x4ff6u], MEMORY_mem[0x4ff8u], MEMORY_mem[0x4ff9u]);
		fprintf(stderr, "last instructions (oldest first):\n");
		for (trace_index = 0u; trace_index < 64u; ++trace_index) {
			unsigned slot = (dfboot_trace_head + trace_index) & 63u;
			fprintf(stderr, "$%04x op=%02x a=%02x x=%02x y=%02x s=%02x\n",
				dfboot_trace_pc[slot], MEMORY_mem[dfboot_trace_pc[slot]],
				dfboot_trace_a[slot], dfboot_trace_x[slot], dfboot_trace_y[slot],
				dfboot_trace_s[slot]);
		}
		fprintf(stderr, "stack $01f0-$01ff:");
		for (trace_index = 0u; trace_index < 16u; ++trace_index)
			fprintf(stderr, " %02x", MEMORY_mem[0x01f0u + trace_index]);
		fprintf(stderr, "\nextension $8d8e-$8d9d:");
		for (trace_index = 0u; trace_index < 16u; ++trace_index)
			fprintf(stderr, " %02x", MEMORY_mem[0x8d8eu + trace_index]);
		fprintf(stderr, "\n");
		exit(98);
	}
	if (frame != dfboot_instruction_frame) {
		dfboot_instruction_frame = frame;
		dfboot_same_frame_instructions = 0u;
	}
	else if (++dfboot_same_frame_instructions == 20000000u) {
		fprintf(stderr, "voidstrike65 boot smoke: stalled at frame %u pc=$%04x state=%u "
			"module=%02x,%02x,%02x,%02x\n", frame, pc,
			MEMORY_mem[dfboot_game_state], MEMORY_mem[0x8ebeu], MEMORY_mem[0x8ebfu],
			MEMORY_mem[0x8e63u], MEMORY_mem[0x8e64u]);
		exit(2);
	}
	if (MEMORY_mem[dfboot_game_state] == 0u && pc == dfboot_word(0x0200u)) {
		++dfboot_loader_dli_count;
		if (dfboot_splash_dli_count < DFBOOT_SPLASH_DLI_LOG) {
			DFBootSplashDli *entry = &dfboot_splash_dli[dfboot_splash_dli_count++];
			entry->frame = frame;
			entry->scanline = ANTIC_ypos;
			entry->audf1 = POKEY_AUDF[0];
			entry->audc1 = POKEY_AUDC[0];
			entry->colpf1 = GTIA_COLPF1;
			entry->colpf2 = GTIA_COLPF2;
			entry->colbk = GTIA_COLBK;
		}
	}
	if (dfboot_seen_loader != 0xffffffffu && dfboot_teardown_audc1 == 0xffffffffu &&
		MEMORY_mem[dfboot_game_state] == 0u && ANTIC_DMACTL == 0u)
		dfboot_teardown_audc1 = POKEY_AUDC[0];
	if (pc == dfboot_pc_start && dfboot_seen_start == 0xffffffffu) {
		dfboot_seen_start = frame;
		dfboot_splash_checksum_start =
			dfboot_checksum(dfboot_splash_address, dfboot_splash_bytes);
	}
	if (pc == dfboot_pc_loader && dfboot_seen_loader == 0xffffffffu)
		dfboot_seen_loader = frame;
	if (pc == dfboot_pc_menu && dfboot_seen_menu == 0xffffffffu &&
		dfboot_seen_loader != 0xffffffffu && MEMORY_mem[dfboot_loader_timer] == 0u)
		dfboot_seen_menu = frame;
	if (pc == dfboot_pc_frontend && dfboot_seen_frontend == 0xffffffffu &&
		MEMORY_mem[dfboot_game_state] == 1u) {
		dfboot_seen_frontend = frame;
		/* The splash teardown clears AUDC1 before it blanks the display, so
		 * the deck must already be silent on the first frontend frame. */
		dfboot_first_frontend_audc1 = POKEY_AUDC[0];
	}
	if (pc == dfboot_pc_gameplay && dfboot_seen_gameplay == 0xffffffffu) {
		dfboot_seen_gameplay = frame;
		/* The reader has handed over, so the load window closes here. */
		if (dfboot_level_load_end == 0xffffffffu)
			dfboot_level_load_end = frame;
	}
	if (pc == dfboot_pc_main && dfboot_seen_main == 0xffffffffu)
		dfboot_seen_main = frame;

	/* Drive the production menu input path: neutral through the loader/menu,
	 * then a short FIRE press after the menu proof snapshot. */
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | 0x0fu;
	fire_start = dfboot_seen_frontend == 0xffffffffu ? 0xffffffffu :
		(dfboot_seen_frontend + 2u < DFBOOT_MENU_FRAME + 1u ?
			DFBOOT_MENU_FRAME + 1u : dfboot_seen_frontend + 2u);
	GTIA_TRIG[0] = (UBYTE) (frame >= fire_start && frame <= fire_start + 5u ? 0 : 1);
	if (frame != dfboot_last_frame) {
		dfboot_last_frame = frame;
		if (dfboot_target_frame(frame))
			dfboot_capture(frame, pc);
		if (frame > DFBOOT_GAMEPLAY_FRAME) {
			dfboot_write();
			fflush(NULL);
			exit(0);
		}
	}
}

/* Focused frontend-raster audit. This host-only observer drives the released
 * joystick/OPTION paths and records the exact machine state after complete
 * menu rasters. It never seeds guest state or patches guest memory. */
typedef struct {
	unsigned frame;
	unsigned generation;
	unsigned menu_age;
	unsigned pc;
	int scanline;
	int cycle;
	unsigned game_state;
	unsigned dlist;
	unsigned charset_address;
	unsigned pm_base;
	unsigned dma_ctl;
	unsigned nmi_en;
	unsigned vdslst;
	unsigned gractl;
	unsigned prior;
	unsigned grafp0;
	unsigned grafp1;
	unsigned grafp2;
	unsigned grafp3;
	unsigned grafm;
	unsigned hposp0;
	unsigned hposp1;
	unsigned hposp2;
	unsigned hposp3;
	unsigned sizep0;
	unsigned sizep1;
	unsigned sizep2;
	unsigned sizep3;
	unsigned vscroll;
	unsigned hscroll;
	unsigned colpm0;
	unsigned colpm1;
	unsigned colpm2;
	unsigned colpm3;
	unsigned colpf0;
	unsigned colpf1;
	unsigned colpf2;
	unsigned colpf3;
	unsigned colbk;
	unsigned pmg_nonzero;
	char screenshot[FILENAME_MAX];
	UBYTE screen[0x400];
	UBYTE charset[0x400];
	UBYTE dlist_bytes[0x200];
} DFMenuSnapshot;

typedef struct {
	unsigned pc;
	unsigned frame;
	int scanline;
	int cycle;
	unsigned old_value;
	unsigned new_value;
} DFMenuWrite;

static int dfmenu_initialised;
static FILE *dfmenu_file;
static const char *dfmenu_artifact;
static const char *dfmenu_screenshot_prefix;
static unsigned dfmenu_fill;
static unsigned dfmenu_game_state;
static unsigned dfmenu_frontend_selection;
static unsigned dfmenu_frontend_input_armed;
static unsigned dfmenu_pc_frontend_poll;
static unsigned dfmenu_pc_pause_loop;
static unsigned dfmenu_main_menu_dlist;
static unsigned dfmenu_frontend_dlist_end;
static unsigned dfmenu_cycles;
static unsigned dfmenu_generation = 0xffffffffu;
static unsigned dfmenu_menu_start_frame;
static unsigned dfmenu_gameplay_start_frame;
static unsigned dfmenu_last_state = 0xffffffffu;
static unsigned dfmenu_last_frame = 0xffffffffu;
static unsigned dfmenu_snapshots_count;
static unsigned dfmenu_watch_address = 0xffffffffu;
static unsigned dfmenu_watch_value;
static unsigned dfmenu_previous_pc;
static unsigned dfmenu_writes_count;
static unsigned dfmenu_pause_entries;
static unsigned dfmenu_pause_latch_failures;
static DFMenuSnapshot dfmenu_snapshots[32];
static DFMenuWrite dfmenu_writes[64];

static void dfmenu_set_input(unsigned stick, unsigned trigger);

static unsigned dfmenu_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "voidstrike65 menu audit: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "voidstrike65 menu audit: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static void dfmenu_write_hex(FILE *file, const UBYTE *bytes, unsigned length)
{
	static const char digits[] = "0123456789abcdef";
	unsigned index;
	for (index = 0; index < length; ++index) {
		fputc(digits[bytes[index] >> 4], file);
		fputc(digits[bytes[index] & 0x0fu], file);
	}
}

static void dfmenu_capture(unsigned frame, unsigned pc)
{
	DFMenuSnapshot *snapshot;
	unsigned address;
	unsigned dlist_length = dfmenu_frontend_dlist_end - dfmenu_main_menu_dlist;
	if (dfmenu_snapshots_count >= sizeof(dfmenu_snapshots) / sizeof(dfmenu_snapshots[0]) ||
		dlist_length > sizeof(snapshot->dlist_bytes)) {
		fprintf(stderr, "voidstrike65 menu audit: snapshot capacity exceeded\n");
		exit(2);
	}
	snapshot = &dfmenu_snapshots[dfmenu_snapshots_count++];
	memset(snapshot, 0, sizeof(*snapshot));
	snapshot->frame = frame;
	snapshot->generation = dfmenu_generation;
	snapshot->menu_age = frame - dfmenu_menu_start_frame;
	snapshot->pc = pc;
	snapshot->scanline = ANTIC_ypos;
	snapshot->cycle = ANTIC_XPOS;
	snapshot->game_state = MEMORY_mem[dfmenu_game_state];
	snapshot->dlist = ANTIC_dlist;
	snapshot->charset_address = (unsigned) ANTIC_CHBASE << 8;
	snapshot->pm_base = (unsigned) ANTIC_PMBASE << 8;
	snapshot->dma_ctl = ANTIC_DMACTL;
	snapshot->nmi_en = ANTIC_NMIEN;
	snapshot->vdslst = MEMORY_mem[0x0200u] | ((unsigned) MEMORY_mem[0x0201u] << 8);
	snapshot->gractl = GTIA_GRACTL;
	snapshot->prior = GTIA_PRIOR;
	snapshot->grafp0 = GTIA_GRAFP0;
	snapshot->grafp1 = GTIA_GRAFP1;
	snapshot->grafp2 = GTIA_GRAFP2;
	snapshot->grafp3 = GTIA_GRAFP3;
	snapshot->grafm = GTIA_GRAFM;
	snapshot->hposp0 = GTIA_HPOSP0;
	snapshot->hposp1 = GTIA_HPOSP1;
	snapshot->hposp2 = GTIA_HPOSP2;
	snapshot->hposp3 = GTIA_HPOSP3;
	snapshot->sizep0 = GTIA_SIZEP0;
	snapshot->sizep1 = GTIA_SIZEP1;
	snapshot->sizep2 = GTIA_SIZEP2;
	snapshot->sizep3 = GTIA_SIZEP3;
	snapshot->vscroll = ANTIC_VSCROL;
	snapshot->hscroll = ANTIC_HSCROL;
	snapshot->colpm0 = GTIA_COLPM0;
	snapshot->colpm1 = GTIA_COLPM1;
	snapshot->colpm2 = GTIA_COLPM2;
	snapshot->colpm3 = GTIA_COLPM3;
	snapshot->colpf0 = GTIA_COLPF0;
	snapshot->colpf1 = GTIA_COLPF1;
	snapshot->colpf2 = GTIA_COLPF2;
	snapshot->colpf3 = GTIA_COLPF3;
	snapshot->colbk = GTIA_COLBK;
	memcpy(snapshot->screen, MEMORY_mem + 0x4000u, sizeof(snapshot->screen));
	memcpy(snapshot->charset, MEMORY_mem + 0x4800u, sizeof(snapshot->charset));
	memcpy(snapshot->dlist_bytes, MEMORY_mem + dfmenu_main_menu_dlist, dlist_length);
	for (address = 0x3b00u; address < 0x4000u; ++address)
		if (MEMORY_mem[address] != 0u)
			++snapshot->pmg_nonzero;
	if (dfmenu_screenshot_prefix != NULL && *dfmenu_screenshot_prefix != '\0') {
		snprintf(snapshot->screenshot, sizeof(snapshot->screenshot),
			"%s-menu%u-age%03u.png", dfmenu_screenshot_prefix,
			snapshot->generation, snapshot->menu_age);
		if (!Screen_SaveScreenshot(snapshot->screenshot, 0)) {
			fprintf(stderr, "voidstrike65 menu audit: screenshot failed: %s\n",
				snapshot->screenshot);
			exit(2);
		}
	}
}

static void dfmenu_write(void)
{
	unsigned index;
	unsigned dlist_length = dfmenu_frontend_dlist_end - dfmenu_main_menu_dlist;
	fprintf(dfmenu_file,
		"{\n  \"artifact\":\"%s\",\n  \"cold_ram_fill\":%u,\n"
		"  \"completed_cycles\":%u,\n  \"pause_entries\":%u,\n"
		"  \"pause_latch_failures\":%u,\n  \"snapshots\":[\n",
		dfmenu_artifact, dfmenu_fill, dfmenu_generation,
		dfmenu_pause_entries, dfmenu_pause_latch_failures);
	for (index = 0; index < dfmenu_snapshots_count; ++index) {
		DFMenuSnapshot *snapshot = &dfmenu_snapshots[index];
		fprintf(dfmenu_file,
			"    {\"frame\":%u,\"generation\":%u,\"menu_age\":%u,"
			"\"pc\":%u,\"scanline\":%d,\"cycle\":%d,\"game_state\":%u,"
			"\"dlist\":%u,\"charset_address\":%u,\"pm_base\":%u,"
			"\"dma_ctl\":%u,\"nmi_en\":%u,\"vdslst\":%u,"
			"\"gractl\":%u,\"prior\":%u,"
			"\"grafp0\":%u,\"grafp1\":%u,\"grafp2\":%u,\"grafp3\":%u,"
			"\"grafm\":%u,\"hposp0\":%u,\"hposp1\":%u,"
			"\"hposp2\":%u,\"hposp3\":%u,\"sizep0\":%u,"
			"\"sizep1\":%u,\"sizep2\":%u,\"sizep3\":%u,"
			"\"vscroll\":%u,\"hscroll\":%u,"
			"\"colpm0\":%u,\"colpm1\":%u,\"colpm2\":%u,\"colpm3\":%u,"
			"\"colpf0\":%u,\"colpf1\":%u,\"colpf2\":%u,\"colpf3\":%u,"
			"\"colbk\":%u,\"pmg_nonzero\":%u,\"screenshot\":\"%s\","
			"\"screen_hex\":\"",
			snapshot->frame, snapshot->generation, snapshot->menu_age, snapshot->pc,
			snapshot->scanline, snapshot->cycle, snapshot->game_state,
			snapshot->dlist, snapshot->charset_address, snapshot->pm_base,
			snapshot->dma_ctl, snapshot->nmi_en, snapshot->vdslst,
			snapshot->gractl, snapshot->prior,
			snapshot->grafp0, snapshot->grafp1, snapshot->grafp2, snapshot->grafp3,
			snapshot->grafm, snapshot->hposp0, snapshot->hposp1,
			snapshot->hposp2, snapshot->hposp3, snapshot->sizep0,
			snapshot->sizep1, snapshot->sizep2, snapshot->sizep3,
			snapshot->vscroll, snapshot->hscroll,
			snapshot->colpm0, snapshot->colpm1, snapshot->colpm2, snapshot->colpm3,
			snapshot->colpf0, snapshot->colpf1, snapshot->colpf2, snapshot->colpf3,
			snapshot->colbk, snapshot->pmg_nonzero, snapshot->screenshot);
		dfmenu_write_hex(dfmenu_file, snapshot->screen, sizeof(snapshot->screen));
		fputs("\",\"charset_hex\":\"", dfmenu_file);
		dfmenu_write_hex(dfmenu_file, snapshot->charset, sizeof(snapshot->charset));
		fputs("\",\"dlist_hex\":\"", dfmenu_file);
		dfmenu_write_hex(dfmenu_file, snapshot->dlist_bytes, dlist_length);
		fprintf(dfmenu_file, "\"}%s\n",
			index + 1u == dfmenu_snapshots_count ? "" : ",");
	}
	fputs("  ],\n  \"watched_writes\":[\n", dfmenu_file);
	for (index = 0; index < dfmenu_writes_count; ++index) {
		DFMenuWrite *write = &dfmenu_writes[index];
		fprintf(dfmenu_file,
			"    {\"address\":%u,\"pc\":%u,\"frame\":%u,\"scanline\":%d,"
			"\"cycle\":%d,\"old\":%u,\"new\":%u}%s\n",
			dfmenu_watch_address, write->pc, write->frame, write->scanline,
			write->cycle, write->old_value, write->new_value,
			index + 1u == dfmenu_writes_count ? "" : ",");
	}
	fputs("  ]\n}\n", dfmenu_file);
	if (fclose(dfmenu_file) != 0) {
		perror("voidstrike65 menu audit close");
		exit(2);
	}
}

static void dfmenu_init(void)
{
	const char *watch = getenv("DFMENU_WATCH_ADDRESS");
	unsigned address;
	dfmenu_file = fopen(getenv("DFMENU_OUTPUT"), "w");
	if (dfmenu_file == NULL) {
		perror("voidstrike65 menu audit output");
		exit(2);
	}
	dfmenu_artifact = getenv("DFMENU_ARTIFACT");
	dfmenu_screenshot_prefix = getenv("DFMENU_SCREENSHOT_PREFIX");
	if (dfmenu_artifact == NULL || *dfmenu_artifact == '\0') {
		fprintf(stderr, "voidstrike65 menu audit: missing artifact\n");
		exit(2);
	}
	dfmenu_fill = dfmenu_env_u("DFMENU_RAM_FILL");
	dfmenu_cycles = dfmenu_env_u("DFMENU_CYCLES");
	if (dfmenu_fill > 0xffu || dfmenu_cycles == 0u || dfmenu_cycles > 3u) {
		fprintf(stderr, "voidstrike65 menu audit: invalid fill/cycle count\n");
		exit(2);
	}
	for (address = 0x8000u; address < 0xa000u; ++address)
		MEMORY_mem[address] = (UBYTE) dfmenu_fill;
	dfmenu_game_state = dfmenu_env_u("DFMENU_GAME_STATE");
	dfmenu_frontend_selection = dfmenu_env_u("DFMENU_FRONTEND_SELECTION");
	dfmenu_frontend_input_armed = dfmenu_env_u("DFMENU_FRONTEND_INPUT_ARMED");
	dfmenu_pc_frontend_poll = dfmenu_env_u("DFMENU_PC_FRONTEND_POLL");
	dfmenu_pc_pause_loop = dfmenu_env_u("DFMENU_PC_PAUSE_LOOP");
	dfmenu_main_menu_dlist = dfmenu_env_u("DFMENU_MAIN_MENU_DLIST");
	dfmenu_frontend_dlist_end = dfmenu_env_u("DFMENU_FRONTEND_DLIST_END");
	if (watch != NULL && *watch != '\0') {
		dfmenu_watch_address = dfmenu_env_u("DFMENU_WATCH_ADDRESS");
		dfmenu_watch_value = MEMORY_mem[dfmenu_watch_address];
	}
	dfmenu_set_input(0x0fu, 1u);
	dfmenu_initialised = 1;
}

static void dfmenu_track_watch(unsigned pc)
{
	unsigned value;
	if (dfmenu_watch_address == 0xffffffffu)
		return;
	value = MEMORY_mem[dfmenu_watch_address];
	if (value != dfmenu_watch_value) {
		if (dfmenu_writes_count < sizeof(dfmenu_writes) / sizeof(dfmenu_writes[0])) {
			DFMenuWrite *write = &dfmenu_writes[dfmenu_writes_count++];
			write->pc = dfmenu_previous_pc;
			write->frame = (unsigned) Atari800_nframes;
			write->scanline = ANTIC_ypos;
			write->cycle = ANTIC_XPOS;
			write->old_value = dfmenu_watch_value;
			write->new_value = value;
		}
		dfmenu_watch_value = value;
	}
	dfmenu_previous_pc = pc;
}

static void dfmenu_set_input(unsigned stick, unsigned trigger)
{
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | (stick & 0x0fu);
	GTIA_TRIG[0] = (UBYTE) (trigger != 0u);
}

static void dfmenu_observe(unsigned pc)
{
	unsigned frame;
	unsigned state;
	unsigned selection;
	unsigned armed;
	unsigned menu_age = 0u;
	unsigned stick;
	unsigned trigger;
	if (!dfmenu_initialised)
		dfmenu_init();
	dfmenu_track_watch(pc);
	frame = (unsigned) Atari800_nframes;
	state = MEMORY_mem[dfmenu_game_state];
	selection = MEMORY_mem[dfmenu_frontend_selection];
	armed = MEMORY_mem[dfmenu_frontend_input_armed];
	INPUT_key_consol = INPUT_CONSOL_NONE;

	if (state == 1u && dfmenu_last_state != 1u) {
		++dfmenu_generation;
		dfmenu_menu_start_frame = frame;
	}
	if (state == 6u && dfmenu_last_state != 6u)
		dfmenu_gameplay_start_frame = frame;
	if (state == 8u && dfmenu_last_state != 8u) {
		++dfmenu_pause_entries;
		if (GTIA_GRAFP0 != 0u || GTIA_GRAFP1 != 0u || GTIA_GRAFP2 != 0u ||
			GTIA_GRAFP3 != 0u || GTIA_GRAFM != 0u)
			++dfmenu_pause_latch_failures;
	}
	if (state != dfmenu_last_state)
		dfmenu_set_input(0x0fu, 1u);
	dfmenu_last_state = state;

	if (state == 1u) {
		menu_age = frame - dfmenu_menu_start_frame;
		if (pc == dfmenu_pc_frontend_poll) {
			stick = 0x0fu;
			trigger = 1u;
			if (dfmenu_generation < dfmenu_cycles &&
				menu_age >= (dfmenu_generation == 0u ? 505u : 25u) && armed != 0u)
				trigger = 0u;
			dfmenu_set_input(stick, trigger);
		}
	}
	else if (state == 6u && frame >= dfmenu_gameplay_start_frame + 50u &&
		frame <= dfmenu_gameplay_start_frame + 51u) {
		INPUT_key_consol &= ~INPUT_CONSOL_OPTION;
	}
	else if ((state == 8u || state == 9u) && pc == dfmenu_pc_pause_loop) {
		stick = 0x0fu;
		trigger = 1u;
		if (armed != 0u) {
			if (selection < (state == 8u ? 2u : 1u))
				stick = 0x0du;
			else
				trigger = 0u;
		}
		dfmenu_set_input(stick, trigger);
	}

	if (frame != dfmenu_last_frame) {
		dfmenu_last_frame = frame;
		if (state == 1u && ((menu_age >= 1u && menu_age <= 6u) ||
			menu_age == 20u || menu_age == 500u))
			dfmenu_capture(frame, pc);
		if (dfmenu_generation == dfmenu_cycles && state == 1u && menu_age > 500u) {
			dfmenu_write();
			fflush(NULL);
			exit(0);
		}
		if (frame > 2500u) {
			dfmenu_write();
			fflush(NULL);
			exit(3);
		}
	}
}

static unsigned dftrace_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "voidstrike65 trace: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "voidstrike65 trace: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static unsigned dftrace_count_nonzero(unsigned address, unsigned length)
{
	unsigned index;
	unsigned count = 0;
	for (index = 0; index < length; ++index)
		if (MEMORY_mem[(address + index) & 0xffffu] != 0)
			++count;
	return count;
}

static unsigned dftrace_count_far_rendered(void)
{
	/* `far_rendered` is a frozen CSV column name. It now carries the count of
	 * cached white-only overlay records; no blue population exists. */
	return dftrace_count_nonzero(dftrace_near_screen_hi, DFTRACE_NEAR_COUNT);
}

static int dftrace_is_ring_address(unsigned address)
{
	return address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END;
}

static int dftrace_pickup_screen_address_valid(unsigned address)
{
	return dftrace_is_ring_address(address);
}

static unsigned dftrace_pickup_glyph_cells(void)
{
	unsigned address;
	unsigned count = 0;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u];
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		unsigned code = MEMORY_mem[address];
		unsigned index;
		for (index = 0; index < 6u; ++index)
			if (code == ((base + index) & 0xffu)) {
				++count;
				break;
			}
	}
	return count;
}

static unsigned dftrace_pickup_footprints(void)
{
	unsigned address;
	unsigned count = 0;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u];
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address)
		if (MEMORY_mem[address] == base)
			++count;
	return count;
}

static void dftrace_pickup_addresses(unsigned *addresses)
{
	unsigned top = MEMORY_mem[dftrace_entity_screen_lo + 1u] |
		((unsigned) MEMORY_mem[dftrace_entity_screen_hi + 1u] << 8);
	unsigned bottom = MEMORY_mem[dftrace_entity_vx + 1u] |
		((unsigned) MEMORY_mem[dftrace_entity_vy + 1u] << 8);
	addresses[0] = top;
	addresses[1] = (top + 1u) & 0xffffu;
	addresses[2] = bottom;
	addresses[3] = (bottom + 1u) & 0xffffu;
	if (MEMORY_mem[dftrace_entity_screen_hi + 3u] != 0u) {
		unsigned third = MEMORY_mem[dftrace_entity_screen_lo + 3u] |
			((unsigned) MEMORY_mem[dftrace_entity_screen_hi + 3u] << 8);
		addresses[4] = third;
		addresses[5] = (third + 1u) & 0xffffu;
	}
}

static unsigned dftrace_pickup_backing(unsigned index)
{
	static unsigned *const backing_addresses[] = {
		&dftrace_entity_backing0, &dftrace_entity_backing1,
		&dftrace_entity_backing2, &dftrace_entity_backing3,
		&dftrace_entity_backing0, &dftrace_entity_backing1
	};
	return MEMORY_mem[*backing_addresses[index] + (index < 4u ? 1u : 3u)];
}

static void dftrace_pickup_frame_begin(DFTraceFrame *frame)
{
	unsigned index;
	unsigned row_address = MEMORY_mem[dftrace_playfield_row_lo] |
		((unsigned) MEMORY_mem[dftrace_playfield_row_hi] << 8);
	frame->pickup_prev_x = MEMORY_mem[dftrace_entity_x + 1u];
	frame->pickup_prev_y = MEMORY_mem[dftrace_entity_y + 1u];
	if (frame->pickup_prev_y >= DFTRACE_GAMEPLAY_TOP) {
		frame->pickup_prev_render_row =
			(frame->pickup_prev_y - DFTRACE_GAMEPLAY_TOP) >> 3;
		frame->pickup_prev_render_phase =
			(frame->pickup_prev_y - DFTRACE_GAMEPLAY_TOP) & 7u;
	}
	frame->pickup_vscroll = ANTIC_VSCROL;
	if (row_address >= DFTRACE_RING_SCREEN && row_address < DFTRACE_RING_END)
		frame->pickup_a2_head = (row_address - DFTRACE_RING_SCREEN) / 40u;
	dftrace_pickup_addresses(frame->pickup_old_address);
	for (index = 0; index < 6u; ++index) {
		frame->pickup_old_backing[index] = dftrace_pickup_backing(index);
		if (dftrace_pickup_screen_address_valid(frame->pickup_old_address[index]))
			frame->pickup_old_before_erase[index] =
				MEMORY_mem[frame->pickup_old_address[index]];
	}
	frame->pickup_glyph_cells_before = dftrace_pickup_glyph_cells();
	frame->pickup_footprints_before = dftrace_pickup_footprints();
}

static void dftrace_pickup_after_erase(DFTraceFrame *frame)
{
	unsigned index;
	for (index = 0; index < 6u; ++index)
		if (dftrace_pickup_screen_address_valid(frame->pickup_old_address[index]))
			frame->pickup_old_after_erase[index] =
				MEMORY_mem[frame->pickup_old_address[index]];
}

static void dftrace_pickup_frame_end(DFTraceFrame *frame)
{
	unsigned index;
	unsigned y = MEMORY_mem[dftrace_entity_y + 1u];
	if (y >= DFTRACE_GAMEPLAY_TOP) {
		frame->pickup_render_row = (y - DFTRACE_GAMEPLAY_TOP) >> 3;
		frame->pickup_render_phase = (y - DFTRACE_GAMEPLAY_TOP) & 7u;
	}
	dftrace_pickup_addresses(frame->pickup_new_address);
	for (index = 0; index < 6u; ++index) {
		frame->pickup_new_backing[index] = dftrace_pickup_backing(index);
		if (dftrace_pickup_screen_address_valid(frame->pickup_new_address[index]))
			frame->pickup_new_after_draw[index] =
				MEMORY_mem[frame->pickup_new_address[index]];
	}
	frame->pickup_glyph_cells_after = dftrace_pickup_glyph_cells();
	frame->pickup_footprints_after = dftrace_pickup_footprints();
}

static void dftrace_pickup_watch(DFTraceFrame *frame, unsigned pc)
{
	unsigned index;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u];
	if (frame->pickup_first_overwrite_pc != 0u ||
		MEMORY_mem[dftrace_entity_state + 1u] != 2u ||
		(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) != 15u)
		return;
	for (index = 0; index < 6u; ++index) {
		unsigned address = frame->pickup_old_address[index];
		if (dftrace_pickup_screen_address_valid(address) &&
			MEMORY_mem[address] != ((base + index) & 0xffu)) {
			frame->pickup_first_overwrite_pc = pc;
			frame->pickup_first_overwrite_address = address;
			frame->pickup_first_overwrite_value = MEMORY_mem[address];
			frame->pickup_first_overwrite_scanline = ANTIC_ypos;
			return;
		}
	}
}

static void dftrace_snapshot_rapid_projectile(DFTraceFrame *frame)
{
	unsigned slot;
	frame->rapid_projectile_slot = 0xffffffffu;
	for (slot = 0; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned state = MEMORY_mem[dftrace_projectile_active + slot];
		if (state != 0u && MEMORY_mem[dftrace_projectile_rendered + slot] != 0u)
			frame->player_fighter_projectiles++;
		if (state == 1u && MEMORY_mem[dftrace_projectile_rendered + slot] != 0u &&
			MEMORY_mem[dftrace_entity_state + 2u] == 3u) {
			unsigned address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
				(MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
			unsigned screen_code = MEMORY_mem[address];
			frame->rapid_projectiles++;
			/* Prefer either fixed yellow PairShot phase ($0b/$1d), not merely any
			 * positive code: a later base/broadside glyph may occupy the same cell. */
			if (frame->rapid_projectile_slot == 0xffffffffu ||
				(((frame->rapid_projectile_screen_code != 0x0bu &&
				   frame->rapid_projectile_screen_code != 0x1du) ||
				  !dftrace_is_ring_address(frame->rapid_projectile_address)) &&
				(screen_code == 0x0bu || screen_code == 0x1du) &&
				dftrace_is_ring_address(address))) {
				frame->rapid_projectile_slot = slot;
				frame->rapid_projectile_address = address;
				frame->rapid_projectile_screen_code = screen_code;
				frame->rapid_projectile_backing =
					MEMORY_mem[dftrace_projectile_backing_top + slot];
			}
		}
	}
}

static int dftrace_is_player_pairshot_code(unsigned value)
{
	return value == 0x0bu || value == 0x1du ||
		(value >= 0x2fu && value < 0x34u);
}

static int dftrace_player_pairshot_owns(unsigned address)
{
	unsigned slot;
	for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned owned;
		if (MEMORY_mem[dftrace_projectile_rendered + slot] == 0u)
			continue;
		owned = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		if (owned == address)
			return 1;
	}
	return 0;
}

static void dftrace_snapshot_player_pairshot_orphans(DFTraceFrame *frame)
{
	unsigned address;
	frame->player_projectile_orphan_cells = 0u;
	for (address = DFTRACE_DIVIDER_SCREEN;
		address < DFTRACE_DIVIDER_SCREEN + 40u; ++address)
		if (dftrace_is_player_pairshot_code(MEMORY_mem[address]) &&
			!dftrace_player_pairshot_owns(address))
			++frame->player_projectile_orphan_cells;
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address)
		if (dftrace_is_player_pairshot_code(MEMORY_mem[address]) &&
			!dftrace_player_pairshot_owns(address))
			++frame->player_projectile_orphan_cells;
}

static int dftrace_is_enemy_pairshot_code(unsigned value)
{
	return value >= DFTRACE_INTERCEPTOR_GLYPH_FIRST &&
		value <= DFTRACE_INTERCEPTOR_GLYPH_LAST;
}

static int dftrace_enemy_pairshot_owns(unsigned address)
{
	unsigned slot;
	for (slot = DFTRACE_INTERCEPTOR_SLOT_BASE;
		slot < DFTRACE_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned owned;
		if (MEMORY_mem[dftrace_projectile_active + slot] == 0u ||
			MEMORY_mem[dftrace_projectile_rendered + slot] == 0u)
			continue;
		owned = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		if (owned == address)
			return 1;
	}
	return 0;
}

static void dftrace_snapshot_enemy_pairshot_orphans(DFTraceFrame *frame)
{
	unsigned address;
	frame->enemy_projectile_stale_cells = 0u;
	for (address = DFTRACE_DIVIDER_SCREEN;
		address < DFTRACE_DIVIDER_SCREEN + 40u; ++address)
		if (dftrace_is_enemy_pairshot_code(MEMORY_mem[address]) &&
			!dftrace_enemy_pairshot_owns(address))
			++frame->enemy_projectile_stale_cells;
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address)
		if (dftrace_is_enemy_pairshot_code(MEMORY_mem[address]) &&
			!dftrace_enemy_pairshot_owns(address))
			++frame->enemy_projectile_stale_cells;
}

/* Writer 4 of the hull-transient ownership model: a live, rendered fighter
 * projectile standing on a cell a tracked muzzle also claims. The projectile
 * slot saves the covered cell into FIGHTER_PROJECTILE_BACKUP_TOP before it
 * draws and erase_fighter_projectile_restore returns it when the shot leaves,
 * so the muzzle glyph is occluded for those frames, not lost.
 *
 * This reports PRESENCE, not history. It is 1 only while some projectile
 * slot's OWN screen pointer still equals this address AND the address still
 * holds that slot's glyph family. As soon as the shot advances, the slot's
 * pointer moves; as soon as it is released, its rendered flag clears; either
 * way this returns to 0 on the very next snapshot. A cell a projectile merely
 * passed over at some earlier point is therefore never forgiven, and neither
 * is a cell holding a muzzle or launch-flash code ($45/$D0/$51/$D2) — those
 * are disjoint from both projectile glyph families. */
static unsigned dftrace_projectile_occludes(unsigned address)
{
	unsigned code;
	if (address == 0u)
		return 0u;
	code = MEMORY_mem[address];
	if (dftrace_is_player_pairshot_code(code) && dftrace_player_pairshot_owns(address))
		return 1u;
	if (dftrace_is_enemy_pairshot_code(code) && dftrace_enemy_pairshot_owns(address))
		return 1u;
	return 0u;
}

static void dftrace_emitter_cleanup_begin(DFTraceFrame *frame)
{
	unsigned index;
	unsigned target = MEMORY_mem[dftrace_enemy_target_slot] & 1u;
	unsigned owned = 0u;
	for (index = 0u; index < DFTRACE_INTERCEPTOR_SLOT_COUNT; ++index) {
		unsigned slot = DFTRACE_INTERCEPTOR_SLOT_BASE + index;
		unsigned active = MEMORY_mem[dftrace_projectile_active + slot];
		dftrace_emitter_cleanup_same[index] = 0u;
		dftrace_emitter_cleanup_foreign[index] = 0u;
		if (active == 0u)
			continue;
		if ((active & 1u) == target) {
			dftrace_emitter_cleanup_same[index] = active;
			++owned;
			if (index == 0u)
				++frame->emitter_owned_physical_slot0_at_kill;
		}
		else
			dftrace_emitter_cleanup_foreign[index] = active;
	}
	if (owned != 0u)
		++frame->raider_kills_with_emitter_projectile_active;
	frame->emitter_owned_projectiles_at_kill += owned;
}

static void dftrace_emitter_cleanup_end(DFTraceFrame *frame)
{
	unsigned index;
	for (index = 0u; index < DFTRACE_INTERCEPTOR_SLOT_COUNT; ++index) {
		unsigned slot = DFTRACE_INTERCEPTOR_SLOT_BASE + index;
		unsigned active = MEMORY_mem[dftrace_projectile_active + slot];
		if (dftrace_emitter_cleanup_same[index] != 0u) {
			if (active == 0u)
				++frame->emitter_owned_projectiles_removed;
			else
				++frame->post_kill_emitter_projectile_continuations;
		}
		if (dftrace_emitter_cleanup_foreign[index] != 0u) {
			if (active == dftrace_emitter_cleanup_foreign[index])
				++frame->foreign_projectiles_preserved;
			else
				++frame->foreign_projectiles_incorrectly_removed;
		}
		dftrace_emitter_cleanup_same[index] = 0u;
		dftrace_emitter_cleanup_foreign[index] = 0u;
	}
}

static int dftrace_is_transient_effect_code(unsigned value)
{
	unsigned code = value & 0x7fu;
	return (code >= 110u && code < 120u) || code == 90u || code == 91u;
}

static void dftrace_track_character_screen_write(unsigned x_register, unsigned y_register)
{
	unsigned opcode;
	unsigned address;
	unsigned zp;
	if (dftrace_previous_pc == 0u)
		return;
	opcode = MEMORY_mem[dftrace_previous_pc];
	if (opcode == 0x91u) {
		zp = MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu];
		address = MEMORY_mem[zp] |
			((unsigned) MEMORY_mem[(zp + 1u) & 0xffu] << 8);
		address = (address + y_register) & 0xffffu;
	}
	else if (opcode == 0x8du) {
		address = MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] |
			((unsigned) MEMORY_mem[(dftrace_previous_pc + 2u) & 0xffffu] << 8);
	}
	else
		return;
	if ((address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END) ||
		(address >= DFTRACE_DIVIDER_SCREEN && address < DFTRACE_DIVIDER_SCREEN + 40u)) {
		dftrace_character_last_writer[address] = dftrace_previous_pc;
		dftrace_character_last_writer_x[address] = x_register;
		if (dftrace_raider_effect_generation_active)
			++dftrace_current.raider_character_writes;
	}
}

static int dftrace_near_visible_row(unsigned address)
{
	unsigned base;
	unsigned index;
	if (address == 0u)
		return -1;
	if (address >= DFTRACE_DIVIDER_SCREEN &&
		address < DFTRACE_DIVIDER_SCREEN + 40u)
		return 0;
	base = 0x7f00u + dftrace_displayed_dlist_lo;
	for (index = 0u; index < DFTRACE_RING_ROWS; ++index) {
		unsigned row = MEMORY_mem[base + 7u + index * 3u] |
			((unsigned) MEMORY_mem[base + 8u + index * 3u] << 8);
		if (address >= row && address < row + 40u)
			return (int) index + 1;
	}
	return -1;
}

static void dftrace_near_visible_counts(unsigned *visible, unsigned *orphan,
	unsigned *first_orphan, unsigned *first_orphan_writer)
{
	unsigned base = 0x7f00u + dftrace_displayed_dlist_lo;
	unsigned row;
	*visible = 0u;
	*orphan = 0u;
	*first_orphan = 0u;
	*first_orphan_writer = 0u;
	for (row = 0u; row <= DFTRACE_RING_ROWS; ++row) {
		unsigned column;
		unsigned address = row == 0u ? DFTRACE_DIVIDER_SCREEN :
			MEMORY_mem[base + 7u + (row - 1u) * 3u] |
			((unsigned) MEMORY_mem[base + 8u + (row - 1u) * 3u] << 8);
		for (column = 0u; column < 40u; ++column) {
			unsigned slot;
			int owned = 0;
			if (MEMORY_mem[address + column] != DFTRACE_NEAR_CODE)
				continue;
			(*visible)++;
			for (slot = 0u; slot < DFTRACE_NEAR_COUNT; ++slot) {
				unsigned cached = MEMORY_mem[dftrace_near_screen_lo + slot] |
					((unsigned) MEMORY_mem[dftrace_near_screen_hi + slot] << 8);
				if (cached == address + column) {
					owned = 1;
					break;
				}
			}
			if (!owned) {
				if (*first_orphan == 0u) {
					*first_orphan = address + column;
					*first_orphan_writer = dftrace_character_last_writer[address + column];
				}
				(*orphan)++;
			}
		}
	}
}

static void dftrace_near_event(const char *event, unsigned slot, unsigned pc)
{
	unsigned address = MEMORY_mem[dftrace_near_screen_lo + slot] |
		((unsigned) MEMORY_mem[dftrace_near_screen_hi + slot] << 8);
	unsigned pointer = MEMORY_mem[dftrace_dst_ptr] |
		((unsigned) MEMORY_mem[(dftrace_dst_ptr + 1u) & 0xffffu] << 8);
	int visible_row = dftrace_near_visible_row(address);
	unsigned physical_row = address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END
		? (address - DFTRACE_RING_SCREEN) / 40u : 0xffffffffu;
	unsigned visible_near = 0u;
	unsigned orphan_near = 0u;
	unsigned first_orphan = 0u;
	unsigned first_orphan_writer = 0u;
	if (dftrace_near_file == NULL)
		return;
	if ((event[0] == 'p' && slot == 0u) ||
		(event[0] == 'r' && event[7] == 'e'))
		dftrace_near_visible_counts(&visible_near, &orphan_near,
			&first_orphan, &first_orphan_writer);
	fprintf(dftrace_near_file,
		"%u,%u,%u,%d,%d,%llu,%s,%u,%u,%u,%u,%u,%u,%u,%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
		dftrace_count, (unsigned) Atari800_nframes,
		MEMORY_mem[dftrace_gameplay_frame], ANTIC_ypos, ANTIC_XPOS,
		(unsigned long long) dftrace_clock(), event, slot, pc, dftrace_previous_pc,
		MEMORY_mem[dftrace_near_row + slot], MEMORY_mem[dftrace_near_column + slot],
		address, pointer, visible_row, physical_row,
		address == 0u ? 0u : MEMORY_mem[address],
		pointer == 0u ? 0u : MEMORY_mem[pointer],
		address == 0u ? 0u : dftrace_character_last_writer[address],
		MEMORY_mem[DFTRACE_CHARSET + DFTRACE_NEAR_CODE * 8u],
		ANTIC_CHBASE, GTIA_COLPF0, GTIA_COLPF1,
		MEMORY_mem[dftrace_sector_state], MEMORY_mem[dftrace_ring_flags],
		visible_near, orphan_near, first_orphan, first_orphan_writer);
	fflush(dftrace_near_file);
}

static unsigned dftrace_near_row_address(unsigned logical_row)
{
	unsigned base = 0x7f00u + dftrace_displayed_dlist_lo;
	if (logical_row == 0u)
		return DFTRACE_DIVIDER_SCREEN;
	return MEMORY_mem[base + 7u + (logical_row - 1u) * 3u] |
		((unsigned) MEMORY_mem[base + 8u + (logical_row - 1u) * 3u] << 8);
}

static void dftrace_near_observe(unsigned pc, unsigned x_register)
{
	unsigned host;
	unsigned slot;
	if (dftrace_near_file == NULL || MEMORY_mem[dftrace_game_state] != 6u)
		return;
	/* Diagnostic-only long OPEN run: keep the production XEX untouched while
	 * collecting more than one complete fighter sector of ANTIC observations. */
	if (getenv("DFTRACE_NEAR_HOLD_OPEN") != NULL)
		MEMORY_mem[dftrace_sector_state] = 7u;
	host = (unsigned) Atari800_nframes;
	if (host != dftrace_near_host_frame) {
		dftrace_near_host_frame = host;
		memset(dftrace_near_fetch_logged, 0, sizeof(dftrace_near_fetch_logged));
		if (getenv("DFTRACE_NEAR_FORCE") != NULL && dftrace_displayed_dlist_lo != 0u) {
			unsigned address = dftrace_near_row_address(14u) + 20u;
			if (dftrace_near_force_address != 0u &&
				MEMORY_mem[dftrace_near_force_address] == DFTRACE_NEAR_CODE)
				MEMORY_mem[dftrace_near_force_address] = 0u;
			dftrace_near_force_address = address;
			MEMORY_mem[address] = DFTRACE_NEAR_CODE;
		}
		for (slot = 0u; slot < DFTRACE_NEAR_COUNT; ++slot)
			dftrace_near_event("physical_frame_begin", slot, pc);
	}
	for (slot = 0u; slot < DFTRACE_NEAR_COUNT; ++slot) {
		unsigned address;
		int row;
		int glyph_scanline;
		if (dftrace_near_fetch_logged[slot])
			continue;
		address = MEMORY_mem[dftrace_near_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_near_screen_hi + slot] << 8);
		row = dftrace_near_visible_row(address);
		glyph_scanline = row < 0 ? -1 : 16 + row * 8;
		if (glyph_scanline >= 0 && ANTIC_ypos >= glyph_scanline) {
			dftrace_near_fetch_logged[slot] = 1u;
			dftrace_near_event("antic_glyph_scanline", slot, pc);
		}
	}
	if (pc == dftrace_pc_near_erase) {
		dftrace_near_mode = 1u;
		dftrace_near_event("erase_begin", 0u, pc);
	}
	else if (pc == dftrace_pc_near_render) {
		dftrace_near_mode = 2u;
		dftrace_near_event("render_begin", 0u, pc);
	}
	if (dftrace_near_mode != 0u && dftrace_previous_pc != 0u &&
		MEMORY_mem[dftrace_previous_pc] == 0xb1u &&
		MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] == (dftrace_dst_ptr & 0xffu))
		dftrace_near_event(dftrace_near_mode == 1u ? "erase_attempt" : "render_attempt",
			x_register, pc);
	if (dftrace_near_mode != 0u && dftrace_previous_pc != 0u &&
		MEMORY_mem[dftrace_previous_pc] == 0x91u &&
		MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] == (dftrace_dst_ptr & 0xffu))
		dftrace_near_event(dftrace_near_mode == 1u ? "erase_write_after" : "render_write_after",
			x_register, pc);
	if (dftrace_near_mode != 0u && dftrace_previous_pc != 0u &&
		MEMORY_mem[dftrace_previous_pc] == 0x60u) {
		dftrace_near_event(dftrace_near_mode == 1u ? "erase_end" : "render_end", 0u, pc);
		dftrace_near_mode = 0u;
	}
}

static int dftrace_transient_character_owner(unsigned address)
{
	unsigned slot;
	for (slot = 0u; slot < 5u; ++slot) {
		unsigned owned;
		if ((MEMORY_mem[dftrace_effect_rendered_mask] & (1u << slot)) == 0u)
			continue;
		owned = MEMORY_mem[dftrace_effect_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_effect_screen_hi + slot] << 8);
		if (owned == address)
			return 1;
	}
	if ((MEMORY_mem[dftrace_entity_active_mask] & 1u) != 0u &&
		MEMORY_mem[dftrace_entity_screen_hi] != 0u) {
		unsigned owned = MEMORY_mem[dftrace_entity_screen_lo] |
			((unsigned) MEMORY_mem[dftrace_entity_screen_hi] << 8);
		if (owned == address || owned + 1u == address)
			return 1;
	}
	for (slot = 0u; slot < DFTRACE_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned owned;
		if (MEMORY_mem[dftrace_projectile_rendered + slot] == 0u)
			continue;
		owned = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		if (owned == address)
			return 1;
	}
	return 0;
}

static void dftrace_snapshot_transient_effect_orphans(DFTraceFrame *frame)
{
	unsigned address;
	frame->transient_effect_orphan_cells = 0u;
	frame->stale_debris_projectile_restores = 0u;
	frame->transient_effect_first_address = 0u;
	frame->transient_effect_first_code = 0u;
	frame->transient_effect_first_writer_pc = 0u;
	frame->transient_effect_first_writer_x = 0u;
	for (address = DFTRACE_DIVIDER_SCREEN;
		address < DFTRACE_DIVIDER_SCREEN + 40u; ++address)
		if (dftrace_is_transient_effect_code(MEMORY_mem[address]) &&
			!dftrace_transient_character_owner(address)) {
			if ((MEMORY_mem[address] & 0x7fu) >= 110u &&
				(MEMORY_mem[address] & 0x7fu) < 118u &&
				dftrace_character_last_writer[address] == dftrace_pc_projectile_restore)
				++frame->stale_debris_projectile_restores;
			if (frame->transient_effect_orphan_cells == 0u) {
				frame->transient_effect_first_address = address;
				frame->transient_effect_first_code = MEMORY_mem[address];
				frame->transient_effect_first_writer_pc =
					dftrace_character_last_writer[address];
				frame->transient_effect_first_writer_x =
					dftrace_character_last_writer_x[address];
			}
			++frame->transient_effect_orphan_cells;
		}
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address)
		if (dftrace_is_transient_effect_code(MEMORY_mem[address]) &&
			!dftrace_transient_character_owner(address)) {
			if ((MEMORY_mem[address] & 0x7fu) >= 110u &&
				(MEMORY_mem[address] & 0x7fu) < 118u &&
				dftrace_character_last_writer[address] == dftrace_pc_projectile_restore)
				++frame->stale_debris_projectile_restores;
			if (frame->transient_effect_orphan_cells == 0u) {
				frame->transient_effect_first_address = address;
				frame->transient_effect_first_code = MEMORY_mem[address];
				frame->transient_effect_first_writer_pc =
					dftrace_character_last_writer[address];
				frame->transient_effect_first_writer_x =
					dftrace_character_last_writer_x[address];
			}
			++frame->transient_effect_orphan_cells;
		}
}

static void dftrace_snapshot_transient_effect_coordinates(DFTraceFrame *frame)
{
	unsigned active = MEMORY_mem[dftrace_effect_active_mask];
	unsigned slot;
	frame->transient_effect_coordinate_wraps = 0u;
	for (slot = 0u; slot < 5u; ++slot) {
		unsigned bit = 1u << slot;
		unsigned y = MEMORY_mem[dftrace_effect_y + slot];
		if ((active & bit) != 0u &&
			(dftrace_previous_effect_active_mask & bit) != 0u &&
			((dftrace_previous_effect_y[slot] >= 240u && y < 4u) ||
			 (dftrace_previous_effect_y[slot] < 4u && y >= 240u)))
			++frame->transient_effect_coordinate_wraps;
		dftrace_previous_effect_y[slot] = y;
	}
	dftrace_previous_effect_active_mask = active;
}

static void dftrace_pairshot_rotate_begin(void)
{
	unsigned slot = DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT;
	unsigned recycled = MEMORY_mem[dftrace_playfield_row_lo + DFTRACE_RING_ROWS - 1u] |
		((unsigned) MEMORY_mem[dftrace_playfield_row_hi + DFTRACE_RING_ROWS - 1u] << 8);
	dftrace_pairshot_recycled_count = 0u;
	while (slot-- != 0u) {
		unsigned address;
		unsigned target;
		unsigned index;
		if (MEMORY_mem[dftrace_projectile_rendered + slot] == 0u)
			continue;
		address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		if (address < DFTRACE_DIVIDER_SCREEN ||
			address >= DFTRACE_DIVIDER_SCREEN + 40u)
			continue;
		target = recycled + address - DFTRACE_DIVIDER_SCREEN;
		for (index = 0u; index < dftrace_pairshot_recycled_count; ++index)
			if (dftrace_pairshot_recycled_address[index] == target)
				break;
		if (index == dftrace_pairshot_recycled_count) {
			dftrace_pairshot_recycled_address[index] = target;
			++dftrace_pairshot_recycled_count;
		}
		/* Production unwinds slots 4..0.  On overlap the lowest slot is the
		 * final writer, so descending capture intentionally replaces expected. */
		dftrace_pairshot_recycled_expected[index] =
			MEMORY_mem[dftrace_projectile_backing_top + slot];
	}
}

static void dftrace_pairshot_rotate_end(DFTraceFrame *frame)
{
	unsigned index;
	frame->player_projectile_recycled_checks += dftrace_pairshot_recycled_count;
	for (index = 0u; index < dftrace_pairshot_recycled_count; ++index)
		if (MEMORY_mem[dftrace_pairshot_recycled_address[index]] !=
			dftrace_pairshot_recycled_expected[index])
			++frame->player_projectile_stale_cells;
	dftrace_pairshot_recycled_count = 0u;
}

static void dftrace_set_input(unsigned stick, unsigned trigger)
{
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | (stick & 0x0fu);
	GTIA_TRIG[0] = (UBYTE) (trigger != 0);
}

static DFTracePhysicalBounds dftrace_player_physical_bounds(void)
{
	DFTracePhysicalBounds result;
	unsigned row;
	unsigned first = 0xffffffffu;
	unsigned last = 0u;
	unsigned size;
	memset(&result, 0, sizeof(result));
	for (row = 0u; row < 256u; ++row) {
		if (MEMORY_mem[0x3c00u + row] == 0u && MEMORY_mem[0x3f00u + row] == 0u)
			continue;
		if (first == 0xffffffffu)
			first = row;
		last = row;
	}
	if (first == 0xffffffffu || first < DFTRACE_CAPTURE_DMA_Y_OFFSET)
		return result;
	size = GTIA_SIZEP0 & 3u;
	result.valid = GTIA_HPOSP0 == GTIA_HPOSP3 && (GTIA_SIZEP3 & 3u) == size;
	result.left = GTIA_HPOSP0;
	result.right = result.left + 8u * (size == 1u ? 2u : size == 3u ? 4u : 1u) - 1u;
	result.dma_top = first;
	result.dma_bottom = last;
	result.top = first - DFTRACE_CAPTURE_DMA_Y_OFFSET;
	result.bottom = last - DFTRACE_CAPTURE_DMA_Y_OFFSET;
	return result;
}

static DFTracePhysicalBounds dftrace_bolt_physical_bounds(unsigned slot,
	unsigned display_list_lo)
{
	DFTracePhysicalBounds result;
	unsigned pointer;
	unsigned base;
	unsigned column;
	unsigned character_top = 0xffffffffu;
	unsigned instruction = 0u;
	unsigned row;
	memset(&result, 0, sizeof(result));
	if (slot >= 3u)
		return result;
	pointer = MEMORY_mem[dftrace_broad_row_lo + slot] |
		((unsigned) MEMORY_mem[dftrace_broad_row_hi + slot] << 8);
	base = 0x7f00u + display_list_lo;
	if ((MEMORY_mem[base + 1u] | ((unsigned) MEMORY_mem[base + 2u] << 8)) == pointer) {
		character_top = 0u;
		instruction = base;
	}
	else if ((MEMORY_mem[base + 4u] | ((unsigned) MEMORY_mem[base + 5u] << 8)) == pointer) {
		character_top = 8u;
		instruction = base + 3u;
	}
	else for (row = 0u; row < DFTRACE_RING_ROWS; ++row) {
		unsigned address = MEMORY_mem[base + 7u + row * 3u] |
			((unsigned) MEMORY_mem[base + 8u + row * 3u] << 8);
		if (address == pointer) {
			character_top = 16u + row * 8u;
			instruction = base + 6u + row * 3u;
			break;
		}
	}
	if (character_top == 0xffffffffu)
		return result;
	for (column = 0u; column < 39u; ++column) {
		if ((MEMORY_mem[pointer + column] & 0x7fu) == 126u &&
			(MEMORY_mem[pointer + column + 1u] & 0x7fu) == 127u)
			break;
	}
	if (column == 39u)
		return result;
	result.glyph_first_row = 0xffffffffu;
	for (row = 0u; row < 8u; ++row) {
		unsigned left = MEMORY_mem[DFTRACE_CHARSET + 126u * 8u + row];
		unsigned right = MEMORY_mem[DFTRACE_CHARSET + 127u * 8u + row];
		if (left == 0u && right == 0u)
			continue;
		if (result.glyph_first_row == 0xffffffffu)
			result.glyph_first_row = row;
		result.glyph_last_row = row;
	}
	if (result.glyph_first_row == 0xffffffffu)
		return result;
	result.valid = 1u;
	result.left = 48u + column * 4u;
	result.right = result.left + 7u;
	result.top = character_top + result.glyph_first_row;
	result.bottom = character_top + result.glyph_last_row;
	result.physical_pointer = pointer;
	result.display_list = base;
	result.display_instruction = instruction;
	result.screen_column = column;
	result.code_left = MEMORY_mem[pointer + column];
	result.code_right = MEMORY_mem[pointer + column + 1u];
	result.cache_top = MEMORY_mem[dftrace_broad_raster_top + slot];
	return result;
}

/* Re-enter the unmodified production capital traversal. Only the Director
 * admission boundary is accelerated: every hull state change, drain, COMPLETE
 * reconstruction and OPEN re-entry remains guest code. */
static int dftrace_reentry_policy(void)
{
	return strncmp(dftrace_policy, "pairshot-reentry-", 17u) == 0 ||
		strcmp(dftrace_policy, "booster-reentry") == 0;
}

/* Test-only PMG visibility laboratory. This deliberately runs after the
 * guest renderer, so the next complete ANTIC raster contains only this fixed
 * missile object. It never enters the production XEX. */
static int dftrace_pmg_lab_variant(void)
{
	return strcmp(dftrace_policy, "pmg-lab-fifth-player") == 0 ||
		strcmp(dftrace_policy, "pmg-lab-ordinary-missiles") == 0 ||
		strcmp(dftrace_policy, "pmg-lab-single-missile") == 0;
}

static void dftrace_publish_pmg_lab(void)
{
	unsigned row;
	unsigned value = 0xf0u;
	if (!dftrace_pmg_lab_variant())
		return;
	/* $3b00 is PMBASE+$300: the exact production missile DMA page. */
	for (row = 0u; row < 256u; ++row)
		MEMORY_mem[0x3b00u + row] = 0u;
	if (strcmp(dftrace_policy, "pmg-lab-single-missile") == 0)
		value = 0x10u;
	for (row = 0u; row < 16u; ++row)
		MEMORY_mem[0x3b00u + 120u + row] = (UBYTE) value;
	/* Use the emulator's real GTIA write path: direct cached-variable writes do
	 * not update its horizontal raster pointers and are not hardware-equivalent. */
	GTIA_PutByte(GTIA_OFFSET_HPOSM0, 94u);
	GTIA_PutByte(GTIA_OFFSET_HPOSM1, 96u);
	GTIA_PutByte(GTIA_OFFSET_HPOSM2, 98u);
	GTIA_PutByte(GTIA_OFFSET_HPOSM3, 100u);
	GTIA_PutByte(GTIA_OFFSET_GRACTL, 0x03u);
	if (strcmp(dftrace_policy, "pmg-lab-fifth-player") == 0) {
		GTIA_PutByte(GTIA_OFFSET_SIZEM, 0x00u);
		GTIA_PutByte(GTIA_OFFSET_PRIOR, 0x10u);
	}
	else if (strcmp(dftrace_policy, "pmg-lab-ordinary-missiles") == 0) {
		GTIA_PutByte(GTIA_OFFSET_SIZEM, 0x00u);
		GTIA_PutByte(GTIA_OFFSET_PRIOR, 0x00u);
	}
	else {
		/* M0 only, fourfold width; P0-P3 graphics and colours are untouched. */
		GTIA_PutByte(GTIA_OFFSET_SIZEM, 0x03u);
		GTIA_PutByte(GTIA_OFFSET_PRIOR, 0x00u);
	}
	++dftrace_pmg_lab_presentations;
}

static void dftrace_prepare_pairshot_reentry(unsigned frame)
{
	unsigned sector;
	unsigned target_cycles;
	unsigned fighter_frames;
	if (!dftrace_reentry_policy())
		return;
	target_cycles = strcmp(dftrace_policy, "booster-reentry") == 0 ? 3u : 5u;
	fighter_frames = strcmp(dftrace_policy, "booster-reentry") == 0 ? 480u : 180u;
	sector = MEMORY_mem[dftrace_sector_state];
	/* Keep one continuous gameplay generation alive for all requested traversals;
	 * collision/update/render code still executes, but cannot end the replay. */
	MEMORY_mem[dftrace_broad_state + 29u] = 10u;
	MEMORY_mem[dftrace_player_lifecycle + 2u] = 2u;
	if (!dftrace_pairshot_reentry_initialised) {
		dftrace_pairshot_reentry_prior_sector = sector;
		dftrace_pairshot_reentry_open_frame = frame;
		dftrace_pairshot_reentry_initialised = 1;
	}
	else if (dftrace_pairshot_reentry_prior_sector != 7u && sector == 7u) {
		++dftrace_pairshot_reentry_cycles;
		dftrace_pairshot_reentry_open_frame = frame;
	}
	if (sector == 7u)
		MEMORY_mem[dftrace_director_state + 8u] = 0x40u;
	if (sector == 7u && dftrace_pairshot_reentry_cycles < target_cycles &&
		frame - dftrace_pairshot_reentry_open_frame >= fighter_frames) {
		MEMORY_mem[dftrace_sector_state] = 0u;
		MEMORY_mem[dftrace_corridor_phase] = 0u;
		MEMORY_mem[dftrace_corridor_phase_hi] = 0u;
		MEMORY_mem[dftrace_broad_visible_scrolls] = 0u;
		MEMORY_mem[dftrace_capital_drain_rows] = 0u;
		/* The diagnostic is not the final-game terminal capital sector. */
		MEMORY_mem[dftrace_director_state + 8u] &= 0xfeu;
		sector = 0u;
	}
	dftrace_pairshot_reentry_prior_sector = sector;
}

static void dftrace_set_gameplay_input(unsigned frame)
{
	unsigned stick = 0x0f;
	unsigned trigger = frame <= dftrace_fire_delay ? 1 : 0;
	unsigned x = MEMORY_mem[dftrace_player_x];
	unsigned y = MEMORY_mem[dftrace_player_y];
	int pairshot_speed = strncmp(dftrace_policy, "pairshot-speed-", 15u) == 0;
	int pairshot_reentry = strncmp(dftrace_policy, "pairshot-reentry-", 17u) == 0;
	int booster_reentry = strcmp(dftrace_policy, "booster-reentry") == 0;
	if (dftrace_hold_player_lives != 0u)
		MEMORY_mem[dftrace_player_lifecycle + 1u] =
			(UBYTE) dftrace_hold_player_lives;
	dftrace_prepare_pairshot_reentry(frame);
	if (pairshot_speed) {
		/* Eight isolated tap allocations, then >=1000 held frames, a 150-frame
		 * release, and a second long hold exercise pause/resume and pool reuse. */
		if (frame < 104u)
			trigger = frame >= 8u && frame < 104u && (frame - 8u) % 12u == 0u ? 0u : 1u;
		else if (frame < 1704u)
			trigger = 0u;
		else if (frame < 1854u)
			trigger = 1u;
		else
			trigger = 0u;
	}
	else if (pairshot_reentry) {
		/* Isolated taps establish a pre-capital baseline; held FIRE then spans
		 * every traversal and all five fighter re-entry windows. Each re-entry
		 * also gets a 30-frame release/resume interval after its first 60 frames. */
		unsigned open_age = frame - dftrace_pairshot_reentry_open_frame;
		if (MEMORY_mem[dftrace_sector_state] == 7u &&
			dftrace_pairshot_reentry_cycles != 0u && open_age >= 60u && open_age < 90u)
			trigger = 1u;
		else
			trigger = frame >= 8u && frame < 80u && (frame - 8u) % 12u == 0u ? 0u :
				frame >= 96u ? 0u : 1u;
	}
	/* PairShot timing fixtures keep all gameplay and enemy scheduling native;
	 * only the already-approved booster mode is held to isolate each weapon. */
	if (strcmp(dftrace_policy, "pairshot-normal") == 0 ||
		strcmp(dftrace_policy, "pairshot-speed-normal") == 0 ||
		strcmp(dftrace_policy, "pairshot-reentry-normal") == 0)
		MEMORY_mem[dftrace_entity_state + 2u] = 0u;
	else if (strcmp(dftrace_policy, "pairshot-rapid") == 0 ||
		strcmp(dftrace_policy, "pairshot-spread") == 0 ||
		strcmp(dftrace_policy, "pairshot-speed-rapid") == 0 ||
		strcmp(dftrace_policy, "pairshot-speed-spread") == 0 ||
		strcmp(dftrace_policy, "pairshot-reentry-rapid") == 0 ||
		strcmp(dftrace_policy, "pairshot-reentry-spread") == 0) {
		MEMORY_mem[dftrace_entity_state + 2u] =
			(strcmp(dftrace_policy, "pairshot-rapid") == 0 ||
			 strcmp(dftrace_policy, "pairshot-speed-rapid") == 0 ||
			 strcmp(dftrace_policy, "pairshot-reentry-rapid") == 0) ? 3u : 4u;
		MEMORY_mem[dftrace_entity_timer + 2u] = 0xf4u;
		MEMORY_mem[dftrace_entity_move_accumulator + 2u] = 1u;
		MEMORY_mem[dftrace_entity_owner + 2u] = 1u;
		MEMORY_mem[dftrace_entity_hp + 2u] = 17u;
	}
	if (strcmp(dftrace_policy, "capital-contact-allied") == 0 ||
		strcmp(dftrace_policy, "capital-contact-hostile") == 0) {
		unsigned slot;
		unsigned target_owner = strcmp(dftrace_policy, "capital-contact-hostile") == 0;
		unsigned target_x = target_owner ?
			(dftrace_difficulty == 1u ? 84u :
			 dftrace_capital_contact_mode == 1u ? 88u : 96u) : 148u;
		/* Drive from reconstructed displayed PMG/screen bounds, never BROAD_Y or
		 * scenario names. player_y remains the PMG DMA index, hence the final +8. */
		int target_y = target_owner ? 102 : 112;
		for (slot = 0u; slot < 3u; ++slot) {
			unsigned state = MEMORY_mem[dftrace_broad_state + slot];
			if ((state == 1u || state == 2u) &&
				MEMORY_mem[dftrace_broad_state + 3u + slot] == target_owner) {
				if (state == 1u && MEMORY_mem[dftrace_broad_raster_top + slot] != 0u) {
					int bolt_top = MEMORY_mem[dftrace_broad_raster_top + slot];
					int player_top;
					if (dftrace_capital_contact_mode == 0u)
						player_top = bolt_top + 5;
					else if (dftrace_capital_contact_mode == 1u)
						player_top = bolt_top - 4;
					else if (dftrace_capital_contact_mode == 2u)
						player_top = bolt_top - 14;
					else
						player_top = bolt_top + 6;
					target_y = player_top + (int) DFTRACE_CAPTURE_DMA_Y_OFFSET;
				}
				else if (state == 2u) {
					DFTracePhysicalBounds bolt = dftrace_bolt_physical_bounds(slot,
						MEMORY_mem[dftrace_active_dlist_lo]);
					if (!bolt.valid)
						bolt = dftrace_bolt_physical_bounds(slot,
							dftrace_displayed_dlist_lo);
					if (bolt.valid) {
						int player_top;
						if (dftrace_capital_contact_mode == 0u)
							player_top = (int) bolt.bottom;
						else if (dftrace_capital_contact_mode == 1u)
							player_top = (int) bolt.top - 4;
						else if (dftrace_capital_contact_mode == 2u)
							player_top = (int) bolt.top - 14;
						else
							player_top = (int) bolt.bottom + 1;
						target_y = player_top + (int) DFTRACE_CAPTURE_DMA_Y_OFFSET;
					}
				}
				break;
			}
		}
		/* The production schedule launches Allied first.  In Hostile sessions,
		 * evade that non-target bolt by the nearest exact vertical near-miss,
		 * then return to the requested physical row before the Hostile arrives.
		 * Only joystick input is changed; no guest state is seeded. */
		for (slot = 0u; slot < 3u; ++slot) {
			unsigned state = MEMORY_mem[dftrace_broad_state + slot];
			unsigned owner = MEMORY_mem[dftrace_broad_state + 3u + slot];
			DFTracePhysicalBounds bolt;
			unsigned approaching;
			int desired_top;
			int above;
			int below;
			if (owner == target_owner || state == 0u)
				continue;
			if (state == 1u) {
				/* The Hostile policy already starts on its safe pre-position row. */
				break;
			}
			if (state != 2u)
				continue;
			bolt = dftrace_bolt_physical_bounds(slot,
				MEMORY_mem[dftrace_active_dlist_lo]);
			if (!bolt.valid)
				continue;
			approaching = owner == 0u ?
				bolt.left <= target_x + 15u && bolt.right + 64u >= target_x :
				bolt.right >= target_x && bolt.left <= target_x + 15u + 64u;
			if (!approaching)
				continue;
			desired_top = target_y - (int) DFTRACE_CAPTURE_DMA_Y_OFFSET;
			if (desired_top + 14 < (int) bolt.top || desired_top > (int) bolt.bottom)
				continue;
			/* Leave two additional scanlines for the one-frame input/display
			 * publication latency; the qualified target still uses exact bounds. */
			above = (int) bolt.top - 17;
			below = (int) bolt.bottom + 3;
			if ((desired_top > above ? desired_top - above : above - desired_top) <=
				(desired_top > below ? desired_top - below : below - desired_top))
				target_y = above + (int) DFTRACE_CAPTURE_DMA_Y_OFFSET;
			else
				target_y = below + (int) DFTRACE_CAPTURE_DMA_Y_OFFSET;
			break;
		}
		if (target_y < 40) target_y = 40;
		if (target_y > (int) DFTRACE_PLAYER_MAX_Y)
			target_y = (int) DFTRACE_PLAYER_MAX_Y;
		if (x < target_x)
			stick = 0x07u;
		else if (x > target_x)
			stick = 0x0bu;
		if ((int) y > target_y)
			stick &= 0x0eu;
		else if ((int) y < target_y)
			stick &= 0x0du;
	}
	else if (strcmp(dftrace_policy, "vertical-boundary") == 0) {
		static int reached_top;
		trigger = 1u;
		if (!reached_top) {
			if (y > DFTRACE_PLAYER_MIN_Y)
				stick = 0x0eu;
			else
				reached_top = 1;
		}
		if (reached_top && y < DFTRACE_PLAYER_MAX_Y)
			stick = 0x0du;
	}
	else if (strcmp(dftrace_policy, "lower-contact-hostile") == 0) {
		unsigned slot;
		unsigned target_y = DFTRACE_PLAYER_MAX_Y;
		trigger = 1u;
		for (slot = 0u; slot < 3u; ++slot) {
			unsigned state = MEMORY_mem[dftrace_broad_state + slot];
			unsigned owner = MEMORY_mem[dftrace_broad_state + 3u + slot];
			unsigned shell_y = MEMORY_mem[dftrace_broad_state + 12u + slot];
			if ((state == 1u || state == 2u) && owner == 1u && shell_y >= 191u) {
				target_y = shell_y - 7u;
				if (target_y > DFTRACE_PLAYER_MAX_Y)
					target_y = DFTRACE_PLAYER_MAX_Y;
				break;
			}
		}
		if (y > target_y + 1u)
			stick = 0x0eu;
		else if (y + 1u < target_y)
			stick = 0x0du;
	}
	else if (strcmp(dftrace_policy, "sweep") == 0 ||
		strcmp(dftrace_policy, "broadside-proof") == 0) {
		int target_right = ((frame / 72u) & 1u) == 0;
		stick = target_right ? (x < 154u ? 0x07u : 0x0fu) :
			(x > 94u ? 0x0bu : 0x0fu);
	}
	else if (strcmp(dftrace_policy, "broadside-sides") == 0) {
		/* Long ordinary-joystick dwells expose both capital-side corridors while
		 * retaining natural scheduling, collision, release and slot reuse. */
		int target_right = ((frame / 640u) & 1u) == 0;
		unsigned target_x = target_right ? 190u : 58u;
		stick = x < target_x ? 0x07u : x > target_x ? 0x0bu : 0x0fu;
	}
	else if (strcmp(dftrace_policy, "evasive") == 0) {
		int target_right = ((frame / 48u) & 1u) == 0;
		stick = target_right ? (x < 150u ? 0x07u : 0x0fu) :
			(x > 98u ? 0x0bu : 0x0fu);
		if (frame % 128u < 48u && y > 142u)
			stick &= 0x0eu;
		else if (frame % 128u >= 80u && y < DFTRACE_PLAYER_MAX_Y)
			stick &= 0x0du;
	}
	else if (strcmp(dftrace_policy, "raider-proof") == 0) {
		/* Alternate the ordinary joystick target between the two independent
		 * Raider slots. FIRE follows the session delay and production burst
		 * controller; this movement-only build cannot damage either Raider. */
		if (MEMORY_mem[dftrace_enemy_active] == 1u) {
			unsigned slot = (frame / 48u) & 1u;
			unsigned target = MEMORY_mem[dftrace_enemy_x + slot];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
	}
	else if (strcmp(dftrace_policy, "hunt") == 0 ||
		strcmp(dftrace_policy, "early-hunt") == 0 ||
		strcmp(dftrace_policy, "pairshot-normal") == 0 ||
		strcmp(dftrace_policy, "pairshot-rapid") == 0 ||
		strcmp(dftrace_policy, "pairshot-spread") == 0 || pairshot_speed ||
		pairshot_reentry || booster_reentry) {
		/* Follow the live Interceptor's PMG origin using only ordinary joystick
		 * input. This remains a production gameplay replay: no guest state is
		 * seeded, and held FIRE enters the canonical burst controller. */
		if (strcmp(dftrace_policy, "early-hunt") == 0 &&
			MEMORY_mem[dftrace_entity_state + 2u] != 0u)
			trigger = 1u;
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned target = MEMORY_mem[dftrace_entity_x + 1u];
			++dftrace_pickup_hunt_active_frames;
			/* Keep one release pickup alive long enough to capture sixteen
			 * consecutive full ANTIC passes, using only ordinary joystick input.
			 * Afterwards resume the normal collection replay. */
			if (dftrace_pickup_hunt_active_frames <= 20u)
				stick = x <= target ? 0x0bu : 0x07u;
			else {
				if (x + 3u < target)
					stick = 0x07u;
				else if (x > target + 3u)
					stick = 0x0bu;
				if (y > MEMORY_mem[dftrace_entity_y + 1u] + 4u)
					stick &= 0x0eu;
				else if (y + 4u < MEMORY_mem[dftrace_entity_y + 1u])
					stick &= 0x0du;
			}
		}
		else {
			dftrace_pickup_hunt_active_frames = 0u;
			if (MEMORY_mem[dftrace_enemy_active] != 0) {
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
			}
		}
	}
	else if (strcmp(dftrace_policy, "pickup-observe") == 0) {
		/* Earn the drop through normal play, then stay horizontally clear so
		 * one production capsule can traverse the complete visible playfield. */
		if (MEMORY_mem[dftrace_entity_state + 1u] != 0u)
			trigger = 1u;
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned target = MEMORY_mem[dftrace_entity_x + 1u];
			trigger = 1u;
			if (target < 128u)
				stick = x < 164u ? 0x07u : 0x0fu;
			else
				stick = x > 84u ? 0x0bu : 0x0fu;
			if (y < DFTRACE_PLAYER_MAX_Y)
				stick &= 0x0du;
		}
		else if (MEMORY_mem[dftrace_enemy_active] != 0) {
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
		if (MEMORY_mem[dftrace_entity_state + 1u] != 2u) {
			if (y > 143u)
				stick &= 0x0eu;
			else if (y + 1u < 142u)
				stick &= 0x0du;
		}
	}
	else if (strcmp(dftrace_policy, "pickup-overlap") == 0) {
		/* Earn one production drop. Keep the PlayerFighter's visible double-width PMG
		 * edge over the capsule while its narrower collision envelope remains
		 * one HPOS beyond contact for four fine phases, then align and collect
		 * through the ordinary joystick/collision path. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
			unsigned target_y = MEMORY_mem[dftrace_entity_y + 1u];
			unsigned target_x = pickup_x - 8u;
			if (target_y + 16u >= y)
				++dftrace_pickup_hunt_active_frames;
			if (dftrace_pickup_hunt_active_frames > 5u)
				target_x = pickup_x;
			if (x + 3u < target_x)
				stick = 0x07u;
			else if (x > target_x + 3u)
				stick = 0x0bu;
		}
		else if (MEMORY_mem[dftrace_enemy_active] != 0u) {
			dftrace_pickup_hunt_active_frames = 0u;
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
	}
	else if (strcmp(dftrace_policy, "pickup-contact") == 0) {
		/* Follow the complete production collision path into a nose-first
		 * collection. No guest state is seeded or held by this policy. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) {
			unsigned target_x = MEMORY_mem[dftrace_entity_x + 1u];
			unsigned target_y = MEMORY_mem[dftrace_entity_y + 1u];
			if (x + 3u < target_x)
				stick = 0x07u;
			else if (x > target_x + 3u)
				stick = 0x0bu;
			if (y > target_y + 4u)
				stick &= 0x0eu;
			else if (y + 4u < target_y)
				stick &= 0x0du;
		}
		else if (MEMORY_mem[dftrace_enemy_active] != 0u) {
			unsigned target = MEMORY_mem[dftrace_enemy_x];
			if (x + 3u < target)
				stick = 0x07u;
			else if (x > target + 3u)
				stick = 0x0bu;
		}
	}
	else if (strcmp(dftrace_policy, "restart") == 0 &&
		dftrace_gameplay_generation == 1u) {
		/* The engine regression gate needs a same-process New Game, not another
		 * cold boot. Accelerate only that diagnostic setup after 160 release
		 * gameplay frames: PLAYER_LIVES follows PLAYER_LIFECYCLE, while
		 * BROAD_DEATH_TIMER is the fixed documented broadside-state byte at
		 * PLAYER_LIFECYCLE-$4b. Production update_player_death still performs the
		 * GAME OVER transition, and the normal frontend driver starts generation
		 * two. No release byte is patched. */
		if (!dftrace_restart_game_over_seeded && frame == 160u) {
			MEMORY_mem[dftrace_player_lifecycle + 1u] = 0u;
			MEMORY_mem[dftrace_player_lifecycle - 0x4bu] = 1u;
			MEMORY_mem[dftrace_player_lifecycle] = 1u;
			dftrace_restart_game_over_seeded = 1;
		}
	}
	dftrace_set_input(stick, trigger);
}

static void dftrace_prepare_broadside_proof(void)
{
	unsigned slot;
	if (strcmp(dftrace_policy, "broadside-proof") != 0 ||
		dftrace_broadside_proof_admitted || dftrace_count < 3712u)
		return;
	/* Re-enter the production capital lifecycle once, at the frozen capital
	 * phase boundary. This is an explicit coverage fixture; all subsequent
	 * construction, muzzle publication, admission and projectile work is guest
	 * code from the exact release artifact. */
	if (!dftrace_broadside_proof_sector_started) {
		MEMORY_mem[dftrace_sector_state] = 0u;
		MEMORY_mem[dftrace_corridor_phase] = 0u;
		MEMORY_mem[dftrace_broad_visible_scrolls] = 0u;
		MEMORY_mem[dftrace_capital_drain_rows] = 0u;
		MEMORY_mem[dftrace_broad_schedule_index] = 0u;
		MEMORY_mem[dftrace_broad_turret_fired] = 0u;
		MEMORY_mem[dftrace_broad_turret_fired + 1u] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_hi] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_hi + 1u] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_lo] = 0u;
		MEMORY_mem[dftrace_muzzle_screen_lo + 1u] = 0u;
		dftrace_broadside_proof_sector_started = 1;
	}
	if (
		MEMORY_mem[dftrace_sector_state] >= 5u ||
		(MEMORY_mem[dftrace_muzzle_screen_hi] == 0u &&
		 MEMORY_mem[dftrace_muzzle_screen_hi + 1u] == 0u))
		return;
	for (slot = 0; slot < 3u; ++slot) {
		if (MEMORY_mem[dftrace_broad_state + slot] != 0u) {
			dftrace_broadside_proof_admitted = 1;
			return;
		}
	}
	/* Align only the production scheduler's due tick with an already-live,
	 * source-published muzzle. The released admission, allocation, warning,
	 * projectile, impact and release paths remain unmodified and measured. */
	MEMORY_mem[dftrace_broad_schedule_timer] = 1u;
}

static void dftrace_set_frontend_input(void)
{
	unsigned state = MEMORY_mem[dftrace_game_state];
	unsigned selection = MEMORY_mem[dftrace_frontend_selection];
	unsigned armed = MEMORY_mem[dftrace_frontend_input_armed];
	unsigned difficulty = MEMORY_mem[dftrace_difficulty_setting];
	unsigned stick = 0x0f;
	unsigned trigger = 1;
	if ((unsigned) Atari800_nframes < dftrace_frontend_delay) {
		dftrace_set_input(stick, trigger);
		return;
	}

	/* Use the production release/arm/dispatch gate and the real menu/options
	 * handlers. No gameplay state is seeded directly by the tracer. */
	if (armed != 0) {
		if (state == 1) {
			if (difficulty == dftrace_difficulty) {
				if (selection == 0)
					trigger = 0;
				else
					stick = 0x0e; /* UP */
			}
			else if (selection < 1)
				stick = 0x0d; /* DOWN to OPTIONS */
			else if (selection > 1)
				stick = 0x0e;
			else
				trigger = 0;
		}
		else if (state == 2) {
			if (difficulty != dftrace_difficulty) {
				if (selection < 2)
					stick = 0x0d;
				else if (selection > 2)
					stick = 0x0e;
				else
					stick = difficulty < dftrace_difficulty ? 0x07 : 0x0b;
			}
			else if (selection < 3)
				stick = 0x0d; /* BACK */
			else if (selection > 3)
				stick = 0x0e;
			else
				trigger = 0;
		}
		else if (state == 7)
			trigger = 0; /* GAME OVER -> production return to main menu */
	}
	dftrace_set_input(stick, trigger);
}

static unsigned dftrace_pickup_timer(void)
{
	return MEMORY_mem[dftrace_entity_timer + 2u] |
		((unsigned) MEMORY_mem[dftrace_entity_move_accumulator + 2u] << 8);
}

static unsigned dftrace_hash_bytes(unsigned address, unsigned length)
{
	unsigned index;
	unsigned value = 2166136261u;
	for (index = 0; index < length; ++index) {
		value ^= MEMORY_mem[(address + index) & 0xffffu];
		value *= 16777619u;
	}
	return value;
}

static void dftrace_snapshot_engine(DFTraceFrame *frame)
{
	unsigned address;
	unsigned index;
	unsigned display_list_base = 0x7f00u + dftrace_displayed_dlist_lo;
	unsigned row_address = MEMORY_mem[dftrace_playfield_row_lo] |
		((unsigned) MEMORY_mem[dftrace_playfield_row_hi] << 8);
	frame->engine_timer = MEMORY_mem[dftrace_engine_timer];
	frame->engine_phase = MEMORY_mem[dftrace_engine_phase];
	frame->corridor_phase = MEMORY_mem[dftrace_corridor_phase];
	frame->ring_flags = MEMORY_mem[dftrace_ring_flags];
	frame->engine_vscroll = ANTIC_VSCROL;
	if (row_address >= DFTRACE_RING_SCREEN && row_address < DFTRACE_RING_END)
		frame->engine_a2_head = (row_address - DFTRACE_RING_SCREEN) / 40u;
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		if (MEMORY_mem[address] == DFTRACE_ENGINE_ALLIED_CODE)
			++frame->engine_allied_cells;
		else if (MEMORY_mem[address] == DFTRACE_ENGINE_ENEMY_CODE)
			++frame->engine_enemy_cells;
	}
	/* Count capital glyphs only in the physical rows selected by the list
	 * ANTIC is currently displaying. The complete-ring engine counts above
	 * intentionally include backing; these identify first final-raster hull
	 * visibility for each character-colour bank instead. */
	for (index = 0; index < DFTRACE_RING_ROWS; ++index) {
		unsigned row = MEMORY_mem[display_list_base + 7u + index * 3u] |
			((unsigned) MEMORY_mem[display_list_base + 8u + index * 3u] << 8);
		unsigned column;
		for (column = 0; column < 40u; ++column) {
			unsigned code = MEMORY_mem[row + column];
			unsigned glyph = code & 0x7fu;
			if (glyph >= DFTRACE_CAPITAL_GLYPH_FIRST &&
				glyph <= DFTRACE_CAPITAL_GLYPH_LAST) {
				if ((code & 0x80u) == 0u)
					++frame->capital_visible_allied_cells;
				else
					++frame->capital_visible_enemy_cells;
			}
		}
	}
	frame->engine_charset_hash = dftrace_hash_bytes(
		DFTRACE_CHARSET + DFTRACE_ENGINE_ALLIED_GLYPH * 8u, 16u);
	frame->engine_displayed_dlist_lo = dftrace_displayed_dlist_lo;
	frame->engine_published_dlist_lo = dftrace_published_dlist_lo;
	frame->engine_active_dlist_lo = MEMORY_mem[dftrace_active_dlist_lo];
	frame->engine_next_dlist_lo = MEMORY_mem[dftrace_next_dlist_lo];
	frame->engine_row0_address = row_address;
	frame->engine_displayed_row0_address =
		MEMORY_mem[0x7f00u + dftrace_displayed_dlist_lo + 7u] |
		((unsigned) MEMORY_mem[0x7f00u + dftrace_displayed_dlist_lo + 8u] << 8);
	frame->engine_active_row0_address =
		MEMORY_mem[0x7f00u + frame->engine_active_dlist_lo + 7u] |
		((unsigned) MEMORY_mem[0x7f00u + frame->engine_active_dlist_lo + 8u] << 8);
	for (index = 0; index < 8u; ++index) {
		frame->engine_divider[index] = MEMORY_mem[0x4028u + index];
		frame->engine_recycled[index] = MEMORY_mem[DFTRACE_RING_END - 40u + index];
	}
}

static void dftrace_watch_engine_write(DFTraceFrame *frame)
{
	unsigned index;
	unsigned base = DFTRACE_CHARSET + DFTRACE_ENGINE_ALLIED_GLYPH * 8u;
	if (!dftrace_engine_previous_valid) {
		for (index = 0; index < 16u; ++index)
			dftrace_engine_previous[index] = MEMORY_mem[base + index];
		dftrace_engine_previous_valid = 1;
		return;
	}
	for (index = 0; index < 16u; ++index) {
		unsigned value = MEMORY_mem[base + index];
		if (value != dftrace_engine_previous[index]) {
			if (frame->engine_first_write_pc == 0u) {
				frame->engine_first_write_pc = dftrace_previous_pc;
				frame->engine_first_write_address = base + index;
				frame->engine_first_write_old = dftrace_engine_previous[index];
				frame->engine_first_write_new = value;
				frame->engine_first_write_scanline = ANTIC_ypos;
				frame->engine_first_write_cycle = ANTIC_XPOS;
			}
			dftrace_engine_previous[index] = value;
		}
	}
}

static void dftrace_watch_display_list_write(DFTraceFrame *frame)
{
	unsigned index;
	unsigned base = 0x7f00u + dftrace_displayed_dlist_lo;
	if (!dftrace_display_list_previous_valid) {
		for (index = 0; index < 75u; ++index)
			dftrace_display_list_previous[index] = MEMORY_mem[base + index];
		dftrace_display_list_previous_valid = 1;
		return;
	}
	for (index = 0; index < 75u; ++index) {
		unsigned value = MEMORY_mem[base + index];
		if (value != dftrace_display_list_previous[index]) {
			if (frame->engine_first_dlist_write_pc == 0u) {
				frame->engine_first_dlist_write_pc = dftrace_previous_pc;
				frame->engine_first_dlist_write_address = base + index;
				frame->engine_first_dlist_write_old =
					dftrace_display_list_previous[index];
				frame->engine_first_dlist_write_new = value;
				frame->engine_first_dlist_write_scanline = ANTIC_ypos;
				frame->engine_first_dlist_write_cycle = ANTIC_XPOS;
			}
			dftrace_display_list_previous[index] = value;
		}
	}
}

static void dftrace_watch_recycled_write(DFTraceFrame *frame)
{
	unsigned index;
	if (!dftrace_recycled_previous_valid) {
		for (index = 0; index < 40u; ++index)
			dftrace_recycled_previous[index] = MEMORY_mem[DFTRACE_RING_END - 40u + index];
		dftrace_recycled_previous_valid = 1;
		return;
	}
	for (index = 0; index < 40u; ++index) {
		unsigned value = MEMORY_mem[DFTRACE_RING_END - 40u + index];
		if (value != dftrace_recycled_previous[index]) {
			/* The recycled physical row is written by rotate_playfield_rows before
			 * the logical table changes. Ignore unrelated overlays: the diagnostic
			 * wants the first base-layer copy, which is the only write reached from
			 * the exported rotation store label. */
			if (frame->engine_first_recycled_write_pc == 0u &&
				dftrace_previous_pc >= dftrace_pc_rotate_start &&
				dftrace_previous_pc < dftrace_pc_rotate_end && index < 8u) {
				frame->engine_first_recycled_write_pc = dftrace_previous_pc;
				frame->engine_first_recycled_write_address = DFTRACE_RING_END - 40u + index;
				frame->engine_first_recycled_write_old =
					dftrace_recycled_previous[index];
				frame->engine_first_recycled_write_new = value;
				frame->engine_first_recycled_write_scanline = ANTIC_ypos;
				frame->engine_first_recycled_write_cycle = ANTIC_XPOS;
			}
			dftrace_recycled_previous[index] = value;
		}
	}
}

/* The optional integrity replay presses the physical OPTION key through the
 * production latch while Spread Shot is active. Host-only observation records
 * the timer on both sides; no guest state is seeded or repaired. */
static void dftrace_drive_pause_test(void)
{
	unsigned host_frame;
	unsigned state;
	unsigned timer;
	if (!dftrace_pause_test_enabled || dftrace_pause_test_completed)
		return;
	host_frame = (unsigned) Atari800_nframes;
	state = MEMORY_mem[dftrace_game_state];
	timer = dftrace_pickup_timer();
	INPUT_key_consol = INPUT_CONSOL_NONE;
	if (dftrace_pause_stage == 0u && state == 6u &&
		MEMORY_mem[dftrace_entity_state + 2u] == 4u &&
		timer >= 100u && timer <= 450u) {
		dftrace_pause_timer_before = timer;
		dftrace_pause_engine_timer_before = MEMORY_mem[dftrace_engine_timer];
		dftrace_pause_engine_phase_before = MEMORY_mem[dftrace_engine_phase];
		dftrace_pause_press_host = host_frame;
		dftrace_pause_stage = 1u;
	}
	if (dftrace_pause_stage == 1u) {
		if (host_frame <= dftrace_pause_press_host + 1u)
			INPUT_key_consol &= ~INPUT_CONSOL_OPTION;
		else
			dftrace_pause_stage = 2u;
	}
	if (dftrace_pause_stage == 2u && state == 8u) {
		if (dftrace_pause_enter_host == 0xffffffffu) {
			dftrace_pause_enter_host = host_frame;
			/* The trigger can occur after the gameplay OPTION poll, allowing one
			 * final legal active tick. Measure the freeze from actual PAUSED entry,
			 * not from the earlier host-side request. */
			dftrace_pause_timer_before = timer;
			dftrace_pause_engine_timer_before = MEMORY_mem[dftrace_engine_timer];
			dftrace_pause_engine_phase_before = MEMORY_mem[dftrace_engine_phase];
		}
		if (host_frame >= dftrace_pause_enter_host + 25u) {
			dftrace_pause_press_host = host_frame;
			dftrace_pause_stage = 3u;
		}
	}
	if (dftrace_pause_stage == 3u) {
		if (host_frame <= dftrace_pause_press_host + 1u)
			INPUT_key_consol &= ~INPUT_CONSOL_OPTION;
		else
			dftrace_pause_stage = 4u;
	}
	if (dftrace_pause_stage == 4u && state == 6u) {
		dftrace_pause_timer_after = timer;
		dftrace_pause_engine_timer_after = MEMORY_mem[dftrace_engine_timer];
		dftrace_pause_engine_phase_after = MEMORY_mem[dftrace_engine_phase];
		dftrace_pause_host_frames = host_frame - dftrace_pause_enter_host;
		dftrace_pause_test_completed = 1u;
	}
}

static uint64_t dftrace_clock(void)
{
	return (uint64_t) ANTIC_CPU_CLOCK;
}

static int dftrace_is_capital_shell_code(unsigned value)
{
	value &= 0xffu;
	return value == 126u || value == 127u || value == 254u || value == 255u;
}

#define DFTRACE_MISSILES 0x3b00u

static unsigned dftrace_broad_pmg_orphan_rows_for_slot(unsigned slot)
{
	unsigned row;
	unsigned count = 0u;
	unsigned mask = 0x0cu << (slot * 2u);
	unsigned state = MEMORY_mem[dftrace_broad_state + slot];
	unsigned height = MEMORY_mem[dftrace_broad_state + 21u + slot];
	unsigned first = MEMORY_mem[dftrace_broad_state + 18u + slot];
	for (row = 0u; row < 256u; ++row) {
		unsigned expected = state != 2u && height != 0u &&
			row >= first && row < first + height;
		if ((MEMORY_mem[DFTRACE_MISSILES + row] & mask) != 0u && !expected)
			++count;
	}
	return count;
}

static int dftrace_broad_live_owns_address(unsigned address)
{
	unsigned slot;
	for (slot = 0u; slot < 3u; ++slot) {
		unsigned pointer;
		unsigned token;
		unsigned first;
		if (MEMORY_mem[dftrace_broad_state + slot] != 2u)
			continue;
		token = MEMORY_mem[dftrace_broad_state + 21u + slot];
		if (token == 0u)
			continue;
		pointer = MEMORY_mem[dftrace_broad_row_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_broad_row_hi + slot] << 8);
		first = pointer + token - 1u;
		if (address == first || address == first + 1u)
			return 1;
	}
	return 0;
}

static unsigned dftrace_broad_orphan_codes(void)
{
	unsigned row;
	unsigned column;
	unsigned count = 0u;
	for (column = 8u; column < 32u; ++column) {
		unsigned address = DFTRACE_DIVIDER_SCREEN + column;
		if (dftrace_is_capital_shell_code(MEMORY_mem[address]) &&
			!dftrace_broad_live_owns_address(address))
			++count;
	}
	for (row = 0u; row < DFTRACE_RING_ROWS; ++row) {
		for (column = 8u; column < 32u; ++column) {
			unsigned address = DFTRACE_RING_SCREEN + row * 40u + column;
			if (dftrace_is_capital_shell_code(MEMORY_mem[address]) &&
				!dftrace_broad_live_owns_address(address))
				++count;
		}
	}
	return count;
}

static unsigned dftrace_broad_screen_transient_cells(void)
{
	unsigned address;
	unsigned count = 0u;
	for (address = DFTRACE_DIVIDER_SCREEN;
		address < DFTRACE_DIVIDER_SCREEN + 40u; ++address)
		if (dftrace_is_capital_shell_code(MEMORY_mem[address]))
			++count;
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address)
		if (dftrace_is_capital_shell_code(MEMORY_mem[address]))
			++count;
	return count;
}

static void dftrace_snapshot_broad_transients(DFTraceFrame *frame)
{
	unsigned address;
	unsigned slot;
	frame->broad_screen_orphan_cells = 0u;
	frame->broad_screen_first_address = 0u;
	frame->broad_screen_first_code = 0u;
	frame->broad_screen_missing_cells = 0u;
	for (address = DFTRACE_DIVIDER_SCREEN;
		address < DFTRACE_DIVIDER_SCREEN + 40u; ++address) {
		if (dftrace_is_capital_shell_code(MEMORY_mem[address]) &&
			!dftrace_broad_live_owns_address(address)) {
			if (frame->broad_screen_orphan_cells == 0u) {
				frame->broad_screen_first_address = address;
				frame->broad_screen_first_code = MEMORY_mem[address];
			}
			++frame->broad_screen_orphan_cells;
		}
	}
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		if (dftrace_is_capital_shell_code(MEMORY_mem[address]) &&
			!dftrace_broad_live_owns_address(address)) {
			if (frame->broad_screen_orphan_cells == 0u) {
				frame->broad_screen_first_address = address;
				frame->broad_screen_first_code = MEMORY_mem[address];
			}
			++frame->broad_screen_orphan_cells;
		}
	}
	for (slot = 0u; slot < 3u; ++slot) {
		unsigned pointer;
		unsigned token;
		unsigned first;
		unsigned cell;
		if (MEMORY_mem[dftrace_broad_state + slot] != 2u)
			continue;
		token = MEMORY_mem[dftrace_broad_state + 21u + slot];
		if (token == 0u)
			continue;
		pointer = MEMORY_mem[dftrace_broad_row_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_broad_row_hi + slot] << 8);
		first = pointer + token - 1u;
		for (cell = 0u; cell < 2u; ++cell)
			if (!dftrace_is_capital_shell_code(MEMORY_mem[first + cell]))
				++frame->broad_screen_missing_cells;
	}
	frame->broad_pmg_first_slot = 0xffffffffu;
	frame->broad_pmg_first_row = 0xffffffffu;
	frame->broad_pmg_first_value = 0u;
	frame->broad_pmg_first_writer_pc = 0u;
	for (slot = 0u; slot < 3u; ++slot) {
		unsigned row;
		unsigned mask = 0x0cu << (slot * 2u);
		unsigned state = MEMORY_mem[dftrace_broad_state + slot];
		unsigned height = MEMORY_mem[dftrace_broad_state + 21u + slot];
		unsigned first = MEMORY_mem[dftrace_broad_state + 18u + slot];
		frame->broad_pmg_orphan_rows[slot] =
			dftrace_broad_pmg_orphan_rows_for_slot(slot);
		frame->broad_pmg_missing_rows[slot] = 0u;
		if (state != 2u && height != 0u)
			for (row = first; row < first + height && row < 256u; ++row)
				if ((MEMORY_mem[DFTRACE_MISSILES + row] & mask) == 0u)
					++frame->broad_pmg_missing_rows[slot];
		if (frame->broad_pmg_first_slot != 0xffffffffu ||
			frame->broad_pmg_orphan_rows[slot] == 0u)
			continue;
		for (row = 0u; row < 256u; ++row) {
			unsigned expected = state != 2u && height != 0u &&
				row >= first && row < first + height;
			if ((MEMORY_mem[DFTRACE_MISSILES + row] & mask) != 0u && !expected) {
				frame->broad_pmg_first_slot = slot;
				frame->broad_pmg_first_row = row;
				frame->broad_pmg_first_value = MEMORY_mem[DFTRACE_MISSILES + row];
				frame->broad_pmg_first_writer_pc = dftrace_pmg_last_writer[row];
				break;
			}
		}
	}
}

static void dftrace_broad_compositor_event(const char *event, unsigned slot)
{
	unsigned index;
	unsigned pointer = 0u;
	unsigned token = 0u;
	unsigned first = 0u;
	DFTracePhysicalBounds player = dftrace_player_physical_bounds();
	if (dftrace_broad_compositor_file == NULL)
		return;
	if (slot < 3u) {
		pointer = MEMORY_mem[dftrace_broad_row_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_broad_row_hi + slot] << 8);
		token = MEMORY_mem[dftrace_broad_state + 21u + slot];
		if (token != 0u)
			first = pointer + token - 1u;
		else {
			unsigned x = MEMORY_mem[dftrace_broad_state + 9u + slot];
			first = pointer + (((x - 48u) & 0xffu) >> 2);
		}
	}
	fprintf(dftrace_broad_compositor_file,
		"{\"frame\":%u,\"host_frame\":%u,\"clock\":%llu,\"event\":\"%s\","
		"\"slot\":%u,\"address\":[%u,%u],\"cell\":[%u,%u],\"orphan_codes\":%u,"
		"\"pmg_tables\":[%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u],"
		"\"player_physical\":{\"valid\":%u,\"hpos\":[%u,%u],\"size\":[%u,%u],"
		"\"pmg_dma\":[%u,%u],\"raster\":[%u,%u,%u,%u]},\"slots\":[",
		dftrace_count, (unsigned) Atari800_nframes,
		(unsigned long long) dftrace_clock(), event, slot, first, first + 1u,
		first == 0u ? 0u : MEMORY_mem[first],
		first == 0u ? 0u : MEMORY_mem[first + 1u], dftrace_broad_orphan_codes(),
		MEMORY_mem[0x37feu], MEMORY_mem[0x37ffu], MEMORY_mem[0x3800u],
		MEMORY_mem[0x3801u], MEMORY_mem[0x3802u], MEMORY_mem[0x3803u],
		MEMORY_mem[0x3804u], MEMORY_mem[0x3805u], MEMORY_mem[0x3806u],
		MEMORY_mem[0x3807u], MEMORY_mem[0x3808u], MEMORY_mem[0x3809u],
		player.valid, GTIA_HPOSP0, GTIA_HPOSP3, GTIA_SIZEP0, GTIA_SIZEP3,
		player.dma_top, player.dma_bottom, player.left, player.right,
		player.top, player.bottom);
	for (index = 0u; index < 3u; ++index) {
		unsigned row_pointer = MEMORY_mem[dftrace_broad_row_lo + index] |
			((unsigned) MEMORY_mem[dftrace_broad_row_hi + index] << 8);
		unsigned previous = MEMORY_mem[dftrace_broad_state + 21u + index];
		unsigned cell_address = previous == 0u ? 0u : row_pointer + previous - 1u;
		/* The main loop is building the raster selected by ACTIVE_DLIST.  The
		 * host framebuffer and displayed_dlist_lo still describe the preceding
		 * completed raster until the next ANTIC frame boundary. */
		DFTracePhysicalBounds bolt = dftrace_bolt_physical_bounds(index,
			MEMORY_mem[dftrace_active_dlist_lo]);
		if (index != 0u)
			fputc(',', dftrace_broad_compositor_file);
		fprintf(dftrace_broad_compositor_file,
			"{\"slot\":%u,\"owner\":%u,\"state\":%u,\"x\":%u,\"y\":%u,"
			"\"raster_x\":%u,\"raster_y\":%u,"
			"\"row_pointer\":%u,\"previous_token\":%u,\"backing\":[%u,%u],"
			"\"footprint_address\":[%u,%u],\"footprint_cell\":[%u,%u],"
			"\"physical\":{\"valid\":%u,\"display_list\":%u,"
			"\"display_instruction\":%u,\"screen_column\":%u,"
			"\"screen_codes\":[%u,%u],\"glyph_rows\":[%u,%u],"
			"\"raster\":[%u,%u,%u,%u],\"cache_top\":%u}}",
			index, MEMORY_mem[dftrace_broad_state + 3u + index],
			MEMORY_mem[dftrace_broad_state + index],
			MEMORY_mem[dftrace_broad_state + 9u + index],
			MEMORY_mem[dftrace_broad_state + 12u + index],
			MEMORY_mem[dftrace_broad_state + 9u + index] & 0xfcu,
			MEMORY_mem[dftrace_broad_state + 12u + index], row_pointer, previous,
			MEMORY_mem[dftrace_broad_state + 18u + index],
			MEMORY_mem[dftrace_broad_state + 24u + index], cell_address,
			cell_address == 0u ? 0u : cell_address + 1u,
			cell_address == 0u ? 0u : MEMORY_mem[cell_address],
			cell_address == 0u ? 0u : MEMORY_mem[cell_address + 1u],
			bolt.valid, bolt.display_list, bolt.display_instruction,
			bolt.screen_column, bolt.code_left, bolt.code_right,
			bolt.glyph_first_row, bolt.glyph_last_row,
			bolt.left, bolt.right, bolt.top, bolt.bottom, bolt.cache_top);
	}
	fprintf(dftrace_broad_compositor_file, "]}\n");
}

static void dftrace_capture_capital_contact_decision(unsigned pc, unsigned slot)
{
	char path[1024];
	DFTracePhysicalBounds *player;
	DFTracePhysicalBounds *bolt;
	unsigned current_left;
	unsigned current_right;
	unsigned sweep_left;
	unsigned sweep_right;
	int requested_geometry;
	if (dftrace_capital_contact_prefix == NULL ||
		*dftrace_capital_contact_prefix == '\0' ||
		dftrace_capital_contact_count != 0u || slot >= 3u ||
		MEMORY_mem[dftrace_broad_state + 3u + slot] != dftrace_capital_contact_owner)
		return;
	if ((dftrace_capital_contact_mode == 3u &&
		 pc != dftrace_pc_capital_player_aabb_miss) ||
		(dftrace_capital_contact_mode != 3u &&
		 pc != dftrace_pc_capital_player_aabb_hit))
		return;
	if (dftrace_capital_contact_mode != 3u &&
		MEMORY_mem[dftrace_broad_state + 30u] != 0u)
		return;
	player = &dftrace_last_player_physical;
	bolt = &dftrace_last_bolt_physical[slot];
	if (dftrace_last_physical_frame[slot] != dftrace_count ||
		!player->valid || !bolt->valid)
		return;
	current_left = MEMORY_mem[dftrace_broad_state + 9u + slot] & 0xfcu;
	current_right = current_left + 7u;
	sweep_left = bolt->left < current_left ? bolt->left : current_left;
	sweep_right = bolt->right > current_right ? bolt->right : current_right;
	if (sweep_left > player->right || sweep_right < player->left)
		return;
	requested_geometry = dftrace_capital_contact_mode == 0u ?
		bolt->bottom == player->top :
		dftrace_capital_contact_mode == 1u ?
		bolt->top == player->top + 4u :
		dftrace_capital_contact_mode == 2u ?
		bolt->top == player->bottom :
		bolt->bottom + 1u == player->top;
	if (!requested_geometry)
		return;
	/* At the branch PC, screen RAM still represents the completed preceding
	 * raster.  Retain it as frame zero; subsequent main-loop entries capture
	 * the raster produced by this decision and its successors. */
	dftrace_broad_compositor_event("screenshot_capture_begin", slot);
	snprintf(path, sizeof(path), "%s-%02u.png",
		dftrace_capital_contact_prefix, dftrace_capital_contact_count);
	if (!Screen_SaveScreenshot(path, 0)) {
		fprintf(stderr, "voidstrike65 trace: capital contact screenshot failed: %s\n",
			path);
		exit(2);
	}
	dftrace_capital_contact_count = 1u;
	dftrace_capital_contact_primed = 1;
}

static void dftrace_remember_capital_physical(unsigned slot)
{
	if (slot >= 3u)
		return;
	dftrace_last_player_physical = dftrace_player_physical_bounds();
	dftrace_last_bolt_physical[slot] = dftrace_bolt_physical_bounds(slot,
		MEMORY_mem[dftrace_active_dlist_lo]);
	dftrace_last_physical_frame[slot] = dftrace_count;
}

/* draw_enemy_member publishes a member's 16-row P1/P2 body only on frames where
 * its Y moved; the licence for the skip is the invariant "the plane already
 * holds the body at the member's current Y".  Verify it directly rather than
 * trusting it: rebuild the expected plane from ENEMY_MEMBER_STATE, ENEMY_Y,
 * ENEMY_ARCHETYPE and the archetype body table, and count the visible rows that
 * differ.  A correct build reads 0 on every traced frame. */
/* The capsule on the missile plane: how many rows carry any missile bit, which
 * of the four missiles the silhouette uses anywhere, and how many contiguous
 * runs those rows form. One capsule is one run; a trail or a stale image left
 * behind by a failed erase is two or more. */
static void dftrace_measure_pickup_missiles(unsigned *rows, unsigned *row_union,
	unsigned *blocks)
{
	unsigned row;
	int inside = 0;
	*rows = 0u;
	*row_union = 0u;
	*blocks = 0u;
	for (row = 0u; row < 256u; ++row) {
		unsigned value = MEMORY_mem[0x3b00u + row];
		if (value != 0u) {
			++*rows;
			*row_union |= value;
			if (!inside) {
				++*blocks;
				inside = 1;
			}
		}
		else
			inside = 0;
	}
	/* The plane is a 256-row page and the capsule's last three raster positions
	 * start at row 242 or later, so their sixteen rows legitimately wrap onto
	 * rows 0-1. Count the runs around the wrap: that is still one capsule. */
	if (*blocks > 1u && MEMORY_mem[0x3b00u] != 0u && MEMORY_mem[0x3bffu] != 0u)
		--*blocks;
}

static void dftrace_snapshot_enemy_pmg_mismatch(DFTraceFrame *frame, int accumulate)
{
	unsigned slot;
	unsigned archetype = MEMORY_mem[dftrace_enemy_archetype];
	unsigned height = MEMORY_mem[(dftrace_enemy_frame_heights + archetype) & 0xffffu];
	unsigned body = (dftrace_enemy_body_data + archetype * 16u) & 0xffffu;
	for (slot = 0u; slot < 2u; ++slot) {
		unsigned plane = 0x3d00u + slot * 0x100u;
		unsigned live = MEMORY_mem[dftrace_enemy_member_state + slot] != 0u;
		unsigned y = MEMORY_mem[dftrace_enemy_y + slot];
		unsigned mismatch = 0u;
		unsigned first = DFTRACE_ENEMY_PMG_NO_ROW;
		unsigned row;
		for (row = DFTRACE_ENEMY_PMG_TOP; row < DFTRACE_ENEMY_PMG_BOTTOM; ++row) {
			unsigned expected = 0u;
			if (live && row >= y && row < y + height)
				expected = MEMORY_mem[(body + (row - y)) & 0xffffu];
			if (MEMORY_mem[(plane + row) & 0xffffu] == expected)
				continue;
			++mismatch;
			if (first == DFTRACE_ENEMY_PMG_NO_ROW)
				first = row;
		}
		if (accumulate && frame->enemy_pmg_mismatch[slot] >= mismatch)
			continue;
		frame->enemy_pmg_mismatch[slot] = mismatch;
		frame->enemy_pmg_mismatch_row[slot] = first;
		frame->enemy_pmg_mismatch_writer[slot] = first == DFTRACE_ENEMY_PMG_NO_ROW
			? 0u : dftrace_enemy_pmg_last_writer[slot][first];
	}
}

static void dftrace_snapshot(DFTraceFrame *frame)
{
	unsigned pickup_row;
	frame->dma_ctl = ANTIC_DMACTL;
	frame->nmi_en = ANTIC_NMIEN;
	frame->projectiles = dftrace_count_nonzero(dftrace_projectile_active,
		DFTRACE_PROJECTILE_ARRAY_STRIDE);
	frame->broadside = dftrace_count_nonzero(dftrace_broad_state, 3);
	frame->far_rendered = dftrace_count_far_rendered();
	frame->live_interceptor = MEMORY_mem[dftrace_enemy_active] == 1;
	frame->fighter_explosion = dftrace_count_nonzero(dftrace_fighter_explosion_timer, 2);
	frame->capital_explosion = dftrace_count_nonzero(dftrace_capital_explosion_timer, 2);
	frame->music_active = MEMORY_mem[dftrace_music_active] != 0;
	frame->fire_sfx = MEMORY_mem[dftrace_fire_timer] != 0;
	frame->hit_sfx = MEMORY_mem[dftrace_hit_timer] != 0;
	frame->capital_sfx = MEMORY_mem[dftrace_capital_sound_timer] != 0;
	frame->sound_enabled = MEMORY_mem[dftrace_sound_enabled] != 0;
	frame->player_lifecycle = MEMORY_mem[dftrace_player_lifecycle];
	frame->player_x = MEMORY_mem[dftrace_player_x];
	frame->player_y = MEMORY_mem[dftrace_player_y];
	frame->player_health = MEMORY_mem[dftrace_broad_state + 29u];
	frame->player_lives = MEMORY_mem[dftrace_player_lifecycle + 1u];
	frame->player_invulnerability = MEMORY_mem[dftrace_player_lifecycle + 2u];
	frame->player_damage_cooldown = MEMORY_mem[dftrace_broad_state + 30u];
	frame->player_damage_applied = MEMORY_mem[dftrace_broad_state + 37u];
	frame->prior = GTIA_PRIOR;
	frame->sector_state = MEMORY_mem[dftrace_sector_state];
	frame->gameplay_frame = MEMORY_mem[dftrace_gameplay_frame];
	frame->active_gameplay_frame = MEMORY_mem[dftrace_active_gameplay_frame_lo] |
		((unsigned) MEMORY_mem[dftrace_active_gameplay_frame_lo + 1u] << 8);
	frame->enemy_state = MEMORY_mem[dftrace_enemy_active];
	frame->enemy_y = MEMORY_mem[dftrace_enemy_y];
	for (unsigned slot = 0u; slot < 2u; ++slot) {
		frame->enemy_slot_x[slot] = MEMORY_mem[dftrace_enemy_x + slot];
		frame->enemy_slot_y[slot] = MEMORY_mem[dftrace_enemy_y + slot];
		frame->enemy_hpos[slot] = slot == 0u ? GTIA_HPOSP1 : GTIA_HPOSP2;
		frame->enemy_pmg_rows[slot] = dftrace_count_nonzero(0x3d00u + slot * 0x100u, 256u);
	}
	dftrace_snapshot_enemy_pmg_mismatch(frame, 0);
	for (unsigned member = 0u; member < 3u; ++member) {
		frame->enemy_member_state[member] = MEMORY_mem[dftrace_enemy_member_state + member];
		frame->enemy_member_hp[member] = MEMORY_mem[dftrace_enemy_hp + member];
	}
	frame->enemy_live_count = MEMORY_mem[dftrace_enemy_live_count];
	frame->enemy_projectiles = dftrace_count_nonzero(
		dftrace_projectile_active + DFTRACE_INTERCEPTOR_SLOT_BASE,
		DFTRACE_INTERCEPTOR_SLOT_COUNT);
	frame->director_phase = MEMORY_mem[dftrace_director_state];
	frame->director_rng = MEMORY_mem[dftrace_director_state + 5u];
	frame->director_intensity = MEMORY_mem[dftrace_director_state + 2u];
	frame->director_reaction = MEMORY_mem[dftrace_director_state + 3u];
	frame->director_recovery = MEMORY_mem[dftrace_director_state + 4u];
	frame->difficulty = MEMORY_mem[dftrace_difficulty_setting];
	frame->active_muzzles = dftrace_count_nonzero(dftrace_muzzle_screen_hi, 2);
	frame->entity_active = MEMORY_mem[dftrace_entity_active_count];
	frame->entity_x = MEMORY_mem[dftrace_entity_x];
	frame->entity_y = MEMORY_mem[dftrace_entity_y];
	frame->entity_vx = MEMORY_mem[dftrace_entity_vx];
	frame->entity_move_accumulator = MEMORY_mem[dftrace_entity_move_accumulator];
	frame->entity_vertical_accumulator = MEMORY_mem[dftrace_entity_vertical_accumulator];
	frame->entity_render_id = MEMORY_mem[dftrace_entity_render_id];
	frame->entity_active_mask = MEMORY_mem[dftrace_entity_active_mask];
	frame->pickup_booster_state = MEMORY_mem[dftrace_entity_state + 2u];
	frame->pickup_state = MEMORY_mem[dftrace_entity_state + 1u] != 0u ?
		MEMORY_mem[dftrace_entity_state + 1u] : frame->pickup_booster_state;
	frame->pickup_counter = MEMORY_mem[dftrace_entity_hp + 1u];
	frame->pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
	frame->pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
	frame->pickup_timer_lo = MEMORY_mem[dftrace_entity_timer +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_timer_hi = MEMORY_mem[dftrace_entity_move_accumulator +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_animation = MEMORY_mem[dftrace_entity_owner +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_render_id = MEMORY_mem[dftrace_entity_render_id + 1u];
	frame->pickup_drawn_mask = MEMORY_mem[dftrace_entity_drawn_mask + 1u];
	frame->pickup_pmg_rows = 0u;
	for (pickup_row = 0u; pickup_row < 256u; ++pickup_row) {
		if ((MEMORY_mem[0x3b00u + pickup_row] & 0xf0u) != 0u)
			++frame->pickup_pmg_rows;
	}
	dftrace_measure_pickup_missiles(&frame->pickup_missile_rows,
		&frame->pickup_missile_union, &frame->pickup_missile_blocks);
	frame->pickup_hposm[0] = GTIA_HPOSM0;
	frame->pickup_hposm[1] = GTIA_HPOSM1;
	frame->pickup_hposm[2] = GTIA_HPOSM2;
	frame->pickup_hposm[3] = GTIA_HPOSM3;
	frame->pickup_sizem = GTIA_SIZEM;
	frame->pickup_screen_lo = MEMORY_mem[dftrace_entity_screen_lo + 1u];
	frame->pickup_screen_hi = MEMORY_mem[dftrace_entity_screen_hi + 1u];
	frame->pickup_pmg_byte_top = frame->pickup_screen_hi == 0u ? 0u :
		MEMORY_mem[0x3b00u + frame->pickup_screen_lo];
	frame->pickup_pmg_byte_middle = frame->pickup_screen_hi == 0u ? 0u :
		MEMORY_mem[0x3b00u + frame->pickup_screen_lo + 7u];
	frame->pickup_pmg_byte_bottom = frame->pickup_screen_hi == 0u ? 0u :
		MEMORY_mem[0x3b00u + frame->pickup_screen_lo + 15u];
	frame->pickup_gractl = GTIA_GRACTL;
	for (unsigned slot = 0u; slot < 4u; ++slot) {
		frame->entity_type[slot] = MEMORY_mem[dftrace_entity_type + slot];
		frame->entity_state[slot] = MEMORY_mem[dftrace_entity_state + slot];
	}
	frame->score_lo = MEMORY_mem[dftrace_score_lo];
	frame->score_hi = MEMORY_mem[dftrace_score_hi];
}

static unsigned dftrace_logical_row_address(unsigned row)
{
	if (row == 0u)
		return DFTRACE_DIVIDER_SCREEN;
	if (row > DFTRACE_RING_ROWS)
		return 0u;
	return MEMORY_mem[dftrace_playfield_row_lo + row - 1u] |
		(MEMORY_mem[dftrace_playfield_row_hi + row - 1u] << 8);
}

static int dftrace_interceptor_display_position(unsigned address,
	unsigned *raster_row, unsigned *raster_column)
{
	unsigned row;
	if (address >= DFTRACE_DIVIDER_SCREEN && address < DFTRACE_DIVIDER_SCREEN + 40u) {
		*raster_row = 0u;
		*raster_column = address - DFTRACE_DIVIDER_SCREEN;
		return 1;
	}
	for (row = 0u; row < DFTRACE_RING_ROWS; ++row) {
		unsigned base = 0x7f00u + dftrace_displayed_dlist_lo;
		unsigned pointer = MEMORY_mem[base + 7u + row * 3u] |
			((unsigned) MEMORY_mem[base + 8u + row * 3u] << 8);
		if (address >= pointer && address < pointer + 40u) {
			*raster_row = row + 1u;
			*raster_column = address - pointer;
			return 1;
		}
	}
	*raster_row = 0xffffffffu;
	*raster_column = 0xffffffffu;
	return 0;
}

/* Diagnostic-only first-writer journal. The observer runs immediately after
 * the previous instruction completed, so the previous PC plus the unchanged
 * X/Y registers identify the exact effective address of every production
 * store used by screen, ring and PMG publishers. No guest byte is modified. */
static int dftrace_first_writer_effective_address(unsigned pc,
	unsigned x_register, unsigned y_register, unsigned *address)
{
	unsigned opcode = MEMORY_mem[pc];
	unsigned operand = MEMORY_mem[(pc + 1u) & 0xffffu];
	unsigned base;
	switch (opcode) {
	case 0x81u: /* STA (zp,X) */
		operand = (operand + x_register) & 0xffu;
		*address = MEMORY_mem[operand] |
			((unsigned) MEMORY_mem[(operand + 1u) & 0xffu] << 8);
		return 1;
	case 0x91u: /* STA (zp),Y */
		base = MEMORY_mem[operand] |
			((unsigned) MEMORY_mem[(operand + 1u) & 0xffu] << 8);
		*address = (base + y_register) & 0xffffu;
		return 1;
	case 0x8du: /* STA abs */
	case 0x8eu: /* STX abs */
	case 0x8cu: /* STY abs */
	case 0xeeu: /* INC abs */
	case 0xceu: /* DEC abs */
	case 0x0eu: /* ASL abs */
	case 0x4eu: /* LSR abs */
	case 0x2eu: /* ROL abs */
	case 0x6eu: /* ROR abs */
		*address = operand |
			((unsigned) MEMORY_mem[(pc + 2u) & 0xffffu] << 8);
		return 1;
	case 0x9du: /* STA abs,X */
	case 0xfeu: /* INC abs,X */
	case 0xdeu: /* DEC abs,X */
	case 0x1eu: /* ASL abs,X */
	case 0x5eu: /* LSR abs,X */
	case 0x3eu: /* ROL abs,X */
	case 0x7eu: /* ROR abs,X */
		base = operand | ((unsigned) MEMORY_mem[(pc + 2u) & 0xffffu] << 8);
		*address = (base + x_register) & 0xffffu;
		return 1;
	case 0x99u: /* STA abs,Y */
		base = operand | ((unsigned) MEMORY_mem[(pc + 2u) & 0xffffu] << 8);
		*address = (base + y_register) & 0xffffu;
		return 1;
	default:
		return 0;
	}
}

/* Diagnostic-only Player PairShot lifecycle/publication journal. It observes
 * completed production stores and never writes guest state. */
static void dftrace_player_pairshot_frame_begin(void)
{
	unsigned slot;
	if (dftrace_player_pairshot_output == NULL)
		return;
	for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot) {
		dftrace_player_pairshot_before_active[slot] =
			MEMORY_mem[dftrace_projectile_active + slot];
		dftrace_player_pairshot_before_y[slot] = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u + slot];
		dftrace_player_pairshot_before_lifetime[slot] = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 4u + slot];
		dftrace_player_pairshot_active_shadow[slot] =
			dftrace_player_pairshot_before_active[slot];
		dftrace_player_pairshot_update_count[slot] = 0u;
		dftrace_player_pairshot_render_count[slot] = 0u;
		dftrace_player_pairshot_write_count[slot] = 0u;
		dftrace_player_pairshot_allocations[slot] = 0u;
		dftrace_player_pairshot_releases[slot] = 0u;
		dftrace_player_pairshot_selected_code[slot] = 0xffffffffu;
		dftrace_player_pairshot_published_code[slot] = 0xffffffffu;
		dftrace_player_pairshot_publication_writer[slot] = 0u;
	}
	dftrace_player_pairshot_glyph_writes = 0u;
	dftrace_player_pairshot_glyph_last_writer = 0u;
	dftrace_player_pairshot_gameplay_chbase_writes = 0u;
	dftrace_player_pairshot_hud_chbase_writes = 0u;
}

static void dftrace_player_pairshot_track(unsigned pc,
	unsigned x_register, unsigned y_register)
{
	unsigned address;
	if (dftrace_player_pairshot_output == NULL)
		return;
	if (pc == dftrace_pc_claim_projectile &&
		x_register < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT)
		++dftrace_player_pairshot_render_count[x_register];
	if (pc == dftrace_pc_compose_start &&
		x_register < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT)
		dftrace_player_pairshot_selected_code[x_register] =
			MEMORY_mem[dftrace_loader_repeat_value] & 0x7fu;
	if (dftrace_previous_pc == 0u ||
		!dftrace_first_writer_effective_address(dftrace_previous_pc,
			x_register, y_register, &address))
		return;
	if (address >= DFTRACE_CHARSET + DFTRACE_PLAYER_GLYPH_FIRST * 8u &&
		address < DFTRACE_CHARSET +
			(DFTRACE_PLAYER_GLYPH_FIRST + DFTRACE_PLAYER_GLYPH_COUNT) * 8u) {
		++dftrace_player_pairshot_glyph_writes;
		dftrace_player_pairshot_glyph_last_writer = dftrace_previous_pc;
	}
	if (address == 0xd409u) {
		if (ANTIC_CHBASE == 0x44u) {
			++dftrace_player_pairshot_gameplay_chbase_writes;
			dftrace_player_pairshot_gameplay_chbase_writer = dftrace_previous_pc;
			dftrace_player_pairshot_gameplay_chbase_host =
				(unsigned) Atari800_nframes;
		}
		else if (ANTIC_CHBASE == 0x50u) {
			++dftrace_player_pairshot_hud_chbase_writes;
			dftrace_player_pairshot_hud_chbase_writer = dftrace_previous_pc;
			dftrace_player_pairshot_hud_chbase_host =
				(unsigned) Atari800_nframes;
		}
	}
	if (address >= dftrace_projectile_active &&
		address < dftrace_projectile_active + DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT) {
		unsigned slot = address - dftrace_projectile_active;
		unsigned prior = dftrace_player_pairshot_active_shadow[slot];
		unsigned active = MEMORY_mem[address];
		if (prior == 0u && active != 0u) {
			++dftrace_player_pairshot_allocations[slot];
			dftrace_player_pairshot_allocation_frame[slot] = dftrace_count;
		}
		else if (prior != 0u && active == 0u) {
			++dftrace_player_pairshot_releases[slot];
			dftrace_player_pairshot_release_frame[slot] = dftrace_count;
		}
		dftrace_player_pairshot_active_shadow[slot] = active;
	}
	if (address >= dftrace_projectile_active + DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u &&
		address < dftrace_projectile_active + DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u +
			DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT &&
		dftrace_previous_pc >= dftrace_pc_projectile_update_start &&
		dftrace_previous_pc < dftrace_pc_interceptor_update_start)
		++dftrace_player_pairshot_update_count[address -
			(dftrace_projectile_active + DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u)];
	if (((address >= DFTRACE_DIVIDER_SCREEN &&
		address < DFTRACE_DIVIDER_SCREEN + 40u) ||
		(address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END)) &&
		dftrace_previous_pc >= dftrace_pc_render_slot &&
		dftrace_previous_pc < dftrace_pc_render_end &&
		x_register < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT) {
		unsigned owned = MEMORY_mem[dftrace_projectile_screen_lo + x_register] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + x_register] << 8);
		if (address == owned)
		{
			++dftrace_player_pairshot_write_count[x_register];
			dftrace_player_pairshot_published_code[x_register] =
				MEMORY_mem[address] & 0x7fu;
			dftrace_player_pairshot_publication_writer[x_register] =
				dftrace_previous_pc;
			if (dftrace_player_pairshot_selected_code[x_register] == 0xffffffffu)
				dftrace_player_pairshot_selected_code[x_register] =
					dftrace_player_pairshot_published_code[x_register];
		}
	}
}

static void dftrace_write_player_pairshots(DFTraceFrame *frame)
{
	FILE *file;
	unsigned slot;
	if (dftrace_player_pairshot_output == NULL)
		return;
	file = fopen(dftrace_player_pairshot_output,
		dftrace_player_pairshot_output_initialised ? "a" : "w");
	if (file == NULL) {
		perror("voidstrike65 player PairShot trace");
		exit(2);
	}
	if (!dftrace_player_pairshot_output_initialised) {
		fputs("session,frame,host_frame,pal_frame,slot,active_before,active_after,weapon_mode,y_before,y_after,delta_y,update_count,render_count,character_write_count,lifetime_before,lifetime_after,allocation_count,release_count,allocation_frame,release_frame,rendered,screen_address,screen_code,screen_row,screen_top,render_phase,expected_phase,phase_match,visible_y,fire_input,fire_accepts,burst_state,burst_remaining,burst_timer,active_player_pairshots,active_enemy_pairshots,sector_state,world_event,effects_active,gameplay_frame,active_frame,chbase_end,charset_address,glyph_bank_address,glyph_bank_hash,horizontal_phase,vertical_phase,glyph_address,ring_head_address,ring_head_physical,glyph_write_count,glyph_last_writer,selected_code,published_code,publication_writer,gameplay_chbase_writes,gameplay_chbase_writer,gameplay_chbase_host,hud_chbase_writes,hud_chbase_writer,hud_chbase_host\n", file);
		dftrace_player_pairshot_output_initialised = 1u;
	}
	for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned active = MEMORY_mem[dftrace_projectile_active + slot];
		unsigned y = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u + slot];
		unsigned lifetime = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 4u + slot];
		unsigned rendered = MEMORY_mem[dftrace_projectile_rendered + slot];
		unsigned address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		unsigned code = MEMORY_mem[address] & 0x7fu;
		unsigned phase_code = dftrace_player_pairshot_selected_code[slot] !=
			0xffffffffu ? dftrace_player_pairshot_selected_code[slot] : code;
		unsigned row = y >= 16u && y <= 240u ? (y - 16u) / 8u : 0xffffffffu;
		unsigned screen_top = y & 0xf8u;
		unsigned render_phase = phase_code >= 11u && phase_code < 47u ?
			(phase_code - 11u) % 9u :
			0xffffffffu;
		unsigned expected_phase = y & 7u;
		unsigned shot_mask = (MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE + slot] & 2u) != 0u ? 0x0cu : 0xc0u;
		unsigned phase_match = 1u;
		unsigned phase_row;
		for (phase_row = 0u; phase_row < 4u; ++phase_row) {
			unsigned row_offset = (expected_phase + (phase_row & 1u) +
				(phase_row >= 2u ? 4u : 0u)) & 7u;
			if ((MEMORY_mem[DFTRACE_CHARSET + phase_code * 8u + row_offset] & shot_mask) !=
				shot_mask)
				phase_match = 0u;
		}
		unsigned visible_y = render_phase != 0xffffffffu ?
			screen_top + render_phase : 0xffffffffu;
		unsigned delta_y = (dftrace_player_pairshot_before_y[slot] - y) & 0xffu;
		fprintf(file, "%s,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			dftrace_session, dftrace_count, (unsigned) Atari800_nframes,
			MEMORY_mem[dftrace_gameplay_frame], slot,
			dftrace_player_pairshot_before_active[slot], active,
			MEMORY_mem[dftrace_entity_state + 2u],
			dftrace_player_pairshot_before_y[slot], y, delta_y,
			dftrace_player_pairshot_update_count[slot],
			dftrace_player_pairshot_render_count[slot],
			dftrace_player_pairshot_write_count[slot],
			dftrace_player_pairshot_before_lifetime[slot], lifetime,
			dftrace_player_pairshot_allocations[slot],
			dftrace_player_pairshot_releases[slot],
			dftrace_player_pairshot_allocation_frame[slot],
			dftrace_player_pairshot_release_frame[slot], rendered, address, code,
			row, screen_top, render_phase, expected_phase, phase_match, visible_y,
			GTIA_TRIG[0] == 0u, frame->fire_accept_calls,
			MEMORY_mem[dftrace_player_burst_state],
			MEMORY_mem[dftrace_player_burst_state + 1u],
			MEMORY_mem[dftrace_player_burst_state + 2u],
			dftrace_count_nonzero(dftrace_projectile_active,
				DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT),
			dftrace_count_nonzero(dftrace_projectile_active + DFTRACE_INTERCEPTOR_SLOT_BASE,
				DFTRACE_INTERCEPTOR_SLOT_COUNT), frame->sector_state,
			(frame->events & DFTRACE_EVENT_WORLD) != 0u,
			MEMORY_mem[dftrace_effect_active_mask], frame->gameplay_frame,
			frame->active_gameplay_frame);
		{
			unsigned ring_head = MEMORY_mem[dftrace_playfield_row_lo] |
				((unsigned) MEMORY_mem[dftrace_playfield_row_hi] << 8);
			unsigned ring_physical = ring_head >= DFTRACE_RING_SCREEN &&
				ring_head < DFTRACE_RING_END ? (ring_head - DFTRACE_RING_SCREEN) / 40u :
				0xffffffffu;
			unsigned horizontal_phase = (MEMORY_mem[dftrace_projectile_active +
				DFTRACE_PROJECTILE_ARRAY_STRIDE + slot] & 2u) != 0u ? 2u : 0u;
			fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
				ANTIC_CHBASE, (unsigned) ANTIC_CHBASE << 8, DFTRACE_CHARSET +
				DFTRACE_PLAYER_GLYPH_FIRST * 8u,
				dftrace_hash_bytes(DFTRACE_CHARSET + DFTRACE_PLAYER_GLYPH_FIRST * 8u,
					DFTRACE_PLAYER_GLYPH_COUNT * 8u), horizontal_phase, expected_phase,
				DFTRACE_CHARSET + code * 8u, ring_head, ring_physical,
				dftrace_player_pairshot_glyph_writes,
				dftrace_player_pairshot_glyph_last_writer,
				dftrace_player_pairshot_selected_code[slot],
				dftrace_player_pairshot_published_code[slot],
				dftrace_player_pairshot_publication_writer[slot],
				dftrace_player_pairshot_gameplay_chbase_writes,
				dftrace_player_pairshot_gameplay_chbase_writer,
				dftrace_player_pairshot_gameplay_chbase_host,
				dftrace_player_pairshot_hud_chbase_writes,
				dftrace_player_pairshot_hud_chbase_writer,
				dftrace_player_pairshot_hud_chbase_host);
		}
	}
	if (fclose(file) != 0) {
		perror("voidstrike65 player PairShot trace close");
		exit(2);
	}
}

static void dftrace_first_writer_position(unsigned address,
	unsigned *logical_row, unsigned *column, unsigned *physical_row)
{
	unsigned raster_row;
	unsigned raster_column;
	*logical_row = 0xffffffffu;
	*column = 0xffffffffu;
	*physical_row = 0xffffffffu;
	if (address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END)
		*physical_row = (address - DFTRACE_RING_SCREEN) / 40u;
	if (dftrace_interceptor_display_position(address, &raster_row, &raster_column)) {
		*logical_row = raster_row;
		*column = raster_column;
	}
}

static void dftrace_first_writer_emit(const char *kind, unsigned address,
	unsigned old_value, unsigned new_value, unsigned writer_pc,
	unsigned x_register, unsigned y_register, unsigned owner_mask)
{
	unsigned logical_row;
	unsigned column;
	unsigned physical_row;
	unsigned ring_head = dftrace_logical_row_address(1u);
	unsigned target = MEMORY_mem[dftrace_enemy_target_slot];
	dftrace_first_writer_position(address, &logical_row, &column, &physical_row);
	fprintf(dftrace_first_writer_file,
		"%s,%s,%u,%u,%u,%llu,%d,%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%llu,%u,%u\n",
		dftrace_session, kind, dftrace_count,
		MEMORY_mem[dftrace_active_gameplay_frame_lo] |
			((unsigned) MEMORY_mem[dftrace_active_gameplay_frame_lo + 1u] << 8),
		(unsigned) Atari800_nframes, (unsigned long long) dftrace_clock(),
		ANTIC_ypos, ANTIC_XPOS, address, old_value, new_value, writer_pc,
		x_register, y_register, logical_row, column, physical_row, ring_head,
		owner_mask, target,
		MEMORY_mem[dftrace_enemy_member_state],
		MEMORY_mem[dftrace_enemy_member_state + 1u],
		MEMORY_mem[dftrace_enemy_x], MEMORY_mem[dftrace_enemy_x + 1u],
		MEMORY_mem[dftrace_enemy_y], MEMORY_mem[dftrace_enemy_y + 1u],
		MEMORY_mem[dftrace_entity_active_mask], MEMORY_mem[dftrace_entity_x],
		MEMORY_mem[dftrace_entity_y], MEMORY_mem[dftrace_effect_active_mask],
		dftrace_count_nonzero(dftrace_projectile_active,
			DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT),
		dftrace_count_nonzero(dftrace_projectile_active +
			DFTRACE_INTERCEPTOR_SLOT_BASE, DFTRACE_INTERCEPTOR_SLOT_COUNT),
		MEMORY_mem[dftrace_sector_state], MEMORY_mem[dftrace_ring_flags],
		MEMORY_mem[dftrace_gameplay_frame], dftrace_first_writer_frame[address],
		(unsigned long long) dftrace_first_writer_clock[address],
		dftrace_first_writer_scanline[address], dftrace_first_writer_cycle[address]);
}

static void dftrace_first_writer_track(unsigned x_register, unsigned y_register)
{
	unsigned address;
	unsigned old_value;
	unsigned new_value;
	if (dftrace_first_writer_file == NULL || dftrace_previous_pc == 0u ||
		!dftrace_first_writer_effective_address(dftrace_previous_pc,
			x_register, y_register, &address))
		return;
	if (!((address >= DFTRACE_DIVIDER_SCREEN &&
			address < DFTRACE_DIVIDER_SCREEN + 40u) ||
		  (address >= DFTRACE_RING_SCREEN && address < DFTRACE_RING_END) ||
		  (address >= 0x3b00u && address < 0x4000u)))
		return;
	old_value = dftrace_first_writer_shadow[address];
	new_value = MEMORY_mem[address];
	if (old_value == new_value)
		return;
	dftrace_first_writer_shadow[address] = (unsigned char) new_value;
	dftrace_first_writer_old[address] = old_value;
	dftrace_first_writer_new[address] = new_value;
	dftrace_first_writer_pc[address] = dftrace_previous_pc;
	dftrace_first_writer_frame[address] = dftrace_count;
	dftrace_first_writer_clock[address] = dftrace_clock();
	dftrace_first_writer_scanline[address] = ANTIC_ypos;
	dftrace_first_writer_cycle[address] = ANTIC_XPOS;
	dftrace_first_writer_emit(address >= 0x3b00u && address < 0x4000u
		? "pmg_write" : "character_write", address, old_value, new_value,
		dftrace_previous_pc, x_register, y_register, 0u);
}

static unsigned dftrace_first_writer_owner(unsigned address)
{
	unsigned slot;
	unsigned mask = 0u;
	for (slot = 0u; slot < DFTRACE_NEAR_COUNT; ++slot) {
		unsigned owned = MEMORY_mem[dftrace_near_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_near_screen_hi + slot] << 8);
		if (owned == address && MEMORY_mem[address] == DFTRACE_NEAR_CODE)
			mask |= 1u;
	}
	for (slot = 0u; slot < DFTRACE_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned owned;
		if (MEMORY_mem[dftrace_projectile_active + slot] == 0u ||
			MEMORY_mem[dftrace_projectile_rendered + slot] == 0u)
			continue;
		owned = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		if (owned == address)
			mask |= slot < DFTRACE_INTERCEPTOR_SLOT_BASE ? 2u : 4u;
	}
	if ((MEMORY_mem[dftrace_entity_drawn_mask] & 1u) != 0u) {
		unsigned owned = MEMORY_mem[dftrace_entity_screen_lo] |
			((unsigned) MEMORY_mem[dftrace_entity_screen_hi] << 8);
		if (address == owned || address == owned + 1u)
			mask |= 8u;
	}
	for (slot = 0u; slot < 5u; ++slot) {
		unsigned owned;
		if ((MEMORY_mem[dftrace_effect_rendered_mask] & (1u << slot)) == 0u)
			continue;
		owned = MEMORY_mem[dftrace_effect_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_effect_screen_hi + slot] << 8);
		if (owned == address)
			mask |= 16u;
	}
	if (dftrace_broad_live_owns_address(address))
		mask |= 32u;
	for (slot = 0u; slot < 2u; ++slot) {
		unsigned owned = MEMORY_mem[dftrace_muzzle_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_muzzle_screen_hi + slot] << 8);
		if (MEMORY_mem[dftrace_muzzle_screen_hi + slot] != 0u && owned == address)
			mask |= 64u;
	}
	return mask;
}

static void dftrace_first_writer_kill(void)
{
	if (dftrace_first_writer_file == NULL)
		return;
	dftrace_first_writer_emit("raider_kill", 0u, 0u, 0u,
		dftrace_pc_emitter_cleanup, 0u, 0u, 0u);
}

static void dftrace_first_writer_frame_end(void)
{
	unsigned row;
	unsigned column;
	if (dftrace_first_writer_file == NULL)
		return;
	for (row = 0u; row <= DFTRACE_RING_ROWS; ++row) {
		unsigned base;
		if (row == 0u)
			base = DFTRACE_DIVIDER_SCREEN;
		else {
			unsigned dlist = 0x7f00u + dftrace_displayed_dlist_lo;
			base = MEMORY_mem[dlist + 7u + (row - 1u) * 3u] |
				((unsigned) MEMORY_mem[dlist + 8u + (row - 1u) * 3u] << 8);
		}
		if (base != DFTRACE_DIVIDER_SCREEN &&
			!(base >= DFTRACE_RING_SCREEN && base + 40u <= DFTRACE_RING_END))
			continue;
		for (column = 8u; column < 32u; ++column) {
			unsigned address = base + column;
			unsigned value = MEMORY_mem[address];
			if (value == 0u)
				continue;
			dftrace_first_writer_emit("character_visible", address,
				dftrace_first_writer_old[address], value,
				dftrace_first_writer_pc[address], 0u, 0u,
				dftrace_first_writer_owner(address));
		}
	}
	for (row = 0u; row < 256u; ++row) {
		unsigned missile_address = 0x3b00u + row;
		unsigned missile_value = MEMORY_mem[missile_address];
		unsigned missile_owner =
			(dftrace_count_nonzero(dftrace_broad_state, 3u) != 0u ||
			 MEMORY_mem[dftrace_entity_state + 2u] != 0u) ? 512u : 0u;
		if (missile_value != 0u)
			dftrace_first_writer_emit("missile_visible", missile_address,
				dftrace_first_writer_old[missile_address], missile_value,
				dftrace_first_writer_pc[missile_address], 4u, row, missile_owner);
		for (unsigned player = 0u; player < 4u; ++player) {
			unsigned address = 0x3c00u + player * 0x100u + row;
			unsigned value = MEMORY_mem[address];
			unsigned owner;
			if (player == 1u || player == 2u)
				owner = MEMORY_mem[dftrace_enemy_member_state + player - 1u] == 1u
					? 128u : 0u;
			else
				owner = (MEMORY_mem[dftrace_player_lifecycle] < 3u ||
					dftrace_count_nonzero(dftrace_fighter_explosion_timer, 2u) != 0u)
					? 256u : 0u;
			if (value != 0u)
				dftrace_first_writer_emit("pmg_visible", address,
					dftrace_first_writer_old[address], value,
					dftrace_first_writer_pc[address], player, row, owner);
		}
	}
}

static int dftrace_is_interceptor_projectile_code(unsigned code)
{
	return code >= DFTRACE_INTERCEPTOR_GLYPH_FIRST &&
		code <= DFTRACE_INTERCEPTOR_GLYPH_LAST;
}

static void dftrace_watch_interceptor_projectiles(void)
{
	unsigned index;
	if (dftrace_interceptor_projectile_output == NULL)
		return;
	for (index = 0u; index < DFTRACE_INTERCEPTOR_SLOT_COUNT; ++index) {
		unsigned slot = index + DFTRACE_INTERCEPTOR_SLOT_BASE;
		unsigned active = MEMORY_mem[dftrace_projectile_active + slot];
		unsigned address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		if (active != dftrace_interceptor_observed_active[index]) {
			dftrace_interceptor_observed_active[index] = active;
			dftrace_interceptor_last_active_writer[index] = dftrace_previous_pc;
		}
		if (address != dftrace_interceptor_watched_address[index]) {
			dftrace_interceptor_watched_address[index] = address;
			dftrace_interceptor_watched_value[index] = MEMORY_mem[address];
			dftrace_interceptor_last_screen_writer[index] = 0u;
		}
		else if (MEMORY_mem[address] != dftrace_interceptor_watched_value[index]) {
			dftrace_interceptor_watched_value[index] = MEMORY_mem[address];
			dftrace_interceptor_last_screen_writer[index] = dftrace_previous_pc;
		}
	}
}

static void dftrace_write_interceptor_projectiles(DFTraceFrame *frame)
{
	FILE *file;
	unsigned index;
	if (dftrace_interceptor_projectile_output == NULL)
		return;
	file = fopen(dftrace_interceptor_projectile_output,
		dftrace_interceptor_output_initialised ? "a" : "w");
	if (file == NULL) {
		perror("voidstrike65 interceptor projectile trace");
		exit(2);
	}
	if (!dftrace_interceptor_output_initialised) {
		fprintf(file, "frame,active_frame,slot,event,prior_active,active,prior_x,x,prior_y,y,prev_y,prior_lifetime,lifetime,rendered,address,screen_code,expected_code,visible,raster_row,raster_column,backing,parent_state,parent_x,parent_y,capital_state,ring_flags,ring_head,muzzle_overlap,broadside_overlap,projectile_overlap,last_active_writer_pc,last_screen_writer_pc,ttl_terminal,boundary_terminal,player_collision_terminal\n");
		dftrace_interceptor_output_initialised = 1u;
	}
	for (index = 0u; index < DFTRACE_INTERCEPTOR_SLOT_COUNT; ++index) {
		unsigned other;
		unsigned slot = index + DFTRACE_INTERCEPTOR_SLOT_BASE;
		unsigned active = MEMORY_mem[dftrace_projectile_active + slot];
		unsigned x = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE + slot];
		unsigned y = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u + slot];
		unsigned prev_y = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 3u + slot];
		unsigned lifetime = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 4u + slot];
		unsigned rendered = MEMORY_mem[dftrace_projectile_rendered + slot];
		unsigned address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
		unsigned screen_code = MEMORY_mem[address];
		unsigned expected_code = 0x80u | (90u + ((x & 2u) ? 10u : 0u));
		unsigned raster_row;
		unsigned raster_column;
		unsigned displayed = dftrace_interceptor_display_position(address,
			&raster_row, &raster_column);
		unsigned visible = active != 0u && rendered != 0u && displayed &&
			dftrace_is_interceptor_projectile_code(screen_code);
		unsigned muzzle_overlap = address ==
			(MEMORY_mem[dftrace_muzzle_screen_lo] |
			 ((unsigned) MEMORY_mem[dftrace_muzzle_screen_hi] << 8)) ||
			address == (MEMORY_mem[dftrace_muzzle_screen_lo + 1u] |
			 ((unsigned) MEMORY_mem[dftrace_muzzle_screen_hi + 1u] << 8));
		unsigned projectile_overlap = 0u;
		unsigned next_y = (dftrace_interceptor_previous_y[index] + 5u) & 0xffu;
		unsigned delta_y = (dftrace_interceptor_previous_y[index] - frame->player_y) & 0xffu;
		unsigned delta_x = (dftrace_interceptor_previous_x[index] - frame->player_x) & 0xffu;
		unsigned ttl_terminal = dftrace_interceptor_previous_lifetime[index] == 1u;
		unsigned boundary_terminal = next_y + 3u >= 241u;
		unsigned player_collision_terminal =
			(delta_y < 15u || delta_y >= 249u) && (delta_x < 8u || delta_x >= 255u);
		unsigned emitter_death_terminal =
			dftrace_interceptor_previous_active[index] >= 2u &&
			MEMORY_mem[dftrace_enemy_member_state +
				(dftrace_interceptor_previous_active[index] & 1u)] == 0u;
		const char *event = active != 0u && dftrace_interceptor_previous_active[index] == 0u
			? "spawn" : active == 0u && dftrace_interceptor_previous_active[index] != 0u
			? "release" : "active";
		for (other = 0u; other < DFTRACE_INTERCEPTOR_SLOT_COUNT; ++other) {
			unsigned other_slot = other + DFTRACE_INTERCEPTOR_SLOT_BASE;
			unsigned other_address;
			if (other == index || MEMORY_mem[dftrace_projectile_active + other_slot] == 0u)
				continue;
			other_address = MEMORY_mem[dftrace_projectile_screen_lo + other_slot] |
				((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + other_slot] << 8);
			if (other_address == address)
				projectile_overlap = 1u;
		}
		if (active != 0u || dftrace_interceptor_previous_active[index] != 0u) {
			fprintf(file, "%u,%u,%u,%s,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
				dftrace_count, frame->active_gameplay_frame, slot, event,
				dftrace_interceptor_previous_active[index], active,
				dftrace_interceptor_previous_x[index], x,
				dftrace_interceptor_previous_y[index], y, prev_y,
				dftrace_interceptor_previous_lifetime[index], lifetime, rendered,
				address, screen_code, expected_code, visible, raster_row, raster_column,
				MEMORY_mem[dftrace_projectile_backing_top + slot], frame->enemy_state,
				MEMORY_mem[dftrace_enemy_x], frame->enemy_y, frame->sector_state,
				frame->ring_flags, dftrace_logical_row_address(1u), muzzle_overlap,
				dftrace_broad_live_owns_address(address), projectile_overlap,
				dftrace_interceptor_last_active_writer[index],
				dftrace_interceptor_last_screen_writer[index], ttl_terminal,
				boundary_terminal, player_collision_terminal);
		}
		/* A newly allocated shot is published after the displayed-list snapshot
		 * used by this observer. Start enforcing visibility on its next frame. */
		if (active != 0u && dftrace_interceptor_previous_active[index] != 0u && !visible)
			dftrace_interceptor_first_anomaly = 1u;
		else if (active == 0u && dftrace_interceptor_previous_active[index] != 0u &&
			!ttl_terminal && !boundary_terminal && !player_collision_terminal &&
			!emitter_death_terminal &&
			frame->player_lifecycle < 3u)
			dftrace_interceptor_first_anomaly = 1u;
		dftrace_interceptor_previous_active[index] = active;
		dftrace_interceptor_previous_x[index] = x;
		dftrace_interceptor_previous_y[index] = y;
		dftrace_interceptor_previous_lifetime[index] = lifetime;
	}
	if (fclose(file) != 0) {
		perror("voidstrike65 interceptor projectile trace close");
		exit(2);
	}
}

/* Diagnostic-only physical-frame snapshot for cross-sector clock proofs.
 * Keep this independent from the production XEX and from the already frozen
 * general observer CSV: one row is emitted at the end of each admitted PAL
 * simulation tick, with all five player PairShot records and all four white
 * star records sampled from Atari RAM. */
static void dftrace_write_sector_clock(DFTraceFrame *frame)
{
	FILE *file;
	unsigned slot;
	if (dftrace_sector_clock_output == NULL)
		return;
	file = fopen(dftrace_sector_clock_output,
		dftrace_sector_clock_output_initialised ? "a" : "w");
	if (file == NULL) {
		perror("voidstrike65 sector clock trace");
		exit(2);
	}
	if (!dftrace_sector_clock_output_initialised) {
		fprintf(file, "frame,host_frame,active_frame,sector,ring_event,star_phase");
		for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot)
			fprintf(file, ",p%u_active,p%u_y,p%u_prev_y,p%u_lifetime",
				slot, slot, slot, slot);
		for (slot = 0u; slot < DFTRACE_NEAR_COUNT; ++slot)
			fprintf(file, ",star%u_row,star%u_address", slot, slot);
		fputc('\n', file);
		dftrace_sector_clock_output_initialised = 1u;
	}
	fprintf(file, "%u,%u,%u,%u,%u,%u", dftrace_count,
		(unsigned) Atari800_nframes, frame->active_gameplay_frame,
		frame->sector_state, (frame->events & DFTRACE_EVENT_WORLD) != 0u,
		MEMORY_mem[dftrace_far_active]);
	for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned active = MEMORY_mem[dftrace_projectile_active + slot];
		unsigned y = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 2u + slot];
		unsigned previous_y = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 3u + slot];
		unsigned lifetime = MEMORY_mem[dftrace_projectile_active +
			DFTRACE_PROJECTILE_ARRAY_STRIDE * 4u + slot];
		fprintf(file, ",%u,%u,%u,%u", active, y, previous_y, lifetime);
	}
	for (slot = 0u; slot < DFTRACE_NEAR_COUNT; ++slot) {
		unsigned address = MEMORY_mem[dftrace_near_screen_lo + slot] |
			((unsigned) MEMORY_mem[dftrace_near_screen_hi + slot] << 8);
		fprintf(file, ",%u,%u", MEMORY_mem[dftrace_near_row + slot], address);
	}
	fputc('\n', file);
	if (fclose(file) != 0) {
		perror("voidstrike65 sector clock trace close");
		exit(2);
	}
}

/* Diagnostic-only Light-slot snapshot (roadmap 4.4 Interceptor evidence,
 * extended for Light multiplicity step 3 / plan §4.3).
 * Opt-in: DFTRACE_LIGHT_OUTPUT names the CSV, DFTRACE_LIGHT_BASE the C-owned
 * HYBRID_LIGHT_SLOTS block at $7FC4. One row per admitted PAL simulation tick,
 * sampled from Atari RAM; it adds no emulated cycles and leaves the frozen
 * general observer CSV untouched.
 *
 * The block is a structure of arrays, so slot k's state is base + k and its
 * x is base + 2*LIGHT_SLOT_COUNT + k. The row carries every slot's state, hp,
 * x and y, the live count, and the frame's five vector-entry counts, so the
 * §4.3 analysis can bucket frames by live count and separate the admission
 * and kill frames from the standing ones. */
static void dftrace_write_light(DFTraceFrame *frame)
{
	FILE *file;
	if (dftrace_light_output == NULL)
		return;
	file = fopen(dftrace_light_output, dftrace_light_output_initialised ? "a" : "w");
	if (file == NULL) {
		perror("voidstrike65 light trace");
		exit(2);
	}
	if (!dftrace_light_output_initialised) {
		fprintf(file, "frame,active_frame,sector,live,"
			"state0,state1,state2,state3,hp0,hp1,hp2,hp3,"
			"x0,x1,x2,x3,y0,y1,y2,y3,"
			"v_publish,v_update,v_shot,v_backing,v_resolve\n");
		dftrace_light_output_initialised = 1u;
	}
	{
		unsigned slot;
		unsigned live = 0u;
		if (dftrace_light_ceiling != 0u)
			MEMORY_mem[dftrace_light_ceiling] =
				(UBYTE) dftrace_light_ceiling_value;
		for (slot = 0u; slot < 4u; slot++) {
			if (MEMORY_mem[dftrace_light_base + slot] != 0u)
				live++;
		}
		fprintf(file, "%u,%u,%u,%u", dftrace_count,
			frame->active_gameplay_frame, frame->sector_state, live);
		for (slot = 0u; slot < 4u; slot++)
			fprintf(file, ",%u", MEMORY_mem[dftrace_light_base + slot]);
		for (slot = 0u; slot < 4u; slot++)
			fprintf(file, ",%u", MEMORY_mem[dftrace_light_base + 4u + slot]);
		for (slot = 0u; slot < 4u; slot++)
			fprintf(file, ",%u", MEMORY_mem[dftrace_light_base + 8u + slot]);
		for (slot = 0u; slot < 4u; slot++)
			fprintf(file, ",%u", MEMORY_mem[dftrace_light_base + 12u + slot]);
		for (slot = 0u; slot < DFTRACE_LIGHT_VECTORS; slot++) {
			fprintf(file, ",%u", dftrace_light_vector_hits[slot]);
			dftrace_light_vector_hits[slot] = 0u;
		}
		fprintf(file, "\n");
	}
	if (fclose(file) != 0) {
		perror("voidstrike65 light trace close");
		exit(2);
	}
}

static int dftrace_is_hull_transient(unsigned value)
{
	return value == DFTRACE_ALLIED_MUZZLE_CODE ||
		value == DFTRACE_ENEMY_MUZZLE_CODE ||
		value == DFTRACE_ALLIED_FLASH_CODE ||
		value == DFTRACE_ENEMY_FLASH_CODE;
}

static void dftrace_snapshot_muzzles(DFTraceFrame *frame)
{
	unsigned address;
	unsigned slot;
	frame->player_lifecycle_after = MEMORY_mem[dftrace_player_lifecycle];
	frame->player_x_after = MEMORY_mem[dftrace_player_x];
	frame->player_y_after = MEMORY_mem[dftrace_player_y];
	frame->player_health_after = MEMORY_mem[dftrace_broad_state + 29u];
	frame->player_lives_after = MEMORY_mem[dftrace_player_lifecycle + 1u];
	frame->player_invulnerability_after = MEMORY_mem[dftrace_player_lifecycle + 2u];
	frame->player_damage_cooldown_after = MEMORY_mem[dftrace_broad_state + 30u];
	frame->active_muzzles = 0u;
	frame->muzzle_code_cells = 0u;
	frame->muzzle_illegal_cells = 0u;
	frame->muzzle_illegal_address = 0u;
	frame->muzzle_illegal_code = 0u;
	frame->muzzle_pointer_errors = 0u;
	frame->broad_pointer_errors = 0u;
	for (slot = 0u; slot < 2u; ++slot) {
		unsigned pointer = MEMORY_mem[dftrace_muzzle_screen_lo + slot] |
			(MEMORY_mem[dftrace_muzzle_screen_hi + slot] << 8);
		unsigned row = MEMORY_mem[dftrace_muzzle_visible_row + slot];
		unsigned expected = dftrace_logical_row_address(row);
		if (expected != 0u)
			expected += slot == 0u ? 8u : 31u;
		frame->muzzle_domain[slot] = MEMORY_mem[dftrace_muzzle_row_domain + slot];
		frame->muzzle_row[slot] = row;
		frame->muzzle_pointer[slot] = pointer;
		frame->muzzle_cell[slot] = pointer == 0u ? 0u : MEMORY_mem[pointer];
		frame->muzzle_cell_writer_pc[slot] = pointer == 0u ? 0u :
			dftrace_character_last_writer[pointer];
		frame->muzzle_projectile_occlusion[slot] = dftrace_projectile_occludes(pointer);
		if (MEMORY_mem[dftrace_muzzle_screen_hi + slot] != 0u) {
			++frame->active_muzzles;
			if (pointer != expected || frame->muzzle_domain[slot] != (row == 0u ? 0u : 1u))
				++frame->muzzle_pointer_errors;
		}
		else if (pointer != 0u || row != 0u || frame->muzzle_domain[slot] != 0u)
			++frame->muzzle_pointer_errors;
	}
	for (address = DFTRACE_DIVIDER_SCREEN; address < DFTRACE_DIVIDER_SCREEN + 40u; ++address) {
		if (!dftrace_is_hull_transient(MEMORY_mem[address]))
			continue;
		++frame->muzzle_code_cells;
		if (address != frame->muzzle_pointer[0] && address != frame->muzzle_pointer[1]) {
			if (frame->muzzle_illegal_cells == 0u) {
				frame->muzzle_illegal_address = address;
				frame->muzzle_illegal_code = MEMORY_mem[address];
			}
			++frame->muzzle_illegal_cells;
		}
	}
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		if (!dftrace_is_hull_transient(MEMORY_mem[address]))
			continue;
		++frame->muzzle_code_cells;
		if (address != frame->muzzle_pointer[0] && address != frame->muzzle_pointer[1]) {
			if (frame->muzzle_illegal_cells == 0u) {
				frame->muzzle_illegal_address = address;
				frame->muzzle_illegal_code = MEMORY_mem[address];
			}
			++frame->muzzle_illegal_cells;
		}
	}
	frame->muzzle_divider_allied = MEMORY_mem[DFTRACE_DIVIDER_SCREEN + 8u];
	frame->muzzle_divider_enemy = MEMORY_mem[DFTRACE_DIVIDER_SCREEN + 31u];
	for (slot = 0u; slot < 3u; ++slot) {
		unsigned row = MEMORY_mem[dftrace_playfield_broad_row + slot];
		unsigned pointer = MEMORY_mem[dftrace_broad_row_lo + slot] |
			(MEMORY_mem[dftrace_broad_row_hi + slot] << 8);
		unsigned display_row;
		frame->broad_state[slot] = MEMORY_mem[dftrace_broad_state + slot];
		frame->broad_owner[slot] = MEMORY_mem[dftrace_broad_state + 3u + slot];
		frame->broad_x[slot] = MEMORY_mem[dftrace_broad_state + 9u + slot];
		frame->broad_y[slot] = MEMORY_mem[dftrace_broad_state + 12u + slot];
		frame->broad_collision[slot] = MEMORY_mem[dftrace_broad_state + 24u + slot];
		frame->broad_raster_x[slot] = frame->broad_x[slot] & 0xfcu;
		frame->broad_raster_row[slot] = 0xffffffffu;
		if (pointer == DFTRACE_DIVIDER_SCREEN)
			frame->broad_raster_row[slot] = 0u;
		else for (display_row = 0u; display_row < DFTRACE_RING_ROWS; ++display_row) {
			unsigned base = 0x7f00u + dftrace_displayed_dlist_lo;
			unsigned displayed_pointer = MEMORY_mem[base + 7u + display_row * 3u] |
				((unsigned) MEMORY_mem[base + 8u + display_row * 3u] << 8);
			if (pointer == displayed_pointer) {
				frame->broad_raster_row[slot] = display_row + 1u;
				break;
			}
		}
		frame->broad_flash[slot] = MEMORY_mem[dftrace_broad_flash_timer + slot];
		frame->broad_turret[slot] = MEMORY_mem[dftrace_broad_turret + slot];
		frame->broad_row[slot] = row;
		frame->broad_pointer[slot] = pointer;
		if ((frame->broad_state[slot] != 0u || frame->broad_flash[slot] != 0u) &&
			pointer != dftrace_logical_row_address(row))
			++frame->broad_pointer_errors;
	}
	dftrace_snapshot_broad_transients(frame);
}

static void dftrace_snapshot_flash(DFTraceFrame *frame)
{
	unsigned pickup_row;
	dftrace_snapshot_rapid_projectile(frame);
	dftrace_snapshot_player_pairshot_orphans(frame);
	dftrace_snapshot_enemy_pairshot_orphans(frame);
	dftrace_snapshot_transient_effect_orphans(frame);
	dftrace_snapshot_transient_effect_coordinates(frame);
	frame->colbk = GTIA_COLBK;
	frame->colpm0 = GTIA_COLPM0;
	frame->colpm1 = GTIA_COLPM1;
	frame->colpm2 = GTIA_COLPM2;
	frame->colpm3 = GTIA_COLPM3;
	frame->colpf0 = GTIA_COLPF0;
	frame->colpf1 = GTIA_COLPF1;
	frame->colpf2 = GTIA_COLPF2;
	frame->colpf3 = GTIA_COLPF3;
	frame->player_fighter_explosion_timer = MEMORY_mem[dftrace_fighter_explosion_timer];
	frame->enemy_explosion_timer = MEMORY_mem[dftrace_fighter_explosion_timer + 1u];
	frame->effect_active_mask = MEMORY_mem[dftrace_effect_active_mask];
	frame->effect_active_count = MEMORY_mem[dftrace_effect_active_count];
	frame->effect_rendered_mask = MEMORY_mem[dftrace_effect_rendered_mask];
	/* Pickup lifecycle is sampled after update/render so a qualifying kill,
	 * activation and collection belong to the frame that executed them. */
	frame->entity_active = MEMORY_mem[dftrace_entity_active_count];
	frame->entity_active_mask = MEMORY_mem[dftrace_entity_active_mask];
	frame->entity_x = MEMORY_mem[dftrace_entity_x];
	frame->entity_y = MEMORY_mem[dftrace_entity_y];
	frame->entity_vx = MEMORY_mem[dftrace_entity_vx];
	frame->entity_move_accumulator = MEMORY_mem[dftrace_entity_move_accumulator];
	frame->entity_vertical_accumulator = MEMORY_mem[dftrace_entity_vertical_accumulator];
	frame->entity_render_id = MEMORY_mem[dftrace_entity_render_id];
	frame->pickup_booster_state = MEMORY_mem[dftrace_entity_state + 2u];
	frame->pickup_state = MEMORY_mem[dftrace_entity_state + 1u] != 0u ?
		MEMORY_mem[dftrace_entity_state + 1u] : frame->pickup_booster_state;
	frame->pickup_counter = MEMORY_mem[dftrace_entity_hp + 1u];
	frame->pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
	frame->pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
	frame->pickup_timer_lo = MEMORY_mem[dftrace_entity_timer +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_timer_hi = MEMORY_mem[dftrace_entity_move_accumulator +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_animation = MEMORY_mem[dftrace_entity_owner +
		(frame->pickup_booster_state != 0u ? 2u : 1u)];
	frame->pickup_render_id = MEMORY_mem[dftrace_entity_render_id + 1u];
	frame->pickup_drawn_mask = MEMORY_mem[dftrace_entity_drawn_mask + 1u];
	frame->pickup_pmg_rows = 0u;
	for (pickup_row = 0u; pickup_row < 256u; ++pickup_row) {
		if ((MEMORY_mem[0x3b00u + pickup_row] & 0xf0u) != 0u)
			++frame->pickup_pmg_rows;
	}
	dftrace_measure_pickup_missiles(&frame->pickup_missile_rows,
		&frame->pickup_missile_union, &frame->pickup_missile_blocks);
	frame->pickup_hposm[0] = GTIA_HPOSM0;
	frame->pickup_hposm[1] = GTIA_HPOSM1;
	frame->pickup_hposm[2] = GTIA_HPOSM2;
	frame->pickup_hposm[3] = GTIA_HPOSM3;
	frame->pickup_sizem = GTIA_SIZEM;
	frame->pickup_screen_lo = MEMORY_mem[dftrace_entity_screen_lo + 1u];
	frame->pickup_screen_hi = MEMORY_mem[dftrace_entity_screen_hi + 1u];
	frame->pickup_pmg_byte_top = frame->pickup_screen_hi == 0u ? 0u :
		MEMORY_mem[0x3b00u + frame->pickup_screen_lo];
	frame->pickup_pmg_byte_middle = frame->pickup_screen_hi == 0u ? 0u :
		MEMORY_mem[0x3b00u + frame->pickup_screen_lo + 7u];
	frame->pickup_pmg_byte_bottom = frame->pickup_screen_hi == 0u ? 0u :
		MEMORY_mem[0x3b00u + frame->pickup_screen_lo + 15u];
	frame->pickup_gractl = GTIA_GRACTL;
	for (unsigned slot = 0u; slot < 4u; ++slot) {
		frame->entity_type[slot] = MEMORY_mem[dftrace_entity_type + slot];
		frame->entity_state[slot] = MEMORY_mem[dftrace_entity_state + slot];
	}
	frame->score_lo = MEMORY_mem[dftrace_score_lo];
	frame->score_hi = MEMORY_mem[dftrace_score_hi];
	frame->active_gameplay_frame = MEMORY_mem[dftrace_active_gameplay_frame_lo] |
		((unsigned) MEMORY_mem[dftrace_active_gameplay_frame_lo + 1u] << 8);
	frame->enemy_state = MEMORY_mem[dftrace_enemy_active];
	frame->enemy_y = MEMORY_mem[dftrace_enemy_y];
	for (unsigned slot = 0u; slot < 2u; ++slot) {
		frame->enemy_slot_x[slot] = MEMORY_mem[dftrace_enemy_x + slot];
		frame->enemy_slot_y[slot] = MEMORY_mem[dftrace_enemy_y + slot];
		frame->enemy_hpos[slot] = slot == 0u ? GTIA_HPOSP1 : GTIA_HPOSP2;
		frame->enemy_pmg_rows[slot] = dftrace_count_nonzero(0x3d00u + slot * 0x100u, 256u);
	}
	dftrace_snapshot_enemy_pmg_mismatch(frame, 1);
	for (unsigned member = 0u; member < 3u; ++member) {
		frame->enemy_member_state[member] = MEMORY_mem[dftrace_enemy_member_state + member];
		frame->enemy_member_hp[member] = MEMORY_mem[dftrace_enemy_hp + member];
	}
	frame->enemy_live_count = MEMORY_mem[dftrace_enemy_live_count];
	frame->enemy_projectiles = dftrace_count_nonzero(
		dftrace_projectile_active + DFTRACE_INTERCEPTOR_SLOT_BASE,
		DFTRACE_INTERCEPTOR_SLOT_COUNT);
	frame->director_phase = MEMORY_mem[dftrace_director_state];
	frame->director_rng = MEMORY_mem[dftrace_director_state + 5u];
	frame->director_intensity = MEMORY_mem[dftrace_director_state + 2u];
	frame->director_reaction = MEMORY_mem[dftrace_director_state + 3u];
	frame->director_recovery = MEMORY_mem[dftrace_director_state + 4u];
	frame->dli_sequence_violations = dftrace_dli_sequence_violations;
	frame->maximum_dlis_per_host_frame = dftrace_maximum_dlis_per_host_frame;
	frame->pause_test_completed = dftrace_pause_test_completed;
	frame->pause_timer_before = dftrace_pause_timer_before;
	frame->pause_timer_after = dftrace_pause_timer_after;
	frame->pause_engine_timer_before = dftrace_pause_engine_timer_before;
	frame->pause_engine_timer_after = dftrace_pause_engine_timer_after;
	frame->pause_engine_phase_before = dftrace_pause_engine_phase_before;
	frame->pause_engine_phase_after = dftrace_pause_engine_phase_after;
	frame->pause_host_frames = dftrace_pause_host_frames;
}

static void dftrace_write(void)
{
	FILE *file;
	unsigned index;
	file = fopen(dftrace_output, "w");
	if (file == NULL) {
		perror("voidstrike65 trace output");
		exit(2);
	}
	fprintf(file, "session,frame,start_clock,end_clock,next_start_clock,wall_cycles,start_host_frame,end_host_frame,next_start_host_frame,start_scanline,start_cycle,end_scanline,end_cycle,host_vbi_boundaries,extra_vbi_boundaries,missed_frames,dli_nmis,dma_ctl,nmi_en,projectiles,broadside,far_rendered,live_interceptor,fighter_explosion,capital_explosion,music_active,fire_sfx,hit_sfx,capital_sfx,sound_enabled,player_lifecycle,sector_state,gameplay_frame,difficulty,active_muzzles,entity_active,entity_x,entity_y,entity_vx,entity_move_accumulator,entity_vertical_accumulator,entity_render_id,colbk,colpm0,colpm1,colpm2,colpm3,colpf0,colpf1,colpf2,colpf3,player_fighter_explosion_timer,enemy_explosion_timer,events,effect_active_mask,effect_active_count,effect_rendered_mask,entity_active_mask,pickup_state,pickup_counter,pickup_x,pickup_y,pickup_timer_lo,pickup_timer_hi,pickup_animation,pickup_render_id,pickup_drawn_mask,score_lo,score_hi,rapid_projectiles,rapid_projectile_slot,rapid_projectile_address,rapid_projectile_screen_code,rapid_projectile_backing,dli_sequence_violations,maximum_dlis_per_host_frame,pause_test_completed,pause_timer_before,pause_timer_after,pause_engine_timer_before,pause_engine_timer_after,pause_engine_phase_before,pause_engine_phase_after,pause_host_frames,player_fighter_projectiles,pickup_booster_state,pickup_prev_x,pickup_prev_y,pickup_prev_render_row,pickup_prev_render_phase,pickup_render_row,pickup_render_phase,pickup_vscroll,pickup_a2_head,pickup_erase_calls,pickup_draw_calls,pickup_erase_scanline,pickup_erase_cycle,pickup_draw_scanline,pickup_draw_cycle,pickup_old_address0,pickup_old_address1,pickup_old_address2,pickup_old_address3,pickup_old_address4,pickup_old_address5,pickup_old_backing0,pickup_old_backing1,pickup_old_backing2,pickup_old_backing3,pickup_old_backing4,pickup_old_backing5,pickup_old_before_erase0,pickup_old_before_erase1,pickup_old_before_erase2,pickup_old_before_erase3,pickup_old_before_erase4,pickup_old_before_erase5,pickup_old_after_erase0,pickup_old_after_erase1,pickup_old_after_erase2,pickup_old_after_erase3,pickup_old_after_erase4,pickup_old_after_erase5,pickup_new_address0,pickup_new_address1,pickup_new_address2,pickup_new_address3,pickup_new_address4,pickup_new_address5,pickup_new_backing0,pickup_new_backing1,pickup_new_backing2,pickup_new_backing3,pickup_new_backing4,pickup_new_backing5,pickup_new_after_draw0,pickup_new_after_draw1,pickup_new_after_draw2,pickup_new_after_draw3,pickup_new_after_draw4,pickup_new_after_draw5,pickup_glyph_cells_before,pickup_glyph_cells_after,pickup_footprints_before,pickup_footprints_after,pickup_first_overwrite_pc,pickup_first_overwrite_address,pickup_first_overwrite_value,pickup_first_overwrite_scanline,engine_timer,engine_phase,corridor_phase,ring_flags,engine_vscroll,engine_a2_head,engine_allied_cells,engine_enemy_cells,capital_visible_allied_cells,capital_visible_enemy_cells,engine_copy_calls,engine_copy_scanline,engine_copy_cycle,engine_first_write_pc,engine_first_write_address,engine_first_write_old,engine_first_write_new,engine_first_write_scanline,engine_first_write_cycle,engine_charset_hash,engine_displayed_dlist_lo,engine_published_dlist_lo,engine_active_dlist_lo,engine_next_dlist_lo,engine_row0_address,engine_displayed_row0_address,engine_active_row0_address,engine_divider0,engine_divider1,engine_divider2,engine_divider3,engine_divider4,engine_divider5,engine_divider6,engine_divider7,engine_recycled0,engine_recycled1,engine_recycled2,engine_recycled3,engine_recycled4,engine_recycled5,engine_recycled6,engine_recycled7,engine_first_dlist_write_pc,engine_first_dlist_write_address,engine_first_dlist_write_old,engine_first_dlist_write_new,engine_first_dlist_write_scanline,engine_first_dlist_write_cycle,engine_first_recycled_write_pc,engine_first_recycled_write_address,engine_first_recycled_write_old,engine_first_recycled_write_new,engine_first_recycled_write_scanline,engine_first_recycled_write_cycle,engine_playfield_select_calls,engine_playfield_select_scanline,engine_playfield_select_cycle,engine_playfield_select_dlist,engine_playfield_select_active_lo,gameplay_generation");
	for (index = 0; index < DFTRACE_PROFILE_COUNT; ++index)
		fprintf(file, ",profile_clock%u", index);
	for (index = 0; index < DFTRACE_PROFILE_DLI_COUNT; ++index)
		fprintf(file, ",profile_dli%u_start,profile_dli%u_end,profile_dli%u_segment",
			index, index, index);
	fprintf(file, ",profile_compose_calls,profile_compose_cycles"
		",profile_pointer_calls,profile_pointer_cycles"
		",profile_publication_begin"
		",profile_erase_player_fighter_start,profile_interceptor_update_start"
		",profile_interceptor_render_start,profile_entity_erase_start"
		",profile_effect_update_end,profile_pickup_update_end"
		",profile_pickup_render_start,profile_effect_render_start"
		",player_x,player_y,prior,player_erase_calls,player_draw_calls"
		",player_erase_scanline,player_draw_scanline");
	for (index = 0; index < 2u; ++index)
		fprintf(file, ",muzzle%u_domain,muzzle%u_row,muzzle%u_pointer,muzzle%u_cell"
			",muzzle%u_writer_pc,muzzle%u_projectile",
			index, index, index, index, index, index);
	fprintf(file, ",muzzle_code_cells,muzzle_illegal_cells"
		",muzzle_illegal_address,muzzle_illegal_code,muzzle_pointer_errors"
		",muzzle_divider_allied,muzzle_divider_enemy");
	for (index = 0; index < 3u; ++index)
		fprintf(file, ",broad%u_state,broad%u_flash,broad%u_turret,broad%u_row,broad%u_pointer"
			",broad%u_owner,broad%u_x,broad%u_y,broad%u_collision,broad%u_raster_x,broad%u_raster_row",
			index, index, index, index, index, index, index, index, index, index, index);
	fprintf(file, ",broad_pointer_errors,player_health,player_lives,player_invulnerability"
		",broad_screen_orphan_cells,broad_screen_first_address,broad_screen_first_code"
		",broad_screen_missing_cells"
		",broad_pmg_orphan_rows0,broad_pmg_orphan_rows1,broad_pmg_orphan_rows2"
		",broad_pmg_missing_rows0,broad_pmg_missing_rows1,broad_pmg_missing_rows2"
		",broad_pmg_first_slot,broad_pmg_first_row,broad_pmg_first_value,broad_pmg_first_writer_pc"
		",broad_pre_rotate_screen_transients"
		",player_damage_cooldown,player_damage_applied,capital_collision_calls"
		",capital_player_damage_calls,player_lifecycle_after,player_x_after,player_y_after"
		",player_health_after,player_lives_after,player_invulnerability_after"
		",player_damage_cooldown_after,active_gameplay_frame,enemy_state,enemy_y"
		",director_phase,director_rng,director_intensity,director_reaction,director_recovery"
		",enemy_member0_state,enemy_member1_state,enemy_member2_state"
		",enemy_member0_hp,enemy_member1_hp,enemy_member2_hp"
		",enemy_live_count,enemy_projectiles"
		",enemy_x0,enemy_x1,enemy_y0,enemy_y1,enemy_hpos1,enemy_hpos2"
		",enemy_pmg_rows1,enemy_pmg_rows2"
		",enemy_pmg_mismatch1,enemy_pmg_mismatch2"
		",enemy_pmg_mismatch_row1,enemy_pmg_mismatch_row2"
		",enemy_pmg_mismatch_writer1,enemy_pmg_mismatch_writer2"
		",player_projectile_recycled_checks"
		",player_projectile_stale_cells,player_projectile_orphan_cells"
		",transient_effect_orphan_cells,transient_effect_first_address"
		",transient_effect_first_code,transient_effect_first_writer_pc"
		",transient_effect_first_writer_x"
		",fire_timer_value,player_burst_state,player_burst_remaining,player_burst_timer"
		",audf1,audc1,fire_accept_calls,update_sound_calls"
		",fire_accept_clock,update_sound_clock"
		",fire_accept_scanline,fire_accept_cycle,update_sound_scanline,update_sound_cycle"
		",stale_debris_projectile_restores,transient_effect_coordinate_wraps,interceptor_breakup_request_slot0"
		",interceptor_breakup_request_slot1,raider_character_writes"
		",raider_transient_allocations,raider_slot0_activations"
		",raider_kills_with_emitter_projectile_active,emitter_owned_projectiles_at_kill"
		",emitter_owned_projectiles_removed,foreign_projectiles_preserved"
		",foreign_projectiles_incorrectly_removed,post_kill_emitter_projectile_continuations"
		",emitter_owned_physical_slot0_at_kill,enemy_projectile_stale_cells"
		",pickup_admission_requests,pickup_attempt_sector,pickup_attempt_active_mask"
		",pickup_attempt_active_count,pickup_attempt_x,pickup_attempt_y,pickup_attempt_timer"
		",pickup_attempt_slot0_type,pickup_attempt_slot0_state"
		",pickup_attempt_slot1_type,pickup_attempt_slot1_state"
		",pickup_attempt_slot2_type,pickup_attempt_slot2_state"
		",pickup_attempt_slot3_type,pickup_attempt_slot3_state"
		",pickup_attempt_director_phase,pickup_attempt_director_intensity"
		",pickup_attempt_director_reaction,pickup_attempt_director_recovery"
		",pickup_attempt_director_rng,pickup_attempt_director_flags"
		",pickup_attempt_admission_frame,pickup_attempt_gameplay_frame"
		",pickup_attempt_player_lifecycle"
		",pickup_pmg_rows,pickup_missile_rows,pickup_missile_union"
		",pickup_missile_blocks"
		",pickup_hposm0,pickup_hposm1,pickup_hposm2,pickup_hposm3"
		",pickup_sizem,pickup_screen_lo,pickup_screen_hi,pickup_pmg_byte_top"
		",pickup_pmg_byte_middle,pickup_pmg_byte_bottom,pickup_gractl"
		",slot0_type,slot0_state,slot1_type,slot1_state"
		",slot2_type,slot2_state,slot3_type,slot3_state\n");
	for (index = 0; index < dftrace_count; ++index) {
		DFTraceFrame *frame = &dftrace_frames[index];
		uint64_t wall = frame->end_clock - frame->start_clock;
		unsigned host_boundaries = frame->end_host_frame - frame->start_host_frame;
		unsigned cadence_frames = frame->next_start_host_frame - frame->start_host_frame;
		unsigned extra_boundaries = host_boundaries > 1 ? host_boundaries - 1 : 0;
		unsigned missed_frames = cadence_frames > 1 ? cadence_frames - 1 : 0;
		fprintf(file,
			"%s,%u,%llu,%llu,%llu,%llu,%u,%u,%u,%d,%d,%d,%d,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			dftrace_session, index,
			(unsigned long long) frame->start_clock,
			(unsigned long long) frame->end_clock,
			(unsigned long long) frame->next_start_clock,
			(unsigned long long) wall,
			frame->start_host_frame, frame->end_host_frame, frame->next_start_host_frame,
			frame->start_y, frame->start_x, frame->end_y, frame->end_x,
			host_boundaries, extra_boundaries, missed_frames, frame->dli_nmis,
			frame->dma_ctl, frame->nmi_en, frame->projectiles, frame->broadside,
			frame->far_rendered, frame->live_interceptor, frame->fighter_explosion,
			frame->capital_explosion, frame->music_active, frame->fire_sfx,
			frame->hit_sfx, frame->capital_sfx, frame->sound_enabled,
			frame->player_lifecycle, frame->sector_state, frame->gameplay_frame,
			frame->difficulty, frame->active_muzzles, frame->entity_active,
			frame->entity_x, frame->entity_y, frame->entity_vx,
			frame->entity_move_accumulator, frame->entity_vertical_accumulator,
			frame->entity_render_id, frame->colbk, frame->colpm0, frame->colpm1,
			frame->colpm2, frame->colpm3, frame->colpf0, frame->colpf1,
			frame->colpf2, frame->colpf3, frame->player_fighter_explosion_timer,
			frame->enemy_explosion_timer, frame->events, frame->effect_active_mask,
			frame->effect_active_count, frame->effect_rendered_mask,
			frame->entity_active_mask, frame->pickup_state, frame->pickup_counter,
			frame->pickup_x, frame->pickup_y, frame->pickup_timer_lo,
			frame->pickup_timer_hi, frame->pickup_animation, frame->pickup_render_id,
			frame->pickup_drawn_mask, frame->score_lo, frame->score_hi,
			frame->rapid_projectiles, frame->rapid_projectile_slot,
			frame->rapid_projectile_address, frame->rapid_projectile_screen_code,
			frame->rapid_projectile_backing, frame->dli_sequence_violations,
			frame->maximum_dlis_per_host_frame, frame->pause_test_completed,
			frame->pause_timer_before, frame->pause_timer_after,
			frame->pause_engine_timer_before, frame->pause_engine_timer_after,
			frame->pause_engine_phase_before, frame->pause_engine_phase_after,
			frame->pause_host_frames);
		fprintf(file, ",%u,%u", frame->player_fighter_projectiles, frame->pickup_booster_state);
		fprintf(file,
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->pickup_prev_x, frame->pickup_prev_y,
			frame->pickup_prev_render_row, frame->pickup_prev_render_phase,
			frame->pickup_render_row, frame->pickup_render_phase,
			frame->pickup_vscroll, frame->pickup_a2_head,
			frame->pickup_erase_calls, frame->pickup_draw_calls,
			frame->pickup_erase_scanline, frame->pickup_erase_cycle,
			frame->pickup_draw_scanline, frame->pickup_draw_cycle,
			frame->pickup_old_address[0], frame->pickup_old_address[1],
			frame->pickup_old_address[2], frame->pickup_old_address[3],
			frame->pickup_old_address[4], frame->pickup_old_address[5],
			frame->pickup_old_backing[0], frame->pickup_old_backing[1],
			frame->pickup_old_backing[2], frame->pickup_old_backing[3],
			frame->pickup_old_backing[4], frame->pickup_old_backing[5],
			frame->pickup_old_before_erase[0], frame->pickup_old_before_erase[1],
			frame->pickup_old_before_erase[2], frame->pickup_old_before_erase[3],
			frame->pickup_old_before_erase[4], frame->pickup_old_before_erase[5],
			frame->pickup_old_after_erase[0], frame->pickup_old_after_erase[1],
			frame->pickup_old_after_erase[2], frame->pickup_old_after_erase[3],
			frame->pickup_old_after_erase[4], frame->pickup_old_after_erase[5],
			frame->pickup_new_address[0], frame->pickup_new_address[1],
			frame->pickup_new_address[2], frame->pickup_new_address[3],
			frame->pickup_new_address[4], frame->pickup_new_address[5],
			frame->pickup_new_backing[0], frame->pickup_new_backing[1],
			frame->pickup_new_backing[2], frame->pickup_new_backing[3],
			frame->pickup_new_backing[4], frame->pickup_new_backing[5],
			frame->pickup_new_after_draw[0], frame->pickup_new_after_draw[1],
			frame->pickup_new_after_draw[2], frame->pickup_new_after_draw[3],
			frame->pickup_new_after_draw[4], frame->pickup_new_after_draw[5],
			frame->pickup_glyph_cells_before, frame->pickup_glyph_cells_after,
			frame->pickup_footprints_before, frame->pickup_footprints_after,
			frame->pickup_first_overwrite_pc, frame->pickup_first_overwrite_address,
			frame->pickup_first_overwrite_value, frame->pickup_first_overwrite_scanline);
		fprintf(file,
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->engine_timer, frame->engine_phase, frame->corridor_phase,
			frame->ring_flags, frame->engine_vscroll, frame->engine_a2_head,
			frame->engine_allied_cells, frame->engine_enemy_cells,
			frame->capital_visible_allied_cells, frame->capital_visible_enemy_cells,
			frame->engine_copy_calls, frame->engine_copy_scanline,
			frame->engine_copy_cycle, frame->engine_first_write_pc,
			frame->engine_first_write_address, frame->engine_first_write_old,
			frame->engine_first_write_new, frame->engine_first_write_scanline,
			frame->engine_first_write_cycle, frame->engine_charset_hash);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u",
			frame->engine_displayed_dlist_lo, frame->engine_published_dlist_lo,
			frame->engine_active_dlist_lo, frame->engine_next_dlist_lo,
			frame->engine_row0_address, frame->engine_displayed_row0_address,
			frame->engine_active_row0_address);
		for (unsigned cell = 0; cell < 8u; ++cell)
			fprintf(file, ",%u", frame->engine_divider[cell]);
		for (unsigned cell = 0; cell < 8u; ++cell)
			fprintf(file, ",%u", frame->engine_recycled[cell]);
		fprintf(file, ",%u,%u,%u,%u,%u,%u",
			frame->engine_first_dlist_write_pc,
			frame->engine_first_dlist_write_address,
			frame->engine_first_dlist_write_old,
			frame->engine_first_dlist_write_new,
			frame->engine_first_dlist_write_scanline,
			frame->engine_first_dlist_write_cycle);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->engine_first_recycled_write_pc,
			frame->engine_first_recycled_write_address,
			frame->engine_first_recycled_write_old,
			frame->engine_first_recycled_write_new,
			frame->engine_first_recycled_write_scanline,
			frame->engine_first_recycled_write_cycle,
			frame->engine_playfield_select_calls,
			frame->engine_playfield_select_scanline,
			frame->engine_playfield_select_cycle,
			frame->engine_playfield_select_dlist,
			frame->engine_playfield_select_active_lo,
			frame->gameplay_generation);
		for (unsigned profile = 0; profile < DFTRACE_PROFILE_COUNT; ++profile)
			fprintf(file, ",%llu", (unsigned long long) frame->profile_clock[profile]);
		for (unsigned dli = 0; dli < DFTRACE_PROFILE_DLI_COUNT; ++dli)
			fprintf(file, ",%llu,%llu,%u",
				(unsigned long long) frame->profile_dli_start[dli],
				(unsigned long long) frame->profile_dli_end[dli],
				frame->profile_dli_segment[dli]);
		fprintf(file, ",%u,%u,%u,%u,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu"
			",%u,%u,%u,%u,%u,%u,%u",
			frame->profile_compose_calls, frame->profile_compose_cycles,
			frame->profile_pointer_calls, frame->profile_pointer_cycles,
			(unsigned long long) frame->profile_publication_begin,
			(unsigned long long) frame->profile_erase_player_fighter_start,
			(unsigned long long) frame->profile_interceptor_update_start,
			(unsigned long long) frame->profile_interceptor_render_start,
			(unsigned long long) frame->profile_entity_erase_start,
			(unsigned long long) frame->profile_effect_update_end,
			(unsigned long long) frame->profile_pickup_update_end,
			(unsigned long long) frame->profile_pickup_render_start,
			(unsigned long long) frame->profile_effect_render_start,
			frame->player_x, frame->player_y, frame->prior,
			frame->player_erase_calls, frame->player_draw_calls,
			frame->player_erase_scanline, frame->player_draw_scanline);
		for (unsigned slot = 0; slot < 2u; ++slot)
			fprintf(file, ",%u,%u,%u,%u,%u,%u", frame->muzzle_domain[slot],
				frame->muzzle_row[slot], frame->muzzle_pointer[slot],
				frame->muzzle_cell[slot], frame->muzzle_cell_writer_pc[slot],
				frame->muzzle_projectile_occlusion[slot]);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u", frame->muzzle_code_cells,
			frame->muzzle_illegal_cells, frame->muzzle_illegal_address,
			frame->muzzle_illegal_code, frame->muzzle_pointer_errors,
			frame->muzzle_divider_allied, frame->muzzle_divider_enemy);
		for (unsigned slot = 0; slot < 3u; ++slot)
			fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u", frame->broad_state[slot],
				frame->broad_flash[slot], frame->broad_turret[slot],
				frame->broad_row[slot], frame->broad_pointer[slot],
				frame->broad_owner[slot], frame->broad_x[slot], frame->broad_y[slot],
				frame->broad_collision[slot], frame->broad_raster_x[slot],
				frame->broad_raster_row[slot]);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u"
			",%u,%u,%u,%u,%u,%u,%u,%u",
			frame->broad_pointer_errors,
			frame->player_health, frame->player_lives, frame->player_invulnerability,
			frame->broad_screen_orphan_cells, frame->broad_screen_first_address,
			frame->broad_screen_first_code, frame->broad_screen_missing_cells,
			frame->broad_pmg_orphan_rows[0],
			frame->broad_pmg_orphan_rows[1], frame->broad_pmg_orphan_rows[2],
			frame->broad_pmg_missing_rows[0], frame->broad_pmg_missing_rows[1],
			frame->broad_pmg_missing_rows[2],
			frame->broad_pmg_first_slot, frame->broad_pmg_first_row,
			frame->broad_pmg_first_value, frame->broad_pmg_first_writer_pc,
			frame->broad_pre_rotate_screen_transients,
			frame->player_damage_cooldown, frame->player_damage_applied,
			frame->capital_collision_calls, frame->capital_player_damage_calls,
			frame->player_lifecycle_after, frame->player_x_after, frame->player_y_after,
			frame->player_health_after, frame->player_lives_after,
			frame->player_invulnerability_after, frame->player_damage_cooldown_after,
			frame->active_gameplay_frame, frame->enemy_state, frame->enemy_y,
			frame->director_phase, frame->director_rng, frame->director_intensity,
			frame->director_reaction, frame->director_recovery,
			frame->enemy_member_state[0], frame->enemy_member_state[1],
			frame->enemy_member_state[2], frame->enemy_member_hp[0],
			frame->enemy_member_hp[1], frame->enemy_member_hp[2],
			frame->enemy_live_count, frame->enemy_projectiles);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->enemy_slot_x[0], frame->enemy_slot_x[1],
			frame->enemy_slot_y[0], frame->enemy_slot_y[1],
			frame->enemy_hpos[0], frame->enemy_hpos[1],
			frame->enemy_pmg_rows[0], frame->enemy_pmg_rows[1],
			frame->enemy_pmg_mismatch[0], frame->enemy_pmg_mismatch[1],
			frame->enemy_pmg_mismatch_row[0], frame->enemy_pmg_mismatch_row[1],
			frame->enemy_pmg_mismatch_writer[0], frame->enemy_pmg_mismatch_writer[1],
			frame->player_projectile_recycled_checks,
			frame->player_projectile_stale_cells,
			frame->player_projectile_orphan_cells,
			frame->transient_effect_orphan_cells,
			frame->transient_effect_first_address,
			frame->transient_effect_first_code,
			frame->transient_effect_first_writer_pc,
			frame->transient_effect_first_writer_x);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%llu,%llu,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->fire_timer_value, frame->player_burst_state,
			frame->player_burst_remaining, frame->player_burst_timer,
			frame->audf1, frame->audc1, frame->fire_accept_calls,
			frame->update_sound_calls,
			(unsigned long long) frame->fire_accept_clock,
			(unsigned long long) frame->update_sound_clock,
			frame->fire_accept_scanline, frame->fire_accept_cycle,
			frame->update_sound_scanline, frame->update_sound_cycle,
			frame->stale_debris_projectile_restores,
			frame->transient_effect_coordinate_wraps,
			frame->interceptor_breakup_request_slot0,
			frame->interceptor_breakup_request_slot1,
			frame->raider_character_writes,
			frame->raider_transient_allocations,
			frame->raider_slot0_activations);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u",
			frame->raider_kills_with_emitter_projectile_active,
			frame->emitter_owned_projectiles_at_kill,
			frame->emitter_owned_projectiles_removed,
			frame->foreign_projectiles_preserved,
			frame->foreign_projectiles_incorrectly_removed,
			frame->post_kill_emitter_projectile_continuations,
			frame->emitter_owned_physical_slot0_at_kill,
			frame->enemy_projectile_stale_cells);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u", frame->pickup_admission_requests,
			frame->pickup_attempt_sector, frame->pickup_attempt_active_mask,
			frame->pickup_attempt_active_count, frame->pickup_attempt_x,
			frame->pickup_attempt_y, frame->pickup_attempt_timer);
		for (unsigned slot = 0u; slot < 4u; ++slot)
			fprintf(file, ",%u,%u", frame->pickup_attempt_type[slot],
				frame->pickup_attempt_state[slot]);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u,%u,%u",
			frame->pickup_attempt_director_phase,
			frame->pickup_attempt_director_intensity,
			frame->pickup_attempt_director_reaction,
			frame->pickup_attempt_director_recovery,
			frame->pickup_attempt_director_rng,
			frame->pickup_attempt_director_flags,
			frame->pickup_attempt_admission_frame,
			frame->pickup_attempt_gameplay_frame,
			frame->pickup_attempt_player_lifecycle);
		fprintf(file, ",%u,%u,%u,%u", frame->pickup_pmg_rows,
			frame->pickup_missile_rows, frame->pickup_missile_union,
			frame->pickup_missile_blocks);
		fprintf(file, ",%u,%u,%u,%u,%u,%u,%u",
			frame->pickup_hposm[0], frame->pickup_hposm[1],
			frame->pickup_hposm[2], frame->pickup_hposm[3], frame->pickup_sizem,
			frame->pickup_screen_lo, frame->pickup_screen_hi);
		fprintf(file, ",%u,%u,%u,%u", frame->pickup_pmg_byte_top,
			frame->pickup_pmg_byte_middle, frame->pickup_pmg_byte_bottom,
			frame->pickup_gractl);
		for (unsigned slot = 0u; slot < 4u; ++slot)
			fprintf(file, ",%u,%u", frame->entity_type[slot], frame->entity_state[slot]);
		fputc('\n', file);
	}
	if (fclose(file) != 0) {
		perror("voidstrike65 trace close");
		exit(2);
	}
	if (dftrace_first_writer_file != NULL) {
		if (fclose(dftrace_first_writer_file) != 0) {
			perror("voidstrike65 first-writer trace close");
			exit(2);
		}
		dftrace_first_writer_file = NULL;
	}
}



/* ------------------------------------------------------------------------
 * Debris bottom-row occupancy probe (2026-09-16).
 *
 * rotate_playfield_rows blindly overwrites the bottom ring row with the
 * divider, and dedicated restore helpers exist for PairShots and near stars
 * but NOT for debris. That is safe only while debris is erased at frame start,
 * before the rotation. Moving debris publication into the post-playfield
 * window removes that ordering guarantee, so we first measure how much debris
 * actually uses the recycled bottom row, and whether it can still collide
 * with the player there.
 * Enabled only by DFDEBRIS_ROW_OUTPUT.
 * ---------------------------------------------------------------------- */
static const char *dfdebris_path = NULL;
static unsigned dfdebris_prev_ypos = 0xffffffffu;
static unsigned dfdebris_active_frames = 0u;
static unsigned dfdebris_bottom_frames = 0u;
static unsigned dfdebris_bottom_overlap_frames = 0u;
static unsigned dfdebris_max_y = 0u;
static unsigned dfdebris_spawns = 0u;
static unsigned dfdebris_spawns_reaching_bottom = 0u;
static unsigned dfdebris_prev_active = 0u;
static unsigned dfdebris_this_life_bottom = 0u;
static unsigned dfdebris_beam_lit = 0u;
static unsigned dfdebris_beam_blank = 0u;
static unsigned dfdebris_scanned[312];
static unsigned dfdebris_row_addr = 0u;

#define DFDEBRIS_BOTTOM_ROW_TOP 232u   /* 24 + 26*8: the recycled ring row */

static void dfdebris_frame(void)
{
	unsigned active = MEMORY_mem[dftrace_entity_active_mask] & 1u;
	unsigned y, player_y;
	if (!active) {
		if (dfdebris_prev_active && dfdebris_this_life_bottom)
			++dfdebris_spawns_reaching_bottom;
		dfdebris_this_life_bottom = 0u;
		dfdebris_prev_active = 0u;
		return;
	}
	if (!dfdebris_prev_active)
		++dfdebris_spawns;
	dfdebris_prev_active = 1u;
	++dfdebris_active_frames;
	y = MEMORY_mem[dftrace_entity_y];
	if (y > dfdebris_max_y)
		dfdebris_max_y = y;
	/* Beam-time visibility: was the debris cell actually present in screen
	 * memory when ANTIC scanned its row? Sampled by dfdebris_scan below. */
	if (dfdebris_row_addr != 0u) {
		if (dfdebris_scanned[0])
			++dfdebris_beam_lit;
		else
			++dfdebris_beam_blank;
	}
	dfdebris_scanned[0] = 0u;
	dfdebris_row_addr = 0u;
	if (y >= DFDEBRIS_BOTTOM_ROW_TOP) {
		++dfdebris_bottom_frames;
		dfdebris_this_life_bottom = 1u;
		/* Debris is 8 scanlines tall; the player body spans
		 * PLAYER_COLLISION_LAST_ROW below player_y. */
		player_y = MEMORY_mem[dftrace_player_y];
		if (player_y + 14u >= y && y + 8u >= player_y)
			++dfdebris_bottom_overlap_frames;
	}
}

static void dfdebris_report(void);

static void dfdebris_observe(void)
{
	unsigned ypos;
	if (dfdebris_path == NULL)
		return;
	ypos = ANTIC_ypos;
	/* While the beam is inside the debris footprint, record whether the two
	 * ring cells still hold the debris glyph. Screen memory is what ANTIC
	 * fetches, so this is the beam-time truth rather than an end-of-frame view. */
	/* Sample once per frame just BEFORE the visible playfield begins
	 * (ENTITY_GAMEPLAY_TOP is 24). Publication is late, so whatever the cell
	 * holds here is exactly what ANTIC will fetch for the whole frame. Testing
	 * against the beam position instead would compare the screen with an
	 * ENTITY_Y that the mid-frame update mutates part-way down the pass, which
	 * reports false blanks for a late-published layer. */
	if (ypos == 20u && (MEMORY_mem[dftrace_entity_active_mask] & 1u) != 0u) {
		unsigned hi = MEMORY_mem[dftrace_entity_screen_hi];
		if (hi != 0u) {
			unsigned addr = (hi << 8) | MEMORY_mem[dftrace_entity_screen_lo];
			unsigned want = MEMORY_mem[dftrace_entity_render_id];
			dfdebris_row_addr = addr;
			if ((MEMORY_mem[addr] & 0x7eu) == (want & 0x7eu))
				dfdebris_scanned[0] = 1u;
		}
	}
	if (dfdebris_prev_ypos != 0xffffffffu && ypos < dfdebris_prev_ypos) {
		static unsigned flush;
		dfdebris_frame();
		if (++flush >= 64u) { flush = 0u; dfdebris_report(); }
	}
	dfdebris_prev_ypos = ypos;
}

static void dfdebris_report(void)
{
	FILE *f;
	if (dfdebris_path == NULL)
		return;
	f = fopen(dfdebris_path, "w");
	if (f == NULL)
		return;
	fprintf(f, "{\"debris_active_frames\":%u,\"bottom_row_frames\":%u,"
		"\"bottom_row_player_overlap_frames\":%u,\"max_y\":%u,"
		"\"spawns\":%u,\"spawns_reaching_bottom_row\":%u,"
		"\"beam_lit_frames\":%u,\"beam_blank_frames\":%u,"
		"\"bottom_row_top\":%u}\n",
		dfdebris_active_frames, dfdebris_bottom_frames,
		dfdebris_bottom_overlap_frames, dfdebris_max_y,
		dfdebris_spawns, dfdebris_spawns_reaching_bottom,
		dfdebris_beam_lit, dfdebris_beam_blank,
		DFDEBRIS_BOTTOM_ROW_TOP);
	fclose(f);
}

/* ------------------------------------------------------------------------
 * Debris visibility gate (2026-09-16): FINAL-FRAMEBUFFER evidence.
 *
 * Enabled by DFDEBRIS_GATE_OUTPUT (CSV path). One row per host-frame
 * boundary (ANTIC ypos wrap), when Screen_atari holds the frame that has just
 * been scanned. The image a frame shows is the debris publication that
 * executed last before that frame's playfield (fighter OPEN: the post-
 * playfield window of the previous frame; capital: after the entity update,
 * in the vertical blank), so the record is latched when the render entry
 * (DFDEBRIS_PC_RENDER) executes and cleared when the erase entry
 * (DFDEBRIS_PC_ERASE) executes, and the latch is frozen at ypos 24 (the first
 * ring scanline) of every host frame ("pub_*" columns); a new game
 * (DFTRACE_PC_GAMEPLAY_INIT) drops it. Screen code = RENDER_ID|cell (|$80 while
 * OWNER != 0); glyph bytes at CHARSET+(code&$7F)*8; ANTIC 4 pairs 00 COLBK,
 * 01 COLPF0, 10 COLPF1, 11 COLPF2 (COLPF3 when bit 7 is set); pixel
 * x = 2*(HPOS+clock)-64; screen row = scanline-8; expected top scanline
 * 24+8*((Y-24)>>3). Playfield colours are sampled at ypos 120 (the HUD DLI
 * changes them before the frame ends).
 *
 * Per cell (c0_*, c1_*): foreground clocks expected / matching the glyph
 * colour / showing COLBK / showing another colour. cell_holds (sampled when
 * the beam reaches the expected row, i.e. what ANTIC fetches, against the
 * latched codes and the record's captured backing):
 * bit0/1 the ring byte is the published code, bit2/3 the ring byte is
 * neither the code nor the lower backing (a higher layer owns the cell),
 * bit4 sampled, bit6/7 the render did not write the cell (ENTITY_DRAWN_MASK:
 * a rendered effect owned it, exact ownership). game_state 6 = gameplay.
 * ---------------------------------------------------------------------- */
#define DFGATE_CHARSET 0x4400u
#define DFGATE_TOP 24u
#define DFGATE_BOTTOM 240u

struct dfgate_pub {
	unsigned rendered, y, x, render_id, owner, sector, gameplay_frame, prebuild;
	unsigned backing0, backing1;
};

static const char *dfgate_path = NULL;
static FILE *dfgate_file = NULL;
static unsigned dfgate_prev_ypos = 0xffffffffu;
static unsigned dfgate_host_frame = 0u;
static unsigned dfgate_col[5];
static unsigned dfgate_col_seen = 0u;
static unsigned dfgate_prebuild_address = 0u;
static unsigned dfgate_pc_erase = 0u, dfgate_pc_render = 0u;
static unsigned dfgate_erase_line = 0u, dfgate_render_line = 0u;
static unsigned dfgate_erase_host = 0u, dfgate_render_host = 0u;
static struct dfgate_pub dfgate_pending, dfgate_latched;
static unsigned dfgate_holds = 0u;
static unsigned dfgate_latched_seen = 0u;

static unsigned dfgate_code(const struct dfgate_pub *s, unsigned cell)
{
	return ((s->render_id | cell) & 0xffu) | (s->owner != 0u ? 0x80u : 0u);
}

static void dfgate_capture_pending(void)
{
	unsigned y = MEMORY_mem[dftrace_entity_y];
	dfgate_pending.y = y;
	dfgate_pending.x = MEMORY_mem[dftrace_entity_x];
	dfgate_pending.render_id = MEMORY_mem[dftrace_entity_render_id];
	dfgate_pending.owner = MEMORY_mem[dftrace_entity_owner];
	dfgate_pending.sector = MEMORY_mem[dftrace_sector_state];
	dfgate_pending.gameplay_frame = MEMORY_mem[dftrace_active_gameplay_frame_lo] |
		((unsigned) MEMORY_mem[dftrace_active_gameplay_frame_lo + 1u] << 8);
	dfgate_pending.prebuild = dfgate_prebuild_address != 0u ?
		MEMORY_mem[dfgate_prebuild_address] : 0u;
	dfgate_pending.rendered = (MEMORY_mem[dftrace_entity_active_mask] & 1u) != 0u &&
		y >= DFGATE_TOP && y < DFGATE_BOTTOM;
}

static unsigned dfgate_screen = 0u;
static unsigned dfgate_holds_seen = 0u;
static unsigned dfgate_drawn = 0u;

static void dfgate_latch(void)
{
	dfgate_latched = dfgate_pending;
	/* Backing bytes and the cell address are captured by the render itself. */
	dfgate_latched.backing0 = MEMORY_mem[dftrace_entity_backing0];
	dfgate_latched.backing1 = MEMORY_mem[dftrace_entity_backing0 + 1u];
	dfgate_screen = MEMORY_mem[dftrace_entity_screen_lo] |
		((unsigned) MEMORY_mem[dftrace_entity_screen_hi] << 8);
	dfgate_drawn = MEMORY_mem[dftrace_entity_drawn_mask] & 3u;
	dfgate_holds = 0u;
	dfgate_holds_seen = 0u;
	dfgate_latched_seen = 1u;
}

/* Beam-time ownership: sampled on the first scanline of the debris row. */
static void dfgate_sample_holds(void)
{
	unsigned cell;
	dfgate_holds = 0x10u | ((~dfgate_drawn & 3u) << 6);
	if (dfgate_screen != 0u) {
		for (cell = 0u; cell < 2u; ++cell) {
			unsigned byte = MEMORY_mem[(dfgate_screen + cell) & 0xffffu];
			unsigned code = dfgate_code(&dfgate_latched, cell);
			unsigned backing = cell == 0u ? dfgate_latched.backing0 : dfgate_latched.backing1;
			if (byte == code)
				dfgate_holds |= 1u << cell;
			else if (byte != backing)
				dfgate_holds |= 4u << cell;
		}
	}
	dfgate_holds_seen = 1u;
}

static void dfgate_boundary(void)
{
	unsigned expected[2] = { 0u, 0u }, matched[2] = { 0u, 0u };
	unsigned background[2] = { 0u, 0u }, other[2] = { 0u, 0u };
	unsigned in_view = 0u, bottom = 0u, exp_row = 0u;
	const struct dfgate_pub *pub = &dfgate_latched;
	if (dfgate_latched_seen && pub->rendered && Screen_atari != NULL && dfgate_col_seen) {
		unsigned cell, r, cc;
		in_view = 1u;
		exp_row = DFGATE_TOP + 8u * ((pub->y - DFGATE_TOP) >> 3);
		bottom = pub->y >= 232u;
		for (cell = 0u; cell < 2u; ++cell) {
			unsigned code = dfgate_code(pub, cell);
			unsigned hpos = pub->x + 4u * cell;
			for (r = 0u; r < 8u; ++r) {
				unsigned glyph = MEMORY_mem[DFGATE_CHARSET + (code & 0x7fu) * 8u + r];
				unsigned line_index = exp_row + r;
				const UBYTE *line;
				if (line_index < DFTRACE_CAPTURE_DMA_Y_OFFSET ||
					line_index - DFTRACE_CAPTURE_DMA_Y_OFFSET >= (unsigned) Screen_HEIGHT)
					continue;
				line = (const UBYTE *) Screen_atari +
					(size_t) (line_index - DFTRACE_CAPTURE_DMA_Y_OFFSET) * Screen_WIDTH;
				for (cc = 0u; cc < 4u; ++cc) {
					unsigned v = (glyph >> (6u - 2u * cc)) & 3u;
					unsigned x = 2u * (hpos + cc);
					unsigned px, want;
					if (v == 0u || x < 64u || x - 64u >= (unsigned) Screen_WIDTH)
						continue;
					px = line[x - 64u];
					want = v == 1u ? dfgate_col[1] : v == 2u ? dfgate_col[2] :
						(code & 0x80u) != 0u ? dfgate_col[4] : dfgate_col[3];
					++expected[cell];
					if (px == want)
						++matched[cell];
					else if (px == dfgate_col[0])
						++background[cell];
					else
						++other[cell];
				}
			}
		}
	}
	if (dfgate_file != NULL) {
		fprintf(dfgate_file,
			"%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
			dfgate_host_frame, MEMORY_mem[dftrace_game_state],
			MEMORY_mem[dftrace_active_gameplay_frame_lo] |
				((unsigned) MEMORY_mem[dftrace_active_gameplay_frame_lo + 1u] << 8),
			MEMORY_mem[dftrace_sector_state], MEMORY_mem[dftrace_entity_active_mask] & 1u,
			dfgate_latched_seen ? pub->rendered : 0u, pub->y, pub->x, pub->render_id,
			pub->owner, pub->sector, pub->gameplay_frame, pub->prebuild,
			in_view, bottom, exp_row,
			expected[0], matched[0], background[0], other[0],
			expected[1], matched[1], background[1], other[1],
			dfgate_holds, dfgate_erase_host != 0u ? dfgate_erase_line : 9999u,
			dfgate_render_host != 0u ? dfgate_render_line : 9999u);
	}
	dfgate_erase_host = dfgate_render_host = 0u;
	++dfgate_host_frame;
}

static void dfgate_observe(unsigned pc)
{
	unsigned ypos;
	if (dfgate_path == NULL)
		return;
	ypos = ANTIC_ypos;
	if (pc == dfgate_pc_erase && pc != 0u) {
		dfgate_erase_line = ypos;
		dfgate_erase_host = 1u;
		dfgate_pending.rendered = 0u;
	}
	if (pc == dfgate_pc_render && pc != 0u) {
		dfgate_render_line = ypos;
		dfgate_render_host = 1u;
		dfgate_capture_pending();
	}
	if (pc == dftrace_pc_gameplay_init && pc != 0u)
		dfgate_pending.rendered = 0u;      /* a new game rebuilds the ring */
	if (ypos == DFGATE_TOP && !dfgate_latched_seen)
		dfgate_latch();
	if (dfgate_latched_seen && !dfgate_holds_seen && dfgate_latched.rendered &&
		ypos == DFGATE_TOP + 8u * ((dfgate_latched.y - DFGATE_TOP) >> 3))
		dfgate_sample_holds();
	if (ypos == 120u && !dfgate_col_seen) {
		dfgate_col[0] = GTIA_COLBK;
		dfgate_col[1] = GTIA_COLPF0;
		dfgate_col[2] = GTIA_COLPF1;
		dfgate_col[3] = GTIA_COLPF2;
		dfgate_col[4] = GTIA_COLPF3;
		dfgate_col_seen = 1u;
	}
	if (dfgate_prev_ypos != 0xffffffffu && ypos < dfgate_prev_ypos) {
		if (dfgate_file == NULL) {
			dfgate_file = fopen(dfgate_path, "w");
			if (dfgate_file != NULL)
				fputs("host_frame,game_state,gameplay_frame,sector,active,pub_rendered,pub_y,pub_x,pub_render_id,pub_owner,pub_sector,pub_gameplay_frame,pub_prebuild,in_view,bottom_row,exp_row,c0_expected,c0_matched,c0_background,c0_other,c1_expected,c1_matched,c1_background,c1_other,cell_holds,erase_line,render_line\n", dfgate_file);
		}
		dfgate_boundary();
		dfgate_col_seen = 0u;
		dfgate_latched_seen = 0u;
		if (dfgate_file != NULL && (dfgate_host_frame & 63u) == 0u)
			fflush(dfgate_file);
	}
	dfgate_prev_ypos = ypos;
}

/* ------------------------------------------------------------------------
 * Spread projectile probe (2026-09-16).
 *
 * The owner reports that collecting Spread Shot leaves only the centre line
 * visible. Spread is implemented as a SEQUENCE (centre, left, right, centre at
 * a 28-frame interval), not a simultaneous fan, so this probe records for every
 * frame of a Spread burst which of the five player slots hold LEFT / CENTER /
 * RIGHT shots and what the FINAL framebuffer actually shows on their rows.
 * Screen-memory writes are deliberately not treated as evidence.
 * Enabled only by DFSPREAD_PROBE_OUTPUT.
 * ---------------------------------------------------------------------- */
static const char *dfspread_path = NULL;
static FILE *dfspread_file = NULL;
static unsigned dfspread_written = 0u;
static unsigned dfspread_limit = 200u;
static unsigned dfspread_prev_ypos = 0xffffffffu;

static void dfspread_frame_complete(void)
{
	unsigned slot, active_count = 0u, kinds = 0u;
	unsigned rows[DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT];
	unsigned rowcount = 0u;
	if (dfspread_file == NULL || dfspread_written >= dfspread_limit)
		return;
	/* WEAPON_PICKUP_STATE_SPREAD == 4 in the booster slot. */
	if (MEMORY_mem[dftrace_entity_state + 2u] != 4u)
		return;
	for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot)
		if (MEMORY_mem[dftrace_projectile_active + slot] != 0u)
			++active_count;
	if (active_count == 0u)
		return;

	fprintf(dfspread_file, "%s\n{\"frame\":%u,\"player_x\":%u,\"shots\":[",
		dfspread_written == 0u ? "" : ",",
		(unsigned) Atari800_nframes, MEMORY_mem[dftrace_player_x]);
	for (slot = 0u; slot < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++slot) {
		unsigned a = MEMORY_mem[dftrace_projectile_active + slot];
		const char *kind;
		if (a == 0u)
			continue;
		/* $10 centre, $20 right, $40 left */
		if (a & 0x40u)      { kind = "LEFT";   kinds |= 1u; }
		else if (a & 0x20u) { kind = "RIGHT";  kinds |= 2u; }
		else if (a & 0x10u) { kind = "CENTER"; kinds |= 4u; }
		else                  kind = "PLAIN";
		fprintf(dfspread_file, "%s{\"slot\":%u,\"kind\":\"%s\",\"active\":%u,"
			"\"x\":%u,\"y\":%u,\"life\":%u}",
			rowcount ? "," : "", slot, kind, a,
			MEMORY_mem[dftrace_projectile_x + slot],
			MEMORY_mem[dftrace_projectile_y + slot],
			MEMORY_mem[dftrace_projectile_lifetime + slot]);
		if (rowcount < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT)
			rows[rowcount++] = MEMORY_mem[dftrace_projectile_y + slot];
	}
	fprintf(dfspread_file, "],\"kinds\":%u,\"fb\":[", kinds);
	/* Final framebuffer rows the shots occupy, run-length encoded. */
	{
		unsigned i;
		int first = 1;
		for (i = 0u; i < rowcount; ++i) {
			unsigned y = rows[i];
			unsigned band;
			for (band = 0u; band < 12u; ++band) {
			unsigned screen_row, x = 0u;
			const UBYTE *line;
			int firstrun = 1;
			unsigned sample = y + band;
			if (sample < DFTRACE_CAPTURE_DMA_Y_OFFSET + 6u || Screen_atari == NULL)
				continue;
			screen_row = sample - DFTRACE_CAPTURE_DMA_Y_OFFSET - 6u;
			if (screen_row >= (unsigned) Screen_HEIGHT)
				continue;
			line = (const UBYTE *) Screen_atari + (size_t) screen_row * Screen_WIDTH;
			fprintf(dfspread_file, "%s{\"y\":%u,\"row\":%u,\"runs\":[",
				first ? "" : ",", y, screen_row);
			first = 0;
			while (x < (unsigned) Screen_WIDTH) {
				unsigned start = x;
				UBYTE v = line[x];
				while (x < (unsigned) Screen_WIDTH && line[x] == v)
					++x;
				if (v != 0u) {
					fprintf(dfspread_file, "%s[%u,%u,%u]",
						firstrun ? "" : ",", start, x - start, (unsigned) v);
					firstrun = 0;
				}
			}
			fprintf(dfspread_file, "]}");
			}
		}
	}
	fprintf(dfspread_file, "]}");
	fflush(dfspread_file);
	++dfspread_written;
}

static void dfspread_observe(void)
{
	unsigned ypos;
	if (dfspread_path == NULL)
		return;
	if (dfspread_file == NULL) {
		dfspread_file = fopen(dfspread_path, "w");
		if (dfspread_file == NULL) {
			fprintf(stderr, "voidstrike65 spread probe: cannot open %s\n", dfspread_path);
			exit(2);
		}
		fprintf(dfspread_file, "[");
	}
	ypos = ANTIC_ypos;
	if (dfspread_prev_ypos != 0xffffffffu && ypos < dfspread_prev_ypos)
		dfspread_frame_complete();
	dfspread_prev_ypos = ypos;
}

/* ------------------------------------------------------------------------
 * Pickup visibility probe (2026-09-16).
 *
 * The pre-existing pickup "visibility" gate counts rows where
 * (MEMORY_mem[0x3b00+row] & 0xf0) != 0.  That mask encodes the same belief as
 * the guest comment at src/main.s ("GTIA consumes only M0-M3 bits 4-7"), so
 * the check can only ever confirm what the implementation already assumes and
 * it never inspects a rendered pixel.  This probe deliberately shares no
 * assumption with the guest:
 *
 *   - missile bytes are sampled AS THE BEAM CROSSES each scanline, not at the
 *     end of the frame, so an erase/late-render race is visible;
 *   - every missile is decoded separately (M0=bits0-1 .. M3=bits6-7);
 *   - the final framebuffer is dumped as run-length rows, so the pixel
 *     representation is observed empirically instead of being asserted to
 *     equal COLPF3.
 *
 * Enabled only by DFPICKUP_PROBE_OUTPUT; otherwise every hook is inert.
 * ---------------------------------------------------------------------- */
#define DFPROBE_SCANLINES 312u
#define DFPROBE_ROWS 16u

static FILE *dfprobe_file = NULL;
static const char *dfprobe_path = NULL;
static int dfprobe_ready = 0;
static unsigned dfprobe_prev_ypos = 0xffffffffu;
static unsigned char dfprobe_beam_missiles[DFPROBE_SCANLINES];
static unsigned char dfprobe_beam_seen[DFPROBE_SCANLINES];
static unsigned dfprobe_written = 0u;
static unsigned dfprobe_limit = 10u;
static unsigned dfprobe_frame_index = 0u;
static unsigned dfprobe_type_seen[4];
static unsigned dfprobe_type_limit = 3u;

static int dfprobe_emit_row(unsigned screen_row)
{
	const UBYTE *row;
	unsigned x = 0u;
	int first = 1;
	if (Screen_atari == NULL || screen_row >= (unsigned) Screen_HEIGHT)
		return 0;
	row = (const UBYTE *) Screen_atari + (size_t) screen_row * Screen_WIDTH;
	fprintf(dfprobe_file, "{\"screen_row\":%u,\"runs\":[", screen_row);
	while (x < (unsigned) Screen_WIDTH) {
		unsigned start = x;
		UBYTE value = row[x];
		while (x < (unsigned) Screen_WIDTH && row[x] == value)
			++x;
		fprintf(dfprobe_file, "%s[%u,%u,%u]", first ? "" : ",",
			start, x - start, (unsigned) value);
		first = 0;
	}
	fprintf(dfprobe_file, "]}");
	return 1;
}

static void dfprobe_frame_complete(void)
{
	unsigned state, pickup_x, pickup_y, top, row;
	if (!dfprobe_ready || dfprobe_written >= dfprobe_limit)
		return;
	state = MEMORY_mem[dftrace_entity_state + 1u];
	if (state != 2u)                      /* WEAPON_PICKUP_STATE_ACTIVE */
		return;
	/* Sample a few frames of EACH booster type instead of filling the log with
	 * the first capsule's whole descent; the type cycles once per spawn. */
	{
		unsigned t = MEMORY_mem[dftrace_entity_type + 1u] & 3u;
		if (dfprobe_type_seen[t] >= dfprobe_type_limit)
			return;
		++dfprobe_type_seen[t];
	}
	pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
	pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
	top = (pickup_y + DFTRACE_CAPTURE_DMA_Y_OFFSET) & 0xffu;

	fprintf(dfprobe_file, "%s\n{\"frame\":%u,\"host_frame\":%u,"
		"\"pickup_x\":%u,\"pickup_y\":%u,\"pmg_top\":%u,"
		"\"hposm\":[%u,%u,%u,%u],\"sizem\":%u,\"prior\":%u,"
		"\"gractl\":%u,\"dmactl\":%u,\"colpf3\":%u,\"colbk\":%u,\n \"rows\":[",
		dfprobe_written == 0u ? "" : ",",
		dfprobe_frame_index, (unsigned) Atari800_nframes,
		pickup_x, pickup_y, top,
		GTIA_HPOSM0, GTIA_HPOSM1, GTIA_HPOSM2, GTIA_HPOSM3,
		GTIA_SIZEM, GTIA_PRIOR,
		(unsigned) GTIA_GRACTL, (unsigned) ANTIC_DMACTL,
		GTIA_COLPF3, GTIA_COLBK);

	for (row = 0u; row < DFPROBE_ROWS; ++row) {
		unsigned y = (top + row) & 0xffu;
		unsigned beam = dfprobe_beam_seen[y] ? dfprobe_beam_missiles[y] : 0u;
		unsigned now = MEMORY_mem[0x3b00u + y];
		fprintf(dfprobe_file,
			"%s{\"y\":%u,\"beam\":%u,\"end\":%u,"
			"\"beam_m\":[%u,%u,%u,%u],\"end_m\":[%u,%u,%u,%u],\"sampled\":%u}",
			row == 0u ? "" : ",", y, beam, now,
			beam & 3u, (beam >> 2) & 3u, (beam >> 4) & 3u, (beam >> 6) & 3u,
			now & 3u, (now >> 2) & 3u, (now >> 4) & 3u, (now >> 6) & 3u,
			(unsigned) dfprobe_beam_seen[y]);
	}
	/* Row-by-row FINAL-FRAMEBUFFER signature: for each capsule scanline,
	 * sample the eight colour clocks the mark occupies and record which ones
	 * actually differ from the background this frame. This is the silhouette
	 * as displayed, independent of what the shape table claims. */
	fprintf(dfprobe_file, "],\n \"type\":%u,\"fb_rows\":[",
		MEMORY_mem[dftrace_entity_type + 1u]);
	for (row = 0u; row < DFPROBE_ROWS; ++row) {
		unsigned y = (top + row) & 0xffu;
		unsigned mask = 0u;
		unsigned cc;
		if (y >= DFTRACE_CAPTURE_DMA_Y_OFFSET &&
			(y - DFTRACE_CAPTURE_DMA_Y_OFFSET) < (unsigned) Screen_HEIGHT &&
			Screen_atari != NULL) {
			const UBYTE *line = (const UBYTE *) Screen_atari +
				(size_t) (y - DFTRACE_CAPTURE_DMA_Y_OFFSET) * Screen_WIDTH;
			unsigned base = 2u * GTIA_HPOSM0 - 64u;
			for (cc = 0u; cc < 8u; ++cc) {
				unsigned x = base + 2u * cc;
				if (x < (unsigned) Screen_WIDTH && line[x] == GTIA_COLPF3)
					mask |= 1u << (7u - cc);   /* bit7 = leftmost colour clock */
			}
		}
		fprintf(dfprobe_file, "%s%u", row == 0u ? "" : ",", mask);
	}
	fprintf(dfprobe_file, "],\n \"screen\":[");
	/* Capsule rows plus a few below, clipped rows simply omitted. A separator
	 * is written only after a row that actually emitted, so the array stays
	 * valid JSON when the capsule reaches the bottom of the screen. */
	{
		int emitted = 0;
		for (row = 0u; row < DFPROBE_ROWS + 4u; ++row) {
			unsigned y = (top + row) & 0xffu;
			if (y < DFTRACE_CAPTURE_DMA_Y_OFFSET)
				continue;
			if (emitted)
				fprintf(dfprobe_file, ",");
			if (!dfprobe_emit_row(y - DFTRACE_CAPTURE_DMA_Y_OFFSET)) {
				if (emitted)
					fseek(dfprobe_file, -1L, SEEK_CUR);
				continue;
			}
			emitted = 1;
		}
	}
	fprintf(dfprobe_file, "]}");
	fflush(dfprobe_file);
	++dfprobe_written;
}

static void dfprobe_observe(void)
{
	unsigned ypos;
	if (dfprobe_path == NULL)
		return;
	if (dfprobe_file == NULL) {
		dfprobe_file = fopen(dfprobe_path, "w");
		if (dfprobe_file == NULL) {
			fprintf(stderr, "voidstrike65 probe: cannot open %s\n", dfprobe_path);
			exit(2);
		}
		fprintf(dfprobe_file, "[");
		dfprobe_ready = 1;
	}
	ypos = ANTIC_ypos;
	if (ypos == dfprobe_prev_ypos)
		return;
	if (ypos < DFPROBE_SCANLINES) {
		dfprobe_beam_missiles[ypos] = MEMORY_mem[0x3b00u + ypos];
		dfprobe_beam_seen[ypos] = 1u;
	}
	if (dfprobe_prev_ypos != 0xffffffffu && ypos < dfprobe_prev_ypos) {
		dfprobe_frame_complete();
		++dfprobe_frame_index;
		memset(dfprobe_beam_seen, 0, sizeof(dfprobe_beam_seen));
	}
	dfprobe_prev_ypos = ypos;
}

static void dftrace_init(void)
{
	const char *ram_fill = getenv("DFTRACE_RAM_FILL");
	if (ram_fill != NULL) {
		unsigned address;
		unsigned fill = dftrace_env_u("DFTRACE_RAM_FILL");
		if (fill > 0xffu) {
			fprintf(stderr, "voidstrike65 trace: RAM fill exceeds one byte\n");
			exit(2);
		}
		for (address = 0x8000u; address < 0xa000u; ++address)
			MEMORY_mem[address] = (UBYTE) fill;
	}
	dftrace_limit = dftrace_env_u("DFTRACE_FRAMES");
    dftrace_active_limit = getenv("DFTRACE_ACTIVE_FRAMES") == NULL ? 0u :
        dftrace_env_u("DFTRACE_ACTIVE_FRAMES");
	dftrace_fire_delay = dftrace_env_u("DFTRACE_FIRE_DELAY");
	dftrace_hold_player_lives = getenv("DFTRACE_HOLD_PLAYER_LIVES") == NULL ? 0u :
		dftrace_env_u("DFTRACE_HOLD_PLAYER_LIVES");
	dftrace_difficulty = dftrace_env_u("DFTRACE_DIFFICULTY");
	dftrace_frontend_delay = getenv("DFTRACE_FRONTEND_DELAY") == NULL ? 0u :
		dftrace_env_u("DFTRACE_FRONTEND_DELAY");
	dftrace_engine_screenshot_generation =
		getenv("DFTRACE_ENGINE_SCREENSHOT_GENERATION") == NULL ? 1u :
		dftrace_env_u("DFTRACE_ENGINE_SCREENSHOT_GENERATION");
	dftrace_engine_screenshot_limit =
		getenv("DFTRACE_ENGINE_SCREENSHOT_LIMIT") == NULL ? 150u :
		dftrace_env_u("DFTRACE_ENGINE_SCREENSHOT_LIMIT");
	if (dftrace_difficulty > 2) {
		fprintf(stderr, "voidstrike65 trace: invalid difficulty %u\n", dftrace_difficulty);
		exit(2);
	}
	dftrace_policy = getenv("DFTRACE_POLICY");
	dftrace_pmg_lab_screenshot = getenv("DFTRACE_PMG_LAB_SCREENSHOT");
	dftrace_session = getenv("DFTRACE_SESSION");
	dftrace_output = getenv("DFTRACE_OUTPUT");
	dftrace_interceptor_projectile_output = getenv("DFTRACE_INTERCEPTOR_PROJECTILE_OUTPUT");
	dftrace_sector_clock_output = getenv("DFTRACE_SECTOR_CLOCK_OUTPUT");
	dftrace_light_output = getenv("DFTRACE_LIGHT_OUTPUT");
	if (dftrace_light_output != NULL) {
		unsigned slot;
		dftrace_light_base = dftrace_env_u("DFTRACE_LIGHT_BASE");
		/* The kernel's vector table base; the five entries are 3 B apart. */
		dftrace_light_vector[0] = dftrace_env_u("DFTRACE_LIGHT_VECTOR_BASE");
		for (slot = 1u; slot < DFTRACE_LIGHT_VECTORS; slot++)
			dftrace_light_vector[slot] = dftrace_light_vector[0] + slot * 3u;
		if (getenv("DFTRACE_LIGHT_CEILING") != NULL) {
			dftrace_light_ceiling = dftrace_env_u("DFTRACE_LIGHT_CEILING");
			dftrace_light_ceiling_value =
				dftrace_env_u("DFTRACE_LIGHT_CEILING_VALUE");
		}
	}
	dftrace_player_pairshot_output = getenv("DFTRACE_PLAYER_PAIRSHOT_OUTPUT");
	dftrace_first_writer_output = getenv("DFTRACE_FIRST_WRITER_OUTPUT");
	if (dftrace_policy == NULL || dftrace_session == NULL || dftrace_output == NULL) {
		fprintf(stderr, "voidstrike65 trace: missing string environment\n");
		exit(2);
	}
	if (dftrace_first_writer_output != NULL && *dftrace_first_writer_output != '\0') {
		dftrace_first_writer_file = fopen(dftrace_first_writer_output, "w");
		if (dftrace_first_writer_file == NULL) {
			perror("voidstrike65 first-writer trace");
			exit(2);
		}
		fputs("session,kind,frame,active_frame,host_frame,clock,vcount,cycle,address,old_value,new_value,writer_pc,x_register,y_register,logical_row,column,physical_row,ring_head,owner_mask,target_slot,enemy_state0,enemy_state1,enemy_x0,enemy_x1,enemy_y0,enemy_y1,entity_active_mask,entity_x,entity_y,effect_active_mask,player_projectiles,enemy_projectiles,sector_state,ring_flags,gameplay_frame,origin_frame,origin_clock,origin_vcount,origin_cycle\n",
			dftrace_first_writer_file);
		memcpy(dftrace_first_writer_shadow, MEMORY_mem,
			sizeof(dftrace_first_writer_shadow));
	}
	dftrace_frames = (DFTraceFrame *) calloc(dftrace_limit, sizeof(*dftrace_frames));
	if (dftrace_frames == NULL) {
		fprintf(stderr, "voidstrike65 trace: allocation failed\n");
		exit(2);
	}
#define DFTRACE_ADDRESS(field, env) field = dftrace_env_u(env)
	DFTRACE_ADDRESS(dftrace_pc_active, "DFTRACE_PC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_pc_end, "DFTRACE_PC_END");
	DFTRACE_ADDRESS(dftrace_pc_player_shot_sound, "DFTRACE_PC_PLAYER_SHOT_SOUND");
	DFTRACE_ADDRESS(dftrace_pc_update_sound, "DFTRACE_PC_UPDATE_SOUND");
	{
		unsigned profile_index;
		char profile_environment[32];
		for (profile_index = 0; profile_index < DFTRACE_PROFILE_COUNT; ++profile_index) {
			snprintf(profile_environment, sizeof(profile_environment),
				"DFTRACE_PC_PROFILE%u", profile_index);
			dftrace_pc_profile[profile_index] = dftrace_env_u(profile_environment);
		}
	}
	DFTRACE_ADDRESS(dftrace_pc_dli_end, "DFTRACE_PC_DLI_END");
	DFTRACE_ADDRESS(dftrace_pc_dli_hud_end, "DFTRACE_PC_DLI_HUD_END");
	DFTRACE_ADDRESS(dftrace_pc_compose_start, "DFTRACE_PC_COMPOSE_START");
	DFTRACE_ADDRESS(dftrace_pc_compose_end, "DFTRACE_PC_COMPOSE_END");
	DFTRACE_ADDRESS(dftrace_pc_pointer_start, "DFTRACE_PC_POINTER_START");
	DFTRACE_ADDRESS(dftrace_pc_pointer_end, "DFTRACE_PC_POINTER_END");
	DFTRACE_ADDRESS(dftrace_pc_publication_begin, "DFTRACE_PC_PUBLICATION_BEGIN");
	DFTRACE_ADDRESS(dftrace_pc_erase_slot, "DFTRACE_PC_ERASE_SLOT");
	DFTRACE_ADDRESS(dftrace_pc_projectile_restore, "DFTRACE_PC_PROJECTILE_RESTORE");
	DFTRACE_ADDRESS(dftrace_pc_projectile_update_start, "DFTRACE_PC_PROJECTILE_UPDATE_START");
	DFTRACE_ADDRESS(dftrace_pc_interceptor_update_start, "DFTRACE_PC_INTERCEPTOR_UPDATE_START");
	DFTRACE_ADDRESS(dftrace_pc_render_slot, "DFTRACE_PC_RENDER_SLOT");
	DFTRACE_ADDRESS(dftrace_pc_render_end, "DFTRACE_PC_RENDER_END");
	DFTRACE_ADDRESS(dftrace_pc_claim_projectile, "DFTRACE_PC_CLAIM_PROJECTILE");
	DFTRACE_ADDRESS(dftrace_pc_entity_erase_start, "DFTRACE_PC_ENTITY_ERASE_START");
	DFTRACE_ADDRESS(dftrace_pc_effect_update_end, "DFTRACE_PC_EFFECT_UPDATE_END");
	DFTRACE_ADDRESS(dftrace_pc_pickup_update_end, "DFTRACE_PC_PICKUP_UPDATE_END");
	DFTRACE_ADDRESS(dftrace_pc_frontend_poll, "DFTRACE_PC_FRONTEND_POLL");
	DFTRACE_ADDRESS(dftrace_pc_dli, "DFTRACE_PC_DLI");
	DFTRACE_ADDRESS(dftrace_pc_world, "DFTRACE_PC_WORLD");
	DFTRACE_ADDRESS(dftrace_pc_near, "DFTRACE_PC_NEAR");
	DFTRACE_ADDRESS(dftrace_pc_far_erase, "DFTRACE_PC_FAR_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_far_step, "DFTRACE_PC_FAR_STEP");
	DFTRACE_ADDRESS(dftrace_pc_hull, "DFTRACE_PC_HULL");
	DFTRACE_ADDRESS(dftrace_pc_broadside, "DFTRACE_PC_BROADSIDE");
	DFTRACE_ADDRESS(dftrace_pc_fighter_explosion, "DFTRACE_PC_FIGHTER_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_capital_explosion, "DFTRACE_PC_CAPITAL_EXPLOSION");
	DFTRACE_ADDRESS(dftrace_pc_music_tick, "DFTRACE_PC_MUSIC_TICK");
	DFTRACE_ADDRESS(dftrace_pc_entity_spawn, "DFTRACE_PC_ENTITY_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_contact, "DFTRACE_PC_ENTITY_CONTACT");
	DFTRACE_ADDRESS(dftrace_pc_entity_despawn, "DFTRACE_PC_ENTITY_DESPAWN");
	DFTRACE_ADDRESS(dftrace_pc_entity_shot, "DFTRACE_PC_ENTITY_SHOT");
	DFTRACE_ADDRESS(dftrace_pc_effect_spawn, "DFTRACE_PC_EFFECT_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_effect_erase, "DFTRACE_PC_EFFECT_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_effect_update, "DFTRACE_PC_EFFECT_UPDATE");
	DFTRACE_ADDRESS(dftrace_pc_effect_render, "DFTRACE_PC_EFFECT_RENDER");
	DFTRACE_ADDRESS(dftrace_pc_interceptor_breakup_request,
		"DFTRACE_PC_INTERCEPTOR_BREAKUP_REQUEST");
	DFTRACE_ADDRESS(dftrace_pc_interceptor_breakup_spawn, "DFTRACE_PC_INTERCEPTOR_BREAKUP_SPAWN");
	DFTRACE_ADDRESS(dftrace_pc_emitter_cleanup, "DFTRACE_PC_EMITTER_CLEANUP");
	DFTRACE_ADDRESS(dftrace_pc_emitter_cleanup_end, "DFTRACE_PC_EMITTER_CLEANUP_END");
	DFTRACE_ADDRESS(dftrace_pc_pickup_qualified_kill, "DFTRACE_PC_PICKUP_QUALIFIED_KILL");
	DFTRACE_ADDRESS(dftrace_pc_pickup_collect, "DFTRACE_PC_PICKUP_COLLECT");
	DFTRACE_ADDRESS(dftrace_pc_director_world, "DFTRACE_PC_DIRECTOR_WORLD");
	DFTRACE_ADDRESS(dftrace_pc_director_request, "DFTRACE_PC_DIRECTOR_REQUEST");
	DFTRACE_ADDRESS(dftrace_pc_director_event, "DFTRACE_PC_DIRECTOR_EVENT");
	DFTRACE_ADDRESS(dftrace_pc_entity_erase, "DFTRACE_PC_ENTITY_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_after_entity_erase, "DFTRACE_PC_AFTER_ENTITY_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_entity_draw, "DFTRACE_PC_ENTITY_DRAW");
	DFTRACE_ADDRESS(dftrace_pc_player_erase, "DFTRACE_PC_PLAYER_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_player_draw, "DFTRACE_PC_PLAYER_DRAW");
	DFTRACE_ADDRESS(dftrace_pc_engine_update, "DFTRACE_PC_ENGINE_UPDATE");
	DFTRACE_ADDRESS(dftrace_pc_engine_copy, "DFTRACE_PC_ENGINE_COPY");
	DFTRACE_ADDRESS(dftrace_pc_capital_collision, "DFTRACE_PC_CAPITAL_COLLISION");
	DFTRACE_ADDRESS(dftrace_pc_capital_player_damage, "DFTRACE_PC_CAPITAL_PLAYER_DAMAGE");
	DFTRACE_ADDRESS(dftrace_pc_capital_player_aabb_hit,
		"DFTRACE_PC_CAPITAL_PLAYER_AABB_HIT");
	DFTRACE_ADDRESS(dftrace_pc_capital_player_aabb_miss,
		"DFTRACE_PC_CAPITAL_PLAYER_AABB_MISS");
	DFTRACE_ADDRESS(dftrace_pc_broad_erase_begin, "DFTRACE_PC_BROAD_ERASE_BEGIN");
	DFTRACE_ADDRESS(dftrace_pc_broad_erase_restored, "DFTRACE_PC_BROAD_ERASE_RESTORED");
	DFTRACE_ADDRESS(dftrace_pc_broad_erase_end, "DFTRACE_PC_BROAD_ERASE_END");
	DFTRACE_ADDRESS(dftrace_pc_broad_draw_begin, "DFTRACE_PC_BROAD_DRAW_BEGIN");
	DFTRACE_ADDRESS(dftrace_pc_broad_backing_captured, "DFTRACE_PC_BROAD_BACKING_CAPTURED");
	DFTRACE_ADDRESS(dftrace_pc_broad_draw_end, "DFTRACE_PC_BROAD_DRAW_END");
	DFTRACE_ADDRESS(dftrace_pc_broad_impact, "DFTRACE_PC_BROAD_IMPACT");
	DFTRACE_ADDRESS(dftrace_pc_gameplay_init, "DFTRACE_PC_GAMEPLAY_INIT");
	DFTRACE_ADDRESS(dftrace_pc_rotate_start, "DFTRACE_PC_ROTATE_START");
	DFTRACE_ADDRESS(dftrace_pc_rotate_end, "DFTRACE_PC_ROTATE_END");
	DFTRACE_ADDRESS(dftrace_pc_near_erase, "DFTRACE_PC_NEAR_ERASE");
	DFTRACE_ADDRESS(dftrace_pc_near_render, "DFTRACE_PC_NEAR_RENDER");
	dftrace_pc_dlist_publish = dftrace_pc_dli;
	DFTRACE_ADDRESS(dftrace_dli_phase, "DFTRACE_DLI_PHASE");
	DFTRACE_ADDRESS(dftrace_player_x, "DFTRACE_PLAYER_X");
	DFTRACE_ADDRESS(dftrace_player_y, "DFTRACE_PLAYER_Y");
	DFTRACE_ADDRESS(dftrace_projectile_active, "DFTRACE_PROJECTILE_ACTIVE");
	DFTRACE_ADDRESS(dftrace_projectile_rendered, "DFTRACE_PROJECTILE_RENDERED");
	DFTRACE_ADDRESS(dftrace_projectile_screen_lo, "DFTRACE_PROJECTILE_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_projectile_screen_hi, "DFTRACE_PROJECTILE_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_projectile_backing_top, "DFTRACE_PROJECTILE_BACKING_TOP");
	DFTRACE_ADDRESS(dftrace_broad_state, "DFTRACE_BROAD_STATE");
	DFTRACE_ADDRESS(dftrace_broad_schedule_timer, "DFTRACE_BROAD_SCHEDULE_TIMER");
	DFTRACE_ADDRESS(dftrace_broad_schedule_index, "DFTRACE_BROAD_SCHEDULE_INDEX");
	DFTRACE_ADDRESS(dftrace_broad_visible_scrolls, "DFTRACE_BROAD_VISIBLE_SCROLLS");
	DFTRACE_ADDRESS(dftrace_broad_turret_fired, "DFTRACE_BROAD_TURRET_FIRED");
	DFTRACE_ADDRESS(dftrace_corridor_phase, "DFTRACE_CORRIDOR_PHASE");
	DFTRACE_ADDRESS(dftrace_corridor_phase_hi, "DFTRACE_CORRIDOR_PHASE_HI");
	DFTRACE_ADDRESS(dftrace_loader_repeat_value, "DFTRACE_LOADER_REPEAT_VALUE");
	DFTRACE_ADDRESS(dftrace_capital_drain_rows, "DFTRACE_CAPITAL_DRAIN_ROWS");
	DFTRACE_ADDRESS(dftrace_far_active, "DFTRACE_FAR_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_active, "DFTRACE_ENEMY_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_x, "DFTRACE_ENEMY_X");
	DFTRACE_ADDRESS(dftrace_enemy_member_state, "DFTRACE_ENEMY_MEMBER_STATE");
	DFTRACE_ADDRESS(dftrace_enemy_hp, "DFTRACE_ENEMY_HP");
	DFTRACE_ADDRESS(dftrace_enemy_live_count, "DFTRACE_ENEMY_LIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_fighter_explosion_timer, "DFTRACE_FIGHTER_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_explosion_timer, "DFTRACE_CAPITAL_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_music_active, "DFTRACE_MUSIC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_fire_timer, "DFTRACE_FIRE_TIMER");
	DFTRACE_ADDRESS(dftrace_player_burst_state, "DFTRACE_PLAYER_BURST_STATE");
	DFTRACE_ADDRESS(dftrace_hit_timer, "DFTRACE_HIT_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_sound_timer, "DFTRACE_CAPITAL_SOUND_TIMER");
	DFTRACE_ADDRESS(dftrace_sound_enabled, "DFTRACE_SOUND_ENABLED");
	DFTRACE_ADDRESS(dftrace_player_lifecycle, "DFTRACE_PLAYER_LIFECYCLE");
	DFTRACE_ADDRESS(dftrace_sector_state, "DFTRACE_SECTOR_STATE");
	DFTRACE_ADDRESS(dftrace_game_state, "DFTRACE_GAME_STATE");
	DFTRACE_ADDRESS(dftrace_frontend_selection, "DFTRACE_FRONTEND_SELECTION");
	DFTRACE_ADDRESS(dftrace_frontend_input_armed, "DFTRACE_FRONTEND_INPUT_ARMED");
	DFTRACE_ADDRESS(dftrace_difficulty_setting, "DFTRACE_DIFFICULTY_SETTING");
	DFTRACE_ADDRESS(dftrace_gameplay_frame, "DFTRACE_GAMEPLAY_FRAME");
	DFTRACE_ADDRESS(dftrace_active_gameplay_frame_lo, "DFTRACE_ACTIVE_GAMEPLAY_FRAME_LO");
	DFTRACE_ADDRESS(dftrace_enemy_y, "DFTRACE_ENEMY_Y");
	DFTRACE_ADDRESS(dftrace_enemy_archetype, "DFTRACE_ENEMY_ARCHETYPE");
	DFTRACE_ADDRESS(dftrace_enemy_body_data, "DFTRACE_ENEMY_BODY_DATA");
	DFTRACE_ADDRESS(dftrace_enemy_frame_heights, "DFTRACE_ENEMY_FRAME_HEIGHTS");
	DFTRACE_ADDRESS(dftrace_director_state, "DFTRACE_DIRECTOR_STATE");
	DFTRACE_ADDRESS(dftrace_muzzle_screen_hi, "DFTRACE_MUZZLE_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_muzzle_screen_lo, "DFTRACE_MUZZLE_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_muzzle_row_domain, "DFTRACE_MUZZLE_ROW_DOMAIN");
	DFTRACE_ADDRESS(dftrace_muzzle_visible_row, "DFTRACE_MUZZLE_VISIBLE_ROW");
	DFTRACE_ADDRESS(dftrace_broad_turret, "DFTRACE_BROAD_TURRET");
	DFTRACE_ADDRESS(dftrace_broad_row_lo, "DFTRACE_BROAD_ROW_LO");
	DFTRACE_ADDRESS(dftrace_broad_row_hi, "DFTRACE_BROAD_ROW_HI");
	DFTRACE_ADDRESS(dftrace_broad_flash_timer, "DFTRACE_BROAD_FLASH_TIMER");
	DFTRACE_ADDRESS(dftrace_playfield_broad_row, "DFTRACE_PLAYFIELD_BROAD_ROW");
	DFTRACE_ADDRESS(dftrace_broad_raster_top, "DFTRACE_BROAD_RASTER_TOP");
	DFTRACE_ADDRESS(dftrace_entity_active_count, "DFTRACE_ENTITY_ACTIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_entity_x, "DFTRACE_ENTITY_X");
	DFTRACE_ADDRESS(dftrace_entity_y, "DFTRACE_ENTITY_Y");
	DFTRACE_ADDRESS(dftrace_entity_vx, "DFTRACE_ENTITY_VX");
	DFTRACE_ADDRESS(dftrace_entity_vy, "DFTRACE_ENTITY_VY");
	DFTRACE_ADDRESS(dftrace_entity_move_accumulator, "DFTRACE_ENTITY_MOVE_ACCUMULATOR");
	DFTRACE_ADDRESS(dftrace_entity_vertical_accumulator, "DFTRACE_ENTITY_VERTICAL_ACCUMULATOR");
	DFTRACE_ADDRESS(dftrace_entity_render_id, "DFTRACE_ENTITY_RENDER_ID");
	DFTRACE_ADDRESS(dftrace_entity_active_mask, "DFTRACE_ENTITY_ACTIVE_MASK");
	DFTRACE_ADDRESS(dftrace_entity_type, "DFTRACE_ENTITY_TYPE");
	DFTRACE_ADDRESS(dftrace_entity_state, "DFTRACE_ENTITY_STATE");
	DFTRACE_ADDRESS(dftrace_entity_hp, "DFTRACE_ENTITY_HP");
	DFTRACE_ADDRESS(dftrace_entity_timer, "DFTRACE_ENTITY_TIMER");
	DFTRACE_ADDRESS(dftrace_entity_owner, "DFTRACE_ENTITY_OWNER");
	DFTRACE_ADDRESS(dftrace_entity_drawn_mask, "DFTRACE_ENTITY_DRAWN_MASK");
	DFTRACE_ADDRESS(dftrace_entity_screen_lo, "DFTRACE_ENTITY_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_entity_screen_hi, "DFTRACE_ENTITY_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_entity_backing0, "DFTRACE_ENTITY_BACKING0");
	DFTRACE_ADDRESS(dftrace_entity_backing1, "DFTRACE_ENTITY_BACKING1");
	DFTRACE_ADDRESS(dftrace_entity_backing2, "DFTRACE_ENTITY_BACKING2");
	DFTRACE_ADDRESS(dftrace_entity_backing3, "DFTRACE_ENTITY_BACKING3");
	DFTRACE_ADDRESS(dftrace_playfield_row_lo, "DFTRACE_PLAYFIELD_ROW_LO");
	DFTRACE_ADDRESS(dftrace_playfield_row_hi, "DFTRACE_PLAYFIELD_ROW_HI");
	DFTRACE_ADDRESS(dftrace_score_lo, "DFTRACE_SCORE_LO");
	DFTRACE_ADDRESS(dftrace_score_hi, "DFTRACE_SCORE_HI");
	DFTRACE_ADDRESS(dftrace_effect_active_mask, "DFTRACE_EFFECT_ACTIVE_MASK");
	DFTRACE_ADDRESS(dftrace_effect_active_count, "DFTRACE_EFFECT_ACTIVE_COUNT");
	DFTRACE_ADDRESS(dftrace_projectile_x, "DFTRACE_PROJECTILE_X");
	DFTRACE_ADDRESS(dftrace_projectile_y, "DFTRACE_PROJECTILE_Y");
	DFTRACE_ADDRESS(dftrace_projectile_lifetime, "DFTRACE_PROJECTILE_LIFETIME");
	DFTRACE_ADDRESS(dftrace_effect_rendered_mask, "DFTRACE_EFFECT_RENDERED_MASK");
	DFTRACE_ADDRESS(dftrace_effect_y, "DFTRACE_EFFECT_Y");
	DFTRACE_ADDRESS(dftrace_effect_screen_lo, "DFTRACE_EFFECT_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_effect_screen_hi, "DFTRACE_EFFECT_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_enemy_target_slot, "DFTRACE_ENEMY_TARGET_SLOT");
	DFTRACE_ADDRESS(dftrace_engine_timer, "DFTRACE_ENGINE_TIMER");
	DFTRACE_ADDRESS(dftrace_engine_phase, "DFTRACE_ENGINE_PHASE");
	DFTRACE_ADDRESS(dftrace_corridor_phase, "DFTRACE_CORRIDOR_PHASE");
	DFTRACE_ADDRESS(dftrace_ring_flags, "DFTRACE_RING_FLAGS");
	DFTRACE_ADDRESS(dftrace_active_dlist_lo, "DFTRACE_ACTIVE_DLIST_LO");
	DFTRACE_ADDRESS(dftrace_next_dlist_lo, "DFTRACE_NEXT_DLIST_LO");
	DFTRACE_ADDRESS(dftrace_near_row, "DFTRACE_NEAR_ROW");
	DFTRACE_ADDRESS(dftrace_near_column, "DFTRACE_NEAR_COLUMN");
	DFTRACE_ADDRESS(dftrace_near_screen_lo, "DFTRACE_NEAR_SCREEN_LO");
	DFTRACE_ADDRESS(dftrace_near_screen_hi, "DFTRACE_NEAR_SCREEN_HI");
	DFTRACE_ADDRESS(dftrace_dst_ptr, "DFTRACE_DST_PTR");
#undef DFTRACE_ADDRESS
	{
		const char *near_output = getenv("DFTRACE_NEAR_OUTPUT");
		if (near_output != NULL && *near_output != '\0') {
			dftrace_near_file = fopen(near_output, "w");
			if (dftrace_near_file == NULL) {
				perror("voidstrike65 near-star output");
				exit(2);
			}
			fputs("trace_frame,host_frame,gameplay_frame,scanline,cycle,clock,event,slot,pc,previous_pc,row,column,address,pointer,visible_row,physical_row,address_value,pointer_value,last_writer_pc,glyph_row0,chbase,colpf0,colpf1,sector_state,ring_flags,visible_near_cells,orphan_near_cells,first_orphan_address,first_orphan_writer_pc\n", dftrace_near_file);
		}
	}
	dfdebris_path = getenv("DFDEBRIS_ROW_OUTPUT");
	dfgate_path = getenv("DFDEBRIS_GATE_OUTPUT");
	if (getenv("DFDEBRIS_PC_ERASE") != NULL)
		dfgate_pc_erase = dftrace_env_u("DFDEBRIS_PC_ERASE");
	if (getenv("DFDEBRIS_PC_RENDER") != NULL)
		dfgate_pc_render = dftrace_env_u("DFDEBRIS_PC_RENDER");
	if (getenv("DFTRACE_PLAYFIELD_PREBUILD_PENDING") != NULL)
		dfgate_prebuild_address = dftrace_env_u("DFTRACE_PLAYFIELD_PREBUILD_PENDING");
	dfspread_path = getenv("DFSPREAD_PROBE_OUTPUT");
	dfprobe_path = getenv("DFPICKUP_PROBE_OUTPUT");
	if (getenv("DFPICKUP_PROBE_FRAMES") != NULL)
		dfprobe_limit = (unsigned) strtoul(getenv("DFPICKUP_PROBE_FRAMES"), NULL, 10);
	if (getenv("DFPICKUP_PROBE_PER_TYPE") != NULL)
		dfprobe_type_limit = (unsigned) strtoul(getenv("DFPICKUP_PROBE_PER_TYPE"), NULL, 10);
	dftrace_pickup_screenshot = getenv("DFTRACE_PICKUP_SCREENSHOT");
	dftrace_pickup_sequence_prefix = getenv("DFTRACE_PICKUP_SEQUENCE_PREFIX");
	dftrace_pickup_traversal_prefix = getenv("DFTRACE_PICKUP_TRAVERSAL_PREFIX");
	dftrace_pickup_contact_prefix = getenv("DFTRACE_PICKUP_CONTACT_PREFIX");
	dftrace_muzzle_screenshot_prefix = getenv("DFTRACE_MUZZLE_SCREENSHOT_PREFIX");
	dftrace_capital_contact_prefix = getenv("DFTRACE_CAPITAL_CONTACT_PREFIX");
	if (dftrace_capital_contact_prefix != NULL && *dftrace_capital_contact_prefix != '\0') {
		dftrace_capital_contact_owner = dftrace_env_u("DFTRACE_CAPITAL_CONTACT_OWNER");
		dftrace_capital_contact_mode = dftrace_env_u("DFTRACE_CAPITAL_CONTACT_MODE");
		if (dftrace_capital_contact_owner > 1u || dftrace_capital_contact_mode > 3u) {
			fprintf(stderr, "voidstrike65 trace: invalid capital contact owner %u\n",
				dftrace_capital_contact_owner);
			exit(2);
		}
	}
	dftrace_rapid_screenshot = getenv("DFTRACE_RAPID_SCREENSHOT");
	dftrace_spread_screenshot = getenv("DFTRACE_SPREAD_SCREENSHOT");
	dftrace_pause_test_enabled = getenv("DFTRACE_PAUSE_TEST") != NULL;
	dftrace_engine_screenshot_prefix = getenv("DFTRACE_ENGINE_SCREENSHOT_PREFIX");
	{
		unsigned index;
		for (index = 0u; index < DFTRACE_PLAYER_PROJECTILE_SLOT_COUNT; ++index) {
			dftrace_player_pairshot_allocation_frame[index] = 0xffffffffu;
			dftrace_player_pairshot_release_frame[index] = 0xffffffffu;
		}
		for (index = 0u; index < DFTRACE_INTERCEPTOR_SLOT_COUNT; ++index) {
			unsigned slot = index + DFTRACE_INTERCEPTOR_SLOT_BASE;
			dftrace_interceptor_observed_active[index] =
				MEMORY_mem[dftrace_projectile_active + slot];
			dftrace_interceptor_watched_address[index] =
				MEMORY_mem[dftrace_projectile_screen_lo + slot] |
				((unsigned) MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
			dftrace_interceptor_watched_value[index] =
				MEMORY_mem[dftrace_interceptor_watched_address[index]];
		}
	}
	{
		const char *compositor_output = getenv("DFTRACE_BROAD_COMPOSITOR_OUTPUT");
		if (compositor_output != NULL && *compositor_output != '\0') {
			dftrace_broad_compositor_file = fopen(compositor_output, "w");
			if (dftrace_broad_compositor_file == NULL) {
				perror("voidstrike65 broadside compositor output");
				exit(2);
			}
		}
	}
	dftrace_initialised = 1;
}

/* Optional instruction-boundary fence audit. Host-only; no guest writes.
 * VBI counts physical scanline-248 boundaries, even with OS VBI disabled. */
static FILE *dffence_file;
static unsigned dffence_wait, dffence_loop, dffence_leave, dffence_return;
static unsigned dffence_host = 0xffffffffu, dffence_vbi = 0xffffffffu;
static unsigned dffence_state = 0xffffffffu, dffence_previous_pc;
static unsigned dffence_iterations, dffence_leave_iterations, dffence_selected;
static unsigned dffence_old_top, dffence_old_bottom;
static int dffence_waiting;
static int dffence_drawing;
static unsigned dffence_draw_depth;
static UBYTE dffence_pmg_before[0x500];

static void dffence_draw_end(unsigned pc)
{
	unsigned addresses[6] = {0}, i, address, inside = 0u, backing = 0u, pmg = 0u;
	unsigned base = MEMORY_mem[dftrace_entity_render_id + 1u], cells = 0u;
	dftrace_pickup_addresses(addresses);
	for (i = 0u; i < 6u; ++i) {
		if (!dftrace_pickup_screen_address_valid(addresses[i])) continue;
		++cells;
		if (MEMORY_mem[addresses[i]] == ((base + i) & 0xffu)) ++inside;
		if ((dftrace_pickup_backing(i) & 0x7fu) >= 120u &&
			(dftrace_pickup_backing(i) & 0x7fu) <= 125u) ++backing;
	}
	for (address = 0u; address < 0x500u; ++address)
		if (dffence_pmg_before[address] != MEMORY_mem[0x3b00u + address]) ++pmg;
	fprintf(dffence_file, "{\"event\":\"draw_audit\",\"host_frame\":%u,"
		"\"trace_index\":%u,\"pc\":%u,\"scanline\":%d,\"clock\":%llu,"
		"\"cells\":%u,\"matching_cells\":%u,\"orphan_glyphs\":%u,"
		"\"backing_contamination\":%u,\"additional_pmg_scanlines\":%u}\n",
		(unsigned) Atari800_nframes, dftrace_count, pc, ANTIC_ypos,
		(unsigned long long) dftrace_clock(), cells, inside,
		dftrace_pickup_glyph_cells() - inside, backing, pmg);
}

static void dffence_event(const char *event, unsigned pc)
{
	unsigned state = MEMORY_mem[dftrace_entity_state + 1u];
	unsigned y = MEMORY_mem[dftrace_entity_y + 1u];
	fprintf(dffence_file, "{\"event\":\"%s\",\"host_frame\":%u,\"clock\":%llu,"
		"\"vbi_counter\":%u,\"scanline\":%d,\"vcount\":%u,\"cycle\":%d,"
		"\"gameplay_counter\":%u,\"trace_index\":%u,\"pc\":%u,\"previous_pc\":%u,"
		"\"fence\":%u,\"source\":\"%s\",\"pickup_state\":%u,\"pickup_y\":%u,"
		"\"pending_timer\":%u,\"previous_top\":%u,\"previous_bottom\":%u,"
		"\"current_top\":%u,\"current_bottom\":%u,\"drawn\":%u,"
		"\"wait_iterations\":%u,\"leave_iterations\":%u}\n",
		event, (unsigned) Atari800_nframes, (unsigned long long) dftrace_clock(),
		dffence_vbi, ANTIC_ypos, (unsigned) ANTIC_GetByte(0xd40bu, TRUE), ANTIC_XPOS,
		MEMORY_mem[dftrace_gameplay_frame], dftrace_count, pc, dffence_previous_pc,
		dffence_selected, state == 0u ? "INACTIVE" : state == 1u ? "PENDING" : "ACTIVE",
		state, y, MEMORY_mem[dftrace_entity_timer + 1u], dffence_old_top,
		dffence_old_bottom, y, y + 16u, MEMORY_mem[dftrace_entity_drawn_mask + 1u],
		dffence_iterations, dffence_leave_iterations);
}

static void dffence_observe(unsigned pc, unsigned x_register)
{
	unsigned state, host, vbi;
	if (getenv("DFTRACE_FENCE_OUTPUT") == NULL) return;
	if (dffence_file == NULL) {
		dffence_file = fopen(getenv("DFTRACE_FENCE_OUTPUT"), "w");
		if (dffence_file == NULL) { perror("pickup fence trace"); exit(2); }
		dffence_wait = dftrace_env_u("DFTRACE_FENCE_WAIT");
		dffence_loop = dftrace_env_u("DFTRACE_FENCE_LOOP");
		dffence_leave = dffence_loop + 5u;
		dffence_return = dffence_loop + 10u;
	}
	if (MEMORY_mem[dftrace_game_state] != 6u) return;
	host = (unsigned) Atari800_nframes;
	vbi = host + (ANTIC_ypos >= 248 ? 1u : 0u);
	if (vbi != dffence_vbi) {
		dffence_vbi = vbi; dffence_event("vbi", pc);
		if (getenv("DFTRACE_FENCE_SCREENSHOTS") != NULL &&
			((MEMORY_mem[dftrace_entity_state + 1u] == 1u && MEMORY_mem[dftrace_entity_timer + 1u] <= 9u) ||
			 (MEMORY_mem[dftrace_entity_state + 1u] == 2u && MEMORY_mem[dftrace_entity_y + 1u] <= 44u))) {
			char screenshot[1024];
			snprintf(screenshot, sizeof(screenshot), "%s-host%u.png", getenv("DFTRACE_FENCE_OUTPUT"), host);
			if (!Screen_SaveScreenshot(screenshot, 0)) { perror("fence screenshot"); exit(2); }
		}
	}
	if (host != dffence_host) { dffence_host = host; dffence_event("host_frame", pc); }
	state = MEMORY_mem[dftrace_entity_state + 1u];
	if (state != dffence_state) { dffence_event("state_change", pc); dffence_state = state; }
	if (pc == dffence_wait) {
		dffence_iterations = dffence_leave_iterations = 0u;
		dffence_selected = 0xffffffffu;
		dffence_waiting = 1;
		dffence_event("wait_enter", pc);
	}
	if (dffence_waiting && pc == dffence_loop) {
		if (dffence_iterations == 0u) { dffence_selected = x_register; dffence_event("fence_selected", pc); }
		++dffence_iterations;
	}
	if (dffence_waiting && pc == dffence_leave) ++dffence_leave_iterations;
	if (dffence_waiting && pc == dffence_return) { dffence_event("wait_exit", pc); dffence_waiting = 0; }
	if (pc == dftrace_pc_active) dffence_event("main_update", pc);
	if (pc == dftrace_pc_end) dffence_event("main_end", pc);
	if (pc == dftrace_pc_dli) dffence_event("dli", pc);
	if (pc == dftrace_pc_entity_erase) dffence_event("erase", pc);
	if (pc == dftrace_pc_after_entity_erase) { dffence_event("erase_end", pc); dffence_old_top = dffence_old_bottom = 0u; }
	if (pc == dftrace_pc_entity_draw) {
		dffence_event("draw", pc);
		dffence_drawing = 1; dffence_draw_depth = 0u;
		memcpy(dffence_pmg_before, MEMORY_mem + 0x3b00u, sizeof(dffence_pmg_before));
		dffence_old_top = MEMORY_mem[dftrace_entity_y + 1u];
		dffence_old_bottom = dffence_old_top + 16u;
	}
	if (dffence_drawing) {
		if (MEMORY_mem[pc] == 0x20u) ++dffence_draw_depth;
		if (MEMORY_mem[pc] == 0x60u) {
			if (dffence_draw_depth != 0u) --dffence_draw_depth;
			else {
				dffence_event("draw_end", pc);
				if (MEMORY_mem[dftrace_entity_state + 1u] == 2u) dffence_draw_end(pc);
				dffence_drawing = 0;
			}
		}
	}
	dffence_previous_pc = pc;
}


static void DFTrace_Observe(unsigned pc, unsigned a_register, unsigned x_register,
	unsigned y_register, unsigned s_register)
{
	if (dftrace_light_output != NULL) {
		unsigned entry;
		for (entry = 0u; entry < DFTRACE_LIGHT_VECTORS; entry++) {
			if (pc == dftrace_light_vector[entry]) {
				dftrace_light_vector_hits[entry]++;
				break;
			}
		}
	}
	unsigned host_frame = (unsigned) Atari800_nframes;
	/* The hook runs immediately before PC.  A preceding STA $3B00,Y has
	 * therefore completed and Y is still the effective PMG row.  Retain the
	 * exact production writer for every missile byte without changing guest
	 * code or sampling only the final framebuffer. */
	if (dftrace_previous_pc != 0u && MEMORY_mem[dftrace_previous_pc] == 0x99u &&
		MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] == 0x00u) {
		unsigned page = MEMORY_mem[(dftrace_previous_pc + 2u) & 0xffffu];
		if (page == 0x3bu)
			dftrace_pmg_last_writer[y_register & 0xffu] = dftrace_previous_pc;
		else if (page == 0x3du || page == 0x3eu)
			dftrace_enemy_pmg_last_writer[page - 0x3du][y_register & 0xffu] =
				dftrace_previous_pc;
	}
	if (getenv("DFMENU_OUTPUT") != NULL) {
		dfmenu_observe(pc);
		return;
	}
	if (getenv("DFBOOT_OUTPUT") != NULL) {
		dfboot_observe(pc, a_register, x_register, y_register, s_register);
		return;
	}
	if (!dftrace_initialised)
		dftrace_init();
	dfprobe_observe();
	dfspread_observe();
	dfdebris_observe();
	dfgate_observe(pc);
	dftrace_track_character_screen_write(x_register, y_register);
	dftrace_first_writer_track(x_register, y_register);
	dftrace_player_pairshot_track(pc, x_register, y_register);
	dftrace_near_observe(pc, x_register);
	dftrace_watch_interceptor_projectiles();
	dffence_observe(pc, x_register);
	if (dftrace_published_dlist_lo == 0u && MEMORY_mem[dftrace_game_state] == 6u)
		dftrace_published_dlist_lo = MEMORY_mem[dftrace_active_dlist_lo];
	if (host_frame != dftrace_display_host_frame) {
		dftrace_display_host_frame = host_frame;
		dftrace_displayed_dlist_lo = dftrace_published_dlist_lo;
	}
	if (pc == dftrace_pc_dlist_publish && MEMORY_mem[dftrace_dli_phase] == 0u)
		dftrace_published_dlist_lo = MEMORY_mem[dftrace_active_dlist_lo];
	if (pc == dftrace_pc_gameplay_init) {
		++dftrace_gameplay_generation;
		if (dftrace_gameplay_generation == dftrace_engine_screenshot_generation)
			dftrace_engine_screenshot_count = 0u;
	}
	dftrace_drive_pause_test();

	if (MEMORY_mem[dftrace_game_state] != 6u) {
		dftrace_active = 0;
		dftrace_dli_integrity_enabled = 0;
		dftrace_dli_integrity_complete_frame_seen = 0;
		dftrace_dli_integrity_host_frame = 0xffffffffu;
		dftrace_dli_integrity_count = 0u;
	}

	/* BOOT_STAGE2 deliberately overlays the later resident suffix, so its
	 * transient PC can alias frontend_input_poll before start has restored the
	 * runtime image. Drive only published frontend states; OPTIONS must remain
	 * reachable so non-default difficulties use the production input path. */
	if (!dftrace_active && pc == dftrace_pc_frontend_poll &&
		(MEMORY_mem[dftrace_game_state] == 1u ||
		 MEMORY_mem[dftrace_game_state] == 2u ||
		 MEMORY_mem[dftrace_game_state] == 7u)) {
		dftrace_set_frontend_input();
	}

	if (dftrace_dli_integrity_enabled && pc == dftrace_pc_dli) {
		unsigned host_frame = (unsigned) Atari800_nframes;
		unsigned phase = MEMORY_mem[dftrace_dli_phase];
		if (host_frame != dftrace_dli_integrity_host_frame) {
			if (dftrace_dli_integrity_complete_frame_seen &&
				dftrace_dli_integrity_count != 2u)
				++dftrace_dli_sequence_violations;
			dftrace_dli_integrity_host_frame = host_frame;
			dftrace_dli_integrity_count = 0u;
			dftrace_dli_integrity_complete_frame_seen = 1;
		}
		if (dftrace_dli_integrity_count >= 2u ||
			phase != dftrace_dli_integrity_count)
			++dftrace_dli_sequence_violations;
		++dftrace_dli_integrity_count;
		if (dftrace_dli_integrity_count > dftrace_maximum_dlis_per_host_frame)
			dftrace_maximum_dlis_per_host_frame = dftrace_dli_integrity_count;
	}

	if (pc == dftrace_pc_active && !dftrace_active) {
		if (!dftrace_dli_integrity_enabled) {
			dftrace_dli_integrity_enabled = 1;
			dftrace_dli_integrity_host_frame = (unsigned) Atari800_nframes;
			dftrace_dli_integrity_count = MEMORY_mem[dftrace_dli_phase] != 0u ? 1u : 0u;
			dftrace_maximum_dlis_per_host_frame = dftrace_dli_integrity_count;
		}
		/* The previous end hook published the object before this completed ANTIC
		 * pass. Capture before the current guest frame can touch PMG state. */
		/* Prime several full frames: the first active hook still exposes the
		 * loader/playfield hand-off framebuffer, not a complete PMG lab raster. */
		if (dftrace_pmg_lab_variant() && dftrace_pmg_lab_presentations >= 5u &&
			dftrace_pmg_lab_screenshot != NULL && *dftrace_pmg_lab_screenshot != '\0' &&
			dftrace_pmg_lab_screenshot_frame == 0xffffffffu) {
			if (!Screen_SaveScreenshot(dftrace_pmg_lab_screenshot, 0)) {
				fprintf(stderr, "voidstrike65 trace: PMG-lab screenshot failed: %s\n",
					dftrace_pmg_lab_screenshot);
				exit(2);
			}
			dftrace_pmg_lab_screenshot_frame = dftrace_count;
		}
		if (dftrace_rapid_screenshot != NULL && *dftrace_rapid_screenshot != '\0' &&
			dftrace_rapid_screenshot_frame == 0xffffffffu &&
			MEMORY_mem[dftrace_entity_state + 2u] == 3u) {
			DFTraceFrame rapid;
			memset(&rapid, 0, sizeof(rapid));
			dftrace_snapshot_rapid_projectile(&rapid);
			if (rapid.rapid_projectiles >= 3u &&
				MEMORY_mem[dftrace_effect_active_count] == 0u &&
				(rapid.rapid_projectile_screen_code & 0x80u) == 0u &&
				rapid.rapid_projectile_screen_code >= 11u &&
				rapid.rapid_projectile_screen_code < 47u &&
				dftrace_is_ring_address(rapid.rapid_projectile_address)) {
				if (!Screen_SaveScreenshot(dftrace_rapid_screenshot, 0)) {
					fprintf(stderr, "voidstrike65 trace: Rapid Fire screenshot failed: %s\n",
						dftrace_rapid_screenshot);
					exit(2);
				}
				dftrace_rapid_screenshot_frame = dftrace_count;
			}
		}
		if (dftrace_spread_screenshot != NULL && *dftrace_spread_screenshot != '\0' &&
			dftrace_spread_screenshot_frame == 0xffffffffu &&
			MEMORY_mem[dftrace_entity_state + 2u] == 4u) {
			DFTraceFrame spread;
			memset(&spread, 0, sizeof(spread));
			dftrace_snapshot_rapid_projectile(&spread);
			if (spread.player_fighter_projectiles >= 3u &&
				MEMORY_mem[dftrace_effect_active_count] == 0u) {
				if (!Screen_SaveScreenshot(dftrace_spread_screenshot, 0)) {
					fprintf(stderr, "voidstrike65 trace: Spread Shot screenshot failed: %s\n",
						dftrace_spread_screenshot);
					exit(2);
				}
				dftrace_spread_screenshot_frame = dftrace_count;
			}
		}
		/* Capture only after a complete ANTIC pass of the resident backed render
		 * and before this frame mutates lower layers. Screen_SaveScreenshot exports
		 * the existing framebuffer; the end-of-loop hook can run before the
		 * pickup's scanline and is therefore not visual evidence. */
		if (MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			(MEMORY_mem[dftrace_entity_active_mask] & 2u) != 0u &&
			MEMORY_mem[dftrace_entity_screen_hi + 1u] != 0u &&
			GTIA_PRIOR == 0x10u) {
			/* One missile occupies two bits of each row byte (M0 = bits 0-1
			 * .. M3 = bits 6-7). The former `& 0xf0` test only inspected M2
			 * and M3, so it reported a solid capsule while M0/M1 were broken
			 * on fourteen of sixteen rows.
			 *
			 * The capsule now carries a per-type silhouette, so rows are not
			 * uniformly $FF. What the harness can still assert cheaply is that
			 * the mark occupies its full sixteen rows and that the shape uses
			 * the whole quartet somewhere. Row-by-row silhouette verification
			 * belongs to the framebuffer signature (fb_rows) and to
			 * tests/pickup-pmg-raster-visibility.test.mjs, which derives the
			 * expected shapes from the artwork source. */
			unsigned pickup_rows = 0u;
			unsigned pickup_union = 0u;
			unsigned row;
			for (row = 0u; row < 256u; ++row) {
				unsigned value = MEMORY_mem[0x3b00u + row];
				if (value != 0u) {
					++pickup_rows;
					pickup_union |= value;
				}
			}
			dftrace_pickup_missile_complete =
				pickup_rows == 16u && pickup_union == 0xffu;
			if (dftrace_pickup_missile_complete)
				++dftrace_pickup_visible_passes;
			else
				dftrace_pickup_visible_passes = 0u;
			if (dftrace_pickup_screenshot != NULL && *dftrace_pickup_screenshot != '\0' &&
				dftrace_pickup_screenshot_frame == 0xffffffffu &&
				dftrace_pickup_visible_passes == 5u &&
				!Screen_SaveScreenshot(dftrace_pickup_screenshot, 0)) {
				fprintf(stderr, "voidstrike65 trace: pickup screenshot failed: %s\n",
					dftrace_pickup_screenshot);
				exit(2);
			}
			if (dftrace_pickup_screenshot_frame == 0xffffffffu &&
				dftrace_pickup_visible_passes == 5u)
				dftrace_pickup_screenshot_frame = dftrace_count;
		}
		else {
			dftrace_pickup_visible_passes = 0u;
			dftrace_pickup_missile_complete = 0;
		}
		/* The first active hook still exposes the preceding framebuffer. Prime
		 * once, then capture 16 uninterrupted completed rasters regardless of
		 * unrelated effect activity elsewhere on screen.
		 *
		 * Owner decision 2026-09-21, option (b): the drawn conjunct follows the
		 * capsule to the missile plane. `f6eee5c` moved it off the character
		 * renderer, so slot 1's character drawn-mask (ENTITY_DRAWN_MASK + 1) has
		 * been dead memory - 0 on all 4,000 frames of the pickup replay - and
		 * `(mask & 15) == 15` was unsatisfiable by construction. The gate now
		 * uses the same live measurement as the static-capsule gate above. */
		if (dftrace_pickup_sequence_prefix != NULL &&
			*dftrace_pickup_sequence_prefix != '\0' &&
			MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			(MEMORY_mem[dftrace_entity_active_mask] & 2u) != 0u &&
			dftrace_pickup_missile_complete &&
			MEMORY_mem[dftrace_effect_active_count] == 0u &&
			dftrace_pickup_sequence_count < 16u) {
			if (dftrace_pickup_sequence_primed >= 2u) {
				char path[1024];
				snprintf(path, sizeof(path), "%s-%02u.png",
					dftrace_pickup_sequence_prefix, dftrace_pickup_sequence_count);
				if (!Screen_SaveScreenshot(path, 0)) {
					fprintf(stderr, "voidstrike65 trace: pickup sequence screenshot failed: %s\n",
						path);
					exit(2);
				}
				++dftrace_pickup_sequence_count;
			}
			else
				++dftrace_pickup_sequence_primed;
		}
		else if (dftrace_pickup_sequence_prefix != NULL &&
			*dftrace_pickup_sequence_prefix != '\0' &&
			dftrace_pickup_sequence_count < 16u) {
			dftrace_pickup_sequence_count = 0u;
			dftrace_pickup_sequence_primed = 0u;
		}
		/* Traversal evidence follows the production slot even when an unrelated
		 * explosion effect overlaps the same frame. Glyph-cell accounting still
		 * proves that only one capsule footprint is resident. */
		/* Owner decision 2026-09-21: option (b) extended to the traversal gate.
		 * The same dead ENTITY_DRAWN_MASK + 1 conjunct, repointed at the missile
		 * plane exactly as the sequence gate above. */
		if (dftrace_pickup_traversal_prefix != NULL &&
			*dftrace_pickup_traversal_prefix != '\0' &&
			MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			(MEMORY_mem[dftrace_entity_active_mask] & 2u) != 0u &&
			dftrace_pickup_missile_complete &&
			dftrace_pickup_traversal_count < DFTRACE_RING_ROWS &&
			((MEMORY_mem[dftrace_entity_y + 1u] - DFTRACE_GAMEPLAY_TOP) & 7u) == 0u &&
			MEMORY_mem[dftrace_entity_y + 1u] != dftrace_pickup_traversal_last_y) {
			char path[1024];
			snprintf(path, sizeof(path), "%s-%02u.png",
				dftrace_pickup_traversal_prefix, dftrace_pickup_traversal_count);
			if (!Screen_SaveScreenshot(path, 0)) {
				fprintf(stderr, "voidstrike65 trace: pickup traversal screenshot failed: %s\n",
					path);
				exit(2);
			}
			dftrace_pickup_traversal_last_y = MEMORY_mem[dftrace_entity_y + 1u];
			++dftrace_pickup_traversal_count;
		}
		if (dftrace_pickup_contact_prefix != NULL &&
			*dftrace_pickup_contact_prefix != '\0' &&
			dftrace_pickup_contact_count < 24u) {
			unsigned pickup_state = MEMORY_mem[dftrace_entity_state + 1u];
			unsigned player_y = MEMORY_mem[dftrace_player_y];
			unsigned pickup_y = MEMORY_mem[dftrace_entity_y + 1u];
			unsigned player_x = MEMORY_mem[dftrace_player_x];
			unsigned pickup_x = MEMORY_mem[dftrace_entity_x + 1u];
			int near_contact = pickup_state == 2u && player_y >= pickup_y &&
				player_y - pickup_y <= 40u &&
				player_x + 12u >= pickup_x && pickup_x + 12u >= player_x;
			if (near_contact || (dftrace_pickup_contact_count != 0u &&
				dftrace_pickup_contact_after_collect < 3u)) {
				char path[1024];
				snprintf(path, sizeof(path), "%s-%02u.png",
					dftrace_pickup_contact_prefix, dftrace_pickup_contact_count);
				if (!Screen_SaveScreenshot(path, 0)) {
					fprintf(stderr, "voidstrike65 trace: pickup contact screenshot failed: %s\n",
						path);
					exit(2);
				}
				++dftrace_pickup_contact_count;
				if (pickup_state != 2u)
					++dftrace_pickup_contact_after_collect;
			}
		}
		if (dftrace_muzzle_screenshot_prefix != NULL &&
			*dftrace_muzzle_screenshot_prefix != '\0' &&
			dftrace_muzzle_screenshot_count < 64u) {
			if (!dftrace_muzzle_screenshot_primed &&
				(MEMORY_mem[dftrace_muzzle_screen_hi] != 0u ||
				 MEMORY_mem[dftrace_muzzle_screen_hi + 1u] != 0u))
				dftrace_muzzle_screenshot_primed = 1;
			if (dftrace_muzzle_screenshot_primed) {
				char path[1024];
				snprintf(path, sizeof(path), "%s-%02u.png",
					dftrace_muzzle_screenshot_prefix, dftrace_muzzle_screenshot_count);
				if (!Screen_SaveScreenshot(path, 0)) {
					fprintf(stderr, "voidstrike65 trace: muzzle screenshot failed: %s\n", path);
					exit(2);
				}
				++dftrace_muzzle_screenshot_count;
			}
		}
		if (dftrace_capital_contact_prefix != NULL &&
			*dftrace_capital_contact_prefix != '\0' &&
			dftrace_capital_contact_count < 32u &&
			dftrace_capital_contact_primed) {
				char path[1024];
				snprintf(path, sizeof(path), "%s-%02u.png",
					dftrace_capital_contact_prefix, dftrace_capital_contact_count);
				if (!Screen_SaveScreenshot(path, 0)) {
					fprintf(stderr, "voidstrike65 trace: capital contact screenshot failed: %s\n",
						path);
					exit(2);
				}
				++dftrace_capital_contact_count;
		}
		if (dftrace_count != 0 &&
			dftrace_frames[dftrace_count - 1].next_start_clock == 0u) {
			DFTraceFrame *previous = &dftrace_frames[dftrace_count - 1];
			previous->next_start_clock = dftrace_clock();
			previous->next_start_host_frame = (unsigned) Atari800_nframes;
		}
		if (dftrace_interceptor_first_anomaly || dftrace_count == dftrace_limit ||
			(dftrace_active_limit != 0u &&
            dftrace_count != 0u && dftrace_frames[dftrace_count - 1].active_gameplay_frame >=
                dftrace_active_limit)) {
			dftrace_write();
			fflush(NULL);
			exit(0);
		}
		if (MEMORY_mem[dftrace_difficulty_setting] != dftrace_difficulty) {
			fprintf(stderr, "voidstrike65 trace: production frontend selected difficulty %u, expected %u\n",
				MEMORY_mem[dftrace_difficulty_setting], dftrace_difficulty);
			exit(2);
		}
		memset(&dftrace_current, 0, sizeof(dftrace_current));
		dftrace_display_list_previous_valid = 0;
		dftrace_recycled_previous_valid = 0;
		dftrace_active = 1;
		dftrace_set_gameplay_input(dftrace_count);
		dftrace_player_pairshot_frame_begin();
		dftrace_prepare_broadside_proof();
		dftrace_current.start_clock = dftrace_clock();
		dftrace_current.start_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.start_y = ANTIC_ypos;
		dftrace_current.start_x = ANTIC_XPOS;
		/* Publish without touching entity state: otherwise the production erase
		 * path quite correctly clears a fake slot before the scanline arrives. */
		dftrace_publish_pmg_lab();
		dftrace_snapshot(&dftrace_current);
		dftrace_snapshot_engine(&dftrace_current);
		dftrace_current.gameplay_generation = dftrace_gameplay_generation;
		if (dftrace_engine_screenshot_prefix != NULL &&
			*dftrace_engine_screenshot_prefix != '\0' &&
			dftrace_gameplay_generation == dftrace_engine_screenshot_generation &&
			dftrace_engine_screenshot_count < dftrace_engine_screenshot_limit) {
			char path[1024];
			snprintf(path, sizeof(path), "%s-%03u.png",
				dftrace_engine_screenshot_prefix, dftrace_engine_screenshot_count);
			if (!Screen_SaveScreenshot(path, 0)) {
				fprintf(stderr, "voidstrike65 trace: engine screenshot failed: %s\n", path);
				exit(2);
			}
			++dftrace_engine_screenshot_count;
		}
		dftrace_pickup_frame_begin(&dftrace_current);
		return;
	}

	if (!dftrace_active)
		goto observe_done;
	if (pc == dftrace_pc_rotate_start)
		dftrace_pairshot_rotate_begin();
	else if (pc == dftrace_pc_rotate_end)
		dftrace_pairshot_rotate_end(&dftrace_current);
	dftrace_watch_engine_write(&dftrace_current);
	dftrace_watch_display_list_write(&dftrace_current);
	dftrace_watch_recycled_write(&dftrace_current);
	dftrace_pickup_watch(&dftrace_current, pc);
	if (pc == dftrace_pc_player_erase) {
		++dftrace_current.player_erase_calls;
		dftrace_current.player_erase_scanline = ANTIC_ypos;
	}
	if (pc == dftrace_pc_player_draw) {
		++dftrace_current.player_draw_calls;
		dftrace_current.player_draw_scanline = ANTIC_ypos;
	}
	if (pc == dftrace_pc_capital_collision)
		++dftrace_current.capital_collision_calls;
	if (pc == dftrace_pc_capital_player_damage)
		++dftrace_current.capital_player_damage_calls;
	if (pc == dftrace_pc_capital_player_aabb_hit) {
		dftrace_capture_capital_contact_decision(pc,
			MEMORY_mem[dftrace_broad_state + 34u]);
		dftrace_broad_compositor_event("player_aabb_hit",
			MEMORY_mem[dftrace_broad_state + 34u]);
	}
	else if (pc == dftrace_pc_capital_player_aabb_miss) {
		dftrace_capture_capital_contact_decision(pc,
			MEMORY_mem[dftrace_broad_state + 34u]);
		dftrace_broad_compositor_event("player_aabb_miss",
			MEMORY_mem[dftrace_broad_state + 34u]);
	}
	if (pc == dftrace_pc_broad_erase_begin) {
		dftrace_remember_capital_physical(x_register);
		dftrace_broad_compositor_event("erase_begin", x_register);
	}
	else if (pc == dftrace_pc_broad_erase_restored)
		dftrace_broad_compositor_event("erase_cells_restored", x_register);
	else if (pc == dftrace_pc_broad_erase_end)
		dftrace_broad_compositor_event("erase_end", MEMORY_mem[dftrace_broad_state + 34u]);
	else if (pc == dftrace_pc_broad_draw_begin)
		dftrace_broad_compositor_event("draw_begin", x_register);
	else if (pc == dftrace_pc_broad_backing_captured)
		dftrace_broad_compositor_event("backing_captured", x_register);
	else if (pc == dftrace_pc_broad_draw_end)
		dftrace_broad_compositor_event("draw_end", x_register);
	else if (pc == dftrace_pc_broad_impact)
		dftrace_broad_compositor_event("impact_begin", x_register);
	if (pc == dftrace_pc_rotate_start) {
		dftrace_current.broad_pre_rotate_screen_transients =
			dftrace_broad_screen_transient_cells();
		dftrace_broad_compositor_event("before_rotate", 0xffffffffu);
	}
	if (pc == dftrace_pc_player_shot_sound) {
		++dftrace_current.fire_accept_calls;
		dftrace_current.fire_accept_clock = dftrace_clock();
		dftrace_current.fire_accept_scanline = ANTIC_ypos;
		dftrace_current.fire_accept_cycle = ANTIC_XPOS;
	}
	if (pc == dftrace_pc_update_sound) {
		++dftrace_current.update_sound_calls;
		dftrace_current.update_sound_clock = dftrace_clock();
		dftrace_current.update_sound_scanline = ANTIC_ypos;
		dftrace_current.update_sound_cycle = ANTIC_XPOS;
	}

	if (dftrace_current.profile_next < DFTRACE_PROFILE_COUNT &&
		pc == dftrace_pc_profile[dftrace_current.profile_next]) {
		dftrace_current.profile_clock[dftrace_current.profile_next] = dftrace_clock();
		/* Profile 17 ends broadside rendering immediately before the final
		 * entity/effect pass. Discard the earlier resident-capsule call so the
		 * nested render markers describe only that final layer pass. */
		if (dftrace_current.profile_next == 17u) {
			dftrace_current.profile_pickup_render_start = 0u;
			dftrace_current.profile_effect_render_start = 0u;
		}
		++dftrace_current.profile_next;
	}
	if (pc == dftrace_pc_compose_start) {
		dftrace_compose_start_clock = dftrace_clock();
		++dftrace_current.profile_compose_calls;
	}
	else if (pc == dftrace_pc_compose_end) {
		dftrace_current.profile_compose_cycles +=
			(unsigned) (dftrace_clock() + 6u - dftrace_compose_start_clock);
	}
	if (pc == dftrace_pc_pointer_start) {
		dftrace_pointer_start_clock = dftrace_clock();
		++dftrace_current.profile_pointer_calls;
	}
	else if (pc == dftrace_pc_pointer_end) {
		dftrace_current.profile_pointer_cycles +=
			(unsigned) (dftrace_clock() + 6u - dftrace_pointer_start_clock);
	}
	if (pc == dftrace_pc_publication_begin)
		dftrace_current.profile_publication_begin = dftrace_clock();
	if (pc == dftrace_pc_erase_slot && x_register == 4u &&
		dftrace_current.profile_erase_player_fighter_start == 0u)
		dftrace_current.profile_erase_player_fighter_start = dftrace_clock();
	if (pc == dftrace_pc_interceptor_update_start)
		dftrace_current.profile_interceptor_update_start = dftrace_clock();
	if (pc == dftrace_pc_render_slot && x_register == DFTRACE_INTERCEPTOR_SLOT_BASE &&
		dftrace_current.profile_interceptor_render_start == 0u)
		dftrace_current.profile_interceptor_render_start = dftrace_clock();
	if (pc == dftrace_pc_entity_erase_start)
		dftrace_current.profile_entity_erase_start = dftrace_clock();
	if (pc == dftrace_pc_effect_update_end)
		dftrace_current.profile_effect_update_end = dftrace_clock();
	if (pc == dftrace_pc_pickup_update_end)
		dftrace_current.profile_pickup_update_end = dftrace_clock();
	if (pc == dftrace_pc_entity_draw &&
		dftrace_current.profile_pickup_render_start == 0u)
		dftrace_current.profile_pickup_render_start = dftrace_clock();
	if (pc == dftrace_pc_effect_render &&
		dftrace_current.profile_effect_render_start == 0u)
		dftrace_current.profile_effect_render_start = dftrace_clock();
	if (pc == dftrace_pc_dli) {
		++dftrace_current.dli_nmis;
		if (dftrace_current.profile_dli_count < DFTRACE_PROFILE_DLI_COUNT) {
			unsigned dli_index = dftrace_current.profile_dli_count;
			dftrace_current.profile_dli_start[dli_index] = dftrace_clock();
			dftrace_current.profile_dli_segment[dli_index] =
				dftrace_current.profile_next;
		}
	}
	else if ((pc == dftrace_pc_dli_end || pc == dftrace_pc_dli_hud_end) &&
		dftrace_current.profile_dli_count < DFTRACE_PROFILE_DLI_COUNT) {
		unsigned dli_index = dftrace_current.profile_dli_count;
		/* The hook runs before RTI. Include its fixed six NMOS 6502 cycles. */
		dftrace_current.profile_dli_end[dli_index] = dftrace_clock() + 6u;
		++dftrace_current.profile_dli_count;
	}
	if (dftrace_previous_pc != 0u && MEMORY_mem[dftrace_previous_pc] == 0x8du &&
		MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] == 0x02u &&
		MEMORY_mem[(dftrace_previous_pc + 2u) & 0xffffu] == 0xd4u &&
		MEMORY_mem[dftrace_dli_phase] == 0u) {
		++dftrace_current.engine_playfield_select_calls;
		if (dftrace_current.engine_playfield_select_calls == 1u) {
			dftrace_current.engine_playfield_select_scanline = ANTIC_ypos;
			dftrace_current.engine_playfield_select_cycle = ANTIC_XPOS;
			dftrace_current.engine_playfield_select_dlist = ANTIC_dlist;
			dftrace_current.engine_playfield_select_active_lo =
				MEMORY_mem[dftrace_active_dlist_lo];
		}
	}
	if (pc == dftrace_pc_entity_erase) {
		++dftrace_current.pickup_erase_calls;
		if (dftrace_current.pickup_erase_calls == 1u) {
			dftrace_current.pickup_erase_scanline = ANTIC_ypos;
			dftrace_current.pickup_erase_cycle = ANTIC_XPOS;
		}
	}
	else if (pc == dftrace_pc_after_entity_erase)
		dftrace_pickup_after_erase(&dftrace_current);
	else if (pc == dftrace_pc_entity_draw) {
		++dftrace_current.pickup_draw_calls;
		if (dftrace_current.pickup_draw_calls == 1u) {
			dftrace_current.pickup_draw_scanline = ANTIC_ypos;
			dftrace_current.pickup_draw_cycle = ANTIC_XPOS;
		}
	}
	if (pc == dftrace_pc_engine_copy) {
		++dftrace_current.engine_copy_calls;
		if (dftrace_current.engine_copy_calls == 1u) {
			dftrace_current.engine_copy_scanline = ANTIC_ypos;
			dftrace_current.engine_copy_cycle = ANTIC_XPOS;
		}
	}
	if (pc == dftrace_pc_world)
		dftrace_current.events |= DFTRACE_EVENT_WORLD;
	else if (pc == dftrace_pc_near)
		dftrace_current.events |= DFTRACE_EVENT_NEAR_STEP;
	else if (pc == dftrace_pc_far_erase)
		dftrace_current.events |= DFTRACE_EVENT_FAR_ERASE;
	else if (pc == dftrace_pc_far_step)
		dftrace_current.events |= DFTRACE_EVENT_FAR_STEP;
	else if (pc == dftrace_pc_hull)
		dftrace_current.events |= DFTRACE_EVENT_HULL;
	else if (pc == dftrace_pc_broadside)
		dftrace_current.events |= DFTRACE_EVENT_BROADSIDE;
	else if (pc == dftrace_pc_fighter_explosion)
		dftrace_current.events |= DFTRACE_EVENT_FIGHTER_EXPLOSION;
	else if (pc == dftrace_pc_capital_explosion)
		dftrace_current.events |= DFTRACE_EVENT_CAPITAL_EXPLOSION;
	else if (pc == dftrace_pc_music_tick)
		dftrace_current.events |= DFTRACE_EVENT_MUSIC_TICK;
	else if (pc == dftrace_pc_entity_spawn)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_SPAWN;
	else if (pc == dftrace_pc_entity_contact)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_CONTACT;
	else if (pc == dftrace_pc_entity_despawn)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_DESPAWN;
	else if (pc == dftrace_pc_entity_shot)
		dftrace_current.events |= DFTRACE_EVENT_ENTITY_SHOT;
	else if (pc == dftrace_pc_effect_spawn)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_SPAWN;
	else if (pc == dftrace_pc_effect_erase)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_ERASE;
	else if (pc == dftrace_pc_effect_update)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_UPDATE;
	else if (pc == dftrace_pc_effect_render)
		dftrace_current.events |= DFTRACE_EVENT_EFFECT_RENDER;
	else if (pc == dftrace_pc_interceptor_breakup_request) {
		unsigned slot = MEMORY_mem[dftrace_enemy_target_slot];
		if (slot == 0u)
			++dftrace_current.interceptor_breakup_request_slot0;
		else if (slot == 1u)
			++dftrace_current.interceptor_breakup_request_slot1;
	}
	else if (pc == dftrace_pc_interceptor_breakup_spawn) {
		dftrace_current.events |= DFTRACE_EVENT_INTERCEPTOR_BREAKUP_SPAWN;
		++dftrace_current.raider_transient_allocations;
		dftrace_raider_effect_generation_active = 1u;
		dftrace_raider_slot0_seen = 0u;
	}
	else if (pc == dftrace_pc_emitter_cleanup) {
		dftrace_first_writer_kill();
		dftrace_emitter_cleanup_begin(&dftrace_current);
	}
	else if (pc == dftrace_pc_emitter_cleanup_end)
		dftrace_emitter_cleanup_end(&dftrace_current);
	else if (pc == dftrace_pc_pickup_qualified_kill)
		dftrace_current.events |= DFTRACE_EVENT_PICKUP_QUALIFIED_KILL;
	else if (pc == dftrace_pc_pickup_collect)
		dftrace_current.events |= DFTRACE_EVENT_PICKUP_COLLECT;
	else if (pc == dftrace_pc_director_world)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_WORLD;
	else if (pc == dftrace_pc_director_request) {
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_REQUEST;
		if (x_register == 3u) {
			unsigned slot;
			++dftrace_current.pickup_admission_requests;
			dftrace_current.pickup_attempt_sector = MEMORY_mem[dftrace_sector_state];
			dftrace_current.pickup_attempt_active_mask =
				MEMORY_mem[dftrace_entity_active_mask];
			dftrace_current.pickup_attempt_active_count =
				MEMORY_mem[dftrace_entity_active_count];
			dftrace_current.pickup_attempt_x = MEMORY_mem[dftrace_entity_x + 1u];
			dftrace_current.pickup_attempt_y = MEMORY_mem[dftrace_entity_y + 1u];
			dftrace_current.pickup_attempt_timer = MEMORY_mem[dftrace_entity_timer + 1u];
			for (slot = 0u; slot < 4u; ++slot) {
				dftrace_current.pickup_attempt_type[slot] =
					MEMORY_mem[dftrace_entity_type + slot];
				dftrace_current.pickup_attempt_state[slot] =
					MEMORY_mem[dftrace_entity_state + slot];
			}
			dftrace_current.pickup_attempt_director_phase =
				MEMORY_mem[dftrace_director_state];
			dftrace_current.pickup_attempt_director_intensity =
				MEMORY_mem[dftrace_director_state + 2u];
			dftrace_current.pickup_attempt_director_reaction =
				MEMORY_mem[dftrace_director_state + 3u];
			dftrace_current.pickup_attempt_director_recovery =
				MEMORY_mem[dftrace_director_state + 4u];
			dftrace_current.pickup_attempt_director_rng =
				MEMORY_mem[dftrace_director_state + 5u];
			dftrace_current.pickup_attempt_director_flags =
				MEMORY_mem[dftrace_director_state + 8u];
			dftrace_current.pickup_attempt_admission_frame =
				MEMORY_mem[dftrace_director_state + 9u];
			dftrace_current.pickup_attempt_gameplay_frame =
				MEMORY_mem[dftrace_gameplay_frame];
			dftrace_current.pickup_attempt_player_lifecycle =
				MEMORY_mem[dftrace_player_lifecycle];
		}
	}
	else if (pc == dftrace_pc_director_event)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_EVENT;

	if (dftrace_raider_effect_generation_active && !dftrace_raider_slot0_seen &&
		(MEMORY_mem[dftrace_effect_active_mask] & 1u) != 0u) {
		++dftrace_current.raider_slot0_activations;
		dftrace_raider_slot0_seen = 1u;
	}
	if (dftrace_raider_effect_generation_active && dftrace_raider_slot0_seen &&
		MEMORY_mem[dftrace_effect_active_mask] == 0u) {
		dftrace_raider_effect_generation_active = 0u;
		dftrace_raider_slot0_seen = 0u;
	}

	if (pc == dftrace_pc_end) {
		dftrace_current.fire_timer_value = MEMORY_mem[dftrace_fire_timer];
		dftrace_current.player_burst_state = MEMORY_mem[dftrace_player_burst_state];
		dftrace_current.player_burst_remaining = MEMORY_mem[dftrace_player_burst_state + 1u];
		dftrace_current.player_burst_timer = MEMORY_mem[dftrace_player_burst_state + 2u];
		dftrace_current.audf1 = POKEY_AUDF[POKEY_CHAN1];
		dftrace_current.audc1 = POKEY_AUDC[POKEY_CHAN1];
		dftrace_broad_compositor_event("frame_end", 0xffffffffu);
		dftrace_snapshot_flash(&dftrace_current);
		dftrace_snapshot_engine(&dftrace_current);
		dftrace_snapshot_muzzles(&dftrace_current);
		dftrace_first_writer_frame_end();
		dftrace_pickup_frame_end(&dftrace_current);
		dftrace_write_interceptor_projectiles(&dftrace_current);
		dftrace_write_sector_clock(&dftrace_current);
		dftrace_write_light(&dftrace_current);
		dftrace_write_player_pairshots(&dftrace_current);
		dftrace_current.end_clock = dftrace_clock();
		dftrace_current.end_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.end_y = ANTIC_ypos;
		dftrace_current.end_x = ANTIC_XPOS;
		dftrace_frames[dftrace_count++] = dftrace_current;
		dftrace_active = 0;
	}
observe_done:
	dftrace_previous_pc = pc;
}

#endif
