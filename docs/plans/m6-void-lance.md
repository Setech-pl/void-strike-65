# M6 — the VOID LANCE and the +1 life capsule

**Branch:** `plan/m6-void-lance` from `main` `3d59ded` (v0.3.0; ATR
`c977efe0…`); Phase B on `feat/m6-void-lance`, which carries the plan's
commit `837cf04` (fast-forwarded onto it from `main` `3d59ded`).
**Status:** Phase A done; the owner's answers are journal **§BD**
(2026-10-20; §4 below, confirmed). Phase B stage 1 built (§6.1); the owner's
smoke (journal §BE) withdrew rule (c) and compared two variants (§6.2); **the
owner chose variant A, gesture A-up, with the ship at half speed while
charging (journal §BF) - stage 1 final as built in §6.1. Its smoke (journal
§BG) replaced the stock with a time meter and asked for a readiness
indicator: §6.3. The owner's smoke of C (journal §BH) found the gesture
dead over gaps: the charge now builds whatever is under the ship - §6.4.
The owner accepted §BH (journal §BI) and asked for the stage's finish: the
banner's onboarding line, the charge ramp, the discharge, indicator C only -
§6.5. §6.1-§6.5 are smoke-confirmed: owner smoke PASS on a real 65XE PAL
through the SIO2SD (2026-10-21, journal §BJ, hardware-testing §41); merged
into `main`. Stage 1b is also owner-accepted on `main` `35499ba`
(journal §BL, §BM). Stage 2 is **OWNER-ACCEPTED**, owner play test PASS on `b2261c9`
(2026-10-22, journal §BN); look A and placement A, as built in §8.** Phase A's probe is under `build/m6-probe/` (not
committed); its patch against `main` is kept as evidence in
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

## 4. Answers to the open questions (A3) — **confirmed by the owner (journal §BD, 2026-10-20)**

The owner confirmed every proposal below, with the reticle V2 (§5), the
hold-to-charge rule (replacing §AE 3's Nova rule), the reticle under the band
in the lasers' colour, the beam in P0, the life capsule spawned outright, and
the lance's RAM from `$BBFF` down (§BD 1-6). What stage 1 built where the
table's wording differs (§6.1, measured):
* **(c):** ordinary fire waits while charging *and while the beam is up*. The
  beam's end opens the gate again, so FIRE still held fires at once. The
  table's "until FIRE is released" left a player (and the trace's bots) who
  keeps FIRE held without ordinary fire after a shot. The MEDIUM route
  never reached the chain until it changed.
* **The kill frame:** the lance's kill counts as one of the frame's band
  meetings (AUD-04). So the Bastion's rail step, which waits for a frame with
  no meeting, waits on it as on a shot's kill frame. Without that, an
  arrival on a rail-step frame measured 9,383.

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

### 6.1 Stage 1 as built (`feat/m6-void-lance`, 2026-10-20) — smoke-confirmed (2026-10-21, journal §BJ)

The owner's brief for stage 1 covers phases 1 and 2 above: the reticle,
the charge, the beam and the kill, the lance run, and the stock (granted by
`--lance-stock=N`). There is no capsule, no HUD and no README; the game's
stock is 0. **Final rule (journal §BF, commit `44fd28b`):** FIRE + stick UP
held 75 frames over a target; the ordinary fire never changes; the ship at
half speed while the charge builds. The first build's rule (c) and its
figures are kept below the final ones as history (§6.1.1).

**The code (final).**
* **`src/c/lance.c`, the policy** (in the boss link's lance run; no software
  stack, the controller's rule):
  * `lance_c_aim` decides the charge: a target in the fight and not the core
    (the tick's pick already holds the exposed bit); `LANCE_CHARGE_FRAMES`
    frames of the gesture fire, a release or no target cancels, the fire
    decrements the stock.
  * `lance_c_arrive` sets the target's HP to 1 for the kill (0: a shot took
    it on the beam's way; the lance is spent).
* **`src/hybrid/lance.s`, the execution** (included by `boss.s`):
  * `lance_tick` (TICK_FLASHES, before `read_input` and UPDATE): the column
    under the ship's centre; the target's exposed bit through slot D's
    `laser_exposed_module` (a new entry into `laser_exposed`, 0 B); the
    gesture (`PORTA` bit 0 and `TRIG0`); the reticle (P1, drawn once at the
    install's measured line, HPOS at the module's centre); the slow frames;
    the beam (P0, `$18`, 20 lines a frame) and the kill through `boss_hit`.
  * **The kill is the frame's only meeting:** the tick patches
    `laser_frame`'s admit operand (`laser_admit_operand`) to 0 on the kill
    frame and 2 back on the next beam frame; a player shot that would meet
    the boss on that frame waits one frame (AUD-04's hold).
  * **The half speed (§BF 2):** on a charge frame not a multiple of
    `LANCE_CHARGE_SPEED_DIVISOR` (2) the tick points `read_input`'s first
    instruction, `lda STICK0`, at an `$FF` operand of its own (no direction
    held); on every other aim frame back at `$D300`. `read_input`'s edge
    tests are therefore the ones it always makes (no clamp can be skipped,
    whatever the stick does between the two reads). A pause's quit between
    the two frames is covered by START GAME's boss restore
    (`build/boss-restore.inc`, two new entries: `read_input`'s stick operand
    lo / hi). The gravity well's pull (UPDATE) is not the ship's speed and is
    unchanged.
* **The constants:** `LANCE_CHARGE_FRAMES` = 75 and
  `LANCE_CHARGE_SPEED_DIVISOR` = 2 (a power of two; 1 = full speed) side by
  side in `scripts/lance-layout.mjs`; `scripts/build.mjs` passes them to the
  C and the ASM and records them in the manifest (`boss.lance`).
* **The comparison build** `--lance-slow=forward`
  (`build/lance-slow-forward-…`): only the advance is slowed, through the
  boss floor operand (`read_input_y_min_operand` at the ship's line on a slow
  frame). Removed after the owner plays it.
* **The lance run:** `BOSS_LANCE_RAM` `$BA80-$BBFF`, 3 sectors 581-583, read
  after slot E and folded into the head's sums: 373 B of code (268 ASM, 105
  C), 1 B of data (the stock's grant) and 8 B of BSS: **382 of 384 B (2 B
  free)**. Slots A (+5), C, D, E and the banner (+2) as the first build;
  the level summary +10 B (the restore entries' 6, and 4 B of padding with
  the powers tables moved past the display lists, which keep
  `summary_display_list` at `$0B58`, now asserted - journal §BC's outside
  record test reads it; 1,770 of 1,792 B, 14 sectors unchanged).
* **The build:** `scripts/lance-layout.mjs` fails the build when the window's
  record passes `$BA80`, and when the run overflows its sectors or
  reservation.

**Measured — boss stress, final** (the four stress compositions with
`tests/lance-states.mjs`, `scripts/measure-lance-stress.mjs` and
`tests/boss-stress.test.mjs`; native cycles, worst reachable; the charging
state is a shown slow frame):

| region | before | stock 0 | first draw | idle | charging | firing | grow / erase | kill | worst | headroom |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Breaker | 7,150 | 7,170 | 7,550 | 7,394 | 7,416 | 7,414 | 7,496 / 7,516 | 7,114 | 7,550 | **950** |
| 2 Citadel L4 / L5 | 7,694 / 8,029 | 7,714 / 8,049 | 8,025 / 8,388 | 7,869 / 8,232 | 7,891 / 8,254 | 7,889 / 8,252 | 8,040 / 8,060; 8,375 / 8,395 | 7,849 / 8,208 | 8,395 | **105** |
| 3 Spine L7 / L9 | 7,771 / 8,025 | 7,791 / 8,045 | 8,148 / 8,403 | 7,992 / 8,247 | 8,014 / 8,269 | 8,012 / 8,267 | 8,117 / 8,137; 8,371 / 8,391 | 7,758 / 8,010 | 8,403 | **97** |
| 4 Bastion L10 | 8,060 | 8,080 | 8,437 | 8,281 | 8,303 | 8,301 | 8,406 / 8,426 | 7,545 | 8,437 | **63** |

* **Tick cost (worst):** stock 0: 20; first draw 378; idle 222; charging
  244; firing / the beam 346-366; the kill 2,471-2,778.
* **The half speed's check** (M, the 6502 core): 26 cycles on a full-speed
  aim frame, 30 on a slow one (in the idle / charging figures above; with
  the ASM exposure test, idle +31 over §6.2's 191). `read_input` on the
  charge's frames (stick up held, the ship moving): **449** on a moving
  frame, **65** on a slow one - each slow frame saves 384 there. The
  stress compositions do not include `read_input`, so the table carries
  the check's cost and none of the saving.
* **Rule (B) clashes:** 0 in every state.

**Measured — the routes, final** (Atari800, `build/lance-stock-3-*`, stock 3;
34 focused sessions - §6.1.1's 30 plus `boss-aim-lance-1` on each route):

| route | sessions | worst margin | DMA-on max | entry, host frames | misses / clause failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| R1 Breaker | 6 | 8,695 | 29,899 | 306 | 0 / 0 |
| R2 Citadel | 9 | 6,032 | 30,109 | 321 | 0 / 0 |
| R3 Spine | 9 | 7,175 | 30,430 | 317 | 0 / 0 |
| R4 Bastion | 10 | 6,846 | 29,741 | 321 | 0 / 0 |

**The lance in the native evidence** (`boss-aim-lance-1`, MEDIUM: the aiming
bot; the first frame the reticle shows it holds FIRE + UP, tracking the
reticle's module at the band's shown position, until the lance fires, then
flies back to its line; the trace's new `lance_charge`, `lance_beam` and
`lance_stock` columns; DMA-on wall cycles and the fence margin of those
frames, `scripts/pal-timing-audit.mjs`'s model):

| route | charge (74 frames) DMA-on / margin | fire | beam (15-16 frames) | arrival (the kill) | charge from → fired → arrived | health in the charge | ship's line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 Breaker | 27,988 / 12,752 | 27,393 / 14,471 | 27,761 / 11,553 | 27,408 / 8,695 | f2 → f76 → f83 | 10 → 10 | 225 → 188 |
| R2 Citadel | 28,377 / 10,594 | 27,793 / 12,657 | 28,366 / 10,364 | 27,951 / 8,279 | f2 → f76 → f83 | 10 → 10 | 225 → 188 |
| R3 Spine | 28,165 / 11,737 | 27,417 / 16,095 | 28,013 / 13,269 | 27,769 / 8,637 | f48 → f122 → f129 | 10 → 10 | 225 → 188 |
| R4 Bastion | 27,882 / 11,147 | 27,578 / 13,813 | 28,470 / 8,035 | 27,882 / 7,744 | f22 → f96 → f103 | 10 → 10 | 225 → 188 |

* Every arrival was a kill (the boss's alive mask lost the module's bit).
* **The charge reached its end without boss contact on every route,
  the Citadel and the Bastion included:** no health lost from the charge's
  first frame to the fire (one charge each, no restart).
* The ship rose 37 lines in the 74 charge frames - half the 74 a held UP
  gives at full speed.
* The new clause (`boss-aim-lance-1` on a route with a stock): a charge, a
  fire after it and a beam's arrival after that.

**The bots (a defect of the bots, not the game).** The 6 `boss-aim` failures
of §6.2 ("the fight never progressed") were the bot holding FIRE from START
GAME on a debug route, so `main`'s fire gate never opened. The boss-aim bots
now release FIRE for a frame whenever `gameplay_fire_gate` is 0 (the trace's
new `DFTRACE_FIRE_GATE`). Confirmed on the lance-free route builds
(`build/level-1-s6`, `build/boss-region-{2,3,4}-level-1-s6`, stock 0): all 6
pass - R1's three reach the level's summary, R2-R4's chain at frames 2,483 /
3,416 / 2,924 - 0 misses, 0 clause failures. The default evidence has no
boss-aim session, so it is not moved by the fix.

**The evidence chain, final (M, the default build, `21cccd7`).**
`build:candidate`, then the full `runtime:wall-trace`: 58 replays, 0 misses,
0 clause failures. The worst fence margin is 1,465 (`2-sweep-fire6`) and the
DMA-on maximum 31,059 (`2-evasive-fire7`), both unchanged from `main`. The
trace's 17 boss entries all took 306 host frames (limit 350). The
window-tail clause saw 17 lance-run reads and 0 foreign writers. Then the
menu raster (4 sessions pass), `build`, `memory-map`, `showcase:gif` and
`showcase`. Two full `npm test` runs: 1,511 tests, 1,510 pass (the
recorded `tests/preview.test.mjs:164` only); `failures:reconcile` 0 NEW, 0
MOVED, both runs; no re-pins.

#### 6.1.1 The first build (`ae95996` / `6d7cdb4`; rule (c), withdrawn at the smoke)

**The code (first build).**
* `lance_c_give` (one lance, at most 3; stage 2's entry point) - dropped
  for bytes in §6.2.
* `lance_after` (HULL_CONTACT): on the arrival frame it counted the kill as
  one of AUD-04's meetings - gone in §6.2.
* The tick wrote `gameplay_fire_gate` (rule (c)) and the shot's mailboxes;
  the run was 381 of 384 B.

**What changed from §2 / §4 on the way (all M):**
1. **No `boss_band_measure` on the first frame.** That scan cost 2,960 on
   the first shown frame (Citadel L5 10,971). The reticle reads the line the
   install measured and patched into `boss_capsule_y_operand`.
2. **The beam is bounded on every frame.** The Bastion's worst frame, 8,060,
   is a rail step with no player meeting, so beam work adds to it directly.
   The 40-line grow measured 8,741 and the one-frame erase 10,281.
   * The beam grows, then erases, 20 lines a frame, both upward (the erase
     leaves the ship and closes on the module).
   * Grow and erase share one 20-line step.
3. **The kill counts as a meeting.** An arrival on a Bastion rail-step frame
   measured 9,383: the step waits for a frame with no meeting, and the
   lance's kill (before UPDATE, which resets AUD-04's count) was not one.
   `lance_after` decrements `boss_shots_admit_left` after UPDATE, and the
   arrival then measured 7,226. The firing rule (B) already holds on the
   kill: `boss_expose_pending`.
4. **The beam's end opens the gate.** (c) as built: ordinary fire waits
   while charging and while the beam is up. With FIRE held through a shot,
   the gate stayed shut until a release. The MEDIUM route (a bot holding
   FIRE) never reached the chain in 12,000 frames, and at 2,658 frames once
   fixed.
5. **The C/ASM split's bytes.** The policy in C and the execution in ASM,
   first linked, were 501 B against 384. Trimmed to 381 B, with no stage 1
   function dropped: the target held in `boss_hit_module`, a bit-coded
   action, one beam routine for grow and erase.

**Measured — boss stress** (the four stress compositions with
`tests/lance-states.mjs`; native cycles, worst reachable, the §1.2
accounting plus the tick and `lance_after`):

| region | before | stock 0 (the game) | first draw | idle | charging | firing | beam grow / erase | kill (arrival) | worst | headroom |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Breaker | 7,150 | 7,185 | 7,548 | 7,390 | 7,408 | 7,412 | 3,955 / 3,970 | 5,891 | 7,548 | **952** |
| 2 Citadel L4 / L5 | 7,694 / 8,029 | 7,729 / 8,064 | 8,023 / 8,386 | 7,865 / 8,228 | 7,883 / 8,246 | 7,887 / 8,250 | 6,242 / 6,257; 6,601 / 6,616 | 7,360 / 7,719 | 8,386 | **114** |
| 3 Spine L7 / L9 | 7,771 / 8,025 | 7,806 / 8,060 | 8,146 / 8,398 | 7,988 / 8,240 | 8,006 / 8,258 | 8,010 / 8,262 | 5,023 / 5,038; 5,331 / 5,346 | 7,199 / 7,570 | 8,398 | **102** |
| 4 Bastion L10 | 8,060 | 8,095 | 8,435 | 8,277 | 8,295 | 8,299 | 8,422 / 8,437 | 7,226 | 8,437 | **63** |

* **Tick cost (worst):** stock 0: 20 + `lance_after` 15; first draw 360;
  idle 202; charging 220; firing / beam 347-362; the kill 2,428-2,735 (the
  kill path itself). Every state's worst frame is under §6's 50-cycle
  reserve (8,450).
* **Rule (B):** 0 frames with a kill and a spawn in every mode.
* **The fixture that fires the lance on the Bastion's worst frame:** 8,060 →
  8,299 (`tests/boss-region-2.test.mjs`).

**Measured — the routes** (Atari800, `build/lance-stock-3-*`, stock 3 at
every entry; each session focused):

| route | sessions | worst margin | DMA-on max | entry, host frames (main) | misses / clause failures |
| --- | --- | ---: | ---: | ---: | ---: |
| R1 `lance-stock-3-level-1-s6` | boss-aim-0/1/2, boss-park-left/right-1 | 8,326 | 29,665 | **306** (295) | 0 / 0 |
| R2 `…-boss-region-2-…` | diag-0/1/2, dodge-2, finale-0/1/2, boss-aim-1 | 6,645 | 30,334 | **321** (310) | 0 / 0 |
| R3 `…-boss-region-3-…` | the same | 6,125 | 30,476 | **317** (306) | 0 / 0 |
| R4 `…-boss-region-4-…` | the same + edge-left-1 | 7,738 | 29,640 | **321** (310) | 0 / 0 |

* **Entry:** the 3 sectors cost +11 host frames on every region (EST §3:
  +11).
* **The chain:** every MEDIUM session with a chain clause reaches it, as
  does every finale.
* **The reticle:** it shows in the fight on every route session (24-271
  frames) and on no frame outside it, counted from each session's CSV.
* **The window tail:** 0 foreign writers on every session.

Not like for like with main: the routes' bots hold FIRE, so the lances fire
on their own.

**Not measured here:** real hardware (the owner's smoke). The beam during
the player's death explosion: the beam's erase stops at the ship's top line,
but an explosion drawn above it in P0 can lose rows to the erase. That is
cosmetic, rare (a death within the beam's ~12 frames) and untested.

**The evidence chain (M, the default build).** `build:candidate`, then the
full `runtime:wall-trace`: 58 replays, 0 misses, 0 clause failures. The
worst fence margin is 1,465 (`2-sweep-fire6`) and the DMA-on maximum 31,059,
both unchanged from `main`. The trace's 17 boss entries all took 306 host
frames (the limit is 350). The window-tail clause saw 17 lance-run reads and
0 foreign writers. Then the menu raster (4 sessions pass), `build`,
`memory-map`, `showcase:gif` and `showcase`.

Two full `npm test` runs: 1,506 tests, 1,505 pass. The only failure is the
recorded `tests/preview.test.mjs:164`; reconcile found 0 NEW and 0 MOVED.
The first pair of runs found two layout pins this stage had missed, both
re-pinned:
* the Bastion's own entry pin, 80 → 83 sectors;
* the disk-reservation check, which had expected 581-583 to be empty.

### 6.2 The owner's smoke and the comparison variants (2026-10-20, journal §BE) — smoke-confirmed (2026-10-21, journal §BJ)

The smoke on `6d7cdb4`: the reticle is OK. The charge rule is not accepted:
with lances in stock, holding FIRE over a module suspended the ordinary fire,
so the player shot anaemically in the boss sector. **Rule (c) is withdrawn:
the lance never changes the ordinary fire.** Both variants below:
* never write `gameplay_fire_gate` (it is `read_input`'s alone again);
* keep the target in the lance's own bytes (`lance_module`, `lance_cell`),
  since the shots fly while the beam is up. The tick writes the shot's
  mailboxes on the kill frame only;
* skip the kill when a player shot destroyed the module on the beam's way.
  That lance is spent; no other module is touched;
* make the kill in the tick before UPDATE, as stage 1 did. Rule (B) and the
  heavy-frame skip therefore hold as on a shot's kill frame. The kill's frame
  admits `LANCE_KILL_ADMIT` player-shot meetings: the tick patches
  `laser_frame`'s `lda #BOSS_SHOT_ADMIT` operand (`laser_admit_operand`, a
  label, 0 B), and the next beam frame puts 2 back;
* send HULL_CONTACT back to `boss_rts`; `lance_after` is gone;
* drop `lance_c_give` for bytes. It was stage 2's entry point, unused in
  stage 1.

The run is 383 of 384 B (variant A), 8 B of it BSS. Slots A, C, D and E and
the banner are byte for byte stage 1's; the only other change is the vector
image's HULL_CONTACT entry, which is `main`'s again.

`--lance-rule=a-down | a-up | b` builds `build/lance-<rule>[-stock-N-…]/`.
The default is a-down (the game's stock is 0, so the default's rule is never
seen).

**Variant A — a separate gesture (`a-down`, `a-up`).** FIRE is exactly
`main`'s, always. The lance charges only while FIRE is held together with the
stick held down (A-down) or up (A-up), for 75 frames over a target. A
diagonal that includes that direction counts. The ship moves as the stick
says, and releasing either cancels. With stock 0 or no target the gesture
does nothing special.

**Its kill's frame admits no player-shot meeting (`LANCE_KILL_ADMIT = 0`).**
With one meeting admitted beside the kill (B's rule), the kill frame was
measured with one shot's kill on it: Citadel L5 **8,711**, Spine L9
**8,560**, both over 8,500 (M, a-down, the stress below). With none
admitted, a shot that would meet on that one frame waits a frame, as AUD-04
holds a third shot today. The PairShots themselves are untouched (the test
below compares them frame for frame).

**Measured — boss stress, a-down** (native cycles, worst reachable, the §6.1
accounting; the beam states now keep the case's own player shots, which
stage 1 removed). a-up differs only in one immediate, so its figures are
the same cases.

| region | before | stock 0 | first draw | idle | charging | firing | grow / erase | kill | worst | headroom |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Breaker | 7,150 | 7,170 | 7,520 | 7,364 | 7,382 | 7,384 | 7,496 / 7,516 | 7,114 | 7,520 | **980** |
| 2 Citadel L4 / L5 | 7,694 / 8,029 | 7,714 / 8,049 | 7,995 / 8,358 | 7,839 / 8,202 | 7,857 / 8,220 | 7,859 / 8,222 | 8,040 / 8,060; 8,375 / 8,395 | 7,851 / 8,210 | 8,395 | **105** |
| 3 Spine L7 / L9 | 7,771 / 8,025 | 7,791 / 8,045 | 8,118 / 8,370 | 7,962 / 8,214 | 7,980 / 8,232 | 7,982 / 8,234 | 8,117 / 8,137; 8,371 / 8,391 | 7,758 / 8,012 | 8,391 | **109** |
| 4 Bastion L10 | 8,060 | 8,080 | 8,407 | 8,251 | 8,269 | 8,271 | 8,406 / 8,426 | 7,545 | 8,426 | **74** |

* **Tick cost (worst):** stock 0: 20 (no `lance_after`); idle 191; charging
  209; firing / the beam 346-366; the kill 2,473-2,780.
* **The kill frame:** stage 1 put no shot on it, and neither does A, so A's
  kill frames sit under stage 1's worst. The grow and erase frames are
  heavier: the case's shots fly, where stage 1's gate kept them off the beam.
  That is the price of "the fire unchanged".
* **Rule (B) clashes:** 0 in every state, in all four regions' lance tests.
* **The Bastion fixture (fired on its worst frame):** 8,060 → 8,271.
* **Worst frames: not unchanged.** The owner expected A not to change the
  table. The beam's frames now carry ordinary shots, so the worst state per
  region moved (stage 1 → A): R1 7,548 → 7,520; Citadel 8,386 → 8,395; Spine
  8,398 → 8,391; Bastion 8,437 → 8,426. Every state stays ≤ 8,500.

**Measured — the routes** (Atari800, `build/lance-a-down-stock-3-*` and
`…a-up…`, stock 3, the same 30 focused sessions as §6.1). The two rules'
runs are frame for frame the same: no bot makes either gesture.

| route | worst margin | DMA-on max | entry, host frames | misses |
| --- | ---: | ---: | ---: | ---: |
| R1 | 9,692 | 29,183 | 306 | 0 |
| R2 | 6,138 | 30,115 | 321 | 0 |
| R3 | 7,345 | 30,433 | 317 | 0 |
| R4 | 6,895 | 29,738 | 321 | 0 |

**Clause failures: the 6 `boss-aim` sessions (R1 boss-aim-0/1/2, R2-R4
boss-aim-1), the same as on `main`.** A debug route starts at sector 6 with
the bot holding FIRE from START GAME. `main`'s fire gate opens only after a
release, so that bot never fires. It fires 0 shots in 15,000 boss frames
on a lance-free build of the same route (`build/boss-region-2-level-1-s6`,
2026-10-17), with the same clause failure. Stage 1's tick wrote the gate
open on every frame with a lance in stock, so on its routes the bot fired
(2,240 of 2,530 boss frames). That was a second change to the ordinary fire,
gone with rule (c). The other 24 sessions pass every clause, including the
chain and finale ones, the reticle (shown in the fight, never outside it)
and the window tail (0 foreign writers).

**Tests (M):**
* `tests/lance.test.mjs`: 19 of 19 on `lance-a-down` and on `lance-a-up`.
  The new file fails to load on the stage-1 build (no
  `laser_admit_operand`).
* Its rule tests: the gesture's 75 frames and blink; the release of either
  part cancelling; FIRE alone, the stick alone and FIRE with another
  direction never charging, while a diagonal does.
* The ordinary fire, frame for frame: every PairShot through the charge, the
  beam and its end, against the same run with stock 0.
* The kill frame's meetings: none admitted, both shots meet the next frame.
* The module a shot took on the beam's way: not hit again.
* `tests/boss-overlay`, `boss-banners`, `boss-runtime` and `slot-f`: 54 of
  54.

**Variant B — hold-to-charge, the ordinary fire going on (`b`).** Held FIRE
keeps shooting as on `main`. After 75 frames over a target with stock > 0,
the lance fires. The run is 377 of 384 B. The kill joins AUD-04's
two-meetings cap as the owner put it: its frame admits **one** player shot
beside the kill (`LANCE_KILL_ADMIT = 1`).

The owner's wording defers the kill when the cap is already spent. Here the
kill comes first (the tick, before UPDATE) and a second shot waits a frame
instead. Either way a frame has at most two meetings and the worst frame is
the same composition: the kill plus one shot's meeting. The kill stays
before UPDATE because after UPDATE the frame's spawn and queued draw have
already run, which rule (B) and the heavy-frame skip exist to prevent.

**Measured — boss stress, b** (as for A):

| region | before | stock 0 | first draw | idle | charging | firing | grow / erase | kill | worst | headroom |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Breaker | 7,150 | 7,170 | 7,514 | 7,358 | 7,376 | 7,378 | 7,496 / 7,516 | 7,718 | 7,718 | 782 |
| 2 Citadel L4 / L5 | 7,694 / 8,029 | 7,714 / 8,049 | 7,989 / 8,352 | 7,833 / 8,196 | 7,851 / 8,214 | 7,853 / 8,216 | 8,040 / 8,060; 8,375 / 8,395 | 8,350 / **8,709** | **8,709** | **−209** |
| 3 Spine L7 / L9 | 7,771 / 8,025 | 7,791 / 8,045 | 8,112 / 8,364 | 7,956 / 8,208 | 7,974 / 8,226 | 7,976 / 8,228 | 8,117 / 8,137; 8,371 / 8,391 | 8,341 / **8,558** | **8,558** | **−58** |
| 4 Bastion L10 | 8,060 | 8,080 | 8,401 | 8,245 | 8,263 | 8,265 | 8,406 / 8,426 | 8,064 | 8,426 | 74 |

* **Citadel L5 with a player shot meeting the boss on the kill frame (the
  owner's question): no, it does not stay ≤ 8,500.**
  * The worst reachable kill frame is **8,709**: a stage hit admitted beside
    the kill, `gun-2` / `cannon-l`, with the lasers warning, the gravity
    well's step and pulse, and `spire-l` and `plate-b` destroyed.
  * The cases with exactly one shot meeting peak at **8,476**, under the
    limit but with 24 of headroom, not 100.
  * 160 of the 9,856 reachable kill-frame cases are over 8,500 (M,
    `regionFourStress` arrive, a scratch split by the case's meetings).
* **Spine L9:** 8,558, over.
* **Everything else** stays ≤ 8,500: the Bastion 8,426 (its rail-step kill
  frames have no meeting), R1 7,718.
* **`tests/boss-region-3` and `boss-region-4`** fail on the `lance-b` build
  for these two figures (`level 9, lance arrive: 8558`; `level 5, lance
  arrive: 8709`). The default build (a-down) passes both.
* **The fix if B is chosen:** A's kill-frame rule (`LANCE_KILL_ADMIT = 0`)
  brings B's kill frame to A's figures (Citadel L5 8,210, Spine L9 8,012).
  The two rules' ticks differ by 6 cycles, so this is ESTIMATE until built.
* **Rule (B) clashes:** 0 on the Bastion and region 1. The Spine's and
  Citadel's tests stop at the over-limit assertion before their clash
  check.
* **The Bastion fixture:** 8,060 → 8,265.

**Measured — the routes, b** (the same 30 sessions; the bots hold FIRE, so
in B they fire lances on their own, as on stage 1's routes):

| route | worst margin | DMA-on max | entry, host frames | misses |
| --- | ---: | ---: | ---: | ---: |
| R1 | 9,711 | 29,119 | 306 | 0 |
| R2 | 4,259 | 30,132 | 321 | 0 |
| R3 | 7,375 | 30,487 | 317 | 0 |
| R4 | 3,431 | 29,633 | 321 | 0 |

The clause failures are the same 6 `boss-aim` sessions as A's and `main`'s
(a bot that never opens the fire gate). The other 24 sessions pass every
clause.

**Tests:** `tests/lance.test.mjs` passes 18 of 18 on `lance-b`; variant A's
gesture-only test is skipped. A-down's route ATR is byte for byte the same
after B's commit.

**The ATRs (`build/play/`, stock 3 at every boss entry):**
`void-strike-65-m6-lance-<rule>-<route>-stock3-<sha8>.atr` for `a-down`,
`a-up` and `b`, and the routes `r1-breaker`, `r2-citadel`, `r3-spine` and
`r4-bastion`.

**The owner's choice (journal §BF, 2026-10-20): variant A, gesture A-up**
(FIRE + stick UP: the stick forward in the aviation sense - retreat first,
then charge while advancing; the charge costs the player a 1.5 s advance
toward the band). Variant B, A-down and `--lance-rule` are removed
(`44fd28b`); the kill frame's rule stays A's (`LANCE_KILL_ADMIT = 0`, now the
code's only rule), and the owner added the half speed while charging. The
final build is §6.1. The tables above stay as the comparison's record; the
comparison ATRs in `build/play/` (`…-lance-a-down-…`, `…-a-up-…`, `…-b-…`)
are superseded.

### 6.3 The meter and the readiness indicator (2026-10-20, journal §BG; as built, journal §BI) — indicator C — smoke-confirmed (2026-10-21, journal §BJ)

**As built (journal §BI, the owner's acceptance of §BH on the smoke of
`abaab35`).** The meter below is unchanged. The owner chose **C**: the ship
turns green (`$CA`) while a lance is ready. T (the torpedo), the
`--lance-indicator` build and `LANCE_INDICATOR_*` are gone, and so are their
`build/lance-indicator-<x>` variants and the trace's `lance-indicator-[ct]-`
route prefix. START GAME's boss restore puts the hull's white back
unconditionally (C's entry, no longer a build condition). Two signals were
added, both in the lance run (§6.5 has the measurements):
* **The charge ramp.** While the gesture is held, the green's luminance climbs
  from the steel's (4, as in `$84`) to near-white (`$CE`). The colour comes
  from `lance_ramp`, 11 B, indexed by (charge + 7) / 8: `$CA` when not
  charging, then `$C4 $C4 $C6 $C6 $C8 $C8 $CA $CC $CE $CE`, quickening at the
  end. It is the same one COLPM0 write every ready frame (the write moved
  after the C policy, so it sees this frame's charge). A release, or the fire
  frame, is `$CA` again that very frame. The ramp fits as a frame-by-frame
  ramp; the brief's "every 4 frames" fallback was not needed.
* **The discharge.** Poly17 noise (AUDF `$10`, AUDC `$8A`) on channel 3 on
  the fire frame, over a target or none. It is not held through
  `boss_tick_timer` as the cue is: a running timer makes every
  `boss_frame_timers` call take its `dec`, and a Bastion rail's slide
  (`rail_column`) calls it four times on a frame. MEASURED: +40 cycles, a
  fire frame of 8,513. Instead the beam's last frame gives the channel back
  to the engine bed (`lance_sound`, shared with the cue). The beam is
  bounded, so the channel is always released (M5-03's rule). The kill's tick
  on the beam's arrival, a hit or a laser warning take it first and keep
  their own rule. 15 B on the fire frame.

The section below is the record of §BG's build and the comparison.


The owner's smoke of `89297a5` did not accept stage 1 as a design: the stock
must not depend on boss capsules, and the reticle was on all the time. Journal
**§BG** replaces the stock with a **meter**, keeps the gesture, the beam, the
kill and the reticle V2, shows the reticle only while a lance is ready, asks
for a clearer readiness indicator in three variants, and withdraws the boss
capsules as lances (stage 2 keeps only the +1 life capsule).

**The meter (as built, every variant).**
* `LANCE_METER_FRAMES` = 1,250 (25 s) beside the two charge constants in
  `scripts/lance-layout.mjs`, scaled by the difficulty as the boss's hit
  points are (`hpScale` 3/4 and 5/4, the quarter by shift as `boss_scale`
  takes it): **EASY 938 frames (18.76 s), MEDIUM 1,250 (25 s), HARD 1,562
  (31.24 s)** - `lanceMeterFrames()`, passed to the C, recorded in the
  manifest (`boss.lance.meterFrames`).
* `src/c/lance.c` `lance_c_fill` (every boss frame with no beam up): 1 when
  the meter is full, otherwise one frame more. The meter is the run's BSS, so
  it is empty at every boss entry (the run is read anew) and runs in the boss
  sector only. After the meter's frames a lance is ready on the next frame:
  **one, no stacking** (full, the meter stops counting). `lance_c_aim`'s fire
  empties it; through the beam's frames the tick advances it with one `inc`
  (exact: a beam ends long before the meter could fill, so no full test).
* The stock, `--lance-stock`, `lance_stock` / `LANCE_STOCK_GRANT` and the
  stock's trace column are gone; the full game has the lance in every boss
  fight. The aim's `boss_phase` test moved to the tick's readiness.

**Readiness and the reticle.** `lance_ready` ($FF / 0) is what the indicator
shows: a lance ready, the ship alive (`PLAYER_LIFECYCLE` 0) and the fight on
(`boss_phase` 0). Only a change acts:
* **on** (the frame after the meter fills, or the ship alive again): the
  indicator, the reticle's 8 rows drawn once a fight under the band (HPOS 0),
  the cue - and nothing else that frame; the aim (the reticle placed at the
  target, the charge) from the next frame;
* **off** on the fire frame (the lance spent), when the ship dies (the aim's
  no-target path runs once: the reticle off, the charge cancelled, `read_input`'s
  stick operand back on PORTA) and when the fight ends;
* while it is off the tick returns after the meter: **the gesture does
  nothing and no reticle shows** until the next lance.

**The cue (every variant):** on every change to on, a pure tone on channel 3
(`AUDF3` `$0C`, `AUDC3` `$A8`, 16 frames) - 19 B - given back to the engine
bed by `boss_frame_timers` through `boss_tick_timer`, as the Bastion's rail
unlock tone is. The boss theme is channels 1-2 (`gameplay-music.s` never
writes 3 or 4, pinned by `tests/gameplay-music.test.mjs`); a hit's tick and a
laser's warning write channel 3 later in the frame and win, as they win over
the bed. `$0C` is above every warning pitch (`$18` + timer); pure distortion
needs no poly-4 check. Gated on `sound_enabled`. By ear: owner smoke (the
emulator cannot record audio headlessly).

**The three indicators.**

* **(C) the ship's colour.** `COLPM0` `$CA` (green) while on, the hull's
  white `$0E` when off. **Colour (M, `scripts/boss-art-rules.mjs`
  `hueDegrees`, Atari800's PAL palette):** hue 136°, **90° from the ally
  steel** (`$88` / `$84`, 226°), **54° from the nearest boss colour** (the
  Bastion's and the Citadel's `$EC` / `$EA`, 82-83°), 47° from the player's
  shots and the escort's hit pods (`$AE`, 183°); every other boss-sector
  colour is further (the lasers and pods `$46` 354°, the Citadel `$58` 326°
  and `$64` 294°, the Spine `$66` 294°, the Breaker `$2A` / `$34` 34° / 16°,
  the Bastion `$1A` / `$12` 52°, the capsule `$1C` 52°). No other hue clears
  45° from all of them (`$BA` 19° from `$AE`, `$DA` 25° from `$EC`, `$7A` 32°
  from `$84`). **Cost:** one register write on each change - **and one on every
  ready frame with no beam up (6 cycles):** the resident booster code writes
  the white at a pickup or a release (`restore_player_fighter_normal_colors`)
  and a Shield pulses `COLPM0` `$84` / `$0E`; without the rewrite a booster's
  end during readiness left a white ship with a lance ready (test). While a
  Shield runs its pulse shows; the green comes back the frame after. **Known
  side effect:** the Citadel's gravity column is missile M0, which shares
  `COLPM0` - it turns green with the ship while a lance is ready (region 2
  only). START GAME's boss restore writes `$0E` back (one entry, 3 B of the
  level summary's 4 B padding: the summary stays 1,770 B and
  `summary_display_list` stays at `$0B58`).
* **(T) the torpedo.** **Where the ship's shape lives (M):** `player_shape`,
  16 B in `RODATA` (`$31F5-$3204`, resident, the initial block), drawn by
  resident `draw_player` (`$2A76`, `lda player_shape,x` at `$2A7A`, its operand
  `$2A7B`) only when the ship moves vertically, and by the boss install. Its
  16 rows are the hull's (row 15 the only blank), so an alternate 16-row
  shape cannot put a torpedo **in front of** the nose without moving the
  hull and its hit box. Switching it would cost 0 resident bytes (an operand
  patch to a shape in the lance run, +2 boss-restore entries, a redraw on
  each change), but the torpedo would replace hull rows. **Built instead (0
  resident bytes):** the tick draws five rows in P0 **over** the nose - fins
  `$6C`, body `$38` x 3, tip `$10` - and clears the row above them, every
  frame it is on (the ship moves; the hull's own draw does not know them),
  cleared on the change to off; on the shot the beam grows over the same
  rows from the nose (the beam starts where the torpedo sits). 33 B, ~60
  cycles a ready frame (unrolled; the first loop cost ~130 and put the
  Bastion at 8,532). Known look: the torpedo is the ship's colour (P0), so it
  reads as a finned warhead on the nose; while moving down a one-line gap
  shows between it and the nose (the tick runs before `read_input`).
* **(H) a HUD text "VOID LANCE READY": no room - skipped.** Evidence (M):
  the HUD is one ANTIC 2 line of 40 cells (`$4000-$4027`; the boss install
  keeps the same header, `boss_dl_header`) - SCORE 0-10, LIFE 13-18, HULL
  20-28, BOOST 30-39 with asserted blanks at 19, 24, 29, 35
  (`src/main.s:618-653`); the longest free run is 11 cells (29-39) and only
  while no booster is active (boss capsules give boosters in the fight),
  2 cells with one. Neither the gameplay nor the boss display list has a
  blank or spare mode line: HUD + divider + 27 ring rows fill scanlines
  8-239 (asserted, `src/main.s:920-923`); the entry banner's screen and code
  are gone before the fight. A 16-character line needs one of: cells taken
  from LIFE / HULL / BOOST, the divider row turned into a text line (the
  boss DLI's phase 0 then fires 8 lines later - raster work), the bottom ring
  row given up, or a new line at scanlines 240-247 (~360 DMA cycles a frame,
  an assert change). Not built.

**Measured — the lance run** (manifest `boss.lance`; resident 0 B for every
variant: the initial block 107 sectors, slots A / C / D / E, the banner keep
and the level summary byte for byte stage 1's sizes):

| variant | run | sectors (disk) | RAM | bytes used | free |
| --- | --- | --- | --- | ---: | ---: |
| stage 1 (stock) | `boss-lance` | 3 (581-583) | `$BA80-$BBFF` | 382 | 2 |
| **C** | `boss-lance` | **4 (712-715)** | `$BA00-$BBFF` | **505** | **7** |
| **T** | `boss-lance` | **5 (712-716)** | `$B980-$BBFF` | **538** | **102** |

**The meter does not fit sectors 581-583** (M: the C meter is +46 B of C over
the stock, the readiness and cue +~45 B of ASM, against stage 1's 2 B free).
The run therefore has its own reservation at the disk's free tail (712-720
were free; the Phase A probe's place, §3) - 4 sectors with C, 5 with T - and
581-583 are free again. The disk identity names the new reservation
(`diskLayout.bossLanceBaseSector`). The window keeps `$B82A-$B9FF` (470 B, C)
or `$B82A-$B97F` (342 B, T) to grow (the life capsule's 125-160 B fit).

**Measured — boss stress** (the four compositions with `tests/lance-states.mjs`,
native cycles, worst reachable; `filling` the meter not full, `draw` the frame
a lance becomes ready - indicator, reticle rows and cue -, the beam states
after the fire frame's off):

| region | before | stage 1 worst | C: filling / draw / idle / charge / fire / grow / erase | **C worst** | T: draw / idle / charge / fire | **T worst** |
| --- | ---: | ---: | --- | ---: | --- | ---: |
| 1 Breaker | 7,150 | 7,550 | 7,216 / 7,492 / 7,452 / 7,474 / 7,518 / 7,505 / 7,525 | **7,525** | 7,550 / 7,510 / 7,532 / 7,571 | **7,571** |
| 2 Citadel L4 / L5 | 7,694 / 8,029 | 8,395 | L5: 8,095 / 8,348 / 8,290 / 8,312 / 8,356 / 8,384 / 8,404 | **8,404** | L5: 8,406 / 8,348 / 8,370 / 8,409 | **8,409** |
| 3 Spine L7 / L9 | 7,771 / 8,025 | 8,403 | L9: 8,091 / 8,344 / 8,305 / 8,327 / 8,371 / 8,380 / 8,400 | **8,400** | L9: 8,402 / 8,363 / 8,385 / 8,424 | **8,424** |
| 4 Bastion L10 | 8,060 | 8,437 | 8,126 / 8,411 / 8,339 / 8,361 / 8,405 / 8,415 / 8,435 | **8,435** | 8,469 / 8,397 / 8,419 / 8,458 | **8,469** |

* **Tick (C, worst):** filling 66 (stage 1's stock 0: 20), the ready frame
  311, idle 280, charging 302, fire 355, the beam 355-375, the kill
  2,473-2,780. The kill frames (arrive) are unchanged from stage 1 (one
  meeting, the shots wait a frame).
* **The Bastion fixture** (the lance fired on its worst frame): C 8,405, T
  8,458 (stage 1 8,271).
* **Rule (B) clashes:** 0 in every state, every region, both variants.
* Every C state is under §6's 50-cycle reserve (8,450); T's ready frame on
  the Bastion is 8,469 and its fire frame 8,458 - over the reserve, under the 8,500 gate (the torpedo's ~60 cycles on every ready frame); T's filling, beam and kill states are C's.
* **The first restructure (M, not kept):** the reticle's first draw on the
  aim's first frame and the indicator's change on the beam's first frame put
  C's Citadel L5 at **8,521** and the Bastion's grow at 8,497; the tick now
  draws the rows on the ready frame (with no aim), turns the indicator off on
  the fire frame, returns early while the meter fills (filling 163 -> 66
  cycles) and advances the meter through the beam with one `inc`.

**Measured — the routes** (Atari800, the four debug routes per variant,
`build/lance-indicator-<c|t>-[boss-region-N-]level-1-s6`; the same 34 focused
sessions as §6.1 - `boss-aim-lance-1` now makes the gesture with every lance
the meter gives - `scripts/pal-timing-audit.mjs`'s model):

| route | C: worst margin / DMA-on max / entry | T: worst margin / DMA-on max / entry | misses / clause failures |
| --- | --- | --- | --- |
| R1 Breaker | 8,583 / 29,934 / 310 | 8,483 / 29,813 / 313-314 | 0 / 0 (both) |
| R2 Citadel | 6,421 / 30,132 / 325 | 6,413 / 30,279 / 329 | 0 / 0 (both) |
| R3 Spine | 7,045 / 30,469 / 321 | 6,936 / 30,375 / 325 | 0 / 0 (both) |
| R4 Bastion | 6,734 / 29,753 / 325 | 6,618 / 29,800 / 328 | 0 / 0 (both) |

* **Entry:** +4 host frames for C's fourth sector (stage 1 306 / 321 / 317 /
  321), +7-8 for T's fifth; all under 350.
* **Clauses:** the reticle never shows outside the fight, and never on a frame
  with no lance ready (new clause); the window tail's watch from the window's
  end sees only the lance run's reads and the lance's own writes (0 foreign
  writers).
* All 6 `boss-aim` sessions pass (the bots' fire-gate fix of §6.1).

**Balance probe (journal §BG 5; the period not changed).**

| region / boss | modules (non-core) | weapons to destroy | HP (MEDIUM, all modules) | aim bot fight, s6 entry, MEDIUM (M) | lances it fired (M) | MEDIUM fight by the curve's rule (`docs/boss-curve.json`) | lances at 25 s (EST) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 Breaker | 16 (16) | 8 | 130 | 49.6 s (`boss-aim-lance-1`); `boss-aim-1` 47.6 s | 1 (ready f1,326, fired f1,403) | 93 s | 3 |
| 2 Citadel | 16 (15) | 11 | 222 | 48.4 s; 49.7 s | 1 (ready f1,251, fired f1,439) | 99 s (L4) / 120 s (L5-6) | 3 / 4 |
| 3 Spine | 13 (13) | 7 | 134 | 53.7 s; 68.3 s | 1 (ready f1,251, fired f1,634) | 106 s (L7-8) / 112 s (L9) | 3-4 |
| 4 Bastion | 10 (10) | 9 | 215 | 56.4 s; 58.5 s | 1 (ready f1,251, fired f1,397) | 122 s | 4 |

* **Measured:** on the debug routes the aiming bot (MEDIUM, entering at the
  boss sector) ends every fight in 48-68 s, so it gets **one lance a fight**:
  ready at 25 s (f1,251 from the entry; R1's route enters 75 frames later),
  fired 3-8 s after, and the fight is over before the second (due at 50-58 s).
* **Estimate:** the fights the owner tunes to (the curve's rule: frames x
  main's plain sweep / the aiming bot, §AH) are 93-122 s on MEDIUM; one lance
  every 25 s plus the time to stand under a target and charge (1.5 s + the
  aim, 3-8 s measured) gives **3 lances (Breaker, Citadel L4) to 4
  (Citadel L5-6, Spine L9, Bastion)** - each one module of 10-16.
* "Weapons" (pulse guns, emitters, salvos) are what the defeat waits for; the
  laser tier caps emitter slots per level, so the live weapons are fewer on a
  region's first level. A lance takes any one non-core module.

**Tests (M):** `tests/lance.test.mjs` 26 of 26 on `lance-indicator-c` and on
`lance-indicator-t`: written first and RED on the stage-1 build (the file does
not load: no `lance_ready`). New: the meter fills in exactly 938 / 1,250 /
1,562 frames with the gesture held over a target all along doing nothing and
no reticle, the ready frame (indicator, rows, no aim), the charge on the next;
no stacking (three meters' frames full: still one lance; after the shot the
gesture does nothing); the reset at the boss entry (a full meter left in RAM
read anew as empty); the indicator and the cue frame by frame (filling, the
change to on with the cue, ready frames, the ship moving, dying, alive again,
the sound off, the charge, the fire frame's off, the beam, the fight over; C:
a booster's release turns the ship green again). Kept: the frame-by-frame
ordinary fire (with a lance ready against none), the Bastion worst-frame
fixture, the kill, the targets, the half speed. Re-pinned for the layout only:
`boss-banners` (entry sectors 79 / 83 / 82 / 83 -> 80 / 84 / 83 / 84),
`boss-runtime` (the read order: 712-715), `boss-overlay` (the reservations
+ `lance`), `level-summary-build` (the disk runs).

**Not run (the owner's brief: no full evidence chain yet):** the default
build refuses to link (the committed runtime evidence no longer binds to the
artifacts - `tests/runtime-evidence-binding.test.mjs` red, as expected); the
measurements above are on `build:candidate` and the variant builds. Owed
before a merge: the regeneration pass (`build:candidate` ->
`runtime:wall-trace` -> `build`), the menu raster, `npm test` twice,
`failures:reconcile`. The default build's indicator is C (the
recommendation); `--lance-indicator=t` builds T. `how-to-play` EN / PL waits
for the owner's choice of indicator.

**The stills and GIFs** (`build/m6-probe/indicator/out/`, not committed;
320 x 240 crops of Atari800 PAL captures of `boss-aim-lance-1`; each still a
sheet of three panels - before, a lance ready, the beam -, also as single
PNGs; the GIFs 150 frames at 50 fps): `c-r1`, `c-r4`, `t-r1`, `t-r4` (`.gif`,
`-still.png`, `-before.png`, `-ready.png`, `-firing.png`). The R1 GIFs are 3 s
in one take; the R4 GIFs are a cut (45 frames around the ready frame, 105
around the fire: the bot took 146 frames from ready to fire there).

### 6.4 The charge whatever is under the ship (2026-10-20, journal §BH) — smoke-confirmed (2026-10-21, journal §BJ)

**The owner's smoke of `97e1e6f` (C):** the ship turns green, FIRE held, UP
added - nothing: no slowdown, no reticle, no beam.

**Diagnosis (M, Atari800, scripted input on the C R1 route).** A diagnostic
bot (`lance-script-X-MODE` in `scripts/atari800-wall-trace.h`, never in the
evidence; `--only-session=lance-script-...` builds the session on demand)
holds FIRE from the boss entry (the ordinary gate shut all along), parks the
ship at HPOS X and adds UP as MODE says; `DFTRACE_LANCE_JOURNAL` writes the
meter, the inputs, `lance_trig`, `lance_module`, the charge, the beam, the
ship, HPOSP1, the fire gate and COLPM0 per frame. On `97e1e6f`:

| Case | What the journal shows |
| --- | --- |
| x 124, FIRE held 100 frames past readiness, then UP | `lance_trig` 0 on UP's first frame and the charge starts at once (level-triggered, the raw TRIG0 / PORTA, the fire gate 0 throughout - not coupled). The charge reaches 11, 39, 24, 13 and is reset to 0 each time `lance_module` turns $FF: the band drifts one colour clock every 2 frames and a gap between modules passes under a still ship every 20-40 frames. Never 75. |
| x 48 (the band's edge), same | modules 1, 0, then $FF for good: charge 40 at most, then nothing - full speed, HPOSP1 0 (no reticle), no beam: the owner's report exactly. |
| x 124, FIRE + UP held from the entry (the ship at its top limit, 88) | charge 1 the frame after readiness; 74, then fired - the top limit never cancels. |
| UP + LEFT / UP + RIGHT | the diagonal charges (bit 0 of PORTA); UP+LEFT drifted into gaps and was reset, UP+RIGHT stayed over modules 4-6 and reached 74. |

So the gesture, its level trigger, its raw inputs and the limits were sound;
the target rule (`lance_c_aim`: no target -> charge 0, `LANCE_NONE` -> HPOSP1
0) made the charge nearly unreachable against a drifting band and hid every
sign of it over a gap.

**The design (journal §BH).**
- `lance_c_aim` (C) decides the charge without the target: FIRE + UP held
  -> `lance_charge` + 1, released -> 0. Its answer carries three bits: lit
  (the blink), a target (front module exposed, not the core), FIRE. On the
  75th frame a target empties the meter; none leaves it full.
- The mark (ASM): the crosshair at the module's centre over a target; the
  hollow mark `$00,$18,$00,$42,$42,$00,$18,$00` (8 of the crosshair's 16
  pixels) at HPOS `player_x + 4` (the ship's centre) over none.
  `lance_hollow` holds which is drawn; a change rewrites rows 0, 3, 4, 7
  (`(mask & $18) ^ $18`, `(mask & $81) ^ $C3`).
- The dry shot: the beam grows to `lance_y - 1`, the band's foot. That line
  is above the ship's top limit in every region; the Spine's mark line *is*
  that limit (88), and `lance_y` itself would leave a zero-length beam that
  the step loop wraps through all 256 rows of P0 (caught by arithmetic
  before it shipped; the limit test covers all four bosses). `lance_ready`
  stays $FF through the beam, so the beam's frames do not advance the meter,
  the arrival kills nothing and the indicator stays on (C: the beam is drawn
  in the ship's green).
- Readiness off (dying, the fight over) has its own path: HPOSP1 0, charge 0,
  read_input's stick operand back on PORTA (the forward comparison build: its
  floor operand). Before, it fell through the aim's no-target path, which
  under §BH would show the hollow mark - the route clause "reticle with no
  lance ready" caught it (161 / 548 frames on five R1 sessions), and a test
  now pins it.
- The `-lance` route bots start a charge only with a target under the ship
  (`lance_module` < count, not the core), so the routes still measure kills;
  the harness's P1 checks know both marks (`DFTRACE_LANCE_HOLLOW`).

**After (M, the same scripted cases on the new C route build):** every case
fires on the 75th frame of UP - x 124: 16 of its 74 charge frames with no
target, fired over module 9, spent; x 48: 23 frames with none, fired over
none, the lance kept (meter 1,250); top: fired at y 88, spent; UP+LEFT: fired
over none, kept.

**Cost (M).**

| | 97e1e6f C | §BH C | §BH T |
| --- | --- | --- | --- |
| lance run | 505 of 512 B, 4 sectors 712-715 | **597 of 640 B**, 5 sectors **712-716**, `$B980-$BBFF` | 630 of 640 B, 5 sectors |
| code / BSS | 494 / 11 B | 584 / 13 B | 617 / 13 B |
| window room (from `$B82A`) | 470 B | 342 B | 342 B |
| resident bytes | 0 | 0 | 0 |
| worst frame R1 / Citadel / Spine / Bastion (limit 8,500) | 7,525 / 8,404 / 8,400 / 8,435 | **7,546 / 8,406 / 8,402 / 8,437** | 7,546 / 8,437 / 8,452 / **8,486** |
| Bastion fixture (the lance fired on its worst frame) | 8,405 | **8,433** | 8,486 |
| idle / charge / swap / fire / dry tick (Bastion) | 280 / 302 / - / 355 / - | 315 / 333 / 368 / 374 / 352 | 374 / 392 / 427 / 427 / 364 |
| R1 route (6 sessions): fence margin / DMA-on / entry | 8,583 / 29,934 / 310 | **8,545 / 29,813 / 313-314** | not run |

The C worst is the erasure's first frame (8,437, unchanged in kind); the new
frame kinds - `swap` (the mark rewritten on a slow charge frame over a
target) and `dry` - stay under it. Headroom to the gate: **63** (C);
T 14, over the plan's 8,450 reserve.

**Tests:** `tests/lance.test.mjs` 31 on both variants (RED first on the
`97e1e6f` builds: 10 failing on C, 9 on T, each for the target rule):
level-triggered (FIRE 200 frames before UP, its gate shut, over a target and
none); the column under the ship changing (target, empty, target) never
cancels; the dry shot in all four regions (beam to the band's foot, the lance
kept, no HP, no score, no cue, then the kept lance kills); the hollow mark
over every empty column; the top limit and both sides in all four regions
(the beam never touches the ship's rows); readiness off with the gesture held
or not; the previous 25 unchanged in substance (the core, covers and fields
now show the hollow mark and fire dry). Stress: `boss-stress` +
`boss-region-2` 34 pass; `tests/lance-states.mjs` adds `swap` and `dry`.

**Delivered (C):** the full-game ATR and the R1 route ATR (names carry the
SHA-256 prefix, under `build/play/`), a 5-s GIF on R1 and six stills
(`build/m6-probe/gesture/out/`). **Owed before a merge:** the evidence chain
(`build:candidate` -> `runtime:wall-trace` -> `build`, the menu raster,
`npm test` twice, `failures:reconcile`), the other three routes, and
`how-to-play` EN / PL once the owner accepts the indicator and the rule.

### 6.5 Stage 1 final: the banner line, the ramp, the discharge, C only (2026-10-21, journal §BI) — smoke-confirmed (2026-10-21, journal §BJ)

**The banner's line (§BI 1).** `VOID LANCE: HOLD FIRE+FORWARD`, 29 glyphs, is one
ANTIC 2 row (32 glyphs on the narrow playfield) at `$4230`, inside the
`$4000-$43FF` the screen and the hand-over already clear. Its list entry is
`$10, $42 row, $10`: 2 blank lines, the row, 2 blank, in place of INCOMING's 12
blank lines to the bar, so the bar's first scan line, the picture and the
title do not move (test-checked per region). It starts at column 2: an odd count
cannot be centred, because HSCROL 4 is a whole ANTIC 2 glyph, so it is 1.75 colour
clocks right of centre. The frontend charset has no '+'. The banner run writes
one into code 45 (rows 1-5: the colon's stem, the dash's bar). Codes 45-47 are
cleared at boot and drawn by nothing. The late part (`BOSS_BANNER_LATE`) draws
the line with the picture, about 0.5 s after the screen comes on, because the
screen's 2 sectors have 17 B left. Cost: the shared banner code 666 -> 725 B (the 29 codes, 5 glyph
rows, two copy loops, 3 B of list). The Spine's run (1,154 B, 2 B over 9
sectors) and the Bastion's (1,208 B) take a 10th sector. Entries: 81 / 85 /
85 / 86 sectors, **314 / 329 / 329 / 332 host frames** (M, the routes; the
Spine and the Bastion +4 for that sector).

**The ramp and the discharge (§BI 2)** - §6.3's as-built note. MEASURED on
the Bastion's stress compositions (worst reachable per state, limit 8,500):

| state | `abaab35` | the ramp only | the ramp + the discharge on `boss_tick_timer` | **as built** (bed back at the beam's end) |
| --- | ---: | ---: | ---: | ---: |
| charge / swap | 8,386 / 8,427 | - | - | 8,404 / 8,445 |
| fire | 8,433 | 8,453 | **8,513** (over) | **8,462** (38 headroom) |
| dry | 8,364 | - | - | 8,399 |
| erase / end (new) | 8,437 / - | - | - | 8,437 / 8,453 |

The +40 of the timer variant is `rail_column`'s four `boss_frame_timers`
calls, each taking the `dec` while the timer runs; the stress case is a player
shot killing a rail's front gun on the fire frame. Bytes: the indicator's
colour as `and #($CA ^ $0E)` / `eor #$0E` (-4 B), the cue and the bed's return
sharing `lance_sound`. The run is **639 of 640 B**.

**C only (§BI 3).** See §6.3.

**Evidence (M).** The full chain on this tree: 58 replays, 0 misses, 0 clause
failures, worst fence margin 1,465, DMA-on 31,059 (both unchanged), boss
entries 314 host frames; menu raster 4 pass; the default build's ATR equals the
candidate's (`30b94e65…`). The four routes: 34 sessions pass. Margins R1
8,507, R2 6,166, R3 6,959, R4 6,459; DMA-on at most 30,392; 0 misses, 0 clause
failures. The aiming bot fires on every route and the ramp's six colours
show. STATUS carries the per-region table.

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

---

## 8. Stage 2 — the +1 life capsule (as built, 2026-10-22)

**OWNER-ACCEPTED**, owner play test PASS on `b2261c9`: look A, placement A.
Session: Codex. Journal **§BN**. Branch `codex/m6-life-capsule`, from accepted
`main` `35499ba`; Phase A plan `83f6ec2`, preserved failure `ffad1e0`, working
implementation `b2261c9`. The owner authorized the final documentation, merge
commit `[codex] Merge M6 stage 2: life capsule` and push of main. No release.

This section supersedes the stage-2 parts of §3, §4(i), §6 and §7 wherever
they describe lance capsules, the older window layout or heavier validation.
The boss and lance are unchanged; §BM governs validation.

### 8.1 Player-visible rules

* Only SPACE sectors may spawn LIFE. On each ordinary capsule spawn, while
  lives are below 8 and no LIFE has appeared this level, one deterministic
  Director RNG draw gives LIFE with probability 1/4. This includes the first
  eligible spawn. Ordinary booster selection otherwise follows its current
  rotation; a LIFE substitution does not consume a booster in that rotation.
* Set `life_spawned_this_level` when LIFE spawns, not when collected: missing
  it does not grant a second chance. Reset the flag at each level start,
  including a new game or restart; a death within the level does not reset it.
* At entry to the last SPACE sector, if eligible and the flag is still clear,
  spawn LIFE immediately through the shared capsule path, without requiring a
  kill or another ordinary drop. The compiler marks that sector with a free
  `sector_kind` bit, separate from the last-sector bit (which may mark a boss).
  The existing capsule is normally drained at sector boundaries; if a pending
  or active ordinary capsule remains, the forced LIFE replaces it using the
  shared clean erase/release path. Never allocate a second capsule slot.
* **Cap rule:** at 8 lives, suppress LIFE and keep normal
  capsule logic. Do not mark LIFE as spawned for a suppressed attempt. At
  forced entry, 8 lives means no extra capsule is injected. A later ordinary
  spawn can still roll LIFE after a life is lost. A LIFE already in flight
  when the count reaches 8 is collected and removed, with the count clamped
  to 8; no booster is awarded for it.
* Collection adds one life, clamped to 8, without replacing or extending an
  active booster. Keep the accepted bottom HUD: LIFE, HULL, BOOST, T meter
  on the left, SCORE on the right. Use its existing life digit; publish only
  when the life count changes. No per-frame HUD redraw.
* Collection plays a short sound using the existing hit-SFX channel/timer
  path (`play_hit_sound` is the reuse baseline). A brief collisionless
  spark uses the existing transient-effect machinery only when its whole
  shared pool is free; never clear another effect or defer the life
  award. The changed HUD digit remains immediate feedback in a busy frame.

### 8.2 Implementation boundary and placement — option A

C owns eligibility, the RNG choice, the per-level flag, forced-sector policy
and capped life award in `src/c/life-capsule.c`: **95 B** of DIRECTOR_C_LOW.
The init clear adds **3 B** there, so low C is **203/245 B**, 42 B free.
ASM veneers in `src/hybrid/life-capsule.s` execute spawn, clean replacement,
collection, colour, PMG and sound through the existing single capsule path.
The compiler marks the last SPACE with sector-kind bit **$40**.

The appended window tail is **$B82A-$B8FA, 209 B**. Its latch is $B82A,
four 16-B masks $B837-$B876, forced-call scratch $B877. The original 48-B
STARFIELD table is removed; all four masks are emitted from editable
`assets/graphics/life-capsule.json` by `scripts/build.mjs`. The ordinary
rotation count remains three; the drawable count is four. P3 stays SIZEP3=0,
8 colour clocks by 16 scanlines. P1/P2 remain Heavy-owned in SPACE.

The existing sector-entry star-publication call is repointed byte-neutrally
to a **6-B PICKUP_CODE continuation**, $8B5A-$8B5F; the Light kernel still
starts at $B478. The window grows upward from $B82A while the lance stays
at **$B900-$BBFF**; **5 B remain** between them. Link assertions pin the
state, masks, continuation and death-colour operand; the tail bound and
unchanged `checkLanceLayout` enforce no overlap.

The preserved prototype's old death-colour patch target had become part of
a JSR address. Publication now patches the LIFE colour immediate **$B8E8**
and gives player-death colour priority (5 B beyond the prototype). A jump
also skips the spawn site's zero-filled ABI padding within its existing
21-B footprint. The short sound reuses `play_hit_sound`; the spark reuses
the whole existing effect pool only when empty, without erasing another effect.

### 8.3 Assembled cost and final resources

The Phase A **125-160 B estimate** was too small: the first assembled attempt
needed **302 B**, against 214 B free, **88 B short**. The owner chose A to
place the 95-B C object in existing low-C space, keep all masks in the window
and preserve the behaviour, chosen art and C/ASM boundary without changing a
gate. Historical failure and original patch:
[diagnostics](../diagnostics/m6-life-capsule-2026-10-22/README.md).

The final placed pieces total **313 B** before subtracting the former 48-B
mask table: 209 B window + 95 B C + 3 B init + 6 B continuation.
Net occupied runtime content grows **265 B**. No new capsule, PMG, effect,
software-stack or zero-page slot; no interrupt work.

| Resource | Used / limit | Free bytes |
| --- | ---: | ---: |
| Initial content, project planning STOP | **13,572 / 13,652 B** | **80** |
| Initial content, physical transport capacity | **13,572 / 13,684 B** | **112** |
| Window below lance | end **$B8FB / $B900** | **5** |
| DIRECTOR_C_LOW | **203 / 245 B** | **42** |
| DIRECTOR_RAM | **643 / 645 B** | **2** |
| Overlay A (boss) | **2,038 / 2,048 B** | **10** |
| Overlay B (band and tables, fixed data ranges) | **768 / 768 B** | **0** |
| Overlay C | **2,044 / 2,048 B** | **4** |
| Overlay D | **1,788 / 1,792 B** | **4** |
| Overlay E | **527 / 576 B** | **49** |
| Overlay F, regions 1 / 2 / 3 / 4 | **110 / 406 / 323 / 508 of 512 B** | **402 / 106 / 189 / 4** |
| Overlay G (lance) | **763 / 768 B** | **5** |
| Overlay H (page 4) | **250 / 256 B** | **6** |
| Boss install | **380 / 384 B** | **4** |
| Summary overlay | **1,770 / 1,792 B** | **22** |

PICKUP_CODE has **7 B** free. The physical initial-content capacity is
107*128 minus the 12-B minimum envelope; the planning STOP retains another
32 B. Boot stays 107 sectors; total transport is 216 sectors. The generated
memory map records the linked placement.

### 8.4 Accepted look — A, rescue cross

The owner selected and smoke-confirmed **A**, a freestanding rescue cross
with a broad middle bar and narrow stem, mint **COLPM3 $AC**. Ordinary
RAPID/SPREAD/SHIELD masks retain gold $1C; the player-death cycle takes priority.
Editable runtime masks: `assets/graphics/life-capsule.json`.
The Phase A alternatives remain in `docs/design/m6-life-capsule/looks.json`
and `render.mjs`; rebuild the comparison with
`node docs/design/m6-life-capsule/render.mjs` (layout mockups, not captures).

### 8.5 Validation and accepted artifacts

The candidate build and its CPU/DMA, block, transport, decode and placement
checks pass. Two focused prototype-regression cases in
`tests/life-capsule.test.mjs` and the existing player's-death case in
`tests/plasma-fx.test.mjs` pass. Owner play test **PASS**, 2026-10-22.

Build replay CPU maximum without DMA: **15,116 cycles**, +100 versus the
committed baseline manifest; DMA accounting **12,531**, conservative DLI
**369**; additive total **28,016, ESTIMATE**, not a new native PAL measurement.
Colour selection adds about 31/32 cycles IC for ordinary/LIFE publication,
23 during death. No VBI/DLI change. Target **31,500**, hard gate **32,568**,
physical PAL frame **35,568** are unchanged.

All boss disk runs are byte-identical to accepted spindle ATR `5576e8bc`.
Entry reads stay **84/88/88/89 sectors**; prior measurements
**325/340/340/344 host frames** remain below **350**, not remeasured.
The save-test address **$0B58 has not moved**, source assertion and linked label.
No full test chain, wall-trace, boss stress, hash-bound GIF or ledger deviation.
Runtime evidence regeneration and the default full build remain pre-release
work under §BM; no release is made here.

* Level 1 ATR: `build/play/m6-life-capsule/void-strike-65-life-level-1-3f8f8e22.atr`,
  SHA-256 `3f8f8e229a3189342136754fcf4cc311d68d5970bed8c729b7796ec4e1e1db10` (also `dist/void-strike-65.atr`).
* Forced route: `build/play/m6-life-capsule/void-strike-65-life-forced-sector-6-62716b3f.atr`,
  SHA-256 `62716b3fa729459807f19d4708d430b045b2f7c212130bea2825e6826716b1bc`.
  Rebuild with `node scripts/build.mjs --candidate --level=1:sector=5`;
  sector index 5 is the sixth and last SPACE sector.

Full [build report](../diagnostics/m6-life-capsule-2026-10-22/option-a-candidate.md).


## Stage 1c — fire only with lock (§BO)

2026-10-22, Session: Codex. Plan before implementation, branch
`codex/m6-lance-lock`, baseline `fea4cc8`. Owner approval is required after
building; this section does not claim acceptance.

At 50 charge frames, a locked reticle launches with the existing homing
behaviour. An empty reticle (gap, powered Spine field or any other non-target)
waits while the existing FIRE + UP gesture stays held; the first locked frame
launches. Releasing cancels through the existing release-to-refire path,
retaining the lance without penalty. Ordinary fire remains disabled and aiming
movement stays horizontal full speed, forward half speed. The meter stays full;
no new graphics or sounds. Flight, explosion, eligible targets, lost-target
behaviour and the 50-frame post-launch ordinary-fire hold remain unchanged.

**Approved state interpretation:** lance_charge = 50 persists while held and
unlocked; movement parity uses the frame counter during the wait.
`lance_charge` is lance BSS (baseline `$BBF8`), not zero page. No new state
byte; the lance zero-page range is `$B6–$C3`, unchanged.

### Reader/writer audit before code

| Production use | Persistent 50 |
| --- | --- |
| `lance_c_aim` increment and launch | Saturate at 50; launch requires charge == 50 AND target lock. |
| `lance_c_aim` release | Existing zero assignment retained, including release after a long wait. |
| `lance_c_aim` blink return | Return lit while waiting: the empty reticle remains visible. |
| `lance_aim` colour ramp | `(50 + 7) / 8 = 7`, valid final ramp entry. |
| `lance_aim` ordinary-fire gate | Nonzero charge shuts the gate; 50 is safe. |
| `lance_aim` movement operand | Use existing frame counter at 50, preserving alternating forward movement. |
| `lance_meter` readiness-off write | Death or boss phase end clears charge and restores PORTA, once readiness turns off. |
| Boss entry / re-entry | Disk run reloads zero-filled LANCE_BSS; install clears `$B6–$C3`. |
| START GAME / space / level transition | Existing boss restore restores input patches; no space reader of charge; next boss reload clears BSS. |
| HUD gauge | Reads the separate meter, not charge; full throughout wait. |

The source search finds no other production reader/writer. Host tests and
trace readers must understand a persistent 50; trace clauses are not weakened.

### Placement and timing estimate

Policy stays in `src/c/lance.c`, hardware execution in `src/hybrid/lance.s`.
Remove the straight-launch setup: its only caller is the charge-completion
trigger. Retain flight/arrival guards for now so post-launch behaviour is
unchanged. The removed launch setup saves 22 B (including its branch/jump
and unused band-foot preparation); policy and movement estimated +20–27 B,
net −2…+5 B in slot G (baseline 763/768). Page 4 stays 250/256;
window end stays `$B8FB` (5 B reserved below `$B900`); start content stays
13,572 B (80 B planning slack); DIRECTOR_RAM stays 643/645;
DIRECTOR_C_LOW stays 203/245. No memory moves or reservation changes.

Cycle impact is an ESTIMATE pending native stress: saturation/lock and
movement selection add bounded aim-only work, offset on launch by removing
straight-launch selection. No new work in filling, flight or explosion;
frame-counter reads only in the fully charged wait. Check all four regions
with the stage 1b compositions and both wait parities/reticle transitions.
Bastion must remain <= 8,480 cycles (>= 20 margin to 8,500).

Validation: candidate build with computed gates (§BM), focused lance behaviour
checks and four-region boss stress. No full test chain or wall-trace. Boss-entry
transport remains unchanged; distinguish historical emulator frames from new
measurements. Deliver an ATR with SHA-256 filename for owner smoke, then stop.


### Stage 1c implementation checkpoint — BLOCKED_BOSS_STRESS

The approved policy is implemented and the candidate build succeeds, but this
is **not an OWNER-SMOKE CANDIDATE**. Clean `main` `fea4cc8`, measured in a
temporary detached worktree, already reaches **8,563 cycles** on Citadel L5's
lost-target arrival. This implementation measures **8,563** on the same case:
**63 cycles over the 8,500 cap**, outside the new trigger path. The historical
stage 1b figure 8,444 is 119 cycles lower than today's baseline. No limit or
contact clause was changed. The broad stress run was stopped after the narrow
A/B confirmed this blocker; the complete four-region certification is pending.

Measured lance run **763 -> 757/768 B**, page 4 **250 -> 250/256 B**, BSS
**5 -> 5 B**, zero page **14 -> 14 B**. Window end **$B8FB** unchanged.
No start-block, DIRECTOR_RAM, DIRECTOR_C_LOW or reservation change. Straight
launch setup removed; defensive flight/arrival guards retained, with lost-target
flight semantics unchanged. Bastion measured fire **8,467**, swap **8,478**
(22 margin), waits even/odd **8,414 / 8,397**, delayed lock **8,462**.
R1 complete state sweep **7,711 -> 7,712** (788 margin).

All 34 focused lance tests pass, including persistent-50 cancellation, both
movement parities, first-lock homing, sound silence, no ordinary fire, and
readiness-off cleanup. The combined run reports 35 passes and one failure:
the already stale runtime-evidence binding, deferred by §BM. Two old unlocked
launch expectations were updated for §BO and the obsolete pre-life-capsule
160-byte window expectation now pins the owner's reserved 5 bytes.

Evidence: [result and logs](../diagnostics/m6-lance-lock-2026-10-22/result.json).
Recovery needed: identify and recover at least **63 cycles** in the existing
Citadel L5 composition, without weakening any gates. No owner acceptance,
merge, push or new entry-timing claim. Implementation retained on the task
branch as an experimental checkpoint; STATUS remains the accepted baseline.
