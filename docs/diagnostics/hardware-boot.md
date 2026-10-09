# Hardware boot — the disk load stops on a red screen (2026-10-09)

`fix/hardware-boot`, Phase A (diagnosis only, no `src/` change). Release
blocker raised by the owner on 2026-10-09: a stock 65XE PAL with an SIO2SD
stops during the disk load. Atari800 reproduces it with its SIO patch off
(`-nopatch`).

**Status: DIAGNOSIS — OWNER DECISION NEEDED.** Figures are MEASURED in Atari800
7.1.2 on the 64 KB machine (`-xl -pal`) unless marked ESTIMATE. Atari800's
drive model is not a real drive, so every real-hardware time below is an
ESTIMATE.

Evidence: [hardware-boot-2026-10-09.json](hardware-boot-2026-10-09.json),
produced by `scripts/sio-boot-repro.mjs` (with `scripts/atari800-sio-diag.h`).

---

## 0. Step 0 record

| Item | Value |
| --- | --- |
| `main` at branch cut | `343d55e` (clean worktree; one worktree, the primary checkout) |
| `dist/void-strike-65.atr` | `70063213c1c765870cd7de91f1e82e6549abf3e7809f406557225431f08a73a1` |
| `dist/void-strike-65-boot.bin` | `8cc7d10a9e30f09eaf85104e0452b83dfd276b5f6de521d800d3b5e08c002d3f` |
| branch | `fix/hardware-boot` |

The owner tested `67d95ed8…` (`main` after S5-1). `main` is now one session
later (S5-2, `70063213…`). §5 shows that every ATR since `e1614e7` fails the
same way.

---

## 1. Root cause

**Stage 2 arms the SIO direction once per chunk instead of once per sector.**
The OS `SIOV` writes its result into `DSTATS`. From a chunk's second sector on,
`DSTATS` holds `$01`, so its direction bits say "no data". `SIOV` then sends the
read command, takes ACK and COMPLETE, and returns success *without reading the
data frame*. The chunk buffer keeps whatever it held before, the chunk's CRC-16
fails, and the code jumps to `boot_stage2_error`: a full red screen, NMIs and
DMA off, a dead loop.

```text
src/main.s
12490 stage2_load_chunk:
        lda #$31 / sta DDEVIC, lda #$01 / sta DUNIT, lda #$52 / sta DCOMND
12497   lda #$40            ; DSTATS bit 6 = receive  <- set ONCE per chunk
12498   sta DSTATS
        lda #$0F / sta DTIMLO, DBYT = $0080, DBUF = $8100, DAUX = the chunk's first sector
12518 stage2_read_sector:
12519   jsr SIOV            ; returns with DSTATS = $01 (the result code)
        tya / bmi -> boot_stage2_error
        DBUF += $80, DAUX += 1
        dec stage2_sector_remaining / bne stage2_read_sector   ; DSTATS still $01
12547   jsr boot_stage2_crc16
12550   cmp (frontend_data_ptr),y   ; the chunk's CRC low byte
12551   STAGE2_FAIL_NE              ; -> boot_stage2_error  <- the failure
12963 boot_stage2_error: sei; NMIEN = 0; DMACTL = 0; COLBK = $34 (red); jmp *
```

**Why every committed run passed.** Atari800's SIO patch (on by default, and
`ENABLE_SIO_PATCH=1` in the host's `~/.atari800.cfg`) replaces `SIOV` with a
host-side handler that executes a read command whatever `DSTATS` says. Every
launch in the repository ran with the patch on (§6), so the stage-2 loop never
ran against register-level SIO. The game's own reader
(`src/hybrid/sector-reader.s`) never calls `SIOV`. It drives POKEY and the PIA
directly and runs the same with the patch on or off. That is why START GAME,
the boss entry and the save were clean in the evidence and are clean under
`-nopatch` as well (§4).

**Why the bug survived review.** The pattern `set DCB once / jsr SIOV in a
loop` is correct for `DSKINV` (`$E453`), which rewrites `DSTATS` from
`DCOMND` on every call. It is wrong for a direct `SIOV` call. The stage-2 code
has called `SIOV` directly since it was written in `e1614e7` (2026-08-28).

### The trace (`-nopatch -nobasic`, `main` ATR)

The SIO events the diagnostic emulator logged (frame `f`, scanline `y`).

```text
SIOV f=492 dstats=40 dbuf=8100 daux=006C        <- a chunk's first sector: correct
L 01 / O 31 52 6C 00 EF / L 00
I 41 (ACK) f=493 y=63   I 43 (COMPLETE) y=95   I 0B A2 03 A5 ... (129-byte data frame)
SIOV f=496 dstats=01 dbuf=8180 daux=006D        <- DSTATS is the previous result
L 01 / O 31 52 6D 00 F0 / L 00
I 41 (ACK) f=496 y=289  I 43 (COMPLETE) f=497 y=9
SIOV f=497 y=12 dstats=01 dbuf=8200 daux=006E   <- SIOV returned without the data
...
STOP red-halt pc=@halt f=567, COLBK=$34, NMIEN=$00
last PCs: boot_stage2_crc16 ... $22A0 lda stage2_crc_lo / $22A5 cmp / $22A9 jmp boot_stage2_error
```

The OS boot itself (sectors 1–107, `DSKINV`-style DCB from the OS) is clean:
107 reads, 0 NAK, 0 ERROR, 0 retries, one sector every 3.8 frames. Stage 2
reads chunk 1 (sectors 108–151, 44 sectors): the first sector gets its data
frame, and 42 of the next 43 commands end at COMPLETE with no data. Then the
CRC fails.

### What the real machine shows, against this model

- **Blue for about 15 s, then red.** The emulator under `-nopatch` shows the
  same blue for 11.3 s (frame 567), then red. The OS boot screen is blue.
  Stage 2 blanks DMA with `COLOR4 = COLOR2`, which keeps it blue. Then
  `boot_stage2_error` paints `$34`. The video's ratio of about 1.3 is within
  what a real drive adds (ESTIMATE).
- **The red is the stage-2 halt.** `boot_stage2_error` (`src/main.s:12963`) is
  the only code that writes a red `COLBK` during boot or loading. The other
  boot and loading `COLBK` writes are `$00`: the splash
  (`src/boot-splash.s:113,154`), the loader title (`LOADER_TITLE_COLBK`),
  the reader's interim and failure screens (`sector-reader.s:371`, black with
  text) and the summary (`level-summary.s:284`). The red is described exactly
  by the halt: whole screen, no further SIO command, nothing moves.
- **The OS boot completed on the real machine.** `boot_stage2_error` is
  reachable only after the OS has loaded all 107 boot sectors and jumped to
  `boot_entry`. A failure in the OS boot phase shows the OS's own `BOOT ERROR`
  and retries forever. It never shows red.
- **The SIO2SD display (`$001`, `$005`, `$008`, `$009`, 1.2–1.7 s apart) is
  not explained.** The machine must have read sectors 1–107 before the red,
  so the display cannot have been showing every sector it served. A likely
  reading (ESTIMATE): the slow sector advance is stage 2's no-data reads. On a
  real device the drive still sends its 68-ms data frame after COMPLETE. The
  next command goes out while that frame is still on the wire, the drive can
  miss it, and the OS times out and retries. The emulator's drive model
  aborts on the command line and never shows this. Owner question Q6.

---

## 2. The boot path

| Step | Where | What | Sectors | On a timeout / NAK / ERROR / bad checksum |
| --- | --- | --- | --- | --- |
| OS boot | OS ROM | Sector 1 to `$0400`; header `00 6B 0020 21BA`: flags 0, **107 sectors**, load `$2000`, init `$21BA`. The OS reads sectors 2–107 to `$2000-$557F` before it runs any game code. The header asks for exactly what the OS reads. | 1–107 | OS `SIOV` retries (13 command retries, 2 device tries), then `BOOT ERROR` and a new boot attempt. MEASURED clean under `-nopatch`. |
| Boot init | `src/main.s:1577` `boot_return` | The `DOSINI` vector; `rts`. | — | — |
| Boot continuation | `src/main.s:1209` `boot_entry` (`$2006`) | `jsr boot_stage2_atr_entry`, `MEMLO`/`APPMHI` = `$3B00`, `DOSVEC` = `start`, then `jmp start` (owner decision A: never returns to the OS). | — | — |
| Stage 2 entry | `src/main.s:12457` | `disable_basic_rom` (`PORTB` bit 1, `BASICF`); `copy_boot_splash_blob` (`$0500-$06FF`); `SDMCTL = 0`, `COLOR4 = COLOR2` (blue, DMA off at the next VBI); manifest validated (`boot_stage2_validate_manifest`, `:12659`). OS VBI and IRQs stay live. `I` is clear and `NMIEN = $40` at every `SIOV` (MEASURED). | — | Manifest CRC or field error → `boot_stage2_error` (red). |
| Stage 2 chunks | `src/main.s:12490-12620` | Per chunk: the DCB once (`DSTATS = $40` **once — the defect**), then `jsr SIOV` per sector into `$8100+`; CRC-16 over the chunk (`:12547`); LZ unpack or raw copy to the destination, end checked. Then `boot_chunk_ready = 2`. | 108–213 (106) | `SIOV` status negative (`tya / bmi`) → red. CRC mismatch → red. Unpack end mismatch → red. No retry of its own beyond `SIOV`'s. |
| Takeover | `src/main.s:1242` `start` | `sei`; `NMIEN = 0`, `DMACTL = 0`, `AUDCTL = 0`; boot streams unpacked; the resident suffix replaces stage 2 at `$21C1`; `show_loader` (`:1288`, the splash), then the menu. **No OS call after this point.** | — | `boot_chunk_ready ≠ 2` → red (`:1262`). |
| START GAME, level / overlay reads, boss entry | `src/hybrid/sector-reader.s` | The game's own polled direct-SIO reader (§3.2): `sei` for the life of the runtime, `NMIEN = 0` during the read, no OS. | Directory runs (e.g. the level at 320+, the record at 599) | Wire class (NAK, bad checksum, framing or overrun, missing byte): settle 2 frames, retry, 3 attempts a sector. Silence (no ACK): settle and retry, 2 probes per load. ERROR: no retry. Every failure → `DISK READ FAILED` screen (black, text, FIRE returns to the menu). Never red. |
| Save write | `src/hybrid/level-summary.s:669` | Direct-SIO `P` to sector 599, after the own-disk check. | 598 (read), 599 | One attempt. Any refusal is silent and the RAM copy is kept. |

Everything above the takeover runs through the OS `SIOV`. That part is what
the patch short-circuits and what the real machine exposes. Everything below
it is register-level and runs identically in both emulator modes.

---

## 3. The disk code against the protocol and the hardware

### 3.1 Stage 2 (OS `SIOV`) against the OS's own use

| # | Deviation | Real device | Atari800 `-nopatch` |
| --- | --- | --- | --- |
| **D1** | **`DSTATS` set once per chunk; `SIOV` overwrites it with the status (`$01`)** (`src/main.s:12497-12498` vs the loop at `:12518`). | From each chunk's 2nd sector: a no-data command; the drive's data frame is left on the wire and collides with the next command (likely timeouts and retries); the buffer is never filled; red at the chunk CRC, or earlier if `SIOV` returns an error. **The failure.** | 42 COMPLETEs without a data frame, CRC mismatch, red at frame 567 (`-nobasic`) / 558 (`-basic`). |
| D2 | `SIOV` called directly instead of `DSKINV`, which would derive `DSTATS` from `DCOMND` on every call. | Harmless once D1 is fixed. | — |
| D3 | `DTIMLO = $0F` (15 × 64 VBIs ≈ 19 s) against the OS boot's `$07`. | Only lengthens the wait on a dead drive. | — |
| D4 | A stage-2 failure is a silent red halt, with no reason and no retry beyond `SIOV`'s. | Any hardware fault in the extension load looks exactly like this bug. | — |
| — | `DDEVIC $31`/`DUNIT 1`/`DCOMND $52`/`DBYT $0080`/`DBUF` per sector/`DAUX` per sector; `I` clear, `NMIEN $40`, `CRITIC 0`, `POKMSK $C0` at entry; POKEY untouched before `start` (the splash and the music run only after `start`). | Correct. | MEASURED in the trace. |

### 3.2 The game's direct reader (`src/hybrid/sector-reader.s`) against the HRM

The reader was written from the Altirra Hardware Reference Manual
([sio-protocol-facts.md](sio-protocol-facts.md)). Under `-nopatch` it reads
START GAME's 35 sectors with no retry (§4), the same as with the patch. Atari800
models no command-line hold, no drive latency and no jitter, so the rows below
are checked against the protocol, not measured.

| # | Item | Verdict |
| --- | --- | --- |
| R1 | Baud: `AUDCTL = $28`, `AUDF3/4 = $0028`, `AUDC3/4 = $A0` (`:1046`). | Matches the OS and the HRM (19040 baud). |
| R2 | `SKCTL $00` reset → `$23` transmit → `$33` async receive → `$13` at rest; `SKRES` after every byte. | Matches the HRM. The OS receives in `$13`, also async, so the two are equivalent. |
| R3 | Command line `PBCTL $34`/`$3C`; 16 `WSYNC` (≈1028 µs) before the frame, 12 (707–771 µs) after `XMTDONE`. | Inside the HRM windows (750–1600 / 650–950 µs). |
| R4 | Polled with `I` set, `NMIEN = 0`, `IRQEN` re-armed after each byte; ready-before-complete on transmit. | Matches the HRM's polled-operation rules. |
| R5 | Budgets: ACK 3 frames (≥40 ms vs a 16-ms deadline), COMPLETE 200 (4 s), 2 frames a data byte. | Adequate. |
| R6 | Music tick inside the wait: worst 336 cycles against a 931-cycle byte period. | Adequate. MEASURED clean in the emulator. |
| **R7** | **`BUDGET_SETTLE = 2` frames after a failed attempt** (`:146`, `:1076`), but a 129-byte data frame lasts 3.4 frames. After a mid-frame wire error, the retry's command can go out while the drive is still transmitting. A busy drive misses it, the silence is classed as no device, and it costs one of the load's only **2** device probes (`:162`). Two such events in one load → `DISK READ FAILED / NO DRIVE`. | **Hardening, recommended:** settle 5 frames, 0 B. Runs only on the retry path. |
| R8 | 3 wire attempts a sector (the OS allows 13 × 2). | Adequate on SIO2SD; a marginal-cable lever (0 B). Not recommended now. |
| R9 | Save write: data frame 188 lines (≈12.1 ms) after the ACK, one attempt, a silent refusal. | Inside the cited 10–18 ms window. |

Nothing in the game relies on the drive answering instantly. The tightest
assumption is R7.

---

## 4. Reproduction

```text
node scripts/sio-boot-repro.mjs [--start-game] [--atr=...] [--probe=dstats] [--labels=none]
```

The script copies `build/atari800-trace` to `build/atari800-sio-diag` and
swaps in `scripts/atari800-sio-diag.h`, which logs every `SIOV` entry with its
DCB, the command line and every SIO byte in both directions, and stops on a
red halt, a label or a frame budget. The wall-trace emulator is not touched.
Each ATR boots with the patch on and off, BASIC off and on. The script **exits
1 when a `-nopatch` boot does not reach the menu** (or `main_loop` with
`--start-game`). On `main` it fails today.

| Run (`main` `70063213…`) | Ends | Sectors read | No-data COMPLETEs | Menu | Gameplay |
| --- | --- | --- | --- | --- | --- |
| patch, `-nobasic` | `main_loop` f906 | 35 (register level) | 0 | f553 | f906 |
| patch, `-basic` | `main_loop` f897 | 35 | 0 | f544 | f897 |
| **`-nopatch`, `-nobasic`** | **red halt f567** | 151 | **42** | — | — |
| **`-nopatch`, `-basic`** | **red halt f558** | 151 | **42** | — | — |

`--probe=dstats` builds the proposed fix as a probe ATR: a byte-neutral move of
the `DSTATS` store to the head of the per-sector loop. It is written to
`build/sio-boot-repro-probe/`, never `dist/`. That probe passes:

| Run (probe) | Ends | Sectors | NAK / ERR / retries | Loader | Menu | Level read | Gameplay |
| --- | --- | --- | --- | --- | --- | --- | --- |
| patch, `-nobasic` | `main_loop` | 35 | 0 / 0 / 0 | f296 | f553 | f689 | f906 |
| patch, `-basic` | `main_loop` | 35 | 0 / 0 / 0 | f287 | f544 | f680 | f897 |
| `-nopatch`, `-nobasic` | `main_loop` | 248 | 0 / 0 / 0 | f1094 | **f1351** | f1487 | f1704 |
| `-nopatch`, `-basic` | `main_loop` | 248 | 0 / 0 / 0 | f1085 | **f1342** | f1478 | f1695 |

Both BASIC states boot without OPTION. `-nobasic` is OPTION held at power-on
(Atari800 holds it only at the cold start). BASIC on shortens the OS cold
start by 9 frames (first `SIOV` f68 vs f77); from there on the two boots are
frame-identical (MEASURED). From the menu on, the frame deltas are identical
with the patch on and off (menu → level read 136, → gameplay 353 with the
script's FIRE cadence). This confirms that the game's own reader is unaffected
by the patch.

The real boot smoke also fails under `-nopatch`. A throwaway local copy of
`runtime-wall-trace.mjs` (deleted, not committed) added `-nopatch` to the
boot-smoke launches. Its first session failed after 8.3 s with
`atr-a5: slot F written after start-up: copy_hud_charset never wrote slot F`,
an indirect symptom: the harness has no clause that names the stage-2 halt.

---

## 5. History

The ATRs were committed in `dist/` until the release era, so each one boots
straight from Git (`build/sio-boot-history/`, `--labels=none`, 3000 frames).

| Build | Boot | `-nopatch -nobasic` |
| --- | --- | --- |
| `v0.1.1` (`2ef7c6e`, 2026-08-06) | OS boot only, 19 sectors | **boots**; same PC as the patched run at f3000 |
| `921b3c8` (last before the loader) | OS boot only, 128 sectors | **boots**; the menu on screen at f3000 |
| `e1614e7` (2026-08-28, "add multi-chunk payload loader") | 94 + stage-2 chunks | **red halt f535**, 42 no-data COMPLETEs |
| `v0.1.0`, `v0.2.0`, `v0.2.1`, `v0.2.2` | 107 + stage 2 | **red halt f567**, 42 no-data COMPLETEs |

**Result:** the game booted against real SIO until `921b3c8`. `e1614e7`
introduced the stage-2 `SIOV` loop with the `DSTATS`-once DCB, and no ATR has
booted without the patch since. A bisect is unnecessary: the defect is in the
first commit that has the loop, and its predecessor boots. `-basic` on the two
pre-loader builds reaches BASIC (their boot ended in `rts`; owner decision A
fixed that later), as expected.

The likely reason nobody saw it on hardware (INFERENCE, owner to confirm, Q6):
before the ATR-only decision of 2026-09-30, hardware smokes ran the XEX. Its
entry, `boot_stage2_xex_entry`, carried every chunk in the file and skipped
the `SIOV` loop entirely.

---

## 6. Evidence coverage

Every Atari800 launch in the repository runs with the SIO patch on. No launch
passes `-nopatch`, and no committed report records one (`git log --all
-S nopatch` is empty before this branch):

| Launcher | Runs | Patch |
| --- | --- | --- |
| `scripts/runtime-wall-trace.mjs` replays (`emulator.model_arguments`) | 57+ trace replays | on |
| `runtime-wall-trace.mjs --boot-smoke-only` | 4 cold + RESET + forced restore + 130XE | on |
| menu raster (`docs/menu-raster-trace.json`) | 4 fills | on |
| `scripts/artifact-launch.mjs` (`npm run play:atr`) | the owner's play copy | on |
| `scripts/capacity-window-watch.mjs` | watch runs | on |
| Setech Arcade (browser, atari800 core) | plays `v0.2.2` | on, necessarily: `v0.2.2` cannot boot without it |

Two consequences beyond this bug:

- **The patch-on state depends on the host.** Atari800 has `-nopatch` but no
  flag that forces the patch on. Launches without the flag take
  `ENABLE_SIO_PATCH` from `~/.atari800.cfg` (1 on this host). A host with 0
  would have produced different evidence.
- **The boot timings are emulator-patch timings.** `boot-deadline-baseline.json`
  (`atr_menu_frames` 596, the "0 frames slack" rows) measures the OS phase with
  the patch's instant `SIOV`. Under `-nopatch` the same boot reaches the menu
  798 frames later (§4).

**Run-time cost of `-nopatch`:**

- **Per cold boot:** +798 emulated frames (MEASURED: menu f553 → f1351), all
  of it wire time in the OS and stage-2 phases. After takeover the cost is 0.
- **Boot smoke:** 50.8 s on this host for 7 sessions, about 2.1 ms per frame
  (MEASURED). At +798 frames that is about +1.7 s a session and about +12 s
  (+24 %) for the suite (ESTIMATE).
- **Diagnostic emulator:** 0.3–0.6 s a run either way (MEASURED).
- **Trace replays:** about +1.7 s each (ESTIMATE). Every replay's frame
  numbers would also shift by about 800, which would move every frame-keyed
  fixture.

---

## 7. Proposed fix and its cost

**F1, the fix:** move `lda #$40 / sta DSTATS` from `stage2_load_chunk` to the
head of `stage2_read_sector`, before `jsr SIOV`. The `bne` back to the loop
then targets the store.

| Segment / budget | Change |
| --- | --- |
| `BOOT_STAGE2` (raw in the initial block) | **0 B** (5 B move inside the segment; nothing after `stage2_read_sector`'s loop moves, `boot_stage2_crc16` stays at `$25CE`) |
| Initial block | **0 B**: 34 B to the 13,652-B STOP, unchanged |
| Boot sectors / extension / total | 107 / unchanged / unchanged; **no new boot sector** |
| Resident, window, slots, `$0500` | 0 B |
| CPU | +6 cycles a stage-2 sector, boot only (≈ 640 cycles a boot) |
| Patched trace | boot frames expected unchanged (to be confirmed by the evidence regeneration) |

The probe in §4 is exactly F1 applied to the `main` ATR. It boots to gameplay
under `-nopatch` with BASIC on and off.

**Optional, owner decision:**

- **H1, R7:** `BUDGET_SETTLE` 2 → 5. 0 B (an immediate). Runs only on the
  reader's retry path, which the emulator never exercises. Recommended.
- **H2, D4:** a stage-2 failure that says which step failed. It costs initial
  block (`BOOT_STAGE2` is raw in it; 34 B left). Not recommended now: with F1
  and the `-nopatch` boot smoke, a red halt on hardware means a real wire or
  media fault.

---

## 8. Expected real load times

MEASURED is Atari800 `-nopatch` (its drive model: ACK after 44 lines, bytes
every 8 lines, no rotation). ESTIMATE scales it by 1.0–1.35 for an SIO2SD; the
upper end comes from the owner's video (15 s to red vs 11.3 s emulated, one
data point). Atari800 has no 1050 model, and no 1050 figure has been measured
anywhere.

| Interval | Emulator `-nopatch` (MEASURED) | SIO2SD (ESTIMATE) | 1050-class (ESTIMATE) |
| --- | --- | --- | --- |
| Power-on → loader splash | 1094 f = **21.9 s** | 22–30 s | 30–45 s |
| Power-on → main menu | 1351 f = **27.0 s** (patch: 11.1 s) | **27–36 s** | 40–55 s |
| START GAME → level read done | ≈ 35 sectors at 3.7 f ≈ 2.6 s, hidden behind the summary's 3-s minimum | 2.6–3.5 s | 4–6 s |
| Boss entry (48–66 sectors) | 245–252 f ≈ 5 s (S5 plan, already register-level) | 5–7 s | 8–12 s |

Where the boot time goes (MEASURED): the OS phase reads 107 sectors at 3.8
frames each (409 frames). Stage 2 reads 106 sectors at 3.7 frames each (395
frames). Chunk CRCs and unpacking take about 145 frames, and splash to menu 257
frames. A faster boot means fewer standard-speed sectors or a fast loader. The
M5 plan already lists the fast loader as an optional later session.

---

## 9. Proposed evidence from now on

- **E1, recommended.** The boot smoke runs every cold session with
  `-nopatch`: 4 fills × BASIC, RESET, forced restore and 130XE. Those are the
  only paths that use the OS `SIOV`, and the real machine always runs them
  without the patch.
  - The observer's fixed frames (menu 3050, gameplay 3400) still fit (menu
    about f1351).
  - `boot-deadline-baseline.json` is re-recorded in the same commit (loader
    and menu about +798) and the absolute 3000-frame ceiling stays.
  - Add a direct clause: `boot_stage2_error` never executed, and every stage-2
    `SIOV` read carries `DSTATS` bit 6 and is followed by its data frame.
- **E2.** The trace replays, the menu raster and the capacity watch stay
  patch-on. They measure gameplay and the menu raster, the reader is
  register-level either way, and `-nopatch` would shift every frame-keyed
  fixture by about 800 frames. Each report records `sio_patch: true`, and the
  launch pins it rather than inheriting `~/.atari800.cfg`. Phase B checks
  whether a generated `-config` file keeps the ROM discovery; otherwise the
  harness reads the host's `ENABLE_SIO_PATCH` and refuses 0.
- **E3, recommended.** `npm run play:atr` defaults to `-nopatch`, so the
  owner's emulator play loads like the hardware. An explicit `--fast` keeps
  the patch.
- **E4, the guard test** (`tests/sio-patch-policy.test.mjs`):
  - `scripts/atari800-machine.mjs` exports the SIO mode, e.g.
    `REAL_SIO = "-nopatch"`, and no other script or test spells `-nopatch`.
  - Every boot-smoke definition and `play:atr --dry-run` include it.
  - The committed `runtime-wall-trace.json` `boot_smoke` sessions' launch
    arguments include it, and the report says `sio_patch: false` for them.
  - The replays' report states its SIO mode.
  - A launcher that drops `-nopatch` where it must be on fails the test.
- **E5.** `node scripts/sio-boot-repro.mjs --start-game` becomes a focused
  test on the default build (about 3 s: four boots, two of them `-nopatch`). It
  covers the OS phase, stage 2, START GAME and the reader.
- **E6.** On hardware, `hardware-testing.md` §10 gets the stopwatch rows of §8
  and the both-OPTION-states boot from SIO2SD, plus a real 1050 if available.

---

## 10. Owner questions

- **Q1.** Approve F1 (the byte-neutral `DSTATS` move, 0 B everywhere) as the
  fix in Phase B, with the evidence regeneration it requires (the ATR changes).
- **Q2.** The evidence change: E1 + E3 + E4 + E5 as recommended, replays
  patch-on with a recorded and pinned mode (E2)? Or should more sessions run
  `-nopatch`?
- **Q3.** H1 (`BUDGET_SETTLE` 2 → 5, 0 B) in the same branch? H2 (a worded
  stage-2 error) no?
- **Q4.** Is about 27 s emulated / about 30–36 s on SIO2SD from power-on to
  the menu acceptable for `v0.3.0`? Or should the fast loader move up?
- **Q5.** Every published ATR (`v0.1.0` … `v0.2.2`) fails on real hardware
  with standard SIO. Setech Arcade plays `v0.2.2` only because its emulator
  patches SIO. A hotfix release from `v0.2.2` + F1, a note on the releases
  page, or nothing until `v0.3.0`? No release without your approval.
- **Q6.** On hardware: did the smokes up to 2026-09-29 run the XEX? Can the
  SIO2SD display readings be re-checked with the F1 candidate, power-on with
  and without OPTION?
