#ifndef VOID_STRIKE_65_ENEMY_ARCHETYPE_H
#define VOID_STRIKE_65_ENEMY_ARCHETYPE_H

#include <stdint.h>

typedef struct EnemyArchetype {
    uint8_t hit_points;
    uint8_t movement_behavior_id;
    uint8_t fire_policy_id;
    uint8_t burst_count;
    uint8_t burst_interval_frames;
    uint8_t post_burst_easy_frames;
    uint8_t post_burst_medium_frames;
    uint8_t post_burst_hard_frames;
    uint8_t renderer_class;
    uint8_t weapon_class;
    uint8_t score_bcd;
    uint8_t director_value;
} EnemyArchetype;

enum {
    ENEMY_ARCHETYPE_RAIDER = 0,
    ENEMY_ARCHETYPE_LIGHT_WINGMAN = 1,
    ENEMY_ARCHETYPE_COUNT = 2
};

enum {
    ENEMY_MOVEMENT_RAIDER_CROSS_PURSUIT = 0,
    ENEMY_MOVEMENT_WINGMAN_FOLLOW = 1,
    ENEMY_FIRE_RAIDER_PAIR_BURST = 1,
    ENEMY_FIRE_SINGLE_SHOT = 2,
    ENEMY_RENDERER_TWO_HEAVY_PMG = 1,
    ENEMY_RENDERER_CHARACTER_2X1 = 2,
    ENEMY_WEAPON_RED_PAIRSHOT = 1
};

extern const EnemyArchetype enemy_archetypes[ENEMY_ARCHETYPE_COUNT];

/* One Light Wingman. C owns lifecycle, HP, position and fire policy; the
 * ASM renderer owns only the screen/backing cache and scratch bytes, whose
 * render cache C clears solely at game initialization. */
extern volatile uint8_t light_state;
extern volatile uint8_t light_hp;
extern volatile uint8_t light_x;
extern volatile uint8_t light_y;
extern volatile uint8_t light_fire_timer;
extern volatile uint8_t light_leaderless;
extern volatile uint8_t light_screen_lo;
extern volatile uint8_t light_screen_hi;
extern volatile uint8_t light_backing0;
extern volatile uint8_t light_backing1;
extern volatile uint8_t light_scratch;
extern volatile uint8_t light_slot_save;

extern volatile uint8_t enemy_profile_movement_id;
extern volatile uint8_t enemy_profile_fire_policy_id;
extern volatile uint8_t enemy_profile_burst_count;
extern volatile uint8_t enemy_profile_burst_interval;
extern volatile uint8_t enemy_profile_post_burst_frames;
extern volatile uint8_t enemy_profile_renderer_class;
extern volatile uint8_t enemy_profile_weapon_class;
extern volatile uint8_t enemy_profile_score_bcd;
extern volatile uint8_t enemy_profile_director_value;

#endif
