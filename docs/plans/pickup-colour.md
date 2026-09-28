# Plan — the pickup capsule wears one boost colour that no enemy shares

**PLANNING session, 2026-09-28.** Branch `docs/plan-pickup-colour` from `main`
at `68b5968` (`docs(status): 4.6 step 2 — the measured gates and the evidence
blocker`), worktree `../dark-fighter-pickup-colour` created clean by this
session. **Nothing here is implemented; this document is the deliverable.** No
build and no test suite was run. Every figure is **MEASURED** from the named
file and line at that HEAD, from `docs/STATUS.md`, `docs/memory-map.md`, the
committed `dist/void-strike-65-manifest.json` or a committed emulator capture
under `docs/media/`, unless labelled **ESTIMATE**.

Owner request (2026-09-28): the booster/weapon pickup capsules are still
purple — an enemy colour. Players must not read a pickup as an enemy. All
capsules may share one colour that means "boost", but it must not be any
enemy's colour in any region.

---

## 0. Precondition evidence

| # | Precondition | Result |
| --- | --- | --- |
| 1 | new worktree clean, main's commit recorded | **PASS** — `git status --short` empty; `main` = `68b5968` |
| 2 | documentation only: no build, no tests, no change to source, assets, tests, `dist/` or the runtime evidence | **held** — this file is the only change |

---

## 1. Facts

### 1.1 How the capsule is drawn, and why it is purple

* **Object.** The capsule is the GTIA **fifth player**: missiles `M0-M3` side
  by side. `render_fighter_pickup_pmg` (`src/main.s:10862-10899`) writes
  `HPOSM0 = ENTITY_X`, `HPOSM1 = +2`, `HPOSM2 = +4`, `HPOSM3 = +6`
  (`:10870-10878`), `SIZEM = $00` (`:10895`) and `PRIOR = $10` (`:10897-10898`,
  "GTIA fifth-player mode: M0-M3 use COLPF3").
* **Sixteen-row logic.** One silhouette per booster type, 16 rows each,
  `fighter_pickup_pmg_shape` (`src/main.s:11273-11310`, `STARFIELD` segment),
  indexed by `ENTITY_TYPE+WEAPON_PICKUP_SLOT` × 16 (`:10881-10886`); the rows
  are written to `MISSILES + Y + 8` (`PMG_DMA_CAPTURE_Y_OFFSET`, `:489`). The
  encoding interleaves two bits per missile (`:11262-11272`), one bit per
  colour clock, so the mark carries **exactly one colour**.
* **Publication.** `publish_fighter_pickup_pmg` (`:10855-10860`) clears and
  redraws the 16 missile rows inside the post-playfield window at `VCOUNT $77`
  (`publish_fighter_projectile_overlays`, `:3095-3118`), fighter path only.
  Policy (`update_fighter_pickup_pmg`, `:10826-10834`) runs only while
  `CAPITAL_SECTOR_STATE = CAPITAL_HULL_STATE_OPEN` (7,
  `src/encounter-director.s:9`); an uncollected capsule is sector-local
  (`weapon_pickup_clear_sector`, `:10251-10256`), and a capsule is released when
  the player enters `PLAYER_DYING` (`clear_transient_effects` →
  `weapon_pickup_clear_lifecycle`, `:10681-10685`). **A capsule is therefore
  only ever visible in open fighter space, never over a capital hull.**
* **Release.** `release_fighter_pickup_pmg_hardware` (`:10218-10223`) restores
  `PRIOR = $00` and `SIZEM = $54`.
* **Geometry.** Y from `WEAPON_PICKUP_ACTIVATION_TOP` 24 to
  `WEAPON_PICKUP_RELEASE_TOP` 240, 16 scanlines high, 8 HPOS wide, half a
  scanline per frame (`build/entity-effects.inc:93-102`, generated from
  `assets/graphics/entity-effects.json`).
* **Colour register.** A fifth player can only take **`COLPF3`**. `COLPF3` is
  written on every frame by the top gameplay DLI from the immediate
  `GAMEPLAY_COLPF3` (`src/main.s:3547-3548`), and at gameplay entry/resume
  (`:2605-2606` "restore red structural accents for gameplay", `:2896-2897`).
* **Why purple.** `GAMEPLAY_COLPF3 = INTERCEPTOR_PROJECTILE_COLOR`
  (`src/main.s:541`); `INTERCEPTOR_PROJECTILE_COLOR = $46`
  (`build/fighter-weapons.inc:63`, emitted by `scripts/fighter-weapons.mjs:368`
  from `assets/graphics/fighter-weapons.json` `interceptor.colourValue`);
  mirrored as `ENEMY_PULSE_COLOR = $46` (`build/enemy-roster.inc:52`, from
  `assets/graphics/enemy-roster.json:54-55`) and asserted equal at
  `src/main.s:893`. `$46` is **hue 4, luminance 6 — the hostile burgundy
  family** (`HULL_COLOUR_RAIDER $44`, `src/c/lifecycle.c:133`; enemy capital
  accents `$46`). On a PAL set hue 4 reads purple, which is what the owner sees.

### 1.2 Everything else that shares `COLPF3`, per sector state

ANTIC 4 pixel value `%11` in a screen code with bit 7 set (the "hostile bank")
renders in `COLPF3` (`scripts/preview.mjs:1578`; `scripts/capital-hulls.mjs:1015`
`hostileRegister: "COLPF3", hostileAttribute: 0x80`).

| Sector state (`CAPITAL_HULL_STATE_*`, `build/capital-hulls.inc:49-55`, `src/encounter-director.s:7-9`) | `COLPF3` users besides the capsule | Source |
| --- | --- | --- |
| capital traversal: `ENGINES` 0, `AFT` 1, `COMBAT` 2, `FORWARD` 3, `PROW` 4, `DRAIN` 5, `COMPLETE` 6 (the corridor is the gap between the allied and enemy hulls in these states) | enemy capital hull mass (value-3 cells) `$46`; enemy turret glyphs 77-80 (value 3); capital shell bolts 126/127 with bit 7 | `tests/capital-hulls.test.mjs:550`; `src/main.s:575-580` |
| fighter space: `OPEN` 7 (the only state with a capsule) | **Light Wingman** — glyphs 120-121 installed as `120 \| $80`, every pixel value 3 (`light_glyph` `$F0,$FC,$3F,$0F…`, `src/main.s:12751-12753`): the whole wing is `COLPF3`; **Interceptor** corner rotor pods (`light_interceptor_glyph`, `:12754-12766`, "R" cells) | `tests/light-wingman.test.mjs:30`; `docs/art-direction.md` §Enemy visual roles |
| boss | no boss sector exists yet (`docs/level-authoring.md`, `kind: boss` reserved for 4.7) | — |
| HUD band (ANTIC 2) | none — the HUD uses `COLPF1`/`COLPF2` only (`HUD_COLPF1 $0E`, `HUD_COLPF2 $00`, `src/main.s:543-544`) | `gameplay_dli_hud` `:3560-3569` |

Hostile projectiles (`PULSE`/`LASER`/`BOMBER`) are authored in white
`COLPF0` and steel `COLPF1` only, never `%11` (owner decision 19,
`docs/art-direction.md` §Gameplay palette ownership; `scripts/fighter-weapons.mjs:58`),
so they do **not** use `COLPF3` even though bit 7 would map them there.

The frontend and loader also write `COLPF3` (green `$D8`, `src/main.s:1988`,
`:11372`) on screens gameplay never shares.

### 1.3 `PRIOR` and every mid-frame colour change

* `PRIOR = $00` at startup (`src/main.s:11355-11356`), in the loader (`:3152`)
  and at capsule release (`:10220`); **`$10` only while a capsule is `ACTIVE`**
  (`:10897`). In fighter space nothing but the capsule uses the missiles; in
  capital sectors `PRIOR` is `$00` and the broadside uses `M1-M3` through
  `HPOSM1,x` (`:8278-8309`) with per-missile `SIZEM` bits (`:9697-9715`), so
  they take `COLPM1-3`, not `COLPF3`.
* Gameplay runs **exactly two DLIs** (`NMIEN $80`, `:2622-2623`): the top one
  (phase 0, HUD → ring: `WSYNC`, `CHBASE`, `COLPF0-3`, `:3517-3555`) and the
  bottom one (phase 1, last ring row → HUD: `WSYNC`, `CHBASE`, `COLPF1/2`,
  `:3560-3569`). The ring display list is built by
  `build_playfield_display_list` (`:5606-5660`): `$C2` HUD row with DLI, `$44`
  divider, 27 `$44` LMS rows, the last `$C4`; two lists A/B on page `$7F`,
  swapped by `rotate_playfield_rows` (`:5665-5710`).
* The only other colour writes are per-frame main-loop writes: `COLBK` flashes
  (`:7078-7102`), Heavy hull colour to `COLPM1/2` (`src/hybrid/c-asm-abi.s:393-394`,
  `src/hybrid/heavy-member.s:60`), shield pulse to `COLPM0/3` (`:11227-11241`),
  and the level's allied steel patched into the top DLI's immediate operand by
  `publish_level_hull_style` (`:7638-7654` → `gameplay_dli_allied_colpf1_load`
  `:3543`). Level data carries **no enemy colour byte** (`docs/level-authoring.md`
  §Level fields: `stars`/`look.stars` are reserved and unbound).
* The runtime evidence pins the two-DLI shape: the emulator patch counts entries
  at `gameplay_dli` and flags any host frame with a count ≠ 2 or a phase out of
  order (`scripts/atari800-wall-trace.h:6317-6333`); the trace gate requires
  `dli_sequence_violations === 0 && maximumDlisPerHostFrame === 2`
  (`scripts/runtime-wall-trace.mjs:6013-6016`, `:6584`).

### 1.4 The player's P3 "engine plume" is not visible today

This fact decides the cost of Options 2a and 2b, so it is stated with its
evidence. `draw_player` (`src/main.s:3795-3806`) writes `player_shape` to `P0`
and `player_engine_shape` to `P3` at the same `HPOS` (`:3767-3768`) and the same
double width (`SIZEP0 = SIZEP3 = 1`, `:2599-2600`). GTIA orders players
`P0 > P1 > P2 > P3` regardless of `PRIOR` (the project's own model:
`scripts/preview.mjs:1705`, `:2981`). Row by row (`:7150-7181`):

| row | `player_shape` (P0, white) | `player_engine_shape` (P3, amber) | amber visible? |
| ---: | --- | --- | --- |
| 4-9 | `01111110`, `11011011`, `11111111`, `11011011`, `11111111`, `01111110` | `00011000` ×2, `00100100`, `00011000` ×3 | no — every P3 bit lies under a P0 bit |
| 10 | `00111100` | `00100100` | no |
| 11 | `00100100` | `00100100` | no (identical) |
| 12 | `01100110` | `00100100` | no |
| 13-14 | `01000010` | `01000010` | no (identical) |

**MEASURED** in the committed emulator capture
`docs/media/gameplay/02-standard-combat.png` (decoded pixel classes around the
ship in this session): the fighter is **white on every pixel; no amber pixel is
rendered**. The amber `COLPM3` only ever reaches the screen in the **player
explosion**, whose outer mask goes to `P3` with the core masked into `P0`
(`render_shared_fighter_explosions`, `:4661-4671`), and the shield pulse's
`COLPM3` flip (`:11227-11241`) is likewise invisible. The art-direction
sentence "warm engine accents" describes the intent, not the current screen.

---

## 2. Colour inventory of the gameplay screen

Enemy **hull styles** R1-R4 change glyph shapes only; the enemy colours are the
same in every region (owner decision AC: "the enemy colour is unchanged";
`docs/plans/hull-set-v1.md` §8). The allied steel is the one per-level byte.

| Object | Register | Value | Source |
| --- | --- | --- | --- |
| background | `COLBK` | `$00` | `src/main.s:542` |
| kill / death / damage flashes (transient, whole background) | `COLBK` | `$34 $1C $3C $1E` / `$34 $38 $3C $1C $3C $1E` / `$42` | `:7515-7519`, `:545` |
| near stars, debris white pixels, Interceptor hub, hull value-1 cells | `COLPF0` | `$0E` | `:527`; `assets/graphics/starfield.json:29` |
| **allied steel**: allied hull body, enemy hull value-2 accents, Light steel arms, hostile projectile trails, far stars, debris steel pixels | `COLPF1` | **`$88` levels 1-6, `$84` levels 7-12** (level byte) | `:530-538`, `:7651`; `hull-set-v1.md` §8; `starfield.json:14` |
| player projectiles (Normal/Rapid/Spread), allied capital value-3 cells, capital explosion core, debris-destruction yellow flicker | `COLPF2` | `$1E` | `build/fighter-weapons.inc:51`; art-direction §Gameplay palette ownership |
| **enemy accents**: enemy capital mass, Wingman wing, Interceptor pods, **and the capsule** | `COLPF3` | `$46` | §1.1-1.2 |
| player hull (P0); shield pulse alternate | `COLPM0` | `$0E` / `$84` | `:546-548`, `:11227-11241` |
| **Heavy Raider** (P1/P2), broadside missiles M1/M2 in capital sectors; review palettes | `COLPM1/2` | **`$44`** (`$42` oxblood / `$48` scarlet review variants) | `src/c/lifecycle.c:133`, `:991-992`; `build/enemy-roster.inc:33-36`; `:2609-2611` |
| **Heavy Bomber** (P1/P2) | `COLPM1/2` | **`$C8`** at 4 HP → `$C6`/`$C4`/`$C2`; charge +4, flash +6 (up to `$CE`) | `lifecycle.c:150-162`; STATUS "Bomber hull colour — green" |
| enemy fighter explosion (P1/P2) | `COLPM1/2` | the formation's hull colour | `begin_enemy_fighter_explosion` `:4613` |
| player "engine plume" (P3, **occluded**, §1.4); player explosion outer mask (visible); shield pulse alternate (occluded); broadside missile M3 in capital sectors | `COLPM3` | `$28` / `$0E` | `:547-549`, `:11228-11229`, `:4661-4671`; `tests/enemy-combat.test.mjs:101-102` |
| HUD text | `COLPF1` on `COLPF2` | `$0E` on `$00` | `:543-544` |

**Hues in play in fighter space (where a capsule can appear):** 0 (white,
black), 1 (player yellow), 2 (amber: explosion outer mask only), 3 (flash,
transient), **4 (enemy)**, 8 (allied steel), **C (Bomber)**. **Hues used by no
gameplay object: 5, 6, 7, 9, A, B, D, E, F.** Frontend green `$D8` is hue D on
screens gameplay never shares.

Not verified this session (no build): the exact registers of the Heavy
break-up fragment glyphs 118-119 — the art direction places them in the debris
white/steel palette; the implementing session should confirm from
`EMIT_EFFECT_FRAGMENT_GLYPHS` (`src/main.s:11255`).

---

## 3. Candidate boost colours

Requirements: no enemy hue (4, C), not the allied blue (8, and 9 as its
neighbour), readable on black, and — because capsules exist only in open space
— readable next to stars (`$0E`/`$88`), debris, Lights (`$46`/`$88`/`$0E`) and
Heavies (`$44`, `$C8`). Luminance C (12) is bright on black and one step below
the `$0E`/`$1E` highlights, so the mark never reads as a star or a shot.

| Candidate | Byte | Hue distance to enemy hue 4 / Bomber hue C / steel hue 8 | Notes |
| --- | ---: | --- | --- |
| **A — gold** | `$1C` | 3 / 5 / 7 | hue 1 is the player's projectile hue (`$1E`), so a gold capsule reads as "player energy"; it is the family the original Rapid capsule used (`assets/graphics/entity-effects.json:95-99`, fill `COLPF2`). Drop to `$1A` if `$1C` is too pale on hardware |
| **B — cyan** | `$AC` | 6 / 2 / 2 | a hue nothing else uses; two steps from both steel and Bomber green — the hardware check is that it does not read as "blue" (allied). `$9C` was rejected as hue 9 is the light blue next to steel |
| **C — orange** | `$2C` | 2 / 6 / 6 | the engine hue (`$28`): "thrust". Two steps from hostile hue 4 (which the owner's set shows as purple, so the separation is larger on that set than the number suggests); one step from the hue-3 flashes, which are background-only and last a few frames. Under Option 2b (§4.4) this is the candidate the exhaust and the capsule would share |

**`$28` versus `$2C` for the shared engine/boost colour (Option 2b).** Against
the enemy family the two bytes are the same hue distance (2), but `$28` sits at
luminance 8, only two steps above the enemy accent `$46` and four above the
Raider `$44`, while `$2C` adds a luminance gap of six and four. Against the
player's yellow shots (`$1E`, hue 1, luminance 14) `$28` is further (six
luminance steps) than `$2C` (two) — but a shot is a 1-HPOS bolt and the capsule
an 8×16 solid mass, so that pair separates by shape wherever it does not by
value. **`$2C` reads better against hue 4, which is the reported problem;
`$28` reads better against the shots.** The review candidate builds both (§6.3).

Rejected outright: hues 5-7 (the purple family the owner is rejecting), 9
(allied blue's neighbour), B and D (adjacent to Bomber green), E/F (wrap toward
pink/orange-yellow on some PAL sets). **The owner's hardware smoke decides**
(§7); the review candidate builds every candidate.

---

## 4. Implementation options, costed

### 4.0 The figures the costs are measured against

| Gate | `main` `68b5968` (STATUS §"Roadmap 4.6 step 2", candidate build) | pending step-2 closing branch `feat/director-level-data` `871eb79` (unmerged; its STATUS) | Rule |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | **1,264** | **727** | GO ≥ 500 |
| DMA-on maximum | **31,089** | **31,670** (frame 8,654 of `director-complete-0-natural-sweep-fire0` — a fighter frame **with a pickup on screen**) | target 31,200 / hard 32,568 |
| initial block content / ceiling | **13,634 / 13,684** (50 B) | 13,634 / 13,684 | no new boot sector (owner decision 6) |
| `$AE00` window (`HYBRID_C_WINDOW`) used / free | **1,991 / 1,593** | 1,991 / 1,593 | — |

The committed `dist/void-strike-65-manifest.json` on `main` still reads
**13,652 B / 209 sectors / window 1,509 used, 2,075 free**: `dist/` was last
regenerated at `28bd1e7`, before step 2, which is the evidence blocker STATUS
records. Whichever pair the owner merges, **the thinner figures (727 / 31,670)
bind**, and both are quoted below.

Resident free tails that matter (MEASURED at the dates STATUS/memory-map give;
re-measure before implementing): `MAIN` `CODE`/`RODATA` **0 B** free
(`RODATA` ends `$3FFF`) plus the **56 B `LOADER_SPLASH_CODE_SLACK`** layout pin
(memory-map §`$0500-$06FF`: "available to whatever needs them next");
`PICKUP_CODE` `$8776-$8B66` tail **89 B** (STATUS "Debris reward"; the sibling
worktree's link map shows `$8B36-$8B66`, 49 B, but that build may be a review
variant); `ENTITY_CODE` **5 B**; `A2_KERNEL` **19 B**. `MAIN`, `STARFIELD`,
`PICKUP_CODE` and `ENTITY_CODE` all travel **packed in the initial block**, so
any byte added there costs against the 50 B (or 32 B) headroom; the `$AE00`
window travels in the extension and costs nothing there.

### 4.1 The register table that decides everything

In fighter space every colour register a PMG-side object can take is owned:

| Register | Owner in `OPEN` | Free? |
| --- | --- | --- |
| `COLPM0` | player hull (P0), shield pulse | no |
| `COLPM1`, `COLPM2` | Heavy P1/P2 (architecture invariant: P1/P2 are the Heavy class) | no |
| `COLPM3` | player engine plume (P3) — **occluded**, §1.4; player explosion outer mask | owned, but its only visible use is the explosion |
| `COLPF3` (fifth player) | Light Wingman wing, Interceptor pods | no |
| `COLPF0/1/2` (character renderer) | white / allied steel / player yellow | no dedicated register |

**No option gives the capsule a colour of its own without taking something from
another object.** The options below differ only in what they take.

### 4.2 Option 1 — a `COLPF3` band around the capsule (mid-frame colour change)

Keep the fifth-player mark. Add two DLIs per frame while a capsule is `ACTIVE`:
"on" at the ring row above the capsule's top (`row = (Y-24) >> 3`, DL byte
offset `3 + 3·row`; the divider row when `row = 0`), writing the boost colour;
"off" two rows below the capsule's top row (offset `6 + 3·(row+2)`), restoring
`$46`; omitted when the capsule sits in the last two ring rows (the next frame's
top DLI restores `$46`). The handlers vector through `VDSLST` (top DLI →
`band_on` → `band_off` → `gameplay_dli`), so `gameplay_dli` is still entered
exactly twice per frame with phases 0, 1 and the emulator's integrity check
stays green; a new trace column should count the band DLIs so the evidence
remains truthful. DL bits are cleared/set in the post-playfield window, on
whichever list will be active next frame.

| Cost | ESTIMATE | Against `main` | Against the step-2 branch |
| --- | ---: | ---: | ---: |
| cycles, frames without a capsule | +7 (top-DLI hook `lda flag / beq`) | — | — |
| cycles, frames with a capsule, no `WSYNC` | +~195 (2 × ~50 DLI incl. OS `VDSLST` dispatch, ~85 DL maintenance, hook 12) | fence 1,264 → ~1,150; DMA-on 31,089 → ~31,285 | **fence 727 → ~615**; **DMA-on 31,670 → ~31,865** (hard gate 32,568 still met; target already exceeded on that replay) |
| with `WSYNC` edges (exact colour edges) | +2 × up to 105 more | | fence → ~420-500: **at or below the GO floor** |
| bytes, `MAIN` (initial block) | +~14 B hook, out of the 56 B slack; packed delta ~14 B against the 50 B headroom | | |
| bytes, `$AE00` window | +~120-150 B handlers + DL maintenance, called through the existing ABI veneer pattern (Light kernel) | 1,593 B free | |
| bytes, RAM | +1 flag, +2 saved DL offsets | | |

Side effects: every `COLPF3` pixel inside the 24-32-line band (a Light wing or
pods passing the capsule) turns the boost colour for those lines; without
`WSYNC` one scanline per switch is torn (old colour left, new colour right of
roughly colour clock 80). Rules: `docs/art-direction.md` §Visual language —
"Gameplay does not add another DLI or PMG multiplexing merely for a local
colour effect" — needs an owner waiver; `reguly-projektu.txt` §12 lists "raster
bands as a workaround for ownership" as a rejected direction (this is a colour
band, not an ownership band, but the owner should say so explicitly).

Gates and tests that change: `scripts/atari800-wall-trace.h` (new band-DLI
column; integrity keyed on `gameplay_dli` unchanged);
`scripts/runtime-wall-trace.mjs:3800-3846` pickup-contact raster clause (counts
capsule pixels in `palette[colpf3]`, and `colpf3` samples `$46` at frame end —
must count the boost colour); `tests/source-contracts.test.mjs:248-249`
(art-direction wording); `tests/runtime-wall-trace.test.mjs` if the report
schema gains a column; PAL audit and boot smoke re-run (boot unchanged if the
hook fits the slack). `tests/weapon-pickup-*.test.mjs` `COLPF3 0x46` pins stay
true (the register's frame-start value is unchanged).

### 4.3 Option 2a — capsule on player `P3`, `COLPM3` dedicated, no exhaust object

The only PMG object whose register can be freed without touching the Heavy
class or the player's hull is **P3**. The capsule becomes a normal-width `P3`
image (8 clocks wide, the same 8-pixel silhouettes at 1-clock resolution as
today); `COLPM3` becomes the boost colour. The `player_engine_shape` rows are
dropped from gameplay (§1.4: nothing visible is lost) or, if the owner wants a
visible exhaust in white, OR-ed into `player_shape`; the shield pulse writes
`COLPM0` only (its `COLPM3` flip is invisible today); the player explosion keeps
its `P3` outer mask, now in the boost colour, because the capsule is released
on `PLAYER_DYING` (§1.1; the implementing session verifies the order of
`clear_transient_effects` against `begin_player_fighter_explosion`, `:12795`).
`PRIOR` stays `$00`; the fifth-player toggling and the `SIZEM` juggling go
away; `SIZEP3 = 0` in gameplay. In capital sectors broadside slot 2 is `M3`
and takes `COLPM3`, so `COLPM3` is re-published per sector state (`$28` as
today in capital states, the boost colour in `OPEN`): two byte writes at
sector entry — unnecessary if the boost colour is hue 2 (§3), when a single
value serves both.

| Cost | ESTIMATE | Against `main` | Against the step-2 branch |
| --- | ---: | ---: | ---: |
| cycles, frames with a capsule | **−~25** (one `HPOSP3` instead of four `HPOSM`, no `SIZEM`/`PRIOR`) | fence ≥ 1,264; DMA-on ≤ 31,089 | fence ≥ 727; DMA-on ≤ 31,670 |
| cycles, player redraw frames | −~80 (no `PLAYER3` stores in `draw_player`/`erase_player`) | | |
| cycles, shield pulse ticks | −~8 | | |
| bytes, `MAIN` | −~40 B (`PLAYER3` stores, `COLPM3` pulse writes); freed bytes join the slack pin so **no address moves** | | |
| bytes, `PICKUP_CODE` | −~20 B (renderer/release) | | |
| bytes, `STARFIELD` | 48 B shape table re-encoded to plain player bit order (same size; packed size ± a few bytes) | | |
| bytes, sector-entry `COLPM3`/`SIZEP3` publish | +~12 B in the `$AE00` window or `PICKUP_CODE` | | |
| initial block | ≤ unchanged (ESTIMATE −20 to −60 B) | | |

Side effects, **player-visible**: none on the ship (§1.4); the player
explosion's outer mask changes from amber to the boost colour; the frontend's
menu craft is a different screen and keeps `P3` (verify whether it reads
`player_engine_shape`, `src/main.s:7168`, before deleting the table — keeping
the 16 B costs nothing). Rules: no new DLI; "a local object must not change the
global palette" holds because `COLPM3` is dedicated.

Tests RED after the change (each must be re-pointed):
`tests/pickup-pmg-raster-visibility.test.mjs` (missile-plane, `HPOSM0`,
`SIZEM`, `PRIOR` and the native quartet-union check `:128-137`);
`tests/fighter-weapons.test.mjs:252` (`PLAYER0,y … PLAYER3,y`) and `:414`
(`lda #$28 / sta COLPM3` — stays green only if the boost byte is `$28`);
`tests/entity-effects.test.mjs:1359-1542` (respawn publishes P0 **and** P3);
`tests/broadside-fire.test.mjs:1431`, `:2049`, `:2171-2172`, `:2297`;
`tests/enemy-combat.test.mjs:101-102`;
`tests/broadside-antic2-prototype.test.mjs:136-137` (if the table goes);
`tests/source-contracts.test.mjs:248-249`; `docs/hardware-testing.md` §6. Trace
patch: `pickup_pmg_rows`/`pickup_union` read the missile plane
(`scripts/atari800-wall-trace.h`) → the `PLAYER3` plane; the contact clause's
`prior` test → `$00` always; the raster clause counts `palette[colpm3]`.
`tests/weapon-pickup-rapid-fire.test.mjs:271` ("no character footprint") and
`:405` (`PRIOR $00` at startup) stay true.

### 4.4 Option 2b — capsule on `P3`, the exhaust on missile `M3` in `OPEN`, one shared engine/boost colour

Owner-proposed variant (2026-09-28). As 2a, plus: while the sector state is
`OPEN` the exhaust is drawn on **`M3` in normal missile mode** (`PRIOR $00`),
which takes its colour from `COLPM3` — the register the capsule on `P3` now
owns — so the exhaust and the capsule share one colour and **the boost colour
is the engine colour** (candidate C `$2C`, or today's `$28`; §3 says which reads
better against what). `HPOSM3` positions the exhaust independently of the
capsule's `HPOSP3`. In capital states there is no capsule and the broadside
needs `M3`, so the exhaust returns to `P3` there, as today.

**Does the plume shape survive at missile resolution?** No, and not for the
reason one would expect. A missile is one 2-bit object per scanline with one
`HPOS`, so at `SIZEM` double width for `M3` (`SIZEM = $54` already sets M3 to
double: bits 7-6 = `01`, `:10221`) the value `11` draws a 4-clock column —
exactly the plume's core rows `00011000` at the player's double width. The
flared rows `00100100` and `01000010` are two separate dots and cannot be drawn
by one missile at any width (quad `11` = one 8-clock bar, not two dots). But
§1.4 shows that **none of those rows is visible today**: every P3 bit sits under
a P0 bit. What 2b puts on screen is therefore **new**: `M3` has `P3`'s
priority, below `P0`, so a 4-clock column at `HPOSM3 = player_x + 6` shows only
where the hull mask leaves bits 3-4 clear — **rows 11-14, between the legs**
(`00100100`, `01100110`, `01000010`, `01000010`), a 4-clock × 4-row exhaust the
ship has never shown; rows 4-10 stay hidden as now. It can be lengthened
below the hull (rows 15-17 are free in both shapes) for a visible tail, at the
cost of extending the erase loop. This is a *visible* ship change and an owner
choice; it is what "keep the amber exhaust" actually means on this hardware.

**The per-state switch of the exhaust object.**

| Piece | Where | What it does | Bytes (ESTIMATE) | Cycles (ESTIMATE) |
| --- | --- | --- | ---: | ---: |
| `draw_player` (`:3795-3806`) | `MAIN` | branch on `CAPITAL_SECTOR_STATE = OPEN`: `sta MISSILES,y` with the exhaust rows (`$C0` for `11` in bits 7-6, `$00` elsewhere; M0-M2 are unused in `OPEN` so a plain store is safe) instead of `sta PLAYER3,y` | +~14 | redraw frames (vertical moves only, `:3752-3763`): same store count as today, +7 branch |
| `erase_player` (`:3784-3794`) | `MAIN` | same branch: in `OPEN` clear the `MISSILES` rows and **not** `PLAYER3` (the capsule may occupy those rows); in capital states clear `PLAYER3` and **not** `MISSILES` (broadside bolts) | +~12 | +7 per redraw |
| position write (`:3767-3768`, also `:2577`, `:4654`, `:7908`, `:9526`) | `MAIN` | in `OPEN`: `HPOSM3 = player_x + 6` (`clc`/`adc`/`sta`); in capital states leave `HPOSM3` to the broadside (`render_broadside_warning`, `:8278-8309`) | +~12 | **+~17 every `OPEN` frame** (branch 7 + add/store 10) |
| sector entry | the path that already calls `weapon_pickup_clear_sector` (`:10327`), `PICKUP_CODE` or the `$AE00` window | erase the player on the old plane, set `SIZEP3` (0 in `OPEN` for the capsule, 1 in capital for the P3 exhaust), set `COLPM3` if the two states use different bytes, redraw the player on the new plane | +~20 | ~400 once per sector transition (two 16-row loops), not per frame |
| exhaust rows | `RODATA` | 4-7 bytes if the tail below the hull is wanted; otherwise the immediate `$C0` | +~6 | — |

Against the binding frames: `OPEN` frames gain ~17 cycles →
**fence 727 → ~710, DMA-on 31,670 → ~31,687** (main: 1,264 → ~1,247; 31,089 →
~31,106); redraw frames are cost-neutral against today (the `PLAYER3` stores
become `MISSILES` stores). Combined with 2a's savings on capsule frames the net
on the 31,670 frame is ~−8. Bytes: **`MAIN` +~40 B net** (2a's −~40 B plus
~+60 B for the branches and the sector entry if placed in `MAIN`; the sector
entry can live outside `MAIN`) — spent from the 56 B slack, packed delta
~+30-40 B against the 50 B initial-block headroom (32 B on the committed
manifest): **fits, but it is the tightest item in this plan**. `PICKUP_CODE`
−~20 B as 2a.

**The shield pulse.** `update_shield_player_fighter_colors` (`:11235-11241`)
flips `COLPM3` between `$0E` and `$28` every eight frames. In `OPEN` that would
now blink **both** the exhaust and any capsule on screen white — the capsule
would pulse like the ship. It must not write `COLPM3` in `OPEN`. Because the
flip is invisible today (§1.4) the simplest, byte-saving answer is to remove
the `COLPM3` writes from both shield routines outright (−~10 B), which leaves
the screen identical to today in every state; if the owner wants the new M3
exhaust to pulse with the hull, that is a per-state branch instead (+~8 B) and
the capsule still must be excluded, which one register cannot do — so "the
exhaust pulses" and "the capsule does not" are mutually exclusive under 2b.

**The player explosion's P3 half in `OPEN`.** Unchanged from 2a: the capsule is
released on `PLAYER_DYING` before the explosion's 24 frames, so `P3` is free and
the outer mask (`:4661-4671`) renders in the shared engine/boost colour; the
exhaust on `M3` is erased with the player at death. If the implementing session
finds the release lands one frame after the explosion starts, the capsule's
`HPOSP3` is overwritten by the explosion's for that frame — acceptable, or
release the capsule in `begin_player_fighter_explosion` (`:3824`) instead.

**Which tests from 2a's RED list change differently.**

| Test | 2a | 2b |
| --- | --- | --- |
| `tests/fighter-weapons.test.mjs:252` (`PLAYER0,y … PLAYER3,y` in the renderer) | RED | **stays green** — the capital branch still writes `PLAYER3` |
| `tests/fighter-weapons.test.mjs:414` (`lda #$28 / sta COLPM3`) | RED unless `$28` | same rule; green if the shared colour is `$28` |
| `tests/broadside-antic2-prototype.test.mjs:136-137`, `tests/broadside-fire.test.mjs:1431` (`player_engine_shape` bytes) | RED if the table goes | **green** — the table stays for the capital-state P3 exhaust |
| `tests/broadside-fire.test.mjs:2049`, `:2171-2172` (`sta HPOSP0` then `sta HPOSP3` in respawn/damage paths) | RED | **likely green** — the pair remains, followed by the `OPEN` branch; verify the regex still spans it |
| `tests/entity-effects.test.mjs:1359-1542` (respawn publishes exactly one `PLAYER3` image) | RED | RED in a different way: the respawn in `OPEN` publishes `P0` + `M3`, in capital `P0` + `P3` — the harness needs the state |
| `tests/enemy-combat.test.mjs:101-102`, `tests/broadside-fire.test.mjs:2297` (`COLPM3 = $28`) | RED unless `$28` | same |
| trace `pickup_pmg_rows` / `pickup_union` (`scripts/atari800-wall-trace.h`) | move to the `PLAYER3` plane | move to `PLAYER3` **and** the missile-plane column must ignore bits 7-6 (or the harness would count the exhaust as capsule rows) |
| new: *the exhaust is on `M3` in `OPEN` and on `P3` in capital states* | — | RED today (both states write `PLAYER3`) |
| new: *no shield path writes `COLPM3`* | RED today | RED today |

Everything else on 2a's list (`pickup-pmg-raster-visibility`, `source-contracts`,
`hardware-testing` §6, the raster clause counting `palette[colpm3]`) is the
same under 2b.

### 4.5 Option 3 — fifth-player mode as such (missiles take `COLPF3`)

This **is** today's mechanism. Whatever value `COLPF3` takes, the Wingman's
whole wing, the Interceptor's pods and the enemy capital accents take it too
(§1.2). Changing the byte (0 cycles, 1 B) recolours the enemies into the boost
colour — the opposite of the request. Making `PRIOR = $10` permanent would in
addition recolour the capital broadside missiles `M1-M3` to `COLPF3`. **Not a
solution.** A per-sector `COLPF3` value (patch the DLI operand at sector entry
like the allied steel, ~20 B, 0 cycles) only helps if the Lights stop using
`COLPF3` — that is Option 4.

### 4.6 Option 4 — per-sector `COLPF3` plus Lights re-authored without value-3 pixels

`COLPF3` = boost colour in `OPEN`, `$46` in capital states (operand patch,
~20 B, 0 cycles); Wingman and Interceptor art re-authored to white/steel only
(32 B of glyphs, same size). Costs nothing in CPU or transport, but the Lights
would then wear the **allied** palette (white hull like the player, steel like
the allied hull), the Interceptor loses the red pods that are its 4.4b identity
(`OWNER-SMOKE CANDIDATE`), and the Wingman's "one-colour red swept wing" is an
accepted visual. It trades "the pickup reads as an enemy" for "the enemy reads
as friendly". Tests RED: `tests/light-wingman.test.mjs:361` (glyph rows),
`tests/light-interceptor.test.mjs` glyph pins, `tests/capital-hulls.test.mjs:242`
(gameplay registers contain `$46`), the `weapon-pickup-*` palette pins. **Not
recommended.**

### 4.7 Rejected without full costing

* **Character capsule in `COLPF2` gold** (the retired phased compositor, the
  original Rapid palette `outline COLPF1 / fill COLPF2 / symbol COLBK`,
  `entity-effects.json:95-99`): retired at `f6eee5c` for the 8-scanline jump
  and raster-visibility failures; glyphs 120-121 now hold the Light art; the
  compositor was ~400 B. Reopens an owner-rejected design.
* **`M0`+`M3` in normal missile mode for the capsule** (two colours `COLPM0`
  white and `COLPM3`, 4-pixel resolution at double width): the three
  silhouettes do not survive, the shield pulse recolours the capsule, and it is
  two colours, not one.
* **`P3` time-shared with the plume** (the plume blanked while a capsule is
  `ACTIVE`, ~15 B, +~10 cycles): moot — the plume is not visible (§1.4); 2b is
  the version of this idea that keeps a visible exhaust.
* **Taking `P1` or `P2`**: violates the Heavy-class invariant (2 Heavy members).

---

## 5. Recommendation

**There is no cheap option that leaves every other object as it is.** All five
PMG-side colour registers are owned in fighter space (§4.1), and the character
renderer has no register to spare. But §1.4 changes what the P3 options cost:
the amber engine plume the ship is documented to have **is not on screen
today**, so dedicating `P3` to the capsule takes nothing the player can see.

* **Recommended: Option 2 — the capsule on `P3`, `COLPM3` dedicated.** It
  *returns* cycles and bytes, removes the `PRIOR`/`SIZEM` toggling, keeps the
  two-DLI frame and the documented "no extra DLI for a local colour effect"
  rule, and gives the capsule its own register in every region for the rest of
  the project. Within it the owner chooses:
  * **2a** — no exhaust object (the ship looks exactly as it does today; the
    player explosion's outer mask takes the boost colour; any of the three
    candidate colours A/B/C); or
  * **2b** — the exhaust on `M3` in `OPEN`, `P3` in capital states, sharing the
    capsule's colour, which then must be the engine hue (`$2C` or `$28`): a
    **new** 4-clock × 4-row exhaust appears between the ship's legs, at
    ~17 cycles per `OPEN` frame (727 → ~710; 31,670 → ~31,687) and ~+40 B of
    `MAIN` from the 56-B slack — the tightest byte item here. The shield pulse
    cannot include the exhaust without also blinking the capsule.

  §5's order of preference: **2a with candidate A or C**, because it changes
  nothing on the ship and spends nothing; **2b** if the owner wants the exhaust
  the art direction promises, accepting that it is new, not preserved.
* **Fallback if the owner rejects any P3 change: Option 1, the `COLPF3` band.**
  ~195 cycles on capsule frames — the binding DMA-on frame **is** a pickup frame
  — taking the step-2 fence margin from 727 to about 615 (GO ≥ 500 still met;
  `WSYNC` edges would not be affordable), ~14 B of the 56-B `MAIN` slack,
  ~150 B of the `$AE00` window, an owner waiver of the art-direction DLI rule,
  and the band bleeding the boost colour onto any Light it passes.

If the owner rejects all of these, the least bad remaining choice is Option 4,
and it should be called what it is: enemies in the allied palette.

---

## 6. Implementation outline for a later session (Option 2; 2b and Option 1 deltas noted)

### 6.1 Steps

1. **Constant and flags.** `PICKUP_BOOST_COLOUR` beside
   `PLAYER_NORMAL_ENGINE_COLOR` (`src/main.s:547`), `.ifndef
   PICKUP_BOOST_COLOUR_OVERRIDE` like `GAMEPLAY_COLPF1_OVERRIDE` (`:535-539`);
   `scripts/build.mjs` gains `--pickup-colour=1C|AC|2C|28` on the
   `--allied-steel` pattern (`:137-138`, `:1526`, `:2724`, `:3986`) writing
   `build/pickup-colour-<hex>/`, never `dist/`; `package.json` scripts
   `pickup:colour:*`. For 2b, an assembly-time `PICKUP_EXHAUST_M3` flag with a
   `--pickup-exhaust=on|off` build flag on the same pattern (§6.3).
2. **Shape table.** Re-derive `fighter_pickup_pmg_shape` (`:11273-11310`) into
   plain player bit order from the pictures in its comments; keep the pictures,
   replace the interleaving note; add a test that the bytes equal the pictures.
3. **Renderer.** `render_fighter_pickup_pmg`: `sta PLAYER3,y`, one `HPOSP3`,
   no `SIZEM`/`PRIOR`; `clear_fighter_pickup_pmg`: zero `PLAYER3` rows;
   `release_fighter_pickup_pmg_hardware`: drop the `PRIOR`/`SIZEM` restore
   (`SIZEM = $54` set once at gameplay entry). `SIZEP3 = 0` at gameplay entry
   (`:2599-2600`) — for 2b, per state (§4.4).
4. **Player.** 2a: `draw_player`/`erase_player` (`:3784-3806`) write `P0` only,
   the `player_engine_shape` rows OR-ed into `player_shape` only if the owner
   wants a white interior (§7); drop every `sta HPOSP3` beside `sta HPOSP0`
   (`:2577-2578`, `:3767-3768`, `:4654-4655`, `:7908-7909`, `:9526-9527`).
   2b: the `OPEN`/capital branches of §4.4 instead, `HPOSM3 = player_x + 6` in
   `OPEN`. Both: `restore/update_shield_player_fighter_colors` (`:11227-11241`)
   write `COLPM0` only; `render_shared_fighter_explosions` (`:4635-4671`)
   unchanged (its P3 half now renders in the boost colour); verify the order of
   `clear_transient_effects` and `begin_player_fighter_explosion` (`:12795`).
5. **`COLPM3` (and `SIZEP3`) per sector.** Boost colour on entering `OPEN`;
   `$28` (or the same byte if hue 2) on entering a capital state (broadside
   `M3`); 2b also flips `SIZEP3` and moves the exhaust plane there. Simplest
   home: the sector-entry path that already calls `weapon_pickup_clear_sector`
   (`:10327`).
6. **Trace patch and gates.** `scripts/atari800-wall-trace.h`: `pickup_pmg_rows`
   and the union check read `PLAYER3` (2b: the missile column ignores bits 7-6);
   the contact clause expects `prior = $00`; the raster clause counts
   `palette[colpm3]`. Rerun `--prepare` after the header change (the emulator
   copy is `build/atari800-trace`).
7. **Docs.** `docs/art-direction.md` §Pickups and §Visual language (engine
   accent — say what is on screen); `docs/hardware-testing.md` §6;
   `docs/game-design.md:298` (stale "steel-blue/white capsule");
   `docs/how-to-play.md` **and** `docs/how-to-play.pl.md` if the colour is
   named to players (owner decision V: both or neither); `docs/memory-map.md` if
   any segment size moves; STATUS.
8. **Gates.** Focused tests + `tests/runtime-evidence-binding.test.mjs`; then
   `build:candidate` → `runtime:wall-trace --atari800-source=build/atari800-trace`
   → `build`; PAL audit and boot smoke; `npm test` on the **default** build.

Option 1 instead: steps 1, 7, 8 unchanged; replace 2-6 with the `VDSLST`-chained
`band_on`/`band_off` handlers and the DL-bit maintenance in the `$AE00` window,
the top-DLI hook in `MAIN`, a band-DLI trace column, the raster clause counting
the boost colour, and the art-direction rule amended with the owner's waiver.

### 6.2 Tests that are RED on today's build (to be written first)

1. *the capsule's colour byte is shared with no enemy* — reads the capsule's
   register value (`COLPM3` under Option 2; the band value under Option 1) and
   asserts it differs in **hue** from `HULL_COLOUR_RAIDER`, `BOMBER_HULL_HUE`,
   `ENEMY_PULSE_COLOR`, the enemy capital accent `$46` and the allied steel; today
   the byte is `$46`, the Wingman's own colour → RED.
2. *the capsule is one `P3` image* (Option 2) — `render_fighter_pickup_pmg`
   writes `PLAYER3`, never `MISSILES`/`PRIOR`; today RED.
3. *native contact frames show the capsule in the boost colour* — the
   `weapon-pickup-contact` sessions' raster clause counts `palette[boost]` in the
   derived window; today those pixels are `$46` → RED.
4. *no shield path writes `COLPM3`* (Option 2) — today both routines do → RED.
5. *no gameplay path but the capsule writes `PLAYER3` in `OPEN`* (2a: in every
   state; 2b: in `OPEN`) — today `draw_player` does → RED.
6. 2b only: *the exhaust is on `M3` in `OPEN` and on `P3` in capital states* —
   RED today.

### 6.3 Review candidate for the owner's hardware choice

Review builds from two flags, on the `bomber:hull:red` / `steel:88` precedent
(STATUS "Bomber hull colour — green"; no gate consults a variant, nothing
reaches `dist/`):

* `--pickup-colour=1C|AC|2C|28` — the four colour candidates (A, B, C, and
  today's engine byte for 2b);
* `--pickup-exhaust=on|off` — **cheap once 2b is implemented**: 2a is 2b with
  the `OPEN` branch drawing no `M3` rows, so one `.if PICKUP_EXHAUST_M3` around
  the exhaust stores and the `HPOSM3` write yields both looks from one source.
  It is *not* cheap the other way round: a session that implements only 2a
  cannot show 2b without writing §4.4's branches, which is the whole of 2b's
  code. The implementing session should therefore build 2b with the flag and
  let the owner switch the exhaust off, rather than build 2a and promise 2b.

Six ATRs cover the decision in one sitting: exhaust off × {`1C`, `AC`, `2C`}
and exhaust on × {`2C`, `28`} (the exhaust makes sense only in the engine hue),
plus today's build for reference. Each is a full XEX/ATR under
`build/pickup-colour-<hex>[-exhaust]/` with the same level data, so the owner
holds each colour against a Wingman, an Interceptor, a Bomber and a Raider on
real hardware.

---

## 7. Owner decisions

1. **The colour** — A gold `$1C`, B cyan `$AC`, C orange `$2C` (§3); under 2b
   the engine hue only: `$2C` or `$28` (§3 says which reads better against
   what). Decided at the hardware smoke of the review candidate. Until then the
   plan carries A for 2a and `$2C` for 2b.
2. **The option** — Option 2 (`P3`, recommended) or Option 1 (`COLPF3` band,
   the DLI rule waived, ~195 cycles on the binding frame).
3. **Under Option 2, the exhaust** — **2a**: no exhaust object (the ship as it
   is on screen today; optionally the P3 rows folded into the hull as white,
   which *adds* a white interior the ship never showed either), or **2b**: the
   exhaust on `M3` in `OPEN` in the shared engine/boost colour — a new visible
   4×4 exhaust between the legs, ~17 cycles per `OPEN` frame, ~+40 B of `MAIN`.
   Under 2b the shield pulse cannot include the exhaust without blinking the
   capsule; the plan removes the `COLPM3` flip in both variants.
4. **Under Option 1** — accept the band bleeding onto Lights and the torn
   scanline (no `WSYNC`), and amend the art-direction DLI rule.
5. **Player-facing wording** — whether `how-to-play` (EN and PL together)
   should name the boost colour.
6. **The art-direction sentence "warm engine accents"** — §1.4 shows it is not
   what the screen renders; the owner decides whether 2b makes it true or 2a
   retires it from the visual language.

---

## 8. What this document did not do, and discrepancies seen

No build or test was run; the free tails in §4.0 are the figures STATUS and the
memory map record, to be re-measured by the implementing session.

* `docs/how-to-play.md:58` says "Debris and pickup capsules appear everywhere",
  while the code shows a capsule only in `OPEN` fighter space (§1.1); the
  implementing session should settle that line in both languages.
* `docs/art-direction.md` §Visual language ("warm engine accents") and
  `tests/fighter-weapons.test.mjs:414` (`lda #$28 / sta COLPM3`) describe an
  engine colour that no gameplay pixel shows outside the player explosion
  (§1.4). This plan does not change them; §7 item 6 is where the owner does.
