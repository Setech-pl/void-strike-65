/* Roadmap 4.6 step 2 (docs/plans/director-4.6.md §2.2, §4, §8): the Director
 * reads its schedule from the level image.
 *
 * WHAT LEFT. The compiled-in level: thirteen phase arrays and five event
 * arrays, 158 B of level 1 in the runtime image, and the machinery that walked
 * them. With it went the per-phase intensity budget, the per-phase reaction
 * and recovery tables, the deferred-event queue and the phase check itself.
 * The Director no longer carries a level; it carries a READER.
 *
 * WHAT ARRIVED. `level_core` is a link-time symbol at the LevelDef core page
 * (plan §2.2), which the sector reader has already placed in the level buffer
 * by the time gameplay starts. It is indexed by absolute offsets that
 * scripts/level-compiler.mjs generates into build/level-def.h, so the reader
 * and the writer of that page cannot drift apart. There is no runtime pointer:
 * `U8_AT` is never used for level data and the cc65 audit (no ptr1, no sp)
 * stays at zero.
 *
 * THE CLOCK. One world row, as before. What the row drives is different: it
 * advances a row-in-sector counter, which ends a SPACE sector at its authored
 * length (R4) and arms WaveDefs at their authored rows (R2). The capital is no
 * longer a frame gate - that constant is retired - but the ENTRY to a
 * CAPITAL sector, which raises the same `CAPITAL_DUE` flag the rest of the
 * runtime already reads and still waits for `sector_c_drain_clear`.
 *
 * WHAT THE STATE BYTES MEAN NOW. The twelve bytes at $80F4 are reinterpreted,
 * not moved, because ASM reads five of them by address:
 *
 *   $80F4/5 world row lo/hi   unchanged
 *   $80F6   sector index      was the phase; the provisional request wrapper,
 *                             its only other reader, is retired with it
 *   $80F7   wave cursor       was the event index
 *   $80F8   intensity         unchanged in MEANING - the live hazard cost -
 *                             because provisional_capital_broadside_request
 *                             budgets against it by address
 *   $80F9   reaction          unchanged: integration_update_enemy_weapon gates
 *   $80FA   recovery          the hostile weapon on both, by address
 *   $80FB   RNG               unchanged
 *   $80FC   wave remaining    was the pending event
 *   $80FD   spacing timer     was the defer countdown
 *   $80FE   flags             unchanged: COMPLETE $01, CAPITAL_ADMITTED $40,
 *                             CAPITAL_DUE $80, all read by ASM
 *   $80FF   admission frame   unchanged
 */
#include "director.h"
#include "lifecycle.h"
#include "enemy-archetype.h"
#include "level-def.h"

#pragma code-name ("DIRECTOR_C_CODE")
#pragma rodata-name ("DIRECTOR_C_RODATA")

#define U8_AT(address) (*(volatile uint8_t*)(address))

#define DIFFICULTY_SETTING       U8_AT(0x4E70u)
#define FRAME_COUNTER            U8_AT(0x0086u)
#define CAPITAL_SECTOR_STATE     U8_AT(0x4EA5u)
/* feat/sector-flow: the Heavy formation's state, the kernel's byte (0 none,
 * 1 active, 2 exploding) - read, never written, by the sector flow. */
#define ENEMY_ACTIVE             U8_AT(0x4ECDu)

#define STATE_ROW_LO             U8_AT(0x80F4u)
#define STATE_ROW_HI             U8_AT(0x80F5u)
#define STATE_SECTOR             U8_AT(0x80F6u)
#define STATE_WAVE_CURSOR        U8_AT(0x80F7u)
#define STATE_INTENSITY          U8_AT(0x80F8u)
#define STATE_REACTION           U8_AT(0x80F9u)
#define STATE_RECOVERY           U8_AT(0x80FAu)
#define STATE_RNG                U8_AT(0x80FBu)
#define STATE_WAVE_REMAINING     U8_AT(0x80FCu)
#define STATE_SPACING            U8_AT(0x80FDu)
#define STATE_FLAGS              U8_AT(0x80FEu)
#define STATE_ADMISSION_FRAME    U8_AT(0x80FFu)

#define CAPITAL_HULL_STATE_DRAIN 5u
#define CAPITAL_HULL_STATE_OPEN  7u

#define HAZARD_HEAVY             0u
#define HAZARD_DEBRIS            1u
#define HAZARD_PICKUP            3u

#define FLAG_COMPLETE            0x01u
#define FLAG_CAPITAL_ADMITTED    0x40u
#define FLAG_CAPITAL_DUE         0x80u
/* M5b-S3 (docs/plans/m5-loading-boss.md §4.4): raised on entering the BOSS
 * sector; sector_c_update_first_capital waits for the drain and calls the
 * boss entry. */
#define FLAG_BOSS_DUE            0x20u
#define FLAG_NOT_ADMITTED        0xBFu

/* SectorDef `sector_kind`: bits 0-1 kind, 4-5 subtype, bit 7 last (plan §2.2). */
#define SECTOR_KIND_MASK         0x03u
#define SECTOR_KIND_SPACE        0u
#define SECTOR_KIND_CAPITAL      1u
#define SECTOR_KIND_BOSS         2u
#define SECTOR_SUBTYPE_ELITE     0x10u
/* `sector_hazards`: bits 0-1 debris live, 2 pickups, 3 broadside. */
#define HAZARD_BIT_PICKUPS       0x04u
#define HAZARD_BIT_BROADSIDE     0x08u
#define HAZARD_DEBRIS_MASK       0x03u
/* `wave_flags`: bits 0-1 appearance, 2 mirror, 3 Heavy class, 4 after-cleared. */
#define WAVE_FLAG_APPEARANCE     0x03u
#define WAVE_FLAG_HEAVY          0x08u
#define WAVE_FLAG_AFTER_CLEARED  0x10u
/* Roadmap 4.6 step 5: a payload look's key is $80 | slot << 4 ($90, $A0,
 * $B0), which no archetype offset (0-36) can equal; 0 means "the archetype's
 * own art" (plan §8.3). */
#define LIGHT_LOOK_PAYLOAD       0x80u
/* `sector_caps`: low nibble Light, high nibble Heavy. */
#define CAPS_LIGHT_MASK          0x0Fu

extern uint8_t asm_director_can_allocate(void);
/* Roadmap 4.6 step 5 (plan §8.3, budget-1.0 M2 variant S2): the sector's sky
 * is the near-star pixel value, 1 white / 2 allied steel / 3 yellow. ASM owns
 * the write - it patches the immediate operand the star publish draws with,
 * in HYBRID_ASM_ARENA - and C only decides when: at sector entry, and only
 * there. fastcall: the byte travels in A, no C stack. */
extern void __fastcall__ asm_publish_star_pixel(uint8_t look);
/* The LevelDef core page: a link-time symbol at the level buffer, declared in
 * src/hybrid/c-asm-abi.s from the compiler's own generated address. Nothing is
 * linked into it - the sector reader fills it from the level image. */
/* The LevelDef core page, as the structure of arrays it is (design-4.6 §1,
 * plan §2.2). DEFINED here, in a bss segment the Director's link config places
 * at the page's address with `file = ""` - plan §3.4's "link-time symbols of a
 * LEVEL_BUFFER-typed segment". No bytes are emitted into any artifact and no
 * transport byte is spent: the sector reader fills the level buffer from the
 * level image on both media. src/hybrid/c-asm-abi.s asserts at LINK time that
 * every one of these landed on the offset scripts/level-compiler.mjs writes,
 * so a reordering here is a link error rather than a silent misread.
 *
 * Declared array by array rather than as one 256-byte page because cc65
 * compiles a subscript of a 256-byte array into generic pointer arithmetic -
 * `sta ptr1 / lda (ptr1),y` - which the C-stack and zero-page audit in
 * scripts/build.mjs rejects outright. Each array here is at most 20 bytes, so
 * every field read is one absolute indexed load. MEASURED both ways. */
#pragma bss-name ("LEVEL_CORE")
uint8_t level_header[CORE_HEADER_BYTES];
uint8_t sector_kind[LEVEL_MAX_SECTORS];
uint8_t sector_len[LEVEL_MAX_SECTORS];
uint8_t sector_caps[LEVEL_MAX_SECTORS];
uint8_t sector_archetypes[LEVEL_MAX_SECTORS];
uint8_t sector_hazards[LEVEL_MAX_SECTORS];
uint8_t sector_wave_first[LEVEL_MAX_SECTORS];
uint8_t sector_wave_count[LEVEL_MAX_SECTORS];
uint8_t sector_look[LEVEL_MAX_SECTORS];
uint8_t wave_row[LEVEL_MAX_WAVES];
uint8_t wave_flags[LEVEL_MAX_WAVES];
uint8_t wave_archetype[LEVEL_MAX_WAVES];
uint8_t wave_path[LEVEL_MAX_WAVES];
uint8_t wave_count[LEVEL_MAX_WAVES];
uint8_t wave_spacing[LEVEL_MAX_WAVES];
uint8_t wave_entry[LEVEL_MAX_WAVES];
uint8_t wave_member_offset[LEVEL_MAX_WAVES];
#pragma bss-name ("BSS")

#pragma bss-name ("DIRECTOR_C_BSS")
volatile uint8_t director_event_opcode_abi;
volatile uint8_t director_event_arg0_abi;
volatile uint8_t director_argument_abi;
static uint8_t director_scratch0;
static uint8_t director_scratch1;
static uint8_t director_scratch2;
static uint8_t director_scratch3;
#pragma bss-name ("BSS")

/* The sector's own row clock, and three results that may not be returned into
 * an expression: cc65 widens a call's value to int, so a call used as an array
 * subscript or as one side of a comparison builds ptr1 or pushes the C
 * software stack, and the audit in scripts/build.mjs refuses the module either
 * way. The bytes come from the unowned gap above HYBRID_HEAVY_BREAKUP
 * (plan §3.4).
 *
 * There is NO published copy of the SectorDef. Every field is read straight
 * out of the core page by STATE_SECTOR - `ldy $80F6 / lda _sector_caps,y` -
 * which costs two cycles more than an absolute load, on paths that run at most
 * once per admission or once per world row. In exchange the sector index is
 * the WHOLE of the Director's sector state: a harness that pokes $80F6 selects
 * a sector completely, with no second copy to keep in step. */
#pragma bss-name ("DIRECTOR_SECTOR_STATE")
volatile uint8_t sector_row_lo;
volatile uint8_t sector_row_hi;
static uint8_t wave_end;
static uint8_t ceiling_row;
static uint8_t sector_field;
#pragma bss-name ("BSS")

/* The armed wave's Heavy half, consumed by enemy_c_spawn_raiders. These two
 * bytes take the place of the retired smoke-scheduler counters and
 * encounter_light_index in the same area. */
#pragma bss-name ("HYBRID_ENCOUNTER_STATE")
volatile uint8_t heavy_escort_offset;
volatile uint8_t heavy_wave_flags;
#pragma bss-name ("BSS")

/* The runtime's own ceilings by sector kind and subtype (plan §3.4, decision
 * 23 §10.7). A level file may ask for less; it may never ask for more. Index 0
 * SWARM, 1 ELITE, 2 CAPITAL, 3 BOSS. The CAPITAL row exists and is zero so
 * that paying for plan §5.1 later is a table VALUE, not a format change. */
const uint8_t subtype_ceiling_light[4] = { 3u, 1u, 0u, 1u };
const uint8_t subtype_ceiling_heavy[4] = { 0u, 2u, 0u, 0u };
/* Class spacing floors in frames: Light is light_wave_step's admission floor,
 * Heavy the fastest interceptor_admission_retry_frames. A wave asking for less
 * is clamped up to these (plan §5, the runtime half). */
const uint8_t class_spacing_floor[2] = { 16u, 24u };
static const uint8_t hazard_costs[4] = { 1u, 1u, 2u, 0u };
/* World rows between hazard admissions, by difficulty. The retired per-phase
 * reaction tables gave a row per phase and a column per difficulty; with the
 * phases gone, one value per column stands for the whole level, and the one
 * taken is the ALL-HAZARDS phase's - phase 3, the policy most of level 1 ran
 * under, and the policy the retired request wrapper borrowed whenever it
 * wanted a decision made. MEASURED against the capital corridor's debris
 * cadence, which is the clause that feels this byte: the corridor's longest
 * empty gap on EASY is 88 frames, against 120 on the build this replaced.
 * Rows, not frames: the countdown lives in the world row tick, as the
 * reaction and recovery countdowns always have. */
static const uint8_t hazard_reaction_rows[3] = { 32u, 28u, 24u };
/* How much live hazard cost may stand at once, by difficulty. The retired
 * per-phase budget tables varied this along the level and peaked at 3 / 4 / 5;
 * the PEAK is what is kept, because the shaping the phases did is the sector's
 * own hazard mask now - a sector that wants no debris says so, and a sector
 * that wants no broadside says so, instead of a phase number deciding it for
 * the whole level. Two broadside shells at cost two each are exactly the
 * MEDIUM ceiling, which is what keeps the pair reachable. */
static const uint8_t hazard_budget[3] = { 3u, 4u, 5u };

/* feat/sector-flow (docs/plans/sector-flow.md): the three rules' window
 * functions, defined after advance_sector, which they call. */
static void advance_sector(void);
static void director_c_arm_wave(void);

#pragma code-name ("HYBRID_C_WINDOW")
#pragma rodata-name ("HYBRID_C_WINDOW_RODATA")

/* Which ceiling row this sector uses. Written to a static and not returned:
 * cc65 widens a call's result to int, so using one as an array subscript
 * builds ptr1 and the zero-page audit refuses the module. */
static void compute_ceiling_row(void)
{
    director_scratch3 = STATE_SECTOR;
    sector_field = sector_kind[director_scratch3];
    director_scratch0 = sector_field & SECTOR_KIND_MASK;
    if (director_scratch0 == SECTOR_KIND_CAPITAL) {
        ceiling_row = 2u;
        return;
    }
    if (director_scratch0 == SECTOR_KIND_BOSS) {
        ceiling_row = 3u;
        return;
    }
    if ((sector_field & SECTOR_SUBTYPE_ELITE) != 0u) {
        ceiling_row = 1u;
        return;
    }
    ceiling_row = 0u;
}

/* min(requested, runtime ceiling) - plan §5's runtime enforcement for
 * population. The Light class asks the same question on its own admission
 * path, so this is the one place the answer is computed. */
uint8_t director_c_light_ceiling(void)
{
    compute_ceiling_row();
    director_scratch1 = subtype_ceiling_light[ceiling_row];
    director_scratch3 = STATE_SECTOR;
    director_scratch2 = sector_caps[director_scratch3] & CAPS_LIGHT_MASK;
    if (director_scratch2 < director_scratch1) {
        return director_scratch2;
    }
    return director_scratch1;
}

static uint8_t heavy_ceiling(void)
{
    compute_ceiling_row();
    director_scratch1 = subtype_ceiling_heavy[ceiling_row];
    director_scratch3 = STATE_SECTOR;
    director_scratch2 = (uint8_t)(sector_caps[director_scratch3] >> 4);
    if (director_scratch2 < director_scratch1) {
        return director_scratch2;
    }
    return director_scratch1;
}

#pragma code-name ("DIRECTOR_C_PRE")
#pragma rodata-name ("DIRECTOR_C_RODATA")
uint8_t director_c_rng_advance(void)
{
    STATE_RNG = (uint8_t)((STATE_RNG << 2) + STATE_RNG + 1u);
    return STATE_RNG;
}

#pragma code-name ("HYBRID_C_WINDOW")

/* Arm the WaveDef the cursor names: its members become admissible, one every
 * `spacing` frames, until `count` of them have been taken. A Light wave is
 * handed to the window's stepper through the bytes it already owns; a Heavy
 * wave is answered by director_c_request when the kernel's retry asks.
 *
 * `wave_count` is a REQUEST, not a promise: the ceilings and the physical
 * capacity can refuse every one of its members and the wave still finishes.
 *
 * This is what director_try_event names now, so the native trace's Director
 * event counter keeps counting the Director's own scheduling decisions. */
uint8_t director_c_try_event(void)
{
    director_scratch0 = STATE_WAVE_CURSOR;
    heavy_wave_flags = wave_flags[director_scratch0];
    STATE_WAVE_REMAINING = wave_count[director_scratch0];
    /* The wave's composition is published HERE, not at admission: the cursor
     * moves on as soon as the wave is armed, so that when the last member has
     * been taken the row tick has nothing left to do but look at the next
     * wave's row. A Heavy request therefore reads two published bytes instead
     * of indexing the page again. */
    heavy_archetype_offset = wave_archetype[director_scratch0];
    heavy_escort_offset = wave_member_offset[director_scratch0];
    /* spacing = max(authored, class floor). */
    director_scratch1 = wave_spacing[director_scratch0];
    if ((heavy_wave_flags & WAVE_FLAG_HEAVY) != 0u) {
        director_scratch2 = class_spacing_floor[1];
    } else {
        director_scratch2 = class_spacing_floor[0];
    }
    if (director_scratch1 < director_scratch2) {
        director_scratch1 = director_scratch2;
    }
    light_wave_spacing_frames = director_scratch1;
    STATE_SPACING = 0u;                 /* the first member is admissible now */
    /* Roadmap 4.6 step 5: the wave's look, for its Lights or - on a Heavy
     * wave - its escort. Published here with the rest of the composition, so
     * light_admit reads one byte whichever path admits. */
    director_scratch2 = (uint8_t)((heavy_wave_flags & WAVE_FLAG_APPEARANCE) << 4);
    if (director_scratch2 != 0u) {
        director_scratch2 |= LIGHT_LOOK_PAYLOAD;
    }
    light_wave_look = director_scratch2;
    if ((heavy_wave_flags & WAVE_FLAG_HEAVY) != 0u) {
        STATE_WAVE_CURSOR = (uint8_t)(director_scratch0 + 1u);
        return 1u;
    }
    /* A Light wave runs in the code window at one admission attempt per frame.
     * The lock is what keeps a swarm and a Heavy formation from coexisting:
     * _asm_director_can_allocate refuses the ASM Heavy retry while it is up. */
    light_wave_archetype = heavy_archetype_offset;
    light_wave_entry = wave_entry[director_scratch0];
    light_wave_remaining = STATE_WAVE_REMAINING;
    light_wave_timer = 0u;
    light_wave_lock = 1u;
    STATE_WAVE_REMAINING = 0u;          /* the window's counter owns it now */
    STATE_WAVE_CURSOR = (uint8_t)(director_scratch0 + 1u);
    return 1u;
}

/* The cursor's exclusive end inside the current sector. Written to a static
 * rather than returned into a comparison: cc65 pushes a call's result on the C
 * software stack when it is one operand of a compare, and the audit requires
 * zero stack use. */
static void compute_wave_end(void)
{
    director_scratch3 = STATE_SECTOR;
    director_scratch1 = sector_wave_first[director_scratch3];
    director_scratch2 = sector_wave_count[director_scratch3];
    wave_end = (uint8_t)(director_scratch1 + director_scratch2);
}

/* Enter sector STATE_SECTOR: publish its policy, restart its row clock and
 * point the cursor at its first wave. CAPITAL raises the same DUE flag the
 * retired frame gate raised; the entry itself still waits for the drain. */
static void enter_sector(void)
{
    director_scratch3 = STATE_SECTOR;
    sector_row_lo = 0u;
    sector_row_hi = 0u;
    STATE_WAVE_CURSOR = sector_wave_first[director_scratch3];
    STATE_WAVE_REMAINING = 0u;
    STATE_SPACING = 0u;
    light_wave_lock = 0u;
    light_wave_remaining = 0u;
    /* Roadmap 4.6 step 5: the sky changes here and nowhere else. The look's
     * low nibble is the sector's star pixel, resolved by the compiler. */
    asm_publish_star_pixel(sector_look[director_scratch3]);
    director_scratch0 = sector_kind[director_scratch3] & SECTOR_KIND_MASK;
    if (director_scratch0 == SECTOR_KIND_CAPITAL) {
        STATE_FLAGS |= FLAG_CAPITAL_DUE;
    }
    /* M5b-S3: the boss sector's escort waits for the boss. A Light armed now
     * would keep the drain from ever clearing; the install arms the row-0
     * wave once the boss is in, and the world stops, so no later row arms. */
    if (director_scratch0 == SECTOR_KIND_BOSS) {
        STATE_FLAGS |= FLAG_BOSS_DUE;
        return;
    }
    /* A wave authored on row 0 arms as the sector opens. */
    compute_wave_end();
    if (STATE_WAVE_CURSOR == wave_end) {
        return;
    }
    director_scratch0 = STATE_WAVE_CURSOR;
    if (wave_row[director_scratch0] == 0u) {
        director_c_arm_wave();
    }
}

#pragma code-name ("DIRECTOR_C_LOW")
void director_c_init(void)
{
    STATE_ROW_LO = 0u;
    STATE_ROW_HI = 0u;
    STATE_SECTOR = 0u;
    STATE_WAVE_CURSOR = 0u;
    STATE_INTENSITY = 0u;
    STATE_REACTION = 0u;
    STATE_RECOVERY = 0u;
    STATE_WAVE_REMAINING = 0u;
    STATE_SPACING = 0u;
    STATE_FLAGS = 0u;
    STATE_ADMISSION_FRAME = (uint8_t)(FRAME_COUNTER - 1u);
    /* The level's own seed, decorrelated per difficulty exactly as the caller's
     * was (start_gameplay passed 0x6D ^ DIFFICULTY_SETTING). A level authoring
     * the byte as $6D therefore keeps today's three RNG streams; any other
     * value gives that level its own. */
    STATE_RNG = (uint8_t)(level_header[CORE_SEED] ^ DIFFICULTY_SETTING);
    lifecycle_c_init();
    /* Fail closed, never a jump: a page whose magic this runtime does not know
     * completes the level immediately rather than executing its bytes. */
    if (level_header[CORE_MAGIC] != LEVEL_CORE_MAGIC) {
        STATE_FLAGS = FLAG_COMPLETE;
        return;
    }
#ifdef LEVEL_DEBUG_START
    /* Review builds only (plan §7). The default build has no such code path -
     * the byte exists in every image, but only a --level=N:sector=M build
     * reads it. */
    STATE_SECTOR = level_header[CORE_DEBUG_START_SECTOR];
#endif
    enter_sector();
}

#pragma code-name ("DIRECTOR_C_CODE")
#pragma rodata-name ("DIRECTOR_C_RODATA")

/* The next sector, or the end of the level. */
static void advance_sector(void)
{
    director_scratch0 = (uint8_t)(STATE_SECTOR + 1u);
    director_scratch1 = level_header[CORE_SECTOR_COUNT];
    if (director_scratch0 >= director_scratch1) {
        STATE_FLAGS |= FLAG_COMPLETE;
        return;
    }
    STATE_SECTOR = director_scratch0;
    enter_sector();
}

#pragma code-name ("HYBRID_C_WINDOW")

/* feat/sector-flow (docs/plans/sector-flow.md, gameplay-variety.md §3.8, owner
 * answer Q10: the default for every level). Three rules, each a verdict taken
 * here in the window so that DIRECTOR_RAM pays only for the calls. They run on
 * world-row ticks of a SPACE sector only: the capital and boss branches of the
 * tick return before any of them.
 *
 * The field is BUSY while a Heavy formation is on screen - active or
 * exploding, as clause L3 counts it - or any Light slot is occupied, a pending
 * break-up included. An escort that outlives its leader keeps the field busy
 * (the owner's "cleared", Q10). The OR of the five bytes is the answer: zero
 * is a clear field. Constant indices: five absolute loads. */
static uint8_t field_busy(void)
{
    return (uint8_t)(ENEMY_ACTIVE | light_state[0] | light_state[1] |
                     light_state[2] | light_state[3]);
}

/* Rule 2, afterCleared (`wave_flags` bit 4, compiled since roadmap 4.6 step
 * 1): the cursor's wave arms when its row has been reached AND the field is
 * clear; the row stays the minimum. Refused, the cursor does not move and the
 * next row tick asks again. director_c_try_event itself stays unconditional:
 * the boss install arms its escort through it, and the world never scrolls
 * again in the boss sector, so no later row could retry a refusal. */
static void director_c_arm_wave(void)
{
    if ((wave_flags[STATE_WAVE_CURSOR] & WAVE_FLAG_AFTER_CLEARED) != 0u) {
        if (field_busy() != 0u) {
            return;
        }
    }
    director_c_try_event();
}

/* Rule 1, the early end: the tick reaches this only with the cursor past the
 * sector's last wave, no Heavy formation still to admit and the Light lock
 * down. A clear field then ends the sector at once, and the authored row count
 * is only the no-kill cut. A sector that authors no wave is a timed stretch
 * and keeps its rows. */
static void director_c_sector_spent(void)
{
    if (sector_wave_count[STATE_SECTOR] == 0u) {
        return;
    }
    if (field_busy() == 0u) {
        advance_sector();
    }
}

/* Rule 3, C1 (w2-lights.md §3.4, the M4 prerequisite): the row count is
 * reached. The members not yet admitted are cancelled - enter_sector would
 * cancel them a tick later anyway - so a hold waits only for what is live.
 * The end is then held, the world scrolling on, while the population exceeds
 * the NEXT space sector's ceilings: a Heavy formation on screen where it
 * admits none (read as zero / non-zero, because heavy_request admits a whole
 * pair under any non-zero ceiling), or more live Lights than its Light
 * ceiling. Each row tick asks again. The ceilings are the existing look-ups,
 * asked with STATE_SECTOR stepped to the next sector and back (no ASM reads
 * $80F6 outside the boss install, which runs in the main loop). A capital or
 * a boss is not held here: both entries already wait for a full drain. */
static void director_c_sector_cut(void)
{
    STATE_WAVE_REMAINING = 0u;
    light_wave_remaining = 0u;
    director_scratch0 = (uint8_t)(STATE_SECTOR + 1u);
    if (director_scratch0 < level_header[CORE_SECTOR_COUNT]) {
        if ((sector_kind[director_scratch0] & SECTOR_KIND_MASK) == SECTOR_KIND_SPACE) {
            ++STATE_SECTOR;
            /* One pass; a break is a hold. Not a goto: cc65 spends two words
             * of DIRECTOR_C_RODATA on a function's labels. */
            do {
                if (ENEMY_ACTIVE != 0u) {
                    if (heavy_ceiling() == 0u) {
                        break;
                    }
                }
                director_scratch1 = director_c_light_ceiling();
                director_scratch2 = 0u;
                director_scratch3 = LIGHT_SLOT_COUNT_ABI;
                do {
                    --director_scratch3;
                    if (light_state[director_scratch3] != 0u) {
                        ++director_scratch2;
                    }
                } while (director_scratch3 != 0u);
                if (director_scratch2 > director_scratch1) {
                    break;
                }
                --STATE_SECTOR;
                advance_sector();
                return;
            } while (0);
            --STATE_SECTOR;
            return;
        }
    }
    advance_sector();
}

#pragma code-name ("DIRECTOR_C_CODE")

void director_c_world_row_tick(void)
{
    if ((STATE_FLAGS & FLAG_COMPLETE) != 0u) {
        return;
    }
    STATE_ROW_LO = (uint8_t)(STATE_ROW_LO + 1u);
    if (STATE_ROW_LO == 0u) {
        STATE_ROW_HI = (uint8_t)(STATE_ROW_HI + 1u);
    }
    sector_row_lo = (uint8_t)(sector_row_lo + 1u);
    if (sector_row_lo == 0u) {
        sector_row_hi = (uint8_t)(sector_row_hi + 1u);
    }
    if (STATE_REACTION != 0u) {
        --STATE_REACTION;
    }
    if (STATE_RECOVERY != 0u) {
        --STATE_RECOVERY;
    }

    director_scratch3 = STATE_SECTOR;
    director_scratch0 = sector_kind[director_scratch3] & SECTOR_KIND_MASK;
    if (director_scratch0 == SECTOR_KIND_CAPITAL) {
        /* The hull traversal is this sector's clock, not an authored length.
         * It ends where the reconstruction pass leaves the sector OPEN again,
         * which is the one transition both media publish. */
        if ((STATE_FLAGS & FLAG_CAPITAL_ADMITTED) != 0u &&
            CAPITAL_SECTOR_STATE == CAPITAL_HULL_STATE_OPEN) {
            STATE_FLAGS &= FLAG_NOT_ADMITTED;
            advance_sector();
        }
        return;
    }
    /* M5b-S3: the boss sector ends at the boss's death, not on a row, and its
     * escort is armed by the boss install once the boss is in (plan §5.2): a
     * row tick while the entry waits for the drain must not arm it early. */
    if (director_scratch0 == SECTOR_KIND_BOSS) {
        return;
    }
    if (director_scratch0 == SECTOR_KIND_SPACE) {
        /* sector_len is in 8-row modules: split it into a row hi/lo pair
         * rather than widening the row to 16 bits, which cc65 would do on the
         * C software stack. */
        sector_field = sector_len[director_scratch3];
        director_scratch1 = (uint8_t)(sector_field >> 5);
        if (sector_row_hi > director_scratch1) {
            director_c_sector_cut();
            return;
        }
        if (sector_row_hi == director_scratch1) {
            director_scratch1 = (uint8_t)(sector_field << 3);
            if (sector_row_lo >= director_scratch1) {
                director_c_sector_cut();
                return;
            }
        }
    }

    /* The armed wave holds the cursor until it is spent: STATE_WAVE_REMAINING
     * for a Heavy wave, the window's lock for a Light one. */
    if (STATE_WAVE_REMAINING != 0u) {
        if (STATE_SPACING != 0u) {
            --STATE_SPACING;
        }
        return;
    }
    if (light_wave_lock != 0u) {
        return;
    }
    compute_wave_end();
    director_scratch0 = STATE_WAVE_CURSOR;
    if (director_scratch0 == wave_end) {
        director_c_sector_spent();
        return;
    }
    /* wave_row is in modules, like sector_len. */
    director_scratch1 = wave_row[director_scratch0];
    director_scratch2 = (uint8_t)(director_scratch1 >> 5);
    if (sector_row_hi < director_scratch2) {
        return;
    }
    if (sector_row_hi == director_scratch2) {
        director_scratch2 = (uint8_t)(director_scratch1 << 3);
        if (sector_row_lo < director_scratch2) {
            return;
        }
    }
    director_c_arm_wave();
}

#pragma code-name ("DIRECTOR_C_CODE")

#pragma code-name ("HYBRID_C_WINDOW")

/* Did the sector's mask admit this record? director_scratch0 is a byte offset
 * into the frozen four-record roster, so the bit is offset/12 (ROSTER FREEZE,
 * decision 21: nothing in a level file can name code). */
static uint8_t archetype_allowed(void)
{
    director_scratch1 = 1u;
    director_scratch2 = director_scratch0;
    while (director_scratch2 >= 12u) {
        director_scratch2 = (uint8_t)(director_scratch2 - 12u);
        director_scratch1 = (uint8_t)(director_scratch1 << 1);
    }
    director_scratch2 = STATE_SECTOR;
    return (uint8_t)(sector_archetypes[director_scratch2] & director_scratch1);
}

#pragma code-name ("DIRECTOR_C_CODE")

/* The Heavy half of a request: is the armed wave a Heavy wave with formations
 * left, has its spacing elapsed, is its archetype inside the sector's mask, is
 * there room under the effective ceiling, and will ASM allocate? On yes it
 * publishes the formation's archetype and escort for enemy_c_spawn_raiders. */
static uint8_t heavy_request(void)
{
    if (STATE_WAVE_REMAINING == 0u) {
        return 0u;
    }
    if ((heavy_wave_flags & WAVE_FLAG_HEAVY) == 0u) {
        return 0u;
    }
    if (STATE_SPACING != 0u) {
        return 0u;
    }
    if (heavy_ceiling() == 0u) {
        return 0u;
    }
    director_scratch0 = heavy_archetype_offset;
    if (archetype_allowed() == 0u) {
        return 0u;
    }
    if (asm_director_can_allocate() == 0u) {
        return 0u;
    }
    --STATE_WAVE_REMAINING;
    STATE_SPACING = light_wave_spacing_frames;
    return 1u;
}

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

    if (director_scratch3 == HAZARD_HEAVY) {
        if (heavy_request() == 0u) {
            return 0u;
        }
        /* The formation's live cost, so that the release veneer stays
         * symmetric and provisional_capital_broadside_request - which budgets
         * against this byte by address - still sees a Heavy on screen.
         *
         * No REACTION charge, though. The retired wrapper saved the reaction
         * byte, zeroed it, let director_c_request overwrite it and then
         * restored the saved value, so a Heavy admission never actually
         * charged one; charging it now would silence the hostile weapon for a
         * wave's spacing after every formation, because
         * integration_update_enemy_weapon gates on reaction|recovery. The
         * wave's own spacing already paces the admissions. */
        STATE_INTENSITY = (uint8_t)(STATE_INTENSITY + hazard_costs[HAZARD_HEAVY]);
        director_c_rng_advance();
        return 1u;
    }

    if ((uint8_t)(STATE_RECOVERY | STATE_REACTION) != 0u) {
        return 0u;
    }
    director_scratch0 = STATE_SECTOR;
    sector_field = sector_hazards[director_scratch0];
    /* The hazard mask is the sector's, not a phase's. Debris keeps the one
     * exception it always had: it stays admissible through the capital
     * traversal whatever the sector says, because the capital's own debris is
     * what fills its corridor. */
    if (director_scratch3 == HAZARD_DEBRIS) {
        if ((sector_field & HAZARD_DEBRIS_MASK) == 0u &&
            CAPITAL_SECTOR_STATE >= CAPITAL_HULL_STATE_DRAIN) {
            return 0u;
        }
    } else if (director_scratch3 == HAZARD_PICKUP) {
        if ((sector_field & HAZARD_BIT_PICKUPS) == 0u) {
            return 0u;
        }
    } else {
        if ((sector_field & HAZARD_BIT_BROADSIDE) == 0u) {
            return 0u;
        }
    }

    /* The live-cost ceiling, and the byte
     * provisional_capital_broadside_request budgets against by address. */
    director_scratch2 = (uint8_t)(hazard_costs[director_scratch3] + STATE_INTENSITY);
    director_scratch1 = hazard_budget[DIFFICULTY_SETTING];
    if (director_scratch2 > director_scratch1) {
        return 0u;
    }
    if (asm_director_can_allocate() == 0u) {
        return 0u;
    }

    STATE_INTENSITY = director_scratch2;
    STATE_REACTION = hazard_reaction_rows[DIFFICULTY_SETTING];
    director_c_rng_advance();
    return 1u;
}

#pragma code-name ("HYBRID_C_WINDOW")

void director_c_release(void)
{
    director_scratch0 = hazard_costs[director_argument_abi];
    if (STATE_INTENSITY < director_scratch0) {
        STATE_INTENSITY = 0u;
    } else {
        STATE_INTENSITY = (uint8_t)(STATE_INTENSITY - director_scratch0);
    }
}
