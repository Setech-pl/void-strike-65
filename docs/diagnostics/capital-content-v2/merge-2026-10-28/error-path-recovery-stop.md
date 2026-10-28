# Content error-path recovery — focused validation STOP (2026-10-28)

**STOP / INCONCLUSIVE. Partial implementation, not an owner-smoke candidate.**
Starting clean branch `codex/capital-content-v2-merge`, HEAD `b644d5c`.

The requested production change is implemented: `l2_content_load` now transfers
failed content reads to `$A0D6` (the existing reader failure screen), preserving
the error A from the checked reader. Its former transfer to `$A21E` merely
returned BAD IMAGE to an unchecked INIT caller. A build pin now checks the
failure-screen address. **Normal build PASS; every linked segment size delta
is exactly 0 B**, including L2 1,290 B and reader 1,512 B. No reservation,
address range or transport sector count changed. Success/steady-state CPU
delta 0; the replacement JMP itself remains 3 cycles. No PAL/native claim.

The first focused validation run exited 1: **10 tests, 9 PASS /1 FAIL**. All
four device-error/timeout/wire-checksum/image-checksum cases reach the error
screen, stay invalid and follow the same held-FIRE/release/new-press-to-menu
behaviour as the current L2-failure path. The four existing checked-content /
phase guard checks pass. The reused ROL A test passes all 512 accumulator/carry
inputs. No other increment 2 change was brought over.

The sole failure is a **new test-authoring mistake**, not a demonstrated
production regression: `tests/capital-content-v2-failure.test.mjs:11` requires
SHA-256 byte identity of the complete error routine with main 5053697.
Actual `67eea8bfbb7dfc0b298457f6fb90a8659c718cd14c036a549cd18de0e259524a`,
expected `ac351010fca8f7ab5c5566731b873bd49619ca84e5112e34485ab882760a1bcf`.
The prior audit's byte-identity assumption was wrong. Three absolute operands
follow the already-accepted reader shrink: `$A0F6` references failure_reasons
`$A54E→$A546`, `$A0F9` references failure_reason_slot `$A50B→$A503`, and `$A102`
references failure_records `$A4F6→$A4EE`. Behavioural identity does not imply
byte identity after those relocations. No assertion was changed to hide this
failure. It remains in the partial worktree for transparent review.

Per the owner's **“STOP on any failing gate”**, no further fixture work or gate
runs followed this result. In particular, the four synthetic wait changes and
four Heavy cadence expectation updates are **not implemented**. Fixture-phase,
ROL, disk-aware INIT and B1 edits already made before the focused run remain
unverified as a complete group. Full npm test, A/B/C diff, reconciliation,
release refresh/build, native15, home27, boot, boss stress and play delivery
were not run. Original A/B/C remains the prior 134/43/0 result, not a newly
measured count. No Group A assertion values were changed; shared host timeline
setup has changed, so its subsequent outcomes cannot be claimed unchanged.

## Audit of expectation changes already made

- `tests/boss-claim.test.mjs`, segment allowlist: accept only CONTENT_HEADER,
  CONTENT_CODE and CONTENT_DATA wholly inside `$1180–$18FF` in their two map
  names, following the accepted phase-exclusive content-home reservation.
- `tests/boss-claim.test.mjs`, cfg allowlist and expected area list: add only
  CONTENT_RAM and assert its exact `[0x1180,0x1900)` bounds, following that same
  accepted reservation; boss ownership in its own phase remains required.
- `scripts/memory-map-report.mjs`, cfg-overlap declarations used by the test:
  name the four intentional CONTENT_RAM/boss/banner/scratch/death overlaps,
  following the accepted home reservation. The cfg-overlap assertions did not
  change and these declarations have not yet been verified by their tests.
- `tests/heavy-bomber.test.mjs`, arena check: assert the retained
  `_enemy_c_heavy_tick_original` body, following the accepted Heavy-departure
  rule's guarded public-entry veneer; arena bounds are unchanged.
- `tests/heavy-package.test.mjs`, record 11: five→three sectors follows accepted
  Director −310 B and boot 213→211 sectors.
- `tests/heavy-package.test.mjs`, L2 size: 1,250→1,290 B follows accepted L2 +40 B.
- `tests/l2-lifetime.test.mjs`, INIT CPU: 45→313,589 instruction cycles follows
  increment 1's mandatory checked content read in INIT. The fixture now uses
  the real ATR-backed Drive. This value was measured in the preceding diagnosis;
  the modified lifetime test was not run in this partial task.
- `tests/capital-content-v2-loader.test.mjs`, corrupted load endpoint:
  report_bad_image→failure_screen follows the owner's explicit option 1 error
  recovery. This changed assertion passed in the focused run.
- `tests/capital-content-v2-failure.test.mjs`, new fault/FIRE assertions:
  enforce the owner's mandatory-read error path, invalidity and clean
  release/press-to-menu behaviour; all four fault cases pass. The extra
  cross-build SHA assertion is unsound and is the STOP, not an approved pin.
- `tests/nmos6502-rol.test.mjs`: exact test and matching emulator change from
  `bfda36b`, as explicitly requested; checks documented instruction results,
  carry/N/Z, preserved other flags, PC advancement and two cycles, all passing.

Gameplay phase setup edits change no expectation values and implement the
accepted loaded+GAMEPLAY home-call contract. Direct-memory helpers in B2 tests
use `gameplayMemory`; Heavy fixtures publish GAMEPLAY; the reduced timeline
publishes GAMEPLAY after init_state; sector-flow and star-pixel fixtures also
publish GAMEPLAY. They do not bypass content validation or install unchecked
home bytes. No minefield or other parked increment 2 logic is included.

## Evidence and next work

[Machine-readable result](error-path-recovery-stop.json),
[exact focused output](error-path-recovery-focused.txt).
Raw build/log/segment snapshots and the new ATR are preserved under
`build/evidence/capital-content-v2/error-path-recovery/`. The test-build ATR
SHA-256 is `5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`.
It is diagnostic evidence, not qualified play delivery. The three generated
tracked dist files were restored to starting HEAD after preserving their new
bytes; no dist change remains. No staging, commit, merge, push or tag.

NEXT TASK: correct the unsound byte-level comparison to account for the
accepted relocations while retaining behavioural checks, finish the authorized
four synthetic waits /four cadence updates, then focused checks, full npm test
and A/B/C comparison before proceeding to remaining merge gates.

## Exact owner commit paths and message

This is a **WIP checkpoint with a known failing new test**, not completed merge preparation. No staging or commit was performed.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-focused.txt
docs/diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-stop.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/error-path-recovery-stop.md
scripts/build.mjs
scripts/level-timeline.mjs
scripts/memory-map-report.mjs
scripts/nmos6502.mjs
src/hybrid/l2.s
tests/boss-claim.test.mjs
tests/capital-content-v2-failure.test.mjs
tests/capital-content-v2-loader.test.mjs
tests/encounter-director.test.mjs
tests/heavy-bomber.test.mjs
tests/heavy-package.test.mjs
tests/hybrid-lifecycle.test.mjs
tests/l2-lifetime.test.mjs
tests/level-payload.test.mjs
tests/nmos6502-rol.test.mjs
tests/sector-flow.test.mjs
```

Suggested message: `wip: zero-growth content error recovery and focused validation stop`
