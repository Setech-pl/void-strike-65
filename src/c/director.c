#include "director.h"
#include "lifecycle.h"

#pragma code-name ("DIRECTOR_C_CODE")
#pragma rodata-name ("LEVEL1_DATA")

#define U8_AT(address) (*(volatile uint8_t*)(address))

#define DIFFICULTY_SETTING       U8_AT(0x4E70u)
#define FRAME_COUNTER            U8_AT(0x0086u)
#define CAPITAL_SECTOR_STATE     U8_AT(0x4EA5u)
#define PLAYER_LIFECYCLE         U8_AT(0x4EAAu)

#define STATE_ROW_LO             U8_AT(0x80F4u)
#define STATE_ROW_HI             U8_AT(0x80F5u)
#define STATE_PHASE              U8_AT(0x80F6u)
#define STATE_EVENT_INDEX        U8_AT(0x80F7u)
#define STATE_INTENSITY          U8_AT(0x80F8u)
#define STATE_REACTION           U8_AT(0x80F9u)
#define STATE_RECOVERY           U8_AT(0x80FAu)
#define STATE_RNG                U8_AT(0x80FBu)
#define STATE_PENDING            U8_AT(0x80FCu)
#define STATE_DEFER_LEFT         U8_AT(0x80FDu)
#define STATE_FLAGS              U8_AT(0x80FEu)
#define STATE_ADMISSION_FRAME    U8_AT(0x80FFu)

#define CAPITAL_HULL_STATE_DRAIN 5u
#define CAPITAL_HULL_STATE_OPEN  7u
#define HAZARD_DEBRIS            1u
#define PHASE_COUNT              8u
#define EVENT_COUNT              6u
#define FLAG_COMPLETE            0x01u
#define EVENT_DEFER              0x20u
#define EVENT_VARIANT            0x40u
#define EVENT_OPCODE_MASK        0x1Fu
#define EVENT_BOSS_HANDOFF       5u

extern uint8_t asm_director_can_allocate(void);
extern uint8_t asm_director_dispatch_event(void);

#pragma bss-name ("DIRECTOR_C_BSS")
volatile uint8_t director_event_opcode_abi;
volatile uint8_t director_event_arg0_abi;
volatile uint8_t director_argument_abi;
static uint8_t director_scratch0;
static uint8_t director_scratch1;
static uint8_t director_scratch2;
static uint8_t director_scratch3;
#pragma bss-name ("BSS")

static const uint8_t hazard_bits[4] = { 0x01u, 0x02u, 0x04u, 0x08u };
static const uint8_t hazard_costs[4] = { 1u, 1u, 2u, 0u };

const uint8_t level1_phase_end_lo[PHASE_COUNT] = {
    128u & 0xFFu, 576u & 0xFFu, 1056u & 0xFFu, 1664u & 0xFFu,
    1856u & 0xFFu, 2752u & 0xFFu, 2944u & 0xFFu, 3712u & 0xFFu
};
const uint8_t level1_phase_end_hi[PHASE_COUNT] = {
    128u >> 8, 576u >> 8, 1056u >> 8, 1664u >> 8,
    1856u >> 8, 2752u >> 8, 2944u >> 8, 3712u >> 8
};
const uint8_t level1_phase_hazards[PHASE_COUNT] = {
    0x00u, 0x09u, 0x0Bu, 0x0Fu, 0x09u, 0x0Fu, 0x09u, 0x0Fu
};
const uint8_t level1_phase_budget_easy[PHASE_COUNT] = {
    0u, 1u, 2u, 3u, 1u, 2u, 1u, 2u
};
const uint8_t level1_phase_budget_medium[PHASE_COUNT] = {
    0u, 2u, 3u, 4u, 1u, 3u, 1u, 3u
};
const uint8_t level1_phase_budget_hard[PHASE_COUNT] = {
    0u, 2u, 3u, 5u, 2u, 4u, 2u, 4u
};
const uint8_t level1_phase_reaction_easy[PHASE_COUNT] = {
    64u, 48u, 40u, 32u, 64u, 32u, 64u, 28u
};
const uint8_t level1_phase_reaction_medium[PHASE_COUNT] = {
    56u, 42u, 34u, 28u, 56u, 28u, 56u, 24u
};
const uint8_t level1_phase_reaction_hard[PHASE_COUNT] = {
    48u, 36u, 28u, 24u, 48u, 24u, 48u, 20u
};
const uint8_t level1_phase_recovery_easy[PHASE_COUNT] = {
    128u, 48u, 40u, 48u, 128u, 48u, 128u, 64u
};
const uint8_t level1_phase_recovery_medium[PHASE_COUNT] = {
    112u, 42u, 34u, 42u, 112u, 42u, 112u, 56u
};
const uint8_t level1_phase_recovery_hard[PHASE_COUNT] = {
    96u, 36u, 28u, 36u, 96u, 36u, 96u, 48u
};
const uint8_t level1_phase_capital_state[PHASE_COUNT] = {
    CAPITAL_HULL_STATE_OPEN, CAPITAL_HULL_STATE_OPEN,
    CAPITAL_HULL_STATE_OPEN, CAPITAL_HULL_STATE_OPEN,
    CAPITAL_HULL_STATE_OPEN, CAPITAL_HULL_STATE_OPEN,
    CAPITAL_HULL_STATE_OPEN, CAPITAL_HULL_STATE_OPEN
};
const uint8_t level1_phase_pickups[PHASE_COUNT] = {
    0x00u, 0x01u, 0x01u, 0x03u, 0x07u, 0x03u, 0x07u, 0x03u
};
const uint8_t level1_phase_variants[PHASE_COUNT] = {
    0x00u, 0x03u, 0x0Fu, 0x1Fu, 0x00u, 0x1Fu, 0x00u, 0x3Fu
};

const uint8_t level1_event_row_lo[EVENT_COUNT] = {
    128u & 0xFFu, 1056u & 0xFFu, 1856u & 0xFFu,
    2944u & 0xFFu, 3584u & 0xFFu, 3712u & 0xFFu
};
const uint8_t level1_event_row_hi[EVENT_COUNT] = {
    128u >> 8, 1056u >> 8, 1856u >> 8,
    2944u >> 8, 3584u >> 8, 3712u >> 8
};
const uint8_t level1_event_opcode[EVENT_COUNT] = {
    0x41u, 0x42u, 0x43u, 0x44u, 0x64u, 0x25u
};
const uint8_t level1_event_arg0[EVENT_COUNT] = { 1u, 3u, 5u, 7u, 8u, 0u };
const uint8_t level1_event_arg1[EVENT_COUNT] = { 0u, 0u, 1u, 0u, 1u, 0u };

static uint8_t phase_budget(void)
{
    if (DIFFICULTY_SETTING == 0u) {
        return level1_phase_budget_easy[director_scratch1];
    }
    if (DIFFICULTY_SETTING == 1u) {
        return level1_phase_budget_medium[director_scratch1];
    }
    return level1_phase_budget_hard[director_scratch1];
}

static uint8_t phase_reaction(void)
{
    if (DIFFICULTY_SETTING == 0u) {
        return level1_phase_reaction_easy[director_scratch0];
    }
    if (DIFFICULTY_SETTING == 1u) {
        return level1_phase_reaction_medium[director_scratch0];
    }
    return level1_phase_reaction_hard[director_scratch0];
}

static uint8_t phase_recovery(void)
{
    if (DIFFICULTY_SETTING == 0u) {
        return level1_phase_recovery_easy[director_scratch0];
    }
    if (DIFFICULTY_SETTING == 1u) {
        return level1_phase_recovery_medium[director_scratch0];
    }
    return level1_phase_recovery_hard[director_scratch0];
}

#pragma code-name ("DIRECTOR_C_PRE")
uint8_t director_c_rng_advance(void)
{
    STATE_RNG = (uint8_t)((STATE_RNG << 2) + STATE_RNG + 1u);
    return STATE_RNG;
}

#pragma code-name ("DIRECTOR_C_CODE")
static void director_check_phase(void)
{
    director_scratch0 = STATE_PHASE;
    if (director_scratch0 >= (PHASE_COUNT - 1u)) {
        return;
    }
    director_scratch1 = level1_phase_end_hi[director_scratch0];
    if (STATE_ROW_HI < director_scratch1) {
        return;
    }
    if (STATE_ROW_HI == director_scratch1) {
        director_scratch1 = level1_phase_end_lo[director_scratch0];
        if (STATE_ROW_LO < director_scratch1) {
            return;
        }
    }
    director_scratch0 = (uint8_t)(director_scratch0 + 1u);
    STATE_PHASE = director_scratch0;
    STATE_REACTION = phase_reaction();
    STATE_RECOVERY = phase_recovery();
}

uint8_t director_c_try_event(void)
{
    director_scratch0 = director_argument_abi;
    director_scratch1 = level1_event_opcode[director_scratch0];
    director_scratch2 = director_scratch1 & EVENT_OPCODE_MASK;
    director_event_opcode_abi = director_scratch2;
    director_event_arg0_abi = level1_event_arg0[director_scratch0];

    if (asm_director_dispatch_event() != 0u) {
        if ((director_scratch1 & EVENT_VARIANT) != 0u) {
            director_c_rng_advance();
        }
        STATE_ADMISSION_FRAME = FRAME_COUNTER;
    } else if (director_scratch2 != EVENT_BOSS_HANDOFF) {
        return 0u;
    }
    STATE_EVENT_INDEX = (uint8_t)(STATE_EVENT_INDEX + 1u);
    STATE_PENDING = 0xFFu;
    if (director_scratch2 == EVENT_BOSS_HANDOFF) {
        STATE_FLAGS |= FLAG_COMPLETE;
    }
    return 1u;
}

#pragma code-name ("DIRECTOR_C_LOW")
void director_c_init(void)
{
    STATE_ROW_LO = 0u;
    STATE_ROW_HI = 0u;
    STATE_PHASE = 0u;
    STATE_EVENT_INDEX = 0u;
    STATE_INTENSITY = 0u;
    STATE_REACTION = 0u;
    STATE_RECOVERY = 0u;
    STATE_RNG = director_argument_abi;
    STATE_PENDING = 0xFFu;
    STATE_DEFER_LEFT = 0u;
    STATE_FLAGS = 0u;
    STATE_ADMISSION_FRAME = (uint8_t)(FRAME_COUNTER - 1u);
    lifecycle_c_init();
}

void director_c_world_row_tick(void)
{
    STATE_ROW_LO = (uint8_t)(STATE_ROW_LO + 1u);
    if (STATE_ROW_LO == 0u) {
        STATE_ROW_HI = (uint8_t)(STATE_ROW_HI + 1u);
    }
    if (STATE_REACTION != 0u) {
        --STATE_REACTION;
    }
    if (STATE_RECOVERY != 0u) {
        --STATE_RECOVERY;
    }
    director_check_phase();

    if (STATE_PENDING != 0xFFu) {
        director_argument_abi = STATE_PENDING;
        if (director_c_try_event() != 0u) {
            return;
        }
        STATE_DEFER_LEFT = (uint8_t)(STATE_DEFER_LEFT - 1u);
        if (STATE_DEFER_LEFT != 0u) {
            return;
        }
        STATE_EVENT_INDEX = (uint8_t)(STATE_EVENT_INDEX + 1u);
        STATE_PENDING = 0xFFu;
        return;
    }

    director_scratch3 = STATE_EVENT_INDEX;
    if (director_scratch3 >= EVENT_COUNT) {
        return;
    }
    director_scratch1 = level1_event_row_hi[director_scratch3];
    if (STATE_ROW_HI < director_scratch1) {
        return;
    }
    if (STATE_ROW_HI == director_scratch1) {
        director_scratch1 = level1_event_row_lo[director_scratch3];
        if (STATE_ROW_LO < director_scratch1) {
            return;
        }
    }
    director_argument_abi = director_scratch3;
    if (director_c_try_event() != 0u) {
        return;
    }
    director_scratch3 = STATE_EVENT_INDEX;
    if ((level1_event_opcode[director_scratch3] & EVENT_DEFER) != 0u) {
        STATE_PENDING = director_scratch3;
        STATE_DEFER_LEFT = 8u;
    } else {
        STATE_EVENT_INDEX = (uint8_t)(STATE_EVENT_INDEX + 1u);
    }
}

#pragma code-name ("DIRECTOR_C_CODE")
uint8_t director_c_request(void)
{
    director_scratch3 = director_argument_abi;
    if ((STATE_FLAGS & FLAG_COMPLETE) != 0u) {
        return 0u;
    }
    if (STATE_ADMISSION_FRAME == FRAME_COUNTER) {
        return 0u;
    }
    STATE_ADMISSION_FRAME = FRAME_COUNTER;
    if ((uint8_t)(STATE_RECOVERY | STATE_REACTION) != 0u) {
        return 0u;
    }

    director_scratch0 = STATE_PHASE;
    director_scratch1 = director_scratch0;
    director_scratch2 = hazard_bits[director_scratch3];
    director_scratch2 &= level1_phase_hazards[director_scratch0];
    if (director_scratch2 == 0u) {
        if (director_scratch3 != HAZARD_DEBRIS ||
            CAPITAL_SECTOR_STATE >= CAPITAL_HULL_STATE_DRAIN) {
            return 0u;
        }
        director_scratch1 = 3u;
    }

    director_scratch2 = (uint8_t)(hazard_costs[director_scratch3] + STATE_INTENSITY);
    director_scratch1 = phase_budget();
    if (director_scratch2 > director_scratch1) {
        return 0u;
    }
    if (asm_director_can_allocate() == 0u) {
        return 0u;
    }

    STATE_INTENSITY = director_scratch2;
    STATE_REACTION = phase_reaction();
    director_c_rng_advance();
    return 1u;
}

void director_c_release(void)
{
    director_scratch0 = hazard_costs[director_argument_abi];
    if (STATE_INTENSITY < director_scratch0) {
        STATE_INTENSITY = 0u;
    } else {
        STATE_INTENSITY = (uint8_t)(STATE_INTENSITY - director_scratch0);
    }
}
