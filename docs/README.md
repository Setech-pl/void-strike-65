# Void Strike 65 documentation map

Start here before making a technical or gameplay decision. Current sources of
truth are intentionally separated from historical records.

## Source-of-truth hierarchy

When sources disagree, use this order:

1. current runtime code;
2. runtime tests;
3. current build manifest and linker output;
4. measurements generated from the packed XEX/ATR;
5. current technical documentation;
6. root README and showcase material;
7. historical checkpoints.

The root [README](../README.md) is a public showcase, not the primary technical
specification.

## Where to look

| Need | Current source |
| --- | --- |
| Player-visible rules; implemented versus planned features | [game-design.md](game-design.md) |
| Runtime layers, flows, pools, and technical contracts | [architecture.md](architecture.md) |
| Current addresses, ranges, sizes, and reserves | [memory-map.md](memory-map.md) |
| Current PAL result and measurement method | [runtime-headroom.md](runtime-headroom.md) |
| Machine-readable PAL evidence | [runtime-wall-trace.json](runtime-wall-trace.json) |
| Native capital-shell/player collision evidence | [capital-player-collision-trace.json](capital-player-collision-trace.json) |
| Native menu lifecycle/raster evidence | [menu-raster-trace.json](menu-raster-trace.json) |
| Visual and colour rules | [art-direction.md](art-direction.md) |
| Atari800 and real-hardware checklist | [hardware-testing.md](hardware-testing.md) |
| Current next tasks and future plans | [roadmap.md](roadmap.md) |
| Rendering audit, architectural decision, and implementation gates | [plan-realizacji.md](plan-realizacji.md) |
| Accepted architectural decisions | [decisions/](decisions/) |
| Archived checkpoints, old memory values, and rejected experiments | [history/](history/) |
| Runtime capture provenance | [media/manifest.json](media/manifest.json) |

Generated values must be checked against `build/manifest.json`,
`build/void-strike-65.map`, and the current packed artifacts. Do not promote a
historical number into a current document without regenerating or verifying it.
