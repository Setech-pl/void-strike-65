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
| `$2000-$316B` | 4,460 B | resident `CODE` |
| `$316C-$3FED` | 3,714 B | resident `RODATA` |
| `$5400-$54C9` | 202 B | `PROJECTILES`: 19 fighter slots, burst controllers, and two shared fighter explosions |
| `$552A-$5DF5` | 2,252 B | relocated `STARFIELD` runtime; 2,278 B reserved through `$5E0F` |
| `$5E10-$7802` | 6,643 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime; reserved through `$780F` |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$8800-$8C7F` | 1,152 B | immutable three-type/eight-phase pickup glyph source bank |
| `$8C80-$8EBD` | 574 B | late phased pickup compositor, size helpers, exact reverse-erase support, and provisional active-gameplay admission policy |
| `$8EBE-$8EDE` | 33 B | shared inclusive final-raster swept-AABB capital-bolt/Player Fighter collision module |
| `$9000-$90FE` | 255 B | relocated A2 kernel; one byte reserved through `$90FF` |
| `$9100-$9D28` | 3,113 B | relocated `ENTITY_CODE`, including the pickup fence helper, H3.1 display lists, and frontend helpers; reserved through `$9D74` |
| `$9D75-$9FF9` | 645 B | Hybrid Encounter Director code/common/Level 1 data |
| `$9FFA-$9FFF` | 6 B | untouched Director guard |
| `$21C1-$2667` | 1,191 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The linked production runtime metric is `CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE + PICKUP_CODE = 17,287 B`. With the 1,152-byte pickup
phase bank, late-published GLUE, DIRECTOR, and their frozen integration
accounting plus the 33-byte collision module, simultaneous feature residency
is 18,917 B and safe residency is 3,270 B.
BROADSIDE is 6,643 B after moving the bolt renderer into retired GLUE space
and unrolling the fixed 3x3 capital-impact compositor; PICKUP_CODE is 574 B.
Late-published GLUE is 249 B; persistent BSS and glyph allocation
are unchanged.

## Boot transport layout

The production Encounter Director transport is 20,864 bytes in 163 occupied
sectors. BRCNT loads the 12,928-byte/101-sector initial block at `$2000-$527F`;
the entry point remains `$201E`. Initial content is exactly 12,898 B and ends
at `$5261`; the rest of the last sector is transport padding.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$2667` | 1,191 B | stage-2 SIO/CRC/per-record-end/manifest overlay |
| `$2668-$406C` | 6,661 B | packed resident suffix; staged at `$8100` |
| `$406D-$476D` | 1,793 B | packed 2,252-byte starfield/music runtime; stages at `$7810` and expands to `$552A-$5DF5` |
| `$476E-$486C` | 255 B | A2 source; staged at `$7F16`, then copied to `$9000-$90FE` before entity/effects clear |
| `$486D-$525D` | 2,545 B | packed 3,113-byte ENTITY_CODE; staged at `$535A-$5D4A`, expands to `$9100-$9D28` |
| `$525E-$5261` | 4 B | source-owned `DFB1` trailer; consumed before the GLUE chunk reuses `$5261` |
| ATR sectors 102-146 | 5,760 B | external BROADSIDE record: 5,660 B packed / 6,643 B raw to `$5E10-$7802` |
| ATR sectors 147-155 | 1,152 B | pickup/code/collision record: 1,022 B prepacked at cold `$8C80-$907D`; after preservation at `$4801-$4BFE`, it expands 1,759 B to `$8800-$8EDE` |
| ATR sectors 156-158 | 384 B | GLUE record: 244 B packed / 249 B raw to staging `$5261-$5359`, then held at `$8600-$86F8` |
| ATR sectors 159-163 | 640 B | Director record: 585 B packed / 645 B raw to `$9D75-$9FF9` |

The `DFMC` v1 manifest is 78 B for the current four records and reserves space
inside stage-2 for at most eight records. The ATR has 557 free sectors
(71,296 B). Runtime and transport budgets remain separate; the current
Director simultaneous-residency accounting reports 3,270 B safe. The older
15,346-byte capacity reference remains useful only as history; the production
gate is the exact 17,287-byte linked runtime
and its explicit simultaneous-residency accounting.

## Loader-time ownership

| Range | Size | Loader role |
| --- | ---: | --- |
| `$3315-$3337` | 35 B | packed 202-byte loader display-list source |
| `$3821-$3FA9` | 1,929 B | packed loader-bitmap source; `$3FAA-$3FED` preserves its fixed residency with zero padding |
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
| `$4800-$4BFF` | 1,024 B | frontend charset; `$4801-$4BFE` temporarily preserves the 1,022-byte pickup/code/collision transport stream before frontend construction |
| `$4C00-$4D1F` | 288 B | expanded Allied hull map, 32x9 |
| `$4D20-$4E3F` | 288 B | expanded Hostile hull map, 32x9 |
| `$4E40-$4E70` | 49 B | persistent runtime state through difficulty setting |
| `$4E71-$4ECA` | 90 B | hull scroll, three cached final-raster bolt tops at `$4E72-$4E74`, backing, sector, lifecycle, music, muzzle, score, and two-phase engine state |
| `$4ECB-$4ED6` | 12 B | Interceptor, damage, and starfield scalar state |
| `$4ED7-$4ED8` | 2 B | allied/enemy fixed-divider versus ring muzzle-domain state; consumes the former compatibility pad without shifting later state |
| `$4ED9-$4EE9` | 17 B | menu/gameplay music and tracked-muzzle state |
| `$4EEA-$4EFD` | 20 B | ten TOP SCORES records as parallel packed-BCD low/high arrays |
| `$4EFE-$4FF6` | 249 B | late-published integration glue, including physical shell-overlap detection, active-gameplay clock tick, and index-preserving release |
| `$4FF7` | 1 B | unassigned after loader |
| `$4FF8-$4FF9` | 2 B | 16-bit active-gameplay frame counter |
| `$4FFA-$4FFF` | 6 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$54CA-$5529` | 96 B | unassigned after far-star records moved below `$5000` |
| `$5DF6-$5E05` | 16 B | free tail of the starfield reservation |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$7803-$780F` | 13 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7F0F` | 832 B | unassigned after cold staging |
| `$7F10-$7F69` | 90 B | expanded A2 display list A |
| `$7F6A-$7FC3` | 90 B | expanded A2 display list B |
| `$7FC4-$7FFF` | 60 B | unassigned |

## BSS and high relocated runtime

| Range | Size | Current owner |
| --- | ---: | --- |
| `$8000-$805F` | 96 B | four physical interactive-entity slots plus global state; release active limit 2 |
| `$8060-$807F` | 32 B | initialized alignment/reserve |
| `$8080-$80F3` | 116 B | six physical effect slots plus global state; release active limit 5 |
| `$80F4-$80FF` | 12 B | persistent Encounter Director state, initialized after the entity/effects clear |
| `$8100-$9B06` | 6,663 B | cold-start resident-suffix staging only |
| `$8100-$8139` | 58 B | exact physical-screen pointers for 29 rendered far stars after cold startup |
| `$813A-$813F` | 6 B | unowned after cold startup |
| `$8140-$8577` | 1,080 B | 27-row physical gameplay ring, 40 bytes per row |
| `$8578-$8592` | 27 B | logical-to-physical row low-byte table |
| `$8593-$85AD` | 27 B | logical-to-physical row high-byte table |
| `$85AE-$85B6` | 9 B | A2 list/ring publication state |
| `$85B7-$85D2` | 28 B | allied per-visible-row boundary backing |
| `$85D3-$85EE` | 28 B | enemy per-visible-row boundary backing |
| `$85EF-$85FF` | 17 B | unowned after cold startup |
| `$8600-$86F8` | 249 B | boot-only GLUE holding buffer after resident staging is consumed; unowned after publication |
| `$86F9-$87FF` | 263 B | unowned after cold startup |
| `$8800-$8C7F` | 1,152 B | immutable pickup phase bank: three types × eight phases × six glyphs × eight bytes |
| `$8C80-$8EBD` | 574 B | pickup compositor, mapper, backing, common capital-shell collision dispatcher, exact reverse erase, and provisional admission policy; cold source is moved before publication |
| `$8EBE-$8EDE` | 33 B | inclusive 16x15-player versus final-raster swept-8x6-bolt AABB collision module |
| `$8EDF-$8FFF` | 289 B | unowned after cold startup |
| `$9000-$90FE` | 255 B | A2 kernel |
| `$90FF` | 1 B | free A2 reservation tail |
| `$9100-$9D28` | 3,113 B | entity/effect/booster/projectile-composite, pickup fence, and H3.1 frontend runtime |
| `$9D29-$9D74` | 76 B | free tail of the ENTITY_CODE reservation |
| `$9D75-$9FF9` | 645 B | Hybrid Encounter Director |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

## Boot-only ENTITY_CODE staging lifecycle

The packed ENTITY_CODE source is `$486D-$525D`; its last byte is consumed before
GLUE reuses `$5261-$5359`. ENTITY_CODE staging is `$535A-$5D4A` (2,545 B),
so the source-to-staging margin is 252 B. Its end-exclusive address `$5D4B` is
197 B below BROADSIDE at `$5E10`. The packed stream is copied only after the
initial block is resident, expanded to `$9100-$9D28`, and then released. The
later starfield destination `$552A-$5DF5` overlaps the released staging range
over `$552A-$5D4A` (2,081 B); it is never live concurrently with the packed
ENTITY_CODE source. Loader-resident RAM after startup remains 0 B.

## PMG ownership

| Range | Owner after loader |
| --- | --- |
| `$3B00-$3BFF` | missiles: M0 reserved for player weapon; M1-M3 broadside warning/impact |
| `$3C00-$3CFF` | P0 Player Fighter hull |
| `$3D00-$3DFF` | P1 Interceptor |
| `$3E00-$3EFF` | P2 Interceptor scanner |
| `$3F00-$3FFF` | P3 Player Fighter engine |

Current Player Fighter projectiles are ANTIC 4 overlays. The shared fighter allocation is
ten Player Fighter slots plus nine Interceptor slots; broadside owns a separate three-slot
pool.

## Gameplay charset allocation

Glyphs 126-127 are the left/right halves of the connected BROADSIDE bolt.

| Glyphs | Owner |
| --- | --- |
| 0 | blank |
| 1-6 | far/near stars |
| 7-10 | Player Fighter body helpers |
| 11-46 | Player Fighter projectile phases |
| 47-56 | Spread Shot overlap-composite scratch |
| 57-58 | gameplay helpers |
| 59-89 | capital hulls |
| 90-109 | Interceptor and Interceptor-projectile phases |
| 110-117 | debris |
| 118-119 | transient fragments |
| 120-125 | dynamic six-glyph compositor bank for the selected Rapid, Spread, or Shield vertical phase |
| 126-127 | connected BROADSIDE bolt (left/right halves; bit 7 selects the Hostile colour bank) |

Build-time range assertions, linker overlap checks, payload parity tests, and
cold-RAM tests are the enforcement mechanism for this snapshot.
