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
