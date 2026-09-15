# VS65 WORKFLOW — SMALL FIX

Use for one bounded bug with no intended architectural redesign.

## Start

Read `docs/STATUS.md` and relevant project docs.

Inspect Git before editing.

## Process

1. Reproduce or positively identify the defect.
2. Change the smallest responsible path.
3. Do not opportunistically refactor unrelated code.
4. Run focused tests.
5. Build XEX when runtime changed.
6. Perform short native smoke only when relevant.
7. Stop for owner smoke.

## Git

Do not touch unrelated owner changes.

No push/merge/release/tag.

Use a focused local commit when safe.

## Escalate

Stop instead of redesigning if the fix requires:

- raster architecture changes;
- new PMG allocation;
- major memory placement changes;
- loader redesign;
- broad backing/ownership redesign.

## Completion

After owner acceptance update `docs/STATUS.md`.
