# ADR-004: one resident gameplay program

Status: **SUPERSEDED 2026-09-20** by owner decisions 23 §10.1, B and W, and
implemented by roadmap 4.3. The game is still one resident program, but it no
longer reads nothing from disk after takeover: a resident direct-SIO reader
loads a per-level image into `$A600` at the START GAME boundary. The reasoning
below is kept because it names the costs the 4.3 design had to answer - an
overlay format, relocation, cross-module state and safe disk access after
hardware takeover - and the answers are, in order: no overlay (whole sectors
into a fixed page-aligned buffer), no relocation (the buffer is data, not
code), no cross-module state (the read happens with gameplay torn down), and
direct SIO with no OS call for the last one. See
`../plan-4.3-sector-reader.md`.

## Context

ATR media has more storage than a stock 64 KB Atari has runtime RAM. Splitting
the game into mission packages would require an overlay format, relocation,
cross-module state, and safe disk access after hardware takeover. No current
measurement shows that complexity is required.

## Decision

- Keep one resident gameplay program.
- Perform no disk I/O or package loading between normal sectors/levels.
- Keep the title loader as the only loading phase.
- Keep both XEX and ATR self-contained.
- Treat free ATR sectors, boot-payload space, and resident RAM as separate
  budgets.
- Represent levels, enemies, formations, and events as bounded data tables and
  reusable routines.
- Do not build a speculative overlay manager, disk module format, relocation
  system, save-state bridge, or level-loader API.

## Consequences

Normal transitions are RAM state changes, not I/O. All required runtime code,
display memory, charsets, PMG, state, and pools must fit the measured resident
budget. Loader-only memory may be reclaimed only with explicit lifetime
documentation and cold-start tests. ATR size is reported but never used as
proof of RAM or PAL-frame capacity.

Reconsider this ADR only after a measured report shows that sharing,
compression, bounded pools, and reclaimed loader memory cannot fit a concrete
owner-approved requirement without unacceptable timing, readability, or
real-hardware cost.
