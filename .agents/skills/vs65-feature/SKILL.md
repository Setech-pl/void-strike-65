---
name: vs65-feature
description: Use for adding a new VOID STRIKE 65 gameplay feature after the hybrid C foundation is available: enemy archetypes, waves, AI behaviors, pickups, progression, boss rules, or other high-level gameplay. Prefer C for game logic and reuse the existing ASM kernel.
---

# VOID STRIKE 65 — Gameplay Feature

Use this skill to make the game grow again instead of turning every feature into a kernel proof.

## Source of truth

Read current local:

- `AGENTS.md`
- `docs/reguly-projektu.txt`
- `docs/plan-realizacji.md`
- `docs/architecture.md`
- `docs/hybrid-c-architecture.md` if present
- the latest diagnostic directly relevant to the feature

Current local HEAD is authoritative.

## Default implementation rule

New high-level gameplay belongs in C unless the feature is inherently hardware/raster-critical.

Examples for C:

- enemy archetype data;
- high-level movement/AI decisions;
- HP/state/lifecycle;
- waves/admission;
- fire policy;
- sector/boss progression;
- pickup/booster rules;
- scoring.

Reuse ASM primitives for:

- Heavy/Light rendering;
- PMG;
- PairShot publication;
- collision hot paths;
- ring/VSCROL;
- effects renderer;
- audio hot path.

Do not create a new ASM subsystem for a feature just because existing ASM is nearby.

## Feature workflow

1. Create/use a feature branch when useful.
2. Define the smallest owner-visible behavior and DoD.
3. Implement the feature first using existing C/ASM contracts.
4. Run focused tests/build.
5. Produce XEX and owner smoke.
6. Only run a full PAL/raster campaign if:
   - kernel/hardware path changed;
   - focused smoke reveals timing/raster symptoms;
   - a milestone is being closed.
7. STOP after owner smoke report.

## Enemy archetype pattern

Prefer data + small C behavior handlers over new bespoke ASM engines.

A new enemy should normally be expressible through a combination of:

- type/archetype;
- renderer class (`HEAVY_PMG`, `LIGHT_CHAR`, etc.);
- HP;
- speed/movement parameters;
- weapon/fire policy;
- high-level behavior handler;
- score/reward.

If adding one enemy requires changes across Director, PMG renderer, projectile system, collisions, backing and sector transitions, STOP and reassess the C/ASM boundary.

## Resource discipline

Do not optimize ordinary C logic before a real gate fails.

When a feature approaches a hardware boundary, measure the smallest relevant thing and prefer an Atari-friendly gameplay compromise over a large architecture rewrite.

## Regression discipline

Protect owner-approved contracts, especially:

- stable PAL master timing;
- two-Heavy PMG rendering;
- current Player/Enemy PairShot contracts;
- off-screen admissions;
- sector transitions;
- existing capital traversal behavior unless feature explicitly changes it.

## Documentation

Update plan/architecture/owner decisions when the feature changes a game contract or roadmap. Keep diagnostic files for meaningful hardware/resource decisions, not for every trivial C conditional.

## Final report

- STATUS
- FEATURE / DoD
- IMPLEMENTATION (C vs ASM split)
- TESTS
- RESOURCE DELTA only when material
- FILES CHANGED
- XEX SHA-256
- OWNER SMOKE
- NEXT FEATURE/TASK: one only
