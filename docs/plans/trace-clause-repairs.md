# Trace clause repairs — plan (Phase A)

Branch `fix/trace-clause-repairs`, cut from `main` `72f8bf6` on 2026-10-01.
Source of truth: the repository, then
[../diagnostics/recorded-failures-review-2026-10.md](../diagnostics/recorded-failures-review-2026-10.md)
(§5 and §8 for the clauses, §7.2 for the evidence tests), then the brief.

**Status: IMPLEMENTED (2026-10-01).** Q3's follow-up `chore/contact-scenario-redesign` is done (2026-10-02, [contact-scenario-redesign.md](contact-scenario-redesign.md)): two of the three contact sessions pass; the hostile lower-row one stays recorded until M5. Sections 1-7 are the Phase A record, left as written; §8 is what Phase B did, including where the owner's answers changed the expected sets of §6.

## 1. Step 0

| | Value | Source |
| --- | --- | --- |
| `main` | `72f8bf6 docs(license): owner answers - banner provenance, STATUS licence line` | `git log -1` |
| worktrees | the primary checkout only | `git worktree list` |
| licence merge / review on `main` | `THIRD_PARTY_NOTICES.md` and `docs/diagnostics/recorded-failures-review-2026-10.md` present | |
| tree | clean | `git status` |
| ATR SHA-256 | `af2e47b62c315ddf9ed05cab44842d8921bcb8c561b9cc2dcf103f1b1e8b31b7` | `dist/` |
| boot SHA-256 | `06d2f25665a17c0858c92245f257d6d339858149a5ed4679919d120d6eb4d80a` | `dist/` |

## 2. Baseline

All figures agree with STATUS; no disagreement found.

| | Value | Source |
| --- | --- | --- |
| worst line-238 fence margin | 785 (`director-complete-2` f5815) | STATUS "boot-loading-blank-screen" table (PAL audit, 48 + 8 mode-gated replays); `docs/runtime-wall-trace.json` has no fence field |
| DMA-on maximum / physical headroom | 31,121 / 4,447 | `docs/runtime-wall-trace.json` `semantics` |
| DLI per host frame / sequence violations | 2 / 0 | `docs/runtime-wall-trace.json`, STATUS |
| recorded clause failures | 16 | `docs/recorded-gate-failures.json`, equal to the evidence's `gate.behavioural_clause_failures` |
| `npm test` (default build) | 873 / 868 / 5 / 0 todo | STATUS "recorded-failures-review"; `docs/recorded-test-failures.json` |
| initial block | 13,621 B (STOP line 13,652) | STATUS |

## 3. Differences from the brief

1. **Labels.** The brief calls the menu-raster tests "D8" and the cycle-model test
   "D10". In the review, D8 is the showcase test, D9 the two menu-raster tests and
   D10 the cycle-model test. This plan follows the brief's *content*: two
   menu-raster tests and one cycle-model test, called D8 and D10 as in the brief.
2. **Which items are recorded clauses.** The 16 recorded clauses are the 12 engine
   first-DLI clauses, the three contact-raster clauses and the booster-release
   clause. `--raider-sector-only` and the remnant gate are mode-gated runs that are
   not part of `docs/runtime-wall-trace.json` and so not in the recorded set; the
   pickup traversal clause passes today. All three are repaired here as the brief
   asks, but none of them moves the recorded clause count.
3. **The review is right on every observer finding and incomplete on three
   scenarios** (§4): extending `--raider-sector-only` exposes a second clause that
   cannot hold in the current game, the contact-raster sessions need more than a
   longer budget, and the remnant floor needs more than a longer replay.
4. **D10 cannot be done under the hard constraints.** The JS cycle model is
   `scripts/runtime-cycles.mjs`, which `scripts/build.mjs` imports
   (`measureRuntimeCycles`); its output is `runtimeTiming` in the built manifest.
   It is a build script, and this task may not change build scripts. It stays
   recorded (§4, D10).
5. **D8 is not a mechanical regeneration.** `--menu-raster-only` stops on its first
   session (`atr-00 0:3 differs from the generated frontend asset`) on `main`
   too. The cause is the main-menu star sky (owner decision A′, 2026-09-23): the
   harness compares the menu screen with the generated asset without stars and
   pins one canonical raster, and a twinkling sky has no single raster (§4, D8).
   One of the two tests is a stale test pin and is cleared without a
   regeneration.

## 4. The items

Trace classes: (a) stale scenario, (b) observer or clause error, (c) runtime
defect a player would see. "Review" is the review's class; "Here" is this
plan's, with the evidence.

### 4.1 The 16 recorded clauses

| # | Session / clause | Review | Here | Evidence | Fix | Files |
| --- | --- | :---: | :---: | --- | --- | --- |
| 1-12 | `engine-atr-{a5,5a}-{0,1,2}-{immediate,delayed}`: "first DLI did not select byte three of the active A2 list" | (b) | **(b)**, confirmed | The hook counts the selection only while `dftrace_active` (measured main-loop window). With an additive observer for the wait after the end hook, MEASURED on `engine-atr-a5-0-immediate` and `engine-atr-5a-2-delayed`: 150 of 150 frames show exactly one selection, all in the wait, all at `$7F00 + active_lo + 3`; the in-session clause passes. | Observer: additive header fields `engine_playfield_select_idle_calls/_dlist/_active_lo`; the clause reads whichever window saw the frame's selection. Assertion unchanged (one per frame, byte three, at least one frame). | `scripts/atari800-wall-trace.h`, `scripts/trace-clause-observers.mjs`, `scripts/runtime-wall-trace.mjs` |
| 13 | `capital-contact-allied-medium`: "did not capture 16 consecutive contact rasters" | (a) | **(a)**, and more than a budget | MEASURED at 1,600 frames: the capital sector opens at 774 and a shell hits at 895, but no contact raster is captured (the mode-1 geometry `bolt.top == player.top + 4` never occurs) and the passive player loses two lives in the fighter phase (health 0 at 146 and 458), so the later "two HULL units, lives 3" clause cannot hold either. With a probe-only preamble (sweep + fire, health/lives held while the sector is OPEN) the sector opens at 667, three damage calls apply no damage (795, 859, 867: 10 → 10), and the geometry is still never captured. | **Owner (§5 Q3).** | — |
| 14 | `capital-contact-hostile-medium`: the same | (a) | **(a)**, and more than a budget | MEASURED at 1,600 frames: the capital sector never opens (`sector_state` 7 on all frames); the passive player at x 84 is worn down 9 → 1. With the probe preamble the sector opens at 667 and the first hostile hit (frame 1,077, 10 → 8) is preceded by a damage call that applies no damage (769, 10 → 10), which already breaks "exactly once"; no contact raster is captured. | **Owner (§5 Q3).** | — |
| 15 | `lower-playfield-hostile-contact-atr-hard`: the same | (a) | **(a)**, and more than a budget | Confirmed: on HARD the hostile shells stop at Y 180, under the policy's `shell_y ≥ 191`. MEASURED on MEDIUM at 1,600 frames (probe): the hostile shells reach only Y 156 there, because the shells' depth follows the player, so MEDIUM is not a fix either; one damage call at 953 and none captured. | **Owner (§5 Q3).** | — |
| 16 | `weapon-pickup-2-hunt-fire4`: "Booster release did not clear the capsule from its PMG plane in the release frame" | (b) (file says (c)) | **(b)**, confirmed | MEASURED with the new observer on the four release frames 311, 2184, 2377, 2537: `pickup_erase_calls` 2, `pickup_erase_writes` 1, `pickup_plane_rows` 0. The second entry is `publish_fighter_pickup_pmg` → `clear_fighter_pickup_pmg`, which finds `ENTITY_SCREEN_HI` 0 and returns (`src/main.s` `clear_fighter_pickup_pmg`). Every ACTIVE frame is 1 erase write. | Observer: additive header field `pickup_erase_writes` (entries that find the capsule published); the clause asserts one erase write and an empty plane. | same three files |

### 4.2 The mode-gated gates and the traversal clause

| Item | Review | Here | Evidence | Fix | Files |
| --- | :---: | :---: | --- | --- | --- |
| `--raider-sector-only` "did not return to post-sector OPEN" | (a) | **(a)**, confirmed, with a second clause behind it | MEASURED at 2,400 frames: sector entered at 870, back to OPEN at 1,954, formation readmitted after it. The run then stops at the next invariant, "did not run a three-Raider formation before the sector": the clause asks for `enemy_live_count === 3`, and the most the game ever has is 2 (`RAIDER_SLOT_COUNT = 2`, `src/c/lifecycle.c`; Heavy class = `P1`/`P2`, an AGENTS.md invariant). The readmission clause asks for 3 too. | Scenario: 1,800 → 2,400 frames (clauses untouched). The formation size is **owner (§5 Q2)**. | `scripts/runtime-wall-trace.mjs` |
| remnant gate, 63 kills vs 62 explosions | (b) | **(b)**, confirmed | `raider-remnant-spread` frame 2052: requests 1/1, one frame, one flash. Every other term of the gate passes on the 3 × 3,000 run (report `raider-remnant-native-report.json`). | Observer: the unit is the kill request; each request on a signature frame is one explosion. | `scripts/trace-clause-observers.mjs`, `scripts/runtime-wall-trace.mjs` |
| remnant gate, `kills >= 100` | (a) | **unreachable as scenario-only** | 3 × 3,000 frames: 63 kills (21 / 20 / 22). MEASURED 3 × 6,000 (probe): **90** kills (31 / 29 / 30), and two kills land on the player's final death frame (normal 4820, rapid 4771: `enemy_explosion_timer` 24, `COLBK` 0, `player_fighter_explosion_timer` 1, lives 0), where the player-death flash owns `COLBK` by design ("PlayerFighter death wins deterministic same-frame arbitration", `src/main.s` `update_sound`). | **Owner (§5 Q1).** Floor not changed. | — |
| pickup traversal clause cannot tell a debris slot from the pickup slot | (b) | **(b)**, confirmed | `entity_active_mask === 2` requires the whole entity plane to hold only the pickup; slot 0 is the debris slot (`ENTITY_TYPE_DEBRIS = 1`, `build/entity-effects.inc`). Over every 2026-10-01 CSV, a live slot 0 is always type 1, and only bits 0-1 of the mask are ever set. | Observer: the pickup's own bit set, no slot outside debris/pickup live, a live slot 0 holds a debris; capsule terms unchanged. The `fireDelay: 8` scenario stays. | same two files |

### 4.3 The recorded tests

| Test | Review | Here | Evidence | Fix | Files |
| --- | :---: | :---: | --- | --- | --- |
| D8 `menu-raster` "menu evidence preserves the audited boot streams and independent charsets" | D | **A**, a stale test pin | The test pins `a2_runtime` `$9000-$90FF` and `glue_holding` `$7F16-$8000`; the evidence carries `$9000-$90ED` and `$8100-$81FA`, which are the built manifest's `a2Kernel` and `integrationGlue.holdingAddress`. | Test derives both ranges from `dist/void-strike-65-manifest.json`, as the harness does. Passes. | `tests/menu-raster.test.mjs` |
| D8 `menu-raster` "native menu raster is exact for the ATR and four cold RAM fills" | D | **D**, with a clause that cannot hold | `--menu-raster-only` on `main`: `atr-00 0:3 differs from the generated frontend asset`. Diff of every snapshot: 14-16 screen bytes at the star cells (`$403B`, `$403D`, `$408B` …, values 64-71) and 8 charset bytes at glyphs 64-71; display list identical. The twinkle phase runs on across generations (0:3 and 1:3 differ at three star cells), so no single canonical raster exists; the harness pins `ee086284…` (re-accepted 2026-09-20, before the sky) and the test pins `ba90172f…` (older still). | **Owner (§5 Q4).** | — |
| D10 `runtime-wall-trace` "ten heaviest frames retain exact clock positions, VBI IDs and state" | D | **D**, stays recorded | The CPU reference is looked up by `session:frame` in `runtimeTiming.cpuReferenceFrames`, which `scripts/runtime-cycles.mjs` computes inside the build from its own JS replay (`counts.projectileSlots: 19`, the retired 10 + 9 pool); none of its 64 frames is among the emulator's ten heaviest. A fix changes a build script. | None in this task (hard constraint). Follow-up `chore/cycle-model-pairshot`. | — |

### 4.4 Optional: the fire-sound clause

"Every accepted shot starts the fire sound": on every frame with
`fire_accept_calls > 0` and sound enabled, `fire_timer_value` is `$33` at the
end hook (the accept routine loads `$32`, `update_sound` advances it in the same
frame) and the next frame starts with `fire_sfx` set; a run with no accepted shot
fails. MEASURED on the 2026-10-01 CSVs before writing it: **9,854** accepted-shot
frames in 56 replays, all `$33`, 0 violations. No header change. Added as an
`invariant` over the default run, with a coverage record.

## 5. Owner decisions needed (one STOP)

**Q1 — remnant gate's 100-kill floor.** (a) floor 50 on the 3 × 3,000 replays
(measured 63; recommended: the floor's job is enough kills to exercise the
remnant paths, and 46 of the 63 already have an emitter shot live); (b) longer
replays, about 3 × 7,000 frames, plus an observer rule that a kill on the
player's final death frame shows the player-death flash instead of `$1E`
(measured 90 at 3 × 6,000; adds about 4 minutes per run); (c) leave it failing.

**Q2 — `--raider-sector-only` formation size.** The two formation clauses ask for
three live Raiders; the game has two Heavy slots. (a) assert a full formation
of `RAIDER_SLOT_COUNT` = 2 before and after the sector (recommended); (b) leave
it failing.

**Q3 — the three contact-raster sessions.** (a) keep them recorded, reclassified
`a-stale-scenario` with the measurements above, and open
`chore/contact-scenario-redesign` (recommended for this task); (b) redesign them
now: a fighter-phase preamble with a trace-only health/lives hold (the contact
sessions are input-only today), a new steering to the mode-1 geometry and an
account of the no-damage calls — several
probe iterations, outcome not proven; (c) retire them.

**Q4 — D8, the menu raster.** (a) make the harness star-aware (screen equal to
the asset outside the 16 star cells, each star cell one of its legal glyphs,
charset equal to the asset plus the generated star glyphs) and pin the raster
with the star cells masked, which the owner accepts as the menu image now; (b)
keep the test recorded until the star sky is owner-accepted, with
`chore/menu-raster-regeneration` doing (a) then (recommended: the sky is still an
`OWNER-SMOKE CANDIDATE`).

## 6. Expected recorded sets after the task (with the recommended answers)

**Clause failures (`docs/recorded-gate-failures.json`): 16 → 3.**

| Removed | Fix |
| --- | --- |
| the 12 engine first-DLI clauses | observer counts the selection in the wait after the end hook |
| `weapon-pickup-2-hunt-fire4` booster release | observer counts erase writes |

| Stays | Class | Reason |
| --- | --- | --- |
| `capital-contact-allied-medium` | a-stale-scenario | capital opens at 774; no mode-1 contact captured; the passive player loses two lives before it |
| `capital-contact-hostile-medium` | a-stale-scenario | the capital sector does not open in 1,600 frames with the passive player at x 84 |
| `lower-playfield-hostile-contact-atr-hard` | a-stale-scenario | HARD hostile shells stop at Y 180; on MEDIUM they follow the player and stop at 156 |

**Test failures (`docs/recorded-test-failures.json`): 5 → 4.** Removed:
`menu-raster` "menu evidence preserves the audited boot streams…" (stale pin).
Staying: `github-showcase` (D, showcase recapture, out of scope), `menu-raster`
"native menu raster is exact…" (D, Q4), `preview` (C, `chore/preview-29-rows`),
`runtime-wall-trace` "ten heaviest frames…" (D, build-script constraint). New
tests: 8 in `tests/trace-clause-observers.test.mjs`, so `npm test` 873 → 881.

**Frame figures** (fence margin, DMA maximum, physical headroom, DLI): no guest
byte changes and the default replays are the same, so they must be unchanged;
the longer `raider-sector-atr-hard` replay is one of the eight mode-gated PAL
audit replays and may add a heavier row, which would be reported with that cause.

## 7. Phase B steps

1. Observer unit tests RED on the old observers, GREEN on the fix (done).
2. Header fields, harness wiring, scenario extension, test re-pin (done in tree).
3. Owner STOP for Q1-Q4; apply the answers.
4. Commit, then regenerate: `build:candidate` → `runtime:wall-trace` (fresh
   `build/runtime-wall-trace/`) → mode-gated runs → `build` → `npm test` once.
5. Reconcile both recorded files by name; ATR/boot SHA-256 unchanged; `git diff
   main --stat` clean of `src/`, cfg, build scripts, `dist/`, `docs/media/`.
6. STATUS, this plan marked implemented.

## 8. Phase B — what was applied (2026-10-01)

### 8.1 Owner answers

| | Decision | Applied as |
| --- | --- | --- |
| Q1 | floor 50 on the 3 × 3,000 replays | `RAIDER_REMNANT_KILL_FLOOR = 50`; the report carries `kill_floor` |
| Q2 | a full formation is `RAIDER_SLOT_COUNT` | read from `src/c/lifecycle.c` at run time (2); the report carries `formation_size` |
| Q3 | keep the contact sessions recorded | reclassified `a-stale-scenario` with the §4.1 measurements; follow-up `chore/contact-scenario-redesign` |
| Q4 | star-aware menu raster now, masked pin | `scripts/menu-raster-stars.mjs`; the owner accepted the masked raster `cfc72f31b6a9b148ce7f8944b323e39e118e916347554dab9d8a48f61441f476` on ATR `af2e47b6…` |
| — | commit `dist/void-strike-65-manifest.json` with the evidence | only `runtimeEvidence.reportSha256` and the embedded trace summary move |
| — | commit `docs/media/manifest.json`'s wall-trace hash | one line; no image bytes |

The last two resolve a conflict in the brief: regenerating the evidence moves
the report hash that both manifests carry, while the brief said `dist/` and
`docs/media/` must not appear in a commit.

### 8.2 RED → GREEN

`tests/trace-clause-observers.test.mjs` on the old observers (extracted
unchanged, plus a stub for the new fire-sound clause): **2 pass, 6 fail** —
first-DLI in the wait, first-DLI double selection, booster re-entry, traversal
beside a debris, same-frame double kill, fire sound. On the fix: **8 of 8 pass**.
The two negatives ("still fails when …") pass on both, as they must.
`tests/menu-raster-stars.test.mjs`, new with the model: 4 of 4.

### 8.3 Scenario rewrites

| Session | Old | New |
| --- | --- | --- |
| `raider-sector-atr-hard` | 1,800 frames | **2,400 frames** (OPEN again at 1,954; formation readmitted at 1,956) |
| remnant replays | 3 × 3,000 | unchanged (Q1) |
| contact-raster sessions | 560 / 360 / 1,200 frames | unchanged, recorded (Q3) |

### 8.4 Result

**Clause failures 16 → 3.** Removed, with the fix: the 12
`engine-atr-*` first-DLI clauses (observer sees the wait after the end hook) and
`weapon-pickup-2-hunt-fire4` booster release (observer counts erase writes).
Staying, class (a): `capital-contact-allied-medium`,
`capital-contact-hostile-medium`, `lower-playfield-hostile-contact-atr-hard`.
0 new.

**Test failures 5 → 3.** Removed: both `menu-raster` tests (one stale pin, one
regenerated under Q4). Staying: `github-showcase` (D), `preview` (C),
`runtime-wall-trace` "ten heaviest frames…" (D, build script). 0 new.
`npm test` 873 / 868 / 5 / 0 → **885 / 882 / 3 / 0**.

**Mode-gated gates.** `--raider-formation-only` PASS; `--raider-sector-only`
FAIL → **PASS**; remnant FAIL → **PASS** (63 kills = 63 explosions over 62 kill
frames, one same-frame pair); debris gate FAIL with the same single blank frame
(owner-accepted death-frame blink, summaries byte-identical to the previous run).

| Frame figure | before | after | source |
| --- | ---: | ---: | --- |
| worst line-238 fence margin | 785 (`director-complete-2` f5815) | **785**, same row | standalone PAL audit over 56 replays, 0 miss events, 0 rows over 32,568 |
| DMA-on maximum | 31,121 | **31,121** | `docs/runtime-wall-trace.json` `semantics` |
| physical headroom | 4,447 | **4,447** | same |
| DLI per host frame / violations | 2 / 0 | **2 / 0** | same, `gate.memory_integrity` |

`determinism.replay_fingerprint_sha256` moves: it hashes every parsed row, and
the rows carry the four additive columns. The fire-sound clause covers 7,598
accepted-shot frames in the default run (9,854 in §4.4 counted the mode-gated
CSVs too).
