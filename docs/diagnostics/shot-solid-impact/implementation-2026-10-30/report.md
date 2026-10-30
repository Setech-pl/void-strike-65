# Player shots stop on solid cells

2026-10-30. Branch `codex/shot-solid-impact`, task HEAD `8202b07`, baseline
main `8c0c2ed`, pre-capital baseline `5053697`. Owner commits. This report
supersedes the earlier attribution and PAL STOP reports for this task.
Uncommitted build for owner play; owner commit and smoke remain pending.
No merge, push, tag, commit or staging by the agent.

## Behaviour and attribution

B1 is confirmed on both baselines and is **pre-existing**. The old renderer
saved the backing cell but then drew the shot over it. Normal/Rapid replaced
solid art with the shot's black-background glyph; Spread composed solid art
at substantial cost. This was visible overdraw, rather than an orphan left
behind after erase. The earlier [instruction and native attribution](../attribution.md)
contains the exact path and frame evidence.

B2 is **not reproduced**, and whether the owner's recording shows a regression
remains unknown. The bounded batch is now complete: both baselines × EASY and
NORMAL/MEDIUM × plain, Rapid, Spread and Shield, 1,800 frames each. The earlier
STOP interrupted it; this continuation completed the missing cases with the
same diagnostic header and inputs. There are **zero early retirements during
alive capital frames**, and all **50,756 owned shot cells** checked contain a
shot glyph. This is end-of-loop RAM evidence, not a transient raster proof.
No row-wide island test, shared overlay/slot disappearance or load-shedding
path was found. The focused shot-beside-island test reaches Y=19 and retires
at the normal top boundary. [All 16 cases and hashes](bounded-b2-complete.json).

**Do Spread diagonals explain the owner's B2 observation? UNKNOWN.** In the
controlled failing frames, four shots are alive, but only two occupy the
centre column, both in the upper half; the other two are diagonals. That is
consistent with the sparse-column appearance, but does not establish the
recording's weapon or explain its return to four–five vertical shots after
the island passes. The mint '+' is the LIFE pickup in current assets/docs;
it does not identify a weapon mode. Death clears were excluded from the
B2 result, matching the owner's no-death window.

The NORMAL/MEDIUM Spread PAL defect is new on main **for these exact inputs**:

| Source | Worst frame | Overall wall cycles | Capital peak |
| --- | ---: | ---: | ---: |
| 5053697 | 1433, row 207 | 31,422 | 31,422 |
| main 8c0c2ed | 1142, row 209 | 32,792 | 32,792 |
| B1 build | 246, SPACE | 30,443 | 29,528 at frame 1442 |

The old baseline has no hard overrun on this route. Capital begins at frame
904 there and 608 on main. At corresponding rows 207–209, 5053697 has only
two solid composites; its oldest shots reach the top and retire at frame
1437. Main has three. B1 itself predates the capital-content change; the
regression is the reachable timing coincidence in the new campaign content.

Exclusive PC attribution below counts each instruction once, including DMA
stall time and the compositor's final RTS. Columns sum to the full measured
wall window, without nested-call double counting. All three solid backings
are code 198 (glyph 70): central island cells using hull glyphs. The four
shot slots and their X/Y/backing values are retained in the data.

| Exclusive wall-cycle component | Frame 1137 | Frame 1139 | Frame 1142 |
| --- | ---: | ---: | ---: |
| Three Spread solid composites | 3,225 | 3,237 | 3,228 |
| Other PairShot overlay work | 1,968 | 1,970 | 1,910 |
| L2 phase publication and island contact | 14,239 | 14,257 | 14,311 |
| Turret shell/warning/muzzle/flash work | 2,696 | 2,672 | 2,711 |
| Inactive explosion bookkeeping | 259 | 250 | 254 |
| Music player | 280 | 257 | 319 |
| Other loop/collision/world/backing/audio/IRQ work | 10,053 | 10,064 | 10,059 |
| **Total** | **32,720** | **32,707** | **32,792** |
| **Above hard gate** | **152** | **139** | **224** |
| **Same frame after B1** | **27,815** | **27,026** | **27,094** |

No transient, capital or player explosion is active, and no music row advances
in those three frames. The three composites cost 1,566 instruction cycles
(3 × 522), in addition to the other overlay work. B1 removes that work and
subsequent solid travel; the same frames have one live shot afterwards.
[Exclusive CPU/wall totals, raw-profile hashes and slot evidence](spread-attribution.json).

## Implementation and measured cost

The existing update path handles turret/cannon, debris and enemy targets
before publication. Its damage, score and target priority are unchanged.
`render_fighter_projectile_overlays` then checks only player slots, using the
backing byte already returned by `store_projectile_backing_resolving_effect_core`.
The test drops the inverse attribute and accepts only glyph codes **59–89**
as solid. A solid destination clears the shot before visual ownership or any
screen write. A solid spawn cell uses the same path. The existing erase has
already restored the prior cell, and the new destination stays intact.

The 18-byte helper occupies inert CODE padding; five call/branch bytes fit
existing renderer alignment. No new screen read or state is needed. Stars,
empty space, debris and existing targets retain their behaviour. Enemy and
turret shots are unchanged. No optional impact effect was added.

[Production NMOS execution measurements](shot-cost.json), DMA off:

- Helper maximum 25 instruction cycles, 31 including JSR. Its impact branch
  adds 3: 34 per call; five calls bound this check at 170 cycles, derived from
  the measured instruction paths.
- Maximum **net renderer increase: 27 cycles per shot, 135 for five shots**,
  measured over all 256 backing bytes and player shot kinds 1/17/33/65.
  The five-cell combination is a synthetic bound, not claimed reachable.
- Blank-space and enemy-shot fixtures have zero cycle delta. Nonblank
  passable cells add 23–27 cycles. Solid code 198 saves 9 cycles for an
  ordinary shot and 556 for each Spread shot in the renderer fixture.
- DMA-on native route peak stays **31,444/31,500**, leaving 56 cycles. The
  new Spread route is **30,443**, 1,057 below target and 2,125 below hard.

All **135 linked segment starts and sizes are unchanged**; every segment's
before/after value and delta is in [segment-deltas.json](segment-deltas.json).
BASIC window is 2,068/3,584 B, delta **0** (allowance ≤64 B); arena is
827/832 B, delta **0**; Director net **0 B**. C sector is 244/248 B.
The packed initial content increases **18 B, 12,825 → 12,843**; this consumes
compression/transport slack, not resident RAM. Boot image length stays
27,008 B; boot sectors 101 and total boot/chunk transport 211 are unchanged.
The generated memory map reflects the build.

## Validation

- **Native 16/16 PASS**: original 15 plus permanent
  `campaign-1-spread-capital`, NORMAL/MEDIUM, 1,800 frames, held FIRE,
  bottom-left lane, lives held at 4, explicit forced Spread/timer fixture.
  No HP, invulnerability or projectile-state seed. Original failing input
  and registered input captures match in all 1,800 rows apart from session
  name. The permanent validator enforces complete fixture coverage and
  ≤32,568, with the owner's soft-target exception explicit.
- Native total 60,488 iterations, overall 31,444, capital 30,152;
  **composed capital 30,777 ≤31,200** (29,590 without sampled audio +1,187
  reserved two-note cost), 423 cycles spare. Minimum fence 2,489; all original
  15 boss entries 325 ≤350. Zero misses, extra VBI, DLI errors, shifted rows,
  stale L2 execution or world/hull clock divergence.
  [Native gates](native-gates.json), [input equivalence](registered-input-equivalence.json).
- **Home observer 28/28 PASS**: original 27 plus Spread. Zero invalid
  executions; 19,336,363 reads, 353,689 writes; content-owned 3,039,174 and
  boss-owned 4,239,102 opcode fetches. Includes eight exit paths and four
  seeded terminal boss-death → summary → menu → restart fixtures.
  [Census](home-gates.json).
- **Boot 7/7 PASS**, real SIO `-nopatch`, frontend **1,390 ≤1,402**.
  [Boot report](boot-gates.json).
- **Boss stress unchanged versus main**: all 45 reported cycle summaries
  match exactly, including every lance mode; lost-target maximum 8,473.
  These are instruction-cycle stress measurements, not DMA-on frame costs.
  [Exact output comparison](boss-stress-comparison.json).
- Focused solid-island, allied/hostile hull, solid-spawn and beside-island
  cases pass. Existing covered cannon/absorption, defeat and damaging-hit
  tests also pass (**9/9**); the full run's unchanged F4 module-score and
  multi-kill accounting tests pass. Final route/observer checks **26/26**.
  [Focused results](focused.txt), [final checks](final-focused.txt).

One full `npm test` was run on each source, without a second full-suite rerun:
main **1,615 total /1,475 pass /140 fail**; candidate raw **1,622 total /
1,477 pass /145 fail**. **A140/B0/C0 after the five justified B1 expectation
updates**; the raw comparison remains intact in [unit-comparison.json](unit-comparison.json).
All 140 A tests fail at the same first assertion sites; none of those
assertions was edited. Raw B5 comprises two exact packed-size pins and three
Spread-over-solid expectations. The size is now 12,843 with unchanged
capacities/sectors; shots now retire without writes and preserve the exact
terrain cell, replacing the former overdraw/composite expectations. All five
corrected tests pass in a focused run. This is not a green full-suite claim.
[Five-test result](b1-expectations-focused.txt).

Reconciliation was run on both saved full test logs: main 1 matched/139 NEW
to the existing ledger, raw candidate 1 matched/144 NEW, **0 MOVED**. The
shared main failures are unit-ledger debt; five additional raw failures are
resolved by the documented B1 updates. Recorded test/gate failure files and
canonical runtime evidence were not changed.

## Release diagnostic comparison

Both sources completed **62/62 gameplay sessions**, plus the separate **7/7
boot** run. Comparison by session and first failing assertion is **A32/B0/C2**.
The two C clauses are the Spread fixture hard limit and the aggregate Director
hard limit, both cleared by the same B1 change. There is **no new candidate
predicate failure**. Of the 32 A clauses, eight are session failures and 24
are independent aggregate failures. Capsule 0/11 (largest 144 px) and global
DLI phase/order maximum 92 remain known debt.

The unchanged exception-only diagnostic collector from the prior accepted
comparison was applied only in the two private build roots. It collects
independent failures without changing predicates or thresholds; **18 dependent
metadata groups per source are unavailable, not passed**. Both full reports
remain diagnostic-only with gate false. Strict release/evidence refresh is
still blocked by existing debt. Canonical evidence is untouched.

The built-in resume retained 36 completed CSVs per source; all 72 hashes were
verified unchanged. The remaining sessions were captured natively. Inputs and
harness/header are identical between sources. Separately compiled emulator
binaries differ in build metadata, but **all Mach-O TEXT section bytes match**.
[Full inventory, hashes and exact A/B/C clauses](release-comparison.json),
[executable comparison](emulator-text-comparison.json),
[main collector](release-main-aggregate.json),
[candidate collector](release-fixed-aggregate.json). Raw outputs remain under
`build/shot-solid-impact/release-{main,fixed}/` and
`build/shot-solid-impact/implementation/release-*-trace.log`.

Exact-message registry reconciliation has **31 matches and one MOVED message**
for both main and candidate: the recorded booster-rotation predicate prints
a different observed sequence. It fails identically on both sources; its
complete assertion is byte-for-byte unchanged from recorded source `fde1748`
(old line 8920, current line 8938, SHA-256
`9dc29d1ad0aa5a0fd98a253aea9156a498d6b25a4c7a6e5763d6cb65466b5475`).
This is shared main debt at the same first assertion, not a new clause or a
candidate regression. The exact old/new messages are retained in the comparison;
no record was rewritten to conceal the drift. Raw reconciliation exits nonzero
on this message drift and on the shared unrecorded unit debt described above.
[Exact-message audit](reconcile-fixed-aggregate-ledger.txt).

The host summary observer needed a B1 expectation correction. It previously
subtracted every shot allocated and freed in the same iteration as a death
cancellation. Solid impact occurs after the real stats scan, which has already
counted the shot. The observer now subtracts only pre-scan cancellations;
the guest stats code and equality assertion are unchanged. Fresh EASY/MEDIUM
captures have byte-identical gameplay CSVs; the only summary-JSONL change is
`observer_cancelled` (2→1 and 2→0). Exact retirement edges at `$2E6B` occur
after the stats scan. Guest shots remain 530 and 544. The first failing clause
returns to the recorded core-never-fell assertion.
[Raw-bound proof](summary-observer-proof.json).

A second host-fixture correction compares the end-of-frame booster with the
end-of-frame lifecycle. At lethal frame 1206, ALIVE at frame start legitimately
becomes DYING and clears the booster. The permanent route now classifies that
frame correctly; a regression test covers it. The initial attempt and the
fresh passing Spread/cancelled-last-route captures are retained. No gameplay
threshold or damage/score rule was relaxed.

## Islands as cover for turret shots — not implemented

Current hull bands occupy columns 0–7 and 32–39; island art is central
(columns 9–30). A prospective cover check can qualify the two already captured
shell backing bytes by column, avoiding extra screen reads and new state.
**ESTIMATE:** 30–50 code bytes; roughly 5 instruction cycles for a blank fast
path, 40–50 per two-cell shell classification, up to about 150 for three.
Placement, overlay resolution, first-target priority and DMA-on timing require
proof. The 423-cycle composed-capital margin does not certify this estimate.

If backing/column classification is insufficient, the existing geometry
resolver `l2_interval` was measured at **286 instruction cycles maximum**
over 1,024 rows × three difficulties: **858 for three shells**, before mapping,
X overlap and caller overhead. That fallback is materially more expensive.
No native cover cost or feasibility PASS is claimed; the cheaper option needs
a separate measured implementation. [Cost and limitations](turret-cover-cost.json).

## Play delivery and owner commit

All requested comparisons are complete with no new candidate failure. Three
fresh normal builds pass their computed gates; the campaign build correctly
warns that canonical runtime evidence is stale and strict release will fail.
This is an owner-play delivery, not a strict release package. Every delivered
ATR matches all corresponding native-gated artifact hashes. Fresh solid-impact
and generated-memory-map checks pass **9/9**.
[Artifact binding](final-artifact-bindings.json), [final focused checks](final-artifact-focused.txt).

| Play ATR | SHA-256 |
| --- | --- |
| `build/play/shot-solid-impact/campaign.atr` | `717b9b7fa303fddfd7034960d9b6ee49969de1cc9b84172b9cecb37d1edd841b` |
| `build/play/shot-solid-impact/capital-480.atr` | `3967503e79e7bd685c86692fbbaf6f04c717f4b03e4109d9b4885c0152608fdd` |
| `build/play/shot-solid-impact/capital-960.atr` | `718aa2a0c6e02468793a78dd0375e7b25c0f0354b9e310d989709f55b55954a0` |

Known remaining issues: B2 recording unconfirmed; 140 shared unit failures;
32 shared release diagnostic assertions; the existing exact-message booster
ledger drift; strict release/evidence refresh debt. Enemy/turret cover remains
unimplemented. NEXT TASK: owner commits this bounded change and plays campaign,
capital-480 and capital-960 to check B1, B2 and Spread. Only the owner can mark
it OWNER-ACCEPTED. No automatic next roadmap work.


## Exact paths for the owner commit

All paths below are relative to the repository root. Play ATRs and raw build
captures remain ignored under `build/`; do not stage generated dist files.

```text
docs/STATUS.md
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/b1-expectations-focused.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/boot-gates.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/boss-stress-comparison.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/bounded-b2-complete.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/emulator-text-comparison.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/final-artifact-bindings.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/final-artifact-focused.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/final-build-campaign.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/final-focused.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/focused.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/home-gates.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/native-gates.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/reconcile-fixed-aggregate-ledger.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/reconcile-fixed-complete.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/reconcile-main-complete.txt
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/registered-input-equivalence.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/release-comparison.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/release-fixed-aggregate.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/release-main-aggregate.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/release-resume-bindings.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/report.md
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/segment-deltas.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/shot-cost.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/spread-attribution.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/summary-observer-proof.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/summary-projectile-edges-medium.jsonl
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/summary-projectile-edges.jsonl
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/turret-cover-cost.json
docs/diagnostics/shot-solid-impact/implementation-2026-10-30/unit-comparison.json
docs/diagnostics/shot-solid-impact/measure-cost.mjs
docs/game-design.md
docs/how-to-play.md
docs/how-to-play.pl.md
docs/memory-map.md
package.json
scripts/atari800-wall-trace.h
scripts/frame-peak-native.mjs
scripts/frame-peak-results.mjs
scripts/frame-peak-routes.mjs
scripts/runtime-wall-trace.mjs
scripts/weapon-pickup-runtime.mjs
src/main.s
tests/frame-peak-routes.test.mjs
tests/heavy-breakup.test.mjs
tests/heavy-package.test.mjs
tests/preview.test.mjs
tests/shot-solid-impact.test.mjs
tests/weapon-pickup-spread-shot.test.mjs
```

Suggested message: `fix: stop player shots on solid island and hull cells`
