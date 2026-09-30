# Level 2 timing through the debug route (2026-09-30)

**Diagnostic only.** Nothing here is written into `docs/runtime-wall-trace.json`,
and nothing here is release evidence. The default replays carry level 1 only
(plan §11 item 16).

## The owner's request (plan §11 item 16)

One diagnostic timing measurement of level 2 over its sectors (at least the
swarm sectors 1 and 4, the finale sector 6 and, for step 4, the capital sector),
reporting the worst line-238 fence margin and the DMA-on maximum per sector, with
frames. A fence margin below 500 or a DMA-on frame over 32,568 anywhere in level
2 is a STOP.

At step 3 the harness could not do this: it read only `dist/` and `build/`,
refused a review-variant manifest, and a focused run wrote over the default
build's CSVs. Roadmap 4.6 step 4, phase 0 fixed that (`63d1e28`):

```text
node scripts/build.mjs --level=2 --quiet
node scripts/runtime-wall-trace.mjs --artifacts=build/level-2-s0 \
  --only-session=director-complete-<d>-natural-sweep-fire0 \
  --atari800-source=build/atari800-trace
node scripts/level-timing-by-sector.mjs build/level-2-s0/runtime-wall-trace/director-complete-*.csv
```

`--artifacts` accepts only a `build/level-N-sM/` directory whose manifest names
that variant, and only a focused run. The output goes to
`build/level-N-sM/runtime-wall-trace/`, and the focused report is stamped
`diagnostic_only: true`. `tests/wall-trace-debug-route.test.mjs` pins that the
default evidence stays byte-identical. The per-sector split
(`scripts/level-timing-by-sector.mjs`, `fb61143`) groups the PAL audit's own
per-frame fence samples by `STATE_SECTOR` (`$80F6`). Run over the default build's
level 1 CSVs, it reproduces the recorded figures: worst margin **788** at
`director-complete-2` f5815, and DMA-on maximum **31,626** at
`director-complete-0` f8654.

The replays are the three `director-complete-{0,1,2}-natural-sweep-fire0`
sessions: 10,500 frames, the `sweep` bot firing every frame, lives held.
EASY ends inside sector 6. MEDIUM and HARD complete the level.

## Before the hull change — level 2 on `main`'s 480-row hull (MEASURED)

Build `build/level-2-s0` at `63d1e28` (runtime identical to `main` `a930ba0`),
ATR `4b72f52a67e62d241a567ef9688241b2d919aad75209e7f7c7b346e604fc88f8`.
There were 0 distinct miss events, 0 rows over 32,568, 0 missed frames, 0 DLI
ordering errors and 0 clause failures on all three replays.

Each cell is the worst fence margin @ frame / the DMA-on maximum @ frame. A
capital frame has no fence, so the capital sector's margin comes from its
fighter frames on either side of the hull.

| Sector | kind | EASY (`-0`) | MEDIUM (`-1`) | HARD (`-2`) |
| ---: | --- | --- | --- | --- |
| 1 | swarm | 7,393 @579 / 30,468 @690 | 6,207 @689 / 30,810 @120 | 6,499 @136 / 31,061 @121 |
| 2 | elite (Bombers) | 3,086 @1807 / **31,132** @2124 | **1,607** @1515 / 30,993 @1476 | 2,628 @2061 / 30,761 @1284 |
| 3 | capital | 7,851 @3147 / 29,538 @2957 | 8,414 @2539 / 29,423 @2537 | 11,630 @2311 / 29,198 @2340 |
| 4 | swarm | 6,895 @5467 / 30,700 @4995 | 6,109 @3999 / 31,014 @4248 | 6,207 @4039 / 31,101 @3739 |
| 5 | elite | 3,639 @8409 / 30,550 @6624 | 3,467 @6051 / 30,452 @6048 | 3,239 @5239 / 30,226 @5393 |
| 6 | elite (finale) | 3,310 @10399 / 30,795 @8622 | 3,428 @7757 / 30,690 @7915 | 2,746 @8159 / 31,031 @8340 |
| capital frames (not `SECTOR_FIGHTER`) in sector 3 | | 1,355 | 1,228 | 1,085 |

**Level 2 worst: fence margin 1,607, DMA-on maximum 31,132.** Both are inside
level 1's recorded 788 / 31,626. The STOP lines are not approached: the margin
is 1,107 cycles above 500, and the maximum is 1,436 under 32,568.

The step-3 ESTIMATE holds. The swarm sectors (three live Lights) are among the
lightest in the level: 6,109 and more of margin. The binding sector is the
Bomber line, sector 2.

## After the hull change

*Pending: plan step 4, phase B.*
