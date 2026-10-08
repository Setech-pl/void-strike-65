# Plan — gameplay variety before the systems freeze (plan-gameplay-variety)

**PLANNING session, 2026-10-08. `OWNER REVIEW CANDIDATE`.** Branch
`docs/plan-gameplay-variety` from `main` `13c61e6`. **Nothing here is
implemented; this document is the deliverable.** **Amended the same day with
the owner's answers to §7 (recorded in §7.1 and applied throughout: order B
adopted, the attract mode as a menu-phase overlay, the torpedo's reserve and
the 260-frame measured bound, per-region boss overlays as an S5 Phase A
requirement, the life capsule drawn rarely at random) and with the resident
constant-data inventory the owner asked for (§8, measured by the committed
`scripts/measure-resident-data.mjs`).** No source, cfg, build
script, level, harness, scenario, clause, evidence, `dist/` or `docs/media/`
byte changed, and no build was run. The ATR and the boot image are `main`'s
(§0.1). One reusable measurement script is committed with it:
`scripts/measure-dead-time.mjs` (§2.1); it reads the committed trace CSVs
and affects no build.

Why: the owner played level 1 after W2 and found it works but is not varied
enough. Before the systems freeze after M6 the owner wants nine items priced
and placed (§3), accepting that not everything must be done. The binding
resource is the resident `$AE00` window; this plan prices every item against
it, the boss overlay slots, the initial block and the worst PAL rows, in the
current milestone order and in the alternative order the owner asked about
(§4), and proposes the order of sessions to the freeze (§5). It runs before
S5 (boss regions 2–4) because the proton torpedo and S5 compete for the same
boss overlay slots (§3.5, §4.4).

**Labels.** **M** measured (method named), **IC** instruction count from the
source, **AN** analogy to a named routine, **G** guess. Estimates are written
`expected → budgeted`: a budgeted figure adds 20 % to an **IC** or **AN** and
**doubles** a **G** (this project's code estimates have come out 2–3× low, so
a plain guess is multiplied before the reserve). Measured figures carry no
margin. Window C packs at 0.78, ASM at 0.89 (m3-waves-heavy §0.4).

**The short answer.**

* **Dead time is real and it is the sector tails.** On the committed
  `director-complete-*` replays (the natural-sweep bot, lives held)
  **54–61 % of level 1's post-capital space-sector frames have no enemy
  live** — 1,265 / 1,359 / 1,759 frames on HARD / MEDIUM / EASY — and
  **86–90 % of that is the tail** of a sector that ends on its row count long
  after its one wave is dead (22.7 / 24.1 / 30.3 s per level). The W2 reserves
  are about a fifth of the tails; the Heavy retry cadence and the one lead-in
  row account for the rest. The hunt bot, which dies more, sees 25–27 %. **M**,
  §2.1.
* **The cheapest, largest win is a Director sector-flow session**: C1 (already
  a prerequisite of M4) plus reading `afterCleared` plus ending a space sector
  early when its waves are spent and the field is clear. About
  **20 → 24 B of `DIRECTOR_RAM`** (35 free) and **110 → 140 B of window**, no
  initial-block byte, ~40 → 60 native cycles on world-row ticks only
  (≈ 90 → 130 of fence margin on the binding row, which is a row tick).
  It lets the data drop both W2 reserves (100 rows) and lets level 1 refill
  the time with chained waves instead of empty rows. **Recommended first,
  before S5** (§3.8, §5).
* **Chained Light waves cost 0 B of code** — a Light wave already holds the
  cursor until its last Light is gone, and the measured gap between two Light
  waves is 1–2 frames — but "each with a different envelope" is M3's path
  evaluator (357 B window, **M** prototype). Form B of m3-waves-heavy §2.1 is
  the most envelopes per byte: sine, snake, arc, loop, mirror and salvos are
  all four-segment records of 12 B in the level payload's existing 96-B path
  block (§3.1, §3.2).
* **Raider variety is M3-H as planned plus one small data lever**: a per-wave
  weapon profile (single / burst / double) is ~30 → 40 B of window C and ~40
  native cycles on the spawn frame; per-level shot looks already exist (the
  payload's two weapon looks). **The half-aimed shot is not recommended**: it
  touches the hostile shot publication (initial block), needs a previous-X
  array, and costs 130–330 of margin on dense rows (§3.3).
* **Bombers**: holes (M3-H variant C, 114 B window ASM + 40 B pin + 32 B RAM,
  0 cycles a frame) **and** a lifted luminance ramp (3 B of arena) so a 1-HP
  Bomber reads at luminance 4 instead of 2. Recommended both (§3.4).
* **The proton torpedo fits on expected figures and not on budgeted ones**:
  ~200 → 400 B of boss overlay room (slot E has 310 B free and must also house
  S5's per-region look table, ~110 B), ~60 → 90 B of window, one 16-B capsule
  silhouette, and **+2 to +3 sectors at the boss entry, which breaks the
  250-host-frame bound S5 must keep** (245 today). It needs an owner decision
  on the reserve and on the bound before S5 (§3.5, Q6).
* **Eight lives fit the HUD as it is**: `LIFE n` is one digit cell
  (`src/main.s:8229`); no display change. The +1 life and hull-restore
  capsules are two new capsule types: ~100 → 130 B of window once the
  silhouette table leaves the initial block (−48 B there), 0 cycles on any
  frame but a collection (§3.6, §3.7).
* **Capital-sector content**: nacelles are cheaper than item 20 priced them
  (the per-row collision boundaries already exist), but every capital-phase
  byte now needs room that slot A no longer has (6 B free) — the capital
  group's resident half (~1,750 B of `BROADSIDE`) as a second overlay slot is
  the lever for both the capital items and the boss. A Light in a capital
  sector is cycle-cheap on today's capital rows (≤ 18,374 wall, **M**) but
  still needs the raster-critical publication proof. All three: **later**
  (§3.9).
* **The window ends the road short in either order.** With the attract mode
  as a menu-phase overlay (owner, 2026-10-08: 0 window bytes during play)
  every recommended item (this plan's plus M4, M3, M3-H, M6) needs
  **1,788 → 2,045 B against 1,185 free**; the four known levers give 537, so
  the road ends **−66 expected / −323 budgeted**; the M3 cuts (195) or the
  low-RAM fighter overlay (`$1900-$1FFF`, 1,792 B, risk 3–4) cover the rest.
  The order the owner adopted (B: M3 + M3-H before M4) puts the lever session
  after M3 (§4.1, §5).
* **Resident constant data is 6,230 B, 4,700 of them in the initial block**
  (35 % of its 13,618 B; the packed loader bitmap alone 1,967). The three
  levers the owner asked for return, in order of size: a **menu-phase overlay
  of the menu's data ≈ 1,200 B of initial block** (AN from measured raw
  sizes), **LZSS-packing the boot-read-once glyph sources ≈ 200–400 B** (G;
  the decoder exists), and **one measured duplicate, 96 B of `BROADSIDE`**
  (the two sector-module source tables are identical). None returns window
  bytes directly; the capital-phase tables (662 B of resident `BROADSIDE`)
  return resident RAM only with the second capital slot (§8).

---

## 0. Step 0, baseline, conventions

### 0.1 Step 0 record

| | |
| --- | --- |
| `main` | `13c61e6 docs(w2-lights): implemented, pending the owner's smoke …`; tree clean |
| W2 | `docs/plans/w2-lights.md` line 3: "Status: implemented, pending the owner's smoke" — present on `main` |
| worktrees | one: `/Users/marcinkrzetowski/Projects/dark-fighter` |
| ATR SHA-256 | `77d4cbf6aa74ccb98d2f62bb4e687f8bbbeef64407e839d27e1afc77a7e2358d` (92,176 B) |
| boot SHA-256 | `4154b5f451de55f50d7e321bd2754f2230d0073d33320e49aaed561bc4745b04` (27,136 B) |
| manifest SHA-256 | `8edca94d…` |
| branch | `docs/plan-gameplay-variety` |

No baseline worktree was created and no build was run: `build/` holds
`main`'s default build, bound to the committed evidence.

### 0.2 Baseline, each figure with its source

| Figure | Value | Source |
| --- | ---: | --- |
| Worst fence margin | **1,472** (`2-sweep-fire6` f311, sector 0, a Raider spawn on a rotate frame) | STATUS W2; reproduced from the CSVs by §2.2's scan |
| DMA-on maximum | **31,304** (`memory-integrity-atr-2-hunt-fire5` f2388, the swarm, three Interceptors, nine shots) — 104 over the 31,200 target, 1,264 under the 32,568 gate | `docs/runtime-wall-trace.json`; reproduced by §2.2 |
| Boss frames: worst margin / DMA-on | 8,687 / 29,126 | STATUS W2 |
| Boss stress, native | 8,434 of 8,500 (reachable 7,732); the worst boss frame's own work 5,404 of 7,000 | STATUS W2 |
| Boss entry | 64 sectors, **245** host frames (bound 250, `tests/runtime-wall-trace.test.mjs`) | `docs/runtime-wall-trace.json` `boss_entry_host_frames` |
| Initial block | **13,618 B** (STOP 13,652: 34 B of room); boot 107, extension 105, total 212 sectors | `build/manifest.json` `transportCapacity` |
| ATR menu frame | 551 (BASIC 542) against the 596 baseline; limit 603 (+7): **52 frames of room** | STATUS W2 |
| `$AE00` window | 2,399 used, **1,185 free** (`$B75F-$BBFF`) | manifest `residentCapacity.basicWindow`, generated memory map |
| `DIRECTOR_RAM` | **35 B free** (`$9FD7-$9FF9`) | generated memory map |
| `HYBRID_C_ARENA` | 797 of 832, **35 free** | manifest |
| `HYBRID_C_SECTOR` | 230 of 248, 18 free | manifest `residentCapacity.window` |
| `BROADSIDE` zero pins | 103 (`hull_sequence_reserve`) + 16 (codebook reserve); M3 is priced on 98 + 6 of them | m3-waves-heavy §0.5, §3.5 |
| `PICKUP_CODE` tail | 65 B (M3-H takes 32 as RAM) | generated map |
| `STARFIELD_RAM` free tail | **299 B** (`$5CDB-$5E05`) — the budget and the M5 plan quote lever 4 as 309 | generated map (the repo wins) |
| Unowned / unclaimed RAM | 22 B (`$8133-$813F`, `$85E6-$85EE`, M3-H's); zero page `$B6-$FF` 74 B and `$0400-$04FF` 256 B unclaimed, **not measured** | generated map |
| Boss slots: A / C / D / E / scratch / install | **2,042 (6 free) / 1,880 (168 free; code 1,659 in 13 sectors) / 1,783 (9 free) / 266 (310 free, 2 sectors of 576) / 244 (12) / 352 (32)** | manifest `boss` |
| Region 1 charset | 976 B, 122 of 128 codes (6 free) | manifest `boss.regions` |
| Extension records, spare packed bytes | 1 `BROADSIDE` 86; 2 pickup + sector 127 (raw); 5 `HYBRID_C_EXT` 12; 7 arena 28; 8 window C half 76; 9 Light kernel 92; 11 `DIRECTOR_RAM` 116 | manifest `transportCapacity.manifest.records` (sectors × 128 − 21) |
| Level 1 for the bot (lives held) | the boss reached at 88.2 / 77.2 / 71.5 s; the fight 71.7 / 93.9 / 120.7 s; lives lost 2 / 4 / 5 | STATUS W2 |
| Level 1's core page | 7 of 20 waves, 7 of 10 sectors; payload `path[8]` 96 B zero; `hull_params` 22 B zero | manifest `levelDef`, `scripts/level-compiler.mjs:85-88` |
| `npm test`, default build | 1,195 tests, 1,194 pass, 1 fail (`preview`, recorded) | STATUS W2 (not re-run here) |

**Where the brief and the repo differ** (the repo wins):

1. The brief's "M3 + M3-H about 990 B, M4 about 180 B and C1 about 50 B
   against about 1,185 B free" is right for the window; it omits M4's
   initials entry (item 16, 150 → 180 B, M5 plan §7), M6's K1 (150 → 180),
   the starfield item 24 (50 → 60) and the attract mode (200 → 240), which the
   M5 plan already places before the freeze. §4.1 carries them.
2. The budget's lever 4 (the `STARFIELD` tail) is 309 B in the budget and the
   M5 plan; the generated map says **299** (`$5CDB-$5E05`). §4.1 uses 299.
3. The M5 plan's row "capital frames (no fence; maximum 30,568)" (§6.5) is
   not reproduced on today's CSVs: the heaviest non-fighter row of the whole
   evidence run is **18,374** wall cycles (`2-evasive-fire3` f805, hull state
   1) and the heaviest COMBAT row 17,213 (§2.2). The pal-timing audit treats a
   capital row's `wall_cycles` as its whole iteration (`scripts/pal-timing-audit.mjs:53-56`,
   bounded by the physical frame). Reported, not adopted: this plan prices
   capital-sector items against the measured 18,374 and says so.
4. The brief's "enemy styles use 12–14 of 14 codes" for the hull codebook:
   the packed map has **16 local codes** per side including the space; the
   enemy styles use **11 (R1, R3) or 12 (R2, R4)** of them, the allied hull 12
   (**M**, `compileCapitalHulls` over every style). So 4–5 local codes are
   free per style — but the charset codes they would name (59–89) are all
   allocated (§1.11).
5. "Eight lives: check whether eight fit the HUD": they do, with no change
   (§1.8).
6. The brief's Decision AD summary and the elite/swarm caps match the repo.

### 0.3 Conventions

Cycle figures are native (the JS NMOS-6502 core on the linked bytes) unless
"wall" or "margin" is said; a native cycle before the fence costs **× 2.2 of
fence margin for a cost, × 2.0 for a saving** (m3-waves-heavy §1.4, MEASURED
2.04–2.18), and work before the fence never moves the DMA-on wall maximum.
Sector numbers are the Director's, from 0 (the debug route's numbering).

---

## 1. Phase A — inventory (what is true today, with file:line)

### 1.1 Waves and the Director

* A level is `assets/levels/level-NN.json`; the compiler
  (`scripts/level-compiler.mjs`) writes the core page (SectorDef and WaveDef
  structure of arrays, 20 waves, `scripts/level-compiler.mjs:64-76`) and the
  payload page (`:85-88`: `appearance` 48 B, `path` 96 B, `weaponGlyph` 18 B,
  `hullParams` 22 B, `summary` 10 B, `bossDef` 62 B).
* The Director reads the core page by absolute offset (`src/c/director.c:130-147`).
  `director_c_world_row_tick` (`:443-530`) runs once per world row: it ends a
  SPACE sector on its row count (`:482-499`), holds the cursor while a Heavy
  wave has formations left (`:503-508`) or a Light wave's lock is up
  (`:509-511`), and arms the cursor's wave when its row is reached (`:512-529`).
  `director_c_try_event` (`:293-340`) publishes the wave; a Light wave is
  handed to the window's stepper (`light_wave_step`, `src/c/lifecycle.c:922-949`),
  which admits one member every `spacing` frames and **lifts the lock only when
  the wave is spent and no Light is live** (`:946-948`).
* A Heavy formation is admitted by the kernel's retry
  (`interceptor_admission_update`, `src/main.s:11796`, retry 48 / 36 / 24
  frames by difficulty, `:12019-12020`) through `director_c_request`
  (`director.c:583-612`); the next formation is admitted only after the
  previous one has gone (`ENEMY_ACTIVE`).
* **`afterCleared`** is compiled into `wave_flags` bit 4
  (`level-compiler.mjs:792-800`) and **not read**: the Director reads bits 0–1
  (look) and 3 (Heavy class) only (`director.c:96-98`). `wave_path` is
  compiled as `$FF` (a path is refused, `:794-797`); `wave_flags` bits 2
  (mirror) and 5–7 are free in the runtime; M3 and M3-H have claimed 2, 6 and
  7 (m3-waves-heavy §2.3, §3.2).
* Runtime ceilings: swarm Light 3 / Heavy 0, elite 1 / 2, capital 0 / 0, boss
  1 / 0 (`director.c:193-194`). Class spacing floors 16 / 24 frames (`:198`).

### 1.2 Envelopes (reserved fields)

None exist. `wave_path[20]` (core page offset 156, `:143`) and the payload's
`path[8]` block (96 B at offset 48) are zero. A Light's movement is its
archetype's: a free Wingman drifts down one line a frame; an Interceptor
descends two lines a frame and closes one 4-HPOS cell on the player's column
every other frame (`light_tick_body`, `lifecycle.c:1100-1130`); an escort takes
its leader's column and lags 12 lines (`:1131-1142`). M3 §2.1 defines the
record (`dy` / `frames` / `flags`, four segments, 12 B) and §1.3 measured its
evaluator (form B: 288 B + 65 B column helper + 4 B table; 333–437 cycles a
tick on a path against 236–325 today).

### 1.3 Light and Heavy behaviour

* Light: C owns lifecycle, motion, fire cadence (`light_tick_body`,
  `lifecycle.c:1067-1186`); fire needs the token (`:1155-1157`); the burst is
  the archetype's (`:1158-1167`). Archetype table: `lifecycle.c:213-258`
  (Raider: 1 HP, pair burst 5 × 15 frames, post 60 / 50 / 40; Wingman: single
  shot, post 96 / 80 / 64; Interceptor: double tap, post 56 / 44 / 32, LASER
  class; Bomber: 4 HP, salvo).
* Heavy: `enemy_c_spawn_raiders` (`:1382-1413`, arena) publishes the profile
  (`heavy_publish_profile`, `:1367-1380`: movement, fire policy, burst count,
  interval, post-burst, renderer, weapon class, score) and the lane-sweep
  start; `enemy_c_heavy_tick` (`:1455-1528`) is the Bomber's per-member tick
  (lane sweep, brake, charge, salvo). The Raider's motion is
  `update_enemy_slot_motion` in `CODE` (initial block), entered from
  `heavy_member_update` (`src/hybrid/heavy-member.s`); M3-H wraps it from
  outside (§3.3 there).

### 1.4 Enemy weapons

* Raider: the pair burst controller `update_enemy_weapon_runtime`
  (`src/main.s:4425-4477`, `CODE`): reads the **published profile** —
  `ENEMY_PROFILE_BURST_COUNT`, `BURST_INTERVAL`, `POST_BURST_FRAMES`,
  `WEAPON_CLASS` — so a formation's cadence and look are the bytes C publishes
  at spawn, not constants. `allocate_interceptor_projectile` (`:4480-4530`)
  places the shot at the member's X; the shot then moves straight down at its
  class's step rate (`:4121-4133`). Only `FIGHTER_PROJECTILE_PREV_Y` exists:
  **no previous X**, so a shot's X never changes after birth.
* Looks: class c publishes glyphs 89+c / 99+c (`assets/graphics/fighter-weapons.json`);
  PULSE, LASER and BOMBER are the three authored visuals
  (`HOSTILE_WEAPON_VISUAL_COUNT`, `src/main.s:925-928`); a level's payload may
  re-skin two classes (`weaponGlyph`, 2 × 9 B, M2).
* Bomber: C-owned salvo (`enemy_c_heavy_tick`), `bomber_may_fire` (`:1443-1448`).

### 1.5 Bomber health and colour

4 HP (`lifecycle.c:252`), +1 on HARD planned by M3-H H6. Colour:
`bomber_colour` (`:1427-1441`) = hue `$C0` | HP << 1, +4 while charging, +6 for
six frames after a hit; at 1 HP the hull is `$C2`, luminance 2, nearly
invisible (m3-waves-heavy §8.2a). The registers are per member
(`COLPM1`/`COLPM2`, written by the veneer from `heavy_member_colour`), not
shared per line, so a per-member ramp needs no DLI. The body is
`enemy_body_data` in `BROADSIDE`, copied by `draw_enemy_member` on every
moved frame (512 / 570 cycles Raider / Bomber, **M** §2.3).

### 1.6 Capsules and booster selection

* One capsule at a time. The counter advances on a Heavy kill by a player
  shot (`weapon_pickup_record_qualified_kill`, `src/main.s:10371-10375`,
  `ENTITY_CODE`) and a debris shot kill (`debris_shot_reward`); the third
  spawns the capsule (`weapon_pickup_spawn_capsule_at`, `:10382-10414`): the
  type is `ENTITY_TYPE+WEAPON_PICKUP_NEXT_TYPE_SLOT`, then the rotation
  advances modulo `WEAPON_PICKUP_TYPE_COUNT` = 3 (`build/entity-effects.inc:73`).
* Collection (`weapon_pickup_collect`, `:10279-10314`, `ENTITY_CODE`): the
  type + `WEAPON_PICKUP_STATE_RAPID` becomes the booster state; Shield 250
  frames, the others 500; the HUD label and bar follow.
* Rendering: one `PLAYER3` image in `COLPM3` gold `$1C`
  (`render_fighter_pickup_pmg`, `:11103-11137`, `PICKUP_CODE`), one 16-row
  silhouette per type from `fighter_pickup_pmg_shape` (`:11522-11559`,
  **`STARFIELD`, the initial block**; the assert pins exactly
  `TYPE_COUNT × 16` rows).
* Boss sector: slot E's `boss_capsule_kill` (`src/hybrid/boss.s:1989-2024`)
  counts a destroyed module as a kill, never the defeating one, and spawns the
  capsule just below the band at the module's column through the same
  `weapon_pickup_spawn_capsule_at` — so the boss capsule is the **next type of
  the level's rotation**.

### 1.7 The player's hull and lives

`BROAD_PLAYER_HEALTH` 0–10; `PLAYER_LIVES` starts at
`PLAYER_STARTING_LIVES` = 3 (`src/main.s:8059`, `build/capital-hulls.inc:95`),
is decremented on a death (`:8209`) and the game is over at 0 (`:8095-8101`).
Decision K adds one after levels 3, 5, 7, 9, 11 (not implemented; M4).

### 1.8 The HUD lives display

`hud_ascii` is `SCORE 00000  LIFE 3 HULL ` (`src/main.s:7293`); the digit is
one cell at `HUD_LIFE_DIGIT_OFFSET` = 18, written as `PLAYER_LIVES | CH_ZERO`
(`update_hud_status`, `:8227-8229`). Any count 0–9 fits; **eight fits with no
change**. Every one of the 40 HUD cells is spoken for (SCORE 0–10, LIFE
13–18, HULL 20–28, BOOST 30–39, with the asserted blank separators at 19, 24,
29, 35), so a new HUD mark has no free cell.

### 1.9 The Director's sector end and `afterCleared`

§1.1: a space sector ends on its row count whatever is live
(`director.c:482-499`); nothing ends it earlier; `afterCleared` is compiled
and unread. C1 (STATUS backlog, w2-lights §3.4) would hold the end while the
live population exceeds the next sector's caps.

### 1.10 The boss module hit path and the overlay slots

* A player shot in a band column meets `boss_hit` (`src/hybrid/boss.s:560-611`,
  slot A): armour deflects; a module calls `_boss_c_hit`
  (`src/c/boss.c:318-391`, slot C): a covered module absorbs; an exposed one
  loses one HP, may change stage, and at 0 is destroyed — the last weapon's
  kill is the defeat. `boss_after_hit` / `boss_module_scored` (`boss.s:634-676`)
  score it, queue the GONE draw and rebuild the column.
* The lasers (M1 / M2, `$46`) live in slot D (`$1900-$1FFF`, 1,783 of 1,792
  B); slot D's head holds region 1's 98-B look table (decision E4 (b)); the
  capsule-from-a-module rule and the warning flicker in slot E
  (`$4C00-$4E3F`, 266 of 576 B, 2 sectors, over the expanded hull maps).
* **S5 requirements** (m5-loading-boss §"S5 requirements"): a home per region
  for the look table (slot E the candidate), a second fight phase (the finale
  volleys of decision B), the boss entry within 250 host frames or the bound
  brought to the owner, P1 / P2 free for the R3 force field, the 8,500 stress
  limit with ~66 cycles left.
* `BOSS_KIND_SALVO` already exists in the engine (`boss.c:boss_fire_next`):
  a launcher fires three shots on three frames.

### 1.11 Hull geometry and the codebook

* Capital geometry is a 9-column depth map per side per style
  (`assets/graphics/capital-hulls.json`, `scripts/capital-hulls.mjs`); depth
  5–8 is a hard rule (hull-set-v1 §12 decision 6). The level hull block (280 B,
  `$A880-$A997`) carries the packed map, a 16-code codebook, 7 surface glyphs
  and the collision boundaries (manifest `capitalHulls.levelBlock.offsets`),
  with a 104-B pad.
* Codebook use: enemy 11 (R1, R3) or 12 (R2, R4) of 16 local codes including
  the space, allied 12 (**M**, §0.2 item 4). The charset range 59–89 (31
  codes) is fully allocated (hull-set-v1 §2.3).
* Player contact: `handle_player_hull_contact` (`src/main.s:9618-…`, slot A)
  first asks `player_inside_universal_hull_corridor` (`:7522-7532`, HPOS
  `$54..$AC`) and only outside that fixed corridor resolves **per visible row**
  from the boundary tables. One turret module per side
  (`CAPITAL_HULL_TURRET_COUNT = 2`, asserted "exactly one turret per side",
  `:866`); the second emplacement of R2–R4 was not carried into v2 (hull-set-v1
  §12 "One conflict").
* Slot A (`$6DE8-$75E7`, the capital phase's first 2,048 B) is **2,042 B
  used by the boss overlay** (6 free); the capital group's other ~1,750 B of
  `BROADSIDE` are resident.

---

## 2. Measurements

### 2.1 Dead time per sector (item 8) — `scripts/measure-dead-time.mjs` (committed)

**Method.** The committed trace CSVs (`build/runtime-wall-trace/`, the run
bound to ATR `77d4cbf6…`), one row per main-loop iteration. A frame is
**dead** when it is a fighter frame (`sector_state` = OPEN) before the boss
entry with `enemy_live_count` = 0 and every `light_state0-3` = 0. The script
splits a sector's dead frames into the **lead-in** (sector entry to its first
spawn), **intra-wave** gaps (between members of one wave), **inter-wave** gaps
(the next spawn is the next wave's) and the **tail** (last enemy gone to the
sector's end); waves are assigned by spawn order (the Director arms one wave
at a time, in order; a Light admitted on a Heavy's spawn frame or the next is
its escort). The capital sector's drain wait and the boss's wait are reported
as holds, with how many of their frames still had an enemy live. The script
reads only; `--all` runs every full-schema CSV, `--gaps` lists each gap.

**Level 1, the natural-sweep bot (`director-complete-*`, lives held) — MEASURED:**

| Sector | EASY frames / dead | MEDIUM | HARD | What the dead frames are |
| --- | ---: | ---: | ---: | --- |
| 0 elite (Raider + Wingman × 4, Bombers × 4), 272 rows | 679 / 176 (26 %) | 604 / 86 (14 %) | 543 / 80 (15 %) | intra-wave gaps of 13–62 frames: the Heavy retry (48 / 36 / 24) plus the wave spacing after each pair dies; one 13–17-frame inter-wave gap; **no tail** (the capital follows) |
| 1 capital drain hold | 193 (165 with a Heavy live) | 131 (104) | 192 (165) | the carried Bomber pair; the empty part of the hold is 27–28 frames |
| 2 swarm (Wingman × 3, Interceptor × 3), 280 rows | 725 / 422 (58 %) | 623 / 378 (61 %) | 560 / 336 (60 %) | **tail 417 / 367 / 335**; the inter-wave gap 1–2 frames, intra 4–9 |
| 3 elite (a), one Raider pair + Interceptor, 120 rows | 300 / 225 (75 %) | 266 / 184 (69 %) | 240 / 165 (69 %) | **tail 224 / 183 / 164**; lead-in 1 |
| 4 elite, one Bomber pair at row 24, 224 rows | 560 / 415 (74 %) | 498 / 225 (45 %) | 448 / 267 (60 %) | **lead-in 61 / 55 / 49** (the row) and **tail 354 / 170 / 218** |
| 5 elite (b), one Raider pair, 240 rows | 600 / 521 (87 %) | 533 / 486 (91 %) | 506 / 417 (82 %) | **tail 520 / 485 / 416** |
| 6 boss wait | 1 | 1 | 1 | — |
| **space sectors** | **2,864 / 1,759 (61 %)** | **2,524 / 1,359 (54 %)** | **2,297 / 1,265 (55 %)** | tails 1,515 / 1,205 / 1,133 frames = **30.3 / 24.1 / 22.7 s** per level |

The hunt bot (`memory-integrity-atr-*-hunt-fire5`, which loses lives and
leaves enemies alive longer): 27 % on EASY, 25 % on HARD, the tails 213–264
frames in sector 3 and 99–264 in sector 2. `2-evasive-fire3` and the other
pre-capital replays: 2–16 %.

**Causes, in order of size:**

1. **Row-count sector ends after one short wave** — 86–90 % of the dead
   frames. Sectors 2–5 each carry one wave (two in the swarm) and last their
   authored rows whatever happens; the bot clears the wave in 95–200 frames
   and the sector runs on for 164–520. The W2 reserves (sector 2's 21 % and
   sector 5's 22 %, so the no-kill drain fits) are about 118 + 106 = 224 of
   HARD's 1,133 tail frames; the rest is the sector outlasting a wave the
   player killed.
2. **The Heavy retry cadence** inside a Heavy wave (sector 0: 63–163 frames a
   level in 2–4 gaps): after a pair dies the next is admitted on the next
   retry tick (48 / 36 / 24 frames) plus the wave's spacing.
3. **Lead-in rows**: sector 4's Bomber waits for row 24 (49–61 frames); the
   other post-capital waves are row 0 (1 frame).
4. **The hold before the capital**: 131–193 frames, but 80–86 % of it with the
   carried Bomber pair live — the empty part is 27–28 frames. The hold before
   the boss is 1 frame.
5. **Between Light waves**: 1–2 frames (the lock lifts on the last Light's
   death and the next row-0 wave arms on the next row tick). So chaining Light
   waves is already free of dead time; it is the envelopes that are missing.

**Boss entry loading** (the only disk read inside a level): 64 sectors in 245
host frames = 3.83 frames a sector (**M**, evidence). The optional fast SIO
loader (m5-loading-boss §4.3): ÷3 on an SIO2SD at ultra speed is an
**ESTIMATE** (≈ 82 frames, saving ≈ 3.3 s), nothing on a stock 1050; it costs
the reader 84 → 100 B against its 38-B tail (so the window or a reader cut),
and the emulator may not answer `$3F` (hardware-trust). It does not touch the
dead time above.

### 2.2 The fence rows by live population, and the heaviest Light frames

Every full-schema CSV of the committed run, fence-bound fighter rows only,
margin computed as `scripts/pal-timing-audit.mjs` does (**M**):

| Lights live / Heavy members live | Rows | Worst fence margin | Row | Max wall (DMA-on) |
| --- | ---: | ---: | --- | ---: |
| 0 / 0 | 19,133 | 7,632 | `2-evasive-fire1` f626 | 30,255 |
| 0 / 1 | 15,087 | 4,766 | `director-complete-1` f119 | 30,476 |
| 0 / 2 | 5,593 | 4,561 | `weapon-pickup-traversal-2` f560 | 29,876 |
| 1 / 0 | 4,993 | 5,829 | `2-sweep-fire6` f343 | 30,619 |
| 1 / 1 | 4,092 | 3,979 | `2-sweep-fire4` f396 | 31,011 |
| **1 / 2** | 16,157 | **1,472** | `2-sweep-fire6` f311 (the binding row) | 31,041 |
| 2 / 0 | 1,601 | 6,855 | `capital-muzzle-ring-2` f2060 | 30,807 |
| **3 / 0** (the swarm) | 2,016 | **9,137** | `memory-integrity-atr-2-hunt-fire5` f2391 | **31,304** (f2388) |

So the heaviest three-Light frame has 9,137 of margin and the game's DMA-on
maximum; the binding row has one escort Light and a Heavy spawn. **An
envelope step per Light** (M3 §1.3, **M** prototype, the tick's code is
unchanged since): +97 … +108 native over a free Wingman on a non-step frame,
+180 on a lateral step frame, +88 … +121 over an Interceptor; three Lights
on paths cost **+315 … +540 native ≈ +690 … +1,190 of margin** on the
swarm's worst row (9,137 → ≥ 7,900) and **nothing on the binding row** (no
free Light is live on a Heavy spawn frame, m3-waves-heavy §1.4). The
DMA-on maximum does not move (pre-fence work).

**Capital rows** (`sector_state` ≠ OPEN, no fence): heaviest **18,374** wall
(`2-evasive-fire3` f805, hull state 1), COMBAT rows ≤ 17,213 over 15,338 rows,
every state ≤ 18,374 (**M**; §0.2 item 3 on the plans' 30,568).

### 2.3 Heavy member costs today, and a Bomber damage stamp

`node scripts/measure-heavy-member-costs.mjs` on the default build (**M**,
this session): identical to m3-waves-heavy §1.1 line for line — a moved
Raider member 159 update + 500 draw (512 max) + 46 erase, a held one 160 +
49 + 23 (the Option D skip saves 485); a Bomber 479 + 549 (570) + 45 moved,
440 + 49 + 23 held; `update_enemy` two Raiders both moved 1,546 mean / 1,650
max; a Raider kill 1,323, a Bomber kill 1,358 (the claim 129 with §9's rotate
test). The Light tick: Wingman 235, Interceptor 245 / 305–325, firing 405 /
415.

**A Bomber damage stamp** (M3-H H12, variant C): copy the formation's two
bodies into a 32-B RAM copy (~304, **IC**), clear the authored holes (~75,
**IC**), re-point the base (~30, **IC**), re-publish that member's plane once
(512–570, **M** above): **~920 → 1,180 native, once per damage stage, as a
deferrable token event on a non-rotate frame** (the claim asks
`world_rotate_due` first, m3-waves-heavy §3.5 note), and **0 cycles on every
other frame** (the pending bit rides the byte `heavy_breakup_retry` already
tests). A colour ramp costs 0: it exists.

---

## 3. The items, priced

Bytes are `expected → budgeted` (§ conventions). "Home" is the segment and
the extension record or slot. Cycles are on the worst row of the phase.

### 3.1 Item 1 — chained Light waves, each with its own envelope

| | |
| --- | --- |
| What exists | a Light wave holds the Director's cursor until its last member is gone (`lifecycle.c:946-948`); the next wave arms on the next row tick when its row is reached; at row 0 that is 1–2 frames later (**M**, §2.1). The swarm ceiling is 3 (`director.c:193`). Level 1's core page has 13 free waves. |
| What is missing | the envelopes: M3's evaluator (§3.2) and the `path` field per wave (compiler + Director publish, M3 P4–P5). |
| Code | **0 B** for the chaining itself; the envelope cost is §3.2's. |
| Data | level 1's swarm re-authored as 2–3 waves of one archetype with different paths (e.g. Interceptor sine → snake → dive-and-retire), rows 0; a Wingman column with mirror. Optionally a second swarm sector after the sector-flow change (§3.8), since a swarm must not follow an elite sector today (W2 F1). |
| Cycles | §2.2: +315 … +540 native on the swarm's worst rows (9,137 of margin); 0 on the binding row; DMA-on unmoved. |
| Risk | the swarm's DMA-on row is already 104 over the 31,200 target with 9 shots; paths add nothing after the fence. The no-kill drain of a chained swarm is longer (three waves back to back): with §3.8 the sector end is held anyway. |
| Recommendation | **do**, as data in M3 session 3 (the paths) — after the sector-flow session, which removes the need to size swarms for the no-kill case. |

### 3.2 Item 2 — the envelope set and the evaluator

**The set** (m3-waves-heavy §2.1, record `dy` / `frames` / `flags`, four
segments of 3 B, 12 B a path, 8 paths a level in the payload block that
already exists): sine = four segments alternating lateral right / left every
second frame; snake = the same with longer `frames`; arc = `dy` 2 / 1 / 1 / 2
with one lateral direction; loop = a negative-`dy` segment (up) between
descents, with the top-exit retire; mirror = `wave_flags` bit 2, per member
(compiled already); salvos = fire allowed per segment (bit 4 of the segment)
and the volley bit (P7). **Every envelope the owner listed is a form-B
record; no further evaluator code is needed per envelope.**

| Evaluator | Bytes (window) | Cycles a tick on a path | Envelopes | Basis |
| --- | ---: | --- | --- | --- |
| **Form B** (M3 §2.1 as planned) | **288 + 65 helper + 4 table = 357**; with P4–P7 (admission, publish, per-segment fire, volley) 496 → **524** | 333–344 straight, 415–426 step frame, 426–437 segment end; +17 no path, +3 escort | all six, plus track-the-player, retire up or sideways | **M** prototype (§1.3 there) |
| Form A (design-4.6 §1.4, dx/dy nibbles, loop to 0) | 400 + 65 + 8 = 473 | 422–507; +85 nibble unpack | the same | **M** prototype |
| A sine-only stepper: a 32-B quarter-sine table, per-slot phase and amplitude from the wave | ~100 → 200 code + 32 table (**G**) | ~60–90 (**G**) | sine and snake only (amplitude, period); no arc, loop, retire-up, held fire | **G** |
| Form B without the column helper (M3 §6.3 cut) | 292 → 459 | +12 on every Interceptor tracking frame | loses track-the-player as a segment mode | m3 §6.3 |

**Envelopes per byte: form B.** The sine-only stepper is cheaper but buys two
of the six and no fire control; the budgeted difference (≈ 300 B) is what the
other four envelopes and the per-segment fire cost. The set is confirmed as
M3 §2.1 wrote it; the window bytes are M3's 496 → 524 (record 8: +4 → +5
sectors). Nothing in the initial block; `DIRECTOR_RAM` 0.

### 3.3 Item 3 — Raider variety

| Sub-item | What | Home | Bytes | Cycles | Basis | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| M3-H as planned | assault / armoured kinds (2 / 2 / 3 HP), stop-and-shoot hold from the wave, the dodge, the second look from the payload, the damaged look | window C 256 (113 new + 143 moved), window ASM 210, `BROADSIDE` pin 98, arena +83 −143, 45 B of state, 32 B RAM | **432 → 466** window in all; 0 initial block | −467 on every two-Raider frame; spawn row +100 → 120 native (≈ +260 of margin on the binding row: 1,472 → ~1,210) | m3-waves-heavy §3.5, §6.1 (**M** gate and look prototypes, **IC** the rest) | **do** (sessions 1–2) |
| **Weapon profiles single / burst / double** | a 4-entry table of (burst count, interval, post-burst) selected by two free `wave_flags` bits of a Heavy wave (5 and 7; 6 is M3-H's kind), overriding `enemy_profile_burst_count/interval/post` after `heavy_publish_profile` at spawn; the ASM controller reads only the published bytes (`src/main.s:4448-4477`) | window C (`enemy_c_spawn_raiders`, moved there by H9) + 12 B table | **30 → 40** | ~40 native on the spawn frame only (≈ +90 of margin on the binding row); 0 a frame | **IC** on `heavy_publish_profile` (14 B a field) | **do**, inside M3-H session 1: "single" = count 1, "double" = count 2 interval 6, "burst" = today's 5 × 15; the owner authors the triples |
| More looks | (a) per level: the payload's two weapon looks already re-skin a class (M2, 0 B); (b) a per-wave class override (PULSE / LASER / BOMBER look) in the same profile table, +1 B an entry | window C | (b) **8 → 10** | 0 | **IC** | (a) exists; (b) **do** with the profiles |
| A fourth authored look | a new hostile visual class: 16 B of charset in `RODATA` (initial block) and a step-rate entry | initial block | 16 + 2 | 0 | hull of `HOSTILE_WEAPON_VISUAL_COUNT` (`src/main.s:925`) | **drop** (initial block; the payload re-skin covers it) |
| **The half-aimed shot** (drifts toward the player) | per hostile shot, every 8th frame while above the player, step X one cell (4 HPOS) toward `player_x`; but the shot has no previous X (`FIGHTER_PROJECTILE_PREV_Y` only), so the ring erase must learn one: a 5-B array and the erase/draw path in `CODE` / `ENTITY_CODE` (initial block, hardware-critical publication) or a re-pointed veneer; the drift itself in the window | window 40 → 50 **plus** ~10 → 20 B of initial-block publication code **plus** 5 B RAM | **60 → 80 B and initial-block bytes** | +12 native per live hostile shot per frame (the mask test) + ~30 on step frames: 5 shots ≈ +60 … +150 native ≈ **+130 … +330 of margin on dense rows** (the binding row has hostile shots live) | **IC**, **G** on the erase path | **not recommended** (owner question Q2): it reopens "no aimed shots" (budget §5.3), spends initial-block bytes in the publication path and 130–330 of margin; the Raider already hunts the player's column, so its burst is "half-aimed" at birth; the Interceptor tracks the player |

### 3.4 Item 4 — Bomber damage

| Variant | Bytes | Cycles | Readability | Basis | Recommendation |
| --- | ---: | --- | --- | --- | --- |
| **C — holes stamped into a 32-B RAM copy** (M3-H H10–H14, H16) | window ASM 114 (punch 90 + hole tables 24), `BROADSIDE` pin 40 (base veneer 26 + pending test 14), −1 in place, 32 B RAM in the `PICKUP_CODE` tail; **114 → 130 window** | **0 a frame**; ~920 → 1,180 native once per stage as a deferred event, never on a rotate frame (§2.3) | holes read on any hue; two stages at 2 and 1 HP (decided §8.1 item 5) | m3 §3.4–3.5, **IC** + **M** | **do** (M3-H session 2) |
| **Luminance ramp, lifted** | `bomber_colour`: `(hp << 1) + 2` instead of `hp << 1` and `BOMBER_FLASH_LUMA` 6 → 4 (H6): 4 HP `$CA`, 1 HP **`$C4`**, the flash tops at `$CE` and the charge at `$CE`, inside the hue (the compile-time assert still holds) | **3 → 4 B** of arena (35 free) | 0 | the 1-HP Bomber no longer vanishes (luminance 4 against black); the ramp still steps 2 per HP | **IC** on `lifecycle.c:1436` | **do** (with H6, M3-H session 1) |
| A hue change per stage instead of luminance | a 4-entry hue table | 6 → 8 B arena | 0 | risks the collision with the Raider's `$44` and the allied steel (STATUS "Bomber hull colour") | — | **drop** |
| Colour registers shared per line | not a constraint here: `COLPM1` / `COLPM2` are one register per member, written by the veneer for both; no DLI is involved | — | — | — | `c-asm-abi.s` `heavy_publish_hull_colour` | — |

**Both** (holes and the lifted ramp) are recommended: the ramp is the
at-a-glance signal, the holes are the look. Owner question Q4.

### 3.5 Item 5 — the proton torpedo (boss only; replaces the Nova Missile)

**The decision recorded** (§6): boss only; one torpedo per capsule; it
destroys one boss module (plate, gun or emitter) at once; it replaces the
planned Nova Missile (game-design.md "Nova Missile — planned").

**Design priced** (the cheapest that meets it):

| Piece | What | Home | Bytes | Cycles | Basis |
| --- | --- | --- | ---: | --- | --- |
| The capsule | in the boss sector every capsule is a torpedo: `boss_capsule_kill` (slot E) forces the spawned type to TORPEDO and leaves the level's rotation where it was (today it advances it) | slot E | 12 → 15 | 0 | **IC** on `boss.s:1989-2024` |
| The silhouette | a fourth 16-row `PLAYER3` image, a distinct colour (`COLPM3` per type, §3.6) | `STARFIELD` (initial block) **or** the window if the table moves (§3.6) | 16 | 0 | **M** table layout |
| Collection | the collect path (`ENTITY_CODE`, `src/main.s:10279`) branches on the type: a torpedo sets `torpedo_armed` and `fire_released = 0` and leaves the booster state alone; reached by re-pointing one 3-B instruction to a window veneer | window 25 → 30; initial block 0 (byte-neutral re-point) | 0 | **IC** |
| Firing with one button | **the Nova rule** (game-design.md): a held FIRE at collection does not launch; the player releases and the next new press launches the torpedo instead of the normal shot. The player burst controller's `@begin` (`src/main.s:4246`, `CODE`) is re-pointed through a window veneer that tests `torpedo_armed && fire_released` | window 40 → 50; initial block 0 | +8 native on every fire-press frame (a flag test) | **IC**, **AN** the attract mode's `read_input` re-point |
| The flight and the draw | a missile (M3 or M0 — both free in the boss sector: M1 / M2 are the lasers, P1 / P2 stay the force field's, P3 the capsule), 2 colour clocks wide (`SIZEM` double 4), 8 lines, in `COLPM3` (gold) or `COLPM0` (the player's white); launched from the player's X, moves up 4 lines a frame; erase and write 8 rows of the missile plane a frame; retire above the band | slot E | 90 → 180 (**G** × 2) | ~250 → 300 native a frame while flying (16 plane writes with masks) | **AN** slot D's beam column (written once) |
| The hit | at the band's bottom line: the torpedo's column through `boss_column_map` → the front module → `_boss_c_hit` with a **kill flag** (slot C: set `boss_hp[n]` to 1 before the decrement, 12 → 15 B); armour, cannon or emitter alike; the existing kill path draws, scores, sounds and rebuilds (0 B); a covered cannon cannot be hit (the front module is what the column map names) | slot E 40 → 60; slot C 12 → 15 | ~200 native once | **IC** on `boss_shot_meet` / `boss_hit` |
| The detonation | the module's own destruction feedback (spark, tick, sound, the GONE draw) — the Nova's "large multi-phase detonation" is **not** priced: it would need the band flash the owner removed (F2) or a new effect | 0 | 0 | decision L, F2 |
| HUD | none: no HUD cell is free (§1.8); the capsule's own look and a collect sound (the Shield's) tell the player; an armed torpedo could tint the player's shots (0 B: the booster level's colour rule of decision U is not built yet) | 0 | 0 | — |
| State | `torpedo_armed`, `fire_released`, X, Y | 4 B in slot E's BSS | — | — |
| Leaving the boss sector | the boss exit and a GAME OVER clear the flags (the slot E RAM is rebuilt anyway) | slot E 6 | 0 | **IC** |
| **Totals** | | **slot E 150 → 260 B + slot C 12 → 15 B + window 65 → 80 B + 16 B silhouette** | **boss frames**: +250 → 300 native while a torpedo flies (the stress 8,434 of 8,500 leaves 66: a flying torpedo must not coincide with the two-laser worst case, or the frame's own budget is brought to the owner); fighter frames: +8 on fire frames | |

**Where it lives, against S5.** Slot E has 310 B free of 576 (2 sectors
read). S5 needs a home per region for the look table (98 → 110 B, slot E is
the candidate) and ~60 → 120 B of slot C for the second phase (**G**); slot D
has 9 B, slot A 6 B. So **slot E after S5: ~200 B; the torpedo needs 150
expected and 260 budgeted** — it fits on expected figures with 50 B over on
budgeted ones. Slot E is capped at 576 B (the expanded hull maps end at
`$4E3F`, the broadside slot state follows), so the overflow cannot be bought
with a sector: it must come from trimming (the draw as a 4-line missile, the
hit through `boss_shot_meet`'s existing path) or from a new boss-phase home.
**The capital group's resident half (~1,750 B of `BROADSIDE`, dead RAM in a
boss sector) as a second overlay slot** is the lever that would give the boss
and the capital items room at once (§4.4).

**The boss entry.** Slot E grows 2 → 3 (expected) or 4 (budgeted) sectors:
the entry 64 → 65 … 66 sectors, **245 → 249 … 253 host frames against the
250 bound** (3.83 a sector, **M**). The bound exists so the WARNING screen
stays ~5 s; S5 must keep it or bring it to the owner — this plan brings it
(Q6): 260 frames (5.2 s) covers the torpedo and one more sector for S5.

**Fight length.** Region 1: 13 modules, 264 HP in all (plates 12–20, cannons
28, the emitter 20; `assets/graphics/boss-regions/region-1/modules.json`).
Every third destroyed module drops a capsule (not the defeating kill): a
player who kills every module gets 4 capsules, a player who kills only what
the win needs (five weapons and the plates in front of them, ≥ 10 kills) 3.
Each torpedo spends 12–28 HP of the 264 at once: **≈ 40–85 HP ≈ 15–30 % of
the fight's shooting**, so **MEDIUM 93.9 s → ~65–80 s (G)**, under the 90–120
target. S5 / M8 give it back with `hpScale` (data) or the cadence becomes
every fourth module (Q7). A torpedo spent on a plate buys less than one on a
cannon, which is the player's choice and the point.

**Recommendation:** **do, in M6** as one session after S5, with the reserve
and the bound decided now (Q6, Q7, Q3). If the owner wants it before S5 the
session order is the same and S5 lands in what is left.

**The owner's answers (2026-10-08), applied:**

* **Firing: the Nova release-then-press rule** (Q3), as priced above.
* **Reserve: 200 B of slot E** for the torpedo before S5 (Q6). S5 plans
  against the remaining 110 B of slot E plus the per-region overlay design
  of §4.4; the torpedo session takes the reserve.
* **The boss-entry bound 250 → 260 host frames, as a measured limit** (Q6):
  the torpedo session measures the entry on its evidence run and **STOPs if
  it exceeds 260**; the evidence test's bound moves to 260 in that session,
  not before.
* **Every boss-sector capsule is a torpedo** (Q7). The fight must stay within
  MEDIUM 90–120 s: the torpedo session **rebalances module durability in
  data** (`modules.json` hit points and `bossDef.hpScale`) and **reports the
  fight length per difficulty** (EASY / MEDIUM / HARD, the bot) with the
  before-and-after figures.
* **S5 Phase A requirement — region-specific boss code as per-region
  overlays.** The R3 force field, the final boss's salvos, R2's escort and
  each region's look table are priced as **per-region overlays read at the
  boss entry**, so only the current region's code is resident in a boss
  sector; S5 Phase A prices S5's full needs against slot E with that design,
  not the look table alone (§4.4).

### 3.6 Item 6 — the +1 life capsule

| Piece | What | Home | Bytes | Basis |
| --- | --- | --- | ---: | --- |
| HUD | `LIFE 8` is one digit cell: **0 B** (§1.8). The count shown is the ships left including the one in play (3 at a new game); the maximum is 8 (decision K + this booster, clamped) | — | 0 | **M** |
| The silhouette table | `fighter_pickup_pmg_shape` (48 B, `STARFIELD`, initial block) **moves to the window**: the one reader (`render_fighter_pickup_pmg`, `PICKUP_CODE`, `src/main.s:11125`) gets a new operand (3 B in place); the table gains the new types there | initial block **−48 raw (≈ −40 packed)**; window +48 + 16 a new type | 0 | **IC** |
| Per-type colour (distinct look) | a 5-B `COLPM3` table and a store in `render_fighter_pickup_pmg` | `PICKUP_CODE` tail (65 B; M3-H takes 32) | 10 → 12 | **IC**; budget §2 M6 "~6 B" |
| Collection | the type branch (re-pointed from `ENTITY_CODE`, §3.5): LIFE: `PLAYER_LIVES` + 1 clamped at 8, `update_hud_status`, a sound; the booster state untouched | window | 30 → 36 | **IC** |
| **The rule — drawn rarely at random, never zero, at most once a level (owner, 2026-10-08, Q8)** | the type pick becomes a window function (byte-neutral: `lda abs` → `jsr` at `src/main.s:10399`): on every capsule spawn after a level's first, while the level's `life_given` flag is clear, one draw of the Director's RNG (`director_c_rng_advance`, the replay-deterministic stream) at **1 in 4** makes the capsule LIFE and sets the flag; **never zero**: if the flag is still clear when the level's last space sector is entered (`enter_sector` sees `sector_kind` bit 7), the next capsule is LIFE whatever the draw; **at most once**: the flag, cleared at every level start by `director_c_init`. The probability and the forcing sector are constants M8 may tune | window 45 → 55, 1 B of state (`DIRECTOR_C_BSS` 7 B or the unowned RAM) | **IC** |
| Alternative rules, priced and not taken | once a level at the capital's completion (deterministic: `HYBRID_C_SECTOR` 6 → 8, window 20 → 24); or an N-entry rotation with one LIFE (window 30 → 40, kill-dependent, can be zero) | — | **IC** |
| **Totals** | | **window 125 → 160 (with the moved table and the random rule), `PICKUP_CODE` 10 → 12; initial block −40**; 0 cycles on any frame but a collection; one RNG draw per capsule spawn | |

**Recommendation: do, in M6** (with K1), the random rule as the owner decided (Q8).

### 3.7 Item 7 — the hull-restore capsule

Shares every mechanism of §3.6: a fifth type (16 B in the moved table), its
colour, a collect branch (`BROAD_PLAYER_HEALTH` = 10, `update_hud_status`,
the hit sound: **12 → 15 B** window). The rule: recommended **the rotation
of six** — Rapid, Spread, Shield, Rapid, Spread, **Repair** — so a repair
comes every 18 qualifying kills (a 6-entry type table in the type-pick
function of §3.6, 6 B). Total with §3.6: **window ~130 → 165 B**. 0 cycles
a frame. **Do, in M6** (Q9).

### 3.8 Item 8 — dead time: the sector-flow change, and the fast loader

**The change** (one session, `feat/sector-flow`), three rules in
`director_c_world_row_tick`, each as a verdict from one window function
`director_c_sector_flow()` so that `DIRECTOR_RAM` pays only for the call and
the branches:

| Rule | What | Bytes | Cycles | Basis |
| --- | --- | ---: | --- | --- |
| **C1** (backlog, prerequisite of M4) | before `advance_sector()` on the row count: while `ENEMY_ACTIVE` ≠ 0 exceeds the next sector's Heavy ceiling or the live Light count its Light ceiling, do not end (the world keeps scrolling) | `DIRECTOR_RAM` 6, window 40 → 50 | ~60–90 native on the row ticks past the row count only | w2-lights §3.4 (**IC**) |
| **`afterCleared` read** (`wave_flags` bit 4, compiled today) | the cursor's wave arms when the previous wave is cleared — `ENEMY_ACTIVE` = 0 and no Light live (an escort counts: the owner's "cleared") — and its row has been reached (the row is then a minimum delay, design-4.6 §1.3) | `DIRECTOR_RAM` 8 → 10, window 35 → 42 | ~30 native on row ticks while such a wave is pending | **IC** |
| **Early end** | when the cursor is at the sector's last wave + 1, no formation is pending, the Light lock is down and the field is clear, `advance_sector()` before the row count; the authored row count becomes the **no-kill cut** (the latest a sector may end), which C1 then holds anyway | `DIRECTOR_RAM` 6 → 8, window 35 → 48 | ~25 native on row ticks after the last wave | **IC** |
| **Totals** | | **`DIRECTOR_RAM` 20 → 24 of 35; window 110 → 140**; initial block 0; `HYBRID_C_SECTOR` 0 | **+40 → 60 native on world-row ticks** (every ~2.2 frames on MEDIUM), ≈ **+90 → 130 of margin on the binding row** (a Heavy spawn on a rotate frame is a row tick: 1,472 → ~1,340 → 1,380); DMA-on unmoved | |

What it does to level 1 with today's data (**M** §2.1): the tails go
(1,133 … 1,515 frames, 23–30 s a level), the Bomber's lead-in goes if its
wave says `afterCleared`, the retry gaps stay (the kernel's cadence). The
level then reaches the boss in roughly 45–55 s unless the data refills the
time — which is the purpose: the rows become waves (§3.1), not reserves.
**Both W2 reserves can drop** (sector 2 280 → ~232 rows, sector 5 240 →
~188: the 21 % and 22 % existed only so the sector outlasts its Lights with
no kills; C1 holds the end instead) — about 100 rows of level data; and a
swarm may again follow an elite sector (W2 F1's data rule becomes C1's code
rule), which frees the sector order.

Tests RED on `main`: a native carry-over test (a Heavy live at an elite's
end holds the end; a swarm's Lights hold it); `afterCleared` arms on the
clearing frame's next row tick and not before; the early end fires on a
clear field and never with a formation pending; the row-count cut still
fires with nothing live; `tests/level-one-waves.test.mjs`'s "no swarm after
an elite" becomes a warning; the timeline probe's level 1 pins re-measured.
STOP: `DIRECTOR_RAM` over 35, a worst fence margin under 1,300 without the
row explained, any initial-block byte.

**The fast SIO loader** (m5 §4.3, S6): ≈ 3.3 s saved per boss entry on an
SIO2SD at ultra speed (**ESTIMATE** ÷3), 0 on a stock 1050, +≈ 0.7 s saved
per level read; reader 84 → 100 B against 38 free; hardware-trust (the
emulator may NAK `$3F`); the owner's drive decides (m5 Q10). It removes no
dead time. **Later** (M9, optional), as the M5 plan has it.

### 3.9 Item 9 — between capital ships

| Sub-item | What | Home | Bytes | Cycles (capital rows ≤ 18,374 wall, **M**) | Basis | Recommendation |
| --- | --- | --- | ---: | --- | --- | --- |
| **Nacelles narrowing the corridor (4.8a)** | the generator allows depth 9–10 rows (decision 6's `5 ≤ depth ≤ 8` relaxed); the per-row collision boundaries already exist (the hull block's tables, read by `handle_player_hull_contact`'s per-row path); the fixed corridor test's two immediates (`src/main.s:7524`, `:7528`, `$54` / `$AC`) narrow to the deepest nacelle, so more rows take the per-row path; debris and capsules clamp to the fixed `ENTITY_CORRIDOR` (a nacelle row may show debris over the nacelle, or the data keeps debris off nacelle sectors); glyphs: the nacelle is drawn from the style's existing 7 surface glyphs and contour transitions (the charset range 59–89 is full, so no new glyph); `hull_params` 22 B and the hull block's 104-B pad carry per-row extents if the map alone cannot | slot A **(6 B free)** for the two immediates — 0 B if the values change in place; generator + data otherwise | **0 → 40 B** of capital-phase code, 0 → 20 B data | +60 → 100 on capital frames (more rows through the per-row contact path, **G**) | hull-set-v1 §4 (one contiguous collision range), `:7522-7532` | **later** (M7, with the hull sets); it is now cheaper than item 20's 150 → 180 because the per-row contact exists, but every capital-phase byte beyond the two immediates needs the second capital slot (§4.4). "Player collision with the hull side beyond the prow" is unverified: the contact resolves visible rows of the COMBAT section (`prepare_next_hull_row`, `:7538`); prow rows are a data question for that session |
| **A second gun emplacement (hull step 3, R2–R4)** | decision D3 declined it (one turret module per side): the module select +8 B, `CAPITAL_HULL_TURRET_COUNT` 2 → 4 with 16 B of state and ~48 B of tracked-muzzle code | `BROADSIDE` (3 B tail) / the pin (M3-H's) → the second capital slot | 56 → 70 (budget §2 M7: 0 → 48 code) | +150 … 360 on capital frames (**G**) | hull-set-v1 §12, budget §2 M7 | **later** (M7); the data-only variety that exists today is the turret density per difficulty (`turretRowsByDifficulty`), broadside and debris density per sector |
| **A Light in the capital sector (4.8c)** | director-4.6 §5.1 (a)–(e): a Light publication writer inside the capital frame's late window (proof-first, raster-critical), the corridor-clamped placement (4.8c minimum scope), the entry / drain predicate, `LIGHT_CEILING_CAPITAL` 0 → 1 as a table value | window 30–60 + 60–100 + ~30 | **120 → 190** | +412 native a standing Light, ~1,360 on a kill frame (design §8): on today's capital rows **18,374 → ~19,300 standing, ~21,400 on a kill frame (M base, ESTIMATE delta)** — far under 32,568; the publication window, not the cycles, is the cost | director-4.6 §5.1, decision 1 (RESTRICT) | **later / after 1.0**: a proof session and an integration session, and it reopens decision 1 of director-4.6 §11 |

### 3.10 The M6 items already planned, re-priced

| Item | Bytes | Cycles | Note | Recommendation |
| --- | ---: | --- | --- | --- |
| K1 — the permanent weapon level 0–5 (decisions N, U) | window 150 → 180; initial block 10 → 12 packed (hooks) | +48 on the binding row (**IC**, budget §2 M6) | the damage variable; death costs one level | **do** (M6) |
| Longer boosters | 0 B: `PLAYER_FIGHTER_RAPID_FIRE_DURATION` 500 / Shield 250 are constants (the HUD quarter asserts need a multiple of 4); per-level durations: 2 B of payload + 12 → 15 B | 0 | — | **do** as constants in M8's balance; per-level only if M7 wants it |
| Weapon roles (the booster level's colour and sound signals, decision U) | inside K1 | — | — | with K1 |
| A visible, avoidable capsule | the per-type colour of §3.6 (10 → 12 B); the capsule is already avoidable (the player passes beside it) and its three silhouettes differ | 0 | — | **do** with §3.6 |
| Item 22 — a booster until a life is lost | 15 → 30 B in `PICKUP_CODE` (65-B tail; M3-H's 32 B of RAM leave 33) | 0 | record 2 has 127 raw B spare: no sector | **do** (M6) |
| **The attract mode (item 15) as a menu-phase overlay (owner, 2026-10-08)** | **0 B of window during play.** The input-stream reader (60 → 72), the idle timer, the `DEMO` label and the exit on FIRE (80 → 96) and the recorded stream (300 → 500, G) live in a **menu overlay read at every entry to the menu** into `$0C00-$1FFF` (the boss's claim is boss-sector only; the summary module keeps `$0500-$0BFF`), 4 → 6 sectors ≈ 15 → 23 host frames (EMULATOR, 3.83 a sector); the one resident hook is the byte-neutral `read_input` re-point, armed and disarmed by the overlay itself; the demo's level read (49 frames) as before. The same overlay is the home the menu's own constant data would move to (§8.3 lever L1a) | +20 on every menu frame (the stream read); 0 in play | risk 3: the menu phase gains a disk read; the harness's menu replays set it aside like the boss entry; the attract stream is hardware-deterministic only for input-independent state (m5 §7 item 15) | **do**, its own session after M6 (§5), as a must-have (owner decision 2026-10-02, reaffirmed 2026-10-08) |

---

## 4. Ledgers

### 4.1 The `$AE00` window, two orders

Items with their window bytes, `expected → budgeted`:

| Item | Window | Source |
| --- | ---: | --- |
| sector flow (C1 + `afterCleared` + early end) | 110 → 140 | §3.8 |
| S5 (boss regions 2–4, the second phase, the look-table home) | 0 | overlays |
| M4 campaign loop (level advance, carry, K's lives, screens) | 150 → 180 | budget §2 M4 |
| M4 initials entry (item 16) | 150 → 180 | m5 §7 |
| M3-H sessions 1–2 (with the weapon profiles 40 → 50 and the lifted ramp in the arena) | 472 → 516 | m3 §5, §3.3 |
| M3 session 3 (paths) | 496 → 524 | m3 §2.4 |
| M6 K1 | 150 → 180 | budget |
| M6 life + repair capsules (with the moved silhouette table and the random life rule) | 145 → 185 | §3.6–3.7 |
| M6 torpedo, resident part | 65 → 80 | §3.5 |
| M7 starfield density and speed (item 24) | 50 → 60 | m5 §7 |
| attract mode (item 15) — **a menu-phase overlay, 0 window (owner, 2026-10-08)** | 0 | §3.10 |
| **sum** | **1,788 → 2,045** | |

**Order A — the previous order (S5 → M4 → M3 + M3-H → M6), with the
sector-flow session first, for the record:**

| Point on the road | Free, expected → budgeted |
| --- | ---: |
| today | 1,185 |
| after sector flow | 1,075 → 1,045 |
| after S5 | 1,075 → 1,045 |
| after M4 (loop + initials) | 775 → 685 |
| after M3-H | 303 → 169 |
| after M3 | **−193 → −355** |
| after M6 (K1, capsules, torpedo), item 24 | **−603 → −860** |

**Order B — M3 + M3-H before M4 (adopted by the owner, 2026-10-08; §5),
with the lever session where §5 puts it:**

| Point on the road | Free, expected → budgeted |
| --- | ---: |
| today | 1,185 |
| after sector flow | 1,075 → 1,045 |
| after S5 | 1,075 → 1,045 |
| after M3-H | 603 → 529 |
| after M3 | 107 → **5** |
| after the window levers (+537) | 644 → 542 |
| after M4 (loop + initials) | 344 → 182 |
| after M6 boosters (K1, the capsules) | 49 → **−183** |
| after the M6 torpedo | −16 → −263 |
| after item 24 | **−66 → −323** |
| the attract mode (menu overlay) | 0 |

The totals are the same in both orders; the order moves who is short. In
order B the whole of M3 + M3-H fits what is free today and the lever session
comes before M4; M6 is where the window goes negative on budgeted figures.

**The levers** (each its price):

| Lever | Buys | Price / risk | Basis |
| --- | ---: | --- | --- |
| the `STARFIELD` run tail `$5CDB-$5E05` as a landing zone | **299** | cfg and build change; risk 3 | generated map (budget lever 4 said 309) |
| the arena's free bytes after M3-H's own moves | **95** | none; risk 1 | m3 §6.3 |
| the `BROADSIDE` pins after M3-H | **15** | none | m3 §6.3 |
| `LEVEL_BUFFER` 16 → 15 | **128** | every level address re-linked; risk 3 | m5 §6.1 |
| **the `MAIN` holes of §8.5: the Light kernel moved to `$3615-$3997` after the menu-data overlay** | **902** | 0 transport; one record destination; needs L1a first; pinned vectors and page crossings re-proven | 3 | §8.5 (**M** sizes) |
| **subtotal, the four earlier levers (without §8.5 and the cuts)** | **537** | | |
| ~~the attract mode gives way (m5's rule)~~ — **withdrawn (owner, 2026-10-08): the attract mode is a must-have and a menu-phase overlay; it costs the window nothing** | 0 | — | §3.10 |
| the M3 cuts | up to 195 | the column helper +12 cycles a tracking frame; one damage stage; the dodge; the volley into the arena | m3 §6.3 |
| **a fighter-phase overlay in `$1900-$1FFF`** (slot D's RAM outside the boss sector): fighter-only code (the path evaluator, the capsule types, the weapon profiles) read at every level start behind the summary screen and rebuilt after a boss | **up to 1,792** | a run read per level (+8 … 14 sectors ≈ +30 … 53 frames behind the 3-s minimum); the code must not run before its read; the low-RAM range is emulator-measured free only (`diagnostics/low-ram-0700-1fff-2026-10-03.md`) until the owner's 65XE smoke of `$0500`; risk 3–4 | m5 §6.1 last row |

**End of the road:** budgeted **−323** after the four levers; the M3 cuts
→ −128; the fighter overlay in `$1900-$1FFF` covers the rest. Expected
**−66**; the M3 cuts → +129. So on expected figures everything fits with the
four levers and one M3 cut (the volley into the arena, 72 B, is the cheapest
and costs no cycles); on budgeted figures the fighter overlay or a dropped
item (the torpedo's resident 80, the initials entry 180, the capsules 185)
is needed as well. The decision is the owner's at the M6 boundary with
measured figures. **The data levers of §8 change it through §8.5 only: the
Light kernel moved into the `MAIN` holes returns 902 B of window, and the
road then ends +836 expected / +579 budgeted (§8.5's table); Q15 asks
whether that lands in the levers session.**

### 4.2 `DIRECTOR_RAM`, `HYBRID_C_SECTOR`, the arena, the pins

| Home | Free today | Spent by | Left |
| --- | ---: | --- | ---: |
| `DIRECTOR_RAM` (`DIRECTOR_C_CODE` tail) | 35 | sector flow 20 → 24 | 11 → 15 |
| `HYBRID_C_SECTOR` | 18 | M4 level-complete trigger 10 → 12; the life capsule's spawn call 6 → 8 | 0 → 2 (the life spawn goes to the window if short) |
| arena | 35 | M3-H +83 −143 (→ 95), the lifted ramp 4, then a lever of 91 | 91 |
| `BROADSIDE` pins | 103 + 16 | M3-H 98 + 6 | 15 |
| `PICKUP_CODE` tail | 65 | M3-H 32 (RAM), item 22 15 → 30, capsule colours 10 → 12 | 8 → −9 (item 22's data form, 15 B, fits) |

### 4.3 The initial block

| Point | Bytes to STOP (13,652) | Basis |
| --- | ---: | --- |
| today | 34 | manifest 13,618 |
| the silhouette table moves out (§3.6) | ≈ 74 (−40 packed, **G** on packing) | **IC** |
| K1's hooks | 62 | budget §2 M6 (10 → 12) |
| nothing else in this plan touches `CODE`, `RODATA`, `STARFIELD` or `ENTITY_CODE` beyond byte-neutral re-points | 62 | §3 |

### 4.4 The boss overlay slots, with S5

| Slot | Free today | S5 needs | Torpedo (§3.5) | Left, expected → budgeted |
| --- | ---: | --- | --- | ---: |
| A (2,048) | 6 | 0 (regions are data; the finale volleys use the salvo kind that exists) | 0 (operand re-points) | 6 |
| C (2,048; 13 sectors) | 168 | the second phase (a cooldown step when the last plate falls, the finale volleys) 60 → 120 (**G**) | the kill flag 12 → 15 | 96 → 33 |
| D (`$1900-$1FFF`) | 9 | 0 (the region-1 looks leave its head only if the home moves) | 0 | 9 |
| **E (576; 2 sectors)** | **310** | the per-region look table 98 → 110 | 150 → 260 | **62 → −60** |
| scratch (256) | 12 | 0 | 0 | 12 |
| install (384) | 32 | 0 | 0 | 32 |
| region charset (1,024) | 48 B, 6 codes | R2–R4 each ≤ 1,024 B / 128 codes | 0 | per region |
| disk, regions 632–695 | 64 sectors reserved | 4 × 16 | 0 | 0 |
| **boss entry** | 64 sectors, 245 frames | +0 … +1 (the look table's home) | +1 … +2 (slot E 3 … 4 sectors) | **249 … 257 against the 250 bound** |

**Per-region overlays (owner requirement for S5 Phase A, 2026-10-08).**
Region-specific boss code — the R3 force field, the final boss's salvo
behaviour beyond the engine's `BOSS_KIND_SALVO`, R2's escort, each region's
look table — is priced as **a per-region run read at the boss entry into
slot E** (or a slot F if S5 finds one), so only the current region's code is
resident in its boss sector. Slot E then holds the torpedo's 200-B reserve
plus the largest region's run: look table 98 → 110 and region code **R1 0,
R2 escort 40 → 80 (G), R3 force field 150 → 300 (G; P1 / P2 are reserved for
it), R4 salvos 60 → 120 (G)** — a worst region of **~260 → 410 B**, against
slot E's 376 B left after the reserve: it fits on expected figures and is
~35 B over on budgeted ones for R3. S5 Phase A measures each region's code
as a probe and decides between trimming, a slot F in the capital group's
resident half (the second capital slot, below) and the `$1900-$1FFF` ceiling
of slot D. The entry's sectors then vary per region (slot E 3 … 5 sectors);
**every region's entry is measured against the 260-frame bound** (§3.5).

Slot E is the only slot with room and it is **short by ~60 B on budgeted
figures with both S5's table and the torpedo**, before the per-region design
above moves region code out of the shared slots. The reserve to decide before
S5 (Q6): **200 B of slot E for the torpedo** (slot E read as 4 sectors; S5's
look table then goes to the region's own run, +1 sector for a region whose
charset run is full, as region 1's is: 976 of 1,024) and **the entry bound
250 → 260**. The structural lever is the **second capital overlay slot**: the
capital group's resident ~1,750 B of `BROADSIDE` run only while a hull is on
screen, so a slot over them (restored by a 30-sector run instead of 16 after
a boss, behind the summary's 3-s minimum: +53 frames EMULATOR) gives the boss
and the capital items (§3.9) ~1,700 B at once, at risk 3 (the regrouping M5a-S1
did for slot A). Not needed for the torpedo on expected figures; needed for
any capital-phase code and for a boss richer than S5's data.

### 4.5 Transport and records

The window's record 8 (10 sectors, 76 packed B spare) and the Light kernel's
record 9 (92 spare) take ~1,100 → 1,400 raw B of new window code over the
road at 0.78 / 0.89 → **+8 … +11 sectors, +8 … +22 ATR menu frames** at 1–2 a
sector (step 5 measured 1): 551 → 559 … 573 against the 603 limit. Record 2
(127 raw spare) takes item 22 and M4's sector bytes without a sector; record
7 (28 spare) takes the ramp's 4 B. **No new boot sector, no initial-block
growth** (§4.3). The boss entry is §4.4's.

### 4.6 Cycles and DMA on the worst rows

| Row family (today, **M**) | After the recommended items (expected → budgeted) | Basis |
| --- | ---: | --- |
| binding row 1,472 (a Raider spawn on a rotate frame, one escort Light) | sector flow −90 → −130; M3-H spawn-time −260 (m3 §6.1: 1,307 → 1,175 class); weapon profiles −90; K1 −106 (budget); the torpedo's fire test −18 → **~900 → 770 over GO**, i.e. **~1,400 → 1,270** | §3.8, m3 §6.1 |
| Raider kill and standing rows 2,944 … 5,055 | +930 from the descent rule (M3-H) | m3 §6.1 |
| the swarm's worst row 9,137 (three Lights) | −690 → −1,190 with three paths | §2.2 |
| DMA-on maximum 31,304 | **unchanged**: every item is pre-fence or boss-phase | m3 §1.4 |
| boss frames: stress 8,434 of 8,500 | the torpedo's flight +250 → 300 native must not coincide with the two-laser worst case; S5's second phase is fire policy (cheap) | §3.5 |
| capital frames ≤ 18,374 wall | nacelles +60 → 100, an emplacement +150 … 360, a Light +~900 … 3,000 | §3.9 |

---

## 5. The milestone order and the sessions to the freeze

**The order adopted by the owner (2026-10-08; order B of §4.1):** sector
flow → S5 → M3-H → M3 → window levers (with the menu-data overlay and the
Light kernel move, Q15) → M4 → M6 boosters → M6 torpedo → the attract mode
(the demo alone) → the freeze.

| # | Session | Branch | Scope | Window | Leaves the game shippable because |
| --- | --- | --- | --- | ---: | --- |
| 1 | **Sector flow** | `feat/sector-flow` | §3.8: C1, `afterCleared`, the early end; level 1's post-capital data re-cut (the W2 reserves dropped, the Bomber `afterCleared`, a second swarm or chained waves on the existing archetypes); the timeline pins; evidence regenerated | −110 → −140 | data-only variety ships at once; no visible code risk beyond the Director's tick; the worst row stays > 1,300 |
| 2 | **S5** | `feat/boss-regions` | as m5 §8: regions 2–4, the second phase, the look-table home, with **Q6's reserve left in slot E and the bound as the owner answers** | 0 | `v0.3.0` after it, as planned |
| 3 | **M3-H session 1** | `feat/heavy-package` | m3 §7 session 1 + the weapon profiles (§3.3) + the lifted ramp (§3.4) | −333 → −352 (+40 → 50, +4 arena) | level 1 gains slower, armoured, stop-and-shoot Raiders and readable 1-HP Bombers; evidence re-scripted once |
| 4 | **M3-H session 2** | `feat/heavy-looks` | the armoured look, the damage holes | −99 → −114 | hardware-critical, reviewed on its own |
| 5 | **M3 session 3** | `feat/wave-paths` | the evaluator, the paths, the chained swarms (§3.1–3.2) as level 1 and level 2 data | −496 → −524 | the window is at 107 → 5 after it: the next session is the lever session |
| 6 | **Window levers** (owner, Q15, 2026-10-08) | `chore/window-levers` | the `STARFIELD` tail, `LEVEL_BUFFER` 16 → 15, the arena and the pins (537); **the menu-data overlay** (§8.3 L1a: the menu screens, music, star tables, display lists and H3.1 glyphs into a run read at every menu entry into `$0C00-$1FFF`) **and the Light kernel moved into the `MAIN` holes** `$3615-$3997` (§8.5, record 9's destination) | **+537, +902** | no visible change but a short read at every menu entry; addresses in `RODATA`, `STARFIELD`, `ENTITY_CODE` and the kernel's vectors move, so the harness pins, the boot baseline and the memory map are re-recorded once; the kernel's page crossings proven on both builds; evidence regenerated |
| 7 | **M4** | as budget §2 M4 | the campaign loop, K's lives, the initials entry | −300 → −360 | twelve levels playable; W2 F1's data rule is C1's now |
| 8 | **M6 boosters** | `feat/boosters` | K1, item 22, the life and repair capsules (§3.6–3.7), the per-type colour | −280 → −345 | the window is now negative on budgeted figures: the attract mode gives way or the fighter overlay lands here |
| 9 | **M6 torpedo** | `feat/proton-torpedo` | §3.5 in slot E / C with the resident veneers; **the entry measured, STOP over 260 host frames**; module durability rebalanced in data; the fight length reported per difficulty | −65 → −80 | boss-only; the fight inside 90–120 s on MEDIUM |
| 10 | **Attract mode (the demo alone); item 24** | `feat/attract-mode` | §3.10: the demo's input stream, the idle timer, the `DEMO` label and the exit on FIRE added to the menu overlay session 6 built; item 24's 50 → 60 B of window | −50 → −60 | the last code item before the freeze; 0 window for the attract mode itself |
| — | **the freeze** | | M7 content (data), M8 balance (data), M9 release | | |

**Applied (owner answer to Q15, 2026-10-08):** session 6 builds the
menu-data overlay and moves the Light kernel into the `MAIN` holes (+902 B
of window, §8.5); session 10 adds only the demo to that overlay. The
window ledger of the adopted order is §8.5's right-hand column: it ends
**+836 expected / +579 budgeted**.

Why M3 + M3-H before M4 (Q1, adopted): the owner's complaint is level 1's variety
now; M3-H re-scripts level 1's replays once (slower Raiders) and M4 would
otherwise re-script them again for levels 2–12; the whole of M3 + M3-H fits
today's window with the lever session after it, whereas in today's order the
lever session interrupts M3 between sessions 2 and 3; and M4's own
prerequisite (C1) ships in session 1 either way. The cost: the campaign loop
(twelve levels in one game) comes three sessions later.

**What is dropped or deferred by this plan:** the half-aimed shot (Q2,
decided: no), a fourth authored shot look, a per-stage hue change, the Nova's large
detonation, the fast loader (M9, optional), the capital-sector items (M7 /
after 1.0), a HUD mark for the torpedo.

---

## 6. Owner decisions of 2026-10-08, recorded

Recorded in [../owner-decisions-2026-09-11.md](../owner-decisions-2026-09-11.md)
§AE (the journal) and applied here:

1. **The proton torpedo** replaces the planned Nova Missile: boss sector only;
   one torpedo per capsule; it destroys one boss module (plate, gun or
   emitter) at once. Priced §3.5; how it is fired, its reserve and the entry
   bound are Q3, Q6, Q7.
2. **The +1 life booster**: rare but never zero, a clearly different colour or
   icon; at most eight lives. Priced §3.6; the rule is Q8.
3. **The hull-restore booster** (restores the player's HULL). Priced §3.7; the
   rule is Q9.
4. **The goals of items 1–4, 8 and 9**: chained Light waves with envelopes, at
   most three Lights; the envelope set confirmed; Raiders used beyond "alone
   or with an escort" (kinds, stop-and-shoot, weapon profiles, looks); Bombers
   that show their damage; dead time between waves measured and reduced by
   the Director's sector flow; more between capital ships — each priced in
   §3, placed in §5, with its open question in §7.

5. **The owner's answers of 2026-10-08 to §7** (recorded in §7.1 and in the
   journal §AE): order B; no half-aimed shot; the Nova firing rule; Bomber
   holes and the lifted ramp; 200 B of slot E reserved and the entry bound
   260 as a measured limit; per-region boss overlays as an S5 Phase A
   requirement; every boss capsule a torpedo with the fight rebalanced in
   data; the life capsule drawn rarely at random, never zero, at most once a
   level; the repair capsule in the rotation of six; the sector-flow rules as
   every level's default; the attract mode as a menu-phase overlay.

Standing decisions this plan works under and does not reopen: ATR only;
`LEVEL_MAX_ID` 16; 16-sector level image; no new boot sector, initial block ≤
13,652, ATR menu delta ≤ +7; GO ≥ 500, the 32,568 gate, the stress limits
7,000 / 8,500; decision AD; decision 8; the Director caps; the boss's lasers
and P1 / P2 reservation; the 90–120 s MEDIUM fight; the capsule rules; lives
at most eight; aimed shots and backward flight out of 1.0 (Q2 asks about the
half-aimed shot only, as the owner allowed).

---

## 7. Owner questions

**The table below is the record of what was asked and recommended on
2026-10-08; the owner's answers, given the same day, are §7.1 and override
it where they differ (Q12).**

| # | Question | Recommended answer | Cost of the recommendation | The alternative and its cost |
| ---: | --- | --- | --- | --- |
| **Q1** | M3 + M3-H before M4 (order B), or today's order (A)? | **Order B**, with the sector-flow session first in either case | the campaign loop three sessions later; the lever session after M3 instead of inside it | order A: M4's loop first; the lever session between M3-H and M3; the variety items land ~4 sessions later |
| **Q2** | The half-aimed Raider shot (reopens "no aimed shots") | **No** | 0 | 60 → 80 B of window **plus** initial-block publication bytes and 5 B RAM; +130 … 330 of margin on dense rows; the publication path is hardware-critical (§3.3) |
| **Q3** | How the torpedo is fired with one button | **The Nova rule**: a held FIRE at collection does nothing; release, and the next new press launches it instead of the shot | window 40 → 50; +8 native on fire frames | a hold of ≥ 25 frames launches (ambiguous with Rapid Fire's held trigger, +10 B); launch at collection straight up (0 input, no aiming, −30 B) |
| **Q4** | Bomber damage: graphics, colour or both | **Both**: the holes (M3-H variant C) and the lifted ramp so 1 HP reads at luminance 4 | 114 → 130 window ASM + 40 pin + 32 RAM; 4 B arena; 0 cycles a frame | holes only: the 1-HP Bomber still vanishes; ramp only: 4 B, no look change |
| **Q5** | The HUD lives display | **No change needed**: `LIFE 8` fits the one digit cell | 0 | an icon × digit form would cost the cells the HUD does not have |
| **Q6** | How much boss overlay room to reserve for the torpedo before S5, and the entry bound | **200 B of slot E (read as 4 sectors) and the bound 250 → 260 host frames**; S5's per-region look table goes to each region's own run (+1 sector for a region whose charset run is full) | +2 sectors at the entry (≈ +8 frames: 253); the WARNING screen 5.0 → 5.1 s | reserve nothing: the torpedo waits for the second capital overlay slot (§4.4, risk 3) or is dropped; reserve 300 B: S5's second phase loses slot E as a fallback home |
| **Q7** | The capsule rule in the boss sector with the torpedo | **Every boss-sector capsule is a torpedo** (every third destroyed module, never the defeating kill, the level's booster rotation untouched) | the fight ~15–30 % shorter on MEDIUM (G); `hpScale` or the cadence (every fourth module) restores 90–120 s in S5 / M8 | alternate torpedo / booster: +8 B, half as many torpedoes; a booster never drops in a boss sector: the same bytes, no variety |
| **Q8** | The +1 life capsule's rule | **One a level, spawned by the capital sector's completion**; at 8 lives it spawns as a repair capsule | `HYBRID_C_SECTOR` 6 → 8, window 20 → 24; bounded: 3 + 5 + 12 clamped at 8 | from the rotation (every Nth capsule): kill-dependent, so it can be zero on a bad level, and at the bot's ~8–10 capsules a level N must be ≥ 8 to stay rare |
| **Q9** | The hull-restore capsule's rule | **The rotation of six**: Rapid, Spread, Shield, Rapid, Spread, Repair | 6 B table; a repair every 18 qualifying kills | a repair after each life lost (+10 B; makes a death cheaper); from the capital's end with the life capsule (two capsules at once is not possible: one slot) |
| **Q10** | The sector-flow rules as the default for every level: the row count becomes the no-kill cut; `afterCleared` waits for the Lights too | **Yes to both** | §3.8; the authored rows of level 2's long sectors become cuts, not durations | row count as a minimum as well (a sector never ends early): the tails stay; `afterCleared` on the Heavy only: a wave arms under a drifting escort |
| **Q11** | The fast SIO loader | **Not now** (M9, optional, after the owner's hardware smoke of the entry) | 0 | reader 84 → 100 B now against 38 free; hardware-trust |
| **Q12** | The attract mode gives way first if the window is short at M6 (the M5 plan's rule), and the fighter-phase overlay in `$1900-$1FFF` is the next lever | **Yes to both** | 240 B returned; the overlay +30 … 53 frames a level start, risk 3–4 | the M3 cuts (195: +12 cycles a tracking frame, one damage stage, the dodge, the volley in the arena) |
| **Q13** | The capital-sector items (nacelles, the second emplacement, a Light in a capital sector) | **Later**: nacelles and the emplacement in M7 with the second capital slot; the capital Light after 1.0 | 0 now | each needs capital-phase code room that slot A no longer has (§3.9, §4.4) |
| **Q14** | The weapon profiles' triples and which free `wave_flags` bits they take (5 and 7 on Heavy waves) | **As §3.3**: single 1, double 2 × 6 frames, burst = today's 5 × 15; the owner edits the triples in `assets/levels/*.json` through the compiler's vocabulary | 30 → 40 B window | a profile per archetype record (0 B, no per-wave choice) |

### 7.1 The owner's answers (2026-10-08)

| # | Answer | Applied in |
| ---: | --- | --- |
| Q1 | **Order B** — M3 + M3-H before M4; the proposed order adopted: sector flow → S5 → M3-H → M3 → window levers → M4 → M6 boosters → M6 torpedo → freeze | §5, §4.1; `plan-realizacji.md` §0's dated note |
| Q2 | **No** half-aimed shot; "no aimed shots" stays | §3.3 |
| Q3 | **The Nova release-then-press rule** | §3.5 |
| Q4 | **Both** — the holes (variant C) and the lifted luminance ramp | §3.4 |
| Q5 | adopted as recommended (no HUD change) — changes no gate, limit or decision | §1.8 |
| Q6 | **200 B of slot E reserved** for the torpedo before S5; **the boss-entry bound 250 → 260 host frames as a measured limit**: the torpedo session measures the entry and STOPs over 260. **S5 Phase A requirement:** region-specific boss code (R3 force field, final salvos, R2 escort, region look tables) priced as per-region overlays read at the boss entry, so only the current region's code is resident; S5's full needs priced against slot E with that design | §3.5, §4.4 |
| Q7 | **Yes**, every boss capsule is a torpedo; the fight stays within MEDIUM 90–120 s: the torpedo session rebalances module durability in data and reports the fight length per difficulty | §3.5, §5 |
| Q8 | **Drawn rarely at random (never zero), at most once a level** | §3.6 |
| Q9 | **The rotation of six** | §3.7 |
| Q10 | **Yes**, the sector-flow rules are every level's default | §3.8 |
| Q11 | adopted as recommended (the fast loader not now; M9 optional) — the M5 plan already has it so; changes no gate or decision | §3.8 |
| Q12 | **the first half withdrawn by the owner**: the attract mode is a must-have and a menu-phase overlay, not the first cut; the fighter-phase overlay in `$1900-$1FFF` stays a priced lever, not taken | §3.10, §4.1 |
| Q13 | adopted as recommended (the capital items later: nacelles and the emplacement in M7, the capital Light after 1.0) — decision 1 of director-4.6 §11 and budget §5.2 items 9 and 13 stand unchanged | §3.9 |
| Q14 | adopted as recommended (the profile triples as §3.3; `wave_flags` bits 5 and 7 on Heavy waves) — changes no gate or decision | §3.3 |

Of the questions the owner did not answer directly (Q5, Q11, Q13, Q14),
none changes a gate, a budget limit or a recorded owner decision, so each is
adopted as recommended; **none needs a STOP.**

---

## 8. Resident constant data — the inventory and three levers (owner request, 2026-10-08)

### 8.1 Method and totals

`node scripts/measure-resident-data.mjs` (committed; `--json=…` for the
full list, `--min=N` for the detail threshold) walks every always-resident
link's listing and map (`main`, `encounter-director`, `light-kernel`,
`sector-reader`, `integration-glue`, `capital-player-collision`) and the
session-resident `level-summary`, sizes every byte-emitting line by the
offset difference to the next emission of its segment (the listing prints at
most twelve bytes a line), classifies it CODE / DATA / RES, merges DATA under
its label, and reads each run's bytes from the runtime image for duplicate
detection. **Every byte figure below is MEASURED** from `build/*.lst`,
`build/*.map` and the image; the phases that read a table and the packed
ratios are from the source (file:line given) and the manifest.

| Home | Load record | Packed | Constant data (B) | Of the home's size |
| --- | --- | --- | ---: | ---: |
| `CODE` | initial block | no | 71 (21 small runs) | 4,464 |
| `RODATA` | initial block | no (the loader bitmap and the loader display list are LZSS blobs inside it) | **3,497** | 3,714 |
| `BOOT_STAGE2`, `BOOT_SPLASH`, `A2_KERNEL` | initial block | no | 15 + 41 + 8 | 1,332 + 512 + 237 |
| `STARFIELD` | initial block, two LZ streams (2,039 raw → 1,750 packed, **0.86 M**) | yes | **639** | 2,039 |
| `ENTITY_CODE` | initial block, LZ (3,156 → 2,786, **0.88 M**) | yes | **596** | 3,156 |
| `BROADSIDE` | record 1, LZ (6,653 → 5,525, **0.83 M**) | yes | **918** | 6,653 |
| `PICKUP_CODE` + `HYBRID_C_SECTOR` | record 2 | no | 39 | 944 + 230 |
| `GLUE` + low C (`DIRECTOR_C_LOW`, `ENEMY_ARCHETYPE_DATA`) | record 4, LZ | yes | 16 + 48 | 250 + 68 + 48 |
| `HYBRID_C_EXT` (+ `LIGHT_CODE`, `HEAVY_CODE`) | record 5 | no | 0 | 681 + 131 |
| arena (`HYBRID_ASM_ARENA`, C, `RODATA`) | record 7, LZ | yes | 32 + 39 | 797 |
| window C half (`HYBRID_C_WINDOW`, `HYBRID_ASM_WINDOW`) | record 8, LZ | yes | **30** | 1,497 |
| Light kernel (+ `DISK_GUARD`, `CAPITAL_VECTOR_IMAGE`) | record 9, LZ | yes | 3 (+ the 36-B vector image, emitted as code) | 902 |
| `SECTOR_READER` | record 10 | no | 218 | 1,498 |
| `DIRECTOR_RAM` (`DIRECTOR_C_PRE`, `RODATA`, `CODE`) | record 11, LZ | yes | 20 | 631 |
| `LEVEL_SUMMARY` (`$0500`, session) | disk 584–595, read once a session | no | 235 | 1,760 |
| **total** | | | **6,230 raw**; in the initial block **3,632 raw + 1,235 raw packed ≈ 4,700 B (35 % of 13,618)** | |

### 8.2 The tables (every run of at least 16 B; smaller runs aggregated)

Phases: **boot** (stage 2 and cold init), **splash**, **menu** (and GAME
OVER, TOP SCORES, OPTIONS), **loading** (the summary screen and the level
read), **fighter**, **capital**, **boss**, **summary**, **pause**. "Once"
means the table is read once and copied, so a packed or disk-loaded form
needs no per-frame cost.

| Address | Segment (record) | Symbol | B | Read by | Phases | Packed | Source |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `$3188` | `RODATA` (initial) | `hud_ascii` | 26 | the HUD build at START GAME | fighter start | no | `src/main.s:7292` |
| `$31AA` | `RODATA` | `frontend_screen_data` | 18 | menu construction | menu | no | `:7300` |
| `$31BF` | `RODATA` | `shared_fighter_explosion_masks` | 48 | the player's and the Heavy's explosion, per frame | fighter, capital, boss | no | `:7309` |
| `$31F5` / `$3205` | `RODATA` | `player_shape`, `player_engine_shape` | 16 + 16 | the player draw, per frame | fighter, capital, boss | no | `:7316`, `:7334` |
| `$3215` | `RODATA` | **the gameplay charset block**, 1,024 B: `charset_data` 128 + the fixed cells 248 (`:7640`, `:7664`), `player_fighter_projectile_glyph_head` 40 (`:7671`), `loader_display_list_lzss` 35 (an LZSS blob, boot), 21 B of small runs, `capital_hull_glyphs` 248 (`:7708`), `frontend_glyph_rows` 301 (`:7716`) | 1,024 | `copy_charset` (`:3366`) copies the whole block to `CHARSET` **once at cold init** (`:11581`); `copy_frontend_charset` / `copy_hud_charset` read `frontend_glyph_rows` **once** (`:11582-11583`); `publish_level_hull_style` (`:7813`) re-reads `capital_hull_glyphs` **at every level start** (`:2630`); the projectile head is read at START GAME (`:3992`) | boot (once); the hull glyphs at each level start | no, except the 35-B display list | `:7640-7718` |
| `$3615` | `RODATA` | `main_menu_screen_data` 88, `options_screen_data` 38, `top_scores_screen_data` 41, `exit_screen_data` 25, `ended_screen_data` 47, `game_over_screen_data` 68, `frontend_marker_positions` 26, `top_score_row_template` 20 | 353 | copied to screen RAM at each screen entry | menu, game over, campaign end | no | `:7729-7950` |
| `$3825` | `RODATA` | `loader_bitmap_lzss` | 1,967 | `unpack_loader_bitmap` (`:3292`, the LZ-10/5 decoder, resident in `CODE`) **once at boot** (`:1287`); 7,680 B unpacked (0.26) | boot (the loading screen) | **yes** | `scripts/loader-assets.mjs` |
| — | `RODATA` | 11 small runs | 53 | various | — | no | — |
| `$5A32` | `STARFIELD` (initial, LZ 0.86) | **the menu music data** (`EMIT_MENU_MUSIC_DATA`, under the label `music_player_end`) | 514 | the menu music player, per frame | **menu only** | yes (≈ 442 packed, AN at the stream ratio) | `:6363`, `assets/music/menu-theme.json` |
| `$5C34` | `STARFIELD` | `menu_star_screen_low`, `menu_star_glyph` and the star phase / cycle / shape tables | 32 + 45 small | `build_menu_star_glyphs` (`:7396`), the twinkle, per frame | **menu only** | yes | `:6434-6450` |
| `$5C91` | `STARFIELD` | `fighter_pickup_pmg_shape` | 48 | `render_fighter_pickup_pmg`, per frame while a capsule shows | fighter, boss | yes | `:11522` |
| `$67FB` | `BROADSIDE` (record 1, LZ 0.83; **the resident half, below slot A**) | `allied_hull_packed_map` 160, `allied_hull_codebook` 16, `allied_collision_boundaries` 32, `enemy_collision_boundaries` 32, `allied_sector_module_sources` 96, `enemy_sector_module_sources` 96, `allied_prow_occupancy_masks` 32, `enemy_prow_occupancy_masks` 32, `allied_prow_collision_boundaries` 32, `enemy_prow_collision_boundaries` 32, `capital_explosion_phases` 54, `capital_explosion_sound_frequency` 24, `capital_explosion_sound_control` 24 | **662** | the hull row builder, the contact, the explosions | **capital only** | yes | `:7855-7937` |
| `$6B4C` | `BROADSIDE` | `pause_screen_data` 68, `pause_quit_screen_data` 42 | 110 | the pause screen draw | **pause only** | yes | `:7979`, `:7992` |
| `$7765` | `BROADSIDE` | `enemy_body_data` 48 (+ `enemy_accent_data`, small) | 48 | `draw_enemy_member`, per moved frame | fighter | yes | `:9987` |
| — | `BROADSIDE` | 22 small runs | 98 | various | — | yes | — |
| `$7C52` | arena (record 7, LZ) | `hostile_weapon_visual_glyphs` | 32 | the hostile look install into the charset | boot / level start (once) | yes | `src/hybrid/c-asm-abi.s:508` |
| — | arena `RODATA` | 9 small runs (lane tables, the formation start, the profile field list) | 39 | the Heavy spawn and tick | fighter | yes | `src/c/lifecycle.c:1328-1363` |
| `$8AEF` | `PICKUP_CODE` (record 2, raw) | `heavy_breakup_offsets` 20 (+ 19 small) | 39 | the Heavy break-up spawn | fighter | no | `src/main.s:12150` |
| `$8C7D` | `ENEMY_ARCHETYPE_DATA` (record 4, LZ) | `_enemy_archetypes` | 48 | every Light tick, every Heavy spawn | fighter | yes | `src/c/lifecycle.c:213` |
| `$9400` | `ENTITY_CODE` (initial, LZ 0.88) | `main_menu_display_list` 62, `options_display_list` 48, `top_scores_display_list` 60, `game_over_display_list` 43, `frontend_text_display_list` 32, `difficulty_value_table` 18 | 263 | the frontend's display lists, read in place by ANTIC | **menu only** | yes | `src/main.s:7433-7618`, `:7470` |
| `$9AEB` | `ENTITY_CODE` | `frontend_h31_extended_glyphs` | 128 | `copy_frontend_charset` **once at cold init** | boot (menu font) | yes | `:11489` |
| `$9B6B` | `ENTITY_CODE` | `effect_growth_glyph` 16, `entity_debris_glyph` 64, `effect_fragment_glyph` 16 | 96 | copied into the charset once (`:11420`) | boot (once) | yes | `:11496-11501` |
| `$9D22` | `ENTITY_CODE` | `light_glyph`, `light_interceptor_glyph` | 32 | the Light look install at admission | fighter | yes | `:13027`, `:13040` |
| — | `ENTITY_CODE` | 16 small runs | 77 | various | — | yes | — |
| `$9D75` | `DIRECTOR_C_RODATA` (record 11, LZ) | the ceilings, the spacing floors, the hazard tables | 20 | the Director | fighter | yes | `src/c/director.c:193-218` |
| `$B3BB` | `HYBRID_ASM_WINDOW` (record 8, LZ) — **the window** | `boss_warning_records` | 30 | the WARNING screen's text records | boss entry only | yes | `src/hybrid/c-asm-abi.s:664` |
| `$A4F6` | `SECTOR_READER` (record 10, raw) | `failure_records` 21, `title_record` 18, `sr_engaging_record` 25, `failure_reasons` 40, `sector_reader_directory` 48, `overlay_directory` 50, 3 small | 218 | the loader's text and the run directories | loading, boss entry, summary | no | `src/hybrid/sector-reader.s:1206-1243` |
| `$0A05` | `LEVEL_SUMMARY` (disk, session) | the boss-restore tables 48, two display lists 75, the level sums 32, 26 small | 235 | the summary screen | summary | no | `src/hybrid/level-summary.s` |
| `$4EFE`, `$2000`, `$0500`, `$21C1`, `$9000` | `GLUE`, `CODE`, `BOOT_SPLASH`, `BOOT_STAGE2`, `A2_KERNEL` | small runs only | 16 + 71 + 41 + 15 + 8 | — | boot / various | no | — |

Not constant data, and not in the table: `.res` reservations (RAM state) and
the level image's blocks (per level, disk).

### 8.3 Three levers per table, and what each returns

Returns are to **the initial block (IB)** or **the `$AE00` window (W)**; a
third column names resident RAM that is neither — `BROADSIDE` room a
window-destined ASM routine could be linked into instead (not a window byte,
but the same scarcity).

**L1 — move phase-only data into an overlay or a disk-loaded block.**

| Tables | Phase | Mechanism | Returns IB | Returns W | Cost / risk | Basis |
| --- | --- | --- | ---: | ---: | --- | --- |
| **L1a** the menu's data: the menu screens 353 (`RODATA`), the menu music 514 and the star tables 77 (`STARFIELD`), the frontend display lists and the difficulty table 263 and the H3.1 extended glyphs 128 (`ENTITY_CODE`) — 1,335 raw | menu | **the menu-phase overlay the attract mode now needs** (§3.10): one run into `$0C00-$1FFF` read at every menu entry; the resident menu code addresses the tables at their slot addresses | **≈ 850 of transport** (≈ 442 + 66 + 232 + 113 packed `STARFIELD` / `ENTITY_CODE` source bytes, **AN** at the measured ratios 0.86 / 0.88) **plus 528 B of resident RAM at `$3615-$3824`** — not transport: `MAIN` is a filled 8 KB area of the image (`cfg/atari-boot.cfg:7`, `fill = yes`), so a hole in `RODATA` costs the boot sectors nothing and saves them nothing (**corrected 2026-10-08, second pass**; the first figure, 1,206, added the two) | 0 (**but see §8.5: the RAM hole is a home for window code**) | +≈ 11 sectors per menu entry (≈ 42 frames EMULATOR) on top of the attract stream; every `RODATA` / `STARFIELD` / `ENTITY_CODE` address after the moved tables shifts (risk 3: the harness's pinned labels, the boot baseline re-recorded, the memory map regenerated); the H3.1 glyphs are copied at cold init, so their copy moves to the overlay's install | **M** sizes |
| **L1b** the capital-phase tables, 662 B of the resident `BROADSIDE` half | capital | the **second capital overlay slot** of §4.4 (the capital group's resident ~1,750 B as a slot restored by a 30-sector run after a boss) | 0 | 0 (**662 B of resident `BROADSIDE` RAM**, record 1 ≈ −550 packed B ≈ −4 sectors) | the regrouping (risk 3) and +14 sectors at the post-boss transition behind the summary's 3-s minimum | **M** sizes |
| **L1c** the boot-read-once glyph sources: the charset block's 989 B less the hull glyphs (`RODATA`), the H3.1 glyphs 128 and the effect glyphs 96 (`ENTITY_CODE`), the hostile looks 32 (arena) | boot, once | an extension record read at boot and unpacked straight into the charsets (the mechanism of the 11 records); the hull glyphs 248 stay resident (re-read at every level start) | **≈ 741 raw `RODATA` + ≈ 197 packed `ENTITY_CODE`** (AN) | 0 | 11 of 11 DFMC records are used: the data rides an existing record's spare (record 2 127 raw, record 11 116, record 9 92, record 1 86) or lever 14's twelfth record (−16 B IB); +6 → 8 extension sectors (+6 → 16 menu frames); boot CPU for the unpack ≈ 1 frame per KB (**G**) against the ATR menu deadline (52 frames of slack today; it has been 0) | **M** sizes, **G** boot cost |
| L1d the pause screens 110 (`BROADSIDE`) | pause | a 1-sector read at every pause | 0 | 0 (110 B `BROADSIDE`) | a disk read inside a pause (4 frames); not worth it | — |
| L1e `boss_warning_records` 30 (**the window**) | boss entry | the boss install run (the records are shown while the entry reads, so they must land first: the first run of the entry) | 0 | **30** | 0 sectors (the install run has 32 B free) | **M** |
| L1f the sector reader's texts 83 | loading | the summary art run (the loader's text already lives there since M5a-S2 for the summary) | 0 | 0 (83 B of reader; its tail is 38) | the WARNING / failure screens need them before any run is read | **M** |

**L2 — LZSS-pack data that is unpacked once** (the decoder exists:
`unpack_loader_bitmap`, LZ-10/5, 46 B, resident in `CODE`; a second call
site costs ~12 B).

| Tables | Today | Packed (G) | Returns IB | Returns W | Cost / risk | Basis |
| --- | --- | --- | ---: | ---: | --- | --- |
| **L2a** the charset block's raw 989 B (`RODATA`), copied once at cold init | raw | 0.6 → 0.8 (**G**; glyph rows pack worse than the bitmap's 0.26 and better than code's 0.86) | **≈ 200 → 400 of `MAIN` RAM, 0 of transport by itself** (the filled `MAIN` area again; it becomes transport only if a packed source now in `BOOTTAIL` is relocated into the hole, a build change, **G**) | 0 | the unpack lands directly in `CHARSET`; `publish_level_hull_style` then needs the hull glyphs' 248 B from a resident source: keep them raw (returns ≈ 150 → 300 instead) or unpack them into the pause backup at each level start (+1 KB of copies); boot CPU ≈ 1 frame (**G**) against the deadline | **M** sizes |
| **L2b** the menu screen texts 353 (`RODATA`), copied to screen RAM at each screen entry | raw | 0.5 → 0.7 (**G**; text) | **≈ 100 → 180** | 0 | the decoder writes to screen RAM at each entry (the menu already pays a build); or inside L1a's overlay for free | **M** sizes |
| L2c `BOOT_SPLASH` (512: 469 code) and `A2_KERNEL` (237) | raw | code at ≈ 0.86 | 10 → 57 net | 0 | budget §4.1 lever 12; the boot deadline risk | budget |
| not packable | the tables read in place every frame: the player shapes, the explosion masks, `hud_ascii`, `enemy_body_data`, the pickup shapes, the archetypes, the breakup offsets, the Director's and the arena's rodata (≈ 350 B in all) | — | 0 | 0 | packing them would need an unpack into RAM of the same size | — |

**L3 — remove duplicates** (by content, from the runtime image):

| Finding | Bytes | Returns | Basis |
| --- | ---: | --- | --- |
| **`allied_sector_module_sources` = `enemy_sector_module_sources`** (`$6917` / `$6977`, `BROADSIDE`): the two 96-B tables are byte-identical; the readers index by side | **96 B of `BROADSIDE`** (record 1 ≈ −80 packed): share one table through the enemy side's operand (2 → 3 B) | 0 IB, 0 W; 96 B of resident `BROADSIDE` (the pin M3-H is priced on gains it) | **M** |
| `player_fighter_projectile_glyph_head` (40 B) is contained in the charset block | 0 | not a duplicate: the head **is** the charset's cells 16–20, read once at START GAME; one copy | **M** |
| `CAPITAL_VECTOR_IMAGE` (36 B, record 9) = the window's capital vector table | 0 | by design: the restore source the reader copies back after a boss (M5a-S1); a re-read of record 9 would cost a 7-sector read instead | **M** |
| the HUD charset | 0 | built from `frontend_glyph_rows` by `copy_hud_charset`; no second source | **M** |
| no other identical run of 8 B or more | — | — | **M** |

**Where moving the inline tables into `assets/` would make a lever easier.**
The inline tables in `src/main.s` — `charset_data` and the fixed cells (376
B), the menu screens (353), the menu display lists (263), the player shapes
(32), the explosion masks (48), `hud_ascii` (26), the pause screens (110),
the pickup shapes (48) — return nothing by moving to `assets/` with
byte-identical output, but each becomes a build input a converter can emit
**packed (L2)** or **as a run file (L1)** the way `scripts/loader-assets.mjs`
and `scripts/level-summary-assets.mjs` already do for the loader bitmap and
the summary art; the EMIT_* tables (the hull data, the music, the glyph
banks) are already there. So the planned texture-set preparation is the
first step of L1a and L2a, not a return in itself.

### 8.4 What the data levers add to the ledgers

| Ledger | Today | With L3 | With L3 + L2a + L2b | With L3 + L2 + L1a (the menu overlay) | Basis |
| --- | ---: | ---: | ---: | ---: | --- |
| initial block, bytes to STOP (§4.3) | 34 (62 after §3.6's table move and K1) | 62 | 62 (+ ≈ 200 → 400 only with a relocated packed source, **G**) | **≈ 900 → 1,300** (L1a's ≈ 850 of packed sources + L2's relocation) | **M** + **AN** + **G** as marked; corrected 2026-10-08, second pass: `MAIN` holes are RAM, not transport |
| resident RAM holes inside `MAIN` (`$2000-$3FFF`), usable by window code (§8.5) | **731** (`$3825-$3AFF`, free after boot today) | 731 | 731 (+ ≈ 200 → 400 with L2a) | **1,259** (`$3615-$3AFF`, with L1a) | **M** |
| `$AE00` window | 1,185 | 1,185 | 1,185 | 1,185 (+30 with L1e) | §4.1 unchanged |
| resident `BROADSIDE` room (the pins 119, the tail 3) | 122 | **218** | 218 | 218 (+662 with L1b) | **M** |
| extension sectors / menu frames | 105 / 551 | 104 / ≈ 549 | 104 | +≈ 11 per menu entry (disk, not transport) | **M** |

So the data levers return ≈ 850 → 1,300 B of transport (lever 11's "menu
music and frontend tables out of the initial block" becomes L1a at risk 3
instead of 4, because the menu overlay exists for the attract mode anyway),
96 → 758 B of `BROADSIDE` room, **30 B of window directly — and, through the
`MAIN` holes of §8.5, up to 902 B of window indirectly.** The fighter-phase
overlay in `$1900-$1FFF` and the second capital slot remain the other
window-side levers.

### 8.5 The `MAIN` holes as a home for window code (owner follow-up, 2026-10-08)

**The question.** Is the RAM the menu-data overlay frees inside the initial
block free and usable during gameplay — not overwritten after boot,
reachable by gameplay code, without a load-order or address constraint — and
if so, what window code can move there?

**The RAM, exactly.** Two ranges inside `MAIN` (`$2000-$3FFF`, the raw 8-KB
half of the initial block, `cfg/atari-boot.cfg:7`):

| Range | Bytes | Today | After boot | Evidence |
| --- | ---: | --- | --- | --- |
| `$3825-$3AFF` | **731** | the lower part of the packed loader bitmap (`loader_bitmap_lzss`, 1,967 B at `$3825-$3FD3`) | **free**: the blob is consumed once by `unpack_loader_bitmap` in stage 2 (`src/main.s:1287`) before `show_loader` (`:1288`); from `$3B00` up PMG DMA owns the RAM (`PMG_BASE`, memory map "`$3800-$3FFF` — the PMG window"), below it nothing: the only symbol in the range is the blob itself (`build/void-strike-65.lbl`, MEASURED) | **M** |
| `$3615-$3824` | **528** | the menu screens, the marker positions, the top-score template, the missile mask tables (`:7729-7950`, §8.2) | **free once L1a moves the menu data to the menu overlay**; the four 3-B missile tables and `debris_contact_damage_by_difficulty` (15 B, read in play) move with the layout | **M** |
| together | **1,259** contiguous at `$3615-$3AFF` | | | |

Not overwritten after boot: no segment, cfg area, equate block or manifest
range claims either range in any phase but `boot` (the generated memory map,
rows `$3170-$37FF` and `$3825-$3FD3`); the loader's display list sits at
`$3C00` and the PMG pages at `$3B00`, both above. Reachable: absolute
addresses, as the arena (`$7BD0`), `HYBRID_C_SECTOR` (`$8602`) and
`DIRECTOR_C_LOW` (`$8B88`) already are — director-link areas placed in gaps
of the main link with a neighbour-guard assert (`cfg/encounter-director.cfg:65-73`).
The constraint is **when the bytes arrive**: anything linked raw into
`$3825-$3AFF` would collide with the packed bitmap in the image, so that
range can only be filled **after** stage 2's unpack — by an extension record
landing there (every record lands after `show_loader`: `finish_startup_after_loader`
runs the record reads; `:1288`, `:11566`) or by an unpack from a packed
source. `$3615-$3824` can take raw bytes in the image (the hole is paid for
either way) **or** a record. So: **yes, free and usable, with one load-order
rule — the record that fills `$3825+` is read in the loader phase, which is
where every extension record is read today.**

**What to move, and what it returns.**

| Candidate | Window bytes returned | Mechanism | Transport | Cycles | Page-crossing effect | Risk |
| --- | ---: | --- | --- | --- | --- | ---: |
| **The whole Light kernel link** — `LIGHT_KERNEL` 771 B (`light_update`, `light_publish`, `light_shot`, the backing and cell resolvers, the capital vector table) + `DISK_GUARD` 95 + `CAPITAL_VECTOR_IMAGE` 36 = **902 B**, record 9 | **902** | record 9's `finalDestination` becomes `$3615` instead of `$B3D9`: `cfg/light-kernel.cfg:16`'s start is rewritten by the build from `HYBRID_ASM_WINDOW_BASE` (`scripts/build.mjs:2342-2349`, the assert in `src/hybrid/light-kernel.s`); that derivation changes to the hole's address, the ABI include and the capital vector constants regenerate. **Needs L1a first** (731 B alone is too small for 902) | **0**: the same 7-sector record, another destination; the window record 8 unchanged | **0 inherent**: RAM is RAM; every call is `jsr` absolute; no bank or page register is involved | the kernel's loops carry taken branches: a branch that crosses a page costs +1, so the moved kernel is proven natively on both builds (`memory`: window layout page crossings); the boss head's vector image and the reader's restore copy read the table's new address (constants) | 3: the harness's `LIGHT_KERNEL_*` vector pins, the memory-integrity clauses' cold-RAM ranges, the boot baseline re-recorded |
| The Director's cold C — `director_c_try_event` 180, `enter_sector` 111, `archetype_allowed` 55, `heavy_ceiling` 46, `compute_ceiling_row` 54, `director_c_light_ceiling` 44, `encounter_light_admit` 40, `enemy_c_light_hit` 59, `compute_wave_end` 35, `director_c_release` 33, `light_reload` 29 (**M**, `build/encounter-director*.lst`) = **686 B**; the per-frame set (`light_tick_body` 428, `enemy_c_light_tick` 85, `light_wave_step` 64, `enemy_c_light_wave` 44, the tokens 47, `light_live_count` 34 = 702 B) may move too, nothing in the window is address-bound | up to **686** (or the whole C half, 1,388, if the holes allow) | `#pragma code-name` per function into a new director-link area at the hole (the arena precedent); the bytes reach RAM by a record — **the 12th DFMC record** (`scripts/chunk-loader.mjs:13` `MAX_CHUNKS = 11`; budget lever 14: −16 B of initial block for the manifest row) — or by the build splicing the area's bytes into `MAIN`'s image at `$3615` (raw, 0 transport, no record; **G** 40–80 lines of `scripts/build.mjs`) | the record route: ≈ 0.78 × 686 = 535 packed B → +5 extension sectors (+5 → 10 menu frames) and −16 B of initial block; the splice route: 0 | 0 inherent | the C half shrinks and shifts: the hot Light paths are re-proven (the same memory) | 3 |
| M3-H's window ASM (armoured half 96, punch 90, hole tables 24 = 210) and the `BROADSIDE` pin's 98 | 210 (+98 of pin) | lever 4's mechanism instead: `STARFIELD_RAM` ends lower and `BROADSIDE_RAM` starts lower (`cfg/atari-boot.cfg:18-19`), so record 1 lands from `$5A32` once the menu music (514) and the star tables (77) have left and the segment is reordered: **299 + 591 = 890 B** for main-link ASM | 210 → 308 | ≈ 0.83 × 210 in record 1 (+2 sectors) | 0 | the `BROADSIDE` labels the harness pins move | 3 |

**Recommendation: the Light kernel, whole, into `$3615-$3997`** — one
destination change, no new record, no splice, 902 B back to the window for 0
transport. It needs L1a, so the menu-data overlay (the attract session's
mechanism) must exist first; the attract session is the last code item in
§5, after the window goes negative at M6. **Therefore the window-levers
session (§5 item 6) should build the menu-data overlay and the kernel move,
and the attract session later only adds the demo's stream, timer and label
to that overlay.** That is a change to the adopted session list's contents,
not its order, and it is the owner's to confirm (Q15 below).

**The window ledger, order B, with the kernel move in the levers session**
(expected → budgeted, free):

| Point on the road | Without §8.5 | **With the Light kernel moved (+902)** |
| --- | ---: | ---: |
| today | 1,185 | 1,185 |
| after sector flow, S5 | 1,075 → 1,045 | 1,075 → 1,045 |
| after M3-H | 603 → 529 | 603 → 529 |
| after M3 | 107 → 5 | 107 → 5 |
| after the window levers (+537; +902) | 644 → 542 | **1,546 → 1,444** |
| after M4 | 344 → 182 | 1,246 → 1,084 |
| after M6 boosters | 49 → −183 | 951 → 719 |
| after the M6 torpedo | −16 → −263 | 886 → 639 |
| after item 24 | **−66 → −323** | **836 → 579** |
| the attract mode (menu overlay) | 0 | 0 |

With the kernel move the road ends **+836 expected / +579 budgeted**: no M3
cut, no fighter-phase overlay, and ~580 B of window left for what M7–M8 find
on hardware. The four earlier levers (537) are still counted; if the kernel
move is taken first, `LEVEL_BUFFER` 16 → 15 (128, risk 3) can be left alone
(+451 budgeted at the end instead of +579).

**Q15 — answered by the owner, 2026-10-08: yes.** The menu-data overlay
and the Light kernel move are built inside the window-levers session (§5
item 6), before M4; the attract-mode session keeps the demo alone. The cost
accepted: the levers session grows by two risk-3 changes (addresses in
`RODATA`, `STARFIELD`, `ENTITY_CODE` and the kernel's vectors move;
evidence regenerated once for both). Recorded in the journal §AE.

---

## 9. What this document did not do

No source, cfg, build-script, level, harness, scenario, clause, evidence,
`dist/` or `docs/media/` change; no build; no emulator run; no probe build;
no baseline worktree. Measured here: the dead-time probe over the committed
CSVs (`scripts/measure-dead-time.mjs`, committed), the fence-row scan by live
population over the same CSVs (a scratch script, not committed), the Heavy
member costs (`scripts/measure-heavy-member-costs.mjs`, committed earlier,
re-run), the hull codebook counts (`compileCapitalHulls` over every style),
the resident constant data (§8: `scripts/measure-resident-data.mjs`,
committed, over `build/*.lst`, `build/*.map` and the runtime image).
Not re-run, cited from their plans with the reason given in place: the path
evaluator prototype (m3 §1.3; the Light tick's code is unchanged since), the
Raider gate prototype (m3 §1.1), the boss stress (STATUS W2). Every **IC**,
**AN** and **G** figure is an estimate to be replaced by the session that
builds it; §4.1's road is a model on those figures. The journal entry (§6),
the dated notes in `plan-realizacji.md` §0 and `budget-1.0.md`, and the
STATUS paragraph were written with this plan; nothing else in the repository
is rewritten.
