# Plan — budget-1.0: the resource budget from today's `main` to release 1.0

**PLANNING session, 2026-10-01. `OWNER REVIEW CANDIDATE`.** Branch
`docs/budget-1.0` from `main` `cf99af3`. **Nothing here is implemented; this
document is the deliverable.** No source, cfg, build script, harness, evidence,
`dist/` or `docs/media/` byte changed, and no build was run: every baseline
figure is read from the artifacts the default build already left in `build/`
and `dist/`.

**Amended 2026-10-01, twice,** with the owner decisions taken on it: no Heavy
and at most one Light in a boss sector; the Heavy behaviour package and its
three sub-decisions (§2 M3-H); the menu baseline kept until 1.0. All are
recorded in §5.3; §5.2 lists what is still open.

**Note, 2026-10-02.** The M3 and M3-H **cycle** lines of this document — the
fence margin ending 374 over GO and the DMA-on line moving at M3 and M3-H — are
superseded by the re-base in [m3-waves-heavy.md](m3-waves-heavy.md) §1.4 and
§6.1. Nothing else here is rewritten.

It answers four questions: does everything left until 1.0 fit in the machine,
which resource does each milestone spend, where are the shortfalls, and which
levers pay for them.

**The short answer.**

* **One resource is certain to run out: the `$AE00` code window, at M5 (the
  boss).** 1,593 B free today; M2–M4 take about 760 B, the cheapest boss about
  1,370 B. The shortfall is 200–535 B at M5 and 350–715 B by M6 (expected
  figures – budgeted figures), and has to be bought with levers (§4).
* **Cycles fit under three conditions.** The boss *replaces* the Heavy pair in
  its sector (**decided 2026-10-01**: no Heavy in a boss sector); wave paths
  and the sky add no standing cost to ELITE frames; no booster puts more shots
  in flight. The Heavy behaviour package (§2 M3-H) has its descent rate set
  per archetype with the two members moving on alternate frames (**decided**):
  its gates cost 98 cycles on the binding row and the held Raider's skipped
  body copy returns about 350, so the margin ends **374 over GO**. That saving
  is an analogy to Option D, not yet a measurement; if it were zero the margin
  would end 24 over GO.
* **Transport fits because the 596-frame menu baseline is kept until 1.0**
  (**decided**; it is re-recorded at the release candidate). The boot-blank fix
  left the ATR menu at −50, which is 57 frames of room under the STOP rule —
  about 28 extension sectors. The road needs about 18, or 23 with the optional
  items.
* **The initial block (31 B to the STOP line) survives only if no new code
  lands in `CODE`, `RODATA`, `STARFIELD` or `ENTITY_CODE`.** The plan below
  spends about 24 of the 31. The brief's 12-B `LEVEL_MAX_ID` lever does not
  land there (§0.2 item 2).

---

## 0. Step 0, sources and conventions

### 0.1 Step 0 record

| | |
| --- | --- |
| `main` | `cf99af3 docs: trace-clause-repairs Phase B - recorded clauses 16 -> 3, tests 5 -> 3`; tree clean |
| trace-clause-repairs merged | yes — `docs/plans/trace-clause-repairs.md` is on `main` |
| worktrees | one: `/Users/marcinkrzetowski/Projects/dark-fighter` |
| ATR SHA-256 | `af2e47b62c315ddf9ed05cab44842d8921bcb8c561b9cc2dcf103f1b1e8b31b7` (92,176 B) |
| boot SHA-256 | `06d2f25665a17c0858c92245f257d6d339858149a5ed4679919d120d6eb4d80a` (26,624 B) |
| evidence binding | `build/manifest.json` `runtimeEvidence.status: final-bound`, same two hashes |

No baseline worktree and no probe build were needed: the branch changes
documents only, so `main` and the branch produce the same artifacts.

### 0.2 Where the brief and the repo differ

The repo wins in each case.

1. **DFMC records are at their maximum: 11 of `CHUNK_MAX_COUNT` 11**
   (`src/main.s:12122`; manifest `transportCapacity.manifest.parsed.records`).
   A twelfth record costs 16 B of `BOOT_STAGE2`, which rides raw in the initial
   block. The brief does not list this resource. New code therefore has to grow
   an existing record.
2. **`LEVEL_MAX_ID` 16 → 12 returns 12 B to the sector reader, not to the
   initial block.** The 48-B directory is `sector_reader_directory` at `$A591`
   in `SECTOR_READER` (`build/sector-reader.lbl`), which ships as extension
   record 10 (RAW, 12 sectors). The initial block does not move.
3. **The build's region and steel mapping is stale against decision AC.**
   `hullStyleIdForLevel` and `alliedColpf1ForLevel` (`scripts/build.mjs:331-339`)
   divide by `LEVEL_MAX_ID = 16`: regions of four levels (R1 1–4 … R4 13–16) and
   the steel change at level 9. AC says regions of three and the change at
   level 7. In a twelve-level campaign as built today style R4 is never used
   (manifest `capitalHulls.levelStyles`). M7 must fix it; `LEVEL_MAX_ID` → 12
   does, and so does a build-only campaign-length constant at 0 resident bytes.
4. **Two extension records are full.** Record 5 (the `HYBRID_C_EXT` composite,
   874 B raw) packs to 747 B in 6 sectors, capacity 747: **0 B spare**
   (manifest `directorCodeRuntimes`, "extension"). Record 2 has 3 B (as the
   brief says), the window's C half 6 B.
5. **Free ATR sectors: 512**, not 511 (manifest `remainingAtrSectors`).
6. **The 31,200 target has 79 cycles left** (DMA-on maximum 31,121). The brief
   names only GO ≥ 500 and the 32,568 hard gate; the target is the third figure
   `AGENTS.md` tells sessions not to confuse with them.
7. **"The Heavy limit, today 2 formations"** — the repo's limit is two Heavy
   *members* on `P1`/`P2` (`RAIDER_SLOT_COUNT 2`, `src/c/lifecycle.c:194`),
   admitted as one formation. It is an architecture invariant, not a tunable
   (§2 M7).
8. **Decision O says the loader shows an animation, "not a progress bar"**
   (`docs/STATUS.md`, decisions table). The brief offers a hangar screen with a
   progress bar. Listed as an owner decision at M4.
9. **M8 "data changes only" does not cover decision J.** Difficulty-scaled
   damage is code: player-dealt damage is a hardcoded `lda #$01`
   (`src/main.s:3892`).
10. **Fields the level format carries and the runtime does not read:**
    `pickupPolicy` (`docs/game-design.md`), the debris *count* (read as
    non-zero only, Director plan §11 item 15), turret density steps 0–2
    (`docs/level-authoring.md`).

### 0.3 Conventions

* **Basis of every estimate:** **M** measured (file named); **IC** instruction
  count from the 6502 or C source; **AN** analogy to an existing routine
  (named, with its measured size or cost); **G** guess.
* **Estimates are written `expected → budgeted`**, where budgeted is expected
  plus 20 %. The cumulative tables use the budgeted figure.
* **Sizes of existing routines** quoted as analogies are measured: ASM routines
  as label-to-next-label spans in the `.lbl` files, C functions summed from the
  assembler listings in `build/`.
* **Packed size** of new C/ASM is taken at 0.78 of raw, the ratio of the
  window's C half today (1,283 raw → 997 packed, manifest). **AN**.
* **One extension sector ≈ 2 ATR menu frames.** A sizing rule, not an identity
  (STATUS "Boot-frame note"). **M**, with that caveat.
* **Which segment pays where** (manifest, link maps):

| Paid in the **initial block** (31 B to STOP) | Paid in an **extension record** (menu frames) |
| --- | --- |
| `CODE`, `RODATA` (MAIN, full), `STARFIELD` (holds `handle_collisions`, the pickup lifecycle, the menu music), `ENTITY_CODE`, `A2_KERNEL`, `BOOT_STAGE2`, the splash blob, the loader bitmap | `BROADSIDE` (record 1), `PICKUP_CODE` + `HYBRID_C_SECTOR` (2), `HYBRID_C_EXT` (5), `HYBRID_C_ARENA` (7), the window's C half (8), the Light kernel (9), the sector reader (10), `DIRECTOR_RAM` (11) |

---

## 1. Inventory

Sources: **MAN** `build/manifest.json`; **MAP** `build/void-strike-65.map`,
`build/encounter-director.map`, `build/sector-reader.map`; **LBL** the `.lbl`
files; **TRACE** `docs/runtime-wall-trace.json`; **STATUS** `docs/STATUS.md`;
**L2** `docs/diagnostics/level-2-timing-2026-09-30.md`.

### 1.1 Cycles, DMA, raster

| Resource | Today | Limit | Headroom | Source |
| --- | ---: | ---: | ---: | --- |
| Worst line-238 fence margin | 785 (`director-complete-2` f5815) | GO ≥ 500 | **285** | STATUS trace-clause-repairs table; PAL audit (the trace JSON has no fence field) |
| DMA-on maximum, hard gate | 31,121 (`director-complete-2` f5797) | 32,568 | **1,447** | TRACE `gate.measured_wall_cycles_dma_on` |
| DMA-on maximum, target | 31,121 | 31,200 | **79** | same |
| Physical PAL frame | 31,121 | 35,568 | 4,447 | TRACE `gate.measured_physical_headroom` |
| Heaviest frame of a capital session | 30,568 (session maximum of `capital-muzzle-ring-2-sweep-fire4`); level 2's capital sector 29,538 | 32,568 (capital frames have no fence) | 2,000 | TRACE `replay.sessions`; L2 |
| Level 2 worst margin / maximum | 1,607 (ELITE) / 31,205; swarm sectors ≥ 5,931 | — | — | L2 (diagnostic only) |
| DLIs per frame | 2 (bodies 77 + 48 cycles, 14 NMI entry) | art rule: no DLI for a local colour effect | — | TRACE; MAN `runtimeTiming.estimatedAdditive.dli` |
| ANTIC/PMG DMA per frame | 12,531 (refresh 2,808, PMG 1,200, screen and font 8,448, list 75) | — | — | MAN, diagnostic estimate |

**What the heaviest frame is made of** (TRACE `heaviest_frame_cost_breakdown`,
f5797, 31,121): player projectiles **15,161**, ring and playfield 5,244, enemy
update and collision 3,786, hostile projectiles 2,995, debris 1,290, remaining
1,036, broadside 514, effects 410, music 303, capsule 296. The adjacent frame
f5798 is recorded with its state: `SECTOR_FIGHTER`, two live Raiders, a live
Interceptor, nine projectiles, a debris and a pending capsule. **The binding
frame family is an ELITE frame under Spread fire.** Half its cost is the
player's own shots.

**Per-unit costs already measured:** one player PairShot in flight ~574–729
cycles; one hostile shot ~79–117 (STATUS backlog, "Projectile load levers").
One Light 257 mean standing (STATUS Light multiplicity). Two Bombers
3,418–3,894 wall cycles standing; a Raider pair 1,467–1,585 in `update_enemy`
(STATUS PAL gate; MAN `legalHeavyCombination`).

### 1.2 Transport and boot

| Resource | Today | Limit | Headroom | Source |
| --- | ---: | ---: | ---: | --- |
| Initial block content | 13,621 B | STOP 13,652 | **31 B** | MAN `transportCapacity.initialBootContentBytes` |
| — to the ceiling | 13,621 B | 13,684 | 63 B | same; STATUS |
| Boot sectors | 107 | 107 (STOP: no new one) | 0 | MAN |
| Extension / total sectors | 101 / 208 | bounded by the menu rule | — | MAN |
| ATR menu frame | 546 (BASIC on: 537) | baseline 596 + 7 = 603 | **57 frames** ≈ 28 sectors | TRACE `boot_smoke.sessions`; `docs/boot-deadline-baseline.json` |
| DFMC records | 11 | 11 | **0** | `src/main.s:12122`; MAN |
| ATR disk | 208 transport + 13 level 1 at sector 320 | 720 sectors | 512 free; levels may use 320–719 | MAN; `scripts/build.mjs:345` |
| Level load at START GAME | 49 frames for 13 sectors | — | — | TRACE `boot_smoke.sector_reader` (emulator; hardware rate unmeasured, debt items 2 and 5) |

**Capacity of each extension record** (`sectors × 128 − 21`; MAN manifest records):

| # | Record | Sectors | Packed / capacity | Spare |
| ---: | --- | ---: | ---: | ---: |
| 1 | `BROADSIDE` (LZ) | 44 | 5,502 / 5,611 | 109 |
| 2 | pickup stream + `HYBRID_C_SECTOR` (two packed streams) | 9 | 1,128 / 1,131 | **3** |
| 3 | `DIRECTOR_ABI` cold record | 1 | 105 / 107 | 2 |
| 4 | low-C + GLUE (LZ) | 3 | 327 / 363 | 36 |
| 5 | `HYBRID_C_EXT` composite (874 B raw, packed stream) | 6 | 747 / 747 | **0** |
| 6 | `DIRECTOR_C_PRE` | 1 | 23 / 107 | 84 |
| 7 | `HYBRID_C_ARENA` (LZ) | 6 | 649 / 747 | 98 |
| 8 | window C half (LZ) | 8 | 997 / 1,003 | **6** |
| 9 | Light kernel (LZ) | 6 | 637 / 747 | 110 |
| 10 | sector reader (raw) | 12 | 1,473 / 1,515 | 42 |
| 11 | `DIRECTOR_RAM` (LZ) | 5 | 496 / 619 | 123 |

### 1.3 RAM and code

| Resource | Used / capacity | Free | Source |
| --- | ---: | ---: | --- |
| `$AE00` window (`$AE00-$BBFF`) | 1,991 / 3,584 | **1,593** | MAN `residentCapacity.basicWindow` |
| `DIRECTOR_RAM` | 602 / 645 | 43 | MAP |
| `HYBRID_C_ARENA` | 718 / 832 | 114 | MAN |
| `HYBRID_C_SECTOR` | 215 / 248 | 33 | MAN |
| `HYBRID_C_EXT` + `LIGHT_CODE`/`HEAVY_CODE` | — | 25 | MAN `tails.hybridCExtension` |
| `ENTITY_CODE` tail (to `$9D5E`) | 3,140 | 26 | MAP |
| `PICKUP_CODE` tail (to `$8B67`) | 944 | 65 | MAP |
| `A2_KERNEL` | 237 / 256 | 19 | MAN |
| `BROADSIDE` | 6,653 / 6,656 | 3 | MAP |
| `CODE` + `RODATA` (MAIN `$2000-$3FFF`) | 8,192 / 8,192 | 0 (57-B and 3-B zero pins inside) | MAP; `src/main.s:3228`, `:4274` |
| `STARFIELD` run tail | 2,039 / 2,348 | 309 RAM; packed 1,750 vs gate 1,825 → 75 B | MAN `starfieldRuntime` |
| Sector reader (`$A000-$A5FF`) | 1,473 / 1,536 | 63 | MAN `sectorReader` |
| `ENTITY_STATE` (`$8000-$80F3`) | 212 live / 244 | ~32 (which bytes are free was not mapped here) | MAN `entityEffects.liveFieldBytes`; `docs/memory-map.md` |
| Unowned RAM | `$812E-$813F` 18 B, `$85E6-$85EE` 9 B | 27 | `docs/memory-map.md` |
| Zero page | `$80-$9F` full, `$A0-$AB` reader and menu music | `$AC-$FF` 84 B | MAP; `docs/memory-map.md` |
| Zero pins in `BROADSIDE` | `hull_sequence_reserve` 120 B, `enemy_hull_codebook_reserve` 16 B | 136 reusable in place | `src/main.s:7743`, `:7771`; Director plan §8.2 |

### 1.4 Level image, `LEVEL_BUFFER`, disk

| Resource | Today | Limit | Headroom | Source |
| --- | ---: | ---: | ---: | --- |
| Level image (levels 1 and 2) | 13 sectors, 1,664 B | `LEVEL_BUFFER` 16 sectors, 2,048 B | 3 sectors, 384 B | MAN `sectorReader`; Director plan §2.1 |
| — inside the image | music block 120 B free; hull block 104 B pad; core page full; payload page 256 B reserved and unread; geometry page full | — | 224 B of pad | MAN `gameplayMusic.placement`, `capitalHulls.levelBlock` |
| WaveDef entries | level 1 uses 20, level 2 19 | 20 per level | **0 / 1** | MAN `levelDef.level1`; `assets/levels/level-02.json` |
| SectorDef entries | level 1 4, level 2 6 | 10 | 6 / 4 | same |
| Twelve level images | 156 sectors at 13, 192 at 16 | 400 sectors from 320 | 244 / 208 | arithmetic on MAN |
| Level directory | 16 × 3 B, one entry used | `LEVEL_MAX_ID` 16 | 4 entries beyond twelve | `src/hybrid/sector-reader.s:132`, `:912` |

### 1.5 PMG, colour registers, charset

| Screen phase | Players | Missiles | Colour registers | Source |
| --- | --- | --- | --- | --- |
| Fighter `OPEN` (SWARM, ELITE) | `P0` player; `P1`/`P2` Heavy; `P3` capsule and the player explosion's outer mask | **all four free** | `COLPM3` gold `$1C` is the capsule's alone; `COLPF0` white, `COLPF1` allied steel (level data), `COLPF2` `$1E`, `COLPF3` hostile red — each shared by several object classes; `PRIOR` `$00`, so the GTIA fifth player is unused | `docs/art-direction.md` "Gameplay palette ownership"; `docs/memory-map.md` "PMG ownership"; `src/main.s:3546-3582` |
| `CAPITAL` | `P0` player; `P1`/`P2` not drawn, their colour lent to `M1`/`M2`; `P3` explosion mask only | `M1`-`M3` broadside; `M0` free | `COLPM3` `$28` | same |
| HUD band | — | — | own `CHBASE`, `COLPF1` `$0E`, `COLPF2` `$00`, set by the second DLI | `src/main.s:3584-3592` |
| `BOSS` | not defined | not defined | not defined | — |

Charset: codes 122–125 are free but are the second and third Light appearance
pairs of the payload page; far-star codes 2–6 are allocated and the far layer is
disabled (MAN `starfield.farLayer`); hostile weapon visuals use 4 of 9 slots
(three classes and the Bomber's animation phase, `src/main.s:887-888`); the
player projectile bank has room for one more look (five in all,
`docs/game-design.md` decision U).

**Measured sizes of the existing C, used as analogies below** (summed from the
assembler listings `build/encounter-director*.lst`): the whole data-driven
Director 1,173 B (`director_c_world_row_tick` 264, `director_c_request` 205,
`director_c_try_event` 152); the whole Light class 1,174 B (`light_tick_body`
428, `light_admit` 181, `light_pair_for_record` 124); the Bomber's handlers
545 B (`enemy_c_heavy_tick` 194, `enemy_c_spawn_raiders` 135);
`sector_c_update_capital_phase` 98 B.

---

## 2. What each milestone needs

Every table lists bytes as `expected → budgeted`. "Frames" means ATR menu
frames at the 2-per-sector sizing rule.

### M2 — Director step 5: payload (re-skins, weapon looks, sky per sector)

| Item | Bytes | Lives in | Basis |
| --- | ---: | --- | --- |
| Appearance slot from `wave_flags` bits 0–1 | 25 → 30 | window (C); `light_pair_for_record` itself (124 B) must stay size-neutral in `HYBRID_C_EXT`, whose record is full | **AN** `light_pair_for_record`; Director plan §2.3 |
| Install source table, 5 addresses | 16 → 20 | Light kernel | **IC**; plan §2.3 says ~12 |
| `weapon_glyph[2]` install at level start | 35 → 42 | window; reuses `build_hostile_weapon_glyphs` (arena) with a payload source | **IC** (two 8-B copies and two step periods); design-4.6 §1.6 says ~20 |
| Star colour per sector | 30 → 36 | window | **IC**, variant S2 below |
| `sector_look` dispatch at sector entry | 16 → 20 | `DIRECTOR_RAM` | **AN** the existing sector-entry code in `director_c_world_row_tick` |
| Nebula thickening | 66 → 80 (50 code + 16 pattern) | the 120-B zero pin in `BROADSIDE`, beside `generate_starfield_row` | **IC**; design-4.6 §7.3 says ~40 |

**Totals.** Window 90 → **108 B**; Light kernel 20; `DIRECTOR_RAM` 20;
`BROADSIDE` pin 80. Records: the window's C half gains one sector (6 B spare);
the others fit their spare. **+1 sector, +2 frames.** Level image: 0 (the
payload page is already in every image). Initial block: **0**, on one
condition — nothing goes into the `STARFIELD` segment, whose packed image is
part of the initial block. `generate_starfield_row` is in `BROADSIDE`
(`$664F`), so the condition can be met.

**Cycles.** The appearance install runs once per admission and already goes
through the one-expensive-event token (~300 cycles, design-4.6 §5). The weapon
glyph install and the star colour run at level start and at sector entry,
outside any heavy frame. The only per-frame cost is the nebula: about
40 + 16 per cell on a frame that generates a new ring row — **105 → 125 cycles
on a rotate frame** with four cells (**IC**). Both binding frames of the
project have been rotate frames (STATUS Light multiplicity step 5).

**The sky: three variants, one decision.**

| | What | Bytes | Cycles on the binding row | Side effect |
| --- | --- | ---: | ---: | --- |
| **S1** | patch the `COLPF0` operand in `gameplay_dli`, as the allied `COLPF1` is patched today | 12 → 15 | 0 | recolours everything white: hostile shot heads, the Interceptor hub, debris |
| **S2** (budgeted) | re-install the star glyph with another pixel value at sector entry: white, allied steel or yellow | 30 → 36 | 0 | three colours only; every star on screen changes on the boundary frame |
| **S3** | nebula cells written by `generate_starfield_row` | 66 → 80 | +125 on rotate frames | transients publish only into `CH_SPACE` cells, so a Light or a debris over a nebula cell is hidden behind it; the pattern must stay sparse or the publish test grows |

The budget takes S2 plus S3 **restricted by the validator to SWARM sectors**,
where the measured margin is ≥ 5,931. S3 in an ELITE sector costs 125 of the
285.

### M3 — Director step 6: wave paths

| Item | Bytes | Lives in | Basis |
| --- | ---: | --- | --- |
| Path evaluator (four 3-B segments, signed nibbles, clamp, flags) | 220 → 264 | window (C) | **AN** `light_tick_body` (428 B for one Light's motion, retirement and fire; motion is roughly half); design-4.6 §1.4 says ~150 |
| Resident path library, 8 × 12 B | 96 | window RODATA, or the `BROADSIDE` pin | fixed by the format |
| Motion companion table | 16 | window RODATA | design-4.6 §1.5 |
| `ENEMY_MOVEMENT_PATH` hook in the Light tick | 20 → 24 | window | **IC** |
| Volley and conditional fire | 60 → 72 | window | design-4.6 §7.3 |
| Per-slot path state, 2 B × 4 Lights | 8 | unowned `$812E-$813F` | **IC** |

Heavies do not use the evaluator: their movement in 1.0 is the Heavy behaviour
package (M3-H below), decided by the owner on 2026-10-01.

**Totals.** Window 412 → **472 B** (≈ 370 packed): **+3 sectors, +6 frames.**
Level image 0 (`path[8]`, 96 B, is in the payload page). Initial block 0.

**Cycles — the main question.** Per live member per frame the evaluator costs
110 → 130 (**IC**; design-4.6 says 80–120). It replaces the free-flight branch
it supersedes (about 75 cycles on an Interceptor tracking frame, 35 otherwise,
**IC** from `src/c/lifecycle.c:1069-1094`), so the net is +55 … +95 → **+115
per Light on a path**. A wave that keeps `wave_path = $FF` pays only the test,
about 10 cycles.

| Where | Load | Cost | Margin it lands on |
| --- | --- | ---: | --- |
| SWARM, three Lights on paths | 3 × 115 | +345 | ≥ 5,931 (L2, MEASURED) — not a constraint |
| ELITE, one free Light on a path | 1 × 115 | **+115** | 785 → 670 (the binding family has a live Interceptor) |

| Variant | Paths for | Bytes | Worst cost on the binding row | Note |
| --- | --- | ---: | ---: | --- |
| **V1** (budgeted, and the only one left) | Lights only | 472 | +115 | Heavy movement is M3-H |
| ~~V2~~ | Lights and Heavies through the evaluator | — | — | **withdrawn**: the owner's Heavy package replaces it; backward flight and aimed shots are out of scope for 1.0 |
| V3 | per-frame offset tables instead of segments | 472 − 96 + 256…512 | +60 per member (**G**) | cheaper per frame, 3–5× the path data |

The plan's rule stands: the evaluator is measured on a native prototype before
integration and carries its own budget (Director plan §4).

### M3-H — Heavy behaviour package (owner decision 2026-10-01)

**Decided:** Heavies stay a separate enemy type and become harder through four
items — slower flight, a stop-and-shoot phase, slightly more hit points, and a
dodge when hit. The dodge is committed, not optional. Backward flight and aimed
shots are out of scope for 1.0 and are not priced.

**Its own budget line, built in the same step as M3.** It shares M3's wave
byte, validator and replay re-scripting, but it does not depend on the path
evaluator and is not optional as the Heavy variant of M3 was.

**Its three sub-decisions are taken (owner, 2026-10-01, §5.3):** hit points
**P1** — Raider 1 / 1 / 1, Bomber 4 / 4 / 5, `BOMBER_FLASH_LUMA` 6 → 4; the
descent rate is **per archetype, the two members on alternate frames**; a hit
during the hold **keeps the hold**, and the Bomber dodges sideways on its row.
The dodge is therefore a Bomber behaviour. The Raider dodge and P2 are
deferred to the M8 balance round as an option and are not budgeted here.

**What the code does today** (read from the source, MEASURED where a size is
given):

| | Raider | Bomber |
| --- | --- | --- |
| Movement owner | ASM, `update_enemy_slot_motion` (`src/main.s:4909`, segment `CODE` — initial block) | C, `enemy_c_heavy_tick` (194 B, arena) |
| Vertical speed | 1 line every frame, so its body is copied to `P1`/`P2` every frame | 1 line every other frame, the two members on opposite parity; the body copy is skipped on a frame that holds Y (Option D) |
| Stop and shoot | none: it fires while crossing | exists: `BOMBER_ATTACK` brakes to dx 0, dy 0, charges 20 frames, fires its salvo, then sweeps off (`src/c/lifecycle.c:1392-1410`); when it happens is the member's own fire timer, not wave data |
| Hit points | **1 / 1 / 1** (EASY / MEDIUM / HARD) | **4 / 4 / 4** |
| Non-lethal hit | cannot happen at 1 HP | `resolve_enemy_damage` does nothing beyond the HP decrement; the next member tick sees the HP change in `bomber_colour` and starts a 6-frame hull flash |

Hit points are one byte per archetype record (`enemy_archetypes`,
`src/c/lifecycle.c:204-248`) copied at spawn (`ENEMY_HP_0 =
HEAVY_FIELD(HIT_POINTS)`); no difficulty reads it. The Lights are 1 HP each.

**Pricing.** "Binding row" is the ELITE row of §1.1: two Raiders live, Spread
fire, margin 785.

| Item | Bytes | Lives in | Cycles on the binding ELITE row | Cycles on the frames where it runs | Basis |
| --- | ---: | --- | ---: | --- | --- |
| **a. Slower flight** — a rate per archetype (decision 3b) | Raider descent gate 22 → 26. The Bomber already descends on alternate frames with its members on opposite parity: its rate is a constant, 0 B. The per-wave form's rate copy (12 B), Bomber mask (5 B) and state byte are not needed | `PICKUP_CODE` tail, reached by re-pointing the existing `jmp update_enemy_slot_motion` in `HEAVY_CODE` (byte-neutral there) | gate **+52 → +62** for two Raiders. One Raider holds its Y on every frame and skips its body copy: **−440 → −350** | every Heavy frame | gate **IC** (save the old Y, test frame parity against the slot, restore). Saving **AN** Option D: +998 on the then-binding row with two Bombers, MEASURED (STATUS PAL gate); ~500 per member, scaled to the Raider's 14 of 16 rows; budgeted at 80 % |
| **b. Stop and shoot** — hold row and hold time from the wave | Raider hold 20 → 24; Bomber hold row and time from the wave 12 → 15; copied at spawn 8 → 10; 3 B state | Raider: `PICKUP_CODE` tail, in the same gate; the rest: arena | test **+30 → +36** for two members | on hold frames both members keep their Y: both body copies skipped, **−880 → −700** | **IC**; the Bomber half is **AN** its existing `BOMBER_ATTACK` branch |
| **c. Hit points** — P1 (decision 3a): Bomber 4 / 4 / 5 | 14 → 17 | arena, `enemy_c_spawn_raiders` | 0 | 0 per frame; a HARD Bomber takes one more hit | **IC** |
| **d. Dodge** — Bomber | 30 → 36; 0 B state (the flash countdown is the dodge timer) | arena, `enemy_c_heavy_tick` | 0 (the binding row is a Raider row) | hit frame **+0**; each of the six flash frames **+35 → +42** per dodging member, +84 if both were hit | **IC**; **AN** the lane step and clamp already in `enemy_c_heavy_tick` |
| **d. Dodge during the hold** (decision 3c) | the rule itself 0 B; a braked Bomber has direction 0, so the dodge needs one: 8 → 10 | arena, same function | 0 | as the row above | **IC** — a finding of this pass: the decision's "0 B" covers keeping the hold, not choosing which way to dodge |
| Director publishes the Heavy wave's motion byte (hold row, hold time) | 8 → 10 | `DIRECTOR_RAM` | 0 | once per admission | **AN** `heavy_request` (72 B) |

**Totals.** `PICKUP_CODE` tail 50 B (65 → 15); arena **88 B** (114 → **26**);
`DIRECTOR_RAM` 10; state 3 B; **0 B in the initial block** — nothing is added
to `CODE` or `STARFIELD`, and `HEAVY_CODE` stays byte-neutral, which matters
because its record is full. Transport: the arena record takes ~79 packed B of
its 98 spare; record 2 (3 B spare) gains **one sector, +2 frames**, the same
sector M4's 12 B then ride in. Level data: one byte of the WaveDef the Heavy
waves do not use today (`wave_path`, `$FF` in every authored wave) can carry
the hold row and hold time — 0 B per level, no format change. That encoding is
a proposal, not a design.

**The binding row** (decision 3b: one Raider holds on every frame).

| Frame | Gates | Body copies saved | Net | Margin over GO after M3 (170) |
| --- | ---: | ---: | ---: | ---: |
| Every ELITE frame with two Raiders — **the case the cumulative table takes** | +98 | −350 | **−252** | **422** |
| A hold frame | +98 | −700 | **−602** | 772 |

The saving is an analogy, not a measurement: Option D was measured on Bombers.
If a held Raider saved nothing, the package would cost its 98 cycles of gates
and the margin after M3-H would be 72 over GO instead of 422. The M3-H session
must measure it before integration, as M3 measures its evaluator.

**The dodge against the hit path, the hit flash and the renderer.**

* **Hit path.** A non-lethal hit is the cheapest branch of
  `resolve_enemy_damage` (`src/main.s:5279`): `enemy_c_apply_pending_damage`
  subtracts the damage and returns 0, and the routine skips the erase, the
  break-up, the score and the sound. Nothing expensive happens on that frame
  today, and the dodge adds nothing to it: the Bomber notices the hit on its
  next tick, where `bomber_colour` already compares the HP with the last HP it
  saw.
* **Hit flash.** The flash is a colour byte C derives each tick and the veneer
  writes to `COLPM1`/`COLPM2`. Its six-frame countdown is in the member's
  `aux` byte; the dodge reads the same countdown, so it needs no state and
  ends with the flash.
* **Renderer.** `draw_enemy_member` writes `HPOSP1,x` on every live frame
  before it decides whether to copy the body (`src/main.s:4806-4819`). A
  sideways move changes X only, so it costs no renderer cycle, and Y is
  untouched, so the Option D skip stays valid and no `P1`/`P2` row is
  rewritten. The dodge must clamp X itself; the Bomber's lane clamp does that.
* **The one-expensive-event rule.** The dodge **stays inside it and needs no
  token.** It spawns nothing, installs nothing and writes no screen cell; it is
  ~42 cycles on six consecutive frames, not a burst. It also **may not be
  deferred**: a deferrable consumer has to be visual only (owner decision
  2026-09-21), and the dodge moves a collision target.
* **A hit during the stop-and-shoot hold** (decision 3c). The Bomber keeps its
  hold and its salvo, and dodges sideways on its row: Y does not change, so
  the hold's body-copy skip is kept as well. The "salvo aborted" alternative
  (+10 → 12 B) is not built.

**Hit points, about +10 %.** One HP is 25 % of a Bomber and 100 % of a Raider,
so +10 % has no exact integer form.

| Proposal | Raider E / M / H | Bomber E / M / H | Mean change | Status |
| --- | --- | --- | --- | --- |
| **P1** | 1 / 1 / 1 | 4 / 4 / **5** | Bomber +8 % across the three difficulties, +25 % on HARD | **DECIDED (3a)** |
| P2 | 1 / 1 / **2** | 4 / 4 / **5** | Raider +33 %, +100 % on HARD | **deferred to the M8 balance round as an option**, with the Raider dodge it makes reachable: 40 → 48 B in the `BROADSIDE` zero pin, 2 B state, +20 → 24 cycles on the binding row, +36 → 43 per dodging member. Not in the budget |
| P3 | a "+1 HP" bit per wave | the same | authored per level | not taken |

A 5-HP Bomber has one consequence, 0 B: the hull ramp is luminance = HP × 2,
so 5 HP is `$CA`, and the flash adds 6 — `$D0`, outside hue C. The
compile-time assert `bomber_hull_ramp_must_stay_inside_its_hue`
(`src/c/lifecycle.c`) refuses that, so **`BOMBER_FLASH_LUMA` drops from 6 to
4**, as the decision says. At 1 HP every hit kills a Raider, so item d is a
Bomber behaviour.

**What it moves besides bytes and cycles.** Slower Raiders change level 1 as
shipped: every default replay moves, the evidence is regenerated, and the kill
cadence — and with it the capsule cadence several native clauses arm on —
shifts, as it did at Director step 2 (Director plan §11 items 9–14).

### M4 — Campaign loop

| Item | Bytes | Lives in | Basis |
| --- | ---: | --- | --- |
| Level id, advance, call `sector_reader_load` (vector `$A003` exists) | 50 → 60 | window | **AN** `sector_reader_start_gameplay` (33 B) |
| Carry score, lives and booster state across `start_gameplay` | 45 → 54 | window, called from `director_c_init` | **IC**; `start_gameplay` calls `init_state` and then `DIRECTOR_INIT` before the HUD is drawn (`src/main.s:2584-2598`), so the C init can restore the carried values with no byte in MAIN |
| Lives rule (K): +1 after odd levels from 3 | 14 → 17 | window | **IC** |
| Campaign-complete message, back to the menu | 40 → 48 | window; text through the existing frontend text list | **AN** `game_over_screen_data` (68 B) |
| Level-complete trigger | 10 → 12 | `HYBRID_C_SECTOR` (`sector_c_complete_scroll_tick`) | **IC** |
| Level number on ENGAGING ENEMY SECTOR | 28 → 34 | sector reader | **IC** (two decimal digits and their stores) |
| Campaign variables | 6 | unowned RAM | **IC** |

**Totals.** Window 150 → **180 B** (+1 to 2 sectors); `HYBRID_C_SECTOR` 12
(record 2: inside the sector M3-H already added); sector reader 34 (fits: 42
spare, RAM tail 63 → 29). **+2 sectors, +4 frames.** Initial block **0** by the route
above; if a hook in the main loop proves unavoidable it is 6–10 packed B of the
31 (**G**). Cycles: nothing in a combat frame.

Game over and the return to the menu exist today (`STATE_GAME_OVER`,
`enter_game_over`). Every level transition costs one level read: 49 frames for
13 sectors in the emulator, unmeasured on hardware.

**Optional items, priced separately.**

| Option | Bytes | Transport | Note |
| --- | ---: | --- | --- |
| Level select (decision L) | 110 → 132, window | +1 sector | the menu code is in full segments; it needs a veneer into the window |
| H0 — a progress bar in the existing loader screen | 30 → 36, sector reader | 0 | the reader's RAM tail is then **−7 B**: one of the eight AI lines (304 B pool) has to go |
| H1 — a hangar picture as resident character art | 560 → 670, window (**G**) | +4 to 5 sectors, +8 to 10 frames | the reader already has a random line and an animation stepped per sector (`sector_reader_pick_line`, `sector_reader_animate`) |
| H2 — a hangar picture read from disk before the level | 70 → 84 code, window; 5 disk sectors | +1 sector | +19 frames per level load at 3.8 frames per sector (emulator) |

### M5 — Boss 4.7

Not designed here. Three plausible forms, priced so the owner can choose.

| | **B-A** static module boss | **B-B** boss that slides sideways | **B-C** boss with `P1`/`P2` gun turrets |
| --- | --- | --- | --- |
| Picture | character modules written into the playfield; no horizontal motion | the same, on rows with fine scroll (`HSCROL`) and their own screen memory, wider than the screen | B-A plus two moving guns drawn by the Heavy renderer |
| Controller (C): phases, cadence, module HP, weak points, win | 600 → 720 | same | +150 → 180 |
| Module draw and damage (ASM) | 220 → 264 | +70 → 84 | same as B-A |
| Shot-versus-module test | 60 → 72 | +10 cycles per shot for the scroll offset | same |
| Lasers | 200 → 240 | same | same |
| Sector glue, handoff, win | 60 → 72 | same | same |
| **Code total** | **1,140 → 1,368 B** | **1,210 → 1,452 B** | **1,290 → 1,548 B** |
| Per-level data | `boss_def` 62 B (reserved in the payload page) | + a 384-B row map: the image's three spare sectors | as B-A |
| DMA | **0** | **+72 cycles per boss row**: 6 rows +432, 10 rows +720 | 0 |
| Transport | +9 sectors, +18 frames | +9 to 10 sectors | +10 sectors |

Basis of the byte figures: **AN** — the controller sits between the Bomber's
handlers (545 B: movement, fire, colour, spawn for one archetype) and the whole
data-driven Director (1,173 B); module draw against `draw_hull_row` (191 B) and
`broadside_hits_opposite_hull` (124 B); lasers against `update_broadside`
(249 B) and the broadside missile erase/draw (~110 B). design-4.6 §5 says
300–500 B for the controller alone; the sector reader was estimated at 250–350 B
and measured 682 B (1,466 B with its display and texts), so the higher figure
is the one budgeted. The DMA figure is **IC**: with `HSCROL` enabled ANTIC
fetches 48 bytes instead of 40 on every scan line of the row, +8 on the
character line and +8 on each of the eight font lines.

**Lasers — two ways to draw them.**

| | Laser as a full-height **missile** column | Laser as **character** cells |
| --- | --- | --- |
| Draw | the missile plane is filled below the gun during the two-second telegraph, a few rows per frame; firing is one `HPOSM` write | up to 27 rows × ~35 cycles with backing saved |
| Cost per frame | ~50 while heating, ~6 while firing (**IC**) | ~950 on the draw frame and again on the erase frame, per laser (**IC**) |
| "Destroys everything in its path" | a column compare against the player, five shots and two entities: ~150 (**IC**) | the same |
| DMA | 0 — missile DMA is already on | 0 |
| PMG and colour | one missile per laser: 1 / 2 / 4 lasers use up to all four missiles. With `PRIOR` `$10` all four take `COLPF3`, the hostile red; that mode has been free since the capsule moved to `P3` | none |
| Limit | four lasers is the hardware maximum; the Nova Missile pickup must stay on `P3` | four lasers on one frame is +3,800 unless serialised by the token |

**Decided 2026-10-01: no Heavy in a boss sector. Lights are allowed only if
the budget leaves room.** The figures below answer the second half for form
B-A.

**Cycles in a boss frame.** Steady cost of B-A: controller tick 200 → 240
(**AN** one Light's whole update, 257 mean), shot-versus-module test 90 → 108
(**IC**, five shots), missile lasers ~100 each (250–400 for four, staggered):
**450 with one laser, 550 with two, 750 with four**; +200 on a
module-destroyed frame, deferrable through the token. Against it, the boss
sector does not run the Raider pair that is in today's binding frame
(1,467–1,585, **M**; 1,500 taken), and with no Light it does not run the
Interceptor either (257, **M**).

So a B-A boss frame with no Light starts from 785 + 1,500 + 257 = 2,542 and
pays the boss and M6's +48. Each Light then costs **257** standing on its own
movement (**M**), **372** on a path (M3's +115), and **+150** more on a frame
in which it fires (**M**, `light_update` 515 → 662, design-4.6 §8); the token
lets one Light fire per frame. A Light's break-up is a **1,063-cycle** burst
(**M**, `light_spawn_breakup`), a deferrable token consumer that is kept off
ring-rotate frames but forced on its second attempt.

| B-A boss frame, fence margin (GO ≥ 500) | 1 laser (levels 1–4) | 2 lasers (5–8) | 4 lasers (9–12) | DMA-on maximum, 4 lasers |
| --- | ---: | ---: | ---: | ---: |
| **0 Lights** | 2,044 | 1,944 | **1,744** | ~30,200 |
| **1 Light**, own movement | 1,787 | 1,687 | 1,487 | ~30,400 |
| **1 Light**, on a path, firing | 1,522 | 1,422 | **1,222** | ~30,700 |
| 1 Light, its break-up forced onto a rotate frame | 981 | 881 | **681** | ~31,200 |
| **2 Lights**, own movement | 1,530 | 1,430 | 1,230 | ~30,700 |
| **2 Lights**, both on paths, one firing | 1,150 | 1,050 | **850** | ~31,100 |
| 2 Lights, one break-up forced onto a rotate frame, the other Light on a path and firing | 459 | 359 | **159 — under GO** | ~31,750 |

**Finding.** Zero Lights and one Light clear GO in every case, the worst by
181 cycles. **Two Lights clear GO in steady state (≥ 850) but not on the frame
where a Light break-up is forced onto a ring-rotate frame (159–459)**, at any
laser count. That frame is reachable when the other Light's fire has taken the
token first. Two Lights therefore need the projectile-pool lever (574–729,
§4.2) or a boss that does not scroll the ring: a boss sector with the world
scroll stopped returns `rotate_playfield_rows` (1,545–1,614, MAN) on every
frame and clears GO with two Lights. That is a property of the boss design,
which is not settled. **Decided (5a, 2026-10-01): one Light in a boss sector
at most.** Two are out unless a later plan buys them with the pool lever or a
non-scrolling boss. The ceiling costs 0 B (a row of the subtype ceiling
table).

For the other two forms, with no Light:

| Boss-frame result (with M6's +48) | Fence margin | DMA-on maximum |
| --- | ---: | ---: |
| B-B, 6–10 scrolled rows | 960 … 1,550 | up to ~30,900 |
| B-C (the Heavy renderer keeps its cost; nothing is returned) | **−13 … 289 — under GO** | up to ~31,900 |

So the boss is affordable **because it replaces the Heavy pair, not because it
is cheap** — which is what the owner's decision secures. A boss built on
`P1`/`P2` (B-C) still needs the projectile-pool lever before it clears GO.

A boss palette of its own would need a third DLI: +62 … +180 cycles per frame
(**M** bodies 48 and 77 plus 14, MAN) and a change to the art rule that
gameplay adds no DLI for a local colour.

`chore/contact-scenario-redesign` is scheduled before M5. It is harness and
replay work: no runtime byte, no cycle.

### M6 — Boosters (scope not defined)

| | **K1** permanent weapon level 0–5 (decisions N, U) | **K2** another timed booster that adds no shots (e.g. piercing) | **K3** a booster that adds shots in flight |
| --- | --- | --- | --- |
| Bytes | 150 → 180, window: level variable, damage, per-level sound parameters, death costs one level, the fifth bolt look generated at run time | 80 → 96 per type: 16-B capsule shape, HUD pattern, table rows, effect code | — |
| Hooks in initial-block segments | 10 → 12 packed B (damage operand, look select) | 6 → 8 | — |
| Cycles on the binding row | +8 per player shot → **+48** (**IC**) | 0 … 100 (design-4.6 §5) | **+574 … 729 per extra shot (M)** |
| Colour | a second capsule colour is free: `COLPM3` is the capsule's alone and only one capsule exists at a time (~6 B) | same | same |
| Verdict | fits | fits, one type | **does not fit**: the whole margin above GO is 285 |

Basis for K1: **AN** the Shield booster's own code and tables, plus **IC** for
the hooks. Drawing the fifth look from glyph data instead (72 B of `RODATA`)
would cost about 50 packed B of the initial block and does not fit.

The budget takes K1. Decision J's damage scaling shares K1's damage variable;
built with it, it is about 40 → 48 B more in the window and 3 B of hook.

### M7 — Content: twelve levels

Resident bytes in the planned case: **0**. Disk: 156 sectors at 13 per level,
192 at 16; both fit the 400 sectors from 320.

| Open question | What the repo says | Cost |
| --- | --- | --- |
| Region and steel mapping | stale against AC (§0.2 item 3) | 0 resident bytes either way; `LEVEL_MAX_ID` → 12 changes the reader and regenerates the evidence, a build-only constant does not |
| A second gun station per side in R2–R4 | `CAPITAL_HULL_TURRET_COUNT` sizes the muzzles tracked on screen: 2 today (MAN `capitalHulls.turretCount`) | 16 B of state (`ENTITY_STATE` has ~32), 0 → 48 B of code in the `BROADSIDE` pin, **+150 … 360 cycles on capital frames** (**G**, against `advance_tracked_muzzles`, 85 B): 30,568 → ~30,930, under the target. More shells in flight is a separate cost: the pool is 3 slots, 2 active, on `M1`–`M3` |
| "Raider horde" | `P1`/`P2` are the only Heavy players; a third Heavy is excluded by the invariant (design-4.6 §9) | three compliant readings: back-to-back formations (data, 0 B); Raider-looking re-skinned Lights, three at once (M2 data); SWARM ceiling 3 → 4 (a table value; +257 per Light on swarm frames with ≥ 5,931 of margin; measured in the M2 evidence run, never shipped — owner decision 23 §10.7) |
| Is `LEVEL_BUFFER` 16 enough for the longest level? | the buffer is not what binds. **The core page holds 20 waves and level 1 uses all 20**, level 2 19 | a second WaveDef page: +2 sectors per level (13 → 15 of 16) and 40 → 48 B in the Director. With boss form B-B's row map (3 sectors) the image would need 18 |
| Alternation inside a wave | backlog "mixed wave" bit (Director plan §11 item 8) | 25 → 30 B, Director |
| Hull lengths, styles R1–R4, steel `$84` | level data since steps 2 and 4 | 0 |

**Cycles.** Content is not free in cycles even with no code: re-authoring
level 1 moved the worst margin 991 → 727 through a new load coincidence
(Director plan §11 item 10). Each authored level has to be measured through the
debug route (`--artifacts=build/level-N-s0`, diagnostic only) as level 2 was.
The default evidence carries level 1 only.

### M8 — Balance on hardware

Data only: 0 bytes, 0 sectors. Three things in it are budget, not just feel:
the player PairShot pool size and fire rate (the largest cycle lever, §4),
decision J if it was not built with M6, and the option the owner deferred here
on 2026-10-01: **hit points P2 (Raider 1 / 1 / 2) with the Raider dodge** —
40 → 48 B in the `BROADSIDE` zero pin (8 B of it would remain), 2 B of state,
+24 cycles on the binding row (374 → 350 over GO) and +43 per dodging Raider.
It is code, not data, and is not in the cumulative table.

### M9 — Release candidate

No runtime resource. A new splash silhouette changes the packed loader bitmap
(1,967 B, inside the initial block) by an amount that depends on the drawing
and is measured per preview (STATUS backlog). The follow-ups
`chore/cycle-model-pairshot` (the stale JS cycle model, recorded test D10) and
`chore/preview-29-rows` touch scripts and media only. (2026-10-02:
`chore/showcase-recapture` left this list — it was done by the showcase task,
[showcase-atr.md](showcase-atr.md).)

### Not in the M2–M9 list, but decided or planned

Level select (L), the loader's AI lines (O; eight lines, 304 B, exist), the end
screen animation (P), the permanent booster (N, U), Nova Missile, capital
geometry 4.8a (`hull_params`, 32 B reserved). Each is priced above where it has
a price, or needs a scope decision (§5).

---

## 3. Cumulative table

Budgeted figures (+20 %), planned variants: M2 = S2 + nebula in SWARM only;
M3 = V1; M3-H = the Heavy package as decided (hit points P1, the descent rate
per archetype with the members on alternate frames, the hold kept on a hit);
M4 = core; M5 = B-A with missile lasers, no Heavy and at most one Light in the
boss sector; M6 = K1; M7 = data only. The M3-H figures in the two cycle
columns rest on the body-copy saving of §2 M3-H, which is an analogy until the
M3-H session measures it.

| | Window B | Menu frames | Initial block B | Fence margin over GO (ELITE row) | DMA to hard gate | `DIRECTOR_RAM` B | Arena B | Level image sectors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Today** | 1,593 | 57 | 31 | 285 | 1,447 | 43 | 114 | 3 |
| M2 | −108 → 1,485 | −2 → 55 | 0 → 31 | 0 → 285 | 0 → 1,447 | −20 → 23 | 0 → 114 | 0 → 3 |
| M3 | −472 → 1,013 | −6 → 49 | 0 → 31 | −115 → 170 | −115 → 1,332 | −12 → 11 | 0 → 114 | 0 → 3 |
| **M3-H** | 0 → 1,013 | −2 → 47 | 0 → 31 | +252 → **422** | +252 → 1,584 | −10 → 1 | −88 → **26** | 0 → 3 |
| M4 | −180 → 833 | −4 → 43 | 0 → 31 | 0 → 422 | 0 → 1,584 | 0 → 1 | 0 → 26 | 0 → 3 |
| M5 | −1,368 → **−535** | −18 → 25 | −12 → 19 | 0 → 422 (boss frames with one Light: 181+ over GO) | 0 → 1,584 | −18 → **−17** | 0 → 26 | 0 → 3 |
| M6 | −180 → −715 | −4 → 21 | −12 → 7 | −48 → **374** | −48 → 1,536 | 0 | 0 → 26 | 0 → 3 |
| M7 | 0 → −715 | 0 → 21 | 0 → 7 | content: unknown | — | 0 | 0 | 0 → 3 |
| M8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| M9 | 0 | 0 | splash: unmeasured | 0 | 0 | 0 | 0 | 0 |

Disk: M7 takes 156 of the 512 free sectors (192 at 16 sectors per level).
`PICKUP_CODE`'s tail goes 65 → 15 B at M3-H.

**First milestone where each resource goes negative.**

| Resource | Planned variants | With the costlier variants |
| --- | --- | --- |
| `$AE00` window | **M5**, by 535 B (by 199 B on expected figures, before the 20 %) | M5, by 620–715 B (B-B, B-C) |
| `DIRECTOR_RAM` | **M5**, by 17 B — it overflows into the window by design (Director plan §3.3), at 3 B per veneer | M3-H if the package needs more than 11 B there |
| Fence margin (GO ≥ 500) | never; ends at **374** over GO | never in the listed variants: nebula in ELITE leaves 249, a content coincidence the size of level 1's (−264) leaves 110, the deferred Raider dodge 350. **M7, if the body-copy saving measures at zero**: the package then costs +98, the margin ends 24 over GO, and one −264 coincidence takes it under |
| Boss frames (GO ≥ 500) | never: one Light at most (decided), worst frame 681 | — (two Lights are out of the plan: 159–459 on a forced break-up frame) |
| `HYBRID_C_ARENA` (114 B) | never; **26 B** left after M3-H | M3-H if the package's C slips by more than 26 B; decision 19's lever (98 B) no longer fits |
| `PICKUP_CODE` tail (65 B) | never; 15 B left after M3-H | — |
| DMA-on, hard gate | never; ends at 1,536 | never (1,186 if the body-copy saving measures at zero) |
| DMA-on, 31,200 target | **M3**, by 36 (79 today, −115); back to +216 at M3-H, which is built in the same step; ends +168 | M2 with nebula in ELITE; stays negative from M3 if the saving measures at zero |
| Initial block (STOP) | never; ends at **7 B** | **M6**: a main-loop hook at M4 (−10), a twelfth DFMC record (−16) or the fifth bolt look as glyph data (−50) |
| ATR menu (≤ +7) | never; the 596 baseline is kept until 1.0 (decided); ends at 21 frames, 9–11 with level select and the H1 hangar | — (the re-recording at the release candidate is after the last transport change) |
| Extension record 5 (`HYBRID_C_EXT`, 0 B) | M2 if `light_pair_for_record` grows by one byte: +1 sector | — |
| Extension record 2 (3 B) | M4: +1 sector, already counted | — |
| Sector reader RAM (63 B) | never (29 left) | M4 with the progress bar: −7 B |
| Level image (3 sectors) | never | **M7**: boss row map (3) + second WaveDef page (2) = 5 |
| DFMC records (0) | never — every item grows an existing record | the first new landing zone |
| State RAM (27 unowned + ~32 `ENTITY_STATE` + 84 zero page) | never: M3 8, M3-H 3, M4 6, M5 ~40, M6 2 | — |
| `BROADSIDE` zero pin (136 B) | never: the nebula takes 80, 56 B left | 8 B left if M8 takes the deferred Raider dodge (48) |
| Missiles in a boss sector (4) | never: four lasers on levels 9–12 use exactly four | a fifth laser, or a missile-drawn pickup |
| ATR disk | never | never |

---

## 4. Levers

Risk: 1 = a decision or a data edit; 2 = a contained code change with evidence
regenerated; 3 = a layout change; 4 = boot-path or MAIN-layout work; 5 = rests
on a fact measured only in the emulator.

### 4.1 Bytes — ordered by bytes per unit of risk

| # | Lever | Buys | Costs and side effects | Risk | Basis |
| ---: | --- | --- | --- | ---: | --- |
| 1 | **Keep the 596-frame menu baseline** — **TAKEN (owner, 2026-10-01)**: kept until 1.0, re-recorded at the release candidate | 57 frames ≈ 28 sectors ≈ 3.5 KB packed of extension growth | none; the baseline then describes a slower boot than the game has | 1 | **M** |
| 2 | `LEVEL_BUFFER` 16 → 14 sectors | +256 B window | only if neither the boss row map nor a second WaveDef page is wanted; four constants, as decision X twice | 2 | **M** (128 B per sector) |
| 3 | The 136 B of zero pins in `BROADSIDE` as a code or data home | 136 B of RAM in an extension record (109 packed B spare in record 1); **56 B** once the nebula has its 80, 8 B if M8 takes the deferred Raider dodge | none on addresses — the pins exist so that no label moves | 2 | **M** |
| 4 | `STARFIELD` run tail `$5CDB-$5E0F` as a landing zone, by starting record 1 lower | 309 B | a build and cfg change; the staging windows around it are measured to the byte (manifest `starfieldRuntime`) | 3 | **M** size, **G** feasibility |
| 5 | ~~Decision 19: `sector_c_update_capital_phase` → arena~~ | +1 menu frame, 98 B free in `HYBRID_C_SECTOR` | **no longer available once M3-H is built**: it needs 98 B of arena and the Heavy package leaves 26 | 2 | **M** (Director plan §11 item 19) |
| 6 | `LEVEL_MAX_ID` 16 → 12 | 12 B in the sector reader (tail 63 → 75); fixes the region mapping | **0 B in the initial block**; needs the owner to change a decision; evidence and boot baseline recomputed | 2 | **M** |
| 7 | Shorten the AI line pool (8 lines, 304 B) | 38 B per line, sector reader | less variety on the loader | 1 | **M** |
| 8 | Black loading screen instead of blue | 6 B, initial block | visible: no blue during stage 2 | 1 | **M** (STATUS boot-loading-blank-screen) |
| 9 | Hull-block pad (104 B) and music-block free space (120 B) in every level image | 224 B of per-level data without a new sector | data only; the hull block's addresses are frozen | 2 | **M** |
| 10 | The splash blob's RAM `$0500-$06FF` after the hold | 512 B | nothing can land there during boot: needs a copy after the splash | 4 | **M** size, **G** feasibility |
| 11 | Menu music (867 B raw) and frontend tables (~550 B raw) out of the initial block into an extension record | ~600–1,000 packed B of initial block | +6 to 9 extension sectors (+12 to 18 frames); moves `STARFIELD` and `RODATA` addresses that tests and fixed ABI slots pin | 4 | **M** sizes (MAN `menuMusic`, LBL), **G** packed gain |
| 12 | Pack `A2_KERNEL` and the splash blob | 77 B gross (38 + 39); **10–57 B net** of the decoder call | a decoder where none runs at boot; the boot smoke has had zero margin before | 4 | **M** gross (STATUS backlog); **AN** `unpack_loader_bitmap`, 46 B |
| 13 | A simpler splash silhouette (M9's optional item, pulled forward) | unmeasured; every byte is an initial-block byte and the decoder already runs | owner chooses the shape from previews | 2 | **G** |
| 14 | A twelfth DFMC record | a new landing zone | −16 B of initial block | 3 | **M** |
| 15 | The OS screen RAM `$BC20-$BFFF` | 992 B | the measurement behind it is Atari800-only (technical-debt item 4); the `$BC1A` guard exists to keep the build out of it | 5 | **M** size, **G** safety |

No dead code was found beyond the pins. The XEX reclaim audit found none
(`docs/plans/boot-xex-reclaim.md`), and the provisional schedulers are already
retired (test T10). The named zero pins in `src/main.s` total at least 213 B
(`LOADER_SPLASH_CODE_SLACK` 57, `hull_sequence_reserve` 120, codebook 16,
launch-flash pad 14, two 3-B pads); those in MAIN give RAM but no transport
relief, because a zero byte costs almost nothing packed and a code byte does.

**What pays the Heavy package (M3-H), and the dodge in particular.** Bytes: no
numbered lever is needed. Its C (88 B, of which the committed Bomber dodge is
46 with its direction choice) is paid from **the arena's 114 free bytes**, and
its ASM (50 B) from **`PICKUP_CODE`'s 65-B tail**. The price is what those
bytes were held for: lever 5 (decision 19) is withdrawn, and the arena can add
only its last 26 B to the window. Cycles: the dodge's 42 per member on six
frames after a hit, and the package's 98 of gates on the binding row, are paid
by **the package's own slower descent, set per archetype with the members on
alternate frames — decided on 2026-10-01** (cycle row 1 below). No other
lever is called on. If the M3-H session measures the body-copy saving below
the 98 cycles of gates, the payer becomes cycle lever 4, the PairShot pool.

**What pays the window.** M5's 535 B: levers 2 + 4 give 565 B at risk 2–3;
what is left of lever 3 (56 B) and of the arena (26 B) brings it to 647 B.
M6's further 180 B (715 B in all) needs lever 10 as well. Before the Heavy
package the arena and the whole pin could have covered that; they are now
largely spent.

### 4.2 Cycles — ordered by cycles per unit of risk

| # | Lever | Buys | Costs and side effects | Risk | Basis |
| ---: | --- | --- | --- | ---: | --- |
| 1 | **Heavy descent slowed per archetype, the two members on alternate frames** — **TAKEN (decision 3b, 2026-10-01)**; it is in the cumulative table | **~350 on every ELITE frame**, the binding row included; 700 on hold frames | no full-speed Heavy wave can be authored; the Raider's crossing covers half the height; level 1 changes and its replays are re-scripted | 2 | **AN** Option D, MEASURED +998 with two Bombers; to be measured for Raiders at M3-H |
| 2 | Nebula in SWARM sectors only | 125 cycles not spent on the binding row | one validator rule; ELITE sectors keep today's sky | 1 | **IC** |
| 3 | Boss sector with no Heavy and at most one Light — **TAKEN (2026-10-01, decision 5a)** | ~1,500 cycles returned to boss frames; one Light keeps the worst boss frame 181 over GO | no Heavy escort in a boss fight | 1 | **M** |
| 4 | Player PairShot pool 5 → 4 | **574–729 on the worst frame** | visibly thinner fire; a feel decision that belongs to M8 | 2 | **M** (STATUS backlog) |
| 5 | New visual bursts as deferrable token consumers (module destroyed, laser fill) | moves 200–950-cycle bursts off binding frames | each consumer must be visual only, capture its position, and be forced within two frames (owner decision 2026-09-21) | 2 | **M** for the mechanism |
| 6 | Lasers as missiles rather than characters | ~900 cycles per laser event | one colour for all lasers; uses all four missiles at four lasers | 2 | **IC** |
| 7 | Fire rate −25 % | 450–1,050 on an average frame, **nothing on the worst** | feel; does not bound the pool | 2 | **M** |

---

## 5. Risks and decisions

### 5.1 The three biggest budget risks

1. **The boss's size.** It is the only item that takes the window negative, and
   its estimate has the widest error: design-4.6 said 300–500 B for the
   controller, the last comparable estimate (the sector reader) came in at 2 to
   4 times its figure, and this document budgets 1,368 B on analogies. Every
   100 B over is another sector and two more menu frames. Until the boss has a
   plan with a prototype measurement, M5's line is a range, not a number.
2. **285 cycles on one ELITE frame family, shared by everything.** The nebula,
   Light paths, the Heavy package and the booster's look select all spend the
   same 285, and authored content can spend it with no code at all (−264 once
   already). The plan ends 374 over GO only because the Heavy package's slower
   descent returns about 350 per frame — a held Raider skips its body copy.
   That is an analogy to Option D and is not measured for Raiders. If it
   measured at zero the margin would end 24 over GO, which one content
   coincidence removes. Half that frame is the player's own shots, so the only
   other large lever is the pool size — a change the player sees.
3. **31 B of initial block with no cheap refill.** `MAIN` is full, the DFMC
   table is full, two extension records are full, and the brief's 12-B lever
   lands elsewhere. The plan stays inside the 31 only by routing every new
   byte through C in the window and by never touching `CODE`, `RODATA`,
   `STARFIELD` or `ENTITY_CODE` beyond ~24 B of hooks. One feature that needs
   real code in those segments forces lever 11, 12 or 13.

Outside the budget but able to move it: every load-time figure is
emulator-measured (technical-debt items 2 and 5). A campaign adds eleven level
reads the player waits through.

### 5.2 Owner decisions, each with the latest milestone

| # | Decision | Latest | Why it cannot wait longer |
| ---: | --- | --- | --- |
| 1 | ~~Keep the 596-frame menu baseline until 1.0~~ | **TAKEN 2026-10-01** | kept; re-recorded at the release candidate (§5.3) |
| 2 | The sky: S1, S2 or S3; whether a nebula may appear in ELITE sectors | **M2** | 125 cycles of the margin; and a nebula hides transients behind it |
| 3 | The per-frame budget of step 6 (Light paths) | **M3** | +115 per Light on a path on the binding row |
| 3a | ~~Hit point rule~~ | **TAKEN 2026-10-01** | P1: Raider 1 / 1 / 1, Bomber 4 / 4 / 5 (§5.3) |
| 3b | ~~Heavy descent rate~~ | **TAKEN 2026-10-01** | per archetype, the two members on alternate frames (§5.3) |
| 3c | ~~A hit during the stop-and-shoot hold~~ | **TAKEN 2026-10-01** | the hold is kept; the Bomber dodges sideways on its row (§5.3) |
| 4 | Campaign loop scope: level select (L) in 1.0 or not; hangar picture, progress bar or today's animation (decision O); what the campaign-complete screen is | **M4** | 132 + 36 … 670 B and up to 10 frames |
| 5 | Boss, the part still open: its form (static, sliding or with PMG turrets); lasers as missiles in one colour; whether a third DLI is allowed; whether Nova Missile is in 1.0 | **before the M5 plan** | decides the boss's size and whether B-B or B-C clear GO |
| 5a | ~~Lights in a boss sector~~ | **TAKEN 2026-10-01** | one at most (§5.3) |
| 6 | Which lever pays the window's ~535 B (§4.1 levers 2 and 4; the arena and most of the pin are spent by M3-H and the nebula) | **before the M5 plan** | the boss has no home without one |
| 7 | Booster scope: K1 (permanent level, decisions N and U), a K2 type, or both; K3 is not affordable. When decision J's damage scaling is built | **M6** | fixes the last ~12 B of initial-block hooks |
| 8 | The region and steel mapping: `LEVEL_MAX_ID` → 12 (changes the standing decision) or a build-only constant | **M7**, first level of region R2 | today's build never uses style R4 in twelve levels |
| 9 | A second gun station per side in R2–R4, and whether more shells may be in flight | **M7** | +150 … 360 cycles on capital frames; more shells is a PMG question |
| 10 | What "Raider horde" means: back-to-back formations, re-skinned Lights, or SWARM ceiling 4 | **M7** | the Heavy limit cannot rise |
| 11 | Levels longer than 20 waves: a second WaveDef page (15 of 16 sectors) or not; `LEVEL_BUFFER` 16 or 18 if the boss also needs a row map | **M7**, and before M5 if the boss is B-B | the level image goes negative with both |
| 12 | Turret density steps 0–2, the debris count and `pickupPolicy`: defined and read, or removed from the authoring vocabulary | **M7** | authors can write values the runtime ignores |
| 13 | Capital geometry 4.8a: in 1.0 or after | **M7** | not in the roadmap list; `hull_params` is reserved |
| 14 | Player PairShot pool size and fire rate as a budget lever | **M8** | the only large cycle lever |
| 14a | The option deferred from M3-H: hit points P2 (Raider 1 / 1 / 2) with the Raider dodge | **M8** | 48 B of the `BROADSIDE` pin's 56, +24 cycles on the binding row; it is code, so it cannot be decided later than the balance round |
| 15 | Allied steel on levels 7–12: `$84` or `$86` | **M8** | open since AC |
| 16 | A new splash silhouette, and whether it is used to refill the initial block | **M9**, earlier if the initial block runs out | the only low-risk initial-block lever of unknown size |

### 5.3 Decisions taken on this document (owner, 2026-10-01)

| Decision | Recorded as | Where it is priced |
| --- | --- | --- |
| **No Heavy in a boss sector.** Lights are allowed only if the budget leaves room | answers part of §5.2 item 5 | §2 M5 |
| **Heavy behaviour package for 1.0**: (a) slower flight as a data value per archetype or per wave; (b) a stop-and-shoot phase driven by wave data, with no per-frame decision logic; (c) about +10 % hit points; (d) a sideways dodge when hit — **committed, not optional** | its own budget line **M3-H**, built with M3 | §2 M3-H |
| **Out of scope for 1.0**: backward flight and aimed shots for Heavies | not priced; M3's variant V2 is withdrawn | — |
| **Decision 1 — the 596-frame menu baseline is kept until 1.0** and re-recorded at the release candidate | the 57 frames under the STOP rule are the transport budget of M2–M7; §4.1 lever 1 is taken | §1.2, §3 |
| **3a — hit points P1**: Raider 1 / 1 / 1, Bomber 4 / 4 / 5 (EASY / MEDIUM / HARD), with `BOMBER_FLASH_LUMA` lowered from 6 to 4. The dodge is therefore a Bomber behaviour. **The Raider dodge and P2 are deferred to the M8 balance round as an option** (48 B, +24 cycles) and are not budgeted | 17 B in the arena; the option is §5.2 item 14a | §2 M3-H, §2 M8 |
| **3b — the descent rate is set per archetype, the two members on alternate frames.** The cumulative table and the first-negative rows use this case | the binding row gains ~252 at M3-H and the margin ends 374 over GO; no full-speed Heavy wave is authorable; §4.2 lever 1 is taken | §2 M3-H, §3 |
| **3c — a hit during the hold keeps the hold**; the Bomber dodges sideways and keeps its row | 0 B for the rule. Finding: a braked Bomber has no direction, so the dodge needs 8 → 10 B to choose one; it is in the arena total of 88 B | §2 M3-H |
| **5a — one Light in a boss sector at most.** Two are out unless a later plan buys them with the pool lever or a non-scrolling boss | the worst boss frame stays 181 over GO; §4.2 lever 3 is taken | §2 M5 |

---

## 6. What this document did not do

No source, cfg, build-script or harness change; no build, no probe build, no
evidence regeneration; no baseline worktree. The boss, the boosters, the wave
paths and the Heavy package are not designed here — each is given as priced
variants or items and the decisions they need. Every figure marked **IC**, **AN** or **G** is
an estimate and is to be replaced by a measurement in the session that plans
its milestone.
