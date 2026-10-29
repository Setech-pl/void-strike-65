# Capital content v2 — increments1+0 ready for merge

Owner decision2026-10-29; task checkpoint **8763397**, branch **codex/capital-content-v2-merge**; baseline **5053697**. **Increments1+0 ready for merge.** No production, predicate or assertion change. Owner commits; no stage, commit, merge, push or tag by the agent.

## Baseline confirmation — both failures pre-exist

Reused the existing complete comparison output; **no trace rerun**, no baseline build. Both sides completed61 gameplay sessions and7 boot cases. The unchanged capsule predicate requires exactly1 complete sequence; both report **0/11**, largest silhouette**144 px**. The unchanged DLI predicate requires maximum cumulative counter**0**; both report **92**. Original common-harness assertion identities: runtime-wall-trace.mjs:7792 and:8640. Selected predicate source blocks are exactly identical to current. The capsule failure is in baseline/trace.log; both failures are in baseline/aggregate-result.json, whose diagnostic collection completed. Saved output hashes and collector method are in [the proof JSON](merge-ready-8763397.json). Diagnostic collection changed exception handling only, not predicates or thresholds. These are gate failures on5053697 too; this is not a new production attribution.

Both already had exact records in docs/recorded-gate-failures.json. Updated their notes with this owner decision and the v0.4.0 requirement; **32 records remain, no duplicates added**.

**strict release / release-evidence refresh blocked by pre-existing debt (capsule aggregate0/11, DLI92, and the full recorded A list below); required before v0.4.0.** Under this owner decision strict release is **not a merge gate for this branch**. The existing release validators remain unchanged. The canonical runtime evidence stays stale/pending; no report SHA was edited to clear the normal-build warning.

## Gate summary

| Gate | Result and provenance |
| --- | --- |
| Normal build | Fresh PASS; campaign plus both direct-capital variants |
| Full npm test | Retained **A134/B0/C0**;1615 total,1478 PASS/134 pre-existing main FAIL/3 SKIP; A untouched |
| Native | Retained **15/15**,58,688 iterations, peak31,444; capital30,152; minimum fence3298; all boss entries325/350; zero misses/VBI/DLI/shifted/stale |
| Home observer | Retained **27/27**:15 routes+8 exits+R1–R4; zero invalid executions; terminal roundtrips are seeded fixtures |
| Boot | Retained **7/7**, frontend**1390 <=1402** |
| Boss stress | All modes **equal5053697**, lost-target maximum8473 |
| Release trace merge comparison | Owner accepted **A32/B3/C11**, all3 B1 retimed, **B2=0**; rerun61 sessions,8 session failures equal recorded A debt;61 PAL audits pass |
| Strict release / evidence refresh | Pre-existing main debt; required beforev0.4.0; deferred by owner |

No expensive gates were rerun in this delivery. Each freshly built play ATR is **byte-identical** to the corresponding artifact in the retained native15 evidence, including the campaign artifact used by boot/home checks. The gate summary is retained evidence, not a new full-suite or native-run claim. Previous full evidence and limitations: [merge gates](merge-continuation-gates.json), [home27](verification-100db9a.json), [complete trace comparison](full-comparison-fde1748.md).

## Play delivery and SHA-256

All three are normal play builds for the owner. Keep the disk mounted for menu returns. The direct routes enter level1's capital sector; difficulty is selectable in OPTIONS. Campaign uses the normal campaign entry.

| Play ATR — absolute clickable path | SHA-256 |
| --- | --- |
| [campaign.atr](/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge/build/play/capital-content-v2-merge/campaign.atr) | `5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676` |
| [capital-480.atr](/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge/build/play/capital-content-v2-merge/capital-480.atr) | `875aa84347ad13300a12a70acb06fadfba55d6615e341dd2ca18ff4449837a58` |
| [capital-960.atr](/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge/build/play/capital-content-v2-merge/capital-960.atr) | `8dc9a23b8e1e1602254c48c51b473e52da51f845a6974a866726ca0305e7e7ef` |

All files are133,136 B. Checksum file: `/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge/build/play/capital-content-v2-merge/SHA256SUMS`.

Build commands, run at the merge worktree:

```sh
npm run build
npm run build -- --level=1:sector=1
npm run build -- --level=1:sector=1 --l2-long-capital
```

Campaign output was copied from dist/;480 from build/level-1-s1/;960 from build/l2-capital-960/. Generated ATRs were copied, never edited. Each passed the existing normal build and exactly matched its native-bound SHA. [Build logs](merge-ready-8763397-builds.txt). Archived BIN/manifest/ATR sets and original dist backup: `build/evidence/capital-content-v2/merge-ready-8763397/`. Native guest bytes and resource use are unchanged: CPU delta0, RAM/residency delta0 B; total transport211 sectors.

## Recorded debt list — release trace A32

These remain pre-existing, unclassified release debts. The two exact blocking aggregate records are included. The messages below are the registry's current exact messages; dynamic baseline values at the same assertion can differ for the other A entries, as detailed in the accepted full comparison. Unit A134 is separate unchanged main debt; its full ID list remains in [the unit comparison](merge-continuation-comparison.json).

| # | Session/context | Recorded first assertion/message |
| --- | --- | --- |
| 1 | `director-complete-0-natural-sweep-fire0` | director-complete-0-natural-sweep-fire0 reached the summary from a boss whose core never fell |
| 2 | `director-complete-1-natural-sweep-fire0` | director-complete-1-natural-sweep-fire0 reached the summary from a boss whose core never fell |
| 3 | `director-complete-2-natural-sweep-fire0` | director-complete-2-natural-sweep-fire0 reached the summary from a boss whose core never fell |
| 4 | `director-complete-2-write-protected` | director-complete-2-write-protected reached the summary from a boss whose core never fell |
| 5 | `weapon-pickup-overlap-2-hunt-fire5` | weapon-pickup-overlap-2-hunt-fire5 final raster contains a cut capsule or stale post-collection footprint (COLPM3 $1c in x 56-72: 216, 216, 216, 216, 216, 216, 216, 216, 216, 188, 156, 132, 108, 84, 60, 28, 0, 0, 0, 0, 0, 0) |
| 6 | `capital-contact-allied-medium` | capital-contact-allied-medium did not capture 16 consecutive contact rasters |
| 7 | `lower-playfield-laser-contact-atr-hard` | lower-playfield-laser-contact-atr-hard: band frames saw 0 to 2 row switches (one count a region) |
| 8 | `lower-playfield-allied-contact-atr-hard` | lower-playfield-allied-contact-atr-hard did not enter the capital damage pipeline exactly once |
| 9 | `weapon-pickup-sequence-2-hunt-fire3` | Expected one complete smooth final-raster capsule sequence in COLPM3 $1c at x 56-72, found 0/11 (largest silhouette 144 px) |
| 10 | `weapon-pickup-traversal-2-observe-fire8` | Native pickup did not remain one logical slot and one whole 16-row capsule |
| 11 | `weapon-pickup-traversal-2-observe-fire8` | Native pickup slot was not released cleanly at the lower boundary |
| 12 | `lower-playfield-atr-hard` | Lower-playfield replay is missing a selected native raster |
| 13 | `aggregate/director-completion-evidence` | Director completion trace measured 15927 frames and 0/3 level-end summaries |
| 14 | `director-complete-0-natural-sweep-fire0` | director-complete-0-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 3532, entry 3613, engaged 3614, chain undefined, hold undefined, states 1) |
| 15 | `director-complete-1-natural-sweep-fire0` | director-complete-1-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 2913, entry 2981, engaged 2982, chain undefined, hold undefined, states 1) |
| 16 | `director-complete-2-natural-sweep-fire0` | director-complete-2-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 2747, entry 2776, engaged 2777, chain undefined, hold undefined, states 1) |
| 17 | `engine-atr-a5-0-immediate` | engine-atr-a5-0-immediate did not save all 150 consecutive Atari800 screenshots |
| 18 | `engine-atr-a5-0-delayed` | engine-atr-a5-0-delayed did not save all 150 consecutive Atari800 screenshots |
| 19 | `engine-atr-a5-1-immediate` | engine-atr-a5-1-immediate did not save all 150 consecutive Atari800 screenshots |
| 20 | `engine-atr-a5-1-delayed` | engine-atr-a5-1-delayed did not save all 150 consecutive Atari800 screenshots |
| 21 | `engine-atr-a5-2-immediate` | engine-atr-a5-2-immediate did not save all 150 consecutive Atari800 screenshots |
| 22 | `engine-atr-a5-2-delayed` | engine-atr-a5-2-delayed did not save all 150 consecutive Atari800 screenshots |
| 23 | `engine-atr-5a-0-immediate` | engine-atr-5a-0-immediate did not save all 150 consecutive Atari800 screenshots |
| 24 | `engine-atr-5a-0-delayed` | engine-atr-5a-0-delayed did not save all 150 consecutive Atari800 screenshots |
| 25 | `engine-atr-5a-1-immediate` | engine-atr-5a-1-immediate did not save all 150 consecutive Atari800 screenshots |
| 26 | `engine-atr-5a-1-delayed` | engine-atr-5a-1-delayed did not save all 150 consecutive Atari800 screenshots |
| 27 | `engine-atr-5a-2-immediate` | engine-atr-5a-2-immediate did not save all 150 consecutive Atari800 screenshots |
| 28 | `engine-atr-5a-2-delayed` | engine-atr-5a-2-delayed did not save all 150 consecutive Atari800 screenshots |
| 29 | `engine-restart-atr-a5` | engine-restart-atr-a5 did not reach a second game after GAME OVER |
| 30 | `engine-restart-atr-a5` | engine-restart-atr-a5 did not execute 150 frames of the restarted game |
| 31 | `aggregate/dli-order` | DLI phase/order violations observed: 92 |
| 32 | `aggregate/booster-rotation` | Atari800 granted booster cycle was 3→3→4→5→3→4→4→5→3→4→3→4→3→4→3→4→0→5→3→4→3→4→5→0→3→4, expected a rotation of Rapid/Spread/Shield with no capsule repeating the previous one |

## Scope and final state

Increment2 remains **PARKED at bfda36b** on codex/capital-content-v2 and is excluded. Island artifacts remain **unattributed transient raster artifacts** for visual-bugs-diag, not a merge blocker. No automatic next implementation task.

Both dist/ directories are clean. The normal campaign build temporarily regenerated, then restored byte-for-byte:

- dist/void-strike-65-boot.bin
- dist/void-strike-65-manifest.json
- dist/void-strike-65.atr

Variants wrote only to their build/ directories. Baseline was read only and its entire worktree remains clean. Canonical release evidence and validators were not changed. **NEXT TASK: owner commit and merge of increments1+0; complete the deferred strict release / release-evidence refresh beforev0.4.0, addressing its pre-existing blockers.** No merge/push/tag is authorized or performed in this session.

## Exact owner commit paths and message

Play ATRs, SHA256SUMS and raw build evidence remain under ignored build/ and are not Git paths. No staging or commit performed.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/recorded-gate-failures.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-ready-8763397.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-ready-8763397.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-ready-8763397-builds.txt
```

Suggested message: `docs: mark capital increments 1+0 merge-ready and record play delivery`
