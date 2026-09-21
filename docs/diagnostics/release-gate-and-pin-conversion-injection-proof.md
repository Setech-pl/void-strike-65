# Release gate semantics and pin conversion — injection proof

FIX session, 2026-09-21, branch `main`. Verbatim output of the falsifiability
harness for owner decisions 1 and 2 of this session.

Each case mutates the real `docs/runtime-wall-trace.json` in place, runs either
the affected test clause or the real default build (`node scripts/build.mjs
--quiet`), and restores the file; the last line proves the restore is
byte-identical. `CAUGHT` means the clause failed on the injected violation;
`REFUSED` means the default build refused to link.

The harness itself is session-level and not committed — the standing regression
tests are `tests/release-gate-semantics.test.mjs` (the four release-gate cases
against the same evaluator the build calls) and the converted clauses in
`tests/runtime-wall-trace.test.mjs`.

```text
=== baseline: the real report ===
  wall-trace suite: ℹ fail 5 ℹ pass 16
  default build on the real report: PASSES
=== converted-clause injections ===
  CAUGHT  pin 1 sheet geometry: width no longer columns x tile
  CAUGHT  pin 1 sheet geometry: the two sheets are cut from different frame sizes
  CAUGHT  pin 2 maximum: over the 32,568 hard gate
  CAUGHT  pin 2 maximum: physical headroom not > 0
  CAUGHT  pin 2 maximum: headroom is not the rest of the PAL frame
  CAUGHT  pin 2 maximum: a deadline overrun in the run
  CAUGHT  pin 3 shield: remaining_hard_cycles no longer gate minus measured
  CAUGHT  pin 3 shield: coverage without a complete 250-frame Shield
  CAUGHT  pin 3 shield: a hard overrun frame
  CAUGHT  pin 4 media: XEX and ATR maxima differ
  CAUGHT  pin 4 media: both media over the hard gate
  CAUGHT  pin 5 fingerprint: ordered_frames no longer covers every row
  CAUGHT  pin 5 fingerprint: digest is not a SHA-256
  CAUGHT  pin 5 fingerprint: a required session is missing from the replay list
  CAUGHT  gate.passed meaning: true with 40 recorded failures
  CAUGHT  tripwire: timing_and_dli_passed false
  CAUGHT  tripwire: an UNRECORDED gate failure
  CAUGHT  tripwire: a recorded failure silently cleared
=== release-gate injections, through the real default build ===
  REFUSED BUILD: an UNRECORDED gate failure
      Error: Final build refused by the release gate — UNRECORDED gate failure(s): raider-remnant-rapid-xex-hard: invented clause failure for the injection proof. Fix the build, or record the failure in docs/recorded-gate-failures.json with its class and the measurement that classified it.
  REFUSED BUILD: a recorded failure silently cleared
      Error: Final build refused by the release gate — recorded failure(s) no longer failing, so docs/recorded-gate-failures.json over-states what this build fails: weapon-pickup-2-hunt-fire4: Booster release did not clear the capsule from the missile plane in the release frame. Fix the build, or record t
  REFUSED BUILD: timing_and_dli_passed false
      Error: Final build refused by the release gate — gate.timing_and_dli_passed is not true: timing or the DLI sequence regressed. Fix the build, or record the failure in docs/recorded-gate-failures.json with its class and the measurement that classified it.
  REFUSED BUILD: gate.passed inconsistent with the published list
      Error: Final build refused by the release gate — gate.passed disagrees with the failure list the report publishes. Fix the build, or record the failure in docs/recorded-gate-failures.json with its class and the measurement that classified it.
=== restored: byte-identical (7b944da7…)
ALL INJECTIONS CAUGHT
```
