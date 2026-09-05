#ifndef VOIDSTRIKE65_TRACE_H
#define VOIDSTRIKE65_TRACE_H

#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "gtia.h"
#include "input.h"
#include "pia.h"
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
#define DFTRACE_ENEMY_MUZZLE_CODE 0xd0u
#define DFTRACE_ALLIED_FLASH_CODE 0x51u
#define DFTRACE_ENEMY_FLASH_CODE 0xd2u
#define DFTRACE_DIVIDER_SCREEN 0x4028u
#define DFTRACE_CHARSET 0x4400u
#define DFTRACE_PROFILE_COUNT 22u
#define DFTRACE_PROFILE_DLI_COUNT 2u
#define DFTRACE_CAPTURE_DMA_Y_OFFSET 8u

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
	unsigned difficulty;
	unsigned active_muzzles;
	unsigned muzzle_domain[2];
	unsigned muzzle_row[2];
	unsigned muzzle_pointer[2];
	unsigned muzzle_cell[2];
	unsigned muzzle_code_cells;
	unsigned muzzle_illegal_cells;
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
	unsigned rapid_projectiles;
	unsigned player_fighter_projectiles;
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
static unsigned dftrace_fire_delay;
static unsigned dftrace_difficulty;
static const char *dftrace_policy;
static const char *dftrace_session;
static const char *dftrace_output;
static DFTraceFrame *dftrace_frames;
static DFTraceFrame dftrace_current;

static unsigned dftrace_pc_active;
static unsigned dftrace_pc_end;
static unsigned dftrace_pc_profile[DFTRACE_PROFILE_COUNT];
static unsigned dftrace_pc_dli_end;
static unsigned dftrace_pc_dli_hud_end;
static unsigned dftrace_pc_compose_start;
static unsigned dftrace_pc_compose_end;
static unsigned dftrace_pc_pointer_start;
static unsigned dftrace_pc_pointer_end;
static unsigned dftrace_pc_erase_slot;
static unsigned dftrace_pc_interceptor_update_start;
static unsigned dftrace_pc_render_slot;
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
static unsigned dftrace_pc_interceptor_breakup_spawn;
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
static unsigned dftrace_dli_phase;

static unsigned dftrace_player_x;
static unsigned dftrace_player_y;
static unsigned dftrace_projectile_active;
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
static unsigned dftrace_capital_drain_rows;
static int dftrace_broadside_proof_admitted;
static int dftrace_broadside_proof_sector_started;
static unsigned dftrace_far_active;
static unsigned dftrace_enemy_active;
static unsigned dftrace_enemy_x;
static unsigned dftrace_fighter_explosion_timer;
static unsigned dftrace_capital_explosion_timer;
static unsigned dftrace_music_active;
static unsigned dftrace_fire_timer;
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
static unsigned dftrace_engine_timer;
static unsigned dftrace_engine_phase;
static unsigned dftrace_corridor_phase;
static unsigned dftrace_ring_flags;
static unsigned dftrace_active_dlist_lo;
static unsigned dftrace_next_dlist_lo;
static const char *dftrace_engine_screenshot_prefix;
static unsigned dftrace_engine_screenshot_count;
static unsigned dftrace_engine_screenshot_generation;
static unsigned dftrace_engine_screenshot_limit;
static unsigned dftrace_gameplay_generation;
static int dftrace_restart_game_over_seeded;
static unsigned dftrace_previous_pc;
static unsigned dftrace_pmg_last_writer[256];
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
static const char *dftrace_pickup_sequence_prefix;
static unsigned dftrace_pickup_sequence_count;
static unsigned dftrace_pickup_sequence_primed;
static const char *dftrace_pickup_traversal_prefix;
static unsigned dftrace_pickup_traversal_count;
static unsigned dftrace_pickup_traversal_last_y = 0xffffffffu;
static unsigned dftrace_pickup_hunt_active_frames;
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
	unsigned runad;
	unsigned initad;
	unsigned dosvec;
	unsigned screen_checksum;
	unsigned frontend_dlist_checksum;
	unsigned loader_dli_count;
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
static unsigned dfboot_snapshots_count;
static unsigned dfboot_loader_dli_count;
static uint64_t dfboot_same_frame_instructions;
static unsigned dfboot_instruction_frame = 0xffffffffu;
static DFBootSnapshot dfboot_snapshots[5];

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
	return frame == 1u || frame == 250u || frame == 300u ||
		frame == 500u || frame == 750u;
}

static void dfboot_capture(unsigned frame, unsigned pc)
{
	DFBootSnapshot *snapshot;
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
	snapshot->runad = dfboot_word(0x02e0u);
	snapshot->initad = dfboot_word(0x02e2u);
	snapshot->dosvec = dfboot_word(0x000au);
	snapshot->screen_checksum = dfboot_checksum(0x4000u, 0x0400u);
	snapshot->frontend_dlist_checksum = dfboot_checksum(dfboot_main_menu_dlist,
		dfboot_frontend_dlist_end - dfboot_main_menu_dlist);
	snapshot->loader_dli_count = dfboot_loader_dli_count;
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
			"\"nmi_en\":%u,\"vdslst\":%u,\"runad\":%u,\"initad\":%u,"
			"\"dosvec\":%u,\"screen_checksum\":%u,"
			"\"frontend_dlist_checksum\":%u,\"loader_dli_count\":%u}%s\n",
			snapshot->frame, snapshot->pc, snapshot->scanline, snapshot->cycle,
			snapshot->loader_timer, snapshot->game_state, snapshot->dlist,
			snapshot->charset_address, snapshot->pm_base, snapshot->dma_ctl,
			snapshot->nmi_en, snapshot->vdslst, snapshot->runad, snapshot->initad,
			snapshot->dosvec, snapshot->screen_checksum,
			snapshot->frontend_dlist_checksum, snapshot->loader_dli_count,
			index + 1u == dfboot_snapshots_count ? "" : ",");
	}
	fprintf(dfboot_file,
		"  ],\n  \"milestones\": {\"start\":%u,\"loader\":%u,\"menu\":%u,"
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
	dfboot_game_state = dfboot_env_u("DFBOOT_GAME_STATE");
	dfboot_main_menu_dlist = dfboot_env_u("DFBOOT_MAIN_MENU_DLIST");
	dfboot_frontend_dlist_end = dfboot_env_u("DFBOOT_FRONTEND_DLIST_END");
	dfboot_initialised = 1;
}

static void dfboot_observe(unsigned pc)
{
	unsigned frame;
	unsigned fire_start;
	if (!dfboot_initialised)
		dfboot_init();
	frame = (unsigned) Atari800_nframes;
	if (frame > 500u && MEMORY_mem[pc] == 0x00u) {
		fprintf(stderr, "voidstrike65 boot smoke: unexpected BRK frame=%u pc=$%04x "
			"state=%u module=%02x,%02x,%02x,%02x\n", frame, pc,
			MEMORY_mem[dfboot_game_state], MEMORY_mem[0x8e61u], MEMORY_mem[0x8e62u],
			MEMORY_mem[0x8e63u], MEMORY_mem[0x8e64u]);
		exit(98);
	}
	if (frame != dfboot_instruction_frame) {
		dfboot_instruction_frame = frame;
		dfboot_same_frame_instructions = 0u;
	}
	else if (++dfboot_same_frame_instructions == 20000000u) {
		fprintf(stderr, "voidstrike65 boot smoke: stalled at frame %u pc=$%04x state=%u "
			"module=%02x,%02x,%02x,%02x\n", frame, pc,
			MEMORY_mem[dfboot_game_state], MEMORY_mem[0x8e61u], MEMORY_mem[0x8e62u],
			MEMORY_mem[0x8e63u], MEMORY_mem[0x8e64u]);
		exit(2);
	}
	if (MEMORY_mem[dfboot_game_state] == 0u && pc == dfboot_word(0x0200u))
		++dfboot_loader_dli_count;
	if (pc == dfboot_pc_start && dfboot_seen_start == 0xffffffffu)
		dfboot_seen_start = frame;
	if (pc == dfboot_pc_loader && dfboot_seen_loader == 0xffffffffu)
		dfboot_seen_loader = frame;
	if (pc == dfboot_pc_menu && dfboot_seen_menu == 0xffffffffu &&
		dfboot_seen_loader != 0xffffffffu && MEMORY_mem[dfboot_loader_timer] == 0u)
		dfboot_seen_menu = frame;
	if (pc == dfboot_pc_frontend && dfboot_seen_frontend == 0xffffffffu &&
		MEMORY_mem[dfboot_game_state] == 1u)
		dfboot_seen_frontend = frame;
	if (pc == dfboot_pc_gameplay && dfboot_seen_gameplay == 0xffffffffu)
		dfboot_seen_gameplay = frame;
	if (pc == dfboot_pc_main && dfboot_seen_main == 0xffffffffu)
		dfboot_seen_main = frame;

	/* Drive the production menu input path: neutral through the loader/menu,
	 * then a short FIRE press after the frame-500 proof snapshot. */
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | 0x0fu;
	fire_start = dfboot_seen_frontend == 0xffffffffu ? 0xffffffffu :
		(dfboot_seen_frontend + 2u < 501u ? 501u : dfboot_seen_frontend + 2u);
	GTIA_TRIG[0] = (UBYTE) (frame >= fire_start && frame <= fire_start + 5u ? 0 : 1);
	if (frame != dfboot_last_frame) {
		dfboot_last_frame = frame;
		if (dfboot_target_frame(frame))
			dfboot_capture(frame, pc);
		if (frame > 750u) {
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
	unsigned index;
	unsigned count = 0;
	for (index = 0; index < 29; ++index)
		if ((MEMORY_mem[dftrace_far_active + index] & 0x80u) != 0)
			++count;
	return count;
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
	for (slot = 0; slot < 10u; ++slot) {
		unsigned state = MEMORY_mem[dftrace_projectile_active + slot];
		if (state != 0u && MEMORY_mem[dftrace_projectile_rendered + slot] != 0u)
			frame->player_fighter_projectiles++;
		if (state == 1u && MEMORY_mem[dftrace_projectile_rendered + slot] != 0u &&
			MEMORY_mem[dftrace_entity_state + 2u] == 3u) {
			unsigned address = MEMORY_mem[dftrace_projectile_screen_lo + slot] |
				(MEMORY_mem[dftrace_projectile_screen_hi + slot] << 8);
			unsigned screen_code = MEMORY_mem[address];
			frame->rapid_projectiles++;
			/* Prefer the exact yellow PlayerFighter code ($0f), not merely any positive
			 * code: a later base/broadside glyph may occupy the same cell. */
			if (frame->rapid_projectile_slot == 0xffffffffu ||
				((frame->rapid_projectile_screen_code != 0x0fu ||
				  !dftrace_is_ring_address(frame->rapid_projectile_address)) &&
				screen_code == 0x0fu && dftrace_is_ring_address(address))) {
				frame->rapid_projectile_slot = slot;
				frame->rapid_projectile_address = address;
				frame->rapid_projectile_screen_code = screen_code;
				frame->rapid_projectile_backing =
					MEMORY_mem[dftrace_projectile_backing_top + slot];
			}
		}
	}
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

static void dftrace_set_gameplay_input(unsigned frame)
{
	unsigned stick = 0x0f;
	unsigned trigger = frame <= dftrace_fire_delay ? 1 : 0;
	unsigned x = MEMORY_mem[dftrace_player_x];
	unsigned y = MEMORY_mem[dftrace_player_y];
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
	else if (strcmp(dftrace_policy, "hunt") == 0) {
		/* Follow the live Interceptor's PMG origin using only ordinary joystick
		 * input. This remains a production gameplay replay: no guest state is
		 * seeded, and held FIRE enters the canonical burst controller. */
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

static void dftrace_snapshot(DFTraceFrame *frame)
{
	frame->dma_ctl = ANTIC_DMACTL;
	frame->nmi_en = ANTIC_NMIEN;
	frame->projectiles = dftrace_count_nonzero(dftrace_projectile_active, 19);
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
		if (address != frame->muzzle_pointer[0] && address != frame->muzzle_pointer[1])
			++frame->muzzle_illegal_cells;
	}
	for (address = DFTRACE_RING_SCREEN; address < DFTRACE_RING_END; ++address) {
		if (!dftrace_is_hull_transient(MEMORY_mem[address]))
			continue;
		++frame->muzzle_code_cells;
		if (address != frame->muzzle_pointer[0] && address != frame->muzzle_pointer[1])
			++frame->muzzle_illegal_cells;
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
	dftrace_snapshot_rapid_projectile(frame);
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
	frame->score_lo = MEMORY_mem[dftrace_score_lo];
	frame->score_hi = MEMORY_mem[dftrace_score_hi];
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
		",profile_erase_player_fighter_start,profile_interceptor_update_start"
		",profile_interceptor_render_start,profile_entity_erase_start"
		",profile_effect_update_end,profile_pickup_update_end"
		",profile_pickup_render_start,profile_effect_render_start"
		",player_x,player_y,prior,player_erase_calls,player_draw_calls"
		",player_erase_scanline,player_draw_scanline");
	for (index = 0; index < 2u; ++index)
		fprintf(file, ",muzzle%u_domain,muzzle%u_row,muzzle%u_pointer,muzzle%u_cell",
			index, index, index, index);
	fprintf(file, ",muzzle_code_cells,muzzle_illegal_cells,muzzle_pointer_errors"
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
		",player_damage_cooldown_after\n");
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
		fprintf(file, ",%u,%u,%u,%u,%llu,%llu,%llu,%llu,%llu,%llu,%llu,%llu"
			",%u,%u,%u,%u,%u,%u,%u",
			frame->profile_compose_calls, frame->profile_compose_cycles,
			frame->profile_pointer_calls, frame->profile_pointer_cycles,
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
			fprintf(file, ",%u,%u,%u,%u", frame->muzzle_domain[slot],
				frame->muzzle_row[slot], frame->muzzle_pointer[slot],
				frame->muzzle_cell[slot]);
		fprintf(file, ",%u,%u,%u,%u,%u", frame->muzzle_code_cells,
			frame->muzzle_illegal_cells, frame->muzzle_pointer_errors,
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
			",%u,%u,%u,%u,%u,%u,%u,%u,%u,%u\n",
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
			frame->player_invulnerability_after, frame->player_damage_cooldown_after);
	}
	if (fclose(file) != 0) {
		perror("voidstrike65 trace close");
		exit(2);
	}
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
	dftrace_fire_delay = dftrace_env_u("DFTRACE_FIRE_DELAY");
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
	dftrace_session = getenv("DFTRACE_SESSION");
	dftrace_output = getenv("DFTRACE_OUTPUT");
	if (dftrace_policy == NULL || dftrace_session == NULL || dftrace_output == NULL) {
		fprintf(stderr, "voidstrike65 trace: missing string environment\n");
		exit(2);
	}
	dftrace_frames = (DFTraceFrame *) calloc(dftrace_limit, sizeof(*dftrace_frames));
	if (dftrace_frames == NULL) {
		fprintf(stderr, "voidstrike65 trace: allocation failed\n");
		exit(2);
	}
#define DFTRACE_ADDRESS(field, env) field = dftrace_env_u(env)
	DFTRACE_ADDRESS(dftrace_pc_active, "DFTRACE_PC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_pc_end, "DFTRACE_PC_END");
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
	DFTRACE_ADDRESS(dftrace_pc_erase_slot, "DFTRACE_PC_ERASE_SLOT");
	DFTRACE_ADDRESS(dftrace_pc_interceptor_update_start, "DFTRACE_PC_INTERCEPTOR_UPDATE_START");
	DFTRACE_ADDRESS(dftrace_pc_render_slot, "DFTRACE_PC_RENDER_SLOT");
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
	DFTRACE_ADDRESS(dftrace_pc_interceptor_breakup_spawn, "DFTRACE_PC_INTERCEPTOR_BREAKUP_SPAWN");
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
	DFTRACE_ADDRESS(dftrace_capital_drain_rows, "DFTRACE_CAPITAL_DRAIN_ROWS");
	DFTRACE_ADDRESS(dftrace_far_active, "DFTRACE_FAR_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_active, "DFTRACE_ENEMY_ACTIVE");
	DFTRACE_ADDRESS(dftrace_enemy_x, "DFTRACE_ENEMY_X");
	DFTRACE_ADDRESS(dftrace_fighter_explosion_timer, "DFTRACE_FIGHTER_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_capital_explosion_timer, "DFTRACE_CAPITAL_EXPLOSION_TIMER");
	DFTRACE_ADDRESS(dftrace_music_active, "DFTRACE_MUSIC_ACTIVE");
	DFTRACE_ADDRESS(dftrace_fire_timer, "DFTRACE_FIRE_TIMER");
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
	DFTRACE_ADDRESS(dftrace_effect_rendered_mask, "DFTRACE_EFFECT_RENDERED_MASK");
	DFTRACE_ADDRESS(dftrace_engine_timer, "DFTRACE_ENGINE_TIMER");
	DFTRACE_ADDRESS(dftrace_engine_phase, "DFTRACE_ENGINE_PHASE");
	DFTRACE_ADDRESS(dftrace_corridor_phase, "DFTRACE_CORRIDOR_PHASE");
	DFTRACE_ADDRESS(dftrace_ring_flags, "DFTRACE_RING_FLAGS");
	DFTRACE_ADDRESS(dftrace_active_dlist_lo, "DFTRACE_ACTIVE_DLIST_LO");
	DFTRACE_ADDRESS(dftrace_next_dlist_lo, "DFTRACE_NEXT_DLIST_LO");
#undef DFTRACE_ADDRESS
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

static void DFTrace_Observe(unsigned pc, unsigned x_register, unsigned y_register)
{
	unsigned host_frame = (unsigned) Atari800_nframes;
	/* The hook runs immediately before PC.  A preceding STA $3B00,Y has
	 * therefore completed and Y is still the effective PMG row.  Retain the
	 * exact production writer for every missile byte without changing guest
	 * code or sampling only the final framebuffer. */
	if (dftrace_previous_pc != 0u && MEMORY_mem[dftrace_previous_pc] == 0x99u &&
		MEMORY_mem[(dftrace_previous_pc + 1u) & 0xffffu] == 0x00u &&
		MEMORY_mem[(dftrace_previous_pc + 2u) & 0xffffu] == 0x3bu)
		dftrace_pmg_last_writer[y_register & 0xffu] = dftrace_previous_pc;
	if (getenv("DFMENU_OUTPUT") != NULL) {
		dfmenu_observe(pc);
		return;
	}
	if (getenv("DFBOOT_OUTPUT") != NULL) {
		dfboot_observe(pc);
		return;
	}
	if (!dftrace_initialised)
		dftrace_init();
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
			MEMORY_mem[dftrace_entity_active_mask] == 2u &&
			(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u &&
			MEMORY_mem[dftrace_effect_active_count] == 0u) {
			dftrace_pickup_visible_passes++;
			if (dftrace_pickup_screenshot != NULL && *dftrace_pickup_screenshot != '\0' &&
				dftrace_pickup_screenshot_frame == 0xffffffffu &&
				dftrace_pickup_visible_passes == 2u &&
				!Screen_SaveScreenshot(dftrace_pickup_screenshot, 0)) {
				fprintf(stderr, "voidstrike65 trace: pickup screenshot failed: %s\n",
					dftrace_pickup_screenshot);
				exit(2);
			}
			if (dftrace_pickup_screenshot_frame == 0xffffffffu &&
				dftrace_pickup_visible_passes == 2u)
				dftrace_pickup_screenshot_frame = dftrace_count;
		}
		else
			dftrace_pickup_visible_passes = 0u;
		/* The first active hook still exposes the preceding framebuffer. Prime
		 * once, then capture 16 uninterrupted completed rasters regardless of
		 * unrelated effect activity elsewhere on screen. */
		if (dftrace_pickup_sequence_prefix != NULL &&
			*dftrace_pickup_sequence_prefix != '\0' &&
			MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			MEMORY_mem[dftrace_entity_active_mask] == 2u &&
			(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u &&
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
		if (dftrace_pickup_traversal_prefix != NULL &&
			*dftrace_pickup_traversal_prefix != '\0' &&
			MEMORY_mem[dftrace_entity_state + 1u] == 2u &&
			MEMORY_mem[dftrace_entity_active_mask] == 2u &&
			(MEMORY_mem[dftrace_entity_drawn_mask + 1u] & 15u) == 15u &&
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
		if (dftrace_count == dftrace_limit) {
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
		dftrace_prepare_broadside_proof();
		dftrace_current.start_clock = dftrace_clock();
		dftrace_current.start_host_frame = (unsigned) Atari800_nframes;
		dftrace_current.start_y = ANTIC_ypos;
		dftrace_current.start_x = ANTIC_XPOS;
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

	if (dftrace_current.profile_next < DFTRACE_PROFILE_COUNT &&
		pc == dftrace_pc_profile[dftrace_current.profile_next]) {
		dftrace_current.profile_clock[dftrace_current.profile_next] = dftrace_clock();
		/* Profile 18 is the projectile-render boundary immediately before the
		 * entity/effect renderer. Discard the earlier resident-capsule call so
		 * the nested render markers describe only the final layer pass. */
		if (dftrace_current.profile_next == 18u) {
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
	if (pc == dftrace_pc_erase_slot && x_register == 8u &&
		dftrace_current.profile_erase_player_fighter_start == 0u)
		dftrace_current.profile_erase_player_fighter_start = dftrace_clock();
	if (pc == dftrace_pc_interceptor_update_start)
		dftrace_current.profile_interceptor_update_start = dftrace_clock();
	if (pc == dftrace_pc_render_slot && x_register == 10u &&
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
	else if (pc == dftrace_pc_interceptor_breakup_spawn)
		dftrace_current.events |= DFTRACE_EVENT_INTERCEPTOR_BREAKUP_SPAWN;
	else if (pc == dftrace_pc_pickup_qualified_kill)
		dftrace_current.events |= DFTRACE_EVENT_PICKUP_QUALIFIED_KILL;
	else if (pc == dftrace_pc_pickup_collect)
		dftrace_current.events |= DFTRACE_EVENT_PICKUP_COLLECT;
	else if (pc == dftrace_pc_director_world)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_WORLD;
	else if (pc == dftrace_pc_director_request)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_REQUEST;
	else if (pc == dftrace_pc_director_event)
		dftrace_current.events |= DFTRACE_EVENT_DIRECTOR_EVENT;

	if (pc == dftrace_pc_end) {
		dftrace_broad_compositor_event("frame_end", 0xffffffffu);
		dftrace_snapshot_flash(&dftrace_current);
		dftrace_snapshot_engine(&dftrace_current);
		dftrace_snapshot_muzzles(&dftrace_current);
		dftrace_pickup_frame_end(&dftrace_current);
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
