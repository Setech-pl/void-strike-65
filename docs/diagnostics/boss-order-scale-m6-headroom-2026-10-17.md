# feat/boss-order-scale Phase B — STOP: the Spine's faster reload against M6's headroom (2026-10-17)

The owner's Phase B gate: report each region's M6 headroom (8,500 − the worst
reachable boss frame, native cycles) against an estimate of the M6 VOID LANCE
reticle (P1 / P2); **STOP if any region falls below it**. With the curve's
final data the Siege Spine on level 9 does.

## The reticle's estimate (EST, instruction counts)

| piece | native cycles |
| --- | ---: |
| the target column under the ship and the module through `boss_column_map` | ~80 |
| HPOSP1 / HPOSP2 write, the armed flag | ~15 |
| the 8-line redraw in the player plane when the target changes (erase + write) | ~160 |
| its own colour in the band DLI (COLPM1 / COLPM2 carry the beams' colour) | ~20 |
| **worst frame** (the target changes) | **~300** |
| a frame without a redraw | ~120 |

Not counted: the torpedo's flight (~250-300 a frame while it flies,
`plans/gameplay-variety.md` §3.5) - M6 already must keep it off the
two-laser worst frame.

## The worst reachable boss frame per region (MEASURED, the final candidate build `cd4049b` + data `9c9ae92`)

| region | boss | entry, host frames | worst reachable | M6 headroom | tool |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Blockade Breaker | 257 | 7,150 | 1,350 | `tests/boss-stress.test.mjs` |
| 2 | Void Citadel | 272 | 7,694 (L4) / 8,029 (L5) | 471 | `measure-boss-stress-r4.mjs --level=4 / 5` |
| 3 | Siege Spine | 268 | 7,816 (L7) / **8,246 (L9)** | **254** | `measure-boss-stress-field.mjs --level=7 / 9` |
| 4 | Bastion | 271 | 8,065 (L10, a rail step frame) | 435 | `measure-boss-stress-r2.mjs` |

## The cause (A/B, the same build, only the Spine's guns' reload changed)

| the Spine's guns' reload | L9 worst reachable | headroom |
| --- | ---: | ---: |
| x 0.85 of main (51 / 60 / 64 / 51; the owner's "about 15 % faster") | 8,025 | 475 |
| x 0.75 of main (45 / 53 / 56 / 45; Phase B's step 3) | 8,246 | 254 |

The same composition (two kills, modules 5, 12, 0-3 destroyed, the lasers in
their warning, p 0): the faster guns keep more boss shots in flight on that
frame - a real, reachable cost, not an artefact of the tool.

## Why the reload went to x 0.75, and what x 0.85 measured (the curve, MEDIUM, the aiming bot; `docs/boss-curve.json` for x 0.75)

| the Spine at | EASY / MEDIUM / HARD (levels 7-8) | level 9 | hits a minute (boss's own fire) | the Citadel (level 4) |
| --- | --- | --- | --- | --- |
| x 0.85 (batch 2) | 97.2 / 106.1 / 138.8 s | 104.4 / 111.5 / 138.1 s | 13.2 (10.1) | 14.5 (7.1) |
| x 0.75 (final) | 93.8 / 113.1 / 133.5 s | 93.6 / 117.2 / 145.9 s | 16.1 (12.4) | 14.5 (7.1) |

At x 0.85 the danger rises by the bosses' own fire (4.6 / 7.1 / 10.1 / 14.9)
but not by every hit: the Citadel's 14.5 a minute is half its escort's laser
(7.5: the well pulls the ship to the centre column where the escort enters and
holds), above the Spine's 13.2; and the Spine's EASY is 0.92 of its MEDIUM (the
problem decision AX named). x 0.75 fixed both and cost the headroom.

## The options (for the owner)

1. **Keep x 0.75** (the tree as it is): the danger rises by every hit, the
   Spine's EASY 0.83 of MEDIUM; level 9's headroom 254 - M6 must keep the
   reticle's redraw off a two-kill frame on level 9 (or reclaim ~50 there),
   decided in M6.
2. **Back to x 0.85** (the owner's number): headroom 475 everywhere but the
   Bastion's 435; the danger rises by the bosses' own fire, not by every hit
   (the Citadel's escort); the Spine's EASY 0.92 of MEDIUM (97 s against 90).
   Data only; the curve test's danger rule back to the boss's own fire; the
   Spine's cells re-measured into the evidence.
3. **x 0.80**, between them: not measured (a Spine curve run and its stress,
   about 40 minutes).
