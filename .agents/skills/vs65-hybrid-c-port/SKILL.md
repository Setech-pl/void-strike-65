---
name: vs65-hybrid-c-port
description: Use when migrating a bounded VOID STRIKE 65 high-level gameplay module from ca65 assembly to C/cc65 while preserving the existing ASM hardware kernel. Port behavior 1:1 first on an experimental branch, produce a working XEX, then run a small deterministic A/B.
---

# VOID STRIKE 65 — Hybrid C/cc65 Port

This skill implements the owner-approved hybrid architecture.

## Architectural boundary

### Prefer C / cc65 for

- Encounter Director;
- sector state machines;
- waves/admission;
- booster/pickup policy;
- high-level enemy lifecycle and AI;
- enemy archetype configuration;
- difficulty/progression;
- boss state machine;
- scoring/game rules that are not raster-critical.

### Keep in ASM / ca65 by default

- VBI/DLI;
- ANTIC/raster-critical writes;
- PMG publication/hot renderer paths;
- PairShot render/publication;
- ring and future VSCROL kernel;
- backing/restore;
- hot collision loops;
- audio hot paths.

C decides **what should happen**. ASM performs hardware-critical **how**.

## Mandatory preflight

Read current local:

1. `AGENTS.md`
2. `docs/reguly-projektu.txt`
3. `docs/plan-realizacji.md`
4. `docs/architecture.md`
5. `docs/hybrid-c-architecture.md` if it exists
6. latest diagnostics relevant to the module

Check Git state and HEAD. Current local docs/HEAD are authoritative.

## Git model

Use an experimental branch such as:

`experiment/hybrid-c-<module>`

Never rewrite the accepted ASM baseline. Git is the rollback mechanism.

No push/merge/release/tag unless owner instructs it.

## Port-first rule

Do NOT begin with a long theoretical feasibility study.

Preferred sequence:

1. create/verify experimental branch;
2. integrate the smallest required cc65 build support;
3. define a narrow, explicit C↔ASM ABI;
4. port the target module 1:1 without gameplay redesign;
5. produce a working XEX;
6. run focused functional equivalence tests;
7. only then run a deterministic A/B on the same replay;
8. recommend keep/revert based on real result.

## Behavior preservation

Initially preserve:

- states and transitions;
- timers/constants;
- RNG call order where behavior depends on it;
- admission decisions;
- sector timing;
- existing gameplay semantics.

Do not combine migration with feature redesign.

## C runtime constraints

Prefer:

- `uint8_t`, `int8_t`, `uint16_t`;
- simple structs/enums/static tables;
- coarse C↔ASM calls;
- explicit ownership of shared state.

Avoid unless required:

- stdio;
- heap/malloc/free;
- file I/O;
- floating point;
- large libc dependencies;
- many C↔ASM crossings per frame.

Audit generated requirements for CODE/RODATA/DATA/BSS, software stack and zeropage.

## ABI rules

- Keep the boundary semantic and small.
- Prefer one/few coarse calls per frame, e.g. `director_update()`.
- C may request semantic actions; ASM owns hardware-sensitive execution.
- Do not duplicate authoritative state on both sides.
- Every shared field has exactly one owner.

If placement or ABI requires a major memory/raster redesign, STOP and report the blocker rather than solving it silently.

## A/B after working XEX

Use the same deterministic replay for ASM and C versions.

Compare only what matters:

- behavioral divergence count;
- linked bytes;
- residency/new C RAM/stack;
- PAL max cycles on identical replay;
- target/hard headroom;
- missed frames / extra VBI / DLI anomalies.

A moderate CPU/RAM increase is acceptable if gates stay safe and maintainability improves substantially.

## Documentation

For the first accepted hybrid port, create/update `docs/hybrid-c-architecture.md` with:

- C responsibilities;
- ASM responsibilities;
- ABI/calling convention;
- shared-state ownership;
- C memory/stack;
- forbidden hot paths in C;
- build/debug commands;
- pattern for future module migration.

Also update plan/architecture/owner-decisions when the accepted architecture changes.

## Final report

- STATUS
- BRANCH / HEAD
- MIGRATED RESPONSIBILITIES
- ASM KERNEL REMAINING
- C↔ASM ABI
- C MEMORY FOOTPRINT
- FUNCTIONAL A/B
- PAL A/B
- FILES / DOCS CHANGED
- XEX SHA-256
- RECOMMENDATION: make C version foundation? YES/NO
- NEXT TASK: one bounded migration or feature

STOP after report and owner decision.
