# Throwaway nacelle spike — 2026-10-25

Baseline: main `19b1464`; branch `codex/spike-nacelles`, never merged.
Owner confirmed the sole Codex PID 85967. Only the final audit is intended
for a later, separately authorised merge to main.

## Representation and placement

Use a spike-only build flag selecting P1/P2/P3. Keep both 32×9 live maps
unchanged. Reserve the L1-free `$B478-$B8FA` window for all added code,
bounded two-column side strips and descriptor/state data. Never consume
`$B8FB-$B8FF`, `$549E-$54BD`, or boss/lance/breakup/L1 code. The flag-off
campaign must reproduce ATR `410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7`.

Use small finite-sector extent descriptors, selected at build time for this
spike (production entry policy belongs in C). Each side stays solid from
the outer hull through its new inner edge: fill any intervening original
cells and reuse existing surface glyphs. No new charset slots. Patterns
are defined over the level-1 480-row capital coordinate and account for
the enemy's eight-row offset. Width is bounded to two extra columns.

## Publication and contact

ASM consumes extent data when drawing rows and resolving source boundaries.
Extend both the ordinary draw and prepared-row publication paths. The
existing cache's 16-bit coordinate, phase, physical row and immutable
difficulty must also uniquely bind the selected immutable pattern; if not,
extend its key. Clear strip cells before repainting to prevent stale edges.
Narrow the universal fast reject to the actual globally safe interval.
Keep stars, debris and spawn centres within the new safe corridor.

Retain the existing three-row collision intersection, clamp/push-back,
two-unit HULL damage, lifecycle and 25-frame cooldown. Validate every
protruding edge, joins, entry/exit and all vertical collision alignments,
including EASY central-gap safety. EASY must retain at least 20 free
character cells (80 HPOS) before accounting for the visible 16-HPOS ship.

## Patterns

- P1 gentle taper: symmetric long approach, one/two-column plateau, retreat.
- P2 River Raid: alternating long left/right bulges with tapered shoulders.
- P3 gates: paired short protrusions with a gradual, visible approach.

Produce a separate playable spike ATR for each pattern, with normal campaign
unchanged when the flag is absent. Production L2 loading is out of scope.

## Evidence and stop rules

Inspect existing build/native/capture helpers before using them. Run one
normal flag-off build and compare its ATR hash with baseline. Run normal
computed gates for flag-on builds. Use identical short native/PAL capital
routes on baseline and each pattern, plus deliberate edge/contact and row
switch routes; attribute incremental cycles to routines. Report CPU work,
DMA-on timing, minimum fence and missed frames separately. Record linked
resident/capital code, data/state and transported disk bytes against D7's
estimates. Keep raw evidence and reproducible measurement scripts.

Capture three MEDIUM flight GIFs and one short contact GIF, each at most
about 15 seconds, under `docs/diagnostics/spike-nacelles/`. Report minimum
channel per difficulty, including the three-row intersection. Do not run
the full test suite, wall-trace suite, stage-2, reconciliation, release or
boss stress. Stop on any owner-specified gate, placement, contact,
passability or forbidden-path condition. Commit the final English audit
and evidence, push only the spike branch, report and stop.
