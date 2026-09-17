# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-17

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

---

## Checkpoint

### Repository HEAD

`experiment/hybrid-c-director`. HEAD carries the roadmap 4.4 Interceptor
`OWNER-SMOKE CANDIDATE`, its 4.4b visual identity (X/quad art since `3838c00`),
the 4.4c hostile weapon visuals and the roadmap 4.5a Heavy window capacity
increment (sections below) on top of `f4cb18b`, the documentation-only
reconciliation of the owner acceptance recorded here. None of these candidates
is accepted; the accepted runtime is still `b4b942e`.

### Accepted runtime checkpoint

Commit `b4b942e` — `fix(debris): publish the debris late with exact ownership`
(owner smoke PASS 2026-09-16 for the pickup visibility, step 4.3 Stage 1 and the
debris late publication).

XEX SHA-256:
`965468077747f527b7d3f8ffeb7c37ace27377892ea5fc6f2e8aaf062d0d8a6e`

`npm run build:candidate -- --quiet` from a clean export of `b4b942e` reproduces
it (re-verified 2026-09-16); owner-smoke copy in
`build/owner-smoke/debris-late-96546807/`.

It contains the hybrid C Director foundation (`2df89da`), Light Wingman M1
(`41ace65`), the PMG pickup raster fix and per-type capsule silhouettes
(`f30754a`, `c2af6a6`), step 4.3 Stage 1 reusable resident capacity (`fca5e31`,
`0290d83`) and the debris late publication with exact ownership (`b4b942e`).

Previous accepted runtime checkpoint: `41ace65` (XEX `900152fe…`).

---

## Architecture

Hybrid **C/cc65 + ca65**, defined in
[hybrid-c-architecture.md](hybrid-c-architecture.md).

- C decides WHAT: Encounter Director, sector state, high-level lifecycle,
  `EnemyArchetype` (Raider, Light Wingman; Interceptor in the candidate),
  Raider and Light HP/state, Light archetype selection,
  admission/retire/recycle, formation motion, fire decisions, Director
  scheduling and RNG; progressively waves, AI, pickup policy, progression and
  boss state.
- ASM performs HOW: VBI/DLI, ANTIC/raster, PMG, Heavy, Light, debris and
  PairShot publication, character ring, backing/restore, hot collisions,
  hardware writes, audio hot paths, loader and XEX/ATR startup.

---

## Gameplay capability (accepted)

- Player Fighter movement and PairShot weapon (Normal/Rapid/Spread, Shield);
- two Heavy Raiders on P1/P2 with fire, contact damage, score and
  character-free destruction;
- one Light Wingman per Raider formation: character 2x1, centred behind Heavy
  slot 0, no side switching, published late after the playfield (no flicker),
  destructible, 5 points, retired before the capital sector; its 8-line
  vertical stepping relative to the leader is intentional and accepted;
- debris, published late with exact ownership (debris < effects < Light <
  PairShots < sparse near), visible from Y 24 in capital and post-capital
  fighter phases;
- Encounter Director Level 1, capital broadside traversal;
- fighter-sector pickup: deterministic admission (every third Raider kill by
  Player PairShot), PENDING/ACTIVE lifecycle, collection and boosters, visible
  as a fifth-player PMG mark published after the playfield, with a per-type
  capsule silhouette (Rapid slot, Spread fan, Shield crest) in `COLPF3`;
- white four-point starfield, one scanline per frame.

Deferred by the owner: smooth 1-line Light tracking (M2).

---

## CPU / RAM baseline (`2-evasive-fire3`, 920 PAL frames, XEX `96546807`)

| Measure | Value |
| --- | ---: |
| PAL max wall cycles | 29,258 |
| Target 31,200 headroom | 1,942 |
| Hard gate 32,568 headroom | 3,310 |
| Missed frames / extra VBI / DLI errors | 0 / 0 / 0 |
| Linked runtime | 17,470 B |
| Simultaneous residency | 19,295 B |
| Safe residency remaining | 2,892 B |

Reusable free capacity at this checkpoint (measured, `build/manifest.json`):
contiguous `HYBRID_C_EXT` tail 187 B (`$8F45-$8FFF`), `HYBRID_C_SECTOR` window
8 B, ENTITY_CODE tail 45 B, A2 kernel tail 18 B, pickup stream fill 14 B,
pickup/collision record 1,158 of 1,277 B cold capacity. Packed STARFIELD is
1,805 B: 7 B over the reviewed 1,798 B correction gate and 14 B under the
1,819 B hard staging limit (open decision below). Use identical replays when
comparing CPU.

---

## Known open defects and open decisions

- intermittent purple artifact after a Raider, not reproduced
  deterministically (hypothesis only: a stale hostile pulse — if it now shows
  white/steel on the 4.4c candidate, that points to its source);
- Spread second capsule trace / final glyph reported in plan v4.12 §11, not
  re-verified since PairShot and the PMG capsule;
- debris known limitation: a cell yielded to a 25 Hz effect shows the effect's
  lower backing for the frame in which that effect expires (effects still
  publish mid-frame; measured once in 4,600 in-view frames);
- boot-smoke margin: the ATR menu deadline (190 + 2 × transport sectors) is
  met with 0 frames of margin at `3838c00`, at the 4.5a candidate and with a
  239-B Heavy proof payload; boot CPU added without extra sectors can miss it
  (it did for the first 4.5a variant);
- open owner decision: the packed STARFIELD correction gate (1,805 B against
  the reviewed 1,798 B). `tests/light-wingman.test.mjs` ("Light kernel
  placement…") and `tests/broadside-fire.test.mjs` keep failing on that gate on
  purpose; moving a reviewed margin is an owner decision;
- test debt: the full `node --test tests/*.test.mjs` run keeps known stale
  failures — 115 at `b4b942e` (measured 2026-09-16 on a clean export, counting
  the owner's uncommitted `tests/booster-admission-diagnostic.test.mjs`) and
  the same 115 names at the Interceptor candidate, its 4.4b visual identity
  and the 4.4c weapon visuals; treat a new failure name as a regression signal.

---

## Accepted increments in this checkpoint — summary and evidence

### Pickup runtime visibility (P0)

Root cause was raster: the missile plane was erased just after the frame gate
and rewritten mid-frame, so ANTIC saw zeroes when the beam crossed the capsule
(0/16 rows at beam crossing). The plane is now erased and redrawn in the
post-playfield window after `wait_frame_at_line $77`; each booster carries its
own capsule silhouette again. The earlier native gate used a `& $F0` mask that
inspected only half of the fifth-player missile bits. Owner decision 12 (solid
fifth-player PMG design) is unchanged. Evidence:
[diagnostics/stage-2b2d-pickup-raster-invisibility.json](diagnostics/stage-2b2d-pickup-raster-invisibility.json),
[diagnostics/stage-2b2e-pickup-capsule-silhouettes.json](diagnostics/stage-2b2e-pickup-capsule-silhouettes.json).

### Step 4.3 Stage 1 — reusable resident capacity

Option D = A + C1. C1 removed dead ENTITY_CODE (39 B). A moved the boot-only
GLUE hold from `$8600` to `$8300` and turned the former hold into the C area
`HYBRID_C_SECTOR_RAM` `$8602-$86F9` (248 B), carrying the five `sector_c_*`
functions (240 B) as a second LZ stream of the pickup/collision DFMC record
(8/8 records, 142 B manifest unchanged). The native write-watch
(`scripts/capacity-window-watch.mjs`) passed on XEX and ATR. Startup costs
+8,463 cycles once. Evidence:
[diagnostics/stage-2b2f-resident-capacity-glue-window.json](diagnostics/stage-2b2f-resident-capacity-glue-window.json);
the owner's post-capital debris observation was A/B-cleared as `PREEXISTING`:
[diagnostics/stage-2b2f-step43-post-capital-debris-ab.json](diagnostics/stage-2b2f-step43-post-capital-debris-ab.json).

### Debris late publication — exact ownership

Fighter OPEN: debris erase and render run adjacently inside the post-playfield
window, between the Light erase and the Light render. Capital frames: right
after the entity update, in the vertical blank, after every transient restore
and before every transient capture. The erase restores a cell only while it
still holds the published code; the render leaves a cell a rendered effect
owns to the effect; the recycled bottom ring row republishes the debris for the
frame that rotates it. `LIGHT_CODE` 133 → 203 B; PAL max 29,217 → 29,258
cycles. Native final-framebuffer gate (`node scripts/runtime-wall-trace.mjs
--debris-gate-only`) on three natural replays: 0 blank, 0 partial, 0
transitions, first visible Y 24 in capital and post-capital phases (pre-fix
`0-neutral-fire0` post-capital: 549 blank of 1,028 in view). Evidence:
[diagnostics/stage-2b2g-debris-late-publication.json](diagnostics/stage-2b2g-debris-late-publication.json).

---

## Interceptor (plan step 4.4) — `OWNER-SMOKE CANDIDATE` (2026-09-16)

Not accepted until the owner smokes it. Built on the accepted `b4b942e`; the
2026-09-16 `BLOCKED_PLACEMENT` attempt is superseded.

**Design (owner decision 18).** Third `EnemyArchetype` (byte offset 24): HP 1,
pursuit movement 2, fire policy 3 (since 4.4c a single `LASER` bolt, then
56/44/32 frames EASY/MEDIUM/HARD; originally a 2-shot double-tap), character
2x1 renderer, score `$15`,
Director value 1. It has no leader: it enters at X 124, Y 0, descends 2 lines
per frame and, every other frame, steps one 4-HPOS cell toward
`player_x & $FC`, clamped to 48-200. It retires at Y 232 or outside the fighter
sector, exactly like the Wingman. No P1/P2, PMG, renderer, publication,
collision, Director or capacity change.

**Selection contract.** The single Light slot is explicitly
archetype-selectable (`Wingman OR Interceptor`) through the C-owned byte
`light_archetype_offset` (12 or 24). The Light admission in
`enemy_c_spawn_raiders` and `enemy_c_light_tick` only read it; the rejected
per-admission alternation of `32f2c20` is removed. Its only writer is the
separate, labelled **provisional** schedule `encounter_light_schedule_advance()`
— table `{WINGMAN, INTERCEPTOR}` indexed by `encounter_light_index` — called
only when the slot is free, so a fresh game shows Wingman, Interceptor,
Wingman… Roadmap 4.6 replaces it. Schedule index finding: no existing state
qualifies — `STATE_EVENT_INDEX` advances once per Director event (including
deferral expiry and boss handoff), not once per Light admission, and a busy
slot skips admission, so it cannot index the table without changing meaning;
the accepted 1 B counter at `$8119` (`HYBRID_ENCOUNTER_STATE`, reset in
`lifecycle_c_init`) is used. ASM changes are limited to the
`light_archetype_offset` ABI equate, `ldx LIGHT_ARCHETYPE_OFFSET` in
`light_destroyed` and `adc LIGHT_SCORE_BCD,x` in the unchanged 17 B pad.

**Placement (measured, `b4b942e` → candidate).**

| Metric | Before | After |
| --- | ---: | ---: |
| `ENEMY_ARCHETYPE_DATA` (3 records + 2 B schedule table) | 24 B `$8C7D-$8C94` | 38 B `$8C7D-$8CA2` |
| `HYBRID_C_EXT` C | 485 B `$8C95-$8E79` | 635 B `$8CA3-$8F1D` |
| `LIGHT_CODE` (unchanged size) | 203 B `$8E7A-$8F44` | 203 B `$8F1E-$8FE8` |
| Extension record raw / packed (limit 960) | 712 / 636 B | 876 / 785 B |
| **Free `HYBRID_C_EXT` tail** | 187 B | **23 B `$8FE9-$8FFF`** |
| `LIGHT_RESIDENT` | 226 B | 229 B `$8776-$885A` |
| `PICKUP_CODE` (unchanged size, 769 B) | `$8858-$8B58` | `$885B-$8B5B` |
| Pickup stream fill / pickup record of 1,277 B cold | 14 B / 1,158 B | 11 B / 1,161 B |
| `HYBRID_LIGHT_STATE` | `$8100-$810B` | `$8100-$810F` |
| Provisional schedule counter | — | `$8119` (1 B) |
| Simultaneous / safe residency | 19,295 / 2,892 B | 19,459 / 2,728 B |
| cc65 CODE / RODATA; C stack / new ZP | 1,233 / 182 B; 0 / 0 | 1,383 / 196 B; 0 / 0 |

Physical resident code/data +167 B, BSS +5 B, in previously unowned RAM;
reserved envelopes unchanged; reusable free capacity −164 B extension tail and
−3 B pickup fill. The extension record grows from 6 to 7 ATR sectors
(166-172), moving the RNG record to sector 173. The **23 B extension tail is
scarce remaining capacity**: above the 16 B owner floor, but the next
archetype or C growth needs a placement decision. Linked runtime (17,470 B) and
packed STARFIELD (1,805 B) are unchanged. The cc65 stack/helper audit passes.

**CPU (measured).** Ten `runtime-wall-trace` baseline replays, native PAL, on
both `b4b942e` and the candidate: 0 missed frames, 0 extra VBI, 0 DLI errors in
all 20. Candidate worst maximum 29,918 cycles (`2-sweep-fire4`; target headroom
1,282, hard-gate headroom 2,650) against 29,697 for `b4b942e`
(`2-sweep-fire6`); `2-evasive-fire3` 29,258 → 29,605. Replays diverge after the
first Light admission, so per-session deltas (−259 to +831) mix gameplay
divergence with cost. Isolated C cost (6502 harness, HARD): Light tick worst
case 127 → 173 cycles for the Wingman and 182 for the Interceptor (firing
frame), formation admission 88 → 174 cycles once per formation; the score path
adds one `ldx` (3 cycles). A native Light-slot probe
(`DFTRACE_LIGHT_OUTPUT`, opt-in, no emulated cost) shows an Interceptor alive
in all ten candidate replays (1-3 lives each, lateral pursuit observed).

**Native gates.** `--boot-smoke-only`: 4 XEX/ATR cold-start sessions pass.
`--debris-gate-only` on the three natural replays: PASS — 0 blank, 0 partial,
0 disappearances, first visible Y 24 in capital and post-capital phases, 0
publications inside the scanned playfield, 0 missed frames; maxima 30,098 /
30,406 / 30,050 cycles against 30,008 / 29,764 / 30,022 for `b4b942e` on the
same (diverging) replays, all under the 31,200 target.

**Tests.** New `tests/light-interceptor.test.mjs` (13): selection contract, no
toggle source contract, provisional schedule order, admission per difficulty,
descent and retirement, pursuit clamp and alignment, independence from Heavy
slot 0, double-tap cadence, visibility and dying gates, 15-point kill and
fighter-only retirement, placement contract, no PMG. Updated:
`light-wingman` (third record, explicit Wingman re-admission),
`hybrid-lifecycle` (extension 876 B, the two static helper calls in the
generated-C audit), `enemy-combat` (union syntax), `source-contracts`. Full
suite: 626 tests, 115 failing, the identical failure-name set to `b4b942e`
(613 tests, 115 failing).

Candidate XEX `01a6ae07…`, owner-smoke copy in
`build/owner-smoke/light-interceptor-01a6ae07/`. Evidence:
[diagnostics/stage-2b2h-light-interceptor.json](diagnostics/stage-2b2h-light-interceptor.json);
superseded blocked-experiment evidence:
[diagnostics/stage-2b2c-interceptor-blocked-placement.json](diagnostics/stage-2b2c-interceptor-blocked-placement.json).

---

### 4.4b Interceptor visual identity (owner decision A+C) — `OWNER-SMOKE CANDIDATE`

ASM publication data only; C, records, codes, erase/render, backing, collision,
PMG, DLI/palette and the PairShot renderer are unchanged (a distinct
Interceptor projectile is deferred to 4.5).

- **Art.** A new 16-byte Interceptor table (owner-approved X/quad silhouette,
  candidate A: steel `COLPF1` arms, red `COLPF3` corner rotor pods, white
  `COLPF0` hub) follows the
  unchanged Wingman table; both moved from `LIGHT_RESIDENT` to the ENTITY_CODE
  tail, `$9D31-$9D50`, contiguous in one page (link-time asserts).
- **Selection.** `light_update` reads source end 15 (Wingman) or 31
  (Interceptor) by comparing `light_archetype_offset` with the ASM equate
  `LIGHT_OFFSET_INTERCEPTOR = 24`, which `source-contracts` cross-checks with
  `ENEMY_ARCHETYPE_OFFSET(ENEMY_ARCHETYPE_INTERCEPTOR)`; it still writes glyphs
  120/121 with codes `120|$80`/`121|$80`.
- **Placement (measured, `c1c106e` → candidate).** ENTITY_CODE 3,121 → 3,153 B
  (packed 2,701 → 2,733 B); **ENTITY_CODE free tail 45 → 13 B**;
  `LIGHT_RESIDENT` 229 → 225 B; pickup stream fill 11 → 15 B; pickup record
  1,161 → 1,157 B; ENTITY_CODE staging-to-BROADSIDE margin 107 → 75 B; linked
  runtime 17,470 → 17,502 B; simultaneous / safe residency 19,459 / 2,728 →
  19,491 / 2,696 B; **initial boot envelope 44 → 12 B**, the 12 B minimum at an
  unchanged sector count. `HYBRID_C_EXT` tail (23 B) and packed STARFIELD
  (1,805 B) unchanged. Both scarce margins are recorded, not gates.
- **CPU (measured).** 6502 harness, `light_update` with a live Light: Wingman
  472 → 515 cycles (+43), Interceptor 437 → 481 (+44; it previously installed
  the Wingman art). Native PAL, candidate: `2-sweep-fire4` 29,918,
  `2-sweep-fire6` 29,705, `2-neutral-fire0` 29,847, `2-evasive-fire3` 29,624
  cycles; 0 missed frames, 0 extra VBI, 0 DLI ordering errors; the
  `DFTRACE_LIGHT_OUTPUT` probe shows an Interceptor alive in all four (1-2
  lives, lateral pursuit in three). Worst candidate maximum 30,406 cycles
  (`debris-gate-0-neutral-fire0`), under the 31,200 target.
- **Native gates.** `--boot-smoke-only`: 4 XEX/ATR cold starts pass.
  `--debris-gate-only`: PASS on the three natural replays — 0 blank, 0 partial,
  0 disappearances, first visible Y 24 in capital and post-capital phases,
  0 missed frames; maxima 30,101 / 30,406 / 30,050 cycles.
- **Tests.** `light-wingman` (glyph 120/121 bytes via `light_update` for
  offsets 12 and 24, table contiguity), `light-interceptor` (placement
  numbers), `source-contracts` (offset cross-check). Harness defect fixed:
  `scripts/debris-destruction-runtime.mjs` now clears the whole Light state
  `$8100-$810F`, as `lifecycle_c_init` does; boot-staging residue there had
  decoded to a phantom live Light that took 6 of the 745 reproducer PairShots
  once ENTITY_CODE grew. The reproducer is 745/745 with 0 remnants on both
  `c1c106e` and the candidate. Full suite: 628 tests, 115 failing, the
  identical failure-name set to `c1c106e` (626 tests, 115 failing).

Candidate XEX `3adc3954…`, owner-smoke copy in
`build/owner-smoke/interceptor-visual-3adc3954/`.

---

### 4.4c Hostile weapon visuals (owner decision 19) — `OWNER-SMOKE CANDIDATE`

Projectile colour and shape belong to `weapon_class`, not to the emitter's hull
colour. C picks the class and cadence; ASM publishes it.

- **Classes.** `ENEMY_WEAPON_RED_PAIRSHOT` is renamed `ENEMY_WEAPON_PULSE = 1`
  (Raider, Wingman); `ENEMY_WEAPON_LASER = 2` (Interceptor); 3 is reserved for
  the Bomber. The ids are mirrored in `src/main.s` and cross-checked by
  `source-contracts`.
- **Per-slot class, 0 B RAM.** Hostile ACTIVE = owner bits 0-2 |
  `weapon_class << 3`. The Raider emitter uses constant `ora`/`eor`, and the
  cursor stays 0/1. `enemy_c_light_tick` returns the record's class (≥ 1) on
  fire, and `light_update` shifts it into ACTIVE.
- **Publication.** `hostile_projectile_screen_code` (BROADSIDE) returns
  `(89 + class + (X & 2 ? 10 : 0)) | $80`, so PULSE publishes `$DA/$E4`
  (unchanged codes) and LASER `$DB/$E5`. The resolver range check is
  `$DA`..`$E5`. The table-driven builder writes glyphs 90+ and 100+ from the
  authored `hostileWeaponVisuals` in `assets/graphics/fighter-weapons.json`,
  validated by `scripts/fighter-weapons.mjs` (high nibble only, no `%11`
  pixels).
  - PULSE: white/steel tracer `$00,$A0,$50,$00,$00,$A0,$50,$00`.
  - LASER: thin 1-HPOS bolt `$20,$20,$20,$10,$10,$10,$10,$00`.
  - Unchanged: `GAMEPLAY_COLPF3`, speed, hitbox, lifetime, PMG, DLI, collision.
- **Interceptor cadence (C data).** Burst 1, interval 0, post 56/44/32. Fire
  ticks per pass: EASY 57; MEDIUM 45, 90; HARD 33, 66, 99 (1 / 2 / 3 shots).
  Raider and Wingman cadences are unchanged.
- **Trace header.** The `scripts/atari800-wall-trace.h` hostile code range now
  ends at `$E5`, so native classifiers see the LASER bolt.

**Placement (measured, `0c90d53` → candidate).**

| Metric | Before | After |
| --- | ---: | ---: |
| `HYBRID_C_EXT` C | 635 B | 637 B `$8CA3-$8F1F` |
| Free `HYBRID_C_EXT` tail | 23 B | **21 B** `$8FEB-$8FFF` (floor 16 B) |
| Extension record raw / packed | 876 / 785 B | 878 / 786 B |
| `LIGHT_RESIDENT` | 225 B | 229 B `$8776-$885A` |
| Pickup stream fill / pickup record | 15 / 1,157 B | 11 / 1,161 B |
| ENTITY_CODE raw / packed | 3,153 / 2,733 B | 3,153 / 2,727 B |
| Initial boot envelope | 12 B | 18 B |
| BROADSIDE raw / packed | 6,650 / 5,659 B | 6,650 / 5,662 B |
| Simultaneous / safe residency | 19,491 / 2,696 B | 19,493 / 2,694 B |

- **ENTITY_CODE.** The renderer's hostile-code block shrank from 16 B to 5 B.
  The 11 B saved land in the `.align $100` pad before `$9400`, so the tail is
  still 13 B.
- **BROADSIDE.** The 70 B builder slot keeps its size and address (19 B
  builder, 16 B table, 23 B helper, 12 B pad), because
  `free_broadside_slot = $76A7` is a fixed integration address. The pad holds
  the Bomber's 8 B glyph row without moving anything. §6 estimated −12 B here;
  the fixed address turns that into a pad.
- **Unchanged.** Linked runtime 17,502 B, packed STARFIELD 1,805 B, RAM, ZP,
  PMG, DLI and charset ranges.

**CPU (measured).**

- **6502 harness.**
  - `render_fighter_projectile_overlays` with 5 hostile slots: 1,056 → 1,186
    cycles (+26 per slot; §6 estimate +27).
  - Firing frame: Wingman `enemy_c_light_tick` 173 → 179 and `light_update`
    647 → 662.
  - Interceptor firing tick 147 → 163 and `light_update` 622 → 647. Burst 1
    now takes the reload branch.
- **Native PAL, 4 baseline replays.** 0 missed frames, 0 extra VBI, 0 DLI
  ordering errors.

  | Replay | Max cycles |
  | --- | ---: |
  | `2-sweep-fire4` | 29,814 |
  | `2-sweep-fire6` | 29,856 |
  | `2-neutral-fire0` | 29,641 |
  | `2-evasive-fire3` | 29,522 |

  The `DFTRACE_LIGHT_OUTPUT` probe shows an Interceptor alive in all four
  replays (1-2 lives) and firing its HARD bolts.
- **Worst candidate maximum.** 30,436 cycles (`debris-gate-0-neutral-fire0`),
  under the 31,200 target.

**Native gates.**

- `--prepare --boot-smoke-only`: 4 XEX/ATR cold starts pass.
- `--debris-gate-only`: PASS on the three natural replays.
  - 0 blank, 0 disappearances, first visible Y 24 in capital and post-capital
    phases.
  - 0 publications inside the scanned playfield, 0 missed frames.
  - Maxima: 30,232 / 30,436 / 30,207 cycles.

**Tests.**

- **Updated.**
  - `fighter-weapons`: assembled builder against the authored model, exact
    builder bytes, screen-code mapping, renderer, helper and resolver contracts.
  - `light-interceptor`: single-bolt ticks, tick return 2, placement numbers.
  - `light-wingman`: Interceptor record, emit ACTIVE `$0E`.
  - `raider-projectile-ownership`: ACTIVE `$0A/$0B`.
  - `hybrid-lifecycle`: extension 878 B.
- **New.**
  - `source-contracts`: C↔ASM class ids and authored order.
  - 6502 harness in `light-interceptor`: a real Raider emit publishes
    `$DA/$E4`, a real Interceptor emit `$E5`, and the resolver restores all
    three and ignores `$D9`/`$E6`.
- **Full suite.** 630 tests, 115 failing, the identical failure-name set to
  `0c90d53` (628 tests, 115 failing, clean export reproducing XEX `3adc3954…`).

Candidate XEX `3d88b35d…`, ATR `27ad309b…`, owner-smoke copy in
`build/owner-smoke/weapon-visuals-3d88b35d/`.

---

## Roadmap 4.5a — Heavy window `HYBRID_C_HEAVY` (owner decision 20) — `OWNER-SMOKE CANDIDATE` (2026-09-17)

Capacity only, for the Bomber's C (4.5c). No gameplay, C, archetype, PMG, DLI,
collision or projectile change; the window holds 0 B.

- **Window.** `HYBRID_C_HEAVY_RAM` `$7E12-$7F04`, **243 B contiguous and
  C-reachable** (`#pragma code-name ("HYBRID_C_HEAVY")`). The limit is staging,
  not the 254-B runtime range: `$7F2B` (A2 cold staging) − `$7E38` (low-C
  record + full `$F8` reservation).
- **Transport.** No new DFMC record (still 8). The linked image (used bytes
  only) follows the low-C LZ record image at `$7E38`. The low-C record is
  248 B raw / 213 B packed in 2 sectors (242 / 210 B before). A full window of
  incompressible bytes packs to 458 B in 4 sectors; a real 239-B cc65 proof
  payload to 435 B in 4 sectors. The chunk loader's reviewed cold range now
  ends at `$7F2A` instead of `$7F0F`: the A2 display lists at `$7F10` are built
  only at gameplay init.
- **Held publication (GLUE precedent).** `publish_director_abi` tail-jumps
  (former `rts` + 2 B pad) to `hybrid_c_heavy_hold`, which copies the full
  243 B to idle ring RAM `$8400-$84F2` before starfield staging overwrites
  `$7810-$81CF`. After `show_loader`, `hybrid_c_heavy_publish` expands the
  starfield and copies the hold to `$7E12`. Both copies (31 B) sit in the zero
  padding of the fixed bootstrap prefix (36 → 5 B), so the initial content
  does not grow.
- **Accounting (measured).** Physical: linked runtime 17,502 B, simultaneous
  19,493 B, safe 2,694 B unchanged. Reserved: +243 B `HYBRID_C_HEAVY_RAM`,
  +243 B boot-only hold. Reusable free: +243 B C-reachable; `HYBRID_C_EXT`
  21 B, `HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2 18 B and pickup fill 11 B
  unchanged. Initial content 13,166 B, envelope 18 B, 103 boot sectors and
  178 transport sectors unchanged.
- **CPU.** One-time boot cost (6502 harness): hold copy 3,938 cycles,
  publish copy 3,907 cycles. Native PAL focused replays are identical to
  `3838c00`: `2-evasive-fire3` 29,522 and `2-sweep-fire4` 29,814 cycles;
  0 missed frames, 0 extra VBI, 0 DLI ordering errors.
- **Native write-watch** (`scripts/capacity-window-watch.mjs`, extended with a
  hold-size parameter, full-capacity staging injection, capital
  entry/completion counters and a keep-alive until one capital completes).
  XEX and ATR × cold fill `$00`/`$A5`: cold start, OPTIONS, gameplay,
  pause/resume, one capital sector entered and completed, game over, restart,
  pause, quit.
  - Heavy window: PASS 4/4. 0 hold writes, 0 window writes after publication,
    and the injected 243-B pattern arrives byte-exact in hold and window.
  - 4.3 GLUE hold and `$8602` window: PASS 4/4 (regression).
  - Real C proof (scratch tree, not committed): a 239-B cc65 payload is
    published equal to its linked image, PASS 4/4. One more statement makes
    ld65 reject the build (memory area overflow).
- **Boot smoke.** PASS 4/4, milestones identical to `3838c00`. The first
  variant carried the zero-padded full capacity (491 B raw); its stage-2
  decode moved ATR `start` by one frame on the `$A5` fill and missed the menu
  deadline, so only used bytes travel now.
- **Tests.** New `tests/heavy-window.test.mjs` (4): window contract, low-C
  transport, size-neutral boot wiring, byte-exact full-capacity copies in the
  6502 harness. Updated `formats` (the low-C XEX segment length is its
  `transportRawBytes`). Full suite: 634 tests, 115 failing, the identical
  failure-name set to a clean export of `3838c00` (630 tests, 115 failing).
- **Fallback.** `LIGHT_CODE` relocation was not needed.

Candidate XEX `8ac71861…`, ATR `6660c504…`, owner-smoke copy in
`build/owner-smoke/heavy-window-8ac71861/`. Evidence:
[diagnostics/stage-2b2i-heavy-window-placement.json](diagnostics/stage-2b2i-heavy-window-placement.json).

Carried owner corrections for 4.5b/c (decision 20, not implemented): generic
Heavy `weapon_class` emission chosen by C; "no Light escort with Bombers" is a
provisional 4.5 smoke policy only; visible separation of two QUAD Bombers
(lanes about `[48,92]` / `[132,176]`); roadmap after 4.5 is 4.6 data-driven
Encounter/Wave Director, 4.7 Boss, 4.8 capital traversal enrichment, then level
loop / 16-level campaign data.

---

## Current task

Owner review of the roadmap 4.5a Heavy window candidate. Owner smoke of the 4.4
Interceptor candidate (with 4.4b and 4.4c) is still pending.

## Next roadmap step

After owner review of 4.5a: 4.5b (`weapon_class = BOMBER`), then 4.5c (Bomber
archetype), per decision 20. The Raider-coloured residual artifact remains an
open P0 investigation.
