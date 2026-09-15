#include "lifecycle.h"
#include "enemy-archetype.h"

#pragma code-name ("HYBRID_C_EXT")
#pragma rodata-name ("ENEMY_ARCHETYPE_DATA")

#define U8_AT(address) (*(volatile uint8_t*)(address))

#define DIFFICULTY_SETTING       U8_AT(0x4E70u)
#define CAPITAL_SECTOR_STATE     U8_AT(0x4EA5u)
#define ACTIVE_GAMEPLAY_FRAME_LO U8_AT(0x4FF8u)
#define ACTIVE_GAMEPLAY_FRAME_HI U8_AT(0x4FF9u)
#define CORRIDOR_PHASE_LO        U8_AT(0x008Cu)
#define CORRIDOR_PHASE_HI        U8_AT(0x85EFu)
#define ENTITY_SPAWN_TIMER_LO    U8_AT(0x8003u)
#define ENTITY_SPAWN_TIMER_HI    U8_AT(0x8004u)
#define DIRECTOR_STATE_FLAGS     U8_AT(0x80FEu)

#define ENEMY_ARCHETYPE          U8_AT(0x4ECBu)
#define ENEMY_ACTIVE             U8_AT(0x4ECDu)
#define ENEMY_MEMBER_STATE_0     U8_AT(0x5470u)
#define ENEMY_MEMBER_STATE_1     U8_AT(0x5471u)
#define ENEMY_HP_0               U8_AT(0x5472u)
#define ENEMY_HP_1               U8_AT(0x5473u)
#define ENEMY_PENDING_DAMAGE_0   U8_AT(0x5474u)
#define ENEMY_PENDING_DAMAGE_1   U8_AT(0x5475u)
#define ENEMY_TARGET_SLOT        U8_AT(0x5486u)
#define ENEMY_LIVE_COUNT         U8_AT(0x5489u)
#define ENEMY_X_0                U8_AT(0x5478u)
#define ENEMY_Y_0                U8_AT(0x547Au)
#define PLAYER_LIFECYCLE         U8_AT(0x4EAAu)

/* Light Wingman formation: leader is Heavy slot 0. The wingman keeps a
 * 4-HPOS gap on one side and switches side only at a corridor edge. */
#define LIGHT                    enemy_archetypes[ENEMY_ARCHETYPE_LIGHT_WINGMAN]
#define LIGHT_RIGHT_OFFSET       20u
#define LIGHT_LEFT_OFFSET        12u
#define LIGHT_X_MIN              84u
#define LIGHT_X_MAX              164u
#define LIGHT_LAG_Y              12u
#define LIGHT_FIRE_TOP           24u
#define LIGHT_FIRE_BOTTOM        224u
#define LIGHT_RETIRE_Y           240u

#define ENEMY_INACTIVE           0u
#define ENEMY_ACTIVE_STATE       1u
#define ENEMY_EXPLODING_STATE    2u
#define RAIDER_SLOT_COUNT        2u
#define FIRST_CAPITAL_FRAME      600u
#define PLAYFIELD_RING_ROWS      27u
#define ENTITY_INITIAL_DELAY     32u
#define DIRECTOR_FLAG_COMPLETE   0x01u
#define DIRECTOR_FLAG_CAPITAL_ADMITTED 0x40u
#define DIRECTOR_FLAG_CAPITAL_DUE      0x80u

extern uint8_t asm_sector_pressure_active(void);

const EnemyArchetype enemy_archetypes[ENEMY_ARCHETYPE_COUNT] = {
    {
        1u,
        ENEMY_MOVEMENT_RAIDER_CROSS_PURSUIT,
        ENEMY_FIRE_RAIDER_PAIR_BURST,
        5u, 15u,
        60u, 50u, 40u,
        ENEMY_RENDERER_TWO_HEAVY_PMG,
        ENEMY_WEAPON_RED_PAIRSHOT,
        0x10u,
        1u
    },
    {
        1u,
        ENEMY_MOVEMENT_WINGMAN_FOLLOW,
        ENEMY_FIRE_SINGLE_SHOT,
        1u, 0u,
        96u, 80u, 64u,
        ENEMY_RENDERER_CHARACTER_2X1,
        ENEMY_WEAPON_RED_PAIRSHOT,
        0x05u,
        1u
    }
};

typedef char enemy_archetype_must_remain_twelve_bytes[
    sizeof(EnemyArchetype) == 12u ? 1 : -1
];

#pragma bss-name ("HYBRID_C_STATE")
volatile uint8_t enemy_profile_movement_id;
volatile uint8_t enemy_profile_fire_policy_id;
volatile uint8_t enemy_profile_burst_count;
volatile uint8_t enemy_profile_burst_interval;
volatile uint8_t enemy_profile_post_burst_frames;
volatile uint8_t enemy_profile_renderer_class;
volatile uint8_t enemy_profile_weapon_class;
volatile uint8_t enemy_profile_score_bcd;
volatile uint8_t enemy_profile_director_value;
#pragma bss-name ("HYBRID_LIGHT_STATE")
volatile uint8_t light_state;
volatile uint8_t light_hp;
volatile uint8_t light_x;
volatile uint8_t light_y;
volatile uint8_t light_fire_timer;
volatile uint8_t light_leaderless;
volatile uint8_t light_side;
volatile uint8_t light_screen_lo;
volatile uint8_t light_screen_hi;
volatile uint8_t light_backing0;
volatile uint8_t light_backing1;
volatile uint8_t light_scratch;
volatile uint8_t light_slot_save;
#pragma bss-name ("BSS")

static void publish_raider_profile(void)
{
    enemy_profile_movement_id = enemy_archetypes[0].movement_behavior_id;
    enemy_profile_fire_policy_id = enemy_archetypes[0].fire_policy_id;
    enemy_profile_burst_count = enemy_archetypes[0].burst_count;
    enemy_profile_burst_interval = enemy_archetypes[0].burst_interval_frames;
    if (DIFFICULTY_SETTING == 0u) {
        enemy_profile_post_burst_frames = enemy_archetypes[0].post_burst_easy_frames;
    } else if (DIFFICULTY_SETTING == 1u) {
        enemy_profile_post_burst_frames = enemy_archetypes[0].post_burst_medium_frames;
    } else {
        enemy_profile_post_burst_frames = enemy_archetypes[0].post_burst_hard_frames;
    }
    enemy_profile_renderer_class = enemy_archetypes[0].renderer_class;
    enemy_profile_weapon_class = enemy_archetypes[0].weapon_class;
    enemy_profile_score_bcd = enemy_archetypes[0].score_bcd;
    enemy_profile_director_value = enemy_archetypes[0].director_value;
}

void lifecycle_c_init(void)
{
    CAPITAL_SECTOR_STATE = SECTOR_FIGHTER;
    ENEMY_ARCHETYPE = ENEMY_ARCHETYPE_RAIDER;
    ENEMY_ACTIVE = ENEMY_INACTIVE;
    ENEMY_MEMBER_STATE_0 = ENEMY_INACTIVE;
    ENEMY_MEMBER_STATE_1 = ENEMY_INACTIVE;
    ENEMY_HP_0 = 0u;
    ENEMY_HP_1 = 0u;
    ENEMY_LIVE_COUNT = 0u;
    light_state = ENEMY_INACTIVE;
    light_screen_hi = 0u;       /* the rebuilt playfield has no Light backing */
    publish_raider_profile();
}

uint8_t sector_c_update_first_capital(void)
{
    if ((DIRECTOR_STATE_FLAGS & DIRECTOR_FLAG_CAPITAL_DUE) == 0u) {
        if ((DIRECTOR_STATE_FLAGS & DIRECTOR_FLAG_CAPITAL_ADMITTED) != 0u) {
            return 0u;
        }
        if (ACTIVE_GAMEPLAY_FRAME_HI < (FIRST_CAPITAL_FRAME >> 8)) {
            return 0u;
        }
        if (ACTIVE_GAMEPLAY_FRAME_HI == (FIRST_CAPITAL_FRAME >> 8) &&
            ACTIVE_GAMEPLAY_FRAME_LO < (FIRST_CAPITAL_FRAME & 0xFFu)) {
            return 0u;
        }
        DIRECTOR_STATE_FLAGS = DIRECTOR_FLAG_CAPITAL_DUE;
    }
    if (asm_sector_pressure_active() != 0u || light_state != ENEMY_INACTIVE ||
        CAPITAL_SECTOR_STATE != SECTOR_FIGHTER) {
        return 0u;
    }
    CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_ENGINES;
    DIRECTOR_STATE_FLAGS >>= 1;
    return 1u;
}

void sector_c_update_capital_phase(void)
{
    if (CORRIDOR_PHASE_HI == 0u) {
        if (CORRIDOR_PHASE_LO < 32u) {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_ENGINES;
        } else if (CORRIDOR_PHASE_LO < 112u) {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_AFT;
        } else {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_COMBAT;
        }
    } else if (CORRIDOR_PHASE_HI == 1u) {
        if (CORRIDOR_PHASE_LO < 112u) {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_COMBAT;
        } else if (CORRIDOR_PHASE_LO < 192u) {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_FORWARD;
        } else if (CORRIDOR_PHASE_LO < 232u) {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_PROW;
        } else {
            CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_DRAIN;
        }
    } else {
        CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_DRAIN;
    }
}

void sector_c_begin_complete(void)
{
    ENTITY_SPAWN_TIMER_HI = PLAYFIELD_RING_ROWS;
    CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_COMPLETE;
}

void sector_c_complete_scroll_tick(void)
{
    if ((DIRECTOR_STATE_FLAGS & DIRECTOR_FLAG_COMPLETE) != 0u) {
        return;
    }
    --ENTITY_SPAWN_TIMER_HI;
    if (ENTITY_SPAWN_TIMER_HI == 0u) {
        CAPITAL_SECTOR_STATE = SECTOR_FIGHTER;
        ENTITY_SPAWN_TIMER_LO = ENTITY_INITIAL_DELAY;
    }
}

uint8_t sector_c_force_final_drain(void)
{
    if ((DIRECTOR_STATE_FLAGS & DIRECTOR_FLAG_COMPLETE) == 0u ||
        CAPITAL_SECTOR_STATE == SECTOR_CAPITAL_COMPLETE) {
        return 0u;
    }
    CAPITAL_SECTOR_STATE = SECTOR_CAPITAL_DRAIN;
    return 1u;
}

void enemy_c_spawn_raiders(void)
{
    ENEMY_ARCHETYPE = ENEMY_ARCHETYPE_RAIDER;
    ENEMY_HP_0 = enemy_archetypes[0].hit_points;
    ENEMY_HP_1 = enemy_archetypes[0].hit_points;
    ENEMY_MEMBER_STATE_0 = ENEMY_ACTIVE_STATE;
    ENEMY_MEMBER_STATE_1 = ENEMY_ACTIVE_STATE;
    ENEMY_LIVE_COUNT = RAIDER_SLOT_COUNT;
    ENEMY_ACTIVE = ENEMY_ACTIVE_STATE;
    /* The formation admission also admits one wingman for Heavy slot 0. A
     * wingman still descending from an earlier formation keeps its lifecycle. */
    if (light_state == ENEMY_INACTIVE) {
        light_state = ENEMY_ACTIVE_STATE;
        light_hp = LIGHT.hit_points;
        light_leaderless = 0u;
        light_side = LIGHT_RIGHT_OFFSET;
        light_y = 0u;
        light_fire_timer = (&LIGHT.post_burst_easy_frames)[DIFFICULTY_SETTING];
    }
}

uint8_t enemy_c_retire_member(void)
{
    if (ENEMY_TARGET_SLOT == 0u) {
        ENEMY_MEMBER_STATE_0 = ENEMY_INACTIVE;
    } else {
        ENEMY_MEMBER_STATE_1 = ENEMY_INACTIVE;
    }
    --ENEMY_LIVE_COUNT;
    return ENEMY_LIVE_COUNT;
}

uint8_t enemy_c_apply_pending_damage(void)
{
    if (ENEMY_TARGET_SLOT == 0u) {
        if (ENEMY_MEMBER_STATE_0 != ENEMY_ACTIVE_STATE) {
            return 0u;
        }
        if (ENEMY_HP_0 > ENEMY_PENDING_DAMAGE_0) {
            ENEMY_HP_0 = (uint8_t)(ENEMY_HP_0 - ENEMY_PENDING_DAMAGE_0);
            return 0u;
        }
        ENEMY_MEMBER_STATE_0 = ENEMY_INACTIVE;
        ENEMY_HP_0 = 0u;
    } else {
        if (ENEMY_MEMBER_STATE_1 != ENEMY_ACTIVE_STATE) {
            return 0u;
        }
        if (ENEMY_HP_1 > ENEMY_PENDING_DAMAGE_1) {
            ENEMY_HP_1 = (uint8_t)(ENEMY_HP_1 - ENEMY_PENDING_DAMAGE_1);
            return 0u;
        }
        ENEMY_MEMBER_STATE_1 = ENEMY_INACTIVE;
        ENEMY_HP_1 = 0u;
    }
    --ENEMY_LIVE_COUNT;
    if (ENEMY_LIVE_COUNT == 0u) {
        ENEMY_ACTIVE = ENEMY_EXPLODING_STATE;
    }
    return 1u;
}

void enemy_c_recycle(void)
{
    ENEMY_ACTIVE = ENEMY_INACTIVE;
}

/* Once per gameplay frame. Returns 1 when the single-shot policy fires. */
uint8_t enemy_c_light_tick(void)
{
    if (light_state == ENEMY_INACTIVE) {
        return 0u;
    }
    if (CAPITAL_SECTOR_STATE != SECTOR_FIGHTER) {
        light_state = ENEMY_INACTIVE;       /* fighter-only lifecycle */
        return 0u;
    }
    if (ENEMY_MEMBER_STATE_0 != ENEMY_ACTIVE_STATE) {
        light_leaderless = 1u;
    }
    if (light_leaderless != 0u) {
        /* Leader lost: continue straight down until recycled. */
        if (++light_y >= LIGHT_RETIRE_Y) {
            light_state = ENEMY_INACTIVE;
            return 0u;
        }
    } else {
        /* light_side is the signed formation offset. Switching only beyond
         * these leader positions gives edge-only hysteresis. */
        if (ENEMY_X_0 > LIGHT_X_MAX - LIGHT_RIGHT_OFFSET) {
            light_side = (uint8_t)(0u - LIGHT_LEFT_OFFSET);
        } else if (ENEMY_X_0 < LIGHT_X_MIN + LIGHT_LEFT_OFFSET) {
            light_side = LIGHT_RIGHT_OFFSET;
        }
        light_x = (uint8_t)((ENEMY_X_0 + light_side) & 0xFCu);
        if (ENEMY_Y_0 < LIGHT_LAG_Y) {
            light_y = 0u;
        } else {
            light_y = (uint8_t)(ENEMY_Y_0 - LIGHT_LAG_Y);
        }
    }
    if (light_fire_timer != 0u) {
        --light_fire_timer;
        return 0u;
    }
    if (light_y < LIGHT_FIRE_TOP || light_y >= LIGHT_FIRE_BOTTOM ||
        (PLAYER_LIFECYCLE & 1u) != 0u) {
        return 0u;
    }
    light_fire_timer = (&LIGHT.post_burst_easy_frames)[DIFFICULTY_SETTING];
    return 1u;
}

/* One damage unit from a player PairShot or contact. ASM calls this only for
 * an active Light, whose HP is therefore at least one. Returns 1 when lethal. */
uint8_t enemy_c_light_hit(void)
{
    if (--light_hp != 0u) {
        return 0u;
    }
    light_state = ENEMY_INACTIVE;
    return 1u;
}
