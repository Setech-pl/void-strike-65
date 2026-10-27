# Worst-frame split — 2026-10-27

**OWNER_DECISION_REQUIRED. Production source is unchanged.** Branch
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

**NEXT TASK:** owner decision on allowing the single physical-frame correction
at the confirmed natural capital-entry miss. No push, merge, release or next
roadmap work is authorized by this report.

The initial local checkpoint attempt was blocked: Git's attempt to
create `/Users/marcinkrzetowski/Projects/dark-fighter/.git/worktrees/dark-fighter-frame-peak/index.lock`
was denied (`Operation not permitted`). The owner subsequently requested a
commit retry of the report, diagnostics and host tooling, excluding build
outputs. Only this session's generated `dist` changes were restored from their
exact HEAD blobs; reproduction ATRs remain in `build/play/frame-peak-split/`.
