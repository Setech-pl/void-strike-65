#ifndef VOID_STRIKE_65_LIFECYCLE_H
#define VOID_STRIKE_65_LIFECYCLE_H

#include <stdint.h>

enum SectorLifecycleState {
    SECTOR_CAPITAL_ENGINES = 0,
    SECTOR_CAPITAL_AFT = 1,
    SECTOR_CAPITAL_COMBAT = 2,
    SECTOR_CAPITAL_FORWARD = 3,
    SECTOR_CAPITAL_PROW = 4,
    SECTOR_CAPITAL_DRAIN = 5,
    SECTOR_CAPITAL_COMPLETE = 6,
    SECTOR_FIGHTER = 7,
    SECTOR_BOSS_FUTURE = 8
};

void lifecycle_c_init(void);
/* Roadmap 4.3 step 5: the drained-playfield predicate, shared by the capital
 * entry and (roadmap 4.9) the level boundary. */
uint8_t sector_c_drain_clear(void);
uint8_t sector_c_update_first_capital(void);
void sector_c_update_capital_phase(void);
void sector_c_begin_complete(void);
void sector_c_complete_scroll_tick(void);
uint8_t sector_c_force_final_drain(void);
void enemy_c_spawn_raiders(void);
uint8_t enemy_c_retire_member(void);
uint8_t enemy_c_apply_pending_damage(void);
void enemy_c_recycle(void);
uint8_t enemy_c_heavy_tick(void);
uint8_t enemy_c_light_tick(void);
uint8_t enemy_c_light_hit(void);
/* The Heavy break-up's token claim (plan-4.6-placement.md §7.4 variant 2). It
 * lives in the arena with the rest of the Heavy's C and calls the gate wrapper
 * in the window, which is why that wrapper is declared here too rather than
 * staying static. */
uint8_t light_take_deferrable_token(void);
uint8_t enemy_c_heavy_breakup_claim(void);
/* The armed Light wave's stepper, once per frame (plan §2.2). */
void enemy_c_light_wave(void);

/* Roadmap 4.6 step 2: the armed Light wave, written by director_c_try_event
 * from the WaveDef the cursor names and spent by the stepper in the code
 * window. light_wave_lock is also read by ASM through
 * _asm_director_can_allocate: a Heavy formation is refused while it is up. */
extern volatile uint8_t light_wave_lock;
extern uint8_t light_wave_remaining;
extern uint8_t light_wave_timer;
extern uint8_t light_wave_entry;
extern uint8_t light_wave_archetype;
extern uint8_t light_wave_spacing_frames;
/* Roadmap 4.6 step 5 (docs/plans/director-4.6.md §8.3): the armed wave's look,
 * published by director_c_try_event for BOTH classes - a Light wave's members
 * and a Heavy wave's escort wear it. 0 is the archetype's own art; a payload
 * look is $80 | slot << 4 ($90, $A0, $B0). */
extern uint8_t light_wave_look;
/* The Heavy formation the Director selected, consumed by
 * enemy_c_spawn_raiders and published to GTIA by the ABI veneer. */
extern volatile uint8_t heavy_archetype_offset;

#endif
