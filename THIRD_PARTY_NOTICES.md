# Third-party notices

No third-party code is vendored in this repository, and the released
`void-strike-65.atr` contains only this project's own code and data. This file
lists everything else a reader should know about: the external tools the build
and the measurement harness use, committed material that was machine-generated,
and committed material whose origin the repository does not record.

The project licences are in [`LICENSE`](LICENSE) (MIT, code) and
[`LICENSE-ASSETS`](LICENSE-ASSETS) (CC BY-NC-SA 4.0, game content).

---

## In the released ATR

Nothing third-party.

- **cc65 runtime.** The C half of the game is compiled by cc65, but no cc65
  startup code, runtime helper or library is linked: `ld65` links only the
  project's own objects (`scripts/build.mjs`), and the build refuses C that
  would need the cc65 software stack (`src/hybrid/c-asm-abi.s`).
- **Atari OS ROM.** The loader displays its text with the machine's own ROM
  character set, read from `$E000` at runtime. No ROM bytes are contained in
  this repository or in the ATR. The game's own fonts
  (`assets/graphics/frontend-h31.json`, `assets/graphics/loader-bitmap.json`)
  are separate glyph definitions authored for this project.

## Build and measurement tools — used, not committed, not shipped

| Tool | Use | Licence | Where it lives |
| --- | --- | --- | --- |
| [`romdev-toolchain-cc65`](https://github.com/monteslu/romdev) 0.1.3 — cc65, ca65, ld65 and da65 compiled to WASM | assembler, C compiler and linker for every build | Zlib (`package-lock.json`, the package's `package.json`) | `node_modules/`, git-ignored; installed by `npm install` |
| [Atari800](https://atari800.github.io/) 7.1.2 | automated runtime measurement, wall trace and boot smoke | GPL-2.0-or-later (the source headers and `COPYING` of the fetched tree) | `build/atari800-trace/`, git-ignored |
| numpy, scipy, Pillow | the optional Python preview tools under `assets/music/preview/` and `assets/graphics/hull-drafts/` | their own licences | installed by the user; nothing in `npm run build` depends on them |

**How the measurement emulator is built.** `scripts/runtime-wall-trace.mjs
--prepare` copies `scripts/atari800-wall-trace.h` into a local Atari800 7.1.2
source tree as `src/voidstrike65_trace.h`, inserts one `#include` and one
observer call into `src/cpu.c` and a warm-start hook into `src/atari.c`, then
runs `configure` and `make`. `scripts/capacity-window-watch.mjs` and the
frame-profile tools do the same with `scripts/atari800-capacity-watch.h` and
`scripts/measure-frame-profile.h`. Those three headers are this project's own
code under MIT; they name Atari800's internal symbols but contain no Atari800
source. An emulator binary built this way is a combined work under the GPL. It
is used locally and is not distributed by this project; anyone who distributes
one takes on the GPL obligations for it.

**A system font in two draft sheets.** `assets/graphics/hull-drafts/final_set.py`
loads DejaVu Sans Bold from the host system to title its preview panels, so
`set-B-sheet.png` and `set-MASS-sheet.png` carry title lines rendered in that
font. The font file itself is not in the repository.

## Machine-generated images

These four committed images carry an embedded C2PA manifest signed by OpenAI
("OpenAI Media Service API", software agent `gpt-image`, digital source type
`trainedAlgorithmicMedia`). They are AI-generated concept and reference art:

| File | C2PA "created" date |
| --- | --- |
| `assets/graphics/void-strike-65-screen-concept-v1.png` | 2026-08-05 |
| `docs/media/concepts/void-strike-65-boss-01-blockade-breaker.png` | 2026-09-05 |
| `docs/media/concepts/void-strike-65-boss-02-siege-spine.png` | 2026-09-05 |
| `docs/media/concepts/void-strike-65-boss-03-void-citadel.png` | 2026-09-05 |

None of them is shipped in the ATR. They are distributed with the rest of the
game content under CC BY-NC-SA 4.0 to the extent that rights in them exist.

## Origin not recorded in the repository

The commit history, comments and documentation do not record how these
committed images were made. None of them is shipped in the ATR.

- `assets/graphics/` enemy design references: `Aegis Escort.png`,
  `Hostile Interceptor.png`, `Hydra Missile Carrier.png`, `Leech Drone.png`,
  `Nemesis Command Interceptor.png`, `Reaper Gunship.png`, `Scythe Bomber.png`,
  `Specter Scout.png`, `Stalker Hunter.png`, `Talon Interceptor.png`;
- `assets/graphics/void-strike-65-banner-03-retro-box-art.png`;
- `assets/graphics/mainmenu.png`;
- `docs/media/concepts/void-strike-65-concept-from-floppy-to-stars.jpg` and
  `docs/media/concepts/void-strike-65-concept-gauntlet-run.jpg`.

## References consulted, not copied

- The direct-SIO sector reader (`src/hybrid/sector-reader.s`) was implemented
  from the *Altirra Hardware Reference Manual*; no third-party SIO source was
  transcribed. Its citations are in `docs/diagnostics/sio-protocol-facts.md`.

Atari is a trademark of its owner. This is a non-commercial hobby project, not
affiliated with or endorsed by Atari.
