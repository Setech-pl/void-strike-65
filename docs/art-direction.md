# Void Strike 65 art direction

Void Strike 65 is worn military science fiction rendered within stock Atari
65XE constraints. It is unofficial and non-commercial, and must not imply
official affiliation or endorsement.

## Visual language

- Space is black, with restrained star density and clear combat silhouettes.
- Allied machinery uses cold steel, pale highlights, dark seams, and warm
  engine accents.
- Hostile machinery uses dark metal and burgundy/red hull accents. Hostile
  weapon visuals belong to the weapon class, not to the hull colour (owner
  decision 19).
- Damage uses short, local flashes and fragments; it must not repaint the global
  palette or obscure the HUD.
- Pixel shapes favor readable mass, panel rhythm, and negative space over tiny
  lettering or decorative noise.

The loader preserves the owner-approved capital-ship profile, three engine
groups, title, and studio footer. It uses mixed ANTIC F/E with two
palette-zone DLIs. Gameplay does not add another DLI or PMG multiplexing merely
for a local colour effect.

The production frontend follows the accepted H3.1 Showcase Tactical Lite
system. `VOID STRIKE 65`, section headings, and score values use amber `$1E`;
ordinary data uses white `$0E`; structural accents use steel `$84`; active
actions use green `$D8`; and the Game Over alert replaces steel with `$46`.
No screen uses a fifth foreground colour. The custom angular font and 3x2 menu
Player Fighter share one `$4800` charset and remain readable at native Atari scale.

### Main-menu background stars (owner decision A', 2026-09-23)

The MAIN MENU sits in front of a sky of sixteen small single dots. Sixteen and
not the thirty-odd the mockup drew: the sky is paid for in packed bytes of the
boot transport, and sixteen is the largest one that fits the single boot sector
the owner spent on it (`diagnostics/menu-stars-alternative-a-boot-sectors.md`).
It is a thin sky on purpose. OPTIONS,
TOP SCORES, GAME OVER and PAUSE have none: the menu is the one screen the player
looks at with nothing happening, so it is the one screen that earns the motion.
The layout is otherwise untouched - same title, same items, same blue bars with
the small fighter, same hint line.

The dots fill the empty areas only: above the title, both sides of the bars and
the fighter, the band between EXIT and the hint line, and below the hint. Every
star keeps at least one empty character cell from any text, bar or fighter cell,
measured in the display grid rather than in screen RAM, because the menu is a
mixed-mode display list whose rows are not laid out in display order.

Two tones, both already in the list above: white `$0E` for ten of them and
structural steel `$84` for six, so roughly 60/40. Five twinkle on a twelve-step
cycle - bright, dim, off, dim, bright - each with its own phase offset, so the
sky never blinks in unison. The remaining eleven are steady.

The first owner smoke (2026-09-23) accepted the sky and rejected the speed: one
step per frame made a whole twinkle 0.24 s, which read as a flicker. A step now
holds for four frames, so the cycle is 48 frames - bright 24, dim 16, off 8 -
and lands a little under a second. The shape and the per-star phase spread are
unchanged; only the clock is slower.

**The dim step is steel, not a dim white, and only white stars twinkle.** The
menu already spends all four playfield registers (`$0E` white, `$1E` amber title,
`$84` steel, green active option) and the rule above stands: no fifth foreground
colour, and no second DLI for a local colour effect. So a twinkling star's dim
step is the menu's own steel, which is luminance 4 against white's 14 and reads
as a star fading rather than as a star changing hue. Steel stars have nothing
dimmer to fade to, so they are the steady ones. This is a deliberate compromise,
not an oversight; `tests/menu-stars.test.mjs` pins it.

Positions, tones, shapes and phases are chosen once at build time from the seed
in `assets/graphics/frontend-h31.json`, so the sky is the same on every boot and
reproducible from Git. It is never re-randomised per boot.

## Gameplay palette ownership

The fixed HUD remains legible and visually separate from the ANTIC 4 gameplay
field. Stars, hulls, Player Fighter weapon pixels, Hostile weapon pixels, pickups, and
effects use existing playfield banks and PMG registers. A local object must not
change the global palette in a way that recolours other objects.

Player Fighter weapon colours are:

- normal projectile: yellow (`$1E`);
- Spread Shot centre, left, and right projectiles: the same yellow Player Fighter colour;
- Rapid Fire projectile: the established Player Fighter yellow/gold (`$1E`).

**`COLPF2` is shared, so Player Fighter weapon colour is fixed at `$1E`**
(owner decision U, 2026-09-20). In the gameplay field `COLPF2` is the register
for pixel value `%11` in a positive screen code, and three live objects besides
player projectiles render in it: the debris-destruction effect in its yellow
flicker phase, the allied capital-hull glyphs `allied_service`,
`allied_turret_housing` and `allied_turret_muzzle`, and the capital explosion
core in its `pf2`-banked cells. The declared-but-unemitted allied capital shell
would be a fourth. Recolouring `COLPF2` for a local effect therefore repaints
other objects, which the rule above forbids. Consequently the **permanent
booster level (decision N) is signalled by shape and sound, never by colour**:
a thicker or doubled bolt per level out of the player projectile glyph bank,
and a different firing sound per level. Shape reads when the player watches his
shot and sound when he does not, so both are kept; neither is redundant.

Hostile projectile colour and shape are properties of the EnemyArchetype
`weapon_class`, independent of the emitter's hull colour (owner decision 19,
`OWNER-SMOKE CANDIDATE` roadmap 4.4c). Each class is one authored one-cell
glyph in `assets/graphics/fighter-weapons.json` (`hostileWeaponVisuals`) drawn
only in white `COLPF0` and steel `COLPF1`, never pixel value `%11`, so neither
the player's yellow nor the hull red appears in hostile fire and the global
palette is untouched:

- `PULSE` (Raider, Light Wingman): white/steel tracer pulse — the accepted
  two-pulse 2-HPOS footprint, each pulse a steel tail above a white leading row;
- `LASER` (Interceptor): a single thin 1-HPOS bolt, steel trail and white head;
- `BOMBER` (Bomber, roadmap 4.5b candidate): a heavy shell, steel caps above
  and below a white five-row core, 2 HPOS wide; it falls at half the speed of
  the other classes.

Spread Shot side projectiles must be identified by their symmetric fan geometry,
not by borrowing a Hostile weapon look.

## Capital ships and engines

Both capital hulls must remain continuous through prow, forward modules, combat
modules, aft modules, and engines. Overlays may not leave blank segments,
vertical lines, stale glyphs, or wrap artifacts.

The accepted gameplay set keeps the existing PMG and character footprints: the
Player Fighter reads as a narrow top-down fighter, the Heavy Raider is a
monochrome double-width PMG body with a crescent silhouette and a single hostile
colour, and capital armour uses the fixed glyph range 59-89. H4.1 debris remains two characters by eight scanlines in glyphs
110-117, with four asymmetric white/steel silhouettes. Fighter and capital
explosions retain exactly six phases and their existing timing.

The accepted H4.2 C INDUSTRIAL capital set keeps CLEAN's stable mass plates but
adds bounded construction detail: horizontal allied ribs, service seams and
hatches, plus deeper enemy channels and apertures. Detail must form connected
ship structure across neighbouring glyphs; checkerboards, dithering, and
singleton surface noise remain prohibited.

Engine banks have exactly two phases: `dim` and `bright`. Each phase lasts eight
active PAL frames, producing a 16-frame loop. The phases change only the engine
pixels while preserving the established hull silhouette and backing behavior.

## Enemy visual roles

- **Heavy Raider** — monochrome PMG body on `P1`/`P2`, double-width, one hostile
  colour, no second overlaid colour layer.
- **Light Wingman** — small 2x1 character enemy in the gameplay charset, glyphs
  120-121, installed at runtime in colour 3 with the hostile bit. It allocates
  no PMG player.
- **Interceptor** (`OWNER-SMOKE CANDIDATE`, roadmap 4.4b visual identity) —
  Light renderer class, so a character enemy with no PMG player, sharing glyphs
  120-121 with the Wingman; `light_update` installs the art of the selected
  archetype. It is an X/quad silhouette in three colours of the same hostile
  cells: steel `COLPF1` arms, red `COLPF3` corner rotor pods and a white
  `COLPF0` hub. The Wingman stays a one-colour red swept wing,
  so the two read apart by silhouette and by colour mass. Since roadmap 4.4c
  the Interceptor fires the thin `LASER` bolt and the Wingman the `PULSE`
  tracer (see the weapon colours above).

## Pickups

The accepted fighter-sector pickup is a **solid 16-scanline fifth-player PMG
mark**: missiles `M0-M3` in fifth-player mode, `PRIOR=$10`, drawn in `COLPF3`.
It is one solid shape, not a phased character capsule and not a per-type glyph.

Exactly one footprint may be visible for each active logical slot; the image
must not hold for several frames and then jump by eight scanlines.

Because the mark is a single PMG colour, pickup **type** is communicated by
**silhouette**, not by casing colour or a letter symbol: Rapid Fire is a capsule
with a vertical slot, Spread Shot a boxier casing carrying a three-shot fan, and
Shield a crest tapering to a point. These are the original capsule shapes from
`assets/graphics/entity-effects.json` reduced to one bit per colour clock; the
original also distinguished types by colour, which a fifth-player mark cannot
reproduce. Booster HUD state must make the active booster unambiguous, and the
Shield BOOST bar and its solid steel/white Player Fighter pulse must stay
distinguishable from both weapon boosters and respawn blinking.

When the P0/P3 Player Fighter overlaps the mark, set hull or engine bits remain
in the foreground. Zero bits in the Player Fighter PMG masks are transparent and
must leave the mark visible; a restored black playfield rectangle or a clipped
edge is never an acceptable substitute for pixel-level overlap.

Visual review covers empty space, both hulls, module boundaries, prow, engine
banks, and display-list wrap.

## Motion and effects

Spread Shot begins as a compact Player Fighter salvo and opens into an immediately
readable medium-width, symmetric fan. Side shots move smoothly by equal and
opposite horizontal increments while all three continue upward at the normal
weapon speed. Normal and Spread use the normal eight-event burst envelope;
Rapid uses a longer ten-shot burst as well as its faster in-burst cadence.

Breakups are brief and local. Debris uses two shapes and two tumble phases;
Raider breakup preserves the recognizable wings, central body, and red eye.
Transient effects are erased in reverse layer order and may not damage hulls,
stars, HUD characters, or the gameplay charset.

Editable declarative sources under `assets/graphics/` remain authoritative for
generated Atari art. Runtime captures are unenhanced emulator output and must
never be replaced by concept art or a hand-corrected mockup.
