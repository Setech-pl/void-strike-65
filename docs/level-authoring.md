# Level authoring

How a level is written, what every field means, and what the compiler refuses.
Engineering document: English only (`docs/README.md` §"Documentation language").

Roadmap 4.6 step 1 (`docs/plans/director-4.6.md` §6). **The runtime reads none
of this yet.** The compiler emits the bytes and the level image carries them;
the Director starts reading the core page at step 2, the hull geometry at step
4 and the payload page at step 5. The format is frozen here so that no later
step changes it.

## The three commands

| Command | What it does |
| --- | --- |
| `npm run levels:check` | validates every `assets/levels/level-NN.json` and prints one line per file. Under a second; no build. |
| `npm run levels:preview -- 1` | prints level 1 as a table — sectors, world rows, waves, and the caps the runtime will actually honour after the clamp. |
| `npm run build` | compiles the authored level into the level image. A level the validator rejects fails the build, not the owner's smoke. |

## Where the bytes go

The level image is 13 sectors at `LEVEL_BUFFER = $A600` (`docs/memory-map.md`).

| Sector | Range | Bytes | Content |
| ---: | --- | ---: | --- |
| 1-5 | `$A600-$A87F` | 640 | 8-byte header + the gameplay music player |
| 6-8 | `$A880-$A9FF` | 384 | the region's hull block, 280 B + pad |
| 9-10 | `$AA00-$AAFF` | 256 | **LevelDef core** — the page the Director reads |
| 11-12 | `$AB00-$ABFF` | 256 | **LevelDef payload** — appearances, paths, glyphs, boss |
| 13 | `$AC00-$AC7F` | 128 | **HullGeometry** — hull length, phase starts, module sequences |

Sectors 1-8 are not authored: the music and hull blocks are generated assets at
frozen addresses. Only sectors 9-13 come from the JSON.

## The file

`assets/levels/level-NN.json`, one per level, tracked in Git. Names, not
numbers; world rows, not eighths.

```json
{
  "level": 2,
  "seed": 77,
  "hull": { "length": 2, "turrets": 3 },
  "sectors": [
    { "kind": "space", "subtype": "swarm", "rows": 1200,
      "archetypes": ["interceptor", "wingman"], "lights": 3,
      "hazards": { "debris": 2, "pickups": true },
      "waves": [
        { "row": 96,  "archetype": "interceptor", "count": 3, "spacing": 48, "entry": 124 },
        { "row": 480, "archetype": "wingman",     "count": 4, "spacing": 32, "entry": 92,
          "mirror": true }
      ] },
    { "kind": "capital", "archetypes": [],
      "hazards": { "debris": 1, "pickups": true, "broadside": true } },
    { "kind": "space", "subtype": "elite", "rows": 960,
      "archetypes": ["bomber", "raider", "wingman"], "lights": 1, "heavies": 2,
      "waves": [ { "row": 64, "archetype": "bomber", "count": 2, "spacing": 120,
                   "escort": "wingman" } ] }
  ]
}
```

### Level fields

| Field | Range | Default | Meaning |
| --- | --- | --- | --- |
| `level` | 1-12 | required | the level number; HUD only |
| `seed` | 1-255 | 1 | the Director RNG's initial value |
| `stars` | 0-255 | 0 | the level's default star colour (step 5 binds the values) |
| `nebula` | 0-255 | 0 | nebula pattern; 0 = none (step 5) |
| `boss` | 0-255 | 0 | BossDef index; 0 = none. Non-zero needs a `boss` sector (4.7) |
| `pickupPolicy` | 0-255 | 3 | every-Nth-kill divisor plus allowed booster bits |
| `debrisDensity` | 0-255 | 0 | base debris cadence |
| `spacingScale` | 0-255 | 0 | difficulty spacing rule selector |
| `debugStartSector` | 0-9 | 0 | a review build (`--level=N:sector=M`) starts here; 0 in shipped data |
| `hull.length` | 0-3 | 3 | 288 / 352 / 416 / 480 rows. Step 1 emits 480 only |
| `hull.rows` | one of 288, 352, 416, 480 | — | the same thing said in rows; give `length` or `rows`, not both |
| `hull.turrets` | 0-3 | 3 | turret density step |

### Sector fields

A level has 1-10 sectors, played in order.

| Field | Range | Default | Meaning |
| --- | --- | --- | --- |
| `kind` | `space`, `capital`, `boss` | `space` | `boss` must be the last sector |
| `subtype` | `swarm`, `elite` | `swarm` | space sectors only |
| `rows` | a multiple of 8, 8-2040 | required for `space` | how long the sector runs. A `capital` sector's clock is the hull traversal; a `boss` sector's is the boss's death — neither takes `rows` |
| `archetypes` | `raider`, `wingman`, `interceptor`, `bomber` | `[]` | **which enemies may appear here at all.** Every wave must name one of them, and admission refuses anything outside the mask |
| `lights` | 0-4 | 0 | requested Light ceiling |
| `heavies` | 0-2 | 0 | requested Heavy formation ceiling |
| `hazards.debris` | 0-2 | 0 | debris alive at once |
| `hazards.debrisStep` | 0-15 | 0 | debris cadence step |
| `hazards.pickups` | boolean | false | weapon pickups may drop |
| `hazards.broadside` | boolean | false | broadside missiles may launch |
| `look.stars` | 0-15 | 0 | star colour override for this sector |
| `look.nebula` | boolean | false | nebula on |
| `look.variant` | 0-7 | 0 | capital section variant |
| `waves` | array | `[]` | 0 waves is legal: a quiet sector |

**Capital sectors carry no enemies in 1.0** (owner decision, plan §11 item 1):
their Light and Heavy ceilings are zero, so `archetypes` must be empty. They
keep their hull turrets, debris and pickups.

**A swarm sector has no Heavy slot**, so a Heavy archetype (`raider`,
`bomber`) in its mask is rejected. Heavy formations belong to an elite sector.

### Wave fields

A level holds at most 20 waves in total, across all its sectors.

| Field | Range | Default | Meaning |
| --- | --- | --- | --- |
| `row` | a multiple of 8, inside the sector | required | the row *within the sector* where the wave arms |
| `archetype` | an archetype name | required | the dominant archetype |
| `escort` | an archetype name | none | one supporting archetype. For a Heavy wave this is the escort the formation carries (today's Raider + Wingman pairing) |
| `members` | array of 1-2 distinct names | — | the same thing as a list; first is dominant. Three or more is rejected: one dominant and at most one supporting |
| `count` | 1-255 | 1 | how many to admit. It is a *request*: it is decremented only on a successful admission, so a wave finishes even when the ceiling is lower |
| `spacing` | frames, ≥ the class floor | the class floor | frames between members. Light floor 16, Heavy floor 24 |
| `entry` | 48-200 | 124 | entry column |
| `mirror` | boolean | false | mirror the entry |
| `afterCleared` | boolean | false | arm when the previous wave cleared instead of on `row` |
| `appearance` | 0-3 | 0 | 0 = the archetype's own art; 1-3 = a payload appearance slot (step 5) |

`path` is **not** authorable yet: the path evaluator and its library are step 6,
and a file naming one is rejected. Every wave compiles with `wave_path = $FF`,
"the archetype's own movement".

## What the compiler refuses

The rule (plan §5): **a level file may make the game easier than the runtime
allows, never harder.** Rejections, each naming the file, the sector and the
field:

* more than 10 sectors, or more than 20 waves in the level;
* a Heavy archetype in a swarm sector;
* any archetype in a capital sector;
* a wave naming an archetype outside its sector's mask;
* a wave naming three or more distinct archetypes;
* a boss sector that is not last, or a `boss` id with no boss sector;
* a hull length outside 288 / 352 / 416 / 480 rows, or non-monotonic hull
  phase thresholds;
* spacing below the class floor;
* an entry column outside 48-200;
* `lights` above 4 or `heavies` above 2 — the packed nibbles hold no more;
* a wave arming at or past its own sector's end;
* a `path` (step 6) or a hull length other than 480 rows (step 4).

It **warns**, and the file stays legal, when a requested cap exceeds what the
subtype admits — swarm 3 Light / 0 Heavy, elite 1 Light / 2 Heavy, capital
0 / 0. The byte keeps what the author asked for; the runtime clamps to
`min(requested, subtype ceiling)` at admission.

Nothing in a level file can name code. An archetype is an offset into the
frozen four-record roster (ROSTER FREEZE, decision 21); a path is an id into a
resident library or the payload page.

## Level 1

`assets/levels/level-01.json` reproduces today's level 1 as data: four sectors
summing to the 3,712 world rows at which `LEVEL1_DATA` completes the level, a
capital sector between them, and the 480-row hull the game ships. **Which row
the capital sector starts on is step 2's measurement** — the plan replaces
today's `FIRST_CAPITAL_FRAME = 600` frame gate with an authored row, and the
row equivalent to frame 600 on MEDIUM is measured from the trace at that step
(plan §10 departure, §11 item 3). The row in this file is the structural
placeholder until then.
