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
    ENEMY_ARCHETYPE_INTERCEPTOR = 2,
    ENEMY_ARCHETYPE_BOMBER = 3,
    ENEMY_ARCHETYPE_COUNT = 4
};

/* Byte offset of a record inside enemy_archetypes[]. The Light slot and the
 * Heavy formation name their selected archetype this way so C and ASM can both
 * index the table with one 8-bit register; nothing hardcodes a record index. */
#define ENEMY_ARCHETYPE_RECORD_BYTES 12u
#define ENEMY_ARCHETYPE_OFFSET(index) ((index) * ENEMY_ARCHETYPE_RECORD_BYTES)

enum {
    ENEMY_ARCHETYPE_FIELD_HIT_POINTS = 0,
    ENEMY_ARCHETYPE_FIELD_MOVEMENT = 1,
    ENEMY_ARCHETYPE_FIELD_FIRE_POLICY = 2,
    ENEMY_ARCHETYPE_FIELD_BURST_COUNT = 3,
    ENEMY_ARCHETYPE_FIELD_BURST_INTERVAL = 4,
    ENEMY_ARCHETYPE_FIELD_POST_BURST = 5,
    ENEMY_ARCHETYPE_FIELD_RENDERER = 8,
    ENEMY_ARCHETYPE_FIELD_WEAPON = 9,
    ENEMY_ARCHETYPE_FIELD_SCORE = 10,
    ENEMY_ARCHETYPE_FIELD_DIRECTOR_VALUE = 11
};

enum {
    ENEMY_MOVEMENT_RAIDER_CROSS_PURSUIT = 0,
    ENEMY_MOVEMENT_WINGMAN_FOLLOW = 1,
    ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT = 2,
    ENEMY_MOVEMENT_BOMBER_LANE_SWEEP = 3,
    ENEMY_FIRE_RAIDER_PAIR_BURST = 1,
    ENEMY_FIRE_SINGLE_SHOT = 2,
    ENEMY_FIRE_LIGHT_DOUBLE_TAP = 3,
    ENEMY_RENDERER_TWO_HEAVY_PMG = 1,
    ENEMY_RENDERER_CHARACTER_2X1 = 2,
    /* Projectile colour and shape belong to the weapon class, never to the
     * emitter's hull colour (owner decision 19). ASM publishes class c at
     * glyphs 89+c / 99+c and moves it at the class step rate authored in
     * assets/graphics/fighter-weapons.json (BOMBER: half speed). */
    ENEMY_WEAPON_PULSE = 1,
    ENEMY_WEAPON_LASER = 2,
    ENEMY_WEAPON_BOMBER = 3
};

/* One object, two views: the records are the authored data, the flat byte view
 * is how the Light slot (and ASM) reach the selected record through a single
 * 8-bit offset without a runtime pointer. */
typedef union EnemyArchetypeTable {
    EnemyArchetype record[ENEMY_ARCHETYPE_COUNT];
    uint8_t byte[ENEMY_ARCHETYPE_COUNT * ENEMY_ARCHETYPE_RECORD_BYTES];
} EnemyArchetypeTable;

extern const EnemyArchetypeTable enemy_archetypes;

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
/* Selected Light archetype (byte offset into enemy_archetypes[]) and the
 * remaining shots of the current burst. ASM reads the offset to score a kill. */
extern volatile uint8_t light_archetype_offset;
extern volatile uint8_t light_burst_left;
extern volatile uint8_t light_target_x;
extern volatile uint8_t light_post_burst_slot;

/* Selected Heavy formation archetype (byte offset into enemy_archetypes[]).
 * One archetype per formation: both P1/P2 members share it (roadmap 4.5c). */
extern volatile uint8_t heavy_archetype_offset;
/* GTIA hull colour of the current Heavy formation; ASM writes it to COLPM1/2. */
extern volatile uint8_t heavy_hull_colour;
extern volatile uint8_t encounter_heavy_index;
extern volatile uint8_t heavy_member_x;
extern volatile uint8_t heavy_member_y;
extern volatile uint8_t heavy_member_direction;
extern volatile uint8_t heavy_member_fire_timer;
extern volatile uint8_t heavy_member_turn_timer;

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
