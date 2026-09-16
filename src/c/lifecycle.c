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
#define PLAYER_X                 U8_AT(0x0080u)

/* Light Wingman formation (owner smoke 2026-09-15): centred behind Heavy
 * slot 0 at a fixed offset, never switching sides. The Heavy is 16 HPOS wide
 * with no left inset and 14 lines tall; the Light is 8 x 8. Its left edge is
 * (16 - 8) / 2 past the leader X, rounded to the nearest 4-HPOS ANTIC cell,
 * and clamped to the last two-cell start, 48 + (40 - 2) * 4. It trails 8 + 4
 * lines above (enemies fly down). It retires before the recycled bottom ring
 * row, which the late-published Light must never occupy. */
/* The selected Light record: a constant field base indexed by the C-owned
 * record offset. Keeping the offset a plain lvalue is what makes cc65 emit
 * `lda enemy_archetypes+field,y` instead of building a runtime pointer. */
#define LIGHT_FIELD(field) \
    ((&enemy_archetypes.byte[field])[light_archetype_offset])
#define LIGHT_OFFSET_WINGMAN     ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_LIGHT_WINGMAN)
#define LIGHT_OFFSET_INTERCEPTOR ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_INTERCEPTOR)
#define LIGHT_CENTRE_OFFSET      4u
#define LIGHT_ROUND              2u
#define LIGHT_X_LAST             200u
#define LIGHT_LAG_Y              12u
#define LIGHT_FIRE_TOP           24u
#define LIGHT_FIRE_BOTTOM        224u
#define LIGHT_RETIRE_Y           232u
/* Interceptor: no leader, no formation. It descends twice as fast as a Heavy
 * and closes on the player's column one four-HPOS cell on every other frame,
 * which averages the player's own maximum horizontal speed. Both bounds and
 * the entry column are four-aligned, so stepping can never leave the ring. */
#define LIGHT_X_FIRST            48u
#define LIGHT_X_ENTRY            124u
#define LIGHT_X_STEP             4u
#define INTERCEPTOR_DESCENT      2u
#define INTERCEPTOR_TRACK_PHASE  2u
#define ENCOUNTER_LIGHT_SCHEDULE_LENGTH 2u

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

const EnemyArchetypeTable enemy_archetypes = { {
    {
        1u,
        ENEMY_MOVEMENT_RAIDER_CROSS_PURSUIT,
        ENEMY_FIRE_RAIDER_PAIR_BURST,
        5u, 15u,
        60u, 50u, 40u,
        ENEMY_RENDERER_TWO_HEAVY_PMG,
        ENEMY_WEAPON_PULSE,
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
        ENEMY_WEAPON_PULSE,
        0x05u,
        1u
    },
    {
        1u,
        ENEMY_MOVEMENT_INTERCEPTOR_PURSUIT,
        ENEMY_FIRE_LIGHT_DOUBLE_TAP,
        1u, 0u,
        56u, 44u, 32u,
        ENEMY_RENDERER_CHARACTER_2X1,
        ENEMY_WEAPON_LASER,
        0x15u,
        1u
    }
} };

typedef char enemy_archetype_must_remain_twelve_bytes[
    sizeof(EnemyArchetype) == 12u ? 1 : -1
];

/* PROVISIONAL smoke scheduling only, not a gameplay contract. The Light slot
 * itself has no ordering rule (see enemy_c_spawn_raiders); this table exists
 * only so a smoke run demonstrates the Wingman first and the Interceptor
 * next, repeating. Roadmap step 4.6 (Director-owned wave composition)
 * replaces this table and its counter. */
static const uint8_t encounter_light_schedule[ENCOUNTER_LIGHT_SCHEDULE_LENGTH] = {
    LIGHT_OFFSET_WINGMAN,
    LIGHT_OFFSET_INTERCEPTOR
};

#pragma bss-name ("HYBRID_ENCOUNTER_STATE")
/* PROVISIONAL smoke scheduling counter; see encounter_light_schedule above. */
volatile uint8_t encounter_light_index;
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
volatile uint8_t light_screen_lo;
volatile uint8_t light_screen_hi;
volatile uint8_t light_backing0;
volatile uint8_t light_backing1;
volatile uint8_t light_scratch;
volatile uint8_t light_slot_save;
volatile uint8_t light_archetype_offset;
volatile uint8_t light_burst_left;
volatile uint8_t light_target_x;
volatile uint8_t light_post_burst_slot;
#pragma bss-name ("BSS")

static void publish_raider_profile(void)
{
    enemy_profile_movement_id = enemy_archetypes.record[0].movement_behavior_id;
    enemy_profile_fire_policy_id = enemy_archetypes.record[0].fire_policy_id;
    enemy_profile_burst_count = enemy_archetypes.record[0].burst_count;
    enemy_profile_burst_interval = enemy_archetypes.record[0].burst_interval_frames;
    enemy_profile_post_burst_frames =
        (&enemy_archetypes.record[0].post_burst_easy_frames)[DIFFICULTY_SETTING];
    enemy_profile_renderer_class = enemy_archetypes.record[0].renderer_class;
    enemy_profile_weapon_class = enemy_archetypes.record[0].weapon_class;
    enemy_profile_score_bcd = enemy_archetypes.record[0].score_bcd;
    enemy_profile_director_value = enemy_archetypes.record[0].director_value;
}

/* Reload the selected Light archetype's post-burst pause for this difficulty.
 * The three per-difficulty fields are adjacent, so one 8-bit index reaches
 * both the archetype record and the difficulty column. */
static void light_reload(void)
{
    light_fire_timer =
        (&enemy_archetypes.byte[ENEMY_ARCHETYPE_FIELD_POST_BURST])[light_post_burst_slot];
}

/* PROVISIONAL smoke scheduling only (see encounter_light_schedule above).
 * The only writer of light_archetype_offset: the reusable Light admission
 * below only reads it and holds no ordering or toggle logic of its own. */
static void encounter_light_schedule_advance(void)
{
    light_archetype_offset = encounter_light_schedule[encounter_light_index];
    ++encounter_light_index;
    if (encounter_light_index >= ENCOUNTER_LIGHT_SCHEDULE_LENGTH) {
        encounter_light_index = 0u;
    }
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
    light_burst_left = 0u;
    encounter_light_index = 0u;
    light_screen_hi = 0u;       /* the rebuilt playfield has no Light backing */
    publish_raider_profile();
}

/* Sector-state transitions run from the reusable resident window $8602-$86F9
 * (step 4.3), which frees the contiguous HYBRID_C_EXT tail for Light-class
 * growth. The code itself is unchanged; only its placement moved. */
#pragma code-name (push, "HYBRID_C_SECTOR")
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
    /* Capital frames skip the fighter publication window, so the Light must
     * also be unpublished (its late erase done) before the sector leaves. */
    if (asm_sector_pressure_active() != 0u || light_state != ENEMY_INACTIVE ||
        light_screen_hi != 0u ||
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
#pragma code-name (pop)

void enemy_c_spawn_raiders(void)
{
    ENEMY_ARCHETYPE = ENEMY_ARCHETYPE_RAIDER;
    ENEMY_HP_0 = enemy_archetypes.record[0].hit_points;
    ENEMY_HP_1 = enemy_archetypes.record[0].hit_points;
    ENEMY_MEMBER_STATE_0 = ENEMY_ACTIVE_STATE;
    ENEMY_MEMBER_STATE_1 = ENEMY_ACTIVE_STATE;
    ENEMY_LIVE_COUNT = RAIDER_SLOT_COUNT;
    ENEMY_ACTIVE = ENEMY_ACTIVE_STATE;
    /* The formation admission also admits one Light for Heavy slot 0, the
     * archetype named by the provisional schedule below. A Light still
     * descending from an earlier formation keeps its lifecycle. */
    if (light_state == ENEMY_INACTIVE) {
        encounter_light_schedule_advance();
        /* Difficulty is fixed for a game and the archetype for a life, so the
         * post-burst column is resolved once here and stays a plain index. */
        light_post_burst_slot =
            (uint8_t)(light_archetype_offset + DIFFICULTY_SETTING);
        light_state = ENEMY_ACTIVE_STATE;
        light_hp = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_HIT_POINTS);
        light_burst_left = 0u;
        light_y = 0u;
        if (light_archetype_offset == LIGHT_OFFSET_WINGMAN) {
            light_leaderless = 0u;      /* takes its leader's column and lag */
        } else {
            light_leaderless = 1u;      /* no leader, ever: free-flying hunter */
            light_x = LIGHT_X_ENTRY;
        }
        light_reload();
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

/* Once per gameplay frame. Returns the selected record's weapon class (never
 * zero) when the Light fires, 0 otherwise; ASM tags the shot with it. */
uint8_t enemy_c_light_tick(void)
{
    if (light_state == ENEMY_INACTIVE) {
        return 0u;
    }
    if (CAPITAL_SECTOR_STATE != SECTOR_FIGHTER) {
        light_state = ENEMY_INACTIVE;       /* fighter-only lifecycle */
        return 0u;
    }
    if (light_leaderless == 0u && ENEMY_MEMBER_STATE_0 != ENEMY_ACTIVE_STATE) {
        light_leaderless = 1u;
    }
    if (light_leaderless != 0u) {
        /* Free flight. A Wingman that lost its leader drifts straight down at
         * the Heavy descent rate; an Interceptor is born free-flying, descends
         * at twice that rate and closes on the player's column one four-HPOS
         * cell every other frame, which averages the player's own maximum
         * horizontal speed. PLAYER_X_MIN equals LIGHT_X_FIRST, so only the
         * upper bound needs clamping, exactly as the formation branch does. */
        ++light_y;
        if (light_archetype_offset != LIGHT_OFFSET_WINGMAN) {
            ++light_y;
            if ((light_y & INTERCEPTOR_TRACK_PHASE) == 0u) {
                light_target_x = (uint8_t)(PLAYER_X & 0xFCu);
                if (light_target_x > LIGHT_X_LAST) {
                    light_target_x = LIGHT_X_LAST;
                }
                if (light_x < light_target_x) {
                    light_x = (uint8_t)(light_x + LIGHT_X_STEP);
                } else if (light_x > light_target_x) {
                    light_x = (uint8_t)(light_x - LIGHT_X_STEP);
                }
            }
        }
        if (light_y >= LIGHT_RETIRE_Y) {
            light_state = ENEMY_INACTIVE;
            return 0u;
        }
    } else {
        light_x = (uint8_t)((ENEMY_X_0 + LIGHT_CENTRE_OFFSET + LIGHT_ROUND) & 0xFCu);
        if (light_x > LIGHT_X_LAST) {
            light_x = LIGHT_X_LAST;
        }
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
    if (light_burst_left == 0u) {
        light_burst_left = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_BURST_COUNT);
    }
    --light_burst_left;
    if (light_burst_left != 0u) {
        light_fire_timer = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_BURST_INTERVAL);
    } else {
        light_reload();
    }
    return LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_WEAPON);
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
