OWNER-SMOKE CANDIDATE

# Completion under owner decision §BY — 2026-10-26

The exact visible-mask fix is implemented in L2 only. Normal build and
computed gates pass; the final sweep has **zero mismatches in 692,064 cases**;
passage, focused tests, all 12 native routes versus main and the 720-fixture
SPACE comparison pass. Owner smoke is pending. No merge, push, tag or release.
Earlier blocked findings are retained unchanged below as historical evidence.

## Step 0, branch and commits

Worktree `/Users/marcinkrzetowski/Projects/dark-fighter-island-edge`;
branch `codex/island-edge-contact`; clean at start; HEAD `a9438ff`.
Recorded log:

```text
a9438ff [codex] Preserve baseline and fatal L2 build logs
```

Baseline main remains `ab5e5ed9b6197f4967c4607d015f1f92de1d6621`.
Previous evidence commits: `1256259`, `a9438ff`.
Implementation: **`f8302a2`**, `[codex] Match L2 island contact to the rendered sprite and glyph masks`.
The following evidence-only commit contains this report and is named in the
session handoff; it does not change the tested game bytes.

All work stayed in this worktree. No branch switch, new symlink, primary-folder
command, merge, rebase, push or tag. The native source symlink was copied with
links dereferenced into `build/island-edge-atari800/`, then configured locally;
no writes through the owner-provided symlinks. Baseline game source was read
with `git show main:src/hybrid/l2.s` through the diagnostic preload; the worktree
was never switched or reset. All other game source is unchanged versus main.

## Approved gate and exact implementation

[Owner decision §BY](../owner-decisions-2026-09-11.md#by-l2-island-contact-correctness-budget-2026-10-26)
raises the normal L2 first-contents gate **1,228 → 1,536 B** for island contact
correctness. §BX had already been assigned on `codex/spine-nacelle-link` to the
Siege Spine engine-nacelle decision; it was not renumbered or duplicated.
The build comment cites the owner and date. No test pinned 1,228. A new focused
test checks the 1,536 limit, reserve assertion and unchanged C ABI checks.

The `$1F00-$1FFF` 256-B reserve and linker assertion remain untouched.
Loader directory, summary/window allocations and all other gates are unchanged.
There are no `src/main.s`, C gameplay or resident/shared runtime source edits.
The build imports existing `player_shape`, `CHARSET` and
`PLAYER_VISIBLE_WIDTH_HPOS` labels for L2; normal checksum regeneration is
performed by the existing builder, without hand-editing artifacts.

`l2_island_contact` examines the same 15 collision scanlines as before. It
resolves each scanline's recipe and compares opaque double-width P0 bits with
the real ANTIC 4 glyph pairs, including bevels, texture holes, neck/plate
transitions and both colour variants. The broad reject and displacement use
the existing visible-width constant. The canonical damage entry remains the
only damage call: two units, Shield absorption, 250-frame respawn protection,
25-frame cooldown and one-event latch are preserved. No tolerance was added.

The original root cause and main-versus-spike comparison below remain valid:
the old interval covered the **leftmost eight HPOS**, not the entire 16-HPOS
sprite. Both branches had the defect. The row-union rectangle also counted
some empty sprite/glyph pixels as contact. The exact fix addresses both.

## Linked bytes, compaction and CPU cost

All numbers in the following ledgers are **MEASURED** from linked listings,
maps or explicit execution. No numerical GUESS is used in this completion.

| Item | Result |
| --- | ---: |
| Main | 1,082 B |
| Preserved probe rebuilt under §BY | 1,338 B |
| After helper relocation | 1,195 B |
| Final | **1,192 B**, `$1900-$1DA7` |
| Final delta versus main | **+110 B** |
| Final delta versus original probe | **−146 B** |
| Remaining before approved 1,536-B limit | **344 B** |
| Protected reserve | **256 B**, unchanged |
| Reservation / new resident bytes | **0 / 0** |

| Component | Main B | Original probe B | Final B |
| --- | ---: | ---: | ---: |
| Prefix, entries, interval, contact gate | 219 | 219 | 219 |
| Retained retired slot | 7 | 7 | 7 |
| Island scan and displacement | 160 | 152 | 152 |
| Solid-pixel decoder | 0 | 105 | 102 |
| Row drawing | 104 | 104 | 104 |
| Row commit | 12 | 12 | 12 |
| Geometry/recipe tables | 123 | 123 | 123 |
| Pixel masks | 0 | 4 | 4 |
| ASM mutable state | 14 | 13 | 13 |
| C rate tables | 6 | 6 | 6 |
| C state | 6 | 6 | 6 |
| C phase | 93 | 93 | 93 |
| C enter | 152 | 152 | 152 |
| C brake | 101 | 101 | 101 |
| C warning | 23 | 23 | 23 |
| Cold rearm/space/enter | 35 | 35 | 35 |
| Geometry alignment padding | 10 | 161 | 18 |
| C warning alignment padding | 17 | 22 | 22 |
| **Total** | **1,082** | **1,338** | **1,192** |

[Machine-readable byte ledger](../diagnostics/island-edge/bytes.json).
The probe's +256 B consists of +97 B executable code, +4 B pixel masks,
−1 B mutable state and +156 B alignment padding. Existing geometry, C tables
and C bodies are unchanged in size.

Compaction moved the 113-B helper/mask/state block after the C/cold tail,
reclaiming **143 B of alignment padding** without an additional call or
per-frame instruction. Three conditional-branch pairs became unconditional
JMPs, reclaiming **3 B**, with equal or lower instruction cost. Total **146 B**
reclaimed; the contact rule was not approximated.
[Compaction page audit](../diagnostics/island-edge/compaction-page-cross.md)
shows **zero additional hot branch/table page penalties versus the probe**.
The new scan already had two branch-page crossings versus the old algorithm;
they are included in measured execution cost and were not introduced by
compaction. Pixel-mask indexing also stays within its page.

The exhaustive exact sweep measures **12,655 CPU cycles** maximum for the
complete L2 contact call, versus **1,231** for main's inaccurate test.
These are DMA-off routine measurements, not a whole-frame forecast. The work
is bounded by 15 scanlines and at most 16 HPOS samples per scanline. Native
capital peaks, including DMA and the rest of gameplay, are reported below.
No new VBI or DLI work is added. The final width-symbol cleanup rebuilt both
L2 and campaign ATR byte-identically to their tested versions.

## Priced alternatives — diagnostic links only, no ATRs

Same **692,064** rendered-mask oracle cases as the exact fix; both alternatives
were actually assembled/linked and executed. Source and results are retained
under [alternatives](../diagnostics/island-edge/alternatives/).

| Rule | Linked B | Delta vs main | Savings vs final | Missed overlaps | False contacts | Total mismatches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 16-HPOS bounding box, drawn centre `player_x+8`, ±8; today's row footprint | 1,082 | 0 | 110 | 0 | 3,612 | **3,612** |
| Seven per-sprite-row extent bands, island interval per scanline | 1,105 | +23 | 87 | 0 | 348 | **348** |
| Exact sprite bits × glyph pixels — delivered | 1,192 | +110 | 0 | 0 | 0 | **0** |

Seven bands cover sprite rows **0–2, 3, 4, 5–8, 9, 10–11, 12–14**;
they fill holes within each extent and do not resolve the island glyph's
transparent pixels. The bounding box also fills the sprite's silhouette
corners. They are price-only alternatives, not selected gameplay or packaged
builds. Their standalone linker emits only L2 object/listing/map/labels/binary.

## Sweep and passage proof

| MEASURED sweep result | Main | Final |
| --- | ---: | ---: |
| Cases | 692,064 | 692,064 |
| Visible overlap missed | 55,398 | **0** |
| False contact | 1,698 | **0** |
| Total mismatches | 57,096 | **0** |

[Before classes](../diagnostics/island-edge/before.md),
[after table](../diagnostics/island-edge/after.md),
[after case-group data](../diagnostics/island-edge/after.json).
The independently published character/glyph oracle covers designs 01/03/05,
both colours, all difficulties, all eight sprite/glyph alignments, plate/neck
sides and vertical transitions. The focused test asserts zero false positives
and negatives and minimum positive overlap at both left/right region classes.
Every HPOS across the island and hull-side edges is swept, including outside
positions. No positive overlap threshold or forgiveness is introduced.

**One-hires-pixel boundary precision:** HPOS and ANTIC 4 solid-pixel edges both
lie on the two-hires-pixel grid. A literal one-hires-pixel overlap or gap is
not a representable engine input. The smallest tested physical overlap is
**2 hires pixels = 1 HPOS**, which hits; outside positions do not. Exhausting
this legal grid proves the requested “at least one solid hires pixel” rule
for all representable cases. No synthetic half-HPOS engine test is claimed.
There is no horizontal world fine-scroll register on this path; eight
alignments are the relative sprite/glyph scanline phases.

[Passage proof](../diagnostics/island-edge/passage.json): real rendered hull and
island pixels plus linked full player-hull contact, both 480- and 960-row
capitals, every finite row and all eight alignments. **70,080 lane checks PASS**.
Two fixed lanes, HPOS 92 and 148, remain clear with FIRE released. The proof
uses the full drawn sprite, not the legacy eight-HPOS width.

| Difficulty | Minimum clear side-channel width, each side | Drawn ship width | Spare width |
| --- | ---: | ---: | ---: |
| EASY | **32 HPOS / 64 hires pixels** | 16 HPOS | 16 HPOS |
| MEDIUM | **28 HPOS / 56 hires pixels** | 16 HPOS | 12 HPOS |
| HARD | **24 HPOS / 48 hires pixels** | 16 HPOS | 8 HPOS |

**EASY remains geometrically clearable without firing.** This is an obstacle
passage proof, not a guarantee of surviving enemy fire without steering.

## Native PAL comparison and SPACE

MEASURED native Atari800 PAL, DMA on. Each cell is main → fixed.

| Rows | Difficulty | Route | Capital peak | Full-route max | Frames >31,500 | Minimum fighter fence | Boss entry frames |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 480 | EASY | flight/contact | 16544 → 21799 | 31189 → 31189 | 0 → 0 | 5829 → 5829 | 325 → 325 |
| 480 | EASY | brake/contact | 15977 → 22451 | 31046 → 31046 | 0 → 0 | 7061 → 7061 | 325 → 325 |
| 480 | MEDIUM | flight/contact | 16862 → 23611 | 31166 → 31166 | 0 → 0 | 6388 → 6388 | 325 → 325 |
| 480 | MEDIUM | brake/contact | 17660 → 25165 | 31198 → 31198 | 0 → 0 | 5922 → 5922 | 325 → 325 |
| 480 | HARD | flight/contact | 16711 → 23969 | 31445 → 31445 | 0 → 0 | 5253 → 5253 | 325 → 325 |
| 480 | HARD | brake/contact | 17271 → 22670 | 31598 → 31598 | 10 → 10 | 5120 → 5120 | 325 → 325 |
| 960 | EASY | flight/contact | 15330 → 21838 | 31164 → 31164 | 0 → 0 | 5855 → 5855 | 325 → 325 |
| 960 | EASY | brake/contact | 15870 → 23241 | 31162 → 31162 | 0 → 0 | 5851 → 5851 | 325 → 325 |
| 960 | MEDIUM | flight/contact | 17024 → 24982 | 31257 → 31257 | 0 → 0 | 6885 → 6488 | 325 → 325 |
| 960 | MEDIUM | brake/contact | 16980 → 25283 | 31256 → 31256 | 0 → 0 | 6927 → 6488 | 325 → 325 |
| 960 | HARD | flight/contact | 16640 → 23967 | 31432 → 31432 | 0 → 0 | 5694 → 5694 | 325 → 325 |
| 960 | HARD | brake/contact | 17444 → 24868 | 31432 → 31432 | 0 → 0 | 4977 → 4977 | 325 → 325 |

Every route on both builds: missed frames / extra VBI / DLI errors / shifted rows / stale L2 / world-hull mismatches = **0 / 0 / 0 / 0 / 0 / 0**.

The largest capital peak is **17,660 → 25,283** (difference of measured maxima
+7,623 cycles, not a same-frame instruction delta). Full-route maximum stays
**31,598**: hard-gate margin **970**, physical-frame margin **3,970**. The ten
pre-existing frames above the 31,500 target remain ten. Global minimum fighter
fence remains **4,977**; the two 960/MEDIUM fence reductions are shown above.
Every route reaches phase 968 and enters the boss within **325 ≤ 350 frames**.
Both main and fixed aggregate trace reconciliations PASS with no new/moved
failures. The 12 routes cover flight/contact and brake/contact, both lengths
and all three difficulties.

[Complete native results](../diagnostics/island-edge/native/comparison.json).
Raw main captures are retained locally in
`build/island-edge-main-480/runtime-wall-trace/` and
`build/island-edge-main-960/runtime-wall-trace/`; fixed captures are in
`build/level-1-s1/runtime-wall-trace/` and
`build/l2-capital-960/runtime-wall-trace/`. Clock/lifetime files are under
`build/island-edge-native-{main,fixed}/`. These are diagnostic routes with
host-held lives, unchanged from the baseline matrix, not release evidence.

**SPACE: all 720 complete-loop fixture records are identical**, including
active CPU, predictor CPU and result. CPU delta **0 in every fixture**.
[Comparison](../diagnostics/island-edge/space-comparison.json),
[main](../diagnostics/island-edge/space-main.json),
[fixed](../diagnostics/island-edge/space-fixed.json).

## Builds, tests and play ATRs

Normal builds PASS with the approved gate and all remaining computed gates
unchanged. The expected stale release-evidence warning remains; these are not
release-certified images. Focused tests **8/8 PASS**, generated memory-map
checks **3/3 PASS**. Shield/lifecycle, exact mask sweep, side passage, damage
amount, cooldown re-entry and one-event latch assertions execute. No full
npm test, release build, release-evidence regeneration or boss stress ran.
[Build and focused logs](../diagnostics/island-edge/final/).

Source matches implementation commit `f8302a2`. The three ATRs were copied
from the normal builds after all checks passed; each direct-capital SHA is
asserted equal to the SHA used by all six corresponding native routes.
Paths, SHA-256, descriptions and exact commands were printed immediately on
publication and saved in [play.md](../diagnostics/island-edge/play.md).
No `dist/` mutation; no alternative ATR was emitted.

| Absolute ATR path | SHA-256 | Description | Exact launch command |
| --- | --- | --- | --- |
| /Users/marcinkrzetowski/Projects/dark-fighter-island-edge/build/play/island-edge/campaign.atr | `0bbe5095cef51a17bc0fa21f1cdf18993d4e550ca491ef375e905e1fb049e48b` | Campaign; choose difficulty in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-island-edge/build/play/island-edge/campaign.atr` |
| /Users/marcinkrzetowski/Projects/dark-fighter-island-edge/build/play/island-edge/capital-480.atr | `4dff4e9e14fa1138b9cfb2c6445d2181698b3eb696adec5dfec50c27afe78be5` | Direct capital, 480 rows; choose difficulty in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-island-edge/build/play/island-edge/capital-480.atr` |
| /Users/marcinkrzetowski/Projects/dark-fighter-island-edge/build/play/island-edge/capital-960.atr | `8033d4d74b393432ecc6d209e64d5f822bc949235c6f29044dc00f72c4b8add8` | Direct capital, 960 rows; choose difficulty in OPTIONS | `atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-island-edge/build/play/island-edge/capital-960.atr` |

### Owner smoke checklist

- Hold the ship's right half under the plate's left edge for three seconds
  (continue steering into the edge against the existing displacement).
- Repeat at the right edge, both neck edges, plate top and plate bottom.
- Just outside the solid pixels: no hit. Use the smallest representable gap,
  one HPOS/two hires pixels; literal one-hires-pixel positioning is unavailable.
- Centre contact still works.
- Fresh respawn remains protected for **250 frames / five PAL seconds**.
  **Wait MORE than five seconds after respawn before testing edge damage.**
- Damage on entry and after each **25-frame cooldown** expiry follows existing
  semantics, including Shield and the one-event-per-frame latch.

## Deviations and remaining work

- §BY was used because §BX is assigned on the owner's other active branch.
- A native harness startup initially lacked its ownership-image file. The
  existing `l2-observer-images.mjs` generated it before the measured runs;
  this was a diagnostic setup error, not a gameplay/gate failure. The copied
  emulator was reconfigured to local paths before the successful matrix.
- During the journal-number correction, one in-flight test loaded the previous
  §BX expectation. After the edit completed, the final full focused set ran
  cleanly (8/8); no assertion was relaxed.
- The literal one-hires-pixel position is outside the hardware's input grid;
  legal boundary cases are exhaustively tested as explained above.
- Compaction made the final fix fit even below the former 1,228-B gate, but the
  explicitly approved production gate change to 1,536 B remains recorded.
- STATUS.md was not changed. Memory-map changes are generated L2-size updates.
  No runtime source outside L2 was edited and no next roadmap task started.

Known remaining issue: the existing ten DMA-on frames above the 31,500 target
remain, with unchanged 31,598 maximum and hard-gate margin. Real-hardware and
owner play acceptance remain pending. **NEXT TASK: owner smoke of these three
ATRs; owner alone decides acceptance and the later `--no-ff` merge.**

---

# Historical first attempt — retained unchanged

BLOCKED_L2_FIRST_CONTENTS

# Island edge-contact investigation

The defect is reproduced on main. The first pixel-contact implementation probe
failed the unchanged first-contents gate. Per the task's STOP rule, no further
implementation, passage proof, native matrix or candidate packaging was run.
Production sources were restored byte-for-byte to HEAD. The probe is evidence,
not an accepted implementation or a smoke candidate.

## Step 0 and commits

Worktree: `/Users/marcinkrzetowski/Projects/dark-fighter-island-edge`.
Branch: `codex/island-edge-contact`. Initial worktree clean.
HEAD and main both `ab5e5ed9b6197f4967c4607d015f1f92de1d6621`.
Ancestor-or-equal check exited 0. Recorded log:

```text
ab5e5ed [codex] Merge codex/l2-phase-module (L2, §BW)
```

The investigation commit has subject `[codex] Record island contact reproduction and L2 gate blocker`.
Its hash is reported in the session handoff (a commit cannot contain its own hash).
No branch switch, merge, rebase, push or tag. No commands ran in the primary
folder. No writes through either owner-provided symlink; no new symlink.

## Root cause — confirmed bug

`src/main.s:546-551` declares the legacy width 8 HPOS but explicitly describes
the visible double-width P0 as **16 HPOS**. The actual 15 opaque sprite rows are
read from linked `player_shape` by the fixture; each PMG bit spans 2 HPOS,
or 4 hires pixels. The final transparent row is excluded as today's collision
path excludes it.

The island fast reject in `src/hybrid/l2.s:116-122` contains:

```asm
    lda player_x
    cmp #148
    bcs @base
    clc
    adc #7
    cmp #108
    bcc @base
```

The detailed overlap comparison at `src/hybrid/l2.s:185-193` repeats the narrow
extent:

```asm
    lda l2_union_right
    beq @done
    lda player_x
    cmp l2_union_right
    bcs @done
    clc
    adc #7
    cmp l2_union_left
    bcc @done
```

Thus it accepts `x < right && x + 7 >= left`, regardless of the drawn width.
At a solid plate's left side, the full-width middle sprite rows can overlap by
**16 hires pixels** while this test still rejects. At `x = left - 7`, the
full-width rows overlap by **18 hires pixels** and the test first accepts.
This directly explains visible half-width intrusion without a new hit. The
centre works because both the old interval and the visible mask intersect it.

The leftward push at lines 195-208 uses `x + 8` and `left - 8`. It therefore
leaves up to half the drawn ship inside the plate after a hit. Recorded hit
spacing alone cannot prove a cooldown defect: a fresh contact must pass the
geometry again after that displacement. No cooldown change is proposed.

There is a second precision defect: lines 168-176 combine minimum left and
maximum right across character rows. They do not compare the sprite's opaque
bits with the glyph's solid pixels on matching scanlines. This yields false
positives at some bevels, neck transitions and vertical edges. Simply changing
7 to 15 would not satisfy the requested exact-pixel rule.

### Main versus spike

Read-only comparison against `codex/spike-capital-content` at
`757ec9bedd73ef5a7080c09c9dc8b745cb50fd83`:
[retained diff](../diagnostics/island-edge/main-vs-spike.patch).
The spike adds mine dispatch, drawing and consumption; the island contact
comparisons and recipes remain unchanged. **Both have the island defect;
the spike did not introduce it.** The mine observation concerns a separate
collision path and does not validate the island extent.

### Respawn protection

**MEASURED from source: 250 gameplay frames, five seconds at 50 PAL FPS.**
`src/main.s:980` asserts the duration. `respawn_player`, lines 8270-8273,
sets the timer and `PLAYER_RESPAWN_INVULNERABLE`. Lines 8277-8290 decrement it
once per lifecycle tick and return to ALIVE at zero. The canonical damage
routine at lines 8309-8313 rejects every non-ALIVE lifecycle, before Shield,
cooldown and the one-event latch. The described 3–5 seconds after respawn can
therefore be protected; without the recording's exact respawn frame it cannot
explain every frame of the 2.6-second interval conclusively.

## Sweep before / after

[Reproducible fixture](../../scripts/island-edge-sweep.mjs),
[complete mismatch-class table](../diagnostics/island-edge/before.md),
[machine-readable results](../diagnostics/island-edge/before.json).

The oracle executes the real row publisher, reads its published codes and
actual charset, decodes all nonzero ANTIC 4 colour pairs, and intersects them
with the linked P0 sprite mask. The engine decision is observed at entry to
`apply_broadside_player_damage`, independently of health/cooldown outcomes.
Both colours, designs 01/03/05, all difficulties, 8 sprite/glyph alignments,
HPOS 76–164 inclusive and source rows 574–627 are covered. This crosses the
island tips, all six parts and their transitions and includes positions beyond
the hull-side boundaries. The decision under test is island contact only;
it does not claim to validate the separate resident hull collision.

All numbers below are **MEASURED**, from linked NMOS6502 execution and the
independent raster oracle. CPU is DMA-off routine cost, not frame wall time.

| Result | Main, before | After |
| --- | ---: | --- |
| Cases | 692,064 | Not run: gate STOP |
| Visible overlap but no contact | 55,398 | Not run |
| Contact but no solid-pixel overlap | 1,698 | Not run |
| Total mismatches | 57,096 | Not run |
| Maximum complete L2 contact CPU | 1,231 | Not measured |
| Smallest representable positive overlap | 2 hires pixels | Not run |

Overlap in the table means the maximum common opaque width on any matching
scanline. Exact per-design/colour/difficulty/alignment observations are in the
linked table and JSON, including minimum overlap on hit and maximum on miss.
A single monotonic visible-overlap threshold does **not** exist at shaped
transitions: the same overlap width can hit or miss depending on row geometry.
The exact old threshold is the interval comparison quoted above.

| Region | Observed minimum overlap on hit across groups, hires pixels | Largest missed overlap, hires pixels |
| --- | --- | ---: |
| plate-left | 6, 10, 14, 18 | 16 |
| plate-right | 0, 2 | 0 |
| neck-left | 4, 8, 10 | 16 |
| neck-right | 0, 2 | 0 |
| plate-top | 0, 2 | 16 |
| plate-bottom | 0, 2 | 16 |

These region labels group transition samples as documented by the fixture;
JSON includes explicit examples with source row, HPOS and fine Y. They are
not a claim that every row of a plate shares a threshold.

The engine has no horizontal world fine-scroll phase here: islands publish
whole character rows. The eight alignments are the relative vertical
sprite/glyph phases, as in the existing contact fixture. HPOS steps and ANTIC 4
pixel widths are both two hires pixels. A literal one-hires-pixel overlap/gap
is not representable on this path; the smallest physical boundary case is two.
No tolerance was added.

## Probe and byte ledger

[Preserved patch](../diagnostics/island-edge/probe/fix.patch),
[fatal build output](../diagnostics/island-edge/probe/build.log),
[linked map](../diagnostics/island-edge/probe/l2.map).
The probe changes only L2 execution plus the build's import list for existing
`player_shape`/`CHARSET` labels. It samples the sprite and the recipe-selected
charset pairs on matching rows, then calls the canonical damage path. It is
**unvalidated**: a successful assemble/link does not establish correct pixels,
acceptable CPU or safe displacement at transitions.

All ledger values are **MEASURED** from the two linked maps:

| Item | Main | Probe | Delta |
| --- | ---: | ---: | ---: |
| L2 linked contents | 1,082 B | 1,338 B | +256 B |
| First-contents limit | 1,228 B | 1,228 B | 0 |
| First-contents slack | 146 B | **−110 B** | −256 B |
| L2 slot capacity | 1,792 B | 1,792 B | 0 |
| Protected reserve | 256 B | 256 B | 0 |
| Free outside reserve | 454 B | 198 B | −256 B |
| Resident source edits | 0 | 0 | 0 |

The first geometry table moves from `$1B00` to `$1C00`; the page-aligned C
warning routine moves from `$1D00` to `$1E00`. Alignment contributes to the
256-B increase. This is **not** a claim that pixel contact inherently requires
256 B, nor that the task is impossible. The exact failed gate is **110 B**
over the approved first-contents limit. No reservation, ABI gate or limit was
changed. Required smallest recovery: remove at least 110 linked bytes from
this probe while preserving all existing gates, then validate it. That is a
follow-up implementation task, not authorized continuation past this STOP.

Compliant recovery directions for a follow-up, neither implemented nor priced:

* Repack the new L2 helper around the existing alignment holes, retaining table
  page guarantees. Same intended visible contact; RAM reservation unchanged;
  CPU and branch-page effects need measurement. Risk: placement/ABI effects.
* Replace repeated per-pixel decoding with a smaller bounded mask/intersection
  executor in L2. Same intended visible contact; code/table trade-off and CPU
  need measurement. Risk: bevel/neck false positives or excessive table bytes.

No numerical forecast is made; therefore no unlabelled estimate or missing
x2 contingency is hidden in these alternatives.

## Validation, native matrix and ATRs

Baseline **normal build PASS**, all computed gates unchanged; expected stale
release-evidence warning retained in
[baseline log](../diagnostics/island-edge/baseline-build.log).
The output-routing preload changes only filesystem paths for `dist` artifacts,
including validator reads, to `build/island-edge-main-artifacts/`. It runs the
normal builder; no review/candidate flag or gate bypass is used:

```sh
node --import ./scripts/island-edge-build-redirect.mjs scripts/build.mjs
node scripts/island-edge-sweep.mjs
```

The first probe normal build **FAILS** before artifact emission at the stated
gate. Production files were restored after retaining its diff. No fixed ATR
exists. Build intermediates may still contain the rejected probe; rebuild
before using them. The separately retained `build/island-edge-main/` files
are the measured baseline snapshot.

| Required validation | Result |
| --- | --- |
| 12-route native matrix versus main | Not run: first-contents STOP |
| Capital peak / DMA-on full-route max / target overruns / fence | Not measured |
| Misses / extra VBI / DLI / shifted rows | Not measured |
| Stale L2 / world-hull clock / boss entry ≤350 | Not measured |
| SPACE 720-fixture CPU delta | Not measured; no runtime change remains, but no measured zero claim |
| Post-fix sweep and focused behaviour tests | Not run; no integrated fix |
| All-row/all-alignment passage proof | Not rerun; EASY clearability after a fix is unverified |
| Campaign / direct 480 / direct 960 candidate ATR | Not produced |

No candidate SHA-256 or launch command is supplied for an unbuilt fix.
[Play handoff](../diagnostics/island-edge/play.md) records the blocked state.
No full npm test, release build, release-evidence refresh or boss stress ran.

## Owner play checklist — pending a future passing candidate

- Hold the right half of the ship under the plate's left edge for three seconds:
  damage on entry and after each 25-frame cooldown expiry under existing semantics.
- Repeat at the right plate edge, both neck edges, plate top and bottom.
- Just outside the solid pixels: no hit. Use the smallest representable gap
  (two hires pixels); a one-hires-pixel HPOS position is unavailable.
- Centre contact still works.
- Fresh respawn protection still prevents damage for its existing duration.

## Deviations and next task

The explicit worktree/no-switch/no-merge rules superseded the general primary
checkout workflow. STATUS.md and memory-map.md were not changed: no production
placement or reservation change remains. The 12-route matrix, after sweep,
passage proof and three ATRs were intentionally withheld at the mandatory gate
STOP. No accepted feature, release readiness or smoke success is claimed.

NEXT TASK: recover at least 110 linked L2 bytes without weakening gates, then
complete exact-mask validation, passage proof, SPACE comparison, native matrix
and the three ATRs before owner smoke.
