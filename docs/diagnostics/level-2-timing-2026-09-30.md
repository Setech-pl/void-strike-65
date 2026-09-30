# Level 2 timing through the debug route — NOT MEASURED: the harness cannot take a variant (2026-09-30)

Roadmap 4.6 step 3, branch `feat/director-step-3-level-2`. **Diagnostic only.**
Nothing here is written into `docs/runtime-wall-trace.json` and nothing here is
release evidence.

## The owner's request (2026-09-30, plan §11 item 16)

One diagnostic timing measurement of level 2, *if the existing wall-trace harness
can run replays against the level 2 build through the debug route without
changes to harness code*: once over level 2's sectors (at least the swarm
sectors 1 and 4 and the finale sector 6), reporting the worst line-238 fence
margin and the DMA-on maximum per sector, with frames. A fence margin below 500
or a DMA-on frame over 32,568 anywhere in level 2 is a STOP. *If the measurement
needs harness code changes, do not build them — report what it would take and
continue without it.*

## Answer: it needs harness code changes, so it was not run

MEASURED by reading `scripts/runtime-wall-trace.mjs` at `5b8448d`. There are three
obstacles, and each one is code:

| # | Where | What it does | Why a `--level=2` build cannot pass it |
| --- | --- | --- | --- |
| 1 | `main()`, the input paths (`labelPath`, `manifestPath`, `bootPath`, `xexPath`, `atrPath`, and the `integration-glue`, `encounter-director`, `capital-player-collision`, `gameplay-music`, `light-kernel` label files) | every input is `path.join(rootDirectory, "dist" \| "build", …)`, and `rootDirectory` is the script's own parent directory; there is no argument or environment variable that names another | the debug route writes **all** its artifacts and intermediates into `build/level-2-sM/` and never touches `dist/` or `build/` (owner decision 2026-09-28; `tests/build-variants.test.mjs`, `tests/level-two.test.mjs`). The harness would trace the default build, which is level 1 |
| 2 | `main()`, after the manifest is read | `invariant(["candidate", "release"].includes(manifest.buildVariant), "Runtime trace requires candidate or final release artifacts")` | the variant's manifest says `buildVariant: "level-2-s0"`. Copying the variant into `dist/` does not help: this check refuses it, and editing the manifest to get past it would be hand-editing a generated artifact (AGENTS.md rule 3) |
| 3 | the session output directory, `const buildDirectory = path.join(rootDirectory, "build", "runtime-wall-trace")` | even a focused `--only-session` run writes `<session>.csv` and `<session>-focused-run.json` there | a level 2 run would overwrite the default build's CSVs for the same session ids |

## What it would take

A harness change, not built here:

1. an **input-directory option** — e.g. `--artifacts=build/level-2-s0` — replacing
   `dist/` and `build/` for the eleven inputs above (the variant already writes
   every one of them into its own directory);
2. accepting a **review-variant manifest only together with `--only-session`**,
   so that no path through the script can reach the full run's write of
   `docs/runtime-wall-trace.json` with variant data;
3. a **separate output directory** for such a run (e.g.
   `build/runtime-wall-trace-level-2-s0/`), so the default CSVs are untouched;
4. a test pinning 2 — a variant run never writes `docs/`.

ESTIMATE: 25-40 lines in `scripts/runtime-wall-trace.mjs` plus one test.

**No new sessions would be needed.** The three
`director-complete-{0,1,2}-natural-sweep-fire0` sessions play **10,500 frames**
with the player's lives held (`holdPlayerLives: 3`). The level timeline probe on
the `--level=2` build (below) says level 2 completes at frame **8,768** on HARD
and **9,743** on MEDIUM, so those two sessions cross all six sectors. EASY
completes at **10,960**, so its session ends in sector 6 (entered at 8,080), which
is still the finale. One `--level=2` build and three focused runs would cover
the request; `--level=2:sector=M` builds are only needed to spend more frames in
one sector.

## What IS known about level 2's load — from the probe, not the trace

The level timeline probe (`scripts/level-timeline.mjs`) runs the real runtime
image in `scripts/nmos6502.mjs` through a reduced main loop. **It measures no
cycles and no raster**, so it is no substitute for the request. It does say
what population the swarm sectors put on screen, which is the input to the
ESTIMATE below. MEASURED on `build/level-2-s0` at `5b8448d`, 13,000 frames per
difficulty:

| Sector | kind | entered at frame (EASY / MEDIUM / HARD) | peak live Lights | Heavy formations |
| ---: | --- | --- | ---: | ---: |
| 1 | swarm | 0 / 0 / 0 | **3** | 0 |
| 2 | elite | 1,200 / 1,067 / 960 | 1 | 18, all Bomber |
| 3 | capital | 2,800 / 2,489 / 2,240 | 0 | 0 |
| 4 | swarm | 4,160 / 3,698 / 3,328 | **3** | 0 |
| 5 | elite | 6,080 / 5,405 / 4,864 | 1 | 24, R/B by wave |
| 6 | elite | 8,080 / 7,183 / 6,464 | 1 | 30, R/B by wave |
| complete | — | 10,960 / 9,743 / 8,768 | — | — |

The probe retires every Light 64 frames after admission. In play a Light can
live longer, but the ceiling still bounds the count at three.

## ESTIMATE of the heaviest level 2 frame — not measured

The new coincidence level 2 brings is a **swarm frame**: three live Lights plus
debris, a capsule and the player's shots. No level 1 frame has more than one
Light. The Light-multiplicity M1 measurement (2026-09-21,
[light-population-m1-2026-09-21.md](light-population-m1-2026-09-21.md)) put
exactly that population through the fence: **6,227** worst margin standing and
**4,941** on a slot-empty frame. It found that Light count is not what binds: its
binding row was a one-Light **admission** frame, which level 1 already carries.
The ESTIMATE is therefore that level 2's swarm sectors add no new worst row and
stay far above the 500 STOP line, with the binding row still the level-complete
Spread-shot frame behind today's **788**. That measurement is nine days and
several runtime changes old. **This is an ESTIMATE and cannot clear or trip the
STOP**; only the measurement above can.

## Not affected

The default build: `dist/void-strike-65.xex` `bb5ec363…`, `.atr` `abe3b181…`,
`-boot.bin` `9e5c5d6f…` and the manifest are byte-identical to `main`
`138689e`, so every recorded figure in `docs/runtime-wall-trace.json` still
describes the artifacts that ship.
