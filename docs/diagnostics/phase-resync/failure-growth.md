# Why shared unit debt rose from 134 to 139

Compared by file + test name against `merge-continuation-comparison.json`
(capital merge, 134 shared failures) and spike `a378dc2`'s `tests-ab.json`
(139 shared failures). No failure is repaired here.

| Added failure | First assertion | First appearance / cause |
| --- | --- | --- |
| `hardware-audio`: the boss entry's loads leave async receive off (debug route --level=1:sector=6, real SIO) | `tests/hardware-audio.test.mjs:103` (native helper status) | Test introduced by `dc9fb12`. It was skipped when `build/atari800-trace/src/cpu.c` was absent; present and failing in the spike's `a066098` baseline. This is environment-dependent activation, not a new regression introduced between the capital merge and `a066098`. |
| `hardware-boot`: the built ATR boots through real SIO to gameplay, BASIC on and off (scripts/sio-boot-repro.mjs) | `tests/hardware-boot.test.mjs:39` (native helper status) | Test introduced by `d8cb4e5`; same conditional emulator-source activation. Present and failing in spike baseline `a066098`. A source commit alone cannot date when a local ignored emulator directory first appeared. |
| `release-gate-semantics`: the release gate passes on the real report, recorded failures and all | `tests/release-gate-semantics.test.mjs:83` | `cef036b`: four debt records added without refreshing the canonical trace; they appear cleared to this fixture. |
| `release-gate-semantics`: the release gate fails when a recorded failure silently disappears | `tests/release-gate-semantics.test.mjs:120` | `cef036b`: its initial “open recorded failure passes” premise fails for the same four unmatched records. |
| `release-gate-semantics`: the release gate fails when timing_and_dli_passed is false | `tests/release-gate-semantics.test.mjs:136` | `cef036b`: the expected empty cleared-record list contains those four records. |

The release fixtures pass with the data at `cef036b^` and fail with the data
at `cef036b`. `78d873f` grows the unmatched list to five; `8763397` grows it to
32. These commits change the debt inventory, not these test assertions. The
retained [gate evaluations](failure-origin-release.json) exercise the actual
`evaluateReleaseGate` implementation with each revision's canonical trace and
registry. The two hardware definitions predate the capital merge; reporting a
new game-code culprit for their activation would be false attribution.

The old full run also skipped a third emulator-dependent test. Preparing the
spike emulator cleared its debug-route setup failure (spike C1); that is why
raw baseline 140 and shared A139 are different figures.
