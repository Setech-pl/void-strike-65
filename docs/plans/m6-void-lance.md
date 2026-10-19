# M6 — the VOID LANCE and the +1 life capsule

**Branch:** `plan/m6-void-lance` from `main` `3d59ded` (v0.3.0; ATR
`c977efe0…`).
**Status:** Phase A — **STOP for the owner** (reticle variant, §5; the
answers marked *proposed*, §4). Planning only: no tracked source or build
output changed. The probe is under `build/m6-probe/` (not committed); its
patch against `main` is kept as evidence in
[`docs/diagnostics/m6-void-lance-probe-2026-10-19.patch`](../diagnostics/m6-void-lance-probe-2026-10-19.patch).

Labels: **M** measured (the 6502 core with the boss stress tools, or the
Atari800 trace); **EST** an estimate, with its basis; **IC** an instruction
count, not assembled. Every figure says where it comes from.

---

## 1. Decisions and sources

### 1.1 Standing owner decisions (journal `docs/owner-decisions-2026-09-11.md`)

| the brief's premise | the journal | verdict |
| --- | --- | --- |
| boss-only weapon, replaces the Nova Missile | **§AE 1**: "Torpeda protonowa — tylko w sektorze bossa; zastępuje planowany Nova Missile". **§AQ 1-2, 5(c)** call its targeting the "celownik M6 VOID LANCE" | confirmed (the torpedo is the lance) |
| destroys exactly one module, the one it hits | **§AE 1**: "niszczy jeden moduł bossa (płytę, działo albo emiter lasera) od razu" — plate, gun or laser emitter; the core is not named | confirmed; see §4 (e) |
| every capsule the boss drops is one shot | **§AE 1** "jedna torpeda na kapsułę"; **§AE 6** "każda kapsuła w sektorze bossa jest torpedą", the fight kept at 90-120 s on MEDIUM, re-balanced in data | confirmed |
| one reticle on PMG P1 / P2, reserved for it | **§AO 3** (P1 / P2 left unused in the boss sector), **§AQ 1, 2, 5(c)** (P1 and P2 free for the VOID LANCE reticle; M0 the gravity column, M1 / M2 the lasers, P3 / M3 the capsule) | confirmed |
| charges about 1.5 s while FIRE is held | **not in the journal.** §AE 3 records the opposite firing rule: "Torpeda odpalana regułą Nova: puszczenie FIRE po zebraniu, kolejne naciśnięcie wystrzeliwuje torpedę zamiast zwykłego strzału" (release after the pickup, the next press fires it instead of the ordinary shot) | **the brief changes §AE 3** — recorded here as the brief's rule (owner, 2026-10-19), to be written into the journal when the owner confirms §4 (a)-(c) |
| +1 life capsule: 1 in 4, forced in the last space sector, once a level, at most 8 lives | **§AE 2** (rare, never zero, a clearly different colour or icon, at most eight lives with **§K**); **§AE 7** ("losowanie 1 na 4 przy każdej kapsule, wymuszona w ostatnim sektorze przestrzeni, jeśli jeszcze nie padła, raz na poziom") | confirmed |
| the gates | **§AU 6** (bosses do not save resources; entry, fence ≥ 500, 32,568, stress ≤ 8,500, no resident byte without asking); **§AY** (entry ≤ 350 host frames); §AE 5's 200 B of slot E and its 260-frame bound are superseded (slot E is 511 / 512 B of its 4 sectors, the bound is §AY's 350) | in force |

### 1.2 Baseline, measured on `main` `3d59ded` (the brief's note 1)

The four stress tools on a pristine copy of `main` (`build/m6-probe/base/`,
its default build byte-identical to `dist/`: ATR `c977efe0…`), the stress
accounting of `docs/STATUS.md` (the band DLI's three phases, the row
switches, UPDATE, SECTOR_COMPLETION, MOTION; native cycles; worst reachable
case = at most two meetings a frame):

| region | boss | level | tool | worst reachable (M) | headroom to 8,500 |
| --- | --- | ---: | --- | ---: | ---: |
| 1 | Blockade Breaker | 1 | `tests/boss-stress.test.mjs` (region 1) | 7,150 | 1,350 |
| 2 | Void Citadel | 4 / 5 | `scripts/measure-boss-stress-r4.mjs` | 7,694 / **8,029** | 471 |
| 3 | Siege Spine | 7 / 9 | `scripts/measure-boss-stress-field.mjs` | 7,771 / **8,025** | 475 |
| 4 | Bastion | 10 | `scripts/measure-boss-stress-r2.mjs` | **8,060** | 440 |

They match the brief and the **feat/boss-order-scale** table in STATUS
("Per region (M; M6 headroom = 8,500 − the worst reachable boss frame)",
`docs/STATUS.md:569-576`) and the banners' table (`:514-521`). **Stale, to
correct:** the boss-art table's row "M6 headroom (8,500 − worst) | 1,504 /
777 / 475 / 456 | 1,346 / 565 / 471 / 352" (`docs/STATUS.md:621`) predates
the boss order (§AX) and the Spine's reload, and the reticle estimate under
the order table (`:577`, "~300 … ~120 without a redraw") is replaced by §2.
The worst fence margin quoted by the brief, 1,465, is the M5 audit's row
(`docs/STATUS.md:475`, 2-sweep-fire6, a fighter-sector replay).

---

## 2. Measurements (A1)

### 2.1 The probe

`build/m6-probe/probe/` is a copy of `main` with (patch in
`docs/diagnostics/`):

* `src/hybrid/lance.s` — the lance, ASM only, in a **probe slot G**: its own
  run of 5 sectors at the disk's free tail (712-716) read after slot E by the
  banner's reads (`ldy #5` for the shared runs), landing at `$B880` in the
  window's unclaimed tail; the run table's entry (+5 B of slot A) and the
  head's fold include it. The boss vector image's free **TICK_FLASHES**
  entry (`jmp boss_rts` today) becomes `jmp lance_tick`: the tick runs every
  boss frame before `read_input` and UPDATE. Nothing resident changes.
* **The tick:** the band column under the ship's centre
  (`(player_x + 8 − 32 + boss_shown_pos) / 4`, `boss_shot_meet`'s formula),
  its front module from `boss_column_map`; a target only if a player shot
  there would hurt it (a module, alive, its exposed bit set — ARMOUR / OPEN
  columns, covered modules, the Bastion's covered cannons and closed doors,
  the Spine's powered field columns are all refused by the same map);
  the reticle's HPOS from `boss_mx` / `boss_mxe` and `boss_shown_pos` every
  frame (the band's drift); FIRE held on a target charges (75 frames,
  1.5 s), with `gameplay_fire_gate` held at 0 (the ordinary burst waits;
  `read_input` re-arms the gate when FIRE is released, so a held button never
  falls back into ordinary fire); losing the target resets the charge and
  gives the gate back at once; the 2-frame blink is HPOS 0 on two frames of
  four.
* **The shot:** on the frame the charge completes the reticle goes off and
  the beam is armed (no drawing on that frame); from the next frame the beam
  grows up from the ship's top **40 lines a frame** in the ship's own plane
  (P0, double width: 4 colour clocks at the ship's centre, the ship's
  colour); on the frame it reaches the module's bottom line the module's HP
  is set to 1 and **`boss_hit`** runs with the module and the column — the
  existing kill path (spark, score, kill stat, rebuild, exposure, chain,
  capsule); the beam stays 3 frames and is erased 40 lines a frame.
* Three reticle looks (§5) and two placements: **on the module's line**
  (redrawn whenever the target's bottom line changes) or **one line per
  region** under the band's last shown row (`boss_band_measure`, slot D,
  once; drawn once, afterwards HPOS only). Colour: either the lasers'
  COLPM1 / COLPM2 (nothing changes in the DLI) or its own colour in the band
  (phase 0 publishes it, phase 1 gives the lasers theirs back: +24 cycles a
  frame, M).
* The stress tools in the probe tree call the tick inside each composition's
  frame (after phase 0 and the row switches, before UPDATE — where
  TICK_FLASHES runs) and put the lance in a state per case
  (`tests/lance-probe.mjs`): **idle** (a lance in stock, FIRE released, the
  ship moved under a front module, the target just changed), **charging**
  (FIRE held, a shown frame; V3: its fill step due), **firing** (the charge
  completes on the case's frame; the case's later frames grow the beam),
  **arrival** (the beam's last 40 lines reach the module and kill it: one
  meeting cases only, its player shot removed — ordinary fire is suspended
  for the whole charge, so no player shot meets the band then). A case's
  figure is the composition's frame plus the tick (its `rts` included; the
  TICK_FLASHES call costs the base build the same jsr / jmp / rts).

### 2.2 The result — the recommended configuration (M)

Laser colour, one line per region, all regions' worst reachable frame, the
same accounting as §1.2 (`build/m6-probe/logs/m-v*f-*.log`):

**Variant 1 (brackets, P1 + P2):**

| region | before | idle | charging | firing | arrival (the kill) | worst | headroom | fence margin, boss route (§2.4) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Breaker (L1) | 7,150 | 7,391 | 7,408 | 7,449 | 6,148 | 7,449 | **1,051** | 9,359 |
| 2 Citadel (L4 / L5) | 7,694 / 8,029 | 7,866 / 8,229 | 7,883 / 8,246 | 7,924 / 8,287 | 7,617 / 7,976 | 8,287 | **213** | 7,887 |
| 3 Spine (L7 / L9) | 7,771 / 8,025 | 7,989 / 8,241 | 8,006 / 8,258 | 8,047 / 8,299 | 7,456 / 7,827 | 8,299 | **201** | 8,793 |
| 4 Bastion (L10) | 8,060 | 8,278 | 8,295 | 8,336 | 7,041 | 8,336 | **164** | 8,939 |

The new worst frames are the old ones plus the tick (the binding cases do
not move: the Citadel's and Spine's two-kill frames with the lasers in their
heat step, the Bastion's rail step frame with r2 spawning). **No region
exceeds 8,500; none drops below 1,400 of fence margin.**

**Variants 2 (crosshair, P1) and 3 (column marker, P1)**, the same table's
worst columns (idle / charging / firing):

| region | V2 | V3 |
| --- | --- | --- |
| 1 | 7,379 / 7,396 / 7,437 | 7,417 / 7,492 / 7,437 |
| 2 (L5) | 8,217 / 8,234 / 8,275 | 8,255 / 8,330 / 8,275 |
| 3 (L9) | 8,229 / 8,246 / 8,287 | 8,267 / 8,342 / 8,287 |
| 4 | 8,266 / 8,283 / 8,324 (headroom **176**) | 8,304 / 8,379 / 8,324 (headroom **121**) |

**The tick alone** (worst over all cases, M): V1 218 idle / 235 charging, V2
206 / 223, V3 244 / 319 (its fill writes one row a frame); the beam's
growth frames 622 (40 lines; they fall on frames with no player meeting);
the arrival frame's tick 2,705 (Bastion), almost all of it the kill through
`boss_hit` — which a player shot's kill costs inside UPDATE anyway. The
STATUS estimate (~300 / ~120, `:577`) was low on the idle frame (the target
pick and the exposure test every frame, ~200) and high on the redraw, which
this placement never does.

### 2.3 The configurations that do not fit (M)

| configuration | Citadel L5 | Spine L9 | Bastion | over 8,500 by | why |
| --- | ---: | ---: | ---: | ---: | --- |
| V1 on the module's own line (redraw when the target's line changes) | 8,647 / 8,664 / 8,705 | 8,659 / 8,676 / 8,717 | 8,696 / 8,713 / 8,754 | **147-254** | the redraw (erase + draw, 8 rows × 2 planes, loops) ~400 a frame; tick 636 / 653 |
| V2 on the module's line | 8,523 / 8,540 / 8,581 | 8,535 / 8,552 / 8,593 | 8,572 / 8,589 / 8,630 | **23-130** | tick 512 |
| V3 on the module's line | 8,801 / 8,876 / 8,821 | 8,813 / 8,888 / 8,833 | 8,850 / 8,925 / 8,870 | **301-425** | tick 790-865 |
| the lance's kill with a player shot meeting too (if ordinary fire were not suspended) | 8,654 | 8,475 | 8,156 | **154 (Citadel L5)** | two kills + the beam's segment |

(Columns: idle / charging / firing. The module-line and the two-meeting
rows were measured on the own-colour build; the figures above have its DLI's
measured 24 cycles taken off. Raw logs: `build/m6-probe/logs/m-v*m-*.log`,
`build/m6-probe/logs/old/`.)

**Own colour in the band: rejected on sight, not on cycles** (+24 a frame,
M). P1 / P2 share COLPM1 / COLPM2 with the lasers' M1 / M2, and the lasers'
columns pass through band rows under their emitters: with the reticle's
colour published for the band, the top of every warned or firing laser
column inside the band turned green (the first probe capture,
`build/m6-probe/view/v1b.png`, frames 144-150). The reticle therefore wears
the lasers' colour — `$46`-family, hue 4, four hue steps from the ally steel
`$88` (≥ 45°) — and their warning flicker when a laser warns on the same
missile; it sits under the band, outside the band's DLI palette rows, so no
row's colours change.

### 2.4 The trace: fence margin, DMA-on, entry (M, Atari800)

`boss-aim-1`, 1,600 frames, on each region's route (`--level=1:sector=6
[--boss-region=N]`), the frame count capped by the probe's `PROBE_FRAMES`;
the probe builds in demo mode (a lance always in stock, FIRE replaced by a
fixed cycle — 60 frames released, 90 held — so it charges, fires and kills
a module every 160 frames when the bot stays under a target):

| region | main: margin / DMA-on / entry | probe: margin / DMA-on / entry | misses |
| --- | --- | --- | ---: |
| 1 | 14,681 / 27,203 / 295 | 9,359 / 29,911 / **313** | 0 |
| 2 | 11,317 / 27,793 / 310 | 7,887 / 29,313 / **329** | 0 |
| 3 | 13,219 / 27,890 / 306 | 8,793 / 29,212 / **325** | 0 |
| 4 | 14,258 / 27,287 / 310 | 8,939 / 28,929 / **328** | 0 |

(Regions 2 and 3 on the own-colour build, V1; 1 and 4 on the final build,
all three variants the same to the frame.) Not like for like: the demo kills
a module every 160 frames, the base bot rarely in 1,600 frames, so the
probe's worst boss frames carry more kills. Every boss frame stays ≥ 7,887
cycles of margin, under the 32,568 gate by ≥ 2,657; the worst fence margin
of the game, 1,465, is a fighter-sector frame the lance never runs in (its
code runs only through the boss vector table, which the reader restores
after the boss). **Entry: +5 sectors cost +18 / +19 / +19 / +18 host frames
(3.6-3.8 a sector)**, 313-329 against 350.

Both sessions failed only the clauses a 1,600-frame cap fails on `main` as
well ("did not reach the level-end summary", "never reached the chain").
The first capture on the sweep bot (`s41-diag-1`, module-line V1) also
failed "stale or torn enemy PMG body on 3999 frames": the trace's Heavy body
check reads P1 / P2 in every frame; production needs the clause to know the
reticle (§7).

---

## 3. Resource map (A2)

| resource | today (source) | the lance needs | source |
| --- | --- | --- | --- |
| **resident bytes** | — | **0** for the weapon: the hook is the boss vector image's free TICK_FLASHES entry (slot A, byte-neutral); ordinary fire waits through the existing `gameplay_fire_gate` (0 B); the kill is `boss_hit` (0 B); the beam is the ship's own P0 plane (0 B). **The capsule** (look and collection) is the exception, shared with the +1 life capsule: see the next two rows | M, the probe |
| collection of a LANCE capsule | `weapon_pickup_collect` (`ENTITY_CODE`) turns any type into a booster state | **A** (recommended, with the life capsule): one 3-B re-point in `ENTITY_CODE` to a window veneer, byte-neutral; the veneer's LANCE branch (~7 B) jumps to slot G. **B** (0 resident, lance only): slot G polls the booster slot each boss frame (~10 cycles), turns a fresh booster into a lance and releases it (~40 B of slot G) — works, but a collection the HUD has already shown as a booster for one frame | IC |
| the LANCE capsule's look | one 16-row silhouette per type, `fighter_pickup_pmg_shape` (48 B, `STARFIELD`, initial block; the assert pins `TYPE_COUNT × 16`) | **A**: +16 B in the table (moved to the window with the life capsule's, plan `gameplay-variety` §3.6: initial block −48, window +48 + 16 a type). **B** (0 resident): slot G copies a lance silhouette over the three rows of 16 at the boss entry and the originals back at the boss exit (64 B of slot G, the exit through slot D's `b2_restore`, 3 B of its 4) | IC |
| window record (`$AE00`) | 1,315 of 1,387 B packed (manifest, record at sector 179) | lance alone: **0**; with the life capsule (§4 (i)) and the moved table: 125-160 B (`gameplay-variety` §3.6, EST) → **over the 72 B of slack: the record 11 → 12 sectors** (boot transport +1 sector, ~4 frames of the menu deadline; STATUS's boot margin) | manifest; EST |
| slot A | 2,034 of 2,048 B (14 free) | +5 B: slot G's entry in `boss_runs` (M: 2,039, 9 free). Own colour would add 3 (rejected) | M |
| slots C / D | 4 B free each | **0 / 0** (the probe used none) | M |
| slot E | 511 of 512 disk bytes (4 sectors), 49 B RAM free | 0 | manifest |
| banner reads (`BOSS_BANNER_KEEP`) | 248 + 16 of 320 B | +2 B (the shared-run count as a parameter) | M (250 B) |
| **slot G** (the lance's own run) | — | probe: **542 / 518 / 583 B** of code (V1 / V2 / V3) + 21 B state, 5 sectors (M, `build/m6-probe/v*f/build/boss.map`). Its parts (listing): the tick ~236 B, the beam and kill ~150 B, the reticle (place, draw, HPOS) ~110 B, tables ~30 B, 14 B of unused own-colour code. **Production target ≤ 381 B + state = 3 sectors** (EST: the probe is unoptimised; the C split of §6 adds back ~60-100 B → 3-4 sectors) | M; EST |
| slot G's disk home | boss code reservation 528-583: 52 sectors used, **581-583 free** (manifest) | 3 sectors fit with no reservation change; a 4th needs the reservation grown, and 584 is the summary art: the disk's free tail **712-720** (9 sectors) is the place (the probe used 712-716) | manifest |
| slot G's RAM home | candidates, all unclaimed and **not measured** at run time (memory map) | (1) **`$B82A-$BBFF`**, the window's unclaimed tail (982 B; the probe used `$B880-$BAFF`): 0 resident bytes, but it is the window's room to grow — any later window code there must not be needed in the boss sector or must be restored after it (**owner decision**); (2) `$0400-$04FF` (256 B): too small for the whole lance, enough for the reticle and tick; (3) the region charset's unused codes (`$0EE8` R1 280 B, `$0F20` Bastion 224 B, `$0F60` Citadel / Spine 160 B): +1 / +2 sectors in each region's charset run, region-dependent room. Recommended (1), with a run-time write watch over it (the `$0700-$1FFF` probe's method) before production | memory map, manifest |
| **entry** (≤ 350 host frames) | 295 / 310 / 306 / 310 (M, §2.4) | +5 sectors M: 313 / 329 / 325 / 328. **3 sectors EST +11: 306 / 321 / 317 / 321**; 4 sectors EST +15: 310 / 325 / 321 / 325. The owner's "~+2 sectors" is 1 short of the lean target | M; EST |
| PMG | P1 / P2 free in the boss sector (§AQ 5 c); `clear_pmg` at `banner_hand_over` empties them at every entry | V1: P1 and P2; V2, V3: **P1 only** (P2 stays free). The beam: the ship's P0 plane (its own colour, no register touched) — not P1 / P2 because their colour is the lasers' (the beam would look like the boss's laser). No hardware collision register is read by the game (M: `P0PF`/`P0PL` never loaded), so the beam in P0 cannot trigger anything | M |
| DLI / registers | — | 0 (the lasers' colour). SIZEP1 / SIZEP2 written by the reticle's one draw | M |
| **run packing (P)** | not used (§AY chose B0) | the boss-banners plan's lever: each region's band A, band B, charset and block runs LZ-packed, **−3 sectors R1, R3, R4, −4 R2** (M then), decode EST +3.4-4.4 frames → **≈ −7 to −11 host frames** a region; P′ (slots A, C, D) −5 sectors, ≈ −7 frames net. Not needed at 3-4 sectors (§2.4: 329 worst with 5) | `docs/plans/boss-banners.md` §4 |

---

## 4. Answers to the open questions (A3) — *proposed, owner to confirm*

| | proposal | alternative | cost (proposal / alternative) | reason |
| --- | --- | --- | --- | --- |
| **(a)** column change while charging | **the charge follows the player's column**: the reticle re-targets every frame; the charge keeps building while any valid target stays under the ship, resets when none does; the beam and the kill take the module under the ship when the charge completes | lock on the module under the ship when the charge began | 0 (M, the probe) / +~30 B and a beam from the ship to a module not above it (diagonal: not a vertical P0 line) | a vertical beam can only hit what is above the ship; no lock state |
| **(b)** FIRE with no target under the ship | **no charge: the ordinary fire** (the gate is untouched) | charge and waste the shot | 0 / 0 | a single button: the press is a lance only where the lance can hit; nothing is wasted. Refines §AE 3 ("the next press fires it instead of the ordinary shot") — the press is the lance's only over a target |
| **(c)** does charging suspend ordinary fire | **yes**, for the whole charge, and after the shot until FIRE is released (the existing `gameplay_fire_gate` semantics) | ordinary fire continues while charging | 0 / **the lance's kill frame can then meet player shots: Citadel L5 8,654 (154 over), Spine L9 8,475 (25 left)** (M, §2.3) | the only measured way the shot fits; it also reads as the Nova rule's "instead of the ordinary shot" (§AE 3) |
| **(d)** shots per capsule | **one** (§AE 1), a stock of up to 3 lances, no HUD cell (every HUD cell is spoken for, `gameplay-variety` §1.8): the reticle shows whenever a lance is in stock — it is the indicator | two per capsule | 1 B of state / the same, and the fight's balance moves twice as far | the standing decision; the balance session (§6 phase 5) sets module HP so MEDIUM stays 90-120 s (§AE 6) |
| **(e)** the boss core | **no**: the reticle never takes a module of kind CORE (+6 B, +8 cycles on the tick, IC) | yes, like any weapon | 6 B / 0 | §AE 1 names plate, gun and emitter; a stored lance on the core would end any fight at once |
| **(f)** closed bays, doors, shielded cannons (Bastion) | **the owner's proposal: no** — the lance hits only what a normal shot could hit. Built in: the target is the column map's front module with its exposed bit, the same test `boss_c_hit` applies; covered cannons' columns are rail ARMOUR, closed doors are not exposed | let it through cover | **0** (M) / a second column-map walk past ARMOUR (~40 B, +~60 cycles) | the owner's rule; free |
| **(g)** R2 gravity well, R3 force field | **no special case.** Citadel: the pull moves the ship, the reticle follows (a); the core lens is shielded while the spires stand (not exposed: no target). Spine: a powered field half writes its columns as ARMOUR in the column map — **no target through the field**, as no shot passes it; a generator is a target | let the lance pass the field | 0 / as (f) | the shared column map already says what a shot can hit |
| **(h)** the Nova Missile | **nothing to remove**: it was never built (no code, no HUD cell, no score hook; `game-design.md` "Nova Missile — planned"). The section is rewritten as the VOID LANCE (engineering doc, single language); `how-to-play` EN / PL gain the lance (decision V) | — | docs only | — |
| **(i)** the +1 life capsule | **the type pick (C, the window) at the capsule's spawn**: `weapon_pickup_spawn_capsule_at` (`ENTITY_CODE`, `src/main.s:10419`) re-pointed byte-neutrally (`lda ENTITY_TYPE+NEXT` → `jsr`) to a C decision: while the level's `life_given` is clear and the capsule is not the boss's, one draw of the Director's RNG (`director_c_rng_advance`, replay-deterministic) at 1 in 4 makes it LIFE (the rotation not advanced). **Forced:** the level compiler marks the level's last space sector (a free `sector_kind` bit, 0 runtime bytes); `enter_sector` (C) sees it and, if `life_given` is clear, spawns a LIFE capsule there and then (no kill needed — "never zero" holds even when that sector earns no capsule). **Once a level:** `life_given` set at the spawn, cleared by the Director's level init. **At most 8:** the collection (the veneer of §3) adds 1 clamped at 8 and redraws `LIFE n`. Look: its own silhouette (+16 B) and colour (a COLPM3 table in `PICKUP_CODE`'s 13 free B) | forced = "the next capsule in that sector is LIFE" (the journal's literal wording) | window 125-160 B, 1 B state (EST, `gameplay-variety` §3.6) / −~15 B, but a sector with fewer than 3 qualifying kills gives no capsule, so a level can end with none | C owns the policy (AGENTS: drop rules are decisions); the forced spawn is what makes "never zero" true |

---

## 5. Reticle variants (A4) — **STOP: the owner chooses**

All three on P1 (V1 also P2), in the lasers' colour (§2.3), one line per
region right under the band's last shown row, the HPOS following the target
module's columns and the band's drift; rendered from the running probe in
Atari800 PAL (`boss-aim-1` on each route, demo cycle), 320 × 240 (the
showcase's crop of the native 336 × 240), the GIFs 150 frames at 50 fps
(3 s): idle, the charge, the beam growing from the ship, the module's
destruction.

| variant | look | P | cost: idle / charging tick, worst frame (Bastion) | stills | GIFs |
| --- | --- | --- | --- | --- | --- |
| **1** bracket pair `[ ]` around the module's columns, 2-frame blink while charging | 3-px brackets, 8 lines | P1 + P2 | 218 / 235; **8,336** (164 left) | `v1-breaker.png`, `v1-bastion.png` | `v1-breaker.gif`, `v1-bastion.gif` |
| **2** one crosshair at the module's centre, 2-frame blink | 8 × 8, a gap at the centre | P1 | 206 / 223; **8,324** (176 left) | `v2-*.png` | `v2-*.gif` |
| **3** one thin column marker that fills as the charge builds | 4 px × 16 lines, a row every 5 frames, emptied a row a frame | P1 | 244 / 319; **8,379** (121 left) | `v3-*.png` | `v3-*.gif` |

Files: `/Users/marcinkrzetowski/Projects/dark-fighter/build/m6-probe/reticle/`
(not committed). V3 deviates from the brief's "above the module": above it
is inside the band, on the hull, and a per-module line costs a redraw that
does not fit (§2.3); it hangs under the band instead. **Recommendation:
V2** — the cheapest, one player (P2 stays free), and a crosshair reads as a
sight in the lasers' colour; V1 frames a wide plate better.

---

## 6. Implementation phases (after the owner's choices)

Each phase is its own commit on `feat/m6-void-lance`, gates as §1.1; STOP
points are where a measured figure decides.

| phase | what | bytes (budget) | cycles (budget, boss frame) | STOP if |
| --- | --- | --- | --- | --- |
| 1 prototype → production reticle | slot G as a real boss run (sectors 581-583, the window tail `$B82A+` after a run-time write watch over it), the TICK_FLASHES hook, the target pick (ASM), the chosen reticle; the lance's **policy in C** (stock, charge, fire decision — AGENTS: state machines in C), its PMG / HPOS / gate writes in ASM; HPOS published in the band DLI's phase 0 as the lasers' are (no tearing; +16 cycles IC) | slot G ≤ 384 B (3 sectors); slot A +5, banner reads +2; resident 0 | tick ≤ 260 idle / ≤ 280 charging (M 206-235 ASM-only + the C call) | any region's worst > 8,450 (a 50-cycle reserve), or slot G > 3 sectors |
| 2 the shot | the beam in P0 (40 lines a frame), the kill through `boss_hit` on arrival, no meeting on the fire frame | inside slot G | growth frames ≤ 650; arrival ≤ the region's worst | an arrival frame above the region's two-meeting worst |
| 3 the capsule drop | every boss capsule a LANCE (`boss_capsule_kill`'s spawn through slot G, byte-neutral in slot E), the rotation untouched in the boss sector | slot G +~12 | 0 | — |
| 4 HUD and pickup swap | the shared collection veneer (LANCE → slot G stock; LIFE → lives), the silhouette table in the window, the LIFE rule (§4 i) with the level compiler's last-space-sector bit | window +125-160 B (record 11 → 12 sectors, owner decision), initial block −48, `PICKUP_CODE` +12 | 0 per frame; one RNG draw per capsule spawn | window record past 12 sectors; the boot deadline |
| 5 balance | module HP per region so MEDIUM stays 90-120 s with the lances (§AE 6), the curve re-measured (`docs/boss-curve.json`) | data | — | a region outside 90-120 s on MEDIUM |
| 6 trace clauses, tests, smoke | §7; the four route ATRs and the whole game for the owner's smoke; STATUS, memory map, how-to-play EN / PL | — | — | any clause or gate red |

---

## 7. The tests and trace clauses that prove it

* **`tests/boss-stress.test.mjs` and the three `measure-boss-stress-*`
  tools** run every composition with the lance idle, charging, firing and
  arriving (the probe's `tests/lance-probe.mjs` made permanent), the limit
  8,500 on each — including **a stress fixture that fires the lance on the
  Bastion's worst frame** (the rail step frame with r2 spawning, the lasers
  in their heat step) and one per region's worst two-kill frame.
* **Entry ≤ 350:** the boss entry gate (`runtime-wall-trace.mjs`,
  `tests/slot-f.test.mjs`, §AY) with slot G read — every region's route and
  the default trace's boss entries.
* **No meeting on a lance frame:** a trace clause over every boss frame with
  the beam armed — no player shot in the band (`boss_shot_admit` count 0).
* **The lance hits only what a shot can:** 6502 tests per region — a target
  is never ARMOUR, OPEN, covered, unexposed, a powered field column, or a
  CORE (§4 e, f, g); the Bastion's covered cannons and closed doors refused.
* **The Heavy body clause** learns the reticle: P1 / P2 in the boss sector
  hold only the reticle's rows (the probe's first capture failed it on 3,999
  frames).
* **Fire suspension:** with FIRE held over a target no PairShot is allocated
  for the 75 frames; released, the next press fires ordinarily.
* **The kill:** the lance's module dies through the score / kill-stat /
  capsule path exactly as a shot's (the harness's kill counter).
* **The life capsule:** at most one per level (the trace's pickup journal),
  never zero on every replay that plays a level to its end, lives capped at 8.
* **Colours:** the reticle's register is never written (the lasers' COLPM1 /
  COLPM2 untouched), no DLI palette row changes (`tests/boss-art.test.mjs`'s
  per-row checks unchanged).
* **Memory:** slot G's range claimed in the memory map and the linker
  (`docs/memory-map.md`, the claim test), its run inside its reservation.
