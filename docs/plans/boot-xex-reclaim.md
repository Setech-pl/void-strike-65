# Plan — reclaim the retired XEX entry from the initial block (boot-xex-reclaim)

**Session 2026-10-01.** Branch `feat/boot-xex-reclaim` from `main` `97344ad`
(`docs(status): the all-or-nothing Spread volley, an owner-smoke candidate`).
This is the follow-up listed in [atr-only-build.md](atr-only-build.md) §11
("Reclaim `boot_stage2_xex_entry`"). Every figure is **MEASURED** on `main`
`97344ad` (default build, ATR `3bab2e15…`, boot `3cf380ec…`, both equal to the
SHA-256 values `docs/STATUS.md` records) unless it says ESTIMATE.

**Status: IMPLEMENTED — `OWNER-SMOKE CANDIDATE`, awaiting the owner's hardware
smoke.** Phase A (§1-§8) is the plan as committed (`4281ac7`). §9 records what
was built and measured, including where it departs from §4.

---

## 1. Owner decision

Owner decision 5 of the ATR-only plan ("`boot_stage2_xex_entry` stays; the ATR
stays byte-identical") is superseded by this task: the ATR and the boot image
are allowed to move. Nothing else from that plan is reopened. In force and not
touched here: ATR only; `LEVEL_MAX_ID` 16 with level 1 alone in the default
artifacts; the transport STOP rule (no new boot sector, initial block
≤ 13,652 B, ATR menu delta ≤ +7, now +6); a worst fence margin ≥ 500 and the
32,568 DMA gate; the `HYBRID_C_ARENA` lever in reserve (decision 19); the
all-or-nothing Spread volley; owner decision A (`disable_basic_rom` and its call
from `boot_stage2_atr_entry` exactly as they are).

## 2. The facts the brief rests on, verified

| Fact | Brief | Repo at `97344ad` |
| --- | --- | --- |
| label | `src/main.s` near `:12376` | **`src/main.s:12412`** (later merges shifted it 36 lines) |
| address / size | `$2338-$2345`, 14 B | **`$2338-$2345`, 14 B** (`build/void-strike-65.lbl`: next label `copy_boot_splash_blob` at `$2346`) |
| segment | `BOOT_STAGE2`, runs at `$21C1`, 1,337 B | **same**: `build/void-strike-65.map` `BOOT_STAGE2 0021C1 0026F9 000539` |
| in the initial block | yes | **yes, raw**: `scripts/build.mjs` `initialContentParts` = resident prefix, `BOOT_STAGE2` bytes verbatim, then the packed resident, starfield, A2, ENTITY streams, the splash blob, the trailer |
| callers | none since the XEX was retired | **none**: no `jsr`/`jmp`/branch/vector in `src/`, `cfg/` or `scripts/`; its only uses are the `.export` (`src/main.s:12787`) and one test delimiter |
| stale comments | `:1185`, `:1197`, `:12228` | **`:1185-1186`, `:1198-1199`, `:12264-12266`**, plus the splash-copy comments `:12422-12428` and `:12966-12970` that describe "both entries" |

The 14 B: `jsr disable_basic_rom` (3), `jsr copy_boot_splash_blob` (3),
`lda #$02` (2), `sta boot_chunk_ready` (3, absolute: `$21AC`), `jmp start` (3).

## 3. Inventory of XEX remnants, all segments

"Initial block" = rides in the 107 boot sectors. "Reachable" is from the ATR
boot (`boot_entry` → `boot_stage2_atr_entry` → `start`), the warm start
(`DOSVEC` → `start`) or the runtime.

| Symbol / item | Address | Segment | Bytes | Initial block | Reachable? Evidence | Frame code | Decision |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| `boot_stage2_xex_entry` | `$2338-$2345` | `BOOT_STAGE2` | 14 | yes (raw) | **no**. Only `RUNAD` of the XEX ever entered it; the XEX is not built (`atr-only-build`). It ends in `jmp start` and nothing falls into it: the preceding `boot_stage2_atr_entry` ends in `rts` at `$2337`. No reference in `src/`, `cfg/`, `scripts/` | no (boot overlay, overwritten by the resident suffix before the first frame) | **remove** |
| `.export boot_stage2_xex_entry` | — | — | 0 | — | not imported by any module (`grep` over `src/`, the `.lbl`/`.map` of every link) | — | **remove** |
| `boot_chunk_ready` = `$02`, writer in `boot_stage2_atr_entry` (`lda #$02 / sta boot_chunk_ready`) | inside `$2203-$2337` | `BOOT_STAGE2` | 5 | yes | **yes**: it is the ATR path's "every chunk loaded and checked" token, written after the last record publishes | no | **stays**. `$02` is not a retired value: the ATR writes it too |
| `boot_chunk_ready` test in `start` (`lda / cmp #$02 / beq / jmp boot_stage2_error`) | `$2030` (`start` + 18) | `CODE`, fixed `$01A3` prefix | 10 | yes (prefix) | **yes**: every cold start and warm start; a boot that did not finish stage 2 lands in `boot_stage2_error` | no | **stays** (the prefix must not change; the check guards the ATR) |
| `boot_chunk_ready` byte | `$21AC` | `CODE`, fixed prefix | 1 | yes | yes | no | stays |
| second writer of `$02` (inside the XEX entry) | `$2340-$2344` | `BOOT_STAGE2` | (5 of the 14) | yes | no (see row 1) | no | **goes with the entry** |
| `disable_basic_rom` | `$21AD` | `CODE`, fixed prefix | 14 | yes | yes, from `boot_stage2_atr_entry` (owner decision A); its `rts` is also `boot_return` | no | stays, untouched |
| `copy_boot_splash_blob` | `$2346` | `BOOT_STAGE2` | 18 | yes | yes, from `boot_stage2_atr_entry` | no | stays a subroutine (brief), now one call site |
| `RUNAD` / `INITAD` handling | — | — | 0 | — | **none left**: no `RUNAD`, `INITAD`, `$02E0`, `$02E2` in `src/` or `cfg/`; the build's XEX assembly, `makeXex*`/`parseXex` and the `INITAD` record went with `atr-only-build` | — | nothing to remove |
| `sector_reader_resident_hit` resident skip in `sector_reader_load` | `SECTOR_READER` (`$A000` window) | extension record | — | no | **yes**: medium-agnostic. `sector_reader_validate` calls the same routine, and on the ATR the skip fires when the buffer already holds the requested level (a second START GAME on level 1) | no (START GAME / level load, not a gameplay frame) | **stays**; its comment names the XEX (§5) |
| XEX-history comments outside the boot entry: `src/main.s:7733` (BROADSIDE), `:11226` (glyph install), `src/hybrid/c-asm-abi.s:332`, `src/hybrid/gameplay-music.s:9-10`, `cfg/gameplay-music.cfg:5`, `src/hybrid/sector-reader.s:383` | — | — | 0 | — | comments only; no code depends on them | — | **untouched**: they describe the retired XEX, not this entry; the brief rules out rewording unrelated comments |

No other code or data is reachable only from the XEX path: the XEX entry's two
`jsr` targets and its `$02` store are each also reached from
`boot_stage2_atr_entry`, and it has no private data.

## 4. What is removed and what it returns

* `boot_stage2_xex_entry` (14 B) and its `.export`.
* Bytes returned: **14 B of the initial block**, exactly, because `BOOT_STAGE2`
  is carried raw (§2). Expected: `BOOT_STAGE2` 1,337 → **1,323 B**; initial
  block content 13,626 → **13,612 B** (headroom to the 13,652-B STOP line
  26 → 40 B; to the 13,684-B ceiling 58 → 72 B). ESTIMATE until built.
* Sectors: **107 / 101 / 208 unchanged**. 106 sectors would need the content at
  ≤ 13,498 B (106 × 128 − the 70-B envelope); 14 B do not reach it.
* What moves: every `BOOT_STAGE2` label after `$2338` moves down 14 B
  (`copy_boot_splash_blob`, the manifest validator, the CRC, `boot_stage2_error`,
  `boot_chunk_manifest`), and the packed sources behind `BOOT_STAGE2` in the
  initial block sit 14 B lower. The build derives every one of those addresses
  from labels and patches them (`bootSplashSourceOperand`, the manifest
  offset, the packed-source operands); none is a hard-coded constant in
  `scripts/` or `tests/`. Margins that measure against those sources grow by
  14 B (packed starfield → pickup cold staging 138 → 152; ENTITY source →
  staging −30 → −16). ESTIMATE until built.
* What does not move: `boot_entry` (24 B) and `start` at `$201E`; the fixed
  `$01A3` prefix; `DOSVEC`; every runtime segment (`CODE` from `$21C1` onward is
  the resident suffix that overwrites `BOOT_STAGE2`), so **no gameplay-frame byte
  changes**. That is checked by comparing every runtime `.bin` in `build/` with
  `main`'s.
* Player-visible behaviour: none expected. The same 107 sectors load, the same
  streams decode, the same splash runs. ATR loader 345 and menu 602 (+6) are
  expected unchanged.

## 5. Comments

`src/main.s` `:1185-1186`, `:1198-1199`, `:12264-12266`, `:12422-12428`,
`:12966-12970` and `src/boot-splash.s:12-14`, plus the three comments in
`scripts/build.mjs` that say "both stage-2 entries" / "either medium" next to the
splash copy, are rewritten to describe the ATR-only boot (one stage-2 entry).
They name the call site this task removes, so they would become false. No other
comment is reworded.

## 6. Tests

New, `tests/boot-xex-reclaim.test.mjs`, RED on `main`'s build, GREEN after:

1. `boot_stage2_xex_entry` is absent from the `src/main.s` labels and exports,
   and from `build/void-strike-65.lbl` and `.map`.
2. `BOOT_STAGE2` ≤ 1,323 B and the initial block content ≤ 13,612 B (`main` −14).
3. The `$02` token has one writer, inside `boot_stage2_atr_entry`, and one
   reader, in `start`; `disable_basic_rom` and `copy_boot_splash_blob` each
   have exactly one call site, in `boot_stage2_atr_entry`, in that order, and
   `copy_boot_splash_blob` still ends in `rts`.
4. `start` stays at `$201E` (the build asserts it too).

Known re-points: `tests/broadside-fire.test.mjs:577` used
`boot_stage2_xex_entry` only as the END delimiter for extracting
`boot_stage2_atr_entry`; it moves to the label that follows
`boot_stage2_atr_entry` after the removal (the comment block, then
`copy_boot_splash_blob`), pattern unchanged. `tests/atr-only-build.test.mjs`'s
header comment cites owner decision 5; it is updated.

## 7. Gates

Boot smoke, every session (ATR with BASIC enabled, `-nobasic`, warm start); the
full default trace; evidence regenerated `build:candidate` →
`runtime:wall-trace` → `build`; `npm test` on the default build once, in full,
with clause and test failures reconciled by name against `main`'s sets. The
frame figures (fence margin 785, DMA-on maximum 31,121, DLI 2/0) are expected
unchanged.

## 8. STOP conditions checked

The removable set is the 14-B entry and its export only; it is outside frame
code; reachability is proved (no caller, no fall-through); no player-visible
behaviour changes; no build-script or cfg change is needed beyond comments. Phase
B proceeds without an owner question.

## 9. Result (MEASURED, default build)

Commits: `f5fc102` (removal and tests), `d16190d` (evidence), plus the media
manifest and documentation commit. ATR `1c3ad1b3…` (`main` `3bab2e15…`), boot
`549387ab…` (`main` `3cf380ec…`).

### 9.1 Bytes — as planned

`BOOT_STAGE2` 1,337 → **1,323 B** (`$21C1-$26EB`). Initial block content
13,626 → **13,612 B**; sectors **107 / 101 / 208**. The extension records,
`chunk-manifest.bin` and every runtime image in `build/` are byte-identical to
`main`. Margins against the moved sources grew by 14 B (packed starfield →
pickup cold staging 138 → 152 B). `ENTITY_CODE` tail 26 B, `HYBRID_C_ARENA`
114 B free, `$AE00` 1,593 B free and `DIRECTOR_RAM` 602 / 645 are unchanged.

**Departure from §4, reported.** §4 said the prefix does not move. Its size,
layout and instructions do not, but six of its bytes are operands that point into
the moved region and follow it by −14: `start`'s `jmp boot_stage2_error`
(`$2038`: `$261C` → `$260E`) and the five source addresses in the
`boot_stage_streams` table (`$20DA`, `$20E0`, `$20EC`, `$20F2`, `$20F8`). They are
link-time and build-time values. Without them no byte could be returned:
keeping them would mean keeping every address behind `BOOT_STAGE2`.

### 9.2 Boot time — a side effect, not planned

§4 expected the loader 345 and menu 602 to stay put. They moved **4 frames
earlier** (start 288 → 284, loader 345 → 341, menu 602 → 598; BASIC enabled
259/316/573 → 256/313/570). `main` was re-measured in a detached worktree on the
same emulator. Cause: `boot_stage2_crc16`'s per-bit `bne` was at `$2600` → `$25E7`
and crossed a page on each of the 7 taken branches per byte. It is now at
`$25F2` → `$25D9`, with no crossing. The per-byte length `bne` (`$25FD` →
`$2602`) now crosses instead. Over 12,928 CRC'd bytes the net is about −77,000
cycles (ESTIMATE from the branch count), all before `start`. The ATR menu delta
against `docs/boot-deadline-baseline.json` goes +6 → **+2**. The baseline is not
re-recorded: the transport did not grow.

### 9.3 Gates

* Boot smoke **4/4** (ATR, BASIC off and on, fills `$A5`/`$5A`). The warm start is
  covered by the `DOSVEC = start` entry-identity check; the boot smoke has no
  RESET session, so the real RESET is on the owner's list.
* Trace: **16** clause failures, the recorded set by session and message.
  DMA-on maximum **31,121**, headroom **4,447**, 0 overruns, 0 missed frames,
  0 extra VBI boundaries, DLI 2 per host frame / 0 violations. Outside
  `boot_smoke`, every changed leaf of `docs/runtime-wall-trace.json` besides the
  SHAs is a −4 host frame or −142,272 clock shift (537 leaves).
* The splash-hold `screen_checksum` (`$4000-$43FF`) changed. Its first 16 B are
  left-over boot bytes below the loader bitmap at `$4010`, and they moved 14 B.
  The rendered loader screenshots are byte-identical PNGs to `main`'s. The menu
  checksum at the fixed frame 3050 differs because the menu has run 4 frames
  longer. The gameplay snapshot at 3300 is identical.
* PAL audit, 56 replays: 0 distinct miss events; worst fence margin **785**,
  `director-complete-2-natural-sweep-fire0` f5815, as on `main`.
* Mode-gated runs: as recorded on `main` (formation passes; sector "did not
  return to post-sector OPEN"; remnant 63 / 62; debris gate 1 blank of 990 in
  `debris-gate-capital-muzzle-ring-2-sweep-fire4`).
* `npm test`, default build, once in full: **887 / 779 / 105 / 3**. The 105
  failures are `main`'s 105 by name (`main`: 883 / 775 / 105 / 3, measured this
  session); the four new tests pass.
