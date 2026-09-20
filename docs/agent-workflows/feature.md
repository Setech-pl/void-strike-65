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

## C / ASM ownership

Do not restate the matrix here. It is normative in `AGENTS.md`
("Architecture invariants / C / ASM ownership"), with the detailed boundary and
ABI in `docs/hybrid-c-architecture.md`.

The short form: if the new behaviour is a decision or a state transition, it
belongs in C; ASM consumes that decision and performs the hardware-sensitive
execution and publication.

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
