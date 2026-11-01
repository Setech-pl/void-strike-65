# M3 checkpoint 2 — OWNER-SMOKE CANDIDATE

Branch `codex/m3-plan`; main `4e84bc4` merged as `a6f3476`.
Checkpoint1 commit `149bb7f`; checkpoint2 is this report's commit. Git writes
work. Owner policy and authorization are recorded in
[the decisions](../../../decisions/2026-10-31-m3-waves.md).

C now evaluates shallow waves, snakes, arcs, tracking dives, upward returns,
vertically progressing loops, alternating successful-member mirroring and
bounded terminal/edge exits. The compiler rejects misaligned path entry,
invalid segments/back-jumps and zero-progress cycles. Failed admission never
advances parity; recycled slots receive fresh state. Tracking follows the real
player column. C owns these policies; existing ASM guards/publication/erase/
shots/collision and Heavy/PMG allocation remain in place. Level1 data is
unchanged. Level2 pilot paths occupy sectors1/4/6; chains and column/volley
fire policies are not implemented before their authorized checkpoints.

| Home | Main | Checkpoint1 | Checkpoint2 | Full M3 estimate /budget |
| --- | ---: | ---: | ---: | ---: |
| Content | 1,123 | 1,491 (+368) | 1,800 (+677) | 1,647 /1,855 |
| Window | 2,302 | 2,384 (+82) | 2,384 (+82) | 2,398 /2,526 |
| L2 | 1,290 | 1,290 | 1,290 | 1,290 /1,290 |

All figures are MEASURED bytes except the final estimate/budget column.
Checkpoint2 adds309 content B (304 code +5 data/table) after1. Full M3
budget additions were732/224/0 B; compiled checkpoints1–2 use677/82/0 B.
Window growth82≤300. Free: content120/1,920 B; window427 usable below2,811;
L2 246 usable below1,536 plus256 protected. Arena830/832 and Director high
324/645 are unchanged. Initial content12,865 B, transport214 sectors (+1 vs
main),11/11 records, window record16 (main15), checked content15 sectors.
Existing96-B payload is reused, with zero new level allocation/SIO reads.
[Detailed placement and function sizes](resources.json).

Only55 content B remain within the full M3 budget for3–5,120 physically.
Later fire/chain integration must be re-priced. C-skin is a separate smokeable
checkpoint4 commit, decided from compiled full M3: retain at least64 content
B or use the existing guarded fighter-only L2 home. At checkpoint2 alone an
estimated48-B helper would leave72 B; that does not decide its later home.
Per-level skin data policy is accepted; optional regional packs belong toM7.
B-shot, independent hues, Bomber skins and Bomber shot re-skin stay DEFER.

Normal computed build/byte gates PASS; release wall evidence remains pending.
Focused verification and full-suite comparison are recorded below.

CPU measurements are linked NMOS entry-through-RTS, without caller JSR/DMA:
whole C Light path tick maximum760; three simultaneous transition ticks sum
2,083 (excludes driver/publication). No-path Wingman/Interceptor positions,
HP, actions, fire timers and loop state equal main over380 frames; hook adds
70–71 cycles/member. Guarded arm72 includes the original8-cycle publication:
new caller JSR makes net +70 per wave-arm event, no extra row polling.
Reset195, admission81(no path)/147(path)/156(mirrored), escort clear60;
add6 caller cycles. Component estimates are report-only; these whole-tick
costs must not be added again as a delta.
[Tick](checkpoint-2-path-cpu.json), [A/B](checkpoint-2-cpu.json),
[guard/event measurements](control-cpu.json).

| Native PAL route, DMA on | Frames | Worst cycles |
| --- | ---: | ---: |
| Spread NORMAL | 1,800 | 30,465 |
| capital-960 NORMAL | 3,967 | 31,156 |
| vocabulary/exit review | 2,400 | 31,663 |
| level2 sector6 ELITE prefix | 3,200 | 30,765 |

The review contains19 admissions, all8 waves clear into the quiet sector,
with406 three-Light frames. Worst31,663 is163 above31,500 target,905 below
32,568 hard gate,3,905 below the physical35,568 PAL frame;8 target-overrun
frames, no hard overruns/misses/extra VBI/DLI errors. Two quick routes reproduce checkpoint1 exactly; boss entry325≤350. ELITE
prefix covers2,936 Heavy frames and escorts; it does not claim the later
tracking wave was reached. The dedicated review supplies tracking/path proof.
No full native/home/release matrix or strict release was run.
[Spread](quick-spread.json), [960](quick-960.json), [review](path-native.json),
[ELITE prefix](elite-native.json).

Audit: the first vocabulary run used index1 (a quiet sector). Discarded as
path coverage. CLI sectors are zero-based; review now starts at index0 and
explicitly checks live Light coverage. Checkpoint1's old "straight" run also
used the wrong index; its corrected immutable149bb7f run has31,708 peak,
1,637 live Light slot-frames, no timing anomaly. This correction is retained
[in the checkpoint1 report](../checkpoint-1/report.md), not silently erased.
One initial main full-suite setup started before export extraction completed
and resolved the parent package; discarded. The valid main run uses an
explicit export prefix,1528 PASS/120 FAIL/4 SKIP. Candidate full suite also
uses its own immutable source snapshot, with separate outputs from play builds.

## Tests and task audit

Main1528 PASS/120 FAIL/4 SKIP; raw candidate1533/126/5. All120 failures
match by file, name, first failing assertion and first message; zero MOVED.
Raw A120/B6/C0. Five accepted expectation/accounting fixes plus one ABI setup
repair pass their complete focused files: **audited A120/B0/C0**. Audited full
snapshot1539/120/5, not a green suite. Final focused set62 PASS/1 optional
H12 review-variant SKIP, including three extra final path cases and the optional
380-frame A/B comparison that full suite skips. No second full suite.
[Exact tuples and six justifications](tests-ab.json), [raw audit](tests-ab-raw.json),
[focused log](focused.log). Full logs stay in `.cache/m3-checkpoints/`.

The repaired assertions cover two exact physical-window free pins (1282→1200),
the declared96-B payload alias, H14's budget with M3's append measured separately,
and the exact new ELITE warning. Original segment/address gates remain. The
setup repair atomically publishes `director-abi.inc`; final normal ATR is
byte-identical to the delivered/native-bound campaign857febc8…fa55. Preflight
Heavy-package record pin15→18 follows the accepted M3 plan; actual16.

Standard reconciliation reports120 matches/6 NEW/0 MOVED from the raw log;
NEW are the six passing repairs above. Imported canonical trace comparison
reports0 NEW/0 MOVED/32 disappeared entries: existing release debt, not a new
measurement or permission to remove records. Canonical evidence/predicates
remain unchanged. Shared unit debt is linked in recorded-gate-failures.json.

## Owner smoke — stop here

ATRs are under `build/play/m3/checkpoint-2/` (five files,133,136 B each).
[Delivery SHA-256s](play-artifacts.json); bilingual instructions accompany them.

- `path-review.atr`: release fire first; inspect straight/shallow/snake/arc,
  real-column tracking, return, finite loop and mirrored edge exits. Shapes
  repeat; mirrored admissions alternate even after kills/reused slots; exits
  erase cleanly without wrap, stuck glyphs or corridor strips.
- `swarm.atr` and `elite.atr`: actual level2 sectors4 and6. Check paths keep
  readable silhouettes/spacing and the prior Heavy look/HP/damage/escort
  behavior. ELITE starts with Heavy waves before tracking.
- `level-2.atr`: full pilot; check capital approach has at least2 Heavy-free
  frames, no Bomber firing while departing, repaired sideways speed and no
  strips. Try pause, death and restart.
- `campaign.atr`: compare ordinary level1/no-path movement, boss escorts,
  boss entry and restart with the familiar baseline.

No owner smoke acceptance, merge, push, release or next checkpoint is inferred.
**NEXT TASK: owner smoke/review of checkpoint2; STOP.**

## Cleanup and delivery footprint

[Cleanup evidence](cleanup.json): task cache375M→972K; whole worktree
`.cache`376M→2.1M; own `build`88M→672K. `df -h /System/Volumes/Data`
shows400Gi available before,401Gi after. Final delivery retains five requested
ATRs plus bilingual instructions/hashes (672K). Temporary exports, private
emulator source/binary, intermediate captures, snapshots and generated builds
are removed. Prior task caches and worktree node_modules are untouched;
tracked `dist/` is restored. All owned tests/emulator subprocesses completed;
no servers/browser sessions/ports were started. Retained evidence is below200MB.
