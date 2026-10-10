# Region 1's boss tuning — far-end guns, halved gun durability, an optional escort

**Branch:** `feat/boss-r1-tuning` from `main` `dcc331a` (ATR `75cf839c…`, boot
`7c44df1a…`). **Status:** Phase A, comparison builds for the owner,
`OWNER DECISION REQUIRED`. No committed change to `src/`, `assets/` or `dist/`.
Tooling only (commits `ea7306c` … this one).

**The owner's smoke findings (2026-10-09, Blockade Breaker):**
1. The guns sit too close to the middle. The player can hide at the left or right
   screen edge and survive there indefinitely. The guns must stand at the boss's far
   ends so that no reachable position is safe. An Interceptor might also help.
2. The guns are too durable and the fight gets boring. Halve the guns'
   durability; the laser emitter keeps its own.

Labels: **M** measured on this branch (Atari800, the trace harness; or the 6502
harness of `tests/boss-stress.test.mjs`); **MODEL** computed from the code by
`scripts/boss-coverage.mjs`; **EST** an estimate, with its basis given.

---

## 1. Inventory (file:line, `main` `dcc331a`)

| What | Where | Value |
| --- | --- | --- |
| Layout | `assets/graphics/boss-regions/region-1/modules.json` | 13 modules: gun-1 x22–24 r1–2 behind plate-c; gun-2 x26–28 r2–3, an open bay (exposed from the first frame); emitter x31–33 r1–3 behind plate-d; gun-3 x38–40 behind plate-e; gun-4 x44–46 r2–3 behind plate-g; plates a (11–15), b (17–20), c, d, e, f, g, h (50–53) |
| Durability | same file | guns 28 each, emitter 20, plates 12–20, capped plate 8 |
| Difficulty scale | `assets/levels/level-01.json` `bossDef.hpScale`; `src/c/boss.c:190` `boss_scale`, `:248` | ×¾ / ×1 / ×5⁄4 (E / M / H) on every module's HP and thresholds |
| Reloads | `modules.json`; `src/c/boss.c:426-440` `boss_fire_next` | gun-1 55, gun-2 90, gun-3 60, gun-4 65; EASY +½, HARD −¼; floor `fire.cooldown` 24. One countdown serves the armed guns in turn (each fires once a rotation). |
| Fire column | `src/hybrid/boss.s:690-760` `boss_fire` | column x + ⌊w/2⌋ (gun-1 23, gun-2 27, gun-3 39, gun-4 45); HPOS (4c − p + 33) & $FE, dropped outside 48..206; the shot rides the drift inside the band (`laser_hostile_shots`, `:2645`), then falls straight down |
| Laser column | `boss.s:1810-1816`, `LASER_PUBLISH` `:2727` | centre clock x·4 + w·2 = 130; beam HPOS 160 − p, 4 clocks wide |
| Band drift | `modules.json` `motion`; `boss.s:438-475` `boss_motion` | 1 colour clock every 2 frames over p = 0..63 and back (252-frame cycle), start 32 |
| Hit tests | `src/main.s:4213` `interceptor_projectile_hits_player`; `boss.s:2547` `laser_collide` | shot − x in −1..7; beam − x in −3..7; player x even, 48..200 (`main.s:522-523`, `:3791-3805`) |
| Trace bot | `scripts/atari800-wall-trace.h` `sweep` | HPOS 94 ↔ 154: a player shot meets band columns 17..48 only |

## 2. Coverage: what "safe" means (item 1)

**Definition (MODEL, `npm run boss:coverage`).** For every even x from 48 to 200, the
weapons whose fire can land on a fighter standing at x, over every band position of
the drift cycle. Spawn, ride and fall follow §1's code paths. **SAFE** means no
weapon can reach x. There are two states:
* *opening*: the weapons exposed at the install;
* *full*: every weapon exposed and alive.

The map does not depend on the difficulty, because the geometry is the same. The
pressure does, through the reloads: the expected hits a minute on a fighter that
stands still.

**Today (region 1 on `main`):**

```
opening  gun-2                                    x 48..200 |......11111111111111111................|  safe 48-70, 142-200
full     gun-1 gun-2 gun-3 gun-4 emitter          x 48..200 |..1111222223333333433332333332222221111|  safe 48-54
         hits/min standing still at x48: 0.0 / 0.0 / 0.0, at x200: 0.5 / 0.7 / 0.9 (E/M/H); MEDIUM peak 12.6 at x92
```

The owner's edge-hiding shows in this map. The left edge (x 48–54) is out of every
gun's reach. The right edge is reached only by gun-4, only after plate-g falls, and
at 0.7 hits a minute on MEDIUM. **M:** parked at HPOS 48 and firing (session
`boss-park-left-N`, 80 s of fight), the fighter took **0 / 0 / 0** hits. At HPOS 200
(`boss-park-right-N`) it took **1 / 1 / 2**.

With one gun destroyed, today's full map opens: losing gun-1 makes 48–70 safe, losing
gun-4 makes 48–54 and 190–200 safe, any other loss leaves 48–54.

## 3. The variants

### Variant A: far-end guns + halved gun durability (items 2 + 3)

* **gun-5** at x12–14, rows 1–2, recessed behind **plate-a**; **gun-6** at x50–52,
  behind **plate-h**. Both are pulse guns with reload 60 and score 50, drawn with
  gun-1's art: the 3 × 3 cells of gun and recess (decision O), copied into band,
  open, cracked and broken by `scripts/boss-r1-variants.mjs`. This keeps the layered
  fortress: every gun except gun-2 sits behind a plate. The preview is
  `npm run boss:preview -- --variant=a` → `build/boss-preview/region-1-variant-a.png`.
* **Every gun 28 → 14** hit points; the emitter stays at 20; plates unchanged.

```
full     + gun-5 (c13), gun-6 (c51)               x 48..200 |112222333223333333433332333332333332222|  safe: none
         hits/min standing still at x48: 0.3 / 0.5 / 0.6, at x200: 0.7 / 1.0 / 1.3 (E/M/H); MEDIUM peak 11.7 at x92
         one gun lost: only gun-5's loss reopens 48-54; every other loss leaves none
opening  unchanged (gun-2 alone): safe 48-70, 142-200
```

**Ledger (M, `build/boss-variant-a/void-strike-65-manifest.json`):**

| | `main` | A |
| --- | ---: | ---: |
| modules | 13 / 16 | **15 / 16** |
| charset codes | 122 / 128 | 122 / 128 (the art reuses gun-1's cells) |
| look tail (owner E4 cap 110 B) | 98 | **110** (two open looks of 6 B; 0 B left) |
| boss entry | 64 sectors, 245 host frames | 64 sectors, **245** host frames (every A session) |
| slot C | 1,648 B code, 13 sectors | unchanged |
| initial block | 13,623 B, 107 sectors | unchanged (15 boot-image bytes differ, all checksums) |

### Variant B: A + one Interceptor escort (item 4)

A plus level 1's boss sector authoring `archetypes: ["interceptor"], lights: 1,
waves: [{ archetype: "interceptor", count: 6, spacing: 100, row: 0 }]`. This is the
R2 plan's data (s5-boss-regions §4.3, owner answer Q5); data only. The kernel admits
one Interceptor at a time. **B reopens "no Light escort in R1"** (m5-loading-boss
decisions) and is never the default unless the owner chooses it.

### The lever measured for information: salvo far-end guns ("as")

A with gun-5 and gun-6 as salvo launchers: three shots a turn at x − 1, x, x + 1.
MODEL: 1.5 hits/min at x48 on MEDIUM. **M:** parked, 0 / 1 hits (MEDIUM / HARD) at
48 and 1 / 0 at 200. No measurable gain. It is not a variant on offer.

## 4. What the measurements say

### 4.1 Edge-hiding, MEASURED: the player parked at an edge, firing, 80 s of fight, lives held

| Build | x 48, hits E / M / H | x 200, hits E / M / H |
| --- | ---: | ---: |
| `main` | 0 / 0 / 0 | 1 / 1 / 2 |
| A | 0 / 0 / 1 | 0 / 1 / 0 |
| B | **4 / 5 / 5** | 1 / 2 / 1 |

**A meets the coverage criterion but does not stop a firing edge-hider.** The trace
on MEDIUM shows why: the parked fighter's shots kill plate-a at frame 513, which
exposes gun-5, and then kill gun-5 (14 HP) by frame 1,260. gun-5 lived about 15 s.
In that time it fired a handful of times and never hit, and the edge is quiet again
afterwards.

This is structural. One countdown serves every armed gun in turn, so an edge gun
fires about once every 5–6 shots. Its fire lands on a fixed x for only about 1 band
position in 8 (MODEL), and a shot born at the edge is often carried off the screen by
the drift. The owner's rule "no half-aimed shot" rules out aiming the guns. B's
escort follows the player and is the only lever that measurably raises the edge
pressure.

### 4.2 Fight length: three bots, three answers

The owner's rule (MEDIUM 90–120 s, EASY shorter, HARD not shorter) was calibrated
on the director-complete replays. Their **plain sweep cannot reach the far-end
guns**: it meets band columns 17..48, while plates a / h and guns 5 / 6 sit at 11–15
and 50–53. A director-complete replay of A or B therefore never ends. Two
boss-sector bots were added; each is the sweep, frame for frame, until the boss
entry:
* `sweep-boss-wide` (`boss-fight-N`): the whole reach, 58 ↔ 190;
* `boss-aim` (`boss-aim-N`): flies under the nearest live, exposed weapon, or under a
  plate that guards one, and leads it for the drift during the shot's flight.

All figures are M, in seconds from the engagement to the chain, on
`build/[boss-variant-X-]level-1-s0`. That route reproduces the committed
director-complete-1 exactly: 4,612 frames, chain at f7,613.

| Bot | `main` E / M / H | A E / M / H | B E / M / H |
| --- | --- | --- | --- |
| plain sweep (committed evidence) | 76.7 / **92.2** / 119.3 | never ends | never ends |
| wide sweep | 152.0 / 173.2 / 185.9 | 121.1 / 150.4 / 137.5 | 103.2 / 140.0 / 143.5 |
| aim | 36.9 / 44.6 / 53.3 | 49.0 / 57.5 / 62.4 | 44.8 / 59.5 / 66.8 |
| boss-sector deaths, aim (lives held) | 0 / 0 / 1 | 0 / 0 / 1 | 1 / 0 / 1 |
| boss-sector hits taken, aim | 1 / 5 / 3 | 2 / 3 / 9 | 3 / 4 / 6 |

Expressed in the plain sweep's terms (EST: `main`'s plain-sweep length × the variant
/ `main` ratio under the same bot):

| Ratio from | A E / M / H | B E / M / H |
| --- | --- | --- |
| aim | 101.9 / **118.9** / 139.7 | 93.1 / **123.0** / 149.5 |
| wide sweep | 61.1 / **80.1** / 88.2 | 52.1 / **74.5** / 92.1 |

The two bots disagree in direction. The wide sweep spends most of its time at the
ends, where `main` has nothing to hit and A has guns, so it flatters A. **The aim
bot does not waste time and is the fair proxy (recommended).** By it, A needs no
plate change: MEDIUM ≈ 119 s, at the top of the owner's range, EASY shorter, HARD
longer. B lands about 3 s over 120 on MEDIUM; one lever is plate-a / plate-h
16 → 12, untried. The halving cuts gun HP 112 → 84, but plates a and h now guard
guns and must fall (+32 HP to remove), and the end targets are reachable only part
of the drift. That is why A's fight does not get shorter.

### 4.3 Boss stress and frame cost

| | `main` | A | B |
| --- | ---: | ---: | ---: |
| boss stress, reachable worst (M, 6502 harness, limit 8,500) | 6,910 | **6,965** | 6,965 (the escort runs in the Light kernel, outside this sum) |
| the region 2–4 copies with the finale, reachable worst | 6,682 | 6,657 | — |
| unproven (3–5 meetings, information) | 7,652 | 10,184 (5 kills exposing 5 guns; unreachable under the 2-shot cap) | — |
| frames with a kill and a spawn (rule B) | 0 | 0 | 0 |
| boss frames, worst fence margin (M, all sessions above) | 10,017 (committed) | 10,838 | **6,026** (Light live, `boss-aim-2` f3,292) |
| boss frames, DMA-on max | 29,238 (committed) | 29,187 | **30,029** (Light live) |

**The cost of a live Light on the worst boss frames (M, B):** in the same sessions,
Light-live frames against no-Light frames run 6,026 vs 9,207 (aim HARD), 8,875 vs
11,505 (park left MEDIUM), and 7,569 vs 8,087 (wide MEDIUM). Against A's same
session (aim HARD 10,973) it is **−4,950 of margin at the worst, +860 DMA-on**. That
is more than the S5 probe's −1,600 (s5-boss-regions §2.2, a narrower bot), and
still far inside GO (500) and the hard gate (32,568). Boss frames are not the
game's binding rows (the worst fence margin is 1,447 elsewhere).

## 5. How to play each (Atari800, the 64 KB machine)

```
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-r1-A-f0013311.atr"             # A, the default game
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-r1-A-boss-route-6bb3408f.atr"  # A, straight to the boss (--level=1:sector=6)
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-r1-B-5ce24783.atr"             # B, the default game
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-r1-B-boss-route-618cc8d2.atr"  # B, straight to the boss
atari800 -xl -pal -nobasic "$PWD/build/play/void-strike-65-r1-main-boss-route-e2e4ef62.atr"  # main, straight to the boss (reference)
```

Full SHA-256: A `f00133112b3975076afd03bfa74c84ea574a9c34ba83c7c5d4478074a2eba6e6`
(boot `76b861f8…`), A route `6bb3408f…`, B
`5ce247830031e92d863b6b32e5cd3a6ca686924daf3fffac2bd82043b814fba5` (boot
`a8e2d744…`), B route `618cc8d2…`.

To rebuild: `node scripts/boss-r1-variants.mjs`, then
`node scripts/build.mjs --boss-variant=a|b [--level=1:sector=6]`.

What to look for at the smoke:
* Do gun-5 and gun-6 read as the boss's end guns?
* Is a screen edge still a refuge? It will be, briefly, in A once its end gun falls.
* Does the fight feel less like a grind with 14-HP guns?
* In B, does the escort read as pressure, or as noise over the boss?

## 6. Recommendation and owner questions

**Recommended: B**, with plate-a and plate-h trimmed if the smoke finds MEDIUM long.
It is the only option that measurably raises the edge pressure (4–5 hits in 80 s
against 0). A alone satisfies the coverage map and halves the guns as asked, but it
leaves the edge-hider a short duel they win. The cost of B: it reopens "no Light
escort in R1", takes −4,950 of boss-frame margin at the worst (far inside the gates),
and adds 0 code bytes.

| # | Question | Recommended |
| ---: | --- | --- |
| Q1 | A or B | **B** |
| Q2 | The fight-length proxy for the 90–120 s rule from now on (the plain sweep cannot finish a far-end layout) | **the aim bot, read as the ratio against `main`'s plain sweep** (§4.2); the director-complete replays switch their boss sector to `boss-aim` (class (a): the scenario moves, no clause weakens; every frame before the boss unchanged) |
| Q3 | The look tail at the E4 cap (110 / 110 B) | accept; any later open look needs a trim or a decision |

## 7. Phase B (after the choice)

The tests come first: RED on `main`, GREEN after.
* No safe position in the full map for region 1 and its copies.
* Gun durability halved, the emitter unchanged.
* The fight length per difficulty within the rule, by Q2's proxy.
* For B, at most one Light in the boss sector.

Then:
* `scripts/boss-r1-variants.mjs --write-assets=<choice>`;
* README / README.pl "Plays release v0.2.2" → v0.2.3;
* `level-summary.json` `segmentRow` for regions 2–4 inside 1..8, so that rows 8–10
  (the gun emplacement) are shown;
* the evidence in the usual order;
* the owner's findings and choice recorded in the decision record and the S5 plan.
