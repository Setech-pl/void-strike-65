# P5 brake and bottom-shot follow-up

Throwaway `codex/spike-nacelles`, P5 baseline `ad3e108`, clean main `19b1464`.
The owner accepted the island mechanic for future L2 production. This new
brake is an OWNER-SMOKE CANDIDATE. No spike code is merged into main.

See [the audit](../../../audits/2026-10-25-spike-nacelles.md#throttle-bottom-shot-fairness-and-sector-length)
for decisions, timing/geometry, the independent warning alternative and why
a longer hull is not data-only.

## Evidence

- `summary.json`: exact A/B capital peaks/means, slowed/ramping peaks, PAL
  audits, row-clock consistency and artifact bindings.
- `correctness.json`: all policy inputs, ramp sequences, predictor residues,
  CPU attribution and the 23-B alternative's threshold/slot checks.
- `islands/correctness.json`, `backing.json`: P5 contact/publication checks
  against the brake binary, including the full-row fallback and restoration.
- `root-cause.json`: one-shell counterfactual reachability and real linked
  collision checks for the nine-direction late traps. Other simultaneous
  damage sources are outside this model.
- `gif.json`: eight-second native capture frames, control transitions and ATR
  binding. PNGs remain under `build/`, not in Git.
- `build-provenance.json`, `build-*.txt`: four normal builds, linked allocations
  and computed gates. Pending release wall-trace evidence remains pending.
- Six `off/on × easy/medium/hard` routes, 2,800 frames each: gzipped unabridged
  trace CSVs, artifact-bound focused reports, allocation watches and `.txt` logs.
  Final clock sidecars classify projectile occlusion of shells; every missing
  shell cell has a live owner. This changes no guest code or memory. The
  first-pass capture uses the same guest ATR.

`broad*_raster_row` is an earlier ANTIC-list snapshot; `broad*_row` and its
cache describe current publication. Do not pair different observation phases
to manufacture a one-row collision mismatch. The four-frame launch flash's
shared row pointer is a real existing behaviour and is modeled separately.

## Reproduce

Run from the repository root, using existing tools and the in-repo emulator.
No full test suite or full wall-trace suite is needed.

```sh
npm run build
shasum -a 256 dist/void-strike-65.atr
# 410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7
npm run build -- --spike-nacelles=5
npm run build -- --spike-nacelles=5 --spike-throttle
npm run build -- --spike-nacelles=5 --spike-fair-warning
node scripts/spike-throttle-check.mjs
node scripts/spike-islands-check.mjs build/spike-nacelles-p5-throttle \
  docs/diagnostics/spike-nacelles/throttle/islands
node scripts/spike-islands-backing.mjs build/spike-nacelles-p5-throttle \
  docs/diagnostics/spike-nacelles/throttle/backing.json
node scripts/spike-throttle-measure.mjs --prepare
node scripts/spike-throttle-root-cause.mjs
node scripts/spike-throttle-report.mjs
node scripts/spike-throttle-gif.mjs
```

The measure helper executes only six focused native routes, prepares the
current observational header and captures EASY. `--off-only` / `--on-only`
select one half; `--no-capture` rechecks metrics without replacing screenshots.
Brake DOWN/release windows use fixed gameplay frames in both builds.
Horizontal weaving follows the same row policy; positions naturally diverge
when one world's rate changes. No gameplay state is patched.

The warning flag is a separate comparison, not combined with the brake. It
passes normal computed gates and focused instruction checks; no extra native
comparison routes were requested or run for it. It is OFF in the review ATR.

```text
/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/spike-nacelles/p5-throttle.atr
SHA-256 6298ab3d1f1794d30c369683337a474d02793a31a58f8b84fa4938a209e068a1
atari800 -xl -pal -nobasic <path>
```

OPTIONS → DIFFICULTY: ROOKIE/EASY, PILOT/MEDIUM (default), ACE/HARD.
Hold DOWN at the bottom to brake, release to ramp back. The hull is still
480 rows: extending it requires code/format work, deferred by the data-only
rule. Real 65XE/SIO2SD brake smoke remains for the owner.
