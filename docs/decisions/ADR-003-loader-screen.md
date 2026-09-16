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

## Consequences

The loader gives the owner reference enough horizontal definition while keeping
one portable declarative source and deterministic generated output. It adds no
work to the gameplay frame after handoff.
