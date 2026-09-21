# AGENTS.md — Void Strike 65

Provider-neutral execution contract for Claude Code, OpenAI Codex and local
coding agents. It defines **how agents work**, not what is currently true. The
repository is the source of truth; chat history, previous prompts and agent
memory are not authoritative.

---

## Mission

Complete a playable vertical space shooter for a stock Atari 65XE PAL.

A hobbyist, non-commercial project. Development time and feature velocity are
project resources alongside CPU cycles and RAM; architecture exists to support
a playable game.

## Hard platform constraints

* Atari 65XE PAL, 64 KB RAM, NMOS 6502C, documented instructions only.
* 50 frames per second. Target `31,200` cycles; hard gate `32,568`; physical
  PAL frame `35,568`. Do not confuse these three.
* Input: joystick port 1, single fire button.
* Distribution: `void-strike-65.xex` and bootable `void-strike-65.atr`.
* Build hosts: macOS Apple Silicon, macOS Intel where supported, Windows.
* Must run in Atari800 and on real hardware through SIO2SD.
* Art direction: military, worn, dark science fiction; readable silhouettes;
  consistent faction colours and markings; coherent UI and music motifs.

---

## Source of truth

`docs/README.md` owns the precedence list and the map of what each document is
for. Do not restate either here or in any other document.

When a genuine contradiction cannot be resolved from current code, `STATUS.md`
and accepted owner decisions, report `OWNER_DECISION_REQUIRED` and stop. Do not
guess.

---

## Session start

Mandatory at every new session or task boundary:

```text
git branch --show-current
git rev-parse --short HEAD
git status --short
```

then `docs/STATUS.md`.

After that read **only** the documents the task actually needs, selected from
the map in `docs/README.md`. A task does not have to reload rules, roadmap and
architecture to change one behaviour. Do not reload unchanged documentation
repeatedly inside one session.

---

## Working with the owner

Owner instructions may be short. Derive routine implementation detail from
repository state and documented rules; do not ask for routine technical choices.

Ask only when an undocumented choice would materially change gameplay,
architecture, visual direction, resource trade-offs or accepted scope. Prefer
one concise grouped question over several interruptions.

Preserve explicit owner decisions faithfully. Do not silently replace an owner
decision with an agent-preferred design. Owner requirements are adaptive to
Atari hardware limits: when the original requirement is too expensive, prefer a
cheaper compromise that looks like intentional game design.

Only the owner promotes a gameplay or rendering feature from `OWNER-SMOKE
CANDIDATE` to `OWNER-ACCEPTED`. `DEFERRED` work is not implemented unless
explicitly requested.

Project additions must not imply official status, affiliation or endorsement.

---

## Architecture invariants

Owner-fixed. Do not reopen without an explicit owner decision.

### Enemy classes

PMG players `P1`/`P2` belong to the **Heavy** enemy class and are never
allocated to a Light-class enemy. **Light**-class enemies use the character
renderer and allocate no PMG player. Light capacity grows incrementally
(`1 -> 2 -> up to 4` slots) toward `2 Heavy + up to 4 Light` active threats. Do
not implement the final capacity before a task requires it.

A new enemy type should be `EnemyArchetype data + small C behaviour handler +
existing renderer class`. It should not require a Director redesign, new PMG
allocation, new collision architecture or new renderer architecture unless
measurement proves the existing design cannot support it. If a normal archetype
does require a kernel redesign, treat that as evidence the architectural
boundary needs review.

### C / ASM ownership

ca65 is the hardware-critical kernel. C/cc65 progressively owns high-level
gameplay logic.

**C/cc65 owns by default:** EnemyArchetype data; archetype selection;
lifecycle and state machines; AI decisions; movement policy; fire policy and
cadence; HP and damage policy; score; admission and recycle; waves and
progression; boss and gameplay state.

**ASM/ca65 owns by default:** VBI/DLI/ANTIC; PMG; character publication;
glyph and screen-memory writes; backing/restore; PairShot publication; hot
collision detection and execution; raster-critical timing; hardware and audio
writes; the ABI veneers required to execute C decisions.

> If a new gameplay behaviour can be expressed as a decision or a state
> transition, it belongs in C by default.

ASM consumes that decision and performs the hardware-sensitive execution and
publication. Do not implement new enemy AI, lifecycle, movement policy or fire
cadence in ASM merely because the renderer is written in ASM. Equally, do not
migrate raster- or hardware-critical code into C for convenience.

The detailed boundary, ABI and placement contract is
`docs/hybrid-c-architecture.md`.

---

## Engineering rules

1. Keep changes small, reviewable and buildable.
2. One task produces one primary result.
3. Never hand-edit generated artifacts under `build/` or `dist/`.
4. Update `docs/memory-map.md` whenever a reserved address, segment or range
   changes.
5. Visible-frame work must be deterministic and bounded.
6. Separate MEASURED from ESTIMATE. Do not declare something impossible
   without evidence.
7. Record approximate worst-case cycle cost for new main-loop, VBI, DLI or
   other raster-critical work.
8. At a significant hardware or resource blocker, present 2-3 compliant
   alternatives first — player-visible effect, RAM/code cost, CPU/raster cost,
   limitations, risk. If none fits, return `BLOCKED_<REASON>` with the exact
   byte or cycle requirement.
9. Do not propose solutions that violate architecture invariants merely
   because they are easy.
10. No OS calls after takeover unless explicitly documented and tested against
    the active interrupt and display state.
11. Emulator success is necessary but not sufficient. Maintain a real-hardware
    path; do not depend on emulator-only behaviour.
12. Track editable source assets, conversion steps and rebuild instructions in
    Git. Do not commit only generated Atari bytes when a source can exist.
13. Do not add dependencies unless the existing toolchain is demonstrably
    insufficient.
14. Do not opportunistically refactor unrelated code inside a bounded task.
15. Git is the primary rollback mechanism.
16. User-facing documents ship in English and Polish (owner decision V). A
    change to one is incomplete until the other carries it. Engineering
    documents stay single-language. `docs/README.md` §"Documentation language"
    holds the rule.

---

## Implementation process

**Reversible high-level gameplay work** (C archetypes, AI, waves, rules):

```text
implement -> focused tests -> build -> memory/startup gates
-> short representative PAL/native verification -> owner smoke -> accept or roll back
```

Do not replace ordinary implementation with a long feasibility study. Moderate
CPU/RAM overhead is acceptable when PAL gates stay safe and maintainability
improves materially.

**Hardware-critical work** — raster, ANTIC, PMG timing, VBI/DLI,
backing/restore, placement/transport, hot collision paths — may require proof
and measurement before production integration.

### Proportional validation

Validate in proportion to the change. Use focused tests for the changed
behaviour and its concrete regression risks. Reserve full `npm test`, long
gauntlets and broad artifact validation for milestones, releases, changes that
touch those paths, or a suspected broad regression. Do not run expensive
validation automatically after every small C gameplay change.

Inspect the current `package.json` scripts and repository scripts before
invoking build or test helpers. Do not invent commands from memory.

**The default target is the one that counts.** `npm run build:candidate`
defers the runtime-evidence binding and reports "runtime evidence pending";
`npm test` builds the default target, which refuses to link against evidence
that no longer binds to the artifacts the tree produces. A session that only
ever ran `--candidate` and focused test files cannot see that gate at all —
that is how the committed evidence went stale across 175 commits
(`d72dd6a..4d12d6e`). So:

* a session that changed anything the runtime evidence covers runs `npm test`
  on the **default** build before reporting its gates, not `--candidate`
  alone;
* `tests/runtime-evidence-binding.test.mjs` is the cheap standalone check —
  it compares `docs/runtime-wall-trace.json` against `dist/` in milliseconds.
  Include it in any focused set. When it goes red the evidence owes a
  regeneration pass (`build:candidate` -> `runtime:wall-trace` -> `build`);
  never hand-edit the SHAs in `docs/runtime-wall-trace.json`.

`npm run boot:smoke` and `npm run runtime:wall-trace` need an Atari800 source
tree. Pass the in-repo copy — `--atari800-source=build/atari800-trace`. A
`/tmp` build of the emulator does not survive a reboot.

---

## Result semantics

| Label | Meaning |
| --- | --- |
| `OWNER-SMOKE CANDIDATE` | Committed, builds, gates pass; owner has not smoked it. Never presented as accepted. |
| `OWNER-ACCEPTED` | Owner smoke passed. Only the owner sets this. |
| `BLOCKED_<REASON>` | Cannot proceed under the invariants. Must carry the exact byte/cycle requirement and the smallest recovery needed. |

A local commit implies none of owner PASS, production readiness or release
readiness.

---

## Git and task isolation

* Do not automatically start the next roadmap item.
* Do not stage, reset, delete, overwrite or commit unrelated owner changes.
* Never blindly stage the entire worktree.
* Do not touch `.claude/` unless explicitly requested.
* No push, merge, release or tag without owner approval.
* Local checkpoint commits on an experimental branch are allowed.
* With multiple agents, do not modify one worktree concurrently; use branches
  or worktrees as handoff boundaries.

---

## Definition of done

* compiles, assembles and links cleanly **on the default target**, not only
  under `--candidate`;
* relevant focused tests pass;
* no illegal memory overlap; startup path still valid;
* PAL timing within the required gates, with no missed frames, unexpected VBI
  or DLI anomalies on affected paths;
* documentation reflects architectural or player-visible changes;
* a candidate XEX exists for owner smoke.

ATR validation is required when ATR/loading or loader/startup code changed, or
a release requires it. Review notes must distinguish confirmed bug, regression,
optional improvement and deferred polish.

---

## Session end

**Accepted checkpoint.** Update `docs/STATUS.md`, replacing current-state
information rather than appending history; update only the domain documents the
change affected; record significant new owner decisions; make a focused local
commit when safe; report branch, HEAD, XEX SHA-256, CPU delta, RAM/residency
delta, tests, known remaining issues and NEXT TASK; STOP.

**Candidate awaiting owner smoke.** Label it `OWNER-SMOKE CANDIDATE`. Do not
present it as accepted.

**BLOCKED / REJECTED / INCONCLUSIVE.** Preserve useful evidence in
`docs/diagnostics/`; revert rejected production changes where appropriate; do
not present experimental code as an accepted baseline; update `docs/STATUS.md`
only when the blocker itself becomes part of the official project state; report
the exact blocker and evidence; STOP.
