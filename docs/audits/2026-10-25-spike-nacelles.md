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

## P5 islands — owner-directed replacement for P4

**OWNER-SMOKE CANDIDATE, throwaway only.** P4 was dropped by the owner;
P5 is one additional pattern on the same unmerged spike branch. Only the
report is intended for a later owner-controlled transfer to main. The
normal campaign remains byte-identical. Evidence and three native GIFs are
in [the P5 evidence](https://github.com/Setech-pl/void-strike-65/tree/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p5).

### Why P4 was dropped

A six-column extension still leaves the centred ship safe, regardless of the
three collision rows, module joins or eight-row side offset:

| P4 extreme | HPOS |
| --- | ---: |
| Left boundary, nine base cells + six extra | 108 |
| Right boundary, nine base cells + six extra | 148 |
| Common safe origins for the 8-HPOS collision footprint | 108–140 |
| Centred player origin / footprint | 124 / 124–131 |

Reaching that footprint requires at least eleven extra columns. With both
opposing base hulls at least five cells deep, forcing the centre would then
leave at most fifteen free cells, conflicting with EASY's sixteen-cell
minimum. The owner rejected both proposed relaxations and chose detached
islands instead. No P4 runtime or ATR was created.

### P5 geometry and publication

The base hulls are unchanged; P1 nacelles are **not combined** with P5.
Each row has zero or one central island interval. The 48-row fragments start
at source rows **96, 208 and 320**, with **64 completely clear rows** between
them. Their six eight-row parts have half-widths **1, 2, full, full, 2, 1**.
The tips and shoulders are visible before the full body, and every fragment
covers centred HPOS origin 124. Unlike P1–P3, this geometry requires steering.

| Difficulty | Full island width | Island HPOS interval | Minimum side channel, each side | Visible ship clearance per side channel |
| --- | ---: | --- | ---: | ---: |
| EASY / ROOKIE | 6 cells / 24 HPOS | [116,140) | 8 cells / 32 HPOS | 16 HPOS beyond a 16-HPOS ship |
| MEDIUM / PILOT | 8 cells / 32 HPOS | [112,144) | 7 cells / 28 HPOS | 12 HPOS |
| HARD / ACE | 10 cells / 40 HPOS | [108,148) | 6 cells / 24 HPOS | 8 HPOS |

These minima include the intersection across all three collision rows,
every fine-Y alignment, both hulls' offset, joins, entry and exit. They are
free geometry widths, not legal-origin interval widths. The existing logical
collision envelope remains 8 HPOS × 15 scanlines; the visible ship is about
16 HPOS wide.

At the unchanged 0.4/0.45/0.5 rows per PAL frame, the two leading eight-row
parts provide **40 / about 36 / 32 frames** before full width. The 64-row gap
is **160 / about 142 / 128 frames**. EASY retains over 152 frames after
allowing the three-row footprint; crossing between the capture pilot's
92/152-HPOS lanes takes **30 frames** at two HPOS/frame. The native flight
route demonstrates crossing between islands. Owner play still decides feel.

Fragments use the existing **allied steel hull fill glyph `$3B`**, in the
hull's palette, as large detached plates. No new glyph or charset slot was
allocated. A bespoke bevel/edge texture would require repainting an existing
surface slot or a separately approved slot allocation; it is not present here.

There is one original renderer body in place. An **8-B displaced-instruction
trampoline** replaces the old spike's 191-B body copy: **191 B gross / 183 B
net saved by that mechanism**, before other P5 differences. P5 extends its
row publication and copies the central geometry through both prepared-row
publication and the bounded hull-only copy fallback. Immutable pattern and
difficulty remain bound by the existing coordinate/phase/physical-row key.

### Collision and ordinary-frame cost

The island test runs **before** the base-hull fast reject. A widest-interval
reject cheaply accepts either side lane; otherwise it decodes at most three
source-row intervals. Because all intervals share a centre, their union is
represented by the greatest half-width. Overlap pushes toward the nearer
side, with exact ties going left. Canonical two-unit HULL damage, HUD refresh,
lifecycle and 25-frame cooldown are unchanged. Base hull boundaries retain
their original fast reject; it cannot bypass the preceding island test.

Measured documented-NMOS-6502 routine execution, DMA off:

| Difficulty | Maximum ordinary no-contact increase vs main | Maximum complete island-contact call | Maximum row draw |
| --- | ---: | ---: | ---: |
| EASY | +500 CPU | 790 CPU | 1,920 CPU |
| MEDIUM | +500 CPU | 790 CPU | 1,921 CPU |
| HARD | +503 CPU | 793 CPU | 1,921 CPU |

The **+1,000-cycle ordinary island-test STOP limit is not reached**. These
are routine costs, not total frame deltas: row drawing, cache publication,
projectile composition and differing damage/effect states can make a complete
ordinary frame's delta exceed 1,000 cycles.

Focused execution checks PASS: **93,618 island overlaps**, **62,142 safe-gap
cases**, **23,082 base-edge cases**, **93,618 cooldown rechecks**, **2,928
cache-hit/miss cases**, and **3,582 centred overlaps**. No missed island or
base contact, no side-channel damage, and correct nearest-side clamp. Forbidden
`$B8FB-$B8FF` and `$549E-$54BD` canaries and immutable code/data remain intact.
A leftward clamp uses the required legacy 8-HPOS logical envelope, so the
wider visible wing can overlap the plate visually; collision width was not
silently enlarged.

### Debris policy, audit and carry-in

The owner explicitly approved the sole shared admission change, behind
`SPIKE_NO_CAPITAL_DEBRIS`. P5 and the no-island control compile it; the normal
campaign does not. The Director now obeys `HAZARD_DEBRIS_MASK` unconditionally
in those builds. Linked `DIRECTOR_C_CODE` is **614 B versus 623 B: −9 B**,
with **zero new state**. Its area's free tail grows from 2 to **11 B**.
No other debris movement, rendering or shared spawn code changed. No boss
code or boss/shared-entry guard changed.

Only the capital sector's compiled debris bits are cleared. Space-sector
hazards and authored source files are untouched; SPACE debris remains usable
for the future data-only asteroid sector.

Every authored level source was audited (`level-01.json`, `level-02.json`),
including omitted fields whose default is zero:

| Level / one-based sector | Kind | `hazards.debris` | Would unconditional mask handling change current behaviour? |
| --- | --- | --- | --- |
| Level 1, sector 7 (index 6) | boss | omitted → 0 | No: the mask already blocks debris on the normal boss path, with capital state ≥DRAIN/OPEN. |

There are **no other zero-debris sectors** in the authored data; level 2 has
none. In particular, both authored capital sectors currently request debris.
The complete enumeration is `p5/debris-zero-audit.json`. A future authored
capital with debris zero would change behaviour under the production fix.

No carry-in guard was added. On both final P5 native routes, carried debris
persists **0 frames after actual hull admission on EASY, MEDIUM and HARD**.
For comparison, clean-main flight routes have **48 / 0 / 1 frames** of live
debris immediately after hull admission; they can also admit new debris.
The Director's earlier schedule handoff is recorded separately in JSON,
rather than being confused with the first active hull frame.

A focused worst-case carry test starts debris at its earliest Y=16, never
shoots it, and runs the unchanged 3/5 vertical cadence with VY=8. It leaves
after **47 world rows**, or **118 / 105 / 94 active PAL frames** from a zero
accumulator. World/hull phase skew is bounded by one row, so it is gone by
hull row 48. The first island **approach itself** starts at row 96. Thus even
an earlier capital admission with live debris cannot overlap an island or
its approach. Pauses freeze both geometries. **Smallest required guard: none,
0 B / 0 cycles**. No cleanup or drain was implemented.

### Projectile behaviour and backing

All three existing projectile classes **pass over** the islands. No projectile
collision or renderer code was changed. Normal/hostile PairShots and broadside
shells temporarily replace their character cells; Spread composes the shot
over the saved surface. The normal opaque-cell cutout is visible while a shot
occupies a plate, then restores; it is not persistent backing damage.

| Focused pass-over case | Extra render CPU versus blank underlay | Restore result |
| --- | ---: | --- |
| Normal player PairShot | +8 | exact |
| Spread player PairShot | up to +445 | exact, including composed glyph |
| Enemy P1/P2 PairShots | 0 | exact |
| Allied/hostile broadside shells | 0 | both cells exact |

**82** backing/phase cases pass, plus explicit physical ring reuse and the new
full-width hull-only fallback. Native checks inspect **1,776,012 unoccluded
central cells**, including blank rows after fragments: **zero mismatches or
ghost plate cells**. Live owner records account for projectile/effect
occlusion. Native routes include **271 player-shot crossing frames** and
**872 broadside crossing cell-frames**. Fighter-enemy shots are drained before
capital admission, so their pass-over case is isolated execution evidence,
not a claim that those shots spawned in the capital route.

No Light or active pickup is admitted on island-visible frames; the existing
capital Light ceiling is zero, active pickups are retired at sector entry and
pending pickups stay frozen outside OPEN. Debris admission is off and carry-in
is gone before the first tip. Native checks confirm these conditions. No spawn
lane or pickup lifecycle code was edited.

### Native frame measurements

**EMULATOR-MEASURED**, DMA on, from packed ATRs in the in-repo Atari800 PAL
build. Eighteen focused 2,300-frame routes: clean main, debris-off/no-island
control, and debris-off/P5; flight and deliberate-contact policies on all
three difficulties. All finish capital traversal without reaching a boss.
The policies use ordinary joystick/FIRE input; they do not patch gameplay
state. Early-capital FIRE is released through source row 80 to avoid shooting
carried debris. Identical policies run on all three artifacts.

Flight-route **full Director capital sector**, including the fighter-to-capital
handoff and the end of the sector. Averages are elapsed main-loop wall cycles:

| Difficulty | Main peak / mean | Debris-off control peak / mean | Mean freed by debris removal | P5 peak / mean | P5 mean over control | P5 net mean vs main |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| EASY | 30,248 / 11,864.0 | 30,248 / 11,494.2 | 369.8 | 30,256 / 11,863.4 | +369.1 | −0.6 |
| MEDIUM | 30,015 / 12,786.1 | 30,015 / 12,664.1 | 121.9 | 30,011 / 13,093.5 | +429.4 | +307.5 |
| HARD | 29,202 / 13,951.1 | 29,108 / 13,558.9 | 392.1 | 29,105 / 14,012.7 | +453.8 | +61.6 |

Full-sector peak deltas, debris-off versus main: **0 / 0 / −94**; P5 versus
main: **+8 / −4 / −97**. Handoffs dominate those peaks. These are route-level
net savings, not a pure debris-routine instruction subtraction: freeing its
hazard cost changes subsequent shell admission and removing collisions can
change damage/effect state.

The next table separates hull-active flight work. Peak-to-peak deltas compare
the same policy; same-frame deltas at the P5 peak are retained in JSON:

| Difficulty | Main hull-flight peak → P5 peak (peak Δ) | Same-frame P5 Δ |
| --- | ---: | ---: |
| EASY | 14,892 → 15,633 (+741) | +741 |
| MEDIUM | 16,843 → 16,600 (−243) | +724 |
| HARD | 16,370 → 16,844 (+474) | +810 |

Worst requested P5 cases across the flight/contact routes; each parenthesised
delta compares the identical main route/frame:

| Difficulty | Ordinary, islands visible, no contact | Actual island edge attempt | Hull row advance | Damaging island contact | Player shot crossing |
| --- | ---: | ---: | ---: | ---: | ---: |
| EASY | 13,631 (+1,225), f1522 flight | 14,354 (+3,863), f1262 contact | 11,743 (+884), f1223 contact | 13,784 (+1,130), f1212 contact | 14,354 (+3,863), f1262 contact |
| MEDIUM | 16,354 (−489), f1111 contact | 14,529 (+2,935), f1175 contact | 14,015 (+1,698), f1127 contact | 14,390 (+2,887), f1139 contact | 16,354 (−489), f1111 contact |
| HARD | 16,216 (+1,672), f1055 contact | 17,001 (+837), f1087 contact | 13,192 (+1,665), f1066 contact | 14,550 (+678), f1083 contact | 17,001 (+837), f1087 contact |

The EASY f1262 edge/crossing frame includes respawn and invulnerable clamp;
it is not fresh HULL damage. Ordinary frames can include a fragment elsewhere
on screen while all tested player rows are clear. Post-contact route deltas
include changed projectile, damage and effect state. The isolated +500–503
CPU test bound above is the relevant ordinary-test STOP check.

All normal computed gates pass for both spike builds. All native routes pass:

| Difficulty | Largest complete P5 route frame | Minimum P5 fence margin | Distinct misses / shifted rows | Extra VBI / DLI anomalies |
| --- | ---: | ---: | --- | --- |
| EASY | 30,692 | 5,109 | 0 / 0 | 0 / 0 |
| MEDIUM | 31,167 | 4,086 | 0 / 0 | 0 / 0 |
| HARD | 31,422 | 3,861 | 0 / 0 | 0 / 0 |

Every frame remains below the **31,500 target** and **32,568 hard gate**;
every applicable fence exceeds **500**. The 31,422 maximum is a full-route
figure, not the 17,001 hull-active maximum. DMA fetch layout, PMG allocation,
VBI and DLI code are unchanged. The build's separate DMA-off reference peak
is **16,126** for P5 versus **15,116** for both main and debris-off control;
that reference is not a measured capital frame or the island-test delta.

### Bytes and L2 production estimate

| Resource | P5 vs clean main | Delta vs P1 |
| --- | ---: | ---: |
| Existing resident code | −9 B | −9 B |
| Capital/island code | 291 B | −264 B versus 555 |
| Immutable pattern/offset data | 195 B | +135 B versus 60 |
| Scratch/state | 8 B | −125 B versus P1's 5+128 |
| New window allocation | 494 B | −254 B versus 748 |
| Net physical residency | +485 B | −263 B |
| Permitted window remaining | 661 B | +254 B |
| Occupied disk payload | +256 B / +2 sectors | −128 B / −1 sector |
| ATR size | 133,136 B, unchanged | 0 |

P5 lives at `$B478-$B665`; `$B666-$B8FA` remains free. No original renderer
body is duplicated. The no-island debris-off control has only the **−9-B**
resident change and **zero occupied-sector growth**. P5's physical allocation
remains boot-resident in this throwaway build; it is not already an L2 overlay.
All pre-existing MAIN/BROADSIDE/ENTITY_CODE tails remain **17 / 3 / 5 B**.

Production should keep this bounded interval test and row publication in the
future **`$1900-$1FFF` L2 module (1,792 B)**, with C selecting authored pattern
policy at entry. The measured P5 starting point is **494 B code/data/state**;
allow an estimated **530–590 B** after entry selection, module interfaces and
level-pattern binding. That leaves **1,202–1,262 B** before the repair dock,
bonus pickups, any module infrastructure and an owner-selected reserve. It is
an estimate, not a linked proof that all L2 consumers fit. The resident debris
policy fix is separately measured at −9 B.

For M7 authoring, reuse `sectors[].hazards.debris: 0` (already defaults to 0)
and add a capital-only `sectors[].islands.pattern` identifier, default **none/0**.
A pattern selects bounded spans, full widths per difficulty, faction/surface
and gaps; the compiler must validate one interval per row, centre coverage,
three-row side-channel minima and travel time. Compile the selected geometry
with the level/L2 module; no mid-sector reads. The new `islands` field is a
**proposal**, not a field the current compiler silently claims to implement.
The ordinary build needs the unconditional-mask rule before an authored
capital debris-zero setting can work. No level source was edited here.

### Artifacts, review and stopping point

Native GIFs, all at 320×240 and PAL speed:

- [EASY, 14 seconds](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p5-flight-easy.gif)
- [HARD, 14 seconds](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p5-flight-hard.gif)
- [EASY contact, 4 seconds: HULL 4→2 and left clamp](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p5-contact-easy.gif)

One playable P5 ATR; difficulty is selectable through **OPTIONS → DIFFICULTY**:
**ROOKIE = EASY, PILOT = MEDIUM (default), ACE = HARD**.

```text
/Users/marcinkrzetowski/Projects/dark-fighter/build/spike-nacelles-p5/void-strike-65.atr
SHA-256 b51e8b2ffbd791eb0126d29c3a306a8088c06642d2633facc2374278c83e2908
atari800 -xl -pal -nobasic <path>
```

An identical [P5 ATR copy](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p5-islands.atr)
and the no-island control are committed for review. No XEX is supplied.
The final normal flag-off build reproduces campaign ATR
`410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7`.

**Confirmed fix:** the owner-approved spike admission rule now honours debris
zero. **Regression checks:** collision, cache, projectile restores, native
background and PAL gates pass on the measured paths. **Optional polish:** a
more detailed plate surface/edge using existing slots. **Deferred:** real
65XE/SIO2SD smoke, production L2 transport and M7 schema/content authoring.
No full test suite, full wall-trace suite, stage-2, reconciliation, release
build, boss or lost-target stress was run. No boss code was changed.
`docs/STATUS.md` remains the accepted L1 baseline. **SPIKE P5 COMPLETE; STOP.**

## Throttle, bottom-shot fairness and sector length

**Owner decisions after P5 smoke:** “plays excellently — real obstacles”. The
island mechanic is accepted for later production in L2; capital sectors lose
small falling debris, while SPACE keeps it. Production will have more varied
fragments built from ship elements/other objects, including enemy colours,
and a longer capital sector. These are accepted directions, not a claim that
this throwaway code has entered main. The throttle below remains an
**OWNER-SMOKE CANDIDATE**. This round changes no boss or shared spawn logic;
the already-approved spike debris admission rule is retained unchanged.

### Why the bottom shot can become unavoidable

The bottom input limit is `player_y = 225`. The rendered/capital-shell target
is **16 HPOS wide**, with inclusive raster Y **217–231**. Input moves at
**2 HPOS horizontally and 1 scanline vertically per frame**. Hull/island
contact still uses its separate legacy 8-HPOS footprint. Both capital factions'
bolts can damage the player; allied colour does not grant immunity.

A warning lasts **25 PAL frames / 0.5 seconds**. The attached warning and
muzzle descend **8 scanlines per hull-row event**. Normal difficulty rates
are **16/40, 18/40, 20/40 rows/frame**, or **3.2 / 3.6 / 4 scanlines/frame**
on average. The warning can therefore travel up to **10 / 12 / 13 rows**
(80 / 96 / 104 scanlines) during its charge. The compiler's last-admission
rows **17 / 15 / 14** prevent an offscreen launch; they do not prove an escape
for the player's current position or the island channels.

The bolt moves horizontally at **2 HPOS/frame**, character-aligned in four-HPOS
steps, with a swept **8-HPOS × 6-scanline** collision envelope. After the
attached launch flash expires, its Y is screen-fixed. **Pre-existing detail:**
the four-frame launch flash shares the row pointer, so a world-row event during
those first frames can still move the bolt down by eight scanlines. The brake
preserves this behaviour at the reduced world cadence; it does not create a
second projectile clock. Relative motion is therefore not simply “the world
slows every projectile”.

Concrete packed-P5 EASY route, zero-based gameplay frame numbers:

| Frame | Next hull source row | Player origin | Slot 0 state / X | Warning or bolt raster |
| --- | ---: | --- | --- | --- |
| 1369 | 186 | (92,225) | allied warning / 84, timer 25 | charge starts at logical row 16; `BROAD_Y=148` |
| 1394 | 196 | (120,225) | launch / 84 | cached top 217; flash 4 |
| 1397 | 197 | weaving right | flying / 90 | top becomes 225 during the attached flash |
| 1425 | 208 | (152,225) | flying / 146 | bolt rows 225–230 |
| 1426 | 208 | (152,225) | impact / 148 | swept X 144–155; HULL 4→2 |

At the decision for frame **1426**, the rightmost next player origin is 154;
the ship still overlaps swept X 144–155. Left/neutral also overlap. One UP
step leaves raster 216–230, still intersecting the bolt. DOWN is clamped.
All **nine legal joystick directions** therefore hit on that frame, confirmed
with the linked NMOS collision routine. Clearing vertically upward needs
**7 frames** (origin ≤218); there is only one frame left. MEDIUM frame 1191
and HARD frame 1614 provide analogous nine-direction traps with bolt raster
217–222: upward clearance then needs **15 frames**, while downward clearance
would require origin ≥231, beyond the bottom limit.

More generally, no immediate escape exists when every reachable next origin
`X±2, Y±1` (clamped to the playfield and constrained by hulls/islands) overlaps
the swept bolt rectangle. A longer-horizon escape also fails if the first
clear vertical position takes longer than impact and the horizontal route is
closed by a hull or fragment. Matching the bolt's speed by running away is
not a permanent escape from a finite side channel.

This is **late commitment**, not evidence that the entire original warning was
unavoidable. The counterfactual reachability check finds safe routes from the
two bottom-overlapping EASY launches captured here, including the initial
flash's vertical movement. The first example has **57 frames from initial
warning to damage**. This is one-shell reachability, excluding simultaneous
damage sources, not a proof of a globally safe path. The brake improves advance
control and where the warning
finishes; it cannot rescue every already-launched point-blank bolt. No aiming,
damage rectangle or friendly-fire rule was changed to hide this limitation.

### Brake implementation and clock ownership

Build with `--spike-nacelles=5 --spike-throttle`. Holding DOWN at origin Y=225
in capital states ENGINES through COMPLETE asks for half speed. The C policy
moves the numerator by **one per frame**, retaining both fractional residues:

| Difficulty | Normal → braked rows/frame | Ramp in / out | Fully braked warning travel, maximum |
| --- | --- | --- | ---: |
| EASY | 16/40 → 8/40 (0.4 → 0.2) | 8 frames / 160 ms | 5 rows |
| MEDIUM | 18/40 → 9/40 (0.45 → 0.225) | 9 frames / 180 ms | 6 rows |
| HARD | 20/40 → 10/40 (0.5 → 0.25) | 10 frames / 200 ms | 7 rows |

Release DOWN or move above the bottom to ramp back. OPEN and DYING reset to
normal immediately; pauses freeze the policy with gameplay. There is no
latched input or slow state to clear later. The original eight-scanline coarse
scroll steps remain; the ramp avoids accumulator resets or an extra position
jump, rather than adding a new fine-scroll renderer.

C owns input/ramp policy; ASM consumes one cached numerator. Its call executes
before the unchanged enemy tick, collisions and the early `world_rotate_due`
predictor. That predictor and `update_starfield` use the same cached value.
World and hull accumulators remain equal on **every measured frame**. The
ring, islands, hull contact rows, turret tracking, warnings, attached flashes,
row-relative debris carry and Director world-row clock all consume their
existing row events. No renderer, VBI/DLI, boss, breakup or spawn policy changes.
The coarse starfield follows the world; existing independent near-star motion
is retained.

**Timers remain deliberately mixed:** sector traversal, Director sector rows,
reaction/recovery and row-based spacing slow in real time. The provisional
12-row broadside reaction floor is approximately **30/27/24 frames normally**
and **60/54/48 while braked**. Broadside schedule delay counts eligible
candidate attempts; warning countdowns, launched horizontal flight, launch-flash
lifetimes, weapon bursts, damage cooldown and animation/audio timers retain
frame semantics. Thus the player gets more real time per hull distance and
fewer row-budgeted admissions per second. There is no catch-up burst on
release and no independent Director frame timer that prematurely ends capital.

To enable the same mechanic in SPACE, remove the C capital-state gate and
validate SPACE debris, Light/Heavy movement, pickups and fire pressure against
the slower world. The normal rates already equal `world_scroll_rates * 2`,
and the predictor already reads the shared cache, so no additional clock or
state is needed. Removing that guard is estimated to save about **7 B**;
this is not implemented or SPACE-verified. Frame-based enemies/projectiles
would become faster relative to the world, a gameplay change requiring owner
smoke. Boss loops remain outside this proposal.

### Measurements and correctness

**EMULATOR-MEASURED, DMA ON:** six focused 2,800-frame packed-ATR routes,
P5 with throttle OFF and ON on all three difficulties. Both have islands and
capital debris disabled. DOWN/release windows are fixed gameplay-frame windows;
horizontal weaving uses the same row-driven policy in both builds. They are
the same controller, not a claim of identical positions after scroll rates
diverge. All routes finish the full capital sector including its handoff.

| Difficulty | OFF sector peak / mean | ON sector peak / mean | Peak / mean Δ | ON frames at half speed |
| --- | ---: | ---: | ---: | ---: |
| EASY | 30,256 / 12,075.2 | 30,253 / 11,220.3 | −3 / −854.9 | 673 |
| MEDIUM | 30,011 / 13,295.4 | 30,015 / 12,189.4 | +4 / −1,105.9 | 707 |
| HARD | 29,105 / 14,215.1 | 29,105 / 12,858.6 | 0 / −1,356.5 | 733 |

| Difficulty | Worst slowed / mean | Worst ramping / mean | Mean at normal speed, active hull | Complete-route maximum / minimum fence |
| --- | ---: | ---: | ---: | ---: |
| EASY | 14,076 / 8,172.9 | 12,342 / 9,213.9 | 9,627.9 | 30,841 / 5,063 |
| MEDIUM | 15,631 / 8,796.2 | 14,044 / 9,486.0 | 10,883.0 | 31,206 / 4,029 |
| HARD | 15,766 / 9,179.7 | 14,945 / 10,774.0 | 11,311.8 | 31,434 / 3,807 |

Fewer row events make slowed frames cheaper on average despite the input
policy's overhead. These means include differing warnings, collisions and
effects, not an isolated instruction saving. Handoffs dominate full-sector
peaks. The maximum complete route has **66 cycles of target headroom**.
All computed normal-build gates PASS; all measured frames remain below target
**31,500** and hard **32,568**, all applicable fences exceed **500**. Distinct
misses, shifted phases, extra VBI and DLI anomalies: **0** throughout.
The separate build DMA-off reference peak is **16,207** versus P5's **16,126**;
it is not a capital DMA-on frame.

**Instruction-model measured CPU:** C policy including its JSR is **33** in
SPACE, **94** ramping in, **91** holding slow, **95** ramping out and **88**
holding normal in capital; the conservative invalid-state recovery maximum
is **107**. The wrapper tail jump adds 3 cycles; cached capital rate selection
saves 10, giving ordinary capital overhead **+81 to +88 CPU** before reduced
row work. An early rotate prediction, when called, adds **2 CPU**.

Focused checks pass: **73,728 policy cases**, **1,200 accumulator predictions**,
all ramp steps, release, death/OPEN resets and **768 alternative-warning cases**.
The P5 exhaustive collision/cache checks and 82 backing cases also pass against
the throttle artifact. Native checks cover hull/island publication, exact
world/hull residues, shell logical pointers and raster caches, with no orphan
shell cells or unexplained missing cells. Normal player-shot occlusion of a
shell is classified separately; it is not treated as backing damage. The
raw `broad*_raster_row` snapshot refers to the earlier ANTIC-list observation
phase and is not incorrectly compared with a newly published row's cache.

An initial synthetic-build failure was the new rate byte's MEDIUM preset in
a harness that enters capital directly on HARD. An invalid zero sentinel now
selects the correct difficulty on the first policy call. No harness assertion
or computed gate was removed or relaxed. The normal flag-off ATR remains
exactly `410652973ed76f0033f0fbff84c17a484104f95ff97cbcc1d9eff9e6cb996ae7`.

### Independent cheap warning alternative

Implemented only because it is **23 B**, within the 24-B cap, under the
separate `--spike-fair-warning` flag. It is mutually exclusive with the throttle
comparison and **OFF in the delivered throttle ATR**. At warning admission,
player origin Y≥201 selects **35 rather than 25 frames**. C performs the
policy and timer store without stack helpers, preserving the caller's slot X.
It adds **zero state** and **30 CPU at admission**, with zero extra policy work
on ordinary frames. Its normal build and all threshold/slot checks pass; no
additional native route set was run for this optional comparison.

This adds 0.2 seconds of advance warning without a new player control. It
keeps the original visibility expiry: a charge which leaves the bottom before
launch is released, so some near-bottom shots are effectively suppressed.
The extra warning lifetime changes time spent rendering warnings and the
shot cadence; it does not slow a launched bolt or guarantee escape after late
commitment. The brake is more expressive, controls hull/island approach and
reduces row-work frequency. A precise per-shot minimum-escape-time solver
would cost materially more than either small policy and is not implemented.

### Sector-length finding and production estimate

**Not data-only; no longer hull was implemented.** `hull.rows` accepts only
288/352/416/480, and capital-sector `rows` is explicitly rejected. Increasing
a sector's schedule length is ignored: capital completes on hull traversal.
Two adjacent capital records cannot form a seamless corridor: the first must
DRAIN, remove both hulls, reconstruct 28 rows and return OPEN before Director
advances. Re-entry also only resets the low source-row byte today. Chaining
would therefore show a break and needs lifecycle/reset work, not merely data.

The current geometry is **128 B: 8 header + 2×60 module IDs**. Runtime resolvers,
the C phase guard (`HI > 1`), drain module 61, entry alignment, prow/drain row
mapping, transport/checksum assumptions and P5's ≤511-row lookup all encode
this finite range. The source-row counter itself is already 16-bit.

| Future length | Module IDs per side | Minimum geometry size / growth | Current padded P5 lookup growth |
| --- | ---: | ---: | ---: |
| 720 rows (1.5×) | 90 | 188 B / +60 B | +96 B if padded to 96 entries/difficulty |
| 960 rows (2×) | 120 | 248 B / +120 B | +192 B if padded to 128 entries/difficulty |

Those geometry byte counts are exact layout arithmetic. **ESTIMATE:** an
in-place finite-hull extension needs roughly **32–80 B additional target code**
for widened phase/address/entry/lookup handling, plus the table growth above,
compiler/format changes and focused verification. Disk rounding/packing is
not measured because no extended artifact was built. A compact production
span descriptor can avoid padding every island table; this estimate is not a
linked L2 fit proof. Seamless chaining is a larger lifecycle change and is
not the recommended shortcut.

| This round's item | Code | Immutable data | State | Net allocation / disk growth vs P5 |
| --- | ---: | ---: | ---: | ---: |
| Throttle | 101 B C + 6 B veneer | 6 B | 1 B | +114 B / +128 B, one occupied sector |
| Independent warning alternative | 23 B C | 0 | 0 | +23 B / +128 B, one occupied sector |
| Longer sector | not implemented | not implemented | 0 | estimates above only |

Main-loop/predictor/STARFIELD hooks replace existing bytes without growing
those reservations. Throttle total window use is **608 B**, at
`$B478-$B6D7`, with **547 B** free through `$B8FA`. Capital/island/throttle
code totals **398 B**, immutable data **201 B**, scratch/state **9 B**.
Retaining the debris admission reduction gives **+599 B physical residency
versus clean main**, and **+384 B / 3 occupied sectors** of disk payload.
The five reserved bytes at `$B8FB` and M3-H's reservation remain untouched.

For production, put the **114-B** brake policy/veneer/data/state in the
fighter/capital L2 module: it must be callable during OPEN as well as capital.
Adding it to the prior P5 estimate gives **644–704 B**, leaving **1,088–1,148 B**
of the shared 1,792 B before dock, bonus, longer-hull work, new graphics and
infrastructure/reserve. Existing call sites need no new resident bytes;
alternatively keeping the policy resident costs those same 114 B of scarce
resident space. The optional warning alternative adds 23 B if selected later.
No production placement or simultaneous-consumer fit is certified here.

### Review artifacts

[EASY brake GIF, 8 seconds](https://github.com/Setech-pl/void-strike-65/blob/codex/spike-nacelles/docs/diagnostics/spike-nacelles/p5-throttle-bottom.gif):
normal speed at the start; DOWN at relative 1.0 seconds, half speed at 1.14;
release at 5.0, normal again at 5.14. No artwork or gameplay-state patches.

```text
/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/spike-nacelles/p5-throttle.atr
SHA-256 6298ab3d1f1794d30c369683337a474d02793a31a58f8b84fa4938a209e068a1
atari800 -xl -pal -nobasic <path>

/Users/marcinkrzetowski/Projects/dark-fighter/docs/diagnostics/spike-nacelles/p5-throttle-bottom.gif
```

The ATR contains islands + capital debris off + throttle; the optional warning
alternative is off. OPTIONS → DIFFICULTY: ROOKIE/EASY, PILOT/MEDIUM (default),
ACE/HARD. Hold DOWN at the bottom to brake; release to restore normal speed.
The geometric sector remains 480 rows for the data-only constraint above.
Raw evidence, exact peak frames, reproduction and limitations are in
`docs/diagnostics/spike-nacelles/throttle/`. No full test suite, full wall-trace
suite, stage-2, reconciliation, release, boss or lost-target stress was run.
Owner hardware smoke of this new throttle remains pending. No merge.
