# Capital content v2 merge verification — 100db9a

**STOP: new unrecorded pickup-overlap raster clause; strict release and play delivery not run.**

Branch `codex/capital-content-v2-merge`; owner checkpoint `100db9a`; baseline
`5053697`. Increments 1+0 only. This continuation changes no production code,
test assertions, replay inputs or validators. CPU, RAM and residency delta: 0.
Owner smoke and owner Git actions remain pending.

## Home ownership

Generated original 480/960 ownership images with the existing
`scripts/l2-observer-images.mjs` helper, then reran all eight exit fixtures:
480/960 × quit, game-over, level-end and reset. All eight passed. Completed
R1–R4 terminal death → summary → menu → restart fixtures, all passing; these
are diagnostic seeded terminal fixtures, not four naturally played boss fights.
The retained native15 captures match the same guest artifact bytes.

**Home observer 27/27 PASS:** 15 routes + 8 exits + R1–R4; 2,963,608 content
opcode fetches and 4,239,102 boss-owned fetches, **zero invalid executions**.
No guest instrumentation bytes. Per-fixture hashes, ending states and counts
are in [verification-100db9a.json](verification-100db9a.json).

Reproduction (working directory `build/merge-validation-c182af2/`):

```sh
node scripts/l2-observer-images.mjs build/level-1-s1
node scripts/l2-observer-images.mjs build/l2-capital-960
CC2_HOME_DIR=build/merge-native-home CC2_EXIT_OUTPUT=build/merge-exits-retry ATARI800_TRACE_SOURCE=build/frame-peak-atari800 node scripts/l2-native-exits.mjs
```

R1–R4 use the existing `scripts/measure-boss-death.mjs` helper, original
region builds, `--prepare` on the first run and host-only `CC2_HOME_OUTPUT`.
Raw exits: `build/merge-validation-c182af2/build/merge-exits-retry/results.json`;
R1–R4: `build/merge-validation-c182af2/build/merge-boss-home/rN/rN.jsonl`;
27 observer CSVs: `build/merge-validation-c182af2/build/merge-native-home/`.
Aggregate: `build/evidence/capital-content-v2/verification-100db9a/home27.json`.

## Core-down clause attribution

Ran all four default sessions that use this completion clause on the owner’s
clean detached baseline worktree. Every case reproduces the **same first
assertion**: `<session> reached the summary from a boss whose core never fell`.
The raw CLI exits 1; a focused report’s `passed: true` describes its PAL audit,
not a behavioural-clause pass.

| Baseline session | Frames | Maximum wall cycles | Clause |
| --- | ---: | ---: | --- |
| director-complete-0-natural-sweep-fire0 | 5,509 | 30,872 | FAIL, same assertion |
| director-complete-1-natural-sweep-fire0 | 5,549 | 31,036 | FAIL, same assertion |
| director-complete-2-natural-sweep-fire0 | 5,629 | 31,301 | FAIL, same assertion |
| director-complete-2-write-protected | 5,629 | 31,301 | FAIL, same assertion |

Exact inputs: `boss-aim`, fire delay 0, difficulty as named, 15,000-frame
budget, hold player lives 3, end at summary; write-protected case additionally
uses read-only media. The historical `natural-sweep` IDs do not name the
current input policy. Baseline/current policy header SHA-256 is identical:
`f076b4fbf19f38536b13f8739b3f5db126cf9aeb7da34dd72c2930b89c7aa303`.

Baseline command, after its normal build, with `--prepare` on the first run:

```sh
node scripts/runtime-wall-trace.mjs --atari800-source=build/atari800-trace --skip-boot-smoke --only-session=<session>
```

`--skip-boot-smoke` isolates this attribution from baseline’s known frontend
1,405 versus 1,402 gate. This is not baseline release certification. Current
boot smoke remains mandatory. Baseline normal-build ATR SHA-256:
`79d1fa59e53ce627008ee6ba3b4d4c0dbeff8776aa572380e7ae0397e5372f9d`.
Baseline source stayed at 5053697; generated dist BIN/manifest/ATR were restored
after each probe, leaving the worktree clean. The owner-created worktree was
retained.

Classification: **pre-existing-unclassified**, following the owner’s baseline-
fails branch. No claim that this establishes a boss damage defect or replay
desynchronization. No input re-timing or behaviour fix. The conditional
first-divergence/HP/hit/core-shot investigation was not entered because baseline
also fails. Four exact session/message records were added to
`docs/recorded-gate-failures.json`; release policy and validators are unchanged.

An initial full refresh encountered the write-protected counterpart after the
three natural cases were attributed. It was stopped, then that exact media
case was reproduced on baseline before starting a fresh complete run. Preserved
attempt log: `build/evidence/capital-content-v2/verification-100db9a/release-refresh-attempt1.log`.
No partial report is used as release evidence.

## Retained gates and limitations

Previous checkpoint’s full suite: 1,615 tests, 1,478 pass, 134 fail, 3 skip;
**A134/B0/C0** against saved 5053697. Group A assertions stay untouched. Ledger
reconciliation: 1 matched, 133 NEW, 0 MOVED, identical baseline-debt IDs. The
full suite is not green; it was not repeated after documentation/ledger-only
work. Focused changed-behaviour checks remain 53/53.

Native15: 58,688 iterations, overall peak 31,444; capital peak 30,152; minimum
fence 3,298; every boss entry 325/350; zero misses, extra VBI, DLI errors,
shifted rows or stale L2 accesses. Boot 7/7, frontend 1,390 ≤ 1,402. Every
reported boss-stress mode equals saved 5053697; worst lost-target 8,473.
Artifact hashes are checked again before play delivery.

Island symptoms remain **unattributed transient raster artifacts** for
`visual-bugs-diag`; no leftover RAM cells reproduced on any sampled commit.
Not a merge blocker. Increment 2 remains parked and excluded.

## Release refresh STOP

Fresh full run completed 26 passing PAL audits, including the four recorded baseline completion clauses, then encountered a different unrecorded failure in `weapon-pickup-overlap-2-hunt-fire5`. The task-scoped process group was terminated immediately (SIGTERM). No fresh complete canonical runtime report, strict release build, release-binding check or qualified play delivery followed. This new clause was not added to the failure ledger.

Inputs: HARD/difficulty 2, `pickup-overlap`, fire delay 5, 1,300 frames. First assertion: `scripts/runtime-wall-trace.mjs:6107` (message at6110): “final raster contains a cut capsule or stale post-collection footprint.” COLPM3 `$1c`, screenshot column x56–72, full image height.

Expected: each capture except the final three has at least 40 pixels; final three each have fewer than 40. Actual 22 counts:

```text
216 216 216 216 216 216 216 216 216 188 156 132 108 84 60 28 0 0 0 0 0 0
```

Zero-based captures 15–18 fail the pre-tail minimum with 28/0/0/0. Final captures 19–21 are 0 and pass the tail limit. One collection occurs at trace frame 344/gameplay 88: booster 3, active mask 0, pickup PMG/plane rows 0, plane union 0. Thus the generic message does not establish that a stale footprint remains. The raw CSV has 1,300 rows, maximum 30,793 wall cycles, zero missed frames/extra VBI; the wrapper stopped during behavioural validation, before this session’s PAL audit was finalized. No timing PASS is claimed for the failing session.

Attribution remains **INCONCLUSIVE**: production raster versus capture-window/scenario/observer mismatch has not been compared on 5053697. No baseline run, production fix, replay adjustment or assertion change after this STOP. This is a separate pickup clause; it is not classified as the owner’s island symptom.

Original CSV, watch JSON and 22 screenshots are preserved with SHA-256 values in [verification-100db9a.json](verification-100db9a.json), copied into `build/evidence/capital-content-v2/verification-100db9a/overlap-stop/`. The exact run transcript is [verification-100db9a-release-stop.txt](verification-100db9a-release-stop.txt). Baseline completion transcripts are [verification-100db9a-baseline.txt](verification-100db9a-baseline.txt). Primary `docs/runtime-wall-trace.json` remains unchanged; a partial run is not release evidence.

Primary **dist clean**: no strict-release flow was started. Baseline dist/source clean at 5053697. No task Atari800 process remains. No production, test, input or validator changes. No candidate play ATR is delivered by this continuation; the evidence ATR remains in `build/merge-validation-c182af2/dist/`. NEXT TASK: owner decision on attribution of the pickup-overlap raster failure; then resume complete release evidence, strict build and three play ATR deliveries.

Evidence campaign ATR SHA-256 (unchanged guest, not a qualified play delivery):
`5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`.

## Exact owner commit paths and message

No staging, commit, merge, push or tag performed. No dist file belongs to this checkpoint.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/recorded-gate-failures.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/verification-100db9a.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/verification-100db9a.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/verification-100db9a-baseline.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/verification-100db9a-release-stop.txt
```

Suggested message: `docs: record home27 pass and pickup raster release stop`
