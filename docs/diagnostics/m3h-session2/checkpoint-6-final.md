# M3-H checkpoint 6 — OWNER-SMOKE CANDIDATE

Checkpoint 6 completes H10–H14/H16 and the Heavy looks. **Pause for final owner
smoke.** Only checkpoint 2 (`f33fcdc`) has the owner's smoke acceptance.
Checkpoints 3 `0e4160d`, 4 `d9dce3f`, 5 `2064aa8` and this delivery are candidates.
The [historical byte blocker](checkpoint-6-blocked.md) is resolved by the
owner-approved resident C notification helper; no alternate placement was used.

## Departure fix and placement

The cutoff bypasses movement's HP watches. A surviving hit after it previously
failed to queue new holes. Both nonlethal HP branches now tail-call a **32-B
resident C helper**. It checks content validity and gameplay phase **before**
reading the checked-home departure flag. It queues the existing member bit and
returns A=0/X=0. The HP entry stays 105 B with two padding bytes, preserving all
later extension/ASM addresses. Kills and inactive members bypass the helper.

C's existing stage/claim policy prunes dead/retired requests, coalesces both
members, respects the token on first attempt and never stamps on a rotate.
Retries can ignore exhaustion; the existing ≤3-frame watch-to-publication bound
remains. ASM lazily copies both intact bodies, clears the generated masks and
forces only requested live planes at current Y. Admission reinstalls whole art.
The helper does not restore movement holds/dodges or change departure policy.
H12/H13 and the existing H14 stage/claim body stay in the checked content home.

| Resource | Final | Recovery delta /session delta versus owner-cut `7fe9040` |
| --- | ---: | --- |
| Window | **2,290 B** | **+32 /+222 B**;28 B below the250-B ceiling;521 usable B free |
| Arena | **830/832 B** | +0 /+3 B (earlier Bomber lookup) |
| Director high /L2 | **324 /1,290 B** | +0 /+0 |
| Checked content home | **1,029/1,920 B** | +0 /+417 (H12 ASM187,H13 tables24,H14 C206);891 free |
| Decoded C/ASM extension | **875 B** | +0 /+0;24 B tail remains |
| Pickup code | **1,008/1,009 B** | +0 /+6 B;prior cold boss-head/LIFE bindings remain checked |
| Render metadata /H16 | **8 /32 B** | metadata+8 for session;H16 is existing reserved storage |
| Total additional used RAM | **656 B for session** | existing reservations;**0 new reserved B** |

The arena's only recovery byte change is the relocated Bomber lookup operand;
its size is unchanged. Director, L2 and content images are byte-identical to the
blocked baseline. No other full segment grows and no code is moved elsewhere.
[Exact resources, samples and artifact hashes](checkpoint-6-final.json).

Packing changes record 5 from **746 to750 B**, requiring **7 instead of6
sectors**. Record 8 remains **15 sectors**,1,878 B packed. Total transport is
**213 sectors (+2 for session)**;other record counts stay unchanged. Initial
content stays12,865 B /101 sectors. This is storage expansion, not decoded code
or RAM growth. The normal build's byte/disk/startup gates pass.

The checked content run remains **15 sectors**. A fresh linked NMOS serial-drive
fixture measures **313,556 CPU cycles**,added **0 cycles/0 reads** versus main.
It is not physical disk/SIO2SD wall time. Both quick routes first enter gameplay
at host frame871,unchanged from the blocked integration;checkpoint2 documented863.
No load-time claim is inferred just from byte counts.

## CPU and native proof

The helper adds **21 instruction cycles** on ordinary surviving hits and **38**
on surviving departure hits. Lethal/inactive paths add **0** (72 matched-state
cases). No new idle, row-tick, VBI or DLI work. The pending fast path remains
byte-exact LDY/BNE/RTS,**12 cycles (+0)**;actual body copies retain−8 cycles.
Bomber ramp tick cost remains+3–4 per member versus checkpoint2.

Existing integration component costs remain report-only: first full dual event
up to2,528 NMOS cycles (claim/copy/stamp/draw,excluding DMA),reset assault1,844 /
armour1,874 /Bomber2,491;death retry521/530,rotate kill827/859. The old component
thresholds are not presented as frame gates.

[Final native captures](checkpoint-6-final-native.json),Atari8007.1.2 PAL,DMA on:

| Route | Measured gameplay frames | Worst frame |
| --- | ---: | ---: |
| capital Spread NORMAL | 1,800 | **30,465** |
| capital-960 NORMAL | 3,967 | **31,153** |
| Post-departure Heavy damage,HARD | 1,000 | **30,841** |

Worst registered frame is31,153:target margin347,hard margin**1,415**,physical
margin4,415. Zero missed frames,extra VBI,DLI errors,shifted rows or stale L2
reads. Boss entry325 host frames. Loader transition rows are not gameplay frames.

The Heavy fixture sets **only the real departure flags** at gameplay frame560:
`560:1580=01,813d=00,813c=00`. It seeds no HP,projectiles,PMG bytes or code.
Real collision hits then drive the new notification,one lazy dual-body copy and
both damage stages:publication frames580/586,wall27,879/27,448. Zero PMG mismatches.
It tops host lives to3;guest instrumentation0. This is a **Bomber** subject;
armour has explicit linked E/M/H fixtures,not a claimed native admission.

## Tests and main comparison

Normal gated build PASS. Focused set: **65 PASS/0 FAIL**,one review-only skip.
Actual level2 and Heavy variants each pass **22 tests**,one review-only skip;
final stronger departure cases pass2/2 on each. These use the real linked HP
policy,renderer and retirement/kill entries. They prove surviving departure
hits on both shapes/slots/difficulties,skipped thresholds,unchanged motion
fields,death-bit preservation and invalid-home/phase read traps.

A killed or retired member gets **zero draw calls and zero PMG/HPOS writes**
even while its live peer publishes stage2 in the same event. The peer's exact
hole bytes are checked independently against generated masks. Existing tests
retain clipping,hold,dodge,lazy-copy independence,reset and nonrotate retry proof.

One full `npm test`: **1,507 PASS /138 FAIL /1 SKIP of1,646**. Against unchanged
main `71a38a8`:raw **A137/B1/C0** by file,name,first assertion and message.
The sole B is stale T13's old≤747-packed-B /6-sector pin. The approved tail-call
recovery preserves875 decoded B but costs4 packed B. The corrected test checks
**decoded875 B**,packed≤750 /7 sectors,and keeps Light-pair124 B and initial
boot gates. It passes focused;the only failure in that follow-up is exact main
debt. No guest implementation changed after the full run started.

**Audited result:1,508 PASS /137 shared FAIL /1 SKIP;A137/B0/C0.** No second full
run is claimed. [Raw/focused correction and all137 exact tuples](checkpoint-6-final-tests-ab.json).
Main's committed full inventory is reusable:its tested96cbf6d and current71a38a8
runtime/test/build/asset trees are identical (checked with git diff). No main
worktree,merge,rebase or branch switch was used.

The native Heavy run first collided with `level-two.test.mjs`,which deletes
and rebuilds its variant directory;the output path disappeared. After that
writer finished,we recreated observer fixtures and reran successfully. No guest
code change was needed. Private SIO fixture setup removes optional native
observer hooks,as in the previous accepted task setup;hardware tests introduce
no task-only failure.

Shared debt is recorded in `docs/recorded-gate-failures.json`. Legacy canonical
reconciliation still fails against its old unit registry and32 disappeared
trace predicates;the raw log also retains the pre-correction T13 assertion.
Canonical release predicates/evidence were not rewritten. No full native/home
matrix,standalone boss stress,release trace or strict release was run. Release
evidence remains pending;this is an owner-smoke candidate,not release certification.

## Owner smoke

Keep the ATR mounted through menu returns. Mount as D1;do not use `-run`:

```sh
atari800 -xl -pal -nopatch -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-m3h-s2/build/play/m3h-session2/checkpoint-6/level-2.atr
atari800 -xl -pal -nopatch -nobasic /Users/marcinkrzetowski/Projects/dark-fighter-m3h-s2/build/play/m3h-session2/checkpoint-6/heavy-sector.atr
```

The shortcut starts level2 sector6 (zero-based5):assault first,armour after the
Bomber waves. EASY/MEDIUM armour jumps directly to the last damage look after
its surviving hit;HARD shows both stages. Check both PMG planes through
flight,hold,dodge and departure,and that later formations start intact. Bombers
should remain readable at1 HP with the4/6/8/8/8 hue-C ramp,flash/charge and holes
at2/1 HP. Assault stays the original one-hit silhouette. The owner judges the
Bomber ramp and overall visual result at this smoke.

| ATR under `build/play/m3h-session2/checkpoint-6/` | SHA-256 |
| --- | --- |
| campaign.atr | `6457559dc4a1369913150804c7eb01758d4e81da91a5d3b4470466d6e643c9d1` |
| level-2.atr | `1f25f5efb358c4f60f558c60855416e8924c3b737b19b5af7ed82075cc0cd2bf` |
| heavy-sector.atr | `40688a25a87ce374fe3e7cb59488b34588efe768c36218fc75d5b8b4f666c8e4` |
| capital-960.atr | `e7d59fa97695e6114b4adbefc73bbf6f7b386d3ec04eb8295f093f2a3d52133e` |

Each is133,136 B. Required-route and Heavy ATRs match the captured native hashes.
Older `checkpoint-6-diagnostic/` disks are historical;use this final directory.
[Source preview](checkpoint-4-variant-c.png):armour above Bomber;intact/stage1/stage2
columns;source-derived,not a native raster.

NEXT TASK: **owner smoke after checkpoint6;STOP**. Branch remains on owner-cut
`7fe9040`;main advanced to71a38a8 and requires owner integration before merging.
No merge,push,tag or feature acceptance is claimed.

## Cleanup

[Cleanup measurements](cleanup-final.json): task cache and worktree `.cache`
each **149M →2.2M** (`du -sh`), retaining only results JSON, final PNG comparisons
and logs (2,027,299 B,below200 MB). Disposable builds,reference snapshots,
emulator copies and working media were removed. Worktree `node_modules`
**13M remains**,as requested. `dist/` is clean. Eighteen requested checkpoint
and diagnostic ATRs remain under `build/play/m3h-session2/`,**2,396,448 B total**;
this final smoke uses `checkpoint-6/`. `df -h /System/Volumes/Data` reports
**392Gi available**. No task-created process or port remains active;other tasks,
worktrees and caches were not modified.
