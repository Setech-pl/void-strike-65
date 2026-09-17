/* Void Strike 65 resident-capacity write-watch observer (plan steps 4.3, 4.5a,
 * 4.5M-M1, 4.5M-M2).
 *
 * Built into a private Atari800 7.1.2 copy as voidstrike65_trace.h by
 * scripts/capacity-window-watch.mjs. It watches two ranges by value change on
 * every emulated instruction:
 *   - the GLUE holding range, from the end of stage_glue_holding until
 *     layout_d_publish_glue has finished (the hold must survive untouched);
 *   - the resident capacity window, from GLUE publication until the scripted
 *     frontend/gameplay lifecycle ends (nothing may write it after startup).
 * It also records the CPU clock at fixed startup labels. A write that stores
 * the value already present is not observable by this method.
 *
 * Roadmap 4.5a additions: the hold size is a parameter; an optional injection
 * writes a deterministic pattern over a staging range at a given PC so a full
 * window of non-zero bytes crosses the boot copies; capital sectors are counted,
 * and the post-resume run keeps the player alive until one capital sector has
 * completed before letting the game end.
 *
 * Roadmap 4.5M-M1 additions: up to three boot-only staging ranges are watched
 * from DFCAP_PC_STAGE_DONE (the staging copies have completed) until
 * DFCAP_PC_STAGE_CONSUMED (the decoder starts), with their initial bytes
 * reported so the driver can compare them with the packed streams; an optional
 * DFCAP_RANGE_START/BYTES is dumped at DFCAP_PC_PUBLISH_DONE so the decoded
 * runtime image can be compared byte-exactly; and DFCAP_PC_WINDOW_FROM may
 * start the capacity-window watch at an earlier startup label than the GLUE
 * publication (the Heavy window is published before the loader since M1).
 *
 * Roadmap 4.5M-M2 additions: the window may be up to 1024 bytes (the freed
 * cold range $7BD0-$7E11 is watched for the whole lifecycle from `start`);
 * three more startup clock points (layout_d_cold_publish_complete,
 * unpack_entity_runtime, init_entity_effects) prove that the relocated ABI
 * ($8018) and merged low-C/GLUE/Heavy ($9B40) cold records are consumed before
 * ENTITY expansion and before the entity-state clear; the hold watch may start
 * at any label (DFCAP_PC_HOLD_DONE is chosen by the driver).
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "gtia.h"
#include "input.h"
#include "pia.h"

#define DFCAP_MAX_WRITES 256u
#define DFCAP_MAX_STATES 128u
#define DFCAP_FRAME_LIMIT 90000u
#define DFCAP_CLOCK_POINTS 11u
#define DFCAP_MAX_STAGES 3u
#define DFCAP_STAGE_MAX_BYTES 1032u
#define DFCAP_RANGE_MAX_BYTES 4096u
#define DFCAP_WINDOW_MAX_BYTES 1024u

typedef struct DFCapWrite {
	unsigned range;
	unsigned address;
	unsigned pc;
	unsigned frame;
	int scanline;
	unsigned old_value;
	unsigned new_value;
} DFCapWrite;

typedef struct DFCapState {
	unsigned frame;
	unsigned state;
	unsigned step;
} DFCapState;

static int dfcap_initialised;
static FILE *dfcap_file;
static const char *dfcap_artifact;
static unsigned dfcap_fill;
static unsigned dfcap_game_state;
static unsigned dfcap_selection;
static unsigned dfcap_armed;
static unsigned dfcap_player_lives;
static unsigned dfcap_pc_frontend_poll;
static unsigned dfcap_pc_pause_poll;
static unsigned dfcap_pc_hold_done;
static unsigned dfcap_pc_publish_done;
static unsigned dfcap_hold_start;
static unsigned dfcap_hold_bytes;
static unsigned dfcap_glue_final;
static unsigned dfcap_window_start;
static unsigned dfcap_window_bytes;
static unsigned dfcap_clock_pc[DFCAP_CLOCK_POINTS];
static uint64_t dfcap_clock_value[DFCAP_CLOCK_POINTS];
static int dfcap_clock_seen[DFCAP_CLOCK_POINTS];

static UBYTE dfcap_hold_snapshot[256];
static UBYTE dfcap_hold_initial[256];
static UBYTE dfcap_window_snapshot[DFCAP_WINDOW_MAX_BYTES];
static UBYTE dfcap_window_initial[DFCAP_WINDOW_MAX_BYTES];
static int dfcap_hold_active;
static int dfcap_hold_seen;
static int dfcap_hold_intact;
static int dfcap_glue_matches_hold;
static int dfcap_window_matches_hold;
static unsigned dfcap_capital_state;
static unsigned dfcap_last_sector = 0xffffffffu;
static unsigned dfcap_capital_entries;
static unsigned dfcap_capital_completions;
static unsigned dfcap_capital_entry_frame;
static unsigned dfcap_capital_completion_frame;
static unsigned dfcap_keep_alive_pokes;
static unsigned dfcap_inject_pc;
static unsigned dfcap_inject_start;
static unsigned dfcap_inject_bytes;
static int dfcap_injected;
static int dfcap_window_active;
static unsigned dfcap_pc_window_from;
static unsigned dfcap_stage_count;
static unsigned dfcap_stage_start[DFCAP_MAX_STAGES];
static unsigned dfcap_stage_bytes[DFCAP_MAX_STAGES];
static unsigned dfcap_pc_stage_done;
static unsigned dfcap_pc_stage_consumed;
static UBYTE dfcap_stage_snapshot[DFCAP_MAX_STAGES][DFCAP_STAGE_MAX_BYTES];
static UBYTE dfcap_stage_initial[DFCAP_MAX_STAGES][DFCAP_STAGE_MAX_BYTES];
static int dfcap_stage_active;
static int dfcap_stage_seen;
static int dfcap_stage_consumed_seen;
static int dfcap_stage_intact[DFCAP_MAX_STAGES];
static unsigned dfcap_range_start;
static unsigned dfcap_range_bytes;
static UBYTE dfcap_range_copy[DFCAP_RANGE_MAX_BYTES];
static int dfcap_range_captured;
static unsigned dfcap_previous_pc;
static DFCapWrite dfcap_writes[DFCAP_MAX_WRITES];
static unsigned dfcap_writes_count;
static unsigned dfcap_writes_dropped;
static DFCapState dfcap_states[DFCAP_MAX_STATES];
static unsigned dfcap_states_count;

static unsigned dfcap_step;
static unsigned dfcap_last_state = 0xffffffffu;
static unsigned dfcap_state_frame;
static unsigned dfcap_press_frame;
static unsigned dfcap_cooldown_frame;
static int dfcap_pressing;
static int dfcap_lives_poked;
static unsigned dfcap_game_over_count;
static unsigned dfcap_pause_count;
static unsigned dfcap_options_count;
static unsigned dfcap_gameplay_count;

static unsigned dfcap_env_u(const char *name)
{
	const char *value = getenv(name);
	char *end;
	unsigned long parsed;
	if (value == NULL || *value == '\0') {
		fprintf(stderr, "voidstrike65 capacity watch: missing %s\n", name);
		exit(2);
	}
	parsed = strtoul(value, &end, 0);
	if (*end != '\0' || parsed > 0xffffu) {
		fprintf(stderr, "voidstrike65 capacity watch: invalid %s=%s\n", name, value);
		exit(2);
	}
	return (unsigned) parsed;
}

static void dfcap_hex(FILE *file, const UBYTE *bytes, unsigned length)
{
	static const char digits[] = "0123456789abcdef";
	unsigned index;
	for (index = 0; index < length; ++index) {
		fputc(digits[bytes[index] >> 4], file);
		fputc(digits[bytes[index] & 0x0fu], file);
	}
}

static void dfcap_set_input(unsigned stick, unsigned trigger)
{
	PIA_PORT_input[0] = (PIA_PORT_input[0] & 0xf0u) | (stick & 0x0fu);
	GTIA_TRIG[0] = (UBYTE) (trigger != 0u);
}

static void dfcap_init(void)
{
	static const char *clock_names[DFCAP_CLOCK_POINTS] = {
		"DFCAP_PC_START", "DFCAP_PC_ABI_PUBLISH", "DFCAP_PC_ENTITY_UNPACK_DONE",
		"DFCAP_PC_PICKUP_UNPACK", "DFCAP_PC_GLUE_HOLDING_DONE", "DFCAP_PC_SHOW_LOADER",
		"DFCAP_PC_STARFIELD_UNPACK", "DFCAP_PC_PUBLISH_DONE",
		"DFCAP_PC_COLD_PUBLISH_DONE", "DFCAP_PC_ENTITY_UNPACK", "DFCAP_PC_ENTITY_CLEAR"
	};
	unsigned index;
	unsigned address;
	dfcap_file = fopen(getenv("DFCAP_OUTPUT"), "w");
	if (dfcap_file == NULL) {
		perror("voidstrike65 capacity watch output");
		exit(2);
	}
	dfcap_artifact = getenv("DFCAP_ARTIFACT");
	if (dfcap_artifact == NULL || *dfcap_artifact == '\0') {
		fprintf(stderr, "voidstrike65 capacity watch: missing artifact\n");
		exit(2);
	}
	dfcap_fill = dfcap_env_u("DFCAP_RAM_FILL");
	dfcap_game_state = dfcap_env_u("DFCAP_GAME_STATE");
	dfcap_selection = dfcap_env_u("DFCAP_FRONTEND_SELECTION");
	dfcap_armed = dfcap_env_u("DFCAP_FRONTEND_INPUT_ARMED");
	dfcap_player_lives = dfcap_env_u("DFCAP_PLAYER_LIVES");
	dfcap_pc_frontend_poll = dfcap_env_u("DFCAP_PC_FRONTEND_POLL");
	dfcap_pc_pause_poll = dfcap_env_u("DFCAP_PC_PAUSE_POLL");
	dfcap_pc_hold_done = dfcap_env_u("DFCAP_PC_HOLD_DONE");
	dfcap_pc_publish_done = dfcap_env_u("DFCAP_PC_PUBLISH_DONE");
	dfcap_hold_start = dfcap_env_u("DFCAP_HOLD_START");
	dfcap_hold_bytes = dfcap_env_u("DFCAP_HOLD_BYTES");
	dfcap_glue_final = dfcap_env_u("DFCAP_GLUE_FINAL");
	dfcap_window_start = dfcap_env_u("DFCAP_WINDOW_START");
	dfcap_window_bytes = dfcap_env_u("DFCAP_WINDOW_BYTES");
	dfcap_capital_state = dfcap_env_u("DFCAP_CAPITAL_STATE");
	if (getenv("DFCAP_INJECT_PC") != NULL) {
		dfcap_inject_pc = dfcap_env_u("DFCAP_INJECT_PC");
		dfcap_inject_start = dfcap_env_u("DFCAP_INJECT_START");
		dfcap_inject_bytes = dfcap_env_u("DFCAP_INJECT_BYTES");
	}
	if (getenv("DFCAP_PC_WINDOW_FROM") != NULL)
		dfcap_pc_window_from = dfcap_env_u("DFCAP_PC_WINDOW_FROM");
	if (getenv("DFCAP_STAGE_COUNT") != NULL) {
		static const char *start_names[DFCAP_MAX_STAGES] = {
			"DFCAP_STAGE0_START", "DFCAP_STAGE1_START", "DFCAP_STAGE2_START"
		};
		static const char *bytes_names[DFCAP_MAX_STAGES] = {
			"DFCAP_STAGE0_BYTES", "DFCAP_STAGE1_BYTES", "DFCAP_STAGE2_BYTES"
		};
		dfcap_stage_count = dfcap_env_u("DFCAP_STAGE_COUNT");
		if (dfcap_stage_count > DFCAP_MAX_STAGES) {
			fprintf(stderr, "voidstrike65 capacity watch: too many stages\n");
			exit(2);
		}
		for (index = 0; index < dfcap_stage_count; ++index) {
			dfcap_stage_start[index] = dfcap_env_u(start_names[index]);
			dfcap_stage_bytes[index] = dfcap_env_u(bytes_names[index]);
			if (dfcap_stage_bytes[index] == 0u ||
				dfcap_stage_bytes[index] > DFCAP_STAGE_MAX_BYTES) {
				fprintf(stderr, "voidstrike65 capacity watch: invalid stage range\n");
				exit(2);
			}
		}
		dfcap_pc_stage_done = dfcap_env_u("DFCAP_PC_STAGE_DONE");
		dfcap_pc_stage_consumed = dfcap_env_u("DFCAP_PC_STAGE_CONSUMED");
	}
	if (getenv("DFCAP_RANGE_START") != NULL) {
		dfcap_range_start = dfcap_env_u("DFCAP_RANGE_START");
		dfcap_range_bytes = dfcap_env_u("DFCAP_RANGE_BYTES");
		if (dfcap_range_bytes == 0u || dfcap_range_bytes > DFCAP_RANGE_MAX_BYTES) {
			fprintf(stderr, "voidstrike65 capacity watch: invalid range\n");
			exit(2);
		}
	}
	if (dfcap_fill > 0xffu || dfcap_hold_bytes == 0u || dfcap_hold_bytes > 256u ||
		dfcap_window_bytes == 0u || dfcap_window_bytes > DFCAP_WINDOW_MAX_BYTES) {
		fprintf(stderr, "voidstrike65 capacity watch: invalid fill or range\n");
		exit(2);
	}
	for (index = 0; index < DFCAP_CLOCK_POINTS; ++index)
		dfcap_clock_pc[index] = dfcap_env_u(clock_names[index]);
	/* $7810-$7FFF covers the Heavy window, its staging and the cold staging
	 * around it; $8000-$9FFF the resident suffix, holds and the 4.3 window. */
	for (address = 0x7810u; address < 0xa000u; ++address)
		MEMORY_mem[address] = (UBYTE) dfcap_fill;
	dfcap_set_input(0x0fu, 1u);
	dfcap_initialised = 1;
}

static void dfcap_record_changes(unsigned range, UBYTE *snapshot, unsigned start,
	unsigned bytes)
{
	unsigned index;
	if (memcmp(snapshot, MEMORY_mem + start, bytes) == 0)
		return;
	for (index = 0; index < bytes; ++index) {
		UBYTE value = MEMORY_mem[start + index];
		if (value == snapshot[index])
			continue;
		if (dfcap_writes_count < DFCAP_MAX_WRITES) {
			DFCapWrite *write = &dfcap_writes[dfcap_writes_count++];
			write->range = range;
			write->address = start + index;
			write->pc = dfcap_previous_pc;
			write->frame = (unsigned) Atari800_nframes;
			write->scanline = ANTIC_ypos;
			write->old_value = snapshot[index];
			write->new_value = value;
		}
		else {
			++dfcap_writes_dropped;
		}
		snapshot[index] = value;
	}
}

static void dfcap_finish(int status)
{
	unsigned index;
	fprintf(dfcap_file,
		"{\n  \"artifact\":\"%s\",\n  \"cold_ram_fill\":%u,\n  \"status\":%d,\n"
		"  \"final_step\":%u,\n  \"final_frame\":%u,\n"
		"  \"injection\":{\"pc\":%u,\"start\":%u,\"bytes\":%u,\"done\":%d},\n"
		"  \"capital\":{\"entries\":%u,\"completions\":%u,\"keep_alive_pokes\":%u,"
		"\"first_entry_frame\":%u,\"first_completion_frame\":%u},\n"
		"  \"hold\":{\"start\":%u,\"bytes\":%u,\"seen\":%d,\"intact_at_publish\":%d,"
		"\"glue_final_matches_hold\":%d,\"window_matches_hold\":%d,\"initial_hex\":\"",
		dfcap_artifact, dfcap_fill, status, dfcap_step, (unsigned) Atari800_nframes,
		dfcap_inject_pc, dfcap_inject_start, dfcap_inject_bytes, dfcap_injected,
		dfcap_capital_entries, dfcap_capital_completions, dfcap_keep_alive_pokes,
		dfcap_capital_entry_frame, dfcap_capital_completion_frame,
		dfcap_hold_start, dfcap_hold_bytes, dfcap_hold_seen, dfcap_hold_intact,
		dfcap_glue_matches_hold, dfcap_window_matches_hold);
	dfcap_hex(dfcap_file, dfcap_hold_initial, dfcap_hold_bytes);
	fprintf(dfcap_file,
		"\"},\n  \"window\":{\"start\":%u,\"bytes\":%u,\"seen\":%d,\"initial_hex\":\"",
		dfcap_window_start, dfcap_window_bytes, dfcap_window_active);
	dfcap_hex(dfcap_file, dfcap_window_initial, dfcap_window_bytes);
	fputs("\",\"final_hex\":\"", dfcap_file);
	dfcap_hex(dfcap_file, MEMORY_mem + dfcap_window_start, dfcap_window_bytes);
	fprintf(dfcap_file, "\"},\n  \"stages\":{\"count\":%u,\"seen\":%d,\"consumed_seen\":%d,\"items\":[",
		dfcap_stage_count, dfcap_stage_seen, dfcap_stage_consumed_seen);
	for (index = 0; index < dfcap_stage_count; ++index) {
		fprintf(dfcap_file, "%s{\"start\":%u,\"bytes\":%u,\"intact_at_consume\":%d,\"initial_hex\":\"",
			index == 0u ? "" : ",", dfcap_stage_start[index], dfcap_stage_bytes[index],
			dfcap_stage_intact[index]);
		dfcap_hex(dfcap_file, dfcap_stage_initial[index], dfcap_stage_bytes[index]);
		fputs("\"}", dfcap_file);
	}
	fprintf(dfcap_file, "]},\n  \"range\":{\"start\":%u,\"bytes\":%u,\"captured\":%d,\"hex\":\"",
		dfcap_range_start, dfcap_range_bytes, dfcap_range_captured);
	if (dfcap_range_captured)
		dfcap_hex(dfcap_file, dfcap_range_copy, dfcap_range_bytes);
	fprintf(dfcap_file,
		"\"},\n  \"lifecycle\":{\"options_entries\":%u,\"gameplay_entries\":%u,"
		"\"pause_entries\":%u,\"game_over_entries\":%u,\"lives_poked\":%d},\n"
		"  \"startup_clock\":[",
		dfcap_options_count, dfcap_gameplay_count, dfcap_pause_count,
		dfcap_game_over_count, dfcap_lives_poked);
	for (index = 0; index < DFCAP_CLOCK_POINTS; ++index)
		fprintf(dfcap_file, "%s{\"pc\":%u,\"seen\":%d,\"clock\":%llu}",
			index == 0u ? "" : ",", dfcap_clock_pc[index], dfcap_clock_seen[index],
			(unsigned long long) dfcap_clock_value[index]);
	fputs("],\n  \"states\":[", dfcap_file);
	for (index = 0; index < dfcap_states_count; ++index)
		fprintf(dfcap_file, "%s{\"frame\":%u,\"state\":%u,\"step\":%u}",
			index == 0u ? "" : ",", dfcap_states[index].frame,
			dfcap_states[index].state, dfcap_states[index].step);
	fprintf(dfcap_file, "],\n  \"writes_dropped\":%u,\n  \"writes\":[", dfcap_writes_dropped);
	for (index = 0; index < dfcap_writes_count; ++index) {
		DFCapWrite *write = &dfcap_writes[index];
		fprintf(dfcap_file,
			"%s\n    {\"range\":\"%s\",\"address\":%u,\"pc\":%u,\"frame\":%u,"
			"\"scanline\":%d,\"old\":%u,\"new\":%u}",
			index == 0u ? "" : ",", write->range == 0u ? "hold" :
			write->range == 1u ? "window" : write->range == 2u ? "stage_0" :
			write->range == 3u ? "stage_1" : "stage_2",
			write->address, write->pc, write->frame, write->scanline,
			write->old_value, write->new_value);
	}
	fputs("\n  ]\n}\n", dfcap_file);
	fclose(dfcap_file);
	fflush(NULL);
	exit(status);
}

/* One scripted press per step, issued at the matching input poll while the
 * frontend is armed. Each step names the state it waits for, so a missing
 * transition stalls visibly until the frame limit. */
static void dfcap_drive(unsigned pc, unsigned frame, unsigned state)
{
	unsigned selection = MEMORY_mem[dfcap_selection];
	unsigned armed = MEMORY_mem[dfcap_armed];
	unsigned age = frame - dfcap_state_frame;
	unsigned stick = 0x0fu;
	unsigned trigger = 1u;
	int poll = pc == dfcap_pc_frontend_poll || pc == dfcap_pc_pause_poll;
	int act = 0;

	if (dfcap_pressing) {
		if (poll && frame >= dfcap_press_frame + 3u) {
			dfcap_set_input(0x0fu, 1u);
			dfcap_pressing = 0;
			dfcap_cooldown_frame = frame + 8u;
			++dfcap_step;
		}
		return;
	}
	if (!poll || armed == 0u || frame < dfcap_cooldown_frame)
		return;

	switch (dfcap_step) {
	case 0: /* first menu: select OPTIONS */
		if (state == 1u && age >= 60u) { stick = 0x0du; act = 1; }
		break;
	case 1:
		if (state == 1u && selection == 1u) { trigger = 0u; act = 1; }
		break;
	case 2: /* options: move to BACK (selection wraps 0 -> 3) */
		if (state == 2u && age >= 30u) { stick = 0x0eu; act = 1; }
		break;
	case 3:
		if (state == 2u && selection == 3u) { trigger = 0u; act = 1; }
		break;
	case 4: /* menu: START */
		if (state == 1u && age >= 30u && selection == 0u) { trigger = 0u; act = 1; }
		break;
	case 6: /* pause: RESUME */
		if (state == 8u && age >= 20u && selection == 0u) { trigger = 0u; act = 1; }
		break;
	case 8: /* game over: back to menu */
		if (state == 7u && age >= 60u) { trigger = 0u; act = 1; }
		break;
	case 9: /* menu: START again */
		if (state == 1u && age >= 30u && selection == 0u) { trigger = 0u; act = 1; }
		break;
	case 11: /* pause: select QUIT */
		if (state == 8u && age >= 20u) {
			if (selection < 2u) stick = 0x0du; else trigger = 0u;
			act = 1;
		}
		break;
	case 12: /* quit confirmation: YES */
		if (state == 9u) {
			if (selection == 0u) stick = 0x0du; else trigger = 0u;
			act = 1;
		}
		break;
	default:
		break;
	}
	if (act) {
		dfcap_set_input(stick, trigger);
		dfcap_pressing = 1;
		dfcap_press_frame = frame;
		/* Movement presses that do not complete the step are repeated. */
		if ((dfcap_step == 11u && selection < 2u) || (dfcap_step == 12u && selection == 0u))
			--dfcap_step;
	}
}

static void DFTrace_Observe(unsigned pc, unsigned a_register, unsigned x_register,
	unsigned y_register, unsigned s_register)
{
	unsigned frame;
	unsigned state;
	unsigned index;
	(void) a_register;
	(void) x_register;
	(void) y_register;
	(void) s_register;
	if (getenv("DFCAP_OUTPUT") == NULL)
		return;
	if (!dfcap_initialised)
		dfcap_init();

	for (index = 0; index < DFCAP_CLOCK_POINTS; ++index) {
		/* Boot-stage code can occupy resident addresses before `start`. */
		if (index != 0u && !dfcap_clock_seen[0])
			break;
		if (!dfcap_clock_seen[index] && pc == dfcap_clock_pc[index]) {
			dfcap_clock_seen[index] = 1;
			dfcap_clock_value[index] = (uint64_t) ANTIC_CPU_CLOCK;
		}
	}
	/* Only after `start`: ATR stage-2 loader code occupies resident addresses. */
	if (dfcap_inject_bytes != 0u && !dfcap_injected && dfcap_clock_seen[0] &&
		pc == dfcap_inject_pc) {
		for (index = 0; index < dfcap_inject_bytes; ++index)
			MEMORY_mem[dfcap_inject_start + index] = (UBYTE) ((index * 37u + 0x5bu) & 0xffu);
		dfcap_injected = 1;
	}
	if (dfcap_hold_active)
		dfcap_record_changes(0u, dfcap_hold_snapshot, dfcap_hold_start, dfcap_hold_bytes);
	if (dfcap_window_active)
		dfcap_record_changes(1u, dfcap_window_snapshot, dfcap_window_start,
			dfcap_window_bytes);
	if (dfcap_stage_active)
		for (index = 0; index < dfcap_stage_count; ++index)
			dfcap_record_changes(2u + index, dfcap_stage_snapshot[index],
				dfcap_stage_start[index], dfcap_stage_bytes[index]);
	/* Only after `start`: ATR stage-2 loader code occupies resident addresses. */
	if (dfcap_stage_count != 0u && !dfcap_stage_seen && dfcap_clock_seen[0] &&
		pc == dfcap_pc_stage_done) {
		dfcap_stage_seen = 1;
		dfcap_stage_active = 1;
		for (index = 0; index < dfcap_stage_count; ++index) {
			memcpy(dfcap_stage_snapshot[index], MEMORY_mem + dfcap_stage_start[index],
				dfcap_stage_bytes[index]);
			memcpy(dfcap_stage_initial[index], dfcap_stage_snapshot[index],
				dfcap_stage_bytes[index]);
		}
	}
	if (dfcap_stage_active && pc == dfcap_pc_stage_consumed) {
		dfcap_stage_active = 0;
		dfcap_stage_consumed_seen = 1;
		for (index = 0; index < dfcap_stage_count; ++index)
			dfcap_stage_intact[index] = memcmp(dfcap_stage_initial[index],
				MEMORY_mem + dfcap_stage_start[index], dfcap_stage_bytes[index]) == 0;
	}
	if (dfcap_pc_window_from != 0u && !dfcap_window_active && dfcap_clock_seen[0] &&
		pc == dfcap_pc_window_from) {
		dfcap_window_active = 1;
		memcpy(dfcap_window_snapshot, MEMORY_mem + dfcap_window_start, dfcap_window_bytes);
		memcpy(dfcap_window_initial, dfcap_window_snapshot, dfcap_window_bytes);
	}
	if (dfcap_range_bytes != 0u && !dfcap_range_captured && dfcap_clock_seen[0] &&
		pc == dfcap_pc_publish_done) {
		dfcap_range_captured = 1;
		memcpy(dfcap_range_copy, MEMORY_mem + dfcap_range_start, dfcap_range_bytes);
	}
	if (!dfcap_hold_seen && pc == dfcap_pc_hold_done) {
		dfcap_hold_seen = 1;
		dfcap_hold_active = 1;
		memcpy(dfcap_hold_snapshot, MEMORY_mem + dfcap_hold_start, dfcap_hold_bytes);
		memcpy(dfcap_hold_initial, dfcap_hold_snapshot, dfcap_hold_bytes);
	}
	if (dfcap_hold_active && pc == dfcap_pc_publish_done) {
		dfcap_hold_active = 0;
		dfcap_hold_intact = memcmp(dfcap_hold_initial, MEMORY_mem + dfcap_hold_start,
			dfcap_hold_bytes) == 0;
		dfcap_glue_matches_hold = memcmp(dfcap_hold_initial,
			MEMORY_mem + dfcap_glue_final, dfcap_hold_bytes) == 0;
		dfcap_window_matches_hold = memcmp(dfcap_hold_initial,
			MEMORY_mem + dfcap_window_start,
			dfcap_hold_bytes < dfcap_window_bytes ? dfcap_hold_bytes : dfcap_window_bytes) == 0;
		if (!dfcap_window_active) {
			dfcap_window_active = 1;
			memcpy(dfcap_window_snapshot, MEMORY_mem + dfcap_window_start, dfcap_window_bytes);
			memcpy(dfcap_window_initial, dfcap_window_snapshot, dfcap_window_bytes);
		}
	}
	dfcap_previous_pc = pc;

	frame = (unsigned) Atari800_nframes;
	state = MEMORY_mem[dfcap_game_state];
	INPUT_key_consol = INPUT_CONSOL_NONE;
	/* The scripted lifecycle starts at GLUE publication as before, even when
	 * the window watch itself was armed at an earlier startup label. */
	if (!dfcap_clock_seen[7])
		return;
	if (dfcap_window_active && state != dfcap_last_state) {
		if (dfcap_states_count < DFCAP_MAX_STATES) {
			dfcap_states[dfcap_states_count].frame = frame;
			dfcap_states[dfcap_states_count].state = state;
			dfcap_states[dfcap_states_count].step = dfcap_step;
			++dfcap_states_count;
		}
		if (state == 2u) ++dfcap_options_count;
		if (state == 6u && dfcap_last_state != 8u) ++dfcap_gameplay_count;
		if (state == 8u) ++dfcap_pause_count;
		if (state == 7u) ++dfcap_game_over_count;
		dfcap_state_frame = frame;
		dfcap_last_state = state;
		/* A press that changed the state has completed its step. */
		if (dfcap_pressing)
			++dfcap_step;
		dfcap_set_input(0x0fu, 1u);
		dfcap_pressing = 0;
		dfcap_cooldown_frame = frame + 8u;
		/* Steps completed by a transition that no scripted press causes. */
		if ((dfcap_step == 5u || dfcap_step == 10u) && state == 8u)
			++dfcap_step;
		else if (dfcap_step == 7u && state == 7u)
			++dfcap_step;
	}
	if (!dfcap_window_active)
		return;

	/* Capital coverage: a sector byte below SECTOR_FIGHTER (7) during gameplay
	 * is a capital sector; its return to 7 completes it. */
	{
		unsigned sector = MEMORY_mem[dfcap_capital_state];
		if (state == 6u && sector < 7u && dfcap_last_sector == 7u) {
			if (dfcap_capital_entries == 0u)
				dfcap_capital_entry_frame = frame;
			++dfcap_capital_entries;
		}
		/* Only a gameplay frame completes a capital sector; a restart that
		 * reinitialises the byte to 7 is not a completion. */
		if (state == 6u && sector == 7u && dfcap_last_sector < 7u &&
			dfcap_capital_entries != 0u) {
			if (dfcap_capital_completions == 0u)
				dfcap_capital_completion_frame = frame;
			++dfcap_capital_completions;
		}
		dfcap_last_sector = sector;
	}

	/* Gameplay: pause after 200 frames (steps 5 and 10). After the resume the
	 * player is kept alive until one capital sector has completed (bounded by
	 * 12000 frames); then the remaining lives are cleared once so the game-over
	 * path is exercised. */
	if (state == 6u) {
		unsigned age = frame - dfcap_state_frame;
		if ((dfcap_step == 5u || dfcap_step == 10u) && age >= 200u && age <= 201u)
			INPUT_key_consol &= ~INPUT_CONSOL_OPTION;
		if (dfcap_step == 7u && !dfcap_lives_poked) {
			if (dfcap_capital_completions == 0u && age < 12000u) {
				if (MEMORY_mem[dfcap_player_lives] < 2u) {
					MEMORY_mem[dfcap_player_lives] = 3u;
					++dfcap_keep_alive_pokes;
				}
			}
			else {
				MEMORY_mem[dfcap_player_lives] = 0u;
				dfcap_lives_poked = 1;
			}
		}
	}
	dfcap_drive(pc, frame, state);
	if (dfcap_step >= 13u && state == 1u && frame - dfcap_state_frame >= 60u)
		dfcap_finish(0);
	if (frame > DFCAP_FRAME_LIMIT)
		dfcap_finish(3);
}
