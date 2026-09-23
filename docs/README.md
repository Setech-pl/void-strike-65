# Void Strike 65 documentation map

Start here before making a technical or gameplay decision. Current sources of
truth are intentionally separated from evidence and history.

**If you want the whole picture in one place, read
[project-overview.md](project-overview.md) first.** It consolidates the
roadmap, the architecture, the measured memory map, every owner decision in
force, the backlog, the content target and the working method, pinned to a
named HEAD, with every figure labelled MEASURED / EMULATOR-MEASURED / ESTIMATE
and every disagreement between these documents listed explicitly. It is an
entry point, not a new tier of truth: the precedence list below is unchanged,
and once the repo moves past its pinned HEAD the build output wins.

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

## Documentation language

**User-facing documents ship in English and Polish. A change to one is
incomplete until the other carries it.** English is the default; the Polish
version is reached from a switch at the top of the page. Owner decision V
(2026-09-20).

This covers documents written for someone who plays the game or reads about it
— [how-to-play.md](how-to-play.md) / [how-to-play.pl.md](how-to-play.pl.md),
the root README, release notes and anything else addressed to a player.

Engineering documents stay single-language: STATUS, the roadmap, the domain
documents, the memory map, the decision journal and everything under
`diagnostics/`. They have one audience, and translating them would double the
cost of keeping them true. The line follows the audience, not the directory.

## Where to look

| Need | Source |
| --- | --- |
| The whole picture in one document, pinned to a HEAD | [project-overview.md](project-overview.md) |
| Current state, accepted vs candidate, CPU/RAM, current task | [STATUS.md](STATUS.md) |
| Development rules and process | [reguly-projektu.txt](reguly-projektu.txt) |
| What we do next | [plan-realizacji.md](plan-realizacji.md) |
| Task workflows for agents | [agent-workflows/](agent-workflows/) |
| How the game plays, for a player | [how-to-play.md](how-to-play.md) — also [po polsku](how-to-play.pl.md) |
| Player-visible rules | [game-design.md](game-design.md) |
| Runtime layers, flows, pools and contracts | [architecture.md](architecture.md) |
| C/ASM boundary, ABI and placement | [hybrid-c-architecture.md](hybrid-c-architecture.md) |
| Addresses, ranges and sizes for an identified checkpoint | [memory-map.md](memory-map.md) |
| How a level is authored — every JSON field, its range, and what the compiler refuses | [level-authoring.md](level-authoring.md) |
| Why decisions were made | [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md), [decisions/](decisions/) |
| Machine-readable PAL evidence (historical binding) | [runtime-wall-trace.json](runtime-wall-trace.json) |
| Behavioural gate failures the owner has recorded as open (one source of truth for `scripts/build.mjs` and the tripwire test) | [recorded-gate-failures.json](recorded-gate-failures.json) |
| PAL frame-overrun gate (distinct miss events, line-238 margin) | [STATUS.md](STATUS.md), `scripts/pal-timing-audit.mjs` |
| Native capital-shell/player collision evidence | [capital-player-collision-trace.json](capital-player-collision-trace.json) |
| Native menu lifecycle/raster evidence | [menu-raster-trace.json](menu-raster-trace.json) |
| Visual and colour rules | [art-direction.md](art-direction.md) |
| Milestone/release hardware checklist | [hardware-testing.md](hardware-testing.md) |
| Accepted implementation plans, one file per feature set | [plans/](plans/) |
| Proof reports | [diagnostics/](diagnostics/) |
| Archived roadmap, old plan, old rules, old headroom report | [history/](history/) |
| Runtime capture provenance | [media/manifest.json](media/manifest.json) |

Do not promote a historical number into a current document without regenerating
or verifying it against the current build.
