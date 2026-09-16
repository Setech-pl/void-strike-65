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
- fighter-sector pickup: deterministic admission (every third Raider kill by
  Player PairShot), PENDING/ACTIVE lifecycle, collection and boosters. Its
  **runtime visibility was broken** at this checkpoint — see the P0 section
  below;
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

## P0 — pickup runtime visibility (2026-09-16)

`OWNER-SMOKE CANDIDATE`. Not accepted until the owner confirms on screen.

**Visual increment on top of the raster fix.** The solid 8x16 rectangle that the
raster fix produced was a temporary diagnostic visual, not artwork. Each booster
now carries its own capsule silhouette again — Rapid a capsule with a vertical
slot, Spread a casing with a three-shot fan, Shield a crest tapering to a point
— recovered from `assets/graphics/entity-effects.json` and verified row by row
against the final framebuffer. One colour (`COLPF3`) is all a fifth-player mark
has, so identity is carried by shape; the original also used colour, which this
representation cannot reproduce.

**One open decision.** The silhouettes push the packed starfield from 1,774 B to
1,804 B, which is **6 B over the reviewed correction gate of 1,798** while still
15 B under the 1,819 B hard staging limit, with the packed-source-to-pickup
margin healthy at 51 B. No new transport, GLUE window, relocation or step 4.3
was used. Table ordering, a 4-bit symmetric encoding and even degrading the
artwork were all measured and none fits; the gate, not the artwork, is binding.
`tests/light-wingman.test.mjs:108` and `tests/broadside-fire.test.mjs:563` are
deliberately left failing rather than re-baselined — moving a reviewed margin is
an owner decision. Evidence:
[diagnostics/stage-2b2e-pickup-capsule-silhouettes.json](diagnostics/stage-2b2e-pickup-capsule-silhouettes.json).
Candidate XEX `fe524219…`, CPU delta 0 cycles.

The owner reported that the booster/pickup has been **invisible for many
releases** although it can be collected and its booster works. That is correct
and it overrides the earlier automated "visible" conclusion.

Separate the two things, and do not conflate them again:

| | Status |
| --- | --- |
| `OWNER-APPROVED DESIGN: solid fifth-player PMG mark` (M0-M3, `PRIOR=$10`, `COLPF3`) | unchanged, owner decision 12 |
| `RUNTIME VISIBILITY` | was `KNOWN_OPEN`; now `OWNER-SMOKE CANDIDATE` |
| pickup admission, PENDING/ACTIVE, collection, boosters | proven working throughout |

**Root cause: RASTER.** The missile plane was erased just after the frame gate
(beam at scanline ~16) and rewritten only mid-frame. ANTIC fetches one missile
byte per scanline, so the plane held zeroes when the beam crossed the capsule.
Measured over 8 consecutive ACTIVE frames: **0/16 rows had missile bits at beam
crossing, 16/16 at frame end**, and the framebuffer was pure background.
Registers (`HPOSM`, `SIZEM`, `PRIOR`, `GRACTL`, `DMACTL`, `COLPF3`) were correct
the whole time.

**Why the old proof passed.** `src/main.s` claimed "GTIA consumes only M0-M3
bits 4-7" and the native gate counted rows matching `& 0xf0`. One missile is two
bits (`M0` = bits 0-1 … `M3` = bits 6-7), so that mask inspected only the half
the data happened to set. The test encoded the same mistake as the code. A
second, independent defect hid behind it: only 2 of 16 shape rows set the full
quartet, so the capsule's left edge was ragged.

**Fix** (ASM publication only; no gameplay policy migrated to C): the plane is
now erased and redrawn in the existing post-playfield window after
`wait_frame_at_line $77`, alongside the PairShot and Light Wingman publication,
and the shape is 16 rows of `$FF`.

Isolated measurements — COLPF3 pixels in the capsule window:
**0 (baseline) → 182 (raster fix) → 224 (raster fix + solid shape)**.

Evidence:
[diagnostics/stage-2b2d-pickup-raster-invisibility.json](diagnostics/stage-2b2d-pickup-raster-invisibility.json).
Candidate XEX `6d499d44…`, screenshot in
`build/owner-smoke/pickup-visible-6d499d44/`.

Light Wingman M1 status is unchanged.

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

Owner smoke of the pickup visibility candidate above.

Paused until both P0 runtime defects are closed: roadmap step 4.3, the
Interceptor, and the Raider-coloured residual artifact investigation.

## Next roadmap step

After pickup owner smoke passes: diagnose and remove the persistent
Raider-coloured residual artifact (the second P0 defect). Only then:

**Plan step 4.3 — reusable resident-capacity recovery.** Not an Interceptor
retry. It must recover reusable resident capacity for the Light-enemy family
and subsequent gameplay growth, sized against the remaining deficit above.

The 250 B boot-only GLUE holding window `$8600-$86F9` is a **candidate** source
only. It is unowned after its boot lifetime but is not approved allocatable
capacity: claiming it needs a second packed transport record, its own expansion
call and a startup-ordering proof against `layout_d_publish_glue`.

Do not retry 4.4 before capacity exists.
