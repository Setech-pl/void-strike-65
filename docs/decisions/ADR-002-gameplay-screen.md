# ADR-002: mixed ANTIC and Player/Missile gameplay screen

Status: accepted

## Context

The accepted composition combines a fixed text HUD, scrolling capital hulls,
stars, fighters, pickups, effects, and many projectiles. A full bitmap would
consume too much RAM and make smooth scrolling harder on a stock 65XE.

## Decision

- The fixed HUD and divider use ANTIC 2 with a dedicated RAM charset.
- The 27-row scrolling ring uses ANTIC 4 with a separate gameplay charset; a
  fixed divider row above it completes the 28-row gameplay raster.
- The playfield palette is black, cold white/steel, amber/yellow, and a switched
  red/burgundy bank.
- `P0` and `P3` form the Player Fighter.
- `P1` and `P2` are the two **Heavy** enemy players, each an independent
  monochrome body. Neither is a colour or scanner overlay of the other.
- **Light**-class enemies allocate no PMG player at all; they use the ANTIC 4
  character renderer over the gameplay ring.
- `M0-M3` form the fighter-sector pickup in fifth-player mode (`PRIOR=$10`,
  `COLPF3`). In the capital sector `M1-M3` resume broadside warning/impact
  ownership, so an active pickup is removed before that transition.
- Player Fighter projectiles use restored ANTIC 4 overlays, so their ten-slot
  pool and yellow colour do not inherit `COLPM0`.
- No PMG multiplexing. New independently coloured moving objects require fresh
  PMG, memory and PAL timing evidence, plus an explicit owner decision, before
  multiplexing is reconsidered.

## History

The original text assigned `P1` to the pre-Raider "Interceptor" and `P2` to a
red scanner overlay for the same machine. That ownership is obsolete: the
accepted runtime draws two independent Heavy Raiders. The planned Light-class
Interceptor archetype is unrelated to the old `P1` assignment and never takes a
PMG player.

## Consequences

The layout keeps the accepted visual hierarchy without a full-frame bitmap.
PMG capacity remains explicitly bounded, while character overlays support
stable multi-projectile weapons and backing restoration over moving hulls.
