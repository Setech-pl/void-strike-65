# Remaining behaviour discrepancies — no production fixes

## Confirmed preview-tool bug: clipped fighter

Reproduction: `node --test --test-name-pattern="preview consumes the canonical" tests/preview.test.mjs`.

Expected: replacing the first `player_shape` row changes the generated gameplay PNG. Actual: the PNG is identical. The gameplay viewport/initial Y grew while the preview still allocates `24 * 8 = 192` source rows; `drawPlayer` discards the fighter's initial rows outside that canvas. Source-predicate bisect first change: `effe71c` (`fix(playfield): use full visible gameplay raster`). This probe evaluates the actual first-row visibility inequality from source numeric assertions; it is not represented as a full historical runtime test. Current mutation test reproduces the tool bug. No ATR defect is inferred. Production/tool fix is outside this task.

## Linked NMOS collision regression: shell pixels versus cached Y

Reproduction: `node --test --test-name-pattern="capital/player collision agrees" tests/broadside-fire.test.mjs`.

The old first assertion used a pre-HUD-move fixed Y premise. The corrected fixture positions each case relative to the independently decoded, published shell and selects the gameplay charset before inspecting it. It preserves the hit/miss oracle rather than repinning collision answers.

Expected: the linked collision routine agrees with the independently reconstructed final raster. Actual for owner 0 / slot 0 / ring 0 / lower-third case: PMG rows **93–107** overlap shell glyph rows **105–110**, but the linked routine returns false; the cached collision Y is **113**. A cache/display-origin difference of eight scanlines is the suspected cause, not a completed diagnosis.

Binary comparison: the same corrected sample passes `fbc1a24` and fails current main `4e84bc4`. A candidate-build + NMOS `git bisect run` identifies **`5bc8d51`**, M6 stage 1b HUD relocation, as the first bad revision. Logs: `.cache/test-debt-part2/bisect-collision-binary.log`, `collision-endpoint-main.log`, `collision-endpoint-old.log` and `collision-final2.log`. This is a regression in the linked NMOS/oracle comparison; Atari800 capture calibration and real-hardware impact still require confirmation before choosing a game-code fix. No threshold or hit answer was weakened.

## Content/fixture candidate: no-kill route skips elite (b)'s Raiders

Reproduction: `node --test --test-name-pattern="sector flow: with no kills" tests/level-one-waves.test.mjs`. The shared `captureTimeline` uses linked NMOS code, with real Light ticks and no kills from post-capital swarm sector 2 onward. All earlier swarm-drain and sector-presence assertions pass.

Expected by the W2 test: at least one Raider formation is admitted within elite (b)'s window. Actual: **EASY 3923–4423 and MEDIUM 3794–4238 contain zero Heavy spawns**; HARD 3714–4114 contains one. Reproduction state and preceding Heavy formations are in [wave-reproduction.json](wave-reproduction.json).

Suspected cause: the preceding Bomber lifetime/hold plus Heavy capacity outlast the authored following admission window after accepted Heavy policy changes. The Director deliberately cancels unspent formations at sector cuts, so this could be a content-timing regression or an intentional consequence of the newer policy; the partial host timeline cannot decide owner intent or certify the natural Atari800 route. The Heavy contract sample bisects to `d7b764c`; **the exact introduction of this separate lost-wave observation is not claimed**. Native route confirmation and authoring review are required. The failing assertion is retained; no gameplay/data edit or silent expectation change is made.

## Release evidence is separate

The eight release-bound unit evidence checks and 32 recorded native assertions require freshly bound milestone evidence. Their old captures are preserved. Missing screenshots, a stale curve/hash, old boss-completion observer assumptions or an old DLI count do not alone establish a current game defect. Their precise session/first-assertion identities and helper families remain in `groups.json` and the canonical ledger.
