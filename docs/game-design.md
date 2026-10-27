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
cells follow the full `HULL` label: an intact quarter is a solid plate and a
spent quarter vanishes, as a spent `BOOST` cell does (fix/boss-polish, owner
request 2026-10-12; the boss sector's HUD the same). The plates never blink;
an empty hull shows the label alone until the respawn's four plates.

While Rapid Fire, Spread Shot, or Shield is active, the ten cells to the right show the
full `BOOST` label, one blank separator, and four tall, narrow energy cells.
The bar has four segments above 75% remaining time, three above 50%, two from
25% through 50%, and one below 25%. Only the last segment blinks in an
eight-frame visible/eight-frame hidden rhythm. Expiry restores all ten cells
to their prior blank contents. The optional type glyph is omitted because the
40-column HUD has exactly ten unclaimed cells and one active booster at a time.

- A new game starts with three playable Player Fighters and a full 100% hull.
  **Planned (owner decision K, 2026-09-20):** one extra life after completing
  each odd level from 3 onward — at the **twelve-level** campaign of decision
  **AC** (2026-09-22) that is levels **3, 5, 7, 9, 11** — **five extra, eight
  in all**. The rule is K's; only the campaign length changed, and with it the
  enumeration (sixteen levels gave 3-15, seven extra and ten in all). A shorter
  campaign carries less reserve, which the owner confirmed as intended
  (2026-09-23). Not implemented.
- The hull has ten health units. An ordinary Raider PairShot removes one unit
  (10%), while capital-ship fire removes two units (20%). Debris contact removes
  a fixed two, five, or seven units on Easy, Medium, or Hard (20%/50%/70% of
  maximum HULL); it never computes a percentage of remaining HULL. Debris
  contact tests the Player Fighter's complete double-width 16-HPOS visible envelope;
  its vertical contract and the debris 8x8 hitbox remain unchanged.
- Contact with a Raider applies the full ten-unit hull damage through the shared
  damage gate and deals one damage unit to the Raider.
- Losing a Player Fighter plays a 24-frame breakup that begins on the frame after the
  lethal hit (the fighter stays visible for that one frame), so the dying state lasts 25
  frames. If a life remains, the replacement
  Player Fighter receives 250 active frames (5 seconds) of invulnerability and blinks in
  an 8-frame visible/8-frame hidden rhythm.
- Losing the final Player Fighter enters Game Over. New Game resets score, lives, hull,
  sector state, active projectiles, entities, effects, and boosters.
- TOP SCORES keeps ten packed-BCD results in RAM, ordered from highest to
  lowest. **Owner decision M (2026-09-20) confirms this as final: RAM only, no
  disk write.** Disk save is backlog. A completed non-zero game is inserted once on the Game Over
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
The formation shares one enemy burst controller: five white/steel `PULSE` PairShots at 15-frame
intervals, then a 60/50/40-frame pause on Easy/Medium/Hard, with at most five
enemy PairShots in flight. Enemy PairShots move two scanlines per PAL frame.
An enemy shot already in flight is independent of its emitter (owner decision
2026-09-17): destroying the Raider, Light Wingman, Interceptor or a future
Bomber leaves it on its normal path until it hits the player, expires, leaves
the playfield or a player death, respawn, new game or quit clears the pool.

Every Raider activation and recycle starts the complete 14-scanline body above
the gameplay boundary at PMG Y=2. The two machines descend by their existing
one-scanline movement on alternate, opposite-parity frames into the old
Y=48/Y=96 formation anchors before the
crossing continues. Top clipping publishes only the portion that has entered;
a completely hidden Raider cannot fire or collide.

### Heavy package, session 1

Assault Raiders retain their per-frame lateral pursuit and shared fire policy;
each member's vertical movement runs on alternate frames, on opposite parity.
An unhit formation lives 668 frames instead of 334. A wave may select the
armoured Raider profile without another archetype: HP 2/2/3 on EASY/MEDIUM/HARD,
an authored stop at row 24 or 40, and a surviving-hit dodge 12 HPOS away from
the player over six frames with Y held. Its stop clock continues through a
hit. Assault HP remains 1/1/1 and assault Raiders do not dodge.

Bomber HP is 4/4/5 and its flash adds four luminance units, keeping the full
ramp inside hue C. A surviving hit triggers a six-frame sideways dodge with
Y held; an authored stop continues to its original expiry. Without authored
hold data the existing reload-timed attack run remains. Charge brightness is
published on the braking/resume transition frame, as on main. Level 2 uses
Bomber holds at row 72 for 96 frames in sector 2 waves 2–3, an armoured Raider
hold at row 40 for 64 frames in sector 5 wave 3, and armoured waves 4 and 6 in
sector 6. Armoured uses the current Raider art in session 1; the second
silhouette and damage holes belong to session 2.

Capsule qualification and cadence, all-or-nothing SPREAD admission and deferred
Heavy breakup on rotate frames are unchanged. Boss sectors admit no Heavy.

### Light Wingman

A Raider formation brings at most one Light companion, chosen by its wave: a
Wingman (this section), an Interceptor, or none (owner decision a/b below). The Wingman is a small two-cell character
fighter that sits centred behind the first Raider, 12 scanlines above it,
without switching sides; it moves on the character grid, so its vertical gap
steps by up to seven lines, which is intentional. It has one hit point, fires one `PULSE` PairShot every
96/80/64 frames on Easy/Medium/Hard when fully visible, and is worth 5 points.
One Player PairShot or player contact destroys it (contact uses the Raider
contract). If its leader is lost it flies straight down and leaves the screen.
The capital encounter waits until it has gone.

Each Raider is worth 10 points when destroyed by a Player Fighter projectile, player
contact, or Hostile friendly fire. A capital-ship hit or lifecycle cleanup awards
no points. Debris has three hit points and causes fixed 20%/50%/70% maximum-hull
damage on Easy/Medium/Hard contact.

Destroying something awards its score regardless of whether the player survives
doing it: a suicide or contact kill is worth exactly what a shot kill is worth.
Debris follows the same rule and is worth **25 points** when the player's own
shot or the player's own contact destroys it (`DEBRIS_SCORE = $25`,
`src/main.s:507`, asserted at `:950`; corrected 2026-10-19 - this said 5). No other
release awards anything: not a non-lethal hit, not the despawn path, not falling
past the bottom of the gameplay area, and not a sector drain or completion.

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

Difficulty changes the measured vertical rates.

> **Planned change — owner decision J (2026-09-20), not implemented.**
> Difficulty is to scale the existing reload and spacing scaling **and
> damage**: damage the player deals, damage the player takes, contact damage
> and boss damage. Today only some of that exists: the vertical rates below,
> the fire pauses 56/44/32, and debris contact damage at 2/5/7 HULL units.
> Player-dealt damage is a hardcoded `lda #$01` (`src/main.s:4105`) that no
> difficulty or booster touches. Population **ceilings are never scaled**
> (owner decision 23 §10.6).
>
> **Open contradiction, older than decision J.** The paragraph below on the
> provisional Hostile firing schedule says admission "continues to obey the
> existing EASY/MEDIUM/HARD intensity ceilings (3/4/5)", which is scaling a
> ceiling — what decision 23 §10.6 forbids. Settle this when planning 4.6.


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

The capital encounter is a **CAPITAL sector of the level data**, not a frame
gate (roadmap 4.6 step 2; the frame-600 development gate is retired,
`src/c/director.c:18-23`). When the Director's world rows reach it, entering
the sector raises the capital-due flag, and the hull still waits until the
playfield has drained (`sector_c_drain_clear`, `src/c/lifecycle.c:673`).
A capital sector admits no Light and no Heavy (its ceilings are zero,
`src/c/director.c:193-194`), so ordinary admission stays closed through the
whole hull pass; an already emitted Raider pulse may finish its own bounded
lifetime. (Corrected 2026-10-08, AUD-07: this paragraph described the
retired active-frame-600 schedule.)

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

Only one pickup capsule may exist at a time. One shared drop counter advances
on two kinds of qualifying kill, and only while no capsule exists, live or
pending:

* a **Heavy** enemy — Raider or Bomber, the PMG `P1`/`P2` class — whose lethal
  damage came from a Player Fighter PairShot (`resolve_enemy_damage`,
  `src/main.s`, the `weapon_pickup_record_qualified_kill` call);
* a **debris** object destroyed by a Player Fighter PairShot
  (`debris_shot_reward`, owner decision 2026-09-22).

Light enemies (Interceptor, Wingman) never count, however they die. Nothing
else advances the counter either: Broadside fire, a player collision or ram
(including a debris ram kill, which still scores), debris leaving the
playfield, and lifecycle cleanup.

The current implementation creates a pickup after every third qualifying kill
(`WEAPON_PICKUP_QUALIFIED_KILLS` = 3), Heavy and debris kills counted together,
and the counter restarts at zero when the capsule is created. The level image's
`pickupPolicy` byte is not read by the runtime.
The sequence is `Rapid Fire -> Spread Shot -> Shield -> Rapid Fire`; a new
game always starts the sequence with Rapid Fire. A successful kill creates the
capsule wholly above the playfield at Y=8. Its 30-frame PENDING delay, including
any admission retry, remains at that off-screen coordinate. Admission publishes
the capsule at the first fully visible position, Y=24; it then crosses every
scanline phase through the last visible scanline Y=239 and releases its slot at
the exclusive boundary Y=240. Thus
PENDING cannot consume any collectible screen travel. The three-kill cadence is
deterministic; the LIFE substitution below rolls the type, not this cadence.
Changing the three-kill cadence requires an explicit owner decision.

Each ordinary booster type is one logical slot and one fighter-sector capsule drawn as a
16-scanline `PLAYER3` PMG object in `COLPM3` — the **boost colour, gold
`$1C`**, a hue no enemy wears (owner decision, 2026-09-28, the colour itself
2026-09-29 after the hardware smoke, `plans/pickup-colour.md` §7 item 1) — not
as characters. It moves 8/9/10 twentieths of a scanline per PAL frame on
Easy/Medium/Hard, and the collection hitbox follows the same Y. An ACTIVE capsule
is removed before the capital sector; a PENDING capsule is frozen and resumes
afterwards. Picking up the same active type refreshes it. Picking up another
type replaces it, so Rapid Fire, Spread Shot, and Shield are mutually exclusive.

The ordinary booster capsule mask is solid (all eight colour clocks used across the silhouette)
so it stays readable at native resolution.

### +1 life capsule — OWNER-ACCEPTED (M6 stage 2, journal §BN)

The owner accepted look A (mint `$AC` rescue cross) and placement A on
`b2261c9`, 2026-10-22. Only SPACE spawns LIFE. Until one has appeared this
level, with fewer than eight lives, each ordinary capsule spawn draws the
Director RNG once: 1 in 4 substitutes LIFE without consuming the ordinary
RAPID/SPREAD/SHIELD rotation. Set the per-level latch on appearance, reset it
at level start, preserve it through death. Missing LIFE earns no second spawn.
At entry to the last SPACE sector (compiler kind bit $40), inject LIFE
immediately if eligible and not yet spawned, without a kill. Cleanly replace
any pending or active ordinary capsule through the same shared slot.

At eight lives, suppress LIFE and continue ordinary capsule logic; do not set
the latch for a suppressed attempt. An in-flight LIFE collected at the cap is
removed without awarding a booster. Collection otherwise adds one life,
clamped at eight, without replacing or extending an active booster. The HUD
order remains LIFE, HULL, BOOST, T meter | SCORE, with the life digit written
only when the count changes. Reuse the hit-SFX path; a collisionless spark
uses the existing whole effect pool only when empty, never erasing another
effect or delaying the award. Player-death colours take priority over LIFE.

C owns these decisions in DIRECTOR_C_LOW (95 B); ASM owns execution and
publication. The masks and veneers occupy the appended window tail below the
unchanged lance. See [the as-built plan §8](plans/m6-void-lance.md) and the
generated [memory map](memory-map.md) for placement and resource accounting.

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
colour, mint `$AE` (plasma FX, owner 2026-10-06; it was yellow/gold `$1E`).

### Spread Shot — implemented

Spread Shot lasts exactly 500 active PAL frames (10 seconds), uses four
PairShots / eight visible impulses and retains the 12-frame post-burst pause.
The burst is two fire events at the 28-active-frame interval: it opens with a
simultaneous left/centre/right volley and then fires a single centre follow-up,
so the fan is readable in one glance. It never combines with Rapid Fire. A
blocked allocation remains one pending PairShot without accumulating catch-up
fire.

The volley is all-or-nothing (owner decision, 2026-09-30,
`plans/spread-volley-fix.md`). It is admitted only when three of the five
active PairShot slots are free; then left, centre and right are all placed in
the same frame, the burst advances to its follow-up and the shot sound starts.
With fewer than three free, nothing is placed that frame, and the fire event is
retried on the next one. The centre follow-up needs one free slot. Until this
decision, the side shots were placed first and kept. A volley that began with
fewer than three free slots while fire was held then filled every freed slot
with a lone side shot. The centre never fitted, the burst never advanced and no
shot sound played until Spread expired
(`diagnostics/spread-debug-route-2026-09-30.md`).

Until 2026-09-16 the three directions were fired one interval apart, so a side
shot was never on screen together with the centre and the weapon read as a
slower plain shot.

Centre PairShots travel vertically. Left and right PairShots move symmetrically
by one horizontal-position unit every two active frames. The phase comes from
the existing projectile lifetime, so no extra timer or state array is required.
All travel upward at the normal Player Fighter speed, use the Player Fighter's
weapon colour (mint `$AE`), create one collision event, and obey ordinary score
rules.

### Shield Booster — implemented

Shield lasts exactly 250 active PAL frames (5 seconds), keeps the normal weapon,
and uses a separate damage gate rather than extending hit or respawn
invulnerability. It absorbs at most one valid damage event per frame without
changing HULL, LIFE, SCORE, the ordinary damage cooldown, hit flash, or HULL-hit
SFX. Its capsule is the crest tapering to a point, in the shared boost colour
like every other capsule; the steel-blue/white casing with a black shield
symbol belonged to the retired character compositor. Its continuous HUD
bar uses a dense cross-core pattern and exact thresholds 188, 126, and 63; the
last segment uses the shared timer's 8+8 blink phase. A solid steel/white Player Fighter
colour pulse is derived from the same timer and never makes the craft disappear.

## Encounter Director Level 1

**Elite sectors with Raiders — two variants (owner decision a/b, 2026-10-08;
it refines decision 15 of 2026-09-16, "Wingman or Interceptor").** An elite
sector's Raiders come as **(a)** a Raider formation with an Interceptor
companion, or **(b)** Raiders with no Light; a Raider with a Wingman escort
remains a third option. All three are wave data on the existing archetypes
(decision AD), within the elite ceilings of one Light and two Heavies.
Recorded in [plans/director-4.6.md](plans/director-4.6.md) §11 item 20.

**Level 1 after the capital (data/w2-lights, owner decision a/b and answers of
2026-10-08; supersedes P2's one-of-each list).** A **swarm**: a column of three
Wingmen in the `flight-lead` look, then three Interceptors that stack above
the player and fire down on it (the standoff), each looping twice through its
top-hold row - up to three Lights at once, no Heavy. Then **elite (a)**, a Raider
pair with an Interceptor companion that loops twice too; **the Bomber pair**; and **elite (b)**, a
Raider pair alone - the Bomber between the Raider variants so the Heavy waves
alternate (owner decision 8). The waves before the capital and the capital are
unchanged. **Sector flow (feat/sector-flow, owner answers of 2026-10-08,
`OWNER-SMOKE CANDIDATE`; [plans/sector-flow.md](plans/sector-flow.md)):** the
swarm chains a third wave, a plain Wingman column down the other side, and
the Bomber pair arrives as soon as (a) is cleared (`afterCleared`); the
sectors end as soon as their waves are spent and the field is clear, so the
bot reaches the boss at ≈ 67 / 57 / 54 s (EASY / MEDIUM / HARD; 88 / 77 / 72
before). No swarm follows an elite sector in the data (the owner kept that
rule as a hard test), and C1 now also holds a sector's end in the Director
while its live enemies exceed the next sector's caps
([plans/w2-lights.md](plans/w2-lights.md) §3.4). The phase table further below is the retired pre-step-2 design,
kept for its history; the authored level is `assets/levels/level-01.json`
([level-data-howto.md](level-data-howto.md)).

**The boss band (decision M, fix/smoke-2026-10-07 P1).** The player's shots
are drawn inside the boss band up to the cell that stops them; the band's
cells are written after the band has been shown each frame, so a shot shows
in every band row it crosses, a frame later, as in the playfield below.

**How the Director runs a level today** (roadmap 4.6 step 2, `OWNER-ACCEPTED`;
the boss sector M5b and level 1's post-capital sectors W2 are
`OWNER-SMOKE CANDIDATE`s; corrected 2026-10-08, AUD-07). The Director advances
on world rows, not wall-clock time, and reads its schedule from the level
image the sector reader loaded (`src/c/director.c:1-40`). A level is a list of
sectors, each a kind — SPACE (subtype swarm or elite), CAPITAL or BOSS — with
its waves armed at authored rows:

* a **SPACE** sector ends **as soon as its waves have all been spawned and the
  field is clear** (no Heavy formation, active or exploding, and no Light) -
  the early end; its authored row count is only the **no-kill cut**, the latest
  it may end. At the cut the members not yet admitted are cancelled, and **C1**
  holds the end, the world scrolling on, while the live enemies exceed the
  next space sector's caps (a Heavy where it admits none, more Lights than its
  Light ceiling); a capital or boss entry waits for its own full drain instead.
  A wave marked **`afterCleared`** arms on its row only once the field is
  clear. A sector that authors no wave keeps its rows (feat/sector-flow,
  `src/c/director.c:456-555`, owner Q10: the default for every level). Owner
  decision 3 is amended accordingly: the capital's authored row is a
  **maximum** (director-4.6 §11 item 3);
* a **CAPITAL** sector raises the capital-due flag and waits for the drain
  (see "World and difficulty");
* the **BOSS** sector raises the boss-due flag; on the same drained
  playfield the capital waits for (`src/c/lifecycle.c:673-682`) the world
  scroll stops, the boss is read from disk behind the WARNING screen - WARNING,
  then the boss's name and INCOMING (decision AL: BLOCKADE BREAKER, VOID
  CITADEL, SIEGE SPINE, BASTION for regions 1-4 since feat/boss-order-scale)
  - and the
  sector ends at the boss's death, not on a row (`src/c/director.c:387-388`,
  `:591-596`).

Level 1 (`assets/levels/level-01.json`) is an elite sector, the capital, the
swarm, elite (a), the Bomber pair, elite (b) and the boss. Light and Heavy
admissions are capped per sector kind (Light 3 / 1 / 0 / 1 for swarm / elite /
capital / boss, Heavy 0 / 2 / 0 / 0; `src/c/director.c:198-199`). The live
hazard cost is capped at **3 / 4 / 5** on EASY / MEDIUM / HARD
(`hazard_budget`, `src/c/director.c:223`), the peak of the retired per-phase
tables. The Director has a private deterministic RNG and does not consume the
game's existing random state. It owns admission policy and budgets while the
existing Raider-formation, debris, broadside, pickup, object-pool, and
destruction lifecycles retain object ownership. When the boss is defeated the
level completes: the terminal COMPLETE is held 50 frames
(`LEVEL_END_HOLD_FRAMES`), then the level-summary screen, the TOP SCORES
insertion and the menu (`sector_reader_level_end`,
`src/hybrid/sector-reader.s:277`); there is no next level until the campaign
loop (M4).

### Retired: the eight-phase schedule (before roadmap 4.6 step 2)

*History, kept for reference. None of this runs in the current build.*

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

### Broadside admission — Layout D.2

The Layout D.2 behavioral correction makes BROADSIDE admission transactional:
failed pool or muzzle attempts leave intensity unchanged, a committed projectile
charges exactly two units, and its lifecycle releases exactly two. (Its
second half - a natural final-approach handoff from post-capital OPEN into
DRAIN and a single terminal COMPLETE - belonged to the retired schedule above;
today the level completes after the boss, as described at the top of this
section.)

## Planned

### Campaign, progression and screens — owner decisions E-P (2026-09-20)

Recorded here as player-visible rules. **Mostly not implemented**; what is
built, as an `OWNER-SMOKE CANDIDATE`, is the boss that ends level 1 (H) with
its lasers (I) — [plans/m5-loading-boss.md](plans/m5-loading-boss.md),
[plans/boss-lasers.md](plans/boss-lasers.md) — and the loader screen's
as-built form (O, below). Corrected 2026-10-08, AUD-07. Full text
and rationale: [owner-decisions-2026-09-11.md](owner-decisions-2026-09-11.md),
section "Decyzje literowe 2026-09-20".

- **Twelve levels (E, superseded in its number by AC, 2026-09-22).** A boss
  ends every level. The easiest difficulty is to be beatable by anyone. The
  campaign is **four regions of three levels** — 1-3, 4-6, 7-9, 10-12 — one
  enemy hull style per region, so all four styles are used. Sixteen is
  withdrawn as the 1.0 target and kept only as a possible post-1.0 extension.
- **Capital variety is parametric (F, assumptions changed by AA and AC).**
  Four segment-art sets; length in segments, turret density and maximum
  gondola protrusion are three independent parameters, four steps each,
  layered on a chosen set. The four sets are the **enemy** styles, one per
  region of three levels (AA, AC); the **allied** hull is one for the whole
  game, and its only per-level change is colour — the brighter steel `$88` on
  levels 1-6, a darker step (`$84` or `$86`) on 7-12. The enemy colour is
  unchanged.
- **Capital turrets stay non-destructible (G).** Backlog 4.8b.
- **Boss: one controller, a record per boss (H).** Module layout, weapon
  placement and count, weak points. Boss weapons reuse the existing
  `weapon_class` shells — Bomber, Interceptor, Raider.
- **Boss laser (I).** Drawn at once from the gun to the bottom of the screen —
  not an unfolding beam. Lasts one second. Telegraphed by the gun visibly
  heating, with sound, for about two seconds, so the player must move out of
  the column. Destroys everything in its path. *As built (corrected
  2026-10-19): the warning is 40 / 32 / 25 frames (0.8 / 0.64 / 0.5 s) on
  EASY / MEDIUM / HARD, the beam 50 frames, and a beam costs 5 / 10 / 10 HULL
  units (`BOSS_LASER_WARNING_DEFAULTS`, `BOSS_LASER_DAMAGE_DEFAULTS`,
  `scripts/level-compiler.mjs:528-530`; `beamFrames` in each region's
  `modules.json`).* **One per level on 1-4, two on
  5-8, four on 9-12**, to be tuned during balancing — rescaled to the
  twelve-level campaign by decision **AC** (2026-09-22) from 1-4 / 5-9 / 10-16.
- **The boss finale (decision B's second phase; S5-2, owner answers Q3 and
  Q6 of 2026-10-09; `OWNER-SMOKE CANDIDATE`, [plans/s5-boss-regions.md](plans/s5-boss-regions.md) §4.2).**
  When the boss's last armour module falls - the plates are the fight's
  visible progress - the boss makes its last stand: every weapon still
  standing fires a **three-shot volley**, one shot a frame from the columns
  left of, at and right of its centre, at **half its reload**, never faster
  than the region's finale floor. The first volley comes on the frame after
  the last plate falls (no gun fires on the frame a module falls, owner
  decision of 2026-10-09); nothing fires once the last weapon is down, and
  the boss still falls with its last weapon (armour standing or not). Region
  data (`fire.finaleCooldown`, 0 = none): **off in region 1** (its fight is
  accepted as it is, Q6); on in regions 2-4 (each its own boss since S5-3 …
  S5-5) at a floor of 12 frames, half of region 1's `fire.cooldown` (region
  4's Void Citadel is designed around it; region 2's Bastion has its doors as
  its only armour, so its finale is the core's endgame).
- **The boss order and the difficulty curve (feat/boss-order-scale, the
  owner's decision AX of 2026-10-16; `OWNER-SMOKE CANDIDATE`,
  [plans/boss-order-scale.md](plans/boss-order-scale.md)).** The four bosses
  end their regions easiest to hardest: **region 1 the Blockade Breaker,
  region 2 the Void Citadel, region 3 the Siege Spine, region 4 the Bastion**
  - data, `assets/graphics/boss-regions/order.json` (`[1, 4, 3, 2]`: the
  boss directories keep the names they were drawn under). Each boss's block
  code (the well, the field, the rails) goes with it; the laser tier is the
  level's (decision AC), so a moved boss fires its new levels' slots - the
  Citadel's lens (the well's axis) is its slot 1, so the axis fires on level
  4's one slot and the pull still drags the ship into danger (owner answer 4);
  its cannons stand capped on level 4 (the left one fires from level 5). The
  curve, by data only (each boss's hit points and reloads; the level's
  per-difficulty scale untouched): fights of about **92 / 102 / 112 / 122 s
  on MEDIUM**, EASY about 0.8x and HARD about 1.25x of it, longer at every
  step on MEDIUM and HARD (on EASY within the replays' spread), and the
  danger - the boss's own fire - rising in the same order: the Bastion the
  fiercest but not a wall (about 18-20 hits a minute on the aiming bot,
  MEDIUM; 28 before). MEASURED per region and difficulty, three replays a
  cell, in `docs/boss-curve.json` (EASY / MEDIUM / HARD seconds on each
  region's first level; every hit and the boss's own fire a minute on the
  aiming bot, MEDIUM): the Breaker 78 / 93 / 125 s, 8.0 (5.8); the Citadel
  (level 4) 84 / 99 / 126 s, 14.5 (7.1); the Spine (levels 7-8) 97 / 106 /
  139 s, 13.2 (10.1); the Bastion 96 / 122 / 161 s, 20.4 (14.9). A region's
  later laser tier fights longer (the Citadel on levels 5-6 99 / 120 / 151 s,
  the Spine on level 9 104 / 112 / 138 s). The data (the owner's brief of
  2026-10-17): the Breaker 73 % of its hit points (guns 9, cannons 14,
  plates 6 / 7 / 4: 130 of 178); the Citadel about x 1.25 (its level-4 pool,
  170 -> 212: spires 12, core 29, lens 27, guns 11, plates and the capped
  plate 11) and its guns' reload x 1.2; the Spine x 0.90 and its guns' reload
  x 0.85 (51 / 60 / 64 / 51); the Bastion's rail guns 15 -> 16, core 74 ->
  79, doors 22 -> 24, its rail guns' reload 70 -> 125 and the core's 90 ->
  130. Every hit a minute includes the shared escort's laser: on level 4 it
  is half the Citadel's (7.5 of 14.5: the well pulls the ship to the centre
  column, where the escort enters and holds), so by every hit the Spine
  (13.2) sits under the Citadel; by the boss's own fire the order holds.
- **The drawn hit box (decision AW, 2026-10-16).** Every hostile shot - a
  boss's pulse or salvo shot, a beam, an Interceptor's laser - is tested
  against the ship as the player sees it, `x .. x + 15` (16 HPOS,
  `PLAYER_VISIBLE_WIDTH_HPOS`); it met only the left 8 HPOS before, so a
  ship at x = 2 mod 4 took no Interceptor laser at all. Every fight is harder
  for it (boss hits on the bots +29 % / +37 % on MEDIUM); every fairness rule
  holds on the drawn ship.
- **The Bastion's L (decision AX 5 and 11-13, the owner's choices of
  2026-10-16).** Each rail's guns stand three columns apart and the rail
  slides 3 columns a kill (the front slot stays at 17-19 / 43-45, the rail
  travels 6 columns); its inner end is an L - a two-cell armoured foot in the
  armour row in front of the bumper. The second slide puts the foot in front
  of a standing cannon: the cannon shows locked steel again (covered), shots
  on the foot deflect (or are absorbed by its own running beam - never
  damage), and its beam starts under the foot. Mechanics otherwise as built.
- **The boss art pass: a palette per band row (the owner's variant B and his
  looks of 2026-10-16, journal §AV; `OWNER-SMOKE CANDIDATE`,
  [plans/boss-art.md](plans/boss-art.md)).** The bosses take region 3's
  recipe: light steel faces, a saturated trim drawing every outline and
  shadow edge, a dark bulk only in the recesses, light from above. The band
  DLI's phase 0 arms a switch on the first line of each row whose colours
  change - COLPF1 (the trim) and COLPF3 (the bulk) only: COLPF0 and COLPF2
  are the in-band shots' colours and the b3 flash's, fixed for the region.
  Region 1 rust over light slabs (two switches), region 2 an orange trim
  over red (the owner's choice O of 2026-10-17, replacing the olive), the
  core yellow to red, the cannons pointed finned
  spires with their damage on the whole cannon (three switches), region 3
  exactly as before (none), region 4 gold over violet (one). Every row keeps
  the flash pair at least 80 apart (Atari800's palette) and every colour at
  least 45 degrees from the ally steel; locked parts stay grey steel, what can
  be hurt shows amber. Mechanics, hit boxes and timings are unchanged.
- **Region 1's boss: Blockade Breaker with twin laser cannons (owner answers
  of 2026-10-13; `OWNER-SMOKE CANDIDATE`, [plans/boss-r1-twin-lasers.md](plans/boss-r1-twin-lasers.md)).**
  Levels 1-3 end on one
  damaged ship: a **continuous hull spine** along the band's top, end to end,
  from which every gun and cannon hangs by a strut (burgundy trusses fill the
  empty cells under it); the spine is hull - it stops every shot and cannot
  be destroyed, so with every plate gone the boss still reads as one ship.
  The plates are a **one-row armour belt** under the weapons (row 4), each
  plate still in front of every column of the weapon above it. **Two laser
  cannons**, left and right of the centre (columns 21-23 behind plate-c, 41-43
  behind plate-f), fire **one laser in turn**: never two beams at once, each
  cannon's first shot as soon as its plate falls, then strict turns at one
  cannon's cadence; the survivor of the two keeps firing alone. gun-1 sits in
  the central slot (behind plate-d), gun-2 in the open bay as before. Every
  stage keeps its amber pixels, so the b3 hit flash shows on both cannons.
  Rule (B) as recorded (owner answer 2 (a)): only gun shots wait on a
  module-kill frame; a laser warning may start on it. Under the belt the
  display list ends the band (the owner's smoke of 2026-10-13: shots turned
  grey there), so a projectile under the boss has the playfield's colours.
  Plates trimmed to MEDIUM about 110 s: a, b, c, g, h 8; d, e 10; f 6.
- **The Bastion (region 2 as built; region 4 since feat/boss-order-scale) - the dome hangar, the armoured cannon bays,
  the sliding rails (S5-5, the owner's design of 2026-10-14, his choice "B -
  the window" of 2026-10-15 and his looks of the same day; journal §AT, §AU;
  `OWNER-SMOKE CANDIDATE`, [plans/s5-boss-regions.md](plans/s5-boss-regions.md) §6.5).**
  Levels 4-6 end on a still fortress (no drift: the rails' slides are its only
  motion) hung from one overhead track that runs from screen edge to screen
  edge. At the centre the **hangar**, a round dome five cells wide with the
  **core** inside it - a round amber reactor with a white eye, the brightest
  thing on the ship (a salvo launcher) - and the **doors** at its foot, a
  single barred gate: the escort Interceptors launch over it (decision AI's
  cadence; the gate flashes just before each). Beside the dome, a **laser
  cannon in an armoured bay** on each side: the whole cannon always in view (a
  stepped steel spire, unlit while locked), its **armour** - the gate's bars -
  in the row under it, between the cannon and the player. Locked, shots
  deflect off the armour and the cannon fires through under it (its beam
  starts below the armour). Outside them, left and right, a **gun rail**: a
  girder from beyond the screen edge to its striped buffer, three guns on it,
  only the front one able to fire or be hurt. **The window:** destroying a
  rail's front gun slides the whole rail one gun pitch (4 columns) inward a
  beat later (one column every 4 frames, a clank each), bringing the next gun
  in from beyond the edge - and **opens that side's bay** with a flash and a
  tone: the armour falls away, the cannon lights amber and can be hurt, its
  beam now from the muzzle; no timer closes it. The **second** slide pushes
  the rail over the cannon: a **covered cannon** cannot be hurt any more
  (shots deflect off the rail) and **keeps firing** to the end of the fight,
  its beam from under the rail's end; over an empty socket the rail just
  slides. While a bay is open and its cannon stands, the gun whose fall would
  cover it **pulses** - the warning. A rail stops there and never covers the
  hangar. **Open a cannon's armour, destroy it before the rail closes in.**
  **The gate:** locked until every cannon and every rail gun is destroyed or
  covered; then it opens with a flash and a held high tone and turns to amber
  hazard stripes; the doors' phase is short (22 hit points, about 12 s on
  MEDIUM for a careful player), and when they fall the escort stops for good,
  the core is exposed - its left flank armoured, so its own volley covers
  every column it can be shot from - the finale (its volleys at half reload)
  begins, and the core (74 hit points) falls last. **Fairness:** the core's
  whole reach lies under a cannon's beam or its volley (danger, not a refuge),
  every beam's warning leaves at least 22 frames to step out on HARD. Lasers
  (decision AC): one beam on level 4 (the cannons take turns, a locked or
  covered one keeps its turn), two on levels 5-6 (independent). A parked
  fighter at the left edge can hit nothing and is reached by the escort, which
  a first kill starts (measured: a stalemate, not a refuge). Colours (the owner's
  choice O, 2026-10-17): pale steel, the hittable yellow `$EC`, the orange
  trim `$1A-$16` and the dark orange bulk `$12` over the red `$34 / $32`, all
  far from the ally steel `$88`; the region's charset 88 codes in six sectors
  (the owner's standing rule of 2026-10-15: bosses spend what their quality
  needs within the hard gates).
- **Region 3's boss: Siege Spine and its force field (S5-3, owner answers of
  2026-10-13; `OWNER-SMOKE CANDIDATE`, [plans/s5-boss-regions.md](plans/s5-boss-regions.md) §6.3).**
  Levels 7-9 end on a long segmented spine with dorsal spikes, a generator
  sphere at each end, a domed siege cannon at the centre (a laser on every
  laser tier), two more emitters and two guns behind armour plates, and two
  open guns near the ends (the edges stay under fire). Under the spine runs a
  **force field** in two halves, each fed by the generator at its end: while a
  half is powered every player shot in its columns stops on the field (the
  deflection, no damage); the boss's guns and lasers fire through it. Breaking
  a generator collapses its half column by column from that end, so the fight
  goes generator, then plates, then the weapons behind them - one side
  usually opens first. The defeat rule is unchanged (the last weapon), the
  escort is region 1's cadence (decision AI), the final salvos are on (floor
  12 frames), the b3 hit flash shows on every module and generator. Colours:
  steel plates, a dark steel hull and a **violet** trim and field (`$66`, hue
  294°, clear of the levels 7-9 ally steel `$84`, 226°, so it reads as the
  enemy at a glance). No sprite: P1 / P2 stay unused in the boss sector.
  Fight (aiming bot, the ratio rule): 89.5 / 118.8 / 150.1 s on levels 7-8,
  109.4 / 118.2 / 152.0 s on level 9 (EASY / MEDIUM / HARD); **HARD is far
  longer than MEDIUM, for review in M8**, as region 1's.
- **The Void Citadel (region 4 as built; region 2 since feat/boss-order-scale) and its gravity well (S5-4, the
  owner's decisions of 2026-10-13 and 2026-10-14; the still citadel of
  `fix/r4-immobile`, journal §AR; `OWNER-SMOKE CANDIDATE`,
  [plans/s5-boss-regions.md](plans/s5-boss-regions.md) §6.4, §6.4.8).** Levels
  10-12 end on an octagonal fortress that **does not drift**: it hangs still,
  centred, the whole ship on screen - one solid deck from end to end, the
  weapons set into it in two blocks, a **black void core** with a bright rim
  at the centre, a **salvo spire** against each end of the hull, a one-row
  armour belt under the weapons, no engines. **The gravity well:** while
  either spire stands the player's ship is pulled sideways - 2 colour clocks
  every 4 frames (G2), a quarter of its own speed, so it can always hold or
  move away - towards the well's **axis**, and the core pulses (it dims for 3
  frames every 16). The axis is shown by a **gravity column**: a white S-wave
  under the core, from the boss down the playfield (missile M0, the ship's
  white - never a laser's colour; P1 / P2 stay free for the M6 VOID LANCE
  reticle). **The axis is danger, not a refuge** (owner answer 4): the
  core fires its own beam down the column from its lens - the column flares
  in the beam's warning and gives way to the beam - and the lens cannot be
  hurt while a spire stands; two narrow laser cannons hug the core on both
  sides, each behind its own belt plate, their beams edge to edge with the
  core's - no spot from which the lens or the core can be shot lies outside
  the lasers (the still band no longer sweeps fire across the gaps; the outer
  gaps between the guns stay, owner answer 2 of §AR). Destroying both spires stops the pull, the
  pulse and the column at once and exposes the lens; the core falls only
  after the spires and its lens. Three lasers (the cannons and the lens: the
  engine's four slots hold at most four emitters), six guns, four plates;
  the escort is region 1's cadence, the final salvos are on (floor 12), the
  b3 flash shows on every module. **Fairness rule:** with the pull on, the
  player can always leave a warned beam with at least 10 frames of the
  warning left (measured: 21 on HARD). Colours: pale steel, a dark violet
  hull (`$62`) and void magenta (`$58`), both far from the levels 10-12 ally
  steel `$84`. Fight (aiming bot, the ratio rule): **92.6 / 107.3 / 154.3 s**
  (EASY / MEDIUM / HARD).
- **Design rules from the Void Citadel (the owner, 2026-10-14).** (1) A module
  that gates the end of the fight must not sit at the band's extreme ends -
  its reach windows (the band's drift) bind the fight's length, not its hit
  points; on a still band (region 4) every module must lie in the player's
  shots (HPOS 56-208). (2) A boss's signature mechanic must create danger, not a refuge -
  the place a mechanic pushes the player to must be under fire.
- **Difficulty scales reload, spacing and damage (J).** See "World and
  difficulty" above.
- **Lives (K).** Three at start, plus one after each odd level from 3.
- **Level select (L).** The player may start from the furthest level reached.
  RAM only, so it is lost at power-off; changing difficulty in the menu resets
  it to level 1; the menu shows which levels are available, so the player is
  not guessing.
- **High scores (M).** RAM only — confirms existing behaviour. (The TOP SCORES
  table is never written; the level-summary screen's per-level best is a
  separate save record on the game's own disk, M5a-S2.)
- **Permanent weapon booster (N).** Collecting it raises the player's weapon
  level by one, up to five; collecting the same booster again raises another
  level. The level sets projectile damage, and the player reads his current
  strength off the shot itself **with no HUD**. Dying costs **one** level, not
  all of them. The other boosters keep working as they do today. No existing
  booster modifies damage (MEASURED: `src/main.s:4105`), so the level stays
  one variable rather than a system of composing modifiers.
- **Booster level signalling (U).** **Shape and sound, not colour.**
  - **Shape.** A thicker or doubled bolt per level. Player projectile glyphs
    are their own bank — 45 glyphs, codes 11-55, ceiling
    `CAPITAL_HULL_GLYPH_BASE = 59` — so five looks fit with three codes to
    spare, and a shape change reads inside the same colour register and
    conflicts with nothing.
  - **Sound.** A different firing sound per level: parameters on the existing
    POKEY firing channel, not a new channel. It works while the player's eyes
    are on the enemies rather than on his own shots.
  - **Both, deliberately.** Shape reads when the player is watching his shot,
    sound when he is not. They reinforce rather than duplicate; neither is
    redundant and neither is to be dropped later.
  - **Colour: rejected.** `COLPF2` is not exclusively the player's — the
    debris breakup's yellow phase, three allied capital-hull glyphs and the
    capital explosion core all render in it, so recolouring it per level would
    repaint them (evidence in STATUS, "Decision U — the COLPF2 check").
    Player projectiles keep one colour at every level: mint `$AE` since
    plasma FX (owner, 2026-10-06, `docs/plans/plasma-fx.md` §14), which
    reverses decision U's yellow `$1E` for the whole of `COLPF2` at once -
    shots, allied hull details, the capital core and the sector-4 sky's stars.
    The rule against a per-level colour stands.
  - **Five levels stand for now**, but three may read more clearly than five
    if sound discrimination proves weak in play. Settled during balancing, not
    assumed.
- **Loader screen (O).** A randomly chosen line from a pool of 8-16 short
  English texts, plus an animation stepped one frame per sector read — not a
  progress bar. The texts are spoken by the fighter's onboard AI: cynical,
  having seen too much. **As built (fix/smoke-2026-10-07, P3):** the
  loading/summary screen shows no AI line - it ran into the statistics - and
  no home on the boss's WARNING screen fits without boot bytes
  or a boss-entry sector; the four placeholder lines stay in
  `assets/text/loader-ai-lines.json` for the backlog's "AI chatter line: find
  a home". At START GAME, before a level is played, the screen shows no
  statistic without a value: of the panel only BEST (the level's best from the
  save record) is shown.
- **End screen (P).** Eventually an animation in the top third at full width
  with a text scroll below. A simple message suffices for now.

### VOID LANCE — M6 (replaced the planned Nova Missile)

The VOID LANCE replaced the Nova Missile, which was never built: there was no
code, no HUD cell and no score hook (journal §AE 1, §BD). It is the boss
sector's own weapon and never an ordinary drop. Plan:
[`plans/m6-void-lance.md`](plans/m6-void-lance.md).

**As built (journal §BF-§BI; `OWNER-SMOKE CANDIDATE`; the owner accepted
§BH's rules on the smoke of `abaab35`, journal §BI):**
- **The meter:** the lance charges with time on the boss screen. A meter
  fills over 1,250 boss frames (25 s) on MEDIUM, 938 (18.76 s) on EASY and
  1,562 (31.24 s) on HARD - the boss's own hit-point ratios, x 3/4 and
  x 5/4. Full, **one** lance is ready; lances do not stack. The shot empties
  the meter and it fills again. It runs in the boss sector only and is empty
  at every boss entry. There is no capsule, no stock counter and no HUD cell.
- **Readiness:** the ship turns green (`$CA`) while a lance is ready - the
  owner's choice (indicator C, journal §BI 3; the torpedo variant T is gone) -
  and a short tone on channel 3 when it becomes ready. A HUD text has no room
  (plan §6.3).
- **Onboarding:** every boss's loading banner carries one line under
  INCOMING, `VOID LANCE: HOLD FIRE+FORWARD`, in the game's lettering (ANTIC 2;
  journal §BI 1).
- **The reticle:** only while a lance is ready, and then always (journal
  §BH 2), on P1 in the lasers' colour on the line under the band: the
  crosshair at the module's centre when the ship stands under a module a
  player shot would hurt, a hollow mark (half the crosshair's pixels) at the
  ship's column when it does not.
- **The charge:** FIRE held with the stick UP for 75 frames (1.5 s), whatever
  is under the ship (journal §BH 1). The gesture is level-triggered: FIRE
  held for seconds and UP added starts it at once. The mark blinks two frames
  in four and the ship moves at half speed, its green brightening from the
  steel's luminance to near-white over the 75 frames and snapping back to
  the ready green on a release (journal §BI 2). The ordinary fire never changes.
  Only releasing either cancels it; the column under the ship changing, or
  the ship reaching its limits, does not. The gesture does nothing while the
  meter fills.
- **No target on the fire frame** (armour, open sky, a covered module, the
  core, a closed door, a powered field): the beam still fires, up through
  the hollow mark to the band's foot, and the lance is **not** spent - the
  meter stays full and the ship stays green (journal §BH 3).
- **The beam:** on the 75th frame a discharge sounds on channel 3 (noise,
  until the beam is down or the kill's tick; journal §BI 2) and the beam
  leaves the ship's nose in the ship's own plane (P0), growing 20 lines a frame. When it reaches the
  module, the module is destroyed through the shot's own kill path: the
  spark, the score, the kill stat, the capsule rule and the exposure of what
  stood behind it. Exactly one module dies, the one under the ship, and
  never the core. A player shot that would meet the boss on that frame waits
  one frame.

Stage 2's +1 life capsule is owner-accepted (journal §BN; section above); the plan for boss capsules as lances
is withdrawn (journal §BG 3).

### Interceptor — **OWNER-ACCEPTED** (roadmap 4.4)

The next ordinary enemy, full-pursuit variant (owner decisions 15 and 18).
**Owner-accepted** with the whole `0a90c1c` stack (owner smoke PASS
2026-09-18); the values below are the accepted ones. The sentence that
previously stood here — "awaits owner smoke; the values below are the
candidate's" — contradicted this section's own heading and was corrected
2026-09-20.

- **Light class.** It allocates no PMG player and is never drawn on `P1`/`P2`.
  It is not a smaller PMG Raider.
- **Character renderer.** It shares the accepted Light renderer class and
  glyphs with the Light Wingman; no new artwork.
- **Light slots.** *At acceptance (4.4)* the capacity was one Light-class
  enemy at a time, `Wingman OR Interceptor`, shown by a provisional smoke
  schedule. That schedule is retired: since roadmap 4.6 wave composition is
  level data, the Light kernel has four slots (`LIGHT_SLOT_COUNT = 4`,
  `src/hybrid/light-kernel.s:57`) and the Director caps Lights per sector at
  3 swarm / 1 elite / 0 capital / 1 boss (`src/c/director.c:193`), so a swarm
  flies Wingmen and Interceptors together — up to three live in level 1 (W2,
  `OWNER-SMOKE CANDIDATE`). The boss sector's ceiling of one is intentional.
  Corrected 2026-10-08, AUD-07.
- **Independent, no kamikaze runs — the standoff** (feat/interceptor-standoff,
  owner answers Q1/Q2 of 2026-10-11, decision AK; `OWNER-SMOKE CANDIDATE`).
  It keeps no formation and follows no Heavy leader. It enters at X 124 and
  dives **4 lines per frame** (four times the Heavy rate) until the player is
  **7 rows below it**; there it **holds**, and while the player is **closer
  than 6 rows** it **backs off upward** 2 lines a frame (the Interceptor is the
  only archetype allowed to fly upward). Each Light slot holds **2 rows higher**
  than the one before, so a swarm stacks into a column instead of merging into
  one cell. Every other frame it moves one 4-HPOS cell toward **the centre of
  the player's ship** (`(x + 6) & $FC`), clamped to 48-200 — the player's own
  top speed. After a **64-frame hover** it **climbs out** 3 lines a frame and
  leaves past the top; its longest life (121 frames, the ship on the bottom
  row) is under the boss escort clock's 128-frame floor.
- **Catchable in every phase** (fix/interceptor-speed, owner answers Q1-Q6 of
  2026-10-14, decision AS; `OWNER-SMOKE CANDIDATE`). A player shot (6 lines a
  frame, from the ship's centre) fired from directly below catches it in its
  dive, its hover, its back-off, its climbs, its top-hold and its exit: the
  climbs (3 lines a frame) are slower than the shot, and the column it tracks
  is the one the ship's shot leaves in. Until then it climbed at 8 lines a
  frame and tracked the ship's left edge, one HPOS beside the shot's line, so
  a player holding fire under it never hit it. It is still the fastest thing on
  screen: a 4-line dive and tracking at the ship's own speed.
- **The dead zone** (feat/boss-order-scale step 1, the owner's decision of
  2026-10-16 after the gfx-regression audit; `OWNER-SMOKE CANDIDATE`). While
  the ship's centre is within 4 HPOS of the hovering Interceptor's own - exactly
  while the ship's shot, `player_x + 8`, crosses its `[x, x + 8)` - it does
  not step sideways: it holds its column, which is the player's, and fires
  (`(uint8)(light_x - player_x - 1) < 8`, `src/c/lifecycle.c`). Outside the
  zone the tracking is unchanged. 0 B net in the window.
- **The top-hold loop** (feat/interceptor-standoff, the owner's smoke of
  2026-10-11 and answers L1/L2/E1 of 2026-10-12, decision AK points 9-10;
  `OWNER-SMOKE CANDIDATE`). A wave may author **loops** (level data, 0-3):
  after its hover the Interceptor climbs at 3 lines a frame to its
  **top-hold row** — y 32, the playfield's second row, for the first Light
  slot, two rows lower per slot, so it stays on screen — holds there without
  firing (the climb and the hold take 64 frames together; the hold 16 / 27 /
  37 frames for the three slots over a ship on the bottom row), then dives back to
  its standoff and flies it again. After the last loop it **climbs out
  upward** as above. Level 1's swarm and elite (a) Interceptors loop **twice**
  (a life of about 375 frames); **the boss escort loops 0** and keeps its
  single pass, life ≤ 121 frames. A downward exit "by the nearer edge" was
  built and measured and is not used (E1): clear of the player's column it
  can never trigger, because the standoff tracks that column. It never steers into the
  player; contact still counts if the player flies into it. Before this
  (roadmap 4.4 to 2026-10-11) it closed on the player all the way to the
  bottom edge — in effect a ram.
- **Laser bolt (roadmap 4.4c).** It fires through the established hostile
  PairShot path, but with its own weapon class `LASER`: a single thin bolt,
  **only when it is in the player's column** (straight down, never aimed), then
  a pause of 40/31/20 frames for EASY/MEDIUM/HARD — one, two or three shots per
  visit (56/44/32 until fix/interceptor-speed: the shorter hover, and EASY's
  first bolt before a ship parked under it can shoot it down). Speed, hitbox, damage and lifetime are those of every hostile
  PairShot.
- **HP and score.** **3 HP** in every wave — the swarm, elite (a)'s
  companion and the boss escort — from its archetype record, with no wave or
  difficulty bonus (feat/interceptor-armour, owner answer H3 of 2026-10-12,
  decision AN; `OWNER-SMOKE CANDIDATE`; 1 HP until then). A kill still scores
  15 points (`0x15` BCD), three times the Wingman's 5, and dies, releases its
  slot and leaves its debris exactly as the one-hit kill did. Contact follows
  the Light contract.
- **Survived-hit feedback: the pod flash** (owner answer F1, decision AN). A
  hit it lives through draws **that Interceptor's** two cells with bit 7
  cleared for **3 frames** (the hit frame and the next two), so its red rotor
  pods (colour 3, `COLPF3`) show `COLPF2` — the Interceptor stays itself,
  with no blink, explosion or colour-register write, and every other Light
  keeps its colours. Kernel cost: the flash shift, 7 cycles per live Light per
  frame; the resolver's flashing-code test only on a captured cell carrying a
  Light code.

Weapon classes also own their movement rate (roadmap 4.5b candidate):
`PULSE` and `LASER` fall 2 lines every frame; `BOMBER` (3) falls 2 lines every
second frame, 1 line per frame on average, with the same hitbox, damage and
lifetime in steps. Only the Bomber archetype fires `BOMBER` (4.5c candidate).

### Bomber — **OWNER-ACCEPTED** (roadmap 4.5c and 4.5d)

The last MVP archetype (owner decision 20), owner-accepted with the whole
`0a90c1c` stack (owner smoke PASS 2026-09-18), identity included.

With the Bomber the enemy roster is **frozen**: no new enemy archetype without
a new owner decision (owner decision 21). Further variety comes from waves,
flight paths, sector subtypes and boosters.

- **Heavy class on `P1`/`P2`.** A Bomber formation is two Bombers on the Heavy
  PMG players, the same renderer, collision and destruction path as the Raider,
  with the `SCYTHE_BOMBER` art as a QUAD (32-HPOS) hull.
- **Identity (roadmap 4.5d).** The silhouette is a **catamaran** —
  two hulls joined by a bridge, twin prongs instead of the Raider's single
  spine — so it never reads as a bigger Raider. The hull is **green** (hue C)
  and its luminance is driven by the remaining HP, which also gives a Heavy its
  non-lethal hit feedback: 4 HP `$C8`, 3 HP `$C6`, 2 HP `$C4`, 1 HP `$C2`, with
  the charge and flash brightening staying inside hue C. It was hue 8 (blue)
  until the 2026-09-23 owner smoke: `$88` is the **same byte** as the allied
  steel `GAMEPLAY_COLPF1`, so the Bomber wore the allied capital hull's own
  colour and read as friendly. Red was the stated fallback and was not taken —
  the enemy capital hull is burgundy, so a red Bomber would blend into the hull
  it flies over. Gameplay uses no hue C at all. The torpedo leaves
  from between the prongs. When the formation recycles, `P1`/`P2` return to the
  Raider colour `$44`, which the capital broadside missiles M1/M2 borrow.
- **Lane sweep.** Slot 0 sweeps the left lane (X 48-92), slot 1 the right lane
  (X 132-176) at 1 HPOS per frame, turning at the lane edges or when a per-slot
  timer expires (24-55 frames), so the pair never mirrors exactly. The lanes
  keep an 8-HPOS gap at their closest.
- **Entry and descent.** Both start wholly above the gameplay area (Y 0). Slot
  0 enters at 1 line per frame to depth 40, slot 1 to depth 16; then each
  descends 1 line every other frame on opposite frame parity, so slot 1 trails
  and the pair is not phase-locked.
- **Fire: the attack run (roadmap 4.5d).** Each Bomber has its own reload
  timer (the first run after 48 / 72 frames for slot 0 / 1). When it runs out
  inside the fire band, the Bomber brakes (X and Y freeze) and charges for
  **20 frames** with its hull brightened, then fires **two** `BOMBER` shells
  **8 frames apart** from the same column (1 line per frame on average), and
  sweeps on in a fresh direction while it reloads **64 / 52 / 40 frames** on
  EASY / MEDIUM / HARD (`BOMBER_AIM_FRAMES`, `src/c/lifecycle.c:230`; the
  attack, `enemy_c_heavy_tick`, `:1610-1657`; burst 2 x 8 and reload in the
  record, `:302-312`).
  It fires only between Y 24 and 200, not while the player is dying and not
  when the capital sector is due. Shells are emitter-independent like every
  hostile shot. (Corrected 2026-10-19: this said one shell, then 80/64/48.)
- **HP and score.** 4 HP; a kill scores 50 points.
- **Escort.** A Bomber formation brings no Light escort in the smoke schedule.
  That is wave data, not a Bomber rule; roadmap 4.6 may give it one.
- **Smoke order.** A TEMPORARY 4.5 HEAVY SMOKE SCHEDULER alternates Raider and
  Bomber formations (Raider first in a fresh game) so a smoke run shows both.
  Roadmap 4.6 replaces it with the data-driven Encounter Director.

Longer level structures, bosses, and further audio/visual polish remain future
work. They are not implied by the current enemy-roster descriptors or
review-only asset records, which describe the Raider-era roster.


## L2 audit candidate — §BW.8

The brake acts only in capital sectors, including DRAIN/COMPLETE. Releasing
DOWN while alive ramps back over 8/9/10 frames. Capital completion and the
start of DYING intentionally restore full speed immediately; respawn keeps
the same sector and L2 image, and held DOWN may brake again. Pickups retain
one-half world motion at every brake numerator, including odd ramp steps.
The normal SPACE and boss rates are unchanged. This candidate awaits the
fixed candidate's owner smoke; the original b2b38ff smoke PASS is recorded
in §BW.8.
