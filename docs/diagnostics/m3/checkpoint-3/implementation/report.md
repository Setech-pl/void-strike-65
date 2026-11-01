# M3 checkpoint3 — OWNER-SMOKE CANDIDATE

Owner authorized option B and automatic option C fallback on a linked fit or
volley-frame failure. **B fits and passes timing; C was not used.** All Q5A
modes remain: segment fire permission, column±one4-HPOS cell,64-frame volley
opportunities and combined mode. Checkpoint2 stays owner-accepted;3 is not
owner-smoked yet. This report's commit is the checkpoint3 implementation.

| Home | Checkpoint2 | Checkpoint3 | Delta |
| --- | ---: | ---: | ---: |
| Content /1,920 | 1,800 | **1,863** | +63 |
| Window /2,811 usable | 2,384 | **2,421** | +37 |
| L2 /1,536 usable (+256 protected) | 1,290 | **1,421** | +131 |

Content57 B free; window390 usable; L2 115 usable plus256 protected. Arena830,
Director high324 and initial content12,865 B unchanged. Snapshot C is exactly
131 B at$1E0A, assembled in the Director link for resolved C references, emitted
separately and appended to the checked L2 image; final append address/extent
and post-1.0 fence are asserted. It is not a new DFMC record or memory capacity.
Content state remains content-owned. [Build fields](resources.json).

A resident guard checks the existing shared checked-L2/content valid flag
$86B3, gameplay phase6 and fighter state7 BEFORE any L2 entry or home-state
read. The checked pair is invalidated before boss/death/reload. Invalid call
returns0 for normal fire; the ordinary Light entry already falls back to
resident archetype movement/fire if the checked pair is invalid, reading
neither poisoned home. No separate stale L2 state is cached. Direct guard,
invalid phase and full normal per-member token fallback are tested.

The successful three-ready-member snapshot costs630 instruction cycles;
guarded entry699, **69 cycles overhead per volley decision** (entry-through-
RTS, no outer JSR/DMA). Snapshot claims one existing token; individual ready
members consume only their mask bits. Late/reused admission clears its bit;
denial does not reload or accumulate shots. Ordinary off-opportunity frames
cannot emit a deferred volley. Existing pool overflow and appearance action
priority remain unchanged. [Guard measurement](guard-cost.json).

Native Atari8007.1.2 (upstream tag57d24b1), PAL/DMA on:

| Route | Frames | Peak |
| --- | ---: | ---: |
| Spread NORMAL | 1,800 | **30,465** |
| capital-960 NORMAL | 3,967 | **31,156** |
| no-fire3-Light snake/volley +combined review | 1,800 | **30,207** |

All≤32,568, no misses, extra VBI or DLI/deadline errors. Boss entry325.
Volleys observed as simultaneous3-shot rises at128 (30,019 cycles) and832
(29,815). There are769 three-Light frames; their peak30,207. Diagnostic
`--m3-volley-review --level=2:sector=0` with park176/no-fire10000 is isolated
from campaign data. [Spread](quick-spread.json), [960](quick-960.json),
[volley coverage/report](volley-native.json). No full native/home matrix.

Focused compiler, policy, poison guards, Heavy regression/byte and map checks
**65 PASS/1 optional H12 review SKIP**, including the380-frame no-path/main
comparison. [Log](focused.log). Full task suite/A-B-C follows final4/C-skin
in an isolated snapshot. Main advanced to8da7c66 (test-debt part2): its accepted
54 test/fixture/registry files were aligned without a merge or game-source
change, before task validation. Added checks pin actual M3 growth separately
from the unchanged H14 budget; protected ranges/addresses remain checked.
No strict release/evidence-refresh claim; normal build reports pending evidence.

**NEXT: authorized checkpoint4 chains/pilot, then separate C-skin commit.**
Content57 B means C-skin must use L2 if any admission code is added; actual
placement/bytes still measured in its own commit. Owner smokes after4.

Checkpoint3 play ATRs: `build/play/m3/checkpoint-3/campaign.atr` and
`volley.atr`; [hashes](play-hashes.json). Full4 delivery follows.
