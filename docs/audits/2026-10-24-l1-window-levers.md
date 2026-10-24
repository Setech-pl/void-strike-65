# Audit: L1 window levers (2026-10-24, Claude cross-model)

Independent, read-only cross-model audit of Codex's lever L1.

| Item | Value |
| --- | --- |
| Subject | `codex/l1-window-levers` @ `382b91a484d12fd82cdc26180ee66dd5e18906ec` (fetched from `~/Projects/dark-fighter`) |
| Base | `main` @ `a3c8e47` (merge-base verified) |
| Audit branch | `audit/l1-window-levers-2026-10-24` (this file is its only change) |
| Auditor | Claude Opus 5.5 (Claude Code), 2026-10-24 |
| Game files changed | none |

## Scope and method

The audit covered every file in `a3c8e47..382b91a` (33 files, 7 commits), with
`src/main.s`, `src/hybrid/light-kernel.s`, `scripts/build.mjs`, the cfgs and the
test/harness diffs read in full.

- **Builds.** I ran `npm run build` (normal) at 382b91a and at a3c8e47, the
  latter in a temporary detached worktree under
  `~/Projects/void-strike-audit-leftovers/`. Both pass, with only the expected
  stale wall-trace WARNING. The L1 ATR SHA-256 is
  `63bf14c0858d934f98ef99957cf9c083bfe3503ebd27c4640413acb6af1d5935`. This is
  the authors' `campaign.atr`, so the build reproduces (MEASURED).
- **Tests.** I ran the 10 test files the branch touched, plus 15 untouched
  files that use the shared boot fixture, on both trees (`node --test <files>`).
- **Throwaway probes** (all in `~/Projects/void-strike-audit-leftovers/probes/`,
  none in the repo):
  - a binary scan of every built image for absolute operands into the old
    window;
  - a write-watch on `$3615-$3AFF` across the real boss entries (levels 1, 4,
    5, 7, 9, 10);
  - a static taken-branch page-cross comparison, base vs L1, for the Light
    kernel and for main's code segments;
  - native cycle micro-measurements on the repo's own NMOS 6502 model (it
    counts page-cross penalties);
  - a native replay of the real boot order (record 9 held at `$0C00`, then
    `unpack_loader_bitmap` -> `publish_light_record` -> `unpack_starfield_runtime`);
  - a fixture-fidelity probe;
  - the Spine field/lance stress for levels 7 and 9 in three variants:
    base-original, L1-without-`stopAt`, and L1 as committed.
- **Not run, per the brief:** wall-trace, boot smoke (the clone has no Atari800
  trace source), showcase, stage-2, reconcile and the release build.
- **Number labels.** MEASURED means build/test/probe output on these trees.
  STATIC means instruction/byte reasoning.
- **Cleanup.** The temporary worktrees were removed at the end. The normal
  build rewrites the tracked `dist/` files; I restored them with `git checkout`
  before committing.

## Results M1–M12

| # | Check | Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| M2 | Load order and survival of `$3615-$3AFF` | Read stage 2, boot path, every DMA/PMG writer; write-watch over 6 boss entries; native real-order replay | **PASS** | See §M2 below. |
| M1 | No reference left to `$B478-$B8FA` | Text search over src/scripts/tests/cfg/generated `.inc`/`.h`; opcode-level scan of every built `.bin` and the ATR | **PASS** (comments stale, L1-07) | See §M1 below. |
| M3 | Menu-overlay readers are always behind a checked read | Caller graph of every frontend entry; reference list of every label in `$0C00-$117F`; reader error path | **PASS** (two S4 notes, L1-06) | See §M3 below. |
| M9 | Hardware path of the menu-entry read | Read `enter_frontend_state` and the reader's POKEY setup/quiesce | **PASS** (static; the screen during the read is not observed) | See §M9 below. |
| M8 | Harness/test integrity | Every changed test and harness file read; 15 untouched fixture-based files run on both trees; Spine stress in 3 variants | **FINDING** (L1-01, L1-03, L1-04) | See §M8 below. |
| M5 | Pause / pause-quit | Marker dispatch, pause records, display list, renderer addresses | **PASS** | See §M5 below. |
| M4 | Phase exclusivity of `$0C00-$18FF` | Every map/cfg owner below `$2000`; every overlay reader | **PASS** (L2 note, L1-08) | See §M4 below. |
| M6 | M3-H reservation `$549E-$54BD` | Labels, cfg area, asserts, nearby writers | **PASS** | See §M6 below. |
| M7 | Per-frame cost and page crossings | Static branch-cross comparison base vs L1 for the Light kernel *and* main's segments; NMOS-model cycles | **FINDING** (L1-02) | See §M7 below. |
| M10 | Is the 31,538-cycle frame new? | Searched for a clean-main run of the same route; static attribution | **UNVERIFIED** (no a3c8e47 measurement exists; static evidence points to L1, L1-02) | See §M10 below. |
| M11 | Resource claims | manifest.json, maps, DFMC manifest bytes, overlay/level directories, `memory-map-report --check` | **PASS** | See §M11 below. |
| M12 | Anything else | — | **FINDING** (S4 items, L1-06 – L1-09) | See the findings list. |

### Evidence per check

**M2 — Load order and survival.**
- *Checksum before publish.* Stage 2 validates record 9 (dest `$3643`, raw
  `$04AC`, LZ, packed-hi `<$05`; `src/main.s:13007-13034`). It checks the CRC16
  over the staged sectors before the copy to `$0C00`
  (`src/main.s:12650-12693`).
- *Publish after the bitmap unpack.* `unpack_loader_bitmap` decodes the bitmap
  to `$4010-$5E0F` and the display list to `$3C00`, then jumps to
  `publish_light_record` (`src/main.s:3401-3420`). It is called once
  (`src/main.s:1339`).
- *The publish's own check.* It verifies the decoder ends at `$3AEF`
  (`src/main.s:3372-3392`).
- *DFMC record index.* Record 9 is index 9 of 11 (counter = 3) in both the
  validate pass and the load pass (DFMC bytes in `build/chunk-manifest.bin`).
- *Native replay of the real order:* the published `$3643-$3AEE` equals
  `build/light-kernel.bin` byte for byte, with no failure branch. The loader
  display list is correct. STARFIELD is then byte-exact (MEASURED).
- *Writers after boot.*
  - `clear_pmg` clears only `$3B00-$3FFF` (`src/main.s:3460-3473`).
  - PMBASE is written once, as `$38` (`src/main.s:11694`).
  - Every PMG DMACTL value is `$3E` (single-line). The others are `$00`,
    `$21` or `$22`, which have no PMG DMA. So double-line placement never
    occurs.
  - The write-watch over boss entries for levels 1, 4, 5, 7, 9 and 10 sees only
    two writers: the capital vector table `$3652-$3675` (boss install
    PC `$7823`, by design; restored from `capital_vector_image` `$39DA`) and
    the disk guard's own state `$39D7-$39D9`.
  - No cfg/map segment of boss, boss-death, summary, splash or the menu run
    reaches `$3615-$3AFF`.
- *RESET.* RESET is an OS cold start (COLDST stays `$FF`; `docs/STATUS.md`
  §boot-loading-blank-screen), so it re-runs stage 2. The authors'
  RESET boot smoke could not be re-run here.

**M1 — No references left to the old range.**
- The text hits that remain are history comments (`c-asm-abi.s:645-653`,
  `light-kernel.s:198`, test comments) or real `$B600`/`$B720`/`$B8xx`
  window data.
- The opcode scan finds no `JSR`/`JMP` into the old range. One candidate
  (`$27CE`) disassembles as `JSR $205C; LDA #$B5`. Base still had
  `JSR $B478`/`$B7BB`/`$B791`/`$B7AB` in boss-death and banners; L1 has none.
- `CAPITAL_VECTOR_TABLE = $3652` and the `guard_*` addresses are generated into
  `build/boss-imports.inc` and `build/summary-reader-abi.inc`.
- The LIFE pins are asserted at both link ends (`src/main.s:10555,13411`;
  `life-capsule.s`).
- Pin `boss_enter_read = $39FE` matches `light-kernel.lbl`.

**M3 — Menu-overlay readers.**
- Only `STATE_MAIN_MENU` and `STATE_GAME_OVER` can be entered from outside the
  frontend. Both read run 10 before rendering or starting music
  (`src/main.s:1975-2018`).
- OPTIONS, TOP SCORES, EXIT and ENDED are reachable only from the main menu
  (`src/main.s:1768-1863`).
- Every overlay label is referenced only from frontend, menu-star or
  menu-music code (reference list in the probe log).
- On error: C=1 → failure screen (resident display list and records) → FIRE →
  `quit_gameplay_to_menu` → re-read. No garbage is consumed.
- `$1118-$18FF` has no reader. The read writes `$0C00-$117F`, with 104 zero
  pad bytes.

**M9 — Hardware path of the menu-entry read.**
- Before the read: `music_stop`, DMACTL=0, GRACTL=0 and NMIEN=0
  (`clear_pmg_graphics_latches`), so no VBI or DLI runs during it.
- The read uses the same bit-banged reader as level loads. The quiesce leaves
  IRQEN=0, AUDCTL=0, SKCTL=`$03` (= `SKCTL_AUDIO`) and PBCTL idle
  (`sector-reader.s:1110-1121`).
- DSTATS does not apply: this path does not use SIOV. The stage-2 DSTATS fix
  is untouched.
- Menu music starts only after a good read.
- `SUMMARY_ANIMATE` writes 40 B at `$4190` during the read. The menu render
  then clears that area.
- During the ~0.84 s read the screen shows DMA off (COLBK only). This is not
  observed in an emulator.

**M8 — Harness/test integrity.**
- *Fixture failures.* The 15 untouched fixture-based files fail 29 tests at L1
  vs 4 at a3c8e47. That is 25 new failures, caused by fixture corruption
  (L1-01).
- *Pins.* Pre-existing failing pins were rewritten as self-referential or
  ceiling checks, and one failing test was re-pointed but still fails (L1-03).
- *Disclosure.* The authors' 107/107 omits the 2 failures in
  `boss-runtime.test.mjs`, a file they edited (L1-04).
- *Spine `stopAt`.* The `stopAt boss_death_read` change was tested over all
  19 lance modes at L7 and L9 in three variants: base harness, L1 without
  `stopAt`, and L1 as committed (MEASURED).
  - L9: every mode is identical in all three variants. The maximum is swap
    8,446, which matches the authors.
  - L7: 18 of 19 modes are identical (maximum swap 8,191).
  - L7 `kill`: the old harness already throws at a3c8e47
    (`routine $b49f did not return`, the completion vector), and it throws the
    same way at L1 without `stopAt` (`$366a`). With `stopAt` it gives 7,957.
  - So this is a fix to a pre-existing harness hole, not an L1 effect. Only
    that one mode's final-kill frame is truncated, at the hand-off.
  - The gate can still fail, because the `LIMIT` and the test assertions are
    untouched.

**M5 — Pause / pause-quit.**
- Markers 8–12 resolve through `PAUSE_FRONTEND_MARKERS` at `$3AE5`
  (`src/main.s:2423-2446`).
- The pause data (BROADSIDE `$6B4C`/`$6B90`), `frontend_screen_data`
  (RODATA `$31AA`) and `frontend_text_display_list` (ENTITY_CODE `$9482`) are
  all resident.
- `tests/menu-stars.test.mjs` passes the pause states after each of the 4
  boss entries.
- EXIT-confirm uses the same resident markers 8–9.

**M4 — Phase exclusivity of `$0C00-$18FF`.**
- Owners:
  - summary module `$0500-$0BEE` (`level-summary.map`);
  - boss charset `$0C00` plus slot C / banner `$1000-$17FF`, scratch
    `$1800-$18FF` and slot D `$1900-$1FFF`;
  - boss-death `$1000-$19FE` and `$1E00-$1FFF`;
  - the boot-only Light hold `$0C00-$1007`;
  - the menu run `$0C00-$117F`;
  - the level buffer at `$A600` (not in this range).
- No reader of a phase runs after another phase has overwritten it. Every
  menu reader re-reads first.

**M6 — M3-H reservation.**
- `PROJECTILES` = `$5400-$54BD`, in area `PROJECTILE_RAM` `$5400`+`$E4`, so
  ld65 fails the link if it grows into STARFIELD `$54E4`.
- Asserts pin start `$549E` and end `$54BE` (`src/main.s:1132-1139`).
- The music voice arrays end at `$549D` (X < 4).
- `tests/l1-reservation.test.mjs` passes.

**M7 — Per-frame cost and page crossings.**
- *Light kernel:* 53 branches and 0 page crossings, both at base and at L1.
- *The 29-B pad:* without it, 5 branches in `light_publish`/`light_update`
  would cross (STATIC), so its purpose is confirmed.
- *Light tables:* the only indexed operand that moved is `light_glyph`
  (`$9D27`→`$9B92`, Y≤31), with no page crossing in either.
- *Indirect jumps:* no new per-frame trampoline or indirect JMP.
- **But** main's ENTITY_CODE moved 405 B and gained crossings in per-frame
  projectile/entity code (L1-02).

**M10 — The 31,538-cycle frame.**
- The only run of this route is the L1 one:
  `dark-fighter/build/l1-level2-native-route.log`, frame 2043, 31,538.
- Its worst frame has 9 projectiles in flight and a live Heavy formation
  (`observer-smoke.csv`). That is the path L1-02 slows down.
- The second-highest frame is 31,398.
- The full-trace history on main is 31,483 maximum (`docs/STATUS.md`).

**M11 — Resource claims.**
- *Initial block:* 12,795 B content, 101 sectors; STOP 13,652 − 12,795 = 857.
- *Sectors:* 210 occupied. DFMC has 11 records, maximum 11.
- *Light record:* record 9 at sectors 185–193, 1,032 B packed → 1,196 B raw at
  `$3643-$3AEE`. The 46 retained bytes at `$3615-$3642` are
  `publish_level_hull_style`, the missile masks and the debris table.
- *MAIN slack:* 17 B (`$3AEF-$3AFF`).
- *Window:* free 773 → 1,928 B (+1,155 B = the old composite). That is 1,160 B
  contiguous `$B478-$B8FF` before the lance at `$B900`.
- *Menu run:* sectors 240–250, no overlap in the sector map. Menu data is
  1,304 B. Disk guard: 11 sums.
- `memory-map-report --check` reports that `docs/memory-map.md` matches.
- STATUS/§BV figures match the build.

## Findings

### L1-01 — S3 (fix before merge): the shared native boot fixture no longer models the boot, and 25 untouched tests break

- **Location:** `scripts/chunk-loader.mjs:27` (new SAFE range
  `[0x3643, 0x3b00]`) and `scripts/runtime-image.mjs` `installBootArtifact`.
  The workarounds are in `scripts/debris-destruction-runtime.mjs:439-449` (the `light-kernel.bin` / `starfield-runtime.bin` copies at :442 and :448) and
  `tests/menu-stars.test.mjs:111-119` (:113, :119).
- **What happens:** the fixture decodes record 9 straight to its final
  destination `$3643`. The real stage 2 holds it packed at `$0C00` (CRC-checked),
  because the initial block's packed resident source still lives at `$3643+`
  at that point.
- **Consequence in every harness built on `installBootArtifact`:**
  - `unpack_resident_runtime` produces a corrupt MAIN tail: `$3274-$3E5F`,
    3,052 B. This is the gameplay charset tail, the hull-style publisher, the
    missile masks and the debris damage table.
  - STARFIELD is garbage (1,422 of 1,428 B).
  - MEASURED: resident MAIN differs from `resident-runtime.bin` in 3,011 B at
    L1 vs 6 B at base.
- **The authors' patch:** they copied `light-kernel.bin`, `starfield-runtime.bin`
  and `menu-overlay.bin` into two harnesses. That masks the symptom there and
  bypasses the real unpack/publish path in native tests. The emulator boot
  smoke is the only remaining coverage of the real order.
- **Test impact (MEASURED):** in 15 untouched files (`entity-effects`,
  `debris-score`, `plasma-fx`, `loader-screen`, `layout-d1`, `level-hull-block`,
  `starfield-staging-streams`, …), 4 tests fail at a3c8e47 and 29 at L1.
- **Probe with the hold modelled** (record 9 packed at `$0C00`, `$3643`
  untouched):
  - 11 of the new failures disappear, and the fixture's MAIN and STARFIELD
    become exact.
  - The rest come from harness sequences that never call
    `unpack_loader_bitmap` (no Light) and from loader-screen tests that don't
    model the hold.
  - Two size pins are stale: `layout-d1` (107→101 sectors) and
    `hybrid-c-arena` (moved, 13,569→12,795).
- **Is the game affected?** I found no game regression behind these failures.
  The native real-order replay is byte-exact. But as delivered, the branch
  switches off native regression coverage for the debris score, plasma FX,
  entity traces, the loader screen, the cold-RAM initialisation check and the
  starfield staging streams.
- **Fix (sketch):**
  1. In `loadChunkFixture`, copy record 9's packed bytes to `$0C00` instead of
     decoding them to `$3643`.
  2. Add `unpack_loader_bitmap` (which publishes) to the harness boot
     sequences, in the real position.
  3. Drop the linked-bin injections.
  4. Re-pin `layout-d1` and `hybrid-c-arena`.
  5. Re-run the 15 files.

  A working fixture patch is in `leftovers/probes` (a `runtime-image.mjs`
  diff, reproduced in the worktree notes).

### L1-02 — S3: ENTITY_CODE's 405-B shift adds taken-branch page crossings in per-frame projectile/entity code

- **Location:** ENTITY_CODE after the removed display lists and glyph source.
- **Scope gap:** the authors' page-cross table covers only the Light kernel.
- **Static base-vs-L1 comparison of main's code segments** (with
  NMOS-model MEASURED costs):

  | Routine | Branch crossings, base → L1 | Extra cost at L1 |
  | --- | --- | --- |
  | `compose_player_fighter_projectile_glyph` (`$9AB5`) | 0 → 2, incl. the inverse-copy loop back-branch `$9AFE→$9AEE` | +1 cycle normal / +7 inverse per call (MEASURED 412→413, 522→529) |
  | `enemy_projectile_effect_backing_resolve` (`$92DD`) | 0 → 3 (early-outs to `$9301`) | +1 per taken branch, per projectile slot, 10 slots |
  | `begin_fighter_projectile_frame` | 0 → 1 | +1 on capital frames |
  | `entity_next_rng` | 0 → 1 | +1 when C=0 (MEASURED 19→20) |
  | `render_interactive_entity_overlays` | 1 → 3 (early exits) | — |

- **Worst case:** about +45–50 cycles per frame (STATIC), in exactly the
  frame family of the unexplained 31,538-cycle frame (M10).
- **Gates:** the hard gate (32,568) holds. The target (31,500) is exceeded once.
- **Fix:** keep an ENTITY_CODE address pad where the moved bytes were (as the
  RODATA hull pad and the Light 29-B pad already do), or align the affected
  routines. Then measure the level-2 observer route on clean main and on the
  branch.

### L1-03 — S3: pre-existing failing exact pins were rewritten so that they can no longer fail (no L1 behaviour reason)

- **Which pins:**
  - `tests/boss-overlay.test.mjs:156-159`: the lance `reservedSectors`
    literal became `manifest` vs `manifest`, which is tautological.
  - `tests/boss-overlay.test.mjs:227-230`: `initialBootContentBytes` went from
    an exact pin to `≤13,652`.

  Both assertions already failed at a3c8e47 (`[712,718]` vs `[712,719]`;
  13,622 vs 13,569).
- **What is lost:** the "no byte of the boss lands in the initial block"
  sensitivity. It is now only a sector-level check.
- **A related re-point that still fails:**
  `tests/boss-runtime.test.mjs:169` changed `run(712,7)` to
  `run(lance.startSector, lance.sectors)`, which is 6 sectors. The real read
  is 8: 712–719, lance 6 plus page 2. The test still fails, but the failure
  moved: it was missing 719, and now it is missing 718–719.
- **Smaller relaxations:** `lightKernel.freeBytes` (17) is now pinned as
  `≥16`, and `light_interceptor_glyph` changed from an absolute pin to a
  relative one.
- **Fix:** pin the measured values exactly (`[712,719]`, 12,795, 8 sectors,
  17), with a reason line.

### L1-04 — S4: test reporting

- The claim of "107/107 focused" does not include `tests/boss-runtime.test.mjs`,
  which the branch edits. It fails 2 tests (both also fail at a3c8e47; one has
  moved, see L1-03).
- The plan mentions only one boss-runtime failure.

### L1-05 — S4: boot-time publish failure path is not usable

- **Location:** `publish_light_record @bad` (`src/main.s:3389-3391`).
- **Problem:** this path jumps to the reader's failure screen before the
  frontend charset and screen are initialised (`finish_startup_after_loader`
  runs later). FIRE then goes to `quit_gameplay_to_menu` on an uninitialised
  machine.
- **Reachability:** only after RAM corruption of a CRC-checked record.
- **Fix:** use `boot_stage2_error`, or a halt with COLBK red, like the other
  boot failures.

### L1-06 — S4: menu-entry read error and UX notes

- **Stack:** each failure → FIRE → retry leaks 2 stack bytes
  (`jsr enter_main_menu` → `jmp` failure → `jmp quit_gameplay_to_menu`). It
  wraps harmlessly.
- **GAME OVER → MAIN MENU reads the run twice,** so two black, silent waits of
  about 42 frames each. This is within §BV.2's per-entry gate, but worth the
  owner's notice.
- **Disk dependency:** the game now needs the disk in the drive at every menu
  entry.

### L1-07 — S4: stale or misleading comments

- `cfg/light-kernel.cfg:8-13` still claims the window-base and `$BC00` asserts.
- `src/hybrid/c-asm-abi.s:645-653`: the "pad holds the kernel at `$B478`" text
  no longer describes any constraint.
- `src/main.s` `clear_pmg`: "`$3800-$3AFF` … contains the loader/frontend
  display lists" — it is now the Light composite.
- `src/main.s` near `options_persistent_tables_start` mentions "display list at
  `$3800-$38C9`".
- `src/main.s:11633` says the extended glyphs "occupy the approved
  ENTITY_CODE tail" — they are now MENU_OVERLAY.
- `src/main.s`: "PMG masks end at `$3809`" — they now end at `$363F`.
- `src/main.s:1278,1293` call DOSVEC "the warm-start path". RESET is a cold
  start, and a warm entry to `start` would now also re-run
  `publish_light_record` over menu or boss data in `$0C00`.

### L1-08 — S4: latent overlap notes

- **L2 at `$1900-$1FFF`:** "untouched" holds only for the menu read. During
  boss phases this range is boss slot D (`$1900-$1FFB`) and boss-death
  (`$1950-$19FE`, `$1E00-$1FFF`). L2 must stay a per-level re-read, as the
  plan's §223 says.
- **Weak bounds:** `.assert options_persistent_tables_end <= $1900` and the
  frontend test's `$1900` bound are weaker than the real run end (`$1180`).
  They are harmless because the build pins 1,304 B.
- **Boot-time window into the reservation:** the fixture's SAFE range
  `[0x548a, 0x54e4]` and the boot loader bitmap (`$5000-$5E0F`) cover the
  M3-H reservation at boot. That is fine for a gameplay-only buffer, but it
  must stay boot-only.

### L1-09 — S4: `dist/` is stale

- The tracked `dist/void-strike-65.atr` at the branch head (`05b9e5b7…`, last
  changed at `0989f17`) is not the L1 build. A normal build rewrites it.
- This is not L1-specific, but it should be noted for the release pass.

## Not verified, and why

- **Emulator behaviour:** boot smoke (cold, RESET, 130XE), patched/standard
  SIO menu timing (597 / 1,384 / +41 frames), and the screen colour during the
  0.84 s read. The clone has no Atari800 trace source, and wall-trace is out
  of scope.
- **Whether the 31,538 frame is new (M10):** there is no clean-main
  measurement of that route. The evidence is static only (L1-02).
- **Boss stress for Citadel, Bastion and R1:** only Spine L7/L9 were re-run
  (all 19 lance modes, base vs L1). They are identical, apart from the L7
  `kill` mode, where only the patched harness completes. The authors' Bastion
  8,478 and Citadel L5 8,447 were not re-measured.
- **Real hardware (SIO2SD)**, and the owner smoke.

## Merge recommendation

**Merge after fixes.**

The relocation itself is sound:
- the load order, the checksums and the publish are correct;
- nothing writes the composite after boot except by design;
- no old address survives;
- pause is resident;
- the reservation is bounded;
- the build reproduces the candidate ATR.

Before merging:
1. **L1-01:** repair the boot fixture and re-run the 15 broken files. Today
   the branch silently switches off much of the native regression suite.
2. **L1-03:** restore exact pins.
3. **L1-02:** either restore the ENTITY_CODE address profile, or measure the
   level-2 observer route on a3c8e47 vs L1 and record the delta.

The S4 items can follow.
