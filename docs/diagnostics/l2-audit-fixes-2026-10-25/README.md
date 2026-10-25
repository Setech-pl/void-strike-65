# L2 audit fixes — BLOCKED_BYTE_PLACEMENT

Owner instruction, 2026-10-25: smoke of `b2b38ff` PASS ("generally OK");
fix L2-01…08 on `codex/l2-phase-module`, with a complete-fix 32-B cap and
STOP beyond it. This is a partial task result, **not a new owner-smoke
candidate**, acceptance, or release evidence. No production source changed.

Report-only merge `66f53b9` brings in audit `668f692`. The report remains
unchanged, SHA-256
`e5cf25b187ed68f67c04971f13491e8722217de8a238dd9359ec36e173ac6458`.

## Fixed: L2-01 (`52ee66b`)

The scroll test now executes the real `$A000` START GAME reader entry through
the summary's checked L2 read and INIT. It checks the entire L2 image, capital
slot A and capital vectors, then executes `profile_after_player` through
`profile_after_enemy` before the original `rotations >= 9` assertion.
The rate table restore is retained and checked; that table now controls
pickup motion. No assertion or gate is relaxed.

Both **complete** boss-runtime runs are retained:
[branch](boss-runtime-branch.log), [main 19b1464](boss-runtime-main-19b1464.log).
Main was freshly built in a temporary detached worktree, then removed.

| Test (all 13 in tests/boss-runtime.test.mjs) | Fixed branch | main 19b1464 |
| --- | --- | --- |
| Director BOSS_DUE and drained admission | PASS | PASS |
| Decision 32: black/banner/theme/run order | PASS | PASS |
| Install: slot A/charset/vectors/band/handshake | PASS | PASS |
| Gameplay list keeps two DLIs | PASS | PASS |
| World stops in boss, runs after START GAME restore | PASS | PASS |
| Band HSCROL/LMS/three DLIs | PASS | PASS |
| Column map | PASS | PASS |
| Shots against band | PASS | PASS |
| Cover group/core/chain bonus | PASS | PASS |
| The win: chain/shake/flash/summary time | FAIL, pre-existing | FAIL |
| Q-S4 complete START GAME restoration | PASS | PASS |
| Q-B6 boss work <=7,000 | PASS | PASS |
| Cavity glyph | PASS | PASS |
| Total | 12 PASS / 1 FAIL | 12 PASS / 1 FAIL |

The identical first failing assertion/message is
`assert.ok(handedOff, "the boss never handed off to the level summary")`:
fixed branch `tests/boss-runtime.test.mjs:639`, main `:623`. This is recorded
as a **pre-existing failure**, not a passed test or owner acceptance of a
new failure. No full test run or failure-ledger change was made.

## STOP: L2-04 literal lethal-hit invalidation

`apply_player_damage` publishes DYING in the lethal tail of `src/main.s`.
`main_loop` continues the simulation, world, hull contact and publication
while dying; `player_dying_tick` eventually calls `respawn_player` without
a START GAME read. This is still capital gameplay, with the L2 image and
lookup in use. It is not a teardown to the menu.

The instruction explicitly requires valid=0 on death as well as GAME OVER.
Clearing valid and the brake/rate at a lethal hit alone leaves the next
capital consumers executing an invalid image. Calling INIT without a
checked read would violate the requested invariant. Adding guards on those
per-frame consumers would violate the no-new-per-frame-cost condition.

[death-reload-budget.s](death-reload-budget.s) prices a cold route using the
existing checked read and pause-display restore. It is a **size sketch**, not
integrated production code and **not a proof of the minimum possible size**.
[budget.mjs](budget.mjs) runs the existing ca65/ld65 toolchain; reproduce with
`node docs/diagnostics/l2-audit-fixes-2026-10-25/budget.mjs` after a normal build.
[Assembled result](budget-result.json):

| Fragment | Assembled bytes |
| --- | ---: |
| Clear validity in existing disarm | 3 |
| Resident validity byte | 1 |
| Set validity after checked load + INIT | 3 |
| START GAME fail-closed guard, including legal BAD_IMAGE status | 10 |
| Frontend exit call | 3 |
| Pause-quit exit call | 3 |
| Head-of-load disarm call | 3 |
| Cold subtotal | 26 |
| Lethal-hit checked reload / resume, bypassed for installed boss | 26 |
| Aggregate | **52 (51 code + 1 state)** |
| Authorized cap / excess | **32 / 20** |

Boss-entry disarm already exists. Level-end blank can be replaced at equal
size; cold/RESET transports zero validity. Hook replacements are equal size.
The existing 17-B summary load helper needs relocation or a different
integration to make room for its new 3-B call; MAIN and summary placement
and page crossings have **not** been validated. Further integration can
increase the price. L2-02 costs are **excluded**, not hidden in this sum.
No protected address is allocated by the sketch.

Two priced directions, both preserving the platform and C/ASM ownership:

| Direction | Player-visible effect | Bytes | CPU / raster | Limit / risk |
| --- | --- | ---: | --- | --- |
| A: invalidate on each lethal hit, checked reload before capital simulation resumes | Blank/read pause at each non-boss death | **52 assembled fragment B**, +20 over cap; final placement not certified | No steady-state guard; synchronous 14-sector read under blanking; added latency not newly measured | Requires a larger byte authorization; scene/PMG/audio restoration and death timing need implementation and native validation |
| B: keep the installed image valid during DYING/respawn; invalidate on actual GAME OVER/gameplay teardown | Existing uninterrupted death animation/respawn | **26 assembled fragment B**, 6 below cap, excluding any later integration overhead | Cold exit/start checks; no death read, no per-frame guard | Changes the explicit death-valid=0 requirement; not authorized or implemented |

There is no claim that all smaller implementations have been ruled out.
The priced literal-death route exceeds the owner's cap, so the explicit STOP
rule applies **before integration**. Smallest recovery for this route: at
least **20 additional authorized bytes**, followed by real placement and
timing validation. Direction B needs an explicit scope decision instead.
No option was silently selected.

## Build and unchanged linked ledger

The [normal build](normal-build.log) passes all computed gates, with the
expected stale-runtime-evidence WARNING (release build will fail). ATR:
`bcf3fe86fe874c6aed6c97f7924f06c4a701e8a61797786d7bee5614d8b5ac10`.
Only the host test and diagnostics/docs changed: production CPU and linked
RAM/residency delta against `b2b38ff` are **0**. This does not establish the
requested SPACE ±2 target against main; L2-02 remains open.

| Linked owner | Used / capacity B | Free B |
| --- | ---: | ---: |
| L2 | 1,063 / 1,792 | 729; 256 reserve intact, 473 otherwise free |
| C sector | 241 / 248 | 7 tail; 75 pinned padding reclaimable |
| Reader | 1,529 / 1,536 | 7 |
| Summary | 1,792 / 1,792 | 0 |
| MAIN Light | 1,196 / 1,213 | 17 |
| Director high | 634 / 645 | 11 |
| C arena | 818 / 832 | 14 |
| ENTITY_CODE | unchanged | 5 |
| HYBRID_C_EXT | unchanged | 24 |
| A2 kernel | unchanged | 19 |
| BASIC window | 1,656 / 3,584 | 1,928 total; protected ranges unchanged |

No new per-frame routine address changed; new page crossings **0** because
no production code changed. Native SPACE A/B, route matrix/over-target counts,
broadened lifetime observer, stress, boss-entry, post-boss reload/pause,
boot/RESET and the six final-HEAD ATR rebuilds are **not run** at this STOP.
Earlier recovery data remains historical and is not presented as verification
of the requested fixes. L2-02…08 remain open; L2-07's current STATUS handoff
is updated, but its other corrections remain open.

No fresh candidate manifest is issued. Existing owner-smoke artifacts still
identify `b2b38ff`; they must not be relabelled as a fixed audit candidate.
NEXT TASK: resolve the L2-04 price/scope STOP, then resume remaining findings,
all requested measurements and final-HEAD candidate generation. No main merge.
