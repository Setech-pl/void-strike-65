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
| `$2000-$3137` | 4,408 B | resident `CODE` |
| `$3138-$3FB9` | 3,714 B | resident `RODATA` |
| `$5400-$54E3` | 228 B | `PROJECTILES`: 19 fighter slots, burst controllers, two shared fighter explosions, and two independent Raider records |
| `$552A-$5D9C` | 2,163 B | relocated `STARFIELD` runtime; 2,278 B reserved through `$5E0F` |
| `$5E10-$780C` | 6,653 B | relocated `BROADSIDE`/frontend/enemy/weapon runtime plus debris-release wrapper; reserved through `$780F` |
| `$8000-$80FF` | 256 B | `ENTITY_STATE` BSS |
| `$8800-$8C7F` | 1,152 B | immutable three-type/eight-phase pickup glyph source bank |
| `$8C80-$8FCD` | 846 B | late phased pickup compositor, Raider weapon selection, size helpers, exact reverse-erase support, and provisional active-gameplay admission policy |
| `$8FCE-$8FEE` | 33 B | shared inclusive final-raster swept-AABB capital-bolt/Player Fighter collision module |
| `$9000-$90FD` | 254 B | relocated A2 kernel; two bytes reserved through `$90FF` |
| `$9100-$9D6D` | 3,182 B | relocated `ENTITY_CODE`, including the pickup fence helper, H3.1 display lists, and frontend helpers; reserved through `$9D74` |
| `$9D75-$9FF8` | 644 B | Hybrid Encounter Director code/common/Level 1 data; one byte remains free before the guard |
| `$9FFA-$9FFF` | 6 B | untouched Director guard |
| `$21C1-$26A9` | 1,257 B | boot-only `BOOT_STAGE2` overlay; replaced by the resident suffix before runtime |

The linked production runtime metric is `CODE + STARFIELD + BROADSIDE +
A2_KERNEL + ENTITY_CODE + PICKUP_CODE = 17,506 B`. With the 1,152-byte pickup
phase bank, late-published GLUE, DIRECTOR, and their frozen integration
accounting plus the 33-byte collision module, simultaneous feature residency
is 19,136 B and safe residency is 3,051 B.
BROADSIDE is 6,653 B after moving the debris-release wrapper into its existing
reserved tail
and unrolling the fixed 3x3 capital-impact compositor; PICKUP_CODE is 846 B.
Late-published GLUE is 250 B; persistent BSS and glyph allocation
are unchanged.

## Boot transport layout

The prototype transport is 21,248 bytes in 166 occupied sectors. BRCNT loads
the 13,184-byte/103-sector initial block at `$2000-$537F`; the entry point
remains `$201E`. Initial content is exactly 13,150 B and ends exclusively at
`$535E`; the rest of the last sector is transport padding.

| Initial address / ATR sectors | Size | Stored form and startup destination |
| --- | ---: | --- |
| `$2000-$21C0` | 449 B | raw bootstrap prefix |
| `$21C1-$26A9` | 1,257 B | stage-2 SIO/CRC/per-record-end/manifest overlay |
| `$26AA-$40B4` | 6,667 B | packed resident suffix; staged at `$8100` |
| `$40B5-$4768` | 1,716 B | packed 2,163-byte starfield/music runtime; deferred staging at `$7810-$7F2A`, then expansion to `$552A-$5D9C`; 152 B remain before pickup preservation at `$4801` |
| `$4769-$4866` | 254 B | A2 source; staged at `$7F2B-$8028`, then copied to `$9000-$90FD` before entity/effects clear |
| `$4867-$5359` | 2,803 B | packed 3,182-byte ENTITY_CODE; copied backward to staging at `$5318-$5E0A`, then expanded to `$9100-$9D6D` |
| `$535A-$535D` | 4 B | source-owned `DFB1` trailer |
| ATR sectors 104-148 | 5,760 B | external BROADSIDE record: 5,659 B packed / 6,653 B raw to `$5E10-$780C` |
| ATR sectors 149-158 | 1,280 B | pickup/code/collision record: 1,168 B at cold `$8C80-$910F`; after preservation at `$4801-$4C90`, it publishes 2,031 B to `$8800-$8FEE` |
| ATR sectors 159-161 | 384 B | GLUE record: 245 B packed / 250 B raw to cold staging `$7BD0-$7CC9`, then held at `$8600-$86F9` before deferred starfield staging |
| ATR sectors 162-166 | 640 B | Director record: 587 B packed / 644 B raw to `$9D75-$9FF8` |

The `DFMC` v1 manifest is 78 B for the current four records and reserves space
inside stage-2 for at most eight records. The ATR has 554 free sectors
(70,912 B). Runtime and transport budgets remain separate; the current
Director simultaneous-residency accounting reports 3,051 B safe. The older
15,346-byte capacity reference remains useful only as history; the production
gate is the exact 17,506-byte linked runtime
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
| `$4800-$4BFF` | 1,024 B | frontend charset; before frontend construction, `$4801-$4C90` temporarily preserves the 1,168-byte pickup/code/collision stream and overlaps the not-yet-published hull maps |
| `$4C00-$4D1F` | 288 B | expanded Allied hull map, 32x9 |
| `$4D20-$4E3F` | 288 B | expanded Hostile hull map, 32x9 |
| `$4E40-$4E70` | 49 B | persistent runtime state through difficulty setting |
| `$4E71-$4ECA` | 90 B | hull scroll, three cached final-raster bolt tops at `$4E72-$4E74`, backing, sector, lifecycle, music, muzzle, score, and two-phase engine state |
| `$4ECB-$4ED6` | 12 B | Interceptor, damage, and starfield scalar state |
| `$4ED7-$4ED8` | 2 B | allied/enemy fixed-divider versus ring muzzle-domain state; consumes the former compatibility pad without shifting later state |
| `$4ED9-$4EE9` | 17 B | menu/gameplay music and tracked-muzzle state |
| `$4EEA-$4EFD` | 20 B | ten TOP SCORES records as parallel packed-BCD low/high arrays |
| `$4EFE-$4FF7` | 250 B | late-published integration glue, including physical shell-overlap detection, active-gameplay clock tick, and capital-local debris retry |
| `$4FF8-$4FF9` | 2 B | 16-bit active-gameplay frame counter |
| `$4FFA-$4FFF` | 6 B | unassigned after loader |
| `$5000-$53FF` | 1,024 B | dedicated gameplay HUD charset |
| `$54CA-$54CB` | 2 B | Raider live-state array |
| `$54CC-$54CD` | 2 B | retained inert Raider HP array |
| `$54CE-$54D1` | 4 B | retained inert pending-damage/source arrays |
| `$54D2-$54D9` | 8 B | independent X, Y, signed velocity, and fractional movement accumulators |
| `$54DA-$54DF` | 6 B | independent manoeuvre state, timer, and behaviour phase |
| `$54E0-$54E3` | 4 B | selected slot/Y scratch, cursor, and live count |
| `$54E4-$5529` | 70 B | free tail of the projectile-state reservation |
| `$5D9D-$5E0F` | 115 B | free tail of the starfield reservation |
| `$5E06-$5E0F` | 10 B | exact prior-content backing for HUD cells `$401E-$4027` while BOOST is active |
| `$780D-$780F` | 3 B | free tail of the broadside reservation |
| `$7810-$7BCF` | 960 B | pause-screen backup after cold staging is consumed |
| `$7BD0-$7CC9` | 250 B | GLUE staging until its byte-exact copy to `$8600-$86F9`; overwritten only by the later packed-starfield staging write |
| `$7CCA-$7F0F` | 582 B | unassigned after cold staging |
| `$7F10-$7F69` | 90 B | expanded A2 display list A |
| `$7F6A-$7FC3` | 90 B | expanded A2 display list B |
| `$7FC4-$7FFF` | 60 B | unassigned |

During cold startup only, the packed starfield occupies `$7810-$7F2A` and the
254-byte A2 image occupies `$7F2B-$8028`. The A2 image is copied to `$9000`
before the entity-state clear and before the post-loader display lists are
built, so these overlaps are lifetime-safe.

## BSS and high relocated runtime

| Range | Size | Current owner |
| --- | ---: | --- |
| `$8000-$805F` | 96 B | four physical interactive-entity slots plus global state; release active limit 2 |
| `$8060-$807F` | 32 B | initialized alignment/reserve |
| `$8080-$80F3` | 116 B | six physical effect slots plus global state; release active limit 5 |
| `$80F4-$80FF` | 12 B | persistent Encounter Director state, initialized after the entity/effects clear |
| `$8100-$9B0A` | 6,667 B | cold-start resident-suffix staging only |
| `$8100-$8139` | 58 B | exact physical-screen pointers for 29 rendered far stars after cold startup |
| `$813A-$813F` | 6 B | unowned after cold startup |
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
| `$85EF-$85FF` | 17 B | unowned after cold startup |
| `$8600-$86F9` | 250 B | boot-only GLUE holding buffer after resident staging is consumed; unowned after publication |
| `$86FA-$87FF` | 262 B | unowned after cold startup |
| `$8800-$8C7F` | 1,152 B | immutable pickup phase bank: three types × eight phases × six glyphs × eight bytes |
| `$8C80-$8FCD` | 846 B | pickup compositor, Raider weapon selector, mapper, backing, common capital-shell collision dispatcher, exact reverse erase, and provisional admission policy; cold source is moved before publication |
| `$8FCE-$8FEE` | 33 B | inclusive 16x15-player versus final-raster swept-8x6-bolt AABB collision module |
| `$8FEF-$8FFF` | 17 B | unowned after cold startup |
| `$9000-$90FD` | 254 B | A2 kernel |
| `$90FE-$90FF` | 2 B | free A2 reservation tail |
| `$9100-$9D6D` | 3,182 B | entity/effect/booster/projectile-composite, pickup fence, and H3.1 frontend runtime |
| `$9D6E-$9D74` | 7 B | free tail of the ENTITY_CODE reservation |
| `$9D75-$9FF8` | 644 B | Hybrid Encounter Director |
| `$9FF9` | 1 B | free Director reservation tail |
| `$9FFA-$9FFF` | 6 B | untouched guard; not available capacity |
| `$A000-$BFFF` | 8,192 B | deliberately unused BASIC-ROM window |
| `$C000-$FFFF` | 16,384 B | OS ROM and I/O; not gameplay RAM |

Cold startup initializes every byte of `$8000-$80FF`. No current code, state,
charset, loader data, or staging buffer uses `$A000-$BFFF`.

## Boot-only ENTITY_CODE staging lifecycle

The packed ENTITY_CODE source is `$4867-$5359`. Its backward copy to
`$5318-$5E0A` (2,803 B) deliberately overlaps the already-read source by 66 B;
the copy direction is part of the checked loader contract. The staging end is
5 B below BROADSIDE at `$5E10`. After expansion to `$9100-$9D6D`, the staging
range is released. The later starfield destination `$552A-$5D9C` overlaps that
released range over 2,163 B; both lifetimes are ordered and never coexist.
Loader-resident RAM after startup remains 0 B.

## PMG ownership

| Range | Owner after loader |
| --- | --- |
| `$3B00-$3BFF` | missiles: M0 reserved for player weapon; M1-M3 broadside warning/impact |
| `$3C00-$3CFF` | P0 Player Fighter hull |
| `$3D00-$3DFF` | P1 monochrome body of Raider slot 0 |
| `$3E00-$3EFF` | P2 monochrome body of Raider slot 1 |
| `$3F00-$3FFF` | P3 Player Fighter engine |

Current Player Fighter projectiles are ANTIC 4 overlays. The shared fighter
allocation remains ten Player Fighter slots plus nine dormant Raider slots;
the movement prototype admits no Raider shots. Broadside owns a separate
three-slot pool.

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
