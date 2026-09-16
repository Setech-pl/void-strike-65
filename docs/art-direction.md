# Void Strike 65 art direction

Void Strike 65 is worn military science fiction rendered within stock Atari
65XE constraints. It is unofficial and non-commercial, and must not imply
official affiliation or endorsement.

## Visual language

- Space is black, with restrained star density and clear combat silhouettes.
- Allied machinery uses cold steel, pale highlights, dark seams, and warm
  engine accents.
- Hostile machinery uses dark metal, burgundy/red hull accents, and a distinct
  red weapon language.
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

## Gameplay palette ownership

The fixed HUD remains legible and visually separate from the ANTIC 4 gameplay
field. Stars, hulls, Player Fighter weapon pixels, Hostile weapon pixels, pickups, and
effects use existing playfield banks and PMG registers. A local object must not
change the global palette in a way that recolours other objects.

Player Fighter weapon colours are:

- normal projectile: yellow (`$1E`);
- Spread Shot centre, left, and right projectiles: the same yellow Player Fighter colour;
- Rapid Fire projectile: the established Player Fighter yellow/gold (`$1E`).

Hostile PairShot pulses remain red (`$46`) and retain their wider shape. Spread
Shot side projectiles must be identified by their symmetric fan geometry, not
by borrowing the Hostile weapon colour.

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
- **Interceptor (planned)** — Light renderer class, so a character enemy with no
  PMG player. Its silhouette is **not decided**. The blocked 2026-09-16
  experiment reused the Wingman glyph as a functional placeholder; that
  placeholder is not art direction and must not be promoted to one.

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
