# M3 varied endings — OWNER-SMOKE CANDIDATE

Branch `codex/m3-tune`; start463cdbb. Owner smoke rejected463cdbb because
repeating broad zigzags erased shape variety. Accepted tempo/hit-area
checkpoint597e4e5 is the repair baseline. No merge/push/tag/release.

## Narrow repair

Restored both level2 JSON data files from597e4e5, then changed only each
path's first reachable terminal record (and unreachable safety terminals).
Every earlier `{dy,frames,flags}` byte matches597e4e5 on EASY/NORMAL/HARD.
A pinned fixture and focused test enforce that boundary. The library's snake,
arc, shallow-wave, dive-return, tracking-dive and finite-loop remain untouched;
the pilot again uses its original six custom paths rather than six copies
of one zigzag. No new back-loop is introduced.

| Path | Retained body | New ending |
| --- | --- | --- |
| wide-west | approach + two opposing lateral bends | diagonal right/down, finite side retirement |
| wide-east | opposite approach and bends | diagonal left/down, finite side retirement |
| wide-cross | hidden mirrored fan + crossing arc | mirrored upward arc toward opposing sides |
| wide-track | calm approach + tracking | mirrored diagonal upward departure |
| wide-return | dive, lateral flight, upward bend | continue upward toward the side |
| tracking-dive | approach + tracking dive | alternating diagonal down/side departure |

Mirror is restored to its597e4e5 settings except the two tracking paths,
whose exits now alternate. Their retained tracking body ignores the mirror
bit, so this changes only the exit direction. Finite retire flags avoid
indefinite edge-clamped tails. Vertical/lateral step cadence and HP are
unchanged. The first member retains the authored start exactly.

The named chain is again snake → crossing arc → tracking → dive-and-return:
**four distinct shape families; no consecutive duplicate**. Original opening
paths west/east/cross and chain rows0, spacing16, counts24/32, looks, fire
modes and all Heavy definitions are restored. No extra WaveDef. Sector bounds
return to NORMAL896/1280, EASY1280/1792, HARD480/768; no count is cut in either
conservative model or linked admission runs.

## Cheapest authorised admission option

Endings-only data still has brief exact-X coincidences in the linked test.
Implemented the priced admission spread: subtract `slot*4` HPOS, add16 if the
result falls below48. For entries52/124/200 the four starts are respectively
52/48/60/56,124/120/116/112,200/196/192/188. All39 legal four-aligned entry
columns and all four slots are tested. It executes only after a successful
path admission; no-path starts, Heavy/escort/boss behaviour, admission parity,
tracking target and all per-tick path decisions are unchanged.

**MEASURED43 B total**, all in content; **0 B L2/window/new state**.
Content1863→1906/1920,14 B free. Direct linked NMOS comparison with the same
endings-only code before admission spread: **maximum+59 instruction cycles**,
once per frame. The39 columns ×4 slots ×path/no-path cases include edge
wrapping and unchanged no-path admission. No software-stack/zero-page helper
or extra slot scan. [Exact rows and limits](admission-cost.json).

Admission spread separates starts; intentional tracking can still converge
on its common player target, and ordinary crossing/edge pairs can share X.
It does not change that accepted shape into perpetual disorder. The actual
narrow defect is addressed by leaving each body recognisable and replacing
the single-file vertical terminal, not by replacing the body with a zigzag.
Owner smoke must judge the result. This is not a claim of zero same-X frames.

## Admission and visible gaps

All three payloads ×all three menu difficulties ×opening/pilot ×no-fire and
immediate-kill policies admit every24/32 members. Admission remains at the
minimum existing cadence:17 frames between members when a slot is free
(authored16 plus countdown), with capacity waits. Clear/arm handoff gaps are
**2–4 frames**; no extra row delay is authored.

Actual empty-screen gaps at renderer topY24 are distinct from admission gaps:

| Payload | Opening visible gaps | Pilot visible gaps |
| --- | --- | --- |
| EASY |25–26,53,105–106|25–27,49–50,53,105–106|
| NORMAL |13,25–26,65–66|13,25–26,65–66|
| HARD |14–15,33|16,25,34–35|

Hidden entries and the unchanged four-slot clear lock cause these intervals.
No overlap helper was implemented or authorised. [Every linked case](linked-timelines.json)
and [data-only control](data-only-timelines.json) preserve the distinction.

## Native PAL verification (MEASURED)

| Route | Frames | Worst cycles | vs31500 | Margin to32568 | Peak delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Spread NORMAL |1800|30465|-1035|2103|0|
| capital-960 NORMAL |3967|31156|-344|1412|0|
| 4-Light/volley EASY |2200|32224|+724|344|0|
| 4-Light/volley NORMAL |2200|32184|+684|384|0|
| 4-Light/volley HARD |2200|32033|+533|535|0|
| repaired pilot NORMAL |3200|31260|-240|1308|-21|

All six focused reports PASS; zero missed/extra-VBI/physical/deadline/DLI
anomalies. Stress coverage is864 four-Light frames per difficulty, with1/2/1
four-shot rises. The measured stress/pilot ATR hashes equal the delivered
ATRs. Native pilot state gaps between its four groups are exactly**2,3,3
frames**, matching linked C execution; all four groups finish and the next
sector is reached. Visible gaps above are linked host measurements, not
inferred from the native CSV, which does not record Light Y positions.

Worst32224 is report-only above target and344 below the hard gate. **+43 B,
+59 maximum instruction cycles at admission,0 measured quick/stress peak
increase** meet the owner's<=48 B/<=100 cycles/<=32568 gates. The peak
references are the previously committed same-code597e4e5/463cdbb quick and
unchanged diagnostic stress controls; pilot reference31281 is the accepted
tempo checkpoint, not the rejected long-zigzag pilot. No fresh native main
capture, full native matrix, home matrix, boss stress, release trace or strict
release was run. The ordinary full unit suite does include its own boss tests.
Canonical boss-loading transition exclusion is unchanged; no gameplay row
is omitted. [Worst rows, artifact hashes and coverage](native.json).

## Build, tests and audit

Final normal gated build PASS,214 occupied sectors/27392 transport B,
133136-B ATR. Runtime release evidence is still pending and strict release
would fail until separately refreshed. Memory-map generation/check passes;
reserved homes/phase ownership stay fixed, occupied content code grows43 B.
L2/window/arena/Director/extension sizes stay1457/2437/830/324/878 B.
[Before/after resources](resources.json).

One fresh full `npm test` on each revision: main1682 tests,1665 PASS/12 FAIL/
5 SKIP; task1688,1670 PASS/12 FAIL/6 SKIP. One stale content-size expectation
was repaired and the entire affected file passes18/18 with1 optional skip.
Audited task1671 PASS/11 shared FAIL/6 SKIP: **A11/B0/C1**, matched by test
name, file and first assertion/message. C1 is the pre-existing m3-tune repair
of the stale ceiling3 documentation assertion. All11 A tuples match canonical
recorded unit debt. No second full suite. [Raw tuples and focused correction](tests-ab.json).
Raw reconciliation intentionally flags the stale size pin; audited unit
reconciliation has no added/moved failures. Existing32 milestone trace debts
remain recorded and no old evidence was presented as current.

Final focused run**48/48 PASS**, including the optional same-state no-path
comparison with fresh main, all18 body-prefix checks, four-family chain rule,
exhaustive admission bounds/cost and generated memory map. Additional full
Heavy file18 PASS/1 optional SKIP covers the corrected aggregate-size pin.
These sets overlap and are not additive.

Self-resolved audit:

- The rejected test demanding one looping zigzag everywhere was replaced
  with the owner's accepted body-prefix, variety and directional-ending rules.
- Two sector-bound pins and the fan entry expectation return to597e4e5:
  NORMAL896/1280, capital maximum1536 and opposite entries200/48. Complete
  affected files pass, with no relaxed admission, width or Heavy checks.
- `H14 recovery ...` still pinned whole content1863 B. Its expected size now
  includes the explicitly authorised43 B (1906), while every Heavy/window/
  extension/fixed-entry assertion remains unchanged. Full file rerun passes.
- Initial indexed compound assignment made cc65 request software-stack/ZP
  helpers. Rewritten through existing `m3_dy` scratch; the final normal ABI/
  startup/byte gates pass with0 new state and no helper/stack expansion.
- A relative baseline root selected the wrong fixture ATR location; reran
  the full focused set with absolute baseline roots:48/48 PASS.
- Three initial stress captures were rejected: `level-two` focused testing
  rebuilt the shared route directory, so they used an ordinary level2 ATR
  with no four-shot subject. Full tests were allowed to finish; rebuilt the
  diagnostic, checked its delivered SHA, then repeated E/N/H sequentially.
  Only final captures are counted. [Discarded-artifact provenance](discarded-native.json).

## Delivery and next task

All seven bootable ATRs rebuilt under `build/play/m3-tune/`, with [English](README.md)
and [Polish](README.pl.md) checklists, one absolute launch line per ATR and
[SHA-256s](delivery.json). Choose the matching difficulty in OPTIONS; the shared
volley ATR is a diagnostic stress and intentionally retains its old paths.
Rebuild with `node scripts/build-m3-tune-play.mjs`. Run tests/focused fixture
builders before final diagnostic builds and captures, never concurrently.

**OWNER-SMOKE CANDIDATE.** Review restored recognisable bodies, four-family
chain, varied exits and start spread. Tempo/hit-area acceptance is preserved;
new wave design and admission spread are not owner-accepted. No merge, push,
release, tag or further roadmap work. NEXT TASK: owner smoke; STOP.

## Cleanup

`du -sh` task directory before→after: **152M→0B**;
whole worktree `.cache`: **152M→4.0K**.

`df -h /System/Volumes/Data` before:
```text
Filesystem      Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s5   926Gi   572Gi   330Gi    64%    6.0M  3.5G    0%   /System/Volumes/Data
```
After:
```text
Filesystem      Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s5   926Gi   571Gi   330Gi    64%    6.0M  3.5G    0%   /System/Volumes/Data
```

Only this task's cache export/build/dependency symlink/emulator/intermediates
were removed. Worktree node_modules and other task caches remain. Curated
evidence is under1 MB, well below200 MB; no oversized retained cache artifact.
All own test/build/emulator processes exited; no Vite/Worker/Chrome/workerd
or listening port was started. `dist/` is restored to the committed baseline.
[Exact cleanup measurements](cleanup.json).
