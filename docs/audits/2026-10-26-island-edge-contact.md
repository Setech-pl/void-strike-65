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
