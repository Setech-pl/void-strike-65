# Roadmap 4.5d — not committed: one hard gate failed

> **Update 2026-09-18.** Superseded gate result. The WIP was committed as
> `7b50bd6` (not a candidate); `scripts/pal-timing-audit.mjs` then showed the
> real failure was two dropped PAL frames (report option 2 was taken). With the
> death-frame deferral candidate on top, the full audit set passes with 0
> distinct miss events: see
> [stage-2b2r-death-frame-deferral.json](stage-2b2r-death-frame-deferral.json)
> and STATUS. The cost figures below were corrected on the same date.


The 4.5d plan is implemented and builds, and every gate passes except the debris gate. So I stopped before committing and did not update STATUS, game-design, art-direction or memory-map, as you instructed. Nothing is pushed, and 4.6 is not started.

## What failed
The debris gate passes on `0-evasive-fire3` and `capital-muzzle-ring-2-sweep-fire4` but fails on `0-neutral-fire0`: 32 frames show blank debris, out of 1,264 in view after the capital sector. HEAD `2a8ff26` passes all three on its own replays, which play out differently.

- **Cause (measured):** at host frame 3007 the player dies while both Bombers are on screen. In the same frame there is a +5 kill and ring work, with 8 projectiles in flight. The work before the render wait reaches 25,656 cycles.
- **Why that costs a whole frame:** `wait_frame_at_line` only exits when the beam is exactly on its line (scanline 238). That frame arrived too late, so it waited one extra PAL frame and measured 62,682 cycles.
- **The 32 blank frames all follow that one overrun.** The tracer's frame alignment shifts after it and only recovers when the next game starts.
- **How much is 4.5d (MEASURED 2026-09-17, native frame profiler on `raider-remnant-rapid-xex-hard` row 1945; the original "~270 cycles" estimate was wrong):** the 4.5d behaviour adds only +36 cycles to the death frame (neither Bomber fires on it). What the Bombers cost is their **standing** per-frame price: `integration_update_enemy` is 4,630 cycles per frame with two Bombers live, 2,166-2,315 per member (`heavy_member_update` ~946 incl. the C tick, `draw_enemy_member` ~1,164, `erase_enemy_departing_row` ~56). The death frame itself is +6,636 over an identical-cadence quiet row: death +4,317, kill/score +3,009, projectiles −862. The miss is therefore the standing Bomber cost plus the death+kill+ring coincidence, and the same shape appears in both audited miss events (the death is a Light contact kill inside `light_update`, after the enemy update and the ring rotate have already run).

## Gates
| Gate | Result |
|---|---|
| `build:candidate` | PASS. XEX `838a9686…`, ATR `f8fd090d…` |
| Focused tests (15 files) | 208 tests, 14 failing; all 14 already fail at HEAD |
| Boot smoke XEX/ATR (after `--prepare`) | PASS 4/4. XEX menu 392; ATR menu 554 vs deadline 554, still 0 frames margin |
| Arena write-watch | PASS 4/4: image exact at start, 0 writes |
| Four PAL replays | max 29,619 / 29,744 / 29,464 / 29,075 cycles; 0 missed frames, 0 extra VBI, 0 DLI errors |
| Both Bombers active and firing | Natural replay `2-neutral-fire0`: shells from both Bombers in flight on 410 frames, all four Bomber shell codes (`$DC/$DD/$E6/$E7`) visible |
| Shots after emitter death | `2-sweep-fire6`: 278 shell-frames continue after their Bomber is gone |
| Debris gate | **FAIL 2/3** (above) |
| Full suite | 667 tests, 114 failing; failure names identical to HEAD |

## Measurements
- **Arena:** 392 → 614 of 832 B, 218 B free. By part: ASM 20 → 71 (the glyph builder and its table moved here from BROADSIDE), C 339 → 504, RODATA 33 → 39.
- **Arena record and transport:** the record grows from 355 B in 3 sectors to 558 B in 5, so transport goes from 180 to 182 sectors.
- **Tails:** EXT 28 → 19 B (floor 16), ENTITY 40 B unchanged. BROADSIDE raw size and all addresses outside its fixed 70-B slot are unchanged; packed size 5,667 → 5,641 B.
- **BSS:** +2 B: `HYBRID_HEAVY_STATE` grows from 9 to 11 B (`$811B-$8125`). `$8122-$8123` were the 4.5c C scratch and now hold `heavy_member_aux` (hit-flash/HP latch) and `heavy_member_colour`; the scratch moved to `$8124-$8125`, the newly owned bytes. (An earlier version of this report called `$8122-$8123` "previously unowned"; that was wrong.) The plan estimated +1 B, but the hit-flash byte needs its own C variable as well as the colour byte.
- **Projectile glyphs:** 8 of 20 used (90–93 and 100–103).

## Per-enemy changes
- **Bomber movement:** it sweeps, then brakes and freezes, charges for 20 frames, fires 2 shells 8 frames apart from one column, and sweeps off in a new direction.
- **Bomber fire:** reload 64/52/40 frames. It now fires 10/12/16 shells per pass on EASY/MEDIUM/HARD, up from 4/5/7.
- **Bomber time on screen:** 422 → 562/590/646 frames, when the Bombers are never shot. That is well above the plan's estimate of about +85 frames on MEDIUM.
- **Bomber visuals:** retouched QUAD silhouette with the same hull colour `$24`. The hull brightens to `$28` while charging and flashes `$2A` for 6 frames when hit.
- **Bomber shell:** a torpedo whose exhaust flickers between two frames. Its speed, damage and allocation are unchanged.
- **Raider, Wingman, Interceptor:** unchanged.

The evidence is in `docs/diagnostics/stage-2b2p-enemy-identity-freeze.json`. A copy of the build is in `build/owner-smoke/enemy-identity-UNCOMMITTED-838a9686/`; it is not an OWNER-SMOKE CANDIDATE.

## Decision needed
1. **Accept the explanation:** treat this as an existing death-frame budget problem that this replay happened to hit. I would then commit, update the docs, label the build OWNER-SMOKE CANDIDATE, and record the issue as open.
2. **Fix the death frame first, as its own bounded task:** spread part of the death work (explosion start, clearing effects) over the next frame, then rerun all gates and commit 4.5d.
3. **Tone the Bomber down:** 1 shell per attack or a longer reload means fewer shells in flight when the player dies. It doesn't fix the underlying problem; it only makes the pile-up less likely.

I recommend option 2, then commit 4.5d once the gates are rerun.
