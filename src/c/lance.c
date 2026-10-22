/*
 * Void Strike 65 - the VOID LANCE's policy (M6, docs/plans/m6-void-lance.md;
 * owner decisions BD 1-6, BF and BG, 2026-10-20).
 *
 * The boss-only weapon, charged by TIME (journal §BG): a meter fills over
 * LANCE_METER_FRAMES boss frames (1,250: 25 s on MEDIUM, scaled by the
 * difficulty as the boss's hit points are - x 3/4 on EASY, x 5/4 on HARD);
 * full, ONE lance is ready (no stacking). Then FIRE held with the stick held
 * up for LANCE_CHARGE_FRAMES, whatever is under the ship (journal §BH 1) -
 * and a torpedo fires only with a lock (§BO), otherwise waiting at full charge:
 * over a module a player shot would hurt it destroys that one module, and
 * only that kill empties the meter; with the module destroyed on the
 * torpedo's way, nothing is hit and the lance is kept (§BH 3). The
 * ordinary fire is never changed (journal §BE; the gesture, §BF); while the
 * charge builds the ship advances at 1 / LANCE_CHARGE_UP_DIVISOR of its speed
 * and moves sideways at full speed (journal §BL 4: src/hybrid/lance.s reads
 * lance_charge). The constants are scripts/lance-layout.mjs's, passed by
 * scripts/build.mjs. This file decides; src/hybrid/lance.s executes (the
 * readiness indicator, the target pick under the ship with its exposed bit,
 * the reticle on P1 while a lance is ready, the slow frames, the torpedo on
 * P1 / P2 and its explosion, the kill through boss_hit) - C/ASM ownership,
 * AGENTS.md.
 *
 * It lives in the lance's own boss run (the window's unclaimed tail,
 * allocated from $BBFF down), read from disk at every boss entry; its BSS is
 * inside the run and read as zeros, so every entry starts with an empty meter
 * and no charge (§BG 1: the meter resets at the boss entry, runs in the boss
 * sector only). Like the boss controller it uses no cc65 software stack and
 * no runtime zero page: no parameters, no locals, no arithmetic helpers (the
 * build checks).
 */
#include <stdint.h>

#include "boss-layout.h"

#pragma code-name ("LANCE_CODE")
#pragma rodata-name ("LANCE_CODE")
#pragma data-name ("LANCE_DATA")
#pragma bss-name ("LANCE_BSS")

/* The boss controller's state (src/c/boss.c, slot C). */
extern uint8_t boss_hp[];
extern uint8_t boss_kind[];
extern volatile uint8_t boss_difficulty[];     /* [0] DIFFICULTY_SETTING: 0 EASY .. 2 HARD */
/* In: the target (src/hybrid/lance.s fills it every frame with no torpedo):
 * the column map's front module under the ship's centre when it is exposed
 * (BOSS_COLUMN_ARMOUR / OPEN, $FF for none or covered, are >=
 * BOSS_MAX_MODULES); the torpedo's locked module once fired (no aim while it
 * flies). The tick copies it into boss_hit_module for boss_hit on the torpedo's
 * arrival frame. */
extern uint8_t lance_module;
#pragma zpsym ("lance_module")             /* the zero page's (src/hybrid/lance.s) */

/* LANCE_CHARGE_FRAMES: 75, 1.5 s at 50 Hz (decision BD 2) - from
 * scripts/lance-layout.mjs with the charge's speed divisor. */
#ifndef LANCE_CHARGE_FRAMES
#error "LANCE_CHARGE_FRAMES comes from scripts/build.mjs (scripts/lance-layout.mjs)"
#endif
/* LANCE_METER_EASY / _FRAMES / _HARD: the meter's length per difficulty
 * (decision BG 1), from scripts/lance-layout.mjs. */
#ifndef LANCE_METER_FRAMES
#error "LANCE_METER_FRAMES comes from scripts/build.mjs (scripts/lance-layout.mjs)"
#endif

/* What the frame does (src/hybrid/lance.s acts on it): bit 0 the reticle
 * lit (not the charge's blink's dark frames, two of four), bit 1 a target
 * under the ship (the crosshair at its centre; without, the hollow mark at
 * the ship's column - journal §BH 2), bit 2 the torpedo fires (with bit 1:
 * locked on lance_module, the lance spent by its kill; §BO never returns
 * FIRE without TARGET). */
#define LANCE_LIT       1u
#define LANCE_TARGET    2u
#define LANCE_FIRE      4u

/* The meter's length, per difficulty (two byte tables: cc65 indexes a
 * uint16_t table through a helper). */
static const uint8_t lance_full_lo[3] = {
    (uint8_t)LANCE_METER_EASY, (uint8_t)LANCE_METER_FRAMES, (uint8_t)LANCE_METER_HARD
};
static const uint8_t lance_full_hi[3] = {
    LANCE_METER_EASY >> 8, LANCE_METER_FRAMES >> 8, LANCE_METER_HARD >> 8
};
/* The meter: boss frames filled since the entry or the last shot. */
uint8_t lance_meter_lo;
uint8_t lance_meter_hi;
/* Charge frames: 0 idle, 1..49 charging, 50 fully charged while held and
 * unlocked (§BO). During the wait ASM uses frame_counter for movement parity. */
uint8_t lance_charge;
/* In: 0 while FIRE and the stick's up are both held this frame
 * (src/hybrid/lance.s). */
uint8_t lance_trig;
/* This frame's LANCE_TARGET or 0 (no locals: the boss link's C uses no
 * software stack). */
static uint8_t lance_target;

/* Every boss frame with no torpedo (decision BG 1): 1 - the meter is full,
 * a lance is ready; 0 - one frame more on the meter. */
uint8_t lance_c_fill(void)
{
    if (lance_meter_lo == lance_full_lo[boss_difficulty[0]] &&
        lance_meter_hi == lance_full_hi[boss_difficulty[0]]) {
        return 1u;
    }
    if (++lance_meter_lo == 0u) {
        ++lance_meter_hi;
    }
    return 0u;
}

/* Every boss frame with no torpedo while a lance is ready (the tick runs
 * none while the meter fills, the ship dies or the fight is over - so the
 * gesture does nothing then, decision BG 2). A target is what a player shot
 * there would hurt - the column map's front module, exposed (the tick's pick:
 * a kill rebuilds its columns at once; the map already refuses armour, open
 * columns, the Bastion's covered cannons, its closed doors and the Spine's
 * powered field), and never the core (decision BD, §AE 1); the tick passes
 * $FF for none. The charge builds whatever is under the ship and however
 * that changes (journal §BH 1: FIRE + UP held, level-triggered); only
 * releasing the gesture cancels it, including at full charge. At 50 frames
 * the target decides: one - launch locked; none - persist at 50 until a lock
 * or release (§BO). The HUD meter remains full until a successful kill. */
uint8_t lance_c_aim(void)
{
    lance_target = 0u;
    if (lance_module < BOSS_MAX_MODULES && boss_kind[lance_module] != BOSS_KIND_CORE) {
        lance_target = LANCE_TARGET;
    }
    if (lance_trig != 0u) {
        lance_charge = 0u;
        return lance_target | LANCE_LIT;
    }
    if (lance_charge != LANCE_CHARGE_FRAMES) {
        ++lance_charge;
    }
    if (lance_charge == LANCE_CHARGE_FRAMES) {
        if (lance_target == 0u) {
            return LANCE_LIT;              /* §BO: charged, waiting for a lock */
        }
        lance_charge = 0u;                   /* the torpedo fires: the kill spends the lance (§BL 5) */
        return LANCE_TARGET | LANCE_FIRE;    /* lock proved above */
    }
    return lance_target | (((lance_charge >> 1) & 1u) ^ LANCE_LIT);
}

/* The torpedo reached its locked module (lance_module): 1 - the kill goes
 * through the shot's own path (boss_hit, boss_c_hit) with the module's HP at
 * 1, exactly one module, and spends the lance - the meter emptied (journal
 * §BL 5: only a kill spends it); 0 - nothing to kill: a player shot destroyed
 * the module on the torpedo's way, and the lance is kept (§BH's rule). (After
 * the defeat boss_hit spends it as it spends a shot.) */
uint8_t lance_c_arrive(void)
{
    if (boss_hp[lance_module] == 0u) {
        return 0u;
    }
    boss_hp[lance_module] = 1u;
    lance_meter_lo = 0u;
    lance_meter_hi = 0u;
    return 1u;
}
