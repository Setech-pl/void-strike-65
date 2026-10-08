# Evidence integrity — AUD-05, AUD-06, AUD-07, reconciliation, boss-sector coverage

**Status: done, `OWNER REVIEW CANDIDATE`** (2026-10-08, `chore/evidence-integrity`
from `main` `85fccb7`). Game bytes unchanged: ATR
`77d4cbf6aa74ccb98d2f62bb4e687f8bbbeef64407e839d27e1afc77a7e2358d`, boot
`4154b5f451de55f50d7e321bd2754f2230d0073d33320e49aaed561bc4745b04`, before and
after. Findings register: [audits/README.md](../audits/README.md).

## 1. Audit findings

| Finding | What was found | What changed | Commits |
| --- | --- | --- | --- |
| AUD-05 | The recorded `preview` test failed at `:129` on decision U's COLPF2 `$1E`; COLPF2 is `$AE` (`src/main.s:566`, plasma FX B2). Behind it, one loop held the shape, allied-steel and hull-source checks. | Re-pinned to `$AE`. The test now fails at `:164`, the `player_shape` variant: the recorded class C cause (`chore/preview-29-rows`), not a new defect. The steel and hull checks are a separate test, which passes. | `a037d93` |
| AUD-06 | `auditSession().passed` meant "no miss event". The CLI passed on 0 replays and skipped unreadable inputs. On raw CSVs it also counted the boss-entry transition row as a miss (13 false misses over the CSVs in `build/`). | PASS = no miss, worst fence margin ≥ 500, DMA-on ≤ 32,568, ≥ 1 row; `fence_caught` is detection-only; the CLI fails on no replay or an unreadable input and sets the boss-entry row aside; the harness binds the audits' PASS into `gate.timing_and_dli_passed`. RED: 9 of 10 new tests failed on `main`'s code; GREEN: 17/17. | `4693600`, `02aaf4d` |
| AUD-07 | The five named passages, plus: TOP SCORES vs the save write, the M1 Wingman paragraph, the frame-600 capital paragraph, the campaign block's "none implemented", two stale `src/main.s:3892` pointers. | Rewritten to what the code runs, each with `file:line`; history labelled. No code changed. | `03eb693` |

## 2. Reconciliation by first assertion

`scripts/reconcile-failures.mjs` (`npm run failures:reconcile -- --tests <log>…
--trace <report.json>…`) reads saved spec-reporter logs and trace reports. It
matches failures against `docs/recorded-test-failures.json` (by `file` +
`test`, then `first_failing_assertion` + `first_failing_message`) and against
`docs/recorded-gate-failures.json` (session + message; the message is already
the clause's first assertion). It prints NEW, MOVED and disappeared failures,
and exits 1 on NEW, MOVED or an unreadable input. Wired into AGENTS.md's
default-build rule and the docs map. Tests: `tests/reconcile-failures.test.mjs`.

## 3. Gate and failure-list assertions checked for vacuity (item 5)

| Site | Verdict |
| --- | --- |
| `tests/runtime-evidence-binding.test.mjs:80,83` unrecorded / cleared `[]` | Proven: evidence complete, `required_sessions > 0` (`:75`) |
| `tests/release-gate-semantics.test.mjs:89,136` | Proven: the synthetic tests inject failures both ways |
| `tests/runtime-wall-trace.test.mjs:322-330` L1-L5 | Proven: each subject asserted `> 0` |
| `tests/runtime-wall-trace.test.mjs:1057-1063` shield overruns | Proven: computed from rows, `shield_frames >= 250` |
| `tests/runtime-wall-trace.test.mjs:61-63` (also `:917`, `:1009`, `:1162` per session) `deadline_overrun_frames` / `missed_frames` / `extra_vbi_boundaries` = 0 | Vacuous as an overrun proof: nframes-derived, so they cannot see a fence miss. The proof is now the PAL audit in `timing_and_dli_passed` (AUD-06). Recorded in the test. |
| `tests/runtime-wall-trace.test.mjs:573-580` `weapon_pickup_spread_shot` overruns / passed | Vacuous: literals in the harness (frozen checkpoint); the frame counts beside them are live. Recorded. |
| `tests/runtime-wall-trace.test.mjs:760` `debris_visual_polish.budget_overrun_frames` | Vacuous: a literal in the harness (frozen checkpoint). Recorded in the test. |
| `tests/runtime-wall-trace.test.mjs:788` `explosion_colour_flash.budget_overrun_frames` | Vacuous, literal. Recorded. |
| `tests/runtime-wall-trace.test.mjs:851-855` `destructible_debris` overruns / passed | Vacuous, literals. Recorded. |
| `tests/runtime-wall-trace.test.mjs:912-914` `enemy_breakup_effects` overruns / passed | Vacuous, literals (`target_overrun_frames: 4`). Recorded. |

The frozen-checkpoint records cannot be made to measure a subject on today's
build. The live per-frame gates are `weapon_pickup_shield` (from the rows) and
the PAL audit.

## 4. Boss-sector coverage of the memory-integrity replays (item 7)

The integrity checks are the observer's per-host-frame DLI-phase check (three
DLIs in the boss sector), the booster-cycle clause and the pause clause.
MEASURED from the trace CSVs (boss frames: `boss_state > 0`, entry set aside;
laser-active: `laser_states ≠ 0`).

| Replay | Budget before → after | Boss entry | Boss frames before → after | Laser-active before → after |
| --- | --- | ---: | ---: | ---: |
| `atr-2-evasive-fire4` | 4,000 → 4,000 | — | 0 → 0 | 0 → 0 |
| `atr-2-hunt-fire5` | 4,000 → 4,700 | 3,736 | 263 → 963 | 0 → 75 |
| `atr-2-hunt-fire6` | 4,000 → 4,821 | 3,738 | 261 → 1,082 | 0 → 27 |
| `atr-2-hunt-fire7` | 4,000 → 4,000 | — | 0 → 0 | 0 → 0 |
| `atr-0-hunt-fire5` | 4,000 → 5,100 | 4,475 | 0 → 624 | 0 → 0 |
| **five replays** | | | **524 → 2,669** (2 → 3 replays) | **0 → 102** (0 → 2 replays) |

**Not reachable by budget; owner decision needed.**
* `evasive-fire4` and `hunt-fire7` lose every life after the capital, and the
  level restarts (evasive at 2,067 / 2,981 / 4,053, hunt 7 at 2,670). They
  reach no boss at any budget (probed to 4,700).
* `atr-0-hunt-fire5`'s fight fires no laser: none in 2,524 boss frames of a
  7,000-frame probe.

Compliant alternatives: (a) hold the two dying replays' lives, as the
director-complete replays do (scenario change; the replays would lose their
game-over/restart coverage); (b) add a sixth integrity replay chosen to
reach the lasers; (c) accept three of five, with the lasers covered by
`hunt-fire5` and `hunt-fire6`.

Subjects of the boss-sector clauses over the whole trace: boss DLI = 3 (all
boss rows) 32,151 → 34,296; laser-active rows 1,254 → 1,356; boss phases
(director-complete) 3 replays; laser contact 1; slot E 3; sessions in the
boss sector 13 → 14. Integrity gate: 19,998 → 22,618 frames (399.96 →
452.36 s), booster cycles 11 → 14 (clause ≥ 10), DLI violations 0, at most
2 DLIs a non-boss host frame.

## 5. Gates and runs

| | Before (`main` `85fccb7`, STATUS) | After |
| --- | --- | --- |
| Replays / clause failures / miss events | 57 / 0 / 0 | 57 / 0 / 0; PAL audit PASS over 57 |
| Worst fence margin | 1,472 (`2-sweep-fire6` f311) | 1,472, the same frame |
| DMA-on maximum | 31,304 (`memory-integrity-atr-2-hunt-fire5` f2388) | 31,304, the same frame |
| Boss entry | 245 host frames | 245 |
| Trace time | — | 1,656 s |
| `npm test` (default build) | 1,195 / 1,194 / 1 | run 1: 1,211 / 1,209 / 2 / 0 skipped (`github-showcase` read the media manifest before the regenerated hash was written; cleared by `npm run showcase`, `6a4f21c`); run 2: 1,211 / 1,210 / 1 / 0 skipped |
| Recorded test failures | `preview` @ `:129` | `preview` @ `:164`, "the gameplay preview must change when player_shape changes" (class C) |
| Recorded clause failures | none | none |

## 6. Rename (item 6, Lights audit LA-7)

`live_interceptor` → `live_heavy_formation` (`enemy_active == 1`, the Heavy
formation state). The name came from the trace header, so it is renamed there
(the struct field and the CSV column), in the harness and in the test, and the
trace emulator was re-prepared. `docs/plans/m5-loading-boss.md:2143` keeps the
old name as a historical record.
