# Capsule boss-stress recovery — 2026-10-22

**OWNER-SMOKE CANDIDATE**, implementation `7a61e89`, baseline main `36de308`.
Confirmed regression in `b2261c9`; no owner acceptance yet.

Full four-region stress certification was redone after §BO and this fix.
Native 6502 cycles, worst reachable; each cell shows maximum (lost-target
arrival). Historical 1b figures are from `35499ba` / the final table in
[the gauges plan](../../plans/m6-gauges.md). Main and fix are freshly measured
with unchanged compositions, reachability and rule-(B) assertions. All 19 modes
(off + the current 18 lance states, including §BO waits) are covered in each
Citadel/Spine/Bastion case; R1 uses its full stress test file (12/12 PASS).

| Scenario | 1b max (lost) | main max (lost) | fix max (lost) | fix margin |
| --- | ---: | ---: | ---: | ---: |
| R1 L1 | 7592 (7565) | 7712 (7684) | 7596 (7568) | 904 |
| Citadel L4 | 8109 (8109) | 8228 (8228) | 8112 (8112) | 388 |
| Citadel L5 | 8444 (8444) | 8563 (8563) | 8447 (8447) | 53 |
| Spine L7 | 8190 (8186) | 8191 (8186) | 8191 (8186) | 309 |
| Spine L9 | 8445 (8440) | 8446 (8440) | 8446 (8440) | 54 |
| Bastion L10 | 8477 (8473) | 8478 (8473) | 8478 (8473) | 22 |

No fix state exceeds 8,500; Bastion keeps 22 cycles. The +3 boss-spawn
cycles versus 1b are the tail JMP; the other 1b/current differences include
accepted §BO input handling. No new per-frame or per-spawn phase check.

## Cause and eligibility

The shared spawn added 119 cycles on the stress harness's third-kill drop
frame. This is an event cost, not per-frame polling. A lost torpedo returns
while ordinary shots can complete the drop count. The harness installs the
boss without Director sector entry, leaving sector 0 (SPACE): the C decision
draws RNG. [Instruction trace](main-spawn-trace.json): C body 88, total spawn
192 versus 1b 73. A real BOSS sector rejects before RNG (C body 43, total
147, +74 versus 1b). Both routes now bypass C after boss installation.

The forced-spawn history alone is insufficient: cap 8 suppresses force without
spending the latch, and debug starts bypass SPACE. The decisive invariant is
the shared selector's forced-scratch clear followed by C's sector-kind guard.
BOSS kind 2 always rejects; respawn, an uncollected LIFE, cap changes and direct
starts cannot admit LIFE there. C eligibility/RNG/life policy is unchanged.
SPACE ordinary spawn is 192 -> 180 cycles; boss ordinary spawn 76 (wrap 81),
1b +3. Installer costs 24 cycles including its call, once with DMA off.

## Resources and checks

| Resource | main -> fix | Free after |
| --- | ---: | ---: |
| DIRECTOR_C_LOW | 203 -> 214 / 245 B | 31 B |
| Window end | $B8FB -> $B8FB | 5 B reserved |
| Initial content | 13,572 -> 13,569 B | 83 B planning slack |
| DIRECTOR_RAM | 643 -> 643 / 645 B | 2 B |
| Boss install | 380 -> 383 / 384 B | 1 B |
| Summary | 1,770 -> 1,775 / 1,792 B | 17 B |

Lance 757/768 B, page 4 250/256 B unchanged. No new state or reservation.
Summary display list remains $0B58; grade letters move after the lists to
accommodate both restore entries. Safe residency margin 1,863 -> 1,852 B.
SPACE maximum CPU, DMA off: **15,116 -> 15,116**, delta 0. Candidate build
passes its computed gates; additive CPU+DMA+DLI remains **28,016 ESTIMATE**.
The build reports entry sectors (84/88/88/89), not host-frame durations.

Four short native ATR entry checks measured **325/340/340/344 host frames**
(R1/Citadel/Spine/Bastion), all <=350. Across their 476 post-entry frames:
maximum DMA-on 28,116, minimum fence margin 12,363, zero misses, overruns,
extra VBI boundaries or DLI errors. This is focused entry verification, not
release evidence regeneration. [Native results and command](native-entry.json).

Focused capsule/restore/map and R1 stress checks: **23 PASS**. The cheap runtime
evidence binding still fails with its pre-existing stale artifact binding;
its regeneration remains pre-release work under §BM. No full npm test, broad
wall-trace suite, GIF or failure-ledger changes. Checksum and contact clauses
are unchanged. [Build](candidate-build.log), [capsule checks](focused-tests.log),
[restore](restore-tests.log), [map](memory-map-tests.log), [R1](fix-r1.log).

## Owner smoke

[ATR paths, full SHA-256 values, exact options and launch commands](candidate.json).
The debug flag uses campaign region numbers: Citadel 2, Spine 3, Bastion 4
(the boss data directory order is 1/4/3/2). Campaign remains in dist/.

* SPACE: last-SPACE entry forces the rescue-cross LIFE as before; pickup +1
  life, max 8, one per level.
* All four bosses: ordinary play and torpedo arrival after its target was
  destroyed in flight.
* Boss-sector ordinary pickups: timing, position and booster rotation unchanged.

Stop for owner smoke. Keep the STATUS debt open until the owner writes OK.
