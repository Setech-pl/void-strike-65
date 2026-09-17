/* MEASUREMENT ONLY (uncommitted). Wraps voidstrike65_trace.h and, when
 * DFPROF_OUTPUT is set, logs every instruction executed while trace rows
 * DFPROF_FIRST..DFPROF_LAST are open: row,host,pc,opcode,s,clock,ypos,xpos.
 * Without DFSTRESS_LOG no guest bytes change and production observer behaviour
 * is unchanged. With DFSTRESS_LOG the forced stress injection below pokes RAM. */
#ifndef VS65_MEASURE_FRAME_PROFILE_H
#define VS65_MEASURE_FRAME_PROFILE_H
#define DFTrace_Observe DFTrace_Observe_Production
#include "voidstrike65_trace.h"
#undef DFTrace_Observe


/* ---- Forced stress (DFSTRESS_LOG set). Replay-driven, gated injection:
 * when copy_engine_animation_phase runs in row C and the alternating 2/3 ring
 * rotation cadence predicts rotate_playfield_rows in row T = C + 8, with the
 * player alive and both Heavy members active:
 *   row C+1 start: fill every free hostile slot (5..9) with a BOMBER shot
 *                  (ACTIVE $1A, lifetime 96) high on screen, as light_update emits;
 *   row T start:   top the hostile pool up to 5 again, lives >= 2;
 *   row T @alive:  a 1-HP Wingman Light on the player -> contact death + kill.
 * Rows T and T+1 are logged through DFPROF_OUTPUT. Next arm after T+300. */
static FILE *dfstress_log;
static int dfstress_on = -1;
static unsigned dfstress_pc_alive, dfstress_pc_copy, dfstress_pc_rotate, dfstress_light;
static unsigned dfstress_fp_x, dfstress_fp_y, dfstress_fp_prev_y, dfstress_fp_life;
static unsigned dfstress_rot1 = 0xffffffffu, dfstress_rot2 = 0xffffffffu, dfstress_rot_row = 0xffffffffu;
static unsigned dfstress_copy_row = 0xffffffffu;
static unsigned dfstress_target = 0xffffffffu, dfstress_prefill_row = 0xffffffffu, dfstress_next_arm = 0u;
static unsigned dfstress_done_prefill = 0xffffffffu, dfstress_done_top = 0xffffffffu, dfstress_done_light = 0xffffffffu;
static unsigned dfstress_prof_rows[64];
static unsigned dfstress_prof_count;

static unsigned dfstress_env(const char *name)
{
	const char *v = getenv(name);
	return v == NULL ? 0u : (unsigned) strtoul(v, NULL, 0);
}

static unsigned dfstress_fill(unsigned y_base)
{
	unsigned slot, active = 0u;
	for (slot = 0u; slot < 5u; ++slot) {
		unsigned x = dftrace_projectile_active + 5u + slot;
		if (MEMORY_mem[x] == 0u) {
			MEMORY_mem[x] = 0x1au;
			MEMORY_mem[dfstress_fp_life + 5u + slot] = 96u;
			MEMORY_mem[dfstress_fp_x + 5u + slot] = (unsigned char) (64u + 28u * slot);
			MEMORY_mem[dfstress_fp_y + 5u + slot] = (unsigned char) (y_base + 8u * slot);
			MEMORY_mem[dfstress_fp_prev_y + 5u + slot] = (unsigned char) (y_base + 8u * slot);
		}
		if (MEMORY_mem[x] != 0u) ++active;
	}
	return active;
}

static unsigned dfstress_hostile_count(void)
{
	unsigned slot, active = 0u;
	for (slot = 0u; slot < 5u; ++slot)
		if (MEMORY_mem[dftrace_projectile_active + 5u + slot] != 0u) ++active;
	return active;
}

static int dfstress_ready(void)
{
	return MEMORY_mem[dftrace_player_lifecycle] == 0u &&
		MEMORY_mem[dftrace_player_lifecycle + 2u] == 0u &&
		MEMORY_mem[dftrace_enemy_member_state] == 1u &&
		MEMORY_mem[dftrace_enemy_member_state + 1u] == 1u;
}

static void dfstress_observe(unsigned pc)
{
	unsigned row = dftrace_count;
	if (dfstress_on < 0) {
		dfstress_on = getenv("DFSTRESS_LOG") != NULL;
		if (dfstress_on) {
			dfstress_log = fopen(getenv("DFSTRESS_LOG"), "w");
			dfstress_pc_alive = dfstress_env("DFSTRESS_PC_ALIVE");
			dfstress_pc_copy = dfstress_env("DFSTRESS_PC_COPY");
			dfstress_pc_rotate = dfstress_env("DFSTRESS_PC_ROTATE");
			dfstress_light = dfstress_env("DFSTRESS_LIGHT");
			dfstress_fp_x = dfstress_env("DFSTRESS_FP_X");
			dfstress_fp_y = dfstress_env("DFSTRESS_FP_Y");
			dfstress_fp_prev_y = dfstress_env("DFSTRESS_FP_PREV_Y");
			dfstress_fp_life = dfstress_env("DFSTRESS_FP_LIFETIME");
		}
	}
	if (!dfstress_on || (!dftrace_active && pc != dftrace_pc_active)) return;
	if (pc == dfstress_pc_rotate && dfstress_rot_row != row) {
		dfstress_rot1 = dfstress_rot2;
		dfstress_rot2 = row;
		dfstress_rot_row = row;
	}
	if (pc == dfstress_pc_copy && dfstress_copy_row != row) {
		dfstress_copy_row = row;
		if (dfstress_target == 0xffffffffu && row >= dfstress_next_arm &&
			dfstress_rot1 != 0xffffffffu && dfstress_ready() && MEMORY_mem[dftrace_sector_state] == 7u) {
			unsigned a = dfstress_rot1, b = dfstress_rot2, t = row + 8u;
			while (b < t) {
				unsigned gap = (b - a) == 2u ? 3u : 2u;
				a = b;
				b += gap;
			}
			if (b == t) {
				dfstress_target = t;
				dfstress_prefill_row = row + 1u;
				if (dfstress_prof_count < 64u) dfstress_prof_rows[dfstress_prof_count++] = t;
			}
		}
	}
	if (dfstress_target == 0xffffffffu) return;
	if (pc == dftrace_pc_active && row == dfstress_prefill_row && dfstress_done_prefill != row) {
		dfstress_done_prefill = row;
		fprintf(dfstress_log, "prefill,row=%u,active=%u\n", row, dfstress_fill(32u));
	}
	if (pc == dftrace_pc_active && row == dfstress_target && dfstress_done_top != row) {
		unsigned before = dfstress_hostile_count();
		dfstress_done_top = row;
		if (MEMORY_mem[dftrace_player_lifecycle + 1u] < 2u) MEMORY_mem[dftrace_player_lifecycle + 1u] = 2u;
		fprintf(dfstress_log, "top,row=%u,before=%u,after=%u,ready=%d,sector=%u\n", row, before,
			dfstress_fill(40u), dfstress_ready(), MEMORY_mem[dftrace_sector_state]);
	}
	if (pc == dfstress_pc_alive && row == dfstress_target && dfstress_done_light != row) {
		unsigned px = MEMORY_mem[dftrace_player_x] & 0xfcu;
		dfstress_done_light = row;
		if (px < 48u) px = 48u;
		if (px > 200u) px = 200u;
		fprintf(dfstress_log, "light,row=%u,ready=%d,hostile=%u,player_x=%u,player_y=%u,light_state_before=%u\n",
			row, dfstress_ready(), dfstress_hostile_count(), MEMORY_mem[dftrace_player_x],
			MEMORY_mem[dftrace_player_y], MEMORY_mem[dfstress_light]);
		if (dfstress_ready()) {
			MEMORY_mem[dfstress_light + 0u] = 1u;          /* light_state */
			MEMORY_mem[dfstress_light + 1u] = 1u;          /* light_hp */
			MEMORY_mem[dfstress_light + 2u] = (unsigned char) px;
			MEMORY_mem[dfstress_light + 3u] = MEMORY_mem[dftrace_player_y];
			MEMORY_mem[dfstress_light + 4u] = 200u;        /* fire timer */
			MEMORY_mem[dfstress_light + 5u] = 1u;          /* leaderless */
			MEMORY_mem[dfstress_light + 12u] = 12u;        /* Wingman record */
			MEMORY_mem[dfstress_light + 13u] = 0u;         /* burst */
		}
		dfstress_target = 0xffffffffu;
		dfstress_next_arm = row + 300u;
		fflush(dfstress_log);
	}
}

static int dfstress_profile_row(unsigned row)
{
	unsigned i;
	for (i = 0u; i < dfstress_prof_count; ++i)
		if (row == dfstress_prof_rows[i] || row == dfstress_prof_rows[i] + 1u) return 1;
	return 0;
}

static FILE *dfprof_file;
static int dfprof_ready;
static unsigned dfprof_first, dfprof_last;

static void DFTrace_Observe(unsigned pc, unsigned a_register, unsigned x_register,
	unsigned y_register, unsigned s_register)
{
	if (!dfprof_ready) {
		const char *out = getenv("DFPROF_OUTPUT");
		dfprof_ready = 1;
		if (out != NULL) {
			dfprof_file = fopen(out, "w");
			dfprof_first = (unsigned) strtoul(getenv("DFPROF_FIRST") ? getenv("DFPROF_FIRST") : "0", NULL, 10);
			dfprof_last = (unsigned) strtoul(getenv("DFPROF_LAST") ? getenv("DFPROF_LAST") : "0", NULL, 10);
		}
	}
	dfstress_observe(pc);
	if (dfprof_file != NULL && dftrace_active &&
		((dftrace_count >= dfprof_first && dftrace_count <= dfprof_last) ||
		 (dfstress_on > 0 && dfstress_profile_row(dftrace_count)))) {
		fprintf(dfprof_file, "%u,%u,%u,%u,%u,%llu,%d,%d\n", dftrace_count,
			(unsigned) Atari800_nframes, pc, MEMORY_mem[pc], s_register & 0xffu,
			(unsigned long long) ANTIC_CPU_CLOCK, (int) ANTIC_ypos, (int) ANTIC_XPOS);
	}
	DFTrace_Observe_Production(pc, a_register, x_register, y_register, s_register);
}
#endif
