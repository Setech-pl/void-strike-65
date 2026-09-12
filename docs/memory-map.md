# Current memory map

This is one current snapshot. Addresses and linked sizes come from
`build/void-strike-65.map`; packed sizes, staging ranges, artifacts, and reserves
come from `build/manifest.json`. Overlapping ranges below have different
lifetime phases and are not additive free memory.

## Linked segments

| Range | Size | Current owner |
| --- | ---: | --- |
| `$0080-$009F` | 32 B | zero-page runtime variables |
| `$0100-$01FF` | 256 B | 6502 stack |
| `$0200-$03FF` | 512 B | OS workspace and vectors |
| `$2000-$3157` | 4,440 B | resident `CODE` |
| `$3158-$3FD9` | 3,714 B | resident `RODATA` |
| `$5400-$5489` | 138 B | `PROJECTILES`: ten one-cell PairShot slots (five player + five enemy), burst controllers, two shared fighter explosions, and two independent Raider records |
| `$548A-$54E3` | 90 B | free tail left by the PairShot pool reduction |
| `$54E4-$5CFB` | 2,072 B | relocated `STARFIELD` runtime with immutable row-baked far-star pattern; 2,348 B reserved through `$5E0F` |
| `$5E10-$7806` | 6,647 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime plus debris-release wrapper; reserved through `$780F` |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$8800-$8B66` | 871 B | fighter PMG pickup, projectile publication scaffold, narrow effect/PairShot backing resolver in the retired 187-B proof footprint, and provisional active-gameplay admission policy |
| `$8B67-$8B87` | 33 B | shared inclusive final-raster swept-AABB capital-bolt/Player Fighter collision module |
| `$9000-$9079` | 122 B | relocated A2 kernel; 134 bytes reserved through `$90FF` are free |
| `$9100-$9D4D` | 3,150 B | relocated `ENTITY_CODE`, including PMG pickup lifecycle, H3.1 display lists, and frontend helpers; reserved through `$9D74` |
| `$9D75-$9FF8` | 644 B | Hybrid Encounter Director code/common/Level 1 data; one byte remains free before the guard |
| `$9FFA-$9FFF` | 6 B | untouched Director guard |
| `$21C1-$26A9` | 1,257 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The current linked metric is `CODE + STARFIELD + BROADSIDE + A2_KERNEL +
ENTITY_CODE + PICKUP_CODE = 17,302 B`. The obsolete 1,152-byte
character-pickup phase bank is source-only and is not resident. With
late-published GLUE, DIRECTOR, their frozen integration accounting, and the
33-byte collision module, simultaneous feature residency is 17,780 B and safe
residency is 4,407 B. BROADSIDE is 6,647 B and PICKUP_CODE is 871 B.
Late-published GLUE is 250 B. The PairShot pool uses 90 fewer persistent BSS
bytes; its fixed glyphs reuse the existing charset allocation.

## Boot transport layout

The prototype transport is 20,608 bytes in 161 occupied sectors. BRCNT loads the
12,928-byte/101-sector initial block at `$2000-$527F`; the entry point remains
`$201E`. Initial content is exactly 12,912 B and ends at `$526F`; the remaining
16 bytes are transport padding.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$26A9` | 1,257 B | stage-2 SIO/CRC/per-record-end/manifest overlay |
| `$26AA-$40D9` | 6,704 B | packed resident suffix; staged at `$8100` |
| `$40DA-$476A` | 1,681 B | packed 2,072-byte starfield/music runtime; deferred staging at `$7810-$7EA0`, then expansion to `$54E4-$5CFB`; 150 B remain before pickup preservation at `$4801` |
| `$476B-$47E4` | 122 B | A2 source; staged at `$7F2B-$7FA4`, then copied to `$9000-$9079` before entity/effects clear |
| `$47E5-$526B` | 2,695 B | packed 3,150-byte ENTITY_CODE; copied backward to staging at `$5318-$5D9E`, then expanded to `$9100-$9D4D` |
| `$526C-$526F` | 4 B | source-owned `DFB1` trailer |
| ATR sectors 102-146 | 5,760 B | external BROADSIDE record: 5,620 B packed / 6,647 B raw to `$5E10-$7806` |
| ATR sectors 147-153 | 896 B | unchanged pickup record type: 754-B packed stream; after preservation it publishes 904 B to `$8800-$8B87` including the collision tail |
| ATR sectors 154-156 | 384 B | GLUE record: 245 B packed / 250 B raw to cold staging `$7BD0-$7CC9`, then held at `$8600-$86F9` before deferred starfield staging |
| ATR sectors 157-161 | 640 B | Director record: 587 B packed / 644 B raw to `$9D75-$9FF8` |

The `DFMC` v1 manifest is 78 B for the current four records and reserves space
inside stage-2 for at most eight records. The ATR has 559 free sectors
(71,552 B). Runtime and transport budgets remain separate; the current
Director simultaneous-residency accounting reports 4,407 B safe. The older
15,346-byte capacity reference remains useful only as history; the production
gate for this prototype is the exact 17,302-byte linked runtime
and its explicit simultaneous-residency accounting.

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
| `$4ECB-$4ED6` | 12 B | Interceptor, damage, star RNG, one row-baked far-pattern phase byte, and three compatibility scalar bytes |
| `$4ED7-$4ED8` | 2 B | allied/enemy fixed-divider versus ring muzzle-domain state; consumes the former compatibility pad without shifting later state |
| `$4ED9-$4EE9` | 17 B | menu/gameplay music and tracked-muzzle state |
| `$4EEA-$4EFD` | 20 B | ten TOP SCORES records as parallel packed-BCD low/high arrays |
| `$4EFE-$4FF7` | 250 B | late-published integration glue, including physical shell-overlap detection, active-gameplay clock tick, and capital-local debris retry |
| `$4FF8-$4FF9` | 2 B | 16-bit active-gameplay frame counter |
| `$4FFA-$4FFF` | 6 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$5464-$5469` | 6 B | player/enemy PairShot burst controllers |
| `$546A-$546F` | 6 B | two shared fighter-explosion records |
| `$5470-$5471` | 2 B | Raider live-state array |
| `$5472-$5477` | 6 B | Raider HP and pending damage/source arrays |
| `$5478-$547F` | 8 B | independent X, Y, signed velocity, and fractional movement accumulators |
| `$5480-$5485` | 6 B | independent manoeuvre state, timer, and behaviour phase |
| `$5486-$5489` | 4 B | selected slot/Y scratch, weapon cursor, and live count |
| `$5CF7-$5E05` | 271 B | free tail of the starfield reservation before BOOST backing |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$780D-$780F` | 3 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7CC9` | 250 B | GLUE staging until its byte-exact copy to `$8600-$86F9`; overwritten only by the later packed-starfield staging write |
| `$7CCA-$7F0F` | 582 B | unassigned after cold staging |
| `$7F10-$7F69` | 90 B | expanded A2 display list A |
| `$7F6A-$7FC3` | 90 B | expanded A2 display list B |
| `$7FC4-$7FFF` | 60 B | unassigned |

During cold startup only, the packed starfield occupies `$7810-$7E9B` and the
122-byte A2 image occupies `$7F2B-$7FA4`. The A2 image is copied to `$9000`
before the entity-state clear and before the post-loader display lists are
built, so these overlaps are lifetime-safe.

## BSS and high relocated runtime

| Range | Size | Current owner |
| --- | ---: | --- |
| `$8000-$805F` | 96 B | four physical interactive-entity slots plus global state; release active limit 2 |
| `$8060-$806A` | 11 B | projectile publication/ownership fit-proof state and lower-cell scratch |
| `$806B-$807F` | 21 B | initialized alignment reserve |
| `$8080-$80F3` | 116 B | six physical effect slots plus global state; release active limit 5 |
| `$80F4-$80FF` | 12 B | persistent Encounter Director state, initialized after the entity/effects clear |
| `$8100-$9B0B` | 6,668 B | cold-start resident-suffix staging only |
| `$8100-$813F` | 64 B | unowned after cold startup; the former 58-byte far-star physical-address cache is gone |
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
| `$8600-$86F9` | 250 B | boot-only GLUE holding buffer after resident staging is consumed; unowned after publication; its first 102 bytes formerly doubled as the rest of the logical far-record pool |
| `$86FA-$87FF` | 262 B | unowned after cold startup |
| `$8800-$8B66` | 871 B | PMG pickup, single-window publication scaffold, narrow effect/PairShot backing resolver in the retired primitive footprint, and admission helpers |
| `$8B67-$8B87` | 33 B | inclusive 16x15-player versus final-raster swept-8x6-bolt AABB collision module |
| `$8B88-$8FFF` | 1,144 B | unowned after cold startup; old 1,152-byte character phase bank is not transported or resident |
| `$9000-$9079` | 122 B | A2 kernel |
| `$907A-$90FF` | 134 B | free A2 reservation tail after removing dynamic far-star render code |
| `$9100-$9D4D` | 3,150 B | entity/effect/booster/projectile and H3.1 frontend runtime |
| `$9D4E-$9D74` | 39 B | free tail of the ENTITY_CODE reservation |
| `$9D75-$9FF8` | 644 B | Hybrid Encounter Director |
| `$9FF9` | 1 B | free Director reservation tail |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

## Boot-only ENTITY_CODE staging lifecycle

The packed ENTITY_CODE source is `$47E5-$526B`. Its backward copy to
`$5318-$5D9E` is 2,695 B and begins 172 B after the source. The staging end is
113 B below BROADSIDE at `$5E10`. After expansion to `$9100-$9D4D`, the staging
range is released. The later starfield destination `$54E4-$5CFB` overlaps that
released range over 2,072 B; both lifetimes are ordered and never coexist.
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
| 90-109 | enemy PairShot compatibility glyphs |
| 110-117 | debris |
| 118-119 | transient fragments |
| 120-125 | retained source glyph allocation; no dynamic character-pickup compositor in the PMG fit candidate |
| 126-127 | connected BROADSIDE bolt (left/right halves; bit 7 selects the Hostile colour bank) |

Build-time range assertions, linker overlap checks, payload parity tests, and
cold-RAM tests are the enforcement mechanism for this snapshot.
