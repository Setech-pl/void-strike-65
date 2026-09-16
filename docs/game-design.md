# Void Strike 65 game design

This document defines the player-visible rules of the accepted checkpoint named
in [STATUS.md](STATUS.md). Technical implementation
belongs in [architecture.md](architecture.md), numeric memory ownership in
[memory-map.md](memory-map.md), and planned work in
[plan-realizacji.md](plan-realizacji.md).

## Implemented game

Void Strike 65 is an unofficial, non-commercial vertical shooter for a stock
PAL Atari 65XE. It runs at 50 frames per second.
The player flies a Player Fighter with joystick port 1 and fires with one button.

The frontend contains the title loader, main menu, options, top scores, exit
screen, menu music, and a gameplay-music option. Gameplay can be paused and
resumed. Pause freezes active gameplay simulation and booster countdowns.
The post-loader frontend uses the accepted Showcase Tactical Lite hierarchy:
large display headings, wide 20-column options/data, one restrained steel
structure, amber values, and green only for the active action. TOP SCORES
continues to show the ten live RAM records, and Game Over shows the live final
and top scores rather than demonstration data.

### HUD and player lifecycle

The gameplay HUD contains `SCORE`, `LIFE`, and `HULL`. Four low, angular plate
cells follow the full `HULL` label at all times: intact quarters are solid and
damaged quarters remain visible as cracked plates. This indicator never blinks
or disappears.

While Rapid Fire, Spread Shot, or Shield is active, the ten cells to the right show the
full `BOOST` label, one blank separator, and four tall, narrow energy cells.
The bar has four segments above 75% remaining time, three above 50%, two from
25% through 50%, and one below 25%. Only the last segment blinks in an
eight-frame visible/eight-frame hidden rhythm. Expiry restores all ten cells
to their prior blank contents. The optional type glyph is omitted because the
40-column HUD has exactly ten unclaimed cells and one active booster at a time.

- A new game starts with three playable Player Fighters and a full 100% hull.
- The hull has ten health units. An ordinary Raider PairShot removes one unit
  (10%), while capital-ship fire removes two units (20%). Debris contact removes
  a fixed two, five, or seven units on Easy, Medium, or Hard (20%/50%/70% of
  maximum HULL); it never computes a percentage of remaining HULL. Debris
  contact tests the Player Fighter's complete double-width 16-HPOS visible envelope;
  its vertical contract and the debris 8x8 hitbox remain unchanged.
- Contact with a Raider applies the full ten-unit hull damage through the shared
  damage gate and deals one damage unit to the Raider.
- Losing a Player Fighter plays a 24-frame breakup. If a life remains, the replacement
  Player Fighter receives 250 active frames (5 seconds) of invulnerability and blinks in
  an 8-frame visible/8-frame hidden rhythm.
- Losing the final Player Fighter enters Game Over. New Game resets score, lives, hull,
  sector state, active projectiles, entities, effects, and boosters.
- TOP SCORES keeps ten packed-BCD results in RAM, ordered from highest to
  lowest. A completed non-zero game is inserted once on the Game Over
  transition; equal scores follow existing equal entries. New Game resets only
  the current score, while a cold program start clears the table.

### Combat and scoring

The normal Player Fighter weapon fires four logical PairShots at one PairShot
every nine active frames, followed by a 12-frame pause. Each one-cell PairShot
glyph contains two separated pulses, preserving eight visible impulses. Shots
travel upward by six scanlines per active frame. Rapid uses five PairShots for
ten visible impulses; Spread uses four PairShots for eight. One PairShot is one
movement/lifecycle object and produces one collision event, so the visual pair
does not double damage.

Ordinary fighter combat uses up to two Heavy Raiders, each a monochrome PMG body
(P1/P2), admitted together as one formation by the Encounter Director. Raider is
the first C `EnemyArchetype`: one hit point, sampled soft pursuit with a readable
weave at 80% of the Player Fighter's maximum horizontal speed, and separate
X/Y coordinates, signed direction, fractional movement phase, manoeuvre timer
and behaviour phase. Opposite opening directions and phase offsets produce
independent turns; the opening vertical crossing reverses their vertical order.
The formation shares one enemy burst controller: five red PairShots at 15-frame
intervals, then a 60/50/40-frame pause on Easy/Medium/Hard, with at most five
enemy PairShots in flight. Enemy PairShots move two scanlines per PAL frame.
Shots still in flight when their Raider is destroyed expire with it.

Every Raider activation and recycle starts the complete 14-scanline body above
the gameplay boundary at PMG Y=2. The two machines descend by their existing
one-scanline movement into the old Y=48/Y=96 formation anchors before the
crossing continues. Top clipping publishes only the portion that has entered;
a completely hidden Raider cannot fire or collide.

### Light Wingman

Every Raider formation brings one Light Wingman. It is a small two-cell character
fighter that sits centred behind the first Raider, 12 scanlines above it,
without switching sides; it moves on the character grid, so its vertical gap
steps by up to seven lines, which is intentional. It has one hit point, fires one red PairShot every
96/80/64 frames on Easy/Medium/Hard when fully visible, and is worth 5 points.
One Player PairShot or player contact destroys it (contact uses the Raider
contract). If its leader is lost it flies straight down and leaves the screen.
The capital encounter waits until it has gone.

Each Raider is worth 10 points when destroyed by a Player Fighter projectile, player
contact, or Hostile friendly fire. A capital-ship hit or lifecycle cleanup awards
no points. Debris has three hit points, causes fixed 20%/50%/70% maximum-hull
damage on Easy/Medium/Hard contact, and never awards score when destroyed.

Raider destruction retains its 24-frame full-screen background flash and sound,
but creates no character-cell core or flying breakup fragments. Debris destruction
still has one core plus four
fragments. These are transient effects, not interactive enemies.

Gameplay debris is admitted at character Y=16, one complete eight-scanline row
above its first legal entity row Y=24. It remains non-rendered and non-colliding
until the existing world-event carry moves it to Y=24, then keeps its established
HP, tumble, movement, collision and destruction contract.

### World and difficulty

The world alternates between open space and a broadside corridor formed by a
Allied capital ship and a Hostile capital ship. The corridor scrolls through
engines, aft, combat, forward, and prow sections, followed by drain, complete,
and open-space transition states. Capital-ship engines alternate between dim
and bright phases, each lasting eight active frames.

Difficulty changes the measured vertical rates:

| Difficulty | World/scene and hull | Debris |
| --- | ---: | ---: |
| Easy | 20 rows/s | 12 rows/s |
| Medium | 22.5 rows/s | 13.5 rows/s |
| Hard | 25 rows/s | 15 rows/s |

Broadside warnings, launch flashes, heavy projectiles, hull contact, and
capital explosions are implemented. World, stars, debris, and both hulls keep
their relative rates through sector transitions. Once the last capital row has
left the screen, the ordinary full-width background still advances at the
listed world rate. The starfield is one decorative layer of four small white
stars moving one scanline per PAL frame in every sector; they occupy only empty
cells, so hull, gondola and turret graphics always stay in front. No capital
lifecycle state changes the physical scene cadence.

During construction, the existing first capital encounter is provisionally due
on active gameplay frame 600. Menu, OPTIONS, loader, pause, and initialization
frames do not advance this counter. A live Raider-formation lifecycle or legal
budget refusal delays actual admission until the first legal frame. Once the
capital encounter is due, ordinary admission remains closed through its entire
lifecycle; an already emitted Raider pulse may finish its own bounded lifetime.
Admissions before and after the traversal use the same one-formation Director
budget, retry, RNG, and lifecycle policy. This provisional development schedule
creates a natural early test window for three qualifying Raider kills and the
resulting `FREE -> PENDING -> ACTIVE` pickup. It moves the original
encounter rather than adding another one at frame 50 or its former phase
boundary. Later encounters,
`BOSS_HANDOFF`, and level timing remain at their established rows.

The provisional Hostile firing schedule exposes at least three evenly spaced
legal warning/flash/launch opportunities during that full hull pass. Each warning is
still 25 frames and each attached launch flash is still four frames. Admission
continues to obey the existing EASY/MEDIUM/HARD intensity ceilings (3/4/5) and
the three-slot heavy-projectile pool; final placement and difficulty balance
remain deferred to the level gauntlet.

Every BROADSIDE projectile is a hazard to the Player Fighter, including fire from the
Allied hull; affiliation does not disable friendly fire in this encounter.
Allied and Hostile BROADSIDE projectiles do not collide with one another: they
pass through on independent trajectories, using only deterministic visual
z-order while their footprints overlap.
The final character-aligned 8-HPOS shell raster is swept symmetrically between
its previous and current positions. Gameplay uses one inclusive AABB test: the
Player Fighter owns the complete 16-HPOS by 15-scanline rectangle reconstructed from
the final P0/P3 PMG DMA rows, including transparent PMG corners and internal
gaps. The bolt owns eight HPOS and the six occupied scanlines of glyphs
126/127 at the cached physical screen row selected by the active gameplay
display list. Logical `player_y` and `BROAD_Y` are not compared directly.
Exactly one HPOS or scanline beyond those final-raster envelopes is a miss. A
real overlap consumes the shell into its normal impact lifecycle and
applies the established capital damage of 20%, or two of ten HULL units,
through the canonical player-damage pipeline.
Shield, respawn invulnerability, the 25-frame post-hit cooldown, and the
one-damage-event-per-frame latch retain their existing precedence.

## Implemented boosters

Only one pickup capsule may exist at a time. A qualifying kill is specifically
a Raider destroyed by a Player Fighter PairShot while no capsule exists. Broadside fire, player
collision, debris destruction, and lifecycle cleanup do not advance the drop
counter.

The current implementation creates a pickup after every third qualifying kill.
The sequence is `Rapid Fire -> Spread Shot -> Shield -> Rapid Fire`; a new
game always starts the sequence with Rapid Fire. A successful kill creates the
capsule wholly above the playfield at Y=8. Its 30-frame PENDING delay, including
any admission retry, remains at that off-screen coordinate. Admission publishes
the capsule at the first fully visible position, Y=24; it then crosses every
scanline phase through the last visible scanline Y=239 and releases its slot at
the exclusive boundary Y=240. Thus
PENDING cannot consume any collectible screen travel. The three-kill cadence is
deterministic (no random drop roll); changing it requires an explicit owner
decision.

Each type is one logical slot and one fighter-sector capsule drawn as a
16-scanline fifth-player PMG object (missiles M0-M3 in `COLPF3`), not as
characters. It moves 8/9/10 twentieths of a scanline per PAL frame on
Easy/Medium/Hard, and the collection hitbox follows the same Y. An ACTIVE capsule
is removed before the capital sector; a PENDING capsule is frozen and resumes
afterwards. Picking up the same active type refreshes it. Picking up another
type replaces it, so Rapid Fire, Spread Shot, and Shield are mutually exclusive.

The capsule mask is solid (every M0-M3 bit set) so it stays readable at native
resolution.

## Canonical gameplay raster

`assets/graphics/playfield.json` is the single source for the PAL gameplay
boundary. The HUD occupies scanlines 8-15, the fixed divider 16-23, and the
rotating entity field 24-239; gameplay therefore ends exclusively at Y=240.
The Player Fighter may move from PMG Y=32 through Y=225. Its body/engine union has
non-transparent rows 0-14, so the lowest legal opaque pixel is exactly Y=239.
Stars, fighter and capital projectiles, pickups, debris, ordinary enemies,
rendering, collision, and culling all consume this same boundary. No transient
may use HUD/divider memory as ring backing.
Pause freezes
their timers; life loss, Game Over, and New Game clear them; a live sector
transition preserves them.

The `BOOST` label and energy bar are driven by the active booster's own timer:
500 frames for Rapid/Spread or 250 for Shield. Picking up any type immediately
shows the full ten-cell
field with four energy segments; refreshing or replacing an active type also
returns it to four segments. Pause freezes both the timer and the current blink
phase.

### Rapid Fire — implemented

Rapid Fire lasts exactly 500 active PAL frames (10 seconds). It expands the
burst to five PairShots / ten visible impulses, keeps the 12-frame post-burst
pause, and reduces the in-burst interval from nine frames to six. At most five
PairShots remain active, and they retain the Player Fighter's established
yellow/gold.

### Spread Shot — implemented

Spread Shot lasts exactly 500 active PAL frames (10 seconds), uses four
PairShots / eight visible impulses and retains the 12-frame post-burst pause.
The burst is two fire events at the 28-active-frame interval: it opens with a
simultaneous left/centre/right volley and then fires a single centre follow-up,
so the fan is readable in one glance. It never combines with Rapid Fire. A
blocked allocation remains one pending PairShot without accumulating catch-up
fire.

Until 2026-09-16 the three directions were fired one interval apart, so a side
shot was never on screen together with the centre and the weapon read as a
slower plain shot.

Centre PairShots travel vertically. Left and right PairShots move symmetrically
by one horizontal-position unit every two active frames. The phase comes from
the existing projectile lifetime, so no extra timer or state array is required.
All travel upward at the normal Player Fighter speed, use the yellow weapon
colour, create one collision event, and obey ordinary score rules.

### Shield Booster — implemented

Shield lasts exactly 250 active PAL frames (5 seconds), keeps the normal weapon,
and uses a separate damage gate rather than extending hit or respawn
invulnerability. It absorbs at most one valid damage event per frame without
changing HULL, LIFE, SCORE, the ordinary damage cooldown, hit flash, or HULL-hit
SFX. The steel-blue/white capsule has a black shield symbol. Its continuous HUD
bar uses a dense cross-core pattern and exact thresholds 188, 126, and 63; the
last segment uses the shared timer's 8+8 blink phase. A solid steel/white Player Fighter
colour pulse is derived from the same timer and never makes the craft disappear.

## Encounter Director Level 1

The production Hybrid Encounter Director advances from world rows rather than
wall-clock time. Level 1 is exactly 3,712 rows with contiguous, end-exclusive
phase boundaries:

| Phase | World rows | EASY time | MEDIUM time | HARD time |
| --- | ---: | ---: | ---: | ---: |
| Intro | 0-128 | 0.0-6.4 s | 0.0-5.7 s | 0.0-5.1 s |
| Raider training | 128-576 | 6.4-28.8 s | 5.7-25.6 s | 5.1-23.0 s |
| Debris field | 576-1056 | 28.8-52.8 s | 25.6-46.9 s | 23.0-42.2 s |
| Mixed pressure | 1056-1664 | 52.8-83.2 s | 46.9-74.0 s | 42.2-66.6 s |
| Recovery | 1664-1856 | 83.2-92.8 s | 74.0-82.5 s | 66.6-74.2 s |
| Former capital/broadside escalation window; encounter uses the provisional active-frame-600 development gate | 1856-2752 | 92.8-137.6 s | 82.5-122.3 s | 74.2-110.1 s |
| Recovery | 2752-2944 | 137.6-147.2 s | 122.3-130.8 s | 110.1-117.8 s |
| Final approach | 2944-3712 | 147.2-185.6 s | 130.8-165.0 s | 117.8-148.5 s |

The intensity budgets are 3/4/5 for EASY/MEDIUM/HARD. The Director has a
private deterministic RNG and does not consume the game's existing random
state. It owns admission policy and budgets while the existing Raider-formation, debris,
broadside, pickup, object-pool, and destruction lifecycles retain object
ownership. Until further ordinary archetypes exist, phases 2, 4 and 6 retain
their authored hazard masks and budgets but also admit the current Raider
formation as the legal fallback. A later phase-native archetype replaces only
that temporary fallback bit; it does not require a new scheduling policy.
With no boss consumer, `BOSS_HANDOFF` closes admissions and pickup
state, enters DRAIN, lets active objects expire, and emits exactly one
`LEVEL COMPLETE`; it never creates a boss.

The Layout D.2 behavioral correction makes BROADSIDE admission transactional:
failed pool or muzzle attempts leave intensity unchanged, a committed projectile
charges exactly two units, and its lifecycle releases exactly two. Natural
final-approach handoff from post-capital OPEN enters DRAIN, preserves active
objects until their normal cleanup, and leaves the single COMPLETE state terminal.

## Planned

### Nova Missile — planned

Nova Missile is a future boss-only special-weapon pickup, not a member of the
planned Rapid Fire / Spread Shot / Shield drop rotation. It may appear only
during a boss encounter, never in standard sectors or through the qualifying
Raider-kill counter. Its mark is planned as a large, readable PMG missile
shape, consistent with the accepted fifth-player pickup representation and not
a revival of the retired character-capsule compositor.

Collecting it arms exactly one missile independently of the current weapon
booster and Shield. A held FIRE input at collection must not launch it: the
player must release FIRE and press it again. That next new press launches Nova
Missile instead of the normal shot, after which the Player Fighter returns to its
preserved normal, Rapid Fire, or Spread Shot weapon state.

A boss hit is planned to trigger a large multi-phase space-detonation: a bright
central flash, yellow-red core, and expanding energy wave. Boss damage is
applied exactly once at detonation; later animation phases cannot deal damage
again. The weapon is intended to cause very high boss damage, but its exact
damage, guidance, speed, spawn condition, and pickup count remain deliberately
unspecified until boss lifecycle, boss HULL, and the large-explosion runtime
budget are designed together. Nova Missile is not present in the current
runtime.

### Interceptor — PLANNED / `BLOCKED_PLACEMENT`

The next ordinary enemy is the Interceptor. Only these facts are owner-approved
(owner decision 15); everything else waits for implementation.

- **Light class.** It allocates no PMG player and is never drawn on `P1`/`P2`.
  It is not a smaller PMG Raider.
- **Character renderer.** It shares the accepted Light renderer class with the
  Light Wingman.
- **One Light slot.** Current capacity stays one Light-class enemy at a time,
  selected per encounter as `Wingman OR Interceptor` — not both at once.
- **Independent and aggressive.** Unlike the Wingman it keeps no formation and
  follows no Heavy leader; it acts on its own against the player.
- **Existing weapon family.** It fires through the established hostile PairShot
  path; no new projectile renderer.

Exact movement, cadence, HP, score and silhouette are **not final**. The
2026-09-16 implementation attempt is `BLOCKED_PLACEMENT`: the architecture held
but the result does not fit resident memory, so no candidate build exists and
no owner smoke has happened. Capacity recovery (roadmap step 4.3) comes first.

Longer level structures, bosses, and further audio/visual polish remain future
work. They are not implied by the current enemy-roster descriptors or
review-only asset records, which describe the Raider-era roster.
