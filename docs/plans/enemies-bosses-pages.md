# Enemies and Bosses pages — plan

**Branch:** `docs/enemies-bosses-pages` from `main` `6e76e4d` (= tag `v0.3.0`).
**Status:** Phase B built 2026-10-19 on the owner's Phase A answers (§5);
`OWNER REVIEW CANDIDATE`. The pages, their media, the README link bar and the
documentation fixes are committed; §3.5 records them as built. No game code,
cfg, asset or test change; `dist/` is the `v0.3.0` ATR byte for byte.

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

---

## 2. The pages — files, sections, badge, link bar (proposal)

### 2.1 Files

| File | What |
| --- | --- |
| `docs/enemies.md`, `docs/enemies.pl.md` | the Enemies page, EN and PL (owner decision V) |
| `docs/bosses.md`, `docs/bosses.pl.md` | the Bosses page, EN and PL |
| `docs/media/enemies/<id>.png`, `.gif` | enemy stills (the chosen style) and cuts |
| `docs/media/bosses/<id>.png`, `.gif` | boss stills, stage strips and cuts |
| `docs/media/badges/coming-soon.svg`, `wkrotce.svg` | the badge, generated by `scripts/pages/badge.mjs` |
| `scripts/pages/*` | the tools that make all of the above from the build (§3) |

`docs/README.md` already exists and is the documentation index. It gains one
row: "The enemies and bosses, for a player" → `enemies.md` / `bosses.md` (and
the PL pair). The "Documentation" link of the bar stays `docs/README.md`.

### 2.2 Section order

**`docs/enemies.md`**

1. Language switch (`**English** · [Polski](enemies.pl.md)`, as how-to-play).
2. `# Enemies` — two sentences. The page describes release `v0.3.0` (level 1).
   Heavy and Light are explained in one line each. The difficulty names are
   ROOKIE / PILOT / ACE. A legend for the badge.
3. One summary table: name (with the badge where due), class, hits to kill,
   points, weapon, where you meet it.
4. `## Heavy` → `### Raider`, `### Bomber`; `## Light` → `### Wingman`,
   `### Interceptor`. Each subject: the still, a short stats list (hits, points,
   weapon and fire rate per difficulty, contact), a behaviour paragraph, the GIF
   if chosen.
5. `## Markings` — the re-skins: `flight-lead` (in the release), then
   `escort`, `hunter`, `lancer` (badge). The rule "same enemy, new paint" is
   stated once.
6. `## Other threats` — the capital ships, debris, the boss escort.
7. `## Capsules` — which kills count toward the next one.
8. Footer: how the pictures were made (Atari800 PAL, debug routes, no
   retouching), and a link to the Bosses page.

**`docs/bosses.md`**

1. Language switch.
2. `# Bosses` — four regions of three levels, one boss each, in order. Only
   the Blockade Breaker is in `v0.3.0`. The badge legend.
3. The summary table: boss, region and levels, signature mechanic, PILOT fight
   length.
4. `## How every boss works` — the module rules (armour before weapons), the
   laser's warning and beam, the escort, the finale volleys, difficulty (boss
   HP ×0.75 / ×1 / ×1.25).
5. One section per boss, in play order: `## Blockade Breaker`,
   `## Void Citadel` (badge), `## Siege Spine` (badge), `## Bastion` (badge).
   Each has the band still, then the signature mechanic in three or four
   sentences with its mechanic still, then "how to beat it" (facts from §1.4,
   no tactics invented). After that, the modules table (part, hits on PILOT,
   points), the destruction strip (stage stills) and the GIF.
6. Footer: provenance; the R2-R4 pictures come from review builds.

### 2.3 Where the badge goes

In the subject's heading, after the name, as an image:

```markdown
## Void Citadel <img src="media/badges/coming-soon.svg" height="18" alt="COMING SOON">
```

GitHub keeps the anchor (`#void-citadel`), and the `alt` text carries the
meaning without the image. The same image, at `height="14"`, goes next to the
name in the summary tables. The Polish pages use `wkrotce.svg`
(`alt="WKRÓTCE"`). The README uses no shields.io badges today, so this follows
the brief's fallback: a static SVG committed in the repo, with no network.
**The badge is drawn from rectangles in the game's own lettering**
(`frontend-h31.json`). It has no font dependency, so it renders the same
everywhere. The green is Atari PAL `$BA`, chosen because the frontend's
`$D8` reads olive in Atari800's palette. The Ó of WKRÓTCE is the font's O
with a two-pixel acute stroke; that stroke is the only drawn addition.

### 2.4 The link bar

Both READMEs already have a link bar, under the intro paragraphs. The
proposal is one bar, moved **directly under the `# VOID STRIKE 65` heading**
(above "Play in your browser"), with the old one removed so it is not there
twice:

```markdown
[How to play](docs/how-to-play.md) · [Enemies](docs/enemies.md) · [Bosses](docs/bosses.md) · [Releases](https://github.com/Setech-pl/void-strike-65/releases) · [Documentation](docs/README.md)
```

```markdown
[Jak grać](docs/how-to-play.pl.md) · [Przeciwnicy](docs/enemies.pl.md) · [Bossowie](docs/bosses.pl.md) · [Wydania](https://github.com/Setech-pl/void-strike-65/releases) · [Dokumentacja](docs/README.md)
```

`tests/github-showcase.test.mjs` pins the README at exactly nine images. The
bar adds none, and the badge never goes into the README.

---

## 3. Stills, art, badge, GIFs (Phase A in `build/pages/`; Phase B as built in §3.5)

### 3.1 Captures

`scripts/pages/capture.mjs` builds a debug route and replays one trace
session on it with Atari800 saving every gameplay frame. The frames are
336 × 240, one hires pixel by one scanline, in Atari800's PAL palette (SDL's
cocoa driver; the harness's dummy driver saves only the 256 × 192 centre). The
five captures are listed in `scripts/pages/stills.json`, all on PILOT:

| Capture | Route ATR | Session | Frames | Holds |
| --- | --- | --- | ---: | --- |
| `l1-complete-1` | `level-1-s0` | `director-complete-1-natural-sweep-fire0` | 5,469 | all of level 1: every enemy, the capital run, the Blockade Breaker (entry f3040, chain f5307) |
| `l2-complete-1` | `level-2-s0` | same | 8,709 | the `hunter`, `escort`, `lancer` skins (review build) |
| `r2-diag-1` | `boss-region-2-level-1-s6` (`962f1b0d`) | `region-2-diag-1` | 2,659 | the Void Citadel |
| `r3-diag-1` | `boss-region-3-level-1-s6` (`17786d4d`) | `region-3-diag-1` | 3,375 | the Siege Spine |
| `r4-diag-1` | `boss-region-4-level-1-s6` (`5e2888eb`) | `region-4-diag-1` | 3,119 | the Bastion |

The three boss routes rebuilt from this branch are byte-identical to the
owner-smoked `build/play/audit-m5-r2/r3/r4` ATRs. `level-1-s6` (`714a3d9b`) is
too. Its `boss-aim-1` session ran 15,000 frames without destroying a module,
so the Blockade Breaker is taken from the level-1 run instead. That run is the
shipped flow from the first sector.

The captures are deterministic. Re-running `r2-diag-1` through
`node scripts/pages/capture.mjs --ids=r2-diag-1` gave 2,659 frames, all
byte-identical to the first run.

### 3.2 Stills

`scripts/pages/stills.mjs` crops each subject from its frame. The frames were
picked from the trace CSV (`colpm1`, `light_archetype*`, `boss_state`,
`laser_states`, `gravity_on`, `field_state`, `rail_k`, `colbk`) and checked by
eye. Calibration: screenshot x = 2 × HPOS − 88, y = scanline − 8. For each
subject the script writes:

* `<id>.png` at native size;
* `<id>-x8.png` at eight pixels per scanline, the width × 1.0397: the PAL
  hires pixel aspect, 14.75 MHz ÷ 7.0938 MHz ÷ 2
  (`scripts/pages/image.mjs`). Column widths alternate by one pixel because
  8 × 1.04 is not an integer.

There are 33 subjects:

* 10 enemy subjects: Raider, Bomber, Wingman, Wingman `flight-lead`,
  Interceptor, the three level-2 skins, the boss escort under the band, the
  capital corridor.
* 4 bosses × (the band at the fight's start + 3-4 stage bands + 1 full-screen
  mechanic shot): twin laser beam, gravity column, force field, both Bastion
  cannons firing.

Stage frames avoid the 18-frame kill flash (`colbk` ≠ 0). The DESTROYED stage
is the chain's flash itself, on purpose. Contact sheets for review:
`build/pages/stills/sheet-*.png`.

### 3.3 Art styles (one enemy, one boss)

`scripts/pages/art.mjs` turns the ×8 still into a card in three styles. The
playfield black is keyed out. The name and a label use the game's lettering
at ANTIC mode 7 proportions. The card colours are Atari PAL values.

| Style | Look | Interceptor | Blockade Breaker |
| --- | --- | --- | --- |
| **a** | clean pixels, dark gradient (black → allied-steel blue `$82`), name in white `$0E`, label in amber `$1E` | 720 × 360, 4 KB | 2,885 × 726, 28 KB |
| **b** | CRT: bloom, scanline gaps, RGB aperture mask, phosphor tint, vignette | 79 KB | 1.3 MB |
| **c** | clean pixels, a thin steel glow (`$8C`) around the silhouette, vignette | 36 KB | 232 KB |

The weight matters for the repo: style b is about 40 × style a.

### 3.4 Badge samples

`scripts/pages/badge.mjs --preview`: `coming-soon.svg` and `wkrotce.svg`;
PNG previews at 2 and 3 pixels per font pixel beside a name in the game
lettering; `preview.html` with GitHub-like headings (light and dark) showing
the SVG at heights 16 and 20.

### 3.5 As built (Phase B, the owner's answers of 2026-10-19)

The answers to §5:

* **1:** style b everywhere;
* **2:** B1-B4, E2, E3 and B5 (the Breaker only), 320 × 240 at 50 fps;
* **3:** full sections for R2-R4;
* **4:** full Polish translations, names in English;
* **5:** the badge scope confirmed;
* **6:** fix the documentation errors here;
* **7:** one link bar at the top;
* **8:** the media stay unbound, with a STATUS backlog line.

**Pictures.** `node scripts/pages/media.mjs` renders every subject of
`scripts/pages/stills.json` in style b at ×8 into `docs/media/enemies/` (10)
and `docs/media/bosses/` (23).

* They are quantised to a 256-colour palette by `scripts/pages/png.mjs`, a
  median cut without dither. `pngquant`, `oxipng` and `optipng` are not
  installed, and `sharp` would be a new dependency (AGENTS rule 13).
* With that, ×8 met the 300 KB budget for every file: the largest is
  `spine-field.png` at 242,838 B. ×6 was not needed, and the scanlines,
  bloom and tint survive the palette (checked by eye on the Breaker header and
  the full-screen scenes).
* A **card** (the four enemies, four skins, four boss headers) carries only
  the name, and for a skin the skin's name, in the game's lettering.
* The scenes and the boss stages are the shot alone.
* No descriptive text is drawn, so one picture serves both languages, and the
  badge is never drawn into a picture.
* Re-rendering is deterministic (byte-identical PNGs).

**Stage frame fix.** The Bastion's second stage moved from frame 700 to frame
450. `rail_k` holds one nibble per side; at 700 the right rail had already
slid twice. The caption says "after the right rail's first slide".

**Cuts.** `scripts/pages/media.mjs` cuts the `gifs` list of `stills.json`
through the repository's `encodeGif`:

| Cut | File | Frames | Bytes |
| --- | --- | --- | ---: |
| E2 | `enemies/bomber-attack-run.gif` | l1 420 +300 | 176,895 |
| E3 | `enemies/swarm.gif` | l1 1935 +365 | 137,844 |
| B1 | `bosses/breaker-twin-lasers.gif` | l1 3990 +450 | 556,671 |
| B5 | `bosses/breaker-banner.gif` | host 3765 +445 | 158,091 |
| B2 | `bosses/citadel-gravity-well.gif` | r2 100 +400 | 182,492 |
| B3 | `bosses/spine-force-field.gif` | r3 200 +400 | 587,536 |
| B4 | `bosses/bastion-rails.gif` | r4 150 +500 | 179,898 |

All are under 600 KB, 6-10 s each.

**B5.** The capture `l1-banner-1` saves host frames 3765-4209
(`DFTRACE_SHOT_PREFIX`/`DFTRACE_SHOT_HOSTS`; `hosts` in `capture.mjs`,
`hosts: true` in `gif.mjs`, about 20 lines). Gameplay frame 3039 ends at host
3814 and the fight starts at host 4110. **The disk-activity light does not
show:** a scan of the four corners of every host frame of the load (3816-4108)
finds no lit pixel, so nothing is masked or cropped.

**Badges.** `docs/media/badges/coming-soon.svg` (4,666 B) and `wkrotce.svg`
(3,272 B) sit in the headings of the three level-2 skins and bosses R2-R4,
and beside their names in the summary tables. The Breaker has none, and no
enemy type has one.

**Size.** `docs/media` grows by 42 files and 5,553,123 B:

| Group | Bytes |
| --- | ---: |
| 33 PNGs | 3,565,758 |
| 7 GIFs | 1,979,427 |
| 2 SVGs | 7,938 |

None of it is in `docs/media/manifest.json`. A STATUS backlog line covers
binding it; `tests/github-showcase.test.mjs` pins one animation.

**Pages.** `docs/enemies.md`, `docs/bosses.md` and their `.pl.md`
translations are written from §1. Both boss pages say above the list that
v0.3.0 ships level 1 and the Blockade Breaker, and that the other three come
with the campaign. No never-built roster archetype and no concept picture
appears. `docs/README.md` links the pages.

**README.** One link bar under the title in `README.md` / `README.pl.md`;
the mid-page line is removed. Image count unchanged at nine.

**Documentation fixes** (§1.5 items 2-3):

* `how-to-play.md` and `how-to-play.pl.md`:
  * Interceptor 15;
  * boss modules 20-99 plus 2,000;
  * laser warning 0.8 / 0.64 / 0.5 s and beam damage;
  * what difficulty changes.
* `game-design.md`:
  * debris 25;
  * the Bomber's attack run;
  * the as-built laser warning beside decision I's "about two seconds" (the
    same stale fact; reported).

**Preview without GitHub:**
`node scripts/pages/preview-html.mjs docs/enemies.md docs/bosses.md` writes
`build/pages/html/*.html` (a GitHub-like style, images by absolute file URL).

**Gates (2026-10-19, on this branch):**

* **The evidence chain** (build:candidate → runtime:wall-trace → menu raster
  → build → memory-map → showcase:gif → showcase) reproduced the committed
  evidence byte for byte: no tracked file changed.
  * `dist/void-strike-65.atr` is `c977efe0…`, the `v0.3.0` ATR.
  * Wall trace: 0 distinct miss events across 58 replays, 0 clause failures.
* **`npm test`** on the default build: **1,485 of 1,486**. The one failure is
  the recorded `tests/preview.test.mjs:164`, matched by name and first
  assertion. `failures:reconcile` PASS: 0 NEW, 0 MOVED, 0 disappeared.

**Regenerating everything:**

```text
node scripts/pages/capture.mjs     # the six captures, ~10 min, Atari800 windows open
node scripts/pages/media.mjs       # pictures, cuts, badges into docs/media
```

---

## 4. GIF candidates

The cutter is `scripts/pages/gif.mjs`. It feeds a window of a capture through
the repository's own writer (`encodeGif` from `scripts/showcase-gif.mjs`,
`readIndexedPng` from `scripts/github-showcase.mjs`). Neither repository tool
is changed; the README GIF and its manifest entry are untouched. Every window
below is cut from an existing capture. Frame numbers come from the trace CSVs.

| # | Cut | Capture | Start | Length | Shows | Tool |
| --- | --- | --- | ---: | ---: | --- | --- |
| E1 | Raider pair + Wingman escort | `l1-complete-1` | 200 | 300 (6 s) | the cross-pursuit, the burst, the escort's lag | as is |
| E2 | Bomber pair attack run | `l1-complete-1` | 430 | 280 (5.6 s) | lane sweep, brake and charge (the hull brightens), the two shells | as is |
| E3 | The swarm | `l1-complete-1` | 1935 | 365 (7.3 s) | the `flight-lead` column, then three Interceptors stacking and looping | as is |
| E4 | Level-2 swarm, `hunter` / `lancer` (COMING SOON) | `l2-complete-1` | 3400 | 400 (8 s) | the skins | as is |
| B1 | **Blockade Breaker — twin lasers** (sample rendered) | `l1-complete-1` | 3990 | 450 (9 s) | a cannon warms up and fires; the other warms after | as is |
| B2 | Void Citadel — gravity well | `r2-diag-1` | 100 | 400 (8 s) | the column, the pull, the core's warning and beam down the axis | as is |
| B3 | Siege Spine — force field | `r3-diag-1` | 200 | 400 (8 s) | shots stopping on the field, a beam, a half collapsing | as is |
| B4 | Bastion — rails and bays | `r4-diag-1` | 150 | 510 (10.2 s) | a slide opens a bay, both cannons fire, the second slide | as is |
| B5 | Banner + entry (one boss, or all four) | new host-frame capture | host ≈ 760 | ≈ 340 host + 100 gameplay (≈ 9 s) | the black cut, the banner, the bar filling, the boss band arriving | **needs an option** |

**B5 cost.** The banner and the load happen between gameplay frames, so the
per-frame capture never sees them. The emulator already has the hook
(`DFTRACE_SHOT_PREFIX` + `DFTRACE_SHOT_HOSTS`, `scripts/atari800-wall-trace.h`,
used by the banner plan for host frames 800-1075). No game or harness change is
needed. Two things are:

* about 20 lines in `scripts/pages/`: a `hosts` option in `capture.mjs`, and
  `gif.mjs` taking a file list that splices host shots and gameplay shots;
* one more capture per boss (≈ 3-5 min, parallel).

Caveat, unverified: the pinned Atari800 config has
`SCREEN_SHOW_IO_ACTIVITY=1`, so the disk LED may show in frames taken while the
boss loads. Either crop it out or accept it as what the emulator shows.

**The R1 sample** (`build/pages/gif/`): 320 × 240, 9.0 s.

| Variant | Size |
| --- | ---: |
| 50 fps (the README GIF's 2 cs per frame) | 557 KB |
| 25 fps | 479 KB |
| 50 fps, top half only (320 × 120, the band and the beams) | 428 KB |

The encoder already stores only changed rectangles, so halving the frame rate
saves little. Eight cuts at 50 fps come to ≈ 4.5 MB.

**Binding.** `tests/github-showcase.test.mjs` pins `docs/media/manifest.json`
to 9 gameplay frames, 4 sheets, 2 concepts and **one** animation. New media
for the pages therefore cannot enter the manifest without a test change, which
this task may not make. Proposal: the pages' media stay outside the manifest,
like `docs/media/concepts/void-strike-65-boss-*.png` and `docs/media/frontend/`
today. Their provenance is `scripts/pages/stills.json` (route, session, frame,
crop) and the ATR hashes in §3.1. They are regenerated by `scripts/pages/*`.
Binding them is a separate task with a test change.

---

## 5. Owner questions (Phase A STOP; answered 2026-10-19, §3.5)

1. **Art style:** a, b, c or a mix? Recommended: **a on the pages** (light,
   the pixels as the game draws them), with **c for the four boss headers**.
2. **GIFs:**
   * size, fps, length: recommended 320 × 240 at 50 fps, 6-10 s, as the
     README;
   * which cuts: recommended B1-B4, plus E2 and E3;
   * B5: one banner cut (the Blockade Breaker), or one per boss?
3. **Bosses R2-R4:** full sections or short teasers? Recommended: **full**,
   with the badge. Their facts are settled (§AX, owner smoke PASS 2026-10-17).
   The pages say plainly that they arrive with the campaign.
4. **Polish pages:** full translations or shorter summaries? Recommended:
   **full** (decision V: a change to one is incomplete until the other carries
   it).
5. **The release is level 1** (§1.0): only the level-2 skins and bosses R2-R4
   get the badge. Confirm.
6. **`how-to-play` vs code** (§1.5 items 2-3): fix the four facts in
   `how-to-play.md` / `.pl.md` (and game-design's two) in Phase B, or leave
   them to a separate task? The new pages will state the code's values either
   way.
7. **The link bar:** move it to the top and drop the old one (§2.4), or keep
   the old one too?
8. **Manifest:** leave the pages' media unbound (§4), or bind them in a
   follow-up task with a test change?
