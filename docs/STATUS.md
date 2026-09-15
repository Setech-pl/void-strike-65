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

SHA-256:

`9aa7336e5ba516bd01874b897e5c298fa5d0a734dab628258ff8597727cc50d8`

Always verify local HEAD and generated artifact before relying on these values.

---

## Current candidate — awaiting owner smoke

`2 Heavy Raiders + 1 Light Wingman`, second iteration.

Commits on `experiment/hybrid-c-director` after `bf27d65`:

- `ed72e25 feat(enemy): add Light Wingman as second C EnemyArchetype`
  (first owner smoke: Light appeared at a varying place relative to its
  leader and flickered);
- `fix(enemy): publish Light Wingman late and centre it behind its leader`
  (this candidate).

Owner-smoke XEX:

`build/owner-smoke/light-wingman-late-900152fe/void-strike-65-light-wingman-late.xex`

SHA-256:

`900152fed5b1aec3eee200034121fbd6d930288d6a3669c13968c74c93955ce8`

The XEX was built from the working tree, which also contains one uncommitted,
separately owned hunk: the solid fifth-player pickup mask
(`fighter_pickup_pmg_shape` in `src/main.s`, owner decision 2026-09-15 §12).
The committed Light tree alone therefore produces a different XEX hash; commit
or drop that pickup hunk before treating any hash as reproducible from Git.

Not owner-accepted yet. If the owner rejects it, revert the Light commits; the
accepted baseline above is unchanged.

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
- Light Wingman lifecycle, HP, formation motion and fire decision (candidate);
- admission/retirement/recycle decisions;
- Director scheduling and RNG;
- progressively: waves, high-level AI, pickups/booster policy, progression,
  boss state machine.

### ASM owns

- VBI/DLI;
- ANTIC/raster;
- PMG;
- Heavy renderer/publication;
- Light 2x1 character renderer, late publication, backing and hot collision
  (candidate);
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

Raider is the first C `EnemyArchetype` (record 0).

### Light enemies (candidate)

Light Wingman is the second C `EnemyArchetype` (record 1): HP 1,
wingman-follow behavior, single-shot policy with 96/80/64-frame pauses
(EASY/MEDIUM/HARD), character 2x1 renderer class, red PairShot, BCD score
`$05`, Director value 1.

- maximum one Light; admitted together with each Raider formation;
- centred behind Heavy slot 0: left edge leader X + (16 - 8) / 2 rounded to the
  4-HPOS cell grid (error <= 2 HPOS), clamped to the last two-cell start, 8 + 4
  lines above the leader; no side switching;
- erased and republished only in the post-playfield PairShot window
  (after `wait_frame_at_line $77`), so ANTIC never scans it while erased;
- leader lost: continues straight down and retires at scanline 232, before the
  ring row recycled by `rotate_playfield_rows`;
- no P0-P3 use; two ANTIC 4 ring cells (glyphs 120/121, hostile bank);
- one player PairShot or player contact destroys it; independent score;
- capital admission waits until it has retired and been unpublished;
- no Director redesign; no new loader record, DLI, VBI or compositor.

Known limitation: the Light is drawn in 8-line character rows while the Heavy
PMG moves 1 line per frame, so its vertical gap to the leader still steps
between 12 and 19 lines. Smooth 1-line tracking (a 2x2 dynamic glyph
compositor) is `BLOCKED_PLACEMENT`: it needs about 75 B, while the largest
free legal region is 24 B (see "Latest completed experiment").

### Pickup / booster

Booster generation/admission is functional.

Latest PMG visibility work selected a simplified solid fifth-player pickup
representation; its source hunk is still uncommitted (see above).

Owner smoke should remain the final visual acceptance gate.

### Debris

Known visual issues remain under observation:

- debris can occasionally appear inside the visible playfield;
- debris can occasionally flicker/disappear/reappear (same early-erase /
  mid-frame-render raster window that caused the Light flicker).

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

Accepted lifecycle/archetype baseline (`2df89da`):

- PAL max: 28,505 cycles (`2-evasive-fire3`, 920 frames)
- production target: 31,200
- hard gate: 32,568
- linked runtime: 17,521 B; simultaneous residency: 18,914 B;
  safe residency remaining: 3,273 B

Light Wingman candidate (`900152fe`, same replay):

- PAL max: 29,177 cycles (+672 vs baseline, +478 vs `ed72e25`)
- target headroom: 2,023; hard-gate headroom: 3,391; physical: 6,391
- missed frames / extra VBI / DLI ordering errors / overruns: 0
- in all 659 fighter-OPEN frames the Light publication ends after the
  playfield; the 46 later-ending frames are capital frames without a Light
- boot smoke: 4 XEX/ATR cold-start sessions PASS
- linked runtime: 17,452 B
- simultaneous residency: 19,207 B; safe residency remaining: 2,980 B

Placement margins: extension composite 17 B before `$9000` (742/960 B packed),
pickup/collision stream 6 B zero fill before `$8B67`, packed STARFIELD 24 B
below its 1,798 B correction gate, A2 kernel 19 B, ENTITY_CODE 12 B run space.
A further archetype or the smooth Light renderer needs a new placement
decision.

Use identical replay scenarios when comparing CPU numbers.

---

## Test baseline

The full `node --test tests/*.test.mjs` run has 110 failing tests on the Light
candidate and 115 on the accepted `2df89da`; the candidate introduces no new
failure name. The remaining failures are stale pins and traces predating the
hybrid foundation (pickup character footprints, packed-size pins, BOSS_HANDOFF
pickup clear, released-pulse survival). Treat them as known test debt, not as
evidence against a change, unless a new name appears.

---

## Latest completed experiment

Light Wingman owner-smoke fix (2026-09-15), diagnosed from the candidate's own
native trace: the Light was erased right after the frame gate (scanline ~20)
and redrawn only at scanlines 97-150, so in 161 of 434 leader-alive frames the
beam passed its row while it was erased; its position combined a 4-HPOS / 8-line
character grid with side switching. Fixed by late publication and a fixed
centred formation. Smooth vertical tracking: `BLOCKED_PLACEMENT` (about 75 B
needed; free regions 24/19/17/12/6 B). See
`docs/diagnostics/stage-2b2b-light-wingman-late-publication.json`.

---

## Current task

Owner smoke of the `2 Heavy + 1 Light` late-publication candidate.

Executor currently preferred:

Claude Code.

---

## Next roadmap after Light owner PASS

1. Placement decision for about 100 B of resident Light/archetype capacity
   (needed for smooth Light tracking and for the next archetype).
2. Interceptor as another data-driven EnemyArchetype.
3. Bomber / Heavy Assault.
4. Wave/progression expansion.
5. Fighter acceptance/capacity growth.
6. Capital VSCROL proof.
7. Capital turrets/gondolas/damaged sections.
8. Reusable capital modules.
9. Modular boss.

---

## Uncommitted work in the tree (not part of the Light candidate)

Left untouched for their owner:

- `src/main.s` pickup mask hunk; `docs/owner-decisions-2026-09-11.md` §11-13;
  `docs/plan-realizacji.md` booster diagnostic section and §14;
- booster admission diagnostic script/test/JSON and pickup PMG visibility
  diagnostic JSON;
- `scripts/atari800-wall-trace.h` and `scripts/runtime-wall-trace.mjs`
  booster/pickup instrumentation;
- `tests/encounter-director.test.mjs` emitter-bit expectation `[2,3]`;
- generated `dist/`.

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
