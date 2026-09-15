---
name: vs65-pal-verify
description: Use for VOID STRIKE 65 PAL timing, raster, PMG/ANTIC publication, CPU-budget, memory-placement, milestone acceptance, or A/B performance verification. Do not use for every ordinary logic change.
---

# VOID STRIKE 65 — PAL / Raster Verification

Use this skill only when timing/raster/resource evidence is actually needed.

## Source of truth

Read current local:

- `AGENTS.md`
- `docs/reguly-projektu.txt`
- `docs/plan-realizacji.md`
- `docs/architecture.md` if present
- latest relevant diagnostics

Current local HEAD is authoritative.

## Hard platform gates

Unless current docs explicitly supersede them:

- Atari 65XE PAL, 50 Hz
- production target: 31,200 cycles
- hard gate: 32,568 cycles
- physical PAL frame: 35,568 cycles

Raster correctness and wall-time correctness are separate gates.

## Workflow

1. Define one deterministic scenario or replay.
2. If comparing A/B, use the same replay/seed/input for both binaries.
3. Build/validate XEX and ATR using the current project build.
4. Run Atari800 7.1.2 PAL with existing project trace tooling.
5. Measure only metrics relevant to the decision.
6. For visible-memory changes, verify actual raster/publication correctness, not only max cycles.
7. STOP after evidence and recommendation.

## Required metrics for CPU A/B

At minimum:

- completed PAL frames;
- active-work/max cycles using the same definition for A and B;
- target/hard headroom;
- missed frames;
- extra VBI;
- DLI anomalies;
- code size / residency when relevant.

Do not compare maxima from unrelated replay scenarios as if they were directly comparable.

## Raster-sensitive checks

When character/PMG publication changed, inspect the relevant subset of:

- old erase deadline;
- new redraw deadline;
- high/mid/low Y;
- ring wrap;
- PMG page boundaries;
- backing/restore correctness;
- partial publication visible to ANTIC;
- stale/ghost/orphan cells.

Do not revive previously rejected architectures without new evidence and owner approval.

## Placement

Report only affected segments and real margins. Do not move code into BASIC RAM or redesign loader/transport as a default fix.

## Final report

- STATUS
- SCENARIO / REPLAY ID
- BUILD / XEX SHA
- CPU RESULTS
- RASTER/TIMING RESULTS
- MEMORY/PLACEMENT
- A/B DELTA if applicable
- RECOMMENDATION
- OWNER SMOKE if visual/gameplay changed
