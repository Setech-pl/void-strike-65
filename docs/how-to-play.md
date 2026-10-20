**English** · [Polski](how-to-play.pl.md)

# Void Strike 65 — how to play

Void Strike 65 is a vertical space shooter for the Atari 65XE. You fly a single
fighter through contested space, alone, against everything that is already
there.

This page is for players. It describes the rules of the game, not the code.

## Status

The game is not finished. The current release is **v0.3.0**, a pre-release
tested on a real Atari 65XE. It is level 1, ending on its boss, then the level
summary and back to the menu. This page describes the whole design, so some of
what follows is not in v0.3.0.

**In v0.3.0**

- Open-space flight.
- The capital run.
- Four enemy types: Raider, Bomber, Wingman, Interceptor
  ([Enemies](enemies.md)).
- The light-fighter swarm after the capital run.
- Destructible debris.
- Pickup capsules.
- The boss of level 1, the Blockade Breaker, with its loading banner
  ([Bosses](bosses.md)).
- The level summary. Your best score on the level is saved to the game's disk.
- Three difficulties.

**After v0.3.0, in the next release**

- The VOID LANCE, a heavy shot for boss fights ([below](#the-void-lance)).

**Coming with the campaign**

- Levels 2 to 12: the twelve-level campaign.
- The other three bosses: the Void Citadel, the Siege Spine and the Bastion.
  They are built and arrive when the levels that reach them are added.
- The permanent weapon upgrade.
- Starting from the furthest level you reached.

Everything below about levels after the first, the other three bosses, the
weapon upgrade or progress is the design, not v0.3.0. The VOID LANCE is built
but came after v0.3.0.

## What it is

You fly a fighter. Each level is a run of sectors, and every level ends with a
boss. There are twelve levels, in four regions of three. A new region means a
new enemy fleet to fly against, with its own ships.

There are three kinds of sector.

**Open space.** Enemies come in waves, or singly but heavily. Two flavours: a
swarm of light fighters, or one or two heavies that cannot be bypassed.

**The capital run.** Two capital ships are fighting each other and you fly the
corridor between them. The one on the left is yours. Its fire kills you too.
That is not a bug — it is a battlefield. The one on the right shoots at you on
purpose. Both hurt the same.

The corridor narrows and widens. Gondolas jut from both hulls. Turrets work
from either side. Position matters here, not rate of fire.

**Boss.** At the end of every level: a structure of repeating modules with guns
and weak points.

Debris appears everywhere. Pickup capsules do not: they come only in open
space, never during the capital run.

## Controls

| Input | Action |
| --- | --- |
| Joystick, port 1 | Move |
| Fire | Shoot |
| Fire + joystick forward, held 1.5 s, in a boss fight | VOID LANCE, once it is ready |
| Space | Pause |
| Space or Fire, during the boot splash | Skip the title screen |

## The ship

Your fighter has 100 hull points. The HULL bar shows 100%, 75%, 50% and 25%.

Hull is the same on every difficulty, and so is most of what hits it: an
enemy shot costs a tenth of your hull on every difficulty. What changes is what
debris and a boss's laser cost — not how much you can take.

You start with three lives, and earn one more after completing levels 3, 5, 7,
9 and 11 — five extra, **eight in all** across the campaign.

Colliding with an enemy kills you. Survival is about not being hit.

## Difficulty

| Difficulty | For |
| --- | --- |
| ROOKIE | Anyone should be able to finish it |
| PILOT | The default |
| ACE | People who know the patterns |

Difficulty changes how often enemies fire, how fast the world scrolls, what a
collision with debris costs (two, five or seven tenths of your hull), and the
bosses: how many hits their modules take (0.75×, 1×, 1.25×) and how hard
their lasers hit. It does not change the damage you do: every hit of yours
counts the same, and an enemy fighter takes the same number of hits on every
difficulty.

Changing difficulty clears remembered progress.

## Progress

The game remembers the furthest level you reached and lets you start there.

This is held in memory until the machine is switched off. It is not written to
disk. The same is true of the score table.

## Enemies

| Enemy | Class | Behaviour | Score |
| --- | --- | --- | ---: |
| Raider | Heavy | Fast fighter, fires in bursts | 10 |
| Bomber | Heavy | Catamaran silhouette; sweeps its lane, stops, aims, looses torpedoes | 50 |
| Wingman | Light | Flies in formation | 5 |
| Interceptor | Light | Dives to a firing position above you, follows your column, fires its laser straight down when it is over you, backs off if you close in. In some waves it then climbs to the top of the screen, holds there and dives back for another pass (in level 1, twice) before it climbs away. Takes three hits | 15 |
| Boss | — | End of every level | each module 20-99; 2,000 for defeating it |

The Bomber's hull darkens as it takes damage, so the colour tells you how much
of it is left. An Interceptor takes three hits: when one of your shots hits it
and it survives, its red pods flash for a moment.

Some waves send Wingmen or Interceptors with different markings or a different
shape. They are still the same enemy: they fly, fire and score exactly like the
type they belong to. The colour of the stars changes between sectors too; it
only marks where you are.

**Heavies cannot be bypassed.** They stay until destroyed. They fly the full
vertical range — down to the bottom edge and back up — and the sector does not
advance while they live.

**Lights pass through.** A wave flies its path and leaves. Killing it is a
choice between points and safety.

One exception: light fighters escorting a heavy stay with it.

## Upgrades

Pickup capsules appear as you fly. Every capsule is **gold**, whatever it
carries: one colour that means "upgrade", and one no enemy wears. What a capsule
carries is in its shape, not its colour.

The weapon upgrade is permanent. Each capsule raises your weapon one level, up
to five. You can see the level in the shape of your shots and hear it in the
firing sound.

Dying costs one level. Not all of them.

## The boss

A boss is a structure of repeating modules. Its guns are borrowed from ordinary
enemies. It also has a laser.

The laser cannot be dodged once fired — but it announces itself. The gun heats
with a rising tone for 0.8 s on ROOKIE, 0.64 s on PILOT and 0.5 s on ACE. That
is the time to leave the line. Then the beam lights for one second: it costs
half your hull on ROOKIE and all of it on PILOT and ACE.

The boss of levels 1-3 carries two laser cannons, one left and one
right of its centre. They take turns — never both at once — and when one is
destroyed the other keeps firing alone. Its guns and cannons hang under an
armoured spine that no shot breaks; the belt of armour plates below them must
fall before the weapon above a plate can be hit. The Siege Spine of levels 7-9
fires up to two lasers at once.

The boss of levels 4-6, the Void Citadel, does not drift: it hangs still in
the middle of the screen, the whole ship in view. It has a gravity well. While
either of the two spires at its ends stands, your ship is pulled sideways
towards the white column under its black core — the core pulses while it
pulls. You are always faster than the pull, but you must keep steering
against it. The column is no place to rest: the core fires its own laser
straight down it (the column flickers as the shot warms up), and from level 5
the laser cannon left of the core fires too, so close that its beam meets the
core's: there is no gap beside the core to shoot it from. Destroy both spires
and the pull, the pulse and the column stop at once — then the core's lens and
the core itself can be hit.

The boss of levels 7-9, the Siege Spine, hides behind a force field — the
shimmering line under its spine. Your shots stop there and do nothing. Each
half of the field is fed by the generator sphere at its end of the ship: break
a generator and its half of the field collapses. Its guns keep firing through
the field the whole time.

The last boss, the Bastion of levels 10-12, does not drift. At its centre is a
round hangar with a yellow and red reactor core inside it; the escort fighters launch
from the gate at its foot. Beside the hangar stand two laser cannons, each in
an armoured bay: grey steel behind a barred shield that sits between the cannon
and you. Your shots bounce off the shield, and the cannon fires through under
it all the same. Both cannons fire, each on its own. Outside the cannons, left
and right, runs a rail of guns that reaches off the screen; the end of each
rail is an L, a foot of armour reaching inward along the shield's row. Shoot
the front gun of a rail and the whole rail slides one step inward, bringing
the next gun in from beyond the edge — and the shield of that side's cannon
falls away: the cannon turns yellow, and now you can hit it. The second slide
pushes the rail's foot in front of the cannon: a covered cannon turns back to
grey steel and cannot be hurt any more, and it keeps firing from under the foot
until the end of the fight. While a cannon's shield is open, the gun whose fall
would cover it blinks — that is your warning. **Open a cannon's armour, destroy
it before the rail closes in.** The gate stays locked — barred grey, your shots
bounce off — until every cannon and every rail gun is destroyed or covered.
Then it opens with a flash and a chime and turns yellow: break it, stop the
escort, and the core behind it is yours. The rails never cover the hangar.

### The VOID LANCE

Every boss fight gives you one heavy shot: the VOID LANCE. Every boss's loading
banner reminds you how to fire it: `VOID LANCE: HOLD FIRE+FORWARD`.

- **Ready.** 25 s into the fight (about 19 s on ROOKIE, 31 s on ACE) your ship
  turns green and a tone sounds. A mark under the boss shows where the lance
  will strike: a full crosshair over a module it can destroy, a hollow mark
  over anything else.
- **Charge.** Hold Fire and push the joystick forward for 1.5 s. Your ship
  slows to half speed and brightens towards white as the charge builds. Let go
  of either and the charge is lost; nothing else breaks it. Your ordinary
  shots keep firing while you charge.
- **The shot.** The beam destroys the one module above your ship, whatever
  hits it has left. It never hits the core, or anything your ordinary shots
  could not hurt at that moment: armour, a shield, a powered field.
- **A miss is free.** Fired over empty space, the beam flies but you keep the
  lance: the ship stays green. Line up and try again.
- **One at a time.** After a kill the next lance is ready 25 s later. An unused
  lance does not carry over to the next boss.

The VOID LANCE replaced the Nova Missile planned earlier.

## Capital ships

The ship on your side is the same one all game — you get to know it. The
enemy's changes with the region: one hull for levels 1-3, another for 4-6,
another for 7-9, another for 10-12. Within a region, length, turret density
and how far the gondolas protrude still differ from level to level, so no two
runs down the corridor are quite the same.

Your own hull darkens in the second half of the campaign. You are further from
home and the light is worse.

They cannot be destroyed. Neither yours nor the enemy's — you have nothing that
would do it. Your job is to get through, not to win the battle.

Their turrets are indestructible too. Fly around them rather than shooting at
them.

Remember which side you are on. And remember that the shell does not care.

## Scoring

| Target | Points |
| --- | ---: |
| Wingman | 5 |
| Raider | 10 |
| Interceptor | 15 |
| Debris | 25 |
| Bomber | 50 |
| Boss module | 20-99 |
| Boss defeated | 2,000, added on the level summary |

Debris scores whether you shoot it or ram it.

Debris is hard to hit and takes three shots, which is why it pays what it pays.
Shooting it also counts toward the next weapon capsule; ramming it does not.

## Running it

The game boots from a disk or from an SIO2SD. Nothing needs to be held down at
power-on.
