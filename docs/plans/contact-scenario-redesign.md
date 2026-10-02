# Contact scenario redesign — plan (Phase A)

Branch `chore/contact-scenario-redesign`, cut from `main` `c59e28a` on
2026-10-02. Source of truth: the repository, then
[trace-clause-repairs.md](trace-clause-repairs.md) §4.1 and §5 Q3 (where this
task was opened), then the brief.

**Status: PHASE A — waiting for the owner on §6 Q1.** The two capital-contact
sessions are diagnosed and their fixes measured in focused runs; the
lower-playfield session needs a coverage decision.

## 1. Step 0

| | Value | Source |
| --- | --- | --- |
| `main` | `c59e28a docs(plan): plan-realizacji §0 — showcase is done (2026-10-02)` | `git log -1` |
| showcase on `main` | `docs/plans/showcase-atr.md` present, STATUS "Showcase from the ATR — done" | |
| worktrees | the primary checkout only | `git worktree list` |
| tree | clean | `git status` |
| ATR SHA-256 | `f127d7a48674c7b2cdf103d3808b4145938a8d687586b82e83b3bcb651f33cd1` | `dist/` |
| boot SHA-256 | `1daed1be86e54b1e3195228aa3b05f20d2501a87efc5403ca0638b60e943bd33` | `dist/` |

## 2. Where the repo describes this task, and the baseline

The task is the one the repo names: owner decision Q3 of
[trace-clause-repairs.md](trace-clause-repairs.md) (§5, applied in §8.1) kept the
three contact sessions recorded as class (a) "until
`chore/contact-scenario-redesign`"; [budget-1.0.md](budget-1.0.md) §2 M5
schedules it before M5 ("harness and replay work: no runtime byte, no cycle");
each entry in [../recorded-gate-failures.json](../recorded-gate-failures.json)
names it. No disagreement about scope.

| | Value | Source |
| --- | --- | --- |
| worst line-238 fence margin | 1,439 (`2-evasive-fire3` f287) | STATUS "Heavy break-up rotate gate" (PAL audit, 48 + 8 replays) |
| DMA-on maximum / physical headroom | 31,133 / 4,435 | `docs/runtime-wall-trace.json` `semantics` |
| DLI per host frame / sequence violations | 2 / 0 | STATUS, same table |
| recorded clause failures | 3, the three contact sessions | `docs/recorded-gate-failures.json`, equal to the evidence's `gate.behavioural_clause_failures` |
| recorded test failures | `preview` (C); `runtime-wall-trace` "ten heaviest frames…" recorded with its "passes by coincidence" note | `docs/recorded-test-failures.json` |
| `npm test` totals | **not recorded after the showcase.** The last figure is 906 / 904 / 2 (STATUS, rotate gate); the showcase cleared `github-showcase` and added assertions. The brief's 908 is plausible but not in the repo; Phase B measures it. | |
| initial block / ATR menu frame | 13,621 B / 547 | STATUS, rotate-gate table |

## 3. Diagnosis

Clause lines are `main`'s `scripts/runtime-wall-trace.mjs`. Every one of the
three sessions fails the first clause, "did not capture 16 consecutive contact
rasters" (`:3813-3814`, `paths.length === 16`). Behind it the clause block asks,
in order: exactly one entry to `apply_broadside_player_damage` in the whole
replay (`:3815-3817`); one matching FLYING → IMPACT shell (`:3824-3830`); full
hull 10 → 8, lives 3, alive, no invulnerability, cooldown 25 (`:3831-3835`); no
damage after the contact (`:3836-3839`); a final-raster hitbox intersection
(`:3840-3854`); PAL timing (`:3855-3860`).

The recorded "16 rasters" message hides **four independent faults**, stacked.
Each was found by fixing the one in front of it (focused runs, §5).

| # | Fault | Class | Evidence |
| --- | --- | :---: | --- |
| F1 | **The scenarios end before the capital sector.** Level 1 opens with its fighter phase; the budgets (560 / 360 / 1,200) date from the XEX-era level that opened with the corridor. The passive, never-firing player is worn down in the fighter phase. | (a) | Committed run (2026-10-02 CSVs): allied and hostile `sector_state` 7 on every frame, player killed at 146 and 458 / at 136; lower opens at 663 and loses two lives at 307 and 590 before it. |
| F2 | **The capture's player oracle requires the retired P0/P3 pair.** `dftrace_player_physical_bounds` (`scripts/atari800-wall-trace.h:2571, :2580`) unions P0 and P3 rows and is valid only when `HPOSP0 == HPOSP3` and `SIZEP3 == SIZEP0`. Since `800322b` (2026-09-29, pickup colour) P3 is the capsule's plane and the game no longer mirrors `player_x` into `HPOSP3` (`src/main.s` note above `white_starfield_broadside_abi_pad`), so the bounds are invalid on every frame and no contact can be captured. | (b) | With F1 fixed, allied frame 795: the shell hits in exactly the steered mode-1 geometry (bolt raster 113-118, player 109-123, bolt top = player top + 4), `player_physical.valid` 0 with `hpos [148, 0]`, nothing captured. This is also why the 2026-10-01 probe "never captured" the geometry. |
| F3 | **The capture window leaks 32 frames into a 16-frame clause.** `4753399` (2026-09-04) widened the emulator's window from 16 to 32 for the geometry sessions (`:6763`, `count < 32u`), whose clause asserts 32; the contact clause still asserts exactly 16. | (b) | With F1-F2 fixed: 32 PNGs written, clause fails on `=== 16`. |
| F4 | **The hitbox clause is in the coordinates production left on 2026-09-04.** It boxes the shell at logical `BROAD_Y` −3…+2 and the player at the PMG DMA index `player_y` …+14 (`:3840-3853`), the geometry of `d94702b` (2026-09-02). Two days later `4753399` moved the production collision to final-raster bounds (`BROAD_RASTER_TOP` …+5 against `player_y − 8` …+14, `src/capital-player-collision.s`, `capital_shell_hits_player`) and the clause was not updated. A mid-body (mode 1) contact misses its logical boxes by 7 scanlines on every frame. | (b) | With F1-F3 fixed, both capital sessions pass every clause before this one and fail it: allied f795 logical shell 105-110 vs player 117-131; raster shell 113-118 vs player 109-123. |

### 3.1 Per session

| Session | Old scenario, first failing point | After F1-F4 |
| --- | --- | --- |
| `capital-contact-allied-medium` (MEDIUM, `capital-contact-allied`) | 560 frames, sector never opens; health 0 at 146 and 458 (lives 3 → 1) | sector opens 667, first capital hit 795 (allied shell, slot 0, mode 1), next damage call 859 — **all clauses pass** (§5) |
| `capital-contact-hostile-medium` (MEDIUM, `capital-contact-hostile`) | 360 frames, sector never opens; health 0 at 136 | with the bottom preamble the player, released at y 225, is still climbing to its pre-position row (102) when the allied shell launches at 765 on that row: allied hit at 769, class (a). With the preamble held on row 180: sector opens 889, first capital hit 1042 (hostile shell, slot 1, mode 1), next 1114 — **all clauses pass** |
| `lower-playfield-hostile-contact-atr-hard` (HARD, `lower-contact-hostile`) | 1,200 frames; sector opens 663; no hostile shell at `BROAD_Y ≥ 191` launches before 1199 | **not fixed — §6 Q1.** Two more scenario faults: (F5, a) its steering `target_y = shell_y − 7` (header `:2935-2936`) is the same pre-`4753399` logical geometry as F4, so even a qualifying shell could not give a mode-1 raster contact; (F6, a) on HARD a low hostile shell is rare: with the preamble and a passive player the hostile launches relative to the sector opening are fixed (116, 180, 180, 116, 172, 172, 180, 180 through +908), whatever the preamble row. Low hostile shells appeared only after +837 (waiting at y 200, x 116: 220 at 1504; at x 148: 212 at 1582; sweeping: 220 at +917), and in every such run debris (10 → 3, non-capital) or an allied 212/220 shell at the bottom (a damage call) came first. |

No fault is class (c): every damage, collision and hit in these runs is the
game behaving as designed.

## 4. The changes

### 4.1 Scenario (class a)

**Contact preamble** (`dftrace_contact_preamble`, env
`DFTRACE_CONTACT_PREAMBLE_ROW`, set only by the contact sessions). Until the
capital sector first leaves OPEN (7): sweep x 94-154 (the `sweep` policy's
pattern) with FIRE held, on the session's preamble row, while the observer holds
the native respawn invulnerability (`PLAYER_LIFECYCLE` 2, its timer at 2) — a
contact gate, not a survival gate, the reasoning of the 2026-09-21 owner
decision for `DFTRACE_HOLD_PLAYER_LIVES`. Once the sector has opened nothing is
written again; the held timer runs out through `tick_respawn_invulnerability`
two frames later (measured: lifecycle 2 at 667, 0 at 668), and the clauses then
assert full hull, three lives and no invulnerability on the hit frame. No release
byte is patched. The precedents for trace-only guest writes are the reentry
policies (health and invulnerability held every frame) and `restart`.

| Session | Preamble row | Sector opens | Contact | Next damage call | Frames old → new |
| --- | ---: | ---: | ---: | ---: | --- |
| `capital-contact-allied-medium` | 225 (spawn row) | 667 | 795 | 859 | 560 → **840** |
| `capital-contact-hostile-medium` | 180 | 889 | 1042 | 1114 | 360 → **1,080** |

The preamble row decides when the sector opens (measured on the hostile session:
225 → 667, 200 → 935, 180 → 889, 160 → 830, 140 → 846, and 102 never within
1,600 frames), so it is a scenario parameter, recorded per session. Each budget
ends after the 16-frame raster window and before the next damage call, as the old
budgets did; the session comment records both frames so a later change that
moves them is diagnosed in minutes. The contact steering policies themselves are
unchanged.

### 4.2 Observer and clause corrections (class b)

| | Change | Files |
| --- | --- | --- |
| F2 | The player oracle reads P0 alone; valid when P0 has rows. | `scripts/atari800-wall-trace.h` |
| F3 | `DFTRACE_CAPITAL_CONTACT_LIMIT`: the contact kinds get their 16-frame window back; the geometry kind keeps 32 (default). | `scripts/atari800-wall-trace.h`, `scripts/runtime-wall-trace.mjs` |
| F4 | Additive CSV columns `broad{0,1,2}_raster_top` (the production `BROAD_RASTER_TOP` cache); the hitbox clause boxes both objects in final-raster scanlines (`capitalContactHitboxes`): shell `raster_top` …+5, player `player_y_after − 8` …+14; horizontal terms unchanged. The assertion is unchanged: the boxes must intersect. | `scripts/atari800-wall-trace.h`, `scripts/trace-clause-observers.mjs`, `scripts/runtime-wall-trace.mjs` |

Harness code for F2-F4: about 40 lines without comments (limit about 60).
The scenario preamble is about 30 lines of header policy.

**Still fails when the behaviour is missing** (F4): the corrected clause rejects
a near miss (bolt bottom + 1 = player top) and a one-clock horizontal gap
(`tests/trace-clause-observers.test.mjs`). F2 and F3 can only make a capture
possible; the capture still requires the owner, the AABB hit branch, zero
cooldown and the exact requested geometry, unchanged.

### 4.3 What the new scenarios cover that the old did not

* The contacts are the run's first capital hits after level 1's real fighter
  phase and sector opening, on the shipped ATR — not a corridor from frame 0
  that the level no longer has.
* The release path: respawn invulnerability expiring through the game's own
  tick, then a contact that proves the hull, lives, lifecycle and cooldown it
  lands on.
* The hitbox clause now checks the geometry the production collision decides
  in, so it can tell a real raster contact from a near miss.

## 5. Measured fail-before / pass-after (focused runs, `--only-session`)

| Run | allied | hostile |
| --- | --- | --- |
| `main` scenario, `main` observers (committed evidence) | fails: 16 rasters (no sector) | fails: 16 rasters (no sector) |
| + preamble | fails: 16 rasters (contact at 795 in geometry, F2) | fails: 16 rasters |
| + F2 | fails: 16 rasters (32 written, F3) | — |
| + F3, 1,600 frames | fails: damage pipeline not exactly once (795, 859, …) | fails: same (bottom row: allied hit 769) |
| + budgets, hostile row 180 | fails: hitbox (F4) | fails: hitbox (F4) |
| + F4 | **passes** (contact 795, slot 0, shell 113-118 × player 109-123) | **passes** (contact 1042, slot 1, shell 113-118 × player 109-123) |

Per-session PAL audit of the new replays: fence margin 9,106 / 8,639, maximum
wall 29,558 / 29,554 cycles, 0 misses — far from the worst row (1,439) and the
DMA-on maximum (31,133), so neither figure should move.

## 6. Owner decision needed

**Q1 — `lower-playfield-hostile-contact-atr-hard`.** Its purpose is a capital
shell contact in the lower playfield (`BROAD_Y ≥ 191`, the rows the full visible
raster added in `effe71c`). On HARD level 1 a low **hostile** shell is rare and
late, and the player who waits for it is hit by debris and by low allied shells
first (§3.1).

* **(a) Retarget to the allied faction (recommended).** Same lower-playfield
  rows, same clauses, preamble on the spawn row, steering corrected to the raster
  geometry (`player_y = BROAD_RASTER_TOP + 4`), waiting column x 148, the owner
  taken from the session. MEASURED (probe, 1,000 frames): first capital hit 970,
  allied shell `BROAD_Y` 204, raster row 26, bolt 209-214 × player 205-219,
  health 10 → 8 — **all clauses pass**; next damage call 1337. The session is
  renamed `lower-playfield-allied-contact-atr-hard`, so the recorded hostile
  entry leaves the file by name. The hostile faction stays covered by
  `capital-contact-hostile-medium` (mid-screen); a hostile contact in the lower
  rows is no longer gated. About 15 lines.
* **(b) Keep the hostile faction on HARD.** A waiting bot that dodges every
  non-target shell and the debris for the ~900 frames before a low hostile shell
  arrives (or a hunting bot that shifts the schedule, as `weapon-pickup-2-hunt-fire4`
  does at +226 / +350), then intercepts it. Estimate 80-120 lines of header
  policy; outcome not proven.
* **(c) Leave it recorded** (class a, with F5/F6 added to its note) and open a
  follow-up.

The two capital sessions do not depend on the answer.

## 7. Phase B steps

1. Apply the answer to Q1; focused runs show each change failing before and
   passing after (§5 for the capital sessions).
2. Commit; regenerate: `build:candidate` → `runtime:wall-trace` → `build`
   (default) → `npm test` once, in full.
3. Reconcile clause and test failures by name with the recorded files; update
   `docs/recorded-gate-failures.json`.
4. Report the worst fence margin and the DMA-on maximum with their rows. The
   evidence's `determinism.replay_fingerprint_sha256` moves (three additive CSV
   columns and three changed replays); the binding hashes in
   `dist/void-strike-65-manifest.json` and `docs/media/manifest.json` move with
   the evidence (owner decision 2026-10-01, trace-clause-repairs §8.1). `dist/`
   is never committed.
5. STATUS and the follow-up lists (`budget-1.0.md` M5, `plan-realizacji.md` §0)
   get one dated line each; this plan is marked implemented.

## 7.1 Tests

`tests/trace-clause-observers.test.mjs`: +2 — the final-raster hitbox on the
two measured contact frames (and the former logical boxes missing them by 7
scanlines), and the clause still failing on a near miss and on a horizontal gap.
`npm test` totals rise by 2.
