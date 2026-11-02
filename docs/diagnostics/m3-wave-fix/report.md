# M3 wave-design correction — candidate, owner smoke pending

Work only in `codex/m3-tune`, starting at `597e4e5`. Tempo from that checkpoint
is owner-accepted; this wave design is not. No runtime C/ASM, HP or shot changes.

The data replaces vertical terminal descent with mirrored full-width sweeps.
Segment 2 jumps back one segment; each cycle advances down by 76 NORMAL /152
EASY /76 HARD lines (NORMAL calm paths use152). Retirement at Y232 occurs
while moving diagonally; the fourth, unreachable safety terminal is diagonal
as well. Roughly two to three outward-and-return passes occur per member;
HARD wide motion retains dy2 and its calm paths retain half-rate dy1;
NORMAL/EASY use dy1 and all prior lateral periods. No speed
multiplier, new slot state, payload size, address or segment change.

All six named path definitions and both authored tempo overrides are corrected.
Opening repeats the same flight recipe three times, preserving its original
archetypes/looks/count24. The chain has two identical hunter groups followed
by two identical lancer volley-column groups, count32. Minimum row0, spacing16,
mirroring and four-slot capacity remain. This uses the existing20 WaveDefs;
no interpreter or extra repeat records. NORMAL cut bounds become1600/2040
rows; EASY1536/2040, HARD896/1728. Heavy/capital sectors remain unchanged.

## Residual limits and code price — reported before any code implementation

This is a data improvement, **not a claim of uninterrupted pressure or zero
alignment**. Linked NMOS execution for all three tempo payloads, all three
menu difficulties, no-fire and immediate-kill policies admits every member.
No-fire opening/pilot completions: EASY2915–2917/3888–3890,
NORMAL3144/4040–4043, HARD1650–1651/3198–3199 frames. State handoffs take2–4
frames, depending on world-row cadence; within-wave spacing is17 frames
when a slot is free (authored16 plus countdown), otherwise capacity waits.

Actual empty visible intervals at renderer topY24:

| Payload | Opening | Pilot |
| --- | --- | --- |
| EASY | 49 within batch refill;101–102 between groups |49;101–102 |
| NORMAL |11;63–64 |11 or49;63–104 |
| HARD |32–34 between groups |11–12 refill;33–65 between groups |

The clear lock and hidden fan cause these gaps. Paired members can still share
X briefly at turns/crossings; NORMAL has4–8 whole-visible-population aligned
frames per measured sector; HARD has2–8 in the pilot and0 in the opening; EASY0. This differs from the old long terminal
column, but fails a literal “no column at any point” requirement. See every
case in [linked-timelines.json](linked-timelines.json). The metric counts exact
X equality, including a natural crossing; it is not a raster visual judgement.

Alternatives, **not implemented**:

- Admission start-column spread using slot-index offsets: ESTIMATE16–48 C
  code B,0 new state B,40–140 instruction cycles/admission. Fits57 content B
  only toward the lower end; needs compilation/placement proof. It separates
  same-phase members initially but clamp convergence can erase the separation;
  it cannot remove clear-lock pauses.
- Per-member lateral phase/offset during path execution: ESTIMATE32–80 code B
  plus0–4 state B,30–100 cycles/member/tick (120–400 for four, before DMA).
  Lower end may fit content57 or L2 79, upper end requires splitting into
  window374. Needs clamp/mirror proof and fresh native timing. This addresses
  alignment, not admission gaps.
- Existing bounded-overlap prototype: previously MEASURED88 code B +1 state B,
 32 B beyond current content57 and9 beyond L2 79, before integration. Prior
  integration ESTIMATE16–24 resident caller B,12–24 aggregation B,8–16 L2
  filtering B and180–320 cycles/frame. Window placement/splitting needs proof;
  cached terminal eligibility avoids a new slot scan. It can reduce inter-wave
  gaps but still needs a refill/entry design for long-lived four-slot batches.
  [Original compiled probe and limits](../m3/final/tuning/report.md#stage-c--bounded-overlap-priced-not-implemented).

A blanket compiler rejection is deferred: intentional `straight` multi-member
fixtures and library paths currently permit this shape; changing the global
contract requires fixture/library migration beyond a cheap guard. Focused
checks instead exercise the actual looping authored pilot and terminal data.

## Build, tests and audit

Final normal gated build PASS:214 occupied sectors,27392 transport bytes,
133136-B ATR. Runtime release evidence remains pending; no strict release
or milestone trace is claimed. Content1863/1920, L2 1457/1536 usable,
window2437/2811:57/79/374 B free, unchanged from task start. RAM/residency
and runtime instruction-byte delta for this follow-up:0. Main differs only
by the already delivered two-immediate hit-area correction; content/L2/window
binaries hash identically. [Resource hashes](resources.json).

One full `npm test` per source: main1682 tests,1665 PASS/12 FAIL/5 SKIP;
task1685,1669 PASS/11 FAIL/5 SKIP. **A11/B0/C1**, matched by file, name,
first failing assertion and message. C1 is the pre-existing m3-tune correction
of a stale documentation ceiling3 expectation to4. Every shared failure
matches canonical recorded unit debt. Exact tuples: [tests-ab.json](tests-ab.json).
Task reconciliation against unit/trace records PASS; main reconciliation
flags that stale ceiling assertion. Existing32 milestone-trace debts remain.
No fresh milestone evidence or release-readiness claim.

Focused full files: level/compiler/path/tempo41 PASS/1 optional SKIP;
final path/tempo rerun28 PASS/1 SKIP (includes final HARD calm half-rate
correction), authored/chain8 PASS, build-variants4 PASS. These overlap and
are not additive. The additional authored-loop regression case was added
after the full suite began and passes focused. The full suite read evolving
wave expectations; final complete affected-file runs cover the final state.
No second full suite.

Self-resolved cases:

- Sector/capital maximum pins in two tests now match the new authored cut
  bounds1600/2040, preserving Heavy rows and all traversal assertions.
- The fan test expects diagonal visible arrivals152/96 rather than the old
  stationary entry200/48; it still requires the members to cross.
- A focused compiler model warned NORMAL's1536-row opening could cut the last
  group. It was increased to1600; every conservative schedule and linked
  admission check passes. Final HARD calm paths preserve their prior period1
  and dy1; its pilot cut bound1728 preserves every admission.
- The first NORMAL stress capture raced an artifact rebuild and had no
  four-shot-rise subject. It was rejected by the evidence collector and
  repeated after all variant builders finished. No such incomplete capture
  is counted as accepted evidence.

## Delivery and next task

Seven freshly rebuilt play ATRs in `build/play/m3-tune/`; matching difficulty
must be selected in OPTIONS. Each has one absolute `atari800 -xl -nobasic -pal`
launch line and SHA-256 in [English](README.md) / [Polski](README.pl.md),
and [delivery.json](delivery.json). Rebuild: `node scripts/build-m3-tune-play.mjs`.
The volley ATR intentionally keeps the existing stronger diagnostic paths;
its single-column fixtures are not authored campaign wave design.

**Owner smoke pending.** Review whether the remaining crossings/gaps warrant
one of the priced code changes. None is implemented. No merge, push, release,
tag or next roadmap task. Tempo acceptance is preserved; no new smoke
acceptance is inferred.

## Native PAL results (MEASURED)

| Route | Frames | Worst cycles | vs31500 | Margin to32568 |
| --- | ---: | ---: | ---: | ---: |
| Spread NORMAL |1800|30465|-1035|2103|
| capital-960 NORMAL |3967|31156|-344|1412|
| 4-Light/volley EASY |2200|32224|+724|344|
| 4-Light/volley NORMAL |2200|32184|+684|384|
| 4-Light/volley HARD |2200|32033|+533|535|
| new pilot NORMAL |4600|31685|+185|883|

All six focused reports PASS, zero missed/extra-VBI/deadline/physical-overrun/
DLI-order events. Each stress has864 four-Light frames and1/2/1 observed
four-shot rises. Pilot has3415 four-Light frames and reaches the following
sector. All accepted captures bind the delivered ATR hashes. Worst32224 is
report-only above target and344 below the hard gate. Quick-route CPU delta0
versus the previous fresh eaae85a controls30465/31156 recorded in the tempo
report (not a new native main capture in this follow-up). The new pilot's
longer occupancy changes composition:31685 vs prior31281, +404 sampled cycles.

[Native details, worst rows and artifact/trace hashes](native.json).
`node docs/diagnostics/m3-wave-fix/collect-native.mjs` verifies the focused
reports and four-Light/volley subject. Reproduce using the previous tempo
report's source preparation and capture commands, changing the emulator source
to `.cache/m3-wave-fix/atari800-7.1.2`; NORMAL pilot now needs4600 frames.
Build variants first, then capture; never rebuild an artifact during capture.
The canonical boss-loading/Warning transition exclusion is retained; all
raw transition wall times are recorded. No gameplay frame is excluded.

## Cleanup

`du -sh` task directory before→after: **149M→0B**; whole worktree `.cache`: **149M→4.0K**.

`df -h /System/Volumes/Data` before:
```text
Filesystem      Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s5   926Gi   568Gi   333Gi    64%    6.1M  3.5G    0%   /System/Volumes/Data
```
After:
```text
Filesystem      Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s5   926Gi   568Gi   333Gi    64%    6.1M  3.5G    0%   /System/Volumes/Data
```

Only this task's cache export/dependency symlink/emulator/intermediates were
removed. Worktree node_modules and other task caches remain. Curated evidence
is under1 MB; no retained oversized evidence. All own build/test/emulator
processes completed; no Vite/Worker/Chrome/workerd or listening port was started.
`dist/` is restored to HEAD. [Exact measurements](cleanup.json).
