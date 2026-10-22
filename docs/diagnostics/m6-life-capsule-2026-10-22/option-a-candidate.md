# M6 stage 2 — option A build report (OWNER-ACCEPTED)

2026-10-22. Session: Codex. Branch `codex/m6-life-capsule`.
The owner selected rescue cross A and recovery placement A. This report
supersedes the placement blocker in README.md; its failed attempt and patch
remain historical evidence. **Owner play test PASS on `b2261c9`,
2026-10-22: look A, placement A.** Journal §BN and plan §8 record the accepted
checkpoint. Measurements below are from the tested candidate build.

## Implementation and placement

C owns the 1-in-4 deterministic drop decision, SPACE-only eligibility,
once-per-level spawn latch, eight-life suppression, forced last-SPACE entry
and capped award. ASM executes the shared single-slot spawn/replacement,
collection, PMG, colour, sound, opportunistic existing effects and changed-HUD
publication. LIFE does not advance the ordinary RAPID/SPREAD/SHIELD rotation.
The compiler marks only the last SPACE with sector-kind bit $40. A forced
spawn happens immediately, without a kill; at eight lives it is suppressed.
The bottom HUD order remains LIFE, HULL, BOOST, T meter | SCORE.

* LIFE window tail: **$B82A-$B8FA, 209 B**; masks $B837-$B876,
  once-per-level latch $B82A, forced-call scratch $B877.
* New C object: **95 B**, in DIRECTOR_C_LOW, $8BF4-$8C52 in the default
  build. The init clear adds 3 B there: 105 -> **203 / 245 B**.
* The star-publication continuation uses **6 B**, $8B5A-$8B5F, from
  PICKUP_CODE's free tail. Repointing the existing call is byte-neutral in
  the window; the Light kernel still starts at $B478.
* The former STARFIELD mask table is removed: **-48 B** there. The four
  masks' editable source is assets/graphics/life-capsule.json; build.mjs
  validates four 16-byte masks and emits their include on every build.
* VOID LANCE stays **$B900-$BBFF**. Explicit tail/state/mask/colour-operand
  assertions and the unchanged checkLanceLayout gate prevent overlap.
* Net occupied runtime content increase: **+265 B** = 209 + 95 + 3 + 6 - 48.
  No new capsule, PMG, effect, software-stack, zero-page or BSS slot.

The rejected prototype's **302 B actual versus 125-160 B estimated** is
preserved in measurement.json. The final placed pieces total **313 B** before
subtracting the 48 B moved out of STARFIELD. Compared with that prototype,
the 3-B window hook is replaced by the 6-B continuation, the 3-B init clear
is accounted for, and death-colour priority costs 5 B more.

## Confirmed defects in the preserved prototype, repaired

1. Its old death-colour patch address became a JSR operand. The first default
   candidate CPU replay stopped at unsupported opcode $12 at $B897 in
   `2-neutral-fire0`, frame 0. Retarget the existing death publisher to the
   LIFE colour immediate $B8E8, assert that ABI, and give an active player
   explosion priority. The 5-B guard leaves **5 B**, rather than the
   prototype estimate of 10 B, below the lance.
2. Its spawn veneer fell through zero-filled ABI padding. A jump now skips
   the padding within the same original 21-B footprint.

The two focused tests in tests/life-capsule.test.mjs cover these faults.
The existing player's-death case in tests/plasma-fx.test.mjs also passes.
The isolated effects harness needs its linked low-C image installed before
calling C; it is not a boot/startup verification harness.

## Computed checks and timing limits

`node scripts/build.mjs --candidate` passes compilation, links, placement,
transport, decode and build-computed CPU/DMA accounting. Runtime evidence is
pending as required by journal §BM. `--candidate --level=1:sector=5` also
builds, entering the sixth (last SPACE) sector with a cleared life latch.

| Check | Result |
| --- | --- |
| CPU maximum, DMA disabled, deterministic build replay | **15,116 cycles**, +100 versus the committed baseline manifest's 15,016 |
| DMA accounting | **12,531 cycles**, unchanged |
| Conservative DLI accounting | **369 cycles**, unchanged |
| Additive CPU + DMA + DLI | **28,016 cycles**, diagnostic ESTIMATE only |
| PAL limits, unchanged | target **31,500**, hard gate **32,568**, physical frame **35,568** |
| Initial transport | **107 sectors**, unchanged; all transport **216 sectors** |
| Window and block-size assertions | PASS; LIFE end $B8FB <= lance start $B900 |
| Boss entry runs | all boss run bytes identical to accepted spindle ATR `5576e8bc`; reads **84 / 88 / 88 / 89 sectors**, unchanged |
| Boss entry <=350 host frames | accepted prior measurements **325 / 340 / 340 / 344**; not remeasured; no boss replay |
| Save-test display list | **$0B58**, source assertion and linked label unchanged |

There is no new native DMA-on measurement, wall trace, missed-frame claim,
boot smoke, boss stress, full test chain, GIF or ledger deviation. The CPU
replay above is the build's own accounting. Colour publication adds roughly
**31 / 32 cycles IC** per ordinary / LIFE fighter publication (23 during
player-death priority); no VBI/DLI work is added. The C policy runs only on
spawn, collection and sector entry. Other event estimates remain the plan's
~300 per choice, ~500 plus shared spawn at forced entry, ~600 plus the
existing effect work at collection; these are ESTIMATE, not native totals.

## M3-H resource inventory (default candidate build)

| Resource | Used / limit | Free bytes |
| --- | ---: | ---: |
| Initial content, project planning STOP | **13,572 / 13,652 B** | **80** |
| Initial content, physical transport capacity | **13,572 / 13,684 B** | **112** |
| Window below lance | end **$B8FB / $B900** | **5** |
| DIRECTOR_C_LOW | **203 / 245 B** | **42** |
| DIRECTOR_RAM | **643 / 645 B** | **2** |
| Overlay A (boss) | **2,038 / 2,048 B** | **10** |
| Overlay B (band and tables, fixed data ranges) | **768 / 768 B** | **0** |
| Overlay C | **2,044 / 2,048 B** | **4** |
| Overlay D | **1,788 / 1,792 B** | **4** |
| Overlay E | **527 / 576 B** | **49** |
| Overlay F, regions 1 / 2 / 3 / 4 | **110 / 406 / 323 / 508 of 512 B** | **402 / 106 / 189 / 4** |
| Overlay G (lance) | **763 / 768 B** | **5** |
| Overlay H (page 4) | **250 / 256 B** | **6** |
| Boss install | **380 / 384 B** | **4** |
| Summary overlay | **1,770 / 1,792 B** | **22** |

The physical initial-content bound is 107*128 minus the source's 12-B minimum
envelope; the standing 13,652-B planning STOP retains an additional 32 B.
Neither limit was changed. PICKUP_CODE has **7 B** free. The generated
memory-map block matches this build. No loader/startup source changed.

## Owner smoke artifacts

* **level-1**: `/Users/marcinkrzetowski/Projects/dark-fighter/build/play/m6-life-capsule/void-strike-65-life-level-1-3f8f8e22.atr`
  SHA-256 `3f8f8e229a3189342136754fcf4cc311d68d5970bed8c729b7796ec4e1e1db10`.

* **forced-sector-6**: `/Users/marcinkrzetowski/Projects/dark-fighter/build/play/m6-life-capsule/void-strike-65-life-forced-sector-6-62716b3f.atr`
  SHA-256 `62716b3fa729459807f19d4708d430b045b2f7c212130bea2825e6826716b1bc`.

The forced route starts directly at sector 6, with a fresh once-per-level
latch, so it exercises the forced capsule without waiting for earlier sectors.
Use the normal level-1 artifact for random drops, ordinary rotation and the
once-per-level rule. Owner play test has passed; §BN, the as-built plan,
STATUS and both player guides record acceptance. The owner authorized the
merge commit and push of main. No release.
