# VOID STRIKE 65 — CURRENT STATUS

Last update: 2026-09-15

What is true now. Rules: [reguly-projektu.txt](reguly-projektu.txt). Roadmap:
[plan-realizacji.md](plan-realizacji.md). Source-of-truth order:
[README.md](README.md). Always verify local HEAD and artifacts before relying on
the values below.

---

## Checkpoints

Branch: `experiment/hybrid-c-director`

### Accepted (owner-accepted)

`2df89da refactor: establish hybrid lifecycle and enemy archetypes`

Hybrid C Director foundation, C-owned sector/lifecycle, Raider as the first
`EnemyArchetype`. Accepted owner-smoke XEX SHA-256:
`9aa7336e5ba516bd01874b897e5c298fa5d0a734dab628258ff8597727cc50d8`.

### OWNER-SMOKE CANDIDATE — Light Wingman M1

- `ed72e25 feat(enemy): add Light Wingman as second C EnemyArchetype`
  (first owner smoke: varying position relative to the leader, flicker);
- `5f2f3ae fix(enemy): publish Light Wingman late and centre it behind its leader`.

Owner-smoke XEX:
`build/owner-smoke/light-wingman-late-900152fe/void-strike-65-light-wingman-late.xex`,
SHA-256 `900152fed5b1aec3eee200034121fbd6d930288d6a3669c13968c74c93955ce8`.

That XEX was built from the working tree, which also contains the uncommitted
solid pickup mask (below); the committed Light tree alone builds a different
hash. Not owner-accepted. On rejection, revert the two Light commits; the
accepted checkpoint is unaffected.

### Uncommitted work in the tree (owner to commit or discard)

- `src/main.s`: solid fifth-player pickup mask (`fighter_pickup_pmg_shape`,
  owner decision 2026-09-15 §12) — visible-pickup candidate;
- `docs/owner-decisions-2026-09-11.md` §11-13;
- booster admission diagnostic (script, test, JSON) and pickup PMG visibility
  diagnostic JSON;
- `docs/history/plan-realizacji-v4.12-uncommitted-owner-sections.md` —
  the two plan sections that existed only in the working tree;
- `scripts/atari800-wall-trace.h`, `scripts/runtime-wall-trace.mjs`
  booster/pickup instrumentation;
- `tests/encounter-director.test.mjs` emitter-bit expectation `[2,3]`;
- generated `dist/`.

---

## Architecture

Hybrid **C/cc65 + ca65**, defined in
[hybrid-c-architecture.md](hybrid-c-architecture.md).

- C decides WHAT: Encounter Director, sector state, high-level lifecycle,
  `EnemyArchetype`, Raider HP/member/live state, admission/retire/recycle,
  Director scheduling and RNG; progressively waves, AI, pickup policy,
  progression and boss state.
- ASM performs HOW: VBI/DLI, ANTIC/raster, PMG, Heavy and PairShot publication,
  character ring, backing/restore, hot collisions, hardware writes, audio hot
  paths, loader and XEX/ATR startup.

---

## Gameplay capability

Accepted:

- Player Fighter movement and PairShot weapon (Normal/Rapid/Spread, Shield);
- two Heavy Raiders on P1/P2 with fire, contact damage, score and
  character-free destruction;
- debris, Encounter Director Level 1, capital broadside traversal;
- fighter-sector pickup capsule as a fifth-player PMG object (M0-M3); booster
  admission is deterministic (every third Raider kill by Player PairShot);
- white four-point starfield, one scanline per frame.

OWNER-SMOKE CANDIDATE: one Light Wingman per Raider formation (character 2x1,
C-owned lifecycle, centred behind Heavy slot 0, late post-playfield
publication). Its vertical gap still steps between 12 and 19 lines; smooth
1-line tracking (M2) is `BLOCKED_PLACEMENT` (about 75 B needed; largest free
region 24 B).

---

## CPU / RAM baseline (`2-evasive-fire3`, 920 PAL frames)

| | Accepted `2df89da` | Light M1 candidate `900152fe` |
| --- | ---: | ---: |
| PAL max wall cycles | 28,505 | 29,177 |
| Target 31,200 headroom | 2,695 | 2,023 |
| Hard gate 32,568 headroom | 4,063 | 3,391 |
| Missed frames / extra VBI / DLI errors | 0 / 0 / 0 | 0 / 0 / 0 |
| Linked runtime | 17,521 B | 17,452 B |
| Simultaneous residency | 18,914 B | 19,207 B |
| Safe residency remaining | 3,273 B | 2,980 B |

Candidate placement margins: extension 17 B, pickup stream 6 B, packed
STARFIELD 24 B, A2 kernel 19 B, ENTITY_CODE 12 B. The next archetype or smooth
Light needs a placement decision. Use identical replays when comparing CPU.

---

## Known open defects

- debris can appear inside the visible playfield and can flicker/disappear
  (same early-erase / mid-frame-render window that caused the Light flicker);
- intermittent purple artifact after a Raider, not reproduced deterministically;
- Spread second capsule trace / final glyph reported in plan v4.12 §11, not
  re-verified since PairShot and the PMG capsule;
- test debt: the full `node --test tests/*.test.mjs` run has 110 failing tests
  on the candidate and 115 on `2df89da`, with no new failure name on the
  candidate. Treat a new name as a regression signal.

Evidence for the latest work:
`docs/diagnostics/stage-2b2b-light-wingman-2heavy-1light.json`,
`docs/diagnostics/stage-2b2b-light-wingman-late-publication.json`.

---

## Current task

Owner smoke of the Light Wingman M1 candidate, then reconcile the uncommitted
work listed above.

## Next roadmap step

After Light owner PASS: a clean accepted checkpoint for Light + visible pickup
(plan step 4.2), then Interceptor (4.4), adding resident capacity (4.3) only
when it blocks.
