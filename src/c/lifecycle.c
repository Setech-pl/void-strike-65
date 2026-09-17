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
#define FRAME_COUNTER            U8_AT(0x0086u)

#define ENEMY_ARCHETYPE          U8_AT(0x4ECBu)
#define ENEMY_ACTIVE             U8_AT(0x4ECDu)
#define ENEMY_MEMBER_STATE_0     U8_AT(0x5470u)
#define ENEMY_MEMBER_STATE_1     U8_AT(0x5471u)
#define ENEMY_HP_0               U8_AT(0x5472u)
#define ENEMY_HP_1               U8_AT(0x5473u)
#define ENEMY_HP_0_ADDRESS       ((volatile uint8_t*)0x5472u)
#define ENEMY_PENDING_DAMAGE_0   U8_AT(0x5474u)
#define ENEMY_PENDING_DAMAGE_1   U8_AT(0x5475u)
#define ENEMY_TARGET_SLOT        U8_AT(0x5486u)
#define ENEMY_LIVE_COUNT         U8_AT(0x5489u)
#define ENEMY_X_0                U8_AT(0x5478u)
#define ENEMY_Y_0                U8_AT(0x547Au)
/* The Heavy member being ticked; ASM sets it before each member update. */
#define HEAVY_SLOT               ENEMY_TARGET_SLOT
/* First of the twelve per-slot Heavy bytes $5478-$5483 (X, Y, VELOCITY_X,
 * MOVE_ACCUMULATOR, MANEUVER_STATE, MANEUVER_TIMER; two slots each). */
#define HEAVY_SLOT_STATE         (&ENEMY_X_0)
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
#define HEAVY_FIELD(field) \
    ((&enemy_archetypes.byte[field])[heavy_archetype_offset])
#define HEAVY_OFFSET_RAIDER      ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_RAIDER)
#define HEAVY_OFFSET_BOMBER      ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_BOMBER)
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

/* Heavy formation presentation: the roster shape is the ASM PMG art index
 * (build/enemy-roster.inc): 0 is the Raider art, 2 SCYTHE_BOMBER (QUAD). */
#define ROSTER_SHAPE_RAIDER      0u
#define ROSTER_SHAPE_BOMBER      2u
#define HULL_COLOUR_RAIDER       0x44u
#define HULL_COLOUR_BOMBER       0x24u
#define ENCOUNTER_HEAVY_SCHEDULE_LENGTH 2u
#define HEAVY_PROFILE_BYTES      9u
#define HEAVY_SLOT_STATE_LAST    11u
/* Bomber lane sweep (owner decision 20). X is the left edge of a 32-HPOS QUAD
 * hull; the lanes keep an 8-HPOS gap at their closest (92 + 32 = 124 < 132)
 * and the right lane ends flush with the playfield (176 + 32 = 208). */
#define BOMBER_TURN_FLIP         0xFEu
#define BOMBER_TURN_MIN          24u
#define BOMBER_TURN_SPREAD       0x1Fu
#define BOMBER_FIRE_TOP          24u
#define BOMBER_FIRE_BOTTOM       200u
/* Roadmap 4.5d attack run: when its reload expires inside the fire band a
 * Bomber brakes (X and Y freeze), charges for BOMBER_AIM_FRAMES with its hull
 * brightened, fires the record's burst_count shells burst_interval frames
 * apart from the same column, then resumes the sweep in a fresh direction.
 * The phase needs no extra byte: an odd direction (1 / $FF) is the sweep, 0
 * is the attack; during the attack the turn timer counts down to the next
 * shell and the fire timer holds the shells left. */
#define BOMBER_ATTACK            0u
#define BOMBER_AIM_FRAMES        20u
#define BOMBER_CHARGE_LUMA       4u
/* Hit flash: the sixth per-slot byte packs the last seen HP (low nibble) and
 * the flash frames left (high nibble); a lower HP restarts the flash. */
#define BOMBER_FLASH_FRAMES      6u
#define BOMBER_FLASH_STEP        0x10u
#define BOMBER_FLASH_LUMA        6u
#define BOMBER_HP_MASK           0x0Fu

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
#define PLAYER_DYING_OR_OVER     0x01u

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
    },
    {
        4u,
        ENEMY_MOVEMENT_BOMBER_LANE_SWEEP,
        ENEMY_FIRE_HEAVY_SALVO,
        2u, 8u,
        64u, 52u, 40u,
        ENEMY_RENDERER_TWO_HEAVY_PMG,
        ENEMY_WEAPON_BOMBER,
        0x50u,
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
/* TEMPORARY 4.5 HEAVY SMOKE SCHEDULER counter; see encounter_heavy_schedule. */
volatile uint8_t encounter_heavy_index;
#pragma bss-name ("HYBRID_HEAVY_STATE")
volatile uint8_t heavy_archetype_offset;
volatile uint8_t heavy_hull_colour;
/* The ticked member, marshalled by ASM from and back to its slot's bytes in
 * $5478-$5481 around enemy_c_heavy_tick (same order as those arrays). */
volatile uint8_t heavy_member_x;
volatile uint8_t heavy_member_y;
volatile uint8_t heavy_member_direction;
volatile uint8_t heavy_member_fire_timer;
volatile uint8_t heavy_member_turn_timer;
volatile uint8_t heavy_member_aux;
/* cc65 stores an indexed lvalue with `sta abs,y` only when the value is a
 * plain load; arithmetic in place builds a runtime pointer (ptr1). */
static uint8_t heavy_scratch;
static uint8_t heavy_index;
/* GTIA colour of the ticked member; ASM writes it to COLPM1+slot. */
volatile uint8_t heavy_member_colour;
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

static void heavy_publish_profile(void);

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
    ENEMY_ACTIVE = ENEMY_INACTIVE;
    ENEMY_MEMBER_STATE_0 = ENEMY_INACTIVE;
    ENEMY_MEMBER_STATE_1 = ENEMY_INACTIVE;
    ENEMY_HP_0 = 0u;
    ENEMY_HP_1 = 0u;
    ENEMY_LIVE_COUNT = 0u;
    light_state = ENEMY_INACTIVE;
    light_burst_left = 0u;
    encounter_light_index = 0u;
    encounter_heavy_index = 0u;
    light_screen_hi = 0u;       /* the rebuilt playfield has no Light backing */
    ENEMY_ARCHETYPE = ROSTER_SHAPE_RAIDER;
    heavy_archetype_offset = HEAVY_OFFSET_RAIDER;
    heavy_hull_colour = HULL_COLOUR_RAIDER;
    heavy_publish_profile();
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

/* The Light escort admission of a Heavy formation. A Light still descending
 * from an earlier formation keeps its lifecycle. */
static void encounter_light_admit(void)
{
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
    /* With no Heavy on screen P1/P2 colour only the capital broadside missiles
     * M1/M2 (PRIOR 0): give them back the Raider faction colour. */
    heavy_hull_colour = HULL_COLOUR_RAIDER;
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

/* Heavy formation data and policy (roadmap 4.5c), placed in the reusable
 * runtime arena $7BD0-$7F0F (4.5M-M3). */
#pragma code-name ("HYBRID_C_ARENA")
#pragma rodata-name ("HYBRID_C_ARENA_RODATA")

/* TEMPORARY 4.5 HEAVY SMOKE SCHEDULER — replaced by 4.6 data-driven Encounter
 * Director. The schedule cycles Raider, Bomber, Raider... only so a smoke run
 * shows both; nothing in the Heavy lifecycle, the Bomber handler or the
 * renderer depends on this order. Each column is per-formation data: record,
 * PMG art and hull colour (owner smoke may retune the Bomber's art or colour
 * as data). The escort column is provisional wave policy, not a Bomber rule:
 * a 4.6 WaveDef may give a Bomber formation a Light escort. */
static const uint8_t encounter_heavy_archetype[ENCOUNTER_HEAVY_SCHEDULE_LENGTH] = {
    HEAVY_OFFSET_RAIDER, HEAVY_OFFSET_BOMBER
};
static const uint8_t encounter_heavy_roster_shape[ENCOUNTER_HEAVY_SCHEDULE_LENGTH] = {
    ROSTER_SHAPE_RAIDER, ROSTER_SHAPE_BOMBER
};
static const uint8_t encounter_heavy_hull_colour[ENCOUNTER_HEAVY_SCHEDULE_LENGTH] = {
    HULL_COLOUR_RAIDER, HULL_COLOUR_BOMBER
};
static const uint8_t encounter_heavy_light_escort[ENCOUNTER_HEAVY_SCHEDULE_LENGTH] = {
    1u, 0u
};

/* Record field of each enemy_profile_* byte, in their declared order. */
static const uint8_t heavy_profile_fields[HEAVY_PROFILE_BYTES] = {
    ENEMY_ARCHETYPE_FIELD_MOVEMENT, ENEMY_ARCHETYPE_FIELD_FIRE_POLICY,
    ENEMY_ARCHETYPE_FIELD_BURST_COUNT, ENEMY_ARCHETYPE_FIELD_BURST_INTERVAL,
    ENEMY_ARCHETYPE_FIELD_POST_BURST, ENEMY_ARCHETYPE_FIELD_RENDERER,
    ENEMY_ARCHETYPE_FIELD_WEAPON, ENEMY_ARCHETYPE_FIELD_SCORE,
    ENEMY_ARCHETYPE_FIELD_DIRECTOR_VALUE
};

/* Lane-sweep formation start, $5478-$5483 by slot: X, Y, direction, first
 * fire delay, first turn delay, hit-flash byte (last HP 4, no flash). Slot 0
 * starts left moving right, slot 1 mirrored right moving left; slot 1 also
 * fires 24 frames later. */
static const uint8_t bomber_formation_start[HEAVY_SLOT_STATE_LAST + 1u] = {
    48u, 176u,
    0u, 0u,
    1u, 0xFFu,
    48u, 72u,
    60u, 52u,
    4u, 4u
};
/* Per slot: lane bounds, and the depth to which the member enters at one line
 * per frame before cruising at one line every other frame. Slot 1 slows early,
 * so it trails slot 0 vertically and the pair is never phase-locked. */
static const uint8_t bomber_lane_first[RAIDER_SLOT_COUNT] = { 48u, 132u };
static const uint8_t bomber_lane_last[RAIDER_SLOT_COUNT] = { 92u, 176u };
static const uint8_t bomber_entry_depth[RAIDER_SLOT_COUNT] = { 40u, 16u };

/* Publish the derived profile of the selected Heavy record: the ASM kernel
 * reads its score, weapon cadence, movement and renderer. */
static void heavy_publish_profile(void)
{
    heavy_index = HEAVY_PROFILE_BYTES - 1u;
    do {
        heavy_scratch = (uint8_t)(heavy_profile_fields[heavy_index] + heavy_archetype_offset);
        heavy_scratch = enemy_archetypes.byte[heavy_scratch];
        (&enemy_profile_movement_id)[heavy_index] = heavy_scratch;
    } while (heavy_index-- != 0u);
    heavy_scratch = (uint8_t)(heavy_archetype_offset + DIFFICULTY_SETTING);
    enemy_profile_post_burst_frames =
        (&enemy_archetypes.byte[ENEMY_ARCHETYPE_FIELD_POST_BURST])[heavy_scratch];
}

/* Heavy formation admission: one archetype for both P1/P2 members. ASM has
 * already placed the Raider start state; a lane sweep replaces it. */
void enemy_c_spawn_raiders(void)
{
    heavy_archetype_offset = encounter_heavy_archetype[encounter_heavy_index];
    ENEMY_ARCHETYPE = encounter_heavy_roster_shape[encounter_heavy_index];
    heavy_hull_colour = encounter_heavy_hull_colour[encounter_heavy_index];
    heavy_publish_profile();
    ENEMY_HP_0 = HEAVY_FIELD(ENEMY_ARCHETYPE_FIELD_HIT_POINTS);
    ENEMY_HP_1 = ENEMY_HP_0;
    ENEMY_MEMBER_STATE_0 = ENEMY_ACTIVE_STATE;
    ENEMY_MEMBER_STATE_1 = ENEMY_ACTIVE_STATE;
    ENEMY_LIVE_COUNT = RAIDER_SLOT_COUNT;
    ENEMY_ACTIVE = ENEMY_ACTIVE_STATE;
    if (enemy_profile_movement_id == ENEMY_MOVEMENT_BOMBER_LANE_SWEEP) {
        heavy_index = HEAVY_SLOT_STATE_LAST;
        do {
            heavy_scratch = bomber_formation_start[heavy_index];
            HEAVY_SLOT_STATE[heavy_index] = heavy_scratch;
        } while (heavy_index-- != 0u);
    }
    if (encounter_heavy_light_escort[encounter_heavy_index] != 0u) {
        encounter_light_admit();
    }
    ++encounter_heavy_index;
    if (encounter_heavy_index >= ENCOUNTER_HEAVY_SCHEDULE_LENGTH) {
        encounter_heavy_index = 0u;
    }
}

static void bomber_turn(void)
{
    heavy_member_direction ^= BOMBER_TURN_FLIP;
    heavy_member_turn_timer = (uint8_t)((FRAME_COUNTER & BOMBER_TURN_SPREAD) + BOMBER_TURN_MIN);
}

/* Hull colour of the ticked member: the formation colour, brightened while
 * it charges an attack, brighter still for a few frames after a hit. Uses
 * heavy_index only: heavy_scratch carries the tick's return value. */
static void bomber_colour(void)
{
    heavy_index = ENEMY_HP_0_ADDRESS[HEAVY_SLOT];
    if (heavy_index != (heavy_member_aux & BOMBER_HP_MASK)) {
        heavy_member_aux = (uint8_t)(heavy_index | (BOMBER_FLASH_FRAMES << 4));
    }
    heavy_member_colour = heavy_hull_colour;
    if (heavy_member_aux >= BOMBER_FLASH_STEP) {
        heavy_member_aux -= BOMBER_FLASH_STEP;
        heavy_member_colour += BOMBER_FLASH_LUMA;
    } else if (heavy_member_direction == BOMBER_ATTACK) {
        heavy_member_colour += BOMBER_CHARGE_LUMA;
    }
}

/* Fire gates shared by the attack start and every shell of the salvo. */
static uint8_t bomber_may_fire(void)
{
    return heavy_member_y >= BOMBER_FIRE_TOP && heavy_member_y <= BOMBER_FIRE_BOTTOM &&
        (PLAYER_LIFECYCLE & PLAYER_DYING_OR_OVER) == 0u &&
        (DIRECTOR_STATE_FLAGS & DIRECTOR_FLAG_CAPITAL_DUE) == 0u;
}

/* Heavy tick of one live Bomber member (HEAVY_SLOT), called by the ASM member
 * loop after it captured the member's old Y. Y grows by at most one line, as
 * erase_enemy_departing_row requires. Returns 0, or the record's weapon_class
 * when this member fires a shell; ASM emits exactly that class and publishes
 * heavy_member_colour for this member. */
uint8_t enemy_c_heavy_tick(void)
{
    heavy_scratch = 0u;
    if (heavy_member_direction == BOMBER_ATTACK) {
        if (--heavy_member_turn_timer == 0u) {
            if (bomber_may_fire() != 0u) {
                heavy_scratch = enemy_profile_weapon_class;
                if (--heavy_member_fire_timer != 0u) {
                    heavy_member_turn_timer = enemy_profile_burst_interval;
                    goto colour;
                }
            }
            /* Salvo done or aborted: reload and sweep off in a fresh direction. */
            heavy_member_fire_timer = enemy_profile_post_burst_frames;
            heavy_member_direction = 1u;
            if ((FRAME_COUNTER & 2u) != 0u) {
                heavy_member_direction = 0xFFu;
            }
            bomber_turn();
        }
        goto colour;
    }
    if (heavy_member_y < bomber_entry_depth[HEAVY_SLOT] ||
        ((FRAME_COUNTER ^ HEAVY_SLOT) & 1u) == 0u) {
        ++heavy_member_y;
    }
    if (--heavy_member_turn_timer == 0u) {
        bomber_turn();
    }
    heavy_index = (uint8_t)(heavy_member_x + heavy_member_direction);
    if (heavy_index < bomber_lane_first[HEAVY_SLOT] ||
        heavy_index > bomber_lane_last[HEAVY_SLOT]) {
        bomber_turn();
    } else {
        heavy_member_x = heavy_index;
    }
    if (heavy_member_fire_timer != 0u) {
        --heavy_member_fire_timer;
    } else if (bomber_may_fire() != 0u) {
        /* Brake and charge; the salvo starts when the aim hold expires. */
        heavy_member_direction = BOMBER_ATTACK;
        heavy_member_turn_timer = BOMBER_AIM_FRAMES;
        heavy_member_fire_timer = enemy_profile_burst_count;
    }
colour:
    bomber_colour();
    return heavy_scratch;
}
