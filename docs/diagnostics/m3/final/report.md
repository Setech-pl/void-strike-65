# M3 checkpoint5 — merge-ready owner-smoke candidate

Branch `codex/m3-plan`; current main8da7c66 is merged at**a0fb7d5**. No push,
release/tag or primary-checkout build/modification. Owner checkpoint4 review:
mechanics OK, balance too sparse/narrow. The new tuning and four-Light ceiling
remain **OWNER-SMOKE CANDIDATE**, ready for owner smoke before merge; no new
owner acceptance is inferred. Checkpoint5 combined work is complete.

Commit stack: checkpoint3 `b52d7ff`,4 `6cb44bc`, separate C-skin `25f3a69`;
this session data tuning **9f3735d**, four-Light change **1f299a5**, main merge
**a0fb7d5**, followed by this final documentation/test-audit handoff commit.
Git writes worked (one combined shell/stage invocation was denied; standalone
Git staging succeeded). Merge conflicts were status/debt and stale resource
pins; upstream test-debt fixes and M3's measured pins were both preserved.
Main is an ancestor; the owner can merge this branch without replaying changes.

## Requested tuning a–c

**a — implemented, data only.** Level2 entries alternate52/200/124; long
128–152-HPOS sweeps use every-frame lateral steps, mirrored pairs fan above
the viewport then appear on opposite sides and cross. Tracking keeps a slower
readable period. Approaches and bottom/upward departures remain quiet. All
pilot minima row0 and spacing16: the existing clear lock/next legal row tick
is the only inter-wave wait. First commit raises opening9→18 and pilot10→24
admissions at ceiling3; no runtime/state growth. No-fire native pilot30630,
all24 admissions/release complete. Heavy WaveDefs and level1 unchanged.

**b — implemented separately.** Raise only SWARM3→4, agreeing in C policy,
compiler clamp and host timeline; no new slot/PMG/backing/glyph bank. Four
SoA slots and renderer loops already existed. Instances share appearance
pairs by look; the existing3-pair limit still refuses unsafe replacement.
Level1 still authors3. Final opening3×8=24 and pilot4×8=32 admissions, with up
to4 alive. Six deduplicated paths fit96 existing payload B. All seven pilot
WaveDefs retain row0/spacing16. No code/state/allocation growth in any home.

**c — priced and deferred.** Linked actual clear/arm gaps are2–3 frames on
E/M/H with no kills and immediate kills. Renderer publication starts atY24:
visible entry cues are13–14 frames normally and up to34 for the mirrored fan.
The earlier Y16 body proxy understated this by4 frames; corrected test and
[per-route measurements](linked-timelines.json) preserve that distinction.

A scan-free cached-terminal decision probe in an isolated export compiles
**88 code +1 state B**, before integration: content**1952/1920,32 B over**;
helper88 alone also exceeds79 usable L2 B by9. Caller/guard, tick aggregation
and mixed-wave volley filtering would add more. Existing highest-slot logic
is not a full eligibility scan. A separate four-slot waiting scan is excluded
by the owner. No new scan, fighter-only policy relocation to resident window,
split helper, overlap semantics or reserve spend was introduced. Explicit
[pricing, CPU estimates, alternatives and reproducible probe](tuning/report.md).
This is the compiled straightforward option's failure, not a claim that all
future compaction is impossible. The short readable entry cue remains.

## Final resources — MEASURED normal build

| Home | Used /ceiling B | Usable free B | Delta vs checkpoint4 +HP |
| --- | ---: | ---: | ---: |
| Content | **1,863 /1,920** | **57** | 0 |
| Window | **2,437 /2,811 usable** | **374** | 0 |
| L2 | **1,457 /1,536 usable** | **79** (+256 protected) | 0 |
| Arena | 830 /832 | 2 | 0 |
| Director high | 324 /645 | 321 | 0 |
| C extension composite | 878 /899 | 21 | 0 |

Window physical capacity3584/free1147 includes lance768 and5-B reserve; total
M3 growth135≤300. Initial content12865 B/101 sectors unchanged. Eleven DFMC
records,214 total transport sectors,506 remaining ATR sectors; level format,
16-sector level buffer and per-level allocation unchanged. [Full fields](resources.json),
[generated current map](../../../memory-map.md).

C-skin stays36-B L2 policy,16-B window guard and3-B extension call, because
content free57 is below the owner's64-B floor. Four existing appearance-HP
payload bytes leave1 byte atABB7. HP table0 inherits archetype; hunter2/lancer4
in level2, other looks inherit. Weapons/points/renderer unchanged. Approved B
131-B volley prep and36-B HP policy total167 at$1E0A..$1EB0, leaving79 before
$1F00 protected fence. All Q5A modes remain; invalid pair/phase falls back to
normal fire/base HP before any checked-home read. Existing volley guard costs
69 instruction cycles per measured snapshot decision (630 direct/699 guarded,
no outer JSR/DMA); unchanged by tuning. No optional mode fallback was needed.

## Focused PAL/native evidence

Atari8007.1.2 tag57d24b1, PAL/DMA on, no guest instrumentation. Host lives/input
fixtures are declared in each report; this is task-focused evidence, not the
full native/home/release matrix. Every measured frame≤32568; no misses,
extra VBI, shifted publication, DLI/deadline anomaly or stale hull access.

| Route | Frames | Peak cycles |
| --- | ---: | ---: |
| Registered capital Spread NORMAL | 1800 | **30465** |
| Registered capital-960 NORMAL | 3967 | **31156** |
| Four path Lights +volley/combined EASY | 2200 | **32224** |
| Four path Lights +volley/combined NORMAL | 2200 | **32184** |
| Four path Lights +volley/combined HARD | 2200 | **32033** |
| Authored pilot EASY, shooting sweep | 1400 | **32079** |
| Authored pilot NORMAL, no fire | 1500 | **31239** |
| Authored pilot HARD, shooting sweep | 1400 | **32095** |
| Level2 Bomber approach/capital NORMAL | 2600 | **32089** |
| Registered boss pause HARD | 4300 | **31327** |
| Registered boss RESET/restart HARD | 5100 | **31327** |

Worst**32224:724 above31500 target,344 below32568 hard gate**. Stress contains
864 four-Light frames on each difficulty and observed four-shot pulses; target
exceedances40/39/33 frames on E/N/H, report-only. Stronger than the preliminary
wide-path trial30468/432 four-Light frames. [EASY](m3-four-easy.json),
[NORMAL](tuning/b-four-native.json), [HARD](m3-four-hard.json).

Quick peaks have0-cycle delta vs accepted checkpoint2. [Spread](quick-spread.json),
[960](quick-960.json). All three authored pilot routes admit all32 members and
exit sector4→5 around trace1163–1164, never skipping quiet release; linked
E/M/H no-fire/fast-kill tests also complete opening24/pilot32, span152 HPOS and
arm in2–3 frames. [EASY](m3-pilot-easy.json), [NORMAL](m3-pilot-normal.json),
[HARD](m3-pilot-hard.json). Avoidability/readability still needs owner play.

[Bomber approach](m3-bomber-approach.json) includes1066 Heavy frames, enters
capital at1426 after at least2 fully Heavy-free frames, traverses capital and
returns to SPACE. Linked2322 departure cases verify repaired3-raster-pixel/
frame average,≤75-frame exits, no departure fire, damage/holes and erase;
capital wait includes frame-counter wrap. [Boss pause](slot-e-pause-2-sweep-fire0.json)
resumes without map rebuild; [RESET](slot-e-reset-2-sweep-fire0.json) reaches the
boss, triggers path9, rebuilds maps exactly once, then draws capital in the
next game; zero dirty/stale reads. Both entries325 host frames≤350. Linked L2
lifetime tests execute full boss loops, capital death/respawn and actual START
GAME checked reload; poisoned-home tests cover boss/path/HP/volley guards.

Normal gated build PASS; stale release bindings correctly warn pending.
No loader/startup implementation changed. Native invocations use the focused
`--skip-boot-smoke` path for registered boss routes; no full real-SIO boot
matrix or release certification is claimed. Play variants also build/gate.

## Full tests against current main

One fresh isolated full `npm test` each: main8da7c66 **1632 PASS/11 FAIL/4 SKIP**;
task raw **1664/13/5** of1682. Exact file/name/first assertion/message diff:
raw A11/B2/C0. The two task-only failures are accepted ceiling3→4 expectations
in hybrid-lifecycle T5 and level-two's Director-route test. Corrected only
those expectations/comments (including the descriptive test name); ELITE1,
CAPITAL0, BOSS1, lower caps and all byte/guard fences remain enforced. Complete
affected files pass:34/34 including380-frame no-path/main comparison and4/4
six-sector level2 route cases. **Audited A11/B0/C0.** A1666/11/5 projection after
repairs is not a second full-suite run. Runtime/assets/build inputs are unchanged
from the frozen full run; [hashes](full-suite-source-hashes.json).

[Exact tuples/justifications](tests-ab.json), [main log](main-tests.log),
[task log](candidate-tests.log), [focused run](focused.log),
[repaired complete files](repaired-focused.log), [level2 file](level-two-focused.log),
[map checks](map-focused.log). Focused raw100 cases had only the same stale T5
and2 optional skips; the repairs also exercise the no-path comparison, leaving
only the optional Heavy-review route outside this task's focused setup.

Reconciliation matches all11 shared recorded main failures, zero moved. Raw
B2 are now repaired; no new behaviour was waived. Canonical unchanged trace
has0 new/moved and32 prior ledger entries absent from that old report; their
milestone debt is retained. [Reconcile](reconcile.log). Eight stale milestone-
evidence checks and three existing behaviour/fixture failures remain main
follow-ups; this task does not clear them or refresh release artifacts.

## Handoff and remaining work

[Regional recipe sheet](../../../plans/m3-regional-recipes.md): wider entries,
mirrored crossings,2–3-group bursts,4-Light maximum and proposed12-level ladder.
Current16-ID hull-style quarters remain unchanged; M7 must reconcile the final
campaign length. Per-level looks/default, PULSE/LASER and one heavyLook remain
independent; regional packs are optional. EN/PL player docs, authoring,
architecture, roadmap, STATUS and memory map are updated.

M4 inherits57 content/374 usable window/79 usable L2 (+256 protected),21
extension/24 reader B and a full1792-B summary reservation. Its provisional
180-B window core would leave194, not a compiled guarantee; old34-B reader
addition is10 short. M4 progression/summary, M7 remaining levels, M8 final
hardware balance remain future tasks. Terminal overlap, B-shot, independent
hues, Bomber skins/shot re-skin and independent per-wave HP remain explicit
DEFERs, with no silent scope drop or reserve use.

Six final ATRs at `build/play/m3/final/` (798816 B total): campaign, full
level2, pilot, four-Light volley stress, Bomber approach and boss. Bilingual
README has the smoke sequence: no-fire/fast-kill complete chains, width and
crossfire escape, four-Light volleys, HP2/4, clean exits, Heavy/capital and
pause/death/restart. [SHA-256 manifest](play-artifacts.json). Campaign/pilot/
approach/volley hashes match the native-tested images. Earlier review packs
remain untouched. Dist is restored to its tracked release state.

Cleanup (`du -sh`): task cache367M→4.0K; whole `.cache`370M→2.3M;
`build`88M→2.5M (final pack804K, prior packs retained).
`df -h /System/Volumes/Data`:402Gi free,56% used.
Full measurements are in [cleanup.json](cleanup.json). Task exports, private
emulator/source/archive, copied dependencies, raw captures/profiles and build
outputs are removed; only requested ATRs and MD/JSON/log evidence remain.
Root node_modules and other task caches remain. All launched test/native
sessions completed; no background server/listening port was launched.

**NEXT: owner smokes this final pack and merges the branch. STOP; no M4 work.**
