# The boss loading-screen banners

**Branch:** `feat/boss-banners` from `main` `f8557e3` (feat/boss-order-scale
merged at `05346cc`; ATR `eb77e4c2…`).
**Status:** Phase B — **OWNER-SMOKE CANDIDATE** (§9). Phase A (§0-§8, kept
as written) was approved by the owner on 2026-10-18 with the choices of
decision **AY** (`docs/owner-decisions-2026-09-11.md`): the entry's limit
350 host frames, the code in the region's run (B0, not L, not P), the Spine
side-on, the Bastion's rails off the edges, the Citadel with its gravity
column, the large WARNING with the name and INCOMING wide.

Labels: **M** measured (the tree, the 6502 core, the trace figures in
`docs/STATUS.md`); **EST** an estimate with its basis; **IC** an instruction
count, not assembled.

Owner decisions in force: §AL 2 (one banner per boss, mode F, 64 lines, a
160 × 64 picture centred; under it the title and the loader bar; white on
black; the banner loads first), §AL 1 (the title WARNING / name / INCOMING),
§AU 6 (bosses do not save resources; no resident byte without asking), **§AY
(this task: the entry's limit 350 host frames, superseding §AV 5)**, §AX 1
(region 1 Blockade Breaker, 2 Void Citadel, 3 Siege Spine, 4 Bastion), §AX 19
(the Bastion's palette O).

---

## 0. Summary

* Today no banner exists in the game: the boss loading screen is the ANTIC 2
  text screen with WARNING, the name, INCOMING and the summary's dotted row
  (§1).
* Proposed (§2): the region's run carries the banner; a narrow-playfield
  screen shows the picture (64 mode F lines, each with its own LMS), WARNING,
  the name, INCOMING and a 20-cell bar that advances once per sector of boss
  data; the picture is stored mirrored (the left 12 bytes of a line) and
  LZ-10/5-packed for the resident decoder. **0 resident bytes.**
* Cost (§3, M sizes, M/EST time): the pictures pack to **351-506 B**
  (mirrored; 515-741 B whole, 1,280 B raw). With all the banner code in the
  region's run (B0) the entry is **R1 282.7, R2 297.7, R3 293.7, R4 301.5**
  host frames - the Bastion **over 300** and the Citadel 2.3 under it, both
  inside the code estimate's error. Options (§4): **L** the code's persistent
  half in the level image's padding (R1 279.0, R2 290.2, R3 290.0, R4 294.0),
  **P** the region's band and charset runs packed (with L: 271.1 / 283.4 /
  282.9 / 290.9), **S** a smaller or simpler picture, **E** an owner limit.
* Recommendation: the mirrored encoding and **L**; P kept as the M6 torpedo's
  lever (§7).
* Mock-ups (§5): every picture as the game would show it, 1:1 and 3×, in
  `build/boss-banners/`.

---

## 1. What exists today (M, the tree at `f8557e3`)

### 1.1 The boss entry and its loading screen

| step | where it runs | where it lives | what it does |
| --- | --- | --- | --- |
| head | `src/main.s:13221` `boss_enter_head` | `PICKUP_CODE`, resident | the HUD booster cells backed up; music and SFX off; `sector_reader_blank` (DMA off, PMG cleared, NMIEN 0); the level image's header invalidated (`$A600` = 0); **WARNING** on row 5 of the frontend text screen; the region from the level id |
| region read | `src/hybrid/light-kernel.s:720` `boss_enter_read` | the Light kernel's record, resident | reads the region's run (overlay directory entry 2 + region, 2 sectors to `$7990`, disk-guard checked), copies its 256 B over the level's track (`$A717-$A816`), jumps to the cold tail |
| cold tail | `src/hybrid/boss.s:3489` `boss_entry_cold` | the region's run at `$7A48`, per entry | the theme starts; the name (row 7) and INCOMING (row 8) drawn under WARNING; reads the boss code run (entry 1, 16 sectors, slot A) and jumps to it |
| slot A head | `src/hybrid/boss.s:244` `boss_head` | slot A, per entry | reads the install (3), slot C (15), slot D (14), slot E (4), then the region's band A (3), band B (3), charset (6-7) and block (1-4); checks the eight runs' fold against the region's sum (`boss_head_check`) and runs the install |
| progress | `src/hybrid/level-summary.s:1027` `summary_animate` | the `$0500` summary module, resident for the session | the reader calls it after every sector (`SUMMARY_ANIMATE`, `$0506`): the dotted row on text row 10 (`$4190`) steps once - decision O, "one frame per sector, not a progress bar" |

The screen is `frontend_text_display_list` (24 ANTIC 2 rows at `$4000`, the
frontend charset at `$4800`, COLPF1 `$0A` on black, DLI-free, PMG off). Entry
sectors today: R1 67, R2 71, R3 70, R4 71 (the manifest's `entrySectors`);
host frames 257 / 272 / 268 / 272 (STATUS, the routes).

### 1.2 The region (level) loading screen

START GAME and the level's end go through the reader's own transitions
(`src/hybrid/sector-reader.s`): a session's first START GAME shows the
summary's top line alone while the `$0500` module lands, then the level read
with the dotted row; the level-summary screen (the stats in the region's look,
its art run read first) does the same. Neither shows a picture or a bar; the
banner task does not change them.

### 1.3 Banner material in the repository

No banner code or data exists in `src/`, `scripts/` or the build. The owner's
design input of 2026-10-11 is in `docs/design/boss-banners/`: four 160 × 64
pictures (`bitmaps/`, 1,280 B each, dithered: 544-738 B with this repo's
LZ-10/5), whole-screen previews (`screens/`), the Python that drew them, and
three notes on how the bands changed since: the Breaker's deck and twin
projectors (`r1-twin-lasers-note.md`), the Citadel's octagon and gravity column
(`r4-void-citadel-note.md`), the Bastion as built with its L foot and the
region-to-banner table after §AX 1 (`r2-bastion-note.md`). Those pictures show
the older looks (the castle-era Breaker, the Citadel's 16 square modules, the
oval Spine, the four-spar Bastion); the brief asks for the looks of today, so
all four are redrawn (§5).

---

## 2. The proposal

### 2.1 What the player sees

WARNING (as today, about 0.6 s with the dotted row while the region's run is
read), then the banner screen: the picture centred at the top, WARNING in
large letters (ANTIC 7), the boss's name and INCOMING in wide letters
(ANTIC 6), and a bar of 20 cells under them - the width of the picture - that
fills once per boss-data sector until the fight starts. White on black
(COLPF0 = COLPF1 = `$0E`, COLPF2 = COLBK = `$00`); no DLI, no PMG, one set of
colours. The name stays on the screen's centre line: a name of odd length is
shown on a line with the HSCROL bit (HSCROL 4, half a wide glyph).

### 2.2 How (IC; Phase B builds it)

* **Display:** the narrow playfield (DMACTL `$21`, 32 bytes a line); 64 mode
  F lines, each with its LMS, a line 26 bytes apart in memory (6 blank, the
  picture's 20, the next line's 6 blank shared), so the picture needs 1,676 B
  at `$3B00-$418B`: the PMG area (cleared at the entry today and idle until
  the install) and the text screen's rows 0-9 (cleared by today's render). The
  dotted row at `$4190` keeps being stepped by the summary module and is not
  shown. The text rows at `$41B8-$4207`; the display list (~215 B) in
  `$7990-$7BCF`, free in the boss entry (summary art and the pause backup use
  it in other phases). Lines 48 / 49 split at `$4000`, so no line crosses the
  4 KB boundary.
* **The picture:** the left 12 bytes of each line (the left 64 pixels and the
  32 centre pixels, which may differ - a core's shine), LZ-10/5-packed;
  unpacked by the resident decoder (`broadside_unpack_command`, main `CODE`,
  0 B), then bytes 0-7 mirrored into 12-19 (a 16-B nibble table) straight into
  the screen rows. A picture that is not mirror-symmetric is kept whole.
* **The run:** the region's run (directory entry 2 + region) grows from 2
  sectors to carry the theme, the title's records, the banner code and the
  packed picture, and lands where it is free at that moment (slot C's area,
  read later); the resident directory's count and destination and the guard's
  sum change value, not size.
* **The bar:** the banner code reads the boss data itself, one sector a call
  (`sector_reader_read_sectors` with a count of 1; its fold carries across
  calls, so the disk guard's checks are the same - the boss code run against
  its entry's sum, the head's eight runs against `boss_head_sums`), and after
  each sector adds the region's step (20 × 256 / sectors, a build constant) to
  an accumulator; a carry fills the next cell. Then the hand-over: the display
  off, the PMG area and `$4000-$418B` cleared (today's post-entry state), and
  `boss_head_check`, the install - slot A is not touched.
* **Ruled out:** patching the summary's per-sector vector (`$0506`) to draw the
  bar would save ~70 B, but a read failing mid-entry would leave the vector
  pointing at banner code for the next START GAME.

---

## 3. Cost

### 3.1 The model

`scripts/boss-banner-preview.mjs` (its constants cite their basis):

* entry = today's entry + (region run sectors − 2) × **3.75** host frames
  (M: one more boss-entry sector cost 3.67-4.0 frames between the boss-art and
  boss-order-scale routes) + the screen's set-up;
* region run = 184 (theme) + **350** (banner code, IC ±50 B: the screen 110,
  the picture 83, the reads and the bar 131, the hand-over 13, the cold tail 6,
  the title call 7) + the title records (31-40 B) + the packed picture;
* set-up = the unpack (**M**: the resident decoder takes 57.6-63.6 cycles an
  output byte on these pictures - 44,427-48,872 cycles for a mirrored one, on
  the 6502 core) at ~29,800 CPU cycles a frame (EST: the banner's DMA) + 1.7
  frames (EST: the mirror ~25,000 cycles, the list and text ~10,000, half a
  frame's wait on average): **~3.2 frames**.

### 3.2 Per picture and region (B0: all the code in the region's run)

| region | boss | picture | raw | mirrored payload | packed (whole) | run, B / sectors | +sectors | +frames | entry | under 300 |
| --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: |
| R1 | Blockade Breaker | `blockade-breaker` | 1,280 | 768 | 391 (601) | 966 / 8 | 6 | 25.7 | 282.7 | 17.3 |
| R2 | Void Citadel | `void-citadel` | 1,280 | 768 | 351 (515) | 922 / 8 | 6 | 25.7 | 297.7 | 2.3 |
| R2 | Void Citadel | `void-citadel-column` | 1,280 | 768 | 361 (529) | 932 / 8 | 6 | 25.7 | 297.7 | 2.3 |
| R3 | Siege Spine | `siege-spine-side` | 1,280 | 768 | 426 (635) | 996 / 8 | 6 | 25.7 | 293.7 | 6.3 |
| R3 | Siege Spine | `siege-spine-front` | 1,280 | – (not symmetric) | 870 whole | 1,440 / 12 | 10 | 41.8 | **309.8** | **−9.8** |
| R4 | Bastion | `bastion-rails` | 1,280 | 768 | 487 (732) | 1,053 / 9 | 7 | 29.5 | **301.5** | **−1.5** |
| R4 | Bastion | `bastion-framed` | 1,280 | 768 | 506 (741) | 1,072 / 9 | 7 | 29.5 | **301.5** | **−1.5** |

Sectors per banner on its own: raw 10, the mirrored payload 6, packed 3-4
(the head-on Spine 7) - but a region pays for its whole run, so the sector
column above is the one that counts. The code's ±50 B is ±0.4 sector: any
row within ~4 frames of 300 can go either way.

Unchanged by the banner (M by construction, re-measured in Phase B): slot A
to E, the band, the fight - so the worst fence margin (1,470), the DMA-on
maximum (31,059), the boss-sector stress and the M6 headroom (1,350 / 471 /
475 / 440) do not move; the banner exists only between the WARNING and the
install.

---

## 4. Options where a region would pass 300

| option | what | entry R1 / R2 / R3 / R4 (side-on Spine, railed Bastion) | cost | risk |
| --- | --- | --- | --- | --- |
| **L** | the banner's per-sector reader, bar step and hand-over (~76 B) in the level image's music tail `$A817-$A87F` (105 B free; the theme's copy ends at `$A816`) and its picture set-up (~90 B) in `$A998-$A9FF` after the hull block (104 B; band A lands there only later). The level image is read at START GAME anyway: still 13 sectors, so START GAME is unchanged | **279.0 / 290.2 / 290.0 / 294.0** (21 / 10 / 10 / 6 left) | 0 resident B; 209 B of level-image padding claimed (the music player's 120-B growth tail drops to 15 B) | low: code checked by the disk guard with the level image; the boss entry needs the level image it already needs |
| **P** | each region's band A, band B, charset and block runs LZ-10/5-packed (M: −3 sectors R1, R3, R4; −4 R2), read to a landing area and unpacked (EST +3.4-4.4 frames) | with L: **271.1 / 283.4 / 282.9 / 290.9** | +30 B code (EST); the build and the fold in the packed bytes | medium: the boss data's path changes (landing, decode, order) |
| **P′** | as P for the shared slots A, C, D (M: −5 sectors) | −18.8 + 11.6 decode ≈ −7 frames every region | the decode is long (5,760 B) | medium-high |
| **S** | a smaller or simpler picture: 160 × 48 (EST −25 % packed, about −1 sector), or fewer tones | ~−3.75 a region where it drops a sector | the look | none |
| **E** | an owner limit for the banner case, e.g. 305 or 310 | B0 as §3.2 | – | – |

Nothing here overlaps the banner with the reads beyond what §2 already does:
the banner shows while all the boss data loads; the reader is polled, so the
unpack cannot run inside a serial wait without resident code.

**M6 (planned):** the torpedo was priced at +2 entry sectors (plan
`gameplay-variety`, ≈ +7.5 frames). After the banners with L the Bastion's
294.0 + 7.5 passes 300; with L + P it does not (298.4). M6 would bring P (or
an E) with it.

---

## 5. The pictures and the mock-ups

Drawn by `scripts/boss-banner-art.mjs` (a few primitives, mirrored halves,
row-periodic tones that pack well) from the bands as they are today
(`npm run boss:preview`, the notes in `docs/design/boss-banners/`); written to
`assets/graphics/boss-banners/*.png` (160 × 64, black and white RGBA - the
owner may edit them by hand). Drafts: the silhouettes and parts are settled,
pixel polish follows in Phase B within the chosen byte budget.

| picture | boss (directory) | shows |
| --- | --- | --- |
| `blockade-breaker` | region-1 | the deck end to end with its plates and slots, an engine block and three nozzles at each end, two stepped projector towers with their lenses, the pulse turrets on struts (the centre slot's on the axis), one belt of plates, nothing below |
| `void-citadel` | region-4 | the riveted octagonal deck and walls, the void core (a dark void, a bright rim, a glow ring) hung under the deck with its lens below, the two narrow cannons hugging it, a dark wall each side, the T pulse guns, the twin-needle salvo spires against the ends, one belt |
| `void-citadel-column` | region-4 | the same with a faint dotted S-wave under the lens: the gravity column |
| `siege-spine-side` | region-3 | side-on as the band: the segments with dorsal spikes and masts, the siege cannon's dome and cone on the axis, a laser cone and T-guns each side, the engine pods with three nozzles, two pairs of plates, the force field's zigzag |
| `siege-spine-front` | region-3 | head-on from the near (left) end: the same ship in perspective, running away to the right |
| `bastion-rails` | region-2 | the track edge to edge, the rails running off both edges (two pods a side visible), the striped buffers with the L foot, the dashed guide, the armoured cannon spires with fins, barrel and muzzle brake over the bay's bars, the dome with the sphere core (lit above, the shine and eye), the barred gate |
| `bastion-framed` | region-2 | the same with the track's end caps inside the picture and one pod a side |

Mock-ups (`node scripts/boss-banner-art.mjs && node scripts/boss-banner-preview.mjs`;
`build/`, not committed): `build/boss-banners/r<N>-<picture>-1x.png` (336 ×
208, one hires pixel a pixel, the bar at 8 of 20) and `-3x.png`;
`build/boss-banners/pictures-4x.png`; `build/boss-banners/cost.json`.

---

## 6. Resident bytes

**0** in every option. The resident decoder, `render_frontend_records`,
`wait_frame_start`, `clear_pmg` and the reader's sector loop are reused; what
changes in resident memory are values (the region run's directory count and
destination, its guard sum), not sizes. Option L uses level-image padding, not
resident RAM.

---

## 7. Owner questions (recommendation first)

1. **The entry budget** (R4 is over 300 with B0): **L** (recommended; every
   region 6-21 frames under 300), L + P (9-29 under; more work and risk now),
   S, or E (a limit for the banner case).
2. **The Spine:** **side-on** (recommended: the band's own view, fits) or
   head-on (12-sector run, −9.8 under B0; needs L + P to reach 298.9).
3. **The Bastion:** **rails off the edges** (recommended: as in the game,
   19 B smaller) or framed.
4. **The Citadel:** **with the gravity column** (recommended: the region's
   mechanic, +10 B, the same sectors) or without.
5. **The title:** WARNING large, the name and INCOMING wide, as the owner's
   2026-10-11 previews (recommended; the same cost), or today's small ANTIC 2
   letters.
6. **Decision O:** the boss loading screen gets a progress bar (this brief);
   the level loading screens keep the dotted row.

## 8. Where the repo and the brief differ

* The brief: "the boss's name as the title"; decision AL 1 keeps WARNING / name
  / INCOMING - kept, all three.
* `docs/design/boss-banners/README.md` names R2 Bastion and R4 Void Citadel
  (before §AX 1); the repo's order is `[1, 4, 3, 2]` - R2 Citadel, R4 Bastion,
  as the brief says.
* `r2-bastion-note.md` gives R4 271 (29 left); STATUS and the brief 272 (28)
  - STATUS used.
* The README's "~+25 frames" for a banner: B0 measures-and-estimates 25.7-29.5
  (+41.8 for the head-on Spine).
* Decision O ("not a progress bar") stands for the dotted row; the brief's bar
  supersedes it on the boss loading screen only (question 6).

---

## 9. Phase B — what was built (M unless marked)

### 9.1 Where the plan changed, and why

* **Two runs, not one.** Phase A grew the region's run (directory entry
  2 + region) from 2 sectors to 8-9; Phase A did not check the disk, and the
  region area 632-711 is full (4 × 16 + the blocks; 17 sectors free, in
  pieces). The theme run stays as it was — 2 sectors at 632 + 16 × region,
  read by the resident `boss_enter_read` into `$7990`, so the resident
  directory, the resident code and the reads before the banner are
  byte-identical — and its tail (`BOSS_ENTRY_COLD`, `$7A48`, 67 B: the 40 B
  the old title records had are its now) reads the region's **banner run**,
  named by a 5-B spec in the theme run's last bytes (its first sector, its
  count, its expected disk-guard fold, written by the build), and checks it as
  the reader checks a directory run. The banner runs have their own
  reservation, **10 sectors a region from 280** (280-319, between the boot
  transport's 213 and the levels' 320; the build refuses a transport that
  reaches 280).
* **The code is 621 B, not 350 (IC was −44 %).** The set-up 352 B (with the
  display list's tail), the reads 269 B (copied to `$7A90`); the banner runs
  are **9 sectors in every region** (R4 1,142 of 1,152 B: 10 B to the next
  sector). The set-up costs **151,491-153,950 cycles** on the 6502 core with
  the display off (EST in Phase A: ~3.2 frames; M ~5 frames).
* **The bar is mode F, a pixel at a time.** Phase A drew 20 ANTIC 2 cells (a
  cell every ~3.4 sectors); the same look (the frontend charset's dash in the
  empty part, solid where filled) is now 8 mode F lines over two 32-B rows
  (the dash glyph's line 3 is row B), filled 2-3 pixels a sector — 8.8 steps
  of `ceil(160 × 256 / sectors)`, the last sector of the boss data reaching
  pixel 160 and no earlier one.
* **The reads under the banner** are as Phase A proposed: the boss code
  (directory entry 1, `guard_begin` / `guard_check` as `sector_reader_read_run`
  does) and slot A's head's eight runs (from slot A's own `boss_runs` table,
  folded on, `boss_head_check` against the region's sum), one sector a call to
  `sector_reader_read_sectors` (its fold, the destination and the sector carry
  across calls; it quiesces, SKCTL `$03`, after every call). Slot A's head
  (`boss_head`) is no longer run; slot A, the install, slots C-E and every
  band, charset and block run are **byte-identical to main** (the manifest's
  hashes).
* **The pictures** were polished in Phase B (§9.3) and must keep their outer
  64 pixels a side mirror-symmetric (the build refuses one that does not).
* **The laser fixture's** debug name became `Fixture tier N` (the banner row
  shows 16 glyphs; it was 22).

### 9.2 The entry, step by step

| step | where | what |
| --- | --- | --- |
| head | main `PICKUP_CODE`, resident (unchanged) | WARNING on the text screen; the region |
| region read | Light kernel, resident (unchanged) | the theme run (2 sectors) to `$7990`, its 256 B over the track, `jmp $7A48` |
| cold tail | theme run, `$7A48` | the theme starts; the banner run (9 sectors) to `$1000`, checked against the spec's fold; `jmp $1000` |
| set-up | banner run, `$1000` | display off; the reads to `$7A90`; rows `$4000-$422F` cleared; the list at `$7990` (40 blank, 64 LMS lines, the text, the bar); the picture unpacked to `$1500` by the resident decoder and mirrored into its lines; the title; the bar's dashes; HSCROL 4, COLPF0 = COLPF1 = `$0E`; on a frame edge DMACTL `$21` |
| reads | `$7A90` | the boss code (entry 1, checked) and the eight runs, a sector a call, the bar a step after each |
| hand-over | `$7A90` | DMACTL 0; `clear_pmg`; rows `$4000-$422F` cleared; `jmp boss_head_check` → the install |

RAM (all `boss-entry`, `docs/memory-map.md`): the run `$1000-$1475`, the
buffer `$1500-$17FF` (slot C's area, read over later), the picture
`$3B00-$418B` (the PMG area and the text screen's rows 0-9, lines 26 B apart,
the 4 KB edge at line 49), the text and bar rows `$41B8-$422F`, the list
`$7990-$7A7E`, the reads and their state `$7A90-$7BAC`. **0 resident bytes**:
the reader (1,498 B) and the Light kernel (957 B) keep their sizes; the
guard's sums change value.

### 9.3 The pictures (decision AY)

| region | boss | picture | packed (draft) | run B / sectors | entry sectors (main) |
| --- | --- | --- | ---: | ---: | ---: |
| 1 | Blockade Breaker | `blockade-breaker` | 398 (391) | 1,066 / 9 | 76 (67) |
| 2 | Void Citadel | `void-citadel-column` | 368 (361) | 1,032 / 9 | 80 (71) |
| 3 | Siege Spine | `siege-spine-side` | 429 (426) | 1,092 / 9 | 79 (70) |
| 4 | Bastion | `bastion-rails` | 483 (487) | 1,142 / 9 | 80 (71) |

The polish keeps every shape and part of the drafts: the lit-from-above
shading on the Breaker's deck plates and saucer turrets, the Citadel's deck
underside and the Spine's segment bellies; glints in the projector lenses, the
Citadel's lens and the void's rim; the Spine's dome crown; a black gap between
the Bastion's dome and its cannons' fins (they ran together). The unchosen
variants (`void-citadel`, `siege-spine-front`, `bastion-framed`) stay in
`assets/graphics/boss-banners/` as drawn alternatives; they are not on the
disk.

### 9.4 Measured per region

Entry: Atari800, the boss routes (`--level=1:sector=6 [--boss-region=N]`,
sessions `s41-diag-1` / `region-N-diag-1`, the CSV's entry row). M6: the
torpedo's +2 entry sectors at the measured 3.75-4.0 host frames a sector
(EST). Stress: the 6502 core's worst reachable boss frame (native cycles; the
tools of STATUS), M6 headroom = 8,500 − it.

| region | boss | entry, host frames (sectors) | main | under 350 | with M6 (EST) | worst reachable | M6 headroom |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Blockade Breaker | **296** (76) | 257 (67) | 54 | ~304 | 7,150 | 1,350 |
| 2 | Void Citadel | **311** (80) | 272 (71) | 39 | ~319 | 7,694 (L4) / 8,029 (L5) | 471 |
| 3 | Siege Spine | **307** (79) | 268 (70) | 43 | ~315 | 7,771 (L7) / 8,025 (L9) | 475 |
| 4 | Bastion | **310** (80) | 272 (71) | 40 | ~318 | 8,060 (L10) | 440 |

The banner costs each entry **+38-39 host frames**: its 9 sectors (~34) and the
set-up (~5). The stress figures and the M6 headroom are main's to the cycle
(the fight's code and data are byte-identical). The routes' boss frames:
worst fence margin 9,829 / 6,545 / 8,993 / 8,324, DMA-on 29,320 / 29,654 /
30,118 / 29,590, 0 misses (`measure-boss-fight.mjs`).

The banner in Atari800 (`DFTRACE_SHOT_PREFIX` / `DFTRACE_SHOT_HOSTS` on the
routes, host frames 800-1075; `build/boss-banners/shots/`, not committed):
the picture at hires x 48-207; every text line's glyph cells centred on the
window's centre (WARNING and the odd names half a glyph right by HSCROL 4, as
modelled); the bar filling from the left.

### 9.5 Gates, tests, the evidence, the smoke

* **Gates (M):** worst fence margin 1,470 (≥ 500), DMA-on maximum 31,059
  (≤ 32,568), boss-frame stress worst 8,060 (≤ 8,500), 0 missed frames, every
  entry ≤ 350 (296-311), 0 new resident bytes, every run checked by the disk
  guard and SKCTL `$03` after every read call; no contact clause changed.
* **A trace fix:** the trace found the boss entry by `boss_head`'s PC, which
  the banner path no longer runs: the slot-E path sessions failed (their
  driver never armed) and slot E's hull-map clause watched nothing. It is
  `banner_reads` now (before the boss code and slot E are read); the three
  slot-E sessions and the routes pass with the clause armed.
* **Tests:** `tests/boss-banners.test.mjs` (22); re-pins for layout values
  only; the entry gates 300 → 350 (§AY). The evidence chain (build:candidate →
  runtime:wall-trace → menu raster → build → memory-map → showcase:gif →
  showcase) on the candidate; `npm test` 1,472 of 1,473 twice (the recorded
  `tests/preview.test.mjs:164`), reconciled 0 NEW, 0 MOVED.
* **The preview:** `node scripts/boss-banner-preview.mjs` now draws the four
  chosen screens from the build (`build/boss-banners/`, `banners.json`); the
  Phase A cost model (§3) is retired - §9.4 is measured.
* **Smoke:** `docs/hardware-testing.md` §39; the ATRs in STATUS.

