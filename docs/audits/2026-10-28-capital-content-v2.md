# Capital content v2

Status: **BLOCKED_WINDOW_BUDGET — increment 0 WIP STOP after Amendment 2.** C ABI repaired; no smoke candidate. No completed gameplay implementation or owner-smoke candidate.

| Increment | Play ATRs |
| --- | --- |
| 0 | Build rejected before link; no play ATR or SHA-256 |
| 1–3 | Not started; no play ATRs |

Branch `codex/capital-content-v2`, current HEAD `6a8d39a` (owner committed the prior WIP); gameplay baseline `5053697`. Amendment 1 is accepted
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

## Amendment 2 continuation — 2026-10-28

Owner Amendment2 extends F7 to every C module. Used option1: split the
compound shift/OR into explicit byte operations. The unchanged mandatory
ABI validator now passes; the normal build reaches ld65. Options2/3 were not
needed to remove helper state. The exact routine, assembled with matching
-Oirs/6502 flags and scalar declarations, shrinks99→96 B (−3). The repaired
production routine's listing independently confirms96 B. This fixes the
previous ABI blocker; it does not validate the Heavy gameplay policy.

The linker then reports DIRECTOR_RAM overflow15 B. Before relocating it under
the <=32-B allowance, the window inventory establishes an independent hard
failure. Existing toolchain ca65 assembled the generated C objects without
linking or relaxing the production gate:

| New window contribution | Assembled bytes |
| --- | ---: |
| Three state bytes | 3 |
| Heavy departure tick | 96 |
| Two-frame entry guard | 62 |
| Relocated bomber_may_fire | 36 |
| **Task window additions** | **197** |
| **Allowed / excess** | **64 / 133** |

These are assembled segment sizes, not estimates. Given baseline2065 B,
projected window usage is2262 B, leaving549 B rather than the required682 B.
No successful new link exists. The fix itself saves3 B; it exposes the prior
WIP's oversized allocation rather than causing that whole197-B growth.
Recovery must remove or legally place at least133 B of current window additions
and resolve the separate15-B Director overflow, preserving all reservations.
No claim is made that every possible redesign is impossible. The measured
attempt exceeds the owner's unchanged byte gate, so it is retained and stopped.
No gates were weakened, no reserve consumed and no further runtime started.

[Assembly evidence and hashes](../diagnostics/capital-content-v2/amendment2-stop.json).
Raw listings/objects: build/evidence/capital-content-v2/amendment2/;
build failure: build/evidence/capital-content-v2/amendment2-build.log.
Reproduce the read-only assembly inventory with
`node scripts/capital-content-v2-assembly-sizes.mjs` after dumping the generated
C assembly with VS65_DUMP_GENERATED=1 on the normal build.

Amendment3 is acknowledged: future deferrable steps need an in-frame beam-time
check plus event checks, at most two deferrals, and a measured safe forced-run
path. Non-deferrable capital bonus work must fit885 cycles; the hazard uses its
own measured baseline. Content implementation was not reached, so no threshold,
threshold derivation, deferral counts or timing guarantee is claimed.

Current CPU/RAM/ATR status: no linked candidate, no new runtime measurements,
no play ATRs. The prior fifteen-route/boss/exit evidence validates5053697 only.
All native jobs are finished. No full tests or release work ran.

## Chat summary

BLOCKED_WINDOW_BUDGET at increment0, current HEAD6a8d39a.
Amendment2 option1 fixes the C ABI gate and saves3 B (99→96).
Assembled window additions197 B exceed64 B by133 B.
Projected window free549 B, required682 B.
Separate DIRECTOR_RAM link overflow15 B remains unresolved.
Amendment3 recorded; content threshold/deferral measurements not reached.
No candidate ATR, new native run, merge, push or release.

## Owner checkpoint commands — Git write refused

Staging failed once: external worktree index.lock / Operation not permitted.
No retry or workaround was attempted. Run in this worktree:

```sh
git add src/c/director.c scripts/capital-content-v2-assembly-sizes.mjs docs/audits/2026-10-28-capital-content-v2.md docs/plans/capital-content-v2.md docs/STATUS.md docs/memory-map.md docs/diagnostics/capital-content-v2/amendment2-stop.json
git commit -m "WIP STOP: [codex] increment 0 window budget after scalar C ABI repair"
```
