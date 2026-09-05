# VOID STRIKE 65 — six-enemy technical foundation

**Design proposal / not implemented.** Audit baseline:
`277bf58d601259021d11facefc81adf20de3854c`, matching `origin/main` at
preflight. This document changes no runtime allocation, gameplay, artwork,
Director policy, or binary. Numbers labelled **proposal** are implementation
ceilings or starting balance values, not measurements or approved allocations.

## 1. Decision and evidence

Keep the six working names: **Hunter, Striker, Weaver, Gunship, Mine Layer,
Splitter**. The current safe, implemented ordinary-enemy concurrency is
**one**. Recommend **two occupied enemy-object slots** for v2, conditional on
native timing and visual acceptance. A mine or split child counts as an object;
two ships plus additional mines or children are not permitted.

Use P1 and P2 independently, one PMG player per slot. This avoids adding a
raster multiplexer or a new character compositor. It requires replacing the
current two-channel enemy scanner and enemy explosion ownership. Do not merely
change `ENEMY_SLOT_COUNT`: collision, weapons, rendering, release, and effects
all currently assume one enemy.

Memory placement is a prerequisite, not a solved consequence of the residency
metric. The conservative complete proposal needs up to **1,752 B** of added
resident code/data/state before reclaim credits. Keep **1,024 B** physically
available for a first boss foundation and **128 B** of integration slack.
Against the presently identifiable post-loader holes, this requires at least
**868 B of proven reclamation/compaction**. If that cannot be demonstrated,
reduce the implementation footprint before adding types; do not consume the
boss reserve or silently enable BASIC-window RAM.

### Sources and freshness

Follow the [documentation map](README.md). Primary reads were
[main runtime](../src/main.s), [Director](../src/encounter-director.s),
[current distribution manifest](../dist/void-strike-65-manifest.json), the
local `build/manifest.json`, `build/void-strike-65.map`, and both local label
files. The two manifests are identical at this checkpoint. Build outputs were
read, not regenerated. Supporting sources:

- [Enemy descriptors](../assets/graphics/enemy-roster.json),
  [projectile definitions](../assets/graphics/fighter-weapons.json),
  [entity/effect definitions](../assets/graphics/entity-effects.json).
- [Enemy roster tests](../tests/enemy-roster.test.mjs),
  [enemy combat tests](../tests/enemy-combat.test.mjs),
  [fighter weapon tests](../tests/fighter-weapons.test.mjs),
  [entity/effect tests](../tests/entity-effects.test.mjs),
  [Director tests](../tests/encounter-director.test.mjs).
- [Memory map](memory-map.md), [architecture](architecture.md),
  [game rules](game-design.md), [PAL evidence discussion](runtime-headroom.md),
  [hardware acceptance](hardware-testing.md), [boss concepts](boss-concepts.md).

The manifest reports `runtimeEvidence.status = candidate-awaiting-trace`,
with null report binding and null measured DMA-on wall/headroom fields.
There is **no current-artifact global PAL acceptance** to claim in this audit.

| Evidence | Recorded result | Meaning at this baseline |
| --- | --- | --- |
| Current manifest/map | 17,204 B linked runtime; 18,834 B simultaneous residency; 3,353 B accounting allowance | Current local artifact metadata, not a timing measurement or contiguous free region |
| [Global wall trace](runtime-wall-trace.json) | 24,264 cycles; 11,304 physical cycles remaining; 50 completed sessions | Frozen/transferred evidence; artifact hashes differ from current binaries; runtime sessions were not regenerated during its recorded brand transfer |
| [Capital/player focused trace](capital-player-collision-trace.json) | Maximum over its 16 sessions: 26,880 cycles; 8,688 physical cycles remaining | Frozen/transferred, also not bound to current artifact hashes; its 5,688 `gate_headroom` is distance to 32,568, not to the PAL frame boundary |
| Full-height focused checkpoint described in PAL document | 29,216 cycles; 6,352 physical cycles remaining | Prior focused pickup traversal, not a new global maximum for the current build |
| This audit's bounded NMOS interpreter probes | Request/release CPU counts below | Fresh reads/execution of existing local linked modules in host memory only; no ANTIC DMA, native replay, build, or evidence regeneration |

For an unambiguous future comparison, current artifact SHA-256 values are:

```text
XEX       702739eff00ead9b9d68fbf74fef712683a056fe964999a43d44cecf315dd315
ATR       efb6a570bd8d951a9f2926f949c2904fe6974085f8f2f03cb5376ac3bcb9e569
boot      63ed6b04923ce23ce4bac15cc4d443e05fe3f7082895d8ba1071a0fb5f2865b4
manifest  3b82c200c58651943c048485b58596385a5202bad8cc8f7f8f21c595cd223b76
```

Known documentation discrepancies must not become design assumptions:
the PAL summary's opening 16,735/17,421/4,766-byte figures describe an older
checkpoint; use the manifest values above. Architecture's claim of two free
gameplay glyphs is not an allocation grant: its own/current memory-map table
assigns 126–127 to capital bolts and 57–58 to helpers. Source comments also
retain older viewport/staging limits. No unrelated document is repaired here.

## 2. Existing engine audit

### Ordinary enemy and available state

`ENEMY_SLOT_COUNT = 1`, `ENEMY_SLOT_INDEX = 0`. There is no general ordinary-
enemy array. The ten-entry artwork inventory has three compiled anchors,
but only the basic hostile fighter is release-enabled; the other two are
review-only and have no release weapon. This is not a ten-enemy gameplay pool.
The working name Hunter already appears as a future inventory entry: future
implementation must explicitly reconcile that ID with the evolved baseline
fighter, rather than create two unrelated Hunter definitions.

| Existing storage | Bytes | Ownership/use |
| --- | ---: | --- |
| `enemy_x`, `enemy_y`, `enemy_velocity_x`, `scanner_phase` | 4 ZP | One visible fighter; signed direction, not a general vector velocity |
| `ENEMY_ARCHETYPE`, `INTERCEPTOR_MOVE_ACCUMULATOR`, `ENEMY_ACTIVE`, `ENEMY_HP`, `ENEMY_PENDING_DAMAGE`, `ENEMY_PENDING_SOURCE` | 6 | Resident scalar state; active byte distinguishes inactive/active/exploding |
| `INTERCEPTOR_BURST_STATE`, `INTERCEPTOR_BURST_REMAINING`, `INTERCEPTOR_BURST_TIMER` | 3 | One shared shooter; timer also serves inactive Director admission retry |
| Enemy member of `FIGHTER_EXPLOSION_TIMER/X/Y` | 3 | One enemy explosion in a two-member player/enemy array |
| **Total enemy-associated state** | **16** | Distributed and live, not 16 spare bytes or a reusable slot structure |

Current lifecycle: inactive → Director admission → spawn above the viewport →
active pursuit → offscreen recycle, or queued damage → exploding → recycle.
The basic fighter has 1 HP, awards 10 points under the established credit
policy, descends one scanline per active frame, samples the player every eight
frames, has a three-HPOS dead zone, and takes two-HPOS lateral steps on four
of five moving frames. Its signed direction reverses through zero. A small
32-frame residual weave already exists; Weaver must be more than that weave
with a different sprite.

### Other pools and overloaded fields

| Pool | Physical / enabled | State and lifecycle constraints |
| --- | --- | --- |
| Fighter shots | 19: player 0–9, hostile 10–18 | Ten arrays × 19 B = 190 B; plus two three-byte burst controllers and two three-byte explosions = 202 B at `$5400–$54C9` |
| Capital bolts | 3 | Independent warning/flight/impact lifecycle, owner/direction, cached backing; two-unit Director charge per committed bolt |
| Interactive entities | 4 / 2 visible | 20 arrays × 4 B + 16 global bytes = 96 B at `$8000–$805F`; slot 0 debris, 1 pickup, 2 non-rendered booster controller, 3 reserve |
| Cosmetic effects | 6 / 5 | 18 arrays × 6 B + 8 globals = 116 B at `$8080–$80F3`; one core plus four fragments; sixth slot reserved |
| Director state | 12 B | `$80F4–$80FF`, initialized after the complete entity page clear |

Do not mistake the interactive/effect capacities for a general enemy allocator.
Their fast paths address fixed roles directly. `ENTITY_OWNER` on debris is a
hit-flash countdown, not a stable source handle. `ENTITY_FLAGS` temporarily
disables shooting after a nonlethal hit within the projectile scan.
`ENTITY_TIMER` on debris is a movement accumulator; on the booster it is part
of a 16-bit timer with `ENTITY_MOVE_ACCUMULATOR`. The pickup compositor uses
`ENTITY_VX`, `ENTITY_VY`, backing fields, and screen fields for extra physical
footprint restoration. None is spare mine state.

Player shot `FIGHTER_PROJECTILE_ACTIVE` includes Spread direction; lifetime
parity supplies lateral phase. Rendered state includes the `$FF` single-row
backing sentinel. Existing shots have no individual shooter handle.
The hostile weapon currently emits ten-shot bursts, four frames apart, with
60/50/40-frame post-burst pauses; its nine slots outlive the shooter and use
fixed downward speed 5, width 2 HPOS, height 3, and TTL 96.

Effects are collisionless and replaceable: `spawn_interceptor_breakup_effects`
clears the previous event, sets a deferred materialization latch, and starts
the shared PMG explosion. `materialize_interceptor_breakup_effects` produces
the five cosmetic pieces on the next frame. Debris can replace that event;
fragment lifetime is 30 active frames and the PMG explosion lasts 24.
Making these fragments damaging would require a different ownership and
collision contract. V2 explicitly does not do so.

### Frame, rendering, collision, and damage order

`main_loop` enters `wait_gameplay_frame`, polls pause, increments the gameplay
frame, erases entity/effect and projectile overlays, ticks visual lifetimes,
processes player lifecycle/input, then updates the ordinary enemy. Current
`update_enemy` erases, moves, and draws P1/P2 before collision work.
`handle_collisions` resets pending enemy damage, updates fighter shots,
checks player/enemy contact, updates capital bolts, then resolves enemy damage
once. Weapon controllers run next; world/ring/Director work follows, then hull
contact, entities/effects, late overlays, completion, audio, and invulnerability.
The exact calls in source outrank the simplified layer diagram in architecture.

Ordinary PMG fighters need no character backing. ANTIC overlays must erase
the previous physical footprint before ring recycling and draw over the new
base in their existing order. V2 must not move mines into the pickup's single-
owner compositor, or insert another wait/DLI to accommodate them.

Player shots currently arbitrate debris versus one fighter in upward first-
contact order, with debris winning a tie. Enemy damage accumulates with
saturation and retains the lowest-valued credit source; resolution and score
occur once. Player-shot, player-contact, then enemy-capital credit can score;
allied-capital credit and cleanup do not. Only qualifying player-shot kills
advance the pickup counter. Capital bolts also choose their first spatial
target; this must become a bounded multi-target operation.

All new player damage must call `apply_player_damage`: alive/respawn lifecycle,
Shield, 25-frame cooldown, and `BROAD_DAMAGE_APPLIED` enforce its gates. Health
is ten units. Current direct fighter contact requests all ten units and queues
one unit against the enemy independently; ordinary pulses request one, capital
hits two, and debris 2/5/7 by difficulty. Do not implement a second damage or
invulnerability system for mines or children.

## 3. Hardware and resource constraints

| Constraint | Current fact | V2 decision |
| --- | --- | --- |
| CPU/RAM | PAL 65XE, 64 KB, documented NMOS 6502 | No dynamic allocation, runtime trigonometry, OS calls after takeover, or extra ZP requirement |
| Frame | 35,568 physical cycles at 50 Hz | Preserve current synchronization; measure DMA-on wall and raster deadlines |
| Frame gate | `wait_gameplay_frame`: absent pickup uses VCOUNT `$70`; PENDING moves `$6C,$64,...,$14` and then stays at `$14`; ACTIVE uses `(pickup Y + height) >> 1` | Preserve all three paths; PMG writes need separate visible-raster inspection too |
| Timing thresholds | Current trace producer uses 32,568; a focused capital path uses 32,584; manifest CPU diagnostic uses 32,500 | Adopt stricter 32,568 wall ceiling for v2; do not confuse CPU diagnostic with wall acceptance |
| PMG | P0/P3 player; P1 enemy body; P2 scanner; M1–M3 capital signals; M0 reserved | Two independent P1/P2 enemy objects; keep player and all missiles unchanged |
| ANTIC | Fixed HUD/divider, 27-row physical ring, dual 90-byte display lists | No new DLI, ring format, charset, or viewport change |
| Glyphs | 128 gameplay glyphs; no audited unowned pair | All new bodies, mines, children, and enemy death flashes use their assigned PMG channel |
| Shots | 10 player + 9 hostile; 3 separate capital | No pool growth; proposal caps ordinary hostile shots at 6 total, retaining 3 physical hostile slots for future boss use |
| BSS | Entity page includes reserved roles and Director | Add explicit enemy state elsewhere; never raid `$80F4–$80FF` or the 32-byte alignment reserve |
| High memory | `$A000–$BFFF` deliberately unused; six-byte Director guard | Neither is available to this design |
| Transport | 161 occupied ATR sectors, 559 free; 101-sector initial block | Disk space is not runtime RAM; future relocation must preserve cold staging and chunk limits |

The three spare hostile shot slots are a future capacity reservation, not an
already implemented boss weapon pool. Boss-specific bullets may eventually
need a different representation. Initial boss handoff should drain all ordinary
objects and their shots before taking P1/P2; simultaneous bosses and regular
fighters are outside this proposal.

## 4. Six mechanically distinct enemies

All values below are **balance proposals** in 50 Hz active frames, HP units,
HPOS units, and scanlines. BEGINNER maps to current runtime difficulty value 0
(currently called EASY); no menu rename is included. B/M/H means
BEGINNER/MEDIUM/HARD. No level layout or spawn schedule is authored here.

| Type | Role and movement | Attack | HP B/M/H | Contact damage | Death / proposed score | Availability |
| --- | --- | --- | --- | --- | --- | --- |
| Hunter | Baseline pursuer; sample player every 8 frames, gradual reversals; descend 1/1/1 scanline/frame, lateral cap 1.2/1.6/1.6 HPOS/frame | Existing ten-pulse burst style, interval 4; post pause 60/50/40; shared pool cap may delay emission | 1/1/1 | 10, preserving baseline lethality | Single-slot death flash; 10 points | B/M/H |
| Striker | Committed diagonal pass; choose direction at admission, no chase after entry; descend 2/3/3 scanlines/frame, lateral 1/1/2 until corridor clamp | Body crossing only; no projectile | 1/1/1 | 4 | Flash; 15 points | B/M/H |
| Weaver | Independent triangular slalom about an admission anchor; no player sampling; amplitude 8/12 HPOS, 64/48-frame period, descend 1 | One pulse every 64/48 frames | —/1/1 | 3 | Flash; 20 points | M/H |
| Gunship | Slow committed lane pressure; descend 0.5/0.75 scanlines/frame, no chase or indefinite hover | Short three-pulse sequence, interval 6; 80/60-frame pause; vertical bullets, no aimed-vector exception | —/3/3 | 4 | Flash; 30 points | M/H |
| Mine Layer | Transit at 1/2 scanlines/frame, fixed shallow lateral path; needs both object slots at admission | Leave at most one visible stationary mine per pass; arm after 16 frames, expire after 160 frames including arming | —/2/2 | 3; mine 2 | Carrier flash, mine persists to its own terminal event; 25 carrier points, 0 mine points | M/H |
| Splitter | Descend 1 scanline/frame with a slow lateral drift; readably broad parent | No parent shot; on lethal combat hit atomically replace parent with two simple diverging children | —/—/2 | Parent 4; child 2 | 40 parent points once; children 0, no recursive split | H |

The distinction is pursuit versus commitment versus periodic evasion versus
burst pressure versus delayed area denial versus a destruction-triggered
follow-up. HP changes only separate visibly heavier bodies, not difficulty
variants. Shared hostile shots always retain their existing one-unit damage.

BEGINNER enables at most one active object and the Hunter/Striker subset.
MEDIUM enables two, adds Weaver/Gunship/Mine Layer, but limits the screen to one
heavy or area-denial parent. HARD enables all six with two total objects, not
six simultaneous fighters. Director intensity and phase masks may impose a
lower limit. Difficulty uses data tables, never separate behavior copies.

## 5. Shared model and representation

Proposed `EN2_` names below do not exist in the current source. Use structure-
of-arrays with **two entries per field**, bounded ascending slot scans, and a
small dispatcher. Slot 0 owns P1; slot 1 owns P2 for its whole lifecycle.

| Proposed field | Bytes/slot | Meaning |
| --- | ---: | --- |
| `EN2_TYPE`, `EN2_STATE` | 2 | Six parent IDs plus MINE and CHILD; explicit lifecycle |
| `EN2_X`, `EN2_Y`, `EN2_PREV_X`, `EN2_PREV_Y` | 4 | Current and previous logical top-left; X in HPOS, Y in scanlines |
| `EN2_VX`, `EN2_VY`, `EN2_FRAC_X`, `EN2_FRAC_Y` | 4 | Bounded velocity in eighth-units (signed X), fractional accumulators; Hunter X exception below; clamp before byte wrap |
| `EN2_PHASE`, `EN2_HP` | 2 | Local movement/visual phase and hit points |
| `EN2_ATTACK_TIMER`, `EN2_SHOTS_LEFT` | 2 | Per-shooter attack state; zero shots plus zero timer begins a sequence |
| `EN2_PARAM`, `EN2_TTL` | 2 | Tagged behavior parameter and finite remaining lifecycle time |
| `EN2_PENDING_DAMAGE`, `EN2_PENDING_SOURCE` | 2 | Per-frame damage and score-priority accumulation |
| `EN2_CHARGE`, `EN2_RENDER_FLAGS` | 2 | Owned Director units; visible/death/activation flags, never a second HP field |
| **Total** | **20** | 40 B for two slots |

Add **8 shared bytes**: work slot, selected collision target, transaction mask,
new-slot mask, occupied count, pending request type, retry timer, and accepted
RNG snapshot. Total new state ceiling **48 B**; old 16 enemy-associated bytes
are not credited as free until all users are removed. No new zero-page bytes.

Hunter is a deliberate movement-format exception: VX retains signed direction
and FRAC_X retains the existing denominator-five accumulator, taking a two-HPOS
step on three/five BEGINNER or four/five MEDIUM/HARD updates. An eighth-unit
velocity cannot exactly represent the accepted 1.6-HPOS rate. Its small handler
is included in the foundation budget; do not silently round that rate. All
other movement uses the common eighth-unit integrator with fixed shifts/adds.

`EN2_PARAM` is an explicitly tagged union: Hunter sample/target auxiliary,
Striker committed direction, Weaver centre X, Gunship burst configuration,
Mine Layer remaining drop quota, Splitter child spread sign. MINE uses it as
arming time; CHILD uses it as direction. No behavior may interpret another
type's parameter or store persistent state in renderer scratch.

`EN2_TTL` is a local state timer, not a universal flight timeout: MINE 160,
CHILD 96, death flash 12, and entry grace 8 frames. Other active parents have
positive bounded downward velocity and leave at Y=240, so even Gunship's
0.5-scanline cadence terminates within 480 active updates. The implementation
must prove fractional movement cannot stall at zero. Pause freezes all clocks.

An owner pointer is unnecessary in this version. All hostile shots have the
same allegiance and behavior and survive their shooter; mine and child
ownership is represented by their own charge and lifecycle. Do not attach a
reusable slot index to a projectile. A future weapon requiring kill attribution
to a shooter would need a slot+generation handle and a separately costed field.

### Common lifecycle and per-type exceptions

Common parent path: FREE → initialized/ENTRY → ACTIVE → DYING → FREE, or
ACTIVE → OFFSCREEN → FREE. Publish active state last. ENTRY is non-colliding
until visible and has an eight-frame no-attack grace; it already occupies its
slot and admission charge. Retain its charge through DYING, releasing once
when the PMG page fragment is erased. Offscreen removal must erase the previous
position before releasing. Death flash uses the dead object's own channel;
it cannot call the old two-channel enemy explosion adapter.

- Hunter retains an attack sequence across ordinary pursuit updates; a full
  pulse pool leaves its shot count unchanged. Its sampling uses local phase,
  not another slot's scanner state.
- Striker clamps at the corridor edge and continues downward, never bounces
  back to chase. Its swept contact includes the full diagonal displacement.
- Weaver uses a 32-byte signed triangular lookup table. Phase advances through
  a bounded fractional clock for 64/48-frame periods; amplitude scaling is
  shifts/adds. Clamp the centre at admission so the whole wave and body fit.
- Gunship uses the same pulse emitter with a three-shot descriptor. Each shot
  is committed independently; a failed allocation does not consume a shot.
- Mine Layer admission reserves the companion FREE slot as RESERVED_MINE.
  It is invisible and non-colliding, included in the two-slot occupancy, with
  charge held by the carrier. Drop once after reaching Y=80 (no immediate drop
  onto the player); transfer one of the carrier's two units to the new MINE.
  MINE follows ARMING → ACTIVE → FREE, remains at its screen coordinate,
  has 1 HP, never fires, and expires at 160 updates. If drop geometry overlaps
  the player plus an eight-scanline margin, cancel the drop and release the
  unused reservation/one unit; do not seek a new location in a loop. Death or
  exit before drop also releases the reserved slot; after drop the mine lives
  independently. DRAIN/death/New Game cleanup always clears both roles.
- Splitter uses the allowed **two smaller targets** variant, not damaging
  cosmetic fragments. At lethal resolution, preflight the other slot and both
  child positions. Reuse the parent's slot plus the other FREE slot. Each child
  is an 8×8 single-channel target with 1 HP, no shots, ±1 HPOS/frame and
  +2 scanlines/frame, TTL 96, eight-frame contact grace, no score/pickup credit,
  and no splitting. Both are published together and first update next frame.
  If either slot/position is unavailable, use the ordinary parent death flash
  with no children. Never evict another live object or publish one child.

### Render and collision contract

Reuse fixed-stride body data, descriptor widths/heights, clipping, and channel-
specific erase/draw helpers. Six parent silhouettes are at most 16 rows; MINE
and CHILD at most 8. Parent widths may be normal or double PMG width. Each
channel sets its own SIZEP/HPOSP. Keep the existing channel colours (`COLPM1`
`$44`, `COLPM2` `$46`) fixed: PMG player/missile colour sharing means arbitrary
type-specific recolouring could also change capital warnings. Use mask-only
enemy hit/death flashes and test M1/M2 appearance, rather than applying the old
enemy `$84` colour change to whichever slot died. Scanner accents become single-colour
mask animation; the current two-colour look cannot coexist unchanged with two
independent enemies. This is an explicit future owner-review item.

First implement one-slot parity, then two-slot isolation in the foundation.
Every affected writer must be audited: `draw_enemy`, `erase_enemy`,
`render_shared_fighter_explosions`, `erase_shared_fighter_explosion_slot`, and
colour/flash/reset paths. Player explosion P0/P3 remains independent.
Cosmetic five-piece breakup can be requested at most once per frame, using a
fixed slot tie-break and the existing replaceable event. Its saved origin must
be captured at death rather than read from a parent slot reused by children.
Retain the existing enemy `FIGHTER_EXPLOSION_X/Y` bytes for that one cosmetic
origin until its pending event is materialized; they are not reclaim credits.
Skipping a second cosmetic event must never skip gameplay damage or score.

Use shared logical swept rectangles. Keep player-shot first-contact arbitration
across debris and both eligible enemy slots; debris retains equality priority,
then lower enemy slot wins a tie. Compare the first intersection along travel,
not array order alone. Extend capital-bolt first-target logic similarly without
changing player/capital collision geometry. Snapshot targets before lethal
resolution, accumulate damage per slot, and resolve each once after the scan.
New children cannot be struck by the remaining shots of the parent's death
frame. No enemy/enemy collision is required.

All live parent contact queues one unit of self-damage, as the existing fighter
does, and requests the table's player damage through the canonical routine.
Mine/child contact retires that hazard even when Shield absorbs it; no score
or pickup credit. Preserve cooldown, Shield, respawn, and same-frame priority
tests. Swept tests must cover Striker/child diagonal motion and moving-player
versus stationary-mine crossings. Do not rely on GTIA collision latches to
distinguish gameplay ownership.

## 6. Director, RNG, admission, retry, and release

Current `director_request` accepts hazard index X, returns carry, and advances
the private `director_rng_advance` LCG (`5*x+1`, period 256) only on success.
It records the attempted frame before several rejection gates, so even a
denied request may block another request in that frame. Reaction/recovery use
world rows, not frames. Hazard costs are currently 1/1/2/0 for ordinary fighter,
debris, capital bolt, pickup. Current phase budgets peak at 3/4/5.

Current fighter integration retries every eight eligible gameplay frames using
the burst timer and blocks new ordinary admissions while the capital hull is
live. A pre-existing fighter continues its lifecycle. `reset_enemy` separately
uses `random_byte`, a right-shift `$B8` game LFSR; debris uses a distinct
left-shift `$1D` LFSR and stars another state. Therefore migrating spawn choices
to the Director is a deliberate replay-stream change, not current behavior.

V2 keeps the Director as the admission authority, without authoring new phases
here. Proposed ordinary charges: Hunter/Striker/Weaver 1; Gunship/Mine Layer/
Splitter 2. Extend the request ABI with a validated descriptor cost or mapped
hazard class; do not index the current four-entry tables with a six-type ID.
Store the committed cost in each slot. `director_release` currently subtracts
a table cost and saturates at zero, which can hide a double release; v2 needs
an exact per-charge release wrapper and assertions in focused tests.

Preflight slots, representation, phase mask, difficulty, and geometry before
requesting admission. Keep a pending type stable across retries. On success,
use the returned/recorded accepted RNG byte for spawn X, direction, and phase
via bounded table/mask reductions. Failed local checks consume no RNG; failed
Director requests keep the existing attempt-frame semantics. No behavior
update, shot retry, mine drop, or split draws new random bytes. Do not roll
back global RNG after a published Director success.

Mine reservation transfers two units held by the carrier into one carrier and
one mine unit; splitting transfers parent charge 2 to children 1+1. Neither
calls admission twice or changes total intensity. Fallback retains charge until
ordinary death completion. Zero the retiring charge exactly once. Cleanup must
also handle an undropped mine reservation, DRAIN, COMPLETE, life loss, and New
Game, without disturbing live Director flags or applying a release after reset.

Use one bounded admission attempt per frame, eight-frame retry delay, and the
existing live-capital admission exclusion. Permit type coexistence in eligible
open phases only within occupancy, intensity, and projectile limits. The current
boss event is an unregistered fallback to COMPLETE; do not pretend it starts a
boss. Future handoff drains ordinary bodies/mines/children and hostile shots.

Gunship/Hunter/Weaver share the nine hostile projectile slots, with a proposed
ordinary active cap of six and at most one new ordinary pulse per frame.
Alternate the first eligible shooter by frame parity, then inspect both slots;
failed emission leaves timer due and shots remaining. This prevents slot-0
starvation. Separate per-slot attack timers replace the current global burst
controller. Already-fired shots need no owner and survive normal shooter death;
global death/drain cleanup retains existing pulse semantics. Slot intensity is
not a count of lingering bullets: the six-shot cap is a separate hard gate.

Fresh diagnostic probes using the existing `Nmos6502` interpreter and
`installRuntimeSegments` (no file writes), HARD phase 3, alive player, frame 10,
previous admission frame 9, RNG `$6F`, unless varied below:

| Existing path | CPU cycles, including RTS but excluding caller JSR | Probe result |
| --- | ---: | --- |
| `director_request`, fighter, budget available | 193 | Carry set, intensity 1, RNG `$2C` |
| Same-frame request denial | 27 | No RNG change |
| Reaction counter = 1 denial | 46 | No RNG change |
| Intensity already 5 denial | 106 | No RNG change |
| `director_release`, fighter charge 1 | 23 | Intensity becomes 0 |
| `integration_interceptor_retry`, OPEN, countdown 8 | 26 | Decrements once, no request |
| `director_world_row_tick`, no event/phase transition due | 101 | One row, no RNG advance |

These are selected current paths, not universal maxima. Event variants advance
RNG only on successful dispatch; failed deferred events have an eight-world-row
retry bound. Budget **320 CPU cycles** for a future successful admission wrapper,
**160** for a rejected attempt, **80** for exact single-slot release, and **480**
for a two-child transaction, excluding collision/render. Verify page-crossing
and all reject branches after linking. Normal spawn reset/draw is additional.

## 7. Memory and cycle estimates

### Residency and placement

Current executable reservations are nearly full: STARFIELD has 16 free bytes
before the 10-byte BOOST backing; BROADSIDE 13; ENTITY_CODE 76; A2 1. The
Director's six-byte guard is unavailable. Candidate post-loader holes listed
in the current map are 24 + 96 + 16 + 13 + 832 + 60 + 6 + 529 + 382 + 1 + 76
= **2,035 B**, excluding the initialized 32-byte alignment reserve and all
temporal loader/PMG overlaps. Even these holes need explicit linker and startup
ownership before use. Existing map/manifest accounts are not a placement proof.

Suggested boss holdback, purely a proposal: the 832 B after pause backup plus
192 B of the 529-byte post-ring hole = 1,024 B. Do not reserve these addresses
in code during this task. Protect the existing glyph, missile, player, pickup,
Director, and stack ownership too. This is a minimum first-boss foundation
reserve, not evidence that the detailed modular bosses fit in 1 KiB.

| Proposed allocation ceiling | Bytes | Accounting |
| --- | ---: | --- |
| Common dispatcher, indexed PMG helpers, collision/credit adapters, transaction/admission helpers, baseline Hunter behavior | 768 | Added code ceiling before verified replacement credit |
| Shared data | 296 | 80 B descriptors (8 IDs × 10 B), 112 B masks (6 × 16 + 2 × 8), 72 B difficulty parameters (6 × 3 × 4), 32 B wave |
| Shared state | 48 | Two 20-byte slots plus eight globals; 0 new ZP |
| **Foundation including Hunter** | **1,112** | Additional envelope, not a claim it fits an existing segment |
| Striker / Weaver / Gunship behavior | 96 / 96 / 128 | Tables and slot RAM already included above |
| Mine Layer including MINE / Splitter including CHILD | 160 / 160 | Reuse transactions; no additional pool or glyphs |
| **Complete roster ceiling** | **1,752** | 1,408 code + 296 data + 48 state |
| Boss reserve + integration slack | 1,024 + 128 | Cannot be spent by ordinary-enemy work |

The ten descriptor bytes are width, height, mask offset, HP, one-byte packed-
BCD score, contact damage, weapon profile, admission cost, default parameter,
and lifecycle TTL. The four difficulty bytes per parent are lateral rate,
vertical rate, attack pause, and a behavior-policy selector (for example the
two Weaver amplitude/period pairs). Decode that selector with bounded branches;
do not add unaccounted per-difficulty copies. Dispatch addresses and any extra
constants must fit the code ceiling. Existing shared explosion masks can be
read by the new channel-specific death renderer; new masks are single-frame
silhouettes, not three full animation banks per type.

1,752 + 1,024 + 128 = 2,904 B, exceeding identified holes by **868 B**.
The 3,353-byte accounting allowance would leave 449 B, but cannot solve that
physical fragmentation/reclamation gap. In the first implementation prompt,
measure replacement of the old scalar enemy routines, scanner, enemy explosion
adapter, and review-only linked data; count recovered bytes only once and only
after references are removed. No rewriting of boot/relocation or unexplained
memory-map expansion is implicit. If reclamation is insufficient, redesign the
scope and document the result before implementing further types.

### Per-type state, cost, and owner acceptance

All per-object state is 20 B within the common 48 B allocation, not an extra
charge per type. The code increments below match the residency table. CPU
ceilings are rough **whole per-type processing slices** including its PMG erase/
draw, movement, attack allocation, and bounded checks against ten player shots,
three capital bolts, and the player; exclude the global projectile renderer,
world/ring work, audio, and the cosmetic five-fragment pass. Do not add these
directly to a DMA-on wall result or describe them as measured headroom.

| Type | Type-specific state use / pools | Incremental code; peak occupied RAM | Heavy slice estimate | Owner smoke acceptance after implementation |
| --- | --- | --- | ---: | --- |
| Hunter | VX/fractions, local sample phase, attack timer/count; enemy slot + hostile shots | Included in foundation; 20 B | ≤1,400 CPU cycles | Stationary player is pursued; moving player can escape; gradual reversal; baseline contact remains lethal; no pulse/scanner artefacts |
| Striker | Committed direction, velocity, previous position; enemy slot only | ≤96 B; 20 B | ≤1,250 | Fast readable crossing; cannot turn into pursuit; no tunnelling through player or shots; leaves screen promptly |
| Weaver | Centre in PARAM, phase/fraction, attack timer; enemy slot + hostile shots | ≤96 B; 20 B | ≤1,450 | Visible regular slalom independent of player; wave stays in corridor; shots and hits remain aligned at turning points |
| Gunship | Slow Y fraction, HP, three-shot count/timer; enemy slot + hostile shots | ≤128 B; 20 B | ≤1,500 | Three readable hits to kill; short spaced burst; visible progress downscreen; other shooter gets turns at saturation |
| Mine Layer | Drop quota and companion reservation; two common slots, no effect-slot ownership | ≤160 B; 40 B during reservation/mine coexistence | ≤2,300 carrier+mine | Exactly one drop, clear arming grace, stationary threat, expiry even after carrier death; no invisible lingering hitbox |
| Splitter | Death-source snapshot, transaction mask, CHILD direction/TTL; two common slots | ≤160 B; 40 B after successful split | ≤2,900 for death transaction + two publications | Two children together or none; diverge with grace, can be shot, no recursion/extra score; occupied companion produces safe visible fallback |

The shared cap limits collision candidates to two ordinary objects plus debris,
not six types plus their descendants. At most one large cosmetic breakup is
materialized per frame; simultaneous deaths must not multiply its cost.

Before edits in the first implementation stage, capture focused native baseline
timing on the exact starting artifacts. For the final mixed roster, propose a
**+1,800 DMA-on wall-cycle delta ceiling** on matched heavy replays and a
**31,068-cycle working ceiling**, whichever is stricter. This preserves at
least 1,500 cycles below the 32,568 gate and 4,500 to the physical PAL boundary.
The prior 29,216 checkpoint plus 1,800 would be 31,016, but this is a planning
comparison only, not proof for current or future bytes. If the fresh baseline
already violates the working ceiling, recovery precedes roster expansion.

PAL acceptance also requires zero missed frames, zero deadline overruns, zero
extra VBI boundaries, and clean DLI order. A wall interval below 35,568 alone
does not prove PMG writes occur before the relevant raster reads. Exercise
pickup absent/PENDING/ACTIVE, top/bottom clipping, ring wraps, music, all shot
modes, both capital owners, simultaneous death, and pause/resume.

## 8. Regression risks and test strategy

Highest risks are P2 ownership (scanner and shared explosion still write it),
scattered memory capacity, target-order changes, and a successful split reusing
state still referenced by a deferred effect. Other risks: new shot fairness
changing pressure, burst timer/retry aliasing, source-credit ties, double charge
release hidden by saturation, cold clear destroying Director state, and PMG
updates tearing when the pickup moves the frame fence.

Focused tests must cover:

- Every state transition, slot reuse, offscreen clipping at Y=240, dead/inactive
  no-fire paths, zero/maximum fractions, and signed boundary motion.
- Two PMG channels with overlapping Y, different X/width/height, independent
  death, colour, and erase; unchanged P0/P3 and M0–M3; no writes outside owners.
- Player shots, capital bolts, debris, and both targets in different orders;
  equal-contact ties; simultaneous lethal sources; exactly one score/kill credit.
- Shield, cooldown, invulnerability, same-frame latch, and player-death cleanup
  for every contact class. Mine/child TTLs freeze while paused and expire normally.
- Full hostile-shot pool, six-shot production cap, fair scheduling, allocation
  failures preserving shot counts, and no shooter-slot alias after reuse.
- Mine reservation failure/early carrier death/unsafe drop/expiry; Splitter
  companion busy, out-of-bounds children, both commits, no same-frame child hit,
  two parent lethal sources, no child score/booster farming, and no recursion.
- All 256 Director seeds for bounded selection; repeat rejected admissions;
  exact accepted RNG advancement; split/drop/release consume no RNG; unchanged
  game/debris/star streams except the explicitly retired enemy spawn draw.
- Intensity conservation, release once, zero leftover reservations, 8-frame
  retry, phase/difficulty denial, capital exclusion, DRAIN/COMPLETE, and New Game.
- Focused cold `$A5/$5A` initialization, XEX/ATR runtime parity, placement and
  staging assertions. No dynamic allocator, accidental undocumented opcode,
  unbounded search, new wait loop, or publication before full initialization.

Existing tests named above are evidence for current contracts, not tests of
this proposal. Some test files generate review sheets, and `npm test` rebuilds;
neither was run for this documentation audit. Future stages should select only
the relevant focused tests and native replay paths. Do not regenerate the
frozen global report or run a full gauntlet.

## 9. Six future feature prompts, in implementation order

Each prompt below is an independently reviewable local feature, not permission
to execute it during this audit. Every stage requires its own focused test,
DMA-on PAL measurement, native XEX/ATR replay, memory report, owner smoke, and
one local commit; **no full gauntlet, push, merge, tag, or release**. Candidate
artifacts and focused evidence must remain explicitly candidate-scoped; do not
claim global final binding. Compare against both the immediate predecessor and
the first fresh native baseline. Stop a stage on failed timing/placement/smoke.

| Stage / feature prompt | Bounded implementation scope and focused test | Cumulative added residency ceiling | Native replay and owner smoke |
| --- | --- | ---: | --- |
| 1 — Implement Hunter foundation | First prove ≥868 B reclaim/placement with boss holdback intact. Add the shared fields/dispatcher, one-slot baseline parity, then P1/P2 isolation and indexed collision/weapon/death adapters. Add only Hunter behavior. Test two-slot lifecycle, pursuit, credit, RNG, and channel isolation. Commit `feat(enemies): add Hunter foundation`. | 1,112 B, including all reserved shared tables/state | Fresh pre-edit PAL baseline, then one/two Hunters with full shot modes, pickup fence states, capital traversal and death. Owner confirms readable replacement of scanner and escape from pursuit. |
| 2 — Implement Striker | Add committed fast transit using common sweep and no gun. Test fixed direction, clipping, diagonal tunnelling and TTL-free positive-Y exit. Commit `feat(enemies): add Striker`. | 1,208 B | Native Hunter+Striker crossings, both entry sides, player at corridor edges; measure its maximum-speed frame. Owner confirms fast avoidable crossing without chase. |
| 3 — Implement Weaver | Add triangular LUT behavior and single-pulse timing; no additional renderer/state. Test extrema, 48/64 periods, fractional cadence, bounds and independence from player position. Commit `feat(enemies): add Weaver`. | 1,304 B | Native mixed pair at wave extrema with Spread and a pickup crossing; measure phase-wrap/shot/hit coincidence. Owner confirms slalom is readable and distinct from Hunter. |
| 4 — Implement Gunship | Add three-hit body and short-burst descriptor. Test six-shot cap, fair two-shooter admission, full-pool retry, nonlethal feedback and slow finite transit. Commit `feat(enemies): add Gunship`. | 1,432 B | Native Gunship+Hunter with hostile pool saturation, player Rapid/Spread, simultaneous hit/burst and capital phases; record PAL maximum. Owner confirms HP feedback and three-shot rhythm. |
| 5 — Implement Mine Layer | Add companion reservation, one drop, MINE arming/expiry and charge transfer. Test every reservation/cleanup path and screen-stationary collision. Commit `feat(enemies): add Mine Layer`. | 1,592 B | Native drop near player, carrier death before/after drop, pause, mine expiry and scrolling hull behind it; measure drop and contact frames. Owner confirms mine remains visible and expires predictably. |
| 6 — Implement Splitter | Add atomic parent→two CHILD transaction, target snapshot and deferred-effect origin capture. Test full/partial capacity, edge fallback, simultaneous lethal credit, next-frame child activation and no recursion. Commit `feat(enemies): add Splitter`. | 1,752 B | Native successful split and busy-slot fallback under Spread, capital fire and cosmetic breakup; measure transaction plus following materialization frame. Owner confirms two-or-none split and no unfair instant contact. |

Stage 1 is the point at which the shared dispatcher and state fields must land,
before any other type. Its visual ownership change is necessary enabling work,
not six independent renderer implementations. If it cannot remain a small,
reviewable feature within these ceilings, revise this design before proceeding.
Owner smoke is not needed for this document; it becomes mandatory for stage 1
and every subsequent implemented type.

## 10. Documentation acceptance

Only this file is changed. Validate links against exact-case repository paths,
check referenced current symbols/pool sizes against source and labels, retain
the distinction between fresh CPU probes and frozen native evidence, and run
`git diff --check`. No source, asset, test, script, binary, memory-map reservation,
or frozen evidence update belongs in this commit.

(C) 2026 SETECH GAME STUDIO
