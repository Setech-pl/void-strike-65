# M3 checkpoint4 — OWNER-SMOKE CANDIDATE

This commit implements host-only chain expansion and the level2 pilot. C-skin
is the following separate commit. Checkpoint3 `b52d7ff` keeps all Q5A modes
through the approved guarded L2 helper; option C fallback was not needed.

| Home | After3 | After4 (before C-skin) | Delta |
| --- | ---: | ---: | ---: |
| Content /1,920 | 1,863 | **1,863** | 0 |
| Window /2,811 usable | 2,421 | **2,421** | 0 |
| L2 /1,536 usable (+256 protected) | 1,421 | **1,421** | 0 |

No new guest interpreter/state/queue. Named recipes expand to ordinary validated
WaveDefs; `with` supplies defaults, step fields win, rows are relative offsets.
Unknown/nested/malformed chains and emitted-wave/path limits fail rather than
truncate. Explicit waves remain byte-identical. Expansion/timeline JSON is
emitted per level. Exact path terminal lifetime is modeled; no-fire/instant-
kill schedules are estimates excluding token/reaction/restore delay. Mixed
Heavy/no-path lifetimes are explicitly unknown, never presented as certified.
[Timeline](pilot-timeline.json), [resources](resources.json).

Level2 opens with three small straight/snake/mirrored introductions. Sector4
is teach(shallow)→mirror(snake)→pressure(tracking/combined)→release(quiet return)
at minimum rows0/8/16/24. The existing Light lock serializes it; low minimum
rows remove long authored waits after early kills. AllE/M/H no-fire models
fit and immediate-kill models add no inter-wave authored idle. Sector6 retains
tracking pressure with column fire. There are exactly20 expanded waves,5
unique paths; no class/capacity increase. All12 decoded Heavy WaveDefs match
checkpoint3's canonical tuple hash, including holds/kinds/escorts/counts/rows;
level1 source is unchanged. No new departure/capital/boss policy.

Normal build gates PASS. Chain/compiler focused15/15 PASS. Byte-equivalence,
malformed/nested/overflow cases, lifetime boundaries, no-fire cut warnings,
fast-kill minimum rows and unchanged Heavy data are checked. [Focused log](focused.log).
Task-wide full suite/A-B-C follows C-skin, with its source isolated from play builds.

Native PAL/DMA on: quick Spread30,465; capital-96031,156 (boss entry325).
Final no-fire chain case1,400 frames, **30,649 peak**, zero misses/extra VBI/
DLI/deadline errors. Exactly10 free Light admissions occur in sector4; it
clears into sector5 after864 trace frames, proving release is not skipped.
A preliminary row128/256/384 recipe also cleared all10 both shooting/no-fire,
then the final low-row recipe was rechecked to remove early-kill gaps. Earlier
captures are not used as final recipe proof. [Chain](chain-native.json),
[Spread](quick-spread.json), [960](quick-960.json).

Runtime bytes are unchanged from3, so its dedicated3-Light volley case remains
30,207/769 three-Light frames with observed3-shot emissions. Final combined
C-skin delivery repeats that case after the new admission code is linked.
Guard overhead remains69 instruction cycles/volley decision. Normal release
wall evidence stays pending; no full matrix or release certification.

Pre-HP swarm ATR is `build/play/m3/checkpoint-4/pilot-no-hp.atr`; its hash is in
resources.json. C-skin's following commit refreshes final play ATRs/instructions.

**NEXT: separate C-skin commit, then STOP for owner smoke of4.** Its placement
uses the already measured57-B content free value: any added content code would
leave less than64, so HP admission policy must use existing guarded L2. M4 still
owns campaign/progression/summary flow; M7 owns remaining levels/regional data.
Mixed Heavy-sector timing/balance remains existing data for owner/M7 review;
this task does not promise no-fire completion of every old Heavy wave. B-shot,
independent hues, Bomber skins/re-skin remain deferred.
