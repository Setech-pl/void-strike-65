# VS65 WORKFLOW — FEATURE

Use for normal gameplay feature development.

## Principle

Feature velocity matters.

For reversible high-level C gameplay work:

IMPLEMENT FIRST.

Do not replace implementation with a long feasibility study.

## Process

1. Read `docs/STATUS.md`.
2. Use current hybrid C/ASM boundary.
3. Implement smallest useful production version.
4. Reuse existing kernel primitives.
5. Focused tests.
6. Build XEX.
7. Short representative PAL smoke.
8. Owner smoke.
9. Commit or rollback.

## C owns

Prefer C for:

- lifecycle;
- EnemyArchetype;
- AI decisions;
- waves;
- admission;
- sector state;
- gameplay rules;
- pickups/boosters policy;
- boss state.

## ASM owns

Keep hardware-critical execution in ASM:

- ANTIC/raster;
- PMG;
- publication;
- ring/backing;
- hot collision;
- VBI/DLI;
- hardware/audio hot paths.

## Stop conditions

Stop and escalate before creating:

- new global compositor;
- raster multiplexing;
- PMG reassignment;
- loader redesign;
- BASIC RAM dependency;
- major transport redesign.

## Completion

A new archetype should normally require data + small C behavior + reuse of an
existing ASM renderer class.

If adding one enemy requires core Director redesign, the architecture boundary
needs review.

Update `docs/STATUS.md` after owner acceptance.
