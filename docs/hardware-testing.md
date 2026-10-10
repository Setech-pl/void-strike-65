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
ATR `8367aeca…` (`atari800 -xl -pal -nobasic <absolute path to
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
ATR `af0180b3…` (`npm run play:atr`), debug-route ATR `045787b3…`
(`atari800 -xl -pal -nobasic <absolute path to
build/level-1-s4/void-strike-65.atr>`).

- [ ] **The hull is the target.** Ten grey plates of different sizes and
      depths make up the boss's lower face, between three X-braced girders and
      one open bay; behind them, a burgundy hull with four recessed cannons and
      a slatted shutter (the emitter slot). Both ends carry engine housings with
      **flames at both ends**, flickering; each end comes into view as the
      band drifts.
- [ ] **Plate by plate.** Each plate turns **darker grey with black cracks**,
      then **dark and torn with amber edges**, then **disappears** (owner
      decision L): below the hull line only empty background is left, **no rim,
      no outline, no frame** hanging under the hull. A destroyed cannon leaves
      a plain dark cavity in the hull, again with no rim. Never a dithered
      pattern.
- [ ] **The exposed cannon shows whole.** When a plate falls, the cannon behind
      it is fully visible — nothing of the plate crosses or frames it.
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

## 16. Boss readability: shots up to the boss, the skeleton that does not block (`fix/boss-readability`)

Plan §5.16 (owner decisions M, M1, M2 and the answers of §5.16.5). **On
copies**, as §12. Three disks: the default ATR (level 1 to its boss), the
debug-route ATR that starts in level 1's **boss sector**
(`build/level-1-s4/void-strike-65.atr`) and the one that starts in its
**capital sector** (`build/level-1-s1/void-strike-65.atr`). Emulator figures,
for comparison only (EMULATOR): the entry reads 49 sectors in about 188 frames
(3.8 s); the bot's fights took 46 / 49 / 71 s on EASY / MEDIUM / HARD, 1 / 4 / 7
hits, no life lost. Artifacts (after decision O, plan §5.16.8): default ATR
`4926dc05…` (`npm run play:atr`), boss debug ATR `255fbc19…`, capital debug ATR
`a89b2c44…`
(`atari800 -xl -pal -nobasic <absolute path>`).

- [ ] **Shots all the way to the boss.** Fire at a cannon whose plate is gone:
      the shot stays visible inside the band, light steel (the band cannot
      show the playfield's pale yellow; light steel is the closest), cell by
      cell up to the cannon, and the spark appears on the cannon. It may vanish
      for one frame behind a short girder stub - that is it passing behind it.
- [ ] **No stray piece after a hit.** Destroy a plate and keep firing into its
      columns: nothing of the plate stays hanging below the hull (the torn
      fragment §5.16.1 found). Hits on the boss leave nothing behind.
- [ ] **Shots pass the skeleton.** A shot in a girder's column flies past the
      short girder to the hull above it (a deflection there); a shot under
      gun-4 passes the small hull pieces and hits gun-4.
- [ ] **The gone look.** Girders end one row under the hull line; the open bay
      has no red dotted wall strips.
- [ ] **Every cannon is fully visible and hittable once uncovered.** gun-3 (the
      right-hand cannon of the middle pair) is behind one wide plate now: when
      that plate falls it opens fire and takes damage in all three columns.
- [ ] **Decision N: the open-bay cannon reads open.** Left of centre, the lit
      cannon that fires from the first second sits in a bay five columns wide
      with clear sky on both sides of it; no plate touches it, so nothing reads
      as its cover. Hit it straight away: it takes damage. Shoot any other
      cannon while its plate stands: the plate takes the hits, the cannon never
      does, in every one of its columns, wherever the band has drifted.
- [ ] **Decision O: every weapon hangs in an open recess.** Look under each of
      the five weapons (four cannons and the shuttered emitter): no grey strip,
      no hull piece is drawn below any of them - only its own plate, or nothing.
      gun-2 and gun-4 hang free of the strip at their sides. Nothing that cannot
      be destroyed stands in front of any weapon; a cannon that takes damage is
      always one you can see is bare.
- [ ] **Decision N: every plate you can see can be destroyed.** The cowl plates
      under the two engine housings are gone (they were out of the fighter's
      reach). Fly to the far left while the band's left end is in view and
      destroy the left-most plate (plate-a), then the same at the far right
      (plate-h): each falls to its hits in every one of its columns.
- [ ] **Open sky.** At the band's far ends, a shot that misses the hull flies
      up through the band and vanishes at its top - nothing appears in the row
      above the band.
- [ ] **The capital sector** (capital debug ATR): a player shot crossing a
      broadside shell hides half of the shell for a frame or two - known and
      accepted (decision M2); nothing stays behind after it.
- [ ] **Length and danger**: MEDIUM roughly 45-60 s.
- [ ] **GAME OVER inside the boss sector** (boss debug ATR: lose three lives,
      with shots in the band when it ends), then START GAME: level 1 starts as
      always, no boss shot or player shot left anywhere, normal characters, the
      engine hum, the world scrolling. **RESET** returns to the splash.

## 17. Disk safety: the save on the game's own disk, loads that check (`fix/audit-hardening`)

Plan [plans/audit-hardening.md](plans/audit-hardening.md) (the October 2026
audit's AUD-01, AUD-02 and the rest of AUD-03; owner decisions and answers of
2026-10-07). **On copies only**, as §12: the game writes its record to its own
disk, and this section deliberately mounts other disks. Default ATR
`19b82947…` (`npm run play:atr` mounts `build/play/void-strike-65.atr`, a
copy). The other disk for the emulator steps is a blank 720-sector image made
by the command in the report (any disk you do not care about will do). In
Atari800, F1 → Disk Management → D1: swaps the mounted image while the game
runs. Emulator figures, for comparison only (EMULATOR): the boss entry still
reads 64 sectors in 245 host frames; the level end reads one sector more (the
identity, 598) before it writes; the menu appears one frame later (551, BASIC
542) for the extra boot sector.

- [ ] **The record saves on the game's own disk.** Play level 1 to the boss
      and through the fight to the level-end summary (MEDIUM: about a minute
      to the boss, two to the end). `BEST` shows the grade and score; power
      off, boot the same copy, START GAME: `BEST` still shows them.
- [ ] **Write-protected: skipped silently.** The same on a write-protected
      copy (read-only SIO2SD image, a covered notch, or Atari800's read-only
      mount): the summary shows `BEST` from memory, no error screen, no hang,
      FIRE returns to the menu; the disk is unchanged.
- [ ] **Another disk at the summary is never written** (emulator). In the
      boss fight, swap D1: to the blank image before the boss falls, then win:
      the summary's stats appear, then `DISK READ FAILED` / `WRONG DISK` (the
      region's art read from the other disk does not check, so nothing of it
      is drawn - the same way out as any read failure at the level's end, so
      this game's score does not reach TOP SCORES); no crash, FIRE returns to
      the menu. Then check the blank image is still blank (`cmp` against its
      copy, command in the report). A swap after the art and before the
      record (the 6502 tests' case) shows the summary with `BEST` from memory
      and writes nothing.
- [ ] **Another disk at the boss entry** (emulator). In level 1's last
      sector, before `WARNING - BOSS APPROACHING`, swap D1: to the blank
      image: the warning screen is followed by `DISK READ FAILED` / `WRONG
      DISK`, no boss music, no garbage, no crash; FIRE returns to the menu.
      Swap the game's copy back and START GAME: level 1 starts normally.
- [ ] **Another disk at START GAME** (emulator): with the blank image in D1:
      on the menu, START GAME ends at `DISK READ FAILED` with a reason, FIRE
      returns to the menu; with the game's copy back, START GAME works.
- [ ] **BASIC on and off; RESET.** The copy boots to the menu with BASIC
      enabled (no OPTION held) and disabled; RESET during play returns to the
      splash and a full cold start.
- [ ] **Gameplay looks as before** (the gameplay DLI gained a `CLD`): the HUD,
      the divider and the playfield colours switch on the same lines as on
      `main`, in a normal level and in the boss sector; no flicker, no torn
      line.
- [ ] **SIO2SD and the real drive.** The save on the game's own copy, the
      write-protected copy, and a **spare floppy** in the drive at the
      level-end summary (swap after the boss falls): `DISK READ FAILED` with
      `WRONG DISK` (or `READ ERROR` / `BAD DISK` for an unformatted floppy),
      the spare floppy not written (its contents unchanged afterwards),
      nothing hangs, FIRE returns to the menu. And the boss entry with the spare floppy in the
      drive: `WRONG DISK` (or `READ ERROR` / `BAD DISK` if the floppy is
      unformatted), FIRE returns to the menu.

Unverifiable anywhere but here: how a real drive answers a read of an
unformatted or foreign floppy's sector 598 (any refusal skips the write).

---

## 18. Shots in the boss band, level 1 after the capital, the AI line (`fix/smoke-2026-10-07`)

Plan [plans/smoke-2026-10-07.md](plans/smoke-2026-10-07.md) (the owner's smoke
of 2026-10-07; decisions P1-P3 of 2026-10-08). **On copies only**, as §12.
Default ATR `51d8fac7…` (`npm run play:atr` plays a copy in `build/play/`);
the boss sector's debug route `build/level-1-s4/void-strike-65.atr`
`7cc214ff…`; the sector after the capital `build/level-1-s2/void-strike-65.atr`
`db0461d6…`. Copy, then run (from the repository):

```
npm run play:atr
mkdir -p build/play
cp build/level-1-s4/void-strike-65.atr build/play/smoke-level-1-s4.atr
atari800 -xl -pal -nobasic "$PWD/build/play/smoke-level-1-s4.atr"
cp build/level-1-s2/void-strike-65.atr build/play/smoke-level-1-s2.atr
atari800 -xl -pal -nobasic "$PWD/build/play/smoke-level-1-s2.atr"
```

- [ ] **Shots up to the turrets** (level-1-s4, and the full game's boss). Fire
      at gun-2 in its open bay from the start, and at each other cannon and the
      emitter once its plate falls: every shot stays on the screen all the way
      up the black strip under the turrets to the module that stops it, then
      the spark. No row where it blinks out. At several band positions (the
      band drifts left and right).
- [ ] **Shots stop only on what stops them**: a plate's bottom row, a cannon,
      the emitter, the hull's own cells; through an empty recess and past a
      girder's stub to the hull above. A shot past the band's top over open
      sky leaves no mark on the divider.
- [ ] **After the capital, each Light kind once** (level-1-s2, and the full
      game): one Interceptor, then one Wingman, then one Raider wave (a Raider
      pair with its Wingman escort in the red flight-lead look), then **one
      Bomber pair** - each alone on the screen, a short pause between them,
      then the boss. Nothing else after the capital.
- [ ] **The loading screen at START GAME**: `ENGAGING ENEMY SECTOR`, the
      picture, `BEST` with its value (or `--`), the dotted row, `PRESS FIRE` -
      no SCORE ... GRADE labels without values, no AI line.
- [ ] **The summary at the level's end**: `LEVEL 01` on top, the picture, every
      statistic with its value; no AI line anywhere, nothing overlapping.
- [ ] **The WARNING / BOSS APPROACHING screen** is as before (the AI line was
      not moved there: no home without boot bytes; backlog "AI chatter line:
      find a home").
- [ ] **The boss fight** as before otherwise: lasers, the boss's shots, the
      capsule from destroyed modules, the win and the summary.

Emulator figures, for comparison only (EMULATOR): the boss entry reads 64
sectors in 245 host frames; the menu appears at frame 551 (BASIC 542), as on
`main`; the level reaches its boss in 67.3 / 59.5 / 55.1 s.

## 19. The Lights in level 1: the swarm, elite (a) and (b), the Bomber pair (`data/w2-lights`)

Plan [plans/w2-lights.md](plans/w2-lights.md) (owner decision a/b and the
answers of 2026-10-08). **On copies only**, as §12. Default ATR `77d4cbf6…`
(`npm run play:atr` plays a copy in `build/play/`). Debug routes, each entered
at one sector after the capital (sector numbers from 0): the swarm
`level-1-s2` `230a09f3…`, elite (a) `level-1-s3` `514d8c7b…`, the Bomber
pair `level-1-s4` `656ab470…`, elite (b) `level-1-s5` `2ebf0909…`, the boss
`level-1-s6` `6c4d5a27…` (the boss route was `level-1-s4` before W2). The
copies are in `build/play/`; run them from the repository:

```
npm run play:atr
atari800 -xl -pal -nobasic "$PWD/build/play/w2-level-1-s2.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/w2-level-1-s3.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/w2-level-1-s4.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/w2-level-1-s5.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/w2-level-1-s6.atr"
```

(If `build/play/` was cleaned, copy them again:
`cp build/level-1-sN/void-strike-65.atr build/play/w2-level-1-sN.atr`.)

- [ ] **The swarm after the capital** (s2, and the full game): a column of
      three Wingmen in the red flight-lead look with white tips, one above the
      other, flying straight down; when they have gone, three Interceptors
      (the X with red pods) one after another, each closing on your column
      and firing its single laser bolt. Up to three Lights at once, and **no
      Heavy (Raider or Bomber) anywhere in the swarm**.
- [ ] **Elite (a)** (s3): a Raider pair arrives with an **Interceptor beside
      it** that flies free and chases you; no Wingman.
- [ ] **The Bomber pair** (s4): one Bomber pair, nothing else.
- [ ] **Elite (b)** (s5): a Raider pair **alone, no Light at all**.
- [ ] **Nothing flies across the boundaries it should not:** no Heavy enters
      the swarm from before it, and the elite (a) sector opens with the swarm
      gone - (a)'s Raiders keep their Interceptor.
- [ ] **The boss sector** (s6, and the full game) as in §18: unchanged.
- [ ] **Before the capital and the capital** (the full game): unchanged.

Emulator figures, for comparison only (EMULATOR): the level reaches its boss
in 88.2 / 77.2 / 71.5 s (was 67.3 / 59.5 / 55.1); the boss entry reads in 245
host frames; the menu appears at frame 551 (BASIC 542), as on `main`.

---

## 20. Sector flow: the early end, `afterCleared`, C1 (`feat/sector-flow`)

Plan [plans/sector-flow.md](plans/sector-flow.md). **On copies only**, as
§12. Default ATR `977108bf…` (`npm run play:atr` plays a copy in
`build/play/`); the swarm's debug route `build/level-1-s2/void-strike-65.atr`
`9a9c8587…`; elite (a) → the Bomber pair `build/level-1-s3/void-strike-65.atr`
`bc427161…`; elite (b) → the boss `build/level-1-s5/void-strike-65.atr`
`e04025f0…` (the owner's smoke fix of 2026-10-09). Copy, then run (from the
repository):

```
npm run play:atr
mkdir -p build/play
cp build/level-1-s2/void-strike-65.atr build/play/smoke-sector-flow-s2.atr
atari800 -xl -pal -nobasic "$PWD/build/play/smoke-sector-flow-s2.atr"
cp build/level-1-s3/void-strike-65.atr build/play/smoke-sector-flow-s3.atr
atari800 -xl -pal -nobasic "$PWD/build/play/smoke-sector-flow-s3.atr"
cp build/level-1-s5/void-strike-65.atr build/play/smoke-sector-flow-s5.atr
atari800 -xl -pal -nobasic "$PWD/build/play/smoke-sector-flow-s5.atr"
```

- [ ] **No debris frozen in the boss sector** (level-1-s5, and the full game;
      the owner's smoke of 2026-10-09): kill (b)'s Raiders while debris is
      falling - the boss's WARNING screen comes only after that debris has
      fallen off the bottom, and no debris piece stands still on screen at any
      time during the fight.

- [ ] **No long empty gap after a wave dies**: kill a sector's last enemy and
      the next sector starts at once (its first enemies within about a second)
      - after the swarm, after (a), after the Bomber pair, after (b) (the boss
      sector then waits only for the debris to clear).
- [ ] **`afterCleared` follows without a pause** (level-1-s3): when (a)'s
      Raider pair and its Interceptor are gone, the Bomber pair comes straight
      in - no fixed lead-in.
- [ ] **The swarm's third wave** (level-1-s2): the flight-lead Wingman column
      (right), the Interceptors, then a plain Wingman column down the left
      side; up to three at once.
- [ ] **No Heavy flies into a swarm, no swarm Lights into an elite sector**:
      leave enemies alive at a sector's end - the sector holds (the world keeps
      scrolling) until what is live fits the next sector; at most one Light
      ever flies beside (a)'s Raiders.
- [ ] **The order is unchanged**: elite sector, capital, swarm, (a), the Bomber
      pair, (b), boss - in the full game on each difficulty.
- [ ] **The capital**: as before when sector 0's formations are not all killed
      by row 272; if they are, it comes earlier and still only after the
      playfield has drained (no Heavy carried into it).
- [ ] **The boss sector is unchanged**: the WARNING screen, the fight, the
      lasers, the summary.

## 21. The 64 KB machine, the booster bar through the boss entry, regions 2-4 on the disk (`chore/s5-platform`, S5-1)

Plan [plans/s5-boss-regions.md](plans/s5-boss-regions.md) §6 S5-1. **On copies
only**, as §12. The target machine is the 64 KB 800XL / 65XE (`-xl`); every
command below is on it, and one is the 130XE compatibility check. Copies in
`build/play/` (SHA-256 prefixes): the default ATR `s5-1-default.atr`
`67d95ed8…` (also `npm run play:atr`); level 1's boss sector
`s5-1-region-1-s6.atr` `a0164e8c…`; region 2 / 3 / 4's boss on level 1's route
(`--boss-region=N`, the region's first level 4 / 7 / 10) entered at the boss
sector `s5-1-region-2-s6.atr` `362fb916…`, `s5-1-region-3-s6.atr` `1a429095…`,
`s5-1-region-4-s6.atr` `8ccc87f8…`, and from elite (b) `s5-1-region-2-s5.atr`
`ca34b19c…`, `s5-1-region-3-s5.atr` `51572ef5…`, `s5-1-region-4-s5.atr`
`c9a8a615…`. Rebuild them with `node scripts/build.mjs --level=1:sector=6
--boss-region=N` (or `sector=5`) and copy from `build/boss-region-N-level-1-sM/`.

```
npm run play:atr
atari800 -xl -pal -nobasic "$PWD/build/play/s5-1-default.atr"
atari800 -xl -pal -basic "$PWD/build/play/s5-1-default.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-1-region-1-s6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-1-region-2-s5.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-1-region-2-s6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-1-region-3-s6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-1-region-4-s6.atr"
atari800 -xe -pal -nobasic "$PWD/build/play/s5-1-default.atr"   # the 130XE compatibility check
```

- [ ] **The booster bar through the boss entry** (the owner's smoke finding):
      collect a Rapid, Spread or Shield capsule in (b) (`s5-1-region-2-s5`,
      or the full game) and enter the boss with it running - right after the
      WARNING screen the BOOST label and the energy cells read exactly as
      before it (no blank bar), and the cells keep running down.
- [ ] **Every HUD field right after the boss entry, after the capital and after
      a death**: the score, the lives digit, the four hull cells and the
      booster (the weapon's mark: the full cells for Rapid / Spread, the shield
      cells for Shield) - each as the game state says, on each of the three
      occasions.
- [ ] **Regions 2-4 load their boss** (`s5-1-region-N-s6` / `-s5`): the WARNING
      screen, then region 1's look (regions 2-4 are its copies until S5-3 ...
      S5-5) within the usual loading time (about 5 s on the emulator; the same
      as level 1's); the fight plays as level 1's.
- [ ] **The 64 KB machine**: a BASIC-off and a BASIC-on cold boot, a whole
      level 1 to its summary, and RESET during play (a cold start back to the
      title) - the same as before.
- [ ] **The 130XE**: the same cold boot and a level on `-xe` (or a real
      130XE) - unchanged.
- [ ] **Nothing else changed**: level 1 plays as before up to the boss; in the
      boss sector a gun never fires in the same instant a module falls (its
      shot comes a frame later, invisible at play speed).

## 22. The boss finale: volleys after the last plate, off in region 1 (`feat/boss-finale`, S5-2)

Plan [plans/s5-boss-regions.md](plans/s5-boss-regions.md) §6 S5-2. **On copies
only**, as §12, on the 64 KB machine. Copies in `build/play/` (SHA-256
prefixes): the default ATR `s5-2-default.atr` `70063213…` (also
`npm run play:atr`); level 1's boss sector, the finale off,
`s5-2-region-1-s6.atr` `a0252693…`; region 1's boss **with the finale on** - the
region 2 / 3 / 4 placeholders on level 1's route, entered at the boss sector -
`s5-2-region-2-s6.atr` `8d37543e…`, `s5-2-region-3-s6.atr` `cd5b44e3…`,
`s5-2-region-4-s6.atr` `e2438c76…`, and from elite (b) `s5-2-region-2-s5.atr`
`ed52d8af…`, `s5-2-region-3-s5.atr` `482bc396…`, `s5-2-region-4-s5.atr`
`d97ceb59…`. Rebuild them with `node scripts/build.mjs --level=1:sector=6`
(region 1) or `--level=1:sector=6 --boss-region=N` (or `sector=5`) and copy
from `build/level-1-s6/` or `build/boss-region-N-level-1-sM/`.

```
npm run play:atr
atari800 -xl -pal -nobasic "$PWD/build/play/s5-2-default.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-2-region-1-s6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-2-region-2-s6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-2-region-2-s5.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-2-region-3-s6.atr"
atari800 -xl -pal -nobasic "$PWD/build/play/s5-2-region-4-s6.atr"
```

- [ ] **The finale begins on the last plate** (`s5-2-region-2-s6`, on MEDIUM):
      shoot every armour plate first - the edge plates need the fighter near
      the screen's sides - and keep a gun alive. On the frame the last plate
      falls nothing fires; from the next frame each surviving gun fires
      **three shots on three frames from the columns left of, at and right of
      its centre**, and the volleys come about twice as often as the single
      shots before. The rhythm should read as volleys, not as a stream.
- [ ] **No gun fires on the frame a module is destroyed**: during the
      volleys, destroy a gun - the volley under way pauses one frame
      (invisible at play speed) and finishes; nothing fires once the last
      weapon is down, and the chain of blasts follows as before.
- [ ] **Does the finale read as a last stand?** (the plan's question):
      `s5-2-region-2-s6` against `s5-2-region-1-s6`, the same boss with and
      without it.
- [ ] **Region 1 is unchanged** (`s5-2-default.atr` and `s5-2-region-1-s6`):
      the fight as before - single shots to the end, also after the last
      plate falls.
- [ ] **The fight's length on MEDIUM** with the finale: does it feel right?
      (The emulator's wide-sweep bot: the finale from about 54 s, the boss
      down at 140 s - a bot that clears the edge plates slowly; region 1
      without the finale stays at 92 s.)
- [ ] **Regions 3 and 4** (`-region-3-s6`, `-region-4-s6`): the same boss and
      the same finale (they are copies of region 1 until S5-3 and S5-4).

## 23. Booting on real hardware: stage 2's DSTATS, real SIO everywhere it matters (`fix/hardware-boot`)

Diagnosis [diagnostics/hardware-boot.md](diagnostics/hardware-boot.md). Until
this build **no ATR booted on a real machine**: stage 2 armed the OS disk
routine's receive direction once per chunk, so from a chunk's second sector on
it read no data and the boot stopped on a full red screen about 15 s after
power-on. This is the release gate for `v0.2.3` (owner answer Q5).

**On the real 65XE PAL with the SIO2SD**, on a copy:
`build/play/fix-hardware-boot.atr` `b99fb418…` (the default ATR; `npm run
play:atr` plays the same one in Atari800 with real SIO). Copy it to the SD card
under a new name, so the SIO2SD does not serve a cached older image.

```
npm run play:atr                                              # real SIO, as the hardware
npm run play:atr -- --fast                                    # the SIO patch, for a quick look only
atari800 -xl -pal -nopatch -nobasic "$PWD/build/play/fix-hardware-boot.atr"
atari800 -xl -pal -nopatch -basic   "$PWD/build/play/fix-hardware-boot.atr"
```

- [ ] **Cold boot WITHOUT OPTION** (BASIC on at power-on; nothing held): the
      blue OS screen while the OS loads 107 sectors, still blue while stage 2
      loads 106 more, then the splash, then the main menu. **No red screen.**
      Stopwatch from power-on: splash about 22-30 s, menu about **27-36 s**
      (ESTIMATE for an SIO2SD; Atari800 without the patch MEASURES 21.7 s /
      26.8 s, frames 1085 / 1342).
- [ ] **Cold boot WITH OPTION held** (BASIC off): the same, about 0.2 s later
      (Atari800: frames 1094 / 1351, 21.9 s / 27.0 s).
- [ ] **The SIO2SD display**: note the sector numbers it shows during the load
      and how fast they change (the owner's video of 2026-10-09 showed $001,
      $005, $008, $009 at 1.2-1.7 s each before the red). A healthy load reads
      213 sectors without a pause longer than a second or so; note any value
      that stalls.
- [ ] **START GAME**: the summary screen, level 1 loaded behind it (Atari800:
      49 frames, 1.0 s, for its reads; the screen stays for its 3-s minimum),
      then play.
- [ ] **The boss entry** (play level 1 to its end): the WARNING screen and the
      boss within about 5-7 s (ESTIMATE; Atari800 about 5 s).
- [ ] **The level's end**: the summary and the save (the copy's best score).
- [ ] **RESET during play**: a cold start, the same blue load, the menu again.
- [ ] **If a real 1050 / XF551 is at hand**: the same cold boot from a floppy
      copy; stopwatch to the menu (no estimate is measured: Atari800 has no
      drive model; ESTIMATE 40-55 s).
- [ ] **If anything stops**: the colour of the screen (red = stage 2, black
      with `DISK READ FAILED` = the game's own reader), the last SIO2SD
      sector, and the time from power-on.

## 24. Sound on real hardware: all four POKEY channels (`fix/hardware-audio`)

Diagnosis [diagnostics/hardware-audio.md](diagnostics/hardware-audio.md). Until
this build, **channels 3 and 4 were silent on a real machine**. The OS's disk
routine and the game's sector reader left SKCTL = `$13`, and its bit 4
(asynchronous receive) holds POKEY's timers 3 and 4 in reset. So the menu
played only drums and bass, and play had no shots, engine, capital explosion
or boss hum. Atari800 does not model the hold and plays everything, so **only
this checklist can catch a regression by ear**. The tests assert the register
instead (`tests/hardware-audio.test.mjs`). The owner's probe test of
2026-10-10 confirmed the fix (probe P1).

**On the real 65XE PAL with the SIO2SD**, monitor or TV sound up, on a copy:
`build/play/fix-hardware-audio.atr` `75cf839c…` (the default ATR), under a
new file name on the SD card. Run §23's boot first. Listen for each item and
compare it with Atari800 (`npm run play:atr`), which plays the same sound:

- [ ] **Splash**: the data-cassette chirp (channel 1) during the loader.
- [ ] **Main menu, first visit after power-on**: the whole theme - the bass,
      the drums, **the lead melody (channel 3)** and **the chord arpeggio
      (channel 4)**. Drums and bass alone are the old fault.
- [ ] **OPTIONS → SOUND OFF, then ON**: silence, then the theme again.
- [ ] **START GAME**: the summary screen's music while level 1 loads.
- [ ] **Play, from the first frame**: the quiet **engine hum** (channel 3)
      under the music.
- [ ] **Shots**: a short blip for every shot (channel 4), single, Rapid and
      Spread.
- [ ] **Enemy kills and taking a hit**: the noise burst (channel 2).
- [ ] **The capital ship's hull explosions** (channel 4) as its sections blow.
- [ ] **Space pauses, Space again resumes**: silence, then the music, the
      engine hum and any running effect come back.
- [ ] **The boss**: its **hum** (channel 3) once the fight starts, and **a tick
      on every hit** on a plate or module (channel 3); shots still blip.
- [ ] **The level's end and back in the menu** (or GAME OVER, then the menu):
      the full menu theme with melody and arpeggio again. This is the first
      menu after a game load, so it checks the reader's fix on its own.
- [ ] **RESET, then the menu**: the full theme after the cold start.
- [ ] **If something is silent**: note which item, and whether the menu theme
      has its melody at that moment.

## 25. Region 1's boss: far-end guns, half-durability guns, the Interceptor escort (`feat/boss-r1-tuning`)

Plan [plans/boss-r1-tuning.md](plans/boss-r1-tuning.md). Before this build the
player could hide at a screen edge in the boss fight. MEASURED: parked at
HPOS 48 and firing, the fighter took 0 hits in 80 s on every difficulty. The
boss now has a pulse gun at each far end, gun-5 behind plate-a and gun-6
behind plate-h, drawn with gun-1's art. Every gun has half its old hit points
(14; the emitter keeps 20). Plates a and h drop to 12. One Interceptor at a
time escorts the boss, six in all, the next about 2 s after the last one goes.
The fight's length is measured with the aiming bot (the owner's decision of
2026-10-10). ATR `020fea98…`, boot `4b8886da…`.

**Atari800**, copies in `build/play/` (rebuild with `node scripts/build.mjs
--level=1:sector=6 [--boss-region=N]`):

```
atari800 -xl -pal -nobasic "$PWD/build/play/feat-boss-r1-tuning-020fea98.atr"             # the default game
atari800 -xl -pal -nobasic "$PWD/build/play/feat-boss-r1-tuning-boss-route-df262502.atr"  # straight to the boss
atari800 -xl -pal -nobasic "$PWD/build/play/feat-boss-r1-tuning-region-2-route-25a69413.atr"  # region 2's copy (region 3: a1231c56, region 4: 0580c026)
```

- [ ] **The far ends**: gun-5 and gun-6 read as the boss's end guns, recessed
      above plate-a and plate-h, closed until their plate falls, then open and
      firing.
- [ ] **No refuge at an edge**: sit at the far left or right with the end gun
      alive and exposed. Its shots and the escort reach you there.
- [ ] **The escort**: one Interceptor at a time in the boss sector, never two;
      it reads as pressure, not as noise over the boss; six in all.
- [ ] **The guns go down faster** (14 hit points): the fight no longer feels
      like a grind; MEDIUM lasts about as long as before by the bot's ratio.
- [ ] **The laser** (the emitter behind plate-d) is unchanged: warning, beam,
      20 hit points.
- [ ] **The loading screens of regions 2-4** (`--level=1:sector=6
      --boss-region=N`, then the summary): the hull art now shows the gun
      emplacement rows, as region 1's does.
- [ ] **The win**: the chain blasts every module, the nozzles go dark, the
      summary follows.

**On the real 65XE PAL with the SIO2SD**, on a copy of the default ATR
`020fea98…` under a new file name, after §23's boot and §24's sound check:

- [ ] **The boss fight on hardware**: play level 1 to its boss (or load a copy
      of the boss route's ATR). The escort and the boss's fire are both on
      screen with no flicker, tearing or slowdown; the end guns' shots and the
      boss hum and ticks sound as in Atari800.

## 26. The boss escort's flow: from the first weapon kill, then every 3-4 s (`feat/boss-escort-flow`)

Plan [plans/boss-escort-flow.md](plans/boss-escort-flow.md); journal §AI.
Before this build the escort came three times at the start of the fight and
never again. Now:
* the first Interceptor comes right after the boss loses its first weapon (a
  gun or the emitter);
* then one every 3.0-4.3 s until the boss falls;
* never two at once, and none after the boss is destroyed.

MEDIUM's fight is a little longer (up to about 126 s by the bot), accepted
until the next task changes the Interceptor's behaviour. ATR `90f3e24e…`,
boot `fce37c74…`.

**Atari800**, copies in `build/play/` (rebuild the boss route with
`node scripts/build.mjs --level=1:sector=6`):

```
atari800 -xl -pal -nobasic "$PWD/build/play/feat-boss-escort-flow-90f3e24e.atr"             # the default game
atari800 -xl -pal -nobasic "$PWD/build/play/feat-boss-escort-flow-boss-route-91de3f27.atr"  # straight to the boss
```

- [ ] **No escort before the first weapon falls.** Destroy plates only (e.g.
      plate-c, plate-e): no Interceptor comes.
- [ ] **The first escort.** Destroy one weapon (gun-2, in the open bay, is
      the quickest). An Interceptor enters at the top within a moment.
- [ ] **Every few seconds after that**, a little irregular, for the rest of
      the fight. **Never two Interceptors** on screen at once.
- [ ] **The left edge is no refuge.** Park at the far left and keep firing.
      Once gun-5 falls, escorts keep coming at you there.
- [ ] **None after the boss falls.** During the chain of blasts and the hold,
      no new Interceptor enters (one already on screen may finish its pass).
- [ ] **Regions 2-4** (`--level=1:sector=6 --boss-region=N`) behave the same.

**On the real 65XE PAL with the SIO2SD**, on a copy of the default ATR
`90f3e24e…` under a new file name, after §23's boot and §24's sound check:

- [ ] **The boss fight on hardware.** Play level 1 to its boss (or load a copy
      of the boss route's ATR) and fight it to the summary. The escorts arrive
      as in Atari800, with no flicker, tearing or slowdown when an escort and
      the boss's fire are on screen together. The summary follows the win.

## Recording the result

Report the artifact SHA-256, emulator and hardware versions, which sections
passed, and every failure with reproduction steps. File technical evidence under
[diagnostics/](diagnostics/). Only the owner promotes a result to
`OWNER-ACCEPTED`.
