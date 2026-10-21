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

* **The meter:** cells 15-18, a hollow and a full glyph (codes 59 / 60, which
  the lance's page 4 run writes into the HUD charset at the fight's first
  frame: 0 resident bytes), lit by the meter's quarters (the k-th at
  ceil(k x frames / 4)), all four full while a lance is ready. The four cells
  are written on the fight's second frame and on a frame whose quarter count
  changes - never otherwise. Blank outside the boss sector.
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

* **Fire frame:** the module under the ship is locked (or none: a miss), the
  discharge sounds, `HPOSP1` 0; no drawing.
* **Flight:** the hull in **P1**, the exhaust in **P2** right below it, both
  in the lasers' colour, `HPOSP1` and `HPOSP2` set every flight frame (and
  only then) to the locked module's current centre (the band drifts) - the
  ship's column at the fire on a miss. The hull climbs `TORPEDO_STEP` lines
  a frame from above the ship's top line; the exhaust shows the next window of
  its table. A step clears only the rows the last frame drew that this one
  does not (min(step, height) rows a plane). The reticle's rows stay in P1,
  now at the torpedo's HPOS - the lock's point - until the hull flies through
  them or the kill clears them.
* **Arrival:** its rows cleared. The locked module alive - the kill through
  `boss_hit` (the frame's only meeting, as the beam's), the meter emptied, the
  lance spent, the reticle's rows cleared. A miss - the torpedo flies to the
  band's foot; the locked module destroyed on the way - it flies on to that
  module's line: nothing is hit, **the lance is kept** (§BH), the reticle's
  rows come back (its HPOS the aim's from the next frame).
* **The explosion:** from the frame after the kill, `TORPEDO_BLAST_FRAMES` (5)
  frames in P2 over the module (its last 8 lines), then its rows cleared and
  `HPOSP2` 0; P1 empty (the lance spent) until the next readiness draws the
  reticle.
* **The looks:** `--torpedo=<flight><blast>`, `aa` the default: flight a 8
  lines a frame, a 5-row hull, a 4-row exhaust over 3 frames; b 4 lines a
  frame, a 6-row hull, a 5-row tail over 4 frames (a strip the flame runs
  down); blast a an expanding ring, b a burst of sparks, 5 frames each.
* **Room:** the lance run back to <= 6 sectors (the window >= 160 B again).

### 7.4 Room: a second run, page 4 (the owner's answer of 2026-10-21)

The torpedo and the HUD meter came to ~1,069 B against the six sectors'
768 (`BLOCKED_LANCE_RUN_BYTES`). The owner chose a **second boss run, slot H:
two sectors (718-719) at page 4, `$0400-$04FF`** - the OS's cassette buffer
and user RAM, which no path of the game uses (no cassette I/O; SIOV's disk
path uses the DCB at `$0300` and its own buffer). It holds the HUD meter,
the reticle's rows, the explosion and the torpedo's shapes. It is read after
the lance run by the banner's reads (six shared runs) and folded into the
head's check like slots C-G: a damaged sector is WRONG DISK before the install
runs (`tests/lance.test.mjs`). Slot A's run table grows 5 B (4 B free). The
trace's `page_4` watch lists the range's writers in every replay and the
window-tail clause refuses any but the start-up writers and the run's read.

Each loop over a plane's rows patches its line into its store (the rows
indexed by X), and the exhaust's window lives in its load's patched low
byte - the flight frame's cost (§8).

## 8. As built and measured (2026-10-21, after §BL)

**Bytes.** The lance run (slot G, `$B900-$BBFF`, 712-717): 742 B of code
(the tick, the aim, the axis rule, the torpedo's flight and arrival, and the
C policy's 153 B) and 17 B of BSS - **759 of 768**, look-independent. Page 4
(slot H, `$0400-$04FF`, 718-719): the HUD meter (its glyphs and quarter
tables), the reticle's rows, the explosion and the shapes - **251 B of 256** (every
look). The window keeps **214 B**. Slot A: 2,044 of
2,048. Resident 0 B, window record 0 B. Entry: 84 / 88 / 88 / 89 sectors (the
lance's 8 with page 4; stage 1b's gauge build 7).

**Boss stress** (`scripts/measure-lance-stress.mjs` and
`tests/boss-stress.test.mjs`, native cycles, worst reachable per state, look
aa, limit 8,500; the tick's own worst in brackets):

| state | R1 Breaker | Citadel L4 | Citadel L5 | Spine L7 | Spine L9 | Bastion L10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| off | — | 7,694 | 8,029 | 7,775 | 8,028 | 8,060 |
| filling (116) | 7,267 | 7,810 | 8,145 | 7,891 | 8,144 | 8,176 |
| install - the glyphs (304) | 7,455 | 7,998 | 8,333 | 8,079 | 8,332 | 8,364 |
| quarter - the four cells (225) | 7,376 | 7,919 | 8,254 | 8,000 | 8,253 | 8,285 |
| draw (335) | 7,499 | 8,017 | 8,352 | 8,098 | 8,351 | 8,415 |
| idle (335) | 7,510 | 8,026 | 8,361 | 8,109 | 8,363 | 8,394 |
| charge (367) | 7,542 | 8,058 | 8,393 | 8,141 | 8,395 | 8,426 |
| swap (408) | 7,583 | 8,055 | 8,419 | 8,182 | 8,436 | **8,467** |
| fire (394) | 7,548 | 8,062 | 8,397 | 8,147 | 8,401 | 8,432 |
| dry (393) | 7,547 | 8,062 | 8,397 | 8,143 | 8,396 | 8,428 |
| **fly - the torpedo in flight** (394) | 7,544 | 8,087 | 8,422 | 8,168 | 8,421 | **8,453** |
| kill (2,445-2,753) | 7,300 | 7,822 | 8,181 | 7,947 | 8,099 | 7,732 |
| miss (353) | 7,504 | 8,047 | 8,382 | 8,128 | 8,381 | 8,413 |
| lost (393) | 7,544 | 8,087 | 8,422 | 8,168 | 8,421 | 8,453 |
| blast (223) | 7,374 | 7,917 | 8,252 | 7,998 | 8,251 | 8,283 |
| blastEnd (157) | 7,308 | 7,851 | 8,186 | 7,932 | 8,185 | 8,217 |

Every state <= 8,500 in every region; the Bastion's headroom **33** (>= 20);
its torpedo in flight **8,453** - 47 under the gate, **3 over the 8,450 plan
reserve** (§6 of `m6-void-lance.md`). The Bastion fixture (the lance fired on
its worst frame) 8,432. What bought it: each row loop patches its line into its
store (X-indexed rows, 14 cycles a row against 18-22), a step clears only the
rows the last frame drew and this one does not, the arrival frame skips the
homing, the meter's glyph copy and its cells are two frames.

**Look b** (flight b: 4 lines a frame, a 6-row hull, a 5-row tail over 4
frames - its first draft's 8 + 7 rows MEASURED 8,496 on the Citadel L5 and
would have put the Bastion over 8,500), `VS65_HARNESS_BUILD=torpedo-bb`:

| state | Citadel L4 | Citadel L5 | Spine L7 | Spine L9 | Bastion L10 |
| --- | ---: | ---: | ---: | ---: | ---: |
| fly (412) | 8,105 | 8,440 | 8,186 | 8,439 | **8,471** |
| kill | 7,842 | 8,201 | 7,947 | 8,099 | 7,732 |
| miss (373) | 8,067 | 8,402 | 8,148 | 8,401 | 8,433 |
| lost (413) | 8,107 | 8,442 | 8,188 | 8,441 | **8,473** |
| blast / blastEnd | 7,917 / 7,851 | 8,252 / 8,186 | 7,998 / 7,932 | 8,251 / 8,185 | 8,283 / 8,217 |

The explosions a and b are the same size (8 rows, 5 frames): the same cost.
The Bastion's headroom with flight b is **27**; every other state is the
look-independent code of the table above.

**Routes** (Atari800, the candidate, look aa, charge 75; 35 focused sessions
plus the scripted miss-and-kill sessions): 0 misses, 0 clause failures. Entry
host frames R1 **325**, Citadel **340**, Spine **340**, Bastion **344** (the
owner's limit 350). Worst fence margin / DMA-on max per route: R1 8,485 /
30,084; Citadel 6,167 / 30,556; Spine 6,865 / 30,729; Bastion 5,691 / 30,211.

**The default trace** (58 replays, the candidate, look aa): 0 misses, 0
clause failures; worst fence margin **1,497** (`2-sweep-fire6`); DMA-on
maximum **31,476** (`2-evasive-fire7`), 0 replays over the 31,500 target;
physical headroom 4,092. Its one RESET replay (`slot-e-reset-2-sweep-fire0`)
shows the OS's RAM clear writing page 4 again after RESET (a cold start): the
page 4 clause counts OS-ROM writers as start-up.

**Page 4 watch:** every replay of the four routes (and the look captures)
lists the same writers - the OS's RAM clear at boot (`$C2E6`, `$C2F0`), the
sector reader's read of the run (`$A262`) and the reticle's patched store in
page 4 (`$0450`). Kills, explosions and misses happened in all four regions.

**Readability next to the Breaker's beam:** `media/sheet-beside-beam-*.png`
(R1, the lasers armed by a poke so a beam fires during the kill's flight):
the torpedo is a separate shape beside the beam in all four looks, in the
beam's own colour.

## 9. After the owner's smoke of `e76ddee` (journal §BL, the same day)

No pick yet (the torpedo was not visible enough). Four changes:

**1. The flight: one line a frame, the lock kept.** Both looks fly
`TORPEDO_STEP` 1 line a frame (the looks differ in shape only). The ship
advances 1 line a frame, half that while charging (§BL 4), so a charge started
on the ship's lowest line (225) launches from ~188: ~120-130 lines to a module,
**~2.5 s** - MEASURED with the lance bot (`boss-aim-lance-1`, the meter filled
early): R1 129-131 frames (2.6 s), the 50-frame charge 144 (2.9 s), R4 113
(2.3 s). The extremes, per region (frames from the launch to the kill; the
module bottoms 48-72): from the lowest line the longest 144-168 (2.9-3.4 s),
from the boss floor (line 88, right under the band) the shortest 7-31
(0.1-0.6 s) - Breaker 15-168, Bastion 15-160, Spine 7-160, Citadel 15-168. The
lock is the module under the reticle at the fire frame; the torpedo homes on
it as the band drifts. **Retargeting** (the lock destroyed on the way -> the
column's next eligible module) **did not fit** the lance run (~50 B with its C
rule, the run 9 B free after everything else): the current rule stays - the
torpedo flies on to its line and hits nothing, the lance kept (§BH). **The
reticle is off for the whole flight**: the fire frame clears the six rows
either mark draws (unrolled, ~36 cycles); it comes back as before (a miss: at
once; a kill: at the next readiness).

**2. The ordinary fire after the launch (the owner's decision).** A
countdown of 50 frames from the launch, in the tick (before `read_input`):
`gameplay_fire_gate` shut on each frame, open on the last - a held FIRE fires
again from the 50th frame, while the torpedo flies. Nothing else of the
ordinary fire changes (`tests/lance.test.mjs`, `tests/torpedo.test.mjs`).

**3. The bar over the HUD - the cause (MEASURED).** The trace logged every
colour/CHBASE/WSYNC store on lines 236-244 (`DFTRACE_HUD_STORES`) and every
instruction of lines 238-240 on chosen frames: the boss DLI enters through the
OS's NMI dispatch at line 239 cycle ~60 (line 239's DMA halves the CPU), and
its old phase order put the HUD phase's WSYNC write just at the line's WSYNC
point - on **57% of frames** (R1 1,424 of 2,500, R4 874 of 1,500) it missed,
the CPU waited to line 240's end, and line 240 - the HUD's blank first row -
was drawn with the ring's COLPF2 (mint, `(159,240,195)`): the bar, frame by
frame matching the late WSYNCs. **Fix:** `boss_dli` tests the HUD phase before
phase 1's code, and its first store after the WSYNC is COLPF2 (preloaded):
the background lands in the horizontal blank, before line 240's character
fetches stall the CPU (measured: the store after a jump landed at line 240
cycle 103). Bar frames after: **0 of 2,500 (R1) and 0 of 1,500 (R4)**. Cost: 0
DMA, +0 frame cycles (the DLI's work only reordered); slot A 2,038 of 2,048
(`boss_cell_at` moved to the lance run for the bytes). Not the bar: the boss's
falling capsule (P3) still crosses the HUD's lines (9-10 frames a fall) - an
option, not built: PRIOR's playfield-over-players on the HUD line (~10 B of
slot A in the boss sector, the same again in main for the space sectors'
pickups).

**4. The meter's T.** The boss install writes `T` at cell 15; the meter is
cells 16-19 (`HUD_LANCE_LABEL_OFFSET`, `HUD_LANCE_METER_OFFSET`); cells 20-28
free.

**Room.** The lance's state moved to the zero page's unclaimed tail
(`$B6-$C2`, `LANCE_ZP`: every access a byte shorter; MEASURED written by
nothing but the OS's RAM clear at boot and RESET - the `zero_page_b6` watch,
all routes and the default trace; the boss install clears it at every entry).
Lance run 756 of 768 B (window room 214 B), page 4 239 of 256 B, slot A 2,038
of 2,048, the boss install 380 of 384.

**Boss stress** (look aa; native cycles, worst reachable; the torpedo states
with the case's own shots meeting the boss - the ordinary fire back - and the
lasers' modes; the fire's hold running):

| state | R1 | Citadel L4 | Citadel L5 | Spine L7 | Spine L9 | Bastion L10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| filling | 7,268 | 7,812 | 8,147 | 7,889 | 8,143 | 8,176 |
| install | 7,456 | 8,000 | 8,335 | 8,077 | 8,331 | 8,364 |
| quarter | 7,371 | 7,915 | 8,250 | 7,992 | 8,246 | 8,279 |
| draw | 7,493 | 8,014 | 8,349 | 8,091 | 8,345 | 8,410 |
| idle | 7,506 | 8,024 | 8,359 | 8,104 | 8,359 | 8,391 |
| charge | 7,537 | 8,055 | 8,390 | 8,135 | 8,390 | 8,422 |
| swap | 7,575 | 8,050 | 8,413 | 8,173 | 8,428 | 8,460 |
| **fire** | 7,580 | 8,097 | 8,432 | 8,178 | 8,433 | **8,465** |
| dry | 7,579 | 8,097 | 8,432 | 8,174 | 8,428 | 8,461 |
| **fly** | 7,483 | 8,027 | 8,362 | 8,104 | 8,358 | **8,391** |
| kill | 7,316 | 7,838 | 8,187 | 7,960 | 8,113 | 7,747 |
| miss | 7,514 | 8,058 | 8,393 | 8,135 | 8,389 | 8,422 |
| lost | 7,552 | 8,096 | 8,431 | 8,173 | 8,427 | 8,460 |
| blast | 7,389 | 7,933 | 8,268 | 8,010 | 8,264 | 8,297 |
| blastEnd | 7,323 | 7,867 | 8,202 | 7,944 | 8,198 | 8,231 |

Look b (its flight states differ): fly 8,055 / 8,390 / 8,132 / 8,386 /
**8,419**; lost 8,116 / 8,451 / 8,193 / 8,447 / **8,480** (Citadel L4 / L5,
Spine L7 / L9, Bastion). Every state <= 8,500; the Bastion's headroom **35**
(look a; look b's lost frame **20**). The Bastion fixture (the lance fired on
its worst frame) 8,465.

**Routes** (35 focused sessions plus the scripted ones): 0 misses; the only
clause failures the three scripted sessions on R2-R4 that never shoot (they
never reach the chain). Entry host frames R1 **325**, Citadel **340**, Spine
**340**, Bastion **344** (limit 350).

**The default trace** (58 replays, the candidate, look aa): 0 misses, 0
clause failures, 0 foreign writers in the window tail, page 4 and the zero
page; worst fence margin **1,497** (`2-sweep-fire6`); DMA-on maximum
**31,476** (`2-evasive-fire7`), 0 replays over the 31,500 target.
