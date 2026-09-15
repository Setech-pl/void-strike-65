# Void Strike 65 documentation map

Start here before making a technical or gameplay decision. Current sources of
truth are intentionally separated from evidence and history.

## Source-of-truth precedence

When sources disagree, the higher entry wins:

1. current local Git, code and build output (`build/manifest.json`,
   `build/void-strike-65.map`, packed artifacts);
2. [STATUS.md](STATUS.md) — what is true now: accepted checkpoint, owner-smoke
   candidates, CPU/RAM baseline, open defects, current task;
3. [reguly-projektu.txt](reguly-projektu.txt) — how the project is developed;
4. [plan-realizacji.md](plan-realizacji.md) — the single active roadmap;
5. current domain documents:
   [game-design.md](game-design.md),
   [architecture.md](architecture.md),
   [hybrid-c-architecture.md](hybrid-c-architecture.md),
   [memory-map.md](memory-map.md);
6. owner decisions — [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md)
   and [decisions/](decisions/);
7. [diagnostics/](diagnostics/) — historical evidence and proofs;
8. [history/](history/) — archived plans, rules and superseded documents.

Newer accepted decisions override older diagnostic or historical text.
Generated build/map measurements override manually copied historical numbers.
A statement labelled **OWNER-SMOKE CANDIDATE** describes committed but not yet
owner-accepted behavior; it never overrides the accepted checkpoint in STATUS.

The root [README](../README.md) is a public showcase, not a technical
specification.

## Where to look

| Need | Source |
| --- | --- |
| Current state, accepted vs candidate, CPU/RAM, current task | [STATUS.md](STATUS.md) |
| Development rules and process | [reguly-projektu.txt](reguly-projektu.txt) |
| What we do next | [plan-realizacji.md](plan-realizacji.md) |
| Task workflows for agents | [agent-workflows/](agent-workflows/) |
| Player-visible rules | [game-design.md](game-design.md) |
| Runtime layers, flows, pools and contracts | [architecture.md](architecture.md) |
| C/ASM boundary, ABI and placement | [hybrid-c-architecture.md](hybrid-c-architecture.md) |
| Addresses, ranges and sizes for an identified checkpoint | [memory-map.md](memory-map.md) |
| Why decisions were made | [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), [decisions/](decisions/) |
| Machine-readable PAL evidence (historical binding) | [runtime-wall-trace.json](runtime-wall-trace.json) |
| Native capital-shell/player collision evidence | [capital-player-collision-trace.json](capital-player-collision-trace.json) |
| Native menu lifecycle/raster evidence | [menu-raster-trace.json](menu-raster-trace.json) |
| Visual and colour rules | [art-direction.md](art-direction.md) |
| Atari800 and real-hardware checklist | [hardware-testing.md](hardware-testing.md) |
| Proof reports | [diagnostics/](diagnostics/) |
| Archived roadmap, old plan, old rules, old headroom report | [history/](history/) |
| Runtime capture provenance | [media/manifest.json](media/manifest.json) |

Do not promote a historical number into a current document without regenerating
or verifying it against the current build.
