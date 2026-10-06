# Plasma FX — bigger, longer explosions and a plasma player side — Phase A

Status: **Phase A — audit and preview, `OWNER REVIEW CANDIDATE`, planning
only.** No artifact byte changed, no evidence regenerated. Branch
`feat/plasma-fx` from `main` `8a05b43` (decision O merged). ATR
`4926dc05…` (the decision-O ATR, `dist/` binds `docs/runtime-wall-trace.json`).

The owner asked for explosions that (1) last a little longer, (2) are bigger,
(3) read as yellow-red fire or as a plasma burst, and for the player's side
(shots and the explosions the player causes) to move to a plasma colour if
the hardware allows it. Everything else must not regress.

Labels: **MEASURED** (this tree, a native 6502 run or the committed replay
CSVs), **ESTIMATE** (derived from MEASURED parts, to be measured in Phase B).

---

## 0. Answer first

* **The proposed register, `COLPF3`, cannot be dedicated to player FX.** In
  the gameplay field it is the hostile red `$46`: the Light Wingman's wing,
  the Interceptor's rotor pods, every enemy capital-hull cell (inverse codes),
  the hostile capital shell, the effects' red phase. In the boss band it is the
  hull's burgundy. And **S4b's lasers are planned as the fifth player under
  `PRIOR $10`, whose only colour is `COLPF3`** (plan m5 §2.4, §5.5). Taking it
  would recolour every enemy now and the lasers later: **conflict, STOP** —
  options in §5.
* **No playfield register is free anywhere** (§1). A per-frame cycling register
  is available only in PMG: `COLPM1/2` of a dead Heavy, `COLPM3` while the
  player dies, and `COLBK` (already the kill flash).
* **Explosions are on the critical path.** Every one of the binding fence rows
  has a break-up live: worst row **1,370** (`2-evasive-fire3` f287, break-up
  live); the worst row with *no* break-up is **4,105** (§3.3). Kill frames are
  not the binding rows (worst kill frame 2,841). So "bigger" must not mean more
  character cells per frame; it means fuller glyphs, a core that lives the
  whole explosion, and the same five cells.
* **Hostile shots are not warm.** They are white `$0E` heads and steel `$88`
  trails (hue 8, blue) by owner decision 19. The "warm = danger" premise holds
  for enemy *hulls* (`$44/$46`, which Atari800's PAL palette renders
  **magenta**), not for enemy fire (§2).
* **Today's "fire" is yellow → magenta.** The red phase of every character
  explosion is `COLPF3 = $46`, the enemy colour. A true orange/red needs hue
  2/3, which no playfield register holds; only PMG and `COLBK` can show it.
* **Recommendation: PLASMA** for the player side, FIRE for the player's death,
  everything by glyph and table data, zero new register writes in the
  character layer, worst fence row ≈ **1,320** (ESTIMATE, GO 500). §7.

---

## 1. Colour register audit (MEASURED at `8a05b43`)

`gameplay_dli` rewrites `COLPF0-3` from immediates every frame
(`src/main.s:3563`); `COLPF1`'s operand is patched per level. The boss DLI
(`src/hybrid/boss.s:278`) loads the band palette from `boss_palette` and
restores the gameplay palette below the band. `COLBK` is written once per frame
by `update_sound`'s flash tail (`src/main.s:7158`). `PRIOR` is `$00` in all of
gameplay.

| Register | HUD (ANTIC 2) | Playfield ring (OPEN / capital / boss ring) | Boss band (8 rows) |
| --- | --- | --- | --- |
| `COLBK` | border | background `$00`; **kill flash** 4 frames (Heavy, boss module: `$1E $3C $1C $34`), death flash 6 frames, damage `$42` | background (the same flash) |
| `COLPF0` | — | `$0E` white: near stars (white sky), hostile shot heads, debris white, Interceptor hub | region `$0A` light steel: plate faces, **the in-band player shot** (decision M answer 2) |
| `COLPF1` | `$0E` text lum | allied steel `$88` (level data): allied hull, enemy accents, **hostile shot trails**, Light arms, steel-sky stars, debris steel | region `$06` grey: bevels, trim |
| `COLPF2` | `$00` text bg | **`$1E` player shots** (decision U), effects' yellow phase, allied `service`/`turret` glyphs, capital explosion core (`pf2` cells), **yellow-sky stars** (each level's last sector) | region `$28` amber: cannons, lights, damage glow, **sparks**, flames |
| `COLPF3` | (unused) | **`$46` hostile**: Light wing, Interceptor pods, enemy hull mass, hostile shell, effects' red phase | region `$32` burgundy hull bulk |
| `COLPM0` | — | player ship `$0E` / Shield `$84`; the death explosion's core mask | same |
| `COLPM1/2` | — | Heavy hulls (`$44` Raider, `$C8` Bomber, hit flash); capital: lent to broadside `M1/M2` | boss: **unused** (no Heavy) |
| `COLPM3` | — | OPEN: capsule gold `$1C`, also the death explosion's outer mask; capital: `$28` (`M3` shell + death mask) | `$28` |
| Missiles | — | OPEN free; capital `M1-M3` broadside | **reserved: S4b lasers** (`PRIOR $10` → `COLPF3`) |

Where each object sits:

| Object | Playfield | Band |
| --- | --- | --- |
| player ship | `P0` / `COLPM0` | same |
| player shots | ANTIC 4 `%11` positive → `COLPF2 $1E` | `%01` → `COLPF0 $0A` |
| hostile shots | `COLPF0 $0E` + `COLPF1 $88`, never `%11` | boss pulses fall into the ring: same |
| Light, Interceptor | inverse codes → `COLPF3 $46` (+ PF0/PF1) | — |
| Heavy | `P1/P2`, `COLPM1/2` | — |
| stars | `COLPF0` / `COLPF1` / `COLPF2` per sector sky | — |
| explosions (Light, debris, Heavy) | 5 character cells, yellow (`PF2`) ↔ red (`PF3`) by the bank bit | — |
| player death | `P0` core + `P3` outer, `COLPM0`/`COLPM3`, `COLBK` flash | — |
| boss spark / deflection / blast | — | region glyphs, amber `COLPF2` |
| boss module destroyed | — | cells gone + `COLBK` flash (the Heavy table) + shake + sound |
| HUD | ANTIC 2, `COLPF1/2` own DLI zone | — |

**Can a register be dedicated to player FX without changing anything else?**
No playfield register can. `COLPF3`: no (above). `COLPF2`: only by changing
its *static* value, which recolours its four other users (§5 option P1).
Cycling `COLPF2` per frame (patch the DLI operand, ~6 cycles) would pulse the
allied hull's service glyphs and yellow-sky stars: forbidden by the palette
rule (`art-direction.md`, "a local object must not change the global
palette"). The PMG registers can be cycled locally: `COLPM1/2` belong to one
dead Heavy for the rest of its formation's life (its slot is not refilled
before `enemy_c_recycle`, `src/c/lifecycle.c:1046`), `COLPM3` is free while
the player dies (the capsule is cleared by `apply_player_damage`), except that
in a capital sector it also colours the `M3` shell.

**S4b.** Its needs: `M0-M3`, `PRIOR $10`, `SIZEM`, `COLPF3` as the laser
colour, `HPOSM`, a few bytes of slot A. Conflict risk of each option is in
§5's last column. The recommended package touches none of them.

---

## 2. Readability: hostile vs player (MEASURED colours)

RGB from Atari800's PAL palette (the `PLTE` of an emulator screenshot);
distance CIEDE2000 (≈2 just noticeable; the current yellow vs the white
hostile head is the reference, **20.4**).

| colour | RGB (Atari800 PAL) | vs hostile head / white star `$0E` | vs hostile trail / steel star `$88` | vs enemy hull `$46` | vs Bomber `$C8` | vs capsule `$1C` | vs band shot `$0A` |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **`$1E` now** | 250,204,144 | 20.4 | 51.5 | 61.8 | 38.3 | 10.2 | 29.4 |
| **`$9E` pale cyan** | 163,229,243 | 17.6 | 37.0 | 59.0 | 45.4 | 36.9 | 28.7 |
| `$9C` cyan | 123,190,203 | 19.5 | 29.3 | 52.8 | 39.8 | 35.0 | 22.1 |
| **`$AE` mint** | 159,240,195 | **23.2** | 49.1 | 64.1 | 34.1 | 34.4 | 33.0 |
| `$AC` | 119,201,156 | 24.2 | 43.8 | 58.6 | 26.3 | 32.4 | 27.4 |
| `$8E` ice blue | 174,217,255 | 15.8 | 32.1 | 55.6 | 53.5 | 38.2 | 26.5 |

* **`$9E` stays distinct** from hostile fire and stars, a little closer to the
  white head than today's yellow (17.6 vs 20.4); shape (two impulses vs the
  pulse/laser/bomber looks), direction (up vs down) and position still separate
  them. **`$AE` is the safer cold hue** — more distinct from the white head than
  today's yellow — at the price of reading mint/teal rather than cyan. Owner
  picks on hardware, as with the capsule (two review builds in Phase B).
* **Avoid violet in the plasma ramp.** Under PAL hue 4 is the enemy's magenta
  (`$46` 313°); violet `$66` (266°) sits at the same luminance as `$46`
  (L* 33.7 both). A plasma "violet" step would read as enemy colour. The ramp
  is white → cyan → blue.
* **The plasma ramp's last step, `COLPF1 $88`, is the hostile trail colour.**
  A drifting blue ember can resemble an enemy shot. Recommended: end the
  plasma fade on sparse cyan embers, not `$88` (the preview still shows `$88`
  so the owner can judge).
* **FIRE's red step is `$46`, the enemy hue** (today and in the FIRE variant):
  a Light's explosion flickers in the Light's own colour.

---

## 3. The explosions today (MEASURED)

### 3.1 What exists

| Explosion | Renderer | Size | Duration | Colour |
| --- | --- | --- | --- | --- |
| Light kill, debris destroyed | effects pool: core (slot 0) + 4 fragments, ANTIC 4 cells | 1 core cell + 4 one-cell fragments (4-pixel slashes, glyphs 118/119) flying ±2 HPOS/±2 lines a frame from one point | **core 5 frames, fragments 30** (0.6 s) | fragments yellow 8 f → red 14 f → yellow/red flicker 8 f; core yellow 2, red 2, dark 1 |
| Heavy kill (Raider, Bomber) | the same pool, cells spread over the hull (`heavy_breakup_offsets`) | Raider 16×14, Bomber 32×16 footprint | same + **`COLBK` flash 4 f** | same + `$1E $3C $1C $34` full screen |
| player death | `P0` core + `P3` outer, 8×8 masks, double width | 32 × 8 capture pixels (4 cells × 1 row) | **6 phases × 4 = 24 f** (+1 f DYING), `COLBK` 6 f | `COLPM0 $0E`, `COLPM3` gold `$1C` (OPEN) / `$28` (capital), flash `$1E $3C $1C $3C $38 $34` |
| capital hull hit (shell vs hull) | 3×3 cells, 6 phases | 3×3 | 24 f | `PF2`/`PF3` banks — environment, not player-caused |
| boss hit | region spark / deflection glyph (ring) + 1-frame band flash | 1 cell | 2 f | band amber |
| boss module destroyed | cells removed (decision L), `COLBK` flash via the Heavy slot, shake, sound | the module | flash 4 f | Heavy table |
| boss defeat | 16 blasts, 6 f apart | 1 cell each | 96 f | band amber/burgundy |

Pool: 6 physical slots, **5 active = one break-up**. A newer kill clears the
live break-up (`clear_transient_effects`). Spawns go through the
one-expensive-event token and the ring-rotate gate, forced within two frames.
Glyphs: debris core 110, fragments 118-119; no free code is used.

### 3.2 Cost per explosion (native 6502, `scripts/debris-destruction-runtime.mjs`)

| | cycles |
| --- | ---: |
| spawn (`light_spawn_breakup`, the kill frame's expensive half) | 1,063 (STATUS); Heavy ~1,100 |
| `resolve_enemy_damage`, a Raider kill | 786 |
| per frame, 5 cells live (erase + update + render, 25 Hz stagger) | 897 … **1,399** (peak, frame 3) |
| per frame, 4 fragments live | 1,052 … 1,111 |
| per frame, last frame / expiry | 577 / 199 |
| ≈ per cell per frame (update 77 + (render 280 + erase 70) / 2) | **≈ 250** |
| peak over all 22 ring heads | 1,399 |

### 3.3 Where the fence binds (committed replay CSVs, 63 sessions, 100,532 fence rows)

| rows | n | worst line-238 margin |
| --- | ---: | --- |
| all fighter rows | 100,532 | **1,370** `2-evasive-fire3` f287 — two Heavies, 4 player + 2 enemy shots, debris, **5-cell break-up live** |
| break-up live | 28,397 | 1,370; then 2,041, 2,255, 2,305 (all 4-cell, two Heavies, full shot pools) |
| no break-up live | 72,135 | **4,105** |
| kill frame (Heavy or module) | 942 | 2,841 (`raider-remnant-spread-atr-hard` f2052) |
| break-up spawn frame | 1,168 | 2,841 |
| player death start | 96 | 9,007 |
| boss rows | 12,499 | 12,984 (module kill frame f11216) |
| boss rows with a break-up live | 66 | 13,515 |

Break-up live rows under 2,000: 1; under 3,000: 12. No-break-up rows under
4,000: 0. **Multi-kill**: a spread volley's second kill is deferred by the
token and then replaces the first break-up — the worst case is bounded at one
break-up by design; the price is visual: **463 of 1,191 spawns (39 %) already
cut a live break-up short** (trace heuristic: count 5 reached while the mask
was non-zero).

---

## 4. Duration — current and proposed

| | now | proposed (≈ 1.5×) |
| --- | ---: | ---: |
| break-up fragments (Light, debris, Heavy) | 30 f (0.60 s) | **45 f (0.90 s)** |
| break-up core | 5 f | **45 f** — grows f0-4, full to f12-14, fades |
| Heavy / boss-module `COLBK` flash | 4 f | **6 f** |
| player death (PMG) | 24 f | **24 f** recommended (gameplay-identical); 36 f is an option: DYING +12 f, respawn 0.24 s later, every replay diverges after its first death |
| Heavy formation recycle hold | 24 f | **24 f** (unchanged: keeps admission and every replay frame-identical) |
| capital hull explosion | 24 f | 24 f (not player-caused) |
| boss spark / band flash | 2 f / 1 f | unchanged |

The visual life (effect TTL) and the gameplay hold (`FIGHTER_EXPLOSION_TIMER`
enemy slot) are separate timers, so the longer explosion moves no gameplay
frame. With 45 f the cut-off share rises to ≈ 48 % (ESTIMATE: 112 more spawns
fall inside a 45-frame window) unless the pool is split (§6.3).

---

## 5. Options for the colour

| | P0 — FIRE (glyph ramp) | **P1 — PLASMA, `COLPF2` static cyan** | P2 — PMG cycling for Heavies | P3 — `COLPF2` cycled by the DLI | P4 — `COLPF3` (the brief's proposal) |
| --- | --- | --- | --- | --- | --- |
| player shots | yellow `$1E` (unchanged) | **cyan `$9E`** (or `$AE`) | unchanged | pulsing | unchanged |
| explosions the player causes | white → yellow → `$46` magenta-red → embers | **white → cyan → blue (`$88`) / sparse cyan** | Heavy: a big `P1/P2` burst whose `COLPM1/2` cycles any palette; Lights: as P0 or P1 | pulsing | own register |
| player death | FIRE (PMG, `COLPM3` fire cycle) | FIRE (same) | same | same | same |
| boss band | sparks amber, blasts amber | sparks/blasts **cold** (art: `%11` → `%01` light steel), flash cyan | `P1/P2` free in the boss sector | — | lasers turn plasma |
| side effects | none | allied `service`/`turret` glyphs cyan; capital explosion core's `pf2` cells cyan (re-bank to `PF3`/white: data); **yellow sky** stars cyan (the level-format name `yellow` becomes the PF2 sky); the capsule's "same hue as the shot" rationale (gold `$1C`, decision of 2026-09-29) no longer holds — keep gold or move to the shot hue | the dead Heavy's P-page is drawn for the hold; a second member dying cuts the first burst (cap 1) | **recolours allied hull + yellow sky every frame: forbidden** | **recolours every enemy now; S4b lasers** |
| owner decision reversed | none | **decision U** (`COLPF2 $1E`) | none | U + palette rule | 19, art direction, m5 §5.5 |
| per-frame cost | 0 | 0 | ~30 + ~250 per phase write (every 4 f), only on Heavy-death frames | ~6 | — |
| bytes | glyphs + tables (§6) | same + 0 (one constant) | ~100 B + 3 B state | ~12 B | — |
| S4b conflict | none | none | none (S4b takes no player; m5 §5.6's chain explosion already plans PMG bursts — coordinate) | none | **yes — STOP** |

---

## 6. The growing explosion — design and cost

### 6.1 Shape (both variants, same five cells)

* **Grows**: f0-1 the core cell shows a 2×2 white dot; f2-4 a small burst;
  the fragments appear at f3 in the core's cell and move out (Light/debris
  "medium": ±1 HPOS/±1 line a frame; Heavy and boss "large": ±2 HPOS/±1 line,
  from the hull-wide offsets), so the cloud is 1 cell → 2×2 (≈f4) → 3×3 (≈f8)
  → ~5×3 (≈f16), then fades by glyph.
* **Bigger**: full-cell burst glyphs instead of 4-pixel slashes; the core lives
  45 frames instead of 5; the fragments are fireballs (big → small → ember).
* **Draw cost is spread by construction** — the kill frame only fills state
  (1,063); the cells render at 25 Hz in two parity groups, as today. The brief's
  premise "kill frames are the binding rows" does not hold (§3.3).

### 6.2 Glyphs and bytes (ESTIMATE, placement measured in Phase B)

| piece | bytes | home |
| --- | ---: | --- |
| 7 new codes: core dot, small, full, ring, fireball big, small, ember | 56 B of glyph source | runtime codes **52-58**: in the runtime charset they hold only a copy of the charset source's tail (loader DL stream, flash tables, fragment velocities — read from the *source* at `$3223`, never displayed; ESTIMATE: no equate names codes 52-58 and none was seen on screen — Phase B pins it with a test). Source: the entity-effects glyph stream (extension), installed by `install_entity_effects_glyph` |
| 118/119 redrawn | 0 | existing |
| colour/glyph timeline (core and fragments, by TTL) | ~40 B table + ~10 B code | replaces the yellow/red branches in the effects renderer (`ENTITY_CODE`, **26 B free**); the table outside it |
| per-class motion (medium/large) | 10 B table + ~10 B code | `PICKUP_CODE` tail (65 B) beside `heavy_spawn_breakup` |
| `COLBK` flash 4 → 6 f, per variant | +2 B | the tables sit in the charset source tail (1 B free): move them out, +~4 B RODATA — **initial block** (13,621 / 13,652, 31 B to STOP) |
| PLASMA: `COLPF2` → `$9E` | 0 | constant (`fighter-weapons.json`) |
| PLASMA boss: cold spark/deflection/blast art | 0 code | region charset (`extras.png`) |
| player death, 16-line masks + `COLPM3` fire cycle | ~20 B code + 9 B colours | the renderer is in `BROADSIDE` (**3 B free**): moves to an extension tail (Phase B measures) |
| optional: split pool for multi-kill (§6.3) | ~60 B | `ENTITY_CODE` cannot hold it; `STARFIELD` tail (299 B) or `DIRECTOR_C_LOW` (177 B) |
| optional: Heavy PMG burst (P2) | ~100 B + 3 B | same |

Initial block: **+0 … +4 B** (ESTIMATE) → ≤ 13,625 ≤ 13,652; boot sectors
unchanged → ATR menu delta unchanged (550, +0 vs the 596 baseline's band).
Slot A, slot C, scratch, region charset (+0 codes for PLASMA, the spark and
blasts are redrawn in place): **0 B** in the recommended package.

### 6.3 Cycles and margins (ESTIMATE from MEASURED parts)

| case | now (MEASURED) | after | how |
| --- | ---: | ---: | --- |
| break-up per frame, peak | 1,399 | **~1,450** | same 5 cells; +~10 per cell for the table lookup |
| break-up per frame, typical | 1,052-1,111 (4 cells) | ~1,350-1,400 | the core now lives the whole 45 f: +~300 |
| worst fence row | 1,370 (5 cells live) | **~1,320** | that row already pays 5 cells; −50 for the lookup |
| 4-cell rows (2,041 / 2,255 / 2,305) | | ~1,690 / ~1,900 / ~1,950 | +~350 |
| rows without a break-up today (worst 4,105) that get one from the longer life | | ≥ ~2,650 | 4,105 − 1,450 |
| kill / spawn frame | 2,841 | ~2,830 | spawn +~10 |
| multi-kill (spread volley) | one break-up, token-deferred | unchanged worst | the pool never exceeds 5 cells |
| player death rows | ≥ 9,007 | ≥ ~8,700 | 16 rows written every 4 f, +12 for `COLPM3` |
| boss rows | 12,984 | 12,984 | palette and art only |
| stress per-frame work (native pin 7,000) | 6,678 | **6,678** | no boss code changes |
| DMA-on maximum | 31,237 | ≈ 31,237 | |

**Fence margin after the change: ≈ 1,320 (ESTIMATE) ≥ GO 500.**

**Fallback cap if Phase B measures less than ~1,000:** the core expires at
f24 (back to 4 cells for the tail: today's per-frame cost), and Heavy kills use
the medium variant. Both are table data. A third step is the split pool: when a
kill arrives with a break-up live, the old one keeps core + 2 fragments and the
new one takes 2 slots (core + 1) — every kill is seen, ≤ 5 cells per frame,
and the 39 % cut-off share disappears (~60 B).

---

## 7. Recommendation

1. **PLASMA (P1)** for the player's side: `COLPF2 $1E → $9E`, with an `$AE`
   review build beside it for the hardware smoke. Reasons: the character layer
   cannot show real red anyway (FIRE's red is the enemy's magenta), the plasma
   ramp stays entirely in the player's hue family, the cost is zero cycles, and
   it touches no S4b resource. In the band the shot stays **light steel `$0A`**:
   no band register is cyan and changing one recolours the boss art; light
   steel is the same "cold" family and its distance to the playfield shot is
   what it is today (28.7 vs 29.4) — this is the documented reason the brief
   asks for, **needs the owner's approval**.
2. **Player death stays FIRE**, bigger (16 lines) with `COLPM3` cycling
   yellow → orange → red → dark red; 24 frames (gameplay-identical) unless the
   owner wants 36.
3. **Growing break-up** (§6.1), **45 frames**, same five cells; Light/debris
   medium, Heavy and boss large; **`COLBK` flash 6 frames** in the variant's
   palette (PLASMA `$9E $8C $9C $8A $9A $84`, FIRE `$1E $3C $1C $38 $1A $34`).
4. Plasma fade ends on **sparse cyan**, not `$88` (the hostile trail colour).
5. Capital-hull explosion cells re-banked so it stays FIRE (it is not
   player-caused).
6. Not now: the Heavy PMG burst (P2) and boss-band blasts on module death
   (slot A has 53 B and S4b needs them). Split pool only if the owner minds the
   cut-offs.
7. **`COLPF3`, missiles and `PRIOR` stay untouched** (S4b).

### Owner questions

* **Q1** FIRE or PLASMA? (recommended PLASMA)
* **Q2** if PLASMA: `$9E` cyan, `$AE` mint, or both as review builds? And the
  capsule: stays gold `$1C`, or follows the shot?
* **Q3** size: Light/debris medium, Heavy and boss large, as previewed?
* **Q4** duration: 45 f break-up, 6 f flash; player death 24 f or 36 f?
* **Q5** the in-band shot stays light steel (documented reason above)?
* **Q6** the split pool for multi-kills (~60 B), or keep "newest wins"?

---

## 8. Preview (scratch, not committed)

Rendered by a scratch tool from the real ATR captures in
`docs/media/gameplay/` (decoded to Atari colour values), the runtime charset
dumped by the native harness, region 1's compiled band, and the Atari800 PAL
palette; scale 3×. Paths are in the session scratch directory
(`…/scratchpad/preview/`):

1. `1-playfield-light-kill.png` — now / FIRE / PLASMA, frames 0-42, near a
   hostile shot, white stars and a Raider
2. `2-playfield-heavy-kill.png` — Raider kill with the `COLBK` flash
3. `3-full-frame-fire.png`, `3-full-frame-plasma.png` — whole screen at the
   burst's peak, the player's shots in the variant's colour
4. `4-player-death-fire.png` — now 24 f / proposed 36 f, 16 lines, fire cycle
5. `5-boss-band-fire.png`, `5-boss-band-plasma.png` — in-band shots, a spark,
   plate-d's destruction with the flash and blasts
6. `6-palette-swatches.png`

What the preview shows that the plan relies on: the full-screen flash is the
strongest element of a Heavy kill in both variants; the plasma break-up never
shares a colour with a hostile object except its `$88` embers (item 4 above);
FIRE's red phase is the Light's own magenta.

---

## 9. Phase B (after the owner's answers)

Tests first, RED on `8a05b43`: break-up TTL and core life per class (45 f),
glyph codes 52-58 installed and never emitted before, the colour timeline per
variant, the `COLBK` flash length, the multi-kill cap (≤ 5 cells, one per
frame), the in-band shot colour rule, the player death staying FIRE
(`COLPM3` sequence), `COLPF3`/`PRIOR`/missiles untouched. Then the evidence
pass of `AGENTS.md` (`build:candidate` → `runtime:wall-trace` → `build` →
`npm test` ×2), the memory map regenerated, and the report the brief lists.

---

## 10. Phase B1 — as built and measured (2026-10-05) — **STOPPED**

Owner answers of 2026-10-05: colour by smoke ($1E default, $9E and $AE as
review builds); sizes as previewed, still 5 cells; break-up 30 → 45 frames,
background flash 4 → 6 frames, the player's death FIRE, 16 lines, 24 frames;
capsule gold, in-band shot $0A, `COLPF3`/missiles/`PRIOR` untouched; "newest
wins"; the fallback of decision 6 below a 1,000 margin, a STOP below 500.

**Status: B1 stopped on the gameplay check** (§10.6): a longer break-up moves
a capital broadside shell's impact by two frames in 2 of 54 replays, through a
pre-existing screen-scan defect. Everything else of B1 is built and measured.

### 10.1 What was built

| piece | where | bytes |
| --- | --- | ---: |
| growth glyphs 108 (dot) and 109 (small burst); 118/119 redrawn as the full burst and its ring | `assets/graphics/entity-effects.json` (`growthPhases`, `fragmentPhases`), installed with the debris bank | +16 ENTITY_CODE |
| effect glyph range 110-119 → **108-119** in the backing resolvers (codes 108-109, not 52-58: the resolvers recognise effect cells by one contiguous range, and 108-109 held only frontend font source copies) | `src/main.s` | 0 |
| break-up renderer: the look first, from a stage list per pool role read by the slot's TTL; a hidden stage costs no address or backing work; **a blank cell skips the three backing resolvers** (code 0 resolves to nothing else) | `render_transient_effect_overlays`, CODE | −9 |
| lives: fragments 45 frames, core 24 (**decision 6's fallback**, §10.3); fragments ±1 HPOS/line a frame, shown from frame 5; Heavy **medium** (fallback: one start point beside the core at the hull's centre) | asset, `heavy_breakup_offsets` | 0 |
| Heavy / boss-module `COLBK` flash 4 → 6 frames, `$1E $3C $1C $38 $1A $34` (cold builds: hue, `$8C`, hue−2, `$8A`, hue−4, `$84`); vx/vy tables overlap their unused slot-0 byte to pay for it | charset source tail, RODATA | 0 |
| player's death 16 lines (each mask row twice), `COLPM3` fire cycle `$1E $1C $2A $28 $26 $34` by patching the publication's two `COLPM3` immediates; the gold / `$28` restored on every frame without a death explosion; 24 frames, respawn unchanged | BROADSIDE 182-B block (35 B pad used, 7 B left) | 0 |
| `--player-colour=1E|9E|AE` (composes with `--level=N:sector=M`): `PLAYER_SIDE_COLOUR`, the late bank (`$80` red for $1E, `$00` for cold) and the flash table follow it | `scripts/build.mjs`, `src/main.s` | — |

Initial block **13,621 B** (unchanged; STOP 13,652), boot 107 sectors, slot A
1,995 / slot C 2,003 / scratch 249 unchanged, ENTITY_CODE tail 26 → 10 B.

### 10.2 RED → GREEN

`tests/plasma-fx.test.mjs`, five tests, run in their final form against a
clean build of `main` `8a05b43` (temporary worktree, ATR `4926dc05…`):
**4 RED** (45-frame life with the 24-frame core, the growth, the 6-frame
flash, the 16-line fire death) and **1 GREEN by nature** (codes 104-109 and
52-58 are displayed by nothing — a native play-through of level 1 to the
boss entry, every ring and divider cell every frame, plus the only `CHBASE`
selections of the gameplay charset). On this branch: **5 GREEN**.

### 10.3 Measurements (diagnostic only, never evidence)

Method: `node scripts/build.mjs --level=1:sector=0` (level 1 from its start)
and `runtime-wall-trace --artifacts=build/level-1-s0 --only-session=<id>` for
every session a debug route runs (51), plus the three `raider-remnant` replays
through `--raider-remnant-only --skip-boot-smoke` on the candidate (writes
`build/` only); compared row by row with `main`'s committed-evidence CSVs on
42 gameplay columns; fence margins by `scripts/pal-timing-audit.mjs`'s
samples. Not run: `capital-engines-first-150`, the three `debris-gate-*`,
`raider-sector-atr-hard`, `two-pmg-raiders-atr-hard` (special modes; B2's full
run covers them).

| | `main` | first build (45-f core, large Heavy) | + renderer optimisation | **delivered (fallback)** |
| --- | ---: | ---: | ---: | ---: |
| worst fence row | 1,370 `2-evasive-fire3` f287 | **−45** `2-sweep-fire6` f311: a frame MISS | 763 `2-sweep-fire6` f311 | **1,287** `2-sweep-fire6` f311 |
| `2-evasive-fire3` f287 | 1,370 | 1,383 | 2,628 | 2,628 |
| DMA-on maximum (gameplay rows) | 31,237 `director-complete-2` f5797 | — | — | **31,240** (same row) |
| worst Heavy kill frame | 2,841 | — | — | 3,133 `raider-remnant-rapid` f123 |
| SPREAD multi-kill frame (`raider-remnant-spread` f2052) | 2,841 | — | — | **3,775** |
| boss: worst frame = module destroyed | 12,984 (f11216) | — | — | **12,974** (same frame) |
| boss stress work (native, pin 7,000) | 6,678 / 5,516 | — | — | **6,689 / 5,518** |
| break-up per live frame, native (mean / peak) | 1,099 / 1,399 | 1,306 / 1,566 | — | **971 / 1,259** |

Decision 6 fired on the measured 763 (< 1,000) and the delivered fallback
measures 1,287 (≥ 1,000).

### 10.4 For M8: truncation and a second break-up

Kills are the replays' score rises outside the boss band (the break-up follows
within two frames); 999 kills in the 51 debug-route replays, identical kill
timing in both builds. The next kill cuts the older break-up before frame 10
in **11.4 %**, before 24 in **26.7 %**, before 45 in **46.1 %** (with `main`'s
30-frame life it cut **36.6 %**). A second concurrent break-up would add the
pool's walk again — 971 mean / 1,259 peak native, ~1,250-1,640 wall with DMA
(ESTIMATE ×1.3) — to the worst row's 1,287: **≈ 0 to −350, under GO 500.**
Not affordable without another saving.

### 10.5 Build table (all under `build/`, never `dist/`)

| build | ATR SHA-256 prefix |
| --- | --- |
| $1E default, level 1 (`build/player-colour-1E`, = the candidate `dist/` bytes) | `0fb0ebfc513d1cdc` |
| $1E, yellow-sky sector 4 (`build/level-1-s3` = `build/player-colour-1E-level-1-s3`) | `a64e057e3d59c84c` |
| $1E, boss sector (`build/level-1-s4`) | `8c02ca7b41777b56` |
| $9E, level 1 (`build/player-colour-9E`) | `8081aad0d632c0fe` |
| $9E, yellow-sky sector (`build/player-colour-9E-level-1-s3`) | `fc2b36e976b06e69` |
| $AE, level 1 (`build/player-colour-AE`) | `f3daf04138c4145f` |
| $AE, yellow-sky sector (`build/player-colour-AE-level-1-s3`) | `a185e70eb2b358a2` |

### 10.6 The gameplay check — why B1 stopped

Before any code: the break-up's state (`EFFECT_*`, `src/main.s` the spawns
10784/12066, the update 10854, the clear 10920, the render 11264, the erase
10048) is read by no collision, capsule, spawn or Director path; the one
TTL-dependent side effect, `clear_transient_effects` releasing the pickup
while `PLAYER_DYING` (10920-10924), is a no-op then — the death already
released both pickup slots, `erase_bullet` (8225) removed every player shot
and `update_player_fighter_weapon` (4240) stays released, so no qualifying
kill can refill them.

**What the static check missed:** `broadside_hits_opposite_hull`
(`src/main.s:9482`, the scans at 9504 and 9531) finds a hull edge by scanning
the shell's screen row for the first code **≥ 59** (`CAPITAL_HULL_GLYPH_BASE`),
with no upper bound — so any effect, debris, Light or hostile-shot code on
that row stands in for the hull. It is a pre-existing defect (the same on
`main` for every one of those codes); a 45-frame break-up whose fragments
drift slowly makes it happen in replays where it did not: in
`weapon-pickup-2-hunt-fire4` and `raider-remnant-normal-atr-hard` the capital
sector's shell 0 impacts at frame 1199 instead of 1197 and
`director_intensity` reads 4 for 2 frames instead of 2; 6 cells differ, and
everything is identical again from frame 1204. No other screen-code read
decides gameplay (the capital explosion's bounded checks at 9189-9221 only
draw).

Options (owner's choice):

1. **Bound the hull scan to the hull's own glyphs** (`59 ≤ code < 90`, both
   directions). Effects become visual-only again and the latent defect closes;
   ~6 B in BROADSIDE (the explosion block has 7 B), +~4 cycles a scanned cell
   on capital frames only (their worst wall is 18,351 of 35,568). Replays
   change wherever `main`'s shells met a non-hull code — B2's evidence
   regeneration absorbs it.
2. Accept the coupling: the default build's replays change in the capital
   sector (here: 2 of 54, a 2-frame shift); recorded clauses must still pass.
3. Keep the 30-frame life in capital sectors only (a per-sector TTL): closest
   to `main`'s replays, still not identical, and the look varies by sector.

Recommendation: **1**.

### 10.7 Tests re-pointed (each follows from a decision)

`effects-stagger` (45-frame expiry; fragments held back to frame 5; resolver
peak 1,068 → 928), `explosion-colour-flash` (6-frame enemy profile, new
`FLASH_YELLOW_LOW`), `entity-effects` ×4 (16-line death window; 45-frame
expiry; the split's lives, publication and art; the 6-frame Raider profile),
`fighter-weapons` ×2 (`PLAYER_SIDE_COLOUR`; the death renderer patches the
`COLPM3` operands and writes no colour register), `heavy-breakup` (the medium
Heavy of decision 6), `weapon-pickup-rapid-fire` ×2 (the fragments still
burning when the capsule enters), `preview` debris trace (48 frames), and the
layout pins moved by the 16 B of growth glyphs and the 9 B shorter renderer:
`cold-pickup-record-fit`, `formats`, `light-interceptor` ×2, `light-wingman`,
`loader-screen`. Every behavioural assertion still runs.

Red until B2 by the owner's order (evidence bound to `main`'s ATR):
`github-showcase` ×3, `menu-raster`, `memory-map-generated`,
`runtime-evidence-binding`, `runtime-timing`, `runtime-wall-trace` ×6
(several pin the 4-frame flash and will need re-pointing after the
regeneration), and `enemy-roster`'s release-variant check (a candidate build).
`preview` "consumes the canonical charset" is the recorded failure, same
assertion (line 166).

---

## 11. B1.1 — the broadside fix and the art and timing iteration (2026-10-05) — **STOPPED**

Owner answers to the B1 stop: the broadside coupling by option 1 (bound the
hull-edge scan to the hull glyphs), and an art and timing iteration from an
outside review of the previews (items a-f). Colour still by smoke.

**Status: stopped again on the gameplay check** (§11.6): the bounded scan
removed the coupling it was asked to remove, and measuring it exposed its
mirror image. Everything else of B1.1 is built and measured.

### 11.1 The hull range — proof (before code)

Every code a hull can put on a playfield row, `&$7F` (bit 7 is the bank):
the allied and enemy decoded maps and codebooks of the default set and of all
four hull styles R1-R4 (`compileCapitalHulls`), the runtime codes
`CAPITAL_HULL_*_CODE` (engines `$53/$D4`, prow edges `$55/$D6`, prow fills
`$3B/$C6`, launch flashes `$51/$D2`, muzzles `$45/$D0`), the turret table's
muzzles, the broadside schedule's flash codes, the capital explosion's phase
codes (`$57/$D7/$D8/$D9`, drawn only over cells already holding 52-89), and the
level image's hull block (levels 1 and 2 are region 1; the block's codebook is
style R1's, byte for byte): **59-89, every one of them; none outside.**

Every code that can appear on a playfield row, from a native play-through of
level 1 to the boss entry (8,876 frames) and of level 2 to its end (14,000),
lives held: 0 (space), 1 (the near star), 12-36 (player shot phases), **59-89
the hull** (76 never), 90-103 hostile shots (inverse), 108-109 the break-up's
growth glyphs, 110-117 debris, 118-119 the break-up's burst glyphs, 120-121 the
Light, 126-127 the capital shell. **Nothing but the hull draws inside 59-89.**

### 11.2 The fix — a pre-existing defect

`broadside_hits_opposite_hull` (`src/main.s`, BROADSIDE, inside overlay slot A)
took the first code >= 59 on the shell's screen row for the hull's edge, so a
break-up effect, a debris, a Light or a hostile shot on the row before the hull
stood in for it. It is a defect of `main` (the plasma FX break-up only made it
frequent) and it was exposed by **`weapon-pickup-2-hunt-fire4`** and
**`raider-remnant-normal-atr-hard`** (shell 0 in the capital sector).

Both scans now read `asl` / `cmp #(59*2)` / `bcc next` / `cmp #(90*2)` /
`bcc found` (ASL drops the bank bit): one byte longer each. The two bytes come
out of the three-byte address pad before `@world_targets` in the same segment,
so **BROADSIDE's size (6,653 B), its 3-B free tail, its load record (extension
record 1, 44 sectors) and every address from `broadside_hits_opposite_hull` on
(`free_broadside_slot` `$76A7` asserted) are unchanged**; the 70 labels between
the pad and the scan move down 2 B (slot A, reached only through the capital
vector table). Cycles: the same per blank cell; +2 at the hull cell it finds
and +2 per non-hull code >= 59 it now passes — at most a few tens a capital
frame; the worst capital row (`2-evasive-fire3` f805) reads 18,351 → 18,369
wall with the break-up's own cost included.

Test `tests/broadside-hull-edge.test.mjs`, RED on `main` (an allied and an
enemy shell take a break-up glyph, a fragment, a debris, a Light, a hostile
PULSE shot or a capital shell before the hull for its edge), GREEN here; its
third test is the static half of the range proof.

### 11.3 The art and the timing (items a-f)

Four codes, the four the resolvers' contiguous range 108-119 leaves free next
to the debris bank (item f: no STOP needed):

| code | art | used by |
| --- | --- | --- |
| 108 | scattered sparks, one white | the core's first frames; every fragment's end |
| 109 | an elongated streak, white head | a fragment shape; the streak/spark shimmer |
| 118 | the core burst: a clear white centre (PF0) in the variant colour | the core frames 2-11; a fragment shape |
| 119 | a torn, irregular shell | the core frames 12-23 (late bank); a fragment shape |

* **Core** (24 frames, out before the fragments): sparks 2 frames, the
  white-centred burst 10, the torn shell 12 (red in the $1E build), out.
* **Fragments**: four, each starting on a different code (slots 1-4: 108, 109,
  118, 119 — `effect_fragment_render_ids`, in the BROADSIDE block because MAIN
  is full), held back while the core grows (frames 0-4), spread asymmetrically
  (HPOS/lines a frame: (−1,−1) (+2,−1) (−2,+1) (+1,+2)); with 12 or more frames
  left they wear their own shape, then the streak/spark shimmer in the late
  bank, the last 6 frames sparks alone. No colour register changes: the fade is
  pixels and shapes, the bank bit only picks PF3 in the $1E build.
* **Lives** (item d): Light and debris **30 frames**, Heavy **45** (medium
  size). Boss modules have no break-up: the band is drawn in the region's
  charset and the effect pool cannot draw into it, and adding one needs slot A
  bytes the owner fixed; a module's destruction is the stepped flash below.
* **Background flash** (item e), Heavy kill, boss module and the player's death,
  playfield and band alike (`COLBK` is global): `$1E $3C $82 $80` then black
  for the 6-frame total (cold builds: hue, hue−2, `$82 $80`, black).

Bytes: initial block **13,631 B** (+10: the stage masks, the core-young check,
the per-fragment code reads), boot 107 sectors; BROADSIDE block 2 B left;
ENTITY_CODE tail 10 B; slot A 1,995 / slot C 2,003 / scratch 249 unchanged.

### 11.4 Measurements (diagnostic only)

Same method and sessions as §10.3: 51 debug-route replays and the three
`raider-remnant` replays, row by row against `main`'s committed-evidence CSVs.

| | `main` | B1 | **B1.1** |
| --- | ---: | ---: | ---: |
| worst fence row | 1,370 `2-evasive-fire3` f287 | 1,287 `2-sweep-fire6` f311 | **1,370** `2-sweep-fire6` f311 |
| DMA-on maximum (gameplay rows) | 31,237 `director-complete-2` f5797 | 31,240 | **31,240** (same row) |
| worst Heavy kill frame | 2,841 | 3,133 | **3,279** `raider-remnant-rapid` f123 |
| SPREAD multi-kill (`raider-remnant-spread` f2052) | 2,841 | 3,775 | **3,857** |
| boss module destroyed (worst boss frame, f11216) | 12,984 | 12,974 | **12,974** |
| boss stress work, native (pin 7,000) | 6,678 / 5,516 | 6,689 / 5,518 | **6,689 / 5,518** |
| break-up per live frame, native (mean / peak) | 1,099 / 1,399 | 971 / 1,259 | **959 / 1,221** (debris, 30 f) |
| worst capital row (wall) | 18,351 | — | **18,369** |
| initial block | 13,621 | 13,621 | **13,631** |

Truncation (the next kill cuts the live break-up; 999 kills, identical timing in
every build):

| class (kills) | before 10 | before 24 | before 45 | before its own life: `main` / B1 / **B1.1** |
| --- | ---: | ---: | ---: | --- |
| Heavy (736) | 12.8 % | 29.3 % | 48.0 % | 38.7 % (30 f) / 48.0 % (45) / **48.0 %** (45) |
| Light + debris (2 + 261) | 7.6 % | 19.4 % | 41.1 % | 30.8 % (30) / 41.1 % (45) / **30.8 %** (30) |

### 11.5 Comparison builds

| build | full path | SHA-256 prefix |
| --- | --- | --- |
| $1E, level 1 | `/Users/marcinkrzetowski/Projects/dark-fighter/build/player-colour-1E/void-strike-65.atr` | `7b122d0e5dd06383` |
| $1E, sector 4 (yellow sky) | `/Users/marcinkrzetowski/Projects/dark-fighter/build/player-colour-1E-level-1-s3/void-strike-65.atr` | `72ceed43847441d6` |
| $1E, boss | `/Users/marcinkrzetowski/Projects/dark-fighter/build/level-1-s4/void-strike-65.atr` | `9c3f2feac26e124e` |
| $9E, level 1 | `/Users/marcinkrzetowski/Projects/dark-fighter/build/player-colour-9E/void-strike-65.atr` | `e2680844dffb5ab2` |
| $9E, sector 4 | `/Users/marcinkrzetowski/Projects/dark-fighter/build/player-colour-9E-level-1-s3/void-strike-65.atr` | `633840c45b268281` |
| $AE, level 1 | `/Users/marcinkrzetowski/Projects/dark-fighter/build/player-colour-AE/void-strike-65.atr` | `d977908062780cfa` |
| $AE, sector 4 | `/Users/marcinkrzetowski/Projects/dark-fighter/build/player-colour-AE-level-1-s3/void-strike-65.atr` | `1af678121f592dcc` |

Launch: `atari800 -xe -pal -nobasic <full path>`.

### 11.6 Why B1.1 stopped — the mirror image of the defect

The scan reads the shell's **screen** row (`set_gameplay_row_ptr`), so every
overlay drawn there decides what it sees. Before the fix an overlay before the
hull counted as hull (an early impact); after it, **an overlay drawn over the
hull's edge cell hides that cell**, and the edge moves one cell inward (a late
impact). The break-up draws over hull cells, so its look still reaches the
scan. MEASURED in `weapon-pickup-2-hunt-fire4`, shell 0 flying left at the
allied hull:

| build | impact | at x |
| --- | --- | ---: |
| `main` | frame 1197 | 84 — a non-hull code taken for the edge (the defect) |
| `main` + the scan fix alone | frame 1200 | 78 — an old 30-frame fragment over the edge cell |
| B1.1 | frame 1199 | 80 — the edge cell visible |

`director_intensity` follows the impact; everything is identical again from
frame 1205. It is the only shell in the 54 replays whose timing any of the
three builds changes. Debris, a Light, the shots and the shell itself can cover
a hull edge too; their timing is the same in every build, so they move no
replay between them, but they are the same defect.

Options:

1. **The break-up does not draw over hull glyphs** (59-89): an effect cell
   that would cover a hull cell is left undrawn that frame, so no effect can
   reach the scan. ~6 B of the initial block (→ ~13,637), a few cycles a drawn
   cell; in capital sectors a break-up is clipped by the hull it flies over.
2. **The scan reads through effect cells** (an effect-owned cell resolves to its
   saved backing): exact and invisible, ~20 B in BROADSIDE, which has 6 free,
   so it needs a relocation first.
3. **Accept** a one-cell, one-frame shift in a shell impact when a break-up
   covers the edge; capital-sector replays move in B2.

Recommendation: **1**.

### 11.7 Tests

New: `tests/broadside-hull-edge.test.mjs` (3). Re-pointed in B1.1, each with
its reason in place: `plasma-fx` (per-class lives, the art, the stepped
flash), `explosion-colour-flash`, `effects-stagger`, `entity-effects` ×2,
`heavy-breakup` ×2, `preview` (debris trace), and the layout pins the 10 B of
the initial block and the art's packing moved: `boot-loading-blank-screen`,
`boot-xex-reclaim`, `boss-overlay`, `hybrid-c-arena`, `level-summary-build` ×2,
`cold-pickup-record-fit`, `formats`, `light-interceptor`, `light-wingman`;
`broadside-fire` (the bounded scan's source); `loader-screen` back to `main`'s
`$3810` (B1's −9 B of CODE are spent again). On `main` (`4926dc05…`):
`plasma-fx` 5 RED, 1 GREEN (the codes precondition); `broadside-hull-edge` 2
RED, 1 GREEN (the range proof, a property of the data). Still red until B2 by
the owner's order: the 14 evidence-bound tests of §10.7 and the recorded
`preview` failure.
