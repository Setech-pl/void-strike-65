# M3 owner-smoke speed pass — OWNER-SMOKE CANDIDATE

Baseline main/branch start `eaae85a`. Work stays in `codex/m3-tune`; no merge, push, tag or owner acceptance.

## Authored motion

NORMAL replaces every-frame wide sweeps with every-other-frame steps, calm tracking with every-fourth-frame steps, and dy2 with dy1. Segment durations preserve lateral travel. EASY uses quarter-rate lateral motion with calm level segments and no dy2; HARD reproduces the pre-task path bytes and durations. All six paths used in level2, including the later tracking-dive, are covered. Level1, Heavy waves, counts (opening24/pilot32), spacing16, mirrored opposing-side entries, HP, weapons and the four-Light ceiling remain unchanged.

The existing 96-byte payload is common to all difficulties and has no motion multiplier. The permitted **build-time authored variants** were selected, avoiding new runtime code/state. `--m3-tempo=easy|normal|hard` selects one payload in its own build directory. Set the matching difficulty in OPTIONS; selecting another menu difficulty changes existing combat/scroll rules but does not replace the authored motion payload. The normal source is the default. `node scripts/build-m3-tune-play.mjs` rebuilds six pilot/level2 variants and the unchanged every-frame stress volley.

Slower lifetimes otherwise cut the final groups at sector expiry. Opening/pilot row lengths are EASY1280/1792, NORMAL896/1280, HARD480/768. Only these two Light sectors grow; all Heavy/capital sector lengths stay unchanged. Linked E/N/H no-fire/instant-kill checks admit every member, maintain152 HPOS coverage and next-legal-row handoffs with no authored wait. This deliberately lengthens calm flight, rather than losing later groups.

## Before/after speeds

HOST-MEASURED absolute displacement, HPOS/frame horizontally and raster lines/frame vertically. Each cell is **mean / instantaneous peak** over complete valid path ticks. Means include clamps, calm segments and tracking convergence; tracking uses fixed player columns48/124/200, four frame phases, and the authored mirror states and entry. A discrete lateral step remains4 HPOS even at slower cadence. The unclamped sustained sweep rates are before4, NORMAL2, EASY1 HPOS/frame; calm NORMAL tracking is1. See [all segments and individual traversals](speeds.json).

| Path | Before X | Before Y | EASY X | EASY Y | NORMAL X | NORMAL Y | HARD X | HARD Y |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| wide-west | 2.226 / 4 | 2.000 / 2 | 0.713 / 4 | 0.643 / 1 | 1.108 / 4 | 1.000 / 1 | 2.226 / 4 | 2.000 / 2 |
| wide-east | 2.226 / 4 | 2.000 / 2 | 0.713 / 4 | 0.643 / 1 | 1.108 / 4 | 1.000 / 1 | 2.226 / 4 | 2.000 / 2 |
| wide-cross | 1.689 / 4 | 1.704 / 2 | 0.733 / 4 | 0.743 / 1 | 0.841 / 4 | 0.852 / 1 | 1.689 / 4 | 1.704 / 2 |
| wide-track | 0.385 / 4 | 1.704 / 2 | 0.186 / 4 | 0.658 / 1 | 0.225 / 4 | 1.000 / 1 | 0.385 / 4 | 1.704 / 2 |
| wide-return | 1.477 / 4 | 1.455 / 2 | 0.406 / 4 | 1.000 / 1 | 0.677 / 4 | 1.000 / 1 | 1.477 / 4 | 1.455 / 2 |
| tracking-dive | 0.311 / 4 | 1.411 / 2 | 0.141 / 4 | 0.643 / 1 | 0.219 / 4 | 1.000 / 1 | 0.311 / 4 | 1.411 / 2 |

`node scripts/m3-tempo-report.mjs BEFORE.json OUTPUT.json` reproduces these numbers; obtain BEFORE.json with `git show eaae85a:assets/levels/level-02.json`. These are deterministic host measurements, not raster cycle measurements.

## Optional shot-hit area — separate commit

Chosen: extend the player-shot swept vertical area by **one raster line above and below** each Light. Visuals, horizontal area, player contact and hostile shots are unchanged. Exactly two immediate operands differ (`$36A7`:8→9; `$36AB`:249→248). **0 resident bytes, 0 state bytes, 0 additional instruction cycles**, identical addresses/opcodes; the kernel stays1196/1213 B. Compressed kernel1032→1036 B (+4), no transport sector increase. Border tests cover hits at both new edges, misses one line beyond and unchanged horizontal edges. See [linked pricing](hit-price.json).

Symmetric horizontal +1 HPOS/side was priced first: +3 raw B, +4 cycles per checked live slot (at most80 for5 shots×4 Lights before alignment effects). Its link fails the fixed LIFE-tail pin; the17-B free tail is after that pin. Alternatives were retain geometry(0), vertical-only(0, chosen), or spend a separate placement iteration for horizontal widening. No pin/reserve/placement change was made.

## Validation and delivery

Normal computed gates pass; stale runtime evidence remains explicitly pending and release build would fail. No release/milestone matrix is claimed.

| Native route | Measured frames | Worst cycles | vs31500 | Margin to32568 |
| --- | ---: | ---: | ---: | ---: |
| quick-spread | 1800 | **30465** | -1035 | 2103 |
| quick-960 | 3967 | **31156** | -344 | 1412 |
| four-easy | 2200 | **32224** | +724 | 344 |
| pilot-easy | 4800 | **31951** | +451 | 617 |
| four-normal | 2200 | **32184** | +684 | 384 |
| pilot-normal | 3200 | **31281** | -219 | 1287 |
| four-hard | 2200 | **32033** | +533 | 535 |
| pilot-hard | 1800 | **31132** | -368 | 1436 |

All eight focused reports PASS with zero missed frames, extra VBI boundaries,
physical/deadline overruns or DLI errors. Each stress has864 four-Light frames
and one/two observed four-shot rises. The intentionally stronger stress paths
remain every-frame, independent of the gentler authored variants. All pilot
captures reach the following sector. [Worst rows, coverage, hashes and gates](native.json).
The standard boss loading/Warning transition is excluded from the gameplay
frame gate exactly as the canonical harness does; its raw wall time remains
recorded in the JSON. No gameplay row is omitted. Fresh quick main controls
are30465/31156, so the measured quick CPU delta is0/0. No resident/state/segment
size changes; content1863/1920, window2437, L2 1457 (+256 protected reserve)
and214 transport sectors remain unchanged. [Before/after resources](resources.json).

Final primary-worktree focused run:77 PASS/0 FAIL/2 optional SKIP. The same
production/default ATR is byte-identical between the isolated measurement
copy and the final primary build (`8b3a4be46c8fce2dddf33851d60f2d644182c2502f652cb090bb292776ea31f0`).
The delivered ATR hashes are independently pinned in [delivery.json](delivery.json).
No full native matrix, home observer matrix, boss stress, release trace,
strict release or new release-evidence regeneration was run.

## Task audit

- Baseline isolation mistake: three M3 tests read the briefly edited source
  during the full main run. The original main source was restored, and the
  entire two affected files rerun:30 PASS/0 FAIL/1 optional SKIP. Their raw
  failures stay visible; only this explicit focused evidence corrects them.
- Accepted stale expectation: `source-contracts` still expected a swarm ceiling
  of3 although existing M3 code/documentation and this task require4. Corrected
  the regex to4; the complete file passes in the final focused run. No runtime
  ceiling was changed.
- Slower mirrored fan: the old70-frame observation and184/64 entry positions
  describe the previous tempo. Updated the focused expectation to140 frames
  and200/48 opposite-side entries; crossing and152-HPOS combined span are still
  asserted. The slower linked timeline bound grows3000→5000 solely to include
  all EASY groups; every admission and immediate handoff remains asserted.
- Host variant manifest initially retained the unprefixed route name; fixed
  it to identify the variant's own directory and reran complete build-variant,
  wall-trace debug-route and frame-route tests plus all native pilot routes.
- Native setup errors were self-resolved: removed the unsupported diagnostic
  skip flag; supplied focused session ids and ownership/lifetime fixtures for
  the960 boss endpoint; reran captures after variant builds stopped replacing
  their output directory. A final isolated960 capture and canonical loading
  transition exclusion reconcile CSV row count with the focused report.
- The final primary focused border test caught an omitted optional-source copy
  from the measurement directory. Copied that already-tested source, rebuilt,
  reran the full focused set and compared the default ATR byte-for-byte. The
  delivered variants already contained the same two-operand change.

## Owner smoke and remaining limits

Seven bootable ATRs:three pilot variants, three level2 variants and one shared
volley stress. [English checklist, SHA-256s and launch lines](README.md) /
[Polski](README.pl.md). Each launch line uses the required primary-worktree
absolute path. Rebuild: `node scripts/build-m3-tune-play.mjs`.

**OWNER-SMOKE CANDIDATE.** EASY/HARD motion is authored into separate ATRs,
not changed by the menu. Choose the matching OPTIONS difficulty. HARD retains
the old fast motion intentionally; NORMAL/EASY flight lasts longer to retain
all groups. Existing11 canonical unit failures and32 milestone-trace debts
remain unresolved; no release-readiness claim. Only the owner records play
acceptance. NEXT TASK: owner smoke; no automatic follow-on work.

Focused capture reproduction (after rebuilding the play set; prepare a private
Atari8007.1.2 source tree in `.cache/m3-tune/atari800` with `--prepare` once):

```sh
VS65_L2_SESSION=m3-four-normal VS65_L2_POLICY=park-176 VS65_SMOKE_FIRE_DELAY=10000 DFTRACE_HOLD_PLAYER_LIVES=3 node scripts/runtime-wall-trace.mjs --atari800-source=.cache/m3-tune/atari800 --artifacts=build/level-2-s0 --smoke-frames=2200 --smoke-difficulty=1 --only-session=m3-four-normal
VS65_L2_SESSION=m3-pilot-normal VS65_L2_POLICY=park-176 VS65_SMOKE_FIRE_DELAY=10000 DFTRACE_HOLD_PLAYER_LIVES=3 node scripts/runtime-wall-trace.mjs --atari800-source=.cache/m3-tune/atari800 --artifacts=build/m3-tempo-normal-level-2-s3 --smoke-frames=3200 --smoke-difficulty=1 --only-session=m3-pilot-normal
node scripts/runtime-wall-trace.mjs --atari800-source=.cache/m3-tune/atari800 --only-session=campaign-1-spread-capital --skip-boot-smoke
node scripts/build.mjs --level=1:sector=1 --l2-long-capital
node scripts/l2-observer-images.mjs build/l2-capital-960
VS65_L2_SESSION=l2-960-1-flight VS65_L2_POLICY=l2-matrix DFTRACE_L2_BOSS_FRAMES=120 DFTRACE_HOLD_PLAYER_LIVES=3 DFTRACE_L2_LIFETIME=.cache/m3-tune/960-lifetime.jsonl node scripts/runtime-wall-trace.mjs --atari800-source=.cache/m3-tune/atari800 --artifacts=build/l2-capital-960 --smoke-frames=10000 --smoke-difficulty=1 --only-session=l2-960-1-flight
```

EASY/HARD stress substitute session suffix and difficulty0/2. Their pilots
also substitute the tempo directory and capture4800/1800 frames. Build the
default campaign before Spread; never rebuild a variant during its capture.
`node docs/diagnostics/m3-tune/summarize-native.mjs` collects the resulting
focused reports, validates coverage/counts and produces the bounded JSON audit.


## Full npm test comparison

One full run per revision. Main raw:1682 tests,1662 PASS/15 FAIL/5 SKIP;
task raw:1685 tests,1665 PASS/15 FAIL/5 SKIP. After the explicit focused
corrections (no second full run), audited main1665/12/5, task1669/11/5:
**A11/B0/C1**. All11 A cases match file, test name, first assertion and first
message exactly; they also match the canonical unit debt. C1 is the stale
ceiling3 documentation expectation corrected to4. No behaviour regression or
new unresolved failure. [Exact tuples, raw totals and focused corrections](tests-ab.json).

Three task-only stale cases were corrected, and both complete affected test
files pass14/14:

- `levels:check ... build compiles the authored file`: the source assertion now
  checks `compileLevel(m3TempoSource(loadLevelSource(...)))`, so it still proves
  authored JSON is compiled while permitting host-only tempo selection.
- `T12: level-02.json compiles ...`: NORMAL's necessary opening/pilot lengths
  are896/1280, so the explicit six-sector vector and capital maximum1536 are
  updated; Heavy/capital lengths and all other assertions remain intact.
- `step 3: the Director reads level 2 ...`: its explicit capital maximum is
  now1536 (896+640); the linked probe still requires every sector, completion,
  four-Light peaks and Heavy exclusion from swarm sectors on E/M/H.

The stock reconciliation command was run on each raw full log plus the
unchanged canonical trace. It reports the raw stale/setup cases and32 old
trace entries absent from that historical trace; it is not claimed green.
The audited unit reconciliation has0 added/0 moved/11 matched. The32
milestone debts are retained; clearing them needs the separately scoped fresh
milestone evidence task. No historical trace was edited or presented as fresh.

Local data/tempo commit: `46b65ce`. The optional two-operand collision change
and this final evidence are committed separately. Candidate awaits owner smoke.

## Cleanup

`du -sh` before→after: task directory `.cache/m3-tune` **220M→4.0K**;
whole worktree `.cache` **220M→4.0K**; generated `build` **63M→936K**.
`df -h /System/Volumes/Data`: **374Gi available** before and after
(926Gi volume,527Gi used). Only the seven ATRs/checklists and under1MB of
committed JSON/log/Markdown evidence remain; no oversized retained artifact.
Worktree `node_modules` stays. Task exports, copied build/dependency/tool trees,
npm cache, intermediate traces and all other generated build outputs were
removed. No other task/worktree/cache was touched. Own emulator/test/build
processes completed; no server/browser/listening port was started. `dist/`
is clean. [Exact commands' measurements](cleanup.json).


## Subsequent pre-merge wave fix

Owner accepted tempo at597e4e5; smoke then found terminal columns. The
[wave correction report](../m3-wave-fix/report.md) supersedes wave shapes,
row bounds and play delivery below this checkpoint, while preserving its
accepted tempo and hit-area change. The new wave design awaits owner smoke.
