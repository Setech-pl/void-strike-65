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

## Thematic audits

A read-only review of one subject, run when a task needs it rather than once
per milestone. Kept unchanged as received, named `<date>-<subject>.md`, and
treated like a milestone audit: an input, verified against the repo before it
is acted on. It carries no severities or IDs of its own; the points below are
this register's, named by the audit's section.

| Audit | Audited commit | Auditor | Acted on by |
| --- | --- | --- | --- |
| [2026-10-08-lights.md](2026-10-08-lights.md) — Light enemies and waves | `main` `08c79e7` | Codex (OpenAI) | `data/w2-lights` ([plans/w2-lights.md](../plans/w2-lights.md)): LA-1, LA-2, LA-3, LA-4, LA-5, LA-10 fixed, LA-6 confirmed and guarded; `chore/evidence-integrity`: LA-7 fixed. Open: LA-8, LA-9 (LA-11 needs no action) |

### Lights audit — points

The repo moved between the audited `08c79e7` and `data/w2-lights` (`main`
`cfbc6a0`): `fix/smoke-2026-10-07` P2 put one Interceptor, one Wingman, one
Raider pair with its escort and one Bomber pair after the capital, so §1's
"level 1 schedules no Light Interceptor" was already partly out of date.

| Point | Audit section | Status | Where |
| --- | --- | --- | --- |
| LA-1 Level 1 has no standalone Light wave and no Interceptor | §1, §3 | **fixed** (owner smoke pending) — a swarm of three Wingmen and three Interceptors after the capital; Interceptors also as (a)'s companions | `data/w2-lights` `eefd830` (RED), `bf79da0` (GREEN); [plans/w2-lights.md](../plans/w2-lights.md) §4 |
| LA-2 Several Lights at once need a swarm sector; level 1 has none | §3, §6 | **fixed** (owner smoke pending) — up to three live at once (clause L2: 3,612 rows, at most 3) | same |
| LA-3 No recorded Raider-sector variants with and without an Interceptor | §4 | **fixed** — owner decision a/b (2026-10-08) recorded | [plans/director-4.6.md](../plans/director-4.6.md) §11 item 20; [game-design.md](../game-design.md) |
| LA-4 `game-design.md` says every Raider formation brings a Wingman | §4 | **fixed** with LA-3 | [game-design.md](../game-design.md) "Light Wingman" |
| LA-5 No default replay or clause covers Interceptor Lights or several Lights; the trace records no Light archetype | §5 | **fixed** (owner smoke pending) — `light_state0-3` / `light_archetype0-3` on the main CSV; clause L1-L5 over every replay, each over a non-empty subject | `bf79da0`; `coverage.light_archetypes` in [runtime-wall-trace.json](../runtime-wall-trace.json) |
| LA-6 The elite → swarm boundary may carry a Heavy | §6 | **confirmed** (and its mirror, swarm → elite); guarded by data in level 1 (no swarm after an elite over every level file; the swarm drains on HARD; clauses L3/L4 hold); the code fix C1 is a prerequisite of M4 | [plans/w2-lights.md](../plans/w2-lights.md) §3; [STATUS.md](../STATUS.md) backlog |
| LA-7 `live_interceptor` names the Heavy formation, not the Light | §5 | **fixed** — the column is `live_heavy_formation` in the trace header, the harness, the coverage record and its test; clause logic unchanged | `chore/evidence-integrity` `22ebd2f` |
| LA-8 The opt-in Light CSV and `measure-light-population-native.mjs` name retired scaffolding | §5 | open, not in W2's scope | — |
| LA-9 `mirror` and `afterCleared` are compiled but not read | §2 | open, M3 (and the smoke-2026-10-07 backlog for `afterCleared`) | — |
| LA-10 `level-01.json`'s opening prose describes an older schedule | §1 | **fixed** — a pointer heads the prose; each post-capital sector carries its own note | `bf79da0` |
| LA-11 Keep M4 before M3 | Recommendation | no action: the order of 2026-10-02 stands | [plan-realizacji.md](../plan-realizacji.md) §0 |

## Findings ledger

| ID | Severity | Title | Status | Where | Note |
| --- | --- | --- | --- | --- | --- |
| AUD-01 | S2 | Save guard does not identify the mounted disk | fixed (owner smoke pending) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8` (GREEN) | Sector 598 carries the disk's identity (`VS65` + layout id); it is read immediately before every PUT and compared with the resident block; a mismatch or a failed read skips silently. Tests: `tests/level-summary.test.mjs` "AUD-01: …" (4). |
| AUD-02 | S2 | Corrupt runtime overlay data reaches unchecked module arrays | fixed (owner smoke pending) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8`, `0de0485` (GREEN) | Every run a transition runs or uses is checked against a boot-validated 16-bit fold before use (the load-time identity, owner Q1), the level image included (Q3); the module count is bounded to 1..16 before the controller starts; refusal is WRONG DISK. +1 extension sector (Q2). Tests: `tests/audit-hardening.test.mjs` (4 AUD-02), `tests/level-summary.test.mjs` (4 AUD-02). |
| AUD-03 | S2 | Decimal mode changes boss DLI scroll arithmetic — boss DLI | fixed | S4b: `4dc8161` (RED), `a9a7336` (GREEN) | `CLD` at `boss_dli`'s entry; [plans/boss-lasers.md](../plans/boss-lasers.md) §13.1, §13.4. |
| AUD-03 | S2 | Decimal mode — every other interrupt handler | fixed (owner smoke pending) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8` (GREEN) | `CLD` at `gameplay_dli`'s entry (list B with D set wrote DLISTL `$73` for `$6D`), size-neutral. The frontend and loader DLIs do no arithmetic; the game installs no VBI and no IRQ handler. Test: `tests/audit-hardening.test.mjs` "AUD-03: …". |
| AUD-04 | S3 | One-column stress fixture misses simultaneous module kills | fixed | S4b: `077e879`, `eb6e75e` (RED), `a6dcfce` (GREEN) | At most two player shots meet the boss a frame; [plans/boss-lasers.md](../plans/boss-lasers.md) §13.2–§13.4. |
| AUD-05 | S3 | Stale palette pin hides the preview's behavioural checks | fixed (owner review pending) | `chore/evidence-integrity`: `a037d93` | COLPF2 re-pinned `$1E` → `$AE` (`src/main.s:566`, plasma FX B2); the recorded test now fails at its real cause, `tests/preview.test.mjs:164` (the `player_shape` variant, class C, `chore/preview-29-rows`); the allied-steel and hull-source checks are their own passing test. Records carry the first assertion and message; `scripts/reconcile-failures.mjs` (`9bc72c7`) matches by both. |
| AUD-06 | S3 | Audit PASS permits insufficient margin and zero replays | fixed (owner review pending) | `chore/evidence-integrity`: `4693600` (RED), `02aaf4d` (GREEN) | PASS = no miss event, worst fence margin ≥ 500, DMA-on ≤ 32,568, ≥ 1 row; `fence_caught` keeps detection apart; the CLI fails on zero replays and on an input it cannot audit, and sets the boss-entry row aside as the harness does; the harness binds the audits' PASS into `gate.timing_and_dli_passed`. Tests: `tests/pal-timing-audit.test.mjs` "AUD-06: …" (10). |
| AUD-07 | S4 | Unqualified runtime descriptions contradict the current ATR | fixed (owner review pending) | `chore/evidence-integrity`: `03eb693` | All five named passages rewritten to what the code runs, with `file:line`; also fixed: TOP SCORES vs the save record, the M1 Wingman paragraph, the frame-600 capital paragraph, the campaign block's "none implemented", two stale `src/main.s:3892` pointers (→ `:4105`). No code changed. |
