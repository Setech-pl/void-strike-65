# Level authoring

How a level is written, what every field means, and what the compiler refuses.
Engineering document: English only (`docs/README.md` §"Documentation language").

Roadmap 4.6 step 1 (`docs/plans/director-4.6.md` §6). **The runtime reads none
of this yet.** The compiler emits the bytes and the level image carries them;
the Director starts reading the core page at step 2, the hull geometry at step
4 and the payload page at step 5. The format is frozen here so that no later
step changes it.

## The commands

| Command | What it does |
| --- | --- |
| `npm run levels:check` | validates every `assets/levels/level-NN.json` and prints one line per file. Under a second; no build. |
| `npm run levels:preview -- 1` | prints level 1 as a table — sectors, world rows, waves, and the caps the runtime will actually honour after the clamp. |
| `npm run build` | compiles the authored level into the level image. A level the validator rejects fails the build, not the owner's smoke. The default build carries **level 1 only**. |
| `npm run level:play -- --level=N[:sector=M]` | the debug route (plan §7): a review build of level N, entered at its sector M (zero-based; 0 = the first), into `build/level-N-sM/`. Never `dist/`; no gate consults it. The only way onto a level other than 1 before the campaign exists (roadmap 4.9). |
| `node scripts/level-timeline.mjs --build=build/level-N-s0 --difficulty=0` | runs the level's schedule on the real runtime image (no raster, no cycles) and prints every spawn, the frame and row each sector is entered on, and the peak live Lights per sector. It answers the sizing question below. |

**Sizing a sector.** A wave's `row` is a *not-before* gate: an armed wave holds
the Director's cursor until it is spent, and only the sector's END can cut a
wave list. A sector is long enough when its last wave is spent inside it on
EASY, the slowest stream. Read that off the timeline probe, not off arithmetic.
Its Lights live exactly 64 frames; in play a Light can live longer, so leave
headroom in a swarm sector.

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
| `hull.length` | 0-3 | 3 | 288 / 352 / 416 / 480 rows, one length for all three difficulties (step 4). A shorter hull is the first 8 / 16 / 24 of the 32 combat modules; engines, aft, forward and prow keep their 224 rows. It is right-aligned: it ends on row 479 like the 480-row hull, so the capital traversal is `hull_rows` rows shorter at its start |
| `hull.rows` | one of 288, 352, 416, 480 | — | the same thing said in rows; give `length` or `rows`, not both |
| `hull.turrets` | 3 | 3 | turret density step. Only 3 is defined: today's stations per row, over the length's eligible span - EASY / MEDIUM / HARD 5/8/11 at 288 rows, 7/10/14 at 352, 8/13/17 at 416, 10/15/20 at 480. Steps 0-2 are refused until the owner defines them |

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
* a Heavy wave escorted by a Heavy archetype, or a Light wave naming a second
  archetype at all: for a Heavy wave the second member is read at runtime as
  the LIGHT escort and admitted into a Light slot, and a Heavy record there
  would be a Heavy archetype with no PMG player of its own, which the enemy
  class invariant forbids (AGENTS.md);
* spacing below the class floor;
* an entry column outside 48-200;
* `lights` above 4 or `heavies` above 2 — the packed nibbles hold no more;
* a wave arming at or past its own sector's end;
* a `path` (step 6), or a turret density other than 3 (step 4).

It **warns**, and the file stays legal, when a requested cap exceeds what the
subtype admits — swarm 3 Light / 0 Heavy, elite 1 Light / 2 Heavy, capital
0 / 0. The byte keeps what the author asked for; the runtime clamps to
`min(requested, subtype ceiling)` at admission.

Nothing in a level file can name code. An archetype is an offset into the
frozen four-record roster (ROSTER FREEZE, decision 21); a path is an id into a
resident library or the payload page.

## Level 2

`assets/levels/level-02.json` (roadmap 4.6 step 3; owner-approved 2026-09-30,
plan §11 item 15) is the first level that is not a reproduction. It has six
sectors against level 1's four, opening on a **swarm** sector with three live
Lights and no Heavy. Sector 2 is Bombers only. The capital is on authored row
**1,120** (level 1: 272). Sector 4 is three Interceptor waves of eight at
spacing 20, and sectors 5 and 6 alternate Raider and Bomber by wave, with
sector 6 also carrying every archetype. The Light class floor of 16 frames is
deliberately **not** used, so later levels have room to escalate. Every sector's
sizing figures, MEASURED with the timeline probe, are in the file's own notes.
Play it with `npm run level:play -- --level=2`.

## Level 1

`assets/levels/level-01.json` reproduces the level the runtime used to carry,
as data. Every number in it was MEASURED at step 2 from the build before the
change and is recorded in `diagnostics/level-1-baseline-timeline.json` and
`-probe.json`:

* **sector 1 runs 272 rows.** The capital used to become due at active gameplay
  frame 600, and the world row at that frame on MEDIUM is 270 (600 × 9/20).
  272 is the nearest 8-row module boundary and is the row the capital actually
  admits on (owner decision 3, plan §11 item 3).
* **the capital traversal is 542 rows** on all three difficulties, so the two
  sectors behind it run 1,448 each and the level ends at row 3,710 against the
  3,712 it used to — the two rows the module grid cannot express.
* **seed 109 is `$6D`**, which `director_c_init` XORs with the difficulty, so
  all three of the RNG streams the level used to run are unchanged.
* **spacing 24 is the Heavy class floor**, deliberately: it puts the wave's own
  pacing under the kernel's admission retry (48/36/24 frames by difficulty), so
  the stream keeps the cadence it had.

One thing the format cannot reproduce, and it is worth knowing before reading
the file. The scheduler this replaced alternated Raider and Bomber on **every**
admission. A WaveDef names ONE archetype, and the core page holds 20 waves, so
41 alternating formations cannot be written as 41 waves. Level 1 alternates in
**blocks** instead — four Raiders, four Bombers, six and six after the capital.
The repository always described that alternation as smoke scheduling and not a
gameplay contract (`src/c/lifecycle.c` before step 2: *"nothing in the Heavy
lifecycle, the Bomber handler or the renderer depends on this order"*), which
is why the density and the cadence were reproduced and the order was not.
