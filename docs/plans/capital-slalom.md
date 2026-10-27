# Continuation — owner scope resolved, 2026-10-26

The owner permits left/right starts below 328 rows, excludes simultaneous side
pairs, and defines the straight-flight gate as a 16-HPOS ship plus 4 HPOS
clearance. This supersedes the earlier centre-first blocker below.

Implemented candidates: **Offset Weave** (side centres 108/148 HPOS) and
**Tight Weave** (112/144 HPOS), centre 128 in both. Every length 288..960 in
eight-row steps passes the host proof; no length is excluded. Tight Weave is
the most inward four-HPOS-grid translation that removes all straight 20-HPOS
bands. At offsets 12 or less, at least one straight edge band remains; narrow
neck rows necessarily offer wider passages than plate rows. The existing
24/32/40-HPOS plate widths are preserved.

L2-only translation uses tag bits 6..7 and existing extension bytes 4..7;
lookup/record/page sizes and C code remain unchanged. Linked contents are
1,250 B versus freshly built main 1,192 B (+58); 286 B remain below 1,536.
The initial inline placement enlarged page padding; placing the same bounded
helper after the existing C/cold tail recovered 202 B with no reservation
change. Final detailed measurements, sequences and acceptance status are in
[the audit](../audits/2026-10-26-capital-slalom.md).

---

# Capital slalom — Phase 1

Baseline: `bf4d410 [codex] Merge codex/island-edge-contact (§BY)`.
Worktree: `/Users/marcinkrzetowski/Projects/dark-fighter-slalom`.
Branch: `codex/capital-slalom`; clean preflight, HEAD ancestor-or-equal of
main, §BY present. No branch switch or primary-checkout commands.

## Existing representation (MEASURED from source)

`level-compiler.mjs` calls `compileIslandExtension` in `l2-islands.mjs`.
The latter selects longitudinal spans, recipe `n % 3`, and colour `n & 1`.
It does not select X. Each six-byte record contains start module, exclusive
end module, packed recipe/colour tag, and three unused zero bytes.

`l2_c_enter` clears the 120-byte lookup at `$AD80-$ADF7`, then assigns one
incrementing tag per eight-row module. Overlapping records overwrite the
previous tag. `l2_interval` decodes exactly one recipe part and one interval.
The renderer and exact §BY contact decoder use that same interval.

X is fixed by `128 + 4 * recipeOffset`, then clamped by difficulty to
`[116,140)`, `[112,144)`, or `[108,148)` HPOS. The early contact reject also
assumes the hard envelope `[108,148)`. The motif column is fixed at cell 20
(HPOS 128) in both publication and contact. Moving only authored spans or
unused record bytes cannot move an island.

| Approved design | Recipe ID | Widths of its six parts, cells before difficulty clipping |
| --- | --- | --- |
| 01 | module-wreck | 2, 4, 10, 10, 4, 2 |
| 03 | turret-deck | 2, 2, 10, 10, 4, 2 |
| 05 | panel-plate | 2, 4, 10, 10, 10, 4 |

Every cell is 4 HPOS. Maximum plate width after clipping is 6/8/10 cells =
24/32/40 HPOS on EASY/MEDIUM/HARD. Neck widths are 8 or 16 HPOS.
All three designs support allied and enemy colours; colour changes glyph
palette, not geometry. There are no 02/04 recipes.

The defaults are first local row 96, start-to-start spacing 112, height 48,
minimum empty gap 64, and a final clean section of at least 64 rows. A “112-row
span” is the placement period, not 112 occupied rows. Authored overrides are
allowed by §BW.7, but the compiler requires eight-row alignment, first >=64,
height 24..48, gap >=64, spacing >=height+gap, and at most seven records.
Sparse skips odd numbered placements. A truncated final fragment is not emitted.

`hull.rows` accepts every multiple of eight from 288 through 960 (85 lengths).
`hull.length` retains aliases 0..3 = 288/352/416/480. These are not the only
legal lengths. Universal coordinates are right-aligned at 960.

The requested `capital-content-placement.mjs` does not exist on this baseline.
It was read with `git show codex/spike-capital-content:scripts/capital-content-placement.mjs`.
It places mines and proves a fixed left channel; it supplies no movable-island
or paired-island mechanism. The spike was not checked out.

## Cases and implementation boundary

| Case | Classification | Byte evidence |
| --- | --- | --- |
| Existing centre recipes, colours, longitudinal placement | DATA-ONLY | 0 additional runtime bytes |
| Arbitrary per-span data-chosen X with current runtime | Impossible with unchanged runtime | Record spare bytes are not read; hard clipping and contact reject remain central |
| Left/right placement with L2 changes | Needs code; not yet priced by linking | Must change interval placement, contact reject and both motif selectors; no resident edit identified |
| Two side islands at the same rows with existing lookup/row executor | Impossible with existing representation | One tag and one continuous interval; last record wins |
| New compound/two-interval executor | Outside the task's conditional inclusion of sides | Requires a new execution path; no measured byte claim |

The requested MEASURED linked N-byte cost and x2 contingency for new runtime
code cannot honestly be supplied during a no-code phase. They remain unmeasured;
no estimate is represented as a measurement or used to claim a >120-B failure.
There is no demonstrated resident-code requirement or byte-budget blocker.

## Selected patterns for the host feasibility check

Because same-row sides are unsupported, the candidate single-island fallback
is **Centre Weave**: `centre, left, right`, repeated; each of the two side
placements replaces one half of the requested sides event. The harder candidate
is **Cross Weave**: `left, right`, repeated. These are proposals, not shipped
patterns. No Director RNG would be used.

Before implementation, check Centre Weave at the shortest legal hull. A centre
island plus only a left island leaves the right side lane; centre plus only
right leaves the left lane. Thus a centre-first sequence needs at least three
separate fragments. Even the most permissive existing placement has lower bound
`64 + 3*24 + 2*64 + 64 = 328` rows. With the accepted first-row default 96,
the bound is 360 rows; with all original defaults it is 432 rows.

Proceed to Phase 2's host feasibility check. If confirmed, the all-length
centre-first gate fails independently of implementation byte cost or lateral
speed. Do not relax the compiler gates or claim that Cross Weave is impossible:
a short-hull sequence that omits the centre is a distinct recovery option.
