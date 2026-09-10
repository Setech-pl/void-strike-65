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
