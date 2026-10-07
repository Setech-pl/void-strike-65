# Cross-model audits

An independent review of the repository by a different model from the one that
builds the game, run once per milestone, before that milestone's release. The
auditor works read-only on a named `main` commit and reports findings with a
severity (S1 an established player-visible failure in the shipped ATR; S2 a
latent defect triggered by a plausible change or rare situation; S3 weaker
test/evidence protection; S4 a documentation or maintenance mismatch).

Each audit is kept **unchanged** as received, named
`<date>-<milestone>.md`. The audit is an input, not a source of truth: every
finding is verified against the repo before it is acted on, and the task that
acts on it records where the repo differs from the audit's text (code moves
between the audited commit and the fix).

The ledger below is the one place a finding's state is tracked. A finding is
**open** until a commit fixes it, **fixed** when the fix and its test are on a
branch (an owner-smoke candidate until the owner accepts the branch),
**accepted** when the owner keeps the behaviour on purpose, and **rejected**
when the repo refutes it.

## Audits

| Audit | Audited commit | Auditor |
| --- | --- | --- |
| [2026-10-06-pre-m5.md](2026-10-06-pre-m5.md) | `main` `1a3c8bf` | Codex (OpenAI) |

## Findings ledger

| ID | Severity | Title | Status | Where | Note |
| --- | --- | --- | --- | --- | --- |
| AUD-01 | S2 | Save guard does not identify the mounted disk | fixed (owner smoke pending) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8` (GREEN) | Sector 598 carries the disk's identity (`VS65` + layout id); it is read immediately before every PUT and compared with the resident block; a mismatch or a failed read skips silently. Tests: `tests/level-summary.test.mjs` "AUD-01: …" (4). |
| AUD-02 | S2 | Corrupt runtime overlay data reaches unchecked module arrays | fixed (owner smoke pending) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8`, `0de0485` (GREEN) | Every run a transition runs or uses is checked against a boot-validated 16-bit fold before use (the load-time identity, owner Q1), the level image included (Q3); the module count is bounded to 1..16 before the controller starts; refusal is WRONG DISK. +1 extension sector (Q2). Tests: `tests/audit-hardening.test.mjs` (4 AUD-02), `tests/level-summary.test.mjs` (4 AUD-02). |
| AUD-03 | S2 | Decimal mode changes boss DLI scroll arithmetic — boss DLI | fixed | S4b: `4dc8161` (RED), `a9a7336` (GREEN) | `CLD` at `boss_dli`'s entry; [plans/boss-lasers.md](../plans/boss-lasers.md) §13.1, §13.4. |
| AUD-03 | S2 | Decimal mode — every other interrupt handler | fixed (owner smoke pending) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8` (GREEN) | `CLD` at `gameplay_dli`'s entry (list B with D set wrote DLISTL `$73` for `$6D`), size-neutral. The frontend and loader DLIs do no arithmetic; the game installs no VBI and no IRQ handler. Test: `tests/audit-hardening.test.mjs` "AUD-03: …". |
| AUD-04 | S3 | One-column stress fixture misses simultaneous module kills | fixed | S4b: `077e879`, `eb6e75e` (RED), `a6dcfce` (GREEN) | At most two player shots meet the boss a frame; [plans/boss-lasers.md](../plans/boss-lasers.md) §13.2–§13.4. |
| AUD-05 | S3 | Stale palette pin hides the preview's behavioural checks | open | `chore/evidence-integrity` | |
| AUD-06 | S3 | Audit PASS permits insufficient margin and zero replays | open | `chore/evidence-integrity` | |
| AUD-07 | S4 | Unqualified runtime descriptions contradict the current ATR | open | `chore/evidence-integrity` | |
