# Hybrid C/cc65 architecture

Status: **Hybrid C Director is owner-accepted and is now the project
foundation.** Branch `experiment/hybrid-c-director` contains the accepted
Director plus the first follow-on increment: C owns the sector/high-level enemy
lifecycle boundary and describes the current Raider through a compact
`EnemyArchetype`. Gameplay remains equivalent to the pre-increment hybrid
baseline.

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

The sole record is Raider: HP 1, Raider cross/pursuit behavior 0, PairShot
burst policy 1, 5 shots at 15-frame intervals, post-burst pauses 60/50/40,
two-Heavy-PMG renderer class 1, red PairShot weapon class 1, BCD score `$10`,
and Director value 1. Both current Heavy slots select that record. No third
Raider, Light enemy, new behavior or gameplay value is present.

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
  `enemy_apply_pending_damage`, `enemy_recycle`.

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
| selected archetype's ASM-facing profile cache | C lifecycle | `$8776-$877E` |
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
| C profile BSS | 9 | `$8776-$877E` |
| cc65 low CODE | 242 | `$8B88-$8C79` |
| `EnemyArchetype` RODATA | 12 | `$8C7D-$8C88` |
| lifecycle CODE | 508 | `$8C89-$8E84` |
| cc65 RNG CODE | 21 | `$9D5E-$9D72` |
| Director RODATA | 158 | `$9D75-$9E12` |
| cc65 high CODE | 485 | `$9E13-$9FF7` |
| C/ABI scratch BSS | 7 | `$86FA-$8700` |
| C software stack | 0 | none |
| new zero page | 0 | none |

Totals are 1,256 bytes of C CODE, 170 bytes of C RODATA, 0 bytes DATA,
16 bytes BSS, 0 bytes software stack and 0 bytes zero page. Linked runtime is
17,521 bytes. Simultaneous feature residency is 18,914 bytes, leaving 3,273
bytes of the feature-residency safety budget.

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

The next bounded feature may add the first Light Wingman as a second archetype,
a small C behavior handler, and an already-selected ASM renderer class without
changing the core Director architecture.
