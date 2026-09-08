# Void Strike 65 roadmap

This roadmap separates the current product from the next approved work. It has
no delivery dates. Player-visible current rules are in
[game-design.md](game-design.md); old milestone cards are archived in
[history/roadmap-checkpoints.md](history/roadmap-checkpoints.md).

## Current release state

The repository currently contains:

- a deterministic XEX and bootable ATR for stock PAL Atari 65XE hardware;
- loader, main menu, options, top scores, exit, pause, Game Over, and New Game;
- menu music, gameplay music, and gameplay sound effects;
- `SCORE`, `LIFE`, and `HULL` HUD state;
- parallax starfield and the scrolling Allied/Hostile broadside sector;
- two-phase dim/bright capital-engine animation;
- the Interceptor, its projectile weapon, damage, score, and breakup;
- interactive debris, destructible debris, contact damage, and breakup effects;
- bounded entity and effects pools with reverse erase;
- Rapid Fire Booster;
- Spread Shot Booster, including the accepted backing/erase correction,
  all-yellow Player Fighter fan, and symmetric readable trajectory;
- ordinary Hunter/Interceptor waves before and after the capital-ship sector,
  with existing enemies and released pulses draining naturally before admission
  and no ordinary respawn during the complete hull reconstruction;
- corrected pickup phase-bank addressing for all booster types and all eight
  vertical phases; owner smoke passed for wave separation and capsule rendering;
- mode-specific Player Fighter burst balance: eight shots for Normal, ten for Rapid, and
  eight atomic three-projectile salvos for Spread;
- deterministic cold-RAM, XEX/ATR parity, memory-integrity, and PAL wall traces.

## Immediate work

1. **Known raster follow-ups** — diagnose flickering distant dark-blue stars,
   debris missing from some rendered frames, and the previously observed
   post-sector Hunter-projectile raster failures. A playthrough without visible
   capital-sector debris remains unexplained; the ordinary-wave gate does not
   block `integration_debris_spawn`.
2. **Player Fighter visual unification** — align the runtime craft with the
   approved silhouette, markings, and worn military visual direction.
3. **Pickup drop-cadence tuning** — use owner playtest feedback to revisit the
   current every-third-qualifying-Interceptor-kill cadence. The present value is
   implemented behavior, not accepted final balance; this task must change it
   explicitly rather than editing documentation alone.
4. **Spread Shot and Shield follow-up** — continue their presentation and
   balance review without describing either implemented booster as future work.

## Later work

Later work remains subject to owner prioritization and fresh memory/timing
measurement:

- six playable enemy types drawn from the review roster;
- a three-module weapon structure and authored enemy formations;
- a modular defense platform and a modular boss encounter;
- **Nova Missile** — after the current booster set, design a fourth pickup as a
  boss-only, single-shot special weapon outside the ordinary pickup rotation.
  Specify it together with boss lifecycle/HULL and the budget for its
  single-damage, multi-phase detonation; it must never spawn in standard
  sectors or from the Interceptor-kill counter;
- further sound, music, feedback, and presentation polish;
- physical Atari/SIO2SD acceptance and release packaging.

No item here authorizes a larger pool, another DLI, use of BASIC-ROM memory, or
a change to the 50 FPS PAL contract without a measured design review.
