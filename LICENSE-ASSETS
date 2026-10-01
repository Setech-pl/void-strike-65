# Asset and creative-content licence

Copyright (c) 2026 Marcin Krzetowski (Setech Game Studio)

The game assets and creative content of Void Strike 65 are licensed under the

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
(CC BY-NC-SA 4.0)**

licence. Full legal text:
<https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode>
Human-readable summary: <https://creativecommons.org/licenses/by-nc-sa/4.0/>

In short: you may share and adapt this material for **non-commercial** purposes,
provided you give appropriate credit and license your adaptations under the same
terms.

The source code of this repository is **not** covered by this file. It is
licensed under the MIT licence in [`LICENSE`](LICENSE).

---

## What this licence covers

- `assets/**` — every editable art, music and sound-effect source: the graphics
  definitions (`loader-bitmap.json`, `capital-hulls.json`, `starfield.json`,
  `fighter-weapons.json`, `entity-effects.json`, `enemy-roster.json`,
  `frontend-h31.json`, `playfield.json` and any successor), which hold the
  character sets, sprites, fonts, hull maps and the loader picture; the music
  (`gameplay-theme.json`, `menu-theme.json`) and the boot-splash sound
  (`assets/audio/boot-splash.json`); the `.png` reference and concept images;
  the approved music recordings under `assets/music/v2-drafts/`; and the
  sketch and draft generators under `assets/music/preview/sketches/` and
  `assets/graphics/hull-drafts/`, which are the authored source of that music
  and those hulls;
- `assets/levels/**` — level and encounter content data;
- `docs/media/**` images — screenshots, captured runtime imagery, asset sheets,
  concept art and the showcase images;
- the splash and loader pictures, the main-menu artwork, and every piece of
  creative text presented to the player, wherever it physically resides — see
  "Mixed files" below;
- the music, sound-effect, graphics and level data, both the editable sources
  and the Atari bytes generated from them;
- the built `void-strike-65.atr` as a whole — see "Mixed files" below.

## What this licence does not cover

- **Source code and build tooling** — `src/`, `scripts/`, `tests/`, `cfg/`,
  `Makefile`, `package.json`, `package-lock.json`, the reference renderer and
  synth under `assets/music/preview/` (`render.py`, `pokey_synth.py`) and the
  rest of the build system: MIT, see [`LICENSE`](LICENSE).
- **Engineering documentation** — `docs/**` other than the `docs/media/**`
  images (architecture, status, memory map, decisions, diagnostics, `.mmd`
  diagrams, the evidence `.json` files and `docs/media/manifest.json`), the
  `README.md` files under `assets/` and `levels/`, `AGENTS.md`, `CLAUDE.md`
  and `.agents/`: MIT, so that a fork may adapt the build and porting notes
  freely.
- **Names and marks.** The name **"Void Strike 65"**, the name **"Setech Game
  Studio"**, and the Setech Game Studio logo are **not** licensed under either
  the MIT licence or CC BY-NC-SA 4.0. **All rights reserved.** Neither licence
  grants permission to use them to name, brand or endorse a derived work; a fork
  must carry its own name and marks. Factual, nominative references ("based on
  Void Strike 65") remain permitted.

## Mixed files

Three places in the tree mix the two licences. In every case the rule is the
same: **the licence follows the substance, not the file extension.**

1. **In-game text inside code — and where creative text must live instead.**
   Owner decision 2026-09-21 draws the line at authorship, not at location:

   - **Functional interface strings stay MIT.** The frontend and HUD labels in
     `src/main.s` (for example the main-menu labels `START GAME`, `OPTIONS`,
     `TOP SCORES`, `EXIT`) are interface vocabulary, not creative content. They
     are part of the code and carry the MIT licence with it.
   - **Creative text is an asset and must live under `assets/`.** Anything
     written as prose rather than as a control label — the loader lines of
     decision O (the fighter's on-board AI, 8-16 short English lines, still to
     be written), story text, briefings, end-screen scroll text — is creative
     content under CC BY-NC-SA 4.0. It must be authored in a source file under
     `assets/` and converted into Atari bytes by a script, the same way art and
     music are, so that the licence follows the file rather than depending on a
     note in this document. Creative text must not be typed straight into
     `src/main.s` as `.byte` literals.
2. **Asset data inside code and tests.** Converters under `scripts/` and
   expectations under `tests/` embed fragments of asset data (glyph rows,
   palettes, hull maps) to validate the conversion, and `src/main.s` still
   carries some glyph and sprite tables typed directly as `.byte` rows. The
   surrounding code is MIT; the embedded graphics data remains under
   CC BY-NC-SA 4.0.
3. **The released ATR.** `dist/void-strike-65.atr` — the only distributed
   build (owner decision, 2026-09-30) — is a **combined work**: MIT code linked
   together with CC BY-NC-SA assets. As a whole it is distributed under
   **CC BY-NC-SA 4.0**: share it non-commercially, with attribution, and under
   the same terms. It is free to share, play and pass on to other Atari users on
   that basis. The MIT code inside it stays available under MIT from this
   repository's source.

## Third-party

No third-party code is vendored here, and the ATR carries only this project's
own code and data. External tools, machine-generated images and committed
material whose origin is not recorded are listed in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md); third-party material keeps
its own licence.

This project is a non-commercial hobby work, not affiliated with or endorsed by
Atari.
