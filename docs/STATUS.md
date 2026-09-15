# VOID STRIKE 65 — CURRENT STATUS

Last structural update: 2026-09-15

This file describes the currently accepted project state.

It is a handoff between Claude Code, OpenAI Codex, local coding agents and the
owner.

Do not treat BLOCKED/REJECTED experimental code as the accepted baseline.

---

## Accepted baseline

Branch:

`experiment/hybrid-c-director`

Accepted checkpoint:

`2df89da refactor: establish hybrid lifecycle and enemy archetypes`

Accepted owner-smoke candidate from the lifecycle/archetype foundation:

`dist/void-strike-65.xex`

SHA-256:

`9aa7336e5ba516bd01874b897e5c298fa5d0a734dab628258ff8597727cc50d8`

Always verify local HEAD and generated artifact before relying on these values.

---

## Architecture

VOID STRIKE 65 uses a hybrid architecture:

`C/cc65 + ca65`

### C owns

- Encounter Director;
- fighter/capital sector state;
- future boss-state contract;
- high-level lifecycle;
- EnemyArchetype;
- Raider HP/member/live state;
- admission/retirement/recycle decisions;
- Director scheduling and RNG;
- progressively: waves, high-level AI, pickups/booster policy, progression,
  boss state machine.

### ASM owns

- VBI/DLI;
- ANTIC/raster;
- PMG;
- Heavy renderer/publication;
- PairShot publication;
- character ring;
- backing/restore;
- hot collision loops;
- hardware register writes;
- audio hot paths;
- loader/XEX/ATR startup.

Rule:

C decides WHAT should happen.

ASM performs hardware-critical HOW.

See:

`docs/hybrid-c-architecture.md`

---

## Current gameplay foundation

### Player

Existing player movement/fire foundation retained.

### Heavy enemies

Two Heavy Raider slots supported using P1/P2.

Raider is the first C `EnemyArchetype`.

### Light enemies

Not accepted yet.

First Light Wingman attempt was BLOCKED_PLACEMENT and its failed prototype was
removed.

### Pickup / booster

Booster generation/admission is functional.

Latest PMG visibility work selected a simplified solid fifth-player pickup
representation.

Owner smoke should remain the final visual acceptance gate.

### Debris

Known visual issues remain under observation:

- debris can occasionally appear inside the visible playfield;
- debris can occasionally flicker/disappear/reappear.

### Post-Raider purple artifact

Known intermittent visual artifact remains not reliably reproduced by automated
native traces.

Do not spend unlimited development time on this cosmetic defect without a
deterministic reproduction.

### Capital traversal

Existing capital traversal remains functional.

Future approved direction:

circular row ring as coarse scroll +
ANTIC VSCROL fine scrolling.

Do not redesign fighter scrolling for this.

---

## Resource baseline

Accepted lifecycle/archetype candidate:

- PAL max: 28,505 cycles
- production target: 31,200
- target headroom: 2,695
- hard gate: 32,568
- hard-gate headroom: 4,063
- missed frames: 0
- extra VBI: 0
- DLI anomalies: 0

Memory:

- linked runtime: 17,521 B
- simultaneous residency: 18,914 B
- safe residency remaining: 3,273 B

Use identical replay scenarios when comparing CPU numbers.

---

## Latest completed experiment

First Light Wingman attempt:

`BLOCKED_PLACEMENT`

The minimal character renderer required approximately:

176 additional packed bytes in the ENTITY_CODE transport.

Existing hard boundary:

`$5E10`

Candidate staging end:

`$5EC0`

The failed prototype was fully removed.

The accepted hybrid foundation remains unchanged.

---

## Current task

Find the smallest legal resident/transport placement for the Light character
renderer and, if locally solvable without major architecture changes, finish:

`2 Heavy + 1 Light Wingman`

Executor currently preferred:

Claude Code.

---

## Next roadmap after Light owner PASS

1. Interceptor as another data-driven EnemyArchetype.
2. Bomber / Heavy Assault.
3. Wave/progression expansion.
4. Fighter acceptance/capacity growth.
5. Capital VSCROL proof.
6. Capital turrets/gondolas/damaged sections.
7. Reusable capital modules.
8. Modular boss.

---

## Development process

Feature velocity is now a first-class project constraint.

Normal high-level feature work should follow:

branch
→ implement
→ focused tests
→ build XEX
→ owner smoke
→ commit/rollback

Do not run long proof campaigns for ordinary C gameplay logic.

Long PAL/raster validation is reserved primarily for:

- hardware-kernel changes;
- raster/PMG/ANTIC changes;
- milestones;
- release gates;
- observed timing regressions.

---

## Known traps / do not reopen without evidence

- full fighter double buffer;
- global read-only visible ring;
- dynamic per-object raster fence;
- broad per-access ownership lookup;
- additional background/ring 25 Hz throttling;
- separate Raider-wreck subsystem before debris redesign;
- BASIC RAM as the default placement workaround;
- loader/runtime disk-I/O redesign for small features.

---

## Agent handoff

At the beginning of every task:

- read this file;
- inspect Git;
- read the relevant workflow.

At the end of every ACCEPTED task:

update this file before handing the repository to another agent.
