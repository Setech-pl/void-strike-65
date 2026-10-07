# Plan — audit hardening: disk writes, overlay loads, interrupt decimal mode

**Status: Phase B in progress (2026-10-07).** Phase A stopped on the brief's
STOP rules (§5): the content check costs more than ~60 B resident and, in its
only measured home, adds an extension-record sector; and decision 2's
identity read at every load would put the boss entry over its 250-frame
bound. The owner answered §6 (§6.1).

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
