# ADR-003: mixed ANTIC F/E bitmap loader

Status: accepted

## Context

The owner reference `assets/graphics/loader.png` contains a large title, a long
capital-ship profile, three engine groups, and a green studio footer. The first
tile-based adaptation could not preserve enough horizontal
detail. XEX, ATR, Atari800, and a stock PAL 65XE need one deterministic path.

## Decision

- Lines 0-163 use 320-pixel ANTIC F; lines 164-191 use 160-pixel ANTIC E. Both
  consume 40 bytes per row.
- `loader-bitmap.json` is the editable source. The build rasterizes exactly
  7,680 bytes and packs it with bounded LZ-10/5; the current packed size is in
  `build/manifest.json`.
- Two DLIs change palette registers at the title/ship and ship/footer zones.
- PMG DMA remains off. The image is shown for 250 complete PAL frames, then the
  runtime disables loader DMA/NMI and builds frontend/gameplay memory.

## Memory lifetime

The packed bitmap stream, its transport padding and the separately packed
display-list source overlap by design: the display list expands only after the
bitmap source it overlaps has been consumed. A second LMS partway down the
image prevents any 40-byte line from crossing a 4 KiB boundary. After the
loader, only the PMG DMA pages are cleared; resident data below them is
preserved.

Exact addresses, packed sizes and staging ranges change with every relayout and
are therefore **not** duplicated here. The authoritative snapshot is
[../memory-map.md](../memory-map.md), regenerated from `build/void-strike-65.map`
and `build/manifest.json`.

## Amendment, 2026-09-22: sound, fade, skip and the allied-blue ship

Owner-priority addition. **The hold does not change: it is still 250 complete
PAL frames and still does no I/O.** Inside those frames:

- **Sound.** POKEY channel 1 imitates a standard 600-baud Atari cassette load.
  312 PAL scanlines over 12 bit cells of 26 lines each is exactly 600 baud, so
  the tone switches **per bit**, aligned to VCOUNT, not per frame. A cell is a
  mark (`AUDF1 = 5`, ~5.3 kHz) or a space (`AUDF1 = 7`, ~4.0 kHz) at
  `AUDC1 = $A0 | volume`; bytes are framed start-0, eight data bits LSB first,
  stop-1, and each imitated record opens with two `$55` sync bytes.
  `assets/audio/boot-splash.json` is the editable source: a segment script of
  `SILENCE` / `LEADER` / `DATA` runs whose frames sum to the hold. The owner
  retunes by ear by editing that file and rebuilding — no code change.
- **Fade.** Over the last 75 frames a single fraction scales both the volume
  (10 down to 2 on frame 250, never to silence — the deck is cut, not faded
  out) and the luminance of every splash colour including the two DLI zones.
  Hues are kept; luminance reaches 0 on frame 250, so the screen is black with
  its hues intact when the teardown runs. The faded bytes are computed once per
  frame into RAM and the DLI loads them from there instead of carrying
  immediates, which raises its worst-case bound from 160 to 164 cycles.
- **Skip.** SPACE or FIRE ends the hold within the frame the press is seen.
  Both are read from hardware (`TRIG0`, and `SKSTAT` bit 2 with `KBCODE`),
  because the OS VBI and keyboard IRQ are both off after takeover. Edge, not
  level: an input held from frame 1 never arms and never skips. The skip takes
  the same exit path as frame 250 — `AUDC1` cleared, colours blacked, then
  `NMIEN`/`DMACTL` — and then waits for both inputs to be released, so the press
  cannot reach the menu as a START GAME.
- **Ship colour.** The capital-ship profile is allied blue: hue `$8`, the hue of
  the gameplay line ship, through `COLPF2 = $80` with luminance from
  `COLPF1 = $8A`. Changed at the source in `loader-bitmap.json`; the bitmap
  bytes and the packed size are unchanged.

**Placement.** No boot-only home inside `$2000-$9FFF` survives to the hold:
every byte there is written between `start` and `show_loader`, or is live
runtime, or is the displayed bitmap. Owner decision (2026-09-22): the code
travels at the tail of the initial block and **both** stage-2 entries copy it to
`$0500-$06FF` immediately after `disable_basic_rom` — ahead of the first SIO
read on the ATR and of `jmp start` on the XEX. It is 512 B of boot-only RAM and
**zero resident bytes**. Moving the hold loop and `loader_dli` out of MAIN freed exactly **56 B** of CODE. That slack is deliberately held as padding (`LOADER_SPLASH_CODE_SLACK`) rather than closed: letting it close slides every later CODE and RODATA address 56 bytes down, which changes which indexed reads cross a page and cost the heaviest gameplay frame 17 cycles (MEASURED 31,200 → 31,217, worst fence margin 1,985 → 1,959) for no gain. Pinned, CODE is `$117E` and RODATA starts at `$317E` exactly as before, and `build/broadside-runtime.bin` and `build/entity-code-runtime.bin` come out **byte-identical** to the previous build — only the loader area of the resident image differs (81 bytes). The 56 B stay available to whatever needs them next, against a re-measured baseline. `show_loader` keeps its label, its display-list, `PRIOR`, palette
and `VDSLST` setup and its `NMIEN`/`DMACTL` start, then jumps into the blob,
whose exit returns to `show_loader`'s caller.

The boot smoke checksums `$0500-$06FF` at `start` and the blob's immutable
tables and code again at both loader milestones, so the chunk load and the
resident unpack that sit between them are proved not to have written there.

**Cost.** The initial block grows by 512 B, four ATR sectors. MEASURED: ATR
loader 339 -> 343 and menu 596 -> 600 frames, XEX unmoved at 135/392, inside the
+10 warn band of `docs/boot-deadline-baseline.json`, which is **not**
re-recorded. The opt-in initial-block ceiling in `scripts/chunk-loader.mjs` was
raised 105 -> 107 sectors to admit them.

## Consequences

The loader gives the owner reference enough horizontal definition while keeping
one portable declarative source and deterministic generated output. It adds no
work to the gameplay frame after handoff.
