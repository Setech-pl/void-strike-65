# Enemies and Bosses pages — plan

**Branch:** `docs/enemies-bosses-pages` from `main` `6e76e4d` (= tag `v0.3.0`).
**Status:** Phase A — inventory, visual candidates and page skeletons; STOP for
the owner's visual choices. No game code, cfg, asset or test changes.

The pages describe release **`v0.3.0`** — the latest tag, and the commit this
branch starts from. Everything below is read from code and data at that commit
(`file:line` or the data file named). It is not taken from memory or older
documents. Where an older document disagrees with the code, that is listed in
§1.4.

---

## 1. Inventory

### 1.0 What the shipped release contains

**`v0.3.0` ships level 1 only, ending on the Blockade Breaker.** Journal §BC
("Wydana gra to poziom 1"), the release notes `docs/releases/v0.3.0.md`
("Only level 1 is on the disk") and STATUS's last update all say so. Level 2
exists as data (`assets/levels/level-02.json`), but only review builds reach
it; it has no boss (`"boss": 0`). The brief said "levels 1–2"; this plan
follows the repository. Consequences:

* every archetype the release has is met in level 1, so **no enemy type is
  "coming soon"**;
* the **level-2 skins** `hunter`, `escort` and `lancer` are not in the release:
  they get the COMING SOON badge;
* of the bosses, only **region 1's Blockade Breaker** is reachable. The other
  three run on the route builds only (`--level=1:sector=6 --boss-region=N`), so
  they get the badge.

Difficulty names: the menu shows **ROOKIE / PILOT / ACE**
(`difficulty_value_table`, `src/main.s:7488`), the code's EASY / MEDIUM /
HARD. The pages use the menu names and give the code names once.

Damage scale: the hull is **10 units** (the HUD's four plates are quarters of
it).

### 1.1 Enemy archetypes (the closed roster, owner decision 21)

The archetype records are `enemy_archetypes`, `src/c/lifecycle.c:261-313`:
HP, movement id, fire policy, burst count and interval, the post-burst pause
per difficulty, renderer, weapon class, packed-BCD score. The HUD shows the
BCD value as it is, after a leading `0` (`update_score_display`,
`src/main.s:5604`).

| | Raider | Bomber | Wingman | Interceptor |
| --- | --- | --- | --- | --- |
| Class / renderer | Heavy, PMG `P1`/`P2` | Heavy, PMG `P1`/`P2` (QUAD, 32 HPOS) | Light, characters 2×1 | Light, characters 2×1 |
| Role | standard fighter, comes as a pair (a formation) | heavy bomber, comes as a pair | escort / swarm filler | hunter: standoff and laser |
| HP (every difficulty) | 1 | 4 | 1 | 3 |
| Score | 10 | 50 | 5 | 15 |
| Weapon | `PULSE` (2 lines/frame) | `BOMBER` shell (2 lines every 2nd frame) | `PULSE` | `LASER` bolt (2 lines/frame) |
| Fire cadence (ROOKIE / PILOT / ACE) | the formation's shared burst: 5 PairShots 15 frames apart, then 60 / 50 / 40 frames | attack run: brakes, charges 20 frames (hull brightens), 2 shells 8 frames apart, reload 64 / 52 / 40 | 1 shot every 96 / 80 / 64 frames when fully visible | 1 bolt only while in the player's column, then 40 / 31 / 20 frames (1 / 2 / 3 per visit) |
| Movement | enters above the field at Y 2, descends to the Y 48 / 96 anchors, then soft pursuit with a weave at 80 % of the fighter's top speed; the pair turn independently | lane sweep: slot 0 X 48-92, slot 1 X 132-176 at 1 HPOS/frame, turns at the lane edge or after a 24-55 frame timer; enters to depth 40 / 16, then descends 1 line every other frame | escort: sits centred 12 lines above its Raider; without a leader (or in a swarm) drifts straight down 1 line/frame | dives 4 lines/frame to 7 rows above the player; holds and tracks the ship's centre, clamped to 48-200; backs off upward while the player is within 6 rows; dead zone ±4 HPOS; after a 64-frame hover climbs out at 3 lines/frame; waves may author 0-3 top-hold loops (level 1: 2) |
| Hit feedback | 24-frame full-screen flash and sound, no fragments | hull darkens with HP: `$C8` / `$C6` / `$C4` / `$C2`, 6-frame hit flash | — | red pods flash (`COLPF2`) for 3 frames on a hit it survives |
| Contact | full hull (10 units): a kill unless shielded; the enemy takes 1 damage | Heavy contact path, as the Raider | Raider contact contract (`src/hybrid/light-kernel.s:384`) | same as the Wingman |
| Drop | counts toward the next capsule when killed by your shot | counts, as the Raider | never counts | never counts |
| Where in level 1 | sector 1 (4 formations + Wingman), sector 4 (elite (a) + Interceptor), sector 6 (elite (b), alone) | sector 1 (4 formations after row 88), sector 5 (one pair, `afterCleared`) | sector 1 (Raider escort), sector 3 (swarm: 3 `flight-lead`, then 3 plain) | sector 3 (swarm, 3, loops 2), sector 4 (companion, loops 2), sector 7 (boss escort, loops 0) |
| In `v0.3.0` | yes | yes | yes | yes |

Sources: Raider — game-design.md "Combat and scoring" (cross-checked against
the record); Bomber — `src/c/lifecycle.c:214-237`, `:1516-1518`, `:1595-1650`;
Wingman — `:1184-1191`, `:1426`; Interceptor — game-design.md "Interceptor"
(decisions AK, AN, AS, AW) and the record. Hostile shots deal **1 unit** each
(`ENEMY_PULSE_DAMAGE_UNITS`, `src/main.s:500`), on every difficulty.

**Drops.** Every third qualifying kill makes a capsule:
`WEAPON_PICKUP_QUALIFIED_KILLS` = 3. A Heavy or a debris killed by the
player's shot qualifies (`src/main.s:5425`). The capsules cycle Rapid Fire →
Spread Shot → Shield. Enemies drop nothing else.

### 1.2 Skins (decision AD: a look is a re-skin, never a new enemy)

| Skin | Archetype | Look (level data `payload.appearances`) | Where | In `v0.3.0` |
| --- | --- | --- | --- | --- |
| `flight-lead` | Wingman | red V, white wingtips and nose | level 1 sector 3, first column | **yes** |
| `escort` | Wingman | red V with a steel inner edge | level 2 sectors 2, 6 | no — COMING SOON |
| `hunter` | Interceptor | red arms, white rotor pods, steel hub | level 2 sectors 1, 4 | no — COMING SOON |
| `lancer` | Interceptor | re-glyphed: a kite-shaped dart, red outline, steel body, white core | level 2 sectors 4, 6 | no — COMING SOON |

Level 2 also carries two **weapon looks** (a staggered twin `PULSE` and a
broken-beam `LASER`), also COMING SOON. A skin keeps its archetype's motion,
HP, fire and score.

### 1.3 Other threats in the release

| Threat | Facts | In `v0.3.0` |
| --- | --- | --- |
| **Capital ships** (allied, left; hostile, right) | indestructible hulls and turrets; `BROADSIDE` shells from **both** sides, each warned 25 frames and flashed 4; a shell or hull contact costs **2 units** (`CAPITAL_DAMAGE_UNITS`, `src/main.s:499`); level 1 hull length 3 (480 rows), turret stations 10 / 15 / 20 by difficulty (level-02.json's notes); enemy hull style R1 on levels 1-3 | yes (level 1 sector 2) |
| **Debris** | 3 HP; **25 points** (`DEBRIS_SCORE = $25`, `src/main.s:507`) shot or rammed; contact costs 2 / 5 / 7 units; a shot kill counts toward the capsule | yes |
| **Boss escort** | the Interceptor archetype with 0 loops (life ≤ 121 frames); the first one comes at the first gun or cannon kill, then one every 150 + 0..63 frames, only on a frame without a module kill, never two at once, none after the boss falls (`escort`, every region's `modules.json`; decision AI). Bastion: it launches from the hangar gate and stops when the gate falls | yes (R1) |

### 1.4 Bosses

The order is `assets/graphics/boss-regions/order.json` `[1, 4, 3, 2]` (decision
AX 1). The art directories keep the names they were drawn under, so play
region k shows `region-<order[k-1]>/`. Module HP below are the PILOT values.
ROOKIE scales them ×0.75 and ACE ×1.25 (`BOSS_HP_SCALE_DEFAULTS`,
`scripts/level-compiler.mjs:532`; the level's `bossDef`). The laser is the same
on every boss: warning 40 / 32 / 25 frames, beam 50 frames (1 s), reload 300 /
225 / 150, damage 5 / 10 / 10 units. Boss pulse shots deal 1 unit. One fire
countdown runs per boss (`fire.cooldown` 24 frames between firings). The win
gives a 2,000-point level bonus (`bossDef.bonus`, paid on the summary) on top
of the module scores. Fight times are the aiming bot's, on the first level of
the region, from `docs/boss-curve.json` (measured 2026-10-17, three replays a
cell); the targets are §AX 2's.

| | **Blockade Breaker** | **Void Citadel** | **Siege Spine** | **Bastion** |
| --- | --- | --- | --- | --- |
| Play region / levels / order | 1 / 1-3 / first | 2 / 4-6 / second | 3 / 7-9 / third | 4 / 10-12 / last |
| Art directory | `region-1/` | `region-4/` | `region-3/` | `region-2/` |
| Banner (`boss-banners/banners.json`) | `blockade-breaker.png` | `void-citadel-column.png` | `siege-spine-side.png` | `bastion-rails.png` |
| Motion | drifts (1 colour clock / 2 frames, 63 travel) | still, centred | drifts | still, centred; only the rails slide |
| Weapons | 6 pulse guns (HP 9, reloads 55-90), 2 laser cannons `emitter-l` / `-r` (HP 14) that **take turns**, 8 armour plates (HP 4-7) as a one-row belt under an indestructible spine | 2 salvo **spires** (HP 12, reload 132), 6 pulse guns (HP 11), the core lens laser (HP 27, slot 1) and the black **core** (HP 29, last), 2 cannons (HP 16; slot 2 from level 5, slot 3 capped below tier 4), 4 plates (HP 11) | 2 generator spheres `gen-l` / `-r` (HP 13), 4 pulse guns (HP 9), central siege cannon `emitter-1` (HP 16) and 2 more emitters (HP 14, slots 2-3), 4 plates (HP 7) | 2 rails of 3 pulse guns each (HP 16, reload 125), 2 laser cannons in armoured bays (HP 8), the hangar **doors** (HP 24) and the reactor **core** salvo (HP 79, reload 130, last) |
| Signature mechanic | **twin lasers**: at most one beam at a time (level 1 tier 1); kill one, the other fires on alone | **gravity well**: while a spire stands, the ship is pulled 2 colour clocks every 4 frames toward the core's axis; a white column (M0) shows the axis and the core fires its own laser down it; kill both spires and the pull, pulse and column stop | **force field**: a flickering row under the spine in two halves; your shots stop on it; each half falls with its generator, column by column | **dome, rails and bays**: shooting a rail's front gun slides the rail inward — the first slide opens that side's cannon bay (yellow, hittable), the second puts the rail's L-foot in front of it (covered for good, still firing); the gate opens when every cannon and rail gun is destroyed or covered, then the core |
| Finale volleys | off | on (cooldown 12) | on (12) | on (12) |
| Lasers at the region's first level | 1 slot: 2 cannons alternate | 1 slot: the lens; both cannons capped | 2 slots (level 7); all 3 on level 9 | both cannons slot 1: 2 at once |
| PILOT target / measured (s) | ~92 / **93.2** (88.6-97.4) | ~102 / **99.4** (96.8-104.4) | ~112 / **106.1** (98.6-110.1) | ~122 / **121.8** (118.5-124.1) |
| ROOKIE / ACE measured (s) | 78.3 / 125.0 | 84.3 / 126.4 | 97.2 / 138.8 | 96.4 / 160.5 |
| Boss's own fire, hits/min (aiming bot, PILOT) | 5.8 | 7.1 | 10.1 | 14.9 |
| Banner + entry (host frames, measured) | 257 | 272 | 268 | 271 |
| Reachable in `v0.3.0` | **yes** (end of level 1) | no — COMING SOON | no — COMING SOON | no — COMING SOON |
| Route ATR (review only) | full game | `--boss-region=2` | `--boss-region=3` | `--boss-region=4` |

Module scores (PILOT HP in brackets) come straight from `modules.json`:
Breaker guns 50 (9), cannons 60 (14), plates 20-30; Citadel spires 80, core and
lens 99, cannons 80, guns 50, plates 20-30; Spine generators 50, guns 50,
emitters 60-80, plates 20; Bastion rail guns 40, cannons 80, doors 60, core 99.

The fifth directory, `boss-regions/bastion/`, is **not a boss in the game**.
It is the M5b-S4a-i core-boss fixture, kept in the engine. It is left out of
the pages.

### 1.5 What the inventory found (for the owner)

1. **The release is level 1, not levels 1–2** (§1.0). Only the level-2 skins
   and bosses R2–R4 take the badge.
2. **`docs/how-to-play.md` disagrees with the code** in four places (and its
   Polish twin in the same places). Both pages are out of this task's scope;
   it fixes none of them:
   * Interceptor score **21** there, **15** in code: the record's `0x15` is
     packed BCD, so 21 is that byte read as hexadecimal;
   * Boss **100** there. The code pays module scores (20-99 each) plus a
     **2,000** level bonus on the summary;
   * the laser "heats for about two seconds" there. The code warns for
     **40 / 32 / 25 frames** (0.8 / 0.64 / 0.5 s);
   * "Difficulty scales … the damage you do" there. In code, enemy HP and your
     shot damage are the same on every difficulty; only boss module HP scales
     (×0.75 / ×1 / ×1.25).
3. **`docs/game-design.md` is stale on two facts.** It gives debris 5 points
   (the code: 25). Its Bomber bullet says "one shell, then 80/64/48" (the code:
   a 20-frame charge, then 2 shells 8 frames apart, reload 64 / 52 / 40).
4. **`assets/graphics/enemy-roster.json` lists ten concept archetypes.**
   Seven were never built (`implemented: false`): Trident Gunship, Wraith
   Scout, Hunter, Leech Drone, Aegis Escort, Crown Interceptor, Hydra Carrier.
   Its `INTERCEPTOR` id is the Raider's PMG art under its old name. The concept
   PNGs in `assets/graphics/` are not in the game, and the pages must not show
   them (and must not confuse the roster's "Hunter" with the `hunter` skin).
5. Every enemy has **the same HP on every difficulty**. Difficulty changes
   their fire cadence, the world speed and debris and capital damage, not
   their toughness.
