# L2 island art — owner review sheets

Review-only mockups for the [L2 Phase A plan](../../plans/l2-phase-module.md).
No game art has been installed. Select designs before Phase B art work.

Each sheet shows EASY allied/enemy above HARD allied/enemy, with the real
capital hulls for scale. These are complete tall fragments, not viewport
captures. MEASURED outputs: existing game charset, actual faction glyph roles
and gameplay registers, ANTIC decoding, Atari800 PAL RGB table; zero new glyphs.
The original cells are scaled by a MEASURED integer factor of two.

- [Module wreck](01-module-wreck.png): broken panelled module and bevels.
- [Engine pod](02-engine-pod.png): armour and static existing drive-energy detail.
- [Turret deck](03-turret-deck.png): barrel/housing/base used as inert wreckage.
- [Girder mast](04-girder-mast.png): narrow shaft with a broad cross-member.
- [Panel plate](05-panel-plate.png): broad repeated panels and a torn bevel.

MEASURED recipe size is 30 B per design, plus a shared 22-B faction role map
(all in `render.mjs` / `manifest.json`). The five PNGs total 221,556 B.
Their checksums and individual sizes are in [manifest.json](manifest.json).
Production code/decode costs are ESTIMATE in the plan, not measured here.

Reproduce from repository root, without changing assets or invoking the build:

```sh
node docs/diagnostics/l2-island-mockups/render.mjs
```

[baseline-build.json](baseline-build.json) captures relevant normal-build
inventory and the unchanged ATR hash. [sio-baseline.json](sio-baseline.json)
records fresh MEASURED patched/standard, BASIC on/off level-start observations,
including each level-sector transaction and raw-log hashes. The exact command
and future ESTIMATE load budgets are in the plan. This is short direct-SIO
observation, not release wall-trace or stage-2 evidence regeneration.
