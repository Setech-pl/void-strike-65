---
name: vs65-small-fix
description: Use for one bounded VOID STRIKE 65 bug fix or regression where the expected behavior is already clear. Prefer a minimal implementation and short focused verification; do not launch architecture work or long measurement campaigns unless evidence points to raster/timing/placement.
---

# VOID STRIKE 65 — Small Fix

Use this workflow for one concrete bug at a time.

## Source of truth

Before editing, read only what is needed from:

1. `AGENTS.md`
2. `docs/reguly-projektu.txt`
3. `docs/plan-realizacji.md`
4. `docs/architecture.md` if present
5. the latest diagnostic directly relevant to the bug

The current local HEAD and current local documentation override old prompts/handoffs.

## Git safety

- Check `git status --short`, branch, and HEAD first.
- Never reset, stage, delete, or rewrite unrelated work.
- Leave `.claude/` untouched unless explicitly asked.
- Local commits are allowed when the task passes.
- No push, merge, release, tag, or destructive cleanup without owner instruction.
- If useful, create a dedicated `fix/...` branch before implementation.

## Workflow

1. Restate the single observable defect and expected behavior.
2. Reproduce it with the smallest useful scenario when practical.
3. If the cause is already obvious from code + owner evidence, do not spend hours building a giant proof; implement the smallest reversible fix.
4. Run focused tests/builds that cover the changed path.
5. Build the production XEX/ATR if runtime changed.
6. Provide short owner-smoke instructions.
7. STOP after the report. Do not begin the next task automatically.

## Escalation

Stop instead of redesigning if the fix requires any of:

- ANTIC/raster scheduling changes;
- PMG allocation redesign;
- backing/ownership architecture changes;
- memory-map/placement redesign;
- BASIC RAM/loader/runtime disk I/O;
- broad gameplay redesign.

Report the blocker and recommend escalation to the strongest available reasoning model.

## Verification philosophy

Do not run a full PAL gauntlet for an ordinary local logic/data fix unless the changed code touches a timing-critical path.

Use full timing/raster verification when:

- the kernel changed;
- a renderer/publication path changed materially;
- the owner smoke indicates timing/raster symptoms;
- a milestone/release gate is being closed.

## Documentation

If the fix changes a project contract or roadmap decision, update the relevant current docs and diagnostic. Do not rewrite unrelated history.

## Final report

Keep it compact:

- STATUS
- ROOT CAUSE
- CHANGE
- TESTS
- CPU/RAM only if materially affected
- FILES CHANGED
- HEAD / commit if created
- XEX SHA-256 if runtime changed
- OWNER SMOKE
- NEXT TASK: one suggestion only, do not execute
