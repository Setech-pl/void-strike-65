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
| `stars` | `white`, `steel`, `yellow` | `white` | the level's default sky: the near-star pixel value - white `COLPF0`, the allied steel `COLPF1`, yellow `COLPF2` (budget-1.0 M2 variant S2). A sector without `look.stars` takes it. `0` is accepted and means `white` |
| `nebula` | 0 | 0 | the nebula (variant S3) is not built; any other value is refused |
| `payload.appearances` | 0-3 looks | `[]` | Light looks for appearance slots 1-3, in order. Each is `{ "name", "rows" }`: a lower-case name a wave can use, and eight rows of eight pixels, left cell then right cell, each pixel `.` black, `W` white, `S` steel or `R` hostile red (a Light's code carries the hostile bit, so `%11` is `COLPF3`). A look is a re-skin (decision AD): the Light keeps its archetype's motion, HP, fire and score |
| `payload.weapons` | 0-2 looks | `[]` | hostile weapon looks laid over the defaults at level start. Each is `{ "class": "pulse" \| "laser", "rows" }`, `rows` the eight 8-bit masks of `assets/graphics/fighter-weapons.json` with its rules: pixels 0-1 only (the right phase is the glyph shifted two pixels) and never `%11`, so hostile fire stays white and steel. One look per class. `bomber` is refused: its second animation phase does not fit the 9-B record |
| `boss` | 0-255 | 0 | BossDef index; 0 = none. Non-zero needs a `boss` sector and a `bossDef` ("The boss" below) |
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
| `look.stars` | `white`, `steel`, `yellow` | the level's `stars` | this sector's sky. It changes on the frame the Director enters the sector, and nowhere else. The compiler writes the resolved value into `sector_look` bits 0-3 for every sector, so the runtime never reads 0 |
| `look.nebula` | `false` | false | not built (variant S3); `true` is refused |
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
| `appearance` | a look's name, or 0-3 | 0 | 0 = the archetype's own art; otherwise a `payload.appearances` look, by name or slot number. On a Light wave its members wear it; on a Heavy wave its **Light escort** does, and the Heavy pair keeps its PMG art, so a Heavy wave without an escort is refused |

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
stops in the boss sector, Q1). Region 1's boss sector has no escort (owner
answer, §5.15.6 item 4): "at most one Light" is met by none.

The laser tier comes from the level, not the region: levels 1-4 enable emitter
slot 1, levels 5-8 slots 1-2, levels 9 and on slots 1-4 (decisions B, 8). An
emitter whose slot is not enabled becomes **capped armour**: the capped plate
over its cells, `capped.hp` hit points, kind armour. **Until the lasers exist
(S4b) every slot is capped** (§5.15.6 item 6).

Region 1 is the layered fortress Blockade Breaker (decision H); the S4a-i core
boss (style 2) is kept in the engine as `assets/graphics/boss-regions/bastion/`,
a later region's boss decided at S5, and the engine's tests' style-2 fixture.

### The region's drafts

`assets/graphics/boss-regions/region-N/` holds six files. The owner edits the
PNGs in any pixel editor; `npm run boss:preview` (or `-- --region=N`) converts
them and renders the whole band, every stage and the extras at the Atari palette
and 2:1 aspect into `build/boss-preview/region-N.png` without building the game.

| File | Size | Content |
| --- | --- | --- |
| `band.png` | 256 x 64 | the band as the fight starts: 64 cells x 8 rows, a cell 4 x 8 pixels; a covered module's closed look (S3's shutters) |
| `cracked.png`, `broken.png` | 256 x 64 | every module's cracked and broken look, read inside module rectangles only |
| `open.png` | 256 x 64 | a covered module's exposed look; a module whose cells here equal `band.png`'s has none |
| `extras.png` | 60 x 8 | 15 cells: the spark (a damaging hit); the deflection (a hit that does no damage: the hull, a covered module); the muzzle flash; the cavity (a destroyed module's rows inside the hull; drawn blank it is the band background); the capped plate intact, cracked, broken; the left nozzle's 3 phases; the right nozzle's 3 phases; blast A, blast B |
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
| `palette` | `colpf0`-`colpf3` under the band (the band's own palette, set by its DLI), `flashLuma`: added to every colour for one frame on a damaging hit - every colour's luminance plus `flashLuma` must stay at 15 or under (the flash never leaves a hue) |
| `motion` | `framesPerColourClock`, `travelColourClocks` (1-63), `startColourClock`, `shakeFrames`, `shakeAmplitude` (0-3) |
| `chain` | `blasts` (at least one a module: the chain passes every module, standing armour included), `framesBetween` |
| `fire.cooldown` | the least frames between two firings (one countdown serves every weapon: the next armed weapon fires when it runs out, and it restarts from that weapon's `reload`, EASY +1/2, HARD -1/4). A pulse cannon fires one PULSE shot of the shared hostile pool from its centre column at the band's bottom edge, straight down; a salvo launcher three, on three frames, from the columns left of, at and right of its centre; one spawn a frame, a full pool drops the shot |
| `capped.hp` | a capped emitter's hit points |
| `seeThrough` | default none: the `[column, row]` cells of hull art a player shot passes - decision M's girders, the only see-through hull art (decision O); every other hull cell stops a shot, and a column with no such cell is open sky once its modules are gone. **No hull art may lie between a weapon and the band's bottom** (decision O: every weapon hangs in its own recess; the converter refuses it). Region 1: the three girder stubs `[16, 4]`, `[35, 4]`, `[49, 4]` |
| `nozzles` | `left` and `right`: the `[column, row]` cells that show that nozzle; `framesPerPhase` (the three phases cycle; both nozzles go dark at the defeat). `band.png` must show each side's phase 0 there. The window shows band columns 4 + p/4 to 43 + p/4, so over the travel (p 0-63) columns 4-59: put the ends inside that range |
| `modules[]` | up to 16: `name`, `kind` (`armour`, `pulse`, `emitter`, `salvo`, `core`), `x`, `row`, `width` (1-6), `height` (1-4), at most 24 cells, `cavityRows` (0 to the height: how many of the module's top rows lie inside the hull's silhouette; default 0 for armour, the full height for a weapon), `hp` (1-100), `score` (0-99, packed BCD), `slot` (emitters only, 1-4), `reload` (frames, 0 = never fires), `cover` (`"auto"` or a list of module names) |

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
its top `cavityRows` rows become the cavity code, the rows below the hull band
background - no rim, no outline, nothing over a neighbour - and a shot in its
columns then meets the module behind it, or the hull. The exposure check
runs on the frame after a kill, and a module's redraw (a stage, a hole, an open
look) goes through a queue that draws one module a frame (§5.15.6 item 2).

**Every hit reads** (decision J): a damaging hit shows the spark in the struck
cell (the module's bottom row at the shot's column) for 2 frames, flashes the
band for one frame and ticks on channel 3; a covered module's or the hull's
absorb shows the deflection (the hull: on the column's hull stop cell) with
a tick of its own. The kill sounds on channel 2, the win's blasts on channel 4.

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
* a charset and look tail over 1 KB, or a theme over its 2 sectors.

### The disk

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
