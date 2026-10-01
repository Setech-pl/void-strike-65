# Plan — blank the screen during boot and loading (boot-loading-blank-screen)

**Session 2026-10-01.** Branch `fix/boot-loading-blank-screen` from `main`
`55cc361` (`docs: boot-xex-reclaim, an owner-smoke candidate`), which carries the
boot-xex-reclaim merge. Every figure is **MEASURED** on `main` `55cc361`
(default build, ATR `1c3ad1b3…`, boot `549387ab…`, both equal to `docs/STATUS.md`)
unless it says ESTIMATE.

**Status: IMPLEMENTED — `OWNER-SMOKE CANDIDATE`, awaiting the owner's smoke.**
Phase A (§1-§7) is the plan as committed (`c16852a`). §8 records what was built
and measured.

---

## 1. Owner decision for this task

In every boot path — cold boot with BASIC enabled, cold boot with BASIC disabled,
and RESET — the player sees no characters and no garbage between power-on/RESET
and the splash. The screen in that window looks like today's clean `-nobasic`
cold boot. The splash, its cassette sound, the loader picture, the menu and the
game are unchanged.

In force and not reopened: ATR only; `LEVEL_MAX_ID` 16 with level 1 alone in the
default artifacts; the transport STOP rule (no new boot sector, initial block
≤ 13,652 B, ATR menu delta ≤ +7); worst fence margin ≥ 500 and the 32,568 DMA
gate; the `HYBRID_C_ARENA` lever in reserve (decision 19); the all-or-nothing
Spread volley; owner decision A (`disable_basic_rom` and its call from
`boot_stage2_atr_entry` exactly as they are).

## 2. How the evidence was taken

A scratch copy of the instrumented Atari800 (`build/atari800-trace`, not
committed, outside the repo) with a diagnostic observer that prints, at every
frame boundary, `DMACTL`, the display-list pointer ANTIC is using, `SDMCTL`,
`SDLSTL`, `COLBK`/`COLPF1`/`COLPF2`, `SAVMSC`, `RAMTOP`, `PORTB`, `COLDST`,
`BASICF`, `NMIEN`, `DOSVEC`, the two hottest PC pages of the frame, and two
pixel counts over the visible screen: the number of distinct colours and the
number of pixels that are not `COLBK`. RESET is the emulator's own warm-start
key (`AKEY_WARMSTART`, i.e. F5), raised between frames. Same flags as the boot
smoke: `-xe -pal -basic|-nobasic -nosound -turbo`. The emulator's "D1" disk
activity LED is drawn into the same frame buffer; it was switched off
(`Screen_show_disk_led`, a host display preference) after it showed up as a
70-pixel artefact in the bottom-right corner.

## 3. Diagnosis

### 3.1 What ANTIC shows, per path

Frames are the frame counter at the observation, the convention of the boot
smoke milestones.

| Path | OS screen up | Clean (blue field, black border, the OS cursor) | **Garbage** | `start` (DMA off) | Splash display on |
| --- | ---: | ---: | ---: | ---: | ---: |
| cold, BASIC enabled | f64, DL `$9C20`, screen `$9C40`, `RAMTOP $A0` | f64-f192 | **f193-f257, 65 frames (1.3 s)**: 6 colours, ~8,770 non-border pixels, the blue field gone | f257 | f315 |
| cold, `-nobasic` | f73, DL `$BC20`, screen `$BC40`, `RAMTOP $C0` | f73-f285 | **none** | f285 | f343 |
| RESET at f1100 (either flag) | f1165, DL `$9C20`, `RAMTOP $A0`, `PORTB $FD` | f1165-f1293 | **f1294-f1358, 65 frames** | f1358 | f1416 |

What is displayed in the garbage frames is ANTIC running the OS screen-editor
display list at `$9C20` and its screen memory at `$9C40-$9FFF` after the game has
loaded code over both: `ROM` character set (`CHBASE $E0`), the OS colours
(`COLPF1 $CA`, `COLPF2 $94`, `COLBK $00`). Display-list bytes that are now
Director code fetch mode lines from wherever their operands point, which is the
"line of characters that keep changing" (the decode keeps writing there) and the
"coloured line".

### 3.2 What writes into it

The stage-2 chunk loader (`boot_stage2_atr_entry`, `BOOT_STAGE2`) publishes
three records into the range the BASIC-enabled OS screen occupies
(`build/manifest.json`, `transportCapacity.manifest.parsed.records`):

| Record (start sector) | Destination | Covers |
| --- | --- | --- |
| 162 (3 sectors, LZ) | `$9B40-$9D31` | the display list `$9C20-$9C3F` and screen rows 0-6 |
| 171 (1 sector, LZ) | `$9D5E-$9D72` | screen row 7 |
| 204 (5 sectors, LZ) | `$9D75-$9FCE` | screen rows 7-23 |

Record 162 is the third record; the garbage starts the frame it publishes
(f193). Nothing reaches `$BC20-$BFFF` (the highest destination ends at `$B5C6`),
which is why `-nobasic` stays clean. `docs/memory-map.md` §"The window at
`$A000-$BFFF` — measured top" already recorded that a BASIC-enabled cold boot
leaves `SDLSTL` at `$9C20`, inside the game's resident RAM; this is the visible
consequence of the same fact.

### 3.3 What runs during the window

From `boot_entry` (`$2006`): `boot_stage2_atr_entry` → `disable_basic_rom` →
`copy_boot_splash_blob` → manifest validation → for each of the 11 records:
SIOV sector reads into `$8100`, `boot_stage2_crc16` (the hottest page, `$25`,
in every frame of the window), then LZ decode or raw copy to the destination →
`$02` into `boot_chunk_ready`, `DOSVEC+1` → `rts` → `jmp start`. Throughout it
the **OS VBI is live** (`NMIEN $40`) and copies `SDMCTL` → `DMACTL`, `SDLSTL` →
`DLISTL` and the colour shadows every frame. `start` clears `NMIEN` and `DMACTL`
as its first act, so from `start` to the splash the screen is `COLBK`, black.

### 3.4 RESET — the brief's hypothesis and the repo disagree

The brief describes RESET as a warm start that enters `start` through `DOSVEC`.
**MEASURED: it is not.** `COLDST` (`$0244`) reads `$FF` during play. The OS sets
it non-zero while it boots and clears it only after the boot returns to it; since
owner decision A (2026-09-20) `boot_entry` ends in `jmp start` and never returns,
so `COLDST` stays `$FF` and **every RESET is an OS cold start**: memory test and
clear (f1102-f1163, display off), the OS screen, the full 107-sector initial
block and all 11 stage-2 records again, then the splash, the loader and the menu
(about 1,400 frames after RESET, not "the game"). `DOSVEC → start` is never taken;
the `$02` token test in `start` is reached only from `boot_entry`. This is
pre-existing and not changed here.

And RESET lands in the BASIC-enabled layout even under `-nobasic`: Atari800's
`-nobasic` holds OPTION during its own cold start only (`Atari800_Coldstart`,
`GTIA_consol_override = 2`; a warm start does not), so the OS cold start that
follows RESET sees OPTION up, maps BASIC (`PORTB $FD`), sets `RAMTOP $A0` and
opens its screen at `$9C20` — exactly what a real 65XE does when the player
presses RESET without holding OPTION. Hence the identical garbage.

### 3.5 Why `-nobasic` cold boot is clean

`RAMTOP $C0` puts the OS screen at `$BC20-$BFFF`, above every stage-2
destination, so the display list and screen memory stay intact (blue field with
the OS cursor cell) until `start` turns DMA off.

### 3.6 Disagreements with the brief

| Brief | Repo / emulator |
| --- | --- |
| RESET is a warm start through `DOSVEC → start` | RESET is an OS cold start (`COLDST $FF`); it re-boots the disk (§3.4) |
| "the same garbage … before the game comes back" | the machine comes back to the splash, loader and menu, not to the game |
| owner hypothesis: the game loads into the OS screen | **confirmed**, with the three records named in §3.2 |
| about 2 s of garbage | 65 frames, 1.3 s, in `-turbo` frame counts; the stage before it (clean) is ~2.6 s |

## 4. The fix

Blank the display at the start of stage 2, before the first SIO read and
therefore before any record publishes, in `boot_stage2_atr_entry`, right after
`jsr copy_boot_splash_blob`:

```asm
    stx SDMCTL      ; X = 0: copy_boot_splash_blob's loop exits on the wrap
    lda COLOR2      ; the OS's blue field colour ...
    sta COLOR4      ; ... becomes the whole screen
```

The live OS VBI copies `SDMCTL` into `DMACTL` and `COLOR4` into `COLBK` at the
next vertical blank. With ANTIC DMA off nothing is fetched, so whatever the
loader writes into `$9C20-$9FFF` can no longer be displayed, and the whole
screen shows `COLBK` = the blue the OS was showing. `start` keeps clearing
`NMIEN`/`DMACTL` as before; `COLBK` keeps the blue until the splash writes its
own `COLBK` (it does, before it enables DMA, `src/boot-splash.s`), so the screen
goes OS blue → blue → splash in every path.

**Why blue and not black.** The decision asks for the window to look like
today's `-nobasic` boot, and that boot is blue. Black (`stx SDMCTL` alone, 3 B)
would also have no characters, but it would turn the `-nobasic` boot from blue to
black for its whole stage 2, and in Atari800 (fast SIO) the OS screen is up only
~12 frames before stage 2, so the player would see a blue blink. With the copy of
`COLOR2` the only differences from today's `-nobasic` picture are that the border
is blue too during stage 2, and that the ~1.1 s between `start` and the splash is
blue instead of black. If the owner prefers black, it is the same change minus 6 B.

New equates, zero bytes: `SDMCTL = $022F`, `COLOR2 = $02C6`, `COLOR4 = $02C8`.

**What it does not touch.** `boot_entry` (24 B) and `start` `$201E`; the fixed
`$01A3` prefix (no operand in it points past the insertion: `boot_stage_streams`
and `jmp boot_stage2_error` move with their targets, the build patches them);
`disable_basic_rom` and its call; `copy_boot_splash_blob` (still a subroutine; a
comment records that its caller relies on `X = 0`); `DOSVEC`; every runtime
segment, so no byte of any gameplay frame changes. RESET semantics are unchanged
(§3.4).

**Hardware note.** XL OS SIO sets `CRITIC` per sector, which skips the deferred
VBI's shadow copies during the transfer, but stage 2 spends most of its time in
the CRC and the decode between transfers; on the emulator the blanking takes
effect within one frame (f79 BASIC, f88 `-nobasic`), and record 162 publishes
more than 100 frames later. The disk OS does not write `SDMCTL` or `COLOR4`.

## 5. Bytes, sectors, frames

| | `main` `55cc361` | this plan | |
| --- | ---: | ---: | --- |
| `BOOT_STAGE2` | 1,323 B `$21C1-$26EB` | **1,332 B** `$21C1-$26F4` | +9, ESTIMATE until built |
| initial block content (STOP 13,652, ceiling 13,684) | 13,612 | **13,621** | +9, `BOOT_STAGE2` rides raw |
| boot / extension / total sectors | 107 / 101 / 208 | **107 / 101 / 208** | |
| extension records, runtime images | | byte-identical | |
| packed starfield → pickup cold staging | 152 B | 143 B | the packed sources behind `BOOT_STAGE2` sit 9 B higher |

**Frames — they fall, not rise.** With ANTIC DMA off the OS screen (GR.0, roughly
a quarter of every frame's cycles) no longer steals from the stage-2 CRC and
decode. **MEASURED in the probe on a candidate build** (then reverted):
splash-on f315 → **f282** (−33) with BASIC, f343 → **f291** (−52) with
`-nobasic`; stage-2 end f257 → f224 and f285 → f233. Expected boot-smoke
milestones therefore about start / loader / menu **232 / 289 / 546** (`-nobasic`)
and **223 / 280 / 537** (BASIC). The baseline in `docs/boot-deadline-baseline.json`
(`atr_menu_frames` 596) is not re-recorded: it gates growth, and the ATR menu
delta goes from +2 to about −50; re-basing it is the owner's call. Every
gameplay figure in the default trace is expected to be the same frame about 52
host frames earlier, as with boot-xex-reclaim's −4.

**The CRC loop.** `boot_stage2_crc16` moves +9 B (`$25C5` → `$25CE`). The
per-bit `bne` that ends the 8-bit loop is at `$25F2`, next instruction `$25F4`;
it moves to `$25FB`/`$25FD`, target `$25E2`: **same page, 2 B to spare** (12 B
would cross). The inner `bcc` (`$25DF` → `$25F1`) moves to `$25E8` → `$25FA`,
same page. Of the once-per-byte branches the length `bne` (`$25FD` → `$2602`,
crossing today) stops crossing (`$2606` → `$260B`) and `bne @byte` keeps
crossing; about −12,900 cycles over the 12,928 CRC'd bytes, a third of a frame.

## 6. Tests

1. **Guard first** (passes on `main`): two `.assert`s inside
   `boot_stage2_crc16` — the per-bit `bne @bit` and the inner `bcc` each stay in
   the page of the instruction after them. A link that crosses fails with a
   message that names the 4-frame cost.
2. **Boot smoke, new observation in every session** (RED on `main`'s build for
   BASIC enabled and for RESET, GREEN after; the `-nobasic` sessions are GREEN on
   both and stay as the guard of what clean looks like). For every frame from
   power-on (or from the frame after RESET) until the splash turns its display
   on after `start`, the observer counts the visible pixels that are neither of
   the frame's two most frequent colours. A frame is clean when that count is at
   most 64 — one 8×8 cell, the OS screen-editor cursor that today's clean
   `-nobasic` boot shows while the OS loads the initial block, before any game
   code runs. The first dirty frame is saved as a screenshot. The harness fails
   the session with the frame range and the count.
3. **New RESET session** (`-nobasic`, cold fill `$A5`): the normal boot, the
   menu, FIRE, gameplay; at the gameplay snapshot frame the observer raises the
   emulator's warm-start key; the session must come back through `start` to the
   splash with every frame in between clean. It is reported as
   `cold_boot.reset_sessions`, so the cold matrix the trace test pins is
   unchanged. The emulator needs one prepare-time patch in `atari.c` (a flag the
   observer sets, turned into `AKEY_WARMSTART` before the frame's key switch);
   `--prepare` applies it, and the freshness check forces it because the header
   changes too. ESTIMATE: ~50 lines of capture code (observer + prepare patch +
   session definition), under the 60-line line.
4. **`tests/boot-loading-blank-screen.test.mjs`**: the source order in
   `boot_stage2_atr_entry` (`disable_basic_rom`, `copy_boot_splash_blob`, then
   the `SDMCTL`/`COLOR4` writes, all before the first `SIOV`); the CRC guards are
   present; and the committed evidence carries a clean blank window for every
   cold session and the RESET session. RED on `main`, GREEN after.

Gates after the fix: boot smoke, all sessions; the full default trace;
evidence regenerated `build:candidate` → `runtime:wall-trace` → `build`;
`npm test` on the default build, once, reconciled by name against the recorded
16 clause failures and 105 test failures.

## 7. STOP conditions checked

Initial block +9 B (≤ ~12 B); no menu frame added (about −50); nothing in
`disable_basic_rom`, the fixed prefix's instructions, frame code or anything
after the splash; one cause and one fix that reaches all three paths (§3.4: the
RESET path is the BASIC-enabled cold boot again). Phase B proceeds without an
owner question.

## 8. Result (MEASURED, default build)

Commits: `c16852a` (this plan), `044d072` (CRC guard), `753fa46` (harness and
tests, RED), `818ae8e` (fix and the reclaim re-point), `a96432f` (test regex),
`4a77dd0` (evidence), `262d645` (media manifest), plus the documentation
commit. ATR `af2e47b62c315ddf9ed05cab44842d8921bcb8c561b9cc2dcf103f1b1e8b31b7`
(`main` `1c3ad1b3…`), boot
`06d2f25665a17c0858c92245f257d6d339858149a5ed4679919d120d6eb4d80a`
(`main` `549387ab…`).

### 8.1 Bytes — as planned

`BOOT_STAGE2` 1,323 → **1,332 B** (`$21C1-$26F4`); initial block content
13,612 → **13,621 B**; sectors **107 / 101 / 208**. The extension records,
`chunk-manifest.bin` and every runtime image in `build/` are byte-identical to
`main`, except `resident-runtime.bin`, whose only differences are the six
fixed-prefix operand bytes that follow the moved region (+9: `$2038`, `$20DA`,
`$20E0`, `$20EC`, `$20F2`, `$20F8`), all boot-only. Packed starfield → pickup
cold staging 152 → 143 B; ENTITY source → staging −16 → −25 B.

### 8.2 RED → GREEN

Boot smoke with the new harness on `main`'s ATR `1c3ad1b3…`: **RED**,
`atr-a5-basic` and `atr-5a-basic` 65 of 314 frames dirty from frame 192,
`atr-a5-reset` window 1 65 of 314 from frame 3494, worst 4,662 stray pixels;
every `-nobasic` window (and the RESET session's own cold boot) clean, worst 0.
On the branch: **GREEN**, 4 cold + 1 RESET sessions, **0 dirty frames, worst 0
stray pixels** in every window. The 64-pixel allowance (§6) is never used —
`main`'s clean `-nobasic` boot measures 0 too — so
`tests/boot-loading-blank-screen.test.mjs` pins 0.
`tests/boot-loading-blank-screen.test.mjs`: 3 of 4 RED on `main` (the CRC guard
test passes there by design), 4 of 4 GREEN.

### 8.3 Frames

| | `main` | branch | Δ |
| --- | ---: | ---: | ---: |
| ATR start / loader / menu, `-nobasic` | 284 / 341 / 598 | **232 / 289 / 546** | −52 |
| the same, BASIC enabled | 256 / 313 / 570 | **223 / 280 / 537** | −33 |
| menu delta vs baseline 596 | +2 | **−50** | |
| RESET at 3301: reboot `start` | 3558 | **3525** | −33 (BASIC layout) |

The difference between the two flags is how long the OS screen was stealing
cycles before (the `-nobasic` stage 2 ran 19 frames longer on `main`). Every
gameplay figure is unchanged: the PAL audit's worst row is the same row at the
same gameplay frame; the one debris-gate blank life is at host frames
4451-4487, 52 frames earlier than the reclaim's 4503-4539, at the same gameplay
frames. `docs/boot-deadline-baseline.json` is not re-recorded (§5).

### 8.4 Deviations from the plan

* Harness size: about 80 lines of capture code against the brief's ~60; the
  owner chose to proceed as drafted.
* The emulator's disk-activity LED is switched off in the boot observer (§2).
