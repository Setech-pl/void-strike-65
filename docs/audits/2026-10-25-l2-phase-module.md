# Audit: L2 phase module (2026-10-25, Claude cross-model)

Independent, read-only, cross-model audit of the Codex-authored lever L2.

| Item | Value |
| --- | --- |
| Subject branch | `codex/l2-phase-module` @ `b2b38ff14a3ceac8e85316d96fd669d5a6a518e3` |
| Base | `main` @ `19b1464` (merge-base verified) |
| Audit branch | `audit/l2-phase-module-2026-10-25` (this file only) |
| Normal build on the audit clone | PASS, expected stale wall-trace WARNING; ATR SHA-256 `bcf3fe86fe874c6aed6c97f7924f06c4a701e8a61797786d7bee5614d8b5ac10`, **byte-identical** to the committed `dist/void-strike-65.atr` |
| Emulator | none in this clone; every cycle number below is **STATIC** unless marked **MEASURED** (host 6502 model in a repository test/script, or an author artifact, cited) |

## Scope

The L2 module at `$1900-$1FFF` (`src/hybrid/l2.s`, `src/c/l2.c`, `cfg/l2.cfg`,
`src/hybrid/l2-abi.inc`), its resident hooks in `src/main.s`, the lifetime
repair (`src/hybrid/l2-lifetime.s`, injected by `scripts/build.mjs:1481-1491`
into `HYBRID_C_SECTOR`), the checked load (`src/hybrid/level-summary.s`
`summary_load_l2`, `src/hybrid/sector-reader.s` `sector_reader_l2_guard`,
`src/hybrid/disk-guard.s` `guard_check`), the Director debris rule
(`src/c/director.c:814`), the C sector changes (`src/c/lifecycle.c`), the
level/hull compilers (`scripts/level-compiler.mjs`, `scripts/capital-hulls.mjs`,
`scripts/l2-islands.mjs`), and every new or modified test and harness file in
`19b1464..b2b38ff`.

## Method

1. Preflight as instructed. `npm run build` (normal) on the audit branch.
2. Static enumeration of every reference to `$1900-$1FFF`, `L2_*`, `$86B4`
   and the self-modified operand `$5EF0` in `src/`, followed through every
   caller (main loop, capital vector table and its boss image, boss slot A
   range `$6DE8-$75E8`, C sector functions, Director, summary, reader,
   interrupts, pause, exits).
3. Generated code read from `build/l2-generated.s`, `build/*.lbl`, `build/*.map`.
4. Focused tests run on the branch: `l2-brake`, `l2-coordinate`, `l2-islands`,
   `l2-lifetime`, `sector-reader`, `boss-claim`, `level-compiler` (62/62 PASS)
   and `boss-runtime` (11/13, see L2-01). Host script `scripts/l2-backing-check.mjs`
   run (PASS, 1,640 cases). For L2-01 a temporary detached worktree of `main`
   `19b1464` was built and `boss-runtime` run there; the worktree is removed.
5. Author evidence read: `docs/diagnostics/l2-phase-b/recovery/` (README,
   `matrix-results.json`, `*-after-5500.json`, focused test logs),
   `docs/plans/l2-phase-module.md` results, `docs/STATUS.md`, owner decision §BW.

Logs: `~/Projects/void-strike-audit-leftovers/l2-audit-*.log`; fix sketches:
`~/Projects/void-strike-audit-leftovers/l2-audit-2026-10-25-fix-sketches.md`.

## Results table

| # | Check | Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| M1 | L2 lifetime, every path into `$1900-$1FFF` | static enumeration of all callers + boss vector/slot-A overwrite analysis | **PASS** (with precision note, see below and L2-07) | below |
| M2 | Checked load and re-arm | static + focused tests run | **PASS**; latent invariant weakness L2-04 | below |
| M3 | 960-row coordinate | static + `l2-coordinate` run | **PASS** | below |
| M4 | Director debris rule | static diff + compiler rule | **PASS** | below |
| M5 | Islands | static + `l2-islands`, `l2-backing-check` run | **PASS** | below |
| M6 | Brake and warning | static + `l2-brake` run | **PASS**; **FINDING** L2-05 (S4) | below |
| M7 | Frame budget | static cycle count + author matrix data | **FINDING** L2-02 (S3) | below |
| M8 | Harness/test integrity | diff review + test runs, main comparison | **FINDING** L2-01 (S3), L2-03 (S3), L2-08 (S4) | below |
| M9 | Sector reader extension | static + `sector-reader` run | **PASS** | below |
| M10 | Resource claims | manifest/map/bin re-derivation | **PASS** (doc nits in L2-07) | below |
| M11 | Protected ranges | diff + bin comparison vs main | **PASS** | below |
| M12 | Anything else | review | **FINDING** L2-04 (S3), L2-06 (S4), L2-07 (S4) | below |

### M1 — L2 lifetime (PASS)

Every resident reference to L2 (STATIC, `grep` over `src/`):

| Site | Address | Reached when | Closed after boss install by |
| --- | --- | --- | --- |
| `profile_after_player: jsr L2_BRAKE` (operand `$5EF0`) | `$5EEF` BROADSIDE | **every** main-loop frame | `l2_disarm` (`$8656`) rewrites the operand to `$3114` before the first boss read (`main.s:13387`); only `l2_rearm` in INIT writes `$1909` back (`l2.s:311-318`). No other writer of `$5EF0`; BROADSIDE is copied from its load image only in the boot `start` path (`main.s:1345-1410`, helpers `main.s:1580-1595`), never after |
| `update_starfield` / `world_rotate_due` `lda L2_SCROLL_RATE` | `$564E`, `$69D7` | every frame | the byte is resident `$86B4`, zeroed by disarm. Zero rate also stops the world (no ring rotate → no Director row tick → no sector entry → no `CAPITAL_DUE`), which is the boss's "world stops" rule now (the old `world_scroll_rates` zeroing in `boss.s:3369-3373` no longer affects the scroll, only pickup motion) |
| `player_inside_universal_hull_corridor: jmp L2_CONTACT` | `$949C` | via `CAPITAL_VECTOR_HULL_CONTACT` → `handle_player_hull_contact` (slot A) on **every non-dying frame, SPACE included** | the boss vector image replaces HULL_CONTACT with `boss_rts` (`boss.s:226-237`) and slot A itself is overwritten |
| `draw_hull_row: jmp L2_DRAW_ROW` | `$6730` | `prepare_hull_cells` (PREPARE_ROW vector, state COMBAT), `commit_prepared_hull_row @miss`, `generate_corridor_row` (no caller found) | PREPARE_ROW → `boss_motion`, SCROLL_HULL → `boss_rts`; boss runs in FIGHTER |
| `commit_prepared_hull_row: jsr L2_COMMIT_ROW` | `$9385` | `scroll_hull_columns_advance_scene`, states < DRAIN, via SCROLL_HULL | SCROLL_HULL → `boss_rts` |
| `schedule_broadside: jsr L2_WARNING` | `$6EDF` | capital broadside | inside slot A (`$6DE8-$75E8`), overwritten by the boss slot A image |
| `update_sector_state → l2_c_phase` (`$190F`) | C sector | scroll_hull_columns_advance_scene only | as above |
| `sector_c_update_first_capital → l2_c_enter` (`$1912`) | C sector | `CAPITAL_DUE` pending and FIGHTER and drained | `asm_boss_enter` never returns; `CAPITAL_DUE` cannot be pending at boss entry because the Director advances a capital sector only after `CAPITAL_ADMITTED` and OPEN (`director.c:658-667`); after install the zero rate freezes the row clock |
| `summary_load_l2 → L2_INIT` | `$0BEF` | after a checked run only | — (the re-arm point) |

Not reachable: VBI/DLI/audio (no reference to `$19xx` or `$86B4`), Light
kernel, pickups (`main.s:10363` reads `world_scroll_rates`, resident), pause
(`enter_pause`… `resume_gameplay` call no hook), exits (`quit_gameplay_to_menu`,
`enter_game_over`, `sector_reader_level_end`, failure screen), death/respawn
(L2 intact; only the boss overwrites `$1900`). RESET is an OS cold start
(`main.s:1294`). The only production entry into `start_gameplay` is
`sector_reader_start_gameplay → SUMMARY_START_GAME` (`sector-reader.s:268-269`;
`main.s:11744/11746` are review-harness builds only). Boss transition frame:
the disarm runs inside `integration_update_first_capital`, before
`profile_after_player` of that frame, with NMIEN = 0 (asserted by the
lifetime test, run: PASS). **No path into overwritten L2 found.**

Precision note: the author table (`recovery/README.md`, "Draw … contact …
warning — capital-only call paths; state drained to FIGHTER") is wrong for
contact: L2 contact runs on every SPACE frame in FIGHTER state. It is closed
in the boss by the vector image, not by the FIGHTER state (L2-07).

### M2 — Checked load and re-arm (PASS)

* `summary_load_l2` (`level-summary.s:1145-1154`) runs on every START GAME,
  including the resident-level hit (`beq summary_level_loaded` path), after
  the level guard; failure → `summary_failed` → failure screen → menu.
* `sector_reader_run_checked` folds every accepted sector; `guard_check`
  → `$A5E4` compares entry 11 with `sr_l2_fold`. Re-derived fold of
  `build/l2.bin` (all 14 sectors, reserve included): lo `$76`, hi `$98`, equal
  to the bytes at `$A5F7/$A5F8` and to STATUS `$9876` (STATIC, script).
* A read or checksum failure returns C=1 before INIT; `sector-reader.test.mjs`
  "L2 START GAME reloads on a resident level hit and rejects corrupt run"
  requires zero fetches in `$1900-$1FFF` (run: PASS, MEASURED host model).
* Disarm list: blank (NMIEN/DMACTL), operand → `$3114`, `$86B4` ← 0. INIT
  list: operand → `$1909`, `$86B4` ← 0; the first brake tick (before
  `update_starfield` in the same frame) sets the difficulty rate. Display and
  NMIEN are re-enabled by `start_gameplay`. The lists match.
* Caveat (L2-04): after any non-boss exit or a failed reload the operand
  stays `$1909`; it is safe only because the main loop is unreachable then.

### M3 — 960-row coordinate (PASS)

* `l2_c_enter`: start = 960 − rows, 16-bit with borrow (`l2.c:28-31`); checked
  for 288…960 (480 → `$1E0`, 288 → `$2A0`, 960 → 0).
* `l2_c_phase`: module = `HI<<5 | LO>>3`, `HI>3` → DRAIN; 120 → PROW,
  121 (row 968) → DRAIN. `l2_interval`: `cpx #4`, module < 120,
  `$AD80+x` ≤ `$ADF7`. `resolve_*_sector_row`/`visible_hull_sector_row`
  already 16-bit, bounded by `CAPITAL_HULL_SECTOR_ROWS = 960`,
  `CAPITAL_HULL_STREAM_ROWS = 968`; sequences 120 B at `$AC08`/`$AC80`.
* Legacy lengths: phase starts shift by exactly +60 modules (`[64,74,106,116]`,
  level-compiler test), drain 61 → 121, unused modules 0-59 filled with the
  engine module; host station selection unchanged for 288/352/416/480
  (`HULL_COMBAT_ROW_STEPS` branch kept). Byte boundaries 255/256, 511/512,
  767/768, 959/960/968 are exercised by `l2-coordinate` (rows first…989, all
  six lengths; run: PASS).
* `main.s:8034` keeps the old reserve with a literal `120`; the assert
  message on `main.s:8035` still says "480-row" (L2-07).

### M4 — Director debris rule (PASS)

Old rule rejected debris for a zero flag only when the state was ≥ DRAIN;
new rule rejects for a zero flag always (`director.c:814-818`). The outcomes
differ only for capital states 0-4, i.e. in a capital sector, whose flag the
compiler now forces to 0 (`l2-islands.mjs:30`). SPACE (state 7) and boss
(state 7) unchanged; the capital entry wait in FIGHTER was already ≥ DRAIN.
Carry-in: `l2-backing-check` worst carry 47 rows at every normal and half
rate vs first island row 96 (MEASURED, host model, run: PASS); the compiler
minimum `firstRow` is 64 (> 47).

### M5 — Islands (PASS)

* Interval/push: overlap test `x < right && x+7 ≥ left`; minimum displacement,
  ties left; caps 116/112/108 – 140/144/148 give 6/8/10 cells as §BW.2;
  push stays inside the corridor. Rows checked = `((y−8)&7+14)/8+1`, equal to
  the hull contact's `PLAYER_COLLISION_LAST_ROW = 14`, `BROADSIDE_SCREEN_TOP = 8`
  formula (but hard-coded, L2-06).
* Damage via `apply_broadside_player_damage` (2 HULL, cooldown 25, Shield and
  lifecycle respected): `l2-islands` run PASS.
* No island near DRAIN: compiler requires `row + height ≤ rows − 64`, so the
  last island row ≤ 895 on the universal axis, 72 rows before 968 — none is
  on screen while DRAIN skips island contact.
* Art: three recipes, roles 0-9 added to bases 59/198 (hull glyph ranges),
  zero new glyph slots; both palettes exercised by the test.
* Backing/cache/ring reuse: 1,640 cases (MEASURED, host, run: PASS).

### M6 — Brake and warning (PASS, L2-05)

`l2_brake_tick`: states 0-6 only (SPACE/boss → normal), PLAYER_LIFECYCLE =
DYING → normal, out-of-range rate → normal, down at Y=225 ramps −1/frame to
8/9/10, release +1/frame to 16/18/20 (8/9/10 frames). World and hull
accumulators get the same numerator every frame and start equal
(`main.s:3438-3439`), so hull, islands, turret tracking and the Director row
clock stay in phase. Warning: Y ≥ 201 → 35 else 25, X preserved (`l2-brake`
asserts it; run: PASS); shell motion untouched. See L2-05 for the un-ramped
exit and the pickup speed.

### M7 — Frame budget (FINDING L2-02)

Author data (MEASURED, `recovery/matrix-results.json`): all ten frames above
31,500 are on route `l2-480-2-brake` (peak 31,598); that route's
`capitalPeak` is **17,271**, so the ten frames are **not capital frames**.
Isolation window (same 5,500 frames, same policy, `*-after-5500.json`):
main 31,417, L2/480 31,567, L2/960 31,586.

STATIC delta per SPACE frame (from `build/l2-generated.s`, `l2.s`, `main.s`):

| Change | Old | New | Δ cycles |
| --- | ---: | ---: | ---: |
| brake hook: `jsr $1909` → `jsr _l2_brake_tick` → state≥7 path → `jmp integration_update_enemy` | 6 | 42 | **+36** |
| contact: `jmp L2_CONTACT` → `jmp l2_contact` → `lda/cmp/bcs` state test | — | 15 | **+15** |
| `update_starfield` rate selection (OPEN) | 21 | 7 | −14 |
| `world_rotate_due` rate (4 NOP pad) | 10 | 12 | +2 |
| **Net per SPACE frame** | | | **≈ +39** |

Capital frames: rate selection −10, plus the measured L2 work (row 1,939
incl. shared renderer, contact 1,267 incl. damage, brake ≤ 101 — MEASURED
host, focused tests). The 40-column ring copy (`main.s:6700-6710`) is
cold: both accumulators are identical, so every hull step coincides with a
ring rotate and takes `scroll_hull_columns_advance_scene` (STATIC). The
+150/+169 measured isolation delta is larger than +39 and is not
attributable statically (trajectories diverge); the per-frame overhead is
the only systematic new SPACE cost found, and it is avoidable (L2-02).

### M8 — Harness/test integrity (FINDINGS L2-01, L2-03, L2-08)

* `boss-claim`: L2 added as an allowed home inside slot D — justified by §BW;
  the reserve bound is enforced by `l2.s:322` (`l2_end ≤ $1F00`), not by the
  test.
* `level-compiler`: the rejected length 400 → 964 (400 is now legal), 13 → 16
  sectors, phase starts +60, debris sector 3 → 0: all behaviour-driven. Stale
  messages (L2-07).
* `sector-reader`: empty-entry index 11 → 12 (11 is now valid); expected
  frame counts +14; new real-reader tests for good/corrupt L2 and resident
  hit. Sound.
* `boss-runtime`: Q-S4 extended with full-L2 and re-arm assertions (good),
  **but another test in the same file now fails** (L2-01).
* `l2-*`: substantive; the island contact expectation reuses the implementation's
  row formula (cannot catch a wrong row model; equivalence checked by hand in M5).
* `l2-lifetime` and the native lifetime observer: narrow (L2-03).
* Build gates: `runtime-cycles`/`measure-boss-death`/the computed gate load L2
  through the real reader (`loadCheckedL2Image`), not by copying bytes —
  good. No gate threshold was relaxed in `scripts/build.mjs`.

### M9 — Sector reader extension (PASS)

`guard_check` (`$3993`) becomes `jmp $A5E4`, same 3 B as the displaced
`lda guard_entry`; `sector_reader_l2_guard` re-executes it, dispatches entry
11 to `guard_compare` with `sr_l2_fold`, else `jmp guard_check_inline` with
A = `guard_entry` (what the inline path expects). 19 B code + 2 B fold;
`SECTOR_READER` `$A000-$A5F8` (1,529 B), 7 B tail (`build/sector-reader.map`).
Build cross-checks the `jmp` and `$A5E4` (`build.mjs:2935-2940`). Read errors
return before `guard_check`. Other users: `run_checked` and boss
`banner_reads` (entry 1 → inline); `guard_compare` callers untouched. Nothing
maps over `$A5E4-$A5F8` (memory map scan). `sector-reader` 14-sector and
corrupt-sector tests PASS.

### M10 — Resource claims (PASS)

Re-derived from the fresh build: L2 `$1900-$1D26` = 1,063 B (`build/l2.map`);
`build/l2.bin` 1,792 B, bytes `$1D27-$1FFF` all zero (reserve untouched);
473 B = `$1D27-$1EFF`. Run 11: sectors 251-264, destination `$1900`, 14
sectors; menu 240-250; no sector overlap among the 51 manifest runs. Level
image 16 sectors at sector 320, `$A600-$ADFF`. Initial content 12,807 B,
boot 101 sectors, 211 total (manifest). Reader 1,529/1,536, summary
`$0500-$0BFF` 1,792/1,792, C sector `$8602-$86F2` 241 B with `l2_disarm`
`$8656` and `$86B4` inside its pinned padding. STATUS numbers agree; doc
nits in L2-07.

### M11 — Protected ranges (PASS)

Summary bytes vs main differ only at `$057F-$0581` (the call),
`$0BCF`/`$0BDF` (level 1's sum, the image changed) and the former tail
`$0BEF-$0BFF` (`summary_load_l2`); `$0500-$0BEE` code otherwise identical.
MAIN `$3615-$3AEE`: same-size patch at `guard_check` `$3993` and the guard
sum table values; Light kernel layout pinned (`sector-reader` test asserts
`life_capsule_start $3A14`, `pause_frontend_marker_positions $3AE5`,
1,196 B). Menu `$0C00-$117F`, M3-H `$549E-$54BD`, `$B8FB-$B8FF`, L2 reserve:
no new reference in `src/`/`cfg/`; the island tests snapshot all of them
unchanged (run: PASS).

### M12 — Other (FINDINGS L2-04, L2-06, L2-07)

See findings. Forward risks: dock 352 + bonus 128 (ESTIMATE) vs 473 B free is
−7 B (documented by the authors); summary 1,792/1,792 leaves M4 no room to
add a next-level path inside it, which raises the L2-04 risk.

## Findings

### L2-01 — S3 — Unreported focused-test regression in `boss-runtime`

**Location:** `tests/boss-runtime.test.mjs:324-348`.

**Reproduction (MEASURED):** `node --test tests/boss-runtime.test.mjs` on
`b2b38ff`: 11/13; "the world scroll stops in the boss sector and runs again
after the START GAME restore" fails with *the world did not scroll again (0
rotations in 200 frames)*. On `main` `19b1464` (temporary worktree) the same
test passes; "the win: … hand-off to the level summary" fails on **both**
with the same message (pre-existing, not counted here).

**Reasoning:** the scroll rate is now only the resident `$86B4`, written by
the L2 brake tick; the test's START GAME model (summary restore + slot A +
vector table) has no checked L2 load, INIT or brake tick, so the rate stays
0. Real gameplay is unaffected (M2: `summary_load_l2` always precedes
`start_gameplay`; the first frame's brake tick sets the rate). But the
authors list `boss-runtime` as an edited test and claim focused tests pass;
their log shows only the Q-S4 test from this file was run
(`recovery/l2-postboss-reload-tests.log`).

**Fix:** in the test, run `loadCheckedL2` and one `profile_after_player`
before the scroll assertion; record that `summary_boss_restore`'s rate-table
restore now matters only for pickup motion. Sketch in leftovers.

### L2-02 — S3 — New per-frame cost on every SPACE frame, behind the over-target frames

**Location:** `src/main.s:2823` (`jsr L2_BRAKE`), `src/main.s:7650`
(`jmp L2_CONTACT`), `src/hybrid/l2.s:21-23,114-121`, `src/c/l2.c:50-55`.

**Reasoning:** STATIC ≈ +39 cycles per SPACE frame (table in M7), work that
does nothing outside a capital. The ten frames above the 31,500 target are
all outside capital frames (route `capitalPeak` 17,271 vs peak 31,598,
MEASURED author data). The plan priced the brake at 33 CPU in SPACE
(`docs/plans/l2-phase-module.md:172`), but STATUS/README report only "zero
new gameplay-frame cycles" for the repair and never state the SPACE cost; the
contact hook's +15 is not priced anywhere. The hard gate (32,568) holds.

**Fix:** arm the brake operand only in a capital (`l2_c_enter` writes
`$1909`; the brake tick ramps back to normal in state ≥ 7 and then writes
`$3114` itself; INIT sets the SPACE rate once and leaves `$3114`). SPACE then
pays −14 + 2 against main. Gate the contact hook in main with a 9-cycle state
test (13 B padding available) or restore the inline base test and enter L2
only in states 0-4. Cold cost only; this also fixes L2-05's exit ramp.

### L2-03 — S3 — Lifetime evidence can only see the defects already known

**Location:** `scripts/atari800-wall-trace.h` `dftrace_l2_lifetime`;
`tests/l2-lifetime.test.mjs:8-40`.

**Reasoning:** the native observer counts as stale only (a) `JSR`/`JMP`
absolute with operand `$1900-$1915` and (b) `LDA abs/abs,X/abs,Y` of `$1918`,
and only from PCs in `$2000-$3AFF`, `$5400-$6DE7`, `$8000-$9FFF`. It cannot
see calls from resident `$75E8-$780F`, `$3B00-$53FF`, `$A000-$BFFF`, the
summary, indirect jumps, reads of any other L2 table, or data writes into
`$1900-$1FFF`. The unit test, after boss entry, calls only three routines
(brake slice, `update_starfield`, `world_rotate_due`) for 20 "frames", not
the main loop, and re-arms via `$A006` + `$1900` rather than
`summary_load_l2` (the real summary path is covered by Q-S4, so L1-01 is
only partly at stake). The static enumeration in M1 found no other path, so
this is an evidence weakness, not a defect.

**Fix:** flag any fetch in `$1900-$1FFF` whose previous PC lies outside the
installed boss/death images, and any absolute/indexed/indirect operand into
`$1900-$1FFF` executed outside L2/boss/death images, over all resident
code; run the full `main_loop` body in the unit test. Sketch in leftovers.

### L2-04 — S3 (latent) — The arming invariant holds by control flow only

**Location:** `src/hybrid/l2.s:311-318`, `src/hybrid/l2-lifetime.s`,
`src/main.s:3150` (`quit_gameplay_to_menu`), `src/main.s:1961`
(`enter_game_over`), `src/hybrid/sector-reader.s:294`,
`src/hybrid/level-summary.s:1145`.

**Reasoning:** `$5EF0` stays `$1909` and `$86B4` non-zero after every exit
that is not a boss (GAME OVER, pause-quit, level end, failed L2 reload).
Today that is safe only because `start_gameplay` is reachable solely through
`summary_load_l2`. The capital hooks (draw/commit/contact/warning/phase/enter)
also carry no runtime guard. Planned work can break the assumption silently:
the M6 demo/attract mode running gameplay from the menu, an M4 next-level
loop that skips `summary_start_game` (the summary is full), or any future
`$1900` menu-phase overlay. The result would be a jump into foreign code
(S1 if it happens). The M2 claim "never leaves the brake/rate armed" is true
only in the reachability sense.

**Fix:** disarm (operand `$3114`, legal rate) on every gameplay exit and at
the head of `summary_load_l2` before the read; optionally an "L2 valid" byte
set by INIT, cleared by disarm, checked by `start_gameplay` (fail closed to
the failure screen). Cold only, ~10-20 B from the 75 B reclaimable C-sector
padding.

### L2-05 — S4 — Brake exit snaps to full speed; pickups ignore the brake

**Location:** `src/c/l2.c:50-55`; `src/main.s:10360-10363`.

**Reasoning:** in state ≥ 7 (capital → SPACE) or DYING the rate jumps from
half to normal in one frame; §BW.4 says "release ramps back". The brake also
stays active in DRAIN/COMPLETE (states 5/6), still inside the capital
sector, which matches §BW.4 but is not called out. The weapon capsule's
motion still uses `world_scroll_rates` (unbraked), and capital sectors admit
pickups (`level-01.json` sector 2 `pickups: true`), so a braked capsule moves
at 1.0× instead of 0.5× world speed. Owner-feel items for the smoke.

**Fix:** ramp up in state ≥ 7 (folds into L2-02); optionally derive the
pickup step from `$86B4`.

### L2-06 — S4 — Unchecked hard-coded addresses and constants in L2

**Location:** `src/c/l2.c:1-68`; `src/hybrid/l2.s:114-215`.

**Reasoning:** `l2.c` uses literal `$008C`, `$85EF`, `$4EA5`, `$4E70`,
`$0081`, `$0090`, `$4E4F`, `$4E62`, `$80F6`, `$4EAA` and the level-page
offsets. All are correct today (verified against `build/*.lbl` and the
`BROAD_*` layout), but the comment on `l2.c:5` says "checked by build" and
`build.mjs` resolves only the ASM `l2MainNames`. `l2.s` hard-codes 14, 8, `#6`,
`$54`, `$AC`, 59, 198. `l2_warning_set_timer` must preserve X for
`schedule_broadside`; that depends on cc65 codegen (the brake test does
assert it).

**Fix:** generate an `l2-abi.h` from labels as for `l2-main.inc`, or add a
build check list; import the main constants into `l2.s`.

### L2-07 — S4 — Stale or inaccurate documentation

* `recovery/README.md` lifetime table: contact is not a "capital-only call
  path"; it runs every SPACE frame and is closed in the boss by the vector
  image (M1).
* `docs/STATUS.md:144` "NEXT TASK: see the current L2 Phase A checkpoint" (stale; the current NEXT TASK is at `:79`).
* `src/main.s:8035` assert text "480-row coordinate".
* `tests/level-compiler.test.mjs` title "geometry page says 480 rows" and the
  message "the two sequences end the 128-byte page".
* `docs/memory-map.md:82` `$0C00-$1FFF` "boss sector only; no other link … may
  reach it" now has the L2 (and menu) exceptions.

### L2-08 — S4 — Diagnostic-harness allowances to label

`scripts/trace-artifacts.mjs` accepts the variants `l2-capital-960` and
`l2-main-control`, the latter even when the manifest says `level-1-s1`, and
adds `--reuse-existing-traces` to the diagnostic flags. The L2 policies top
up guest lives (`dftrace_hold_player_lives`) while reports state
`guest_instrumentation_bytes: 0` (meaning code bytes). All of this is
diagnostic-only and never release evidence, but the reports should say so.

## Not verified, and why

* Any native/emulator number (the 47,326-frame matrix, the ten over-target
  frames per frame, boss stress 8,478/8,500, boss entry 325-344, load +54/+64/
  +65 frames, menu 599/1,389, boot/RESET/130XE smoke, page-cross table): the
  clone has no Atari800 trace sources and wall-trace was out of scope. They
  are cited as author MEASURED data only.
* Per-frame attribution of the ten over-target frames: no frame-level CSV is
  committed for that route (`build/l2-native-matrix/` is not in Git).
* Island art appearance, colours on screen and real-hardware behaviour: owner smoke.
* `boss-runtime` "the win" failure root cause: pre-existing on main, out of scope.
* Full `npm test`: not run (proportional validation; release pass).

## Merge recommendation

**Merge after fixes.** No S1/S2 defect was found. The lifetime repair closes
every path into overwritten L2 that a static enumeration can find, and the
checked load, 960-row coordinate, debris rule, islands and brake all match
§BW. Before merging: fix or update the regressed `boss-runtime` test (L2-01)
and correct the README/STATUS statements (L2-02 SPACE cost, L2-07 contact
closure). Strongly recommended before M4/M6 build on L2: L2-02 (removes the
systematic SPACE overhead behind the over-target frames) and L2-04 (makes the
arming invariant fail closed). The owner's hardware smoke remains the gate
for acceptance.
