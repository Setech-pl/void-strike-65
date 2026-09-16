# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-16

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

---

## Checkpoint

### Repository HEAD

`experiment/hybrid-c-director`. HEAD carries documentation-only commits made
after the accepted runtime checkpoint (`61c4d9a` Heavy/Light decisions,
`1526083` Interceptor `BLOCKED_PLACEMENT` evidence, plus this reconciliation).
None of them changes the accepted runtime.

### Accepted runtime checkpoint

Commit `41ace65` — `feat: accept Light Wingman and visible PMG pickup`
(owner smoke PASS 2026-09-15).

XEX SHA-256:
`900152fed5b1aec3eee200034121fbd6d930288d6a3669c13968c74c93955ce8`

`npm run build:candidate -- --quiet` from a clean checkout reproduces it;
owner-smoke copy in `build/owner-smoke/light-wingman-late-900152fe/`.

It contains the hybrid C Director foundation (`2df89da`), Light Wingman M1
(`ed72e25` + `5f2f3ae`, late publication, centred formation) and the solid
fifth-player PMG pickup mask.

Previous accepted runtime checkpoint: `2df89da` (XEX `9aa7336e…`).

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

## Interceptor (plan step 4.4)

| Aspect | State |
| --- | --- |
| Architecture experiment | **PASS** — no Director, lifecycle, PMG, renderer or collision redesign was required |
| Runtime implementation | **NOT ACCEPTED** — `BLOCKED_PLACEMENT`, no candidate XEX, no owner smoke |

Attempted 2026-09-16. The accepted runtime checkpoint above is unchanged.

Overflowing area: `HYBRID_C_EXT_RAM` `$8C7D-$8FFF` (899 B), which also carries
the 133 B `LIGHT_CODE` tail appended by `scripts/build.mjs`. Accepted
occupancy is 882 B, leaving a 17 B free tail.

Two variants were measured. **Reduced** commits to the player's column at
admission and dives; **full pursuit** re-closes on the player every other
frame. Neither has been chosen — that is a later decision.

| Number | Reduced | Full pursuit | Meaning |
| --- | ---: | ---: | --- |
| Raw added requirement | 92 B | 143 B | bytes the experiment adds on top of the 882 B accepted occupancy |
| Legal slack available | 24 B | 24 B | 17 B free tail in the overflowing area **plus** 7 B reachable in three other C areas by relocating whole functions |
| Remaining deficit | **68 B** | **119 B** | new resident capacity that step 4.3 must recover |

Do not quote "75 B / 126 B" as the requirement: those are the overflow against
the 899 B area, i.e. the raw requirement with the 17 B tail already spent. Use
the table above, or state which basis is meant.

Implementation preserved, unbuildable, on branch
`experiment/interceptor-blocked-placement` (`32f2c20`). Evidence:
[diagnostics/stage-2b2c-interceptor-blocked-placement.json](diagnostics/stage-2b2c-interceptor-blocked-placement.json).

The Interceptor is and stays Light class, character-rendered, never on
`P1`/`P2`, and occupies the single Light slot as `Wingman OR Interceptor`
(owner decision 15, still ACTIVE).

---

## Current task

None open.

## Next roadmap step

**Plan step 4.3 — reusable resident-capacity recovery.** Not an Interceptor
retry. It must recover reusable resident capacity for the Light-enemy family
and subsequent gameplay growth, sized against the remaining deficit above.

The 250 B boot-only GLUE holding window `$8600-$86F9` is a **candidate** source
only. It is unowned after its boot lifetime but is not approved allocatable
capacity: claiming it needs a second packed transport record, its own expansion
call and a startup-ordering proof against `layout_d_publish_glue`.

Do not retry 4.4 before capacity exists.
