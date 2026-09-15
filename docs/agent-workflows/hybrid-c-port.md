# VS65 WORKFLOW — HYBRID C PORT

Use when migrating existing high-level ASM logic to C/cc65.

## Rule

Port first. Measure second.

Do not perform a large theoretical feasibility study before creating a working
candidate.

## Process

1. Work on an isolated branch/checkpoint.
2. Port semantics 1:1.
3. Do not redesign gameplay during migration.
4. Maintain a coarse explicit C/ASM ABI.
5. Build working XEX.
6. Run deterministic behavioral A/B.
7. Run the same PAL replay before/after.
8. Measure code/RAM/residency.
9. Owner/architecture decision.

## Acceptance

C does not need to beat handwritten ASM.

Moderate CPU/RAM cost is acceptable if:

- PAL gates remain safe;
- placement is legal;
- maintainability improves substantially.

## C should not own

- raster-critical writes;
- VBI/DLI;
- ANTIC;
- low-level PMG publication;
- ring/backing;
- hot collision unless separately proven.

## Documentation

Maintain:

`docs/hybrid-c-architecture.md`

Update `docs/STATUS.md` after accepted migration.
