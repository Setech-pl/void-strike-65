**English** · [Polski](enemies.pl.md)

# Enemies

Everything that shoots at you in Void Strike 65, as it plays in release
**v0.3.0**, which is level 1 ending on its boss. The numbers come from the
game's code and data. The pictures are frames of the game itself, captured in
Atari800 (PAL), enlarged and shown through a CRT filter. Nothing is redrawn.

There are two classes of enemy:

- **Heavy** ships are drawn with the Atari's hardware sprites. They come in
  pairs and stay until destroyed.
- **Light** fighters are drawn in characters. They fly their path and leave,
  so killing them is a choice between points and safety.

Difficulty is chosen in the menu as **ROOKIE**, **PILOT** or **ACE**. Where a
number below has three values, they are for those three in that order. An
enemy keeps the listed durability unless a profile gives three values;
difficulty also changes how often it fires.

<img src="media/badges/coming-soon.svg" height="16" alt="COMING SOON">
marks what is built but not in v0.3.0. It arrives with the campaign.

The bosses have [a page of their own](bosses.md).

| Enemy | Class | Hits to kill | Points | Weapon | Where in level 1 |
| --- | --- | ---: | ---: | --- | --- |
| [Raider](#raider) | Heavy | 1 | 10 | pulse bursts | the first sector, after the capital run |
| [Bomber](#bomber) | Heavy | 4 | 50 | shells | the first sector, after the capital run |
| [Wingman](#wingman) | Light | 1 | 5 | single pulse | escorting Raiders, in the swarm |
| [Interceptor](#interceptor) | Light | 3 | 15 | laser bolt | the swarm, with Raiders, the boss escort |

Every enemy shot costs you one tenth of your hull. Flying into an enemy costs
the whole hull, unless the Shield is up or you are still blinking after a
respawn.

---

## Heavy

### Raider

<img src="media/enemies/raider.png" width="480" alt="The Raider: a dark red swept-wing fighter, enlarged from a frame of the game">

The standard enemy fighter, flying as a pair.

Level 2 also uses an armoured profile: broader plated wings, a violet
hull, 2 /2 /3 hits to kill, an authored firing stop and a sideways dodge after
a surviving hit. Assault Raiders keep their original silhouette and one-hit
health. Both profiles share the Raider's weapons, score and renderer.
Armour loses a visible piece of one wing at 2 and 1 HP; a 2-HP Raider jumps straight to the
last damage look after its first surviving hit.

- **Hits to kill:** 1. **Points:** 10.
- **Weapon:** the pair shares one gun rhythm. It fires five pulse shots 15
  frames apart, then pauses for 60 / 50 / 40 frames (1.2 / 1.0 / 0.8 s). A
  shot falls two lines a frame and keeps flying after its Raider is destroyed.
- **Movement:** both enter from above the screen and descend to their places.
  Then they pursue you sideways with a readable weave, at 80% of your top
  speed. Each turns on its own timer, so the pair never mirrors.
- **Contact:** costs your whole hull; the Raider takes one hit.
- **Where:** level 1's first sector (four pairs, each with a Wingman). After
  the capital run, a pair with an Interceptor, and the last pair alone before
  the boss.
- **Drops:** a Raider you shoot down counts toward the next pickup capsule.

### Bomber

<img src="media/enemies/bomber.png" width="480" alt="The Bomber: a green catamaran with two hulls joined by a bridge">

<img src="media/enemies/bomber-attack-run.gif" width="640" alt="Six seconds of level 1: a Bomber pair sweeping their lanes, braking and firing shells">

A heavy bomber with a catamaran silhouette (two hulls, one bridge), so it never
reads as a big Raider. It is green, a colour nothing else in the battle wears.

- **Hits to kill:** 4 / 4 / 5. At 2 HP the green hull gets darker; at 1 HP it
  turns orange-red. It flashes on a surviving hit and loses a visible piece
  of one side at 2 and 1 HP.
- **Points:** 50.
- **Weapon:** an attack run. The Bomber stops, its hull brightens for 20
  frames while it aims, then it fires two shells 8 frames apart from the same
  spot. The reload before the next run is 64 / 52 / 40 frames. A shell falls
  one line a frame, half as fast as a pulse.
- **Movement:** each of the pair sweeps its own lane, one on the left and one
  on the right. It turns at the lane's edge or after half a second to a
  second, and sinks one line every other frame.
- **Contact:** costs your whole hull.
- **Where:** level 1's first sector (four pairs), and one pair after the
  capital run.
- **Drops:** a Bomber you shoot down counts toward the next capsule.

---

## Light

### Wingman

<img src="media/enemies/wingman.png" width="360" alt="The Wingman: a small red V-shaped fighter">

A small escort fighter.

- **Hits to kill:** 1. **Points:** 5.
- **Weapon:** one pulse shot every 96 / 80 / 64 frames, and only while it is
  fully on screen.
- **Movement:** as an escort it sits centred above its Raider and follows it.
  If its Raider is destroyed, or when it flies in a swarm column, it drifts
  straight down and leaves the screen.
- **Contact:** costs your whole hull.
- **Where:** escorting the Raider pairs of level 1's first sector, and in two
  columns of three in the swarm after the capital run.
- **Drops:** nothing. Light fighters never count toward a capsule.

### Interceptor

<img src="media/enemies/interceptor.png" width="360" alt="The Interceptor: a small fighter with red rotor pods on steel arms">

The fastest thing on the screen, and the only enemy that flies upward. It does
not ram you: it holds above you and fires down.

- **Hits to kill:** 3. When it survives a hit, its red pods flash for a moment.
- **Points:** 15.
- **Weapon:** a thin laser bolt, fired straight down and only when it is in
  your column. Between bolts it waits 40 / 31 / 20 frames, which comes to one,
  two or three bolts per visit.
- **Movement:**
  - It dives four lines a frame until it is seven rows above you, then holds
    there and follows the centre of your ship sideways.
  - If you come closer than six rows, it backs off upward.
  - While your shot is crossing its column it stops moving sideways: it holds
    its place and fires.
  - After 64 frames (about 1.3 s) of hovering it climbs out of the top of
    the screen at three lines a frame. That is slower than your shots, so it
    can be caught in every phase of its flight.
  - In some waves it climbs only to the top of the screen, holds there and
    dives back for another pass. In level 1 that happens twice before it
    leaves.
- **Contact:** costs your whole hull.
- **Where:** three in the swarm after the capital run, stacking above one
  another, two rows apart. One flies with the Raider pair that follows. During
  the boss fight they are the [boss escort](#the-boss-escort).
- **Drops:** nothing.

---

## Markings

Some waves send a Wingman or an Interceptor with different markings, or with a
different shape. It is still the same enemy: it flies, fires, takes hits and
scores exactly as its type does.

### Wingman: flight-lead

<img src="media/enemies/wingman-flight-lead.png" width="360" alt="The flight-lead Wingman: the red V with white wingtips and a white nose">

The red V with white wingtips and a white nose. It leads the swarm after
level 1's capital run: the first column of three Wingmen wears it.

### Wingman: escort <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">

<img src="media/enemies/wingman-escort.png" width="360" alt="The escort Wingman: the red V with a steel inner edge">

The red V with a steel inner edge. It escorts the Bombers of level 2.

### Interceptor: hunter <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">

<img src="media/enemies/interceptor-hunter.png" width="360" alt="The hunter Interceptor: red arms, white rotor pods and a steel hub">

The Interceptor recoloured: red arms, white rotor pods, a steel hub. It flies
in level 2's swarms.

### Interceptor: lancer <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">

<img src="media/enemies/interceptor-lancer.png" width="360" alt="The lancer Interceptor: a kite-shaped dart with a red outline, steel body and white core">

A different shape: a kite-shaped dart, red outline, steel body, white core. It
flies in level 2's swarms.

<img src="media/enemies/swarm.gif" width="640" alt="Seven seconds of level 1's swarm: a column of flight-lead Wingmen, then three Interceptors stacking above the fighter and looping to the top of the screen">

*Level 1's swarm, after the capital run. A column of flight-lead Wingmen comes
first, then three Interceptors that stack above you and loop.*

---

## Other threats

### Capital ships

<img src="media/enemies/capital.png" width="640" alt="The capital run: the blue allied hull on the left, the purple hostile hull on the right with a turret, the fighter between them">

Two capital ships fighting each other, and you fly the corridor between them.
The blue one on the left is yours; the purple one on the right is the enemy's.

- **Neither can be destroyed**, and nor can their turrets. Fly around them.
- **Both fire `BROADSIDE` shells, and both hit you.** Your own side's fire is
  as dangerous as the enemy's. A turret warns for half a second (25 frames)
  and flashes for 4 frames before it fires.
- A shell, or flying into a hull, costs **two tenths** of your hull.
- Level 1's hull has 10 / 15 / 20 turret stations, depending on difficulty.
- **Where:** level 1's second sector. No enemy fighter enters the corridor
  while you fly it.

### Debris

Tumbling wreckage, all through the level.

- **Hits to kill:** 3. **Points:** 25, whether you shoot it or ram it.
- **Contact:** costs 2 / 5 / 7 tenths of your hull.
- **Drops:** debris you shoot down counts toward the next capsule; debris you
  ram does not.

### The boss escort

<img src="media/enemies/boss-escort.png" width="480" alt="An Interceptor flying under the boss's band of armour">

During a boss fight, Interceptors come one at a time. The first arrives when
you destroy the boss's first gun or laser cannon (armour does not count).
After that one comes every three to four seconds, until the boss falls. There
is never more than one at once, and none after the boss is destroyed.

An escort Interceptor makes one pass and climbs away; it does not loop. On
the Bastion it launches from the hangar gate, and the escort stops once the
gate is destroyed.

---

## Capsules

Every third qualifying kill releases a pickup capsule: Rapid Fire, then Spread
Shot, then Shield, then round again. A kill qualifies when your shot destroys
a **Heavy** (a Raider or a Bomber) or a piece of **debris**. Light fighters,
rams and kills by capital-ship fire do not count.

---

*How the pictures were made:*

- Every picture is a frame of the game running in Atari800 (PAL, PILOT):
  - level 1 for everything in release v0.3.0;
  - a review build of level 2 for the escort, hunter and lancer markings.
- The frames are enlarged eight times, with the Atari's PAL pixel shape kept,
  and shown through a CRT filter.
- The tools are in `scripts/pages/`; which frame each picture comes from is
  in `scripts/pages/stills.json`.
