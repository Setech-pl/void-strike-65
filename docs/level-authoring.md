# Level authoring

How a level is written, what every field means, and what the compiler refuses.
Engineering document: English only (`docs/README.md` §"Documentation language").

Roadmap 4.6 step 1 (`docs/plans/director-4.6.md` §6). The compiler emits the
bytes and the level image carries them. The runtime reads the core page since
step 2, the hull geometry since step 4, and since step 5 the payload page's
Light and weapon looks and each sector's sky (§8.3). Paths (step 6),
`hull_params` (4.8a) are still unread; `boss_def` is read by the boss (M5b, "The boss" below). The format was
frozen at step 1 and no step since has changed it.

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

The level image is 16 sectors at `LEVEL_BUFFER = $A600` (`docs/memory-map.md`).

| Sector | Range | Bytes | Content |
| ---: | --- | ---: | --- |
| 1-5 | `$A600-$A87F` | 640 | 8-byte header + the gameplay music player |
| 6-8 | `$A880-$A9FF` | 384 | the region's hull block, 280 B + pad |
| 9-10 | `$AA00-$AAFF` | 256 | **LevelDef core** — the page the Director reads |
| 11-12 | `$AB00-$ABFF` | 256 | **LevelDef payload** — appearances, paths, glyphs, boss |
| 13-14 | `$AC00-$ACFF` | 256 | **HullGeometry** — 16-bit length, phase starts, two 120-module sequences |
| 15-16 | `$AD00-$ADFF` | 256 | Island descriptors and current-sector lookup workspace |

Sectors 1-8 are not authored: the music and hull blocks are generated assets at
frozen addresses. Only sectors 9-16 come from the JSON.

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
| `stars` | `white`, `steel`, `yellow` | `white` | the level's default sky: the near-star pixel value - white `COLPF0`, the allied steel `COLPF1`, yellow `COLPF2` (budget-1.0 M2 variant S2). A sector without `look.stars` takes it. `0` is accepted and means `white` |
| `nebula` | 0 | 0 | the nebula (variant S3) is not built; any other value is refused |
| `payload.appearances` | 0-3 looks | `[]` | Light looks for appearance slots 1-3, in order. Each is `{ "name", "rows" }`: a lower-case name a wave can use, and eight rows of eight pixels, left cell then right cell, each pixel `.` black, `W` white, `S` steel or `R` hostile red (a Light's code carries the hostile bit, so `%11` is `COLPF3`). A look is a re-skin (decision AD): the Light keeps its archetype's motion, HP, fire and score |
| `payload.weapons` | 0-2 looks | `[]` | hostile weapon looks laid over the defaults at level start. Each is `{ "class": "pulse" \| "laser", "rows" }`, `rows` the eight 8-bit masks of `assets/graphics/fighter-weapons.json` with its rules: pixels 0-1 only (the right phase is the glyph shifted two pixels) and never `%11`, so hostile fire stays white and steel. One look per class. `bomber` is refused: its second animation phase does not fit the 9-B record |
| `boss` | 0-255 | 0 | BossDef index; 0 = none. Non-zero needs a `boss` sector and a `bossDef` ("The boss" below) |
| `pickupPolicy` | 0-255 | 3 | every-Nth-kill divisor plus allowed booster bits |
| `debrisDensity` | 0-255 | 0 | base debris cadence |
| `spacingScale` | 0-255 | 0 | difficulty spacing rule selector |
| `debugStartSector` | 0-9 | 0 | a review build (`--level=N:sector=M`) starts here; 0 in shipped data |
| `hull.length` | 0-3 | 3 | legacy aliases for 288 / 352 / 416 / 480 rows; give `length` or `rows`, never both |
| `hull.rows` | multiple of 8, 288-960 | — | right-aligned on the universal 960-row axis; prow at 928-959, drain at 968; combat modules repeat deterministically while the 224 end-section rows remain fixed |
| `hull.turrets` | 3 | 3 | fixed density policy: E/M/H stations per side are 7/10/14 at 352 rows, 10/15/20 at 480, 22/33/44 at 960; nested subsets with bounded gaps, unchanged difficulty fire rates. Other selector values are rejected |


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
| `hazards.debris` | 0-2 | 0 | debris alive at once; admission always obeys this flag. Capital sectors require 0; SPACE retains its authored value |
| `hazards.debrisStep` | 0-15 | 0 | debris cadence step |
| `hazards.pickups` | boolean | false | weapon pickups may drop |
| `hazards.broadside` | boolean | false | broadside missiles may launch |
| `look.stars` | `white`, `steel`, `yellow` | the level's `stars` | this sector's sky. It changes on the frame the Director enters the sector, and nowhere else. The compiler writes the resolved value into `sector_look` bits 0-3 for every sector, so the runtime never reads 0 |
| `look.nebula` | `false` | false | not built (variant S3); `true` is refused |
| `look.variant` | 0-7 | 0 | capital section variant |
| `waves` | array | `[]` | 0 waves is legal: a quiet sector |

**Capital sectors carry no enemies in 1.0** (owner decision, plan §11 item 1):
their Light and Heavy ceilings are zero, so `archetypes` must be empty. They
keep their hull turrets. Small falling debris is disabled; large islands are optional sector data. Pickups remain governed by their existing admission rules.

### Capital islands (§BW)

A capital sector may carry:

```json
"islands": { "pattern": "salvage", "density": "standard",
             "firstRow": 96, "spacingRows": 112,
             "heightRows": 48, "minGapRows": 64 }
```

All fields are optional: pattern defaults to `none`, density to `standard`, and
placement to the numbers shown. `sparse` selects every other valid span.
Coordinates are local to the hull start, then compiled onto the universal axis.
Placement uses eight-row units; first row is at least 64, height is 24-48,
minimum clear gap at least 64, spacing at least height plus gap. Every fragment
ends at least 64 rows before hull end. The compiler rejects unknown fields,
non-capital island declarations, nonzero capital debris, invalid placement and
more than seven distinct span descriptors across the level (identical sets share
records). The first production pattern cycles module wreck, turret deck and
panel plate, alternating allied/enemy colours with existing glyphs.

The slalom patterns use `"islands": { "pattern": "slalom" }` (**Offset Weave**)
or `"islands": { "pattern": "slalom-tight" }` (**Tight Weave**). No other
island fields are accepted with these deterministic patterns. Short hulls
288–320 start left/right; longer hulls start centre, then alternate left/right.
Lengths below 432 use 24-row fragments with 88-row spacing (first row 96 for
short hulls, 64 otherwise); lengths 432–960 use the original 96/112/48 defaults.
The final 64 rows stay clean. Every legal length passes the host clearance and
no-straight-20-HPOS-band proof. See [slalom evidence](audits/2026-10-26-capital-slalom.md).

Placement is level data: extension bytes 4..7 are signed HPOS offsets selected
by the lookup tag's top two bits. Slot 0 is centre; slots 1/2 are left/right
(-20/+20 for Offset Weave, -16/+16 for Tight Weave); slot 3 stays zero.
Byte 3 identifies the nonzero offset magnitude for compiler consistency.
Recipe uses bits 4..5, colour bit 3 and part bits 0..2; the stored tag adds one.
The lookup still holds one island per row. Different offset magnitudes cannot
share one level. L2 applies the offset after difficulty clipping and moves both
the published motif and its contact decoder with it. Existing `salvage` data
retains zero offsets. Width, damage, braking and warning policy are unchanged.

`assets/graphics/l2-islands.json` stores editable six-part recipes. Each part
has independent signed left/right offsets and four surface-glyph roles; an
empty interval is legal. This permits future asymmetric, stepped and L-shaped
silhouettes without assuming spindle symmetry. Each recipe uses 36 bytes;
three use 108. Runtime clamps maximum width to 6/8/10 cells on E/M/H.
The transported `$AD80-$ADF7` workspace is zeroed and populated at capital entry;
a single bounded module lookup selects a row part, without scanning spans per
frame. A level uses geometry format 2; old generated images must be rebuilt.

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
| `afterCleared` | boolean | false | arm when the previous wave cleared instead of on `row`. **Compiled (flags bit 4) but not read by the Director yet** (fix/smoke-2026-10-07: `src/c/director.c` reads the look and Heavy bits only); what paces waves today is in [level-data-howto.md](level-data-howto.md), "When the next wave can start" |
| `appearance` | a look's name, or 0-3 | 0 | 0 = the archetype's own art; otherwise a `payload.appearances` look, by name or slot number. On a Light wave its members wear it; on a Heavy wave its **Light escort** does, and the Heavy pair keeps its PMG art, so a Heavy wave without an escort is refused |
| `loops` | 0-3 | 0 | an **Interceptor**'s top-hold loops (decision AK points 9-10, flags bits 6-7): after each 64-frame standoff it climbs to its top-hold row (y 32, two rows lower per Light slot), holds, dives back and flies the standoff again, this many times, then climbs out upward. 0 is a single pass. Only a wave whose Light is an Interceptor - its archetype, or a Heavy wave's escort - may carry it. Each loop adds 128 frames to the Interceptor's life (64 + 128 × loops + the climb out; fix/interceptor-speed, decision AS - 100 and 139 before), and a Light wave holds the cursor until its last Light has gone, so loops lengthen the sector. A boss sector's escort keeps 0: its life must stay under the escort clock's 128-frame floor. Level 1's swarm and elite (a) Interceptors carry 2 |

**No toughness field.** A wave cannot make its enemies tougher: hit points come
from the archetype record alone (decision AD). Since feat/interceptor-armour
(decision AN, `OWNER-SMOKE CANDIDATE`) every **Interceptor has 3** - swarm,
elite companion and boss escort alike - and flashes its red pods for 3 frames
on each hit it survives; plan a sector's length with three hits per
Interceptor in mind (level 1's road with the sweep bot: 68.8 / 65.5 / 56.1 s
on EASY / MEDIUM / HARD before, 75.7 / 75.7 / 65.5 s after). Wave flags bit 5
was unused before M3-H. **Owner-approved M3-H Option A (2026-10-27)** assigns
it to `kind: "armoured"` on non-boss Raider Heavy waves only; Bomber, Light
and boss waves refuse it. Bits 6–7 retain Interceptor escort-loop encoding,
including level 1's sector-4 Heavy flags `$88`.

**Stopped WIP on `codex/m3h-step1`, not a validated authoring baseline:** the
restored compiler accepts `kind: "assault"` (default) or `"armoured"`, and
`hold: {row, frames}` for Bomber or armoured Raider. The existing motion byte
stores the hold; it adds no WaveDef bytes. Rows are 24 + 16n (through 136),
with Raider holds restricted to 24 or 40; duration is 16–240 frames in
multiples of 16. Heavy without a hold compiles motion `$00`; Light retains
`$FF`. Level-1 flags stay `08 08 01 80 00 88 18 08 00`. The sixth continuation keeps A2, links at 827/832 arena B and leaves 746
usable window B free. Kind/hold metadata is published on a **successful Heavy
request**, from the armed wave at cursor−1, before its spawn; shared wave arm
and boss callbacks do no new Heavy work. Focused checks and all boss-stress
compositions pass. This remains **stopped WIP** because the registered native
capital ceiling fails at 30,025/29,756; no smoke candidate or native authored
level-2 PASS is claimed. See the
[sixth-continuation audit](audits/2026-10-27-m3h-step1.md#sixth-continuation--boss-deltas-fixed-native-capital-ceiling-stop).

`path` is **not** authorable yet: the path evaluator and its library are step 6,
and a file naming one is rejected. Every Light wave compiles with `wave_path = $FF`,
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
* a hull length outside 288-960 rows or not divisible by 8, conflicting legacy
  aliases, unknown hull/island fields, or non-monotonic hull phase thresholds;
* a Heavy wave escorted by a Heavy archetype, or a Light wave naming a second
  archetype at all: for a Heavy wave the second member is read at runtime as
  the LIGHT escort and admitted into a Light slot, and a Heavy record there
  would be a Heavy archetype with no PMG player of its own, which the enemy
  class invariant forbids (AGENTS.md);
* spacing below the class floor;
* an entry column outside 48-200;
* `lights` above 4 or `heavies` above 2 — the packed nibbles hold no more;
* a wave arming at or past its own sector's end;
* `loops` above 3, or on a wave whose Light is not an Interceptor;
* a `path` (step 6), or a turret density other than 3 (step 4);
* a sky other than `white`, `steel` or `yellow`, or a nebula (step 5);
* an `appearance` that names no authored look, or sits on a Heavy wave with
  no escort; more than three looks, two looks with one name, a Light row that
  is not eight of `.WSR`; more than two weapon looks, two for one class, a
  class other than `pulse`/`laser`, a weapon row outside pixels 0-1 or using
  `%11` (step 5).

It **warns**, and the file stays legal, when a requested cap exceeds what the
subtype admits — swarm 3 Light / 0 Heavy, elite 1 Light / 2 Heavy, capital
0 / 0. The byte keeps what the author asked for; the runtime clamps to
`min(requested, subtype ceiling)` at admission.

Nothing in a level file can name code. An archetype is an offset into the
frozen four-record roster (ROSTER FREEZE, decision 21); a path is an id into a
resident library or the payload page.

## The boss

M5b (`docs/plans/m5-loading-boss.md` §5.13, §5.15; owner decisions A-K,
answers Q-B1-Q-B8 and the fortress answers of §5.15.6). A level that names a boss ends in a `boss` sector; the boss itself
is **region data**, one boss per region of three levels, drawn as PNG drafts
and converted by `scripts/boss-assets.mjs` (formatVersion 2).

### The level's side

| Field | Meaning |
| --- | --- |
| `boss` | non-zero: the level ends in a boss sector. The id is written (`core[7]`) and **not read**: the region comes from the level id, `min(3, (id - 1) / 3)` + 1 (levels 1-3 region 1, ... 10-12 and on region 4). It is kept as the style/variant selector a later session may read. |
| `bossDef.bonus` | the boss bonus in score units (0-9999), added to `STATS_BONUS` at the win, shown and scored by the summary. |
| `bossDef.hpScale` | `{ easy, medium, hard }`, each 0.5, 0.75, 1, 1.25 or 1.5 (default 0.75 / 1 / 1.25, owner answer Q-B3): every module's hit points and damage thresholds scaled by that many quarters at the boss's install. |

The boss sector itself takes no `rows` (its clock is the boss's death), admits
no Heavy and at most one Light, and an escort wave must arm on row 0 (the world
stops in the boss sector, Q1). **The escort** (feat/boss-escort-flow, owner
decision AI of 2026-10-10) has two halves: the boss sector's one wave names
it - `{ "archetype": "interceptor", "count": 1, "row": 0 }`, one Interceptor
per arming - and the boss region's `escort` block says when (below). The
build refuses a level and its boss region that disagree: an escort block
under a boss sector with no wave or more than one, a wave with no block, or a
count other than 1. Region 1 (and its copies 2-4) has the escort.

The laser tier comes from the level, not the region: levels 1-4 enable emitter
slot 1, levels 5-8 slots 1-2, levels 9 and on slots 1-4 (decisions B, 8). An
emitter whose slot is not enabled becomes **capped armour**: the capped plate
over its cells, `capped.hp` hit points, kind armour. **Until the lasers exist
(S4b) every slot is capped** (§5.15.6 item 6).

**Twin cannons in slot 1** (feat/boss-r1-twin-lasers, owner answers of
2026-10-13). Slot 1 may hold **two** emitters of the same size: one laser,
fired from them in turn - never both at once, the survivor alone once one
falls. The second takes slot 2's laser, so a region with twins has **no slot-2
emitter** (refused); a third slot-1 emitter is refused. Both wear `emitter.png`
at their own footprints. The build assembles the twin code (`BOSS_TWIN`) only
when a region carries twins; the manifest's `boss.regions[].twin` names them.

**The shown band** (the owner's smoke of 2026-10-13). The display list shows
the band down to its **last row holding a cell**; the rows under it are the
ring's, in the playfield's charset and colours, so a shot or a shell there
looks as it does anywhere else on the screen. Every module (its looks,
stages, flash and blasts stay inside it) and the field must lie on a shown
row - the converter refuses one below; `boss.regions[].bandShownRows` records
the count (5 for region 1's one-row belt, 8 for region 3's field row).

Region 1 is the layered fortress Blockade Breaker (decision H); the S4a-i core
boss (style 2) is kept in the engine as `assets/graphics/boss-regions/bastion/`,
the engine's tests' style-2 fixture - not region 2's boss, whose own draft is
`assets/graphics/boss-regions/region-2/` since S5-5.
Since feat/boss-r1-twin-lasers region 1 is layout L2 with the band l2b1: a hull
spine along row 0 (columns 7-56) that no module owns, every weapon hanging
from it, the plates a one-row belt at row 4, the twin cannons emitter-l
(21-23, behind plate-c) and emitter-r (41-43, behind plate-f), gun-1 in the
central slot (31-33, behind plate-d).

### The region's drafts

`assets/graphics/boss-regions/region-N/` holds six files. The owner edits the
PNGs in any pixel editor; `npm run boss:preview` (or `-- --region=N`) converts
them and renders the whole band, every stage and the extras at the Atari palette
and 2:1 aspect into `build/boss-preview/region-N.png` without building the game.
`npm run boss:coverage [-- --region=N]` prints the layout's fire coverage: for
every player x from 48 to 200, the weapons whose fire can reach it over the
whole band drift, with every weapon exposed and at the opening. A layout must
leave **no safe position** (owner smoke 2026-10-09; `tests/boss-r1-tuning.test.mjs`
pins region 1 and its copies). A shot meets band column c when the fighter
stands at about 4c + 26 − p, so weapons at the far ends need the boss sector's
aiming bot (`boss-aim`), which the director-complete replays use since
2026-10-10.

| File | Size | Content |
| --- | --- | --- |
| `band.png` | 256 x 64 | the band as the fight starts: 64 cells x 8 rows, a cell 4 x 8 pixels; a covered module's closed look (S3's shutters) |
| `cracked.png`, `broken.png` | 256 x 64 | every module's cracked and broken look, read inside module rectangles only |
| `open.png` | 256 x 64 | a covered module's exposed look; a module whose cells here equal `band.png`'s has none |
| `field.png` | 8 x 8 | only with a `field` block (S5-3): the field glyph's two phases, A and B, side by side; one colour bank |
| `extras.png` | 60 x 8 | 15 cells: the spark (a kill; a hit the module lives through flashes it instead, fix/boss-polish); the deflection (a hit that does no damage: the hull, a covered module); the muzzle flash; the cavity (a destroyed module's rows inside the hull; drawn blank it is the band background); the capped plate intact, cracked, broken; the left nozzle's 3 phases; the right nozzle's 3 phases; blast A, blast B |
| `modules.json` | | the layout (below) |

**The PNG format.** Non-interlaced, 8 bits a channel, **RGBA** (32-bit), every
pixel opaque, in exactly five colours. A pixel is one ANTIC 4 pixel, two colour
clocks wide: view the drafts at 2:1.

| RGB | Shows as |
| --- | --- |
| `#000000` | background |
| `#FFFFFF` | `COLPF0` |
| `#888888` | `COLPF1` |
| `#FFA000` | colour 3 in the pf2 bank (`COLPF2`) |
| `#B00040` | colour 3 in the pf3 bank (`COLPF3`) |

The last two are the same pixel value; a cell's screen code takes bit 7 from
the bank it uses, so **a cell may use one of them, not both**, and a module
cell's intact, cracked and broken looks must agree on it.

**`modules.json`** (formatVersion 2):

| Field | Meaning |
| --- | --- |
| `name`, `style` | documentation; style 1 the layered fortress (geometric covers), style 2 the core boss (an explicit cover group) |
| `emitterArt` | default the slot-1 emitter: the emitter `emitter.png` is drawn for (feat/boss-order-scale: the Void Citadel names `cannon-l`, since its lens - the well's axis - took laser slot 1 so the axis fires on level 4's one slot); emitters of the same slot wear the same art |
| `palette` | `colpf0`-`colpf3` under the band (the band's own palette, set by its DLI), `flashLuma`: added to every colour for one frame on a damaging hit - every colour's luminance plus `flashLuma` must stay at 15 or under (the flash never leaves a hue) |
| `motion` | `framesPerColourClock`, `travelColourClocks` (1-63), `startColourClock`, `shakeFrames`, `shakeAmplitude` (0-3). `framesPerColourClock` 0 is a **still band** (`fix/r4-immobile`, region 4): it never drifts and shows `startColourClock` (1..travel-1) for the whole fight; the win's shake stays. On a still band every module must lie in the player's shots - a shot leaves the fighter's centre (HPOS 56-208), band columns (24 + p) / 4 to (176 + p) / 4, two fewer than the screen's 40 |
| `chain` | `blasts` (at least one a module: the chain passes every module, standing armour included), `framesBetween` |
| `fire.cooldown` | the least frames between two firings (one countdown serves every weapon: the next armed weapon fires when it runs out, and it restarts from that weapon's `reload`, EASY +1/2, HARD -1/4). A pulse cannon fires one PULSE shot of the shared hostile pool from its centre column at the band's bottom edge, straight down; a salvo launcher three, on three frames, from the columns left of, at and right of its centre; one spawn a frame, a full pool drops the shot |
| `fire.finaleCooldown` | default 0 (no finale), at most `fire.cooldown`: the boss's second phase (S5-2, owner answers Q3, Q6). When the last armour module falls (a capped emitter counts as armour), every weapon still standing fires the salvo's three-shot volley, its reload halved, never under this many frames; the first volley on the frame after that kill, nothing after the last weapon. The tables' byte 4. Region 1: 0; regions 2-4 12 (their own `modules.json`; a region copied from region 1 would take `assets/graphics/boss-regions/placeholders.json`'s `fire` block) |
| `escort` | default none (no escort): `{ afterWeapons, baseFrames, jitterMask }` (feat/boss-escort-flow, owner decision AI). The level's boss-sector escort wave is published at the `afterWeapons`-th weapon kill (1-16; a gun or an emitter, armour does not count), its first Interceptor on the next frame with no module kill and no exposure check, then one every `baseFrames` (128-255, longer than an Interceptor's life - at most 121 frames with the standoff, feat/interceptor-standoff) + (RNG & `jitterMask`) (0, 1, 3 … 63; the sum at most 255) frames, only on such frames, until the boss falls; at most one Light live, none after the defeat. The tables' bytes 17-19, read by `src/c/director.c`. Region 1: 1 / 150 / 63 (one every 3.0-4.3 s). Regions 2-4 carry the same (region 2's launch over its hangar's doors: `hangar`) |
| `field` | default none (S5-3, region 3's Siege Spine; plan `s5-boss-regions` §6.3, the owner's answers of 2026-10-13): `{ row, framesPerPhase, halves: [{ from, to, generators }] }` - a force field in band row `row` from column `from` to `to` per half (two halves), each powered by its `generators` (1-2 armour modules, never inside their own half). While a half is powered every player shot in its columns stops on the field cell - the hull's deflection and tick, no damage, not a hit; the modules behind it still fire, and the boss's shots, the lasers and the player pass. When a half's generators have all fallen it collapses one column a frame from the generator's side. The field cells must be blank in `band.png` (the converter draws phase A of `field.png` there; the region block's code swaps the phases every `framesPerPhase` frames); they are left out of the hull stop and of decision O, so they may lie under a weapon. The field's code (`src/hybrid/boss.s`, `BOSS_FIELD`) rides in the region's block after the look tail's 110 B (slot F) |
| `gravity` | default none (S5-4, the Void Citadel - region 4 then, region 2 since feat/boss-order-scale; plan `s5-boss-regions` §6.4, the owner's decisions of 2026-10-13 / 2026-10-14): `{ framesPerStep, pulseFrames, waveStep, spires: [two salvo modules], core, axis }` - the gravity well. While either `spire` stands, in the fight, the ship alive, the player's ship steps 2 colour clocks towards the axis every `framesPerStep` frames (region 4: 4, G2 since `fix/r4-immobile`) (x stays even, so the input's equality tests at the screen edges still hold); the `core` (kind `core`) asks its hit flash every `pulseFrames` frames; the gravity column (missile M0, white) shows the axis from the band's foot down, an S-wave moving `waveStep` lines every 8 frames. The `axis` is an emitter (its lens column's centre is the beam's): the pull's target is the x its beam's hit window centres on - **the well pulls into danger, never to a refuge** (owner answer 4); the column flares in the axis's warning and gives way to its beam. An axis covered by the spires (`cover`) is untouchable while the well is on and still fires (the well's code counts its reload). Both spires down: the pull, the pulse and the column stop at once. The well's code (`src/hybrid/boss.s`, `BOSS_GRAVITY`) rides in the region's block after the look tail's 110 B (slot F). Two design rules (the owner, 2026-10-14): a module gating the fight's end must not sit at the band's extreme ends; a signature mechanic must create danger, not a refuge |
| `rails` | default none (S5-5, the Bastion - region 2 then, region 4 since feat/boss-order-scale; plan `s5-boss-regions` §6.5, the owner's design of 2026-10-14 and choice of 2026-10-15): `{ framesPerStep, delayFrames, pulseFrames, pitch, positions, rows: [first, last], core, left: { guns, cannon, nose }, right: { … } }` - a sliding gun rail each side: hull art in three band rows (`rows`, the girder then its guns) from the band's edge to its front column `nose`, carrying `guns` (front first: pulse or salvo guns of one size, consecutive modules, each covered by the one in front of it; the converter adds the `core`'s bit to every gun behind the front one - the lock). Only the locked-in front gun can be hurt or fire. When it falls its socket stays solid (the converter gives the front-gun slot a hull stop under the rail's last row) and, unless the rail is at its last position, the rail slides `pitch` columns inward: `delayFrames` after the kill, one column every `framesPerStep` frames, only on a frame no shot met the band (never on a kill or an exposure check's frame), with a clank on channel 3 - its cells, its columns' shot stops and every gun's record x move with it (hit detection follows the rail); the next gun then locks into the front slot. After `positions` slides the rail stops over its `cannon` (an emitter): a cannon still standing is **covered** - shots deflect on the rail, it can never be destroyed, and it **keeps firing** (it stays exposed to the laser controller; its heat shows on the rail) - and the defeat and the doors' cover no longer wait for it. One slide from covering a standing cannon, the gun whose fall would cover it pulses (its b3 flash every `pulseFrames`, a power of two). The converter proves the geometry: every slide but the last leaves the cannon clear, the last covers all its columns, no slide reaches another module (never the hangar), `positions` < the guns on a side, the window a slide shifts (one count of columns for both rails: the wider side's) holds every gun and fills the screen's edge at the last position. **Bays ("B - the window", the owner's choice of 2026-10-15):** a cannon with `"bay": true` (an emitter whose `cover` names its rail's front gun) sits in an armoured bay - its module is the cannon over one **armour row** (`cavityRows` = `height` - 1; the lens, the warning's heat and a `"lens"` stage on the cannon's last row): `band.png` draws it locked (region 2: the unlit steel cannon over the doors' bars), `emitter.png` its open look (the lit cannon over an empty row). Locked, shots stop and deflect on the armour row and the cannon fires through under it (the block writes the missile plane's armour row: a locked bay's beam starts under its armour); the rail's first kill opens it (the cannon exposed, the open look, the unlock's flash and tone; the block moves its columns' stop to the muzzle row), the second covers it. **The L (`foot`, feat/boss-order-scale, the owner's decision AX 5 and choices of 2026-10-16):** `foot: { row, length }` - the rail's inner end carries a foot of `length` cells in band row `row` (the bays' armour row) in front of its bumper, so the rail's front (`nose`) is the foot's tip, the bumper `length` columns behind it; the converter refuses a foot outside the armour row, a bumper that reaches the cannon or a foot that meets another module. The foot moves with the rail (the slide's first `length` steps move only the foot's row, the map and the stops), and the last slide puts it in front of a standing cannon: the cannon shows the covered look (locked steel, one look shared by both sides when equal), shots on the foot deflect (or are absorbed by the cannon's own running beam - never damage), and its beam starts under the foot. Region 4's Bastion (boss directory `region-2/`): `pitch` 3, `positions` 2, three 3-cell guns a side 3 columns apart (x 17 / 14 / 11 and 43 / 46 / 49), the foot 2 cells in row 4, fronts 22 -> 25 -> 28 and 40 -> 37 -> 34 (bumpers 20 / 42), the cannons at 27-28 and 34-35 (rows 1-3, their armour row 4), 12 / 4 frames; it was `pitch` 4, fronts 20 -> 24 -> 28 and 42 -> 38 -> 34 before the L. The rails' code (`src/hybrid/boss.s`, `BOSS_RAIL`) rides in the region's block after the look tail's 110 B (slot F), its tables and state in the block's room before that |
| `hangar` | with `rails` (S5-5): `{ doors, core, cueFrames, unlockFrames }` - `doors` an armour module covering the `core` (a weapon). The escort launches over the doors (the boss wave's `entry`, HPOS 124 = band column 31 at the still position 32): the doors flash (b3) `cueFrames` before each escort is armed, and once they fall no escort is armed again (an escort in flight flies on). The doors' cover is every cannon and each rail's last gun (a covered cannon leaves it). **Readability (the owner, 2026-10-15):** the doors must have an open look - `band.png` draws them locked (region 2: barred steel over the olive PF3 bank; a shot there shows the deflection glyph), `open.png` unlocked (region 2: amber hazard stripes, PF2, one plain gate glyph - `"stages": false`, the owner's look of 2026-10-15; they flash) - and the moment they open (the exposure check) the open look is drawn, they flash and the hit's high tone is held `unlockFrames` frames. The converter refuses a hangar whose doors have no open look |
| `capped.hp` | a capped emitter's hit points |
| `capped.look` | default true; `false` (S5-5) when every emitter is slot 1 (enabled on every tier): no capped plate in the charset |
| `shareOpenLooks` | default false; `true` (S5-5): two modules with identical open looks share one copy in the look tail |
| `seeThrough` | default none: the `[column, row]` cells of hull art a player shot passes - decision M's girders, the only see-through hull art (decision O); every other hull cell stops a shot, and a column with no such cell is open sky once its modules are gone. **No hull art may lie between a weapon and the band's bottom** (decision O: every weapon hangs in its own recess; the converter refuses it). Region 1: the three girder stubs `[16, 4]`, `[35, 4]`, `[49, 4]` |
| `nozzles` | `left` and `right`: the `[column, row]` cells that show that nozzle (an empty list: no nozzle on that side - region 4 has none since `fix/r4-immobile`); `framesPerPhase` (the three phases cycle; both nozzles go dark at the defeat); `phases` (default true; `false` only with both lists empty, S5-5: no phase images in the look tail, and the two nozzle codes - never drawn - sit outside the charset's run at codes 126-127, where the engine writes them unseen). `band.png` must show each side's phase 0 there. The window shows band columns 4 + p/4 to 43 + p/4, so over the travel (p 0-63) columns 4-59: put the ends inside that range |
| `modules[]` | up to 16: `name`, `kind` (`armour`, `pulse`, `emitter`, `salvo`, `core`), `x`, `row`, `width` (1-6), `height` (1-4), at most 24 cells, `cavityRows` (0 to the height: how many of the module's top rows lie inside the hull's silhouette; default 0 for armour, the full height for a weapon), `wreckRows` (a bay's cannon only, 1 to its `cavityRows`: the rows its wreck keeps - the top ones, the cavity code; the rows under it background, and a shot in its columns stops under the wreck; feat/boss-order-scale, the owner's "less scrap" of 2026-10-17 - the Bastion's cannons 1), `hp` (1-100), `score` (0-99, packed BCD), `slot` (emitters only, 1-4), `reload` (frames, 0 = never fires), `cover` (`"auto"` or a list of module names), `stages` (default true; `false` none, `"lens"` an emitter's lens cell alone, `"centre"` any module's centre cell alone - S5-5, the Bastion's core), `bay` (S5-5, an emitter in an armoured bay - `rails` above) |

Every kind but armour is a **weapon**; the boss is defeated when its last
weapon is destroyed, armour left standing or not. Rows count from the player's
side: row 7 is the front. A module is **exposed** when every module of its
cover is destroyed; `"auto"` is every module in a nearer row whose columns
overlap it - author covers so that what covers a module stands in front of
**every** one of its columns (plan §5.16.3: a cannon half-uncovered by one of
two staggered plates absorbs where the player sees it bare). **Owner decision
N**: a weapon open from the start needs an opening wider than it, with a clear
column between it and each neighbouring plate; and every armour module must sit
where the player's shots reach it - a shot leaves the fighter's centre, so its
HPOS is 56-207 and band column c is in reach only at band positions
4c - 175 <= p <= 4c - 21: keep every armour column in reach for at least a
third of the travel (region 1's travel 0-63: columns 11-54). A covered module
absorbs shots: no damage, and not a hit for the accuracy stat (Q-B7).
**A player shot is drawn inside the band** (decision M) up to the cell that
stops it: the column's front intact module's bottom row, else the hull's
lowest own-row cell that is no module's, else nothing (it leaves the band's
top and is removed). On its way it is drawn into blank cells only and passes
behind a girder's stub (decision M), with four codes the converter adds after the
nozzle codes (the playfield shot's glyphs in COLPF0). **A destroyed module disappears** (owner decision L):
its top `cavityRows` rows (a bay's cannon: its `wreckRows`) become the cavity code, the rows below them band
background - no rim, no outline, nothing over a neighbour - and a shot in its
columns then meets the module behind it, or the hull. The exposure check
runs on the frame after a kill, and a module's redraw (a stage, a hole, an open
look) goes through a queue that draws one module a frame (§5.15.6 item 2).

**Every hit reads** (decision J, as amended by fix/boss-polish, owner choice b3
of 2026-10-12): a damaging hit the module lives through **flashes the whole
module** - bit 7 of its non-blank cells toggled for 3 frames, so its colour-3
pixels show COLPF3 instead of COLPF2 (amber to the hull's dark red, and back)
- and ticks on channel 3 for 2 frames; a kill shows the spark in the struck
cell (the module's bottom row at the shot's column) for 2 frames. A covered
module's or the hull's absorb shows the deflection (the hull: on the column's
hull stop cell) with a tick of its own. The band's colours never change. The
kill sounds on channel 2, the win's blasts on channel 4.

**The art rule the flash needs** (plan `boss-polish` §10.3): every damage stage
of every destructible module - intact, cracked, broken, in the look it is hit
in (an open look), and the capped plate's three - must carry **clearly visible
colour-3 pixels** (`pf2 bank` amber, or `pf3 bank` in a bit-7 cell). A stage
without them shows no flash. `tests/boss-polish.test.mjs` refuses a stage with
fewer than 4 for every region on the disk. The converter also refuses a module
standing in a gun's fire column under the gun without covering it (a boss shot
drawn in a toggled cell would come back wrong).

**The boss's name** (decision AL 1): the loading screen shows `WARNING`, then
the region's boss name, then `INCOMING`. The name is `modules.json`'s `"name"`
(region 1: `"Blockade Breaker"`, region 2 `"Bastion"`); a region still
copied from region 1 would take its entry's `"name"` in `placeholders.json`. It is shown upper-case and must use the reader's glyphs
(A-Z 0-9 space - . / :, at most 40). The converter writes it, with `INCOMING`,
as the reader's records into the region's theme run at byte `$C0` (the run's
slack; the theme may use 192 B), so it costs no resident byte and no sector.

**Damage stages.** A module cracks at 2/3 of its hit points and breaks at 1/3.
Every module cell is a *staged* glyph: the converter puts each distinct
(intact, cracked, broken) cell into a block so that cracked = code + K and
broken = code + 2K. A module with an open look is staged by its open look.

**The charset.** The region's glyphs land at `$0C00` and the band's DLI points
`CHBASE` there under the band. Codes 0-6 are the divider row's (copied from the
gameplay charset by the install); the region has the remaining 121. The charset
run is sized to its glyphs plus the look tail (open looks, nozzle phases) and
may not exceed 8 sectors.

### What the converter refuses

Each naming the file, the cell or the module:

* a PNG that is not 8-bit RGBA, has the wrong size, a translucent pixel, or a
  colour outside the five;
* a cell mixing the pf2 and pf3 banks, or a module cell whose three stages do;
* more than 128 codes (7 divider + 3K staged + plain + 2 nozzles);
* covers that are cyclic (a module covered, through any chain, by itself), a
  self cover, or an unknown name;
* modules that overlap, more than 16, wider than 6, taller than 4 or over 24
  cells, no weapon at all, a duplicated emitter slot, a slot on a
  non-emitter, a module with an open look but no cover;
* a palette colour whose luminance plus `flashLuma` passes 15;
* a nozzle cell that is not its side's phase 0, or inside a module;
* a charset and look tail over 1 KB, or a theme over its 2 sectors;
* a `field` without `field.png`, a field cell that is a module's or a nozzle's
  or not blank in `band.png`, halves outside the band or in each other, a
  generator that is unknown, not armour or inside its own half, a blank phase,
  or phases in two colour banks;
* `rails` (S5-5) whose guns are not pulse or salvo guns of one size in the
  rails' rows behind the front, not consecutive modules, not covered front
  first, no more than the slides; a rail that reaches its cannon before its
  last slide, leaves part of it uncovered at the last, or reaches another
  module; a window outside the band; rails without a `hangar`, or a
  `hangar` whose doors are not armour covering its core, without an escort,
  or without an open look.

### The disk

Region 3 (Siege Spine) has its own directory since S5-3, region 4 (the Void
Citadel) since S5-4, region 2 (the Bastion) since S5-5: no region is a copy of
region 1 any more (`placeholders.json` keeps its format, with no entry).

**The order** (feat/boss-order-scale, the owner's decision AX 1):
`assets/graphics/boss-regions/order.json`, `{"order": [A, B, C, D]}` - region
k (levels 3k-2 .. 3k) ends on the boss drawn in `region-<order[k-1]>/`; absent,
1, 2, 3, 4. Today `[1, 4, 3, 2]`: region 1 the Blockade Breaker, region 2 the
Void Citadel (`region-4/`), region 3 the Siege Spine, region 4 the Bastion
(`region-2/`) - easiest to hardest. The directories keep the names they were
drawn under; the build puts each boss's data and its block code (the well,
the field, the rails: at most one region each) in the runs of the region the
order gives it, and the manifest records it (`boss.order`,
`boss.regions[k-1].name`). The laser tier follows the level (1 / 2 / 4 slots on
levels 1-4 / 5-8 / 9-12, decision AC), so a boss moved to another region fires
the slots of its new levels: a moved boss's signature weapon belongs in slot 1
(the Citadel's axis). `--boss-region=N` enters region N's boss - whichever the
order puts there.

Each region owns 16 sectors from 632: the theme (2, read first, under the
WARNING screen), band A (3), band B (3, with the 256 B of tables) and the
charset (<= 8). The boss code (slot A), the install and slot C (the controller
and the overlay's once-per-entry ASM) are shared, at 528-583.

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

Since step 5 it carries the full payload (plan §8.3): three Light looks -
`hunter` (the Interceptor recoloured: red arms, white pods, steel hub),
`escort` (the Wingman with a steel inner edge) and `lancer` (an Interceptor
re-glyph: a kite-shaped dart) - a staggered twin `PULSE` and a broken-beam
`LASER`, and all three skies. Sector 1 opens on the plain archetypes, so each
is met before its variants.

## The sky rule

Both shipped levels follow one rule, so the colour reads as design rather than
decoration: **the capital sector flies under the allied steel, the level's last
sector under yellow, and every other sector under white.** Level 1: white,
steel, white, yellow. Level 2: white, white, steel, white, white, yellow.

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
