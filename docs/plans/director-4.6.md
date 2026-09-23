# Plan — roadmap 4.6: the data-driven encounter Director

**PLANNING session, 2026-09-23.** Branch `docs/plan-director-4.6` from `main`
at `c04156a` (`docs(backlog): splash silhouette replacement, with the measured
facts corrected`), worktree clean before and after. **Nothing here is
implemented; this document is the deliverable.** It builds on
[design-4.6-data-architecture.md](../design-4.6-data-architecture.md) (record
shapes, ownership boundary, the SWARM death-frame rule) and
[plan-4.6-placement.md](../plan-4.6-placement.md) (option (a), Q-1, the
re-costed byte need). Every place this plan departs from either is marked
**DEPARTURE** with its reason (collected in §10).

Every number is **MEASURED** from the named file at `c04156a` unless labelled
ESTIMATE or BRIEF (a figure carried from design-4.6 that the repository never
recorded).

Owner requirements this plan serves (2026-09-23): **R1** variable capital hull
length per level; **R2** variable waves; **R3** variable enemy types per
sector; **R4** variable number of sectors per level. Campaign shape: decision
**AC** (twelve levels, four regions of three, allied steel `$88` on 1-6 and
`$84` on 7-12, a boss ends every level, `LEVEL_MAX_ID` stays 16).

---

## 0. Precondition evidence

| # | Precondition | Result |
| --- | --- | --- |
| 1 | Clean worktree on `main`; main carries the per-level hull styles, the twelve-level documentation (AC), the green Bomber and the splash/loader change | **FAILED on first check, then PASS.** `main` was `6e05644`: hull styles (`2dc569f`), AC docs (`95ffffa`) and the green Bomber (`6e05644`) were there, but the splash/loader change (`d3c8710`, `c04156a`) sat unmerged on `feat/splash-sound-and-loader-text`. The owner chose "merge first, then plan" (twice). The fast-forward `main` `6e05644` → `c04156a` was executed **in this session on the owner's instruction** (`git merge --ff-only`, reversible from `main@{1}`); it is recorded here because AGENTS.md normally reserves the merge for the owner. Worktree clean before and after |
| 2 | `npm test` on the default build links, release gate green, evidence binds to `dist/`; recorded failures keep their names, 0 new | **PASS.** `node scripts/build.mjs --quiet` linked the default target (manifest `buildVariant: release`, `runtimeEvidence.status: final-bound`); `tests/runtime-evidence-binding.test.mjs` green ("the committed runtime evidence binds to the artifacts in dist/"); `tests/release-gate-semantics.test.mjs` 5/5 green; `docs/recorded-gate-failures.json` unchanged. Suite: **824 tests, 713 pass, 108 fail, 3 todo, 768 s**. Against the 109 names recorded in `plans/hull-set-v1.md` Appendix A: **0 new, 1 disappeared** ("showcase and asset sheets regenerate without ignored capture files" now passes — the media manifest has been current since `6e05644`). `git status` clean after the run apart from this file; `docs/media` was not dirtied |
| 3 | main hash, XEX SHA-256, gates recorded as the budget ceiling | `c04156a`; `dist/void-strike-65.xex` 28,390 B `fff6ccaf87272ac65a2698fe78558075b866522671e7c1e3957af7cc347ef0b1`; `dist/void-strike-65.atr` 92,176 B `2107272ad60d098099918f7f84907aa623bd0e6e856697c143f4a901cfc69532`; `dist/void-strike-65-boot.bin` `20ddd92ecf8c92cd1c3f4007e2409581cc82387ecbe431ea5ce434fa95e1fa19`. All three equal `docs/runtime-wall-trace.json` `artifacts` and `build/manifest.json` `runtimeEvidence` (`status: final-bound`) |

### 0.1 The budget ceiling, verified

| Gate | Value | Source |
| --- | ---: | --- |
| worst fence margin (GO ≥ 500) | **991** | PAL audit row `director-complete-2-natural-sweep-fire0` f6629; `docs/STATUS.md` (Bomber colour and splash tables). `docs/runtime-wall-trace.json` carries no fence field |
| DMA-on maximum vs 31,200 target / 32,568 hard gate | **31,349** | `docs/runtime-wall-trace.json` `gate.measured_wall_cycles_dma_on`; `heaviest_frame_cost_breakdown`: `director-complete-1-natural-sweep-fire0` frame 6888 |
| physical headroom | **4,219** | same file, `gate.measured_physical_headroom` |
| boot / extension / total transport sectors | **107 / 102 / 209** | `build/manifest.json` `transportCapacity` |
| initial block content vs ceiling | **13,652 / 13,684** (32 B) | manifest `initialBootContentBytes`; ceiling per STATUS |
| ATR menu deadline | **603**, baseline 596, delta **+7**, warn at +10 → **3 warn frames** | STATUS boot smoke; `docs/boot-deadline-baseline.json` (`atr_menu_frames` 596, `delta_warn_frames` 10, `delta_fail_frames` 50) |
| free ATR sectors | **511** | manifest `remainingAtrSectors` |

**A correction to the brief, MEASURED.** The brief says capital frames are the
heaviest in the game and cites the 31,349 DMA-on maximum. The recorded state of
that frame (`ten_heaviest_frames`/`heaviest_frame_cost_breakdown` in
`docs/runtime-wall-trace.json`) is `sector_state: 7`, which `src/c/lifecycle.h`
defines as `SECTOR_FIGHTER`: two live Raider members, a live Interceptor, four
Rapid player projectiles and two debris entities. Its cost is dominated by
player projectile render/backing (17,782 cycles), not by hull rows. The
heaviest **capital** rows in the evidence are `capital-muzzle-ring-2-sweep-fire4`
at **30,964**, `capital-contact-allied-medium` 29,122 and
`capital-contact-hostile-medium` 28,793 (`replay` sessions, same file). §5.1
costs the CAPITAL Light ceiling against 30,964, i.e. 236 cycles under the
target, not against 31,349.

---

## 1. What ships today that the data must reconcile with

| Item | Where (MEASURED) | Facts the plan builds on |
| --- | --- | --- |
| Level image | `scripts/build.mjs` `buildLevelImage`, `levelOneSectors = 8`, `levelDefFirstSector = 9` | 8-B header (`V`,`S`, format 1, id, sector count, payload length, **byte 7 = 9**); sectors 1-5 gameplay music at `$A608` (632 B reserved, 120 free); sectors 6-8 the hull block at `$A880` (280 B + 104 B pad); sectors 9+ carry nothing yet. Level 1 is an XEX-only block at `$A600` and an ATR run from `levelBaseSector = 320`; the XEX has no other level |
| Hull block | `scripts/capital-hulls.mjs` `HULL_STYLE_BLOCK_OFFSETS`; `build/level-hull-block.inc` | style id, version, **allied COLPF1** (level data since hull-set step 2), 13 reserved, enemy packed map 160, codebook 16, glyphs 56, boundaries 32. Addresses frozen; `publish_level_hull_style` copies it at gameplay start, on the loader screen |
| Hull length | `assets/graphics/capital-hulls.json` `sector.sections`; `build/capital-hulls.inc` `CAPITAL_HULL_SECTOR_ROWS = 480` | engines 32 + aft 80 + combat 256 + forward 80 + prow 32 rows, 8-row modules. Two **60-B module sequences** (`allied_sector_sequence`, `enemy_sector_sequence`, `src/main.s:7720-7723`, segment `BROADSIDE`) index modules by row/8; turret stations are sequence bytes whose bits 6-7 plus `DIFFICULTY_SETTING` decide visibility (`select_sector_module`, `src/main.s:6790`), so ONE sequence carries the 10/15/20 counts of all three difficulties. `resolve_allied/enemy_sector_row` (`src/main.s`, `BROADSIDE`) reject rows ≥ 480 with carry set. Phase thresholds 32 / 112 / 368 / 448 / 488 are constants in `sector_c_update_capital_phase` (`src/c/lifecycle.c`) |
| Director | `src/c/director.c` | `LEVEL1_DATA` 158 B (13 arrays × 8 phases + 5 arrays × 6 events) in `DIRECTOR_RAM` `$9D75-$9E12`, 2 B free; 12 B of state `$80F4-$80FF`; `director_c_world_row_tick` from `integration-glue.s:51` once per world row; `director_c_request` from the kernel's cadence; `_asm_director_dispatch_event` (`src/hybrid/c-asm-abi.s:180`) accepts opcodes 1-4 and denies 5 |
| Capital entry | `lifecycle.c` `FIRST_CAPITAL_FRAME = 600`, `sector_c_update_first_capital` | a frame gate (not a row), then `sector_c_drain_clear` (no Heavy pressure, no live or still-published Light) |
| Heavy during capital | `src/main.s:6233` `ordinary_wave_capital_blocked`; `:11563` `interceptor_admission_update` | the Heavy retry is frozen across the whole capital lifecycle; P1/P2 are lent to the broadside missiles M1/M2 (`c-asm-abi.s` `enemy_recycle`). **Heavy in a CAPITAL sector is a PMG conflict, not a policy** |
| Light during capital | `lifecycle.c` `LIGHT_CEILING_CAPITAL = 0`; `light_tick_body` retires any slot when `CAPITAL_SECTOR_STATE != SECTOR_FIGHTER` | design-4.6 §9; the Light erase/render is part of the fighter post-playfield window (`src/main.s:12860` ordering), which capital frames do not run |
| Provisional schedulers | `lifecycle.c` `encounter_heavy_*` (2 formations, 8 B arena RODATA), `encounter_light_schedule` (2 B), `light_wave_step` (window; armed only under `LIGHT_FORCE_POPULATION`), `provisional_interceptor_director_request` + `select_interceptor_request_phase` (`src/main.s:11775`, `:7342`) | all replaced by this plan |
| Ceilings | `lifecycle.c` policy bytes `light_ceiling_swarm/elite/capital` = 3 / 1 / 0 in `HYBRID_LIGHT_SLOTS` | resident upper bound, decision 23 §10.7 |
| Appearances | `light_appearance_installed[3]`, glyph pairs 120-125, source art in the `ENTITY_CODE` tail `$9D2B-$9D4A` (Wingman + Interceptor) | install hoisted to admission; three live looks max |
| Free RAM | `build/manifest.json`, `docs/memory-map.md` | arena `HYBRID_C_ARENA` 88 of 832 B free; `HYBRID_C_SECTOR` 18 B; unowned `$8129-$813F` 23 B; `BROADSIDE` 3 B tail + 16 B `enemy_hull_codebook_reserve` (zero pin); `STARFIELD` run tail 348 B; pickup stream fill 236 B; window code tail **27 B** (`residentCapacity.basicWindow.freeBytes`); sector reader tail 63 B |
| Existing tooling to reuse | `scripts/hybrid-director-ab.mjs` (Director A/B), `scripts/runtime-image.mjs` `installRuntimeSegments` + `scripts/nmos6502.mjs` (the harness `tests/encounter-director.test.mjs` uses), `scripts/weapon-pickup-runtime.mjs` `runRoutine` (used by `tests/level-hull-block.test.mjs`), the `--hull-style` review-variant pattern (`isReviewVariant`, `scripts/build.mjs:105`) | no new test infrastructure |

---

## 2. The data layout

Conventions, unchanged from design-4.6 §1: structure-of-arrays with fixed
strides indexed by one 8-bit register; every table page-bounded; authored in
JSON, compiled to bytes and validated at build. Offsets below are absolute
inside `LEVEL_BUFFER = $A600`.

### 2.1 The level image — 13 sectors, 1,664 B

| Sector | Range | Bytes | Content | Status |
| ---: | --- | ---: | --- | --- |
| 1-5 | `$A600-$A87F` | 640 | header 8 B + gameplay music player and score | unchanged |
| 6-8 | `$A880-$A9FF` | 384 | hull block 280 B + 104 B pad | unchanged; frozen addresses kept |
| 9-10 | `$AA00-$AAFF` | 256 | **LevelDef core page** (§2.2) | new |
| 11-12 | `$AB00-$ABFF` | 256 | **LevelDef payload page** (§2.3) | new; consumers arrive in steps 5-6 |
| 13 | `$AC00-$AC7F` | 128 | **HullGeometry page** (§2.4) | new — **DEPARTURE** from design-4.6 §1.1/§1.7 (32-B `hull_params` inside the payload page): the two module sequences alone are 120 B |
| — | `$AC80-$ADFF` | 384 | headroom inside a 16-sector buffer (§3) | — |

Header byte 7 stays **9**. `levelOneSectors` 8 → 13. The XEX-only block grows
by 640 B (no boot sector, no DFMC chunk slot: the block is outside the boot
transport, exactly as the music and hull moves were). The ATR START GAME read
grows by five sectors, ≈ 19 frames behind the loader screen (ESTIMATE at the
plan-4.3 model of 3.8 frames/sector), outside every gate.

### 2.2 LevelDef core page — 256 B, read by the Director

**Header, 16 B (`$AA00-$AA0F`):**

| Off | Field | Holds | Reader |
| ---: | --- | --- | --- |
| 0 | `magic_version` | `$56 \| format nibble` (1); `director_c_init` refuses a mismatch and completes the level immediately (fail closed, never a jump) | init |
| 1 | `level_number` | 1..12, HUD only | init |
| 2 | `sector_count` | 1..10 (**R4**) | row tick |
| 3 | `wave_count` | 1..20 | validator |
| 4 | `seed` | `STATE_RNG` initial value | init |
| 5 | `star_colour` | level default (21.3) | sector entry |
| 6 | `nebula_pattern` | 0 = none | sector entry |
| 7 | `boss_id` | 0 = none; BossDef index (4.7) | last sector |
| 8 | `hull_length_step` | 0-3, echo of §2.4 for the HUD/diagnostics | — |
| 9 | `pickup_policy` | every-Nth-kill divisor (3 today) + allowed booster bits | request |
| 10 | `debris_density` | base debris cadence | request |
| 11 | `spacing_scale` | difficulty spacing rule selector (23 §10.6 default) | admission |
| 12 | `debug_start_sector` | 0 in shipped data; a review build (§7) starts here | init (review builds only) |
| 13-15 | reserved | zero | — |

**SectorDef SoA, 8 arrays × 10 sectors = 80 B (`$AA10-$AA5F`).**
**DEPARTURE** from design-4.6 §1.2: the two cap arrays are packed into one
nibble byte so an array is free for the archetype mask **R3** asks for.

| Array | Off | Holds | Reader |
| --- | ---: | --- | --- |
| `sector_kind` | `$AA10` | bits 0-1 kind `SPACE=0 / CAPITAL=1 / BOSS=2`; bits 4-5 subtype `SWARM=0 / ELITE=1`; bit 7 last sector | row tick, sector entry |
| `sector_len` | `$AA1A` | rows / 8 (1 B → 2,040 rows). `CAPITAL` ignores it (the hull traversal is the clock, §2.4); `BOSS` ignores it (boss death is) | row tick |
| `sector_caps` | `$AA24` | low nibble Light ceiling 0-4, high nibble Heavy ceiling 0-2 — **requested**; runtime takes `min(requested, subtype table)` | admission |
| `sector_archetypes` | `$AA2E` | **R3** — bit mask of archetypes that may appear: bit 0 Raider, 1 Wingman, 2 Interceptor, 3 Bomber. Every wave in the sector must name an archetype inside it (validator); admission refuses anything outside it (runtime) | admission, validator |
| `sector_hazards` | `$AA38` | bits 0-1 debris max live (0-2), 2 pickups allowed, 3 broadside allowed, 4-7 debris cadence step | request |
| `sector_wave_first` | `$AA42` | first WaveDef index | row tick |
| `sector_wave_count` | `$AA4C` | waves in this sector (0 allowed: a quiet sector) | row tick |
| `sector_look` | `$AA56` | bits 0-3 star colour override, 4 nebula, 5-7 capital section variant | sector entry |

**WaveDef SoA, 8 arrays × 20 waves = 160 B (`$AA60-$AAFF`)** — exactly
design-4.6 §1.3 (`wave_row`, `wave_flags`, `wave_archetype`, `wave_path`,
`wave_count`, `wave_spacing`, `wave_entry`, `wave_member_offset`), with one
refinement: for a **Heavy** wave the member geometry is fixed by the renderer,
so `wave_member_offset` is read as the **escort archetype offset** (`$FF` = no
escort; today's Raider + Wingman pairing is `wave_archetype = 0`,
`wave_member_offset = 12`). This is what carries **R2**: composition
(`wave_archetype`, escort), cadence (`wave_spacing`, `wave_row`, trigger mode
in `wave_flags`) and count (`wave_count`, and how many waves a sector lists)
are all level data. `wave_path = $FF` means "the archetype's own movement"
(Raider cross-pursuit, Wingman follow, Interceptor pursuit, Bomber lane sweep)
and is the only value steps 1-5 author; the path evaluator is step 6.

### 2.3 LevelDef payload page — 256 B, as design-4.6 §1.1

`appearance[3]` 48 B (three 16-B Light bitmaps for pairs 120/121, 122/123,
124/125 — decision AD's re-skin), `path[8]` 96 B, `weapon_glyph[2]` 18 B,
`hull_params` 32 B (4.8a gondola/corridor parameters, unchanged in meaning),
`boss_def` 62 B (4.7). Carried from step 1 so the format never changes;
consumed from step 5 (appearances, weapon glyphs, starfield look) and step 6
(paths). Reconciliation with what ships: `light_pair_for_record` keys the
install on the archetype offset today; with the payload page it keys on
`wave_flags` bits 0-1 (appearance slot: 0 = archetype art, 1-3 = payload slot)
and the ASM install takes its source from a 5-entry address table (2 archetype
arts + 3 payload slots), ~12 B in the Light kernel (ESTIMATE).

### 2.4 HullGeometry page — 128 B, **R1**

| Off | Bytes | Field | Reader |
| ---: | ---: | --- | --- |
| `$AC00` | 2 | `hull_rows` lo/hi — multiple of 8, one of 288 / 352 / 416 / 480 | validator; `sector_c_update_capital_phase` |
| `$AC02` | 4 | phase starts in modules (row/8): aft, combat, forward, prow. Drain = `hull_rows/8 + 1` (today 4 / 14 / 46 / 56, drain 61) | `sector_c_update_capital_phase` |
| `$AC06` | 1 | `turret_density_step` 0-3, echo for diagnostics | — |
| `$AC07` | 1 | reserved | — |
| `$AC08` | 60 | `allied_sequence` — the module sequence for this level's length and density, padded to 60 with the last prow module after the hull end | `resolve_allied_sector_row` |
| `$AC44` | 60 | `enemy_sequence` — same, in enemy orientation | `resolve_enemy_sector_row` |

**Where length enters the level data.** The JSON says `"hull": { "length": 2,
"turrets": 3 }`; the compiler asks `compileCapitalHulls` for a sequence with
`combatModules = 8 × (length + 1)` — 8 / 16 / 24 / 32 modules → **288 / 352 /
416 / 480 rows** (engines 32, aft 80, forward 80 and prow 32 stay fixed:
224 rows) — and with the turret count table of the chosen density step
applied over that length (the existing seeded layout, LCG seed 13, unchanged
algorithm; the difficulty bits keep all three difficulties in one sequence).
Decision F's "length in segments as a four-step parameter" is therefore a
build-time choice per level, and both hulls flank one corridor so both
sequences follow the same length.

**What it costs.**

| | Bytes | Sectors | Label |
| --- | ---: | ---: | --- |
| per level on disk | +128 | **+1** (sector 13) | MEASURED layout |
| the per-level hull block | **280 B, 3 sectors, unchanged** | 0 | its frozen addresses and `tests/level-hull-block.test.mjs` survive untouched |
| resident data | **0** | — | the sequences leave `BROADSIDE` |
| resident code | +2 operand edits (0 B): `lda allied_sector_sequence,y` → `lda $AC08,y`, same for enemy; `sector_c_update_capital_phase` re-written to read four threshold bytes: **+25-40 B of C** (ESTIMATE), moved from `HYBRID_C_SECTOR` (18 B free) to the arena (88 B free) | | |
| in-frame cycles | **0** on the hull-row path (same instructions, different operands); +~20 cycles per hull-row **event** in the C threshold read (ESTIMATE), not per frame | | |
| refund | **−120 B of incompressible sequence bytes from the initial block** (`BROADSIDE` is in the resident image); the range is held as a zero pin (as `enemy_hull_codebook_reserve` is) so no address moves; packed initial block **shrinks** — MEASURE at step 4 (ESTIMATE ≥ −100 packed B, i.e. the 32-B headroom grows) | | |

Why the two `cmp #<480` compares are not touched: the compiler pads a short
sequence with the prow module, and the phase machine enters `DRAIN` at
`hull_rows + 8`, so rows between the hull end and the drain resolve to a prow
module and rows ≥ 480 never occur for a short hull. The step-4 session must
confirm by grep that nothing else reads `CAPITAL_HULL_SECTOR_ROWS` (at
`c04156a`: only the two resolvers, `src/main.s:6705` and `:6748`) and that
`CAPITAL_HULL_TURRET_COUNT` sizes the tracked-muzzle arrays (stations on screen
at once), not the stations per hull.

---

## 3. Where the data lives — disk, RAM, and Q-1

### 3.1 Q-1 answer: **16 sectors**

Per-level demand, worst case, MEASURED layout:

| Item | Bytes | Sectors |
| --- | ---: | ---: |
| header + gameplay music (reserved) | 640 | 5 |
| hull block | 280 (+104 pad) | 3 |
| LevelDef core page | 256 | 2 |
| LevelDef payload page | 256 | 2 |
| HullGeometry page | 128 | 1 |
| **total** | **1,664 (1,560 used)** | **13** |

Sixteen sectors (2,048 B) leave **3 sectors / 384 B**; twenty-four (3,072 B)
leave 11 sectors but give the code window only 1,024 B. plan-4.6-placement §4.1
puts the Director's net need at ~400 B (ESTIMATE) and design-4.6 §5 the 4.7
boss controller at 300-500 B; 1,024 B covers 4.6 alone. **Pick 16**:
`LEVEL_BUFFER = $A600-$ADFF`, the Director link's window becomes
`$AE00-$BBFF` (3,584 B, of which the Light C 801 B and the Light kernel 708 B
use 1,509 → **2,075 B free**). Edit surface, MEASURED: `levelBufferSectors`
(`scripts/build.mjs:213`), `MAX_LEVEL_SECTORS` (`src/hybrid/sector-reader.s:124`),
the two `MEMORY` blocks in `cfg/sector-reader.cfg` and
`cfg/encounter-director.cfg`; `scripts/build.mjs:1826` already refuses a level
over the buffer, `:2267` a window that starts inside it. Owner decision X is
the precedent (44 → 32); the reverse edit is the same constant. Nothing in
this plan designs a payload beyond 13 sectors: 4.7 lives in `boss_def`, 4.8a in
`hull_params`, both inside the payload page.

### 3.2 Disk

Twelve levels × 13 sectors = **156 sectors** from `levelBaseSector = 320`, of
511 free (`build/manifest.json` `remainingAtrSectors`) → 355 left. The reader's
directory (`build/level-directory.inc`) is generated from the runs actually
placed; `LEVEL_MAX_ID` stays 16 with four zero entries (decision AC).

The **XEX** carries level 1 only, as today. Any other level on the XEX comes
from the debug route (§7) until 4.9 settles what the XEX campaign is (twelve
resident images are 19,968 B and do not fit; open decision §11.5).

### 3.3 Transport rule for every step (owner constraints, 2026-09-23)

The ATR menu milestone measures start → menu and stage 2 decodes **every**
resident record before the menu, so any record that gains a sector costs ≈ 2
frames (STATUS, rule 11 "boot sectors are paid in packed bytes"). With the
delta at +7 and the warn band at +10, the whole of 4.6 has **at most one
sector** of transport growth, and the owner has asked that the three warn
frames not be spent. Therefore:

* the initial block content stays ≤ 13,652 B, boot stays 107 sectors;
* new resident code is paid from **refunds inside the same records**: Director
  record — `LEVEL1_DATA` 158 B + the phase machinery ~190 B (design-4.6 §7.2
  ESTIMATE); arena record — the Heavy smoke scheduler ~45 B (placement F8);
  window record — the provisional Light wave ~60 B (ESTIMATE from
  `light_wave_step`); `PICKUP_CODE`/`BROADSIDE` — `provisional_interceptor_director_request`
  + `select_interceptor_request_phase` ~55 B (design-4.6 §2.2); `BROADSIDE` —
  the 120-B sequences (step 4);
* every step reports `initialBootContentBytes`, the three sector counts and the
  ATR menu frame from a `--boot-smoke-only` run; **a step whose measured
  transport would add a sector STOPs** with the exact sector count and asks the
  owner to re-base `docs/boot-deadline-baseline.json` deliberately, rather
  than spending the warn frames.

**DEPARTURE** from plan-4.6-placement §6, which put the whole Director in the
window first: the window record is LZ-packed and +400 raw B was costed there
at ≈ +3 sectors / +6 frames, which the constraint above forbids. The Director
core therefore lands in `DIRECTOR_RAM` where its predecessor's bytes already
ride in the initial block, and the window at `$AE00` (option (a) still holds
and is still recommended, step 0) takes the overflow and everything that is
new rather than replacing — each addition measured against the rule.

### 3.4 RAM

| What | Where | Bytes |
| --- | --- | ---: |
| LevelDef core, payload, geometry | `$AA00-$AC7F` in `LEVEL_BUFFER` (never in any artifact but the level image) | 640 |
| Director core C (sector/wave stepper, ceilings, level accessor) | `DIRECTOR_RAM` `$9D75-$9FF7`, replacing `LEVEL1_DATA` and the phase machinery; net **+0…+110 B** (design-4.6 §7.2 ESTIMATE); overflow to the window `$AE00+` | ≤ 643 |
| Director state | `$80F4-$80FF` reinterpreted: row lo/hi, `sector_index`, `wave_cursor`, `wave_remaining`, `spacing_timer`, row-in-sector lo/hi, volley pulse, RNG, flags, admission frame; plus 6 B at `$8129-$812E` (installed appearance ×3, live Light count, live Heavy formations, expensive-event token echo) | 12 + 6 |
| resident policy tables | arena RODATA: `subtype_ceiling[4][2]` (SWARM H0/L3, ELITE H2/L1, CAPITAL H0/L0, BOSS per 4.7), class spacing floors (Light 16 frames, Heavy = `interceptor_admission_retry_frames`), physical capacity | ~14 |
| path library (step 6) | window | 96 |

Runtime pointers: none. The Director reads the pages through
`level_core[offset]`, `level_payload[offset]`, `level_geometry[offset]` —
three link-time symbols of a `LEVEL_BUFFER`-typed segment with `file = ""`,
exactly as design-4.6 §3 requires; `U8_AT` is never used for level data. The
existing cc65 audit (no `ptr1`, no `sp`) stays at zero.

---

## 4. What the Director executes per frame, and what it reads only at a boundary

| When | What | Cost (per-frame delta vs today) |
| --- | --- | --- |
| level start — `director_c_init` (existing ABI entry) | validate `magic_version` (fail closed → `FLAG_COMPLETE`); seed RNG; enter sector 0: publish caps/hazards/mask into the 6 state bytes, `STARFIELD` opcode with the look byte (step 5), `CAPITAL_DUE` if kind = CAPITAL, arm the first wave if its row is 0 | once; on the loader screen |
| world row — `director_c_world_row_tick` (existing call, `integration-glue.s:51`) | row-in-sector++; if ≥ `sector_len`×8 (SPACE only) → sector entry as above; if `wave_cursor < first+count` and row ≥ `wave_row`×8 → arm the wave (`wave_remaining = wave_count`, `spacing_timer = 0`). Replaces `director_check_phase` + the event scan + the defer path | **≤ +40 cycles ESTIMATE**, same shape (two byte compares and a table read) |
| per frame — `enemy_c_light_wave` (existing call, window) | the armed **Light** wave stepper: spacing timer, `light_admit` with the wave's archetype, entry column and appearance slot; `wave_remaining` decremented only on success | replaces `light_wave_step` **1:1** |
| on request — `director_c_request` (existing kernel cadence: Heavy retry, debris, pickup, broadside) | hazard mask from `sector_hazards`; for Heavy: is the current wave a Heavy wave with formations remaining, is its archetype in `sector_archetypes`, live formations < effective Heavy ceiling, `_asm_director_can_allocate` (unchanged); answers yes and writes `heavy_archetype_offset` + escort for `enemy_c_spawn_raiders`. Replaces the intensity budget, `phase_budget/reaction/recovery` and the kernel's phase override | **≤ +30 cycles ESTIMATE** per request, never per frame |
| sector entry | `STARFIELD` (step 5), `CAPITAL_DUE` (replaces the frame-600 gate; capital entry still waits for `sector_c_drain_clear`), `BOSS_HANDOFF` for a BOSS sector (4.7 hook, today's opcode 5) | once per sector |
| capital hull row event | `sector_c_update_capital_phase` reads four threshold bytes instead of constants (step 4) | +~20 cycles per hull-row event ESTIMATE |

**Per-frame budget for this plan, set from the measurement at the branch
point (STATUS requires it; plan-4.6-placement §6.1 did not waive it):** steps
2-5 may add **at most +100 cycles on any replay row**; the worst fence margin
must stay **≥ 500 (GO)** on every replay of the re-scripted set, against the
**991** baseline at `c04156a`; the PAL audit (`scripts/pal-timing-audit.mjs`,
72 replays) runs at every step that changes the runtime. Step 6's path
evaluator (~80-120 cycles per live member, design-4.6 §1.4 ESTIMATE) is
measured on a prototype before integration and carries its own budget.

Population itself is not a Director cost: the ceilings bound it exactly as
today (SWARM 3, ELITE 1 + 2 Heavy, CAPITAL 0), and the death-frame token rule
already ships.

---

## 5. The boundary the data may not cross

4.6's rule: **a level file may make the game easier than the runtime allows,
never harder.** Enforced three times:

1. **Build — `scripts/level-compiler.mjs` rejects:** `sector_count` > 10,
   `wave_count` > 20, a sector whose waves exceed its `sector_wave_count`, a
   Heavy archetype in a SWARM sector, any Light in a CAPITAL sector (until
   §5.1 is paid), a wave whose archetype is outside `sector_archetypes`, more
   than two distinct archetypes in one wave (rule 10: one dominant + at most
   one supporting), a BOSS sector that is not last, `boss_id` without a BOSS
   sector, hull rows outside {288, 352, 416, 480}, non-monotonic thresholds,
   a Heavy path with dy < 0 (step 6), spacing below the class floor, entry
   columns outside 48-200. It **warns** when a requested cap exceeds the
   subtype table (the file is legal, the runtime clamps).
2. **Load — `sector_reader_validate`** (unchanged): magic, version, id,
   sector count vs the directory.
3. **Runtime — admission:** `effective = min(sector_caps, subtype_ceiling)`;
   live counts vs physical capacity (`_asm_director_can_allocate`, and the
   Light slot scan); `spacing = max(requested, floor)` after the difficulty
   scaling (23 §10.6); `wave_count` is a request decremented only on a
   successful admission; `hull_rows` clamped to 480 and sequence indices to
   0-59; an unknown `magic_version` completes the level immediately. Nothing
   in a level file can name code: archetypes are offsets into the frozen
   4-record table (ROSTER FREEZE, decision 21; variants are re-skins, decision
   AD), paths are ids into a resident library or the payload page.

### 5.1 The CAPITAL Light ceiling — the owner's choice on R3

**What blocks Lights in CAPITAL sectors, MEASURED:** (i) `light_tick_body`
retires every slot while `CAPITAL_SECTOR_STATE != SECTOR_FIGHTER`; (ii)
`light_ceiling()` returns `light_ceiling_capital = 0`; (iii) capital entry
waits for `sector_c_drain_clear` (no live or published Light); (iv) the Light
erase and render belong to the fighter post-playfield window, which capital
frames do not run (design-4.6 §9, `src/main.s:12860`). **Heavy in CAPITAL is
not liftable at all**: P1/P2 are the broadside missiles' PMG during the
traversal (`c-asm-abi.s`, `enemy_recycle`) and the Heavy retry is frozen for
the whole capital lifecycle (`ordinary_wave_capital_blocked`). So "enemy types
in a capital sector" can only ever mean Lights.

**What lifting it costs:**

| Item | Cost | Label |
| --- | --- | --- |
| (a) Light publication inside the capital frame's late window — a new raster-critical writer in the visible frame; proof-first ASM (AGENTS.md hardware-critical) | 30-60 B in the window; one proof session with native measurement before integration | ESTIMATE |
| (b) 4.8c minimum scope (owner-approved 2026-09-22): place a Light only in a corridor cell free of hull/gondola/turret, clamp its lateral motion to the corridor width; no avoidance AI, no enemy-vs-hull collision | 60-100 B (from the measured `experiment/interceptor-blocked-placement`, `docs/diagnostics/stage-2b2c-interceptor-blocked-placement.json`) | ESTIMATE |
| (c) cycles on capital frames: one standing Light ≈ +412 (BRIEF, design §8); a Light kill frame ≈ +1,360 (token-serialised) | heaviest capital row 30,964 → **≈ 31,380 standing (over the 31,200 target)**, ≈ 32,320 on a kill frame (≈ 250 under the 32,568 hard gate); the capital rows' line-238 fence margin is **not in the evidence** and must be measured with new capital replays | MEASURED base + ESTIMATE delta |
| (d) the entry/drain predicate and the retire branch reworked; `LIGHT_CEILING_CAPITAL` becomes a real ceiling | ~30 B of C | ESTIMATE |
| (e) evidence: re-scripted capital replays, PAL audit, boot smoke, evidence regeneration | one session | — |

Realistic total: **one proof session, one integration session, and a probable
ceiling of ONE Light in capital**, with the target-line breach on the
heaviest capital row accepted or bought back elsewhere. It also pulls 4.8c
forward, whose own open question is whether the final corridor width makes
it unnecessary.

**Recommendation: restrict per-sector enemy selection to non-capital sectors
in 1.0.** CAPITAL sectors keep what they have — hull turrets, debris and
pickups — and `sector_archetypes` must be 0 there (validator). The format,
the tables and the runtime clamp already carry a CAPITAL row, so if the owner
later pays for (a)-(e), it is a table value and a data change, not a format
change. **If the owner chooses to pay, that work is a separate
hardware-critical step before step 3 authors a capital sector with Lights;
this plan does not schedule it.**

---

## 6. Authoring — how the owner writes a level

* **Source:** `assets/levels/level-01.json … level-12.json`, one file per
  level, tracked in Git (rule 12). Names, not numbers, and world rows, not
  eighths:

```json
{
  "level": 2, "seed": 77, "stars": "blue", "hull": { "length": 2, "turrets": 3 },
  "sectors": [
    { "kind": "space", "subtype": "swarm", "rows": 1200, "archetypes": ["interceptor", "wingman"],
      "lights": 3, "hazards": { "debris": 2, "pickups": true },
      "waves": [
        { "row": 96,  "archetype": "interceptor", "count": 3, "spacing": 48, "entry": 124 },
        { "row": 480, "archetype": "wingman",     "count": 4, "spacing": 32, "entry": 92, "mirror": true }
      ] },
    { "kind": "capital", "archetypes": [], "hazards": { "debris": 1, "pickups": true, "broadside": true } },
    { "kind": "space", "subtype": "elite", "rows": 960, "archetypes": ["bomber", "raider", "wingman"],
      "waves": [ { "row": 64, "archetype": "bomber", "count": 2, "spacing": 120, "escort": "wingman" } ] }
  ]
}
```

* **Build step:** `scripts/level-compiler.mjs` (imported by `scripts/build.mjs`
  where `levelRuns` is built) compiles each file into the three pages,
  validates it (§5), and emits `build/level-N.bin` and a `build/levels.json`
  summary; the sequences come from `compileCapitalHulls` with the level's
  length and density. `npm run levels:check` runs the validator alone in under
  a second, with messages that name the file, the sector and the field.
* **Preview without booting:** `node scripts/level-preview.mjs 2` prints the
  level's timeline — row, sector, kind/subtype, wave, archetype, count,
  effective caps after clamping, and the hull length in rows — so an authored
  level can be read as a table before it is played. (Pattern:
  `scripts/preview.mjs`.)
* **Vocabulary:** `docs/level-authoring.md` — an engineering document
  (single-language, English, per `docs/README.md` §"Documentation language")
  with every field, its range and one worked example. Player-facing text does
  not change with this plan; if step 3 names regions for the player,
  `how-to-play.md` and `how-to-play.pl.md` change together (decision V).
* **Level 1** is authored to reproduce today's level 1 (§8, step 2), which is
  also the worked example.

Twelve levels are twelve JSON files, a validator that refuses what the
runtime cannot honour, and a preview that shows the result: no engineer in
the loop.

---

## 7. Debug route — any level, any sector, before the campaign exists

`node scripts/build.mjs --level=N[:sector=M]` (npm script `level:play`), a
**review variant** in the exact shape of `--hull-style`: artifacts go to
`build/level-N-sM/`, never `dist/`; runtime measurement is skipped; no gate
consults it. It (1) bakes level N's image as the XEX-only block and as the
ATR's level-1 run, (2) assembles the sector reader with `-D LEVEL_DEBUG_ID=N`
so `sector_reader_start_gameplay`'s `lda #$01` becomes `lda #N`
(`src/hybrid/sector-reader.s:192`; `.ifndef` keeps the default byte-identical),
(3) stamps `debug_start_sector = M` into the core page. `director_c_init`
honours the byte only under `#ifdef LEVEL_DEBUG_START` (`-D` in the same
build): it enters sector M directly, with the row clock at that sector's
first row. The default build has no such code path; T8 pins that the default
artifacts are byte-identical with and without the flag machinery present.

Decision L (start from the furthest level reached) is 4.9's menu work, not a
debug route, and is unaffected.

---

## 8. Implementation split

Each step: its own `feat/` branch from `main`, one Opus Medium session,
focused tests red first, `npm test` on the **default** build before the gates
are reported, `tests/runtime-evidence-binding.test.mjs` in every focused set,
the transport rule of §3.3 read from `build/manifest.json` and a
`--boot-smoke-only` run, evidence regenerated (`build:candidate` →
`runtime:wall-trace --atari800-source=build/atari800-trace` → `build`) at the
end of every step that changes the artifacts, `docs/media` restored,
`OWNER-SMOKE CANDIDATE` on exit. Steps 0-2 change no player-visible behaviour
by design; **step 3 is the first step that puts something new on screen.**

| Step | Branch | Scope | Tests | Gates beyond the standing set | Owner smoke point |
| --- | --- | --- | --- | --- | --- |
| **0** | `feat/level-buffer-16` | Q-1: `LEVEL_BUFFER` 32 → 16 sectors, the Director link's window at `$AE00`; no behaviour change (four edits, §3.1) | buffer/window pins in `tests/basic-window-capacity.test.mjs` and `tests/sector-reader.test.mjs` re-pinned; boot smoke 8/8 | XEX/ATR byte-identical except the window record's addresses; ATR menu unmoved | none visible — may be folded into step 1 |
| **1** | `feat/level-compiler` | `assets/levels/level-01.json`, `scripts/level-compiler.mjs`, `level-preview.mjs`, `levels:check`; level image 13 sectors with all three pages; the geometry page carries today's 480 rows and the two sequences byte-for-byte; **the runtime reads nothing new**; `docs/level-authoring.md`, `docs/memory-map.md` (image layout) | T1, T2 | 0 boot sectors; ATR START GAME read +5 sectors | none visible; the loader animation runs five sectors longer |
| **2** | `feat/director-level-data` | the Director reads the core page: sectors (R4), waves (R2), caps, archetype mask (R3); `LEVEL1_DATA`, the phase machinery, both provisional schedulers, `provisional_interceptor_director_request`, `select_interceptor_request_phase` and `FIRST_CAPITAL_FRAME` retired; `CAPITAL_DUE` at the sector row; `_asm_director_dispatch_event` becomes the opcode jump table (design §2.4); the debug route (§7); replays re-scripted where the capital row moves; evidence re-recorded | T3, T4, T5, T6, T8, T10, T11; native A/B with `scripts/hybrid-director-ab.mjs` | PAL audit: worst margin ≥ 500, ≤ +100 on every row vs 991; transport rule; boot smoke | level 1 plays as before; the owner jumps to any sector with `--level=1:sector=M` |
| **3** | `feat/level-2-content` | the first authored variation, `level-02.json`: a different sector count, different waves, a different archetype mask per sector; `how-to-play` EN+PL only if player text changes | T12 | as step 2 (level 2 is not in the default replays; the default artifacts carry level 1 only) | **first new thing on screen**: level 2 via `--level=2` |
| **4** | `feat/hull-length` | the geometry page consumed (R1): sequences from `$AC08/$AC44`, thresholds from `$AC02`, `hull_rows`; the `BROADSIDE` sequences retired into a zero pin; `compileCapitalHulls` length/density parameters; hull-set tests re-pinned (`capital-hulls`, `hull-set-v1`, `capital-hull-extension`, `prepared-hull-row`) | T7 | initial block content ≤ 13,652 (expected to fall); boot 107; PAL audit on the capital rows | level 2 with a 352-row hull |
| **5** | `feat/level-payload` | payload consumers: appearance slots (decision AD re-skins), `weapon_glyph[2]` install at level start, star colour and nebula per sector (21.3; `STARFIELD` run tail 348 B is the home design §10.2 lacked) | T13 | PAL audit (starfield row cost); transport rule | a re-skinned Light and a different sky on level 2 |
| **6** | `feat/wave-paths` | `PathDef` evaluator + 8-path resident library, `ENEMY_MOVEMENT_PATH`, volley and conditional fire (21.2; 23 §10.4 piecewise-linear, §10.5 column-aimed); a native prototype measurement of the evaluator **before** integration sets its budget | T14 | PAL audit with the swarm replays | a snake-path Interceptor swarm |
| **7** | `docs/levels-3-12` (+ per-level `feat/` if any code is needed) | the owner authors levels 3-12 with the tool; STATUS and memory-map final figures; the campaign loop itself (level advance, lives, level select) stays **4.9** | validator, preview | — | each level via the debug route |

If the owner chooses to **pay** for §5.1, an extra hardware-critical step
(`feat/capital-light-window`, proof first) goes between steps 2 and 3, and
step 3 may then author a capital sector with a Light.

---

## 9. Tests — each must fail at `c04156a`

| # | Test (file: name) | Fails today because | Step |
| --- | --- | --- | --- |
| T1 | `tests/level-compiler.test.mjs`: "the validator rejects every §5 case and warns on a cap above the subtype table" | no compiler | 1 |
| T2 | same file: "`build/level-1.bin` is 13 sectors; magic at `$AA00`; header byte 7 is 9; the geometry page says 480 rows and its sequences equal `EMIT_ALLIED/ENEMY_SECTOR_SEQUENCE`" (reads `build/capital-hulls.inc`) | image is 8 sectors | 1 |
| T3 | `tests/encounter-director.test.mjs`: "`director_c_world_row_tick` advances `sector_index` from a poked core page and arms the sector's first wave" (harness: `installRuntimeSegments` + a hand-built core page at `$AA00`) | the tick reads `LEVEL1_DATA` | 2 |
| T4 | `tests/level-one-equivalence.test.mjs`: "the compiled level 1 makes the same Director decisions row for row as `LEVEL1_DATA` up to the capital, and the capital arrives on the authored row" (harness table of rows; native A/B via `scripts/hybrid-director-ab.mjs` in the session) | no compiled level | 2 |
| T5 | `tests/hybrid-lifecycle.test.mjs`: "a SectorDef requesting Light cap 4 in ELITE admits at most 1; a wave of 8 in a SWARM sector admits at most 3 live and finishes the wave anyway" | caps are constants | 2 |
| T6 | same file: "a sector whose mask excludes the Raider never spawns one; a wave naming a masked archetype is refused by the validator" | the Heavy scheduler alternates Raider/Bomber unconditionally | 2 |
| T7 | `tests/hull-length.test.mjs`: "a geometry page of 352 rows enters DRAIN at row 360, resolves rows ≥ 352 to the prow module, and the resolvers read `$AC08/$AC44`" | thresholds and sequences are resident constants | 4 |
| T8 | `tests/build-variants.test.mjs`: "`--level=3:sector=2` writes `build/level-3-s2/`, never `dist/`, and the default artifacts are byte-identical" | unknown flag | 2 |
| T9 | `tests/runtime-evidence-binding.test.mjs` | stays green; included in every focused set | all |
| T10 | `tests/source-contracts.test.mjs`: "no `encounter_heavy_`, `encounter_light_schedule`, `provisional_interceptor_director_request`, `select_interceptor_request_phase` or `FIRST_CAPITAL_FRAME` remain in `src/`" | they exist | 2 |
| T11 | `tests/encounter-director.test.mjs`: "a two-sector level completes at the end of sector 2 and a six-sector level at the end of sector 6" | phase count is fixed at 8 | 2 |
| T12 | `tests/level-compiler.test.mjs`: "`level-02.json` compiles and differs from level 1 in sector count, waves and masks" | no level 2 | 3 |
| T13 | `tests/level-payload.test.mjs`: "a wave with appearance slot 1 installs the payload bitmap into pair 120/121; the STARFIELD opcode writes the sector's colour" | payload unread | 5 |
| T14 | `tests/wave-paths.test.mjs`: "a four-segment path moves a member through its segments and retires it upward; a Heavy path with dy < 0 is rejected" | no evaluator | 6 |

Existing tests that change (re-pinned in the same step, each with its reason
in the test): `encounter-director.test.mjs` (the `state` map and phase
expectations), `hybrid-lifecycle.test.mjs` (scheduler expectations),
`gameplay-music-placement.test.mjs` and `level-hull-block.test.mjs` (the
"8 sectors" pin → 13), `sector-reader.test.mjs` (32 → 16 sectors),
`basic-window-capacity.test.mjs` (window start), the hull-set pins named in
step 4, and the frozen replay coverage clauses whose capital row moves.

---

## 10. Departures from design-4.6 and plan-4.6-placement, collected

| Departure | From | Why |
| --- | --- | --- |
| A 128-B HullGeometry page instead of `hull_params` (32 B in the payload page) for length | design §1.1, §1.7 | the two module sequences are 120 B and are the only way length and density reach the renderer without changing its code |
| `sector_caps` packed into one byte, `sector_archetypes` added | design §1.2 | R3 needs an array; the page is full |
| `wave_member_offset` read as the escort archetype for Heavy waves | design §1.3 | Heavy geometry is fixed by P1/P2; the byte was dead for Heavy waves |
| Director core in `DIRECTOR_RAM` first, the window as overflow | plan-4.6-placement §6 | transport neutrality (§3.3): the window record is packed and +400 raw B was costed at +3 sectors |
| Level 1's capital on an authored row instead of active frame 600 (§10.8 answered) | design §10.8, open | the row clock is the only clock; the authored row is the MEDIUM row reached at frame 600, measured from the trace at step 2; replays are re-scripted, as plan-4.6-placement §6.1 anticipated |
| Paths at step 6, after the four requirements | design §1.4 | not one of the four owner requirements; still binding (21.2), and the evaluator's per-frame cost must be measured first |
| CAPITAL Light ceiling not lifted | design §9 (unchanged) | costed in §5.1; owner's choice |

---

## 11. Owner decisions

The planning session left seven open questions. The owner answered six of them
on **2026-09-23**, before the first implementation step began; item 7 is the
one that stays open.

1. **The CAPITAL Light ceiling (R3 in capital sectors) — RESTRICT** (decided by
   the owner, 2026-09-23). §5.1 is not paid in 1.0: per-sector enemy selection
   applies to **non-capital sectors only**, and capital sectors keep their
   current Light and Heavy limits of **zero**. The format keeps the `CAPITAL`
   row of `subtype_ceiling` so that paying for it later is a **data** change,
   not a format change. Roadmap **4.8c stays blocked**.
2. **Q-1 = 16 sectors — CONFIRMED** (decided by the owner, 2026-09-23).
   `LEVEL_BUFFER` is **16 sectors** (2,048 B): 13 used, **3 spare**. It changes
   decision X's number a second time (44 → 32 → 16).
3. **Level 1 mapping (design §10.8) — CONFIRMED** (decided by the owner,
   2026-09-23). The capital phase starts on an **authored row** instead of
   frame 600; level 1's data authors the row equivalent to today's frame 600,
   so level 1 reproduces. The replay set is re-scripted at step 2 and the
   evidence re-recorded.
4. **Hull length steps 288 / 352 / 416 / 480 rows — CONFIRMED** (decided by the
   owner, 2026-09-23), the four steps as planned, with turret density as four
   count tables over the level's length.
5. **Authoring format — JSON** (decided by the owner, 2026-09-23). Levels are
   authored as JSON in `assets/levels/`, **validated by the level compiler**.
6. **The STOP rule of §3.3 — CONFIRMED** (decided by the owner, 2026-09-23).
   It is the intended reading of "untouchable": **no new boot sector**, initial
   block content **not above 13,652 B**, ATR menu delta **not above +7**.
   Otherwise the step STOPs; the three warn frames are not spent.
7. **The XEX campaign — STILL OPEN.** The XEX carries level 1 only; twelve
   images do not fit. What the XEX ships (level 1 demo, a selectable subset, or
   an ATR-only campaign) is **4.9's** decision. **Not required before step 4**;
   nothing in this plan depends on it.

---

## 12. What this document did not do

No production code, no gate re-recording, no evidence regeneration. The only
build invocation was the default `npm test` of §0. The fast-forward of `main`
in §0 item 1 was performed on the owner's explicit instruction and is the one
action outside a documentation-only session.
