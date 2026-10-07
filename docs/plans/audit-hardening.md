# Plan — audit hardening: disk writes, overlay loads, interrupt decimal mode

**Status: implemented, pending the owner's smoke — `OWNER-SMOKE CANDIDATE`
(2026-10-07).** Phase A stopped on the brief's STOP rules (§5); the owner
answered (§6.1); §9 is the record of what was built, with its figures. ATR
`19b82947a3b280e05040d8200d96de81e2ae79b504e6d7f2c010579a4604c4d4`.

Branch `fix/audit-hardening` from `main` `f8611ab`. The audit is
[../audits/2026-10-06-pre-m5.md](../audits/2026-10-06-pre-m5.md) (AUD-01,
AUD-02, the rest of AUD-03); its ledger is [../audits/README.md](../audits/README.md).
Conventions as [m5-loading-boss.md](m5-loading-boss.md) §0.4: **M** measured,
**IC** instruction count, **EMULATOR** for figures Atari800 cannot vouch for on
hardware. The IC byte counts below are counts of the instructions written out
in §2–§3, not design guesses; the packing and sector effects are what a probe
measured.

## 0. Step 0, baseline, differences

### 0.1 Step 0

* `main` `f8611ab` ("evidence: the memory map regenerated after b5c3d8d"), tree
  clean; one worktree (`~/Projects/dark-fighter`).
* ATR `bd5c5c2d9e9431b47f6ad294795d8bce63adcf27e23c4a051c60a921dc0cd7fa`, boot
  `3be9a2410be344f6aa84931b7440708f9013cf5b9f0937d289d983faf8a8531a`
  (`dist/`).
* The boss-lasers work is on `main` (fast-forwarded; no merge commit):
  [boss-lasers.md](boss-lasers.md) says implemented, pending the owner's smoke.
* Step 1: `f22ceb3` — the audit copied unchanged, the ledger.

### 0.2 Baseline, each figure with its source

| Figure | Value | Source |
| --- | ---: | --- |
| Worst fence margin | 1,472 (`2-sweep-fire6` f311) | STATUS "M5b-S4b"; [boss-lasers.md](boss-lasers.md) §18.4 |
| DMA-on maximum | 31,074 | same |
| Boss frames: worst margin / DMA-on | 8,199 / 29,169 | same |
| Tier-4 fixture, two beams | 14,451 / 27,392 | same |
| Boss stress, native | 7,982 of 8,500 (boss sector); per-frame 5,259 of 7,000 | same |
| Slots A / C / D / E | 2,007 (41 free) / 1,992 (56) / 1,773 (19 of `$1900–$1FFF`) / 102 (474 of `$4C00–$4E3F`) | `build/manifest.json` `boss` |
| Scratch page | 244 B (12 free) | same |
| Region 1's charset | 976 B, 6 codes free | §18.4 |
| Initial block / boot sectors | 13,618 B / 107 | `build/manifest.json` `transportCapacity` |
| Extension / total transport sectors | 104 / 211 | same |
| ATR menu frame | 550 cold, 541 warm (rule: baseline 596 + 7) | §18.4 (boot smoke) |
| Boss entry | 64 sectors, 245 host frames (evidence bound < 250) | §18.4; `tests/runtime-wall-trace.test.mjs:326` |
| Recorded test failures | 1, `preview`, first failing `tests/preview.test.mjs:129` | [../recorded-test-failures.json](../recorded-test-failures.json) |
| Recorded clause failures | 0 | [../recorded-gate-failures.json](../recorded-gate-failures.json) (`failures: []`) |
| `npm test` totals | 1,157 tests (the brief) | **not in the committed docs**; measured in Phase B |
| Boss debug route ATR | `b16d0c30…` (the brief) | **not in the committed docs** (a `build/` artifact); measured in Phase B |

No figure in STATUS disagrees materially with the brief.

### 0.3 Where the repo differs from the audit (`1a3c8bf` → `f8611ab`)

* **AUD-01:** the code is unchanged. The directory guard is
  `src/hybrid/level-summary.s:656-661`, the PUT `:679`, the empty-record path
  `:549-575`, the level-end path `:192-195`. Confirmed: nothing identifies the
  disk in D1: before the PUT.
* **AUD-02:** the boss now reads **nine** runs at its entry (64 sectors): S4b
  added slot D (`$1900`, 14 sectors) and S4b.5 slot E (`$4C00`, 1 sector) to
  the head's reads. `boss_read_run` is `src/hybrid/boss.s:252-268`; the jump to
  the install `:249`; the count and the loop `src/c/boss.c:238`, `:254`; the
  wire checksum `src/hybrid/sector-reader.s:693`. The audit's store addresses
  (`$1765-$1771`) are the old layout's; the RED test re-measures the overflow
  on this build.
* **AUD-03:** the boss DLI is fixed (S4b `a9a7336`). The audit left the
  gameplay DLI's `adc` "for reachability analysis"; §4 settles it: reachable.
* The level image is an executable load the audit did not list (§1, row 7).

## 1. Disk I/O inventory

Every SIO command after the boot. All go through `sector_reader_read_sector`
(`src/hybrid/sector-reader.s:637`), which checks only the SIO frame checksum
(`:693`) — computed by the drive over whatever is on the disk.

| # | Transition | Read | Code | Lands | Consumed / executed | Validation today |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | first START GAME of a session | summary code, entry 8, 14 sectors (584-597) | `sector-reader.s:308` (`ensure_summary`) | `$0500` | **executed** (`SUMMARY_START_GAME`, `:250`) | SIO checksum |
| 2 | START GAME, level end | summary art, entry 6 + region × 7, 7 sectors (600-627) | `level-summary.s:466-495` | `$7810` | consumed: palette, glyphs, map, and **record lists that name screen addresses** (`render_frontend_records`, `:519`, `:530`) | SIO checksum |
| 3 | START GAME after a boss | capital slot A restore, entry 0, 16 sectors (512-527) | `sector-reader.s:328-341` via `level-summary.s:154` | `$6DE8` | **executed** (gameplay) | SIO checksum |
| 4 | START GAME, level end | save record, entry 7, sector 599 | `level-summary.s:549-575` | `$7810` | consumed (BEST) | `VR`, version, checksum; invalid → empty |
| 5 | level end | the record **PUT** to 599, then a read-back | `level-summary.s:620`, `:656-723` | — | written | directory entry 7 = {599, 1} (in RAM) |
| 6 | START GAME | level image, 13 sectors (320-332), tail first | `sector-reader.s:490-552` via `level-summary.s:159` | `$A600` | consumed (LevelDef) and **executed** (the gameplay music player at `$A608`) | magic `VS`, version, id, sector count (`:1129-1160`) |
| 7 | boss entry | region staging (theme), entry 2 + region, 2 sectors (632-633) | `c-asm-abi.s:642` | `$7990` | consumed: copied over the music block and **played** (`:644-650`) | SIO checksum |
| 8 | boss entry | boss code, entry 1, 16 sectors (528-543) | `c-asm-abi.s:654` | slot A `$6DE8` | **executed** (`:656`, `boss_head`) | SIO checksum |
| 9 | boss entry | install, slot C, slot D, slot E; band A, band B, charset (7 runs, 46 sectors) | `boss.s:212-268` (`boss_runs`) | `$7810`, `$1000`, `$1900`, `$4C00`, `$A880`, `$AC80`, `$0C00` | **executed** (install `:249`, C, D, E); tables consumed, the module count unchecked (`boss.c:238`, `:254`) | SIO checksum; a run of count 0 → `SR_BAD_IMAGE` |

**The load-failure path** is `sector_reader_failure_screen`
(`sector-reader.s:384`): "DISK READ FAILED", a reason from the status
(`SR_BAD_IMAGE` = 4 shows **"WRONG DISK"**, `:1196-1200`), "PRESS FIRE", then
the menu. Every row above except 4 and 5 already ends there on a read failure;
a refused check would pass `SR_BAD_IMAGE` to it. No new screen.

## 2. Identity

### 2.1 What and where

* **The identity block:** 6 bytes, `"VS65"` and a 16-bit **layout id** — a
  checksum the build computes over the layout's fixed reservations (the
  overlay base, the save sector, the identity sector, the summary code and art
  homes, the boss reservation and region stride), not over any run's
  contents. It changes only when the layout changes, it is the same in every
  copy of the ATR, and a blank or foreign disk does not carry it.
* **Where:** sector **598**, which nothing uses (the summary code may take
  584-597, `scripts/build.mjs:462-468`; the record is 599). The build writes
  the block at offset 0; the game never writes the sector. Sector 598 is not
  read at any transition today, so every use of it is one extra SIO command.
* **The expected value:** held resident in the boot-validated image (the DFMC
  CRC16 covers it at boot).

### 2.2 The save (AUD-01)

`summary_write_save` reads sector 598 into the read-back buffer
(`SAVE_VERIFY_BUFFER`) immediately before the PUT and compares the block; a
failed read or a mismatch returns C=1, which the caller already treats as
"refused, the RAM copy stands, silently" (`level-summary.s:621`). The directory
guard stays.

* Bytes: summary module ~35 B (115 free); 6 B expected block.
* Load time: **one extra command at the level end, only when a write is
  due.** EMULATOR analogue: a one-sector run added **8 host frames** to the
  boss entry (slot E, 237 → 245, [boss-lasers.md](boss-lasers.md) §18.4). The
  level end's reads (~11 commands) finish inside the 150-frame minimum, so the
  summary shows no later.

### 2.3 Loads (AUD-02, decision 2 bullet 2) — read literally

The same read before anything at a load is executed or consumed:

| Transition | First read today | Extra read | Cost |
| --- | --- | --- | --- |
| START GAME | summary code (row 1) or art (row 2) | sector 598 | +1 command, ~8 host frames EMULATOR (START GAME has no bound) |
| boss entry | staging (row 7) | sector 598 | +1 command → **~253 host frames, over the < 250 bound** |

The boss entry's resident half (`_asm_boss_enter`, `HYBRID_ASM_WINDOW`
`$B36C-$B3D8`) sits directly under the Light kernel, whose base the build
derives from its end: growing it moves the hot Light kernel and every
page-crossing in it. The first-session START GAME check has to run before the
summary module exists, i.e. in the reader, which has 29 B. So the literal
form costs the 250-frame bound and a relocation of reader content.

## 3. Content check (decision 2 bullet 3)

### 3.1 Kind

No CRC routine is resident: the DFMC CRC16 lives in stage 2, which the
resident suffix overwrites (`transportCapacity.stage2.overwrittenByResidentSuffix`).
The cheapest adequate check reuses what the receive loop already computes,
the sector's carry-wrap sum (`sr_checksum`, `sector-reader.s:680-685`): after
each **accepted** sector, a 16-bit Fletcher fold of that sum
(`a += s; b += a`). It is computed between sectors (no per-byte cycles, no
retry hazard), detects every single-bit change and any reordering of sectors,
and a foreign run passes with probability ~2⁻¹⁶. It does not see a change
that keeps a sector's carry-wrap sum (e.g. a `$00`↔`$FF` byte swap inside one
sector).

### 3.2 Where the expected values live (a chain of trust)

* **Resident** (boot-validated): one 16-bit value per overlay-directory entry
  (9 × 2 B; entry 7, the record, is never checked). `sector_reader_read_run`
  checks every directory run before it returns success — rows 1, 3, 7, 8 —
  so `_asm_boss_enter` needs no change.
* **Slot A** (validated by row 8): one value per region for the head's seven
  runs, folded on from slot A's own state (4 × 2 B), checked before
  `jmp boss_install` (row 9), with the module count bound 1..16 in the same
  place (§3.4).
* **The summary module** (validated by row 1): one value per region's art run
  (4 × 2 B), checked before the art is copied (row 2).
* **Not covered:** the level image (row 6) keeps its header check. Covering it
  is §6 Q3.

The expected values depend on the runs, and the runs link after the reader,
so the build fills the resident table into the linked image before the DFMC
records are packed (a post-link patch of a reserved table; the reader's code
does not depend on the values).

### 3.3 Cost

**The resident guard** (begin, fold, check, the 18-B table, its 3-B state,
the 6-B identity block) — 87 B, written out and **MEASURED** in a reverted
probe appended to the Light kernel's link: its record grows 693 → 779 B packed,
**6 → 7 sectors; extension 104 → 105.** The other resident tails with RAM
room have less sector padding (§3.5). The reader itself grows +15 B (the fold
call, the check in `read_run`), RAW, 29 B free.

| Segment | Bytes | Note |
| --- | ---: | --- |
| Initial block | **0** | |
| Reader (`$A000`, 1,536 B cap, RAW) | +15 (IC) | 14 B left |
| Resident guard | 87 (M: +86 B packed) | **+1 extension sector** in the Light-kernel record |
| Slot A | +34 (IC: count bound 9, check 17, table 8) | 7 B left |
| Summary module | +38 (IC: art check 30, table 8) + 35 (identity, §2.2) | 42 B left |
| Slots C / D / E | 0 / 0 / 0 | |
| **Load time** | boss entry **+0** commands, ~+25 cycles a sector; START GAME +0; level end +1 command when saving | |

### 3.4 The module count (decision 2 bullet 1)

`BOSS_T_MODULE_COUNT` (band B's tables at `$AD00`) checked against 1..16 in
slot A's head after the reads, before `boss_install` runs and before
`_boss_c_init` (`boss.s:2843`) can read it; out of range →
`SR_BAD_IMAGE` → the failure screen. ~9 B of slot A, independent of the
rest.

### 3.5 Homes looked at for the guard

| Home | RAM free | Record padding | Fits 87 B? |
| --- | ---: | ---: | --- |
| Reader `$A5E3` | 29 | RAW, 29 | no (RAM) |
| Light kernel tail `$B6DC` | 1,316 | 75 (LZ) | **M: +1 sector** |
| `DIRECTOR_RAM` tail `$9FD7` | 35 | 137 | no (RAM) |
| `DIRECTOR_C_LOW` tail `$8BCC` | 177 | 57 | IC: no (≥ 80 B packed) |
| `HYBRID_ASM_WINDOW` | — | — | growing it moves the Light kernel |
| Split `DIRECTOR_RAM` 35 + Light tail 52 | | | not measured |

## 4. Interrupts (AUD-03 remainder)

### 4.1 Inventory

The game sets `NMIEN = $80` everywhere (DLI only; the OS VBI is off) and runs
under `sei` from `start` on (`main.s:1243`); no IRQ handler, no BRK. The OS
ROM's NMI dispatcher only tests `NMIST` and jumps through `VDSLST`.

| Handler | File:line | Arithmetic | Timing | CLD |
| --- | --- | --- | --- | --- |
| `gameplay_dli` (2 phases) | `src/main.s:3604` | **`clc; adc #$03` into `DLISTL`** (`:3616-3618`) | WSYNC-aligned; ~51 CPU cycles NMI→WSYNC in phase 0 | **needed** |
| `boss_dli` (3 phases) | `src/hybrid/boss.s:293` | `boss_apply_pos`, `laser_publish` | WSYNC-aligned | done (S4b, `:295`) |
| `frontend_hint_dli` | `src/main.s:2053` | none (loads, stores) | WSYNC | not needed |
| `loader_dli` | `src/boot-splash.s:386` | none (`inc` is not decimal-sensitive) | WSYNC | not needed |

### 4.2 SED in mainline

| Site | File:line | DLI live? |
| --- | --- | --- |
| `light_add_score` | `main.s:10579` | yes, gameplay |
| `add_debris_score` | `main.s:10673` | yes, gameplay |
| `add_archetype_score_tail` | `main.s:11993` | yes, gameplay |
| `boss_module_scored` | `boss.s:600` | yes, the boss DLI (has CLD) |
| `summary_bonus` | `level-summary.s:923` | no (`NMIEN = 0`) |
| `add_archetype_score_obsolete` | `main.s:5422` | not assembled (`.if 0`) |

**Reachable:** a gameplay DLI that lands inside one of the three gameplay
`SED…CLD` windows (~20 cycles a kill) computes `DLISTL` in BCD. With list B
active (`PLAYFIELD_ACTIVE_DLIST_LO = $6A`, `PLAYFIELD_DLIST_B = $7F6A`) phase 0
writes **`$73` instead of `$6D`**: ANTIC jumps 6 bytes into the wrong place of
the list for that frame. List A (`$10` → `$13`) is unaffected. Rare, real,
player-visible.

### 4.3 CLD placement

`gameplay_dli` is at `$6211` in `BROADSIDE`, an extension record (not the
initial block), but `BROADSIDE` also holds overlay slot A at a fixed `$6DE8`
and has a 3-B tail: one inserted byte would move slot A, the boss's link and
every later page crossing. So the change is **size-neutral**:

* `cld` after `pha` at the entry (+1 B, +2 cycles, both phases), as the boss
  DLI does;
* phase 0's `lda #$00` before `sta WSYNC` (`:3620`) goes (−2 B, −2 cycles):
  WSYNC is a strobe and A is reloaded on the next line, so the value is dead;
* one pad byte after phase 0's `rti`, never executed, keeps
  `gameplay_dli_sync_hud` and everything after it at its address.

Cycles: phase 0 **±0** (51 → 51 to WSYNC), phase 1 **+2** (34 → 36 to WSYNC),
far inside the line; the boss DLI's phase 2 jumps past the entry to
`gameplay_dli_sync_hud` and is unchanged. The source contract
(`tests/source-contracts.test.mjs:26`) still holds. No STOP rule is met here.

## 5. STOP rules met

1. **The content check costs more than ~60 B resident:** 87 B guard + 15 B in
   the reader = **102 B** (IC; the guard's packing MEASURED).
2. **It adds an extension-record sector** in its only measured home
   (104 → 105). A split home is unmeasured and may avoid it.
3. **Decision 2's identity read at every load** puts the boss entry at
   ~253 host frames (EMULATOR, by the slot E analogue), over the < 250 bound,
   and needs reader room the reader does not have.

AUD-01 alone (§2.2), the module count (§3.4) and the CLD (§4.3) meet every
rule.

## 6. Owner questions

* **Q1 — the identity check at loads.** (A, recommended) The content check of
  §3 is the load-time identity check: a run from any other disk fails it
  before a byte is executed or consumed, with no read added at any load; the
  identity sector is read before the PUT only. (B) The literal read of sector
  598 at START GAME and at the boss entry as well: the boss entry ~253 host
  frames (the bound would have to become 260), START GAME +~8, and reader
  content relocated to make room.
* **Q2 — the content check's price.** (A) Accept ~102 B resident and one
  extension sector (104 → 105; initial block, boot sectors and every gameplay
  frame unchanged). (B) The same, but I first probe a split home
  (`DIRECTOR_RAM` tail + Light tail) and continue only if it adds no sector;
  otherwise stop again. (C) No content check now: AUD-01, the module count and
  the CLD only; AUD-02's identity and content parts stay open in the ledger.
* **Q3 — the level image** (row 6; its gameplay music player is executed from
  `$A608`), outside decision 2's list: include it in the content check (~+50 B
  in the summary module, a 16 × 2 B table) or leave it to its header check and
  the identity.

### 6.1 Owner answers (2026-10-07)

* **Q1: (A)** the content check is the load-time identity check; sector 598
  is read before the PUT only.
* **Q2: (A)** accept ~102 B resident and the extension sector (104 → 105).
* **Q3:** include the level image in the content check.

Within these answers, sector 598 becomes the overlay directory's tenth entry
(+5 B in the reader): the summary reads it through `sector_reader_read_run`,
whose content check compares it with its resident expected value, then
compares its six bytes with the resident identity block. No separate read
routine.

## 7. Tests (Phase B, RED on `main`'s build, GREEN after)

* **AUD-01** (`tests/level-summary.test.mjs`'s writable `Drive`): a drive that
  swaps to a foreign image just before the record read (its 598 and 599 hold
  distinctive non-record bytes) — zero PUT commands, 599 byte-identical; the
  identity read failing (a NAK on 598) — no PUT; the game's own image and a
  byte copy of the ATR — the record saves; a write-protected disk — silent
  skip, as today.
* **AUD-02:** the band B sector at `$AD00`'s offset with one bit changed
  (count 13 → 29) and a correct SIO checksum — the failure screen with
  `SR_BAD_IMAGE` before `_boss_c_init` runs, no store outside the declared
  arrays; a foreign image at the boss entry — refused before slot A's first
  instruction; with the content check, one changed byte in an executable run
  (slot A, slot C) and in a data run (band A, the art) — refused before use.
* **AUD-03:** `gameplay_dli` both phases × lists A/B × D = 0/1 × nontrivial
  A/X/Y: identical hardware writes, A, X, Y and P restored (RED: list B,
  phase 0, D = 1 writes `$73`).

## 8. Smoke items (Phase B, `hardware-testing.md`)

A full play to the boss and the summary on the game's own disk (the record
saves); the same write-protected (skips silently); Atari800 with D1: swapped
to another image before the summary (no write, no crash); the boss entry with
a foreign disk (DISK READ FAILED / WRONG DISK, FIRE to the menu); BASIC on and
off; RESET; the same on SIO2SD and a real drive with a copy of the game disk
and a spare floppy.

## 9. As built — status: implemented, pending the owner's smoke

### 9.1 Where the build differs from §2–§4

* **The identity read is the directory's tenth entry** (§6.1): sector 598,
  one sector, into the record's read-back buffer. `summary_own_disk`
  (`src/hybrid/level-summary.s`) runs it through `sector_reader_read_run`,
  whose content check compares its fold with the resident value, then
  compares its six bytes with the resident `guard_identity`; then the PUT.
  The identity block is `VS65` + layout id `$1AA9` (`56533635a91a`), from
  the layout's reservations only (`scripts/disk-guard.mjs` `layoutId`).
* **Phase A's reader figure was wrong.** §3.3 and §3.5 gave the reader 29 B
  of room; that is RAM. Every DFMC record carries a 21-B footer
  (`scripts/chunk-loader.mjs` `CHUNK_FOOTER_BYTES`), so the reader's record
  had **8 B** before a 13th sector. MEASURED: the first build made it 13
  sectors (extension 106). The capital vector table's boot image (36 B),
  which only the reader's capital restore reads, moved to the Light kernel's
  link, behind the guard (`CAPITAL_VECTOR_IMAGE`); the reader is 12 sectors
  with 17 B of sector headroom, and the image packs to +4 B there (LZ, it
  repeats the live table).
* **Nothing a gameplay frame runs moves.** The first build put the head's
  check and the reader's steps in front of per-frame code; slot A's
  per-frame boss code moved 35 B, the reader's stat hooks 15 B, and the
  native boss stress figures moved by one cycle. Rebuilt (`0de0485`): the
  head's check is a segment at slot A's end (`BOSS_HEAD_CHECK`), entered by
  the `jmp` that went to `boss_install`, the region from the head loop's last
  offset (`(35 + 15 R) >> 4 = R + 2`, asserted); a run that checks leaves the
  fold at zero, so the head needs no reset; `read_run`'s last `jmp` and
  `@sector_done`'s `inc sr_sector_lo` became same-size calls into routines
  after the stat hooks. Against `main`'s build: no boss, Light kernel or
  Director label moves; main's two moved labels are inside `gameplay_dli`;
  no reader label before the stat hooks moves.
* **`rol a` is not used:** the harness's 6502 model has no ROL (it is a
  documented instruction; the model, which the build also uses for cycle
  figures, was left alone). `lda #0 / adc #0` gives A = C.
* **The level end with another disk** fails at its art read (the first run
  it reads), so it shows the failure screen instead of the summary panel's
  art, and the score of that game does not reach TOP SCORES — the existing
  way out of any read failure at the level's end. A swap between the art and
  the record reaches the identity check and writes nothing.

### 9.2 Bytes per segment (MEASURED, `build/manifest.json`)

| Segment | `main` | This branch | Note |
| --- | ---: | ---: | --- |
| Initial block | 13,618 B | **13,618 B (+0)** | the gameplay DLI is in `BROADSIDE`, an extension record |
| Boot / extension / total sectors | 107 / 104 / 211 | **107 / 105 / 212** | +1: the Light kernel's record 6 → 7 sectors (owner Q2) |
| `BROADSIDE` | 6,653 B | **6,653 B** | `CLD` size-neutral (§4.3) |
| Reader `$A000` | 1,507 B (12 sectors) | **1,498 B (12 sectors)** | +27 (fold and check calls, the two tail steps, directory entry 9), −36 (the capital image moved) |
| Light kernel link | 771 B (693 packed) | **902 B (783 packed)** | kernel 771 + `DISK_GUARD` 95 + `CAPITAL_VECTOR_IMAGE` 36 |
| `DISK_GUARD` `$B6DC` | — | **95 B** | begin, reset, fold, check, compare; 10 × 2 B sums; identity 6 B; state 3 B |
| Window free tail | 1,316 B | **1,185 B** | |
| `HYBRID_ASM_WINDOW` (boss entry) | 109 B | **109 B** | one pin operand ($A560 → $A576) |
| Summary module `$0500` | 1,677 B | **1,788 B (4 free, 14 sectors)** | identity check 26, art check ~15 + 8, level check ~25 + 32, the PUT through `RECORD,y` (−10) |
| Slot A | 2,007 B (41 free) | **2,045 B (3 free)** | `BOSS_HEAD_CHECK` 38 B (code 30, sums 8) |
| Slots C / D / E | 1,992 / 1,773 / 102 B | **1,992 / 1,773 / 102 B** | unchanged (STOP rules: D ≤ 10, E ≤ 60) |
| Install, scratch | 352, 244 B | **352, 244 B** | |
| Resident added | — | **95 + 27 = 122 B** | the guard and the reader's new code and entry (the 36-B image moved, not added) |

### 9.3 Load time per transition (EMULATOR)

* **Boss entry: 64 sectors, 245 host frames** — unchanged (bound < 250).
  The guard folds between sectors (~25 cycles a sector, MEASURED by IC).
* **START GAME:** the same 21 reads; the summary appears one host frame later
  only because the menu does (below).
* **Level end:** one read more when a write is due (9 → 10 in the replays
  that save), inside the 150-frame minimum.
* **Boot: the menu at frame 551 cold / 542 with BASIC** (`main` 550 / 541),
  the extension sector's read. Within the rule (596 + 7), but the brief's
  Phase A list had "adds a menu frame" as a STOP rule; the owner's answer Q2
  accepted the sector that costs it, and the frame is reported here and to
  the owner rather than taken as covered.

### 9.4 The gameplay DLI's cycles (MEASURED, 6502 harness, NMI → WSYNC / whole handler)

| Phase | `main` | This branch |
| --- | ---: | ---: |
| 0 (HUD → playfield) | 28 / 77 | **28 / 77** |
| 1 (playfield → HUD) | 11 / 48 | **13 / 50** |

The boss DLI's phase 2 jumps past the entry into `gameplay_dli_sync_hud`:
unchanged. `frontend_hint_dli` and `loader_dli` do no arithmetic: no `CLD`.

### 9.5 Tests: RED on `main`'s build (`63ef6d4`), GREEN (`22614b8`, `0de0485`)

| Finding | Test | RED on `main` |
| --- | --- | --- |
| AUD-01 | sector 598 carries the identity | sector 598 is zeros |
| AUD-01 | a disk swapped in before the record's read is never written | a PUT reached the other disk |
| AUD-01 | an unreadable identity sector stops the write | the record was written |
| AUD-01 | the own disk and a copy save; the identity is the read before the PUT | no identity read |
| AUD-02 | band B's count 13 → 29 with a correct SIO checksum | `main_loop`: accepted |
| AUD-02 | the count bounded to 1..16 (0, 17, 29, 255 refused; 13 accepted) | count 0 accepted |
| AUD-02 | another disk at the boss entry | its bytes ran in slot A (`$6DEA`) |
| AUD-02 | a changed byte in each of the boss's 8 runs | all 8 used (one hung) |
| AUD-02 | the summary code, the art (both transitions), the level image, the capital restore | all accepted |
| AUD-03 | `gameplay_dli`, both phases, both lists, D and C both ways | list B, phase 0, D = 1: DLISTL `$73` (binary `$6D`) |

### 9.6 Re-pointed tests (each follows from the decisions)

* `basic-window-capacity`, `level-buffer-16`, `level-summary-build` (×2):
  the window's free tail 1,316 → 1,185 and the kernel link 771 → 902 B — the
  guard and the moved image, in segments of their own; the kernel's own
  segment stays pinned at 771 B.
* `level-buffer-16`, `hybrid-c-arena`: total transport 211 → 212 (Q2).
* `level-summary-build`: the directory 9 → 10 entries, entry 9 asserted.
* `sector-reader`: the empty-entry test's past-the-end index 9 → 10.
* `overlay-slot`: the capital image read from the Light kernel's link.
* `sector-reader` (3 machines), `level-summary` (1): a machine holding only
  the reader also holds the Light kernel's record — the reader calls the
  guard, resident from the boot on, as on the machine.
* `tests/boss-harness.mjs`, `tests/level-summary.test.mjs`: the drives take
  another disk (`sectorOf`, `swap`, `failReads`) — new fixtures, no
  assertion changed.

### 9.7 Before and after

| Figure | Baseline (source) | This branch |
| --- | ---: | ---: |
| Worst fence margin | 1,472, `2-sweep-fire6` f311 (STATUS) | **1,472, the same frame** |
| DMA-on maximum | 31,074 (STATUS) | **31,074** |
| Boss frames: worst margin / DMA-on | 8,199 / 29,169 (STATUS) | **8,199 / 29,169, the same frames** |
| Tier-4 fixture, two beams | 14,451 / 27,392 (STATUS) | **not re-run**: no boss, Light kernel or Director label moves, and every boss frame of the default replays is identical in state and DMA-on maximum |
| Boss stress, native | 7,982 of 8,500; per-frame 5,259 of 7,000 (STATUS) | **7,982; 5,259** (`npm test` output; the first build's 7,981 / 5,260 were the shift §9.1 removed) |
| Slots A / C / D / E | 2,007 / 1,992 / 1,773 / 102 B | **2,045 / 1,992 / 1,773 / 102 B** |
| Scratch page; region 1's charset | 244 B; 976 B, 6 codes free | **244 B; 976 B, 6 codes free** |
| Initial block; boot sectors | 13,618 B; 107 | **13,618 B; 107** |
| Extension / total sectors | 104 / 211 | **105 / 212** |
| ATR menu frame | 550 / 541 | **551 / 542** |
| Boss entry | 64 sectors, 245 host frames | **64 sectors, 245 host frames** |
| Recorded clause failures | 0 | **0** |
| Recorded test failures | 1 (`preview`, `:129`) | **1 (`preview`, `:129`)** |
| ATR | `bd5c5c2d…` | **`19b82947…`** |
| Boss debug route (`build/level-1-s4`) | `b16d0c30…` (rebuilt on `main`) | **`efaa883d…`** |

**Row by row against `main`'s own trace** (rebuilt in a temporary detached
worktree, removed): 55 sessions, 124,775 rows. Every game-state column is
identical from frame 1; frame 0's `capital_visible_allied_cells` reads 16 for
15 in every session (the observer counts glyphs through a list that is not
yet the gameplay one, in memory the summary module's growth changed); the
RESET replay's reboot frame counts 8 more missed host frames (the boot frame
and the bot's FIRE window). Wall cycles: identical in 124,635 rows; 140 move
by −109…+103, the `CLD`'s 2 cycles crossing a WSYNC or a line boundary.

The evidence was regenerated twice: the first pass (`5d50d58`, `ea113c5`) was
superseded by the rework of §9.1 and regenerated once more (`86fb079`).

