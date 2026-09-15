# AGENTS.md — Void Strike 65

## Mission

Build a complete vertical space shooter for a stock Atari 65XE PAL with 64 KB
RAM. This is a hobbyist, non-commercial project. The deliverable must work in
an emulator and on real hardware through SIO2SD.

## Fixed constraints

- Target: Atari 65XE PAL, 64 KB RAM, 6502C.
- Timing target: 50 frames per second.
- Input: joystick in port 1, single fire button.
- Distribution: `void-strike-65.xex` and bootable `void-strike-65.atr`.
- Build hosts: macOS Intel and Windows.
- Code: documented NMOS 6502 instructions only.
- Art direction: military, worn, dark science-fiction with readable ship
  silhouettes, faction colours, markings, UI references, and music motifs.

## Engineering rules

Before starting work, read `docs/reguly-projektu.txt`, `docs/README.md`, and the
task-relevant sources of truth under `docs/`. Follow the source-of-truth map and
the current project process rather than reproducing either one here.

1. Keep changes small, reviewable, and buildable.
2. Validate in proportion to the change. Run the focused tests that cover the
   changed behavior and concrete risks. Reserve full `npm test`, gauntlets, and
   unrelated artifact validation for milestones, releases, or changes that
   affect those paths.
3. Never hand-edit `build/` or `dist/`; they are generated.
4. Update `docs/memory-map.md` whenever a reserved address or memory range changes.
5. Keep visible-frame work deterministic and bounded. Do not force a solution
   beyond realistic cycle or memory budgets, or an acceptable regression risk.
   Separate measurements from estimates, and record approximate worst-case
   cycles for routines added to the main loop or VBI. Before an expensive
   rebuild, present two or three cheaper alternatives, covering the player
   effect, resource cost, limitations, risk, and recommendation.
6. Avoid OS calls after takeover unless the call is explicitly documented and tested with interrupts/display state.
7. Treat emulator success as necessary but not sufficient. Preserve a real-hardware test path and do not rely on emulator-only behavior.
8. Keep source assets, experiment sources, conversion steps, and rebuild
   instructions tracked in Git. Do not commit only generated Atari bytes when
   an editable source can exist.
9. Preserve supplied references and explicit owner decisions faithfully; do
   not silently replace them with an alternative. Owner requirements may
   change in response to hardware constraints. Agree significant gameplay and
   visual changes with the owner; make routine technical decisions
   independently. Prefer compromises that look like intentional game design.
   Project-specific additions must not imply official status, affiliation, or
   endorsement.
10. Do not add dependencies without explaining why the standard library or existing toolchain is insufficient.
11. For a new visual or gameplay idea, first make a small implementation and
    pass its build, memory-boundary, and startup gates. Then provide the XEX for
    owner smoke before broad measurement. After owner acceptance, complete the
    proportional focused tests and representative native PAL measurement
    required by the process.
12. Preserve a working checkpoint. Local checkpoint commits are allowed
    without renewed approval on a separate experimental branch; they do not
    imply owner PASS or production readiness.
13. Every implementation prompt must specify the model and effort, checkpoint,
    scope, prohibitions, verification, stop condition, and commit or rollback
    instructions.

## Definition of done for a change

- assembles and links without warnings;
- XEX validation passes; ATR validation also passes when the increment covers
  that format or its loading path, or prepares a release;
- no overlap with reserved memory ranges;
- input and timing behavior are defined for PAL;
- documentation reflects user-visible or architectural changes;
- code review notes distinguish confirmed bugs from optional improvements.


# SHARED AGENT SESSION PROTOCOL

This repository is worked on interchangeably by Claude Code, OpenAI Codex,
and local coding agents.

The repository is the source of truth. Chat history is not authoritative.

## Session start

Before any implementation task, read:

1. `docs/STATUS.md`
2. `docs/reguly-projektu.txt`
3. `docs/plan-realizacji.md`
4. `docs/architecture.md`
5. `docs/hybrid-c-architecture.md` when relevant
6. the workflow matching the task from `docs/agent-workflows/`
7. the latest diagnostic relevant to the task

Also inspect:

- current Git branch;
- current HEAD;
- `git status --short`;
- recent commits when relevant.

Current local Git state and repository documentation are authoritative over
previous prompts, conversations, summaries, or agent memory.

## Task isolation

Default rule:

one task = one primary result.

Do not start the next roadmap item automatically.

Do not stage, reset, delete, overwrite, or commit unrelated owner changes.

Do not touch `.claude/` unless explicitly requested.

No push, merge, release, or tag without owner approval.

Use Git as the primary rollback mechanism.

## Implementation philosophy

For reversible high-level gameplay work:

implement first on a branch, build, test, owner-smoke, then measure as needed.

Do not replace implementation with long feasibility studies.

For raster, ANTIC, PMG timing, VBI/DLI, backing/restore, placement, and other
hardware-critical changes, proof and measurement may still be required before
production integration.

## Hybrid architecture

C/cc65 owns or should progressively own high-level game logic.

ca65 remains the hardware-critical kernel.

Do not migrate raster-critical or hardware-critical code to C merely for
convenience.

## Session end

If and only if the result becomes an accepted project checkpoint:

- update `docs/STATUS.md`;
- update architecture/roadmap/owner-decision docs when required;
- create a focused local commit when safe;
- report branch, HEAD, XEX SHA-256, CPU/RAM deltas, tests and NEXT TASK.

For BLOCKED / REJECTED / INCONCLUSIVE experiments:

- preserve useful evidence;
- revert rejected production changes;
- do not present the experiment as the accepted baseline;
- update `docs/STATUS.md` only if the blocker itself must become part of
  the official current project state.

Owner smoke is required after gameplay/rendering changes before treating them
as final acceptance.
