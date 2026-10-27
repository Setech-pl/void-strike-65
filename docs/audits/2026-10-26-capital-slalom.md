OWNER SMOKE CANDIDATE

# Continuation completed — 2026-10-26

The owner resolved the centre-first blocker by allowing left/right starts below
328 rows and defining the straight-flight criterion as a **16-HPOS ship plus
4 HPOS margin**. Both patterns now pass at **all 85 legal lengths**, including
288; no length is excluded. Normal builds and computed gates pass. Owner smoke
and real-hardware acceptance remain pending. No merge, push, tag or release.

Preflight: correct worktree and branch, clean tree, log
`3609f02 [codex] Record short-hull centre-first slalom gate blocker`.
Baseline main is `bf4d410` (§BY). Runtime implementation is `e2bd1ff`;
subsequent changes are tests, diagnostics and documentation. All commands ran
inside this worktree. The private emulator is `build/slalom-atari800`, copied
with links dereferenced and reconfigured locally. Owner symlinks were only read.

## Sequence and representation

**Offset Weave** is the default; **Tight Weave** is the sole harder variant.
Below 328 rows the sequence is left/right. From 328 rows it starts centre,
then alternates left/right; it never places two islands on one row. The complete
runtime lookup remains 120 bytes. There is no Director RNG.

| Hull rows | Island index (1-based) | Side | Default centre cell / HPOS | Tight centre cell / HPOS | Local rows (inclusive) |
| --- | --- | --- | --- | --- | --- |
| 288 | 1 | left | 15 / 108 | 16 / 112 | 96–119 |
| 288 | 2 | right | 25 / 148 | 24 / 144 | 184–207 |
| 352 | 1 | centre | 20 / 128 | 20 / 128 | 64–87 |
| 352 | 2 | left | 15 / 108 | 16 / 112 | 152–175 |
| 352 | 3 | right | 25 / 148 | 24 / 144 | 240–263 |
| 416 | 1 | centre | 20 / 128 | 20 / 128 | 64–87 |
| 416 | 2 | left | 15 / 108 | 16 / 112 | 152–175 |
| 416 | 3 | right | 25 / 148 | 24 / 144 | 240–263 |
| 416 | 4 | left | 15 / 108 | 16 / 112 | 328–351 |
| 480 | 1 | centre | 20 / 128 | 20 / 128 | 96–143 |
| 480 | 2 | left | 15 / 108 | 16 / 112 | 208–255 |
| 480 | 3 | right | 25 / 148 | 24 / 144 | 320–367 |
| 960 | 1 | centre | 20 / 128 | 20 / 128 | 96–143 |
| 960 | 2 | left | 15 / 108 | 16 / 112 | 208–255 |
| 960 | 3 | right | 25 / 148 | 24 / 144 | 320–367 |
| 960 | 4 | left | 15 / 108 | 16 / 112 | 432–479 |
| 960 | 5 | right | 25 / 148 | 24 / 144 | 544–591 |
| 960 | 6 | left | 15 / 108 | 16 / 112 | 656–703 |
| 960 | 7 | right | 25 / 148 | 24 / 144 | 768–815 |

Cell coordinates use screen cell zero at HPOS 48. X is the recipe's **centre**,
not its left edge. Universal source row = local row + 960 − hull length.
Recipes cycle 01/03/05 and colours alternate allied/enemy. Maximum plate widths
remain EASY/MEDIUM/HARD **24/32/40 HPOS**; no new glyph or collision shape.

For every length 288–320: first 96, height 24, spacing 88. For 328–424:
first 64, height 24, spacing 88. For 432–960: first 96, height 48, spacing 112.
Every clear gap is at least 64 rows and the final 64 rows are clean. The compiler
rejects unknown fields/enums and manual placement overrides on slalom patterns.
Legacy salvage remains supported. See [authoring](../level-authoring.md).

Tight Weave moves side islands inward from ±20 to ±16 HPOS. An exhaustive
four-HPOS-grid check rejects offsets 0/4/8/12: they retain a straight 20-HPOS
edge band. Thus ±16 is the most inward passing translation with the unchanged
art/widths and sequence. Its EASY side-plate passage is 48 HPOS versus 52 for
the default; neck rows necessarily have wider passages. “As narrow as allowed”
does not mean an artificial 20-HPOS corridor at every row: fixed island widths
cannot produce that. [Tightness enumeration](../diagnostics/capital-slalom/tightness.json).

## Byte ledger and execution cost

All figures below are **MEASURED**, except the explicitly labelled arithmetic
contingency. No resident/shared runtime or `src/main.s` change was made.

| Item | Main | Candidate | Delta |
| --- | ---: | ---: | ---: |
| Linked L2 contents | 1192 B | 1250 B | +58 B |
| Slack below unchanged 1,536-B gate | 344 B | 286 B | −58 B |
| Untouched post-1.0 reserve | 256 B | 256 B | 0 |
| Runtime lookup | 120 B | 120 B | 0 |
| Level image | 2,048 B | 2,048 B | 0 |
| Resident/shared source changes | 0 B | 0 B | 0 |
| Boot/chunk occupied sectors | 211 | 211 | 0 |

L2 ends at $1DE1 inclusive. The new helper is 54 B and scratch is 3 B; the
pixel motif compare grows 1 B. The prefix grows 11 B absorbed by existing
alignment padding. Recipe tables and all C function addresses stay fixed.
An initial inline link measured 1,452 B; moving the same helper after the
existing C/cold tail recovered 202 B, resulting in 1,250 B. No reserved space
or gate was changed. The helper call/return adds 12 CPU cycles per occupied
interval versus the inline trial, included in the contact/native measurements.
[Linked ledger](../diagnostics/capital-slalom/bytes.json).

Two-times the measured net addition is **116 B** (arithmetic contingency,
not a second measurement), still within the original 344-B slack. No GUESS
was needed for the delivered byte count. Header bytes $AD03–$AD07 encode the
placement magnitude/table; lookup tag bits 6..7 select it. This is not data-only:
ASM L2 applies the data offset to interval and both motif selectors, and widens
its existing broad reject. High-level C, damage, lifecycle, brake and warning
policy are unchanged. The exact §BY pixel-contact algorithm is unchanged.

Bounded linked contact sweep maximum: **14095 CPU cycles**, DMA off,
not a frame-time estimate. No VBI/DLI work is added. **SPACE: all 720 complete-loop
fixtures are identical, CPU delta 0**. The reserve, C ABI, protected areas,
PAL hard gate 32,568, target 31,500 and boss-entry limit 350 are unchanged.

## Host proof

[Full results](../diagnostics/capital-slalom/proof.json): **2,545,920
row/alignment/difficulty cases**, both patterns, every multiple of eight in
288..960. The model uses the complete solid interval (conservative relative to
real glyph holes), all 15 ship scanlines and all eight fine alignments, inside
the guaranteed [84,172) hull corridor. A 20-HPOS envelope encloses the visible
16-HPOS ship with the required 4 HPOS margin. The eight alignment domains are
intersected before path finding, so the witness is valid across fine changes.

Passability uses that conservative envelope. Absence of straight bands is
also checked independently against **actual published glyph pixels**, for
all recipe/colour pairs on both sides, both offsets and all difficulties;
this avoids using an over-approximation to claim a nonexistent straight route.
The shifted exact-contact oracle executes **1,163,520
cases**, all designs/colours/difficulties, eight fine alignments and plate/neck
transitions: **zero false positives and zero missed contacts**.

Minimum travel is an exact host dynamic-programming result on the actual even-HPOS joystick
grid. A second search constrained to at most two HPOS per world row finds
the **same minimum total travel**. The largest shift/window columns describe
that minimum-travel witness, not a claim that every optimal path has identical
window timing. Per-window maxima at 1/8/16/32/64/112 rows are in the JSON.

| Pattern | Rows | Difficulty | Minimum total travel HPOS | Largest witness shift HPOS / shortest window rows | Minimum largest passage HPOS | Speed margin |
| --- | --- | --- | ---: | --- | ---: | ---: |
| Offset | 288 | EASY | 4 | 4 / 2 | 52 | 2× |
| Offset | 288 | MEDIUM | 12 | 12 / 6 | 48 | 2× |
| Offset | 288 | HARD | 20 | 20 / 10 | 44 | 2× |
| Offset | 352 | EASY | 24 | 24 / 90 | 32 | 2× |
| Offset | 352 | MEDIUM | 32 | 32 / 94 | 28 | 2× |
| Offset | 352 | HARD | 40 | 40 / 98 | 24 | 2× |
| Offset | 416 | EASY | 28 | 24 / 90 | 32 | 2× |
| Offset | 416 | MEDIUM | 44 | 32 / 94 | 28 | 2× |
| Offset | 416 | HARD | 60 | 40 / 98 | 24 | 2× |
| Offset | 480 | EASY | 24 | 24 / 114 | 32 | 2× |
| Offset | 480 | MEDIUM | 32 | 32 / 122 | 28 | 2× |
| Offset | 480 | HARD | 40 | 40 / 130 | 24 | 2× |
| Offset | 960 | EASY | 40 | 24 / 114 | 32 | 2× |
| Offset | 960 | MEDIUM | 80 | 32 / 122 | 28 | 2× |
| Offset | 960 | HARD | 120 | 40 / 130 | 24 | 2× |
| Tight | 288 | EASY | 12 | 12 / 6 | 48 | 2× |
| Tight | 288 | MEDIUM | 20 | 20 / 10 | 44 | 2× |
| Tight | 288 | HARD | 28 | 28 / 14 | 40 | 2× |
| Tight | 352 | EASY | 28 | 28 / 94 | 32 | 2× |
| Tight | 352 | MEDIUM | 36 | 36 / 98 | 28 | 2× |
| Tight | 352 | HARD | 44 | 44 / 102 | 24 | 2× |
| Tight | 416 | EASY | 40 | 28 / 94 | 32 | 2× |
| Tight | 416 | MEDIUM | 56 | 36 / 98 | 28 | 2× |
| Tight | 416 | HARD | 72 | 44 / 102 | 24 | 2× |
| Tight | 480 | EASY | 28 | 28 / 130 | 32 | 2× |
| Tight | 480 | MEDIUM | 36 | 36 / 132 | 28 | 2× |
| Tight | 480 | HARD | 44 | 44 / 134 | 24 | 2× |
| Tight | 960 | EASY | 76 | 28 / 130 | 32 | 2× |
| Tight | 960 | MEDIUM | 116 | 36 / 132 | 28 | 2× |
| Tight | 960 | HARD | 156 | 44 / 134 | 24 | 2× |

The world advances 16/40, 18/40 and 20/40 character rows per frame on E/M/H;
ship lateral speed is 2 HPOS/frame. The witness needs at most two HPOS per row:
average required speed ≤0.8/0.9/1.0 HPOS/frame. Even the fastest row cadence
leaves at least two host gameplay frames between row advances, so the bound
is **1 HPOS/frame and 2× margin on every difficulty**. EASY meets the
required 2× margin. Braking only increases time available. These are sufficient
witness-speed bounds, not measurements of an optimal minimum speed.

**EASY is geometrically clearable without firing**; no proof step removes an
island or assumes a weapon. Avoiding hostile fire still requires owner play.
A deliberate distinction: the approved criterion removes straight **20-HPOS**
bands. It does not rule out every zero-margin 16-HPOS slit. On EASY the short
default has a 16-HPOS central slit; Tight Weave has 16-HPOS outer slits. These
fail the required extra clearance, but a pixel-perfect straight flight without
that margin is not claimed impossible. No proof threshold was weakened.

## Native comparison

Fresh main → candidate, native Atari800 PAL, DMA on. Same 12 diagnostic routes,
including host-held lives exactly as on main; these are not release evidence.

| Rows | Difficulty | Route | Capital peak | Full-route max | Frames >31,500 | Minimum fighter fence | Boss entry frames |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 480 | EASY | flight/contact | 21799 → 29756 | 31189 → 31105 | 0 → 0 | 5829 → 5963 | 325 → 325 |
| 480 | EASY | brake/contact | 22451 → 28264 | 31046 → 30992 | 0 → 0 | 7061 → 7167 | 325 → 325 |
| 480 | MEDIUM | flight/contact | 23611 → 26402 | 31166 → 31196 | 0 → 0 | 6388 → 5366 | 325 → 325 |
| 480 | MEDIUM | brake/contact | 25165 → 28082 | 31198 → 31204 | 0 → 0 | 5922 → 5691 | 325 → 325 |
| 480 | HARD | flight/contact | 23969 → 27681 | 31445 → 31445 | 0 → 0 | 5253 → 5120 | 325 → 325 |
| 480 | HARD | brake/contact | 22670 → 28936 | 31598 → 31552 | 10 → 5 | 5120 → 5824 | 325 → 325 |
| 960 | EASY | flight/contact | 21838 → 27690 | 31164 → 31164 | 0 → 0 | 5855 → 5855 | 325 → 325 |
| 960 | EASY | brake/contact | 23241 → 27435 | 31162 → 31162 | 0 → 0 | 5851 → 5851 | 325 → 325 |
| 960 | MEDIUM | flight/contact | 24982 → 29038 | 31257 → 31257 | 0 → 0 | 6488 → 6508 | 325 → 325 |
| 960 | MEDIUM | brake/contact | 25283 → 28390 | 31256 → 31256 | 0 → 0 | 6488 → 6508 | 325 → 325 |
| 960 | HARD | flight/contact | 23967 → 28770 | 31432 → 31432 | 0 → 0 | 5694 → 5694 | 325 → 325 |
| 960 | HARD | brake/contact | 24868 → 28694 | 31432 → 31432 | 0 → 0 | 4977 → 4977 | 325 → 325 |

Every route on both builds: **missed frames / extra VBI / DLI errors / shifted
rows / stale L2 / world-hull mismatch = 0 / 0 / 0 / 0 / 0 / 0**. Candidate capital
peak 29756; full-route max 31552; hard-gate margin 1016; frames above
target 5; global minimum fighter fence 4977. Every route reaches
phase 968 and boss entry stays within 350 host frames. Both trace reconciliations
PASS with zero NEW/MOVED failures. [Comparison](../diagnostics/capital-slalom/native/comparison.json).

Raw baseline captures are retained in build/slalom-main-480 and
build/slalom-main-960; candidate captures in build/level-1-s1 and
build/l2-capital-960. Clock/lifetime files are in build/slalom-native-{main,fixed}.
The private observer binary was prepared on main and reused for candidate
runs; each session loads its own symbols and checked ownership images.

## Builds, tests and ATRs

Normal builds pass with the expected stale release-evidence WARNING; release
build would fail until its separate evidence refresh. No release build,
full npm test or boss stress was run. Focused suite **11/11 PASS**, shifted
contact **zero mismatches**, host proof **PASS**, memory-map check **PASS**.
Logs are retained under [logs](../diagnostics/capital-slalom/logs/).

Paths, SHA-256, descriptions and launch commands were printed immediately after
each normal build and recorded in [play.md](../diagnostics/capital-slalom/play.md).
All four images allow difficulty selection in OPTIONS. Direct 480/960 default
hashes match all six corresponding native runs. Tight Weave uses a documented
build-time level-data substitution through the normal compiler and gates; its
image is retained in build/slalom-tight-480. The 12-route matrix covers the
default; both variants have host/raster/contact coverage.

| Absolute ATR path | SHA-256 | Description | Launch |
| --- | --- | --- | --- |
| /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/campaign.atr | 7adfecb7a49f107d392b855a25d2a44a1c3125d7797dfdb379934347f0aa6564 | Offset Weave campaign; difficulty selectable in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/campaign.atr` |
| /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/tight-480.atr | 12223f94f7ffd21a120fb683819f932830633804af5c837c5491d7dfad8f5d05 | Tight Weave direct capital, 480 rows; difficulty selectable in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/tight-480.atr` |
| /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/capital-480.atr | bfb7b4498e20c915c36d0157a270dfa3f684cdb5ae3bb9586a1b4f985d29911f | Offset Weave direct capital, 480 rows; difficulty selectable in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/capital-480.atr` |
| /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/capital-960.atr | 1251f4b9392c908e4161a73e1f9bcc8191646b46f13a19a1c5e87a549e1112ea | Offset Weave direct capital, 960 rows; difficulty selectable in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-slalom/build/play/slalom/capital-960.atr` |

## Owner smoke and deviations

- No straight 20-HPOS band works; assess the disclosed zero-margin slits separately.
- EASY is clearable without firing and weaving feels fair.
- Island edges still hurt; wait **more than five seconds after respawn**.
- Brake and the 35-frame bottom warning are unchanged.
- Verify 65XE/SIO2SD timing on real hardware.

The speed proof was tightened during review from a one-HPOS mathematical grid
to the actual two-HPOS joystick grid. The final proof retains the same minimum
travel and reports a conservative 2× margin, superseding the earlier 4× update.

The initial SPACE fixture attempt lacked the dist-output redirection and
rejected a baseline ATR/manifest mismatch before execution. Rerunning with the
same normal-build routing produced the measured 720/720 comparison. An early
inline L2 assembly required local branch-range repair; no gate was weakened.
Both are diagnostic/setup iterations, not hidden runtime failures.

Phase 1's centre-first blocker is superseded by the owner's short-hull decision.
No hull length was stopped. No shared-code change, mine, bonus, dock, contact-rule
change, STATUS update or next-roadmap work was introduced. Player documentation
was updated in English and Polish; engineering documentation remains English.

**Owner questions / recommendation:** smoke Offset Weave first, then compare
Tight Weave on EASY. The current approved 20-HPOS criterion passes. If the intent
later becomes blocking every exact-width 16-HPOS line as well, treat that as a
new requirement; narrow art and the 288-row two-island limit need a new proof.
No further technical approval is needed for this candidate's present scope.

NEXT TASK: owner smoke; only the owner accepts and merges with --no-ff.

---

BLOCKED_CENTRE_FIRST_ALL_LENGTHS

# Capital slalom — feasibility stop

The requested centre-first default cannot satisfy every legal hull length with
one fixed-X island per span and the existing placement gates. The shortest
possible centre/left/right sequence needs **328 rows**, **40 more than 288**.
At the requested first-row default 96 it needs **360 rows**, a **72-row**
deficit. This is a geometric/placement blocker, not a measured CPU or RAM
failure. No production implementation, candidate ATR or native verification is
claimed. The task's “any other gate -> STOP” rule was applied at the host
all-length check, before production edits.

## Baseline and Phase 1

Worktree `/Users/marcinkrzetowski/Projects/dark-fighter-slalom`, branch
`codex/capital-slalom`. Clean preflight, HEAD ancestor-or-equal of main,
§BY present. Recorded log:

```text
bf4d410 [codex] Merge codex/island-edge-contact (§BY)
```

Phase 1 was committed separately as `e450644` before the host diagnostic:
[complete answers and selected patterns](../plans/capital-slalom.md).

The compiler chooses start/end rows, design and colour. Runtime fixes X at
128 HPOS and clips to EASY/MEDIUM/HARD half-widths 12/16/20 HPOS. Recipes
01/03/05 have six eight-row parts, with raw widths 2/4/10 cells, in both
colours. A cell is 4 HPOS. Default start/spacing/height/clear gap are
96/112/48/64 rows, plus a final 64-row clean section. Legal lengths are all
85 multiples of eight in 288..960, not just the four legacy aliases.

The 120-byte lookup holds one tag per module. Later overlapping records
replace earlier ones; publication and contact resolve one continuous interval.
Thus same-row side pairs are unsupported. No data field currently moves X.
Changing spare record bytes alone has no effect. Shifting recipes alone still
hits the fixed difficulty clamps and fixed broad contact reject.

Existing centre content is DATA-ONLY (0 new runtime bytes). Moving islands
needs L2 code; its linked cost is unmeasured. Two-side islands are impossible
with the existing executor. No claim that every implementation exceeds 120 B,
or that a resident edit is required, has been established. Those are not the
reason for stopping. The spike placement script, absent on main, was read
through `git show`; it implements mines and a fixed left-channel proof.

## Host gate evidence

Run from this worktree:

```sh
node scripts/capital-slalom-feasibility.mjs
```

It deliberately exits **1** for the failed acceptance property and writes
[feasibility.json](../diagnostics/capital-slalom/feasibility.json).
All numbers in this section are **MEASURED by the host diagnostic / exact
integer arithmetic**, not native timing measurements.

The selected fallback default, **Centre Weave**, is `centre, left, right`,
repeated. The proposed harder **Cross Weave** is `left, right`, repeated.
Neither is implemented. Centre plus left leaves the right lane; centre plus
right leaves the left lane. With fixed-X fragments, both sides must therefore
appear after the centre. This argument concerns the requested centre-first
family; it does not establish that every conceivable slalom is impossible.

| Placement rule | Minimum rows for three spans | Deficit at 288 |
| --- | ---: | ---: |
| Most permissive existing compiler: first 64, height 24, clear gaps 64, tail 64 | 328 | 40 |
| First 96, height 24, clear gaps 64, tail 64 | 360 | 72 |
| Original defaults: first 96, height 48, spacing 112, tail 64 | 432 | 144 |

The five legal lengths **288, 296, 304, 312, 320** fit at most two spans even
with the most permissive settings. The real compiler confirms those counts.
No new pattern can remedy that centre-first failure merely by changing X.

The diagnostic also compiles all **85 lengths** using the existing production
content and checks all rows, all eight vertical alignments and E/M/H:
**1,272,960 row/alignment/difficulty cases**. It conservatively treats each
island's full interval as solid and projects all 15 collision scanlines. It
requires a **20-HPOS envelope** for the **16-HPOS visible ship**, inside the
universal `[84,172)` corridor. This is stronger than the §BY pixel mask for
proving that a lane is free; it is not an exact pixel-collision regression test.

| Existing baseline content | Common straight centres, HPOS | Minimum total lateral travel | Largest necessary shift in any row window | Required speed | Speed margin |
| --- | --- | ---: | ---: | ---: | --- |
| EASY, every legal length | 94–106 and 150–162 | 0 HPOS | 0 HPOS | 0 | Not applicable: no weaving required |
| MEDIUM, every legal length | 94–102 and 154–162 | 0 HPOS | 0 HPOS | 0 | Not applicable: no weaving required |
| HARD, every legal length | 94–98 and 158–162 | 0 HPOS | 0 HPOS | 0 | Not applicable: no weaving required |

These are counterexamples to the current no-straight-line property, not
candidate passability/margin results. No candidate 2x EASY speed-margin PASS
is asserted. Geometry alone cannot establish survival of enemy fire.

## Byte ledger and native tables

| Item | Value / provenance |
| --- | --- |
| Baseline L2 | 1,192 B, existing §BY linked evidence; not rebuilt this session |
| L2 limit | 1,536 B, unchanged source gate |
| Baseline slack | 344 B, arithmetic on existing evidence |
| Protected reserve | 256 B at `$1F00-$1FFF`, unchanged |
| Production source/data changes | 0 B, Git diff inspection |
| New linked code / RAM delta | Not linked; no production change |
| New-code x2 contingency | Not priced; no invented measured N-byte claim |
| SPACE 720-fixture comparison | Not run; no measured CPU delta claimed |

| Requested native measurement, versus main | Result |
| --- | --- |
| 12 routes, 480/960 × E/M/H × flight/brake contact | Not run: host placement gate STOP |
| Capital peak / DMA-on full-route max / frames above 31,500 | Not measured |
| Minimum fighter fence | Not measured |
| Missed frames / extra VBI / DLI / shifted rows | Not measured |
| Stale L2 / world-hull mismatch / boss entry | Not measured |

The 31,500 target, 32,568 hard gate, boss-entry 350-frame gate, C ABI,
reservations and all other build gates remain unchanged. No full npm test,
normal build, release build, boss stress or runtime trace was run. Baseline
native figures from §BY are not republished as current measurements.

## ATR table and owner checklist

[Play handoff](../diagnostics/capital-slalom/play.md) records the absence of
candidate artifacts. No build occurred, so there is no ATR SHA or valid launch
command to report.

| Requested ATR | Absolute path / SHA-256 / launch command |
| --- | --- |
| Default campaign | Not generated: placement gate STOP |
| Default direct capital 480 | Not generated: placement gate STOP |
| Default direct capital 960 | Not generated: placement gate STOP |
| Harder direct capital 480 | Not generated: placement gate STOP |

Owner checklist for a later passing candidate:

- No straight line works.
- EASY is clearable without firing; weaving feels fair on EASY.
- Island edges still hurt; wait **more than five seconds after respawn**.
- Brake and the 35-frame bottom warning are unchanged.
- Verify 65XE/SIO2SD timing on real hardware.

## Recovery choices and recommendation

These are scope choices, not implemented alternatives or byte-priced claims.
No numerical code/CPU GUESS is used in place of the requested linked pricing.

| Choice | Player-visible effect | RAM/code and CPU | Limitation / risk |
| --- | --- | --- | --- |
| **Recommended: allow a short-hull left/right sequence without an initial centre** | Short capitals weave immediately; longer capitals may retain centre-first content | L2 placement/width code needs measurement; no resident requirement identified | EASY side width must also be re-proved; translating the existing narrow plates alone is insufficient evidence |
| Limit centre-first slalom to hulls >=360 with 24-row fragments and first row 96 | Short capitals keep existing behaviour | Same unmeasured L2 placement requirement; no reservation change proposed | Explicitly drops the all-length requirement |
| Authorize compound two-side execution | Restores literal centre/sides alternation | New L2 execution/contact path must be priced with x2 contingency | Current lookup does not support it; 288-row placement still needs shorter fragments/spacing within allowed gates |

Owner decision needed: whether the shortest capitals may omit the initial
centre. Recommendation is the first option, then measure the smallest L2-only
placement implementation and complete the full requested proof/build/native
handoff. This does not request a gate relaxation or a resident edit.

## Deviations and state

The task's centre/sides default was evaluated as centre/left/right because its
conditional same-row sides support is absent. The host gate stopped Phase 2
before production integration. Runtime byte pricing, candidate proofs, native
matrix and ATR delivery remain unfinished; this is not OWNER SMOKE CANDIDATE.

No writes through owner symlinks, new symlinks, primary-folder commands,
branch switches, merge, rebase, push or tag. No `src/main.s`, resident/shared
runtime, L2 runtime, level assets, STATUS, memory-map or dist changes.
Only the plan, blocker diagnostic and evidence/report are committed.

NEXT TASK: owner resolves the short-hull sequence, then resume implementation
on this branch under the unchanged budgets and gates.
