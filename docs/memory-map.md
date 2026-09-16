# Current memory map

Accepted runtime checkpoint: `b4b942e` on `experiment/hybrid-c-director`
(XEX `96546807…`, owner smoke PASS 2026-09-16). The linked-segment and BSS
tables below are still the earlier `41ace65` snapshot (Light Wingman M1 + solid
PMG pickup, XEX `900152fe…`); the accepted placement changes since then are
listed in *Accepted placement since `41ace65`* and override those rows.
Sections marked *earlier `2df89da`* were not regenerated.

This is one snapshot. Addresses and linked sizes come from
`build/void-strike-65.map`; packed sizes, staging ranges, artifacts, and reserves
come from `build/manifest.json`. Overlapping ranges below have different
lifetime phases and are not additive free memory.

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
| `$8100-$810B` | 12 B | C-owned Light Wingman record (`$8100-$8105`) plus ASM Light render cache/scratch (`$8106-$810B`); `$810C` free |
| `$8110-$8118` | 9 B | C-owned derived Raider profile cache read by the ASM kernel (moved from `$8776`) |
| `$8776-$8857` | 226 B | `LIGHT_RESIDENT` Light Wingman kernel (update, PairShot hit, kill, glyph) heading the pickup/collision stream |
| `$8858-$8B60` | 777 B | fighter PMG pickup, projectile publication scaffold, narrow effect/PairShot backing resolver, and provisional active-gameplay admission policy (retired inert padding reclaimed) |
| `$8B61-$8B66` | 6 B | zero fill of the pickup/collision stream image |
| `$8B67-$8B87` | 33 B | shared inclusive final-raster swept-AABB capital-bolt/Player Fighter collision module |
| `$8B88-$8C79` | 242 B | low cc65 Director code |
| `$8C7A-$8C7C` | 3 B | free gap |
| `$8C7D-$8C94` | 24 B | C `EnemyArchetype` table (Raider + Light Wingman records) |
| `$8C95-$8F69` | 725 B | C sector, high-level enemy lifecycle and Light Wingman code |
| `$8F6A-$8FEE` | 133 B | `LIGHT_CODE` Light late-publication (erase + render) kernel, main-linked, carried at the tail of the extension stream |
| `$8FEF-$8FFF` | 17 B | free extension tail |
| `$9000-$90EC` | 237 B | relocated A2 kernel; 19 bytes reserved through `$90FF` are free |
| `$9100-$9D51` | 3,154 B | relocated `ENTITY_CODE`, including PMG pickup lifecycle, H3.1 display lists, and frontend helpers; `$9D52-$9D5D` (12 B) free |
| `$9D5E-$9D72` | 21 B | cc65 Director `5*x+1` RNG routine |
| `$9D73-$9D74` | 2 B | free tail before Director tables |
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
| `$85FE-$8601` | 4 B | `STAR_NEAR_SCREEN_HI` (live near-star state; the old "`$8600` window" never included these two bytes) |
| `$8602-$86F9` | 248 B | `HYBRID_C_SECTOR_RAM`: the five `sector_c_*` functions, 240 B at `$8602-$86F1`; 8 B free |
| `$8300-$83F9` | 250 B | boot-only GLUE hold (idle gameplay-ring RAM) until `layout_d_publish_glue`; `init_screen` rebuilds the ring before gameplay |
| `$8C7D-$8E79` | 509 B | C `EnemyArchetype` RODATA 24 B + lifecycle/Light C 485 B |
| `$8776-$8857` | 226 B | `LIGHT_RESIDENT` (unchanged) heading the pickup/collision stream |
| `$8858-$8B58` | 769 B | `PICKUP_CODE`; `$8B59-$8B66` 14 B zero fill of the stream image before the fixed `$8B67` collision module |
| `$8E7A-$8F44` | 203 B | `LIGHT_CODE` (moved with the shorter C composite): Light late publication 133 B plus the debris late-publication kernel 70 B (`entity_debris_publish`, capital hook `render_launch_flashes_with_capital_debris`, `restore_recycled_row_near_and_debris`) |
| `$8F45-$8FFF` | 187 B | free contiguous `HYBRID_C_EXT` tail; cc65 code or main-linked ASM appended after `LIGHT_CODE` (257 B before the debris kernel) |
| `$9100-$9D30` | 3,121 B | ENTITY_CODE (C1 −39 B, second-stream expansion +13 B, debris late publication −4 B); `$9D31-$9D5D` 45 B free |

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
| `$9D51-$9D5D` | 13 B | free ENTITY_CODE reservation tail — scarce (45 B before 4.4b) |

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
| `$5CF7-$5E05` | 271 B | free tail of the starfield reservation before BOOST backing |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$780D-$780F` | 3 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7CC9` | 250 B | GLUE staging until its byte-exact copy to `$8600-$86F9`; overwritten only by the later packed-starfield staging write |
| `$7810-$79B6` | 423 B | `2df89da`: cold packed lifecycle source until expansion to `$8C7D-$8E84` (520 B raw); later reclaimed by starfield staging. 4.4 candidate: 785 B `$7810-$7B20` expanding to `$8C7D-$8FE8` |
| `$7CCA-$7D3D` | 116 B | cold packed ABI source until publication to `$8701-$8775` |
| `$7D3E-$7D3F` | 2 B | cold staging guard |
| `$7D40-$7E11` | 210 B | cold packed low-C source until publication to `$8B88-$8C79` |
| `$7E12-$7F0F` | 254 B | unassigned after cold staging |
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
| `$8100-$9B13` | 6,676 B | cold-start resident-suffix staging only |
| `$8100-$810B` | 12 B | Light M1: C Light record `$8100-$8105`, ASM render cache/scratch `$8106-$810B` |
| `$810C-$810F` | 4 B | unowned after cold startup |
| `$8110-$8118` | 9 B | C-owned derived archetype profile cache; ASM read-only (moved from `$8776`) |
| `$8119-$813F` | 39 B | unowned after cold startup |
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
| `$85EF-$85FF` | 17 B | unowned after cold startup; `$85F2-$85FF` was the head of the retired logical far-record pool |
| `$8600-$86F9` | 250 B | `$8600-$8601` near-star state; `$8602-$86F9` `HYBRID_C_SECTOR_RAM` (step 4.3, accepted `b4b942e`); the boot-only GLUE hold is at `$8300-$83F9` |
| `$86FA-$8700` | 7 B | hybrid C Director/lifecycle mailbox and scratch; software stack 0 B, new ZP 0 B |
| `$8701-$8775` | 117 B | hybrid C/ASM Director/lifecycle ABI veneer and startup publishers |
| `$8776-$8857` | 226 B | Light M1 `LIGHT_RESIDENT` kernel heading the pickup/collision stream |
| `$8858-$8B60` | 777 B | PMG pickup, single-window publication scaffold, narrow effect/PairShot backing resolver, and admission helpers |
| `$8B61-$8B66` | 6 B | zero fill of the pickup/collision stream |
| `$8B67-$8B87` | 33 B | inclusive 16x15-player versus final-raster swept-8x6-bolt AABB collision module |
| `$8B88-$8C79` | 242 B | low cc65 Director code |
| `$8C7A-$8C7C` | 3 B | free tail of `DIRECTOR_C_LOW_RAM` (see the overlap note below) |
| `$8C7D-$8C94` | 24 B | C `EnemyArchetype` RODATA: Raider + Light records |
| `$8C95-$8F69` | 725 B | C sector/high-level enemy lifecycle and Light code |
| `$8F6A-$8FEE` | 133 B | Light M1 `LIGHT_CODE` late-publication kernel (extension tail) |
| `$8FEF-$8FFF` | 17 B | free extension tail |
| `$9000-$90EC` | 237 B | A2 kernel |
| `$90ED-$90FF` | 19 B | free A2 reservation tail |
| `$9100-$9D51` | 3,154 B | entity/effect/booster/projectile and H3.1 frontend runtime |
| `$9D52-$9D5D` | 12 B | free ENTITY_CODE reservation tail |
| `$9D5E-$9D72` | 21 B | cc65 Director RNG code |
| `$9D73-$9D74` | 2 B | free ENTITY_CODE reservation tail |
| `$9D75-$9FF7` | 643 B | C Director RODATA plus high CODE |
| `$9FF8-$9FF9` | 2 B | free Director reservation tail |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

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
