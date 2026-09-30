# Spread, capsules and level 2 timing — owner smoke of step 4 (2026-09-30)

Branch `feat/director-step-4-hull-length` at `a704e1a`. Diagnosis only: no
gameplay code was changed and no evidence was regenerated. Every replay below
is a focused, diagnostic run (`--artifacts=build/level-N-sM`) or a native 6502
harness run, and none of it is release evidence.

## Verdict on the Spread problem — class (3), and it reaches players today

**The owner saw a runtime defect in the Spread volley.** It is not caused by
the debug route and not by step 4. It is on `main` `a930ba0` in the
**default** level 1 ATR, and it already reaches players there. The owner's
default-build session did not meet its trigger; the debug-route sessions did.
Level progression will not add it — it is already reachable in level 1 today.

### The cause — `src/main.s`

* `update_player_fighter_weapon_emit` (`:4182-4184`):
  `jsr allocate_player_fighter_projectile` / `bcc update_player_fighter_weapon_done`
  — "rejected allocation is retried, not counted". A rejected emission leaves
  `PLAYER_FIGHTER_BURST_REMAINING` and the timer as they are, so it is tried
  again on the very next frame.
* `allocate_player_fighter_spread_projectiles` (`:4239-4252`): at
  `BURST_REMAINING = 2` (the volley) it allocates the **left** and the **right**
  side shot first, keeping whatever it gets. Then it allocates the centre
  (`:4248`). Only the centre's result decides success and the fire sound
  (`bcc allocate_player_fighter_projectile_rejected` at `:4250`, then
  `jmp play_player_fighter_projectile_sound`, `:4315`, channel 4).

If a volley begins with fewer than three free slots (active limit 5,
`build/fighter-weapons.inc:22`) while fire is held, the side shots take the
free slots and the centre is rejected. The emission is retried next frame, and
the next side shot takes the slot that just freed. **The pool stays full, the
centre never fits, the burst never advances, and the fire sound never
starts.** On screen there is a stream of single side shots that drift 1 HPOS
every 2 frames — near-straight, with no fan. It ends when Spread expires, because
the generic allocator takes over and the pool drains. That matches the owner's
report exactly.

The design says the opposite (`docs/game-design.md:276-283`): "a blocked
allocation remains one pending PairShot without accumulating catch-up fire". The
test that specifies it says "admits centre before an atomic side pair … never …
a partial fan" (`tests/weapon-pickup-spread-shot.test.mjs:316`).

### Direct observation

**Native harness, default build** (`initialiseRuntime`, Spread active, TRIG0
held, `update_player_fighter_weapon` + `update_fighter_projectiles` per frame,
200 frames):

| volley starts with | centre shots | left | right | fire-sound starts (`fire_timer = $32`) | frames with pool full |
| --- | ---: | ---: | ---: | ---: | ---: |
| empty pool | 10 | 5 | 5 | 10 | 0 |
| 4 shots live | **0** | **32** | **0** | **0** | **200** |

`BURST_REMAINING` stays 2 throughout the second case. **Identical figures on
`main` `a930ba0`** (temporary worktree, default build, ATR `abe3b181…`).

**Emulator replays — the committed default evidence set** (ATR, level 1). Seen
in these default-build replays whenever Spread was taken while the pool was
nearly full, often straight after Rapid. Each row is one Spread activation:

| replay (default build) | Spread from frame | length | frames with fire sound (`fire_sfx`) | frames with pool = 5 |
| --- | ---: | ---: | ---: | ---: |
| `capital-muzzle-ring-2-sweep-fire4` | 2280 | 405 | 6 | 403 |
| `director-complete-0-natural-sweep-fire0` | 8303 | 361 | 7 | 360 |
| `director-complete-2-natural-sweep-fire0` | 6326 | 500 | 11 | 493 |
| `memory-integrity-atr-2-hunt-fire6` | 2517 | 500 | 3 | 498 |

The same four activations, at the same frames and with the same counts, are in
the CSVs of **`main`'s own evidence run** (ATR `abe3b181…`). A healthy
activation, for comparison: `weapon-pickup-spread-0-hunt-fire4` f537, 500 frames,
148 fire-sound frames, pool = 5 on 0.

`build/level-1-s2`, the same Spread replay: the two activations are healthy
(79 and 146 sound frames). The fire-held replay: healthy too (147/500). Hitting
it depends on play, not on the build.

### What a debug-route build changes (A2)

Measured by diffing every generated file of the default build against
`build/level-1-s2/` (same result on `main`'s own builds):

* `scripts/build.mjs:935` — `-D LEVEL_DEBUG_START=1` for the Director
  whenever a debug route is built (the flag is `levelDebugId !== null`,
  `:1506`). `director_c_init` then reads `debug_start_sector`
  (`src/c/director.c:384-389`). This is the only code difference: `DIRECTOR_C_LOW`
  +6 B (`$8B88`, 68 → 74 B), and the containers that carry it (boot stage 2,
  chunk manifest, initial block, boot image).
* `scripts/build.mjs:2020` — the sector reader assembled with
  `-D LEVEL_DEBUG_ID=N` (`src/hybrid/sector-reader.s:196-200`). For N = 1 it is
  byte-identical to the default; for N = 2 `sector-reader.bin` differs by the
  immediate.
* `scripts/build.mjs:1935` — `debug_start_sector` stamped into the level's core
  page. Level N's image replaces level 1's.
* `isReviewVariant` (`:231`) — it only skips runtime measurement and evidence
  binding (`:2524`, `:2588`). Artifacts go to `build/level-N-sM/`.

All game code — `CODE`, `BROADSIDE`, pickup, entity and starfield runtimes —
is byte-identical between the default and a debug-route build. Nothing is
skipped or overridden at start beyond the Director entering sector M.

### When it came in (A4)

`main`'s debug builds (`--level=1:sector=2`, `--level=2`, built in a temporary
worktree) carry the same game code, and `main`'s default build shows the
livelock. So no step 4 commit introduced it. Step 4's `src/main.s` diff touches
only the `level-def.inc` include, the two resolvers and the sequence zero pin.
Origin by `git log -S`, **not replay-verified**: `db64ca8` (2026-09-16,
"fix(spread): fire left, centre and right as one simultaneous volley"). That
commit introduced the side-first volley. The retry-without-counting emit is older
(`3f044cc`, 2026-08-12).

## B — does a recorded failure cover it?

**No recorded failure catches it, although three recorded test failures are
the tests meant to catch it.**
* `tests/weapon-pickup-spread-shot.test.mjs:316` "Spread respects the
  six-projectile active budget and admits centre before an atomic side pair",
  `:352` "the configured 28-frame Spread cooldown avoids catch-up at the active
  limit" and `:188` "one Spread emission is an unambiguous three-projectile fan"
  are among the 108.
* Each fails at its **first** assertion, on stale pins: pool slots and active
  limit `[10, 6, 3, 6]` expected against `[5, 5, 1, 4]` built, `3 !== 6`, and a
  render-id tuple. So the partial-fan, deferral and catch-up assertions that
  follow never execute.
* The recorded status has masked this defect.
* None of the 16 recorded clause failures concerns Spread.

## C — when level 2's capital begins

**The data.** The capital is sector 3 on authored row 1,120
(`assets/levels/level-02.json`), at world scroll 8/9/10 over 20 rows per frame.
Level 2's own notes estimate frame 2,800 / 2,489 / 2,240 (56 / 50 / 45 s).

**The replays** (`build/level-2-s0`, `director-complete-{0,1,2}`, fire held,
three player deaths before the capital in each):

| | EASY | MEDIUM | HARD |
| --- | ---: | ---: | ---: |
| Director enters sector 3 | f2872 (57.4 s) | f2535 (50.7 s) | f2311 (46.2 s) |
| capital hull begins (first non-fighter state) | **f3173 (63.5 s)** | **f2615 (52.3 s)** | **f2465 (49.3 s)** |
| back to fighter after the hull | f4208 | f3536 | f3294 |

Sector entry comes 46-72 frames after the estimate. The replay frame count starts
at the trace's first frame, and the three deaths are the likely cause, but this
was not isolated. The hull waits for the playfield to drain
(`sector_c_drain_clear`): 80-301 frames more. **Fly about 50-65 s, and longer
if enemies are left alive.**

## D — capsules on level 2

**Level 2 does schedule pickups.** Every sector authors `hazards.pickups: true`,
and `pickupPolicy` is 3.

**But a capsule comes only from kills that qualify:**
* every third **Heavy** member (Raider or Bomber) destroyed by a player shot
  (`resolve_enemy_damage`, `src/main.s:5289`);
* every third **debris** destroyed by a shot (`debris_shot_reward`,
  `:11965-11976`).

**Light kills (Interceptor, Wingman) never count.** The core page's
`pickup_policy` byte is not read by the runtime; the three is
`WEAPON_PICKUP_QUALIFIED_KILLS` (`build/entity-effects.inc:90`).

Level 2's sectors 1 (Light swarm), 3 (capital) and 4 (Interceptors only) can
therefore earn capsules only from shot debris. MEASURED:
* `level-2-s0` replays spawned capsules in sectors 2, 5 and 6 only (EASY 4/0/3/2,
  MEDIUM 2/0/4/6, HARD 2/0/3/5 across sectors 2/3-4/5/6).
* `build/level-2-s2`, MEDIUM, starts at the capital. Sector 4 begins at f924, and
  the **first capsule arrives at f2759 (55 s), in sector 5**; there are 8 in
  10,500 frames.

**The debug route skips no pickup initialisation.** The capsule counter, type
rotation and hazard gate are initialised exactly as in the default build (the
game code is identical, see A2). "No capsules" in `level-2-s2` is level 2's data
meeting the kill rule.

**Found on the way:** `docs/game-design.md:215-218` says only a Raider killed by
a shot qualifies and that debris does not. The code counts Bombers and shot
debris too (the debris rule was an owner decision on 2026-09-22, per the
comment at `src/main.s:11944`). The document is stale on that point.
