# The Interceptor without kamikaze runs: back off and fire

**Branch:** `feat/interceptor-standoff` from `main` `ef1924d` (ATR `90f3e24e…`,
boot `fce37c74…`, the `feat/boss-escort-flow` merge, decision AI).
**Status:** Phase A - audit, comparison builds, measurements. `OWNER DECISION
REQUIRED` (§9).

**The owner's finding (2026-10-11, after playing the escort flow):** the
Interceptor chases at the player's own top speed, so every pass ends shot down
or in a collision with the player - in effect a kamikaze run. Wanted: it stops
ramming, backs off a few rows upward and fires at the player. This applies to
every Interceptor: the boss escort and the level waves. The boss fight
(MEDIUM 125.9 s, accepted up to 126 s temporarily in AI) is retuned to 90-120 s
in this task.

Labels: **M** measured on this branch - the Atari800 trace harness on debug
routes (`build/[interceptor-variant-X-]level-1-s0|s6`, focused runs) or the
6502 harness of the tests on a variant build; **EST** an estimate, with its
basis.

---

## 0. Step 0 and the baseline

`main` `ef1924d` (the escort-flow merge; `docs/plans/boss-escort-flow.md` is
built, `OWNER-SMOKE CANDIDATE`, decision AI recorded). `git worktree list`: the
primary checkout only. ATR `90f3e24e4bfebde0f72f2fc02f321607a6d1989150e07763415539d10d0271c5`,
boot `fce37c740d685386ca148bd240d89b4748e9835ee13757b0461ca9f32286b4c7`.

| Figure | Value | Source |
| --- | --- | --- |
| worst fence margin | 1,423 (`2-sweep-fire6` f311) | STATUS (escort flow, gates); **M** again on `main`'s `level-1-s0` route |
| DMA-on maximum | 31,310 (`memory-integrity-atr-2-hunt-fire7` f2376, the swarm) | `docs/runtime-wall-trace.json` `five_heaviest_frames`; **M** again |
| boss frames | 7,795 (`director-complete-1` f5,216) / 29,912 | STATUS; the route's `boss-aim-1` gives 7,795 at f5,216 (**M**) |
| boss stress, region 1 | 6,979 (limit 8,500) | STATUS |
| replays | 58, 0 clause failures, 0 missed frames | STATUS |
| boss entry | 64 sectors, 245 host frames | STATUS; 245 on every route run here (**M**) |
| code window | 965 B free; record 1,373 packed in 11 sectors (14 B to the 12th) | STATUS; `build/manifest.json` |
| DIRECTOR_RAM | 2 B free | STATUS, `docs/memory-map.md` |
| boss slot C | 1,662 B, 13 sectors | manifest |
| initial block | 13,623 B, 107 sectors | manifest |
| boss fight (aim bot, the ratio) | 101.1 / 125.9 / 142.8 s | STATUS; raw 48.7 / 60.9 / 63.8 s reproduced exactly on the route (**M**) |
| `npm test` | 1,297, 1 recorded failure (`preview`) | STATUS (not rerun in Phase A) |

No material disagreement with STATUS. The brief calls the escort plan
"implemented"; it reads "built, `OWNER-SMOKE CANDIDATE`", which is the same
state.

## 1. Audit (file:line, `main` `ef1924d`)

| What | Where | Today |
| --- | --- | --- |
| The record | `src/c/lifecycle.c:239-249` | HP 1, burst 1, interval 0, reload 56 / 44 / 32 (E / M / H), LASER, 15 points. |
| Movement | `src/c/lifecycle.c:1113-1146` (`light_tick_body`, the free-flight branch) | Born free (`LIGHT_ACTIVE_FREE`), never an escort. Descends 2 lines a frame (`INTERCEPTOR_DESCENT`); every other frame (`y & 2`) one 4-HPOS cell toward `PLAYER_X & $FC`, clamped to 48-200 - the player's own top speed (2 HPOS a frame, `src/main.s:3790-3805`). |
| How it leaves | `lifecycle.c:1142-1145` | At y >= 232 the slot goes inactive: a pass is 116 frames. |
| Its laser | `lifecycle.c:1159-1186`, `light_reload` `:588` | Fires on the reload, inside y 24..223, the player alive, with the one-event token; aimed nowhere - straight down from wherever it is. The kernel emits it (`src/hybrid/light-kernel.s:315-340`): the shared hostile pool, slots 5-9, `ACTIVE = (2 << 3) \| 6` = `$16`, X = light X + 2, 2 lines a frame. 1 / 2 / 3 shots a pass. |
| Laser vs player | `src/main.s:4213` `interceptor_projectile_hits_player` | A hit when the shot's X is within `[player_x - 1, player_x + 7]` (`PLAYER_COLLISION_WIDTH` 8). `PLAYER_X & $FC` always lands inside it. |
| Contact | `light-kernel.s:346-376` (`@contact`, `@touch`) | Full damage (`PLAYER_HEALTH_UNITS`, a death) and one unit to the Light (lethal). |
| Where the code lives | `HYBRID_C_WINDOW` (the code window's Director half, its own boot-loaded record of 11 sectors, 14 B to the 12th) | Frame code: the tick runs every frame per live slot, from `light_update`. |
| Per-slot state | `HYBRID_LIGHT_SLOTS` `$7FC4-$7FFE`, 59 of 60 B | state, hp, x, y, fire_timer, burst_left, archetype, code, screen_lo/hi, backing. Every Light record has burst 1, so `light_burst_left` is 0 between ticks: free for an age counter, **0 B of new RAM**. `$8133-$813F` (13 B, unowned) is the fallback. |
| Level 1 | `assets/levels/level-01.json` sectors 2, 3, 6 | The swarm's middle wave (3 Interceptors, spacing 24, entry 88; up to 3 Lights); elite (a), a Raider pair with an Interceptor companion; the boss sector's escort (count 1). Level 2 (not in the default replays) authors waves of 6 and 8. |
| The escort | `src/c/director.c:588-624` | One Interceptor every 150 + 0..63 quiet frames from the first weapon kill; an arming with the slot busy stays **pending** (`light_wave_remaining = 1`). `scripts/boss-assets.mjs:751-753` refuses `baseFrames` < 128, "longer than an Interceptor's pass (116 frames)": that is what keeps an escort from being admitted after the defeat. **Any new behaviour must keep an Interceptor's life under 128 frames.** |
| Tests on today's behaviour | `tests/light-interceptor.test.mjs` | descent 2 lines and retire at 232 (`:273`), pursuit every other frame (`:287`), cadence 1 / 2 / 3 a pass (`:337`), the fire gate (`:364`). |
| | `tests/level-one-waves.test.mjs:199` | the swarm drains inside its 384 rows with no kills (the timeline probe runs the Light kernel). |
| | `tests/boss-escort-flow.test.mjs` | the escort cadence; the 128-frame floor (`:149`). |
| | window pins | `tests/basic-window-capacity.test.mjs`, `level-buffer-16`, `level-summary-build` (965 free, 1,703 B). |
| Clauses | `scripts/trace-clause-observers.mjs:216-265` | L1 a live Interceptor, L5 elite (a) flew with its Interceptor; `coverage.boss_edge_guard` (`boss-edge-left-1`: at least one escort and one hit, parked at the left edge, 4,000 frames of fight). No contact clause involves a Light (the contact sessions are the capital's and the boss laser's). |

## 2. The variants (`--interceptor-variant=s|r`, `scripts/interceptor-variants.mjs`)

In-memory source edits, as the escort variants did; nothing under `src/`
changes.

### 2.1 S - slower chase

The same pursuit, tracking one cell every **fourth** frame (`(y & 6) == 0`):
half the player's top speed. The descent, the pass, the laser are unchanged.
**Why half:** at the player's speed it reaches whatever column the fighter flies
in; at half the player can always out-run it sideways, and the pass, the
escort's timing and the sector flow stay as they are. **0 B** (one constant).

### 2.2 R - standoff

* **Descends as today** - 2 lines a frame, one cell every other frame toward the
  player's column - until the player is **7 rows** below it (`far` 56 lines).
* **Holds** there; when the player closes to **under 6 rows** (`near` 48) it
  **backs off** upward 2 lines a frame (the player climbs 1). It never moves
  toward the player inside the standoff.
* **Each Light slot holds 2 rows higher** (`slotRows` 16): a swarm stacks into a
  column instead of merging into one cell (**M** in a first cut: three
  Interceptors in the same cell at (124, 172)).
* **Fires its existing laser only in the player's column** (light X equal to the
  tracking target, which always lands the laser on the fighter, §1); the reload
  is unchanged (1 / 2 / 3 shots a visit, E / M / H).
* **Leaves upward after 100 frames**, 8 lines a frame, and retires when y wraps
  past the top into the existing retire test - the cheapest exit: no new state,
  no new test.
* Its age is `light_burst_left` (every Light record fires single shots, so the
  shared fire path's burst block is a reload; it goes).
* Contact still counts if the player flies into it.

The values live in `STANDOFF` at the top of the variant file (Phase B: named
constants in `lifecycle.c`):

| Value | Chosen | Why |
| --- | ---: | --- |
| standoff `far` / back-off `near` | 56 / 48 lines | 7 rows leaves the laser 24-28 frames to fall - dodgeable; one row of hold band keeps it from flicking between rows |
| per-slot rows | 16 | separates three swarm slots by a free row each |
| life | 100 frames | three reloads on HARD (32, 65, 98); worst life **121 frames** (**M**, 6502 harness), under the 128-frame escort floor |
| climb out | 8 lines a frame | out in at most 23 frames from the lowest hold (y 173) |
| descent / tracking | 2 lines, one cell per 2 frames | today's; see §2.3 |

The packed window record moves by at most 1 B when any value changes (**M**:
life 90, far 64, near 40, climb 4).

### 2.3 Why R tracks at the player's speed and descends at today's rate

**The left-edge guard decides it.** In the boss sector the band (scanlines
24-87) stops the player's shots. Today's escort aligns with a fighter parked at
HPOS 48 while it is still hidden in the band, and fires as it leaves it (**M**:
5 of 6 hits on `boss-edge-left-1` are its laser). A first R (dive 4 lines a
frame, half-speed tracking) reached open space unaligned, crossed the parked
fighter's fire and died first: **0 hits, the guard FAILS** (**M**, 17 of 18
escorts shot down, one laser fired in the whole run).

**Half-speed tracking while holding costs 13 packed bytes** (**M**, 1,399 packed
= a 12th window sector) and is not offered.

## 3. Costs (**M**, manifests and traces)

| | `main` | S | R |
| --- | ---: | ---: | ---: |
| tick, one Interceptor, native cycles mean / max (6502 harness, still and weaving player) | 280-287 / 475-489 | 264-268 / 415 | 352-368 / 496-522 |
| window Director half / free | 1,703 / 965 B | same | 1,686 / 982 B |
| window record (11 sectors, 1,387 packed) | 1,373 (14 left) | same | **1,384 (3 left)** |
| `DIRECTOR_C_LOW` (resident, `$8B88`) | 68 B | same | **105 B** (+37: `field_busy`, `director_c_sector_spent`) |
| low C + GLUE record (3 sectors, 363 packed) | 327 | same | **362 (1 left)** |
| arena `HYBRID_C_ARENA` | 797 used, 35 free; record 719 of 747 | same | **818 used, 14 free** (`director_c_arm_wave`, 21 B); record 740 of 747 |
| C extension record, DIRECTOR_RAM, slots A/C/D/E, the initial block | 735; 2 B free; unchanged; 13,623 B / 107 | same | same |
| new RAM | 0 | 0 | 0 (`light_burst_left` reused) |
| transport | 213 sectors | 213 | 213, every record its own sector count |

**Why R moves three Director functions.** R's tick is +22 B raw but +43 packed
(new code compresses worse than the burst block it replaces). The window's
record had 14 B. The three sector-flow verdicts run on world-row ticks of a
space sector only, so their placement changes nothing; they move out of the
window's last segment (`HYBRID_C_WINDOW_FLOW`), which moves no byte of the hot
Light C. `DIRECTOR_C_LOW` has a 177-B free tail but its record only 36 packed
bytes; the arena's record 28.

**The arena move meets a floor.** `tests/heavy-breakup.test.mjs:494` asserts
the arena keeps **at least 28 B free**; R leaves 14 (the record keeps its 6
sectors). Under AJ that is the owner's (Q3). Without it, R fits only without the
per-slot rows (the swarm merges into one cell) or without the top-edge guard.

On the debug routes the low record reads 366 packed (4 sectors): the routes'
GLUE carries a few bytes more. Review builds only; the default build is 362.

## 4. Gates (**M**, focused runs on the routes; `main`'s route reproduces the evidence row for row)

| | `main` | S | R |
| --- | ---: | ---: | ---: |
| worst fence margin (row) | 1,423 (`2-sweep-fire6`) | 1,423 | 1,431 |
| next rows: `2-evasive-fire3` / `2-sweep-fire4` / `memory-integrity-atr-2-hunt-fire6` | 1,569 / 2,155 / 2,616 | same | 1,573 / 2,157 / 2,623 |
| DMA-on maximum (the swarm row) | 31,310 | 31,241 | **31,493** (`memory-integrity-atr-2-hunt-fire7` f2379; `weapon-pickup-2-hunt-fire4` 31,459) |
| boss frames, worst margin / DMA-on (aim E / M / H) | 7,795 / 29,718 | 7,875 / 29,882 | 8,587 / 30,030 |
| boss stress | 6,979 | = (EST: the escort runs in the Light kernel, outside the boss's own sum; boss code unchanged) | = (same) |
| boss entry | 245 | 245 | 245 |
| missed frames | 0 | 0 | 0 |

R's DMA-on row is the same population as `main`'s (three Interceptors, nine
shots). The Light tick runs after the line-238 fence on those frames, so its
+72-81 native cycles per Interceptor land on the wall: **293 over the 31,200
target, 1,075 under the hard gate** (Q7). Fence margins move by 8 at most.

## 5. Play (**M**)

### 5.1 Who hits the player (`scripts/measure-interceptor-hits.mjs` over a `--hit-trace` run)

An Interceptor **met the fighter** on a row where it dies overlapping the
fighter (the kernel's contact test); the damage cooldown can absorb the hit.

| Level 1 before the boss | `main` | S | R |
| --- | --- | --- | --- |
| director-complete replays (`boss-aim-0/1/2`), Interceptors met the fighter | 1 / 0 / 0 | 1 / 0 / 0 | **0 / 0 / 0** |
| hunting bots (`memory-integrity` 5/6/7, `weapon-pickup-2-hunt-fire4`): met the fighter | 4 / 4 / 4 / 3 | 4 / 4 / 4 / 3 | **0 / 0 / 0 / 0** |
| … hits by contact / by laser | 1+1+1+0 / 3+3+3+3 | same | 0 / 4+4+4+3 |

| Boss sector, aim bot E / M / H | `main` | S | R |
| --- | --- | --- | --- |
| fight, as the rule's ratio | 101.1 / 125.9 / 142.8 s | 93.4 / 118.6 / 162.9 | 102.0 / 124.1 / 170.4 |
| escorts | 13 / 15 / 13 | 12 / 15 / 18 | 12 / 17 / 18 |
| escorts that met the fighter | 1 / 2 / 4 | 0 / 2 / 4 | **0 / 0 / 0** |
| hits (all sources) / of them the laser | 2 / 5 / 9; 0 / 1 / 2 | 1 / 2 / 9; 0 / 0 / 0 | 1 / 3 / 6; 0 / 0 / 2 |
| deaths in the boss sector | 1 / 2 / 2 | 0 / 0 / 4 | 0 / 0 / 1 |
| most Lights live / admitted after the defeat | 1 / 0 | 1 / 0 | 1 / 0 |

### 5.2 The left edge

| `boss-park-left-N` (s6 route, 80 s parked at HPOS 48, firing) E / M / H | `main` | S | R |
| --- | --- | --- | --- |
| hits | 4 / 6 / 5 | **0 / 0 / 1** | 4 / 6 / 6 (all laser) |
| escorts met the fighter | 4 / 6 / 4 | 0 | 0 |

**S reopens the left-edge refuge** (decision AI point 6). `boss-edge-left-1` on
the s0 route: `main` PASS (17 escorts, 6 hits); S and R end **3,939 / 3,894
frames into the fight**, before the clause's 4,000-frame window - level 1 runs
longer when its Interceptors no longer die on the fighter, and the replay's
7,100-frame budget no longer contains the window (class (a); Q5). Within it S
took 1 hit (not an Interceptor), R 7 (all the escort's laser).

## 6. The fight's length (the lever)

The escort's start and cadence are AI's and stay. Probes on R's code, plate and
gun hit points in region 1's `modules.json` (**M**, aim bot, as the ratio):

| Probe | E / M / H |
| --- | --- |
| R | 102.0 / **124.1** / 170.4 |
| plates b-g −2 HP | 93.4 / 122.7 / 150.0 |
| plates b-g −4 HP | 102.6 / 120.9 / 147.9 |
| guns 14 → 12 | 87.0 / 121.6 / 162.1 |
| **plates b-g −4 and guns 14 → 12** | **76.9 / 103.7 / 154.4** |

**Recommended: plates b-g −4 HP (b, c, g 16 → 12; d, e 20 → 16; f 12 → 8) and
the six guns 14 → 12.** The only probe inside the rule (MEDIUM 90-120, EASY
shorter, HARD not shorter). The fights are noisy (±3 s between neighbouring
probes); Phase B re-measures on the final build before the evidence.

## 7. What changes if R is chosen

* **Tests re-pointed with reasons:** `light-interceptor` (descent, retire,
  pursuit phase, the fire gate needs the player in the column);
  `hybrid-c-arena` (35 → 14 B free, exact pin); window pins 965 → 982 /
  1,703 → 1,686 (`basic-window-capacity`, `level-buffer-16`,
  `level-summary-build`); `boss-r1-tuning` (the plate and gun hit points, the
  126-s bound ends). **A floor:** `heavy-breakup:494` (Q3).
* **New tests, RED on `main`:** never steers toward the player inside the
  standoff; fires only in the player's column; leaves within 128 frames; the
  swarm's slots hold apart; no escort after the defeat, never two.
* **Clauses:** none weakened. `boss-edge-left-1`'s budget (Q5); the level-end
  stats clause trips on a pre-existing defect R's timing exposes (§8.1, Q4).
* **Docs:** `docs/memory-map.md` (`DIRECTOR_C_LOW`, the arena, the window's last
  segment), `game-design.md` (Interceptor), `level-authoring.md` (the plate and
  gun HP), STATUS, the decision journal.

## 8. Findings outside the Interceptor

### 8.1 A lethal debris shot clobbers the PairShot loop's X (pre-existing)

`update_fighter_projectiles` (`src/main.s:4073`) calls
`entity_player_fighter_projectile_target_with_light` = `light_shot`, which ends
`ldx LIGHT_SLOT_SAVE / jmp entity_player_fighter_projectile_target`
(`src/hybrid/light-kernel.s:517`). A lethal debris hit there calls
`spawn_debris_destruction_effects`, `integration_debris_release` and
`debris_shot_reward` (`src/main.s:10662-10665`), which load X, and returns into
the loop with the slot index clobbered.

**M** on R's `boss-aim-0` (the same replay as the default `director-complete-0`):
f3,153 a PairShot is allocated in slot 1; f3,154 slot 0 destroys a debris piece
and slot 1 is not moved (`update_count` 0, lifetime `$FF` on two scans); the
summary's shot counter (`src/hybrid/sector-reader.s:958`) counts it twice:
**626 shots against 625 allocations - the level-end stats clause FAILS**. No
Light is live. `main`'s replays pass only because their timing never puts a
debris kill under a fresh shot.

**Visible effect:** a shot in a higher slot stalls one frame; the summary's
shot count (and its accuracy) is off by one. With R it would appear as a NEW
failure in Phase B's evidence. **Proposed fix:** `light_shot` calls the target
path and restores X (`jsr … / ldx LIGHT_SLOT_SAVE / rts`), +4 B in the Light
kernel's record (77 B of slack), carry preserved; its own commit with a RED test.

### 8.2 The swarm's (a) companion and timing

A first R cut (Interceptors living 121 frames on the hunting bots) moved elite
(a)'s Raider pair 10 frames: a Wingman of the swarm's third wave was still live,
the elite ceiling of 1 was full, and the companion Interceptor was refused. The
final R does not show it (4 level Interceptors on every replay), but the data's
elite-to-elite carry-over is timing-sensitive; clause L5 watches it.

## 9. Owner questions

| # | Question | Options | Recommended |
| ---: | --- | --- | --- |
| Q1 | The behaviour | **R** (no Interceptor met the fighter in any replay; the left edge stays closed) / **S** (still rams: 4 of 4 for the hunting bots, 4 on HARD's boss; reopens the left edge, 0 / 0 / 1 hits) / keep `main` | **R** |
| Q2 | R's values | 7-row standoff, back off under 6, +2 rows per slot, 100 frames then out at 8 lines a frame, today's descent and tracking (half-speed tracking costs a 12th window sector) | **as built** |
| Q3 | The arena floor `tests/heavy-breakup.test.mjs:494` (≥ 28 B free) | (a) lower it to 14 for R's relocation (the record keeps 6 sectors, 7 packed B left); (b) keep it: R without the per-slot rows (the swarm merges into one cell when it holds) | **(a)** |
| Q4 | The debris-shot X clobber (§8.1) | fix now (+4 B Light kernel, its own commit and RED test) / leave it | **fix now**; R's evidence needs it |
| Q5 | `boss-edge-left-1`'s budget | 7,100 → 7,400 frames (class (a); the clause unchanged) / keep | **7,400** |
| Q6 | The fight's lever | plates b-g −4 and guns 14 → 12 (76.9 / 103.7 / 154.4) / another probe | **plates −4, guns 12** |
| Q7 | The DMA-on target | R puts the swarm row at 31,493 (293 over 31,200; hard gate 32,568) - accept / ask for a cheaper tick | **accept** |

## 10. How to play each (Atari800, the 64 KB machine)

```
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-s-5728fff6.atr"              # S, the default game
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-s-boss-route-a46b37d3.atr"   # S, straight to the boss
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-r-e64ab850.atr"              # R, the default game
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-r-boss-route-e9ecc878.atr"   # R, straight to the boss
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-interceptor-main-boss-route-91de3f27.atr" # main, straight to the boss
```

| Build | ATR SHA-256 | boot |
| --- | --- | --- |
| S | `5728fff6efcdcb557d76dc41a61c593f653dae1cbd8fa9d0a680ac61764f53f6` | `6946fc80…` |
| S boss route | `a46b37d3195d8bbcf25347b221f14a2ac5b727cac4bb356662e84de804f31642` | `21794b7e…` |
| R | `e64ab850952fef3e944ee467153e32892f130459766f262d9094711ec815dafa` | `5d57f6e9…` |
| R boss route | `e9ecc878db29ee01c1d25b6353e14f8da4a4688f49d69b39220584fbdb9f9933` | `4036c868…` |
| `main` boss route | `91de3f278d99c69e7173f2817d81bf6582e77ab081c71ab651af57b7e3328e62` | `c659c22a…` |

To rebuild: `node scripts/build.mjs --interceptor-variant=s|r [--level=1:sector=6]`
(the probes: `rp2`, `rp4`, `rg2`, `rp4g2`).

**What to look for:**
* The swarm after the capital: three Interceptors in R stop in a column above
  you, follow you sideways and fire straight down only when over you, then climb
  away; fly up at one and it backs off.
* The elite (a) Raider pair's companion.
* The boss: the escort's rhythm is unchanged (one every 3-4 s); in R it no
  longer dives onto you at the bottom.
* Park at the left edge and fire: S leaves you alone, R still hits you.
* S: does a half-speed chase still feel like a ram?
