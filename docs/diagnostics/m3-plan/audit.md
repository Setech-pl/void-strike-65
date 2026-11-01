# M3 wave-path planning audit — 2026-10-31

**OWNER REVIEW CANDIDATE, planning only.**
[Plan](../../plans/m3-waves.md), branch `codex/m3-plan`, main baseline
`6046c0b6beb25f15c53ca15cda8f39a431983cd3`.
The owner-created branch was clean and already equal to main. No branch
switch, implementation, merge, push, tag, release or owner smoke promotion.
All execution was in `~/Projects/dark-fighter-m3-plan`; the primary checkout
was not built, run or modified. Git operations address this worktree only.
No comparison checkout/export was necessary. No subagents were used.

## Resource and frame evidence

Fresh normal build computed gates PASS. [Resource snapshot](resources.json)
contains relevant fresh manifest fields and artifact hashes; the plan gives the
derived window usable-space and record-capacity arithmetic. Current main's
content is 1,123 B and window 2,302 B; the memory-map header's older
1,097/2,290 prose is superseded by its generated map and this build. No
reserved address changes, so no generated memory-map edit is required.

Runtime release evidence is pending: the normal build names stale boot/ATR
binding at evidence commit `b3b8e466` and says **release build will fail**.
No release trace, hash rebinding or release build was performed.

Fresh Atari800 7.1.2 PAL, DMA-on results:

| Registered route | Frames | Worst /frame /host frame | Capital peak | Fence |
| --- | ---: | --- | ---: | ---: |
| `campaign-1-spread-capital` | 1,800 | 30,465 /246 /1,117 | 29,547 | 2,157 |
| `l2-960-1-flight` | 3,967 | 31,153 /2,448 /3,319 | 29,166 | 6,394 |

Both native runs exit 0 and their focused reports and strict route summarizers
pass. Zero missed frames, extra VBI boundaries, DLI ordering errors, shifted
rows, stale L2 accesses or world/hull clock mismatches; 960 boss entry 325 host
frames. Worst 31,153 leaves 347 to target 31,500 and 1,415 to hard 32,568.
This is two-route coverage, not a global maximum or physical-hardware proof.
[Summaries with source trace/state hashes](quick-summary.json),
[Spread focused report](campaign-1-spread-capital-focused-run.json),
[960 focused report](l2-960-1-flight-focused-run.json).

Baseline artifacts (reproduction, not an M3 play candidate):

| Artifact | SHA-256 |
| --- | --- |
| Normal campaign ATR | `e777080b16f95c29d0da9fff16f0f444c3790a91ef87e4fac178c3908a24ef3a` |
| Normal boot block | `197d0abb4d0eddbcf36740ef1d31dacaaa569a875fe470fe5ab29568989a6d3f` |
| NORMAL capital-960 ATR | `c0cfa71c3c0872071a4089cf9cc514ddfeb2b4f770510e18130dc33df78692fe` |

Reproduction in this worktree, after `npm ci`:

```sh
npm run build
node scripts/build.mjs --level=1:sector=1 --l2-long-capital --quiet
```

Before the variant, copy the normal top-level build/dist files, preserving
basenames, to `build/frame-peak-baseline-campaign/`. Copy the 960 variant to
`build/frame-peak-baseline-960/`. Use a private upstream Atari800 7.1.2 source
under `.cache/m3-plan/atari800/`; `source-and-focused.json` records its tag and
download SHA. Run autoreconf/configure/make there, then install the ordinary
observer using the existing `runtime-wall-trace.mjs --prepare` export-only
path. Supply a focused `--only-session=campaign-1-spread-capital` with the
campaign artifacts. The initial preparation attempted without that flag was
rejected by diagnostic validation after building the observer; no replay or
canonical trace was written. The registered wrapper supplied the missing
focus, prepared the frame observer, and completed successfully. No repository
harness/fixture source was changed to obtain a pass.

```sh
node scripts/frame-peak-native.mjs baseline --emulator=.cache/m3-plan/atari800 --only=campaign-1-spread-capital --output=.cache/m3-plan/quick-spread
node scripts/frame-peak-native.mjs baseline --emulator=.cache/m3-plan/atari800 --no-prepare --only=l2-960-1-flight --output=.cache/m3-plan/quick-960
node scripts/frame-peak-results.mjs .cache/m3-plan/quick-spread
node scripts/frame-peak-results.mjs .cache/m3-plan/quick-960
```

Runs were sequential against that private mutable emulator. No full native
matrix, home matrix, separate boss-stress command, boot frontend gauntlet,
release trace or strict release. The ordinary full unit suite does include
its existing boss stress tests; no additional stress workflow was invoked.

## Tests and source identity

One full `npm test`: **1,512 PASS /137 FAIL /4 SKIP of 1,653**,
duration 962,477 ms. **A137/B0/C0**, matched by file, test name, first failing
assertion and first message. [Exact tuple comparison](tests-ab.json).
All 137 also match the latest capital-strips main-debt inventory exactly;
zero new, moved or absent tuples relative to that inventory.

This is a **source-identity comparison**, not two independently executed
full suites. Before/after checks establish identical main inputs with:

```sh
git diff --quiet main -- src scripts tests cfg assets levels package.json package-lock.json
```

The 543-file inventory's SHA-256 digest is recorded in `source-and-focused.json`.
The plan adds no test/build/runtime input. No stale test or gameplay source
was changed. A task debt pointer in `docs/recorded-gate-failures.json`
references the exact 137 observed tuples without changing release predicates.

Canonical reconciliation was run with:

```sh
npm run failures:reconcile -- --tests .cache/m3-plan/npm-test.log --trace docs/runtime-wall-trace.json
```

It remains **FAIL on pre-existing registry/evidence debt**: the legacy unit
registry matches 1 and calls 136 shared main failures NEW, with 0 MOVED;
the historical trace has 0 NEW/MOVED and 32 disappeared predicates. That
trace reconciliation is not fresh native evidence. The task
does not certify a green full suite or release readiness. Raw full/focused
test and reconciliation `.log` files remain in the task cache.

Focused command:

```sh
node --test tests/level-payload.test.mjs tests/memory-map-generated.test.mjs tests/heavy-package.test.mjs tests/frame-peak-routes.test.mjs tests/nmos6502-rol.test.mjs
```

**27 PASS /1 shared FAIL**. T13 (`only the Director's sector entry writes the
star operand`) fails first at `tests/level-payload.test.mjs:417`, message
`declared once, called once - from enter_sector`. This exact tuple is already
in main's recorded debt. All generated-map, Heavy-package, route and NMOS
checks in this set pass. [Input identity and focused tuple](source-and-focused.json).
New plan links, arithmetic and Git whitespace are checked separately; no
implementation-mirroring tests were added for a documentation task.

## Findings and disposition

The plan retains P1–P8 and explicitly prices lifecycle/ABI integration, fire
bit ownership, guarded entry overhead, token/pool emission costs and chains.
Its 732-B content /224-B window budgets are estimates, not implemented sizes.
No M3 prototype was added. Actual CPU/RAM/residency delta **0/0/0**.
Owner questions Q1–Q6 remain choices, not assumed authorization. No new
hardware blocker or code regression is established by this planning task.

## Cleanup and handoff

Both the task directory and worktree `.cache/` were absent at session start.
Immediately before/after cleanup, `du -sh` reported:

| Own directory | Before | After |
| --- | ---: | ---: |
| `.cache/m3-plan/` | 27M | **592K** |
| Worktree `.cache/` | 27M | **592K** |
| `build/` (created entirely by this task) | 72M | removed, **0** |

`df -h /System/Volumes/Data`: **366Gi free before and after cleanup**
(926Gi size, 536Gi used, 60% capacity). [Captured cleanup result](cleanup.json).
The retained cache is below 200 MB and contains only the final report,
validation JSON and build/test/native logs. Committed MD/JSON evidence is
under this audit directory. All private emulator sources/binaries, downloads,
builds/ATRs, native CSV/profiles/snapshots and intermediate previews were
removed. Worktree `node_modules` stays (13M); no copied node_modules existed.
No other task directory, asset archive or checkout was cleaned.

Generated `dist/` writes were restored to Git originals; no distribution
artifact is committed. The measured ATR hashes above remain reproduction
identifiers; this planning task delivers no new play ATR. All own npm,
prepare/build and native sessions have completed. No Vite, Worker, Chrome,
workerd or port listener was started.

**NEXT TASK: owner reviews the committed plan and Q1–Q6; STOP before
implementation.** No merge, push, release or gameplay acceptance.
