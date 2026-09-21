# Current memory map

Accepted runtime checkpoint: `b4b942e` on `experiment/hybrid-c-director`
(XEX `96546807…`, owner smoke PASS 2026-09-16). The linked-segment and BSS
tables below are still the earlier `41ace65` snapshot (Light Wingman M1 + solid
PMG pickup, XEX `900152fe…`); the accepted placement changes since then are
listed in *Accepted placement since `41ace65`* and override those rows.
Sections marked *earlier `2df89da`* were not regenerated.

> **STALE ROWS — read this first.** The *Linked segments* table below and the
> *BSS and high relocated runtime* table near the end are `41ace65` snapshots
> and are wrong at the current HEAD in ways that have already caused a runtime
> crash (they state a 45 B `ENTITY_CODE` tail where the measured tail is 1 B).
> The authoritative rows are in *Segment free tails at the current checkpoint*
> further down, and a full re-measured segment table with real neighbours and
> real free tails is in [project-overview.md](project-overview.md) §2, which
> also lists every stale row in this file individually (§8.1, §8.2).
>
> **Corrected 2026-09-20.** Every stale row named in `project-overview.md`
> §8.1 and §8.2 now carries its measured value **inline, at the point a reader
> hits it**, instead of only being listed elsewhere. The historical row is kept
> beside it, because the history of how a tail moved is the reason these
> sections exist. Rows corrected this way are marked `[SUPERSEDED …]`.

## Superseded rows — the measured values, in one place (2026-09-20)

MEASURED at HEAD `ac71df7` from `build/void-strike-65.map`,
`build/void-strike-65.lbl`, `build/encounter-director.map` and
`build/manifest.json`. Each row below replaces the one named in the left
column wherever it appears earlier or later in this file.

| Row as written somewhere in this file | MEASURED at HEAD |
| --- | --- |
| `$8C7D-$8C94` 24 B `EnemyArchetype` table, "Raider + Light Wingman records" | `$8C7D-$8CAE` **50 B** — four 12 B records + a 2 B provisional Light schedule table |
| `$8C95-$8F69` 725 B C sector/lifecycle/Light | `HYBRID_C_EXT` `$8CAF-$8EE1` **563 B** |
| `$8F6A-$8FEE` 133 B `LIGHT_CODE` | `LIGHT_CODE` `$8EE2-$8FAC` **203 B**, plus `HEAVY_CODE` `$8FAD-$8FEC` **64 B**, which is absent from the old tables entirely |
| `$8FEF-$8FFF` 17 B free extension tail | `$8FED-$8FFF` **19 B** |
| `$9100-$9D51` 3,154 B `ENTITY_CODE`; `$9D52-$9D5D` 12 B free | `$9100-$9D5C` **3,165 B**; free **1 B** (`$9D5D`) |
| `$9D31-$9D5D` **45 B** free `ENTITY_CODE` tail (*Accepted placement* section) | **1 B** (`$9D5D`). **This is the pair that cost real work**: a 3-byte inline insert assembled cleanly against a reservation ceiling, ran `ENTITY_CODE` past `$9D5D` and crashed at runtime. |
| §4.4b "ENTITY_CODE free tail 45 → 13 B" | **1 B** at HEAD |
| `$9D73-$9D74` 2 B "free ENTITY_CODE reservation tail" | 2 B, but it is the gap between `DIRECTOR_C_PRE` and `LEVEL1_DATA` — **not** an `ENTITY_CODE` tail |
| `$8100-$810B` 12 B Light record; `$810C-$810F` 4 B unowned | `HYBRID_LIGHT_STATE` is **`$8100-$810F`, 16 B**; nothing there is unowned |
| `$8119-$813F` 39 B unowned | `HYBRID_ENCOUNTER_STATE` `$8119-$811A` and `HYBRID_HEAVY_STATE` `$811B-$8125` occupy 13 B of it; real free is **`$8126-$813F`, 26 B** |
| `$5CF7-$5E05` 271 B free starfield tail | `STARFIELD` now ends `$5D93`; real free is **`$5D94-$5E05`, 114 B** |
| `$7F05-$7F0F` 11 B "unassigned after cold staging" | Inside the arena's 215 B free tail `$7E39-$7F0F`. **Double-counted** if both rows are summed |
| `$8600-$8601` near-star state (BSS table) **vs** `$85FE-$8601` 4 B `STAR_NEAR_SCREEN_HI` (*Accepted placement*) | **Both are wrong about the extent; neither is wrong about what it names.** Settled from the source — see the next section |

### Near-star state — settled from the source, 2026-09-20

The two sections of this file disagreed by 2 B and neither could be resolved
from a link map, because the near-star records are **hand-placed BSS, not a
linker segment**. Settled by reading the address chain and confirming it
against `build/void-strike-65.lbl`:

| Symbol | Source | Address, MEASURED |
| --- | --- | ---: |
| `STAR_NEAR_ROW` | `src/main.s:228` (`= HULL_DRAW_ROW_HI+$01`) | `$85F2-$85F5` |
| `STAR_NEAR_COLUMN` | `src/main.s:229` | `$85F6-$85F9` |
| `STAR_NEAR_SCREEN_LO` | `src/main.s:230` | `$85FA-$85FD` |
| `STAR_NEAR_SCREEN_HI` | `src/main.s:231` | `$85FE-$8601` |
| `STAR_NEAR_STATE_END` | `src/main.s:232` | `$8602` (= `RESIDENT_WINDOW`) |

Each table is `STAR_NEAR_CAPACITY` bytes; `STAR_NEAR_CAPACITY = 4`, generated
into `build/starfield.inc:7` from `near.population` by `scripts/starfield.mjs:110`.
The four `.lbl` addresses (`$85F2`, `$85F6`, `$85FA`, `$85FE`) confirm the
stride independently.

**The answer: the near-star state is `$85F2-$8601`, 16 B, four 4-byte tables.**

- The *Accepted placement* row `$85FE-$8601` 4 B is right about
  `STAR_NEAR_SCREEN_HI` and wrong only if read as the whole near-star state.
- The BSS row `$8600-$8601` "near-star state" is **wrong**: those two bytes are
  the tail of `STAR_NEAR_SCREEN_HI`, not the state.
- The BSS row `$85EF-$85FF` "17 B unowned after cold startup" is **wrong**:
  `CORRIDOR_PHASE_HI` (`$85EF`), `HULL_DRAW_ROW_LO`/`HI` (`$85F0-$85F1`) and
  the near-star tables own all of it.
- Consequently the free gap before the near-star state is **`$85E6-$85EE`,
  9 B** — not the 24 B (`$85E6-$85FD`) that `project-overview.md` §2.1 derived
  from the wrong start address. That row is corrected there too.

Asserts that bound it: `STAR_NEAR_STATE_END <= WEAPON_PICKUP_RUNTIME`
(`src/main.s:740`) and `STAR_NEAR_STATE_END <= RESIDENT_WINDOW`
(`src/main.s:741`), with `RESIDENT_WINDOW = $8602` (`src/main.s:727`). The
state therefore ends **exactly** where the resident window begins; it has zero
slack, and anything that raises `STAR_NEAR_CAPACITY` moves `HYBRID_C_SECTOR`.

This is one snapshot. Addresses and linked sizes come from
`build/void-strike-65.map`; packed sizes, staging ranges, artifacts, and reserves
come from `build/manifest.json`. Overlapping ranges below have different
lifetime phases and are not additive free memory.

**Note on the "ATR menu deadline" figures below.** Every `ATR menu deadline N`
in the transport paragraphs of this file was derived from the old
`190 + 2 × transport sectors` formula, which owner decision 22 (2026-09-18)
re-based and which the boot smoke no longer evaluates. Those figures stay as
written because they are historical measurements, but they state a limit that
no longer exists. The live gate, implemented 2026-09-19, is an absolute
ceiling of **3,000 PAL frames** (the owner's 60-second budget) plus a delta
against the committed baseline in
[boot-deadline-baseline.json](boot-deadline-baseline.json) — hard fail at
baseline + 50, warn at baseline + 10. A sector count in this file therefore no
longer implies a deadline; what it costs is **2 PAL frames per occupied
128-byte sector** of boot time, against 2,446 frames of headroom.

## Linked segments

| Range | Size | Current owner |
| --- | ---: | --- |
| `$0080-$009F` | 32 B | zero-page runtime variables |
| `$0100-$01FF` | 256 B | 6502 stack |
| `$0200-$03FF` | 512 B | OS workspace and vectors |
| `$2000-$3169` | 4,458 B | resident `CODE` |
| `$316A-$3FEB` | 3,714 B | resident `RODATA` |
| `$5400-$5489` | 138 B | `PROJECTILES`: ten one-cell PairShot slots (five player + five enemy), burst controllers, two shared fighter explosions, and two independent Raider records |
| `$548A-$54E3` | 90 B | free linked tail; not stable against the PairShot lifecycle clear |
| `$54E4-$5D63` | 2,176 B | relocated `STARFIELD` runtime; `$5D45-$5D63` is the 31-B Light Wingman lower-layer backing resolver; reserved through `$5E0F` |
| `$5E10-$7809` | 6,650 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime plus debris-release wrapper; its retired 17-B entry pad `$77A1-$77B1` holds the Light BCD score add; reserved through `$780F` |
| `$8000-$80F3` | 244 B | `ENTITY_STATE` BSS |
| `$80F4-$80FF` | 12 B | C-owned Encounter Director semantic state at its legacy addresses |
| `$86FA-$8700` | 7 B | hybrid ABI mailbox and cc65 Director scratch BSS; no C stack |
| `$8701-$8775` | 117 B | hybrid C/ASM Director/lifecycle ABI veneer and startup publishers |
| `$8100-$810B` | 12 B | C-owned Light Wingman record (`$8100-$8105`) plus ASM Light render cache/scratch (`$8106-$810B`); `$810C` free — **[SUPERSEDED 2026-09-20: `HYBRID_LIGHT_STATE` is `$8100-$810F`, 16 B; nothing there is unowned]** |
| `$8110-$8118` | 9 B | C-owned derived Raider profile cache read by the ASM kernel (moved from `$8776`) |
| `$8776-$8857` | 226 B | `LIGHT_RESIDENT` Light Wingman kernel (update, PairShot hit, kill, glyph) heading the pickup/collision stream |
| `$8858-$8B60` | 777 B | fighter PMG pickup, projectile publication scaffold, narrow effect/PairShot backing resolver, and provisional active-gameplay admission policy (retired inert padding reclaimed) |
| `$8B61-$8B66` | 6 B | zero fill of the pickup/collision stream image |
| `$8B67-$8B87` | 33 B | shared inclusive final-raster swept-AABB capital-bolt/Player Fighter collision module |
| `$8B88-$8C79` | 242 B | low cc65 Director code |
| `$8C7A-$8C7C` | 3 B | free gap |
| `$8C7D-$8C94` | 24 B | C `EnemyArchetype` table (Raider + Light Wingman records) — **[SUPERSEDED 2026-09-20: `$8C7D-$8CAE`, 50 B, four records + a 2 B Light schedule table]** |
| `$8C95-$8F69` | 725 B | C sector, high-level enemy lifecycle and Light Wingman code — **[SUPERSEDED 2026-09-20: `HYBRID_C_EXT` `$8CAF-$8EE1`, 563 B]** |
| `$8F6A-$8FEE` | 133 B | `LIGHT_CODE` Light late-publication (erase + render) kernel, main-linked, carried at the tail of the extension stream — **[SUPERSEDED 2026-09-20: `LIGHT_CODE` `$8EE2-$8FAC`, 203 B, plus `HEAVY_CODE` `$8FAD-$8FEC`, 64 B, missing from this table]** |
| `$8FEF-$8FFF` | 17 B | free extension tail — **[SUPERSEDED 2026-09-20: `$8FED-$8FFF`, 19 B]** |
| `$9000-$90EC` | 237 B | relocated A2 kernel; 19 bytes reserved through `$90FF` are free |
| `$9100-$9D51` | 3,154 B | relocated `ENTITY_CODE`, including PMG pickup lifecycle, H3.1 display lists, and frontend helpers; `$9D52-$9D5D` (12 B) free — **[SUPERSEDED 2026-09-20: `$9100-$9D5C`, 3,165 B; free tail 1 B at `$9D5D`]** |
| `$9D5E-$9D72` | 21 B | cc65 Director `5*x+1` RNG routine |
| `$9D73-$9D74` | 2 B | free tail before Director tables — **[CLARIFIED 2026-09-20: correct as 2 B, but it is the gap between `DIRECTOR_C_PRE` and `LEVEL1_DATA`, not an `ENTITY_CODE` reservation tail]** |
| `$9D75-$9E12` | 158 B | C Director constants and Level 1 tables |
| `$9E13-$9FF7` | 485 B | remaining cc65 Director code |
| `$9FF8-$9FF9` | 2 B | free Director reservation tail |
| `$9FFA-$9FFF` | 6 B | untouched Director guard |
| `$21C1-$26A9` | 1,257 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The linked metric is `CODE + STARFIELD + BROADSIDE + A2_KERNEL + ENTITY_CODE +
PICKUP_CODE = 17,452 B` (17,521 B at `2df89da`). The obsolete 1,152-byte
character-pickup phase bank is source-only and is not resident. With
late-published GLUE, the collision module, 1,543-byte complete hybrid C/ABI
payload and C state, simultaneous feature residency is 19,207 B and safe
residency is 2,980 B (18,914 B / 3,273 B at `2df89da`). BROADSIDE is 6,650 B;
the pickup/collision stream holds LIGHT_RESIDENT 226 B and PICKUP_CODE 777 B.
The PairShot pool uses 90 fewer persistent BSS bytes; its fixed glyphs reuse the
existing charset allocation.

## Declared-region overlap — do not double-count

`cfg/encounter-director.cfg` declares two adjacent areas that **overlap by three
bytes**:

| Area | Declared | Reaches |
| --- | --- | --- |
| `DIRECTOR_C_LOW_RAM` | `start = $8B88, size = $00F8` | `$8B88-$8C7F` |
| `HYBRID_C_EXT_RAM` | `start = $8C7D, size = $0383` | `$8C7D-$8FFF` |

`$8C7D-$8C7F` is claimed by both. `HYBRID_C_EXT_RAM` owns it in practice, so the
usable free tail of `DIRECTOR_C_LOW_RAM` is **3 B (`$8C7A-$8C7C`), not the 6 B
its declared size implies**. ld65 does not report this, because the two are
separate memory areas.

Tools and agents summing free space must count `$8C7A-$8C7C` once, under
`DIRECTOR_C_LOW_RAM`.

Note also that `HYBRID_C_EXT_RAM` is not free down to `$8FFF`: `scripts/build.mjs`
appends the `LIGHT_CODE` tail to the same expanded composite, so at `b4b942e`
the free extension tail is `$8F45-$8FFF` = 187 B (203 B `LIGHT_CODE`).

## Accepted placement since `41ace65` — pickup fix, step 4.3 Stage 1, debris late publication (`b4b942e`)

Owner-accepted 2026-09-16. Measured from the `b4b942e` link maps; these rows
override the older tables in this file. The pickup raster fix also moved
resident `CODE` to `$2000-$3174` (4,469 B), `RODATA` to `$3175-$3FF6`, and
`STARFIELD` to `$54E4-$5D93` (2,224 B, `light_cell_resolve` at `$5D82`); packed
STARFIELD is 1,805 B.

| Range | Size | Accepted owner |
| --- | ---: | --- |
| `$85FE-$8601` | 4 B | `STAR_NEAR_SCREEN_HI` (the old "`$8600` window" never included these two bytes) — **[CLARIFIED 2026-09-20: right about `STAR_NEAR_SCREEN_HI`, but it is not the whole near-star state, which is `$85F2-$8601`, 16 B — see "Near-star state — settled from the source"]** |
| `$8602-$86F9` | 248 B | `HYBRID_C_SECTOR_RAM`: the five `sector_c_*` functions, 240 B at `$8602-$86F1`; 8 B free |
| `$8300-$83F9` | 250 B | boot-only GLUE hold (idle gameplay-ring RAM) until `layout_d_publish_glue`; `init_screen` rebuilds the ring before gameplay |
| `$8C7D-$8E79` | 509 B | C `EnemyArchetype` RODATA 24 B + lifecycle/Light C 485 B |
| `$8776-$8857` | 226 B | `LIGHT_RESIDENT` (unchanged) heading the pickup/collision stream |
| `$8858-$8B58` | 769 B | `PICKUP_CODE`; `$8B59-$8B66` 14 B zero fill of the stream image before the fixed `$8B67` collision module |
| `$8E7A-$8F44` | 203 B | `LIGHT_CODE` (moved with the shorter C composite): Light late publication 133 B plus the debris late-publication kernel 70 B (`entity_debris_publish`, capital hook `render_launch_flashes_with_capital_debris`, `restore_recycled_row_near_and_debris`) |
| `$8F45-$8FFF` | 187 B | free contiguous `HYBRID_C_EXT` tail; cc65 code or main-linked ASM appended after `LIGHT_CODE` (257 B before the debris kernel) |
| `$9100-$9D30` | 3,121 B | ENTITY_CODE (C1 −39 B, second-stream expansion +13 B, debris late publication −4 B); `$9D31-$9D5D` 45 B free — **[SUPERSEDED 2026-09-20: `$9100-$9D5C`, 3,165 B; free tail 1 B at `$9D5D`. This 45 B row is the one a 3-byte insert trusted before it overran `ENTITY_CODE` and crashed at runtime — do not plan against it]** |

Transport: the window's independent LZ stream (201 B packed) follows the
pickup/collision stream in the same raw DFMC record. The record is 1,158 of
1,277 B cold capacity and 10 sectors; there are still 8 records and a 142 B manifest.
`unpack_weapon_pickup_phase_runtime` expands stream 1 to `$8776` and then
stream 2 to `$8602`. The debris late publication changes only
`LIGHT_CODE`, the extension tail and `ENTITY_CODE` as tabled above; the A2
kernel keeps its 237 B and frozen entry points; the extension record is 712 B
raw / 636 B packed of 960. Slot-zero debris state: `ENTITY_BACKING0+0/+1` hold
the two cells' lower backing and `ENTITY_BACKING2+0/+1` the two published screen
codes (the slot-1 bytes are otherwise unused; the A2 resolver indexes them by
cell). Asserts: `STAR_NEAR_STATE_END <= RESIDENT_WINDOW`,
hold ≥ the `$81D0` starfield-staging end, hold inside the ring and below the
window, and `HYBRID_C_SECTOR` ≤ 248 B (build). Evidence:
[diagnostics/stage-2b2f-resident-capacity-glue-window.json](diagnostics/stage-2b2f-resident-capacity-glue-window.json).

## Roadmap 4.4 Interceptor placement — OWNER-SMOKE CANDIDATE (2026-09-16)

Measured from the candidate link maps and `build/manifest.json` on top of the
accepted `b4b942e`. Not accepted; these rows override the accepted rows above
only for the candidate build.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$8100-$810B` | 12 B | unchanged: C Light record `$8100-$8105`, ASM render cache/scratch `$8106-$810B` |
| `$810C` | 1 B | `light_archetype_offset`: selected Light record, `12` Wingman or `24` Interceptor (C writes, ASM reads to score) |
| `$810D` | 1 B | `light_burst_left`: shots left in the current burst |
| `$810E` | 1 B | `light_target_x`: last pursuit target column |
| `$810F` | 1 B | `light_post_burst_slot`: archetype offset + difficulty, resolved at admission |
| `$8110-$8118` | 9 B | unchanged: derived Raider profile cache |
| `$8119` | 1 B | `encounter_light_index`: **provisional** Light schedule counter (`HYBRID_ENCOUNTER_STATE`), reset in `lifecycle_c_init`; smoke scheduling only, replaced by roadmap 4.6 |
| `$811A-$813F` | 38 B | unowned |
| `$8776-$8856` | 225 B | `LIGHT_RESIDENT` (+3 B `ldx LIGHT_ARCHETYPE_OFFSET` in `light_destroyed`; 4.4b: −16 B Wingman art moved out, +12 B archetype art selection) |
| `$8857-$8B57` | 769 B | `PICKUP_CODE`, same size (`$885B-$8B5B` before 4.4b) |
| `$8B58-$8B66` | 15 B | zero fill of the pickup/collision stream image (14 B at `b4b942e`, 11 B before 4.4b) |
| `$8C7D-$8CA2` | 38 B | `ENEMY_ARCHETYPE_DATA`: Raider, Wingman and Interceptor records (36 B) plus the 2 B provisional schedule table |
| `$8CA3-$8F1D` | 635 B | `HYBRID_C_EXT`: lifecycle, Light and Interceptor C (+150 B) |
| `$8F1E-$8FE8` | 203 B | `LIGHT_CODE`, unchanged size, moved with the longer C composite |
| `$8FE9-$8FFF` | 23 B | free contiguous `HYBRID_C_EXT` tail — scarce (187 B at `b4b942e`; owner floor 16 B) |
| `$9100-$9D30` | 3,121 B | ENTITY_CODE, unchanged |
| `$9D31-$9D40` | 16 B | 4.4b `light_glyph`: Wingman art, moved from `LIGHT_RESIDENT`, bytes unchanged |
| `$9D41-$9D50` | 16 B | 4.4b `light_interceptor_glyph`: Interceptor art (one page with the Wingman table) |
| `$9D51-$9D5D` | 13 B | free ENTITY_CODE reservation tail — scarce (45 B before 4.4b) — **[SUPERSEDED 2026-09-20: 1 B at HEAD, `$9D5D`. Both this 13 B and the 45 B it came from are historical; neither is capacity]** |

Roadmap 4.4b (Interceptor visual identity) changes only the ENTITY_CODE,
`LIGHT_RESIDENT`, `PICKUP_CODE` and stream-fill rows above: ENTITY_CODE is
3,153 B raw / 2,733 B packed (2,701 B before), its staging-to-BROADSIDE margin
75 B (107 B) and its source/staging overlap 88 B (56 B); the pickup/collision
record is 1,157 B (1,161 B; stream 956 B packed); linked runtime 17,502 B,
simultaneous residency 19,491 B, safe 2,696 B. The initial boot block keeps its
sector count, but its envelope is 12 B — the 12 B minimum (44 B before), so the
next byte of initial boot content adds a sector.

Transport: the extension record is 876 B raw / 785 B packed of 960, staged at
`$7810-$7B20` and expanded to `$8C7D-$8FE8`; it grows from 6 to 7 ATR sectors
(166-172), so the RNG record moves from sector 172 to 173. The pickup/collision
stream is 960 B packed; the record is 1,161 of 1,277 B cold capacity. Linked
runtime 17,470 B and packed STARFIELD 1,805 B are unchanged; simultaneous
residency 19,459 B, safe 2,728 B. Evidence:
[diagnostics/stage-2b2h-light-interceptor.json](diagnostics/stage-2b2h-light-interceptor.json).

## Roadmap 4.4c hostile weapon visuals — OWNER-SMOKE CANDIDATE (2026-09-16)

Measured on top of the 4.4b candidate (`0c90d53`). These rows override the 4.4
rows above for this candidate only.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$6264-$62A9` | 70 B | BROADSIDE builder slot, same size and address: `build_interceptor_projectile_glyphs` 19 B, `hostile_weapon_visual_glyphs` 16 B (8 B per `weapon_class`), `hostile_projectile_screen_code` 23 B, 12 B pad (room for one more class without moving `free_broadside_slot` `$76A7`) |
| `$8776-$885A` | 229 B | `LIGHT_RESIDENT` (+4 B: the Light emit shifts the returned `weapon_class` into ACTIVE) |
| `$885B-$8B5B` | 769 B | `PICKUP_CODE`, same size (range resolver and Raider class constants are size-neutral) |
| `$8B5C-$8B66` | 11 B | zero fill of the pickup/collision stream image |
| `$8CA3-$8F1F` | 637 B | `HYBRID_C_EXT` (+2 B: `enemy_c_light_tick` returns the record's weapon class) |
| `$8F20-$8FEA` | 203 B | `LIGHT_CODE`, unchanged size |
| `$8FEB-$8FFF` | 21 B | free contiguous `HYBRID_C_EXT` tail — scarce (owner floor 16 B) |

ENTITY_CODE keeps 3,153 B and its 13 B tail: the hostile screen code moved out
of the renderer (−11 B), and the saving sits in the `.align $100` pad before
`main_menu_display_list` `$9400`. ENTITY_CODE packs to 2,727 B (−6 B), its
staging-to-BROADSIDE margin is 81 B and the initial boot envelope 18 B (12 B).
BROADSIDE packs to 5,662 B (+3 B); the pickup/collision record is 1,161 of
1,277 B (stream 960 B); the extension record 878 B raw / 786 B packed of 960.
Linked runtime 17,502 B and packed STARFIELD 1,805 B are unchanged;
simultaneous residency 19,493 B, safe 2,694 B. RAM, zero page, PMG, DLI and
charset ranges are unchanged; a hostile PairShot's `weapon_class` lives in
ACTIVE bits 3-4 of its existing slot byte (bits 3-6 for the nine-class maximum).

## Roadmap 4.5a Heavy window — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `3838c00`. Capacity only: no code or data is placed in the
window yet and gameplay is unchanged.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$219D-$21AA` | 14 B | `hybrid_c_heavy_hold`: bootstrap-prefix padding, copies staging → hold |
| `$21AB-$21BB` | 17 B | `hybrid_c_heavy_publish`: bootstrap-prefix padding, expands the starfield, then copies hold → window |
| `$21BC-$21C0` | 5 B | remaining zero padding of the fixed `$01A3` bootstrap prefix (36 B before) |
| `$7D40-$7E37` | 248 B | low-C record image: 242 B low C plus 6 B zero pad to the full `$F8` reservation |
| `$7E38-$7F2A` | 243 B | cold Heavy staging: the linked `HYBRID_C_HEAVY` image (0 B in 4.5a) travels in the low-C record |
| `$8400-$84F2` | 243 B | boot-only Heavy hold (idle gameplay-ring RAM after the GLUE hold `$8300-$83F9`) |
| `$7E12-$7F04` | 243 B | `HYBRID_C_HEAVY_RAM` runtime window: 0 B used, **243 B free, C-reachable** |

Boot order: the loader expands the low-C record to `$7D40`;
`publish_director_abi` publishes low C and the extension, then tail-jumps to
`hybrid_c_heavy_hold` (the former `rts` + 2 B pad), which copies the full
243 B to the hold before `stage_starfield_stream` writes `$7810-$81CF`.
After `show_loader`, `hybrid_c_heavy_publish` expands the starfield and copies
the hold to `$7E12`. `init_screen` later rebuilds the ring; nothing writes the
window afterwards (native write-watch). Bytes past the linked image are
unspecified and never executed.

Transport: still 8 DFMC records and no new record. The low-C record is 248 B raw
/ 213 B packed in 2 sectors (242 / 210 B before); a full window of
incompressible bytes packs to 458 B in 4 sectors, and a real 239-B cc65 proof
payload to 435 B in 4 sectors. The chunk loader's reviewed cold range
`$7BD0-$7F0F` now ends at `$7F2A`: the A2 display lists at `$7F10` are built
only at gameplay init, and A2 cold staging begins at `$7F2B`.

Accounting (three separate metrics):

- **Physical resident code/data:** +0 B in the linked metrics (the 31 B of boot
  copies replace zero padding already counted in `CODE`). Linked runtime
  17,502 B, simultaneous residency 19,493 B, safe residency 2,694 B unchanged.
- **Reserved envelopes:** new `HYBRID_C_HEAVY_RAM` 243 B at `$7E12-$7F04`;
  boot-only hold 243 B at `$8400-$84F2`. All others unchanged: initial content
  13,166 B, envelope 18 B, 103 boot sectors, 178 transport sectors, extension
  record 786/960 B packed, pickup record 1,161/1,277 B.
- **Reusable free capacity:** +243 B contiguous C-reachable (`HYBRID_C_HEAVY`);
  bootstrap-prefix padding 36 → 5 B; `HYBRID_C_EXT` 21 B, `HYBRID_C_SECTOR`
  8 B, ENTITY_CODE 13 B, A2 18 B and pickup fill 11 B unchanged.

Asserts: hold inside the ring and after the GLUE hold; staging after the low-C
reservation and before A2 staging; window after the pause backup and before
the A2 display lists; `HYBRID_C_HEAVY` ≤ capacity and capacity ≥ 235 B
(`src/main.s`); ld65 rejects a larger segment. Evidence:
[diagnostics/stage-2b2i-heavy-window-placement.json](diagnostics/stage-2b2i-heavy-window-placement.json).

## Roadmap 4.5b BOMBER weapon class — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `984f3ae`. These rows override the rows above for this
candidate only.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$21BC-$21BE` | 3 B | `hostile_weapon_step_masks` (period − 1 per `weapon_class`) in raw bootstrap-prefix padding |
| `$21BF-$21C0` | 2 B | remaining zero padding of the fixed `$01A3` bootstrap prefix (5 B before) |
| `$2B5B-$2C54` | 0 B net | resident `CODE` `update_fighter_projectiles`: class step gate +11 B, loop −12 B, 1 B dead pad after `rts`; every later CODE address unchanged |
| `$6264-$62A9` | 70 B | BROADSIDE builder slot, same size and address: builder 19 B, `hostile_weapon_visual_glyphs` 24 B (3 classes), `hostile_projectile_screen_code` 23 B at `$628F`, 4 B pad; `free_broadside_slot` `$76A7` unchanged |

BROADSIDE packs to 5,666 B (+4 B); transport stays 178 sectors and the XEX
23,104 B. Linked runtime 17,502 B, simultaneous residency 19,493 B, safe
2,694 B, initial content 13,166 B and envelope 18 B are unchanged. RAM, zero
page, PMG, DLI and charset ranges are unchanged; hostile codes now span
`$DA-$E6`.

## Roadmap 4.5M-M1 starfield staging swap — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `9547bf0` (the 4.5b candidate). Boot and lifetime change
only: no gameplay, runtime-map, PMG, DLI, collision, GLUE/ABI/low-C/extension/
A2/pickup or ENTITY-order change; linked runtime 17,502 B, simultaneous
residency 19,493 B and safe residency 2,694 B are unchanged. These rows
override the boot-time rows above for this candidate only.

| Range | Size | Candidate owner (boot time) |
| --- | ---: | --- |
| `$40C9-$445B` | 915 B | packed STARFIELD stream A (raw bytes 0-984) in the initial block; staged at `$7810` |
| `$445C-$47DB` | 896 B | packed STARFIELD stream B (raw bytes 985-2223) in the initial block; staged at `$81FA`; 37 B before the pickup cold copy at `$4801` |
| `$7810-$7BCF` | 960 B | starfield stream A staging window (one exact `copy_pause_screen` copy, 915 B used, 45 B margin); the consumed extension cold source; ends below the GLUE cold record at `$7BD0` |
| `$7BD0-$7F2A` | 859 B | **no longer touched by starfield staging**: GLUE/ABI/low-C cold records and the Heavy image stay in place until their own publication |
| `$7E38-$7F2A` | 243 B | cold `HYBRID_C_HEAVY` image (unchanged); published once by `hybrid_c_heavy_publish`, an ascending copy to `$7E12-$7F04` (destination below the overlapping source) at the end of `publish_director_abi` |
| `$8100-$81F9` | 250 B | boot-only GLUE hold (moved from `$8300`): the head of the consumed resident staging interval (C Light state, profile cache, unowned bytes and ring rows 0-2), idle until gameplay init rewrites it |
| `$81FA-$85B9` | 960 B | starfield stream B staging window (one exact `copy_pause_screen` copy, 896 B used, 64 B margin) in idle ring/table RAM behind the GLUE hold; the idle range continues to `$8601` |
| `$8400-$84F2` | — | former boot-only Heavy hold: **retired** |
| `$7F2B-$81CF` | — | former three-copy starfield spill past the Heavy staging, over A2 staging and the ring head: **gone** |
| `$217C-$2193` | 24 B | `stage_starfield_stream` in the bootstrap prefix (replaces the retired pre-DFMC `unpack_boot_broadside_runtime`, 27 B): stream A copy from the record `stage_boot_streams` prepared, stream B copy from `starfield_packed_source_b` |
| `$20B6-$20D9` | 36 B | `unpack_starfield_runtime`: expands stream A from `$7810`, then stream B from `$81FA`, into the one continuous `$54E4` destination |
| `$20DA-$20FD` | 36 B | `boot_stage_streams` table, six records (the two starfield records are the deferred ones) |
| `$21AD-$21BA` | 14 B | `hybrid_c_heavy_publish` (the former `hybrid_c_heavy_hold` copy retargeted); the 17 B post-loader publish copy is retired |
| `$21BE-$21C0` | 3 B | remaining zero padding of the fixed `$01A3` bootstrap prefix (2 B before) |
| `$9495-$94A3` | 15 B | `.res` in ENTITY_CODE where the three pause-screen copies stood; every later ENTITY entry point keeps its address |

Boot order (unchanged except where noted): `stage_boot_streams` copies A2,
ENTITY, pickup and resident and prepares the stream A record;
`unpack_resident_runtime`; `unpack_entity_runtime`; `publish_director_abi`
(ABI, low C, extension) now tail-jumps to the single Heavy publish copy;
`stage_a2_kernel`; `stage_glue_holding` (to `$8100`) tail-jumps to
`stage_starfield_stream` (two exact 960-B copies); `init_entity_effects`;
pickup unpack; loader bitmap; `show_loader`; `unpack_starfield_runtime` (A, then
B, one destination); `layout_d_publish_glue`. The table-driven boot copier
`copy_boot_stream_backward` is stage-2 overlay code at `$21C1` that the
resident suffix replaces at step 2, which is why the deferred copies use the
resident `copy_pause_screen` (HEAD used it too, three times with a spill to
`$81CF`).

Packed STARFIELD representation: single stream 1,805 B → two independent
LZ-10/5 streams 915 + 896 = **1,811 B** (raw split at offset 985, chosen by
`scripts/build.mjs` as the smallest packed total among 16-byte-step cuts below
the largest stream-A prefix that fits 960 B; +6 B split overhead). The build
enforces A ≤ 960 B and B ≤ 960 B (physical copy windows) and a separate
reviewed total: baseline 1,811 B, hard gate **1,825 B** (= 1,819 − 1,805 + 1,811,
the same 14 B content headroom the single stream had), correction gate 1,804 B
(the open owner decision on the 1,798 B gate carried over unchanged, still 7 B
over). The single-stream gates 1,798 / 1,819 B are **superseded**, not
deleted; the two 960-B windows are not a content budget. Manifest:
`starfieldRuntime.streams`, `starfieldRuntime.packedTotalGate`.

Transport: initial content 13,166 → **13,162 B**, envelope 18 → 22 B, still
103 boot sectors and 178 transport sectors (ATR menu deadline 546 unchanged);
the eight DFMC records are unchanged. XEX 23,104 B. Reusable free capacity:
bootstrap-prefix padding 2 → 3 B; `HYBRID_C_HEAVY` 243 B, `HYBRID_C_EXT` 21 B,
`HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2 18 B and pickup fill 11 B
unchanged. The cold `$7BD0-$7F0F` range is now free of every starfield write,
which is the precondition for M2/M3 (direct-landing arena).

Asserts (`src/main.s`): A ≥ BROADSIDE reservation end and A end ≤ `$7BD0`;
B ≥ GLUE hold end and B end ≤ `$8602`; both stream windows equal one
pause-screen copy; GLUE hold ≥ `$8100` and below stream B; Heavy window below
its staging (ascending copy) and above stream A; Heavy window and staging
limits as in 4.5a. Evidence:
[diagnostics/stage-2b2k-starfield-staging-swap.json](diagnostics/stage-2b2k-starfield-staging-swap.json).

## Roadmap 4.5M-M2 cold-record relocation — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `58404c6` (the 4.5M-M1 candidate). Boot-transport and
cold-lifetime change only: no gameplay, runtime-map, PMG, DLI, collision or
ENTITY-order change; linked runtime 17,502 B, simultaneous residency 19,493 B,
safe residency 2,694 B, every CODE/BROADSIDE/STARFIELD/A2/ENTITY/PICKUP/C
address and the GLUE hold are unchanged (`.lbl` diff: one added label,
`layout_d_cold_publish_complete` `$2040`). The cold records that owned
`$7BD0-$7E11` left it; M3 turns `$7BD0-$7F0F` into the direct-landing arena.
These rows override the boot-time rows above for this candidate only.

| Range | Size | Candidate owner (boot time) |
| --- | ---: | --- |
| `$7BD0-$7E11` | 578 B | **no boot, cold or runtime owner** (was GLUE `$7BD0`, ABI `$7CCA`, guard `$7D3E`, low-C `$7D40`): no DFMC record, XEX segment, staging window or hold intersects it; native write-watch 0 writes from `start` through the full lifecycle |
| `$7E12-$7F04` | 243 B | `HYBRID_C_HEAVY_RAM` runtime window, unchanged; only its first 44 B are written by the boot copy (transport capacity below) |
| `$7E38-$7F2A` | — | former cold Heavy staging in the low-C record: **gone** (`$7E12-$7F2A` keeps no cold owner) |
| `$8018-$808C` | 117 B | **ABI cold record** (LZ, 116 B packed, 2 sectors): directly after A2 staging (`$7F2B` + 237 B), inside the entity-state page; consumed by `publish_director_abi` (copy to `$8701-$8775`) before `unpack_entity_runtime` and 255,216 cycles before `init_entity_effects` clears `$8000-$80FF` |
| `$9B40-$9D31` | 498 B | **merged low-C/GLUE/Heavy cold record** (one LZ record, 457 B packed, 4 sectors): low-C image `$9B40-$9C37` (242 B used, 6 B pad to the `$F8` reservation, published to `$8B88` by `DIRECTOR_PUBLISH_LOW`), GLUE image `$9C38-$9D31` (250 B, held at `$8100` by `stage_glue_holding`); above the packed resident staging end `$9B1E` (33 B margin, build enforced) and inside the later ENTITY expansion `$9100-$9D50` |
| `$9D32-$9D5D` | 44 B | Heavy window image tail of the merged record (0 B used): transport capacity bounded by `DIRECTOR_C_PRE` at `$9D5E`; `hybrid_c_heavy_publish` copies exactly 44 B to `$7E12` (disjoint copy) |
| `$8100-$81F9` | 250 B | boot-only GLUE hold, unchanged address; filled by the `publish_director_abi` tail instead of `stage_a2_kernel` |
| `$9B14-$9B1E` | 11 B | still packed resident staging: the planned `$9B14` landing collided with the measured staging end, hence `$9B40` |

Boot order (changed where noted): `stage_boot_streams`; `unpack_resident_runtime`;
**`publish_director_abi`** (ABI `$8018 → $8701`, low C `$9B40 → $8B88`,
extension `$7810 → $8C7D`, then `stage_glue_holding` `$9C38 → $8100` and
`hybrid_c_heavy_publish` `$9D32 → $7E12`) — moved before
`unpack_entity_runtime`, whose expansion covers the merged record;
`layout_d_cold_publish_complete`; `unpack_entity_runtime`; `stage_a2_kernel`
(now tail-jumps `stage_starfield_stream` directly); `init_entity_effects`;
pickup unpack; loader bitmap; `show_loader`; `unpack_starfield_runtime`;
`layout_d_publish_glue`. Nothing else was reordered. The resident suffix is
size-neutral (`stage_glue_holding` `jmp` → `jmp`, `publish_director_abi` `jmp`
→ `jmp`), the bootstrap prefix keeps its 3 B of padding and every suffix address.

Transport (measured): 8 → **7 DFMC records** (one slot free for M3), 178 →
**177 transport sectors** (ATR menu deadline 546 → 544), initial content
13,162 B, envelope 22 B and 103 boot sectors unchanged (the 142 → 126 B
manifest sits in the fixed stage-2 reservation). Before: GLUE 250 raw / 245
packed / 3 sectors (118 B padding) + low-C 248 / 213 / 2 (22 B) + ABI 117 /
116 / 2 (119 B). After: merged 498 raw / 457 packed / 4 sectors (34 B padding)
+ ABI 117 / 116 / 2 at `$8018` (119 B). Record order: BROADSIDE 104-148,
pickup 149-158, ABI 159-160, merged 161-164, extension 165-171, pre 172,
Director 173-177. XEX 23,104 → 23,100 B (the separate GLUE segment is gone;
its bytes ride the low-C transport segment at offset `$F8`).

Accounting (three separate metrics): **physical** resident code/data 0 B
(linked runtime, simultaneous and safe residency unchanged); **reserved
envelopes** — boot-only ABI cold record 117 B at `$8018` (entity-state page),
boot-only merged cold record 498 B at `$9B40` (ENTITY expansion region),
Heavy transport capacity 243 → 44 B (transitional until the M3 arena; the
runtime window stays 243 B; build enforces `HYBRID_C_HEAVY_BYTES` ≤ 44), cold
`$7BD0-$7E11` 578 B released; **reusable free** unchanged (`HYBRID_C_HEAVY`
243 B window, `HYBRID_C_EXT` 21 B, `HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2
18 B, pickup fill 11 B, bootstrap-prefix padding 3 B).

Asserts (`src/main.s`, `scripts/build.mjs`): merged record ≥ the stage-2 chunk
staging end and above the measured packed resident staging end; merged record
+ Heavy tail ≤ `$9D5E`; Heavy staging = GLUE staging + 250; Heavy image ≤ its
transport capacity ≤ the window; the Heavy window is disjoint from its staging;
ABI record ≥ A2 staging + A2 size and ≤ `$80FF`; the ABI veneer's
`DIRECTOR_LOW_STAGING` equals the build's record address; starfield stream A
ends ≤ `$7BD0`; no record, staging window or hold intersects `$7BD0-$7E11`
(`encounterDirector.coldRecordRelocation.freedColdRange.owners` is empty).
Evidence:
[diagnostics/stage-2b2l-cold-record-relocation.json](diagnostics/stage-2b2l-cold-record-relocation.json).

## Roadmap 4.5M-M3 HYBRID_C_ARENA — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `cac8657` (the 4.5M-M2 candidate). Infrastructure only: no
gameplay, PMG, DLI/VBI, collision, renderer or ENTITY-order change; every
CODE/BROADSIDE/STARFIELD/A2/ENTITY/PICKUP/LIGHT/C/ABI/GLUE address is unchanged
(`.lbl` diff: `hybrid_c_heavy_publish` and its `@copy` removed, the arena
segment symbols and `hybrid_arena_anchor` `$7BD0` added; nothing moved). These
rows override the Heavy-window rows of the 4.5a, M1 and M2 sections.

**`$7BD0-$7F0F` = `HYBRID_C_ARENA`, 832 B.** It replaces the temporary 243-B
`HYBRID_C_HEAVY` window architecture (4.5a) and its 44-B M2 transport tail.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$7BD0-$7F0F` | 832 B | **`HYBRID_C_ARENA_RAM`** (`cfg/encounter-director.cfg`): one contiguous reusable runtime arena, resident for the whole lifetime; segments in link order `HYBRID_ASM_ARENA` (ca65 helpers linked with the ABI veneer), `HYBRID_C_ARENA` (cc65 CODE), `HYBRID_C_ARENA_RODATA` (cc65 RODATA) |
| `$7BD0` | 1 B | `hybrid_arena_anchor` (`rts`, never called): the smallest non-empty record anchor, so the arena record exists whatever a later step places here |
| `$7BD1-$7F0F` | 831 B | arena free (no writer: native watch 0 writes from `start` through the full lifecycle) |
| `$7E12-$7F04` | — | former `HYBRID_C_HEAVY_RAM` window: **part of the arena**, no separate capacity |
| `$9D32-$9D5D` | — | former 44-B Heavy tail of the merged low-C/GLUE record: **retired** (the record is 498 B `$9B40-$9D31`, 44 B margin below `$9D5E`) |
| `$21AD-$21BA` | 14 B | former `hybrid_c_heavy_publish`: zero padding in place (`.res 14`), so `hostile_weapon_step_masks` stays at `$21BB`; prefix padding 3 B at the tail unchanged |
| `$21CC-$21CE` | 3 B | former `jmp hybrid_c_heavy_publish` tail of `stage_glue_holding`: now `rts` + 2 B padding (`$21CD-$21CE`), so `publish_director_abi` stays at `$21CF` |

Link and assembly contracts: ld65 (`src/hybrid/c-asm-abi.s`, `lderror`) asserts
arena start `$7BD0`, capacity 832 B, start + capacity ≤ `$7F10`, ASM + CODE +
RODATA ≤ capacity and a non-empty anchor; ld65 also rejects any memory-area
overflow (measured: an 833-B payload fails with "overflows memory area by 1
byte" and the arena assertion). `src/main.s` asserts arena end ≤
`PLAYFIELD_DLIST_A` (`$7F10`) and ≤ A2 staging (`$7F2B`), start ≥ starfield
stream A staging end and pause-screen backup end (`$7BD0`), image 1..832 B.
`scripts/build.mjs` rechecks the same contract and that the arena record is the
only record, staging window, hold or backup intersecting `$7BD0-$7F0F`
(`residentCapacity.arena.ownersInArena`).

Transport (measured): **8 DFMC records** (the M2 slot is used), 177 → **178
transport sectors** (ATR menu deadline 544 → 546 by the unchanged formula).
The arena record: LZ, staging `$8100`, final destination `$7BD0`, sector 173, 1
sector, 1 B raw / 3 B packed, 104 B sector padding; landing is direct (ATR
stage 2 decodes it to `$7BD0`; the XEX carries a 1-B segment at `$7BD0`). Record
order: BROADSIDE 104-148, pickup 149-158, ABI 159-160, merged low-C/GLUE
161-164, extension 165-171, pre 172, **arena 173**, Director 174-178. Initial
content 13,162 B, envelope 22 B, 103 boot sectors unchanged; manifest 126 →
142 B inside the fixed stage-2 reservation; XEX 23,100 → 23,105 B; boot image
22,656 → 22,784 B. Packed record bytes 8,751 → 8,754 B. Worst case: 832
pseudo-random bytes pack to 840 B in 7 sectors (fits the 50-sector stage-2
staging).

Accounting (separate metrics, measured): **physical** linked runtime 17,502 B
unchanged, simultaneous residency 19,493 → 19,494 B (+1, the anchor), safe
residency 2,694 → 2,693 B; **reserved** `HYBRID_C_ARENA` 832 B (replaces the
243-B Heavy window reservation; +589 B reserved, all in the range M2 freed);
**reusable** arena 831 B free (was `HYBRID_C_HEAVY` 243 B), `HYBRID_C_EXT` 21 B,
`HYBRID_C_SECTOR` 8 B, ENTITY_CODE 13 B, A2 18 B, pickup fill 11 B unchanged;
**arena** capacity 832 B, used 1 B (ASM 1, C CODE 0, RODATA 0), free 831 B;
**BSS** unchanged (C 16 B, C stack 0, new zero page 0). Arena capacity is a
segment-local limit, not machine exhaustion.

Capacity proof (throwaway scratch tree, not committed): 20 cc65 functions
(775 B CODE) + a 34-B cc65 RODATA table + a 22-B ca65 helper behind the anchor
filled the arena to exactly 832 B; the record packed to 363 B in 3 sectors (180
transport sectors). Native write-watch PASS 4/4 (XEX/ATR × `$00`/`$A5`): the
832-B arena equals `build/encounter-director-code-arena.bin` at `start`, 0
writes through the full lifecycle. Boot smoke on that proof: XEX menu 392
(deadline 502); ATR menu **551 against deadline 550** (one frame over: decoding
the full record costs more than the per-sector allowance). Evidence:
[diagnostics/stage-2b2m-hybrid-c-arena.json](diagnostics/stage-2b2m-hybrid-c-arena.json).

## Emitter-independent hostile shots — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `2a67684`. Only ENTITY_CODE contents shrink (the 27-B
Raider-kill projectile cleanup is removed); no segment, reservation, record or
BSS range changes. These rows override the ENTITY_CODE rows above.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$9100-$9D15` | 3,094 B | ENTITY_CODE code (−27 B) |
| `$9D16-$9D25` | 16 B | `light_glyph` (Wingman art, bytes unchanged) |
| `$9D26-$9D35` | 16 B | `light_interceptor_glyph` (one page with the Wingman table) |
| `$9D36-$9D5D` | 40 B | free ENTITY_CODE reservation tail (13 B before) |

ENTITY packed 2,717 → 2,692 B; initial boot content 13,162 → 13,137 B (103
sectors, envelope 22 → 47 B); 178 transport sectors unchanged. Linked runtime
17,475 B, simultaneous 19,467 B, safe 2,720 B. The merged low-C/GLUE record
`$9B40-$9D31` stays inside the later ENTITY expansion.

## Roadmap 4.5c Bomber — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of `67bfa73` (emitter-independent hostile shots). The
`experiment/bomber-4.5c-blocked-placement` design (`8e138a8`) is placed in the
M3 arena instead of the retired `HYBRID_C_HEAVY` window; no new reservation,
record or hold. These rows override the arena, EXT/LIGHT, pickup and
`$8119-$813F` rows above.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$7BD0` | 1 B | `hybrid_arena_anchor` (`rts`), still first |
| `$7BD1-$7BE3` | 19 B | `HYBRID_ASM_ARENA` Heavy lifecycle veneers: `enemy_recycle`, `enemy_spawn_raiders`, `heavy_publish_hull_colour` (writes `COLPM1`/`COLPM2`) |
| `$7BE4-$7D39` | 342 B | `HYBRID_C_ARENA` cc65 CODE: `heavy_publish_profile`, `enemy_c_spawn_raiders` (formation admission), `bomber_turn`, `enemy_c_heavy_tick` (4.5d hull ramp: +3 B) |
| `$7D3A-$7D5A` | 33 B | `HYBRID_C_ARENA_RODATA`: TEMPORARY 4.5 HEAVY SMOKE SCHEDULER columns (archetype, roster shape, hull colour, Light escort), profile field map, lane-sweep start, lane bounds and entry depths |
| `$7D5B-$7F0F` | 437 B | arena free (no writer: native watch 0 writes through the full lifecycle) |
| `$8119` | 1 B | `encounter_heavy_index`: **temporary** Heavy smoke schedule counter (`HYBRID_ENCOUNTER_STATE`; cc65 emits the segment in reverse declaration order), reset in `lifecycle_c_init` |
| `$811A` | 1 B | `encounter_light_index`: provisional Light schedule counter (was `$8119`) |
| `$811B` | 1 B | `heavy_archetype_offset`: selected Heavy record (0 Raider, 36 Bomber) (`HYBRID_HEAVY_STATE`) |
| `$811C` | 1 B | `heavy_hull_colour`: `$44` Raider / `$88` Bomber (4.5d: hue 8, full-HP entry of the HP ramp); ASM publishes it, recycle restores `$44` for the capital broadside missiles M1/M2 |
| `$811D-$8121` | 5 B | ticked member scalars X, Y, direction, fire timer, turn timer (marshalled from/to `$5478-$5481` by `heavy_member_update`) |
| `$8122-$8123` | 2 B | C scratch `heavy_scratch`, `heavy_index` |
| `$8124-$813F` | 28 B | unowned |
| `$8110-$8118` | 9 B | profile cache, now copied from the **selected** Heavy record (was hardcoded Raider) |
| `$885B-$8B5F` | 773 B | `PICKUP_CODE` (+4 B: generic `weapon_class` allocator `asl/asl/asl/ora`, burst runtime passes the profile class) |
| `$8B60-$8B66` | 7 B | pickup stream zero fill (11 B before) |
| `$8C7D-$8CAE` | 50 B | `ENEMY_ARCHETYPE_DATA`: four 12-B records (Bomber at offset 36) + 2-B Light schedule |
| `$8CAF-$8EE1` | 563 B | `HYBRID_C_EXT` C (was 637 B: formation admission and profile publication moved to the arena; the Light escort admission stays here as `encounter_light_admit`) |
| `$8EE2-$8FAC` | 203 B | `LIGHT_CODE`, unchanged size |
| `$8FAD-$8FE3` | 55 B | `HEAVY_CODE` `heavy_member_update` (member marshalling + class emission), main-linked after `LIGHT_CODE` in the extension stream |
| `$8FE4-$8FFF` | 28 B | free contiguous `HYBRID_C_EXT` tail (21 B before; owner floor 16 B) |

Transport (measured): 8 records, **180 transport sectors** (178 before; ATR
menu deadline 550). Arena record LZ 392 B raw / 355 B packed, sectors 173-175;
extension record 871 B raw / 778 B packed, 7 sectors; pickup record 1,170 B;
Director moves to sectors 176-180. Initial content 13,137 → 13,132 B, envelope
47 → 52 B, 103 sectors. XEX 23,105 → 23,497 B; boot image 22,784 → 23,040 B.

Accounting (separate metrics, measured): **physical** linked runtime 17,475 →
17,479 B (+4 pickup), simultaneous residency 19,467 → 19,855 B (+388), safe
residency 2,720 → 2,332 B; **reserved** unchanged (arena 832 B, EXT 899 B);
**reusable** arena 831 → 440 B free, `HYBRID_C_EXT` tail 21 → 28 B, pickup fill
11 → 7 B, `HYBRID_C_SECTOR` 8 B, ENTITY_CODE 40 B, A2 18 B unchanged; **BSS**
+10 B in previously unowned `$811A-$8123` (C stack 0, new zero page 0).
Evidence:
[diagnostics/stage-2b2o-bomber-arena.json](diagnostics/stage-2b2o-bomber-arena.json).

## Death-frame deferral — OWNER-SMOKE CANDIDATE (2026-09-17)

Measured on top of the 4.5d Enemy Identity Freeze WIP (`7b50bd6`, XEX
`838a9686…`). Only ENTITY_CODE grows (+18 B); no BROADSIDE, CODE, A2, STARFIELD,
BSS, reservation or record range changes, and the Light art tables keep their
addresses. These rows override the ENTITY_CODE tail rows above.

| Range | Size | Candidate owner |
| --- | ---: | --- |
| `$9D16-$9D35` | 32 B | `light_glyph`, `light_interceptor_glyph` (unchanged) |
| `$9D36-$9D47` | 18 B | `player_dying_tick`: first DYING tick begins the deferred player explosion, then counts `BROAD_DEATH_TIMER` (entered by `jmp` from `update_player_death`) |
| `$9D48-$9D5D` | 22 B | free ENTITY_CODE reservation tail (40 B before) |

BROADSIDE stays 6,650 B: `apply_player_damage` spends the former
`jsr begin_player_fighter_explosion` bytes on its own `jmp update_hud_status`
tail and `update_player_death` replaces its 10-B `@dying` body with
`jmp player_dying_tick` + 7 B of `$EA` padding, so `free_broadside_slot`
`$76A7` and every BROADSIDE/CODE label are unchanged (`.lbl` diff). 182
transport sectors, initial boot content 13,150 B (envelope 34 B), ATR menu 554
against deadline 554.

4.5d Heavy BSS correction (measured from `encounter-director.lbl` and the
lifecycle listing): `HYBRID_HEAVY_STATE` is `$811B-$8125` (11 B, was 9 B at
4.5c). `$8122` `heavy_member_aux` (hit-flash/HP latch), `$8123`
`heavy_member_colour` (published to `COLPM1`/`COLPM2`), `$8124-$8125` C
scratch `heavy_scratch`, `heavy_index` (moved from `$8122-$8123`); `$8126-$813F`
unowned. The 4.5c rows above (`$8122-$8123` scratch, `$8124-$813F` unowned)
describe the 4.5c candidate only.

## Segment free tails at the current checkpoint — OWNER-SMOKE CANDIDATE (2026-09-18)

Measured from `build/void-strike-65.lbl`, `build/encounter-director.lbl` and
`build/manifest.json` at HEAD (destructible debris, `5b1b6d1`, the segment
neighbour guards, and the 4.5d Bomber identity: `HYBRID_C_ARENA` 614 → 617 B,
free tail 218 → **215 B**, every other segment size-neutral). **These rows
override every earlier free-tail row in this file**; earlier sections stay as
history of how each tail moved.

| Segment | Used | Real neighbour | Free tail |
| --- | ---: | --- | ---: |
| `BROADSIDE` `$5E10-$780C` | 6,653 B | `BROADSIDE_RAM` end `$7810` | **3 B** (`$780D-$780F`) |
| `HYBRID_C_ARENA` `$7BD0-$7E38` | 617 B | A2 display lists `$7F10` | **215 B** |
| `DIRECTOR_ABI` `$8701-$8775` | 117 B | `PICKUP_CODE_RAM` `$8776` | **0 B** |
| `PICKUP_CODE` `$885B-$8B5F` | 773 B | window end `$8B67` | **7 B** stream fill |
| `DIRECTOR_C_LOW` `$8B88-$8C79` | 242 B | `HYBRID_C_EXT_RAM` `$8C7D` | **3 B** |
| `HYBRID_C_EXT` + `LIGHT_CODE`/`HEAVY_CODE` `$8C7D-$8FEC` | 880 B | `$9000` | **19 B** |
| `HYBRID_C_SECTOR` `$8602-$86F1` | 240 B | window end `$86FA` | **8 B** |
| `A2_KERNEL` `$9000-$90EC` | 237 B | `ENTITY_CODE` `$9100` | **19 B** |
| `ENTITY_CODE` `$9100-$9D5C` | 3,165 B | `DIRECTOR_C_PRE` `$9D5E` | **1 B** (`$9D5D`) |

ENTITY_CODE tail detail: Light art tables `light_glyph` /
`light_interceptor_glyph` `$9D2B-$9D4A` (32 B), `player_dying_tick`
`$9D4B-$9D5C` (18 B), free `$9D5D` (1 B).

`ENTITY_CODE_RESERVED_BYTES = $F00` describes the `ENTITY_CODE_RAM` **area**
(`$9000-$9FFF`), not the first real neighbour. `DIRECTOR_C_PRE` starts at
`$9D5E`, so `$9D5E-$9FFF` (675 B) is phantom headroom that the ca65 asserts in
`src/main.s` cannot see; the same defect class applies to `DIRECTOR_ABI`
(1 B phantom) and `DIRECTOR_C_LOW` (3 B phantom). The link-time guards added at
this checkpoint are the ones that actually fire:

| Guard | Placed in | Link |
| --- | --- | --- |
| `__ENTITY_CODE_RAM_LAST__ <= $9D5E` | `src/main.s` | `void-strike-65` |
| `__PICKUP_CODE_RAM_LAST__ <= $8B67` | `src/main.s` | `void-strike-65` |
| `__DIRECTOR_ABI_RAM_LAST__ <= $8776` | `src/hybrid/c-asm-abi.s` | `encounter-director` |
| `__DIRECTOR_C_LOW_RAM_LAST__ <= $8C7D` | `src/hybrid/c-asm-abi.s` | `encounter-director` |

`__*_RAM_LAST__` is the address **after** the last byte used in the memory area,
so the comparison is against the neighbour's first byte. `HYBRID_C_EXT` has no
linker guard because its tail is shared between two link units; `scripts/build.mjs`
refuses it there instead, and `residentCapacity.tails` now throws on any negative
tail rather than shipping the overrun in the manifest.

**Option D — Bomber standing cost (`OWNER-SMOKE CANDIDATE`, 2026-09-18).**
**Exactly** size-neutral in every segment, by construction. The skip is paid
for out of three retirements, netting to zero bytes: the 5-byte executable
`.res` pad after `HYBRID_ENEMY_RETIRE_MEMBER` (-5), 1 of the 2 bytes at
`draw_enemy_offscreen_layout_pad` (-1), and the retired `ENEMY_TARGET_Y`
round-trip inside the body copy — `sta`/`ldy` replaced by `tay` (-3, +1) —
against the `cmp ENEMY_Y,x` / `php` compare carried across the HPOS arithmetic
(+4), the `plp` / `beq` that consumes it (+3), the caller's `pla` / `pha` (+2)
and the `lda #ENEMY_Y_NEVER` sentinel (+2). So every fixed BROADSIDE
integration target keeps its address and `free_broadside_slot = $76A7` still
asserts. Removing those two pads also satisfies the standing rule against
`.res $EA` padding on executed paths. **The
table above is unchanged: `BROADSIDE` 6,653 B used / free tail 3 B,
`ENTITY_CODE` 1 B, `HYBRID_C_ARENA` 617 / 832 B with 215 B free, and no other
segment moved.** Only compression shifts: the packed BROADSIDE transport goes
5,642 → 5,644 B (+2 B) in the same 45 sectors, total transport stays 182
sectors, and the ATR menu milestone stays **554**, which is the committed boot
baseline for the ATR medium (see the note at the top of this file: the old
554-frame identity deadline is superseded; 554 is 11.08 s against a
3,000-frame / 60-second budget, with 2,446 frames of headroom). Evidence: 0 distinct miss events across 69 audited replays, worst fence
margin 1,464 cycles, and 0 stale or torn `P1`/`P2` rows across 134,880 traced
frames.

**Standing rule.** Any commit that changes a segment's size must state the
resulting free tail in its commit message and update the table above.

**Standing rule.** Any commit that grows the transport on purpose must
re-record [boot-deadline-baseline.json](boot-deadline-baseline.json) in that
same commit and state the reason in the commit message. The baseline is data
under review, not an identity: it must never move on its own.

## Blocked-experiment evidence — not part of this map

The 2026-09-16 Interceptor experiment (`BLOCKED_PLACEMENT`) measured additional
sizes for `ENEMY_ARCHETYPE_DATA`, `HYBRID_C_EXT` and `HYBRID_LIGHT_STATE`. Those
numbers describe an **unbuildable** tree on branch
`experiment/interceptor-blocked-placement`, on the obsolete pre-4.3 basis, and
are deliberately **not** merged into the tables above.

Byte accounting:
[diagnostics/stage-2b2c-interceptor-blocked-placement.json](diagnostics/stage-2b2c-interceptor-blocked-placement.json).
Summary with labelled figures: [STATUS.md](STATUS.md).

## Boot transport layout — earlier `2df89da`

Light M1: 22,400 B in 175 sectors, initial content 13,113 B; the
pickup/collision record is 964 B at sectors 149-156 publishing from `$8776`,
the extension record is 742 B at sectors 164-169 expanding to `$8C7D-$8FEE`,
and later records move three sectors. Exact values: `build/manifest.json`.

The hybrid transport is 22,016 bytes in 172 occupied sectors. BRCNT loads the
13,184-byte/103-sector initial block at `$2000-$537F`; the entry point remains
`$201E`. Initial content is 13,084 B and ends at `$531B`; the remaining bytes
are transport padding.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$26A9` | 1,257 B | stage-2 SIO/CRC/per-record-end/manifest overlay |
| `$26AA-$40BD` | 6,676 B | packed resident suffix; staged at `$8100-$9B13` |
| `$40BE-$478C` | 1,743 B | packed 2,145-byte starfield/music runtime; deferred staging at `$7810`, then expansion to `$54E4-$5D44` |
| `$478D-$4879` | 237 B | A2 source; staged at `$7F2B`, then copied to `$9000-$90EC` before entity/effects clear |
| `$487A-$5317` | 2,718 B | packed 3,160-byte ENTITY_CODE; copied backward to `$5318-$5DB5`, then expanded to `$9100-$9D57` |
| `$5318-$531B` | 4 B | source-owned `DFB1` trailer |
| ATR sectors 104-148 | 5,760 B | external BROADSIDE record: 5,653 B packed / 6,650 B raw to `$5E10` |
| ATR sectors 149-155 | 896 B | 788-B pickup/collision stream; publishes 904 B to `$8800-$8B87` |
| ATR sectors 156-158 | 384 B | GLUE: 245 B packed / 250 B raw to `$7BD0-$7CC9`, then held at `$8600-$86F9` |
| ATR sectors 159-160 | 256 B | 116-B packed / 117-B ABI veneer staged at `$7CCA`, then published to `$8701-$8775` |
| ATR sectors 161-162 | 256 B | 210-B packed / 242-B low C code staged at `$7D40`, then published to `$8B88-$8C79` after resident-suffix consumption |
| ATR sectors 163-166 | 512 B | already-packed lifecycle stream, 423 B packed / 520 B raw, staged at `$7810-$79B6`, then expanded to `$8C7D-$8E84` (current record: see the step 4.4 section) |
| ATR sector 167 | 128 B | 23-B packed / 21-B C RNG code to `$9D5E-$9D72` |
| ATR sectors 168-172 | 640 B | 542-B packed / 643-B tables and high C code to `$9D75-$9FF7` |

The `DFMC` v1 manifest is 142 B for eight records. The ATR has 548 free sectors
(70,144 B).
Runtime and transport budgets remain separate; the hybrid Director
simultaneous-residency accounting reports 3,273 B safe.

## Loader-time ownership

| Range | Size | Loader role |
| --- | ---: | --- |
| `$33AF-$33D1` | 35 B | packed 202-byte loader display-list source |
| `$381F-$3FCD` | 1,967 B | packed loader-bitmap source; `$3FCE-$3FEB` preserves its fixed residency with zero padding |
| `$3C00-$3CC9` | 202 B | expanded loader display list after its overlapping source has been consumed; PMG DMA is disabled for this boot-only lifetime and `clear_pmg` reclaims the range afterwards |
| `$4010-$4FFF` | 4,080 B | bitmap lines 0-101 |
| `$5000-$5E0F` | 3,600 B | bitmap lines 102-191 via second LMS at `$5000` |

The raw mixed ANTIC F/E bitmap is 7,680 B. PMG and PMG DMA are disabled during
this lifetime.

## Post-loader low and display memory

| Range | Size | Gameplay/frontend owner |
| --- | ---: | --- |
| `$3800-$3AFF` | 768 B | non-DMA resident/loader data in the PMG base window |
| `$3B00-$3FFF` | 1,280 B | active single-line PMG DMA pages |
| `$4000-$4027` | 40 B | fixed gameplay HUD / frontend screen prefix |
| `$4028-$404F` | 40 B | fixed gameplay divider; never a rotating/transient backing row |
| `$4050-$43FF` | 944 B | frontend screen RAM; not used by the expanded gameplay ring |
| `$4400-$47FF` | 1,024 B | gameplay charset |
| `$4800-$4BFF` | 1,024 B | frontend charset; before frontend construction, `$4801-$4AF2` temporarily preserves the 754-byte packed pickup/code/collision stream |
| `$4C00-$4D1F` | 288 B | expanded Allied hull map, 32x9 |
| `$4D20-$4E3F` | 288 B | expanded Hostile hull map, 32x9 |
| `$4E40-$4E70` | 49 B | persistent runtime state through difficulty setting |
| `$4E71-$4ECA` | 90 B | hull scroll, three cached final-raster bolt tops at `$4E72-$4E74`, backing, sector, lifecycle, music, muzzle, score, and two-phase engine state |
| `$4ECB-$4ED6` | 12 B | Raider archetype/active state (legacy `Interceptor` naming in source), damage, star RNG, one byte formerly used as the row-baked far-pattern phase (far stars retired), and three compatibility scalar bytes |
| `$4ED7-$4ED8` | 2 B | allied/enemy fixed-divider versus ring muzzle-domain state; consumes the former compatibility pad without shifting later state |
| `$4ED9-$4EE9` | 17 B | menu/gameplay music and tracked-muzzle state |
| `$4EEA-$4EFD` | 20 B | ten TOP SCORES records as parallel packed-BCD low/high arrays |
| `$4EFE-$4FF7` | 250 B | late-published integration glue, including physical shell-overlap detection, active-gameplay clock tick, and capital-local debris retry |
| `$4FF8-$4FF9` | 2 B | 16-bit active-gameplay frame counter |
| `$4FFA-$4FFF` | 6 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$5464-$5469` | 6 B | player/enemy PairShot burst controllers |
| `$546A-$546F` | 6 B | two shared fighter-explosion records |
| `$5470-$5471` | 2 B | C-owned Raider member-state array |
| `$5472-$5477` | 6 B | C-owned Raider HP plus ASM-owned pending damage/source mailboxes |
| `$5478-$547F` | 8 B | independent X, Y, signed velocity, and fractional movement accumulators |
| `$5480-$5485` | 6 B | independent manoeuvre state, timer, and behaviour phase |
| `$5486-$5489` | 4 B | ASM selected-slot/Y scratch and weapon cursor plus C-owned live count |
| `$5CF7-$5E05` | 271 B | free tail of the starfield reservation before BOOST backing — **[SUPERSEDED 2026-09-20: `STARFIELD` now ends `$5D93`; real free is `$5D94-$5E05`, 114 B]** |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$780D-$780F` | 3 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7CC9` | 250 B | GLUE staging until its byte-exact copy to `$8600-$86F9`; overwritten only by the later packed-starfield staging write |
| `$7810-$79B6` | 423 B | `2df89da`: cold packed lifecycle source until expansion to `$8C7D-$8E84` (520 B raw); later reclaimed by starfield staging. 4.4 candidate: 785 B `$7810-$7B20` expanding to `$8C7D-$8FE8` |
| `$7CCA-$7D3D` | 116 B | cold packed ABI source until publication to `$8701-$8775` |
| `$7D3E-$7D3F` | 2 B | cold staging guard |
| `$7D40-$7E31` | 242 B | cold low-C staging, expanded by the loader from its 210-B LZ record, until publication to `$8B88-$8C79` (the reservation runs to `$7E37`) |
| `$7E38-$7F2A` | 243 B | 4.5a candidate: cold `HYBRID_C_HEAVY` staging (used bytes only travel in the low-C record) until the ring hold copy |
| `$7E12-$7F04` | 243 B | 4.5a candidate: `HYBRID_C_HEAVY` runtime window, published after starfield expansion (see the 4.5a section) |
| `$7F05-$7F0F` | 11 B | unassigned after cold staging — **[SUPERSEDED 2026-09-20: inside the `HYBRID_C_ARENA` free tail `$7E39-$7F0F` (215 B); double-counted if both rows are summed]** |
| `$7F10-$7F69` | 90 B | expanded A2 display list A |
| `$7F6A-$7FC3` | 90 B | expanded A2 display list B |
| `$7FC4-$7FFF` | 60 B | unassigned |

During cold startup only, the packed starfield uses `$7810` after the lifecycle
stream there has been expanded, and the 237-byte A2 image occupies
`$7F2B-$8017`. Startup publishes the C extension first, then A2, held glue and
starfield, so all overlaps are lifetime-safe.

## BSS and high relocated runtime

| Range | Size | Current owner |
| --- | ---: | --- |
| `$8000-$805F` | 96 B | four physical interactive-entity slots plus global state; release active limit 2 |
| `$8060-$806A` | 11 B | projectile publication/ownership fit-proof state and lower-cell scratch |
| `$806B-$807F` | 21 B | initialized alignment reserve |
| `$8080-$80F3` | 116 B | six physical effect slots plus global state; release active limit 5 |
| `$80F4-$80FF` | 12 B | persistent Encounter Director state, initialized after the entity/effects clear |
| `$8100-$9B1E` | 6,687 B | cold-start resident-suffix staging only (measured packed size at the 4.5M candidates; grows and shrinks with the resident code) |
| `$8100-$810B` | 12 B | Light M1: C Light record `$8100-$8105`, ASM render cache/scratch `$8106-$810B` — **[SUPERSEDED 2026-09-20: `HYBRID_LIGHT_STATE` is `$8100-$810F`, 16 B]** |
| `$810C-$810F` | 4 B | unowned after cold startup — **[SUPERSEDED 2026-09-20: owned, inside `HYBRID_LIGHT_STATE` `$8100-$810F`]** |
| `$8110-$8118` | 9 B | C-owned derived archetype profile cache; ASM read-only (moved from `$8776`) |
| `$8119-$813F` | 39 B | unowned after cold startup — **[SUPERSEDED 2026-09-20: `HYBRID_ENCOUNTER_STATE` `$8119-$811A` and `HYBRID_HEAVY_STATE` `$811B-$8125` take 13 B; real free is `$8126-$813F`, 26 B]** |
| `$8140-$8577` | 1,080 B | 27-row physical gameplay ring, 40 bytes per row |
| `$8578-$8592` | 27 B | logical-to-physical row low-byte table |
| `$8593-$85AD` | 27 B | logical-to-physical row high-byte table |
| `$85AE-$85B6` | 9 B | A2 list/ring publication state |
| `$85B7` | 1 B | freshly generated allied boundary cell for new muzzle tracking |
| `$85B8-$85B9` | 2 B | allied/enemy tracked-muzzle backing |
| `$85BA-$85E1` | 40 B | prepared immutable COMBAT hull row; only side cells 0–8 and 31–39 are committed, leaving transient overlays authoritative |
| `$85E2-$85E5` | 4 B | prepared-row logical row, capital section, and physical ring-destination key |
| `$85D3` | 1 B | freshly generated enemy boundary cell, safely aliasing an unused centre byte of the prepared row |
| `$85E6-$85EE` | 9 B | unowned after cold startup |
| `$85EF-$85FF` | 17 B | unowned after cold startup; `$85F2-$85FF` was the head of the retired logical far-record pool — **[SUPERSEDED 2026-09-20: all of it is owned. `CORRIDOR_PHASE_HI` `$85EF`, `HULL_DRAW_ROW_LO`/`HI` `$85F0-$85F1`, near-star tables `$85F2-$8601`. The free gap is `$85E6-$85EE`, 9 B]** |
| `$8600-$86F9` | 250 B | `$8600-$8601` near-star state — **[SUPERSEDED 2026-09-20: those two bytes are the tail of `STAR_NEAR_SCREEN_HI`; the near-star state is `$85F2-$8601`, 16 B, and `$8602` is exactly where it ends]**; `$8602-$86F9` `HYBRID_C_SECTOR_RAM` (step 4.3, accepted `b4b942e`); the boot-only GLUE hold is at `$8300-$83F9` |
| `$86FA-$8700` | 7 B | hybrid C Director/lifecycle mailbox and scratch; software stack 0 B, new ZP 0 B |
| `$8701-$8775` | 117 B | hybrid C/ASM Director/lifecycle ABI veneer and startup publishers |
| `$8776-$8857` | 226 B | Light M1 `LIGHT_RESIDENT` kernel heading the pickup/collision stream |
| `$8858-$8B60` | 777 B | PMG pickup, single-window publication scaffold, narrow effect/PairShot backing resolver, and admission helpers |
| `$8B61-$8B66` | 6 B | zero fill of the pickup/collision stream |
| `$8B67-$8B87` | 33 B | inclusive 16x15-player versus final-raster swept-8x6-bolt AABB collision module |
| `$8B88-$8C79` | 242 B | low cc65 Director code |
| `$8C7A-$8C7C` | 3 B | free tail of `DIRECTOR_C_LOW_RAM` (see the overlap note below) |
| `$8C7D-$8C94` | 24 B | C `EnemyArchetype` RODATA: Raider + Light records — **[SUPERSEDED 2026-09-20: `$8C7D-$8CAE`, 50 B]** |
| `$8C95-$8F69` | 725 B | C sector/high-level enemy lifecycle and Light code — **[SUPERSEDED 2026-09-20: `HYBRID_C_EXT` `$8CAF-$8EE1`, 563 B]** |
| `$8F6A-$8FEE` | 133 B | Light M1 `LIGHT_CODE` late-publication kernel (extension tail) — **[SUPERSEDED 2026-09-20: `LIGHT_CODE` `$8EE2-$8FAC`, 203 B, plus `HEAVY_CODE` `$8FAD-$8FEC`, 64 B]** |
| `$8FEF-$8FFF` | 17 B | free extension tail — **[SUPERSEDED 2026-09-20: `$8FED-$8FFF`, 19 B]** |
| `$9000-$90EC` | 237 B | A2 kernel |
| `$90ED-$90FF` | 19 B | free A2 reservation tail |
| `$9100-$9D51` | 3,154 B | entity/effect/booster/projectile and H3.1 frontend runtime — **[SUPERSEDED 2026-09-20: `$9100-$9D5C`, 3,165 B]** |
| `$9D52-$9D5D` | 12 B | free ENTITY_CODE reservation tail — **[SUPERSEDED 2026-09-20: the free tail is 1 B, `$9D5D`]** |
| `$9D5E-$9D72` | 21 B | cc65 Director RNG code |
| `$9D73-$9D74` | 2 B | free ENTITY_CODE reservation tail — **[CLARIFIED 2026-09-20: 2 B is right, but it is the `DIRECTOR_C_PRE` → `LEVEL1_DATA` gap, not an `ENTITY_CODE` tail]** |
| `$9D75-$9FF7` | 643 B | C Director RODATA plus high CODE |
| `$9FF8-$9FF9` | 2 B | free Director reservation tail |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$A5FF` | 1,536 B | `SECTOR_READER` (roadmap 4.3): reader, loader-mode display, failure screen, AI text pool |
| `$A600-$B5FF` | 4,096 B | `LEVEL_BUFFER`, **32 sectors** since owner decision X (2026-09-21); was 44 |
| `$B600-$BBFF` | 1,536 B | `HYBRID_C_WINDOW` (owner decision X): the Director link's half of decision B's window, home of the Light kernel. Reached by its own DFMC record |
| `$BC00-$BC19` | 26 B | `READER_BSS` |
| `$BC1A-$BC1F` | 6 B | `HYBRID_C_WINDOW_GUARD`: reserved, no segment, in the same shape as the `$9FFA` Director guard |
| `$BC20-$BFFF` | 992 B | OS screen when BASIC is disabled at coldstart (`RAMTOP $C0`); never available to the build |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF` — but since owner
decision B the build *owns* `$A000-$BC1F`: see "Owner decision B plumbing"
below.

Owner decision A (2026-09-20) changed what that window *is*. Before it, whether
`$A000-$BFFF` held RAM or the BASIC ROM depended on how the player started the
machine. `disable_basic_rom` (14 B, inside the fixed bootstrap prefix, reusing
the retired 4.5M-M3 padding) now forces `PORTB` bit 1 — preserving bit 0, bit 7
and the bank-select bits — and writes `BASICF = $01` so a warm start does not
map the ROM back in. It is called from `boot_stage2_atr_entry` before the SIO
chunk load and from `boot_stage2_xex_entry` before `jmp start`, i.e. earlier
than every write either medium makes. The window is therefore unconditionally
RAM for the whole runtime: still unused, but now *reliably* unused rather than
avoided because its contents were unknowable.

## The window at `$A000-$BFFF` — measured top (2026-09-20)

**EMULATOR-MEASURED**, Atari800 7.1.2 PAL/XL, boot smoke 8/8 PASS. The boot
smoke observer (`scripts/atari800-wall-trace.h`) now records `SDLSTL`/`SDLSTH`
(`$0230`), `MEMTOP` (`$02E5`) and `RAMTOP` (`$6A`) in every snapshot. Until
this measurement the OS's occupation of the top of the window was an
**ESTIMATE** recorded nowhere in this repository.

| BASIC at coldstart | `RAMTOP` | `MEMTOP` | `SDLSTL`/`SDLSTH` | OS screen | Usable window |
| --- | ---: | ---: | ---: | --- | ---: |
| **disabled** (`-nobasic`), XEX and ATR | `$C0` | `$BC1F` | `$BC20` | `$BC20-$BFFF`, 992 B | `$A000-$BC1F` = **7,200 B** |
| **enabled** (`-basic`), XEX and ATR | `$A0` | `$9C1F` | `$9C20` | `$9C20-$9FFF`, 992 B | all `$A000-$BFFF` = 8,192 B |

Identical on both media and both cold RAM fills (`$A5`, `$5A`), and constant
across frames 250, 300, 3050 and 3300. The frame-1 snapshot reads zero on all
eight sessions — the OS has not yet initialised those cells that early.

**Plan against `$A000-$BC1F` = 7,200 B**, not 8,192 B: a machine cold-started
without BASIC has the OS screen at the top of the window, and the game cannot
choose how the player powers the machine on.

**The second result matters more, and nobody was looking for it.** Cold-started
**with** BASIC enabled, the OS puts `RAMTOP` at `$A0` and its screen at
`$9C20-$9FFF` — **not in the window, but inside the game's own resident RAM**.
That range is occupied today by the `ENTITY_CODE` tail (`$9C20-$9D5C`),
`DIRECTOR_C_PRE`, `LEVEL1_DATA` and `DIRECTOR_C_CODE` (`$9E13-$9FF7`): 992 B of
live C Director code and data. `disable_basic_rom` unmaps the ROM but **does
not move the OS's shadows**; `RAMTOP`, `MEMTOP` and `SDLSTL`/`SDLSTH` stay
wherever coldstart put them.

Nothing breaks today: the game takes the display over completely, and MEASURED
in the same snapshots `NMIEN = $80` from frame 250 onward, so the **OS VBI NMI
is disabled**. But this is exactly the hazard the between-levels reader (roadmap
4.3) has to handle: if the reader returns to OS SIO and revives the OS VBI, that
VBI restores the display-list pointer from `SDLSTL`/`SDLSTH`, and on a
BASIC-enabled cold boot that points at `$9C20`, into Director code.

**Carry into 4.3:** the loader-mode display state must **set the OS shadows to
its own values before handing control to SIO**, not merely restore the hardware
registers afterwards. Recorded here because it is a measurement, not a design.

Evidence: `build/runtime-wall-trace/boot-smoke/report.json`, per-session
`snapshots[].sdlst` / `.memtop` / `.ramtop`.

## Roadmap 4.3 — the window has an owner (2026-09-20)

The sector reader claims the whole window. It links on its own
(`src/hybrid/sector-reader.s` + `cfg/sector-reader.cfg`, plan §4 `[C5]`) and
travels as the ninth DFMC record, RAW, landing directly at `$A000`.

| Range | Bytes | Owner | Notes |
| --- | --- | --- | --- |
| `$A000-$A5FF` | 1,536 | `SECTOR_READER` | reader, loader-mode display, failure screen, 8-line AI text pool; **1,466 B used, 70 B free**. A sixteen-line pool does not fit — see plan §1.5 `[C6]`; packing the texts is the cheaper answer if it is ever wanted, not shrinking the level buffer |
| `$A600-$B5FF` | 4,096 | `LEVEL_BUFFER` | **32 sectors** (owner decision X, 2026-09-21; was 44), page-aligned, `file = ""` — never in any artifact. On the XEX the level-1 image is an **XEX-only block** placed here; on the ATR it is read over SIO |
| `$B600-$BBFF` | 1,536 | `HYBRID_C_WINDOW` | owner decision X: the Director link's half of the window, `cfg/encounter-director.cfg`. `HYBRID_ASM_WINDOW` + `HYBRID_C_WINDOW` + `HYBRID_C_WINDOW_RODATA` |
| `$BC00-$BC13` | 20 | `READER_BSS` | reader state; 6 B still free before `$BC1A` |
| `$BC1A-$BC1F` | 6 | `HYBRID_C_WINDOW_GUARD` | unchanged: reserved, no segment loads there |
| `$00A0-$00A1` | 2 | `READER_ZP` | the `(zp),y` destination pointer. `ZEROPAGE` ends at `$9F`, so this is the first free pair |

**Two links share the window, in disjoint halves (owner decision X,
2026-09-21).** The reader owns `$A000-$B5FF` and `$BC00-$BC19`; the Director
link owns `$B600-$BBFF` as `HYBRID_C_WINDOW_RAM`. Before the decision the
Director's declaration covered the whole window and was harmless only while it
stayed empty; `scripts/build.mjs` now asserts the halves cannot meet — the
window record must land at `$B600` and `$B600` must be at or above the end of
the level buffer the reader fills. A sixteen-line AI text pool still does not
fit in the reader's own 1,536 B: the freed 1,536 B went to code, not to text.

**Level runs on the ATR.** Level images are placed at absolute sector numbers
from a fixed base (`levelBaseSector` = 320), outside the boot transport, by
`makeAtr(payload, dataRuns)`. The base is a constant on purpose: the reader's
directory holds absolute sector numbers, so deriving them from the transport
size would make the reader's data depend on the length of its own record.
`build/level-directory.inc` is generated from the runs the build actually
placed and assembled into the reader, so the two cannot drift.

**MEASURED transport cost:** 183 → **195 sectors** over steps 3-4. ATR boot
milestones move +22 in total (loader 297 → 319, menu 554 → 576), inside the
+50 fail band; XEX milestones do not move at all. Baseline re-recorded in
`boot-deadline-baseline.json`; boot smoke 8/8, and the image at `$A600` is
now verified byte-exact against `build/level-1.bin` on every session.

### Light multiplicity steps 3-4 (2026-09-21) — multi-slot, appearance pairs, the token

| Range | Bytes | Owner |
| --- | ---: | --- |
| `$7FC4-$7FFA` | 55 | `HYBRID_LIGHT_SLOTS`: ten four-byte per-slot arrays, the cell-major backing, `light_resolve_save`, `light_cell_end`, `light_appearance_installed[3]`, three ceiling bytes and four wave bytes |
| `$7FFB-$7FFF` | **5 free** | — |
| `$8100-$810E` | 15 | `HYBRID_LIGHT_STATE`: the shared scratch, the three token bytes and the four admission/pair statics the C-stack contract forces |
| `$810F` | **1 free** | — |
| `$B600-$B92B` | 812 | `HYBRID_C_WINDOW` — the Light C, Director link |
| `$B92C-$BBC5` | 666 | `LIGHT_KERNEL` — the Light ASM kernel, its own link |
| `$BBC6-$BBFF` | **58 free** | — |

**Placement pressure moved twice, and the guards caught it both times.** Step
3's multi-slot ASM overran the 1,536-B window by **143 B**, so the cold
admission path went to the `HYBRID_C_EXT` tail decision X created. Step 4's
token then took that tail to **10 B — below the 16-B owner floor** — so the
token primitive, the ceiling and the live count moved back to the window with
the hot path that asks them. Settled: extension tail **70 B**, code window
**58 B**. The window is the scarce segment now, not the extension.

**Free tails (MEASURED).** `HYBRID_C_EXT` 70, pickup stream fill 236,
`HYBRID_C_ARENA` 165, `DIRECTOR_ABI` 11, `ENTITY_CODE` 1, A2 kernel 19,
`SECTOR_READER` 70, BROADSIDE 3, `HYBRID_LIGHT_SLOTS` 5,
`HYBRID_LIGHT_STATE` 1, code window 58. Extension record 448 → 829 B.
Transport 198 → **203 sectors**, eleven DFMC records.

### Light multiplicity step 2 (2026-09-21) — the glyph install is hoisted; ceilings

The 16-byte bitmap copy used to run on **every frame of a Light's life**,
because nothing tracked what the glyph pair held and `copy_charset` rebuilds
glyphs 120-125 at each new game. C now owns that bookkeeping
(`light_appearance_installed[3]`, reset to `$FF` by `lifecycle_c_init`) and
asks for the copy once, through the tick's exclusive return `$40`.

`enemy_c_light_tick` became a wrapper around `light_tick_body`: the body runs
in **full** on the admission frame — motion, retirement and fire cadence are
unchanged — and the install only replaces the RETURN, because the kernel can
perform one action per tick. Asking the tick consumes the decision (C marks the
pair as it returns), which is safe because nothing calls it twice in a frame.

**CPU, MEASURED (`measure-population-cost-deltas.mjs`, HARD, 700 frames,
n = 282 Light-alive frames), marginal cost of one Light, pre-fence:**

| | mean | min | max |
| --- | ---: | ---: | ---: |
| `82c155b`, before this work | 412 | 381 | 1,771 |
| after step 1c | 491 | 454 | 1,886 |
| **after step 2** | **257** | **221** | **1,652** |

So the hoist itself is **−234 mean**, and steps 1a-1c had added +79 (the SoA
indexing and the vector table). Net against `82c155b`: **−155 mean, −38 %**.
The plan expected ~147; the difference is the +79 its estimate did not carry.

**The worst frame moved the other way.** Native `2-sweep-fire4`, 920 frames:
worst pre-fence 19,222 → **19,294 (+72)**, margin 6,043 → **5,983**, max wall
29,455 → 29,456, 0 miss events. The install always ran on the admission frame
too, so that frame loses nothing and gains the new admission bookkeeping —
`light_ceiling()` and the four-slot `light_live_count()`, which
`encounter_light_admit` now asks on every `enemy_spawn_raiders`. The hoist
trades ~234 cycles off every standing Light frame for ~72 on the admission
frame, which in this replay is the binding one.

| Range | Bytes | Owner |
| --- | ---: | --- |
| `$7FC4-$7FFA` | 55 | `HYBRID_LIGHT_SLOTS`: the slot arrays, `light_resolve_save`, `light_appearance_installed[3]` and the three ceiling policy bytes |
| `$7FFB-$7FFF` | **5 free** | — |
| `$B600-$B8D9` | 730 | `HYBRID_C_WINDOW` — the Light C |
| `$B8DA-$BAAD` | 468 | `LIGHT_KERNEL` — the Light ASM kernel |
| `$BAAE-$BBFF` | **338 free** | — |

The ceilings are policy BYTES, not constants, so a harness test can poke one
without a build flag; `lifecycle_c_init` restores 3 / 1 / 0 (SWARM / ELITE /
CAPITAL). The shipped SWARM ceiling stays conditional on the native
three-Light measurement of plan §4.3.

**Free tails (MEASURED).** `DIRECTOR_ABI` **0 → 11 B**:
`_asm_director_can_allocate` moved to `HYBRID_ASM_ARENA`, which is where step 3
adds the wave lock and where there is room for it; the arena is 165 B free
(was 176). `HYBRID_C_EXT` 487 → **451 B** — `lifecycle_c_init` gained the
appearance and ceiling reset, the only Light-class code still in that
composite. Code window tail 485 → 338 B. Unchanged: pickup stream fill 236,
`ENTITY_CODE` 1, A2 19, `SECTOR_READER` 70, BROADSIDE 3,
`HYBRID_LIGHT_STATE` 8. Transport unchanged at 198 sectors and the boot
milestones do not move (XEX 134/391, ATR 325/582), so the baseline is not
re-recorded.

### Light multiplicity step 1c (2026-09-21) — the backing resolver is keyed by screen address

`light_cell_resolve` used to read the Light code as a cell index. That was
sound only while there was one Light whose two codes belonged to nobody else;
with several slots both supports are gone — slot count and code count are
independent, and two slots may carry the same code. The resolver now asks
**which slot's published address owns this cell**: `dst_ptr − light_screen[slot]`
∈ `{0, 1}` with `light_screen_hi[slot] != 0`, scanning the four slots.

The glyph range stays as a **fast-path filter only** — a cell outside
`$F8..$FD` leaves in the same few cycles as before, which is the common case
for every captured cell — and it covers all three appearance pairs now, even
though only pair 0 is written before step 3, because codes 122-125 are the
retired pickup bank that no runtime path puts on screen.

| Range | Bytes | Owner |
| --- | ---: | --- |
| `$B600-$B84D` | 590 | `HYBRID_C_WINDOW` — the Light C (Director link) |
| `$B84E-$BA1A` | 461 | `LIGHT_KERNEL` — the Light ASM kernel (its own link) |
| `$BA1B-$BBFF` | **485 free** | — |
| `$7FE8` | 1 | `light_resolve_save`, the resolver's hold for the caller's X |

The caller's Y and the captured byte go on the stack, so the 16-byte shared
area at `$8100` stays whole (8 B free) for the token and wave state of plan
§2.5 and §2.4. `HYBRID_LIGHT_SLOTS_RAM` is now declared as the whole 60 B
`$7FC4-$7FFF` rather than a chosen 48, so ld65's own overflow check and the
named assert in `c-asm-abi.s` bound it against its real neighbour: **49 B used,
11 B free.**

**MEASURED.** Kernel 411 → 461 B (the resolver replaced 31 B with 81);
transport unchanged at 198 sectors and the record still 4 sectors, so the boot
milestones do not move (XEX 134/391, ATR 325/582) and the baseline is not
re-recorded. Worst pre-fence `2-sweep-fire4` 19,220 → **19,222 (+2)**, margin
6,043, max wall 29,455 unchanged, 0 miss events — the slot scan only runs on a
cell that actually holds a Light code. Every other free tail unchanged.

### Light multiplicity step 1b (2026-09-21) — the Light ASM kernel is its own link

The code window is filled by **two links** whose boundary is not a constant.

| Range | Bytes | Owner | Link |
| --- | ---: | --- | --- |
| `$B600-$B84D` | 590 | `HYBRID_C_WINDOW` + `HYBRID_C_WINDOW_RODATA` — the Light C | Director link (built first) |
| `$B84E-$B9E8` | 411 | `LIGHT_KERNEL` — the Light ASM kernel | its own link, after main |
| `$B9E9-$BBFF` | **535 free** | — | — |

`build/director-abi.inc` carries `HYBRID_ASM_WINDOW_BASE`, which **is**
`__HYBRID_C_WINDOW_RAM_LAST__` from the same build — the address after the last
byte the C half used. `scripts/build.mjs` rewrites `cfg/light-kernel.cfg` from
it, `src/hybrid/light-kernel.s` asserts at link time that its run address
really is that value and that `__LIGHT_KERNEL_RAM_LAST__ <= $BC00`, and
`scripts/formats.mjs` re-checks both against the XEX block. So the halves meet
exactly, no byte is lost to a boundary, and neither half is sized by an
estimate (owner decision 2026-09-21, rejecting a fixed split).

`main.s` binds to the kernel through a **frozen five-entry vector table** at
the kernel's base and to nothing else — the shape it uses for the sector
reader's `$A000` vectors. The kernel reaches `main.s` through
`build/light-kernel-abi.inc`, generated from the linked main image: 13 call
targets, 12 data symbols and 11 constants, nine of which `main.s` now exports
so ca65 emits them into the label file.

**Free tails (MEASURED).** `HYBRID_C_EXT` 351 → **487 B** (`light_publish` and
`light_top` left; `LIGHT_CODE` keeps only `entity_debris_publish` and its two
debris helpers, 131 B); pickup stream fill 7 → **236 B** (`LIGHT_RESIDENT`'s
229 B are gone); code window tail 535 B; `HYBRID_C_ARENA` 176 B, `ENTITY_CODE`
1 B, A2 kernel 19 B, `SECTOR_READER` 70 B, `DIRECTOR_ABI` 0 B, BROADSIDE 3 B,
`HYBRID_LIGHT_SLOTS` 12 B, `HYBRID_LIGHT_STATE` 8 B, all unchanged. Extension
record 548 → 412 B raw, 507 → 371 B packed. Transport 197 → **198 sectors**,
eleven DFMC records.

**`STARFIELD` packed 1,811 → 1,780 B.** The 31-byte resolver left it, and it is
now **24 B under** the 1,804-B two-stream correction gate it had been 7 B over.
`tests/light-wingman.test.mjs` "Light kernel placement…" passes again for the
first time since 4.5M-M1. Whether that closes the open owner decision is the
owner's call, not this change's; the number is reported, not acted on.

### Light multiplicity step 1a (2026-09-21) — SoA slot state, Light C in the window

| Range | Bytes | Owner | Notes |
| --- | ---: | --- | --- |
| `$7FC4-$7FF3` | 48 | `HYBRID_LIGHT_SLOTS` | ten four-byte per-slot arrays plus one cell-major eight-byte backing array (`LIGHT_SLOT_COUNT` 4 × `LIGHT_CELL_COUNT` 2). Was 60 B unassigned; **12 B free** |
| `$7FF4-$7FFF` | 12 | — | still unassigned |
| `$8100-$8107` | 8 | `HYBRID_LIGHT_STATE` | the SHARED Light scalars only: `light_slot`, `light_scratch`, `light_slot_save`, `light_target_x` and three C-private temporaries. Was 16 per-Light scalars |
| `$8108-$810F` | 8 | — | free inside the same 16-B area, for the token (plan §2.5) and wave (§2.4) bytes |

The backing is **one cell-major array**, not the two per-slot arrays plan §2.1
spells out: the erase and render loops index backing by CELL (`lda
LIGHT_BACKING0,y`, y = 0..1), so two four-byte arrays would put slot 1's cell 0
where cell 1 belongs. Same eight bytes; the slot selects the base, the cell the
index. `light_leaderless` and `light_post_burst_slot` are gone — the first is
now the `light_state` value (1 escort, 2 free), the second one add at reload.

**Free tails (MEASURED).** `HYBRID_C_EXT` **19 → 351 B** — the Light C left it
for the window, and this is the largest resident hole since 4.3 Stage 1;
`HYBRID_C_WINDOW` 946 of 1,536 B free (590 used); `HYBRID_C_ARENA` 187 → 176 B
(`sector_c_drain_clear` gained the slot indexing); `HYBRID_LIGHT_SLOTS` 12 B;
`HYBRID_LIGHT_STATE` 8 B; `SECTOR_READER` 70 B, `ENTITY_CODE` 1 B, pickup
stream fill 7 B, A2 kernel 19 B, `DIRECTOR_ABI` 0 B, BROADSIDE 3 B, all
unchanged. Extension record 880 → 548 B raw, 787 → 507 B packed. Transport
195 → **197 sectors**, ten DFMC records. `STARFIELD` is untouched at 1,811 B
packed: the resolver has not moved yet (step 1c).

### Owner decision X (2026-09-21) — buffer 44 → 32 sectors, window at `$B600`

`MAX_LEVEL_SECTORS` 44 → 32, `LEVEL_BUFFER_RAM` `$1600` → `$1000`,
`BASIC_WINDOW_RAM` `$A000/$1C1A` → `HYBRID_C_WINDOW_RAM` `$B600/$0600`,
`MAX_CHUNKS` / `CHUNK_MAX_COUNT` 9 → 10.

**Free tails at this checkpoint (MEASURED, window still empty).**
`HYBRID_C_WINDOW` 1,536 of 1,536 B free; `LEVEL_BUFFER` 32 sectors against a
2-sector level-1 image; `BOOT_STAGE2` 751 B free (767 before: the tenth
manifest slot costs 16 B, as the 8 → 9 step measured). Every other tail
unchanged and measured: `HYBRID_C_EXT` 19 B, `ENTITY_CODE` 1 B, pickup stream
fill 7 B, A2 kernel 19 B, `DIRECTOR_ABI` 0 B, `HYBRID_C_SECTOR` 18 B,
`HYBRID_C_ARENA` 187 B, BROADSIDE 3 B, `SECTOR_READER` 70 B.

**Below `$A000` this step is not byte-identical, and cannot be.** The tenth
manifest slot grows the stage-2 reservation by 16 B, which moves five address
operands in the boot copier (`$20DB-$20F9`, each +16) — the only other change.
Every resident gameplay image is byte-identical: MAIN `CODE`/`RODATA`,
`STARFIELD`, `BROADSIDE`, `ENTITY_CODE`, `PICKUP_CODE`, the A2 kernel and
every Director image. The reader image changes by exactly one byte, the
`cmp #MAX_LEVEL_SECTORS+1` operand at reader offset 865 (45 → 33).

---

## Owner decision B plumbing — the window is open (2026-09-20)

The window is now part of the build's address space. **Superseded in part by
roadmap 4.3 above, which put the reader in it**; the plumbing below is still
the mechanism, and the "nothing has moved into it" note now reads as the state
this section was written in.

| Piece | Where | What it does |
| --- | --- | --- |
| `HYBRID_C_WINDOW_RAM` | `cfg/encounter-director.cfg` | `start = $B600, size = $0600, type = ro, file = %O` — the Director link's half (owner decision X; `$A000, size = $1C1A` before it) |
| `HYBRID_C_WINDOW_GUARD` | same | `start = $BC1A, size = $0006, type = ro, file = ""` — reserved, no segment loads there |
| `HYBRID_ASM_WINDOW`, `HYBRID_C_WINDOW`, `HYBRID_C_WINDOW_RODATA` | same | `load = HYBRID_C_WINDOW_RAM, type = ro` — the last MEMORY area in the config, so their bytes close `encounter-director-combined.bin` |
| ld65 assert | `src/hybrid/c-asm-abi.s` | `__HYBRID_C_WINDOW_RAM_LAST__ <= $BC00`, `lderror`, `"HYBRID_C_WINDOW reaches the sector reader BSS at $BC00"` — the real upper neighbour, plus `__HYBRID_C_WINDOW_GUARD_START__ = $BC1A` |
| Chunk loader (host) | `scripts/chunk-loader.mjs` | destinations up to `$BC1F` accepted; `$BC20` upwards refused as `"chunk destination enters the OS screen above $BC1F"`. `MAX_CHUNKS` 8 → 9 → **10** (owner decision X) |
| Chunk loader (guest) | `src/main.s` `BOOT_STAGE2` | the same bound, twice: record end `<= $BC20` and destination page `< $BD`. `CHUNK_MAX_COUNT` 8 → 9 → **10** |
| XEX | `scripts/build.mjs` | a 2-B `INITAD` record is emitted between the first block and every later one **whenever a block lands at or above `$A000`**, so the binary loader calls `disable_basic_rom` before placing it |

**Why the XEX needs the INITAD record.** The ATR is safe by construction:
`boot_stage2_atr_entry` calls `disable_basic_rom` before the first SIO read, so
every record is published into RAM. The XEX is not: its blocks are placed by the
binary loader, and `RUNAD` (`boot_stage2_xex_entry`) only runs *after* the whole
file is loaded. A block at `$A000` in a XEX started with BASIC enabled would be
written into the ROM and lost. `INITAD` (`$02E2`) is called by the loader as
soon as the record that writes it has been placed, and `disable_basic_rom`
already lives in the fixed bootstrap prefix at `$21AD`, inside the first block.

**MEASURED cost of `MAX_CHUNKS` 8 → 9:** `BOOT_STAGE2` `$4EF` → `$4FF` B, +16 B
exactly (the extra manifest record), inside its `$800` reservation — 767 B
still free. The boot payload stays 104 sectors, so the ATR menu frames do not
move.

**MEASURED proof that the window is real.** An inert 16-byte record
(`"VS65WINDOW" $A0 $00 $BC $1F $DE $AD`) was landed at `$A000` as the ninth DFMC
record and read back **byte-exact at frames 3050 and 3300 on all eight cold boot
sessions** — XEX and ATR, cold RAM fills `$A5` and `$5A`, BASIC enabled and
disabled — with `PORTB` bit 1 set in every snapshot. The two BASIC-enabled XEX
sessions are the interesting ones: they prove both that the ROM is unmapped and
that the `INITAD` record works. The probe was then removed, because its own DFMC
record costs one ATR transport sector (183 → 184, ATR menu 554 → 556 of a +50
band) and that sector pushes the `-nobasic` ATR loader raster past the boot
smoke's **fixed frame-300** observation — the margin there is only 3 frames
(loader milestone 297 → 299). The first real window record pays that sector and
must deal with the frame-300 checkpoint; the boot smoke keeps a standing
`PORTB` bit 1 assertion and reads the window back automatically as soon as it
carries content again. Evidence:
[diagnostics/owner-decision-b-basic-window.json](diagnostics/owner-decision-b-basic-window.json).

**Free tails after this change (measured, size-neutral below `$A000`).**
`BASIC_WINDOW` 7,194 of 7,194 B free; `BOOT_STAGE2` 767 B free (785 before);
every other tail unchanged: BROADSIDE 3 B, `HYBRID_C_ARENA` 440 B,
`DIRECTOR_ABI` 0 B, `HYBRID_C_SECTOR` 8 B, pickup stream fill 7 B,
`DIRECTOR_C_LOW` 3 B, `HYBRID_C_EXT` 28 B, A2 kernel 19 B, `ENTITY_CODE` 22 B.

## Boot-only ENTITY_CODE staging lifecycle — earlier `2df89da`

The packed ENTITY_CODE source is `$487A-$5317`. Its backward copy to
`$5318-$5DB5` is 2,718 B and begins exactly after the source. The staging end is
90 B below BROADSIDE at `$5E10`. After expansion to `$9100-$9D57`, the staging
range is released. The later starfield destination `$54E4-$5D44` overlaps that
released range over 2,145 B; both lifetimes are ordered and never coexist.
Loader-resident RAM after startup remains 0 B.

## PMG ownership

| Range | Owner after loader |
| --- | --- |
| `$3B00-$3BFF` | missiles: M0-M3 fighter pickup in fifth-player mode; M1-M3 capital broadside warning/impact after ACTIVE pickup removal |
| `$3C00-$3CFF` | P0 Player Fighter hull |
| `$3D00-$3DFF` | P1 monochrome body of Raider slot 0 |
| `$3E00-$3EFF` | P2 monochrome body of Raider slot 1 |
| `$3F00-$3FFF` | P3 Player Fighter engine |

Current fighter projectiles are ANTIC 4 PairShot overlays. Five Player Fighter
slots and five enemy slots share one movement/erase/render foundation. Each
logical record owns one screen cell whose fixed glyph depicts two pulses; the
enemy controller admits at most five shots across the formation. Broadside
owns a separate three-slot pool.

## Gameplay charset allocation

Glyphs 126-127 are the left/right halves of the connected BROADSIDE bolt.

| Glyphs | Owner |
| --- | --- |
| 0 | blank |
| 1-6 | far/near stars |
| 7-10 | Player Fighter body helpers |
| 11-46 | Player Fighter PairShot compatibility glyphs |
| 47-56 | Spread Shot overlap-composite scratch |
| 57-58 | gameplay helpers |
| 59-89 | capital hulls |
| 90-109 | hostile weapon visuals: `weapon_class` c at 89+c (left phase) and 99+c (right phase); 90/100 `PULSE`, 91/101 `LASER`, 92/102 reserved `BOMBER`; the rest are never published |
| 110-117 | debris |
| 118-119 | transient fragments |
| 120-121 | Light Wingman left/right cells (M1) |
| 122-125 | retained source glyph allocation; unused at runtime (PMG pickup has no character compositor) |
| 126-127 | connected BROADSIDE bolt (left/right halves; bit 7 selects the Hostile colour bank) |

Build-time range assertions, linker overlap checks, payload parity tests, and
cold-RAM tests are the enforcement mechanism for this snapshot.
