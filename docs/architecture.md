# Void Strike 65 runtime architecture

This document describes the current released runtime. Exact address ownership
is in [memory-map.md](memory-map.md), performance evidence in
[runtime-headroom.md](runtime-headroom.md), and historical experiments in
[history/](history/).

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

The Encounter Director configuration uses a 101-sector initial block at
`$2000-$527F` and enters at `$201E` with a 449-byte raw bootstrap prefix. A
1,191-byte stage-2 overlay runs at `$21C1-$2667`; after it validates
the complete manifest, it reads extension sectors through standard OS SIOV
while OS IRQ/NMI and disk services are still available. Each chunk is fully
read, CRC16-CCITT checked, and only then copied or decompressed to its manifest-
controlled destination. Any failure blanks DMA, selects a fixed red error
background, and halts before partially loaded code can execute.

The four ordered DFMC records are BROADSIDE in sectors 102-146, the packed
pickup phase/code/collision stream in sectors 147-154, 234-byte integration glue
in sectors 155-156, and the Encounter Director in sectors 157-161. ATR stages
each record at `$8100`; BROADSIDE expands 6,643 bytes to `$5E10-$7802`, the
921-byte pickup stream is published temporarily at `$8C80-$9018`, and glue
expands to `$5261-$534A`. Packed ENTITY_CODE stages at `$534B-$5D3B`, directly
after glue. Startup holds glue at `$7F16-$7FFF` after publishing
the A2 kernel, then copies it to `$4EFE-$4FE7`; the 645-byte Director expands to
`$9D75-$9FF9`. The last BROADSIDE source read makes `$8100` reusable;
only then does startup copy the packed resident suffix and stage it at
`$8100-$9B06`. The 7,743-byte suffix is stored as a 6,663-byte LZ-10/5 stream
and restores `$21C1-$3FFF`, overwriting all stage-2 code and its maximum
eight-record manifest. The pickup stream is preserved at `$4801-$4B99` before
its cold source overlaps the future A2 range, then expands atomically to
`$8800-$8E81`; the final 33 bytes are the final-raster capital/player collision module.
No loader byte remains resident or enters gameplay.

The manifest uses 16-bit sector numbers, supports eight sequential chunks, and
accepts RAW or LZ records. The current initial block and four records use 161
sectors (20,608 B). The ATR itself has 559 unused sectors (71,552 B); runtime
residency remains a separate constraint.

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
Production records begin at sectors 102, 147, 155, and 157. Their packed/raw
lengths are respectively 5,660/6,643 B, 921/921 B, 229/234 B, and 585/645 B.
The second record carries the compressed immutable pickup phase bank plus its
late compositor and the 33-byte collision module. Its cold copy at
`$8C80-$9018` is first preserved at `$4801-$4B99`, then decompressed to
`$8800-$8E81`; source and destination never overlap while live. Glue is
transported to `$5261`, held at `$7F16-$7FFF` while ENTITY_CODE is unpacked,
and late-published to `$4EFE-$4FE7`. The Director ends
at `$9FF9`; `$9FFA-$9FFF` is a six-byte untouched guard.

The loader bitmap source is declarative. The build rasterizes 7,680 bytes for a
mixed ANTIC F/E screen and packs them to **1,929 bytes**. It expands to
`$4010-$5E0F`; a second LMS at `$5000` prevents a 4 KiB ANTIC boundary crossing.
A separate 35-byte stream expands the 202-byte loader display list to
`$3C00-$3CC9` only after the overlapping bitmap source has been consumed.

PMG DMA is disabled during the loader. Two DLIs select the title, ship, and
footer palette zones. The loader remains visible for 250 complete PAL frames
(5 seconds), then disables DMA/NMI, clears only the actual DMA pages
`$3B00-$3FFF`, and builds the frontend and gameplay memory.

Cold staging also copies:

- validated external broadside/runtime data to `$5E10-$780F` before takeover;
- packed starfield/music data through `$7810-$7F0F` to `$552A-$5DF3`;
- the 255-byte A2 kernel through `$7F16-$8014` to `$9000-$90FE`, before the
  `$8000-$80FF` entity/effects clear destroys the consumed source;
- packed entity/effect/frontend code through boot-only staging at `$5300-$5CEF`
  to the resident `$9100-$9D74` range. The staging write begins only after the
  initial packed source ending at `$5254` has been consumed. Its end-exclusive
  `$5CF0` remains 288 bytes below the BROADSIDE destination at `$5E10`.

The initial packed sources end exclusively at `$5255`, leaving 171 bytes before
the `$5300` staging start. Startup copies ENTITY_CODE there, expands the stream
to its current live `$9100-$9D74` range, and immediately releases the staging
range. `unpack_loader_bitmap` may then overwrite it while preparing the loader;
after the loader display completes, `unpack_starfield_runtime` expands to
`$552A-$5DFC`, overlapping 1,990 bytes of the already inactive ENTITY_CODE
staging range. This ordering is mandatory; the overlap is temporal, not
simultaneous residency.

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

Spread Shot uses the common projectile path. For overlapping or diagonal
projectiles it composes slot-owned scratch glyphs from the current lower-layer
byte, including a capital hull that moved during the frame. Erase and redraw
are overlap-aware: one departing projectile cannot erase another live
projectile, and the last departing projectile restores the current broadside or
base byte. This contract covers module boundaries, prow, engines, every A2
head, and ring wrap.

## Bounded pools

| Pool | Physical capacity | Release active limit | Purpose |
| --- | ---: | ---: | --- |
| Player Fighter projectiles | 10 | 10 | normal, Rapid Fire, and Spread Shot |
| Interceptor projectiles | 9 | 9 | single-pulse burst |
| Combined fighter projectiles | 19 | 19 | contiguous physical allocation |
| Broadside projectiles | 3 | production scheduler has 2 source turrets | capital fire |
| Interactive entities | 4 | 2 | debris plus one pickup capsule; controller/reserve slots remain non-rendered |
| Transient effects | 6 | 5 | one core plus four fragments |

Pool scans are bounded by compile-time counts. Spread Shot admits its centre
whenever at least one Player Fighter slot is free and admits the two side shots only as
an atomic pair. Its ten-frame cooldown is the minimum safe value for the
28-update maximum legal projectile lifetime: nine frames can reach a
centre-only tenth slot, while ten frames holds the steady state to three full
salvos and nine projectiles. Normal and Spread initialize an eight-shot/eight-
salvo burst; Normal uses a three-frame interval, Spread ten, and Rapid alone
initializes ten shots at two frames. All modes retain the 12-frame post-burst
pause. The effects pool is not used for pickup capsules or persistent
projectile state.

## Enemies, debris, and boosters

The released ordinary enemy is the Interceptor. Its descriptor selects hit points,
score, pursuit profile, weapon profile, and PMG appearance. Interceptor projectiles
share the fighter-projectile state allocation but use separate slots, red
glyphs, collision ownership, and lifetime rules.

Direct Interceptor/Player Fighter overlap is resolved after fighter projectiles and before
broadside work. It queues the existing one-point contact hit against the
Interceptor, then passes all ten HULL units to the canonical player-damage routine.
An accepted unshielded contact therefore saturates HULL at zero and uses the
existing HUD, breakup, life-loss, respawn, and Game Over flow in one event.
`PLAYER_LIFECYCLE`, Shield, the 25-frame post-hit cooldown, and the per-frame
damage latch remain the ordered gates. Interceptor destruction is resolved
independently afterward through the established scored `EXPLODING`/breakup
path, including when a player-side gate suppresses damage. Collision geometry,
movement, scheduling, and persistent state are unchanged.

Debris is the implemented interactive entity in slot 0. It has bounded
trajectories, two shapes, two tumble phases, three hit points, contact damage,
and no score award. Player/debris contact uses the full 16-HPOS width of the
double-width Player Fighter PMG, while retaining the existing vertical player envelope
and 8x8 debris box. Its single accepted damage event indexes a three-byte
Easy/Medium/Hard table containing 2/5/7 HULL units, then uses the canonical
atomic saturating damage/death/HUD path. Its destruction and Interceptor breakup
materialize into the five-slot active effects envelope and are erased before
lower layers move. The difficulty lookup replaces the former immediate load
with `LDX abs` plus `LDA abs,X`: +6 CPU cycles only after a geometric overlap
passes the earlier latch check, with no cost on inactive or collision-miss
paths and no persistent-RAM allocation.

Slot 1 owns the sole pickup capsule. A qualifying Player Fighter-projectile Interceptor
kill advances the three-kill drop counter. The next-type selector rotates
successful capsule creation through Rapid Fire, Spread Shot, and Shield,
starting with Rapid Fire on New Game. Slot 2 holds the non-rendered timed-
booster controller and next-type selector. All three states are mutually
exclusive. Rapid Fire and Spread Shot last 500 active frames; Shield lasts 250.
The capsule is created at Y=8, wholly above the gameplay display. PENDING and
Director admission retries cannot change that coordinate. Admission activates
it at Y=24; the one authoritative late renderer runs once after the A2 ring
update and publishes one phased 2x2/2x3 footprint through Y=239, clipping only
the scanlines that have actually crossed the exclusive boundary. The slot is
released at exactly Y=240. At frame start the interactive erase pass restores
the exact four or six physical cells saved by the preceding draw, in reverse
row order. Capsule codes are never committed to ring backing, tail repair, or
wrap-copy sources, so an old footprint cannot return after a ring wrap. The
logical Y is also the collection hitbox Y. EASY/MEDIUM/HARD accumulate 8/9/10
scanlines per five PAL frames; HARD therefore renders +2 scanlines every frame
instead of holding and jumping by one character row. While PENDING is invisible,
its wait fence advances from VCOUNT `$6C` to `$14` in steps of eight, then stays
at `$14` through admission retries. This monotonic handoff reaches the first
ACTIVE fence without waiting for an extra raster turn. Once ACTIVE, each update begins
immediately after ANTIC has scanned the preceding footprint's bottom edge. The
saved character cells therefore remain intact for that complete raster; reverse
erase, ring rotation, and the single late redraw then finish before ANTIC returns
to the new position on the next PAL frame. The Player Fighter remains the P0/P3 foreground
at `PRIOR=0`: only set PMG bits cover capsule pixels, while zero PMG bits remain
transparent. Simulation order, world rates, ring rotation, and global scrolling
are unchanged.

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

Rapid Fire uses the existing Player Fighter projectile renderer and yellow colour bank.
Spread Shot uses three logical Player Fighter projectiles: centre, left, and right. All
three use the yellow Player Fighter colour. Side directions are encoded in the existing
render/state byte, and the parity of the existing lifetime supplies their
one-HPOS-per-two-updates fixed phase, avoiding another allocation.

Shield leaves the normal weapon cadence active. Its separate state is checked
after `PLAYER_ALIVE` and before the ordinary 25-frame damage cooldown. A valid
absorption consumes the frame's one damage event without changing HULL, LIFE,
SCORE, hit flash, cooldown, or HULL-hit SFX. Interceptor shots disappear, broadside
shots enter their established impact state, debris is consumed, and Interceptor or
hull-contact side effects retain their prior behavior. The Shield timer also
drives a solid COLPM0/COLPM3 steel/white pulse; it never hides the Player Fighter and is
therefore distinct from respawn invulnerability.

## Character and PMG ownership

The gameplay charset has two free glyphs. Stars use 1-6, Player Fighter projectile
phases 11-46, Spread Shot composite scratch 47-56, capital hulls 59-89,
Interceptor/projectile phases 90-109, debris 110-117, and fragments 118-119. Glyphs
120-125 are the single-owner dynamic pickup compositor bank; one of the three
type-specific, eight-phase sources is copied there before the sole late draw.
Glyphs 126-127 are the dedicated connected left/right BROADSIDE bolt halves.

The separate `$5000-$53FF` HUD charset keeps glyph 0 as the blank/separator,
uses glyphs 5 and 12 for the two low HULL plate states, glyph 7 for weapon
energy, and glyph 8 for the distinct continuous Shield bar. Digits and letters
retain their existing allocations and colours.

PMG base is `$3800`; active DMA pages are `$3B00-$3FFF`. P0 and P3 form the
Player Fighter, P1 is the Interceptor, and P2 is its scanner. M1-M3 serve broadside warnings
and impacts. M0 remains reserved; current Player Fighter weapons are ANTIC 4 overlays so
the ten-slot pool and yellow colour are independent of `COLPM0`.

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
