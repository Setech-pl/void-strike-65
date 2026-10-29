# Capital merge: complete release-trace comparison at fde1748

Measured 2026-10-29. Branch `codex/capital-content-v2-merge`; baseline detached owner worktree `5053697`. Owner commits. No agent stage, commit, merge, push or tag. Only increments1+0 are in scope. Increment2 remains parked.

Initial diagnostic comparison: **A32 / B3 / C11** assertion identities. **B1=3, B2=0** after focused positive retiming proofs. Production code, collision/damage/render logic, assertion expressions and thresholds are unchanged. Retimed complete rerun: 61/61 gameplay sessions and7/7 boot cases complete; all61 PAL audits pass. Exit1:8 exact recorded per-session A clauses; zero unrecorded per-session clauses. Same shared smooth-capsule aggregate abort; no complete canonical report..

## Measurement method and limits

Both roots ran `npm run build` before measurement. Both ran all **61/61 gameplay sessions to completion**, using identical copied fde1748 harness scripts, inputs and the same fresh Atari800 binary (SHA256 `8c8b871fc89dc3ba233e3d21397edf8669f4923382ecb38ad41dd95a8b9236d1`). Both input catalogues hash to `428532324612e85742b1463d450eb15ae4832466213b86a35956f83713f3bebe`. Neither run had an external first-unrecorded-clause stop. All7 boot cases also completed on both roots using the same original callback predicates; the diagnostic callback collector retained failures instead of aborting at the first. Boot is separate so baseline's existing frontend deadline failure cannot prevent gameplay comparison.

Command in each isolated default-layout root:

```sh
node scripts/runtime-wall-trace.mjs --atari800-source=/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge/build/merge-validation-c182af2/build/atari800-trace --skip-boot-smoke
```

The unchanged harness accumulated per-session failures, then aborted on a shared post-loop capsule invariant (fde1748 source7792). To obtain the remaining diagnostic inventory, a **build-only** exception collector re-analysed the exact saved CSV/JSONL/PNG data. It changed exception handling/publication only, preserving every boolean predicate and threshold. It collected every independent post-loop check, guarded18 dependent metadata groups per side as unavailable, and marked its report **diagnostic-only, gate false**. An unavailable dependent check is not a PASS. Per-session validators retain their original first-failing-assertion short circuit; later assertions inside that failed validator are unassessed. The companion JSON records every such limitation. This is a complete session run and independent aggregate inventory, not a claim that unreachable dependent assertions executed. The [collector patch](full-comparison-fde1748-diagnostic.patch) is archived for review and is not applied to a tracked validator. No diagnostic report is copied to canonical runtime evidence.

Identities are **(session/context, assertion)**, using original fde1748 file/line numbers, with dynamic actual values retained. Thus a changed frame count in the same failed assertion is A, not two unrelated B/C failures. Aggregate contexts name the coverage group when no single session exists. The [JSON](full-comparison-fde1748.json) supplies full messages on both commits, raw locations, artifact and harness hashes, exact boot milestones, failed predicates, first-divergence state vectors and unavailable metadata. [Logs](full-comparison-fde1748-logs.txt) retain the original run output. All A assertions stay unchanged; all32 exact current session/message records are in the debt registry (5 existing,27 added). A ledger entry does not convert an unconditional invariant into a resumable clause or override timing/DLI gates.

Common test-helper copies reproduce the ownership-image hashes of the original runs: current `52cd4c0bc9af330fffbdd192c6553b3548cd5a3e464cc51d077b8afecdb9fb16`, baseline `7556ebd5976a9d2cb8e31d72918a4984be39c5578fbb8f68fdd9b7df557e5459`. The ancillary helper's original source-test symlink did not alter the resulting guest image.

## A — failing on both (32)

1. **director-complete-0-natural-sweep-fire0** — `scripts/runtime-wall-trace.mjs:2018`: director-complete-0-natural-sweep-fire0 reached the summary from a boss whose core never fell

2. **director-complete-1-natural-sweep-fire0** — `scripts/runtime-wall-trace.mjs:2018`: director-complete-1-natural-sweep-fire0 reached the summary from a boss whose core never fell

3. **director-complete-2-natural-sweep-fire0** — `scripts/runtime-wall-trace.mjs:2018`: director-complete-2-natural-sweep-fire0 reached the summary from a boss whose core never fell

4. **director-complete-2-write-protected** — `scripts/runtime-wall-trace.mjs:2018`: director-complete-2-write-protected reached the summary from a boss whose core never fell

5. **weapon-pickup-overlap-2-hunt-fire5** — `scripts/runtime-wall-trace.mjs:6108`: weapon-pickup-overlap-2-hunt-fire5 final raster contains a cut capsule or stale post-collection footprint (COLPM3 $1c in x 56-72: 216, 216, 216, 216, 216, 216, 216, 216, 216, 188, 156, 132, 108, 84, 60, 28, 0, 0, 0, 0, 0, 0)

6. **capital-contact-allied-medium** — `scripts/runtime-wall-trace.mjs:5882`: capital-contact-allied-medium did not capture 16 consecutive contact rasters

7. **lower-playfield-laser-contact-atr-hard** — `scripts/runtime-wall-trace.mjs:2282`: lower-playfield-laser-contact-atr-hard: band frames saw 0 to 2 row switches (one count a region)

8. **lower-playfield-allied-contact-atr-hard** — `scripts/runtime-wall-trace.mjs:5885`: lower-playfield-allied-contact-atr-hard did not enter the capital damage pipeline exactly once

9. **weapon-pickup-sequence-2-hunt-fire3** — `scripts/runtime-wall-trace.mjs:7792`: Expected one complete smooth final-raster capsule sequence in COLPM3 $1c at x 56-72, found 0/11 (largest silhouette 144 px)

10. **weapon-pickup-traversal-2-observe-fire8** — `scripts/runtime-wall-trace.mjs:7858`: Native pickup did not remain one logical slot and one whole 16-row capsule

11. **weapon-pickup-traversal-2-observe-fire8** — `scripts/runtime-wall-trace.mjs:7874`: Native pickup slot was not released cleanly at the lower boundary

12. **lower-playfield-atr-hard** — `scripts/runtime-wall-trace.mjs:7939`: Lower-playfield replay is missing a selected native raster

13. **aggregate/director-completion-evidence** — `scripts/runtime-wall-trace.mjs:8259`: Director completion trace measured 15927 frames and 0/3 level-end summaries Baseline message: Director completion trace measured 16687 frames and 0/3 level-end summaries

14. **director-complete-0-natural-sweep-fire0** — `scripts/runtime-wall-trace.mjs:8333`: director-complete-0-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 3532, entry 3613, engaged 3614, chain undefined, hold undefined, states 1) Baseline message: director-complete-0-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 3692, entry 3785, engaged 3786, chain undefined, hold undefined, states 1)

15. **director-complete-1-natural-sweep-fire0** — `scripts/runtime-wall-trace.mjs:8333`: director-complete-1-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 2913, entry 2981, engaged 2982, chain undefined, hold undefined, states 1) Baseline message: director-complete-1-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 3215, entry 3283, engaged 3284, chain undefined, hold undefined, states 1)

16. **director-complete-2-natural-sweep-fire0** — `scripts/runtime-wall-trace.mjs:8333`: director-complete-2-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 2747, entry 2776, engaged 2777, chain undefined, hold undefined, states 1) Baseline message: director-complete-2-natural-sweep-fire0 did not execute LAST-SECTOR ROW CLOCK -> DRAINED BOSS ENTRY -> FIGHT -> CHAIN -> HOLD (entered 2967, entry 3024, engaged 3025, chain undefined, hold undefined, states 1)

17. **engine-atr-a5-0-immediate** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-a5-0-immediate did not save all 150 consecutive Atari800 screenshots

18. **engine-atr-a5-0-delayed** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-a5-0-delayed did not save all 150 consecutive Atari800 screenshots

19. **engine-atr-a5-1-immediate** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-a5-1-immediate did not save all 150 consecutive Atari800 screenshots

20. **engine-atr-a5-1-delayed** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-a5-1-delayed did not save all 150 consecutive Atari800 screenshots

21. **engine-atr-a5-2-immediate** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-a5-2-immediate did not save all 150 consecutive Atari800 screenshots

22. **engine-atr-a5-2-delayed** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-a5-2-delayed did not save all 150 consecutive Atari800 screenshots

23. **engine-atr-5a-0-immediate** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-5a-0-immediate did not save all 150 consecutive Atari800 screenshots

24. **engine-atr-5a-0-delayed** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-5a-0-delayed did not save all 150 consecutive Atari800 screenshots

25. **engine-atr-5a-1-immediate** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-5a-1-immediate did not save all 150 consecutive Atari800 screenshots

26. **engine-atr-5a-1-delayed** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-5a-1-delayed did not save all 150 consecutive Atari800 screenshots

27. **engine-atr-5a-2-immediate** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-5a-2-immediate did not save all 150 consecutive Atari800 screenshots

28. **engine-atr-5a-2-delayed** — `scripts/runtime-wall-trace.mjs:8418`: engine-atr-5a-2-delayed did not save all 150 consecutive Atari800 screenshots

29. **engine-restart-atr-a5** — `scripts/runtime-wall-trace.mjs:8488`: engine-restart-atr-a5 did not reach a second game after GAME OVER

30. **engine-restart-atr-a5** — `scripts/runtime-wall-trace.mjs:8490`: engine-restart-atr-a5 did not execute 150 frames of the restarted game

31. **aggregate/dli-order** — `scripts/runtime-wall-trace.mjs:8640`: DLI phase/order violations observed: 92

32. **aggregate/booster-rotation** — `scripts/runtime-wall-trace.mjs:8920`: Atari800 granted booster cycle was 3→3→4→5→3→4→4→5→3→4→3→4→3→4→3→4→0→5→3→4→3→4→5→0→3→4, expected a rotation of Rapid/Spread/Shield with no capsule repeating the previous one Baseline message: Atari800 granted booster cycle was 3→3→4→5→3→4→5→0→3→4→3→4→5→3→3→4→3→4→0→3→4→0→5→3, expected a rotation of Rapid/Spread/Shield with no capsule repeating the previous one

## B — current only (3), all B1

1. **capital-contact-hostile-medium** — `scripts/runtime-wall-trace.mjs:5885`: capital-contact-hostile-medium did not enter the capital damage pipeline exactly once

   **First logical divergence:** frame338, sector0 row152; enemy_y baseline123 / current124; enemy_y0 baseline123 / current124. The explicit state vector is in JSON; clocks, relocated addresses and instruction-cost differences are excluded.

   **Mechanism:** Accepted Heavy runway starts at row152: first Y divergence at338 (123→124); Heavy clears431; capital opens608 vs baseline still OPEN at1079. Earlier arrival includes five damage calls in the old1080-frame window. Same correct hostile slot1 contact at762 changes HP10→8, cooldown0→25; second call834. Baseline fails earlier capture assertion, so its later pipeline assertion is unassessed, not passed.

   **Fixture retiming:** frames1080→800; retain all16 contact rasters, full25-frame cooldown, end before second hit834. Focused replay exit0; original contact geometry, HP, cooldown, pipeline-count and raster assertions all pass.

2. **weapon-pickup-2-hunt-fire4** — `scripts/runtime-wall-trace.mjs:8874`: Hard booster raster motion changed X or deviated from +2 scanlines/frame

   **First logical divergence:** frame304, sector0 row152; enemy_y baseline2 / current3; enemy_y0 baseline2 / current3. The explicit state vector is in JSON; clocks, relocated addresses and instruction-cost differences are excluded.

   **Mechanism:** Accepted Heavy runway starts at row152: first Y divergence304 (2→3), Heavy clears337, capital opens547. Boss entry3250 vs3695 brings existing boss-capsule +1 mode into the old4000-frame world-capsule showcase. First offending transition3385→3386. Same +1 mode on baseline in natural HARD completion4679→4680; world/boss movement bodies byte-identical as source.

   **Fixture retiming:** frames4000→3200; retain world-capsule showcase before earlier boss arrival3250. Focused replay exit0; 191 whole ACTIVE capsule rows,188 consecutive transitions, all unchanged X/+2Y, zero boss rows.

3. **flash-2-neutral-nofire** — `scripts/runtime-wall-trace.mjs:9174`: PAL trace did not observe every enemy fighter flash timer value

   **First logical divergence:** frame330, sector0 row152; enemy_y baseline119 / current120; enemy_y0 baseline119 / current120. The explicit state vector is in JSON; clocks, relocated addresses and instruction-cost differences are excluded.

   **Mechanism:** Accepted Heavy runway starts at row152: first Y divergence330 (119→120); Heavy clears472 vs613. Enemy flash422–427 now overlaps player respawn and is excluded by the unchanged ALIVE eligibility filter; baseline eligible enemy flash612–617. All24..19 timer states exist on both commits, with unchanged flash renderer/profile.

   **Fixture retiming:** FIRE preamble delay4000→40 (held FIRE starts41), neutral route and1600-frame capture budget unchanged; historical ID retained. Focused replay exit0; original aggregate predicates observe enemy24..19 at71–76 and later repeats, player24..19 at355–360 and1296–1301, exact COLBK1e/3c/82/80/00/00 and black thereafter.

All three first divergences occur at the accepted **Heavy departure runway**: first sector34 modules minus15 modules = row152. `cc2_enter` caches that row; `cc2_world_row_tick` sets departure; `cc2_heavy_tick` descends without firing; admission waits for the two-frame clear guard. These explain earlier capital/boss admission and the changed fixed-frame replay subjects. This is attribution of the failed predicates to accepted pacing, not a claim that every downstream fixed-frame score/projectile/RNG state remains identical.

The relevant collision compositor, capital HP/cooldown routine, flash renderer/tables, world-capsule update and boss-capsule fall bodies are identical to5053697; source-block hashes and matched-state capsule examples are in JSON. No matched-phase damage, contact or capsule-render regression was found in B. Baseline hostile never reaches its damage-count assertion because its capture assertion fails first; it is not claimed to pass that later assertion.

## C — baseline only (11)

1. **weapon-pickup-contact-2-hunt-fire4** — `scripts/runtime-wall-trace.mjs:6027`: weapon-pickup-contact-2-hunt-fire4 did not collect and activate exactly once, or left the capsule on its plane after collection

2. **capital-contact-hostile-medium** — `scripts/runtime-wall-trace.mjs:5882`: capital-contact-hostile-medium did not capture 16 consecutive contact rasters

3. **aggregate/director-heaviest-frame** — `scripts/runtime-wall-trace.mjs:8590`: The Director's heaviest measured frame does not fit the timing budget: its DMA-on 63126 is over 32568 (early-enemy-atr-0-cold-hunt-fire4 frame 769, 63126 cycles)

4. **boot/atr-a5** — `scripts/runtime-wall-trace.mjs:3350`: atr-a5 reached the main menu at frame 1362, 11 frames over the committed baseline 1351 (fail band +50). If the transport grew on purpose, re-record docs/boot-deadline-baseline.json in the same commit and say why.

5. **boot/atr-5a** — `scripts/runtime-wall-trace.mjs:3350`: atr-5a reached the main menu at frame 1362, 11 frames over the committed baseline 1351 (fail band +50). If the transport grew on purpose, re-record docs/boot-deadline-baseline.json in the same commit and say why.

6. **boot/atr-a5-reset** — `scripts/runtime-wall-trace.mjs:3350`: atr-a5-reset reached the main menu at frame 1362, 11 frames over the committed baseline 1351 (fail band +50). If the transport grew on purpose, re-record docs/boot-deadline-baseline.json in the same commit and say why.

7. **boot/atr-a5-force-restore** — `scripts/runtime-wall-trace.mjs:3350`: atr-a5-force-restore reached the main menu at frame 1362, 11 frames over the committed baseline 1351 (fail band +50). If the transport grew on purpose, re-record docs/boot-deadline-baseline.json in the same commit and say why.

8. **boot/atr-a5-130xe** — `scripts/runtime-wall-trace.mjs:3350`: atr-a5-130xe reached the main menu at frame 1362, 11 frames over the committed baseline 1351 (fail band +50). If the transport grew on purpose, re-record docs/boot-deadline-baseline.json in the same commit and say why.

9. **early-enemy-atr-0-cold-hunt-fire4** — `scripts/pal-timing-audit.mjs:184`: 1 distinct miss event(s)

10. **early-enemy-atr-0-cold-hunt-fire4** — `scripts/pal-timing-audit.mjs:185`: fence margin -1865 < 500 at frame 769

11. **early-enemy-atr-0-cold-hunt-fire4** — `scripts/pal-timing-audit.mjs:189`: DMA-on maximum 63126 > 32568

The five boot messages mention menu1362 versus1351 (+11), but the actual conjunct that fails is frontend1405 >1402; +11 is inside the +50 menu band. Current frontend1390 passes all7. The baseline PAL miss is one event at early-enemy EASY frame769, not three independent frame misses: three PAL assertions and the heaviest-frame aggregate report that same event. Current original61-session PAL audits all pass, peak31444. The separate DLI phase/order aggregate still reports92 on **both**, so these PAL audit results do not certify the complete timing/DLI release gate.

## Allied contact: actual contact and capture window

Both replay budgets are840, frames0–839. Baseline genuine AABB hits: hostile764 (HP10→8), allied770 (HP8 unchanged), hostile835 (HP8→6); **0 captured PNGs**, no correct contact-capture priming. Current genuine AABB hits: hostile730 (10→8), allied737 (8 unchanged), hostile802 (8→6), allied808 (6 unchanged). Current has **13 PNGs,00–12**. The intended allied hits occur during cooldown: baseline770 has20 remaining; current737 has19, and808 has20. They do not satisfy the capture observer’s no-cooldown guard. There is no correct `screenshot_capture_begin` event on either build.

Current's PNG sequence is falsely primed by the laser-PC observer at frame828: `boss_laser_damage=$1DB9` is not resident in this non-boss phase. L2 overlays that address with a CLC in `l2_place_interval`; the observer checks PC without boss residency. Capture00 is previous raster827; captures01–12 are828–839. Captures13–15 would require rasters**840–842**, capture boundaries**841–843**, beyond840. Baseline has no primed window at all. Extending the budget alone would photograph the wrong subject and uncover a later pipeline-count failure. This shared A fixture/observer problem is recorded and left untouched, per owner instruction. It is not misclassified as a new production contact regression.

Focused paired logging probes reproduce the original CSV bytes exactly (baseline `f4774ac2745b341e52ec75ba2d5b25041440efbb25d790f3a5657672f429ca96`, current `83c4f4833d5ceb494e726930405174e04cc44399f337bb0700fad37db18ea893`). Logs and contact frames live under the raw evidence directory below.

## Assertion/fixture audit

No assertion expression or threshold changed. One justification per input change:

- Hostile contact **1080→800 frames**: accepted increment0 Heavy departure runway, Heavy-free window and two-frame clear bring contact to762; 800 preserves16 rasters and25-frame cooldown, ends before second hit834.
- HARD world-capsule showcase **4000→3200 frames**: accepted increment0 pacing advances boss arrival3695→3250; the unchanged +2 world-motion assertion must precede the existing +1 boss-capsule mode. Positive proof:191 whole ACTIVE rows,188 valid transitions.
- Neutral flash **FIRE delay4000→40** (first held FIRE41): accepted increment0 Heavy departure moves the no-fire enemy explosion612–617→422–427 into respawn; retime the FIRE preamble to expose ALIVE enemy flashes, preserving1600 frames, eligibility filters and both exact six-colour profiles. Historical session ID remains stable.

## Release disposition and artifacts

**STOP_RELEASE_EVIDENCE.** The unmodified full harness aborts on the shared smooth-capsule invariant:0/11 complete sequences, largest silhouette144 px (original fde1748 assertion7792). Adding its exact debt record does not change that unconditional throw. No complete canonical report is produced, so strict release build, release-binding checks, evidence refresh and qualified play delivery cannot proceed after this failing gate. No validator change or assertion exception was made. All58 unchanged-input sessions reproduce the original CSV bytes; all3 retimed sessions reproduce their positive focused-proof CSVs. The three B predicates are therefore resolved on fresh full-run data, but later aggregate checks remain unexecuted by the unchanged full harness; this is not a green complete release-trace claim. The initial complete diagnostic inventory also exposes shared DLI maximum92, an independent fatal timing/DLI condition which recording as debt does not waive. Next owner scope decision: batch repair of the shared fixture/observer failures, or narrowly authorized failed-report collection plumbing preserving all predicates; the DLI gate must still be resolved before release.

Guest CPU/RAM/residency delta **0**; no production change. Current normal campaign ATR SHA256 `5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`; baseline `79d1fa59e53ce627008ee6ba3b4d4c0dbeff8776aa572380e7ae0397e5372f9d`. These diagnostic artifacts are not qualified play delivery. Previous unchanged-guest native15/15, home27/27, boot1390<=1402 and boss stress equality remain retained evidence, not rerun claims. Previous full npm test A134/B0/C0 remains; Group A unit tests are untouched.

Original comparison restored all3 tracked dist artifacts on both checkouts: `dist/void-strike-65-boot.bin`, `dist/void-strike-65-manifest.json`, and `dist/void-strike-65.atr`. The complete rerun also restored all3 primary dist artifacts. Final primary dist and the entire baseline worktree are clean; no release-flow dist changes remain. No play ATR was placed under build/play/capital-content-v2-merge/. Owner baseline worktree is retained, not removed. Island artifacts remain unattributed transient raster artifacts for visual-bugs-diag, not a merge blocker.

Raw evidence, runner snapshots, fresh CSV/PNG/JSONL, method hashes, candidate proofs and complete rerun output:

```text
/Users/marcinkrzetowski/Projects/dark-fighter-capital-v2-merge/build/evidence/capital-content-v2/full-comparison-fde1748/
```

The diagnostic collector can be reproduced from `git show fde1748:scripts/runtime-wall-trace.mjs` plus the archived patch in the isolated runner, then `--skip-boot-smoke --reuse-existing-traces` against the saved exact raw set. It is explicitly not a release validator. Boot collector method and original callback hashes are in the JSON.

## Exact owner commit paths and message

No staging or commit performed.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/recorded-gate-failures.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/full-comparison-fde1748.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/full-comparison-fde1748.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/full-comparison-fde1748-logs.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/full-comparison-fde1748-diagnostic.patch
scripts/runtime-wall-trace.mjs
```

Suggested message: `test: compare complete release traces and retime capital merge fixtures`
