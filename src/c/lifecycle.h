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
/* PROVISIONAL standalone Interceptor wave (plan §2.4), once per frame. */
void enemy_c_light_wave(void);

#endif
