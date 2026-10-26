# Slalom reproduction

All commands run in this worktree. Never write through owner symlinks. Native
measurements need a dereferenced, locally configured copy of Atari800 at
`build/slalom-atari800`. The completed run used that private copy.

Baseline main is pinned to `bf4d410`. Its three fresh ATRs matched the recorded
§BY hashes exactly. They were built before editing the level assets, with the
existing main-L2 read substitution. For reproduction after the edits, the
following preload also reads the baseline level assets through `git show`:

```sh
ISLAND_EDGE_ARTIFACTS=build/slalom-baseline-artifacts node --import ./scripts/island-edge-build-redirect.mjs --import ./scripts/capital-slalom-baseline.mjs scripts/build.mjs
node --import ./scripts/island-edge-build-redirect.mjs --import ./scripts/capital-slalom-baseline.mjs scripts/build.mjs --level=1:sector=1
node --import ./scripts/island-edge-build-redirect.mjs --import ./scripts/capital-slalom-baseline.mjs scripts/build.mjs --level=1:sector=1 --l2-long-capital
node scripts/l2-observer-images.mjs build/level-1-s1
node scripts/l2-observer-images.mjs build/l2-capital-960
node scripts/capital-slalom-native.mjs main
```

Preserve those baseline directories before overwriting them with candidate
builds; the completed run kept `build/slalom-main-480` and
`build/slalom-main-960` and pointed the completed baseline run records there.

```sh
ISLAND_EDGE_ARTIFACTS=build/play/slalom/campaign-build node --import ./scripts/island-edge-build-redirect.mjs scripts/build.mjs
node --import ./scripts/island-edge-build-redirect.mjs scripts/build.mjs --level=1:sector=1
node --import ./scripts/island-edge-build-redirect.mjs scripts/build.mjs --level=1:sector=1 --l2-long-capital
node scripts/l2-observer-images.mjs build/level-1-s1
node scripts/l2-observer-images.mjs build/l2-capital-960
node scripts/capital-slalom-native.mjs fixed
```

`capital-slalom-play.mjs NAME DIRECTORY DESCRIPTION` publishes and prints each
normal build immediately; names are campaign/capital-480/capital-960/tight-480.
Do not overwrite measured default direct-build directories until their native
runs and snapshots are complete. For Tight Weave, use the normal 480-row command
with the additional preload `--import ./scripts/capital-slalom-tight-build.mjs`.
It changes only authored island pattern data for that build. The completed
harder build is preserved in `build/slalom-tight-480`.

```sh
node scripts/capital-slalom-proof.mjs
node scripts/capital-slalom-tightness.mjs
ISLAND_EDGE_ARTIFACTS=build/play/slalom/campaign-build node --import ./scripts/island-edge-build-redirect.mjs scripts/capital-slalom-contact.mjs
ISLAND_EDGE_ARTIFACTS=build/play/slalom/campaign-build node --import ./scripts/island-edge-build-redirect.mjs --test tests/capital-slalom.test.mjs tests/l2-islands.test.mjs tests/l2-brake.test.mjs tests/l2-coordinate.test.mjs
node scripts/island-edge-results.mjs build/slalom-native-main
node scripts/island-edge-results.mjs build/slalom-native-fixed
npm run failures:reconcile -- --trace build/slalom-native-main/reconciliation.json
npm run failures:reconcile -- --trace build/slalom-native-fixed/reconciliation.json
```

SPACE uses `scripts/l2-space-cost.mjs build OUTPUT.json` with the corresponding
ATR output-routing preload and matching default build, once on each source.
No trace is reused across different ATRs. Native timings are emulator-measured;
real 65XE/SIO2SD validation remains owner smoke.
