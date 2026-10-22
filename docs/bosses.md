**English** · [Polski](bosses.pl.md)

# Bosses

Every level of the campaign ends on a boss. There are twelve levels, in four
regions of three, and each region has its own boss. The four are built and
drawn, and they grow harder in the order you meet them.

> **Release v0.3.0 ships level 1, which ends on the Blockade Breaker.** The
> Void Citadel, the Siege Spine and the Bastion come with the campaign, when
> the levels that lead to them are added. Their pictures here are from review
> builds that start at the boss. They are marked
> <img src="media/badges/coming-soon.svg" height="16" alt="COMING SOON">.

Difficulty is **ROOKIE / PILOT / ACE**, in that order wherever three numbers
are given. Fight lengths are measured with the game's aiming test bot on the
first level of the boss's region. The [enemies](enemies.md) have a page of
their own.

| Boss | Region | Levels | Signature | Fight on PILOT |
| --- | ---: | ---: | --- | ---: |
| [Blockade Breaker](#blockade-breaker) | 1 | 1-3 | twin laser cannons that take turns | 93 s |
| [Void Citadel](#void-citadel-) <img src="media/badges/coming-soon.svg" height="14" alt="COMING SOON"> | 2 | 4-6 | a gravity well | 99 s |
| [Siege Spine](#siege-spine-) <img src="media/badges/coming-soon.svg" height="14" alt="COMING SOON"> | 3 | 7-9 | a force field | 106 s |
| [Bastion](#bastion-) <img src="media/badges/coming-soon.svg" height="14" alt="COMING SOON"> | 4 | 10-12 | sliding gun rails and armoured bays | 122 s |

---

## How every boss works

<img src="media/bosses/breaker-banner.gif" width="640" alt="Nine seconds from level 1: the playfield clears, the screen goes black, the Blockade Breaker's banner appears with WARNING, its name, INCOMING and a loading bar, then the boss arrives">

In the current candidate build, destroying the last weapon brings up
`HULL BREACH` briefly. The boss's crown then flies upward and the remaining
hull splits left and right, with sparks at the tear, before the summary.

- **Arrival.** When the level's last sector is clear, the screen goes black
  for a third of a second. The boss's banner follows: its picture, WARNING,
  its name and INCOMING, over a bar that fills while the boss loads from the
  disk. Then the boss appears as a band across the top of the screen.
- **Modules.** A boss is built from modules: armour plates, guns, laser
  cannons, and on some bosses a core.
  - Armour in front of a weapon must fall before that weapon can be hit.
  - The hull between the modules cannot be destroyed, and your shots stop
    on it.
  - A module flashes on a hit it survives. A destroyed module leaves a wreck.
- **Guns** fire pulse shots straight down. Each costs a tenth of your hull.
- **Laser cannons warn before they fire.** The cannon's muzzle heats and a
  rising tone plays for 0.8 / 0.64 / 0.5 s. Then the beam burns straight down
  for one second. A beam costs half your hull on ROOKIE and the whole hull on
  PILOT and ACE. A cannon reloads for 6 / 4.5 / 3 s. Leave the column while
  it warns.
- **The escort.** From the first gun or cannon you destroy, an Interceptor
  arrives every three to four seconds, one at a time, until the boss falls
  ([the boss escort](enemies.md#the-boss-escort)).
- **The last stand.** On the Void Citadel, the Siege Spine and the Bastion,
  each surviving weapon fires three-shot volleys at half its reload once the
  last armour falls. The Blockade Breaker has no last stand.
- **Difficulty** scales the bosses' modules: they take 0.75× as many hits on
  ROOKIE and 1.25× as many on ACE. The numbers below are PILOT's.
- **Points.** Every module scores when destroyed. Defeating the boss adds a
  **2,000-point** bonus, paid on the level summary.
- **The VOID LANCE.** 25 s into every fight your ship turns green: hold Fire and
  the joystick forward for 1.5 s and its beam destroys the module above you
  (never the core, nor what your shots cannot hurt); a miss keeps the lance.
  The banner's last line says how: `VOID LANCE: HOLD FIRE+FORWARD`
  ([how to play](how-to-play.md#the-void-lance)).

---

## Blockade Breaker

<img src="media/bosses/breaker.png" width="100%" alt="The Blockade Breaker: a long rust-and-steel warship band with guns and two laser cannons hanging under an armoured spine, a belt of grey armour plates beneath">

**Region 1, levels 1-3, the first and gentlest boss.** A damaged warship that
drifts slowly across the screen and back.

- **Signature: twin lasers.** Two laser cannons, one left and one right of
  the centre, take turns: never two beams at once. Destroy one and the other
  keeps firing alone, in the same rhythm.
- **Modules:**
  - Six guns hang under an armoured spine that no shot breaks. One sits in an
    open bay and fires from the start; the others open fire as the plates in
    front of them fall.
  - Under them runs a belt of eight armour plates. A plate must fall before
    the weapon above it can be hit.
- **No last stand:** when the armour is gone, the guns keep their pace.
- **Fight:** about 93 s on PILOT (78 s on ROOKIE, 125 s on ACE).

| Module | Count | Hits (PILOT) | Points |
| --- | ---: | ---: | ---: |
| Gun | 6 | 9 | 50 |
| Laser cannon | 2 | 14 | 60 |
| Armour plate | 8 | 4-7 | 20-30 |

<img src="media/bosses/breaker-laser.png" width="640" alt="The Blockade Breaker firing one laser beam straight down past the fighter">

<img src="media/bosses/breaker-twin-lasers.gif" width="640" alt="Nine seconds of the fight: a laser cannon warms up and fires its beam, then the other cannon warms">

*The destruction, from the fight's start to its last blast:*

<img src="media/bosses/breaker-stage-2.png" width="100%" alt="The Blockade Breaker with four armour plates left">
<img src="media/bosses/breaker-stage-3.png" width="100%" alt="The Blockade Breaker with two armour plates left">
<img src="media/bosses/breaker-stage-4.png" width="100%" alt="The Blockade Breaker with all armour gone">
<img src="media/bosses/breaker-stage-5.png" width="100%" alt="The Blockade Breaker breaking up in a chain of blasts">

---

## Void Citadel <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">

<img src="media/bosses/citadel.png" width="100%" alt="The Void Citadel: a still violet-and-gold fortress with a black core at its centre and a spire at each end">

**Region 2, levels 4-6.** A fortress that hangs still in the middle of the
screen, the whole ship in view, with a black void core at its centre.

- **Signature: the gravity well.** While either of the two spires at its
  ends stands, your ship is pulled sideways toward the white column under the
  core. The core pulses while it pulls. You are faster than the pull, but you
  must keep steering against it.
- **The column is no refuge.** The core's lens fires its own laser straight
  down it, and the column flickers while the shot warms up. The lens fires
  even while the spires protect it.
- **Destroy both spires** and the pull, the pulse and the column stop at once.
  Then the lens and the core can be hit.
- **From level 5** the laser cannon left of the core fires too. It stands so
  close that its beam meets the lens's, leaving no gap beside the core.
  - On level 4 both cannons stand as slatted armour.
  - The right cannon stays armour through levels 4-6.
- **Last stand:** volleys from every surviving weapon once the last armour
  falls.
- **Fight:** about 99 s on PILOT on level 4 (84 s on ROOKIE, 126 s on ACE);
  120 s on PILOT on levels 5-6.

| Module | Count | Hits (PILOT) | Points |
| --- | ---: | ---: | ---: |
| Spire (volleys) | 2 | 12 | 80 |
| Gun | 6 | 11 | 50 |
| Laser cannon | 2 | 16 | 80 |
| Core lens (laser) | 1 | 27 | 99 |
| Core | 1 | 29 | 99 |
| Armour plate | 4 | 11 | 20-30 |

<img src="media/bosses/citadel-gravity.png" width="640" alt="The Void Citadel with the white gravity column hanging from its core down toward the fighter">

<img src="media/bosses/citadel-gravity-well.gif" width="640" alt="Eight seconds of the fight: the gravity column waves under the core, the fighter is pulled toward it, the column flares and gives way to the core's beam">

*The destruction:*

<img src="media/bosses/citadel-stage-2.png" width="100%" alt="The Void Citadel with both spires destroyed">
<img src="media/bosses/citadel-stage-3.png" width="100%" alt="The Void Citadel late in the fight, most of its guns gone">
<img src="media/bosses/citadel-stage-4.png" width="100%" alt="The Void Citadel breaking up in a chain of blasts">

---

## Siege Spine <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">

<img src="media/bosses/spine.png" width="100%" alt="The Siege Spine: a long segmented violet spine with dorsal spikes, a generator sphere at each end and a shimmering field line beneath">

**Region 3, levels 7-9.** A long segmented spine with dorsal spikes and a
domed siege cannon at its centre. It drifts across the screen and back.

- **Signature: the force field.** A shimmering line runs under the spine in
  two halves, and your shots stop on it and do nothing. Each half is fed by
  the generator sphere at its end of the ship. Break a generator and its half
  collapses, column by column from the generator's side.
- **Behind the field:** the guns and lasers keep firing through it the whole
  time.
- **Lasers:**
  - The central siege cannon fires from the start.
  - On levels 7-8 one more laser emitter joins it, and on level 9 both do.
  - At most two lasers warm up or fire at once.
- **Last stand:** volleys from every surviving weapon once the last armour
  falls.
- **Fight:** about 106 s on PILOT on levels 7-8 (97 s on ROOKIE, 139 s on
  ACE); 112 s on PILOT on level 9.

| Module | Count | Hits (PILOT) | Points |
| --- | ---: | ---: | ---: |
| Generator sphere | 2 | 13 | 50 |
| Gun | 4 | 9 | 50 |
| Siege cannon (laser) | 1 | 16 | 80 |
| Laser emitter | 2 | 14 | 60 |
| Armour plate | 4 | 7 | 20 |

<img src="media/bosses/spine-field.png" width="640" alt="The Siege Spine with its force field line under the spine and the siege cannon's beam falling through it">

<img src="media/bosses/spine-force-field.gif" width="640" alt="Eight seconds of the fight: shots stop on the field, the siege cannon fires, and one half of the field collapses with its generator">

*The destruction:*

<img src="media/bosses/spine-stage-2.png" width="100%" alt="The Siege Spine with one generator and its half of the field gone">
<img src="media/bosses/spine-stage-3.png" width="100%" alt="The Siege Spine with the whole field down">
<img src="media/bosses/spine-stage-4.png" width="100%" alt="The Siege Spine in its last stand, armour gone">
<img src="media/bosses/spine-stage-5.png" width="100%" alt="The Siege Spine breaking up in a chain of blasts">

---

## Bastion <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">

<img src="media/bosses/bastion.png" width="100%" alt="The Bastion: an orange-and-red fortress with a round hangar and a red-and-yellow reactor core at its centre, armoured cannon bays beside it and gun rails running off both edges">

**Region 4, levels 10-12, the last boss.** It hangs still. At its centre is a
round hangar with the reactor core inside it, and the escort launches from the
gate at its foot.

- **Signature: the rails and the bays.** Beside the hangar stand two laser
  cannons, each in an armoured bay. Your shots bounce off a bay's armour, and
  the cannon fires through under it all the same. Outside each cannon a rail
  of guns runs off the edge of the screen.
- **The rails slide.**
  - Destroy a rail's front gun and the whole rail slides one step inward.
  - The **first slide** opens that side's bay: the cannon turns yellow and can
    now be hit.
  - The **second slide** pushes the rail's armoured foot in front of the
    cannon. A covered cannon cannot be hurt any more, and it keeps firing
    from under the foot until the end of the fight.
  - While a bay is open, the gun whose fall would cover it blinks.
  - **Open a cannon's armour, then destroy it before the rail closes in.**
- **The gate** stays locked until every cannon and every rail gun is destroyed
  or covered. Then it opens with a flash and a chime. Break it, and the
  escort stops and the core behind it is yours. The rails never cover the
  hangar.
- **Lasers:** both cannons fire, each on its own.
- **Last stand:** once the gate falls, the core fires volleys.
- **Fight:** about 122 s on PILOT (96 s on ROOKIE, 161 s on ACE).

| Module | Count | Hits (PILOT) | Points |
| --- | ---: | ---: | ---: |
| Rail gun | 6 | 16 | 40 |
| Laser cannon (in a bay) | 2 | 8 | 80 |
| Hangar gate | 1 | 24 | 60 |
| Reactor core (volleys) | 1 | 79 | 99 |

<img src="media/bosses/bastion-beams.png" width="640" alt="The Bastion with both laser cannons firing beams straight down">

<img src="media/bosses/bastion-rails.gif" width="640" alt="Ten seconds of the fight: a rail gun falls and the rail slides inward, opening a bay; both cannons fire; the rail slides again">

*The destruction:*

<img src="media/bosses/bastion-stage-2.png" width="100%" alt="The Bastion after its right rail's first slide">
<img src="media/bosses/bastion-stage-3.png" width="100%" alt="The Bastion with both rails slid all the way in">
<img src="media/bosses/bastion-stage-4.png" width="100%" alt="The Bastion with its gate down and the core exposed">
<img src="media/bosses/bastion-stage-5.png" width="100%" alt="The Bastion breaking up in a chain of blasts">

---

*How the pictures were made:*

- Every picture is a frame of the game running in Atari800 (PAL, PILOT):
  - the Blockade Breaker in level 1;
  - the other three bosses in review builds that start at the boss.
- The frames are enlarged eight times, with the Atari's PAL pixel shape kept,
  and shown through a CRT filter.
- The tools are in `scripts/pages/`; which frame each picture comes from is
  in `scripts/pages/stills.json`.
