# Plan — the boot splash: cassette sound, fade, skip, allied-blue ship

**PLANNING session, 2026-09-22.** Branch `docs/plan-splash-cassette` from `main`
at `944450f` (`music(v2 10.2)`), worktree clean. **Nothing here is implemented;
this document is the deliverable.** Every address, size and count below is
MEASURED from `build/void-strike-65.map`, `build/manifest.json` and the source
at that HEAD unless labelled ESTIMATE.

Preconditions MEASURED at the session start: worktree clean; `npm test` on the
**default** build links with the release gate green (`timing_and_dli_passed =
true`, no unrecorded gate failure, the 40 recorded failures unedited), 771
tests, 109 failures — the same count STATUS records for this HEAD, 0 new;
`tests/runtime-evidence-binding.test.mjs` 2/2.

Owner request (owner-priority): the ADR-003 boot splash — title, capital-ship
profile, studio footer, a pure 250-frame hold with no I/O — gets a sound that
imitates a standard 600-baud Atari cassette load, a sound-and-picture fade over
its last 75 frames, a SPACE-or-FIRE skip, and the ship in allied blue. **The
hold length does not change.**

---

## 0. Two corrections to the brief, before anything else

**0.1 `BOOT_STAGE2` is dead before the hold runs.** The brief names "boot-only /
staging memory (BOOT_STAGE2 or the loader staging area)" as the home of the new
code. MEASURED: the stage-2 overlay lives at `$21C1-$26E1` (1,313 B of the
`$0800` reservation, 735 B free) and is **overwritten by
`unpack_resident_runtime`** (`src/main.s` line 1158, the second step after
`start`), seven boot steps before `show_loader` (line 1182). `build/manifest.json`
records it as `stage2.overwrittenByResidentSuffix: true`. No code stored there
exists when the splash is shown.

**0.2 No boot-only home survives to the hold, anywhere in `$2000-$9FFF`.**
The census of §6 is the finding the brief asked for ("if it does not fit
boot-only memory: STOP and report"). It was reported to the owner during this
session and the owner chose a recovery — the code travels inside `BOOT_STAGE2`
and both stage-2 entries copy it to low RAM `$0500-$06FF` before `start`
(§6.3). That is an **owner decision recorded here**, with its two deviations
from the brief's wording stated in §6.4.

---

## 1. What stays fixed

| Invariant | How the plan keeps it |
| --- | --- |
| Hold = 250 complete PAL frames; `LOADER_DURATION_FRAMES = 250` assert in `scripts/loader-assets.mjs` | `loader-bitmap.json` `timing.palFrames` untouched; the hold loop still counts `loader_frame_count` 250 → 0, one decrement per frame |
| Countdown proof (`runtime-wall-trace.mjs` loader+3 / loader+53: `near.loader_timer − far.loader_timer = 50`, `far > 0`) | same counter, same cadence; the observation frames are derived from the `loader` milestone, which is `show_loader`'s label — kept |
| Decision-22 baselines in `docs/boot-deadline-baseline.json` | **not re-recorded**; the transport growth of §6.5 moves the ATR milestones inside the +10 warn band and is reported as a finding |
| Boot order: `disable_basic_rom`, the chunk loader, Option D, the no-OPTION ATR path | untouched. The `start` sequence stays textually identical (`tests/formats.test.mjs:226` and `tests/frontend.test.mjs:62,404` match it by regex) |
| ADR-003 "one deterministic path" | XEX and ATR run the same copy, the same hold and the same exit; the only per-medium delta is transport sectors (§6.5). The recorded pre-existing 5-frame XEX/ATR difference at gameplay entry is untouched |
| Loader-hold snapshots (`DFBootSnapshot`) | frames and asserted fields unchanged; new observations are added **beside** them (§8) |
| Recorded gate failures (`docs/recorded-gate-failures.json`) | list identical; the implementation regenerates the evidence as its own change |

---

## 2. Sound design — a data table, not code

### 2.1 Source asset and generated table

* `assets/audio/boot-splash.json` — the editable source (rule 12). A small
  generator (a sibling of `scripts/loader-assets.mjs`, invoked by
  `scripts/build.mjs`) validates it and emits `build/boot-splash.inc`.
* The generator asserts: segment frames sum to **250**; `fadeStartFrame` is
  inside 1..250; volumes are 0..15; AUDF values are 0..255; a `DATA` segment
  is at least 17 frames (two sync bytes = 20 bit cells).
* The owner tunes by editing the JSON and rebuilding. **No code change is
  needed for any value below.**

### 2.2 Constants (proposed starting values)

| Constant | Value | Why |
| --- | --- | --- |
| `MARK_AUDF` | 5 | 64 kHz clock: 63,337 / (2·6) ≈ **5,278 Hz** PAL — the OS's own mark value |
| `SPACE_AUDF` | 7 | 63,337 / (2·8) ≈ **3,959 Hz** PAL — the OS's own space value |
| `AUDC_BASE` | `$A0` | pure tone (distortion `$A`); volume is OR-ed into the low nibble. `AUDCTL` is 0 as `start` leaves it (line 1146) |
| `START_VOLUME` | 10 | frames 1-175 |
| `END_VOLUME` | 2 | frame 250 — the deck stops abruptly |
| `FADE_START_FRAME` | 176 | 75 fade frames |
| `SYNC_BYTES` | `$55, $55` | every `DATA` segment starts with them |
| bit framing | start 0, 8 data bits LSB first, stop 1 | 10 cells per byte |

### 2.3 Segment script (proposed; the owner retunes by ear)

Each segment is `(type, frames)`; types are `SILENCE` (`AUDC1 = $A0`),
`LEADER` (steady mark), `DATA` (sync bytes, then bytes from `RANDOM`
`$D20A`, framed) and `DATA_LOW` (**SHIPPED 2026-09-23**, §2.3.1) — a `DATA`
record one octave down.

| # | type | frames | covers | note |
| ---: | --- | ---: | --- | --- |
| 1 | SILENCE | 5 | 1-5 | the deck starts |
| 2 | LEADER | 60 | 6-65 | 1.2 s of mark tone |
| 3 | DATA | 55 | 66-120 | ≈ 66 bytes |
| 4 | SILENCE | 10 | 121-130 | inter-record gap |
| 5 | **DATA_LOW** | 50 | 131-180 | **an octave down**; the fade starts inside it (176) |
| 6 | SILENCE | 10 | 181-190 | a gap inside the fade |
| 7 | DATA | 60 | 191-250 | cut at volume 2 by the teardown |
| | **total** | **250** | | |

**MEASURED, 2026-09-22.** The blob did not fit the initial block where §6.5
assumed it would: `scripts/chunk-loader.mjs` caps the opt-in initial block at
105 sectors / 13,440 B, and at 13,102 B of content plus the 12-B envelope only
**326 B** were free — 186 B short of the 512-B blob. Every alternative costs
the same four sectors of SIO read, so the ceiling was raised 105 → 107 and the
cost measured instead of estimated: initial block 103 → 107 sectors, ATR loader
339 → **343** and menu 596 → **600**, XEX unmoved at 135/392, boot smoke 8/8.
Inside the +10 warn band, so the baselines are not re-recorded. This is the one
consequence the plan did not foresee and is an owner-visible envelope change.

Note for the owner's retuning: a real Atari inter-record gap is **mark tone**,
not silence (the OS writes a 0.25 s pre-record tone). Replacing a `SILENCE`
segment with a short `LEADER` reproduces that — a table edit only.

#### 2.3.1 `DATA_LOW` — the second record is an octave down (SHIPPED 2026-09-23)

Owner, 2026-09-23: the three data blocks must not sound identical. The leader
tone is unchanged and so are records one and three; the **middle** record is the
**same pure tone with its divider doubled**.

| | mark | space |
| --- | ---: | ---: |
| `DATA` (records 1 and 3) | AUDF 5 → **5,278 Hz** | AUDF 7 → **3,959 Hz** |
| `DATA_LOW` (record 2) | AUDF 11 → **2,639 Hz** | AUDF 15 → **1,979 Hz** |

One octave down is `(N + 1) → 2 · (N + 1)`, so `N → 2N + 1`. The blob computes
it in the emit path rather than from a second AUDF table:

```text
@emit:  txa / ldx splash_segment_type / cpx #SPLASH_SEGMENT_DATA_LOW
        bne @store / asl a / ora #$01
@store: sta AUDF1
```

**The octave, not a second waveform.** The owner preferred the octave if both
cost the same, "because it reads as a different kind of block rather than as a
glitch". The buzz rule the brief guards against — a poly-4 divider whose
`(N + 1)` is divisible by 3 or 5 (`scripts/music.mjs`,
[../assets/music/README.md](../assets/music/README.md)) — **does not bind
here**: it governs **poly-4 / buzz** dividers, and this channel is
`AUDC_BASE = $A0`, a **pure tone**. (Worth stating because mark 11 gives
`N + 1 = 12`, divisible by 3, which *would* be forbidden on a buzz channel.)

**Cost: MEASURED, zero transport bytes.** `DATA_LOW` numbers **3**, above
`DATA`'s 2, so `splash_segment_load` admits both with the one `cmp
#SPLASH_SEGMENT_DATA` it already had, turned from `bne` into `bcc` — no extra
byte. The emit test is **+11 B of blob code**, and the blob is padded to a fixed
`SPLASH_BLOB_BYTES` (`$0200`) window, so it is spent out of the pad: **code 499
→ 510 B, pad 13 → 2 B free, the transported blob still 512 B.** Initial-block
content **13,652 B unmoved** (32 B under the 13,684 ceiling), boot **107**
sectors unmoved, extension **102**, total **209**. About **+84 cycles per hold
frame** against a per-frame budget of roughly 1,080 — boot-time only, and the
hold is counted in frames, not cycles, so no deadline moves.

> **Correction to the backlog entry that deferred this.** `STATUS.md` §Backlog
> deferred the sound variation behind a splash/`A2_KERNEL` packing task, on the
> reasoning that "any real byte added to splash code costs a boot sector".
> MEASURED 2026-09-23: that is true of bytes added to the initial block, but
> **not** of bytes added to the blob while its fixed 512-B window still has
> pad — which it did, by 13 B. The packing task (item 1) remains worth doing and
> is untouched; it was simply never a precondition for this.

### 2.4 The bit engine — per-bit switching timed by VCOUNT

* 312 PAL scanlines / 26 lines per bit = **12 bit cells per frame, exactly**
  (12 × 50 = 600 baud). Cell *k* (0..11) starts at `VCOUNT = 13·k`.
* Frame top: `wait_frame_start` (returns as VCOUNT leaves 0) → per-frame work
  (§3 fade values, §4 skip poll, segment step, title palette + `COLBK`) → emit
  cell 0 → then for *k* = 1..11 spin until `VCOUNT ≥ 13·k` and emit cell *k*.
  Emitting a cell = `AUDF1 ← mark | space`, `AUDC1 ← AUDC_BASE | volume`
  (`SILENCE` writes `$A0` and leaves `AUDF1`).
* A byte's 10 cells run across frame boundaries; the shift register, bit index
  and "sync bytes left" counter are blob variables.
* Jitter: VCOUNT resolves 2 lines (228 cycles, ~8 % of a cell), plus the DLI
  stall (§3.3) on the two cells that contain a DLI, plus the ~10-cycle poll
  loop. **Accepted, not fought** (owner).
* Per-frame CPU, ESTIMATE, all inside the frame with DMA on: fade ≈ 500
  cycles, poll ≈ 60, segment step ≈ 40, 12 cells × ≈ 40. Nothing here is
  raster-critical except the DLI, bounded in §3.3.

> **Amendment SHIPPED 2026-09-23 — see §2.3.1.** The three data blocks no longer
> sound identical: the leader tone and records one and three are unchanged, and
> the second record is the same pure tone an octave down (`DATA_LOW`, the
> divider doubled). It cost **+11 B of blob code and zero transport bytes** —
> the fixed 512-B blob window had 13 B of pad — so it did **not** have to wait
> for the initial-block reclaim the backlog put in front of it.

---

## 3. Picture fade — frames 176-250

### 3.1 One shared fraction, six faded bytes

* `q16` = `$FFFF` at frame 175; each fade frame subtracts `ceil(65535 / 75) =
  874`, clamped at 0 → `q = q16 >> 8` is 252 on frame 176, **0 on frame 250**.
  The generator derives the step from `fadeStartFrame`, so the owner's frame
  table drives it.
* Per colour: `lum = (L0 · q) >> 8` (4-bit × 8-bit shift-add, ≤ 15 → no
  underflow into the hue nibble), `colour = (base & $F0) | lum`. Monotone
  non-increasing by construction; 0 on frame 250.
* Volume: `END + ceil((START − END) · q / 256)` → 10 until q < 225 (~frame
  184), then 9, 8 … **2 on frame 250**, never 0. ESTIMATE of the step spacing:
  ~9.4 frames.
* The six fadable bytes and their L0 at HEAD after §5: title `COLPF1 $1E` (14),
  `COLPF2 $10` (0); ship `COLPF1 $8A` (10), `COLPF2 $80` (0); studio `COLPF1
  $D8` (8), `COLPF2 $D0` (0). `COLBK` is `$00` in every zone and stays 0.
  Luminance 0 is black for every hue, so frame 250 is all-black with the hues
  kept, as the owner asked.

### 3.2 Who writes what

* Main loop, frame top: the faded title pair → `COLPF1/COLPF2`, `COLBK ← 0`
  (this replaces the per-frame `set_loader_title_palette` call; the routine
  itself stays for `show_loader`'s initialisation).
* Main loop, once per fade frame: the six faded bytes into the blob's RAM.
* `loader_dli` (moved into the blob, same label, same two phases): loads the
  ship pair, then the studio pair, **from that RAM** instead of immediates.

### 3.3 DLI worst-case bound

Today: `pha 3, lda #0 2, sta WSYNC 4, lda phase 4, bne 3, lda # 2, sta 4, lda #
2, sta 4, inc 6, pla 4, rti 6` = **44 cycles** + NMI entry 7 + a WSYNC stall of
up to ~105 cycles → ≈ 156, stated as **160**. The change turns two `lda #imm`
into `lda abs` (+2 each) in both phases: **new bound 164 cycles** (ESTIMATE,
+4). Zero-page loads would give 162 but would claim two ZP bytes; the plan
uses absolute loads from the blob. The studio phase is bounded identically.

---

## 4. Skip — SPACE or FIRE

### 4.1 What is read, and why hardware

Polled **once per frame at frame top**, hardware registers only:

| Input | Register | Pressed when | Why not the OS shadow |
| --- | --- | --- | --- |
| FIRE, joystick 1 | `TRIG0 $D010` | bit 0 = 0 | `STRIG0` is written by the OS VBI, which is off (`NMIEN = $80`, DLI only) |
| SPACE | `SKSTAT $D20F` bit 2 = 0 (a key is down) **and** `KBCODE $D209 & $3F = $21` | both | `CH ($02FC)` is written by the OS keyboard IRQ; the CPU I-flag has been set since `sei` at `start` and `src/main.s` contains no `cli`, so that handler never runs |

`SKCTL` is not written anywhere in `src/main.s`; the OS's `$03` (debounce +
keyboard scan) is still in force during the hold, so POKEY keeps updating
`SKSTAT`/`KBCODE` without any IRQ.

### 4.2 Edge, not level

Two armed flags, both 0 when the hold starts. Each frame: if the input is
released, arm it; else if armed, skip. A button or key held from frame 1 never
arms and never skips; it must be released and pressed again.

### 4.3 One exit path

```
exit:   AUDC1 ← 0
        six faded bytes ← 0; COLBK, COLPF1, COLPF2 ← 0        ; black now
        NMIEN ← 0; DMACTL ← 0                                 ; the existing teardown
        if the exit was a skip: spin until TRIG0 = 1 and SKSTAT bit 2 = 1
        rts
```

Frame 250 falls through into the same code (its colours are already 0, its
volume 2 is cut by the `AUDC1 ← 0`). A skip at frame *N*'s top ends the hold
inside frame *N*: latency **< 1 frame** plus the frame in progress — within the
1-2 frames the owner asked for. Automated boot traces press nothing and run
the full 250 frames; the release wait is a no-op on the natural exit.

### 4.4 No leak into the menu — proof

1. **SPACE cannot reach the menu.** The frontend reads `STICK0 = $D300` and
   `TRIG0 = $D010` only (`frontend_input_poll`, `handle_main_menu_input`,
   `src/main.s` lines 1550-1616); no frontend or gameplay path reads `SKSTAT`,
   `KBCODE` or `CH` (grep: none in `src/main.s`; the sector reader reads
   `SKSTAT` for the serial bits only). There is no latched key code to clear
   because nothing reads one; `CH` is never written after `start` (§4.1).
2. **FIRE cannot select START GAME from the same press.**
   `enter_frontend_state` stores 0 into `frontend_input_armed`;
   `frontend_input_poll` sets it to 1 only on a frame where the stick is
   centred **and** `TRIG0 = 1`, and dispatches only when it is 1. A press still
   held from the splash is seen as active input with `armed = 0` and ignored;
   the player must release (arming) and press again.
3. The exit path's release wait (§4.3) makes the frontend start only after
   both inputs are released — belt and braces over 1 and 2.

---

## 5. Ship colour — allied blue

`assets/graphics/loader-bitmap.json`, ship zone: `COLPF1 "$0A" → "$8A"`,
`COLPF2 "$00" → "$80"`, `foreground "$0A" → "$8A"`. ANTIC F takes the hue from
`COLPF2` and the luminance from `COLPF1`: `anticFRegisterForBitmapBit` gives
`($80 & $F0) | ($8A & $0E) = $8A`, the validator's "COLPF2 low nibble must be
0" rule still holds, and hue `$8` is `GAMEPLAY_COLPF1 = $84`'s hue (the allied
line ship). The generated `LOADER_SHIP_COLPF1 / COLPF2 / FOREGROUND` follow,
and the fade starts from `$8A`. Bitmap bytes are unchanged, so the packed size
(1,967 B) and the residency are unchanged.

**Assertions this touches — each a deliberate, owner-decided change:**

| Where | Today | After |
| --- | --- | --- |
| `tests/loader-screen.test.mjs` "title and ship remain ANTIC F…" | zone table `["ANTIC F", 40, 156, 0x0a]`, `ship.values COLPF1 = 0x0a`, `anticFRegisterForBitmapBit(ship,1) = 0x0a` | `0x8a`, and `anticFRegisterForBitmapBit(ship,0) = 0x80` |
| `tests/loader-screen.test.mjs` "studio ANTIC E pixels use COLBK=$00 and assembled COLPF1=$D8" | searches `loader_dli` for the immediate byte pattern `A9 D8 8D 17 D0 A9 D0 8D 18 D0` | rewritten: the blob's initial colour table holds `$D8/$D0` and `$8A/$80`, and `loader_dli` loads `COLPF1/COLPF2` from that RAM |
| `build/manifest.json` `loaderScreen.sourceSha256` | `e45712fb…` | new hash of the JSON |
| `docs/media` loader preview PNG + `docs/media/manifest.json` | grey ship | blue ship, regenerated by the showcase test |
| `docs/runtime-wall-trace.json` `expected_addresses.loader_dli` | MAIN address | the blob's address (evidence regenerated) |
| Boot-smoke loader snapshots (`loader+3`, `loader+53`) | assert `game_state, dlist, charset, dma_ctl, nmi_en, vdslst, loader_timer` | **no colour register is asserted there** — nothing to change |

---

## 6. Placement — MEASURED census, the finding, and the owner's recovery

### 6.1 What the brief assumed, measured

| Candidate | MEASURED | Verdict |
| --- | --- | --- |
| `BOOT_STAGE2` `$21C1-$26E1` | 1,313 B used, 735 B free; overwritten at `src/main.s:1158` | dead seven steps before the hold (§0.1) |
| `MAIN` (`CODE $2000-$317D`, `RODATA $317E-$3FFF`) | exactly `$2000` B, **0 B slack**; the only give is the 30-B pad inside the 1,997-B loader-bitmap residency (packed 1,967) | cannot take the ~400 B |
| Packed resident suffix | 6,687 B, staged `$8100-$9B1E`, **34 B** below the fixed `$9B40` merged cold record (`COLD_LOW_GLUE_RECORD`) | MAIN may grow ≤ 34 B even if it had room |
| `$3CCA-$3FFF` after the bitmap unpack | ~820 B idle during the hold, reclaimed by `clear_pmg` | ideal lifetime, but it is inside MAIN: nothing can be *stored* there (its file bytes are the packed bitmap) |
| Starfield staging windows `$7810-$7BCF`, `$81FA-$85B9` | exact 960-B copies; margins **16 / 203 B**; packed total 1,701 B against a 1,804-B correction gate | too small, and gated |
| `$7F10-$7FFF`, `$85BA-$8601` | idle during the hold, rewritten at gameplay init | 240 B and 72 B, but written by `stage_boot_streams` / the resident copy at `start`, so no record can land there |
| DFMC records | **11 of `MAX_CHUNKS` 11** | a new record needs the chunk-loader constant raised |
| `$A000-$BC1F` | fully owned; the level-buffer tail `$A980-$B5FF` is idle until the first level read | **excluded by the owner** |

Between `start` and `show_loader`, every byte of `$2000-$9FFF` is written
(`stage_boot_streams` → `$8100-$9B1E`, `$7F2B-$8017`, `$4801-$4AF2`, the entity
staging inside the future bitmap; `unpack_resident_runtime` → `$21C1-$3FFF`;
the publishers → `$8100-$9D5D`; `unpack_loader_bitmap` → `$4010-$5E0F`,
`$3C00-$3CC9`) or is live runtime, or is the displayed bitmap. **There is no
boot-only home that the existing load mechanisms populate and that survives to
the hold.** Exact requirement: ≈ 400 B (ESTIMATE 380-450, cap 512) of RAM that
is (a) populated before the hold, (b) untouched from `start` to `show_loader`,
(c) dead afterwards.

### 6.2 The alternatives put to the owner

| | (a) overlay + copy to low RAM | (b) level-buffer tail record at `$A980` |
| --- | --- | --- |
| Where the bytes travel | inside `BOOT_STAGE2` (735 B free) | own DFMC record + XEX block |
| Boot code outside the hold loop | ~16 B copy in both stage-2 entries | none |
| Loader constants | none | `MAX_CHUNKS` 11 → 12 (+16 B manifest) |
| Home after the splash | `$0500-$06FF`, idle low RAM (never overwritten) | overwritten by the first level read on ATR; idle on XEX |
| Owner constraints crossed | "confined to the hold loop"; "overwritten after" | "the `$A000` window is NOT available"; "the chunk loader stays as is" |
| Transport | initial block +3 sectors | +4 sectors, +1 XEX block |

**Owner decision (2026-09-22, this session): (a).**

### 6.3 The chosen placement, exactly

* **Segment** `BOOT_SPLASH`: `cfg/atari-boot.cfg` adds `SPLASH_RAM: start =
  $0500, size = $0200` and `BOOT_SPLASH: load = BOOT2FILE, run = SPLASH_RAM,
  define = yes`, placed directly after `BOOT_STAGE2` in the same file area.
  Link-time asserts: `__BOOT_SPLASH_SIZE__ ≤ $0200`; `__BOOT_STAGE2_SIZE__ +
  __BOOT_SPLASH_SIZE__ ≤ $0800` (the transient overlay).
* **Transport**: `scripts/build.mjs` (the `bootStage2*` block around lines
  1322-1400, the truncation check at 1655-1665, `initialContentParts` at 1878)
  transports stage-2 **and** the splash bytes as one run at `$21C1`, writes
  `build/boot-splash.bin`, and records `manifest.bootSplash = {runAddress,
  bytes, sha256, overlayAddress}`. `scripts/runtime-image.mjs` gains the
  segment so the JS harness places it.
* **Copy**: in **both** `boot_stage2_atr_entry` and `boot_stage2_xex_entry`,
  immediately after `jsr disable_basic_rom` and before anything else, ~16 B:
  `ldx #0; : lda overlay_copy,x; sta __BOOT_SPLASH_RUN__,x; inx; cpx #<size;
  bne :-` (two pages if the blob exceeds 256 B). Runs before the first SIO read
  on the ATR and before `jmp start` on the XEX; cost ESTIMATE ≈ 4,000 cycles,
  ~0.1 frame, identical on both media.
* **Contents of the blob** (all boot-only, ESTIMATE): hold loop and bit engine
  ≈ 150 B; fade + multiply ≈ 100 B; skip poll + exit ≈ 70 B; `loader_dli`
  ≈ 28 B; tables (script, constants, colour bases) ≈ 30 B; variables (six
  faded bytes, `q16`, shift register, counters, armed flags) ≈ 20 B.
  ~~380-450 B ESTIMATE~~ → **MEASURED 2026-09-22: 499 B** of code, tables and
  variables (21 B of variables at `$0500-$0514`, 478 B of tables and code at
  `$0515-$06F2`), inside the 512-B cap with **13 B** of headroom. The segment
  table is the growth axis: 2 B per segment, so the script can gain six more
  segments before the window is full. The segment is padded to the full 512 B
  so that the copy is one fixed two-page loop and the boot smoke can checksum
  the range byte for byte.
* **`show_loader`** keeps its label (the boot-smoke `DFBOOT_PC_LOADER`
  milestone), its display-list, `PRIOR`, title-palette and `VDSLST` setup
  (`loader_dli` is now the blob's exported label), the `wait_frame_start` /
  `NMIEN` / `DMACTL` start, and then `jmp` into the blob's hold, whose exit
  path (§4.3) returns to `start`'s `jsr unpack_starfield_runtime`. MAIN
  **shrinks** by the old hold loop and DLI (≈ 35 B), so the packed resident
  suffix shrinks and the 34-B `$9B40` margin is not spent.
* **Zero resident bytes**: no linked runtime segment, reservation, ZP byte or
  free-tail figure changes except MAIN shrinking. `$0500-$06FF` is OS page 5-6
  RAM that no segment claims and that neither the game nor the direct-SIO
  sector reader ever touches after takeover.
* **Intactness proof** (both media): the boot smoke checksums `$0500-$06FF`
  (`dfboot_checksum`) at the existing `start` and `loader` PC milestones and
  requires both to equal the checksum of `build/boot-splash.bin` padded to 512 B
  — i.e. the copy landed and nothing between `start` and the hold wrote there.
  The JS test (§9) additionally runs the hold from the same image.

### 6.4 Deviations from the brief's wording, recorded

1. ~16 B of boot code outside the hold loop (the copy in the two entries),
   after `disable_basic_rom` and before every other write either medium
   makes. The boot **order** is unchanged.
2. The home is idle low RAM after the splash rather than memory that a later
   stage overwrites. Nothing reads it again; the memory map records it as
   boot-only.

### 6.5 Transport and boot-time cost, per medium

Initial boot content is 13,118 B in 103 sectors (66 B of envelope slack).
A ~400-B blob makes it ≈ 13,520 B → **106 sectors, +3** (ESTIMATE; the exact
count follows the assembled size). At 2 PAL frames per sector on the ATR:
`atr_loader_frames` 339 → **≈ 345**, `atr_menu_frames` 596 → **≈ 602**, inside
the +10 warn band of `docs/boot-deadline-baseline.json`, which is **not**
re-recorded — the move is reported. XEX: the initial block grows by the same
bytes; ESTIMATE +1-2 frames on `xex_loader_frames` 135 / `xex_menu_frames`
392. The change does not alter the reader's level read, the command-frame
counts (XEX 0 / ATR 7) or the 5-frame XEX/ATR difference at gameplay entry.

---

## 7. What else the implementation touches

| File | Change |
| --- | --- |
| `assets/audio/boot-splash.json` | new source asset (§2) |
| `scripts/boot-splash-assets.mjs` (or an export of `loader-assets.mjs`) | validate + emit `build/boot-splash.inc` |
| `assets/graphics/loader-bitmap.json` | ship zone `$8A / $80 / $8A` |
| `src/main.s` | `.segment "BOOT_SPLASH"` with hold, DLI, tables, variables; `show_loader` trimmed to setup + `jmp`; the two stage-2 entry copies |
| `cfg/atari-boot.cfg` | `SPLASH_RAM`, `BOOT_SPLASH` |
| `scripts/build.mjs`, `scripts/runtime-image.mjs` | transport, `boot-splash.bin`, manifest, harness placement |
| `scripts/atari800-wall-trace.h`, `scripts/runtime-wall-trace.mjs` | §8 observations, `--splash-skip-only`; rerun `--prepare` |
| `tests/boot-splash.test.mjs` (new), `tests/loader-screen.test.mjs` | §9 |
| docs | §10 |

---

## 8. Evidence plan

Route: `npm run build:candidate` → `npm run runtime:wall-trace --
--atari800-source=build/atari800-trace` → `npm run build` (default target, the
one that counts); `--prepare` first because the harness header changes.

Added beside the unchanged loader snapshots:

1. **DLI-entry log**, frames `loader` … `loader + 250`: at every
   `pc == VDSLST` while `game_state = 0` (the hook that already counts
   `loader_dli_count`), record `frame, VCOUNT, AUDF1, AUDC1, COLPF1, COLPF2,
   COLBK`. At the first DLI the registers hold the title zone, at the second
   the ship zone as the first DLI wrote it; the studio zone is visible at the
   frame-end sample. Two in-frame `AUDF1` samples per frame sit in different
   bit cells (≈ cells 2 and 6).
2. **First frontend frame**: `AUDC1` at the frame in which `game_state`
   becomes 1 (must be 0).
3. **Blob checksums** at `start` and `loader` (§6.3).
4. **`--splash-skip-only`**: four short sessions (XEX and ATR × FIRE and
   SPACE), input injected at `loader + 60` for 6 frames — FIRE through
   `GTIA_TRIG[0]` as the boot smoke already does at the menu, SPACE through
   `INPUT_key_code = AKEY_SPACE`, which the prepared tree's `INPUT_Frame`
   maps to `POKEY_KBCODE` and clears `SKSTAT` bit 2 (`build/atari800-trace/
   src/input.c:518-522`). Asserts: `DMACTL = 0` within 2 frames of the press,
   `AUDC1 = 0`, the menu milestone is reached, and **no `gameplay_init`
   milestone** occurs before the session ends.

The recorded-failure list stays byte-identical; boot smoke 8/8 on both media;
72-replay PAL audit not required (no gameplay frame changes) unless the
default run reports a new failure.

---

## 9. Tests

New `tests/boot-splash.test.mjs` on the JS `Nmos6502`
(`installRuntimeSegments` plus the blob at `$0500`): a read hook derives
`VCOUNT` from `cpu.cycles` (35,568 cycles per PAL frame, 114 per line, VCOUNT =
line >> 1); a `WSYNC` write advances to the line end; `loader_dli` is fired by
simulated NMI at the two DLI lines the display list marks; `TRIG0`, `SKSTAT`,
`KBCODE` and `RANDOM` are scripted per frame; every write to `AUDF1`, `AUDC1`,
`COLPF1`, `COLPF2`, `COLBK`, `NMIEN`, `DMACTL` is logged with `(frame,
VCOUNT)`. Tests 1-2 read the segment table and evaluate tone frames only, so
silent gaps are allowed.

| # | Assertion | Fails at HEAD? |
| ---: | --- | --- |
| 1 | frames 1-175 inside `LEADER`/`DATA`: every `AUDC1` write has volume 10; **every `DATA` frame contains `AUDF1` writes of both 5 and 7** (per-bit, not per-frame) | yes — no POKEY writes exist |
| 2 | frames 176-250: over tone frames the volume is non-increasing and is **2** on frame 250 with `AUDF1` still switching; each of the six colour bytes (main-loop writes and DLI-written values) has non-increasing luminance, hue nibble unchanged, **0 on frame 250**, `COLBK` 0 throughout | yes |
| 3 | the exit writes `AUDC1 = 0` **before** `NMIEN`/`DMACTL` are cleared, on the natural and the skip exit; `AUDC1 = 0` at the first frontend frame (native, §8.2) | yes — no such write |
| 4 | `npm test` on the default build (release gate green: no unrecorded failure, `timing_and_dli_passed`), `npm run boot:smoke -- --atari800-source=build/atari800-trace` on XEX and ATR | gate |
| 5 | FIRE pressed at frame 60 (and, separately, SPACE = `SKSTAT` bit 2 low + `KBCODE $21`): the hold ends within 2 frames with `AUDC1 = 0`; then `frontend_input_poll` run with the press still held does not dispatch (`frontend_input_armed = 0`, a source-contract check on `enter_frontend_state`); FIRE held from frame 1: no skip through frame 250. Native: §8.4 | yes — no skip exists |
| 6 | at the second DLI entry, frames 1-175: `COLPF1 = $8A`, `COLPF2 = $80` (JS and the native DLI-entry log) | yes — `$0A / $00` today |

Existing tests changed deliberately: `tests/loader-screen.test.mjs` (§5).
Pre-existing failures (`hybrid-c-arena`, `layout-d1`,
`transport-layout-regression`, …) stay red for their own reasons and are A/B'd
against a clean `944450f` export, as the rules require.

---

## 10. Documentation in the implementation

* `docs/decisions/ADR-003-loader-screen.md` — amendment: the cassette sound
  script, the 75-frame fade, the SPACE/FIRE skip and its exit path, the
  allied-blue ship, the hold unchanged at 250, the blob's boot-only placement.
* `docs/project-overview.md` — glossary note (§6.2 or a new §6.0): **"boot
  splash"** = the ADR-003 screen (formerly "preloader"); **"loader screen"** =
  the between-levels screen of decision O. Docs only; no symbol renames.
* `docs/how-to-play.md` and `docs/how-to-play.pl.md` — Controls: "Space or
  Fire during the boot splash — skip" / "Spacja lub Fire na ekranie startowym —
  pominięcie". Both in the same commit (owner decision V).
* `docs/plan-4.6-placement.md` — Q-4 closed with the measured placement; the
  §8 "Boot splash" row becomes **0 resident B, ~400 B boot-only at
  `$0500-$06FF`**.
* `docs/memory-map.md` — new row `$0500-$06FF` boot-only splash blob; the
  overlay row `$21C1-…` grows; `BOOT_STAGE2` free tail restated (rule 4).
* `docs/STATUS.md` — candidate section, `OWNER-SMOKE CANDIDATE`.

---

## 11. Effort

| Step | ESTIMATE |
| --- | --- |
| Assemble the blob, cfg/build transport, the two copies, `show_loader` trim; measure size, sectors, milestones | ½ session |
| JS test file (§9), loader-screen test rebaseline, JSON assets and generator | ½ session |
| Harness header (§8), `--splash-skip-only`, `--prepare`, evidence regeneration, boot smoke both media | ½-1 session |
| Docs EN/PL, memory map, ADR, overview, Q-4, STATUS | ½ session |
| Owner smoke on a real TV (sound and colour are judged there, not by a test) | owner |

Total ESTIMATE: **2-3 sessions** to `OWNER-SMOKE CANDIDATE`.
