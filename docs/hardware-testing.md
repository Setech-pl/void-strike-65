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

---

## Recording the result

Report the artifact SHA-256, emulator and hardware versions, which sections
passed, and every failure with reproduction steps. File technical evidence under
[diagnostics/](diagnostics/). Only the owner promotes a result to
`OWNER-ACCEPTED`.
