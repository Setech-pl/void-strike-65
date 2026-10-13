# Plan — Blockade Breaker's twin laser cannons (feat/boss-r1-twin-lasers)

Status: **Phase B implemented — `OWNER-SMOKE CANDIDATE`** (2026-10-13, §10).
Layout L2, rule (B) (a) (§9.1) and the one-row belt l2b1 (§10.1) chosen.
Owner decision in force (variant A): region 1's boss gets two laser cannons
that fire **alternately** — at most one boss beam on screen at a time, so the
one-laser rule for levels 1–4 (decision AC) stands; the survivor keeps firing
alone at the same cadence.

## 0. Recommendation first

**Layout L2 — the pair symmetric about the centre (columns 21–23 and 41–43),
gun-1 into the central slot.** It is the only layout with a real left/right
rhythm (the beams 20 columns, 80 colour clocks, apart; L1's are 10 apart,
centre and right). Its MEDIUM fight measures **123.5 s**, over the 120 s
ceiling: Phase B trims it by data (plate and cannon hit points), as every
fight since `boss-r1-tuning` has been tuned. Everything else is inside its
limit in both layouts: no resident byte, slot F's look tail unchanged at
110 B, the boss entry 253 host frames (limit 280), stress 7,391 (reachable
limit 8,500), the left-edge guard holding.

## 1. Step 0

| | |
| --- | --- |
| main | `7b84d89` (the S5-3 merge: Siege Spine in region 3, journal §AO), clean, one worktree |
| ATR / boot (dist/) | `e079093ef92bafd5…` / `508991fa90de54a6…` |
| branch | `feat/boss-r1-twin-lasers` |

## 2. Audit (file:line at `7b84d89`)

* **R1's laser today.** One emitter module, `emitter` (columns 31–33,
  rows 1–3, 20 HP, behind plate-d, slot 1;
  `assets/graphics/boss-regions/region-1/modules.json`). Its laser is slot D's
  (`src/hybrid/boss.s`): the beam is missile M1 or M2 in `$46`, taken per
  firing (`b2_take`, :2255); a warning of the level's
  `bossDef.laserWarning` (MEDIUM 32 frames: the lens heats, the line widens
  1 → 2 → 4 clocks, a rising tone), then `laser.beamFrames` 50, then the
  level's `laserReload` (`laser_off`, :2595). An emitter is never in the pulse
  rotation (decision D1). A covered emitter has a shield; the first time it is
  exposed it fires at once (S4b.4, `laser_first_shot`, :2177).
* **Slots per tier.** `laser_tier` (:1760) sets 1 / 2 / 4 enabled slots on
  levels 1–4 / 5–8 / 9–12 (decision 8); the controller turns an emitter whose
  slot exceeds it into capped armour (`src/c/boss.c:257`, :281).
  `laser_prepare` (:1782) maps slot k to laser k − 1 (:1834).
* **Which emitters fire on tiers 2 / 4.** Each enabled laser counts its own
  reload (`laser_rearm`, :1910); `laser_admit` (:1950) starts ready lasers
  from a rotating cursor, at most `LASER_MAX_ON` = 2 at once (:1749, D3).
  Shipped today only region 3 has more than one emitter; regions 2 and 4 are
  copies of region 1 (one emitter).
* **Escort start.** A weapon kill is any non-armour kill, emitters included
  (`src/c/boss.c:393` → `director_c_boss_weapon_down`; table byte 17,
  `scripts/boss-assets.mjs:133`). **A laser cannon's kill starts the escort**
  — as the brief assumed.
* **Rule (B) in the repo** (`src/c/boss.c:497`) holds back a **gun's** shot on
  a module-kill frame. Lasers are outside it: `laser_admit` runs in
  `laser_frame` before the player's shots meet the band, and a beam starts a
  fixed warning after its admission. **A disagreement with the brief** ("no gun
  or cannon fires…"): owner question Q2.
* **Verdict: "alternate between two live emitters on tier 1" is data plus a
  small overlay change, not more.** Data: slot 1 holds both cannons. Code:
  slot D's laser code (no resident byte), measured below.

## 3. The design (both layouts)

* **Data:** the twin cannons are two emitters **in slot 1** — one laser's
  worth, fired from them in turn. The converter allows slot 1 twice (the
  second takes slot 2's laser, so a twin region has no slot-2 emitter), draws
  `emitter.png` at both footprints (same size) and reports `twin` in the
  manifest. Decision 8 is untouched: tier 1 still enables slot 1, and
  `boss_laser_slots` stays 1 / 2 / 4.
* **Slot D / E (`BOSS_TWIN`, set by the build when a region on the disk has
  twins):** `laser_twin_on` — a twin is never admitted while the other is in
  its warning or beam (so never two boss beams in region 1, at any tier);
  `laser_twin_off` — when a twin's firing ends (or its kill cuts it) the
  other's reload restarts and it is next in the waiting order, so the turns
  alternate at the one cannon's cadence (warning + beam + reload ≈ 307 frames
  on MEDIUM). A shield's first shot keeps its S4b.4 priority; a kill while
  waiting leaves the other's count alone. The warning heats **the firing
  cannon's own lens** (each laser has its own cell), so the player sees which
  one is about to fire.
* **Homes:** slot D's RAM had 49 B free, so `laser_admit` (97 B) and the twin's
  checks (33 B) move to slot E; `laser_twin_off` (51 B) stays in slot D.
* **Laser fixture (debug):** keeps one emitter per slot; a twin partner stays
  as hull art.
* **Regions 2 and 4** (copies of region 1 until S5-5 / S5-4) carry the twins:
  level 4 (tier 1) and levels 5–6, 10–12 alternate the same way; their entry
  measured below.

## 4. The layouts (`scripts/boss-r1-twin-variants.mjs`, `--boss-variant=l1|l2`)

| | L1 — centre + right | L2 — symmetric pair |
| --- | --- | --- |
| cannons | `emitter` 31–33 (behind plate-d), `emitter-r` 41–43 (behind plate-f) | `emitter-l` 21–23 (behind plate-c), `emitter-r` 41–43 (behind plate-f) |
| other moves | none; hull art under column 43 row 4 cut (decision O) | gun-1 22–24 → 31–33 (behind plate-d, with its recess); column 24 joins the open bay |
| beams apart | 10 columns (40 clocks), centre and right | 20 columns (80 clocks), left and right |
| R1 band vs banner | the banner's central tower stays; a second tower on the right | the central tower becomes gun-1; two towers flank it — the banner task must redraw |
| charset | 121 of 128 codes (main 122) | 121 of 128 |

Previews: `build/play/twin-l1-band-preview.png`, `twin-l2-band-preview.png`
(every damage stage); `twin-l1-stages.png`, `twin-l2-stages.png` (intact,
cracked, broken — normal and flashed: each cannon's lens keeps its amber PF2
pixels in every stage and darkens when flashed, as today's emitter).

## 5. Measurements

Labels: **M** emulator trace (Atari800, focused runs on debug routes);
**M-N** native harness; **R** the aiming bot's ratio rule (seconds =
plain[d] × aim frames / aimMain[d] / 50, plain 3,834 / 4,612 / 5,964, aimMain
1,847 / 2,231 / 2,663). The `level-1-s0` route reproduces `director-complete`
exactly (main's 1,985 / 2,619 / 3,359 frames, as in the evidence).

| | main (this tree, no twin = `7b84d89`) | L1 | L2 | label |
| --- | ---: | ---: | ---: | --- |
| fight E / M / H, frames | 1,985 / 2,619 / 3,359 | 2,253 / 2,863 / 3,815 | 2,342 / 2,988 / 3,553 | M |
| fight E / M / H, s | 82.4 / 108.3 / 150.5 | **93.5 / 118.4 / 170.9** | **97.2 / 123.5 / 159.1** | R |
| laser firings E / M / H | 2 / 2 / 3 | 3 / 4 / 6 | 3 / 5 / 8 | M |
| frames with two boss beams | 0 | **0** | **0** | M |
| escorts E / M / H (first) | 9 / 12 / 17 (10.0 / 12.8 / 3.0 s) | 12 / 15 / 20 (6.1 / 7.9 / 3.0 s) | 12 / 15 / 19 (6.1 / 7.9 / 3.0 s) | M |
| hits on the bot E / M / H (laser) | 3 (1) / 3 (0) / 6 (1) | 2 (0) / 6 (1) / 7 (1) | 1 (1) / 4 (0) / 7 (2) | M |
| boss frames worst margin / DMA-on (E, M, H) | 10,135 / 29,854; 9,595 / 29,266; **8,558 / 29,932** | 9,560 / 29,651; 8,829 / 29,928; **7,516** / 29,887 | 9,607 / 29,460; 8,829 / 29,432; **6,761** / 29,641 | M |
| left edge (`boss-park-left-1`, s6 route, 4,000 frames parked at x 48) | 17 escorts, 15 hits | 17, 15 | 17, 15 (+8 laser firings out of reach) | M (proxy for `boss-edge-left-1`, a default session) |
| boss entry R1 / R2 / R4, host frames | 249 / 249 / 249 | 253 / 253 / 253 | 253 / 253 / 253 | M |
| boss entry R3 | 253 | — | 256 | M |
| entry sectors R1, R2, R4 / R3 | 65 / 66 | 66 / 67 | 66 / 67 | manifest |
| stress R1, worst reachable | 7,019 | 7,382 | 7,391 | M-N |
| stress tier-4 fixture (warn / beam) | 8,018 / 7,049 | 8,044 / 7,066 | 8,067 / 7,206 | M-N |
| stress regions 2–4 finale / fixture finale | 6,611 / 7,381 | 6,967 / 7,407 | 6,965 / 7,430 | M-N |
| stress R3 level 7 / level 9 | 7,782 / 8,007 | — | 7,810 / 8,063 | M-N |
| rule (B) clashes (kill + gun spawn) | 0 | 0 | 0 | M-N |
| slot D code / RAM free / sectors | 1,655 / 49 / 13 | 1,630 / 74 / 13 | 1,630 / 74 / 13 | manifest |
| slot E code / RAM free / sectors | 366 / 195 / 3 | 496 / 64 / **4** | 496 / 64 / **4** | manifest |
| slot F R1 block (look tail, limit 110) | 110 | 110 | 110 | manifest |
| window, Light kernel, slot A, initial block | 1,322 / 847 / 2,047 / 13,623 B | unchanged (the kernel's disk-guard sums change value, not length) | unchanged | manifest |

The repeated starts in a fight's laser order (e.g. L1 MEDIUM: right, right,
centre, centre) are one cannon firing alone while the other is still shielded
or already dead: confirmed on the harness — with plate-d standing the right
cannon fires every 307 frames; plate-d's kill gives the centre its first shot
at once, then strict alternation, 307 frames apart (M-N).

Not measured in Phase A: `lower-playfield-laser-contact-atr-hard` and
`boss-edge-left-1` are default-build sessions (a debug route cannot run
them); Phase B's regeneration runs both. The worst fence margin (1,260) and
the DMA-on maximum (31,483) are not boss frames and no resident code changed.

The brief's baseline agrees with STATUS, the committed evidence and this
tree; no figure disagrees.

## 6. Review builds (`build/play/`)

`atari800 -xl -pal -nobasic <path>`:

| build | SHA-256 prefix |
| --- | --- |
| `twin-l1-full-game.atr` | `61fbaac412d9303a` |
| `twin-l1-r1-boss-route.atr` (straight into R1's boss) | `b7185c60bc97f422` |
| `twin-l2-full-game.atr` | `bab744168c53929b` |
| `twin-l2-r1-boss-route.atr` | `88d3bf32a64bfd96` |
| `twin-main-r1-boss-route.atr` (today's boss, for comparison) | `3ecbeab2cb585780` |

## 7. Owner questions (recommendation first)

1. **Layout:** **L2** (recommended: the left/right rhythm; MEDIUM trimmed by
   data in Phase B) or L1 (cheaper look change, MEDIUM 118.4 s as is, but
   centre/right).
2. **Rule (B) and the lasers:** (a) **keep the repo's rule** — no gun shot on
   a module-kill frame; a laser's warning may begin on one (none did in nine
   measured fights; the beam itself follows 0.64 s later) — recommended, 0 B;
   or (b) extend it: no laser warning starts on a kill frame (it waits a
   frame; about 10 B in slot E, a test).
3. **Fight length after the trim:** aim MEDIUM at about 110 s (inside
   90–120, EASY shorter, HARD not shorter), by plate hit points first.

## 8. Phase B (after the choice)

Tests first (RED on main's build): two cannons in R1; never two boss beams
on levels 1–3; strict alternation while both live and exposed; the survivor
alone at the same cadence; each cannon's stages, PF2 pixels and b3 flash;
rule (B) as decided; the escort starting at the first weapon kill. Then the
chosen layout into `assets/`, the other removed, `BOSS_TWIN` always on, the
fight tuned, the evidence regenerated, the documents, and the banner note.

## 9. Phase A-2 — the R1 band rework (owner smoke of 2026-10-13)

### 9.1 The owner's answers to §7

1. **Layout L2** (left + right, columns 21–23 and 41–43, gun-1 in the
   central slot).
2. **Rule (B): (a)** — the repo's rule stands: only a gun's shot is held back
   on a module-kill frame; a laser's warning may begin on one. (Recorded in
   the decision record at Phase B.)
3. **Fight length:** MEDIUM about 110 s, EASY shorter, HARD not shorter —
   tuned by plate hit points after the band rework.

**New finding (screenshots):** the plates hang under the modules like crates,
and once they fall the boss reads as separate floating pieces. Asked for, in
this task: a continuous indestructible spine along the band's top, every
weapon visibly hung from it, the gaps filled with hull where the layout
allows (echoing the banner's continuous deck); the plates an armour belt, in
two heights for comparison.

### 9.2 The rework (`scripts/boss-r1-twin-variants.mjs`, `--boss-variant=l2b3|l2b1`)

* **Spine:** band row 0, columns 7–56 (engine to engine), lines 1–4 — a grey
  edge, burgundy hull with a steel rivet, a grey edge — drawn on the
  background only, so the blocks' tops and the antennas sit on it. Hull: it
  stops shots (a deflection), never takes damage.
* **Struts:** a two-pixel grey strut from the spine to each weapon's top at
  its centre column (gun-2 and gun-4, which start at row 2, hang by one).
* **Truss:** an X-brace in burgundy in every empty cell of rows 1–2 between
  the engines that no module owns; row 2 only where neither side is a
  weapon's cell (decision N's clear columns beside gun-2), never under a
  weapon (decision O). Most cells there already hold machinery, so it filled
  two (columns 24 and 30, row 1).
* **Plate belt:** every plate's top moves to row 4 (b, e from 3; g from 5) —
  one line across the boss. **l2b3:** three rows (4–6; the plate's top row,
  its next row and its bottom row with the amber rim). **l2b1:** one row (4;
  the top row's lines 0–4 over the bottom row's rim, lines 5–7). The same
  mapping in the band, open, cracked and broken looks; hit points unchanged.
  Every plate still covers its weapons' columns (the converter's checks pass:
  covers, fire columns, decision O).

Previews (`build/play/`): `twin-l2b3-band-preview.png`,
`twin-l2b1-band-preview.png` (every stage);
`twin-l2b3-plates-gone.png`, `twin-l2b1-plates-gone.png` (intact; every plate
gone, weapons open; every module gone); `twin-l2b3-stages.png`,
`twin-l2b1-stages.png` (intact / cracked / broken, normal and flashed — every
stage keeps amber PF2 pixels and darkens when flashed).

### 9.3 Measurements

Labels as §5. L2 (no rework) repeated for reference.

| | L2 | **l2b3** (belt 3 rows) | **l2b1** (belt 1 row) | label |
| --- | ---: | ---: | ---: | --- |
| fight E / M / H, frames | 2,342 / 2,988 / 3,553 | 2,241 / 2,997 / 3,872 | 2,262 / 3,201 / 3,611 | M |
| fight E / M / H, s | 97.2 / 123.5 / 159.1 | **93.0 / 123.9 / 173.4** | **93.9 / 132.3 / 161.7** | R |
| frames with two boss beams | 0 | 0 | 0 | M |
| laser order (M) | 1 1 0 0 0 | 1 1 0 0 | 1 1 0 0 | M |
| escorts E / M / H (first) | 12 / 15 / 19 (6.1 / 7.9 / 3.0 s) | 11 / 14 / 20 (8.6 / 12.6 / 3.0 s) | 11 / 16 / 19 (8.8 / 12.0 / 3.0 s) | M |
| hits on the bot E / M / H (laser) | 1 (1) / 4 (0) / 7 (2) | 0 / 7 (2) / 8 (1) | 1 (0) / 8 (0) / 8 (2) | M |
| boss frames worst margin / DMA-on | 6,761 / 29,641 | 7,657 / 30,035 | 7,755 / 29,753 | M |
| left edge (`boss-park-left-1`) | 17 escorts, 15 hits | 17, 15 | 17, 15 | M (proxy) |
| boss entry R1 / R2 / R4, host frames | 253 / 253 / 253 | 253 / 253 / 253 | **249 / 249 / 249** | M |
| entry sectors R1, R2, R4 / R3 | 66 / 67 | 66 / 67 | **65** / 67 | manifest |
| charset codes (of 128) | 121 | **126** | **105** | converter |
| charset run | 968 B, 8 sectors | 1,008 B, 8 sectors | 840 B, 7 sectors | converter |
| slot F R1 block (look tail, limit 110) | 110 | 110 | 110 | converter |
| stress R1, worst reachable | 7,391 | 7,272 | 7,272 | M-N |
| stress tier-4 fixture (warn / beam) | 8,067 / 7,206 | 8,053 / 7,216 | 8,053 / 7,216 | M-N |
| stress regions 2–4 finale / fixture finale | 6,965 / 7,430 | 6,976 / 7,456 | 6,976 / 7,456 | M-N |
| rule (B) clashes | 0 | 0 | 0 | M-N |
| slot D / slot E | 1,630 B, 13 / 496 B, 4 | same | same | manifest |
| resident bytes | 0 | 0 | 0 | manifest |

**What the spine costs.** Five plain codes (the spine merged into the row-0
cells it crosses, its plain run, the truss, the struts); the plate belt saves
codes as it shrinks — l2b1's one row frees 7 staged triples (K 19 → 12).
l2b3 leaves 2 codes free; l2b1 23.

**Laser reach (M).** The cannons' lens rows are unchanged (rows 1–3), so the
beams leave the lens core (M1 / M2, unchanged code) and run to the ring's last
line as before: the bot took laser hits in both builds, and the screenshots
`build/play/twin-l2b1-shot-host4987.png` (right cannon) and `…-host6127.png`
(left cannon) show the beam from the cannon's tip to the bottom of the
playfield (the trace's 256 x 192 crop starts below the band's top rows, so
the spine shows in the previews, not these).

The fights are all over 120 s on MEDIUM; Phase B trims plate hit points to
about 110 s (owner answer 3), l2b1 by more (132.3 s) than l2b3 (123.9 s).

### 9.4 Review builds (`build/play/`, `atari800 -xl -pal -nobasic <path>`)

| build | SHA-256 prefix |
| --- | --- |
| `twin-l2b3-full-game.atr` | `eb774fd4340f63f7` |
| `twin-l2b3-r1-boss-route.atr` | `5e26b601934f67ae` |
| `twin-l2b1-full-game.atr` | `105f56e5eb445c86` |
| `twin-l2b1-r1-boss-route.atr` | `8bdb8be6070017fb` |

### 9.5 Owner question

**Plate height: l2b1, the one-row belt (recommended)** — it reads as a belt
along the boss's underside, not boxes; it frees 21 codes (105 of 128) and a
charset sector (the entry back to 249 host frames); its MEDIUM needs the
larger trim (132 → ~110 s). Or **l2b3**, three rows — closer to today's
plates, 126 of 128 codes (2 left for later changes), MEDIUM 124 → ~110 s.

## 10. Phase B — as built (2026-10-13)

### 10.1 The owner's answers to §9.5

1. **l2b1** — the one-row armour belt, with the spine, struts and gap fill as
   built; l2b3 out of the shipped build (the variant script is removed; the
   layout is written into `assets/graphics/boss-regions/region-1/`).
2. **New smoke finding (l2b1):** projectiles turn **grey** as they approach
   the boss, in the rows just under the belt, and have their normal colour
   further down.

### 10.2 The grey projectiles — diagnosis

* **Cause (file:line at `b7ccf87`).** The install built the band's display
  list with all 8 band rows (`src/hybrid/boss.s:3155-3177`: `cpy
  #(BOSS_BAND_ROWS - 1)` at `:3162`, the band's DLI on row 7, the ring from
  `RING_FIRST_VISIBLE` = 8 at `:3177`). Rows 5-7 under the one-row belt are blank, but
  they are band rows: the band's charset at `$0C00` and the band's palette
  (the band DLI's phase 0, `:356-376`, until phase 1 on row 7's last line,
  `:377-404`). The boss draws the shots there in its own codes:
  * **player shots** - `boss_shots_late` (`:2175-2257`) writes the in-band
    shot codes, whose pixels the converter keeps in COLPF0 only
    (`scripts/boss-assets.mjs:1131` at HEAD, `row & 0x55`): `$0A` light grey against
    the playfield's `$AE`;
  * **boss gun shells and an escort Interceptor's laser** - the same hostile
    pool, every active slot above the band's edge (`laser_hostile_shots`,
    `:2853-2929`) in the pool's PULSE glyph: `$0A` / `$06` against the
    playfield's `$0E` / `$88` (and the shell rode the band's drift there);
  * **escorts and debris** are drawn in the ring, whose rows 0-7 the band hid:
    they were invisible there, not grey.
* **Real frames (M, Atari800, l2b1 route, MEDIUM, hosts 4,850-5,300).**
  `build/play/twin-l2b1-under-belt-before-after.png`: rows 1-2 a boss shell
  crossing lines 64-88 (before: `$0A` / `$06`; after: `$0E` / `$88`), rows
  3-4 a player shot (before `$0A`; after `$AE`). Counted over the 451 frames
  of the image rows 32-55 (lines 64-87): before, every projectile pixel there
  `$0A` or `$06`; after, `$AE`, `$88` and `$0E` (the beams' missile pixels and
  the seam line below aside).
* **The seam line (pre-existing).** The band DLI's phase 1 writes CHBASE,
  then COLPF0-3 after `WSYNC`; on the first line under the band (a mode-4
  bad line) COLPF1 and COLPF2 land after the line has begun. The first line
  under the band shows a projectile's COLPF2 pixels (`$28`, 45 frames) and
  COLPF1 pixels (`$06`, 2 frames) in the band's colours - **as main does on
  line 88** (`$28` 42 frames, `$06` 5, `$32` 1, the same capture). Not
  changed: a test pins phase 1's order (`tests/boss-engine.test.mjs:172-180`,
  the charset first, COLPF3 last); writing COLPF2 second would fix the
  player shot's top pixel there at 0 B (an option for the owner).
* **Region 3** keeps 8 band rows: its field is row 7. Its row 6 (between the
  hull and the field) and the field's gaps are inside the boss; a shell
  crossing them shows `$66` / `$0C` (36 of 601 frames on `region-3-dodge-2`)
  - not fixable by the list, and the fallback cannot match: region 3's band
  palette (`$0C $66 $28 $04`) has neither `$AE` nor `$88`.

### 10.3 The fix — the band list ends under its last row with a cell

* `boss_band_measure` (slot D, 31 B, once from the install): the band's last
  row holding a cell (row 0 when none). The install builds the band rows down
  to it, the band's DLI on it, the ring's rows under it (`RING_FIRST_VISIBLE`
  gone), and patches four operands: `boss_apply_pos`'s row count
  (`boss_band_last_operand`, slot A, 0 B), the hostile shots' edge
  (`boss_hostile_bottom_operand`, slot D), the late PairShot draw's edge
  (`boss_late_bottom_operand`, slot E) and the capsule's first line
  (`boss_capsule_y_operand`, slot E). Install +12 B (374 of 384).
* `scripts/boss-assets.mjs`: `bossBandShownRows`; a module or the field below
  the shown rows is refused; the manifest records `boss.regions[].bandShownRows`
  (5 / 5 / 8 / 5).

**What moves.**

| | before | after | label |
| --- | --- | --- | --- |
| band rows shown, R1 / R2 / R4 | 8 (lines 24-87) | **5** (lines 24-63) | M |
| band rows shown, R3 | 8 | 8 | M |
| the band DLI's phase 1 (charset, palette, HSCROL / LMS) | row 7's last line (87) | row 4's (63) in R1/R2/R4 | M |
| ring rows shown | 19 (8-26) | 22 (5-26) | M |
| collision: the shots' meeting test, the player's top (`BAND_BOTTOM_Y`) | 88 | 88 (unchanged) | source |
| boss shells ride the drift / are drawn in the band down to | 88 | the shown edge, 64 | M |
| the capsule's first line | 88 | the shown edge, 64 | test |
| laser start rows (the lens core, M1 / M2) | rows 1-3 | unchanged | source |
| boss frames worst margin / DMA-on (director-complete) | 8,558 / 29,932 | **9,219 / 29,902** | M |
| replays / clauses on those rows | - | `lower-playfield-laser-contact-atr-hard`'s park moved (§10.6); every clause unchanged | M |

The fallback (band glyphs in the playfield's colours) was not needed; it
could not match exactly anyway (the band's four colours are the region's).

### 10.4 Region 1's data

* L2 + l2b1 written into the assets; the layout notes carry the twins, the
  spine, the belt.
* **plate-f widened to columns 41-43, plate-g 44-48** (the belt's art moved by
  one cell): emitter-r had plate-f in front of 41-42 and plate-g of 43, and an
  explicit cover of plate-f alone - decision N's rule (a weapon's cover is
  what stands in front of each of its columns) failed
  (`tests/boss-readability.test.mjs` "every cannon's cover is exactly…",
  `tests/boss-cover-rule.test.mjs` "once its cover falls…"). Now one plate
  covers the cannon, as plate-c covers emitter-l.
* **The fight trimmed by plate hit points** (owner answer 3):

  | plate | a | b | c | d | e | f | g | h |
  | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
  | before | 12 | 12 | 12 | 16 | 16 | 8 | 12 | 12 |
  | after | **8** | **8** | **8** | **10** | **10** | **6** | **8** | **8** |

  MEASURED (the aiming bot's ratio; trials on the s0 route, then the
  evidence's director-complete replays, frame for frame the same):
  before 114.2 / 117.7 / 174.2 s, trial t1 (each plate -4, f 4) 92.3 / 115.4 /
  148.8 s, **after 89.1 / 108.7 / 154.0 s** (EASY / MEDIUM / HARD).
* The laser fixture (`bossLaserFixtureDraft`): its slot-1 emitter is region
  1's emitter-l, named "emitter"; plate-c removed with plate-d and plate-e, so
  every fixture emitter is exposed from the first frame as before.

### 10.5 Tests

**New: `tests/boss-r1-twin-lasers.test.mjs` (14)** - the twin probes made
tests (the other scratch probes deleted):

| test | `b7ccf87` data + code | new data, old `boss.s` | here |
| --- | --- | --- | --- |
| two cannons in slot 1, each behind its own plate | RED | GREEN | GREEN |
| the spine: row 0 hull 7-56, no module in it | RED | GREEN | GREEN |
| the one-row belt covers every covered weapon's columns | RED | GREEN | GREEN |
| levels 1, 2, 3: never together, strict turns, the survivor alone (3) | RED | GREEN | GREEN |
| every spine column absorbs a shot; the spine stands | GREEN | GREEN | GREEN |
| rule (B) (a): a warning due on a kill frame starts on it | RED (no emitter-r) | GREEN | GREEN |
| a twin cannon's kill starts the escort, two frames on | RED | GREEN | GREEN |
| the shown rows 5 / 5 / 8 / 5 | RED | GREEN | GREEN |
| regions 1, 2, 4's routes: a shot under the boss in a ring row, the playfield's charset and colours (3) | GREEN (8 full rows) | **RED** (`band row 4`) | GREEN |
| region 3's route | GREEN | GREEN | GREEN |

The cadence: one cannon's (307 frames on MEDIUM) after a left shot, 306
after a right one - laser 0 has counted the frame on which laser 1's firing
ends and restarts its reload; the survivor keeps 307.

**Re-pointed** (stale scenarios: L2's names and covers, the belt's rows, the
shown band; each site carries `RE-POINTED feat/boss-r1-twin-lasers`):
`boss-runtime` (the list: 5 band rows, 22 ring rows; slot A's patched
operand; the drift's LMS rows), `boss-s4b5` (slot E's two patched operands;
the capsule at the shown edge, 64 - was 88; the scores; the contract's
weapons), `boss-lasers` (B2's lasers 0 / 1; the tier; QA1's shots to the
shown edge; the win's kill order), `boss-lasers-s41` (D1's shield plate-c,
the shot inside its row), `boss-lasers-s44` (emitter-l / plate-c; the towers
at 21-23 and 41-43; shots aimed inside the module's row), `boss-warning-line`
(plate-c), `boss-fortress` (two emitters, the belt, eight weapons, the kill
orders), `boss-readability` (shots in the shown rows; gun-1 behind plate-d;
the girder and gun-4's recess on the belt row), `boss-shot-raster` (the L2
targets; the shown rows; the raster model's band edge), `boss-escort-flow`
(plate-d over gun-1), `boss-finale` (the survivor a pulse gun),
`boss-assets-v2` (the twin slot rule), `boss-emitter-art` (emitter-l's
footprint). **Re-pinned** (exact layout values): `boss-look-tail` E4's band
digests (the new band outside the cannons' cells), `boss-r1-tuning`'s plate
hit points (the trim). No floor, ceiling, budget or gate changed.

### 10.6 The default build's guards

* **The left-edge guard** (`boss-edge-left-1`): 19 escorts, 17 hits (clause:
  at least one of each).
* **`lower-playfield-laser-contact-atr-hard`**: failed first on this build -
  the policy parked under the first emitter's lens (emitter-l, five columns
  from gun-2's open bay), a gun-2 shell met it before the first laser (health
  10 → 9 at f3,300), so it never sought a beam; the contact came later while
  it walked into emitter-r's beam, and the clause's envelope (the frame-start
  x) failed. Class (a), a stale scenario: the session names its park,
  emitter-r (gun-3 and gun-4 beside it stay covered). Contact f3,463 on laser
  1, 10 → 0 units; the clause unchanged (`c23ef81`).

### 10.7 Measurements (final; before = `main` `7b84d89`)

| | main | here | source |
| --- | ---: | ---: | --- |
| worst fence margin | 1,260 | 1,260 | PAL audit (`2-sweep-fire6` f311) |
| DMA-on maximum | 31,483 | 31,483 | `docs/runtime-wall-trace.json` |
| region 1 fight E / M / H | 82.4 / 108.3 / 150.5 s | 89.1 / 108.7 / 154.0 s | director-complete, the ratio |
| boss frames worst margin / DMA-on | 8,558 / 29,932 | 9,219 / 29,902 | director-complete CSVs |
| boss entry (R1, host frames / sectors) | 249 / 65 | 249 / 65 | trace / manifest |
| boss entry R3 (sectors) | 66 | 67 | manifest |
| stress R1 / fixture warn / R3 l7 / R3 l9 | 7,019 / 8,018 / 7,782 / 8,007 | 7,032 / 7,822 / 7,810 / 8,063 | `tests/boss-stress.test.mjs` |
| region 1 codes / look tail / charset | 122 / 110 B / 8 sectors | 105 / 110 B / 7 sectors | manifest |
| slot D / slot E / install | 1,655 / 366 B (3) / 362 | 1,661 / 496 B (4) / 374 | manifest |
| slot A / window / Light kernel / initial block | 2,047 / 1,322 / 847 / 13,623 B | unchanged | manifest |
| replays | 58 | 58 | trace |

### 10.8 Regions 2 and 4

Region 1's copies inherit everything (twins, spine, belt, the shown band, the
plates' trim); the finale stays on in them. Review routes:
`--boss-region=2|4 --level=1:sector=6` (`build/play/twin-lasers-r2-boss-route.atr`,
`…-r4-…`). MEASURED on those routes (focused runs, every clause holding):

| | region 2 | region 4 |
| --- | --- | --- |
| `region-N-dodge-2` (HARD): entry, two lasers on together | 249 host frames, 0 | 249 host frames, 0 |
| `region-N-finale-1` (MEDIUM): the finale, the chain | from f1,580, 49 volleys; f8,483 | from f1,580, 49 volleys; f8,483 |
| boss frames worst margin / DMA-on (finale) | 9,599 / 30,407 | 9,599 / 30,407 |
| hits on the bot (laser) | 20 (2) | 20 (2) |

Both are region 1's band, so the shown band is 5 rows there too (the route
test of `tests/boss-r1-twin-lasers.test.mjs` per region).

### 10.9 Review builds (`build/play/`, `atari800 -xl -pal -nobasic <path>`)

| build | SHA-256 prefix |
| --- | --- |
| `twin-lasers-full-game.atr` (= `dist/`) | `3c8f1110129242fd` |
| `twin-lasers-r1-boss-route.atr` | `fba21e9b63edc9a3` |
| `twin-lasers-r2-boss-route.atr` | `166a3db0f19e03dd` |
| `twin-lasers-r4-boss-route.atr` | `a549fa2ce01bc812` |

Previews: `twin-lasers-band-preview.png`, `twin-lasers-stages.png`,
`twin-lasers-plates-gone.png`; the grey-shot frames before / after:
`twin-l2b1-under-belt-before-after.png`.
