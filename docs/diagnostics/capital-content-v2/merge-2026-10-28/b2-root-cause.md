# B2 root-cause and load-failure audit — 2026-10-28

**STOP: confirmed content-load error-path defect.** No production, test or assertion changes in the primary checkout. All experiments ran against byte-bound source archives under `build/b2-root-cause/`; their diagnostic edits are uncommitted and isolated. Branch/HEAD: `codex/capital-content-v2-merge` / `9ea08d2`. Code comparison: `5053697` versus `434871e`.

## Result

Missing content sectors are **not one root cause for all 38 B2 tests**. The shared fixture already reads all 15 content sectors (manifest run 12, sectors 265–279), returns with L2_VALID=1, and installs all 1,920 bytes exactly. It leaves game_state=0, while the guarded content veneers require GAMEPLAY=6. The main implementation did not require that phase check on these isolated calls.

A single phase-only diagnostic makes **24/38 pass**. Correct phase plus legal host ROL A support plus a Drive-backed bare INIT makes **29/38 pass**, without any assertion edits. All 38 original failures reproduce in the isolated unmodified run. Merely serving the content to the bare INIT does **not** make its test pass: it then fails 313,589 cycles versus 45. The original shared-fixture content delivery was already successful.

[Every test, original divergence, diagnostic results, fault commands and bindings](b2-root-cause.json). Group A (134 shared failures) was not selected, edited or reclassified; the five B1 expectations were also untouched.

## Diagnostic runs

| Isolated change | Selected | Pass | Fail |
| --- | ---: | ---: | ---: |
| original | 38 | 0 | 38 |
| phaseOnly | 38 | 24 | 14 |
| phaseRolDrive | 38 | 29 | 9 |
| noPhaseRolDrive | 38 | 1 | 37 |
| driveOnlyLifetime | 1 | 0 | 1 |

`noPhaseRolDrive` is a combined control with ROL and Drive corrections but no phase correction: its sole pass is the plasma test, which already enters GAMEPLAY via real start_gameplay. It is not a serving-only experiment. `driveOnlyLifetime` changes only the bare INIT caller to an ATR-backed Drive and still fails the unchanged 45-cycle pin. `phaseOnly` includes the existing level-2-s0 build copied into the isolated archive; no variant assertion is satisfied using a missing artifact.

## All 38 B2 tests, grouped

For each entry below, “main expected” is the original assertion that passed on main; the original full baseline run established that result. The first fixture/control divergence is explained for its group. All use the checked shared ATR fixture, including the content record; G5 additionally makes an unhooked second INIT call. Supplying content alone makes **none of the 38 complete tests pass**: 37 already receive it, and G5 then reaches a different unchanged assertion.

### G1 — Fixture has checked content but leaves phase outside GAMEPLAY (24)

L2_VALID=1 and all 1920 content bytes match, but fixture game_state=0. Main policy ignores phase; merge resident veneers return before row/admission policy unless phase=6. Phase-only diagnostic fixes the complete test.

- `tests/encounter-director.test.mjs > T3: the row tick advances the sector index from a poked core page and arms its first wave`
  - First observed assertion: `tests/encounter-director.test.mjs:233`; merge `0`, main expected `1` (16 rows end a 16-row sector). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/encounter-director.test.mjs > T11: a level completes at the end of its LAST authored sector, whatever their number`
  - First observed assertion: `tests/encounter-director.test.mjs:258`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/encounter-director.test.mjs > world-row glue is inactive in DYING/GAME OVER and advances exactly once when active`
  - First observed assertion: `tests/encounter-director.test.mjs:346`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/encounter-director.test.mjs > admission accounts intensity, enforces budget and fails soft`
  - First observed assertion: `tests/encounter-director.test.mjs:359`; merge `false`, main expected `true` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/encounter-director.test.mjs > the level completes exactly once at the end of its last sector and closes admissions`
  - First observed assertion: `tests/encounter-director.test.mjs:448`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/encounter-director.test.mjs > focused production replay exposes three early qualified kills and one natural pickup`
  - First observed assertion: `tests/encounter-director.test.mjs:576`; merge `false`, main expected `true` (difficulty 0 first visible undefined). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/encounter-director.test.mjs > ordinary admission is slot-safe, RNG-stable and pre-sector compatible`
  - First observed assertion: `tests/encounter-director.test.mjs:607`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/heavy-package.test.mjs > M3-H assault: opposite descent parity, unchanged pursuit, exact planes and bounded standing cost`
  - First observed assertion: `tests/heavy-package.test.mjs:28`; merge `0`, main expected `true` (Heavy request admitted). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/heavy-package.test.mjs > M3-H HP, flash hue, and spawn delta on every difficulty`
  - First observed assertion: `tests/heavy-package.test.mjs:28`; merge `0`, main expected `true` (Heavy request admitted). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/heavy-package.test.mjs > M3-H armoured authored hold and surviving-hit dodge retain Y and the stop`
  - First observed assertion: `tests/heavy-package.test.mjs:28`; merge `0`, main expected `true` (Heavy request admitted). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/heavy-package.test.mjs > M3-H Bomber flying hit dodges, authored stop survives hit, and flash stays in hue C`
  - First observed assertion: `tests/heavy-package.test.mjs:28`; merge `0`, main expected `true` (Heavy request admitted). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/heavy-package.test.mjs > M3-H shared wave arm leaves Heavy metadata untouched on Light/boss escort paths`
  - First observed assertion: `tests/heavy-package.test.mjs:134`; merge `0`, main expected `true` (Heavy request admitted). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/hybrid-lifecycle.test.mjs > T6: a sector whose mask excludes an archetype never spawns it, and the validator agrees`
  - First observed assertion: `tests/hybrid-lifecycle.test.mjs:397`; merge `4`, main expected `3` (the Raider wave spent one of its four formations). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/level-payload.test.mjs > T13: the star pixel changes at sector entry and only there`
  - First observed assertion: `tests/level-payload.test.mjs:399`; merge `16`, main expected `32` (row 1). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > early end: a sector whose waves are spent ends on the first row tick with the field clear`
  - First observed assertion: `tests/sector-flow.test.mjs:122`; merge `0`, main expected `1` (the sector ends on the first row tick after its last formation). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > early end: never with a formation pending, the Light lock up, or an escort Light live`
  - First observed assertion: `tests/sector-flow.test.mjs:141`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > early end: a Light wave's sector ends once the wave is spent and its last Light is gone`
  - First observed assertion: `tests/sector-flow.test.mjs:152`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > early end: a sector with no waves still lasts its rows, and the row count is still the cut`
  - First observed assertion: `tests/sector-flow.test.mjs:160`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > afterCleared: the wave arms on its row only once the field is clear; the row is a minimum`
  - First observed assertion: `tests/sector-flow.test.mjs:183`; merge `1`, main expected `2` (armed on the first row tick after the field clears). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > afterCleared: a wave without the flag arms on its row under a live formation, as before`
  - First observed assertion: `tests/sector-flow.test.mjs:201`; merge `1`, main expected `2` (armed on row 8 with the Raider pair still live). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > C1: a live Heavy formation holds an elite sector's end before a swarm, and lets go when it has gone`
  - First observed assertion: `tests/sector-flow.test.mjs:217`; merge `0`, main expected `1` (released on the first row tick after it has gone). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > C1: two swarm Lights hold the end before an elite sector; one is within its ceiling`
  - First observed assertion: `tests/sector-flow.test.mjs:227`; merge `1`, main expected `0` (the cut cancels the members not yet admitted). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > C1: no hold where the next sector admits the population (elite after elite)`
  - First observed assertion: `tests/sector-flow.test.mjs:241`; merge `0`, main expected `1` (a pair and one Light are legal in an elite sector). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > C1: the last sector's cut still completes the level`
  - First observed assertion: `tests/sector-flow.test.mjs:256`; merge `0`, main expected `1` (Expected values to be strictly equal:). Phase-only: **PASS**; phase+ROL+Drive: **PASS**.
### G2 — Host CPU lacks legal ROL A ($2A) (5)

New content code executes ROL A at $11BB. The Atari instruction is legal; scripts/nmos6502.mjs lacks its definition. Most of these tests first need the phase correction; plasma boot already enters real start_gameplay, catches the host exception and reports sector 0. Adding host ROL A resolves these tests without assertion edits.

- `tests/encounter-director.test.mjs > natural capital exit performs one scene recycle on every world row`
  - First observed assertion: `tests/encounter-director.test.mjs:1066`; merge `false`, main expected `true` (natural capital DRAIN did not reach COMPLETE). Phase-only: **FAIL**; phase+ROL+Drive: **PASS**.
- `tests/level-one-waves.test.mjs > W2: on every difficulty each post-capital wave arms; the swarm holds several Lights, (a) its Interceptor`
  - First observed assertion: `tests/level-one-waves.test.mjs:161`; merge `null`, main expected `true` (difficulty 0: the level never reached the boss). Phase-only: **FAIL**; phase+ROL+Drive: **PASS**.
- `tests/level-two.test.mjs > step 3: the Director reads level 2 - six sectors, the capital on row 1,120, three Lights in a swarm sector, complete after sector 6`
  - First observed assertion: `tests/level-two.test.mjs:132`; merge `[ 0 ]`, main expected `[ 0, 1, 2, 3, 4, 5 ]` (EASY: every sector entered once, in order). Phase-only: **FAIL**; phase+ROL+Drive: **PASS**.
- `tests/plasma-fx.test.mjs > the growth glyph codes were displayed by nothing on the gameplay screen`
  - First observed assertion: `tests/plasma-fx.test.mjs:251`; merge `false`, main expected `true` (the drive reached sector 0, not the boss entry). Phase-only: **FAIL**; phase+ROL+Drive: **PASS**.
- `tests/sector-flow.test.mjs > level 1: the time to the boss falls on every difficulty`
  - First observed assertion: `tests/sector-flow.test.mjs:266`; merge `null`, main expected `true` (difficulty 0: the level never reached the boss). Phase-only: **FAIL**; phase+ROL+Drive: **PASS**.
### G3 — Synthetic row-only callers assume immediate capital admission (4)

After correcting phase (and ROL where reached), heavy_entry_ready records FRAME_COUNTER and requires a difference >=2. These tests issue rows without advancing active frame time. Main advances immediately; merge remains sector 0 / OPEN=7 / DUE=0. This follows the accepted two-frame Heavy-clear admission guard, but requires fixture time modelling or a separately reviewed expectation, not missing disk sectors.

- `tests/encounter-director.test.mjs > director init and world rows are deterministic and do not touch game RNG`
  - First observed assertion: `tests/encounter-director.test.mjs:319`; merge `0`, main expected `3712` (Expected values to be strictly equal:). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
- `tests/encounter-director.test.mjs > first capital admission is due on the authored ROW and retries until the playfield drains`
  - First observed assertion: `tests/encounter-director.test.mjs:833`; merge `7`, main expected `0` (the first legal attempt admits on the authored row). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
- `tests/encounter-director.test.mjs > the capital encounter is entered once and no later row interrupts it`
  - First observed assertion: `tests/encounter-director.test.mjs:881`; merge `0`, main expected `1` (and the Director waits in the capital sector for it). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
- `tests/hybrid-lifecycle.test.mjs > first-capital scheduling and future boss handoff stay high-level C decisions`
  - First observed assertion: `tests/hybrid-lifecycle.test.mjs:199`; merge `0`, main expected `128` (row 272 enters the CAPITAL sector and raises DUE). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
### G4 — Timeline expectations pin the Heavy stream before the accepted departure cutoff (4)

After phase and host ROL correction, the accepted 120-row pre-capital departure runway blocks new Heavy admission before the old stream completes. Synthetic no-real-fire timeline observes six formations in 700 frames against its old ten reference; authored-order string becomes R4 B2 R1 B1 R1 instead of R4 B4 R1 B1 R1. These are gameplay expectation effects, not disk/SIO fixture omissions.

- `tests/level-one-equivalence.test.mjs > T4: the Heavy stream keeps the cadence and the density it had before the level was data`
  - First observed assertion: `tests/level-one-equivalence.test.mjs:81`; merge `false`, main expected `true` (0 Heavy formations in 700 frames against the pre-change 10). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
- `tests/level-one-equivalence.test.mjs > owner decision 8: EASY plays the alternating order, at the density it had`
  - First observed assertion: `tests/level-one-equivalence.test.mjs:198`; merge `''`, main expected `'R4 B4 R1 B1 R1'` (Expected values to be strictly equal:). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
- `tests/level-one-equivalence.test.mjs > owner decision 8: MEDIUM plays the alternating order, at the density it had`
  - First observed assertion: `tests/level-one-equivalence.test.mjs:198`; merge `''`, main expected `'R4 B4 R1 B1 R1'` (Expected values to be strictly equal:). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
- `tests/level-one-equivalence.test.mjs > owner decision 8: HARD plays the alternating order, at the density it had`
  - First observed assertion: `tests/level-one-equivalence.test.mjs:198`; merge `''`, main expected `'R4 B4 R1 B1 R1'` (Expected values to be strictly equal:). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.
### G5 — L2 INIT isolated as a disk-free 45-cycle call (1)

bossGateMemory already loaded the content and set GAMEPLAY. The test clears L2_VALID and calls $1900 on a CPU with no POKEY/PIA hooks. New INIT tries another checked content read. Default memory cannot complete the protocol; call reaches four-million-step limit. Supplying the real ATR-backed Drive alone makes INIT return, but test still fails: 313589 instruction cycles versus 45. The added checked read changes what that measurement contains.

- `tests/l2-lifetime.test.mjs > L2 lifetime: complete boss main-loop bodies use installed images until real START GAME checked reload`
  - First observed assertion: `tests/l2-lifetime.test.mjs:55`; merge `4000000`, main expected `4000000` (routine $1900 did not return). Phase-only: **FAIL**; phase+ROL+Drive: **FAIL**.

## Production failure-mode check

The probe executes the real checked reads and `summary_level_loaded` continuation, with loading phase=1. Faults apply to the first sector of the selected run on every retry; all other sectors come from the exact bound ATR. Device error, silent timeout, bad wire checksum and valid-wire/wrong-image checksum are separate cases. Both builds use the same host CPU and POKEY model.

| Read / result | 5053697 | 434871e |
| --- | --- | --- |
| Healthy L2 (and content where present) | Summary wait; VALID=1; guarded START allows gameplay | Same |
| L2 device error | Failure screen; VALID=0 | Same |
| L2 timeout | Failure screen; VALID=0 | Same |
| L2 bad wire checksum | Failure screen; VALID=0 | Same |
| L2 wrong-image checksum | Failure screen; VALID=0 | Same |
| Content: any of those four faults | No content record exists on main; no direct same-record comparison is possible | **Normal summary wait; VALID=0; no failure-screen transfer; START returns to checked reader** |

This distinguishes an observed new error-path defect from an unsupported claim that normal load failure strands gameplay in a sector. Real L2 failures do **not** enter gameplay on either build. Real content failure also does not enter gameplay: the existing START gate prevents it. On main, a successful L2 load suffices to start; on merge the new content dependency can fail, but its failure is handled as normal-summary completion instead of the required read-error screen. The degraded error/exit path is confirmed; no partial-content execution or stalled playable-sector reproduction is claimed.

Mechanism: `l2_content_load` returns via `sector_reader_report_bad_image` on failure, forcing status 4 and carry set (even for device error/timeout/wire failure). `summary_load_l2` tests carry after the L2 run, **but not after L2_INIT**; its following LDA MUSIC_ACTIVE does not propagate a failure branch. Execution reaches `summary_wait` at $05CA. The summary later prints its normal FIRE prompt. FIRE returns to the reader caller, which jumps to `start_gameplay`; VALID=0 sends it back to $A000 loading. A persistent content fault therefore repeats normal summary/loading instead of offering the existing error-screen FIRE-to-menu exit.

Sector progression, Heavy admission, capital entry and boss entry are **unreachable after a real failed load** until a checked reload succeeds; this is enforced by the measured START boundary. No read occurs in normal fighter/capital gameplay, so a load failure was not observed asynchronously invalidating a running sector. Capital death/respawn do not invalidate; boss install and real exits do, as before. Real boss install uses its own installed image and frame loop; missing fighter content must not be treated as a boss policy dependency. Those successful native lifecycle routes were not refreshed here.

For completeness, a **forced**, otherwise identical invalid-GAMEPLAY state demonstrates the changed policy contract: main row tick 0→1 and Heavy remaining 4→3/admitted; merge row 0→0 and remaining 4→4/refused. Both disarm calls return with VALID=0, cached rate=0 and resident enemy hook $3114. This forced probe is not evidence that checked-read failure can bypass the production START guard. If an independently reachable invalid-in-game path is later shown, the changed contract can stall progression and needs a separate fix.

## Recovery choices — not implemented

1. **Transfer content-load failure directly to the existing reader failure screen.** Candidate: replace the current three-byte failure JMP with the failure-screen JMP ($A0D6), retaining the reader’s error A instead of mapping every fault to BAD IMAGE. Player sees the same error and FIRE-to-menu path as other mandatory reads. **ESTIMATE:** code/RAM delta 0 B; same JMP instruction cost (0 steady-state CPU/raster delta); cold error path only. Risks: cross-link pin and all INIT callers must be checked; non-returning error flow must preserve the existing lifecycle contract. No feasibility PASS claimed.
2. **Propagate INIT carry through the summary caller.** After JSR L2_INIT, use a local success branch plus JMP summary_failed. Player gets the existing error exit, and INIT retains a callable return contract. **ESTIMATE:** +5 summary B, +0 state B; +3 successful cold cycles / +5 failed cold cycles, no per-frame work. The summary currently uses **1792/1792 B**, so at least five bytes must first be recovered inside its existing reservation. Error status would still be collapsed to BAD IMAGE unless that separate tail is corrected. Risk: narrow summary budget and every cold-call contract need verification.

Both choices stay within the C/ASM boundary: this is checked-loader error transport, not gameplay policy. Do not enlarge the summary reservation or consume protected RAM without an owner decision. No change was made to either path.

## Reproduction and scope

- Production fault probe: `node docs/diagnostics/capital-content-v2/merge-2026-10-28/b2-failure-probe.mjs main` (then `merge`). It expects source/artifact archives at `build/b2-root-cause/{main,merge}`. No production writes.
- Forced-invalid probe: same arguments to [b2-invalid-probe.mjs](b2-invalid-probe.mjs).
- Focused runner: [b2-focused-runner.mjs](b2-focused-runner.mjs), argument `0` or `6`, runs exactly the 38 IDs from the prior baseline audit in the isolated merge archive. `0` means do not set the diagnostic phase.
- [Diagnostic-only patch](b2-diagnostic.patch) shows the isolated phase override, host ROL implementation and disk-aware lifetime call. Apply only to the source archive, never to production as an accepted fix. All assertion values are unchanged.
- Archives were extracted with git archive from 5053697 and 9ea08d2 (merge production source identical to 434871e), then given the existing matching build files. Main ATR SHA-256: `79d1fa59e53ce627008ee6ba3b4d4c0dbeff8776aa572380e7ae0397e5372f9d`; merge: `a6957d406a4e339863503fd36ab05eb284a8e0ba30e9e1247a724279839bb60d`. Both were verified against their own manifests before execution. Main’s generated artifacts were copied; its checkout was not modified.
- Full focused raw logs, JSON matrix outputs and the source archives remain under `build/b2-root-cause/`. Compact per-test records, log hashes and command lists are saved in the JSON beside this report. One initial lifetime diagnostic invocation used the wrong relative copy path and is excluded; the corrected drive-only run is the saved measurement.

Primary-checkout production/test/expectation delta **0**; CPU and RAM/residency delta **0**. No build, full-suite repeat, release refresh/build, native 15/home27, boot, boss stress or play ATR delivery after the production STOP. Original A/B/C remains A134/B43/C0; it has not been replaced by an isolated diagnostic count. Island artifacts remain unattributed transient raster artifacts for visual-bugs-diag, not a merge blocker.

NEXT TASK: owner selection of a content-load error-path recovery; address that defect before applying fixture corrections or changing the remaining expectations. No commit, merge, push or tag.
