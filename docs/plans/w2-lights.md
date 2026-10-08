# Plan — W2: the Lights in level 1 (a swarm after the capital, elite Raider sectors a/b, the Bomber pair, the elite → swarm transition, the Light archetype in the trace)

**Status: Phase B in progress — the owner answered Q1-Q4 on 2026-10-08
(§8.1: D, B, L1-L5, the length accepted).** Phase A stopped for them.
Branch `data/w2-lights` from `main` `cfbc6a0`. No game byte changed in Phase
A; the commit holds this plan, the Lights audit copy
([../audits/2026-10-08-lights.md](../audits/2026-10-08-lights.md)) with its
register entry, and the owner decision a/b recorded in
[director-4.6.md](director-4.6.md) §11 item 20 and
[../game-design.md](../game-design.md).

Conventions as [m5-loading-boss.md](m5-loading-boss.md) §0.4. Every figure
carries one of: **MEASURED** (a run on this tree or the committed evidence),
**PROBE** (the 6502 timeline probe on the real runtime image, no emulator),
**INSTRUCTION COUNT** (rows × the fixed world rate, page layout, byte
arithmetic), **ANALOGY** (a measured neighbour), **GUESS**. Anything not
measured carries a ~20 % reserve where it feeds a decision.

## 0. Step 0 and baseline

* `main` `cfbc6a0` ("docs(readme): "Play in your browser" link …"), tree
  clean, one worktree (`~/Projects/dark-fighter`). It holds the
  `fix/smoke-2026-10-07` work (fast-forwarded: `e3c3f88` … `a389eca`,
  [smoke-2026-10-07.md](smoke-2026-10-07.md)) and `docs/readme-play-button`
  (`cfbc6a0`).
* `dist/void-strike-65.atr` `51d8fac71499e0952c5d9de7d7ea566325721796c25cc9646de806778e5950e3`,
  `dist/void-strike-65-boot.bin` `c694bf16828c95aefb07801cfde58669a1bf7d1ac8ffacdc58e77df441d01832`;
  `tests/runtime-evidence-binding.test.mjs` passes (2/2): the committed
  evidence binds to `dist/`.

| Figure | `main` | Source |
| --- | ---: | --- |
| Worst fence margin | **1,472** (`2-sweep-fire6` f311, sector 0) | STATUS "Owner smoke fixes of 2026-10-07"; reproduced from the last evidence run's CSVs (`build/runtime-wall-trace/`, `scripts/pal-timing-audit.mjs` samples) |
| DMA-on maximum | **31,041** (`2-evasive-fire7` f564, sector 0) | `docs/runtime-wall-trace.json` `gate.measured_wall_cycles_dma_on`; STATUS |
| Worst fence margin / wall after the capital (sectors 2-3, boss rows apart) | 5,230 (`memory-integrity-atr-2-hunt-fire5` f2339) / 30,206 | MEASURED, the same CSVs by `director_sector` |
| Boss frames: worst margin / DMA-on | 8,323 / 29,082 | STATUS |
| Boss stress, native | 8,434 / 8,500 (reachable 7,732) | STATUS |
| Stress limit outside the boss sector | 7,000 | owner decision (brief) |
| Initial block / boot / extension sectors | 13,618 B / 107 / 105 (total transport 212) | `dist/void-strike-65-manifest.json` `transportCapacity` |
| ATR menu frame (baseline 596) | 551 (BASIC 542) | STATUS; `docs/runtime-wall-trace.json` `boot_smoke` |
| Boss entry | 64 sectors, **245** host frames | `coverage.director_level_complete` |
| `DIRECTOR_RAM` free | 35 B (`$9FD7-$9FF9`) | `docs/memory-map.md:203` |
| `$AE00` window free | 1,185 B | manifest `residentCapacity.basicWindow.freeBytes` |
| Level image | 13 sectors (1,664 B) of a 16-sector buffer | manifest `sectorReader.levels[0]`, `levelBuffer` |
| Level 1 time to the boss (boss sector entered) E / M / H | **67.3 / 59.5 / 55.1 s** (frames 3,367 / 2,977 / 2,755) | `coverage.director_level_complete.natural_difficulty_sessions` |
| Fight length (engaged → defeated) | **71.4 / 115.6 / 146.6 s** (3,572 / 5,781 / 7,329 frames) | same |
| Bot deaths (lives held) | **1 / 5 / 4** | same, `deaths_survived` |
| Trace | 57 replays, 0 clause failures, 0 miss events | `docs/runtime-wall-trace.json` |
| `npm test` (default build) | 1,181 tests, 1,180 pass, 1 fail, 0 skipped | STATUS (twice, identical) |
| Recorded test failures | `tests/preview.test.mjs` "preview consumes the canonical charset, screen, PMG, and palette source", first failing `tests/preview.test.mjs:129` | `docs/recorded-test-failures.json` |
| Recorded clause failures | none | `docs/recorded-gate-failures.json` `failures: []` |

**Disagreements with the brief** (the repo wins):

* Bot deaths after the smoke merge are **1 / 5 / 4**, not 1 / 5 / 5 (that is
  the S4b.5 figure before the smoke); the fight is 71.4 / 115.6 / 146.6 s, not
  73 / 100 / 129 (also before the smoke). The brief labels both "before smoke".
* "Decision 15 of 2026-09-16, 'Wingman or Interceptor'" is in
  [../owner-decisions-2026-09-11.md](../owner-decisions-2026-09-11.md) §15.2,
  not in director-4.6.md §11 (whose item 15 is level 2's content,
  2026-09-30). Decision a/b is recorded in director-4.6.md §11 (the Director's
  decision list, item 20) and cites §15.2 as what it refines.
* The world rate is 8 / 9 / 10 twentieths of a row a frame (EASY / MEDIUM /
  HARD; `assets/graphics/capital-hulls.json` `worldScrollRates`), so HARD is
  2.0 frames a row; [smoke-2026-10-07.md](smoke-2026-10-07.md) §7.1 says
  "11/20 of a row a frame on HARD". Not corrected there (a closed plan); used
  correctly here.

## 1. The brief's facts against the repo

| Brief | Repo | |
| --- | --- | --- |
| Two Light archetypes, Wingman and Interceptor | `src/c/enemy-archetype.h:21-26` (records 1 and 2 of the frozen four) | agrees |
| Interceptor descends 2 lines a frame, chases, one LASER shot | `src/c/lifecycle.c:77` `INTERCEPTOR_DESCENT 2`; one bolt per pass ([../game-design.md](../game-design.md) "Interceptor") | agrees |
| flight-lead, hunter, lancer, escort are skins | `assets/levels/level-01.json` `payload.appearances`, `level-02.json`; decision AD | agrees |
| Level 1 had only Wingmen as Raider escorts and no Interceptors | true at the audited `08c79e7`; since `fd1c50a` (P2) level 1 has **one** Interceptor wave of one Light after the capital (elite sector, so alone) | superseded by P2, as the brief says |
| Level 2: swarms of 6-8 per wave, up to 3 at once, out of the ATR | `assets/levels/level-02.json` sectors 0 and 3; director-4.6.md §11 item 16 | agrees |
| Caps swarm 3/0, elite 1/2, capital 0/0, boss Light 1 | `src/c/director.c:193-194` `{3,1,0,1}` / `{0,2,0,0}` | agrees |
| The default replays cover no Interceptor as a Light, nor several Lights at once | since P2 the replays that pass the capital meet the one P2 Interceptor; several at once cannot happen in level 1 (every space sector is elite, Light ceiling 1). No trace column says which | half superseded by P2; the rest agrees |
| The trace does not record a Light's archetype | the main CSV has no Light column at all; the opt-in Light CSV (`scripts/atari800-wall-trace.h:5390-5446`) has state, HP, X, Y, no archetype | agrees |
| Elite → swarm may carry a live Heavy | **confirmed** (§3) | agrees |
| P2 placed after the capital: an Interceptor, a Wingman, a Raider pair with its escort, a Bomber pair | `assets/levels/level-01.json:167-243` | agrees |

## 2. Inventory

### 2.1 Level 1's sectors today (`assets/levels/level-01.json`)

| # | Kind | Rows | Waves (row: what × count) | Caps L/H | Lines |
| ---: | --- | ---: | --- | --- | --- |
| 0 | space / elite | 272 | 0: Raider + Wingman escort × 4; 88: Bomber × 4 | 1 / 2 | 117-154 |
| 1 | capital | the hull (480) | none | 0 / 0 | 155-166 |
| 2 | space / elite | 232 | 0: Interceptor × 1; 40: Wingman × 1; 96: Raider + Wingman escort (`flight-lead`) × 1 | 1 / 2 | 167-214 |
| 3 | space / elite | 224 | 24: Bomber × 1 | 1 / 2 | 215-243 |
| 4 | boss | ends with the boss | none | — | 244-250 |

Sectors 2-3 are P2's (owner decision of 2026-10-08,
[smoke-2026-10-07.md](smoke-2026-10-07.md) §2). The only re-skin is the
Raider wave's escort (`flight-lead`, lines 99-114). Level 1 has no swarm
sector. The file's opening `_` prose (lines 2-80) describes the 2026-09-28
schedule and is history; the sector and wave objects are what compiles.

### 2.2 How the Director enforces the caps

* **Ceilings:** `subtype_ceiling_light` / `_heavy` (`src/c/director.c:193-194`),
  row chosen by `compute_ceiling_row` (`:226`), effective cap
  `min(authored, ceiling)` (`director_c_light_ceiling` `:249`, `heavy_ceiling`
  `:261`).
* **Heavy admission:** the ASM retry `interceptor_admission_update`
  (`src/main.s:11803`) runs only while no formation is live
  (`integration_update_enemy` `:11759`: `ENEMY_ACTIVE != 0` goes to the
  member update instead) and asks `director_c_request` → `heavy_request`
  (`director.c:557`): the armed wave is Heavy, spacing elapsed,
  `heavy_ceiling() != 0`, the archetype in the mask,
  `asm_director_can_allocate` (`src/hybrid/c-asm-abi.s:392`: refuses while
  `light_wave_lock` is up, or the player is dying). **One formation at a time.**
* **Light admission:** one path, `light_admit` (`lifecycle.c:846`): ceiling
  (0 in a capital sector, `:776`), live count below it, a free slot, the token,
  an appearance pair. It is reached from a Light wave's stepper
  (`light_wave_step` `:922`) or from a Heavy spawn's escort
  (`encounter_light_admit` `:1266`, from `enemy_c_spawn_raiders` `:1410`). **It
  never asks whether a Heavy formation is live.**
* **Waves:** `director_c_try_event` (`:293`) arms the cursor's wave; a Heavy
  wave holds the cursor until its last formation is admitted, a Light wave
  until its last Light is gone (`light_wave_lock`, `:509`, released at
  `lifecycle.c:944`).
* **Sector transitions:** a space sector ends on its row count
  (`director_c_world_row_tick` `:443`) → `advance_sector` (`:431`) →
  `enter_sector` (`:357`), which resets the cursor and **clears the Light wave
  lock** (`:365`) and arms a row-0 wave at once. **No space → space
  transition waits for the playfield.** Only the capital (`FLAG_CAPITAL_DUE`,
  `:372`, entered when `sector_c_drain_clear`, `lifecycle.c:1299`, holds) and the
  boss (`FLAG_BOSS_DUE`, `:378`) wait for a drain.

## 3. The elite → swarm transition — CONFIRMED, both ways

### 3.1 What the code allows

* **F1, elite → swarm (the audit's hypothesis): a live Heavy formation is
  carried into a swarm sector, and the swarm admits up to three Lights beside
  it.** The elite sector ends on its row clock whatever is live; the swarm's
  Heavy ceiling 0 only refuses *new* formations (`heavy_request`), and nothing
  retires the live one; `light_admit` does not look at Heavies. The ASM
  comment at `c-asm-abi.s:396-397` ("The other direction needs no test: the
  wave is armed by enemy_c_recycle, after the formation has gone") is stale
  since roadmap 4.6 step 2: waves are armed by the row clock and the sector
  entry now (`director.c:293`, `:381-389`).
* **F2, swarm → elite (the mirror, not in the audit): the swarm's live Lights
  are carried into the elite sector with the lock cleared** (`enter_sector`
  `:365`), so the elite's first Heavy wave may be admitted while up to three
  swarm Lights live (2 Heavy + 3 Light, a population no default replay has
  measured), and that wave's own companion is refused (live ≥ the elite
  ceiling 1): variant (a) would arrive without its Interceptor.

### 3.2 Evidence

* **MEASURED (the last evidence run, `build/runtime-wall-trace/`):** a Heavy
  formation crosses a space-sector boundary today. `director-complete-2`
  (HARD): sector 3 → 4 at f2755 with `enemy_state` 1, `enemy_live_count` 1
  (the Bomber pair, alive 569 frames); the next sector is the boss, whose
  entry waits for the drain (the boss entry frame 2,914 is that wait), so
  nothing is seen. Sector 0 → capital carries one the same way (f679 / f604 /
  f543), into the capital's drain.
* **PROBE, diagnostic only (not evidence, nothing committed):** a scratch copy
  of `HEAD` outside the tree (`git archive`) with level 1 changed to sector 3
  elite (Bomber × 1 at row 0, 64 rows) → sector 4 **swarm** (Interceptor × 3,
  64 rows) → sector 5 elite (Raider + Interceptor × 1 at row 0, 128 rows) →
  boss, built as the debug route `--level=1:sector=3`, run through the
  timeline probe's reduced loop **with the real Light update** (ticks,
  pursuit, retirement) and no kill policy; one labelled diagnostic poke holds
  `PLAYER_LIFECYCLE` alive (the probe runs no respawn; without it an
  Interceptor's contact froze the world on all three difficulties).

  | | EASY | MEDIUM | HARD |
  | --- | --- | --- | --- |
  | swarm entered with the Bomber pair live | f160 | f143 | f128 |
  | three Interceptors live beside it | f210-f270 | f193-f253 | f178-f238 |
  | Bomber pair gone | f605 (in sector 5) | f633 (sector 6) | f689 (sector 6) |
  | sector 5 (elite) entered with swarm Lights live and the lock 0 | 1 Light (f320) | 1 (f285) | **2** (f256) |
  | sector 5's Raider + Interceptor wave admitted | never (the Bomber outlived the sector) | never | never |

  F1 is reproduced on every difficulty. F2's carry (two swarm Lights in an
  elite sector, the lock cleared) is reproduced on HARD; its Heavy admission is
  not, because the Bomber pair was still live.

### 3.3 Would a player see it?

**Yes.** F1 is a Heavy pair (PMG, the largest sprites on screen) flying,
firing and colliding through a sector the caps define as "no Heavy", with up
to three Lights around it. That population (2 Heavy + 3 Light) is a step the
architecture allows eventually but no PAL gate has measured in production
data. F2 shows as an elite sector with two or three Lights, and as a
variant-(a) formation arriving without its Interceptor. Today level 1 cannot
show either: every space sector is elite, and a Heavy crossing into the
capital or the boss is drained.

**The Bomber outlives sectors.** With no kills a Bomber pair lives 541-689
frames (PROBE): its lane sweep descends half a line a frame after its entry
depth and holds to aim. A Raider pair lives 334 frames (PROBE, §4.3). Any
sector after a Heavy wave must be sized for that, or the next Heavy wave is
cut (sector 5 above).

### 3.4 Fixes — for the owner; neither is implemented before the answer

**D (data only, recommended for W2):**
* F1: **no swarm sector directly after an elite sector** in level 1. The swarm
  follows the capital, whose entry is a drain (no Heavy, no Light) and which
  admits nothing (caps 0/0, Lights retired), so no Heavy can exist at the
  swarm's entry. Structural, not timing.
* F2: **the swarm sector outlasts its own Lights on the fastest difficulty
  with a 20 % reserve**, so the following elite sector opens on an empty
  playfield. Its last wave is the short-lived Interceptors (116 frames), after
  the Wingman column (232).
* Both guarded by tests: a data test (no swarm after an elite; the swarm's
  no-kill drain fits its rows on HARD by the probe) and, in the trace, clauses
  L3/L4 of §5.2 (no Heavy live in a swarm sector; never more than one Light
  live in an elite sector), on every default replay.
* Cost: 0 B, 0 cycles. Limit: it guards level 1's data only; any later level
  (level 2 has swarm → elite twice, sectors 0 → 1 and 3 → 4, with row-0 Heavy
  waves; ESTIMATE from its rows and wave sizes: drained in time with no kills,
  unmeasured) must keep the same rules by hand.

**C1 (code, the rule in the Director): a space sector does not end while the
live population exceeds the next sector's ceilings.** In
`director_c_world_row_tick` (the space-length test, `director.c:485-498`), before `advance_sector()`,
call a window function that compares `ENEMY_ACTIVE != 0` with the next
sector's Heavy ceiling and the live Light count with its Light ceiling; while
they exceed it, return (the world keeps scrolling, the sector's rows overrun,
the next sector opens on a legal population). It covers F1 and F2 for every
level.
* Bytes (INSTRUCTION COUNT, +20 %): ~6 B in `DIRECTOR_C_CODE` (`DIRECTOR_RAM`,
  35 free → ~29) for the call and branch, ~40-50 B in `HYBRID_C_WINDOW`
  (1,185 free); initial block 0 B if the window part stays in the window's
  extension record (to be checked against the record's packing).
* Cycles: only on the row-tick frame where a sector's row count is reached,
  and on each row tick while it holds: ~60-90 cycles (two ceiling lookups,
  a four-slot live count), pre-fence (×~2 in fence margin, memory "native
  cycles vs fence margin"). Not on any other frame.
* Visible: an elite sector lasts until its formation has gone; the time to the
  boss grows by the hold when a player leaves a formation alive (≤ ~690
  frames with a Bomber pair, PROBE).
* It touches code a gameplay frame runs and grows `DIRECTOR_RAM`: a STOP of
  the brief, so only with the owner's yes.

**C2 (code, cheaper, partial):** (i) `enter_sector` keeps `light_wave_lock`
while Lights live (and does not arm a row-0 wave under it), so a Heavy is not
admitted next to carried swarm Lights (F2): ~+2 B net in the window, 0 cycles
per frame; (ii) `light_wave_step` refuses a wave admission while
`ENEMY_ACTIVE != 0` in a sector whose Light ceiling is above the elite's 1
(F1): ~+13 B in the window, +7 cycles on frames with an admission attempt and
no Heavy. The carried Heavy still flies through the swarm (it is only kept
apart from the swarm's Lights), so C2 does not meet "no Heavy flying into a
swarm".

**Recommendation:** D in W2; C1 as a backlog item before M4 (which brings
level 2 into the ATR with two swarm → elite transitions). A carry-over test
that reproduces F1 on `main` is part of C1's task, not W2's.

## 4. Level 1's sector sequence — proposed

### 4.1 The table (recommended: option B)

Changed against today in **bold**. Debug-route sector numbers are zero-based.

| # | Kind | Rows | Waves (row: what × count, spacing, entry) | Lights by archetype (skin) | Heavies | Scope | Length E / M / H (INSTRUCTION COUNT) |
| ---: | --- | ---: | --- | --- | --- | --- | --- |
| 0 | space / elite | 272 | 0: Raider + Wingman × 4; 88: Bomber × 4 — unchanged | Wingman escorts (plain) | Raider pairs, Bomber pairs | keeps Raider + Wingman | unchanged |
| 1 | capital | hull | none — unchanged | — | — | — | unchanged |
| 2 | **space / swarm**, caps **3 / 0** | **280** | **0: Wingman × 3, spacing 32, entry 160, `flight-lead`; then Interceptor × 3, spacing 24, entry 88** | **Wingman column (flight-lead), then Interceptors chasing; up to 3 at once** | **none** | 1, 5 | 700 / 623 / 560 frames (14.0 / 12.4 / 11.2 s) |
| 3 | **space / elite (a)**, caps 1 / 2 | **120** | **0: Raider + Interceptor × 1** | **one Interceptor companion (plain)** | **Raider pair** | 2 (a) | 300 / 267 / 240 |
| 4 | **space / elite (b)**, caps **0** / 2 | **120** | **0: Raider × 1, no Light** | **none** | **Raider pair** | 2 (b) | 300 / 267 / 240 |
| 5 | space / elite, caps 1 / 2 | 224 | 24: Bomber × 1 — **P2's sector 3, unchanged** | none | Bomber pair | 3 | 560 / 498 / 448 |
| 6 | boss | ends with the boss | none — unchanged | — | — | — | unchanged |

What changes against P2: P2's single Interceptor and single Wingman become the
swarm (two waves of three); P2's Raider + `flight-lead` Wingman wave leaves
(level 1 keeps sector 0's Raider + Wingman × 4, the occurrence the brief asks
to keep), and the `flight-lead` look moves to the swarm's Wingman column
(owner question Q2); elites (a) and (b) are new; P2's Bomber pair and its
sector stay as they are. The boss sector moves from index 4 to 6, so its debug
route becomes `build/level-1-s6/` (the variant (b) sector is `level-1-s4` now).

**Option A (keeps P2's Raider + `flight-lead` Wingman wave):** a sector
between 4 and 5 — elite, 136 rows, row 0: Raider + Wingman (`flight-lead`) × 1
— so the post-capital rows are P2's tail plus the new sectors. +136 rows,
+340 / 302 / 272 frames (+6.8 / 6.0 / 5.4 s), one more sector (8), and the
swarm's column stays plain.

Why these numbers:
* **The swarm's order and length (F2's guard).** The Wingman column first,
  the Interceptors last: a Light wave holds the cursor until its last Light
  has gone, so the Interceptor wave arms when the column is spent, and the
  sector's tail is the short-lived Interceptors. PROBE, no kills, the real
  Light update: the last swarm Light is gone at the sector's f461 on all three
  difficulties (the column f1-f298, the Interceptors f300-f461); the sector
  lasts 560 frames on HARD, **99 frames (21 %) of reserve**. Kills only
  shorten it; a player death stops the row clock while the Lights fly on
  (PROBE, the first diagnostic), which lengthens the reserve.
* **Three at once.** The column: three Wingmen 32 lines apart at X 160 (live
  together f67-f232); the Interceptors: 24 frames apart from X 88, closing on
  the player (live together f350-f411). PROBE: 3 live at once in sector 2 on
  every difficulty.
* **Elite (a) and (b), 120 rows each.** (a) arms at its entry, its Raider pair
  is admitted 2-11 frames in with its Interceptor (the swarm has drained).
  With no kills a Raider pair lives 334 frames (PROBE), longer than a 120-row
  sector (240-300 frames), so it can cross into (b): elite → elite is legal
  (Light 1 / Heavy 2 on both sides) and (b)'s own pair follows when it has
  gone, 89-121 frames into (b) (PROBE). (b) authors `lights: 0`, so nothing
  can bring a Light into it but a carried (a) Interceptor (≤ 116 frames).
* **The Bomber pair** is P2's: row 24 of its sector, after (b)'s Raiders; the
  boss entry waits for its drain, as it does today on HARD.
* **Every wave arms on every difficulty** (PROBE with the probe's own fixed
  kill policy, the test's method; and with no kills, above).

### 4.2 Time to the boss, image, gates

| Figure | `main` | Expected after (B) | Label |
| --- | ---: | ---: | --- |
| Post-capital rows (the boss sector entered on) | 456 | **744** (+288) | INSTRUCTION COUNT |
| Time to the boss, E / M / H | 67.3 / 59.5 / 55.1 s | **≈ 81.7 / 72.3 / 66.6 s** (+14.4 / +12.8 / +11.5; with the 20 % reserve on the delta, up to 84.6 / 75.0 / 68.9) | PROBE delta (sector 2 entry → boss sector: 1,860 / 1,654 / 1,488 frames against P2's 1,140 / 1,013 / 912) on the trace's figures |
| Option A instead | — | ≈ 88.5 / 78.3 / 72.0 s | INSTRUCTION COUNT |
| Fight length, bot deaths | 71.4 / 115.6 / 146.6 s; 1 / 5 / 4 | unknown: the player enters the boss in another state (as after P2); deaths may rise in the swarm (three Interceptors chasing the sweep bot) | GUESS |
| Level image | 13 sectors | **13** (the core, payload and geometry pages are fixed 256 / 256 / 128 B; 7 sectors and 7 waves of 10 / 20) | INSTRUCTION COUNT |
| Level image checksum | generated with the runs | regenerated by the build (`diskGuard.summaryLevelSums`, the boot smoke's `level_image_checksum`); checked in Phase B | — |
| Initial block / boot / extension / DIRECTOR_RAM / window | 13,618 / 107 / 105 / 35 free / 1,185 free | **unchanged** (data in the level image only; the trace change is emulator-side, 0 guest bytes) | INSTRUCTION COUNT |
| ATR menu frame / boss entry | 551 / 245 host frames | **unchanged** (the level image is read at START GAME, the boss load is the same 64 sectors) | ANALOGY (P2 moved neither) |
| Worst fence margin | 1,472 (sector 0) | **1,472**, the same row: every frame before the capital is identical (the waves before it unchanged; P2 showed it frame by frame) | MEASURED-by-construction |
| DMA-on maximum | 31,041 (sector 0) | **31,041**, the same row | same |
| Post-capital worst fence margin | 5,230 | ≥ ~4,100 (swarm frames: level 2's swarms measured 5,934 worst at `2777e8f`, ANALOGY; the three-Light standing frames of Light multiplicity M1 6,227-6,663, slot exit 4,941, ANALOGY at older commits; −20 %) | ANALOGY |
| Stress outside / inside the boss sector | 7,000 / 8,434 of 8,500 | unchanged (native fixtures, no code moves) | — |

## 5. The trace change and the new clause

### 5.1 Recording the Light archetype

Eight additive columns on the main trace CSV, `light_state0`-`light_state3`
and `light_archetype0`-`light_archetype3`: each slot's `light_state` (0 empty,
1 escort, 2 free, 3 break-up pending; `lifecycle.c:85-94`) and its archetype
offset (12 Wingman, 24 Interceptor). The header reads them by address from
two optional environment variables, the harness passes the addresses from
`build/encounter-director.lbl` (`_light_state`, `_light_archetype`; `$7FCA`,
`$7FF0` today), the same pattern as `director_sector`
(`scripts/atari800-wall-trace.h:5675`, `scripts/runtime-wall-trace.mjs:3712`).
ESTIMATE ~18 lines of header (struct, statics, read, column names, print) and
~8 of harness (column names, addresses) — **~26 lines**, under the brief's 60.
The trace emulator is re-prepared from the new header before any trace run
(`scripts/atari800-trace-freshness.mjs` refuses otherwise).

### 5.2 The clause

`lightCoverage(rows, sectors)` in `scripts/trace-clause-observers.mjs`, called
from `scripts/runtime-wall-trace.mjs` on every measured legal replay
(`allRows`, the set the Director clause reads) with level 1's compiled sector
kinds, recorded as `coverage.light_archetypes`, an invariant like the
Director clause's. A Light is **live** when its state is 1 or 2 (3, the
break-up pending, is not hittable). Boss rows apart.

* **L1 (the brief):** at least one row with a live Interceptor
  (`light_archetype_k = 24`).
* **L2 (the brief):** at least one row with two or more live Lights at once.
  The data delivers three (PROBE); the clause asks two, as the brief says, and
  the evidence reports the maximum.
* **L3 (recommended, F1's guard):** no row in a swarm sector with
  `enemy_state != 0`.
* **L4 (recommended, F2's guard):** no row in an elite sector with more than
  one live Light (the runtime elite ceiling, not the authored cap: an (a)
  Interceptor carried into (b) is legal).
* **L5 (recommended, variant (a) seen):** at least one row in an elite sector
  with a live Interceptor and `enemy_state != 0`.

With L3-L5 the observer and its wiring are ~55 lines (ESTIMATE); with L1-L2
only, ~35. Q3 asks which.

On `main`'s data L2 must fail (every space sector is elite, at most one Light
live) and L1 pass (P2's Interceptor). **RED on `main`'s build:** the new
harness on `main`'s build in the baseline worktree, the three
`director-complete-*` sessions only, diagnostic (not committed): L2 fails.
GREEN on the regenerated evidence. Synthetic-row tests in
`tests/trace-clause-observers.test.mjs` (no Interceptor fails L1; one Light at
a time fails L2; a Heavy in a swarm row fails L3; two Lights in an elite row
fail L4; a state-3 slot does not count as live).

### 5.3 What moves

* The main CSV gains 8 columns; every CSV-reading test reads by name.
* Replays that pass the capital change after it (as with P2): the three
  `director-complete-*`, the five integrity replays, `slot-e-*`,
  `lower-playfield-laser-contact-atr-hard`, `weapon-pickup-2-hunt-fire4`,
  `weapon-pickup-spread-0-hunt-fire4`, `weapon-pickup-sequence-2-hunt-fire3`,
  `capital-muzzle-ring-2-sweep-fire4`, `debris-effects-2-sweep-fire4`,
  `director-complete-2-write-protected`. Clauses that arm on post-capital
  capsules (memory "capsule cadence is load-bearing") may need class (a)
  scenario rewrites; post-capital Heavy formations go 2 → 3, so the booster
  clauses get more kills, not fewer (GUESS).
* Every replay that ends before the capital is frame-identical.

## 6. Tests

**RED on `main`'s build, GREEN after** (Phase B, written first):

1. `tests/level-one-waves.test.mjs`, rewritten for W2 (P2's three tests are
   its subject today; re-pointed, reason in the file): the waves before the
   capital and the capital are `main`'s; after the capital a swarm sector
   (caps 3 / 0, no Heavy wave) with Light waves of **both** archetypes; an
   elite sector of variant (a) (a Raider wave whose companion is the
   Interceptor) and one of variant (b) (a Raider wave with no companion and
   Light cap 0); a Bomber pair; **no swarm sector after an elite sector**;
   every wave arms on every difficulty (timeline probe); the swarm reaches
   ≥ 2 live Lights (probe); the swarm's last Light is gone before the sector
   ends on HARD with no kills (the probe with the Light update, ≥ 20 %
   reserve).
2. `tests/trace-clause-observers.test.mjs`: the clause's synthetic cases
   (§5.2).
3. `tests/runtime-wall-trace.test.mjs`: the evidence carries
   `coverage.light_archetypes` with L1-L2 (and L3-L5 if approved) held, the
   maximum live Lights ≥ 2, and the CSV columns present.
4. If the owner approves C1: a native carry-over test, RED on `main` (a Heavy
   live in a swarm row), GREEN after.

**Expected re-points (the planned data change, each with its reason in the
file):** `tests/level-compiler.test.mjs` (sector rows, wave count),
`tests/level-one-equivalence.test.mjs` (the played order R4 B4 R1 B1 → R4 B4
R1 R1 B1, Heavy counts per difficulty), `tests/level-payload.test.mjs` (which
wave wears `flight-lead`: the swarm's Wingman wave under Q2-yes),
`tests/boss-band.test.mjs` (sector indices), `tests/plasma-fx.test.mjs` (the
play-through length before the boss), `tests/runtime-wall-trace.test.mjs` (the
replays that reach the boss), `tests/build-variants.test.mjs:127` (the laser
fixture's boss route `--level=1:sector=4` → `sector=6`). A re-pinned value
keeps its test's behavioural assertions running.

## 7. Owner decision a/b (recorded in this commit)

**Owner, 2026-10-08, source: the W2 brief (`data/w2-lights`); refines
decision 15 of 2026-09-16
([../owner-decisions-2026-09-11.md](../owner-decisions-2026-09-11.md) §15.2,
"Wingman ALBO Interceptor"), never recorded before:** elite sectors with
Raiders come in two variants — **(a)** a Raider formation with an Interceptor
companion, **(b)** Raiders with no Light. A Raider with a Wingman escort
remains a third option. Recorded in [director-4.6.md](director-4.6.md) §11
item 20 and [../game-design.md](../game-design.md) "Encounter Director
Level 1".

## 8. Owner questions

* **Q1 — the transition fix.** (D) data only in W2 — no swarm after an elite,
  the swarm sized to drain itself on HARD with 21 % reserve, guarded by a data
  test and clauses L3/L4 — and C1 (the Director holds a sector's end while the
  population exceeds the next sector's ceilings; ~6 B `DIRECTOR_RAM`, ~50 B
  window, ~60-90 cycles on sector-end row ticks) as backlog before M4; or C1
  now; or C2 now. **Recommended: D now, C1 before M4.**
* **Q2 — the post-capital Raider + Wingman wave.** (B) drop it (sector 0
  keeps Raider + Wingman × 4) and move `flight-lead` to the swarm's Wingman
  column; or (A) keep it as its own elite sector after (b), +136 rows
  (+6.8 / 6.0 / 5.4 s). **Recommended: B** (shorter, every look still used).
* **Q3 — the clause.** L1-L2 only (the brief), or L1-L5 (adds the
  transition guards and variant (a)'s presence, ~20 more lines).
  **Recommended: L1-L5.**
* **Q4 — the level's length.** B puts the boss at ≈ 82 / 72 / 67 s (from
  67 / 60 / 55). Acceptable, or should the swarm or (a)/(b) be shorter? The
  swarm cannot go below ~240 rows without losing F2's reserve on HARD; (a)/(b)
  at 120 rows already let a surviving pair cross into the next sector.
  **Recommended: accept.**

### 8.1 The owner's answers (2026-10-08, in this session)

* **Q1: D now, C1 before M4.** No code fix in W2; the data guard, its data
  test and clauses L3/L4. C1 joins the backlog with M4 as its latest point.
* **Q2: B.** The post-capital Raider + `flight-lead` Wingman wave leaves;
  `flight-lead` moves to the swarm's Wingman column.
* **Q3: L1-L5.**
* **Q4: accepted** (the boss at ≈ 82 / 72 / 67 s).

## 9. Phase B (after the answers)

1. Tests first (§6), RED on `main`'s build, committed.
2. The level data (§4.1 with the answers); the trace columns and the clause
   (§5); the trace emulator re-prepared; the level image checksum checked.
   GREEN, committed.
3. `build:candidate` → `runtime:wall-trace` (under `caffeinate -dims`) →
   `build`; the menu raster, the media manifest and `npm run memory-map` with
   their own tools if their hashes move; `npm test` twice on the default
   build, reconciled by name and first failing assertion against the
   recorded sets.
4. Figures (§0's table, before and after), STATUS, the audit register's
   closed points, [../level-data-howto.md](../level-data-howto.md) (the new
   table, "no swarm after an elite"), hardware-testing §19 (the smoke
   checklist), this plan marked implemented, pending the owner's smoke.
