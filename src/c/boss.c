/*
 * Void Strike 65 - the boss controller (M5b-S3).
 *
 * docs/plans/m5-loading-boss.md §5.1-5.2, §5.6, §5.11. The boss's policy: its
 * phases (the guns, then the core), the hit points, which module a shot that
 * reached the band damages, the chain after the core, the bonus, the hold and
 * the boss-fight clock the summary's time grade reads. It is linked into
 * overlay slot A with the boss's ASM (src/hybrid/boss.s), which owns the band,
 * the DLI, the collision scan, the drawing and the hand-off, and calls these
 * three functions through the mailboxes below (C/ASM ownership, AGENTS.md).
 *
 * The whole module lives in slot A, read from disk at every boss entry, so
 * its BSS is zero in the image and boss_c_init sets every byte it reads.
 * Like the Director it uses no cc65 software stack and no runtime zero page:
 * no parameters, no locals, no arithmetic helpers.
 */
#include <stdint.h>

#include "boss-layout.h"
#include "level-def.h"

#pragma code-name ("BOSS_C_CODE")
#pragma rodata-name ("BOSS_C_RODATA")
#pragma bss-name ("BOSS_C_BSS")

#define U8_AT(address)   (*(volatile uint8_t *)(address))
/* The region's tables at $AD00 and their module records, as arrays the boss's
 * ASM link places there (src/hybrid/boss.s exports both names), so that every
 * access is `absolute,Y` with a byte index: no cc65 pointer or helper state. */
extern volatile uint8_t boss_tables[];
extern volatile uint8_t boss_module_table[];
#define TABLE            boss_tables
#define MODULE_TABLE     boss_module_table

/* The active gameplay clock (src/main.s ACTIVE_GAMEPLAY_FRAME_LO/HI). */
#define ACTIVE_FRAME_LO  U8_AT(0x4FF8u)
#define ACTIVE_FRAME_HI  U8_AT(0x4FF9u)
/* The summary's bonus, packed BCD lo/hi (src/hybrid/level-summary-abi.inc). */
#define STATS_BONUS_LO   U8_AT(0x00B4u)
#define STATS_BONUS_HI   U8_AT(0x00B5u)
/* The terminal hold before the summary, as the capital level end had it
 * (LEVEL_END_HOLD_FRAMES): the last blast is seen settling. */
#define BOSS_HOLD_FRAMES 50u

#define PHASE_GUNS       0u
#define PHASE_CORE       1u
#define PHASE_CHAIN      2u
#define PHASE_HOLD       3u
#define PHASE_DONE       4u
#define NONE             0xFFu

/* In: the column map's value for the band column a shot reached, and that
 * column. */
uint8_t boss_hit_module;
uint8_t boss_hit_cell;
/* Out, after boss_c_hit: the module to draw wrecked, the module to draw open
 * and the module destroyed for score, each NONE when nothing happened. */
uint8_t boss_draw_wreck;
uint8_t boss_draw_open;
uint8_t boss_score_module;
/* Out, after boss_c_tick: the module the chain blasts this frame, or NONE;
 * nonzero once the chain and its hold are over (the ASM hands off). */
uint8_t boss_blast;
uint8_t boss_handoff;
/* The fight's length in frames, from the engagement to the core's death. */
uint8_t boss_clock_lo;
uint8_t boss_clock_hi;

uint8_t boss_phase;
uint8_t boss_hp[BOSS_MAX_MODULES];
static uint8_t boss_core;
static uint8_t boss_guns_left;
static uint8_t boss_timer;
static uint8_t boss_chain_left;
static uint8_t boss_chain_next;
static uint8_t boss_start_lo;
static uint8_t boss_start_hi;
static uint8_t boss_core_x;
static uint8_t boss_core_end;
static uint8_t boss_i;
static uint8_t boss_record;
static uint8_t boss_value;

/* Once, from the install: the hit points from the region's module table, the
 * phase, the clock's start. The core is the table's last module (the
 * compiler's rule), the guns every module before it. */
void boss_c_init(void)
{
    boss_core = (uint8_t)(TABLE[BOSS_T_MODULE_COUNT] - 1u);
    boss_guns_left = boss_core;
    boss_record = BOSS_M_HP;
    for (boss_i = 0u; boss_i != boss_core; ++boss_i) {
        boss_value = MODULE_TABLE[boss_record];
        boss_hp[boss_i] = boss_value;
        boss_record = (uint8_t)(boss_record + BOSS_MODULE_BYTES);
    }
    /* boss_record is the core's HP field now: its HP and its span. */
    boss_value = MODULE_TABLE[boss_record];
    boss_hp[boss_core] = boss_value;
    boss_record = (uint8_t)(boss_record - BOSS_M_HP + BOSS_M_X);
    boss_core_x = MODULE_TABLE[boss_record];
    boss_record = (uint8_t)(boss_record - BOSS_M_X + BOSS_M_WIDTH);
    boss_core_end = (uint8_t)(boss_core_x + MODULE_TABLE[boss_record]);
    boss_phase = PHASE_GUNS;
    boss_blast = NONE;
    boss_handoff = 0u;
    boss_start_lo = ACTIVE_FRAME_LO;
    boss_start_hi = ACTIVE_FRAME_HI;
}

/* A player shot reached the band in a column whose map value is a module.
 * A live gun takes the hit; once every gun is down the core does, in its own
 * columns, whichever gun's wreck lies in front of them; anything else is the
 * hull absorbing the shot. Returns 1 when a module was damaged. */
uint8_t boss_c_hit(void)
{
    boss_draw_wreck = NONE;
    boss_draw_open = NONE;
    boss_score_module = NONE;
    boss_i = boss_hit_module;
    if (boss_i >= boss_core || boss_hp[boss_i] == 0u) {
        if (boss_phase != PHASE_CORE) {
            return 0u;
        }
        if (boss_hit_cell < boss_core_x || boss_hit_cell >= boss_core_end) {
            return 0u;
        }
        boss_i = boss_core;
    }
    boss_value = (uint8_t)(boss_hp[boss_i] - 1u);
    boss_hp[boss_i] = boss_value;
    if (boss_value != 0u) {
        return 1u;
    }
    boss_draw_wreck = boss_i;
    boss_score_module = boss_i;
    if (boss_i == boss_core) {
        /* The win (plan §5.6): the chain starts on the next frame, the fight's
         * clock stops here, and the level's boss bonus goes to the summary,
         * which adds it to the score with the tier bonus. */
        boss_phase = PHASE_CHAIN;
        boss_timer = 0u;
        boss_chain_left = TABLE[BOSS_T_CHAIN_BLASTS];
        boss_chain_next = 0u;
        boss_clock_lo = (uint8_t)(ACTIVE_FRAME_LO - boss_start_lo);
        boss_clock_hi = (uint8_t)(ACTIVE_FRAME_HI - boss_start_hi);
        if (ACTIVE_FRAME_LO < boss_start_lo) {
            --boss_clock_hi;
        }
        STATS_BONUS_LO = U8_AT(LEVEL_BOSS_DEF_ADDRESS + BOSS_DEF_BONUS_LO);
        STATS_BONUS_HI = U8_AT(LEVEL_BOSS_DEF_ADDRESS + BOSS_DEF_BONUS_HI);
        return 1u;
    }
    --boss_guns_left;
    if (boss_guns_left == 0u) {
        boss_phase = PHASE_CORE;
        boss_draw_open = boss_core;
    }
    return 1u;
}

/* Every frame: the chain's cadence - one blast every chainFrames frames,
 * walking the modules - then the hold, then the hand-off. */
void boss_c_tick(void)
{
    boss_blast = NONE;
    if (boss_phase == PHASE_CHAIN) {
        if (boss_timer != 0u) {
            --boss_timer;
            return;
        }
        if (boss_chain_left == 0u) {
            boss_phase = PHASE_HOLD;
            boss_timer = BOSS_HOLD_FRAMES;
            return;
        }
        --boss_chain_left;
        boss_blast = boss_chain_next;
        ++boss_chain_next;
        if (boss_chain_next > boss_core) {
            boss_chain_next = 0u;
        }
        boss_timer = TABLE[BOSS_T_CHAIN_FRAMES];
        return;
    }
    if (boss_phase == PHASE_HOLD) {
        --boss_timer;
        if (boss_timer == 0u) {
            boss_phase = PHASE_DONE;
            boss_handoff = 1u;
        }
    }
}
