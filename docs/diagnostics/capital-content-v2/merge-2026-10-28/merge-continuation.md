# Capital content merge continuation — B0, native15 PASS, release/home STOP

2026-10-28; branch `codex/capital-content-v2-merge`, starting/current HEAD `c182af2`. No production change in this continuation. No stage, commit, merge, push or tag.

**STOP:** full-suite merge-only failures are cleared, but home-exit verification failed setup and release refresh reported an unrecorded behavioural/observer clause. No strict release build or qualified play delivery. The existing committed error-path recovery remains; it is not altered here.

## Relocation-aware replacement

Used the symbol-resolved instruction comparison, because all three relocated targets have symbols. The new fixture was extracted from the actual 5053697 sector-reader.bin/.lbl/.map under `build/b2-root-cause/main/build/`; it retains the baseline reader SHA, segment-map line, relevant labels and complete 73-byte error/FIRE sequence. The current sequence boundaries and targets come from current reader labels.

| Target symbol | 5053697 | Current |
| --- | --- | --- |
| failure_reasons | $A54E | $A546 |
| failure_reason_slot | $A50B | $A503 |
| failure_records | $A4F6 | $A4EE |

The test checks each operand against its own build's symbol before normalizing it to the baseline symbol address. It handles failure_records as its split low/high immediates. Sequence length, opcodes and all other bytes stay exact. This replaces the wrong SHA assertion by a defined relocation rule; it does not ignore arbitrary differences or use a behavioural-only fallback. The four error/FIRE behavioural cases remain unchanged and pass.

## Gates

| Gate | Result |
| --- | --- |
| Normal computed build gates | PASS |
| Focused B1/B2 plus error/loader/ROL | **53/53 PASS** |
| Full npm test (one run) | **1615 total: 1478 PASS /134 FAIL /3 SKIP**, exit 1, 1541.028 s |
| Failure-ID comparison against saved 5053697 full run | **A134 / B0 / C0; merge-only gate PASS** |
| Name + first-assertion ledger reconciliation | Exit 1: 1 matched, 133 NEW to ledger, 0 MOVED; these are the same main-debt IDs as baseline |
| Real-SIO boot, embedded in refresh | **7/7 PASS**, frontend worst **1390 <=1402** |
| Boss stress, current full-suite measurements vs saved 5053697 full-suite measurements | **PASS, every reported mode unchanged**, lost-target maximum **8473 <=8500** |
| Native fifteen registered routes | **15/15 PASS**, 58688 iterations; peak **31444 <=31500**, capital **30152**, fence minimum **3298 >=500**, all boss entries **325/350**, zero overruns/misses/extra VBI/DLI/shifted rows/stale L2 |
| Home observer | **INCOMPLETE: 15/27**, 2533614 content and 1007702 boss-owned fetches, zero invalid content fetches in completed routes |
| Eight real exit fixtures | **STOP on first case**, emulator rejects missing ownership images before gameplay |
| Four terminal boss roundtrips | Prepared variants only; **NOT RUN after STOP** |
| Release-evidence refresh | **STOP**, first observed unrecorded clause; trace interrupted, no fresh complete canonical report |
| Strict release build | **NOT RUN after STOP** |
| Play ATR delivery | **NOT DELIVERED after STOP** |

The raw full-suite nonzero result is retained; B0 is not described as a green full suite. A134 assertion values are untouched. Shared IDs do not imply identical messages/locations/values: complete per-side evidence is retained in [the comparison JSON](merge-continuation-comparison.json). [Ledger reconciliation](merge-continuation-reconcile.txt). No failure record or gate was weakened.

Boss off/lost CPU figures: Citadel L4 7697/8112, L5 8032/8447; Spine L7 7771/8186, L9 8025/8440; Bastion L10 8058/8473. These are production NMOS6502 instruction-cycle stress measurements, not DMA/wall figures. Current data came from this fresh full run; baseline data from the previously requested 5053697 full run. No redundant stress re-execution was needed.

## Exact stopping conditions

**Home setup:** `l2-exit-480-quit`, wrapper exit 1 at `scripts/l2-native-exits.mjs:15`; emulator exit 2, first error **“L2 lifetime requires ownership images”**. The native runner generates ownership images in its snapshots, while the exit wrapper uses the original `build/level-1-s1` and `build/l2-capital-960` directories. Their ownership images were not generated. This is a confirmed verification-setup mistake, not an observed gameplay failure. No repair or retry followed STOP.

**Release clause:** `director-complete-0-natural-sweep-fire0`, first assertion `scripts/runtime-wall-trace.mjs:2018`: **“reached the summary from a boss whose core never fell”**. The validator finds engaged boss_state>=1 at frame 3613 (active 3539), but no boss_state>=3 row; its last row is frame5236 /active5137 /boss_state1. Expected: no engaged row, or a core-down row must exist. PAL audit on this same completed route passes: 5236 frames, peak30937, zero missed frames, extra VBI, DLI errors or shifted rows. Whether this is a production issue or scenario/observer/validator limitation is **unattributed**. No production-regression claim or validator correction is made.

The release runner had completed 20 PAL audits when stopped. No final complete, freshly bound runtime report was produced; the canonical report was not re-bound or copied as current. The active task-scoped trace/emulator were terminated (exit143) under STOP. No task native process remains active. Exact logs: [runtime STOP evidence](merge-continuation-runtime-stop.txt); complete metrics/bindings: [gate JSON](merge-continuation-gates.json).

## Every changed assertion — justification

- Error/FIRE comparison: replace raw cross-build SHA with exact normalized instruction comparison, per the explicit owner decision and accepted reader relocation.
- Baseline map-identification assertion: establishes that the extracted 5053697 range is a reader segment before symbol resolution, per that same relocation-aware decision.
- Instruction-length equality: keeps the full original instruction sequence intact under the authorized relocation-aware comparison.
- Baseline target-in-segment checks: require each named reference to be owned by the baseline reader map, per the relocation-aware decision.
- Baseline operand-to-symbol checks: require the captured 5053697 bytes to reference the captured symbol, per the relocation-aware decision.
- Current operand-to-symbol checks: require the current bytes to reference the same named target in the current link, per the relocation-aware decision.
- Normalized byte equality: permits only those verified symbolic relocations, per the relocation-aware decision; other instructions/operands remain exact.
- First-capital-admission state remains0; its assertion message now names accepted increment0's two-frame Heavy-clear guard, and its synthetic fixture supplies the wait.
- Hybrid first-capital-scheduling DUE remains$80; its message now names the authored cut plus accepted increment0's two Heavy-clear frames, and the fixture supplies them.
- T4 Heavy-stream density: the old ten-formation tolerance becomes exact six, following accepted increment0's 120-row pre-capital admission cutoff.
- T4 runway bound: every admission precedes row272−120=152, following that same accepted departure rule.
- EASY played order: R4 B4 R1 B1 R1→R4 B2 R1 B1 R1 follows accepted increment0's early Heavy cutoff.
- EASY formation count: 11→9 follows the same rule, two fewer pre-capital Bomber admissions.
- MEDIUM played order: B4→B2 follows the same accepted departure cutoff.
- MEDIUM formation count: 11→9 follows the same accepted departure cutoff.
- HARD played order: B4→B2 follows the same accepted departure cutoff.
- HARD formation count: 11→9 follows the same accepted departure cutoff.

The other two synthetic callers advance FRAME_COUNTER while retaining every assertion value. All four synthetic-caller tests pass. The 24 phase-fixture changes, host ROL A plus 512-case test, disk-aware INIT/313589-cycle pin and five B1 fixes were already committed in c182af2; their individual accepted-change justifications remain in [the previous audit](error-path-recovery-stop.md#audit-of-expectation-changes-already-made). This continuation's focused and full runs verify that all43 prior merge-only failures are gone. No extra increment2 code is included.

## A — failing on both (134), pre-existing main debt

1. `tests/basic-window-capacity.test.mjs > the window's free tail agrees with the linker map's Light kernel tail`
2. `tests/basic-window-capacity.test.mjs > the window has room for the Director: the free tail stays at 900 B or more`
3. `tests/booster-admission-diagnostic.test.mjs > every third idle-slot qualifying kill creates one deterministic pending capsule`
4. `tests/boot-loading-blank-screen.test.mjs > the blanking costs 9 bytes of the initial block and no sector`
5. `tests/boss-band.test.mjs > the level image still ends before $AC80, where band rows 6-7 and the tables land`
6. `tests/boss-banners.test.mjs > decision AY: each region's banner picture, its packed size and its sectors are the pinned ones`
7. `tests/boss-banners.test.mjs > region 1 (Blockade Breaker): the reads - theme, banner, then the boss's data in today's order - and the main loop`
8. `tests/boss-banners.test.mjs > region 2 (Void Citadel): the reads - theme, banner, then the boss's data in today's order - and the main loop`
9. `tests/boss-banners.test.mjs > region 3 (Siege Spine): the reads - theme, banner, then the boss's data in today's order - and the main loop`
10. `tests/boss-banners.test.mjs > region 4 (Bastion): the reads - theme, banner, then the boss's data in today's order - and the main loop`
11. `tests/boss-lasers.test.mjs > leaving by the win: the lasers off, the column erased, COLPM1 / COLPM2 restored, PRIOR never written`
12. `tests/boss-order-scale.test.mjs > the curve evidence was measured on this data, three replays a cell, every fight finished`
13. `tests/boss-overlay.test.mjs > the window pays the entry's resident half inside the plan's S3 figure, and last`
14. `tests/boss-polish.test.mjs > HULL: a spent quarter is the HUD's blank, as a spent BOOST cell - full, partial and empty hull`
15. `tests/boss-polish.test.mjs > HULL: the respawn's full hull shows four plates again`
16. `tests/boss-polish.test.mjs > HULL: the boss sector's HUD, rebuilt by the install, blanks the spent quarters too`
17. `tests/boss-region-2.test.mjs > region 2 is the Bastion from its own draft: the wide hangar, the bays, the rails, on the built disk`
18. `tests/boss-region-2.test.mjs > the doors: locked until every cannon and rail gun is destroyed or covered; then open, flashing, sounding; the core behind them, last`
19. `tests/boss-region-4.test.mjs > the pull: towards the axis, 2 clocks every 4 frames (G2), only while a spire stands, the fight on and the ship alive`
20. `tests/boss-runtime.test.mjs > the win: the chain, the shake and the flash, then the hand-off to the level summary with the fight's time`
21. `tests/boss-s4b5.test.mjs > slot E's contract, by the source: only draw_hull_row reads the hull maps; only start_gameplay rebuilds them`
22. `tests/broadside-fire.test.mjs > capital/player collision agrees with independently reconstructed final raster Y`
23. `tests/broadside-fire.test.mjs > capital cadence restores the legacy world rate without changing fighter timing`
24. `tests/broadside-fire.test.mjs > assembled 16-bit hull visibility maps states 0-5 and rejects terminal COMPLETE/OPEN`
25. `tests/capital-hull-extension.test.mjs > the final ATR publishes the exact seeded hull layout bytes`
26. `tests/capital-hulls.test.mjs > assembled gameplay display list and DLI switch a dedicated ANTIC 2 HUD`
27. `tests/capital-hulls.test.mjs > assembled ANTIC 2 HUD keeps independent live score, life, and hull fields`
28. `tests/cold-pickup-record-fit.test.mjs > fit preserves the reviewed staging and placement gates`
29. `tests/encounter-director.test.mjs > debris admission follows the sector mask and the capital traversal exception`
30. `tests/encounter-director.test.mjs > scheduler ownership remains single-source and lifecycle-owned`
31. `tests/encounter-director.test.mjs > two PMG Raiders keep separate HP, score once, and preserve the surviving machine`
32. `tests/encounter-director.test.mjs > the shared burst alternates two real Raider origins and skips a destroyed owner`
33. `tests/encounter-director.test.mjs > the hazard mask is the sector's own, while the capital gate stays local`
34. `tests/encounter-director.test.mjs > natural Level 1 reaches a visible two-sided BROADSIDE without state injection`
35. `tests/enemy-combat.test.mjs > release Interceptor enters progressively and naturally reaches burst allocation`
36. `tests/entity-effects.test.mjs > capital debris uses existing 3/4/5 pressure ceilings on EASY, MEDIUM and HARD`
37. `tests/entity-effects.test.mjs > debris damage updates HULL plates in the contact frame and enters canonical death flow`
38. `tests/flagship-sector.test.mjs > assembled sector dictionaries, sequences, and overlays match the source asset`
39. `tests/formats.test.mjs > ATR uses standard single-density geometry`
40. `tests/formats.test.mjs > resident compaction proof survives and Spread Shot leaves at least 64 source-owned bytes`
41. `tests/formats.test.mjs > the code window is declared, guarded and addressable by the build`
42. `tests/frontend.test.mjs > menu PlayerFighter is charset-only, frontend PMG stays disabled, and gameplay setup is restored`
43. `tests/frontend.test.mjs > frontend entry clears stale player and missile graphics latches before DMA resumes`
44. `tests/game-over.test.mjs > GAME OVER leaves the gameplay loop before control, combat, spawn, and scoring`
45. `tests/gameplay-music-placement.test.mjs > STARFIELD is smaller than before the move, and the room is still reserved`
46. `tests/gameplay-music-placement.test.mjs > the ATR START GAME read grows by the planned five plus three plus five sectors and no more`
47. `tests/gameplay-speed-tuning.test.mjs > capital traversal restores the pre-tuning rate while fighter rates stay exact`
48. `tests/gfx-pins.test.mjs > the art outside the boss band: build/capital-hulls.inc is the pinned bytes`
49. `tests/gfx-pins.test.mjs > the art outside the boss band: build/entity-effects.inc is the pinned bytes`
50. `tests/gfx-pins.test.mjs > the boss link's colour, charset and DLI-vector stores: only the pinned routines`
51. `tests/github-showcase.test.mjs > showcase manifest binds every image to the current packed release`
52. `tests/github-showcase.test.mjs > showcase and asset sheets regenerate without ignored capture files`
53. `tests/github-showcase.test.mjs > gameplay GIF is bound to the current ATR and stays within budget`
54. `tests/hud-audit.test.mjs > boss entry: every HUD cell as it was before the WARNING screen (booster: rapid)`
55. `tests/hud-audit.test.mjs > boss entry: every HUD cell as it was before the WARNING screen (booster: spread)`
56. `tests/hud-audit.test.mjs > boss entry: every HUD cell as it was before the WARNING screen (booster: shield)`
57. `tests/hud-audit.test.mjs > boss entry: every HUD cell as it was before the WARNING screen (booster: none)`
58. `tests/hud-audit.test.mjs > the gameplay start after the summary (START GAME): the HUD drawn whole from the state, the booster idle`
59. `tests/hud-bottom.test.mjs > §BL 3: a lance ready keeps the four cells full - through the charge, a miss and the torpedo's flight - and a kill empties them`
60. `tests/hud-status.test.mjs > HUD template keeps full LIFE/HULL labels and four fixed hull plates`
61. `tests/hull-length.test.mjs > T7: a short hull is right-aligned - it ends on row 479, where the prow always ended`
62. `tests/hull-length.test.mjs > T7: the phase machine reads the page - a 352-row hull enters DRAIN at row 488`
63. `tests/hull-length.test.mjs > T7: the resolvers read the page's sequences at $AC08/$AC44`
64. `tests/hull-length.test.mjs > T7: capital entry starts level 2's row clock at row 128, level 1's at row 0`
65. `tests/hybrid-c-arena.test.mjs > HYBRID_C_ARENA is one contiguous 832-B arena at $7BD0-$7F0F`
66. `tests/hybrid-c-arena.test.mjs > the arena lands directly as its own DFMC record and is the only owner of its range`
67. `tests/hybrid-lifecycle.test.mjs > C EnemyArchetype is a compact exact Raider record in legal extension placement`
68. `tests/hybrid-lifecycle.test.mjs > C maps the existing capital corridor phases and complete lifecycle exactly`
69. `tests/hybrid-lifecycle.test.mjs > ownership is singular and generated C requires neither software stack nor runtime helpers`
70. `tests/interceptor-armour.test.mjs > H3 from data: the record's hit points, no armour bit in any wave of any level`
71. `tests/island-edge-contact.test.mjs > exact contact leaves both unfired side lanes clear at every row and phase`
72. `tests/lance.test.mjs > M6 (decision BD 6): the build fails when the window's record grows into the lance's RAM`
73. `tests/level-buffer-16.test.mjs > Q-1: HYBRID_C_WINDOW is $AE00-$BBFF, 3,584 B, and still stops at the reader BSS`
74. `tests/level-buffer-16.test.mjs > Q-1: the window record lands at $AE00 and costs no extra transport`
75. `tests/level-buffer-16.test.mjs > Q-1: level 1 still loads the same image the same way`
76. `tests/level-hull-block.test.mjs > the ATR reads thirteen sectors at START GAME, and the reader still fits`
77. `tests/level-one-equivalence.test.mjs > T4: the capital admits no later than the authored row, and early only once sector 0 is spent`
78. `tests/level-one-equivalence.test.mjs > owner decision 8 / W1: re-authoring the waves left the capital where it was; W1 moved the level's end`
79. `tests/level-one-waves.test.mjs > sector flow: with no kills the swarm's three waves arm and drain, (a) opens within its ceiling, (b)'s Raiders arrive`
80. `tests/level-payload.test.mjs > T13: only the Director's sector entry writes the star operand`
81. `tests/level-summary-build.test.mjs > the overlay directory has eleven entries; the summary code is entry 8 at $0500`
82. `tests/level-summary-build.test.mjs > disk runs never overlap: levels, the capital restore, M5b's reservation, the summary`
83. `tests/level-summary-build.test.mjs > ENGAGING ENEMY SECTOR is one record in the reader, reused by the module; no AI line in either`
84. `tests/level-summary.test.mjs > the summary stays up at least 3 s and FIRE continues only after the level has arrived (Q15)`
85. `tests/level-summary.test.mjs > the art and the restore precede the level, the level is read tail first, the record last of the reads`
86. `tests/level-summary.test.mjs > the second START GAME of a session reads no code and no level`
87. `tests/level-summary.test.mjs > AUD-02: a changed byte in the level image is refused before its music player runs (owner Q3)`
88. `tests/light-interceptor.test.mjs > placement contract: legal composite and packed size, state inside its reserved windows, no C stack`
89. `tests/light-wingman.test.mjs > Light kernel placement is legal, resident and inside every reviewed gate`
90. `tests/master-pal-clock.test.mjs > starfield observes but never owns world and hull accumulator clocks`
91. `tests/menu-raster.test.mjs > native menu raster is exact for the ATR and four cold RAM fills`
92. `tests/offscreen-spawn.test.mjs > Heavy entry reaches the old per-slot anchors before unchanged crossing motion`
93. `tests/overlay-slot.test.mjs > nothing outside the capital group names a label inside slot A`
94. `tests/overlay-slot.test.mjs > the capital restore run on the disk is the resident image of slot A`
95. `tests/package-release.test.mjs > M5-05: the release zip carries LICENSE, LICENSE-ASSETS and THIRD_PARTY_NOTICES.md`
96. `tests/pickup-boost-colour.test.mjs > COLPM3 follows the sector state, once per frame, off the latch that exists`
97. `tests/pickup-pmg-raster-visibility.test.mjs > each booster type carries its own recovered capsule silhouette`
98. `tests/pickup-pmg-raster-visibility.test.mjs > the three silhouettes are visually distinguishable`
99. `tests/pickup-pmg-raster-visibility.test.mjs > the shape table is in plain player bit order, with no fifth-player residue`
100. `tests/player-fire-audio.test.mjs > master PAL gate makes transition-only fire/audio catch-up obsolete`
101. `tests/preview.test.mjs > preview consumes the canonical charset, screen, PMG, and palette source`
102. `tests/preview.test.mjs > Rapid Fire owner preview executes the packed ATR pickup lifecycle`
103. `tests/preview.test.mjs > Spread Shot owner preview is deterministic executed ATR gameplay`
104. `tests/release-gate-semantics.test.mjs > the recorded-failure list is one data file, and every entry carries a class and a measurement`
105. `tests/runtime-timing.test.mjs > measured DMA-on fields come only from an artifact-matched Atari800 trace`
106. `tests/runtime-wall-trace.test.mjs > wall trace is artifact-bound and adds no guest timing work`
107. `tests/runtime-wall-trace.test.mjs > Spread Shot passes PAL wall budget with a legal capsule and projectile-heavy frame`
108. `tests/runtime-wall-trace.test.mjs > debris visual polish preserves foundation history and passes its +256 PAL gate`
109. `tests/runtime-wall-trace.test.mjs > explosion colour flash passes its +64 PAL gate with exact GTIA traces`
110. `tests/runtime-wall-trace.test.mjs > destructible debris passes PAL, inactive-path and linked-code budgets`
111. `tests/runtime-wall-trace.test.mjs > enemy breakup passes the hard PAL gate and draws no character effect`
112. `tests/score.test.mjs > assembled decimal score code carries without inserting partial-game scores`
113. `tests/sector-flow.test.mjs > C1: no hold before a capital - its entry waits for the drain itself`
114. `tests/sio-patch-policy.test.mjs > the committed evidence: real-SIO boot smoke with stage 2 clean, pinned patch-on replays and menu raster`
115. `tests/slot-f.test.mjs > Q9: the HUD draws codes 0-63 only, so the block in codes 64-127 is never shown`
116. `tests/slot-f.test.mjs > Q9: each region's block is its fourth run - on the disk at 696 + 4 x region, folded into the head's check`
117. `tests/torpedo.test.mjs > §BL 5 (§BH): a miss - no target under the ship - the torpedo flies to the band's foot at the ship's column; the lance kept, the reticle back`
118. `tests/weapon-pickup-rapid-fire.test.mjs > three eight-phase source banks hold one tapered 8x16 capsule and the runtime draws a PMG silhouette`
119. `tests/weapon-pickup-rapid-fire.test.mjs > the release ATR executes 0→1→2→pending only for consumed PlayerFighter kills`
120. `tests/weapon-pickup-rapid-fire.test.mjs > pickup pending remains hidden and non-colliding for thirty full frames`
121. `tests/weapon-pickup-rapid-fire.test.mjs > active capsule is one logical PMG object, writes no character cell and cannot be shot`
122. `tests/weapon-pickup-rapid-fire.test.mjs > pickup movement resolves half world speed into smooth scanline phases`
123. `tests/weapon-pickup-rapid-fire.test.mjs > debris and the reserved pickup coexist without allocator overwrite for every A2 head`
124. `tests/weapon-pickup-rapid-fire.test.mjs > pickup collection is single-shot and changes neither score, HULL nor LIFE`
125. `tests/weapon-pickup-rapid-fire.test.mjs > weapon boosters use four proportional ANTIC 2 segments with a timer-derived warning blink`
126. `tests/weapon-pickup-rapid-fire.test.mjs > HULL plates and the ten-cell BOOST field remain distinct at native screen codes`
127. `tests/weapon-pickup-rapid-fire.test.mjs > Rapid Fire lasts 500 active frames and keeps its accepted accelerated burst`
128. `tests/weapon-pickup-rapid-fire.test.mjs > release trace CSV exposes the authoritative counter, state, timing and score`
129. `tests/weapon-pickup-shield.test.mjs > pickup rotation is exactly Rapid Spread Shield Rapid without RNG`
130. `tests/weapon-pickup-shield.test.mjs > Shield HUD uses exact 188 126 63 thresholds and a continuous distinct glyph`
131. `tests/weapon-pickup-spread-shot.test.mjs > Spread Shot owns one phased red fan in the shared six-glyph bank`
132. `tests/weapon-pickup-spread-shot.test.mjs > the release ATR executes the deterministic Rapid Spread Shield drop cycle`
133. `tests/weapon-pickup-spread-shot.test.mjs > Spread collection lasts exactly 500 active PAL frames and pause freezes it`
134. `tests/weapon-pickup-spread-shot.test.mjs > all three projectiles leave the screen cleanly without HUD or charset corruption`

## B — failing only on current merge (0)

None.

## C — failing only on main (0)

None.

## Artifacts, resources, cleanup and next task

Source snapshot: `build/merge-validation-c182af2/`. Raw full test log: `build/merge-validation-c182af2/build/npm-test-merge-continuation.log`, SHA-256 `873d5ce7de855a49c5c1cd041add1af59823629df8a56cb9ed23767aa1eff50a`. Focused log: `build/merge-validation-c182af2/focused.log`. The raw native result, CSVs, ownership images and home captures remain under that snapshot; their hashes and exact paths are in the gate JSON.

Campaign evidence ATR SHA-256: `5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`, under `build/merge-validation-c182af2/dist/void-strike-65.atr`. It is **not a release-qualified play delivery**. No new play images were placed in `build/play/capital-content-v2-merge/`.

CPU and RAM/residency delta of this continuation: **0**; no primary-checkout production files changed. The inherited error recovery was already zero-growth in all segments. Current content612/1920 B; Director high324 B; window2068 B; arena827/832 B; L21290 B (256-B reserve intact); reader1512 B; initial12825 B; boot211 sectors. These are unchanged build figures, not new allocation.

Primary `dist/` ends clean. One initial normal build temporarily regenerated the following three files before validation moved to the snapshot; they were restored immediately. Subsequent normal/variant/native/trace outputs stayed under `build/merge-validation-c182af2/`; no strict-release outputs were installed in primary dist:

- `dist/void-strike-65-boot.bin`
- `dist/void-strike-65-manifest.json`
- `dist/void-strike-65.atr`

The detached baseline worktree was not changed. Island artifacts remain unattributed transient raster artifacts for `visual-bugs-diag`, not a merge blocker. No production acceptance, release readiness or merge approval is implied.

NEXT TASK: correct the exit ownership-image preparation and investigate the first unrecorded core-down clause with ownership-aware boss/summary evidence. Do not attribute it or waive it without evidence. Resume affected gates only after that work; retain the valid native15 evidence while guest bytes stay identical. Strict release build and final play delivery remain pending. STOP.

## Exact owner commit paths and message

No staging or commit performed. These are this continuation’s exact paths; no dist or production file belongs to the checkpoint.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-comparison.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-gates.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-reconcile.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation-runtime-stop.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/merge-continuation.md
tests/capital-content-v2-failure.test.mjs
tests/encounter-director.test.mjs
tests/fixtures/sector-reader-error-5053697.json
tests/hybrid-lifecycle.test.mjs
tests/level-one-equivalence.test.mjs
```

Suggested message: `test: reconcile capital merge expectations and record verification stop`
