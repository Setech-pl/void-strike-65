# The Interceptor a shot can catch

**Branch:** `fix/interceptor-speed` from `main` `2394f63` (the `fix/r4-immobile`
merge; ATR `fee54bea…`, boot `62e40077…`).
**Status:** implemented (Phase B, §10, the owner's answers of 2026-10-14),
pending the owner's smoke — `OWNER-SMOKE CANDIDATE`. Phase A (§0-§9) kept as
the record of the choice.

**The owner's finding (2026-10-14, after playing the latest builds):** the
Interceptor is far too fast — "even the player's shots can't catch it".
Wanted: an Interceptor the player aims at can be hit in every phase of its
flight; a shot fired straight at one climbing away reaches it before it
leaves the screen; its moves are readable; it still feels like the fastest,
most agile enemy, keeps its standoff (hovers above the player and fires, never
rams), in the swarm, as elite (a)'s companion and as the boss escort.

Labels: **M** measured on this branch — the Atari800 trace harness on the
debug routes (`build/[interceptor-speed-vN-]level-1-s0|s6`,
`build/[…-]boss-region-N-level-1-s0`; focused runs with `--hit-trace`, all 58
replays per build) or **M-N** the 6502 harness on the production main loop
(`scripts/measure-interceptor-catch.mjs`, `VS65_HARNESS_BUILD`); **IC** an
instruction count; **EST** an estimate, with its basis.

---

## 0. Recommendation

* **V1**, with two data edits: region 4's modules about a fifth lighter
  (probe `v1r4c`) and EASY's reload 56 → 40 (probe `v1e40`). **0 resident
  bytes**: every budget is `main`'s (the 3 B the column fix costs fit the
  window's 4-B pad; the reload and the hit points are data in place).
  - **The column fix:** the Interceptor centres on the ship, so the ship's
    own shot crosses it. This is the main cause (§2.2): on `main` a tracking
    Interceptor always sits one HPOS beside the shot's line.
  - **The climbs at 3 lines a frame** on screen (were 8; the shot climbs 6):
    a shot from below always closes at 3 lines a frame.
  - **The floor fit**, which the escort clock's 128-frame floor forces (§4):
    hover 100 → 64 frames, dive 2 → 4 lines a frame, the top phase 39 → 64
    frames, reload 56 / 44 / 32 → 56 / 31 / 20 (still 1 / 2 / 3 lasers a
    visit). Longest escort life **121** frames, as on `main`.
* **Every phase of every Interceptor is caught** by a shot fired from directly
  below (§5.1; on `main` only the still top-hold can be). The worst case, the
  highest slot of a three-Interceptor swarm leaving from over a ship on the
  bottom row, is caught at y 62 (38 lines before it would vanish).
* **Gates:** worst fence margin **1,260** unchanged, DMA-on **31,483 →
  31,059**, 0 misses; every fight inside the rule with the region 4 trim.
* **What the owner should play for (Q2):** an Interceptor in the ship's line
  is now a target. A player who sits under one holding fire kills it in
  **31 frames (0.6 s, 4 shots)**, often during its dive and, on EASY / MEDIUM,
  before its first laser. On `main` the same player never kills one. It is
  still the fastest thing on screen (dive 4 lines a frame, it tracks at the
  ship's own speed), but it is no longer untouchable.
* **V2** (calmer tracking while it hovers) is not recommended: +14 window
  bytes, −11 of fence margin, region 3 and 4 fights out of the rule, and no
  phase the shot could not catch on V1.

## 1. Step 0 and the baseline

`main` `2394f63`, clean; `git worktree list`: the primary checkout only. ATR
`fee54beaa73735f9efde4ebf59419b2e01221b8e88e48f5e9332a72ef4a9d096`, boot
`62e40077e9c81124da184de48b9ea0e4c395759237fc76a09273103c8d81a0fc`. The
`fix/r4-immobile` merge is on `main` (the still band, G2, no engines; the
evidence bound to `fee54bea…`). No temporary worktree was needed: a review
variant is the default build plus in-memory edits, and the default build on
this branch is byte-identical to `main` (ATR `fee54bea…` rebuilt).

| Figure | Value | Source |
| --- | --- | --- |
| worst fence margin | 1,260 (`2-sweep-fire6`) | STATUS (r4-immobile, gates) |
| DMA-on maximum | 31,483 (`weapon-pickup-2-hunt-fire4` f2,361) | STATUS; target 31,200, gate 32,568 |
| PAL audit | 0 misses, 58 replays, 0 clause failures | STATUS |
| region 1's boss frames | 9,191 / 29,821 (worst margin / DMA-on) | STATUS |
| region 4's stress | 8,094 of 8,500 | STATUS |
| boss entry | 249 / 261 host frames (region 1 / region 4), limit 280 | STATUS |
| window record / free tail | 1,322 of 1,387 B packed (11 sectors) / 971 B | STATUS (armour budgets); manifest |
| Light kernel record | 847 of 875 B | STATUS |
| slot A | 2,047 of 2,048 B | STATUS (r4-immobile budgets) |
| initial block | 13,623 of 13,652 B | STATUS; manifest |
| `DIRECTOR_RAM` | 2 B free (`$9FF8-$9FF9`) | `docs/memory-map.md:208` |
| arena | 14 B free | manifest `residentCapacity.arena.freeBytes` |
| Interceptor's longest life | escort 121 frames (floor 128); swarm 399 | STATUS §AK; **M-N** 121 / 399 again |
| boss fight (aim bot, the ratio) E / M / H | R1 89.1 / 108.7 / 154.0 s; R3 89.5 / 118.8 / 150.1 (levels 7-8); R4 92.6 / 107.3 / 154.3; R2 measured here | STATUS |
| `npm test` | 1,369 tests, 1 recorded failure (`tests/preview.test.mjs:164`) | STATUS |

No material disagreement with STATUS.

## 2. Audit (`main` `2394f63`)

### 2.1 The speeds, per phase

All in `light_tick_body`, `src/c/lifecycle.c` (the shared behaviour of every
Interceptor: the swarm, elite (a)'s companion and the boss escort differ only
by the wave's `loops`, 2 / 2 / 0). No speed depends on the difficulty; only
the reload does (56 / 44 / 32 frames, the record at `lifecycle.c:283`).

| Phase | Vertical | Sideways | Where |
| --- | --- | --- | --- |
| entry descent | **2 lines/frame** down | one 4-HPOS cell every 2nd frame = **2 HPOS/frame**, toward `PLAYER_X & $FC` | `:96`, `:1221`; `:99`, `:1226-1239` |
| standoff hold (7 rows above, + 2 rows a slot) | 0 | 2 HPOS/frame, the same target | `:1220-1239` |
| back-off (ship under 6 rows) | **2 lines/frame** up | 2 HPOS/frame | `:98`, `:1222-1224` |
| loop climb to the top-hold row (y 32 / 48 / 64) | **8 lines/frame** up | none (x frozen) | `:97`, `:1194-1196` |
| top-hold | 0 for the rest of the 39-frame top phase | none | `:115-116`, `:1199` |
| dive back to the standoff | 2 lines/frame down | 2 HPOS/frame | as the entry |
| exit climb (after the last loop; the escort after its one pass) | **8 lines/frame** up, retires when y wraps past 232 | none | `:1187-1188`, `:1243` |

| The player | | Where |
| --- | --- | --- |
| shot | **6 lines/frame** up; leaves at **x = player_x + 8** (the ship's centre), y = player_y − 2; from the bottom row (ship y 225) to the top in 34 frames | `assets/graphics/fighter-weapons.json` `speedScanlines`; `src/main.s:4084-4088`, `:4324-4340` |
| ship | 2 HPOS/frame sideways, 1 line/frame up/down | `src/main.s:964`, `:3831`, `:3839` |
| a shot hits a Light | when `shot_x − light_x` is 0..7 (the Light's 8-HPOS hitbox) and the shot is in or just past its cell row | `src/hybrid/light-kernel.s:474-510` |

### 2.2 What outruns the shot — two causes, not one

1. **The two climbs outrun it.** At 8 lines/frame the Interceptor climbs
   faster than the shot (6): a shot fired at the first frame of the exit climb
   falls 2 lines further behind every frame and never arrives. The loop climb
   is the same speed; it is caught only because it stops at its on-screen
   top-hold and the shot arrives there later (31 frames).
2. **The standoff holds the Interceptor just beside the shot's line.** It
   tracks `PLAYER_X & $FC`: its hitbox covers the ship's **left** half
   (`player_x … +7`), and its laser (`light_x + 2`) lands on the fighter. The
   ship's shot leaves at `player_x + 8`, one HPOS to the right of that
   hitbox. So a tracking Interceptor that has caught up with the ship is
   never in its line of fire, and if the player moves under its centre it
   sidesteps back onto the ship's left edge within 2 frames — before the shot
   (8-14 frames up) arrives. A ship moving right misses by the lag; only a
   ship moving left can, briefly, have it in line. This is every tracking
   phase: the entry, the hold, the back-off, the dive back.

The sideways **speed** (the ship's own) is not what makes it uncatchable —
the **column it aims for** is.

### 2.3 From a replay (`main`'s route, `director-complete-1-natural-sweep-fire0`, MEDIUM, **M**)

* **The hold:** of the 65 shots the bot fired while an Interceptor hovered
  above it, **60 passed beside it** (shot line 8-18 HPOS right of its left
  edge; e.g. f2,195: Interceptor (152,154), ship (154,225), line at +10).
* **The exit climb:** f4,635, the boss escort at (72,106) climbing 8 lines a
  frame, the ship at (68,225) fires in line (+4). At f4,648 the escort is at
  y 2 and the shot about 80 lines behind it; at f4,649 it retires with 2 of
  its 3 hit points.

### 2.4 The catch table on `main` (**M-N**, MEDIUM, ship at the bottom row y 225)

One shot fired from directly below at the worst moment of each phase (the
ship moved so its shot line crosses the Interceptor's centre, `light_x + 4`),
followed to a hit or its loss; "parked": from where the ship already is. The
other slots of a swarm are removed at the fire frame (a stacked lower one
would take the shot). Full tables for main, V1 and V2 at ship y 225 and 190:
§5.1.

| Phase (slot 0) | below | parked |
| --- | --- | --- |
| entry descent | miss | miss |
| standoff hold | miss | miss |
| back-off | miss | miss |
| loop climb | hit at its top-hold, 31 f | miss |
| top-hold | miss (it dives away first) | miss |
| dive back | miss | miss |
| exit climb (escort / after 2 loops) | **miss** | **miss** |

**A player holding fire under an Interceptor never kills it** (**M-N**,
every difficulty): parked, or flying at the ship's 2 HPOS/frame to keep its
shot line on the Interceptor's centre, 12 shots in an escort's pass and 40 in
a looping one hit **0** times; every one leaves alive.

## 3. Candidates (review variants, `scripts/interceptor-speed-variants.mjs`)

A variant is the default build plus in-memory edits of `src/c/lifecycle.c`
(and, for the probes, a region's `modules.json`); nothing under `src/` or
`assets/` changes on disk. `node scripts/build.mjs --interceptor-speed=<id>
[--level=1:sector=M] [--boss-region=N]` → `build/interceptor-speed-<id>[…]/`.

| | V1 | V2 |
| --- | --- | --- |
| column it tracks | the ship's centre, `(player_x + 6) & $FC` (the escort's own rounding, `LIGHT_CENTRE_OFFSET + LIGHT_ROUND`); its laser, `light_x + 2`, still lands on the fighter | as V1 |
| loop climb and exit climb | **3 lines/frame** (the shot closes at 3) | as V1 |
| dive (entry and from the top-hold) | 4 lines/frame (toward the ship: the shot closes at 10) | as V1 |
| hover (standoff frames) | 64 (was 100) | as V1 |
| top phase | 64 frames, age step 3 (was 39, step 4): the slower climb still holds on screen | as V1 |
| reload E / M / H (data) | 56 / 31 / 20 (was 56 / 44 / 32): 1 / 2 / 3 lasers a visit inside the shorter hover | as V1 |
| sideways while it hovers | the ship's speed, 2 HPOS/frame | **3/4 of it**, 3 cells in 8 frames (the descent keeps 2 HPOS/frame) |
| back-off | 2 lines/frame (unchanged) | as V1 |

**V3** (speeds per difficulty from data) was not built: the speeds have no
per-difficulty field, so a table indexed by `DIFFICULTY_SETTING` in the tick
is about 11 window bytes (**IC**: `ldy`, `lda abs,y`, 3 table bytes, in two
places) and moves the Light kernel like V2. EASY's own lever turned out to be
the reload (§6), which is data.

Probes on V1 (data only): `v1r4a` (region 4's core 24, lens 22), `v1r4b`
(and cannons 15), **`v1r4c`** (every region 4 module about a fifth lighter:
spires 9, core 23, lens 21, cannons 14, guns 10, plates 8), **`v1e40`**
(EASY's reload 40).

## 4. The floor: why V1 also changes the hover, the dive and the top phase

The escort clock refuses `escort.baseFrames` under 128 so that an escort's
life fits between two armings (`scripts/boss-assets.mjs:928-929`,
`tests/boss-escort-flow.test.mjs:258`). An escort's life is its hover plus
its exit climb. **M-N**, the ship parked on the bottom row (the longest life):

| Climbs only slowed (hover 100, dive 2) | exit climb | escort life |
| --- | ---: | ---: |
| `main` (8 lines/frame) | 22 f | **121** |
| 4 lines/frame | 37 f | **136** — over the floor |
| 3 lines/frame | 49 f | **148** — over the floor |

So "only slow the climbs" is a STOP by the brief's rule. The options it names
were measured; V1 takes the one that costs no bytes:

| Option | life | hover over a low ship | cost | catch |
| --- | ---: | --- | --- | --- |
| **(V1) hover 64, dive 4** | **121** | 20 f | 0 B | every phase |
| hover 76, climb 3, dive 3, no retire | 133 | 18 f | 0 B | every phase — over the floor |
| climb 3, retire as soon as it leaves the playfield (y < 24), hover 76, dive 3 | ≈125 (**EST**: 133 − the 8 unseen frames) | 18 f | **+12 B** in the window's Director half (**M**); with the column fix the Light kernel moves 11 B off `$B478` | every phase |
| climb 4, retire, hover 88 | ≈125 (**EST**) | 31 f | +12 B, the kernel moves | slot 2 of a three-stack escapes over a ship on the bottom row |

The top phase must grow with the slower climb or the top-hold disappears (at
3 lines/frame and 39 frames slot 0 never reaches its row): step 3 from 64 is
exactly 64 frames, and the holds become **16 / 27 / 37 frames** for slots
0 / 1 / 2 (`main` 20 / 24 / 28; L2's row unchanged). The reload keeps the
visit's lasers: escort 1 / 2 / 3 (E / M / H) on `main`, V1 and V2 (**M-N**).

## 5. Measurements

### 5.1 The catch table (**M-N**, MEDIUM; one shot from directly below at the worst moment of the phase)

"below": the ship moved, on the fire frame, so its shot line crosses the
Interceptor's centre (where it tracks, it reacts to that move as in play);
"moving": the ship flies 16 frames at 2 HPOS/frame under it and fires on the
move; "parked": after that, stopped. Slots 1 and 2 are a three-Interceptor
swarm (the others removed at the fire frame). Speeds do not depend on the
difficulty.

| slot | phase | aim | `main` y 225 | V1 y 225 | V2 y 225 | `main` y 190 | V1 y 190 | V2 y 190 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | entry descent (2nd visible row) | below | **miss** | hit 16 f (y 128) | hit 16 f (y 128) | **miss** | hit 13 f (y 116) | hit 13 f (y 116) |
| 0 | standoff hold (first frame) | below | **miss** | hit 8 f (y 172) | hit 8 f (y 172) | **miss** | hit 8 f (y 136) | hit 8 f (y 136) |
| 0 | standoff, ship moving right 16 f, fires moving | moving | — | **miss** | **miss** | **miss** | **miss** | hit 8 f (y 136) |
| 0 | standoff, ship moving left 16 f, fires moving | moving | — | **miss** | hit 11 f (y 151) | **miss** | **miss** | hit 8 f (y 136) |
| 0 | standoff, ship moved right 16 f, stops, fires | parked | — | hit 11 f (y 151) | **miss** | **miss** | hit 8 f (y 136) | hit 8 f (y 136) |
| 0 | back-off (first frame, ship climbing) | below | **miss** | hit 7 f (y 170) | hit 7 f (y 170) | **miss** | hit 8 f (y 134) | hit 8 f (y 134) |
| 0 | loop climb to the top-hold (first frame) | below | hit 31 f (y 32) | hit 15 f (y 127) | hit 15 f (y 127) | hit 25 f (y 32) | hit 16 f (y 88) | hit 16 f (y 88) |
| 0 | top-hold (first frame) | below | **miss** | hit 26 f (y 68) | hit 26 f (y 68) | hit 25 f (y 32) | hit 25 f (y 32) | hit 25 f (y 32) |
| 0 | dive back from the top-hold (first frame) | below | **miss** | hit 19 f (y 112) | hit 19 f (y 112) | **miss** | hit 16 f (y 100) | hit 16 f (y 100) |
| 0 | exit climb (first frame), one pass (escort) | below | **miss** | hit 15 f (y 127) | hit 15 f (y 127) | **miss** | hit 16 f (y 88) | hit 16 f (y 88) |
| 0 | exit climb (first frame), after 2 loops | below | **miss** | hit 15 f (y 127) | hit 15 f (y 127) | **miss** | hit 16 f (y 88) | hit 16 f (y 88) |
| 1 | entry descent (2nd visible row) | below | **miss** | hit 16 f (y 132) | hit 16 f (y 132) | **miss** | hit 12 f (y 116) | hit 12 f (y 116) |
| 1 | standoff hold (first frame) | below | **miss** | hit 11 f (y 156) | hit 11 f (y 156) | **miss** | hit 11 f (y 120) | hit 11 f (y 120) |
| 1 | standoff, ship moving right 16 f, fires moving | moving | **miss** | **miss** | hit 12 f (y 144) | **miss** | **miss** | **miss** |
| 1 | standoff, ship moving left 16 f, fires moving | moving | **miss** | **miss** | hit 12 f (y 144) | **miss** | **miss** | **miss** |
| 1 | standoff, ship moved right 16 f, stops, fires | parked | **miss** | hit 12 f (y 144) | hit 12 f (y 144) | **miss** | hit 11 f (y 120) | hit 11 f (y 120) |
| 1 | back-off (first frame, ship climbing) | below | **miss** | hit 10 f (y 154) | hit 10 f (y 154) | **miss** | hit 11 f (y 118) | hit 11 f (y 118) |
| 1 | loop climb to the top-hold (first frame) | below | hit 28 f (y 48) | hit 20 f (y 96) | hit 20 f (y 96) | hit 23 f (y 48) | hit 21 f (y 57) | hit 21 f (y 57) |
| 1 | top-hold (first frame) | below | **miss** | hit 28 f (y 48) | hit 28 f (y 48) | hit 23 f (y 48) | hit 23 f (y 48) | hit 23 f (y 48) |
| 1 | dive back from the top-hold (first frame) | below | **miss** | hit 18 f (y 124) | hit 18 f (y 124) | **miss** | hit 14 f (y 108) | hit 14 f (y 108) |
| 1 | exit climb (first frame), one pass (escort) | below | **miss** | hit 20 f (y 96) | hit 20 f (y 96) | **miss** | hit 21 f (y 57) | hit 21 f (y 57) |
| 1 | exit climb (first frame), after 2 loops | below | **miss** | hit 20 f (y 96) | hit 20 f (y 96) | **miss** | hit 21 f (y 57) | hit 21 f (y 57) |
| 2 | entry descent (2nd visible row) | below | **miss** | hit 16 f (y 128) | hit 16 f (y 128) | **miss** | hit 13 f (y 104) | hit 13 f (y 104) |
| 2 | standoff hold (first frame) | below | **miss** | hit 14 f (y 140) | hit 14 f (y 140) | **miss** | hit 13 f (y 104) | hit 13 f (y 104) |
| 2 | standoff, ship moving right 16 f, fires moving | moving | **miss** | **miss** | **miss** | **miss** | **miss** | **miss** |
| 2 | standoff, ship moving left 16 f, fires moving | moving | **miss** | **miss** | **miss** | **miss** | **miss** | **miss** |
| 2 | standoff, ship moved right 16 f, stops, fires | parked | **miss** | hit 14 f (y 134) | hit 14 f (y 134) | **miss** | hit 13 f (y 104) | hit 13 f (y 104) |
| 2 | back-off (first frame, ship climbing) | below | **miss** | hit 13 f (y 138) | hit 13 f (y 138) | **miss** | hit 13 f (y 102) | hit 13 f (y 102) |
| 2 | loop climb to the top-hold (first frame) | below | hit 26 f (y 64) | hit 26 f (y 64) | hit 26 f (y 64) | hit 20 f (y 64) | hit 20 f (y 64) | hit 20 f (y 64) |
| 2 | top-hold (first frame) | below | hit 26 f (y 64) | hit 26 f (y 64) | hit 26 f (y 64) | hit 20 f (y 64) | hit 20 f (y 64) | hit 20 f (y 64) |
| 2 | dive back from the top-hold (first frame) | below | **miss** | hit 16 f (y 132) | hit 16 f (y 132) | **miss** | hit 13 f (y 104) | hit 13 f (y 104) |
| 2 | exit climb (first frame), one pass (escort) | below | **miss** | hit 26 f (y 62) | hit 26 f (y 62) | **miss** | hit 25 f (y 29) | hit 25 f (y 29) |
| 2 | exit climb (first frame), after 2 loops | below | **miss** | hit 26 f (y 62) | hit 26 f (y 62) | **miss** | hit 25 f (y 29) | hit 25 f (y 29) |

"—": the phase is shorter than the 16 frames of movement (`main`'s slot-0
hover over a low ship lasts 14 frames). A ship that keeps moving sideways
still misses on V1 (the Interceptor lags it by up to a cell); it hits the
moment the ship stops. Higher than y 190 the highest swarm slot's exit can
escape on V1 (y 29 at 190): it hovers 4 rows above an already high ship.

**Time to kill, a ship holding fire (**M-N**, every difficulty):**

| | `main` | V1 | V2 |
| --- | --- | --- | --- |
| parked under it / flying to keep its line on its centre | **never** (12 shots in an escort pass, 40 in a looping pass, 0 hits; it leaves) | **31 frames, 4 shots, 3 hits** | 31 frames, 4 shots |

### 5.2 Bytes and RAM (**M**, manifests)

| | `main` | V1 | V2 |
| --- | ---: | ---: | ---: |
| window record (packed, 11 sectors of 1,387) | 1,322 | 1,322 | **1,335** |
| window Director half (raw) / free tail | 1,656 / 971 | 1,656 / 971 | 1,670 / **957** |
| Light kernel record / position | 847 of 875 / `$B478` | = / = | = / **`$B486`** (+14) |
| slot A, slots C-F, initial block, C extension, pickup record, arena (14 B free) | — | = | = |
| `DIRECTOR_RAM` (2 B free), other RAM | — | = | = |

### 5.3 Cycles

* **Light tick per Interceptor** (**M-N**, HARD, three live, the whole tick):
  worst 528 / mean in the hover 374 (`main`) → **532 / 380** (V1) → 543 / 384
  (V2).
* **Gates (M, all 58 replays per build on the `level-1-s0` route; `main`'s
  route reproduces the committed evidence row for row):**

| | `main` | V1 | V2 |
| --- | --- | --- | --- |
| worst fence margin | 1,260 (`2-sweep-fire6` f311) | **1,260** (same row) | 1,249 (same row) |
| DMA-on maximum | 31,483 (`weapon-pickup-2-hunt-fire4` f2,361) | **31,059** (`2-evasive-fire7` f564) | 31,059 |
| distinct miss events | 0 | 0 | 0 |
| boss frames, worst margin / DMA-on (R1, the director-complete replays) | 9,191 / 29,821 | 8,869 / 30,211 | 7,879 / 29,919 |
| boss frames, regions 2-4 (aim runs, worst) | 6,527 / 30,440 | 6,162 / 30,392 | 6,736 / 30,267 |
| boss entry R1 / R2 / R3 / R4 (host frames) | 249 / 249 / 256 / 261 | = | = |
| boss stress | 8,094 (R4) | = (**ANALOGY**: the boss slots are byte-identical; the escort's tick runs in the Light kernel, outside the boss's sum) | = |

### 5.4 Play (**M**, the traces)

| | `main` | V1 | V2 |
| --- | --- | --- | --- |
| level 1 before the boss: Interceptors / shot down / escaped | 70 / 42 / 27 | 70 / **67 / 2** | 70 / 67 / 2 |
| … hits per shot fired while one is on screen | 0.144 | **0.522** | 0.496 |
| … time to kill (replay means) | median 178 f | median **71** f | 68 |
| … laser hits on the bots / laser deaths | 36 / 5 | **15 / 3** | 13 / 2 |
| boss sector: escorts / shot down / escaped | 109 / 39 / 68 | 121 / 77 / 43 | 125 / 87 / 36 |
| … hits per shot while one is up | 0.186 | 0.375 | 0.420 |
| … laser hits on the bots | 36 | 31 | 28 |
| Interceptors that met the fighter (rams) | 0 | 0 | 0 |
| longest life: escort / swarm (traces) | 121 / 399 | **121** / 377 | 121 / 377 |
| HARD hunting bots (`memory-integrity` 5 / 6 / 7) reach the boss | f3,735 / 3,811 / 3,622 | f3,650 / 3,652 / 3,701 | f3,650 / 3,656 / 3,707 |
| replays that enter the boss | 14 | 16 | 16 |
| road to the boss (sweep bot, E / M / H) | 75.7 / 76.2 / 66.0 s | 66.5 / 60.8 / 59.2 | 68.1 / 60.8 / 60.5 |
| the swarm (sweep bot, E / M / H) | 17.9 / 17.9 / 14.0 s | 13.0 / 12.9 / 14.1 | 13.1 / 12.9 / 15.3 |
| no kills: swarm Lights armed / the last arms at (HARD's cut +816) | 9 / 9, +814 | 9 / 9, **+784** | 9 / 9, +784 |
| left-edge guard `boss-edge-left-1` (MEDIUM) | PASS, 20 escorts, 18 hits | PASS, 21 / 20 | PASS, 22 / 21 |
| parked left E / M / H (`boss-park-left-N`): hits | 17 / 17 / 16 | **0** / 17 / 16 | 0 / 17 / 16 |

### 5.5 The boss fights (**M**, the aiming bot, the ratio; E / M / H)

| Region | `main` | V1 | V2 | V1 + `v1r4c` |
| --- | --- | --- | --- | --- |
| 1 (and 2, its copy) | 89.1 / 108.7 / 154.0 | 97.4 / 111.0 / 152.7 | 95.7 / 111.1 / 151.1 | = V1 |
| 3 (level 7) | 89.5 / 118.8 / 150.1 | 109.3 / 112.3 / 174.9 | 110.5 / **128.5** / **138.6** | = V1 |
| 4 (level 10) | 92.6 / 107.3 / 154.3 | 118.1 / **132.2** / 169.9 | 108.6 / **132.2** / 162.3 | **100.2 / 107.0 / 139.3** |
| escorts a fight (R1 … R4, MEDIUM) | 13 / 13 / 12 / 15 | 14 / 14 / 11 / 18 | 14 / 14 / 13 / 18 | |

Bold: outside the rule (MEDIUM 90-120, EASY shorter, HARD not shorter).
**Why the fights grow:** an escort centred on the ship sits in the line of
the shots aimed at the boss and takes them — region 4's escorts absorb 44 /
53 / 57 of the bot's shots (`main` 4 / 7 / 5), about 18 escorts × 3 shots,
≈ 27 s at the ratio. With the still band the bot parks under the core, so
region 4 feels it most. Trimming only the core, lens and cannons
(`v1r4a`/`b`) leaves MEDIUM at 128.5 / 130.9 s; the cost is spread over the
fight, so the lever is every module about a fifth lighter (`v1r4c`).

## 6. The data levers (Phase B applies them only with the owner's yes)

* **Region 4 (`v1r4c`):** spires 11 → 9, core 29 → 23, lens 26 → 21, cannons
  18 → 14, guns 12 → 10, plates 10 → 8 → **100.2 / 107.0 / 139.3 s**.
* **EASY's reload 56 → 40 (`v1e40`):** on V1 every EASY escort dies before
  its first laser, so a fighter parked at the left edge takes **0 hits** all
  fight (`main` 17) — the edge refuge decision AI closed, reopened on EASY.
  At 40: **17 laser hits**, every escort still shot down. (The guard replay
  is MEDIUM and passes either way.) EASY's fights get a little harder; Phase
  B re-measures them.

## 7. Found on the way (for Phase B; neither changes the game)

* **The level-end stats race now lands in a committed replay.** On V1 and V2
  `director-complete-1` (and region 2's copy) fail the level-end stats clause
  by one shot (626 against the observer's 627): the race STATUS records for
  the region routes (a shot fired on the boss's hand-off frame is counted by
  the observer, not by `stats_scan`). `main` does not hit it in the evidence;
  the new timing does. Options: an observer fix in the harness (the brief
  allows up to ~60 lines; the game fix needs slot A bytes, 1 free).
* **The HARD laser-contact bot carries a shield.** On V1's path
  `lower-playfield-laser-contact-atr-hard` enters the boss sector with health
  3 and a shield booster (pickup state 5); the beam's first damage call is
  absorbed (health 3 → 3), so the clause's "ten hull units on the first
  contact" cannot hold. The game is right (every laser damage lands with the
  beam over the ship by the game's test); the scenario is stale — class (a),
  rewrite the bot honestly (e.g. it waits for the shield to run out before it
  steers under a beam), the clause unchanged.

## 8. How to play (Atari800, the 64 KB machine)

```
atari800 -xl -pal -nobasic "$PWD/build/play/interceptor-speed-v1-full-game-350f7893.atr"   # V1, the whole game
atari800 -xl -pal -nobasic "$PWD/build/play/interceptor-speed-v1-boss-route-05dbbf59.atr"  # V1, straight to region 1's boss
atari800 -xl -pal -nobasic "$PWD/build/play/interceptor-speed-v2-full-game-efafb7af.atr"   # V2, the whole game
atari800 -xl -pal -nobasic "$PWD/build/play/interceptor-speed-v2-boss-route-36aa48c3.atr"  # V2, the boss route
atari800 -xl -pal -nobasic "$PWD/build/play/interceptor-speed-main-boss-route-72ba12ef.atr" # main, the boss route (compare)
```

The whole game on `main` is `dist/void-strike-65.atr` (`fee54bea…`). The
probes' builds are under `build/interceptor-speed-v1r4c-…` and
`build/interceptor-speed-v1e40-…` (debug routes, not play builds).

**What to look for:** in the swarm after the capital and with elite (a)'s
companion, sit under an Interceptor and fire: it should take the hits. Fire at
one as it climbs to the top rows or leaves: the shot should catch it. Its
climbs are slower and easy to follow; its dive is faster than before. It
still hovers over you, fires only in your column (1 / 2 / 3 a visit), loops
twice, then climbs out; it never rams. In the boss sector the escort is
shot down far more often — and soaks up shots meant for the boss.

## 9. Owner questions

| # | Question | Options | Recommended |
| ---: | --- | --- | --- |
| Q1 | Which variant | **V1**; V2 (calmer tracking: +14 B, fence −11, regions 3 and 4 out of the rule) | **V1** |
| Q2 | An Interceptor in the ship's line is now a target: held fire kills it in 0.6 s, often before its first laser | (a) accept — that is what "catchable" means for an enemy that hovers over you; (b) as (a) now, and a later task for an evasive hover (it darts into the column to fire and out again, or jinks), priced then | **(a)**, judged at the smoke; (b) if it plays like a sitting target |
| Q3 | The floor fit (§4): hover 64, dive 4, top phase 64, reload 56 / 31 / 20 | as V1 (0 B); climbs 3 with the off-screen retire, hover 76, dive 3 (+11 B, the Light kernel moves) | **as V1** |
| Q4 | Region 4's fight (MEDIUM 132.2 s on V1) | `v1r4c` (every module about a fifth lighter: 100.2 / 107.0 / 139.3 s); another trim | **`v1r4c`** |
| Q5 | EASY's left edge (0 hits parked on V1) | reload 56 → 40 (`v1e40`, 17 hits as `main`); leave it | **reload 40** |
| Q6 | The two trace findings (§7) | the observer fix for the stats race + the laser-contact bot's honest rewrite, in Phase B | **both, in Phase B** |

## 10. Phase B — as built (the owner's answers of 2026-10-14, journal §AS)

**The answers.** Q1 V1; Q2 (a), the 3 hits stay; Q3 the floor fit as V1
(hover 64, dive 4, top phase 64, 0 B; no off-screen retire); Q4 `v1r4c`,
every region re-measured; Q5 EASY's reload 56 -> 40; Q6a the observer fix,
the check exact; Q6b the laser-contact bot's honest rewrite. V2 rejected; the
review variants removed (`scripts/interceptor-speed-variants.mjs` deleted,
`scripts/build.mjs` and `scripts/trace-artifacts.mjs` back to `main`'s).

**The game (`src/c/lifecycle.c`, data and defines only, decision AD).**
`INTERCEPTOR_LIFE_FRAMES` 100 -> 64, `INTERCEPTOR_DIVE` 2 -> 4,
`INTERCEPTOR_CLIMB` 8 -> 3, `INTERCEPTOR_TOP_STEP` 4 -> 3 (`(256 - 64) % 3 == 0`,
the top phase 64 frames); the tracked column `(PLAYER_X + 6) & $FC`; the
record's reload 56 / 44 / 32 -> **40 / 31 / 20**. Region 4's modules (spires
9, core 23, lens 21, cannons 14, guns 10, plates 8). The window pad 4 -> 1 B
(`src/hybrid/c-asm-abi.s`) keeps the Light kernel at `$B478`: window record
1,322 packed, Director half 1,656 / tail 971, initial block 13,623 B,
`DIRECTOR_RAM` unchanged.

**The trace (`scripts/atari800-wall-trace.h`, `scripts/runtime-wall-trace.mjs`).**
Q6a: the summary observer snapshots its shot counters at every `stats_scan`
entry (`DFSUMMARY_STATS_SCAN`) and the level-end record takes the snapshot -
the game's own moment; the check stays exact. Q6b: the `lower-contact-laser`
policy meets a beam only at 10 / 10 and with no shield (pickup state 5),
escapes a beam to the ship's limits 48 / 200 and sidesteps falling debris on
the whole road. No clause changed; no memory writes.

**Tests.** `tests/interceptor-speed.test.mjs` (5): RED on `main` `2394f63`
5 of 5, GREEN here. Re-pinned or re-pointed, each with its reason at the site
(exact values; no floor, gate or budget moved):

| test | value | source |
| --- | --- | --- |
| `interceptor-standoff` | hover 100 -> 64; column `(x + 6) & $FC`; the swarm sampled at frame 50 | `lifecycle.c` |
| `interceptor-loops` | life window `64 + 2*128 .. 64 + 3*128` (was 100 / 139); the no-fire window from the first climbing frame | the harness (M) |
| `light-interceptor` | admission pauses 40 / 31 / 20; the reference model 4 / 64 / 3 (118 -> 110 frames); pursuit `(x + 6) & $FC` at `PLAYER_X_MAX` 200; cadence E 40, M 31,63, H 20,41,62; visuals `light_x` 104 | the build (M) |
| `light-wingman` | the record bytes `[3,2,3,1,0,40,31,20,2,2,0x15,1]` | `lifecycle.c` |
| `boss-region-4` | the hit points above | `modules.json` |
| `runtime-wall-trace` | the debris-effects replay's frames 5,000 -> 4,999 (it reaches the boss at frame 3,169; the entry frame is set aside) | the trace (M; owner approval 2026-10-14) |

**Measured on the final build.**

| | `main` `2394f63` | as built |
| --- | --- | --- |
| worst fence margin | 1,260 (`2-sweep-fire6`) | 1,260 (same row) |
| DMA-on maximum | 31,483 | 31,059 |
| PAL audit / clause failures | 0 misses, 58 replays / 0 | 0 / 0 |
| replays that enter the boss | 14 | 16 |
| R1 boss frames, worst margin / DMA-on | 9,191 / 29,821 | 8,869 / 30,211 |
| R1 fight (E / M / H, the aiming bot's ratio) | 89.1 / 108.7 / 154.0 s | 97.4 / 111.0 / 152.7 s |
| R3 fight | 89.5 / 118.8 / 150.1 s | 109.3 / 112.3 / 174.9 s |
| R4 fight | 92.6 / 107.3 / 154.3 s | 100.2 / 107.0 / 139.3 s |
| parked left, hits E / M / H | 17 / 17 / 16 | 17 / 16 / 15 |
| road to the boss (sweep, E / M / H) | 75.7 / 76.2 / 66.0 s | 66.5 / 60.8 / 59.2 s |
| ATR | `fee54bea` | `0f639496` |

Every fight in the band; no further retune. **Status:** implemented,
`OWNER-SMOKE CANDIDATE`; smoke checklist
[hardware-testing.md](../hardware-testing.md) §34.
