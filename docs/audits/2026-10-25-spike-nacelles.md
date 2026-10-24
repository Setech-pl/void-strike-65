# Capital nacelles — throwaway spike, 2026-10-25

**SPIKE COMPLETE — OWNER-SMOKE CANDIDATE, experimental, not owner-accepted. Never merge the spike
branch. Only this report is intended for a later owner-controlled transfer to
main.** Runtime implementation: `cc24798` (superseding `3b7a262`); plan: `c270771`; branch
`codex/spike-nacelles`; baseline main/origin/main `19b1464`.

The bounded software design fits and is playable. All three normal flag-on
builds pass their computed gates. Six focused native PAL routes pass, with
zero distinct misses, extra VBI boundaries or DLI ordering errors. The final
flag-off normal build reproduces the campaign ATR exactly:
`410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7`.

EASY retains at least 20 free cells over the complete three-row player
footprint. The most expensive isolated newly admitted contact adds **2,447
CPU cycles**, above D7's +900–2,000 estimate. The measured capital paths still
have substantial PAL headroom. These are **EMULATOR-MEASURED** results;
real 65XE/SIO2SD play and the visual choice remain the owner's work.

Evidence, GIFs, playable ATR copies, compressed CSVs, raw watch reports and
reproduction notes stay on the throwaway branch:
[spike evidence](https://github.com/Setech-pl/void-strike-65/tree/codex/spike-nacelles/docs/diagnostics/spike-nacelles).
These branch-qualified links remain valid when only this report is transferred.

## What was built

`npm run build -- --spike-nacelles=1|2|3` selects one immutable pattern for
level 1's 480-row capital hull. Normal campaign builds omit it. Pattern data
is compiled by the host: 60 eight-row descriptors, two bits per side. ASM
only decodes the selected extent and publishes the geometry. EASY caps the
extra strip at one cell beyond the existing nine-cell map; MEDIUM/HARD allow
two. Production C entry policy and L2 transport were deliberately not added.

- **P1 gentle taper:** paired, long one-cell shoulders followed by a deeper
  plateau and retreat, repeating along the hull.
- **P2 River Raid:** alternating left/right shoulders. The capture pilot
  weaves. **The geometry cannot force a centred ship to weave:** all legal
  two-column projections leave a common safe central passage. This limitation
  follows from the requested depth bound, rather than a collision failure.
- **P3 gates:** shorter paired deep plateaus, with one-cell approach/retreat
  shoulders and long open stretches between them.

Both nine-column maps remain at `$4C00-$4E3F`; `$4E40` broadside state is
unchanged. Added strip cells have separate backing. When a nacelle exists,
publication fills the intervening base cells too, so there is one contiguous
outer-hull-to-inner-edge silhouette. There are no enclosed holes or tunnels.
The existing `$3B`/`$C6` hull fill glyphs supply the surface: **zero new glyph
slots or glyph bytes**, at the cost of a relatively flat slab appearance.

`draw_hull_row` has a same-size hook; a copy of its old 191-byte body and the
new strip publisher live in the spike window. Other hooks replace equal-size
instructions. All common linked routine addresses match main.
The final strip publisher reads its reserved strip records for the extra
cells; the superseded write-only-record checkpoint is not the measured result. Prepared-row
publication copies columns 9/10 and 29/30 as well as the original sides.
Its existing 16-bit coordinate, phase, physical row and immutable difficulty
already uniquely bind the immutable selected pattern; no additional mutable
cache-key field is required. Initial cache invalidation remains unchanged.

The universal fast reject narrows from `$54/$AC` to `$5C/$A4`. Exact contact
uses the existing three-row maximum-left/minimum-right intersection, with
source-row nacelle bounds substituted on each side and the enemy's eight-row
offset preserved. Damage, HUD update, lifecycle, clamp and cooldown remain
the canonical **two HULL units / 25 frames**, including clamp during cooldown.

Stars already publish only into blank cells after foreground publication.
The new cells are cleared/repainted explicitly. A capital-only geometric
clamp keeps debris's two-cell footprint inside the globally safe interval:
its pre-update origin is 96–152 HPOS, leaving the existing maximum four-HPOS
horizontal step a margin to 92–156. Shared spawn/admission code and RNG policy
are untouched. No boss overlay, lance, breakup engine or L1 relocation changed.

## Geometry and correctness

Values are **free channel width**, before subtracting the visible approximately
16-HPOS ship. They include all three collision rows, all eight vertical
alignments, the right-side offset, module joins and the finite entry/exit.
The legacy logical hull-contact footprint remains 8 HPOS × 15 scanlines.

| Pattern | EASY cells / HPOS | MEDIUM cells / HPOS | HARD cells / HPOS |
| --- | ---: | ---: | ---: |
| P1 gentle taper | 20 / 80 | 18 / 72 | 18 / 72 |
| P2 River Raid | 21 / 84 | 20 / 80 | 20 / 80 |
| P3 gates | 20 / 80 | 18 / 72 | 18 / 72 |

The focused documented-NMOS-6502 execution checks render every finite source
row, check the three-row intersection for every fine-Y alignment/difficulty,
then call the real contact routine at every protruding left/right edge and
at both safe-gap limits and its centre. They also exercise cooldown contact,
extra-column publication through both cache hit and coordinate-miss paths,
immutable code/data and the two forbidden reserves.

| Pattern | Contact/gap calls | Protruding edge cases | Cooldown rechecks | Cache hit + miss cases |
| --- | ---: | ---: | ---: | ---: |
| P1 | 45,372 | 10,236 | 10,236 | 2,928 |
| P2 | 40,530 | 5,394 | 5,394 | 2,928 |
| P3 | 39,912 | 4,776 | 4,776 | 2,928 |

**PASS:** no missed protruding contact through the fast reject; no gap damage,
including EASY; every tested clamp leaves the logical footprint outside both
hulls; damage is exactly two units and cannot repeat during the cooldown.
The native contact route records HULL events exactly 25 frames apart when
pressure continues. P1's contact GIF shows HULL 8→6 at frame 1107 and a later
88→92-HPOS clamp as the taper deepens. `$B8FB-$B8FF` and the M3-H
`$549E-$54BD` reservation retain their canaries. No new glyph allocation.

## Native PAL timing

All figures below are **measured elapsed 6502/ANTIC wall cycles**, DMA on,
from the packed ATR in the in-repo Atari800 source build. Two MEDIUM routes
per artifact, **2,100 gameplay frames each**: ordinary `sweep` flight and
`nacelle-contact`, an ordinary-joystick route with two short edge visits.
The identical policies and sector are used on the byte-identical clean-main
ATR. No gameplay memory is patched by either route. The routes cover entry,
all hull sections, drain and return to space, without reaching a boss.

The Director's entire capital sector includes the handoff while the previous
fighter render is still draining. Its maximum is **30,011** for every pattern
on the contact route, versus main **30,015** (peak-to-peak −4); the same frame
635 is exactly **30,011 → 30,011**. On the flight route it is **29,772** versus
main **29,771** (peak-to-peak +1). Those transition peaks must not be confused
with the cheaper hull-active frames below.

Deltas in parentheses below compare the **same route/frame**, unless marked
“peak”. “Edge” means the exact multi-row contact resolver ran; it need not
apply fresh damage during cooldown.

| Pattern | Worst hull-active flight frame / Δ | Worst native edge frame / Δ | Worst damaging hull frame / Δ | Worst row-advance frame, either route / Δ |
| --- | ---: | ---: | ---: | ---: |
| P1 | 17,866 / +672 (f904) | 14,696 / +2,296 (f1111) | 9,916 / +1,539 (f1132) | 13,641 / +59 (flight f903) |
| P2 | 18,016 / +822 (f904) | 16,613 / +5,477 (f1439) | 10,680 / +967 (f1155) | 14,430 / +4,787 (contact f1447) |
| P3 | 17,866 / +672 (f904) | 16,434 / +5,298 (f1439) | 11,892 / +2,139 (f1148) | 15,094 / +5,451 (contact f1447) |

The P2/P3 contact-route full-frame deltas include different damage/death,
projectile and effect state after the earlier additional hull hits. They are
real route costs, **not** the isolated cost of adding a boundary check.
`summary.json` contains the complete per-stage wall attribution for every
listed peak; `cpu-attribution.json` supplies paired identical-state routine
attribution without DMA. For example, P2's +5,477 edge frame comprises world
+58, hull contact +2,325, entity update +495, effects +494, projectile render
+1,628, and all remaining stages together +477. Their sum is +5,477.

At the matched hull-active flight peak f904:

| Pattern | World/row stage Δ | Hull-contact stage Δ | Effect publication Δ | Remaining stages + final tail Δ | Total Δ |
| --- | ---: | ---: | ---: | ---: | ---: |
| P1 | +291 | +46 | +328 | +7 | +672 |
| P2 | +382 | +46 | +379 | +15 | +822 |
| P3 | +291 | +46 | +328 | +7 | +672 |

DMA fetch structure is unchanged: no new display-list instruction, charset,
PMG allocation or DLI. DMA/interrupt interleaving can move elapsed cycles
between stages even where instruction work is unchanged.

| Gate / scope | Main | Each spike pattern | Result |
| --- | ---: | ---: | --- |
| Maximum full flight-route frame | 31,217 | 31,226 | below 31,500 target and 32,568 hard gate |
| Maximum full contact-route frame | 30,880 | 30,883 | below both limits |
| Minimum fence, flight route | 4,147 | 4,123 | ≥500 |
| Minimum fence, contact route | 4,098 | 4,086 | ≥500 |
| Distinct misses / shifted-phase rows | 0 / 0 | 0 / 0 | PASS |
| Extra VBI / DLI ordering errors | 0 / 0 | 0 / 0 | PASS |
| Normal computed CPU/DMA/fence/block/window/disk gates | PASS | PASS, all three | release evidence remains pending |

The normal build's separate DMA-off CPU-reference maximum is 15,116 on main;
P1/P2/P3 are **15,745 / 15,491 / 15,741** (+629/+375/+625). It is not a native
capital peak and is not added to the wall measurements.

## Per-routine CPU attribution

Documented-instruction execution, paired identical row/player/difficulty/
health states on main and spike. These are measured CPU cycles with DMA off.

| Pattern | Worst newly admitted contact, main → spike / Δ | Largest row-draw increase | Prepared-row extra publication |
| --- | ---: | ---: | ---: |
| P1 | 49 → 2,496 / +2,447 | +447 | +50 |
| P2 | 49 → 2,469 / +2,420 | +361 | +50 |
| P3 | 49 → 2,430 / +2,381 | +445 | +50 |

P1's +2,447 breaks down without double counting: safe-corridor helper +21;
three visible-row conversions +198; allied/enemy module resolvers +828;
new boundary wrappers including extent decoding +684; canonical damage/HUD
+214; contact-loop/call overhead +502. The resolvers include 288 cycles of
module selection; wrappers include 345 cycles of extent decoding; damage
includes 115 cycles of HUD refresh. Those nested values are not added again.

P1's +447 draw peak is +8 in the relocated original body (branch/page layout),
+115 extent decoding and +324 strip/wrapper work. P2 is cheaper because only
one side protrudes. There is no promise that production relocation preserves
these exact costs. D7's +900–2,000 peak estimate is exceeded by **381–447 CPU**
in the worst newly admitted contact, while the measured PAL gates remain safe.

## Bytes versus D7

| Resource | D7 estimate | Measured spike, all patterns | Interpretation |
| --- | ---: | ---: | --- |
| Existing resident-segment code growth | 60–160 B resident | 0 B segment growth | equal-size hook substitutions; spike code entirely in free window |
| Capital-phase code | 180–420 B | 555 B | includes duplicate 191-B original renderer; 364 B after subtracting that duplicate, before production integration |
| Capital data/state | 128–256 B | 193 B | 60 descriptors +5 scratch +128 strip backing |
| Total new allocation | 368–836 B combined envelope | 748 B | `$B478-$B763`; 407 B of permitted range remain |
| Transport payload | 384–896 B | +384 B / +3 occupied sectors | 210→213 sectors; initial 101 sectors unchanged |
| ATR file size | fixed disk image | 133,136 B, unchanged | occupied payload is the relevant disk cost |

**Physical residency:** the spike's entire **748 B** is boot-loaded and stays
allocated outside the capital phase too. “Capital-phase code” above identifies
its purpose; it is not a claim that this throwaway loader reclaims those bytes.
Physical RAM/residency delta is **+748 B**, with zero growth in the pre-existing
resident segments. L2's actual phase overwrite/reload contract is future work.

Window LZ stream grows by **507 / 513 / 503 B** for P1/P2/P3. Zero padding at
the displaced original renderer compresses better, so these stream increases
are not the net disk-sector delta. No new transport record or mid-sector read.
Normal MAIN/BROADSIDE/ENTITY_CODE free tails remain **17 / 3 / 5 B**.
The unreserved permitted-window tail is **407 B**, not the manifest's larger
whole-window free count that also includes other phase allocations. The five
bytes at `$B8FB` remain reserved.

## GIFs and ATRs

| Pattern | Native MEDIUM GIF | Playable ATR copy |
| --- | --- | --- |
| P1 | [14-second taper](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p1-flight-medium.gif) | [P1 ATR](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p1-gentle-taper.atr) |
| P2 | [14-second alternating bulges](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p2-flight-medium.gif) | [P2 ATR](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p2-river-raid.atr) |
| P3 | [14-second gates](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p3-flight-medium.gif) | [P3 ATR](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p3-gates.atr) |

[Four-second P1 contact: damage and widening-edge clamp](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p1-contact-medium.gif).
Raw emulator images are cropped to 320×240; no geometry mock-up or image
synthesis. GIF manifests record PAL frames, timing and ATR hashes.

Build paths, with the same bytes as the tracked copies:

```text
/Users/marcinkrzetowski/Projects/dark-fighter/build/spike-nacelles-p1/void-strike-65.atr
SHA-256 e68cf6a455b876208fd30a7eb0e8fcf5339081433b9d0b2d5a52d2faa08fd492
/Users/marcinkrzetowski/Projects/dark-fighter/build/spike-nacelles-p2/void-strike-65.atr
SHA-256 0b416633be0729e4422a6048f4ae8e29b16b566d2d2aa3c8dae28c448ef6c282
/Users/marcinkrzetowski/Projects/dark-fighter/build/spike-nacelles-p3/void-strike-65.atr
SHA-256 27580e3f2a4e3d54b7a23b3254201845ecbbe622685e9f11b28f38c411772f94
```

Run any with `atari800 -xl -pal -nobasic <path>`. The ATR is the playable
artifact; no XEX is supplied.

## Production recommendation and owner choices

Use P1 as the initial production candidate: its long shoulders telegraph the
new edge, and EASY's 80-HPOS free channel is generous. P3 is the alternative
if the owner prefers distinct landmarks. Retain the source-boundary SW model,
separate strips, three-row intersection and narrowed fast reject. Keep contact
semantics exactly as BU.2 specifies.

Put production capital code, extent data and scratch in L2's
**`$1900-$1FFF`**, loaded with the level and overwritten during boss phases;
M4 must reload it at the next level start. C selects pattern/difficulty policy
at entry; ASM publishes strips and executes contact. Do not carry the spike's
191-byte duplicate renderer into production: preserve the existing body and
use a small displaced-instruction trampoline or a reviewed same-size hook.
After removing that duplication, the measured starting point is 364 B code
plus 193 B data/state; entry C, trampoline, schema and integration bytes still
need linked measurement. These are not a certified L2 allocation or a promise
that the repair dock and future features fit alongside it.

Open owner choices:

1. **Pattern/look:** P1, alternating P2, or P3; flat reused fill versus replacing
   an existing surface slot with a more ribbed nacelle texture. No spare glyph
   allocation has been assumed.
2. **Width:** keep EASY at ten cells per side and MEDIUM/HARD at eleven, or
   choose shallower widths after real-hardware play. Owner play decides
   passability/telegraphing; this report proves geometry, not accessibility.
3. **Weaving:** accept P2 as optional alternating shoulders, or revisit the
   depth/scope constraint in a later owner decision if mandatory steering is
   wanted. A two-column shoulder cannot block the common central corridor.

Known limitations: sampled native routes are not exhaustive gameplay timing;
actual damage changes subsequent route state; the original logical 8-HPOS
contact envelope remains narrower than the approximately 16-HPOS visible ship;
flat surfaces and eight-row steps are spike art. No boss/shared-spawn code was
touched, no L2 loading was implemented, and no hardware smoke or release
certification is claimed. Full tests, full wall-trace suite, stage-2 evidence,
reconciliation, release build and boss stress were not run.

`docs/STATUS.md` intentionally retains the accepted L1 baseline. NEXT TASK:
owner reviews the GIFs/ATRs and chooses a production direction; L2 or any next
roadmap implementation requires separate owner direction. **STOP.**

## Review classification

- **Confirmed spike issue, fixed:** the first publisher recorded strip data but
  wrote extra cells directly. `cc24798` makes the records the publication source;
  all final native measurements and captures were regenerated.
- **Regression check:** no detected contact/publication regression in the focused
  checks; flag-off campaign ATR is byte-identical. This is not an exhaustive
  gameplay certification.
- **Optional improvement:** ribbed/segmented surface art within existing glyph
  slots and less regular descriptor spacing.
- **Deferred:** production C entry policy, L2 integration/placement, owner pattern
  and width selection, and real 65XE/SIO2SD smoke.
