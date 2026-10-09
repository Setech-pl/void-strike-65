# Changing a level's waves — how-to

This is a short, practical companion to [level-authoring.md](level-authoring.md),
which is the complete format reference. It covers:

* where a level's waves live and what each field means;
* how to build and play a changed level without touching `dist/` or the
  evidence;
* what a data change invalidates before a merge.

## Where the waves live

Each level is one file: `assets/levels/level-NN.json` (level 1 is
`level-01.json`). The level is a list of **sectors** played in order, and each
space sector carries its own list of **waves**:

```json
"sectors": [
  { "kind": "space", "subtype": "elite", "rows": 272,
    "archetypes": ["raider", "wingman", "bomber"], "lights": 1, "heavies": 2,
    "hazards": { "debris": 1, "pickups": true }, "look": { "stars": "white" },
    "waves": [
      { "row": 0,  "members": ["raider", "wingman"], "count": 6, "spacing": 24, "entry": 124 },
      { "row": 88, "archetype": "bomber",            "count": 6, "spacing": 24, "entry": 124 }
    ] },
  { "kind": "capital", ... },
  ...
  { "kind": "boss", ... }
]
```

Level 1 today (feat/sector-flow, owner answers of 2026-10-08; before it
data/w2-lights, fix/smoke-2026-10-07 P2 and W1) has these sectors, numbered
from 0 as the debug route counts them. The rows are each sector's **no-kill
cut**: a sector ends earlier as soon as its waves are spent and the field is
clear (see "How a space sector ends" below).

| Sector | Kind | Rows | Waves |
| --- | --- | --- | --- |
| 0 | space / elite | 272 | Raider + Wingman × 4, then Bombers × 4 |
| 1 | capital | the hull | none |
| 2 | space / **swarm** | 384 | a Wingman column × 3 in the `flight-lead` look, then Interceptors × 3, then a plain Wingman column × 3 down the other side; up to three at once, no Heavy |
| 3 | space / elite (a) | 120 | one Raider pair with an Interceptor companion |
| 4 | space / elite | 224 | one Bomber pair (row 0, `afterCleared`) |
| 5 | space / elite (b) | 200 | one Raider pair, no Light (`lights: 0`) |
| 6 | boss | ends with the boss | none |

The Bomber pair sits between the two Raider variants so the Heavy waves still
alternate Raider and Bomber (owner decision 8).

## What the fields mean

**Sector fields:**

* `kind`: `space`, `capital` or `boss`.
* `subtype`: `swarm` or `elite`.
* `rows`: how long a space sector lasts, in world rows; a multiple of 8, at
  most 2,040. The world scrolls at about 9/20 of a row a frame on MEDIUM, so 144
  rows is about 6 s.
* `archetypes`: the enemies allowed in this sector at all. Every wave must
  name one of them.
* `lights` and `heavies`: the most Light enemies and Heavy formations alive at
  once.
* `hazards`: debris density and whether pickups appear.
* `look`: the star colour.

**Wave fields:**

| Field | Meaning |
| --- | --- |
| `row` | the row **within the sector** where the wave may start. The Director runs one wave at a time, so a wave starts at this row or when the one before it is spent, whichever is later |
| `archetype` or `members` | what flies: one name, or a list of two (`["raider", "wingman"]`: a Raider with its Wingman escort) |
| `count` | how many formations (or Lights) the wave sends |
| `spacing` | frames between them. The Heavy class floor is 24, the Light floor 16 |
| `entry` | the entry column, 48–200; 124 is the centre |
| `appearance` | optional: a re-skin from the level's `payload.appearances`, such as level 1's `flight-lead` |
| `afterCleared` | optional, `true`: the wave arms on its row **only once the field is clear** - no Heavy formation on screen (exploding counts) and no Light, an escort included. The row stays the minimum. Level 1's Bomber pair uses it (row 0 of its sector) |

**How a space sector ends (feat/sector-flow, the default for every level,
owner Q10):**

* **The early end.** Once every wave of the sector has been spawned (no Heavy
  formation still to admit, the Light wave spent) and the field is clear, the
  sector ends on the next row tick. A player who kills fast moves on at once.
* **The rows are the no-kill cut.** `rows` is the LATEST the sector may end,
  reached only when the player leaves enemies alive. At the cut any wave not
  yet spent is cut short (its remaining members are cancelled). Size `rows`
  so that, **with no kills, every wave arms on HARD** (the fastest row clock:
  2 frames a row; MEDIUM ~2.2, EASY 2.5) - the timeline probe below with
  `lightTicksFromSector` measures it. A longer cut costs nothing when the
  player kills: the early end fires first.
* **C1, the hold.** At the cut the Director does not end the sector while
  the live enemies exceed the **next** space sector's caps: a Heavy formation
  where the next sector admits none, or more Lights than its Light ceiling.
  The world keeps scrolling; the sector ends on the first row tick where the
  population fits. A capital or a boss after it waits for a full drain of its
  own instead.
* **A sector with no waves** is a timed stretch: it lasts its rows.
* Owner decision 3 (amended 2026-10-08): the capital's row is therefore a
  maximum - the capital comes earlier when the sectors before it end early.

**When the next wave can start** (MEASURED for level 1's post-capital waves,
fix/smoke-2026-10-07 P2, on the emulator with the bot and with no fire):

* a **Light wave** holds the Director until its last Light is gone - killed or
  off the screen (`src/c/lifecycle.c`, `light_wave_step`) - so the wave after it
  never shares the screen with it;
* a **Heavy wave** is spent once its last formation is admitted, but a
  formation is admitted only when the one before it has gone: two Heavy waves
  do not share the screen either;
* a Raider's **Wingman escort outlives its leader** and drifts down for up to
  ~200 frames; mark the next Heavy wave `afterCleared` (level 1's Bomber pair
  does) so it does not enter under it;
* an **elite** sector holds one Light at a time (its ceiling), so a Light wave
  of several there reads as several waves, one Light after another; a group
  of Lights that enters together needs a **swarm** sector (three at once, no
  Heavy);
* **a sector's end holds for its successor's caps (C1)** where it used to be
  no barrier: a Heavy formation alive at an elite sector's cut no longer flies
  into a following swarm, and a swarm's Lights are held down to the next
  elite sector's one. The data rule from before C1 stays as a hard test by the
  owner's choice (2026-10-08): **never put a swarm sector directly after an
  elite sector** (`tests/level-one-waves.test.mjs` checks every level file).
  A Bomber pair the player does not shoot lives ~540-690 frames, a Raider pair
  ~330: elite to elite is legal, so a pair can still be carried into the next
  elite sector and delay that sector's own Heavy wave - size its rows for
  that (level 1's elite (b): its Raiders arrive at frame 392 of HARD's 400
  with the Bomber pair carried in, MEASURED).

**The boss's per-level data** is the level file's `bossDef`. Each of these is
given per difficulty (`easy`, `medium`, `hard`), so a later level can be
harder with no code change (owner decision 7, 2026-10-07):

* `hpScale`: the modules' hit points ×0.5 to ×1.5;
* `laserDamage`: a beam's damage in hull units;
* `laserWarning`: frames of warning before a beam;
* `laserReload`: frames between an emitter's beams.

The modules' own hit points are the boss region's data
(`assets/graphics/boss-regions/region-N/modules.json`).

**The boss finale** (S5-2) is the boss region's data too, not the level's:
`fire.finaleCooldown` in the region's `modules.json` - frames, 0 or absent =
no finale, at most the region's `fire.cooldown`. Once the region's last armour
module falls (a capped emitter counts as armour), every weapon still standing
fires three-shot volleys (one shot a frame, from its centre column and the two
beside it) at half its reload, never under that floor; the first volley comes
on the frame after the last plate falls. Region 1 has none (owner answer Q6).
Regions 2-4 have no art of their own yet: they are copies of region 1, and
`assets/graphics/boss-regions/placeholders.json` holds what each copy changes -
its `fire` block only, today `finaleCooldown` 12. Try a value on a region route
without touching `dist/`:

```
node scripts/build.mjs --level=1:sector=6 --boss-region=2
mkdir -p build/play
cp build/boss-region-2-level-1-s6/void-strike-65.atr build/play/finale-r2.atr
atari800 -xl -pal -nobasic "$PWD/build/play/finale-r2.atr"
```

A changed finale changes that region's band B run and its head sum on the
disk, so the default ATR and the committed evidence move with it. It is pinned
by `tests/boss-finale.test.mjs` (the behaviour), `tests/boss-stress.test.mjs`
(the finale's layouts under the boss limit) and the trace's finale clause on
the region routes (`region-N-finale-{0,1,2}`, the wide-sweep bot; the plain
sweep bot never meets the edge plates, so it never reaches the finale).

## Check, build and play a changed level

Nothing below touches `dist/` or any committed evidence.

1. **Check the file**, in under a second:
   ```
   npm run levels:check
   npm run levels:preview -- 1
   ```
   `levels:check` refuses a malformed level and says why. `levels:preview`
   prints the sectors, their world rows and the waves.
2. **Build a debug route**: the level, entered at a chosen sector, into
   `build/level-N-sM/` (never `dist/`):
   ```
   npm run level:play -- --level=1:sector=3
   ```
   Sector numbers are zero-based, so `--level=1:sector=3` starts on level 1's
   Bomber sector and `--level=1:sector=0` at the level's start.
3. **Play a copy**, never the built file itself:
   ```
   mkdir -p build/play
   cp build/level-1-s3/void-strike-65.atr build/play/my-level-1-s3.atr
   atari800 -xl -pal -nobasic "$PWD/build/play/my-level-1-s3.atr"
   ```
4. **Optionally**, list each spawn and the frame each sector begins on, per
   difficulty, without an emulator:
   ```
   node scripts/level-timeline.mjs --build=build/level-1-s0 --difficulty=0
   ```

## What a data change invalidates

A changed level is a changed game, so before it is merged a session must
regenerate and re-check the following. While you are only trying the change
out, none of this needs doing.

**Tests that pin level 1's data:**

* `tests/level-compiler.test.mjs`: the authored level, including its sector
  rows.
* `tests/level-one-equivalence.test.mjs`: the capital's row and frame, the
  alternation, and the played order and Heavy counts per difficulty.
* `tests/level-payload.test.mjs`: the skies, and which wave wears a look.
* `tests/level-one-waves.test.mjs`: level 1's post-capital sectors - the
  swarm of both Light kinds, elite (a), the Bomber pair, elite (b) - that each
  wave arms on every difficulty, that the swarm drains before it ends with no
  kills, and that no level file puts a swarm directly after an elite sector.

Changing level 1's length also moves:

* `tests/plasma-fx.test.mjs`: how long a native play-through runs before the
  boss entry;
* `tests/runtime-wall-trace.test.mjs`: the trace replays that now reach the
  boss, which set its entry frame aside, so their frame totals move;
* `tests/boss-runtime.test.mjs`, `tests/build-variants.test.mjs`: the sector
  count (the boss's index and the debug route's range);
* the trace's `slot-e-*` replays: their frame budgets must reach the boss and
  what follows it (`scripts/runtime-wall-trace.mjs`, class (a)).

All of these are re-pointed to the new data, each with its reason written in
the file.

**Evidence bound to the built ATR**, regenerated together in this order:

1. `npm run build:candidate`, which also re-runs the cycle model that the build
   checks itself with;
2. `npm run runtime:wall-trace`, the emulator trace and its gates
   (`docs/runtime-wall-trace.json`). Trace sessions whose scenario relied on a
   removed wave are rewritten;
3. `npm run build`;
4. the hash-bound files, each with its own tool: the menu raster
   (`docs/menu-raster-trace.json`), the media manifest (`docs/media/`) and
   `npm run memory-map`;
5. `npm test` in full, twice. Both runs must match, and any failure must be
   one of the recorded ones (`docs/recorded-test-failures.json`).

**Figures quoted in the docs:** the level's length and the fight lengths per
difficulty (`docs/STATUS.md`, the plan files). They come from the
`director-complete-*` trace sessions.
