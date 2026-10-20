/*
 * Void Strike 65 - the VOID LANCE's policy (M6, docs/plans/m6-void-lance.md;
 * owner decisions BD 1-6, 2026-10-20).
 *
 * The boss-only weapon: a lance in stock, the ship under a module a player
 * shot would hurt, FIRE held with the stick held up for LANCE_CHARGE_FRAMES
 * (75: 1.5 s) - and one beam destroys that one module. The ordinary fire is
 * never changed (the owner's smoke of 2026-10-20, journal §BE; the gesture,
 * §BF); while the charge builds the ship moves at 1 / LANCE_CHARGE_SPEED_
 * DIVISOR of its speed (§BF 2: src/hybrid/lance.s reads lance_charge). Both
 * constants are scripts/lance-layout.mjs's, side by side, passed by
 * scripts/build.mjs. This file decides; src/hybrid/lance.s executes (the
 * target pick under the ship with its exposed bit, the reticle on P1, its
 * HPOS, the slow frames, the beam in P0, the kill through boss_hit) - C/ASM
 * ownership, AGENTS.md.
 *
 * It lives in the lance's own boss run (the window's unclaimed tail,
 * allocated from $BBFF down), read from disk at every boss entry; its BSS is
 * inside the run and read as zeros, so every entry starts with no charge.
 * Like the boss controller it uses no cc65 software stack and no runtime zero
 * page: no parameters, no locals, no arithmetic helpers (the build checks).
 */
#include <stdint.h>

#include "boss-layout.h"

#pragma code-name ("LANCE_CODE")
#pragma rodata-name ("LANCE_CODE")
#pragma data-name ("LANCE_DATA")
#pragma bss-name ("LANCE_BSS")

/* The boss controller's state (src/c/boss.c, slot C). */
extern uint8_t boss_phase;
extern uint8_t boss_hp[];
extern uint8_t boss_kind[];
/* In: the target (src/hybrid/lance.s fills it every frame with no beam up):
 * the column map's front module under the ship's centre when it is exposed
 * (BOSS_COLUMN_ARMOUR / OPEN, $FF for none or covered, are >=
 * BOSS_MAX_MODULES); the beam's module once fired (no aim while the beam is
 * up). The tick copies it into boss_hit_module for boss_hit on the beam's
 * arrival frame. */
extern uint8_t lance_module;

#define PHASE_FIGHT          0u
/* LANCE_CHARGE_FRAMES: 75, 1.5 s at 50 Hz (decision BD 2) - from
 * scripts/lance-layout.mjs with the charge's speed divisor. */
#ifndef LANCE_CHARGE_FRAMES
#error "LANCE_CHARGE_FRAMES comes from scripts/build.mjs (scripts/lance-layout.mjs)"
#endif
/* Decision BD: a stock of up to 3 - stage 2's capsule enforces it when it
 * gives one (its lance_c_give left this run for its bytes, 2026-10-20). */
#define LANCE_STOCK_MAX      3u

/* What the frame does (src/hybrid/lance.s acts on it): bit 0 the reticle
 * shown, bit 2 the beam fires. */
#define LANCE_NONE      0u   /* no target: the reticle off (decision BD 2 (b)) */
#define LANCE_SHOWN     1u   /* a target, the gesture released */
#define LANCE_BLINK     2u   /* a target, the gesture held: the blink's dark frame (two frames of four) */
#define LANCE_CHARGING  3u   /* a target, the gesture held */
#define LANCE_FIRE      4u   /* the charge complete: the beam, at lance_module */

/* The stock: the build's grant at every boss entry (stage 1: 0 in the game,
 * a debug route's --lance-stock otherwise; the boss's capsules in stage 2). */
uint8_t lance_stock = LANCE_STOCK_GRANT;
/* Frames the gesture has been held over a target; 0 when not charging (the
 * ship's full speed, src/hybrid/lance.s). */
uint8_t lance_charge;
/* In: 0 while FIRE and the stick's up are both held this frame
 * (src/hybrid/lance.s). */
uint8_t lance_trig;

/* Every boss frame with a lance in stock and no beam up. A target is what a
 * player shot there would hurt - the column map's front module, exposed (the
 * tick's pick: a kill rebuilds its columns at once; the map already refuses
 * armour, open columns, the Bastion's covered cannons, its closed doors and
 * the Spine's powered field), in the fight - and never the core (decision BD,
 * §AE 1). The charge follows the ship's column (§4 (a)): it keeps building
 * while any target stays under the ship; without one, or with the gesture
 * released before the last frame, it is cancelled. */
uint8_t lance_c_aim(void)
{
    if (lance_module < BOSS_MAX_MODULES && boss_phase == PHASE_FIGHT &&
        boss_kind[lance_module] != BOSS_KIND_CORE) {
        if (lance_trig != 0u) {
            lance_charge = 0u;
            return LANCE_SHOWN;
        }
        ++lance_charge;
        if (lance_charge == LANCE_CHARGE_FRAMES) {
            lance_charge = 0u;
            --lance_stock;
            return LANCE_FIRE;
        }
        return (uint8_t)(((lance_charge >> 1) & 1u) ^ LANCE_CHARGING);
    }
    lance_charge = 0u;
    return LANCE_NONE;
}

/* The beam reached its module (lance_module): 1 - the kill goes through
 * the shot's own path (boss_hit, boss_c_hit) with the module's HP at 1,
 * exactly one module; 0 - nothing to kill: the player's shots fly while the
 * beam is up, and one destroyed the module on the beam's way. The lance is
 * spent either way. (After the defeat boss_hit spends it as it spends a
 * shot.) */
uint8_t lance_c_arrive(void)
{
    if (boss_hp[lance_module] != 0u) {
        boss_hp[lance_module] = 1u;
    }
    return boss_hp[lance_module];
}
