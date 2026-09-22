**English** · [Polski](how-to-play.pl.md)

# Void Strike 65 — how to play

Void Strike 65 is a vertical space shooter for the Atari 65XE. You fly a single
fighter through contested space, alone, against everything that is already
there.

This page is for players. It describes the rules of the game, not the code.

## Status

The game is not finished. This page describes the whole design, so some of what
follows is not in the build you can play today.

**Working today**

- Open-space flight.
- The capital run.
- Four enemy types: Raider, Bomber, Wingman, Interceptor.
- Destructible debris.
- Pickup capsules.
- Three difficulties.

**Still being built**

- The twelve-level campaign.
- Bosses.
- Light-fighter swarms.
- The permanent weapon upgrade.
- Progress memory.

Everything below marked as part of the campaign, the boss or the weapon upgrade
is the design, not the current build.

## What it is

You fly a fighter. Each level is a run of sectors, and every level ends with a
boss.

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

Debris and pickup capsules appear everywhere.

## Controls

| Input | Action |
| --- | --- |
| Joystick, port 1 | Move |
| Fire | Shoot |
| Space | Pause |
| Space or Fire, during the boot splash | Skip the title screen |

## The ship

Your fighter has 100 hull points. The HULL bar shows 100%, 75%, 50% and 25%.

Hull is the same on every difficulty. What changes is how much damage enemies
do — not how much you can take.

You start with three lives, and earn one more after completing levels 3, 5, 7,
9 and 11. That is five lives across the campaign.

Colliding with an enemy kills you. Survival is about not being hit.

## Difficulty

| Difficulty | For |
| --- | --- |
| ROOKIE | Anyone should be able to finish it |
| PILOT | The default |
| ACE | People who know the patterns |

Difficulty scales four things: the damage enemies do, the damage you do,
collision damage, and enemy rate of fire.

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
| Interceptor | Light | Fast pursuer, single aimed laser | 21 |
| Boss | — | End of every level | 100 |

The Bomber's hull darkens as it takes damage, so the colour tells you how much
of it is left.

**Heavies cannot be bypassed.** They stay until destroyed. They fly the full
vertical range — down to the bottom edge and back up — and the sector does not
advance while they live.

**Lights pass through.** A wave flies its path and leaves. Killing it is a
choice between points and safety.

One exception: light fighters escorting a heavy stay with it.

## Upgrades

Pickup capsules appear as you fly.

The weapon upgrade is permanent. Each capsule raises your weapon one level, up
to five. You can see the level in the shape of your shots and hear it in the
firing sound.

Dying costs one level. Not all of them.

## The boss

A boss is a structure of repeating modules. Its guns are borrowed from ordinary
enemies. It also has a laser.

The laser cannot be dodged once fired — but it announces itself. The gun heats
for about two seconds, with a rising tone. That is the time to leave the line.
Then the beam lights for one second and destroys everything in its path.

One laser on levels 1-4. Two on 5-8. Four on 9-12.

## Capital ships

Every level has a different pair. They differ in segment appearance, length,
turret density and how far the gondolas protrude.

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
| Interceptor | 21 |
| Debris | 25 |
| Bomber | 50 |
| Boss | 100 |

Debris scores whether you shoot it or ram it.

Debris is hard to hit and takes three shots, which is why it pays what it pays.
Shooting it also counts toward the next weapon capsule; ramming it does not.

## Running it

The game boots from a disk or from an SIO2SD. Nothing needs to be held down at
power-on.
