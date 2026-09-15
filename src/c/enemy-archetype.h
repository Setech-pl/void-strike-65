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
    ENEMY_ARCHETYPE_COUNT = 1
};

enum {
    ENEMY_MOVEMENT_RAIDER_CROSS_PURSUIT = 0,
    ENEMY_FIRE_RAIDER_PAIR_BURST = 1,
    ENEMY_RENDERER_TWO_HEAVY_PMG = 1,
    ENEMY_WEAPON_RED_PAIRSHOT = 1
};

extern const EnemyArchetype enemy_archetypes[ENEMY_ARCHETYPE_COUNT];

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
