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
    /* Bomber attack run (roadmap 4.5d): brake, charge, burst_count shells
     * burst_interval frames apart, then post_burst reload. C-owned; the ASM
     * Raider burst controller runs only for ENEMY_FIRE_RAIDER_PAIR_BURST. */
    ENEMY_FIRE_HEAVY_SALVO = 4,
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

/* Light-class slots (plan-light-multiplicity.md §2.1). C owns lifecycle, HP,
 * position, appearance and fire policy; the ASM renderer owns only the
 * screen/backing cache and the scratch bytes, whose render cache C clears
 * solely at game initialization.
 *
 * Structure of arrays, four slots, indexed by the shared light_slot: ASM sets
 * it before each call and C indexes every array with it. LIGHT_SLOT_COUNT
 * is the declared FORMAT; how many slots a sector may fill is a separate
 * ceiling. The backing is one CELL-MAJOR array of
 * LIGHT_SLOT_COUNT * LIGHT_CELL_COUNT bytes, because the erase and render
 * loops index it by cell; the slot selects the base. */
#define LIGHT_SLOT_COUNT_ABI     4u
#define LIGHT_CELL_COUNT_ABI     2u
extern volatile uint8_t light_slot;
extern uint8_t light_state[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_hp[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_x[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_y[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_fire_timer[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_screen_lo[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_screen_hi[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_backing[LIGHT_SLOT_COUNT_ABI * LIGHT_CELL_COUNT_ABI];
extern volatile uint8_t light_scratch;
extern volatile uint8_t light_slot_save;
/* Selected Light archetype per slot (byte offset into enemy_archetypes[]),
 * the slot's left screen code, and the remaining shots of the current burst.
 * ASM reads the offset to score a kill. */
extern uint8_t light_archetype[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_code[LIGHT_SLOT_COUNT_ABI];
extern uint8_t light_burst_left[LIGHT_SLOT_COUNT_ABI];
extern volatile uint8_t light_target_x;

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
/* Sixth per-slot byte ($5482/$5483, MANEUVER_TIMER, unused by the Bomber
 * motion): last seen HP | hit-flash frames left << 4. */
extern volatile uint8_t heavy_member_aux;
/* Colour C derives for the ticked member; ASM writes it to COLPM1+slot. */
extern volatile uint8_t heavy_member_colour;

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
