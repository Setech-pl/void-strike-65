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
- [ ] No BASIC dependency; no OS call failure after takeover.
- [ ] Loader screen appears and completes without a visible stall or garbage.

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
- [ ] It is admitted deterministically and is visible for its whole descent.
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
- [ ] Behaviour matches Atari800; note every divergence — emulator success is
      necessary but not sufficient.
- [ ] Load time is acceptable and the loader survives a marginal SIO cable.
- [ ] A full session runs without lockup, memory corruption or audio breakdown.

---

## Recording the result

Report the artifact SHA-256, emulator and hardware versions, which sections
passed, and every failure with reproduction steps. File technical evidence under
[diagnostics/](diagnostics/). Only the owner promotes a result to
`OWNER-ACCEPTED`.
