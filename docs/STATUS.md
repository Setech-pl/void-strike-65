# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-18

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

---

## Checkpoint

### Repository HEAD

`wip/4.5d-gate-fail` (branched from `experiment/hybrid-c-director` at
`2a8ff26`; adds the 4.5d Enemy Identity Freeze WIP `7b50bd6`, the PAL timing
audit tooling, the death-frame deferral candidate and its respawn double-image
fix, sections below).
`experiment/hybrid-c-director` carries the roadmap 4.4 Interceptor
`OWNER-SMOKE CANDIDATE`, its 4.4b visual identity (X/quad art since `3838c00`),
the 4.4c hostile weapon visuals, the roadmap 4.5a Heavy window capacity
increment (superseded by the M3 arena), the 4.5b `BOMBER` weapon class, the
4.5M-M1 starfield staging swap and the 4.5M-M2 cold-record relocation (both
owner smoke PASS 2026-09-17), the 4.5M-M3 `HYBRID_C_ARENA`, the
emitter-independent hostile shots fix and the roadmap 4.5c Bomber (sections
below) on top of `f4cb18b`, the documentation-only reconciliation of
the owner acceptance recorded here. None of these candidates is accepted; the
accepted runtime is still `b4b942e`.

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

## PAL timing gate — distinct miss events

`scripts/pal-timing-audit.mjs` is the PAL frame-overrun gate. It runs on every
traced replay of `scripts/runtime-wall-trace.mjs` (baseline, targeted, debris,
forced and diagnostic sessions alike), reports per replay, writes
`build/runtime-wall-trace/pal-timing-audit.json`, and fails the run on any
distinct miss event. It also runs standalone over CSVs:
`node scripts/pal-timing-audit.mjs [--json <path>] <csv-or-dir>...`.

**The fence.** In fighter OPEN the main loop reaches `profile_after_sector` and
calls `publish_fighter_projectile_overlays`, which waits for VCOUNT `$77`.
`wait_frame_at_line` waits for VCOUNT `== $77` and then for `!= $77`, so arrival
anywhere inside PAL scanlines 238-239 still catches the fence; the deadline is
the start of scanline 240. Arriving at or after it costs one whole PAL frame.
The audit reports worst pre-wait cycles and worst margin to that deadline, and
confirms each verdict against the measured `profile_publication_begin` release
(0 disagreements across both full gate sets, ~245,000 traced frames).

**Distinct miss events.** An overrun row whose predecessor was still in the
normal loop phase is one miss event. After a miss the loop keeps starting one
phase later (fighter row start moves from scanline 18 to ~250-273) until a new
gameplay generation resyncs it; those shifted-phase rows are attributed to the
event that caused them, never counted as new misses. The normal phase is
derived per replay and per publication path from the modal start scanline.

**`missed_frames` and `extra_vbi_boundaries` are unreliable for overrun
detection** and are kept in the report for continuity only: both are derived
from `Atari800_nframes` boundaries crossed inside one traced iteration, and an
overrunning frame simply waits for the same VCOUNT one frame later, so they
report 0 through a real dropped frame. Raw counts of rows over 31,200 or 32,568
are equally unusable for comparing builds: they conflate one real miss with its
phase-shift aftermath (1,394 and 1,055 such rows for the two single miss events
measured below).

**Measured 2026-09-17/18.** Full gate set (66 audited replays; 67 on the
candidate, which also traces `weapon-pickup-overlap-2-hunt-fire4`).
`7b50bd6` (4.5d WIP, XEX `838a9686…`): **2 distinct miss events — FAIL**:
`debris-gate-0-neutral-fire0` row 3007 (pre-wait 25,656, margin −407) and
`raider-remnant-rapid-xex-hard` row 1945 (pre-wait 26,042, margin −765); worst
clean margin 137 cycles. `2a8ff26` (XEX `0e4721b2…`): 0 miss events, worst
margin 781. **Death-frame deferral candidate (XEX `b8ed318c…`): 0 distinct miss
events across 67 replays — PASS**; the same rows are still each replay's worst
row (they precede any replay divergence): row 3007 pre-wait 24,206, margin
**+1,043**; row 1945 pre-wait 24,811, margin **+466** (the worst of the set);
the former thin rows were death frames too and rose to 1,847 / 1,920 / 2,146.
**Respawn double-image fix (XEX `3ce1a1d6…`): 0 distinct miss events across 67
replays — PASS, and timing-neutral**: no session's worst fence margin moved in
either direction, row 3007 still pre-wait 24,206 / margin +1,043 and row 1945
still pre-wait 24,811 / margin +466 (still the worst of the set). The fix costs
nothing on the death frame and removes 809 cycles from the respawn frame, which
is not fence-bound.
Root cause of the two 4.5d misses (measured, native frame profiler): both misses are Light contact
kills inside `light_update`, which runs after the enemy update and the ring
rotate; the two Bombers' standing cost (`integration_update_enemy` 4,630
cycles per frame with two live: `heavy_member_update` ~946,
`draw_enemy_member` ~1,164, `erase_enemy_departing_row` ~56 per member) plus
the death (+4,317) and kill (+3,009) coincidence overran the fence; the 4.5d
behaviour itself adds +36 cycles to the death frame. Evidence:
[diagnostics/stage-2b2q-pal-timing-audit.json](diagnostics/stage-2b2q-pal-timing-audit.json),
[diagnostics/stage-2b2r-death-frame-deferral.json](diagnostics/stage-2b2r-death-frame-deferral.json),
[diagnostics/stage-2b2s-respawn-double-image.json](diagnostics/stage-2b2s-respawn-double-image.json).

## Known open defects and open decisions

- PAL fence budget: with two Bombers live the standing enemy cost leaves the
  worst death frame 466 cycles under the fence after the death-frame deferral
  (section above); a death frame in which both Bombers also fire (~+1,090
  harness cycles) could still miss. The standing cost (`draw_enemy_member`
  redraws 16 P1/P2 rows every frame even when Y is unchanged) is the next
  bounded task, before further Bomber or 4.6 content;
- intermittent purple artifact after a Raider, not reproduced
  deterministically (hypothesis only: a stale hostile pulse — if it now shows
  white/steel on the 4.4c candidate, that points to its source);
- Spread second capsule trace / final glyph reported in plan v4.12 §11, not
  re-verified since PairShot and the PMG capsule;
- debris known limitation: a cell yielded to a 25 Hz effect shows the effect's
  lower backing for the frame in which that effect expires (effects still
  publish mid-frame; measured once in 4,600 in-view frames);
- boot-smoke margin: the ATR menu deadline (190 + 2 × transport sectors) is
  met with 0 frames of margin at `3838c00`, at the 4.5a and 4.5b candidates
  (4.5b: +6 B packed BROADSIDE alone missed it by one frame), with a 239-B
  Heavy proof payload, at the 4.5M-M2 candidate (177 sectors: deadline 544,
  menu 544) and at the 4.5M-M3 candidate (178 sectors: deadline 546, menu
  546); boot CPU added without extra sectors can miss it (it did for the
  first 4.5a variant). Measured for the Bomber retry: a throwaway arena filled
  to 832 B (record 363 B packed, 3 sectors, 180 transport sectors) reaches the
  ATR menu at 551 against deadline 550, one frame late; the XEX is unaffected.
  The 4.5c Bomber candidate (arena record 355 B, 3 sectors, 180 transport
  sectors) meets it with 0 frames: menu 550, deadline 550. The 4.5d WIP and
  the death-frame deferral candidate carry 182 transport sectors, so the
  derived deadline is 190 + 2 × 182 = 554: ATR menu 554 (0 frames), XEX 392;
- open owner decision: the packed STARFIELD correction gate. At the 4.5M-M1
  candidate the single-stream gates 1,798 / 1,819 B are superseded by the
  two-stream total gates 1,804 (correction) / 1,825 B (hard) against a measured
  1,811 B total, so the content is still 7 B over the correction gate;
  `tests/light-wingman.test.mjs` ("Light kernel placement…") and
  `tests/broadside-fire.test.mjs` keep failing on that gate on purpose; moving a
  reviewed margin is an owner decision;
- 4.5M-M1 owner-visible deviations from the task text (see the 4.5M-M1
  section): the boot-only GLUE hold moved `$8300 → $8100` so that stream B
  has a contiguous idle window, and each stream is bounded by one 960-B
  resident copy (B ≤ 960 B, not 1,032 B) because the table-driven boot copier
  is stage-2 overlay code that is gone by the time the deferred copies run;
- debris death-frame blink (found 2026-09-17, pre-existing mechanism): when a
  player PairShot was published over a debris cell and the player dies next
  frame, `apply_player_damage → erase_bullet` restores the shot's resolved
  (space) backing mid-frame and the debris returns only in the late window, so
  the cell scans blank for one frame. It fails `debris-gate-0-evasive-fire3` on
  the hostile-shot candidate (divergent replay); first-writer proof in
  [diagnostics/stage-2b2n-hostile-shot-emitter-independence.json](diagnostics/stage-2b2n-hostile-shot-emitter-independence.json);
- pre-existing native gate failures (identical on `2a67684`): the default
  wall-trace mode aborts at `weapon-pickup-contact-2-hunt-fire4` ("changed GTIA
  priority or the single erase/draw lifecycle") after 21 sessions, and
  `--raider-remnant-only` reports fewer main explosions than kills (139/141 at
  `2a67684`, 134/135 on the candidate);
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

## Roadmap 4.5b — `weapon_class = BOMBER` (decision 20) — `OWNER-SMOKE CANDIDATE` (2026-09-17)

On top of the 4.5a candidate `984f3ae` (owner smoke PASS, no gameplay
regression). Weapon class only: no emitter fires `BOMBER` yet, so gameplay is
unchanged. No Bomber movement, spawn, Heavy scheduling, PMG, DLI or C change
beyond the id.

- **Class.** `ENEMY_WEAPON_BOMBER = 3` in C and ASM (source contract). Authored
  glyph `$A0,$50,$50,$50,$50,$50,$A0,$00` (steel caps, white core, no `%11`),
  published `$DC` left / `$E6` right. The backing resolver range is derived
  from the class count and now covers `$DA-$E6`; the Atari800 trace hostile
  range ends at `$E6`.
- **Movement rate per class (generic).** Each class in
  `hostileWeaponVisuals` authors `stepPeriodFrames` (1, 2, 4 or 8). The
  generator emits `hostile_weapon_step_masks` (period − 1, indexed by
  `weapon_class − 1`). The hostile update loop reads `ACTIVE >> 3`, then
  `frame_counter & mask`; a non-zero result skips the slot. PULSE/LASER step
  every frame (2 lines/frame). BOMBER steps on even frames: 2 lines every
  second frame, 1 line/frame on average. Speed, hitbox, damage, renderer and
  lifetime semantics are shared; lifetime counts steps, not frames. The
  mechanism reads the class from ACTIVE, so 4.5c's generic Heavy emission of
  the C-chosen class needs no further change here.
- **6502 harness proof** (`tests/hostile-weapon-step-rate.test.mjs`, 6 tests).
  - On BOMBER skipped frames, Y, PREV_Y and LIFETIME stay byte-identical and
    `interceptor_projectile_hits_player` never runs for the slot.
  - On active frames the shot moves exactly 2 lines, lifetime −1, one sweep.
  - Over 40 frames: BOMBER 40 lines / 20 lifetime; PULSE 80 lines.
  - A full 96-step lifetime covers the same travel as PULSE in 192 frames
    instead of 96. The bottom exit stops at the same last Y.
  - A BOMBER resting on the player during a skipped frame hits on the next
    active step. The sweep starts at the resting Y, so detection is at most
    one frame late and never missed.
  - PULSE bottom exit, lifetime expiry and hit behave as before.
- **CODE placement: size-neutral, every address fixed.** The gate costs +11 B.
  The loop pays for it: the bottom test compares Y before the step (−4 B), and
  the hit path falls into `@interceptor_free` (−8 B). One never-executed pad
  byte after `rts` keeps every later CODE label at its address. The
  lbl diff shows only local loop labels and the BROADSIDE builder slot
  interior. `free_broadside_slot` stays at `$76A7`.
- **Tables.**
  - The 3-B step mask table sits in raw bootstrap-prefix padding at
    `$21BC-$21BE` (5 → 2 B free), the HUD-table precedent.
  - A first variant kept it in the BROADSIDE builder pad. BROADSIDE then
    packed +6 B, and ATR `$A5` reached the menu on frame 547, one frame past
    its 546 deadline (loader milestone 289 → 290). That variant was rejected.
  - The 8-B glyph uses the builder pad (12 → 4 B). The helper moves
    `$6287 → $628F` inside the fixed 70-B slot.
- **Accounting (measured).** Linked runtime 17,502 B, simultaneous 19,493 B,
  safe 2,694 B, initial content 13,166 B and envelope 18 B are unchanged.
  - BROADSIDE: 6,650 B raw (unchanged), 5,662 → 5,666 B packed.
  - Transport: 178 sectors, unchanged. XEX stays 23,104 B.
  - Reusable free: prefix padding 5 → 2 B, BROADSIDE builder pad 12 → 4 B.
    `HYBRID_C_HEAVY` 243 B and the others are unchanged.
- **CPU.**
  - Harness: +11 cycles per stepping hostile slot. Build model
    `maximumProjectilePool` update 1,714 → 1,769 (5 slots). Legal heavy
    main loop 13,504 → 13,515.
  - With 5 hostile slots: PULSE 548 cycles, BOMBER skipped frame 233, BOMBER
    step 548.
  - Native PAL (0 missed frames, 0 extra VBI, 0 DLI ordering errors):

    | Replay | 4.4c/4.5a | 4.5b |
    | --- | ---: | ---: |
    | `2-sweep-fire4` | 29,814 | 29,801 |
    | `2-sweep-fire6` | 29,856 | 29,856 |
    | `2-neutral-fire0` | 29,641 | 29,632 |
    | `2-evasive-fire3` | 29,522 | 29,519 |
    | debris gate worst (`0-neutral-fire0`) | 30,436 | 30,439 |
- **Native gates.** Boot smoke PASS 4/4 with milestones identical to
  `984f3ae`: XEX menu 393, ATR menu 546 against a 546 deadline, so there is
  still **0 frames of margin**. Debris gate PASS on the three natural replays:
  0 blank, 0 disappearances, first Y 24.
- **Tests.** New `hostile-weapon-step-rate` (6). Updated `fighter-weapons`
  (BOMBER glyph and codes), `source-contracts` (id 3), `light-interceptor`
  (resolver boundary `$D9`/`$E7`, BOMBER `$DC`/`$E6` resolved). Full suite:
  640 tests, 115 failing, the identical failure-name set to `984f3ae`
  (634 tests, 115 failing, same run command).

Candidate XEX `2fd5ace4…`, ATR `dd3977e2…`, owner-smoke copy in
`build/owner-smoke/bomber-weapon-class-2fd5ace4/`.

---

## Roadmap 4.5M-M1 — starfield staging swap — `OWNER-SMOKE CANDIDATE` (2026-09-17)

Boot/lifetime change only, on top of the 4.5b candidate (`9547bf0`), first step
of the 4.5M memory/lifetime migration (Strategy B). No gameplay change: linked
runtime 17,502 B, simultaneous 19,493 B, safe 2,694 B, runtime memory map,
GLUE/ABI/low-C/extension/A2/pickup publication, ENTITY order, Light, debris,
PMG, collision, DLI/VBI and every CODE/BROADSIDE/ENTITY address are unchanged
(`.lbl` diff: only bootstrap-prefix labels below `$21C1` moved;
`stage_starfield_stream` left ENTITY_CODE `$9495` for the prefix `$217C`;
`hybrid_c_heavy_hold`, `unpack_boot_broadside_runtime` and
`broadside_packed_source` are gone; `starfield_packed_source_b/size_b` added).

- **Packed STARFIELD as two independent LZ streams.** `build/starfield-runtime.bin`
  (2,224 B, byte-identical) is cut at raw offset 985: stream A 915 B packed
  (staged `$7810`, 960-B window, margin 45 B), stream B 896 B packed (staged
  `$81FA`, 960-B window, margin 64 B); total **1,811 B** against 1,805 B for
  the single stream (+6 B split overhead; the build picks the smallest total
  among 16-byte-step cuts below the largest stream-A prefix that fits).
  `unpack_starfield_runtime` expands A then B into the one continuous `$54E4`
  destination. Nothing writes `$7BD0-$7F2A` for the starfield any more.
- **Total-packed gate.** New reviewed baseline 1,811 B, hard gate **1,825 B**
  (build error above it) and correction gate 1,804 B — the single stream's
  14 B / −7 B content headroom carried over, not the 1,920 B of windows. The
  1,798 / 1,819 B single-stream gates are recorded as superseded in the
  manifest (`starfieldRuntime.packedTotalGate.supersedes`).
- **Heavy window.** `HYBRID_C_HEAVY_RAM = $7E12`, 243 B, staging `$7E38`
  unchanged; `hybrid_c_heavy_publish` (the retargeted former hold copy) copies
  `$7E38 → $7E12` once, ascending, at the existing `publish_director_abi`
  tail; the `$8400` hold and the post-loader publish (17 B) are retired and
  `jsr unpack_starfield_runtime` follows `show_loader` again.
- **Deviations from the task text (owner-visible).** (1) The task's stream-B
  window `$83FA-$8601` is 520 B, not 1,032 B; 1,032 B is the idle ring
  `$8100-$8601` minus the 250-B GLUE hold, which is contiguous only if the
  hold sits at `$8100`. The boot-only hold therefore moved `$8300 → $8100`
  (write-watched, PASS); the three-stream alternative around an unmoved hold
  measured +58 B of split overhead and needed 26 B more prefix code. (2) The
  plan assumed the table-driven `copy_boot_stream_backward` for the deferred
  copies; it is stage-2 overlay code at `$21C1` that `unpack_resident_runtime`
  replaces, so each stream is moved by one exact 960-B resident
  `copy_pause_screen` copy from the bootstrap prefix (HEAD used the same copier
  three times with a spill to `$81CF`). Hence B ≤ 960 B, not 1,032 B, and the
  prefix keeps 3 B of padding after retiring the dead pre-DFMC
  `unpack_boot_broadside_runtime` (27 B).
- **Transport (measured).** Initial content 13,166 → 13,162 B, envelope
  18 → 22 B, 103 boot sectors and 178 transport sectors unchanged (ATR deadline
  546 unchanged); the eight DFMC records are unchanged; XEX 23,104 B.
- **Boot CPU (native write-watch clocks, XEX).** `start → show_loader`
  2,070,929 → 2,051,496 cycles (−19,433); `unpack_starfield_runtime →
  layout_d_glue_publish_complete` 161,072 → 156,087 (−4,985): −24,418 fixed
  boot cycles (≈0.69 PAL frame). Boot smoke PASS 4/4: XEX menu 393 → **392**,
  ATR menu 546 against deadline 546 (still 0 frames of margin; the ATR loader
  countdown is frame-aligned and absorbs the sub-frame saving).
- **Native write-watch** (`scripts/capacity-window-watch.mjs`, extended with
  `--stage`, `--expect-stage-bins`, `--expect-range-bin` and `--window-from`),
  XEX and ATR × cold fill `$00`/`$A5`, lifecycle cold start, OPTIONS, START,
  gameplay, pause/resume, one capital sector entered and completed (XEX frames
  1257-2463, ATR 1411-2617), game over, restart, pause/quit: GLUE hold `$8100`
  and `$8602` window (4.3 regression) PASS 4/4; Heavy window `$7E12` with the
  243-B injected pattern at `$7E38`, watched from `layout_d_entity_unpack_complete`
  to the end of the lifecycle, PASS 4/4; both stream stagings byte-equal to
  the packed streams with 0 writes from `init_entity_effects` to the decoder;
  decoded STARFIELD byte-equal to `build/starfield-runtime.bin` at GLUE
  publication, PASS 4/4.
- **PAL (native).** `2-evasive-fire3` 29,519 and `2-sweep-fire4` 29,801 cycles,
  identical to HEAD; 0 missed frames, 0 extra VBI, 0 DLI ordering errors.
  Debris gate PASS on the three natural replays (0 blank, 0 disappearances,
  first Y 24; maxima 30,232 / 30,439 / 30,216).
- **Tests.** New `tests/starfield-staging-streams.test.mjs` (4). Rebaselined
  with the reason in each file: `heavy-window` (direct publish, no hold),
  `layout-d1` (two-copy staging, `stage_a2_kernel` `$212B → $213E`, stream and
  Heavy lifetimes), `transport-layout-regression` (hold `$8100`, two staging
  windows), `runtime-timing` (`STARFIELD_STAGING_BYTES $03C0`, stream B
  equates), `light-wingman` and `broadside-fire` (1,804 B correction gate, two
  streams). Full suite: 644 tests, 115 failing, against 640 tests / 115
  failing on a clean export of `9547bf0` (candidate build then
  `node --test tests/*.test.mjs`); the failure-name sets are identical except
  one explained difference: `tests/pairshot-foundation.test.mjs` "PairShot
  uses one logical record and one character cell for two pulses" fails at HEAD
  (one restored-cell mismatch) and passes on the candidate. Its harness
  (`scripts/pairshot-proof.mjs`) watches the ring rows `$8140-$8577` after a
  harness boot; HEAD's three-copy starfield spill wrote packed bytes into
  `$8140-$81CF`, the candidate stages nothing there.

Candidate XEX `361cb8cf…`, ATR `b8766308…`, owner-smoke copy in
`build/owner-smoke/starfield-staging-swap-361cb8cf/`. Evidence:
[diagnostics/stage-2b2k-starfield-staging-swap.json](diagnostics/stage-2b2k-starfield-staging-swap.json).
Owner smoke PASS 2026-09-17 (M1 accepted as a migration step; the runtime
acceptance checkpoint stays `b4b942e`).

---

## Roadmap 4.5M-M2 — cold-record relocation — `OWNER-SMOKE CANDIDATE` (2026-09-17)

Boot-transport and cold-lifetime change only, on top of the 4.5M-M1 candidate
(`58404c6`), second step of the 4.5M migration. No gameplay change: linked
runtime 17,502 B, simultaneous 19,493 B, safe 2,694 B, the runtime memory map,
every CODE/BROADSIDE/STARFIELD/A2/ENTITY/PICKUP/C address, the ABI, low-C,
extension and GLUE runtime destinations, the `$8100` GLUE hold, the Heavy
window `$7E12` and the ENTITY order are unchanged (`.lbl` diff: one added
label `layout_d_cold_publish_complete` `$2040`; `encounter-director.lbl`
identical). Goal reached: **`$7BD0-$7E11` has no boot, cold or runtime owner**
(the M3 arena is not declared yet).

- **ABI cold record → `$8018-$808C`** (117 B raw / 116 B packed, 2 sectors,
  unchanged sizes): directly after A2 staging, inside the entity-state page;
  consumed by `publish_director_abi` before `unpack_entity_runtime` and
  255,216 cycles before `init_entity_effects` clears `$8000-$80FF`.
- **low-C + GLUE merged into one LZ record → `$9B40-$9D31`** (498 B raw /
  457 B packed, 4 sectors; separately 245 + 213 = 458 B in 3 + 2 sectors):
  low-C image at `$9B40` (242 B used, 6 B pad to its `$F8` reservation), GLUE
  image at `$9C38`; the Heavy window image rides the tail at `$9D32-$9D5D`.
  Runtime destinations unchanged: low C `$8B88`, GLUE hold `$8100` →
  `$4EFE`, Heavy `$7E12`.
- **Boot order.** `publish_director_abi` (ABI, low C, extension, then the
  GLUE hold and the Heavy copy as its `stage_glue_holding` tail) now runs
  between `unpack_resident_runtime` and `unpack_entity_runtime`;
  `stage_a2_kernel` tail-jumps `stage_starfield_stream` directly. Nothing
  else is reordered; the resident suffix and bootstrap prefix are
  size-neutral (prefix padding 3 B).
- **Deviations from the task text (owner-visible).** (1) The approved `$9B14`
  landing is inside the packed resident staging, which ends at `$9B1E`
  (6,687 B packed; the `$9B13` figure in the memory map was stale), so the
  record lands at `$9B40` with a build-enforced 33 B margin above the measured
  staging end. (2) The Heavy window image cannot keep a 243-B transport
  capacity there: `$9B40` + 498 B leaves 44 B below the direct-landing
  `DIRECTOR_C_PRE` record at `$9D5E`. The runtime window keeps 243 B, the
  build enforces `HYBRID_C_HEAVY_BYTES` ≤ 44 (0 B used today) and the copy
  moves exactly 44 B; M3's arena replaces this staging. (3) The ATR menu
  deadline follows the sector count (546 → 544): the menu also moved 546 →
  544, so the margin is still 0 frames, not weakened or re-baselined.
- **Transport (measured).** 8 → **7 DFMC records** (one slot free for M3);
  178 → **177 transport sectors**; initial content 13,162 B, envelope 22 B,
  103 boot sectors unchanged; manifest 142 → 126 B inside the fixed stage-2
  reservation; XEX 23,104 → 23,100 B; boot image 22,784 → 22,656 B. Sector
  padding: merged 34 B, ABI 119 B (before: GLUE 118 B, low 22 B, ABI 119 B).
  Record order: BROADSIDE 104-148, pickup 149-158, ABI 159-160, merged
  161-164, extension 165-171, pre 172, Director 173-177.
- **Boot CPU (native write-watch clocks, same emulator, HEAD export vs
  candidate).** `start → show_loader` XEX 2,051,496 → **2,047,758**
  (−3,738), ATR 2,051,505 → 2,047,766 (−3,739): the Heavy copy moves 44
  instead of 243 bytes (≈3,227 cycles of the saving). `start →
  layout_d_glue_publish_complete` XEX 11,111,171 unchanged (frame-aligned
  loader), ATR 11,120,699 → 11,113,417. Boot smoke PASS 4/4: XEX menu 392
  (deadline 502) unchanged; ATR menu 546 → **544** against deadline 546 →
  544 (one sector fewer; 0 frames of margin as before).
- **Native write-watch** (`scripts/capacity-window-watch.mjs`, extended with
  `--hold-done`, windows up to 1,024 B and three added clock points), XEX and
  ATR × cold fill `$00`/`$A5`, lifecycle cold start, OPTIONS, START, gameplay,
  pause/resume, one capital sector entered and completed (XEX frames
  1257-2463, ATR 1409-2615), game over, restart, pause/quit; all PASS 4/4:
  - ABI record `$8018` and merged record `$9B40`: byte-equal to the linked
    images (`encounter-director-code-abi.bin`,
    `encounter-director-code-low-transport.bin`) at `start`, 0 writes until
    `layout_d_cold_publish_complete`, intact at consumption;
    `layout_d_cold_publish_complete` precedes `unpack_entity_runtime` (6
    cycles) and `init_entity_effects` (255,216 cycles);
  - `$7BD0-$7E11` (578 B): 0 writes from `start` to the end of the lifecycle;
    build-time: no record, XEX segment, staging window or hold intersects it;
  - GLUE hold `$8100` watched from `layout_d_cold_publish_complete` (and, in
    the M1 configs, from `stage_starfield_stream`): 0 writes, final GLUE
    equals the hold; `$8602` window equals its linked image, 0 writes;
  - STARFIELD streams A/B byte-equal and untouched, decoded STARFIELD
    byte-equal to `build/starfield-runtime.bin`;
  - Heavy window `$7E12`: the injected 44-B pattern at `$9D32` arrives
    byte-exact, 0 writes from `layout_d_entity_unpack_complete` to the end.
- **PAL (native).** `2-evasive-fire3` 29,519 and `2-sweep-fire4` 29,801
  cycles, identical to HEAD; 0 missed frames, 0 extra VBI, 0 DLI ordering
  errors. Debris gate PASS on the three natural replays (0 blank, 0 disappearances,
  first Y 24; maxima 30,232 / 30,439 / 30,216, identical to M1).
- **Tests.** Rebaselined with the reason in each file: `heavy-window` (merged
  record, 44-B transport, 7 records, 177 sectors, disjoint copy),
  `layout-d1` (publish before ENTITY expansion, call bytes, lifetime model),
  `formats` (no GLUE XEX segment), `starfield-staging-streams` (order),
  `transport-enabler` (fixture landings out of `$7BD0`),
  `transport-layout-regression` (GLUE at `$9C38`; still failing at HEAD and
  here on its stale numeric freezes and `light-wingman.s` include).
  Full suite: 644 tests, 114 failing, against 644 tests / 114 failing on a
  clean export of `58404c6` built in the same environment (candidate build
  then `node --test tests/*.test.mjs`, counting the owner's uncommitted
  `tests/booster-admission-diagnostic.test.mjs`); the failure-name sets are
  identical.

Candidate XEX `a5342494…`, ATR `c6d6ff8c…`, owner-smoke copy in
`build/owner-smoke/cold-record-relocation-a5342494/`. Evidence:
[diagnostics/stage-2b2l-cold-record-relocation.json](diagnostics/stage-2b2l-cold-record-relocation.json).
Owner smoke PASS 2026-09-17 (M2 accepted as a migration step; the runtime
acceptance checkpoint stays `b4b942e`).

---

## Roadmap 4.5M-M3 — `HYBRID_C_ARENA` — `OWNER-SMOKE CANDIDATE` (2026-09-17)

Infrastructure only, on top of the 4.5M-M2 candidate (`cac8657`), third step of
the 4.5M migration. No gameplay change and no Bomber code (no C tick,
admission, Heavy scheduler, QUAD, hull colour or Heavy marshalling; the
`experiment/bomber-4.5c-blocked-placement` branch is untouched). Every
CODE/BROADSIDE/LIGHT_CODE/A2/ENTITY_CODE/STARFIELD/debris/projectile/backing/
collision/VBI/DLI/PMG address is unchanged (`.lbl` diff: only
`hybrid_c_heavy_publish` removed and the arena symbols added).

- **`$7BD0-$7F0F` = `HYBRID_C_ARENA`, 832 B**, one contiguous reusable runtime
  arena (`HYBRID_C_ARENA_RAM` in `cfg/encounter-director.cfg`) that replaces
  the temporary 243-B `HYBRID_C_HEAVY` window architecture. Segments:
  `HYBRID_ASM_ARENA` (ca65 helpers, linked with the ABI veneer),
  `HYBRID_C_ARENA` (cc65 CODE, `#pragma code-name`) and
  `HYBRID_C_ARENA_RODATA` (cc65 RODATA, `#pragma rodata-name`). Content: the
  1-B `rts` anchor `hybrid_arena_anchor` at `$7BD0`. Used 1 B (ASM 1, CODE 0,
  RODATA 0), free 831 B.
- **Assertions.** ld65 (`src/hybrid/c-asm-abi.s`): start `$7BD0`, capacity
  832 B, end ≤ `$7F10` (A2 display lists), contents ≤ capacity, non-empty
  anchor; `src/main.s`: end ≤ `PLAYFIELD_DLIST_A` and A2 staging, start ≥
  starfield stream A / pause backup end; `scripts/build.mjs`: the same plus the
  arena record as the only owner of the range.
- **Transport (measured).** The arena is its own DFMC record in the slot M2
  freed: LZ, final destination `$7BD0`, 1 B raw / 3 B packed, 1 sector (173),
  104 B padding; direct landing (ATR stage 2 decode, XEX 1-B segment), no hold,
  no publish copy. **8 records, 178 transport sectors** (177 before), initial
  block 103 sectors / 13,162 B unchanged, XEX 23,100 → 23,105 B.
- **Retired.** `hybrid_c_heavy_publish` (its 14 B stay zero padding in place),
  the `stage_glue_holding` tail-jump (now `rts` + 2 B padding), the 44-B Heavy
  tail of the merged record (now 498 B, 44 B below `$9D5E`), the
  `HYBRID_C_HEAVY_*` equates, asserts and manifest `residentCapacity.heavyWindow`
  (now `residentCapacity.arena`). `scripts/chunk-loader.mjs` reviews
  `[$7BD0, $7F10)` as a landing range; `scripts/capacity-window-watch.mjs`
  documents the arena configuration.
- **Accounting.** Physical: linked runtime 17,502 B unchanged, simultaneous
  19,493 → 19,494 B, safe 2,694 → 2,693 B (the anchor). Reserved: arena 832 B
  (replaces the 243-B window). Reusable: arena 831 B free; `HYBRID_C_EXT` 21 B,
  `HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2 18 B, pickup fill 11 B unchanged.
  BSS unchanged (16 B C, no C stack, no new zero page). Packed record bytes
  8,751 → 8,754 B.
- **Boot (measured).** Native clocks `start → show_loader` XEX 2,047,758 →
  2,046,995 (−763), ATR 2,047,766 → 2,046,995 (−771): the retired 44-B copy;
  the extra ATR sector read and 3-B decode run before `start`. Boot smoke PASS
  4/4: XEX menu 392 (deadline 502) unchanged; ATR start 229 → 231, menu 544 →
  **546** against deadline 544 → **546** (formula unchanged, 0 frames margin as
  before).
- **Native write-watch** (XEX/ATR × cold fill `$00`/`$A5`; cold start,
  OPTIONS, gameplay, pause/resume, one capital sector entered and completed,
  game over, restart, pause/quit), all PASS 4/4: full arena `$7BD0-$7F0F`
  equal to `build/encounter-director-code-arena.bin` at `start` and 0 writes
  to the end of the lifecycle, combined with the M2 ABI (`$8018`) and merged
  (`$9B40`) record checks and GLUE hold from `layout_d_cold_publish_complete`;
  M1 streams A/B, decoded STARFIELD, GLUE hold `$8100` and `$8602` window.
- **Capacity proof (throwaway, not committed).** 20 cc65 functions (775 B
  CODE) + 34 B cc65 RODATA + 22 B ca65 helper behind the anchor: exactly 832 B
  linked; 833 B fails in ld65. Record 363 B packed, 3 sectors (180 transport
  sectors). Native write-watch PASS 4/4 byte-exact over all 832 B on XEX and
  ATR. Boot smoke: XEX 392; **ATR menu 551 vs deadline 550 (one frame late)**
  — see the boot-smoke margin under open defects; not a gate of this
  candidate, relevant to the Bomber retry.
- **PAL (native).** `2-evasive-fire3` 29,519 and `2-sweep-fire4` 29,801 cycles,
  identical to M2; 0 missed frames, 0 extra VBI, 0 DLI ordering errors. Debris
  gate PASS (maxima 30,232 / 30,439 / 30,216).
- **Tests.** `tests/heavy-window.test.mjs` → `tests/hybrid-c-arena.test.mjs`
  (3 tests: arena contract, direct-landing record, retired Heavy transport);
  rebaselined `layout-d1` (suffix tail, lifetime model) and
  `starfield-staging-streams` (arena instead of the Heavy window). Full suite:
  643 tests, 114 failing, against 644 / 114 on a clean export of `cac8657`
  (the renamed file has 3 tests instead of 4); the failure-name sets are
  identical.

Candidate XEX `cbba293f…`, ATR `a75c62b9…`, owner-smoke copy in
`build/owner-smoke/hybrid-c-arena-cbba293f/`. Evidence:
[diagnostics/stage-2b2m-hybrid-c-arena.json](diagnostics/stage-2b2m-hybrid-c-arena.json).

---

## Emitter-independent hostile shots — `OWNER-SMOKE CANDIDATE` (2026-09-17)

Owner decision 2026-09-17: an already-emitted hostile projectile is
independent of its emitter and continues its normal lifecycle after the enemy
dies (Raider, Light Wingman, Interceptor, future Bomber shell).

- **Root cause.** Every lethal Raider hit ran
  `begin_enemy_fighter_explosion_with_projectile_cleanup`, freeing the hostile
  slots whose ACTIVE bit 0 matched the dead Raider; Light shots carry the P1
  tag, so they vanished with Raider P1. The Light kill path never cleared
  shots; no C code touches projectile slots.
- **Change.** `spawn_interceptor_breakup_effects` jumps straight to
  `begin_enemy_fighter_explosion`; the 27-B cleanup routine is removed.
  Owner/class bits stay (allocation, burst alternation, tracing). Shots still
  end on player collision, lifetime expiry, the bottom edge, player death
  (`clear_interceptor_pulses`), respawn (`clear_fighter_projectiles`) and new
  game/quit (`init_fighter_projectiles`); capital admission already waits for
  released shots.
- **Placement (measured).** ENTITY_CODE 3,153 → 3,126 B; free ENTITY tail
  13 → 40 B; Light art `$9D31-$9D50` → `$9D16-$9D35`; linked runtime
  17,502 → 17,475 B; simultaneous 19,494 → 19,467 B; safe 2,693 → 2,720 B;
  initial boot content 13,162 → 13,137 B; 178 transport sectors unchanged;
  BSS, zero page and C stack unchanged. No memory-architecture change.
- **CPU.** No added code; per-kill cost −144 cycles (5-slot scan gone).
  Orphaned shots live out their lifetime inside the unchanged 5-slot pool.
  Native PAL, 21 sessions: 0 missed frames, 0 extra VBI, 0 DLI errors; worst
  30,820 → 30,820 (`director-complete-1`); largest delta
  `debris-effects-2-sweep-fire4` 30,216 → 30,767 (diverging replay);
  `2-evasive-fire3` 29,519 → 29,570, `2-sweep-fire4` 29,801 unchanged.
- **Gates.** Boot smoke PASS 4/4 (XEX menu 392; ATR 546 vs deadline 546).
  PairShot-stale native PASS. Raider-remnant native: 200 emitter-owned shots at
  135 kills all continued, 0 removed, 0 foreign removed, 0 stale cells / orphans
  (report fails only on the pre-existing explosion count). Debris gate: 2/3 PASS;
  `0-evasive-fire3` has 1 blank frame in 1,013 caused by the pre-existing
  death-frame blink (open defects); baseline PASS 3/3 on its own diverging
  replay.
- **Tests.** New `tests/hostile-projectile-emitter-independence.test.mjs` (6,
  all fail on `2a67684`); updated `raider-projectile-ownership`,
  `light-wingman`, and the measured sizes in `light-interceptor` and
  `hybrid-c-arena`. Full suite: failure-name set identical to `2a67684`
  except one renamed ownership test that keeps its pre-existing harness score
  assertion (0x35 ≠ 0x10).

Candidate XEX `f9c4a96d…`, ATR `5e026009…`, owner-smoke copy in
`build/owner-smoke/hostile-shot-independence-f9c4a96d/`. Evidence:
[diagnostics/stage-2b2n-hostile-shot-emitter-independence.json](diagnostics/stage-2b2n-hostile-shot-emitter-independence.json).

---

## Roadmap 4.5c — Bomber (decision 20) — `OWNER-SMOKE CANDIDATE` (2026-09-17)

The `BLOCKED_PLACEMENT` design of `experiment/bomber-4.5c-blocked-placement`
(`8e138a8`) reapplied on top of `67bfa73` with its Heavy formation C in the
4.5M-M3 arena. No redesign; the only adaptations are placement (arena
pragmas and veneer segment), an `asl/asl/asl/ora` class encoding in the
allocator (the build-time 6502 model has no `ROL A`) and the checked-in
`LIGHTFILE` placeholder size for raw test links.

- **Gameplay (candidate).** Fourth `EnemyArchetype` (offset 36): HP 4, lane
  sweep, single shot, pause 80/64/48, `BOMBER` class, score `$50`, Heavy
  `P1`/`P2` renderer with QUAD `SCYTHE_BOMBER` art in hull colour `$24`
  (recycle restores `$44` for the broadside missiles). Slot 0 sweeps X 48-92,
  slot 1 X 132-176 at 1 HPOS/frame, turning at lane edges or on a per-slot
  24-55-frame timer; entry at 1 line/frame to depth 40 / 16, then 1 line every
  other frame on opposite parity; each member fires on its own timer (first
  shot 48 / 72 frames) only for Y 24-200, player alive, capital not due. A
  **TEMPORARY 4.5 HEAVY SMOKE SCHEDULER** alternates Raider (with Light escort)
  and Bomber (no escort) formations, Raider first; roadmap 4.6 replaces it.
- **Ownership.** C: record, formation schedule, profile publication from the
  selected record, admission, lane-sweep tick and fire decision. ASM:
  `heavy_member_update` marshals the member's five slot bytes around
  `enemy_c_heavy_tick` and emits the returned class through the generic
  allocator (`ACTIVE = class << 3 | 2 | slot`, `$1A/$1B`); arena veneers write
  the hull colour to `COLPM1`/`COLPM2`. Raider formations keep their ASM
  motion.
- **Placement (measured).** Arena 392 / 832 B (ASM 20 incl. anchor, C 339,
  RODATA 33; 440 B free), record 355 B packed in 3 sectors. `HYBRID_C_EXT`:
  records 50 B + C 563 B + `LIGHT_CODE` 203 B + `HEAVY_CODE` 55 B, **tail 28 B**
  (21 B before; floor 16 B). `PICKUP_CODE` 769 → 773 B (fill 7 B). BSS +10 B:
  `$8119` Heavy schedule counter, Light counter moved to `$811A`,
  `HYBRID_HEAVY_STATE` `$811B-$8123`; C stack 0, new zero page 0. 180 transport
  sectors (178); XEX 23,105 → 23,497 B.
- **Accounting.** Physical: linked runtime 17,475 → 17,479 B, simultaneous
  19,467 → 19,855 B, safe 2,720 → 2,332 B. Reserved: unchanged. Reusable:
  arena 831 → 440 B, EXT tail 21 → 28 B, pickup fill 11 → 7 B.
- **CPU.** Build harness: Bomber member tick worst 545 cycles with a shot, 374
  without (≈1,090 per frame if both fire); admission 1,121, recycle 45 once per
  formation. Native PAL focused replays (67bfa73 → candidate, Bomber frames
  found by `colpm1 = $24`): `2-sweep-fire4` 29,801 → 29,101, `2-sweep-fire6`
  29,849 → **30,075**, `2-neutral-fire0` 29,807 → 29,894, `2-evasive-fire3`
  29,570 → 29,822; 0 missed frames, 0 extra VBI, 0 DLI errors (diverging
  replays).
- **Gates.** Boot smoke PASS 4/4: XEX 78/135/392; ATR start 235, loader 293,
  menu **550 vs deadline 550** (0 frames margin). Arena write-watch PASS 4/4
  (image exact at `start`, 0 writes). Debris gate PASS 3/3 (maxima 30,038 /
  29,881 / 30,077, with Bomber frames); `67bfa73` fails `0-evasive-fire3` on
  its own replay with the known death-frame blink, which is not fixed here.
- **Tests.** New `tests/heavy-bomber.test.mjs` (12). Rebaselined
  `hybrid-c-arena`, `hybrid-lifecycle`, `light-interceptor`, `light-wingman`,
  `cold-pickup-record-fit`, `enemy-combat`, `raider-projectile-ownership`
  (+ its runtime script), `hostile-projectile-emitter-independence`,
  `enemy-roster` (QUAD width, schedule shape) and `offscreen-spawn` (Bomber
  generation). Full suite 661 tests / 114 failing; failure names identical to
  a clean export of `67bfa73` plus the owner's untracked booster diagnostic,
  which fails identically there.

Candidate XEX `0e4721b2…`, ATR `42985ceb…`, owner-smoke copy in
`build/owner-smoke/bomber-4.5c-0e4721b2/`. Evidence:
[diagnostics/stage-2b2o-bomber-arena.json](diagnostics/stage-2b2o-bomber-arena.json).

---

## Death-frame deferral (on the 4.5d WIP) — `OWNER-SMOKE CANDIDATE` (2026-09-18)

On top of the roadmap 4.5d Enemy Identity Freeze WIP (`7b50bd6`, its report:
[diagnostics/stage-2b2p-enemy-identity-freeze-report.md](diagnostics/stage-2b2p-enemy-identity-freeze-report.md),
corrected 2026-09-18) and the timing tooling (`423818e`). The branch now passes
the PAL timing gate that 4.5d failed; 4.5d itself is presented to the owner
together with this fix (the report's option 2).

- **Change.** The PMG publication of the player death is deferred by one
  frame. `apply_player_damage` keeps every decision and clear (lifecycle
  `DYING`, life, `erase_bullet`, `clear_interceptor_pulses`,
  `clear_transient_effects`, HUD, hit sound) but no longer calls
  `begin_player_fighter_explosion`; the first DYING tick of
  `update_player_death` (`player_dying_tick`, 18 B in the ENTITY_CODE tail)
  begins it when the player explosion slot is idle, so the death frame pays
  neither `erase_player` nor the first explosion phase. `BROAD_DEATH_TIMER` is
  now `SHARED_FIGHTER_EXPLOSION_TOTAL+1` (25): the explosion still erases
  itself in the respawn frame, before `respawn_player`. No C, enemy, ring,
  backing/restore, collision, VBI/DLI or PMG-kernel change; hostile pools are
  still zeroed on the death frame.
- **Why not the enemy update or the ring.** Both misses are Light contact
  kills inside `light_update`, after `integration_update_enemy` and
  `rotate_playfield_rows` have already run in the frame; the transition
  cannot skip work that precedes it. Skipping the Light breakup on a lethal
  contact (C-owned) would save ~2,800 more but needs ~14 B in `HYBRID_C_EXT`
  (tail 19 B, floor 16 B): an owner placement decision, not taken.
- **Placement (measured).** BROADSIDE 6,650 B unchanged (size-neutral edits,
  `free_broadside_slot` `$76A7` asserted); ENTITY_CODE 3,126 → 3,144 B
  (`player_dying_tick` `$9D36-$9D47` behind the unmoved Light art, tail 40 →
  22 B); 182 transport sectors, initial boot content 13,132 → 13,150 B
  (envelope 52 → 34 B); linked runtime 17,479 → 17,497 B; `.lbl` diff: only
  the new labels and the ENTITY_CODE size.
- **PAL (measured).** PAL timing audit section above: 0 distinct miss events
  across 67 replays, worst margin 466 (`raider-remnant-rapid-xex-hard` row
  1945, −765 before), row 3007 +1,043 (−407 before); the measured saving per
  death frame is 1,231-1,465 wall cycles. Debris gate: `0-evasive-fire3` and
  `capital-muzzle-ring` PASS; `0-neutral-fire0` 1 blank frame in 1,558
  post-capital frames at host frame 5426, a player-death frame with four
  PairShots erased mid-frame — the documented pre-existing death-frame blink,
  not caused here (its 32 blank frames at `7b50bd6` were the overrun's
  aftermath and are gone). Raider-remnant: fails only on the pre-existing
  explosion count (42/42 emitter shots continued, 0 stale, 0 orphans).
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554.
- **Tests.** New harness test (entity-effects): deferred begin, 25-frame
  DYING, explosion erase before respawn. Rebaselined with the reason in each
  file: `game-over`, `score`, `hud-status`, `entity-effects`, `broadside-fire`,
  `light-wingman`, `light-interceptor`, `hybrid-c-arena`, and the
  `scripts/broadside.mjs` model. Focused set 181 tests / 13 failing and full
  suite 675 / 114, both the identical failure-name set to a clean export of
  `423818e` (674 / 114).
- **Owner-visible.** The fighter stays visible one extra frame after a lethal
  hit and shows the ordinary hit flash on it before the death flash; respawn
  and Game Over come one frame later.

Candidate XEX superseded by the respawn double-image fix below. Evidence:
[diagnostics/stage-2b2r-death-frame-deferral.json](diagnostics/stage-2b2r-death-frame-deferral.json).

---

## Respawn double image after the deferral — fixed — `OWNER-SMOKE CANDIDATE` (2026-09-18)

Owner smoke of `b8ed318c…` **FAILED**: on every death, two PlayerFighter images
appeared during respawn — one at the corridor centre, one four colour clocks
left — flickered, then resolved to one ship. Fixed here; the deferral itself is
unchanged.

- **Cause (measured).** `player_dying_tick` guarded the deferred begin with
  "player explosion slot timer 0 means begin pending". On the LAST DYING frame
  that is false: `tick_shared_fighter_explosions` runs earlier in the same
  frame and, at `EXPL_TIMER` 1, erases the slot and decrements it to 0. The
  guard then read 0, restarted the explosion at the still-pre-death
  `player_x`/`player_y`, and fell through two instructions later to
  `respawn_player` — publishing a second image into P0/P3 for a further 24
  frames and leaving `HPOSP0`/`HPOSP3` at the explosion X instead of
  `PLAYER_RESPAWN_X`. `BROAD_DEATH_TIMER = SHARED_FIGHTER_EXPLOSION_TOTAL+1`
  is what makes both timers finish on that one frame. A regression of the
  deferral, not pre-existing: `2a8ff26` has no begin call in the DYING path.
- **Fix.** The finishing frame leaves before the idle-slot test:
  `player_dying_tick` decrements `BROAD_DEATH_TIMER` first and branches to
  `update_player_death_finished` on zero, so only a non-finishing DYING frame
  reaches the idle-slot test and the begin. `apply_player_damage` is the only
  entry into DYING and sets `PLAYER_DYING` and
  `BROAD_DEATH_TIMER = SHARED_FIGHTER_EXPLOSION_TOTAL+1` in one unbranched
  tail, so "not the finishing frame" is exactly "not yet begun, or still
  running". No begin-pending flag needed, no RAM, 18 B unchanged.
- **Unchanged.** The deferral stands: the death frame still pays neither
  `erase_player` nor the first explosion phase, DYING still lasts 25 frames,
  the explosion still self-erases in the respawn frame before `respawn_player`.
  BROADSIDE 6,650 B (`free_broadside_slot` `$76A7` asserted); ENTITY_CODE
  unchanged; `.lbl` diff is one cheap local label (`.@tick` → `.@running`).
- **PAL (measured).** 0 distinct miss events across 67 replays; **timing-
  neutral** — no session's worst fence margin moved. Worst margin still 466
  (`raider-remnant-rapid-xex-hard` row 1945); row 3007 still +1,043. Death-frame
  cost +0; respawn frame −809 cycles (`update_player_death` 1,898 → 1,562,
  `render_shared_fighter_explosions` 493 → 20).
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554.
- **Debris gate and raider-remnant.** Byte-identical to `b8ed318c`: the one
  `0-neutral-fire0` blank frame (pre-existing death-frame blink) and the
  remnant explosion-count failure both persist unchanged, A/B-verified against
  a build of `ac67d9e`.
- **Tests.** The old deferral test could not see this: it never re-read the
  explosion timer after the final `update_player_death`, never called
  `render_shared_fighter_explosions`, and asserted nothing about P0/P3,
  `HPOSP0`/`HPOSP3` or `COLBK`. Two new entity-effects tests drive the full
  main-loop order through frame N+50 and assert one published image, the
  respawn HPOS and no death-flash replay; both fail on a rebuilt `b8ed318c`.
  The `game-over` `player_dying_tick` source freeze is rebaselined with the
  reason in the file. Focused set 175 tests / 17 failing, the identical
  failure-name set to a build of `ac67d9e` (173 / 17).

Candidate XEX `3ce1a1d6…`, ATR `823b961b…`. Evidence:
[diagnostics/stage-2b2s-respawn-double-image.json](diagnostics/stage-2b2s-respawn-double-image.json).

---

## Debris score (owner change request) — `OWNER-SMOKE CANDIDATE` (2026-09-18)

- **Request.** Destroying interactive debris awarded nothing; it must award a
  single difficulty-independent `DEBRIS_SCORE = $05`. Debris is an obstacle,
  not an enemy: the value stays an order below the Bomber's `$50` so clearing
  debris cannot compete with killing enemies.
- **Where.** `entity_debris_destroyed` (`src/main.s`, ENTITY_CODE) is reached
  only from `entity_debris_hit`, itself reached only from
  `entity_player_fighter_projectile_debris_target` — the lethal PlayerFighter
  shot. It now calls the new 18-B `add_debris_score`, which is the same
  mechanism as `light_add_score` / `add_archetype_score_tail`: one packed-BCD
  add and `jmp update_score_display`. No per-object state, no new RAM beyond
  the constant, no collision-architecture change.
- **Not scored.** Player contact (`entity_player_debris_overlap`), the despawn
  path (`entity_despawn_debris`) and the sector-boundary release all reach
  `integration_debris_release` without passing through
  `entity_debris_destroyed`, so they award nothing. A non-lethal hit awards
  nothing.
- **Cost.** ENTITY_CODE `$C48` → `$C5D` (+21 B: the routine plus its call);
  ~105 cycles, only on a debris-kill frame. BROADSIDE 6,650 B unchanged
  (`free_broadside_slot` `$76A7` asserted); `HYBRID_C_ARENA` 614/832 B used,
  218 free, unchanged; transport 182 sectors, boot 103 sectors, both unchanged.
- **PAL (measured).** 0 distinct miss events across the audited replays.
  Worst fence margin 466 → **463** (`raider-remnant-rapid-xex-hard`, pre-wait
  24,811 → 24,802); `debris-gate-0-neutral-fire0` row unchanged at pre-wait
  24,206 / margin +1,043.
- **Boot smoke.** PASS 4/4: XEX menu 392; ATR menu 554 against deadline 554.
- **Debris gate.** A/B-identical to a rebuilt `1358ea1`: same lives per phase
  in all three sessions and the same single `0-neutral-fire0` blank frame
  (pre-existing death-frame blink).
- **Pre-existing native failures, A/B-verified unchanged on `1358ea1`:** the
  default wall-trace abort at `weapon-pickup-contact-2-hunt-fire4`, the same
  abort on `weapon-pickup-overlap-2-hunt-fire4`, the
  `capital-muzzle-ring-2-sweep-fire4` stale muzzle/flash abort, and the
  emulator status-2 exits of `capital-contact-{allied,hostile}-medium` and
  `lower-playfield-hostile-contact-xex-hard`.
- **Tests.** New `tests/debris-score.test.mjs` (5 tests): the trace-driven
  lethal award, a non-lethal hit, the contact path, the despawn path and a
  single-call-site source contract. `entity-effects` debris destruction and the
  `hybrid-c-arena` byte ledger rebaselined.

Candidate XEX `07dea143…`.

## Current task

The 4.5d Enemy Identity Freeze plus the death-frame deferral, its respawn
double-image fix and the debris score (sections above) await owner smoke on
`wip/4.5d-gate-fail`.
The previous smoke of `b8ed318c…` failed on the respawn double image only; that
defect is fixed and the rest of that smoke still needs repeating. Roadmap 4.5c Bomber is an
**`OWNER-SMOKE CANDIDATE`** (section above); the
earlier `BLOCKED_PLACEMENT`
([diagnostics/stage-2b2j-bomber-blocked-placement.json](diagnostics/stage-2b2j-bomber-blocked-placement.json))
is superseded by the M3 arena. Owner smoke is pending for it, for the 4.5M-M3
arena and the emitter-independent hostile shots candidates, the 4.5b review
and the 4.4 Interceptor (with 4.4b and 4.4c).

## Next roadmap step

Owner smoke of the 4.5d + death-frame deferral branch (Bomber attack pattern,
torpedo shells, charge/hit colours; the one-frame-later death explosion and a
single ship on every respawn) and of
the 4.5c Bomber candidate (Raider/Bomber alternation, lane sweep, `BOMBER`
shells, hull colours, capital broadside colours after a Bomber formation). Then
the Bomber standing-cost task (`draw_enemy_member` body copy only when Y
changed; hardware-critical, with proof) before more Bomber or 4.6 content.
Roadmap 4.6 (data-driven Encounter/Wave Director) starts only on
owner instruction. The Raider-coloured residual artifact and the debris
death-frame blink remain open.
