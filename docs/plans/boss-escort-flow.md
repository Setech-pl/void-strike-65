# The boss escort's flow: when it starts, how often it comes, and re-entry

**Branch:** `feat/boss-escort-flow` from `main` `0ed69e1` (ATR `020fea98…`, boot
`4b8886da…`, the `feat/boss-r1-tuning` merge, variant B). **Status:** Phase A, the
comparison builds. **OWNER DECISION REQUIRED** (§6). Nothing under `src/`,
`assets/` or `dist/` has changed: every variant is the default build plus
in-memory source edits (`scripts/boss-escort-variants.mjs`,
`node scripts/build.mjs --escort-variant=ID [--level=1:sector=M]`).

**The owner's smoke findings (2026-10-10, region 1 boss with the escort):**
1. The escort appears about three times at the start of the fight, then never
   again.
2. Wanted: the escort starts only after the first two weapon modules are
   destroyed, then comes every few seconds with some randomness until the
   boss sector ends; still at most one Light live.
3. Question: could the Interceptor behave differently, e.g. return to the top
   after reaching the bottom edge?

Labels: **M** measured on this branch (Atari800 trace harness on the debug
routes; the 6502 harness of `tests/boss-stress.test.mjs` on a scratch copy of the
variant build); **EST** an estimate, with its basis given.

---

## 1. Inventory (file:line, `main` `0ed69e1`)

| What | Where | What it does today |
| --- | --- | --- |
| The boss sector's escort, armed | `src/hybrid/boss.s:3012-3017` (install step 9) → `src/c/director.c:303` `director_c_try_event` | Once, at the install: the sector's row-0 wave is armed with its whole `count` (level 1: 6, spacing 100) and `light_wave_lock` up (`director.c:346`). |
| Why nothing re-arms it | `director.c:384-390` (`enter_sector`, boss branch), `:591-596` (row tick returns in a boss sector) | The world stops; no row tick ever runs the boss sector's waves again. |
| The stepper | `src/c/lifecycle.c:934` `light_wave_step` → `:858` `light_admit` | One attempt a frame while `light_wave_remaining` > 0; the next member `spacing` frames after the last admission; refused while `lights 1` is full. |
| The Interceptor's record | `lifecycle.c:239-249` | HP 1, burst 1, reload 56 / 44 / 32 (E / M / H), the LASER shot, 15 points. |
| Its movement | `lifecycle.c:1114-1141` | Descends 2 lines a frame; every other frame closes one 4-HPOS cell on the player's column (the player's own top speed). |
| How it leaves | `lifecycle.c:1142-1145` | At y ≥ 232 (`LIGHT_RETIRE_Y`, `:70`) the slot goes inactive. The kernel restores every slot's cells each frame (`src/hybrid/light-kernel.s:131-160`) and draws only inside the play rows (`:186-195`), so a retired slot's cells are gone in the same late window. |
| Its fire | `lifecycle.c:1159-1185`, `:588` `light_reload` | Fires inside y 24..223 when the reload expires; a pass is 116 frames, ~100 inside the fire band: 1 shot (EASY) to 3 (HARD) a pass. |
| Frame order in a boss frame | `src/main.s:5345` (`CAPITAL_VECTOR_UPDATE` → `boss_update`, inside `handle_collisions`) before `:2756` (the Light update and the stepper) | The boss controller's tick runs before the stepper, on the same frame. |
| The boss's weapon count | `src/c/boss.c:370` `--boss_weapons_left` (in `boss_c_hit`) | Slot C; the Director link links first and cannot see slot C's symbols. |

**M (main's evidence, boss-aim replays):** six escorts at 0.0, 2.0, 4.0, 6.1,
8.1 and 10.1-10.5 s from the engagement on every difficulty, then none for the
remaining 34-52 s of the fight. Each lives 24-111 frames: shot, or rammed into
the player at the bottom. That matches the owner's "three at the start" (some die
off-screen-fast).

## 2. The design (variant T)

**Where the Director learns the count.** The boss controller reports. On every
weapon kill that is not the last, `boss_c_hit` (`boss.c:370`, after the defeat
test) calls `director_c_boss_weapon_down()`. On every fight frame with no kill
and no exposure check, `boss_c_tick` (`boss.c:457`, the `else` of the exposure
step) calls `director_c_boss_escort_frame()`. Slot C carries the two calls only:
**+14 B, still 13 sectors** (1,648 → 1,662; 2 B to the sector edge).

**What the Director does (C).**
* `director_c_boss_weapon_down` (DIRECTOR_C_CODE, 30 B) counts weapon kills.
  The kill that reaches the region's `escort.afterWeapons` publishes the sector's
  escort wave (`director_c_try_event`) with nothing pending, parks the count at
  `$80` so no later kill triggers again, and starts the clock. The first escort
  comes on the next quiet frame.
* `director_c_boss_escort_frame` (the window's last segment, 40 B) counts the
  clock down. At zero it asks the stepper for one admission and restarts the
  clock at `baseFrames + ((RNG >> 2) & jitterMask)`. The stepper runs after the
  boss's update on the same frame, so the escort enters on a frame with no kill
  and no exposure check.
* Two Director bytes that are idle in a boss sector hold the state: `$80FC` (the
  armed wave's Heavy formations) and `$80FD` (their spacing). No Heavy wave
  exists there and no row tick runs, and `enter_sector` has zeroed both. **0 B of
  new RAM.**
* The install no longer arms the stream (−11 B in the install run).

**A bug found and fixed in Phase A (`cf11ca9`).** `director_c_try_event` zeroes
`$80FC` and `$80FD` for a Light wave and moves the wave cursor past the wave.
The first cut set its bytes before the call. Every N-th later weapon kill then
re-triggered an escort, read from beyond the level's wave table: archetype 0,
**the Raider record in a Light slot**. That was MEASURED in every trace of the
first cut, against the enemy-class invariant. Every figure below is from the
fixed builds, and the analysis checks that each escort is the Interceptor
(record 24).

**Why nothing comes after the defeat.** `baseFrames` ≥ 128 (refused below by
`scripts/boss-assets.mjs`) is longer than an Interceptor's pass (116 frames). The
last escort has therefore left when the next is armed, and the admission happens
on the arming frame. After the defeat the controller stops calling, so no
admission can follow it.

**Data.**
* The region (`modules.json` `escort: { afterWeapons, baseFrames, jitterMask }`)
  is compiled into the tables' unused bytes 17-19 at `$AD11-$AD13`. Regions 2-4
  are copies of region 1, so they inherit it (`placeholders.json` changes `fire`
  only).
* The level's boss-sector wave keeps its archetype and look and authors
  `count 1`: one escort per arming.
* Both scripts accept the new fields and emit today's bytes without them: the
  default build is byte-identical (ATR `020fea98…`, M).

**AD (a variant is a re-profiled archetype from data).** T adds no archetype
code. The Interceptor is unchanged; the cadence is the Director's.

**Proposed cadence data:** `afterWeapons 2`, `baseFrames 150`, `jitterMask 63`.
That is one escort every 3.0-4.3 s from arming to arming, and 0.7-2.0 s of clear
screen between two that are not shot.

## 3. The variants

| ID | Code | Data | What it tests |
| --- | --- | --- | --- |
| **T** | §2 | after 2 weapon kills, 150 + 0..63 | the owner's spec |
| **TW** | T + re-entry | T + the wave's `reenter` flag | the owner's question 3 |
| T1 | T | after **1** weapon kill | probe: the edge-hider (§4.2) |
| TS | T | after 2, **190** + 0..63 (3.8-5.1 s) | probe: the fight length (§4.1) |

**TW, the re-entry.**
* **The flag:** `wave_flags` bit 6 (`reenter: true`). The compiler refuses it on a
  wave with no Interceptor.
* **Where:** in `light_tick_body`, at y ≥ 232, an Interceptor of an armed wave
  with the flag sets y to 0 and restarts its reload (`light_reload`) instead of
  retiring.
* **Its column:** its own, not snapped above the player. It already closes on
  the player at the player's top speed, so a snap would only read as a teleport.
* **The reload restart, and why:** each pass then fires exactly as a fresh
  admission does, 1 to 3 shots a pass by difficulty. Without the restart, an
  expired timer would fire on the first line of the fire band.
* **In TW the cadence arms only on a clear field** (`field_busy`). A live escort
  may still be re-entering, so the next one waits rather than being left pending
  when the boss falls.
* **Not done:** the defeat hook (it would put slot C 1 B over 13 sectors). The
  live escort keeps re-entering through the chain and the hold, about 3 s, until
  the hand-off.
* **In a swarm,** an Interceptor re-enters while its flagged wave is the armed
  one: it ends when the next wave arms or the sector ends (`enter_sector` drops
  the lock). The cost there is in §5.

## 4. The figures (M)

### 4.1 Fight length and escorts, aim bot (`boss-aim-N`, the rule's proxy)

The ratio uses `main`'s plain sweep (3,834 / 4,612 / 5,964 frames) and the main
layout's aim fight (1,847 / 2,231 / 2,663), as `feat/boss-r1-tuning` §8 does. The
rule: MEDIUM 90-120 s, EASY shorter, HARD not shorter.

| Build | aim fight E / M / H | **as the rule's ratio E / M / H** | escorts E / M / H | first escort E / M / H | most live | after the defeat |
| --- | --- | --- | --- | --- | ---: | ---: |
| `main` (B) | 44.2 / 57.1 / 62.5 s | 91.8 / **118.1** / 139.9 | 6 / 6 / 6 | 0.0 / 0.0 / 0.0 s | 1 | 0 |
| **T** | 49.2 / 59.5 / 66.7 | 102.2 / **122.9** / 149.3 | 11 / 13 / 12 | 13.4 / 17.5 / 25.5 s | 1 | 0 |
| **TW** | = T, frame for frame (no re-entry happened, §4.3) | 102.2 / **122.9** / 149.3 | 11 / 13 / 12 | 13.4 / 17.5 / 25.5 | 1 | 0 |
| T1 | 48.7 / 60.9 / 63.8 | 101.1 / **125.9** / 142.8 | 13 / 15 / 13 | 6.0 / 9.1 / 15.4 | 1 | 0 |
| TS | 46.2 / 59.7 / 62.6 | 96.0 / **123.4** / 140.1 | 8 / 10 / 8 | 13.4 / 17.5 / 25.5 | 1 | 0 |

Every escort is the Interceptor. The gap from one arrival to the next is
153-217 frames (T, T1) and 200-257 (TS): the base plus the jitter, plus the
quiet-frame pauses (the clock skips kill and exposure frames).

**Every variant lands MEDIUM 3-6 s over 120.** EASY is shorter and HARD not
shorter in all of them. The slower cadence (TS) barely moves it: the escort's
pressure itself lengthens the fight (the bot's deaths with lives held, E / M / H:
`main` 1 / 0 / 1; T 2 / 2 / 3; T1 1 / 2 / 2; TS 2 / 1 / 1; hits taken: `main`
3 / 3 / 7; T 4 / 5 / 8; T1 2 / 5 / 9; TS 3 / 5 / 7). Bringing MEDIUM back
under 120 is a data lever for Phase B (Q5).

### 4.2 The edge-hider (`boss-park-SIDE-1`, MEDIUM, 80 s parked and firing)

| Build | parked left (HPOS 48): escorts / hits | parked right (HPOS 200): escorts / hits |
| --- | --- | --- |
| `main` (B) | 6 / **4** | 6 / 3 |
| **T**, **TW**, TS | **0 / 0** | 15 / 1 (T, TW); 13 / 2 (TS); the first at 24.4 s |
| T1 | 16 / **6** (the first at 22.9 s) | 16 / 2 |

**This is the finding that matters.** A fighter parked at the left edge reaches
one weapon only: gun-5 behind plate-a, dead about 25 s in. It never makes the
second weapon kill, so **under N = 2 the escort never comes, and the left edge is
a refuge again with 0 hits in 80 s.** That is the hiding spot the smoke of
2026-10-09 found and that variant B's escort closed. Under N = 1 the escort
starts at gun-5's death and the edge takes 6 hits in the remaining ~57 s, more
than `main`'s 4.

On the right, the parked bot shoots every escort as it arrives (each lives
39-43 frames). An Interceptor closes on its own column, so a fighter that fires
up kills it.

### 4.3 TW's re-entry is almost never seen

In every run (the aim bot E / M / H and the wide sweep, 62 TW escorts; the same
in T, T1 and TS), **no escort left the bottom edge alive**: each was shot or met
the player at the bottom. TW's traces are T's, frame for frame, in the boss
sector.
The Interceptor closes on the player's column at the player's top speed, so it
reaches whatever row the fighter flies on. A pass ends at the bottom without a
collision only when a player out-runs it sideways for the whole descent. None of
the bots do. The re-entry path itself is **not exercised by any measurement**:
it is the 6502 test of Phase B if TW is chosen.

### 4.4 Boss frames, boss stress, the boss entry

| | `main` | T | TW | T1 | TS |
| --- | ---: | ---: | ---: | ---: | ---: |
| boss frames, worst fence margin (aim E / M / H, the worst) | 6,026 | 8,191 | 8,190 | 7,795 | 8,485 |
| boss frames, DMA-on maximum | 30,029 | 30,040 | 30,132 | 29,718 | 30,040 |
| the wide sweep (MEDIUM): fight / escorts / hits / deaths | 147.3 s / 6 / 13 / 6 | 147.0 s / 26 / 19 / 6 | = T | — | — |
| boss stress, reachable worst, region 1 (limit 8,500) | 6,965 | 6,979 | 6,979 | = T | = T |
| … the laser fixture, warn / beam | 7,805 / 7,015 | 7,809 / 7,019 | 7,809 / 7,019 | = T | = T |
| … regions 2-4 (the finale) / the fixture with the finale, warn / beam | 6,657 / 7,115 / 6,337 | 6,676 / 7,151 / 6,405 | same as T | = T | = T |
| frames with a kill and a spawn (rule B) | 0 | 0 | 0 | 0 | 0 |
| boss entry: sectors / host frames (bound < 250) | 64 / 245 | 64 / 245 | 64 / 245 | 64 / 245 | 64 / 245 |

`main`'s worst boss frame (6,026, HARD) was a frame with a Light live in the
6-escort burst. The variants' worst frames have no Light live; their Light-live
frames' worst is 9,218-10,539. Every figure is far inside GO (500) and the gate
(32,568).

## 5. Costs (M, from the manifests and the traces)

| | T (also T1, TS) | TW |
| --- | ---: | ---: |
| code window (`HYBRID_C_WINDOW`, the Director half) | **+43 B** (2,576 → 2,619; 965 free) | **+80 B** (2,656; 928 free) |
| the window's boot-loaded record (11 sectors, 57 B of slack) | 1,330 → 1,373 packed: **11 sectors** (14 B left) | 1,398 packed: **12 sectors** (+1 boot-loaded sector) |
| the Light kernel above it moves (one pin: `pin_boss_enter_hud_backup`) | +43 B | +80 B |
| DIRECTOR_RAM (`DIRECTOR_C_CODE`, 32 B free) | **+30 B** (2 B left); its chunk 507 → 535 packed, 5 sectors | +30 B |
| Director state bytes | 0 (`$80FC` / `$80FD` reused in the boss sector) | 0 |
| boss slot A / slot D / slot E | **0 / 0 / 0** | 0 / 0 / 0 |
| boss slot C | +14 B, 13 sectors (2 B to the edge) | +14 B, 13 sectors |
| the install run | −11 B | −11 B |
| initial block | **13,623 B, 107 sectors, unchanged** (6 bytes differ: the transport manifest's CRC, the level record's CRC, a guard fold) | unchanged |
| the binding row (`2-sweep-fire6`, margin 1,447) | **1,423 (−24)**, DMA-on 30,471 → 30,462 | 1,447 (0) |
| frames before the boss (the three aim replays, 9,070 frames) | gameplay identical frame for frame; wall −24 … +47 a frame | identical; wall −31 … +31 |
| the heaviest swarm rows (≥ 2 Lights live, 1,076 frames) | worst margin 7,508 → 7,461 (−47, EASY), 8,097 → 8,086, 7,303 → 7,301 | 7,508 → 7,501, 8,097 → 8,086, 7,303 → 7,303 |
| the boss frame's own cost of the cadence | EST ≤ 40 native a quiet frame; one stepper admission on an arming frame (as today) | + `field_busy` (≈ 30 native) on an expired clock |

**The STOP conditions of the brief:**

| Condition | T | TW |
| --- | --- | --- |
| > ~80 B in the window | **no** (43 B) | **at the limit** (80 B) |
| any byte in slot A or D | **no** | **no** |
| initial-block growth | **no** | **no** |
| > ~100 cycles on the binding row | **no** (24) | **no** (0) |
| (also) a new boot sector | **no** | **yes**: the window's record grows to 12 sectors |

At `main` the ATR reaches the menu at frame 553 against a limit of 603. EST: one
sector is ≈ 2 frames of that.

**TW in a swarm.** Its per-frame cost is only the move of the code after it: the
new branch runs on an Interceptor's retire frame only (≈ 25 native, once a
pass). The swarm rows above show 0 to −7.

## 6. The owner's questions

| # | Question | Options | Recommended |
| ---: | --- | --- | --- |
| Q1 | The trigger's N | **N = 2** (the smoke's wish): the left edge is a refuge again (0 escorts, 0 hits in 80 s, §4.2). **N = 1**: the escort answers the first weapon kill and the edge is closed (6 hits). **N = 2 with a time fallback** (the escort also starts after X s without a second kill): not built; EST ~12 B of window, and the window's record has 14 B of slack left | **N = 1** |
| Q2 | The cadence | 150 + 0..63 frames (3.0-4.3 s) or 190 + 0..63 (3.8-5.1 s); the fight length barely moves between them (§4.1) | **150 + 0..63** |
| Q3 | The re-entry (TW) | Build it: +37 B of window over T, +1 boot-loaded sector, and it never happened in 62 measured escorts (§4.3). Or not | **Not now.** The chasing Interceptor ends its pass shot or in contact |
| Q4 | Regions 2-4 | Follow region 1 (they are copies; the S5 plan's R2 escort reuses this mechanism) | **Follow region 1** |
| Q5 | MEDIUM 3-6 s over 120 s (§4.1): which data lever brings it back | (a) plate HP: plates b-g one step down, measured in Phase B; (b) a later trigger (N = 2), which reopens the edge; (c) accept up to 126 s | **(a)**, the smallest trim that lands MEDIUM ≤ 120 by the aim proxy, measured and reported before the evidence |

**Recommended: T with N = 1** (variant T1's data), 150 + 0..63, no re-entry.
* It is the only variant that keeps both the smoke's two findings and the
  previous smoke's edge fix.
* It fits every limit: window +43 B in its 11 sectors, DIRECTOR_RAM +30 B, slot C
  +14 B in its 13 sectors, slots A / D / E 0, the initial block unchanged, the
  binding row −24.
* It needs a fight-length trim (Q5).

## 7. How to play each (Atari800, the 64 KB machine)

```
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-t-3b76e33e.atr"              # T, the default game
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-t-boss-route-1227f247.atr"   # T, straight to the boss (--level=1:sector=6)
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-t1-045db580.atr"             # T1 (N = 1)
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-t1-boss-route-cf39b16e.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-ts-dddd4bb9.atr"             # TS (190 + 0..63)
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-ts-boss-route-aba9bcfb.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-tw-03b3aab3.atr"             # TW (T + re-entry)
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-tw-boss-route-9cc887e6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-escort-main-boss-route-df262502.atr" # main, straight to the boss (reference)
```

| Build | ATR SHA-256 | boot |
| --- | --- | --- |
| T | `3b76e33e61abb5698111127921f4bc600005a002d68764f83dbe19942c38a5b0` | `47ff5096…` |
| T boss route | `1227f2470300de7a763f01f0639124aaef3e09901c2c89bfb375fd53e75eec29` | `463d58f9…` |
| TW | `03b3aab39048382438c2f054f1eadfd8c4d0d366abcf1465ed59b546b7bb13e4` | `41bd83c3…` |
| TW boss route | `9cc887e6f79999fd1ca24b7e86685759ee57f658d60b31a0396136fe17087e08` | `5ebf438b…` |
| T1 | `045db580370f3b0f12f0c69775c2cb608b573027906d99540be2a6c12491a820` | `00899ba8…` |
| T1 boss route | `cf39b16e1da9f9d8c7008f988db01217910810654cba540fe0aee4d8e67d8809` | `b7166810…` |
| TS | `dddd4bb9947807bd0de1d2b6d332e53e855ec35be782ad072536c8b2c3cf7771` | `bd597905…` |
| TS boss route | `aba9bcfb8fc4fcdc41bf6262333016e0ec147fa6b31a340ae695aef26eab6c53` | `5a01f534…` |

To rebuild: `node scripts/build.mjs --escort-variant=t|tw|t1|ts [--level=1:sector=6]`.

**What to look for at the smoke:**
* Does the escort's arrival read as the boss calling for help once it is losing?
* Does every 3-4 s feel like "every few seconds", or like a constant stream?
* Park at the left edge and fire. With T no escort comes; with T1 one does.
* In TW, out-run an Interceptor sideways down the whole screen: it comes back in
  at the top.

## 8. Phase B (after the choice)

The tests come first, RED on `main`, GREEN after:
* no escort before N weapon kills;
* escorts keep coming until the boss falls, with at most one Light live;
* none after the defeat;
* the interval within its jittered range;
* for TW, the re-entry.

Then:
* the chosen code into `src/`: `director.c`, the two calls in `boss.c`, the
  install, the pin;
* if TW: `lifecycle.c`;
* `build.mjs` refuses a region with an escort under a level whose boss sector
  authors no escort wave, and the reverse;
* region 1's `escort` block and level 1's boss wave (`count 1`);
* item 6: `lower-playfield-laser-contact-atr-hard`'s budget extended so that it
  again finishes the boss and covers the screen after it;
* the evidence in the usual order;
* the choice recorded in the decision journal and in s5-boss-regions §4.3 (R2's
  escort reuses this mechanism).
