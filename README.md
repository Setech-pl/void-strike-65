# VOID STRIKE 65

![VOID STRIKE 65 key art showing the player fighter between opposing capital ships](assets/graphics/void-strike-65-banner-03-retro-box-art.png)

**An original vertical space shooter for the Atari 65XE and Atari 8-bit family, written in 6502 assembly for PAL at 50 FPS.**

[Download XEX](dist/void-strike-65.xex) · [Download bootable ATR](dist/void-strike-65.atr) · [Documentation](docs/README.md)

VOID STRIKE 65 is a dark, military science-fiction shooter built for a stock
64 KB Atari 65XE. The same game is distributed as a self-contained XEX and a
bootable ATR disk image.

## Play on Windows

**The XEX is the easiest and recommended way to play.**

1. Download the game from [Releases](https://github.com/Setech-pl/void-strike-65/releases).
2. Download the latest stable [Altirra for Windows](https://www.virtualdub.org/altirra.html) (usually x86/x64).
3. Extract both ZIP archives: right-click each one and choose **Extract All**.
4. Open the extracted Altirra folder and run **Altirra64.exe**.
5. Drag **void-strike-65.xex** from the extracted game folder into Altirra. Wait for the loader, then select **START GAME**.

No release archive is published yet. For the current repository build, download
the [XEX](dist/void-strike-65.xex) using GitHub's **Download raw file** button.
See the [full Windows guide](docs/windows-quick-start.md) for controls, setup,
the archive alternative, and help if the game does not start.

## Current gameplay

- Move the Player Fighter across the expanded playfield and engage Hostile
  Interceptors and destructible debris with a single-button burst weapon.
- Progress through a deterministic Encounter Director driven by travelled
  world rows rather than wall-clock time.
- Fly alongside independently scrolling Allied and Hostile capital ships.
- Survive warning flashes and heavy `BROADSIDE` fire from both sides of the
  capital-ship corridor.
- Take projectile, debris, fighter-contact, and capital-hull damage through a
  shared HULL and LIFE system with respawn protection.
- Fight across a playfield extended to the final visible PAL scanline, with a
  fixed SCORE, LIFE, HULL, and BOOST display.
- Earn the Rapid Fire pickup through qualifying Interceptor kills and use its
  faster ten-shot bursts while its energy bar counts down.
- Use the current loader, main menu, options, TOP SCORES, pause, Game Over, and
  exit screens, with menu and gameplay audio.

## Screenshots

Gameplay and loader frames are unenhanced native captures from the current
packed XEX in Atari800 7.1.2 PAL/XL mode. The menu image is generated from the
current frontend source; Game Over is a native-scale frontend capture.
Click any image to open the full file.

| | |
| --- | --- |
| [<img src="docs/media/gameplay/01-title-loader.png" width="320" alt="VOID STRIKE 65 loader with capital-ship art and studio credit">](docs/media/gameplay/01-title-loader.png) | [<img src="docs/media/frontend/main-menu.png" width="320" alt="VOID STRIKE 65 main menu with START GAME selected">](docs/media/frontend/main-menu.png) |
| **Loader** | **Main menu** |
| [<img src="docs/media/gameplay/02-standard-combat.png" width="320" alt="Player fighter and starfield during normal gameplay">](docs/media/gameplay/02-standard-combat.png) | [<img src="docs/media/showcase/capital-ship-sector.png" width="320" alt="Player fighter between blue allied and purple enemy capital ships">](docs/media/showcase/capital-ship-sector.png) |
| **Normal gameplay** | **Capital-ship sector** |
| [<img src="docs/media/gameplay/06-rapid-fire-active.png" width="320" alt="Rapid Fire active with yellow shots and the BOOST energy display">](docs/media/gameplay/06-rapid-fire-active.png) | [<img src="docs/media/frontend/game-over.png" width="320" alt="VOID STRIKE 65 Game Over screen with final and top scores">](docs/media/frontend/game-over.png) |
| **Rapid Fire active** | **Game Over** |

Capture provenance and checksums for the packed-release gameplay frames are in
the [media manifest](docs/media/manifest.json).

## Boss direction

**Concept art / planned feature — not implemented.** A boss wider than the
screen will drift sideways, revealing sections of a layered structure. Destroy
its protective modules to expose weapons, then eliminate the last weapon module
to win.

[![Blockade Breaker concept art: worn armour plates shielding recessed guns; planned boss, not gameplay](docs/media/concepts/void-strike-65-boss-01-blockade-breaker.png)](docs/media/concepts/void-strike-65-boss-01-blockade-breaker.png)

See [all three boss concepts](docs/boss-concepts.md): Blockade Breaker,
Siege Spine, and Void Citadel. These detailed illustrations show the intended
art and mechanics, not final Atari sprites.

## Controls

The game reads joystick port 1 and its single fire button. It does not install
separate keyboard gameplay controls; in an emulator, use the keyboard mapping
configured for joystick port 1.

| Context | Control | Action |
| --- | --- | --- |
| Gameplay | Joystick | Move in four directions |
| Gameplay | FIRE | Fire; hold for weapon bursts |
| Gameplay | Atari `OPTION` console key | Open the pause menu |
| Menus | Up / Down | Move the selection |
| Options | Left / Right | Change a value |
| Menus | FIRE | Select, confirm, or return |
| Pause menu | `OPTION` | Resume immediately |

## Run

With Atari800 installed and available on `PATH`:

```bash
npm run play:xex
npm run play:atr
```

The launchers verify the selected artifact against the distribution manifest.
The ATR is mounted as the `D1:` disk image. It must not be passed to Atari800
with `-run`, which is the executable-file loader used for XEX files.

## Build

Requirements:

- Node.js 24 or newer and npm;
- macOS (Intel) or Windows;
- no system-wide cc65 installation—the pinned ca65/ld65 WebAssembly toolchain
  is installed with the project.

Install exactly the locked dependencies and build a candidate:

```bash
npm ci
npm run build:candidate
```

The resulting `void-strike-65.xex`, bootable `void-strike-65.atr`, boot
payload, and manifest are written to `dist/`. Generated intermediates are
written to `build/`. See the [documentation map](docs/README.md) for the
separate runtime-evidence and final-build workflow.

## Downloads

- [VOID STRIKE 65 — XEX (recommended)](dist/void-strike-65.xex)
- [VOID STRIKE 65 — bootable ATR](dist/void-strike-65.atr)

### Media status

The current XEX and ATR both run in Atari800; loader → menu → gameplay has been
smoke-tested. Physical ATR/SIO boot remains a separate hardware task: the fast
disk-access path must be repaired and then accepted on a stock Atari 65XE with
SIO2SD. Emulator success is necessary, but it is not presented as physical
hardware acceptance.

## Development status

VOID STRIKE 65 is actively developed.

### Implemented

- complete playable frontend and player lifecycle;
- player movement, combat, scoring, damage, audio, and difficulty settings;
- deterministic Level 1 Encounter Director;
- open-space and capital-ship sectors with `BROADSIDE` combat;
- destructible debris, compact Interceptor destruction effects, and bounded object pools;
- Rapid Fire, Spread Shot, and Shield boosters;
- XEX and bootable ATR packaging with automated format, memory, and PAL timing
  checks.

### Planned

- unify the Player Fighter's in-game appearance with the approved visual
  direction;
- bring six enemy types into the playable encounter roster;
- develop a three-module weapon structure and authored enemy formations;
- continue the presentation and balance pass for Spread Shot and Shield;
- add a modular defense platform;
- build a modular boss encounter.

Planned work has no announced release date and is not part of the current
downloadable build unless it also appears under **Implemented**.

## Project history

The project began on an Atari in 1990. Decades later, its surviving material
was recovered from 5¼-inch floppy disks and brought into a modern
cross-development workflow. The game is now being completed and extended with
AI-assisted engineering under the creator's direction, review, and playtesting.

## Technical highlights

- ca65/ld65 and documented NMOS 6502 instructions;
- ANTIC display lists, mixed character modes, and Player/Missile Graphics;
- explicit memory ownership within the Atari 65XE's 64 KB;
- a deterministic, world-row-driven Encounter Director with bounded pools;
- automated XEX/ATR validation, cold-RAM checks, and PAL cycle-budget evidence;
- a 50 FPS visible-frame path designed to remain deterministic and bounded.

Detailed architecture, memory ranges, gameplay rules, timing evidence, and
hardware checklists live under [`docs/`](docs/README.md).

## Credits and license

- **Copyright:** `(C) 2026 SETECH GAME STUDIO`
- **Creator, project owner, developer, and gameplay vision:** Marcin Krzetowski
- **AI-assisted engineering:** Codex, supporting implementation, testing,
  analysis, and documentation under owner direction.

This is a non-commercial hobby project. No repository license has been
declared; no additional permission or legal status should be inferred from
this README.
