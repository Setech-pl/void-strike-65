# Capital content v2

Status: **BLOCKED_C_ABI_GATE — WIP STOP at increment 0.** Phase 0 checkpoint is uncommitted; no smoke candidate. No completed gameplay implementation or owner-smoke candidate.

| Increment | Play ATRs |
| --- | --- |
| 0 | Build rejected before link; no play ATR or SHA-256 |
| 1–3 | Not started; no play ATRs |

Branch `codex/capital-content-v2`, baseline `5053697`. Amendment 1 is accepted
as the active task specification: separate minefield hazard with islands and
brake, no hulls/turrets/fighters; bonuses in both hazard and capital. Window
allowance64 B, shipped level1/2 unchanged, diagnostic delivery only.

## Phase 0 timing reconciliation

Fresh normal build passed computed gates, expected stale release evidence
warning retained. Registered fifteen-route native process exited0: all routes
passed. It includes the twelve L2 combinations; none is omitted or counted as
an independent extra route. Overall peak31,432, capital30,025; all boss entries
325 host frames. No gate was relaxed.

Capital distribution, 31,477 frames: p50 15,479; p95 24,491; p99 26,711;
max30,025 wall cycles. Top20 with event flags and measured profile intervals:
[baseline.json](../diagnostics/capital-content-v2/baseline.json).
The 17,660 historical figure predates islands/slalom, as the frame-split audit
explicitly records. Current measurements use the same standard start/end wall
timer on the current image, including islands/slalom. Do not budget from17,660.

| Frame type | Worst wall | Budget after300 safety |
| --- | ---: | ---: |
| Ordinary: steady phase2, no live hull explosion or music row | 28,936 | 2,264 |
| Event: other phase, live hull explosion or music row | 30,025 | 1,175 |
| Conservative accepted composed capital bound | 30,315 | 885 |

The existing pre-tick signal MUSIC_ACTIVE && MUSIC_ROW_TIMER==1 predicts a
music row. End-of-loop snapshots (timer6) identify those frames in the
summary. Phase state and explosion timer supply other event signals.
The conservative accepted composed bound remains29,128+1,187. New measured
profile interval subtraction gives30,283, but does not replace that bound:
interval and exclusive-PC accounting boundaries differ.

[Exclusive retained-peak attribution](../diagnostics/capital-content-v2/reclaim-attribution.json)
records CPU/wall costs for hull/scroll, broadside, turret and explosion-labelled
code on each route. These are measured executed-PC costs; their reclaimable
fraction is ESTIMATE because shared helpers, DMA and beam alignment remain.
A native hazard-without-content baseline is required in increment2.

## Module home proof progress

Static owners overlap $1180–$18FF in boot/boss phases. No allocation is made.
A host-only observer covers CPU byte/word data reads, opcode/operand fetches
and byte stores. It does not claim DMA or host-patched SIO write coverage.
The direct480 EASY flight route passed with zero observed accesses during
SPACE/capital. Boot and boss accesses were recorded as expected.
Four terminal-state-seeded boss fixtures passed real boss entry/fight/death,
summary, menu and level reload. Death peaks: R1 29,535; R2 29,360; R3 29,532.
Region4 and detailed bindings are in
[home-progress.json](../diagnostics/capital-content-v2/home-progress.json).
All four report zero misses, DLI/image errors, SIO failures and restore errors.
Exit/pause/brake/game-over/RESET observer matrix passed8/8, with no observed
CPU access to the home outside boot/boss ownership. This supports the lifecycle
in the plan; hardware smoke remains required.

## Plan, resources and fallbacks

[Working plan](../plans/capital-content-v2.md). F1 screen-cell fallback selected:
no exclusive GTIA bank is proved across existing art, DLI palettes and latch
clears. No per-tick full-mask scan is permitted. Other fallbacks are planned,
not yet exercised by production code. D2 amber$28 requires no colour edit.
No linked arena/reserve/M3-H/record5/boss/summary/menu/lance allocation changed.
The WIP declares CC2_POLICY in the existing window; its linked size is unknown
because the ABI gate rejected compilation output before assembly/link. Added load time not measured yet.
No component cost, passage proof or mine/bonus runtime is claimed.

## Validation and delivery status

No full npm test, release build or release-evidence refresh. Diagnostic helper
syntax checks passed. Raw data lives in build/evidence/capital-content-v2;
the existing native runner also retains its input-local traces. Compact
committed-intent summaries currently total less than70KB.
No native process is left unaccounted for: baseline and all four boss jobs
and all eight exit fixtures exited successfully. No native job remains active.

One exit launch initially lacked generated ownership images and terminated
before gameplay. Images were generated with the existing helper and the
fixture restarted. This setup failure was not a measured hardware gate failure.

No owner questions or new owner decisions. No merge/push/tag/rebase/branch
switch/worktree operation. STATUS records this branch blocker; the memory map records the unlinked WIP
without modifying generated baseline ranges.

## Pending owner smoke checklist

- EASY no-fire clear; islands constrain dodging; weave/shoot is a real choice.
- One shot starts a staged chain, one mine per step; side mines within reach.
- Contact2 without own-blast double count; blast1 only inside radius.
- Shield/respawn, brake, pause and field persistence after death.
- Bonus+100 with no capsule/P3 death conflict; capital bonuses without mines.
- 480/960 and all authored lengths scale; no Heavy/fighters in hazard.
- No turret shots/hull scroll in hazard; 65XE/SIO2SD flicker and load time.

## Increment 0 STOP

Normal build failed at scripts/build.mjs's existing Director ABI validator:

```
C Director unexpectedly requires cc65 software-stack/zero-page state:
stx tmp1 | rol tmp1 | sta ptr1 | ora ptr1
```

The gate permits zero executable helper-state references; four offending
instructions were reported. No gate was weakened. This is a confirmed build
failure, not a measured timing or RAM exhaustion claim. The compound
row-coordinate expression is the likely source (inference); generated assembly
was not dumped by this run. The smallest next experiment is explicit scalar
byte operations, then the unchanged ABI and placement gates. F7's specified
L2 indexed-write fallback was not applied to this Director expression.

The retained WIP derives a120-row departure runway from sector length, refuses
Heavy admissions there, cancels pending Heavy count, chooses normal one-line
Raider descent, and gives Bomber a no-fire one-line exit through the existing
PMG publication/retirement path. A two-frame clear guard precedes Director
capital admission, including early wave exhaustion. The helper bomber_may_fire
is relocated to fund the Bomber branch without planned arena growth. None of
these behaviours has passed focused execution/native verification. Window64,
per-row60, boss stress, drain reduction and all other increment0 gates remain
UNMEASURED, not passed. The WIP must not be merged or used for owner smoke.

| Increment | L2 | Window | Module | Reader | Level image | Initial content | Sectors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Phase0 baseline (source/status) | 1,250 B | 2,065 B | 0 | 1,529 B | 2,048 B | 12,825 B | 16 level /214 transport |
| 0 attempt | No linked result | CC2_POLICY unlinked | 0 | No source change | No source change | No linked result | No linked result |
| 1–3 | Not started | Not started | Not started | Not started | Not started | Not started | Not started |

CPU deltas/component timings/load delta: unavailable for the rejected WIP.
No new main-loop CPU result is claimed. Baseline native evidence remains bound
to5053697 and does not validate these source changes. No increment play images
were produced; no launch command is supplied for a nonexistent candidate.

Git staging failed once with index.lock / Operation not permitted in the
external worktree git-dir. Per owner instructions no retry or workaround was
made, including for the STOP checkpoint. Everything is uncommitted. Suggested
owner checkpoint message: `WIP STOP: [codex] capital-content-v2 Director ABI gate`.
No rejected production edit was rolled back, as requested.

## Chat summary

BLOCKED_C_ABI_GATE at increment0; build stopped before link.
Phase0: fifteen routes, four boss lifecycles and eight exits passed.
Capital p50/p95/p99/max:15479/24491/26711/30025 wall cycles.
Overall baseline peak31432; conservative composed capital30315.
Amendment1 recorded; no mines/bonuses implemented.
WIP Heavy policy retained but unverified; no play ATRs.
Branch codex/capital-content-v2; HEAD5053697.
Git index.lock denied; all changes uncommitted, no retry.
Next: owner-authorized scalar-C ABI repair and unchanged gates.

