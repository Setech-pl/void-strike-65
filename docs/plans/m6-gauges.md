# M6 stage 1b — the HUD at the bottom and the PMG gauges

**Branch:** `feat/m6-gauges` from `main` `52e5998` (M6 stage 1 final,
owner hardware smoke PASS, journal §BJ; ATR `30b94e65…`).
**Status:** plan, committed before code (the owner's brief, 2026-10-21;
journal **§BK**). Two variants are built and measured, then STOP for the
owner's choice. No full evidence chain on this branch until the owner chooses.

Labels: **M** measured (the 6502 core with the boss stress tools, or the
Atari800 trace); **EST** an estimate, with its basis; **IC** an instruction
count, not assembled.

---

## 1. The brief and the owner's answers (2026-10-21)

The brief: the HUD line moves from the top of the display to the bottom; two
small vertical gauges on PMG - the lance meter (4 dots = 25 / 50 / 75 / 100 %,
a lance icon below) and the booster (icon + 4 dots = the remaining charge,
stacked above the lance gauge) - in two variants, both built and measured:
**A** over the playfield's left edge (HPOS 48-55, over column 0), **B** in the
left border (HPOS 40-47, outside the playfield; may be cut by a CRT's
overscan, the owner checks on his TV).

Two premises of the brief do not hold in the code. The owner answered both
before any code (the session's questions, journal §BK 4-5):

1. **P1 and P2 are not free in space sectors.** They are the Heavy class's
   bodies (`draw_enemy_member`, `src/main.s`: Raider / Bomber slot 0 in P1,
   slot 1 in P2, rows 16-239, HPOS rewritten every frame; the Bomber column
   sits at about HPOS 48). AGENTS.md's invariant gives P1 / P2 to the Heavy
   class. **Answer: the PMG gauges live in the boss sector only.** In space
   sectors the booster stays the HUD's BOOST bar (moved to the bottom with the
   HUD). Variant B's "two players, two colours in space" therefore does not
   exist: **A and B are both one player (P2) in the boss sector, and differ
   only in their horizontal position.**
2. **P2's colour is the lasers'.** `COLPM2` is laser missile M2's colour
   (`$46`, `B2_COLOUR`), written once at the boss install; M2's column runs
   from the lens core to line 239. A green `$CA` gauge needs a fourth phase of
   the boss DLI at the gauge's first line every boss frame (EST 55-65 native
   cycles: the Bastion's fire frame 8,462 -> ~8,520, over 8,500) and would turn
   an M2 laser's bottom lines green. **Answer: the gauges wear the lasers'
   colour, `COLPM2` as it is - 0 cycles, no DLI change** (the P1 reticle's
   rule, plan `m6-void-lance.md` §2.3).

## 2. Part 1 — the HUD at the bottom (both variants)

### 2.1 Placement: below the ship's lowest row, scanlines 240-247

The playfield keeps every scanline: the divider row 16-23, the 27 ring rows
24-239, `GAMEPLAY_TOP` 16, `GAMEPLAY_BOTTOM` 240, the ship's lowest opaque row
239 (`PLAYER_RESPAWN_Y` 225). The HUD's ANTIC 2 line follows the last ring
row, scanlines 240-247 (ANTIC's last displayable line is 247); the 8 lines it
leaves at the top (8-15) are blank.

Why this one and not "above the ship's lowest row":
* **Every DLI keeps its scanline.** The first DLI (gameplay's phase 0, the
  boss's phase 0: the PAL-frame token, the gameplay or region charset and
  palette) fires on line 15 today as the HUD's last line; it fires on line 15
  as the last line of the 8 blank lines. The last ring row's DLI (line 239:
  gameplay's HUD restore, the boss's phase 2) installs the HUD's charset and
  colours as today - now for the HUD line that follows it directly instead of
  the next frame's first. The boss band's DLIs and row switches are on the
  same lines. No DLI is added, none moves, none changes its code path.
* **No PMG or character coordinate moves.** Every collision test, the PMG
  rows, the trace's PMG and screen observers keep their lines. Putting the
  HUD above the ship's lowest row takes a ring row (the playfield's height,
  the ship's limits and respawn line, every gameplay assert) or moves every
  row down 8 lines (every PMG / character coordinate) - neither is zero cost.
* **DMA is unchanged in total.** The same ANTIC 2 line, the same fetches;
  +1 display-list byte a frame (the blank instruction). The HUD's DMA moves
  from lines 8-15 (before the frame token) to 240-247 (after the line-238
  fence), so the pre-fence work's window (token -> line 238) loses nothing;
  the post-fence tail loses the HUD's ~360 DMA cycles. MEASURED in §5.

### 2.2 The display lists (the one layout change)

Today each list is 90 B: `$C2 HUD` (3) + `$44 divider` (3) + 27 LMS rows (81)
+ JVB (3), list A `$7F10`, B `$7F6A`, and `HYBRID_LIGHT_SLOTS` starts right
after B at `$7FC4` (exactly full but 1 B). The new list:

| bytes | instruction | lines |
| ---: | --- | --- |
| 1 | `$F0` 8 blank lines + DLI | 8-15 |
| 3 | `$44` divider, LMS `$4028` | 16-23 |
| 81 | 27 x `$44` ring row, LMS (the last `$C4`, + DLI) | 24-239 |
| 3 | `$42` the HUD, LMS `$4000` | 240-247 |
| 3 | `$41` JVB, the list's own base | - |

**91 B a list**, one more than today. The two lists must stay on one page
(DLISTL publication) and end before the Light slots, so **list A moves down 2
bytes to `$7F0E`** (B `$7F69-$7FC3`): the two bytes come from
`HYBRID_C_ARENA`'s free tail (14 B unused, `$7F02-$7F0F`), its capacity
832 -> **830 B** (`$7BD0-$7F0D`). The arena's image does not move or change.
Re-pinned as layout values: the arena's capacity and end (`src/main.s`,
`cfg/encounter-director.cfg`, `scripts/build.mjs`, `scripts/chunk-loader.mjs`,
the arena and layout tests), the lists' size and base. `docs/memory-map.md`
updated (rule 4).

Code (byte-neutral where it is resident):
* `build_playfield_display_list` (A2 kernel): the new order.
* `gameplay_dli`: the publication continues at the divider, `active + 1`
  (`adc #$03` -> `adc #$01`).
* The boss install's list: the same order; `boss_dl_lms_offsets` and the band
  rows' DLI offsets are 2 lower (`7 + 3r` -> `5 + 3r`, `ldy #6` -> `ldy #4`).
* `start_gameplay`, `resume_gameplay` and the boss install still point
  DLISTL at the list's base: unchanged.
* `HUD_TOP` = 240 (`scripts/fighter-weapons.mjs`' viewport, generated);
  `BROADSIDE_SCREEN_TOP` keeps 8 (the display's first line - it was
  `HUD_TOP`, the broadside's clip is not the HUD's).

### 2.3 The HUD's separator line

Every HUD glyph carries a full-width white line as its 8th row: the HUD's own
separator from the playfield (`copy_hud_glyphs`). At the bottom it would
underline the screen's edge and leave the playfield and the HUD unseparated,
so the separator moves to the glyphs' **first** row: the build of the HUD
charset writes row 0 and copies the glyph rows to 1-7 (byte-neutral); the
three glyphs drawn whole (the hull plate, the BOOST cell, the Shield cell)
have their rows rotated in their source data.

### 2.4 Pins re-pinned (layout values only)

Every test, trace observer and tool that pins the HUD's lines (8-15 -> 240-247)
or the lists' bytes: found by the RED run of the focused set, listed in §5 as
built. `summary_display_list` stays at `$0B58` (the level summary's own list;
asserted, journal §BC's outside record test).

## 3. Part 2 — the gauges (boss sector only, P2)

### 3.1 What the player sees

Bottom-left, from the bottom up: the lance icon, the lance's 4 dots (25 % at
the bottom, 100 % at the top), the booster icon, the booster's 4 dots. Both
icons and all eight sockets are drawn once at the fight's first frame; a dot
is either lit or an empty socket. One colour: `COLPM2` (§1.2). Lines about
196-237 (above the HUD, inside the playfield's last six rows).

* **The lance gauge:** lit dots = the meter's quarters reached (0-3 while it
  fills; 4 = a lance ready). **The charge empties it top-down** over the 75
  frames (lit 4 / 3 / 2 / 1 / 0 from charge frames 1 / 17 / 33 / 49 / 65 - the
  ramp's own index, (charge + 7) / 8: 4 lit to frame 16, none from 65 to the
  fire on the 75th); released, it refills; a shot over a
  target leaves it empty (the meter empty); a dry shot gives the 4 back after
  the beam.
* **The booster gauge:** lit dots = the HUD's lit BOOST cells (the resident
  HUD code's segment count, its blink of the last cell included), 0 with no
  booster.

### 3.2 Writes only on a change

* **Once a fight** (the first boss frame the lance run ticks, a filling
  frame): `HPOSP2` (A 48, B 40), `SIZEP2` 0, both icons, the eight sockets.
  The horizontal position is never written again in the sector.
* **Per frame:** a compare of the drawn level with the wanted level; a
  difference steps **one dot one frame** (2 bytes of P2). No other PMG write.
* **Where the compare runs** (the Bastion's 38 cycles of headroom, the gate
  >= 20): the meter's filling frames, and the ready frames that are not the
  fire frame, the readiness change, the mark's swap or a beam frame. A step
  due on a skipped frame is taken on the next frame that runs it (the compare
  is "differs", not "equals").
* **One gauge write a frame:** the lance gauge first; the booster poll only on
  a frame where the lance gauge had no step.

### 3.3 Where the code lives

All of it is boss-sector code: **the lance run** (`src/hybrid/lance.s`; the
quarter thresholds per difficulty from `scripts/lance-layout.mjs`), which
takes its **6th sector, 717** (`$B900-$BBFF`, the window's room from
`$B82A` 214 B). Resident bytes: **0** (the booster's level is read from the
HUD's cells, which the resident HUD code already writes). Window record: 0.
The levels are presentation (the HUD's own segment thresholds are ASM today);
the meter and the charge stay C's.

### 3.4 The variants

`--gauge=a|b` builds `build/gauge-<a|b>[-…]/`; the default build is A (to be
replaced by the owner's choice). The only difference is `GAUGE_HPOS` (48 / 40).

## 4. Tests (RED first)

* `tests/gauges.test.mjs` (new): the lance gauge's shape for each meter
  quarter (0-4, every difficulty's thresholds), through the charge (the
  top-down steps) and its release, the fire over a target (empty) and the dry
  shot (back to 4); the booster gauge for each lit-cell count 0-4 and the
  blink; **write-only-on-change**: a frame-by-frame run of the lance tick with
  a write watch over P2's page - no write while nothing changes, exactly one
  dot's two bytes on a change, `HPOSP2` / `SIZEP2` written on the first frame
  only.
* The HUD's position pins: the list's bytes (both lists and the boss's), the
  HUD's lines in the trace's screen observers, the preview.
* Unchanged and passing: `tests/lance.test.mjs`, `tests/boss-stress.test.mjs`,
  `tests/boss-region-2/3/4.test.mjs`, `tests/lance-states.mjs`' states, plus
  new states `quarter` (a filling frame with a quarter's step) and `booster`
  (a ready frame with a booster step).

## 5. As built and measured (2026-10-21)

### 5.1 Part 1 as built — and where it differs from §2.2

* **The JVB became a JMP.** The HUD's last line is ANTIC's last (247), so
  vertical blank begins before ANTIC can fetch the next instruction: a JVB
  after the HUD ran at line 8 of the NEXT frame and blanked that whole frame
  (MEASURED on the first route run: every frame a missed frame, the game at
  25 fps). A list now ends in a **JMP**, which waits through vertical blank and
  is line 8's single blank line; the header is **7** blank lines (`$E0`), so
  the first DLI still fires on line 15. Every display install
  (`start_gameplay`, `resume_gameplay`, the boss install) enters at list A's
  JMP (`PLAYFIELD_DLIST_ENTRY`) - an immediate, 1 B shorter: a non-executed
  pad after each routine keeps every later address. **Real hardware relies on
  ANTIC resuming an unfinished display list at line 8 (documented behaviour,
  Atari800 emulates it): the owner's smoke on the 65XE is the check.**
* **The arena is not touched.** §2.2's 2 B from `HYBRID_C_ARENA`'s tail would
  have broken the owner's floor of 14 free arena bytes (decision AK,
  `tests/heavy-breakup.test.mjs`). Instead the lists keep **90 B** each - the
  divider, the 27 rows, the HUD, the JMP - and share **one header byte at
  `$7F10`**, right before list A (list A `$7F11`, B `$7F6B-$7FC4`): the boss
  sector's DLI never rewrites DLISTL, so its list (A) must follow the header.
  The byte is `HYBRID_LIGHT_SLOTS`' one free byte: the Light slots move one up
  (`$7FC5-$7FFF`, exactly full; 59 B used of 59).
* **The boss list** writes the divider and its 27 rows only; the HUD and the
  JMP are list A's own (the gameplay build wrote them; the install run kept
  its 3 free bytes).
* **The A2 kernel's list builder** grew 5 B, taken from its own 11-B ABI pad
  (6 left): every A2 entry point keeps its address.
* **The separator** is the HUD glyphs' first row (§2.3), byte-neutral.
* **Bytes:** resident code byte-neutral; the initial block's packed content
  13,623 -> **13,622 B**, still **107 sectors**; STARFIELD raw 2,039 B
  unchanged, packed 1,750 -> **1,751 B** (`init_playfield_display_lists`'
  two immediates `$10 / $6A` -> `$11 / $6B` pack worse): its packed hard-gate
  margin **75 -> 74 B** (the floor in `tests/gameplay-music-placement`
  re-pinned with the reason - reported).
* **The default trace (M, Atari800, the full 58 replays on the candidate
  build = variant A; nothing committed from it):** 0 misses, 0 clause
  failures, physical headroom 4,092. **Worst fence margin 1,465 -> 1,497**
  (`2-sweep-fire6`): the HUD's DMA left the pre-fence window. **DMA-on maximum
  31,059 -> 31,476** (`2-evasive-fire7`; **17 of 58 replays over the 31,200
  target**, all under the 32,568 hard gate): the HUD's ~400 DMA cycles moved
  from lines 8-15, before the frame token, to 240-247, inside the measured
  main-loop wall - every placement below line 15 does, so only the HUD at the
  top avoids it. **This gate fails** (by 276 cycles); what brings it under:
  ~280 native cycles off the worst fighter frames' post-fence work, the owner
  re-reading the 31,200 target for DMA that is not CPU work, or the HUD at the
  top. Boss entries 314 -> 321 host frames (the lance run's two sectors).
* **Known side effect (not fixed):** PMG rows 240-247 were below the display
  and are now the HUD's lines. Anything a game object draws there shows over
  the HUD: MEASURED on R1, the boss's falling capsule (P3, gold) passes over
  `LIFE` as it leaves the screen. Fixes for the owner: clip P3's draw at line
  239 (resident bytes) or hide P3 in the last ring row's DLI (cycles every
  frame).

### 5.2 Part 2 as built

The code is §3 as planned except: **the lance run takes 7 sectors
(712-718), not 6** - the gauges are **241 B** (238 B code and tables, 3 B
state) and the sixth sector was 96 B short. The run is **880 of 896 B**
(`$B880-$BBFF`); **the window keeps 86 B to grow** (was 342): stage 2's +1
life capsule (EST 125-160 B in the window record) no longer fits there -
`tests/lance.test.mjs`' guard (>= 160 B) is red on this branch, deliberately
not re-pinned. **Alternative (not built):** the gauge code as its own 2-sector
boss run at `$0400-$04FF` (unclaimed, not yet measured: it needs a run-time
write watch) - the same 7 entry sectors in total, the window room back to
342 B, slot A +5 B of its 9.

Resident bytes **0**; window record **0**. Variant A and B differ in one byte
of the lance run (`GAUGE_HPOS` 48 / 40; `cmp` of the two runs), so every
cycle figure below is both variants'.

**Boss stress, worst reachable per state (native cycles, limit 8,500; A = B):**

| region | filling | quarter | install (1st frame) | idle | charge | step | swap | fire | dry | refill | booster | beam (grow / erase / end) | arrive | **worst (headroom)** |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| 1 Breaker L1 | 7,294 | 7,333 | 7,559 | 7,545 | 7,567 | 7,581 | 7,582 | 7,579 | 7,519 | 7,557 | 7,577 | 7,507 / 7,527 / 7,543 | 7,125 | **7,582 (918)** |
| 2 Citadel L5 | 8,173 | 8,212 | 8,438 | 8,386 | 8,408 | 8,419 | 8,420 | 8,417 | 8,417 | 8,395 | 8,415 | 8,386 / 8,406 / 8,422 | 8,218 | **8,438 (62)** |
| 3 Spine L9 | 8,169 | 8,208 | 8,434 | 8,398 | 8,420 | 8,434 | 8,435 | 8,432 | 8,368 | 8,410 | 8,430 | 8,382 / 8,402 / 8,418 | 8,020 | **8,435 (65)** |
| 4 Bastion L10 | 8,204 | 8,243 | 8,469 | 8,432 | 8,454 | 8,468 | 8,469 | 8,466 | 8,403 | 8,444 | 8,464 | 8,417 / 8,437 / 8,453 | 7,556 | **8,469 (31)** |

(`main`: worst 7,575 / 8,422 / 8,428 / **8,462 (38)**. Citadel L4 8,103,
Spine L7 8,180. `tests/lance-states.mjs` states; `quarter`, `install`, `step`,
`refill`, `booster` are the gauges' own write frames, the rest settled with
the booster at 2 of 4. Tools: `tests/boss-stress.test.mjs`,
`scripts/measure-lance-stress.mjs`.)

**The routes** (Atari800, 34 focused sessions per variant, `build/gauge-<a|b>-…`,
`scripts/pal-timing-audit.mjs`' model; A and B identical to the cycle):

| route | sessions | worst margin | DMA-on max | entry, host frames | misses / clause failures | `main` margin / DMA-on / entry |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| R1 Breaker | 6 | 8,426 | 30,128 | **321** | 0 / 0 | 8,507 / 29,813 / 314 |
| R2 Citadel | 9 | 6,142 | 30,417 | **336** | 0 / 0 | 6,166 / 30,293 / 329 |
| R3 Spine | 9 | 4,658 | 30,775 | **336** | 0 / 0 | 6,959 / 30,392 / 329 |
| R4 Bastion | 10 | 6,459 | 30,109 | **340** | 0 / 0 | 6,459 / 29,811 / 332 |

* DMA-on +250-450 on every session: the HUD's DMA now falls inside the
  measured wall (lines 240-247; on lines 8-15 it was before the frame token) -
  Part 1, not the gauges.
* R3's worst margin is `boss-aim-lance-1` (7,539 on `main`): the bot fires its
  lances on other frames; the other eight R3 sessions moved by under 400.
* The trace's Heavy-body clause knows the gauges' rows (P2 196-237 in the boss
  sector once drawn; the rest of P2 still checked).

**Tests:** `tests/gauges.test.mjs` 9 of 9 (RED first on the pre-gauge build:
9 of 9 failing); `tests/lance.test.mjs` 32 of 33 (the window-room guard
above); `tests/boss-stress.test.mjs` region 1 with all 16 states.

## 6. Deliverables

Per variant: the full-game ATR and the R1 + R4 route ATRs (SHA-256 prefix in
the name, `build/play/`), a still on R1 and R4 at 100 % meter with the booster
at 2, a 5-s GIF on R1 (the meter 75 % -> ready, then the charge). STOP.

## 7. After the owner's smoke of `5bc8d51` (journal §BL) — design

§BL supersedes §2.3 (the separator), §3 (the PMG gauges) and the beam of
plan `m6-void-lance.md` §6. Built on this branch; STOP for the owner at the
torpedo's look and the charge time.

### 7.1 The HUD (§BL 1-3)

* **The separator goes.** The 6x7 glyphs use all seven rows, so eight lines
  cannot hold a separator, a blank line and the text: every HUD glyph's first
  row is blank instead. The HUD's line: **scanline 240 blank, the text
  241-247**. The flicker is the same line: the last ring row's DLI rewrites
  `COLPF1` / `COLPF2` - the ring's palette and the HUD's share them - right
  at the HUD's first line, and its stores can land after that line has begun;
  with the line blank nothing shows the race. No DLI moves, nothing is added.
* **The 40 cells:**

| cells | 0 | 1 | 2 | 3 | 4-7 | 8 | 9 | 10-13 | 14 | 15-18 | 19-28 | 29-33 | 34 | 35-39 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | `L` | lives | | `H` | hull | | `B` (a booster running) | booster | | lance meter (boss sector) | free (10) | `SCORE` | | score |

* **The meter:** cells 15-18, a hollow and a full glyph (two HUD codes the
  lance run writes into the HUD charset at the fight's first frame: 0 resident
  bytes), lit by the meter's quarters, all four full while a lance is ready;
  one cell a frame toward the wanted count, nothing when it shows it. Blank
  outside the boss sector.
* **Bytes:** byte-neutral resident code - `hud_ascii` grows to its
  `SCORE` at 29 and moves into CODE's 58-B inert pad (its old place padded);
  the booster field is 5 cells (`B` + 4), its backing and the boss entry's
  backup with it.
* **DMA-on target 31,200 -> 31,500** (accounting: the HUD's DMA now inside the
  measured window; the hard gate 32,568 unchanged).
* **Hardware checklist, first item:** the HUD fully visible on the CRT.

### 7.2 The charge (§BL 4, 6)

The axis rule: on the charge's slow frames `read_input` reads the stick from
the lance's own byte, PORTA with UP released - the horizontal at full speed,
the advance at 1 / `LANCE_CHARGE_UP_DIVISOR` (2). The charge's length is
`--lance-charge=50|75` for the comparison (75 the default until the owner
picks).

### 7.3 The torpedo (§BL 5, 7; the owner's answer: P1 hull + P2 exhaust)

* **Fire frame:** the module under the ship is locked (or none: a miss); no
  drawing (the fire frame stays the worst frame's cost).
* **Flight:** the hull in **P1** (the reticle's rows cleared on the first
  flight frame), the exhaust in **P2** right below it, both in the lasers'
  colour, `HPOSP1` and `HPOSP2` set every flight frame to the locked module's
  current centre (the band drifts) - the ship's centre on a miss. The hull
  climbs `TORPEDO_STEP` lines a frame from the ship's top line; the exhaust
  cycles its frames.
* **Arrival:** the locked module alive - the kill through `boss_hit` (the
  frame's only meeting, as the beam's), the meter emptied, the lance spent.
  Destroyed on the way, or a miss - the torpedo flies on to the band's foot
  and vanishes; **the lance is kept** (§BH).
* **The explosion:** from the frame after the kill, `TORPEDO_BLAST_FRAMES`
  frames in P2 over the module, then P2 cleared and `HPOSP2` 0.
* **P1 after it:** cleared with the hull; the reticle's rows drawn again when
  the lance is still ready (a miss), and at the next readiness.
* **The looks:** `--torpedo=<flight><blast>`, `aa` the default: flight a 8
  lines a frame, a 5-row hull, a 3-frame exhaust; b 4 lines a frame, an 8-row
  hull, a 4-frame exhaust with a longer tail; blast a an expanding ring, b a
  burst of sparks, 5 frames each.
* **Room:** the lance run back to <= 6 sectors (the window >= 160 B again).
