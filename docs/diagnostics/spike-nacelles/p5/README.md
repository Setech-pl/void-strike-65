# P5 islands: focused spike evidence

Throwaway `codex/spike-nacelles` branch, baseline `19b1464`. This is an
OWNER-SMOKE CANDIDATE, not an accepted production feature. The complete
interpretation, geometry, measurements and limitations are in
[the audit](../../../audits/2026-10-25-spike-nacelles.md#p5-islands--owner-directed-replacement-for-p4).

`summary.json` retains exact peak frames, same-frame deltas, route averages,
PAL audits and actor/background checks. `correctness.json` records exhaustive
bounded collision/cache checks; `backing.json` records projectile restoration,
ring reuse, the full-row fallback and conservative debris carry-in execution.
`debris-zero-audit.json` enumerates every authored zero-debris sector, including
implicit defaults. `gifs.json` records durations, capture frames and ATR hashes.
`build-provenance.json` retains linked allocation, transport and computed-gate
metadata from the three normal builds. Build and native console logs use `.txt`.

Each `main`, `off` and `islands` variant has EASY/MEDIUM/HARD flight and contact
routes, each 2,300 gameplay frames. CSVs are gzip-compressed without dropping
rows or columns. `*-islands.csv.gz` is a host-only background/owner observer;
it changes no guest memory. `*-report.json` binds the packed artifacts and
`*-watch.json` retains the existing native allocation checks. These are focused
routes, not the full release wall-trace suite. Enemy-shot pass-over is isolated
execution evidence; native capital routes contain player shots and broadside
shells, while fighter shots have drained before hull admission.

## Reproduce

Run from the repository root using existing dependencies and the in-repo
Atari800 source. The default build writes `dist/`; spike artifacts stay under
`build/<variant>/`. Preserve the default build while running the variants.

```sh
npm run build
shasum -a 256 dist/void-strike-65.atr
# 410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7
npm run build -- --spike-debris-off
npm run build -- --spike-nacelles=5
node scripts/spike-islands-check.mjs
node scripts/spike-islands-backing.mjs
```

Prepare the native observer from the current header with one short route,
then run only the requested 18 routes. All steering/FIRE is ordinary input;
there are no emulator patches to gameplay state.

```sh
VS65_SPIKE_POLICY=islands-flight node scripts/runtime-wall-trace.mjs \
  --atari800-source=build/atari800-trace --prepare --skip-boot-smoke \
  --smoke-frames=2300 --smoke-difficulty=0 --only-session=observer-smoke
node scripts/spike-islands-measure.mjs --fresh
node scripts/spike-islands-gifs.mjs
node scripts/spike-islands-report.mjs
```

The report helper also compares occupied disk payload with the existing P1
build; recreate that comparison artifact using
`npm run build -- --spike-nacelles=1` if it is absent. Native screenshots remain
under `build/`; only the three short GIFs are committed. Each GIF uses 50 fps,
the native palette and the existing encoder; there is no generated artwork.

The copy `../p5-islands.atr` is identical to
`build/spike-nacelles-p5/void-strike-65.atr`:

```text
SHA-256 b51e8b2ffbd791eb0126d29c3a306a8088c06642d2633facc2374278c83e2908
atari800 -xl -pal -nobasic <path>
```

Select **OPTIONS → DIFFICULTY**: ROOKIE = EASY, PILOT = MEDIUM (default),
ACE = HARD. The no-island debris-off control is `../p5-debris-off-control.atr`.
No XEX is supplied. Real 65XE/SIO2SD smoke remains for the owner.
