# L1 window levers — Phase A placement plan

**Status:** planning only, for owner review. Baseline is main `a3c8e47` on
2026-10-24. No runtime source, asset, script, test, linker configuration or
gameplay byte was changed. `npm run build` passed its computed gates and printed
the expected stale runtime-evidence warning; this is not release evidence.
`build/manifest.json`, `build/*.map`, `build/*.lbl`, `build/*.lst` and
`node scripts/measure-resident-data.mjs` below are from that build. **MEASURED**
means a linked baseline or a calculation on its exact bytes. **ESTIMATE** means
a proposed placement, relink, timing projection or cycle forecast. The owner
decision is [§BU.1](../owner-decisions-2026-09-11.md#bu1-lever-plan); the audit
is [A4–A6](../audits/2026-10-23-memory-cycles.md#a4-reclaim-candidates-with-costs-and-restrictions).

## Decision requested

L1 is feasible on the current inventory, subject to a linked Phase B proof.
The recommended first implementation variant is the **11-sector raw menu run**:
it uses the existing checked direct-SIO run shape and avoids making the menu
dependent on a new unpack path. The **8-sector packed run** is a measured-byte
alternative worth keeping if the owner values its roughly 0.2-second shorter
read. Both add a read on **every menu entry**, including cold boot and returns.
There is no demonstrated 1,314-byte menu-only permanent store outside the boss
claim; a boot-once, no-reload variant is not a valid L1 choice. The owner must
choose the visible latency before Phase B; this plan does not silently change
the 596-frame menu policy.

## 1. Baseline and measured inventory

The normal build reports **MEASURED** 13,569 initial content bytes in 107
sectors, 109 extension sectors and 216 occupied sectors (`build/manifest.json`
`transportCapacity`; `npm run build`). The project planning line is 13,652
initial bytes, hence **MEASURED** 83 bytes of planning slack
([STATUS](../STATUS.md), current resource paragraph). The Light record is DFMC
**record 9**, 1,155 raw / 1,019 packed bytes / 9 sectors, currently starting at
sector 191 and landing at `$B478` (`build/manifest.json`
`transportCapacity.manifest.records`, `lightKernel`). The DFMC manifest has
**MEASURED** 11 of 11 records (`scripts/chunk-loader.mjs:8-18`, manifest).

### A. Every byte of the proposed MAIN landing

All addresses and lengths in this table are **MEASURED** from
`build/void-strike-65.lbl`, `build/void-strike-65.map` and
`src/main.s:7807-7929,8029-8042`; the boot-only extent agrees with
`build/manifest.json` `loaderScreen.packedBitmapBytes` and
`src/main.s:1290-1325`. The phase column is source-supported. The 731-byte
bitmap overlap is *not* available before `unpack_loader_bitmap` returns.

| Range | Bytes | Baseline content | Reader / lifetime | L1 treatment |
| --- | ---: | --- | --- | --- |
| `$3615-$3761` | 333 | six frontend screen streams, marker positions | menu, options, scores, exit, GAME OVER, ending; `render_frontend_records`, `src/main.s:7807-7882` | menu run |
| `$3762-$3780` | 31 | `publish_level_hull_style` | every level start, including fighter/capital; `src/main.s:7890-7912` | keep resident; proposed `$3615-$3633` |
| `$3781-$3801` | 129 | `hull_level_publish_slack`, `.res` pin | no reader; pins later MAIN addresses, `src/main.s:7913-7916` | release only with address regeneration |
| `$3802-$380D` | 12 | four 3-byte missile mask/size tables | gameplay PMG publication, `src/main.s:7920-7927` | keep resident; proposed `$3634-$363F` |
| `$380E-$3821` | 20 | `top_score_row_template` | frontend score rows, `src/main.s:8029-8037` | menu run |
| `$3822-$3824` | 3 | `debris_contact_damage_by_difficulty` | fighter/capital/boss contact, `src/main.s:8039-8042` | keep resident; proposed `$3640-$3642` |
| `$3825-$3AFF` | 731 | lower part of `loader_bitmap_lzss` | boot-only packed source; `unpack_loader_bitmap`, `src/main.s:1320,1516` | free **after** unpack only |
| **Total** | **1,259** | **46 live + 353 frontend + 129 pin + 731 boot source** | | **MEASURED** |

The retained **46** is exactly 31 + 12 + 3, not 46 bytes of removable menu
data. `$3B00-$3FFF` is PMG RAM and is excluded
([memory map](../memory-map.md), `$3800-$3FFF` PMG row). The proposed tightly
packed order is **ESTIMATE** pending a real link: 46 resident bytes at
`$3615-$3642`, Light at `$3643-$3AC5` (1,155 bytes), leaving
`$3AC6-$3AFF` **58 bytes**. The Phase B acceptance floor is **16 linked bytes**.
The publisher's 31-byte move changes a level-start address; the 12-byte mask
and 3-byte damage-table moves change gameplay absolute operands and must not be
treated as menu-only.

### B. Complete current Light composite

These five segments are one contiguous **MEASURED** DFMC record 9, from
`build/light-kernel.map`, `build/light-kernel.lbl`,
`build/light-kernel.lst` and `build/manifest.json` `lightKernel`:

| Segment | Current range | Bytes | Function / source |
| --- | --- | ---: | --- |
| `LIGHT_KERNEL` | `$B478-$B790` | 793 | five Light vectors, twelve capital vectors, publish/update/shot/backing/cell resolver; `src/hybrid/light-kernel.s:103-685` |
| `DISK_GUARD` | `$B791-$B7EF` | 95 | run fold/check, expected block values and identity; `src/hybrid/disk-guard.s` |
| `CAPITAL_VECTOR_IMAGE` | `$B7F0-$B813` | 36 | pristine copy of the patchable capital vector table; `src/hybrid/light-kernel.s:688-701` |
| `HUD_BOOSTER_BACKUP` | `$B814-$B829` | 22 | boss-entry backup / region-read tail; `src/hybrid/light-kernel.s`, `build/light-kernel.map` |
| `LIFE_CAPSULE` | `$B82A-$B8FA` | 209 | live LIFE veneers, four PMG shapes and state; `src/hybrid/life-capsule.s:1-112` |
| **Total** | `$B478-$B8FA` | **1,155** | **record 9, not the old 902-byte kernel** |

**Absolute-address consumers to rebind in Phase B:** the five generated
`LIGHT_KERNEL_*` values (`scripts/build.mjs:1086-1091,1848-1854`, consumed by
`src/main.s:13131-13136`); the 12 `CAPITAL_VECTOR_*` values and
`CAPITAL_VECTOR_TABLE` (`scripts/build.mjs:1103-1115,1848-1854`, main calls and
`src/hybrid/sector-reader.s:353-354`); the boot-image copy in
`sector_reader_restore_capital` and the boss's patched table
(`scripts/build.mjs:2726-2745`, `build/capital-vectors.inc`); and the fixed LIFE
equates in `src/hybrid/life-capsule-layout.inc:2-15`, consumed by
`src/main.s:22,3227,3254,10361,10489,13290`,
`src/hybrid/c-asm-abi.s:3-21` and `src/hybrid/life-capsule.s:102-112`.
The C side also has a literal `U8_AT(0xB82A)` for the LIFE spawned flag in
`src/c/director.c:53-54`; it must follow the new LIFE base.
The generated `build/director-abi.inc` currently derives
`HYBRID_ASM_WINDOW_BASE=$B478`; the Light linker start and window-only asserts
in `cfg/light-kernel.cfg:1-31` and `src/hybrid/light-kernel.s:44-49` must be
replaced with MAIN-hole bounds, while the Director C half stays at `$AE00`.
The one-byte end pad in `src/hybrid/c-asm-abi.s:642-655` still pins the
Director end to `$B478`; Phase B should retain its size unless a measured
relink deliberately changes that window baseline, and correct its stale
Light-placement comment.
`scripts/build.mjs:2639-2648,3667,5070` and the window/lance guards must use
the *Director* end for the free-window ledger, not the moved Light end.

The address-pinned harnesses include
`tests/light-wingman.test.mjs:156-177`,
`tests/overlay-slot.test.mjs:34,94-123`,
`tests/boss-overlay.test.mjs:210`,
`tests/level-buffer-16.test.mjs:202`,
`tests/basic-window-capacity.test.mjs:100-114`, and
`tests/level-summary-build.test.mjs:331`; the native trace's Light vector
pin comes from `scripts/runtime-wall-trace.mjs:4749`. Memory-map generation
also enumerates this link (`scripts/memory-map-report.mjs:596-600`). This is
the **MEASURED** searched consumer inventory (`rg LIGHT_KERNEL_|CAPITAL_VECTOR|LIFE_CAPSULE|B478|B82A|0xB82A`
over `src/`, `scripts/`, `tests/`); Phase B must regenerate constants rather
than editing generated includes.

### C. Menu-run payload, remeasured at this HEAD

The first and last addresses come from `build/void-strike-65.lbl`; exact raw
slice lengths and standalone LZ-10/5 costs were **MEASURED** by applying
`packBroadsideLzss` (`scripts/broadside-lzss.mjs:3`) to the baseline runtime
bytes in `build/resident-runtime.bin`, `starfield-runtime.bin` and
`entity-code-runtime.bin`. Individual packed sizes are *not* additive because
one stream shares matches. The phase/reader follows the cited source.

| Menu-only source | Current segment/range | Raw B | Isolated packed B | Reader / phase |
| --- | --- | ---: | ---: | --- |
| main menu screen stream | `RODATA` `$3615-$366C` | 88 | 90 | `render_frontend_records`; menu; `src/main.s:7808-7822` |
| options screen stream | `RODATA` `$366D-$3692` | 38 | 40 | same renderer; options; `src/main.s:7823-7829` |
| top scores stream | `RODATA` `$3693-$36BB` | 41 | 41 | same renderer; scores; `src/main.s:7830-7840` |
| exit stream | `RODATA` `$36BC-$36D4` | 25 | 27 | same renderer; exit confirmation; `src/main.s:7841-7849` |
| ending stream | `RODATA` `$36D5-$3703` | 47 | 48 | same renderer; campaign end; `src/main.s:7850-7856` |
| GAME OVER stream | `RODATA` `$3704-$3747` | 68 | 67 | same renderer; GAME OVER; `src/main.s:7857-7870` |
| marker positions | `RODATA` `$3748-$3761` | 26 | 28 | highlight code; menu/options/exit; `src/main.s:7871-7882` |
| score row template | `RODATA` `$380E-$3821` | 20 | 17 | score rendering, menu/GAME OVER; `src/main.s:8029-8037` |
| music score, pitches and columns | `STARFIELD` `$5A32-$5C33` | 514 | 339 | menu music player; menu; `src/main.s:6205-6428,6439` |
| star screen low bytes | `STARFIELD` `$5C34-$5C43` | 16 | 18 | draw/tick; main menu; `src/main.s:6499-6503` |
| star glyph/page bytes | `STARFIELD` `$5C44-$5C53` | 16 | 18 | draw/tick; main menu; `src/main.s:6504-6509` |
| star phase offsets | `STARFIELD` `$5C54-$5C58` | 5 | 7 | twinkle tick; main menu; `src/main.s:6510-6514` |
| star shapes | `STARFIELD` `$5C59-$5C64` | 12 | 14 | glyph build; main menu; `src/main.s:6515-6520` |
| main display list including JVB | `ENTITY_CODE` `$9400-$9440` | **65** | 67 | ANTIC; main menu; `src/main.s:7512-7538` |
| difficulty values | `ENTITY_CODE` `$9442-$9453` | 18 | 20 | options value draw; `src/main.s:7549-7556` |
| option label pointers and strings | `ENTITY_CODE` `$9454-$9477` | **36** | 38 | options value draw; `src/main.s:7557-7570` |
| options display list | `ENTITY_CODE` `$9500-$952F` | 48 | 45 | ANTIC; options; `src/main.s:7645-7661` |
| scores display list | `ENTITY_CODE` `$9530-$956B` | 60 | 59 | ANTIC; scores; `src/main.s:7662-7677` |
| GAME OVER display list | `ENTITY_CODE` `$956C-$9596` | 43 | 39 | ANTIC; GAME OVER; `src/main.s:7678-7696` |
| extended H3.1 glyph source | `ENTITY_CODE` `$9AEB-$9B6A` | 128 | 92 | copied to frontend charset at cold install / every rebuild; `src/main.s:3554,11571-11575` |
| **Contiguous proposed run after repacking** | proposed `$0C00-$1121` | **1,314** | **984 as one stream** | **8 padded sectors packed; 11 raw sectors** |

`gameplay-variety.md` §8.3's **1,335 B** is stale: its 77-byte star line is
**MEASURED 49 B** here, and its 263-byte display-list/difficulty line omits
the **36-byte options label block** at `$9454-$9477`. More importantly, the
32-byte `frontend_text_display_list` at `$9597-$95B6` is **not menu-only**:
`enter_pause` calls `select_frontend_display`, whose `@text` branch publishes
it (`src/main.s:2015-2077,2844-2880`). It remains resident, for exit/ending
as well as pause. The one-byte alignment gap `$9441` is not payload; the
`$943E-$9440` JVB is part of the main display list and must move with it.
Arithmetic: 353 + 514 + 49 + 216 movable display-list bytes + 54
difficulty/options + 128 glyphs = **1,314 B**. The `18`-byte
`frontend_screen_data` pointer table at `$31AA` includes pause-screen targets
and stays resident; Phase B repoints only its menu-target words
(`src/main.s:7379-7386`). The 12-byte `menu_star_cycle` at `$8880` and its
frame byte are runtime state/code, not an immutable star table
(`src/main.s:6544-6563`). The one-byte main-list alignment gap is not credited.

**Transport distinction:** the 984-byte pack is a **MEASURED current-byte
compression experiment**, not a linked run with relocated absolute words.
The 8-sector packed figure and 11-sector raw figure are **ESTIMATE** transport
choices until a linked menu run and its fold/checksum exist. A raw 11-sector
run occupies 1,408 disk bytes; a packed 8-sector run occupies 1,024. Both fit
the low-RAM destination. No mid-sector read is planned.

### D. Current window and exact return

The addresses are **MEASURED** from `build/encounter-director.map`,
`build/light-kernel.map`, `build/boss.map` and `build/manifest.json`
`residentCapacity.basicWindow`/`boss.lance`:

| Window range | Current bytes | Owner | After a byte-for-byte Light move |
| --- | ---: | --- | --- |
| `$AE00-$B3FC` | 1,533 | `HYBRID_C_WINDOW` | unchanged |
| `$B3FD` | 1 | boss-entry resident veneer | unchanged |
| `$B3FE-$B477` | 122 | `HYBRID_C_WINDOW_FLOW` | unchanged |
| `$B478-$B8FA` | **1,155** | Light record 9, five segments | **freed for M3-H** |
| `$B8FB-$B8FF` | 5 | lever reserve under §BU.1 | stays reserved |
| `$B900-$BBFF` | 768 | boss-only lance overlay (757 used) | unchanged |
| `$BC00-$BC1F` | 32 | reader BSS/guard | unchanged |

The manifest's **773 free** window bytes include `$B900-$BBFF`'s boss-only
overlay and the five reserved bytes; they are **not** 773 M3-H bytes. Current
M3-H-capable contiguous free space is **MEASURED 0**. After the move,
**ESTIMATE** 1,155 contiguous unreserved bytes at `$B478-$B8FA` become free.
The whole window's linked resident use falls 2,811 → **1,656 B**; the physical
free count grows 773 → **1,928 B**, but 768 are the lance overlay and 5 are
the owner reserve. This is the precise meaning of the A4 1,155-byte reclaim.

## 2. Phase-exclusive menu overlay and boot order

**Proposed destination (ESTIMATE):** `$0C00-$1121` for 1,314 raw bytes, inside
the `$0C00-$18FF` menu-phase part of the boss's low-RAM claim. This leaves
**2,014 B** of that 3,328-byte menu-phase range for later attract work and
alignment; no L1 byte occupies `$1900-$1FFF`, L2's **1,792-byte** fighter/capital
module. The owner map is `docs/memory-map.md:78-105` and the current segment
links are `build/level-summary.map`, `build/boss.map`.
With the table order of §1C, **ESTIMATE** main DL `$0F94-$0FD4`, options
`$100B-$103A`, scores `$103B-$1076` and GAME OVER `$1077-$10A1` each stay
inside one ANTIC 1-KiB page; Phase B must retain the source asserts at
`src/main.s:7708-7713` after the real link. This packed layout removes the
old `.align $100` before the main list (`src/main.s:7511`); if the assembler
requires that alignment, the actual padded size and disk sectors must be
remeasured rather than assuming the 1,314-byte proposal.

| Phase | Owner of `$0C00-$18FF`; safety argument |
| --- | --- |
| Boot/splash | **MEASURED** no baseline linked boot segment or transient range there; stage 2 is in MAIN `$21C1-$26F4`, splash `$0500-$06FF`. **ESTIMATE design:** temporarily hold checked record 9's compressed bytes at `$0C00-$10FF` until bitmap unpack, then decode them to MAIN before the menu run replaces the scratch. |
| Menu, options, scores, GAME OVER, ending | **ESTIMATE design** menu run owns `$0C00-$1121`; load and checksum it before any music, font copy, display-list publish or frontend data read. |
| Level loading / summary | **MEASURED** summary module persists at `$0500-$0BEE`; level/reader at `$A600-$ADFF`/`$A000`; menu bytes may remain but must not be assumed to survive boss entry. |
| Fighter and capital | **MEASURED** no current owner of `$0C00-$18FF`; future L2 uses `$1900-$1FFF`, read at level start and boss-overwritten only at boss install (§BU.1). No menu reader may execute during gameplay. |
| Boss entry/fight/death | **MEASURED** region charset `$0C00-$0FFF`, slot C `$1000-$17FF`, scratch `$1800-$18FF`, then breakup `$1000-$19FE` overwrite menu bytes. They are dead at boss install. |
| Pause | **MEASURED** gameplay pause uses the resident 32-byte `frontend_text_display_list` and pause text/backup, never a display list in the boss claim (`src/main.s:2015-2077,2849-2960`). Menu run is invalid if a boss has occurred. |

**Load points (ESTIMATE):** cold start after stage 2 and
`unpack_loader_bitmap`, before `copy_frontend_charset` and the first
`enter_main_menu`; every transition from gameplay to any frontend screen,
including `enter_game_over` immediately after player death, must go through
one checked reload before `music_start_menu` and frontend publication. The
shared `quit_gameplay_to_menu` path is `src/main.s:3107-3139`; direct GAME
OVER is `src/main.s:2770`, separate menu calls are at
`src/main.s:1791,1834,1853` and `src/hybrid/sector-reader.s:310,437`.
Pause quit, summary return, boss death/ending and ordinary quit are all in
scope. A single gate must cover all rather than pinning only one caller. Direct-SIO
reader `src/hybrid/sector-reader.s:578-659` reads whole 128-byte sectors and
checks its run; the menu run needs a directory entry and disk-guard expected
fold. Use **ESTIMATE** sectors **240–250** for raw V1 or **240–247** for packed
V2: baseline extension ends at sector 216, banner starts at 280, levels at
320 and boss fixed reservations start at 528 (`scripts/build.mjs:695-702`,
`build/manifest.json` sector tables). This reserved run must be collision-gated
against growth of the extension and later L2 runs. It is an ordinary
sector-reader run, **not** a twelfth boot DFMC record; DFMC remains 11/11 and
the initial block does not pay the approximately **16-byte** new-record charge
(`scripts/chunk-loader.mjs:8-18`, audit A4). Every on-disk block gets the
existing fold/checksum coverage before use; no partially read sector or
unchecked fallback.

**Critical load-order constraint:** the current stage 2 reads record 9 before
`start`, whereas `unpack_loader_bitmap` currently happens later at
`src/main.s:1320`; record 9 cannot simply change its destination to `$3643`,
because its last 673 bytes would overwrite the bitmap source at `$3825+`.
Phase B should keep the same whole-sector DFMC read and CRC check, then copy
record 9's **MEASURED 1,019 packed bytes** out of the reused `$8100` staging
area into `$0C00-$10FF` before records 10/11 overwrite staging. This
**ESTIMATE** 1,280-byte scratch cap also allows the compressed record to grow
at relink; the menu run overwrites it later. After `unpack_loader_bitmap`, the
resident LZ decoder at `$205C` (`build/void-strike-65.lbl`) publishes the
checked bytes to `$3643`. The loader display list actually lands at
`$3C00-$3CC9` (`build/loader-display-list.inc:2-4`), beyond the proposed
`$3AFF` ceiling, while its 1,967-byte bitmap source is already consumed;
`src/main.s:7541`'s `$3800` comment is stale. The packed scratch itself is
never executed. This
proposed sequence adds a bounded RAM copy/decode on cold boot but **no extra
disk read** and no read during a gameplay sector. Phase B must link-check the
scratch bound and all intermediate writers. The boot trace must prove the
bitmap source is consumed **before the first Light-record overwrite** of
`$3825-$3AC5` (`unpack_resident_runtime` legitimately writes the bitmap
source there earlier). This
ordering is a hard gate, not a detail to infer from emulator success.

## 3. Menu time and initial-block forecast

The owner's historical **596-frame** menu reference was measured with
Atari800's SIO patch. The *current* boot-smoke baseline is **MEASURED 1,351
frames / 27.02 s** under real SIO for the older 213-sector checkpoint;
`docs/boot-deadline-baseline.json` explicitly re-recorded 596 → 1,351 on
2026-10-09. Current HEAD has **MEASURED 216 occupied transport sectors**, but
Phase A is barred from running boot smoke, so its exact menu frame is **not
measured here**. At the previously measured **3.7–3.8 frames/sector** real-SIO
rate (same baseline; `docs/STATUS.md` hardware-boot section), three extra
sectors project **ESTIMATE ~1,362 frames** before L1. Cold totals below are
projections, not a new baseline or a request to waive the owner's 596 policy.
The new menu run uses the game's direct SIO reader, so it pays the same
sector wire time even when the emulator patch shortened the older OS boot
portion of the 596-frame reference.

| Variant | Disk/run and needed code | Added entry time, standard SIO | Cold from historical 596 (patched) | Cold from projected current ~1,362 (real SIO) | Return-to-menu visible delay |
| --- | --- | --- | --- | --- | --- |
| **V1 raw, read every entry** | **ESTIMATE** 11 sectors, checked direct read, no menu decoder | **ESTIMATE** 41–44 frames, 0.82–0.88 s (11 × measured 3.7–3.8 plus setup) | **ESTIMATE** 638–643 frames, 12.76–12.86 s | **ESTIMATE** 1,404–1,409 frames, 28.08–28.18 s | **ESTIMATE** 41–44 frames, 0.82–0.88 s |
| **V2 LZ, read every entry** | **MEASURED current-byte pack 984 B**; **ESTIMATE** 8 sectors plus decode from a disposable 1,024-B screen buffer | **ESTIMATE** 30–33 frames, 0.60–0.66 s (8 × measured rate plus bounded unpack) | **ESTIMATE** 627–632 frames, 12.54–12.64 s | **ESTIMATE** 1,393–1,398 frames, 27.86–27.96 s | **ESTIMATE** 30–33 frames, 0.60–0.66 s |
| **V3 boot once, retain** | **REJECTED by measured ownership:** boss overwrites `$0C00-$18FF`; no proven 1,314-B alternative outside L2's home | — | — | — | — |

Both cold totals include **ESTIMATE +1–3 frames** for record-9's new RAM
copy/decode after the bitmap unpack; returns pay only the menu run. The 596
figure is a policy reference, not today's real-SIO observation. The
owner's 2026-10-02 constraint leaves the decision on extra menu time to the
owner. Phase B must measure first menu and return routes in both SIO modes,
and compare with the **current** `docs/boot-deadline-baseline.json` gate
without changing that baseline to make an overlay pass.

**Initial block (ESTIMATE, no linked claim):** zero-replacing only the exact
menu ranges in current runtime images and re-running the existing compressor
on those bytes yields **MEASURED counterfactual** savings of MAIN suffix 262,
STARFIELD streams 351 and ENTITY_CODE 290 = **903 packed bytes**. This is not
a relink: addresses, alignment, new menu reader and the relocated 46 bytes can
change it. The *gross* projected content is **13,569 − 903 = 12,666 B** before
those additions, about **986 B** below the 13,652 planning line. Count **zero
banked savings** until Phase B's linker and boot image report actual bytes.
The MAIN hole is a filled 8-KB runtime image (`cfg/atari-boot.cfg` `MAIN`),
so its 528 reclaimed RAM bytes are not an additional 528 transport bytes.

## 4. Light relocation, hot cycles and affected frames

**ESTIMATE** order: (1) link/check the menu data run and its readers; (2) move
the 46 live MAIN bytes to `$3615-$3642`; (3) move all five Light segments as
one record to `$3643-$3AC5`; (4) defer record-9 publication until bitmap
unpack; (5) regenerate all ABI and vector constants and the capital pristine
image; (6) assert the end (exclusive) ≤ `$3AF0` for the required ≥16-byte floor, and
require source/record checksum validity before the first Light or LIFE call.
`$3AC5` is the current-size forecast, leaving 58 bytes; it is **not** linked
proof. The raw record stays 1,155 bytes in this forecast, the packed record's
1,019-byte / 9-sector size is **MEASURED baseline only**. Changed absolute
operands can change compression and the record's sector count.

For a byte-for-byte relocation from `$B478` to `$3643`, the delta is
**ESTIMATE −$7E35**. A scan of the linked baseline instruction bytes in
`build/light-kernel.lst`, with target and branch PC both shifted by that delta,
gives this **MEASURED static comparison / ESTIMATE runtime projection**.
Taken 6502 branches cost one more cycle if their target crosses a page;
untaken branches cost no extra cycle. Absolute `JSR`/`JMP` does not gain a page
penalty. Internal indexed absolute reads in the five hot routines are zero in
this listing; their indexed state arrays remain at existing addresses.

| Routine / old address | Taken-branch page-cross sites old → proposed | Per invocation / slot forecast |
| --- | --- | --- |
| `light_publish` `$B4AB` | four condition branches at `$B505,$B509,$B510,$B514` gain +1 each; they share one `@render_next` branch chain | **ESTIMATE** at most +1 per rendered/skipped slot on this chain, ≤ +4 with four slots |
| `light_update` `$B598` | six branches at `$B604,$B608,$B60E,$B615,$B625,$B632` gain +1 each; most are mutually exclusive exits | **ESTIMATE** ≤ +6 for a one-slot path by deliberately counting every changed site, less on any actual path |
| `light_shot` `$B69D` | no changed branch crossing among ten branch sites | **ESTIMATE** 0 branch cycles; recheck external absolute-indexed operands at relink |
| `light_backing` `$B735` | no branch | **ESTIMATE** 0 |
| `light_cell_resolve_sanitized` `$B73B` / `light_cell_resolve` `$B742` | no changed branch crossing among nine sites | **ESTIMATE** 0 |
| disk guard, capital image, HUD tail, LIFE tail | no changed branch crossing in their segment listings | **ESTIMATE** 0 branch cycles on their own branches; indexed LIFE shape readers must be checked after ABI regeneration |

**Indexed-address check (MEASURED operands, ESTIMATE relink):** the capital
restore's `lda capital_vector_image,x` (`src/hybrid/sector-reader.s:349-358`)
uses X=35…0: at `$B7F0`, 20 iterations (X≥16) cross a page; at proposed
`$39BB`, none do, so the restore saves **ESTIMATE 20 cycles once per restore**.
Its `sta CAPITAL_VECTOR_TABLE,x` moves `$B487` → `$3652` and crosses no page in
either case. The four LIFE PMG masks move `$B837` → `$3A02`; X=0…63 crosses
no page at either address. The missile tables move `$3802-$380D` →
`$3634-$363F`, with X=0…2 and no crossing; the damage table moves `$3822`
→ `$3640`, also X=0…2 with no crossing (`src/main.s:9961-10037,10826`).
The 31-byte hull publisher's local loop stays within one page at `$3762` and
proposed `$3615`; it runs at level start, not each frame. A linked Phase B
listing must confirm all of these address and cycle claims.

The page-cross enumeration uses **MEASURED** baseline bytes, not a newly
linked candidate. With one boss escort Light, the intentionally conservative
**ESTIMATE +10 cycles** from the publish/update rows makes Bastion's measured
8,478 → **8,488**, leaving **12** under 8,500
([STATUS](../STATUS.md), capsule stress table). This is a forecast for the
STOP check, not certification; any linked or measured forecast above 8,500 is
an immediate stop. No new gameplay-frame SIO read is proposed. Approximate
worst-case new main-loop work is +10 cycles for the one-Light boss path from
page crossings, and +0 for the menu-only read during gameplay; VBI/DLI code is
unchanged. The affected frame families are space swarms (up to current Light
capacity), capital transition/restore and boss fights with escort Lights.
The menu run affects only non-gameplay loading/menu frames. Phase B must use
actual linked branch and indexed-address comparisons before accepting these
projections.

## 5. L1 ledger and M3-H buffer

| Resource | Baseline MEASURED | After L1 ESTIMATE | Gate / implication |
| --- | ---: | ---: | --- |
| MAIN `$3615-$3AFF` | 1,259 gross; 46 live | 46 + 1,155 = 1,201; **58 left** | **≥16 linked**; bitmap unpack first |
| Resident `$AE00-$B8FF` use | 2,811 | 1,656 | frees `$B478-$B8FA` = **1,155** |
| M3-H-capable unreserved window | 0 | **1,155** | M3-H **ESTIMATE 472–516** fits, leaving **683–639**; reserve `$B8FB-$B8FF` stays 5 |
| Initial block content | 13,569, planning slack 83 | **ESTIMATE 12,666 before code/relayout** | 903-byte zero-fill proxy only; no 12th DFMC record |
| DFMC record 9 | 1,155 raw / 1,019 packed / 9 sectors | **ESTIMATE** same raw, packed/sector count to remeasure | checked compressed scratch at `$0C00-$10FF`; post-bitmap publication required |
| Menu disk run | none | **ESTIMATE** 11 raw or 8 packed sectors, starting at 240 | checked full-sector read at every entry |
| `PROJECTILES` free tail | `$549E-$54E3`, **70 B** | **ESTIMATE** damaged body at `$549E-$54BD`, **38 left** | writer/lifetime proof below |
| `STARFIELD` free tail | `$5CAB-$5E0A`, **352 B** | unchanged | 32-B fallback, not spent with PROJECTILES |

The M3-H 32-byte damaged-body buffer is **ESTIMATE** at `$549E-$54BD`.
**Static writer/lifetime proof:** `PROJECTILES` ends `$549D`
(`build/void-strike-65.map`); `cfg/atari-boot.cfg` reserves through `$54E3`;
`src/main.s:1074-1130` names ten PairShot arrays (138 B) and the menu music
voice state (20 B), ending exactly `$549D`. `init_fighter_projectiles` clears
exactly 138 B (`src/main.s:4030-4050`), and `music_start_menu` writes its own
20 B before tick (`src/main.s:1119-1129`). Neither reaches `$549E`.
The boot splash source overlaps this tail at `$52FD-$54FC`, but it is copied to
`$0500` before gameplay (`build/manifest.json` `transportCapacity.bootSplash`,
`src/main.s:1250-1325`), so the body buffer must be initialized **after**
that copy and never relied on across RESET or a return to the menu. The writer
would be M3-H's damage-time mask builder, with one bounded write over 32 bytes;
the reader would be the Bomber PMG publisher while that damaged body is live.
This proves disjoint declared writers and the required ordering from source;
Phase B must add a focused runtime write-watch for `$549E-$54BD` over cold
boot, menu, fighter, capital, boss, summary and pause before calling it safe.
If that watch finds an owner, allocate `$5CAB-$5CCA` (32 B) from the
**MEASURED** 352-byte STARFIELD tail instead, leaving 320; neither tail is
counted as extra window capacity.

## 6. Phase B sequence, measurements and stops

**Suggested focused commits on one implementation branch:**

1. Menu run and checked read at every frontend entry; generated directory,
   disk fold, source pointers and H3.1 copy order. Prove both menu variants on
   a linked build and retain only the owner-selected one.
2. Relocate the 46 live MAIN bytes and the complete five-segment Light link;
   implement the post-bitmap checked record-9 publication and regenerate every
   ABI/vector/image constant. Update the generated memory map and affected
   documentation.
3. Verify the M3-H buffer home with the focused writer/lifetime watch; keep
   the 32-byte buffer as an L1 reservation, with no M3-H gameplay implementation.
   Produce an ATR for owner smoke. The owner alone can mark it accepted.

### Measurements (only these)

Under [AGENTS.md](../../AGENTS.md) §BM/§BR, use the normal computed build and
focused changed-path checks, then a short representative native/PAL check:

1. **Link/transport:** exact MAIN end and ≥16-byte tail; `LIGHT_KERNEL` five
   segment sizes, record 9 landing after bitmap unpack, 11/11 DFMC count,
   menu run sectors/CRC, initial bytes against its planning and hard gates,
   window end before `$B900`, all block sizes and disk limits. Show no mid-sector
   read and the first Light-record overwrite of `$3825+` strictly after bitmap unpack.
2. **Menu:** cold ATR menu frames with real SIO and patched SIO, plus GAME
   OVER, pause quit, summary, boss ending and RESET returns; standard-SIO
   return delay; font, music, stars, every frontend display list and options
   labels after a boss overwrite. Compare with the 596 historical reference
   and the *current* boot baseline without rebasing the gate by default.
3. **Focused correctness:** Light vector ABI, capital vector patch/restore and
   pristine image, LIFE veneers/PMG shapes, disk guard, publisher/mask/damage
   table readers, and the 32-byte buffer write watch across all phases.
4. **Focused cycles:** linked per-routine branch/indexed page-cross list; one
   representative space swarm, capital transition and boss escort route. Run
   the boss native stress fixtures for **all four bosses**, with the strongest
   reachable tier/layout and lost-target arrivals in **Citadel L5** and
   **Spine L7/L9**. Every boss stress result must be **≤8,500**; Bastion is
   presently **8,478**, only 22 cycles of headroom. Record boss entry for all
   four **≤350 host frames**, and the normal frame **31,500 target / 32,568
   hard**, DMA, fence, missed-frame and VBI/DLI anomaly gates on the affected
   paths. The normal build's computed gates remain fatal.
5. **Startup/real hardware path:** `npm run boot:smoke --
   --atari800-source=build/atari800-trace` because load order changed; prove
   checked whole-sector reads, recovery/error screen and SIO2SD-compatible
   standard timing. Owner smoke on a real 65XE is required for acceptance.

### NOT required between releases

No full `npm test`, runtime wall-trace regeneration, stage-2 evidence pass,
showcase GIF, failures reconciliation or `build:release` for this bounded L1
candidate. §BM/§BR reserve those for a release or a concrete broad regression;
the stale wall-trace binding is expected in a normal build. No hash-bound GIF
per variant. The focused tests and computed build gates remain required.

### Phase B STOP conditions and risks

- **Placement:** linked Light + retained 46 leaves <16 B of `$3615-$3AFF`, or
  any menu destination conflicts with boss/summary/L2 phase ownership.
- **Boot/transport:** a record writes `$3825+` before bitmap unpack, a
  mid-sector or unchecked read is needed, the initial block crosses its gate,
  a disk run collides, or record 9 cannot be published after the unpack with
  checked bytes on stock 65XE/SIO2SD.
- **Timing:** Bastion stress forecast or measurement exceeds **8,500**, any
  boss stress fails, entry exceeds **350**, or a normal frame/DMA/fence gate
  fails. The +10 cycle static forecast is narrow enough that the linked
  address and native stress measurements decide this immediately.
- **Data lifetime:** any path renders menu data after boss overwrite but before
  reload, any unplanned writer touches the damaged-body tail, or the 596-frame
  owner policy cannot accommodate the chosen added read.

If a STOP condition fires, preserve the linked evidence and return to owner
with two or three compliant alternatives and exact bytes/cycles. Do not move
L2 into the menu's range, relax the 8,500 pin or spend the five reserved
window bytes by default. **Open owner question:** choose the raw 11-sector or
packed 8-sector menu read after reviewing the latency and complexity above;
the historical 596-frame policy and current real-SIO baseline are both shown
so the choice is explicit.
