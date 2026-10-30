# Phase-resync task audit

Owner-created task branch `codex/phase-resync`, baseline main `a066098`.
The agent never switched this checkout's branch. A detached main measurement
checkout is temporary and is removed before handoff. No push/merge/tag/release.

## Scope

Only the existing loop-tail JMP and previously unused resident padding change
in the guest. All old linked main labels and segment sizes are preserved.
Host-only fault/capture tooling is reused from spike `a378dc2`, with a build/
evidence destination and explicit control/recovery comparison helpers.
No injector is present in either play disk.

The delivered result is a **partial recovery**. It meets next-frame phase
recovery and exact no-injection controls. It does **not** meet a universal
one-mixed-raster-per-miss goal. See [measurements and alternatives](report.md).
There is no OWNER-ACCEPTED claim; real Atari/SIO2SD smoke remains pending.

## Gates

* Normal build/computed byte/startup/transport gates PASS. Residency/RAM 0 B;
 23 padding bytes become executable; packed initial content +22 B, sectors +0.
* Final linked NMOS tail/gate tests 5/5 PASS, plus final focused PAL/routes/
 freshness/acceptance checks 28/28 PASS.
* Initial broader focused set 28/29: shared stale starfield source-pattern
 assertion at `master-pal-clock.test.mjs:120`; deliberately left unchanged.
* Four matched-main controls: logical snapshots identical, 575/575 native RGB
 rasters identical each. All physical admission frame numbers agree.
* Forced misses: 84/84 injected busy-waits restore guest code; repeats are
 exactly 25 physical frames apart. Every next admitted loop has normal phase.
 Zero DLI-order/stale-L2/world-hull violations. Transient limitations remain.
* Quick Spread NORMAL 30,465; capital-960 NORMAL 31,153 cycles. Worst 31,153,
 1,415 hard-gate margin. No full native/home/release matrix or strict release.
* Full npm test: main 1,483 PASS/139 FAIL of 1,622; raw task 1,481 PASS/
 142 FAIL of 1,623. After the three audited focused corrections below:
 **A139/B0/C0**, effective 1,484 PASS/139 shared FAIL. No second complete suite
 was run after these corrections; raw logs and raw comparison are retained.
* Legacy reconciliation remains nonzero: unit registry matches 1 shared failure,
 calls 138 other shared failures NEW (raw task adds the three corrected cases).
 Shared 139 are inventoried in `recorded-gate-failures.json` task debt without
 changing the canonical unit registry or release predicates. See validation logs.

## Self-resolved or excluded setup cases

1. Fresh checkout lacked the existing locked toolchain dependency: `npm ci`
   restored it; no dependency/lockfile change.
2. A copied emulator and parallel quick preparation briefly failed the native
   freshness check. Preparation completed, affected captures were discarded,
   and every final capture ran against the prepared binary.
3. The temporary `/tmp/vs65-phase-main` worktree disappeared during its suite
   (cause not established). That incomplete run is excluded. Main was recreated
   detached at `build/main-reference`, with its final log outside the checkout,
   and the complete suite rerun.
4. An intermediate equate split ca65 cheap-local scope at `@bad`. It was
   removed; no such equate is present in final source.
5. Unpadded 17/10-cycle and 22/22-cycle tails changed control rasters. Both were
   rejected before delivery. Final 22/14-cycle padding has fresh exact controls,
   native gates and its own complete full-suite run. Intermediate/aborted suites
   are not substituted for the final suite.

6. `heavy-breakup.test.mjs:485`: stale initial-content pin 12843 →12865;
   justified by measured +22 packed bytes, with unchanged sectors and segments.
7. `heavy-package.test.mjs:114`: same stale packed-size pin, same correction;
   all protected-capacity assertions retained. Focused two-pin rerun 2/2 PASS.
8. `wall-trace-debug-route.test.mjs:130`: raw suite raced the capture launcher,
   which replaced two old media copies in build/runtime-wall-trace/. Captures
   stopped; the unmodified isolation test and its file pass 5/5. No durable docs
   evidence changed. This was setup interference, not a diagnostic-run writer.

All shared unit failures are
reported as debt, matched by file/name/first assertion/message. The five added
baseline failures are report-only: [attribution](failure-growth.md).
Canonical release evidence and its recorded failure predicates are unchanged.

## Play disks

| Disk | SHA-256 |
| --- | --- |
| `build/play/phase-resync/campaign.atr` | `a125ec10f134ba9e9b8525a56b7c56f0d178095826b92235af989243b2676ac1` |
| `build/play/phase-resync/capital-480.atr` | `a9bb0658dd06ac3e6ed7142dbb86217e9a8d91d772b9dbcc50bc085ee1c4d5aa` |

Owner smoke: try ordinary SPACE firing, capital entry/traversal, boss fight,
HUD/music and pause/resume on these uninstrumented disks. Forced-miss proofs
use the private emulator, not a debug stall embedded in the ATR.

NEXT TASK: owner review/smoke of this partial recovery; a stricter coherent
publication task requires separately authorized scope and placement proof.
