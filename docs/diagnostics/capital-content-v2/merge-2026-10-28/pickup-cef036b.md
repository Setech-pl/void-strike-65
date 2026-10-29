# Capital content v2 — pickup trace attribution and release continuation

**STOP: new unrecorded capital-contact capture gate; no strict release or play delivery.**

Starting owner checkpoint `cef036b`, branch `codex/capital-content-v2-merge`, baseline
`5053697`, verification date 2026-10-29. No production, test assertion, input
policy or validator change. CPU, RAM and residency delta: **0**. Only increments
1+0 are included; increment 2 remains parked. Owner commits and performs final
smoke; no stage, commit, merge, push or tag by the agent.

## Pickup attribution

The unchanged `weapon-pickup-overlap-2-hunt-fire5` replay also fails on
**5053697**, at the exact same first raster assertion and with the exact same
22 pixel counts as the current guest:

```text
216 216 216 216 216 216 216 216 216 188 156 132 108 84 60 28 0 0 0 0 0 0
```

The assertion at `scripts/runtime-wall-trace.mjs:6107` requires captures 0–18
≥40 pixels and captures 19–21 <40 pixels. COLPM3 `$1c`, column x56–72, full
image height. Captures 15–18 contain 28/0/0/0 and violate the pre-tail minimum;
the last three are 0 and pass. The generic failure message does not establish
a stale post-collection footprint.

Inputs on both commits: difficulty 2/HARD, `pickup-overlap`, fire delay 5,
1,300-frame budget. The input policy header is byte-identical, SHA-256
`f076b4fbf19f38536b13f8739b3f5db126cf9aeb7da34dd72c2930b89c7aa303`.
Baseline raw CLI exits 1 for this clause. Its focused PAL audit passes: 1,300
frames, maximum 30,793 wall cycles, physical headroom 4,775, zero misses,
extra VBI, DLI errors or deadline overruns. The focused report's `passed:true`
is a timing result, not a raster-clause pass.

Baseline command in the owner-created detached worktree, after `npm run build`:

```sh
node scripts/runtime-wall-trace.mjs --atari800-source=build/atari800-trace --skip-boot-smoke --only-session=weapon-pickup-overlap-2-hunt-fire5
```

Boot smoke is omitted only for this targeted attribution because baseline's
known frontend 1,405 exceeds 1,402. This is not baseline release certification;
current boot smoke remains mandatory. Baseline boot BIN/manifest/ATR were
restored after the probe; its source and dist are clean at 5053697. The
owner-created baseline worktree remains in place.

Following the owner's baseline-fails branch, classification is
**pre-existing-unclassified debt**. Added one exact session/message record to
`docs/recorded-gate-failures.json` alongside the four baseline boss-core records.
No input retiming, assertion change or validator weakening. Root mechanism is
not claimed. The first-divergence/RAM-versus-raster branch was not entered
because it was conditional on baseline passing.

[Machine evidence, artifact hashes and raw-capture hashes](pickup-cef036b.json).
[Verbatim baseline trace log](pickup-cef036b-baseline.txt). Raw CSV, watch JSON,
focused report and 22 screenshots are retained under
`build/evidence/capital-content-v2/pickup-cef036b/baseline-raw/`.
Baseline normal-build ATR SHA-256:
`79d1fa59e53ce627008ee6ba3b4d4c0dbeff8776aa572380e7ae0397e5372f9d`.

## Retained merge gates

Guest source/assets/config match the validated `build/merge-validation-c182af2/`
snapshot. Native 15/15 and home 27/27 remain valid for the identical artifact
bytes. Native: 58,688 iterations, overall peak 31,444, capital peak 30,152,
minimum fence 3,298, every boss entry 325/350; zero misses/VBI/DLI/shifted rows or
stale L2 accesses. Home: 15 routes+8 exits+R1–R4 terminal diagnostic fixtures;
2,963,608 content and 4,239,102 boss-owned opcode fetches, zero invalid
executions. Every reported boss-stress mode equals saved 5053697; worst
lost-target 8,473. [Previous bound evidence](verification-100db9a.json).

Previous full suite: 1,615 tests, 1,478 pass, 134 fail, 3 skip; comparison
**A134/B0/C0** against saved 5053697. Group A assertions remain untouched.
Reconciliation 1 matched/133 NEW/0 MOVED, same baseline-debt IDs. No green
full-suite claim. No full-suite repeat for documentation/ledger-only changes;
focused changed-behaviour 53/53 remains unchanged.

The island symptom remains an **unattributed transient raster artifact** for
`visual-bugs-diag`, not a merge blocker. It was not reproduced as leftover RAM
cells on the sampled commits; this pickup clause does not attribute it.

## New release STOP

The fresh full release trace passed 31 PAL audits, including the five recorded baseline clauses, then stopped at `capital-contact-allied-medium`. First assertion at `scripts/runtime-wall-trace.mjs:5882`: `paths.length === 16`, message “did not capture 16 consecutive contact rasters.” Actual **13 captures**, `capital-contact-allied-medium-frame-00.png` through `frame-12.png`; expected **16**. Captures 13–15 are absent. The task process group was terminated immediately on this unrecorded clause (SIGTERM).

Fixture inputs: difficulty 1/NORMAL, `capital-contact-allied`, fire delay 4,000, 840-frame budget, contact preamble row 225, allied owner 0, contact mode 1. Raw CSV contains 840 rows, frames 0–839, maximum 29,982 wall cycles, zero misses/extra VBI. The failing session’s PAL audit was not finalized, so no PAL PASS is claimed for it. Raw pipeline-call rows occur at frames 730/737/802/808 (one call per row); the later “exactly once” assertion was not reached. These are observations, not a root-cause classification or an extra executed gate.

Attribution is **INCONCLUSIVE**. No baseline comparison, replay adjustment, assertion change, validator change or production fix for this new clause after STOP. It is not added to the recorded-debt ledger. [Exact release transcript](pickup-cef036b-release-stop.txt). Original CSV, watch JSON, summary and 13 PNGs are copied into `build/evidence/capital-content-v2/pickup-cef036b/capital-contact-stop/`, with SHA-256 values in [the machine evidence](pickup-cef036b.json).

No fresh complete canonical runtime report, strict release build, release-binding checks or play-ATR delivery followed. Primary `docs/runtime-wall-trace.json` remains unchanged. A partial run is not release evidence. Primary and baseline **dist are clean**; there are no release-flow dist changes to list. No active task emulator remains. The evidence campaign ATR remains at `build/merge-validation-c182af2/dist/void-strike-65.atr`, SHA-256 `5f1a2ea11166abf6501161c6a8500b5118a89a8d8a3da83b9588526727af9676`; it is not qualified play delivery.

Git advanced during this run from `cef036b` to owner commit `78d873f`, which contains only the baseline pickup log/proof and the fifth debt record. No production change occurred and the agent made no commit. Preserve that checkpoint. The pending paths below cover the fresh-current captures, this new STOP evidence and handoff updates. NEXT TASK: owner decision on attribution of the capital-contact capture failure; then resume complete release evidence, strict build and campaign/capital480/capital960 play delivery. Owner final smoke remains pending.

## Exact owner commit paths and message

No staging, commit, merge, push or tag by the agent. The baseline pickup log/proof and ledger addition are already in `78d873f`; the proof has further pending capture/STOP data. No dist file belongs to this checkpoint.

```text
docs/STATUS.md
docs/audits/2026-10-28-capital-content-v2.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/pickup-cef036b.json
docs/diagnostics/capital-content-v2/merge-2026-10-28/pickup-cef036b.md
docs/diagnostics/capital-content-v2/merge-2026-10-28/pickup-cef036b-release-stop.txt
```

Suggested message: `docs: record pickup attribution and capital-contact release stop`
