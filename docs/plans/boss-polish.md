# Boss polish: the module hit flash, vanishing HULL quarters, the boss title

**Branch:** `fix/boss-polish` from `main` `26ad91d` (ATR `3b05ca34…`, boot
`731e5703…`, the `feat/interceptor-standoff` merge, decision AK).
**Status:** **implemented, pending the owner's smoke — `OWNER-SMOKE CANDIDATE`**
(2026-10-12). The owner chose **b3** and accepted the redrawn plate stages
(§9-§10). Phase B (§11) made b3, the vanishing HULL quarters and the boss
title the default build. ATR `ddf01a9f…`, boot `186739b2…`. §0-§8 are the
round-1 record (F3, rejected) and §9 the round-2 record; their figures for the
removed candidates no longer describe the code.

**The owner's requests (2026-10-12, after playing the boss):**
1. A hit on a boss module that does not destroy it shows a small explosion,
   which looks like a bug. The hit module should flash (brighten briefly)
   instead. A destroyed module keeps today's explosion.
2. The HULL gauge is inconsistent with BOOST: spent BOOST cells vanish, but
   spent HULL quarters turn into a cracked-plate glyph. HULL quarters should
   vanish too, in the normal HUD and in the boss sector's HUD.
3. "Boss" is a working name. The boss loading screen gets a title, variant A:
   WARNING / the boss's name / INCOMING. The name comes from region data:
   BLOCKADE BREAKER (R1), BASTION (R2), SIEGE SPINE (R3), VOID CITADEL (R4)
   (decision AL).

Labels: **M** measured on this branch, either with the Atari800 trace harness
on a debug route (`build/[boss-polish-X-]level-1-s6`, focused run
`s41-diag-1`) or with the 6502 harness of the tests on a review build
(`VS65_HARNESS_BUILD`); **EST** an estimate, with its basis;
**ANALOGY** a figure carried over because the code it measures is
byte-identical.

---

## 0. Recommendation

* **Flash: F3 (the fill flash), amber, 3 frames (`a3`).** It is the only
  candidate that fits the hardware rules (§2). Amber reads clearly on both
  kinds of module. Steel is the band's brightest colour, but a plate is
  already steel, so on a plate a steel flash only blanks the plate's bevels
  and markings (`build/play/boss-flash-preview.png`, panel 2). If the owner
  wants "brighter" to mean steel on the guns, §7 Q1 offers a mixed form: amber
  on armour and steel on weapons, about +8 B and one more charset code.
* **HULL:** spent quarters become the HUD blank, as spent BOOST cells already
  do. This costs 0 B and 0 cycles.
* **Title:** the boss's name and INCOMING are drawn under WARNING from each
  region's theme run, which the boss entry reads first. The text costs 0 new
  sectors. The Light kernel record is 1 B smaller.
* **The cost to watch:** the flash's state machine needs one more slot-E
  sector, so the boss entry goes from **245 to 249 host frames** (64 to 65
  sectors; M). The limit is 250. §7 Q2 asks the owner to accept the 1-frame
  margin; there is no cheaper home (§4).

## 1. Audit (file:line on `main` `26ad91d`)

### 1.1 The "small explosion" on a hit the module lives through

* `src/hybrid/boss.s:562` `boss_hit` → `_boss_c_hit` (C, `src/c/boss.c:331`)
  returns 1 when a module was damaged. In that case `boss.s:609` loads
  `BOSS_T_SPARK` and `boss_feedback` (`:617`) ticks channel 3 and puts the
  glyph in the struck cell through the cell-flash ring (`boss_ring_set`,
  `:815`) for `BOSS_SPARK_FRAMES` = 2 frames (`:126`).
* The spark is the region's `extras.png` glyph 0
  (`scripts/boss-assets.mjs:151`): an amber and white burst, code 78 in
  region 1. The same path runs for **every** damaging hit, kills included. A
  kill also queues the GONE draw, so the module disappears
  (`boss_module_scored`, `boss.s:2789`, slot D), and plays the kill sound. The
  ring re-applies the spark over the GONE draw (`boss_ring_rebase`, `:889`).
  The defeat's chain draws the blast glyphs over each module
  (`boss.s:529-545`).
* An absorbed hit (a covered module) and a hull hit show the deflection glyph
  (code 79) through the same ring. The owner's request does not cover them,
  and they stay.

### 1.2 How modules are drawn

* The band is 8 rows × 64 cells of ANTIC 4 (`$54`: HSCROL, LMS) in the level
  buffer (`$A880` rows 0-5, `$AC80` rows 6-7). The boss DLI sets the
  region's charset at `$0C00` and the four band colours (`boss.s:346-366`).
  In region 1 (and its copies, regions 2-4) these are **COLPF0 `$0A` steel**
  (the plates' face), **COLPF1 `$06` grey**, **COLPF2 `$28` amber** (cannons,
  lights) and **COLPF3 `$32` burgundy**. COLPF3 is the pixel value 3 of every
  code with bit 7 set: the hull's bulk (132 of the 512 band cells) and the
  guns' closed looks.
* Modules are drawn by `boss_draw_module` (`boss.s:1120`) in four modes:
  COPY, FILL, ADD (+K per damage stage on staged codes) and GONE. At most one
  module is drawn per frame, through the draw queue (`boss_queue_draw`,
  `:1000`; called from `boss.s:555`, skipped on a kill or exposure-check
  frame). The ring's records on a module's cells are lifted before each draw
  and laid back after it.
* The charset holds 128 codes. Region 1 uses 0-121; 122-127 are free.

### 1.3 Everything that reads band cells back

| Reader | file:line | Reads | Effect of a flashed cell |
|---|---|---|---|
| ring save | `boss.s:861` | the cell's code, kept to restore it | carried through the draw's rebase (§3) |
| ADD (damage stage) | `boss.s:1162` | adds K to staged codes | a flash code is plain, so ADD would skip it: the flash ends before any queued draw of its module (§3) |
| player-shot cells | `boss.s:2080`, `:2121` | draws a shot only into a blank cell; restores only a cell that still shows a shot | the flash never touches blank cells |
| boss-shot cells | `boss.s:2656`, `:2708` | the same, for the boss's shots | the same |

Hit detection does **not** read screen codes. It uses the column map and the
stop lines (`boss_column_at` / `boss_rebuild_module`, built from hit points),
so a flashed module is hit exactly as an unflashed one (proved in §3).

### 1.4 The HULL gauge and the BOOST gauge

* `update_hud_status` (`src/main.s:8239`) writes HUD cells 25-28: a quarter at
  or above its threshold (`hud_hull_segment_thresholds`, `:11571`: 3 / 5 / 8
  / 10 units) shows `CH_HUD_HULL_FULL` (5), else `CH_HUD_HULL_DAMAGED` (12, a
  cracked plate) (`:8252`).
* BOOST writes `CH_SPACE` for each spent cell (`:8275`, `:8297`, `:8301`).
  The HUD's blank keeps its bottom rule (`:3567`), so a spent cell reads as an
  empty slot on the HUD line.
* The boss sector's HUD is rebuilt by the install (`boss.s:2909-2932`): the
  text, the score and **the same `update_hud_status`**. The ten cells it
  copies back are the BOOST label and energy (columns 30-39, the S5-1 backup),
  not the HULL. So one change covers both HUDs. *(The brief calls the boss
  HUD's copy "10-cell"; in the repo those ten cells are BOOST's, and HULL is
  redrawn by the shared routine.)*

### 1.5 The boss loading screen

* The boss entry's head (`src/main.s:13212`, PICKUP_CODE) blanks the display
  and calls the reader's `sector_reader_show_records`
  (`src/hybrid/sector-reader.s:367`). That routine draws the record list
  `boss_warning_records` (`src/hybrid/light-kernel.s:730`) on the reader's
  ANTIC 2 text screen at `$4000`: `WARNING` on row 6 and `BOSS APPROACHING`
  on row 8. The level summary's dash animation steps on row 10 while sectors
  load.
* `boss_enter_read` (`light-kernel.s:707`) then reads the region's **theme
  run** (2 sectors at `$7990`; 176 of 256 B used in every region), copies the
  theme and starts it, then reads slot A's boss code.
* Per-region data that exists today: `assets/graphics/boss-regions/region-1/
  modules.json` has `"name": "Blockade Breaker"`. Regions 2-4 are copies of
  region 1 (`placeholders.json`), changing only their fire block. Regions 2-4
  have no gun rows of their own yet. Their gun rows are region 1's, and S5-3
  to S5-5 replace them.

## 2. Flash candidates

| | How | Fits? | Cost |
|---|---|---|---|
| **F1** bit 7 | toggle bit 7 of the module's codes: pixel value 3 shows COLPF3 instead of COLPF2 | **no** | COLPF3 is the hull's bulk (132 cells) and the guns' closed looks. Making it bright lights the hull: that is the rejected "whole register" form. Toggling it without that change turns amber accents burgundy, which is darker, and touches only the few pixel-3 pixels of a plate. |
| **F2** flash glyph set | a brighter twin for every code of a module | **no** | One code per distinct glyph (11 for the biggest plate, ×3 stages = 57 for the staged block). The charset has 6 free codes. Building twins at runtime needs the same codes. |
| **F3** fill flash | every non-blank cell of the hit module shows one solid flash glyph (code 127), then gets its code back | **yes** | +8 B in each region's charset (still 8 sectors), slot A +28 B, slot E +125 B code (2 → 3 sectors), install +10 B, slot E RAM +35 B (3 B of state, a 32-cell buffer). The draw replaces the queue's draw on its frame (§3). |
| F4 PMG overlay | P1/P2 over the module in white | not built | P1/P2 belong to the Heavy class (an architecture invariant). It would also need HPOS tracking of the band's drift per frame. |
| (rejected) | the whole band or a colour register | rejected by the owner | — |

F3 shows the module's silhouette at cell granularity: a gun flashes as its
3 × 2 block. On a plate it fills the plate's slab. The flash glyph's colour
is the setting:
`s2` steel (COLPF0 `$0A`) 2 frames, `s4` steel 4 frames, `a3` amber (COLPF2
`$28`) 3 frames. See `build/play/boss-flash-preview.png`: the band as the
fight starts, then plate-d and gun-2 flashed in steel, then in amber.

## 3. F3 as built (review variant `--boss-polish=s2|s4|a3`)

* **A hit** (`boss_hit`, slot A): a damaging hit that leaves the module alive
  stores the module in `boss_flash_req` and ticks. A kill keeps the spark
  exactly as today.
* **The frame's draw** (`boss_flash_frame`, slot E, in place of the queue's
  draw on frames with no kill and no exposure check). Order: the queue first;
  else a flash whose frames are over ends (OFF); else an asked flash starts
  (ON), unless its module has died since. **At most one module is drawn per
  frame, as before.** The one exception is when the queue must draw the
  flashing module itself (`boss_flash_guard`): the flash ends first (OFF),
  then the queued draw runs.
* **ON / OFF** are two more `boss_draw_module` FILL modes, so the ring's
  rebase carries a spark, a muzzle flash or a laser's heat glyph across them.
  ON saves each cell in a 32-cell buffer in slot E's RAM and writes code 127 on
  each non-blank cell. OFF gives back each cell **that still shows code 127**:
  a blast, a GONE draw or an open look drawn over it stays.
* **The converter** (`scripts/boss-assets.mjs`) puts the flash glyph at code
  127 in every region and refuses a module of more than 32 cells. It also
  refuses a module that stands in a gun's fire column under the gun without
  covering it, because a boss shot drawn in such a cell would come back after
  the shot had moved on. A player's shot cannot be in a live module's cell:
  it stops under its column's front module, and the front-first order makes
  that the lowest.
* **Proof** (`tests/boss-hit-flash.test.mjs`, M on `boss-polish-s2`, RED on
  the default build):
  * a hit the plate lives through flashes all its non-blank cells, shows no
    spark, lasts 2-4 frames and gives every cell back;
  * a kill keeps the spark and does not flash;
  * a stage change ends showing the new stage;
  * **A/B:** the same fight played twice, as built and with the flash's frame
    step patched to the plain queue draw. It covers 12 rapid hits through
    stage changes, alternating plates, a kill of a flashing plate, the drift,
    the player's death and the defeat with its chain. Every gameplay byte is
    equal after every frame: hit points, stages, exposure, armed, phase, the
    column map, the stop lines, score, hits, health and lives. A band cell
    differs only inside a module (the flash, or a queued look one frame
    later), and the band is equal once both have settled.
  * The rest of `tests/boss-fortress.test.mjs` passes on the variant; only
    the spark test changes (Phase B re-points it).

## 4. Where the bytes went, and why there is one more sector

The flash state machine (≈125 B) has to run every boss frame, so it must be
in a boss slot that stays resident in the boss sector. Free space before a
new sector on `main`: slot A 32 B (fixed 16 sectors), slot D 17 B, slot E 2 B,
slot C 2 B. The install has 32 B, but it runs once. The hit and the cell hooks
take 28 B of slot A. Everything else is in slot E, which grows from 254 to
379 B: 3 sectors with 5 B to spare. No once-per-entry routine of the right
size exists to move into the install to make room (`b2_prepare` is 38 B
against the install's 32 B; `laser_prepare` is larger). One more sector costs
the entry 4 host frames (M: 245 → 249 on the boss route).

## 5. Measurements

Main's figures are from `docs/STATUS.md` and the committed evidence
(`docs/runtime-wall-trace.json`, ATR `3b05ca34…`) unless the row says
otherwise. All three settings are byte-identical apart from the flash frames
and the glyph's colour.

| | `main` | `s2` / `s4` / `a3` | label |
|---|---:|---:|---|
| worst fence margin (row) | 1,287 (`2-sweep-fire6`) | 1,287 | ANALOGY: the change outside the boss sector is one `lda #imm` value (same cycles) and the entry's once-only text. Phase B measures it. |
| DMA-on maximum | 31,443 (`weapon-pickup-2-hunt-fire4` f2,356) | 31,443 | ANALOGY, as above |
| boss route `s41-diag-1`: boss frames worst margin | 8,789 (f1,246) | 8,925 / 9,161 / 9,161 | M |
| boss route: DMA-on maximum | 29,670 (f1,135) | 29,588 / 29,588 / 29,622 | M |
| boss route: PAL misses, clauses | 0, all pass | 0, all pass | M |
| full-trace boss frames (director-complete) | 8,427 / 29,846 | not run | Phase B |
| boss stress, region 1, worst reachable (limit 8,500) | 6,987 | 7,006 (all three) | M, 6502 harness |
| boss stress, tier-4 fixture, lasers warn / beam | 7,987 / 7,019 | 8,006 / 7,037 | M (s2) |
| boss stress, unproven 5-meeting case | 10,187 | 10,250 | M; outside the gate on `main` too |
| worst frame with two stage changes, one on a flashing module (UPDATE) | 4,789 | 4,281 | M, 6502 harness: the flash costs less than the ring search for the spark it replaces |
| boss entry | 64 sectors, 245 host frames | **65 sectors, 249 host frames** | M (route); limit 250 |
| slot A | 2,016 of 2,048 B | 2,044 | M |
| slot E code | 254 B, 2 sectors | 379 B, **3 sectors** | M |
| install | 352 of 384 B | 362 | M |
| slots C / D / F | 13 / 13 sectors, F 110 B | unchanged | M |
| region charset | 976 B, 8 sectors | 1,024 B, 8 sectors | M |
| theme run | 176 of 256 B | 176 + title (≤ 31 B at +`$C0`) | M |
| Light kernel record | 866 of 875 B packed | 865 | M |
| window record / free tail | 1,322 of 1,387 B / 941 B | 1,322 / 946 | M |
| initial block | 13,623 B, 107 sectors | unchanged | M |
| pickup tail, arena, DIRECTOR_RAM | 20 / 14 / 2 B | unchanged | M |
| boss RAM | slot E BSS 12 B | 47 B: flash state `$4D87-$4D89`, buffer `$4D8A-$4DA9`; slot E's 576 B hold 426, 150 free | M (`boss.lbl`) |
| boss fight length (aim bot) | 86.5 / 103.0 / 154.4 s | unchanged | ANALOGY: the A/B test shows no gameplay byte changes. Phase B measures it. |

HULL and the title cost nothing per frame. The title adds one 14-byte call
during the entry, in the kernel's last segment, behind every pinned label.

## 6. Builds (`build/play/`)

| ATR | What | SHA-256 |
|---|---|---|
| `boss-polish-s2-full.atr` | the full game with all three fixes (flash steel, 2 frames) | `26bb0cad730c…` |
| `boss-polish-s2-boss-route.atr` | region 1's boss at once, flash steel, 2 frames | `f7c069efe6f8…` |
| `boss-polish-s4-boss-route.atr` | the same, steel, 4 frames | `a7e61b185c10…` |
| `boss-polish-a3-boss-route.atr` | the same, amber, 3 frames | `6f0382fd2c96…` |
| `boss-polish-s2-r2/r3/r4-boss-route.atr` | the title for BASTION / SIEGE SPINE / VOID CITADEL (review routes; the fight is region 1's copy) | `a89c18329d6e…` / `6a38af825be5…` / `7a91f80e69bc…` |
| `main-boss-route.atr` | `main`'s boss route, for comparison | `925f69cb1d15…` |

Title pictures, rendered from screen memory in the 6502 harness at the
moment the boss code takes over: `build/play/boss-title-r1.png` … `-r4.png`.
They show WARNING on row 5, the name on row 7, INCOMING on row 8 and the
dashes on row 10. They are not emulator screenshots, because the trace
harness takes pictures on gameplay frames only.

## 7. Owner questions

1. **Flash setting.** Options: `s2`, `s4`, `a3`, or a mixed form (amber on
   armour, steel on weapons: +8 B est. and charset code 126). *Recommended:
   `a3`.*
2. **The boss entry at 249 of 250 frames** (+4, one slot-E sector). Accept
   for this task? The banner task has its own ~280 limit (decision AL 2).
   *Recommended: accept.* The alternative is no new sector, which means a
   smaller flash (no queue guard or OFF check: wrong-glyph risk) or moving
   once-per-entry code (none of the right size is free).
3. **Absorbed and hull hits** keep the deflection glyph (not a module
   damaged). *Recommended: keep.*
4. **Title layout:** WARNING row 5, name row 7, INCOMING row 8. WARNING shows
   first and the name and INCOMING follow once the theme run lands (EST: about
   7-8 host frames later, the theme's 2 sectors at 3.5-4 frames a sector). *Recommended: as built.*

## 8. Phase B (after the choice)

*As built, with every re-pin and its source: §11.3.*

The tests come first: the flash test is RED on `main`; the HULL and title
tests follow. Then the chosen setting becomes the default and the other
settings' code goes. Re-pins: the spark test
(`tests/boss-fortress.test.mjs`); the HULL codes in
`tests/hud-status.test.mjs` and `tests/weapon-pickup-rapid-fire.test.mjs:532,534`;
the boss-entry sector and frame pins (64 → 65, 245 → 249); slot E's size and
sectors; the charset bytes; the Light kernel record; the WARNING records' rows;
and the showcase and media hashes. Then the evidence regeneration, two full
`npm test` runs with reconciliation, and the documents.

---

## 9. Round 2 — the owner's answers of 2026-10-12 and the bit-7 candidates

**The owner's answers:**
1. F3 rejected; build F1b (toggle bit 7 on the hit module's non-blank cells
   for N frames, then toggle it back; no colour register written, no buffer)
   at 3 and 6 frames, F1c (the struck cell only) at 3 frames, and a build with
   no picture on a damaging hit; then STOP for the owner's play.
2. **Decision AM:** the boss entry's limit is 280 host frames in every task
   (`e8949e7`; journal §AM; the S5 "65 sectors" rule replaced).
3. Hits that do no damage keep the deflection glyph.
4. Title layout as built. Phase B measures the WARNING → name/INCOMING delay
   per region route.
5. HULL as built.

### 9.1 As built (`--boss-polish=b3|b6|c3|n0`; F3's code is gone)

* **F1b** (`b3`, `b6`, src/hybrid/boss.s `BOSS_FLASH_FRAMES`): the round-1
  state machine (the queue first, then a due OFF, then an asked ON: one
  module draw a frame), with one `boss_draw_module` mode, `BOSS_MODE_FLASH`,
  that toggles bit 7 of every non-blank cell. ON and OFF are the same toggle,
  so a cell that already had bit 7 comes back exactly
  (`tests/boss-hit-flash.test.mjs`, the gun-1 round trip). The OFF is
  unconditional, so **every** other draw of the flashing module ends the
  flash first: the queue (`boss_flash_guard_q`) and, new, the defeat chain's
  blast (`boss_flash_guard_m`, slot A +3 B). The ring's rebase carries a
  spark, a muzzle flash or a heat glyph across both toggles. The converter's
  fire-column check stays: no shot can be in a toggled cell.
* **F1c** (`c3`, `BOSS_HIT_TOGGLE_FRAMES`): the struck cell's own code with
  bit 7 toggled, shown through the cell-flash ring for 3 frames (the spark's
  mechanism). A second hit on the same cell shows the same toggle. The ring
  restores the saved code. Limitation: a stage change inside those 3 frames
  shows the toggled old-stage code in that one cell until the ring expires.
* **n0** (`BOSS_HIT_NO_FEEDBACK`): the tick only.
* Every build keeps the kill's spark, the deflection, the HULL change and the
  title.

### 9.2 What each one changes on screen (region 1; `build/play/boss-toggle-preview.png`)

Rows: the band as the fight starts; F1b on plate-d, gun-2 and gun-1; F1c on
the same three. Pixels changed, of the module's lit pixels (M, the converter's
charset):

| module | lit pixels | F1b | F1c |
|---|---:|---:|---:|
| plate-d (5 × 4) | 574 | 20 (its amber marks turn dark red) | **0** (its struck cell has no colour-3 pixel) |
| gun-2, open (3 × 2) | 120 | 32 (amber → dark red) | 14 |
| gun-1, closed (3 × 2) | 90 | 42 (dark red → amber) | 4 |

A plate is steel, grey and a few amber marks, so **on a plate F1b is faint and
F1c shows nothing**. On a gun both read clearly. This follows from the band's
palette, not from the code: bit 7 changes only colour-3 pixels.

### 9.3 Measurements (round 2)

`main` from §5. Boss route = `build/boss-polish-X-level-1-s6`, focused run
`s41-diag-1`, 4,000 boss frames (M). Stress = the 6502 harness (M).

| | `main` | F1b `b3` | F1b `b6` | F1c `c3` | none `n0` |
|---|---:|---:|---:|---:|---:|
| slot A (of 2,048) | 2,016 | 2,047 | 2,047 | 2,045 | 2,026 |
| slot E code | 254 B, 2 sectors | 358 B, **3** | 358 B, **3** | 254 B, 2 | 254 B, 2 |
| slot E RAM (of 576) | 266 | 373 | 373 | 266 | 266 |
| install | 352 | 362 | 362 | 352 | 352 |
| boss entry: sectors / host frames | 64 / 245 | 65 / **249** | 65 / 249 | 64 / 245 | 64 / 245 |
| boss frames worst margin (frame) | 8,789 (f1,246) | 9,379 (f1,246) | 8,900 (f1,030) | 8,763 (f1,246) | 9,533 (f1,246) |
| boss frames DMA-on max | 29,670 | 29,622 | 29,588 | 29,610 | 29,610 |
| PAL misses / clauses | 0 / pass | 0 / pass | 0 / pass | 0 / pass | 0 / pass |
| stress region 1, reachable (limit 8,500) | 6,987 | 7,006 | 7,006 (same code) | 7,021 | 7,004 |
| stress fixture warn / beam | 7,987 / 7,019 | 8,006 / 7,037 | same | 8,009 / 7,040 | 8,004 / 7,036 |
| two stage changes, one module flashing (UPDATE) | 4,789 | 4,297 | same | 4,831 | 4,212 |
| gameplay identity (A/B, every byte, every frame) | — | PASS | PASS | PASS | PASS (no difference at all) |
| Light kernel record | 866 | 865 | 865 | 865 | 865 |

The worst fence margin (1,287) and DMA-on (31,443) outside the boss sector
are as in §5 (ANALOGY; Phase B measures them).

### 9.4 Room left after the choice, and the M6 torpedo (~200 B in slot E)

Slot E's run tops at 4 sectors (512 B; the build's reservation check refuses
5, `docs/plans/s5-boss-regions.md` §2.1), and slot E's RAM is 576 B.

| choice | slot A free | slot E code after | + torpedo 200 B | entry with the torpedo (EST, 3.5-4.0 frames a sector) |
|---|---:|---:|---|---|
| F1b | 1 B | 358 B (3 sectors) | **558 B: 5 sectors, refused**; RAM 573 of 576 | — the torpedo would need ≤ 154 B in slot E, or another home |
| F1c | 3 B | 254 B (2) | 454 B, 4 sectors, RAM ≈ 466 | 66 sectors ≈ 252-253 of 280 |
| none | 22 B | 254 B (2) | 454 B, 4 sectors | 66 sectors ≈ 252-253 of 280 |

### 9.5 Sound on a damaging hit (asked)

**Yes, today.** Every damaging hit plays the boss tick
(`boss_tick_sound`, slot A): **channel 3**, AUDF `$18`, AUDC `$A6` (pure tone,
volume 6), for **2 frames** (`BOSS_TICK_FRAMES`), then the engine bed (`$68` /
`$22`) comes back. An absorbed hit uses `$40` / `$A4` and a hull hit `$28` /
`$C5` (a poly-4 clank). A kill adds the hit sound on channel 2, and the
destruction adds the explosion on channel 4. The boss theme plays on channels
1-2. All of this is unchanged in every round-2 build, n0 included.

A stronger hit sound:
* **0 B** on channel 3: a longer tick (`BOSS_TICK_FRAMES` 2 → 3-4) and/or
  louder (`$A6` → `$A8`-`$AA`), table bytes only. The conflict: channel 3 is
  the engine bed and the laser warning's rising tone, so a longer tick masks
  them for its frames (as the tick does today).
* **≈ 10-15 B** for a separate damage sound on channel 4 (EST). Channel 4 is
  the destruction's explosion, so it conflicts only on kill frames. Its timer
  would also need a reset at the install.
* Atari800 plays channels 3-4 like a 65XE now that SKCTL is fixed
  (`fix/hardware-audio`), so a hardware smoke hears the same.

### 9.6 Builds (`build/play/`)

| ATR | What | SHA-256 |
|---|---|---|
| `boss-polish-b3-boss-route.atr` | F1b, 3 frames | `5e752dfb3209…` |
| `boss-polish-b6-boss-route.atr` | F1b, 6 frames | `1dacae3c7600…` |
| `boss-polish-c3-boss-route.atr` | F1c, 3 frames | `6bf620832d39…` |
| `boss-polish-n0-boss-route.atr` | no picture, the tick only | `4d03314cedae…` |
| `boss-polish-b3-full.atr` | the full game with F1b 3 frames, HULL and the title | `af38926b26b9…` |
| `main-boss-route.atr` | `main`'s boss route (the spark) | `925f69cb1d15…` |

### 9.7 Owner questions (round 2)

1. Which feedback? `b3`, `b6`, `c3`, `n0`, or none of them (the flash is
   dropped; damaging hits keep today's spark)? *Recommendation: `b3` if the
   gun flash reads well to you, since it is the only candidate that shows on
   every gun. Know that plates barely change, and that it takes slot E's
   third sector and leaves the torpedo no room in slot E (§9.4). If plates
   matter more, `n0` (or a louder tick, §9.5) is the cheapest.*
2. A stronger damage sound: channel 3, longer/louder (0 B), or channel 4
   (≈ 10-15 B)? *Recommendation: channel 3, 3 frames, `$A8` (0 B).*

---

## 10. Round 3 — b3 chosen; every stage gets colour-3 pixels (owner answers of 2026-10-12)

**The owner's answers:**
1. **b3** (bit 7 of the whole hit module toggled for 3 frames). The owner's
   smoke: plates flashed only partly at stage 1, not at all at stage 2 (the
   grey stage), and again at stage 3. The cause is §9.2: bit 7 recolours only
   colour-3 pixels. The fix is in the data: every stage of every destructible
   module gets a clear colour-3 element, with no new charset codes, slot F
   ≤ 110 B, and no code change. Then STOP for the owner's look.
2. The hit sound stays: the 2-frame channel-3 tick (a longer one would mask
   the laser warning's tone).
3. The design rule and slot E's room are recorded here, in STATUS and in
   `docs/plans/s5-boss-regions.md` (§10.3, §10.4).

### 10.1 The art (region 1's drafts; regions 2-4 are its copies)

All edits are in `assets/graphics/boss-regions/region-1/`: `band.png` and
`open.png` (kept identical at the plates, or the converter reads the plates
as open looks), `cracked.png` and `extras.png`. `broken.png` is unchanged.

* **Intact plate:** the plate's bottom rim (rows 5-6 of its bottom row's
  cells, grey and steel today) is amber, and the two top corners' rivet holes
  are amber rivets.
* **Cracked plate (the grey stage):** the crack line in every cell of the
  shared crack pattern glows amber. The stipple stays grey.
* **Broken plate:** already amber hatching; unchanged.
* **Capped plate** (an emitter slot the level's tier does not enable): its
  middle band and bottom rim are amber when intact, and its crack is amber
  when cracked.
* Guns and the emitter already have colour 3 in every stage (below); no
  change.

**Codes:** 122 (no new code; 6 still free), K 19, charset 976 B (8 sectors),
look tail 110 B. Each plate code has its own cracked and broken slots, so
adding amber needs no code. A plate cell shared by every plate (the rim, the
corner) gets the same edit everywhere, so no cell becomes a new glyph.

### 10.2 Colour-3 pixels per module per stage (M, the converter's charset; hit look: a gun's open look)

| module | intact before → after | cracked before → after | broken before → after |
|---|---|---|---|
| plate-a | 8 → 48 | 0 → 90 | 60 → 60 |
| plate-b | 0 → 32 | 0 → 96 | 64 → 64 |
| plate-c | 10 → 42 | 0 → 96 | 64 → 64 |
| plate-d | 20 → 60 | 0 → 120 | 80 → 80 |
| plate-e | 0 → 40 | 0 → 120 | 80 → 80 |
| plate-f | 0 → 16 | 0 → 48 | 32 → 32 |
| plate-g | 10 → 58 | 0 → 108 | 72 → 72 |
| plate-h | 0 → 32 | 0 → 96 | 64 → 64 |
| capped plate | 2 → 8 | 1 → 7 | 5 → 5 |
| gun-1 … gun-6 (open) | 32 | 29 | 29 |
| emitter (lens staged) | 30 | 25 | 16 |

All of this is colour 3 in cells without bit 7 (COLPF2, amber), which the
toggle turns COLPF3 (dark red).

**Preview:** `build/play/boss-b3-stages-after.png` (and `-before.png` for
the old art). Rows are intact, cracked and broken. On the left every module
is shown in the look it is hit in; on the right the same with the b3 toggle.

**Build:** `build/play/boss-polish-b3-plates-boss-route.atr` (`36a7de2205a2…`)
and the full game `boss-polish-b3-plates-full.atr` (`ddf01a9fdd53…`). On the
b3 route build (`VS65_HARNESS_BUILD`) `tests/boss-hit-flash.test.mjs` passes
6/6, the A/B gameplay identity included.

Two other tests change on b3, both expected and re-pointed in Phase B:
* `tests/boss-engine.test.mjs` "the four damage stages" sees the flash on its
  stage-change hit.
* `tests/boss-s4b5.test.mjs` asserts that the removed band flash's label
  `boss_flash_timer` stays gone, and the module flash reuses that name. Phase B
  renames the module flash's labels instead, so that guard keeps its meaning.

### 10.3 The design rule (S5-3/4/5 and every later boss)

**Every damage stage of every destructible module (intact, cracked, broken;
open looks included) must contain clearly visible colour-3 pixels.** Those are
COLPF2 in a cell without bit 7, or COLPF3 in a bit-7 cell. Otherwise the b3
hit flash does not show on that stage. Phase B adds a data test that enforces
this for every region.

### 10.4 Slot E after b3, and a home for the M6 torpedo (~200 B) — nothing moved

Slot E after b3: **358 B of code, 3 sectors**, with 15 B of state, so 373 of
its 576 B RAM are used (203 free). The torpedo's ~200 B would make 558 B of
code and 573 B with today's state. That leaves 3 B for the torpedo's own
state, so in practice it does not fit. It would also take 5 sectors, about
+2 sectors of entry (≈ 257 of 280 frames, EST).

*Correction to the brief's wording:* the code alone stays under the RAM; it is
the torpedo's own state that overflows.

Candidates, as the boss build reports them (M, `build/boss-polish-b3-level-1-s6`):

| home | free | note |
|---|---:|---|
| slot F after the region block (`$5280-$53FF`) | 384 B RAM | Each region's block has 4 reserved sectors, 1 used, so code here travels in every region's block (4 copies on disk). Entry +2 sectors. The slot F write clause would need the torpedo's state elsewhere. |
| slot C (the C controller) | 163 B RAM (code 1,662 of 13 sectors, 2 B to the 14th) | Too small alone. A split torpedo, C policy here and ASM elsewhere, fits the C/ASM rule. |
| slot D | 57 B RAM | too small |
| region charset tail (`$0FD0-$0FFF`) | 48 B (region 1: 976 of 1,024) | data only; varies per region |
| install | 22 B | once per entry only |
| slot A | 1 B | full |
| shrink | — | A torpedo ≤ ≈ 150 B fits slot E's 4th sector with its state (EST). |

---

## 11. Phase B — as built (owner OK of 2026-10-12)

**Commits:** `f9dd63b` (code and tests) and `72c48ec` (the evidence), plus
this documentation. The variants are gone: there is no `--boss-polish` flag,
no F1c, no n0 and no F3 code, and every flash path is unconditional.

### 11.1 The game

* **Hit flash (b3):** a damaging hit that a module lives through toggles bit
  7 of the module's non-blank cells for `BOSS_MFLASH_FRAMES` = 3 frames
  (`src/hybrid/boss.s`, `boss_mflash_*`). The flash takes the frame's single
  module draw. The queue and the defeat chain's blast end a flash before they
  draw its module. A kill keeps the spark. Absorbed and hull hits keep the
  deflection, and the 2-frame channel-3 tick is unchanged (owner answer 2).
  The labels are `boss_mflash_*`, so `tests/boss-s4b5.test.mjs`'s guard
  against the removed *band* flash (`boss_flash_timer`, `boss_flash_on`) is
  untouched.
* **HULL:** a spent quarter is `CH_SPACE`, in the normal HUD and in the boss
  sector's (`src/main.s` `update_hud_status`; the install calls the same
  routine).
* **Title:** WARNING (row 5) is resident in the Light kernel's records; the
  region's name (row 7) and INCOMING (row 8) are the reader's records at
  `$C0` in each region's theme run. They are drawn by `boss_enter_title`
  through `render_frontend_records` (the record loop's new entry, no clear)
  right after the run lands. Names: `modules.json` `"name"` and
  `placeholders.json` `"name"`.
* **Art (§10):** region 1's plate stages and the capped plate carry amber;
  regions 2-4 copy it.

### 11.2 Tests: RED on `main` `26ad91d`, GREEN here

The new files were run on `main`'s own build in a temporary detached worktree,
since removed. On `main`'s converter `tests/boss-polish.test.mjs` takes the
title records' address as a literal.

| test | `main` | here |
|---|---|---|
| `tests/boss-hit-flash.test.mjs`: a hit plate-d / gun-2 lives through flashes the whole module 3 frames, no spark, every cell back | RED | GREEN |
| … a module with bit-7 cells comes back exactly after two toggles | RED | GREEN |
| … the A/B gameplay identity (every gameplay byte every frame; the band equal once settled; drift, death, defeat) | RED | GREEN |
| … a kill keeps the spark; a stage change ends on the new stage | GREEN (guard) | GREEN |
| `tests/boss-polish.test.mjs`: HULL blank at 0-10 units; the respawn's four plates; the boss HUD at 10 / 7 / 4 / 2 / 0 | RED | GREEN |
| … the loading screen, regions 1-4: WARNING / name / INCOMING | RED | GREEN |
| … the title lives in the theme runs (not resident, not slot F) | RED | GREEN |
| … the art rule: every stage of every destructible module, regions 1-4, ≥ 4 colour-3 pixels | RED | GREEN |

### 11.3 Re-pins and re-points, with their sources

| site | old → new | why |
|---|---|---|
| `tests/boss-fortress.test.mjs` "a spark in the struck cell…" | spark 2 frames → the module flashed 3 frames, no spark | owner request 1, choice b3; the hull's deflection part unchanged |
| `tests/boss-engine.test.mjs` "the four damage stages" | settle 3 → 3 + 3 frames | the flash it now sees on the stage-change hit; the stage assertions unchanged |
| `tests/boss-s4b5.test.mjs` "F2, then decision 2…" | a plain hit and a stage change spark → flash (no spark); a kill sparks; + a check that each hit lands | owner request 1; the band-flash label guard untouched |
| `tests/boss-overlay.test.mjs` the disk | regions 2-4's theme = region 1's file → each region's own file, the first 192 B region 1's | the title records at `$C0` (decision AL 1) |
| `tests/boss-overlay.test.mjs` decision 32 | records WARNING / BOSS APPROACHING → WARNING (row 5) alone | title variant A |
| `tests/boss-runtime.test.mjs` decision 32 | WARNING row 6, BOSS APPROACHING row 8 → WARNING row 5, BLOCKADE BREAKER row 7, INCOMING row 8 | title variant A |
| `tests/boss-look-tail.test.mjs` E4 band digests | panels 1, 2, 5, 6 → the accepted art's digests; 3, 4 unchanged | plan §10, the owner's acceptance |
| `tests/level-summary-build.test.mjs` disk runs | region N is region 1's copy → … except its theme run's title bytes `$C0-$FF` | decision AL 1 |
| `tests/level-summary-build.test.mjs` the window | 941 → 946 | the kernel 987 → 982 B (the other side of the next two rows) |
| `tests/basic-window-capacity.test.mjs` | 941 → 946 | the same |
| `tests/level-buffer-16.test.mjs` | kernel 987 → 982, used 2,643 → 2,638, tail 941 → 946 | the WARNING records' 19 B out, the 14-B title call in |
| `tests/entity-effects.test.mjs` (×4) | HULL `[5,5,12,12]` / `[12,12,12,12]` → `[5,5,0,0]` / `[0,0,0,0]` | owner request 2 |
| `tests/weapon-pickup-rapid-fire.test.mjs:532,534` | `[5,5,12,12]`, `[12,12,12,12]` → `[5,5,0,0]`, `[0,0,0,0]` | owner request 2 |
| `tests/frontend.test.mjs` the terminator compare | `beq @record` in `render_frontend_data` → `beq render_frontend_records` in its own routine | the record loop's global entry |
| `tests/runtime-wall-trace.test.mjs`, `scripts/runtime-wall-trace.mjs`, `tests/slot-f.test.mjs` | entry < 250 → ≤ 280; ≤ 65 sectors removed | **gate change**, owner decision AM (`e8949e7`) |
| `tests/boss-stress.test.mjs` the placeholders' equality | entries compared without their `name` | the names never reach the fight |
| `scripts/boss-assets.mjs` the laser fixtures' name | `Laser fixture, tier N` → `Laser fixture - tier N` | the comma is not a frontend glyph; the converter writes every region's title now |
| evidence (`docs/runtime-wall-trace.json`, `menu-raster-trace.json`, `docs/media/`, `dist/`, the memory map's generated block) | regenerated | `72c48ec` |

### 11.4 Before / after (main = `docs/STATUS.md` and the evidence at `26ad91d`)

| figure | main | here | source |
|---|---:|---:|---|
| worst fence margin (row) | 1,287 (`2-sweep-fire6`) | 1,287 (`2-sweep-fire6`) | M, PAL audit over 58 replays |
| DMA-on maximum | 31,443 (`weapon-pickup-2-hunt-fire4` f2,356) | 31,443 (same) | M, `docs/runtime-wall-trace.json` |
| replays / clause failures / missed frames | 58 / 0 / 0 | 58 / 0 / 0 | M |
| boss frames (director-complete, rows in the boss sector) worst margin / DMA-on | 8,427 / 29,846 (STATUS) | 8,359 (`director-complete-1` f4,156) / 29,987 (`-2` f5,831) | M. This session's method is all rows with `boss_state ≥ 1`, the entry row excluded; STATUS does not record how main's figure was taken, so the 68-cycle difference may be the method. |
| boss fight frames (director-complete E / M / H) | 2,084 / 2,492 / 3,447 | 2,084 / 2,492 / 3,447 | M; the fight is frame-identical, so the aim-bot fight lengths (86.5 / 103.0 / 154.4 s) stand |
| boss stress, region 1, worst reachable (limit 8,500) | 6,987 | 7,006 | M, 6502 harness |
| boss stress, tier-4 fixture warn / beam | 7,987 / 7,019 | 8,006 / 7,037 | M |
| boss entry | 64 sectors, 245 host frames | **65 sectors, 249 host frames** (16 entries; limit 280, decision AM) | M |
| WARNING → name / INCOMING | — | **7 host frames** on every route, regions 1-4 | M, the trace header's opt-in title observer (`DFTITLE_*`), focused runs on `build/[boss-region-N-]level-1-s6` |
| window record | 1,322 of 1,387 B, 11 sectors | unchanged | M |
| window free tail | 941 B | 946 B | M |
| Light kernel record | 866 of 875 B packed (987 raw) | 865 (982 raw) | M |
| pickup tail / arena / DIRECTOR_RAM | 20 / 14 / 2 B | unchanged | M |
| initial block | 13,623 B, 107 sectors | unchanged | M |
| slot A | 2,016 of 2,048 B | **2,047 (1 B free)** | M |
| slot C / D | 1,662 B, 13 / 1,647 B, 13 | unchanged | M |
| slot E | 254 B, 2 sectors (266 B RAM) | **358 B, 3 sectors** (373 of 576 B RAM) | M |
| install | 352 of 384 B | 362 | M |
| slot F (R1 table) | 110 B | 110 B | M |
| region charset | 976 B, 122 codes | 976 B, 122 codes | M |
| theme run | 176 of 256 B | 176 + the title's records at `$C0` (R1: 31 B) | M |
| npm test | 1,309 tests, 1 recorded failure | §11.5 | M |
| ATR / boot | `3b05ca34…` / `731e5703…` | `ddf01a9f…` / `186739b2…` | M |

### 11.5 Follow-ups

* **The Interceptor tougher (more hits to destroy)** — the owner's next task,
  its own branch after this one and before S5-3. No work here.
* **The M6 torpedo's home**: slot E has no room beside the flash (§10.4).
* **S5-3/4/5:** keep the art rule (§10.3) and the final names in data
  (`docs/plans/s5-boss-regions.md`).
