# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-15

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

---

## Checkpoint

Branch: `experiment/hybrid-c-director`

### Accepted (owner smoke PASS 2026-09-15)

`feat: accept Light Wingman and visible PMG pickup` — the commit that follows
`51c97c6` on this branch.

It contains the hybrid C Director foundation (`2df89da`), Light Wingman M1
(`ed72e25` + `5f2f3ae`, late publication, centred formation) and the solid
fifth-player PMG pickup mask.

Accepted XEX SHA-256:
`900152fed5b1aec3eee200034121fbd6d930288d6a3669c13968c74c93955ce8`
(`npm run build:candidate -- --quiet` from a clean checkout reproduces it;
owner-smoke copy in `build/owner-smoke/light-wingman-late-900152fe/`).

Previous accepted checkpoint: `2df89da` (XEX `9aa7336e…`).

No owner-smoke candidate is open.

---

## Architecture

Hybrid **C/cc65 + ca65**, defined in
[hybrid-c-architecture.md](hybrid-c-architecture.md).

- C decides WHAT: Encounter Director, sector state, high-level lifecycle,
  `EnemyArchetype` (Raider, Light Wingman), Raider and Light HP/state,
  admission/retire/recycle, formation motion, fire decisions, Director
  scheduling and RNG; progressively waves, AI, pickup policy, progression and
  boss state.
- ASM performs HOW: VBI/DLI, ANTIC/raster, PMG, Heavy, Light and PairShot
  publication, character ring, backing/restore, hot collisions, hardware
  writes, audio hot paths, loader and XEX/ATR startup.

---

## Gameplay capability (accepted)

- Player Fighter movement and PairShot weapon (Normal/Rapid/Spread, Shield);
- two Heavy Raiders on P1/P2 with fire, contact damage, score and
  character-free destruction;
- one Light Wingman per Raider formation: character 2x1, centred behind Heavy
  slot 0, no side switching, published late after the playfield (no flicker),
  destructible, 5 points, retired before the capital sector; its 8-line
  vertical stepping relative to the leader is intentional and accepted;
- debris, Encounter Director Level 1, capital broadside traversal;
- fighter-sector pickup capsule as a solid fifth-player PMG mark (M0-M3,
  `COLPF3`); deterministic admission (every third Raider kill by Player
  PairShot);
- white four-point starfield, one scanline per frame.

Deferred by the owner: smooth 1-line Light tracking (M2); it would also need
about 75 B of resident space (`BLOCKED_PLACEMENT`).

---

## CPU / RAM baseline (`2-evasive-fire3`, 920 PAL frames, XEX `900152fe`)

| Measure | Value |
| --- | ---: |
| PAL max wall cycles | 29,177 |
| Target 31,200 headroom | 2,023 |
| Hard gate 32,568 headroom | 3,391 |
| Physical frame headroom | 6,391 |
| Missed frames / extra VBI / DLI errors | 0 / 0 / 0 |
| Linked runtime | 17,452 B |
| Simultaneous residency | 19,207 B |
| Safe residency remaining | 2,980 B |

Placement margins: extension 17 B, pickup stream 6 B, packed STARFIELD 24 B,
A2 kernel 19 B, ENTITY_CODE 12 B. A new archetype or smooth Light may need a
placement decision. Use identical replays when comparing CPU.

---

## Known open defects

- debris can appear inside the visible playfield and can flicker/disappear
  (same early-erase / mid-frame-render window that caused the Light flicker);
- intermittent purple artifact after a Raider, not reproduced deterministically;
- Spread second capsule trace / final glyph reported in plan v4.12 §11, not
  re-verified since PairShot and the PMG capsule;
- test debt: the full `node --test tests/*.test.mjs` run keeps known stale
  failures (110 at this checkpoint with no new failure name, 115 at `2df89da`); treat a new failure
  name as a regression signal.

Evidence: `docs/diagnostics/stage-2b2b-light-wingman-2heavy-1light.json`,
`docs/diagnostics/stage-2b2b-light-wingman-late-publication.json`,
`docs/diagnostics/stage-2b2b-pmg-pickup-visibility-fix.json`,
`docs/diagnostics/stage-2b2b-booster-admission-final-diagnostic.json`.

---

## Current task

None open. The next roadmap step is below.

## Next roadmap step

Interceptor as the second Light-class C `EnemyArchetype`, reusing the accepted
Light renderer and ASM kernel (plan step 4.4). Add resident capacity (4.3) only
if it blocks on placement.
