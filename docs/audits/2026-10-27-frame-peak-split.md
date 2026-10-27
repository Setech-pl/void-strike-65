# Worst-frame split — 2026-10-27

**Current result: OWNER-SMOKE CANDIDATE.** A+B is implemented and every
measured acceptance gate passes. Owner smoke remains pending.
Worst iteration **31,432**, capital peak **29,756**, all boss entries **325
frames**. See [After](#after--ab-owner-smoke-candidate) for measured comparisons,
exact equivalence evidence and the three current ATRs. The owner approved the
entry correction after checkpoint `299d800`; [decision](../decisions/2026-10-27-frame-peak-split.md).

## Before — attribution checkpoint `299d800`

**Historical result: OWNER_DECISION_REQUIRED. Production source was unchanged.** Branch
`codex/frame-peak-split`, measured main `6ea1ca5`. The twelve direct L2 routes
reproduce the five post-slalom target overruns. The additional natural campaign
finds a **63,846-cycle SPACE → first-capital entry**, with a missed publication
fence. Correcting that existing miss changes physical presentation by one PAL
frame, which the task explicitly forbids without an owner decision.

**Decision needed:** permit that one-frame correction at natural capital entry,
while retaining logical-frame game-state equivalence and every other gate.
Then implement and measure option B below, falling back to C only if compiler
output is insufficient. No scheduling or production optimization was integrated.
M3-H remains stopped before this issue.

## Measurement and attribution

All figures in this section are **MEASURED**, Atari800 7.1.2, XL/PAL, DMA on.
Target **31,500**, hard gate **32,568**, physical PAL frame **35,568**: unchanged.
The normal build passes computed gates, with the expected warning that release
runtime evidence is pending. This does not override a failing native replay.

Reused `runtime-wall-trace.mjs`, the `capital-slalom-native.mjs` twelve-route
controller and `l2-space-cost.mjs`; no replacement frame timer was written.
The old capital-content attribution header was read with `git show` from
`codex/spike-capital-content` and adapted into a host-only observer. No merge,
guest instrumentation, gameplay seed or terminal-state injection was used.
The standard controller holds lives at three, as in earlier L2 matrices.

Coverage:

* **12 routes / 47,349 measured gameplay iterations**: 480/960 × EASY/MEDIUM/
  HARD × flight/contact or brake/contact; **27,039 capital**, **18,882 SPACE**,
  **1,428 boss** iterations.
* **Full level-1 campaign through boss entry and 119 fight iterations**:
  **4,399 gameplay iterations**, including 2,404 SPACE and 1,876 capital.
* **720 SPACE fixtures**, the original difficulty × X × accumulator grid;
  complete NMOS6502 loop bodies, raster busy waits excluded. These are CPU-only
  measurements, not native DMA-on wall measurements.
* One 900-iteration campaign confirmation with the extra PC/hash observer
  disabled. Its first 899 wall counts are identical to the full campaign.
  Frame 839 again takes **63,846** cycles. The earlier, unprofiled HARD brake
  run's full world/hull clock CSV also matches its profiled rerun byte for byte.

Frame numbers below are the standard trace's **zero-based logical iteration
indices**. A boss loading row spans multiple host frames; those 13 transition
rows are recorded separately and checked against the 350-frame entry deadline,
not treated as ordinary active gameplay frames. All 13 boss entries take
**325 host frames**. The campaign miss below is an ordinary active loop row,
not a boss loading row; it has not been excluded.

### Every frame above target

| Route | Frame | Sector at start | Wall cycles | Excess over target |
| --- | ---: | --- | ---: | ---: |
| campaign-2-brake | 839 | SPACE → capital during this iteration | **63,846** | **32,346** |
| l2-480-2-brake | 2436 | SPACE | 31,552 | 52 |
| l2-480-2-brake | 2076 | SPACE | 31,547 | 47 |
| l2-480-2-brake | 2016 | SPACE | 31,525 | 25 |
| l2-480-2-brake | 2046 | SPACE | 31,514 | 14 |
| l2-480-2-brake | 2466 | SPACE | 31,514 | 14 |

No pure-capital or boss gameplay iteration exceeds target. Current capital
peak is **29,756**, not the pre-island/pre-slalom 17,660. The direct routes
have zero missed frames, extra VBI boundaries, DLI errors, shifted rows,
world/hull clock mismatches or stale L2 events. Their minimum fighter fence
margin is **4,977**. The campaign has **one distinct miss**, fence margin
**−1,122**; extra VBI/DLI errors, shifted rows, world/hull mismatches and stale
L2 events remain zero. A zero extra-VBI count does not negate a missed fence.

### Per-subsystem exclusive wall costs

Each column sums exactly to the corresponding standard timer's wall count.
Costs are assigned by executed-PC label intervals, not inclusive caller costs.
As in the earlier attribution, DMA gaps and interrupt entry are assigned to the
preceding instruction; this is accounting, not a claim of causation. The
retained JSON includes every charged PC and routine, plus the category mapping
in `scripts/frame-peak-results.mjs`.

`input` is the `read_input` routine, including its movement decisions; `ship`
contains separate lifecycle/draw/damage execution. HUD includes statistics.
Shared backing helpers are charged to their named execution domain. Idle
subsystem hooks still cost cycles when their pools are empty. L2 includes its
resident phase/capital hooks. Loop/shared overhead and raster interrupts are
shown explicitly, so no unexplained residual is hidden in another subsystem.

| Subsystem | campaign 839 | 480/H/brake 2436 | 2076 | 2016 | 2046 | 2466 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Input | 110 | 113 | 113 | 113 | 113 | 113 |
| Ship | 109 | 103 | 89 | 95 | 103 | 103 |
| Shots | 2,578 | 4,022 | 3,949 | 3,998 | 4,038 | 3,872 |
| Enemies / Director | 3,492 | 6,062 | 6,020 | 6,031 | 6,081 | 6,110 |
| Collisions | 917 | 2,715 | 2,791 | 2,692 | 2,714 | 2,834 |
| Effects / breakup | 579 | 1,213 | 1,204 | 1,160 | 1,204 | 1,222 |
| Pickups | 76 | 103 | 69 | 77 | 73 | 104 |
| Starfield | 4,764 | 5,229 | 5,218 | 5,211 | 5,184 | 5,309 |
| HUD / statistics | 210 | 210 | 210 | 210 | 210 | 210 |
| Sound | 338 | 442 | 455 | 485 | 428 | 437 |
| L2 phase work | 12,101 | 381 | 360 | 317 | 359 | 278 |
| Raster wait | 34,070 | 10,301 | 10,340 | 10,377 | 10,358 | 10,289 |
| Raster interrupts | 577 | 179 | 179 | 171 | 183 | 171 |
| Loop / shared overhead | 3,925 | 479 | 550 | 588 | 466 | 462 |
| **Total** | **63,846** | **31,552** | **31,547** | **31,525** | **31,514** | **31,514** |

### Coincidences and occurrence in play

The global worst frame, campaign 839, starts with four player PairShots and
no hostile shots, live Lights, Heavy enemies, active effects or debris. Natural
capital admission, L2 lookup construction, world/ring rotation, hull rendering
and the first capital contact pass coincide while the iteration still owns
the fighter publication path. `_l2_c_enter` takes **4,334 CPU / 8,851 assigned
wall cycles**. Its 120-byte zero-fill alone, `$1C0A–$1C21`, takes **3,373 CPU /
6,863 assigned wall cycles**. This is the dominant removable coincidence.

The lookup construction runs at every natural capital entry; this campaign
contains one such entry and one miss. A second short replay reproduces it.
Other input-phase frequencies were not measured. The matrix's direct-capital
start does not exercise that preceding SPACE admission path, explaining why
its much larger frame count missed this case.

The next four globally worst frames (and the tied sixth frame) all have
**4 player + 4 hostile PairShots, 3 live Lights, a world-row rotation, Director
request work, and music/SFX work**. They have no active breakup effects, live
Heavy enemies or debris, and no spawn/hit/breakup event. Thus this is not a
spawn-plus-breakup collision. Light collision scans and three two-cell Light
publications coincide with the shot and scrolling work.

That broad combination occurs **30 times in 1,603 SPACE iterations** on
480/HARD/brake: about 1.87% in this replay. Five instances exceed target
(0.31% of those SPACE iterations), at 2016/2046/2076 and 2436/2466. The
30-frame spacing within those groups is 0.6 seconds at 50 Hz. The exact
overrun depends on raster and music phase; these replay frequencies are not
probabilities for every human playthrough. There is no expensive effect-pool
allocation to defer in any of the five steady-state peaks.

## Options — estimates, not implemented measurements

All proposed byte deltas and new costs below are **ESTIMATE**. Current measured
costs are explicitly named. No option spends `$1F00–$1FFF`, changes enemy
classes, moves high-level policy into ASM, or weakens a gate.

| Option | Player-visible effect / equivalence | Byte estimate | Cycle estimate and limitation |
| --- | --- | --- | --- |
| **A. Move the existing shot/hit scan before the publication wait** | Same logical output and same presentation frame on the five steady-state peaks. Does **not** cure campaign 839. | **0 code, 0 state**, operand-only changes in main, Light vector and reader; reuse `$A00C` to call LIFE colour then tail-call `stats_scan`; Light publish enters directly. | Existing scan is **154 CPU empty**, **227 CPU** with five new shots plus counter carries in focused fixtures; **210 wall** in each steady-state peak. Move that work into existing pre-fence slack; total useful work approximately unchanged. Expected steady-state recovery exceeds the 52-cycle excess. Adding pre-fence work makes the existing campaign miss no better. |
| **B. A + four disjoint 30-byte stripes in the C lookup clear — recommended after decision** | Same finished lookup and logical gameplay state; C retains all initialization/phase decisions. Catching campaign 839's fence publishes one PAL frame earlier than main. | **+24–48 B L2**, **0 state/resident B** including compiler/placement allowance; about **238–262 usable L2 B** left. | Existing scalar clear: **3,373 CPU measured**. Four constant-base C stores per loop are estimated at **~1,840 CPU**, saving **~1,530 CPU / ~3,000 entry wall cycles**. Enough projected recovery for the 1,122-cycle miss plus the scan moved before the fence; generated code, page placement and all gates still require measurement. |
| **C. A + bounded ASM zero-fill executor requested by C** | C still decides when/what to initialize; helper performs only 120 zero stores. Same logical state, but the same one-PAL-frame presentation correction is necessary. | **−10 B L2 before placement padding**, or about **+11 B** retaining downstream pins; **0 state/resident B**. Roughly **275–296 usable L2 B** left. | `LDA #0; LDX #119; STA abs,X / DEX / BPL; RTS` plus call is **~1,215 CPU instruction estimate**, saving **~2,158 CPU** against the measured clear. More recovery than B, but adds an execution veneer; use only if the C option cannot meet gates. |

Alternating AI, collision or publication at 25 Hz and deferring spawns/effects
were not selected: they change frame output, and no active effect allocation
causes these steady-state peaks. A alone is an attractive equivalent local
optimization, but it cannot meet the task's complete campaign gate.

### Why this stops before production integration

Campaign 839 starts at host frame **1710**, scanline **18**, cycle **8**;
it ends in host frame **1711**, scanline **266**, cycle **14**. Standard
checkpoints:

| Observation | Clock / elapsed cycles |
| --- | ---: |
| Active-loop start | 60,823,340 |
| Before publication call | 60,849,762 / **26,422** elapsed |
| Fighter publication begins | 60,884,340 / **61,000** elapsed |
| End | 60,887,186 / **63,846** elapsed |
| Next active-loop start | host frame **1712** |

Keeping that publication on main's physical frame already requires 61,000
cycles from the existing measured start, before the last publication/audio
work. Catching the missed fence releases publication one physical PAL frame
earlier. Preserving main's extra-frame delay instead leaves the requested wall
gate unsatisfied. Moving timer hooks or removing that wait from accounting
would hide the problem and is not an option.

The task requires both every measured iteration ≤31,500 and no visible timing
change even by one frame. Options B/C can preserve the logical state sequence,
but cannot claim identical physical presentation at this missed fence. Under
that explicit condition, **OWNER_DECISION_REQUIRED**, rather than an
unverified output-equivalent candidate. No candidate or equivalence PASS is
claimed.

## Route peaks before / after

`—` means **no production candidate built or measured**. Main remains the game
source; repeated baseline numbers are not presented as an after measurement.

| Route | Frames | Before peak | Before capital peak | >31,500 | After peak / capital |
| --- | ---: | ---: | ---: | ---: | --- |
| 480 EASY flight/contact | 3,007 | 31,105 | 29,756 | 0 | — |
| 480 EASY brake/contact | 4,017 | 30,992 | 28,264 | 0 | — |
| 480 MEDIUM flight/contact | 2,883 | 31,196 | 26,402 | 0 | — |
| 480 MEDIUM brake/contact | 3,767 | 31,204 | 28,082 | 0 | — |
| 480 HARD flight/contact | 2,779 | 31,445 | 27,681 | 0 | — |
| 480 HARD brake/contact | 3,600 | 31,552 | 28,936 | 5 | — |
| 960 EASY flight/contact | 4,264 | 31,164 | 27,690 | 0 | — |
| 960 EASY brake/contact | 5,515 | 31,162 | 27,435 | 0 | — |
| 960 MEDIUM flight/contact | 3,969 | 31,257 | 29,038 | 0 | — |
| 960 MEDIUM brake/contact | 5,052 | 31,256 | 28,390 | 0 | — |
| 960 HARD flight/contact | 3,767 | 31,432 | 28,770 | 0 | — |
| 960 HARD brake/contact | 4,729 | 31,432 | 28,694 | 0 | — |
| Natural campaign HARD brake/contact | 4,399 | **63,846** | 29,679 | 1 | — |

## State evidence, bytes and focused checks

End-of-iteration **FNV-1a 64-bit** state streams are retained for all **51,761
native trace rows**, including the 13 boss-loading transitions, and all 720
SPACE fixtures. Each native snapshot hashes **9,904 addressed RAM bytes** in
ascending order: positions, HP, score, RNG, spawn/Director/Light state, entity
and effect pools, projectile state, PMG, screen/charset/HUD, the complete
playfield ring, lookup/geometry data, counters and linked BSS. The exact
schemas and SHA-256 bindings of the uncompressed hash streams, raw traces and
ATRs are retained. This establishes the **before** reference, not an A/B
equivalence result. No after hashes, no per-index cycle non-regression claim,
and no candidate acceptance exist.

The retained schema also includes physical PAL clock tokens. Removing the
missed frame necessarily shifts those tokens; any authorized follow-up must
distinguish that explicit timing correction from the required positions, HP,
score, RNG, spawn/effect state and PMG/playfield comparisons. The before schema
has not been edited to conceal the miss.

**Actual Atari byte / CPU / residency delta: 0**, because no production source
changed. No reserved address, segment or range changed; no memory-map edit is
required. Diagnostic host code consumes no Atari memory. Reference budgets:

| Region relevant to proposed change | Main used / capacity | Actual delta | Free left |
| --- | ---: | ---: | ---: |
| MAIN Light composite `$3643–$3AEE` | 1,196 / 1,213 B | 0 B | 17 B |
| Reader `$A000–$A5FF` | 1,529 / 1,536 B | 0 B | 7 B |
| L2 usable `$1900–$1EFF` | 1,250 / 1,536 B | 0 B | **286 B** |
| L2 protected `$1F00–$1FFF` | 0 / 256 B spent | 0 B | **256 B intact** |
| Initial boot content / planning gate | 12,825 / 13,652 B | 0 B | 827 B |

Normal build: computed CPU/frame, DMA, block, window, boss-entry and disk gates
PASS; stale release-evidence warning retained. Mandatory focused
`tests/l2-islands.test.mjs` and `tests/capital-slalom.test.mjs`: **7/7 PASS**.
Pre-change statistics/Light files (`level-summary`, `level-summary-build`,
`light-wingman`): **63/71 PASS**, eight existing main failures. The reconciler
finds those eight absent from its test record (NEW by ledger, zero MOVED).
They were observed before any production edit; no test/assertion was weakened
or ledger entry added. The campaign timing failure is likewise **NEW**, exact
assertion retained; reconciliation correctly fails. The full `npm test`,
release trace/evidence regeneration and boot smoke were not run. Loading and
startup source did not change.

Only the campaign entry is a **confirmed runtime bug** found here; there is no
production regression introduced by this task. The five small steady-state
target excesses are also confirmed. Splitting statistics is a proposed
optimization; new enemy work, alternative visible cadences and M3-H remain
unimplemented.

## B3 relevance

The **B3 art revision** `e6ec8cd` on `codex/spine-nacelle-link` changes region-3
charset/overlay look data only; its own revision leaves per-frame code
unchanged. The older `73f7512` on that branch also introduced a region-3-only
field-link draw helper. Neither was merged or used here. These captures use
main and enter the **region-1 boss**, so B3 is outside their executed/data
paths. B3 cannot explain these SPACE/capital peaks or this natural entry miss.
This report does not certify Spine-collapse performance after merging that
branch; those paths are not covered by a first-boss campaign.

## Reproduction, evidence and ATRs

[Baseline attribution and exact PC costs](../diagnostics/frame-peak-split/baseline.json),
[provenance and artifact hashes](../diagnostics/frame-peak-split/provenance.json),
[720 fixtures](../diagnostics/frame-peak-split/space-fixtures.json),
[native state streams](../diagnostics/frame-peak-split/states/),
[campaign failure](../diagnostics/frame-peak-split/campaign-focused-run.json),
[independent confirmation](../diagnostics/frame-peak-split/campaign-entry-confirm-pal-audit.json),
[tests and first assertions](../diagnostics/frame-peak-split/tests.json),
[logs](../diagnostics/frame-peak-split/logs/).

The worktree had no build/dependency links. `node_modules` points read-only to
the existing primary checkout's dependencies. The Atari800 source is a private
recursive copy at `build/frame-peak-atari800`; no preparation/build writes went
to the primary checkout. No temporary worktree or new dependency was added.

```sh
# Copy the existing in-repo Atari800 tree to build/frame-peak-atari800 first.
ISLAND_EDGE_ARTIFACTS=build/frame-peak-campaign node --import ./scripts/island-edge-build-redirect.mjs scripts/build.mjs
npm run build -- --level=1:sector=1
npm run build -- --level=1:sector=1 --l2-long-capital
node scripts/l2-observer-images.mjs build
node scripts/l2-observer-images.mjs build/level-1-s1
node scripts/l2-observer-images.mjs build/l2-capital-960
# Preserve the matching inputs before another variant replaces them.
python3 - <<'PY'
import pathlib, shutil
for rows, source in [(480, 'build/level-1-s1'), (960, 'build/l2-capital-960')]:
    shutil.copytree(source, f'build/frame-peak-main-{rows}', dirs_exist_ok=True)
target = pathlib.Path('build/frame-peak-main-campaign')
target.mkdir(exist_ok=True)
for source in ['build', 'build/frame-peak-campaign']:
    for item in pathlib.Path(source).iterdir():
        if item.is_file():
            shutil.copy2(item, target / item.name)
PY
node scripts/frame-peak-native.mjs main
# Expected exit 1: the final campaign replay fails the unchanged hard gate.
node scripts/frame-peak-results.mjs build/frame-peak-main --baseline
node scripts/l2-space-cost.mjs build/frame-peak-main-campaign build/frame-peak-main-space.json --state-hashes
node --test tests/l2-islands.test.mjs tests/capital-slalom.test.mjs
```

`--baseline` permits the **report summarizer** to retain a failing baseline;
it changes no game/build/native acceptance gate and records `passed: false`.
The raw native capture and its failing assertion remain intact. Three host
processes run independent existing replays; no coding agents were delegated.

Both ATRs below are **unchanged-main reproductions, OWNER_DECISION_REQUIRED**,
not smoke candidates. They match the previously published slalom campaign and
480-row ATR hashes. There is no split implementation inside them.

| ATR | SHA-256 |
| --- | --- |
| `build/play/frame-peak-split/campaign.atr` | `7adfecb7a49f107d392b855a25d2a44a1c3125d7797dfdb379934347f0aa6564` |
| `build/play/frame-peak-split/capital-480.atr` | `bfb7b4498e20c915c36d0157a270dfa3f684cdb5ae3bb9586a1b4f985d29911f` |

```sh
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-frame-peak/build/play/frame-peak-split/campaign.atr
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-frame-peak/build/play/frame-peak-split/capital-480.atr
```

**Original next task (now approved):** owner decision on allowing the single physical-frame correction
at the confirmed natural capital-entry miss. No push, merge, release or next
roadmap work is authorized by this report.

The initial local checkpoint attempt was blocked: Git's attempt to
create `/Users/marcinkrzetowski/Projects/dark-fighter/.git/worktrees/dark-fighter-frame-peak/index.lock`
was denied (`Operation not permitted`). The owner subsequently requested a
commit retry of the report, diagnostics and host tooling, excluding build
outputs. Only this session's generated `dist` changes were restored from their
exact HEAD blobs; reproduction ATRs remain in `build/play/frame-peak-split/`.

## After — A+B, OWNER-SMOKE CANDIDATE

**OWNER-SMOKE CANDIDATE.** Implementation, evidence and the three ATRs are
complete. Owner smoke remains pending.

The owner approved removing the single missed physical frame at natural
SPACE → capital admission. **A+B is implemented; fallback C is not used.**
No gameplay decision, spawn cadence, effect lifetime, collision policy or
publication fence changed. No release, merge or push was performed.

A replaces four existing address operands (eight operand bytes, no new
instructions/state): main calls `$A00C` before the fixed wait; its six-byte
reader body calls LIFE colour then tail-calls `stats_scan`; the Light vector
publishes directly after the wait. The scan sees finalized lifetimes and
Heavy damage, still once per iteration. Capital bookkeeping is unchanged.

B keeps all initialization and phase decisions in C. Four disjoint 30-byte
stripes clear the complete 120-byte lookup. A descending do/while avoids a
loop-header jump and keeps code growth inside existing alignment padding.
The C entry body grows 10 B, the alignment gap shrinks 22 → 12 B, and the L2
image remains 1,250 B. `_l2_brake_tick` moves `$1C85` → `$1C8F` without a new
branch page crossing; warning entry `$1D00`, later hot routines, tables and
state addresses remain fixed.

### Permanent native gate and measured route peaks

There are now **15 permanent routes / 59,482 gameplay iterations**, plus 15
separately checked boss-loading rows: **59,497 state rows** in total. The
three campaign routes start naturally in SPACE, traverse the capital and its
exit, then enter the region-1 boss and capture 119 fight iterations:

* `campaign-0-flight`: EASY flight/contact.
* `campaign-1-flight`: MEDIUM flight/contact.
* `campaign-2-brake`: HARD brake/contact, including the originally failing path.

These sessions are defined in `scripts/frame-peak-routes.mjs` and included in
the **ordinary** `runtime-wall-trace.mjs` set. `--capital-entry-only` selects
all three and produces a focused build-local report. They require natural
entry, capital exit, boss entry ≤350, complete clock samples through phase
968, matching world/hull clocks, no stale L2 events, zero timing anomalies and
the **31,500 target**, not merely the hard ceiling. Focused route failures
remain fatal in their reports. The registered **`npm run test:frame-peaks`**
runs all twelve existing L2 routes plus these three, against preserved input
snapshots, and rejects missing routes. This is a reusable native test gate;
normal builds retain their computed gates and pending-release-evidence policy.

All results below are **MEASURED Atari800 7.1.2, PAL/XL, DMA on**, against
unchanged main `6ea1ca5`. The original thirteen baseline full-state streams
match the expanded baseline byte for byte. Adding MEDIUM reveals the same
natural-entry bug at iteration **868**, one missed frame, **63,991 cycles**.
EASY has no missed entry. This is the same approved correction on the same
code path, one removed physical frame per affected replay.

| Route | Gameplay iterations | Before peak | After peak | Capital peak before = after | After minimum fighter fence |
| --- | ---: | ---: | ---: | ---: | ---: |
| 480 EASY flight/contact | 3,007 | 31,105 | 30,975 | 29,756 | 5,969 |
| 480 EASY brake/contact | 4,017 | 30,992 | 30,869 | 28,264 | 7,171 |
| 480 MEDIUM flight/contact | 2,883 | 31,196 | 31,082 | 26,402 | 5,454 |
| 480 MEDIUM brake/contact | 3,767 | 31,204 | 31,084 | 28,082 | 5,695 |
| 480 HARD flight/contact | 2,779 | 31,445 | 31,325 | 27,681 | 5,124 |
| 480 HARD brake/contact | 3,600 | 31,552 | **31,432** | 28,936 | 5,829 |
| 960 EASY flight/contact | 4,264 | 31,164 | 31,053 | 27,690 | 5,841 |
| 960 EASY brake/contact | 5,515 | 31,162 | 31,036 | 27,435 | 5,851 |
| 960 MEDIUM flight/contact | 3,969 | 31,257 | 31,122 | 29,038 | 6,885 |
| 960 MEDIUM brake/contact | 5,052 | 31,256 | 31,136 | 28,390 | 6,927 |
| 960 HARD flight/contact | 3,767 | 31,432 | 31,294 | 28,770 | 5,703 |
| 960 HARD brake/contact | 4,729 | 31,432 | 31,297 | 28,694 | 4,977 |
| Natural campaign EASY flight/contact | 3,961 | 31,050 | 30,924 | 29,731 | 5,132 |
| Natural campaign MEDIUM flight/contact | 3,773 | **63,991** | 30,999 | 27,082 | 3,321 |
| Natural campaign HARD brake/contact | 4,399 | **63,846** | 31,293 | 29,679 | **2,856** |

Every after route has **zero** iterations above 31,500, missed fences, missed
frames, extra VBI boundaries, DLI errors, shifted rows, world/hull clock
mismatches and stale L2 events. Capital peak remains **29,756**. All fifteen
boss entries take **325/350 host frames**. Worst target margin is **68 cycles**,
hard-gate margin **1,136**, physical-frame margin **4,136**. No gate or assertion
was weakened. Current native reconciliation passes with zero NEW or MOVED
failures. Normal builds pass computed gates with the expected stale-release-
evidence warning; this is not release certification.

### The five former steady-state overruns

All five are on `l2-480-2-brake`, in SPACE. These are comparisons at the same
logical iteration, not maxima from different inputs.

| Iteration | Before | After | Delta |
| --- | ---: | ---: | ---: |
| 2436 | 31,552 | **31,432** | −120 |
| 2076 | 31,547 | **31,415** | −132 |
| 2016 | 31,525 | **31,393** | −132 |
| 2046 | 31,514 | **31,397** | −117 |
| 2466 | 31,514 | **31,400** | −114 |

The five worst iterations in the **expanded main baseline**, and their same-
index after counts, are MEDIUM campaign/868 **63,991 → 28,275**, HARD
campaign/839 **63,846 → 28,146**, then 480/HARD/brake 2436 **31,552 → 31,432**,
2076 **31,547 → 31,415**, and 2016 **31,525 → 31,393**. The worst five **after**,
in rank order, are 2436/2076/2466/2046/2016 from the table above.

### Natural-entry checkpoints and B's measured cost

Elapsed values use the existing active-loop start and ordinary trace hooks.
They include DMA and raster waits, without moving hooks or removing time.

| Checkpoint | HARD before 839 | HARD after 839 | MEDIUM before 868 | MEDIUM after 868 |
| --- | ---: | ---: | ---: | ---: |
| Active start: host / scanline / cycle | 1710 / 18 / 8 | 1710 / 18 / 8 | 1683 / 17 / 110 | 1683 / 18 / 8 |
| Pre-wait work, cycles | 26,422 | **22,444** | 26,106 | **21,979** |
| Fighter-fence margin, cycles | −1,122 | **2,856** | −794 | **3,321** |
| Start → publication begins, cycles | 61,000 | **25,432** | 61,015 | **25,435** |
| Start → end, wall cycles | 63,846 | **28,146** | 63,991 | **28,275** |
| End: host / scanline / cycle | 1711 / 266 / 14 | 1710 / 264 / 110 | 1684 / 267 / 33 | 1683 / 266 / 11 |
| Next active start, host frame | 1712 | **1711** | 1685 | **1684** |

The approved fix catches the fence in the entry's own physical frame. In the
HARD replay, publication moves exactly **35,568 cycles** earlier; MEDIUM's
elapsed difference includes a 12-cycle change in active-hook beam phase,
with the same one-physical-frame correction. Detailed absolute clocks are in
[entry-timelines.json](../diagnostics/frame-peak-split/after/entry-timelines.json).

B's same-input NMOS6502 fixture measures **3,373 → 1,415 CPU cycles** for the
lookup clear (**−1,958**), and **4,331 → 2,371** for the complete C entry
(**−1,960**). These paired CPU figures are a separate measurement from the
initial native exclusive-PC attribution (4,334 CPU). They are not a conversion
of wall time. A+B's native entry walls, **28,275 / 28,146**, are measured above.
All gates pass with B; **C was neither implemented nor integrated**.

### Exact logical equivalence and every physical-token difference

All **59,497 native rows** have identical per-iteration **FNV-1a logical
state hashes**, and an independent **byte-for-byte comparison** of all
**9,902 non-token RAM bytes** per row agrees. The full 9,904-byte mask is
unchanged; only `$4ED4 PHYSICAL_PAL_FRAME_ID` and `$4ED5
GAMEPLAY_PAL_FRAME_CONSUMED` are compared separately. No other state byte is
excluded or normalized. This covers all positions, HP, score, RNG, spawn/
Director/Light state, entity/effect/projectile pools, PMG, screen/charset/HUD,
playfield ring, lookup/geometry, counters and the linked BSS in the original
schema. Raw packed RAM snapshots remain under `build/` for independent replay;
their SHA-256 bindings, per-row hash streams and comparison results are retained.

The full raw hashes also match on **53,030 rows**. Every remaining difference
is one of the two PAL tokens, caused by a measured natural-entry miss on main:

| Replay | Removed frame at iteration | Physical-token differences | Consumed-token differences | All differences |
| --- | ---: | ---: | ---: | ---: |
| Twelve direct routes | none | 0 | 0 | 0 |
| Campaign EASY | none | 0 | 0 | 0 |
| Campaign MEDIUM | 868 | 2,906 | 2,902 | **5,808** |
| Campaign HARD | 839 | 3,561 | 3,557 | **7,118** |
| **Total** | one per affected replay | **6,467** | **6,459** | **12,926** |

[Every individual token difference](../diagnostics/frame-peak-split/after/equivalence.json)
is listed by route, iteration, token, before/after value, removed-entry index,
modulo-safe delta and cause. The physical token is exactly main minus one,
modulo 256, from the corrected entry onward. The consumed token is **not**
blanket-adjusted: immediately after main's miss the master wait can consume a
pending token without waiting for another DLI. Both runs' consumed values are
checked on **every row** against the unchanged kernel rule:

```text
next consumed = previous physical + (previous physical == previous consumed)
                modulo 256
boss install: consumed = physical
```

The model agrees with both actual streams. This explains the consumed token
remaining equal for the entry and its next three iterations before the first
capital iteration spanning a new DLI resynchronizes it. Every later difference
is derived from that same removed boundary. No unrelated clock exception is
allowed. Relative physical start/end/publication frame indices also match at
every iteration, except for the single removed frame and its resulting offset
in MEDIUM/HARD. Outside those corrected paths, presentation frame indices and
the full state streams are identical to main.

All **720 SPACE fixtures** have identical full state hashes, **0 CPU delta**,
and unchanged world-rotate predictor results/cost. On the native routes,
**no SPACE iteration is more expensive** at the same index. Ordinary SPACE
savings range **108–183 wall cycles**; the two entry corrections additionally
remove the missed-frame wait. Detailed per-route minima/maxima and all 720
fixture records are retained.

### Bytes, residency and focused checks

| Touched region / resource | Before → after used | Delta | Free left |
| --- | --- | ---: | --- |
| MAIN `CODE` | 4,464 → 4,464 B | 0 B | Shared MAIN placement; Light-tail slack below |
| MAIN Light composite `$3643–$3AEE` | 1,196 → 1,196 / 1,213 B | 0 B | **17 B** |
| Reader `$A000–$A5FF` | 1,529 → 1,529 / 1,536 B | 0 B | **7 B** |
| L2 usable `$1900–$1EFF` | 1,250 → 1,250 / 1,536 B | 0 B | **286 B** |
| C entry / pre-warning alignment inside L2 | code +10 B / padding −10 B | **0 B net** | 12 B alignment remains |
| Protected `$1F00–$1FFF` | 0 → 0 B spent | 0 B | **256 B intact** |
| New state / residency | 0 → 0 B | 0 B | No allocation |
| Initial boot content / planning gate | 12,825 → 12,825 / 13,652 B | 0 B | **827 B** |
| Light compressed record | 1,032 → 1,032 B | 0 B | Transport unchanged |

Normal builds pass computed gates for campaign, 480 and 960. The generated
memory map still matches the build. All changed linked branch/indexed-table
checks show **zero new per-frame page crossings**. No loader/startup path or
SIO protocol source changed; the native set boots all fifteen actual ATR
routes. No dependency was added; snapshot compression uses Atari800's existing
host zlib link. The real-hardware ATR path is unchanged; owner smoke remains
required.

Focused checks: **20/20 PASS** for the required L2/slalom files, new split/
route/equivalence tests and generated map; **4/4 PASS** artifact-isolation
unit checks; the existing statistics/Light files plus L2 coordinate/brake
checks give **67 PASS / 8 baseline FAIL**. These are 99 distinct focused tests,
91 passing, with no new or moved failure. The eight failures match main by
name, first assertion and message; no ledger edit was made:

1. `the overlay directory has eleven entries; the summary code is entry 8 at $0500` — `level-summary-build.test.mjs:55`.
2. `disk runs never overlap: levels, the capital restore, M5b's reservation, the summary` — `level-summary-build.test.mjs:261`.
3. `ENGAGING ENEMY SECTOR is one record in the reader, reused by the module; no AI line in either` — `level-summary-build.test.mjs:450`.
4. `the summary stays up at least 3 s and FIRE continues only after the level has arrived (Q15)` — `level-summary.test.mjs:766`.
5. `the art and the restore precede the level, the level is read tail first, the record last of the reads` — `level-summary.test.mjs:787`.
6. `the second START GAME of a session reads no code and no level` — `level-summary.test.mjs:800`.
7. `AUD-02: a changed byte in the level image is refused before its music player runs (owner Q3)` — `level-summary.test.mjs:1260`.
8. `Light kernel placement is legal, resident and inside every reviewed gate` — `light-wingman.test.mjs:241`.

No full `npm test`, release evidence regeneration or strict release build was
run. There is no claim of release readiness or owner acceptance.

### Current candidate ATRs and reproducible gates

| ATR | SHA-256 |
| --- | --- |
| `build/play/frame-peak-split/campaign.atr` | `5f5056a62e24cc1912304f5fbf6543c468af20381a1d83b102aa737629cc13fa` |
| `build/play/frame-peak-split/capital-480.atr` | `9ef208ee329e9d9dcde35dcc6a0f3c25c3f8afa70298201c3b386b3a3e546551` |
| `build/play/frame-peak-split/capital-960.atr` | `6b811d8014f8cb1974b8b95492c406267e9feeb9e2f7b816f97fca7e208f50d3` |

```sh
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-frame-peak/build/play/frame-peak-split/campaign.atr
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-frame-peak/build/play/frame-peak-split/capital-480.atr
atari800 -xl -pal -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-frame-peak/build/play/frame-peak-split/capital-960.atr

# Existing private Atari800 copy: build/frame-peak-atari800.
# Build all current input sets, then run the registered native test gate.
ISLAND_EDGE_ARTIFACTS=build/frame-peak-campaign node --import ./scripts/island-edge-build-redirect.mjs scripts/build.mjs
npm run build -- --level=1:sector=1
npm run build -- --level=1:sector=1 --l2-long-capital
npm run test:frame-peaks

# Reproduce the exact baseline/candidate state comparison using retained inputs.
node scripts/frame-peak-compare.mjs build/frame-peak-baseline build/frame-peak-fixed build/frame-peak-equivalence.json
```

[Summary and ATR bindings](../diagnostics/frame-peak-split/after/summary.json),
[all before routes](../diagnostics/frame-peak-split/after/baseline.json),
[all after routes](../diagnostics/frame-peak-split/after/candidate.json),
[exact RAM/FNV/token comparison](../diagnostics/frame-peak-split/after/equivalence.json),
[720 SPACE fixtures](../diagnostics/frame-peak-split/after/space-equivalence.json),
[B CPU measurements](../diagnostics/frame-peak-split/after/b-cpu.json),
[tests and unchanged assertions](../diagnostics/frame-peak-split/after/tests.json),
[source/snapshot/hash bindings](../diagnostics/frame-peak-split/after/bindings.json),
[focused native reports](../diagnostics/frame-peak-split/after/reports/),
[per-iteration state streams](../diagnostics/frame-peak-split/after/states/),
[logs](../diagnostics/frame-peak-split/after/logs/).

**NEXT TASK:** owner smoke of the three ATRs. No M3-H, release, merge or push
follows automatically.
