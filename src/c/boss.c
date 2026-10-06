/*
 * Void Strike 65 - the boss controller (M5b-S3, rebuilt in M5b-S4a-i).
 *
 * docs/plans/m5-loading-boss.md §5.13.2: the layered fight's policy, one engine
 * for both styles (decision F) - up to 16 modules, each covered by a 16-bit
 * cover mask and exposed once every module of its cover is destroyed; damage
 * stages at the converter's thresholds; emitter slots the level's laser tier
 * enables, the rest turned into capped armour (decision B); the defeat when
 * the last weapon module falls, armour left standing (decision A); the single
 * fire countdown that names the module whose turn it is and, for a salvo
 * launcher, the three-shot burst; the chain, the bonus, the hold and the
 * boss-fight clock the summary's time grade reads.
 *
 * The fortress session (plan §5.15, owner decisions H-K and the answers of
 * §5.15.6): the exposure check runs on the tick of the frame after a kill, so
 * a kill frame never pays it on top of the rebuild and the draws. M5b-S4b:
 * the tier's emitter slots are weapons again (decision 8, the count from slot
 * D's laser_tier); a named emitter fires its laser (slot D), not a shot.
 *
 * It lives in slot C ($1000-$17FF, owner answer Q-B5), read from disk at every
 * boss entry with the boss's ASM in slot A (src/hybrid/boss.s), which owns the
 * band, the DLI, the collision scan, the drawing and the hand-off and calls
 * these three functions through the mailboxes below (C/ASM ownership,
 * AGENTS.md). Its BSS follows the code in slot C and is never read from disk:
 * boss_c_init sets every byte it reads. Like the Director it uses no cc65
 * software stack and no runtime zero page: no parameters, no locals, no
 * arithmetic helpers. Every address it reads outside slot C is a symbol of
 * the boss link (the region's tables, the level's boss_def, main's clock and
 * difficulty, the summary's bonus), so none of them can drift (Q-S3).
 */
#include <stdint.h>

#include "boss-layout.h"
#include "level-def.h"

#pragma code-name ("BOSS_C_CODE")
#pragma rodata-name ("BOSS_C_RODATA")
#pragma bss-name ("BOSS_C_BSS")

/* The region's tables at $AD00 and their module records, the level image's
 * id and boss_def, main's difficulty and active-gameplay clock, the summary's
 * bonus: arrays the boss's ASM link places (src/hybrid/boss.s exports each
 * name), so that every access is `absolute,Y` with a byte index. */
extern volatile uint8_t boss_tables[];
extern volatile uint8_t boss_module_table[];
extern volatile uint8_t boss_level[];          /* the image header: [3] the level id */
extern volatile uint8_t boss_def[];            /* the level's boss_def block */
extern volatile uint8_t boss_difficulty[];     /* [0] DIFFICULTY_SETTING: 0 EASY .. 2 HARD */
extern volatile uint8_t boss_active_frame[];   /* [0] lo, [1] hi */
extern volatile uint8_t boss_stats_bonus[];    /* [0] lo, [1] hi, packed BCD */
extern volatile uint8_t boss_laser_slots[];    /* [0] the emitter slots the tier enables (slot D) */
#define TABLE            boss_tables
#define LEVEL_HEADER_ID  3u
/* A module record's field, indexed by the record's offset: `abs,Y` on the
 * field's own address, never a computed index (which cc65 reaches through a
 * runtime pointer). */
#define FIELD(offset)    (boss_module_table + (offset))

/* The terminal hold before the summary, as the capital level end had it
 * (LEVEL_END_HOLD_FRAMES): the last blast is seen settling. */
#define BOSS_HOLD_FRAMES 50u

/* The phases the trace reads as boss_state = 1 + phase (§5.13.7: 1 fight,
 * 3 chain, 4 hold, 5 done). 1 was S3's core phase: the core is a module now. */
#define PHASE_FIGHT      0u
#define PHASE_CHAIN      2u
#define PHASE_HOLD       3u
#define PHASE_DONE       4u
#define NONE             0xFFu
#define DIFFICULTY_EASY  0u
#define DIFFICULTY_HARD  2u

/* In: the front intact module the column map gave the band column a shot
 * reached, and that column (S4a-ii's spark). */
uint8_t boss_hit_module;
uint8_t boss_hit_cell;
/* Out, after boss_c_hit: a module whose damage stage changed and what to add
 * to each of its cells' codes; a destroyed module (its score, the kill, its
 * bay look, its columns rebuilt); the modules the kill exposed (their open
 * looks). Each NONE or 0 when nothing happened. */
uint8_t boss_stage_module;
uint8_t boss_stage_add;
uint8_t boss_score_module;
uint8_t boss_newly_lo;
uint8_t boss_newly_hi;
/* Out, after boss_c_tick: the module whose turn to fire it is and the column
 * offset from its centre (a salvo's -1, 0, +1; the ASM spawns the shot), the
 * module the chain blasts this frame, or NONE; nonzero once the chain and its
 * hold are over (the ASM hands off). The modules the exposure check exposed
 * this frame are boss_newly_lo/hi (their open looks). */
uint8_t boss_fire_module;
uint8_t boss_fire_offset;
uint8_t boss_blast;
uint8_t boss_handoff;
/* The fight's length in frames, from the engagement to the defeat. */
uint8_t boss_clock_lo;
uint8_t boss_clock_hi;

uint8_t boss_phase;
uint8_t boss_count;
uint8_t boss_hp[BOSS_MAX_MODULES];
uint8_t boss_crack[BOSS_MAX_MODULES];
uint8_t boss_break[BOSS_MAX_MODULES];
uint8_t boss_stage[BOSS_MAX_MODULES];
/* The kind after the tier conversion: a capped emitter reads ARMOUR. */
uint8_t boss_kind[BOSS_MAX_MODULES];
uint8_t boss_alive_lo;
uint8_t boss_alive_hi;
uint8_t boss_exposed_lo;
uint8_t boss_exposed_hi;
/* Alive, exposed weapons with a reload: the modules the countdown serves. */
uint8_t boss_armed_lo;
uint8_t boss_armed_hi;
uint8_t boss_weapons_left;
uint8_t boss_countdown;
uint8_t boss_cursor;
/* Nonzero on the frame the exposure check ran: the ASM leaves that frame's
 * queued draw for the next one (plan §5.15.7). */
uint8_t boss_heavy;
/* A kill asks for the exposure check on the tick of the next frame
 * (§5.15.6 item 2): 2 on the kill, counted down by each tick - the kill
 * frame's own tick leaves it at 1. */
uint8_t boss_expose_pending;
/* A salvo launcher's burst: shots still to fire, one a frame, and its module. */
static uint8_t boss_burst_left;
static uint8_t boss_burst_module;
static uint8_t boss_timer;
static uint8_t boss_chain_left;
static uint8_t boss_chain_next;
static uint8_t boss_start_lo;
static uint8_t boss_start_hi;
static uint8_t boss_adjust;
static uint8_t boss_enabled;
static uint8_t boss_i;
static uint8_t boss_n;
static uint8_t boss_record;
static uint8_t boss_value;
static uint8_t boss_quarter;
static uint8_t boss_bit_lo;
static uint8_t boss_bit_hi;
/* The modules not yet exposed (boss_expose's list). */
static uint8_t boss_hidden[BOSS_MAX_MODULES];
static uint8_t boss_hidden_count;
static uint8_t boss_t;
static uint8_t boss_u;

/* Nonzero when module boss_n's bit is set in the 16-bit mask (lo, hi): two
 * byte ANDs on plain globals, so cc65 needs no temporary of its own. */
#define MASK_HAS(lo, hi) (boss_t = (lo), boss_t &= boss_bit_lo, boss_u = (hi), \
    boss_u &= boss_bit_hi, (uint8_t)(boss_t | boss_u))

static const uint8_t boss_bit_table[8] = { 0x01u, 0x02u, 0x04u, 0x08u, 0x10u, 0x20u, 0x40u, 0x80u };

/* boss_n -> boss_bit_lo/hi, its bit in a 16-bit module mask. */
static void boss_bit_of(void)
{
    if (boss_n < 8u) {
        boss_bit_lo = boss_bit_table[boss_n];
        boss_bit_hi = 0u;
    } else {
        boss_bit_lo = 0u;
        boss_bit_hi = (boss_bit_table - 8)[boss_n];
    }
}

/* boss_n -> boss_record, its record's offset in the module table (x 12). */
static void boss_record_of(void)
{
    boss_record = (uint8_t)(boss_n << 2);
    boss_record = (uint8_t)(boss_record + (uint8_t)(boss_record << 1));
}

/* boss_value scaled by boss_adjust quarters (owner answer Q-B3: the
 * per-difficulty scale in boss_def, -2..+2 quarters, by shift). */
static void boss_scale(void)
{
    boss_quarter = (uint8_t)(boss_value >> 2);
    if (boss_adjust == 2u || boss_adjust == 0xFEu) {
        boss_quarter <<= 1;
    }
    if (boss_adjust == 1u || boss_adjust == 2u) {
        boss_value += boss_quarter;
    } else if (boss_adjust == 0xFFu || boss_adjust == 0xFEu) {
        boss_value -= boss_quarter;
    }
}

/* Every live module not yet exposed whose cover is all destroyed becomes
 * exposed now (decisions A, F): its open look is drawn and, a weapon with a
 * reload, it joins the modules the countdown serves. It walks only the list
 * of modules still hidden (the fortress: four), dropping each one as it is
 * exposed or destroyed - cc65 spends ~90 native cycles a module on a loop,
 * so a pass over all sixteen would cost the worst frame ~1,900 (plan
 * §5.15.7). Run at the install and on the tick after a kill. */
static void boss_expose(void)
{
    boss_i = 0u;
    while (boss_i != boss_hidden_count) {
        boss_n = boss_hidden[boss_i];
        if (boss_hp[boss_n] == 0u) {
            goto drop;
        }
        boss_record_of();
        boss_value = FIELD(BOSS_M_COVER_LO)[boss_record];
        boss_value &= boss_alive_lo;
        if (boss_value != 0u) {
            ++boss_i;
            continue;
        }
        boss_value = FIELD(BOSS_M_COVER_HI)[boss_record];
        boss_value &= boss_alive_hi;
        if (boss_value != 0u) {
            ++boss_i;
            continue;
        }
        boss_bit_of();
        boss_exposed_lo |= boss_bit_lo;
        boss_exposed_hi |= boss_bit_hi;
        boss_newly_lo |= boss_bit_lo;
        boss_newly_hi |= boss_bit_hi;
        if (boss_kind[boss_n] != BOSS_KIND_ARMOUR && FIELD(BOSS_M_RELOAD)[boss_record] != 0u) {
            boss_armed_lo |= boss_bit_lo;
            boss_armed_hi |= boss_bit_hi;
        }
drop:
        --boss_hidden_count;
        boss_t = boss_hidden[boss_hidden_count];
        boss_hidden[boss_i] = boss_t;
    }
}

/* Once, from the install, BEFORE the column map is built (§5.13.5: the map's
 * alive test reads these hit points): every module's hit points, thresholds
 * and kind - the tier's emitter slots enabled, the rest capped armour - the
 * first exposure, the countdown, the clock's start. */
void boss_c_init(void)
{
    boss_count = TABLE[BOSS_T_MODULE_COUNT];
    boss_value = boss_difficulty[0];
    boss_adjust = (boss_def + BOSS_DEF_HP_SCALE)[boss_value];
    /* Decision 8 enables 1 / 2 / 4 emitter slots on levels 1-4 / 5-8 / 9-12:
     * slot D's laser_tier sets the count from the level id before this init
     * runs (M5b-S4b; a debug fixture build overrides it there). */
    boss_enabled = boss_laser_slots[0];
    boss_alive_lo = 0u;
    boss_alive_hi = 0u;
    boss_exposed_lo = 0u;
    boss_exposed_hi = 0u;
    boss_armed_lo = 0u;
    boss_armed_hi = 0u;
    boss_newly_lo = 0u;
    boss_newly_hi = 0u;
    boss_weapons_left = 0u;
    for (boss_n = 0u; boss_n != boss_count; ++boss_n) {
        boss_bit_of();
        boss_record_of();
        boss_alive_lo |= boss_bit_lo;
        boss_alive_hi |= boss_bit_hi;
        boss_stage[boss_n] = 0u;
        boss_value = FIELD(BOSS_M_KIND)[boss_record];
        boss_i = (uint8_t)(boss_value & 0x0Fu);
        boss_value = (uint8_t)(boss_value >> 4);
        if (boss_i == BOSS_KIND_EMITTER && boss_value > boss_enabled) {
            boss_i = BOSS_KIND_ARMOUR;
            boss_value = TABLE[BOSS_T_CAPPED_HP];
            boss_scale();
            boss_hp[boss_n] = boss_value;
            boss_value = TABLE[BOSS_T_CAPPED_CRACKED];
            boss_scale();
            boss_crack[boss_n] = boss_value;
            boss_value = TABLE[BOSS_T_CAPPED_BROKEN];
        } else {
            boss_value = FIELD(BOSS_M_HP)[boss_record];
            boss_scale();
            boss_hp[boss_n] = boss_value;
            boss_value = FIELD(BOSS_M_HP_CRACKED)[boss_record];
            boss_scale();
            boss_crack[boss_n] = boss_value;
            boss_value = FIELD(BOSS_M_HP_BROKEN)[boss_record];
        }
        boss_scale();
        boss_break[boss_n] = boss_value;
        if (boss_hp[boss_n] == 0u) {
            boss_hp[boss_n] = 1u;
        }
        boss_kind[boss_n] = boss_i;
        if (boss_i != BOSS_KIND_ARMOUR) {
            ++boss_weapons_left;
        }
        boss_hidden[boss_n] = boss_n;
    }
    boss_hidden_count = boss_count;
    /* Everything is alive: a module is exposed now when it has no cover. */
    boss_expose();
    boss_newly_lo = 0u;
    boss_newly_hi = 0u;
    boss_expose_pending = 0u;
    boss_burst_left = 0u;
    boss_fire_offset = 0u;
    boss_phase = PHASE_FIGHT;
    boss_blast = NONE;
    boss_handoff = 0u;
    boss_fire_module = NONE;
    boss_stage_module = NONE;
    boss_score_module = NONE;
    boss_countdown = TABLE[BOSS_T_FIRE_COOLDOWN];
    boss_cursor = (uint8_t)(boss_count - 1u);
    boss_start_lo = boss_active_frame[0];
    boss_start_hi = boss_active_frame[1];
}

/* A player shot reached the band in a column whose front intact module is
 * boss_hit_module. A covered module absorbs it (no damage, and not a hit for
 * the accuracy stat - owner answer Q-B7); an exposed one loses a hit point,
 * may change its damage stage, and at 0 is destroyed: the kill may expose the
 * modules behind it (checked on the next tick), and the last weapon's kill is
 * the defeat (decision A). Returns 1 when a module was damaged. */
uint8_t boss_c_hit(void)
{
    boss_stage_module = NONE;
    boss_score_module = NONE;
    if (boss_phase != PHASE_FIGHT) {
        return 0u;
    }
    boss_n = boss_hit_module;
    if (boss_hp[boss_n] == 0u) {
        return 0u;
    }
    boss_bit_of();
    if (MASK_HAS(boss_exposed_lo, boss_exposed_hi) == 0u) {
        return 0u;
    }
    boss_value = (uint8_t)(boss_hp[boss_n] - 1u);
    boss_hp[boss_n] = boss_value;
    if (boss_value != 0u) {
        /* The stage the hit points read now: 0 intact, 1 cracked, 2 broken. */
        boss_i = 0u;
        if (boss_value <= boss_break[boss_n]) {
            boss_i = 2u;
        } else if (boss_value <= boss_crack[boss_n]) {
            boss_i = 1u;
        }
        boss_t = boss_stage[boss_n];
        if (boss_i != boss_t) {
            boss_value = TABLE[BOSS_T_STAGE_STEP];
            boss_t = (uint8_t)(boss_i - boss_t);
            if (boss_t == 2u) {
                boss_value <<= 1;
            }
            boss_stage_add = boss_value;
            boss_stage[boss_n] = boss_i;
            boss_stage_module = boss_n;
        }
        return 1u;
    }
    boss_score_module = boss_n;
    boss_alive_lo &= (uint8_t)~boss_bit_lo;
    boss_alive_hi &= (uint8_t)~boss_bit_hi;
    boss_armed_lo &= (uint8_t)~boss_bit_lo;
    boss_armed_hi &= (uint8_t)~boss_bit_hi;
    if (boss_kind[boss_n] != BOSS_KIND_ARMOUR) {
        --boss_weapons_left;
        if (boss_weapons_left == 0u) {
            /* The win (plan §5.6): the chain starts on the next frame, the
             * fight's clock stops here, and the level's boss bonus goes to the
             * summary, which adds it to the score with the tier bonus. */
            boss_phase = PHASE_CHAIN;
            boss_timer = 0u;
            boss_chain_left = TABLE[BOSS_T_CHAIN_BLASTS];
            boss_chain_next = 0u;
            boss_clock_lo = (uint8_t)(boss_active_frame[0] - boss_start_lo);
            boss_clock_hi = (uint8_t)(boss_active_frame[1] - boss_start_hi);
            if (boss_active_frame[0] < boss_start_lo) {
                --boss_clock_hi;
            }
            boss_stats_bonus[0] = boss_def[BOSS_DEF_BONUS_LO];
            boss_stats_bonus[1] = boss_def[BOSS_DEF_BONUS_HI];
            return 1u;
        }
    }
    boss_expose_pending = 2u;
    return 1u;
}

/* The next armed module after the cursor fires (the policy only in S4a-i:
 * boss_fire_module names it), and the countdown restarts from its reload -
 * EASY +1/2, HARD -1/4 - never under the region's cooldown. O(modules), once
 * a firing; the frame's own path stays O(1). */
static void boss_fire_next(void)
{
    boss_n = boss_cursor;
    do {
        ++boss_n;
        if (boss_n == boss_count) {
            boss_n = 0u;
        }
        boss_bit_of();
    } while (MASK_HAS(boss_armed_lo, boss_armed_hi) == 0u);
    boss_cursor = boss_n;
    boss_fire_module = boss_n;
    if (boss_kind[boss_n] == BOSS_KIND_SALVO) {
        /* Three shots on three frames, from the columns left of, at and
         * right of the launcher's centre (§5.13.2 item 6). */
        boss_fire_offset = 0xFFu;
        boss_burst_left = 2u;
        boss_burst_module = boss_n;
    }
    boss_record_of();
    boss_value = FIELD(BOSS_M_RELOAD)[boss_record];
    boss_t = boss_difficulty[0];
    if (boss_t == DIFFICULTY_EASY) {
        boss_quarter = (uint8_t)(boss_value >> 1);
        boss_value += boss_quarter;
    } else if (boss_t == DIFFICULTY_HARD) {
        boss_quarter = (uint8_t)(boss_value >> 2);
        boss_value -= boss_quarter;
    }
    if (boss_value < TABLE[BOSS_T_FIRE_COOLDOWN]) {
        boss_value = TABLE[BOSS_T_FIRE_COOLDOWN];
    }
    boss_countdown = boss_value;
}

/* Every frame: in the fight, the one countdown to the next firing module;
 * after the defeat, the chain's cadence - one blast every chainFrames frames,
 * walking the modules - then the hold, then the hand-off. */
void boss_c_tick(void)
{
    boss_blast = NONE;
    boss_fire_module = NONE;
    boss_fire_offset = 0u;
    boss_newly_lo = 0u;
    boss_newly_hi = 0u;
    boss_heavy = 0u;
    if (boss_phase == PHASE_FIGHT) {
        if (boss_expose_pending != 0u) {
            --boss_expose_pending;
            if (boss_expose_pending == 0u) {
                boss_expose();
                boss_heavy = 1u;
            }
        }
        if (boss_burst_left != 0u) {
            /* The salvo's next shot: one spawn a frame, the countdown waits. */
            boss_n = boss_burst_module;
            if (boss_hp[boss_n] == 0u) {
                boss_burst_left = 0u;
            } else {
                --boss_burst_left;
                boss_fire_module = boss_n;
                if (boss_burst_left == 0u) {
                    boss_fire_offset = 1u;
                }
                return;
            }
        }
        if ((uint8_t)(boss_armed_lo | boss_armed_hi) == 0u) {
            return;
        }
        --boss_countdown;
        if (boss_countdown == 0u) {
            boss_fire_next();
        }
        return;
    }
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
        if (boss_chain_next == boss_count) {
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
