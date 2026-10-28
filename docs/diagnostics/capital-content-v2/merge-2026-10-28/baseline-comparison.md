# Capital content 1+0 — baseline failure audit (2026-10-28)

**STOP: B2 is nonempty.** No expectations, production code, failure ledgers or gates changed. No commit, merge, push or tag.

Baseline detached worktree: `~/Projects/dark-fighter-baseline-5053697`, HEAD `5053697`. Merge run: code HEAD `434871e`; current docs checkpoint `392a042`, branch `codex/capital-content-v2-merge`. Identity is repository-relative file + full test name; line numbers are assertion evidence, not identity. The original full merge run is reused unchanged.

| Run | Tests | Pass | Fail | Skip | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Main 5053697 | 1604 | 1467 | 134 | 3 | 923.799 s |
| Merge 434871e | 1609 | 1429 | 177 | 3 | 951.453 s |

**A 134; B 43 (B1 5, B2 38); C 0.** Both commands exited 1. Baseline normal computed gates passed, with stale release-evidence warning. Baseline reconciliation: 1 matched, 133 NEW to ledger, 0 MOVED, exit 1; NEW does not mean new to this branch.

## Evidence and cleanup

Command in baseline: `set -o pipefail; npm test 2>&1 | tee build/npm-test-baseline-comparison.log`. Reconciliation: `npm run failures:reconcile -- --tests build/npm-test-baseline-comparison.log --trace docs/runtime-wall-trace.json`.

Raw baseline log: `build/evidence/capital-content-v2/baseline-comparison-2026-10-28/npm-test-baseline-comparison.log`; original merge log: `build/npm-test.log`. SHA-256 baseline `c73950c089e2404f923de5d6ccb2e606b1f0dba34d1dda48118ed8f7774b7917`, merge `2715c681a23de882200fc6d79a63d9ec1a902151b7abbdadbe572f5f85b4eda1`. [Machine-readable sets, assertions and values](baseline-comparison.json); [baseline reconciliation](baseline-failures-reconcile.txt).

The baseline arrived with three modified generated dist files. Their pre-run bytes were preserved under `build/evidence/capital-content-v2/baseline-comparison-2026-10-28/preexisting-baseline-dist/`. After testing, those three tracked files were restored to 5053697; baseline git status is clean. No baseline commit or source edit.

## A — failing on both (134): pre-existing main debt, tests untouched

These are shared failure IDs, not a claim of identical symptoms. 130/134 have the same first assertion location and message; 4 moved. 108/134 have identical serialized actual/expected values; 26 differ. All A tests and expectations remain unchanged. Full per-side evidence is in JSON.

1. `tests/basic-window-capacity.test.mjs > the window's free tail agrees with the linker map's Light kernel tail` — values differ
2. `tests/basic-window-capacity.test.mjs > the window has room for the Director: the free tail stays at 900 B or more` — values differ
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
34. `tests/encounter-director.test.mjs > natural Level 1 reaches a visible two-sided BROADSIDE without state injection` — **first assertion moved**
35. `tests/enemy-combat.test.mjs > release Interceptor enters progressively and naturally reaches burst allocation` — values differ
36. `tests/entity-effects.test.mjs > capital debris uses existing 3/4/5 pressure ceilings on EASY, MEDIUM and HARD`
37. `tests/entity-effects.test.mjs > debris damage updates HULL plates in the contact frame and enters canonical death flow`
38. `tests/flagship-sector.test.mjs > assembled sector dictionaries, sequences, and overlays match the source asset`
39. `tests/formats.test.mjs > ATR uses standard single-density geometry`
40. `tests/formats.test.mjs > resident compaction proof survives and Spread Shot leaves at least 64 source-owned bytes`
41. `tests/formats.test.mjs > the code window is declared, guarded and addressable by the build` — values differ
42. `tests/frontend.test.mjs > menu PlayerFighter is charset-only, frontend PMG stays disabled, and gameplay setup is restored`
43. `tests/frontend.test.mjs > frontend entry clears stale player and missile graphics latches before DMA resumes`
44. `tests/game-over.test.mjs > GAME OVER leaves the gameplay loop before control, combat, spawn, and scoring`
45. `tests/gameplay-music-placement.test.mjs > STARFIELD is smaller than before the move, and the room is still reserved`
46. `tests/gameplay-music-placement.test.mjs > the ATR START GAME read grows by the planned five plus three plus five sectors and no more`
47. `tests/gameplay-speed-tuning.test.mjs > capital traversal restores the pre-tuning rate while fighter rates stay exact`
48. `tests/gfx-pins.test.mjs > the art outside the boss band: build/capital-hulls.inc is the pinned bytes`
49. `tests/gfx-pins.test.mjs > the art outside the boss band: build/entity-effects.inc is the pinned bytes`
50. `tests/gfx-pins.test.mjs > the boss link's colour, charset and DLI-vector stores: only the pinned routines`
51. `tests/github-showcase.test.mjs > showcase manifest binds every image to the current packed release` — values differ
52. `tests/github-showcase.test.mjs > showcase and asset sheets regenerate without ignored capture files`
53. `tests/github-showcase.test.mjs > gameplay GIF is bound to the current ATR and stays within budget` — values differ
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
64. `tests/hull-length.test.mjs > T7: capital entry starts level 2's row clock at row 128, level 1's at row 0` — **first assertion moved**
65. `tests/hybrid-c-arena.test.mjs > HYBRID_C_ARENA is one contiguous 832-B arena at $7BD0-$7F0F`
66. `tests/hybrid-c-arena.test.mjs > the arena lands directly as its own DFMC record and is the only owner of its range` — values differ
67. `tests/hybrid-lifecycle.test.mjs > C EnemyArchetype is a compact exact Raider record in legal extension placement`
68. `tests/hybrid-lifecycle.test.mjs > C maps the existing capital corridor phases and complete lifecycle exactly`
69. `tests/hybrid-lifecycle.test.mjs > ownership is singular and generated C requires neither software stack nor runtime helpers` — values differ
70. `tests/interceptor-armour.test.mjs > H3 from data: the record's hit points, no armour bit in any wave of any level`
71. `tests/island-edge-contact.test.mjs > exact contact leaves both unfired side lanes clear at every row and phase`
72. `tests/lance.test.mjs > M6 (decision BD 6): the build fails when the window's record grows into the lance's RAM` — values differ
73. `tests/level-buffer-16.test.mjs > Q-1: HYBRID_C_WINDOW is $AE00-$BBFF, 3,584 B, and still stops at the reader BSS` — values differ
74. `tests/level-buffer-16.test.mjs > Q-1: the window record lands at $AE00 and costs no extra transport` — values differ
75. `tests/level-buffer-16.test.mjs > Q-1: level 1 still loads the same image the same way`
76. `tests/level-hull-block.test.mjs > the ATR reads thirteen sectors at START GAME, and the reader still fits`
77. `tests/level-one-equivalence.test.mjs > T4: the capital admits no later than the authored row, and early only once sector 0 is spent` — **first assertion moved**
78. `tests/level-one-equivalence.test.mjs > owner decision 8 / W1: re-authoring the waves left the capital where it was; W1 moved the level's end` — values differ
79. `tests/level-one-waves.test.mjs > sector flow: with no kills the swarm's three waves arm and drain, (a) opens within its ceiling, (b)'s Raiders arrive` — **first assertion moved**
80. `tests/level-payload.test.mjs > T13: only the Director's sector entry writes the star operand`
81. `tests/level-summary-build.test.mjs > the overlay directory has eleven entries; the summary code is entry 8 at $0500` — values differ
82. `tests/level-summary-build.test.mjs > disk runs never overlap: levels, the capital restore, M5b's reservation, the summary`
83. `tests/level-summary-build.test.mjs > ENGAGING ENEMY SECTOR is one record in the reader, reused by the module; no AI line in either` — values differ
84. `tests/level-summary.test.mjs > the summary stays up at least 3 s and FIRE continues only after the level has arrived (Q15)`
85. `tests/level-summary.test.mjs > the art and the restore precede the level, the level is read tail first, the record last of the reads` — values differ
86. `tests/level-summary.test.mjs > the second START GAME of a session reads no code and no level` — values differ
87. `tests/level-summary.test.mjs > AUD-02: a changed byte in the level image is refused before its music player runs (owner Q3)`
88. `tests/light-interceptor.test.mjs > placement contract: legal composite and packed size, state inside its reserved windows, no C stack`
89. `tests/light-wingman.test.mjs > Light kernel placement is legal, resident and inside every reviewed gate`
90. `tests/master-pal-clock.test.mjs > starfield observes but never owns world and hull accumulator clocks`
91. `tests/menu-raster.test.mjs > native menu raster is exact for the ATR and four cold RAM fills` — values differ
92. `tests/offscreen-spawn.test.mjs > Heavy entry reaches the old per-slot anchors before unchanged crossing motion`
93. `tests/overlay-slot.test.mjs > nothing outside the capital group names a label inside slot A`
94. `tests/overlay-slot.test.mjs > the capital restore run on the disk is the resident image of slot A` — values differ
95. `tests/package-release.test.mjs > M5-05: the release zip carries LICENSE, LICENSE-ASSETS and THIRD_PARTY_NOTICES.md`
96. `tests/pickup-boost-colour.test.mjs > COLPM3 follows the sector state, once per frame, off the latch that exists`
97. `tests/pickup-pmg-raster-visibility.test.mjs > each booster type carries its own recovered capsule silhouette`
98. `tests/pickup-pmg-raster-visibility.test.mjs > the three silhouettes are visually distinguishable`
99. `tests/pickup-pmg-raster-visibility.test.mjs > the shape table is in plain player bit order, with no fifth-player residue`
100. `tests/player-fire-audio.test.mjs > master PAL gate makes transition-only fire/audio catch-up obsolete`
101. `tests/preview.test.mjs > preview consumes the canonical charset, screen, PMG, and palette source`
102. `tests/preview.test.mjs > Rapid Fire owner preview executes the packed ATR pickup lifecycle`
103. `tests/preview.test.mjs > Spread Shot owner preview is deterministic executed ATR gameplay`
104. `tests/release-gate-semantics.test.mjs > the recorded-failure list is one data file, and every entry carries a class and a measurement` — values differ
105. `tests/runtime-timing.test.mjs > measured DMA-on fields come only from an artifact-matched Atari800 trace`
106. `tests/runtime-wall-trace.test.mjs > wall trace is artifact-bound and adds no guest timing work` — values differ
107. `tests/runtime-wall-trace.test.mjs > Spread Shot passes PAL wall budget with a legal capsule and projectile-heavy frame`
108. `tests/runtime-wall-trace.test.mjs > debris visual polish preserves foundation history and passes its +256 PAL gate`
109. `tests/runtime-wall-trace.test.mjs > explosion colour flash passes its +64 PAL gate with exact GTIA traces`
110. `tests/runtime-wall-trace.test.mjs > destructible debris passes PAL, inactive-path and linked-code budgets`
111. `tests/runtime-wall-trace.test.mjs > enemy breakup passes the hard PAL gate and draws no character effect`
112. `tests/score.test.mjs > assembled decimal score code carries without inserting partial-game scores`
113. `tests/sector-flow.test.mjs > C1: no hold before a capital - its entry waits for the drain itself`
114. `tests/sio-patch-policy.test.mjs > the committed evidence: real-SIO boot smoke with stage 2 clean, pinned patch-on replays and menu raster` — values differ
115. `tests/slot-f.test.mjs > Q9: the HUD draws codes 0-63 only, so the block in codes 64-127 is never shown`
116. `tests/slot-f.test.mjs > Q9: each region's block is its fourth run - on the disk at 696 + 4 x region, folded into the head's check` — values differ
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

### Shared IDs whose first assertion moved

- `tests/encounter-director.test.mjs > natural Level 1 reaches a visible two-sided BROADSIDE without state injection`: main `tests/encounter-director.test.mjs:999` (difficulty 0 capital debris admissions); merge `tests/encounter-director.test.mjs:985` (difficulty 0 capital must be due on level 1's authored row).
- `tests/hull-length.test.mjs > T7: capital entry starts level 2's row clock at row 128, level 1's at row 0`: main `tests/hull-length.test.mjs:177` (level 1: the row clock starts at 0); merge `tests/hull-length.test.mjs:175` (level 1: the capital is admitted on its authored row).
- `tests/level-one-equivalence.test.mjs > T4: the capital admits no later than the authored row, and early only once sector 0 is spent`: main `tests/level-one-equivalence.test.mjs:71` (the MEASURED early capital row); merge `tests/level-one-equivalence.test.mjs:66` (the MEDIUM replay reaches the capital inside 700 frames).
- `tests/level-one-waves.test.mjs > sector flow: with no kills the swarm's three waves arm and drain, (a) opens within its ceiling, (b)'s Raiders arrive`: main `tests/level-one-waves.test.mjs:223` (difficulty 0: (b)'s Raiders never arrived with no kills); merge `tests/level-one-waves.test.mjs:208` (difficulty 0: the swarm did not end).

## B — failing only on merge (43): every classification

### B1 — B1

`tests/boss-claim.test.mjs > no segment of any link reaches $0C00-$1FFF except the boss's own homes; only slot D's reach $1900-$1FFF`

Assertion: `tests/boss-claim.test.mjs:99`; content-module.map: CONTENT_HEADER $001180-$001180 reaches the boss's $0C00-$1FFF

Actual: `false`; expected: `true`; operator: `==`.

Accepted content home $1180–$18FF is phase-exclusive with boss/death images; CONTENT_HEADER at $1180 is now allowed in that phase, while the old boss-only allowlist excludes it.

### B2 — B1

`tests/boss-claim.test.mjs > no cfg memory area reaches the claim except boss.cfg's slot C, scratch and slot D`

Assertion: `tests/boss-claim.test.mjs:123`; cfg/encounter-director.cfg: CONTENT_RAM reaches the boss's $0C00-$1FFF

Actual: `false`; expected: `true`; operator: `==`.

Accepted content home $1180–$18FF reserves CONTENT_RAM in encounter-director.cfg; the old cfg allowlist excludes that intentional reservation.

### B3 — B1

`tests/cfg-overlaps.test.mjs > every overlap between two cfg memory areas is declared on purpose and named`

Assertion: `tests/cfg-overlaps.test.mjs:22`; undeclared cfg overlaps

Actual: `[ 'BOSS_BANNER_RAM (boss.cfg) and CONTENT_RAM (encounter-director.cfg) share $1180-$14FF', 'BOSS_SLOT_C_RAM (boss.cfg) and CONTENT_RAM (encounter-director.cfg) share $1180-$17FF', 'CODE (boss-death.cfg) and CONTENT_RAM (encounter-director.cfg) share $1180-$18FF', 'CONTENT_RAM (encounter-director.cfg) and BOSS_SCRATCH_RAM (boss.cfg) share $1800-$18FF' ]`; expected: `[]`; operator: `deepStrictEqual`.

Accepted content home $1180–$18FF intentionally overlaps BOSS_BANNER_RAM, BOSS_SLOT_C_RAM, boss-death CODE and BOSS_SCRATCH_RAM in mutually exclusive phases.

### B4 — B2

`tests/encounter-director.test.mjs > T3: the row tick advances the sector index from a poked core page and arms its first wave`

Assertion: `tests/encounter-director.test.mjs:233`; 16 rows end a 16-row sector

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B5 — B2

`tests/encounter-director.test.mjs > T11: a level completes at the end of its LAST authored sector, whatever their number`

Assertion: `tests/encounter-director.test.mjs:258`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B6 — B2

`tests/encounter-director.test.mjs > director init and world rows are deterministic and do not touch game RNG`

Assertion: `tests/encounter-director.test.mjs:319`; Expected values to be strictly equal:

Actual: `0`; expected: `3712`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B7 — B2

`tests/encounter-director.test.mjs > world-row glue is inactive in DYING/GAME OVER and advances exactly once when active`

Assertion: `tests/encounter-director.test.mjs:346`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B8 — B2

`tests/encounter-director.test.mjs > admission accounts intensity, enforces budget and fails soft`

Assertion: `tests/encounter-director.test.mjs:359`; Expected values to be strictly equal:

Actual: `false`; expected: `true`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B9 — B2

`tests/encounter-director.test.mjs > the level completes exactly once at the end of its last sector and closes admissions`

Assertion: `tests/encounter-director.test.mjs:448`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B10 — B2

`tests/encounter-director.test.mjs > focused production replay exposes three early qualified kills and one natural pickup`

Assertion: `tests/encounter-director.test.mjs:576`; difficulty 0 first visible undefined

Actual: `false`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B11 — B2

`tests/encounter-director.test.mjs > ordinary admission is slot-safe, RNG-stable and pre-sector compatible`

Assertion: `tests/encounter-director.test.mjs:607`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B12 — B2

`tests/encounter-director.test.mjs > first capital admission is due on the authored ROW and retries until the playfield drains`

Assertion: `tests/encounter-director.test.mjs:833`; the first legal attempt admits on the authored row

Actual: `7`; expected: `0`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B13 — B2

`tests/encounter-director.test.mjs > the capital encounter is entered once and no later row interrupts it`

Assertion: `tests/encounter-director.test.mjs:881`; and the Director waits in the capital sector for it

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B14 — B2

`tests/encounter-director.test.mjs > natural capital exit performs one scene recycle on every world row`

Assertion: `tests/encounter-director.test.mjs:1066`; natural capital DRAIN did not reach COMPLETE

Actual: `false`; expected: `true`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B15 — B1

`tests/heavy-bomber.test.mjs > placement contract: H9 spawn is in the Director window and the Bomber tick stays in the arena`

Assertion: `tests/heavy-bomber.test.mjs:560`; The expression evaluated to a falsy value:

Actual: `false`; expected: `true`; operator: `==`.

Accepted Heavy departure rule routes _enemy_c_heavy_tick through the loaded/GAMEPLAY guard at $9DC6; its original Bomber body remains in the arena at $7DCB as _enemy_c_heavy_tick_original. The assertion pins the old public-entry placement rather than that retained body.

### B16 — B2

`tests/heavy-package.test.mjs > M3-H assault: opposite descent parity, unchanged pursuit, exact planes and bounded standing cost`

Assertion: `tests/heavy-package.test.mjs:28`; Heavy request admitted

Actual: `0`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B17 — B2

`tests/heavy-package.test.mjs > M3-H HP, flash hue, and spawn delta on every difficulty`

Assertion: `tests/heavy-package.test.mjs:28`; Heavy request admitted

Actual: `0`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B18 — B2

`tests/heavy-package.test.mjs > M3-H armoured authored hold and surviving-hit dodge retain Y and the stop`

Assertion: `tests/heavy-package.test.mjs:28`; Heavy request admitted

Actual: `0`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B19 — B2

`tests/heavy-package.test.mjs > M3-H Bomber flying hit dodges, authored stop survives hit, and flash stays in hue C`

Assertion: `tests/heavy-package.test.mjs:28`; Heavy request admitted

Actual: `0`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B20 — B1

`tests/heavy-package.test.mjs > M3-H placement: appended H2, thirteen BSS bytes and unchanged protected capacities`

Assertion: `tests/heavy-package.test.mjs:111`; Expected values to be strictly equal:

Actual: `3`; expected: `5`; operator: `strictEqual`.

Accepted Director shrink of 310 B (634→324) reduces DFMC record 11 from 5 to 3 sectors, contributing to boot transport 213→211. The same test also contains the subsequently stale L2 pin 1250 B; accepted L2 +40 B gives 1290 B.

### B21 — B2

`tests/heavy-package.test.mjs > M3-H shared wave arm leaves Heavy metadata untouched on Light/boss escort paths`

Assertion: `tests/heavy-package.test.mjs:134`; Heavy request admitted

Actual: `0`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B22 — B2

`tests/hybrid-lifecycle.test.mjs > first-capital scheduling and future boss handoff stay high-level C decisions`

Assertion: `tests/hybrid-lifecycle.test.mjs:199`; row 272 enters the CAPITAL sector and raises DUE

Actual: `0`; expected: `128`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B23 — B2

`tests/hybrid-lifecycle.test.mjs > T6: a sector whose mask excludes an archetype never spawns it, and the validator agrees`

Assertion: `tests/hybrid-lifecycle.test.mjs:397`; the Raider wave spent one of its four formations

Actual: `4`; expected: `3`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B24 — B2

`tests/l2-lifetime.test.mjs > L2 lifetime: complete boss main-loop bodies use installed images until real START GAME checked reload`

Assertion: `tests/l2-lifetime.test.mjs:55`; routine $1900 did not return

Actual: `4000000`; expected: `4000000`; operator: `notStrictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B25 — B2

`tests/level-one-equivalence.test.mjs > T4: the Heavy stream keeps the cadence and the density it had before the level was data`

Assertion: `tests/level-one-equivalence.test.mjs:81`; 0 Heavy formations in 700 frames against the pre-change 10

Actual: `false`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B26 — B2

`tests/level-one-equivalence.test.mjs > owner decision 8: EASY plays the alternating order, at the density it had`

Assertion: `tests/level-one-equivalence.test.mjs:198`; Expected values to be strictly equal:

Actual: `''`; expected: `'R4 B4 R1 B1 R1'`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B27 — B2

`tests/level-one-equivalence.test.mjs > owner decision 8: MEDIUM plays the alternating order, at the density it had`

Assertion: `tests/level-one-equivalence.test.mjs:198`; Expected values to be strictly equal:

Actual: `''`; expected: `'R4 B4 R1 B1 R1'`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B28 — B2

`tests/level-one-equivalence.test.mjs > owner decision 8: HARD plays the alternating order, at the density it had`

Assertion: `tests/level-one-equivalence.test.mjs:198`; Expected values to be strictly equal:

Actual: `''`; expected: `'R4 B4 R1 B1 R1'`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B29 — B2

`tests/level-one-waves.test.mjs > W2: on every difficulty each post-capital wave arms; the swarm holds several Lights, (a) its Interceptor`

Assertion: `tests/level-one-waves.test.mjs:161`; difficulty 0: the level never reached the boss

Actual: `null`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B30 — B2

`tests/level-payload.test.mjs > T13: the star pixel changes at sector entry and only there`

Assertion: `tests/level-payload.test.mjs:399`; row 1

Actual: `16`; expected: `32`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B31 — B2

`tests/level-two.test.mjs > step 3: the Director reads level 2 - six sectors, the capital on row 1,120, three Lights in a swarm sector, complete after sector 6`

Assertion: `tests/level-two.test.mjs:132`; EASY: every sector entered once, in order

Actual: `[ 0 ]`; expected: `[ 0, 1, 2, 3, 4, 5 ]`; operator: `deepStrictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B32 — B2

`tests/plasma-fx.test.mjs > the growth glyph codes were displayed by nothing on the gameplay screen`

Assertion: `tests/plasma-fx.test.mjs:251`; the drive reached sector 0, not the boss entry

Actual: `false`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B33 — B2

`tests/sector-flow.test.mjs > early end: a sector whose waves are spent ends on the first row tick with the field clear`

Assertion: `tests/sector-flow.test.mjs:122`; the sector ends on the first row tick after its last formation

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B34 — B2

`tests/sector-flow.test.mjs > early end: never with a formation pending, the Light lock up, or an escort Light live`

Assertion: `tests/sector-flow.test.mjs:141`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B35 — B2

`tests/sector-flow.test.mjs > early end: a Light wave's sector ends once the wave is spent and its last Light is gone`

Assertion: `tests/sector-flow.test.mjs:152`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B36 — B2

`tests/sector-flow.test.mjs > early end: a sector with no waves still lasts its rows, and the row count is still the cut`

Assertion: `tests/sector-flow.test.mjs:160`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B37 — B2

`tests/sector-flow.test.mjs > afterCleared: the wave arms on its row only once the field is clear; the row is a minimum`

Assertion: `tests/sector-flow.test.mjs:183`; armed on the first row tick after the field clears

Actual: `1`; expected: `2`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B38 — B2

`tests/sector-flow.test.mjs > afterCleared: a wave without the flag arms on its row under a live formation, as before`

Assertion: `tests/sector-flow.test.mjs:201`; armed on row 8 with the Raider pair still live

Actual: `1`; expected: `2`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B39 — B2

`tests/sector-flow.test.mjs > C1: a live Heavy formation holds an elite sector's end before a swarm, and lets go when it has gone`

Assertion: `tests/sector-flow.test.mjs:217`; released on the first row tick after it has gone

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B40 — B2

`tests/sector-flow.test.mjs > C1: two swarm Lights hold the end before an elite sector; one is within its ceiling`

Assertion: `tests/sector-flow.test.mjs:227`; the cut cancels the members not yet admitted

Actual: `1`; expected: `0`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B41 — B2

`tests/sector-flow.test.mjs > C1: no hold where the next sector admits the population (elite after elite)`

Assertion: `tests/sector-flow.test.mjs:241`; a pair and one Light are legal in an elite sector

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B42 — B2

`tests/sector-flow.test.mjs > C1: the last sector's cut still completes the level`

Assertion: `tests/sector-flow.test.mjs:256`; Expected values to be strictly equal:

Actual: `0`; expected: `1`; operator: `strictEqual`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

### B43 — B2

`tests/sector-flow.test.mjs > level 1: the time to the boss falls on every difficulty`

Assertion: `tests/sector-flow.test.mjs:266`; difficulty 0: the level never reached the boss

Actual: `null`; expected: `true`; operator: `==`.

Observed behaviour is not an accepted numeric/placement expectation change. Do not replace this expectation with the failing value. Fixture setup versus runtime causality is unresolved.

For the L2 lifetime failure, actual and expected both serialize as 4,000,000 because the operator is `notStrictEqual`: the call exhausted its four-million-step limit instead of returning. This is not an equality expectation to re-pin.

## C — failing only on main (0)

None.

## Action and remaining gates

B2 is nonempty: STOP under the owner’s Step 3. No B1 edits were made either. Ordinary sector progression and Heavy admission disappearing are not covered by the accepted departure runway/tail change. The guarded content entries reject invalid/non-GAMEPLAY calls, and existing host fixtures need investigation at that boundary; no production-regression attribution or fixture correction is claimed here. The L2 INIT timeout also needs investigation.

Release-evidence refresh/build, fresh native 15/15, home observer 27/27, boot frontend ≤1,402, boss-stress A/B and final play delivery were not run. Existing ATRs remain historical evidence, not a newly qualified play delivery. CPU and RAM/residency delta of this task: 0 (documentation only).

Island artifacts remain **unattributed transient raster artifacts** for `visual-bugs-diag`: not reproduced in sampled RAM on any commit and not a merge blocker.

NEXT TASK: resolve the 38 B2 failures without lowering their behavioural expectations, then resume the explicitly remaining merge gates. Owner commits.
