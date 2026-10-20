/*
 * Void Strike 65 - the VOID LANCE's policy (M6, docs/plans/m6-void-lance.md;
 * owner decisions BD 1-6, 2026-10-20).
 *
 * The boss-only weapon: a lance in stock, the ship under a module a player
 * shot would hurt, FIRE held for 75 frames (1.5 s) - and one beam destroys
 * that one module. This file decides; src/hybrid/lance.s executes (the
 * reticle on P1, its HPOS, the fire gate, the beam in P0, the kill through
 * boss_hit) - C/ASM ownership, AGENTS.md.
 *
 * It lives in slot G, the lance's own boss run (the window's unclaimed tail,
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
extern uint8_t boss_exposed_lo;
extern uint8_t boss_exposed_hi;
/* In: boss_c_hit's own mailbox, which the lance's tick fills as UPDATE's shot
 * loop does - the front module the column map gives the band column under
 * the ship's centre (BOSS_COLUMN_ARMOUR / OPEN, or $FF for none, is >=
 * BOSS_MAX_MODULES). It is the target when the frame shows the reticle, and
 * the beam's module once fired (the tick does not aim while the beam is up,
 * and no shot meets the band then). */
extern uint8_t boss_hit_module;
extern const uint8_t boss_bit_table[];

#define PHASE_FIGHT          0u
#define LANCE_CHARGE_FRAMES  75u   /* 1.5 s at 50 Hz (decision BD 2) */
#define LANCE_STOCK_MAX      3u    /* decision BD: a stock of up to 3 */

/* What the frame does (src/hybrid/lance.s acts on it). */
/* bit 0: the reticle shown; bit 1: the ordinary fire waits (decision BD 2
 * (c)); bit 2: the beam fires. */
#define LANCE_NONE      0u   /* no target: the reticle off, the ordinary fire (decision BD 2 (b)) */
#define LANCE_SHOWN     1u   /* a target, FIRE released */
#define LANCE_BLINK     2u   /* a target, FIRE held: the blink's dark frame (two frames of four) */
#define LANCE_CHARGING  3u   /* a target, FIRE held */
#define LANCE_FIRE      6u   /* the charge complete: the beam, at boss_hit_module */

/* The stock: the build's grant at every boss entry (stage 1: 0 in the game,
 * a debug route's --lance-stock otherwise; the boss's capsules in stage 2). */
uint8_t lance_stock = LANCE_STOCK_GRANT;
/* Frames FIRE has been held over a target; 0 when not charging. */
uint8_t lance_charge;
/* In: TRIG0 this frame (0 while FIRE is held). */
uint8_t lance_trig;
static uint8_t lance_bit;

/* Every boss frame with a lance in stock and no beam up. A target is what a
 * player shot there would hurt - the column map's front module (an intact
 * one: a kill rebuilds its columns at once; the map already refuses armour,
 * open columns, the Bastion's covered cannons, its closed doors and the
 * Spine's powered field), in the fight, exposed - and never the core
 * (decision BD, §AE 1). The charge follows the ship's column (§4 (a)): it
 * keeps building while any target stays under the ship; without one, or with
 * FIRE released before the 75th frame, it is cancelled. */
uint8_t lance_c_aim(void)
{
    if (boss_hit_module >= BOSS_MAX_MODULES || boss_phase != PHASE_FIGHT ||
        boss_kind[boss_hit_module] == BOSS_KIND_CORE) {
        goto none;
    }
    if (boss_hit_module < 8u) {
        lance_bit = (uint8_t)(boss_exposed_lo & boss_bit_table[boss_hit_module]);
    } else {
        lance_bit = (uint8_t)(boss_exposed_hi & (boss_bit_table - 8)[boss_hit_module]);
    }
    if (lance_bit == 0u) {
none:
        lance_charge = 0u;
        return LANCE_NONE;
    }
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

/* The beam reached its module: the kill goes through the shot's own path
 * (boss_hit, boss_c_hit) with the module's HP at 1 - exactly one module.
 * Nothing can have destroyed it on the beam's way: no player shot flies
 * while the beam is up (the fire gate), and nothing else damages a module. */
void lance_c_arrive(void)
{
    boss_hp[boss_hit_module] = 1u;
}

/* One lance more, never over the stock's 3 (stage 2's boss capsule). */
void lance_c_give(void)
{
    if (lance_stock < LANCE_STOCK_MAX) {
        ++lance_stock;
    }
}
