# Void Strike 65 runtime architecture

This document describes the current released runtime. Exact address ownership
is in [memory-map.md](memory-map.md), performance evidence in
[runtime-headroom.md](runtime-headroom.md), and historical experiments in
[history/](history/).

## Hybrid C foundation — 2026-09-15

**Hybrid C Director is owner-accepted and is now the project foundation.**
Branch `experiment/hybrid-c-director` integrates cc65 into the existing
ca65/ld65 and DFMC build. C owns the 1:1 Encounter Director, high-level sector
state/lifecycle, both current Raider lifecycle records, and the compact Raider
`EnemyArchetype`. ASM still owns the Atari hardware kernel, coordinates and hot
movement, collisions, PMG/PairShot publication, raster, audio and hardware
writes. Detailed ownership, ABI and placement are defined in
[hybrid-c-architecture.md](hybrid-c-architecture.md).

The expanded deterministic A/B has zero divergences across 12,488 compared
frames. The unchanged native replay completes at 28,505 cycles, 26 cycles above
the accepted hybrid baseline and below both PAL gates. New archetype/lifecycle
code occupies the legal post-startup `$8C7D-$8E84` range; its packed cold source
uses `$7810-$79B6` before starfield staging reclaims that range. The loader
format and BASIC RAM policy remain unchanged.

## Target and artifact model

Void Strike 65 targets a stock 64 KB Atari 65XE in PAL mode with documented NMOS
6502 instructions. The runtime owns the machine after startup, uses joystick
port 1, and schedules gameplay at 50 frames per second.

The build emits a dynamic initial boot block plus a versioned `DFMC` extension
manifest. The standard 90 KB single-density ATR stores only the sectors actually
used; the XEX emits the same initial block, direct final-address extension
segments, and a separate XEX entry record. Candidate, trace, final-binding, and
verify phases bind the boot BIN, XEX, and ATR by exact size and SHA-256.

## Cold startup and loader

The hybrid configuration uses a 103-sector initial block at `$2000-$537F` and
enters at `$201E` with a 449-byte raw bootstrap prefix. A
1,257-byte stage-2 overlay runs at `$21C1-$26A9`; after it validates
the complete manifest, it reads extension sectors through standard OS SIOV
while OS IRQ/NMI and disk services are still available. Each chunk is fully
read, CRC16-CCITT checked, and only then copied or decompressed to its manifest-
controlled destination. Any failure blanks DMA, selects a fixed red error
background, and halts before partially loaded code can execute.

The eight ordered DFMC records are BROADSIDE (sectors 104-148), pickup and
collision (149-155), integration glue (156-158), hybrid ABI (159-160), low C
(161-162), the packed archetype/lifecycle extension (163-166), C RNG (167), and
Director tables/high C (168-172). The extension's record is deliberately RAW:
its 423-byte payload is already an LZ stream which startup expands from
`$7810-$79B6` to `$8C7D-$8E84`. XEX stores that same staged payload rather than
the 520-byte expanded image.

ATR stages ordinary records at `$8100`; BROADSIDE expands 6,650 bytes to
`$5E10-$7809`, the 788-byte pickup/collision record publishes 904 bytes to
`$8800-$8B87`, and glue expands to `$7BD0-$7CC9` before its temporary hold at
`$8600-$86F9`. Startup consumes/publishes records in the required order:
C extension, A2 kernel, held glue, then starfield. This prevents starfield
staging from destroying either the extension source or the A2 cold source.
The ABI and low C are published only after the resident-suffix source at
`$8100-$9B13` has been consumed. The 7,743-byte suffix is stored as a
6,676-byte LZ-10/5 stream and overwrites stage 2 after validation. No loader
byte remains resident or enters gameplay.

The manifest uses 16-bit sector numbers, supports eight sequential chunks, and
accepts RAW or LZ records. The current initial block and eight records use 172
sectors (22,016 B). The ATR has 548 unused sectors (70,144 B); runtime residency
remains a separate constraint.

### DFMC v1 byte format

| Offset | Bytes | Meaning |
| ---: | ---: | --- |
| 0 | 4 | ASCII `DFMC` |
| 4 | 1 | format version, currently 1 |
| 5 | 1 | header size, 12 |
| 6 | 1 | chunk count, 1..8 |
| 7 | 1 | record size, 16 |
| 8 | 2 | total occupied ATR sectors, little-endian |
| 10 | 2 | actual manifest length, little-endian |
| 12 | 16 × count | sequential chunk records |
| final 2 | 2 | CRC16-CCITT of every preceding manifest byte, little-endian |

Each 16-byte record stores, in order: 16-bit start sector, 16-bit sector count,
16-bit packed length, 16-bit raw length, 16-bit final destination, 16-bit CRC of
the complete sector image, one-byte type (`0=RAW`, `1=LZ`), one-byte controlled
staging identifier, and a 16-bit staging address. All words are little-endian.
Production records begin at sectors 104, 149, 156, 159, 161, 163, 167, and
168. Their packed/raw lengths are 5,653/6,650 B, 788/788 B, 245/250 B,
116/117 B, 210/242 B, 423/423 B, 23/21 B, and 542/643 B. The second record
carries the PMG pickup/publication/primitive code plus the 33-byte collision
module; the obsolete character-pickup phase bank is absent. Glue is transported
to `$7BD0-$7CC9`, held at `$8600-$86F9`, and late-published to
`$4EFE-$4FF7`. The Director still ends at `$9FF7`; `$9FF8-$9FF9` is free and
`$9FFA-$9FFF` is the untouched guard.

The loader bitmap source is declarative. The build rasterizes 7,680 bytes for a
mixed ANTIC F/E screen and packs them to **1,967 bytes**. It expands to
`$4010-$5E0F`; a second LMS at `$5000` prevents a 4 KiB ANTIC boundary crossing.
A separate 35-byte stream expands the 202-byte loader display list to
`$3C00-$3CC9` only after the overlapping bitmap source has been consumed.

PMG DMA is disabled during the loader. Two DLIs select the title, ship, and
footer palette zones. The loader remains visible for 250 complete PAL frames
(5 seconds), then disables DMA/NMI, clears only the actual DMA pages
`$3B00-$3FFF`, and builds the frontend and gameplay memory.

Cold staging also copies:

- validated external broadside/runtime data to `$5E10-$7809` before takeover;
- packed starfield/music data through `$7810-$7F2A` to `$54E4-$5D44`;
- the 237-byte A2 kernel through `$7F2B-$8017` to `$9000-$90EC`, before the
  `$8000-$80FF` entity/effects clear destroys the consumed source;
- packed entity/effect/frontend code through backward boot-only staging at
  `$5318-$5DB5` to the resident `$9100-$9D57` range. The staging write begins
  at the initial-source end, so source and staging do not overlap. Its
  end-exclusive `$5DB6` remains below the BROADSIDE destination at `$5E10`.

The initial packed sources end exclusively at `$5318`. Startup copies
ENTITY_CODE backward to `$5318-$5DB5`, expands it to `$9100-$9D57`, and
immediately releases the staging range. `unpack_loader_bitmap` may then reuse
it while preparing the loader; after the loader display completes,
`unpack_starfield_runtime` expands to `$54E4-$5D44`, overlapping the already
inactive ENTITY_CODE staging range. This ordering is mandatory; the overlap is
temporal, not simultaneous residency.

The BSS is exactly `$8000-$80FF` and is initialized deterministically. The
runtime does not use `$A000-$BFFF`; compatibility never assumes that BASIC ROM
has been banked out.

## Frontend and state transitions

After the loader, the program builds dedicated gameplay, frontend, and HUD
charsets. The frontend uses mixed ANTIC text modes and contains the menu,
options, top-scores, exit, pause, and Game Over states. Menu music and gameplay
music are independent deterministic POKEY sequences. OS VBI service remains
disabled after takeover; the production runtime enables only the required DLI
NMI path.

The production H3.1 frontend uses one 1 KiB charset at `$4800` and limits all
ANTIC 6/7 screen codes to glyphs 0-63. Large headings use ANTIC 7, menu/data
rows use ANTIC 6, structural rows use ANTIC 4, and the two small control hints
use ANTIC 2. Main Menu and Options each have one DLI to select the monochrome
hint palette; TOP SCORES and Game Over use no DLI. The menu Player Fighter is a 3x2
ANTIC 4 character figure in glyphs 58-63, so frontend PMG remains disabled.
Frontend entry also clears the five GTIA graphics latches `GRAFP0-3/GRAFM`
while DMA is blanked. Disabling PMG DMA alone does not clear the last fetched
graphics byte, which would otherwise repeat vertically through the menu.

New Game performs a bounded state reset. Life loss resets life-scoped combat
state, while a live sector transition preserves session-scoped score and
booster state. Pause copies the visible screen to a reclaimed staging buffer
and freezes gameplay timers before resuming the same state.

TOP SCORES owns ten two-byte packed-BCD records in RAM. The final score is
inserted exactly once when the player lifecycle enters Game Over; a first-to-last
scan preserves descending order, places ties after existing equals, and shifts
both BCD fields together. The renderer reads all ten records rather than
synthesizing nine zero rows. The worst insertion executes once at Game Over and
costs 516 NMOS 6502 cycles; it is outside the visible gameplay loop and VBI. No
disk persistence is performed.

## Display, scrolling, and frame publication

Gameplay uses a fixed ANTIC 2 HUD and divider plus 27 ANTIC 4 logical playfield
rows. Two 90-byte A2 display lists are built and published alternately. The
first DLI selects byte three of the active A2 list before playfield DMA; the
second restores HUD state and leaves the next frame's publication to the JVB.

The divider stays at `$4028-$404F`; logical rows below it map to a 27-row
physical ring at `$8140-$8577`. World and hull scroll operations
write the recycled physical row before the new list becomes visible. All A2
heads, row wrap, and the fixed HUD boundary are therefore handled without a
visible partial list.

Every authoritative world-row event publishes exactly one full-width ring
recycle in `ENGINES` through `OPEN`. The capital side-band path then advances
its hull/muzzle lifecycle against that already-published row and never consumes
the scroll latch a second time. Far stars retain their independent 1/4 logical
step. This keeps the centre, side bands, objects and ordinary open-space scene
at one physical cadence through the entire capital exit.

Capital hulls are two independent 32x9 expanded maps assembled from engines,
aft, combat, forward, and prow modules. The broadside system owns warnings,
launch flashes, heavy projectiles, hull damage, and the sector lifecycle.
The 480-row linear hull uses one seed-controlled layout per owner: EASY,
MEDIUM, and HARD decode 8, 12, and 16 stations respectively from a compact
two-bit threshold in each 60-byte module sequence. The first muzzle is one
character row after the engine section; the remaining nested positions span
the aft, combat, and forward sections with at least 24 rows of same-side
separation. Allied and Hostile positions start from independent domains of the
Director's `5*x+1` byte LCG, generated at build time so gameplay does not
consume or perturb the Director RNG stream.
Engine pixels have two phases, `dim` and `bright`, held for eight active frames
each. Phase changes update source glyph rows atomically before a recycled base
row is published.

Tracked muzzle records keep a logical row plus an explicit fixed-divider/ring
domain as their authority. Before a world rotation, the exact previous physical
cell is restored so the fixed divider cannot copy muzzle or launch-flash codes
into the recycled row. After every head change the muzzle and attached
BROADSIDE row pointers are derived again through the logical row table; only the
current legal cell is redrawn. Warning missiles remain PMG-only and therefore
never enter ring backing.

BROADSIDE shell contact is owner-independent: Allied and Hostile fire both
enter one collision dispatcher. Owner selects travel direction and spatial
ordering only. One inclusive swept-AABB test compares the previous/current
character-aligned 8x6 bolt envelope with the complete 16x15 gameplay rectangle
of the Player Fighter. Transparent PMG corners and internal gaps deliberately remain
solid gameplay contact; exactly one HPOS or scanline outside either rectangle
remains a miss. Collision runs after shell update and before the late shell
render; a hit enters the existing IMPACT and canonical two-unit damage path.
The 25-frame cooldown and per-frame latch prevent repeat damage while the
correct slot releases normally.

Flying capital shells are a three-entry painter's stack. Each slot draws one
continuous 8x6 bolt from dedicated left/right glyph halves 126-127. The late
renderer draws slots `0 -> 2`; the next frame restores their exact cached
physical footprints in the inverse order `2 -> 0` before movement or state
transitions. Opposite-owner shells deliberately have no mutual gameplay
collision: a shared cell uses the deterministic painter order, both slots stay
FLYING, and reverse erase exposes both intact trajectories after separation.
Only player, fighter, hull, offscreen, and lifecycle events may consume them;
a ring-head wrap cannot preserve a transient shell code as backing.

## Gameplay layers and backing

Every visible gameplay row is composed in this order:

`base -> broadside -> projectile -> entity -> effect`

Erase occurs in reverse order:

`effect -> entity -> projectile -> broadside -> base`

The base layer contains the current starfield and current capital-hull row.
Broadside overlays come next. Fighter projectiles, interactive entities, and
transient effects then save and restore their backing. A cell vacated by an
overlay must contain exactly the byte that the lower layers would have produced
in the same frame.

Fighter weapons use a common one-cell PairShot record. Its fixed 8x8 glyph
shows two separated impulses, while movement, lifetime and collision remain a
single logical event. Spread uses the same path and composes one slot-owned
scratch glyph when it meets a lower character layer. The former TOP/BOTTOM
spill, reverse two-cell unwind, and final split-glyph path are absent.

## Bounded pools

| Pool | Physical capacity | Release active limit | Purpose |
| --- | ---: | ---: | --- |
| Player Fighter PairShots | 5 | 5 | four Normal/Spread or five Rapid objects; 8/8/10 visible pulses |
| Fighter-enemy PairShots | 5 | 5 | shared enemy controller and one-cell PairShot renderer |
| Combined fighter PairShots | 10 | 10 | controlled maximum; one dynamic cell per object |
| Broadside projectiles | 3 | 2 | capital fire; M1-M3 allocation remains unchanged |
| Interactive entities | 4 | 2 | debris plus one pickup capsule; controller/reserve slots remain non-rendered |
| Transient effects | 6 | 5 | debris may use one core plus four fragments; Raider destruction does not use this pool |

Pool scans are bounded by compile-time counts. Normal and Spread initialize
four PairShots, Rapid five. Their fixed glyphs preserve 8/8/10 visible pulses;
Normal uses a nine-frame interval, Spread 28, and Rapid six. Spread emits the
recognizable centre/left/right/centre sequence. All modes retain the 12-frame
post-burst pause. The effects pool is not used for pickup capsules or
persistent projectile state.

## Enemies, debris, and boosters

The movement prototype owns exactly two ordinary Raider slots. P1 draws the
first body and P2 draws the second; both use the Interceptor silhouette at its
existing double-width scale and one hostile colour, with no scanner layer. Each
slot stores its own X, Y, signed horizontal velocity, fractional 4/5-speed
accumulator, manoeuvre state/timer, and behaviour phase. Both call the accepted
single-Interceptor soft-pursuit routine, but opposite initial velocities and
phases prevent synchronized flight. Their opening manoeuvre crosses vertically
before both machines leave ahead of the unchanged first capital sector.

The current fighter proof enables the existing bounded Raider fire path. Five
enemy PairShot records share one burst controller across the formation; they
reuse the same one-cell movement/erase/render foundation as player fire while
retaining hostile colour, speed, cadence, swept collision and ten-unit damage.

Debris is the implemented interactive entity in slot 0. It has bounded
trajectories, two shapes, two tumble phases, three hit points, contact damage,
and no score award. Player/debris contact uses the full 16-HPOS width of the
double-width Player Fighter PMG, while retaining the existing vertical player envelope
and 8x8 debris box. Its single accepted damage event indexes a three-byte
Easy/Medium/Hard table containing 2/5/7 HULL units, then uses the canonical
atomic saturating damage/death/HUD path. Debris destruction may materialize the
five-slot effects envelope. Raider destruction creates no character effect and
leaves any unrelated generic effect intact. Generic effects are erased before
lower layers move. The difficulty lookup replaces the former immediate load
with `LDX abs` plus `LDA abs,X`: +6 CPU cycles only after a geometric overlap
passes the earlier latch check, with no cost on inactive or collision-miss
paths and no persistent-RAM allocation.

During the active capital traversal, the existing debris request remains slot-0
bounded and borrows the established phase-three 3/4/5 intensity ceilings for
Easy/Medium/Hard. All shared frame, reaction, recovery, allocator and RNG gates
still apply. A rejected traversal request retries after eight active frames;
successful release keeps the ordinary 64-frame repeat delay. OPEN keeps its
authored phase mask and ordinary retry, while DRAIN and COMPLETE admit no new
debris. No retry debt accumulates while slot 0 is occupied.

Slot 1 owns the sole pickup capsule. Only a lethal Raider hit attributed to
Player PairShot qualifies, and qualifying kills are ignored while slot 1 is
already PENDING or ACTIVE. There is no probabilistic drop check: every third
qualifying kill creates a capsule. The next-type selector rotates successful
creation through Rapid Fire, Spread Shot, and Shield, starting with Rapid Fire
on New Game. Slot 2 holds the non-rendered timed-booster controller and the
next-type selector. Rapid Fire and Spread Shot last 500 active frames; Shield
lasts 250.

Creation starts at Y=8 with a 30-complete-frame hidden delay. In fighter OPEN,
slot 1 requests zero-cost `DIRECTOR_HAZARD_PICKUP` admission; a rejection by the
complete, same-frame, reaction/recovery, phase, budget, or allocator gates
reloads an eight-frame retry without losing the capsule. Acceptance moves it to
Y=24, sets active-mask bit `$02`, and increments the global active count. Slot-0
debris and slot-1 pickup may coexist at the global limit of two.

The active capsule is a 16-scanline missile-PMG object in `$3B00`: M0-M3 use
four consecutive HPOS positions, `SIZEM=$00`, `PRIOR=$10` fifth-player mode,
and `COLPF3`. `ENTITY_SCREEN_HI+1` is its PMG publication latch; it is not a
character-ring writer. EASY/MEDIUM/HARD motion accumulates 8/9/10 twentieths
of a scanline per PAL frame, and release occurs at Y=240. Player overlap releases
slot 1 and activates or replaces the slot-2 booster. Life loss and gameplay
teardown clear both states. On fighter-to-capital transition an ACTIVE capsule
is released so missiles return to capital ownership, while a PENDING capsule is
preserved and frozen. It resumes retries after capital-to-fighter OPEN re-entry.
The slot-2 booster survives a live sector transition and continues its timer.

The fixed ANTIC 2 HUD uses cells `$4019-$401C` for four permanent HULL plates.
Glyph 5 is a low intact plate and glyph 12 a low cracked plate; the stored
0-10 health value selects solid quarters at thresholds 3, 5, 8, and 10. The
full `HULL` label stays at cells 20-23 and the plate field never blinks or
disappears.

Cells `$401E-$4027` are the complete ten-cell booster presentation: `BOOST`, a
blank separator, and four tall energy glyphs at cells `$4024-$4027`. The
optional type glyph is not allocated because no twelfth free cell exists.
Glyph 7 supplies the narrow vertical weapon-energy shape; Shield uses the
formally reserved dense cross-core glyph 8. Segment thresholds are exact
quarters of the active type's 16-bit timer (500 or 250 frames). Below 25%,
timer bit 3 supplies the 8+8 blink phase, so pause freezes the indicator naturally. Ten
writable backing bytes at `$5E06-$5E0F` preserve and restore the complete prior
field across refresh, replacement, expiry, life loss, and teardown. No PMG,
bitmap overlay, DLI, palette, or gameplay-charset allocation is involved.

Rapid Fire uses the shared PairShot renderer and yellow colour bank. Spread
Shot emits four one-cell PairShots in a centre/left/right/centre sequence. Side
directions are encoded in the existing render/state byte, and the parity of the
existing lifetime supplies their one-HPOS-per-two-updates fixed phase, avoiding
another allocation.

Shield leaves the normal weapon cadence active. Its separate state is checked
after `PLAYER_ALIVE` and before the ordinary 25-frame damage cooldown. A valid
absorption consumes the frame's one damage event without changing HULL, LIFE,
SCORE, hit flash, cooldown, or HULL-hit SFX. Interceptor shots disappear, broadside
shots enter their established impact state, debris is consumed, and Interceptor or
hull-contact side effects retain their prior behavior. The Shield timer also
drives a solid COLPM0/COLPM3 steel/white pulse; it never hides the Player Fighter and is
therefore distinct from respawn invulnerability.

## Character and PMG ownership

The gameplay charset has two free glyphs. Stars use 1-6, Player Fighter PairShot
compatibility glyphs 11-46, Spread Shot composite scratch 47-56, capital hulls
59-89, enemy PairShot compatibility glyphs 90-109, debris 110-117, and
fragments 118-119. Glyphs 120-125 retain their source allocation but the PMG
pickup candidate has no dynamic character-pickup compositor.
Glyphs 126-127 are the dedicated connected left/right BROADSIDE bolt halves.

The separate `$5000-$53FF` HUD charset keeps glyph 0 as the blank/separator,
uses glyphs 5 and 12 for the two low HULL plate states, glyph 7 for weapon
energy, and glyph 8 for the distinct continuous Shield bar. Digits and letters
retain their existing allocations and colours.

PMG base is `$3800`; active DMA pages are `$3B00-$3FFF`. P0 and P3 form the
Player Fighter. P1 carries Raider slot 0 and P2 carries Raider slot 1. Both are
independent monochrome body pages; no DLI multiplexer or scanner is used.
M0-M3 form the fighter-sector PMG pickup capsule. An ACTIVE pickup is removed
before capital, where M1-M3 resume broadside warning/impact ownership. Fighter
PairShots remain ANTIC 4 overlays, so their ten-record pool and player/enemy
colours are independent of the missile graphics.

The capsule is intentionally a 16-scanline solid fifth-player mark: every PMG
source byte has M0-M3 bits 4–7 set, with `SIZEM=$00`, consecutive HPOSM0–3,
`PRIOR=$10`, and `COLPF3`. Decorative partial-missile combinations were too
weak to recognize at native resolution; the solid mark is the bounded,
allocation-neutral replacement.

## Determinism and verification

Build inputs are declarative and conversion scripts are deterministic. Runtime
randomness starts from fixed initialization and advances only through defined
gameplay paths. Tests exercise cold RAM fills `$A5` and `$5A`, XEX/ATR payload
parity, all A2 heads, pool saturation, lifecycle resets, overlay backing, and
the measured PAL wall. The machine-readable evidence is generated from the
packed runtime, not from a separate preview model. `build:candidate`
deliberately publishes a manifest that cannot pass final verification. The
trace generator must complete every required replay and bind the exact boot
BIN, XEX, and ATR. A normal build then creates the final binding, including the
report hash; `verify` rejects a candidate manifest, a partial session set, an
artifact mismatch, a failed gate, or later report drift. No force flag can
bypass these phases.

The wall profiler observes exported zero-byte address symbols from the host
emulator. It adds no guest instructions, writes no release state, and records a
disjoint subsystem split for the global maximum. Separate legal no-fire cadence
sessions prove a complete debris lifecycle on EASY, MEDIUM, and HARD while
combat sessions retain firing coverage.

The rejected ANTIC 2 full-playfield experiment is archived in
[history/antic2-spike.md](history/antic2-spike.md); it is not part of this
architecture.
