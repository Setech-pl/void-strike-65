# Hardware acceptance checklist

Use the packed release artifacts from `dist/`. Test both `void-strike-65.xex` and
the bootable `void-strike-65.atr`; do not substitute a debug build or a preview
model. Record emulator/hardware version, medium, joystick, display connection,
and any failure with a photo or capture and reproduction steps.

Before manual testing, run the evidence phases in order:

- [ ] `npm run build:candidate` produces a `candidate-awaiting-trace` manifest.
- [ ] `npm run runtime:wall-trace` completes every schema-v2 session, including
      cold RAM `$A5/$5A` and full debris flights on EASY, MEDIUM, and HARD.
- [ ] `npm run build` binds the complete report to the same boot BIN, XEX, and
      ATR hashes.
- [ ] `npm run verify` accepts the final-bound manifest and report hash.
- [ ] The manifest reports ENTITY_CODE staging `$5300-$5CEE`, 346 B before it,
      and 289 B before BROADSIDE; startup consumes it before loader bitmap and
      starfield expansion reuse the same low-memory range.
- [ ] A second unchanged full trace has replay fingerprint
      `4a8c2186b8905840c2a70a99dc17ded77161c356542ea1a80ee67a0763a59597`,
      a 32,040-cycle maximum, and 3,528-cycle physical headroom.

## Atari800 PAL test

Configure Atari800 as PAL XL/XE with 64 KB RAM, BASIC disabled, joystick in port
1, and normal sound. Repeat the cold-start subset with RAM fill `$A5` and `$5A`
where the harness supports it.

For both XEX and ATR:

- [ ] Loader appears intact for five seconds, then reaches the main menu.
- [ ] Menu, options, top scores, music toggle, and exit screen respond normally.
- [ ] A new game shows `SCORE`, `LIFE`, and the full `HULL` label followed by
      four low intact plates; fields do not corrupt nearby characters.
- [ ] Player Fighter movement and normal fire remain responsive at 50 FPS PAL; a held
      FIRE input emits exactly eight shots at three-frame intervals, then the
      existing 12-frame post-burst pause.
- [ ] Pause freezes world motion, capital-engine phase, active pickup movement,
      and booster timer; resume restores the exact visible gameplay state.
- [ ] Allied and Hostile hulls remain continuous through prow, modules, engine
      banks, A2-head changes, and ring wrap.
- [ ] Capital engines alternate only between dim and bright, holding each phase
      for eight active frames.
- [ ] Allied and enemy cannon muzzles enter through the fixed divider without a
      vertical trail. Observe warning, four-frame launch flash, BROADSIDE and at
      least three A2 wraps: `$45/$D0/$51/$D2` may exist only at the current
      tracked cells, and the divider is clean after each ring transition.
- [ ] From New Game, ordinary Interceptors appear immediately and the first is
      visible no later than active gameplay frame 60. After a complete explosion
      and slot release, observe at most 60/45/30 active frames to the next visible
      Interceptor on BEGINNER/MEDIUM/HARD. Pause must not consume the interval.
- [ ] Earn the first pickup only by three Player Fighter-projectile Interceptor
      kills before the capital sector. Observe one natural PENDING state, one
      ACTIVE capsule, and no synthetic or second drop.
- [ ] The provisional capital request is not due before active gameplay frame
      600, not while loader, menu, OPTIONS, or pause is active. A still-live
      Interceptor or full legal budget may delay actual admission; once the hull
      is active, no ordinary admission is allowed. There is no frame-50 copy.
- [ ] During a complete Hostile hull pass, count at least three distinct
      25-frame warning -> four-frame flash -> projectile launches on EASY,
      MEDIUM, and HARD. No two warnings begin together and a full three-slot
      heavy-projectile pool must suppress an otherwise due launch legally.
- [ ] Steer the Player Fighter into the centre and then the edge of one Hostile and one
      Allied BROADSIDE shell. Each unshielded hit removes exactly two of
      ten HULL units, leaves LIFE unchanged when nonlethal, starts the existing
      25-frame post-hit cooldown, and consumes the shell once. A one-HPOS near
      miss must leave HULL unchanged; affiliation must not suppress Allied
      friendly fire. The complete 16x15 gameplay rectangle is solid, including
      transparent corners and internal PMG gaps.
- [ ] Interceptor fire, collisions, scoring, debris contact, destructible debris,
      Interceptor breakup, and debris breakup behave normally.
- [ ] Without Shield, an accepted direct Interceptor contact destroys the Player Fighter
      immediately at every HULL value; Shield, respawn invulnerability, the
      post-hit cooldown, and the same-frame damage latch retain their gates,
      while the Interceptor enters its normal scored breakup exactly once.
- [ ] Every pickup begins off-screen at Y=8, becomes active at Y=24, advances
      smoothly through the lower playfield to Y=238, and releases at Y=240.
      HARD advances two scanlines on
      every successive frame; no 0,0,0,+8 character-row jump is visible.
- [ ] Rapid Fire capsule remains one coherent 8x16 object (one phased 2x2/2x3
      footprint) through several ring wraps; no ghost or second pass returns.
      Fly the Player Fighter nose, side, and rear across phases 0/2/4/6: opaque PMG pixels
      may cover the capsule, but transparent PMG pixels must reveal it with no
      dark rectangle or clipped edge. Collection occurs once and restores the
      lower layer on the following raster.
      Collection displays
      the full `BOOST` label and four tall energy segments, emits ten yellow shots at two-frame
      intervals with the existing 12-frame post-burst pause, and expires after
      ten active seconds.
- [ ] Spread Shot capsule is one stable red phased footprint with a black fan symbol.
- [ ] Collecting Spread immediately displays the full `BOOST` label and four
      full energy segments and
      produces three yellow Player Fighter projectiles: one vertical and two smoothly
      diverging, symmetric side shots.
- [ ] One held Spread burst contains exactly eight complete salvos. When fewer
      than three Player Fighter slots are free, the next salvo waits; no one- or two-shot
      partial fan appears.
- [ ] Rapid and Spread replace each other; collecting the active type refreshes
      the `BOOST` field and four-segment bar. It steps at the 75%, 50%, and 25% boundaries; below
      25% the last segment blinks for 8 visible and 8 hidden PAL frames. Neither
      timer nor the current blink phase advances during pause.
- [ ] Expiry, life loss, Game Over, and New Game remove `BOOST` and leave all ten
      booster HUD cells empty; a live sector transition preserves the active field.
- [ ] Shield is one steel-blue/white phased capsule with a black shield symbol. Its
      250-frame timer survives sector transitions, freezes during pause, and is
      cleared by life loss, Game Over, and New Game.
- [ ] Shield absorbs Interceptor shots, broadside impacts, debris, Interceptor contact,
      and hull contact without changing HULL, LIFE, SCORE, hit cooldown, flash,
      or HULL-hit SFX; at most one absorption is accepted per frame.
- [ ] The dense continuous Shield HUD bar uses boundaries 188/126/63 and the
      Player Fighter remains solid while COLPM0/COLPM3 pulse steel/white at the left,
      centre, and right side of the corridor.
- [ ] At native 320-pixel width, HULL plates remain low and angular while BOOST
      cells remain tall and narrow; the two indicators are distinguishable
      without relying on colour. Damaged HULL plates never blink or disappear.
- [ ] Spread projectiles cross empty space and successive Allied hull segments
      without vertical lines, blank cells, ghosts, or stale projectile glyphs.
- [ ] Repeat over the Hostile prow, midship modules, engine section, module
      boundaries, A2-head changes, and wrap with the same clean backing result.
- [ ] Overlapping projectiles do not erase a projectile that remains in the
      cell; the final departure restores the current hull or starfield byte.
- [ ] No combat state corrupts the HUD, gameplay charset, loader data, or the
      opposite capital ship.
- [ ] Losing a life clears life-scoped weapon state and respawns with the
      expected blink; losing the last life reaches Game Over.
- [ ] Finish consecutive games with 890, 690, then 750 points. After each
      Game Over, enter TOP SCORES through the menu and verify `890`; then
      `890, 690`; then `890, 750, 690` without restarting the program.
- [ ] New Game resets score, lives, hull, boosters, pickup sequence, projectiles,
      entities, effects, and sector state while preserving all ten TOP SCORES
      records.
- [ ] XEX and ATR show equivalent gameplay behavior for at least 120 seconds
      each.

## Real Atari 65XE via SIO2SD

Use a stock PAL Atari 65XE with 64 KB and boot the ATR through SIO2SD. Also run
the XEX through the owner's normal real-hardware loader path when available.

The current XEX and ATR pass in Atari800, but physical ATR/SIO acceptance is
still open. Repair and verify the fast disk-access path before treating an
emulator boot as evidence that the SIO2SD path is complete.

- [ ] Cold boot succeeds repeatedly after power-off, not only after warm reset.
- [ ] The 100-sector OS boot read is followed by verified SIO reads of extension
      sectors 101-157 through the repaired fast disk-access path.
- [ ] A deliberately truncated or CRC-corrupted test ATR stops on the fixed red
      loader error screen and never enters partially loaded code.
- [ ] Loader duration, menu transitions, audio, controls, pause, Game Over, and
      New Game match the Atari800 reference.
- [ ] The fixed HUD is stable on the connected PAL display and remains readable
      through heavy combat.
- [ ] Starfield and both hulls scroll smoothly without tearing, missing modules,
      vertical lines, or intermittent engine cells.
- [ ] Dim/bright engine animation is stable and does not alter non-engine hull
      pixels.
- [ ] Rapid Fire, Spread Shot, and Shield can each be collected, refreshed,
      replaced in the fixed rotation, and allowed to expire; pause freezes all timers.
- [ ] All three Spread Shot projectiles are yellow and form a clear symmetric
      fan without flicker or sudden horizontal jumps.
- [ ] Normal, Rapid Fire, and Spread Shot Player Fighter projectiles all remain yellow;
      Interceptor projectiles retain their separate Hostile red/purple bank.
- [ ] Spread projectiles pass over both capital ships, including prow, midship,
      engines, module boundaries, and wrap, with exact backing restoration.
- [ ] Long combat produces no ghosts, HUD damage, charset corruption, stuck
      tones, unexpected reset, or slowdown.
- [ ] SIO2SD can reboot the ATR after Game Over and after a power cycle.

## Failure classification

Classify a failure as artifact/boot, timing/synchronization, display/backing,
input, gameplay state, or audio. Preserve the failing artifact hashes. Emulator
success is necessary but does not close real-hardware acceptance.
