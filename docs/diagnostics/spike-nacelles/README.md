# Throwaway nacelle spike evidence

Baseline main/origin/main `19b1464`. This branch is never merged. Only
`docs/audits/2026-10-25-spike-nacelles.md` is intended for a later owner-led
transfer. `docs/STATUS.md` remains the accepted L1 state.

The audit explains scope, geometry, measurements, limitations and owner
choices. `summary.json` contains exact native peak frames and stage deltas;
`cpu-attribution.json` separates identical-state CPU cost from elapsed PAL
route changes. CSVs are gzip-compressed without dropping columns or rows.
Raw focused reports and allocation watches are diagnostic evidence, not
release wall-trace certification. GIF provenance is in `gif-*.json`.

## Reproduce

No new dependencies. Use the repository's existing Node/cc65/Atari800 tools.
All commands run from the repository root. Build variants stay under `build/`.

```sh
npm run build
shasum -a 256 dist/void-strike-65.atr
# Must be 410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7.
npm run build -- --spike-nacelles=1 > build/spike-p1-build.log 2>&1
npm run build -- --spike-nacelles=2 > build/spike-p2-build.log 2>&1
npm run build -- --spike-nacelles=3 > build/spike-p3-build.log 2>&1
```

Prepare the in-repo instrumented emulator from the current header. This is
one short focused route; `--skip-boot-smoke` is deliberate:

```sh
VS65_SPIKE_POLICY=sweep node scripts/runtime-wall-trace.mjs \
  --atari800-source=build/atari800-trace --prepare --skip-boot-smoke \
  --smoke-frames=2100 --smoke-difficulty=1 --only-session=observer-smoke
node scripts/spike-nacelles-measure.mjs --baseline
```

The second command runs the two short clean-main routes, then the same two
routes on each spike. It checks every protruding edge/gap/difficulty with the
native instruction model, records native CSVs/watches, captures frames,
encodes the three 14-second flight GIFs and the four-second contact GIF, and
regenerates the JSON summary. Existing build logs must come from the matching
normal builds above. The standalone constituent helpers are:

```sh
node scripts/spike-nacelles-check.mjs build/spike-nacelles-p1
node scripts/spike-nacelles-attribution.mjs
node scripts/spike-nacelles-gifs.mjs
node scripts/spike-nacelles-gifs.mjs --contact
node scripts/spike-nacelles-report.mjs
```

`VS65_SPIKE_POLICY` changes only the trace observer's joystick policy. The
custom `nacelle-contact` policy reads the finite source-row coordinate and
makes two edge visits, using ordinary joystick input; it does not patch the
ship, health, RNG or capital geometry. Its exact route is in the trace header.
Native runs use MEDIUM; geometric/contact execution checks use all three
difficulties. The report helper asserts the final build ATR hashes still
match the actual native captures.

## Harness details and discarded attempts

The old window-tail observer started at the Director link's `$B478` end and
therefore classified the explicitly reserved spike state as foreign writes.
The spike-only observer hook now starts that free-tail watch at the actual
`spike_nacelles_end`. The immutable spike code/data and both forbidden
reservations are checked separately. No real computed timing gate failed.

The pre-existing gameplay-generation counter can count transient boot PC
aliases, making its default generation-1 screenshot selector capture nothing.
The opt-in `DFTRACE_ENGINE_SCREENSHOT_GENERATION=0` means capture actual traced
gameplay regardless of that counter. Full headless indexed capture is cropped
from 384×240 to 320×240 at x=32. No gameplay byte is patched for capture.

One initial helper invocation entered its default boot-smoke prelude and was
cancelled. No boot-smoke result is claimed. All final measurements explicitly
skip that prelude. No full test suite, full wall-trace suite, stage-2,
reconciliation, release build or boss stress was run.

An initial implementation wrote the strip records but published extra cells
directly. The final version actually reads the separate strip records for
publication. All affected spike builds, native routes, GIFs and byte/cycle
measurements were regenerated after that correction. Earlier checkpoint
numbers are superseded by `summary.json` and the final audit.

## Artifacts and ownership

The three tracked ATRs are exact copies of the build artifacts, provided so
the owner/reviewer can download them from this throwaway branch. No XEX is
supplied. Editable implementation/data compilation and all conversion steps
are tracked. GIFs are native captures, not simulations. The owner alone
chooses the look and accepts real 65XE/SIO2SD play. No production feature or
release is accepted by this evidence.
