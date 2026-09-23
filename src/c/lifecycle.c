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
    ((&enemy_archetypes.byte[field])[light_record])
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
/* Light multiplicity (plan-light-multiplicity.md §2.1). Four SoA slots is the
 * declared format; how many of them a sector may fill is a separate ceiling
 * that steps 2-3 introduce. Step 1a fills slot 0 only, so every loop below is
 * still written against light_slot rather than over a range. */
#define LIGHT_SLOT_COUNT         LIGHT_SLOT_COUNT_ABI
#define LIGHT_CELL_COUNT         LIGHT_CELL_COUNT_ABI
/* light_state values. 0 is ENEMY_INACTIVE. ESCORT follows Heavy slot 0;
 * FREE is pass-through (the Interceptor's pursuit, or a Wingman that outlived
 * its leader). This replaces the derived light_leaderless byte: ASM tests only
 * "non-zero is alive", so both values read as alive without an ASM change. */
#define LIGHT_ACTIVE_ESCORT      1u
#define LIGHT_ACTIVE_FREE        2u
/* Erased, scored and sounded, waiting only for a free token to spawn its
 * breakup (plan §2.5). Deliberately the HIGHEST state value: the kernel's
 * hittable test is `>= LIGHT_BREAKUP_PENDING means no`, one compare. */
#define LIGHT_BREAKUP_PENDING    3u
/* The slot's left screen code: LIGHT_GLYPH (120) | the hostile attribute bit,
 * spelled LIGHT_SCREEN_CODE in src/hybrid/light-wingman.s. Step 3 gives the
 * three appearance pairs 120/121, 122/123 and 124/125; until then every slot
 * carries pair 0 and the ASM uses its own constant. */
#define LIGHT_SCREEN_CODE        0xF8u
/* Three appearance pairs share the six retired pickup codes (120/121,
 * 122/123, 124/125). Step 2 only ever uses pair 0; step 3 allocates them. */
#define LIGHT_APPEARANCE_PAIRS   3u
/* No bitmap has been written into a pair yet. copy_charset rebuilds glyphs
 * 120-125 from the frontend source at every new game, so this is the value
 * lifecycle_c_init must restore - not zero, which is a real archetype offset. */
#define LIGHT_APPEARANCE_NONE    0xFFu
/* How many slots a sector may fill (owner decision 23 §10.7; the shipped
 * SWARM ceiling stays conditional on the native three-Light measurement,
 * plan §4.3). They are policy BYTES, not constants, so a harness test can
 * poke one without a build flag; these are the values init restores. */
#define LIGHT_CEILING_SWARM      3u
#define LIGHT_CEILING_ELITE      1u
#define LIGHT_CEILING_CAPITAL    0u
/* enemy_c_light_tick's return byte is exclusive: one action per tick.
 * 0 nothing; 1-3 fire, the record's weapon_class; $40 install the appearance.
 * $80 (spawn the deferred breakup) arrives with the token at step 4. */
#define LIGHT_RETURN_INSTALL     0x40u
#define LIGHT_RETURN_BREAKUP     0x80u
/* enemy_c_light_hit's return: 0 not lethal, 1 lethal and the breakup spawns
 * now, 2 lethal with the breakup deferred (ASM scores and sounds, nothing
 * spawns). */
#define LIGHT_HIT_LETHAL_NOW     1u
#define LIGHT_HIT_LETHAL_DEFER   2u
/* One expensive event per frame (plan §2.5). The budget is a policy BYTE so a
 * harness test can poke it and watch the same frame overrun without the
 * token - the negative control M2's proof rests on ([C5]). */
#define LIGHT_TOKEN_BUDGET       1u
/* PROVISIONAL standalone Interceptor wave (plan §2.4). TEMPORARY, in the same
 * sense as encounter_heavy_schedule: it exists so a smoke run and the native
 * replays produce multi-Light frames naturally, and roadmap 4.6's WaveDef
 * replaces it wholesale. Nothing in the lifecycle depends on this order. */
#define LIGHT_WAVE_COUNT         3u
/* Difficulty scales the SPACING, not the count (owner decision 23 §10.6). */
#define LIGHT_WAVE_SPACING_EASY   64u
#define LIGHT_WAVE_SPACING_MEDIUM 48u
#define LIGHT_WAVE_SPACING_HARD   32u

/* Heavy formation presentation: the roster shape is the ASM PMG art index
 * (build/enemy-roster.inc): 0 is the Raider art, 2 SCYTHE_BOMBER (QUAD). */
#define ROSTER_SHAPE_RAIDER      0u
#define ROSTER_SHAPE_BOMBER      2u
#define HULL_COLOUR_RAIDER       0x44u
/* 4.5d identity: the Bomber leaves the Raider's red family, and its luminance
 * is its remaining HP: the hull visibly darkens as it is worn down, which is
 * also the non-lethal Heavy hit feedback STATUS lists as a gap. No new
 * per-slot state: HP is already ENEMY_HP_n.
 *
 * The hue is GREEN (owner decision, 2026-09-23). 4.5d shipped hue 8 and the
 * owner's hardware smoke rejected it: $88 is not merely near the allied steel,
 * it is the SAME BYTE as GAMEPLAY_COLPF1, so a hostile Heavy wore the colour
 * of the allied capital hull, the Light steel arms and the hostile shell
 * trails, and read as friendly. Red was the fallback and was not taken: the
 * enemy capital hull is burgundy ($44 / COLPF3 $46), so a red Bomber would
 * blend into the hull it flies over in capital sectors. Gameplay uses no hue C
 * at all, so green separates from burgundy, from steel and from the amber
 * allied faction colour on both hull styles. The frontend/loader greens ($D8,
 * $D0) are hue D on screens gameplay never shares.
 *   HP 4 -> $C8   HP 3 -> $C6   HP 2 -> $C4   HP 1 -> $C2
 * HULL_COLOUR_BOMBER is the full-HP entry, published to COLPM1/COLPM2 when
 * the formation is admitted; bomber_colour() derives the rest per tick. The
 * cost is zero: only the value of this constant changes. */
#ifndef BOMBER_HULL_HUE_OVERRIDE
#define BOMBER_HULL_HUE          0xC0u
#else
/* --bomber-hull=red review variant only. Never reaches dist/, no gate consults
 * it; it exists so the owner can hold the rejected fallback against green on
 * real hardware, over the burgundy enemy capital hull, in one sitting. */
#define BOMBER_HULL_HUE          BOMBER_HULL_HUE_OVERRIDE
#endif
#define BOMBER_HULL_HP_LUMA      1u      /* left shift: two luma steps per HP */
#define HULL_COLOUR_BOMBER       (BOMBER_HULL_HUE | 0x08u)
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

/* The Bomber ramp is added to without clamping: prove at compile time that the
 * brightest combination still lies inside the Bomber's hue. */
typedef char bomber_hull_ramp_must_stay_inside_its_hue[
    (HULL_COLOUR_BOMBER == (BOMBER_HULL_HUE | (4u << BOMBER_HULL_HP_LUMA))) &&
    (HULL_COLOUR_BOMBER + BOMBER_FLASH_LUMA) < (BOMBER_HULL_HUE + 0x10u) &&
    (HULL_COLOUR_BOMBER + BOMBER_CHARGE_LUMA) < (BOMBER_HULL_HUE + 0x10u) ? 1 : -1
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

/* PROVISIONAL wave tables (plan §2.4), replaced by 4.6's WaveDef. Frames
 * between admissions by difficulty, and the entry columns the members cycle:
 * four-aligned and inside 48-200, so a member can never step out of the ring. */
static const uint8_t light_wave_spacing[3] = {
    LIGHT_WAVE_SPACING_EASY, LIGHT_WAVE_SPACING_MEDIUM, LIGHT_WAVE_SPACING_HARD
};
static const uint8_t light_wave_entry_x[LIGHT_WAVE_COUNT] = { 92u, 124u, 156u };

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
/* Per-slot Light state, structure of arrays, at $7FC4-$7FF3 (48 B of the 60
 * unassigned bytes above the A2 display lists; 12 B spare). Boot-only A2
 * staging passes through this range, which is safe for the same reason the
 * $8100 GLUE hold is: lifecycle_c_init clears what it owns at gameplay init.
 *
 * ASM indexes these by the C-owned light_slot. Two consequences the layout is
 * chosen for: light_state is the base of the array, so the existing absolute
 * `lda LIGHT_STATE` still reads slot 0; and the backing is ONE cell-major
 * array, not the two per-slot arrays plan §2.1 spells out, because the erase
 * and render loops index it by CELL (`lda LIGHT_BACKING0,y`, y = 0..1). Two
 * four-byte arrays would put slot 1's cell 0 where cell 1 belongs. Same eight
 * bytes; the slot selects the base, the cell the index.
 *
 * NOT volatile, deliberately: cc65 compiles a volatile INDEXED store into a
 * runtime pointer (`sta ptr1 / stx ptr1+1 / sta (ptr1),y`), which the C-stack
 * audit refuses and which would cost a third of the tick in code size. Nothing
 * here needs it - no C function below calls into ASM while holding Light state,
 * and cc65 reloads a global across any call anyway.
 */
#pragma bss-name ("HYBRID_LIGHT_SLOTS")
uint8_t light_state[LIGHT_SLOT_COUNT];
uint8_t light_hp[LIGHT_SLOT_COUNT];
uint8_t light_x[LIGHT_SLOT_COUNT];
uint8_t light_y[LIGHT_SLOT_COUNT];
uint8_t light_fire_timer[LIGHT_SLOT_COUNT];
uint8_t light_burst_left[LIGHT_SLOT_COUNT];
/* Byte offset into enemy_archetypes (12 / 24), per slot. */
uint8_t light_archetype[LIGHT_SLOT_COUNT];
/* The slot's left screen code. Written at admission and kept consistent from
 * step 1a on; the ASM still uses the LIGHT_SCREEN_CODE constant until step 3
 * gives the appearance pairs more than one value to choose between. */
uint8_t light_code[LIGHT_SLOT_COUNT];
uint8_t light_screen_lo[LIGHT_SLOT_COUNT];
uint8_t light_screen_hi[LIGHT_SLOT_COUNT];
uint8_t light_backing[LIGHT_SLOT_COUNT * LIGHT_CELL_COUNT];
/* ASM-owned, C never reads or writes it: the backing resolver's hold for the
 * caller's X while it scans the slots. It lives here rather than in the 16-B
 * shared area so that area stays whole for the token and wave bytes of plan
 * §2.5 and §2.4. */
uint8_t light_resolve_save;
/* ASM-owned, C never touches it: the kernel's loop bound for the two-cell
 * render and for the sixteen-byte glyph copy, both of which need an index
 * register for the destination and cannot spare one for the count. */
uint8_t light_cell_end;
/* The archetype offset whose bitmap each appearance pair currently holds, or
 * LIGHT_APPEARANCE_NONE. This is what makes the glyph install run ONCE per
 * admission instead of on every frame of a Light's life. Policy and
 * bookkeeping rather than hot scratch, so they live here beside the slots and
 * leave the 16-byte shared area for the token and wave state. */
uint8_t light_appearance_installed[LIGHT_APPEARANCE_PAIRS];
uint8_t light_ceiling_swarm;
uint8_t light_ceiling_elite;
uint8_t light_ceiling_capital;
/* PROVISIONAL wave state (plan §2.4). light_wave_lock is read by ASM through
 * _asm_director_can_allocate: a Heavy formation is refused while a wave is
 * live, which is how Heavy and swarm are kept from ever coexisting. */
volatile uint8_t light_wave_lock;
uint8_t light_wave_remaining;
uint8_t light_wave_timer;
uint8_t light_wave_entry;
#pragma bss-name ("HYBRID_LIGHT_STATE")
/* Shared scalars. light_slot is the slot ASM is ticking and C is indexing;
 * everything else is per-tick scratch. The rest of the 16-byte area is free
 * for the token and wave bytes of plan §2.5 and §2.4. */
volatile uint8_t light_slot;
volatile uint8_t light_scratch;
volatile uint8_t light_slot_save;
volatile uint8_t light_target_x;
/* cc65 stores an indexed lvalue with `sta abs,y` only when the value is a
 * plain load; arithmetic in place builds a runtime pointer (ptr1). These hold
 * the load-compute-store intermediate, as heavy_scratch does for the Heavy. */
static uint8_t light_work;
/* The ticked slot's archetype offset, hoisted once per entry so LIGHT_FIELD
 * stays a plain lvalue index and cc65 keeps emitting `lda enemy_archetypes+f,y`
 * instead of building a pointer. */
static uint8_t light_record;
/* Second load-compute-store temporary: the tick needs one for the Y/X motion
 * and one for the fire cadence at the same time. Deliberately NOT the volatile
 * light_scratch, which ASM owns inside light_update and light_shot. */
static uint8_t light_fire_work;
/* The tick body's own return, held while the appearance install decides
 * whether it outranks it. */
static uint8_t light_tick_result;
/* Set while a candidate appearance pair is checked against every slot. A flag
 * rather than a negated compound test: cc65 links bnega for the latter. */
static uint8_t light_pair_free;
/* light_admit's inputs. Statics, not parameters: cc65 passes a second argument
 * on the C software stack and the audit requires zero. */
static uint8_t light_admit_entry;
static uint8_t light_admit_state;
/* The one-expensive-event token (plan §2.5), in the shared 16-byte area the
 * plan reserved for it. No frame-start hook and no ASM write: every consumer
 * resets it when it sees a new FRAME_COUNTER, so the kill path
 * (handle_collisions, which runs BEFORE the tick loop) and the tick share one
 * budget. The budget is not static - the harness pokes it by label to run the
 * negative control. */
/* How many slots the kernel's per-frame loops must walk; see
 * enemy_c_light_wave. ASM-read, C-derived, never incrementally maintained. */
uint8_t light_slot_limit;
uint8_t light_token;
uint8_t light_token_frame;
uint8_t light_token_budget;
/* The post-burst column: archetype offset + difficulty, resolved at admission
 * and, like light_record, kept a plain index. */
static uint8_t light_post_burst_slot;
#pragma bss-name ("HYBRID_LIGHT_SCREEN")
/* ASM-owned, C only clears it at gameplay init: the highest Light slot the
 * kernel has PUBLISHED plus one, 0 when nothing is on screen. light_publish
 * maintains it from screen_hi - it zeroes it as the full-width erase loop
 * clears each slot's screen_hi, and raises it as the render loop sets one -
 * so it describes exactly the slots light_cell_resolve can find, at every
 * point in the frame including inside the render loop itself.
 *
 * It is NOT light_slot_limit. That one is state-derived and is the bound the
 * ERASE loop may not use, because a slot that retired this frame has state 0
 * with its cells still on screen. This one is derived from the very fact the
 * erase loop keys on, so it covers that slot for as long as its cells exist.
 *
 * Stale HIGH is safe by the same argument as light_slot_limit - it scans a
 * spare slot rather than skipping a published one - but an UNINITIALISED
 * value is not: the kernel would index screen_hi past the slot array. Hence
 * the clear in lifecycle_c_init: this is a bss segment with no file image, in
 * a range nothing else zeroes, so it may not be assumed zero at gameplay
 * init. After that it is bounded 0..LIGHT_SLOT_COUNT by construction. */
uint8_t light_screen_slot_limit;
#pragma bss-name ("HYBRID_LIGHT_ROTATE")
/* The rotate-frame gate (plan §4.6). ASM-owned, C only reads it and clears it
 * at gameplay init: advance_starfield_layers stores FRAME_COUNTER here, which
 * it reaches exactly once per ring rotate, so `light_rotate_frame ==
 * FRAME_COUNTER` is the whole test and costs one absolute load and one
 * compare. ENTITY_FRAME_EVENTS cannot serve: entity_effects_update lsrs it and
 * light_update calls that first, so the bit is gone before the tick asks.
 *
 * It is here and not in HYBRID_LIGHT_STATE (16 of 16) or HYBRID_LIGHT_SLOTS
 * (60 of 60) for the same reason light_screen_slot_limit is: both are exactly
 * full. It takes the byte above it in the same unowned gap.
 *
 * WHAT IT MEANS WHERE IT IS READ. update_starfield runs after
 * handle_collisions and update_player_fighter_weapon but BEFORE
 * entity_effects_update_with_light, so:
 *   - inside light_update (the contact kill, the tick, the install) the marker
 *     describes THIS frame exactly - the rotate has already happened;
 *   - inside the PairShot path it is one frame stale. That is conservative in
 *     the only direction that matters: a stale marker names frame N-1, and
 *     because rotate frames are never consecutive frame N cannot rotate
 *     either, so the compare answers "not a rotate frame", which is the right
 *     answer. It can miss a saving; it can never deny on a frame that does not
 *     rotate.
 * Also a bss segment with no file image: lifecycle_c_init clears it so a
 * garbage value cannot match FRAME_COUNTER once at startup. */
uint8_t light_rotate_frame;
#pragma bss-name ("HYBRID_HEAVY_BREAKUP")
/* Heavy break-up (plan-4.6-placement.md §7.4 variant 2, owner smoke
 * 2026-09-21). ONE byte: "a Heavy member died and its fragments have not been
 * spawned yet". It is the Heavy's equivalent of the Light's
 * LIGHT_BREAKUP_PENDING state, which the Light gets for free because it has a
 * per-slot state byte; HYBRID_HEAVY_STATE is 11 of 11, so this takes the next
 * byte of the same unowned gap light_screen_slot_limit and light_rotate_frame
 * took ($8126, $8127), leaving $8129-$813F, 23 B.
 *
 * It carries no position: begin_enemy_fighter_explosion_tail already writes
 * FIGHTER_EXPLOSION_X/Y + ENEMY_SLOT on the kill frame, before anything can
 * move, which is the enqueue the owner's effect-scheduling decision requires
 * and costs 0 new bytes. It carries no archetype either: ENEMY_ARCHETYPE
 * stands until the formation recycles, which cannot happen inside the two
 * frames this bit lives.
 *
 * Also a bss segment with no file image, so lifecycle_c_init clears it: a
 * garbage value here would make the first gameplay frame spawn a breakup
 * nobody killed. */
uint8_t heavy_breakup_pending;
#pragma bss-name ("BSS")

static void heavy_publish_profile(void);

/* Reload the selected Light archetype's post-burst pause for this difficulty.
 * The three per-difficulty fields are adjacent, so one 8-bit index reaches
 * both the archetype record and the difficulty column. */
/* Light-class C in the code window $B600-$BBFF (owner decision X). It left
 * HYBRID_C_EXT because the SoA indexing grew it past the extension's tail:
 * MEASURED +242 B for the slot indexing alone, against 613 B of extension
 * before, which overflowed LIGHT_CODE's run window by 175 B. The window is
 * where plan §3.1 puts it; only the timing is earlier than §6 expected. */
#pragma code-name (push, "HYBRID_C_WINDOW")
#pragma rodata-name (push, "HYBRID_C_WINDOW_RODATA")

/* Claim this frame's expensive-event token. Returns 1 when the caller may go
 * ahead. The reset is lazy - whoever asks first on a new frame refills it -
 * which is what lets the kill path and the tick share one budget with no
 * frame-start hook and no ASM write (plan §2.5). */
static uint8_t light_take_token(void)
{
    if (light_token_frame != FRAME_COUNTER) {
        light_token_frame = FRAME_COUNTER;
        light_token = light_token_budget;
    }
    if (light_token == 0u) {
        return 0u;
    }
    --light_token;
    return 1u;
}

/* Claim the token for a DEFERRABLE (visual-only) event on its FIRST attempt.
 * Plan §4.6, owner 2026-09-21: a ring rotate is the single most expensive
 * thing the frame does that the Light class cannot influence, and MEASURED the
 * binding frames of the whole replay set are rotate frames, so a deferrable
 * event that lands on one stacks ~1,000 cycles onto the worst frame there is.
 * It is refused here WITHOUT burning a token - the frame's token stays
 * available to a consumer that is not deferrable.
 *
 * The delay this can add is exactly one frame, and that is a property of the
 * scroll cadence rather than of this code: rotate frames are never
 * consecutive (src/main.s asserts it - WORLD_SCROLL_RATE_HARD*2 <=
 * WORLD_SCROLL_RATE_DENOMINATOR, the largest rate over the shared
 * denominator, so the accumulator can never carry twice in a row), so the
 * frame after a denial is never a rotate frame.
 *
 * The forcing rule that BOUNDS the wait is not here, it is at the retry: see
 * the BREAKUP_PENDING branch of light_tick_body. */
uint8_t light_take_deferrable_token(void)
{
    if (light_rotate_frame == FRAME_COUNTER) {
        return 0u;
    }
    return light_take_token();
}

/* Live slots, counted rather than kept: a four-byte scan, at admission only. */
static uint8_t light_live_count(void)
{
    light_work = 0u;
    light_slot = LIGHT_SLOT_COUNT;
    do {
        --light_slot;
        if (light_state[light_slot] != ENEMY_INACTIVE) {
            ++light_work;
        }
    } while (light_slot != 0u);
    return light_work;
}

static void light_reload(void)
{
    /* Difficulty is fixed for a game and the archetype for a slot's life, but
     * the column is now resolved per reload rather than held per slot: one
     * add against a byte of per-slot state (plan §2.1, "derived and dropped").
     * light_record is the ticked slot's offset, hoisted by the caller. */
    light_post_burst_slot = (uint8_t)(light_record + DIFFICULTY_SETTING);
    /* Through a scalar, not straight into the array: cc65 cannot hold two
     * indices at once and builds a ptr1 pointer for the destination if the
     * value is itself an indexed load. Same reason everywhere below. */
    light_fire_work =
        (&enemy_archetypes.byte[ENEMY_ARCHETYPE_FIELD_POST_BURST])[light_post_burst_slot];
    light_fire_timer[light_slot] = light_fire_work;
}

#pragma code-name (pop)
#pragma rodata-name (pop)

/* PROVISIONAL smoke scheduling only (see encounter_light_schedule above).
 * The only writer of light_archetype_offset: the reusable Light admission
 * below only reads it and holds no ordering or toggle logic of its own.
 *
 * NOT in the code window, unlike the four primitives above it. Fix (a) needed
 * the last bytes of the window and this is the coldest thing in it: wave
 * scheduling runs at most once per admission, never per frame and never per
 * captured cell, so the hot-path argument that put the token, the ceiling and
 * the live count beside light_admit does not apply to it. An absolute jsr into
 * the arena costs exactly what an absolute jsr into the window costs. */
#pragma code-name (push, "HYBRID_C_ARENA")
static void encounter_light_schedule_advance(void)
{
    light_record = encounter_light_schedule[encounter_light_index];
    light_archetype[light_slot] = light_record;
    ++encounter_light_index;
    if (encounter_light_index >= ENCOUNTER_LIGHT_SCHEDULE_LENGTH) {
        encounter_light_index = 0u;
    }
}
#pragma code-name (pop)

void lifecycle_c_init(void)
{
    CAPITAL_SECTOR_STATE = SECTOR_FIGHTER;
    ENEMY_ACTIVE = ENEMY_INACTIVE;
    ENEMY_MEMBER_STATE_0 = ENEMY_INACTIVE;
    ENEMY_MEMBER_STATE_1 = ENEMY_INACTIVE;
    ENEMY_HP_0 = 0u;
    ENEMY_HP_1 = 0u;
    ENEMY_LIVE_COUNT = 0u;
    /* Every slot, not only the one in use: the range is boot-time A2 staging
     * before gameplay init, so nothing here may be assumed zero. */
    light_slot = LIGHT_SLOT_COUNT;
    do {
        --light_slot;
        light_state[light_slot] = ENEMY_INACTIVE;
        light_burst_left[light_slot] = 0u;
        /* the rebuilt playfield has no Light backing */
        light_screen_hi[light_slot] = 0u;
        light_code[light_slot] = LIGHT_SCREEN_CODE;
        light_archetype[light_slot] = LIGHT_OFFSET_WINGMAN;
    } while (light_slot != 0u);
    /* copy_charset has just rebuilt glyphs 120-125 from the frontend source,
     * so no pair holds a Light bitmap however this game was reached. */
    light_slot = LIGHT_APPEARANCE_PAIRS;
    do {
        --light_slot;
        light_appearance_installed[light_slot] = LIGHT_APPEARANCE_NONE;
    } while (light_slot != 0u);
    light_screen_slot_limit = 0u;
    light_rotate_frame = 0u;
    heavy_breakup_pending = 0u;
    light_token_budget = LIGHT_TOKEN_BUDGET;
    light_token = LIGHT_TOKEN_BUDGET;
    light_token_frame = FRAME_COUNTER;
    light_wave_lock = 0u;
    light_wave_remaining = 0u;
    light_wave_timer = 0u;
    light_wave_entry = 0u;
    light_ceiling_swarm = LIGHT_CEILING_SWARM;
    light_ceiling_elite = LIGHT_CEILING_ELITE;
    light_ceiling_capital = LIGHT_CEILING_CAPITAL;
    encounter_light_index = 0u;
    encounter_heavy_index = 0u;
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
     * also be unpublished (its late erase done) before the sector leaves.
     * The drain half of that test is sector_c_drain_clear (roadmap 4.3 step
     * 5); the sector-state half stays here because each caller wants a
     * different state. */
    if (sector_c_drain_clear() == 0u || CAPITAL_SECTOR_STATE != SECTOR_FIGHTER) {
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
/* Light-class ADMISSION is cold: it runs on an admission attempt, not on
 * every frame, so it stays in the resident extension rather than competing
 * with the hot tick and the ASM kernel for the 1,536-B code window. That
 * tail is the one owner decision X created: 451 B free before this block.
 * Cross-segment calls cost nothing - every call here is already a jsr. */
#pragma code-name (push, "HYBRID_C_EXT")
#pragma rodata-name (push, "RODATA")

/* How many slots this sector may hold live at once. CAPITAL is fighter-only,
 * so no Light survives it; a Heavy formation on screen leaves room for its
 * escort and nothing more (plan §2.4); otherwise the swarm ceiling applies. */
static uint8_t light_ceiling(void)
{
    if (CAPITAL_SECTOR_STATE != SECTOR_FIGHTER) {
        return light_ceiling_capital;
    }
    if (ENEMY_ACTIVE != ENEMY_INACTIVE) {
        return light_ceiling_elite;
    }
    return light_ceiling_swarm;
}

/* The first free slot, or LIGHT_SLOT_COUNT when every slot is taken. */
static uint8_t light_free_slot(void)
{
    light_slot = 0u;
    while (light_slot != LIGHT_SLOT_COUNT) {
        if (light_state[light_slot] == ENEMY_INACTIVE) {
            return light_slot;
        }
        ++light_slot;
    }
    return LIGHT_SLOT_COUNT;
}

/* Which appearance pair an admission of `light_record` may use, or
 * LIGHT_APPEARANCE_PAIRS when none may be taken (plan §2.3):
 *   1. a pair that already holds this archetype - share it, no install;
 *   2. else a pair no live slot still has on screen - take it and rewrite;
 *   3. else refuse; the caller retries next frame.
 * Rule 2's screen test is what stops a freshly freed pair from being
 * rewritten while its last user's cells are still published: the erase
 * happens in the kill frame's late window, so the next frame sees hi = 0. */
static uint8_t light_pair_for_record(void)
{
    light_work = 0u;
    while (light_work != LIGHT_APPEARANCE_PAIRS) {
        if (light_appearance_installed[light_work] == light_record) {
            return light_work;
        }
        ++light_work;
    }
    light_work = 0u;
    while (light_work != LIGHT_APPEARANCE_PAIRS) {
        light_fire_work = (uint8_t)(LIGHT_SCREEN_CODE + light_work + light_work);
        light_pair_free = 1u;
        light_slot = LIGHT_SLOT_COUNT;
        do {
            --light_slot;
            if (light_code[light_slot] == light_fire_work &&
                light_screen_hi[light_slot] != 0u) {
                light_pair_free = 0u;   /* still on screen: the pair is in use */
            }
        } while (light_slot != 0u);
        if (light_pair_free != 0u) {
            return light_work;
        }
        ++light_work;
    }
    return LIGHT_APPEARANCE_PAIRS;
}

/* THE one place a slot is filled. Both admission paths - the Heavy escort and
 * the provisional wave - come through here, which is what lets plan §2.5 [C3]
 * make admission a token consumer at step 4 in a single edit. Returns 1 when
 * a slot was taken.
 *
 * Its three inputs are statics, not parameters: cc65 passes a second argument
 * on the C software stack, and the C-stack audit requires zero. light_record
 * names the archetype; the entry column is ignored by an escort, which takes
 * its leader's on its first tick. */
static uint8_t light_admit(void)
{
    light_fire_work = light_ceiling();
    if (light_fire_work == 0u) {
        return 0u;                  /* CAPITAL is fighter-only */
    }
    if (light_live_count() >= light_fire_work) {
        return 0u;
    }
    if (light_free_slot() == LIGHT_SLOT_COUNT) {
        return 0u;
    }
    /* Plan §2.5 [C3]: admission is the fourth consumer. M1 MEASURED the
     * admission frame as the binding row of the whole replay set - +1,629
     * cycles over a standing frame - so an admission that would land on a
     * frame whose token is spent slips one frame, which nobody sees, rather
     * than stacking two expensive events. Claimed LAST, after every cheap
     * refusal above, so a refused admission never burns a token. */
    if (light_take_token() == 0u) {
        return 0u;
    }
    light_slot_save = light_slot;   /* light_pair_for_record walks the slots */
    light_work = light_pair_for_record();
    if (light_work == LIGHT_APPEARANCE_PAIRS) {
        return 0u;                  /* rule 3: retry next frame */
    }
    light_scratch = (uint8_t)(LIGHT_SCREEN_CODE + light_work + light_work);
    light_slot = light_slot_save;
    /* RAISE the limit as the slot is filled (owner decision 2026-09-21). The
     * limit is derived once per frame in enemy_c_light_wave, which runs at the
     * top of light_update - after handle_collisions, and after the Director's
     * own admission in integration_update_enemy. Without this, light_shot
     * would read a limit computed before this slot existed and the slot would
     * be unhittable for a frame. Raising here makes the limit at least the
     * highest occupied slot for every reader at every point in the frame, so
     * it can only ever be stale-HIGH, which walks a spare slot rather than
     * skipping a live one. The alternative was to rely on admission setting
     * y = 0 and on light_shot's gameplay-top test rejecting it - an implicit
     * chain, and the wrong kind. */
    light_work = (uint8_t)(light_slot + 1u);
    if (light_work > light_slot_limit) {
        light_slot_limit = light_work;
    }
    light_code[light_slot] = light_scratch;
    light_archetype[light_slot] = light_record;
    light_work = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_HIT_POINTS);
    light_hp[light_slot] = light_work;
    light_burst_left[light_slot] = 0u;
    light_y[light_slot] = 0u;
    light_x[light_slot] = light_admit_entry;
    light_state[light_slot] = light_admit_state;
    light_reload();
    return 1u;
}

/* The Light escort admission of a Heavy formation. A Light still descending
 * from an earlier formation keeps its lifecycle. */
static void encounter_light_admit(void)
{
    encounter_light_schedule_advance();
    light_admit_entry = LIGHT_X_ENTRY;
    light_admit_state = light_record == LIGHT_OFFSET_WINGMAN
        ? LIGHT_ACTIVE_ESCORT       /* takes its leader's column and lag */
        : LIGHT_ACTIVE_FREE;        /* no leader, ever: free-flying hunter */
    light_admit();
}

/* PROVISIONAL standalone Interceptor wave (plan §2.4), once per frame from the
 * kernel. TEMPORARY, like encounter_heavy_schedule: 4.6's WaveDef replaces it.
 * enemy_c_recycle arms it when a Heavy formation leaves, so a smoke run and
 * the measurement replays run Raider + escort, then a swarm, then the Bomber
 * pair, then a swarm. (The word the source-contract guard watches for is not
 * used here on purpose: that guard is about a rejected per-admission archetype
 * toggle, which this is not - the schedule still names every archetype.)
 *
 * The lock is what keeps Heavy and swarm from ever coexisting: ASM's Heavy
 * retry asks _asm_director_can_allocate, which refuses while it is set. */
/* The stepper itself runs EVERY frame, unlike the admission it calls, so it
 * belongs in the window with the rest of the per-frame path. */
#pragma code-name (push, "HYBRID_C_WINDOW")
static void light_wave_step(void)
{
    if (light_wave_lock == 0u) {
        return;
    }
    if (light_wave_remaining != 0u) {
        if (light_wave_timer != 0u) {
            --light_wave_timer;
            return;                 /* spacing-limited: no admission attempt */
        }
        light_record = LIGHT_OFFSET_INTERCEPTOR;
        light_admit_entry = light_wave_entry_x[light_wave_entry];
        light_admit_state = LIGHT_ACTIVE_FREE;
        if (light_admit() == 0u) {
            return;                 /* refused: retry next frame */
        }
        --light_wave_remaining;
        ++light_wave_entry;
        if (light_wave_entry >= LIGHT_WAVE_COUNT) {
            light_wave_entry = 0u;
        }
        light_wave_timer = light_wave_spacing[DIFFICULTY_SETTING];
        return;
    }
    /* The wave is spent; the lock lifts once its last member has gone. */
    if (light_live_count() == 0u) {
        light_wave_lock = 0u;
    }
}

/* Once per frame, before the kernel's slot loops (owner decision 2026-09-21,
 * fix (a) for the step-5 regression). The multi-slot loops were costing +246
 * cycles on frames with NO Light alive - four empty-slot rejects in each of
 * three loops, every frame - which the marginal population delta could not
 * see because that cost sits in both of its arms.
 *
 * light_slot_limit is the number of slots the kernel must walk: the highest
 * occupied slot plus one, and 0 when the sector holds none. It is DERIVED by
 * a scan here, not maintained incrementally, so it cannot desync from the
 * states it describes.
 *
 * It is computed AFTER the wave's own admission and is safe to use for the
 * rest of the frame: the only other admission path, enemy_c_spawn_raiders,
 * runs earlier in the frame, so occupancy cannot grow between here and
 * light_publish. It can only SHRINK - a retire or a kill - which leaves the
 * limit stale-high, and a stale-high limit walks a spare slot rather than
 * skipping a live one.
 *
 * WHERE IT LOWERS, and why that is safe. This is the only place it drops, and
 * it drops at the top of light_update - which is AFTER handle_collisions, so a
 * slot killed this frame can fall outside the limit while its cells are still
 * published. The invariant is therefore NOT "nothing above the limit carries
 * screen_hi"; that is briefly false by construction. The invariant that holds
 * is the one the kernel depends on:
 *
 *   no LIMIT-GATED consumer ever needs a slot above the limit.
 *
 * All three gated consumers - light_update's tick loop, light_publish's render
 * loop and light_shot's target scan - key on STATE, and a slot above the limit
 * has state 0: nothing to tick, nothing to draw, nothing to hit. The one
 * consumer that keys on screen_hi is light_publish's ERASE loop, and it is
 * deliberately NOT gated: it stays full-width so a slot that died above the
 * limit still has its cells restored in the same late window.
 * tests/light-wingman.test.mjs pins that directly. */
void enemy_c_light_wave(void)
{
    light_wave_step();
    /* Unrolled, and on purpose: this runs on EVERY frame, so a loop over the
     * volatile light_slot would re-read it per iteration and cost more than
     * the three ASM loops it exists to skip - MEASURED, that was the first
     * attempt. Constant indices compile to four `lda _light_state+k`. */
    if (light_state[3] != ENEMY_INACTIVE) {
        light_slot_limit = 4u;
    } else if (light_state[2] != ENEMY_INACTIVE) {
        light_slot_limit = 3u;
    } else if (light_state[1] != ENEMY_INACTIVE) {
        light_slot_limit = 2u;
    } else if (light_state[0] != ENEMY_INACTIVE) {
        light_slot_limit = 1u;
    } else {
        light_slot_limit = 0u;
    }
}
#pragma code-name (pop)

#pragma code-name (pop)
#pragma rodata-name (pop)

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
#ifdef LIGHT_FORCE_POPULATION
    /* PROVISIONAL (plan §2.4 [C4]): arm the standalone Interceptor wave. The
     * lock goes up first, so the ASM Heavy retry cannot slip a formation in
     * before the first member is admitted.
     *
     * MEASUREMENT SCAFFOLDING ONLY (owner decision 2026-09-21), built by
     * `node scripts/build.mjs --force-light-population`. It is not behaviour
     * the game has today - real waves arrive with 4.6's Director and WaveDef -
     * and it is out of the default build because it changes the deterministic
     * replay timeline, which the accepted coverage clauses depend on. Those
     * replays are re-scripted by 4.6, when swarms become real behaviour: a
     * gate changes when the game changes, not so that a change can pass. */
    light_wave_lock = 1u;
    light_wave_remaining = LIGHT_WAVE_COUNT;
    light_wave_timer = 0u;
#endif
}

/* Once per gameplay frame, per slot. Returns the selected record's weapon
 * class (never zero) when the Light fires, 0 otherwise; ASM tags the shot
 * with it. enemy_c_light_tick below wraps this to apply the appearance
 * install, which is the one return that outranks a fire. */
#pragma code-name (push, "HYBRID_C_WINDOW")
#pragma rodata-name (push, "HYBRID_C_WINDOW_RODATA")

static uint8_t light_tick_body(void)
{
    /* ASM sets light_slot before the call. */
    if (light_state[light_slot] == ENEMY_INACTIVE) {
        return 0u;
    }
    if (light_state[light_slot] == LIGHT_BREAKUP_PENDING) {
        /* Erased, scored and sounded already. THE FORCING RULE (plan §4.6,
         * owner 2026-09-21): this state IS the one bit of per-slot history the
         * rule needs - a slot only reaches it by having been deferred once -
         * so this second attempt is not gated at all. It ignores the rotate
         * marker AND the token budget and spawns now.
         *
         * That is what bounds the wait at two frames by construction, with no
         * counter and no comparison against a deadline. Before the rule the
         * pending slot waited for "the first later frame with a free token",
         * which had no bound at all; a rotate gate on top of an unbounded wait
         * was the reason §4.6 stopped short of shipping. One frame of extra
         * work here is the price of that bound, and it is the cheap direction:
         * the frame it lands on is never a rotate frame when the deferral came
         * from the rotate gate. */
        light_state[light_slot] = ENEMY_INACTIVE;
        return LIGHT_RETURN_BREAKUP;
    }
    if (CAPITAL_SECTOR_STATE != SECTOR_FIGHTER) {
        /* fighter-only lifecycle */
        light_state[light_slot] = ENEMY_INACTIVE;
        return 0u;
    }
    light_record = light_archetype[light_slot];
    if (light_state[light_slot] == LIGHT_ACTIVE_ESCORT &&
        ENEMY_MEMBER_STATE_0 != ENEMY_ACTIVE_STATE) {
        light_state[light_slot] = LIGHT_ACTIVE_FREE;
    }
    if (light_state[light_slot] != LIGHT_ACTIVE_ESCORT) {
        /* Free flight. A Wingman that lost its leader drifts straight down at
         * the Heavy descent rate; an Interceptor is born free-flying, descends
         * at twice that rate and closes on the player's column one four-HPOS
         * cell every other frame, which averages the player's own maximum
         * horizontal speed. PLAYER_X_MIN equals LIGHT_X_FIRST, so only the
         * upper bound needs clamping, exactly as the formation branch does. */
        light_work = (uint8_t)(light_y[light_slot] + 1u);
        if (light_record != LIGHT_OFFSET_WINGMAN) {
            ++light_work;
            light_y[light_slot] = light_work;
            if ((light_work & INTERCEPTOR_TRACK_PHASE) == 0u) {
                light_target_x = (uint8_t)(PLAYER_X & 0xFCu);
                if (light_target_x > LIGHT_X_LAST) {
                    light_target_x = LIGHT_X_LAST;
                }
                light_work = light_x[light_slot];
                if (light_work < light_target_x) {
                    light_work = (uint8_t)(light_work + LIGHT_X_STEP);
                    light_x[light_slot] = light_work;
                } else if (light_work > light_target_x) {
                    light_work = (uint8_t)(light_work - LIGHT_X_STEP);
                    light_x[light_slot] = light_work;
                }
                light_work = light_y[light_slot];
            }
        } else {
            light_y[light_slot] = light_work;
        }
        if (light_work >= LIGHT_RETIRE_Y) {
            light_state[light_slot] = ENEMY_INACTIVE;
            return 0u;
        }
    } else {
        light_work = (uint8_t)((ENEMY_X_0 + LIGHT_CENTRE_OFFSET + LIGHT_ROUND) & 0xFCu);
        if (light_work > LIGHT_X_LAST) {
            light_work = LIGHT_X_LAST;
        }
        light_x[light_slot] = light_work;
        if (ENEMY_Y_0 < LIGHT_LAG_Y) {
            light_work = 0u;
        } else {
            light_work = (uint8_t)(ENEMY_Y_0 - LIGHT_LAG_Y);
        }
        light_y[light_slot] = light_work;
    }
    light_fire_work = light_fire_timer[light_slot];
    if (light_fire_work != 0u) {
        --light_fire_work;
        light_fire_timer[light_slot] = light_fire_work;
        return 0u;
    }
    if (light_work < LIGHT_FIRE_TOP || light_work >= LIGHT_FIRE_BOTTOM ||
        (PLAYER_LIFECYCLE & 1u) != 0u) {
        return 0u;
    }
    /* Plan §2.5: a slot whose reload expires on a spent frame fires next
     * frame instead. The timer is simply not taken past zero, so no cadence
     * state moves and nothing is lost but one frame. */
    if (light_take_token() == 0u) {
        return 0u;
    }
    light_fire_work = light_burst_left[light_slot];
    if (light_fire_work == 0u) {
        light_fire_work = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_BURST_COUNT);
    }
    --light_fire_work;
    light_burst_left[light_slot] = light_fire_work;
    if (light_fire_work != 0u) {
        light_fire_work = LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_BURST_INTERVAL);
        light_fire_timer[light_slot] = light_fire_work;
    } else {
        light_reload();
    }
    return LIGHT_FIELD(ENEMY_ARCHETYPE_FIELD_WEAPON);
}

/* The tick ASM calls. The body above runs in full - motion, retirement and
 * fire cadence all happen on the admission frame exactly as before - and the
 * appearance install only replaces the RETURN, because the tick's return byte
 * is exclusive (plan §2.2) and ASM can perform one action per tick.
 *
 * Dropping a fire to install is possible in principle and unreachable in
 * practice: an install is pending only on a slot's first tick, and admission
 * has just called light_reload, so its fire timer is 56-96 frames from zero.
 * The install wins if they ever did collide, because the bitmap has to be
 * right before the slot's first render, whereas a shot can wait a frame. */
uint8_t enemy_c_light_tick(void)
{
    light_tick_result = light_tick_body();
    if (light_state[light_slot] == ENEMY_INACTIVE) {
        return light_tick_result;      /* retired, or never admitted */
    }
    /* Which appearance pair this slot's code names. Narrowed before the shift:
     * on the promoted int cc65 links shrax1. */
    light_work = (uint8_t)(light_code[light_slot] - LIGHT_SCREEN_CODE);
    light_work >>= 1u;
    if (light_appearance_installed[light_work] != light_record) {
        /* A consumer too (plan §2.5): the 16-byte copy is expensive and the
         * admission frame is the binding one. If the token is spent the
         * install simply happens next frame - the slot renders one frame with
         * whatever the pair held, which cannot be a different Light's bitmap
         * because §2.3 rule 2 only reassigns a pair no live slot still shows.
         * DEFERRABLE (plan §4.6): visual-only, already has a pending state,
         * already tolerates a frame. The pending condition
         * (light_appearance_installed != light_record) is per PAIR and carries
         * no deferred-once bit, so unlike the breakup this claim is gated on
         * every attempt - which still adds at most one frame, because the
         * frame after a rotate frame is never a rotate frame. What the budget
         * does beyond that is unchanged from before this gate. */
        if (light_take_deferrable_token() == 0u) {
            return light_tick_result;
        }
        /* Marked as it is returned: asking the tick CONSUMES the decision, and
         * the kernel is trusted to act on that same return. Nothing calls the
         * tick twice in a frame, and nothing may start. */
        light_appearance_installed[light_work] = light_record;
        return LIGHT_RETURN_INSTALL;
    }
    return light_tick_result;
}

/* One damage unit from a player PairShot or contact. ASM calls this only for
 * an active Light, whose HP is therefore at least one. Returns 1 when lethal. */
uint8_t enemy_c_light_hit(void)
{
    light_work = (uint8_t)(light_hp[light_slot] - 1u);
    light_hp[light_slot] = light_work;
    if (light_work != 0u) {
        return 0u;
    }
    /* The slot's own erase happens in this frame's late window either way -
     * that is the cheap part. What defers is the breakup SPAWN, which is
     * MEASURED 1,063 cycles of effect allocation and the first stagger render.
     * The kill itself, its score and its sound are NOT gated: light_destroyed
     * does them unconditionally on this frame whichever return this is, so the
     * player sees and hears the kill when it lands (plan §4.6).
     *
     * This is the event's FIRST attempt, so it takes the rotate gate. Its
     * second attempt is the BREAKUP_PENDING branch of light_tick_body, which
     * is not gated at all - the forcing rule. */
    if (light_take_deferrable_token() != 0u) {
        light_state[light_slot] = ENEMY_INACTIVE;
        return LIGHT_HIT_LETHAL_NOW;
    }
    light_state[light_slot] = LIGHT_BREAKUP_PENDING;
    return LIGHT_HIT_LETHAL_DEFER;
}

#pragma code-name (pop)
#pragma rodata-name (pop)

/* Heavy formation data and policy (roadmap 4.5c), placed in the reusable
 * runtime arena $7BD0-$7F0F (4.5M-M3). */
#pragma code-name ("HYBRID_C_ARENA")
#pragma rodata-name ("HYBRID_C_ARENA_RODATA")

/* Roadmap 4.3 step 5, plan §5. "Is the playfield drained?" - no hostile
 * pressure, no live Light, no Light backing still published. It was written
 * inline inside sector_c_update_first_capital, where the whole gate set has
 * run it clean on every capital entry; extracting it by name lets roadmap
 * 4.9's level boundary reuse exactly the same test instead of writing a
 * second one that drifts.
 *
 * NOTE, deliberate deviation from the plan's literal wording: §5 quotes the
 * clause as including `CAPITAL_SECTOR_STATE != SECTOR_FIGHTER`, but §5 also
 * gives 4.9's predicate as `... && CAPITAL_SECTOR_STATE ==
 * SECTOR_CAPITAL_COMPLETE && sector_c_drain_clear() && ...`. Those two cannot
 * both hold. The sector-state test is therefore left at each call site and
 * only the drain itself is extracted, which is what the name means and what
 * makes it reusable at both boundaries. */
uint8_t sector_c_drain_clear(void)
{
    if (asm_sector_pressure_active() != 0u) {
        return 0u;
    }
    /* Step 3: every slot, live or still published. A slot that died in the
     * kill frame's late window has state 0 but a non-zero screen_hi until the
     * next window erases it, and the capital must not scroll over that cell. */
    light_slot = LIGHT_SLOT_COUNT;
    do {
        --light_slot;
        if (light_state[light_slot] != ENEMY_INACTIVE ||
            light_screen_hi[light_slot] != 0u) {
            return 0u;
        }
    } while (light_slot != 0u);
    return 1u;
}

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

/* Hull colour of the ticked member: BOMBER_HULL_HUE with the remaining HP as its
 * luminance, brightened while it charges an attack, brighter still for a few
 * frames after a hit. BOMBER_FLASH_LUMA and BOMBER_CHARGE_LUMA are added
 * unclamped, so the worst case must stay inside the hue: HP 4 ($C8) + flash 6
 * is $CE. Uses heavy_index only: heavy_scratch carries the tick's return
 * value. */
static void bomber_colour(void)
{
    heavy_index = ENEMY_HP_0_ADDRESS[HEAVY_SLOT];
    if (heavy_index != (heavy_member_aux & BOMBER_HP_MASK)) {
        heavy_member_aux = (uint8_t)(heavy_index | (BOMBER_FLASH_FRAMES << 4));
    }
    heavy_member_colour = (uint8_t)(BOMBER_HULL_HUE | (heavy_index << BOMBER_HULL_HP_LUMA));
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

/* THE HEAVY BREAK-UP CLAIM (plan-4.6-placement.md §7.4 variant 2, owner smoke
 * 2026-09-21). Called by ASM on a Heavy member's kill frame, AFTER
 * begin_enemy_fighter_explosion has captured the member's hull position, and
 * before anything decides whether to spawn fragments. Returns 1 when the
 * fragments may spawn on this very frame, 0 when they are deferred.
 *
 * It is a DEFERRABLE consumer of the one-expensive-event token in exactly the
 * sense plan-light-multiplicity.md §4.6 defines: visual only, its position is
 * already captured, and it is forced within two frames. So it claims through
 * light_take_deferrable_token, which is why that wrapper stopped being static
 * - the gate itself stays in the window with the Light's own two consumers,
 * and this third one reaches it by name rather than by a second copy.
 *
 * What is NOT gated, on either return: the kill, its score, its sound and the
 * COLBK flash. resolve_enemy_damage does all four on the kill frame whichever
 * way this answers, exactly as light_destroyed does for a Light.
 *
 * A break-up already pending is answered 0 without a claim. The effect pool
 * holds ONE break-up (EFFECT_ACTIVE_LIMIT 5 = one core + four fragments), so
 * a second Heavy member dying while the first is still pending cannot produce
 * a second cluster whatever this returns; spending a token to spawn one that
 * the pending retry would wipe a frame later is the worst of both. The
 * position the retry then uses is the SECOND member's, because
 * begin_enemy_fighter_explosion_tail has just overwritten the snapshot - the
 * truncation plan §7.6 records as owner question Q-3, resolved here in the
 * cheap direction. */
uint8_t enemy_c_heavy_breakup_claim(void)
{
    if (heavy_breakup_pending != 0u) {
        return 0u;
    }
    if (light_take_deferrable_token() != 0u) {
        return 1u;
    }
    /* Deferred once. THE FORCING RULE: the retry is in ASM, at the head of
     * update_enemy, and is not gated at all - it ignores the rotate marker and
     * the token budget alike. That is what bounds the wait at two frames with
     * no counter, exactly as the Light's BREAKUP_PENDING branch does. */
    heavy_breakup_pending = 1u;
    return 0u;
}
