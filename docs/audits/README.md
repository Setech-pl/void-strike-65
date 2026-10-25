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
when the repo refutes it. Since the m5 audit (owner, 2026-10-19) a fixed
finding is **closed** once its branch is owner-accepted and merged into
`main`, and a finding the owner moves to a later milestone is **deferred**
there.

## Audits

| Audit | Audited commit | Auditor |
| --- | --- | --- |
| [2026-10-06-pre-m5.md](2026-10-06-pre-m5.md) | `main` `1a3c8bf` | Codex (OpenAI) |
| [2026-10-19-m5.md](2026-10-19-m5.md) | `main` `2e93173` | Codex (OpenAI) |
| [2026-10-23-memory-cycles.md](2026-10-23-memory-cycles.md) — memory/RAM placement, CPU/DMA frame families, capital sector, 16-level feasibility; static, trace 0 min; triaged by owner in [§BU](../owner-decisions-2026-09-11.md#bu-planning-direction-after-the-memorycycles-audit-2026-10-23) | `main` `6dae5a6` | Codex |
| [2026-10-24-l1-window-levers.md](2026-10-24-l1-window-levers.md) — L1 relocation, boot fixtures and page crossings; report preserved unchanged | `codex/l1-window-levers` `382b91a` | Claude Opus 5.5 |
| [2026-10-25-spike-nacelles.md](2026-10-25-spike-nacelles.md) — unchanged throwaway P1–P5, debris, brake, warning and length report; subsequent owner decisions in [§BW](../owner-decisions-2026-09-11.md#bw-capital-sector-islands-brake-sector-length-2026-10-25); no spike code merged | `codex/spike-nacelles` report HEAD `cdd08e7`, baseline `19b1464` | Codex |
| [2026-10-25-l2-phase-module.md](2026-10-25-l2-phase-module.md) — MERGE AFTER FIXES, no S1/S2; report merged unchanged in `66f53b9` | `codex/l2-phase-module` `b2b38ff`, baseline `19b1464` | Claude |

## Thematic audits

A read-only review of one subject, run when a task needs it rather than once
per milestone. Kept unchanged as received, named `<date>-<subject>.md`, and
treated like a milestone audit: an input, verified against the repo before it
is acted on. It carries no severities or IDs of its own; the points below are
this register's, named by the audit's section.

| Audit | Audited commit | Auditor | Acted on by |
| --- | --- | --- | --- |
| [2026-10-08-lights.md](2026-10-08-lights.md) — Light enemies and waves | `main` `08c79e7` | Codex (OpenAI) | `data/w2-lights` ([plans/w2-lights.md](../plans/w2-lights.md)): LA-1, LA-2, LA-3, LA-4, LA-5, LA-10 fixed, LA-6 confirmed and guarded; `chore/evidence-integrity`: LA-7 fixed; `feat/sector-flow`: LA-6 (C1) and LA-9's `afterCleared` fixed. Open: LA-8, LA-9's `mirror` (LA-11 needs no action) |

### Lights audit — points

The repo moved between the audited `08c79e7` and `data/w2-lights` (`main`
`cfbc6a0`): `fix/smoke-2026-10-07` P2 put one Interceptor, one Wingman, one
Raider pair with its escort and one Bomber pair after the capital, so §1's
"level 1 schedules no Light Interceptor" was already partly out of date.

| Point | Audit section | Status | Where |
| --- | --- | --- | --- |
| LA-1 Level 1 has no standalone Light wave and no Interceptor | §1, §3 | **closed** — fixed, owner smoke done (journal §BC 2) — a swarm of three Wingmen and three Interceptors after the capital; Interceptors also as (a)'s companions | `data/w2-lights` `eefd830` (RED), `bf79da0` (GREEN); [plans/w2-lights.md](../plans/w2-lights.md) §4 |
| LA-2 Several Lights at once need a swarm sector; level 1 has none | §3, §6 | **closed** — fixed, owner smoke done (journal §BC 2) — up to three live at once (clause L2: 3,612 rows, at most 3) | same |
| LA-3 No recorded Raider-sector variants with and without an Interceptor | §4 | **fixed** — owner decision a/b (2026-10-08) recorded | [plans/director-4.6.md](../plans/director-4.6.md) §11 item 20; [game-design.md](../game-design.md) |
| LA-4 `game-design.md` says every Raider formation brings a Wingman | §4 | **fixed** with LA-3 | [game-design.md](../game-design.md) "Light Wingman" |
| LA-5 No default replay or clause covers Interceptor Lights or several Lights; the trace records no Light archetype | §5 | **closed** — fixed, owner smoke done (journal §BC 2) — `light_state0-3` / `light_archetype0-3` on the main CSV; clause L1-L5 over every replay, each over a non-empty subject | `bf79da0`; `coverage.light_archetypes` in [runtime-wall-trace.json](../runtime-wall-trace.json) |
| LA-6 The elite → swarm boundary may carry a Heavy | §6 | **fixed** — confirmed (and its mirror, swarm → elite) and guarded by data in level 1 (W2); C1 now holds a sector's end while the live enemies exceed the next space sector's caps (`feat/sector-flow`, tested). Row corrected after the m5 audit (2026-10-19), which found it lagging | [plans/w2-lights.md](../plans/w2-lights.md) §3; [plans/sector-flow.md](../plans/sector-flow.md); `tests/sector-flow.test.mjs` |
| LA-7 `live_interceptor` names the Heavy formation, not the Light | §5 | **fixed** — the column is `live_heavy_formation` in the trace header, the harness, the coverage record and its test; clause logic unchanged | `chore/evidence-integrity` `22ebd2f` |
| LA-8 The opt-in Light CSV and `measure-light-population-native.mjs` name retired scaffolding | §5 | open, not in W2's scope | — |
| LA-9 `mirror` and `afterCleared` are compiled but not read | §2 | `afterCleared` **fixed** — the runtime reads it since `feat/sector-flow` (a wave waits for a clear field; tested). `mirror` open: compiled (`wave_flags` bit 2), not read, deferred to M3. Row corrected after the m5 audit (2026-10-19) | [plans/sector-flow.md](../plans/sector-flow.md); `tests/sector-flow.test.mjs` |
| LA-10 `level-01.json`'s opening prose describes an older schedule | §1 | **fixed** — a pointer heads the prose; each post-capital sector carries its own note | `bf79da0` |
| LA-11 Keep M4 before M3 | Recommendation | no action: the order of 2026-10-02 stands | [plan-realizacji.md](../plan-realizacji.md) §0 |

## Findings ledger

| ID | Severity | Title | Status | Where | Note |
| --- | --- | --- | --- | --- | --- |
| L2-01 | S3 | START GAME scroll fixture omits checked L2 reload | **fixed** | `codex/l2-phase-module`: `52ee66b`; [evidence](../diagnostics/l2-audit-fixes-2026-10-25/) | Real reader/summary/INIT and brake tick; unchanged scroll assertion. All 13 tests: 12 PASS, 1 pre-existing failure; main `19b1464` also 12/13, same first failing assertion in "the win". |
| L2-02 | S3 | SPACE brake/contact hook overhead | **fixed** | `cba50fd`; [measurements](../diagnostics/l2-audit-fixes-2026-10-25/) | Capital-only brake arm, resident contact state gate; 31 new B; all 720 identical-route SPACE CPU fixtures −2 cycles vs main, predictor delta 0 per Light. |
| L2-03 | S3 | Narrow lifetime observer and caller test | **fixed** | `cba50fd`; same evidence | Actual CPU fetch/byte/word reads in $1900–$1FFF, every source window; exact L2/installed boss/death ownership, bounded self-modification and stack-proven returns. All resident callers exercised; 480/960 routes and all real exits plus death/respawn checked. |
| L2-04 | S3 | Explicit validity and all-exit disarm | **fixed** | `c77ebba`; [owner correction §BW.8](../owner-decisions-2026-09-11.md#bw8-audit-fixes-and-owner-smoke) | 32 new code/state B. DYING/respawn keep validity by owner requirement; boss install, GAME OVER, menu quit, level teardown, RESET and head of every L2 load disarm. Only checked load + INIT validates; invalid START GAME returns to checked reader. |
| L2-05 | S4 | Brake exit snap and unbraked pickup motion | **fixed**; snap documented as intended | `cba50fd`; EN/PL how-to-play, game-design and §BW.8 | Owner-authorized documentation option: death and capital completion snap to normal; release ramps. Capsule follows every even/odd brake numerator at exactly half world speed, 0 new B. |
| L2-06 | S4 | Literal ABI constants and X preservation check | **fixed** | `cba50fd` | Generated C/ASM ABI from labels/compiler layout, same clock numerator build assertion; build rejects warning codegen that changes X or calls unproven code. Runtime X check retained. |
| L2-07 | S4 | Stale contact, STATUS, coordinate and map text | **fixed** | `cba50fd` and final evidence/docs checkpoint | Contact closure corrected; 960-row assert/test strings, full-page sequence description, phase-exclusive low RAM map, STATUS and plan results updated. |
| L2-08 | S4 | Diagnostic harness allowances lack labels | **fixed** | `cba50fd` | Extra variants, L2 trace reuse and host lives top-up labelled diagnostic-only; report distinguishes zero guest code from host state writes. Generic debug reuse assertion retained. |
| L1-01 | S3 | Shared boot fixture publishes Light over live boot sources | fixed — owner-smoke candidate | `80b2f94`, `9cf46ef` | Packed checked hold, real bitmap/publish sequence, actual PMG clear and empty reused ring; no Light/STARFIELD injections. Native fixture/score/PairShot/5,000-kill Raider checks pass; [evidence](../diagnostics/l1-audit-fixes-2026-10-24/README.md). |
| L1-02 | S3 | ENTITY_CODE shift adds per-frame page crossings | fixed — owner-smoke candidate | `80b2f94` | Original ENTITY_CODE addresses restored; +34 packed initial B / +405 raw resident B versus pre-audit. Every moved per-frame routine: zero new crossings; level-2 main/fixed 31,517/31,517, all boss stress deltas 0. |
| L1-03 | S3 | Tautological or relaxed pins and wrong lance read | fixed — owner-smoke candidate | `80b2f94`, `9cf46ef` | Exact initial 12,829 B, MAIN 17 B, glyph addresses and 712-719 read; preserve boundary/error assertions and original reclaimed-entry contract. |
| L1-04 | S4 | Edited test files omitted from reporting | fixed — owner-smoke candidate | `9cf46ef` | One full run plus focused main comparison; every edited file and remaining first assertion recorded, including the separate pre-existing boss-runtime summary failure. 81 old failures remain, zero new. |
| L1-05 | S4 | Boot publish failure enters uninitialised frontend | fixed — owner-smoke candidate | `80b2f94` | Local red halt, +2 B inside existing slot; CRC-checked RAM corruption only; documented in code and BV.6. |
| L1-06 | S4 | Menu retry leaks a return address; disk-entry dependency undocumented | fixed — owner-smoke candidate | `80b2f94` | Drop exactly two stack bytes (+2 B); 20 retry test passes. BV.6/STATUS record disk required at every entry and two reads for GAME OVER then MAIN MENU; README EN/PL follow-up line recorded. |
| L1-07 | S4 | Stale placement and warm-start comments | fixed — owner-smoke candidate | `80b2f94`, `9cf46ef` | Listed CFG/ASM/PMG/glyph/DOSVEC comments describe actual residency and cold RESET; no unsupported warm re-publication claim. |
| L1-08 | S4 | Weak menu bound and latent phase-overlap notes | fixed — owner-smoke candidate | `80b2f94`, `9cf46ef` | Menu CFG/asserts end at $1180; phase-exclusive overlaps named; memory map records boss slot D/death over L2 and boot-only writes to the gameplay buffer. |
| L1-09 | S4 | Tracked dist ATR predates L1 | fixed — owner-smoke candidate | `80b2f94` | Tracked campaign is the fixed normal build, SHA-256 `41065297…`; all five smoke images rebuilt from the final HEAD. No release/merge acceptance implied. |
| AUD-01 | S2 | Save guard does not identify the mounted disk | **closed** — fixed, owner smoke done (journal §BC 2) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8` (GREEN) | Sector 598 carries the disk's identity (`VS65` + layout id); it is read immediately before every PUT and compared with the resident block; a mismatch or a failed read skips silently. Tests: `tests/level-summary.test.mjs` "AUD-01: …" (4). |
| AUD-02 | S2 | Corrupt runtime overlay data reaches unchecked module arrays | **closed** — fixed, owner smoke done (journal §BC 2) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8`, `0de0485` (GREEN) | Every run a transition runs or uses is checked against a boot-validated 16-bit fold before use (the load-time identity, owner Q1), the level image included (Q3); the module count is bounded to 1..16 before the controller starts; refusal is WRONG DISK. +1 extension sector (Q2). Tests: `tests/audit-hardening.test.mjs` (4 AUD-02), `tests/level-summary.test.mjs` (4 AUD-02). |
| AUD-03 | S2 | Decimal mode changes boss DLI scroll arithmetic — boss DLI | fixed | S4b: `4dc8161` (RED), `a9a7336` (GREEN) | `CLD` at `boss_dli`'s entry; [plans/boss-lasers.md](../plans/boss-lasers.md) §13.1, §13.4. |
| AUD-03 | S2 | Decimal mode — every other interrupt handler | **closed** — fixed, owner smoke done (journal §BC 2) | `fix/audit-hardening`: `63ef6d4` (RED), `22614b8` (GREEN) | `CLD` at `gameplay_dli`'s entry (list B with D set wrote DLISTL `$73` for `$6D`), size-neutral. The frontend and loader DLIs do no arithmetic; the game installs no VBI and no IRQ handler. Test: `tests/audit-hardening.test.mjs` "AUD-03: …". |
| AUD-04 | S3 | One-column stress fixture misses simultaneous module kills | fixed | S4b: `077e879`, `eb6e75e` (RED), `a6dcfce` (GREEN) | At most two player shots meet the boss a frame; [plans/boss-lasers.md](../plans/boss-lasers.md) §13.2–§13.4. |
| AUD-05 | S3 | Stale palette pin hides the preview's behavioural checks | **closed** — fixed, owner review accepted: the tools have run on every merge since (journal §BC 2) | `chore/evidence-integrity`: `a037d93` | COLPF2 re-pinned `$1E` → `$AE` (`src/main.s:566`, plasma FX B2); the recorded test now fails at its real cause, `tests/preview.test.mjs:164` (the `player_shape` variant, class C; `chore/preview-29-rows` dropped and the failure accepted as a tool defect, M5-M5 below); the allied-steel and hull-source checks are their own passing test. Records carry the first assertion and message; `scripts/reconcile-failures.mjs` (`9bc72c7`) matches by both. |
| AUD-06 | S3 | Audit PASS permits insufficient margin and zero replays | **closed** — fixed, owner review accepted: the tools have run on every merge since (journal §BC 2) | `chore/evidence-integrity`: `4693600` (RED), `02aaf4d` (GREEN) | PASS = no miss event, worst fence margin ≥ 500, DMA-on ≤ 32,568, ≥ 1 row; `fence_caught` keeps detection apart; the CLI fails on zero replays and on an input it cannot audit, and sets the boss-entry row aside as the harness does; the harness binds the audits' PASS into `gate.timing_and_dli_passed`. Tests: `tests/pal-timing-audit.test.mjs` "AUD-06: …" (10). |
| AUD-07 | S4 | Unqualified runtime descriptions contradict the current ATR | **closed** — fixed, owner review accepted: the tools have run on every merge since (journal §BC 2) | `chore/evidence-integrity`: `03eb693` | All five named passages rewritten to what the code runs, with `file:line`; also fixed: TOP SCORES vs the save record, the M1 Wingman paragraph, the frame-600 capital paragraph, the campaign block's "none implemented", two stale `src/main.s:3892` pointers (→ `:4105`). No code changed. |
| M5-01 | S1 | Hit sound increments a write-only POKEY frequency register | **closed** — fixed, owner smoke PASS 2026-10-19 (journal §BB), merged into `main` | `fix/audit-m5`: `2af93e4` (RED), `021e45d` (GREEN) | `update_sound` writes the divider from `hit_timer` (`$3E − 2·hit_timer` before the decrement, as `resume_gameplay_audio` rebuilds it); no read of `$D202`. Size-neutral: CODE 21 B as before, initial block 13,623 B unchanged; −7 cycles on a hit frame. Tests: `tests/audit-m5.test.mjs` "M5-01: …" (2: the envelope under POT2 = RAM/0/64/228; pause/resume at all 14 phases). |
| M5-02 | S2 | A looping Interceptor can dive into a stationary player near the top | **closed** — fixed, owner smoke PASS 2026-10-19 (journal §BB), merged into `main` | `fix/audit-m5`: `7aa34ea` (RED), `a60105d` (GREEN) | The slot's rows go into the standoff thresholds, so the distance cannot wrap while the Light is above the player (`src/c/lifecycle.c`); AK's exit, speeds, hold rows and catch rule unchanged. Paid in the same tick (`_light_tick_body` 574 → 573 B, MEASURED; +4…+5 cycles a slot tick); the window half, `HYBRID_C_WINDOW_FLOW`, the Light kernel at `$B478` and every pin byte for byte (the 1-B pad is back); window record 1,315 of 1,387. Tests: `tests/audit-m5.test.mjs` "M5-02: …" (2: the audit's fixture on production frames; three slots, two loops, player high/mid/low/climbing, by drawn boxes and a signed distance). A player parked on the top-hold rows (y ≤ 64) is still met by the hold step itself (main and fix alike): **accepted** by the owner as intended anti-camping pressure (§BB 1). |
| M5-03 | S2 | A last projectile hit can mute the lead throughout the boss banner/load | **closed** — fixed, owner smoke PASS 2026-10-19 (journal §BB), merged into `main` | `fix/audit-m5`: `c05e4b2` (RED), `647cac8` (GREEN) | `sector_reader_blank` (START GAME, the level's end, the boss entry) clears `hit_timer`; the level's end's own clear moved into it. Summary and menu already relinquished it. Channel-4 state (`fire_timer`, the capital explosion) never blocks the music and is untouched. Byte-neutral (reader record 1,498 B; pinned reader addresses unchanged). Tests: `tests/audit-m5.test.mjs` "M5-03: …" (2: the end-to-end hit → entry → banner/load with the lead published; the control without a transition). |
| M5-04 | S3 | SIO diagnostic preparation can stamp an unrecompiled wall-trace binary as current | **closed** — fixed, merged into `main` with the smoked branch (2026-10-19) | `fix/audit-m5`: `2140219` (RED), `6c34ebe` (GREEN) | `make clean` before `make` in the generated copy; the build must differ from the wall-trace executable; the stamp (`.sio-diag-build.json`) binds the header's and the executable's hashes. Test: `tests/sio-diag-prepare.test.mjs` "M5-04: …". After the fix `tests/hardware-boot.test.mjs` + `tests/hardware-audio.test.mjs`: 7 of 7, 0 skipped. |
| M5-05 | S4 | Release zip omits LICENSE, LICENSE-ASSETS and THIRD_PARTY_NOTICES.md | **closed** — fixed, merged into `main` with the smoked branch (2026-10-19) | `fix/audit-m5`: `83e49dd` (RED), `34e8c37` (GREEN) | The audit's addendum M9 (its ID M5-A01). The three files are on the packager's list; `--output=` lets the test pack to a scratch path. Test: `tests/package-release.test.mjs` "M5-05: …". |
| M5-M2 | – | No trace clause times the boss entry's black frames (addendum M2) | **deferred** to M8 (§BB 2) | – | Not built on `fix/audit-m5`: the clause needs harness work beyond a clause, about 2-3 h (ESTIMATE): the DFTITLE observer armed per session and parsed, a stable label at the banner's DMACTL store, header-side register logging, negative fixtures, a trace rerun. Until then `tests/boss-banners.test.mjs` guards the black-then-banner order (not the 16-frame length, a one-off native measurement). STATUS carries it in the M8 backlog. |
| M5-M5 | – | The preview tool draws 24 of the 29 playfield rows (addendum M5; AUD-05's recorded failure) | **accepted** (§BB 3) | – | `tests/preview.test.mjs:164` stays a recorded failure ([recorded-test-failures.json](../recorded-test-failures.json)): a development-tool defect, not player-visible, not in the ATR. `chore/preview-29-rows` dropped (estimated 100-200 lines). |
| M5-M4 | – | Default native evidence does not cover regions 2–4 (addendum M4, not checked) | **deferred** to M4 / the campaign (journal §BC 3) | – | Regions 2–4 are not reachable in the shipped game (level 1 only); their bosses are covered by linked-code tests, the boss routes and the owner's emulator smoke, and the region-4 route by the owner's hardware run (2026-10-19). Native default-trace coverage comes with the levels that reach them. |
| M5-M8 | – | The current ATR's physical boot and loader not checked (addendum M8) | **closed** — the owner's hardware run, 2026-10-19 (journal §BC 1) | – | A real 65XE PAL through the SIO2SD booted `c977efe0` to the menu with music, played level 1, loaded region 1's boss behind its banner and reached the summary; the region-4 route `5e2888eb` loaded its boss too. [hardware-testing.md](../hardware-testing.md) §36, §39. |
| M5-M10 | – | The purple Raider artifact, the debris contact-kill inconsistency and the debris death-frame blink not reproduced (addendum M10, not checked) | **deferred** to M8 (journal §BC 3) | – | Pre-existing, recorded in STATUS "Known open defects"; reproduction and fixes are M8 polish. |
