# L1 audit fixes — OWNER-SMOKE CANDIDATE

Baseline `a3c8e47`; audited L1 `382b91a`; report merge `f84b1fd`; runtime/fixture repair `80b2f94`. The audit report is unchanged. The owner passed the pre-audit campaign `63bf14c0…` on 2026-10-24. The fixed candidate awaits a new real-65XE/SIO2SD smoke.

## Verification

| Check | Result |
| --- | --- |
| Normal build / computed gates | PASS; stale wall-trace binding is an explicit pending release WARNING |
| Initial content | 12,829 B; +34 vs pre-audit; 823 B planning slack |
| Initial / occupied sectors | 101 / 210; DFMC 11/11; menu run 240–250 |
| MAIN Light / window | 1,196 B, 17 B MAIN tail; 1,656 B window use, 1,155 B freed |
| ENTITY_CODE | 3,161 B, 5-B tail, same as clean main; +405 raw B vs pre-audit |
| State / reservations | no new gameplay state; M3-H 32 B unchanged; menu CFG tightened to $1180 |
| Per-frame crossings | zero new; every moved routine in [page-cross.md](page-cross.md) |
| Level-2 route | main 31,517 / fixed 31,517, delta 0; target +17, hard margin 1,051; no miss/VBI/DLI anomaly |
| All-state boss maxima | R1 7,596; Citadel 8,112/8,447; Spine 8,191/8,446; Bastion 8,478; all deltas 0 |
| Lost-target off/fire | Citadel 7,697/8,060 and 8,032/8,423; Spine 7,771/8,180 and 8,025/8,435; Bastion 8,058/8,467; deltas 0 |
| Boss entry, R1/R2/R3/R4 | 325/340/340/344 host frames, each <=350; all four short routes have no anomalies |
| Menu timing | patched cold 598/650; standard cold 1,384; added entry delay 41/50 |
| Boot smoke | four cold starts, RESET, 130XE, forced capital restore PASS |
| After-boss frontend | all four boss claims: pause before reload and all frontend states after checked reload PASS |
| Retry stack | 20 failed menu reads preserve SP |
| R1 scripted fight smoke | 2,399 frames, one escort Light, lance charge/flight observed; max 29,144 wall cycles, zero anomalies |

Source game artifacts remain byte-identical across the later host-fixture repairs. The campaign hash is `410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7`. Every final candidate is rebuilt after the final commit; `build/l1-owner-smoke/candidate.json` records its actual build HEAD and complete hashes.

## One full npm test and focused comparison

Exactly one full `npm test` ran: **1,566 tests, 1,459 pass, 107 fail** ([log](l1-audit-npm-test.log)). No second full run, release build, long wall trace, stage-2 evidence, showcase or failures reconciliation was run.

The audit’s **four pre-existing failures** describe only its 15-file fixture subset. They do not describe the full suite. Every one of the 107 failed full-run names was selected in a focused comparison on a clean-main detached worktree: **24 pass / 83 fail** ([baseline log](l1-audit-base-full-failures.log)). Subsequent focused repairs clear all 24 L1 failures and two old window-ledger failures: **26 cleared, 81 remaining, zero new failures versus main**. The renamed eleven-entry directory test passes in the full-file focused check; the selected-name rerun contains 106 tests for that reason. The final window-footprint pin passes separately.

The remaining failures match main by name and first assertion/cause. Two completion-handoff failures print `$366A` rather than `$B49F` because the capital completion vector moved; both still fail at the same native call assertion. This does not promote any remaining test debt to owner-accepted status. The accepted failure registry is not broadened. Every remaining first assertion and its baseline counterpart are in [test-results.json](test-results.json).

The former `boss-runtime` read-order failure now passes: it asserts the actual eight sectors 712–719, not only the lance’s six. Its separate final-win/summary test still fails on main and fixed L1. The earlier 107/107 claim omitted this file; the complete result below includes it.

Further fixture repairs found by the full run: clear PMG via the real $3B00–$3FFF path, preserving MAIN Light; clear the reused gameplay ring after GLUE publication; model actual menu SIO reads in the consecutive-score test; read frontend text from its menu-phase runtime image. The frozen splash hash is retained after verifying and normalising only its relocated `JSR wait_frame_start` operand; no art hash is casually replaced. Old exact resource pins now name the real L1 layout; tests retain the original sector, byte and boundary gates.

The final edited/affected-file focused run executes **482 tests: 453 pass,
29 fail, all 29 reproduced in the main comparison** ([log](l1-audit-edited-tests.log)).
It includes the shared weapon-pickup callers after the real PMG clear and
ring-initialisation repairs. The 5,000-kill Raider fixture also passes.

## Every edited test file

| File | Final result |
| --- | --- |
| `tests/basic-window-capacity.test.mjs` | PASS (full run or required focused repair) |
| `tests/boot-splash.test.mjs` | PASS (full run or required focused repair) |
| `tests/boot-xex-reclaim.test.mjs` | PASS (full run or required focused repair) |
| `tests/boss-claim.test.mjs` | PASS (full run or required focused repair) |
| `tests/boss-overlay.test.mjs` | PASS (full run or required focused repair) |
| `tests/boss-runtime.test.mjs` | 1 pre-existing failure(s); other checks pass |
| `tests/branding.test.mjs` | PASS (full run or required focused repair) |
| `tests/debris-score.test.mjs` | PASS (full run or required focused repair) |
| `tests/entity-effects.test.mjs` | 1 pre-existing failure(s); other checks pass |
| `tests/formats.test.mjs` | 2 pre-existing failure(s); other checks pass |
| `tests/frontend.test.mjs` | PASS (full run or required focused repair) |
| `tests/game-over.test.mjs` | PASS (full run or required focused repair) |
| `tests/gameplay-music.test.mjs` | PASS (full run or required focused repair) |
| `tests/gfx-pins.test.mjs` | 2 pre-existing failure(s); other checks pass |
| `tests/hybrid-c-arena.test.mjs` | PASS (full run or required focused repair) |
| `tests/l1-reservation.test.mjs` | PASS (full run or required focused repair) |
| `tests/lance.test.mjs` | PASS (full run or required focused repair) |
| `tests/layout-d1.test.mjs` | PASS (full run or required focused repair) |
| `tests/level-buffer-16.test.mjs` | PASS (full run or required focused repair) |
| `tests/level-payload.test.mjs` | 1 pre-existing failure(s); other checks pass |
| `tests/level-summary-build.test.mjs` | 2 pre-existing failure(s); other checks pass |
| `tests/light-interceptor.test.mjs` | 1 pre-existing failure(s); other checks pass |
| `tests/light-wingman.test.mjs` | PASS (full run or required focused repair) |
| `tests/loader-screen.test.mjs` | PASS (full run or required focused repair) |
| `tests/menu-stars.test.mjs` | PASS (full run or required focused repair) |
| `tests/music-v2-runtime.test.mjs` | PASS (full run or required focused repair) |
| `tests/overlay-slot.test.mjs` | PASS (full run or required focused repair) |
| `tests/pause.test.mjs` | PASS (full run or required focused repair) |
| `tests/pickup-boost-colour.test.mjs` | 1 pre-existing failure(s); other checks pass |
| `tests/score.test.mjs` | 1 pre-existing failure(s); other checks pass |
| `tests/sector-reader.test.mjs` | PASS (full run or required focused repair) |
| `tests/starfield-staging-streams.test.mjs` | PASS (full run or required focused repair) |
| `tests/starfield.test.mjs` | PASS (full run or required focused repair) |

Shared native helpers (`tests/boss-harness.mjs`, `tests/lance-states.mjs` and runtime scripts) are exercised by these tests and the full reachable stress sweeps.

## Reproduction

Use the existing npm scripts and focused helpers. `scripts/measure-l1-page-cross.mjs <clean-main-worktree> .` emits the complete listing-based comparison. The level-2 route is `node scripts/runtime-wall-trace.mjs --atari800-source=build/atari800-trace --artifacts=build/level-2-s0 --smoke-frames=3000 --smoke-difficulty=2 --only-session=observer-smoke` after the corresponding `--level=2:sector=0` build. Do not run it concurrently with the full suite: `tests/level-two.test.mjs` rebuilds that directory.

The first concurrent L1 route attempt was invalidated when that test removed its output directory; the valid rerun is [level2-fixed.json](level2-fixed.json), compared with [level2-base.json](level2-base.json). Boot smoke’s first attempt exposed an observer PC alias during transient stage 2; the observer now admits gameplay only after frontend entry. The unchanged strict handoff assertion passes in [boot-smoke.json](boot-smoke.json).

## Owner smoke still required

Cold boot to menu; every frontend screen; pause/pause-quit in level 1 and after one boss; level 1 Lights and capital; one boss fight with an escort. Keep the disk inserted at every menu entry. GAME OVER then MAIN MENU still reads twice. This is an owner-smoke candidate, not release evidence.
