# The boss order and the difficulty curve (and the Interceptor's dead zone)

**Branch:** `feat/boss-order-scale` from `main` `4767691` (the `fix/gfx-regression`
pin on top of `feat/boss-art`; ATR `33b1acb3…`).
**Status:** Phase A — measured, proposed, built; **OWNER DECISION PENDING**
(§9). Step 1 (the dead zone) and the hit-box change the owner added mid-session
(decision AW) are committed; the order and the curve are review builds only
(`--boss-proposal`), the bosses' own data is unchanged. Evidence not
regenerated (Phase B).

Labels: **M** measured on the Atari800 trace harness (debug routes, focused
`--hit-trace` runs, one replay per cell); **M-N** the 6502 harness on the
production main loop; **IC** instruction count; **EST** an estimate with its
basis. Fight seconds follow the owner's rule (journal §AH): the aiming bot's
fight frames × main's plain sweep / main's aiming bot, per difficulty, / 50.

---

## 0. Summary

* **Step 1, the dead zone — done** (`a49b8de`, `8badf65`): the hovering
  Interceptor does not step sideways while the ship's centre is within 4 HPOS
  of its own column (exactly while the ship's shot crosses it); outside it the
  tracking is decision AS's. **0 B net** in the window (the +14 B paid by
  trims in the same tick and the last pad byte), the Light kernel byte-identical
  at `$B478`, page-crossing taken branches in the window and kernel **2 → 0**.
* **The hit box — done** (decision AW, `1ce7efe`): the dead zone exposed that
  every hostile shot hit only the ship's left 8 HPOS (a ship at x ≡ 2 mod 4
  took **0** Interceptor lasers on `main`, M). Every hostile shot and boss beam
  now meets the drawn ship, `x .. x + 15` (0 B). Boss hits on the bots
  **+29 % (aiming) / +37 % (beam-leaving)** on MEDIUM; every fairness rule
  holds on the drawn ship (§3).
* **The order (proposal):** **Blockade Breaker → Void Citadel → Siege Spine →
  Bastion** — the Breaker is the gentlest by far (7.6 hits a minute on the
  beam-leaving bot, MEDIUM), the Bastion the harshest at every tier and
  difficulty (24–27 a minute, 2–3 deaths a fight), the Citadel and the Spine
  between. **Alternative:** Breaker → Spine → Citadel → Bastion.
* **The curve (proposal v2, by data):** module hit points ×0.67 / ×1.10 /
  ×0.90 / ×1.00 → MEDIUM **82 → 91–103 → 110–120 → 119 s**, HARD **109 →
  125–135 → 141 → 145 s** (rising at every step), danger **5.8 → 12–14 →
  11 → 28** hits a minute. Two misses, both owner questions (§9): the
  Spine's EASY at levels 7–8 (114 s, one replay) and its pressure under the
  Citadel's.
* **Gates on both orders:** 0 miss events in 90 sessions, boss-frame fence
  margin ≥ 4,293, DMA-on ≤ 31,041, entry 249–264 host frames (limit 300),
  stress ≤ 8,148 (limit 8,500), colour rules in every new region.

---

## 1. Step 1 — the Interceptor's dead zone

**Rule** (`src/c/lifecycle.c`, `light_tick_body`): holding while
`(uint8)(light_x − player_x − 1) < 8` — the ship's shot (`player_x + 8`) is
inside the Interceptor's `[x, x + 8)`. That is the owner's "within 4 HPOS"
(the ship's centre 4 HPOS left to 3 HPOS right of its centre), with the side
where the shot would pass beside it left out — the AS catch rule. Inside the
zone its own column is the player's: it holds **and fires** (without the
second half a ship parked at the zone's edge would never be fired at).

**Bytes.** The zone costs `light_tick_body` **+14 B** (573 → 587, IC from the
listing). Three cc65 store/reload pairs in the same tick (the loop-mask test,
the standoff distance, the escort column) and the fire timer's test written
as an assignment-in-condition pay **13 B** back (587 → 574); the window's last
pad byte goes. Director window half **1,656 B (0 B net)**, record 1,322 → 1,319
packed (11 sectors), Light kernel **unchanged at `$B478`** (957 B, its link
byte-identical; pins unchanged). The kernel is crossing-free only at
`$B473–$B479` (M from the listings: at `$B47A` light_shot's two `beq @alive`
cross, from `$B485` light_update's slot loop); taken branches crossing a page
in the window C and the kernel **2 → 0** (both on `main` in the tick).

**Before / after** (main `4767691` → dead zone `8badf65`; M):

| | main | dead zone | source |
| --- | ---: | ---: | --- |
| worst fence margin / DMA-on maximum (the full default trace, 58 replays) | 1,260 / 31,059 | **1,267 / 31,031** (§1.1) | the trace |
| Light kernel / window record | `$B478`, 847 / 1,322 B packed | `$B478`, 847 / 1,319 B packed | the manifest |
| level 1's Interceptor swarm (longest live run, sweep bot, E / M / H) | 4.0 / 4.0 / 5.5 s | 3.8 / 4.0 / 5.5 s | `boss-aim-N`, road |
| level 1's Interceptors born / shot down / rams (each difficulty) | 4 / 4 / 0 | 4 / 4 / 0 | the same |
| hits by an Interceptor's laser on the bot, level 1's road (E / M / H) | 2 / 2 / 1 | 3 / 3 / 1 | the same |
| … in the four boss fights, summed (aiming bot E / M / H) | 5 / 4 / 8 | 8 / 5 / 9 | four routes |
| rams anywhere | 0 | 0 | every run |

The road plays frame for frame as on `main` on MEDIUM and HARD (the same road
length, kills and hits); EASY differs (its road 3,323 → 3,405 frames). Tests:
`tests/interceptor-dead-zone.test.mjs` (5; RED on `main`, 3 of 5) — no
sideways step inside the zone on either frame parity, decision AS's step
outside it frame by frame on six ship paths, firing only in the zone or the
column with the laser on the ship's drawn body, 1 / 2 / 3 lasers a visit from
either edge of the zone. Standoff, back-off, loops, exit, armour, flash, the
catch table and the 128-frame floor: their own tests, unchanged and green.
Re-pointed with reasons: the standoff's fire-in-column clause, the pursuit
reference model, the window ASM segment may be empty.

### 1.1 The full default trace on the dead-zone build

The default set on the dead-zone build (`8badf65` with this branch's
corrected bots, candidate ATR `fc06285f`; diagnostic, not committed as
evidence; M): **58 replays, 0 distinct miss events; worst fence margin 1,267**
(`2-sweep-fire6`, a Light admission frame; `main` 1,260 on the same row),
next 1,379 (`2-evasive-fire3`); **DMA-on maximum 31,031** (`2-evasive-fire7`;
`main` 31,059); 16 boss entries. One clause failed:
`lower-playfield-laser-contact-atr-hard` "did not capture 16 consecutive
contact rasters" — the contact bot, rewritten for the drawn ship (§3), seeks
a beam the old 8-HPOS box (still in this intermediate build) does not count.
**On the current tree (dead zone + hit box) the same session passes** (M,
focused run on candidate `7c5664ed`: 9,499 frames, 0 misses, margin 2,612);
the dead-zone-only build never ships. The full trace on the final tree is
Phase B's regeneration.

## 2. The hit box — every hostile shot meets the ship as drawn (decision AW)

**Found by the dead zone** (M on `main`): a ship parked at x ≡ 2 (mod 4) took
**0** of an Interceptor's lasers at every difficulty (x ≡ 0: all of them). The
ship is P0 at double width (`SIZEP0 = 1`, 16 HPOS from `player_x`) and
`player_shape`'s rows 5–8 set all eight bits — the wing tips are drawn at
`x + 0` and `x + 15` — but the pool's shots
(`interceptor_projectile_hits_player`: Raider and Bomber pulses, boss pulses,
Light lasers) and the boss beams (`laser_collide`) used the legacy
`PLAYER_COLLISION_WIDTH` 8, the ship's left half. With the dead zone as
specified an Interceptor arriving from the right stops at the zone's far edge,
so a ship left of its entry would have taken 0 lasers.

**The box chosen:** `x .. x + 15` over the collision rows 0–14 — the drawn
hull's full width at its widest rows (no empty column to trim, so offset 0),
the box the capital's shells already used (`capital_shell_hits_player`). A
shot (2 HPOS) hits at `s − x ∈ −1..15`, a beam (4 HPOS) at `h − x ∈ −3..15`.
**0 B** (two constants). Hull contacts (Heavy rams, the capital row) keep
their own boxes. Tests: `tests/ship-hit-box.test.mjs` (4; RED on `main`).

**Before / after per source** (before = the dead zone, after = + the hit box;
the same bots; four bosses' routes summed, each boss at its route's tier; boss
hits / deaths; M):

| bot, difficulty | before: beam / boss pulse / Light laser / ram | after | road (level 1) before → after |
| --- | --- | --- | --- |
| aiming E | 28 / 3 d — 3 / 17 / 8 / 0 | 36 / 3 d — 3 / 24 / 9 / 0 | 8 → 9 |
| aiming M | 45 / 6 d — 6 / 34 / 5 / 0 | **58 / 9 d** — 5 / 37 / 15 / 0 | 8 → 12 |
| aiming H | 64 / 9 d — 6 / 49 / 9 / 0 | 66 / 10 d — 6 / 40 / 19 / 0 | 4 → 8 |
| beam-leaving E | 29 / 2 d — 0 / 22 / 6 / 0 | 32 / 3 d — 0 / 25 / 6 / 0 | 8 → 9 |
| beam-leaving M | 41 / 2 d — 1 / 29 / 10 / 0 | **56 / 4 d** — 1 / 41 / 14 / 0 | 8 → 12 |
| beam-leaving H | 57 / 6 d — 2 / 48 / 6 / 0 | 78 / 8 d — 1 / 56 / 19 / 0 | 4 → 8 |

The Light laser's share roughly doubles to triples, boss pulses +10–40 %,
beams unchanged, rams 0. Per boss (MEDIUM, aiming bot, before → after): R1 5 →
8 hits, R2 19 → 23, R3 10 → 14, R4 11 → 13.

## 3. Fairness on the drawn ship (re-checked; every rule holds)

* **≥ 10 frames to leave a warned beam.** The R2 / R4 tests modelled the old
  box (`edge − x ∈ −3..7`): re-pointed to −3..15, they pass — R2 every beam
  left with **35 / 27 / 20** frames to spare (worst escape 5), R4's axis beam
  against the pull **32 / 24 / 17** (worst 8). From the real trajectories
  (`build/boss-order-scale/escape-rule.mjs`, every warned beam of 105 runs,
  drifting bands included): the fewest frames from the ship's x at the
  warning to an x the moving beam never touches, **worst spare 15** (R3, tier
  4, HARD: 25-frame warning, 10 needed; the beam lasts 50 frames and drifts 11
  HPOS). None under 10.
* **No refuge** (R2's core, R4's axis): hold; stricter on the drawn ship (the
  core's volley now meets both of the armoured flank's shooters — re-pinned).
* **The left-edge guard** (R2 `region-2-edge-left-1`, R1's in the default
  set): the escort reaches a parked ship and hits it — more hits, not fewer.
* **No ram:** 0 Interceptor contacts in every run of every build.
* **Contact clauses** unchanged; the beam-seeking contact bot (target
  `hpos − 2`) still lands inside the box.
* **Stale scenarios rewritten honestly** (`scripts/atari800-wall-trace.h`):
  the bots measured threats from `x + 4`, the old box's centre — the
  beam-leaving bot hovered on a beam's edge and the well tipped it in (2 beam
  hits a fight on R4, none on `main`). Now from the drawn centre `x + 8`, the
  old margins kept; one shared beam escape (hold in a gap between two beams,
  cross a warned beam the screen edge shuts off, 12 HPOS spare for a drifting
  band). Remaining: R3 — one beam hit a fight on the beam-leaving bot (its
  50-frame beam drifts more than the bot's 12-HPOS allowance; the game leaves
  ≥ 15 frames, above).

A finding worth the owner's eye: **R1 and R3 carry a beam with the band**
(1 HPOS every 2 frames, in the warning and the beam). On the drawn ship a
player parked at the left wall must cross a beam warned near the wall during
its warning — escapable (above), but no longer free.

## 4. Audit — what ties a boss to a region (file:line)

* **Which boss a level shows:** not the level data. `"boss": N` compiles to
  `core[7]` (`scripts/level-compiler.mjs:855,885`) and nothing in `src/` reads
  it. The runtime takes the region from the level id, `min(3, (id − 1) / 3)`,
  in three places: the WARNING screen's theme / title read
  (`src/main.s:13242-13261` → `boss_enter_read`,
  `src/hybrid/light-kernel.s:720-736`), the band / charset / slot F runs
  (`src/hybrid/boss.s:256-287`, the run table `boss-runs.inc`,
  `scripts/build.mjs`), and the summary art (`src/hybrid/level-summary.s:477-492`
  — the capital hull style, which stays with the region).
* **Follows the boss's data** (moves with it): the band, charset, row palette
  (in the charset run's divider area, `scripts/boss-assets.mjs:1524-1535`),
  the title (`modules.json` `name`), module HP / reloads / cooldowns /
  `laser.beamFrames`, the escort cadence (`modules.json` `escort`), the
  finale cooldown, the rails / field / well block code.
* **Tied to the level / region:** the laser tier (`boss.s` `laser_tier`:
  levels 1–4 / 5–8 / 9+ → 1 / 2 / 4); `bossDef` (`level-NN.json`: `hpScale`
  per difficulty in quarters 0.5–1.5, `laserDamage`, `laserWarning`,
  `laserReload`); the ally steel and the hull style
  (`scripts/build.mjs:493-501`: **regions of four levels** — steel `$88` on
  levels 1–8 and `$84` on 9–16, not 1–6 / 7–12; already recorded in
  `docs/plans/budget-1.0.md:101` (item 3); both are hue 8, so the colour-distance
  rule, which is a hue rule, does not depend on it); the escort wave (level
  JSON); the music (one track).
* **Slot-bound in the build** (fixed before this session):
  `bossRegions[1]` rails, `[2]` field, `[3]` well and their block
  attachments. **Now data** (`18da406`): `assets/graphics/boss-regions/order.json`
  (absent = 1, 2, 3, 4) places each boss's data and its block code in the
  region the order names; the runtime is unchanged. Identity order
  byte-identical (ATR `7c5664ed`, boot `2509cdb6`, M).
* **Slot-bound in the tools** (fixed): the trace's observers were gated on
  levels 4–6 / 7–9 / 10–12 (`scripts/atari800-wall-trace.h`) — now the
  manifest's regions (`a5ffafa`); the stress tools found R2 and the field by
  index — now by feature. Still region-numbered (Phase B): the per-region
  test files, the region route sessions' policies
  (`scripts/runtime-wall-trace.mjs:830-912`), R1's emitter names in the
  laser-contact policy.
* **Levels today:** `assets/levels/level-01.json` (boss 1) and `level-02.json`
  (no boss). **Only region 1's boss is reachable in the shipped game**; regions
  2–4 only on debug routes. The order decides which boss the player meets
  first now, and the data the later levels will use.
* **Interceptor HP:** a C constant (3, `src/c/lifecycle.c` `enemy_archetypes`),
  the same everywhere; per region would be window code (§8).
* **The route caveat:** `--boss-region=N` runs level 1's JSON as level
  4 / 7 / 10, so its tier is 1 / 2 / 4. For equal terms this session adds
  `--laser-tier=T` (debug only, `5b0848c`).

## 5. The bosses on equal terms (dead zone + hit box; M)

Every boss on level 1's road and `bossDef`, at tiers 1 / 2 / 4, each
difficulty: the **aiming bot** (`boss-aim`, the fight length) and the
**beam-leaving bot** (`boss-aim-careful-dodge`, the pressure). One replay a
cell (expect ±10 s and ±2 hits a minute of noise).

**Index** = ½ · (fight seconds / 110) + ½ · (hits a minute on the
beam-leaving bot / 14.6, the four bosses' MEDIUM tier-1 mean). 1.0 is an
average boss; half its length, half its pressure.

| boss, tier | EASY s · hits/min · index | MEDIUM | HARD | danger shares (MEDIUM): warn/beam · gravity · finale · escorts |
| --- | --- | --- | --- | --- |
| Breaker t1 (= t2 = t4) | 98 · 4.3 · 0.59 | 123 · 7.6 · **0.82** | 157 · 13.7 · 1.18 | 8 % · – · – · 16 |
| Bastion t1 | 94 · 13.0 · 0.87 | 109 · 26.6 · **1.41** | 146 · 26.2 · 1.56 | 4 % · – · 25 % · 11 |
| Bastion t2 (= t4) | 94 · 13.0 · 0.87 | 109 · 24.1 · 1.32 | 151 · 26.2 · 1.58 | 4 % · – · 25 % · 11 |
| Spine t1 | 112 · 5.6 · 0.70 | 120 · 10.3 · **0.89** | 130 · 13.4 · 1.05 | 15 % · – · 0 · 12 |
| Spine t2 | 122 · 9.4 · 0.88 | 130 · 15.2 · 1.11 | 133 · 17.1 · 1.19 | 22 % · – · 37 % · 13 |
| Spine t4 | 112 · 10.0 · 0.85 | 121 · 13.4 · 1.01 | 154 · 12.1 · 1.11 | 18 % · – · 41 % · 12 |
| Citadel t1 | 73 · 6.9 · 0.57 | 95 · 14.1 · **0.91** | 114 · 15.5 · 1.05 | 5 % · 53 % · 0 · 12 |
| Citadel t2 | 86 · 10.4 · 0.74 | 101 · 13.4 · 0.92 | 127 · 11.7 · 0.98 | 18 % · 50 % · 0 · 13 |
| Citadel t4 | 93 · 11.2 · 0.80 | 115 · 9.0 · 0.83 | 143 · 11.4 · 1.04 | 22 % · 56 % · 42 % · 15 |

Deaths a fight (aiming / beam-leaving, MEDIUM): Breaker 1 / 0, Bastion 3 / 2,
Spine 2 / 1, Citadel 2–3 / 1. **The Bastion's order** (its route, MEDIUM):
careful (cannons first) 110 s, 24 hits; careless (rails first) 101 s, 34 hits
— the puzzle still bites. The Breaker and the Bastion do not change with the
tier (two emitters each, already independent); the Citadel lengthens with it.

**Reading.** The Bastion is the harshest at every tier and difficulty (the
owner's candidate; its rail guns' pulses: 17–21 of its 23–30 hits). The
Breaker is the gentlest by pressure (long, but 7.6 hits a minute). The
Citadel and the Spine are close; at the tiers their slots would play, the
Citadel's index sits under the Spine's (0.91 / 0.92 at tiers 1–2 vs 1.11 /
1.01 at tiers 2 / 4).

## 6. The proposal, the alternative, the curve

**Proposal: Breaker → Citadel → Spine → Bastion** (`order` 1, 4, 3, 2).
* The Breaker first: the gentlest, the region-1 boss the shipped game already
  ends level 1 on (the shipped game keeps its boss), it teaches beams and the
  escort.
* The Citadel second: the shortest fight at tiers 1–2; the well adds movement
  without the Spine's long drifting beams.
* The Spine third: the most beam and warning time (18–22 %), the longest
  beams (50 frames, drifting), the field.
* The Bastion last: the highest pressure, the most deaths, the order puzzle
  (careless costs 40 % more hits) — the finale boss.

**Alternative: Breaker → Spine → Citadel → Bastion** (1, 3, 4, 2) — keeps the
Citadel's well and its four-beam tier-4 version late. The data favours the
proposal (§5: at the slots' tiers the Spine's index is above the Citadel's),
so the alternative needs the Spine lighter and the Citadel heavier.

**The curve (target, MEDIUM; replaces the flat 90–120 band for the later
bosses — owner question Q2):** region 1 ≈ 92 s → region 2 ≈ 102 → region 3 ≈
112 → region 4 ≈ 122; EASY shorter and HARD longer at every step; danger (hits
a minute on the beam-leaving bot) rising in the same order.

**The lever used (data):** each boss's module hit points × a percentage
(`docs/plans/boss-order-scale/{proposal,alternative}.json`, `--boss-proposal`);
EASY / HARD keep today's scales (`bossDef.hpScale` 3/4, 1, 5/4; reloads EASY
+1/2, HARD −1/4).

**Proposal v2** (Breaker 67 %, Citadel 110 %, Spine 90 %, Bastion 100 %; each
region at its levels' tiers; M):

| region (levels, tier) | boss | EASY s · /min | MEDIUM s · /min · index | HARD s · /min | entry |
| --- | --- | --- | --- | --- | ---: |
| 1 (1–3, t1) | Breaker | 70 · 1.7 | **82** · 5.8 · 0.57 | 109 · 10.7 | 249 |
| 2 (4, t1) | Citadel | 80 · 9.0 | **91** · 12.3 · 0.83 | 125 · 18.4 | 264 |
| 2 (5–6, t2) | Citadel | 91 · 11.1 | **103** · 13.9 · 0.94 | 135 · 16.9 | 264 |
| 3 (7–8, t2) | Spine | 114 · 3.9 | **110** · 11.2 · 0.88 | 141 · 14.5 | 260 |
| 3 (9, t4) | Spine | 94 · 9.1 | **120** · 11.2 · 0.93 | 141 · 15.0 | 260 |
| 4 (10–12, t4) | Bastion | 94 · 13.0 | **119** · 27.9 · 1.50 | 145 · 25.1 | 264 |

* MEDIUM length rises 82 → 91–103 → 110–120 → 119 (targets 92 / 102 / 112 /
  122): the Breaker ~10 s short (67 % overshoots; ~73 % would land on 92), the
  rest on target. **HARD rises at every step** (109 → 125–135 → 141 → 145).
* **Misses:** EASY — the Spine at levels 7–8 (114 s, longer than its own
  MEDIUM in this replay; at level 9 it is 94 s) and the Bastion's EASY (94 s)
  not above the Spine's; danger — the Spine's 11 a minute under the
  Citadel's 12–14 (MEDIUM, HARD).
* Index (MEDIUM): 0.57 → 0.83–0.94 → 0.88–0.93 → 1.50.

**Alternative v2** (Breaker 67, Spine 80, Citadel 108, Bastion 100): MEDIUM 82
→ 99–110 → 120–125 → 119 (region 3 above region 4), HARD 109 → 109–119 →
136–153 → 145 — not monotone; danger 5.8 → 5.5–9.8 → 9.7–10.4 → 27.9. Worse
on length, better on the danger order.

## 7. Levers per boss and difficulty (data; for Phase B)

| lever | where | per | use in the proposal |
| --- | --- | --- | --- |
| module `hp` | `modules.json` | boss (all difficulties) | **the curve's length** (v2: 67 / 110 / 90 / 100 %) |
| `hpScale` easy / medium / hard | `level-NN.json` `bossDef` | level × difficulty, quarters 0.5–1.5 | the per-difficulty shape when levels 4–12 exist (too coarse to fix one cell) |
| module `reload`, `fire.cooldown`, `fire.finaleCooldown` | `modules.json` | boss | danger order: Citadel's guns ~+20 % reload, Spine's ~−15 % (**EST**, to measure) |
| `laser.beamFrames` | `modules.json` | boss | the Spine's 50-frame drifting beam (keep ≥ 10 spare) |
| `laserWarning`, `laserReload`, `laserDamage` | `bossDef` | level × difficulty | ≥ 10 spare after the hit box: 15 at worst today |
| `gravity.framesPerStep` (the pull) | R4 `modules.json` | boss | 4 today; a stronger pull shortens the spare (§3) |
| rails / hangar / cannon / door / core HP | R2 `modules.json` | boss | inside the 100 % (v2 keeps them) |
| `escort` cadence (`baseFrames` ≥ 128) | `modules.json` | boss | 11–16 escorts a fight now; §AI's floor |
| Interceptor HP (3) | `src/c/lifecycle.c` | everywhere (C constant) | per region needs window code (§9 Q5) |

## 8. Gates (M)

| gate | limit | main / dead zone | proposal v2 | alternative v2 | source |
| --- | --- | --- | --- | --- | --- |
| worst fence margin (whole sessions) | ≥ 500 | 1,260 / 1,267 | 2,951 (route sessions) | 2,951 | PAL audit |
| boss frames, worst margin / DMA-on | ≥ 500 / 32,568 | – | 4,713 / 30,295 | 4,293 / 30,495 | `measure-boss-fight` |
| DMA-on maximum | 32,568 | 31,059 / 31,031 | 31,041 | 31,041 | PAL audit |
| missed frames (distinct miss events) | 0 | 0 | 0 in 45 / 45 | 0 in 45 / 45 | PAL audit |
| boss entry (host frames) R1 / R2 / R3 / R4 | ≤ 300 | 249 / 264 / 260 / 264 | 249 / 264 / 260 / 264 | 249 / 260 / 264 / 264 | the routes |
| stress, worst reachable, by level | ≤ 8,500 | R2 L4 / L5 7,723 / 7,935; R3 L7 / L9 7,775 / 8,029; R4 L10 8,148 | Citadel L4 7,734, L5 8,037; Spine L7 7,775, L9 8,029; Bastion L10 7,827 | Spine L4 7,406, L5 7,775; Citadel L7 8,037, L9 8,148; Bastion L10 7,827 | `measure-boss-stress-*` (M-N) |
| colour: ally ≥ 45° every row / flash pair ≥ 80 | – | ok | Breaker 150° / 84, Citadel 68° / 90, Spine 68° / 111, Bastion 118° / 84 in their new regions | the same | `scripts/boss-art-rules.mjs` |
| clause failures (route sessions) | 0 | – | 0 | 0 | the trace |

The full game's road is unchanged by the order (the Breaker stays first);
its default-trace gates are the dead-zone build's (§1.1) plus the hit box
(0 cycles).

## 9. Owner questions (recommendations first)

* **Q1 — the order.** **Proposal: Breaker → Citadel → Spine → Bastion**
  (recommended: the length curve and HARD rise cleanly; the Bastion is the
  hardest by every measure). Alternative: Breaker → Spine → Citadel → Bastion
  (the Spine's look earlier; needs the Spine lighter and the Citadel heavier,
  and its length curve is not monotone today).
* **Q2 — the targets.** MEDIUM ≈ 92 / 102 / 112 / 122 s replacing the flat
  90–120 band for the later bosses (recommended); EASY ≈ 0.8× and HARD ≈ 1.25×
  MEDIUM at each step.
* **Q3 — the per-difficulty shape.** The Spine's EASY is nearly as long as its
  MEDIUM (and one replay longer). Recommended: Phase B measures three replays a
  cell before tuning, then (a) the Spine's levels get `bossDef.hpScale.easy`
  0.5 when levels 7–9 are authored (data), or (b) a per-boss difficulty scale
  in the boss data (slot C code, **EST** ~20–30 B, slot C has 46 B free) —
  ask before (b).
* **Q4 — the danger order** between regions 2 and 3: recommended Phase B data
  tuning — the Citadel's pulse guns' reload ×1.2, the Spine's ×0.85 (EST),
  re-measured against the rule "rising in the order".
* **Q5 — Interceptor HP per region (3 early, 4 late).** A C constant today;
  per region is a table read at admission in the window (EST ~10–14 B; the
  window is full, so a trim or the owner's bytes). Recommended: not now — the
  hit box already raised the escorts' threat (Light-laser hits ×2–3).
* **Q6 — the drifting beams at the wall** (§3): fair by the rule (≥ 15 frames),
  but a ship parked at the left wall must now cross a warned beam the band
  carries toward it. Keep (recommended) or slow the drift while a beam is on.
* **Q7 — the Breaker's hit points:** 67 % lands at 82 s; ~73 % for 92 s
  (recommended in Phase B).

## 10. Play (`build/play/`, not committed; `atari800 -xl -pal -nobasic <absolute path>`)

The full game is levels 1–2 (only region 1's boss is reachable outside the
routes). A region's boss route (`--level=1:sector=6 [--boss-region=N]`)
enters level 1 at its sector 6 and ends on that region's boss, at that
region's first level's tier (1 / 1 / 2 / 4).

Proposal (Breaker → Citadel → Spine → Bastion), then the alternative (Breaker → Spine → Citadel → Bastion):

```sh
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-proposal-full-game-bbe093cb.atr"   # SHA-256 bbe093cb96dbb5c5…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-proposal-region1-boss-route-158aed5c.atr"   # SHA-256 158aed5ca38f0ce1…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-proposal-region2-boss-route-aac1660e.atr"   # SHA-256 aac1660ed0bbf7c2…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-proposal-region3-boss-route-b6d9b657.atr"   # SHA-256 b6d9b657a16a42c6…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-proposal-region4-boss-route-9c9f577f.atr"   # SHA-256 9c9f577f89ac48d3…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-alternative-full-game-7d87b394.atr"   # SHA-256 7d87b394f93f87b6…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-alternative-region1-boss-route-9f59876a.atr"   # SHA-256 9f59876a0d3fd8ae…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-alternative-region2-boss-route-a34c7e30.atr"   # SHA-256 a34c7e303bde5c8d…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-alternative-region3-boss-route-643b1abe.atr"   # SHA-256 643b1abe479f8ef1…
atari800 -xl -pal -nobasic "/Users/marcinkrzetowski/Projects/dark-fighter/build/play/boss-order-alternative-region4-boss-route-e005d745.atr"   # SHA-256 e005d745cc7723e9…
```

What to look for: the Interceptor holding still over a ship that moves a
little (no sideways shuffle) and stepping only when the ship moves on; every
hostile shot and beam that touches the drawn ship hurting it (the right wing
too); the boss order (WARNING title, art, row palette and the boss's own
mechanics in each region); each region's fight a little longer and harsher
than the one before.
