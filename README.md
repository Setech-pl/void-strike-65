**English** · [Polski](README.pl.md)

# VOID STRIKE 65

**[▶ Play in your browser](https://setech-pl.github.io/setech-arcade/play/void-strike-65/)**

*Plays release v0.2.2, the version pinned on Setech Arcade, on the emulator's
built-in AltirraOS; best with a keyboard or a gamepad. The ATR for real
hardware and emulators is on the
[releases page](https://github.com/Setech-pl/void-strike-65/releases).*

![VOID STRIKE 65 key art showing the player fighter between opposing capital ships](assets/graphics/void-strike-65-banner-03-retro-box-art.png)

**An original vertical space shooter for the Atari 65XE and the Atari 8-bit
family, written in 6502 assembly and C for PAL at 50 frames per second.**

You fly one fighter through contested space, alone, against everything that is
already there. Open space, then the corridor between two capital ships that are
fighting each other — the one on your left is yours, and its fire kills you
too. Dark, worn, military science fiction on a stock 64 KB machine.

A non-commercial hobby project. Free.

[How to play](docs/how-to-play.md) · [Releases](https://github.com/Setech-pl/void-strike-65/releases) · [Documentation](docs/README.md)

<img src="docs/media/showcase/void-strike-65-level-1.gif" width="640" alt="Fourteen seconds of level 1 recorded from the ATR: the fighter picks up the Spread Shot capsule, fires three-shot fans, and flies into the corridor between the allied and the hostile capital ship">

*Level 1, recorded frame by frame from the disk image in Atari800 (PAL, 50 frames
per second): a Bomber and an Interceptor, the Spread Shot capsule and its
volley rhythm — the three-shot fan, then the single follow-up — and the capital
corridor with the first `BROADSIDE`. A deterministic scripted replay, so it is
regenerated after every game change rather than re-recorded by hand.*

<img src="docs/media/showcase/timing-history.svg" width="720" alt="Chart of the worst fence margin and the DMA-on maximum at each release and key merge, against the GO threshold of 500 cycles and the hard gate of 32,568 cycles">

*Every build is held to the PAL frame: the worst slack before the line-238
fence must stay above 500 cycles, and no traced frame may exceed 32,568
cycles with display DMA on. Each point is cited in
[timing-history.json](docs/media/timing-history.json).*

---

## Get it running

**The game ships as a bootable Atari disk image, `void-strike-65.atr`.** That
is the product: one file that boots on an emulator and on a real Atari 65XE
through an SIO2SD. There is no cartridge, and nothing has to be held down at
power-on.

1. **Get the disk image.** Released builds are on the
   [GitHub releases page](https://github.com/Setech-pl/void-strike-65/releases)
   (pre-releases for now; the newest is
   [v0.2.0](https://github.com/Setech-pl/void-strike-65/releases/tag/v0.2.0)).
   The build at the tip of this repository, including changes that are still
   being play-tested, is [`dist/void-strike-65.atr`](dist/void-strike-65.atr) —
   use GitHub's **Download raw file** button.
2. **In Atari800:** `atari800 -xl -pal void-strike-65.atr` — the 64 KB
   800XL / 65XE, the machine the game is made for. The disk boots with BASIC on
   or off, so `-nobasic` is optional. It also runs on a 130XE:
   `atari800 -xe -pal void-strike-65.atr` (the 130XE compatibility check).
3. **In Altirra:** set the hardware to **800XL** (or **65XE/130XE** with
   **64K** of memory) and the video standard to **PAL**, then
   **File → Boot Image** and pick the ATR.
4. **On real hardware:** copy it to your SIO2SD as D1: and power the Atari on,
   with or without BASIC.
5. Wait for the title loader and the main menu — about half a minute at real
   disk speed (an SIO2SD, a disk drive, or Atari800 with `-nopatch`), about
   eleven seconds in an emulator that accelerates disk access — then select
   **START GAME**.

The game reads **joystick port 1** and one fire button; **Space** pauses. On an
emulator, use the keyboard or gamepad mapping configured for port 1.

**[The rules of the game are in how-to-play](docs/how-to-play.md)** — enemies,
the capital run, the hull, difficulty, scoring, upgrades. This page only says
what the game is and how to start it.

Windows users who have never run an Atari emulator can follow the
[step-by-step Windows guide](docs/windows-quick-start.md).

<details>
<summary>Developer path: launching the ATR</summary>

The ATR is the only file the game ships as, and it is also what the automated
gates run against. With Atari800 on your `PATH`:

```bash
npm run play:atr
```

The launcher verifies the ATR against the distribution manifest and mounts it
as `D1:`. The disk image must not be passed to Atari800 with `-run`, which
falls through to SELF TEST.

</details>

---

## What works today

The game is playable and unfinished. This list is the build in `dist/`.

- **Frontend.** Title loader, main menu, options (sound, music, difficulty),
  TOP SCORES with ten live records held in RAM, pause, Game Over and exit
  screens, menu music and an optional gameplay music track.
- **The fighter.** Movement across a playfield that reaches the last visible
  PAL scanline, a single-button twin-shot weapon, a hull of ten units shown as
  four plate cells, three lives, a breakup animation and five seconds of
  respawn invulnerability.
- **Four enemy types**, and the roster is closed: Raider and Bomber as heavy
  ships on the hardware sprite planes, Wingman and Interceptor drawn in
  characters. They fire, they ram, they score, they break up.
- **The capital run.** An allied and a hostile capital ship scrolling
  independently, `BROADSIDE` fire from both sides with warning flashes,
  indestructible hulls and turrets to fly around.
- **Destructible debris**, scored whether you shoot it or ram it.
- **A deterministic Encounter Director** for level 1, driven by travelled world
  rows rather than wall-clock time, with bounded object pools.
- **Three timed boosters**, one at a time, from pickup capsules: Rapid Fire,
  Spread Shot and Shield, with a `BOOST` energy bar in the HUD.
- **Three difficulty settings**, scaling the damage you take and deal, contact
  damage and enemy rate of fire.
- **Packaging and gates.** The bootable ATR, built by one command, with
  automated format, memory-overlap, cold-RAM, boot-time and PAL cycle-budget
  checks.

## What is being built

Designed and decided, not in the build you can download.

- **A twelve-level campaign.** Level complete, next level, levels as data, and
  a level select that starts from the furthest level you reached — held in RAM
  only, so it is gone when the machine is switched off.
- **A boss at the end of every level.** One boss controller; each boss is a
  record describing module layout, gun placement and weak points, built from
  repeating modules. Its weapons reuse the existing enemy projectile classes,
  so twelve bosses do not mean twelve new projectile families. It also has a
  laser that cannot be dodged once fired — the gun heats visibly, with sound,
  for about two seconds first.
- **A permanent weapon booster.** Five levels. Each capsule raises the level by
  one; the level is signalled by the shape of your shots and by the firing
  sound, with no HUD element. Dying costs one level, not all of them.
- **Per-level capital ships.** Four sets of segment art, each varied by length,
  turret density and how far the gondolas protrude, so every level reads as a
  new region of space.
- **Data-driven waves and sectors.** Sector subtypes, path-driven waves, light
  fighter swarms, a starfield that changes per sector.
- **Between-levels disk loading** — a resident direct-SIO sector reader and a
  loader screen — and the 8 KB of RAM at `$A000-$BFFF` that the boot fix opened
  up to hold per-level data.
- **A level-summary screen** between levels: score, kills, accuracy, time,
  lives lost and a bonus, an S/A/B/C grade, and your best for the level, kept
  on the disk; the region's music plays while the next data loads.

Planned work has no announced date. Nothing above is in the downloadable build.

### Where the build stands

The ATR boots to the menu and into gameplay in Atari800 7.1.2 in PAL/XL mode,
across four cold-boot sessions covering two cold-RAM fills and BASIC enabled or
disabled.

**The disk now boots without holding OPTION.** That fix is committed and
gate-covered, and it is honestly an `OWNER-SMOKE CANDIDATE`: it changes the
boot contract and it is **proven in the emulator only.** It has not yet been
accepted on a stock 65XE through an SIO2SD, and neither has the guarantee that
the RAM window stays RAM across a RESET during play. The same applies to every
timing figure in this repository: all of it is emulator-measured. What that
leaves open, and what it would invalidate, is listed in the technical-debt
register in [project-overview.md](docs/project-overview.md) §7.4 — emulator
success is necessary here, and it is not presented as hardware acceptance.

---

## Screenshots

Gameplay and loader frames are unenhanced native captures of the packed game in
Atari800 7.1.2 PAL/XL mode. The menu image is generated from the current
frontend source; Game Over is a native-scale frontend capture. Click any image
to open the full file.

| | |
| --- | --- |
| [<img src="docs/media/gameplay/01-title-loader.png" width="320" alt="VOID STRIKE 65 loader with capital-ship art and studio credit">](docs/media/gameplay/01-title-loader.png) | [<img src="docs/media/frontend/main-menu.png" width="320" alt="VOID STRIKE 65 main menu with START GAME selected">](docs/media/frontend/main-menu.png) |
| **Loader** | **Main menu** |
| [<img src="docs/media/gameplay/02-standard-combat.png" width="320" alt="Player fighter and starfield during normal gameplay">](docs/media/gameplay/02-standard-combat.png) | [<img src="docs/media/showcase/capital-ship-sector.png" width="320" alt="Player fighter between blue allied and purple enemy capital ships">](docs/media/showcase/capital-ship-sector.png) |
| **Normal gameplay** | **The capital run** |
| [<img src="docs/media/gameplay/06-rapid-fire-active.png" width="320" alt="Rapid Fire active with yellow shots and the BOOST energy display">](docs/media/gameplay/06-rapid-fire-active.png) | [<img src="docs/media/frontend/game-over.png" width="320" alt="VOID STRIKE 65 Game Over screen with final and top scores">](docs/media/frontend/game-over.png) |
| **Rapid Fire active** | **Game Over** |

Capture provenance and checksums are in the
[media manifest](docs/media/manifest.json). The gallery, the GIF and the chart
are regenerated from the current build by `npm run showcase -- --capture`,
`npm run showcase:gif` and `npm run showcase:chart`.

## The bosses, as designed

**Concept art. Not implemented yet** — see "What is being built" above. These
illustrations show the intended shape and mechanics, not final Atari graphics: a
structure wider than the screen, drifting sideways to reveal its sections, with
protective modules to strip away before the weapons underneath can be reached.

All three are in [boss-concepts.md](docs/boss-concepts.md), with their concept
art: [Blockade Breaker](docs/media/concepts/void-strike-65-boss-01-blockade-breaker.png),
[Siege Spine](docs/media/concepts/void-strike-65-boss-02-siege-spine.png) and
[Void Citadel](docs/media/concepts/void-strike-65-boss-03-void-citadel.png).

---

## Build it yourself

Requirements:

- Node.js 24 or newer, and npm;
- macOS on Apple Silicon or Intel, or Windows;
- no system-wide cc65 installation — the pinned ca65/ld65 WebAssembly toolchain
  is installed with the project.

```bash
npm ci
npm run build:candidate
```

`void-strike-65.atr`, the boot payload and the build manifest are written to
`dist/`; intermediates go to `build/`. Never hand-edit
either directory.

`npm test` builds the default target and runs the suites. The suite carries a
small, named set of failures the owner has accepted as open, listed in
[recorded-test-failures.json](docs/recorded-test-failures.json) — a *new*
failure name is a regression signal, a recorded one is not.

Where to go next: the [documentation map](docs/README.md) for the precedence
order, [STATUS.md](docs/STATUS.md) for what is true right now, and
[project-overview.md](docs/project-overview.md) for the whole picture in one
document. [AGENTS.md](AGENTS.md) is the execution contract for anyone, human or
AI, working in this repository.
[making-of.md](docs/making-of.md) tells how the game is built: the roles, the
life of a task, the gates and the lessons, with every figure cited.

## Technical highlights

- ca65/ld65 and documented NMOS 6502 instructions only;
- a hybrid architecture: ca65 owns the hardware-critical kernel — VBI/DLI,
  ANTIC, Player/Missile Graphics, publication, hot collisions — while C/cc65
  owns gameplay decisions, archetypes, lifecycle and the Encounter Director;
- ANTIC display lists, mixed character modes and Player/Missile Graphics, with
  enemies deliberately split between sprite planes and the character renderer to
  get more ships on screen than four;
- explicit, measured memory ownership within 64 KB, down to the free byte count
  of individual segments;
- a deterministic, world-row-driven Encounter Director with bounded pools;
- a PAL frame-overrun gate that traces roughly seventy recorded replays,
  reconstructs the raster fence per frame and fails the build on a single
  distinct miss event;
- automated ATR format validation, cold-RAM fills and boot-time deadlines.

Architecture, memory ranges, gameplay rules, timing evidence and the hardware
checklist all live under [`docs/`](docs/README.md).

---

## Project history

The project began on an Atari in 1990. Decades later its surviving material was
recovered from 5¼-inch floppy disks and brought into a modern cross-development
workflow. The game is being completed and extended there — the same design,
finished on the machine it was written for.

## Credits and license

- **Copyright:** `(C) 2026 SETECH GAME STUDIO`
- **Creator, project owner, developer and gameplay vision:** Marcin Krzetowski
- **AI-assisted engineering — Claude (Anthropic):** the current work.
- **AI-assisted engineering — OpenAI Codex:** earlier work, including a
  share of the code that is still in the tree.

Both worked on implementation, testing, analysis and documentation under the
owner's direction, review and playtesting.

### License

- **Code** — `src/`, `scripts/`, `tests/`, `cfg/`, `Makefile` and the rest of the
  build tooling, plus the engineering documentation under `docs/`:
  [MIT](LICENSE).
- **Game assets and creative content** — `assets/` (graphics, character sets,
  sprites, the loader picture, music, sound and level data), the creative texts
  and the `docs/media/` images: [CC BY-NC-SA 4.0](LICENSE-ASSETS).
- **Names and marks** — "Void Strike 65", the Setech Game Studio name and the
  Setech Game Studio logo are **not** licensed under either. All rights
  reserved; a fork must carry its own name.
- **The released `.atr`** combines both, and as a whole is distributed under
  CC BY-NC-SA 4.0: free to share, play and pass on **non-commercially**, with
  attribution.
- **Third-party:** no third-party code is vendored here and none is in the
  `.atr`. The external tools (cc65, Atari800), the AI-generated concept images
  and the committed material whose origin is not recorded are listed in
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). See
  [LICENSE-ASSETS](LICENSE-ASSETS) for the full scope and for the three places
  that mix both licences.

This is a non-commercial hobby project, not affiliated with or endorsed by
Atari.
