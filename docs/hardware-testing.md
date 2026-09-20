# Hardware acceptance checklist

**Scope: milestones and releases.** This is the broad Atari800 and real-hardware
pass run before a milestone or release, not a per-feature gate.

Routine owner smoke for one feature is driven by that feature's report and
`STATUS.md` — it names the XEX, its SHA-256, what changed and what to look at.
A feature smoke does **not** require running this whole checklist.

Test the packed artifacts from `dist/`: both `void-strike-65.xex` and the
bootable `void-strike-65.atr`. Do not substitute a debug build or a preview
model. Record emulator/hardware version, medium, joystick, display connection,
and any failure with a photo or capture plus reproduction steps.

Verify the artifact identity against the accepted checkpoint in
[STATUS.md](STATUS.md) before testing:

```bash
npm run build:candidate -- --quiet
shasum -a 256 dist/void-strike-65.xex
```

---

## 1. Cold start

- [ ] XEX cold-starts from power-on, not from a warm reset.
- [ ] ATR boots from sector 1 on the same cold path.
- [ ] **ATR boots to the menu with BASIC enabled, without holding OPTION**, and
      with BASIC disabled; the XEX runs in both cases too.
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
> emulator half is gated by `npm run boot:smoke` (eight cold sessions: XEX and
> ATR, cold RAM fill `$A5` and `$5A`, BASIC on and off).

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

- [ ] The fighter-sector pickup is a **solid** fifth-player PMG mark (M0-M3,
      `PRIOR=$10`, `COLPF3`) — no holes, no character capsule.
- [ ] It is admitted deterministically and **stays visible for its whole
      descent** — this regressed silently for many releases, so check the top
      of the descent, not only the bottom.
- [ ] Collecting it applies Rapid Fire, Spread Shot or Shield correctly.
- [ ] Booster HUD state matches the active booster.

## 7. Capital transition

- [ ] An ACTIVE pickup is removed before the capital sector.
- [ ] The Light is fully unpublished before the sector changes; no residue.
- [ ] `M1-M3` resume broadside warning/impact ownership in the capital sector.
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

- [ ] **START GAME reads level 1.** The loader screen appears (title,
      `LOADING SECTOR`, one placeholder line, a stepping dotted row), then
      gameplay starts. On a 2-sector level this is brief.
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

---

## Recording the result

Report the artifact SHA-256, emulator and hardware versions, which sections
passed, and every failure with reproduction steps. File technical evidence under
[diagnostics/](diagnostics/). Only the owner promotes a result to
`OWNER-ACCEPTED`.
