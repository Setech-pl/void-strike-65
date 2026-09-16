# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-16

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

---

## Checkpoint

### Repository HEAD

`experiment/hybrid-c-director`. HEAD is this documentation-only reconciliation
of the owner acceptance recorded below; it does not change the accepted runtime.

### Accepted runtime checkpoint

Commit `b4b942e` — `fix(debris): publish the debris late with exact ownership`
(owner smoke PASS 2026-09-16 for the pickup visibility, step 4.3 Stage 1 and the
debris late publication).

XEX SHA-256:
`965468077747f527b7d3f8ffeb7c37ace27377892ea5fc6f2e8aaf062d0d8a6e`

`npm run build:candidate -- --quiet` from a clean export of `b4b942e` reproduces
it (re-verified 2026-09-16); owner-smoke copy in
`build/owner-smoke/debris-late-96546807/`.

It contains the hybrid C Director foundation (`2df89da`), Light Wingman M1
(`41ace65`), the PMG pickup raster fix and per-type capsule silhouettes
(`f30754a`, `c2af6a6`), step 4.3 Stage 1 reusable resident capacity (`fca5e31`,
`0290d83`) and the debris late publication with exact ownership (`b4b942e`).

Previous accepted runtime checkpoint: `41ace65` (XEX `900152fe…`).

---

## Architecture

Hybrid **C/cc65 + ca65**, defined in
[hybrid-c-architecture.md](hybrid-c-architecture.md).

- C decides WHAT: Encounter Director, sector state, high-level lifecycle,
  `EnemyArchetype` (Raider, Light Wingman), Raider and Light HP/state,
  admission/retire/recycle, formation motion, fire decisions, Director
  scheduling and RNG; progressively waves, AI, pickup policy, progression and
  boss state.
- ASM performs HOW: VBI/DLI, ANTIC/raster, PMG, Heavy, Light, debris and
  PairShot publication, character ring, backing/restore, hot collisions,
  hardware writes, audio hot paths, loader and XEX/ATR startup.

---

## Gameplay capability (accepted)

- Player Fighter movement and PairShot weapon (Normal/Rapid/Spread, Shield);
- two Heavy Raiders on P1/P2 with fire, contact damage, score and
  character-free destruction;
- one Light Wingman per Raider formation: character 2x1, centred behind Heavy
  slot 0, no side switching, published late after the playfield (no flicker),
  destructible, 5 points, retired before the capital sector; its 8-line
  vertical stepping relative to the leader is intentional and accepted;
- debris, published late with exact ownership (debris < effects < Light <
  PairShots < sparse near), visible from Y 24 in capital and post-capital
  fighter phases;
- Encounter Director Level 1, capital broadside traversal;
- fighter-sector pickup: deterministic admission (every third Raider kill by
  Player PairShot), PENDING/ACTIVE lifecycle, collection and boosters, visible
  as a fifth-player PMG mark published after the playfield, with a per-type
  capsule silhouette (Rapid slot, Spread fan, Shield crest) in `COLPF3`;
- white four-point starfield, one scanline per frame.

Deferred by the owner: smooth 1-line Light tracking (M2).

---

## CPU / RAM baseline (`2-evasive-fire3`, 920 PAL frames, XEX `96546807`)

| Measure | Value |
| --- | ---: |
| PAL max wall cycles | 29,258 |
| Target 31,200 headroom | 1,942 |
| Hard gate 32,568 headroom | 3,310 |
| Missed frames / extra VBI / DLI errors | 0 / 0 / 0 |
| Linked runtime | 17,470 B |
| Simultaneous residency | 19,295 B |
| Safe residency remaining | 2,892 B |

Reusable free capacity at this checkpoint (measured, `build/manifest.json`):
contiguous `HYBRID_C_EXT` tail 187 B (`$8F45-$8FFF`), `HYBRID_C_SECTOR` window
8 B, ENTITY_CODE tail 45 B, A2 kernel tail 18 B, pickup stream fill 14 B,
pickup/collision record 1,158 of 1,277 B cold capacity. Packed STARFIELD is
1,805 B: 7 B over the reviewed 1,798 B correction gate and 14 B under the
1,819 B hard staging limit (open decision below). Use identical replays when
comparing CPU.

---

## Known open defects and open decisions

- intermittent purple artifact after a Raider, not reproduced
  deterministically;
- Spread second capsule trace / final glyph reported in plan v4.12 §11, not
  re-verified since PairShot and the PMG capsule;
- debris known limitation: a cell yielded to a 25 Hz effect shows the effect's
  lower backing for the frame in which that effect expires (effects still
  publish mid-frame; measured once in 4,600 in-view frames);
- open owner decision: the packed STARFIELD correction gate (1,805 B against
  the reviewed 1,798 B). `tests/light-wingman.test.mjs` ("Light kernel
  placement…") and `tests/broadside-fire.test.mjs` keep failing on that gate on
  purpose; moving a reviewed margin is an owner decision;
- test debt: the full `node --test tests/*.test.mjs` run keeps known stale
  failures — 115 at `b4b942e` (measured 2026-09-16 on a clean export, counting
  the owner's uncommitted `tests/booster-admission-diagnostic.test.mjs`); treat
  a new failure name as a regression signal.

---

## Accepted increments in this checkpoint — summary and evidence

### Pickup runtime visibility (P0)

Root cause was raster: the missile plane was erased just after the frame gate
and rewritten mid-frame, so ANTIC saw zeroes when the beam crossed the capsule
(0/16 rows at beam crossing). The plane is now erased and redrawn in the
post-playfield window after `wait_frame_at_line $77`; each booster carries its
own capsule silhouette again. The earlier native gate used a `& $F0` mask that
inspected only half of the fifth-player missile bits. Owner decision 12 (solid
fifth-player PMG design) is unchanged. Evidence:
[diagnostics/stage-2b2d-pickup-raster-invisibility.json](diagnostics/stage-2b2d-pickup-raster-invisibility.json),
[diagnostics/stage-2b2e-pickup-capsule-silhouettes.json](diagnostics/stage-2b2e-pickup-capsule-silhouettes.json).

### Step 4.3 Stage 1 — reusable resident capacity

Option D = A + C1. C1 removed dead ENTITY_CODE (39 B). A moved the boot-only
GLUE hold from `$8600` to `$8300` and turned the former hold into the C area
`HYBRID_C_SECTOR_RAM` `$8602-$86F9` (248 B), carrying the five `sector_c_*`
functions (240 B) as a second LZ stream of the pickup/collision DFMC record
(8/8 records, 142 B manifest unchanged). The native write-watch
(`scripts/capacity-window-watch.mjs`) passed on XEX and ATR. Startup costs
+8,463 cycles once. Evidence:
[diagnostics/stage-2b2f-resident-capacity-glue-window.json](diagnostics/stage-2b2f-resident-capacity-glue-window.json);
the owner's post-capital debris observation was A/B-cleared as `PREEXISTING`:
[diagnostics/stage-2b2f-step43-post-capital-debris-ab.json](diagnostics/stage-2b2f-step43-post-capital-debris-ab.json).

### Debris late publication — exact ownership

Fighter OPEN: debris erase and render run adjacently inside the post-playfield
window, between the Light erase and the Light render. Capital frames: right
after the entity update, in the vertical blank, after every transient restore
and before every transient capture. The erase restores a cell only while it
still holds the published code; the render leaves a cell a rendered effect
owns to the effect; the recycled bottom ring row republishes the debris for the
frame that rotates it. `LIGHT_CODE` 133 → 203 B; PAL max 29,217 → 29,258
cycles. Native final-framebuffer gate (`node scripts/runtime-wall-trace.mjs
--debris-gate-only`) on three natural replays: 0 blank, 0 partial, 0
transitions, first visible Y 24 in capital and post-capital phases (pre-fix
`0-neutral-fire0` post-capital: 549 blank of 1,028 in view). Evidence:
[diagnostics/stage-2b2g-debris-late-publication.json](diagnostics/stage-2b2g-debris-late-publication.json).

---

## Interceptor (plan step 4.4) — owner GO 2026-09-16, not implemented

The 2026-09-16 attempt was `BLOCKED_PLACEMENT`: the architecture held, but the
result did not fit `HYBRID_C_EXT_RAM`. Step 4.3 Stage 1 and the debris kernel
leave a 187 B extension tail, which the full-pursuit design fits (143 B raw C
estimated by the blocked experiment, on the obsolete 882 B basis). No
candidate XEX exists yet.

Owner GO (2026-09-16): full pursuit, reusing the preserved `32f2c20` design,
with one binding architecture change — the single Light slot is **explicitly
archetype-selectable** (`Wingman OR Interceptor`); the rejected per-admission
alternation must not be part of the Light lifecycle, and a separate, clearly
labelled provisional schedule outside it (replaced by roadmap step 4.6) decides
which archetype a smoke run shows. See owner decision 18.

Superseded blocked-experiment evidence (architecture proof only; its byte
basis is obsolete):
[diagnostics/stage-2b2c-interceptor-blocked-placement.json](diagnostics/stage-2b2c-interceptor-blocked-placement.json);
the unbuildable tree is on `experiment/interceptor-blocked-placement`.

---

## Current task

Roadmap step 4.4: implement the full-pursuit Interceptor on top of `b4b942e`.

## Next roadmap step

After owner acceptance of 4.4: step 4.5 per the roadmap. The Raider-coloured
residual artifact remains an open P0 investigation.
