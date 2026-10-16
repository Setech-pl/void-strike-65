# Boss art pass — R1, R2 and R4 to R3's level, a palette per band row (B)

Branch `feat/boss-art`, cut from `main` `6d27ad9` (+ `b1bd411`, the owner's design
input `docs/design/boss-art/bastion-art-ABC.png`). Status: **Phase A — owner look
pending** (previews, budget, boss-route ATRs). Nothing here is accepted.

Owner inputs (2026-10-15): R3 Siege Spine is the most beautiful ("good resolution
and look"), R1, R2 and R4 reach that level, R2 is still ugly; variant B of the
design input — the same band size, each character row of the band with its own
palette through display-list interrupts; journal §AU 6 — bosses do not save
resources; for this task the boss entry may reach 300 host frames. Art only:
mechanics, hit boxes, module columns and timings unchanged.

Labels: **M** emulator trace (Atari800, `build/atari800-trace`), **M-N** 6502
harness (native cycles, `tests/boss-harness.mjs`), **B** build output
(`build/*.map`, manifest), **S** script over the drafts.

---

## 1. Audit — how the band is shown (file:line at `2dbd68e`)

* **Display list** (`src/hybrid/boss.s:3258` `boss_install`, step 6): HUD
  `$C2` (mode 2, LMS, DLI — phase 0), divider `$44`, then one `$54` line per
  band row (ANTIC 4 + HSCROL + LMS) down to the last row holding a cell
  (`boss_band_measure`, `:3072`), that row `$D4` (+DLI — phase 1, `:3345`), then
  the ring rows `$44`, the last `$C4` (+DLI — phase 2). The band's rows are 64-B
  rows of band A/B (`$A880`, `$AC80`); HSCROL and the LMS bytes are republished by
  phase 1 (`boss_apply_pos`, `:429`).
* **DLIs** (`boss_dli`, `:366`): phase 0 on the HUD's last line — the PAL-frame
  token, CHBASE `$0C` (the region's charset at `$0C00`), the region's four
  colours (`BOSS_T_PALETTE`), then `jsr laser_publish` (`:383`); phase 1 on the
  band's last line — CHBASE back, **COLPF2 first** (the scanline fix, S5-4),
  COLPF0, COLPF1, COLPF3, then the band position; phase 2 the HUD restore
  (`src/main.s:3657` `gameplay_dli_sync_hud`).
* **What lands in time** (MEASURED, plan `s5-boss-regions` §6.4.3): after the
  `WSYNC`, a store written 12 cycles later still lands on the next line's pixels
  (phase 1's COLPF2), one written 18 cycles later does not (its COLPF0): on the
  first line of an ANTIC 4 row the playfield DMA (48 name + 48 data fetches with
  HSCROL) halts the CPU for almost the whole line.
* **Colours the band's other users read:** the player's in-band shot is pixel 3
  in the pf2 bank (`boss_shots_late`, glyphs from the gameplay charset) — it shows
  the region's **COLPF2**; the boss's in-band pulse shot is pixels 1 and 2 —
  **COLPF0 / COLPF1**; the beams (M1/M2), the gravity column (M0), the capsule
  (P3/M3) and the player are PMG colours (PRIOR 0) and never read a playfield
  register.
* **b3 and the warnings** (`BOSS_MODE_MFLASH`, `:137`; slot E's step): the hit
  flash toggles bit 7 of the module's non-blank cells for 3 frames — colour 3
  swaps between COLPF2 and COLPF3; region 4's spire warning and region 2's cover
  warning blink the same bit; the laser warning swaps glyphs (heat A/B) and the
  missile colour. Under a per-row palette each row's own COLPF2 / COLPF3 pair is
  what swaps — the rule in §3.3.

## 2. The R3 study — what makes it look better, in numbers

`node scripts/boss-art-study.mjs [--dir=<drafts>]` (**S**) renders each band's
start look from its glyphs and measures it. Today (`main`):

| | R1 Blockade Breaker | R2 Bastion | **R3 Siege Spine** | R4 Void Citadel |
| --- | ---: | ---: | ---: | ---: |
| codes (art) of 128 | 105 (90) | 88 (75) | **108 (93)** | 108 (93) |
| band cells / distinct glyphs | 225 / 60 | 195 / 44 | **238 / 45** | 152 / 47 |
| cells per glyph (repetition) | 3.8 | 4.4 | **5.3** | 3.2 |
| palette | `$0A $06 $28 $32` | `$0C $06 $28 $E2` | **`$0C $66 $28 $04`** | `$0C $06 $58 $62` |
| COLPF1 (trim) | grey | grey | **violet** | grey |
| share of drawn pixels PF0 / PF1 / PF2 / PF3 | 19 / 31 / 8 / **41** % | 26 / **46** / 4 / 24 % | **33 / 42** / 8 / 18 % | 26 / 32 / 11 / 31 % |
| outline pixels drawn in PF1 | 55 % | 86 % | **75 %** | 65 % |
| silhouette mirror agreement | 67 % | 75 % | **77 %** | 86 % |
| connected parts (largest) | 68 (77 %) | 70 (96 %) | 142 (89 %) | 4 (100 %) |
| module cells with damage stages | all but the towers' 8 | guns only (core 1/9, doors 0/3, cannons 1/6) | **every module cell** (generators 9/9, plates, guns) | all but the core (0/9) |

What the numbers say R3 does that the others do not:

1. **It is not more unique glyphs.** R3 repeats the most (5.3 cells a glyph):
   the vertebra is one picture across the spine. Detail comes from the
   picture, not the count.
2. **Light faces, a saturated trim, little dark bulk.** The light steel
   (COLPF0) and the trim (COLPF1) carry three quarters of the pixels; the dark
   bulk only 18 %. R1 is 41 % dark burgundy; R2 46 % grey trim on dark olive.
3. **A chromatic trim outlines every part.** R3's COLPF1 is violet at mid
   luminance and draws 75 % of the outlines: each part reads as its own closed
   shape, joined into one ship. Everyone else's COLPF1 is neutral grey.
4. **Volume:** spheres and the dome with lit bands on top, rounded stair-step
   corners; a regular rhythm (the spine's spikes) and bookends (the generator
   spheres, the nozzles) make the silhouette.
5. **Damage reads on every module cell** — cracked and broken are redrawn per
   picture, not dropped pixels.

The recipe applied to R1, R2 and R4: light faces lit from the upper left, every
part outlined, the bulk only in recesses, amber only on what can be hurt, a
saturated trim (R1 rust, R4 gold; R2 keeps the owner's grey steel), and B's
light from above.

## 3. Variant B — a palette per band row

### 3.1 How (built)

* **Data** (`scripts/boss-assets.mjs:1727` `bossRowPalette`): `modules.json`
  `rowPalette` lists COLPF1 and COLPF3 for every shown row; `palette` stays the
  one-palette look (A), `"off": true` keeps the rows without using them. Row 0's
  pair replaces the band palette's (phase 0 sets it). A DLI sits only under rows
  whose next row differs (the switch mask). The bytes — mask, count, the
  switches' COLPF1s and COLPF3s (16 B) — ride in the charset run's divider area
  (`:1519`), which the run carried as zeros: **0 disk sectors, 0 codes**.
* **Why two registers:** COLPF0 and COLPF2 stay the region's in every row — they
  are the in-band shots' colours (§1) — and only two stores land on a row's
  first line in time (§1).
* **Code** (`src/hybrid/boss.s`, slot C `BOSS_C_ASM`): `boss_pal_prepare`
  (`:1484`, once, from the install — reads the run's bytes before the install's
  divider copy, which now follows it; sets the DLI bit on each switching row's
  instruction; points phase 0's publish at the hook; falls into `boss_prepare`);
  `boss_pal_frame` (`:1672`, phase 0 after its WSYNC: VDSLST to the row DLI, its
  sources to the first switch, then `laser_publish`); `boss_pal_dli` (`:1688`:
  COLPF1 loaded before the WSYNC, stores written **4 and 12 cycles** after it,
  prolog **11 cycles** — phase 1's is 20 — then the next switch's sources; after
  the last switch VDSLST is `boss_dli` again, so the band's end and the HUD are
  untouched). A region without a row palette runs exactly as before: slot A's
  bytes are unchanged (`boss_dli_publish` is patched at the entry only when a
  region has switches).
* **Robustness:** the hook resets the chain every frame, so a pause entered in
  the middle of the band cannot carry a stale switch into the next frame.

### 3.2 Landing (M)

Probe (R1 route, colours chosen to be told apart, 4,000 frames): every band
row's **first scanline** shows its own COLPF1 and COLPF3 from the leftmost
pixel on (rows 1-4, e.g. row 2's first line `$18` ×112 from x 0 — the probe's
COLPF3); 0 missed frames, 0 DLI errors. The four routes with the proposed
palettes (§6): 0 misses, 0 DLI errors.

### 3.3 Rules per row (S, `node scripts/boss-art-rules.mjs`)

* **b3 flash:** in every row COLPF2 and COLPF3 differ by an RGB distance
  **≥ 80** in Atari800's PAL palette (today's weakest pair, R3's `$28`/`$04`,
  is 111). Proposed rows: weakest **84** (R1 row 0, R2 rows 1-2).
* **Ally steel:** every chromatic colour ≥ 45° from the ally steel's hue
  (`$88` levels 1-6, `$84` 7-12), on the region tests' wheel: weakest **68°**.
* **PF2 pixels in every stage** and the occupancy are unchanged (§6.1).

### 3.4 Colours as the owner sees them

The repo's preview wheel (`scripts/preview.mjs`) is approximate; in Atari800's
PAL palette hue 4 is magenta, `$28` salmon-amber, hue E olive-brown. Every
colour here was chosen on `scripts/atari800-pal-palette.mjs` (Atari800's own
table, from its screenshots' PLTE), and the previews render with it.

### 3.5 Per-row CHBASE — a second charset?

Possible in principle: one of the two stores at one boundary could be CHBASE,
giving the rows under it another 1 KB (128 codes). **Not available without the
owner:** no 1 KB-aligned block is dead in the boss sector — BROADSIDE outside
slot A mixes live resident code (`apply_player_damage`, `update_enemy`, audio,
HUD); the frontend charset `$4800` would need a restore before the pause screen
and the summary (resident code and a directory entry); `$B835-$BBFF` (971 B
unclaimed, not measured) is not 1 KB. **Not needed by this proposal**: the new
art uses 93 / 89 / 108 / 108 codes (§4).

## 4. Budget per boss (today / ceiling / this proposal)

| | R1 | R2 | R3 | R4 | source |
| --- | --- | --- | --- | --- | --- |
| charset codes (of 128; 7 divider, 6 shots, 2 nozzles fixed) | 105 / 128 / **93** | 88 / 128 / **89** | 108 / 128 / **108** | 108 / 128 / **108** | B (converter) |
| charset sectors (≤ 8, reserved 16 a region) | 7 / 8 / **6** | 6 / 8 / **6** | 7 / 8 / **7** | 7 / 8 / **7** | B |
| row-palette bytes | — / 16 / 16 (in the charset run, 0 sectors) | same | same | same | B |
| row switches (DLIs a frame) | — / 7 / **2** | — / 4 / **4** | — / 7 / **2** | — / 4 / **3** | S |
| slot C (shared) | 1,662 B, 13 sectors / 1,825 B RAM / **1,779 B, 14 sectors** | | | | B (`build/boss.map`) |
| slot D BSS (shared) | 88 B / 129 B / **105 B** | | | | B |
| slot A, install, slot E, slot F, resident, window | unchanged (slot A byte-identical; the install reordered, 381 B) | | | | B |
| boss entry, host frames (≤ 300 for this task) | 249 / 300 / **249** | 256 / 300 / **260** | 256 / 300 / **260** | 261 / 300 / **264** | M |
| left for the banner (~25) under 300 / under 280 | 51 / 31 | 40 / 20 | 40 / 20 | 36 / 16 | M |
| stress, worst reachable native (≤ 8,500) | 6,996 / 8,500 / **7,154** | 7,723 / 8,500 / **7,989** | L7 7,771, L9 8,025 / 8,500 / **7,929, 8,183** | 8,044 / 8,500 / **8,256** | M-N |
| B's native cost a frame (hook + switches) | **154** | **262** | **154** | **208** | M-N |
| boss frames worst fence margin (≥ 500), route dodge session | 15,370 → **14,935** | 11,965 → **11,165** | 13,095 → **12,632** | 9,407 → **8,817** | M |
| boss frames DMA-on max (≤ 32,568) | 27,653 → **27,580** | 27,886 → **27,887** | 27,903 → **27,814** | 28,299 → **28,503** | M |

* Disk: the 720-sector, 128-B-sector ATR has every boss run reserved (code
  528-583, regions 632-695, blocks 696-711); a sector at the entry costs about
  3.5-4 host frames (plan `s5-boss-regions`, MEASURED). Disk is not the limit;
  the entry's time is.
* RAM dead in the boss sector that art can use without the owner: the charset's
  unused codes (R1 35, R2 39, R3/R4 20 codes), band rows 5-7 of the 5-row
  bosses (192 B, already read), slot C's tail (13 B) — none needed now.
* Stress: the harness counts the DLIs as the stress composition does (from the
  handler's entry to its RTI); with the NMI's entry and the OS's dispatch
  (~18 cycles a DLI) R2's frame is ~334. B's cost on R4 leaves **244** native
  for M6's VOID LANCE in the boss sector (456 without B).
* Measured main vs branch on the same route sessions (R1 `laser-dodge-2-fire0`,
  R2-R4 `region-N-dodge-2`, HARD, 3,000 frames): the same hits and deaths.

## 5. The art (as drafted)

* **R1 Blockade Breaker** — new `scripts/boss-r1-art.mjs` (R1 was PNG-only):
  today's cell layout exactly (`R1_HULL`), every glyph redrawn — light steel
  slabs lit on the top and left, a rust trim (`$26`, lit `$2A` on the spine), the
  dark red only in the slabs' recesses, three slab kinds (slot, grille,
  rivets) so the plating does not repeat; turret-box guns with a lamp row (dark
  behind their plates, amber when exposed); bevelled plates with amber studs
  and skirt; the projector towers (owner design 1) and extras kept. Pixels:
  dark bulk 41 % → **9 %**, light faces 19 % → **46 %**, mirror 67 → **77 %**,
  connected parts 68 → **3** (one ship).
* **R2 Bastion** — the owner's drawing (`bastion-art-ABC.png` A/B): the olive
  track with a lit edge and rivets, a truss girder, inverted turret pods lit
  from the left with an amber visor, a red lamp and an amber muzzle, red hazard
  stripes on the rail ends (red: not hittable), mushroom-turret cannons (grey
  and unlit when locked, amber when open), the core a sphere — amber top with a
  highlight, red below (orange to red), in a lit steel rim; the bars only on
  what is locked. Designed for B (in A the core's lower part is olive).
* **R3 Siege Spine** — unchanged; B only (two switches: the violet trim and the
  slate lighter on the spine's top rows).
* **R4 Void Citadel** — a gold trim (Atari800 `$EA`) over the violet bulk and
  the light faces; the hull lit on its top and left edges with ribs and seams;
  the guns lit on their left.
* Codes: R1 105 → 93, R2 88 → 89, R3/R4 unchanged; no region needed more than
  128 codes.

## 6. Measurements

### 6.1 Mechanics unchanged (S)

`node scripts/boss-art-mechanics.mjs --reference=<main's drafts>`: all four
regions **identical** to `main` on the module records, every column's hull
stop, the armour columns, the see-through cells, the shown rows, the open-look
set, the rails / hangar / gravity / field data and which cells hold a cell in
every look (start, open, cracked, broken, armour gone, all gone).

### 6.2 On the emulator (M)

The table in §4; captures in `build/boss-art/trace/rN/` (beams and the player
in frame: R2 `f-618`, R3 `f-198`, R4 `f-169`).

### 6.3 Not yet done (Phase B)

The stress tests' accounting of the row DLIs, tests for the palettes and rules,
trace clauses for the DLI timing, the evidence's regeneration, two full
`npm test` runs — after the owner's look.

## 7. Previews and builds

`node scripts/boss-art-preview.mjs --main=<main's drafts>` → `build/boss-art/preview/`:
`region-N-compare.png` (today / new A / new B, the screen window at the start),
`region-N-stages[-a].png` (every module intact, cracked, broken; right: the b3
flash), `region-N-gone[-a].png`. ATRs (`build/play/`, candidate build,
recommended look = B everywhere):

* full game `boss-art-a-full-game-4282cf3a.atr`
* R1 route (level 1) `boss-art-a-r1-boss-route-level1-c4a858bf.atr`
* R2 route (level 4) `boss-art-a-r2-boss-route-level4-b0352e47.atr`
* R3 route (level 7) `boss-art-a-r3-boss-route-level7-37166889.atr`
* R4 route (level 10) `boss-art-a-r4-boss-route-level10-dbfe07f3.atr`

## 8. Recommendation and owner questions

1. **B per boss:** R2 yes (the owner's choice; the core's orange-to-red needs
   it). R1 yes (the lit spine; 2 switches). R4 yes (3 switches; B costs 212 of the
   456 native M6 had in the boss sector — 2 switches would leave ~342). R3 optional: the change is
   subtle (2 switches), the art untouched — the owner's call.
2. **R1's trim:** rust (proposed) or the rose red of the first draft.
3. **R4's trim:** gold (proposed) — or keep today's grey trim with B only.
4. **Entry:** every region stays ≤ 264 host frames (≤ 300 approved); R2-R4
   leave 16-20 frames under 280 for the banner task.
5. **A second charset** (§3.5): not needed now; if a later look needs it, it
   needs a resident restore — an owner decision.

## 9. The owner's look at Phase A (decision AV, 2026-10-16) and the corrections

The owner's choices: B for R1, R2 and R4 (R4 with 2 switches, to keep about
342 native cycles for M6); **R3 exactly as today**; R1 rust, R4 gold; R2
redrawn closer to R3's recipe; the boss entry's standing limit is now **300
host frames** (decision **AV** pt 5, replacing 280 from **AM**; the gates move in
Phase B).

### 9.1 What changed (`b13ed43` and this commit)

* **R3** — `region-3/modules.json` is main's again: no row palette, the data
  byte-identical to main's (every run compared), no frame hook, no B cycles.
* **R4** — the violet bulk's step `$64 → $62` moved from row 2 to row 3:
  switches at rows 1 and 3 (2, was 3); the gold trim unchanged.
* **R2** — the trim is now a saturated green (`$C8` on the track, `$C6` at the
  guns, `$C4` at their muzzles; hue C, 90° from the ally steel `$88`) drawing
  every outline and shadow edge; the armour row's COLPF1 steel grey `$04`, so
  the locked bars stay grey. The laser cannons are one armoured turret (a
  chamfered body with one armour plate, a collar, the barrel down columns 2-5
  lit on the left, the muzzle at the foot); locked, plain light steel; open,
  the plate and the muzzle amber. The rail pods carry a 6-pixel amber visor in
  a trim frame, a 2×2 red lamp set in lit steel, a lit top and left edge, the
  trim shadow on the right, an amber muzzle. Kept: the dome, the core (amber
  top, red below), the hazard-striped rail ends, the olive track. 3 switches
  (rows 1, 3, 4; was 4). 89 codes, 6 charset sectors.
* Mechanics: `boss-art-mechanics.mjs` identical to main in all four regions;
  rules (`boss-art-rules.mjs`): every row's flash pair ≥ 84, every colour
  ≥ 68° from the ally steel (R2's green 90°).

### 9.2 Measurements (M, candidate and route builds at `b13ed43`'s art)

Stress = the harness's worst reachable frame (it counts the band DLI's phase 0
with the frame hook) + the switch DLIs (`measure-boss-row-dli.mjs`: hook 35,
a switch 54, the last 65). M6 headroom = 8,500 − worst reachable.

| | R1 | R2 | R3 | R4 |
| --- | --- | --- | --- | --- |
| row switches (Phase A → now) | 2 → 2 | 4 → **3** | 2 → **0** | 3 → **2** |
| B's native cost a frame | 154 | 227 → **208** | 154 → **0** | 208 → **154** |
| stress worst reachable, main → Phase A → **now** | 6,996 → 7,154 → **7,154** | 7,723 → 7,989 → **7,935** | L7 7,771 → 7,929 → **7,775**; L9 8,025 → 8,183 → **8,029** | 8,044 → 8,256 → **8,202** |
| M6 headroom (8,500 −), main → **now** | 1,504 → **1,346** | 777 → **565** | L9 475 → **471** | 456 → **298** |
| boss entry, host frames (≤ 300) | **249** | **260** | **260** | **264** |
| boss frames worst fence margin, main → **now** | 15,370 → **14,935** | 11,965 → **11,337** | 13,095 → **13,095** | 9,407 → **8,987** |
| boss frames DMA-on max (≤ 32,568) | **27,580** | **27,999** | **27,897** | **28,503** |

0 misses, 0 extra VBIs, 0 DLI errors on all four route sessions (HARD, 3,000
frames). R3's +4 cycles over main are not B (it has none; the same +4 was in
Phase A's R3 figure; not traced). The entry's +4 frames on R2-R4 is slot C's
14th sector (shared).

**Correction:** Phase A's "2 switches leave about 342" for R4 was wrong — it
left out the frame hook's 35 cycles. Measured: **298**. One switch (rows 0-2
`$EA`/`$64`, rows 3-4 `$E8`/`$62`; preview `region-4-one-switch.png`, almost
indistinguishable) costs 100 a frame: about **352** left. The owner decides.

### 9.3 Builds

* R2 route (level 4) `build/play/boss-art-a2-r2-boss-route-level4-b872b056.atr`
* R4 route (level 10) `build/play/boss-art-a2-r4-boss-route-level10-68b7b005.atr`
* full game (candidate) `build/play/boss-art-a2-full-game-71d065b2.atr`

Previews: `node scripts/boss-art-preview.mjs --main=<main's drafts>
--phase-a=<Phase A's drafts>` → `region-N-review.png` (today / Phase A / now).
