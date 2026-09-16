# Hybrid C/cc65 architecture

Status: **Hybrid C Director is owner-accepted and is now the project
foundation.** Branch `experiment/hybrid-c-director` contains the accepted
Director plus the first follow-on increment: C owns the sector/high-level enemy
lifecycle boundary and describes the current Raider through a compact
`EnemyArchetype` (accepted at `2df89da`). The Light Wingman (record 1,
`ed72e25`/`5f2f3ae`) is owner-accepted; see [STATUS.md](STATUS.md).

Evidence is recorded in
`docs/diagnostics/hybrid-c-director-behavior-ab.json`,
`docs/diagnostics/hybrid-c-director-native-control-flow-fix.json`,
`docs/diagnostics/hybrid-c-director-pal-ab.json`, and
`docs/diagnostics/hybrid-c-lifecycle-enemy-archetype-foundation.json`.

## Purpose

The hybrid model assigns high-level, extensible game policy to cc65 C while
retaining the deterministic Atari hardware kernel in ca65. Migrations preserve
existing behavior first. Hardware-sensitive execution and publication remain
in ASM; C decides what high-level transition or action should occur.

## C responsibilities

`src/c/director.c` owns the existing Encounter Director:

- its twelve-byte semantic state, phases and timers;
- Level 1 scheduling, deferral, completion and difficulty tables;
- admission/intensity accounting and its private `5*x+1` RNG;
- existing event, pickup-policy and variant decisions.

`src/c/lifecycle.c` now owns:

- authoritative high-level sector state at `$4EA5`;
- fighter state and the existing capital entry, phase and exit transitions;
- the explicit future boss-state handoff contract;
- authoritative Raider archetype, active/member-state, HP and live-count fields;
- existing two-Raider admission, retirement, damage and recycle decisions;
- a compact ASM-readable cache derived from the selected archetype.

The current `EnemyArchetype` contract is deliberately 8-bit-oriented and is
not a speculative entity framework:

```c
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
```

Record 0 is Raider: HP 1, Raider cross/pursuit behavior 0, PairShot
burst policy 1, 5 shots at 15-frame intervals, post-burst pauses 60/50/40,
two-Heavy-PMG renderer class 1, red PairShot weapon class 1, BCD score `$10`,
and Director value 1. Both current Heavy slots select that record.

Record 1 is the Light Wingman (owner-accepted M1): HP 1 (the
Heavy is already at the one-hit minimum, so "lower HP" is equal HP),
wingman-follow behavior 1, single-shot policy 2, burst count 1 with no
interval, pauses 96/80/64 frames for EASY/MEDIUM/HARD, character 2x1 renderer
class 2, red PairShot weapon class 1, BCD score `$05`, Director value 1. The
Light is admitted together with each Raider formation, so it consumes no extra
Director request; its Director value is recorded for later wave budgeting.

C additionally owns the single Light record in `$8100-$8105`: state, HP, X
(four-aligned HPOS), Y, fire timer and leaderless latch; the formation is a
fixed centred offset behind Heavy slot 0. The ASM kernel owns only the render cache (screen pointer, two backing
bytes) and two scratch bytes of that block; C writes the render cache solely
at game initialization, when the playfield is rebuilt.

## Enemy classes and Light slot ownership

Normative, owner-fixed (owner decision 15, 2026-09-16). Do not reopen without a
new owner decision.

**Heavy class.** PMG players `P1`/`P2` belong to the Heavy enemy class. They are
never allocated to a Light-class enemy. A Light-class enemy must not be
implemented as a smaller PMG Raider.

**Light class.** Light-class enemies use the character renderer
(`ENEMY_RENDERER_CHARACTER_2X1`) and allocate no PMG player. The current
capacity is:

```text
LIGHT_ACTIVE_MAX = 1
```

#### Accepted runtime today

The accepted runtime still hardcodes

```text
Light == Wingman == enemy_archetypes[1]
```

The Light record, its HP, fire cadence and its ASM score lookup all name index 1
directly. `light_archetype_offset` **does not exist in the accepted ABI**; the
ABI symbols are exactly those listed under *Calling convention and ABI* below.

#### Approved future invariant

The single Light slot **must become archetype-selectable** — `Wingman OR
Interceptor`, not `Wingman AND Interceptor` — before any Interceptor can be
accepted. No code may then hardcode "Light == archetype index 1".

#### Blocked experiment evidence (not accepted ABI)

The 2026-09-16 experiment proved a design for that invariant: one C-owned byte
holding the byte offset of the active record inside `enemy_archetypes[]`
(`12` = Wingman, `24` = Interceptor), indexed by both C and ASM, with the ASM
score add changed from an absolute to an absolute,X read so its fixed 17-byte
pad stayed exact.

That design is **evidence, not contract**. It is `BLOCKED_PLACEMENT`: the
generalization plus a third archetype exceeds the `HYBRID_C_EXT_RAM` area by
75 B in its reduced form and 126 B with per-frame pursuit. Byte accounting and
the recovery candidate are in
[diagnostics/stage-2b2c-interceptor-blocked-placement.json](diagnostics/stage-2b2c-interceptor-blocked-placement.json);
the unbuildable tree is on `experiment/interceptor-blocked-placement`.

Do not write those fields or offsets into any document or ABI table as though
they already exist. The invariants in this section stand regardless; only the
implementation waits on resident capacity (roadmap step 4.3).

The long-term target is `2 Heavy + up to 4 Light` active threats, reached
incrementally (`1 -> 2 -> up to 4` Light slots). Do not implement that capacity
before a task requires it.

**Shared renderer.** Wingman and Interceptor share one renderer class and one
ASM kernel. Adding a Light-class archetype must not introduce PMG allocation,
PMG multiplexing, another renderer architecture, a global compositor, or a new
raster-ownership architecture.

**Ownership split for the Light slot.** C owns archetype selection, lifecycle,
movement behavior, fire policy, HP, score and admission/recycle. ASM owns
character publication, backing/restore, PairShot publication, hot collision and
hardware-sensitive execution.

## ASM responsibilities

ca65 remains authoritative for VBI/DLI, ANTIC/display-list/raster work, PMG P0
through P3, Heavy sprite and PairShot publication, character-ring
backing/restore, hot collisions, coordinate integration/manoeuvre execution,
audio hot paths, hardware writes, low-level rendering, loader, and XEX/ATR entry.
ASM also owns damage-source mailboxes; C consumes them at one coarse lifecycle
boundary.

## Calling convention and ABI

`src/hybrid/c-asm-abi.s` is the stable boundary. ASM calls coarse C routines at
existing lifecycle boundaries:

- `director_init`, `director_world_row_tick`, `director_request`,
  `director_release`, `director_rng_advance`;
- `lifecycle_init`, `sector_update_first_capital`,
  `sector_update_capital_phase`, `sector_begin_complete`,
  `sector_complete_scroll_tick`, `sector_force_final_drain`;
- `enemy_spawn_raiders`, `enemy_retire_member`,
  `enemy_apply_pending_damage`, `enemy_recycle`;
- `enemy_light_tick` (once per gameplay frame; returns the single-shot fire
  decision) and `enemy_light_hit` (one damage unit; returns lethal).

The Light kernel calls both directly from its two wrappers; formation
admission and capital gating stay inside the existing `enemy_spawn_raiders`
and `sector_update_first_capital` calls.

C calls only three semantic ASM primitives:

- `_asm_director_can_allocate()`;
- `_asm_sector_pressure_active()`;
- `_asm_director_dispatch_event()` through the existing two-byte request
  mailbox.

There are no renderer-level C crossings. One-byte arguments and returns use the
cc65 register convention; wrappers preserve registers required by their C
callers. The frame path uses normal `JSR`/`RTS`; no C call returns through an
interrupt `RTI` path. The stock cc65 Atari startup and libc are not linked.

## Shared-state ownership

| State | Authoritative owner | Location |
| --- | --- | --- |
| Director row, phase, timers, RNG, pending event, flags | C | `$80F4-$80FF` |
| sector state | C lifecycle | `$4EA5` |
| enemy archetype, active/member state, HP, live count | C lifecycle | existing `$5470-$5489` fields |
| selected archetype's ASM-facing profile cache | C lifecycle | `$8110-$8118` (moved from `$8776`) |
| Light state, HP, position, fire timer, leaderless latch | C lifecycle | `$8100-$8105` |
| Light render cache and scratch | ASM Light kernel | `$8106-$810B` |
| ABI opcode/argument and C scratch | C/ABI boundary | `$86FA-$8700` |
| pending enemy damage/source mailboxes | ASM kernel | existing `$5472-$5477` fields |
| enemy coordinates, velocity, manoeuvre and projectile slots | ASM kernel | existing fixed symbols |
| frame/player/render/raster state | ASM kernel | existing fixed symbols |

The C profile cache is derived state, not a second owner: C writes it when an
archetype is selected and ASM only reads it. Release code does not write any
C-owned lifecycle field.

## Memory, stack and placement

| Component | Bytes | Runtime placement |
| --- | ---: | --- |
| ca65 ABI veneer | 117 | `$8701-$8775` |
| C profile BSS | 9 | `$8110-$8118` |
| C Light BSS (incl. 6 B ASM render cache/scratch) | 12 | `$8100-$810B` |
| cc65 low CODE | 242 | `$8B88-$8C79` |
| `EnemyArchetype` RODATA (Raider + Light) | 24 | `$8C7D-$8C94` |
| lifecycle + Light CODE | 725 | `$8C95-$8F69` |
| Light ASM `LIGHT_CODE` (late publication: erase, render) | 133 | `$8F6A-$8FEE` |
| Light ASM `LIGHT_RESIDENT` (update, shot, kill, glyph) | 226 | `$8776-$8857` |
| Light ASM lower-layer backing resolver (STARFIELD tail) | 31 | `$5D45-$5D63` |
| Light ASM score add (retired BROADSIDE pad) | 17 | `$77A1-$77B1` |
| cc65 RNG CODE | 21 | `$9D5E-$9D72` |
| Director RODATA | 158 | `$9D75-$9E12` |
| cc65 high CODE | 485 | `$9E13-$9FF7` |
| C/ABI scratch BSS | 7 | `$86FA-$8700` |
| C software stack | 0 | none |
| new zero page | 0 | none |

At the earlier `2df89da` checkpoint, totals were 1,256 bytes of C CODE, 170 bytes of C RODATA, 0 bytes DATA,
16 bytes BSS, 0 bytes software stack and 0 bytes zero page. Linked runtime is
17,521 bytes. Simultaneous feature residency is 18,914 bytes, leaving 3,273
bytes of the feature-residency safety budget. The accepted Light M1 runtime measures
17,452 B linked, 19,207 B simultaneous and 2,980 B safe.

Light Wingman placement (2026-09-15). The first attempt placed the Light
renderer in ENTITY_CODE and overflowed its packed staging by 176 B. The
accepted runtime adds nothing to ENTITY_CODE and uses only existing records
and expanders:

1. `LIGHT_CODE` is linked with the main image directly after the measured C
   extension and appended to the existing late-compressed extension stream:
   882 B raw / 742 B packed of 960, expanded to `$8C7D-$8FEE` by the unchanged
   boot call (17 B slack before A2).
2. `LIGHT_RESIDENT` heads the existing pickup/collision stream, whose runtime
   start moves from `$8800` to `$8776` into documented-unowned RAM; the retired
   92 B of inert PICKUP padding and the 2-byte unreachable accounting pad are
   reclaimed, and the zero-filled image still ends at the fixed `$8B67`
   collision module (6 B slack). The stream expands after the veneer is
   published and before the loader, so no lifetime overlaps.
3. The 31-byte lower-layer backing resolver (`light_cell_resolve`) uses the
   STARFIELD resident tail; packed starfield is 1,774 B against the 1,798 B
   correction gate and 1,819 B staging limit.
4. The 17-byte BCD score add exactly fills the retired BROADSIDE entry pad,
   so every following BROADSIDE entry address is unchanged.

All Light code is resident for the whole game; it does not depend on BASIC
RAM, runtime disk I/O or a new loader record. The cost is that the extension,
pickup stream and starfield gate are now within 17/6/24 B of their limits: a
further archetype requires a new placement decision. The owner-requested smooth
1-line vertical tracking (a 2x2 dynamic glyph compositor, about 75 B) is
deferred by the owner and would be `BLOCKED_PLACEMENT` for the same reason.

The old high-C reservation still ends at `$9FF7`; `$9FFA-$9FFF` remains the
protected guard. The new 520-byte archetype/lifecycle composite uses the legal
post-startup range `$8C7D-$8E84`. Its 423-byte deterministic LZ stream is
transported boot-only at `$7810-$79B6`, expanded before that range is reclaimed
for starfield staging, and never coexists there with the starfield source. BASIC
RAM and loader format are unchanged.

Every build audits generated assembly for references to cc65 `sp`, `sreg`,
`regsave`, `regbank`, `tmp1..4`, `ptr1..4`, `(sp)`, and compiler/runtime helper
calls. Neither C translation unit uses any of them, so the measured stack/ZP
requirements are genuinely zero; no generic runtime was added.

## Forbidden C operations

C must not access ANTIC, GTIA, POKEY, display-list, PMG DMA or raster registers;
publish visible sprites, PairShots or the character ring; perform
backing/restore; execute hot collision loops; call the OS after takeover;
allocate heap memory; or introduce unbounded visible-frame work. New ABI calls
must describe semantic actions, not renderer internals.

## Build pipeline

```text
src/c/director.c              src/c/lifecycle.c
       | cc65                       | cc65
       v                            v
generated .s -> ca65         generated .s -> ca65
       |                            |
       +----------- ld65 with cfg/encounter-director.cfg
                                |
                  split final runtime segments
                                |
                existing DFMC / XEX / ATR packaging
```

Generated compiler assembly and objects remain under `build/`; maintained C
and headers remain under `src/c/`. The XEX packages the late-compressed
lifecycle record in its packed form, matching the ATR transport, and startup
publishes C extension, A2 kernel, glue and starfield in that required order.

Useful commands:

```bash
npm run build:candidate
npm run boot:smoke
node --test tests/hybrid-lifecycle.test.mjs tests/formats.test.mjs tests/layout-d1.test.mjs
node scripts/hybrid-director-ab.mjs \
  --asm-build=/path/to/pre-increment/build --c-build=build
ATARI800_TRACE_SOURCE=/path/to/atari800-7.1.2 \
  node scripts/runtime-wall-trace.mjs --skip-boot-smoke \
  --only-session=2-evasive-fire3
```

## Debugging and equivalence

The deterministic harness compares the accepted hybrid foundation and current
candidate with identical bytes, inputs, RNG seeds and difficulties. It retains
the original Director frame and 3,712-row semantic replays and adds a
2,400-frame lifecycle replay per difficulty. The latter checks sector sequence,
Raider admission/member selection, lifecycle fields, capital entry/exit and RNG
progression. Across 12,488 compared frames the result is zero unexplained
divergences.

The unchanged native PAL replay `2-evasive-fire3` completes 920 frames. The
candidate maximum is 28,505 cycles versus 28,479 for the accepted baseline
(+26), leaving 2,695 cycles to the 31,200 target and 4,063 to the 32,568 hard
gate. It records zero missed frames, extra VBI boundaries, DLI anomalies and
deadline overruns.

## Subsequent migration process

For each later high-level module:

1. retain the accepted build as the deterministic baseline;
2. define one coarse semantic ABI and one owner for each shared byte;
3. add only the archetype record and required high-level behavior;
4. leave hardware-sensitive execution in ASM;
5. pass build, startup, memory-boundary and artifact validation;
6. run byte/decision A/B with identical replay and RNG state;
7. rebuild native instrumentation and run the same PAL replay;
8. record linked size, simultaneous residency and gate headroom.

The first Light Wingman was added this way as the second archetype, with a
small C behavior handler and a character renderer class, without changing the
core Director architecture, lifecycle model, PMG allocation or raster
architecture.

The 2026-09-16 Interceptor attempt repeated the process and confirmed it: the
third archetype again needed only data, a small C handler and the existing
Light renderer. Steps 1-5 passed and step 5 stopped it — the linked result does
not fit the resident placement. Steps 6-8 were therefore not run and no
candidate exists. The next archetype stays blocked on resident capacity
(roadmap step 4.3), not on this process.
