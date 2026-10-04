# Hardware acceptance checklist

**Scope: milestones and releases.** This is the broad Atari800 and real-hardware
pass run before a milestone or release, not a per-feature gate.

Routine owner smoke for one feature is driven by that feature's report and
`STATUS.md` — it names the ATR, its SHA-256, what changed and what to look at.
A feature smoke does **not** require running this whole checklist.

Test the packed artifact from `dist/`: the bootable `void-strike-65.atr`, the
only medium the game ships on (owner decision, 2026-09-30). Do not substitute a
debug build or a preview model. Record emulator/hardware version, medium, joystick, display connection,
and any failure with a photo or capture plus reproduction steps.

Verify the artifact identity against the accepted checkpoint in
[STATUS.md](STATUS.md) before testing:

```bash
npm run build:candidate -- --quiet
shasum -a 256 dist/void-strike-65.atr
```

---

## 1. Cold start

- [ ] ATR boots from sector 1 on a cold start from power-on, not from a warm
      reset.
- [ ] **ATR boots to the menu with BASIC enabled, without holding OPTION**, and
      with BASIC disabled.
- [ ] No BASIC dependency; no OS call failure after takeover.
- [ ] RESET after the game is running does not bring the BASIC ROM back.
- [ ] Loader screen appears and completes without a visible stall or garbage.

> The "no BASIC dependency" line above was **wrong until owner decision A
> (2026-09-20)**. The boot code ended in `rts` and relied on OS coldstart
> jumping through `DOSVEC`, which it only does when no cartridge is enabled:
> with BASIC enabled the OS started BASIC and the disk never ran, so the ATR
> *did* depend on the player holding OPTION. Since that decision `boot_entry`
> jumps to `start` itself and `disable_basic_rom` unmaps the ROM, so the line
> is now true — and the two new boxes above are how it is kept true. The
> emulator half is gated by `npm run boot:smoke` (four cold ATR sessions: cold
> RAM fill `$A5` and `$5A`, BASIC on and off).

## 2. Frontend

- [ ] Main menu renders; palette and HUD glyphs are correct.
- [ ] Options open, change and apply; Back returns to the menu.
- [ ] Difficulty selection is honoured by gameplay.
- [ ] Start enters gameplay cleanly from both menu and options.
- [ ] Pause and Game Over behave, and a new game resets score correctly.

## 3. Player Fighter

- [ ] Moves on both axes within the corridor bounds; no HPOS wrap.
- [ ] Fires Normal, and Rapid/Spread/Shield once collected.
- [ ] Bursts show the production visible-impulse counts (8 / 8 / 10).
- [ ] Hull damage, LIFE loss, respawn and invulnerability all read correctly.

## 4. Heavy Raiders

- [ ] Two Raiders on `P1`/`P2`, independent motion, no synchronized flight.
- [ ] Opening vertical crossing occurs; both leave before the capital sector.
- [ ] Hostile PairShot bursts fire with the difficulty cadence.
- [ ] Contact damage, destruction, score and the destruction flash are correct.
- [ ] Top clipping holds: a fully hidden Raider neither fires nor collides.

## 5. Light Wingman M1

- [ ] Exactly one Light Wingman per Raider formation.
- [ ] **No flicker** anywhere on screen — this was the accepted fix.
- [ ] It stays centred behind Heavy slot 0 and never switches sides.
- [ ] Its 8-line vertical stepping relative to the leader is present and is the
      **accepted** behaviour, not a defect.
- [ ] One player PairShot or contact destroys it and scores it.
- [ ] Losing its leader makes it fly straight down and leave.

## 6. Pickup and boosters

- [ ] The fighter-sector pickup is a **solid** `PLAYER3` PMG mark (one HPOS,
      `SIZEP3 = 0`, `COLPM3`, `PRIOR=$00`) — no holes, no character capsule.
- [ ] **Its colour is the boost colour — gold `$1C`, accepted at the
      2026-09-29 smoke — and belongs to nothing else on screen.**
      Hold it against a Wingman's wing and an Interceptor's rotor pods (the
      enemy accent `COLPF3`), against a Raider and a Bomber hull (`COLPM1/2`),
      against the player's own yellow shots and against a star. It must not
      read as any of them.
- [ ] It is admitted deterministically and **stays visible for its whole
      descent** — this regressed silently for many releases, so check the top
      of the descent, not only the bottom.
- [ ] Collecting it applies Rapid Fire, Spread Shot or Shield correctly.
- [ ] Booster HUD state matches the active booster.

## 7. Capital transition

- [ ] An ACTIVE pickup is removed before the capital sector.
- [ ] The Light is fully unpublished before the sector changes; no residue.
- [ ] `M1-M3` resume broadside warning/impact ownership in the capital sector,
      and `COLPM3` goes back to the warm `$28` they and the player explosion
      wear there — the boost colour must not follow into a capital sector.
- [ ] Leaving the capital sector, no broadside warning mark is left behind in
      open space.
- [ ] Broadside traversal and the return to fighter combat both complete.

## 8. Debris

- [ ] Debris enters from above its first legal row, not inside the playfield.
- [ ] It takes three hits, deals the difficulty-correct hull damage and awards
      no score.
- [ ] Known open defect: debris may appear inside the visible playfield and may
      flicker. Record whether it reproduced; it does not by itself fail a
      release unless it worsened.

## 9. Raster and PMG correctness

- [ ] No tearing, rolling or DLI artifacts at the HUD/playfield boundary.
- [ ] Starfield advances one scanline per frame without stutter.
- [ ] No missed frames or audible frame-rate irregularity under heavy combat.
- [ ] Known open defect: intermittent purple artifact after a Raider. Record
      whether it reproduced.

## 10. Real hardware

- [ ] Runs on a stock 65XE PAL with 64 KB from SIO2SD.
- [ ] **Owner decision A is unproven on hardware until this passes:** the ATR
      boots to the menu from SIO2SD on a machine with BASIC enabled, with
      nothing held on the keyboard, and again with OPTION held. Only the
      emulator half of that change has been measured.
- [ ] Behaviour matches Atari800; note every divergence — emulator success is
      necessary but not sufficient.
- [ ] Load time is acceptable and the loader survives a marginal SIO cable.
- [ ] A full session runs without lockup, memory corruption or audio breakdown.

## 11. The direct-SIO sector reader (roadmap 4.3)

**Everything in this section is unproven outside the emulator, and the
emulator cannot speak to most of it.** Atari800 models no drive latency, no
jitter, no bit errors and **no command-line hold at all**. The reader is built
from the Altirra Hardware Reference Manual's specification — see
[diagnostics/sio-protocol-facts.md](diagnostics/sio-protocol-facts.md) for each
fact and its citation — so the first real drive is the first real test.

Run from SIO2SD with the ATR, cold boot each time.

- [ ] **START GAME reads level 1.** Since M5a-S2 the loader screen is the
      level-summary screen (§12): `ENGAGING ENEMY SECTOR` alone while the
      summary module loads (first START GAME of a session only), then the
      summary with a stepping dotted row while the art, the record and the
      level load.
- [ ] **START GAME a second time** (play, quit to the menu, START again): the
      buffer already holds level 1, so the resident skip must fire and **no
      command frame goes out**. If the loader screen dwells the same as the
      first time, the skip is not working.
- [ ] **The way out.** Power the SIO2SD off, then START GAME. Expect
      `DISK READ FAILED` / `NO DRIVE` within a couple of seconds, then FIRE
      returning to the main menu with difficulty and scores intact. **A hang
      here is the most important defect this checklist can find.**
- [ ] Power the drive off *during* a read, if you can time it: the reader must
      still reach the failure screen rather than wait forever.
- [ ] A disk with no level image at sector 320 — or a stale ATR — must give
      `WRONG DISK` and return to the menu, not load garbage.
- [ ] No audible click, buzz or tone during the read. The reader drives POKEY
      channels 3+4 as the serial clock at volume 0; anything audible means
      `AUDC3`/`AUDC4` are wrong.
- [ ] The first gameplay frame after the loader screen is clean — no flicker,
      no stale row, no wrong palette. `start_gameplay` rebuilds display list,
      charset, PMG, palette and `NMIEN` from scratch and that seam is new.
- [ ] Note the wall-clock time of the read. The emulator measures 7 PAL frames
      for 2 sectors and that figure is **not** a hardware estimate; SIO2SD is
      expected to be slower and a real 1050 slower still.

Unverifiable anywhere but here, carried under owner decision R:

- [ ] Both command-line hold windows (750-1600 µs before the frame,
      650-950 µs after). Deterministic by construction — 16 and 12 `WSYNC`
      stores — and checked by nothing.
- [ ] Asynchronous receive against a real drive's clock recovery (`SKCTL $33`).
- [ ] Real ACK and COMPLETE latency and jitter.
- [ ] Back-to-back COMPLETE→data on a real 1050, XF551 or SIO2SD.
- [ ] Any real bit error, and therefore the wire-retry path in anger. It has
      never run outside the 6502 harness.
- [ ] That a stock 65XE's POKEY latches `IRQST` exactly as the manual
      describes with `I` set. The whole polled design rests on this.

## 12. The level-summary screen (M5a-S2)

Plan §4.8 (decisions 26–28, answers Q13–Q17). **Use a COPY of the ATR on the
SIO2SD and a COPY of the floppy in the CA drive**: from this build on the game
writes its save record (sector 599) to the disk it booted from. A stopwatch
for the load times. Emulator figures, for comparison only (EMULATOR, Atari800
models the wire and nothing else): START GAME → summary on screen 47 frames
(0.9 s, the module's one read per session); every read done 79 frames later;
PRESS FIRE at 150 frames (3.0 s); the level-end summary appears 2 frames after
the exit.

- [ ] **The copy is this build.** Its SHA-256 starts `cbbafe93`
      (`STATUS.md` has it in full). In the emulator, `npm run play:atr` now
      mounts `build/play/void-strike-65.atr`, a copy it keeps between launches
      and replaces when `dist/` changes, never `dist/` itself.
- [ ] **Boot with BASIC enabled** (no OPTION held) and once with BASIC off;
      both reach the menu, and the first START GAME shows the summary.
- [ ] **START GAME (Q17; changed after the owner review, ATR `cbbafe93`).** The
      first START GAME after power-on: `ENGAGING ENEMY SECTOR` **alone** for
      about a second, then the picture and the panel fill in around it — the
      line itself must not move, blink or change brightness, and no dotted
      row or `VOID STRIKE 65` shows before it. Every START GAME: the top line
      reads `ENGAGING ENEMY SECTOR` (no level number until M4), the labels with
      **no values**, `BEST --` on a fresh copy; the corridor picture and one AI
      line appear about half a second later (1050: about a second) — the AI line
      **under the panel, after BEST**, above the dotted row; `LOADING`, then
      `PRESS FIRE` no earlier than 3 seconds. FIRE held from the menu must not
      skip it; release, then press. Stopwatch: START GAME → summary, and
      summary → `PRESS FIRE`.
- [ ] **The level-end summary is as before** (`LEVEL 01` on top, the AI line
      under it).
- [ ] **The disk-failure screen** (pull the floppy at START GAME, or an image
      without the level): its text is now the summary's brightness, a little
      dimmer than before; it still reads `DISK READ FAILED`, the reason and
      `PRESS FIRE`.
- [ ] **The level's end.** Play level 1 to its end (about 2:45 on MEDIUM). About
      a second after the screen clears the summary appears with **every value
      already on the first frame**: score (a leading 0 and four digits), kills,
      accuracy with `%`, time `m:ss`, lives lost, bonus `00000` (M8 sets the
      bonus values), the grade letter. Labels and the picture follow.
- [ ] **The music** of the level keeps playing through the summary, the art
      read and the record write, with no stall, no squeal and no buzz. (By ear
      only: the emulator's audio is not captured.)
- [ ] **The 3-second minimum and FIRE** at the level's end, as at START GAME;
      FIRE then returns to the main menu (until M4) and the score is in TOP
      SCORES.
- [ ] **The personal best survives a power cycle.** After the level's end,
      switch the machine off, boot the same copy again, START GAME: `BEST`
      shows the grade and score just earned.
- [ ] **A write-protected floppy** (the CA drive's copy with its notch covered)
      or a read-only SIO2SD image: the level's end shows `BEST` from memory,
      no error screen, no hang, FIRE returns to the menu; the disk is unchanged.
- [ ] **The range `$0500-$0BFF` holds on the machine.** The summary works at
      START GAME and at the level's end **after several games and a GAME
      OVER** in one power-on session. The module lives in RAM the emulator
      measured untouched by the game (`$0700-$0BFF`,
      [diagnostics/low-ram-0700-1fff-2026-10-03.md](diagnostics/low-ram-0700-1fff-2026-10-03.md));
      a corrupted screen, a crash or a wrong value after a GAME OVER would mean
      the hardware uses it.
- [ ] **The real drive's transition time** (decides the optional fast loader,
      plan §8 S6): the level's end, summary on screen → `PRESS FIRE`, and START
      GAME on a second game of the session, by stopwatch.

Unverifiable anywhere but here: the write's 12-ms pause after the command ACK
(HRM ch.9 p.218: 10–18 ms), a real drive's data-frame ACK and COMPLETE timing
for a write, and how the owner's CA drive refuses a protected disk (HRM ch.10:
the 1050 answers ERROR after the data frame; others may NAK the command — the
reader treats both as "skip silently").

## 13. The boss (M5b-S3)

Plan §5.1–5.3, §5.6, §5.11 (decisions 9 and 32, answers Q1, Q-S1–Q-S6). **On
copies**, as §12. Two disks: the default ATR (a full level 1 to its boss, about
2:45 on MEDIUM, then the fight) and the debug-route ATR that starts in the boss
sector (`build/level-1-s4/void-strike-65.atr`). Emulator figures, for comparison
only (EMULATOR): the boss entry reads 28 sectors in about 108 frames (2.2 s);
the bot's fights took 52–57 s.

- [ ] **The entry (decision 32).** At the end of sector 4 the screen clears to
      `WARNING` over `BOSS APPROACHING`, centred, the dotted row stepping under
      them; the boss theme starts within about a quarter of a second and plays
      through the rest of the load into the fight, no stall, no squeal.
      Stopwatch: the screen clearing → the band on screen (SIO2SD and CA drive).
- [ ] **The sector.** The world scroll has stopped: ring and stars hold still;
      the HUD reads as before. The band sits under the divider, eight rows,
      in its own colours; the colour seams above and below it are clean.
- [ ] **The band moves sideways** smoothly, back and forth, with no jump.
- [ ] **The player stays below the band**: pushing up stops at its bottom edge.
- [ ] **Guns, then the core.** Shots that reach the band hit what is drawn
      there: the three guns take eight hits each and become wrecks (kill sound,
      50 points each); the hull absorbs shots; the core's shutters open once
      all three guns are down, and only then does it take damage (24 hits, 99).
- [ ] **The win.** Six blasts along the modules, a background flash on each,
      the band shaking; about two seconds later the level-end summary with
      BONUS `02000` (placeholder), the score including it, and the time **of
      the fight alone** (under a minute).
- [ ] **GAME OVER inside the boss sector** (debug ATR: lose three lives), then
      START GAME: level 1 starts as always — the world scrolls, no band, normal
      colours, and later the capital sector renders correctly (Q-S4). The same
      after **pause → quit** inside the boss sector.
- [ ] **Pause inside the boss sector**, then resume: band and colours return.
- [ ] **A second game after a win** reaches a normally rendered capital sector.
- [ ] **The dotted row** on the summary and loading screens now steps (one
      dash in eight cells, moving one cell per sector read).
- [ ] **RESET** during the fight returns to the splash.

Unverifiable anywhere but here: the colour seams at the band's DLI lines on
a real GTIA, the HSCROL motion on a CRT, and the CA drive's entry time.

## 14. The layered boss engine (M5b-S4a-i)

Plan §5.13–5.14 (decisions A–G, answers Q-B1–Q-B8). **On copies**, as §12.
Two disks, as §13: the default ATR (level 1 to its boss, then the fight) and
the debug-route ATR that starts in the boss sector
(`build/level-1-s4/void-strike-65.atr`). Region 1 is S3's core boss rebuilt in
the new engine (style 2) with **placeholder art drawn by the agent** (decision
G). Not built yet, so not to be looked for: sparks, the band flash, the hit
tick, the guns firing, the animated nozzles (S4a-ii); lasers (S4b). Emulator
figures, for comparison only (EMULATOR): the entry reads 38 sectors in about 146
frames (2.9 s); the bot's fights took 47 / 57 / 74 s on EASY / MEDIUM / HARD.
Artifacts as built: default ATR `82113495…` (`npm run play:atr`), debug-route
ATR `8367aeca…` (`atari800 -xe -pal -nobasic <absolute path to
build/level-1-s4/void-strike-65.atr>`).

- [ ] **The entry (decision 32, Q-B8).** `WARNING` / `BOSS APPROACHING` with the
      boss theme, as in §13, now a little longer. **Stopwatch** the screen
      clearing → the band on screen, on the SIO2SD **and the CA drive**; if the
      CA drive clearly exceeds about 8 s, say so (it reopens the optional fast
      loader, S6).
- [ ] **The boss's own charset.** The band is drawn in region 1's glyphs: a
      burgundy hull between two engine blocks with three-flame nozzles at both
      ends, two pulse guns and the amber emitter in front, two plates under the
      hull, the shutters over the core. **Clean seams**: the divider row above
      the band and the first ring row below it show their normal stars and
      playfield, no corrupted characters anywhere — the HUD, the ring, the
      player, the capsule, a Light's glyphs.
- [ ] **The cover group.** The core takes no damage while any of the two guns
      and the emitter stands: shots into its own column are absorbed (and do
      not count for accuracy on the summary). When the third of them falls the
      shutters open on the amber core, and only then does it take damage.
- [ ] **Damage stages.** Each gun, the emitter, each plate and the core shows
      **cracked** after about a third of its hits, **broken** after two thirds,
      and **gone** (a dark bay) when destroyed (kill sound, score). The hull
      absorbs shots everywhere a module is not.
- [ ] **The defeat on the last weapon.** The core's death starts the win even
      if both plates still stand (armour is not required): eight blasts along
      the modules, the plates included, the background flashing, the band
      shaking; then the level-end summary with BONUS `02000` (placeholder), the
      fight's time, kills counting every module destroyed.
- [ ] **Difficulty.** On EASY the core falls in ~18 hits, MEDIUM 24, HARD 30
      (×¾ / ×1 / ×5⁄4, Q-B3).
- [ ] **GAME OVER inside the boss sector** (debug ATR: lose three lives), then
      START GAME: level 1 starts as always — **normal characters everywhere**
      (no boss glyphs in the HUD, ring, divider or menu), the world scrolls, no
      band, later a normal capital sector. The same after **pause → quit**.
- [ ] **Pause inside the boss sector**, then resume: band, charset and colours
      return.
- [ ] **RESET** during the fight returns to the splash.

Unverifiable anywhere but here: `$0C00-$18FF` on a real 65XE (EMULATOR-only
evidence that nothing else writes it, risk 2 as for `$0500`), the CHBASE seams
on a real GTIA/ANTIC, and the CA drive's entry time.

---

## 15. Region 1 as the layered fortress, and the fight's feedback (fortress session)

Plan §5.15 (decisions H–K, the owner's answers of §5.15.6). **On copies**, as
§12. Two disks, as §14: the default ATR (level 1 to its boss, then the fight)
and the debug-route ATR that starts in the boss sector
(`build/level-1-s4/void-strike-65.atr`). Region 1 is the layered fortress
**Blockade Breaker** with **placeholder art drawn by the agent** (decision G).
Not built yet, so not to be looked for: lasers (S4b; the emitter slot stays a
capped shutter until then). Emulator figures, for comparison only (EMULATOR):
the entry reads 48 sectors in about 184 frames (3.7 s); the bot's fights took
37 / 47 / 71 s on EASY / MEDIUM / HARD and it took 2 / 3 / 7 hits (a pulse hit
is one of ten health units, so it lost no life). Artifacts as built: default
ATR `c9168624…` (`npm run play:atr`), debug-route ATR `1c79ad0d…`
(`atari800 -xe -pal -nobasic <absolute path to
build/level-1-s4/void-strike-65.atr>`).

- [ ] **The hull is the target.** Ten grey plates of different sizes and
      depths make up the boss's lower face, between three X-braced girders and
      one open bay; behind them, a burgundy hull with four recessed cannons and
      a slatted shutter (the emitter slot). Both ends carry engine housings with
      **flames at both ends**, flickering; each end comes into view as the
      band drifts.
- [ ] **Plate by plate.** Each plate turns **darker grey with black cracks**,
      then **dark and torn with amber edges**, then leaves a **black hole with a
      glowing amber rim** of its own shape — never a dithered pattern.
- [ ] **Every hit shows.** A damaging hit: a white-and-amber **spark** in the
      struck cell, the whole band **flashing** for one frame, a short high
      **tick**. A hit on a girder, the hull or a cannon still covered: a grey
      **deflection** spark and a different, duller tick, no flash. The kill sounds
      different again (the old hit sound), the win's blasts are the explosion.
- [ ] **Cannons open fire as their cover falls.** The cannon in the open bay
      fires from the first second (amber muzzle flash, a shot straight down);
      the others sit dark and silent behind their plates, light up and join in
      once their plate (two plates for one of them) is gone. Shots come from
      each cannon's centre, are dodgeable, and hit the player.
- [ ] **The win on the last cannon.** The fourth cannon's death ends the fight
      with armour still standing: the nozzles **go dark first**, then the chain
      of blasts along every module, the flashing background, the band's shake;
      the summary with BONUS `02000` (placeholder), the fight's time, kills
      counting every module destroyed.
- [ ] **Length and danger per difficulty.** Play a fight on EASY, MEDIUM and
      HARD: MEDIUM should take roughly 45–60 s and cost lives if the player
      stands still; HARD fires faster (reload −¼) and the modules take ×5⁄4
      hits, EASY slower (+½) and ×¾.
- [ ] **The entry**, as §14: `WARNING` / `BOSS APPROACHING`, stopwatch on the
      SIO2SD and the CA drive (one sector longer than §14).
- [ ] **GAME OVER inside the boss sector** (debug ATR: lose three lives), then
      START GAME: level 1 starts as always — normal characters everywhere, **no
      boss shot left on screen**, the engine hum back, no band, the world
      scrolling. The same after **pause → quit**.
- [ ] **Pause inside the boss sector**, then resume: band, charset, colours,
      nozzles and the engine hum return.
- [ ] **RESET** during the fight returns to the splash.

Unverifiable anywhere but here: `$0C00-$18FF` on a real 65XE (EMULATOR-only
evidence, as §14), the band flash and the CHBASE seams on a real GTIA/ANTIC,
the tick's sound on a real POKEY, and the CA drive's entry time.

---

## Recording the result

Report the artifact SHA-256, emulator and hardware versions, which sections
passed, and every failure with reproduction steps. File technical evidence under
[diagnostics/](diagnostics/). Only the owner promotes a result to
`OWNER-ACCEPTED`.
