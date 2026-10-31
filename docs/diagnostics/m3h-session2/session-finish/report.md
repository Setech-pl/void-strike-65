# M3-H session 2 finish — 2026-10-31

Implementation is complete and ready for owner review/merge. Owner smoke of
checkpoint6 Heavy-sector and level2 passed at `3468204`. The subsequently
requested sideways Bomber departure is **OWNER-SMOKE CANDIDATE**.

## Final behaviour and proof

Before capital, a Bomber flies sideways toward the nearer screen edge at
4 HPOS units = 8 native raster pixels/frame (twice fighter horizontal speed).
It holds Y and does not fire. The body is 32 HPOS units wide in QUAD mode;
left/right screen boundaries are32/224, so midpoint comparison X112 chooses
the nearer exit (exact tie goes right). Direction remains stable as X moves.
The member retires only after its whole body is outside the playfield.

`src/c/lifecycle.c:cc2_heavy_tick` makes this bounded movement decision in
CONTENT_CODE. The existing guarded resident `_enemy_c_heavy_tick` entry checks
content validity and phase. At the terminal edge it calls
`src/hybrid/heavy-damage.s:_asm_heavy_departure_erase`, also in CONTENT_CODE.
That hardware executor reuses `erase_enemy_member` with the old cached Y,
then hides HPOSP1/P2 before the C decision sets Y240 for normal retirement.
This full erase prevents old plane rows reappearing after a later admission.
The fixed kernel address has a link-time assertion; no movement AI moved to ASM.
H12/H13 and all existing home guards stay in their checked home.

`tests/heavy-departure.test.mjs` passes:

- 2,322 exits: EASY/MEDIUM/HARD, both members, top/middle/bottom Y, every
  legal spawn X48..176. Maximum28 frames. X steps toward the correct edge;
  Y stays fixed, ready-to-fire salvo state emits no shot, final HPOS and
  complete plane are zero, stale/dead requests never draw.
- Actual `resolve_enemy_damage` hits during departure publish both compiled
  hole stages at the held Y through normal H14/H12 scheduling. Lethal hits
  clear the plane, reduce live count and award the normal50-point BCD score.
  Both slots and all difficulties are covered; HP is not seeded to simulate hits.
- Capital admission requires two fully Heavy-free frames, including frame
  counter wrap254→0. Invalid home/phase tests trap reads before any home entry.

A linked before/after replay compares168 Raider departure updates, all movement
bytes, both PMG planes and instruction cycles: identical. Nondeparting Raider
and Bomber paths are also unchanged.

Native 900-frame capital approaches on each difficulty use the campaign
snapshot, ordinary joystick input and the disclosed held-lives survival
fixture (`DFTRACE_HOLD_PLAYER_LIVES=3`, policy `l2-matrix`). They inject no
enemies, departure flags, admission or phase state. Their observed empty
windows are:

| Difficulty | Last live Heavy frame | Capital admission frame | Fully empty frames |
| --- | ---: | ---: | ---: |
| EASY | 395 | 683 | 287 |
| MEDIUM | 351 | 607 | 255 |
| HARD | 324 | 545 | **220** |

These are active-gameplay frame numbers. The general linked guarantee remains
**2 frames**, while **220** is the minimum observed in these native routes.
[Native transitions and quick-frame results](native.json) retain the actual
X/Y/state/HPOS/plane samples through departure and admission.

## Bytes, state and cycles

MEASURED versus the owner-accepted visuals `3468204`; the main merge separately
retains main's Spine B3 content refresh.

| Resource | Before → final | Departure delta |
| --- | ---: | ---: |
| Resident window | 2,290 → 2,290 B | 0 |
| Session2 window growth vs2,068 | **+222 B** | 28 B below +250 ceiling |
| Arena | 830/832 B | 0 |
| Director resident | 324 B | 0 |
| L2 | 1,290/1,792 B | 0 |
| Decoded extension | 875 B | 0 |
| Checked home `$1180–$18FF` | 1,029 → **1,097/1,920 B** | **+68 B**,823 free |
| New departure state | 0 B | 0 |

The home addition is56 C bytes +12 hardware-executor bytes; final layout is
1 header +1,067 code +29 data (24 H13 masks +5 existing state). Heavy policy
state remains13 B, render metadata8 B and the32-B damaged-body reservation is
reused. No arena/Director/full-segment growth is used by departure. No reserved
range changes. Home remains15 content-record sectors, extension record5 stays
750 packed bytes/7 sectors, window record8 stays1,878 packed bytes/15 sectors.
Total transport213 sectors (+2 across session2). Departure adds **0 sectors,
0 fixed-load reads and0 level-load instruction cycles**; this is structural
same-length loader accounting, not a newly timed host load measurement.

Linked NMOS instruction measurements (without ANTIC DMA):

| Operation | Old → final cycles | Delta |
| --- | ---: | ---: |
| Ordinary row tick, all sampled profiles/departure states | 200 → 200 | 0 |
| Nondeparting Bomber member | 559 → 559 | 0 |
| Departing Bomber member, left/right | 328 → 348/351 | +20/+23 |
| Terminal member, left/right incl full erase | 328 → 691/696 | +363/+368 |
| Pair update during departure | 2,013 → 987 | −1,026 |
| Pair update with both members retiring | 2,013 → 1,832 | −181 |

Holding Y avoids the ordinary full PMG copies, explaining the pair savings.
These are representative controlled fixtures, not a universal whole-frame
saving claim. [Linked measurements](measurements.json), [replay source](measure.mjs).
To rerun the comparison, supply baseline linked artifacts from3468204 in
`.cache/m3h-session2-finish/baseline/` and current normal artifacts in`build/`;
the temporary baseline itself is removed after the task.

## Merge and validation

Production change commit `8bceac0`; actual `git merge` of current main71a38a8
committed as `bbc34a9` with those two parents. No rebase and no code conflicts.
Only `docs/recorded-gate-failures.json` conflicted: both sides' properties were
retained, with main's complete text unchanged after removing inserted M3-H
properties. [Preservation SHA proof](merge-preservation.json).
EN/PL enemy/player docs and generated memory map are updated.

Normal gated build PASS, including the level2 and Heavy-sector variants.
Focused integration57 PASS/0 FAIL/1 review-build-only SKIP; strengthened
ready-salvo departure4/4 PASS, map3/3 PASS and optional-emulator files12/12 PASS.
The normal build's stale runtime-evidence warning remains pending as designed;
this task does not claim a strict release/milestone pass.

Required native quick routes, DMA enabled:

| Route | Frames | Worst frame | Capital peak | Misses / extra VBI / DLI / shifted / stale |
| --- | ---: | ---: | ---: | --- |
| capital Spread NORMAL | 1,800 | 30,465 | 29,547 | all0 |
| capital-960 NORMAL | 3,967 | **31,153** | 29,166 | all0 |

Worst is347 below31,500 target and1,415 below32,568 hard gate. Boss entry325
frames. Both peaks equal the previous checkpoint. One incidental native
preflight also passed cold/RESET/130XE/forced-restore checks; remaining short
transition replays skipped duplicate preflights. No full native/home/boss/release
matrix was run for this task.

Exactly one full `npm test`: raw **1,510 PASS /138 FAIL /4 SKIP**,1,652 total.
One accepted stale generated-map expectation was regenerated and passes3/3
focused. Three optional tests skipped for missing conventional emulator source
location; after placing the prepared source there, their three files pass
12/12 with no skips. Only the private SIO diagnostic copy drops incompatible
optional framepeak/L2 observer hooks; production/harness source is unchanged.
Audited totals **1,514 PASS /137 FAIL /1 review-only SKIP**.

**A137 /B0 /C0** by file, test name, first failing assertion and message versus
main71a38a8. Main's saved full run is96cbf6d; `git diff` confirms identical
src/scripts/tests/cfg/assets/package inputs through71a38a8. Exact tuples,
corrections and totals: [tests-ab.json](tests-ab.json); reproducible
[audit script](audit-tests.mjs), [full log](npm-test.log) (trailing whitespace on diagnostic lines trimmed;
raw capture retained in the task cache).
Shared failures are referenced in `docs/recorded-gate-failures.json`.
Canonical legacy reconciliation remains nonzero (137 unit failures absent from
its older test registry; trace NEW/MOVED0), recorded in
[reconciliation log](failures-reconcile.log). No second full test is claimed.

## Play delivery

New normal production ATRs, with no damage-fixture flags:

| Start | File under `build/play/m3h-session2/session-finish/` | SHA-256 |
| --- | --- | --- |
| Campaign | `campaign.atr` | `f2778b7a6a123b8de81cdbb29d94433eb4f2b7815794887a712d61aa3cfdfd5e` |
| Level2 | `level-2.atr` | `5a9d4057b7866226f798866291615f5b3297802aa4fcbcdf4da31c50140f2679` |
| Heavy shortcut | `heavy-sector.atr` | `6076585c1a6977673c844248576312e9178e6acf2a66b2d5d4608c04a1e2942d` |

Each133,136 B. Flags and source binding: [delivery.json](delivery.json).
Campaign hash matches the native Spread route. Old18 play ATRs are preserved
byte-for-byte. The Heavy shortcut retains the accepted early armoured opening;
campaign pacing and Raider departure remain unchanged.

Owner review/smoke of the final sideways departure, then owner merge, is next.
No push/tag or merge into main was performed.

## Cleanup

Task working files were confined to `.cache/m3h-session2-finish/` and the
`build`/`dist` symlinks into it. Original tracked dist and original play ATRs
were preserved. Emulator source/builds, baseline export, snapshots, intermediate
media/traces and temporary builds are removed; worktree node_modules stays.
Final measurements, reports, JSON and test logs remain as evidence. Disk usage
before/after and free disk space are recorded in [cleanup.json](cleanup.json).

Cleanup measurements: task cache **158M → 1.0M**; all worktree `.cache`
**161M → 3.9M**. Data volume **379Gi free** after cleanup (`df -h`).
Final three requested play ATRs total399,408 B and are kept outside the cache
for owner smoke. No owned emulator/test/server processes remain.
