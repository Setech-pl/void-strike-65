# Recorded failures review — 2026-10

Branch `fix/recorded-failures-review`, cut from `main` `9694ca9` on 2026-10-01.
Phase A of the task: every recorded `npm test` failure and every recorded trace
clause failure is classified here, with evidence. Nothing in `src/`, `cfg/`,
the build scripts, the wall-trace harness, `dist/` or `docs/media/` was
changed.

**Phase B is done: §10.** The owner approved the actions of §7 on 2026-10-01,
with decisions on B12, B15, D1 and C1. The recorded test set is now 5
(`npm test` 873 / 868 / 5 / 0) and lives in
[../recorded-test-failures.json](../recorded-test-failures.json).

## 1. Result

**No recorded failure hides a defect a player meets in normal play, other than
the one already known** (the one-frame debris blink on the player's death
frame, §6 C1). No second SPREAD-livelock was found.

**What the 105 failing tests are:**

| Class | Tests | What it means |
| --- | ---: | --- |
| **A** — stale pin | **33** | An exact value or source identifier moved. With it re-pinned in a probe, every other assertion of the test ran and passed, for all 33. |
| **B** — obsolete | **41** | The thing the test checks was deliberately changed or removed. Needs a rewrite or a retirement; the owner approves each group. |
| **C** — real defect | **1** | A development tool, not the game (§6 C2). |
| **D** — harness or environment | **30** | The test's own fixture, a stale evidence file, or a tool on the machine. 24 were probed to pass after a test-side fix and 1 more needs one further re-pin; 4 wait for a regeneration task; 1 needs a port or a retirement. |
| **E** — unresolved | **0** | |

The 3 `todo` tests: two are obsolete (B), one waits for a defect that does not
reproduce (D). None of the three can turn green as written (§5.3).

**What the 16 recorded clause failures are** (§5):

| Trace class | Clauses | |
| --- | ---: | --- |
| (a) stale scenario | **3** | the three contact-raster sessions |
| (b) observer or clause error | **13** | 12 engine first-DLI clauses, 1 booster-release clause |
| (c) runtime defect a player would see | **0** | |

`docs/recorded-gate-failures.json` labels the booster-release clause
`c-real-failure`; the measurement in §5.1 says it is not a defect. The file is
not changed in this task.

**If every action in §7 is approved**, the recorded test set falls from 105 to
**5** (4 that need a regeneration task, 1 tool defect) and the 3 `todo` tests
to 0.

## 2. Step 0 and baseline

| | Value | Source |
| --- | --- | --- |
| `main` at Step 0 | `9694ca9 docs: boot-loading-blank-screen, an owner-smoke candidate` | `git log -1` |
| worktrees | the primary checkout only | `git worktree list` |
| `docs/plans/boot-loading-blank-screen.md` on `main` | present | |
| ATR SHA-256 | `af2e47b62c315ddf9ed05cab44842d8921bcb8c561b9cc2dcf103f1b1e8b31b7` | `dist/`, equals STATUS:353 |
| boot SHA-256 | `06d2f25665a17c0858c92245f257d6d339858149a5ed4679919d120d6eb4d80a` | `dist/`, equals STATUS:354 |
| `npm test`, default build | **891 tests / 783 pass / 105 fail / 3 todo**, 751 s | this session's run; equals STATUS:373 |
| recorded clause failures | **16**, equal to the evidence by session and message | `docs/recorded-gate-failures.json` against `docs/runtime-wall-trace.json` `gate.behavioural_clause_failures` |
| worst fence margin | 785 (`director-complete-2` f5815) | STATUS:359 (the trace JSON has no fence field) |
| DMA-on maximum / headroom | 31,121 / 4,447 | `docs/runtime-wall-trace.json` `semantics`, STATUS:360 |
| initial block content | 13,621 B (STOP line 13,652) | `build/manifest.json`, STATUS:367 |

The first attempt at Step 0 stopped: `main` was `55cc361` and did not contain
the blank-screen merge. The owner merged; the second attempt passed.

**Differences from the brief:**

1. **There is no recorded test-failure list file.** The names live in three
   places that must be combined: Appendix A of
   [../plans/hull-set-v1.md](../plans/hull-set-v1.md) (109 names), the 11
   ATR-only renames below it, and the removals recorded in STATUS (the
   showcase test gone at `c04156a`, three Spread tests re-pinned on
   2026-10-01). Combined they give 105 names. This run's 105 failing names
   equal that set: **0 extra, 0 missing**. §7.5 proposes one file.
2. Everything else in the brief's baseline matches the repository.

**How the evidence was produced.** One full run of the two `npm test`
commands (`node scripts/build.mjs --quiet`, then `node --test
tests/*.test.mjs`) with the spec, TAP and JUnit reporters added. Each failing
test was read, its cause traced to a source line or a commit, and where a
re-pin or a fixture fix was proposed it was applied as a temporary edit and
the test re-run. All temporary edits were reverted before this file was
committed; the working tree is clean and both artifact hashes are unchanged.
The harness and environment class was run three more times: the failure sets
are identical each time, so **no failing test is flaky**. Clause failures were
classified from the committed evidence and from the session CSVs the
2026-10-01 evidence run left in `build/runtime-wall-trace/` (same ATR hash);
no new trace run was needed.

## 3. Root causes

Most failures share a few causes. The group id is in the table of §4.

| Group | Cause | Decided or merged by | Tests |
| --- | --- | --- | --- |
| **G1** | The weapon capsule is a `PLAYER3` PMG object, not characters. No glyph codes, no four-cell backing, no character compositor, no moving frame fence. A PENDING capsule is frozen across a capital sector, not cleared. | `f6eee5c` (2026-09-11); `plans/pickup-colour.md` §7; `game-design.md` "Weapon pickups" | 1, 6, 19, 20, 24, 48, 49, 52, 58, 74, 75, 79, 81-85, 93, 95, 98, 101, 103, 104 |
| **G2** | The legacy pickup harness (`scripts/weapon-pickup-runtime.mjs` `initialiseRuntime`) never gets a capsule admitted: it does not place the Director's C records, leaves `CAPITAL_SECTOR_STATE` uninitialised and pokes Director state with pre-4.6 meanings. The capsule stays PENDING at Y 8. | hybrid C Director; roadmap 4.6 step 2 | 51, 58, 76-81, 86, 87, 94, 96, 97, 102, 105 |
| **G3** | The same harness fires a Spread "volley" with `PLAYER_FIGHTER_BURST_REMAINING` unset, which is the centre follow-up alone. The same stale scenario that hid the SPREAD livelock. | `db64ca8` (2026-09-16); `plans/spread-volley-fix.md` §5 | 60, 92, 106, 107, 108 |
| **G4** | The shot pool is 5 player + 5 hostile slots, and a hostile shot's `ACTIVE` byte carries its weapon class in bits 3-7. Fixtures use slot 10 and kind 2. | PairShot foundation `66b90c5`; `8a09e57`, `35f2b90` | 25, 64, 91, 99 |
| **G5** | Burst counts are 4 / 5 / 2 PairShots (Normal / Rapid / Spread), not 8 / 10 / 8 shots. | `assets/graphics/fighter-weapons.json`; `66b90c5`, `db64ca8` | 31, 59, 87, 88, 100 |
| **G6** | A Spread volley allocates its two side shots first and the centre last, and is followed by one centre shot. | owner decisions 2026-09-16 and 2026-09-30 | 50, 59, 88, 89, 107, 108 |
| **G7** | Gun stations are 10 / 15 / 20 per hull, not 8 / 12 / 16. | `16969d8` (2026-09-08); `plans/director-4.6.md` §11 item 18 | 7, 9, 10, 11, 12 |
| **G8** | The playfield is 28 rows (29 with the HUD), bottom at scanline 240. | `effe71c` (2026-09-02) | 14, 54, 55, 62, 63 |
| **G9** | Colours: both Raiders `$44`; allied steel `$88`; capsule gold `$1C`. | `10f1be2`; owner decision 2 (`3caceca`); `plans/pickup-colour.md` | 8, 14, 54, 65 |
| **G10** | The kill score is `ENEMY_PROFILE_SCORE_BCD`, published by the C admission path; `add_archetype_score` is an equate for `add_archetype_score_tail`. Fixtures read a table and a label that no longer exist. | hybrid C lifecycle; `scripts/runtime-image.mjs` `publishEnemyProfileScore` | 17, 27, 28, 29, 68-71 |
| **G11** | Enemy damage and lifecycle are C; the frame-600 first-capital scheduler and the Director phases are retired. | AGENTS.md C/ASM ownership; `plans/director-4.6.md` §8 row 2 | 30, 38, 39, 40 |
| **G12** | Capital hull set v2 replaced the H4.2 C INDUSTRIAL glyphs and JSON schema. | `884c446`, `c28d00d` (2026-09-22) | 3, 16, 32 |
| **G13** | Layout and transport values moved (11 records, 107 boot sectors, 13,621 B, arena 718 B, …). | the accepted placement work since 4.5M | 19-21, 33, 41-44, 61, 72, 73 |
| **G14** | Three test files re-assemble `src/main.s` with a `ca65` found on `PATH` and only `-I build`; `heavy-member.s` lives in `src/hybrid/`. | `scripts/build.mjs` maps the include itself | 18, 37-40, 73 |
| **G15** | Stale committed evidence or artefacts: `docs/menu-raster-trace.json` (2026-09-20, XEX sessions, an old ATR hash), the showcase captures (XEX-era), the JS cycle model in `scripts/runtime-cycles.mjs` (still 17 shots). | ATR-only switch; PairShot | 35, 45, 46, 67 |
| **G16** | Evidence semantics: `gate.passed` is false while a failure is recorded; frame pins give way to relations; character break-up fragments are retired; debris kills score. | owner decision 2026-09-21; diagnostics `stage-2b2b-raider-*`; STATUS "Debris reward" | 56, 57, 64, 66 |
| **G17** | The starfield was redesigned; screen code 1 is the dynamic near-star point, which a shell erase restores as space on purpose. | `41d136f`, `9658ab5` (2026-09-13/14) | 4, 5, 15, 34 |
| **G18** | Naming and public text: "Raider" is the documented Heavy archetype; the README was rewritten in English and Polish. | `game-design.md`; `b2a1710`, owner decision V | 2, 36, 53 |

## 4. The 105 failing tests and the 3 todo tests

Line numbers are the first failing assertion. "Assertions that never ran" says
what the first failure was hiding, and in brackets what the probe showed about
it. Class and action are explained in §1 and §7.

| # | Test (`tests/…test.mjs:line`) | Protects | First failing assertion: expected — actual | Assertions that never ran | Class | Action |
| ---: | --- | --- | --- | --- | :---: | :---: |
| 1 | `booster-admission-diagnostic:106` — pickup admission coexists with slot-0 debris and publishes the 16-row PMG | capsule admission beside slot-0 debris, and its publication | 16 non-zero rows at `$3B00+lo` (missile page) — actual 15 (residue; nothing is published there) | yes: HPOSM, SIZEM, PRIOR=$10 | **B** G1 | B1 |
| 2 | `branding:100` — tracked names and searchable tracked content contain no retired vocabulary | no retired franchise vocabulary in the repository | `git ls-files` must not match `…/raider/…` — 15 tracked names contain `raider` | yes: the `git grep` half | **B** G18 | B13 |
| 3 | `broadside-antic2-prototype:110` — ANTIC 2 palette is genuinely monochrome while PMG remains source-derived | the rejected ANTIC 2 monochrome hull spike stays source-derived | 168 B at glyph 59.. equal the prototype glyph bytes — glyph indices are 59-75, 77-80 now | yes: screen codes < $80 (fails once re-pinned), PMG variants | **B** G12 | B11 |
| 4 | `broadside-fire:761` — assembled isolated BROADSIDE slot is one connected object across a 100-frame lifecycle observation | a BROADSIDE shell erases to the exact backing | ring row restored byte-exactly — cell 16 is 0, fixture expects 1 | yes: PREV/collision latches, flight length, source order | **D** G17 | D5 |
| 5 | `broadside-fire:843` — assembled BROADSIDE overlap unwinds 0->2 draw with 2->0 erase for every slot pair | overlapping shells unwind draw/erase in reverse order | ring row restored byte-exactly — cell 16 is 0, fixture expects 1 | yes: stacking, separation, third slot untouched | **D** G17 | D5 |
| 6 | `broadside-fire:1234` — muzzle remapping leaves the single late booster compositor unchanged | muzzle remapping does not touch the single late capsule publication | `jmp render_weapon_pickup_overlay` ×1 — 0 (label retired) | yes: 2 source checks (pass) | **A** G1 | A1 |
| 7 | `broadside-fire:1511` — provisional PAL scheduler remains deterministic over denser 8/12/16 layouts | the PAL broadside scheduler is deterministic over the station layout | station count 8/12/16 — 10/15/20 | yes: warning/launch stats, determinism (pass) | **A** G7 | A2 |
| 8 | `broadside-fire:2320` — sequence preview uses runtime PMG colours, source muzzles, and deterministic integer geometry | the fire-sequence preview uses the runtime PMG colours | COLPM1-3 `[$44,$46,$28]` — `[$44,$44,$28]` | no (last assertion) | **A** G9 | A3 |
| 9 | `broadside-fire:2443` — cadence preview plots source-derived warning, launch, and world-scroll timing | the cadence preview plots the simulated warning/launch timing | baseline warnings/launches `[9,9]` — `[17,17]` | yes: final stats, PNG determinism (pass after re-pin) | **A** G7 | A4 |
| 10 | `capital-hull-extension:56` — EASY/MEDIUM/HARD expose exact legal 8/12/16 stations on each hull | legal gun stations per hull and difficulty | station count 8 — 10 (easy) | yes: spacing, max gap, muzzle cells (pass) | **A** G7 | A2 |
| 11 | `capital-hull-extension:79` — owner layouts are independent rather than identical, shifted, or strictly alternating | allied and enemy station layouts look independent | ≤ 2 rows shared by both hulls — 5 / 8 / 9 (easy/medium/hard) | yes: 'not strictly alternating' (passes) | **B** G7 | B12 |
| 12 | `capital-hull-extension:151` — unchanged cadence consumes no more launches than the denser station layout | the cadence never launches more than the stations exist | warnings ≤ 8 (easy) — 9, with 10 stations | yes: launches = warnings, no cancellations (pass) | **A** G7 | A2 |
| 13 | `capital-hull-extension:184` — runtime owns a 16-bit hull row and preserves divider/ring muzzle invariants | the runtime keeps a 16-bit hull row and the muzzle backing invariants | source: `CORRIDOR_BOUNDARY_LEFT` after `restore_active_muzzles:` — every use now precedes the label | yes: 3 source checks (pass) | **A** | A5 |
| 14 | `capital-hulls:201` — assembled gameplay display list and DLI switch a dedicated ANTIC 2 HUD | gameplay display list, dedicated HUD charset and DLI CHBASE switches | 24 display rows — 29 | yes: HUD glyphs, register sets, DLI bytes (pass; one more pin `$84`→`$88`) | **A** G8 | A6 |
| 15 | `capital-hulls:661` — runtime map reservation and payload remain bounded and do not consume PMG or DLI | hull map reservation stays bounded; star generator touches no PMG/DLI | source slice `generate_near_star_row`..`choose_star_column` — empty (labels retired) | yes: 3 source checks (1 more obsolete, 2 pass) | **B** G17 | B9 |
| 16 | `capital-hulls:671` — loader remains unchanged and the accepted H3.1 menu preview is source-derived | loader and menu previews are frozen and source-derived | sha256 of the loader preview `83a8b4f7…` — `b4762b6a…` | yes: menu hash (also changed), preview sizes, hull-variant checks (H4 schema: TypeError) | **B** G12 | B11 |
| 17 | `capital-hulls:698` — joystick, FIRE, projectile, enemy, and scoring routines remain connected | input, fire, enemy and scoring routines stay connected | source: `add_archetype_score:…adc enemy_scores,x` — routine is `add_archetype_score_tail`, operand `ENEMY_PROFILE_SCORE_BCD` | yes: 3 source checks (pass) | **A** G10 | A7 |
| 18 | `capital-traversal-timing:135` — assembled Hunter plus capital heavy frame recovers the PAL working ceiling | a past optimisation recovered the PAL working ceiling on the heaviest frame | heaviest row `[1455,1432,31997]` of an uncommitted trace CSV — `[77,78,30331]` | yes: frame content, private re-assembly, cycle recovery | **B** G14/G15 | B10 |
| 19 | `cold-pickup-record-fit:30` — cold pickup record excludes the source-only character phase bank | the cold pickup record ships no character phase bank | `pickup-code-runtime.bin` 871 B — 944 B | yes: sizes, record = code‖collision (now a 65-B gap), 'mask in pickup code' (false), contract checks (pass) | **B** G1/G13 | B3 |
| 20 | `cold-pickup-record-fit:55` — PMG runtime remains legal after retiring the rejected central primitive | the PMG capsule runtime is placed legally | `__LIGHT_RESIDENT_RUN__` = `$8776` — label gone | yes: sizes, `$8B67` fit, source patterns (render via HPOSM/PRIOR obsolete) | **B** G1/G13 | B3 |
| 21 | `cold-pickup-record-fit:87` — fit preserves the reviewed staging and placement gates | staging and placement of the pickup record | `finalRuntimeAddress` `$8800` — `$8776` | yes: 7 more layout values, 2 inequality gates (pass) | **A** G13 | A8 |
| 22 | `debris-visibility-gate:39` — the debris is published between the Light erase and the Light render | debris is published between the Light erase and the Light render | source pattern: `sta LIGHT_SCREEN_HI,x` directly before `@erase_next:` — `sta LIGHT_SCREEN_SLOT_LIMIT` sits between | yes: published once; window order (pass) | **A** | A9 |
| 23 | `effects-stagger:60` — PairShot and generic-effect backing resolvers stay below the local fix ceiling | effect backing resolvers stay under the local ceiling | peak 1,032 cycles — 1,071 | yes: delta pin 210 (249), gate `< 300` (passes) | **A** | A10 |
| 24 | `encounter-director:523` — BOSS_HANDOFF maps every capital state once and leaves final COMPLETE terminal | LEVEL COMPLETE maps every capital state and is terminal | PENDING capsule cleared at completion — stays PENDING (frozen) | yes: booster untouched, Director state untouched, DRAIN sequence | **B** G1 | B2 |
| 25 | `encounter-director:725` — the shared burst alternates two real Raider origins and skips a destroyed owner | the Raider pair burst alternates two origins and survives an emitter's death | shot kinds `[2,3]` — `[10,11]` (weapon class in bits 3-7) | yes: origins, cursor, survival, round robin (pass) | **A** G4 | A11 |
| 26 | `enemy-roster:278` — PMG ownership preserves one P1/P2 enemy while fighter bursts use playfield glyphs | PMG ownership of the enemy players | source: `sta HPOSP1` then `sta HPOSP2` — `sta HPOSP1,x` (one Heavy per player) | yes: 5 checks (pass) | **B** | B8 |
| 27 | `entity-effects:266` — Interceptor contact result is exact after an ATR cold boot | a player/Interceptor contact gives the exact result after an ATR cold boot | run aborts: opcode `$80` at `$8D67` (C routine not placed by the fixture) | yes: the whole result snapshot (passes) | **D** G10 | D3 |
| 28 | `entity-effects:1559` — Raider lifecycle and score remain canonical without scheduling a character effect | a contact kill keeps lifecycle, score and no character effect | score `$10` — 0 (profile byte never published by the fixture) | no (single assertion) | **D** G10 | D3 |
| 29 | `entity-effects:2142` — every canonical Raider death avoids character effects without changing score policy | every Raider death source scores correctly and schedules no character effect | score low byte `$52` — `$42` | yes: PMG page, kill snapshot, later frames (pass) | **D** G10 | D3 |
| 30 | `explosion-colour-flash:83` — PlayerFighter death wins same-frame arbitration and enemy flashes cannot restart forever | player death wins the flash arbitration; enemy flashes cannot restart | source: ASM lifecycle in `resolve_enemy_damage` — the logic is the C routine behind `HYBRID_ENEMY_APPLY_PENDING_DAMAGE` | yes: 2 source checks (pass); the arbitration asserts before it pass | **B** G11 | B6 |
| 31 | `fighter-weapons:435` — assembled burst controllers use accepted counts, intervals, speeds and damage | burst counts, intervals, speeds and damage | `spreadShotBurstCount` 4 — 2 | yes: 3 source checks (1 identifier stale, 2 pass) | **A** G5 | A12 |
| 32 | `flagship-sector:357` — H4.2 C INDUSTRIAL preserves its structural and immutable data contracts | the H4.2 C INDUSTRIAL hull art contract | glyph `allied_plate_mass` — does not exist (hull set v2) | yes: the whole art audit | **B** G12 | B11 |
| 33 | `formats:117` — resident compaction proof survives and Spread Shot leaves at least 64 source-owned bytes | boot staging layout and lifetimes | `[$5318,$5318,$5DB6,$5E10,0,90]` — `[$5331,$5318,$5DEA,$5E10,−25,38]` | yes: starfield lifecycle pin, boot order pattern, range checks | **A** G13 | A13 |
| 34 | `gameplay-music:125` — 600-frame ON/OFF watchdog advances frame, world, stars, and spawn scheduling | gameplay scheduling is independent of the music option | model snapshot `nearSteps 300, farSteps 150, attempts 54, spawns 2` — `600, (gone), 58, 12` | yes: music-off writes, ON = OFF snapshot (pass) | **A** G17 | A14 |
| 35 | `github-showcase:67` — showcase manifest binds every image to the current packed release | the showcase manifest binds every image to the current release | Spread frame 2,537 (evidence) — 3,351 (manifest: an XEX-era capture) | no (last assertion) | **D** G15 | D8 |
| 36 | `github-showcase:125` — public README is English, complete, and free of stale status language | the public README is complete and current | heading `## Current gameplay` — README restructured | yes: ~20 content checks | **B** G18 | B14 |
| 37 | `hunter-projectile-lifetime:45` — assembled Hunter shots remain independent through capital traversal and ring wrap | released hostile shots are independent of their emitter | `ca65` (from PATH): cannot open include `heavy-member.s` | yes: everything | **D** G14 | D6 |
| 38 | `hunter-projectile-lifetime:45` — capital due drains the final legal Hunter pulse before admission | capital admission waits for the last legal pulse (frame 600 schedule) | `ca65` (from PATH): cannot open include `heavy-member.s` | yes: everything; then pins the retired frame-600 scheduler | **B** G14/G11 | B5 |
| 39 | `hunter-projectile-lifetime:45` — a live Hunter leaves naturally and gives capital admission a finite bound | a live Hunter bounds the capital admission (≤ 286 frames) | `ca65` (from PATH): cannot open include `heavy-member.s` | yes: everything; then pins the retired frame-600 scheduler | **B** G14/G11 | B5 |
| 40 | `hunter-projectile-lifetime:45` — ordinary waves stay closed through reconstruction and resume without catch-up | ordinary waves stay closed through the capital sector | `ca65` (from PATH): cannot open include `heavy-member.s` | yes: everything; then pins Director phases | **B** G14/G11 | B5 |
| 41 | `hybrid-c-arena:61` — HYBRID_C_ARENA is one contiguous 832-B arena at $7BD0-$7F0F | `HYBRID_C_ARENA` is one contiguous 832-B arena | `[asm,code,rodata]` `[71,504,39]` — `[90,589,39]` | yes: free bytes (218 → 114), anchor, asserts in source (pass) | **A** G13 | A15 |
| 42 | `hybrid-c-arena:91` — the arena lands directly as its own DFMC record and is the only owner of its range | the arena is its own transport record and sole owner of its range | 8 records — 11 | yes: record identity, ATR decode, transport figures (5 more pins) | **A** G13 | A15 |
| 43 | `layout-d1:141` — Layout D.2 exact memory and transport budgets remain frozen | the Layout D.2 budgets stay frozen | initial block content 13,113 B — 13,621 B | yes: ceiling, sectors, record table, residency | **B** G13 | B15 |
| 44 | `loader-screen:496` — assembled display list contains 157 ANTIC F and 35 ANTIC E lines | the loader display list does not overlap the PMG mask tables | `missile_masks` at `$37FC` — `$3810` | yes: overlap check, mask bytes, 157 F + 35 E lines (pass) | **A** G13 | A16 |
| 45 | `menu-raster:22` — native menu raster is exact for the ATR and four cold RAM fills | the native menu raster is exact on the ATR | 4 sessions — 8 (evidence file still holds 4 XEX sessions) | yes: incl. 'evidence describes the current artifact' (it does not) | **D** G15 | D9 |
| 46 | `menu-raster:110` — menu evidence preserves the audited boot streams and independent charsets | menu memory audit | `a2_runtime` ends `$90FF` — `$90ED` (stale evidence file) | yes: 5 range pins | **D** G15 | D9 |
| 47 | `pairshot-foundation:70` — PairShot keeps one collision event per logical player or enemy record | one collision event per PairShot record | 44 cycles per missed object — 43 | yes: 3 checks (pass) | **A** | A17 |
| 48 | `pickup-fence:67` — executed wait moves a late fence earlier without skipping a PAL update | the frame fence moves with a PENDING/ACTIVE capsule | fence 108, 100, … 28 — constant 112 | yes: ACTIVE fence relation | **B** G1 | B4 |
| 49 (todo) | `pickup-fence:118` — PENDING fence keeps an active projectile published through the erase/redraw window | TODO — a projectile stays published through the fence window | fence 20 — 112 (moving fence retired) | yes: the property the todo waits for | **B** G1 | B4 |
| 50 | `player-fire-audio:77` — accepted cadence is movement-independent, pool-safe and every complete SFX is $33..$38 | fire cadence is movement-independent, pool-safe, with complete SFX | SPREAD interval histogram `{12:62, 28:187}` — `{12:149, 28:150}` | yes: denied = 0, pool ≤ 5, SFX complete, movement independence (pass) | **A** G6 | A18 |
| 51 | `playfield-boundaries:160` — all booster types traverse the lower playfield on EASY, MEDIUM and HARD | every booster type crosses the lower playfield | harness: 'rapid pickup did not activate' | yes: everything (passes) | **D** G2 | D1 |
| 52 | `playfield-boundaries:187` — bottom clipping and repeated ring wraps never write the HUD or revive a pickup | bottom clipping and ring wraps never write the HUD | source: `cmp #(ENTITY_LOGICAL_ROWS-1)…@one_row` — character clipping retired | yes: 1 more pattern (obsolete), 2 label bounds; the trace asserts before it pass | **B** G1 | B1 |
| 53 | `preview:88` — start-menu preview is deterministic, 640x384, and source-derived | the start-menu preview is deterministic and source-derived | hint `UP/DOWN MOVE   FIRE SELECT` (3 spaces) — 1 space | yes: 8 checks (pass) | **A** G18 | A19 |
| 54 | `preview:128` — preview consumes the canonical charset, screen, PMG, and palette source | the gameplay preview is derived from charset, PMG and palette source | COLPM2 `$46` — `$44` (stale pin); **then** the preview does not change when `player_shape` changes | yes: 2 more variants (pass) | **C** G8 | C2 |
| 55 | `preview:260` — debris owner review is deterministic and covers visuals, trajectories, contact and wrap | the debris review trace covers a full pass, contact and ring wrap | 141 rows — pinned 117 (38 rows per pass; a pass is 46 rows now) | yes: 9 checks (pass) | **A** G8 | A20 |
| 56 | `preview:285` — destructible debris owner preview is an ATR-executed eight-frame breakup | the debris break-up preview trace | every row ends `,0742` (score unchanged) — rows after the kill end `,0767` | no (last assertion) | **B** G16 | B7 |
| 57 | `preview:297` — Interceptor owner preview is the ATR-executed eight-frame local breakup | the Interceptor break-up preview trace | 127 BREAKUP rows — 32 | yes: five-fragment rows `$1F,5` (retired), score rows (pass) | **B** G16 | B7 |
| 58 | `preview:308` — Rapid Fire owner preview executes the packed ATR pickup lifecycle | the Rapid Fire preview runs the pickup lifecycle | harness: 'Rapid burst requires collected runtime state' | yes: then character codes `120,120,121,122,123` | **B** G2/G1 | B1 |
| 59 | `preview:369` — burst-balance owner preview is a deterministic 80-frame ATR execution | the burst-balance preview trace | emitted `[21,30,24]` — `[9,12,8]` | yes: every Spread allocation ∈ {0,3} — the build has {0,1,3} | **B** G5/G6 | B16 |
| 60 | `preview:384` — Spread Shot owner preview is deterministic executed ATR gameplay | the Spread preview is executed gameplay | DROP render ids `120/252/124` — `0` | yes: the SPREAD_VOLLEY row (harness fires centre only) | **D** G3/G1 | D2 |
| 61 | `runtime-timing:101` — protected linked segments do not regress beyond the accepted feature baseline | linked code stays inside the feature budgets | frontend H3.1 `actualBytes 16,735 (+1,389)` — `17,491 (+2,145)`, hard delta 1,280 | yes: safe residency 4,766 (959) | **B** G13 | B15 |
| 62 | `runtime-timing:162` — hybrid ring reservation fits after staging and before entity/effects RAM | the ring reservation fits between staging and entity RAM | source: `PLAYFIELD_RING_STATE_END <= $7FDD` — `<= WEAPON_PICKUP_RUNTIME` | yes: 4 more constant patterns | **A** G8 | A21 |
| 63 | `runtime-wall-trace:378` — real ATR startup traces keep one atomic two-phase engine pulse | the engine pulse is one atomic two-phase toggle on every start | `a2_heads.length` 22 — 27 | yes: 12 checks (pass) | **A** G8 | A22 |
| 64 | `runtime-wall-trace:510` — wall trace records the required legal runtime coverage without incoherent RAM seeding | the evidence covers every legal runtime path | pool `[19,13,false]` — `[10,10,true]` | yes: 'does not claim a full state', far-star rate, exact transition frames | **B** G4/G16 | B17 |
| 65 | `runtime-wall-trace:656` — explosion colour flash passes its +64 PAL gate with exact GTIA traces | explosion flash stays in its +64-cycle gate with exact GTIA values | `colpm1 [$44,$84], colpm2 [$46], colpm3 [$28]` — `[$44], [$44], [$1C,$28]` | yes: manifest budget block (passes) | **A** G9 | A23 |
| 66 | `runtime-wall-trace:743` — enemy breakup passes the hard PAL gate and executes the five-slot runtime path | enemy break-up passes the hard PAL gate | `report.gate.passed === true` — false | yes: five-slot coverage `[$1F,5]` (retired), budgets | **B** G16 | B17 |
| 67 | `runtime-wall-trace:803` — ten heaviest frames retain exact clock positions, VBI IDs and state | the ten heaviest frames keep clocks, state and a CPU reference | ≥ 1 heavy frame with a CPU DMA-off reference — all ten are `null` | no (last assertion; the per-frame checks before it pass) | **D** G15 | D10 |
| 68 | `score:326` — assembled decimal score code carries without inserting partial-game scores | the BCD score add carries correctly | TypeError: `addresses.addScore` undefined (label is an equate) | yes: everything (passes) | **D** G10 | D4 |
| 69 | `score:346` — all score writes use one BCD award path while source ownership stays unchanged | exactly one BCD award path | `addresses` all integers — `enemy_scores`, `add_archetype_score` undefined | yes: then `sta score_bcd_lo` ×2 — the source has 5 (three award paths) | **B** G10 | B18 |
| 70 | `score:479` — ordinary awards update only current BCD score until Game Over | an award changes SCORE only | enemy score `$10` — undefined address | yes: everything (passes) | **D** G10 | D4 |
| 71 | `score:539` — assembled death and respawn preserve whole-game SCORE before the next award | death and respawn preserve SCORE | enemy score `$10` — undefined address (first 30 lines pass) | yes: award, new game, 4 source checks (1 identifier stale) | **D** G10 | D4 |
| 72 | `transport-enabler:157` — record overlap, invalid load range, length mismatch, truncation, and ATR overflow fail closed | bad transport records fail closed | error text `forbidden BASIC-ROM window` — `is not in reviewed free residency` | yes: 3 failure modes (pass) | **A** G13 | A24 |
| 73 | `transport-layout-regression:24` — packed startup and relocated GLUE have pairwise-safe real lifetimes | boot staging ranges never overlap while live | `ca65` (from PATH): cannot open include `heavy-member.s` | yes: everything; then a hand-written 4-record Layout D.2 table | **B** G14/G13 | B10 |
| 74 | `weapon-pickup-rapid-fire:155` — three eight-phase banks preserve one tapered 8x16 capsule through 2x2/2x3 footprints | capsule art and its character compositor | source: `compose_weapon_pickup_phase:` — retired (art checks before it pass) | yes: 6 compositor patterns | **B** G1 | B1 |
| 75 | `weapon-pickup-rapid-fire:186` — runtime compositor publishes the exact capsule pixels for all types and phases | the compositor writes the exact capsule pixels into the charset | 48 charset bytes = phase bank — charset is not composed | yes: first/last visible row | **B** G1 | B1 |
| 76 | `weapon-pickup-rapid-fire:200` — the release ATR executes 0→1→2→pending only for consumed PlayerFighter kills | kills 1-2-3 create one pending capsule | harness: 'Rapid burst requires collected runtime state' | yes: everything (passes) | **D** G2 | D1 |
| 77 | `weapon-pickup-rapid-fire:227` — pickup pending remains hidden and non-colliding for thirty full frames | a PENDING capsule is hidden and cannot be collected | harness: same | yes: everything (passes) | **D** G2 | D1 |
| 78 | `weapon-pickup-rapid-fire:258` — every booster type enters at the top, crosses the full playfield once and releases below it | each booster type crosses the playfield once | harness: 'rapid pickup did not activate' | yes: everything (passes) | **D** G2 | D1 |
| 79 | `weapon-pickup-rapid-fire:277` — active capsule renders one phased 2x2/2x3 footprint continuously and cannot be shot | the ACTIVE capsule is drawn continuously and cannot be shot | harness: same | yes: then character codes 120-125, `drawnMask 15` | **B** G2/G1 | B1 |
| 80 | `weapon-pickup-rapid-fire:309` — pickup movement resolves half world speed into smooth scanline phases | capsule motion is half world speed in scanlines | harness: same (2 checks before it pass) | yes: the motion deltas (pass) | **D** G2 | D1 |
| 81 | `weapon-pickup-rapid-fire:317` — debris and the reserved pickup coexist without allocator overwrite for every A2 head | debris and capsule coexist for every ring head | harness: same | yes: `[mask,count] = [3,2]` (passes), then ring-cell addresses and glyph codes | **B** G2/G1 | B1 |
| 82 | `weapon-pickup-rapid-fire:338` — four-cell backing restores byte-exact data in reverse layer order at every A2 head | four-cell backing is restored exactly | codes `[120,121,122,123]`, mask 15 — all 0 | yes: backing/restore | **B** G1 | B1 |
| 83 | `weapon-pickup-rapid-fire:362` — reverse erase restores every 2x2/2x3 phase across the A2 wrap | reverse erase across the ring wrap | codes `[120,121,122,123]` — 0 (3 checks before it pass) | yes: third row, backing | **B** G1 | B1 |
| 84 | `weapon-pickup-rapid-fire:384` — the main frame has one guarded late pickup publication | one guarded late capsule publication per frame | `jmp render_weapon_pickup_overlay` ×1 — 0 | yes: fence and overlay patterns | **B** G1 | B1 |
| 85 | `weapon-pickup-rapid-fire:435` — one logical footprint survives repeated ring wraps and cannot return after release | one footprint through ring wraps | every frame: cells = 2/4/6, exact reverse erase — false | yes: release state | **B** G1 | B1 |
| 86 | `weapon-pickup-rapid-fire:476` — pickup collection is single-shot and changes neither score, HULL nor LIFE | collection is single-shot and leaves SCORE/HULL/LIFE alone | harness: same | yes: everything (passes) | **D** G2 | D1 |
| 87 | `weapon-pickup-rapid-fire:578` — Rapid Fire lasts 500 active frames and keeps its accepted accelerated burst | Rapid Fire lasts 500 frames with its burst | harness: same | yes: burst frames (pinned 8 and 10 shots; build 4 and 5), timer, HUD (pass) | **D** G2/G5 | D1 |
| 88 | `weapon-pickup-rapid-fire:625` — packed runtime distinguishes accepted Normal, Rapid and Spread cadence | Normal / Rapid / Spread / Shield cadence | summary rows for 8/10/8 shots — 4/5/2 | yes: first-burst frames (re-pinned) | **A** G5/G6 | A25 |
| 89 | `weapon-pickup-rapid-fire:654` — released FIRE emits a visible centred first frame across X, Y and ring phases | the first shot frame is visible and centred | Spread slot X order `[+8,+4,+12]` — `[+4,+12,+8]` | yes: 216 centring cases (pass) | **A** G6 | A26 |
| 90 | `weapon-pickup-rapid-fire:674` — sector pickup clear republishes still-live PlayerFighter projectiles in the same frame | a sector clear republishes live shots in the same frame | rendered latch 1 — `$FF` | yes: 3 checks (pass) | **A** | A27 |
| 91 | `weapon-pickup-rapid-fire:715` — Normal and Rapid projectiles render through the PlayerFighter yellow bank | Normal and Rapid shots use the yellow bank | `poolSlots` 10 — 5 (all colour checks before it pass) | yes: 2 source checks (pass) | **A** G4 | A28 |
| 92 | `weapon-pickup-rapid-fire:731` — the packed ATR keeps every implemented PlayerFighter lifecycle path yellow under cold RAM | every shot lifecycle path stays yellow | SPREAD capture: 3 shots — 1 (fixture fires the centre follow-up only) | yes: Interceptor colour (passes) | **D** G3 | D2 |
| 93 | `weapon-pickup-rapid-fire:760` — new game, life loss and Game Over clear RF while a live sector transition preserves it | new game / life loss / Game Over clear the booster; a sector keeps it | PENDING capsule cleared at a sector boundary — stays PENDING (frozen) | yes: HUD codes, sector Rapid | **B** G1 | B2 |
| 94 | `weapon-pickup-rapid-fire:771` — release trace CSV exposes the authoritative counter, state, timing and score | the pickup trace CSV | harness: same | yes: everything (passes) | **D** G2 | D1 |
| 95 | `weapon-pickup-shield:55` — dynamic glyph ownership is explicit and all capsule transitions restore backing | dynamic glyph bank ownership | `dynamicPickupGlyphBankShared` true — false | yes: backing restore, compositor patterns | **B** G1 | B1 |
| 96 | `weapon-pickup-shield:78` — pickup rotation is exactly Rapid Spread Shield Rapid without RNG | pickup type rotation without RNG | drops `[0,1,120],[1,2,248],[2,0,120]` — render id 0, third drop wrong | yes: no-RNG source check (passes) | **D** G2/G1 | D1 |
| 97 | `weapon-pickup-shield:143` — same-frame Shield collection protects later debris and consumes it | a same-frame Shield collection protects against later debris | `state 5, timer 250` — `0, 0` | no (single assertion) | **D** G2 | D1 |
| 98 | `weapon-pickup-shield:150` — frame ordering keeps earlier collisions before pickup activation | collisions run before pickup activation | source: `jsr update_weapon_pickup_active…jmp entity_collide_player_active` — `jsr update_fighter_pickup_pmg`, `jmp entity_collide_player` | no | **A** G1 | A29 |
| 99 | `weapon-pickup-shield:154` — collision callers retain their consume and impact contracts | collision callers consume the shot and apply damage | hostile shot consumed, damage latched — untouched (fixture: slot 10, kind 2) | yes: 5 checks (1 identifier stale) | **D** G4 | D7 |
| 100 | `weapon-pickup-shield:198` — Shield keeps the normal eight-shot cadence while Rapid and Spread remain unchanged | Shield keeps the Normal cadence | first-burst shots `[8,8,10]` — `[4,4,5]` | yes: 2 checks (pass) | **A** G5 | A30 |
| 101 | `weapon-pickup-spread-shot:79` — Spread Shot owns one phased red fan in the shared six-glyph bank | Spread capsule art and its compositor | source slice `render_weapon_pickup_overlay:` — empty (art checks before it pass) | no | **B** G1 | B1 |
| 102 | `weapon-pickup-spread-shot:88` — the release ATR executes the deterministic Rapid Spread Shield drop cycle | the Rapid → Spread → Shield drop cycle | drops with render ids `120/248/120` — 0, third drop wrong | yes: 6 checks (pass) | **D** G2/G1 | D1 |
| 103 (todo) | `weapon-pickup-spread-shot:108` — both capsule types spawn and Spread moves through every A2 step without ghosts | TODO — Spread capsule moves without ghosts | character codes `[2,15,120,121,122,123]` — `[1,0,0,0,0,0]` | yes: the property the todo waits for | **B** G1 | B4 |
| 104 | `weapon-pickup-spread-shot:136` — Spread four-cell reverse erase restores byte-exact backing at every A2 head | Spread four-cell backing | codes `[248,249,250,251]`, mask 15 — 0 | yes: backing/restore | **B** G1 | B1 |
| 105 | `weapon-pickup-spread-shot:152` — Spread collection lasts exactly 500 active PAL frames and pause freezes it | Spread lasts 500 frames; pause freezes it | `[4, 500, [7,7,7,7]]` — `[1, 32, [0,0,0,0]]` | yes: everything (passes) | **D** G2 | D1 |
| 106 (todo) | `weapon-pickup-spread-shot:302` — all three projectiles leave the screen cleanly without HUD or charset corruption | TODO — Spread shots leave no glyph behind | no shot glyph left on screen — 348 residue cells of the fixture's uncleared ring | yes: charset and HUD checks | **D** G3/G1 | D2 |
| 107 | `weapon-pickup-spread-shot:407` — Spread fixed phase is symmetric after 100 updates and both side bounds despawn | the Spread fan is symmetric and despawns at both bounds | initial X `[132,128,136]` — `[132,0,0]` (centre only) | yes: symmetry, bounds (pass) | **D** G3/G6 | D2 |
| 108 | `weapon-pickup-spread-shot:419` — all three directions collide with debris and Interceptor scoring resolves only once | every Spread direction hits debris; scoring resolves once | directions `[0,$40,$20]` — `[0,0,0]` | yes: Interceptor part (passes) | **D** G3/G6 | D2 |

## 5. The 16 recorded clause failures and the open trace items

Trace classes: (a) stale scenario, (b) harness leak or observer error, (c)
runtime defect a player would see. Evidence is the committed
`docs/runtime-wall-trace.json` and the session CSVs of the same run.

### 5.1 The 16 recorded clauses

| Sessions | Clause | Class | Evidence |
| --- | --- | :---: | --- |
| 12 × `engine-atr-{a5,5a}-{0,1,2}-{immediate,delayed}` | "first DLI did not select byte three of the active A2 list" | **(b)** | The observer counts the selection only when the first DLI fires inside the measured main-loop window. In all 12 sessions the count is 0 of 150 rows. In the other session traces the 2026-10-01 runs left on disk it fires on 5,544 rows in 29 sessions, with 0 violations of `dlist = $7F00 + active_lo + 3`. The repository records this as (a), "150 light cold-start frames cannot contain it" (report §14.6); either way the runtime selects the right byte. |
| `capital-contact-allied-medium`, `capital-contact-hostile-medium` | "did not capture 16 consecutive contact rasters" | **(a)** | `sector_state` is 7 (FIGHTER) on all 560 and all 360 frames, and no BROADSIDE slot is ever live. On MEDIUM level 1 opens its capital sector at frame 734 (`director-complete-1`). The budgets end before the sector starts. |
| `lower-playfield-hostile-contact-atr-hard` | the same | **(a)** | The policy steers only to a hostile shell at `shell_y ≥ 191`. On HARD the hostile shells of level 1 fly at Y 116, 172 and 180 across 10,500 frames (`director-complete-2`); only allied shells reach 188-212. No frame budget makes this scenario meet its target; MEDIUM has hostile shells at 204 and 212. |
| `weapon-pickup-2-hunt-fire4` | "Booster release did not clear the capsule from its PMG plane in the release frame" | **(b)** | The plane is cleared: `pickup_plane_rows = 0` on all four release frames (311, 2184, 2377, 2537). The clause also asserts `pickup_erase_calls = 1`, and the hook counts entries to `clear_fighter_pickup_pmg`. On a release frame the routine is entered twice: once by the release, which clears the 16 rows, and once by the per-frame publication, which finds `ENTITY_SCREEN_HI = 0` and returns at once (`src/main.s:10900-10911`). The second entry writes nothing. |

No clause is class (c).

### 5.2 Open items named in the brief

| Item | Class | Evidence |
| --- | :---: | --- |
| `debris-gate-capital-muzzle-ring-2-sweep-fire4`: one blank debris frame | **(c)**, low | 1 blank of 990 capital frames, host frame 4463. The player's last life is lost at trace frame 3843/3844 (host 4462-4463); the player's five live shots are erased on that frame. This is the documented death-frame blink (STATUS "debris death-frame blink"): a shot published over the debris cell is erased mid-frame and the debris returns only in the late window. See §6 C1. |
| `--raider-sector-only` aborts, "did not return to post-sector OPEN" | **(a)** | The replay is 1,800 frames. The capital sector is entered at frame 870 and is still in state 4 at frame 1799. One capital sector lasts 1,084 frames on HARD (`director-complete-2`: 734 → 1818), so the return falls at about frame 1,954, after the replay ends. The budget dates from `10f1be2` (2026-09-10). The abort is this invariant; nothing else fails before it. |
| remnant gate: 63 kills, 62 explosions | **(b)** and **(a)** | The gate counts kill *requests* (63) against *frames* that show the explosion signature (62). In the Spread replay, frame 2052, one fan kills both Raiders in the same frame: two requests, one frame, one flash, and the score rises by two awards (`$0321` → `$0353`). The other 61 kill frames match. Separately the gate requires at least 100 kills and the three 3,000-frame replays produce 63 on the authored level 1; that floor is a stale scenario. |
| the pickup traversal clause does not tell a debris slot from the pickup slot | **(b)** | Recorded in STATUS and `pickup-traversal-clause-2026-09-28.md`: the clause reads `entity_active_mask === 2`, the whole entity plane, so a debris admitted beside an intact capsule reads as a broken capsule. It passes today only because the replay uses fire delay 8, with 20 frames of slack. Nothing new was measured here. |
| the test that fails only at `../dark-fighter-baseline` | **D** | `tests/wall-trace-debug-route.test.mjs:53` uses `../dark-fighter-baseline/build/level-2-s0` as its example of a path outside the repository. In a checkout of that name the path is the checkout's own `build/level-2-s0`, a valid debug-route build, so it is accepted. Reproduced by calling `traceArtifactLayout` with both roots. It is not one of the 105. |
| the 3 `todo` tests | | §5.3 |

### 5.3 What each todo test waits for

| Test | Its stated reason | Finding |
| --- | --- | --- |
| `pickup-fence` "PENDING fence keeps an active projectile published through the erase/redraw window" (49) | "erase exposes a blank active projectile" | The moving PENDING fence was retired with the character capsule (`f6eee5c`); `wait_gameplay_frame` is `wait_frame` with a fixed fence. The test stops at its first pin (fence 20, actual 112). It waits for a mechanism that no longer exists. **B.** |
| `weapon-pickup-spread-shot` "both capsule types spawn and Spread moves through every A2 step without ghosts" (103) | "Spread leaves a second capsule trail" | A defect of the character capsule. The capsule is one PMG image; the test asserts character codes. **B.** |
| `weapon-pickup-spread-shot` "all three projectiles leave the screen cleanly without HUD or charset corruption" (106) | "final Spread projectile glyph remains" | **Does not reproduce.** The fixture never clears the ring: 348 cells already hold codes in the shot-glyph range before the volley fires. On a cleared ring a full volley leaves 0 cells after the three shots exit (35 frames) and the HUD row is unchanged. The test also expects the charset to hold a capsule phase, which is G1. **D**, then a small rewrite. |

## 6. Class C, ordered by player impact

| | Defect | Player-visible | In the default ATR | Evidence | Proposed task |
| --- | --- | :---: | :---: | --- | --- |
| **C1** | **Debris death-frame blink.** When the player dies while one of the player's shots is drawn over a debris cell, that debris is blank for one frame (20 ms). | yes, one frame, during the player's own explosion flash | yes, in normal play | §5.2; first-writer proof in `stage-2b2n-hostile-shot-emitter-independence.json`; the owner ruled it pre-existing on 2026-10-01 | `fix/debris-death-frame-blink`: on a death frame, restore the debris cell instead of the shot's space backing, or move the shot erase into the late publication window. ASM hot path: needs the PAL audit. Or an owner decision to accept it and record it in the gate. |
| **C2** | **The gameplay preview clips the lower five rows.** `scripts/preview.mjs` draws 24 rows; the playfield has 29 since `effe71c`. The fighter starts in the clipped area, so the preview never shows it. | no | no (a development tool) | test 54: with the stale colour pin fixed, changing `player_shape` does not change the image; the colour and hull variants do | `chore/preview-29-rows`: `SCREEN_ROWS` and the preview height follow `canonicalPlayfield`; test 53's 640×384 pin moves with it. |

C1 is known and recorded; this review adds only the exact frame. C2 is new.

**Owner decisions, 2026-10-01.** C1 is **owner-accepted as a known
low-severity issue for now**: it stays recorded with that reason (STATUS, open
defects) and no task is opened. C2 becomes the follow-up
`chore/preview-29-rows`; nothing is done about it in this task.

## 7. Phase B action list

Probed means the edit was applied temporarily and the test passed in full.
Line numbers are the current ones.

### 7.1 Class A — re-pins (33 tests)

| Action | Tests | Edit: old → new | Source of the new value | Probed |
| --- | --- | --- | --- | :---: |
| A1 | 6 | `jmp render_weapon_pickup_overlay` ×1 → `jsr publish_fighter_pickup_pmg` ×1 | `src/main.s`: one call site; the overlay label was retired at `f6eee5c` | yes |
| A2 | 7, 10, 12 | station counts 8 / 12 / 16 → 10 / 15 / 20; the three test names say "8/12/16" and are renamed | `assets/graphics/capital-hulls.json` `turretLayout.counts` | yes |
| A3 | 8 | `COLPM1-3` `[$44,$46,$28]` → `[$44,$44,$28]` | `src/main.s:2626-2628` | yes |
| A4 | 9 | baseline `[9,9]` → `[17,17]`; final `[22,22]` → `[21,21]`; average gap `832/21` → `832/20` | `simulateBroadsideCadence` over the hull definition | yes |
| A5 | 13 | pattern → `MUZZLE_BACKING = CORRIDOR_BOUNDARY_LEFT+$01` and `restore_active_muzzles:…lda MUZZLE_BACKING,x` | `src/main.s:230`, `:6572-6586` | yes |
| A6 | 14 | 24 rows → 29; allied steel register `$84` → `$88` | `build/fighter-weapons.inc:7`; `GAMEPLAY_COLPF1 = $88` | yes |
| A7 | 17 | `add_archetype_score:…adc enemy_scores,x` → `add_archetype_score_tail:…adc ENEMY_PROFILE_SCORE_BCD` | `src/main.s:11807-11817` | yes |
| A8 | 21 | `$8800` → `$8776`; sectors 7 → 9; margins 149 → 143 and 112 → 38; A2 kernel 122 → 237 B; envelope 14 → 75; records 4 → 11 | `build/manifest.json` | yes |
| A9 | 22 | the pattern allows `sta LIGHT_SCREEN_SLOT_LIMIT` before `@erase_next:` | `src/hybrid/light-kernel.s:146-155` (`314ded8`) | yes |
| A10 | 23 | peak 1,032 → 1,071 cycles; delta 210 → 249. The gate `< 300` in the same test is not touched. | the test's own measurement | yes |
| A11 | 25 | hostile shot kinds `[2,3]` → `[10,11]`, and `2` → `10` | `src/main.s` `update_fighter_projectiles`: `ACTIVE >> 3` is the weapon class | yes |
| A12 | 31 | Spread burst count 4 → 2; `INTERCEPTOR_BURST_COUNT/INTERVAL` → `ENEMY_PROFILE_BURST_COUNT/INTERVAL` in one pattern | `fighter-weapons.json`; `src/main.s:4376`, `:4391` | yes |
| A13 | 33 | `[$5318,$5318,$5DB6,$5E10,0,90]` → `[$5331,$5318,$5DEA,$5E10,−25,38]`; `[…$5D45…,2145]` → `[…$5CDB…,2039]`; the boot-order pattern allows `jsr publish_director_abi` between the resident and the entity unpack | `build/manifest.json`; `src/main.s:1217-1249` | yes |
| A14 | 34 | model snapshot: `nearSteps` 300 → 600, `scheduleAttempts` 54 → 58, `spawns` 2 → 12; `farSteps` leaves the snapshot (the model has no far steps since the static far stars) | `scripts/starfield.mjs`, `scripts/broadside.mjs` | yes |
| A15 | 41, 42 | arena `[71,504,39]` → `[90,589,39]`, free 218 → 114; records 8 → 11; arena record `[558,5]` → `[649,6]`; initial block 13,172 → 13,621; envelope 12 → 75; boot sectors 103 → 107; total 182 → 208 | `build/manifest.json`; STATUS:366-370 | yes |
| A16 | 44 | `missile_masks` `$37FC` → `$3810` | `build/void-strike-65.lbl` | yes |
| A17 | 47 | 44 → 43 cycles | `scripts/pairshot-proof.mjs` measurement | yes |
| A18 | 50 | SPREAD histogram `{12:62, 28:187}` → `{12:149, 28:150}` | the test's own 6,000-frame trace: volley, +12 centre follow-up, +28 next volley | yes |
| A19 | 53 | `UP/DOWN MOVE   FIRE SELECT` → `UP/DOWN MOVE FIRE SELECT` | `src/main.s:7622` | yes |
| A20 | 55 | rows per pass 38 → 46 (three places) | 28-row playfield, bottom 240 | yes |
| A21 | 62 | `<= $7FDD` → `<= WEAPON_PICKUP_RUNTIME`; `PLAYFIELD_RING_STATE_END <= $8000` → `PLAYFIELD_DLIST_END <= $8000`; rows 23 / 22 → 28 / 27; ring `= GAMEPLAY_DIVIDER_SCREEN+40` → `= $8140` | `src/main.s:361-383`, `:442` | yes |
| A22 | 63 | `a2_heads.length` 22 → 27 | `PLAYFIELD_RING_ROWS = 27` | yes |
| A23 | 65 | `colpm1 [$44,$84]` → `[$44]`; `colpm2 [$46]` → `[$44]`; `colpm3 [$28]` → `[$1C,$28]` | `docs/runtime-wall-trace.json` `coverage.fighter_colour_flash` | yes |
| A24 | 72 | error text `forbidden BASIC-ROM window` → `is not in reviewed free residency` | `scripts/chunk-loader.mjs`; owner decision B made `$A000-$BC19` usable | yes |
| A25 | 88 | cadence rows to the 4 / 5 / 2 counts: NORMAL `[4,9,12,4,4,9,4]`, RAPID `[5,6,12,5,5,12,5]`, SPREAD `[2,28,12,2,4,8,4]`, SHIELD as NORMAL; first-burst frames `[0,9,18,27]`, `[0,6,12,18,24]`, `[0,28]` | `fighter-weapons.json`; the test's own trace | yes |
| A26 | 89 | Spread slot order `[+8,+4,+12]` → `[+4,+12,+8]` | `player_fighter_spread_volley_sides` allocates the sides first | yes |
| A27 | 90 | rendered latch 1 → `$FF` | `src/main.s:12018-12020` | yes |
| A28 | 91 | `poolSlots` 10 → 5 | `fighter-weapons.json:35` | yes |
| A29 | 98 | pattern → `jsr update_weapon_booster_active`, `@pickup: jsr update_fighter_pickup_pmg`, then `jmp entity_collide_player` | `src/main.s:9948-9958`, `:10046` | yes |
| A30 | 100 | `[8,8,10]` → `[4,4,5]` | `fighter-weapons.json` | yes |

All 33 were probed end to end. If the Phase B run nevertheless stops one of
them at another assertion, the test stays recorded with that assertion as its
reason.

### 7.2 Class D — test-side fixes (30 tests)

| Action | Tests | Fix | After the fix |
| --- | --- | --- | --- |
| **D1** | 51, 76, 77, 78, 80, 86, 87, 94, 96, 97, 102, 105 | `scripts/weapon-pickup-runtime.mjs` `initialiseRuntime`: place the linked runtime segments (`installRuntimeSegments`), load the Director labels, set `CAPITAL_SECTOR_STATE` to OPEN, run `director_init` and set the Director state the way `tests/booster-admission-diagnostic.test.mjs` does. This file is a test harness: the build does not import it, and the showcase generator does not use it. | Probed: all 12 pass. 87 also needs its burst pins (8 and 10 shots → 4 and 5; the weapon table to `[4,5,2,9,6,500,5,6,1,2]`); 96 and 102 also need the dead render id 120 / 248 → 0. The five test files that already pass with this harness still pass (33 tests). |
| **D2** | 60, 92, 107, 108, todo 106 | The same harness: set `PLAYER_FIGHTER_BURST_REMAINING` to the Spread burst count before the allocator call in four trace functions, as `executeSpreadShotVolleyTrace` already does. | Probed: 92 passes. 107 and 108 pass with the slot order re-pinned to sides-first (`[128,136,132]`, `[$40,$20,0]`), their symmetry and scoring assertions unchanged. 60 then needs its volley row re-pinned. 106: clear the ring first; see B4. |
| **D3** | 27, 28, 29 | `tests/entity-effects.test.mjs`: publish the enemy profile score in the fixture; in the booted-ATR fixture also run `publish_director_abi` and install the glue. | Probed: the whole file passes, 48 of 48. |
| **D4** | 68, 70, 71 | `tests/score.test.mjs`: read the score byte's address from `build/director-abi.inc`, use `add_archetype_score_tail`, publish the profile score, add `ADC abs` to the test's own interpreter; in 71 one source check moves to `update_player_death_finished`. | Probed: all three pass. |
| **D5** | 4, 5 | `tests/broadside-fire.test.mjs`: the fixture row uses codes 2-9 instead of 1-8, so it no longer contains the near-star code. | Probed: both pass in full. |
| **D6** | 37 | Port the fixture to `installRuntimeSegments`, or retire it with B5: `tests/hostile-projectile-emitter-independence.test.mjs` (6 passing tests) covers the same rule. | Recommended: retire with B5. |
| **D7** | 99 | The Shield fixture uses the first hostile slot (5), a valid kind (`(1 << 3) \| 2`) and frame counter 0; one source pattern re-pinned to `jmp debris_contact_destroyed`. | Probed: passes. |
| **D8** | 35 | None here. The showcase gameplay frames are XEX-era captures and need a capture run and a `docs/media` commit, which this task may not make. | Stays recorded. |
| **D9** | 45, 46 | None here. `docs/menu-raster-trace.json` must be regenerated for the ATR; that is the wall-trace harness. | Stay recorded. |
| **D10** | 67 | None here. The CPU reference comes from the JS cycle model in `scripts/runtime-cycles.mjs`, a build script. | Stays recorded. |
| **D11** | (not one of the 105) | `tests/wall-trace-debug-route.test.mjs:57`: build the outside path from the checkout's own name, so it is outside whatever the checkout is called. | Passes at any path. |

### 7.3 Class B — rewrite or retire (41 tests and 2 todo): the owner decides each group

| Action | Tests | Recommendation | Decision or commit that made it obsolete |
| --- | --- | --- | --- |
| **B1** | 1, 52, 58, 74, 75, 79, 81, 82, 83, 84, 85, 95, 101, 104 | **Rewrite** 1, 52, 58, 74, 79, 81, 84, 101 to the PMG capsule (16 rows on `PLAYER3`, `HPOSP3`, `PRIOR = 0`, one `publish_fighter_pickup_pmg` per frame; keep their art-data and allocator assertions, which pass). **Retire** 75, 82, 83, 85, 95, 104: they test the charset compositor and the four-cell backing, which do not exist; `tests/pickup-pmg-raster-visibility.test.mjs` and `tests/pickup-boost-colour.test.mjs` cover the PMG capsule. | `f6eee5c`; `plans/pickup-colour.md` §7 |
| **B2** | 24, 93 | **Rewrite**: a PENDING capsule stays PENDING across a sector boundary and at LEVEL COMPLETE; an ACTIVE one is released. | `game-design.md` "Weapon pickups": "a PENDING capsule is frozen and resumes afterwards" |
| **B3** | 19, 20 | **Rewrite** to the contract that still holds (no phase bank shipped, no runtime reference, record unpacks to the linked image, stream ends at `$8B67`) with the current composition. | Light kernel's own link (4.6 step 1b); per-type silhouettes; pickup colour |
| **B4** | 48, todo 49, todo 103, todo 106 | **Retire** 48, 49 and 103. **Rewrite** 106 on a cleared ring without the charset-phase assertion and remove its `todo`. | `f6eee5c` |
| **B5** | 38, 39, 40 (and 37, D6) | **Retire** the file `tests/hunter-projectile-lifetime.test.mjs`. The three pin the frame-600 first-capital schedule and Director phases. | `plans/director-4.6.md` §8 row 2: `FIRST_CAPITAL_FRAME` and the phase machinery retired |
| **B6** | 30 | **Rewrite** one source pattern to the veneer (`jsr HYBRID_ENEMY_APPLY_PENDING_DAMAGE…@damage_feedback…spawn_interceptor_breakup_effects`); the arbitration assertions stay. | AGENTS.md: damage and lifecycle are C |
| **B7** | 56, 57 | **Rewrite** 56 to the debris award (rows after the kill end `0767`). **Retire** 57, or rewrite it to the 32-row trace without fragments. | STATUS "Debris reward"; Raider character effects removed |
| **B8** | 26 | **Rewrite** one pattern to `sta HPOSP1,x` and rename the test. | two-PMG Raiders `10f1be2`; AGENTS.md Heavy class |
| **B9** | 15 | **Rewrite**: drop the three star-generator patterns; the reservation assertions stay (probed: passes). | starfield redesign `41d136f` |
| **B10** | 18, 73 | **Retire** both. 18 proves a past optimisation against one build's heaviest frame and reads an uncommitted CSV; the PAL audit owns the ceiling. 73 hand-models the four-record Layout D.2; the build checks residency for its 11 records. | PAL audit; 4.5M and 4.6 placement |
| **B11** | 3, 16, 32 | **Retire** 3 and 32. **Rewrite** 16 without frozen hashes and on the v2 hull schema. | hull set v2 `884c446`, `c28d00d`; ADR-003 splash |
| **B12** | 11 | **Owner call.** With 10 / 15 / 20 stations the hulls share 5 / 8 / 9 rows; the test allows 2. Either accept the layout and bound the share proportionally, or regenerate the layout with another seed, which changes game bytes and is a separate task. The other assertions of the test pass. | `16969d8`; `plans/director-4.6.md` §11 item 18 |
| **B13** | 2 | **Rewrite**: drop "raider" from the list and exempt the checkout path; scope the scan to what a player reads. The built-screen checks beside it already pass. | `game-design.md` names the Raider; owner decision O mentions two franchises by name |
| **B14** | 36 | **Rewrite** to the current headings, and check that the Polish README carries the same ones. | README rewrite `b2a1710`; owner decision V |
| **B15** | 43, 61 | **Proposal only: these are budgets, and they are exceeded.** 43 freezes Layout D.2 at 13,113 B, 175 sectors and 8 records; the build is at 13,621 B, 208 sectors and 11 records under later owner limits (107 boot sectors, 13,652 B). 61 holds a frontend code budget of +1,280 B that stood at +1,389 when it was pinned and is +2,145 now. Rewrite both to the limits in force, or retire them. | ADR-003 ceiling; menu stars A′; transport STOP rule |
| **B16** | 59 | **Rewrite**: emitted counts to `[9,12,8]`; a Spread allocation is 0, 1 or 3. | owner decisions 2026-09-16 and 2026-09-30 |
| **B17** | 64, 66 | **Rewrite**: `gate.timing_and_dli_passed` instead of `gate.passed`; the pool is 5 + 5 and the full state is observed; frame pins become relations; the five-slot break-up coverage goes. | owner decision 2026-09-21; report §14.12 |
| **B18** | 69 | **Rewrite**: three award paths (enemy profile, Light, debris), none of which inserts a TOP score. | Light Wingman M1; debris score 2026-09-18 |

### 7.4 Class C

54 stays recorded with its true reason (the preview does not change with
`player_shape`); its colour pin `$46` → `$44` is applied so the test reaches
that assertion.

### 7.5 The recorded failure set

Proposed: one file, `docs/recorded-test-failures.json`, next to
`docs/recorded-gate-failures.json`, holding every test that stays recorded
with its class, its true first failing assertion and the task that would clear
it; the row for it in `docs/README.md`; STATUS points at it. Appendix A of
`plans/hull-set-v1.md` stays as history.

## 8. Follow-up tasks proposed (none started)

| Task | Clears |
| --- | --- |
| `fix/debris-death-frame-blink` (§6 C1) | the debris gate's one blank |
| `chore/preview-29-rows` (§6 C2) | test 54 |
| `chore/menu-raster-regeneration`: repair and re-run the menu raster trace on the ATR | tests 45, 46. **Until then no committed evidence shows the menu raster of any ATR built after 2026-09-20.** |
| `chore/showcase-recapture`: capture the nine gameplay frames from the ATR | test 35 |
| `chore/cycle-model-pairshot`: bring `scripts/runtime-cycles.mjs` to the 5 + 5 pool, or drop the CPU reference from the evidence | test 67 |
| Clause-side, in the wall-trace harness: count the first-DLI selection outside the measured window, or record it as permanently unobservable (12 clauses); longer or re-targeted contact replays (3 clauses; the HARD one needs MEDIUM or a lower threshold); the release clause asserts the plane, not the entry count (1 clause); `--raider-sector-only` to about 2,400 frames; the remnant gate compares requests with requests and drops the 100-kill floor; the traversal clause reads the pickup's own slot bit | the 16 clauses and three mode-gated gates |

## 9. Observations that are not failures

* The effect resolver peak grew from 1,032 to 1,071 cycles since it was pinned
  (test 23). It is inside its own gate.
* The margin between the entity staging and `BROADSIDE` is 38 B (it was 90),
  and the packed sources overlap the staging by 25 B, which the backward copy
  handles (test 33, `build/manifest.json`).
* The Spread owner preview (`npm run preview`) shows a single centre shot, for
  the reason in G3. D2 fixes it.
* On HARD the hostile hull's shells never fly below Y 180 on level 1; the
  allied hull's reach 212. This follows from the seeded station layout and is
  not a defect.

## 10. Phase B — what was applied (2026-10-01)

Sections 1 to 9 are the Phase A record and are left as written; where Phase B
went differently, this section says so.

### 10.1 Owner decisions on Phase A

| Item | Decision |
| --- | --- |
| Class A, all 30 re-pins (33 tests) | Approved. |
| D1, D2, D3, D4, D5, D7, D11 | Approved. D6 is retired with B5. D8, D9, D10 stay recorded. |
| `docs/recorded-test-failures.json` | Approved as the single recorded set, with a pointer where the old list stood. |
| B1 to B11, B13, B14, B16, B17, B18 | Approved as recommended. Every retirement names its reason and the decision or commit. |
| **B12** | **The current gun layouts are accepted.** The step-4 hull, with guns scaled by length, passed the owner's smoke. The shared-row limit becomes today's measured maximum per difficulty; no layout regeneration. |
| **B15** | Retire the two budgets only once the tests that enforce the limits in force are named; a limit with no enforcing test gets the B15 test rewritten to it. |
| **D1** | The harness may change only `initialiseRuntime` and the Spread and Shield fixtures as probed, with no change to the module's exports, to a function signature, or to anything the wall trace or `readStartMenuRuntimeState` calls. The trace is not regenerated. Committed outputs of the four diagnostic CLIs stay as written. |
| **C1, the debris death-frame blink** | **Owner-accepted as a known low-severity issue for now.** It stays recorded with that reason; no task is opened. |
| C2, the preview clipping | Listed as the follow-up `chore/preview-29-rows`; nothing done here. |
| Clauses | No change in this task; section 8 is the follow-up list. |

### 10.2 Result

One full default-build run after all edits (`node scripts/build.mjs --quiet`,
then `node --test tests/*.test.mjs`; 782 s), on the test commit `fbc1a24`.

| | Phase A (`main` `9694ca9`) | Phase B |
| --- | ---: | ---: |
| tests / pass / fail / todo | 891 / 783 / 105 / 3 | **873 / 868 / 5 / 0** |
| class A | 33 | 0 |
| class B | 41 | 0 |
| class C | 1 | **1** |
| class D | 30 | **4** |
| todo tests | 3 | 0 |
| recorded clause failures (a / b / c) | 16 (3 / 13 / 0) | 16, unchanged |

**Reconciliation by name.** Of the 105 recorded failures, **100 are gone**:
33 re-pinned, 25 fixed in their fixture, 26 rewritten to the rule in force and
16 retired. Of the 3 todo tests, 2 are retired and 1 (106) is rewritten and
passes. **No new failing name appeared.** Twenty-nine test names left the
suite: the 18 retirements of §10.6 and 11 renames, each of which is the same
test under a name that matches what it now checks:

| Old name | New name |
| --- | --- |
| tracked names and searchable tracked content contain no retired vocabulary | tracked names and player-facing tracked content contain no retired vocabulary |
| provisional PAL scheduler remains deterministic over denser 8/12/16 layouts | …over denser 10/15/20 layouts |
| EASY/MEDIUM/HARD expose exact legal 8/12/16 stations on each hull | …exact legal 10/15/20 stations on each hull |
| loader remains unchanged and the accepted H3.1 menu preview is source-derived | loader and menu previews are deterministic and the hull previews are source-derived |
| PMG ownership preserves one P1/P2 enemy while fighter bursts use playfield glyphs | PMG ownership gives each Heavy member one of P1/P2 while fighter bursts use playfield glyphs |
| Layout D.2 exact memory and transport budgets remain frozen | transport limits in force: the initial block STOP rule and every record's sector capacity |
| enemy breakup passes the hard PAL gate and executes the five-slot runtime path | enemy breakup passes the hard PAL gate and draws no character effect |
| all score writes use one BCD award path while source ownership stays unchanged | score is written by new-game and the three BCD award paths, and no award inserts a TOP score |
| three eight-phase banks preserve one tapered 8x16 capsule through 2x2/2x3 footprints | three eight-phase source banks hold one tapered 8x16 capsule and the runtime draws a PMG silhouette |
| active capsule renders one phased 2x2/2x3 footprint continuously and cannot be shot | active capsule is one logical PMG object, writes no character cell and cannot be shot |
| Shield keeps the normal eight-shot cadence while Rapid and Spread remain unchanged | Shield keeps the normal burst cadence while Rapid and Spread remain unchanged |

**The five that stay recorded** (`docs/recorded-test-failures.json`):

| Test | Class | Fails at | Same assertion as in Phase A? |
| --- | :---: | --- | --- |
| `github-showcase` "showcase manifest binds every image to the current packed release" | D | `:67`, frame 3351 vs 2537 | yes |
| `menu-raster` "native menu raster is exact for the ATR and four cold RAM fills" | D | `:22`, 8 sessions vs 4 | yes |
| `menu-raster` "menu evidence preserves the audited boot streams and independent charsets" | D | `:110`, `a2_runtime` range | yes |
| `runtime-wall-trace` "ten heaviest frames retain exact clock positions, VBI IDs and state" | D | `:836`, no heavy frame has a CPU reference | yes; the line moved from 803 with the edits above it |
| `preview` "preview consumes the canonical charset, screen, PMG, and palette source" | C | `:166`, the `player_shape` variant does not change the preview | **no: it failed at `:128` on the stale colour pin; with that re-pinned it reaches its real assertion** |

**Unchanged artifacts.** ATR
`af2e47b62c315ddf9ed05cab44842d8921bcb8c561b9cc2dcf103f1b1e8b31b7` and boot
`06d2f25665a17c0858c92245f257d6d339858149a5ed4679919d120d6eb4d80a`, before and
after. `git diff main --stat` shows no path under `src/`, `cfg/`, `dist/` or
`docs/media/`, no build script, and not `docs/runtime-wall-trace.json`. The
only file under `scripts/` is the test harness of §10.5.

### 10.3 B12 — the shared-row limit

`tests/capital-hull-extension.test.mjs` now allows as many station rows shared
by both hulls as the accepted layout has: **5 on EASY, 8 on MEDIUM, 9 on
HARD**. Source: the seeded generator (`turretLayout` seed 13, counts
10 / 15 / 20) compiled by `scripts/capital-hulls.mjs` from
`assets/graphics/capital-hulls.json`; measured in Phase A. A layout that
aligns more rows than that fails the test. No game byte changed.

### 10.4 B15 — the limits in force and the tests that hold them

| Limit | Enforced by | Before Phase B |
| --- | --- | --- |
| Transport STOP rule: no new boot sector (107), initial block ≤ 13,652 B | `tests/level-buffer-16.test.mjs` "Q-1: the window record lands at $AE00 and costs no extra transport" (107 sectors, ≤ 13,652 B, total ≤ 209); `tests/boot-loading-blank-screen.test.mjs` "the blanking costs 9 bytes of the initial block and no sector" (≤ 13,652 B, 107); `tests/boot-xex-reclaim.test.mjs` "the initial block returns the entry's 14 bytes" (107) | enforced |
| Extension record capacity: `sectors × 128 − 21` B | **no test on the built image.** `tests/chunk-loader.test.mjs` and `tests/transport-enabler.test.mjs` check the 21-B footer on synthetic chunks only. | **not enforced** |

So the two B15 tests were handled differently:

* **43, `layout-d1`** is **rewritten**, not retired. It is now "transport
  limits in force: the initial block STOP rule and every record's sector
  capacity": 107 boot sectors, content ≤ 13,652 B, content plus envelope
  inside the boot sectors, and for each of the 11 extension records
  `packedLength ≤ sectorCount × 128 − 21` with no more sectors than that
  needs, contiguous to the last transport sector. The tightest record today is
  record 5 (747 B in 6 sectors, 0 B to spare); record 2 has 3 B.
* **61, `runtime-timing`** loses its two frozen figures: the frontend H3.1
  code budget (+1,280 B, exceeded since it was pinned) and the
  `safeResidencyBytes` pin. The test keeps what is a limit: every protected
  segment stays inside its reservation, and the Spread and Shield budgets,
  which hold.

### 10.5 D1 — the harness change and what can observe it

`scripts/weapon-pickup-runtime.mjs` changed in three places only:
`initialiseRuntime` (places the linked runtime, opens the fighter sector,
starts the Director), the Spread fixtures (`executeSpreadShotTrace`,
`executeSpreadShotMotionTrace`, `executeSpreadShotCollisionTrace`,
`executePlayerFighterProjectileColourLifecycleTrace` arm the volley) and the
Shield fixture (`executeShieldBoosterTrace` uses the first hostile slot and a
valid shot kind). The 34 exports and every function signature are identical
to `main` (compared mechanically).

**Static evidence that the wall trace calls none of it:**

* `scripts/build.mjs` imports neither the harness nor `scripts/preview.mjs`,
  directly or through any module it loads.
* `scripts/runtime-wall-trace.mjs` never names the harness and has no dynamic
  `import()`. Its only import from `preview.mjs` is line 11,
  `readStartMenuRuntimeState`, and its only use is line 2387, the menu
  raster's expected image.
* Inside `preview.mjs`, 21 functions are reachable from
  `readStartMenuRuntimeState` (`readFrontendGraphicsSource`,
  `createStartMenuScreen`, `drawMixedMainMenuScreen` and their parsers). None
  of them names any of the 12 identifiers `preview.mjs` imports from the
  harness; the functions that do call the harness are the `create…Preview`
  and `create…Trace` builders, a disjoint set.
* The harness module has no top-level statement besides constants, so loading
  it runs nothing.

`docs/runtime-wall-trace.json` is untouched and no trace was run.

**Who else sees the change:**

* **`npm run preview`** (owner preview images under `build/`): the Rapid Fire
  preview, which threw "Rapid burst requires collected runtime state", runs
  again; the Spread preview shows the full three-shot fan instead of a single
  centre shot, and its drop rows report all three capsule types; the Shield
  preview's hostile-shot case registers the hit. Every harness-based preview
  now starts from a memory image with the linked runtime in place and a
  started Director.
* **The four diagnostic CLIs** — `pairshot-proof.mjs`,
  `pairshot-stale-runtime.mjs`, `player-fire-audio-trace.mjs`,
  `raider-projectile-persistence-runtime.mjs` — call `initialiseRuntime`, so a
  re-run starts from that same image. Their outputs already committed under
  `docs/diagnostics/` were not regenerated and stay as written. The tests that
  run them in-process pass with unchanged pins, except the two re-pins already
  listed (A17, A18), whose values were the same before the harness change.

### 10.6 Retirements, with their reasons

| Test | Reason | Decision or commit |
| --- | --- | --- |
| `broadside-antic2-prototype` "ANTIC 2 palette is genuinely monochrome…" | audits the rejected ANTIC 2 spike against the H4 hull art | hull set v2, `884c446`, `c28d00d` |
| `flagship-sector` "H4.2 C INDUSTRIAL preserves its structural and immutable data contracts" | the glyph set it names does not exist | the owner rejected the look; hull set v2 |
| `pickup-fence` "executed wait moves a late fence earlier…" and the todo "PENDING fence keeps an active projectile published…" | the moving frame fence is gone | `f6eee5c` |
| `preview` "Interceptor owner preview is the ATR-executed eight-frame local breakup" | expects a five-fragment character effect | diagnostics `stage-2b2b-raider-character-effects-removal`, `-transient-breakup-fragments-removal` |
| `weapon-pickup-rapid-fire` "runtime compositor publishes the exact capsule pixels…", "four-cell backing restores…", "reverse erase restores every 2x2/2x3 phase…", "one logical footprint survives repeated ring wraps…" | character compositor, backing and cells of a capsule that is a PMG object | `f6eee5c`; `plans/pickup-colour.md` §7 |
| `weapon-pickup-shield` "dynamic glyph ownership is explicit and all capsule transitions restore backing" | the same | the same |
| `weapon-pickup-spread-shot` "Spread four-cell reverse erase…" and the todo "both capsule types spawn and Spread moves through every A2 step without ghosts" | the same; the todo waited for a character-capsule trail | the same |
| `tests/hunter-projectile-lifetime.test.mjs`, the whole file (4 tests) | three pin the frame-600 first-capital schedule and Director phases; the fourth is covered by `tests/hostile-projectile-emitter-independence.test.mjs`; the fixture needed a `ca65` on `PATH` | `plans/director-4.6.md` §8 row 2 |
| `tests/capital-traversal-timing.test.mjs`, the whole file (1 test) | proves a past optimisation against one build's heaviest frame, read from an uncommitted trace CSV | the PAL audit owns the ceiling |
| `tests/transport-layout-regression.test.mjs`, the whole file (1 test) | a hand-written model of the four-record Layout D.2 | 4.5M and 4.6 placement; the build checks residency |

Eighteen tests in all (sixteen recorded failures and two todo tests). Each
retirement is also noted at the place the test stood, and in
`docs/recorded-test-failures.json`.

### 10.7 Differences from the Phase A proposal

* **24, `encounter-director` BOSS_HANDOFF.** The rewrite to the "PENDING is
  frozen" rule showed that the test's loop also covers a sector that is
  already COMPLETE (state 6) with an ACTIVE capsule. The routine releases an
  ACTIVE capsule together with the forced DRAIN; in state 6 it changes
  nothing, which is what "COMPLETE is terminal" means, and an ACTIVE capsule
  cannot exist there in play because it is released when the sector takes
  over. The test asserts exactly that.
* **106, the Spread cleanup todo.** The rewrite compares the screen with the
  screen before the volley. One cell differs in the fixture: it held screen
  code 1, the dynamic near-star point, which a shot's erase restores as space
  on purpose. The test allows that one documented case and nothing else, and
  bounds the charset check to the shots' own composite glyphs (47 to 51).
* **27, the booted-ATR fixture.** The minimal fix is the cold publication
  (`publish_director_abi`) in the boot's own order; the glue install tried in
  Phase A is not needed.
* **61.** Rewritten in place rather than retired whole (§10.4).
