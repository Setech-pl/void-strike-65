# Spine nacelle link B3 — smoke refresh, 2026-10-30

Branch `codex/spine-nacelle-link`; original `e6ec8cd`, rebased source
`e4aaeec`, onto main `a066098`. B3 art is byte-for-byte unchanged from the
original branch. Owner acceptance remains pending. **BLOCKED_DOCUMENTATION_APPROVAL:** one
generated-map gate remains pending the owner’s scoped preservation exception.
This checkpoint is not a completed smoke handoff. Validation is recorded below.

## Rebase and documentation preservation

The first attempt stopped and was aborted under the original conflict rule.
After the owner authorized documentation-only resolutions, the second attempt
completed. No code, asset, script or test conflict occurred.

The following conflicts occurred in both implementation commits:

| Commit replayed | File | Resolution |
| --- | --- | --- |
| `73f7512` | `docs/STATUS.md` | Kept main's Last update, shot-impact and M3-H text verbatim; inserted Spine after M3-H and before L2, newest first. |
| `73f7512` | `docs/owner-decisions-2026-09-11.md` | Inserted Spine §BX before main's reservation note and §BY; kept main's note, island-contact decision and next-free §BZ unchanged. Omitted only the Spine branch's stale next-free §BY marker. |
| `e6ec8cd` | `docs/STATUS.md` | Kept main verbatim; updated only the added Spine checkpoint from B to B3. |
| `e6ec8cd` | `docs/owner-decisions-2026-09-11.md` | Added the B3 revision inside Spine §BX, retaining all main text. |

No numbering collision: main explicitly reserves §BX for Spine. No renumbering
was needed. The automatically merged game-design insertion was moved after
main's existing Spine paragraph so its original lines also remain intact.
[Preservation check](main-doc-preservation.json), [rebase audit](rebase.json).

## Validation

Normal campaign, direct-Spine and capital-960 builds pass computed byte,
CPU/DMA, placement, startup-window, boss-entry and disk gates. Stale release
evidence remains an expected warning; these are normal smoke builds, not
strict-release certification. No release trace, full native matrix, home
matrix, standalone boss stress or milestone boot-smoke matrix was run for this refresh.
The mandatory unit suite and its focused setup reruns include real-SIO boot checks.
The mandatory full unit suite itself includes existing stress tests.

Focused command, **6 PASS / 0 FAIL**:

```sh
VS65_HARNESS_BUILD=boss-region-3-level-1-s6 node --test --test-reporter=spec \
  --test-name-pattern='^(region 3|the art rule:|the palette reads|the field:|a hit a generator)' \
  tests/boss-region-3.test.mjs
```

The art case uses real generator kills in both orders, tests the exact B3
pattern and its mirror, both destroyed states, the unchanged living side,
PF2 colours and empty collision columns. [Focused output](focused.txt).

One full `npm test` was run per source:

| Source | Tests | Pass | Fail | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Main `a066098` | 1,622 | 1,482 | 137 | 3 |
| Candidate, raw | 1,622 | 1,482 | 140 | 0 |

Raw **A137/B3/C0**, matched by test name, first assertion and its message.
[Raw comparison](raw-test-comparison.json); both complete logs are saved as
`npm-test-{main,candidate}.txt.gz`.

Two raw B failures were SIO diagnostic setup failures. Main initially skipped
those tests because its measurement checkout lacked the emulator source. The
candidate's copied CPU source retained optional L2 observer calls, while the
SIO diagnostic's replacement header does not define them. Prepared separate
SIO diagnostic fixtures with the upstream memory-fetch macros restored,
leaving the native timing emulator, production code and validators unchanged.
[Reproducible fixture repair](prepare-sio-fixture.mjs). Reran all three
emulator-dependent checks (including the third main skip): **3/3 PASS on both
sources**. [Candidate](fixture-rerun-candidate.txt), [main](fixture-rerun-main.txt).

The remaining raw B case is the generated memory-map expectation: four rows
still describe main's 108 glyph codes / 7 charset sectors and 213-B F segment.
B3 uses 122 codes / 8 sectors and 243 B. Updating those rows requires the
owner's scoped exception to the instruction preserving every main line.
[Exact four-row patch](spine-generated-map.patch). After the focused setup repairs, the effective comparison is
**A137/B1/C0**; B contains only this stale generated-map expectation. No
second full suite was run. The owner has been asked to authorize only the
four generated Spine data-row changes; no dependent edit has been made.

All 137 shared unit failures are recorded as `unit_test_debt` in
`docs/recorded-gate-failures.json`, under the current task gate policy.
The existing 32 runtime-clause records are unchanged. Reconciliation of each
saved full test log and the historical canonical trace was run: the legacy
unit ledger matches only the preview case (main: 136 NEW; raw candidate:
139 NEW); neither run has MOVED unit assertions. The canonical trace also
retains previously documented ledger drift. Those reconciliation reports do
not certify fresh release evidence. [Candidate](reconcile-candidate.txt),
[main](reconcile-main.txt).

Quick native PAL checks, zero guest instrumentation bytes:

| Registered route | Frames | Worst wall cycles | Hard-gate margin |
| --- | ---: | ---: | ---: |
| Spread NORMAL `campaign-1-spread-capital` | 1,800 | 30,443 | 2,125 |
| Capital-960 HARD/brake `l2-960-2-brake` | 4,741 | 31,297 | 1,271 |

**Worst frame: 31,297 cycles**, frame 3603 of capital-960, in SPACE after the
capital. It is 203 below the 31,500 target. Both route peaks have delta **0**
against main's published, source-equivalent native evidence; main was not
traced again here. No misses, extra VBI boundaries or DLI ordering errors.
The multi-frame boss-loading row is excluded from ordinary frame costs;
the sampled R1 entry on the 960 route takes 325 host frames. These two routes
are not a native full-fight measurement of Spine.
[Quick summary and bindings](native-quick.json), compressed CSVs alongside it.

Self-resolved setup case: the first capital-960 attempt lacked ownership
images required by the lifetime observer. Generated them with
`node scripts/l2-observer-images.mjs build/l2-capital-960` and reran that
route successfully. No game code, validator or threshold changed.
[Initial setup error](native-capital-960-setup-failure.txt).

## Bytes and residency against current main

MEASURED by fresh main/candidate builds and compiler output:

| Art-touched segment or run | Main B | Candidate B | Delta B |
| --- | ---: | ---: | ---: |
| R3 `BOSS_F_CODE`, `$526E` | 213 | 243 | +30 |
| R3 F occupied span, `$5200` (includes fixed 110-B prefix) | 323 | 353 | +30 |
| R3 look data within that prefix | 80 | 98 | +18, reclaimed padding |
| R3 charset meaningful glyphs, `$0C00` | 864 | 976 | +112 |
| R3 charset disk run | 896 / 7 sectors | 1,024 / 8 sectors | +128 / +1 sector |
| R3 F disk run | 384 / 3 sectors | 384 / 3 sectors | 0 |
| `BOSS_CODE`, `$6E0F` (R3 sector-count data) | 1,963 | 1,963 | 0 |
| `BOSS_HEAD_CHECK`, `$75BA` (R3 integrity data) | 36 | 36 | 0 |
| `BOSS_BANNER_HEAD`, `$10BF` (bar-step data) | 48 | 48 | 0 |
| Shared boss code disk run | 2,048 | 2,048 | 0 |
| R3 theme disk run | 256 | 256 | 0 |
| R3 banner disk run | 1,280 | 1,280 | 0 |
| R3 band A / B disk runs | 384 / 384 | 384 / 384 | 0 / 0 |

Charset: 122/128 codes, **48 B free**. F: **159 B free** of 512.
Occupied spans grow **142 B**; meaningful content grows 160 B including the
18 B of reclaimed prefix padding. Against the old B art (`73f7512`), B3 itself
adds 24 glyph bytes and zero F bytes. Against original B3 `e6ec8cd`, this
refresh adds zero art/helper bytes.

All other linked segment starts/sizes are unchanged; resident allocation
delta **0**, no reserved range changes. Initial packed content remains
12,843 B and initial transport 211 sectors. ATR length remains 133,136 B.
R1/R2/R4 disk runs are byte-identical to main. The shared boss image changes
only its R3 charset-sector count and two integrity bytes; R3 theme changes
only two integrity bytes, banner only its sector-dependent progress-bar step.
[Every linked segment and changed run](byte-comparison.json).

The full suite's eight Spine tests pass on both sources. Its L7/L9 ordinary
composition maxima remain 7,771/8,025; lance maxima remain 8,191/8,446.
One L9 kill-mode composition is **8,136 -> 8,159 (+23 cycles)**, consistent
with the existing helper's subsequent collapse-column call. Other reported
lance-mode maxima are unchanged. This does not change either overall maximum.
[Instruction-cycle comparison](spine-suite-cycles.json).

B3 replacement adds no runtime path relative to the previous B3 branch.
The branch's existing field-collapse helper remains R3-only. Its historical
bounded full-queue estimate is approximately 1,200 native cycles for the first
enqueue, and 23 instruction cycles on subsequent collapse columns; these
figures were not remeasured here. New queued art uses the existing bounded
publication path. No claim of a new Spine full-fight CPU measurement is made.

## Play ATRs and launch commands

Files live under this worktree's `build/play/spine-nacelle-link/`.
Keep the disk mounted for menu returns. Start the game from the menu; the
direct build enters the region-3 boss sector, without flying the campaign.

| ATR | SHA-256 |
| --- | --- |
| `campaign.atr` | `cc41be9c1aff2582ef9b2f76bb45d9d7f283f3d152c0284ba2a12d9fa4a223f2` |
| `spine-direct.atr` | `4cb13be1cf9ecf355c36716688037bbecb5c360abb055ddbc7b32b3fa6d398e5` |

```sh
cd /Users/marcinkrzetowski/Projects/dark-fighter-spine-b3
atari800 -xl -pal -config "$PWD/build/atari800-pinned.cfg" -nopatch -nobasic "$PWD/build/play/spine-nacelle-link/spine-direct.atr"
atari800 -xl -pal -config "$PWD/build/atari800-pinned.cfg" -nopatch -nobasic "$PWD/build/play/spine-nacelle-link/campaign.atr"
```

Rebuild commands: `npm run build` for campaign;
`npm run build -- --level=1:sector=6 --boss-region=3` for direct Spine.
Copy the resulting normal `dist/void-strike-65.atr` and direct
`build/boss-region-3-level-1-s6/void-strike-65.atr` to the named play files.
[Artifact provenance and absolute launch arguments](artifacts.json).

## Owner smoke — pending

- Destroy either generator: all engine nozzles stay attached.
- The top beam remains permanent.
- Generator remnants occupy no more than one third of their original height.
- Verify B3's outlined plate beam, 2-cell rail, hull collar and torn lower-third wreck.
- Destroy both generators in either order, then plates/weapons: no stray cells.
- Follow boss motion: links scroll with the hull; existing field-half and
  shot/laser/lance behavior remains unchanged.

Check Atari800 PAL and real 65XE PAL through SIO2SD. Only the owner can record
smoke acceptance. **NEXT TASK: owner authorization for the four generated
Spine rows, regenerate the map, rerun its focused check and finish the gate
audit/commit; then owner smoke and the owner’s merge decision.**
No merge, push, tag, release or next roadmap work.
