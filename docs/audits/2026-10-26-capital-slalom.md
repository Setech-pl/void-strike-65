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
