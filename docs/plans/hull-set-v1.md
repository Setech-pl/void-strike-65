# Plan — capital hull set v1: one allied hull, four enemy styles by region

**PLANNING session, 2026-09-22.** Branch `docs/plan-hull-set` from `main` at
`0fb4a52` (`assets(hulls): hull set v1 drafts — allied B + enemy R1-R4`),
worktree clean. **Nothing here is implemented; this document is the
deliverable.** Every address, size and count below is MEASURED from
`build/void-strike-65.map`, `build/sector-reader.map`, the source at that HEAD,
`assets/graphics/hull-drafts/hull-set-v1.json` and `scripts/capital-hulls.mjs`
unless labelled ESTIMATE.

Owner decisions this plan serves: **F** (parametric capital variety,
2026-09-20), **AA** (one allied hull per game, four enemy styles by region,
budget split 7 + 7, 2026-09-21) and the owner-approved preview
`set-B-sheet.png` committed at `0fb4a52`.

> **Amended 2026-09-22 by owner decision AC (documentation only; no figure in
> this plan is re-measured).** The campaign is **twelve levels, four regions of
> three**, so every `levels [a,b]` range above and below now reads **R1 1-3,
> R2 4-6, R3 7-9, R4 10-12** instead of 1-4 / 5-8 / 9-12 / 13-16. Four styles,
> one per region, unchanged — the point of three-level regions is that all four
> are reached inside 1.0. AC also **settles §8 and §12 item 1**: the allied
> steel is `$88` on levels **1-6** and a darker step on **7-12**; see §8.
> Byte counts, glyph budgets and sector figures are untouched, because region
> *length* does not change what a style costs.

---

## 0. Precondition evidence

| # | Precondition | Result |
| --- | --- | --- |
| 1 | `git status --porcelain` empty on `main` | **PASS** (0 lines) |
| 2 | `assets/graphics/hull-drafts/` tracked, holds `hull-set-v1.json` and `set-B-sheet.png` | **PASS** — six tracked files (`allied_lines.py`, `export_set.py`, `final_set.py`, `hull-set-v1.json`, `set-B-sheet.png`, `set_b.py`); the `.py` files are provenance only |
| 3a | `npm test` on the **default** build links, release gate green, evidence binds | **PASS** — `node scripts/build.mjs --quiet` linked the default target; `tests/runtime-evidence-binding.test.mjs` 2/2 green ("binds to the artifacts in dist/", "no UNRECORDED gate failure"); `tests/release-gate-semantics.test.mjs` 5/5 green; `gate.timing_and_dli_passed = true`, 40 recorded failures in `docs/recorded-gate-failures.json` |
| 3b | Failure count matches the documented pre-existing set | **PASS on count** — 792 tests, 680 pass, **109 fail**, 3 todo, 211.5 s. STATUS's last count-carrying entry records **109** ("764 tests, 109 failures, 0 new against the `307bcd1` list"); every later entry records "0 new". No name list is committed anywhere in the repo, so the 109 names are recorded in Appendix A as this session's evidence |
| 3c | `git status --porcelain` empty after the run | **LITERAL FAIL, documented behaviour** — the run modified three tracked files: `docs/media/assets/debris-and-pickups.png`, `docs/media/assets/weapons-and-effects.png`, `docs/media/manifest.json`. STATUS ("Full-suite failure baseline") states: "Running the suite regenerates tracked media … those are restored with `git checkout` and are not part of this session's commits." Restored with `git checkout -- docs/media`; tree clean afterwards. The manifest diff re-binds the media to the current artifacts (XEX `6ea87181…` → `9d401b21…`), i.e. the committed media manifest is one artifact generation behind — a separate housekeeping item, not a hull matter. **Flagged for the owner**: as written, precondition 3c can never pass on this repository |
| 4 | `main` hash and XEX SHA-256 | `0fb4a527d1eb9f342cd5af1dd4ae9b7d38159ad3`; `dist/void-strike-65.xex` 28,175 B, SHA-256 `9d401b21d5404eaedf2fdc5e8773394d2460958ec0dcf99d3616c19e58ce3906`; ATR `aab9fec5148252faad97d43adf9b12d468043190325504177f2b718f72a97c52`. Both equal the `artifacts` block of `docs/runtime-wall-trace.json` |
| 5 | Menu twinkling stars on `main`? | **NO** — no `tests/menu-stars.test.mjs`, no STATUS entry. `docs/diagnostics/menu-stars-resident-space.md` (BLOCKED_RESIDENT_SPACE, 308 B needed) names the reserves that feature would consume: `LOADER_SPLASH_CODE_SLACK` 56 B (MAIN), `PICKUP_CODE` tail 89 B (`$8B0E-$8B66`), the `STARFIELD` free tail 114 B (`$5D94-$5E05` at `1fa7e7e`), plus `A2_KERNEL` tail 19 B, extension tail 16 B, `ENTITY_CODE` tail 5 B, `BROADSIDE` tail 3 B. **This plan takes 0 bytes from any of them** (§3.4) |

MEASURED link-map facts this plan leans on (at `0fb4a52`): `CODE`
`$2000-$317D`, `RODATA` `$317E-$3FFF` (**MAIN free = 0 B**, RODATA ends at
`$3FFF` exactly), `STARFIELD` `$54E4-$5CA9` (reserved through `$5E0F`),
`BROADSIDE` `$5E10-$780C` (3 B tail), `PICKUP_CODE` `$8776-$8B0D`,
`SECTOR_READER` `$A000-$A5B9` (1,466 B used, **70 B free** to `$A5FF`),
`LEVEL_BUFFER` `$A600-$B5FF` (32 sectors, owner decision X), level-1 image
**7 sectors** (`levelOneSectors = 7`, `scripts/build.mjs:176`): header 8 B,
gameplay music sectors 1-5 (`$A608-$A87F`, 120 B reserved free), header byte 7
= **6** (first LevelDef sector), sectors 6-7 an inert pattern.

---

## 1. The draft, verified against the JSON (JSON wins)

### 1.1 Facts confirmed

* Glyphs are ANTIC 4 cells, 4×8, values 0-3; patterns authored in allied
  orientation (corridor edge = column 8 of a 9-column map row); the enemy side
  is the horizontal mirror at build time; enemy turret cells (`T:turret_*`)
  are the existing core `enemy_turret_*` glyphs (codes 77-80).
* Charset range 59-89 = 31 codes: **17 core codes** — allied turret 66-69,
  enemy turret 77-80, `allied_launch_flash` 81, `enemy_launch_flash` 82,
  `allied_engine_energy` 83, `enemy_engine_energy` 84, `allied_prow_edge` 85,
  `enemy_prow_edge` 86, `capital_explosion_core/fire/ember` 87-89 — and
  **14 surface codes**: allied 59-65, enemy 70-76. The v1 layout already holds
  exactly 7 + 7 surface slots, so **no core code has to move** (§2.2).
* Per-level budget re-count from the maps (script in the session, the
  `T:` cells excluded, the blank `deck` counted once because it is the only
  mirror-invariant glyph shared between the factions):

| Level set | Allied surface | Enemy surface (declared) | Shared with allied | Enemy-only | **Total** | ≤ 14 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| allied B + R1-slab (levels 1-3) | 7 | 6 | 1 (`deck`) | 5 | **12** | yes |
| allied B + R2-rib-launchers (4-6) | 7 | 8 | 1 | 7 | **14** | yes |
| allied B + R3-thick-band (7-9) | 7 | 7 | 1 | 6 | **13** | yes |
| allied B + R4-armour (10-12) | 7 | 7 | 0 (no `deck`) | 7 | **14** | yes |

  Matches the JSON's `totalWithAllied` (12/14/13/14) and the sheet titles.
  `ch_out` is pixel-identical between allied and R1-R3 *before* mirroring
  ("1000"…"1111" white-only), but the enemy uses it mirrored, so it is a
  distinct code; the draft counts it that way too. **No level exceeds 14; the
  enemy-only codes (5/7/6/7) fit the seven enemy slots 70-76.**

### 1.2 Differences between the brief and the JSON — the JSON wins

| Topic | Brief | JSON / code | Consequence |
| --- | --- | --- | --- |
| Pixel value → register | "Value 1 = COLPF1 steel `$84`" | `colourDigits`: **1 = white COLPF0 (`$0E`), 2 = steel COLPF1 (`$84`)**, 3 = COLPF2 amber (`$1E`) / COLPF3 burgundy (`$46`) by bit 7. ANTIC 4 hardware and `src/main.s:7248` agree | The allied hull *body* is value 2, so the open colour decision (§8) is the **`GAMEPLAY_COLPF1`** constant (`src/main.s:525`), not COLPF0 |
| Allied `innerDepthCells` | (not mentioned) | The annotation disagrees with the generator's depth rule (`derivedInnerDepth`: last non-space column + 1) at rows **12, 13, 16, 28**: declared 7/6/5/6, derived **8/7/6/7**. The author's `profile()` counts a retreating-chamfer row's `ch_in` cell as outside the depth | The v2 asset **derives** depth from the map, as v1 does; the annotation is dropped. Collision then sits at the outer edge of the `ch_in` cell (4 px further into the corridor than the annotation implies) on those rows — the same convention v1 uses for `allied_inner_edge`. Informational, not a STOP |
| Enemy `innerDepthCells` | — | absent (deleted by `export_set.py`) | derived, as above |

### 1.3 Where the draft cannot be represented under today's contracts

Two classes. The first is a generator-only rule and is relaxed by this plan;
the second touches the runtime and is **OWNER_DECISION_REQUIRED** before the
affected step (it does not block the allied hull, R1 or R4).

**(A) v1 contour invariants (`scripts/capital-hulls.mjs:821-830`, asserted by
`tests/capital-hulls.test.mjs` "coherent contours").** No document states
these rules; they exist only in the generator and its test. Every draft map
breaks at least one:

| Map | Depth set | Transitions (≤ 8) | Cyclic runs (each 2..8) | Breaks |
| --- | --- | ---: | --- | --- |
| allied B | 5,6,7,8 | 8 | 1,7,1,3,5,1,6,8 | runs of 1 |
| R1 | 5,6,7,8 | 8 | 1,3,5,1,6,1,2,13 | runs of 1; run of 13 |
| R2 | 5,6,7,8 | **10** | 1,2,7,1,2,1,3,1,1,13 | transitions; runs of 1; 13 |
| R3 | 5,6,7,8 | 8 | 7,2,2,7,1,1,2,10 | runs of 1; run of 10 |
| R4 | **6,7,8** | 6 | 3,7,1,3,5,13 | no depth 5; runs of 1; 13 |

  The one-row runs *are* the 45° chamfers the owner approved. **v2 keeps the
  hard rule `5 ≤ depth ≤ 8`** (the player-vs-hull fast path
  `player_inside_universal_hull_corridor`, `src/main.s:7132`, assumes depth ≤ 8
  plus one projection cell: `$54..$AC`) and **drops** the transition count,
  the run-length window and the "all four depths" rule. Runtime cost of the
  relaxation: 0 — the runtime never inspects contour statistics; it reads
  per-row boundary tables (§4).

**(B) Turret muzzles off the projection column — runtime contract.** The
runtime recognises a turret only through the projection cell: column 8 for
the allied side, column 31 for the enemy (`track_top_muzzles`,
`src/main.s:6398`, compares those two cells with
`CAPITAL_HULL_*_MUZZLE_CODE`; `advance_tracked_muzzles` derives the tracked
address from `CORRIDOR_CENTRAL_FIRST` / `CORRIDOR_CENTRAL_END-1`; the
scheduler fires from the tracked cell; the generator enforces
`muzzleColumn === 8/31`, `scripts/capital-hulls.mjs:862-864`). The provenance
builder places a turret's muzzle at `D[row]` (`final_set.py: turret(g, row,
D[row]-4)`), i.e. one cell beyond the hull depth of that row, so a turret on a
depth-8 row lands on column 8 and any other turret is **recessed**:

| Style | Turret rows (base ring / muzzle row) | Muzzle column | Under today's runtime |
| --- | --- | ---: | --- |
| allied B | 8-10 / 9 | **8** | fires |
| R1 | 18-20 / 19 | **8** | fires |
| R2 turret 1 | 1-3 / 2 | **8** | fires |
| R2 turret 2 | 25-27 / 26 | **7** | never tracked, never fires; generator rejects it |
| R3 turret 1 | 12-14 / 13 | **6** | never tracked; **R3 has no firing turret at all** |
| R3 turret 2 | 24-26 / 25 | **5** | as above |
| R4 turret 1 | 12-14 / 13 | **8** | fires |
| R4 turret 2 | 27-29 / 28 | **8** | fires (identical drawing to turret 1) |

  A second, independent contract: **one turret module per side**
  (`turretLayout.turretModule`, `scripts/capital-hulls.mjs:405-417`; one
  8-row module whose muzzle sits at local row 0 or 1, stamped by the seeded
  layout 10/15/20 times along the 480-row sector; `select_sector_module`,
  `src/main.s:6609`, substitutes exactly one module id). A second turret
  drawing per style is therefore unused by the runtime unless the selector
  learns a second turret module.

  **OWNER_DECISION_REQUIRED (D1, D2, D3) — see §12.** Compliant options,
  costed:

| Option | Player-visible effect | Bytes | Cycles | Risk |
| --- | --- | --- | --- | --- |
| (a) **Move the recessed turrets outward** so each muzzle lands on column 8: the emplacement stands proud of the wall as a gondola (this *is* decision F's "gondola protrusion") | R2 turret 2 protrudes 1 cell, R3 turrets 2-3 cells; the thick-band look is kept behind them | 0 code; data only | 0 | Low. Art deviates from the sheet on those rows |
| (b) **Teach the runtime a recessed muzzle**: a per-side muzzle column byte read by `track_top_muzzles`, `advance_tracked_muzzles`, the launch-X derivation and the boundary-star guard; generator relaxes `muzzleColumn` | Exactly the sheet | ESTIMATE **30-40 B `BROADSIDE`** (free tail 3 B; the retired 16-B enemy codebook, §3.4, does not cover it — a BROADSIDE reclaim is needed) + ~10 B generator | ESTIMATE +6-10 cycles per hull-row publication, ~0 per frame | Medium-high: muzzle publication/backing is hardware-critical (`AGENTS.md`), proof and measurement before integration; `prepared-hull-row` and muzzle-backing tests re-review |
| (c) **Keep the recessed emplacements as decoration** and give R3 one projecting turret on one of its depth-8 rows (5-11) | R3 shows three gun shapes, one of them fires; R2 turret 2 stays a shape | 0 code; data + one relaxed generator invariant ("one muzzle glyph per station") | 0 | Low; a gun that never fires is an owner-visible compromise |
| (d) For D3 only: **second turret module** selected by the two free bits 4-5 of the sequence byte (`select_sector_module` masks `$0F` and `$C0`) | Two different emplacements alternate along the ship | ESTIMATE +8 B `BROADSIDE` | +~6 cycles per resolved hull row | Low-medium; only worth it with (b) or when R2's two drawings differ, which they do |

  Recommendation: **(a) for R2 turret 2 and (c) for R3**, both data-only, so
  no BROADSIDE byte is spent before 4.6 sets its cycle budget; (d) deferred.
  Steps 1-2 (§11) are unaffected: allied B, R1 and R4 are exact.

---

## 2. Data format — capital-hulls v2

### 2.1 Schema (`assets/graphics/capital-hulls.json`, `formatVersion: 2`)

```text
formatVersion 2, displayMode "ANTIC 4", charsetBaseIndex 59, segmentRows 32
core:      the 17 core glyphs, each with a FIXED index (66-69, 77-89), unchanged bytes
allied:    glyphs[7] (allied orientation, values 0-3), map[32] (9 columns, column 8 = projection),
           turret {segmentRow 9, muzzleColumn 8, footprint}, sector modules/sections, engineBank,
           prowProfile (occupancy as today, fillGlyph "solid"), turretLayout (seed, counts, spacing)
shared:    glyphs with faction "shared" — only all-zero glyphs allowed ("deck"); index 65
enemyStyles[4]: { id "R1".."R4", levels [1,3] .. [10,12],
           glyphs[≤7] authored in ALLIED orientation, mirror: true,
           map[32] authored in allied orientation, mirror: true,
           turret {segmentRow, muzzleColumn 8 (allied-oriented), footprint},
           engineBank rows/overlay, prowFillGlyph, moduleWindows (normalised, §3.2) }
broadside, turretTypes: unchanged from v1
```

The v2 file is **generated once** from `hull-drafts/hull-set-v1.json` by a
committed converter (`scripts/hull-set-import.mjs`, rule 12: source, steps
and rebuild instructions in Git) and then owned by the repo; the draft JSON
stays as the reviewed source and a test (§10 T1) pins the compiled pixels and
map cells to it, so the art cannot drift silently.

### 2.2 Compile model

`compileCapitalHulls(definition)` compiles **four level hull sets**, one per
style: allied ∪ shared ∪ style *n*, each through the existing 480-row sector
model (sections, seeded turret layout, prow, engine overlay) and the existing
packed-map/codebook/boundary emitters. The mirror step turns each enemy glyph
row `abcd` into `dcba` and each map row `[c0..c7, p]` into `[p, c7..c0]`, which
is exactly the v1 enemy orientation (column 0 = projection = screen column
31). Outputs:

* **resident include** (`build/capital-hulls.inc`, macros as today): allied
  glyph bytes at 59-65, core bytes 66-69 / 77-89, *placeholder* (style R1)
  bytes at 70-76 so the assembled charset stays 1 KB and byte-defined; allied
  packed map + codebook, allied tables; the **enemy resident packed map and
  codebook are retired** (§3.4);
* **four hull blocks** `build/hull-style-R{1..4}.bin`, 280 B each (§3.1);
* the level → style mapping `style(level) = floor((level − 1) / 4) + 1` lives
  in `scripts/build.mjs` next to `levelRuns`; the level image builder embeds
  the block for its level. **The selector is build-time data; the runtime
  carries no selector and no table (0 B).** The block's first byte echoes the
  style id for tests and diagnostics, and LevelDef byte 8 `hull_variant`
  (design-4.6 §1.1) will carry the same value when 4.6 lands.

### 2.3 Code assignment inside 59-89 (nothing moves)

| Code | v1 | v2 | Loaded |
| ---: | --- | --- | --- |
| 59 | `allied_plate_mass` | allied **`solid`** — also `CAPITAL_HULL_ALLIED_PROW_FILL_CODE` | resident |
| 60 | `allied_plate_edge` | allied `wall` | resident |
| 61 | `allied_plate_lip` | allied `wacc` | resident |
| 62 | `allied_vertical_rib` | allied `ch_in` | resident |
| 63 | `allied_vent` | allied `ch_out` | resident |
| 64 | `allied_service` | allied `line` | resident |
| 65 | `allied_inner_edge` | **`deck`, faction shared, all-zero**, bit 7 clear on both sides | resident |
| 66-69 | allied turret base/housing/barrel/muzzle | unchanged | resident |
| 70 | `enemy_slab_mass` | style **mass** glyph (`solid`, R4 `fill`) — also `CAPITAL_HULL_ENEMY_PROW_FILL_CODE` (`src/integration-glue.s:140`, a byte at a pinned ABI address, so it must be the same index in every style) | **per level** |
| 71 | `enemy_slab_void` | style `wall` | per level |
| 72 | `enemy_vertical_rib` | style `wacc` | per level |
| 73 | `enemy_slab_cap` | style `ch_in` | per level |
| 74 | `enemy_seam` | style `ch_out` | per level |
| 75 | `enemy_sensor` | R2 `rib` / R3 `edge_in` / R4 `groove_v` / R1 blank | per level |
| 76 | `enemy_inner_edge` | R2 `vent` / R4 `groove_h` / R1, R3 blank | per level |
| 77-80 | enemy turret | unchanged | resident |
| 81-89 | flashes, engines, prow edges, explosion | unchanged | resident |

The generator invariant that forbids a glyph shared between factions is
`scripts/capital-hulls.mjs:809-811` ("uses … from the other faction") together
with the bank rule at `:766-768`. v2 change: a glyph may declare
`faction: "shared"`; the compiler enforces that every pixel is 0 (so the bank
bit is irrelevant) and lets both maps reference it; its screen code is the
index with bit 7 clear. Runtime consequences: none — an all-zero glyph draws
black in either bank, and both hull-code scans mask bit 7 (`and #$7F`, §4).

---

## 3. Loading — how a region's enemy glyphs reach the charset

### 3.1 The hull block in the level image (280 B, 3 sectors)

| Offset | Bytes | Content |
| ---: | ---: | --- |
| 0 | 1 | style id 1-4 |
| 1 | 1 | block format version |
| 2 | 14 | reserved (zero; room for a `hull_params` echo when decision F's parameters arrive) |
| 16 | 160 | enemy packed map, 32 rows × 5 bytes (as `EMIT_ENEMY_HULL_PACKED_MAP` today) |
| 176 | 16 | enemy codebook |
| 192 | 56 | glyph bytes for codes 70-76 |
| 248 | 32 | enemy collision boundaries (one byte per segment row) |
| **total** | **280** | in sectors 6-8 of the level image (`$A880-$A997`), 104 B sector padding |

Owner decision AA item 5 set a design ceiling of ~700 B per enemy style for
"glyphs + enemy map"; the block is **280 B** (four styles on disk = 1,120 B,
against decision F's 4 × 1,253 B for pairs).

What is *not* in the block, and why: module source rows (96 B), the module
sequence (60 B), the engine overlay masks (8 B), the prow occupancy and prow
boundaries (2 × 32 B) and the turret record (7 B) stay **resident and
identical across styles** because §3.2 normalises them.

### 3.2 Normalisation that keeps the resident tables style-independent

The 32-row segment is a cyclic texture (every v1 contour rule was cyclic, and
the runtime addresses rows modulo the module tables), so the converter
**rotates each enemy style's rows** so that its firing turret's muzzle sits on
a fixed segment row (the allied convention: base ring 8-10, muzzle row 9),
then uses one fixed set of module windows for all styles: `combat_0` rows
0-7, `combat_1` (turret) rows 8-15, `combat_2` (disabled substitute) rows
16-23, `combat_3` rows 24-31, and the aft/prow/engine modules as fixed row
picks. Consequences: the enemy sequence, module sources, turret record
(`segmentRow`, `muzzleScanlineOffset 4`, `muzzleScreenCode`) and prow tables
are the same bytes for R1-R4 and stay where they are; only the four items of
§3.1 differ per style. The engine-bank rows and overlay columns are re-picked
per style by the implementer within rows of depth ≥ 7 (the draft draws no
engines; the v1 invariant "engine energy cannot create collision in an empty
hull cell", `scripts/capital-hulls.mjs:613`, still applies) — routine data,
§6.

### 3.3 When and how it is copied

`start_gameplay` already calls `unpack_capital_hull_maps` (`src/main.s:2528`)
on every gameplay start, after the level buffer is valid on both media (XEX:
the level-1 image is an XEX-only block at `$A600`; ATR: read over SIO at
START GAME by the reader, `sector_reader_start_gameplay` → `start_gameplay`).
v2:

1. the **enemy half of `unpack_capital_hull_maps`** takes `src_ptr` /
   `frontend_data_ptr` from the level block (`$A890`, `$A930`) instead of
   `enemy_hull_packed_map` / `enemy_hull_codebook` — **operand-only, 0 B**;
   destination `$4D20` (`CAPITAL_HULL_RUNTIME_ENEMY`) unchanged;
2. a new resident routine `publish_level_hull_style` copies 56 glyph bytes to
   `CHARSET + 70*8` = **`$4630-$4667`** (the gameplay charset is populated
   once at boot by `copy_charset`, `src/main.s:3232`, and patched at gameplay
   start by `install_entity_effects_glyph` already, so this is the established
   pattern) and 32 boundary bytes into `enemy_collision_boundaries` (a
   `BROADSIDE` RAM table, `src/main.s:7451`); then tail-jumps into the unpack.
   ESTIMATE **26-30 B**: two `ldx / lda abs,x / sta abs,x / dex / bpl` loops
   (11 B each) plus `jmp` (3 B) and the operand edits.

Cycle cost, ESTIMATE, **once per level start**, on the loader screen, outside
any visible-frame budget: glyph copy ≈ 56 × 13 = 730; boundary copy ≈ 32 × 13
= 420; the enemy unpack is unchanged (≈ 32 × 5 × 45 ≈ 7,200, as today). No
per-frame path changes (§9).

### 3.4 Where the code lives — 0 net resident bytes, no address moves

MAIN has **0 B** free (RODATA ends `$3FFF`). The `enemy_hull_packed_map`
(160 B in `RODATA`, `src/main.s:7411`) becomes dead data once the block
supplies the map, and `enemy_hull_codebook` (16 B in `BROADSIDE`,
`:7435`) with it. **`publish_level_hull_style` is placed in the 160-B RODATA
range the retired map occupied**, in place: every CODE/RODATA/BROADSIDE label
keeps its address (the `LOADER_SPLASH_CODE_SLACK` note at `docs/STATUS.md`
"Zero resident bytes" records why sliding addresses is not free: page
crossings moved the heaviest frame by 17 cycles), the packed resident image
keeps its size (transport 0 Δ, ESTIMATE — verify in `build/manifest.json`),
and the remainder of the 160 B is held as a named pin
(`HULL_LEVEL_PUBLISH_SLACK`, ~130 B) with the same "delete deliberately
against a re-measured baseline" rule as the splash slack. The 16-B codebook
becomes a `BROADSIDE` reserve. **Nothing is taken from `PICKUP_CODE`, the
splash slack, the `STARFIELD` tail, the arena or the reader tail**, so the
menu-stars costing and the music-v2 reservation stay valid.

Fallback if measurement contradicts the in-place placement (it should not):
the `SECTOR_READER` link has 70 B free (`$A5BA-$A5FF`), a 4th frozen vector
(`$A009`, "append, never reorder") can host the routine, and `start_gameplay`'s
existing `jsr unpack_capital_hull_maps` becomes `jsr SECTOR_READER_HULL`
(operand-only). Cost: the reader record is LZ-transported, so +30 B raw may
or may not add a sector — and one extra transport sector is exactly what
trips the boot-smoke frame-300 checkpoint (3 frames of margin). Measure
before choosing it.

### 3.5 Q-1 and the level buffer (`LEVEL_BUFFER` 16 vs 24 sectors)

The Q-1 costing in `docs/plan-4.6-placement.md` §"What the buffer must hold"
assumed **1,253 B of hull art per level** (a full allied + enemy pair). Under
decision AA and this plan the per-level hull payload is **280 B + 104 B
padding = 3 sectors**. Re-costed worst case per level (MEASURED where marked):

| Item | Bytes | Sectors | Label |
| --- | ---: | ---: | --- |
| header | 8 | (in 1) | MEASURED |
| gameplay music, reserved | 632 | 5 | MEASURED (`gameplayMusicCapacityBytes` + header) |
| hull block | 280 (+104 pad) | 3 | this plan |
| LevelDef core page | 256 | 2 | ESTIMATE, design-4.6 §1.1 |
| LevelDef payload page | 256 | 2 | ESTIMATE |
| **worst case** | **1,536 B used** | **12** | |

Sixteen sectors (2,048 B) leave 512 B; twenty-four leave 1,536 B. **The hull
set does not force the 24-sector answer**; Q-1 remains a music/4.6 question
and this plan is compatible with either answer. Header byte 7 (first LevelDef
sector) moves **6 → 9**; level 1 grows **7 → 8 sectors** (the two inert
pattern sectors are consumed and one is added); the XEX-only block grows by
128 B; the ATR START GAME read grows by one sector ≈ **4 frames** at the
plan-4.3 model of 3.8 frames/sector; **0 boot sectors, 0 chunk slots**; the
boot-smoke frame-300 checkpoint is on the boot path and is untouched
(MEASURE: boot smoke 8/8 is a gate in step 2 anyway).

`STARFIELD`: untouched (MEASURED link `$54E4-$5CA9`; its tail through `$5E0F`
is claimed by the music-v2 reservation and by the menu-stars costing, and this
plan needs none of it).

---

## 4. Collision — one contiguous range, unchanged

Three consumers, all MEASURED in source:

1. **Shot-vs-hull impact**, `broadside_hits_opposite_hull` (`src/main.s:9002`):
   walks the screen row from column 31 outward (enemy target) or from column 8
   inward (allied) and takes the first cell whose `(code & $7F) >= 59`
   (`CAPITAL_HULL_GLYPH_BASE`) — a lower bound only; the upper neighbour is
   guarded by `.assert INTERCEPTOR_PROJECTILE_GLYPH_BASE >= 59+31`
   (`:821`).
2. **Capital-hull explosion overlay** (`:8690-8760`): a cell is overwritten
   only if `59 ≤ (code & $7F) < 90` (the first cell also excludes the fighter
   composite glyph range).
3. **Player-vs-hull contact**, `handle_player_hull_contact` (`:9136`): uses
   the generated per-row `allied/enemy_collision_boundaries` and
   `*_prow_collision_boundaries` tables plus the fast path
   `player_inside_universal_hull_corridor` (`:7132`, `$54..$AC`); **no glyph
   code is inspected**.

Every v2 code stays in 59-89 (§2.3); the enemy window 70-76, the allied
window 59-65 and the shared `deck` 65 are all inside, and bit 7 is masked by
both scans, so the shared blank on the enemy side is a hull cell for (1) and
(2) exactly as `deck` cells behind the wall are today — never the outermost
cell (every draft row ends in `wall`/`wacc`/`ch_in`/`ch_out`, verified by the
session script), so impact geometry follows the visible edge. The per-row
boundary table for the enemy is regenerated per style and travels in the
block (§3.1), so player contact follows the region's contour; the prow
boundaries are style-independent (§3.2).

**If any hull code moved outside 59-89** it would fall out of scans (1) and
(2): shells would pass through the cell and explosions would skip it, and the
three neighbour asserts at `src/main.s:808/820/821` would need re-review. The
plan therefore **forbids moving a code**; T3 (§10) pins it. Depth stays within
5..8 so the fast path's constants remain valid.

---

## 5. Turrets — footprints, positions and the runtime

Footprints per style as drawn (allied orientation; row = segment row, columns
in the 9-column map). In enemy orientation the columns mirror to screen
columns `40 − c − 1` for `c` in 0..7 and the muzzle to column 31.

| Style | base ring | housing | barrels | muzzle | v1 rule "muzzle within one row of the module start" |
| --- | --- | --- | --- | --- | --- |
| allied B | (8,4-6), (9,4), (10,4-6) | (9,5) | (9,6), (9,7) | (9,8) | module rows 8-15, local row 1 ✓ |
| R1 | (18,4-6), (19,4), (20,4-6) | (19,5) | (19,6-7) | (19,8) | rows 18-25 ✓ (rotated to 8-15 by §3.2) |
| R2 t1 | (1,4-6), (2,4), (3,4-6) | (2,5) | (2,6-7) | (2,8) | ✓ |
| R2 t2 | (25,3-5), (26,3), (27,3-5) | (26,4) | (26,5-6) | **(26,7)** | ✗ recessed — D2 |
| R3 t1 | (12,2-4), (13,2), (14,2-4) | (13,3) | (13,4-5) | **(13,6)** | ✗ recessed — D1 |
| R3 t2 | (24,1-3), (25,1), (26,1-3) | (25,2) | (25,3-4) | **(25,5)** | ✗ recessed — D1 |
| R4 t1 | (12,4-6), (13,4), (14,4-6) | (13,5) | (13,6-7) | (13,8) | ✓ |
| R4 t2 | (27,4-6), (28,4), (29,4-6) | (28,5) | (28,6-7) | (28,8) | ✓ (identical to t1; the runtime stamps one module) |

Checked against the runtime (MEASURED): spawn/tracking keys on the projection
cell (`track_top_muzzles`); aim/launch uses the turret record's
`muzzleScanlineOffset` (4, unchanged: every drawing has the muzzle on the
middle row of a 3-row ring) and the tracked cell address; the **launch flash**
(codes 81/82) is written at the tracked muzzle cell and restored from
`MUZZLE_BACKING` — style-independent; the **explosion** (87-89) is a 3×3
overlay keyed on the hull-code range (§4) — style-independent; **turrets are
non-destructible** (decision G), so no HP/lifecycle data changes. The v1 test
"the two sides are deliberately staggered rather than mirrored" pins allied
row 8 / enemy row 12; with §3.2 both sides fire from local row 1 of their
turret module and the existing `sidePhaseRows = 8` keeps the sides staggered
on screen — the test's expectation is re-pinned, not the behaviour.
Mismatches: the three recessed muzzles (§1.3 B) — nothing else.

---

## 6. Procedural vs baked ("F parameters")

| Parameter | Decision F | Today | After this plan |
| --- | --- | --- | --- |
| 32-row texture, wall/chamfer contour, accent rows, emplacement drawing, turret row inside the segment | — | baked in `capital-hulls.json` | **baked by the draft maps** (per style; allied fixed) |
| **Hull length in segments** | 4-step | fixed 480 rows (sections 32/80/256/80/32, `scripts/capital-hulls.mjs:274-280`) | unchanged, procedural in the generator; a level parameter later (design-4.6 `hull_params`) |
| **Turret density** | 4-step | 10/15/20 by difficulty, seeded positions (LCG seed 13) | unchanged, procedural; the 4-step later maps onto the counts table |
| **Maximum gondola protrusion** | 4-step | no gondola concept; depth 5-8 | the drafts bake the contour; a later `hull_params` clip may cap depth. If D1/D2 take option (a), a protruding emplacement is the first gondola |
| Engine bank rows and overlay columns | — | data per side | data per style, implementer's pick on depth ≥ 7 rows (draft draws no engines) |
| Prow taper | — | fixed occupancy masks + edge glyph (core) + fill glyph | unchanged; fill = allied 59 / enemy 70 (style mass) |
| Side phase, module windows, disabled-turret substitute | — | data | normalised (§3.2), identical across styles |

None of the three F parameters is implemented by this plan; the block header
reserves 14 B so a later `hull_params` echo needs no format change.

---

## 7. Owner smoke before the campaign exists

Build flag **`--hull-style=R1|R2|R3|R4`** (npm scripts `hull:style:R2` …),
implemented like `--enemy-palette=`: it is a **review variant**
(`isReviewVariant`, `scripts/build.mjs:105`) — artifacts go to
`build/hull-style-Rn/`, never `dist/`; runtime measurement is skipped; the
manifest's `buildVariant` names it; the runtime evidence and the release
gate are not consulted. The only difference from the default build is the
level-1 image, which carries style *n*'s block instead of R1's: **the
resident image is byte-identical**, so the XEX differs only in its `$A600`
block and the ATR only in the level sectors. The owner plays level 1 four
times. The default build bakes R1 (level 1 ∈ 1-3) and ships as today. Decision
AA item 6 (styles 2-4 `DEFERRED` until the allied + R1 smoke) is honoured by
the step order in §11: the flag costs no code and only reaches R2-R4 data the
generator has already compiled for validation.

---

## 8. Colour — the allied steel, one byte, decided in two halves

> **DECIDED 2026-09-22, owner decision AC.** The allied steel is **not one
> value for the whole game**: levels **1-6** carry the brighter **`$88`**
> (chosen at the step-1 smoke), levels **7-12** a **darker step — `$84` or
> `$86`**, picked at a later smoke. **The enemy colour is unchanged.** Two
> consequences this plan did not budget for, and a later session owes both:
> (a) `GAMEPLAY_COLPF1` stops being a build-time constant and becomes a value
> the **level** selects, which is a small code change plus a level-data field,
> not the one-byte edit §8 assumed below; (b) **`$86` was never one of this
> plan's candidates** — §8 costed `$84`, `$88` and `$8A` — so if the darker
> step lands on `$86` it needs the same shared-`COLPF1` review as the others.
> The paragraph below stands as the description of what the constant is and
> what it shares.

The allied hull body is pixel value 2 = **`COLPF1`**, written every frame by
`gameplay_dli` from **`GAMEPLAY_COLPF1 = $84`** (`src/main.s:525`, write at
`:3496`). The open decision `$88` vs `$8A` is that one constant. Plan: `.ifndef
GAMEPLAY_COLPF1_OVERRIDE` keeps `$84`; a review-variant flag
`--allied-steel=88|8A` passes `-D GAMEPLAY_COLPF1_OVERRIDE=$88` for smoke
builds; the decision, once taken, edits the constant (1 B, no address moves).
What the owner must know before choosing: `COLPF1` is **shared** in the
gameplay field — it also colours every value-2 pixel of the enemy styles
(`wacc` accents, R2 `vent`, the core enemy turret glyphs "2032"), the hostile
`PULSE`/`LASER`/`BOMBER` projectile trails (art-direction: "white `COLPF0` and
steel `COLPF1`, never `%11`"), the Light Wingman/Interceptor steel arms and
the frontend's "structural accents use steel `$84`" rule. `$88`/`$8A` recolour
all of them; `docs/art-direction.md` must then carry the new value.

---

## 9. Runtime evidence and the fence margin

* **What must be re-recorded after each artifact-changing step**:
  `docs/runtime-wall-trace.json` (`build:candidate` → `runtime:wall-trace
  --atari800-source=build/atari800-trace` → `build`, one unbroken default run,
  64/64 + the mode-gated sessions), with `docs/recorded-gate-failures.json`
  **unchanged** (0 new, 0 disappeared) and `tests/runtime-evidence-binding.test.mjs`
  green; boot smoke **8/8** (`boot:smoke`); the PAL timing audit
  (`scripts/pal-timing-audit.mjs`, 64 + 8 replays); the debris visibility
  gate; `docs/boot-deadline-baseline.json` not re-based (0 boot sectors).
  Never hand-edit the SHAs. The showcase test regenerates `docs/media/*`;
  restore it or regenerate it deliberately in its own commit.
* **Current worst fence margin**: `docs/runtime-wall-trace.json` **does not
  carry a fence-margin field** — it records `gate.measured_wall_cycles_dma_on
  = 31,216`, `measured_physical_headroom = 4,352`, `maximum_wall_cycles =
  32,568`. The line-238 fence margin comes from the PAL audit and is recorded
  in STATUS: **979 cycles** at `director-complete-2-natural-sweep-fire0`
  f6,629 for `main` with the Heavy break-up (A/B'd against 1,985 on
  `8a4fb1b`); the accepted checkpoint table still shows 1,464
  (`raider-remnant-rapid-xex-hard` row 1945). GO threshold 500 → **479 cycles
  of headroom** for anything the hull work adds in-frame.
* **Expected effect: 0 cycles in-frame (ESTIMATE).** `draw_hull_row`,
  `scroll_hull_columns`, `prepare_hull_cells`, the muzzle tracker, the prow
  glue and the collision resolvers execute the same instructions on different
  data; the only code edits are two operands in `unpack_capital_hull_maps`
  and a level-start routine. Second-order, data-dependent: the
  `broadside_hits_opposite_hull` scan runs one iteration per empty column
  before the first hull cell, so a depth-5 row costs ≈ 3 iterations (~40
  cycles) more than a depth-8 row on a frame with a live shell — inside the
  noise of the audit. No address moves (§3.4), so no page-crossing drift.
  **MEASURE after step 2**; expected binding row unchanged, 979 ± 50. Option
  (b) of §1.3 would be the only in-frame cost and is not recommended.

---

## 10. Tests — each must FAIL on `0fb4a52` and pass after its step

| # | Test (file: name) | Fails today because | Step |
| --- | --- | --- | --- |
| T1 | `tests/hull-set-v1.test.mjs`: "every compiled style reproduces the draft's glyph pixels and map cells, enemy mirrored" | no v2 compile, no styles | 1 |
| T2 | same file: "each level hull set uses ≤ 14 surface codes with the shared deck counted once (12/14/13/14)" | function absent | 1 |
| T3 | same file: "every hull screen code of every style lies in 59..89 and the 17 core codes keep their v1 indices and bytes" | styles absent | 1 |
| T4 | same file: "the allied map, codebook, packed bytes and boundaries are identical across all four level hull sets" | absent | 1 |
| T5 | `tests/capital-hulls.test.mjs`: "a shared glyph must be all-zero and is the only glyph both factions may reference" (throws on a non-zero shared glyph) | `faction: "shared"` rejected | 1 |
| T6 | `tests/level-hull-block.test.mjs`: "the level-1 image carries the R1 hull block (280 B, style id 1) at sector 6 and header byte 7 is 9" | byte 7 = 6, no block | 2 |
| T7 | same file: "start_gameplay publishes the level's enemy glyphs into `$4630-$4667` and unpacks `$4D20-$4E3F` from the block" (resident routine run under the existing 6502 harness, as the charset test does) | routine absent | 2 |
| T8 | same file: "`enemy_collision_boundaries` equal the block's boundaries after start_gameplay; no resident enemy packed map remains" | resident map present | 2 |
| T9 | `tests/build-variants.test.mjs`: "`--hull-style=R3` bakes the R3 block, is a review variant and never writes dist/" | unknown flag | 2 |
| T10 | `tests/level-hull-block.test.mjs`: "the ATR START GAME read is 8 sectors" (updates `gameplay-music-placement` "+5 sectors and no more") | 7 today | 2 |
| T11 | `tests/allied-steel.test.mjs`: "`gameplay_dli` writes `GAMEPLAY_COLPF1 = $84` by default and follows `--allied-steel`" | flag absent | 4 |
| T12 | `tests/hull-set-v1.test.mjs`: "R2/R3 turret placement matches the recorded owner decision D1/D2" | decision not taken | 3 |

Existing tests that change (must be re-pinned in the same step, each with
its reason in the test): `capital-hulls.test.mjs` "31 glyphs fit the charset"
(codes 70-76 compared to the level block, not the resident image), "generated
include … match assembled bytes" (enemy resident map/codebook retired),
"coherent contours" (rules of §1.3 A), "turret metadata …" (rows per style),
"accepted H4.2 C INDUSTRIAL armour remains steel-led…" (superseded by decision
AA; replaced by a set-B ratio test: allied value-2 share 98/224, value-1
44/224; enemy value-3 share R1 90/192, R2 98/256, R3 114/224, R4 162/224),
"assembled ANTIC 4 screen codes route…" (glyph names), "runtime map
reservation … `packedDataBytes` 1005"; `capital-hull-extension.test.mjs`
station-layout pins per style; `broadside-fire.test.mjs` muzzle/warning tests
that read turret rows; `prepared-hull-row.test.mjs`; the
`gameplay-music-placement` sector pin. `tests/runtime-evidence-binding.test.mjs`
stays in every focused set.

---

## 11. Implementation split — one branch, one owner smoke per step

Each step: its own `feat/` branch from `main`, an Opus Medium session,
focused tests first (red), then `npm test` on the **default** build before
reporting gates, evidence regenerated at the end of any step that changes
artifacts, `OWNER-SMOKE CANDIDATE` on exit.

| Step | Branch | Scope | Gates | Owner smoke point |
| --- | --- | --- | --- | --- |
| **1** | `feat/hull-v2-generator` | converter + v2 JSON; generator: shared deck, mirror, styles, relaxed contour, four level sets, block emitter to `build/`; resident include carries **allied B + core + R1 in the v1 resident path** (both maps still resident, runtime untouched). T1-T5 + re-pins. Artifacts change (allied art) → evidence regenerated | `npm test` default; PAL audit (expected neutral); boot smoke 8/8 | **#1: allied B + R1 in game** — decision AA item 6's first smoke |
| **2** | `feat/hull-level-block` | level image hull block, header byte 7 → 9, `publish_level_hull_style` in the retired RODATA range, enemy unpack from the block, retire resident enemy map/codebook (pins), `--hull-style` flag + npm scripts, `docs/memory-map.md` (level image layout, RODATA pin, BROADSIDE reserve). T6-T10 | `npm test` default; boot smoke 8/8; PAL audit binding rows (979 ± 50); `manifest.json` transport Δ = 0 | **#2: default = R1 (identical look to #1); R2 (turret 1) and R4 via the flag** |
| **3** | `feat/hull-styles-r2-r3` | after owner decisions D1-D3: R2 turret 2 and R3 turrets per the decision (data), R3 engine bank, T12; if (b) was chosen instead: a separate hardware-critical proof task first | as step 2 | **#3: R2 and R3 via the flag** |
| **4** | `feat/allied-steel` | `GAMEPLAY_COLPF1_OVERRIDE` + `--allied-steel`; T11; `art-direction.md` note when the owner decides | `npm test` default | **#4: `$84` vs `$88` vs `$8A` side by side** |
| **5** | `docs/hull-set-status` | STATUS, memory-map final figures, `how-to-play.md` + `how-to-play.pl.md` if the regions are named for the player (decision V: EN and PL together) | — | — |

Step 1 and step 2 could be one session; they are split so the allied + R1
smoke (AA item 6) happens before any loader change.

---

## 12. Owner decisions — **decided 2026-09-22**

The nine items §12 opened are answered below. The answers are the owner's; the
notes under each are this session's reading of what the answer binds.

1. **Allied steel** — `GAMEPLAY_COLPF1` stays **`$84`** in the default build. A
   **non-default** smoke build with `GAMEPLAY_COLPF1 = $88` is produced
   alongside it for side-by-side comparison; it is a review variant and must
   not change the release artifact or its gates. The final colour is decided at
   owner smoke. (§8; the `--allied-steel` flag itself remains step 4.)
   **ANSWERED 2026-09-22 at that smoke, and split in two — owner decision AC:**
   `$88` is chosen for levels **1-6**, and levels **7-12** take a darker step,
   **`$84` or `$86`**, settled at a later smoke. A per-level value is not the
   single constant this item assumed; see the banner on §8.
2. **Q-1** — the hull does not drive it: **3 sectors per level**. Q-1 stays
   open and `LEVEL_BUFFER` is not changed by this plan. (§3.5)
3. **D1 — R3's recessed turrets** — option **(a)**: move outward so the muzzle
   lands on the projection column. **No runtime change, no decorative
   turrets.**
4. **D2 — R2's second turret** — same rule: muzzle on the projection column.
5. **D3 — turret modules per side** — **one active turret module per side**, as
   the runtime does today. Decision F's "turret density" means how often turret
   modules occur along the hull, not how many are live at once.
6. **Contour rules relaxed** as §1.3 A writes them — one-row chamfers, runs up
   to 13, R4 without a depth-5 row. `5 <= depth <= 8` stays hard.
7. **Chamfer collision convention** as §1.2 writes it — the `ch_in` cell counts
   as hull for player contact; the draft's `innerDepthCells` annotation is
   dropped and depth is derived from the map.
8. **`docs/plans/` stays.** Added to the map in `docs/README.md`.
9. **Restoring `docs/media` after `npm test`** (`git checkout -- docs/media`) is
   accepted as normal procedure; precondition 3c is read as "modified nothing
   outside `docs/media`".

### The general turret rule these answers create

> A turret is placed only where its muzzle lands on the projection column —
> column 8 allied, column 31 enemy, as the runtime tracks it. **The approved
> glyph patterns stay binding; turret positions and profile come from the
> generator.**

Consequences the generator implements (step 1):

* Every style's firing turret is stamped with one standard profile — base ring
  at map columns 4-6 with `wall` at column 7, housing at 5, barrels at 6-7,
  muzzle at 8 — on the three rows the normalisation of §3.2 puts at segment
  rows 8/9/10. Allied B, R1, R2 t1 and R4 t1 already draw exactly that profile,
  so only **R3 t1 moves**, two columns outward (muzzle 6 -> 8).
* Cells a moved or removed emplacement vacates are filled from the nearest row
  of the same style that carries no turret cell, at the same column, cyclically
  and nearest-first with the lower row index winning a tie. No new glyph is
  invented; only the style's own approved glyphs appear.

### One conflict, and how it was resolved

Decisions 3 and 4 as written keep **both** emplacements of R2 and R3 and move
the recessed ones outward. Decision 5 allows **one** turret module per side, and
decision 3 forbids a decorative turret. Under one turret module a second muzzle
row inside the 32-row segment falls in some other module, and
`scripts/capital-hulls.mjs` then substitutes the disabled module for that module
everywhere in the sector — the second emplacement would never be drawn *and* one
eighth of the style's texture would be silently lost.

The three statements are therefore only jointly satisfiable one way, and that is
what the generator does: **one turret per style**, positioned by the generator
(decision: "turret positions and profile come from the generator"), and the
second drafted emplacement of R2, R3 and R4 is **not carried into v2** — its
rows are filled by the rule above, from the style's own surface. Nothing
decorative is drawn and no module's art is lost. Bringing the second emplacement
back is D3 (two turret modules, ESTIMATE +8 B `BROADSIDE`), which decision 5
declines for now.

**For the owner:** R2, R3 and R4 therefore show one emplacement per 32-row
texture instead of the two on `set-B-sheet.png`. Those three styles are
`DEFERRED` until after the allied + R1 smoke (decision AA item 6) and their data
is revisited in step 3, so this is revisable there at no cost to steps 1-2.

## 13. Owner decisions for step 2 — **decided 2026-09-22/23**

These four answers govern step 2 and supersede anything in §8 and §11 that
disagrees with them.

1. **The enemy hull style is level data.** Region R1 for the first quarter of
   the campaign, R2 for the second, R3 for the third, R4 for the fourth. The
   campaign length is **not** hardcoded by this step: it is read from where the
   repository defines it.

   *Where the repository defines it.* `scripts/build.mjs:182`
   `const LEVEL_MAX_ID = 16;` and `src/hybrid/sector-reader.s:131`
   `LEVEL_MAX_ID = 16` — the two halves of one contract, asserted at
   `sector-reader.s:903` ("level directory is not 16 x 3 B"). Owner decision E
   (`docs/project-overview.md` §"Decisions", `docs/game-design.md:42`) says the
   same: sixteen levels. **One document contradicts it**: `docs/how-to-play.md:27`
   still says "The twelve-level campaign" — a stale player-facing line from
   before decision E, not a second definition (no code or asset reads it). Both
   are reported here; the implementation takes the parametric route, so it is
   correct for either number.

   *The route.* `hullStyleIdForLevel(level)` divides the campaign into four
   equal regions — `1 + floor((level - 1) * 4 / LEVEL_MAX_ID)`, clamped to
   1..4. At `LEVEL_MAX_ID = 16` that is the owner's 1-4 / 5-8 / 9-12 / 13-16; at
   12 it would be 1-3 / 4-6 / 7-9 / 10-12. Nothing in the runtime carries the
   selector: the build stamps the region's block into the level image.

2. **The allied hull colour is level data too** — one byte, the
   `GAMEPLAY_COLPF1` the gameplay DLI writes. Levels in the **first half** of
   the campaign use **`$88`**, the brighter steel the owner chose at the step-1
   smoke, which becomes the **default for the release build**. Levels in the
   **second half** use a darker step; step 2 ships **`$84`** there, and the
   final darker value (`$84` or `$86`) is decided at this step's smoke.

3. **`COLPF1` is shared, and that is accepted.** It also colours the enemy
   `wacc` accents, the hostile `PULSE`/`LASER`/`BOMBER` projectile trails and
   the Light steel arms. The point of the change is that the second half of the
   campaign looks colder; anything the darker half makes hard to read is
   reported at smoke.

4. **Turrets: one active emplacement per side, as shipped.** Unchanged by this
   step (§12 decision 5 stands).

### What these change in the plan as written

* §8 is superseded: the allied steel is no longer one assembled constant that a
  review flag overrides. It is a byte in the per-level hull block, patched into
  the DLI's immediate operand at gameplay start, so the DLI still costs exactly
  what it costs today. The assembled `GAMEPLAY_COLPF1` becomes **`$88`** — the
  release default and the value the previews render — and stays the pre-patch
  value only.
* §7's `--hull-style=Rn` review variant carries the **region**, not just the
  style: it bakes style *n*'s block **and** that region's allied colour into
  level 1, so one flag shows the owner a whole region.
* T11 (§10) moves from step 4 to step 2 in substance: the colour is tested as
  level data, not as a build flag.

---

---

## Appendix A — the 109 failing tests at `0fb4a52`, default build (evidence)

Recorded because no name list exists in the repository; the next session
compares its own run against this list, not against the count alone.

- 600-frame ON/OFF watchdog advances frame, world, stars, and spawn scheduling
- a live Hunter leaves naturally and gives capital admission a finite bound
- accepted cadence is movement-independent, pool-safe and every complete SFX is $33..$38
- active capsule renders one phased 2x2/2x3 footprint continuously and cannot be shot
- all booster types traverse the lower playfield on EASY, MEDIUM and HARD
- all score writes use one BCD award path while source ownership stays unchanged
- all three directions collide with debris and Interceptor scoring resolves only once
- ANTIC 2 palette is genuinely monochrome while PMG remains source-derived
- assembled BROADSIDE overlap unwinds 0->2 draw with 2->0 erase for every slot pair
- assembled burst controllers use accepted counts, intervals, speeds and damage
- assembled death and respawn preserve whole-game SCORE before the next award
- assembled decimal score code carries without inserting partial-game scores
- assembled display list contains 157 ANTIC F and 35 ANTIC E lines
- assembled gameplay display list and DLI switch a dedicated ANTIC 2 HUD
- assembled Hunter plus capital heavy frame recovers the PAL working ceiling
- assembled Hunter shots remain independent through capital traversal and ring wrap
- assembled isolated BROADSIDE slot is one connected object across a 100-frame lifecycle observation
- BOSS_HANDOFF maps every capital state once and leaves final COMPLETE terminal
- bottom clipping and repeated ring wraps never write the HUD or revive a pickup
- burst-balance owner previews compare identical 80-frame XEX and ATR executions
- cadence preview plots source-derived warning, launch, and world-scroll timing
- capital due drains the final legal Hunter pulse before admission
- cold pickup record excludes the source-only character phase bank
- collision callers retain their consume and impact contracts
- debris and the reserved pickup coexist without allocator overwrite for every A2 head
- debris owner review is deterministic and covers visuals, trajectories, contact and wrap
- destructible debris owner preview is an XEX/ATR-executed eight-frame breakup
- dynamic glyph ownership is explicit and all capsule transitions restore backing
- EASY/MEDIUM/HARD expose exact legal 8/12/16 stations on each hull
- enemy breakup passes the hard PAL gate and executes the five-slot runtime path
- every booster type enters at the top, crosses the full playfield once and releases below it
- every canonical Raider death avoids character effects without changing score policy
- executed wait moves a late fence earlier without skipping a PAL update
- explosion colour flash passes its +64 PAL gate with exact GTIA traces
- fit preserves the reviewed staging and placement gates
- four-cell backing restores byte-exact data in reverse layer order at every A2 head
- frame ordering keeps earlier collisions before pickup activation
- H4.2 C INDUSTRIAL preserves its structural and immutable data contracts
- hybrid ring reservation fits after staging and before entity/effects RAM
- HYBRID_C_ARENA is one contiguous 832-B arena at $7BD0-$7F0F
- Interceptor contact result is byte-identical after XEX and ATR cold boot
- Interceptor owner preview is the XEX/ATR-executed eight-frame local breakup
- joystick, FIRE, projectile, enemy, and scoring routines remain connected
- Layout D.2 exact memory and transport budgets remain frozen
- loader remains unchanged and the accepted H3.1 menu preview is source-derived
- menu evidence preserves the audited boot streams and independent charsets
- muzzle remapping leaves the single late booster compositor unchanged
- native menu raster is exact for XEX/ATR and four cold RAM fills
- new game, life loss and Game Over clear RF while a live sector transition preserves it
- Normal and Rapid projectiles render through the PlayerFighter yellow bank
- one logical footprint survives repeated ring wraps and cannot return after release
- one Spread emission is an unambiguous three-projectile fan
- ordinary awards update only current BCD score until Game Over
- ordinary waves stay closed through reconstruction and resume without catch-up
- owner layouts are independent rather than identical, shifted, or strictly alternating
- packed runtime distinguishes accepted Normal, Rapid and Spread cadence
- packed startup and relocated GLUE have pairwise-safe real lifetimes
- packed XEX and ATR keep every implemented PlayerFighter lifecycle path yellow under cold RAM
- PairShot and generic-effect backing resolvers stay below the local fix ceiling
- PairShot keeps one collision event per logical player or enemy record
- pickup admission coexists with slot-0 debris and publishes the 16-row PMG
- pickup collection is single-shot and changes neither score, HULL nor LIFE
- pickup movement resolves half world speed into smooth scanline phases
- pickup pending remains hidden and non-colliding for thirty full frames
- pickup rotation is exactly Rapid Spread Shield Rapid without RNG
- PlayerFighter death wins same-frame arbitration and enemy flashes cannot restart forever
- PMG ownership preserves one P1/P2 enemy while fighter bursts use playfield glyphs
- PMG runtime remains legal after retiring the rejected central primitive
- preview consumes the canonical charset, screen, PMG, and palette source
- protected linked segments do not regress beyond the accepted feature baseline
- provisional PAL scheduler remains deterministic over denser 8/12/16 layouts
- public README is English, complete, and free of stale status language
- Raider lifecycle and score remain canonical without scheduling a character effect
- Rapid Fire lasts 500 active frames and keeps its accepted accelerated burst
- Rapid Fire owner preview executes the packed XEX/ATR pickup lifecycle
- real XEX/ATR startup traces keep one atomic two-phase engine pulse
- record overlap, invalid load range, length mismatch, truncation, and ATR overflow fail closed
- release trace CSV exposes the authoritative counter, state, timing and score
- release XEX and ATR execute 0→1→2→pending only for consumed PlayerFighter kills
- release XEX and ATR execute the deterministic Rapid Spread Shield drop cycle
- released FIRE emits a visible centred first frame across X, Y and ring phases
- resident compaction proof survives and Spread Shot leaves at least 64 source-owned bytes
- reverse erase restores every 2x2/2x3 phase across the A2 wrap
- runtime compositor publishes the exact capsule pixels for all types and phases
- runtime map reservation and payload remain bounded and do not consume PMG or DLI
- runtime owns a 16-bit hull row and preserves divider/ring muzzle invariants
- same-frame Shield collection protects later debris and consumes it
- sector pickup clear republishes still-live PlayerFighter projectiles in the same frame
- sequence preview uses runtime PMG colours, source muzzles, and deterministic integer geometry
- Shield keeps the normal eight-shot cadence while Rapid and Spread remain unchanged
- showcase and asset sheets regenerate without ignored capture files
- showcase manifest binds every image to the current packed release
- Spread collection lasts exactly 500 active PAL frames and pause freezes it
- Spread fixed phase is symmetric after 100 updates and both side bounds despawn
- Spread four-cell reverse erase restores byte-exact backing at every A2 head
- Spread respects the six-projectile active budget and admits centre before an atomic side pair
- Spread Shot owner preview is deterministic executed XEX/ATR gameplay
- Spread Shot owns one phased red fan in the shared six-glyph bank
- start-menu preview is deterministic, 640x384, and source-derived
- ten heaviest frames retain exact clock positions, VBI IDs and state
- the arena lands directly as its own DFMC record and is the only owner of its range
- the configured 28-frame Spread cooldown avoids catch-up at the active limit
- the debris is published between the Light erase and the Light render
- the main frame has one guarded late pickup publication
- the shared burst alternates two real Raider origins and skips a destroyed owner
- three eight-phase banks preserve one tapered 8x16 capsule through 2x2/2x3 footprints
- tracked names and searchable tracked content contain no retired vocabulary
- unchanged cadence consumes no more launches than the denser station layout
- wall trace records the required legal runtime coverage without incoherent RAM seeding

