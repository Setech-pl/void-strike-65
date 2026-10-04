# Graphics sources

Editable graphics definitions and owner references live here. Generated ca65
includes and review images belong in `build/`; runtime captures and their
provenance belong under `docs/media/`.

## Current runtime sources

- `loader-bitmap.json` describes the mixed ANTIC F/E loader. The converter
  rasterizes exactly 7,680 bytes, packs the current bitmap to 1,929 LZ-10/5
  bytes, and derives the preview from those same pixels.
- `capital-hulls.json` defines both 32x9 expanded hull maps, modular 240-row
  sector sequences, source turrets, broadside timing, hull contact boundaries,
  prow masks, capital explosions, and two engine phases (`dim` and `bright`).
  Each engine phase lasts eight active PAL frames.
- `starfield.json` defines the deterministic far and near layers, corridor
  bounds, glyph ownership, twinkle interval, and fixed seed.
- `fighter-weapons.json` defines the ten-slot Player Fighter and nine-slot Interceptor pools,
  projectile glyph phases, colours, burst cadence, collision envelopes, Rapid
  Fire, and the all-yellow three-projectile Spread Shot.
- `entity-effects.json` defines debris, transient fragments, the four physical
  interactive slots with active limit two, the six physical effect slots with
  active limit five, and the Rapid Fire and Spread Shot 2x2 capsule glyphs.
- `enemy-roster.json` inventories ten stable enemy identities and emits native
  PMG/descriptors for Interceptor, Talon, and Scythe. The release enables only Interceptor;
  Talon and Scythe remain review-only and use no runtime weapon.

- `boss-regions/region-N/` holds a regional boss as PNG drafts and
  `modules.json` (M5b-S4a-i, formatVersion 2): `band.png`, `cracked.png`,
  `broken.png`, `open.png` (256 x 64, one pixel per ANTIC 4 pixel, five fixed
  colours) and `extras.png` (68 x 8). `scripts/boss-assets.mjs` converts them
  into the region's charset, band and tables; `npm run boss:preview` renders
  them without building the game. The format is `docs/level-authoring.md`,
  "The boss". Region 1's drafts are **agent-drawn placeholders** (owner decision
  G; provenance in `THIRD_PARTY_NOTICES.md`), for the owner to retouch.

`scripts/*.mjs` validate these definitions and generate the includes consumed by
`src/main.s`. Generated Atari bytes must not be edited by hand.

## Owner references

- `loader.png` is the owner-authored composition reference for the capital-ship
  profile, title, three engine groups, and green `(C) 2026 SETECH GAME STUDIO`
  footer.
- `void-strike-65-screen-concept-v1.png` is the accepted gameplay composition and
  art-direction reference.
- `mainmenu.png` is the accepted menu composition reference; it is not copied or
  traced into runtime pixels.
- Enemy PNG files are design references. Their transparent or chroma-green
  pixels are removed only for review sheets; final Atari PMG masks are authored
  at native resolution.

The project is unofficial and non-commercial. Source references guide new
Atari-native art and are not shipped as runtime data.

## Preview contract

`npm run preview` rebuilds deterministic review images from the same generated
glyphs, maps, palettes, and positions as the runtime. A preview may add labels
outside the simulated Atari screen, but it must not use independent gameplay
coordinates or repaint runtime pixels.

The full-playfield ANTIC 2 prototype is rejected and excluded from XEX/ATR.
Its rationale is retained only in
[`docs/history/antic2-spike.md`](../../docs/history/antic2-spike.md).
